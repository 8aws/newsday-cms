ND.registerPlugin({
  id: 'botones',
  name: 'Grupo de Botones Ultra Custom',
  version: '1.1.0',

  components: [{
    type: 'botones',
    ic: '🫵',
    lb: 'Botones Pro',
    hint: 'Botones con formas libres, degradados, iconos en cualquier posición y fuentes a elegir',

    // ── Datos por defecto ──────────────────────────────────────
    defaultData() {
      return {
        _panelAjustesAbierto: false,

        // Disposición global del contenedor
        disposicion: 'row', 
        alineacion: 'center', 
        gap: '12px', 
        marginVertical: '15px',

        // Listado de botones internos
        listaBotones: [
          {
            texto: '¡Comenzar ya!',
            url: '#',
            esPulsable: 'si',
            
            // Estilos de Fondo y Bordes
            tipoFondo: 'degradado', // 'relleno', 'degradado', 'outline', 'transparente'
            colorFondo: '#5068e8',
            colorDegradado1: '#5068e8',
            colorDegradado2: '#8b5cf6',
            colorTexto: '#ffffff',
            colorBorde: '#5068e8',
            
            // Formas, Tipografías y Efectos (AMPLIADO)
            formaBoton: 'rounded', // 'square', 'rounded', 'pill', 'oval', 'castillo'
            fontFamily: 'sans-serif', // 'inherit', 'sans-serif', 'serif', 'monospace', 'cursive'
            sombraTipo: 'suave', // 'ninguna', 'suave', 'intensa', 'neon'
            
            // Iconos / Imágenes
            urlIcono: '🚀', 
            posicionIcono: 'antes', // 'antes', 'despues', 'encima', 'debajo'
            
            anchoBoton: 'auto'
          }
        ]
      };
    },

    // ── Panel de edición ───────────────────────────────────────
    renderFields(d, si, ci) {
      const dispOpciones = [['row', 'Fila horizontal'], ['column', 'Lista apilada (Columna)'], ['fluid', 'Fila (y columna en móvil)']];
      const alOpciones = [['left', 'Izquierda'], ['center', 'Centrado'], ['right', 'Derecha'], ['space-between', 'Separación uniforme']];

      const formas = [['square', 'Cuadrado (Square)'], ['rounded', 'Esquinas Suaves'], ['pill', 'Píldora (Pill)'], ['oval', 'Ovalado (Circulo estirado)'], ['castillo', 'Castillo Medieval / Almenado']];
      const fuentes = [['inherit', 'Heredar tema'], ['sans-serif', 'Sans-Serif (Limpia)'], ['serif', 'Serif (Clásica)'], ['monospace', 'Monospace (Código)'], ['cursive', 'Cursive / Comic']];
      const sombras = [['ninguna', 'Sin Sombra'], ['suave', 'Sombra sutil'], ['intensa', 'Sombra pronunciada'], ['neon', 'Brillo Neón (Acento)']];

      // Renderizar los botones individuales
      const botonesHTML = (d.listaBotones || []).map((btn, ki) => {
        return `
          <div class="pb-card-item" style="display:flex; flex-direction:column; gap:6px; padding:12px; border:1px solid #ccd4ff; margin-bottom:12px; border-radius:6px; background:#f9faff;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:6px; margin-bottom:4px;">
              <strong style="font-size:12px; color:#3b82f6;">🔘 Botón #${ki + 1}</strong>
              <button class="btn btn-red btn-sm" onclick="_ndBotonesRemove(${si},${ci},${ki})">✕ Eliminar</button>
            </div>
            
            <div class="pb-field-row">
              <span class="pb-field-lbl">Texto</span>
              <input class="sinp" style="flex:1" value="${_ndEH(btn.texto || '')}" oninput="_ndBotonesSet(${si},${ci},ki,'texto',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">URL / Link</span>
              <input class="sinp" style="flex:1" value="${_ndEH(btn.url || '')}" oninput="_ndBotonesSet(${si},${ci},ki,'url',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Forma</span>
              <select class="pb-mini-sel" style="flex:1" onchange="_ndBotonesSet(${si},${ci},${ki},'formaBoton',this.value)">
                ${formas.map(([v,l]) => `<option value="${v}" ${btn.formaBoton===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Tipografía</span>
              <select class="pb-mini-sel" style="flex:1" onchange="_ndBotonesSet(${si},${ci},${ki},'fontFamily',this.value)">
                ${fuentes.map(([v,l]) => `<option value="${v}" ${btn.fontFamily===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Efecto / Sombra</span>
              <select class="pb-mini-sel" style="flex:1" onchange="_ndBotonesSet(${si},${ci},${ki},'sombraTipo',this.value)">
                ${sombras.map(([v,l]) => `<option value="${v}" ${btn.sombraTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Estilo Fondo</span>
              <select class="pb-mini-sel" style="flex:1" onchange="_ndBotonesSet(${si},${ci},${ki},'tipoFondo',this.value); _pbRefreshCmp(${si},${ci})">
                <option value="relleno" ${btn.tipoFondo==='relleno'?'selected':''}>Color Sólido</option>
                <option value="degradado" ${btn.tipoFondo==='degradado'?'selected':''}>Degradado Dinámico</option>
                <option value="outline" ${btn.tipoFondo==='outline'?'selected':''}>Línea Exterior (Outline)</option>
                <option value="transparente" ${btn.tipoFondo==='transparente'?'selected':''}>Transparente</option>
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Texto</span>
              <input type="color" class="pb-color-inp" value="${btn.colorTexto || '#ffffff'}" oninput="_ndBotonesSet(${si},${ci},${ki},'colorTexto',this.value)">
              
              ${btn.tipoFondo === 'relleno' ? `
                <span class="pb-field-lbl" style="margin-left:10px">Color</span>
                <input type="color" class="pb-color-inp" value="${btn.colorFondo || '#5068e8'}" oninput="_ndBotonesSet(${si},${ci},${ki},'colorFondo',this.value)">
              ` : ''}

              ${btn.tipoFondo === 'degradado' ? `
                <span class="pb-field-lbl" style="margin-left:5px">Color 1</span>
                <input type="color" class="pb-color-inp" value="${btn.colorDegradado1 || '#5068e8'}" oninput="_ndBotonesSet(${si},${ci},${ki},'colorDegradado1',this.value)">
                <span class="pb-field-lbl" style="margin-left:5px">Color 2</span>
                <input type="color" class="pb-color-inp" value="${btn.colorDegradado2 || '#8b5cf6'}" oninput="_ndBotonesSet(${si},${ci},${ki},'colorDegradado2',this.value)">
              ` : ''}

              ${btn.tipoFondo === 'outline' ? `
                <span class="pb-field-lbl" style="margin-left:10px">Borde</span>
                <input type="color" class="pb-color-inp" value="${btn.colorBorde || '#5068e8'}" oninput="_ndBotonesSet(${si},${ci},${ki},'colorBorde',this.value)">
              ` : ''}
            </div>

            <div style="background:#fff; padding:8px; border-radius:4px; margin-top:4px; border:1px dashed #cbd5e1;">
              <div class="pb-field-row">
                <span class="pb-field-lbl">Icono (URL o Emoji)</span>
                <input class="sinp" style="flex:1" value="${_ndEH(btn.urlIcono || '')}" placeholder="ej: 🚀 o URL" oninput="_ndBotonesSet(${si},${ci},ki,'urlIcono',this.value)">
              </div>
              <div class="pb-field-row">
                <span class="pb-field-lbl">Ubicación Icono</span>
                <select class="pb-mini-sel" style="flex:1" onchange="_ndBotonesSet(${si},${ci},${ki},'posicionIcono',this.value)">
                  <option value="antes" ${btn.posicionIcono==='antes'?'selected':''}>Izquierda (Antes)</option>
                  <option value="despues" ${btn.posicionIcono==='despues'?'selected':''}>Derecha (Después)</option>
                  <option value="encima" ${btn.posicionIcono==='encima'?'selected':''}>Arriba (Encima)</option>
                  <option value="debajo" ${btn.posicionIcono==='debajo'?'selected':''}>Abajo (Debajo)</option>
                </select>
              </div>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">¿Ancho Full?</span>
              <select class="pb-mini-sel" style="flex:1" onchange="_ndBotonesSet(${si},${ci},${ki},'anchoBoton',this.value)">
                <option value="auto" ${btn.anchoBoton==='auto'?'selected':''}>Auto ajustado</option>
                <option value="full" ${btn.anchoBoton==='full'?'selected':''}>Ancho Completo (100%)</option>
              </select>
              <span class="pb-field-lbl" style="margin-left:10px">¿Pulsable?</span>
              <select class="pb-mini-sel" style="width:70px" onchange="_ndBotonesSet(${si},${ci},${ki},'esPulsable',this.value)">
                <option value="si" ${btn.esPulsable==='si'?'selected':''}>Sí</option>
                <option value="no" ${btn.esPulsable==='no'?'selected':''}>No</option>
              </select>
            </div>
          </div>`;
      }).join('');

      const panelAbiertoAttr = d._panelAjustesAbierto ? 'open' : '';

      return `
        <div style="font-weight:bold; font-size:13px; margin-bottom:8px; color:#1e293b;">Lista de Botones:</div>
        <div class="pb-card-list">${botonesHTML}</div>
        <button class="btn btn-ghost btn-sm" style="width:100%; justify-content:center; margin-bottom:14px; border:1px solid #3b82f6; color:#3b82f6;" 
                onclick="_ndBotonesAdd(${si},${ci})">＋ Añadir Nuevo Botón</button>

        <details ${panelAbiertoAttr} style="cursor:pointer; font-size:12px; color:#555; border-top:1px solid #eee; padding-top:10px;" 
                 ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; margin-bottom:8px; user-select:none;">⚙️ Estructura del Grupo Global</summary>
          <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; cursor:default;" onclick="event.stopPropagation()">
            <div class="pb-field-row">
              <span class="pb-field-lbl">Disposición</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'disposicion',this.value)">
                ${dispOpciones.map(([v,l]) => `<option value="${v}" ${d.disposicion===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Alineación</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'alineacion',this.value)">
                ${alOpciones.map(([v,l]) => `<option value="${v}" ${d.alineacion===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Separación</span>
              <input class="sinp" style="width:70px" value="${d.gap || '12px'}" oninput="pbSetCmpField(${si},${ci},'gap',this.value)">
              <span class="pb-field-lbl" style="margin-left:10px">Margen (V)</span>
              <input class="sinp" style="width:70px" value="${d.marginVertical || '15px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value)">
            </div>
          </div>
        </details>`;
    },

    // ── HTML generado para el Front-End ────────────────────────
    renderHTML(d) {
      const botonesHTML = (d.listaBotones || []).map((btn) => {
        const esEnlace = btn.esPulsable !== 'no' && btn.url;
        const tag = esEnlace ? 'a' : 'span';
        const attrs = esEnlace ? `href="${_ndEH(btn.url)}" ` : '';

        // Tratamiento de icono
        let iconoHTML = '';
        if (btn.urlIcono) {
          if (btn.urlIcono.startsWith('http') || btn.urlIcono.startsWith('/')) {
            iconoHTML = `<img src="${_ndEH(btn.urlIcono)}" class="nd-btn-img" alt="icon" />`;
          } else {
            iconoHTML = `<span class="nd-btn-emoji">${_ndEH(btn.urlIcono)}</span>`;
          }
        }

        const posClase = `nd-pos-${btn.posicionIcono || 'antes'}`;
        const anchoClase = btn.anchoBoton === 'full' ? 'nd-btn-block' : '';
        const formaClase = `nd-shape-${btn.formaBoton || 'rounded'}`;
        const sombraClase = `nd-shd-${btn.sombraTipo || 'suave'}`;
        const fontClase = `nd-font-${btn.fontFamily || 'inherit'}`;

        // Preparar Estilos inline de renderizado libre
        let estilosInline = `
          --nd-btn-txt: ${btn.colorTexto || '#ffffff'};
          --nd-btn-accent: ${btn.colorFondo || '#5068e8'};
        `;

        let varianteClase = 'nd-var-solid';
        if (btn.tipoFondo === 'degradado') {
          varianteClase = 'nd-var-gradient';
          estilosInline += `--nd-btn-grad-1: ${btn.colorDegradado1 || '#5068e8'}; --nd-btn-grad-2: ${btn.colorDegradado2 || '#8b5cf6'};`;
        } else if (btn.tipoFondo === 'outline') {
          varianteClase = 'nd-var-outline';
          estilosInline += `--nd-btn-border: ${btn.colorBorde || '#5068e8'};`;
        } else if (btn.tipoFondo === 'transparente') {
          varianteClase = 'nd-var-trans';
        } else {
          estilosInline += `--nd-btn-bg: ${btn.colorFondo || '#5068e8'};`;
        }

        return `
          <${tag} ${attrs} class="nd-btn-element ${varianteClase} ${formaClase} ${posClase} ${anchoClase} ${sombraClase} ${fontClase}" style="${estilosInline}">
            ${iconoHTML}
            <span class="nd-btn-text">${_ndEH(btn.texto || 'Botón')}</span>
          </${tag}>`;
      }).join('');

      return `
        <div class="nd-buttons-wrapper disp-${d.disposicion || 'row'} align-${d.alineacion || 'center'}" 
             style="--nd-btn-gap: ${d.gap || '12px'}; --nd-btn-mv: ${d.marginVertical || '15px'};">
          ${botonesHTML || '<p style="font-size:12px; opacity:0.5;">(Sin botones)</p>'}
        </div>`;
    },

    // ── Estilos CSS encapsulados ───────────────────────────────
    css: `
.nd-buttons-wrapper { display: flex; gap: var(--nd-btn-gap); margin-top: var(--nd-btn-mv); margin-bottom: var(--nd-btn-mv); width: 100%; box-sizing: border-box; }
.nd-buttons-wrapper.disp-row { flex-direction: row; flex-wrap: wrap; }
.nd-buttons-wrapper.disp-column { flex-direction: column; align-items: stretch; }
.nd-buttons-wrapper.disp-fluid { flex-direction: row; flex-wrap: wrap; }

@media (max-width: 768px) { .nd-buttons-wrapper.disp-fluid { flex-direction: column; align-items: stretch; } }

.nd-buttons-wrapper.align-left { justify-content: flex-start; }
.nd-buttons-wrapper.align-center { justify-content: center; }
.nd-buttons-wrapper.align-right { justify-content: flex-end; }
.nd-buttons-wrapper.align-space-between { justify-content: space-between; }

/* Estilos nucleares */
.nd-btn-element {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 12px 26px; font-size: 1rem; font-weight: 600; text-decoration: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-sizing: border-box; position: relative;
}
.nd-btn-element:hover { transform: translateY(-1px); filter: brightness(1.08); }
.nd-btn-element:active { transform: translateY(1px); }

/* Distribución de Fondos */
.nd-var-solid { background: var(--nd-btn-bg); color: var(--nd-btn-txt); border: 1px solid transparent; }
.nd-var-gradient { background: linear-gradient(135deg, var(--nd-btn-grad-1) 0%, var(--nd-btn-grad-2) 100%); color: var(--nd-btn-txt); border: 1px solid transparent; }
.nd-var-outline { background: transparent; color: var(--nd-btn-border); border: 2px solid var(--nd-btn-border); }
.nd-var-outline:hover { background: var(--nd-btn-border); color: #fff; }
.nd-var-trans { background: transparent; color: var(--nd-btn-accent); border: 1px solid transparent; }
.nd-var-trans:hover { text-decoration: underline; background: rgba(0,0,0,0.03); }

/* Tipografías Independientes */
.nd-font-inherit { font-family: inherit; }
.nd-font-sans-serif { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.nd-font-serif { font-family: Georgia, Cambria, "Times New Roman", Times, serif; }
.nd-font-monospace { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:0.9rem; }
.nd-font-cursive { font-family: "Comic Sans MS", "Marker Felt", cursive; }

/* Control de Formas Geométricas Libres */
.nd-shape-square { border-radius: 0px; }
.nd-shape-rounded { border-radius: 6px; }
.nd-shape-pill { border-radius: 50px; }
.nd-shape-oval { border-radius: 50% / 12px; padding: 14px 28px; } /* Simula huevo/elipse */

/* Forma Extravagante: Castillo Medieval / Ticket rasgado usando clip-path moderno */
.nd-shape-castillo {
  border-radius: 0px;
  padding: 14px 30px;
  clip-path: polygon(
    0% 0%, 10% 0%, 10% 6px, 20% 6px, 20% 0%, 80% 0%, 80% 6px, 90% 6px, 90% 0%, 100% 0%,
    100% 100%, 90% 100%, 90% calc(100% - 6px), 80% calc(100% - 6px), 80% 100%, 20% 100%, 20% calc(100% - 6px), 10% calc(100% - 6px), 10% 100%, 0% 100%
  );
}

/* Manejo Libre de Sombras */
.nd-shd-ninguna { box-shadow: none; }
.nd-shd-suave { box-shadow: 0 2px 5px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04); }
.nd-shd-intensa { box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
.nd-shd-neon { box-shadow: 0 0 12px var(--nd-btn-accent, #5068e8), inset 0 0 4px rgba(255,255,255,0.2); }

/* Ancho completo alternativo */
.nd-btn-block { width: 100%; flex: 1; }

/* Posicionado Flexbox de Iconos internos */
.nd-btn-element.nd-pos-antes { flex-direction: row; gap: 8px; }
.nd-btn-element.nd-pos-despues { flex-direction: row-reverse; gap: 8px; }
.nd-btn-element.nd-pos-encima { flex-direction: column; gap: 6px; padding-top: 14px; padding-bottom: 14px; }
.nd-btn-element.nd-pos-debajo { flex-direction: column-reverse; gap: 6px; padding-top: 14px; padding-bottom: 14px; }

.nd-btn-img { max-width: 20px; max-height: 20px; object-fit: contain; }
.nd-btn-emoji { font-size: 1.1rem; line-height: 1; display: inline-block; }

/* Comportamiento cuando es badge estático */
span.nd-btn-element { cursor: default; }
span.nd-btn-element:hover { transform: none !important; filter: none !important; box-shadow: var(--nd-shd-ninguna) !important; }
`
  }]
});

// ── Funciones Auxiliares Globales para control del listado ───
function _ndBotonesSet(si, ci, ki, f, v) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.listaBotones = c.data.listaBotones || [];
  if (!c.data.listaBotones[ki]) c.data.listaBotones[ki] = {};
  c.data.listaBotones[ki][f] = v;
  PB.dirty = true;
  pbSchedulePreview();
}

function _ndBotonesAdd(si, ci) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.listaBotones = c.data.listaBotones || [];
  c.data.listaBotones.push({
    texto: 'Nuevo Botón',
    url: '#',
    esPulsable: 'si',
    tipoFondo: 'relleno',
    colorFondo: '#10b981',
    colorDegradado1: '#10b981',
    colorDegradado2: '#059669',
    colorTexto: '#ffffff',
    colorBorde: '#10b981',
    formaBoton: 'rounded',
    fontFamily: 'inherit',
    sombraTipo: 'suave',
    urlIcono: '',
    posicionIcono: 'antes',
    anchoBoton: 'auto'
  });
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function _ndBotonesRemove(si, ci, ki) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.listaBotones.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function _ndEH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}