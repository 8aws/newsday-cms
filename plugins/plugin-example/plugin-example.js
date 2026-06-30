// ════════════════════════════════════════════════════════════════
//  plugin-example.js — Plantilla de referencia de un plugin Newsday
//
//  Copia esta carpeta, renómbrala con tu id (carpeta = id = nombre .js)
//  y adapta los métodos. Documentación: docs/creating-plugins.md
// ════════════════════════════════════════════════════════════════

ND.registerPlugin({
  id: 'plugin-example',        // DEBE coincidir con plugin.json y el nombre del archivo
  name: 'Plugin de ejemplo',
  version: '1.0.0',

  components: [{
    type: 'plugin-example',    // identificador interno único (sin espacios ni acentos)
    ic: '🧪',
    lb: 'Ejemplo',
    hint: 'Componente de demostración para desarrollar y probar plugins',

    // ── 1. Datos por defecto al insertar el componente ─────────────
    defaultData() {
      return {
        titulo:  '¡Hola, Newsday!',
        texto:   'Este es un componente de ejemplo. Edítalo en el panel de la derecha.',
        estilo:  'tarjeta',     // tarjeta | plano
        color:   '#5068e8',
        centrado: false,
      };
    },

    // ── 2. Panel de edición (devuelve un string HTML) ──────────────
    //    si = índice de sección, ci = índice de componente.
    //    Usa SIEMPRE pbSetCmpField(si,ci,'campo',valor) en los eventos.
    renderFields(d, si, ci) {
      const estilos = [['tarjeta', 'Tarjeta'], ['plano', 'Plano']];
      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Título</span>
          <input class="sinp" style="flex:1" value="${_ndExEH(d.titulo || '')}"
                 oninput="pbSetCmpField(${si},${ci},'titulo',this.value)">
        </div>
        <div class="pb-field-row" style="align-items:flex-start">
          <span class="pb-field-lbl" style="padding-top:6px">Texto</span>
          <textarea class="pb-textarea" style="flex:1" rows="3"
                    oninput="pbSetCmpField(${si},${ci},'texto',this.value)"
          >${_ndExEH(d.texto || '')}</textarea>
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Estilo</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'estilo',this.value)">
            ${estilos.map(([v, l]) =>
              `<option value="${v}" ${d.estilo === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:10px">Color</span>
          <input type="color" class="pb-color-inp" value="${d.color || '#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'color',this.value)">
          <label style="font-size:12px;display:flex;align-items:center;gap:5px;margin-left:10px;cursor:pointer">
            <input type="checkbox" ${d.centrado ? 'checked' : ''}
                   onchange="pbSetCmpField(${si},${ci},'centrado',this.checked)">
            Centrar
          </label>
        </div>`;
    },

    // ── 3. HTML que se genera en la página / vista previa ──────────
    renderHTML(d) {
      const cls = [
        'nd-ex',
        d.estilo === 'plano' ? 'nd-ex--plano' : 'nd-ex--tarjeta',
        d.centrado ? 'nd-ex--center' : '',
      ].join(' ').trim();
      return `
        <div class="${cls}" style="--nd-ex-color:${d.color || '#5068e8'}">
          <h3 class="nd-ex-tit">${_ndExEH(d.titulo || '')}</h3>
          <p class="nd-ex-txt">${_ndExEH(d.texto || '')}</p>
        </div>`;
    },

    // ── 4. CSS del componente (se inyecta automáticamente) ─────────
    css: `
.nd-ex{padding:24px;border-radius:12px}
.nd-ex--tarjeta{background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.06);border-top:4px solid var(--nd-ex-color)}
.nd-ex--plano{border-left:4px solid var(--nd-ex-color)}
.nd-ex--center{text-align:center}
.nd-ex-tit{margin:0 0 8px;font-size:1.4rem;font-weight:800;color:var(--nd-ex-color)}
.nd-ex-txt{margin:0;font-size:.95rem;line-height:1.6;opacity:.85}
`
  }]
});

// ── Helper de escape (define uno propio por plugin para no colisionar) ──
function _ndExEH(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ── ¿Listas dinámicas (varios ítems)? Patrón en docs/creating-plugins.md §5 ──
