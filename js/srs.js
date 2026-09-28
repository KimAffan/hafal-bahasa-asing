/* =========================
   SRS — Spaced Repetition System
   Varian SM-2 sederhana
   ========================= */

const SRS = {
  MINUTE: 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,

  init() {
    return {
      ease: 2.5,
      interval: 0,
      due: 0,
      reps: 0,
      lapses: 0,
      lastReview: 0
    };
  },

  /**
   * rating: 0 = Lupa, 1 = Susah, 2 = Bagus, 3 = Gampang
   */
  update(state, rating) {
    const now = Date.now();
    const s = { ...state };
    s.lastReview = now;

    if (rating === 0) {
      s.lapses += 1;
      s.reps = 0;
      s.interval = 0;
      s.ease = Math.max(1.3, s.ease - 0.20);
      s.due = now + this.MINUTE;
      return s;
    }

    s.reps += 1;

    if (rating === 1) s.ease = Math.max(1.3, s.ease - 0.15);
    else if (rating === 3) s.ease = Math.min(2.8, s.ease + 0.15);

    if (s.reps === 1) s.interval = 1;
    else if (s.reps === 2) s.interval = 6;
    else s.interval = Math.round(s.interval * s.ease);

    if (rating === 1) s.interval = Math.max(1, Math.round(s.interval * 0.8));

    s.due = now + s.interval * this.DAY;
    return s;
  },

  isDue(state, now = Date.now()) {
    if (!state) return true;
    return state.due <= now;
  },

  isNew(state) {
    return !state || state.reps === 0;
  },

  humanInterval(state) {
    if (!state) return 'baru';
    if (state.interval === 0) return '<1 mnt';
    if (state.interval === 1) return '1 hari';
    if (state.interval < 30) return `${state.interval} hari`;
    const months = Math.round(state.interval / 30);
    return `${months} bln`;
  }
};