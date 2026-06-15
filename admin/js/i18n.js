// ════════════════════════════════════════════════════════════════
//  i18n.js — Internacionalización de la interfaz de administración
//  Base: Español (hardcoded en HTML).
//  Traducciones: ficheros JSON en languages/interface/<code>.json
// ════════════════════════════════════════════════════════════════

const I18N = {
  lang:    'es',
  strings: {},

  // ── Inicializar: detectar o leer preferencia guardada ─────────
  async init() {
    const stored   = localStorage.getItem('nd_lang_ui');
    const detected = (navigator.language || navigator.userLanguage || 'es').split('-')[0].toLowerCase();
    const preferred = stored || detected;
    await this.load(preferred);
    this.apply();
    this._updateSelector();
  },

  // ── Cargar fichero de traducción ──────────────────────────────
  async load(lang) {
    if (!lang || lang === 'es') {
      this.lang    = 'es';
      this.strings = {};
      localStorage.setItem('nd_lang_ui', 'es');
      return true;
    }
    try {
      const res = await fetch(`languages/interface/${lang}.json?v=${Date.now()}`);
      if (!res.ok) throw new Error('not found');
      const data = await res.json();
      this.strings = data;
      this.lang    = lang;
      localStorage.setItem('nd_lang_ui', lang);
      return true;
    } catch {
      // Idioma no disponible → inglés → español
      if (lang !== 'en') {
        return await this.load('en');
      }
      this.strings = {};
      this.lang    = 'es';
      localStorage.setItem('nd_lang_ui', 'es');
      return false;
    }
  },

  // ── Obtener cadena traducida ──────────────────────────────────
  t(key, fallback) {
    return this.strings[key] || fallback || key;
  },

  // ── Aplicar todas las traducciones al DOM ─────────────────────
  apply() {
    if (!Object.keys(this.strings).length) return; // español base: no hacer nada
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = this.strings[key];
      if (!val) return;
      // Preservar nodos hijo (emojis en spans, etc.)
      if (el.children.length === 0) {
        el.textContent = val;
      } else {
        // Actualizar solo nodos de texto directos
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = val + ' ';
          }
        });
      }
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const val = this.strings[el.dataset.i18nPh];
      if (val) el.placeholder = val;
    });
    // Títulos (title attribute)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const val = this.strings[el.dataset.i18nTitle];
      if (val) el.title = val;
    });
  },

  // ── Cambiar idioma manualmente ────────────────────────────────
  async setLang(lang) {
    await this.load(lang);
    this.apply();
    this._updateSelector();
    toast(lang === 'es' ? 'Idioma: Español' : (this.strings['_name'] || lang));
  },

  // ── Sincronizar el <select> del panel ────────────────────────
  _updateSelector() {
    const sel = document.getElementById('cfg-lang-ui');
    if (sel) sel.value = this.lang;
  },

  // ── Cargar lista de idiomas disponibles desde el servidor ─────
  async loadAvailableLangs() {
    try {
      const r = await api.call('list-ui-langs');
      return r.langs || [];
    } catch {
      return [{ code: 'es', name: 'Español', native: 'Español' }];
    }
  },

  // ── Renderizar selector de idioma de interfaz ─────────────────
  async renderLangSelector() {
    const wrap = document.getElementById('cfg-lang-ui-wrap');
    if (!wrap) return;
    const langs = await this.loadAvailableLangs();
    const sel   = document.getElementById('cfg-lang-ui');
    if (!sel) return;
    sel.innerHTML = langs.map(l =>
      `<option value="${escH(l.code)}">${escH(l.native)} (${escH(l.code)})</option>`
    ).join('');
    sel.value = this.lang;
  },
};
