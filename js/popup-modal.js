// js/popup-modal.js
document.addEventListener("DOMContentLoaded", () => {
  // 요소 찾기
  const overlays     = document.querySelectorAll(".pop-up__overlay");
  const modal        = document.getElementById("designModal");
  const modalImg     = document.getElementById("designModalImg");
  const modalTitle   = document.getElementById("designModalTitle");
  const modalDesc    = document.getElementById("designModalDesc");
  const modalIntent  = document.getElementById("designModalIntent"); // 있으면 사용, 없으면 무시
  const btnClose     = document.querySelector(".design-modal__close");
  const modalBg      = document.querySelector(".design-modal__overlay");

  if (!modal) {
    console.warn("designModal 요소를 찾지 못했습니다.");
    return;
  }

  // 모달 열기
  function openModal({ imgSrc, imgAlt, title, desc, intent }) {
    if (imgSrc && modalImg) {
      modalImg.src = imgSrc;
      modalImg.alt = imgAlt || title || "design image";
    }

    if (modalTitle) modalTitle.textContent = title || "";
    if (modalDesc)  modalDesc.textContent  = desc  || "";

    if (modalIntent) {
      // 의도가 있으면 넣고, 없으면 비워두기
      modalIntent.textContent = intent || "";
    }

    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    modal.setAttribute("aria-hidden", "false");
  }

  // 모달 닫기
  function closeModal() {
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
    modal.setAttribute("aria-hidden", "true");
  }

  // 각 카드 overlay 클릭 → 모달 열기
  overlays.forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      e.preventDefault();

      const card = overlay.closest(".pop-up__card");
      if (!card) return;

      const imgEl   = card.querySelector(".pop-up__thumb img");
      const titleEl = card.querySelector(".pop-up__name");
      const descEl  = card.querySelector(".pop-up__sub");

      const imgSrc  = imgEl   ? imgEl.src                  : "";
      const imgAlt  = imgEl   ? imgEl.alt                  : "";

      // overlay에 data-* 있으면 우선 사용, 없으면 카드 텍스트 사용
      const data    = overlay.dataset;
      const title   = data.title  || (titleEl ? titleEl.textContent.trim() : "");
      const desc    = data.desc   || (descEl  ? descEl.textContent.trim()  : "");
      const intent  = data.intent || ""; // 없으면 빈 문자열

      openModal({ imgSrc, imgAlt, title, desc, intent });
    });
  });

  // 닫기 버튼
  if (btnClose) {
    btnClose.addEventListener("click", closeModal);
  }

  // 배경 클릭 시 닫기
  if (modalBg) {
    modalBg.addEventListener("click", closeModal);
  }

  // ESC 키로 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
});

const overlays = document.querySelectorAll('.pop-up__overlay');
const modal = document.getElementById('designModal');

overlays.forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    e.preventDefault();

    // 기본 정보
    document.getElementById('designModalTitle').textContent = this.dataset.title;
    document.getElementById('designModalDesc').textContent  = this.dataset.desc;
    document.getElementById('designModalIntent').textContent = this.dataset.intent;

    // ⭐ 태그 읽기
    const tagBox = modal.querySelector('.design-modal__tags');
    tagBox.innerHTML = ''; // 초기화

    if (this.dataset.tags) {
      const tags = this.dataset.tags.split(',');
      tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-chip';
        btn.innerHTML = tag.trim();
        tagBox.appendChild(btn);
      });
    }

    // 이미지 세팅
    document.getElementById('designModalImg').src =
      this.parentElement.querySelector('img').src;

    modal.classList.add('is-open');
  });
});

