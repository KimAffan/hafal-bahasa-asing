/* =========================
   DATA — load & cache JSON
   ========================= */

const Data = {
  _cache: {},

  async load(langCode) {
    if (this._cache[langCode]) return this._cache[langCode];

    const res = await fetch(`./data/${langCode}.json`);
    if (!res.ok) {
      throw new Error(`Gagal memuat data/${langCode}.json (status ${res.status})`);
    }
    const cards = await res.json();

    if (!Array.isArray(cards)) {
      throw new Error(`Format ${langCode}.json tidak valid`);
    }

    cards.forEach((c, i) => {
      c._id = `${langCode}:${c.word}`;
      c._index = i;
    });

    this._cache[langCode] = cards;
    return cards;
  },

  clearCache() {
    this._cache = {};
  }
};