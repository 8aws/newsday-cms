// ════════════════════════════════════════════════════════════════
//  offline-store.js — Modo offline con localStorage + sincronización
//
//  Flujo:
//    1. Usuario entra en modo offline → OLS.loadAll() rellena S.*
//       desde localStorage (posts, siteConfig, layouts, settings).
//    2. Cualquier guardado offline llama al método OLS.save*()
//       correspondiente: persiste en LS y marca la clave dirty.
//    3. El monitor de ping comprueba el servidor cada 30 s.
//    4. Cuando el servidor vuelve (o el usuario pulsa "Sincronizar")
//       OLS.syncToServer() sube todo lo dirty y activa modo online.
// ════════════════════════════════════════════════════════════════

// ── Helpers de localStorage ────────────────────────────────────
const LS_KEYS = {
  posts:      'nd_posts',
  pages:      'nd_pages',
  config:     'nd_config',      // ajustes (siteName, baseUrl, username)
  siteConfig: 'nd_siteconfig',  // nav, headerBlocks, footerBlocks, etc.
  layouts:    'nd_layouts',
  dirty:      'nd_dirty',       // Set serializado
};

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(LS_KEYS[key] ?? key)); }
  catch { return null; }
}

function lsSet(key, value) {
  try { localStorage.setItem(LS_KEYS[key] ?? key, JSON.stringify(value)); }
  catch(e) { console.warn('[LS] write failed:', e); }
}

function lsDirty()         { return new Set(lsGet('dirty') || []); }
function lsMarkDirty(key)  { const d = lsDirty(); d.add(key);    lsSet('dirty', [...d]); }
function lsClearDirty(key) { const d = lsDirty(); d.delete(key); lsSet('dirty', [...d]); }

// ════════════════════════════════════════════════════════════════
//  OLS — objeto principal del almacén offline
// ════════════════════════════════════════════════════════════════
const OLS = {

  // ── Cargar TODO desde LS → estado S ─────────────────────────
  loadAll() {
    // Posts
    const posts = lsGet('posts');
    if (posts) {
      S.posts = posts;
      if (typeof renderPostList  === 'function') renderPostList();
      if (typeof updateDashStats === 'function') updateDashStats();
    }

    // Páginas estáticas
    const pages = lsGet('pages');
    if (pages) S.pages = pages;

    // Configuración del sitio (nav, HF, sectionTemplates…)
    const sc = lsGet('siteConfig');
    if (sc) {
      S.siteConfig = {
        nav:              sc.nav              || [],
        adZones:          sc.adZones          || [],
        headerBlocks:     sc.headerBlocks     || [],
        footerBlocks:     sc.footerBlocks     || [],
        theme:            sc.theme            || 'newsday',
        contentLangs:     sc.contentLangs     || ['es'],
        siteStructure:    sc.siteStructure    || {homepage:'posts',homepageRef:'',activePortada:''},
        sectionTemplates: sc.sectionTemplates || {posts:'',single:'',page:''},
        blockAssignments: sc.blockAssignments || {},
      };
      if (typeof renderHFCanvas        === 'function') { renderHFCanvas('header'); renderHFCanvas('footer'); }
      if (typeof renderGlobalHFPreview === 'function') renderGlobalHFPreview();
      if (typeof renderOrganizar       === 'function') renderOrganizar();
      if (typeof renderThemePicker     === 'function') renderThemePicker();
    }

    // Layouts / plantillas
    const layouts = lsGet('layouts');
    if (layouts) S.layouts = layouts;

    // Ajustes básicos (siteName, baseUrl, username)
    const cfg = lsGet('config');
    if (cfg) {
      const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.value = v; };
      setVal('cfg-sitename', cfg.siteName);
      setVal('cfg-baseurl',  cfg.baseUrl);
      setVal('cfg-user',     cfg.username);
    }

    // Token placeholder cuando no hay token real
    const tok = document.getElementById('cfg-token');
    if (tok && tok.textContent === 'cargando…') tok.textContent = '(sin token — modo offline)';
  },

  // ── Snapshot completo S → localStorage ───────────────────────
  snapshot() {
    lsSet('posts',      S.posts);
    lsSet('pages',      S.pages);
    lsSet('siteConfig', S.siteConfig);
    lsSet('layouts',    S.layouts);
  },

  // ── Guardar post ─────────────────────────────────────────────
  savePost(post) {
    const arr = lsGet('posts') || [];
    if (!post.id) post.id = 'local_' + Date.now();
    const idx = arr.findIndex(p => p.id === post.id);
    if (idx >= 0) arr[idx] = {...arr[idx], ...post};
    else arr.unshift(post);
    S.posts = arr;
    lsSet('posts', arr);
    lsMarkDirty('posts');
    if (typeof renderPostList  === 'function') renderPostList();
    if (typeof updateDashStats === 'function') updateDashStats();
    renderSyncBadge();
    toast('💾 Post guardado localmente');
  },

  // ── Eliminar post offline ─────────────────────────────────────
  deletePost(id) {
    S.posts = (lsGet('posts') || []).filter(p => p.id !== id);
    lsSet('posts', S.posts);
    lsMarkDirty('posts');
    renderSyncBadge();
  },

  // ── Guardar configuración del sitio ──────────────────────────
  saveSiteConfig() {
    lsSet('siteConfig', S.siteConfig);
    lsMarkDirty('siteConfig');
    renderSyncBadge();
    return true; // mismo contrato que la versión online
  },

  // ── Guardar layout ────────────────────────────────────────────
  saveLayout(data) {
    const arr = lsGet('layouts') || S.layouts || [];
    const id  = data.id || ('local_' + Date.now());
    const entry = {...data, id};
    const idx = arr.findIndex(l => l.id === id);
    if (idx >= 0) arr[idx] = entry;
    else arr.unshift(entry);
    S.layouts = arr;
    lsSet('layouts', arr);
    lsMarkDirty('layouts');
    renderSyncBadge();
    return {ok: true, id};
  },

  // ── Eliminar layout offline ───────────────────────────────────
  deleteLayout(id) {
    S.layouts = (lsGet('layouts') || []).filter(l => l.id !== id);
    lsSet('layouts', S.layouts);
    lsMarkDirty('layouts');
    renderSyncBadge();
    return {ok: true};
  },

  // ── Guardar ajustes (Ajustes tab) ────────────────────────────
  saveSettings({siteName, baseUrl, username}) {
    const prev = lsGet('config') || {};
    lsSet('config', {...prev, siteName, baseUrl, username});
    lsMarkDirty('config');
    renderSyncBadge();
    toast('💾 Ajustes guardados localmente');
    return true;
  },

  // ── Sincronizar con el servidor ───────────────────────────────
  async syncToServer() {
    const dirty = lsDirty();
    if (!dirty.size) { toast('Sin cambios pendientes'); return; }

    // 1. Verificar que el servidor responde
    try {
      const ping = await fetch('newsday-api.php?action=ping', {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      if (!ping.ok) throw new Error('bad status');
    } catch {
      toast('⚠ Servidor no disponible — inténtalo más tarde');
      return;
    }

    toast('⬆ Sincronizando con el servidor…');
    let errors = 0;

    // 2. Posts
    if (dirty.has('posts')) {
      for (const p of (lsGet('posts') || [])) {
        try {
          const payload = {...p};
          const isLocal = typeof payload.id === 'string' && payload.id.startsWith('local_');
          if (isLocal) delete payload.id; // el servidor asignará ID real
          const r = await api.post('save', payload);
          if (r?.ok && r.id) {
            // Actualizar el id local → real
            const idx = S.posts.findIndex(x => x.id === p.id);
            if (idx >= 0) S.posts[idx].id = r.id;
          } else if (!r?.ok) errors++;
        } catch { errors++; }
      }
      lsSet('posts', S.posts);
      if (!errors) lsClearDirty('posts');
    }

    // 3. Configuración del sitio
    if (dirty.has('siteConfig')) {
      try {
        const r = await api.post('save-site-config', S.siteConfig);
        if (r?.ok) lsClearDirty('siteConfig');
        else errors++;
      } catch { errors++; }
    }

    // 4. Layouts
    if (dirty.has('layouts')) {
      for (const l of (lsGet('layouts') || [])) {
        try {
          const payload = {...l};
          const isLocal = typeof payload.id === 'string' && payload.id.startsWith('local_');
          if (isLocal) delete payload.id;
          const r = await api.post('save-layout', payload);
          if (r?.ok && r.id) {
            const idx = S.layouts.findIndex(x => x.id === l.id);
            if (idx >= 0) S.layouts[idx].id = r.id;
          } else if (!r?.ok) errors++;
        } catch { errors++; }
      }
      lsSet('layouts', S.layouts);
      if (!errors) lsClearDirty('layouts');
    }

    // 5. Ajustes básicos (sin contraseña — eso requiere login)
    if (dirty.has('config')) {
      try {
        const cfg = lsGet('config') || {};
        const r = await api.post('save-config', {
          siteName: cfg.siteName || '',
          baseUrl:  cfg.baseUrl  || '',
          user:     cfg.username || '',
        });
        if (r?.ok) lsClearDirty('config');
        else errors++;
      } catch { errors++; }
    }

    // 6. Resultado
    if (errors === 0) {
      S.offline = false;
      stopPingMonitor();
      const badge = document.getElementById('conn-badge');
      if (badge) { badge.textContent = '● Online'; badge.className = 'conn-on'; }
      toast('✓ Sincronización completada — modo online');
      // Refrescar desde servidor
      await Promise.all([
        typeof loadPostsFromBackend === 'function' ? loadPostsFromBackend() : Promise.resolve(),
        typeof loadSiteConfig       === 'function' ? loadSiteConfig()       : Promise.resolve(),
        typeof loadLayouts          === 'function' ? loadLayouts()          : Promise.resolve(),
      ]);
    } else {
      toast(`⚠ Sincronización con ${errors} error${errors > 1 ? 'es' : ''} — revisa la consola`);
      renderSyncBadge();
    }
  },
};

// ── Badge de estado + botón sync ──────────────────────────────
function renderSyncBadge() {
  const badge = document.getElementById('conn-badge');
  if (!badge || !S.offline) return;
  const n = lsDirty().size;
  if (n > 0) {
    badge.className = 'conn-off conn-dirty';
    badge.innerHTML = `● Offline&thinsp;<span class="conn-sync-btn" onclick="OLS.syncToServer()" title="Subir cambios al servidor">↑ Sincronizar</span>`;
  } else {
    badge.className = 'conn-off';
    badge.textContent = '● Offline';
  }
}

// ── Monitor de reconexión (ping cada 30 s) ───────────────────
let _pingTimer = null;

function startPingMonitor() {
  if (_pingTimer) return;
  _pingTimer = setInterval(async () => {
    if (!S.offline) { stopPingMonitor(); return; }
    if (!lsDirty().size) return; // nada pendiente, no molestamos
    try {
      const r = await fetch('newsday-api.php?action=ping', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (r.ok) {
        const badge = document.getElementById('conn-badge');
        if (badge) {
          badge.className = 'conn-off conn-dirty';
          badge.innerHTML = `● Servidor disponible&thinsp;<span class="conn-sync-btn" onclick="OLS.syncToServer()">↑ Sincronizar ahora</span>`;
        }
        toast('🌐 Servidor disponible — pulsa "Sincronizar" para subir los cambios pendientes');
      }
    } catch { /* sigue offline */ }
  }, 30_000);
}

function stopPingMonitor() {
  if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null; }
}
