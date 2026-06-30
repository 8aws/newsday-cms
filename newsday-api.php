<?php
/**
 * Newsday API v1.0 — Router principal
 *
 * La lógica está dividida en módulos bajo api/:
 *   helpers.php     — utilidades (URL, JSON, archivos, strings)
 *   auth.php        — autenticación multi-usuario + roles
 *   panel-users.php — gestión de usuarios del panel
 *   readers.php     — gestión de lectores web
 *   crud.php        — posts y páginas estáticas
 *   media.php       — gestión de archivos multimedia
 *   config.php      — site-config, temas, layouts, mantenimiento, stats
 *   backup.php      — backup/restore local y en servidor
 *   html.php        — constructores de páginas HTML (buildPostPage, etc.)
 *   generate.php    — generación de sitio estático y preview
 *
 * Endpoints disponibles:
 *   POST  ?action=login
 *   POST  ?action=logout
 *   GET   ?action=check
 *   GET   ?action=me                   → info del usuario actual + permisos
 *   GET   ?action=ping
 *   --- Posts ---
 *   GET   ?action=posts
 *   GET   ?action=post&id=xxx
 *   POST  ?action=save
 *   POST  ?action=delete
 *   --- Páginas estáticas ---
 *   GET   ?action=pages
 *   POST  ?action=save-page
 *   POST  ?action=delete-page
 *   --- Media ---
 *   GET   ?action=media
 *   POST  ?action=upload
 *   POST  ?action=delete-media
 *   --- Layouts ---
 *   GET   ?action=layouts
 *   POST  ?action=save-layout
 *   POST  ?action=delete-layout
 *   --- Generación ---
 *   POST  ?action=generate
 *   POST  ?action=generate-preview
 *   GET   ?action=check-site
 *   --- Configuración ---
 *   GET   ?action=config
 *   POST  ?action=save-config
 *   GET   ?action=site-config
 *   POST  ?action=save-site-config
 *   --- Mantenimiento ---
 *   GET/POST ?action=maintenance
 *   --- Temas e idiomas ---
 *   GET   ?action=themes
 *   GET   ?action=list-ui-langs
 *   GET   ?action=list-content-langs
 *   --- Stats ---
 *   GET   ?action=stats
 *   --- Backup ---
 *   GET   ?action=backup
 *   POST  ?action=restore
 *   GET   ?action=list-backups
 *   POST  ?action=create-server-backup
 *   POST  ?action=delete-backup
 *   GET   ?action=download-backup&file=xxx
 *   POST  ?action=auto-backup-config
 *   --- Usuarios del panel (solo admin) ---
 *   GET   ?action=panel-users
 *   POST  ?action=save-panel-user
 *   POST  ?action=delete-panel-user
 *   --- Lectores web (admin, editor) ---
 *   GET   ?action=readers
 *   POST  ?action=save-reader
 *   POST  ?action=delete-reader
 *   POST  ?action=import-readers
 */

ob_start();

// Versión: fuente única en el archivo VERSION de la raíz.
$ndVersionFile = __DIR__ . '/VERSION';
define('NEWSDAY_VERSION', is_file($ndVersionFile)
    ? trim((string)file_get_contents($ndVersionFile))
    : '1.1.0');

// ── CORS ──────────────────────────────────────────────────────
// Solo se reflejan orígenes de confianza (mismo host o lista explícita en
// NEWSDAY_ALLOWED_ORIGINS). NUNCA se devuelve "*" junto a credenciales:
// reflejar cualquier origen con Allow-Credentials permitiría a cualquier web
// leer la API autenticada del usuario.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$ndHost = $_SERVER['HTTP_HOST'] ?? '';
$ndAllowedOrigins = array_filter(array_map('trim', explode(
    ',',
    defined('NEWSDAY_ALLOWED_ORIGINS') ? NEWSDAY_ALLOWED_ORIGINS : ''
)));
if ($ndHost) {
    $ndAllowedOrigins[] = 'https://' . $ndHost;
    $ndAllowedOrigins[] = 'http://'  . $ndHost;
}
if ($origin && in_array($origin, $ndAllowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-NEWSDAY-Token');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── CONFIGURACIÓN ──────────────────────────────────────────────
$cfgFile    = __DIR__ . '/newsday-config.php';
$ndInstalled = file_exists($cfgFile);
if ($ndInstalled) {
    require $cfgFile;
} else {
    define('NEWSDAY_USER',      'admin');
    define('NEWSDAY_PASS_HASH', password_hash('admin', PASSWORD_DEFAULT));
    define('NEWSDAY_API_TOKEN', 'changeme');
    define('NEWSDAY_SITE_NAME', 'Newsday');
    define('NEWSDAY_BASE_URL',  '');
}

// ── RUTAS ──────────────────────────────────────────────────────
define('DIR_POSTS',        __DIR__ . '/content/posts');
define('DIR_PAGES',        __DIR__ . '/content/pages');
define('DIR_LAYOUTS',      __DIR__ . '/content/layouts');
define('DIR_MEDIA',        __DIR__ . '/media');
define('DIR_PUBLIC',       __DIR__ . '/public');
define('DIR_PREVIEW',      __DIR__ . '/preview');
define('DIR_BACKUPS',      __DIR__ . '/backups');
define('DIR_TEMAS',        __DIR__ . '/temas');
define('DIR_LANGS',        __DIR__ . '/languages');
define('DIR_PANEL_USERS',  __DIR__ . '/content/panel-users');
define('DIR_READERS',      __DIR__ . '/content/readers');
define('FILE_MEDIA_IDX',   __DIR__ . '/media/media-index.json');
define('FILE_SITE_CFG',    __DIR__ . '/content/site-config.json');
define('DIR_PLUGINS',      __DIR__ . '/plugins');
define('FILE_PLUGINS_STATE', __DIR__ . '/content/plugins-state.json');

if (!is_dir(DIR_LAYOUTS))     mkdir(DIR_LAYOUTS, 0755, true);
if (!is_dir(DIR_PANEL_USERS)) mkdir(DIR_PANEL_USERS, 0755, true);
if (!is_dir(DIR_READERS))     mkdir(DIR_READERS, 0755, true);

// ── SESIÓN ──────────────────────────────────────────────────────
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
        || ($_SERVER['HTTP_X_FORWARDED_SSL']   ?? '') === 'on';
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'samesite' => 'Lax',
    'httponly' => true, 'secure' => $isHttps,
]);
session_name('newsday_sess');
@session_start();

// ── MÓDULOS ──────────────────────────────────────────────────────
require __DIR__ . '/api/helpers.php';
require __DIR__ . '/api/auth.php';
require __DIR__ . '/api/panel-users.php';
require __DIR__ . '/api/readers.php';
require __DIR__ . '/api/crud.php';
require __DIR__ . '/api/media.php';
require __DIR__ . '/api/html.php';
require __DIR__ . '/api/generate.php';
require __DIR__ . '/api/config.php';
require __DIR__ . '/api/backup.php';
require __DIR__ . '/api/update.php';
require __DIR__ . '/api/plugins.php';
require __DIR__ . '/api/favicon.php';

// Inicializar fichero de usuarios al primer arranque (migración desde config)
initPanelUsersFile();

// ── ROUTER ──────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';

// Acciones sin autenticación
if ($action === 'login')  { doLogin();  exit; }
if ($action === 'check')  { sendJSON(['auth' => isAuth(), 'installed' => $ndInstalled]); }
if ($action === 'logout') { doLogout(); }
if ($action === 'ping')   { sendJSON(['ok' => true, 'ts' => time()]); exit; }

// Barrera de autenticación
if (!isAuth()) {
    ob_clean();
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

// ── BARRERA DE AUTORIZACIÓN ───────────────────────────────────────
// Acciones que escriben código ejecutable, alteran la configuración de
// seguridad o gestionan respaldos: SOLO admin. Mantener esta lista como
// fuente única evita que un endpoint sensible quede sin protección por
// olvidar un requireRole() dentro del módulo.
const NEWSDAY_ADMIN_ONLY = [
    // Actualizaciones (sobrescriben PHP → RCE si no se protege)
    'apply-update', 'export-update',
    // Plugins (escriben JS servido a todos los visitantes)
    'install-plugin', 'delete-plugin', 'toggle-plugin',
    // Temas (escriben CSS/HTML/plantillas)
    'save-theme', 'delete-theme', 'upload-theme',
    // Configuración global y mantenimiento
    'save-config', 'save-site-config', 'auto-backup-config',
    // Respaldos
    'backup', 'restore', 'create-server-backup', 'delete-backup',
    'download-backup',
    // Favicon (escribe en disco)
    'save-favicon', 'delete-favicon',
];
$isMaintenanceWrite = ($action === 'maintenance' && $_SERVER['REQUEST_METHOD'] === 'POST');
if (in_array($action, NEWSDAY_ADMIN_ONLY, true) || $isMaintenanceWrite) {
    requireRole(['admin']);   // responde 403 y termina si no es admin
}

switch ($action) {
    // Usuario actual
    case 'me':                  getCurrentUserInfo();    break;

    // Posts
    case 'posts':               getPosts();              break;
    case 'post':                getPost();               break;
    case 'save':                savePost();              break;
    case 'delete':              deletePost();            break;

    // Páginas estáticas
    case 'pages':               getPagesList();          break;
    case 'save-page':           savePageItem();          break;
    case 'delete-page':         deletePageItem();        break;

    // Constructor visual de páginas
    case 'get-page-builder':    getPageBuilder();        break;
    case 'save-page-builder':   savePageBuilder();       break;

    // Media
    case 'media':               getMedia();              break;
    case 'upload':              uploadMedia();           break;
    case 'delete-media':        deleteMedia();           break;

    // Layouts (plantillas de Maquetar)
    case 'layouts':             listLayouts();           break;
    case 'save-layout':         saveLayout();            break;
    case 'delete-layout':       deleteLayout();          break;

    // Generación
    case 'generate':            generateSite();          break;
    case 'generate-preview':    generatePreview();       break;
    case 'check-site':
        sendJSON(['exists' => is_file(DIR_PUBLIC . '/index.html')]);
        break;

    // Configuración
    case 'config':              getConfig();             break;
    case 'save-config':         saveConfig();            break;
    case 'site-config':         getSiteCfg();            break;
    case 'save-site-config':    saveSiteCfg();           break;

    // Mantenimiento
    case 'maintenance':
        $_SERVER['REQUEST_METHOD'] === 'POST' ? setMaintenance() : getMaintenance();
        break;

    // Temas e idiomas
    case 'themes':              listThemes();            break;
    case 'get-theme':           getTheme();              break;
    case 'save-theme':          saveTheme();             break;
    case 'delete-theme':        deleteTheme();           break;
    case 'upload-theme':        uploadTheme();           break;
    case 'list-ui-langs':       listUILangs();           break;
    case 'list-content-langs':  listContentLangs();      break;

    // Stats
    case 'stats':               getSiteStats();          break;

    // Actualizaciones
    case 'apply-update':        applyUpdate();           break;
    case 'export-update':       exportUpdate();          break;
    case 'nd-version':
        sendJSON(['version' => NEWSDAY_VERSION]);
        break;

    // Plugins
    case 'list-plugins':        listPlugins();           break;
    case 'install-plugin':      installPlugin();         break;
    case 'delete-plugin':       deletePlugin();          break;
    case 'toggle-plugin':       togglePlugin();          break;
    case 'get-plugin-js':       servePluginJS();         break;
    case 'plugins-bundle':      servePluginsBundle();    break;

    // Favicon
    case 'get-favicon':         getFaviconState();       break;
    case 'save-favicon':        saveFavicon();           break;
    case 'delete-favicon':      deleteFavicon();         break;
    case 'favicon-preview':     serveFaviconPreview();   break;

    // Backup/restore
    case 'backup':              doBackup();              break;
    case 'restore':             doRestore();             break;
    case 'list-backups':        listBackups();           break;
    case 'create-server-backup': createServerBackup();  break;
    case 'delete-backup':       deleteServerBackup();    break;
    case 'download-backup':     downloadServerBackup();  break;
    case 'auto-backup-config':  saveAutoBackupConfig();  break;

    // Usuarios del panel (solo admin)
    case 'panel-users':         listPanelUsers();        break;
    case 'save-panel-user':     savePanelUser();         break;
    case 'delete-panel-user':   deletePanelUser();       break;

    // Lectores web (admin, editor)
    case 'readers':             listReaders();           break;
    case 'save-reader':         saveReader();            break;
    case 'delete-reader':       deleteReader();          break;
    case 'import-readers':      importReaders();         break;

    default:
        sendJSON(['error' => "Acción desconocida: $action"], 400);
}
