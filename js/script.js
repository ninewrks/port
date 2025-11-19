import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.18.2/+esm"
//Based on code by Ksenia Kondrashova (https://codepen.io/ksenia-k/pen/MWMObrY)
// Licensed under the MIT License.
const canvasEl = document.querySelector("canvas");
const textureEl = document.createElement("canvas");
const textureCtx = textureEl.getContext("2d");

// -------------------------------
// Fonts
// -------------------------------
const fontOptions = {
  "Arial": "Arial, sans-serif",
  'newyork':"newyork, serif",
  "Verdana": "Verdana, sans-serif",
  "Tahoma": "Tahoma, sans-serif",
  "Times New Roman": "Times New Roman, serif",
  "Georgia": "Georgia, serif",
  "Garamond": "Garamond, serif",
  "Courier New": "Courier New, monospace",
  "Brush Script MT": "Brush Script MT, cursive",
  'zal': "zal, serif"
};

// -------------------------------
// Params (반응형 옵션 추가)
// -------------------------------
const params = {
  fontName: 'zal',
  isBold: false,
  fontSize: 180, // responsive=false일 때 수동 폰트
  text: "Ink",
  pointerSize: null,
  color: {  r: 0.40, g: 0.75, b: 1.0  },
  // ✅ Responsive font
  responsive: true,
  minFont: 70,     // px (모바일 기준 최소)
  maxFont: 180,    // px (데스크톱 기준 최대)
  fromWidth: 360,  // 이 너비에서 minFont
  toWidth: 1440    // 이 너비에서 maxFont
};

// -------------------------------
// Pointer
// -------------------------------
const pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false };

// -------------------------------
// GL State
// -------------------------------
let outputColor, velocity, divergence, pressure, canvasTexture;
let isPreview = true;

// ✅ 프리뷰(자동 윙윙) 유지 관련 상태
let hasUserInteracted = false; // 진짜로 마우스/터치가 움직였는지
let previewEndTime = null;     // 프리뷰 종료 시각 (ms)
const PREVIEW_MIN_DURATION = 5500; // 최소 5.5초는 혼자 돈다

const gl = canvasEl.getContext("webgl");
gl.getExtension("OES_texture_float");

const vertexShader = createShader(
  document.getElementById("vertShader").innerHTML,
  gl.VERTEX_SHADER
);

const splatProgram = createProgram("fragShaderPoint");
const divergenceProgram = createProgram("fragShaderDivergence");
const pressureProgram = createProgram("fragShaderPressure");
const gradientSubtractProgram = createProgram("fragShaderGradientSubtract");
const advectionProgram = createProgram("fragShaderAdvection");
const outputShaderProgram = createProgram("fragShaderOutputShader");

// 풀스크린 정점 버퍼
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,
  -1,  1,
   1,  1,
   1, -1
]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2,0,2,3]), gl.STATIC_DRAW);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(0);

// -------------------------------
// Helpers (반응형 유틸 추가)
// -------------------------------
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const mapRange = (x, inMin, inMax, outMin, outMax) => {
  const t = (x - inMin) / (inMax - inMin);
  return outMin + (outMax - outMin) * clamp(t, 0, 1);
};

// -------------------------------
// Boot
// -------------------------------
createTextCanvasTexture();
initFBOs();
createControls();
setupEvents();
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

render();

// ===============================
// Text → Canvas Texture
// ===============================
function createTextCanvasTexture() {
  canvasTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, canvasTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function updateTextCanvas() {
  textureCtx.fillStyle = "black";
  textureCtx.fillRect(0, 0, textureEl.width, textureEl.height);

  // ✅ 반응형으로 계산된 params.fontSize 사용
  textureCtx.font = (params.isBold ? "bold " : "normal ") +
    (params.fontSize * devicePixelRatio) + "px " +
    fontOptions[params.fontName];

  textureCtx.fillStyle = "#fff";
  textureCtx.textAlign = "center";
  textureCtx.filter = "blur(3px)";

  const textBox = textureCtx.measureText(params.text);
  textureCtx.fillText(
    params.text,
    0.5 * textureEl.width,
    0.5 * textureEl.height + 0.5 * textBox.actualBoundingBoxAscent
  );

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, canvasTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureEl);
}

// ===============================
// Shader/Program helpers
// ===============================
function createProgram(elId) {
  const shader = createShader(
    document.getElementById(elId).innerHTML,
    gl.FRAGMENT_SHADER
  );
  const program = createShaderProgram(vertexShader, shader);
  const uniforms = getUniforms(program);
  return { program, uniforms };
}

function createShaderProgram(vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

function getUniforms(program) {
  let uniforms = [];
  let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    let uniformName = gl.getActiveUniform(program, i).name;
    uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
  }
  return uniforms;
}

function createShader(sourceCode, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, sourceCode);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function blit(target) {
  if (target == null) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  } else {
    gl.viewport(0, 0, target.width, target.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  }
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

// ===============================
// FBOs
// ===============================
function initFBOs() {
  const fboW = Math.floor(.5 * window.innerWidth);
  const fboH = Math.floor(.5 * window.innerHeight);
  outputColor = createDoubleFBO(fboW, fboH);
  velocity    = createDoubleFBO(fboW, fboH, gl.RG);
  divergence  = createFBO(fboW, fboH, gl.RGB);
  pressure    = createDoubleFBO(fboW, fboH, gl.RGB);
}

function createFBO(w, h, type = gl.RGBA) {
  gl.activeTexture(gl.TEXTURE0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, type, w, h, 0, type, gl.FLOAT, null);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return {
    fbo,
    width: w,
    height: h,
    attach(id) {
      gl.activeTexture(gl.TEXTURE0 + id);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return id;
    }
  };
}

function createDoubleFBO(w, h, type) {
  let fbo1 = createFBO(w, h, type);
  let fbo2 = createFBO(w, h, type);
  return {
    width: w,
    height: h,
    texelSizeX: 1 / w,
    texelSizeY: 1 / h,
    read: () => fbo1,
    write: () => fbo2,
    swap() { const t = fbo1; fbo1 = fbo2; fbo2 = t; }
  };
}

// ===============================
// Render
// ===============================
function render(t) {
  const dt = 1 / 60;

  // 미리보기 자동 포인터
// ✅ 프리뷰(자동 포인터) 로직
if (t && isPreview) {
  // 처음 한 번만 프리뷰 종료 시각 세팅
  if (previewEndTime === null) {
    previewEndTime = t + PREVIEW_MIN_DURATION;
  }

  // 자동으로 잉크가 혼자 빙빙 도는 경로
  updateMousePosition(
    (0.5 - 0.45 * Math.sin(0.0015 * t - 2)) * window.innerWidth,
    (0.5 + 0.1 * Math.sin(0.0012 * t) + 0.1 * Math.cos(0.001 * t)) * window.innerHeight
  );

  // ⬇️ 마우스를 이미 움직인 뒤 + 최소 프리뷰 시간 지나면
  //    이제부터는 진짜 인터랙션 모드로 전환
  if (hasUserInteracted && t > previewEndTime) {
    isPreview = false;
  }
}

if (pointer.moved) {
  if (!isPreview) pointer.moved = false;

  gl.useProgram(splatProgram.program);
  gl.uniform1i(splatProgram.uniforms.u_input_texture, velocity.read().attach(1));
  gl.uniform1f(splatProgram.uniforms.u_ratio, canvasEl.width / canvasEl.height);
  gl.uniform2f(splatProgram.uniforms.u_point, pointer.x / canvasEl.width, 1 - pointer.y / canvasEl.height);
  gl.uniform3f(splatProgram.uniforms.u_point_value, pointer.dx, -pointer.dy, 1);

  // ✅ 프리뷰 때는 브러시 조금 더 크게
  const brushSize = isPreview ? params.pointerSize * 1.1 : params.pointerSize;
  gl.uniform1f(splatProgram.uniforms.u_point_size, brushSize);
  blit(velocity.write());
  velocity.swap();

  gl.uniform1i(splatProgram.uniforms.u_input_texture, outputColor.read().attach(1));

  // ✅ 프리뷰 때는 색 살짝 더 진하게
  const intensity = isPreview ? 0.6 : 0.3;
  gl.uniform3f(
    splatProgram.uniforms.u_point_value,
    (1 - params.color.r) * intensity,
    (1 - params.color.g) * intensity,
    (1 - params.color.b) * intensity
  );
  blit(outputColor.write());
  outputColor.swap();
}


  gl.useProgram(divergenceProgram.program);
  gl.uniform2f(divergenceProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(divergenceProgram.uniforms.u_velocity_texture, velocity.read().attach(1));
  blit(divergence);

  gl.useProgram(pressureProgram.program);
  gl.uniform2f(pressureProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(pressureProgram.uniforms.u_divergence_texture, divergence.attach(1));
  for (let i = 0; i < 10; i++) {
    gl.uniform1i(pressureProgram.uniforms.u_pressure_texture, pressure.read().attach(2));
    blit(pressure.write());
    pressure.swap();
  }

  gl.useProgram(gradientSubtractProgram.program);
  gl.uniform2f(gradientSubtractProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(gradientSubtractProgram.uniforms.u_pressure_texture, pressure.read().attach(1));
  gl.uniform1i(gradientSubtractProgram.uniforms.u_velocity_texture, velocity.read().attach(2));
  blit(velocity.write());
  velocity.swap();

  gl.useProgram(advectionProgram.program);
  gl.uniform1f(advectionProgram.uniforms.u_use_text, 0);
  gl.uniform2f(advectionProgram.uniforms.u_texel, velocity.texelSizeX, velocity.texelSizeY);
  gl.uniform1i(advectionProgram.uniforms.u_velocity_texture, velocity.read().attach(1));
  gl.uniform1i(advectionProgram.uniforms.u_input_texture, velocity.read().attach(1));
  gl.uniform1f(advectionProgram.uniforms.u_dt, dt);
  blit(velocity.write());
  velocity.swap();

  gl.useProgram(advectionProgram.program);
  gl.uniform1f(advectionProgram.uniforms.u_use_text, 1);
  gl.uniform2f(advectionProgram.uniforms.u_texel, outputColor.texelSizeX, outputColor.texelSizeY);
  gl.uniform1i(advectionProgram.uniforms.u_input_texture, outputColor.read().attach(2));
  blit(outputColor.write());
  outputColor.swap();

  gl.useProgram(outputShaderProgram.program);
  gl.uniform1i(outputShaderProgram.uniforms.u_output_texture, outputColor.read().attach(1));

  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
}

// ===============================
// Resize (👈 반응형 핵심)
// ===============================
function resizeCanvas() {
  params.pointerSize = 4 / window.innerHeight;

  canvasEl.width = textureEl.width = window.innerWidth;
  canvasEl.height = textureEl.height = window.innerHeight;

  // ✅ 윈도우 너비 기반 폰트 재계산
  if (params.responsive) {
    const w = window.innerWidth;
    params.fontSize = Math.round(
      mapRange(w, params.fromWidth, params.toWidth, params.minFont, params.maxFont)
    );
  }

  initFBOs();
  updateTextCanvas();
}

// // 모바일인지 감지
// const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// // 모바일에서만 색 더 연하게 (하늘색의 연한 버전)
// if (isMobile) {
//   params.color = {  r: 0.85, g: 0.95, b: 1.0 }; 
// } else {
//   // PC에서는 기존 하늘색 유지
//   params.color = { r: 0.40, g: 0.75, b: 1.0 };
// }
// ===============================
// Events
// ===============================
function setupEvents() {
  // ✅ PC 마우스: 화면 전체에서 포인터 좌표 받기
  window.addEventListener("mousemove", (e) => {
    hasUserInteracted = true; // 진짜로 건드린 적 있음
    updateMousePosition(e.clientX, e.clientY);
  });

  // ✅ 모바일 터치
  window.addEventListener("touchmove", (e) => {
    hasUserInteracted = true;
    const t = e.touches[0] || e.targetTouches[0];
    if (!t) return;
    updateMousePosition(t.clientX, t.clientY);
  }, { passive: true });
}


function updateMousePosition(eX, eY) {
  pointer.moved = true;
  pointer.dx = 5 * (eX - pointer.x);
  pointer.dy = 5 * (eY - pointer.y);
  pointer.x = eX;
  pointer.y = eY;
}



// ===============================
// GUI (반응형 토글 & 범위)
// ===============================
function createControls() {
  const gui = new GUI();
  gui.close();

  const gTxt = gui.addFolder("Text");
  gTxt.add(params, "text").onChange(updateTextCanvas);
  gTxt.add(params, "isBold").name("bold").onChange(updateTextCanvas);
  gTxt.add(params, "fontName", Object.keys(fontOptions)).name("font").onChange(updateTextCanvas);

  const gResp = gui.addFolder("Responsive Font");
  gResp.add(params, "responsive").name("enable").onChange(() => {
    if (params.responsive) resizeCanvas();
  });
  gResp.add(params, "minFont", 12, 200, 1).name("min px").onChange(() => params.responsive && resizeCanvas());
  gResp.add(params, "maxFont", 40, 400, 1).name("max px").onChange(() => params.responsive && resizeCanvas());
  gResp.add(params, "fromWidth", 280, 1024, 1).name("from width").onChange(() => params.responsive && resizeCanvas());
  gResp.add(params, "toWidth", 800, 1920, 1).name("to width").onChange(() => params.responsive && resizeCanvas());

  // 수동 모드(반응형 off일 때만 의미 있음)
//   gui.add(params, "fontSize", 10, 300, 1).name("font size, px").onChange(updateTextCanvas);

//   gui.addColor(params, "color");
}
