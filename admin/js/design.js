// ════════════════════════════════════════════════════════════════
//  design.js — Funciones compartidas de configuración del sitio
//
//  Módulos separados:
//    organizar.js  → pestaña Organizar (nav, ads, portadas, layouts)
//    modelar.js    → pestaña Modelar  (header/footer, temas, idiomas)
// ════════════════════════════════════════════════════════════════

// ── Cargar configuración del sitio ────────────────────────────
async function loadSiteConfig() {
  if (S.offline) return;
  try {
    const data = await api.call('site-config');
    // Migrar bloques de identidad legados (site-logo/title/desc → header block)
    const rawHdr = data.headerBlocks || [];
    const rawFtr = data.footerBlocks || [];
    S.siteConfig = {
      nav:              data.nav              || [],
      adZones:          data.adZones          || [],
      headerBlocks:     typeof migrateHFBlocks === 'function' ? migrateHFBlocks(rawHdr) : rawHdr,
      footerBlocks:     typeof migrateHFBlocks === 'function' ? migrateHFBlocks(rawFtr) : rawFtr,
      theme:            data.theme            || 'newsday',
      contentLangs:     data.contentLangs     || ['es'],
      siteStructure:    data.siteStructure    || {homepage:'posts', homepageRef:'', activePortada:''},
      sectionTemplates: data.sectionTemplates || {posts:'', single:'', page:''},
      blockAssignments: data.blockAssignments || {},
    };
    renderContentLangPicker();
    renderHFCanvas('header');
    renderHFCanvas('footer');
    renderGlobalHFPreview();
    renderThemePicker();
    renderOrganizar();
  } catch(e) {
    console.warn('loadSiteConfig:', e);
  }
}

// ── Guardar configuración del sitio ───────────────────────────
async function saveSiteConfig() {
  if (S.offline) return OLS.saveSiteConfig();
  try {
    const r = await api.post('save-site-config', { ...S.siteConfig });
    return r && r.ok;
  } catch(e) {
    toast('Error guardando config: ' + (e?.message || ''));
    return false;
  }
}
