const FAVORITES_KEY = "spanish-claw:favorites";
const AUDIO_RATES = {
  normal: 1.0,
  slow: 0.7,
  fast: 1.2
};

let activeAudioElement = null;

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
    showToast("已取消保存");
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
  showToast("已保存");
  return true;
}

function escapeHtml(value) {
  return (value ?? "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stopLessonAudio() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }

  window.SpanishClawAudio?.stop();
}

function speakSpanish(text, rate = AUDIO_RATES.normal) {
  const cleanText = (text || "").trim();
  if (!cleanText) return;

  stopLessonAudio();
  window.SpanishClawAudio?.speak(cleanText, {
    lang: "es-ES",
    rate
  });
}

function speakText(text, lang = "es-ES", rate = 1) {
  const cleanText = (text || "").trim();
  if (!cleanText || !window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") return;

  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance();
  utterance.text = cleanText;
  utterance.lang = lang;
  utterance.rate = rate;

  const voices = speechSynthesis.getVoices();
  const matchedVoice = voices.find((voice) => voice.lang === lang || voice.lang.startsWith(`${lang}-`));
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  speechSynthesis.speak(utterance);
}

function normalizeAudioSource(source) {
  if (!source) return "";
  if (typeof HTMLAudioElement !== "undefined" && source instanceof HTMLAudioElement) {
    return source.currentSrc || source.src || "";
  }
  if (typeof source === "string") return source;
  if (Array.isArray(source)) return normalizeAudioSource(source[0]);
  return source.src || source.url || source.normal || source.file || "";
}

function playAudioSource(source, rate, fallbackText) {
  if (typeof HTMLAudioElement !== "undefined" && source instanceof HTMLAudioElement) {
    stopLessonAudio();
    activeAudioElement = source;
    source.pause();
    source.currentTime = 0;
    source.playbackRate = rate;
    source.play().catch(() => speakSpanish(fallbackText, rate));
    return;
  }

  const audioSource = normalizeAudioSource(source);
  if (!audioSource) {
    speakSpanish(fallbackText, rate);
    return;
  }

  stopLessonAudio();
  const audio = new Audio(audioSource);
  activeAudioElement = audio;
  audio.playbackRate = rate;

  audio.addEventListener("error", () => {
    if (activeAudioElement === audio) {
      activeAudioElement = null;
    }
    speakSpanish(fallbackText, rate);
  }, { once: true });

  audio.addEventListener("ended", () => {
    if (activeAudioElement === audio) {
      activeAudioElement = null;
    }
  }, { once: true });

  audio.play().catch(() => {
    if (activeAudioElement === audio) {
      activeAudioElement = null;
    }
    speakSpanish(fallbackText, rate);
  });
}

function getEntryAudioText(entry) {
  return entry.audio_text || entry.spanish_text || entry.text || "";
}

function getEntryAudioSource(entry) {
  return normalizeAudioSource(entry.audio?.normal || entry.audio_url || entry.audio_src || entry.audio);
}

function playEntryAudio(entry, rate = AUDIO_RATES.normal) {
  playAudioSource(getEntryAudioSource(entry), rate, getEntryAudioText(entry));
}

function getFullLessonText(lesson) {
  const lines = lesson.transcript || lesson.sentences || [];
  return lesson.audio?.tts_text || lines.map((line) => line.spanish || line.text).join(" ");
}

function getFullLessonAudioSource(lesson) {
  const audioPlayer = document.querySelector("[data-full-lesson-audio], .audio-player");
  if (audioPlayer?.currentSrc || audioPlayer?.src) {
    return audioPlayer;
  }

  const fullLesson = lesson.audio?.full_lesson;
  if (typeof fullLesson === "string") return fullLesson;
  if (!fullLesson || typeof fullLesson !== "object") return "";

  return normalizeAudioSource(
    fullLesson.teacher_mode ||
    fullLesson.lucia_voice ||
    fullLesson.diego_voice ||
    Object.values(fullLesson)[0]
  );
}

function playFullLesson(lesson, rate = AUDIO_RATES.normal) {
  playAudioSource(getFullLessonAudioSource(lesson), rate, getFullLessonText(lesson));
}

function renderList(items) {
  return items && items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="muted">暂无</p>`;
}

function renderInlineList(items) {
  return items && items.length ? items.map(escapeHtml).join(" / ") : "-";
}

function renderDefaultLessonItems(items) {
  return items && items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="muted">No items yet.</p>`;
}

function renderWordCard(entry, lesson) {
  const favorite = isFavorite(entry, lesson.id);
  const spanishExpression = entry.spanish_text || entry.text || entry.key || "-";
  const englishExpression = entry.english_text || entry.english || entry.translation_en || "-";
  const structureNote = entry.structure_note || entry.structure_hint_en || "-";

  return `
    <p class="section-kicker">Expression Card</p>
    <div class="card-heading">
      <div>
        <h2>${escapeHtml(entry.text || spanishExpression)}</h2>
        <p>${escapeHtml(entry.translation || "中文释义可继续补充")}</p>
      </div>
      <span class="pill">${escapeHtml(entry.pos || entry.type || "expression")}</span>
    </div>
    <dl class="field-grid">
      <div><dt>西语表达</dt><dd>${escapeHtml(spanishExpression)}</dd></div>
      <div><dt>English</dt><dd>${escapeHtml(englishExpression)}</dd></div>
      <div><dt>中文释义</dt><dd>${escapeHtml(entry.translation || "-")}</dd></div>
      <div><dt>结构说明</dt><dd>${escapeHtml(structureNote)}</dd></div>
      <div><dt>原形</dt><dd>${escapeHtml(entry.lemma || "-")}</dd></div>
      <div><dt>变位说明</dt><dd>${escapeHtml(entry.conjugation || "-")}</dd></div>
      <div><dt>一般表达</dt><dd>${escapeHtml(entry.common_usage || "-")}</dd></div>
      <div><dt>地道表达</dt><dd>${escapeHtml(entry.native_usage || "-")}</dd></div>
      <div><dt>例句</dt><dd>${escapeHtml(entry.example || "-")}</dd></div>
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
    <button class="secondary-button card-audio-button" type="button" data-action="play-entry-normal">
      Play Normal
    </button>
    <button class="secondary-button card-audio-button" type="button" data-action="play-entry-slow">
      Play Slow
    </button>
    <button class="save-button" type="button" data-action="favorite">
      ${favorite ? "Saved" : "Save"}
    </button>
  `;
}

function renderSentenceCard(entry, lesson) {
  const favorite = isFavorite(entry, lesson.id);
  const speechText = entry.spanish || entry.spanish_text || entry.text || "";
  return `
    <p class="section-kicker">Sentence Card</p>
    <div class="card-heading">
      <div>
        <h2>${escapeHtml(entry.text)}</h2>
        <p>${escapeHtml(entry.translation || "-")}</p>
      </div>
      <span class="pill">sentence</span>
    </div>
    <dl class="field-grid">
      <div><dt>English</dt><dd>${escapeHtml(entry.english_text || entry.translation || "-")}</dd></div>
      <div><dt>中文释义</dt><dd>${escapeHtml(entry.translation_zh || "-")}</dd></div>
      <div><dt>结构说明</dt><dd>${escapeHtml(entry.structure_note || "-")}</dd></div>
      <div><dt>口语表达</dt><dd>${escapeHtml(entry.natural_expression || "-")}</dd></div>
      <div><dt>Pronunciation</dt><dd>${escapeHtml(entry.pronunciation_prompt || "可进入 Pronunciation 模块继续练习。")}</dd></div>
    </dl>
    <button class="secondary-button card-audio-button" type="button" data-action="play-entry">
      Play Sentence
    </button>
    <button class="secondary-button speech-normal-btn" type="button" data-speech-text="${escapeHtml(speechText)}">
      Play Normal
    </button>
    <button class="secondary-button speech-slow-btn" type="button" data-speech-text="${escapeHtml(speechText)}">
      Play Slow
    </button>
    <button class="save-button" type="button" data-action="favorite">
      ${favorite ? "Saved" : "Save"}
    </button>
    <a class="secondary-button card-audio-button" href="/pronunciation">
      Go to Pronunciation
    </a>
  `;
}

function renderDefaultLessonCard(lesson) {
  const keywords = lesson.keywords || [];
  const grammarPoints = lesson.grammar_points_en || lesson.grammar_points || [];
  const summary = lesson.summary_en || lesson.summary;

  return `
    <p class="section-kicker">Lesson Summary</p>
    <h2>${escapeHtml(lesson.scene || lesson.title || "Current Lesson")}</h2>
    <p>${escapeHtml(summary || "Start with the full lesson, then click words or sentences to explore details.")}</p>
    <dl class="field-grid">
      <div>
        <dt>Keywords</dt>
        <dd>${renderDefaultLessonItems(keywords)}</dd>
      </div>
      <div>
        <dt>Grammar Points</dt>
        <dd>${renderDefaultLessonItems(grammarPoints)}</dd>
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,¿?¡!:;]+$/g, "");
}

function keyVariants(value) {
  const normalized = normalizeKey(value);
  const hyphen = normalized.replace(/[\s_]+/g, "-");
  const underscore = normalized.replace(/[\s-]+/g, "_");
  const compact = normalized.replace(/[\s_-]+/g, "");

  return Array.from(new Set([
    value,
    normalized,
    hyphen,
    underscore,
    compact,
    `word-${hyphen}`,
    `word-${underscore}`,
    `sentence-${hyphen}`,
    `sentence-${underscore}`
  ].filter(Boolean)));
}

function findVocabEntry(entries, key) {
  return keyVariants(key).map((variant) => entries[variant]).find(Boolean) || null;
}

function getLineClickableItems(line) {
  return line && Array.isArray(line.clickable_items) ? line.clickable_items : [];
}

function findTranscriptLine(lesson, key) {
  const normalizedKey = normalizeKey(key);
  const transcript = lesson.transcript || [];
  const sentences = lesson.sentences || [];

  return transcript.find((line) => line.id === key || normalizeKey(line.id) === normalizedKey)
    || sentences.find((line) => line.sentence_id === key || line.insight_key === key)
    || null;
}

function findClickableItemContext(lesson, key) {
  const variants = keyVariants(key).map(normalizeKey);

  for (const line of lesson.transcript || []) {
    const item = getLineClickableItems(line).find((candidate) => {
      return [
        candidate.id,
        candidate.vocab_key,
        candidate.spanish_text,
        candidate.english_text
      ].some((value) => value && variants.includes(normalizeKey(value)));
    });

    if (item) {
      return { item, line };
    }
  }

  return null;
}

function createFallbackWordEntry(key) {
  return {
    key,
    type: "word",
    text: key,
    audio_text: key,
    spanish_text: key,
    english_text: "-",
    translation: "这个词条已可点击，中文释义可继续补充到 vocab.json。",
    pos: "word",
    lemma: "-",
    conjugation: "-",
    structure_note: "-",
    common_usage: "结合当前句子理解这个词。",
    native_usage: "后续可补充更自然的表达差异。",
    example: "-",
    synonyms: [],
    antonyms: []
  };
}

function createClickableItemEntry(context, key) {
  const { item, line } = context;

  return {
    key: item.vocab_key || item.id || key,
    type: "word",
    text: item.spanish_text || key,
    audio_text: item.spanish_text || key,
    spanish_text: item.spanish_text || key,
    english_text: item.english_text || "-",
    translation: item.translation_zh || "这个词组的中文释义可继续补充到 vocab.json。",
    pos: item.type || "expression",
    lemma: "-",
    conjugation: "-",
    structure_note: line.structure_hint_en || "-",
    common_usage: line.english || "-",
    native_usage: "-",
    example: line.spanish || "-",
    synonyms: [],
    antonyms: []
  };
}

function mergeClickableItemContext(entry, context) {
  if (!context) return entry;

  const { item, line } = context;
  return {
    ...entry,
    spanish_text: entry.spanish_text || item.spanish_text,
    english_text: entry.english_text || item.english_text,
    structure_note: entry.structure_note || line.structure_hint_en,
    audio_text: entry.audio_text || item.spanish_text || entry.text
  };
}

function createSentenceEntry(line) {
  return {
    key: line.id || line.sentence_id || line.insight_key,
    type: "sentence",
    text: line.spanish || line.text,
    audio_text: line.spanish || line.audio_text || line.text,
    translation: line.english || line.translation || line.chinese,
    translation_zh: line.chinese_zh || "",
    english_text: line.english || line.translation || "",
    speaker: line.speaker_label_en || line.speaker,
    line_type: line.type,
    usage_scene: line.type === "narration"
      ? "Narration gives scene and action context."
      : `${line.speaker_label_en || line.speaker || "Speaker"} uses this as natural dialogue.`,
    structure_note: line.structure_hint_en || "Read it as a full sentence in context.",
    natural_expression: line.spanish || line.text,
    alternatives: [],
    pronunciation_prompt: "Play the sentence first, then imitate its rhythm and pauses."
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
  const clickableContext = findClickableItemContext(data.lesson, key);
  const vocabEntry = findVocabEntry(data.entries || {}, key);
  const entry = vocabEntry
    ? mergeClickableItemContext(vocabEntry, clickableContext)
    : clickableContext
      ? createClickableItemEntry(clickableContext, normalizedKey || key)
      : transcriptLine
        ? createSentenceEntry(transcriptLine)
        : createFallbackWordEntry(normalizedKey || key);
  const panel = document.querySelector("#insight-card");

  if (!panel) return;

  clearSelected();
  trigger?.classList.add("selected");
  panel.className = "insight-card";
  panel.innerHTML =
    entry.type === "sentence"
      ? renderSentenceCard(entry, data.lesson)
      : renderWordCard(entry, data.lesson);

  const saveButton = panel.querySelector('[data-action="favorite"]');
  const playButton = panel.querySelector('[data-action="play-entry"]');
  const playNormalButton = panel.querySelector('[data-action="play-entry-normal"]');
  const playSlowButton = panel.querySelector('[data-action="play-entry-slow"]');

  playButton?.addEventListener("click", () => {
    playEntryAudio(entry, AUDIO_RATES.normal);
  });

  playNormalButton?.addEventListener("click", () => {
    playEntryAudio(entry, AUDIO_RATES.normal);
  });

  playSlowButton?.addEventListener("click", () => {
    playEntryAudio(entry, AUDIO_RATES.slow);
  });

  saveButton?.addEventListener("click", () => {
    const saved = toggleFavorite(entry, data.lesson);
    saveButton.textContent = saved ? "Saved" : "Save";
  });
}

function replaceEnglishPhraseWithButton(lineElement, item) {
  if (!item.english_text || !item.vocab_key) return;

  const phrase = escapeHtml(item.english_text);
  const source = lineElement.innerHTML;
  if (!source.includes(phrase)) return;

  const button = `<button class="token token-clickable english-token-clickable" type="button" data-entry-key="${escapeHtml(item.vocab_key)}">${phrase}</button>`;
  lineElement.innerHTML = source.replace(phrase, button);
}

function setupEnglishClickTargets(lesson) {
  (lesson.transcript || []).forEach((line) => {
    const sentence = Array.from(document.querySelectorAll(".sentence")).find((element) => {
      return element.dataset.entryKey === line.id;
    });
    const block = sentence?.closest(".sentence-block");
    const englishLine = block?.querySelector(".translation-line");

    if (!englishLine || englishLine.dataset.clickableEnglish === "true") return;

    englishLine.innerHTML = escapeHtml(englishLine.textContent);
    getLineClickableItems(line).forEach((item) => {
      replaceEnglishPhraseWithButton(englishLine, item);
    });
    englishLine.dataset.clickableEnglish = "true";
  });
}

function setupWordClickHandlers() {
  document.querySelectorAll(".token-clickable").forEach((token) => {
    token.addEventListener("click", (event) => {
      event.stopPropagation();
      selectEntry(token.dataset.entryKey, token);
    });
  });
}

function setupLessonPage() {
  if (!window.SPANISH_CLAW_DATA) return;
  const lesson = window.SPANISH_CLAW_DATA.lesson;

  renderDefaultPanel(lesson);

  const insightCard = document.querySelector("#insight-card");
  insightCard?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const normalButton = target.closest(".speech-normal-btn");
    if (normalButton && insightCard.contains(normalButton)) {
      speakText(normalButton.dataset.speechText, "es-ES", 1);
      return;
    }

    const slowButton = target.closest(".speech-slow-btn");
    if (slowButton && insightCard.contains(slowButton)) {
      speakText(slowButton.dataset.speechText, "es-ES", 0.7);
    }
  });

  document.querySelector("#play-lesson-button")?.addEventListener("click", () => {
    playFullLesson(lesson, AUDIO_RATES.normal);
  });

  document.querySelector("#slow-lesson-button")?.addEventListener("click", () => {
    playFullLesson(lesson, AUDIO_RATES.slow);
  });

  document.querySelector("#stop-lesson-button")?.addEventListener("click", () => {
    stopLessonAudio();
  });

  document.querySelectorAll(".sentence-play-button").forEach((button) => {
    button.addEventListener("click", () => {
      speakSpanish(button.dataset.sentenceText, AUDIO_RATES.normal);
    });
  });

  setupEnglishClickTargets(lesson);
  setupWordClickHandlers();

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
        <h2>还没有保存内容</h2>
        <p>去 Lesson 页面点击西语或英语词组，把重要内容保存下来。</p>
        <a class="primary-button" href="/lesson">Open Lesson</a>
      </div>
    `;
    return;
  }

  container.innerHTML = visible.map((item) => `
    <article class="saved-item">
      <div>
        <p class="tag">${item.type === "sentence" ? "Sentence" : "Expression"} - ${escapeHtml(item.sourceLessonTitle)}</p>
        <h2>${escapeHtml(item.text)}</h2>
        <p>${escapeHtml(item.translation)}</p>
        <p class="muted">${formatDate(item.createdAt)}</p>
      </div>
      <div class="saved-actions">
        <a class="text-link" href="/lesson/${item.sourceLessonId}">Back to Lesson</a>
        <button class="danger-button" type="button" data-delete-id="${escapeHtml(item.id)}">删除</button>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = getFavorites().filter((item) => item.id !== button.dataset.deleteId);
      saveFavorites(next);
      showToast("已删除保存内容");
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
