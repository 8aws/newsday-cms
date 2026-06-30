ND.registerPlugin({
  id: 'pricing_table',
  name: 'Tabla de Precios Pro',
  version: '1.2.2',

  components: [{
    type: 'pricing_table',
    ic: '⚡',
    lb: 'Precios / Planes',
    hint: 'Tabla comparativa de tarifas con control de diseño libre por columna y contenedor global',

    defaultData() {
      return {
        _panelAjustesAbierto: false,
        gap: '24px',
        marginVertical: '40px',
        paddingBloque: '24px',
        bordeRadioBloque: '0px',
        tipoFondoBloque: 'heredar', 
        colorBgSolido: '#ffffff',
        colorBgGrad1: '#ffffff',
        colorBgGrad2: '#f8fafc',
        
        tipoBordeBloque: 'solido', // 'ninguno', 'solido', 'dashed'
        colorLineaBase: '#e2e8f0',

        listaPlanes: [
          {
            nombre: 'Básico',
            precio: '9€',
            periodo: '/mes',
            badge: '',
            esDestacado: 'no',
            caracteristicas: '✓ 1 Sitio Web\n✓ 5GB Almacenamiento\n✕ Soporte 24/7',
            textoBoton: 'Empezar ya',
            urlBoton: '#',
            formaPlan: 'rounded',
            tipoFondo: 'solido',
            colorBg: '#ffffff',
            colorTxt: '#1e293b',
            colorBoton: '#5068e8'
          },
          {
            nombre: 'Premium',
            precio: '29€',
            periodo: '/mes',
            badge: 'POPULAR',
            esDestacado: 'si',
            caracteristicas: '✓ Sitios Ilimitados\n✓ 100GB Almacenamiento\n✓ Soporte Premium\n✓ Acceso API',
            textoBoton: 'Hacer Premium',
            urlBoton: '#',
            formaPlan: 'rounded',
            tipoFondo: 'degradado',
            colorBg1: '#1e293b',
            colorBg2: '#0f172a',
            colorTxt: '#ffffff',
            colorBoton: '#00dcff'
          }
        ]
      };
    },

    renderFields(d, si, ci) {
      const formas = [['square','Recto'],['rounded','Suave'],['pill','Píldora']];
      const fondosTarjeta = [['solido','Sólido'],['degradado','Degradado']];
      const fondosBloque = [['heredar', 'Heredar fondo'], ['solido', 'Color Sólido'], ['degradado', 'Degradado Suave']];
      const bordesBloque = [['ninguno', 'Ninguno (Sin Líneas)'], ['solido', 'Línea Sólida'], ['dashed', 'Línea Discontinua']];
      
      const planesHTML = (d.listaPlanes || []).map((p, ki) => {
        return `
          <div class="pb-card-item" style="padding:12px; border:1px solid #ccd4ff; margin-bottom:12px; border-radius:6px; background:#f9faff;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
              <strong style="font-size:12px; color:#3b82f6;">📦 Plan #${ki + 1}: ${p.nombre}</strong>
              <button class="btn btn-red btn-sm" onclick="_ndPriceRemove(${si},${ci},${ki})">✕ Eliminar</button>
            </div>
            
            <div class="pb-field-row">
              <span class="pb-field-lbl">Nombre</span>
              <input class="sinp" style="flex:1" value="${_ndEH(p.nombre)}" oninput="_ndPriceSet(${si},${ci},${ki},'nombre',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Precio</span>
              <input class="sinp" style="width:80px" value="${_ndEH(p.precio)}" placeholder="ej: 9€" oninput="_ndPriceSet(${si},${ci},${ki},'precio',this.value)">
              <span class="pb-field-lbl" style="margin-left:8px">Sufijo</span>
              <input class="sinp" style="flex:1" value="${_ndEH(p.periodo)}" placeholder="ej: /mes" oninput="_ndPriceSet(${si},${ci},${ki},'periodo',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Badge</span>
              <input class="sinp" style="flex:1" value="${_ndEH(p.badge)}" oninput="_ndPriceSet(${si},${ci},${ki},'badge',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">¿Destacado?</span>
              <select class="pb-mini-sel" style="flex:1" onchange="_ndPriceSet(${si},${ci},${ki},'esDestacado',this.value)">
                <option value="no" ${p.esDestacado==='no'?'selected':''}>No</option>
                <option value="si" ${p.esDestacado==='si'?'selected':''}>Sí (Glow)</option>
              </select>
            </div>

            <div class="pb-field-row" style="align-items:flex-start">
              <span class="pb-field-lbl" style="padding-top:4px">Características</span>
              <textarea class="pb-textarea" style="flex:1" rows="3" oninput="_ndPriceSet(${si},${ci},${ki},'caracteristicas',this.value)">${_ndEH(p.caracteristicas)}</textarea>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Botón</span>
              <input class="sinp" style="width:110px" value="${_ndEH(p.textoBoton)}" oninput="_ndPriceSet(${si},${ci},${ki},'textoBoton',this.value)">
              <span class="pb-field-lbl" style="margin-left:8px">URL</span>
              <input class="sinp" style="flex:1" value="${_ndEH(p.urlBoton)}" oninput="_ndPriceSet(${si},${ci},${ki},'urlBoton',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Forma</span>
              <select class="pb-mini-sel" style="width:90px" onchange="_ndPriceSet(${si},${ci},${ki},'formaPlan',this.value)">
                ${formas.map(([v,l]) => `<option value="${v}" ${p.formaPlan===v?'selected':''}>${l}</option>`).join('')}
              </select>
              <span class="pb-field-lbl" style="margin-left:5px">Fondo</span>
              <select class="pb-mini-sel" style="width:90px" onchange="_ndPriceSet(${si},${ci},${ki},'tipoFondo',this.value); _pbRefreshCmp(${si},${ci})">
                ${fondosTarjeta.map(([v,l]) => `<option value="${v}" ${p.tipoFondo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Texto</span>
              <input type="color" class="pb-color-inp" value="${p.colorTxt || '#1e293b'}" oninput="_ndPriceSet(${si},${ci},${ki},'colorTxt',this.value)">
              <span class="pb-field-lbl" style="margin-left:5px">CTA</span>
              <input type="color" class="pb-color-inp" value="${p.colorBoton || '#5068e8'}" oninput="_ndPriceSet(${si},${ci},${ki},'colorBoton',this.value)">
              ${p.tipoFondo==='solido'? `
                <span class="pb-field-lbl" style="margin-left:5px">Bg</span>
                <input type="color" class="pb-color-inp" value="${p.colorBg || '#ffffff'}" oninput="_ndPriceSet(${si},${ci},${ki},'colorBg',this.value)">
              ` : `
                <input type="color" class="pb-color-inp" value="${p.colorBg1 || '#ffffff'}" oninput="_ndPriceSet(${si},${ci},${ki},'colorBg1',this.value)">
                <input type="color" class="pb-color-inp" value="${p.colorBg2 || '#f8fafc'}" oninput="_ndPriceSet(${si},${ci},'colorBg2',this.value)">
              `}
            </div>
          </div>`;
      }).join('');

      return `
        <div style="font-weight:bold; font-size:13px; margin-bottom:8px;">Planes de Tarifas:</div>
        <div>${planesHTML}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%; border:1px solid #3b82f6; color:#3b82f6; margin-bottom:12px;" onclick="_ndPriceAdd(${si},${ci})">＋ Añadir Plan</button>
        
        <details ${d._panelAjustesAbierto?'open':''} style="cursor:pointer; font-size:12px; border-top:1px solid #eee; padding-top:8px;" ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; user-select:none;">⚙️ Personalización del Bloque (Contenedor Global)</summary>
          <div style="padding-top:8px; display:flex; flex-direction:column; gap:8px;" onclick="event.stopPropagation()">
            
            <div class="pb-field-row">
              <span class="pb-field-lbl">Separación</span>
              <input class="sinp" style="width:70px" value="${d.gap || '24px'}" oninput="pbSetCmpField(${si},${ci},'gap',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:10px">Fondo Bloque</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'tipoFondoBloque',this.value); _pbRefreshCmp(${si},${ci})">
                ${fondosBloque.map(([v,l]) => `<option value="${v}" ${d.tipoFondoBloque===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Líneas Base</span>
              <select class="pb-mini-sel" style="width:120px" onchange="pbSetCmpField(${si},${ci},'tipoBordeBloque',this.value); _pbRefreshCmp(${si},${ci})">
                ${bordesBloque.map(([v,l]) => `<option value="${v}" ${d.tipoBordeBloque===v?'selected':''}>${l}</option>`).join('')}
              </select>
              
              ${d.tipoBordeBloque !== 'ninguno' ? `
                <span class="pb-field-lbl" style="margin-left:8px">Color</span>
                <input type="color" class="pb-color-inp" value="${d.colorLineaBase || '#e2e8f0'}" oninput="pbSetCmpField(${si},${ci},'colorLineaBase',this.value); pbSchedulePreview();">
              ` : ''}
            </div>

            ${d.tipoFondoBloque === 'solido' ? `
              <div class="pb-field-row">
                <span class="pb-field-lbl">Color de Fondo</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgSolido || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBgSolido',this.value); pbSchedulePreview();">
              </div>
            ` : ''}
            
            ${d.tipoFondoBloque === 'degradado' ? `
              <div class="pb-field-row">
                <span class="pb-field-lbl">Color Gradiente 1</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgGrad1 || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBgGrad1',this.value); pbSchedulePreview();">
                <span class="pb-field-lbl" style="margin-left:10px">Color 2</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgGrad2 || '#f8fafc'}" oninput="pbSetCmpField(${si},${ci},'colorBgGrad2',this.value); pbSchedulePreview();">
              </div>
            ` : ''}

            <div class="pb-field-row">
              <span class="pb-field-lbl">Margen (V)</span>
              <input class="sinp" style="width:65px" value="${d.marginVertical || '40px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:5px">Padding</span>
              <input class="sinp" style="width:65px" value="${d.paddingBloque || '24px'}" oninput="pbSetCmpField(${si},${ci},'paddingBloque',this.value); pbSchedulePreview();">
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

      // CORREGIDO: Espaciado explícito antes de la variable del color para evitar rotura sintáctica en 'solid'
      let estiloBordes = 'border-top: none; border-bottom: none;';
      if (d.tipoBordeBloque && d.tipoBordeBloque !== 'ninguno') {
        const colorBorde = d.colorLineaBase || '#e2e8f0';
        estiloBordes = `border-top: 1px ${d.tipoBordeBloque} ${colorBorde}; border-bottom: 1px ${d.tipoBordeBloque} ${colorBorde};`;
      }

      const planesHTML = (d.listaPlanes || []).map(p => {
        const destacadoClase = p.esDestacado === 'si' ? 'nd-price-featured' : '';
        const formaClase = `nd-price-shape-${p.formaPlan || 'rounded'}`;
        
        let fondoCSS = p.colorBg || '#ffffff';
        if (p.tipoFondo === 'degradado') {
          fondoCSS = `linear-gradient(135deg, ${p.colorBg1 || '#ffffff'} 0%, ${p.colorBg2 || '#f1f5f9'} 100%)`;
        }

        const lineasFeatures = (p.caracteristicas || '').split('\n').map(l => {
          if(!l.trim()) return '';
          return `<li>${l}</li>`;
        }).join('');

        return `
          <div class="nd-price-card ${destacadoClase} ${formaClase}" 
               style="--nd-p-bg: ${fondoCSS}; --nd-p-txt: ${p.colorTxt || '#1e293b'}; --nd-p-btn: ${p.colorBoton || '#5068e8'}">
            ${p.badge ? `<span class="nd-price-badge">${_ndEH(p.badge)}</span>` : ''}
            <h5 class="nd-price-title">${_ndEH(p.nombre)}</h5>
            <div class="nd-price-amount">
              ${_ndEH(p.precio)}<span class="nd-price-period">${_ndEH(p.periodo || '')}</span>
            </div>
            <ul class="nd-price-features">${lineasFeatures}</ul>
            <a href="${_ndEH(p.urlBoton || '#')}" class="nd-price-cta">${_ndEH(p.textoBoton || 'Seleccionar')}</a>
          </div>`;
      }).join('');

      return `
        <div class="nd-price-block-container" 
             style="${estiloFondoBloque} ${estiloBordes}
                    margin-top: ${d.marginVertical || '40px'}; margin-bottom: ${d.marginVertical || '40px'};
                    padding: ${d.paddingBloque || '24px'}; border-radius: ${d.bordeRadioBloque || '0px'};">
          <div class="nd-price-wrapper" style="--nd-p-gap: ${d.gap || '24px'};">
            ${planesHTML}
          </div>
        </div>`;
    },

    css: `
.nd-price-block-container { box-sizing: border-box; width: 100%; }
.nd-price-wrapper { display: flex; flex-wrap: wrap; gap: var(--nd-p-gap); margin: 0 auto; width:100%; box-sizing:border-box; justify-content: center; align-items: stretch; }
.nd-price-card { flex: 1; min-width: 280px; max-width: 380px; padding: 32px 24px; display: flex; flex-direction: column; position: relative; box-sizing: border-box; transition: all .3s ease; border: 1px solid rgba(0,0,0,0.06); background: var(--nd-p-bg); color: var(--nd-p-txt); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
.nd-price-shape-square { border-radius: 0; }
.nd-price-shape-rounded { border-radius: 12px; }
.nd-price-shape-pill { border-radius: 24px; }
.nd-price-badge { position: absolute; top: 16px; right: 16px; font-size: 0.7rem; font-weight: 800; background: var(--nd-p-btn); color: #fff; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.05em; }
.nd-price-title { font-size: 1.2rem; font-weight: 700; margin: 0 0 12px 0; font-family: inherit; }
.nd-price-amount { font-size: 2.5rem; font-weight: 800; line-height: 1; margin-bottom: 20px; font-family: inherit; }
.nd-price-period { font-size: 0.9rem; font-weight: 400; opacity: 0.6; margin-left: 4px; font-family: inherit; }
.nd-price-features { list-style: none; padding: 0; margin: 0 0 30px 0; flex: 1; text-align: left; font-size: 0.92rem; font-family: inherit; }
.nd-price-features li { padding: 8px 0; border-bottom: 1px solid rgba(128,128,128,0.1); opacity: 0.85; }
.nd-price-features li:last-child { border-bottom: none; }
.nd-price-cta { display: block; width: 100%; padding: 12px; text-align: center; background: var(--nd-p-btn); color: #fff; font-weight: 600; text-decoration: none; border-radius: 6px; box-sizing: border-box; transition: filter 0.2s; margin-top: auto; font-family: inherit; }
.nd-price-cta:hover { filter: brightness(1.1); }
.nd-price-featured { transform: scale(1.03); z-index: 2; border-color: var(--nd-p-btn); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.15), 0 0 20px var(--nd-p-btn); }
@media(max-width: 768px) { .nd-price-featured { transform: none; } }
`
  }]
});

function _ndPriceSet(si,ci,ki,f,v) {
  const c = PB.sections[si]?.components?.[ci]; if(!c) return;
  c.data.listaPlanes[ki][f] = v; PB.dirty = true; pbSchedulePreview();
}
function _ndPriceAdd(si,ci) {
  const c = PB.sections[si]?.components?.[ci]; if(!c) return;
  c.data.listaPlanes.push({nombre:'Nuevo Plan',precio:'19€',periodo:'/mes',badge:'',esDestacado:'no',caracteristicas:'✓ Servicio',textoBoton:'Comprar',urlBoton:'#',formaPlan:'rounded',tipoFondo:'solido',colorBg:'#ffffff',colorTxt:'#1e293b',colorBoton:'#5068e8'});
  PB.dirty = true; _pbRefreshCmp(si,ci);
}
function _ndPriceRemove(si,ci,ki) {
  const c = PB.sections[si]?.components?.[ci]; if(!c) return;
  c.data.listaPlanes.splice(ki,1); PB.dirty = true; _pbRefreshCmp(si,ci);
}
function _ndEH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }