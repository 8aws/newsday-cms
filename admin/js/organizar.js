// ════════════════════════════════════════════════════════════════
//  organizar.js — Pestaña Organizar: homepage, portadas,
//                 plantillas de sección, asignación de bloques,
//                 navegación y zonas de anuncio
// ════════════════════════════════════════════════════════════════

// ── Guardar pestaña Organizar ─────────────────────────────────
async function saveOrganizar() {
  gatherNavFromDOM();
  gatherAdsFromDOM();

  // Recoger sectionTemplates de los selects del DOM
  ['posts','single','page'].forEach(k => {
    const el = document.getElementById('tpl-' + k);
    if (el) {
      if (!S.siteConfig.sectionTemplates) S.siteConfig.sectionTemplates = {};
      S.siteConfig.sectionTemplates[k] = el.value;
    }
  });

  // Recoger siteStructure desde el DOM (tipo de homepage + referencias)
  if (!S.siteConfig.siteStructure) S.siteConfig.siteStructure = {};
  const activeCard = document.querySelector('.hp-card.hp-card--active');
  if (activeCard) S.siteConfig.siteStructure.homepage = activeCard.dataset.type || 'posts';
  const portadaSel = document.getElementById('hp-portada-ref');
  if (portadaSel) S.siteConfig.siteStructure.activePortada = portadaSel.value;
  const pageSel = document.getElementById('hp-page-ref');
  if (pageSel) S.siteConfig.siteStructure.homepageRef = pageSel.value;

  const ok = await saveSiteConfig();
  const msg = document.getElementById('org-save-msg');
  if (msg) {
    msg.textContent = ok ? '✓ Guardado' : '✗ Error';
    msg.style.color = ok ? '#16a34a' : '#dc2626';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  }
  if (ok) toast('Configuración guardada');
}

// ── Render completo de la pestaña Organizar ───────────────────
function renderOrganizar() {
  renderHomepageState();
  renderNavList();
  renderAdsList();
  loadLayouts();
  populateLayoutSelects();
  if (typeof renderTagsGrid === 'function') renderTagsGrid();
}

// ════════════════════════════════════════════════════════════════
//  HOMEPAGE TYPE
// ════════════════════════════════════════════════════════════════

function setHomepageType(type, el) {
  document.querySelectorAll('.hp-card').forEach(c => c.classList.remove('hp-card--active'));
  if (el) el.classList.add('hp-card--active');
  S.siteConfig.siteStructure = S.siteConfig.siteStructure || {};
  S.siteConfig.siteStructure.homepage = type;
  const ps = document.getElementById('hp-page-selector');
  const po = document.getElementById('hp-portada-selector');
  if (ps) ps.style.display = type === 'page'    ? '' : 'none';
  if (po) po.style.display = type === 'portada' ? '' : 'none';
}

function renderHomepageState() {
  const st   = S.siteConfig.siteStructure || {};
  const type = st.homepage || 'posts';
  document.querySelectorAll('.hp-card').forEach(c => {
    c.classList.toggle('hp-card--active', c.dataset.type === type);
  });
  const ps = document.getElementById('hp-page-selector');
  const po = document.getElementById('hp-portada-selector');
  if (ps) ps.style.display = type === 'page'    ? '' : 'none';
  if (po) po.style.display = type === 'portada' ? '' : 'none';
}

// ════════════════════════════════════════════════════════════════
//  PORTADAS
// ════════════════════════════════════════════════════════════════

async function loadLayouts() {
  try {
    const r = await api.call('layouts');
    S.layouts = r || [];
    renderPortadasGrid();
    populateLayoutSelects();
  } catch(e) { console.warn('loadLayouts:', e); }
}

function renderPortadasGrid() {
  const el = document.getElementById('portadas-grid');
  if (!el) return;
  const portadas = S.layouts.filter(l => l.purpose === 'portada');
  if (!portadas.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:24px">Sin portadas guardadas. Diseña un layout en Maquetar y guárdalo con propósito «Portada».</div>';
    return;
  }
  const active = S.siteConfig.siteStructure?.activePortada || '';
  el.innerHTML = portadas.map(p => `
    <div class="portada-card ${p.id === active ? 'portada-card--active' : ''}">
      <div class="portada-thumb">${generateLayoutThumb(p.blocks)}</div>
      <div class="portada-info">
        <div class="portada-name">${escH(p.name)}</div>
        ${p.id === active ? '<span class="portada-badge">● Activa</span>' : ''}
      </div>
      <div class="portada-actions">
        ${p.id !== active
          ? `<button class="btn btn-primary btn-sm" onclick="activatePortada('${p.id}')">Activar</button>`
          : ''}
        <button class="btn btn-ghost btn-sm" onclick="editLayout('${p.id}')">✎ Editar</button>
        <button class="btn btn-red   btn-sm" onclick="deleteLayout('${p.id}')">✕</button>
      </div>
    </div>
  `).join('');
}

function generateLayoutThumb(blocks) {
  if (!blocks || !blocks.length) {
    return '<svg viewBox="0 0 120 80" fill="none"><rect width="120" height="80" rx="4" fill="#f1f5f9"/>'
         + '<text x="60" y="44" text-anchor="middle" fill="#94a3b8" font-size="10">Sin bloques</text></svg>';
  }
  const W = 120, H = 80, cols = 12, rows = 16;
  const cw = W / cols, rh = H / rows;
  const colors = {
    header:'#334155', nav:'#475569', footer:'#334155',
    content:'#bfdbfe', sidebar:'#ddd6fe', image:'#bbf7d0',
    text:'#e2e8f0', pullquote:'#fde68a', ad:'#fca5a5',
    separator:'#cbd5e1', 'site-logo':'#5068e8', 'site-title':'#5068e8',
    'site-desc':'#94a3b8', 'site-promo':'#f59e0b',
  };
  const rects = blocks.map(b => {
    const x = ((b.c || 1) - 1) * cw, y = ((b.r || 1) - 1) * rh;
    const w = (b.cs || 1) * cw,     h = (b.rs || 1) * rh;
    const fill = colors[b.t] || '#e2e8f0';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(w - .5).toFixed(1)}" height="${(h - .5).toFixed(1)}" rx="1" fill="${fill}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" rx="4" fill="#f8fafc"/>${rects}</svg>`;
}

function activatePortada(id) {
  S.siteConfig.siteStructure = S.siteConfig.siteStructure || {};
  S.siteConfig.siteStructure.activePortada = id;
  S.siteConfig.siteStructure.homepage = 'portada';  // auto-set tipo
  const ps = document.getElementById('hp-portada-ref');
  if (ps) ps.value = id;
  renderPortadasGrid();
  renderHomepageState();
  toast('Portada activada — guarda para aplicar cambios');
}

function newPortada() {
  const btn = document.querySelector('[data-tab="maquetar"]');
  if (btn) btn.click();
  toast('Diseña tu portada y usa «Guardar como plantilla» → Portada');
}

function editLayout(id) {
  const layout = S.layouts.find(l => l.id === id);
  if (!layout) return;
  S.cur.blocks = (layout.blocks || []).map(b => ({...b, id: b.id || ('b' + (++S.nextId))}));
  if (typeof renderGrid === 'function') renderGrid();
  S._editingLayoutId = id;
  const btn = document.querySelector('[data-tab="maquetar"]');
  if (btn) btn.click();
  toast(`Editando plantilla "${layout.name}". Usa «Guardar como plantilla» para guardar cambios.`);
}

async function deleteLayout(id) {
  const layout = S.layouts.find(l => l.id === id);
  if (!layout || !confirm(`¿Eliminar la plantilla "${layout.name}"?`)) return;
  try {
    const r = await api.post('delete-layout', {id});
    if (r && r.ok) {
      S.layouts = S.layouts.filter(l => l.id !== id);
      if (S.siteConfig.siteStructure?.activePortada === id) {
        S.siteConfig.siteStructure.activePortada = '';
      }
      renderPortadasGrid();
      populateLayoutSelects();
      toast('Plantilla eliminada');
    }
  } catch(e) { toast('Error: ' + (e?.message || '')); }
}

// ════════════════════════════════════════════════════════════════
//  PLANTILLAS DE SECCIÓN Y SELECTS
// ════════════════════════════════════════════════════════════════

function populateLayoutSelects() {
  // Selects de plantillas de sección
  ['posts','single','page'].forEach(k => {
    const el  = document.getElementById('tpl-' + k);
    if (!el) return;
    const cur = S.siteConfig.sectionTemplates?.[k] || '';
    el.innerHTML = '<option value="">— Sin plantilla personalizada —</option>'
      + S.layouts.map(l =>
          `<option value="${l.id}" ${l.id === cur ? 'selected' : ''}>${escH(l.name)} (${l.purpose})</option>`
        ).join('');
    if (cur) el.value = cur;
  });

  // Selector de portada activa en homepage
  const ps = document.getElementById('hp-portada-ref');
  if (ps) {
    const portadas = S.layouts.filter(l => l.purpose === 'portada');
    const active   = S.siteConfig.siteStructure?.activePortada || '';
    ps.innerHTML = '<option value="">— Selecciona una portada —</option>'
      + portadas.map(p =>
          `<option value="${p.id}" ${p.id === active ? 'selected' : ''}>${escH(p.name)}</option>`
        ).join('');
    if (active) ps.value = active;
  }

  // Selector de página como homepage
  const pgSel = document.getElementById('hp-page-ref');
  if (pgSel) {
    const ref = S.siteConfig.siteStructure?.homepageRef || '';
    pgSel.innerHTML = '<option value="">— Selecciona una página —</option>'
      + (S.pages || []).map(p =>
          `<option value="${p.slug}" ${p.slug === ref ? 'selected' : ''}>${escH(p.title || p.slug)}</option>`
        ).join('');
    if (ref) pgSel.value = ref;
  }
}

// ════════════════════════════════════════════════════════════════
//  ASIGNACIÓN DE BLOQUES
// ════════════════════════════════════════════════════════════════

function showBlockAssignment(ctx, btn) {
  document.querySelectorAll('.ba-ctx-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');

  const panel = document.getElementById('block-assignment-panel');
  if (!panel) return;

  const layoutId = (ctx === 'portada')
    ? (S.siteConfig.siteStructure?.activePortada || '')
    : (S.siteConfig.sectionTemplates?.[ctx] || '');

  const layout = S.layouts.find(l => l.id === layoutId);
  if (!layoutId || !layout) {
    panel.innerHTML = `<div class="empty-hint" style="padding:20px">
      ${ctx === 'portada'
        ? 'Activa una portada primero (sección Portadas).'
        : 'Asigna una plantilla a este contexto (sección Plantillas de sección).'}
    </div>`;
    return;
  }

  const assignments   = S.siteConfig.blockAssignments?.[layoutId] || {};
  const contentBlocks = (layout.blocks || []).filter(b =>
    !['header','nav','footer','separator'].includes(b.t)
  );

  if (!contentBlocks.length) {
    panel.innerHTML = '<div class="empty-hint" style="padding:20px">Esta plantilla no tiene bloques de contenido asignables.</div>';
    return;
  }

  const typeLabel = {
    content:'Contenido', sidebar:'Lateral', image:'Imagen', text:'Texto',
    pullquote:'Cita', ad:'Publicidad', 'site-logo':'Logo', 'site-title':'Título',
    'site-desc':'Descripción', 'site-promo':'Promo',
  };

  panel.innerHTML = `
    <div class="ba-layout-name">Plantilla: <strong>${escH(layout.name)}</strong></div>
    <div class="ba-blocks">
      ${contentBlocks.map((b, i) => {
        const asgn = assignments[b.id] || {type:'auto', ref:''};
        return `<div class="ba-block-row">
          <div class="ba-block-type">${typeLabel[b.t] || b.t} ${i + 1}</div>
          <select class="sinp ba-type-sel"
            onchange="updateBlockAssignment('${layoutId}','${b.id}','type',this.value,this)">
            <option value="auto" ${asgn.type==='auto'?'selected':''}>Auto (CMS decide)</option>
            <option value="post" ${asgn.type==='post'?'selected':''}>Post específico</option>
            <option value="page" ${asgn.type==='page'?'selected':''}>Página específica</option>
            <option value="tag"  ${asgn.type==='tag' ?'selected':''}>Categoría/Tag</option>
            <option value="ad"   ${asgn.type==='ad'  ?'selected':''}>Zona de anuncio</option>
            <option value="text" ${asgn.type==='text'?'selected':''}>Texto libre</option>
          </select>
          <div class="ba-ref-wrap" id="ba-ref-${b.id}">
            ${renderBlockRefField(b.id, asgn, layoutId)}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderBlockRefField(blockId, asgn, layoutId) {
  switch(asgn.type) {
    case 'post':
      return `<select class="sinp" onchange="updateBlockAssignment('${layoutId}','${blockId}','ref',this.value)">
        <option value="">— Elige post —</option>
        ${(S.posts||[]).map(p => `<option value="${p.id}" ${p.id===asgn.ref?'selected':''}>${escH(p.title||p.slug)}</option>`).join('')}
      </select>`;
    case 'page':
      return `<select class="sinp" onchange="updateBlockAssignment('${layoutId}','${blockId}','ref',this.value)">
        <option value="">— Elige página —</option>
        ${(S.pages||[]).map(p => `<option value="${p.slug}" ${p.slug===asgn.ref?'selected':''}>${escH(p.title||p.slug)}</option>`).join('')}
      </select>`;
    case 'tag':
      return `<input class="sinp" placeholder="slug del tag" value="${escH(asgn.ref||'')}"
               onchange="updateBlockAssignment('${layoutId}','${blockId}','ref',this.value)">`;
    case 'ad':
      return `<select class="sinp" onchange="updateBlockAssignment('${layoutId}','${blockId}','ref',this.value)">
        <option value="">— Elige zona de anuncio —</option>
        ${(S.siteConfig.adZones||[]).map(z => `<option value="${z.name}" ${z.name===asgn.ref?'selected':''}>${escH(z.name)}</option>`).join('')}
      </select>`;
    case 'text':
      return `<input class="sinp" placeholder="Texto libre…" value="${escH(asgn.ref||'')}"
               onchange="updateBlockAssignment('${layoutId}','${blockId}','ref',this.value)">`;
    default:
      return '<span style="font-size:12px;color:#94a3b8;padding:0 8px">El CMS elige el contenido</span>';
  }
}

function updateBlockAssignment(layoutId, blockId, field, value) {
  if (!S.siteConfig.blockAssignments) S.siteConfig.blockAssignments = {};
  if (!S.siteConfig.blockAssignments[layoutId]) S.siteConfig.blockAssignments[layoutId] = {};
  if (!S.siteConfig.blockAssignments[layoutId][blockId]) {
    S.siteConfig.blockAssignments[layoutId][blockId] = {type:'auto', ref:''};
  }
  S.siteConfig.blockAssignments[layoutId][blockId][field] = value;
  if (field === 'type') {
    const wrap = document.getElementById('ba-ref-' + blockId);
    if (wrap) wrap.innerHTML = renderBlockRefField(blockId, S.siteConfig.blockAssignments[layoutId][blockId], layoutId);
  }
}

// ════════════════════════════════════════════════════════════════
//  NAVEGACIÓN
// ════════════════════════════════════════════════════════════════

function renderNavList() {
  const el = document.getElementById('nav-list');
  if (!el) return;
  const items = S.siteConfig.nav || [];
  if (!items.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:12px">Sin enlaces de navegación</div>';
    return;
  }
  el.innerHTML = items.map((item, i) => {
    let refField;
    if (item.type === 'external') {
      refField = `<input class="sinp" style="flex:2" placeholder="https://…" value="${escH(item.href||'')}" data-field="href">`;
    } else if (item.type === 'tag') {
      refField = `<select class="sinp" style="flex:2" data-field="href">
        <option value="">— Tag —</option>
        ${getAllTags().map(t => `<option value="${t}" ${item.href===t?'selected':''}>${escH(t)}</option>`).join('')}
      </select>`;
    } else if (item.type === 'post') {
      refField = `<select class="sinp" style="flex:2" data-field="href">
        <option value="">— Post —</option>
        ${(S.posts||[]).map(p => `<option value="${escH(p.slug)}" ${item.href===p.slug?'selected':''}>${escH(p.title||p.slug)}</option>`).join('')}
      </select>`;
    } else { // page (default)
      refField = `<select class="sinp" style="flex:2" data-field="href">
        <option value="">— Página —</option>
        ${(S.pages||[]).map(p => `<option value="${escH(p.slug)}" ${item.href===p.slug?'selected':''}>${escH(p.title||p.slug)}</option>`).join('')}
      </select>`;
    }
    return `<div class="ni-row" data-idx="${i}" style="display:flex;gap:5px;align-items:center;padding:6px 0;border-bottom:1px solid #f8fafc">
      <select class="sinp" style="width:120px" data-field="type" onchange="onNavTypeChange(${i},this)">
        <option value="page"     ${item.type==='page'    ?'selected':''}>Página</option>
        <option value="post"     ${item.type==='post'    ?'selected':''}>Post</option>
        <option value="tag"      ${item.type==='tag'     ?'selected':''}>Tag</option>
        <option value="external" ${item.type==='external'?'selected':''}>URL externa</option>
      </select>
      <input class="sinp" style="width:130px" placeholder="Etiqueta menú" value="${escH(item.label||'')}" data-field="label">
      ${refField}
      <button class="btn btn-ghost btn-sm" onclick="moveNavItem(${i},-1)" title="Subir">↑</button>
      <button class="btn btn-ghost btn-sm" onclick="moveNavItem(${i},1)"  title="Bajar">↓</button>
      <button class="btn btn-red   btn-sm" onclick="removeNavItem(${i})">✕</button>
    </div>`;
  }).join('');
}

function onNavTypeChange(i, sel) {
  S.siteConfig.nav[i].type = sel.value;
  S.siteConfig.nav[i].href = '';
  renderNavList();
}

function getAllTags() {
  const tags = new Set();
  (S.posts || []).forEach(p => {
    (p.tags || '').split(',').forEach(t => { t = t.trim(); if (t) tags.add(t); });
  });
  return [...tags].sort();
}

function addNavItem() {
  S.siteConfig.nav.push({type:'page', label:'', href:''});
  renderNavList();
}

function removeNavItem(i) {
  S.siteConfig.nav.splice(i, 1);
  renderNavList();
}

function moveNavItem(i, dir) {
  const nav = S.siteConfig.nav;
  const j   = i + dir;
  if (j < 0 || j >= nav.length) return;
  [nav[i], nav[j]] = [nav[j], nav[i]];
  renderNavList();
}

function gatherNavFromDOM() {
  const rows = document.querySelectorAll('#nav-list .ni-row');
  S.siteConfig.nav = Array.from(rows).map(row => ({
    type:  row.querySelector('[data-field=type]')?.value  || 'page',
    label: row.querySelector('[data-field=label]')?.value || '',
    href:  row.querySelector('[data-field=href]')?.value  || '',
  }));
}

// ════════════════════════════════════════════════════════════════
//  ZONAS DE ANUNCIO
// ════════════════════════════════════════════════════════════════

function renderAdsList() {
  const el = document.getElementById('ads-list');
  if (!el) return;
  const zones = S.siteConfig.adZones || [];
  if (!zones.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:12px">Sin zonas de anuncio</div>';
    return;
  }
  el.innerHTML = zones.map((z, i) => `
    <div class="az-zone" data-idx="${i}">
      <div class="az-head">
        <input class="sinp az-label" style="width:180px" placeholder="Nombre (ej: banner-top)"
               value="${escH(z.name||'')}" data-field="name">
        <select class="sinp" style="width:160px" data-field="adtype">
          <option value="adsense" ${z.adtype==='adsense'?'selected':''}>AdSense</option>
          <option value="image"   ${z.adtype==='image'  ?'selected':''}>Imagen con enlace</option>
          <option value="html"    ${z.adtype==='html'   ?'selected':''}>HTML personalizado</option>
        </select>
        <button class="btn btn-red btn-sm" onclick="removeAdZone(${i})">✕ Eliminar</button>
      </div>
      <textarea class="az-code" rows="3" placeholder="Código AdSense / URL / HTML…" data-field="code">${escH(z.code||'')}</textarea>
    </div>
  `).join('');
}

function addAdZone() {
  S.siteConfig.adZones.push({name:'', adtype:'adsense', code:''});
  renderAdsList();
}

function removeAdZone(i) {
  S.siteConfig.adZones.splice(i, 1);
  renderAdsList();
}

function gatherAdsFromDOM() {
  const rows = document.querySelectorAll('#ads-list .az-zone');
  S.siteConfig.adZones = Array.from(rows).map(row => ({
    name:   row.querySelector('[data-field=name]')?.value   || '',
    adtype: row.querySelector('[data-field=adtype]')?.value || 'adsense',
    code:   row.querySelector('[data-field=code]')?.value   || '',
  }));
}
