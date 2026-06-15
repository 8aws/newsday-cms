// ── Newsday Plugin: Categorías / Etiquetas ───────────────────
//
//  Deriva las "categorías" de las etiquetas (tags) de los posts
//  publicados y las presenta como pills, tarjetas navegables o lista.
//
//  Al hacer clic en una categoría en el sitio estático, lleva a
//  la página tag/{slug}/ generada por Newsday.
// ────────────────────────────────────────────────────────────

ND.registerPlugin({
  id: 'post-categories',
  name: 'Categorías / Etiquetas',
  version: '1.0.0',

  components: [{
    type: 'post-categories',
    ic: '🏷',
    lb: 'Categorías',
    hint: 'Etiquetas del sitio como categorías navegables',

    defaultData() {
      return {
        heading:     'Categorías',
        style:       'cards',
        maxCount:    0,
        showCount:   true,
        accentColor: '#5068e8',
      };
    },

    renderFields(d, si, ci) {
      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Título</span>
          <input class="sinp" style="flex:1" placeholder="Categorías"
                 value="${_ndEH(d.heading || '')}"
                 oninput="pbSetCmpField(${si},${ci},'heading',this.value)">
          <button class="btn btn-ghost btn-sm" style="margin-left:6px;white-space:nowrap"
                  onclick="(typeof loadPostsFromBackend==='function')&&loadPostsFromBackend().then(()=>{pbSchedulePreview();_pbRefreshCmp(${si},${ci});}).catch(()=>{})"
                  title="Recargar posts del servidor">↺ Actualizar</button>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Estilo</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'style',this.value)">
            ${[['cards','Tarjetas'],['pills','Pills'],['list','Lista']].map(([v,l]) =>
              `<option value="${v}" ${d.style===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Máximo</span>
          <input class="sinp" style="width:60px" type="number" min="0" max="50"
                 value="${d.maxCount || 0}" title="0 = todas"
                 oninput="pbSetCmpField(${si},${ci},'maxCount',+this.value)">
          <label style="font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer;margin-left:10px">
            <input type="checkbox" ${d.showCount!==false?'checked':''}
                   onchange="pbSetCmpField(${si},${ci},'showCount',this.checked)">
            Nº posts
          </label>
          <span class="pb-field-lbl" style="margin-left:8px">Color</span>
          <input type="color" class="pb-color-inp" value="${d.accentColor || '#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'accentColor',this.value)">
        </div>`;
    },

    renderHTML(d) {
      const cats = _ndCatGetAll(d.maxCount || 0);
      const accent  = d.accentColor || '#5068e8';
      const style   = d.style || 'cards';
      const heading = d.heading
        ? `<h2 class="nd-cat-heading">${_ndEH(d.heading)}</h2>` : '';

      if (!cats.length) {
        return `<div class="nd-post-categories" style="--cat-accent:${accent}">
          ${heading}
          <p class="nd-cat-empty">No hay etiquetas aún en los posts publicados.</p>
        </div>`;
      }

      let inner = '';

      if (style === 'pills') {
        inner = `<div class="nd-cat-pills">
          ${cats.map(c => `
            <a class="nd-cat-pill" href="${_ndCatUrl(c.slug)}" style="--cat-accent:${accent}">
              ${_ndEH(c.name)}${d.showCount !== false ? ` <span class="nd-cat-count">${c.count}</span>` : ''}
            </a>`).join('')}
        </div>`;
      } else if (style === 'list') {
        inner = `<ul class="nd-cat-list">
          ${cats.map(c => `
            <li class="nd-cat-list-item">
              <a href="${_ndCatUrl(c.slug)}">${_ndEH(c.name)}</a>
              ${d.showCount !== false ? `<span class="nd-cat-count nd-cat-count--list">${c.count}</span>` : ''}
            </li>`).join('')}
        </ul>`;
      } else {
        // cards (default)
        inner = `<div class="nd-cat-cards">
          ${cats.map(c => `
            <a class="nd-cat-card" href="${_ndCatUrl(c.slug)}" style="--cat-accent:${accent}">
              <span class="nd-cat-card-name">${_ndEH(c.name)}</span>
              ${d.showCount !== false ? `<span class="nd-cat-card-count">${c.count} ${c.count === 1 ? 'post' : 'posts'}</span>` : ''}
            </a>`).join('')}
        </div>`;
      }

      return `<div class="nd-post-categories" style="--cat-accent:${accent}">
        ${heading}
        ${inner}
      </div>`;
    },

    css: `
.nd-post-categories{width:100%}
.nd-cat-heading{font-size:1.5rem;font-weight:800;margin-bottom:20px;color:inherit}
.nd-cat-empty{opacity:.5;font-size:14px}

/* Cards */
.nd-cat-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.nd-cat-card{display:flex;flex-direction:column;gap:6px;padding:18px 16px;
             background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
             border-left:3px solid var(--cat-accent,#5068e8);border-radius:8px;
             text-decoration:none;color:inherit;transition:all .15s}
.nd-cat-card:hover{background:rgba(255,255,255,.09);transform:translateY(-2px)}
.nd-cat-card-name{font-size:.9rem;font-weight:700}
.nd-cat-card-count{font-size:.75rem;opacity:.55}

/* Pills */
.nd-cat-pills{display:flex;flex-wrap:wrap;gap:10px}
.nd-cat-pill{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
             background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
             border-radius:50px;text-decoration:none;color:inherit;font-size:.85rem;
             font-weight:600;transition:all .15s}
.nd-cat-pill:hover{background:var(--cat-accent,#5068e8);border-color:var(--cat-accent,#5068e8);color:#fff}
.nd-cat-count{font-size:.7rem;font-weight:700;background:rgba(255,255,255,.15);
              padding:1px 6px;border-radius:50px}

/* List */
.nd-cat-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.nd-cat-list-item{display:flex;align-items:center;justify-content:space-between;
                  padding:10px 12px;border-radius:6px;border:1px solid transparent;
                  transition:all .12s}
.nd-cat-list-item:hover{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.08)}
.nd-cat-list-item a{text-decoration:none;color:inherit;font-weight:600;font-size:.9rem}
.nd-cat-list-item a:hover{color:var(--cat-accent,#5068e8)}
.nd-cat-count--list{font-size:.75rem;opacity:.5;background:rgba(255,255,255,.1);
                    padding:2px 8px;border-radius:4px}
`
  }]
});

/* ── Helpers ────────────────────────────────────────────────── */
function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}

function _ndCatGetAll(max) {
  const posts = (window.S?.posts || []).filter(p => p.status !== 'draft');
  const map   = {};
  posts.forEach(p => {
    (p.tags || '').split(',').forEach(t => {
      const name = t.trim();
      if (!name) return;
      if (!map[name]) map[name] = { name, slug: _ndCatSlug(name), count: 0 };
      map[name].count++;
    });
  });
  let cats = Object.values(map).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  if (max > 0) cats = cats.slice(0, max);
  return cats;
}

function _ndCatSlug(name) {
  return name.toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')
    .replace(/ñ/g,'n').replace(/ü/g,'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function _ndCatUrl(slug) {
  const base = (document.getElementById('cfg-baseurl')?.value || '').replace(/\/$/, '');
  return base ? `${base}/tag/${slug}/` : `../tag/${slug}/`;
}
