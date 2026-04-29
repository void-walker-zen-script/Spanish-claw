const FAVORITES_KEY = "spanish-claw:favorites";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function getFavoriteId(entry, lessonId) {
  return `${lessonId}:${entry.key || entry.text}`;
}

function isFavorite(entry, lessonId) {
  const id = getFavoriteId(entry, lessonId);
  return getFavorites().some((item) => item.id === id);
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

function toggleFavorite(entry, lesson) {
  const favorites = getFavorites();
  const id = getFavoriteId(entry, lesson.id);
  const existing = favorites.findIndex((item) => item.id === id);

  if (existing >= 0) {
    favorites.splice(existing, 1);
    saveFavorites(favorites);
    showToast("已取消收藏");
    return false;
  }

  favorites.unshift({
    id,
    type: entry.type,
    text: entry.text,
    translation: entry.translation,
    sourceLessonId: lesson.id,
    sourceLessonTitle: lesson.title,
    tags: [lesson.level, lesson.scene].filter(Boolean),
    createdAt: new Date().toISOString()
  });
  saveFavorites(favorites);
  showToast("已收藏");
  return true;
}

function renderList(items) {
  return items && items.length
    ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : `<p class="muted">暂无</p>`;
}

function renderWordCard(entry, lesson) {
  const favorite = isFavorite(entry, lesson.id);
  return `
    <p class="section-kicker">Word Card</p>
    <div class="card-heading">
      <div>
        <h2>${entry.text}</h2>
        <p>${entry.translation}</p>
      </div>
      <span class="pill">${entry.pos || "词条"}</span>
    </div>
    <dl class="field-grid">
      <div><dt>中文释义</dt><dd>${entry.translation || "-"}</dd></div>
      <div><dt>原形</dt><dd>${entry.lemma || "-"}</dd></div>
      <div><dt>变位说明</dt><dd>${entry.conjugation || "-"}</dd></div>
      <div><dt>一般表达</dt><dd>${entry.common_usage || "-"}</dd></div>
      <div><dt>地道表达</dt><dd>${entry.native_usage || "-"}</dd></div>
      <div><dt>例句</dt><dd>${entry.example || "-"}</dd></div>
    </dl>
    <div class="word-relations">
      <section>
        <h3>同义词</h3>
        ${renderList(entry.synonyms)}
      </section>
      <section>
        <h3>反义词</h3>
        ${renderList(entry.antonyms)}
      </section>
    </div>
    <button class="secondary-button card-audio-button" type="button" data-action="play-entry">
      Play Word
    </button>
    <button class="save-button" type="button" data-action="favorite">
      ${favorite ? "Saved" : "Save"}
    </button>
  `;
}

function renderSentenceCard(entry, lesson) {
  const favorite = isFavorite(entry, lesson.id);
  return `
    <p class="section-kicker">Sentence Card</p>
    <div class="card-heading">
      <div>
        <h2>${entry.text}</h2>
        <p>${entry.translation}</p>
      </div>
      <span class="pill">sentence</span>
    </div>
    <dl class="field-grid">
      <div><dt>中文翻译</dt><dd>${entry.translation || "-"}</dd></div>
      <div><dt>使用场景</dt><dd>${entry.usage_scene || "-"}</dd></div>
      <div><dt>结构说明</dt><dd>${entry.structure_note || "-"}</dd></div>
      <div><dt>更自然表达</dt><dd>${entry.natural_expression || "-"}</dd></div>
      <div><dt>可替换表达</dt><dd>${renderInlineList(entry.alternatives)}</dd></div>
      <div><dt>Pronunciation</dt><dd>${entry.pronunciation_prompt || "可进入 Pronunciation 模块继续练习。"}</dd></div>
    </dl>
    <button class="secondary-button card-audio-button" type="button" data-action="play-entry">
      Play Sentence
    </button>
    <button class="save-button" type="button" data-action="favorite">
      ${favorite ? "Saved" : "Save"}
    </button>
    <a class="secondary-button card-audio-button" href="/pronunciation">
      Go to Pronunciation
    </a>
  `;
}

function renderInlineList(items) {
  return items && items.length ? items.join(" / ") : "-";
}

function renderDefaultLessonCard(lesson) {
  const keywords = lesson.keywords || [];
  const grammarPoints = lesson.grammar_points || [];

  return `
    <p class="section-kicker">Lesson Summary</p>
    <h2>${lesson.scene || lesson.title || "Lesson"}</h2>
    <p>${lesson.summary || "先听全文，再点击单词或句子查看解释。"}</p>
    <dl class="field-grid">
      <div>
        <dt>Keywords</dt>
        <dd>${keywords.length ? keywords.join(" · ") : "-"}</dd>
      </div>
      <div>
        <dt>Grammar Points</dt>
        <dd>${renderList(grammarPoints)}</dd>
      </div>
    </dl>
  `;
}

function renderDefaultPanel(lesson) {
  const panel = document.querySelector("#insight-card");
  if (!panel) return;

  panel.className = "insight-card";
  panel.innerHTML = renderDefaultLessonCard(lesson);
}

function normalizeKey(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[.,¿?¡!:;]+$/g, "");
}

function findTranscriptLine(lesson, key) {
  const normalizedKey = normalizeKey(key);
  const transcript = lesson.transcript || [];
  const sentences = lesson.sentences || [];

  return transcript.find((line) => line.id === key || normalizeKey(line.id) === normalizedKey)
    || sentences.find((line) => line.sentence_id === key || line.insight_key === key)
    || null;
}

function createFallbackWordEntry(key) {
  return {
    key,
    type: "word",
    text: key,
    audio_text: key,
    translation: "这个词已经可以点击，详细词条可在 vocab.json 中继续补充。",
    pos: "word",
    lemma: "-",
    conjugation: "-",
    common_usage: "结合当前句子理解这个词。",
    native_usage: "后续可补充更自然的表达差异。",
    example: "-",
    synonyms: [],
    antonyms: []
  };
}

function createSentenceEntry(line) {
  return {
    key: line.id || line.sentence_id || line.insight_key,
    type: "sentence",
    text: line.spanish || line.text,
    audio_text: line.spanish || line.audio_text || line.text,
    translation: line.chinese || line.translation,
    speaker: line.speaker_cn || line.speaker,
    line_type: line.type,
    usage_scene: line.type === "narration"
      ? "旁白用于交代场景和动作背景。"
      : `${line.speaker_cn || line.speaker || "人物"} 的自然对话表达。`,
    structure_note: line.clickable_words && line.clickable_words.length
      ? `重点词：${line.clickable_words.join(" / ")}`
      : "可以结合整句语境理解表达。",
    natural_expression: line.spanish || line.text,
    alternatives: [],
    pronunciation_prompt: "可以先播放本句，再模仿语速和停顿。"
  };
}

function clearSelected() {
  document.querySelectorAll(".selected").forEach((element) => {
    element.classList.remove("selected");
  });
}

function selectEntry(key, trigger) {
  const data = window.SPANISH_CLAW_DATA;
  const normalizedKey = normalizeKey(key);
  const transcriptLine = findTranscriptLine(data.lesson, key);
  const entry = data.entries[key]
    || data.entries[normalizedKey]
    || (transcriptLine ? createSentenceEntry(transcriptLine) : null)
    || createFallbackWordEntry(normalizedKey || key);
  const panel = document.querySelector("#insight-card");

  if (!panel) {
    return;
  }

  clearSelected();
  trigger.classList.add("selected");
  panel.className = "insight-card";
  panel.innerHTML =
    entry.type === "sentence"
      ? renderSentenceCard(entry, data.lesson)
      : renderWordCard(entry, data.lesson);

  const saveButton = panel.querySelector('[data-action="favorite"]');
  const playButton = panel.querySelector('[data-action="play-entry"]');
  playButton.addEventListener("click", () => {
    window.SpanishClawAudio.speak(entry.audio_text || entry.text);
  });

  saveButton.addEventListener("click", () => {
    const saved = toggleFavorite(entry, data.lesson);
    saveButton.textContent = saved ? "Saved" : "Save";
  });
}

function setupLessonPage() {
  if (!window.SPANISH_CLAW_DATA) return;
  const lesson = window.SPANISH_CLAW_DATA.lesson;

  renderDefaultPanel(lesson);

  document.querySelector("#play-lesson-button")?.addEventListener("click", () => {
    const lines = lesson.transcript || lesson.sentences || [];
    const text = lesson.audio?.tts_text || lines.map((line) => line.spanish || line.text).join(" ");
    window.SpanishClawAudio.speak(text, {
      lang: lesson.audio?.lang || "es-ES",
      rate: lesson.audio?.default_rate || 0.9
    });
  });

  document.querySelector("#stop-lesson-button")?.addEventListener("click", () => {
    window.SpanishClawAudio.stop();
  });

  document.querySelectorAll(".sentence-play-button").forEach((button) => {
    button.addEventListener("click", () => {
      window.SpanishClawAudio.speak(button.dataset.sentenceText);
    });
  });

  document.querySelectorAll(".token-clickable").forEach((token) => {
    token.addEventListener("click", (event) => {
      event.stopPropagation();
      selectEntry(token.dataset.entryKey, token);
    });
  });

  document.querySelectorAll(".sentence").forEach((sentence) => {
    sentence.addEventListener("click", () => {
      selectEntry(sentence.dataset.entryKey, sentence);
    });
    sentence.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectEntry(sentence.dataset.entryKey, sentence);
      }
    });
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderSavedList(filter = "all") {
  const container = document.querySelector("#saved-list");
  if (!container) return;

  const favorites = getFavorites();
  const visible = filter === "all"
    ? favorites
    : favorites.filter((item) => item.type === filter);

  if (!visible.length) {
    container.innerHTML = `
      <div class="empty-list">
        <h2>还没有收藏内容</h2>
        <p>去 Lesson 页面点击单词或句子，把重要内容收藏下来。</p>
        <a class="primary-button" href="/lesson">Open Lesson</a>
      </div>
    `;
    return;
  }

  container.innerHTML = visible.map((item) => `
    <article class="saved-item">
      <div>
        <p class="tag">${item.type === "sentence" ? "Sentence" : "Word"} · ${item.sourceLessonTitle}</p>
        <h2>${item.text}</h2>
        <p>${item.translation}</p>
        <p class="muted">${formatDate(item.createdAt)}</p>
      </div>
      <div class="saved-actions">
        <a class="text-link" href="/lesson/${item.sourceLessonId}">Back to Lesson</a>
        <button class="danger-button" type="button" data-delete-id="${item.id}">删除</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = getFavorites().filter((item) => item.id !== button.dataset.deleteId);
      saveFavorites(next);
      showToast("已删除收藏");
      renderSavedList(filter);
    });
  });
}

function setupSavedPage() {
  const toolbar = document.querySelector(".saved-toolbar");
  if (!toolbar) return;

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;

    toolbar.querySelectorAll(".filter-button").forEach((item) => {
      item.classList.remove("active");
    });
    button.classList.add("active");
    renderSavedList(button.dataset.filter);
  });

  renderSavedList();
}

document.addEventListener("DOMContentLoaded", () => {
  setupLessonPage();
  setupSavedPage();
});
