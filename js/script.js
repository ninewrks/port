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
  fontSize: 100, // responsive=false일 때 수동 폰트
  text: "Essence",
  pointerSize: null,
  color: { r: 0.55, g: 0.90, b: 1.0 },
  // ✅ Responsive font
  responsive: true,
  minFont: 40,     // px (모바일 기준 최소)
  maxFont: 150,    // px (데스크톱 기준 최대)
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

  textureCtx.fillStyle = "#ffff";
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
  if (t && isPreview) {
    updateMousePosition(
      (0.5 - 0.45 * Math.sin(0.003 * t - 2)) * window.innerWidth,
      (0.5 + 0.1 * Math.sin(0.0025 * t) + 0.1 * Math.cos(0.002 * t)) * window.innerHeight
    );
  }

  if (pointer.moved) {
    if (!isPreview) pointer.moved = false;

    gl.useProgram(splatProgram.program);
    gl.uniform1i(splatProgram.uniforms.u_input_texture, velocity.read().attach(1));
    gl.uniform1f(splatProgram.uniforms.u_ratio, canvasEl.width / canvasEl.height);
    gl.uniform2f(splatProgram.uniforms.u_point, pointer.x / canvasEl.width, 1 - pointer.y / canvasEl.height);
    gl.uniform3f(splatProgram.uniforms.u_point_value, pointer.dx, -pointer.dy, 1);
    gl.uniform1f(splatProgram.uniforms.u_point_size, params.pointerSize);
    blit(velocity.write());
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms.u_input_texture, outputColor.read().attach(1));
    gl.uniform3f(splatProgram.uniforms.u_point_value, 1 - params.color.r, 1 - params.color.g, 1 - params.color.b);
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

// ===============================
// Events
// ===============================
// ===============================
// Events
// ===============================
function setupEvents() {
  // PC 마우스 움직임
  canvasEl.addEventListener("mousemove", (e) => {
    isPreview = false;
    updateMousePosition(e.clientX, e.clientY);
  });

  // 모바일 터치 움직임
  canvasEl.addEventListener("touchmove", (e) => {
    // ❌ e.preventDefault(); 쓰면 스크롤이 막혀버림
    // => 모바일에서 스크롤도 되고, 효과도 따라오게 하기 위해 제거

    isPreview = false;
    const t = e.touches[0] || e.targetTouches[0];
    if (!t) return;
    updateMousePosition(t.clientX, t.clientY);
  }, { passive: true }); // 브라우저에 "스크롤 막지 않을게" 힌트
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
