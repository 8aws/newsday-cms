// ════════════════════════════════════════════════════════════════
//  plugins.js — Gestor de plugins del constructor de páginas
//
//  Funciones exportadas al scope global:
//    loadPlugins()          Carga y renderiza la lista de plugins
//    renderPluginGrid(list) Dibuja las tarjetas de plugins
//    togglePlugin(id,bool)  Activa / desactiva un plugin
//    deletePlugin(id)       Elimina un plugin (con confirmación)
//    plgHandleDrop(e)       Drop zone para instalar ZIP
//    plgHandleFile(f)       Procesa el archivo ZIP de instalación
//
//  Carga de scripts:
//    _ndLoadPluginBundle()  Inyecta un único <script> que concatena
//                           todos los plugins activos en una sola
//                           petición HTTP. Se llama desde core.js
//                           en onAuthenticated() para carga temprana.
// ════════════════════════════════════════════════════════════════

/* ── Estado interno ──────────────────────────────────────────── */
let _plgList = [];   // lista cacheada de plugins

/* ── Carga del bundle de plugins (una sola petición HTTP) ─────── */
function _ndLoadPluginBundle() {
  // Eliminar bundle previo si existía
  const prev = document.getElementById('nd-plugins-bundle');
  if (prev) prev.remove();

  const s = document.createElement('script');
  s.id  = 'nd-plugins-bundle';
  s.src = `newsday-api.php?action=plugins-bundle&_=${Date.now()}`;
  s.onerror = () => console.warn('ND: error cargando plugins-bundle');
  document.head.appendChild(s);
}

/* ── Carga principal (UI del gestor de plugins) ───────────────── */
async function loadPlugins() {
  try {
    const list = await api.call('list-plugins');
    _plgList = Array.isArray(list) ? list : [];
  } catch(e) {
    _plgList = [];
  }
  renderPluginGrid(_plgList);
}

/* ── Renderizar cuadrícula de plugins ────────────────────────── */
function renderPluginGrid(plugins) {
  const wrap = document.getElementById('plugins-grid');
  if (!wrap) return;

  if (!plugins || !plugins.length) {
    wrap.innerHTML = `<div class="plg-empty">
      <span style="font-size:2rem">🧩</span>
      <p>No hay plugins instalados todavía.</p>
      <p style="font-size:12px;color:#94a3b8">Instala un plugin subiendo un archivo <code>.zip</code> arriba.</p>
    </div>`;
    return;
  }

  wrap.innerHTML = plugins.map(p => _plgCard(p)).join('');
}

function _plgCard(p) {
  const comps = (p.components || []).map(c =>
    `<span class="plg-comp-badge">${c.ic || '🧩'} ${c.lb || c.type}</span>`
  ).join('');

  return `<div class="plg-card ${p.active ? '' : 'plg-card--off'}" id="plg-card-${p.id}">
  <div class="plg-card-head">
    <span class="plg-card-name">${_plgEH(p.name || p.id)}</span>
    <span class="plg-ver">${_plgEH(p.version || '?')}</span>
    <div class="plg-card-acts">
      <label class="plg-toggle" title="${p.active ? 'Desactivar' : 'Activar'}">
        <input type="checkbox" ${p.active ? 'checked' : ''}
               onchange="togglePlugin('${_plgEH(p.id)}',this.checked)">
        <span class="plg-toggle-track"></span>
      </label>
      <button class="btn btn-red btn-sm" onclick="deletePlugin('${_plgEH(p.id)}')" title="Eliminar plugin">✕</button>
    </div>
  </div>
  ${p.description ? `<p class="plg-desc">${_plgEH(p.description)}</p>` : ''}
  ${comps ? `<div class="plg-comps">${comps}</div>` : ''}
  ${p.author ? `<div class="plg-author">por ${_plgEH(p.author)}</div>` : ''}
</div>`;
}

/* ── Toggle activo/inactivo ──────────────────────────────────── */
async function togglePlugin(id, active) {
  const card = document.getElementById('plg-card-' + id);
  if (card) card.style.opacity = '0.5';

  try {
    await api.post('toggle-plugin', { id, active });
    toast((active ? `Plugin "${id}" activado` : `Plugin "${id}" desactivado`) + ' — recargando…');
    // Recargar la página para que el bundle se actualice limpiamente
    setTimeout(() => location.reload(), 800);
  } catch(e) {
    if (card) card.style.opacity = '';
    toast('Error: ' + (e?.message || 'desconocido'));
  }
}

/* ── Eliminar plugin ─────────────────────────────────────────── */
async function deletePlugin(id) {
  if (!confirm(`¿Eliminar el plugin "${id}" permanentemente?\n\nLos componentes de este plugin desaparecerán de las páginas que los usen.`)) return;

  const card = document.getElementById('plg-card-' + id);
  if (card) card.style.opacity = '0.4';

  try {
    await api.post('delete-plugin', { id });
    toast(`Plugin "${id}" eliminado — recargando…`);
    setTimeout(() => location.reload(), 800);
  } catch(e) {
    if (card) card.style.opacity = '';
    toast('Error: ' + (e?.message || 'desconocido'));
  }
}

/* ── Instalación por ZIP ─────────────────────────────────────── */
function plgHandleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) plgHandleFile(file);
}

function plgHandleFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.zip')) {
    toast('El archivo debe ser un .zip de plugin'); return;
  }

  const bar   = document.getElementById('plg-install-bar');
  const msg   = document.getElementById('plg-install-msg');
  const btn   = document.getElementById('plg-install-btn');
  if (bar) bar.style.display = 'flex';
  if (msg) msg.textContent = `📦 ${file.name}`;
  if (btn) { btn.disabled = false; btn.dataset.pending = '1'; }

  // Guardar referencia para el botón Instalar
  window._plgPendingFile = file;
}

async function plgInstallConfirm() {
  const file = window._plgPendingFile;
  if (!file) return;

  const btn = document.getElementById('plg-install-btn');
  const msg = document.getElementById('plg-install-msg');
  if (btn) { btn.disabled = true; btn.textContent = 'Instalando…'; }

  try {
    const fd = new FormData();
    fd.append('file', file);

    const r = await fetch(`newsday-api.php?action=install-plugin`, {
      method : 'POST',
      headers: { 'X-Token': S.token || '' },
      body   : fd,
    });
    const data = await r.json();

    if (!r.ok || data.error) throw new Error(data.error || 'Error desconocido');

    window._plgPendingFile = null;
    toast(`✓ Plugin "${data.id}" instalado — recargando…`);
    setTimeout(() => location.reload(), 800);
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = '⬆ Instalar'; }
    toast('Error instalando plugin: ' + (e?.message || ''));
  }
}

function plgClearInstall() {
  window._plgPendingFile = null;
  const bar = document.getElementById('plg-install-bar');
  if (bar) bar.style.display = 'none';
  const btn = document.getElementById('plg-install-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⬆ Instalar'; }
  const inp = document.getElementById('plg-file-input');
  if (inp) inp.value = '';
}

/* ── HTML escape ─────────────────────────────────────────────── */
function _plgEH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

/* ── Inicialización al cargar settings ──────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // El drop zone de plugins hace clic al input file
  const dz = document.getElementById('plg-drop-zone');
  if (dz) {
    dz.addEventListener('click', () => {
      document.getElementById('plg-file-input')?.click();
    });
  }
});
