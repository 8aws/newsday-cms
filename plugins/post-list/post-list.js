// ── Newsday Plugin: Lista de posts ───────────────────────────
//
//  Plugin dinámico: lee window.S.posts para renderizar artículos
//  publicados en tiempo real dentro del constructor de páginas.
//
//  Layouts:  grid | list | magazine
//  Filtros:  tag/etiqueta, cantidad máxima, orden
// ────────────────────────────────────────────────────────────

ND.registerPlugin({
  id: 'post-list',
  name: 'Lista de posts',
  version: '1.0.0',

  components: [{
    type: 'post-list',
    ic: '📰',
    lb: 'Lista de posts',
    hint: 'Grid, lista o magazine de artículos recientes',

    defaultData() {
      return {
        heading:     '',
        count:       6,
        tag:         '',
        layout:      'grid',
        cols:        '3',
        showDate:    true,
        showTags:    true,
        accentColor: '#5068e8',
      };
    },

    renderFields(d, si, ci) {
      // Recopilar etiquetas disponibles de S.posts para el selector
      const allTags = _ndPlGetTags();
      const tagOpts = allTags.map(t =>
        `<option value="${_ndEH(t)}" ${d.tag === t ? 'selected' : ''}>${_ndEH(t)}</option>`
      ).join('');

      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Título del bloque</span>
          <input class="sinp" style="flex:1" placeholder="Deja vacío para omitir…"
                 value="${_ndEH(d.heading || '')}"
                 oninput="pbSetCmpField(${si},${ci},'heading',this.value)">
          <button class="btn btn-ghost btn-sm" style="margin-left:6px;white-space:nowrap"
                  onclick="(typeof loadPostsFromBackend==='function')&&loadPostsFromBackend().then(()=>{pbSchedulePreview();_pbRefreshCmp(${si},${ci});}).catch(()=>{})"
                  title="Recargar posts del servidor">↺ Actualizar</button>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Estilo</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'layout',this.value)">
            ${[['grid','Cuadrícula'],['list','Lista'],['magazine','Magazine']].map(([v,l]) =>
              `<option value="${v}" ${d.layout===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Columnas</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'cols',this.value)">
            ${['2','3','4'].map(v => `<option value="${v}" ${d.cols==v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Cantidad</span>
          <input class="sinp" style="width:60px" type="number" min="1" max="50"
                 value="${d.count || 6}"
                 oninput="pbSetCmpField(${si},${ci},'count',+this.value)">
          <span class="pb-field-lbl" style="margin-left:8px">Etiqueta</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'tag',this.value)">
            <option value="">— Todas —</option>
            ${tagOpts}
          </select>
        </div>
        <div class="pb-field-row">
          <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer">
            <input type="checkbox" ${d.showDate!==false?'checked':''}
                   onchange="pbSetCmpField(${si},${ci},'showDate',this.checked)">
            Mostrar fecha
          </label>
          <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer;margin-left:10px">
            <input type="checkbox" ${d.showTags!==false?'checked':''}
                   onchange="pbSetCmpField(${si},${ci},'showTags',this.checked)">
            Mostrar etiquetas
          </label>
          <span class="pb-field-lbl" style="margin-left:auto">Color</span>
          <input type="color" class="pb-color-inp" value="${d.accentColor || '#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'accentColor',this.value)">
        </div>`;
    },

    renderHTML(d) {
      // ── Obtener posts (excluir borradores para la vista previa) ──
      let posts = (window.S?.posts || []).filter(p => p.status !== 'draft');

      // Filtrar por etiqueta
      const filterTag = (d.tag || '').trim().toLowerCase();
      if (filterTag) {
        posts = posts.filter(p =>
          (p.tags || '').split(',').map(t => t.trim().toLowerCase()).includes(filterTag)
        );
      }

      // Ordenar por fecha descendente y limitar
      posts = [...posts]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, Math.max(1, d.count || 6));

      const accent  = d.accentColor || '#5068e8';
      const cols    = parseInt(d.cols || '3', 10);
      const layout  = d.layout || 'grid';
      const heading = d.heading
        ? `<h2 class="nd-pl-heading">${_ndEH(d.heading)}</h2>` : '';

      // ── Sin posts ─────────────────────────────────────────────
      if (!posts.length) {
        return `<div class="nd-post-list" style="--pl-accent:${accent}">
          ${heading}
          <div class="nd-pl-empty">
            <span>📭</span>
            <p>No hay artículos publicados${filterTag ? ` con la etiqueta "${filterTag}"` : ''} aún.</p>
          </div>
        </div>`;
      }

      // ── Magazine ──────────────────────────────────────────────
      if (layout === 'magazine') {
        const [feat, ...rest] = posts;
        const featHtml = `<a class="nd-pl-mag-feat" href="${_ndPlUrl(feat.slug)}">
          <div class="nd-pl-mag-feat-body">
            <div class="nd-pl-meta">
              ${d.showDate && feat.date ? `<time>${_ndEH(feat.date)}</time>` : ''}
              ${d.showTags ? _ndPlTagBadges(feat.tags, accent) : ''}
            </div>
            <h2 class="nd-pl-mag-title">${_ndEH(feat.title || '')}</h2>
          </div>
        </a>`;
        const restHtml = rest.map(p => `
          <a class="nd-pl-mag-item" href="${_ndPlUrl(p.slug)}">
            <div class="nd-pl-mag-item-body">
              ${d.showDate && p.date ? `<time class="nd-pl-date">${_ndEH(p.date)}</time>` : ''}
              <div class="nd-pl-title">${_ndEH(p.title || '')}</div>
              ${d.showTags ? _ndPlTagBadges(p.tags, accent) : ''}
            </div>
          </a>`).join('');
        return `<div class="nd-post-list nd-pl-magazine" style="--pl-accent:${accent}">
          ${heading}
          ${featHtml}
          ${rest.length ? `<div class="nd-pl-mag-rest">${restHtml}</div>` : ''}
        </div>`;
      }

      // ── Lista ─────────────────────────────────────────────────
      if (layout === 'list') {
        const items = posts.map(p => `
          <a class="nd-pl-list-item" href="${_ndPlUrl(p.slug)}">
            <div class="nd-pl-list-body">
              <div class="nd-pl-title">${_ndEH(p.title || '')}</div>
              <div class="nd-pl-list-meta">
                ${d.showDate && p.date ? `<time class="nd-pl-date">${_ndEH(p.date)}</time>` : ''}
                ${d.showTags ? _ndPlTagBadges(p.tags, accent) : ''}
              </div>
            </div>
            <span class="nd-pl-arrow">→</span>
          </a>`).join('');
        return `<div class="nd-post-list nd-pl-list" style="--pl-accent:${accent}">
          ${heading}
          <div class="nd-pl-list-wrap">${items}</div>
        </div>`;
      }

      // ── Grid (por defecto) ────────────────────────────────────
      const cards = posts.map(p => `
        <a class="nd-pl-card" href="${_ndPlUrl(p.slug)}">
          <div class="nd-pl-card-body">
            <div class="nd-pl-title">${_ndEH(p.title || '')}</div>
            <div class="nd-pl-meta">
              ${d.showDate && p.date ? `<time class="nd-pl-date">${_ndEH(p.date)}</time>` : ''}
              ${d.showTags ? _ndPlTagBadges(p.tags, accent) : ''}
            </div>
          </div>
          <span class="nd-pl-card-arrow">↗</span>
        </a>`).join('');
      return `<div class="nd-post-list nd-pl-grid" style="--pl-accent:${accent};--pl-cols:${cols}">
        ${heading}
        <div class="nd-pl-grid-wrap">${cards}</div>
      </div>`;
    },

    css: `
.nd-post-list{width:100%}
.nd-pl-heading{font-size:1.6rem;font-weight:800;margin-bottom:24px;color:inherit}
.nd-pl-empty{text-align:center;padding:48px 24px;opacity:.5;display:flex;flex-direction:column;
             align-items:center;gap:12px;font-size:14px}
.nd-pl-empty span{font-size:2.5rem}

/* Grid */
.nd-pl-grid-wrap{display:grid;grid-template-columns:repeat(var(--pl-cols,3),1fr);gap:20px}
@media(max-width:768px){.nd-pl-grid-wrap{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.nd-pl-grid-wrap{grid-template-columns:1fr}}
.nd-pl-card{display:flex;flex-direction:column;justify-content:space-between;
            background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
            border-top:3px solid var(--pl-accent,#5068e8);border-radius:10px;
            padding:20px;text-decoration:none;color:inherit;position:relative;
            transition:transform .15s,box-shadow .15s}
.nd-pl-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.2)}
.nd-pl-card-body{flex:1}
.nd-pl-card-arrow{position:absolute;top:14px;right:14px;opacity:.3;font-size:14px;transition:opacity .15s}
.nd-pl-card:hover .nd-pl-card-arrow{opacity:.9}

/* List */
.nd-pl-list-wrap{display:flex;flex-direction:column;gap:2px}
.nd-pl-list-item{display:flex;align-items:center;justify-content:space-between;gap:12px;
                 padding:14px 16px;border-radius:8px;text-decoration:none;color:inherit;
                 border:1px solid transparent;transition:all .12s}
.nd-pl-list-item:hover{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1)}
.nd-pl-list-body{flex:1;min-width:0}
.nd-pl-arrow{opacity:.4;flex-shrink:0;transition:opacity .12s,transform .12s}
.nd-pl-list-item:hover .nd-pl-arrow{opacity:1;transform:translateX(3px)}
.nd-pl-list-meta{display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap}

/* Magazine */
.nd-pl-mag-feat{display:block;border-radius:12px;overflow:hidden;padding:40px 32px;
                background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.03));
                border:1px solid rgba(255,255,255,.1);text-decoration:none;color:inherit;
                transition:opacity .15s;margin-bottom:16px}
.nd-pl-mag-feat:hover{opacity:.85}
.nd-pl-mag-title{font-size:clamp(1.4rem,3vw,2.2rem);font-weight:800;line-height:1.25;margin-top:12px}
.nd-pl-mag-rest{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.nd-pl-mag-item{display:flex;padding:16px;border:1px solid rgba(255,255,255,.08);
                border-radius:8px;text-decoration:none;color:inherit;transition:background .12s}
.nd-pl-mag-item:hover{background:rgba(255,255,255,.05)}
.nd-pl-mag-item-body{flex:1}

/* Shared */
.nd-pl-title{font-size:.95rem;font-weight:700;line-height:1.4;margin-bottom:6px}
.nd-pl-date{font-size:.75rem;opacity:.55}
.nd-pl-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
.nd-pl-tag{font-size:.7rem;font-weight:600;padding:2px 7px;border-radius:4px;
           background:var(--pl-accent,#5068e8);color:#fff;opacity:.85;text-decoration:none}
`
  }]
});

/* ── Helpers ────────────────────────────────────────────────── */
function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}

function _ndPlUrl(slug) {
  const base = (document.getElementById('cfg-baseurl')?.value || '').replace(/\/$/, '');
  return base ? `${base}/${slug}/` : `../${slug}/`;
}

function _ndPlTagBadges(tags, accent) {
  if (!tags) return '';
  return tags.split(',').map(t => t.trim()).filter(Boolean).map(t =>
    `<a class="nd-pl-tag" href="javascript:void(0)" style="background:${accent || '#5068e8'}">${_ndEH(t)}</a>`
  ).join('');
}

function _ndPlGetTags() {
  const posts = (window.S?.posts || []).filter(p => p.status !== 'draft');
  const set   = new Set();
  posts.forEach(p => (p.tags || '').split(',').forEach(t => { const s = t.trim(); if (s) set.add(s); }));
  return [...set].sort((a, b) => a.localeCompare(b));
}
