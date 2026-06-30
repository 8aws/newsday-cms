ND.registerPlugin({
  id: 'timeline',
  name: 'Roadmap / Línea de Tiempo Pro',
  version: '1.1.1',

  components: [{
    type: 'timeline',
    ic: '⏱️',
    lb: 'Línea de Tiempo',
    hint: 'Crea una secuencia de hitos con encabezado de sección personalizable y estados dinámicos',

    defaultData() {
      return {
        _panelAjustesAbierto: false,
        tituloSeccion: 'Roadmap de Producto',
        descSeccion: 'Descubre las fases clave de nuestro desarrollo y los próximos lanzamientos.',
        alignCabecera: 'center',
        fontCabecera: 'sans-serif',
        colorTxtCabecera: '#1e293b',
        marginVertical: '40px',
        colorEje: '#e2e8f0',
        tipoFondoBloque: 'heredar',
        colorBgSolido: '#ffffff',
        colorBgGrad1: '#ffffff',
        colorBgGrad2: '#f8fafc',
        paddingBloque: '24px',
        bordeRadioBloque: '0px',
        hitos: [
          { fecha: 'Q1 2026', titulo: 'Diseño Base', desc: 'Lanzamiento conceptual de la arquitectura core.', estado: 'done', colorNodo: '#10b981' },
          { fecha: 'Q2 2026', titulo: 'Beta Pública', desc: 'Despliegue controlado para integradores.', estado: 'active', colorNodo: '#3b82f6' },
          { fecha: 'Q3 2026', titulo: 'Versión Final', desc: 'Lanzamiento oficial en producción de la plataforma.', estado: 'pending', colorNodo: '#94a3b8' }
        ]
      };
    },

    renderFields(d, si, ci) {
      const estados = [['done','Completado (Verde)'],['active','En desarrollo (Azul)'],['pending','Pendiente (Gris)']];
      const fuentes = [['inherit', 'Heredar tema'], ['sans-serif', 'Sans-Serif'], ['serif', 'Serif'], ['monospace', 'Monospace']];
      const align = [['left', 'Izquierda'], ['center', 'Centrado'], ['right', 'Derecha']];
      const fondos = [['heredar', 'Heredar fondo (Transparente)'], ['solido', 'Color Sólido'], ['degradado', 'Degradado Suave']];

      const hitosHTML = (d.hitos || []).map((h, ki) => `
        <div class="pb-card-item" style="padding:10px; border:1px solid #ccd4ff; margin-bottom:10px; border-radius:6px; background:#f9faff;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="font-size:11px; color:#3b82f6;">📍 Hito #${ki+1}</strong>
            <button class="btn btn-red btn-sm" onclick="PB.sections[${si}].components[${ci}].data.hitos.splice(${ki},1); pbRefreshCmp(${si},${ci});">✕ Eliminar</button>
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Fecha/Fase</span>
            <input class="sinp" style="width:90px" value="${_ndEH(h.fecha)}" oninput="PB.sections[${si}].components[${ci}].data.hitos[${ki}].fecha=this.value; pbSchedulePreview();">
            <span class="pb-field-lbl" style="margin-left:5px">Título</span>
            <input class="sinp" style="flex:1" value="${_ndEH(h.titulo)}" oninput="PB.sections[${si}].components[${ci}].data.hitos[${ki}].titulo=this.value; pbSchedulePreview();">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Descripción</span>
            <input class="sinp" style="flex:1" value="${_ndEH(h.desc)}" oninput="PB.sections[${si}].components[${ci}].data.hitos[${ki}].desc=this.value; pbSchedulePreview();">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Estado</span>
            <select class="pb-mini-sel" style="flex:1" onchange="_ndTimelineUpdateEstado(${si},${ci},${ki},this.value)">
              ${estados.map(([v,l]) => `<option value="${v}" ${h.estado===v?'selected':''}>${l}</option>`).join('')}
            </select>
            <span class="pb-field-lbl" style="margin-left:5px">Glow Manual</span>
            <input type="color" id="nd_tl_cp_${si}_${ci}_${ki}" class="pb-color-inp" value="${h.colorNodo || '#3b82f6'}" oninput="PB.sections[${si}].components[${ci}].data.hitos[${ki}].colorNodo=this.value; pbSchedulePreview();">
          </div>
        </div>
      `).join('');

      return `
        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:12px; border-bottom:1px dashed #e2e8f0; padding-bottom:12px;">
          <div class="pb-field-row">
            <span class="pb-field-lbl">Título Sección</span>
            <input class="sinp" style="flex:1" value="${_ndEH(d.tituloSeccion || '')}" placeholder="ej: Roadmap" oninput="pbSetCmpField(${si},${ci},'tituloSeccion',this.value); pbSchedulePreview();">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Descripción</span>
            <input class="sinp" style="flex:1" value="${_ndEH(d.descSeccion || '')}" placeholder="Texto explicativo corto..." oninput="pbSetCmpField(${si},${ci},'descSeccion',this.value); pbSchedulePreview();">
          </div>
        </div>

        <div style="font-weight:bold; font-size:13px; margin-bottom:6px;">Eje de Hitos / Secuencia:</div>
        <div>${hitosHTML}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%; border:1px solid #3b82f6; color:#3b82f6; margin-bottom:12px;" onclick="PB.sections[${si}].components[${ci}].data.hitos.push({fecha:'Fase',titulo:'Nuevo Hito',desc:'',estado:'pending',colorNodo:'#94a3b8'}); pbRefreshCmp(${si},${ci});">＋ Añadir Hito</button>
        
        <details ${d._panelAjustesAbierto?'open':''} style="cursor:pointer; font-size:12px; border-top:1px solid #eee; padding-top:8px;" ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; user-select:none;">⚙️ Personalización del Bloque y Fuentes</summary>
          <div style="padding-top:8px; display:flex; flex-direction:column; gap:8px;" onclick="event.stopPropagation()">
            <div style="font-weight:bold; color:#333; font-size:11px;">Estilos de Cabecera:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Alineación</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'alignCabecera',this.value)">
                ${align.map(([v,l]) => `<option value="${v}" ${d.alignCabecera===v?'selected':''}>${l}</option>`).join('')}
              </select>
              <span class="pb-field-lbl" style="margin-left:5px">Tipografía</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'fontCabecera',this.value)">
                ${fuentes.map(([v,l]) => `<option value="${v}" ${d.fontCabecera===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Color Texto Cabecera</span>
              <input type="color" class="pb-color-inp" value="${d.colorTxtCabecera || '#1e293b'}" oninput="pbSetCmpField(${si},${ci},'colorTxtCabecera',this.value)">
            </div>

            <div style="font-weight:bold; color:#333; font-size:11px; margin-top:4px;">Contenedor Global:</div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Fondo Bloque</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'tipoFondoBloque',this.value); pbRefreshCmp(${si},${ci})">
                ${fondos.map(([v,l]) => `<option value="${v}" ${d.tipoFondoBloque===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Color Línea Base</span>
              <input type="color" class="pb-color-inp" value="${d.colorEje || '#e2e8f0'}" oninput="pbSetCmpField(${si},${ci},'colorEje',this.value)">
              
              ${d.tipoFondoBloque === 'solido' ? `
                <span class="pb-field-lbl" style="margin-left:5px">Color Fondo</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgSolido || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBgSolido',this.value)">
              ` : ''}
              
              ${d.tipoFondoBloque === 'degradado' ? `
                <span class="pb-field-lbl" style="margin-left:5px">Col 1</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgGrad1 || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBgGrad1',this.value)">
                <span class="pb-field-lbl" style="margin-left:5px">Col 2</span>
                <input type="color" class="pb-color-inp" value="${d.colorBgGrad2 || '#f8fafc'}" oninput="pbSetCmpField(${si},${ci},'colorBgGrad2',this.value)">
              ` : ''}
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Margen (V)</span>
              <input class="sinp" style="width:65px" value="${d.marginVertical || '40px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value)">
              <span class="pb-field-lbl" style="margin-left:5px">Padding</span>
              <input class="sinp" style="width:65px" value="${d.paddingBloque || '24px'}" oninput="pbSetCmpField(${si},${ci},'paddingBloque',this.value)">
              <span class="pb-field-lbl" style="margin-left:5px">Radio</span>
              <input class="sinp" style="width:50px" value="${d.bordeRadioBloque || '0px'}" oninput="pbSetCmpField(${si},${ci},'bordeRadioBloque',this.value)">
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

      let cabeceraHTML = '';
      if (d.tituloSeccion || d.descSeccion) {
        cabeceraHTML = `
          <div class="nd-tl-header text-align-${d.alignCabecera || 'center'} font-tl-${d.fontCabecera || 'sans-serif'}" style="--nd-tl-header-txt: ${d.colorTxtCabecera || '#1e293b'};">
            ${d.tituloSeccion ? `<h3 class="nd-tl-main-title">${_ndEH(d.tituloSeccion)}</h3>` : ''}
            ${d.descSeccion ? `<p class="nd-tl-main-desc">${_ndEH(d.descSeccion)}</p>` : ''}
          </div>`;
      }

      const hitosHTML = (d.hitos || []).map(h => {
        return `
          <div class="nd-tl-item status-${h.estado}" style="--nd-tl-glow: ${h.colorNodo || '#3b82f6'}">
            <div class="nd-tl-badge">${_ndEH(h.fecha)}</div>
            <div class="nd-tl-panel">
              <h6 class="nd-tl-title">${_ndEH(h.titulo)}</h6>
              <p class="nd-tl-desc">${_ndEH(h.desc)}</p>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="nd-tl-block-container" 
             style="${estiloFondoBloque}
                    margin-top: ${d.marginVertical || '40px'}; margin-bottom: ${d.marginVertical || '40px'};
                    padding: ${d.paddingBloque || '24px'}; border-radius: ${d.bordeRadioBloque || '0px'};
                    --nd-tl-line: ${d.colorEje || '#e2e8f0'};">
          ${cabeceraHTML}
          <div class="nd-tl-wrapper">
            ${hitosHTML}
          </div>
        </div>`;
    },

    css: `
.nd-tl-block-container { box-sizing: border-box; width: 100%; }
.nd-tl-header { margin-bottom: 35px; color: var(--nd-tl-header-txt); }
.nd-tl-header.text-align-left { text-align: left; }
.nd-tl-header.text-align-center { text-align: center; }
.nd-tl-header.text-align-right { text-align: right; }
.nd-tl-main-title { font-size: 1.75rem; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.02em; }
.nd-tl-main-desc { font-size: 1rem; opacity: 0.7; margin: 0; line-height: 1.5; }
.font-tl-inherit { font-family: inherit; }
.font-tl-sans-serif { font-family: system-ui, -apple-system, sans-serif; }
.font-tl-serif { font-family: Georgia, serif; }
.font-tl-monospace { font-family: monospace; }
.nd-tl-wrapper { position: relative; max-width: 800px; margin: 0 auto; padding: 10px 0; box-sizing: border-box; }
.nd-tl-wrapper::before { content: ''; position: absolute; left: 31px; top: 0; height: 100%; width: 4px; background: var(--nd-tl-line); border-radius: 2px; }
.nd-tl-item { position: relative; margin-bottom: 30px; display: flex; align-items: flex-start; gap: 24px; padding-left: 16px; box-sizing: border-box; }
.nd-tl-item:last-child { margin-bottom: 0; }
.nd-tl-item::before { content: ''; position: absolute; left: 23px; top: 6px; width: 20px; height: 20px; border-radius: 50%; background: var(--nd-tl-glow); z-index: 2; box-shadow: 0 0 12px var(--nd-tl-glow); transition: all 0.3s ease; }
.nd-tl-badge { min-width: 90px; text-align: right; font-size: 0.82rem; font-weight: 700; color: var(--nd-tl-glow); padding-top: 7px; text-transform: uppercase; letter-spacing: 0.05em; transition: color 0.3s ease; }
.nd-tl-panel { flex: 1; background: var(--nd-box-bg, rgba(128,128,128,0.03)); border: 1px solid rgba(128,128,128,0.08); padding: 16px 20px; border-radius: 8px; text-align: left; }
.nd-tl-title { margin: 0 0 6px 0; font-size: 1.05rem; font-weight: 700; }
.nd-tl-desc { margin: 0; font-size: 0.9rem; opacity: 0.75; line-height: 1.5; }
@media(max-width: 640px) {
  .nd-tl-wrapper::before { left: 15px; }
  .nd-tl-item { flex-direction: column; gap: 6px; padding-left: 35px; }
  .nd-tl-item::before { left: 7px; }
  .nd-tl-badge { text-align: left; min-width: auto; padding-top: 0; }
}
`
  }]
});

function _ndTimelineUpdateEstado(si, ci, ki, nuevoEstado) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.hitos[ki].estado = nuevoEstado;
  let colorSugerido = '#94a3b8';
  if (nuevoEstado === 'done') colorSugerido = '#10b981';
  if (nuevoEstado === 'active') colorSugerido = '#3b82f6';
  c.data.hitos[ki].colorNodo = colorSugerido;
  PB.dirty = true;
  const inputColor = document.getElementById(`nd_tl_cp_${si}_${ci}_${ki}`);
  if (inputColor) {
    inputColor.value = colorSugerido;
  }
  pbSchedulePreview();
}

function _ndEH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }