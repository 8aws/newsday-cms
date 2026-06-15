// ════════════════════════════════════════════════════════════════
//  dashboard.js — Stats del sitio y modo mantenimiento
// ════════════════════════════════════════════════════════════════

// ── Formatear bytes ───────────────────────────────────────────
function fmtBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
}

// ── Cargar estadísticas del dashboard ────────────────────────
async function loadDashStats() {
  if (S.offline) return;
  try {
    const r = await api.call('stats');
    if (!r) return;
    if (r.recentPosts) renderDashRecentPosts(r.recentPosts);
    if (r.pages)       renderDashPages(r.pages);
    if (r.tags)        renderDashTagCloud(r.tags);
    if (r.disk)        renderDashDisk(r.disk);
    // Rellenar selector de páginas del widget de mantenimiento
    if (r.pages)       populateMaintPageSel(r.pages);
  } catch(e) {
    console.warn('loadDashStats:', e);
  }
}

// ── Publicaciones recientes ───────────────────────────────────
function renderDashRecentPosts(posts) {
  const el = document.getElementById('dash-posts-list');
  if (!el) return;
  if (!posts.length) {
    el.innerHTML = '<div class="empty-hint" style="font-size:12px;color:#94a3b8">Sin publicaciones aún</div>';
    return;
  }
  el.innerHTML = posts.map(p => {
    const pill  = p.status === 'published'
      ? '<span class="status-pill pill-pub">Pub</span>'
      : '<span class="status-pill pill-bor">Bor</span>';
    return `<div class="dash-post-row" onclick="loadPost('${escH(p.id)}');switchTab('escribir')">
      ${pill}
      <span class="dpr-title">${escH(p.title || 'Sin título')}</span>
      <span class="dpr-date">${escH(p.date || '')}</span>
    </div>`;
  }).join('');
}

// ── Páginas del sitio ─────────────────────────────────────────
function renderDashPages(pages) {
  const el = document.getElementById('dash-pages-list');
  if (!el) return;
  if (!pages.length) {
    el.innerHTML = '<div style="font-size:12px;color:#94a3b8">Sin páginas creadas</div>';
    return;
  }
  el.innerHTML = pages.map(p =>
    `<div class="pages-widget-row">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escH(p.title || 'Sin título')}</span>
      <span class="pg-slug">/${escH(p.slug || '')}/</span>
    </div>`
  ).join('');
}

// ── Nube de etiquetas ─────────────────────────────────────────
function renderDashTagCloud(tags) {
  const el = document.getElementById('dash-tag-cloud');
  if (!el) return;
  const entries = Object.entries(tags);
  if (!entries.length) {
    el.innerHTML = '<div style="font-size:12px;color:#94a3b8">Sin etiquetas</div>';
    return;
  }
  const maxCount = Math.max(...entries.map(([,c]) => c));
  el.innerHTML = entries.map(([tag, count]) => {
    const ratio = maxCount > 1 ? count / maxCount : 0.5;
    let cls = 'tag-cloud-item';
    if (ratio >= 0.7)      cls += ' tc-lg';
    else if (ratio >= 0.4) cls += ' tc-md';
    return `<span class="${cls}" title="${count} post${count!==1?'s':''}"
      onclick="switchTab('organizar')">${escH(tag)}<sup style="font-size:9px;margin-left:2px">${count}</sup></span>`;
  }).join('');
}

// ── Espacio en disco ──────────────────────────────────────────
function renderDashDisk(disk) {
  const total = (disk.posts || 0) + (disk.media || 0) + (disk.site || 0);

  function setBar(id, valId, bytes) {
    const bar = document.getElementById(id);
    const val = document.getElementById(valId);
    if (bar) bar.style.width = total > 0 ? Math.round((bytes / total) * 100) + '%' : '0%';
    if (val) val.textContent = fmtBytes(bytes);
  }

  setBar('disk-bar-posts', 'disk-val-posts', disk.posts || 0);
  setBar('disk-bar-media', 'disk-val-media', disk.media || 0);
  setBar('disk-bar-site',  'disk-val-site',  disk.site  || 0);
}

// ════════════════════════════════════════════════════════════════
//  MODO MANTENIMIENTO
// ════════════════════════════════════════════════════════════════

// ── Rellenar selector de página personalizada ─────────────────
function populateMaintPageSel(pages) {
  const sel = document.getElementById('maint-page-sel');
  if (!sel) return;
  // Guardar valor actual para restaurarlo
  const current = sel.value;
  // Mantener primera opción fija
  while (sel.options.length > 1) sel.remove(1);
  pages.forEach(p => {
    const opt = document.createElement('option');
    opt.value       = p.slug || '';
    opt.textContent = p.title || p.slug || '(sin título)';
    sel.appendChild(opt);
  });
  sel.value = current;
}

// ── Leer estado actual de mantenimiento ──────────────────────
async function loadMaintenanceState() {
  if (S.offline) return;
  try {
    const r = await api.call('maintenance');
    if (!r) return;
    applyMaintenanceUI(r.active || false, r.page || '');
  } catch(e) {
    console.warn('loadMaintenanceState:', e);
  }
}

// ── Aplicar estado al widget ──────────────────────────────────
function applyMaintenanceUI(active, page) {
  const widget  = document.getElementById('maint-widget');
  const badge   = document.getElementById('maint-badge');
  const chk     = document.getElementById('maint-toggle-chk');
  const sel     = document.getElementById('maint-page-sel');

  if (chk)    chk.checked  = active;
  if (sel && page) sel.value = page;

  if (widget) {
    widget.classList.toggle('maint-on', active);
  }
  if (badge) {
    badge.textContent = active ? '🔴 Activo' : 'Inactivo';
    badge.className   = 'maint-badge ' + (active ? 'maint-badge-on' : 'maint-badge-off');
  }
}

// ── Toggle desde el interruptor ───────────────────────────────
async function toggleMaintenance(active) {
  const page = document.getElementById('maint-page-sel')?.value || '';

  // Feedback inmediato en la UI
  applyMaintenanceUI(active, page);

  if (S.offline) {
    toast(active ? '⚠ Mantenimiento activado (modo offline, no se aplica)' : 'Mantenimiento desactivado');
    return;
  }

  try {
    toast(active ? '⏳ Activando mantenimiento…' : '⏳ Desactivando mantenimiento…');
    const r = await api.post('maintenance', { active, page });
    if (r && r.ok) {
      applyMaintenanceUI(active, page);
      const msg = active
        ? '🔴 Mantenimiento activo — public/index.html actualizado'
        : '✓ Mantenimiento desactivado — sitio restaurado';
      toast(msg);
      // Si acabamos de desactivar, actualizar botones "Ver sitio"
      if (!active) setSiteLinks(true);
    } else {
      toast('Error: ' + (r?.error || 'respuesta inesperada'));
      // Revertir toggle
      applyMaintenanceUI(!active, page);
    }
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
    applyMaintenanceUI(!active, page);
  }
}

// ════════════════════════════════════════════════════════════════
//  BACKUPS EN SERVIDOR
// ════════════════════════════════════════════════════════════════

// ── Cargar lista de backups y config de auto-backup ──────────
async function loadBackups() {
  if (S.offline) return;
  try {
    const r = await api.call('list-backups');
    S.backupFiles = r.files || [];
    S.autoBackupCfg = r.autoBackup || { enabled: false, keepDays: 7 };
    renderBackupList();
    renderAutoBackupToggle();
    // Auto-backup: si está habilitado y no hay backup reciente, crear uno
    if (S.autoBackupCfg.enabled) checkAutoBackup(S.backupFiles);
  } catch(e) {
    console.warn('loadBackups:', e);
  }
}

// ── Verificar si hay que crear backup automático ──────────────
function checkAutoBackup(files) {
  if (!files.length) { createServerBackupAuto(); return; }
  const newest = files[0]; // sorted desc
  const age    = Date.now() - new Date(newest.date).getTime();
  if (age > 86400000) createServerBackupAuto(); // > 24h
}

async function createServerBackupAuto() {
  try {
    await api.post('create-server-backup', {});
    await loadBackups();
  } catch(e) {
    console.warn('auto-backup:', e);
  }
}

// ── Crear backup manualmente ──────────────────────────────────
async function createServerBackup() {
  const btn = document.getElementById('btn-create-backup');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Creando…'; }
  try {
    const r = await api.post('create-server-backup', {});
    if (r && r.ok) {
      toast('✓ Copia creada: ' + (r.name || ''));
      await loadBackups();
    } else {
      toast('Error: ' + (r?.error || ''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '+ Nueva copia'; }
  }
}

// ── Eliminar backup ───────────────────────────────────────────
async function deleteServerBackup(name) {
  if (!confirm(`¿Eliminar "${name}"? No se puede deshacer.`)) return;
  try {
    const r = await api.post('delete-backup', { name });
    if (r && r.ok) {
      toast('Copia eliminada');
      await loadBackups();
    } else {
      toast('Error: ' + (r?.error || ''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
  }
}

// ── Guardar config de auto-backup ────────────────────────────
async function saveAutoBackupConfig() {
  const tog  = document.getElementById('auto-backup-toggle');
  const days = document.getElementById('auto-backup-days');
  const enabled  = tog  ? tog.checked  : false;
  const keepDays = days ? parseInt(days.value) || 7 : 7;
  try {
    const r = await api.post('auto-backup-config', { enabled, keepDays });
    if (r && r.ok) {
      toast(enabled ? '✓ Auto-backup activado' : 'Auto-backup desactivado');
      S.autoBackupCfg = { enabled, keepDays };
    }
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
  }
}

// ── Renderizar toggle de auto-backup ─────────────────────────
function renderAutoBackupToggle() {
  const tog  = document.getElementById('auto-backup-toggle');
  const days = document.getElementById('auto-backup-days');
  if (tog  && S.autoBackupCfg) tog.checked  = !!S.autoBackupCfg.enabled;
  if (days && S.autoBackupCfg) days.value   = S.autoBackupCfg.keepDays || 7;
}

// ── Renderizar lista de backups ───────────────────────────────
function renderBackupList() {
  const el = document.getElementById('backup-list');
  if (!el) return;
  const files = S.backupFiles || [];
  if (!files.length) {
    el.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding:8px 0">Sin copias guardadas en el servidor</div>';
    return;
  }
  el.innerHTML = files.map(f => {
    const safe = escH(f.name || '');
    const dlUrl = `newsday-api.php?action=download-backup&file=${encodeURIComponent(f.name)}`;
    return `<div class="backup-row">
      <div class="backup-info">
        <span class="backup-name">${safe}</span>
        <span class="backup-meta">${escH(f.date||'')} · ${fmtBytes(f.size||0)}</span>
      </div>
      <div class="backup-actions">
        <a class="btn btn-ghost btn-sm" href="${escH(dlUrl)}" download title="Descargar">⬇</a>
        <button class="btn btn-red btn-sm" onclick="deleteServerBackup('${safe}')" title="Eliminar">🗑</button>
      </div>
    </div>`;
  }).join('');
}
