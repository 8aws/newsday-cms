// ════════════════════════════════════════════════════════════════
//  nd-registry.js — Motor de plugins para Newsday
//
//  Expone el namespace global window.ND con:
//    ND.registerPlugin(def)       — registra un plugin y sus componentes
//    ND.setBuiltins(types)        — registra los tipos built-in del constructor
//    ND.getComponentTypes()       — devuelve tipos built-in + plugins (para paleta)
//    ND.renderFields(type,d,si,ci)— campos del editor (null = usar built-in)
//    ND.renderHTML(type, d)       — HTML generado (null = usar built-in)
//    ND.defaultData(type)         — datos por defecto (null = usar built-in)
//    ND.getPluginCSS()            — CSS de todos los plugins activos
//    ND.isReady()                 — true cuando los plugins JS están cargados
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  /* ── Almacén interno ─────────────────────────────────────────── */
  let _builtins   = [];   // [{t, ic, lb, hint}] — definidos por pagebuilder.js
  let _plugins    = {};   // id → plugin def completo
  let _components = {};   // type → component def (solo de plugins)
  let _loadedCount= 0;
  let _expectedCount = 0;
  const _readyCbs = [];

  /* ── Helpers ─────────────────────────────────────────────────── */
  function _rebuildComponents() {
    _components = {};
    Object.values(_plugins).forEach(plugin => {
      (plugin.components || []).forEach(comp => {
        _components[comp.type] = comp;
      });
    });
  }

  /* ── API pública ─────────────────────────────────────────────── */
  const ND = {

    // Llamado por pagebuilder.js con el array de tipos built-in
    setBuiltins(types) {
      _builtins = types || [];
    },

    // Llamado por cada plugin.js al cargarse
    registerPlugin(def) {
      if (!def || !def.id) { console.warn('ND.registerPlugin: def.id es obligatorio'); return; }
      _plugins[def.id] = def;
      _rebuildComponents();
      _loadedCount++;
      if (_loadedCount >= _expectedCount) {
        _readyCbs.forEach(fn => fn());
      }
      // Notificar al constructor si ya está activo
      if (typeof renderBuilder === 'function') {
        try { renderBuilder(); } catch(e) {}
      }
    },

    // Establecer cuántos plugins JS se esperan cargar
    setExpected(n) {
      _expectedCount = n;
      if (n === 0) _readyCbs.forEach(fn => fn());
    },

    // Callback cuando todos los plugins estén registrados
    onReady(fn) {
      if (_loadedCount >= _expectedCount) { fn(); }
      else { _readyCbs.push(fn); }
    },

    isReady() {
      return _loadedCount >= _expectedCount;
    },

    // Tipos para la paleta del constructor (built-ins + plugins)
    getComponentTypes() {
      const types = [..._builtins];
      Object.values(_plugins).forEach(plugin => {
        (plugin.components || []).forEach(comp => {
          if (!types.find(t => t.t === comp.type)) {
            types.push({ t: comp.type, ic: comp.ic || '🧩', lb: comp.lb || comp.type, hint: comp.hint || '' });
          }
        });
      });
      return types;
    },

    // Renderizar campos del editor de un componente plugin
    // Devuelve null si el tipo es built-in (pagebuilder.js usará su switch)
    renderFields(type, d, si, ci) {
      const comp = _components[type];
      if (!comp || typeof comp.renderFields !== 'function') return null;
      return comp.renderFields(d, si, ci);
    },

    // Renderizar HTML generado de un componente plugin
    // Devuelve null si el tipo es built-in
    renderHTML(type, d) {
      const comp = _components[type];
      if (!comp || typeof comp.renderHTML !== 'function') return null;
      return comp.renderHTML(d);
    },

    // Datos por defecto para un nuevo componente plugin
    // Devuelve null si el tipo es built-in
    defaultData(type) {
      const comp = _components[type];
      if (!comp || typeof comp.defaultData !== 'function') return null;
      return comp.defaultData();
    },

    // CSS acumulado de todos los plugins con componentes activos
    getPluginCSS() {
      const parts = [];
      Object.values(_plugins).forEach(plugin => {
        (plugin.components || []).forEach(comp => {
          if (comp.css) parts.push(`/* plugin:${plugin.id}:${comp.type} */\n${comp.css}`);
        });
      });
      return parts.join('\n');
    },

    // Acceso de lectura (para plugins.js UI)
    getPlugins()    { return Object.values(_plugins); },
    getPlugin(id)   { return _plugins[id] || null; },
  };

  window.ND = ND;

})();
