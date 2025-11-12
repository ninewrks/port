import LiquidBackground from "https://cdn.jsdelivr.net/npm/threejs-components@0.0.22/build/backgrounds/liquid1.min.js";
// Copyright (c) 2025 Kevin Levron (https://codepen.io/soju22/pen/myVWBGa)
const app = LiquidBackground(document.getElementById("canvas"));

function pickSrcFromPicture() {
  const img = document.querySelector('#tex img');
  return img?.currentSrc || img?.src || "./img/background.svg";
}

function applyTextureFromPicture() {
  const src = pickSrcFromPicture();
  if (!applyTextureFromPicture._prev || applyTextureFromPicture._prev !== src) {
    applyTextureFromPicture._prev = src;
    app.loadImage(src);
  }
}

// 캔버스 리사이즈
function resize() {
  const w = innerWidth, h = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  app.renderer.setPixelRatio(dpr);
  app.renderer.setSize(w, h, false);
}

// 초기화 타이밍 보강
window.addEventListener("DOMContentLoaded", () => {
  applyTextureFromPicture(); // 첫 적용
  resize();
});

window.addEventListener("load", () => {
  // 일부 브라우저에서 picture 선택이 load 시점에 확정됨
  applyTextureFromPicture();
});

// 뷰포트 바뀌면 다시 반영
addEventListener("resize", () => {
  applyTextureFromPicture();
  resize();
});

// 기존 효과
app.liquidPlane.material.metalness = 0.5;
app.liquidPlane.material.roughness = 0.5;
app.liquidPlane.uniforms.displacementScale.value = 1.5;
app.setRain(true);