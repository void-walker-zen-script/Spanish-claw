(() => {
  const list = document.querySelector("[data-news-list]");
  const status = document.querySelector("[data-news-status]");
  const tabs = [...document.querySelectorAll("[data-news-category]")];
  if (!list || !status) return;
  const formatDate = (iso) => iso ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(iso)) : "最新";
  const escapeHtml = (value) => String(value || "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  const art = {
    technology: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 32h34M32 15v34M21 21l22 22M43 21 21 43"/><circle cx="32" cy="32" r="15"/></svg>',
    entertainment: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 42c9-25 25-25 34 0"/><path d="M20 22h24v19H20z"/><path d="M25 17v5m14-5v5"/></svg>',
    food: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M15 17v14m-5-14v14m10-14v14m-5 0v17M39 17v31m0-31c10 5 10 20 0 25"/></svg>',
    travel: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="20"/><path d="M12 32h40M32 12c8 9 8 31 0 40M32 12c-8 9-8 31 0 40"/></svg>',
    education: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m10 26 22-11 22 11-22 11zM18 31v12c8 6 20 6 28 0V31"/></svg>',
    celebrity: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m32 12 5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1z"/></svg>',
    finance: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 47 28 33l9 7 14-19"/><path d="M42 21h9v9"/><path d="M12 52h40"/></svg>',
    sports: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="20"/><path d="m18 20 10 8-4 12 13 5m9-22-9 5-9-8"/></svg>'
  };
  async function load(category) {
    status.textContent = "零灵灵正在整理今日阅读卡…"; list.innerHTML = "";
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.newsCategory === category));
    try {
      const response = await fetch(`/api/news?category=${encodeURIComponent(category)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "加载失败");
      if (!data.headlines.length) throw new Error("新闻源暂时不可用，请稍后刷新。");
      status.textContent = `已更新 ${data.headlines.length} 条西语阅读卡`;
      list.innerHTML = data.headlines.map((item, index) => `<article class="news-card news-card--${category}"><div class="news-card-media">${art[category] || art.travel}<span>${String(index + 1).padStart(2, "0")}</span></div><div class="news-card-copy"><p>${escapeHtml(item.publisher)} · ${escapeHtml(formatDate(item.published_at))}</p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)} <span>↗</span></a><small>打开原文，完成一则西语真实阅读</small></div></article>`).join("");
    } catch (error) { status.textContent = error.message || "新闻暂不可用。"; }
  }
  tabs.forEach((tab) => tab.addEventListener("click", () => load(tab.dataset.newsCategory)));
  load("technology");
})();
