(() => {
  const catalog = document.querySelector('[data-scene-catalog]');
  if (!catalog) return;
  const filters = [...catalog.querySelectorAll('[data-scene-filter]')];
  const tracks = [...catalog.querySelectorAll('[data-scene-track]')];
  const loading = document.querySelector('.scene-loading');

  filters.forEach((button) => button.addEventListener('click', () => {
    const track = button.dataset.sceneFilter;
    filters.forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)); });
    tracks.forEach((item) => item.classList.toggle('is-hidden', item.dataset.sceneTrack !== track));
  }));
  catalog.querySelectorAll('[data-scene-card]').forEach((card) => card.addEventListener('click', () => {
    if (loading) { loading.classList.add('is-visible'); loading.setAttribute('aria-hidden', 'false'); }
  }));
})();
