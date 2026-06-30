ND.registerPlugin({
  id: 'acordeon',
  name: 'Acordeón Avanzado',
  version: '1.2.0',

  components: [{
    type: 'acordeon',
    ic: '🪗',
    lb: 'Acordeón Pro',
    hint: 'Lista colapsable manual o dinámica (Posts, Categorías, Tags)',

    // ── Datos por defecto ──────────────────────────────────────
    defaultData() {
      return {
        // Estado interno para que el panel de edición no se cierre
        _panelAjustesAbierto: false,

        // Origen de datos
        origen: 'manual', 
        maxItemsDinamicos: 5,
        
        // Contenido Manual
        tituloSeccion: 'Preguntas Frecuentes',
        items: [
          { titulo: '¿Cómo funciona el modo manual?', contenido: 'Escribes lo que quieras aquí directamente.' }
        ],

        // Comportamiento
        estadoInicial: 'cerrado', // 'cerrado', 'primero-abierto', 'todos-abiertos'
        iconoTipo: 'flecha', // 'flecha', 'mas', 'carpeta'
        
        // Estilo y Estructura
        anchoTipo: 'fijo', // 'completo', 'fijo', 'porcentaje'
        anchoValor: '800px', 
        alineacion: 'center', // 'left', 'center', 'right'
        separacionItems: 'no', // 'no' (bloque unido), 'si' (tarjetas)
        sombraTipo: 'suave', // 'ninguna', 'suave', 'intensa'
        
        // Espaciados (NUEVO)
        paddingVertical: '14px',
        paddingHorizontal: '18px',
        marginVertical: '15px',
        
        // Tipografía y Textos
        fontFamily: 'inherit',
        
        // Colores y Decoración
        colorAcento: '#5068e8',
        fondoTipo: 'heredar', // 'heredar', 'solido', 'degradado'
        colorFondoSolido: '#ffffff',
        colorFondoDegradado1: '#ffffff',
        colorFondoDegradado2: '#f8fafc',
        bordeRadio: '8px'
      };
    },

    // ── Panel de edición (HTML string) ─────────────────────────
    renderFields(d, si, ci) {
      // 1. Selector de Origen de Datos
      const origenes = [['manual','Manual (Contenido propio)'], ['posts','Dinámico: Últimos Posts'], ['categories','Dinámico: Lista de Categorías'], ['tags','Dinámico: Lista de Tags']];
      const selectorOrigen = `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Origen</span>
          <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'origen',this.value); _pbRefreshCmp(${si},${ci})">
            ${origenes.map(([v,l]) => `<option value="${v}" ${d.origen===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>`;

      // 2. Bloque de contenido principal (Manual vs Dinámico)
      let bloqueContenido = '';
      if (d.origen === 'manual') {
        const itemsHTML = (d.items || []).map((item, ki) => `
          <div class="pb-card-item" style="display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid #ddd; margin-bottom:8px; border-radius:4px; background:#fff;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:11px; color:#666;">Ítem #${ki + 1}</strong>
              <button class="btn btn-red btn-sm" onclick="_ndAcordeonRemoveItem(${si},${ci},${ki})">✕</button>
            </div>
            <div class="pb-field-row">
              <span class="pb-field-lbl">Título</span>
              <input class="sinp" style="flex:1" value="${_ndEH(item.titulo || '')}" oninput="_ndAcordeonSetItem(${si},${ci},${ki},'titulo',this.value)">
            </div>
            <div class="pb-field-row" style="align-items:flex-start">
              <span class="pb-field-lbl" style="padding-top:6px">Contenido</span>
              <textarea class="pb-textarea" style="flex:1" rows="2" oninput="_ndAcordeonSetItem(${si},${ci},${ki},'contenido',this.value)">${_ndEH(item.contenido || '')}</textarea>
            </div>
          </div>`).join('');

        bloqueContenido = `
          <div class="pb-field-row">
            <span class="pb-field-lbl">Título Bloque</span>
            <input class="sinp" style="flex:1" value="${_ndEH(d.tituloSeccion || '')}" oninput="pbSetCmpField(${si},${ci},'tituloSeccion',this.value)">
          </div>
          <div style="margin:10px 0 6px; font-weight:bold; font-size:12px;">Ítems del Acordeón:</div>
          <div class="pb-card-list">${itemsHTML}</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:6px; width:100%; justify-content:center;" onclick="_ndAcordeonAddItem(${si},${ci})">＋ Añadir Ítem</button>`;
      } else {
        bloqueContenido = `
          <div class="pb-field-row">
            <span class="pb-field-lbl">Límite ítems</span>
            <input type="number" class="sinp" style="width:70px" value="${d.maxItemsDinamicos || 5}" min="1" max="30" oninput="pbSetCmpField(${si},${ci},'maxItemsDinamicos',+this.value)">
          </div>`;
      }

      // 3. Selectores de diseño avanzado
      const estados = [['cerrado','Todos cerrados'], ['primero-abierto','Primero abierto'], ['todos-abiertos','Todos abiertos']];
      const iconos = [['flecha','Flecha (▼)'], ['mas','Más/Menos (➕)'], ['carpeta','Carpeta (📂)']];
      const anchos = [['completo','Ancho Completo (100%)'], ['fijo','Ancho Fijo (px)'], ['porcentaje','Porcentaje (%)']];
      const alineaciones = [['left','Izquierda'], ['center','Centrado'], ['right','Derecha']];
      const fuentes = [['inherit','Por defecto web'], ['sans-serif','Sans Serif'], ['serif','Serif'], ['monospace','Monospace']];
      const fondos = [['heredar','Transparente / Heredar'], ['solido','Color Sólido'], ['degradado','Degradado suave']];
      const sombras = [['ninguna','Ninguna / Plano'], ['suave','Sombra Suave'], ['intensa','Sombra Marcada']];

      // Determinar si el bloque de ajustes debe renderizarse con el atributo 'open'
      const panelAbiertoAttr = d._panelAjustesAbierto ? 'open' : '';

      return `
        <div style="border-bottom:1px solid #eee; padding-bottom:10px; margin-bottom:10px;">
          ${selectorOrigen}
          ${bloqueContenido}
        </div>
        
        <details ${panelAbiertoAttr} style="cursor:pointer; font-size:12px; color:#555;" 
                 ontoggle="PB.sections[${si}].components[${ci}].data._panelAjustesAbierto = this.open">
          <summary style="font-weight:bold; margin-bottom:8px; user-select:none;">⚙️ Diseño y Ajustes Avanzados</summary>
          <div style="display:flex; flex-direction:column; gap:8px; padding-top:8px; cursor:default;" onclick="event.stopPropagation()">
            
            <div class="pb-field-row">
              <span class="pb-field-lbl">Apertura</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'estadoInicial',this.value)">
                ${estados.map(([v,l]) => `<option value="${v}" ${d.estadoInicial===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Estilo Icono</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'iconoTipo',this.value)">
                ${iconos.map(([v,l]) => `<option value="${v}" ${d.iconoTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Estructura</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'separacionItems',this.value)">
                <option value="no" ${d.separacionItems==='no'?'selected':''}>Bloque compacto unificado</option>
                <option value="si" ${d.separacionItems==='si'?'selected':''}>Items separados / tarjetas</option>
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Sombras</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'sombraTipo',this.value)">
                ${sombras.map(([v,l]) => `<option value="${v}" ${d.sombraTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Ancho</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'anchoTipo',this.value); _pbRefreshCmp(${si},${ci})">
                ${anchos.map(([v,l]) => `<option value="${v}" ${d.anchoTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
              ${d.anchoTipo !== 'completo' ? `<input class="sinp" style="width:70px" value="${d.anchoValor || '800px'}" oninput="pbSetCmpField(${si},${ci},'anchoValor',this.value)">` : ''}
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Alineación</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'alineacion',this.value)">
                ${alineaciones.map(([v,l]) => `<option value="${v}" ${d.alineacion===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Márgenes (V)</span>
              <input class="sinp" style="width:65px" value="${d.marginVertical || '15px'}" oninput="pbSetCmpField(${si},${ci},'marginVertical',this.value)">
              <span class="pb-field-lbl" style="margin-left:5px">Padding</span>
              <input class="sinp" style="width:55px" value="${d.paddingVertical || '14px'}" oninput="pbSetCmpField(${si},${ci},'paddingVertical',this.value)">
              <input class="sinp" style="width:55px" value="${d.paddingHorizontal || '18px'}" oninput="pbSetCmpField(${si},${ci},'paddingHorizontal',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Tipografía</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'fontFamily',this.value)">
                ${fuentes.map(([v,l]) => `<option value="${v}" ${d.fontFamily===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Redondeado</span>
              <input class="sinp" style="width:70px" value="${d.bordeRadio || '8px'}" oninput="pbSetCmpField(${si},${ci},'bordeRadio',this.value)">
              <span class="pb-field-lbl" style="margin-left:10px">Acento</span>
              <input type="color" class="pb-color-inp" value="${d.colorAcento || '#5068e8'}" oninput="pbSetCmpField(${si},${ci},'colorAcento',this.value)">
            </div>

            <div class="pb-field-row">
              <span class="pb-field-lbl">Fondo</span>
              <select class="pb-mini-sel" style="flex:1" onchange="pbSetCmpField(${si},${ci},'fondoTipo',this.value); _pbRefreshCmp(${si},${ci})">
                ${fondos.map(([v,l]) => `<option value="${v}" ${d.fondoTipo===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
            ${d.fondoTipo === 'solido' ? `
              <div class="pb-field-row">
                <span class="pb-field-lbl">Color fondo</span>
                <input type="color" class="pb-color-inp" value="${d.colorFondoSolido || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorFondoSolido',this.value)">
              </div>` : ''}
            ${d.fondoTipo === 'degradado' ? `
              <div class="pb-field-row">
                <span class="pb-field-lbl">Color 1</span>
                <input type="color" class="pb-color-inp" value="${d.colorFondoDegradado1 || '#ffffff'}" oninput="pbSetCmpField(${si},${ci},'colorFondoDegradado1',this.value)">
                <span class="pb-field-lbl" style="margin-left:10px">Color 2</span>
                <input type="color" class="pb-color-inp" value="${d.colorFondoDegradado2 || '#f8fafc'}" oninput="pbSetCmpField(${si},${ci},'colorFondoDegradado2',this.value)">
              </div>` : ''}
          </div>
        </details>`;
    },

    // ── HTML generado ──────────────────────────────────────────
    renderHTML(d) {
      let listaProcesada = [];
      const limite = d.maxItemsDinamicos || 5;

      // Inyección dinámica leyendo la API global window.S
      if (d.origen === 'posts') {
        const postsValidos = (window.S?.posts || []).filter(p => p.status === 'published');
        const baseUrl = (document.getElementById('cfg-baseurl')?.value || '').replace(/\/$/, '');
        listaProcesada = postsValidos.slice(0, limite).map(p => ({
          titulo: p.title || 'Artículo sin título',
          contenido: `Publicado el ${p.date || ''} por ${p.author || 'Redacción'}. <br><a href="${baseUrl}/${p.slug}/" style="color:var(--nd-ac-accent); font-weight:600; text-decoration:underline;">Leer artículo completo →</a>`
        }));
      } 
      else if (d.origen === 'categories' || d.origen === 'tags') {
        const mapaSet = new Set();
        (window.S?.posts || []).forEach(p => {
          if (p.tags) p.tags.split(',').forEach(t => mapaSet.add(t.trim()));
        });
        const itemsInteres = Array.from(mapaSet).slice(0, limite);
        const baseUrl = (document.getElementById('cfg-baseurl')?.value || '').replace(/\/$/, '');
        
        listaProcesada = itemsInteres.map(tag => ({
          titulo: `${d.origen === 'categories' ? '📁' : '📌'} ${tag}`,
          contenido: `Ver todos los artículos archivados dentro de la taxonomía: <a href="${baseUrl}/tag/${tag.toLowerCase().replace(/ /g, '-')}/" style="color:var(--nd-ac-accent); font-weight:600; text-decoration:underline;">Explorar "${tag}" →</a>`
        }));
      } 
      else {
        listaProcesada = d.items || [];
      }

      // Selector de icono visual por CSS
      const claseIcono = `ico-${d.iconoTipo || 'flecha'}`;

      const itemsHTML = listaProcesada.map((item, idx) => {
        let abrir = '';
        if (d.estadoInicial === 'todos-abiertos') abrir = 'open';
        if (d.estadoInicial === 'primero-abierto' && idx === 0) abrir = 'open';

        return `
          <div class="nd-acpro-item">
            <details ${abrir}>
              <summary class="nd-acpro-header ${claseIcono}">
                <span class="nd-acpro-title">${_ndEH(item.titulo)}</span>
                <span class="nd-acpro-icon"></span>
              </summary>
              <div class="nd-acpro-content">
                <div>${item.contenido}</div>
              </div>
            </details>
          </div>`;
      }).join('');

      // Construcción del Layout Inline
      let estiloAncho = 'width: 100%;';
      if (d.anchoTipo === 'fijo') estiloAncho = `width: ${d.anchoValor || '800px'}; max-width: 100%;`;
      if (d.anchoTipo === 'porcentaje') estiloAncho = `width: ${d.anchoValor || '80%'};`;

      let estiloFondo = 'background: transparent;';
      if (d.fondoTipo === 'solido') estiloFondo = `background: ${d.colorFondoSolido || '#fff'};`;
      if (d.fondoTipo === 'degradado') estiloFondo = `background: linear-gradient(135deg, ${d.colorFondoDegradado1 || '#fff'} 0%, ${d.colorFondoDegradado2 || '#f8fafc'} 100%);`;

      return `
        <div class="nd-acpro-container align-${d.alineacion || 'center'} shadow-${d.sombraTipo || 'suave'}" 
             style="${estiloAncho} 
                    --nd-ac-accent: ${d.colorAcento || '#5068e8'}; 
                    --nd-ac-radius: ${d.bordeRadio || '8px'}; 
                    --nd-ac-pad-v: ${d.paddingVertical || '14px'};
                    --nd-ac-pad-h: ${d.paddingHorizontal || '18px'};
                    --nd-ac-margin-v: ${d.marginVertical || '15px'};
                    font-family: var(--nd-ac-font-${d.fontFamily || 'inherit'});">
          ${d.origen === 'manual' && d.tituloSeccion ? `<h3 class="nd-acpro-main-title">${_ndEH(d.tituloSeccion)}</h3>` : ''}
          <div class="nd-acpro-list struct-${d.separacionItems || 'no'}" style="${estiloFondo}">
            ${itemsHTML || '<p style="padding:20px; opacity:0.6; text-align:center;">No hay elementos para mostrar.</p>'}
          </div>
        </div>`;
    },

    // ── CSS encapsulado ────────────────────────────────────────
    css: `
.nd-acpro-container { 
  --nd-ac-font-inherit: inherit; 
  --nd-ac-font-sans-serif: system-ui, -apple-system, sans-serif; 
  --nd-ac-font-serif: Georgia, serif; 
  --nd-ac-font-monospace: monospace; 
  margin-top: var(--nd-ac-margin-v); 
  margin-bottom: var(--nd-ac-margin-v); 
}

/* Alineaciones del layout */
.nd-acpro-container.align-left { margin-right: auto; margin-left: 0; }
.nd-acpro-container.align-center { margin-right: auto; margin-left: auto; }
.nd-acpro-container.align-right { margin-right: 0; margin-left: auto; }

.nd-acpro-main-title { font-size: 1.4rem; margin-bottom: 14px; color: #1e293b; font-weight: 700; }

/* Sombras */
.nd-acpro-container.shadow-suave .nd-acpro-list.struct-no,
.nd-acpro-container.shadow-suave .nd-acpro-list.struct-si .nd-acpro-item { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); }
.nd-acpro-container.shadow-intensa .nd-acpro-list.struct-no,
.nd-acpro-container.shadow-intensa .nd-acpro-list.struct-si .nd-acpro-item { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04); }

/* Estructura: Compacta */
.nd-acpro-list.struct-no { border: 1px solid #e2e8f0; border-radius: var(--nd-ac-radius); overflow: hidden; }
.nd-acpro-list.struct-no .nd-acpro-item { border-bottom: 1px solid #e2e8f0; }
.nd-acpro-list.struct-no .nd-acpro-item:last-child { border-bottom: none; }

/* Estructura: Separada */
.nd-acpro-list.struct-si { border: none !important; background: transparent !important; display: flex; flex-direction: column; gap: 12px; }
.nd-acpro-list.struct-si .nd-acpro-item { border: 1px solid #e2e8f0; border-radius: var(--nd-ac-radius); overflow: hidden; background: #fff; }

/* Cabeceras */
.nd-acpro-header::-webkit-details-marker { display: none; }
.nd-acpro-header { display: flex; justify-content: space-between; align-items: center; padding: var(--nd-ac-pad-v) var(--nd-ac-pad-h); cursor: pointer; user-select: none; list-style: none; transition: background 0.2s ease; }
.nd-acpro-header:hover { background: rgba(0, 0, 0, 0.02); }

.nd-acpro-title { font-weight: 600; color: #1e293b; font-size: 0.98rem; text-align: left; }
.nd-acpro-icon { transition: transform 0.2s ease; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; }

/* Lógica de Iconos mediante Pseudoelementos */
.nd-acpro-header.ico-flecha .nd-acpro-icon::before { content: "▼"; font-size: 0.75rem; color: #94a3b8; }
.nd-acpro-header.ico-mas .nd-acpro-icon::before { content: "＋"; font-size: 0.9rem; color: #94a3b8; font-weight: bold; }
.nd-acpro-header.ico-carpeta .nd-acpro-icon::before { content: "📁"; font-size: 0.9rem; }

details[open] .nd-acpro-header { border-bottom: 1px solid #f1f5f9; background: rgba(0, 0, 0, 0.01); }
details[open] .nd-acpro-title { color: var(--nd-ac-accent); }

/* Rotaciones/Cambios al abrir */
details[open] .ico-flecha .nd-acpro-icon { transform: rotate(180deg); }
details[open] .ico-flecha .nd-acpro-icon::before { color: var(--nd-ac-accent); }
details[open] .ico-mas .nd-acpro-icon { transform: rotate(45deg); }
details[open] .ico-mas .nd-acpro-icon::before { color: var(--nd-ac-accent); }
details[open] .ico-carpeta .nd-acpro-icon::before { content: "📂"; }

/* Caja de contenido */
.nd-acpro-content { padding: var(--nd-ac-pad-v) var(--nd-ac-pad-h); color: #475569; font-size: 0.92rem; line-height: 1.6; text-align: left; background: #fff; }
`
  }]
});

// ── Funciones Auxiliares Globales ──────────────────────────────
function _ndAcordeonSetItem(si, ci, ki, f, v) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.items = c.data.items || [];
  if (!c.data.items[ki]) c.data.items[ki] = {};
  c.data.items[ki][f] = v;
  PB.dirty = true;
  pbSchedulePreview();
}

function _ndAcordeonAddItem(si, ci) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.items = c.data.items || [];
  c.data.items.push({ titulo: 'Nuevo bloque informativo', contenido: 'Contenido redactado...' });
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function _ndAcordeonRemoveItem(si, ci, ki) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.items.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function _ndEH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}