document.addEventListener("DOMContentLoaded", () => {
  const headerEl      = document.querySelector("header");
  const menuBtn       = document.querySelector(".menu-mo");
  const closeBtn      = document.querySelector(".menu-close");
  const overlay       = document.querySelector(".menu-overlay");
  const aboutSection  = document.querySelector(".about");
  const introOverlay  = document.querySelector(".overlay-contents");

  // ⬇⬇⬇ 여기! 단일 frame → 여러 개 frames 로 변경
  const projectFrames = document.querySelectorAll(".project-frame");

  if (!headerEl || !aboutSection) return;

  const isPC = () => window.innerWidth > 1024;

  // --------------------------------
  // 공통: 현재 스크롤이 어떤 project-frame 영역 안에 있는지 체크
  // --------------------------------
  function getProjectState(scrollY) {
    if (!projectFrames || projectFrames.length === 0) {
      return { inProject: false, firstTop: 0, lastBottom: 0 };
    }

    let inProject = false;
    let firstTop = projectFrames[0].offsetTop;
    let lastBottom = firstTop + projectFrames[0].offsetHeight;

    projectFrames.forEach((frame) => {
      const top = frame.offsetTop;
      const bottom = top + frame.offsetHeight;

      if (top < firstTop) firstTop = top;
      if (bottom > lastBottom) lastBottom = bottom;

      if (scrollY >= top && scrollY < bottom) {
        inProject = true;
      }
    });

    return { inProject, firstTop, lastBottom };
  }

  // ===========================
  // 1) 모바일/태블릿: 햄버거 노출 타이밍
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

    let threshold = 0;
    if (introOverlay) {
      const introBottom =
        introOverlay.offsetTop + introOverlay.offsetHeight;
      threshold = introBottom - 40;
    } else {
      threshold = aboutSection.offsetTop - 10;
    }

    if (scrollY >= threshold) {
      document.body.classList.add("show-mobile-menu");
    } else {
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

    // ⬇⬇⬇ 여러 project-frame 기준으로 inProject 판별
    const { inProject } = getProjectState(scrollY);

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
    if (!projectFrames || projectFrames.length === 0) return;

    const scrollY = window.scrollY;
    const { inProject } = getProjectState(scrollY);

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
// CONTACT dropdown
const contact = document.querySelector('.nav-contact');
const dropdown = contact?.querySelector('.dropdown');

if (contact && dropdown) {
  contact.addEventListener('click', (e) => {
    // 드롭다운 내부 링크(a)를 클릭했을 때는 기본 동작 유지
    if (e.target.closest('.dropdown')) {
      return; // preventDefault 실행 안 함 → PHONE/EMAIL/RESUME 정상 동작
    }

    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('show');
  });
}