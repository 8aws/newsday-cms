// ── Newsday Plugin: Galería de imágenes ──────────────────────
ND.registerPlugin({
  id: 'gallery',
  name: 'Galería de imágenes',
  version: '1.0.0',

  components: [{
    type: 'gallery',
    ic: '🖼',
    lb: 'Galería',
    hint: 'Cuadrícula de imágenes con lightbox CSS puro',

    defaultData() {
      return {
        images: [
          { url: '', alt: '', caption: '' },
          { url: '', alt: '', caption: '' },
        ],
        cols: '3',
        gap: 'md',
        lightbox: true,
        rounded: true,
      };
    },

    renderFields(d, si, ci) {
      const gapOpts = [['sm','Pequeño'],['md','Medio'],['lg','Grande']];
      const colOpts = [['2','2'],['3','3'],['4','4']];

      const images = (d.images || []).map((img, ki) => `
        <div class="pb-card-item" id="gal-img-${si}-${ci}-${ki}">
          <div style="display:flex;align-items:center;gap:6px;flex:1">
            <input class="sinp" style="flex:1;font-size:11px" placeholder="URL de imagen…"
                   value="${_ndEH(img.url||'')}"
                   oninput="_ndSetGalImg(${si},${ci},${ki},'url',this.value)">
            <button class="btn btn-ghost btn-sm" style="flex-shrink:0;font-size:12px"
                    onclick="pbPickCompImage(${si},${ci},'gal-img-${ki}-url')" title="Elegir de medios">🖼</button>
          </div>
          <input class="sinp" style="font-size:11px;margin-top:4px" placeholder="Alt / descripción…"
                 value="${_ndEH(img.alt||'')}"
                 oninput="_ndSetGalImg(${si},${ci},${ki},'alt',this.value)">
          <input class="sinp" style="font-size:11px;margin-top:4px" placeholder="Caption (opcional)…"
                 value="${_ndEH(img.caption||'')}"
                 oninput="_ndSetGalImg(${si},${ci},${ki},'caption',this.value)">
          <div style="display:flex;gap:4px;margin-top:4px">
            <button class="btn btn-ghost btn-sm" onclick="_ndMoveGalImg(${si},${ci},${ki},-1)">↑</button>
            <button class="btn btn-ghost btn-sm" onclick="_ndMoveGalImg(${si},${ci},${ki},1)">↓</button>
            <button class="btn btn-red btn-sm"   onclick="_ndRemoveGalImg(${si},${ci},${ki})">✕</button>
          </div>
        </div>`).join('');

      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Columnas</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'cols',this.value)">
            ${colOpts.map(([v,l])=>`<option value="${v}" ${d.cols==v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Separación</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'gap',this.value)">
            ${gapOpts.map(([v,l])=>`<option value="${v}" ${d.gap===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="pb-field-row">
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="checkbox" ${d.lightbox?'checked':''} onchange="pbSetCmpField(${si},${ci},'lightbox',this.checked)">
            Lightbox al hacer clic
          </label>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;margin-left:12px">
            <input type="checkbox" ${d.rounded?'checked':''} onchange="pbSetCmpField(${si},${ci},'rounded',this.checked)">
            Bordes redondeados
          </label>
        </div>
        <div class="pb-card-list" id="gal-list-${si}-${ci}">${images}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px"
                onclick="_ndAddGalImg(${si},${ci})">＋ Añadir imagen</button>`;
    },

    renderHTML(d) {
      const cols   = parseInt(d.cols||'3',10);
      const gap    = {sm:'8px', md:'16px', lg:'24px'}[d.gap||'md'] || '16px';
      const radius = d.rounded ? '8px' : '0';
      const imgs   = (d.images||[]).filter(i=>i.url);
      if (!imgs.length) return '<div style="padding:24px;text-align:center;color:#94a3b8">Sin imágenes</div>';

      const items = imgs.map((img, idx) => {
        const safe   = _ndEH(img.url);
        const alt    = _ndEH(img.alt||'');
        const cap    = img.caption ? `<figcaption class="nd-gal-cap">${_ndEH(img.caption)}</figcaption>` : '';
        if (d.lightbox) {
          return `<figure class="nd-gal-item">
            <a href="#nd-lb-${idx}" class="nd-gal-link">
              <img src="${safe}" alt="${alt}" loading="lazy">
            </a>
            ${cap}
            <div id="nd-lb-${idx}" class="nd-lb-overlay">
              <a href="#" class="nd-lb-close">✕</a>
              <img src="${safe}" alt="${alt}">
              ${cap}
            </div>
          </figure>`;
        }
        return `<figure class="nd-gal-item"><img src="${safe}" alt="${alt}" loading="lazy">${cap}</figure>`;
      }).join('');

      return `<div class="nd-gallery" style="--gal-cols:${cols};--gal-gap:${gap};--gal-radius:${radius}">${items}</div>`;
    },

    css: `
.nd-gallery{display:grid;grid-template-columns:repeat(var(--gal-cols,3),1fr);gap:var(--gal-gap,16px)}
.nd-gal-item{margin:0;overflow:hidden;border-radius:var(--gal-radius,8px)}
.nd-gal-item img{width:100%;height:220px;object-fit:cover;display:block;transition:transform .3s}
.nd-gal-item:hover img{transform:scale(1.03)}
.nd-gal-link{display:block;overflow:hidden}
.nd-gal-cap{font-size:12px;color:#64748b;text-align:center;padding:4px 0}
/* Lightbox CSS */
.nd-lb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);display:none;
                align-items:center;justify-content:center;flex-direction:column;
                z-index:9999;padding:20px}
.nd-lb-overlay:target{display:flex}
.nd-lb-overlay img{max-width:90vw;max-height:80vh;object-fit:contain;border-radius:6px}
.nd-lb-close{position:absolute;top:20px;right:24px;color:#fff;font-size:28px;
             text-decoration:none;line-height:1}
@media(max-width:640px){.nd-gallery{grid-template-columns:repeat(2,1fr)}}
`
  }]
});

// ── Helpers para la UI del editor ────────────────────────────
function _ndEH(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function _ndSetGalImg(si, ci, ki, field, value) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.images = cmp.data.images || [];
  if (!cmp.data.images[ki]) cmp.data.images[ki] = {};
  cmp.data.images[ki][field] = value;
  PB.dirty = true;
  pbSchedulePreview();
}
function _ndAddGalImg(si, ci) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.images = cmp.data.images || [];
  cmp.data.images.push({ url:'', alt:'', caption:'' });
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
  pbSchedulePreview();
}
function _ndRemoveGalImg(si, ci, ki) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.images.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
  pbSchedulePreview();
}
function _ndMoveGalImg(si, ci, ki, dir) {
  const imgs = PB.sections[si]?.components?.[ci]?.data?.images;
  if (!imgs) return;
  const j = ki + dir;
  if (j < 0 || j >= imgs.length) return;
  [imgs[ki], imgs[j]] = [imgs[j], imgs[ki]];
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
  pbSchedulePreview();
}
