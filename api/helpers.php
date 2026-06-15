<?php
/**
 * helpers.php — Utilidades compartidas
 * JSON, IDs, slugs, URLs relativas, sistema de ficheros
 */

// ════════════════════════════════════════════════════════════════
//  JSON / HTTP
// ════════════════════════════════════════════════════════════════

function sendJSON(array $data, int $code = 200): void {
    ob_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    return json_decode($raw, true) ?? [];
}

function readJSON(string $path): ?array {
    if (!is_file($path)) return null;
    return json_decode(file_get_contents($path), true);
}

function writeJSON(string $path, array $data): void {
    file_put_contents(
        $path,
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

// ════════════════════════════════════════════════════════════════
//  STRING / ID
// ════════════════════════════════════════════════════════════════

function safeId(string $id): string {
    return substr(preg_replace('/[^a-zA-Z0-9_\-]/', '_', $id), 0, 120);
}

function makeSlug(string $str): string {
    $str = mb_strtolower(trim($str));
    $str = strtr($str, [
        'á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ñ'=>'n','ü'=>'u',
        'Á'=>'a','É'=>'e','Í'=>'i','Ó'=>'o','Ú'=>'u','Ñ'=>'n',
    ]);
    $str = preg_replace('/[^a-z0-9]+/', '-', $str);
    $str = trim($str, '-');
    return substr($str, 0, 80) ?: 'post';
}

function safeFilename(string $name): string {
    return preg_replace('/[^\w\-]/', '_', $name);
}

// ════════════════════════════════════════════════════════════════
//  URLS RELATIVAS
// ════════════════════════════════════════════════════════════════

/**
 * Enlace relativo o absoluto según si hay baseUrl.
 * $depth = niveles de carpeta desde public/ (0=índice, 1=post, 2=tag/xxx).
 */
function relLink(string $baseUrl, string $path, int $depth = 0): string {
    if ($baseUrl !== '') {
        return $path !== '' ? "$baseUrl/$path" : "$baseUrl/";
    }
    $up = $depth > 0 ? str_repeat('../', $depth) : '';
    return $up . $path;
}

function relHome(string $baseUrl, int $depth = 0): string {
    if ($baseUrl !== '') return "$baseUrl/";
    return $depth > 0 ? str_repeat('../', $depth) : './';
}

/**
 * URL para un recurso de media (vive en public/media/ tras la copia).
 * URLs absolutas (http://) se devuelven sin modificar.
 */
function relMedia(string $baseUrl, string $url, int $depth = 0): string {
    if ($url === '') return '';
    if (
        str_starts_with($url, 'http://') ||
        str_starts_with($url, 'https://') ||
        str_starts_with($url, '//')
    ) {
        return $url;
    }
    if ($baseUrl !== '') return "$baseUrl/$url";
    $up = $depth > 0 ? str_repeat('../', $depth) : '';
    return $up . $url;
}

/**
 * Reescribe src="media/..." href="media/..." en HTML arbitrario
 * para que apunten a la ruta correcta según profundidad o baseUrl.
 */
function rewriteContentMediaUrls(string $html, string $baseUrl, int $depth = 0): string {
    if ($html === '') return $html;
    return preg_replace_callback(
        '/(src|href)="(media\/[^"]*)"/',
        function ($m) use ($baseUrl, $depth) {
            $fixed = relMedia($baseUrl, $m[2], $depth);
            return $m[1] . '="' . htmlspecialchars($fixed, ENT_QUOTES | ENT_HTML5) . '"';
        },
        $html
    );
}

/**
 * Añade /public al base URL si no termina en un subfolder conocido.
 */
function normalizeBaseUrl(string $rawUrl): string {
    $url = rtrim(trim($rawUrl), '/');
    if ($url === '') return '';
    $lower = strtolower($url);
    foreach (['/public','/www','/web','/dist','/site','/html','/htdocs','/httpdocs'] as $p) {
        if (str_ends_with($lower, $p)) return $url;
    }
    return $url . '/public';
}

// ════════════════════════════════════════════════════════════════
//  SISTEMA DE FICHEROS
// ════════════════════════════════════════════════════════════════

/** Elimina directorio recursivamente */
function rrmdir(string $dir): void {
    if (!is_dir($dir)) return;
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = "$dir/$item";
        is_dir($path) ? rrmdir($path) : unlink($path);
    }
    rmdir($dir);
}

/** Copia directorio recursivamente */
function copyr(string $src, string $dst): void {
    if (!is_dir($src)) return;
    if (!is_dir($dst)) mkdir($dst, 0755, true);
    foreach (scandir($src) as $item) {
        if ($item === '.' || $item === '..') continue;
        $s = "$src/$item";
        $d = "$dst/$item";
        is_dir($s) ? copyr($s, $d) : copy($s, $d);
    }
}

/** Añade un directorio al ZIP recursivamente */
function addDirToZip(ZipArchive $zip, string $dir, string $base): void {
    if (!is_dir($dir)) return;
    $zip->addEmptyDir($base);
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = "$dir/$item";
        if (is_dir($path)) addDirToZip($zip, $path, "$base/$item");
        else $zip->addFile($path, "$base/$item");
    }
}
