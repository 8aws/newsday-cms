<?php
/**
 * config.php — Configuración del sitio, temas, layouts, mantenimiento, stats
 */

// ════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN PRINCIPAL (newsday-config.php)
// ════════════════════════════════════════════════════════════════

function getConfig(): void {
    sendJSON([
        'siteName' => defined('NEWSDAY_SITE_NAME') ? NEWSDAY_SITE_NAME : 'Newsday',
        'baseUrl'  => defined('NEWSDAY_BASE_URL')  ? NEWSDAY_BASE_URL  : '',
        'user'     => defined('NEWSDAY_USER')      ? NEWSDAY_USER      : 'admin',
        'token'    => defined('NEWSDAY_API_TOKEN') ? NEWSDAY_API_TOKEN : '—',
    ]);
}

function saveConfig(): void {
    $body         = jsonBody();
    $siteName     = trim($body['siteName'] ?? 'Newsday');
    $baseUrl      = rtrim(trim($body['baseUrl'] ?? ''), '/');
    $user         = trim($body['user'] ?? 'admin') ?: 'admin';
    $pass         = $body['pass'] ?? '';
    $existingHash = defined('NEWSDAY_PASS_HASH') ? NEWSDAY_PASS_HASH : password_hash('admin', PASSWORD_DEFAULT);
    $hash         = $pass ? password_hash($pass, PASSWORD_DEFAULT) : $existingHash;
    $apiToken     = defined('NEWSDAY_API_TOKEN') ? NEWSDAY_API_TOKEN : bin2hex(random_bytes(16));
    $lines = [
        '<?php',
        '// Newsday Configuration — ' . date('Y-m-d H:i:s'),
        "define('NEWSDAY_USER',      " . var_export($user, true) . ");",
        "define('NEWSDAY_PASS_HASH', " . var_export($hash, true) . ");",
        "define('NEWSDAY_API_TOKEN', " . var_export($apiToken, true) . ");",
        "define('NEWSDAY_SITE_NAME', " . var_export($siteName, true) . ");",
        "define('NEWSDAY_BASE_URL',  " . var_export($baseUrl, true) . ");",
    ];
    if (!file_put_contents(__DIR__ . '/../newsday-config.php', implode("\n", $lines) . "\n")) {
        sendJSON(['error' => 'No se pudo escribir newsday-config.php'], 500);
        return;
    }
    sendJSON(['ok' => true, 'apiToken' => $apiToken]);
}

// ════════════════════════════════════════════════════════════════
//  SITE CONFIG (site-config.json)
// ════════════════════════════════════════════════════════════════

function getSiteCfg(): void {
    $defaults = [
        'nav'              => [],
        'adZones'          => [],
        'headerBlocks'     => [],
        'footerBlocks'     => [],
        'theme'            => 'newsday',
        'contentLangs'     => ['es'],
        'siteStructure'    => ['homepage' => 'posts', 'homepageRef' => '', 'activePortada' => ''],
        'sectionTemplates' => ['posts' => '', 'single' => '', 'page' => ''],
        'blockAssignments' => [],
    ];
    if (!file_exists(FILE_SITE_CFG)) { sendJSON($defaults); return; }
    $cfg = json_decode(file_get_contents(FILE_SITE_CFG), true) ?? [];
    sendJSON(array_merge($defaults, $cfg));
}

function saveSiteCfg(): void {
    $body    = jsonBody();
    $current = loadSiteCfgData();
    $cfg = [
        'nav'              => $body['nav']              ?? [],
        'adZones'          => $body['adZones']          ?? [],
        'headerBlocks'     => $body['headerBlocks']     ?? [],
        'footerBlocks'     => $body['footerBlocks']     ?? [],
        'maintenance'      => $current['maintenance'],   // preservar
        'autoBackup'       => $current['autoBackup'],    // preservar
        'theme'            => $body['theme']             ?? $current['theme']             ?? 'newsday',
        'contentLangs'     => $body['contentLangs']      ?? $current['contentLangs']      ?? ['es'],
        'siteStructure'    => $body['siteStructure']     ?? $current['siteStructure']     ?? ['homepage' => 'posts', 'homepageRef' => '', 'activePortada' => ''],
        'sectionTemplates' => $body['sectionTemplates']  ?? $current['sectionTemplates']  ?? ['posts' => '', 'single' => '', 'page' => ''],
        'blockAssignments' => $body['blockAssignments']  ?? $current['blockAssignments']  ?? [],
    ];
    $dir = dirname(FILE_SITE_CFG);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    writeJSON(FILE_SITE_CFG, $cfg);
    sendJSON(['ok' => true]);
}

function loadSiteCfgData(): array {
    $defaults = [
        'nav'              => [],
        'adZones'          => [],
        'headerBlocks'     => [],
        'footerBlocks'     => [],
        'maintenance'      => ['active' => false, 'page' => ''],
        'autoBackup'       => ['enabled' => false, 'keepDays' => 7],
        'theme'            => 'newsday',
        'contentLangs'     => ['es'],
        'siteStructure'    => ['homepage' => 'posts', 'homepageRef' => '', 'activePortada' => ''],
        'sectionTemplates' => ['posts' => '', 'single' => '', 'page' => ''],
        'blockAssignments' => [],
    ];
    if (!file_exists(FILE_SITE_CFG)) return $defaults;
    $cfg = json_decode(file_get_contents(FILE_SITE_CFG), true) ?? [];
    return array_merge($defaults, $cfg);
}

// ════════════════════════════════════════════════════════════════
//  MODO MANTENIMIENTO
// ════════════════════════════════════════════════════════════════

function getMaintenance(): void {
    $cfg   = loadSiteCfgData();
    $maint = $cfg['maintenance'] ?? ['active' => false, 'page' => ''];
    sendJSON($maint);
}

function setMaintenance(): void {
    $body   = jsonBody();
    $active = !empty($body['active']);
    $page   = trim($body['page'] ?? '');

    $cfg = loadSiteCfgData();
    $cfg['maintenance'] = ['active' => $active, 'page' => $page];
    $dir = dirname(FILE_SITE_CFG);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    writeJSON(FILE_SITE_CFG, $cfg);

    if (!is_dir(DIR_PUBLIC)) mkdir(DIR_PUBLIC, 0755, true);

    $siteName  = defined('NEWSDAY_SITE_NAME') ? NEWSDAY_SITE_NAME : 'Newsday';
    $baseUrl   = normalizeBaseUrl(defined('NEWSDAY_BASE_URL') ? NEWSDAY_BASE_URL : '');
    $themeVars = loadTheme($cfg['theme'] ?? 'newsday')['vars'];

    if ($active) {
        $html = buildMaintenancePage($page, $siteName, $baseUrl, $cfg, $themeVars);
        file_put_contents(DIR_PUBLIC . '/index.html', $html);
        sendJSON(['ok' => true, 'active' => true, 'applied' => true]);
    } else {
        $allPosts = loadPublishedPosts();
        $html     = buildIndexPage($allPosts, $siteName, $baseUrl, $cfg, $themeVars);
        file_put_contents(DIR_PUBLIC . '/index.html', $html);
        sendJSON(['ok' => true, 'active' => false, 'applied' => true]);
    }
}

// ════════════════════════════════════════════════════════════════
//  TEMAS
// ════════════════════════════════════════════════════════════════

function loadTheme(string $id): array {
    $defaultVars =
        '--th-header-bg:#12122a;--th-header-fg:#ffffff;' .
        '--th-nav-bg:#1e293b;--th-nav-fg:#94a3b8;' .
        '--th-footer-bg:#1e293b;--th-footer-fg:#64748b;' .
        '--th-body-bg:#e8ebf0;--th-wrap-bg:#ffffff;' .
        '--th-wrap-shadow:0 4px 32px rgba(0,0,0,.12);' .
        '--th-text:#334155;--th-heading:#0f172a;' .
        '--th-accent:#5068e8;--th-accent-hover:#3d55d6;' .
        '--th-muted:#94a3b8;--th-border:#e2e8f0;' .
        '--th-sidebar-bg:#f8fafc;--th-sidebar-border:#e2e8f0;' .
        '--th-pullquote-bg:#eff6ff;--th-pullquote-fg:#1d4ed8;--th-pullquote-border:#3b82f6;' .
        '--th-card-bg:#ffffff;--th-card-border:#e2e8f0;' .
        '--th-tag-bg:#f1f5f9;--th-tag-fg:#64748b;' .
        '--th-body-font:Georgia,serif;--th-ui-font:system-ui,sans-serif;' .
        '--th-fallback-accent:#7c9ff5;';
    $defaults = [
        'id'          => 'newsday',
        'name'        => 'Newsday',
        'description' => '',
        'preview'     => ['header' => '#12122a', 'accent' => '#5068e8', 'body' => '#e8ebf0'],
        'vars'        => $defaultVars,
    ];
    $safe = preg_replace('/[^a-z0-9_-]/', '', strtolower($id));
    if ($safe === '') return $defaults;
    $file = DIR_TEMAS . "/$safe.php";
    if (!file_exists($file)) return $defaults;
    $theme = @(require $file);
    return is_array($theme) ? array_merge($defaults, $theme) : $defaults;
}

function listThemes(): void {
    $dir    = DIR_TEMAS;
    $themes = [];
    if (is_dir($dir)) {
        foreach (scandir($dir) as $f) {
            if (pathinfo($f, PATHINFO_EXTENSION) !== 'php') continue;
            $t = @(require "$dir/$f");
            if (is_array($t) && isset($t['id'])) {
                $themes[] = [
                    'id'          => $t['id'],
                    'name'        => $t['name']        ?? $t['id'],
                    'description' => $t['description'] ?? '',
                    'preview'     => $t['preview']     ?? [],
                    'builtin'     => in_array($t['id'], ['newsday','claro','oscuro','clasico'], true),
                ];
            }
        }
    }
    usort($themes, fn($a, $b) =>
        ($a['id'] === 'newsday' ? -1 : ($b['id'] === 'newsday' ? 1 : strcmp($a['name'], $b['name'])))
    );
    sendJSON(['themes' => $themes]);
}

/**
 * Parsea el string de vars CSS en un mapa clave→valor.
 * Ej: "--th-header-bg:#12122a;--th-header-fg:#fff;" → ['--th-header-bg'=>'#12122a', ...]
 */
function _parseThemeVars(string $vars): array {
    $map = [];
    foreach (explode(';', $vars) as $pair) {
        $pair = trim($pair);
        if (!$pair || strpos($pair, ':') === false) continue;
        [$k, $v] = explode(':', $pair, 2);
        $k = trim($k); $v = trim($v);
        if ($k !== '') $map[$k] = $v;
    }
    return $map;
}

/** GET ?action=get-theme&id=xxx */
function getTheme(): void {
    $id   = preg_replace('/[^a-z0-9_-]/', '', strtolower($_GET['id'] ?? ''));
    $data = loadTheme($id ?: 'newsday');
    // Añadir mapa de vars parseado para el editor
    $data['varsMap']  = _parseThemeVars($data['vars'] ?? '');
    $data['builtin']  = in_array($data['id'], ['newsday','claro','oscuro','clasico'], true);
    sendJSON($data);
}

/** POST ?action=save-theme */
function saveTheme(): void {
    $body = jsonBody();
    $id   = trim($body['id'] ?? '');
    // Generar ID desde el nombre si no viene
    if (!$id && !empty($body['name'])) {
        $id = preg_replace('/[^a-z0-9_-]/', '', strtolower(iconv('UTF-8','ASCII//TRANSLIT', $body['name'])));
    }
    $id = preg_replace('/[^a-z0-9_-]/', '', strtolower($id));
    if (!$id) { sendJSON(['error' => 'ID de tema inválido'], 400); return; }
    if (strlen($id) > 40) { sendJSON(['error' => 'ID demasiado largo'], 400); return; }

    $name  = trim($body['name'] ?? $id);
    $desc  = trim($body['description'] ?? '');

    // Construir vars desde el mapa enviado o desde el string directo
    if (!empty($body['varsMap']) && is_array($body['varsMap'])) {
        $parts = [];
        foreach ($body['varsMap'] as $k => $v) {
            $k = preg_replace('/[^a-z0-9_\-]/', '', $k);
            if ($k) $parts[] = "$k:$v";
        }
        $vars = implode(';', $parts) . ';';
    } else {
        $vars = $body['vars'] ?? '';
    }

    // Preview: se puede enviar o calcular desde vars
    $preview = $body['preview'] ?? [];
    if (empty($preview)) {
        $vm = _parseThemeVars($vars);
        $preview = [
            'header' => $vm['--th-header-bg'] ?? '#333',
            'accent' => $vm['--th-accent']    ?? '#5068e8',
            'body'   => $vm['--th-body-bg']   ?? '#f5f5f5',
        ];
    }

    if (!is_dir(DIR_TEMAS)) mkdir(DIR_TEMAS, 0755, true);
    $file    = DIR_TEMAS . "/$id.php";
    $content = "<?php\n/**\n * Newsday — Tema: $name\n */\nreturn " .
        var_export([
            'id'          => $id,
            'name'        => $name,
            'description' => $desc,
            'preview'     => $preview,
            'vars'        => $vars,
        ], true) . ";\n";

    if (!file_put_contents($file, $content)) {
        sendJSON(['error' => 'No se pudo guardar el tema'], 500);
        return;
    }
    sendJSON(['ok' => true, 'id' => $id, 'name' => $name]);
}

/** POST ?action=delete-theme   body: {id} */
function deleteTheme(): void {
    $body = jsonBody();
    $id   = preg_replace('/[^a-z0-9_-]/', '', strtolower($body['id'] ?? ''));
    if (!$id) { sendJSON(['error' => 'ID requerido'], 400); return; }
    if (in_array($id, ['newsday','claro','oscuro','clasico'], true)) {
        sendJSON(['error' => 'No se pueden eliminar los temas predefinidos'], 403);
        return;
    }
    $file = DIR_TEMAS . "/$id.php";
    if (!is_file($file)) { sendJSON(['error' => 'Tema no encontrado'], 404); return; }
    unlink($file);
    sendJSON(['ok' => true]);
}

/** POST ?action=upload-theme   multipart: file */
function uploadTheme(): void {
    if (empty($_FILES['file'])) {
        sendJSON(['error' => 'No se recibió archivo'], 400); return;
    }
    $f    = $_FILES['file'];
    $ext  = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if ($ext !== 'php') {
        sendJSON(['error' => 'Solo se aceptan archivos .php'], 400); return;
    }
    // Validar estructura: require el archivo temporal
    $theme = @(require $f['tmp_name']);
    if (!is_array($theme)) {
        sendJSON(['error' => 'El archivo no devuelve un array PHP válido'], 400); return;
    }
    $required = ['id','name','vars'];
    foreach ($required as $k) {
        if (empty($theme[$k])) {
            sendJSON(['error' => "Falta el campo obligatorio: $k"], 400); return;
        }
    }
    $id = preg_replace('/[^a-z0-9_-]/', '', strtolower($theme['id']));
    if (!$id || strlen($id) > 40) {
        sendJSON(['error' => 'ID del tema inválido o demasiado largo'], 400); return;
    }
    // Reconstruir el archivo de forma segura (no copiar PHP arbitrario)
    $preview = $theme['preview'] ?? [];
    if (empty($preview)) {
        $vm = _parseThemeVars($theme['vars']);
        $preview = [
            'header' => $vm['--th-header-bg'] ?? '#333',
            'accent' => $vm['--th-accent']    ?? '#5068e8',
            'body'   => $vm['--th-body-bg']   ?? '#f5f5f5',
        ];
    }
    if (!is_dir(DIR_TEMAS)) mkdir(DIR_TEMAS, 0755, true);
    $dest    = DIR_TEMAS . "/$id.php";
    $name    = trim($theme['name']);
    $desc    = trim($theme['description'] ?? '');
    $content = "<?php\n/**\n * Newsday — Tema: $name\n */\nreturn " .
        var_export([
            'id'          => $id,
            'name'        => $name,
            'description' => $desc,
            'preview'     => $preview,
            'vars'        => $theme['vars'],
        ], true) . ";\n";
    if (!file_put_contents($dest, $content)) {
        sendJSON(['error' => 'Error al guardar el tema'], 500); return;
    }
    sendJSON(['ok' => true, 'id' => $id, 'name' => $name]);
}

function listUILangs(): void {
    $dir   = DIR_LANGS . '/interface';
    $built = [['code' => 'es', 'name' => 'Español', 'native' => 'Español']];
    if (is_dir($dir)) {
        foreach (scandir($dir) as $f) {
            if (pathinfo($f, PATHINFO_EXTENSION) !== 'json') continue;
            $code = pathinfo($f, PATHINFO_FILENAME);
            if ($code === 'es') continue;
            $data   = json_decode(file_get_contents("$dir/$f"), true) ?? [];
            $built[] = [
                'code'   => $code,
                'name'   => $data['_name']   ?? strtoupper($code),
                'native' => $data['_native'] ?? ($data['_name'] ?? strtoupper($code)),
            ];
        }
    }
    sendJSON(['langs' => $built]);
}

function listContentLangs(): void {
    $dir   = DIR_LANGS . '/content';
    $built = [
        ['code' => 'es', 'name' => 'Español', 'native' => 'Español'],
        ['code' => 'en', 'name' => 'English', 'native' => 'English'],
    ];
    $seen = ['es', 'en'];
    if (is_dir($dir)) {
        foreach (scandir($dir) as $f) {
            if (pathinfo($f, PATHINFO_EXTENSION) !== 'json') continue;
            $code = pathinfo($f, PATHINFO_FILENAME);
            if (in_array($code, $seen)) continue;
            $data   = json_decode(file_get_contents("$dir/$f"), true) ?? [];
            $built[] = [
                'code'   => $code,
                'name'   => $data['_name']   ?? strtoupper($code),
                'native' => $data['_native'] ?? ($data['_name'] ?? strtoupper($code)),
            ];
            $seen[] = $code;
        }
    }
    sendJSON(['langs' => $built]);
}

// ════════════════════════════════════════════════════════════════
//  LAYOUTS (plantillas guardadas desde Maquetar)
// ════════════════════════════════════════════════════════════════

function listLayouts(): void {
    $dir = DIR_LAYOUTS;
    if (!is_dir($dir)) { sendJSON([]); return; }
    $layouts = [];
    foreach (glob("$dir/*.json") ?: [] as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data) $layouts[] = $data;
    }
    sendJSON($layouts);
}

function saveLayout(): void {
    $body = jsonBody();
    if (!$body) { sendJSON(['error' => 'JSON inválido'], 400); return; }
    $id      = $body['id'] ?? ('ly_' . uniqid());
    $name    = trim($body['name']    ?? 'Sin nombre');
    $purpose = trim($body['purpose'] ?? 'custom');
    $blocks  = $body['blocks'] ?? [];
    $layout  = [
        'id'        => $id,
        'name'      => $name,
        'purpose'   => $purpose,
        'blocks'    => $blocks,
        'updatedAt' => date('c'),
    ];
    $dir = DIR_LAYOUTS;
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(
        "$dir/$id.json",
        json_encode($layout, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
    sendJSON(['ok' => true, 'id' => $id]);
}

function deleteLayout(): void {
    $body = jsonBody();
    $id   = preg_replace('/[^a-zA-Z0-9_\-]/', '', $body['id'] ?? '');
    if (!$id) { sendJSON(['error' => 'Falta id'], 400); return; }
    $file = DIR_LAYOUTS . "/$id.json";
    if (file_exists($file)) unlink($file);
    sendJSON(['ok' => true]);
}

// ════════════════════════════════════════════════════════════════
//  ESTADÍSTICAS
// ════════════════════════════════════════════════════════════════

function getSiteStats(): void {
    $recentPosts = [];
    if (is_dir(DIR_POSTS)) {
        $posts = [];
        foreach (scandir(DIR_POSTS) as $id) {
            if ($id[0] === '.') continue;
            $meta = readJSON(DIR_POSTS . "/$id/meta.json");
            if ($meta) { $meta['id'] = $id; $posts[] = $meta; }
        }
        usort($posts, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));
        $recentPosts = array_slice($posts, 0, 5);
    }

    $pages = [];
    if (is_dir(DIR_PAGES)) {
        foreach (scandir(DIR_PAGES) as $id) {
            if ($id[0] === '.') continue;
            $meta = readJSON(DIR_PAGES . "/$id/meta.json");
            if ($meta) $pages[] = [
                'id'    => $id,
                'title' => $meta['title'] ?? '',
                'slug'  => $meta['slug']  ?? '',
            ];
        }
    }

    $tags = [];
    if (is_dir(DIR_POSTS)) {
        foreach (scandir(DIR_POSTS) as $id) {
            if ($id[0] === '.') continue;
            $meta = readJSON(DIR_POSTS . "/$id/meta.json");
            if (!$meta) continue;
            $tagArr = array_filter(array_map('trim', explode(',', $meta['tags'] ?? '')));
            foreach ($tagArr as $t) { $tags[$t] = ($tags[$t] ?? 0) + 1; }
        }
        arsort($tags);
    }

    sendJSON([
        'recentPosts' => $recentPosts,
        'pages'       => $pages,
        'tags'        => $tags,
        'disk'        => [
            'posts' => dirSizeBytes(DIR_POSTS),
            'media' => dirSizeBytes(DIR_MEDIA),
            'site'  => dirSizeBytes(DIR_PUBLIC),
        ],
    ]);
}

function dirSizeBytes(string $dir): int {
    if (!is_dir($dir)) return 0;
    $size = 0;
    $it   = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $file) {
        if ($file->isFile()) $size += $file->getSize();
    }
    return $size;
}

// ════════════════════════════════════════════════════════════════
//  HELPER: cargar posts publicados (reutilizable)
// ════════════════════════════════════════════════════════════════

function loadPublishedPosts(): array {
    $posts = [];
    if (!is_dir(DIR_POSTS)) return $posts;
    foreach (scandir(DIR_POSTS) as $id) {
        if ($id[0] === '.') continue;
        $meta = readJSON(DIR_POSTS . "/$id/meta.json");
        if (!$meta) continue;
        if (($meta['status'] ?? 'draft') !== 'published') continue;
        $meta['id'] = $id;
        $posts[]    = $meta;
    }
    usort($posts, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));
    return $posts;
}

function loadAllPosts(): array {
    $posts = [];
    if (!is_dir(DIR_POSTS)) return $posts;
    foreach (scandir(DIR_POSTS) as $id) {
        if ($id[0] === '.') continue;
        $meta = readJSON(DIR_POSTS . "/$id/meta.json");
        if (!$meta) continue;
        $meta['id'] = $id;
        $posts[]    = $meta;
    }
    usort($posts, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));
    return $posts;
}
