ND.registerPlugin({
  id: 'ribbon',
  name: 'Ribbon Pro Destacados',
  version: '1.0.0',

  components: [{
    type: 'ribbon',
    ic: '🎗️',
    lb: 'Ribbon / Banner',
    hint: 'Cinta o banner destacado personalizable para alertas o anuncios',

    defaultData() {
      return {
        _panelAjustesAbierto: false,
        
        // Contenido
        texto: '¡Gran inauguración! Usa el código <strong>WELCOME27</strong> para un 20% de descuento.',
        urlIcono: '🎉',
        
        // Botón integrado opcional
        llevaBoton: 'no', // 'si', 'no'
        textoBoton: 'Saber más',
        urlBoton: '#',
        colorBotonBg: '#ffffff',
        colorBotonTxt: '#1e293b',

        // Estructura y Diseño
        formaRibbon: 'rounded', // 'square', 'rounded', 'pill', 'flecha-derecha', 'rasgado'
        anchoTipo: 'completo', // 'completo', 'fijo', 'porcentaje'
        anchoValor: '1000px',
        marginVertical: '15px',
        paddingVertical: '12px',
        paddingHorizontal: '20px',
        sombraTipo: 'suave', // 'ninguna', 'suave', 'intensa', 'neon'
        fontFamily: 'inherit',

        // Colores y Fondos
        tipoFondo: 'degradado', // 'solido', 'degradado'
        colorFondoSolido: '#ef4444',
        colorDegradado1: '#f43f5e',
        colorDegradado2: '#e11d48',
        colorTexto: '#ffffff'
      };
    },

    renderFields(d, si, ci) {
      const formas = [['square', 'Recto (Square)'], ['rounded', 'Bordes Suaves'], ['pill', 'Píldora completo'], ['flecha-derecha', 'Indicador (Flecha Derecha)'], ['rasgado', 'Bordes Rasgados / Ticket']];
      const anchos = [['completo', 'Ancho Completo (100%)'], ['fijo', 'Ancho Fijo (px)'], ['porcentaje', 'Porcentaje (%)']];
      const fondos = [['solido', 'Color Sólido'], ['degradado', 'Degradado Dinámico']];
      const sombras = [['ninguna', 'Sin Sombra'], ['suave', 'Sombra sutil'], ['intensa', 'Sombra marcada'], ['neon', 'Brillo Neón']];
      const fuentes = [['inherit', 'Heredar tema'], ['sans-serif', 'Sans-Serif'], ['serif', 'Serif'], ['monospace', 'Monospace']];

      const panelAbiertoAttr = d._panelAjustesAbierto ? 'open' : '';

      return `
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
          <div class="pb-field-row" style="align-items:flex-start">
            <span class="pb-field-lbl" style="padding-top:6px">Texto Ribbon</span>
            <textarea class="pb-textarea" style="flex:1" rows="2" oninput="pbSetCmpField(${si},${ci},'texto',this.value); pbSchedulePreview();">${_ndEH(d.texto || '')}</textarea>
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Icono/Emoji</span>
            <input class="sinp" style="flex:1" value="${_ndEH(d.urlIcono || '')}" placeholder="ej: ⚠️ o URL" oninput="pbSetCmpField(${si},${ci},'urlIcono',this.value); pbSchedulePreview();">
          </div>
          
          <div class="pb-field-row">
            <span class="pb-field-lbl">¿Lleva Botón CTA?</span>
            <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'llevaBoton',this.value); _pbRefreshCmp(${si},${ci})">
              <option value="no" ${d.llevaBoton==='no'?'selected':''}>No</option>
              <option value="si" ${d.llevaBoton==='si'?'selected':''}>Sí, añadir botón de acción</option>
            </select>
          </div>

          ${d.llevaBoton === 'si' ? `
            <div style="background:#f1f5f9; padding:8px; border-radius:4px; display:flex; flex-direction:column; gap:6px; border:1px solid #cbd5e1;">
              <div class="pb-field-row">
                <span class="pb-field-lbl">Texto Botón</span>
                <input class="sinp" style="flex:1" value="${_ndEH(d.textoBoton || '')}" oninput="pbSetCmpField(${si},${ci},'textoBoton',this.value); pbSchedulePreview();">
              </div>
              <div class="pb-field-row">
                <span class="pb-field-lbl">Enlace Botón</span>
                <input class="sinp" style="flex:1" value="${_ndEH(d.urlBoton || '')}" oninput="pbSetCmpField(${si},${ci},'urlBoton',this.value); pbSchedulePreview();">
              </div>
              <div class="pb-field-row">
                <span class="pb-field-lbl">Fondo Botón</span>
                <input type="color" class="pb-color-inp" value="${d.colorBotonBg || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBotonBg',this.value); pbSchedulePreview();">
                <span class="pb-field-lbl" style="margin-left:10px">Texto</span>
                <input type="color" class="pb-color-inp" value="${d.colorBotonTxt || '#1e293b'}" oninput="pbSetCmpField(${si},${ci},'colorBotonTxt',this.value); pbSchedulePreview();">
              </div>
            </div>
          ` : ''}
        </div>

        <details ${panelAbiertoAttr} style="cursor:pointer; font-size:12px; color:#555; border-top:1px solid #eee; padding-top:10px;" 
                 ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; margin-bottom:8px; user-select:none;">⚙️ Personalización Visual Avanzada</summary>
          <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; cursor:default;" onclick="event.stopPropagation()">
            
            <div class="pb-field-row">
              <span class="pb-field-lbl">Forma Ribbon</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'formaRibbon',this.value)">
                ${formas.map(([v,l]) => `<option value="${v}" ${d.formaRibbon===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Ancho</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'anchoTipo',this.value); _pbRefreshCmp(${si},${ci})">
                ${anchos.map(([v,l]) => `<option value="${v}" ${d.anchoTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
              ${d.anchoTipo !== 'completo' ? `<input class="sinp" style="width:70px" value="${d.anchoValor || '1000px'}" oninput="pbSetCmpField(${si},${ci},'anchoValor',this.value)">` : ''}
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Márgenes (V)</span>
              <input class="sinp" style="width:65px" value="${d.marginVertical || '15px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value)">
              <span class="pb-field-lbl" style="margin-left:5px">Pad (V)</span>
              <input class="sinp" style="width:50px" value="${d.paddingVertical || '12px'}" oninput="pbSetCmpField(${si},${ci},'paddingVertical',this.value)">
              <span class="pb-field-lbl" style="margin-left:5px">Pad (H)</span>
              <input class="sinp" style="width:50px" value="${d.paddingHorizontal || '20px'}" oninput="pbSetCmpField(${si},${ci},'paddingHorizontal',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Sombras</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'sombraTipo',this.value)">
                ${sombras.map(([v,l]) => `<option value="${v}" ${d.sombraTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Tipografía</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'fontFamily',this.value)">
                ${fuentes.map(([v,l]) => `<option value="${v}" ${d.fontFamily===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Estilo Fondo</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'tipoFondo',this.value); _pbRefreshCmp(${si},${ci})">
                ${fondos.map(([v,l]) => `<option value="${v}" ${d.tipoFondo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Color Texto</span>
              <input type="color" class="pb-color-inp" value="${d.colorTexto || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorTexto',this.value)">
              
              ${d.tipoFondo === 'solido' ? `
                <span class="pb-field-lbl" style="margin-left:10px">Fondo</span>
                <input type="color" class="pb-color-inp" value="${d.colorFondoSolido || '#ef4444'}" oninput="pbSetCmpField(${si},${ci},'colorFondoSolido',this.value)">
              ` : ''}

              ${d.tipoFondo === 'degradado' ? `
                <span class="pb-field-lbl" style="margin-left:5px">Col 1</span>
                <input type="color" class="pb-color-inp" value="${d.colorDegradado1 || '#f43f5e'}" oninput="pbSetCmpField(${si},${ci},'colorDegradado1',this.value)">
                <span class="pb-field-lbl" style="margin-left:5px">Col 2</span>
                <input type="color" class="pb-color-inp" value="${d.colorDegradado2 || '#e11d48'}" oninput="pbSetCmpField(${si},${ci},'colorDegradado2',this.value)">
              ` : ''}
            </div>

          </div>
        </details>`;
    },

    renderHTML(d) {
      let iconoHTML = '';
      if (d.urlIcono) {
        if (d.urlIcono.startsWith('http') || d.urlIcono.startsWith('/')) {
          iconoHTML = `<img src="${_ndEH(d.urlIcono)}" class="nd-ribbon-img" alt="icon"/>`;
        } else {
          iconoHTML = `<span class="nd-ribbon-emoji">${_ndEH(d.urlIcono)}</span>`;
        }
      }

      let botonHTML = '';
      if (d.llevaBoton === 'si' && d.textoBoton) {
        botonHTML = `
          <a href="${_ndEH(d.urlBoton || '#')}" class="nd-ribbon-btn" style="background:${d.colorBotonBg || '#fff'}; color:${d.colorBotonTxt || '#1e293b'}">
            ${_ndEH(d.textoBoton)}
          </a>`;
      }

      let estiloAncho = 'width: 100%;';
      if (d.anchoTipo === 'fijo') estiloAncho = `width: ${d.anchoValor || '1000px'}; max-width: 100%; margin-left: auto; margin-right: auto;`;
      if (d.anchoTipo === 'porcentaje') estiloAncho = `width: ${d.anchoValor || '90%'}; margin-left: auto; margin-right: auto;`;

      let estiloFondo = `background: ${d.colorFondoSolido || '#ef4444'};`;
      if (d.tipoFondo === 'degradado') {
        estiloFondo = `background: linear-gradient(135deg, ${d.colorDegradado1 || '#f43f5e'} 0%, ${d.colorDegradado2 || '#e11d48'} 100%);`;
      }

      const formaClase = `nd-ribbon-shape-${d.formaRibbon || 'rounded'}`;
      const sombraClase = `nd-ribbon-shd-${d.sombraTipo || 'suave'}`;
      const fontClase = `nd-ribbon-font-${d.fontFamily || 'inherit'}`;

      return `
        <div class="nd-ribbon-container ${formaClase} ${sombraClase} ${fontClase}" 
             style="${estiloAncho} ${estiloFondo}
                    --nd-ribbon-txt: ${d.colorTexto || '#ffffff'};
                    --nd-ribbon-mv: ${d.marginVertical || '15px'};
                    --nd-ribbon-pv: ${d.paddingVertical || '12px'};
                    --nd-ribbon-ph: ${d.paddingHorizontal || '20px'};
                    --nd-ribbon-glow: ${d.tipoFondo === 'degradado' ? d.colorDegradado1 : d.colorFondoSolido};">
          <div class="nd-ribbon-content">
            ${iconoHTML}
            <div class="nd-ribbon-text">${d.texto}</div>
          </div>
          ${botonHTML}
        </div>`;
    },

    css: `
.nd-ribbon-container {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: var(--nd-ribbon-pv) var(--nd-ribbon-ph);
  margin-top: var(--nd-ribbon-mv); margin-bottom: var(--nd-ribbon-mv);
  color: var(--nd-ribbon-txt); box-sizing: border-box;
}
.nd-ribbon-content { display: flex; align-items: center; gap: 12px; flex: 1; text-align: left; }
.nd-ribbon-text { font-size: 0.95rem; font-weight: 500; line-height: 1.4; }
.nd-ribbon-text strong { font-weight: 700; }
.nd-ribbon-img { max-width: 22px; max-height: 22px; object-fit: contain; }
.nd-ribbon-emoji { font-size: 1.25rem; line-height: 1; }

/* Botón Interno */
.nd-ribbon-btn {
  padding: 6px 14px; font-size: 0.85rem; font-weight: 600; text-decoration: none;
  border-radius: 4px; white-space: nowrap; transition: all 0.2s ease-in-out;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.nd-ribbon-btn:hover { filter: brightness(0.95); transform: scale(1.02); }

/* Fuentes */
.nd-ribbon-font-inherit { font-family: inherit; }
.nd-ribbon-font-sans-serif { font-family: system-ui, -apple-system, sans-serif; }
.nd-ribbon-font-serif { font-family: Georgia, serif; }
.nd-ribbon-font-monospace { font-family: monospace; }

/* Formas Geométricas Libres */
.nd-ribbon-shape-square { border-radius: 0; }
.nd-ribbon-shape-rounded { border-radius: 6px; }
.nd-ribbon-shape-pill { border-radius: 40px; }

/* Forma de indicador o flecha */
.nd-ribbon-shape-flecha-derecha {
  border-radius: 4px 0 0 4px;
  clip-path: polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%);
  padding-right: calc(var(--nd-ribbon-ph) + 10px);
}

/* Forma Rasgada estilo Ticket */
.nd-ribbon-shape-rasgado {
  border-radius: 0;
  clip-path: polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%,
    0% calc(100% - 6px), 4px calc(100% - 10px), 0% calc(100% - 14px),
    0% 50%, 4px 40%, 0% 30%
  );
}

/* Sombras y Brillo Neon */
.nd-ribbon-shd-ninguna { box-shadow: none; }
.nd-ribbon-shd-suave { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); }
.nd-ribbon-shd-intensa { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); }
.nd-ribbon-shd-neon { box-shadow: 0 0 15px var(--nd-ribbon-glow); }

@media (max-width: 640px) {
  .nd-ribbon-container { flex-direction: column; text-align: center; }
  .nd-ribbon-content { flex-direction: column; text-align: center; }
  .nd-ribbon-btn { width: 100%; text-align: center; }
}
`
  }]
});

function _ndEH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}