// ════════════════════════════════════════════════════════════════
//  pagebuilder.js — Constructor visual de páginas v0.9
//  Permite diseñar páginas con secciones, fondos y componentes
//  pre-construidos sin escribir HTML a mano.
// ════════════════════════════════════════════════════════════════

/* ── Estado del constructor ──────────────────────────────────── */
const PB = {
  pageId   : null,          // id del directorio de la página (ej: mi-pagina)
  meta     : {},            // {title, slug, layout, lang, description}
  sections : [],            // array de secciones
  dirty    : false,
  targetId : 'page-editor', // id del contenedor donde se renderiza el builder
  _mediaCtx: null,          // {type:'bg'|'comp', secIdx, si, ci, field}
};

/* ── Tipos de componente built-in ────────────────────────────── */
const PB_COMP_TYPES = [
  { t:'hero',       ic:'🌟', lb:'Hero',            hint:'Título grande, subtítulo y CTA' },
  { t:'text',       ic:'T',  lb:'Texto',            hint:'Bloque de texto con HTML' },
  { t:'card-grid',  ic:'▦',  lb:'Tarjetas',         hint:'Grid de tarjetas con icono y pills' },
  { t:'split',      ic:'⊟',  lb:'Imagen+Texto',     hint:'Imagen a un lado, texto al otro' },
  { t:'stats',      ic:'📊', lb:'Estadísticas',     hint:'Fila de números destacados' },
  { t:'features',   ic:'✦',  lb:'Características',  hint:'Lista de features con iconos' },
  { t:'cta-banner', ic:'📢', lb:'CTA',              hint:'Banda de llamada a la acción' },
  { t:'image',      ic:'🖼', lb:'Imagen',           hint:'Imagen centrada con caption' },
  { t:'spacer',     ic:'↕',  lb:'Espaciador',       hint:'Separador con altura ajustable' },
  { t:'html',       ic:'<>', lb:'HTML libre',       hint:'Código HTML personalizado' },
];

// Registrar built-ins en el registry ND cuando esté disponible
if (typeof window.ND !== 'undefined') { ND.setBuiltins(PB_COMP_TYPES); }
else { document.addEventListener('DOMContentLoaded', () => { if (typeof window.ND !== 'undefined') ND.setBuiltins(PB_COMP_TYPES); }); }

/* ── Generador de IDs ────────────────────────────────────────── */
function pbId() { return 'pb' + Math.random().toString(36).slice(2, 9); }

/* ── Datos por defecto de cada componente ────────────────────── */
function pbDefaultData(type) {
  // Delegar a plugin si el tipo está registrado en ND
  if (typeof ND !== 'undefined') {
    const pluginDefault = ND.defaultData(type);
    if (pluginDefault !== null) return pluginDefault;
  }

  switch (type) {
    case 'hero':       return { eyebrow:'', title:'Título principal', subtitle:'Subtítulo descriptivo', ctaLabel:'Ver más', ctaUrl:'#', ctaStyle:'primary', align:'center' };
    case 'text':       return {
      html:'<p>Escribe aquí el contenido...</p>',
      align:'left', maxWidth:'760px',
      // tipografía
      fontFamily:'', fontSize:'', fontWeight:'', lineHeight:'', letterSpacing:'', textTransform:'',
      // color de texto: 'theme' | 'solid' | 'gradient'
      colorMode:'theme', textColor:'#ffffff',
      gradientColor1:'#00d2ff', gradientColor2:'#e040fb', gradientAngle:135,
      // fondo: 'none' | 'solid' | 'gradient'
      bgMode:'none', bgColor:'#1e2a4a',
      bgGradientColor1:'#1e2a4a', bgGradientColor2:'#2d1b4e', bgGradientAngle:135,
      // espaciado y forma
      padding:'', borderRadius:'',
      // efectos
      textShadow:'',
    };
    case 'card-grid':  return { cols:'auto', cards:[ pbDefaultCard() ] };
    case 'split':      return { imageUrl:'', imageAlt:'', side:'left', title:'Título de la sección', body:'Descripción detallada de esta sección.', ctaLabel:'', ctaUrl:'', imageRadius:'8px' };
    case 'stats':      return { items:[{ value:'100+', label:'Clientes', icon:'👥' }, { value:'5★', label:'Valoración', icon:'⭐' }] };
    case 'features':   return { title:'', layout:'grid', items:[{ icon:'⚡', title:'Rápido', desc:'Optimizado para el mejor rendimiento' }] };
    case 'cta-banner': return { title:'¿Listo para empezar?', subtitle:'', ctaLabel:'Contactar', ctaUrl:'#contacto', ctaStyle:'primary' };
    case 'image':      return { url:'', alt:'', caption:'', width:'100%', radius:'8px' };
    case 'spacer':     return { height:60, showLine:false };
    case 'html':       return { code:'<div></div>' };
    default:           return {};
  }
}

function pbDefaultCard() {
  return { id:pbId(), icon:'🚀', name:'Proyecto', tag:'', desc:'Descripción del proyecto o producto.', pills:[], accent:'#5068e8', link:'' };
}

/* ── Nueva sección vacía ─────────────────────────────────────── */
function pbNewSection() {
  return {
    id: pbId(),
    bg: { type:'color', color:'#ffffff', gradDir:'135deg', gradA:'#1e293b', gradB:'#0f172a', imageUrl:'', imageSize:'cover', overlayColor:'#000000', overlayOpacity:0 },
    width: 'boxed',
    padding: 'md',
    components: [],
  };
}

/* ── Abrir el constructor para una página ────────────────────── */
async function openPageBuilder(page, targetId) {
  PB.pageId   = page.id || page.slug || '';
  PB.meta     = { title: page.title||'', slug: page.slug||'', layout:'fullpage', lang:'es', description:'' };
  PB.dirty    = false;
  PB.targetId = targetId || 'page-editor'; // destino del editor (permite reutilizar en Modelar)

  // Refrescar posts en segundo plano para que los componentes dinámicos
  // (post-list, post-categories, post-tags) muestren el estado actual
  if (!S.offline && typeof loadPostsFromBackend === 'function') {
    loadPostsFromBackend().then(() => pbSchedulePreview()).catch(() => {});
  }

  // Intentar cargar builder.json existente
  let loaded = false;
  if (PB.pageId) {
    try {
      const data = await api.call('get-page-builder&id=' + encodeURIComponent(PB.pageId));
      if (data && data.sections && data.sections.length) {
        PB.sections = data.sections;
        if (data.meta) Object.assign(PB.meta, data.meta);
        loaded = true;
      }
    } catch(e) { /* sin builder.json todavía */ }
  }

  if (!loaded) PB.sections = [ pbNewSection() ];

  renderBuilder();
}

/* ── Renderizar el editor completo ───────────────────────────── */
function renderBuilder() {
  const el = document.getElementById(PB.targetId || 'page-editor');
  if (!el) return;

  el.innerHTML = `
    <div class="pb-editor" id="pb-editor-root">
      <div class="pb-topbar">
        <span class="pb-tb-title">✦ Constructor — ${escH(PB.meta.title || PB.meta.slug || 'Página')}</span>
        <div class="pb-tb-actions">
          <button class="btn btn-ghost btn-sm" onclick="pbSwitchToHTML()" title="Editar como HTML">‹/› HTML</button>
          <button class="btn btn-ghost btn-sm" onclick="pbPreview()">👁 Preview</button>
          <button class="btn btn-primary btn-sm" onclick="savePageBuilder()">💾 Guardar</button>
        </div>
      </div>

      <div class="pb-meta-bar">
        <span class="pb-meta-lbl">Título</span>
        <input class="sinp pb-meta-inp" id="pb-meta-title" value="${escH(PB.meta.title)}"
               oninput="PB.meta.title=this.value;PB.dirty=true" placeholder="Título de la página">
        <span class="pb-meta-lbl">Slug</span>
        <input class="sinp pb-meta-inp pb-meta-slug" id="pb-meta-slug" value="${escH(PB.meta.slug)}"
               oninput="PB.meta.slug=this.value;PB.dirty=true" placeholder="url-de-la-pagina">
        <span class="pb-meta-lbl">Descripción</span>
        <input class="sinp pb-meta-inp" style="flex:2" id="pb-meta-desc" value="${escH(PB.meta.description||'')}"
               oninput="PB.meta.description=this.value;PB.dirty=true" placeholder="Meta descripción (SEO)">
      </div>

      <div class="pb-sections" id="pb-sections">
        ${PB.sections.map((s, i) => renderPBSection(s, i)).join('')}
      </div>

      <div class="pb-add-sec-wrap">
        <button class="pb-add-sec-btn" onclick="pbAddSection()">＋ Nueva sección</button>
      </div>
    </div>`;

  // Actualizar preview tras cada render completo del builder
  pbSchedulePreview();
}

/* ── Renderizar una sección ──────────────────────────────────── */
function renderPBSection(sec, idx) {
  const bg     = sec.bg || {};
  const bgType = bg.type || 'color';

  const padOpts = ['none','sm','md','lg','xl'].map(v =>
    `<option value="${v}" ${sec.padding===v?'selected':''}>${v.toUpperCase()}</option>`).join('');
  const widOpts = [['boxed','Centrado'],['full','Ancho total']].map(([v,l]) =>
    `<option value="${v}" ${sec.width===v?'selected':''}>${l}</option>`).join('');

  return `
  <div class="pb-sec-card" id="pb-sec-${idx}" data-sec-idx="${idx}">
    <div class="pb-sec-head">
      <span class="pb-sec-badge">${idx + 1}</span>
      <span class="pb-sec-title">Sección ${idx + 1}</span>
      <div class="pb-sec-controls">
        <select class="pb-mini-sel" title="Padding" onchange="pbSetSec(${idx},'padding',this.value)">${padOpts}</select>
        <select class="pb-mini-sel" title="Ancho"   onchange="pbSetSec(${idx},'width',this.value)">${widOpts}</select>
        <button class="btn btn-ghost btn-sm" onclick="pbMoveSection(${idx},-1)" title="Subir">↑</button>
        <button class="btn btn-ghost btn-sm" onclick="pbMoveSection(${idx}, 1)" title="Bajar">↓</button>
        <button class="btn btn-red  btn-sm" onclick="pbRemoveSection(${idx})"  title="Eliminar sección">✕</button>
      </div>
    </div>

    <div class="pb-bg-row">
      <span class="pb-bg-lbl">Fondo:</span>
      <div class="pb-bg-tabs">
        ${['none','color','gradient','image'].map(t => `
          <label class="pb-bg-tab ${bgType===t?'on':''}">
            <input type="radio" name="bg-type-${idx}" value="${t}" ${bgType===t?'checked':''}
                   onchange="pbSetBg(${idx},'type','${t}')">
            ${{none:'Ninguno',color:'Color',gradient:'Degradado',image:'Imagen'}[t]}
          </label>`).join('')}
      </div>
      <div class="pb-bg-opts" id="pb-bg-opts-${idx}">
        ${renderBgOpts(sec, idx)}
      </div>
    </div>

    <div class="pb-cmps" id="pb-cmps-${idx}">
      ${(sec.components||[]).map((c, ci) => renderPBComponent(c, idx, ci)).join('')}
      ${!(sec.components||[]).length ? '<div class="pb-cmps-empty">Sin componentes — añade uno desde la paleta</div>' : ''}
    </div>

    <div class="pb-cmp-palette">
      <span class="pb-pal-lbl">Añadir componente:</span>
      ${(typeof ND !== 'undefined' ? ND.getComponentTypes() : PB_COMP_TYPES).map(ct =>
        `<button class="pb-pal-btn" title="${escH(ct.hint||ct.lb||ct.t)}" onclick="pbAddComponent(${idx},'${ct.t}')">
          ${ct.ic} ${ct.lb}
        </button>`).join('')}
    </div>
  </div>`;
}

/* ── Opciones de fondo ──────────────────────────────────────── */
function renderBgOpts(sec, idx) {
  const bg   = sec.bg || {};
  const type = bg.type || 'color';
  if (type === 'none') return '';

  if (type === 'color') {
    const hex = _hexFromVar(bg.color || '#ffffff');
    return `
      <input type="color" class="pb-color-inp" value="${hex}"
             oninput="pbSetBg(${idx},'color',this.value);this.nextElementSibling.value=this.value">
      <input class="sinp pb-color-text" value="${escH(bg.color||'#ffffff')}"
             maxlength="25" placeholder="#rrggbb"
             oninput="pbSetBg(${idx},'color',this.value);this.previousElementSibling.value=_hexFromVar(this.value)||this.previousElementSibling.value">`;
  }

  if (type === 'gradient') {
    const dirOpts = [['135deg','↘ Diagonal'],['to right','→ Horizontal'],['to bottom','↓ Vertical'],['to bottom right','↘ Esquina'],['180deg','↓ 180°']].map(([v,l]) =>
      `<option value="${v}" ${(bg.gradDir||'135deg')===v?'selected':''}>${l}</option>`).join('');
    return `
      <select class="pb-mini-sel" onchange="pbSetBg(${idx},'gradDir',this.value)">${dirOpts}</select>
      <input type="color" class="pb-color-inp" value="${_hexFromVar(bg.gradA||'#1e293b')}"
             title="Color A" oninput="pbSetBg(${idx},'gradA',this.value)">
      <span class="pb-grad-arrow">→</span>
      <input type="color" class="pb-color-inp" value="${_hexFromVar(bg.gradB||'#0f172a')}"
             title="Color B" oninput="pbSetBg(${idx},'gradB',this.value)">`;
  }

  if (type === 'image') {
    const sizeOpts = ['cover','contain','auto'].map(v =>
      `<option value="${v}" ${(bg.imageSize||'cover')===v?'selected':''}>${v}</option>`).join('');
    return `
      <input class="sinp" style="flex:1;min-width:0;font-size:11px"
             value="${escH(bg.imageUrl||'')}" placeholder="URL de imagen…"
             oninput="pbSetBg(${idx},'imageUrl',this.value)">
      <button class="btn btn-ghost btn-sm" onclick="pbPickBgImage(${idx})">🖼</button>
      <select class="pb-mini-sel" title="Tamaño" onchange="pbSetBg(${idx},'imageSize',this.value)">${sizeOpts}</select>
      <label class="pb-overlay-label">
        Overlay
        <input type="color" class="pb-color-inp" style="width:24px;height:20px"
               value="${_hexFromVar(bg.overlayColor||'#000000')}"
               oninput="pbSetBg(${idx},'overlayColor',this.value)">
        <input type="range" min="0" max="90" value="${bg.overlayOpacity||0}" style="width:56px"
               oninput="pbSetBg(${idx},'overlayOpacity',+this.value);this.nextElementSibling.textContent=this.value+'%'">
        <span class="pb-overlay-pct">${bg.overlayOpacity||0}%</span>
      </label>`;
  }
  return '';
}

/* ── Renderizar tarjeta de componente ───────────────────────── */
function renderPBComponent(cmp, si, ci) {
  const allTypes = typeof ND !== 'undefined' ? ND.getComponentTypes() : PB_COMP_TYPES;
  const def = allTypes.find(x => x.t === cmp.type) || { ic:'🧩', lb: cmp.type };
  return `
  <div class="pb-cmp-card" id="pb-cmp-${si}-${ci}">
    <div class="pb-cmp-head">
      <span class="pb-cmp-ic">${def.ic}</span>
      <span class="pb-cmp-type">${def.lb}</span>
      <div class="pb-cmp-acts">
        <button class="btn btn-ghost btn-sm" onclick="pbMoveComponent(${si},${ci},-1)">↑</button>
        <button class="btn btn-ghost btn-sm" onclick="pbMoveComponent(${si},${ci}, 1)">↓</button>
        <button class="btn btn-red  btn-sm" onclick="pbRemoveComponent(${si},${ci})">✕</button>
      </div>
    </div>
    <div class="pb-cmp-fields">
      ${renderPBCmpFields(cmp, si, ci)}
    </div>
  </div>`;
}

/* ── Campos por tipo de componente ──────────────────────────── */
function renderPBCmpFields(cmp, si, ci) {
  // Delegar a plugin si el tipo está registrado en ND
  if (typeof ND !== 'undefined') {
    const pluginFields = ND.renderFields(cmp.type, cmp.data || {}, si, ci);
    if (pluginFields !== null) return pluginFields;
  }

  const d  = cmp.data || {};
  const pf = `pbSetCmpField(${si},${ci},'`;

  switch (cmp.type) {

    case 'hero': {
      const aligns = ['center','left','right'].map(v =>
        `<option value="${v}" ${(d.align||'center')===v?'selected':''}>${v.charAt(0).toUpperCase()+v.slice(1)}</option>`).join('');
      const styles = [['primary','Primario'],['outline','Outline'],['ghost','Ghost']].map(([v,l]) =>
        `<option value="${v}" ${(d.ctaStyle||'primary')===v?'selected':''}>${l}</option>`).join('');
      return `
        <div class="pb-field-row">
          <label class="pb-field-lbl">Eyebrow</label>
          <input class="sinp pb-field-inp" value="${escH(d.eyebrow||'')}" placeholder="Texto pequeño encima del título"
                 oninput="${pf}eyebrow',this.value)">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Título *</label>
          <input class="sinp pb-field-inp" value="${escH(d.title||'')}" placeholder="Título principal"
                 oninput="${pf}title',this.value)">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Subtítulo</label>
          <input class="sinp pb-field-inp" value="${escH(d.subtitle||'')}" placeholder="Texto descriptivo"
                 oninput="${pf}subtitle',this.value)">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Botón CTA</label>
          <input class="sinp" style="flex:1" value="${escH(d.ctaLabel||'')}" placeholder="Texto del botón"
                 oninput="${pf}ctaLabel',this.value)">
          <input class="sinp" style="flex:1" value="${escH(d.ctaUrl||'')}" placeholder="URL / #ancla"
                 oninput="${pf}ctaUrl',this.value)">
          <select class="pb-mini-sel" onchange="${pf}ctaStyle',this.value)">${styles}</select>
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Alineación</label>
          <select class="pb-mini-sel" onchange="${pf}align',this.value)">${aligns}</select>
        </div>`;
    }

    case 'text':
      return renderPBTextFields(d, si, ci);

    case 'card-grid':
      return renderPBCardGridFields(d, si, ci);

    case 'split': {
      const sideOpts = [['left','← Imagen izq.'],['right','→ Imagen dcha.']].map(([v,l]) =>
        `<option value="${v}" ${(d.side||'left')===v?'selected':''}>${l}</option>`).join('');
      return `
        <div class="pb-field-row">
          <label class="pb-field-lbl">Imagen</label>
          <input class="sinp" style="flex:1" value="${escH(d.imageUrl||'')}" placeholder="URL de imagen…"
                 oninput="${pf}imageUrl',this.value)">
          <button class="btn btn-ghost btn-sm" onclick="pbPickCompImage(${si},${ci},'imageUrl')">🖼</button>
          <select class="pb-mini-sel" onchange="${pf}side',this.value)">${sideOpts}</select>
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Título</label>
          <input class="sinp pb-field-inp" value="${escH(d.title||'')}"
                 oninput="${pf}title',this.value)" placeholder="Título de la sección">
        </div>
        <div class="pb-field-row" style="align-items:flex-start">
          <label class="pb-field-lbl" style="padding-top:6px">Texto</label>
          <textarea class="sinp pb-textarea" rows="4"
                    oninput="${pf}body',this.value)"
                    placeholder="Párrafo descriptivo…">${escH(d.body||'')}</textarea>
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Botón</label>
          <input class="sinp" style="flex:1" value="${escH(d.ctaLabel||'')}" placeholder="Texto (opcional)"
                 oninput="${pf}ctaLabel',this.value)">
          <input class="sinp" style="flex:1" value="${escH(d.ctaUrl||'')}" placeholder="URL"
                 oninput="${pf}ctaUrl',this.value)">
        </div>`;
    }

    case 'stats':
      return renderPBStatsFields(d, si, ci);

    case 'features':
      return renderPBFeaturesFields(d, si, ci);

    case 'cta-banner': {
      const ctaStyles = [['primary','Primario'],['outline','Outline'],['ghost','Ghost']].map(([v,l]) =>
        `<option value="${v}" ${(d.ctaStyle||'primary')===v?'selected':''}>${l}</option>`).join('');
      return `
        <div class="pb-field-row">
          <label class="pb-field-lbl">Título *</label>
          <input class="sinp pb-field-inp" value="${escH(d.title||'')}"
                 oninput="${pf}title',this.value)" placeholder="Texto principal de la CTA">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Subtítulo</label>
          <input class="sinp pb-field-inp" value="${escH(d.subtitle||'')}"
                 oninput="${pf}subtitle',this.value)" placeholder="Texto secundario (opcional)">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Botón</label>
          <input class="sinp" style="flex:1" value="${escH(d.ctaLabel||'')}" placeholder="Texto"
                 oninput="${pf}ctaLabel',this.value)">
          <input class="sinp" style="flex:1" value="${escH(d.ctaUrl||'')}" placeholder="URL / #ancla"
                 oninput="${pf}ctaUrl',this.value)">
          <select class="pb-mini-sel" onchange="${pf}ctaStyle',this.value)">${ctaStyles}</select>
        </div>`;
    }

    case 'image':
      return `
        <div class="pb-field-row">
          <label class="pb-field-lbl">Imagen</label>
          <input class="sinp" style="flex:1" value="${escH(d.url||'')}" placeholder="URL de imagen…"
                 oninput="${pf}url',this.value)">
          <button class="btn btn-ghost btn-sm" onclick="pbPickCompImage(${si},${ci},'url')">🖼</button>
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Alt text</label>
          <input class="sinp pb-field-inp" value="${escH(d.alt||'')}" placeholder="Descripción accesible"
                 oninput="${pf}alt',this.value)">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Caption</label>
          <input class="sinp pb-field-inp" value="${escH(d.caption||'')}" placeholder="Pie de imagen (opcional)"
                 oninput="${pf}caption',this.value)">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Ancho</label>
          <input class="sinp" style="width:80px" value="${escH(d.width||'100%')}"
                 oninput="${pf}width',this.value)" placeholder="100%">
          <label class="pb-field-lbl" style="margin-left:12px">Radio</label>
          <input class="sinp" style="width:70px" value="${escH(d.radius||'8px')}"
                 oninput="${pf}radius',this.value)" placeholder="8px">
        </div>`;

    case 'spacer':
      return `
        <div class="pb-field-row">
          <label class="pb-field-lbl">Altura (px)</label>
          <input class="sinp" style="width:80px" type="number" min="8" max="400"
                 value="${+(d.height||60)}" oninput="${pf}height',+this.value)">
          <label class="pb-field-lbl" style="margin-left:16px;display:flex;align-items:center;gap:6px">
            <input type="checkbox" ${d.showLine?'checked':''} onchange="${pf}showLine',this.checked)">
            Mostrar línea divisoria
          </label>
        </div>`;

    case 'html':
      return `
        <div class="pb-field-row" style="align-items:flex-start">
          <label class="pb-field-lbl" style="padding-top:6px">HTML</label>
          <textarea class="sinp pb-textarea pb-html-ta" rows="8"
                    oninput="${pf}code',this.value)"
                    placeholder="<div>Tu HTML aquí…</div>">${escH(d.code||'')}</textarea>
        </div>`;

    default:
      return `<div class="pb-cmps-empty">Tipo desconocido: ${escH(cmp.type)}</div>`;
  }
}

/* ── Card grid fields ────────────────────────────────────────── */
function renderPBCardGridFields(d, si, ci) {
  const cards = d.cards || [];
  const colsOpts = [['auto','Auto'],['2','2 columnas'],['3','3 columnas'],['4','4 columnas']].map(([v,l]) =>
    `<option value="${v}" ${(d.cols||'auto')===v?'selected':''}>${l}</option>`).join('');

  const cardsHTML = cards.map((card, ki) => `
    <div class="pb-card-item" id="pb-card-${si}-${ci}-${ki}">
      <div class="pb-card-head">
        <span class="pb-card-num">Tarjeta ${ki + 1}</span>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" onclick="pbMoveCard(${si},${ci},${ki},-1)">↑</button>
          <button class="btn btn-ghost btn-sm" onclick="pbMoveCard(${si},${ci},${ki}, 1)">↓</button>
          <button class="btn btn-red  btn-sm" onclick="pbRemoveCard(${si},${ci},${ki})">✕</button>
        </div>
      </div>
      <div class="pb-card-fields">
        <div class="pb-field-row">
          <label class="pb-field-lbl">Icono</label>
          <input class="sinp" style="width:56px" value="${escH(card.icon||'')}" placeholder="🚀"
                 oninput="pbSetCard(${si},${ci},${ki},'icon',this.value)">
          <label class="pb-field-lbl" style="margin-left:8px">Nombre *</label>
          <input class="sinp" style="flex:1" value="${escH(card.name||'')}" placeholder="Nombre del proyecto"
                 oninput="pbSetCard(${si},${ci},${ki},'name',this.value)">
          <label class="pb-field-lbl" style="margin-left:8px">Tag</label>
          <input class="sinp" style="width:90px" value="${escH(card.tag||'')}" placeholder="Web App"
                 oninput="pbSetCard(${si},${ci},${ki},'tag',this.value)">
        </div>
        <div class="pb-field-row" style="align-items:flex-start">
          <label class="pb-field-lbl" style="padding-top:6px">Descripción</label>
          <textarea class="sinp pb-textarea" rows="2"
                    oninput="pbSetCard(${si},${ci},${ki},'desc',this.value)"
                    placeholder="Descripción de la tarjeta…">${escH(card.desc||'')}</textarea>
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Pills</label>
          <input class="sinp" style="flex:1"
                 value="${escH((card.pills||[]).join(', '))}"
                 placeholder="React, Node.js, Docker (separadas por coma)"
                 oninput="pbSetCard(${si},${ci},${ki},'pills',this.value.split(',').map(s=>s.trim()).filter(Boolean))">
          <label class="pb-field-lbl" style="margin-left:8px">Acento</label>
          <input type="color" class="pb-color-inp"
                 value="${_hexFromVar(card.accent||'#5068e8')}"
                 oninput="pbSetCard(${si},${ci},${ki},'accent',this.value)">
        </div>
        <div class="pb-field-row">
          <label class="pb-field-lbl">Enlace</label>
          <input class="sinp pb-field-inp" value="${escH(card.link||'')}" placeholder="https:// o #ancla (opcional)"
                 oninput="pbSetCard(${si},${ci},${ki},'link',this.value)">
        </div>
      </div>
    </div>`).join('');

  return `
    <div class="pb-field-row">
      <label class="pb-field-lbl">Columnas</label>
      <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'cols',this.value)">${colsOpts}</select>
    </div>
    <div class="pb-card-list" id="pb-cards-${si}-${ci}">${cardsHTML}</div>
    <div style="margin-top:10px">
      <button class="btn btn-primary btn-sm" onclick="pbAddCard(${si},${ci})">＋ Añadir tarjeta</button>
    </div>`;
}

/* ── Stats fields ────────────────────────────────────────────── */
function renderPBStatsFields(d, si, ci) {
  const items = d.items || [];
  const rows = items.map((item, ki) => `
    <div class="pb-stat-item">
      <input class="sinp" style="width:44px" value="${escH(item.icon||'')}" placeholder="📊"
             oninput="pbSetStatItem(${si},${ci},${ki},'icon',this.value)">
      <input class="sinp" style="width:80px" value="${escH(item.value||'')}" placeholder="100+"
             oninput="pbSetStatItem(${si},${ci},${ki},'value',this.value)">
      <input class="sinp" style="flex:1" value="${escH(item.label||'')}" placeholder="Clientes"
             oninput="pbSetStatItem(${si},${ci},${ki},'label',this.value)">
      <button class="btn btn-red btn-sm" onclick="pbRemoveStatItem(${si},${ci},${ki})">✕</button>
    </div>`).join('');
  return `
    <div class="pb-stat-list">${rows}</div>
    <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="pbAddStatItem(${si},${ci})">＋ Añadir stat</button>`;
}

/* ── Features fields ─────────────────────────────────────────── */
function renderPBFeaturesFields(d, si, ci) {
  const pf = `pbSetCmpField(${si},${ci},'`;
  const items = d.items || [];
  const layoutOpts = [['grid','Grid'],['list','Lista']].map(([v,l]) =>
    `<option value="${v}" ${(d.layout||'grid')===v?'selected':''}>${l}</option>`).join('');
  const rows = items.map((item, ki) => `
    <div class="pb-feat-item">
      <input class="sinp" style="width:44px" value="${escH(item.icon||'')}" placeholder="⚡"
             oninput="pbSetFeatItem(${si},${ci},${ki},'icon',this.value)">
      <input class="sinp" style="flex:1" value="${escH(item.title||'')}" placeholder="Título"
             oninput="pbSetFeatItem(${si},${ci},${ki},'title',this.value)">
      <input class="sinp" style="flex:2" value="${escH(item.desc||'')}" placeholder="Descripción"
             oninput="pbSetFeatItem(${si},${ci},${ki},'desc',this.value)">
      <button class="btn btn-red btn-sm" onclick="pbRemoveFeatItem(${si},${ci},${ki})">✕</button>
    </div>`).join('');
  return `
    <div class="pb-field-row">
      <label class="pb-field-lbl">Título sección</label>
      <input class="sinp pb-field-inp" value="${escH(d.title||'')}" placeholder="Opcional"
             oninput="${pf}title',this.value)">
      <label class="pb-field-lbl" style="margin-left:12px">Layout</label>
      <select class="pb-mini-sel" onchange="${pf}layout',this.value)">${layoutOpts}</select>
    </div>
    <div class="pb-feat-list">${rows}</div>
    <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="pbAddFeatItem(${si},${ci})">＋ Añadir feature</button>`;
}

/* ════════════════════════════════════════════════════════════════
   MUTACIONES DE ESTADO
   ════════════════════════════════════════════════════════════════ */

function pbSetSec(idx, field, value) {
  if (PB.sections[idx]) { PB.sections[idx][field] = value; PB.dirty = true; }
}

/* ── Preview en tiempo real ──────────────────────────────────── */
let _pbPreviewTimer = null;
function pbSchedulePreview() {
  clearTimeout(_pbPreviewTimer);
  _pbPreviewTimer = setTimeout(pbUpdatePreview, 350);
}

function pbUpdatePreview() {
  const wrap = document.getElementById('mpg-preview-wrap');
  if (!wrap) return;

  let frame = document.getElementById('mpg-preview-frame');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id        = 'mpg-preview-frame';
    frame.className = 'mpg-preview-frame';
    frame.setAttribute('sandbox', 'allow-same-origin allow-scripts');
    wrap.innerHTML  = '';
    wrap.appendChild(frame);
  }

  // Calcular base URL para que las imágenes relativas resuelvan correctamente
  // desde el directorio raíz de la instalación (donde está Newsday.html)
  const baseHref = window.location.href.replace(/\/[^\/]*$/, '/');

  let html = pbGenerateFullHTML();
  // Inyectar <base href> justo después de <head> para resolver URLs relativas
  html = html.replace(/(<head[^>]*>)/i, `$1\n<base href="${baseHref}">`);

  frame.srcdoc = html;
}

function mpgSetScale(factor, btn) {
  document.querySelectorAll('.mpg-scale-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  const frame = document.getElementById('mpg-preview-frame');
  if (!frame) return;
  const wrap  = document.getElementById('mpg-preview-wrap');
  if (!wrap) return;

  if (factor === 1) {
    // Escritorio: iframe ocupa todo el ancho disponible, scroll normal
    frame.style.cssText = 'width:100%;min-height:400px;border:none;border-radius:6px;' +
                          'background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.10);display:block';
    wrap.style.cssText  = 'flex:1;overflow:auto;display:flex;align-items:flex-start;' +
                          'justify-content:center;padding:12px;position:static';
  } else {
    // Tablet: iframe de 768px escalado dentro de un contenedor sin overflow
    const PAD   = 12;
    const wrapW = wrap.offsetWidth - PAD * 2;
    const scale = Math.min(1, wrapW / 768);
    const ifrH  = 900;
    const visH  = Math.round(ifrH * scale);

    // El wrap se convierte en contenedor relativo con altura exacta al área visible
    wrap.style.cssText = `position:relative;overflow:hidden;padding:${PAD}px;` +
                         `height:${visH + PAD * 2}px;flex:none`;

    // iframe posicionado en absoluto para no afectar el layout
    frame.style.cssText = `position:absolute;top:${PAD}px;left:${PAD}px;` +
                          `width:768px;height:${ifrH}px;border:none;border-radius:6px;` +
                          `background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.10);` +
                          `transform:scale(${scale});transform-origin:top left`;
  }
}

function pbSetBg(idx, field, value) {
  if (!PB.sections[idx]) return;
  PB.sections[idx].bg = PB.sections[idx].bg || {};
  PB.sections[idx].bg[field] = value;
  PB.dirty = true;
  if (field === 'type') {
    const el = document.getElementById('pb-bg-opts-' + idx);
    if (el) el.innerHTML = renderBgOpts(PB.sections[idx], idx);
    document.querySelectorAll(`input[name="bg-type-${idx}"]`).forEach(r => {
      r.closest('.pb-bg-tab').classList.toggle('on', r.value === value);
    });
  }
  pbSchedulePreview();
}

function pbSetCmpField(si, ci, field, value) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data = cmp.data || {};
  cmp.data[field] = value;
  PB.dirty = true;
  pbSchedulePreview();
}

function pbSetCard(si, ci, ki, field, value) {
  const cards = PB.sections[si]?.components?.[ci]?.data?.cards;
  if (cards && cards[ki] !== undefined) { cards[ki][field] = value; PB.dirty = true; pbSchedulePreview(); }
}

function pbSetStatItem(si, ci, ki, field, value) {
  const items = PB.sections[si]?.components?.[ci]?.data?.items;
  if (items && items[ki] !== undefined) { items[ki][field] = value; PB.dirty = true; pbSchedulePreview(); }
}

function pbSetFeatItem(si, ci, ki, field, value) {
  const items = PB.sections[si]?.components?.[ci]?.data?.items;
  if (items && items[ki] !== undefined) { items[ki][field] = value; PB.dirty = true; pbSchedulePreview(); }
}

/* ── Secciones ───────────────────────────────────────────────── */

function pbAddSection() {
  PB.sections.push(pbNewSection());
  PB.dirty = true;
  renderBuilder();
  setTimeout(() => {
    const el = document.getElementById('pb-sections');
    if (el) el.lastElementChild?.scrollIntoView({ behavior:'smooth', block:'start' });
  }, 80);
  pbSchedulePreview();
}

function pbRemoveSection(idx) {
  if (PB.sections.length <= 1) { toast('Debe haber al menos una sección'); return; }
  if (!confirm('¿Eliminar esta sección y todo su contenido?')) return;
  PB.sections.splice(idx, 1);
  PB.dirty = true;
  renderBuilder();
  pbSchedulePreview();
}

function pbMoveSection(idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= PB.sections.length) return;
  [PB.sections[idx], PB.sections[j]] = [PB.sections[j], PB.sections[idx]];
  PB.dirty = true;
  renderBuilder();
  pbSchedulePreview();
  setTimeout(() => {
    document.getElementById(`pb-sec-${j}`)?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }, 60);
}

/* ── Componentes ─────────────────────────────────────────────── */

function pbAddComponent(secIdx, type) {
  const sec = PB.sections[secIdx];
  if (!sec) return;
  sec.components = sec.components || [];
  sec.components.push({ id:pbId(), type, data: pbDefaultData(type) });
  PB.dirty = true;
  _pbRefreshCmps(secIdx);
  pbSchedulePreview();
}

function pbRemoveComponent(si, ci) {
  const sec = PB.sections[si];
  if (!sec) return;
  sec.components.splice(ci, 1);
  PB.dirty = true;
  _pbRefreshCmps(si);
  pbSchedulePreview();
}

function pbMoveComponent(si, ci, dir) {
  const cmps = PB.sections[si]?.components;
  if (!cmps) return;
  const j = ci + dir;
  if (j < 0 || j >= cmps.length) return;
  [cmps[ci], cmps[j]] = [cmps[j], cmps[ci]];
  PB.dirty = true;
  _pbRefreshCmps(si);
  pbSchedulePreview();
}

function _pbRefreshCmps(si) {
  const el = document.getElementById(`pb-cmps-${si}`);
  if (!el) { renderBuilder(); return; }
  const cmps = PB.sections[si]?.components || [];
  el.innerHTML = cmps.map((c, ci) => renderPBComponent(c, si, ci)).join('')
    || '<div class="pb-cmps-empty">Sin componentes — añade uno desde la paleta</div>';
}

function _pbRefreshCmp(si, ci) {
  const el = document.getElementById(`pb-cmp-${si}-${ci}`);
  const cmp = PB.sections[si]?.components?.[ci];
  if (!el || !cmp) { _pbRefreshCmps(si); return; }
  el.outerHTML = renderPBComponent(cmp, si, ci);
}

/* ── Cards ───────────────────────────────────────────────────── */

function pbAddCard(si, ci) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.cards = cmp.data.cards || [];
  cmp.data.cards.push(pbDefaultCard());
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
  pbSchedulePreview();
}

function pbRemoveCard(si, ci, ki) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.cards.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
  pbSchedulePreview();
}

function pbMoveCard(si, ci, ki, dir) {
  const cards = PB.sections[si]?.components?.[ci]?.data?.cards;
  if (!cards) return;
  const j = ki + dir;
  if (j < 0 || j >= cards.length) return;
  [cards[ki], cards[j]] = [cards[j], cards[ki]];
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
  pbSchedulePreview();
}

/* ── Stats / Features items ──────────────────────────────────── */

function pbAddStatItem(si, ci) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.items = cmp.data.items || [];
  cmp.data.items.push({ value:'0', label:'Label', icon:'📊' });
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function pbRemoveStatItem(si, ci, ki) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.items.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function pbAddFeatItem(si, ci) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.items = cmp.data.items || [];
  cmp.data.items.push({ icon:'✦', title:'Feature', desc:'Descripción' });
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function pbRemoveFeatItem(si, ci, ki) {
  const cmp = PB.sections[si]?.components?.[ci];
  if (!cmp) return;
  cmp.data.items.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

/* ── Media picker ────────────────────────────────────────────── */

function pbPickBgImage(secIdx) {
  S.mediaContext = 'pb-bg';
  PB._mediaCtx   = { type:'bg', secIdx };
  document.getElementById('media-modal').classList.add('vis');
  filterMedia('images', null);
  updateModalActions();
}

function pbPickCompImage(si, ci, field) {
  S.mediaContext = 'pb-comp';
  PB._mediaCtx   = { type:'comp', si, ci, field };
  document.getElementById('media-modal').classList.add('vis');
  filterMedia('images', null);
  updateModalActions();
}

// Llamado desde media.js insertMedia() cuando S.mediaContext empieza con 'pb-'
function insertMediaForPB(m) {
  if (!m || !PB._mediaCtx) return;
  const url = m.url || '';
  const ctx = PB._mediaCtx;
  PB._mediaCtx = null;

  if (ctx.type === 'bg') {
    pbSetBg(ctx.secIdx, 'imageUrl', url);
    const optsEl = document.getElementById('pb-bg-opts-' + ctx.secIdx);
    if (optsEl) {
      const inp = optsEl.querySelector('input.sinp[placeholder="URL de imagen…"]');
      if (inp) inp.value = url;
    }
  } else if (ctx.type === 'comp') {
    pbSetCmpField(ctx.si, ctx.ci, ctx.field, url);
    // actualizar input visible
    const cmpEl = document.getElementById(`pb-cmp-${ctx.si}-${ctx.ci}`);
    if (cmpEl) {
      cmpEl.querySelectorAll('input.sinp').forEach(inp => {
        if ((inp.getAttribute('oninput') || '').includes(`'${ctx.field}'`)) inp.value = url;
      });
    }
  }
}

/* ── Volver al editor HTML ───────────────────────────────────── */
function pbSwitchToHTML() {
  if (PB.dirty && !confirm('¿Cambiar a editor HTML? Los cambios no guardados del constructor se perderán.')) return;
  // En modo Modelar no hay editor HTML inline; ir a Organizar > Páginas
  if (PB.targetId !== 'page-editor') {
    switchTab('organizar');
    if (typeof switchOrgTab === 'function') {
      const btn = document.querySelector('.org-tab');
      switchOrgTab('paginas', btn);
    }
    if (_curPage) openPage(_curPage);
    return;
  }
  if (!_curPage) return;
  renderPageEditor(_curPage);
}

/* ── Vista previa en nueva pestaña ──────────────────────────── */
function pbPreview() {
  // Si hay panel de preview en línea (modo Modelar), forzar actualización
  if (document.getElementById('mpg-preview-wrap')) {
    pbUpdatePreview();
    toast('Vista previa actualizada');
    return;
  }
  // Modo Organizar: abrir en nueva pestaña
  const html = pbGenerateFullHTML();
  const win  = window.open('', '_blank');
  if (!win) { toast('Permite ventanas emergentes para la vista previa'); return; }
  win.document.write(html);
  win.document.close();
}

/* ── Guardar ────────────────────────────────────────────────── */
async function savePageBuilder() {
  PB.meta.title       = document.getElementById('pb-meta-title')?.value.trim() || PB.meta.title;
  PB.meta.slug        = document.getElementById('pb-meta-slug')?.value.trim()  || PB.meta.slug;
  PB.meta.description = document.getElementById('pb-meta-desc')?.value.trim()  || PB.meta.description || '';

  if (!PB.meta.slug) { toast('El slug es obligatorio'); return; }

  const payload = {
    id      : PB.pageId,
    meta    : PB.meta,
    sections: PB.sections,
    html    : pbGenerateFullHTML(),
  };

  try {
    const r = await api.post('save-page-builder', payload);
    if (r && r.ok) {
      PB.dirty  = false;
      PB.pageId = r.id || PB.pageId;
      toast('✓ Página guardada con el constructor');
      await loadPages();
      if (typeof mpgRefresh === 'function') mpgRefresh();
    } else {
      toast('Error: ' + (r?.error || 'desconocido'));
    }
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
  }
}

/* ════════════════════════════════════════════════════════════════
   GENERACIÓN DE HTML
   ════════════════════════════════════════════════════════════════ */

function pbGenerateFullHTML() {
  const sections = PB.sections.map(s => pbRenderSection(s)).join('\n');
  return `${pbGetCSS()}\n<div class="pb-page">\n${sections}\n</div>`;
}

function pbRenderSection(sec) {
  const bg  = sec.bg || {};
  const css = pbBgCSS(bg);
  const padMap = { none:'0', sm:'32px 0', md:'60px 0', lg:'90px 0', xl:'120px 0' };
  const pad = padMap[sec.padding || 'md'] || '60px 0';
  const wrapCls = sec.width === 'full' ? 'pb-wrap pb-wrap--full' : 'pb-wrap';
  const style   = [css, `padding:${pad}`].filter(Boolean).join(';');

  const cmps = (sec.components || []).map(c => pbRenderComponent(c)).join('\n    ');

  let overlay = '';
  if (bg.type === 'image' && bg.overlayOpacity > 0) {
    const op  = (bg.overlayOpacity || 0) / 100;
    const col = bg.overlayColor || '#000000';
    overlay = `\n  <div class="pb-overlay" style="background:${col};opacity:${op}"></div>`;
  }

  return `<section class="pb-sec" style="${pbEscAttr(style)}">${overlay}\n  <div class="${wrapCls}">\n    ${cmps}\n  </div>\n</section>`;
}

function pbBgCSS(bg) {
  if (!bg || bg.type === 'none')  return '';
  if (bg.type === 'color')        return `background:${bg.color || '#ffffff'}`;
  if (bg.type === 'gradient')     return `background:linear-gradient(${bg.gradDir||'135deg'},${bg.gradA||'#1e293b'},${bg.gradB||'#0f172a'})`;
  if (bg.type === 'image')        return `background:url(${bg.imageUrl||''}) center/${bg.imageSize||'cover'} no-repeat`;
  return '';
}

function pbRenderComponent(cmp) {
  const d = cmp.data || {};

  // Delegar a plugin si el tipo está registrado en ND
  if (typeof ND !== 'undefined') {
    const pluginHTML = ND.renderHTML(cmp.type, d);
    if (pluginHTML !== null) return pluginHTML;
  }

  switch (cmp.type) {
    case 'hero':       return pbHeroHTML(d);
    case 'text':       return pbTextHTML(d);
    case 'card-grid':  return pbCardGridHTML(d);
    case 'split':      return pbSplitHTML(d);
    case 'stats':      return pbStatsHTML(d);
    case 'features':   return pbFeaturesHTML(d);
    case 'cta-banner': return pbCTABannerHTML(d);
    case 'image':      return pbImageHTML(d);
    case 'spacer':     return pbSpacerHTML(d);
    case 'html':       return d.code || '';
    default:           return `<!-- unknown: ${cmp.type} -->`;
  }
}

/* ── Plantillas HTML de componentes ──────────────────────────── */

function pbHeroHTML(d) {
  const align   = d.align || 'center';
  const eyebrow = d.eyebrow ? `<p class="pb-hero-eyebrow">${pbEH(d.eyebrow)}</p>\n  ` : '';
  const sub     = d.subtitle ? `\n  <p class="pb-hero-sub">${pbEH(d.subtitle)}</p>` : '';
  const cta     = d.ctaLabel ? `\n  <div class="pb-hero-cta"><a class="pb-btn pb-btn--${pbEH(d.ctaStyle||'primary')}" href="${pbEscAttr(d.ctaUrl||'#')}">${pbEH(d.ctaLabel)}</a></div>` : '';
  return `<div class="pb-hero pb-hero--${align}">\n  ${eyebrow}<h1 class="pb-hero-title">${pbEH(d.title||'')}</h1>${sub}${cta}\n</div>`;
}

/* ── Bloque Texto: panel de edición ──────────────────────────── */
function renderPBTextFields(d, si, ci) {
  const pf  = `pbSetCmpField(${si},${ci},'`;
  const ref = `_pbRefreshCmp(${si},${ci})`;   // re-render panel cuando cambia el modo

  // ── Tipografía ────────────────────────────────────────────────
  const fontFamilies = [
    ['',              '— Heredar del tema —'],
    ['system-ui,sans-serif', 'Sans-serif (sistema)'],
    ['Georgia,serif',        'Serif (Georgia)'],
    ['monospace',            'Monoespaciado'],
    ['"Impact","Arial Black",sans-serif', 'Display (Impact)'],
  ];
  const fontWeights = [['','— Heredar —'],['300','300 Light'],['400','400 Normal'],['500','500 Medium'],['600','600 SemiBold'],['700','700 Bold'],['800','800 ExtraBold'],['900','900 Black']];
  const transforms  = [['','—'],['uppercase','MAYÚSCULAS'],['capitalize','Capitalizar'],['lowercase','minúsculas']];

  // ── Color texto ───────────────────────────────────────────────
  const colorModes = [['theme','Tema'],['solid','Sólido'],['gradient','Degradado']];
  const cm = d.colorMode || 'theme';
  const showSolidColor    = cm === 'solid';
  const showGradientColor = cm === 'gradient';

  // ── Fondo ─────────────────────────────────────────────────────
  const bgModes = [['none','Ninguno'],['solid','Sólido'],['gradient','Degradado']];
  const bm = d.bgMode || 'none';
  const showSolidBg    = bm === 'solid';
  const showGradientBg = bm === 'gradient';

  // ── Sombra ────────────────────────────────────────────────────
  const shadows = [
    ['','— Ninguna —'],
    ['0 2px 8px rgba(0,0,0,.4)',                     'Sutil'],
    ['0 4px 24px rgba(0,0,0,.55)',                   'Media'],
    ['0 8px 48px rgba(0,0,0,.8)',                    'Fuerte'],
    ['0 0 28px rgba(0,210,255,.85),0 0 60px rgba(0,210,255,.4)',   '✦ Brillo cyan'],
    ['0 0 28px rgba(224,64,251,.85),0 0 60px rgba(224,64,251,.4)', '✦ Brillo magenta'],
    ['0 0 24px rgba(255,180,30,.9),0 0 60px rgba(255,100,0,.4)',   '✦ Brillo dorado'],
    ['0 0 20px rgba(80,232,180,.9),0 0 50px rgba(0,200,130,.4)',   '✦ Brillo verde'],
  ];

  // ── Preview inline del degradado ─────────────────────────────
  const gradPrev = showGradientColor
    ? `<div style="height:6px;border-radius:3px;margin-top:4px;background:linear-gradient(${d.gradientAngle||135}deg,${d.gradientColor1||'#00d2ff'},${d.gradientColor2||'#e040fb'})"></div>` : '';
  const bgGradPrev = showGradientBg
    ? `<div style="height:6px;border-radius:3px;margin-top:4px;background:linear-gradient(${d.bgGradientAngle||135}deg,${d.bgGradientColor1||'#1e2a4a'},${d.bgGradientColor2||'#2d1b4e'})"></div>` : '';

  return `
    <div class="pb-field-section-lbl">Contenido</div>
    <div class="pb-field-row" style="align-items:flex-start">
      <textarea class="sinp pb-textarea" rows="5" style="flex:1"
                oninput="${pf}html',this.value)"
                placeholder="HTML del contenido…">${escH(d.html||'')}</textarea>
    </div>

    <div class="pb-field-section-lbl">Tipografía</div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Fuente</label>
      <select class="pb-mini-sel" style="flex:1" onchange="${pf}fontFamily',this.value)">
        ${fontFamilies.map(([v,l]) => `<option value="${v}" ${(d.fontFamily||'')=== v?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Tamaño</label>
      <input class="sinp" style="width:72px" placeholder="1rem" value="${escH(d.fontSize||'')}"
             oninput="${pf}fontSize',this.value)" title="ej: 1rem / 3rem / 48px">
      <label class="pb-field-lbl" style="margin-left:8px">Peso</label>
      <select class="pb-mini-sel" onchange="${pf}fontWeight',this.value)">
        ${fontWeights.map(([v,l]) => `<option value="${v}" ${(d.fontWeight||'')===v?'selected':''}>${l}</option>`).join('')}
      </select>
      <label class="pb-field-lbl" style="margin-left:8px">Transf.</label>
      <select class="pb-mini-sel" onchange="${pf}textTransform',this.value)">
        ${transforms.map(([v,l]) => `<option value="${v}" ${(d.textTransform||'')===v?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Interlineado</label>
      <input class="sinp" style="width:60px" placeholder="1.75" value="${escH(d.lineHeight||'')}"
             oninput="${pf}lineHeight',this.value)">
      <label class="pb-field-lbl" style="margin-left:8px">Espaciado letras</label>
      <input class="sinp" style="width:72px" placeholder="0em" value="${escH(d.letterSpacing||'')}"
             oninput="${pf}letterSpacing',this.value)" title="ej: 0.05em / 0.15em">
    </div>

    <div class="pb-field-section-lbl">Color del texto</div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Modo</label>
      <select class="pb-mini-sel" onchange="${pf}colorMode',this.value);${ref}">
        ${colorModes.map(([v,l]) => `<option value="${v}" ${cm===v?'selected':''}>${l}</option>`).join('')}
      </select>
      ${showSolidColor ? `
      <input type="color" class="pb-color-inp" value="${d.textColor||'#ffffff'}"
             oninput="${pf}textColor',this.value)">` : ''}
      ${showGradientColor ? `
      <input type="color" class="pb-color-inp" value="${d.gradientColor1||'#00d2ff'}"
             title="Color 1" oninput="${pf}gradientColor1',this.value);${ref}">
      <input type="color" class="pb-color-inp" value="${d.gradientColor2||'#e040fb'}"
             title="Color 2" oninput="${pf}gradientColor2',this.value);${ref}">
      <label class="pb-field-lbl" style="margin-left:6px">°</label>
      <input class="sinp" style="width:52px" type="number" min="0" max="360"
             value="${d.gradientAngle||135}" title="Ángulo"
             oninput="${pf}gradientAngle',+this.value);${ref}">` : ''}
    </div>
    ${gradPrev}

    <div class="pb-field-section-lbl">Fondo del bloque</div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Modo</label>
      <select class="pb-mini-sel" onchange="${pf}bgMode',this.value);${ref}">
        ${bgModes.map(([v,l]) => `<option value="${v}" ${bm===v?'selected':''}>${l}</option>`).join('')}
      </select>
      ${showSolidBg ? `
      <input type="color" class="pb-color-inp" value="${d.bgColor||'#1e2a4a'}"
             oninput="${pf}bgColor',this.value)">` : ''}
      ${showGradientBg ? `
      <input type="color" class="pb-color-inp" value="${d.bgGradientColor1||'#1e2a4a'}"
             title="Color 1" oninput="${pf}bgGradientColor1',this.value);${ref}">
      <input type="color" class="pb-color-inp" value="${d.bgGradientColor2||'#2d1b4e'}"
             title="Color 2" oninput="${pf}bgGradientColor2',this.value);${ref}">
      <label class="pb-field-lbl" style="margin-left:6px">°</label>
      <input class="sinp" style="width:52px" type="number" min="0" max="360"
             value="${d.bgGradientAngle||135}" title="Ángulo"
             oninput="${pf}bgGradientAngle',+this.value);${ref}">` : ''}
    </div>
    ${bgGradPrev}

    <div class="pb-field-section-lbl">Espaciado y forma</div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Alineación</label>
      <select class="pb-mini-sel" onchange="${pf}align',this.value)">
        ${[['left','← Izq.'],['center','— Centro'],['right','→ Dcha.']].map(([v,l]) =>
          `<option value="${v}" ${(d.align||'left')===v?'selected':''}>${l}</option>`).join('')}
      </select>
      <label class="pb-field-lbl" style="margin-left:8px">Ancho máx.</label>
      <input class="sinp" style="width:72px" value="${escH(d.maxWidth||'760px')}"
             oninput="${pf}maxWidth',this.value)" placeholder="760px">
    </div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Relleno</label>
      <input class="sinp" style="flex:1" placeholder="0  /  20px  /  40px 24px" value="${escH(d.padding||'')}"
             oninput="${pf}padding',this.value)" title="CSS padding: ej. 40px 32px">
      <label class="pb-field-lbl" style="margin-left:8px">Radio</label>
      <input class="sinp" style="width:64px" placeholder="0" value="${escH(d.borderRadius||'')}"
             oninput="${pf}borderRadius',this.value)" title="border-radius: ej. 12px">
    </div>

    <div class="pb-field-section-lbl">Efectos</div>
    <div class="pb-field-row">
      <label class="pb-field-lbl">Sombra texto</label>
      <select class="pb-mini-sel" style="flex:1" onchange="${pf}textShadow',this.value)">
        ${shadows.map(([v,l]) => `<option value="${v}" ${(d.textShadow||'')===v?'selected':''}>${l}</option>`).join('')}
      </select>
    </div>`;
}

/* ── Bloque Texto: HTML renderizado ──────────────────────────── */
function pbTextHTML(d) {
  const styles = [];

  // alineación y ancho
  if (d.align && d.align !== 'left') styles.push(`text-align:${d.align}`);
  if (d.maxWidth) { styles.push(`max-width:${d.maxWidth}`); styles.push('margin-left:auto;margin-right:auto'); }

  // tipografía
  if (d.fontFamily)    styles.push(`font-family:${d.fontFamily}`);
  if (d.fontSize)      styles.push(`font-size:${d.fontSize}`);
  if (d.fontWeight)    styles.push(`font-weight:${d.fontWeight}`);
  if (d.lineHeight)    styles.push(`line-height:${d.lineHeight}`);
  if (d.letterSpacing) styles.push(`letter-spacing:${d.letterSpacing}`);
  if (d.textTransform) styles.push(`text-transform:${d.textTransform}`);

  // espaciado y forma
  if (d.padding)       styles.push(`padding:${d.padding}`);
  if (d.borderRadius)  styles.push(`border-radius:${d.borderRadius}`);

  // sombra de texto
  if (d.textShadow)    styles.push(`text-shadow:${d.textShadow}`);

  // fondo (antes del color de texto para no conflicto con gradient text)
  const bm = d.bgMode || 'none';
  if (bm === 'solid' && d.bgColor) {
    styles.push(`background:${d.bgColor}`);
  } else if (bm === 'gradient') {
    const a  = d.bgGradientAngle  ?? 135;
    const c1 = d.bgGradientColor1 || '#1e2a4a';
    const c2 = d.bgGradientColor2 || '#2d1b4e';
    styles.push(`background:linear-gradient(${a}deg,${c1},${c2})`);
  }

  // color de texto (aplicado DESPUÉS del fondo)
  const cm = d.colorMode || 'theme';
  if (cm === 'solid' && d.textColor) {
    styles.push(`color:${d.textColor}`);
  } else if (cm === 'gradient') {
    const a  = d.gradientAngle  ?? 135;
    const c1 = d.gradientColor1 || '#00d2ff';
    const c2 = d.gradientColor2 || '#e040fb';
    // Gradient text necesita que el elemento sea block/inline-block y
    // que el background sea el gradiente (anula el bgMode si hay conflicto)
    styles.push(`background:linear-gradient(${a}deg,${c1},${c2})`);
    styles.push('-webkit-background-clip:text');
    styles.push('-webkit-text-fill-color:transparent');
    styles.push('background-clip:text');
  }

  const styleStr = styles.filter(Boolean).join(';');
  return `<div class="pb-text"${styleStr ? ` style="${styleStr}"` : ''}>${d.html || ''}</div>`;
}

function pbCardGridHTML(d) {
  const cols = d.cols || 'auto';
  const gridCols = cols === 'auto' ? 'repeat(auto-fill,minmax(300px,1fr))' : `repeat(${cols},1fr)`;
  const cards = (d.cards || []).map(card => {
    const pills    = (card.pills || []).map(p => `<span class="pb-pill">${pbEH(p)}</span>`).join('');
    const pillsDiv = pills ? `\n  <div class="pb-pills">${pills}</div>` : '';
    const arrow    = card.link ? `<span class="pb-card-arrow">↗</span>\n  ` : '';
    const tag      = card.tag ? ` <span class="pb-card-tag">${pbEH(card.tag)}</span>` : '';
    const open     = card.link
      ? `<a class="pb-card" href="${pbEscAttr(card.link)}" style="--card-accent:${pbEscAttr(card.accent||'#5068e8')}">`
      : `<div class="pb-card" style="--card-accent:${pbEscAttr(card.accent||'#5068e8')}">`;
    const close    = card.link ? '</a>' : '</div>';
    return `${open}\n  ${arrow}<span class="pb-card-icon">${pbEH(card.icon||'')}</span>\n  <div class="pb-card-name">${pbEH(card.name||'')}${tag}</div>\n  <p class="pb-card-desc">${pbEH(card.desc||'')}</p>${pillsDiv}\n${close}`;
  }).join('\n');
  return `<div class="pb-card-grid" style="grid-template-columns:${gridCols}">\n${cards}\n</div>`;
}

function pbSplitHTML(d) {
  const img  = d.imageUrl ? `<div class="pb-split-img"><img src="${pbEscAttr(d.imageUrl)}" alt="${pbEscAttr(d.imageAlt||'')}" style="border-radius:${pbEscAttr(d.imageRadius||'8px')}"></div>` : '<div class="pb-split-img pb-split-img--empty"></div>';
  const cta  = d.ctaLabel ? `\n  <a class="pb-btn pb-btn--primary" href="${pbEscAttr(d.ctaUrl||'#')}">${pbEH(d.ctaLabel)}</a>` : '';
  const text = `<div class="pb-split-text">${d.title ? `\n  <h2>${pbEH(d.title)}</h2>` : ''}${d.body ? `\n  <p>${pbEH(d.body)}</p>` : ''}${cta}\n</div>`;
  const rev  = d.side === 'right' ? ' pb-split--reverse' : '';
  return `<div class="pb-split${rev}">\n  ${d.side === 'right' ? text + '\n  ' + img : img + '\n  ' + text}\n</div>`;
}

function pbStatsHTML(d) {
  const items = (d.items || []).map(item =>
    `<div class="pb-stat-block">\n  <span class="pb-stat-icon">${pbEH(item.icon||'')}</span>\n  <span class="pb-stat-value">${pbEH(item.value||'')}</span>\n  <span class="pb-stat-label">${pbEH(item.label||'')}</span>\n</div>`).join('\n');
  return `<div class="pb-stats-row">\n${items}\n</div>`;
}

function pbFeaturesHTML(d) {
  const title = d.title ? `<h2 class="pb-features-title">${pbEH(d.title)}</h2>\n` : '';
  const items = (d.items || []).map(item =>
    `<div class="pb-feat-block">\n  <span class="pb-feat-icon">${pbEH(item.icon||'')}</span>\n  <div><strong>${pbEH(item.title||'')}</strong><p>${pbEH(item.desc||'')}</p></div>\n</div>`).join('\n');
  return `<div class="pb-features pb-features--${d.layout||'grid'}">\n${title}<div class="pb-feat-grid">\n${items}\n</div>\n</div>`;
}

function pbCTABannerHTML(d) {
  const sub = d.subtitle ? `\n  <p>${pbEH(d.subtitle)}</p>` : '';
  const cta = d.ctaLabel ? `\n<a class="pb-btn pb-btn--${pbEH(d.ctaStyle||'primary')}" href="${pbEscAttr(d.ctaUrl||'#')}">${pbEH(d.ctaLabel)}</a>` : '';
  return `<div class="pb-cta-banner">\n  <div class="pb-cta-text">\n    <h2>${pbEH(d.title||'')}</h2>${sub}\n  </div>${cta}\n</div>`;
}

function pbImageHTML(d) {
  if (!d.url) return '';
  const cap = d.caption ? `\n  <figcaption>${pbEH(d.caption)}</figcaption>` : '';
  return `<figure class="pb-figure">\n  <img src="${pbEscAttr(d.url)}" alt="${pbEscAttr(d.alt||'')}" style="width:${pbEscAttr(d.width||'100%')};border-radius:${pbEscAttr(d.radius||'8px')}">${cap}\n</figure>`;
}

function pbSpacerHTML(d) {
  const h    = +(d.height || 60);
  const line = d.showLine ? `<hr style="border:none;border-top:1px solid rgba(128,128,128,.2);width:100%">` : '';
  return `<div class="pb-spacer" style="height:${h}px;display:flex;align-items:center">${line}</div>`;
}

/* ── Helpers de escape para el output ───────────────────────── */
function pbEH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function pbEscAttr(s) {
  return String(s || '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ════════════════════════════════════════════════════════════════
   CSS EMBEBIDO EN LA PÁGINA GENERADA
   ════════════════════════════════════════════════════════════════ */

function pbGetCSS() {
  // CSS extra de plugins activos
  const pluginCSS = (typeof ND !== 'undefined') ? ND.getPluginCSS() : '';
  return `<style>
/* ── Page Builder Output v1.0 ──────────────────────────── */
*,*::before,*::after{box-sizing:border-box}
.pb-page{font-family:var(--th-body-font,Inter,system-ui,sans-serif);color:var(--th-text,#e2e8f0)}
.pb-sec{position:relative;width:100%}
.pb-overlay{position:absolute;inset:0;pointer-events:none;z-index:0}
.pb-wrap{max-width:1100px;margin:0 auto;padding:0 40px;position:relative;z-index:1}
.pb-wrap--full{max-width:none;padding:0}
@media(max-width:640px){.pb-wrap{padding:0 20px}}

/* ── Hero ────────────────────────────────────────────────── */
.pb-hero{padding:20px 0}
.pb-hero--center{text-align:center}
.pb-hero--right{text-align:right}
.pb-hero-eyebrow{font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  opacity:.6;margin-bottom:14px}
.pb-hero-title{font-size:clamp(2.2rem,6vw,4.5rem);font-weight:800;line-height:1.1;
  margin-bottom:18px;letter-spacing:-.02em}
.pb-hero-sub{font-size:clamp(1rem,2.5vw,1.3rem);opacity:.72;line-height:1.65;
  max-width:620px;margin-bottom:0}
.pb-hero--center .pb-hero-sub{margin-left:auto;margin-right:auto}
.pb-hero-cta{margin-top:34px}

/* ── Buttons ─────────────────────────────────────────────── */
.pb-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:8px;
  font-size:15px;font-weight:600;text-decoration:none;transition:all .2s;cursor:pointer;
  border:none;font-family:inherit}
.pb-btn--primary{background:var(--th-accent,#5068e8);color:#fff}
.pb-btn--primary:hover{opacity:.85;transform:translateY(-1px)}
.pb-btn--outline{background:transparent;border:2px solid var(--th-accent,#5068e8);color:var(--th-accent,#5068e8)}
.pb-btn--outline:hover{background:var(--th-accent,#5068e8);color:#fff}
.pb-btn--ghost{background:rgba(255,255,255,.1);color:inherit}
.pb-btn--ghost:hover{background:rgba(255,255,255,.18)}

/* ── Text ────────────────────────────────────────────────── */
.pb-text{line-height:1.75;font-size:1rem}
.pb-text h1{font-size:2.4rem;font-weight:800;margin:6px 0 14px;line-height:1.15;
            /* hereda el gradient-text del wrapper si está activo */
            background:inherit;-webkit-background-clip:inherit;-webkit-text-fill-color:inherit;background-clip:inherit}
.pb-text h2{font-size:1.8rem;font-weight:700;margin:8px 0 12px;line-height:1.2;
            background:inherit;-webkit-background-clip:inherit;-webkit-text-fill-color:inherit;background-clip:inherit}
.pb-text h3{font-size:1.3rem;font-weight:600;margin:6px 0 10px;
            background:inherit;-webkit-background-clip:inherit;-webkit-text-fill-color:inherit;background-clip:inherit}
.pb-text p{margin-bottom:10px}
.pb-text ul,.pb-text ol{padding-left:22px;margin-bottom:10px;line-height:1.7}
.pb-text a{color:var(--th-accent,#5068e8);text-decoration:underline}
/* Etiquetas de sección en el panel de edición del texto */
.pb-field-section-lbl{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
  opacity:.45;padding:10px 0 3px;border-top:1px solid rgba(255,255,255,.06);margin-top:4px}

/* ── Card Grid ───────────────────────────────────────────── */
.pb-card-grid{display:grid;gap:24px}
.pb-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
  border-radius:16px;padding:28px 24px;position:relative;transition:all .2s;
  border-top:3px solid var(--card-accent,#5068e8);text-decoration:none;color:inherit;display:block}
.pb-card:hover{background:rgba(255,255,255,.07);transform:translateY(-3px);
  box-shadow:0 10px 36px rgba(0,0,0,.25)}
.pb-card-arrow{position:absolute;top:16px;right:16px;opacity:.28;font-size:16px;transition:opacity .2s}
.pb-card:hover .pb-card-arrow{opacity:.8}
.pb-card-icon{font-size:32px;display:block;margin-bottom:12px}
.pb-card-name{font-size:17px;font-weight:700;margin-bottom:10px;display:flex;
  align-items:center;gap:8px;flex-wrap:wrap}
.pb-card-tag{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;
  background:var(--card-accent,#5068e8);color:#fff;padding:2px 8px;border-radius:4px;opacity:.85}
.pb-card-desc{font-size:13px;opacity:.68;line-height:1.65;margin-bottom:14px}
.pb-pills{display:flex;flex-wrap:wrap;gap:6px}
.pb-pill{font-size:11px;font-weight:500;background:rgba(255,255,255,.08);
  border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:3px 10px}

/* ── Split ───────────────────────────────────────────────── */
.pb-split{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.pb-split--reverse{direction:rtl}
.pb-split--reverse>*{direction:ltr}
.pb-split-img img{width:100%;height:auto;display:block}
.pb-split-img--empty{background:rgba(255,255,255,.05);min-height:200px;border-radius:8px}
.pb-split-text h2{font-size:2rem;font-weight:700;margin-bottom:14px}
.pb-split-text p{opacity:.75;line-height:1.7;margin-bottom:20px}
@media(max-width:768px){.pb-split{grid-template-columns:1fr}.pb-split--reverse{direction:ltr}}

/* ── Stats ───────────────────────────────────────────────── */
.pb-stats-row{display:flex;flex-wrap:wrap;gap:32px;justify-content:center}
.pb-stat-block{text-align:center;min-width:110px}
.pb-stat-icon{font-size:26px;display:block;margin-bottom:6px}
.pb-stat-value{font-size:2.5rem;font-weight:800;color:var(--th-accent,#5068e8);display:block;line-height:1}
.pb-stat-label{font-size:12px;opacity:.58;display:block;margin-top:5px}

/* ── Features ────────────────────────────────────────────── */
.pb-features-title{font-size:1.9rem;font-weight:700;text-align:center;margin-bottom:32px}
.pb-feat-grid{display:grid;gap:24px}
.pb-features--grid .pb-feat-grid{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.pb-features--list .pb-feat-grid{grid-template-columns:1fr}
.pb-feat-block{display:flex;gap:16px;align-items:flex-start}
.pb-feat-icon{font-size:26px;flex-shrink:0}
.pb-feat-block strong{display:block;font-size:15px;font-weight:600;margin-bottom:4px}
.pb-feat-block p{font-size:13px;opacity:.68;line-height:1.6;margin:0}

/* ── CTA Banner ──────────────────────────────────────────── */
.pb-cta-banner{display:flex;align-items:center;justify-content:space-between;
  gap:24px;flex-wrap:wrap;padding:36px 40px;border-radius:16px}
.pb-cta-banner h2{font-size:1.75rem;font-weight:700;margin-bottom:6px}
.pb-cta-banner p{opacity:.72;margin:0}
@media(max-width:600px){.pb-cta-banner{flex-direction:column;text-align:center;padding:28px 20px}}

/* ── Image ───────────────────────────────────────────────── */
.pb-figure{text-align:center;margin:0}
.pb-figure img{max-width:100%;height:auto;display:block;margin:0 auto}
.pb-figure figcaption{font-size:12px;opacity:.48;margin-top:8px}

/* ── Spacer ──────────────────────────────────────────────── */
.pb-spacer{width:100%}
${pluginCSS ? `\n/* ── Plugin CSS ─────────────────────────────────────────── */\n${pluginCSS}` : ''}
</style>`;
}
