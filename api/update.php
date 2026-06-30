<?php
/**
 * update.php — Gestión segura de actualizaciones de Newsday
 *
 * Endpoints:
 *   POST  ?action=apply-update    Aplica un ZIP de actualización
 *   GET   ?action=export-update   Descarga el código actual como paquete
 */

// ── Paths protegidos — NUNCA se sobreescriben ─────────────────
// Rutas relativas a la raíz de la instalación.
// Cualquier archivo del ZIP que empiece por alguna de estas rutas
// se ignora silenciosamente.
function updateProtectedPaths(): array {
    return [
        'content'           . DIRECTORY_SEPARATOR,
        'media'             . DIRECTORY_SEPARATOR,
        'backups'           . DIRECTORY_SEPARATOR,
        'public'            . DIRECTORY_SEPARATOR,
        'preview'           . DIRECTORY_SEPARATOR,
        'newsday-config.php',
        'newsday-config.php.bak',
        // Favicons publicados en la raíz: son de cada instalación
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
    ];
}

// ── Normalizar separador y limpiar ruta de un entry del ZIP ───
function updateNormPath(string $raw): string {
    // Eliminar rutas absolutas o traversal
    $p = str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $raw);
    $p = ltrim($p, DIRECTORY_SEPARATOR . '.');
    $p = preg_replace('/\.\.+' . preg_quote(DIRECTORY_SEPARATOR, '/') . '/', '', $p);
    return $p;
}

// ── Comprobar si una ruta está protegida ──────────────────────
function updateIsProtected(string $normalPath): bool {
    foreach (updateProtectedPaths() as $prot) {
        if (str_starts_with($normalPath, $prot) || $normalPath === rtrim($prot, DIRECTORY_SEPARATOR)) {
            return true;
        }
    }
    return false;
}

// ════════════════════════════════════════════════════════════════
//  APLICAR ACTUALIZACIÓN
// ════════════════════════════════════════════════════════════════
function applyUpdate(): void {
    if (!class_exists('ZipArchive')) {
        sendJSON(['error' => 'ZipArchive no disponible en este servidor PHP'], 500);
        return;
    }

    $file = $_FILES['file'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        sendJSON(['error' => 'No se recibió ningún archivo o hubo un error en la subida'], 400);
        return;
    }
    if (!str_ends_with(strtolower($file['name']), '.zip')) {
        sendJSON(['error' => 'El archivo debe ser un .zip'], 400);
        return;
    }

    $tmpPath = $file['tmp_name'];
    $root    = __DIR__ . DIRECTORY_SEPARATOR . '..';   // raíz de la instalación

    $zip = new ZipArchive();
    if ($zip->open($tmpPath) !== true) {
        sendJSON(['error' => 'No se pudo abrir el ZIP. ¿Es un archivo válido?'], 400);
        return;
    }

    $updated   = [];   // archivos actualizados
    $skipped   = [];   // archivos protegidos ignorados
    $errors    = [];   // errores de escritura

    // ── Respaldo automático previo (rollback) ─────────────────────
    // Antes de sobrescribir nada, guardamos una copia de los archivos
    // existentes que la actualización va a tocar. Si algo sale mal, se
    // puede restaurar este ZIP manualmente desde backups/.
    $rollbackZip  = null;
    $rollbackPath = '';
    if (defined('DIR_BACKUPS')) {
        if (!is_dir(DIR_BACKUPS)) @mkdir(DIR_BACKUPS, 0755, true);
        $rollbackPath = DIR_BACKUPS . DIRECTORY_SEPARATOR
                      . 'rollback-pre-update-' . date('Ymd-His') . '.zip';
        $rb = new ZipArchive();
        if ($rb->open($rollbackPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            $rollbackZip = $rb;
        }
    }

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $entry = $zip->getNameIndex($i);
        if ($entry === false) continue;

        $norm = updateNormPath($entry);
        if ($norm === '' || $norm === DIRECTORY_SEPARATOR) continue;

        // ¿Es directorio vacío?
        if (str_ends_with($entry, '/') || str_ends_with($entry, '\\')) continue;

        // ¿Está protegido?
        if (updateIsProtected($norm)) {
            $skipped[] = $norm;
            continue;
        }

        $dest = $root . DIRECTORY_SEPARATOR . $norm;
        $dir  = dirname($dest);

        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            $errors[] = $norm . ' (no se pudo crear directorio)';
            continue;
        }

        $content = $zip->getFromIndex($i);
        if ($content === false) {
            $errors[] = $norm . ' (no se pudo leer del ZIP)';
            continue;
        }

        // Respaldar la versión actual antes de sobrescribirla
        if ($rollbackZip && is_file($dest)) {
            $rollbackZip->addFile($dest, str_replace(DIRECTORY_SEPARATOR, '/', $norm));
        }

        // Escritura atómica: escribir en temporal y renombrar, para no
        // dejar un archivo a medio escribir si el proceso falla.
        $tmp = $dest . '.nd-tmp-' . getmypid();
        if (file_put_contents($tmp, $content) === false || !@rename($tmp, $dest)) {
            @unlink($tmp);
            $errors[] = $norm . ' (no se pudo escribir)';
        } else {
            $updated[] = $norm;
        }
    }

    if ($rollbackZip) $rollbackZip->close();
    $zip->close();

    // Si no se respaldó ningún archivo (todo era nuevo), descartar el ZIP vacío
    if ($rollbackPath && is_file($rollbackPath)) {
        $rbCheck = new ZipArchive();
        if ($rbCheck->open($rollbackPath) === true) {
            $empty = $rbCheck->numFiles === 0;
            $rbCheck->close();
            if ($empty) { @unlink($rollbackPath); $rollbackPath = ''; }
        }
    }

    sendJSON([
        'ok'       => true,
        'updated'  => $updated,
        'skipped'  => $skipped,
        'errors'   => $errors,
        'rollback' => $rollbackPath ? basename($rollbackPath) : null,
        'summary'  => sprintf(
            '%d archivo(s) actualizado(s), %d protegido(s) omitido(s)%s',
            count($updated),
            count($skipped),
            count($errors) ? ', ' . count($errors) . ' error(es)' : ''
        ),
    ]);
}

// ════════════════════════════════════════════════════════════════
//  EXPORTAR PAQUETE DE ACTUALIZACIÓN
// ════════════════════════════════════════════════════════════════
function exportUpdate(): void {
    if (!class_exists('ZipArchive')) {
        sendJSON(['error' => 'ZipArchive no disponible en este servidor PHP'], 500);
        return;
    }

    $root     = realpath(__DIR__ . DIRECTORY_SEPARATOR . '..');
    $protected = updateProtectedPaths();

    // Extensiones de archivo a incluir en el paquete
    $allowedExt = ['php', 'html', 'js', 'css', 'json', 'svg', 'md', 'htaccess', 'txt', 'mp3', 'mp4'];

    // Nombres de archivo/directorio a excluir siempre
    $excludeNames = ['.git', '.DS_Store', 'Thumbs.db', '.gitignore', 'node_modules', '*.zip'];

    $tmpFile = tempnam(sys_get_temp_dir(), 'nd_update_');
    $zip = new ZipArchive();
    if ($zip->open($tmpFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        sendJSON(['error' => 'No se pudo crear el ZIP temporal'], 500);
        return;
    }

    $count = 0;

    // Recorrer árbol de archivos
    $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($iter as $file) {
        /** @var SplFileInfo $file */
        $realPath = $file->getRealPath();
        $relPath  = substr($realPath, strlen($root) + 1);
        $norm     = updateNormPath($relPath);

        // Saltar protegidos
        if (updateIsProtected($norm)) continue;

        // Saltar archivos ZIP (backups, etc.)
        if (str_ends_with(strtolower($norm), '.zip')) continue;

        // Saltar nombres excluidos
        $base = basename($norm);
        if (in_array($base, $excludeNames, true)) continue;
        if (str_starts_with($base, '.')) continue;  // archivos ocultos

        // Comprobar extensión
        $ext = strtolower(pathinfo($norm, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true) && $ext !== '') continue;
        // sin extensión: .htaccess, etc. — incluir
        if ($ext === '' && !in_array($base, ['Dockerfile', '.htaccess'], true)) continue;

        $zip->addFile($realPath, str_replace(DIRECTORY_SEPARATOR, '/', $norm));
        $count++;
    }

    $zip->close();

    if ($count === 0) {
        @unlink($tmpFile);
        sendJSON(['error' => 'No se encontraron archivos para exportar'], 500);
        return;
    }

    $version  = defined('NEWSDAY_VERSION') ? NEWSDAY_VERSION : '0.x';
    $filename = 'newsday-update-v' . $version . '-' . date('Ymd') . '.zip';

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . filesize($tmpFile));
    header('Cache-Control: no-cache');

    ob_clean();
    readfile($tmpFile);
    @unlink($tmpFile);
    exit;
}
