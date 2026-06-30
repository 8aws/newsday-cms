ND.registerPlugin({
  id: 'box',
  name: 'Box Contenedor Premium',
  version: '2.0.0',

  components: [{
    type: 'box',
    ic: '📦',
    lb: 'Caja / Box Multi',
    hint: 'Contenedores estilizados con soporte para múltiples cajas organizadas en horizontal o vertical',

    defaultData() {
      return {
        _panelAjustesAbierto: false,

        // Disposición del Grid/Flex de cajas
        layoutDistribucion: 'horizontal', // 'horizontal', 'vertical'
        gapBoxes: '20px',
        marginVertical: '20px',

        // Diseño Común y Estructura física aplicable a los boxes
        anchoTipo: 'fijo', // 'completo', 'fijo', 'porcentaje'
        anchoValor: '350px',
        alineacionBox: 'center', // 'left', 'center', 'right' (Alineación del bloque contenedor)
        alineacionTexto: 'left', // 'left', 'center', 'right'
        bordeRadio: '12px',
        sombraTipo: 'intensa', // 'ninguna', 'suave', 'intensa', 'neon'
        fontFamily: 'sans-serif',
        paddingInterno: '24px',

        // Bordes Avanzados
        estiloBorde: 'solido', // 'ninguno', 'solido', 'dashed', 'double'
        colorBorde: '#e2e8f0',
        grosorBorde: '1px',

        // Fondos Dinámicos
        tipoFondo: 'solido', // 'heredar', 'solido', 'degradado'
        colorFondoSolido: '#ffffff',
        colorDegradado1: '#ffffff',
        colorDegradado2: '#f8fafc',
        colorTextoPrincipal: '#1e293b',

        // Colección de Boxes reactiva
        listaBoxes: [
          {
            titulo: 'Caja Principal A',
            subtitulo: 'Categoría superior',
            cuerpoHTML: '<p>Este es el cuerpo interno de la primera caja. Úsala para destacar servicios o características importantes.</p>',
            pieTexto: 'Actualizado hace 2 días'
          },
          {
            titulo: 'Caja Destacada B',
            subtitulo: 'Novedad',
            cuerpoHTML: '<p>Cuerpo de la segunda caja. Al añadir más elementos se distribuirán según el flujo configurado abajo.</p>',
            pieTexto: 'Disponible ya'
          }
        ]
      };
    },

    renderFields(d, si, ci) {
      const flujos = [['horizontal', 'Fila Horizontal (Flex-Row)'], ['vertical', 'Columna Vertical (Stack)']];
      const anchos = [['completo', 'Ancho Completo (100%)'], ['fijo', 'Ancho Fijo (px)'], ['porcentaje', 'Porcentaje (%)']];
      const alBox = [['left', 'Izquierda'], ['center', 'Centrado'], ['right', 'Derecha']];
      const alTxt = [['left', 'Texto Izquierda'], ['center', 'Texto Centrado'], ['right', 'Texto Derecha']];
      const bordes = [['ninguno', 'Sin Borde'], ['solido', 'Línea Sólida'], ['dashed', 'Línea de Puntos'], ['double', 'Línea Doble']];
      const sombras = [['ninguna', 'Sin Sombra'], ['suave', 'Sombra sutil'], ['intensa', 'Sombra marcada'], ['neon', 'Brillo Neón']];
      const fondos = [['heredar', 'Heredar fondo'], ['solido', 'Color Sólido'], ['degradado', 'Degradado Suave']];
      const fuentes = [['inherit', 'Heredar tema web'], ['sans-serif', 'Sans-Serif'], ['serif', 'Serif'], ['monospace', 'Monospace']];

      // Inicialización segura del array
      const arrBoxes = d.listaBoxes || [];

      const boxesHTML = arrBoxes.map((b, ki) => `
        <div class="pb-card-item" style="padding:12px; border:1px solid #ccd4ff; margin-bottom:12px; border-radius:6px; background:#f9faff;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
            <strong style="font-size:12px; color:#3b82f6;">📦 Box #${ki + 1}: ${b.titulo || 'Sin título'}</strong>
            <button class="btn btn-red btn-sm" onclick="_ndBoxRemove(${si},${ci},${ki})">✕ Eliminar</button>
          </div>
          
          <div class="pb-field-row">
            <span class="pb-field-lbl">Subtítulo</span>
            <input class="sinp" style="flex:1" value="${_ndEH(b.subtitulo)}" oninput="_ndBoxSet(${si},${ci},${ki},'subtitulo',this.value)">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Título</span>
            <input class="sinp" style="flex:1" value="${_ndEH(b.titulo)}" oninput="_ndBoxSet(${si},${ci},${ki},'titulo',this.value)">
          </div>
          <div class="pb-field-row" style="align-items:flex-start">
            <span class="pb-field-lbl" style="padding-top:6px">Cuerpo (HTML)</span>
            <textarea class="pb-textarea" style="flex:1" rows="3" oninput="_ndBoxSet(${si},${ci},${ki},'cuerpoHTML',this.value)">${_ndEH(b.cuerpoHTML)}</textarea>
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Texto Pie</span>
            <input class="sinp" style="flex:1" value="${_ndEH(b.pieTexto)}" oninput="_ndBoxSet(${si},${ci},${ki},'pieTexto',this.value)">
          </div>
        </div>
      `).join('');

      return `
        <div style="font-weight:bold; font-size:13px; margin-bottom:8px;">Contenido de las Cajas (Boxes):</div>
        <div>${boxesHTML}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%; border:1px solid #3b82f6; color:#3b82f6; margin-bottom:15px;" onclick="_ndBoxAdd(${si},${ci})">＋ Añadir Nueva Caja</button>
        
        <details ${d._panelAjustesAbierto ? 'open' : ''} style="cursor:pointer; font-size:12px; color:#555; border-top:1px solid #eee; padding-top:10px;" 
                 ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; margin-bottom:8px; user-select:none;">⚙️ Configuración del Grupo y Estilos Comunes</summary>
          <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; cursor:default;" onclick="event.stopPropagation()">
            
            <div style="font-weight:bold; color:#333; font-size:11px;">Distribución Estructural:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Orientación</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'layoutDistribucion',this.value); pbSchedulePreview();">
                ${flujos.map(([v,l]) => `<option value="${v}" ${d.layoutDistribucion===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Separación</span>
              <input class="sinp" style="width:70px" value="${d.gapBoxes || '20px'}" oninput="pbSetCmpField(${si},${ci},'gapBoxes',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:10px">Márgenes (V)</span>
              <input class="sinp" style="width:70px" value="${d.marginVertical || '20px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value); pbSchedulePreview();">
            </div>

            <div style="font-weight:bold; color:#333; font-size:11px; margin-top:4px;">Dimensiones y Texto:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Ancho Cajas</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'anchoTipo',this.value); _pbRefreshCmp(${si},${ci})">
                ${anchos.map(([v,l]) => `<option value="${v}" ${d.anchoTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
              ${d.anchoTipo !== 'completo' ? `<input class="sinp" style="width:70px" value="${d.anchoValor || '350px'}" oninput="pbSetCmpField(${si},${ci},'anchoValor',this.value); pbSchedulePreview();">` : ''}
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Ubicación Grupo</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'alineacionBox',this.value); pbSchedulePreview();">
                ${alBox.map(([v,l]) => `<option value="${v}" ${d.alineacionBox===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Alineación Texto</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'alineacionTexto',this.value); pbSchedulePreview();">
                ${alTxt.map(([v,l]) => `<option value="${v}" ${d.alineacionTexto===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div style="font-weight:bold; color:#333; font-size:11px; margin-top:4px;">Bordes y Sombreado:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Padding Int.</span>
              <input class="sinp" style="width:70px" value="${d.paddingInterno || '24px'}" oninput="pbSetCmpField(${si},${ci},'paddingInterno',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:10px">Redondeado</span>
              <input class="sinp" style="width:70px" value="${d.bordeRadio || '12px'}" oninput="pbSetCmpField(${si},${ci},'bordeRadio',this.value); pbSchedulePreview();">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Sombra Box</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'sombraTipo',this.value); pbSchedulePreview();">
                ${sombras.map(([v,l]) => `<option value="${v}" ${d.sombraTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Estilo Marco</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'estiloBorde',this.value); _pbRefreshCmp(${si},${ci})">
                ${bordes.map(([v,l]) => `<option value="${v}" ${d.estiloBorde===v?'selected':''}>${l}</option>`).join('')}
              </select>
              ${d.estiloBorde !== 'ninguno' ? `
                <input class="sinp" style="width:40px" value="${d.grosorBorde || '1px'}" oninput="pbSetCmpField(${si},${ci},'grosorBorde',this.value); pbSchedulePreview();">
                <input type="color" class="pb-color-inp" style="margin-left:5px" value="${d.colorBorde || '#e2e8f0'}" oninput="pbSetCmpField(${si},${ci},'colorBorde',this.value); pbSchedulePreview();">
              ` : ''}
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Tipografía</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'fontFamily',this.value); pbSchedulePreview();">
                ${fuentes.map(([v,l]) => `<option value="${v}" ${d.fontFamily===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Fondo Box</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'tipoFondo',this.value); _pbRefreshCmp(${si},${ci})">
                ${fondos.map(([v,l]) => `<option value="${v}" ${d.tipoFondo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Color Texto</span>
              <input type="color" class="pb-color-inp" value="${d.colorTextoPrincipal || '#1e293b'}" oninput="pbSetCmpField(${si},${ci},'colorTextoPrincipal',this.value); pbSchedulePreview();">
              
              ${d.tipoFondo === 'solido' ? `
                <span class="pb-field-lbl" style="margin-left:10px">Color Fondo</span>
                <input type="color" class="pb-color-inp" value="${d.colorFondoSolido || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorFondoSolido',this.value); pbSchedulePreview();">
              ` : ''}

              ${d.tipoFondo === 'degradado' ? `
                <span class="pb-field-lbl" style="margin-left:5px">Col 1</span>
                <input type="color" class="pb-color-inp" value="${d.colorDegradado1 || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorDegradado1',this.value); pbSchedulePreview();">
                <span class="pb-field-lbl" style="margin-left:5px">Col 2</span>
                <input type="color" class="pb-color-inp" value="${d.colorDegradado2 || '#f8fafc'}" oninput="pbSetCmpField(${si},${ci},'colorDegradado2',this.value); pbSchedulePreview();">
              ` : ''}
            </div>

          </div>
        </details>`;
    },

    renderHTML(d) {
      // 1. Configuración de dimensiones
      let estiloAncho = 'width: 100%;';
      if (d.anchoTipo === 'fijo') estiloAncho = `width: ${d.anchoValor || '350px'}; max-width: 100%;`;
      if (d.anchoTipo === 'porcentaje') estiloAncho = `width: ${d.anchoValor || '30%'};`;

      // 2. Estilo del Marco y Bordes
      let estiloBordeCSS = 'border: none;';
      if (d.estiloBorde !== 'ninguno') {
        estiloBordeCSS = `border: ${d.grosorBorde || '1px'} ${d.estiloBorde || 'solido'} ${d.colorBorde || '#e2e8f0'};`;
      }

      // 3. Resguardo de fondos
      let estiloFondo = 'background: transparent;';
      if (d.tipoFondo === 'solido') estiloFondo = `background: ${d.colorFondoSolido || '#ffffff'};`;
      if (d.tipoFondo === 'degradado') estiloFondo = `background: linear-gradient(135deg, ${d.colorDegradado1 || '#ffffff'} 0%, ${d.colorDegradado2 || '#f8fafc'} 100%);`;

      const sombraClase = `nd-box-shd-${d.sombraTipo || 'intensa'}`;
      const fontClase = `nd-box-font-${d.fontFamily || 'sans-serif'}`;
      const claseDistribucion = `nd-box-flow-${d.layoutDistribucion || 'horizontal'}`;

      const arrBoxes = d.listaBoxes || [];
      if (arrBoxes.length === 0) {
        return `<div style="padding:30px; text-align:center; opacity:0.5; font-size:13px;">(Pulsa 'Añadir Nueva Caja' en el menú lateral para pintar contenido)</div>`;
      }

      // Construcción iterativa del listado de tarjetas internas
      const boxesHTML = arrBoxes.map(b => `
        <div class="nd-box-card ${sombraClase} ${fontClase}" 
             style="${estiloAncho} ${estiloFondo} ${estiloBordeCSS}
                    --nd-box-txt: ${d.colorTextoPrincipal || '#1e293b'};
                    --nd-box-pad: ${d.paddingInterno || '24px'};
                    --nd-box-radius: ${d.bordeRadio || '12px'};
                    --nd-box-glow: ${d.colorBorde || '#3b82f6'};
                    text-align: ${d.alineacionTexto || 'left'};">
          
          ${b.subtitulo ? `<span class="nd-box-subtitle">${_ndEH(b.subtitulo)}</span>` : ''}
          ${b.titulo ? `<h4 class="nd-box-title">${_ndEH(b.titulo)}</h4>` : ''}
          
          <div class="nd-box-body">
            ${b.cuerpoHTML || ''}
          </div>
          
          ${b.pieTexto ? `<div class="nd-box-footer">${_ndEH(b.pieTexto)}</div>` : ''}
        </div>
      `).join('');

      return `
        <div class="nd-box-outer align-box-${d.alineacionBox || 'center'}" 
             style="margin-top: ${d.marginVertical || '20px'}; margin-bottom: ${d.marginVertical || '20px'};">
          <div class="nd-box-container-inner ${claseDistribucion}" style="--nd-box-gap: ${d.gapBoxes || '20px'};">
            ${boxesHTML}
          </div>
        </div>`;
    },

    css: `
.nd-box-outer { display: flex; width: 100%; box-sizing: border-box; }
.nd-box-outer.align-box-left { justify-content: flex-start; }
.nd-box-outer.align-box-center { justify-content: center; }
.nd-box-outer.align-box-right { justify-content: flex-end; }

/* Contenedor flexible del multi-box */
.nd-box-container-inner { display: flex; gap: var(--nd-box-gap); width: 100%; box-sizing: border-box; }
.nd-box-container-inner.nd-box-flow-horizontal { flex-direction: row; flex-wrap: wrap; justify-content: inherit; align-items: stretch; }
.nd-box-container-inner.nd-box-flow-vertical { flex-direction: column; align-items: inherit; }

.nd-box-card {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: var(--nd-box-pad);
  border-radius: var(--nd-box-radius);
  color: var(--nd-box-txt);
  box-sizing: border-box;
}
.nd-box-flow-horizontal .nd-box-card { min-width: 260px; }
.nd-box-flow-vertical .nd-box-card { width: 100% !important; }

.nd-box-subtitle { display: block; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; margin-bottom: 6px; }
.nd-box-title { font-size: 1.3rem; font-weight: 700; margin-top: 0; margin-bottom: 12px; line-height: 1.2; }
.nd-box-body { font-size: 0.94rem; line-height: 1.6; opacity: 0.9; flex: 1; }
.nd-box-body p { margin-top: 0; margin-bottom: 10px; }
.nd-box-body p:last-child { margin-bottom: 0; }
.nd-box-footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid rgba(0, 0, 0, 0.06); font-size: 0.8rem; opacity: 0.5; }

/* Tipografías */
.nd-box-font-inherit { font-family: inherit; }
.nd-box-font-sans-serif { font-family: system-ui, -apple-system, sans-serif; }
.nd-box-font-serif { font-family: Georgia, serif; }
.nd-box-font-monospace { font-family: monospace; }

/* Sombras */
.nd-box-shd-ninguna { box-shadow: none; }
.nd-box-shd-suave { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02); }
.nd-box-shd-intensa { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.06), 0 10px 10px -5px rgba(0,0,0,0.03); }
.nd-box-shd-neon { box-shadow: 0 0 15px var(--nd-box-glow); }
`
  }]
});

// Controladores globales de estado blindados (Previene TypeErrors)
function _ndBoxSet(si, ci, ki, f, v) {
  const c = PB.sections[si]?.components?.[ci]; if (!c) return;
  if (!c.data.listaBoxes) c.data.listaBoxes = [];
  if (c.data.listaBoxes[ki]) {
    c.data.listaBoxes[ki][f] = v; PB.dirty = true; pbSchedulePreview();
  }
}

function _ndBoxAdd(si, ci) {
  const c = PB.sections[si]?.components?.[ci]; if (!c) return;
  if (!c.data.listaBoxes || !Array.isArray(c.data.listaBoxes)) {
    c.data.listaBoxes = [];
  }
  c.data.listaBoxes.push({
    titulo: 'Nueva Caja',
    subtitulo: 'Subtítulo',
    cuerpoHTML: '<p>Cuerpo interno editable.</p>',
    pieTexto: ''
  });
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function _ndBoxRemove(si, ci, ki) {
  const c = PB.sections[si]?.components?.[ci]; if (!c) return;
  if (!c.data.listaBoxes) c.data.listaBoxes = [];
  c.data.listaBoxes.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function _ndEH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}