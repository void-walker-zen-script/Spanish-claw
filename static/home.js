(() => {
  const rail = document.querySelector("[data-module-rail]");
  if (!rail) return;
  const move = (direction) => rail.scrollBy({ left: direction * Math.min(rail.clientWidth * 0.78, 360), behavior: "smooth" });
  document.querySelector("[data-rail='previous']")?.addEventListener("click", () => move(-1));
  document.querySelector("[data-rail='next']")?.addEventListener("click", () => move(1));
  rail.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
  });
})();

/* ===== Animated "C" tile on the homepage (mirrors WorkBuddy's animated "o") =====
   用户选定：1→ñ徽章书写 · 2→咖啡杯滑入 · 3→猫爪盖章 · 4→闪电突发 */
(() => {
  const clawC = document.getElementById('clawC');
  const popupWbn = document.getElementById('popupWbn');
  if (!clawC) return;
  const clawIcon = clawC.querySelector('.claw-c-icon');

  const ICONS = {
    word:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="2.2"/><text x="12" y="17" font-size="15" font-weight="900" font-family="Georgia, serif" text-anchor="middle" fill="#fff">ñ</text></svg>',
    scene: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M5 9h12v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2" fill="none" stroke="#fff" stroke-width="2"/><path class="steam" d="M8 3c0 1.5-1.5 2-1.5 3.5" stroke="#fff" stroke-width="1.4" fill="none"/><path class="steam s2" d="M12 3c0 1.5-1.5 2-1.5 3.5" stroke="#fff" stroke-width="1.4" fill="none"/></svg>',
    cat:   '<svg viewBox="0 0 24 24" fill="#fff"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6.6" cy="9.2" r="2"/><circle cx="11" cy="6.4" r="2.2"/><circle cx="16.1" cy="7" r="2"/><circle cx="19.4" cy="10.2" r="1.7"/></svg>',
    news:  '<svg viewBox="0 0 24 24" fill="#fff"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>'
  };
  const CLAW_STATES = [
    { icon: ICONS.word,  color: '#6f8a5e', motion: 'm-write', label: '西语单词' },
    { icon: ICONS.scene, color: '#a86a52', motion: 'm-slide', label: '情景' },
    { icon: ICONS.cat,   color: '#c0895f', motion: 'm-stamp', label: '猫咪' },
    { icon: ICONS.news,  color: '#5f6b69', motion: 'm-flash', label: '时事新闻' }
  ];
  const MOTIONS = ['m-write', 'm-slide', 'm-stamp', 'm-flash'];
  let clawIdx = 0;
  function setClaw(i) {
    const s = CLAW_STATES[i];
    clawC.style.setProperty('--c-color', s.color);
    clawIcon.innerHTML = s.icon;
    clawC.classList.remove('swap'); void clawC.offsetWidth; clawC.classList.add('swap');
    clawIcon.classList.remove(...MOTIONS); void clawIcon.offsetWidth; clawIcon.classList.add(s.motion);
  }
  setClaw(0);
  setInterval(() => { clawIdx = (clawIdx + 1) % CLAW_STATES.length; setClaw(clawIdx); }, 1900);
  /* "我帮你" 只在 C 完成第一次变换之后，逐字浮现 */
  setTimeout(() => popupWbn && popupWbn.classList.add('show'), 1150);
})();

/* ===== Homepage mascot story =====
   节奏：猫咪散步到右端 → 正中央出现小丑鱼 → 猫咪抱鱼坐下并看向学习者。 */
(() => {
  const stage = document.querySelector('[data-mascot-story]');
  if (!stage) return;

  const story = stage.querySelector('.mascot-story');
  const replay = stage.querySelector('.mascot-replay');
  const status = stage.querySelector('[data-story-status]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timers = [];

  const clearTimeline = () => {
    timers.forEach(window.clearTimeout);
    timers = [];
  };
  const say = (message) => {
    if (status) status.textContent = message;
  };
  const after = (milliseconds, callback) => {
    timers.push(window.setTimeout(callback, milliseconds));
  };

  function playStory() {
    clearTimeline();
    if (reduceMotion.matches) {
      story.classList.add('is-playing');
      say('零灵灵抱着新朋友，正等你一起出发。');
      return;
    }

    story.classList.remove('is-playing');
    void story.offsetWidth;
    story.classList.add('is-playing');
    say('零灵灵正在慢悠悠地散步……');
    after(3900, () => say('咦？正中央有一条活泼的小丑鱼。'));
    after(5500, () => say('零灵灵的眼睛一下亮了起来。'));
    after(6600, () => say('它小心捧起小丑鱼，左看看、右看看……'));
    after(8500, () => say('零灵灵带着新朋友，看向了你。'));
  }

  replay?.addEventListener('click', playStory);
  reduceMotion.addEventListener?.('change', playStory);
  playStory();
})();
