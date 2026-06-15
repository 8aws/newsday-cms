// ════════════════════════════════════════════════════════════════
//  posts.js — Gestión de posts, editor de texto enriquecido
// ════════════════════════════════════════════════════════════════

// ── CRUD Backend ─────────────────────────────────────────────
async function loadPostsFromBackend() {
  try {
    const data = await api.call('posts');
    S.posts = Array.isArray(data) ? data : (data.posts || []);
    renderPostList();
    updateDashStats();
    // Refrescar stats del dashboard (recientes, tags, disco)
    if (typeof loadDashStats === 'function') loadDashStats();
  } catch(e) {
    console.warn('loadPostsFromBackend:', e);
    if (S.offline) loadLS();
  }
}

async function loadPostById(id) {
  try {
    const data = await api.call(`post&id=${encodeURIComponent(id)}`);
    if (data && data.error) {
      toast('⚠ ' + data.error);
      return;
    }
    loadPost(data);
  } catch(e) {
    // Mostrar error descriptivo sin navegar
    console.error('loadPostById:', e);
    toast('No se pudo cargar el post completo. Revisa la consola.');
  }
}

async function savePost() {
  gatherCurrent();
  if (!S.cur.title.trim()) { toast('Escribe un título antes de guardar'); return; }

  if (S.offline) {
    OLS.savePost({...S.cur});
    return;
  }

  try {
    const r = await api.post('save', S.cur);
    if (r && r.ok) {
      if (r.id) S.cur.id = r.id;
      toast('✓ Post guardado');
      await loadPostsFromBackend();
      renderPostList();
    } else {
      toast('Error: ' + (r?.error || 'respuesta inesperada'));
    }
  } catch(e) {
    toast('Error guardando: ' + (e?.message || ''));
  }
}

async function deletePostRemote(id) {
  if (!confirm('¿Eliminar este post? Esta acción no se puede deshacer.')) return;

  if (S.offline) {
    OLS.deletePost(id);
    if (S.cur.id === id) newPost();
    renderPostList();
    updateDashStats();
    toast('Post eliminado localmente');
    return;
  }

  try {
    const r = await api.post('delete', {id});
    if (r && r.ok) {
      toast('Post eliminado');
      if (S.cur.id === id) newPost();
      await loadPostsFromBackend();
    } else {
      toast('Error al eliminar: ' + (r?.error || ''));
    }
  } catch(e) {
    toast('Error: ' + (e?.message || ''));
  }
}

// ── localStorage (compatibilidad + delegación a OLS) ─────────
function saveLS() { OLS.savePost({...S.cur}); }  // alias legacy
function loadLS()  { OLS.loadAll(); }             // alias legacy

// ── Reunir estado del editor → S.cur ─────────────────────────
function gatherCurrent() {
  S.cur.title   = document.getElementById('post-title').value.trim();
  S.cur.content = document.getElementById('ed-body').innerHTML;
  S.cur.date    = document.getElementById('meta-date').value;
  S.cur.status  = document.getElementById('meta-status').value;
  S.cur.tags    = document.getElementById('meta-tags').value;
  S.cur.access  = document.getElementById('meta-access')?.value || 'public';
  // slug automático desde título
  if (!S.cur.slug || S.cur.slug === slugify(S.cur._prevTitle || '')) {
    S.cur.slug = slugify(S.cur.title);
  }
  S.cur._prevTitle = S.cur.title;
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[áàäâ]/g,'a').replace(/[éèëê]/g,'e')
    .replace(/[íìïî]/g,'i').replace(/[óòöô]/g,'o')
    .replace(/[úùüû]/g,'u').replace(/ñ/g,'n')
    .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
}

// ── Cargar un post en el editor ───────────────────────────────
function loadPost(p) {
  S.cur = {
    id:      p.id      || null,
    title:   p.title   || '',
    slug:    p.slug    || '',
    date:    p.date    || '',
    tags:    p.tags    || '',
    status:  p.status  || 'draft',
    access:  p.access  || 'public',
    content: p.content || '',
    blocks:  p.blocks  || p.layout || [],
  };

  document.getElementById('post-title').value  = S.cur.title;
  document.getElementById('ed-body').innerHTML  = S.cur.content;
  document.getElementById('meta-date').value   = S.cur.date;
  document.getElementById('meta-status').value = S.cur.status;
  document.getElementById('meta-tags').value   = S.cur.tags;
  const accEl = document.getElementById('meta-access');
  if (accEl) accEl.value = S.cur.access || 'public';
  document.getElementById('ed-current-title').textContent = S.cur.title || 'Sin título';

  updateStatusBadge(S.cur.status);
  updateWC();

  // Reflejar bloques de layout en la pestaña Maquetar
  if (typeof renderGrid === 'function') renderGrid();

  // Marcar activo en la lista
  document.querySelectorAll('#posts-list .pli').forEach(el => {
    el.classList.toggle('cur', el.dataset.id === String(p.id));
  });
}

function newPost() {
  S.cur = {id:null, title:'', slug:'', date:todayISO(), tags:'', status:'draft', access:'public', content:'', blocks:[]};
  document.getElementById('post-title').value  = '';
  document.getElementById('ed-body').innerHTML  = '';
  document.getElementById('meta-date').value   = S.cur.date;
  document.getElementById('meta-status').value = 'draft';
  document.getElementById('meta-tags').value   = '';
  const accEl = document.getElementById('meta-access');
  if (accEl) accEl.value = 'public';
  document.getElementById('ed-current-title').textContent = 'Sin título';
  updateStatusBadge('draft');
  updateWC();
  document.querySelectorAll('#posts-list .pli').forEach(el => el.classList.remove('cur'));
  document.getElementById('post-title').focus();
}

function todayISO() {
  return new Date().toISOString().slice(0,10);
}

// ── Renderizar lista de posts (sidebar) ───────────────────────
function renderPostList() {
  const el = document.getElementById('posts-list');
  if (!el) return;
  if (!S.posts.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:16px">Aún no hay posts. ¡Crea el primero!</div>';
    return;
  }
  const sorted = [...S.posts].sort((a,b) => (b.date||'').localeCompare(a.date||''));
  el.innerHTML = sorted.map(p => {
    const lockIcon = p.access && p.access !== 'public'
      ? {members:'👤',subscriber:'◆',premium:'★'}[p.access] || '🔒'
      : '';
    return `
    <div class="pli ${String(p.id) === String(S.cur.id) ? 'cur' : ''}" data-id="${escH(String(p.id))}"
         onclick="openPostFromList('${escH(String(p.id))}')">
      <div class="pli-info">
        <div class="pli-t">${lockIcon ? `<span class="pli-lock" title="${escH(p.access)}">${lockIcon}</span> ` : ''}${escH(p.title || 'Sin título')}</div>
        <div class="pli-d">${p.status==='published'?'✓ Publicado':'Borrador'} · ${p.date||''}</div>
      </div>
      <button class="pli-del" onclick="event.stopPropagation();deletePostRemote('${escH(String(p.id))}')">🗑</button>
    </div>`;
  }).join('');
}

function openPostFromList(id) {
  // Carga inmediata desde caché (metadatos) para respuesta instantánea
  const cached = S.posts.find(x => String(x.id) === String(id));
  if (cached) loadPost(cached);

  // Luego carga el post completo (contenido + layout) desde la API
  if (!S.offline) {
    loadPostById(id);
  }

  switchTab('escribir');
}

// ── Sincronización en tiempo real ─────────────────────────────
function syncTitle() {
  const val = document.getElementById('post-title').value;
  S.cur.title = val;
  document.getElementById('ed-current-title').textContent = val || 'Sin título';
}

function syncContent() {
  S.cur.content = document.getElementById('ed-body').innerHTML;
}

function syncMeta() {
  S.cur.date = document.getElementById('meta-date').value;
  S.cur.tags = document.getElementById('meta-tags').value;
}

function syncStatus() {
  S.cur.status = document.getElementById('meta-status').value;
  updateStatusBadge(S.cur.status);
}

function updateStatusBadge(status) {
  const badge = document.getElementById('status-badge');
  if (!badge) return;
  badge.textContent = status === 'published' ? 'Publicado' : 'Borrador';
  badge.className   = status === 'published' ? 'sb-pub' : 'sb-draft';
}

// ── Word count ────────────────────────────────────────────────
function updateWC() {
  const el = document.getElementById('ed-body');
  if (!el) return;
  const text  = el.innerText || el.textContent || '';
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wc    = document.getElementById('wc');
  if (wc) wc.textContent = `${words} palabra${words === 1 ? '' : 's'}`;
}

// ── Toolbar del editor ────────────────────────────────────────
function ex(cmd, val) {
  document.getElementById('ed-body').focus();
  document.execCommand(cmd, false, val || null);
}

function doLink() {
  const sel = window.getSelection();
  const txt  = sel && !sel.isCollapsed ? sel.toString() : '';
  const url  = prompt('URL del enlace:', 'https://');
  if (!url) return;
  if (txt) {
    document.execCommand('createLink', false, url);
  } else {
    const label = prompt('Texto del enlace:', url) || url;
    document.execCommand('insertHTML', false,
      `<a href="${escH(url)}" target="_blank">${escH(label)}</a>`);
  }
}

// ── Insertar imagen desde la galería ─────────────────────────
function insertMediaInEditor() {
  openMediaModal('editor');
}

// ── Preview del post ──────────────────────────────────────────
function previewPost() {
  gatherCurrent();
  const html = buildPreviewHTML(S.cur);
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function buildPreviewHTML(post) {
  const blocks = post.blocks || [];
  const CELL   = 48;
  const cols   = S.cols || 12;
  const rows   = S.rows || 16;
  const W      = cols * 80;
  const H      = rows * CELL;

  let blockHTML = '';
  blocks.forEach(b => {
    const left   = ((b.c - 1) / cols * 100).toFixed(3) + '%';
    const top    = ((b.r - 1) * CELL) + 'px';
    const width  = (b.cs / cols * 100).toFixed(3) + '%';
    const height = (b.rs * CELL) + 'px';
    const style  = `position:absolute;left:${left};top:${top};width:${width};height:${height};
                    box-sizing:border-box;overflow:hidden;padding:8px;`;
    let inner = '';
    if (b.t === 'image' && b.mediaUrl) {
      inner = `<img src="${escH(b.mediaUrl)}" alt="${escH(b.tx||'')}" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      inner = `<div style="font-size:14px">${b.tx || ''}</div>`;
    }
    blockHTML += `<div class="blk blk-${escH(b.t||'')}" style="${style}">${inner}</div>`;
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escH(post.title || 'Preview')}</title>
<style>
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f2f5;margin:0;padding:24px}
  .preview-header{background:#fff;border-radius:8px;padding:20px 24px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
  .preview-header h1{font-size:24px;margin:0 0 8px;color:#12122a}
  .preview-meta{font-size:12px;color:#64748b}
  .layout-wrap{position:relative;background:#fff;border-radius:8px;padding:16px;
    box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:auto}
  .layout-inner{position:relative;width:${W}px;height:${H}px;margin:0 auto}
  .blk{border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc}
  .blk-header,.blk-footer{background:#1a237e;color:#fff}
  .blk-nav{background:#283593;color:#fff}
  .blk-content{background:#fff;border-color:#c7d2fe}
  .blk-sidebar{background:#eff6ff}
  .blk-pullquote{background:#fef3c7;border-left:4px solid #f59e0b}
  .blk-image{background:#f1f5f9;display:flex;align-items:center;justify-content:center}
  .blk-separator{background:transparent;border:none;border-top:2px solid #e2e8f0;height:2px!important}
  .blk-ad{background:repeating-linear-gradient(45deg,#f8fafc,#f8fafc 10px,#f1f5f9 10px,#f1f5f9 20px)}
  .content-preview{background:#fff;border-radius:8px;padding:20px 24px;margin-top:16px;
    box-shadow:0 2px 8px rgba(0,0,0,.08);line-height:1.7}
  .content-preview h1,h2,h3{color:#12122a}
  .content-preview blockquote{border-left:4px solid #5068e8;margin-left:0;padding-left:16px;color:#475569}
</style>
</head>
<body>
<div class="preview-header">
  <h1>${escH(post.title || 'Sin título')}</h1>
  <div class="preview-meta">${escH(post.date || '')} ${post.tags ? '· ' + escH(post.tags) : ''} · <em>${post.status === 'published' ? 'Publicado' : 'Borrador'}</em></div>
</div>
${blocks.length ? `<div class="layout-wrap"><div class="layout-inner">${blockHTML}</div></div>` : ''}
${post.content ? `<div class="content-preview">${post.content}</div>` : ''}
</body></html>`;
}

// ── Mini galería en sidebar de Escribir ───────────────────────
function renderMiniMediaGrid() {
  const el = document.getElementById('media-mini-grid');
  if (!el) return;
  const images = S.media.filter(m => m.type === 'images').slice(0, 12);
  if (!images.length) {
    el.innerHTML = '<div class="empty-hint" style="padding:12px;font-size:12px;grid-column:1/-1">Sin imágenes todavía</div>';
    return;
  }
  el.innerHTML = images.map(m => `
    <img class="mini-img" src="${escH(m.url||'')}" alt="${escH(m.name||'')}"
         title="${escH(m.name||'')}"
         onclick="insertImageFromMini('${escH(m.url||'')}','${escH(m.name||'')}')">
  `).join('');
}

function insertImageFromMini(url, alt) {
  document.getElementById('ed-body').focus();
  document.execCommand('insertHTML', false,
    `<img src="${escH(url)}" alt="${escH(alt)}" style="max-width:100%;height:auto">`);
  toast('Imagen insertada');
}
