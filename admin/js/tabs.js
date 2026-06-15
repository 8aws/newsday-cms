// ════════════════════════════════════════════════════════════════
//  tabs.js — Navegación de pestañas, dashboard y arranque
// ════════════════════════════════════════════════════════════════

// ── Cambio de pestaña ─────────────────────────────────────────
function switchTab(tab, btn) {
  // Ocultar todos los paneles
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tnav-btn').forEach(b => b.classList.remove('active'));

  // Activar el panel pedido
  const panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('active');

  // Activar el botón del topbar (puede venir de onclick o ser llamado programáticamente)
  if (btn) {
    btn.classList.add('active');
  } else {
    const found = document.querySelector(`.tnav-btn[data-tab="${tab}"]`);
    if (found) found.classList.add('active');
  }

  // Panel Maquetar: mostrar/ocultar props y renderizar grid
  const props = document.getElementById('props');
  if (tab === 'maquetar') {
    // Activar la tarjeta de tipo de página correcta
    setMaqPageType(S.maqPageType || 'portada');
    renderGrid();
    renderPalette();
    initGridEvents();
  } else {
    if (props) props.classList.remove('vis');
    S.selBlock = null;
  }

  // Panel Dashboard: refrescar stats
  if (tab === 'dashboard') refreshDashboard();

  // Panel Publicar: cargar preview si el sitio existe y el iframe no está cargado
  if (tab === 'publicar') {
    const iframe = document.getElementById('preview-iframe');
    if (iframe && !iframe.getAttribute('src')) {
      if (typeof checkSiteExists === 'function') checkSiteExists();
    }
  }

  // Panel Medios: renderizar
  if (tab === 'medios') { renderMediosGrid(); }

  // Panel Usuarios: cargar datos
  if (tab === 'usuarios') { if (typeof loadUsers === 'function') loadUsers(); }

  // Panel Ajustes: cargar plugins
  if (tab === 'ajustes') { if (typeof loadPlugins === 'function') loadPlugins(); }

  // Panel Organizar: subtab activo
  if (tab === 'organizar') {
    const active = document.querySelector('.org-tab.on');
    if (!active) switchOrgTab('paginas', document.querySelector('.org-tab'));
  }

  // Botón guardar: siempre visible, etiqueta según contexto
  const saveBtn = document.getElementById('topbar-save-btn');
  if (saveBtn) {
    const lbl = {
      escribir:  '💾 Guardar post',
      maquetar:  '💾 Guardar',
      organizar: '💾 Guardar',
      modelar:   '💾 Guardar',
      ajustes:   '💾 Guardar',
    };
    const noSave = ['dashboard','medios','publicar'];
    if (noSave.includes(tab)) {
      saveBtn.style.display = 'none';
    } else {
      saveBtn.style.display = '';
      saveBtn.textContent = lbl[tab] || '💾 Guardar';
      saveBtn.title = 'Guardar (Ctrl+S)';
    }
  }

  S.activeTab = tab;
}

// ── Dashboard ──────────────────────────────────────────────────
function refreshDashboard() {
  updateDashStats();
  renderDashPostsList();
}

function updateDashStats() {
  const total  = S.posts.length;
  const pub    = S.posts.filter(p => p.status === 'published').length;
  const draft  = S.posts.filter(p => p.status !== 'published').length;
  const pages  = S.pages.length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total', total);
  set('stat-pub',   pub);
  set('stat-draft', draft);
  set('stat-pages', pages);

  const sub = document.getElementById('dash-sub');
  if (sub) sub.textContent = total
    ? `${total} post${total!==1?'s':''}, ${pub} publicado${pub!==1?'s':''}`
    : 'Aún no hay publicaciones. ¡Empieza a escribir!';
}

function renderDashPostsList() {
  const el = document.getElementById('dash-posts-list');
  if (!el) return;
  const recent = [...S.posts]
    .sort((a,b) => (b.date||'').localeCompare(a.date||''))
    .slice(0, 6);

  if (!recent.length) {
    el.innerHTML = '<div class="empty-hint">No hay posts todavía</div>';
    return;
  }
  el.innerHTML = recent.map(p => `
    <div class="dash-post-row" onclick="openPostFromList('${escH(String(p.id))}')">
      <span class="dpr-title">${escH(p.title||'Sin título')}</span>
      <span class="status-pill ${p.status==='published'?'pill-pub':'pill-bor'}">${p.status==='published'?'Publicado':'Borrador'}</span>
      <span class="dpr-date">${p.date||''}</span>
    </div>
  `).join('');
}

// ── Guardar según contexto activo ─────────────────────────────
function saveCurrentContext() {
  switch(S.activeTab) {
    case 'escribir':
    case 'maquetar':  savePost(); break;
    case 'organizar': saveOrganizar(); break;
    case 'modelar':   saveModelar(); break;
    case 'ajustes':   saveSettings(); break;
    default: toast('Nada que guardar en esta sección');
  }
}

// ── Atajos de teclado ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Ctrl+S → Guardar (contexto-aware)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentContext();
  }
  // Escape → cerrar modales
  if (e.key === 'Escape') {
    document.querySelectorAll('.mov.vis').forEach(m => m.classList.remove('vis'));
    if (S.selBlock !== null) {
      S.selBlock = null;
      if (typeof renderOverlay === 'function') renderOverlay();
      const props = document.getElementById('props');
      if (props) props.classList.remove('vis');
    }
  }
});

// ── Inicialización al cargar la página ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Establecer fecha por defecto en el editor
  const dateInput = document.getElementById('meta-date');
  if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0,10);

  // Comprobar autenticación
  checkAuth();
});
