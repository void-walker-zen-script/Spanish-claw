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
