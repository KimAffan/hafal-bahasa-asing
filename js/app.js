/* =========================
   APP — logika utama
   ========================= */

const App = {
  state: {
    lang: 'zh-hsk1',
    allCards: [],
    queue: [],
    current: null,
    flipped: false,
    sessionReviewed: 0,
    sessionTotal: 0,
    streak: 0,
    lastStudy: null,
    progress: {}
  },

  els: {},

  async init() {
    this.cacheEls();
    this.bindEvents();
    this.loadTheme();
    this.loadProgress();
    this.loadStreak();
    Speech.init();
    this.checkSpeechSupport();

    try {
      await this.switchLang(this.state.lang);
    } catch (err) {
      console.error(err);
      this.showError(err.message);
    }
  },

  cacheEls() {
    this.els = {
      body: document.body,
      langSelect: document.getElementById('lang-select'),
      themeToggle: document.getElementById('theme-toggle'),
      themeIcon: document.getElementById('theme-icon'),
      card: document.getElementById('card'),
      cardTag: document.getElementById('card-tag'),
      cardCount: document.getElementById('card-count'),
      word: document.getElementById('card-word'),
      reading: document.getElementById('card-reading'),
      meaning: document.getElementById('card-meaning'),
      flipHint: document.getElementById('flip-hint'),
      audioBtn: document.getElementById('audio-btn'),
      ratings: document.getElementById('ratings'),
      rateButtons: document.querySelectorAll('[data-rating]'),
      pos: document.getElementById('pos'),
      total: document.getElementById('total'),
      progressFill: document.getElementById('progress-fill'),
      statStreak: document.getElementById('stat-streak'),
      statLearned: document.getElementById('stat-learned'),
      statDue: document.getElementById('stat-due'),
      statSession: document.getElementById('stat-session'),
      resetBtn: document.getElementById('reset-btn'),
      shuffleBtn: document.getElementById('shuffle-btn'),
      restartBtn: document.getElementById('restart-btn'),
      downloadBtn: document.getElementById('download-btn'),
      doneScreen: document.getElementById('done-screen')
    };
  },

  bindEvents() {
    this.els.langSelect.addEventListener('change', (e) => this.switchLang(e.target.value));
    this.els.themeToggle.addEventListener('click', () => this.toggleTheme());
    this.els.card.addEventListener('click', () => this.reveal());
    this.els.audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playAudio();
    });

    this.els.rateButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rate(parseInt(btn.dataset.rating, 10));
      });
    });

    this.els.resetBtn.addEventListener('click', () => this.resetProgress());
    this.els.shuffleBtn.addEventListener('click', () => this.shuffleQueue());
    this.els.restartBtn.addEventListener('click', () => this.startSession());
    this.els.downloadBtn.addEventListener('click', () => this.downloadScore());

    document.addEventListener('keydown', (e) => this.onKey(e));
  },

  /* ---------- SPEECH ---------- */
  checkSpeechSupport() {
    if (!Speech.supported) {
      this.els.audioBtn.classList.add('unsupported');
      this.els.audioBtn.title = 'Browser tidak mendukung audio';
    }
  },

  playAudio() {
    const c = this.state.current;
    if (!c) return;

    if (!Speech.supported) {
      alert('Browser kamu tidak mendukung Web Speech API. Coba Chrome atau Edge.');
      return;
    }

    const voice = Speech.pickVoice(this.state.lang);
    if (!voice) {
      const langName = {
  'zh-hsk1':  'Mandarin',
  'ja-n5':    'Jepang',
  'ru-a1':    'Rusia',
  'en-toefl': 'Inggris',
  'th-a1':    'Thailand',
  'de-a1':    'Jerman'
}[this.state.lang] || this.state.lang;

      alert(
        `Voice ${langName} belum terinstall.\n\n` +
        `Solusi:\n` +
        `1. Buka di Microsoft Edge (paling gampang)\n` +
        `2. Atau install voice pack di Windows:\n` +
        `   Settings → Time & Language → Speech → Add voices`
      );
      return;
    }

    this.els.audioBtn.classList.add('playing');
    Speech.speak(
      c.word,
      this.state.lang,
      null,
      () => this.els.audioBtn.classList.remove('playing')
    );
  },

  /* ---------- THEME ---------- */
  loadTheme() {
    this.setTheme(localStorage.getItem('hafal:theme') || 'light');
  },

  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.els.themeIcon.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      this.els.themeIcon.textContent = '🌙';
    }
    localStorage.setItem('hafal:theme', theme);
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.setTheme(isDark ? 'light' : 'dark');
  },

  /* ---------- PROGRESS ---------- */
  loadProgress() {
    try {
      const raw = localStorage.getItem('hafal:progress');
      this.state.progress = raw ? JSON.parse(raw) : {};
    } catch {
      this.state.progress = {};
    }
  },

  saveProgress() {
    localStorage.setItem('hafal:progress', JSON.stringify(this.state.progress));
  },

  getLangProgress() {
    const lang = this.state.lang;
    if (!this.state.progress[lang]) this.state.progress[lang] = {};
    return this.state.progress[lang];
  },

  resetProgress() {
    if (!confirm('Reset semua progress untuk bahasa ini?')) return;
    this.state.progress[this.state.lang] = {};
    this.saveProgress();
    this.startSession();
  },

  /* ---------- STREAK ---------- */
  loadStreak() {
    const streak = parseInt(localStorage.getItem('hafal:streak') || '0', 10);
    this.state.streak = streak;
    this.state.lastStudy = localStorage.getItem('hafal:lastStudy');
    this.updateStreakDisplay();
  },

  recordStudy() {
    const today = new Date().toDateString();
    if (this.state.lastStudy === today) return;

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    this.state.streak = this.state.lastStudy === yesterday ? this.state.streak + 1 : 1;
    this.state.lastStudy = today;
    localStorage.setItem('hafal:streak', String(this.state.streak));
    localStorage.setItem('hafal:lastStudy', today);
    this.updateStreakDisplay();
  },

  updateStreakDisplay() {
    this.els.statStreak.textContent = this.state.streak || 0;
  },

  /* ---------- LANGUAGE ---------- */
  async switchLang(langCode) {
    Speech.stop();
    this.els.audioBtn.classList.remove('playing');

    this.state.lang = langCode;
    this.els.body.setAttribute('data-lang', langCode);

    this.state.allCards = await Data.load(langCode);
    this.updateStats();
    this.startSession();
  },

  /* ---------- SESSION ---------- */
  startSession() {
    const langProgress = this.getLangProgress();
    const now = Date.now();
    const due = [];
    const notDue = [];

    for (const card of this.state.allCards) {
      const s = langProgress[card._id];
      if (SRS.isDue(s, now)) due.push(card);
      else notDue.push(card);
    }

    this.shuffleArr(due);
    this.shuffleArr(notDue);

    this.state.queue = [...due, ...notDue];
    this.state.sessionReviewed = 0;
    this.state.sessionTotal = this.state.queue.length;

    this.els.doneScreen.classList.add('hidden');
    this.els.card.classList.remove('hidden');
    this.els.ratings.classList.remove('hidden');

    this.updateStats();
    this.nextCard();
  },

  shuffleQueue() {
    this.shuffleArr(this.state.queue);
    this.nextCard();
  },

  shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  },

  nextCard() {
    if (this.state.queue.length === 0) {
      this.showDone();
      return;
    }
    this.state.current = this.state.queue[0];
    this.state.flipped = false;
    this.renderCard();
    this.updateProgress();
  },

  renderCard() {
    const c = this.state.current;
    if (!c) return;

    const langProgress = this.getLangProgress();
    const srsState = langProgress[c._id];

    this.els.word.textContent = c.word;
    this.els.reading.textContent = c.reading || '';
    this.els.meaning.textContent = c.meaning || '';

    this.els.cardTag.textContent = SRS.isNew(srsState) ? 'BARU' : `REPS ${srsState.reps}`;
    this.els.cardCount.textContent = srsState ? `${srsState.reps}×` : '0×';

    this.els.card.classList.remove('revealed');
    this.els.ratings.classList.remove('active');

    Speech.stop();
    this.els.audioBtn.classList.remove('playing');
  },

  reveal() {
    if (this.state.flipped) return;
    this.state.flipped = true;
    this.els.card.classList.add('revealed');
    this.els.ratings.classList.add('active');
  },

  rate(rating) {
    if (!this.state.flipped) {
      this.reveal();
      return;
    }

    const card = this.state.current;
    if (!card) return;

    const langProgress = this.getLangProgress();
    const prevState = langProgress[card._id] || SRS.init();
    const newState = SRS.update(prevState, rating);

    langProgress[card._id] = newState;
    this.saveProgress();

    this.state.queue.shift();

    if (rating === 0) {
      const insertAt = Math.min(this.state.queue.length, 5);
      this.state.queue.splice(insertAt, 0, card);
      this.state.sessionTotal += 1;
    } else {
      this.state.sessionReviewed += 1;
    }

    this.recordStudy();
    this.updateStats();
    this.nextCard();
  },

  /* ---------- UI STATE ---------- */
  updateProgress() {
    const total = this.state.sessionTotal;
    const done = total - this.state.queue.length;
    const pos = Math.min(done + 1, total);

    this.els.pos.textContent = pos;
    this.els.total.textContent = total;

    const pct = total === 0 ? 0 : (done / total) * 100;
    this.els.progressFill.style.width = `${pct}%`;
  },

  updateStats() {
    const langProgress = this.getLangProgress();
    const now = Date.now();
    let learned = 0;
    let due = 0;

    for (const card of this.state.allCards) {
      const s = langProgress[card._id];
      if (s && s.reps > 0) learned++;
      if (SRS.isDue(s, now)) due++;
    }

    this.els.statLearned.textContent = learned;
    this.els.statDue.textContent = due;
    this.els.statSession.textContent = this.state.sessionReviewed;
  },

  showDone() {
    this.els.doneScreen.classList.remove('hidden');
    this.els.card.classList.add('hidden');
    this.els.ratings.classList.add('hidden');
    this.updateProgress();
  },

  showError(msg) {
    this.els.word.textContent = '⚠️';
    this.els.reading.textContent = '';
    this.els.meaning.textContent = msg;
    this.els.card.classList.add('revealed');
    this.els.ratings.classList.remove('active');
  },

  /* ---------- DOWNLOAD SCORE CARD ---------- */
  downloadScore() {
    const size = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bg = isDark ? '#09090b' : '#fafafa';
    const surface = isDark ? '#18181b' : '#ffffff';
    const fg = isDark ? '#fafafa' : '#18181b';
    const muted = isDark ? '#a1a1aa' : '#71717a';
    const border = isDark ? '#27272a' : '#e4e4e7';

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // ============ HEADER ============
    // Logo mark
    ctx.fillStyle = fg;
    roundRect(ctx, 80, 80, 90, 90, 22);
    ctx.fill();

    ctx.fillStyle = bg;
    ctx.font = 'bold 56px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', 80 + 45, 80 + 48);

    // Brand name
    ctx.fillStyle = fg;
    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Hafal', 190, 125);

    // Date (top right)
    ctx.fillStyle = muted;
    ctx.font = '500 22px Inter, sans-serif';
    ctx.textAlign = 'right';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    ctx.fillText(dateStr, size - 80, 125);

    // Divider
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 220);
    ctx.lineTo(size - 80, 220);
    ctx.stroke();

    // ============ LANGUAGE ============
    ctx.fillStyle = muted;
    ctx.font = '600 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('BAHASA', size / 2, 300);

    ctx.fillStyle = fg;
    ctx.font = 'bold 64px Inter, sans-serif';
    const langName = this.els.langSelect.options[this.els.langSelect.selectedIndex].text;
    ctx.fillText(langName, size / 2, 380);

    // ============ STATS GRID ============
    const stats = [
      { label: 'STREAK', value: this.state.streak || 0 },
      { label: 'DIKUASAI', value: this.els.statLearned.textContent },
      { label: 'REVIEW', value: this.els.statDue.textContent },
      { label: 'SESI', value: this.state.sessionReviewed }
    ];

    const cardW = 400;
    const cardH = 180;
    const gap = 40;
    const totalW = cardW * 2 + gap;
    const startX = (size - totalW) / 2;
    const startY = 460;

    stats.forEach((s, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      // Card bg
      ctx.fillStyle = surface;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, cardW, cardH, 28);
      ctx.fill();
      ctx.stroke();

      // Value
      ctx.fillStyle = fg;
      ctx.font = 'bold 84px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s.value), x + cardW / 2, y + cardH / 2 - 12);

      // Label
      ctx.fillStyle = muted;
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(s.label, x + cardW / 2, y + cardH - 30);
    });

    // ============ FOOTER ============
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.moveTo(80, size - 140);
    ctx.lineTo(size - 80, size - 140);
    ctx.stroke();

    ctx.fillStyle = muted;
    ctx.font = '500 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Belajar bahasa gratis di Hafal', size / 2, size - 85);

    // ============ DOWNLOAD ============
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.download = `hafal-${this.state.lang}-${date}.png`;
      a.href = url;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  },

  /* ---------- KEYBOARD ---------- */
  onKey(e) {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      this.playAudio();
      return;
    }

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      this.reveal();
      return;
    }

    if (!this.state.flipped) return;
    const map = { '1': 0, '2': 1, '3': 2, '4': 3 };
    if (map[e.key] !== undefined) this.rate(map[e.key]);
  }
};

/* ---------- CANVAS HELPER ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- BOOT ---------- */
document.addEventListener('DOMContentLoaded', () => App.init());