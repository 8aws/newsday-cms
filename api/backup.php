<?php
/**
 * backup.php — Backup, restauración y backups en servidor
 *
 * v0.8: incluye panel-users, readers, layouts y temas en todos los zips.
 */

// ── Qué incluye cada backup ───────────────────────────────────
// Carpetas de contenido (dentro del zip con esa misma ruta):
//   content/posts           — posts con meta.json + content.html + layout.json
//   content/pages           — páginas estáticas
//   content/layouts         — plantillas guardadas de Maquetar
//   content/panel-users     — usuarios del panel (users.json)
//   content/readers         — lectores web (readers.json)
//   content/site-config.json
//   media/                  — archivos subidos
//   temas/                  — temas personalizados
//   newsday-config.php      — configuración principal (credenciales, etc.)

/**
 * Añade todos los contenidos del backup al ZipArchive abierto.
 */
function _backupFillZip(ZipArchive $zip): void {
    addDirToZip($zip, DIR_POSTS,   'content/posts');
    addDirToZip($zip, DIR_PAGES,   'content/pages');
    addDirToZip($zip, DIR_LAYOUTS, 'content/layouts');
    addDirToZip($zip, DIR_MEDIA,   'media');

    // Usuarios del panel
    $panelUsersDir = dirname(FILE_PANEL_USERS);
    if (is_dir($panelUsersDir)) addDirToZip($zip, $panelUsersDir, 'content/panel-users');

    // Lectores web
    $readersDir = dirname(FILE_READERS);
    if (is_dir($readersDir)) addDirToZip($zip, $readersDir, 'content/readers');

    // Temas personalizados
    if (is_dir(DIR_TEMAS)) addDirToZip($zip, DIR_TEMAS, 'temas');

    // Ficheros sueltos de configuración
    if (file_exists(FILE_SITE_CFG)) $zip->addFile(FILE_SITE_CFG, 'content/site-config.json');
    $cfgFile = __DIR__ . '/../newsday-config.php';
    if (file_exists($cfgFile))      $zip->addFile($cfgFile, 'newsday-config.php');
}

// ════════════════════════════════════════════════════════════════
//  BACKUP / RESTORE (descarga directa)
// ════════════════════════════════════════════════════════════════

function doBackup(): void {
    if (!class_exists('ZipArchive')) {
        sendJSON(['error' => 'ZipArchive no disponible'], 500);
        return;
    }
    $stamp   = date('Ymd_His');
    $tmpFile = sys_get_temp_dir() . "/newsday_backup_$stamp.zip";
    $zip     = new ZipArchive();
    if ($zip->open($tmpFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        sendJSON(['error' => 'No se pudo crear el ZIP'], 500);
        return;
    }
    _backupFillZip($zip);
    $zip->close();

    ob_clean();
    header('Content-Type: application/zip');
    header("Content-Disposition: attachment; filename=\"newsday_backup_$stamp.zip\"");
    header('Content-Length: ' . filesize($tmpFile));
    header('Pragma: no-cache');
    readfile($tmpFile);
    unlink($tmpFile);
    exit;
}

function doRestore(): void {
    if (!class_exists('ZipArchive')) {
        sendJSON(['error' => 'ZipArchive no disponible'], 500);
        return;
    }
    if (empty($_FILES['backup'])) {
        sendJSON(['error' => 'No se recibió archivo'], 400);
        return;
    }
    $zip = new ZipArchive();
    if ($zip->open($_FILES['backup']['tmp_name']) !== true) {
        sendJSON(['error' => 'ZIP inválido'], 400);
        return;
    }
    $tmp = sys_get_temp_dir() . '/newsday_restore_' . time();
    mkdir($tmp, 0755, true);
    $zip->extractTo($tmp);
    $zip->close();

    $restored = [];

    // Posts
    if (is_dir("$tmp/content/posts")) {
        rrmdir(DIR_POSTS);
        mkdir(DIR_POSTS, 0755, true);
        copyr("$tmp/content/posts", DIR_POSTS);
        $restored[] = 'posts';
    }
    // Páginas estáticas
    if (is_dir("$tmp/content/pages")) {
        rrmdir(DIR_PAGES);
        mkdir(DIR_PAGES, 0755, true);
        copyr("$tmp/content/pages", DIR_PAGES);
        $restored[] = 'pages';
    }
    // Layouts de Maquetar
    if (is_dir("$tmp/content/layouts")) {
        rrmdir(DIR_LAYOUTS);
        mkdir(DIR_LAYOUTS, 0755, true);
        copyr("$tmp/content/layouts", DIR_LAYOUTS);
        $restored[] = 'layouts';
    }
    // Usuarios del panel
    $panelUsersDir = dirname(FILE_PANEL_USERS);
    if (is_dir("$tmp/content/panel-users")) {
        if (!is_dir($panelUsersDir)) mkdir($panelUsersDir, 0755, true);
        copyr("$tmp/content/panel-users", $panelUsersDir);
        $restored[] = 'panel-users';
    }
    // Lectores web
    $readersDir = dirname(FILE_READERS);
    if (is_dir("$tmp/content/readers")) {
        if (!is_dir($readersDir)) mkdir($readersDir, 0755, true);
        copyr("$tmp/content/readers", $readersDir);
        $restored[] = 'readers';
    }
    // Media
    if (is_dir("$tmp/media")) {
        rrmdir(DIR_MEDIA);
        mkdir(DIR_MEDIA, 0755, true);
        copyr("$tmp/media", DIR_MEDIA);
        $restored[] = 'media';
    }
    // Temas
    if (is_dir("$tmp/temas")) {
        copyr("$tmp/temas", DIR_TEMAS);
        $restored[] = 'temas';
    }
    // site-config.json
    if (file_exists("$tmp/content/site-config.json")) {
        $d = dirname(FILE_SITE_CFG);
        if (!is_dir($d)) mkdir($d, 0755, true);
        copy("$tmp/content/site-config.json", FILE_SITE_CFG);
        $restored[] = 'site-config';
    }
    // newsday-config.php (solo si el zip lo trae y ya no existe)
    $localCfg = __DIR__ . '/../newsday-config.php';
    if (file_exists("$tmp/newsday-config.php") && !file_exists($localCfg)) {
        copy("$tmp/newsday-config.php", $localCfg);
        $restored[] = 'newsday-config';
    }

    rrmdir($tmp);
    sendJSON([
        'ok'       => true,
        'restored' => $restored,
        'message'  => 'Restauración completada. Datos restaurados: ' . implode(', ', $restored) . '.',
    ]);
}

// ════════════════════════════════════════════════════════════════
//  BACKUPS EN SERVIDOR
// ════════════════════════════════════════════════════════════════

function listBackups(): void {
    $dir = DIR_BACKUPS;
    $cfg = loadSiteCfgData();
    $ab  = $cfg['autoBackup'] ?? ['enabled' => false, 'keepDays' => 7];
    if (!is_dir($dir)) { sendJSON(['files' => [], 'autoBackup' => $ab]); return; }
    $files = [];
    foreach (scandir($dir, SCANDIR_SORT_DESCENDING) as $f) {
        if (pathinfo($f, PATHINFO_EXTENSION) !== 'zip') continue;
        $path    = "$dir/$f";
        $files[] = [
            'name' => $f,
            'size' => filesize($path),
            'date' => date('Y-m-d H:i:s', filemtime($path)),
        ];
    }
    sendJSON(['files' => $files, 'autoBackup' => $ab]);
}

function createServerBackup(): void {
    if (!class_exists('ZipArchive')) {
        sendJSON(['error' => 'ZipArchive no disponible'], 500);
        return;
    }
    if (!is_dir(DIR_BACKUPS)) mkdir(DIR_BACKUPS, 0755, true);
    $stamp = date('Y-m-d_His');
    $name  = "backup_$stamp.zip";
    $path  = DIR_BACKUPS . "/$name";
    $zip   = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        sendJSON(['error' => 'No se pudo crear el ZIP'], 500);
        return;
    }
    _backupFillZip($zip);
    $zip->close();

    // Limpiar backups antiguos
    $cfg      = loadSiteCfgData();
    $keepDays = (int)($cfg['autoBackup']['keepDays'] ?? 7);
    if ($keepDays > 0) {
        $cutoff = time() - $keepDays * 86400;
        foreach (scandir(DIR_BACKUPS) as $f) {
            if (pathinfo($f, PATHINFO_EXTENSION) !== 'zip') continue;
            $fp = DIR_BACKUPS . "/$f";
            if (filemtime($fp) < $cutoff) @unlink($fp);
        }
    }
    sendJSON([
        'ok'   => true,
        'name' => $name,
        'size' => filesize($path),
        'date' => date('Y-m-d H:i:s'),
    ]);
}

function deleteServerBackup(): void {
    $body = jsonBody();
    $name = basename($body['name'] ?? '');
    if (!$name || pathinfo($name, PATHINFO_EXTENSION) !== 'zip') {
        sendJSON(['error' => 'Nombre inválido'], 400);
        return;
    }
    $path = DIR_BACKUPS . "/$name";
    if (!is_file($path)) { sendJSON(['error' => 'Archivo no encontrado'], 404); return; }
    unlink($path);
    sendJSON(['ok' => true]);
}

function downloadServerBackup(): void {
    $name = basename($_GET['file'] ?? '');
    if (!$name || pathinfo($name, PATHINFO_EXTENSION) !== 'zip') {
        http_response_code(400);
        echo 'Invalid file';
        exit;
    }
    $path = DIR_BACKUPS . "/$name";
    if (!is_file($path)) { http_response_code(404); echo 'Not found'; exit; }
    ob_clean();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . addslashes($name) . '"');
    header('Content-Length: ' . filesize($path));
    header('Pragma: no-cache');
    readfile($path);
    exit;
}

function saveAutoBackupConfig(): void {
    $body = jsonBody();
    $cfg  = loadSiteCfgData();
    $cfg['autoBackup'] = [
        'enabled'  => (bool)($body['enabled']  ?? false),
        'keepDays' => max(1, (int)($body['keepDays'] ?? 7)),
    ];
    file_put_contents(
        FILE_SITE_CFG,
        json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
    sendJSON(['ok' => true]);
}
