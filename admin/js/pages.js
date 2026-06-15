// ════════════════════════════════════════════════════════════════
//  pages.js — Páginas estáticas, etiquetas, subtabs de Organizar
// ════════════════════════════════════════════════════════════════

// ── Subtabs de Organizar ──────────────────────────────────────
function switchOrgTab(tab, btn) {
  document.querySelectorAll('.org-tab').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.org-panel').forEach(p => p.classList.remove('on'));
  if (btn) btn.classList.add('on');
  const panel = document.getElementById('org-' + tab);
  if (panel) panel.classList.add('on');

  // Actualizar el panel que se acaba de mostrar
  if (tab === 'etiquetas') renderTagsGrid();
  if (tab === 'nav')       renderNavList();
  if (tab === 'anuncios')  renderAdsList();
}

// ── Cargar páginas ─────────────────────────────────────────────
async function loadPages() {
  if (S.offline) return;
  try {
    const data = await api.call('pages');
    S.pages = Array.isArray(data) ? data : (data.pages || []);
    renderPagesList();
    updateDashStats();
    if (typeof loadDashStats  === 'function') loadDashStats();
    if (typeof mpgRefresh     === 'function') mpgRefresh();
  } catch(e) {
    console.warn('loadPages:', e);
  }
}

function renderPagesList() {
  const el = document.getElementById('pages-list-inner');
  if (!el) return;
  if (!S.pages.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:16px">Sin páginas estáticas</div>';
    return;
  }
  el.innerHTML = S.pages.map(p => `
    <div class="pl-item" onclick="openPage(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <div class="pl-title">${escH(p.title||p.slug||'Sin título')}</div>
      <div class="pl-meta">
        <span class="pl-date">${p.slug ? '/' + escH(p.slug) + '/' : ''}</span>
        <button class="pl-del" onclick="event.stopPropagation();deletePageById('${escH(p.slug||p.id)}')">🗑</button>
      </div>
    </div>
  `).join('');
}

// ── Página activa en edición ───────────────────────────────────
let _curPage = null;

function newPage() {
  _curPage = {id:null, title:'', slug:'', content:''};
  renderPageEditor(_curPage);
}

function openPage(p) {
  _curPage = {...p};
  renderPageEditor(_curPage);
}

function renderPageEditor(p) {
  const el = document.getElementById('page-editor');
  if (!el) return;
  el.innerHTML = `
    <div class="page-ed-inner">
      <div class="ed-topbar">
        <span class="ed-topbar-title">${p.id ? escH(p.title||p.slug||'Página') : 'Nueva página'}</span>
        <button class="btn btn-primary btn-sm pb-constructor-btn" onclick="openPageBuilder(_curPage)" title="Abrir el constructor visual de secciones y componentes">✦ Constructor visual</button>
        <button class="btn btn-primary btn-sm" onclick="savePage()">💾 Guardar HTML</button>
        ${p.slug ? `<a class="btn btn-ghost btn-sm" href="public/${escH(p.slug)}/" target="_blank">🌐 Ver</a>` : ''}
      </div>
      <div class="page-fields">
        <div class="srow">
          <span class="slbl">Título</span>
          <input class="sinp" id="pg-title" value="${escH(p.title||'')}" style="flex:1"
                 oninput="if(!document.getElementById('pg-slug').dataset.edited){document.getElementById('pg-slug').value=slugify(this.value)}">
        </div>
        <div class="srow">
          <span class="slbl">Slug</span>
          <input class="sinp" id="pg-slug" value="${escH(p.slug||'')}" style="flex:1"
                 placeholder="url-de-la-pagina"
                 oninput="this.dataset.edited='1'">
        </div>
      </div>
      <div id="pg-toolbar" class="ed-toolbar" style="margin-top:8px">
        <button class="tb" onclick="pgEx('bold')"><b>N</b></button>
        <button class="tb" onclick="pgEx('italic')"><i>C</i></button>
        <button class="tb" onclick="pgEx('underline')"><u>S</u></button>
        <div class="tsep2"></div>
        <button class="tb" onclick="pgEx('formatBlock','h1')">T1</button>
        <button class="tb" onclick="pgEx('formatBlock','h2')">T2</button>
        <button class="tb" onclick="pgEx('formatBlock','h3')">T3</button>
        <button class="tb" onclick="pgEx('formatBlock','p')">¶</button>
        <div class="tsep2"></div>
        <button class="tb" onclick="pgEx('insertUnorderedList')">• —</button>
        <button class="tb" onclick="pgEx('insertOrderedList')">1.</button>
        <button class="tb" onclick="pgEx('formatBlock','blockquote')">❝</button>
        <div class="tsep2"></div>
        <button class="tb" onclick="pgDoLink()">🔗</button>
      </div>
      <div id="pg-body" contenteditable="true" style="
        min-height:320px;border:1px solid #e2e8f0;border-radius:8px;padding:16px;
        font-size:14px;line-height:1.7;outline:none;background:#fff;margin-top:8px;overflow-y:auto">${p.content||''}</div>
    </div>
  `;
}

function pgEx(cmd, val) {
  document.getElementById('pg-body')?.focus();
  document.execCommand(cmd, false, val||null);
}

function pgDoLink() {
  const url = prompt('URL del enlace:', 'https://');
  if (!url) return;
  document.execCommand('createLink', false, url);
}

async function savePage() {
  if (!_curPage) return;
  _curPage.title   = document.getElementById('pg-title')?.value.trim()  || '';
  _curPage.slug    = document.getElementById('pg-slug')?.value.trim()   || slugify(_curPage.title);
  _curPage.content = document.getElementById('pg-body')?.innerHTML || '';

  if (!_curPage.slug) { toast('El slug es obligatorio'); return; }

  try {
    const r = await api.post('save-page', _curPage);
    if (r && r.ok) {
      if (r.id) _curPage.id = r.id;
      toast('✓ Página guardada');
      await loadPages();
    } else {
      toast('Error: ' + (r?.error||''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message||''));
  }
}

async function deletePageById(idOrSlug) {
  if (!confirm('¿Eliminar esta página?')) return;
  try {
    const r = await api.post('delete-page', {id: idOrSlug});
    if (r && r.ok) {
      toast('Página eliminada');
      _curPage = null;
      document.getElementById('page-editor').innerHTML =
        '<div class="empty-hint" style="padding:40px;text-align:center">Selecciona una página de la lista o crea una nueva</div>';
      await loadPages();
    } else {
      toast('Error: ' + (r?.error||''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message||''));
  }
}

// ── Rejilla de etiquetas ──────────────────────────────────────
function renderTagsGrid() {
  const el = document.getElementById('tags-grid');
  if (!el) return;

  // Recopilar tags de todos los posts
  const tagCount = {};
  S.posts.forEach(p => {
    if (!p.tags) return;
    p.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
  });

  const tags = Object.entries(tagCount).sort((a,b) => b[1]-a[1]);
  if (!tags.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:16px">Sin etiquetas todavía. Añade tags a tus posts en la pestaña Escribir.</div>';
    return;
  }
  el.innerHTML = tags.map(([tag, count]) =>
    `<div class="tag-pill" onclick="filterByTag('${escH(tag)}')">
      ${escH(tag)} <span class="tag-count">${count}</span>
    </div>`
  ).join('');
}

function filterByTag(tag) {
  // Ir a Escribir y filtrar lista por tag
  switchTab('escribir');
  const el = document.getElementById('posts-list');
  if (!el) return;
  const matching = S.posts.filter(p => p.tags && p.tags.split(',').map(t=>t.trim()).includes(tag));
  if (!matching.length) {
    toast(`Sin posts con la etiqueta "${tag}"`);
    return;
  }
  // Resaltar brevemente
  toast(`${matching.length} post${matching.length>1?'s':''} con etiqueta "${tag}"`);
  renderPostList();
  // Scroll al primer resultado
  const first = el.querySelector(`[data-id="${matching[0].id}"]`);
  if (first) first.scrollIntoView({behavior:'smooth', block:'nearest'});
}
