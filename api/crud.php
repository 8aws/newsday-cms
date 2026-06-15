<?php
/**
 * crud.php — Posts y Páginas estáticas
 */

// ════════════════════════════════════════════════════════════════
//  POSTS
// ════════════════════════════════════════════════════════════════

function getPosts(): void {
    $dir = DIR_POSTS;
    if (!is_dir($dir)) { sendJSON([]); return; }
    $posts = [];
    foreach (scandir($dir) as $id) {
        if ($id[0] === '.') continue;
        $meta = readJSON("$dir/$id/meta.json");
        if ($meta) { $meta['id'] = $id; $posts[] = $meta; }
    }
    usort($posts, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));
    sendJSON($posts);
}

function getPost(): void {
    $id  = safeId($_GET['id'] ?? '');
    $dir = DIR_POSTS . "/$id";
    if (!$id || !is_dir($dir)) {
        sendJSON(['error' => 'Post no encontrado'], 404);
        return;
    }
    $meta    = readJSON("$dir/meta.json") ?? [];
    $layout  = readJSON("$dir/layout.json") ?? ['cols' => 12, 'rows' => 16, 'blocks' => []];
    $content = is_file("$dir/content.html") ? file_get_contents("$dir/content.html") : '';
    sendJSON([
        'id'      => $id,
        'title'   => $meta['title']  ?? '',
        'slug'    => $meta['slug']   ?? '',
        'date'    => $meta['date']   ?? '',
        'tags'    => $meta['tags']   ?? '',
        'status'  => $meta['status'] ?? 'draft',
        'access'  => $meta['access'] ?? 'public',
        'content' => $content,
        'blocks'  => $layout['blocks'] ?? [],
        'cols'    => (int)($layout['cols'] ?? 12),
        'rows'    => (int)($layout['rows'] ?? 16),
    ]);
}

function savePost(): void {
    $body = jsonBody();
    if (!$body) { sendJSON(['error' => 'JSON inválido'], 400); return; }
    $id    = $body['id'] ?? ('post_' . time() . '_' . rand(100, 999));
    $id    = safeId($id) ?: ('post_' . time());
    $title = $body['title'] ?? 'Sin título';
    $slug  = makeSlug($body['slug'] ?? $title);
    $dir   = DIR_POSTS . "/$id";
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    // Author: usa el usuario autenticado actual (multi-usuario)
    $authorName = '';
    if (function_exists('currentUser')) {
        $cu = currentUser();
        $authorName = $cu['displayName'] ?? $cu['username'] ?? '';
    }
    if (!$authorName) $authorName = defined('NEWSDAY_USER') ? NEWSDAY_USER : 'admin';

    $access = $body['access'] ?? 'public';
    if (!in_array($access, ['public','members','subscriber','premium'], true)) $access = 'public';

    $meta = [
        'id'        => $id,
        'title'     => $title,
        'slug'      => $slug,
        'date'      => $body['date']   ?? date('Y-m-d'),
        'author'    => $body['author'] ?? $authorName,
        'status'    => $body['status'] ?? 'draft',
        'tags'      => $body['tags']   ?? '',
        'access'    => $access,
        'updatedAt' => date('c'),
    ];
    writeJSON("$dir/meta.json", $meta);
    file_put_contents("$dir/content.html", $body['content'] ?? '');
    writeJSON("$dir/layout.json", [
        'cols'   => (int)($body['cols']   ?? 12),
        'rows'   => (int)($body['rows']   ?? 16),
        'blocks' => $body['blocks'] ?? [],
    ]);
    sendJSON(['ok' => true, 'id' => $id, 'slug' => $slug]);
}

function deletePost(): void {
    $body = jsonBody();
    $id   = safeId($body['id'] ?? $_GET['id'] ?? '');
    if (!$id) { sendJSON(['error' => 'Falta id'], 400); return; }
    $dir  = DIR_POSTS . "/$id";
    if (is_dir($dir)) rrmdir($dir);
    sendJSON(['ok' => true]);
}

// ════════════════════════════════════════════════════════════════
//  PÁGINAS ESTÁTICAS
// ════════════════════════════════════════════════════════════════

function getPagesList(): void {
    $dir = DIR_PAGES;
    if (!is_dir($dir)) { sendJSON([]); return; }
    $pages = [];
    foreach (scandir($dir) as $id) {
        if ($id[0] === '.') continue;
        $meta = readJSON("$dir/$id/meta.json");
        if ($meta) { $meta['id'] = $id; $pages[] = $meta; }
    }
    sendJSON($pages);
}

function savePageItem(): void {
    $body  = jsonBody();
    $id    = $body['id'] ?? ('page_' . time());
    $id    = safeId($id) ?: ('page_' . time());
    $title = $body['title'] ?? 'Sin título';
    $slug  = makeSlug($body['slug'] ?? $title);
    $dir   = DIR_PAGES . "/$id";
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    writeJSON("$dir/meta.json", [
        'id'        => $id,
        'title'     => $title,
        'slug'      => $slug,
        'updatedAt' => date('c'),
    ]);
    file_put_contents("$dir/content.html", $body['content'] ?? '');
    sendJSON(['ok' => true, 'id' => $id, 'slug' => $slug]);
}

function deletePageItem(): void {
    $body = jsonBody();
    $id   = safeId($body['id'] ?? '');
    if (!$id) { sendJSON(['error' => 'Falta id'], 400); return; }
    $dir  = DIR_PAGES . "/$id";
    if (is_dir($dir)) rrmdir($dir);
    sendJSON(['ok' => true]);
}

// ════════════════════════════════════════════════════════════════
//  CONSTRUCTOR VISUAL DE PÁGINAS (Page Builder)
// ════════════════════════════════════════════════════════════════

/**
 * GET ?action=get-page-builder&id=xxx
 * Devuelve {ok, sections, meta} si existe builder.json, o {ok, sections:null} si no.
 */
function getPageBuilder(): void {
    $id  = safeId($_GET['id'] ?? '');
    $dir = DIR_PAGES . "/$id";

    if (!$id || !is_dir($dir)) {
        sendJSON(['ok' => true, 'sections' => null, 'meta' => null]);
        return;
    }

    $builderFile = "$dir/builder.json";
    if (!is_file($builderFile)) {
        sendJSON(['ok' => true, 'sections' => null, 'meta' => null]);
        return;
    }

    $data = readJSON($builderFile);
    $meta = readJSON("$dir/meta.json") ?? [];

    sendJSON([
        'ok'       => true,
        'sections' => $data['sections'] ?? [],
        'meta'     => $meta,
    ]);
}

/**
 * POST ?action=save-page-builder
 * Body: {id, meta:{title,slug,layout,lang,description}, sections:[...], html:'...'}
 * Guarda builder.json + meta.json + content.html; crea el directorio si no existe.
 */
function savePageBuilder(): void {
    $body = jsonBody();
    if (!$body) { sendJSON(['error' => 'JSON inválido'], 400); return; }

    // Determinar ID del directorio
    $id = safeId($body['id'] ?? '');
    if (!$id) {
        // Nuevo: usar slug como ID si está disponible, si no generar uno
        $slug = makeSlug($body['meta']['slug'] ?? ($body['meta']['title'] ?? ''));
        $id   = $slug ?: ('page_' . time());
    }

    $dir = DIR_PAGES . "/$id";
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // Meta
    $metaIn  = $body['meta'] ?? [];
    $title   = $metaIn['title']       ?? 'Sin título';
    $slug    = makeSlug($metaIn['slug'] ?? $title);
    $layout  = $metaIn['layout']       ?? 'fullpage';
    $lang    = $metaIn['lang']         ?? 'es';
    $desc    = $metaIn['description']  ?? '';

    $existingMeta = readJSON("$dir/meta.json") ?? [];
    $meta = array_merge($existingMeta, [
        'id'          => $id,
        'title'       => $title,
        'slug'        => $slug,
        'layout'      => $layout,
        'lang'        => $lang,
        'description' => $desc,
        'useBuilder'  => true,
        'updatedAt'   => date('c'),
    ]);
    writeJSON("$dir/meta.json", $meta);

    // Builder data
    $sections = $body['sections'] ?? [];
    writeJSON("$dir/builder.json", [
        'v'        => 1,
        'sections' => $sections,
        'savedAt'  => date('c'),
    ]);

    // HTML generado
    $html = $body['html'] ?? '';
    file_put_contents("$dir/content.html", $html);

    sendJSON(['ok' => true, 'id' => $id, 'slug' => $slug]);
}
