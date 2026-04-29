(function () {
  const state = {
    voices: [],
    selects: []
  };

  function getSpanishVoices() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    return voices.filter((voice) => voice.lang && voice.lang.toLowerCase().startsWith("es"));
  }

  function getFallbackVoices() {
    return window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  }

  function getVoices() {
    const spanishVoices = getSpanishVoices();
    return spanishVoices.length ? spanishVoices : getFallbackVoices();
  }

  function populateSelect(select) {
    const previous = select.value;
    select.innerHTML = "";

    const voices = getVoices();
    state.voices = voices;

    if (!voices.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "浏览器默认声音";
      select.appendChild(option);
      return;
    }

    voices.forEach((voice, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${voice.name} · ${voice.lang}`;
      select.appendChild(option);
    });

    if (previous && select.querySelector(`option[value="${previous}"]`)) {
      select.value = previous;
    }
  }

  function initVoiceSelects() {
    if (!window.speechSynthesis) return;

    state.selects = Array.from(document.querySelectorAll("[data-audio-voice]"));
    state.selects.forEach(populateSelect);

    window.speechSynthesis.onvoiceschanged = () => {
      state.selects.forEach(populateSelect);
    };
  }

  function getSelectedVoice() {
    const activeSelect = document.querySelector("[data-audio-voice]");
    if (!activeSelect) return null;
    return state.voices[Number(activeSelect.value)] || null;
  }

  function speak(text, options = {}) {
    if (!window.speechSynthesis) {
      window.dispatchEvent(new CustomEvent("spanish-claw-toast", {
        detail: "当前浏览器不支持语音播放"
      }));
      return;
    }

    const cleanText = (text || "").trim();
    if (!cleanText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = options.lang || "es-ES";
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;

    const voice = options.voice || getSelectedVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || utterance.lang;
    }

    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  window.SpanishClawAudio = {
    initVoiceSelects,
    speak,
    stop,
    getSelectedVoice
  };

  document.addEventListener("DOMContentLoaded", () => {
    initVoiceSelects();

    const audio = document.querySelector(".audio-player");
    if (!audio) return;

    audio.addEventListener("error", () => {
      const notice = document.createElement("p");
      notice.className = "audio-notice";
      notice.textContent = "音频文件只是 MVP 占位资源；如果无法加载，可使用上方浏览器语音播放继续演示。";
      audio.insertAdjacentElement("afterend", notice);
    }, { once: true });
  });
})();
