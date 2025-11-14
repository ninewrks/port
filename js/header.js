document.addEventListener("DOMContentLoaded", () => {
  const menuBtn   = document.querySelector(".menu-mo");      // 햄버거 버튼
  const headerEl  = document.querySelector("header");        // 슬라이드 메뉴
  const overlay   = document.querySelector(".menu-overlay"); // 어두운 배경
  const closeBtn  = document.querySelector(".menu-close");   // X 버튼

  if (!menuBtn || !headerEl || !overlay || !closeBtn) {
    console.warn("헤더 메뉴 요소를 찾지 못했습니다.");
    return;
  }

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

  /* =========================
     about 섹션 이후부터 햄버거 보이기
     ========================= */
  const aboutSection = document.querySelector(".about");
  if (!aboutSection) return;

  function toggleMobileMenuByScroll() {
    const rect = aboutSection.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // 👉 기준 예시:
    // about 섹션의 top이 화면 위에서 1/3 지점보다 위로 올라가면 햄버거 보이게
    if (rect.top <= vh * (2/3)) {
      document.body.classList.add("show-mobile-menu");
    } else {
      document.body.classList.remove("show-mobile-menu");
    }
  }

  // 첫 로드 + 스크롤할 때마다 체크
  toggleMobileMenuByScroll();
  window.addEventListener("scroll", toggleMobileMenuByScroll);
  window.addEventListener("resize", toggleMobileMenuByScroll);
});
