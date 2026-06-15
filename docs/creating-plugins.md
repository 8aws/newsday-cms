# Guía para crear plugins de Newsday

Los plugins amplían el constructor visual de páginas con nuevos tipos de componentes.
Cada plugin es un directorio con dos archivos que puedes distribuir como un `.zip`.

---

## Estructura de un plugin

```
mi-plugin/
├── plugin.json    ← Manifiesto (metadatos)
└── mi-plugin.js   ← Lógica del componente
```

> El nombre del directorio, el campo `id` del manifiesto y el nombre del archivo `.js`
> **deben coincidir** (ej: `galeria/`, `"id":"galeria"`, `galeria.js`).

---

## 1. plugin.json — Manifiesto

```json
{
  "id": "mi-plugin",
  "name": "Mi Plugin",
  "version": "1.0.0",
  "description": "Descripción breve de lo que hace.",
  "author": "Tu nombre",
  "type": "component",
  "components": [
    {
      "type": "mi-componente",
      "ic": "🧩",
      "lb": "Mi componente",
      "hint": "Descripción breve para la paleta del constructor"
    }
  ]
}
```

| Campo | Descripción |
|---|---|
| `id` | Identificador único, solo minúsculas, guiones y números |
| `name` | Nombre legible que aparece en el gestor de plugins |
| `version` | Semver (ej: `1.0.0`) |
| `type` | Siempre `"component"` por ahora |
| `components[].type` | Identificador interno del componente (único en el sistema) |
| `components[].ic` | Emoji o texto corto para el icono en la paleta |
| `components[].lb` | Etiqueta visible en la paleta del constructor |
| `components[].hint` | Tooltip descriptivo |

Un plugin puede registrar **varios componentes** en el mismo archivo.

---

## 2. mi-plugin.js — Lógica del componente

```javascript
ND.registerPlugin({
  id: 'mi-plugin',       // debe coincidir con plugin.json
  name: 'Mi Plugin',
  version: '1.0.0',

  components: [{
    type: 'mi-componente',    // tipo único, sin espacios
    ic: '🧩',
    lb: 'Mi componente',
    hint: 'Descripción breve',

    // ── Datos por defecto ──────────────────────────────────────
    defaultData() {
      return {
        titulo:      'Hola mundo',
        color:       '#5068e8',
        mostrarExtra: false,
      };
    },

    // ── Panel de edición (HTML string) ─────────────────────────
    renderFields(d, si, ci) {
      // d   = datos actuales del componente
      // si  = índice de la sección
      // ci  = índice del componente dentro de la sección
      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Título</span>
          <input class="sinp" style="flex:1"
                 value="${_ndEH(d.titulo || '')}"
                 oninput="pbSetCmpField(${si},${ci},'titulo',this.value)">
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Color</span>
          <input type="color" class="pb-color-inp" value="${d.color || '#5068e8'}"
                 oninput="pbSetCmpField(${si},${ci},'color',this.value)">
          <label style="font-size:12px;display:flex;align-items:center;gap:5px;margin-left:10px;cursor:pointer">
            <input type="checkbox" ${d.mostrarExtra ? 'checked' : ''}
                   onchange="pbSetCmpField(${si},${ci},'mostrarExtra',this.checked)">
            Mostrar extra
          </label>
        </div>`;
    },

    // ── HTML que se genera en la página ───────────────────────
    renderHTML(d) {
      const extra = d.mostrarExtra
        ? `<p class="mc-extra">Contenido adicional</p>` : '';
      return `
        <div class="mi-componente" style="--mc-color:${d.color || '#5068e8'}">
          <h2 class="mc-titulo">${_ndEH(d.titulo || '')}</h2>
          ${extra}
        </div>`;
    },

    // ── CSS del componente (se inyecta automáticamente) ────────
    css: `
.mi-componente { padding: 24px; border-left: 4px solid var(--mc-color); }
.mc-titulo { font-size: 1.5rem; font-weight: 800; color: var(--mc-color); }
.mc-extra  { font-size: 0.9rem; opacity: 0.7; margin-top: 8px; }
`
  }]
});

// ── Helpers (define _ndEH en cada archivo de plugin) ──────────
function _ndEH(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
```

---

## 3. API: `pbSetCmpField`

Usa siempre `pbSetCmpField(si, ci, 'campo', valor)` en los eventos `oninput`/`onchange`
de los controles del panel de edición. Esto actualiza el estado, marca la página como
modificada y dispara la vista previa en tiempo real.

```javascript
// Texto
oninput="pbSetCmpField(${si},${ci},'titulo',this.value)"

// Número
oninput="pbSetCmpField(${si},${ci},'cantidad',+this.value)"

// Boolean (checkbox)
onchange="pbSetCmpField(${si},${ci},'activo',this.checked)"

// Select
onchange="pbSetCmpField(${si},${ci},'estilo',this.value)"
```

---

## 4. Controles del panel de edición

Usa las clases de Newsday para mantener coherencia visual:

| Clase | Uso |
|---|---|
| `pb-field-row` | Fila de campo (flex row, gap 8px) |
| `pb-field-lbl` | Etiqueta del campo |
| `sinp` | Input de texto estándar |
| `pb-mini-sel` | Select compacto |
| `pb-color-inp` | Input `type="color"` |
| `pb-textarea` | Textarea estándar |
| `btn btn-ghost btn-sm` | Botón secundario pequeño |
| `btn btn-red btn-sm` | Botón de eliminar |
| `pb-card-list` / `pb-card-item` | Lista de subitems (tarjetas, slides, etc.) |

---

## 5. Plugins con múltiples ítems (listas dinámicas)

Para componentes con ítems añadibles (testimonios, galerías, etc.), guarda los ítems
como un array en los datos y usa funciones auxiliares globales:

```javascript
defaultData() {
  return { items: [{ texto: 'Item 1' }] };
},

renderFields(d, si, ci) {
  const items = (d.items || []).map((item, ki) => `
    <div class="pb-card-item">
      <input class="sinp" value="${_ndEH(item.texto || '')}"
             oninput="_ndMiPluginSetItem(${si},${ci},${ki},'texto',this.value)">
      <button class="btn btn-red btn-sm"
              onclick="_ndMiPluginRemoveItem(${si},${ci},${ki})">✕</button>
    </div>`).join('');

  return `
    <div class="pb-card-list">${items}</div>
    <button class="btn btn-ghost btn-sm" style="margin-top:6px"
            onclick="_ndMiPluginAddItem(${si},${ci})">＋ Añadir</button>`;
},
```

```javascript
// Funciones auxiliares fuera del objeto del plugin:
function _ndMiPluginSetItem(si, ci, ki, f, v) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.items = c.data.items || [];
  if (!c.data.items[ki]) c.data.items[ki] = {};
  c.data.items[ki][f] = v;
  PB.dirty = true;
  pbSchedulePreview();
}

function _ndMiPluginAddItem(si, ci) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.items = c.data.items || [];
  c.data.items.push({ texto: 'Nuevo item' });
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}

function _ndMiPluginRemoveItem(si, ci, ki) {
  const c = PB.sections[si]?.components?.[ci];
  if (!c) return;
  c.data.items.splice(ki, 1);
  PB.dirty = true;
  _pbRefreshCmp(si, ci);
}
```

---

## 6. Plugins dinámicos: acceso a datos del CMS

Los plugins se ejecutan en el panel de administración donde `window.S` está disponible.
Puedes acceder a los datos del sitio para renderizar contenido real en la vista previa:

```javascript
// Posts publicados
const posts = (window.S?.posts || []).filter(p => p.status === 'published');

// URL base del sitio
const baseUrl = (document.getElementById('cfg-baseurl')?.value || '').replace(/\/$/, '');

// Medios subidos
const media = window.S?.media || [];

// Config del sitio
const siteName = document.getElementById('cfg-sitename')?.value || '';
```

### Estructura de un post

```javascript
{
  id:        "post_1234",
  title:     "Título del artículo",
  slug:      "titulo-del-articulo",
  date:      "2025-06-01",
  author:    "admin",
  status:    "published" | "draft",
  tags:      "diseño, web, tecnología",  // string CSV
  access:    "public" | "members" | "subscriber" | "premium",
  updatedAt: "2025-06-01T12:00:00+00:00"
}
```

> Las URLs de los posts en el sitio generado son `{baseUrl}/{slug}/`.
> Las URLs de categorías/etiquetas son `{baseUrl}/tag/{slug}/`.

---

## 7. CSS: buenas prácticas

- **Prefija todas tus clases** con el ID de tu plugin para evitar colisiones:
  `nd-mi-plugin-*` o `mp-*` (prefijo corto del plugin).
- Usa **CSS custom properties** para colores configurables:
  ```css
  .mi-componente { color: var(--mc-accent, #5068e8); }
  ```
  Y pásalo desde `renderHTML`:
  ```javascript
  return `<div class="mi-componente" style="--mc-accent:${d.color}">`;
  ```
- El CSS se inyecta automáticamente en:
  - La **vista previa** del constructor (via `ND.getPluginCSS()`)
  - El **HTML guardado** al salvar una página (`content.html`)
  - Las **páginas del sitio estático** generadas

---

## 8. Empaquetar y distribuir

Para instalar un plugin en Newsday, comprime el directorio como `.zip`.
El ZIP puede tener los archivos en la raíz o en una subcarpeta:

```
# Formato 1: raíz directa
mi-plugin.zip
├── plugin.json
└── mi-plugin.js

# Formato 2: dentro de una carpeta
mi-plugin.zip
└── mi-plugin/
    ├── plugin.json
    └── mi-plugin.js
```

Luego ve a **Ajustes → Plugins**, arrastra el `.zip` y haz clic en **Instalar**.

---

## 9. Ejemplo completo: componente de aviso/alerta

```javascript
ND.registerPlugin({
  id: 'alerta',
  name: 'Alerta',
  version: '1.0.0',
  components: [{
    type: 'alerta',
    ic: '⚠',
    lb: 'Alerta',
    hint: 'Cuadro de aviso, información o advertencia',

    defaultData() {
      return { tipo: 'info', titulo: 'Información', texto: 'Mensaje del aviso.', icono: 'ℹ' };
    },

    renderFields(d, si, ci) {
      const tipos = [['info','Información'],['success','Éxito'],['warning','Aviso'],['danger','Error']];
      return `
        <div class="pb-field-row">
          <span class="pb-field-lbl">Tipo</span>
          <select class="pb-mini-sel" onchange="pbSetCmpField(${si},${ci},'tipo',this.value)">
            ${tipos.map(([v,l]) =>
              `<option value="${v}" ${d.tipo===v?'selected':''}>${l}</option>`).join('')}
          </select>
          <span class="pb-field-lbl" style="margin-left:8px">Icono</span>
          <input class="sinp" style="width:50px;text-align:center"
                 value="${_ndEH(d.icono||'')}" oninput="pbSetCmpField(${si},${ci},'icono',this.value)">
        </div>
        <div class="pb-field-row">
          <span class="pb-field-lbl">Título</span>
          <input class="sinp" style="flex:1" value="${_ndEH(d.titulo||'')}"
                 oninput="pbSetCmpField(${si},${ci},'titulo',this.value)">
        </div>
        <div class="pb-field-row" style="align-items:flex-start">
          <span class="pb-field-lbl" style="padding-top:6px">Texto</span>
          <textarea class="pb-textarea" style="flex:1" rows="3"
                    oninput="pbSetCmpField(${si},${ci},'texto',this.value)"
          >${_ndEH(d.texto||'')}</textarea>
        </div>`;
    },

    renderHTML(d) {
      return `
        <div class="nd-alerta nd-alerta--${_ndEH(d.tipo||'info')}">
          ${d.icono ? `<span class="nd-alerta-ico">${_ndEH(d.icono)}</span>` : ''}
          <div>
            ${d.titulo ? `<strong class="nd-alerta-tit">${_ndEH(d.titulo)}</strong>` : ''}
            ${d.texto  ? `<p class="nd-alerta-txt">${_ndEH(d.texto)}</p>` : ''}
          </div>
        </div>`;
    },

    css: `
.nd-alerta{display:flex;gap:14px;padding:18px 20px;border-radius:10px;align-items:flex-start;
           border-left:4px solid currentColor}
.nd-alerta--info   {background:#eff6ff;color:#1d4ed8;border-color:#93c5fd}
.nd-alerta--success{background:#f0fdf4;color:#166534;border-color:#86efac}
.nd-alerta--warning{background:#fffbeb;color:#92400e;border-color:#fcd34d}
.nd-alerta--danger {background:#fef2f2;color:#991b1b;border-color:#fca5a5}
.nd-alerta-ico{font-size:1.4rem;flex-shrink:0;margin-top:1px}
.nd-alerta-tit{display:block;font-size:.95rem;margin-bottom:4px}
.nd-alerta-txt{font-size:.88rem;opacity:.85;margin:0;line-height:1.5}
`
  }]
});

function _ndEH(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
```

---

## 10. Referencia rápida

| Función del sistema | Cuándo usarla |
|---|---|
| `pbSetCmpField(si,ci,campo,val)` | Actualizar un campo de los datos del componente |
| `_pbRefreshCmp(si,ci)` | Redibujar el panel de edición de un componente |
| `pbSchedulePreview()` | Forzar actualización de la vista previa (debounced 350ms) |
| `PB.sections[si].components[ci]` | Acceso directo al estado del componente |
| `ND.registerPlugin(def)` | Registrar el plugin en el sistema |

| Variable global | Contenido |
|---|---|
| `window.S.posts` | Array de posts (todos, incluyendo borradores) |
| `window.S.pages` | Array de páginas estáticas |
| `window.S.media` | Array de archivos multimedia |
| `window.S.siteConfig` | Configuración del sitio (nav, temas, estructura) |
| `window.PB` | Estado del constructor de páginas activo |
