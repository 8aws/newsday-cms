<?php
/**
 * plugins.php — Gestión de plugins de componentes
 *
 * Endpoints:
 *   GET  ?action=list-plugins         Lista plugins instalados + estado activo
 *   POST ?action=install-plugin       Instala un ZIP de plugin
 *   POST ?action=delete-plugin        Elimina un plugin instalado
 *   POST ?action=toggle-plugin        Activa / desactiva un plugin
 *   GET  ?action=get-plugin-js&id=xx  Sirve el JS de un plugin
 */

// ── Rutas ─────────────────────────────────────────────────────
if (!defined('DIR_PLUGINS'))      define('DIR_PLUGINS',      __DIR__ . '/../plugins');
if (!defined('FILE_PLUGINS_STATE')) define('FILE_PLUGINS_STATE', __DIR__ . '/../content/plugins-state.json');

// Crear directorio de plugins si no existe
if (!is_dir(DIR_PLUGINS)) mkdir(DIR_PLUGINS, 0755, true);

// ── Leer/escribir estado ──────────────────────────────────────
function pluginsReadState(): array {
    if (!is_file(FILE_PLUGINS_STATE)) return [];
    return json_decode(file_get_contents(FILE_PLUGINS_STATE), true) ?: [];
}

function pluginsWriteState(array $state): void {
    file_put_contents(FILE_PLUGINS_STATE, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// ── Leer manifest de un plugin ────────────────────────────────
function pluginReadManifest(string $id): ?array {
    $f = DIR_PLUGINS . "/$id/plugin.json";
    if (!is_file($f)) return null;
    $data = json_decode(file_get_contents($f), true);
    return is_array($data) ? $data : null;
}

// ── Sanitizar ID de plugin ────────────────────────────────────
function pluginSafeId(string $raw): string {
    return preg_replace('/[^a-z0-9_-]/', '', strtolower(trim($raw)));
}

// ════════════════════════════════════════════════════════════════
//  LIST
// ════════════════════════════════════════════════════════════════
function listPlugins(): void {
    $state   = pluginsReadState();
    $plugins = [];

    if (!is_dir(DIR_PLUGINS)) { sendJSON($plugins); return; }

    foreach (scandir(DIR_PLUGINS) as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        $dir = DIR_PLUGINS . "/$entry";
        if (!is_dir($dir)) continue;

        $manifest = pluginReadManifest($entry);
        if (!$manifest) continue;

        $jsFile  = "$dir/$entry.js";
        $plugins[] = [
            'id'       => $entry,
            'name'     => $manifest['name']    ?? $entry,
            'version'  => $manifest['version'] ?? '?',
            'description' => $manifest['description'] ?? '',
            'author'   => $manifest['author']  ?? '',
            'type'     => $manifest['type']    ?? 'component',
            'components'=> array_map(fn($c) => [
                'type' => $c['type'] ?? '',
                'lb'   => $c['lb']   ?? $c['type'] ?? '',
                'ic'   => $c['ic']   ?? '🧩',
            ], $manifest['components'] ?? []),
            'active'   => $state[$entry]['active'] ?? true,
            'hasJs'    => is_file($jsFile),
        ];
    }

    sendJSON($plugins);
}

// ════════════════════════════════════════════════════════════════
//  INSTALL (ZIP upload)
// ════════════════════════════════════════════════════════════════
function installPlugin(): void {
    if (!class_exists('ZipArchive')) {
        sendJSON(['error' => 'ZipArchive no disponible'], 500); return;
    }

    $file = $_FILES['file'] ?? null;
    if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
        sendJSON(['error' => 'No se recibió archivo o error en la subida'], 400); return;
    }
    if (!str_ends_with(strtolower($file['name']), '.zip')) {
        sendJSON(['error' => 'El archivo debe ser un .zip'], 400); return;
    }

    $zip = new ZipArchive();
    if ($zip->open($file['tmp_name']) !== true) {
        sendJSON(['error' => 'ZIP inválido'], 400); return;
    }

    // Buscar plugin.json en la raíz del ZIP
    $manifest = null;
    $pluginId  = null;

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        // Puede estar en raíz o en subcarpeta: id/plugin.json
        if (preg_match('/^([^\/]+\/)?plugin\.json$/', $name)) {
            $raw = $zip->getFromIndex($i);
            $manifest = json_decode($raw, true);
            break;
        }
    }

    if (!$manifest || empty($manifest['id'])) {
        $zip->close();
        sendJSON(['error' => 'plugin.json no encontrado o sin campo "id"'], 400); return;
    }

    $pluginId = pluginSafeId($manifest['id']);
    if (!$pluginId) {
        $zip->close();
        sendJSON(['error' => 'ID de plugin inválido'], 400); return;
    }

    $destDir = DIR_PLUGINS . "/$pluginId";
    if (!is_dir($destDir)) mkdir($destDir, 0755, true);

    // Extraer archivos del ZIP al directorio del plugin
    $extracted = [];
    $allowedExt = ['json', 'js', 'css', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'woff', 'woff2', 'ttf'];

    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (str_ends_with($name, '/')) continue;

        // Strip posible prefijo de directorio raíz en el ZIP
        $rel = preg_replace('/^[^\/]+\//', '', $name);
        if ($rel === '') continue;

        // Seguridad: no permitir traversal
        if (str_contains($rel, '..') || str_starts_with($rel, '/')) continue;

        $ext = strtolower(pathinfo($rel, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt, true) && $ext !== '') continue;

        $dest = $destDir . '/' . $rel;
        $dir  = dirname($dest);
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $content = $zip->getFromIndex($i);
        if ($content !== false) {
            file_put_contents($dest, $content);
            $extracted[] = $rel;
        }
    }

    $zip->close();

    if (empty($extracted)) {
        sendJSON(['error' => 'ZIP vacío o sin archivos válidos'], 400); return;
    }

    // Activar por defecto
    $state = pluginsReadState();
    if (!isset($state[$pluginId])) {
        $state[$pluginId] = ['active' => true, 'installedAt' => date('c')];
        pluginsWriteState($state);
    }

    sendJSON(['ok' => true, 'id' => $pluginId, 'extracted' => count($extracted)]);
}

// ════════════════════════════════════════════════════════════════
//  DELETE
// ════════════════════════════════════════════════════════════════
function deletePlugin(): void {
    $body = jsonBody();
    $id   = pluginSafeId($body['id'] ?? '');
    if (!$id) { sendJSON(['error' => 'ID requerido'], 400); return; }

    $dir = DIR_PLUGINS . "/$id";
    if (!is_dir($dir)) { sendJSON(['error' => 'Plugin no encontrado'], 404); return; }

    // Eliminar recursivamente
    $iter = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($iter as $f) {
        $f->isDir() ? rmdir($f->getRealPath()) : unlink($f->getRealPath());
    }
    rmdir($dir);

    // Eliminar del estado
    $state = pluginsReadState();
    unset($state[$id]);
    pluginsWriteState($state);

    sendJSON(['ok' => true]);
}

// ════════════════════════════════════════════════════════════════
//  TOGGLE (activar / desactivar)
// ════════════════════════════════════════════════════════════════
function togglePlugin(): void {
    $body   = jsonBody();
    $id     = pluginSafeId($body['id'] ?? '');
    $active = isset($body['active']) ? (bool)$body['active'] : true;

    if (!$id) { sendJSON(['error' => 'ID requerido'], 400); return; }
    if (!is_dir(DIR_PLUGINS . "/$id")) { sendJSON(['error' => 'Plugin no encontrado'], 404); return; }

    $state       = pluginsReadState();
    $state[$id]  = array_merge($state[$id] ?? [], ['active' => $active]);
    pluginsWriteState($state);

    sendJSON(['ok' => true, 'id' => $id, 'active' => $active]);
}

// ════════════════════════════════════════════════════════════════
//  SERVE JS
// ════════════════════════════════════════════════════════════════
function servePluginJS(): void {
    $id  = pluginSafeId($_GET['id'] ?? '');
    if (!$id) { http_response_code(400); echo '/* id required */'; exit; }

    // Verificar que el plugin está activo
    $state = pluginsReadState();
    if (isset($state[$id]['active']) && $state[$id]['active'] === false) {
        http_response_code(403); echo '/* plugin disabled */'; exit;
    }

    $file = DIR_PLUGINS . "/$id/$id.js";
    if (!is_file($file)) { http_response_code(404); echo '/* not found */'; exit; }

    ob_clean();
    header('Content-Type: application/javascript; charset=utf-8');
    header('Cache-Control: no-cache');
    readfile($file);
    exit;
}

// ════════════════════════════════════════════════════════════════
//  PLUGINS BUNDLE — sirve todos los JS activos en una sola respuesta
// ════════════════════════════════════════════════════════════════
function servePluginsBundle(): void {
    $ids   = getActivePluginIds();
    $count = count($ids);

    ob_clean();
    header('Content-Type: application/javascript; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');

    echo "/* Newsday plugins-bundle — {$count} plugin(s) */\n";
    echo "if(typeof ND!=='undefined'){ND.setExpected({$count});}\n\n";

    foreach ($ids as $id) {
        $file = DIR_PLUGINS . "/{$id}/{$id}.js";
        if (!is_file($file)) {
            echo "/* plugin:{$id} — archivo JS no encontrado */\n\n";
            continue;
        }
        echo "/* ── plugin: {$id} ── */\n";
        echo file_get_contents($file);
        echo "\n\n";
    }
    exit;
}

// ════════════════════════════════════════════════════════════════
//  UTILIDAD: obtener lista de plugins activos para generate.php
// ════════════════════════════════════════════════════════════════
function getActivePluginIds(): array {
    $state   = pluginsReadState();
    $active  = [];
    if (!is_dir(DIR_PLUGINS)) return $active;
    foreach (scandir(DIR_PLUGINS) as $entry) {
        if ($entry === '.' || $entry === '..') continue;
        if (!is_dir(DIR_PLUGINS . "/$entry")) continue;
        $isActive = $state[$entry]['active'] ?? true;
        if ($isActive) $active[] = $entry;
    }
    return $active;
}

// Devuelve CSS concatenado de todos los plugins activos (para generate.php)
function getActivePluginsCSS(): string {
    $css = [];
    foreach (getActivePluginIds() as $id) {
        $manifest = pluginReadManifest($id);
        if (!$manifest) continue;
        foreach ($manifest['components'] ?? [] as $comp) {
            if (!empty($comp['css'])) {
                $css[] = "/* plugin:{$id}:{$comp['type']} */\n" . $comp['css'];
            }
        }
    }
    return implode("\n", $css);
}
