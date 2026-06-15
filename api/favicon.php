<?php
/**
 * favicon.php — Gestión de favicon y app icons
 *
 * Genera automáticamente múltiples tamaños (PNG + ICO) usando PHP GD.
 * Los archivos se guardan en content/favicons/ y se copian a public/
 * cada vez que se genera el sitio.
 *
 * Endpoints:
 *   GET  ?action=get-favicon        Estado + URL de preview
 *   POST ?action=save-favicon       Sube imagen y genera tamaños
 *   POST ?action=delete-favicon     Elimina todos los archivos
 *   GET  ?action=favicon-preview    Sirve el PNG 32x32 para el admin
 */

if (!defined('DIR_CONTENT'))  define('DIR_CONTENT',  __DIR__ . '/../content');
if (!defined('DIR_PUBLIC'))   define('DIR_PUBLIC',   __DIR__ . '/../public');
define('DIR_FAVICONS', DIR_CONTENT . '/favicons');

// ════════════════════════════════════════════════════════════════
//  GET — estado actual
// ════════════════════════════════════════════════════════════════
function getFaviconState(): void {
    sendJSON(_faviconState());
}

function _faviconState(): array {
    $hasFiles = is_file(DIR_FAVICONS . '/favicon-32x32.png');
    $preview  = null;
    if ($hasFiles) {
        $mtime   = filemtime(DIR_FAVICONS . '/favicon-32x32.png');
        $preview = "newsday-api.php?action=favicon-preview&_={$mtime}";
    }
    return [
        'set'     => $hasFiles,
        'preview' => $preview,
    ];
}

// ════════════════════════════════════════════════════════════════
//  SAVE — recibe imagen, genera todos los tamaños
// ════════════════════════════════════════════════════════════════
function saveFavicon(): void {
    if (!function_exists('imagecreatetruecolor')) {
        sendJSON(['error' => 'PHP GD no está disponible en este servidor'], 500); return;
    }

    $file = $_FILES['file'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        sendJSON(['error' => 'No se recibió archivo o hubo un error en la subida'], 400); return;
    }

    $mime = mime_content_type($file['tmp_name']);
    $allowedMimes = ['image/png','image/jpeg','image/gif','image/webp','image/svg+xml'];
    if (!in_array($mime, $allowedMimes, true)) {
        sendJSON(['error' => 'Formato no soportado. Usa PNG, JPG, WEBP o GIF.'], 400); return;
    }

    if ($mime === 'image/svg+xml') {
        sendJSON(['error' => 'SVG no es compatible con el redimensionado automático. Usa PNG o JPG.'], 400); return;
    }

    if (!is_dir(DIR_FAVICONS)) mkdir(DIR_FAVICONS, 0755, true);

    // Cargar imagen fuente con GD
    $src = _faviconLoadGD($file['tmp_name'], $mime);
    if (!$src) {
        sendJSON(['error' => 'No se pudo leer la imagen con PHP GD'], 400); return;
    }

    $srcW = imagesx($src);
    $srcH = imagesy($src);

    // Guardar fuente original (limpiar cualquier fuente anterior)
    foreach (['png','jpg','jpeg','webp','gif'] as $e) {
        $old = DIR_FAVICONS . "/source.$e";
        if (is_file($old)) unlink($old);
    }
    $ext = match($mime) {
        'image/jpeg' => 'jpg',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
        default      => 'png',
    };
    copy($file['tmp_name'], DIR_FAVICONS . "/source.$ext");

    // Tamaños a generar
    $sizes = [
        'favicon-16x16.png'    => [16,  16],
        'favicon-32x32.png'    => [32,  32],
        'apple-touch-icon.png' => [180, 180],
        'icon-192.png'         => [192, 192],
        'icon-512.png'         => [512, 512],
    ];

    foreach ($sizes as $filename => [$w, $h]) {
        $dst = imagecreatetruecolor($w, $h);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        // Fondo transparente
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefilledrectangle($dst, 0, 0, $w - 1, $h - 1, $transparent);
        // Redimensionar manteniendo aspecto (crop centrado)
        [$cropX, $cropY, $cropW, $cropH] = _faviconCropRect($srcW, $srcH, $w, $h);
        imagecopyresampled($dst, $src, 0, 0, $cropX, $cropY, $w, $h, $cropW, $cropH);
        imagepng($dst, DIR_FAVICONS . "/$filename", 9);
        imagedestroy($dst);
    }

    imagedestroy($src);

    // Generar favicon.ico (PNG 32x32 envuelto en contenedor ICO)
    file_put_contents(
        DIR_FAVICONS . '/favicon.ico',
        _faviconMakeIco(DIR_FAVICONS . '/favicon-32x32.png')
    );

    $mtime = filemtime(DIR_FAVICONS . '/favicon-32x32.png');
    sendJSON([
        'ok'      => true,
        'preview' => "newsday-api.php?action=favicon-preview&_={$mtime}",
    ]);
}

/** Carga una imagen GD a partir de su MIME type */
function _faviconLoadGD(string $path, string $mime) {
    return match($mime) {
        'image/jpeg' => @imagecreatefromjpeg($path),
        'image/gif'  => @imagecreatefromgif($path),
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
        default      => @imagecreatefrompng($path),
    };
}

/**
 * Calcula el rectángulo de recorte centrado para una imagen fuente
 * que se redimensionará a $dstW x $dstH manteniendo aspecto.
 */
function _faviconCropRect(int $srcW, int $srcH, int $dstW, int $dstH): array {
    $srcAspect = $srcW / $srcH;
    $dstAspect = $dstW / $dstH;

    if ($srcAspect > $dstAspect) {
        // Fuente más ancha → recortar lados
        $cropH = $srcH;
        $cropW = (int)round($srcH * $dstAspect);
        $cropX = (int)round(($srcW - $cropW) / 2);
        $cropY = 0;
    } else {
        // Fuente más alta → recortar arriba/abajo
        $cropW = $srcW;
        $cropH = (int)round($srcW / $dstAspect);
        $cropX = 0;
        $cropY = (int)round(($srcH - $cropH) / 2);
    }
    return [$cropX, $cropY, $cropW, $cropH];
}

/**
 * Crea un archivo .ico mínimo con un PNG incrustado (formato PNG-in-ICO).
 * Compatible con Windows Vista+, Chrome, Firefox, Safari, Edge.
 */
function _faviconMakeIco(string $pngPath): string {
    $png    = file_get_contents($pngPath);
    $pngLen = strlen($png);
    $img    = imagecreatefrompng($pngPath);
    $w      = imagesx($img);
    $h      = imagesy($img);
    imagedestroy($img);

    // Cabecera ICO (6 bytes): reserved=0, type=1 (ICO), count=1
    $header = pack('vvv', 0, 1, 1);

    // Entrada de directorio (16 bytes)
    $dataOffset = 6 + 16;
    $entry = pack('CCCCvvVV',
        $w > 255 ? 0 : $w,   // ancho (0 = 256)
        $h > 255 ? 0 : $h,   // alto  (0 = 256)
        0,                    // colores en paleta (0 = truecolor)
        0,                    // reservado
        1,                    // planos de color
        32,                   // bits por píxel
        $pngLen,              // tamaño de los datos de imagen
        $dataOffset           // desplazamiento hasta los datos
    );

    return $header . $entry . $png;
}

// ════════════════════════════════════════════════════════════════
//  PREVIEW — sirve el PNG 32x32 al admin
// ════════════════════════════════════════════════════════════════
function serveFaviconPreview(): void {
    $f = DIR_FAVICONS . '/favicon-32x32.png';
    if (!is_file($f)) { http_response_code(404); exit; }
    ob_clean();
    header('Content-Type: image/png');
    header('Cache-Control: no-cache, must-revalidate');
    readfile($f);
    exit;
}

// ════════════════════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════════════════════
function deleteFavicon(): void {
    if (!is_dir(DIR_FAVICONS)) { sendJSON(['ok' => true]); return; }
    foreach (scandir(DIR_FAVICONS) as $f) {
        if ($f === '.' || $f === '..') continue;
        unlink(DIR_FAVICONS . "/$f");
    }
    rmdir(DIR_FAVICONS);
    sendJSON(['ok' => true]);
}

// ════════════════════════════════════════════════════════════════
//  UTILIDADES para generate.php
// ════════════════════════════════════════════════════════════════

/** Copia los archivos de favicon generados al directorio public/. */
function copyFaviconsToPublic(string $publicDir): array {
    $copied = [];
    if (!is_dir(DIR_FAVICONS)) return $copied;
    $files = ['favicon.ico','favicon-16x16.png','favicon-32x32.png',
              'apple-touch-icon.png','icon-192.png','icon-512.png'];
    foreach ($files as $f) {
        $src = DIR_FAVICONS . "/$f";
        if (!is_file($src)) continue;
        copy($src, "$publicDir/$f");
        $copied[] = $f;
    }
    return $copied;
}

/**
 * Retorna las etiquetas <link> de favicon y otros extras para el <head>
 * de las páginas generadas. Devuelve '' si no hay favicon o baseUrl está vacío
 * (preview con URLs relativas).
 */
function ndHeadExtras(string $baseUrl, string $siteName = ''): string {
    if ($baseUrl === '') return '';   // en preview no aplica
    $b    = rtrim($baseUrl, '/');
    $tags = [];

    // Favicon
    if (is_file(DIR_FAVICONS . '/favicon-32x32.png')) {
        $tags[] = "<link rel=\"icon\" type=\"image/x-icon\" href=\"{$b}/favicon.ico\">";
        $tags[] = "<link rel=\"icon\" type=\"image/png\" sizes=\"32x32\" href=\"{$b}/favicon-32x32.png\">";
        $tags[] = "<link rel=\"icon\" type=\"image/png\" sizes=\"16x16\" href=\"{$b}/favicon-16x16.png\">";
        $tags[] = "<link rel=\"apple-touch-icon\" sizes=\"180x180\" href=\"{$b}/apple-touch-icon.png\">";
    }

    // Web App Manifest
    $tags[] = "<link rel=\"manifest\" href=\"{$b}/manifest.json\">";

    // RSS autodiscovery
    $snE  = htmlspecialchars($siteName ?: 'Feed');
    $tags[] = "<link rel=\"alternate\" type=\"application/rss+xml\" title=\"{$snE}\" href=\"{$b}/feed.xml\">";

    return implode("\n", $tags);
}

/**
 * Inyecta las etiquetas extra en el <head> de todos los HTML del directorio.
 * Similar a injectPreviewNavTracker pero para favicon/manifest/RSS.
 */
function ndInjectHeadExtras(string $dir, string $baseUrl, string $siteName = ''): void {
    $extras = ndHeadExtras($baseUrl, $siteName);
    if (!$extras) return;

    $rii = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    foreach ($rii as $file) {
        if ($file->getExtension() !== 'html') continue;
        $html = file_get_contents($file->getPathname());
        // Evitar doble inyección
        if (str_contains($html, 'favicon.ico') || str_contains($html, 'rel="manifest"')) continue;
        $patched = str_replace('</head>', $extras . "\n</head>", $html);
        if ($patched !== $html) file_put_contents($file->getPathname(), $patched);
    }
}
