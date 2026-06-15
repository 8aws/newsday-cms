// ════════════════════════════════════════════════════════════════
//  modelar.js — Pestaña Modelar: header/footer global, temas,
//               idiomas de contenido y preview en Maquetar
// ════════════════════════════════════════════════════════════════

// ── Tipos de bloque disponibles en el canvas HF ───────────────
const BT_HF = [
  {t:'header',    ic:'▬',  lb:'Cabecera'},
  {t:'footer',    ic:'▬',  lb:'Pie'},
  {t:'nav',       ic:'☰',  lb:'Navegación'},
  {t:'image',     ic:'🖼', lb:'Imagen'},
  {t:'text',      ic:'T',  lb:'Texto'},
  {t:'separator', ic:'─',  lb:'Separador'},
  {t:'ad',        ic:'◻',  lb:'Anuncio'},
];

// ── Tabs internos de Modelar ──────────────────────────────────
function switchModTab(tab, btn) {
  document.querySelectorAll('.mod-tab').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.mod-panel').forEach(p => p.classList.remove('on'));
  if (btn) btn.classList.add('on');
  const panel = document.getElementById('mod-' + tab);
  if (panel) panel.classList.add('on');
  if (tab === 'temas'   && typeof loadThemes  === 'function') loadThemes();
  if (tab === 'favicon'                                     ) loadFavicon();
  if (tab === 'paginas' && typeof mpgRefresh  === 'function') mpgRefresh();
}

// ── Canvas Header / Footer ────────────────────────────────────
function renderHFCanvas(section) {
  const el = document.getElementById(section + '-canvas');
  if (!el) return;
  const blocks = S.siteConfig[section + 'Blocks'] || [];
  if (!blocks.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:20px">Sin bloques. Añade uno desde la paleta.</div>';
    return;
  }
  el.innerHTML = blocks.map((b, i) => {
    const btDef = BT_HF.find(x => x.t === b.t) || BT.find(x => x.t === b.t) || {ic:'?', lb: b.t};
    return buildHFBlockRow(section, b, i, btDef);
  }).join('');
}

function buildHFBlockRow(section, b, i, btDef) {
  let contentField;

  if (b.t === 'header' || b.t === 'footer') {
    // ── Bloque de identidad (logo + título + desc + promo en un solo bloque) ──
    const logoUrl    = escH(b.logoUrl   || '');
    const showTitle  = b.showTitle !== false;
    const desc       = escH(b.desc     || '');
    const promo      = escH(b.promo    || '');

    contentField = `
      <div class="hfb-brand-fields">
        <div class="hfb-brand-row">
          <label class="hfb-lbl">Logo</label>
          <input class="sinp hfb-inp" placeholder="URL imagen del logo (opcional)"
                 value="${logoUrl}"
                 onchange="updateHFBlock('${section}',${i},'logoUrl',this.value)">
          <button class="btn btn-ghost btn-sm" style="flex-shrink:0"
                  onclick="pickLogoForHF('${section}',${i})" title="Elegir del gestor de medios">🖼</button>
        </div>
        <div class="hfb-brand-row">
          <label class="hfb-lbl">
            <input type="checkbox" ${showTitle ? 'checked' : ''}
                   onchange="updateHFBlock('${section}',${i},'showTitle',this.checked)">
            Mostrar nombre del sitio
          </label>
        </div>
        <div class="hfb-brand-row">
          <label class="hfb-lbl">Descripción</label>
          <input class="sinp hfb-inp" placeholder="Eslogan o descripción breve…"
                 value="${desc}"
                 onchange="updateHFBlock('${section}',${i},'desc',this.value)">
        </div>
        <div class="hfb-brand-row">
          <label class="hfb-lbl">Promo</label>
          <input class="sinp hfb-inp" placeholder="Texto promocional (opcional)…"
                 value="${promo}"
                 onchange="updateHFBlock('${section}',${i},'promo',this.value)">
        </div>
      </div>`;

  } else if (b.t === 'nav') {
    contentField = `
      <span class="hfb-nav-hint">→ Los enlaces se configuran en
        <button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px"
                onclick="switchTab('organizar')">Organizar ↗</button>
      </span>`;

  } else if (b.t === 'image') {
    const imgUrl = escH(b.mediaUrl || '');
    contentField = `
      <div style="display:flex;align-items:center;gap:6px;flex:1">
        <input class="sinp" style="flex:1" placeholder="URL de imagen…"
               value="${imgUrl}"
               onchange="updateHFBlock('${section}',${i},'mediaUrl',this.value)">
        <button class="btn btn-ghost btn-sm" style="flex-shrink:0"
                onclick="pickImageForHF('${section}',${i})">🖼</button>
      </div>`;

  } else {
    // text, separator, ad
    const txt = escH(b.tx || '');
    contentField = `
      <input class="sinp" style="flex:1" placeholder="Texto/contenido…"
             value="${txt}"
             onchange="updateHFBlock('${section}',${i},'tx',this.value)">`;
  }

  const isBrand = (b.t === 'header' || b.t === 'footer');
  return `
    <div class="hfb-row ${isBrand ? 'hfb-row--brand' : ''}">
      <div class="hfb-row-head">
        <span class="hfb-icon">${btDef.ic}</span>
        <span class="hfb-label">${btDef.lb}</span>
        ${contentField && !isBrand ? contentField : ''}
        <div class="hfb-btns">
          <button class="btn btn-ghost btn-sm" onclick="moveHFBlock('${section}',${i},-1)">↑</button>
          <button class="btn btn-ghost btn-sm" onclick="moveHFBlock('${section}',${i},1)">↓</button>
        </div>
        <button class="btn btn-red btn-sm" onclick="removeHFBlock('${section}',${i})">✕</button>
      </div>
      ${isBrand ? contentField : ''}
    </div>`;
}

// ── Añadir bloque al canvas ───────────────────────────────────
function addHFBlock(section, type) {
  const key = section + 'Blocks';
  const newBlock = {t: type, tx: ''};
  // Inicializar campos del bloque de identidad
  if (type === 'header' || type === 'footer') {
    newBlock.logoUrl   = '';
    newBlock.showTitle = true;
    newBlock.desc      = '';
    newBlock.promo     = '';
  }
  S.siteConfig[key].push(newBlock);
  renderHFCanvas(section);
}

function removeHFBlock(section, i) {
  const key = section + 'Blocks';
  S.siteConfig[key].splice(i, 1);
  renderHFCanvas(section);
}

function moveHFBlock(section, i, dir) {
  const key    = section + 'Blocks';
  const blocks = S.siteConfig[key];
  const j      = i + dir;
  if (j < 0 || j >= blocks.length) return;
  [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  renderHFCanvas(section);
}

function updateHFBlock(section, i, field, val) {
  const key = section + 'Blocks';
  if (S.siteConfig[key][i]) S.siteConfig[key][i][field] = val;
}

// ── Selectores de imagen para bloques HF ─────────────────────
function pickLogoForHF(section, idx) {
  S.mediaContext  = 'hf-logo';
  S._hfPickSection = section;
  S._hfPickIdx     = idx;
  S._hfPickField   = 'logoUrl';
  document.getElementById('media-modal').classList.add('vis');
  filterMedia(S.mediaFilter || 'all', null);
  updateModalActions();
}

function pickImageForHF(section, idx) {
  S.mediaContext   = 'hf-image';
  S._hfPickSection = section;
  S._hfPickIdx     = idx;
  S._hfPickField   = 'mediaUrl';
  document.getElementById('media-modal').classList.add('vis');
  filterMedia(S.mediaFilter || 'all', null);
  updateModalActions();
}

// Hook llamado desde insertMedia() cuando el contexto es HF
function insertMediaForHF(m) {
  if (!m || !S._hfPickSection) return;
  updateHFBlock(S._hfPickSection, S._hfPickIdx, S._hfPickField, m.url || '');
  renderHFCanvas(S._hfPickSection);
  S.mediaContext = null;
  S._hfPickSection = null;
}

// ── Guardar pestaña Modelar ───────────────────────────────────
async function saveModelar() {
  const ok = await saveSiteConfig();
  const msg = document.getElementById('mod-save-msg');
  if (msg) {
    msg.textContent = ok ? '✓ Guardado' : '✗ Error';
    msg.style.color = ok ? '#16a34a' : '#dc2626';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  }
  if (ok) {
    toast('Diseño guardado');
    renderGlobalHFPreview();
  }
}

// ── Idiomas de contenido ──────────────────────────────────────
async function renderContentLangPicker() {
  const wrap = document.getElementById('content-lang-wrap');
  if (!wrap) return;
  try {
    const r      = await api.call('list-content-langs');
    const langs   = r.langs || [];
    const current = S.siteConfig?.contentLangs || ['es'];
    wrap.innerHTML = langs.map(l => {
      const checked   = current.includes(l.code) ? 'checked' : '';
      const isPrimary = current[0] === l.code;
      return `<label class="lang-check">
        <input type="checkbox" value="${escH(l.code)}" ${checked}
          onchange="gatherContentLangs()">
        <span>${escH(l.native)} <em style="color:#94a3b8;font-size:11px">(${escH(l.code)})</em></span>
        ${isPrimary ? '<span class="lang-primary-badge">principal</span>' : ''}
      </label>`;
    }).join('');
  } catch(e) {
    wrap.innerHTML = '<span style="color:#94a3b8;font-size:12px">Error cargando idiomas</span>';
  }
}

function gatherContentLangs() {
  const checks = document.querySelectorAll('#content-lang-wrap input[type=checkbox]:checked');
  const langs  = Array.from(checks).map(c => c.value);
  if (!langs.length) {
    const first = document.querySelector('#content-lang-wrap input[type=checkbox]');
    if (first) { first.checked = true; langs.push(first.value); }
  }
  S.siteConfig.contentLangs = langs;
  document.querySelectorAll('#content-lang-wrap label').forEach(lbl => {
    const inp   = lbl.querySelector('input');
    const badge = lbl.querySelector('.lang-primary-badge');
    if (badge) badge.remove();
    if (inp && inp.checked && langs[0] === inp.value) {
      const sp = document.createElement('span');
      sp.className = 'lang-primary-badge';
      sp.textContent = 'principal';
      lbl.appendChild(sp);
    }
  });
}

async function saveContentLangs() {
  gatherContentLangs();
  const ok  = await saveSiteConfig();
  const msg = document.getElementById('content-lang-msg');
  if (msg) {
    msg.textContent = ok ? '✓ Guardado' : '✗ Error';
    msg.style.color = ok ? '#16a34a' : '#dc2626';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  }
  if (ok) toast('Idioma de contenido guardado');
}

// ════════════════════════════════════════════════════════════════
//  GESTOR DE TEMAS
// ════════════════════════════════════════════════════════════════

async function loadThemes() {
  try {
    const data = await api.call('themes');
    S.themes = data.themes || [];
    renderThemePicker();
  } catch(e) { console.warn('loadThemes:', e); }
}

function renderThemePicker() {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;
  const themes  = S.themes || [];
  const current = S.siteConfig?.theme || 'newsday';
  if (!themes.length) {
    grid.innerHTML = '<div class="theme-loading">No se encontraron temas.</div>';
    return;
  }
  grid.innerHTML = themes.map(t => {
    const isActive = t.id === current;
    const p        = t.preview || {};
    const bodyBg   = escH(p.body   || '#f5f5f5');
    const hdrBg    = escH(p.header || '#333');
    const accentBg = escH(p.accent || '#5068e8');
    const builtin  = !!t.builtin;
    return `<div class="theme-card ${isActive ? 'theme-card--active' : ''}" onclick="selectTheme('${t.id}')">
      <div class="theme-swatch">
        <div class="ts-header" style="background:${hdrBg}"></div>
        <div class="ts-body"   style="background:${bodyBg}">
          <div class="ts-line" style="background:${accentBg};width:60%"></div>
          <div class="ts-line" style="background:rgba(0,0,0,.1)"></div>
          <div class="ts-line" style="background:rgba(0,0,0,.08);width:45%"></div>
        </div>
      </div>
      <div class="theme-info">
        <div class="theme-name">${escH(t.name)}</div>
        <div class="theme-desc">${escH(t.description || '')}</div>
      </div>
      ${isActive ? '<div class="theme-badge">✓ Activo</div>' : ''}
      <div class="theme-card-actions" onclick="event.stopPropagation()">
        <button class="tc-act tc-edit" onclick="openThemeEditor('${escH(t.id)}')">✏ Editar</button>
        ${!builtin ? `<button class="tc-act tc-del" onclick="deleteThemeConfirm('${escH(t.id)}','${escH(t.name)}')">🗑</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function selectTheme(id) {
  if (!S.siteConfig) S.siteConfig = {};
  if (S.siteConfig.theme === id) return;
  S.siteConfig.theme = id;
  renderThemePicker();
  try {
    const ok = await saveSiteConfig();
    if (ok) toast('Tema aplicado: ' + (S.themes.find(t => t.id === id)?.name || id));
  } catch(e) { toast('Error al guardar tema'); }
}

// ── Editor de temas ───────────────────────────────────────────

// Estado del editor
const TE = { id: null, builtin: false, varsMap: {} };

// Valores por defecto de las vars del tema Newsday
const TE_DEFAULTS = {
  '--th-header-bg':        '#12122a',
  '--th-header-fg':        '#ffffff',
  '--th-nav-bg':           '#1e293b',
  '--th-nav-fg':           '#94a3b8',
  '--th-footer-bg':        '#1e293b',
  '--th-footer-fg':        '#64748b',
  '--th-body-bg':          '#e8ebf0',
  '--th-wrap-bg':          '#ffffff',
  '--th-wrap-shadow':      '0 4px 32px rgba(0,0,0,.12)',
  '--th-text':             '#334155',
  '--th-heading':          '#0f172a',
  '--th-accent':           '#5068e8',
  '--th-accent-hover':     '#3d55d6',
  '--th-muted':            '#94a3b8',
  '--th-border':           '#e2e8f0',
  '--th-sidebar-bg':       '#f8fafc',
  '--th-sidebar-border':   '#e2e8f0',
  '--th-pullquote-bg':     '#eff6ff',
  '--th-pullquote-fg':     '#1d4ed8',
  '--th-pullquote-border': '#3b82f6',
  '--th-card-bg':          '#ffffff',
  '--th-card-border':      '#e2e8f0',
  '--th-tag-bg':           '#f1f5f9',
  '--th-tag-fg':           '#64748b',
  '--th-body-font':        'Georgia,serif',
  '--th-ui-font':          'system-ui,sans-serif',
  '--th-fallback-accent':  '#7c9ff5',
  '--th-img-radius':       '0',
  '--th-img-shadow':       'none',
  '--th-img-max-width':    '100%',
};

async function openThemeEditor(id) {
  const ed = document.getElementById('theme-editor');
  if (!ed) return;

  // Cargar datos del tema
  let data;
  if (id) {
    try { data = await api.call('get-theme&id=' + encodeURIComponent(id)); }
    catch(e) { toast('Error cargando tema'); return; }
  } else {
    // Nuevo tema: copiar valores por defecto
    data = {
      id: '', name: '', description: '',
      builtin: false,
      varsMap: {...TE_DEFAULTS},
    };
  }

  TE.id      = data.id || null;
  TE.builtin = !!data.builtin;
  TE.varsMap = Object.assign({}, TE_DEFAULTS, data.varsMap || {});

  // Título
  document.getElementById('te-title').textContent = id ? `Editando: ${data.name || id}` : 'Nuevo tema';
  document.getElementById('te-name').value = data.name || '';
  document.getElementById('te-id').value   = data.id   || '';
  document.getElementById('te-desc').value = data.description || '';

  // Bloquear ID y nombre en built-in (solo descripción editable)
  const nameInput = document.getElementById('te-name');
  const idInput   = document.getElementById('te-id');
  nameInput.readOnly = TE.builtin;
  idInput.readOnly   = !!TE.id; // no se puede cambiar el ID una vez creado

  // Botón eliminar
  const delBtn = document.getElementById('te-delete-btn');
  if (delBtn) delBtn.style.display = (!TE.builtin && TE.id) ? '' : 'none';

  // Rellenar controles
  ed.querySelectorAll('.te-color').forEach(inp => {
    const v = inp.dataset.var;
    inp.value = _hexFromVar(TE.varsMap[v] || TE_DEFAULTS[v] || '#000000');
    inp.oninput = () => { TE.varsMap[v] = inp.value; _applyPreview(); };
  });
  ed.querySelectorAll('.te-select').forEach(sel => {
    const v = sel.dataset.var;
    sel.value = TE.varsMap[v] || TE_DEFAULTS[v] || '';
    sel.onchange = () => { TE.varsMap[v] = sel.value; _applyPreview(); };
  });

  _applyPreview();
  ed.style.display = '';
  ed.scrollIntoView({behavior:'smooth', block:'start'});
}

function closeThemeEditor() {
  const ed = document.getElementById('theme-editor');
  if (ed) ed.style.display = 'none';
}

/** Convierte un color CSS (hex, rgb…) en valor hex para <input type=color> */
function _hexFromVar(val) {
  if (!val) return '#000000';
  val = val.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(val)) return val;
  if (/^#[0-9a-fA-F]{3}$/.test(val)) {
    const [,r,g,b] = val.match(/#(.)(.)(.)/);
    return '#' + r+r + g+g + b+b;
  }
  // rgb(r,g,b)
  const m = val.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return '#' + [m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,'0')).join('');
  return '#000000';
}

/** Aplica las vars actuales al preview en vivo */
function _applyPreview() {
  const prev = document.getElementById('te-preview');
  if (!prev) return;
  const styles = Object.entries(TE.varsMap)
    .map(([k,v]) => `${k}:${v}`)
    .join(';');
  prev.setAttribute('style', styles);
}

async function saveThemeEdits() {
  const name = document.getElementById('te-name').value.trim();
  let   id   = document.getElementById('te-id').value.trim().replace(/[^a-z0-9_-]/gi,'').toLowerCase();
  const desc = document.getElementById('te-desc').value.trim();

  if (!name) { toast('El nombre del tema es obligatorio'); return; }
  if (!TE.id && !id) {
    // Auto-generar ID desde el nombre
    id = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    document.getElementById('te-id').value = id;
  }

  const varsStr = Object.entries(TE.varsMap).map(([k,v]) => `${k}:${v}`).join(';') + ';';
  const vm = TE.varsMap;
  const preview = {
    header: vm['--th-header-bg'] || '#333',
    accent: vm['--th-accent']    || '#5068e8',
    body:   vm['--th-body-bg']   || '#f5f5f5',
  };

  try {
    const res = await api.post('save-theme', {
      id: TE.id || id, name, description: desc, vars: varsStr, preview,
    });
    if (res.ok) {
      TE.id = res.id;
      document.getElementById('te-id').value   = res.id;
      document.getElementById('te-title').textContent = `Editando: ${name}`;
      const delBtn = document.getElementById('te-delete-btn');
      if (delBtn) delBtn.style.display = '';
      toast('Tema guardado: ' + name);
      await loadThemes();
    } else {
      toast('Error: ' + (res.error || 'desconocido'));
    }
  } catch(e) { toast('Error al guardar el tema'); }
}

async function deleteThemeEditor() {
  if (!TE.id || TE.builtin) return;
  const name = document.getElementById('te-name').value || TE.id;
  if (!confirm(`¿Eliminar el tema «${name}»? Esta acción no se puede deshacer.`)) return;
  try {
    const res = await api.post('delete-theme', {id: TE.id});
    if (res.ok) {
      toast('Tema eliminado');
      closeThemeEditor();
      await loadThemes();
    } else {
      toast('Error: ' + (res.error || 'desconocido'));
    }
  } catch(e) { toast('Error al eliminar el tema'); }
}

async function deleteThemeConfirm(id, name) {
  if (!confirm(`¿Eliminar el tema «${name}»? Esta acción no se puede deshacer.`)) return;
  try {
    const res = await api.post('delete-theme', {id});
    if (res.ok) {
      toast('Tema eliminado');
      await loadThemes();
    } else {
      toast('Error: ' + (res.error || 'desconocido'));
    }
  } catch(e) { toast('Error al eliminar el tema'); }
}

/** Exporta el tema actual como descarga .php */
function exportTheme() {
  const name = document.getElementById('te-name').value.trim() || 'mi-tema';
  const id   = document.getElementById('te-id').value.trim()   || 'mi-tema';
  const desc = document.getElementById('te-desc').value.trim();
  const vm   = TE.varsMap;
  const varsStr = Object.entries(vm).map(([k,v]) => `${k}:${v}`).join(';') + ';';
  const preview = {
    header: vm['--th-header-bg'] || '#333',
    accent: vm['--th-accent']    || '#5068e8',
    body:   vm['--th-body-bg']   || '#f5f5f5',
  };
  const php = `<?php\n/**\n * Newsday — Tema: ${name}\n * Generado desde el panel · ${new Date().toISOString().slice(0,10)}\n */\nreturn [\n    'id'          => '${id}',\n    'name'        => '${name.replace(/'/g,"\\'")}',\n    'description' => '${desc.replace(/'/g,"\\'")}',\n    'preview'     => [\n        'header' => '${preview.header}',\n        'accent' => '${preview.accent}',\n        'body'   => '${preview.body}',\n    ],\n    'vars' => '${varsStr}',\n];\n`;
  const blob = new Blob([php], {type:'text/plain'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `${id}.php`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Sube un archivo .php de tema */
async function uploadThemeFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch('newsday-api.php?action=upload-theme', {
      method: 'POST', body: fd, credentials: 'same-origin',
    });
    const data = await res.json();
    if (data.ok) {
      toast('Tema subido: ' + data.name);
      await loadThemes();
    } else {
      toast('Error: ' + (data.error || 'archivo inválido'));
    }
  } catch(e) { toast('Error al subir el tema'); }
}

// ── Preview global header/footer en Maquetar ─────────────────
function renderGlobalHFPreview() {
  const hBlocks = S.siteConfig.headerBlocks || [];
  const fBlocks = S.siteConfig.footerBlocks || [];

  function blockBadges(blocks) {
    if (!blocks.length) return '<span class="hfp-empty">Sin bloques — configura en Modelar</span>';
    return blocks.map(b => {
      const btd = BT_HF.find(x => x.t === b.t) || BT.find(x => x.t === b.t) || {lb: b.t};
      let extra = '';
      if (b.t === 'header' || b.t === 'footer') {
        const parts = [];
        if (b.logoUrl)         parts.push('logo');
        if (b.showTitle !== false) parts.push('título');
        if (b.desc)            parts.push('desc');
        if (b.promo)           parts.push('promo');
        extra = parts.length ? ` · ${parts.join(', ')}` : '';
      } else if (b.tx) {
        extra = ` · ${escH(String(b.tx).slice(0, 20))}`;
      }
      return `<span class="hfp-block">${btd.lb}${extra}</span>`;
    }).join('');
  }

  const top = document.getElementById('maq-hf-top');
  const bot = document.getElementById('maq-hf-bottom');
  if (top) {
    top.style.display = '';
    top.innerHTML = `<span class="hfp-lbl">▲ Cabecera global</span>${blockBadges(hBlocks)}`;
  }
  if (bot) {
    bot.style.display = '';
    bot.innerHTML = `<span class="hfp-lbl">▼ Pie global</span>${blockBadges(fBlocks)}`;
  }
}

// ── Migración: bloques de identidad legados → header block ────
// Convierte bloques tipo site-logo/title/desc/promo en propiedades
// del bloque header más cercano, si los hay en la lista.
function migrateHFBlocks(blocks) {
  if (!blocks || !blocks.length) return blocks;
  const LEGACY = ['site-logo','site-title','site-desc','site-promo'];
  if (!blocks.some(b => LEGACY.includes(b.t))) return blocks; // nada que migrar

  const result = [];
  let pendingHeader = null;

  for (const b of blocks) {
    if (b.t === 'header' || b.t === 'footer') {
      // Inicializar campos si no los tiene
      if (!('logoUrl' in b)) {
        b.logoUrl   = '';
        b.showTitle = true;
        b.desc      = '';
        b.promo     = '';
      }
      result.push(b);
      pendingHeader = b;
    } else if (b.t === 'site-logo' && pendingHeader) {
      pendingHeader.logoUrl = b.mediaUrl || pendingHeader.logoUrl || '';
    } else if (b.t === 'site-title' && pendingHeader) {
      pendingHeader.showTitle = true;
    } else if (b.t === 'site-desc' && pendingHeader) {
      pendingHeader.desc = b.tx || pendingHeader.desc || '';
    } else if (b.t === 'site-promo' && pendingHeader) {
      pendingHeader.promo = b.tx || pendingHeader.promo || '';
    } else {
      result.push(b);
      if (b.t !== 'nav' && b.t !== 'separator') pendingHeader = null;
    }
  }
  return result;
}

// ════════════════════════════════════════════════════════════════
//  mpg* — Panel de Páginas en Modelar
// ════════════════════════════════════════════════════════════════

// Renderiza la lista lateral de páginas
function mpgRefresh() {
  const el = document.getElementById('mpg-list');
  if (!el) return;

  const pages = S.pages || [];
  if (!pages.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:16px;font-size:12px">Sin páginas todavía</div>';
    return;
  }

  el.innerHTML = pages.map(p => {
    const title = escH(p.title || p.slug || 'Sin título');
    const slug  = p.slug ? '/' + escH(p.slug) + '/' : '';
    const safe  = JSON.stringify(p).replace(/"/g, '&quot;');
    return `<div class="mpg-item" onclick="mpgOpenPage(${safe})">
      <div class="mpg-item-title">${title}</div>
      <div class="mpg-item-slug">${slug}</div>
    </div>`;
  }).join('');
}

// Crear nueva página y abrir builder
function mpgNewPage() {
  const p = { id: null, title: '', slug: '', content: '' };
  mpgOpenPage(p);
}

// Abrir el constructor en el panel #mpg-editor
function mpgOpenPage(p) {
  // Marcar item activo
  document.querySelectorAll('.mpg-item').forEach(el => el.classList.remove('on'));
  const items = document.querySelectorAll('.mpg-item');
  items.forEach(el => {
    if (el.querySelector('.mpg-item-title')?.textContent === (p.title || p.slug || 'Sin título')) {
      el.classList.add('on');
    }
  });

  // Redirigir el builder al contenedor mpg-editor en lugar del page-editor de Organizar
  _curPage = { ...p };

  // Usar el constructor visual si la página tiene builder activo o está vacía
  const ed = document.getElementById('mpg-editor');
  if (!ed) return;

  // Reemplazar temporalmente el destino de renderBuilder / renderPageEditor
  // para que apunten al panel de Modelar
  _mpgMode = true;
  openPageBuilder(p, 'mpg-editor');
}

// Flag de modo Modelar (usado por pagebuilder.js)
let _mpgMode = false;

// ════════════════════════════════════════════════════════════════
//  FAVICON — gestión de icono del sitio
// ════════════════════════════════════════════════════════════════

async function loadFavicon() {
  try {
    const state = await api.call('get-favicon');
    _favRenderState(state);
  } catch(e) {
    console.warn('loadFavicon:', e);
  }
}

function _favRenderState(state) {
  const noIcon  = document.getElementById('fav-no-icon');
  const sizes   = document.getElementById('fav-sizes');
  const fileList = document.getElementById('fav-files-list');

  if (!state?.set) {
    if (noIcon)  noIcon.style.display  = '';
    if (sizes)   sizes.style.display   = 'none';
    return;
  }

  if (noIcon)  noIcon.style.display  = 'none';
  if (sizes)   sizes.style.display   = '';

  const preview = state.preview || '';
  const ts      = Date.now();
  const bust    = preview + (preview.includes('?') ? '&' : '?') + 'cb=' + ts;

  ['fav-prev-browser','fav-prev-apple','fav-prev-pwa'].forEach(id => {
    const img = document.getElementById(id);
    if (img) img.src = bust;
  });

  if (fileList) {
    fileList.innerHTML = '<div class="fav-file-row">✓ favicon.ico · favicon-16x16.png · favicon-32x32.png · apple-touch-icon.png · icon-192.png · icon-512.png</div>';
  }
}

function favHandleDrop(e) {
  e.preventDefault();
  document.getElementById('fav-drop-zone')?.classList.remove('drag');
  const file = e.dataTransfer?.files?.[0];
  if (file) favHandleFile(file);
}

async function favHandleFile(file) {
  if (!file) return;
  const allowed = ['image/png','image/jpeg','image/webp','image/gif'];
  if (!allowed.includes(file.type)) {
    toast('Formato no soportado. Usa PNG, JPG o WEBP'); return;
  }

  const prog = document.getElementById('fav-progress');
  const dz   = document.getElementById('fav-drop-zone');
  if (prog) prog.style.display = '';
  if (dz)   dz.style.opacity   = '0.5';

  try {
    const fd = new FormData();
    fd.append('file', file);

    const r = await fetch(`newsday-api.php?action=save-favicon`, {
      method : 'POST',
      headers: { 'X-Token': S.token || '' },
      body   : fd,
    });
    const data = await r.json();

    if (!r.ok || data.error) throw new Error(data.error || 'Error desconocido');

    toast('✓ Favicon generado correctamente');
    await loadFavicon();
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
  } finally {
    if (prog) prog.style.display = 'none';
    if (dz)   dz.style.opacity   = '';
    // Limpiar input file para permitir resubir el mismo archivo
    const inp = document.getElementById('fav-file-input');
    if (inp) inp.value = '';
  }
}

async function favDelete() {
  if (!confirm('¿Eliminar el favicon del sitio?')) return;
  try {
    await api.post('delete-favicon', {});
    toast('Favicon eliminado');
    _favRenderState({ set: false });
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
  }
}
