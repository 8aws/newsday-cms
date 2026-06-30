ND.registerPlugin({
  id: 'logos_marquee',
  name: 'Carrusel de Logos Pro',
  version: '1.2.1',

  components: [{
    type: 'logos_marquee',
    ic: '🎠',
    lb: 'Marquesina de Logos',
    hint: 'Carrusel infinito automatizado para marcas y partners con control de contenedor y sombras laterales',

    defaultData() {
      return {
        _panelAjustesAbierto: false,
        
        // Ajustes del Carrusel / Animación
        velocidad: '30s',
        alturaLogo: '45px',
        gapLogos: '60px',
        invertirDireccion: 'no',

        // Contenedor Global y Fondo Exterior
        marginVertical: '30px',
        paddingBloque: '20px',
        bordeRadioBloque: '0px',
        tipoFondoBloque: 'heredar', // 'heredar', 'solido', 'degradado'
        colorBgSolido: '#ffffff',
        colorBgGrad1: '#ffffff',
        colorBgGrad2: '#f8fafc',

        // Control de Sombras / Difuminados Laterales
        sombrasLaterales: 'difuminado', // 'difuminado', 'linea', 'ninguno'
        colorSombras: '#ffffff',

        // Listado de Logos iniciales
        listaLogos: [
          { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60', alt: 'Marca 1' },
          { url: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=120&auto=format&fit=crop&q=60', alt: 'Marca 2' },
          { url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=120&auto=format&fit=crop&q=60', alt: 'Marca 3' },
          { url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?w=120&auto=format&fit=crop&q=60', alt: 'Marca 4' }
        ]
      };
    },

    renderFields(d, si, ci) {
      const opcionesSombras = [['difuminado', 'Difuminado Suave (Fading)'], ['linea', 'Líneas Delimitadoras'], ['ninguno', 'Ninguno (Limpio/Abierto)']];
      const fondosBloque = [['heredar', 'Heredar fondo'], ['solido', 'Color Sólido'], ['degradado', 'Degradado Suave']];
      const direcciones = [['no', 'De Derecha a Izquierda'], ['si', 'De Izquierda a Derecha']];

      const logosHTML = (d.listaLogos || []).map((l, ki) => `
        <div class="pb-card-item" style="padding:10px; border:1px solid #ccd4ff; margin-bottom:10px; border-radius:6px; background:#f9faff;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="font-size:11px; color:#3b82f6;">🖼️ Logo #${ki+1}</strong>
            <button class="btn btn-red btn-sm" onclick="_ndMarqueeRemove(${si},${ci},${ki})">✕ Eliminar</button>
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">URL Imagen</span>
            <input class="sinp" style="flex:1" value="${_ndEH(l.url)}" oninput="_ndMarqueeSet(${si},${ci},${ki},'url',this.value)">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Texto Alt</span>
            <input class="sinp" style="flex:1" value="${_ndEH(l.alt)}" placeholder="ej: Partner comercial" oninput="_ndMarqueeSet(${si},${ci},${ki},'alt',this.value)">
          </div>
        </div>
      `).join('');

      return `
        <div style="font-weight:bold; font-size:13px; margin-bottom:6px;">Logos e Imágenes de la Marquesina:</div>
        <div>${logosHTML}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%; border:1px solid #3b82f6; color:#3b82f6; margin-bottom:12px;" onclick="_ndMarqueeAdd(${si},${ci})">＋ Añadir Logo</button>
        
        <details ${d._panelAjustesAbierto?'open':''} style="cursor:pointer; font-size:12px; border-top:1px solid #eee; padding-top:8px;" ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; user-select:none;">⚙️ Personalización Física y Contenedor Global</summary>
          <div style="padding-top:8px; display:flex; flex-direction:column; gap:8px;" onclick="event.stopPropagation()">
            
            <div style="font-weight:bold; color:#333; font-size:11px;">Ajustes de la Animación:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Velocidad</span>
              <input class="sinp" style="width:70px" value="${d.velocidad || '30s'}" placeholder="ej: 30s" oninput="pbSetCmpField(${si},${ci},'velocidad',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:10px">Alto Logo</span>
              <input class="sinp" style="width:70px" value="${d.alturaLogo || '45px'}" oninput="pbSetCmpField(${si},${ci},'alturaLogo',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:10px">Separación</span>
              <input class="sinp" style="width:70px" value="${d.gapLogos || '60px'}" oninput="pbSetCmpField(${si},${ci},'gapLogos',this.value); pbSchedulePreview();">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Invertir Sentido</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'invertirDireccion',this.value); pbSchedulePreview();">
                ${direcciones.map(([v,l]) => `<option value="${v}" ${d.invertirDireccion===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div style="font-weight:bold; color:#333; font-size:11px; margin-top:4px;">Sombras / Difuminados Laterales:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Efecto Extremos</span>
              <select class="pb-mini-sel" style="width:160px" onchange="pbSetCmpField(${si},${ci},'sombrasLaterales',this.value); _pbRefreshCmp(${si},${ci})">
                ${opcionesSombras.map(([v,l]) => `<option value="${v}" ${d.sombrasLaterales===v?'selected':''}>${l}</option>`).join('')}
              </select>
              
              ${d.sombrasLaterales !== 'ninguno' ? `
                <span class="pb-field-lbl" style="margin-left:8px">Color Brillo</span>
                <input type="color" class="pb-color-inp" value="${d.colorSombras || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorSombras',this.value); pbSchedulePreview();">
              ` : ''}
            </div>

            <div style="font-weight:bold; color:#333; font-size:11px; margin-top:4px;">Contenedor Global y Fondo:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Fondo Bloque</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'tipoFondoBloque',this.value); _pbRefreshCmp(${si},${ci})">
                ${fondosBloque.map(([v,l]) => `<option value="${v}" ${d.tipoFondoBloque===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            ${d.tipoFondoBloque === 'solido' ? `
              <div class="pb-field-row">
                <span class="pb-field-lbl">Color Fondo Fijo</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgSolido || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBgSolido',this.value); pbSchedulePreview();">
              </div>
            ` : ''}
            
            ${d.tipoFondoBloque === 'degradado' ? `
              <div class="pb-field-row">
                <span class="pb-field-lbl">Color Inicial</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgGrad1 || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBgGrad1',this.value); pbSchedulePreview();">
                <span class="pb-field-lbl" style="margin-left:10px">Color Final</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgGrad2 || '#f8fafc'}" oninput="pbSetCmpField(${si},${ci},'colorBgGrad2',this.value); pbSchedulePreview();">
              </div>
            ` : ''}

            <div class="pb-field-row">
              <span class="pb-field-lbl">Margen (V)</span>
              <input class="sinp" style="width:65px" value="${d.marginVertical || '30px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:5px">Padding</span>
              <input class="sinp" style="width:65px" value="${d.paddingBloque || '20px'}" oninput="pbSetCmpField(${si},${ci},'paddingBloque',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:5px">Radio</span>
              <input class="sinp" style="width:50px" value="${d.bordeRadioBloque || '0px'}" oninput="pbSetCmpField(${si},${ci},'bordeRadioBloque',this.value); pbSchedulePreview();">
            </div>
          </div>
        </details>`;
    },

    renderHTML(d) {
      let estiloFondoBloque = 'background: transparent;';
      if (d.tipoFondoBloque === 'solido') estiloFondoBloque = `background: ${d.colorBgSolido || '#ffffff'};`;
      if (d.tipoFondoBloque === 'degradado') {
        estiloFondoBloque = `background: linear-gradient(135deg, ${d.colorBgGrad1 || '#ffffff'} 0%, ${d.colorBgGrad2 || '#f8fafc'} 100%);`;
      }

      const arrLogos = d.listaLogos || [];
      const logosFiltrados = arrLogos.filter(l => l.url && l.url.trim() !== '');
      
      if (logosFiltrados.length === 0) {
        return `<div style="padding:20px; text-align:center; opacity:0.5; font-size:12px;">(Añade marcas o imágenes válidas en el panel lateral)</div>`;
      }

      // Multiplicamos para generar bucle sin saltos visuales en pantallas anchas
      const totalLogos = [...logosFiltrados, ...logosFiltrados, ...logosFiltrados];

      const itemsHTML = totalLogos.map(l => `
        <div class="nd-marquee-item">
          <img src="${_ndEH(l.url)}" alt="${_ndEH(l.alt || 'Logo')}" style="height: ${d.alturaLogo || '45px'};">
        </div>
      `).join('');

      const claseDireccion = d.invertirDireccion === 'si' ? 'nd-marquee-reverse' : '';
      const claseSombra = `nd-marquee-shadow-${d.sombrasLaterales || 'difuminado'}`;
      const colorSombraVar = d.colorSombras || '#ffffff';

      return `
        <div class="nd-marquee-block-container" 
             style="${estiloFondoBloque}
                    margin-top: ${d.marginVertical || '30px'}; margin-bottom: ${d.marginVertical || '30px'};
                    padding: ${d.paddingBloque || '20px'}; border-radius: ${d.bordeRadioBloque || '0px'};">
          
          <div class="nd-marquee-track ${claseSombra} ${claseDireccion}" 
               style="--nd-marquee-speed: ${d.velocidad || '30s'}; --nd-marquee-gap: ${d.gapLogos || '60px'}; --nd-marquee-fade-color: ${colorSombraVar};">
            <div class="nd-marquee-inner">
              ${itemsHTML}
            </div>
          </div>

        </div>`;
    },

    css: `
.nd-marquee-block-container { box-sizing: border-box; width: 100%; overflow: hidden; }
.nd-marquee-track { position: relative; width: 100%; overflow: hidden; display: flex; align-items: center; }

.nd-marquee-shadow-difuminado::before {
  content: ''; position: absolute; left: 0; top: 0; width: 120px; height: 100%;
  background: linear-gradient(to right, var(--nd-marquee-fade-color) 0%, rgba(255,255,255,0) 100%); z-index: 3; pointer-events: none;
}
.nd-marquee-shadow-difuminado::after {
  content: ''; position: absolute; right: 0; top: 0; width: 120px; height: 100%;
  background: linear-gradient(to left, var(--nd-marquee-fade-color) 0%, rgba(255,255,255,0) 100%); z-index: 3; pointer-events: none;
}

.nd-marquee-shadow-linea::before {
  content: ''; position: absolute; left: 0; top: 0; width: 100%; height: 100%;
  border-left: 2px solid var(--nd-marquee-fade-color); border-right: 2px solid var(--nd-marquee-fade-color); z-index: 3; pointer-events: none; box-sizing: border-box;
}

.nd-marquee-shadow-ninguno::before, .nd-marquee-shadow-ninguno::after { display: none !important; }

.nd-marquee-inner { display: flex; width: max-content; gap: var(--nd-marquee-gap); animation: ndMarqueeLoop var(--nd-marquee-speed) linear infinite; padding: 10px 0; }
.nd-marquee-item { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nd-marquee-item img { width: auto; object-fit: contain; max-width: 180px; filter: grayscale(100%); opacity: 0.6; transition: all 0.3s ease; }
.nd-marquee-item img:hover { filter: grayscale(0%); opacity: 1; }

.nd-marquee-reverse .nd-marquee-inner { animation-direction: reverse; }

@keyframes ndMarqueeLoop {
  0% { transform: translateX(0); }
  100% { transform: translateX(-33.3333%); }
}
`
  }]
});

// Funciones controladoras globales con inicialización segura blindada
function _ndMarqueeSet(si, ci, ki, f, v) {
  const c = PB.sections[si]?.components?.[ci]; if (!c) return;
  if (!c.data.listaLogos) c.data.listaLogos = [];
  if (c.data.listaLogos[ki]) {
    c.data.listaLogos[ki][f] = v; PB.dirty = true; pbSchedulePreview();
  }
}

function _ndMarqueeAdd(si, ci) {
  const c = PB.sections[si]?.components?.[ci]; if (!c) return;
  // Forzamos la creación del array si por contexto de Newsday llega indefinido
  if (!c.data.listaLogos || !Array.isArray(c.data.listaLogos)) {
    c.data.listaLogos = [];
  }
  c.data.listaLogos.push({ url: '', alt: 'Nueva Marca' });
  PB.dirty = true; 
  _pbRefreshCmp(si, ci);
}

function _ndMarqueeRemove(si, ci, ki) {
  const c = PB.sections[si]?.components?.[ci]; if (!c) return;
  if (!c.data.listaLogos) c.data.listaLogos = [];
  c.data.listaLogos.splice(ki, 1); 
  PB.dirty = true; 
  _pbRefreshCmp(si, ci);
}
function _ndEH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }