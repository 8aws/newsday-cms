<?php
/**
 * media.php — Gestión de archivos multimedia
 */

function getMedia(): void {
    ensureMediaDirs();
    sendJSON(loadMediaIndex());
}

function uploadMedia(): void {
    ensureMediaDirs();
    if (empty($_FILES['file'])) {
        sendJSON(['error' => 'No se recibió ningún archivo'], 400);
        return;
    }
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendJSON(['error' => 'Error de subida: ' . $file['error']], 400);
        return;
    }
    if ($file['size'] > 50 * 1024 * 1024) {
        sendJSON(['error' => 'Archivo demasiado grande (máx 50 MB)'], 400);
        return;
    }
    $mime      = mime_content_type($file['tmp_name']);
    $ext       = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $subfolder = match(true) {
        str_starts_with($mime, 'image/') => 'images',
        str_starts_with($mime, 'audio/') => 'audio',
        str_starts_with($mime, 'video/') => 'video',
        default                          => 'docs',
    };
    $allowed = [
        'jpg','jpeg','png','gif','webp','svg','avif',
        'mp3','wav','ogg','m4a','flac',
        'mp4','webm','mov','avi',
        'pdf','doc','docx','xls','xlsx','txt','md',
    ];
    if (!in_array($ext, $allowed, true)) {
        sendJSON(['error' => "Extensión no permitida: .$ext"], 400);
        return;
    }
    $baseName = safeFilename(pathinfo($file['name'], PATHINFO_FILENAME));
    $filename = $baseName . '.' . $ext;
    $destPath = DIR_MEDIA . "/$subfolder/$filename";
    if (file_exists($destPath)) {
        $filename = $baseName . '_' . time() . '.' . $ext;
        $destPath = DIR_MEDIA . "/$subfolder/$filename";
    }
    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        sendJSON(['error' => 'No se pudo mover el archivo'], 500);
        return;
    }
    // Saneado de SVG: un SVG servido inline puede ejecutar JavaScript
    // (<script>, handlers on*=, javascript:). Mejor esfuerzo para evitar
    // XSS almacenado en logos/iconos subidos por usuarios no-admin.
    if ($ext === 'svg') {
        $svg = sanitizeSvg((string)file_get_contents($destPath));
        file_put_contents($destPath, $svg);
    }
    $entry = [
        'id'         => uniqid('m_', true),
        'filename'   => $filename,
        'subfolder'  => $subfolder,
        'mime'       => $mime,
        'size'       => filesize($destPath),
        'url'        => "media/$subfolder/$filename",
        'uploadedAt' => date('c'),
        'name'       => pathinfo($file['name'], PATHINFO_FILENAME),
    ];
    if (str_starts_with($mime, 'image/') && function_exists('getimagesize')) {
        $sz = @getimagesize($destPath);
        if ($sz) { $entry['width'] = $sz[0]; $entry['height'] = $sz[1]; }
    }
    $index   = loadMediaIndex();
    $index[] = $entry;
    saveMediaIndex($index);
    sendJSON(['ok' => true, 'file' => $entry]);
}

function deleteMedia(): void {
    $body  = jsonBody();
    $id    = $body['id'] ?? '';
    if (!$id) { sendJSON(['error' => 'Falta id'], 400); return; }
    $index = loadMediaIndex();
    $entry = null;
    foreach ($index as $item) {
        if ($item['id'] === $id) { $entry = $item; break; }
    }
    if ($entry) {
        $path = DIR_MEDIA . '/' . $entry['subfolder'] . '/' . $entry['filename'];
        if (file_exists($path)) unlink($path);
        $index = array_values(array_filter($index, fn($i) => $i['id'] !== $id));
        saveMediaIndex($index);
    }
    sendJSON(['ok' => true]);
}

function loadMediaIndex(): array {
    if (!file_exists(FILE_MEDIA_IDX)) return [];
    return json_decode(file_get_contents(FILE_MEDIA_IDX), true) ?? [];
}

function saveMediaIndex(array $idx): void {
    writeJSON(FILE_MEDIA_IDX, array_values($idx));
}

function ensureMediaDirs(): void {
    foreach (['images', 'audio', 'video', 'docs'] as $s) {
        $d = DIR_MEDIA . "/$s";
        if (!is_dir($d)) mkdir($d, 0755, true);
    }
}

/**
 * Saneado de SVG (mejor esfuerzo) contra XSS almacenado.
 * Elimina elementos y atributos que pueden ejecutar JavaScript cuando el
 * SVG se renderiza inline. No sustituye a una validación estricta, pero
 * cubre los vectores habituales en archivos subidos.
 */
function sanitizeSvg(string $svg): string {
    // Elementos peligrosos completos (apertura + contenido + cierre)
    $svg = preg_replace('#<\s*(script|foreignObject|iframe|use)\b[^>]*>.*?<\s*/\s*\1\s*>#is', '', $svg);
    // Variantes auto-cerradas o sin cierre
    $svg = preg_replace('#<\s*(script|foreignObject|iframe|use)\b[^>]*/?\s*>#is', '', $svg);
    // Atributos manejadores de eventos: onload, onclick, onmouseover, etc.
    $svg = preg_replace('#\son[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $svg);
    // URIs javascript: en href/xlink:href/src/style
    $svg = preg_replace('#(href|xlink:href|src|style)\s*=\s*("|\')\s*javascript:[^"\']*\2#i', '', $svg);
    return $svg;
}
