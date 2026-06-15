// ════════════════════════════════════════════════════════════════
//  grid.js — Editor de maquetación grid drag & drop
// ════════════════════════════════════════════════════════════════

// ── Tipo de página → propósito de guardado ────────────────────
const MAQ_TYPE_PURPOSE = {
  portada: 'portada',
  posts:   'posts',
  single:  'single',
  page:    'page',
  libre:   'custom',
};

const MAQ_TYPE_LABELS = {
  portada: {ic:'🏠', lb:'Portada',          hint:'Homepage tipo magazine o portada visual'},
  posts:   {ic:'📋', lb:'Lista de posts',   hint:'Página de índice con múltiples artículos'},
  single:  {ic:'📝', lb:'Post individual',  hint:'Layout de un artículo completo'},
  page:    {ic:'📄', lb:'Página estática',  hint:'Página como «Acerca de» o «Contacto»'},
  libre:   {ic:'✦',  lb:'Libre',            hint:'Plantilla multipropósito reutilizable'},
};

// ── Renderizado de la cuadrícula ──────────────────────────────
function renderGrid() {
  const canvas = document.getElementById('gcanvas');
  const ovl    = document.getElementById('govl');
  if (!canvas || !ovl) return;

  const cw = 100 / S.cols;
  const ch = CELL_H;

  canvas.style.height = (S.rows * ch) + 'px';

  if (S.gridOn) {
    let lines = '';
    for (let c = 0; c <= S.cols; c++)
      lines += `<div style="position:absolute;left:${c*cw}%;top:0;bottom:0;width:1px;background:rgba(80,104,232,.15)"></div>`;
    for (let r = 0; r <= S.rows; r++)
      lines += `<div style="position:absolute;top:${r*ch}px;left:0;right:0;height:1px;background:rgba(80,104,232,.15)"></div>`;
    document.getElementById('phi').innerHTML = lines;
    document.getElementById('phi').style.display = '';
  } else {
    document.getElementById('phi').style.display = 'none';
  }

  renderOverlay();
}

function renderOverlay() {
  const ovl = document.getElementById('govl');
  if (!ovl) return;
  const cw = 100 / S.cols;
  const ch = CELL_H;

  ovl.innerHTML = S.cur.blocks.map(b => {
    const left   = ((b.c - 1) * cw).toFixed(4) + '%';
    const top    = ((b.r - 1) * ch) + 'px';
    const width  = (b.cs * cw).toFixed(4) + '%';
    const height = (b.rs * ch) + 'px';
    const sel    = b.id === S.selBlock;
    const btDef  = BT.find(x => x.t === b.t) || {ic:'?', lb:b.t};

    let mediaContent;
    switch (b.t) {
      case 'site-logo':
        mediaContent = `<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;height:100%">
          <svg width="20" height="20" viewBox="0 0 80 80" fill="none">
            <polygon points="12,12 24,12 68,68 56,68" fill="#5068e8"/>
            <rect x="12" y="12" width="12" height="56" fill="#5068e8"/>
            <rect x="56" y="12" width="12" height="56" fill="#5068e8"/>
          </svg>
          <span style="font-weight:800;font-size:10px;letter-spacing:2px;color:#12122a">LOGO</span>
        </div>`;
        break;
      case 'site-title':
        mediaContent = `<div style="display:flex;align-items:center;padding:0 8px;height:100%;font-weight:700;font-size:13px;color:#12122a">{Título del sitio}</div>`;
        break;
      case 'site-desc':
        mediaContent = `<div style="display:flex;align-items:center;padding:0 8px;height:100%;font-size:12px;color:#64748b;font-style:italic">{Descripción}</div>`;
        break;
      case 'site-promo':
        mediaContent = b.tx
          ? `<div style="padding:6px 8px;font-size:12px">${escH(b.tx)}</div>`
          : `<div style="padding:6px 8px;font-size:12px;font-style:italic;color:#94a3b8">{Promo}</div>`;
        break;
      default:
        mediaContent = b.mediaUrl
          ? `<img src="${escH(b.mediaUrl)}" alt="" style="width:100%;height:100%;object-fit:cover">`
          : (b.tx || `<em style="opacity:.5">${btDef.lb}</em>`);
    }

    return `<div class="gblock bt-${escH(b.t||'')}${sel ? ' sel' : ''}" data-id="${b.id}"
      style="left:${left};top:${top};width:${width};height:${height};position:absolute;pointer-events:all;"
      onclick="selectBlock(${b.id})">
      <div class="bh" onmousedown="startDrag(event,${b.id})">
        <span>${btDef.ic}</span>
        <span>${btDef.lb}</span>
        <span class="bdel" onclick="event.stopPropagation();event.preventDefault();delBlock(${b.id})">✕</span>
      </div>
      <div class="bcnt">${mediaContent}</div>
      <div class="brsz" onmousedown="startResize(event,${b.id})">◢</div>
    </div>`;
  }).join('');

  // Ghost placeholder durante drag de colocación
  if (S.placing && S.ps && S.pe) {
    const gs = gridSel();
    if (gs) {
      const left   = ((gs.c - 1) * cw).toFixed(4) + '%';
      const top    = ((gs.r - 1) * ch) + 'px';
      const width  = (gs.cs * cw).toFixed(4) + '%';
      const height = (gs.rs * ch) + 'px';
      ovl.insertAdjacentHTML('beforeend',
        `<div style="position:absolute;left:${left};top:${top};width:${width};height:${height};
          background:rgba(80,104,232,.2);border:2px dashed var(--blue);border-radius:3px;
          pointer-events:none;z-index:20"></div>`);
    }
  }
}

// ── Selector de tipo de página ────────────────────────────────
function setMaqPageType(type, el) {
  S.maqPageType = type;
  document.querySelectorAll('.maq-type-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  else {
    const found = document.querySelector(`.maq-type-card[data-type="${type}"]`);
    if (found) found.classList.add('active');
  }
  renderMaqSavedLayouts();
}

function renderMaqSavedLayouts() {
  const el = document.getElementById('maq-saved-layouts');
  if (!el) return;
  const purpose = MAQ_TYPE_PURPOSE[S.maqPageType] || S.maqPageType;
  const layouts = (S.layouts || []).filter(l => l.purpose === purpose);

  // Update count badge
  const badge = document.getElementById('maq-saved-count');
  if (badge) {
    badge.textContent = layouts.length || '';
    badge.classList.toggle('vis', layouts.length > 0);
  }

  if (!layouts.length) {
    el.innerHTML = '<div class="maq-no-saved">Sin plantillas guardadas para este tipo — diseña una nueva abajo ↓</div>';
    return;
  }

  el.innerHTML = layouts.map(l => {
    const isEditing = l.id === S._editingLayoutId;
    return `<div class="maq-saved-card ${isEditing ? 'maq-saved-card--active' : ''}" onclick="loadLayoutIntoGrid('${l.id}')">
      <div class="maq-saved-thumb">${generateLayoutThumb(l.blocks)}</div>
      <div class="maq-saved-info">
        <div class="maq-saved-name">${escH(l.name)}</div>
        ${isEditing ? '<div class="maq-saved-badge">✎ Editando</div>' : ''}
      </div>
      <span class="maq-saved-del" onclick="event.stopPropagation();deleteLayout('${l.id}','${escH(l.name)}')" title="Eliminar plantilla">✕</span>
    </div>`;
  }).join('');
}

function loadLayoutIntoGrid(id) {
  const layout = S.layouts.find(l => l.id === id);
  if (!layout) return;
  if (S.cur.blocks.length && !confirm(`¿Cargar la plantilla "${layout.name}"? El canvas actual se perderá.`)) return;
  S.cur.blocks = (layout.blocks || []).map(b => ({...b, id: b.id ?? (S.nextId++)}));
  S._editingLayoutId = id;
  S.selBlock = null;
  hideProps();

  // Sincronizar cols/rows si el layout los tiene
  if (layout.cols) {
    S.cols = layout.cols;
    const colsSel = document.getElementById('cols-sel');
    if (colsSel) colsSel.value = String(S.cols);
  }
  renderGrid();
  renderMaqSavedLayouts(); // update "Editando" badge
  toast(`Plantilla "${layout.name}" cargada`);
}

function newMaqLayout() {
  if (S.cur.blocks.length && !confirm('¿Descartar el canvas actual y empezar desde cero?')) return;
  S.cur.blocks = [];
  S._editingLayoutId = null;
  S.selBlock = null;
  hideProps();
  renderGrid();
  renderMaqSavedLayouts();
  toast('Canvas limpiado — listo para diseñar');
}

// ── Paleta de bloques (solo bloques de contenido) ─────────────
function renderPalette() {
  const pal = document.getElementById('palette');
  if (!pal) return;
  // Filtrar bloques hfOnly (header, footer, site-logo, etc.) — esos van a Modelar
  const contentBlocks = BT.filter(bt => !bt.hfOnly);
  pal.innerHTML = '<span id="pal-label">Bloques de contenido:</span>' +
    contentBlocks.map(bt => `
      <div class="pb ${S.selType === bt.t ? 'on' : ''}"
           onclick="selectBlockType('${bt.t}')" title="${bt.lb}">
        <span class="pb-ic">${bt.ic}</span>${bt.lb}
      </div>
    `).join('');
}

function selectBlockType(type) {
  S.selType = (S.selType === type) ? null : type;
  renderPalette();
  const hint = document.getElementById('lt-hint');
  if (hint) hint.textContent = S.selType
    ? `Arrastra sobre la rejilla para colocar un bloque «${S.selType}»`
    : 'Selecciona un tipo de bloque y arrastra sobre la rejilla';
}

// ── Colocación de nuevo bloque ────────────────────────────────
function initGridEvents() {
  const canvas = document.getElementById('gcanvas');
  if (!canvas) return;

  canvas.addEventListener('mousedown', (e) => {
    if (!S.selType) return;
    if (e.target.closest('.blk-cell')) return;
    e.preventDefault();
    S.placing = true;
    S.ps = canvasPos(e, canvas);
    S.pe = {...S.ps};
    renderOverlay();
  });

  canvas.addEventListener('mousemove', (e) => {
    if (S.placing) { S.pe = canvasPos(e, canvas); renderOverlay(); }
    if (S.dragging !== null) doDrag(e);
    if (S.resizing !== null) doResize(e);
  });

  canvas.addEventListener('mouseup', (e) => {
    if (S.placing) {
      S.placing = false;
      const gs = gridSel();
      if (gs && S.selType) placeBlock(S.selType, gs);
      S.ps = S.pe = null;
      renderOverlay();
    }
    if (S.dragging !== null) endDrag();
    if (S.resizing !== null) endResize();
  });

  canvas.addEventListener('mouseleave', () => {
    if (S.placing) { S.placing = false; S.ps = S.pe = null; renderOverlay(); }
  });
}

function canvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.max(1, Math.min(S.cols, Math.ceil(x / rect.width * S.cols)));
  const row = Math.max(1, Math.min(S.rows, Math.ceil(y / (S.rows * CELL_H) * S.rows)));
  return {col, row};
}

function gridSel() {
  if (!S.ps || !S.pe) return null;
  const c  = Math.min(S.ps.col, S.pe.col);
  const r  = Math.min(S.ps.row, S.pe.row);
  const cs = Math.abs(S.ps.col - S.pe.col) + 1;
  const rs = Math.abs(S.ps.row - S.pe.row) + 1;
  return {c, r, cs, rs};
}

function placeBlock(type, gs) {
  const btDef = BT.find(b => b.t === type) || BT[0];
  const block = {
    id: S.nextId++,
    t:  type,
    c:  gs.c,
    r:  gs.r,
    cs: gs.cs || btDef.dc[0],
    rs: gs.rs || btDef.dc[1],
    tx: '',
    mediaUrl: '',
  };
  S.cur.blocks.push(block);
  selectBlock(block.id);
  renderOverlay();
  toast(`Bloque ${btDef.lb} añadido`);
}

// ── Selección y propiedades ───────────────────────────────────
function selectBlock(id) {
  S.selBlock = id;
  renderOverlay();
  const b = S.cur.blocks.find(x => x.id === id);
  if (!b) { hideProps(); return; }
  document.getElementById('pr-type').textContent = BT.find(x=>x.t===b.t)?.lb || b.t;
  document.getElementById('pr-col').value   = b.c;
  document.getElementById('pr-row').value   = b.r;
  document.getElementById('pr-cs').value    = b.cs;
  document.getElementById('pr-rs').value    = b.rs;
  document.getElementById('pr-txt').value   = b.tx || '';
  document.getElementById('pr-media').value = b.mediaUrl || '';
  document.getElementById('props').classList.add('vis');
}

function hideProps() {
  document.getElementById('props').classList.remove('vis');
}

function delSelBlock() {
  if (S.selBlock === null) return;
  delBlock(S.selBlock);
}

function delBlock(id) {
  S.cur.blocks = S.cur.blocks.filter(b => b.id !== id);
  if (S.selBlock === id) { S.selBlock = null; hideProps(); }
  renderOverlay();
}

function setProp(prop) {
  const b = S.cur.blocks.find(x => x.id === S.selBlock);
  if (!b) return;
  const vals = {
    col:      () => { b.c  = Math.max(1, +document.getElementById('pr-col').value); },
    row:      () => { b.r  = Math.max(1, +document.getElementById('pr-row').value); },
    colspan:  () => { b.cs = Math.max(1, +document.getElementById('pr-cs').value); },
    rowspan:  () => { b.rs = Math.max(1, +document.getElementById('pr-rs').value); },
    content:  () => { b.tx = document.getElementById('pr-txt').value; },
    mediaUrl: () => { b.mediaUrl = document.getElementById('pr-media').value; },
  };
  if (vals[prop]) vals[prop]();
  renderOverlay();
}

// ── Drag ──────────────────────────────────────────────────────
function startDrag(e, id) {
  if (e.target.classList.contains('blk-resize')) return;
  e.stopPropagation(); e.preventDefault();
  S.dragging = id;
  const b = S.cur.blocks.find(x => x.id === id);
  if (!b) return;
  const canvas = document.getElementById('gcanvas');
  const rect   = canvas.getBoundingClientRect();
  const cw     = rect.width / S.cols;
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  S.dOC = Math.floor(x / cw)    - (b.c - 1);
  S.dOR = Math.floor(y / CELL_H) - (b.r - 1);
  selectBlock(id);
}

function doDrag(e) {
  if (S.dragging === null) return;
  const b = S.cur.blocks.find(x => x.id === S.dragging);
  if (!b) return;
  const canvas = document.getElementById('gcanvas');
  const rect   = canvas.getBoundingClientRect();
  const cw     = rect.width / S.cols;
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const newC = Math.max(1, Math.min(S.cols - b.cs + 1, Math.floor(x / cw)    - S.dOC + 1));
  const newR = Math.max(1, Math.min(S.rows - b.rs + 1, Math.floor(y / CELL_H) - S.dOR + 1));
  if (newC !== b.c || newR !== b.r) { b.c = newC; b.r = newR; renderOverlay(); }
}

function endDrag() { S.dragging = null; }

// ── Resize ────────────────────────────────────────────────────
function startResize(e, id) {
  e.stopPropagation(); e.preventDefault();
  S.resizing = id;
  selectBlock(id);
}

function doResize(e) {
  if (S.resizing === null) return;
  const b = S.cur.blocks.find(x => x.id === S.resizing);
  if (!b) return;
  const canvas = document.getElementById('gcanvas');
  const rect   = canvas.getBoundingClientRect();
  const cw     = rect.width / S.cols;
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  const newCS = Math.max(1, Math.min(S.cols - b.c + 1, Math.round(x / cw)    - b.c + 1));
  const newRS = Math.max(1, Math.min(S.rows - b.r + 1, Math.round(y / CELL_H) - b.r + 1));
  if (newCS !== b.cs || newRS !== b.rs) {
    b.cs = newCS; b.rs = newRS; renderOverlay();
    document.getElementById('pr-cs').value = b.cs;
    document.getElementById('pr-rs').value = b.rs;
  }
}

function endResize() { S.resizing = null; }

// ── Eventos globales ──────────────────────────────────────────
document.addEventListener('mousemove', (e) => {
  if (S.dragging !== null || S.resizing !== null) {
    if (S.dragging !== null) doDrag(e);
    if (S.resizing !== null) doResize(e);
  }
});
document.addEventListener('mouseup', () => {
  if (S.dragging !== null) endDrag();
  if (S.resizing !== null) endResize();
});

// ── Plantillas de inicio ──────────────────────────────────────
function applyTplFromSel() {
  const sel = document.getElementById('starter-tpl-sel');
  if (sel && sel.value) applyTemplate(sel.value);
}

function applyTemplate(name) {
  const tpl = TPLS[name];
  if (!tpl || name === 'blank') {
    if (S.cur.blocks.length && !confirm('¿Limpiar el canvas?')) return;
    S.cur.blocks = [];
    S.selBlock = null;
    hideProps();
    renderGrid();
    toast('Canvas limpiado');
    return;
  }
  if (S.cur.blocks.length && !confirm(`¿Reemplazar el canvas con la plantilla de inicio «${tpl.name}»?`)) return;
  S.cur.blocks = tpl.blocks.map(b => ({
    id: S.nextId++,
    t:  b.t, c: b.c, r: b.r, cs: b.cs, rs: b.rs, tx: b.tx || '', mediaUrl: '',
  }));
  S.selBlock = null;
  hideProps();
  renderGrid();
  toast(`Inicio «${tpl.name}» aplicado`);
  // Reset selector
  const sel = document.getElementById('starter-tpl-sel');
  if (sel) sel.value = '';
}

// ── Controles de dimensión ─────────────────────────────────────
function updateCols() {
  const sel = document.getElementById('cols-sel');
  if (sel) S.cols = +sel.value;
  renderGrid();
}

function updateRows() {
  const sel = document.getElementById('rows-sel');
  if (sel) S.rows = +sel.value;
  renderGrid();
}

function toggleGrid() {
  S.gridOn = !S.gridOn;
  renderGrid();
}

// ── Miniatura SVG para plantilla guardada ─────────────────────
function generateLayoutThumb(blocks) {
  if (!blocks || !blocks.length) return '<svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="28" rx="2" fill="#f1f5f9"/></svg>';
  const cols = 12, rows = 16;
  const rects = blocks.slice(0,8).map(b => {
    const x  = Math.round(((b.col-1) / cols) * 34) + 1;
    const y  = Math.round(((b.row-1) / rows) * 26) + 1;
    const w  = Math.max(2, Math.round((b.colspan / cols) * 34));
    const h  = Math.max(2, Math.round((b.rowspan / rows) * 26));
    const colors = {header:'#12122a',footer:'#1e293b',content:'#e2e8f0',image:'#cbd5e1',
                    nav:'#1e293b',text:'#f1f5f9',sidebar:'#f8fafc',ad:'#fef3c7'};
    const fill = colors[b.t] || '#e2e8f0';
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${fill}"/>`;
  }).join('');
  return `<svg viewBox="0 0 36 28" xmlns="http://www.w3.org/2000/svg">
    <rect width="36" height="28" rx="2" fill="#f8fafc"/>
    ${rects}
  </svg>`;
}

// ── Eliminar plantilla guardada ────────────────────────────────
async function deleteLayout(id, name) {
  if (!confirm(`¿Eliminar la plantilla "${name}"? No se puede deshacer.`)) return;

  if (S.offline) {
    OLS.deleteLayout(id);
    if (S._editingLayoutId === id) { S._editingLayoutId = null; S.cur.blocks = []; renderGrid(); }
    renderMaqSavedLayouts();
    if (typeof renderPortadas === 'function') renderPortadas();
    toast(`Plantilla "${name}" eliminada localmente`);
    return;
  }

  try {
    const r = await api.post('delete-layout', {id});
    if (r && r.ok) {
      S.layouts = (S.layouts || []).filter(l => l.id !== id);
      if (S._editingLayoutId === id) { S._editingLayoutId = null; S.cur.blocks = []; renderGrid(); }
      renderMaqSavedLayouts();
      if (typeof renderPortadas === 'function') renderPortadas();
      toast(`Plantilla "${name}" eliminada`);
    } else {
      toast('Error: ' + (r?.error || ''));
    }
  } catch(e) { toast('Error: ' + (e?.message||'')); }
}

// ── Guardar layout actual como plantilla ──────────────────────
async function saveAsLayout() {
  if (!S.cur.blocks.length) { toast('El canvas está vacío'); return; }

  const existingName = S._editingLayoutId
    ? (S.layouts?.find(l => l.id === S._editingLayoutId)?.name || '')
    : '';
  const name = prompt('Nombre de la plantilla:', existingName);
  if (!name || !name.trim()) return;

  const purpose = MAQ_TYPE_PURPOSE[S.maqPageType] || 'custom';
  const id = S._editingLayoutId || undefined;
  const payload = {id, name: name.trim(), purpose, cols: S.cols, blocks: S.cur.blocks};

  if (S.offline) {
    const r = OLS.saveLayout(payload);
    S._editingLayoutId = r.id;
    toast(`💾 Plantilla "${name.trim()}" guardada localmente`);
    renderMaqSavedLayouts();
    return;
  }

  try {
    const r = await api.post('save-layout', payload);
    if (r && r.ok) {
      S._editingLayoutId = r.id || id;
      toast(`✓ Plantilla "${name.trim()}" guardada`);
      if (typeof loadLayouts === 'function') await loadLayouts();
      renderMaqSavedLayouts();
    } else {
      toast('Error: ' + (r?.error || ''));
    }
  } catch(e) { toast('Error: ' + (e?.message||'')); }
}
