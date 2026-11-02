(() => {
  const list = document.querySelector("[data-news-list]");
  const status = document.querySelector("[data-news-status]");
  const tabs = [...document.querySelectorAll("[data-news-category]")];
  if (!list || !status) return;
  const formatDate = (iso) => iso ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(iso)) : "最新";
  const escapeHtml = (value) => String(value || "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  async function load(category) {
    status.textContent = "正在加载新闻……"; list.innerHTML = "";
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.newsCategory === category));
    try {
      const response = await fetch(`/api/news?category=${encodeURIComponent(category)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "加载失败");
      if (!data.headlines.length) throw new Error("新闻源暂时不可用，请稍后刷新。");
      status.textContent = `已更新 ${data.headlines.length} 条标题`;
      list.innerHTML = data.headlines.map((item) => `<article class="news-card"><p>${escapeHtml(item.publisher)} · ${escapeHtml(formatDate(item.published_at))}</p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)} <span>↗</span></a></article>`).join("");
    } catch (error) { status.textContent = error.message || "新闻暂不可用。"; }
  }
  tabs.forEach((tab) => tab.addEventListener("click", () => load(tab.dataset.newsCategory)));
  load("technology");
})();
