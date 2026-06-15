// ════════════════════════════════════════════════════════════════
//  publish.js — Generar sitio, backup, restaurar, ajustes
// ════════════════════════════════════════════════════════════════

// ── Comprobación: ¿existe el sitio generado? ─────────────────
async function checkSiteExists() {
  if (S.offline) return;
  try {
    const r = await api.call('check-site');
    setSiteLinks(r && r.exists);
  } catch { setSiteLinks(false); }
}

function setSiteLinks(exists) {
  const ids = ['qa-ver-sitio', 'btn-ver-sitio'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.pointerEvents = exists ? '' : 'none';
    el.style.opacity       = exists ? ''  : '.38';
    el.title               = exists ? ''  : 'Genera el sitio primero (⚡ Generar sitio)';
  });
  const hint = document.getElementById('ver-sitio-hint');
  if (hint) hint.style.display = exists ? 'none' : '';

  // No auto-cargamos public/ en el iframe; el usuario usa "Generar vista previa"
}

// ── Generar sitio estático ────────────────────────────────────
async function runGenerate() {
  const btn    = document.getElementById('btn-gen');
  const result = document.getElementById('gen-result');
  const msg    = document.getElementById('gen-msg');
  const list   = document.getElementById('gen-list');

  if (btn)  { btn.disabled = true; btn.textContent = '⏳ Generando…'; }
  if (result) result.style.display = 'none';

  try {
    const r = await api.post('generate', {});
    if (result) result.style.display = 'block';

    if (r && r.ok) {
      const files = r.files || [];
      if (msg)  msg.textContent  = `✓ ${files.length} archivo${files.length!==1?'s':''} generado${files.length!==1?'s':''}`;
      if (list) list.innerHTML   = files.map(f => `<div class="gen-file">📄 ${escH(f)}</div>`).join('');
      toast('✓ Sitio generado correctamente');
      setSiteLinks(true);
      showDashGenOut(r);
    } else {
      if (msg)  msg.textContent = '✗ Error al generar: ' + (r?.error||'respuesta inesperada');
      if (list) list.innerHTML  = '';
      toast('Error generando el sitio');
    }
  } catch(e) {
    if (result) result.style.display = 'block';
    if (msg)  msg.textContent = '✗ ' + (e?.message||'Error desconocido');
    if (list) list.innerHTML  = '';
    toast('Error: ' + (e?.message||''));
  } finally {
    if (btn)  { btn.disabled = false; btn.textContent = '⚡ Generar sitio'; }
  }
}

// Llamada desde el dashboard (quick action)
async function runGenerateDash() {
  toast('⏳ Generando sitio…');
  try {
    const r = await api.post('generate', {});
    if (r && r.ok) {
      toast(`✓ Sitio generado (${(r.files||[]).length} archivos)`);
      showDashGenOut(r);
    } else {
      toast('Error: ' + (r?.error||''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message||''));
  }
}

function showDashGenOut(r) {
  const wrap = document.getElementById('dash-gen-wrap');
  const out  = document.getElementById('dash-gen-out');
  if (!wrap || !out) return;
  wrap.style.display = 'block';
  const files = r.files || [];
  out.innerHTML = `<strong>${files.length} archivo${files.length!==1?'s':''} generados</strong><br>`
    + files.slice(0,8).map(f => `📄 ${escH(f)}`).join('<br>')
    + (files.length > 8 ? `<br><em>…y ${files.length-8} más</em>` : '');
}

// ── Backup ────────────────────────────────────────────────────
async function runBackup() {
  try {
    toast('⏳ Preparando backup…');
    // La API devuelve el ZIP directamente como descarga
    const url  = `newsday-api.php?action=backup`;
    const link = document.createElement('a');
    link.href  = url;
    link.download = `newsday-backup-${new Date().toISOString().slice(0,10)}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('✓ Descarga iniciada');
  } catch(e) {
    toast('Error en backup: ' + (e?.message||''));
  }
}

// ── Restaurar desde ZIP ───────────────────────────────────────
async function runRestore(event) {
  const file = event.target.files[0];
  if (!file) return;
  const result = document.getElementById('restore-result');

  if (!confirm('⚠ Esta acción sobreescribirá todo el contenido actual. ¿Continuar?')) {
    event.target.value = '';
    return;
  }

  if (result) { result.style.display = 'block'; result.textContent = '⏳ Restaurando…'; }

  const fd = new FormData();
  fd.append('backup', file);
  try {
    const r = await api.upload('restore', fd);
    if (r && r.ok) {
      if (result) result.innerHTML = `<strong style="color:#16a34a">✓ Restauración completada</strong><br>${escH(r.message||'')}`;
      toast('✓ Backup restaurado');
      // Recargar datos
      await loadPostsFromBackend();
      await loadPages();
      await loadMedia();
      await loadSiteConfig();
      await loadSettingsIntoForm();
    } else {
      if (result) result.innerHTML = `<strong style="color:#dc2626">✗ Error:</strong> ${escH(r?.error||'respuesta inesperada')}`;
      toast('Error en restauración');
    }
  } catch(e) {
    if (result) result.innerHTML = `<strong style="color:#dc2626">✗ Error:</strong> ${escH(e?.message||'')}`;
    toast('Error: ' + (e?.message||''));
  } finally {
    event.target.value = '';
  }
}

// ── Validador URL base ────────────────────────────────────────
function validateBaseUrl(val) {
  const warn    = document.getElementById('baseurl-warn');
  const pubWarn = document.getElementById('pub-baseurl-warn');
  if (!warn) return;
  val = (val || '').trim();

  let msg = '';
  if (val && val.endsWith('/')) {
    msg = '⚠ Quita la barra final: la URL no debe terminar en <code>/</code>.';
  }
  // Nota: /public se añade automáticamente en el generador si no se especifica,
  // así que solo avisamos si hay barra final.

  if (msg) {
    warn.innerHTML     = msg;
    warn.style.display = '';
    if (pubWarn) pubWarn.style.display = '';
  } else {
    warn.style.display = 'none';
    if (pubWarn) pubWarn.style.display = 'none';
  }
}

// ── Ajustes del sitio ─────────────────────────────────────────
async function loadSettingsIntoForm() {
  if (S.offline) return;
  try {
    const r = await api.call('config');
    if (!r) return;
    const nameEl  = document.getElementById('cfg-sitename');
    const urlEl   = document.getElementById('cfg-baseurl');
    const userEl  = document.getElementById('cfg-user');
    const tokenEl = document.getElementById('cfg-token');
    if (nameEl)  nameEl.value  = r.siteName  || '';
    if (urlEl)   urlEl.value   = r.baseUrl   || '';
    if (userEl)  userEl.value  = r.user      || '';
    if (tokenEl) tokenEl.textContent = r.token || '—';
    validateBaseUrl(r.baseUrl || '');
  } catch(e) {
    console.warn('loadSettings:', e);
  }
}

// ── Generar vista previa temporal ────────────────────────────
async function runGeneratePreview() {
  const btn  = document.getElementById('btn-preview');
  const info = document.getElementById('preview-gen-info');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generando…'; }
  if (info) info.textContent = '';
  try {
    toast('⏳ Generando vista previa…');
    const r = await api.post('generate-preview', {});
    if (r && r.ok) {
      toast('✓ Vista previa lista');
      if (info) info.textContent = `✓ ${(r.files||[]).length} archivos`;
      S._previewReady = true;
      loadPreviewIframe('preview/');
    } else {
      toast('Error generando preview: ' + (r?.error || ''));
      if (info) info.textContent = '✗ Error: ' + (r?.error || 'respuesta inesperada');
    }
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
    if (info) info.textContent = '✗ ' + (e?.message || '');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔍 Generar vista previa'; }
  }
}

// ── Mini navegador preview ────────────────────────────────────
function loadPreviewIframe(src) {
  const iframe      = document.getElementById('preview-iframe');
  const placeholder = document.getElementById('preview-placeholder');
  const urlBar      = document.getElementById('preview-url-bar');
  const openLink    = document.getElementById('preview-open-tab');
  if (!iframe) return;

  // src puede ser 'preview/' (preview temporal) o 'public/' (sitio publicado)
  if (!src) src = S._previewReady ? 'preview/' : 'public/';

  iframe.removeEventListener('load', _onPreviewLoad);
  iframe.addEventListener('load', _onPreviewLoad);
  iframe.setAttribute('src', src);
  iframe.style.display = '';
  if (placeholder) placeholder.style.display = 'none';
  if (urlBar)  urlBar.value  = location.origin + location.pathname.replace(/[^/]+$/, '') + src;
  if (openLink) { openLink.href = src; }
}

function _onPreviewLoad() {
  // El evento load dispara al cargar cada página en el iframe.
  // También actualizamos vía postMessage (más preciso al hacer clic en links).
  _updatePreviewUrlBar(this.contentWindow?.location?.href);
}

/**
 * Recibe mensajes postMessage del tracker inyectado en las páginas preview.
 * Se registra una sola vez al cargar el módulo.
 */
window.addEventListener('message', function(e) {
  if (!e.data || !e.data.ndPreview) return;
  _updatePreviewUrlBar(e.data.url);
});

function _updatePreviewUrlBar(fullUrl) {
  if (!fullUrl || fullUrl.startsWith('about:')) return;
  const urlBar  = document.getElementById('preview-url-bar');
  const openBtn = document.getElementById('preview-open-tab');
  if (urlBar) urlBar.value = fullUrl;
  if (openBtn) {
    // Convertir URL absoluta → ruta relativa respecto al admin
    try {
      const base   = location.origin + location.pathname.replace(/[^/]+$/, '');
      const rel    = fullUrl.startsWith(base) ? fullUrl.slice(base.length) : fullUrl;
      openBtn.href = rel || fullUrl;
    } catch {
      openBtn.href = fullUrl;
    }
  }
}

function previewNav(action) {
  const iframe = document.getElementById('preview-iframe');
  if (!iframe || !iframe.getAttribute('src')) return;
  try {
    switch(action) {
      case 'back':   iframe.contentWindow.history.back();    break;
      case 'fwd':    iframe.contentWindow.history.forward(); break;
      case 'reload': iframe.contentWindow.location.reload(); break;
    }
  } catch { iframe.setAttribute('src', iframe.getAttribute('src')); }
}

async function saveSettings() {
  const siteName = document.getElementById('cfg-sitename')?.value.trim() || '';
  const baseUrl  = document.getElementById('cfg-baseurl')?.value.trim()  || '';
  const user     = document.getElementById('cfg-user')?.value.trim()     || '';
  const pass     = document.getElementById('cfg-pass')?.value            || '';

  if (!siteName) { toast('El nombre del sitio es obligatorio'); return; }
  if (!user)     { toast('El usuario es obligatorio'); return; }

  if (S.offline) {
    OLS.saveSettings({siteName, baseUrl, username: user});
    return;
  }

  try {
    const r = await api.post('save-config', {siteName, baseUrl, user, pass: pass||undefined});
    if (r && r.ok) {
      toast('✓ Configuración guardada');
      if (document.getElementById('cfg-pass')) document.getElementById('cfg-pass').value = '';
    } else {
      toast('Error: ' + (r?.error||''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message||''));
  }
}

// ════════════════════════════════════════════════════════════════
//  SISTEMA DE ACTUALIZACIONES (Ajustes → Actualizaciones)
// ════════════════════════════════════════════════════════════════

let _updFile = null;

function handleUpdateDrop(e) {
  e.preventDefault();
  document.getElementById('upd-drop-zone').classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) handleUpdateFile(file);
}

function handleUpdateFile(file) {
  if (!file) return;
  if (!file.name.endsWith('.zip')) { toast('Selecciona un archivo .zip'); return; }
  _updFile = file;
  document.getElementById('upd-file-chosen').style.display = 'flex';
  document.getElementById('upd-file-name').textContent = file.name + ' (' + (file.size/1024).toFixed(1) + ' KB)';
  document.getElementById('upd-apply-btn').disabled = false;
  document.getElementById('upd-result').style.display = 'none';
  // Hacer clic en la zona también abre el selector
  document.getElementById('upd-drop-zone').onclick = null;
}

function clearUpdateFile() {
  _updFile = null;
  document.getElementById('upd-file-chosen').style.display = 'none';
  document.getElementById('upd-apply-btn').disabled = true;
  document.getElementById('upd-file-input').value = '';
  document.getElementById('upd-result').style.display = 'none';
}

// La zona de drop también actúa como botón de selección
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('upd-drop-zone');
  if (zone) {
    zone.addEventListener('click', () => {
      document.getElementById('upd-file-input').click();
    });
  }
});

async function applyUpdateFile() {
  if (!_updFile) return;

  const btn = document.getElementById('upd-apply-btn');
  const msg = document.getElementById('upd-apply-msg');
  btn.disabled = true;
  msg.textContent = 'Aplicando…';
  msg.style.color = '#64748b';

  const fd = new FormData();
  fd.append('file', _updFile);

  try {
    const res  = await fetch('newsday-api.php?action=apply-update', {
      method: 'POST', body: fd, credentials: 'same-origin',
    });
    const data = await res.json();

    if (data.ok) {
      msg.textContent = '✓ ' + data.summary;
      msg.style.color = '#16a34a';
      renderUpdateResult(data);
      clearUpdateFile();
    } else {
      msg.textContent = '✗ ' + (data.error || 'Error desconocido');
      msg.style.color = '#dc2626';
    }
  } catch(e) {
    msg.textContent = '✗ Error de red: ' + (e.message || '');
    msg.style.color = '#dc2626';
  } finally {
    btn.disabled = false;
    setTimeout(() => { if (msg) msg.textContent = ''; }, 6000);
  }
}

function renderUpdateResult(data) {
  const el = document.getElementById('upd-result');
  if (!el) return;

  const updList = (data.updated || []).map(f =>
    `<div class="upd-file-row upd-ok">✓ ${escH(f)}</div>`).join('');

  const skipList = (data.skipped || []).map(f =>
    `<div class="upd-file-row upd-skip">🔒 ${escH(f)}</div>`).join('');

  const errList = (data.errors || []).map(f =>
    `<div class="upd-file-row upd-err">✗ ${escH(f)}</div>`).join('');

  el.style.display = 'block';
  el.innerHTML = `
    <div class="upd-result-head">${escH(data.summary)}</div>
    ${updList}
    ${skipList ? `<details class="upd-details"><summary>${(data.skipped||[]).length} archivo(s) protegido(s) omitido(s)</summary>${skipList}</details>` : ''}
    ${errList  ? `<div class="upd-err-block"><strong>Errores:</strong>${errList}</div>` : ''}
  `;
}
