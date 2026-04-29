let currentTarget = null;
let cameraStream = null;
let history = [];

function getTargets() {
  return window.PRONUNCIATION_TARGETS || [];
}

function pickScore() {
  return Math.floor(58 + Math.random() * 38);
}

function getBand(score) {
  if (score >= 84) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function getBandTitle(score) {
  if (score >= 84) return "非常接近";
  if (score >= 70) return "方向不错";
  return "继续调整";
}

function updateTarget(target) {
  currentTarget = target;
  document.querySelector("#target-text").textContent = target.display_text;
  document.querySelector("#target-subtitle").textContent = target.subtitle;
  document.querySelector("#mouth-hint").textContent = target.mouth_hint;
  document.querySelector("#correction-hint").textContent = target.correction_hint;
  document.querySelector("#score-value").textContent = "--%";
  document.querySelector("#score-caption").textContent = "等待练习开始";
  document.querySelector("#encouragement-title").textContent = "准备好了就开始";
  document.querySelector("#encouragement-text").textContent = "把注意力放在嘴唇开合和发音节奏上，一次练一个目标就够了。";

  document.querySelectorAll(".target-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.targetId === target.id);
  });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 1800);
}

window.addEventListener("spanish-claw-toast", (event) => {
  showToast(event.detail);
});

async function startCamera() {
  const video = document.querySelector("#camera-preview");
  const placeholder = document.querySelector("#camera-placeholder");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("当前浏览器不支持摄像头 API");
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 960, height: 540 },
      audio: false
    });
    video.srcObject = cameraStream;
    placeholder.hidden = true;
    runPractice();
  } catch {
    showToast("未获得摄像头权限，可先查看页面演示结构");
    runPractice();
  }
}

function runPractice() {
  if (!currentTarget) return;

  const score = pickScore();
  const band = getBand(score);
  const encouragement = currentTarget.encouragements[band];

  document.querySelector("#score-value").textContent = `${score}%`;
  document.querySelector("#score-caption").textContent = "基于首版演示逻辑生成的口型相似反馈";
  document.querySelector("#encouragement-title").textContent = getBandTitle(score);
  document.querySelector("#encouragement-text").textContent = encouragement;
  document.querySelector("#correction-hint").textContent = currentTarget.correction_hint;

  history.unshift({
    target: currentTarget.display_text,
    score
  });
  history = history.slice(0, 5);
  renderHistory();
}

function renderHistory() {
  const container = document.querySelector("#practice-history");
  if (!history.length) {
    container.innerHTML = `<p class="muted">还没有练习记录。</p>`;
    return;
  }

  container.innerHTML = history.map((item) => `
    <div class="history-row">
      <span>${item.target}</span>
      <strong>${item.score}%</strong>
    </div>
  `).join("");
}

function playDemoCue() {
  if (!currentTarget) return;
  window.SpanishClawAudio.speak(currentTarget.target, { rate: 0.82 });
}

function playSlowDemoCue() {
  if (!currentTarget) return;
  window.SpanishClawAudio.speak(currentTarget.target, { rate: 0.58 });
  showToast("慢速播放用于首版演示，后续可接入更精细的标准发音音频。");
}

function setupPronunciationPage() {
  const targets = getTargets();
  if (!targets.length) return;

  updateTarget(targets[0]);

  document.querySelectorAll(".target-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const target = targets.find((item) => item.id === chip.dataset.targetId);
      if (target) updateTarget(target);
    });
  });

  document.querySelector("#start-camera-button").addEventListener("click", startCamera);
  document.querySelector("#retry-button").addEventListener("click", runPractice);
  document.querySelector("#demo-button").addEventListener("click", playDemoCue);
  document.querySelector("#slow-demo-button").addEventListener("click", playSlowDemoCue);
}

document.addEventListener("DOMContentLoaded", setupPronunciationPage);
