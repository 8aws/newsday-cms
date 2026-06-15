// ── Newsday Plugin: Nube de etiquetas ────────────────────────
//
//  Recopila todas las etiquetas de los posts publicados y las
//  presenta como una nube visual, lista o pills.
//  En la nube, el tamaño de cada etiqueta es proporcional a su
//  frecuencia de uso.
// ────────────────────────────────────────────────────────────

ND.registerPlugin({
  id: 'post-tags',
  name: 'Nube de etiquetas',
  version: '1.0.0',

  components: [{
    type: 'post-tags',
    ic: '☁',
    lb: 'Nube de etiquetas',
    hint: 'Nube, lista o pills de etiquetas del sitio',

    defaultData() {
      return {
        heading:     '',
        style:       'cloud',
        maxTags:     0,
        minCount:    1,
        accentColor: '#5068e8',
      };
    },

    renderFields(d, si, ci) {
      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Título</span>
          <input class="sinp" style="flex:1" placeholder="Deja vacío para omitir…"
                 value="${_ndEH(d.heading || '')}"
                 oninput="pbSetCmpField(${si},${ci},'heading',this.value)">
          <button class="btn btn-ghost btn-sm" style="margin-left:6px;white-space:nowrap"
                  onclick="(typeof loadPostsFromBackend==='function')&&loadPostsFromBackend().then(()=>{pbSchedulePreview();_pbRefreshCmp(${si},${ci});}).catch(()=>{})"
                  title="Recargar posts del servidor">↺ Actualizar</button>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Estilo</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'style',this.value)">
            ${[['cloud','Nube'],['pills','Pills'],['list','Lista']].map(([v,l]) =>
              `<option value="${v}" ${d.style===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Máx. etiquetas</span>
          <input class="sinp" style="width:60px" type="number" min="0" max="100"
                 value="${d.maxTags || 0}" title="0 = todas"
                 oninput="pbSetCmpField(${si},${ci},'maxTags',+this.value)">
          <span class="pb-field-lbl" style="margin-left:8px">Mín. posts</span>
          <input class="sinp" style="width:50px" type="number" min="1" max="20"
                 value="${d.minCount || 1}"
                 oninput="pbSetCmpField(${si},${ci},'minCount',+this.value)">
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Color acento</span>
          <input type="color" class="pb-color-inp" value="${d.accentColor || '#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'accentColor',this.value)">
        </div>`;
    },

    renderHTML(d) {
      const accent   = d.accentColor || '#5068e8';
      const style    = d.style || 'cloud';
      const minCount = Math.max(1, d.minCount || 1);
      const maxTags  = d.maxTags || 0;

      // Recopilar y filtrar etiquetas
      let tags = _ndTagsGetAll(minCount);
      if (maxTags > 0) tags = tags.slice(0, maxTags);

      const heading = d.heading
        ? `<h2 class="nd-tags-heading">${_ndEH(d.heading)}</h2>` : '';

      if (!tags.length) {
        return `<div class="nd-post-tags" style="--tags-accent:${accent}">
          ${heading}
          <p class="nd-tags-empty">No hay etiquetas aún en los posts publicados.</p>
        </div>`;
      }

      const maxCount = tags[0]?.count || 1;

      // ── Nube ─────────────────────────────────────────────────
      if (style === 'cloud') {
        const items = tags.map(tag => {
          // Tamaño entre 0.75rem y 1.8rem según frecuencia
          const ratio  = tag.count / maxCount;
          const size   = (0.75 + ratio * 1.05).toFixed(2);
          const opac   = (0.5 + ratio * 0.5).toFixed(2);
          return `<a class="nd-tags-cloud-item" href="${_ndTagUrl(tag.slug)}"
                    style="font-size:${size}rem;opacity:${opac}">
            ${_ndEH(tag.name)}
          </a>`;
        }).join('');
        return `<div class="nd-post-tags nd-tags-cloud-wrap" style="--tags-accent:${accent}">
          ${heading}
          <div class="nd-tags-cloud">${items}</div>
        </div>`;
      }

      // ── Lista ─────────────────────────────────────────────────
      if (style === 'list') {
        const items = tags.map(tag => `
          <li class="nd-tags-list-item">
            <a href="${_ndTagUrl(tag.slug)}">${_ndEH(tag.name)}</a>
            <span class="nd-tags-count">${tag.count}</span>
          </li>`).join('');
        return `<div class="nd-post-tags" style="--tags-accent:${accent}">
          ${heading}
          <ul class="nd-tags-list">${items}</ul>
        </div>`;
      }

      // ── Pills (por defecto) ────────────────────────────────────
      const items = tags.map(tag => `
        <a class="nd-tags-pill" href="${_ndTagUrl(tag.slug)}">
          ${_ndEH(tag.name)}
          <span class="nd-tags-pill-count">${tag.count}</span>
        </a>`).join('');
      return `<div class="nd-post-tags nd-tags-pills-wrap" style="--tags-accent:${accent}">
        ${heading}
        <div class="nd-tags-pills">${items}</div>
      </div>`;
    },

    css: `
.nd-post-tags{width:100%}
.nd-tags-heading{font-size:1.5rem;font-weight:800;margin-bottom:20px;color:inherit}
.nd-tags-empty{opacity:.5;font-size:14px}

/* Nube */
.nd-tags-cloud{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:baseline;line-height:1.4}
.nd-tags-cloud-item{text-decoration:none;color:var(--tags-accent,#5068e8);font-weight:600;
                    transition:opacity .12s,transform .12s;display:inline-block}
.nd-tags-cloud-item:hover{opacity:1!important;transform:scale(1.08)}

/* Pills */
.nd-tags-pills{display:flex;flex-wrap:wrap;gap:8px}
.nd-tags-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
              background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
              border-radius:50px;text-decoration:none;color:inherit;font-size:.8rem;font-weight:600;
              transition:all .15s}
.nd-tags-pill:hover{background:var(--tags-accent,#5068e8);border-color:var(--tags-accent,#5068e8);color:#fff}
.nd-tags-pill-count{font-size:.7rem;background:rgba(0,0,0,.15);padding:1px 5px;
                    border-radius:50px;font-weight:700}

/* Lista */
.nd-tags-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:2px}
.nd-tags-list-item{display:flex;align-items:center;justify-content:space-between;
                   padding:8px 10px;border-radius:6px;border:1px solid transparent;
                   transition:all .12s}
.nd-tags-list-item:hover{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.08)}
.nd-tags-list-item a{text-decoration:none;color:inherit;font-weight:600;font-size:.85rem}
.nd-tags-list-item a:hover{color:var(--tags-accent,#5068e8)}
.nd-tags-count{font-size:.7rem;opacity:.5;background:rgba(255,255,255,.1);
               padding:1px 7px;border-radius:4px}
`
  }]
});

/* ── Helpers ────────────────────────────────────────────────── */
function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}

function _ndTagsGetAll(minCount) {
  const posts = (window.S?.posts || []).filter(p => p.status !== 'draft');
  const map   = {};
  posts.forEach(p => {
    (p.tags || '').split(',').forEach(t => {
      const name = t.trim();
      if (!name) return;
      if (!map[name]) map[name] = { name, slug: _ndTagSlug(name), count: 0 };
      map[name].count++;
    });
  });
  return Object.values(map)
    .filter(t => t.count >= minCount)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function _ndTagSlug(name) {
  return name.toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')
    .replace(/ñ/g,'n').replace(/ü/g,'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function _ndTagUrl(slug) {
  const base = (document.getElementById('cfg-baseurl')?.value || '').replace(/\/$/, '');
  return base ? `${base}/tag/${slug}/` : `../tag/${slug}/`;
}
