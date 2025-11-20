// header.js (최종 통합본 + 스티키 클릭 이슈 해결)
document.addEventListener("DOMContentLoaded", () => {
  const headerEl = document.querySelector("header");
  const menuBtn  = document.querySelector(".menu-mo");        // 햄버거 버튼
  const overlay  = document.querySelector(".menu-overlay");   // 어두운 배경
  const closeBtn = document.querySelector(".menu-close");     // X 버튼

  const projectSection = document.querySelector(".project-frame");
  const stickyMenu = document.querySelector(".project-sticky-menu"); // ⭐ 스티키 메뉴
  let isOverSticky = false; // ⭐ 스티키 위에 마우스 있는지 여부

  // 브레이크포인트 기준 (PC 전용 동작용)
  const isDesktop = () => window.innerWidth > 1024;

  /* =========================
     0. 헤더 높이를 CSS 변수로 반영
     ========================= */
  function updateHeaderHeightVar() {
    if (!headerEl) return;
    const h = headerEl.offsetHeight || 0;
    document.documentElement.style.setProperty("--header-height", h + "px");
  }

  /* =========================
     1. 모바일 햄버거 메뉴 열기/닫기
     ========================= */
  if (!menuBtn || !headerEl || !overlay || !closeBtn) {
    console.warn("헤더 메뉴 요소를 찾지 못했습니다.");
  } else {
    function openMenu() {
      headerEl.classList.add("is-open");
      overlay.classList.add("is-open");
    }

    function closeMenu() {
      headerEl.classList.remove("is-open");
      overlay.classList.remove("is-open");
    }

    menuBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  /* =========================
     2. about 섹션 이후부터 햄버거 보이기
     ========================= */
  const aboutSection = document.querySelector(".about");

  function toggleMobileMenuByScroll() {
    if (!aboutSection) return;

    const rect = aboutSection.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // about 섹션의 top이 화면 높이의 2/3 위로 올라가면 햄버거 노출
    if (rect.top <= vh * (2 / 3)) {
      document.body.classList.add("show-mobile-menu");
    } else {
      document.body.classList.remove("show-mobile-menu");
    }
  }

  /* =========================
     3. 헤더가 보이는지 여부 상태 플래그
        → 스티키 메뉴 top 오프셋에 사용
     ========================= */
  function updateHeaderVisibleState() {
    if (!headerEl) return;

    const isHidden = headerEl.classList.contains("header-hidden");
    const isShowingByHover = headerEl.classList.contains("header-show");

    // header-hidden이 아니면 기본적으로는 보인다고 판단
    const actuallyVisible = !isHidden || isShowingByHover;

    document.body.classList.toggle("header-visible", actuallyVisible);
  }

  /* =========================
     4. project-frame 구간에서 헤더 숨기기 (PC 전용)
     ========================= */
  function toggleHeaderByScroll() {
    // 헤더가 없으면 그냥 visible 처리만
    if (!headerEl) {
      updateHeaderVisibleState();
      return;
    }

    // project-frame 자체가 없으면 숨김 로직 스킵, 헤더는 항상 보이는 상태
    if (!projectSection) {
      headerEl.classList.remove("header-hidden", "header-show");
      document.body.classList.remove("in-project-frame");
      updateHeaderVisibleState();
      return;
    }

    // PC가 아니면 숨김 기능 끔
    if (!isDesktop()) {
      headerEl.classList.remove("header-hidden", "header-show");
      document.body.classList.remove("in-project-frame");
      updateHeaderVisibleState();
      return;
    }

    const rect = projectSection.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // project-frame이 화면 중앙 근처에 들어왔을 때를 "진입"으로 판단
    const inProject =
      rect.top < vh * 0.5 && // 섹션 상단이 화면 중간보다 위에 있고
      rect.bottom > 80;      // 섹션 하단이 아직 화면 아래에 남아 있을 때

    if (inProject) {
      document.body.classList.add("in-project-frame");
      headerEl.classList.add("header-hidden");
      headerEl.classList.remove("header-show");
    } else {
      document.body.classList.remove("in-project-frame");
      headerEl.classList.remove("header-hidden", "header-show");
    }

    updateHeaderVisibleState();
  }

  /* =========================
     5. 스크롤/리사이즈 공통 핸들러
     ========================= */
  function onScrollOrResize() {
    toggleMobileMenuByScroll(); // about 기준으로 햄버거 노출
    toggleHeaderByScroll();     // project-frame 기준으로 헤더 숨김/보임
    updateHeaderHeightVar();    // 헤더 높이 갱신
  }

  // 초기 1회 호출
  updateHeaderHeightVar();
  onScrollOrResize();

  // 이벤트 바인딩
  window.addEventListener("scroll", onScrollOrResize);
  window.addEventListener("resize", onScrollOrResize);
  window.addEventListener("load", updateHeaderHeightVar);

  /* =========================
     6. 스티키 메뉴 위에 마우스 있을 때 플래그
     ========================= */
  if (stickyMenu) {
    stickyMenu.addEventListener("mouseenter", () => {
      isOverSticky = true;
    });
    stickyMenu.addEventListener("mouseleave", () => {
      isOverSticky = false;
    });
  }

  /* =========================
     7. 화면 상단 hover 시 헤더 다시 보이게
        (PC + project-frame 안일 때, 스티키 위에는 건들지 않기)
     ========================= */
  document.addEventListener("mousemove", (e) => {
    if (!headerEl) return;
    if (!isDesktop()) return;
    if (!document.body.classList.contains("in-project-frame")) return;

    // ⭐ 스티키 메뉴 위에 있을 땐 헤더 상태 건들지 않음 (점프 방지)
    if (isOverSticky) return;

    // ⭐ 진짜 맨 위 20px 안쪽에서만 헤더 나게 좁혀줌
    if (e.clientY < 20) {
      headerEl.classList.add("header-show");
    } else {
      headerEl.classList.remove("header-show");
    }

    updateHeaderVisibleState();
  });
});
