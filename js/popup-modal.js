// js/popup-modal.js
document.addEventListener("DOMContentLoaded", () => {
  // 요소 찾기
  const overlays     = document.querySelectorAll(".pop-up__overlay");
  const modal        = document.getElementById("designModal");
  const modalImg     = document.getElementById("designModalImg");
  const modalTitle   = document.getElementById("designModalTitle");
  const modalDesc    = document.getElementById("designModalDesc");
  const modalIntent  = document.getElementById("designModalIntent"); // 있으면 사용
  const btnClose     = document.querySelector(".design-modal__close");
  const modalBg      = document.querySelector(".design-modal__overlay");
  const openTrigger  = document.querySelector("[data-modal-open='designModal']");
  const tagBox       = modal ? modal.querySelector(".design-modal__tags") : null;

  // 모달이 아예 없으면 더 진행하지 않음
  if (!modal) {
    console.warn("designModal 요소를 찾지 못했습니다.");
    return;
  }

  // 마지막으로 모달을 연 트리거 저장 (포커스 복귀용)
  let lastTrigger = null;

  // 모달 열기
  function openModal({ imgSrc, imgAlt, title, desc, intent, tags }, triggerEl) {
    lastTrigger = triggerEl || lastTrigger;

    // 이미지
    if (imgSrc && modalImg) {
      modalImg.src = imgSrc;
      modalImg.alt = imgAlt || title || "design image";
    }

    // 텍스트들
    if (modalTitle) modalTitle.textContent = title || "";
    if (modalDesc)  modalDesc.textContent  = desc  || "";
    if (modalIntent) modalIntent.textContent = intent || "";

    // 태그 박스
    if (tagBox) {
      tagBox.innerHTML = "";
      if (tags && tags.length > 0) {
        tags.forEach((tag) => {
          const btn = document.createElement("button");
          btn.className = "tag-chip";
          btn.textContent = tag.trim();
          tagBox.appendChild(btn);
        });
      }
    }

    // 모달 상태 열기
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";
    modal.setAttribute("aria-hidden", "false");

    // 포커스를 모달 안으로 이동 (닫기 버튼 우선)
    if (btnClose) {
      btnClose.focus();
    } else {
      // 다른 포커스 가능한 요소가 있다면 거기로
      const focusable = modal.querySelector(
        "button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])"
      );
      if (focusable) focusable.focus();
    }
  }

  // 모달 닫기
  function closeModal() {
    if (!modal.classList.contains("is-open")) return;

    // 먼저 포커스를 모달 밖으로 빼기 (경고 방지)
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
    } else if (openTrigger && typeof openTrigger.focus === "function") {
      openTrigger.focus();
    } else {
      document.body.focus();
    }

    // 그 다음 모달 닫기
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

      const imgSrc  = imgEl   ? imgEl.src : "";
      const imgAlt  = imgEl   ? imgEl.alt : "";

      const data    = overlay.dataset;
      const title   = data.title  || (titleEl ? titleEl.textContent.trim() : "");
      const desc    = data.desc   || (descEl  ? descEl.textContent.trim()  : "");
      const intent  = data.intent || "";

      // data-tags="UI, Landing, Event" 이런 식으로 들어온다고 가정
      let tags = [];
      if (data.tags) {
        tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
      }

      openModal({ imgSrc, imgAlt, title, desc, intent, tags }, overlay);
    });
  });

  // 닫기 버튼
  if (btnClose) {
    btnClose.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // 배경 클릭 시 닫기
  if (modalBg) {
    modalBg.addEventListener("click", (e) => {
      // 배경 클릭일 때만 닫기 (안쪽 내용 클릭은 무시)
      if (e.target === modalBg) {
        closeModal();
      }
    });
  }

  // ESC 키로 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
});

// js/popup-modal.js
document.addEventListener("DOMContentLoaded", () => {
  // 1. 요소 찾기
  const overlays    = document.querySelectorAll(".pop-up__overlay");   // 썸네일 위 오버레이
  const modal       = document.getElementById("designModal");
  const modalImg    = document.getElementById("designModalImg");
  const modalTitle  = document.getElementById("designModalTitle");
  const modalDesc   = document.getElementById("designModalDesc");
  const modalIntent = document.getElementById("designModalIntent");
  const modalTags   = document.getElementById("designModalTags");      // 🔥 tags 영역
  const btnClose    = modal.querySelector(".design-modal__close");
  const modalBg     = modal.querySelector(".design-modal__overlay");

  if (!modal) {
    console.warn("designModal 요소를 찾지 못했습니다.");
    return;
  }

  // 2. 모달 열기
  function openModal(trigger) {
    // 썸네일 이미지 가져오기
    const figure = trigger.closest(".pop-up__thumb");
    const imgEl  = figure ? figure.querySelector("img") : null;

    if (modalImg && imgEl) {
      modalImg.src = imgEl.src;
      modalImg.alt = imgEl.alt || "";
    }

    // 텍스트들
    if (modalTitle)  modalTitle.textContent  = trigger.dataset.title  || "";
    if (modalDesc)   modalDesc.textContent   = trigger.dataset.desc   || "";
    if (modalIntent) modalIntent.textContent = trigger.dataset.intent || "";

    //  여기서 sup가 HTML로 렌더되게 innerHTML 사용
    if (modalTags) {
  const raw = trigger.dataset.tags || "";

  // 컨테이너 비우기
  modalTags.innerHTML = "";

  // "banner<sup>1</sup>,design" 이런 식이니까 쉼표로 나눔
  const tagList = raw.split(",");

  tagList.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-chip";      // 🔥 여기서 버튼 스타일 입혀줌
    btn.innerHTML = tag.trim();      // sup 태그 살리려고 innerHTML 사용

    modalTags.appendChild(btn);
  });
}


    modal.classList.add("on");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // 모달 열렸을 때 배경 스크롤 잠금(원하면 유지, 싫으면 지워도 됨)
  }

  // 3. 모달 닫기
  function closeModal() {
    modal.classList.remove("on");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // 4. 각 오버레이에 클릭 이벤트 연결
  overlays.forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(overlay);
    });
  });

  // 5. 닫기 버튼 / 배경 클릭 시 닫기
  if (btnClose) {
    btnClose.addEventListener("click", closeModal);
  }

  if (modalBg) {
    modalBg.addEventListener("click", closeModal);
  }

  // ESC 키로 닫기 (옵션)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("on")) {
      closeModal();
    }
  });
});
