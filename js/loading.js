document.body.style.overflow = "hidden";

const pct = document.getElementById("percent");
const pre = document.getElementById("preloader");
const view = document.getElementById("viewport");

let n = 0;
const timer = setInterval(()=>{
  n += 1; if(n>100) n=100;
  pct.textContent = n + "%";
  if(n === 100){
    clearInterval(timer);
    preloadFirst().finally(()=>{
      pre.classList.add('up');
      pre.addEventListener('transitionend', () => {
        pre.style.display = 'none';
        document.body.style.overflow = 'auto';
        view.removeAttribute('aria-hidden');
      }, { once:true });
    });
  }
}, 30);

/* 첫 섹션(인트로)만 선로드 → 전환 매끈 */
async function preloadFirst(){
  const intro = document.querySelector('#intro[data-src]');
  if(!intro || intro.dataset.loaded) return;
  try{
    const res = await fetch(intro.dataset.src, {cache:'no-store'});
    intro.innerHTML = await res.text();
    intro.dataset.loaded = "1";
  }catch(e){
    intro.innerHTML = '<p style="padding:2rem">인트로 로드 실패 😢</p>';
  }
}

/* 나머지 섹션은 지연 로드 (보일 때 fetch) */
const sections = document.querySelectorAll('section[data-src]');
const io = new IntersectionObserver(entries=>{
  entries.forEach(async entry=>{
    if(!entry.isIntersecting) return;
    const el = entry.target;
    if(el.dataset.loaded) return;
    try{
      const res = await fetch(el.dataset.src, {cache:'no-store'});
      el.innerHTML = await res.text();
      el.dataset.loaded = "1";
    }catch(e){
      el.innerHTML = '<p style="padding:2rem">섹션 로드 실패 😢</p>';
    }
  });
}, {root: view, threshold: 0.12});
sections.forEach(s => io.observe(s));