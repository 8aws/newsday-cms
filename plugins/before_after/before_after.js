ND.registerPlugin({
  id: 'before_after',
  name: 'Comparador Antes / Después',
  version: '1.0.0',

  components: [{
    type: 'before_after',
    ic: '🎚️',
    lb: 'Antes / Después',
    hint: 'Deslizador interactivo para comparar dos imágenes superpuestas',

    defaultData() {
      return {
        imgAntes: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800',
        imgDespues: 'https://images.unsplash.com/photo-1541462608141-ad4979e408c9?w=800',
        posicionInicial: '50', // Porcentaje de corte de inicio
        colorManejador: '#00dcff',
        maxAncho: '700px',
        marginVertical: '20px'
      };
    },

    renderFields(d, si, ci) {
      return `
        <div style="display:flex; flex-direction:column; gap:6px;">
          <div class="pb-field-row">
            <span class="pb-field-lbl">Imagen ANTES</span>
            <input class="sinp" style="flex:1" value="${_ndEH(d.imgAntes)}" oninput="pbSetCmpField(${si},${ci},'imgAntes',this.value); pbSchedulePreview();">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Imagen DESPUÉS</span>
            <input class="sinp" style="flex:1" value="${_ndEH(d.imgDespues)}" oninput="pbSetCmpField(${si},${ci},'imgDespues',this.value); pbSchedulePreview();">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Ancho Máximo</span>
            <input class="sinp" style="width:80px" value="${d.maxAncho || '700px'}" oninput="pbSetCmpField(${si},${ci},'maxAncho',this.value)">
            <span class="pb-field-lbl" style="margin-left:10px">Manejador</span>
            <input type="color" class="pb-color-inp" value="${d.colorManejador || '#00dcff'}" oninput="pbSetCmpField(${si},${ci},'colorManejador',this.value)">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Corte Inicial (%)</span>
            <input type="range" min="0" max="100" style="flex:1" value="${d.posicionInicial || '50'}" oninput="pbSetCmpField(${si},${ci},'posicionInicial',this.value); pbSchedulePreview();">
          </div>
          <div class="pb-field-row">
            <span class="pb-field-lbl">Margen (V)</span>
            <input class="sinp" style="width:80px" value="${d.marginVertical || '20px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value)">
          </div>
        </div>`;
    },

    renderHTML(d) {
      // Inyectamos un identificador único basado en marcas de tiempo para evitar colisiones si se instancian varios módulos en una misma página
      const uid = 'ba_' + Math.random().toString(36).substr(2, 9);
      
      return `
        <div class="nd-ba-container" id="${uid}" 
             style="max-width: ${d.maxAncho || '700px'}; margin: ${d.marginVertical || '20px'} auto;
                    --nd-ba-pos: ${d.posicionInicial || '50'}%; --nd-ba-color: ${d.colorManejador || '#00dcff'};">
          
          <div class="nd-ba-img layer-after">
            <img src="${_ndEH(d.imgDespues)}" alt="Después" />
          </div>
          
          <div class="nd-ba-img layer-before">
            <img src="${_ndEH(d.imgAntes)}" alt="Antes" />
          </div>
          
          <input type="range" min="0" max="100" value="${d.posicionInicial || '50'}" class="nd-ba-slider" 
                 oninput="this.parentElement.style.setProperty('--nd-ba-pos', this.value + '%')" />
          
          <div class="nd-ba-handle"></div>
        </div>`;
    },

    css: `
.nd-ba-container { position: relative; width: 100%; aspect-ratio: 16 / 10; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); user-select: none; box-sizing: border-box; }
.nd-ba-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.nd-ba-img img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }

/* Capas y máscaras nativas */
.layer-after { z-index: 1; }
.layer-before { z-index: 2; clip-path: polygon(0 0, var(--nd-ba-pos) 0, var(--nd-ba-pos) 100%, 0 100%); }

/* Control del rango input invisible superpuesto que captura los gestos de arrastre */
.nd-ba-slider { position: absolute; z-index: 4; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: ew-resize; margin: 0; padding: 0; }

/* La barra divisoria estilizada con iluminación neón integrada */
.nd-ba-handle { position: absolute; z-index: 3; top: 0; left: var(--nd-ba-pos); width: 4px; height: 100%; background: var(--nd-ba-color); transform: translateX(-50%); pointer-events: none; box-shadow: 0 0 10px var(--nd-ba-color); }
.nd-ba-handle::after { content: "↔"; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 34px; height: 34px; background: var(--nd-ba-color); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 0 12px rgba(0,0,0,0.2), 0 0 8px var(--nd-ba-color); }
`
  }]
});
function _ndEH(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }