// ════════════════════════════════════════════════════════════════
//  core.js — Constantes, estado global, API wrapper, autenticación
// ════════════════════════════════════════════════════════════════

const CELL_H  = 48;
const API_URL = 'newsday-api.php';

// ── Tipos de bloque (registro completo) ──────────────────────
// hfOnly:true  → solo aparece en el canvas de Modelar (no en palette de Maquetar)
// maqOnly:true → solo aparece en la palette de Maquetar  (no en canvas HF)
const BT = [
  // Bloques de área de contenido (palette de Maquetar)
  {t:'content',    ic:'✎',  lb:'Contenido',     dc:[8,8]},
  {t:'sidebar',    ic:'▥',  lb:'Lateral',       dc:[4,6]},
  {t:'image',      ic:'🖼', lb:'Imagen',        dc:[4,3]},
  {t:'text',       ic:'T',  lb:'Texto',         dc:[4,3]},
  {t:'pullquote',  ic:'❝',  lb:'Cita',          dc:[4,2]},
  {t:'separator',  ic:'─',  lb:'Separador',     dc:[12,1]},
  {t:'ad',         ic:'◻',  lb:'Publicidad',    dc:[3,3]},
  {t:'nav',        ic:'☰',  lb:'Navegación',    dc:[12,1]},
  // Bloques de estructura global (solo Modelar)
  {t:'header',     ic:'▬',  lb:'Cabecera',      dc:[12,2], hfOnly:true},
  {t:'footer',     ic:'▬',  lb:'Pie',           dc:[12,2], hfOnly:true},
  // Bloques de identidad legados (para retrocompatibilidad en renderizado)
  {t:'site-logo',  ic:'◈',  lb:'Logo',          dc:[3,2],  hfOnly:true, legacy:true},
  {t:'site-title', ic:'Aa', lb:'Título sitio',  dc:[6,1],  hfOnly:true, legacy:true},
  {t:'site-desc',  ic:'¶',  lb:'Descripción',   dc:[8,1],  hfOnly:true, legacy:true},
  {t:'site-promo', ic:'★',  lb:'Promo',         dc:[8,2],  hfOnly:true, legacy:true},
];

// ── Plantillas de inicio (sin bloques HF — la cabecera/pie vienen de Modelar) ──
const TPLS = {
  blank: {name:'Lienzo vacío', blocks:[]},

  article: {name:'Artículo clásico', blocks:[
    {t:'content',   c:2,  r:1,  cs:10, rs:14, tx:''},
  ]},

  article2col: {name:'Artículo 2 columnas', blocks:[
    {t:'content',   c:1,  r:1,  cs:8,  rs:12, tx:''},
    {t:'sidebar',   c:9,  r:1,  cs:4,  rs:12, tx:'Relacionados'},
  ]},

  magazine: {name:'Magazine 3 columnas', blocks:[
    {t:'image',     c:1,  r:1,  cs:5,  rs:4,  tx:''},
    {t:'content',   c:6,  r:1,  cs:5,  rs:8,  tx:''},
    {t:'sidebar',   c:11, r:1,  cs:2,  rs:8,  tx:'Relacionados'},
    {t:'text',      c:1,  r:5,  cs:5,  rs:4,  tx:'Columna secundaria'},
    {t:'separator', c:1,  r:9,  cs:12, rs:1,  tx:''},
    {t:'text',      c:1,  r:10, cs:4,  rs:3,  tx:'Bloque 1'},
    {t:'text',      c:5,  r:10, cs:4,  rs:3,  tx:'Bloque 2'},
    {t:'text',      c:9,  r:10, cs:4,  rs:3,  tx:'Bloque 3'},
  ]},

  bulletin: {name:'Boletín 2 columnas', blocks:[
    {t:'image',     c:1,  r:1,  cs:5,  rs:4,  tx:''},
    {t:'content',   c:6,  r:1,  cs:7,  rs:7,  tx:''},
    {t:'text',      c:1,  r:5,  cs:5,  rs:3,  tx:'Noticia secundaria'},
    {t:'separator', c:1,  r:8,  cs:12, rs:1,  tx:''},
    {t:'text',      c:1,  r:9,  cs:6,  rs:4,  tx:'Columna A'},
    {t:'text',      c:7,  r:9,  cs:6,  rs:4,  tx:'Columna B'},
  ]},

  newspaper: {name:'Periódico clásico', blocks:[
    {t:'image',     c:1,  r:1,  cs:8,  rs:3,  tx:''},
    {t:'sidebar',   c:9,  r:1,  cs:4,  rs:6,  tx:'En portada'},
    {t:'content',   c:1,  r:4,  cs:4,  rs:7,  tx:''},
    {t:'text',      c:5,  r:4,  cs:4,  rs:4,  tx:'Noticia 2'},
    {t:'text',      c:5,  r:8,  cs:4,  rs:3,  tx:'Noticia 3'},
    {t:'pullquote', c:9,  r:7,  cs:4,  rs:2,  tx:'La cita del día…'},
  ]},

  galeria: {name:'Galería fotográfica', blocks:[
    {t:'image',     c:1,  r:1,  cs:6,  rs:4,  tx:''},
    {t:'image',     c:7,  r:1,  cs:6,  rs:4,  tx:''},
    {t:'image',     c:1,  r:5,  cs:4,  rs:4,  tx:''},
    {t:'image',     c:5,  r:5,  cs:4,  rs:4,  tx:''},
    {t:'image',     c:9,  r:5,  cs:4,  rs:4,  tx:''},
    {t:'content',   c:1,  r:9,  cs:8,  rs:5,  tx:''},
    {t:'sidebar',   c:9,  r:9,  cs:4,  rs:5,  tx:''},
  ]},

  landing: {name:'Landing page', blocks:[
    {t:'image',     c:1,  r:1,  cs:12, rs:5,  tx:''},
    {t:'content',   c:3,  r:6,  cs:8,  rs:6,  tx:''},
    {t:'pullquote', c:2,  r:12, cs:10, rs:2,  tx:''},
    {t:'text',      c:1,  r:14, cs:4,  rs:4,  tx:'Característica 1'},
    {t:'text',      c:5,  r:14, cs:4,  rs:4,  tx:'Característica 2'},
    {t:'text',      c:9,  r:14, cs:4,  rs:4,  tx:'Característica 3'},
    {t:'ad',        c:3,  r:18, cs:8,  rs:2,  tx:''},
  ]},

  grid3: {name:'Rejilla 3×2', blocks:[
    {t:'content',   c:1,  r:1,  cs:4,  rs:6,  tx:''},
    {t:'content',   c:5,  r:1,  cs:4,  rs:6,  tx:''},
    {t:'content',   c:9,  r:1,  cs:4,  rs:6,  tx:''},
    {t:'text',      c:1,  r:7,  cs:4,  rs:4,  tx:''},
    {t:'text',      c:5,  r:7,  cs:4,  rs:4,  tx:''},
    {t:'text',      c:9,  r:7,  cs:4,  rs:4,  tx:''},
  ]},
};

// ── Estado global ────────────────────────────────────────────
const S = {
  cols:12, rows:16, gridOn:true,
  offline: false,
  posts:   [],
  pages:   [],
  cur: {id:null, title:'', slug:'', date:'', tags:'', status:'draft', access:'public', content:'', blocks:[]},
  currentUser: null,  // { username, role, displayName, permissions }
  selType:null, nextId:1, selBlock:null,
  placing:false, ps:null, pe:null,
  dragging:null, dOC:0, dOR:0,
  resizing:null,
  media:        [],
  mediaFilter:  'all',
  selMedia:     null,
  mediaContext: null,
  mediosFilter: 'all',
  selMedios:    null,
  siteConfig: {
    nav:[], adZones:[], headerBlocks:[], footerBlocks:[], theme:'newsday',
    siteStructure:    {homepage:'posts', homepageRef:'', activePortada:''},
    sectionTemplates: {posts:'', single:'', page:''},
    blockAssignments: {},
  },
  themes:           [],
  layouts:          [],
  _editingLayoutId: null,
  _previewReady:    false,
  backupFiles:      [],
  autoBackupCfg:    { enabled: false, keepDays: 7 },
  activeTab:        'dashboard',
  savedRange:       null,
  // ── Maquetar ─────────────────────────────────────────────
  maqPageType: 'single',   // portada | posts | single | page | libre
};

// Exponer S en window para que los plugins puedan acceder a window.S
// (const/let en el top-level de un script NO se añaden a window automáticamente)
window.S = S;

// ── API wrapper ──────────────────────────────────────────────
const api = {
  async call(action, opts = {}) {
    const url = `${API_URL}?action=${action}`;
    const res = await fetch(url, {
      credentials: 'include',
      headers: {'Content-Type':'application/json', ...(opts.headers||{})},
      ...opts,
    });
    const isJSON = res.headers.get('content-type')?.includes('application/json');
    if (isJSON) return res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  },
  post(action, body) {
    return this.call(action, {method:'POST', body:JSON.stringify(body)});
  },
  async upload(action, formData) {
    const url = `${API_URL}?action=${action}`;
    const res = await fetch(url, {credentials:'include', method:'POST', body:formData});
    const isJSON = res.headers.get('content-type')?.includes('application/json');
    if (isJSON) return res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  },
};

// ── Utilidades globales ──────────────────────────────────────
function escH(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function makeSlug(s) {
  return (s||'').toLowerCase().trim()
    .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i')
    .replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function toast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), duration);
}

// ── Autenticación ────────────────────────────────────────────
async function checkAuth() {
  try {
    const r = await api.call('check');
    if (r && r.auth) {
      onAuthenticated();
    } else {
      document.getElementById('login-overlay').style.display = '';
    }
  } catch {
    document.getElementById('login-overlay').style.display = '';
  }
}

async function doLogin() {
  const user = document.getElementById('l-user')?.value || '';
  const pass = document.getElementById('l-pass')?.value || '';
  const err  = document.getElementById('lerr');
  try {
    const r = await api.post('login', {user, pass});
    if (r && r.ok) {
      // Guardar info de usuario desde respuesta de login
      if (r.role) {
        S.currentUser = { username: r.user, role: r.role, displayName: r.displayName || r.user };
      }
      document.getElementById('login-overlay').style.display = 'none';
      onAuthenticated();
    } else {
      if (err) { err.textContent = r?.error || 'Usuario o contraseña incorrectos'; err.classList.add('show'); }
    }
  } catch(e) {
    if (err) { err.textContent = 'Error de conexión: ' + (e?.message || ''); err.classList.add('show'); }
  }
}

async function doLogout() {
  try { await api.call('logout'); } catch {}
  location.reload();
}

function offlineMode() {
  S.offline = true;
  document.getElementById('login-overlay').style.display = 'none';
  // Cargar datos previos desde localStorage antes de renderizar
  if (typeof OLS !== 'undefined') OLS.loadAll();
  if (typeof startPingMonitor  === 'function') startPingMonitor();
  if (typeof renderSyncBadge   === 'function') renderSyncBadge();
  onAuthenticated();
}

// ── Inicio de sesión autenticada ─────────────────────────────
async function onAuthenticated() {
  document.getElementById('login-overlay').style.display = 'none';
  if (!S.offline) {
    document.getElementById('conn-badge').textContent = '● Online';
    document.getElementById('conn-badge').className = 'conn-on';
  }

  // Cargar info del usuario actual (si no viene del login)
  if (!S.offline && !S.currentUser) {
    try {
      const me = await api.call('me');
      if (me && me.auth) S.currentUser = me;
    } catch {}
  }

  // Aplicar restricciones de UI según rol
  applyRoleUI();

  // Carga inicial de datos
  await Promise.all([
    loadPostsFromBackend(),
    loadPages(),
    loadMedia(),
    loadSettingsIntoForm(),
    loadSiteConfig(),
    loadThemes(),
  ]);

  // Cargar bundle de plugins activos (una sola petición HTTP)
  if (!S.offline && typeof _ndLoadPluginBundle === 'function') {
    _ndLoadPluginBundle();
  }

  if (typeof loadMaintenanceState === 'function') loadMaintenanceState();
  if (typeof loadDashStats        === 'function') loadDashStats();
  if (typeof loadBackups          === 'function') loadBackups();
  if (typeof renderContentLangPicker === 'function') renderContentLangPicker();
  checkSiteExists();
  switchTab('dashboard');
}

/**
 * Muestra u oculta partes de la UI según el rol del usuario.
 * Solo el admin ve la pestaña Usuarios.
 * El escritor no ve Ajustes ni genera el sitio.
 */
function applyRoleUI() {
  const role = S.currentUser?.role || 'admin';
  const perms = S.currentUser?.permissions || ['posts','pages','media','layouts','generate','config','backup','users','readers'];

  // Tab Usuarios: solo admin
  const usrBtn = document.getElementById('tab-btn-usuarios');
  if (usrBtn) usrBtn.style.display = (role === 'admin') ? '' : 'none';

  // Tab Ajustes: solo admin y editor
  const ajBtn = document.querySelector('[data-tab="ajustes"]');
  if (ajBtn) ajBtn.style.display = perms.includes('config') ? '' : 'none';

  // Mostrar nombre de usuario en topbar
  const logout = document.querySelector('[onclick="doLogout()"]');
  if (logout && S.currentUser?.displayName) {
    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = 'font-size:11px;color:#9aaed4;margin-right:4px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    nameSpan.textContent = S.currentUser.displayName;
    if (!document.getElementById('topbar-username')) {
      nameSpan.id = 'topbar-username';
      logout.parentNode.insertBefore(nameSpan, logout);
    }
  }
}

// ── Posts ────────────────────────────────────────────────────
async function loadPostsFromBackend() {
  if (S.offline) return;
  try {
    const data = await api.call('posts');
    S.posts = Array.isArray(data) ? data : (data.posts || []);
    renderPostsList();
    updateDashStats();
  } catch(e) { console.warn('loadPosts:', e); }
}

function renderPostsList() {
  const el = document.getElementById('posts-list');
  if (!el) return;
  if (!S.posts.length) {
    el.innerHTML = '<div class="empty-hint">Sin publicaciones. Pulsa ＋ para empezar.</div>';
    return;
  }
  el.innerHTML = S.posts.map(p => {
    const act = p.id === S.cur.id;
    const pill = p.status === 'published'
      ? '<span class="status-pill pill-pub">Pub</span>'
      : '<span class="status-pill pill-bor">Bor</span>';
    return `<div class="pl-item ${act ? 'active' : ''}" onclick="loadPost('${escH(String(p.id))}')">
      ${pill}
      <span class="pl-title">${escH(p.title || 'Sin título')}</span>
      <span class="pl-date">${escH(p.date || '')}</span>
    </div>`;
  }).join('');
}

async function loadPost(id) {
  if (S.offline) return;
  try {
    const r = await api.call(`post&id=${id}`);
    if (!r || r.error) { toast('Error cargando post'); return; }
    S.cur = {
      id:      r.id      || null,
      title:   r.title   || '',
      slug:    r.slug    || '',
      date:    r.date    || '',
      tags:    r.tags    || '',
      status:  r.status  || 'draft',
      content: r.content || '',
      blocks:  (r.layout?.blocks || []).map(b => ({...b, id: b.id ?? (S.nextId++)})),
    };
    if (r.layout?.cols) S.cols = r.layout.cols;
    if (r.layout?.rows) S.rows = r.layout.rows;
    applyPostToUI();
  } catch(e) { toast('Error: ' + (e?.message||'')); }
}

// Abrir post desde el widget del dashboard
function openPostFromList(id) {
  loadPost(id);
  switchTab('escribir');
}

function applyPostToUI() {
  const t = document.getElementById('post-title');
  const b = document.getElementById('ed-body');
  const d = document.getElementById('meta-date');
  const s = document.getElementById('meta-status');
  const g = document.getElementById('meta-tags');
  if (t) t.value             = S.cur.title;
  if (b) b.innerHTML         = S.cur.content;
  if (d) d.value             = S.cur.date;
  if (s) s.value             = S.cur.status;
  if (g) g.value             = S.cur.tags;
  const badge = document.getElementById('status-badge');
  if (badge) {
    badge.textContent = S.cur.status === 'published' ? 'Publicado' : 'Borrador';
    badge.className   = S.cur.status === 'published' ? 'sb-pub' : 'sb-draft';
  }
  const title = document.getElementById('ed-current-title');
  if (title) title.textContent = S.cur.title || 'Sin título';
  const colsSel = document.getElementById('cols-sel');
  const rowsSel = document.getElementById('rows-sel');
  if (colsSel) colsSel.value = String(S.cols);
  if (rowsSel) rowsSel.value = String(S.rows);
  renderPostsList();
  if (typeof renderGrid === 'function') renderGrid();
  updateWC();
}

function newPost() {
  S.cur = {id:null, title:'', slug:'', date: new Date().toISOString().slice(0,10),
            tags:'', status:'draft', content:'', blocks:[]};
  S.selBlock = null;
  S._editingLayoutId = null;
  applyPostToUI();
  const ed = document.getElementById('ed-body');
  if (ed) { ed.innerHTML = ''; ed.focus(); }
}

function syncTitle() {
  const v = document.getElementById('post-title')?.value || '';
  S.cur.title = v;
  const t = document.getElementById('ed-current-title');
  if (t) t.textContent = v || 'Sin título';
  if (!S.cur.slug) S.cur.slug = makeSlug(v);
}

function syncMeta() {
  S.cur.date = document.getElementById('meta-date')?.value  || '';
  S.cur.tags = document.getElementById('meta-tags')?.value  || '';
}

function syncStatus() {
  S.cur.status = document.getElementById('meta-status')?.value || 'draft';
  const badge = document.getElementById('status-badge');
  if (badge) {
    badge.textContent = S.cur.status === 'published' ? 'Publicado' : 'Borrador';
    badge.className   = S.cur.status === 'published' ? 'sb-pub' : 'sb-draft';
  }
}

function syncContent() {
  S.cur.content = document.getElementById('ed-body')?.innerHTML || '';
}

function updateWC() {
  const b = document.getElementById('ed-body');
  const c = document.getElementById('wc');
  if (b && c) {
    const words = (b.innerText || '').trim().split(/\s+/).filter(Boolean).length;
    c.textContent = words + ' palabra' + (words !== 1 ? 's' : '');
  }
}

async function savePost() {
  const titleEl   = document.getElementById('post-title');
  const statusEl  = document.getElementById('meta-status');
  const dateEl    = document.getElementById('meta-date');
  const tagsEl    = document.getElementById('meta-tags');
  const bodyEl    = document.getElementById('ed-body');

  S.cur.title   = titleEl?.value.trim() || '';
  S.cur.status  = statusEl?.value || 'draft';
  S.cur.date    = dateEl?.value  || '';
  S.cur.tags    = tagsEl?.value  || '';
  S.cur.content = bodyEl?.innerHTML || '';

  if (!S.cur.title) { toast('El título es obligatorio'); return; }
  if (!S.cur.slug)  S.cur.slug = makeSlug(S.cur.title);

  const payload = {
    id:      S.cur.id,
    title:   S.cur.title,
    slug:    S.cur.slug,
    date:    S.cur.date,
    tags:    S.cur.tags,
    status:  S.cur.status,
    content: S.cur.content,
    layout:  {cols: S.cols, rows: S.rows, blocks: S.cur.blocks},
  };
  if (S.offline) { OLS.savePost({...payload, id: S.cur.id}); return; }
  try {
    const r = await api.post('save', payload);
    if (r && r.ok) {
      S.cur.id = r.id || S.cur.id;
      toast('✓ Post guardado');
      await loadPostsFromBackend();
    } else {
      toast('Error: ' + (r?.error || ''));
    }
  } catch(e) { toast('Error: ' + (e?.message||'')); }
}

async function deletePost(id) {
  if (!confirm('¿Eliminar este post? No se puede deshacer.')) return;
  try {
    const r = await api.post('delete', {id: id || S.cur.id});
    if (r && r.ok) {
      toast('Post eliminado');
      newPost();
      await loadPostsFromBackend();
    } else { toast('Error: ' + (r?.error||'')); }
  } catch(e) { toast('Error: ' + (e?.message||'')); }
}

// ── Editor: comandos de formato ──────────────────────────────
function ex(cmd, val) {
  document.getElementById('ed-body')?.focus();
  document.execCommand(cmd, false, val || null);
}

function doLink() {
  const url = prompt('URL del enlace:');
  if (url) ex('createLink', url);
}

function previewPost() {
  if (S.offline) { toast('Preview no disponible en modo offline'); return; }
  toast('⏳ Generando vista previa…');
  const payload = {
    title:   S.cur.title   || 'Preview',
    slug:    S.cur.slug    || 'preview',
    date:    S.cur.date    || new Date().toISOString().slice(0,10),
    tags:    S.cur.tags    || '',
    status:  'draft',
    content: document.getElementById('ed-body')?.innerHTML || '',
    layout:  {cols: S.cols, rows: S.rows, blocks: S.cur.blocks},
  };
  api.post('generate-preview', {singlePost: payload})
    .then(r => {
      if (r && r.ok) {
        toast('✓ Vista previa lista');
        S._previewReady = true;
        if (typeof loadPreviewIframe === 'function') loadPreviewIframe('preview/');
        switchTab('publicar');
      } else {
        toast('Error generando preview: ' + (r?.error||''));
      }
    })
    .catch(e => toast('Error: ' + (e?.message||'')));
}

// ── Páginas estáticas ────────────────────────────────────────
async function loadPages() {
  if (S.offline) return;
  try {
    const r = await api.call('pages');
    S.pages = r?.pages || [];
  } catch(e) { console.warn('loadPages:', e); }
}

// ── Mini galería lateral (Escribir) ──────────────────────────
function renderMiniMediaGrid() {
  const el = document.getElementById('media-mini-grid');
  if (!el) return;
  const imgs = S.media.filter(m => m.type === 'images').slice(0, 12);
  el.innerHTML = imgs.map(m =>
    `<img class="mini-thumb" src="${escH(m.url||m.thumb||'')}" alt="${escH(m.name||'')}"
          onclick="insertImageFromMini('${escH(m.url||'')}')" title="${escH(m.name||'')}">`,
  ).join('');
}

function insertImageFromMini(url) {
  const ed = document.getElementById('ed-body');
  if (!ed) return;
  ed.focus();
  document.execCommand('insertHTML', false,
    `<img src="${escH(url)}" alt="" style="max-width:100%;height:auto">`);
}

function insertMediaInEditor() {
  openMediaModal('editor');
}

// ── Cerrar modales (mov) ──────────────────────────────────────
function closeMov(id) {
  const el = id ? document.getElementById(id) : null;
  if (el) {
    el.classList.remove('vis');
  } else {
    document.querySelectorAll('.mov.vis').forEach(m => m.classList.remove('vis'));
  }
}
