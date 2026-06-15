// ════════════════════════════════════════════════════════════════
//  users.js — Gestión de usuarios del panel y lectores web
// ════════════════════════════════════════════════════════════════

// ── Estado ────────────────────────────────────────────────────
const US = {
  panelUsers: [],
  readers:    [],
  readerPage: 1,
  readerSearch: '',
  readerTier: '',
  editingUser:   null,  // usuario del panel en edición
  editingReader: null,  // lector en edición
};

const ROLE_LABELS = {
  admin:       '👑 Admin',
  editor:      '✏️ Editor',
  escritor:    '📝 Escritor',
  maquetador:  '🎨 Maquetador',
  publicista:  '📢 Publicista',
};

const TIER_LABELS = {
  free:       '🆓 Gratis',
  subscriber: '◆ Suscriptor',
  premium:    '★ Premium',
};

const ROLE_DESC = {
  admin:      'Acceso completo: configura, gestiona usuarios, publica.',
  editor:     'Edita todos los posts, páginas y genera el sitio.',
  escritor:   'Crea y edita sus propios posts (borrador).',
  maquetador: 'Accede a Maquetar y Modelar para diseñar plantillas.',
  publicista: 'Solo puede generar y publicar el sitio.',
};

// ── Carga inicial ─────────────────────────────────────────────
async function loadUsers() {
  if (S.offline) { renderPanelUsersOffline(); return; }
  try {
    const [users, readers] = await Promise.all([
      api.call('panel-users'),
      api.call('readers'),
    ]);
    US.panelUsers = Array.isArray(users)   ? users   : [];
    US.readers    = Array.isArray(readers) ? readers : [];
    renderPanelUsers();
    renderReaders();
  } catch(e) {
    console.warn('loadUsers:', e);
    toast('Error cargando usuarios');
  }
}

// ════════════════════════════════════════════════════════════════
//  USUARIOS DEL PANEL
// ════════════════════════════════════════════════════════════════

function renderPanelUsers() {
  const el = document.getElementById('panel-users-list');
  if (!el) return;

  if (!US.panelUsers.length) {
    el.innerHTML = '<div class="usr-empty">No hay usuarios del panel registrados.</div>';
    return;
  }

  const currentUsername = S.currentUser?.username || '';

  el.innerHTML = US.panelUsers.map(u => {
    const isMe    = u.username === currentUsername;
    const roleTag = `<span class="usr-role-badge role-${u.role}">${ROLE_LABELS[u.role] || u.role}</span>`;
    const name    = escH(u.displayName || u.username);
    const user    = escH(u.username);
    const email   = u.email ? `<span class="usr-email">${escH(u.email)}</span>` : '';
    const since   = (u.createdAt || '').slice(0,10);
    const meBadge = isMe ? '<span class="usr-me-badge">Tú</span>' : '';

    return `
      <div class="usr-row" data-id="${escH(u.id)}">
        <div class="usr-avatar">${(u.displayName||u.username||'?')[0].toUpperCase()}</div>
        <div class="usr-info">
          <div class="usr-name">${name} ${meBadge}</div>
          <div class="usr-meta">@${user} ${email} · desde ${since}</div>
        </div>
        <div class="usr-role">${roleTag}</div>
        <div class="usr-actions">
          <button class="usr-btn usr-btn-edit" onclick="openPanelUserModal('${escH(u.id)}')">Editar</button>
          ${!isMe ? `<button class="usr-btn usr-btn-del" onclick="deletePanelUser('${escH(u.id)}','${escH(u.displayName||u.username)}')">Eliminar</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderPanelUsersOffline() {
  const el = document.getElementById('panel-users-list');
  if (el) el.innerHTML = '<div class="usr-empty">Gestión de usuarios no disponible en modo offline.</div>';
}

// ── Modal de usuario del panel ────────────────────────────────
function openPanelUserModal(id) {
  US.editingUser = id ? US.panelUsers.find(u => u.id === id) || null : null;
  const u = US.editingUser;

  document.getElementById('pum-title').textContent = u ? 'Editar usuario' : 'Nuevo usuario';
  document.getElementById('pum-id').value          = u?.id          || '';
  document.getElementById('pum-username').value    = u?.username    || '';
  document.getElementById('pum-displayname').value = u?.displayName || '';
  document.getElementById('pum-email').value       = u?.email       || '';
  document.getElementById('pum-role').value        = u?.role        || 'escritor';
  document.getElementById('pum-pass').value        = '';
  document.getElementById('pum-err').textContent   = '';
  document.getElementById('pum-err').style.display = 'none';

  updateRoleDesc();

  // Deshabilitar username si se edita (evitar confusión)
  document.getElementById('pum-username').readOnly = !!u;

  showModal('panel-user-modal');
}

function updateRoleDesc() {
  const role = document.getElementById('pum-role')?.value || '';
  const desc = document.getElementById('pum-role-desc');
  if (desc) desc.textContent = ROLE_DESC[role] || '';
}

async function savePanelUserForm() {
  const id          = document.getElementById('pum-id').value;
  const username    = document.getElementById('pum-username').value.trim();
  const displayName = document.getElementById('pum-displayname').value.trim();
  const email       = document.getElementById('pum-email').value.trim();
  const role        = document.getElementById('pum-role').value;
  const pass        = document.getElementById('pum-pass').value;
  const errEl       = document.getElementById('pum-err');

  errEl.style.display = 'none';
  if (!username) { errEl.textContent = 'El nombre de usuario es obligatorio'; errEl.style.display = ''; return; }

  try {
    const r = await api.post('save-panel-user', {id, username, displayName, email, role, pass: pass || undefined});
    if (r && r.ok) {
      hideModal('panel-user-modal');
      toast('✓ Usuario guardado');
      await loadUsers();
    } else {
      errEl.textContent = r?.error || 'Error al guardar'; errEl.style.display = '';
    }
  } catch(e) {
    errEl.textContent = e?.message || 'Error'; errEl.style.display = '';
  }
}

async function deletePanelUser(id, name) {
  if (!confirm(`¿Eliminar el usuario "${name}"? Esta acción no se puede deshacer.`)) return;
  try {
    const r = await api.post('delete-panel-user', {id});
    if (r && r.ok) { toast('Usuario eliminado'); await loadUsers(); }
    else toast('Error: ' + (r?.error || ''));
  } catch(e) { toast('Error: ' + (e?.message || '')); }
}

// ════════════════════════════════════════════════════════════════
//  LECTORES WEB
// ════════════════════════════════════════════════════════════════

const READERS_PER_PAGE = 20;

function renderReaders() {
  const el = document.getElementById('readers-list');
  if (!el) return;

  // Filtrar
  let list = US.readers;
  if (US.readerSearch) {
    const q = US.readerSearch.toLowerCase();
    list = list.filter(r =>
      (r.email||'').toLowerCase().includes(q) ||
      (r.displayName||'').toLowerCase().includes(q) ||
      (r.username||'').toLowerCase().includes(q)
    );
  }
  if (US.readerTier) list = list.filter(r => r.tier === US.readerTier);

  // Paginación
  const total = list.length;
  const pages = Math.ceil(total / READERS_PER_PAGE) || 1;
  if (US.readerPage > pages) US.readerPage = 1;
  const slice = list.slice((US.readerPage - 1) * READERS_PER_PAGE, US.readerPage * READERS_PER_PAGE);

  // Stats
  const tierCount = { free: 0, subscriber: 0, premium: 0 };
  US.readers.forEach(r => { if (tierCount[r.tier] !== undefined) tierCount[r.tier]++; });
  const statsEl = document.getElementById('readers-stats');
  if (statsEl) {
    statsEl.innerHTML =
      `<span class="rdr-stat">Total: <strong>${US.readers.length}</strong></span>` +
      `<span class="rdr-stat tier-free-badge">Gratis: <strong>${tierCount.free}</strong></span>` +
      `<span class="rdr-stat tier-sub-badge">Suscriptor: <strong>${tierCount.subscriber}</strong></span>` +
      `<span class="rdr-stat tier-prem-badge">Premium: <strong>${tierCount.premium}</strong></span>`;
  }

  if (!slice.length) {
    el.innerHTML = '<div class="usr-empty">No hay lectores' + (US.readerSearch ? ' con ese criterio' : ' registrados') + '.</div>';
    renderReaderPaginator(0, 1, 1);
    return;
  }

  el.innerHTML = slice.map(r => {
    const tierTag = `<span class="rdr-tier-badge rdr-tier-${r.tier}">${TIER_LABELS[r.tier] || r.tier}</span>`;
    const name    = escH(r.displayName || r.email);
    const email   = escH(r.email || '');
    const active  = r.active !== false;
    const since   = (r.createdAt || '').slice(0, 10);
    const inactBadge = active ? '' : '<span class="usr-inactive-badge">Inactivo</span>';
    return `
      <div class="rdr-row ${active ? '' : 'rdr-inactive'}" data-id="${escH(r.id)}">
        <div class="usr-avatar rdr-av">${(r.displayName||r.email||'?')[0].toUpperCase()}</div>
        <div class="usr-info">
          <div class="usr-name">${name} ${inactBadge}</div>
          <div class="usr-meta">${email} · desde ${since}</div>
        </div>
        <div class="usr-role">${tierTag}</div>
        <div class="usr-actions">
          <button class="usr-btn usr-btn-edit" onclick="openReaderModal('${escH(r.id)}')">Editar</button>
          <button class="usr-btn usr-btn-del"  onclick="deleteReaderConfirm('${escH(r.id)}','${escH(name)}')">Eliminar</button>
        </div>
      </div>`;
  }).join('');

  renderReaderPaginator(total, US.readerPage, pages);
}

function renderReaderPaginator(total, current, pages) {
  const el = document.getElementById('readers-paginator');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = `<span class="rdr-page-info">${total} lectores · Pág. ${current}/${pages}</span>`;
  if (current > 1) html += `<button class="usr-btn" onclick="readerGoPage(${current-1})">‹ Anterior</button>`;
  if (current < pages) html += `<button class="usr-btn" onclick="readerGoPage(${current+1})">Siguiente ›</button>`;
  el.innerHTML = html;
}

function readerGoPage(p) { US.readerPage = p; renderReaders(); }

function filterReaders() {
  US.readerSearch = document.getElementById('rdr-search')?.value || '';
  US.readerTier   = document.getElementById('rdr-tier-filter')?.value || '';
  US.readerPage   = 1;
  renderReaders();
}

// ── Modal de lector ───────────────────────────────────────────
function openReaderModal(id) {
  US.editingReader = id ? US.readers.find(r => r.id === id) || null : null;
  const r = US.editingReader;

  document.getElementById('rdm-title').textContent       = r ? 'Editar lector' : 'Nuevo lector';
  document.getElementById('rdm-id').value                = r?.id          || '';
  document.getElementById('rdm-email').value             = r?.email       || '';
  document.getElementById('rdm-displayname').value       = r?.displayName || '';
  document.getElementById('rdm-tier').value              = r?.tier        || 'free';
  document.getElementById('rdm-active').checked          = r?.active !== false;
  document.getElementById('rdm-notes').value             = r?.notes       || '';
  document.getElementById('rdm-pass').value              = '';
  document.getElementById('rdm-err').textContent         = '';
  document.getElementById('rdm-err').style.display       = 'none';

  showModal('reader-modal');
}

async function saveReaderForm() {
  const id          = document.getElementById('rdm-id').value;
  const email       = document.getElementById('rdm-email').value.trim();
  const displayName = document.getElementById('rdm-displayname').value.trim();
  const tier        = document.getElementById('rdm-tier').value;
  const active      = document.getElementById('rdm-active').checked;
  const notes       = document.getElementById('rdm-notes').value.trim();
  const pass        = document.getElementById('rdm-pass').value;
  const errEl       = document.getElementById('rdm-err');

  errEl.style.display = 'none';
  if (!email) { errEl.textContent = 'El email es obligatorio'; errEl.style.display = ''; return; }

  try {
    const r = await api.post('save-reader', {id, email, displayName, tier, active, notes, pass: pass || undefined});
    if (r && r.ok) {
      hideModal('reader-modal');
      toast('✓ Lector guardado');
      US.readers = await api.call('readers');
      renderReaders();
    } else {
      errEl.textContent = r?.error || 'Error al guardar'; errEl.style.display = '';
    }
  } catch(e) {
    errEl.textContent = e?.message || 'Error'; errEl.style.display = '';
  }
}

async function deleteReaderConfirm(id, name) {
  if (!confirm(`¿Eliminar al lector "${name}"? Esta acción no se puede deshacer.`)) return;
  try {
    const r = await api.post('delete-reader', {id});
    if (r && r.ok) {
      toast('Lector eliminado');
      US.readers = await api.call('readers');
      renderReaders();
    } else { toast('Error: ' + (r?.error || '')); }
  } catch(e) { toast('Error: ' + (e?.message || '')); }
}

// ── Importar lectores (CSV simplificado) ──────────────────────
function openImportReaders() {
  showModal('import-readers-modal');
  document.getElementById('import-csv-text').value = '';
  document.getElementById('import-err').style.display = 'none';
  document.getElementById('import-ok').style.display  = 'none';
}

async function doImportReaders() {
  const raw   = document.getElementById('import-csv-text').value.trim();
  const errEl = document.getElementById('import-err');
  const okEl  = document.getElementById('import-ok');
  errEl.style.display = 'none'; okEl.style.display = 'none';

  if (!raw) { errEl.textContent = 'Pega los datos CSV primero'; errEl.style.display = ''; return; }

  // Parsear CSV: email, tier (opcional), nombre (opcional)
  const rows = raw.split('\n').map(line => {
    const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g,''));
    return { email: parts[0]||'', tier: parts[1]||'free', displayName: parts[2]||'' };
  }).filter(r => r.email);

  if (!rows.length) { errEl.textContent = 'No se encontraron emails válidos'; errEl.style.display = ''; return; }

  try {
    const r = await api.post('import-readers', {rows});
    if (r && r.ok) {
      okEl.textContent = `✓ ${r.added} lector${r.added!==1?'es':''} importado${r.added!==1?'s':''}` +
        (r.skipped ? `, ${r.skipped} omitido${r.skipped!==1?'s':''}` : '');
      okEl.style.display = '';
      US.readers = await api.call('readers');
      renderReaders();
    } else { errEl.textContent = r?.error || 'Error'; errEl.style.display = ''; }
  } catch(e) { errEl.textContent = e?.message || 'Error'; errEl.style.display = ''; }
}

// ── Helpers de modal ──────────────────────────────────────────
function showModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; el.classList.add('modal-visible'); }
}
function hideModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; el.classList.remove('modal-visible'); }
}

// Cerrar modal al hacer clic en el overlay
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.style.display = 'none';
    e.target.classList.remove('modal-visible');
  }
});
