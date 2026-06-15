// ════════════════════════════════════════════════════════════════
//  media.js — Gestor de medios (modal de inserción + pestaña Medios)
// ════════════════════════════════════════════════════════════════

// ── Cargar índice de medios ───────────────────────────────────
async function loadMedia() {
  if (S.offline) return;
  try {
    const data = await api.call('media');
    const raw = Array.isArray(data) ? data : (data.files || []);
    // Normalizar: la API devuelve 'subfolder', normalizamos a 'type' internamente
    S.media = raw.map(m => ({...m, type: m.subfolder || m.type || 'docs'}));
    renderMediaGrid();
    renderMediosGrid();
    renderMiniMediaGrid();
  } catch(e) {
    console.warn('loadMedia:', e);
  }
}

// ── Modal de inserción contextual ─────────────────────────────
function openMediaModal(context) {
  S.mediaContext = context; // 'editor' | 'block'
  S.selMedia     = null;

  // Guardar posición del cursor en el editor ANTES de que el modal robe el foco
  if (context === 'editor') {
    const sel = window.getSelection();
    S.savedRange = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null;
  }

  document.getElementById('media-modal').classList.add('vis');
  filterMedia(S.mediaFilter, null);
  updateModalActions();
}

function filterMedia(type, btn) {
  S.mediaFilter = type;
  // Actualizar tabs visuales
  document.querySelectorAll('#media-tabs .mtab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  else {
    const found = document.querySelector(`#media-tabs .mtab[onclick*="'${type}'"]`);
    if (found) found.classList.add('on');
  }
  renderMediaGrid();
}

function renderMediaGrid() {
  const el = document.getElementById('media-grid');
  if (!el) return;
  const items = S.mediaFilter === 'all'
    ? S.media
    : S.media.filter(m => m.type === S.mediaFilter);

  if (!items.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:32px;text-align:center">Sin archivos en esta categoría</div>';
    return;
  }
  el.innerHTML = items.map(m => {
    const sel  = m.id === (S.selMedia?.id) || m.name === S.selMedia?.name;
    const safe = JSON.stringify(m).replace(/"/g,'&quot;');
    return `<div class="mitem ${sel ? 'sel' : ''}"
         data-id="${escH(String(m.id||m.name))}"
         onclick="selectMediaItem(${safe})">
      ${thumbHTML(m)}
      <div class="mitem-name">${escH(shortName(m.name||''))}</div>
    </div>`;
  }).join('');
}

function thumbHTML(m) {
  if (m.type === 'images') {
    return `<img class="mitem-thumb" src="${escH(m.url||m.thumb||'')}" alt="${escH(m.name||'')}">`;
  }
  const icons = {audio:'🎵', video:'🎬', docs:'📄'};
  return `<div class="mitem-icon">${icons[m.type]||'📎'}</div>`;
}

function shortName(name) {
  return name.length > 22 ? name.slice(0,19) + '…' : name;
}

function selectMediaItem(m) {
  S.selMedia = m;
  renderMediaGrid();
  updateModalActions();
}

function updateModalActions() {
  const info   = document.getElementById('media-info');
  const btnCopy= document.getElementById('btn-copy-url');
  const btnIns = document.getElementById('btn-insert-media');
  if (!info) return;
  if (S.selMedia) {
    info.textContent = S.selMedia.name || '';
    if (btnCopy) btnCopy.disabled = false;
    if (btnIns)  btnIns.disabled  = false;
  } else {
    info.textContent = 'Sin selección';
    if (btnCopy) btnCopy.disabled = true;
    if (btnIns)  btnIns.disabled  = true;
  }
}

function copyMediaUrl() {
  if (!S.selMedia) return;
  navigator.clipboard.writeText(S.selMedia.url || '').then(() => toast('URL copiada'));
}

function insertMedia() {
  if (!S.selMedia) return;
  const m = S.selMedia;

  if (S.mediaContext === 'hf-logo' || S.mediaContext === 'hf-image') {
    if (typeof insertMediaForHF === 'function') insertMediaForHF(m);
    closeMov('media-modal');
    return;
  }

  if (S.mediaContext === 'pb-bg' || S.mediaContext === 'pb-comp') {
    if (typeof insertMediaForPB === 'function') insertMediaForPB(m);
    closeMov('media-modal');
    return;
  }

  if (S.mediaContext === 'editor') {
    const ed = document.getElementById('ed-body');
    if (!ed) return;
    ed.focus();

    // Restaurar posición del cursor guardada antes de abrir el modal
    if (S.savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(S.savedRange);
      S.savedRange = null;
    }

    if (m.type === 'images') {
      document.execCommand('insertHTML', false,
        `<img src="${escH(m.url)}" alt="${escH(m.name||'')}" style="max-width:100%;height:auto">`);
    } else if (m.type === 'audio') {
      document.execCommand('insertHTML', false,
        `<audio controls src="${escH(m.url)}"></audio>`);
    } else if (m.type === 'video') {
      document.execCommand('insertHTML', false,
        `<video controls src="${escH(m.url)}" style="max-width:100%"></video>`);
    } else {
      document.execCommand('insertHTML', false,
        `<a href="${escH(m.url)}" target="_blank">${escH(m.name||m.url)}</a>`);
    }
    toast('Medio insertado en el editor');
  } else if (S.mediaContext === 'block') {
    const b = S.cur.blocks.find(x => x.id === S.selBlock);
    if (b) {
      b.mediaUrl = m.url;
      renderOverlay();
      document.getElementById('pr-media').value = m.url;
      toast('Imagen asignada al bloque');
    }
  }

  closeMov('media-modal');
}

// ── Subida de archivos (modal) ─────────────────────────────────
function handleFileDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag');
  uploadFiles(Array.from(e.dataTransfer.files));
}

function handleFileSelect(e) {
  uploadFiles(Array.from(e.target.files));
  e.target.value = '';
}

async function uploadFiles(files) {
  if (!files.length) return;
  const prog  = document.getElementById('upload-progress');
  const bar   = document.getElementById('upload-bar');
  if (prog) prog.style.display = 'block';

  for (let i = 0; i < files.length; i++) {
    const pct = Math.round((i / files.length) * 100);
    if (bar) bar.style.width = pct + '%';

    const fd = new FormData();
    fd.append('file', files[i]);
    try {
      await api.upload('upload', fd);
    } catch(e) {
      console.warn('upload error', e);
    }
  }
  if (bar) bar.style.width = '100%';
  setTimeout(() => { if (prog) prog.style.display = 'none'; }, 600);

  await loadMedia();
  toast(`${files.length} archivo${files.length>1?'s':''} subido${files.length>1?'s':''}`);
}

// ── Pestaña Medios (biblioteca completa) ──────────────────────
function renderMediosGrid() {
  const el = document.getElementById('medios-grid');
  if (!el) return;
  const items = S.mediosFilter === 'all'
    ? S.media
    : S.media.filter(m => m.type === S.mediosFilter);

  if (!items.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:32px;text-align:center">Sin archivos en esta categoría</div>';
    return;
  }
  el.innerHTML = items.map(m => {
    const sel  = S.selMedios?.id === m.id || S.selMedios?.name === m.name;
    const safe = JSON.stringify(m).replace(/"/g,'&quot;');
    return `<div class="medios-item ${sel ? 'sel' : ''}"
         onclick="selectMediosItem(${safe})">
      ${m.type === 'images'
        ? `<img class="medios-thumb" src="${escH(m.url||'')}" alt="${escH(m.name||'')}">`
        : `<div class="medios-icon">${{audio:'🎵',video:'🎬',docs:'📄'}[m.type]||'📎'}</div>`
      }
      <div class="medios-name">${escH(shortName(m.name||''))}</div>
    </div>`;
  }).join('');
}

function filterMediosTab(type, btn) {
  S.mediosFilter = type;
  document.querySelectorAll('#medios-filter-tabs .mmtab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderMediosGrid();
}

function selectMediosItem(m) {
  S.selMedios = m;
  renderMediosGrid();
  renderMediosDetail(m);
}

function buildMediaPreviewEl(m) {
  const url = escH(m.url || '');
  switch (m.type) {
    case 'images':
      return `<img id="medios-preview" src="${url}" alt="${escH(m.name||'')}"
               style="max-width:100%;max-height:220px;border-radius:6px;object-fit:contain;display:block;margin:0 auto">`;
    case 'audio':
      return `<div style="padding:10px 4px">
        <div style="font-size:40px;text-align:center;margin-bottom:8px">🎵</div>
        <audio controls src="${url}" style="width:100%;border-radius:6px"></audio>
      </div>`;
    case 'video':
      return `<video controls src="${url}"
               style="width:100%;max-height:200px;border-radius:6px;background:#000;display:block"></video>`;
    case 'docs': {
      const mime = (m.mime || '').toLowerCase();
      if (mime.includes('pdf')) {
        return `<iframe src="${url}" style="width:100%;height:240px;border:1px solid #e2e8f0;
                 border-radius:6px;background:#f8fafc" title="${escH(m.name||'PDF')}"></iframe>`;
      }
      // Otros docs: icono + enlace de apertura
      const icons = {'application/msword':'📝','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'📝',
                     'text/plain':'📄','text/markdown':'📄'};
      const ic = icons[mime] || '📎';
      return `<div style="font-size:48px;text-align:center;padding:12px">${ic}</div>
              <a href="${url}" target="_blank" rel="noopener"
                 style="display:block;text-align:center;font-size:12px;color:#5068e8;margin-top:4px">
                 ↗ Abrir en nueva pestaña</a>`;
    }
    default:
      return `<div style="font-size:48px;text-align:center;padding:12px">📎</div>`;
  }
}

function renderMediosDetail(m) {
  const el = document.getElementById('medios-detail');
  if (!el) return;
  const sizeStr = m.size ? formatBytes(m.size) : '—';
  const urlSafe = escH(m.url || '');
  const idSafe  = escH(String(m.id || m.name || ''));
  const nameSafe= escH(m.name || '');

  el.innerHTML = `
    <div style="margin-bottom:10px;width:100%">
      ${buildMediaPreviewEl(m)}
    </div>
    <div style="width:100%;font-size:12px;text-align:left;margin-bottom:12px">
      <div style="padding:5px 0;border-bottom:1px solid #f1f5f9"><strong>Nombre</strong><br>
        <span style="color:#64748b;word-break:break-all">${nameSafe}</span></div>
      <div style="padding:5px 0;border-bottom:1px solid #f1f5f9"><strong>Tipo</strong><br>
        <span style="color:#64748b">${escH(m.mime||m.type||'')}</span></div>
      <div style="padding:5px 0;border-bottom:1px solid #f1f5f9"><strong>Tamaño</strong><br>
        <span style="color:#64748b">${sizeStr}</span></div>
      <div style="padding:5px 0"><strong>URL</strong><br>
        <input class="sinp" style="width:100%;font-size:11px;margin-top:3px"
               value="${urlSafe}" readonly onclick="this.select()">
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;width:100%">
      <button class="btn btn-primary btn-sm"
        onclick="navigator.clipboard.writeText('${urlSafe}');toast('URL copiada')">📋 Copiar URL</button>
      <a class="btn btn-ghost btn-sm" href="${urlSafe}" target="_blank" download
         style="border:1px solid #e2e8f0;color:#334155;justify-content:center">⬇ Descargar</a>
      <button class="btn btn-red btn-sm"
        onclick="confirmDeleteMedia('${idSafe}','${nameSafe}')">🗑 Eliminar</button>
    </div>
  `;
}

async function confirmDeleteMedia(id, name) {
  if (!confirm(`¿Eliminar "${name}"? No se puede deshacer.`)) return;
  try {
    const r = await api.post('delete-media', {id});
    if (r && r.ok) {
      toast('Archivo eliminado');
      S.selMedios = null;
      document.getElementById('medios-detail').innerHTML =
        '<div class="medios-detail-empty">Selecciona un archivo<br>para ver sus detalles</div>';
      await loadMedia();
    } else {
      toast('Error: ' + (r?.error||''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message||''));
  }
}

// ── Subida en pestaña Medios ───────────────────────────────────
function handleMediosUpload(e) {
  uploadFiles(Array.from(e.target.files));
  e.target.value = '';
}

function handleMediosDrop(e) {
  e.preventDefault();
  document.getElementById('medios-drop-zone').classList.remove('drag');
  uploadFiles(Array.from(e.dataTransfer.files));
}

// ── Utilidades ─────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sz = ['B','KB','MB','GB'];
  const i  = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k,i)).toFixed(1)) + ' ' + sz[i];
}
