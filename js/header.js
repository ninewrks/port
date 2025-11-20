document.addEventListener("DOMContentLoaded", () => {
  const headerEl      = document.querySelector("header");
  const menuBtn       = document.querySelector(".menu-mo");
  const closeBtn      = document.querySelector(".menu-close");
  const overlay       = document.querySelector(".menu-overlay");
  const aboutSection  = document.querySelector(".about");
  const projectFrame  = document.querySelector(".project-frame");
  const introOverlay  = document.querySelector(".overlay-contents");

  if (!headerEl || !aboutSection) return;

  const isPC = () => window.innerWidth > 1024;

  // ===========================
  // 1) 모바일/태블릿: 햄버거 노출 타이밍
  //    - 인트로(.overlay-contents) 영역에서는 숨김
  //    - 인트로 끝난 뒤(= 다음 섹션부터) 보이게
  // ===========================
  function updateMobileHamburger() {
    if (!menuBtn) return;

    if (isPC()) {
      document.body.classList.remove("show-mobile-menu");
      headerEl.classList.remove("is-open");
      if (overlay) overlay.classList.remove("is-open");
      document.body.style.overflow = "";
      return;
    }

    const scrollY = window.scrollY;

    // 인트로의 "끝" 지점 기준
    let threshold = 0;
    if (introOverlay) {
      const introBottom =
        introOverlay.offsetTop + introOverlay.offsetHeight;
      threshold = introBottom - 40; // 살짝 여유
    } else {
      // 혹시 overlay-contents 없으면 백업: about 시작 지점
      threshold = aboutSection.offsetTop - 10;
    }

    if (scrollY >= threshold) {
      // 인트로 지나간 뒤 → 햄버거 보이기
      document.body.classList.add("show-mobile-menu");
    } else {
      // 인트로 안(탭 인트로 포함) → 햄버거 숨기기 + 메뉴 닫기
      document.body.classList.remove("show-mobile-menu");
      headerEl.classList.remove("is-open");
      if (overlay) overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }
  }

  // ===========================
  // 2) 모바일/태블릿: 햄버거 메뉴 열기/닫기
  // ===========================
  function openMenu() {
    if (!isPC()) {
      headerEl.classList.add("is-open");
      if (overlay) overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
  }

  function closeMenu() {
    headerEl.classList.remove("is-open");
    if (overlay) overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  if (menuBtn && closeBtn && overlay) {
    menuBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }

  // ===========================
  // 3) PC 전용: 인트로/프로젝트 헤더 동작
  // ===========================
  let lastScrollY = window.scrollY;

  function runPCHeaderLogic() {
    if (!isPC()) {
      headerEl.classList.remove(
        "header-intro-hide",
        "header-project-hide",
        "header-project-show"
      );
      return;
    }

    const scrollY = window.scrollY;
    const introBottom = introOverlay
      ? introOverlay.offsetTop + introOverlay.offsetHeight
      : 0;

    // 인트로 영역에서는 헤더 숨김
    if (scrollY < introBottom - 40) {
      headerEl.classList.add("header-intro-hide");
    } else {
      headerEl.classList.remove("header-intro-hide");
    }

    let inProject = false;
    if (projectFrame) {
      const top = projectFrame.offsetTop;
      const bottom = top + projectFrame.offsetHeight;
      inProject = scrollY >= top && scrollY < bottom;
    }

    if (inProject) {
      if (scrollY < lastScrollY - 3) {
        headerEl.classList.add("header-project-show");
        headerEl.classList.remove("header-project-hide");
      } else if (scrollY > lastScrollY + 3) {
        headerEl.classList.add("header-project-hide");
        headerEl.classList.remove("header-project-show");
      }
    } else {
      headerEl.classList.remove("header-project-hide", "header-project-show");
    }

    lastScrollY = scrollY;
  }

  // ===========================
  // 4) PC: 화면 최상단 호버 시 헤더 보이기
  // ===========================
  function handlePCHover(e) {
    if (!isPC()) return;
    if (!projectFrame) return;

    const scrollY = window.scrollY;
    const top = projectFrame.offsetTop;
    const bottom = top + projectFrame.offsetHeight;
    const inProject = scrollY >= top && scrollY < bottom;

    if (!inProject) return;

    if (e.clientY <= 5) {
      headerEl.classList.add("header-project-show");
      headerEl.classList.remove("header-project-hide");
    }
  }

  // ===========================
  // 5) 초기 실행 + 이벤트
  // ===========================
  function onScroll() {
    updateMobileHamburger();
    runPCHeaderLogic();
  }
  function onResize() {
    updateMobileHamburger();
    runPCHeaderLogic();
  }

  updateMobileHamburger();
  runPCHeaderLogic();

  window.addEventListener("scroll", onScroll);
  window.addEventListener("resize", onResize);
  window.addEventListener("mousemove", handlePCHover);
});
