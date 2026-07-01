ND.registerPlugin({
  id: 'app_features_grid',
  name: 'Grid de Características App',
  version: '1.0.0',

  components: [{
    type: 'app_features_grid',
    ic: '⚡',
    lb: 'Características Grid',
    hint: 'Mosaico responsivo de funciones con iconos y efectos hover dinámicos',

    defaultData() {
      return {
        _panelAjustesAbierto: false,
        columnasDesktop: '3', // '2', '3', '4'
        gapGrid: '20px',
        marginVertical: '40px',
        paddingCard: '24px',
        bordeRadioCard: '12px',

        // Estilos de Tarjeta
        colorBgCard: '#ffffff',
        colorTexto: '#1e293b',
        colorBordeHover: '#3b82f6', // Neon blue por defecto

        listaFeatures: [
          { ic: '🔒', tit: 'Privacidad 100% Local', desc: 'Tus datos nunca salen de tu dispositivo. Sin servidores, sin cuentas, sin rastreos.' },
          { ic: '📷', tit: 'Escáner Inteligente', desc: 'Detecta y digitaliza tus códigos QR o de barras en décimas de segundo usando la cámara.' },
          { ic: '🎨', tit: 'Personalización', desc: 'Organiza tus tarjetas de fidelidad con categorías y una paleta de 16 colores vivos.' }
        ]
      };
    },

    renderFields(d, si, ci) {
      const cols = [['2', '2 Columnas'], ['3', '3 Columnas'], ['4', '4 Columnas']];
      const arrFeatures = d.listaFeatures || [];

      const featuresHTML = arrFeatures.map((f, ki) => `
        <div class="pb-card-item" style="padding:10px; border:1px solid #ccd4ff; margin-bottom:10px; border-radius:6px; background:#f9faff;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="font-size:11px; color:#3b82f6;">⚡ Característica #${ki+1}</strong>
            <button class="btn btn-red btn-sm" onclick="_ndFeatRemove(${si},${ci},${ki})">✕</button>
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl" style="width:50px">Icono</span>
            <input class="sinp" style="width:50px" value="${_ndEH(f.ic)}" placeholder="ej: 🔒" oninput="_ndFeatSet(${si},${ci},${ki},'ic',this.value)">
            <span class="pb-field-lbl" style="margin-left:10px; width:50px">Título</span>
            <input class="sinp" style="flex:1" value="${_ndEH(f.tit)}" oninput="_ndFeatSet(${si},${ci},${ki},'tit',this.value)">
          </div>
          <div class="pb-field-row" style="align-items:flex-start">
            <span class="pb-field-lbl" style="width:50px; padding-top:4px;">Desc.</span>
            <textarea class="pb-textarea" style="flex:1" rows="2" oninput="_ndFeatSet(${si},${ci},${ki},'desc',this.value)">${_ndEH(f.desc)}</textarea>
          </div>
        </div>
      `).join('');

      return `
        <div style="font-weight:bold; font-size:13px; margin-bottom:6px;">Listado de Funcionalidades:</div>
        <div>${featuresHTML}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%; border:1px solid #3b82f6; color:#3b82f6; margin-bottom:12px;" onclick="_ndFeatAdd(${si},${ci})">＋ Añadir Función</button>

        <details ${d._panelAjustesAbierto?'open':''} style="cursor:pointer; font-size:12px; border-top:1px solid #eee; padding-top:8px;" ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; user-select:none;">⚙️ Arquitectura de Retícula y Estilos</summary>
          <div style="padding-top:8px; display:flex; flex-direction:column; gap:8px;" onclick="event.stopPropagation()">
            <div class="pb-field-row">
              <span class="pb-field-lbl">Columnas (PC)</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'columnasDesktop',this.value); pbSchedulePreview();">
                ${cols.map(([v,l]) => `<option value="${v}" ${d.columnasDesktop===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Separación</span>
              <input class="sinp" style="width:70px" value="${d.gapGrid || '20px'}" oninput="pbSetCmpField(${si},${ci},'gapGrid',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:10px">Margen (V)</span>
              <input class="sinp" style="width:70px" value="${d.marginVertical || '40px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value); pbSchedulePreview();">
            </div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Fondo Card</span>
              <input type="color" class="pb-color-inp" value="${d.colorBgCard || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorBgCard',this.value); pbSchedulePreview();">
              <span class="pb-field-lbl" style="margin-left:10px">Borde Hover</span>
              <input type="color" class="pb-color-inp" value="${d.colorBordeHover || '#3b82f6'}" oninput="pbSetCmpField(${si},${ci},'colorBordeHover',this.value); pbSchedulePreview();">
            </div>
          </div>
        </details>`;
    },

    renderHTML(d) {
      const arrFeatures = d.listaFeatures || [];
      if(arrFeatures.length === 0) return `<div style="padding:20px; text-align:center; opacity:0.5;">(Añade características en el panel)</div>`;

      const cardsHTML = arrFeatures.map(f => `
        <div class="nd-features-card" style="background:${d.colorBgCard || '#ffffff'}; color:${d.colorTexto || '#1e293b'}; padding:${d.paddingCard || '24px'}; border-radius:${d.bordeRadioCard || '12px'};">
          <div class="nd-features-icon">${_ndEH(f.ic)}</div>
          <h5 class="nd-features-title">${_ndEH(f.tit)}</h5>
          <p class="nd-features-desc">${_ndEH(f.desc)}</p>
        </div>
      `).join('');

      return `
        <div class="nd-features-outer" style="margin-top:${d.marginVertical || '40px'}; margin-bottom:${d.marginVertical || '40px'};">
          <div class="nd-features-grid cols-${d.columnasDesktop || '3'}" style="--nd-feat-gap:${d.gapGrid || '20px'}; --nd-feat-hover:${d.colorBordeHover || '#3b82f6'};">
            ${cardsHTML}
          </div>
        </div>`;
    },

    css: `
.nd-features-outer { width: 100%; box-sizing: border-box; }
.nd-features-grid { display: grid; gap: var(--nd-feat-gap); width: 100%; }
.nd-features-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.nd-features-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.nd-features-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }

.nd-features-card {
  border: 1px solid #e2e8f0; box-sizing: border-box; display: flex; flex-direction: column;
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}
.nd-features-card:hover {
  transform: translateY(-4px); border-color: var(--nd-feat-hover);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.05);
}

.nd-features-icon { font-size: 1.75rem; margin-bottom: 12px; }
.nd-features-title { font-size: 1.15rem; font-weight: 700; margin: 0 0 8px 0; line-height: 1.3; }
.nd-features-desc { font-size: 0.92rem; line-height: 1.5; opacity: 0.85; margin: 0; }

@media (max-width: 768px) {
  .nd-features-grid.cols-2, .nd-features-grid.cols-3, .nd-features-grid.cols-4 { grid-template-columns: 1fr; }
}
`
  }]
});

function _ndFeatSet(si,ci,ki,f,v) {
  const c = PB.sections[si]?.components?.[ci]; if(!c) return;
  if(!c.data.listaFeatures) c.data.listaFeatures = [];
  if(c.data.listaFeatures[ki]) { c.data.listaFeatures[ki][f] = v; PB.dirty = true; pbSchedulePreview(); }
}
function _ndFeatAdd(si,ci) {
  const c = PB.sections[si]?.components?.[ci]; if(!c) return;
  if(!c.data.listaFeatures) c.data.listaFeatures = [];
  c.data.listaFeatures.push({ ic: '✨', tit: 'Nueva Función', desc: 'Descripción corta de la ventaja.' });
  PB.dirty = true; _pbRefreshCmp(si,ci);
}
function _ndFeatRemove(si,ci,ki) {
  const c = PB.sections[si]?.components?.[ci]; if(!c) return;
  if(!c.data.listaFeatures) c.data.listaFeatures = [];
  c.data.listaFeatures.splice(ki,1); PB.dirty = true; _pbRefreshCmp(si,ci);
}
function _ndEH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
