/* =========================
   SPEECH — Web Speech API
   Text-to-Speech per bahasa
   ========================= */

const Speech = {
  supported: 'speechSynthesis' in window,
  voices: [],
  ready: false,

  // Map kode bahasa aplikasi → kode BCP-47
  langMap: {
    'zh-hsk1':  'zh-CN',
    'ja-n5':    'ja-JP',
    'ru-a1':    'ru-RU',
    'en-toefl': 'en-US',
    'th-a1':    'th-TH',
    'de-a1':    'de-DE'
  },

  init() {
    if (!this.supported) {
      console.warn('Web Speech API tidak didukung browser ini.');
      return;
    }

    const load = () => {
      this.voices = window.speechSynthesis.getVoices() || [];
      this.ready = this.voices.length > 0;
    };

    load();
    window.speechSynthesis.onvoiceschanged = load;
  },

  pickVoice(langCode) {
    const target = this.langMap[langCode] || 'en-US';
    const prefix = target.split('-')[0].toLowerCase();

    // 1. Exact match
    const exact = this.voices.find(
      v => v.lang.replace('_', '-').toLowerCase() === target.toLowerCase()
    );
    if (exact) return exact;

    // 2. Prefix match (zh, ja, ru, en, th, de)
    const pref = this.voices.find(
      v => v.lang.toLowerCase().startsWith(prefix)
    );
    if (pref) return pref;

    // 3. Branded voice (Google / Microsoft / Apple)
    const branded = this.voices.find(
      v => v.lang.toLowerCase().startsWith(prefix) &&
           /google|microsoft|apple|siri/i.test(v.name)
    );
    if (branded) return branded;

    return null;
  },

  speak(text, langCode, onStart, onEnd) {
    if (!this.supported) {
      if (onEnd) onEnd();
      return;
    }

    if (!text) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const targetLang = this.langMap[langCode] || 'en-US';
    u.lang = targetLang;

    const voice = this.pickVoice(langCode);
    if (voice) {
      u.voice = voice;
    } else {
      console.warn(`Voice untuk ${langCode} tidak ada, pakai default.`);
    }

    u.rate = 0.9;
    u.pitch = 1;
    u.volume = 1;

    if (onStart) u.onstart = onStart;
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }

    window.speechSynthesis.speak(u);
  },

  stop() {
    if (this.supported) window.speechSynthesis.cancel();
  },

  // Utility: cek voice tersedia untuk bahasa tertentu
  hasVoiceFor(langCode) {
    return !!this.pickVoice(langCode);
  },

  // Utility: list voice untuk debug
  listVoices() {
    return this.voices.map(v => `${v.lang} — ${v.name}`);
  }
};