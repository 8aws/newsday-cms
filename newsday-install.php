<?php
/**
 * Newsday Installer v0.8
 * ──────────────────────────────────────────────────────────────
 * Instalación inicial o reinstalación completa.
 * Para ACTUALIZAR una instalación existente usa migrate.php.
 *
 * Tras la instalación este archivo se renombra automáticamente
 * a newsday-install.php.trash. Para reinstalar, elimínalo primero
 * o marca «Reinstalar» en el formulario.
 */
ob_start(); // Buffer de salida: permite enviar headers (sesión, redirect) aunque haya whitespace

// Versión: fuente única en el archivo VERSION de la raíz.
$ndVersionFile = __DIR__ . '/VERSION';
define('ND_VERSION', is_file($ndVersionFile)
    ? trim((string)file_get_contents($ndVersionFile))
    : '1.1.0');

// ── Detección de instalación previa ───────────────────────────
$configFile       = __DIR__ . '/newsday-config.php';
$versionFile      = __DIR__ . '/content/nd-version.json';
$alreadyInstalled = file_exists($configFile);

// Detectar versión actual si hay instalación previa
$installedVersion = '';
if ($alreadyInstalled) {
    if (is_file($versionFile)) {
        $vd = json_decode(file_get_contents($versionFile), true);
        $installedVersion = $vd['version'] ?? '?';
    } elseif (is_file(__DIR__ . '/content/site-config.json')) {
        $sd = json_decode(file_get_contents(__DIR__ . '/content/site-config.json'), true);
        $installedVersion = $sd['ndVersion'] ?? '≤0.7';
    }
}
$needsMigration = $alreadyInstalled && $installedVersion !== ND_VERSION;

// ── Comprobaciones de requisitos ──────────────────────────────
$checks = [
    'PHP ≥ 8.1'           => version_compare(PHP_VERSION, '8.1', '>='),
    'ZipArchive'          => class_exists('ZipArchive'),
    'GD / getimagesize'   => function_exists('getimagesize'),
    'fileinfo (MIME)'     => function_exists('mime_content_type'),
    'Sessions'            => function_exists('session_start'),
    'Escritura en disco'  => is_writable(__DIR__),
];
$allOk = !in_array(false, $checks, true);

$error = '';

// ── Procesar formulario ───────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if ($alreadyInstalled && empty($_POST['force'])) {
        $error = 'Newsday ya está instalado. Marca «Reinstalar» si quieres sobreescribir la configuración actual. Para actualizar a v' . ND_VERSION . ' sin perder datos, usa migrate.php.';
    } else {
        $siteName    = trim($_POST['siteName'] ?? '');
        $baseUrlRaw  = trim($_POST['baseUrl'] ?? '');
        $user        = trim($_POST['user'] ?? 'admin') ?: 'admin';
        $pass        = $_POST['pass']  ?? '';
        $pass2       = $_POST['pass2'] ?? '';
        $contentLang = trim($_POST['contentLang'] ?? 'es') ?: 'es';

        // Normalizar URL base (vacía = rutas relativas, OK)
        $baseUrl = '';
        if ($baseUrlRaw !== '') {
            if (!preg_match('#^https?://#i', $baseUrlRaw)) {
                $baseUrlRaw = 'https://' . $baseUrlRaw;
            }
            $baseUrl = rtrim($baseUrlRaw, '/');
        }

        if (!$siteName)            $error = 'El nombre del sitio es obligatorio.';
        elseif (!$pass)            $error = 'La contraseña es obligatoria.';
        elseif ($pass !== $pass2)  $error = 'Las contraseñas no coinciden.';
        elseif (strlen($pass) < 6) $error = 'La contraseña debe tener al menos 6 caracteres.';
        elseif (!$allOk)           $error = 'No se puede instalar: faltan requisitos del servidor.';
        else {
            $hash  = password_hash($pass, PASSWORD_DEFAULT);
            $token = bin2hex(random_bytes(20));

            // ── 1. Escribir newsday-config.php ────────────────
            $cfgLines = [
                '<?php',
                '// Newsday Configuration — ' . date('Y-m-d H:i:s'),
                "define('NEWSDAY_USER',      " . var_export($user,     true) . ');',
                "define('NEWSDAY_PASS_HASH', " . var_export($hash,     true) . ');',
                "define('NEWSDAY_API_TOKEN', " . var_export($token,    true) . ');',
                "define('NEWSDAY_SITE_NAME', " . var_export($siteName, true) . ');',
                "define('NEWSDAY_BASE_URL',  " . var_export($baseUrl,  true) . ');',
            ];
            if (!file_put_contents($configFile, implode("\n", $cfgLines) . "\n")) {
                $error = 'No se pudo escribir newsday-config.php — comprueba permisos (chmod 755).';
            }
        }

        if (!$error) {
            // ── 2. Crear estructura de carpetas ───────────────
            $dirs = [
                'content/posts',
                'content/pages',
                'content/layouts',
                'content/panel-users',   // v0.8
                'content/readers',       // v0.8
                'media/images',
                'media/audio',
                'media/video',
                'media/docs',
                'public',
                'preview',
                'backups',
                'temas',
                'languages/interface',
                'languages/content',
                'admin/js',
                'admin/css',
            ];
            foreach ($dirs as $d) {
                $p = __DIR__ . '/' . $d;
                if (!is_dir($p)) mkdir($p, 0755, true);
            }

            // ── 3. Proteger carpetas privadas con .htaccess ───
            $deny = "Order Deny,Allow\nDeny from all\n";
            foreach (['content', 'backups'] as $protected) {
                $ht = __DIR__ . "/$protected/.htaccess";
                if (!file_exists($ht)) file_put_contents($ht, $deny);
            }

            // ── 4. Crear site-config.json con defaults ────────
            $siteCfgFile = __DIR__ . '/content/site-config.json';
            if (!file_exists($siteCfgFile)) {
                $siteCfg = [
                    'nav'               => [],
                    'adZones'           => [],
                    'headerBlocks'      => [],
                    'footerBlocks'      => [],
                    'theme'             => 'newsday',
                    'contentLangs'      => [$contentLang],
                    'maintenance'       => ['active' => false, 'page' => ''],
                    'autoBackup'        => ['enabled' => false, 'keepDays' => 7],
                    'readerRegistration'=> true,     // v0.8
                    'siteStructure'     => ['homepage' => 'posts', 'homepageRef' => '', 'activePortada' => ''],
                    'ndVersion'         => ND_VERSION,
                ];
                file_put_contents($siteCfgFile, json_encode($siteCfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }

            // ── 5. Crear fichero de versión ───────────────────
            $vfDir = dirname($versionFile);
            if (!is_dir($vfDir)) mkdir($vfDir, 0755, true);
            file_put_contents($versionFile, json_encode(
                ['version' => ND_VERSION, 'installedAt' => date('c')],
                JSON_PRETTY_PRINT
            ));

            // ── 6. Crear usuarios del panel (users.json) ──────  v0.8
            $usersFile = __DIR__ . '/content/panel-users/users.json';
            if (!file_exists($usersFile)) {
                $users = [[
                    'id'          => 'admin',
                    'username'    => $user,
                    'passHash'    => $hash,
                    'role'        => 'admin',
                    'displayName' => 'Administrador',
                    'email'       => '',
                    'createdAt'   => date('c'),
                ]];
                file_put_contents($usersFile, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }

            // ── 7. Crear readers.json vacío ─────────────────── v0.8
            $readersFile = __DIR__ . '/content/readers/readers.json';
            if (!file_exists($readersFile)) {
                file_put_contents($readersFile, '[]');
            }

            // ── 8. Marcadores de idioma de contenido ──────────
            $contentLangs = [
                'es' => ['_name' => 'Español',  '_native' => 'Español', '_code' => 'es'],
                'en' => ['_name' => 'English',   '_native' => 'English',  '_code' => 'en'],
            ];
            foreach ($contentLangs as $code => $meta) {
                $f = __DIR__ . "/languages/content/$code.json";
                if (!file_exists($f)) file_put_contents($f, json_encode($meta, JSON_PRETTY_PRINT));
            }

            // ── 9. Traducción inglesa de la interfaz ──────────
            $enLang = __DIR__ . '/languages/interface/en.json';
            if (!file_exists($enLang)) {
                $en = [
                    '_name' => 'English', '_native' => 'English', '_code' => 'en',
                    'tab.dashboard' => 'Dashboard', 'tab.escribir' => 'Write',
                    'tab.maquetar'  => 'Layout',    'tab.organizar' => 'Organize',
                    'tab.modelar'   => 'Design',    'tab.medios' => 'Media',
                    'tab.publicar'  => 'Publish',   'tab.ajustes' => 'Settings',
                    'topbar.save'   => 'Save',      'topbar.logout' => 'Log out',
                    'pub.preview.btn'  => '🔍 Generate preview',
                    'pub.generate.btn' => '⚡ Generate site',
                ];
                file_put_contents($enLang, json_encode($en, JSON_PRETTY_PRINT));
            }

            // ── 10. Temas por defecto ─────────────────────────
            $temasDefault = [
                'newsday' => [
                    'id' => 'newsday', 'name' => 'Newsday',
                    'description' => 'El tema original — cabecera azul medianoche, fondo gris perla y tipografía editorial.',
                    'preview' => ['header' => '#12122a', 'accent' => '#5068e8', 'body' => '#e8ebf0'],
                    'vars' =>
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
                        '--th-fallback-accent:#7c9ff5;',
                ],
                'claro' => [
                    'id' => 'claro', 'name' => 'Claro',
                    'description' => 'Diseño luminoso y aireado — cabecera zafiro, fondo blanco roto e interfaz sans-serif moderna.',
                    'preview' => ['header' => '#2563eb', 'accent' => '#2563eb', 'body' => '#f8fafc'],
                    'vars' =>
                        '--th-header-bg:#2563eb;--th-header-fg:#ffffff;' .
                        '--th-nav-bg:#dbeafe;--th-nav-fg:#1e40af;' .
                        '--th-footer-bg:#f1f5f9;--th-footer-fg:#64748b;' .
                        '--th-body-bg:#f8fafc;--th-wrap-bg:#ffffff;' .
                        '--th-wrap-shadow:0 2px 16px rgba(37,99,235,.08);' .
                        '--th-text:#1e293b;--th-heading:#0f172a;' .
                        '--th-accent:#2563eb;--th-accent-hover:#1d4ed8;' .
                        '--th-muted:#94a3b8;--th-border:#dbeafe;' .
                        '--th-sidebar-bg:#eff6ff;--th-sidebar-border:#bfdbfe;' .
                        '--th-pullquote-bg:#eff6ff;--th-pullquote-fg:#1e40af;--th-pullquote-border:#2563eb;' .
                        '--th-card-bg:#ffffff;--th-card-border:#dbeafe;' .
                        '--th-tag-bg:#dbeafe;--th-tag-fg:#1e40af;' .
                        '--th-body-font:system-ui,sans-serif;--th-ui-font:system-ui,sans-serif;' .
                        '--th-fallback-accent:#93c5fd;',
                ],
                'oscuro' => [
                    'id' => 'oscuro', 'name' => 'Oscuro',
                    'description' => 'Negro puro para pantallas OLED — máximo ahorro energético, acento lavanda, texto gris suave.',
                    'preview' => ['header' => '#000000', 'accent' => '#7c9ff5', 'body' => '#0d0d0d'],
                    'vars' =>
                        '--th-header-bg:#000000;--th-header-fg:#c8d0f0;' .
                        '--th-nav-bg:#0a0a0a;--th-nav-fg:#6b7280;' .
                        '--th-footer-bg:#000000;--th-footer-fg:#4b5563;' .
                        '--th-body-bg:#000000;--th-wrap-bg:#0d0d0d;' .
                        '--th-wrap-shadow:none;' .
                        '--th-text:#9ca3af;--th-heading:#e2e8f0;' .
                        '--th-accent:#7c9ff5;--th-accent-hover:#a5b4fc;' .
                        '--th-muted:#4b5563;--th-border:#1f2937;' .
                        '--th-sidebar-bg:#111111;--th-sidebar-border:#1f2937;' .
                        '--th-pullquote-bg:#111827;--th-pullquote-fg:#93c5fd;--th-pullquote-border:#3b82f6;' .
                        '--th-card-bg:#111111;--th-card-border:#1f2937;' .
                        '--th-tag-bg:#1f2937;--th-tag-fg:#6b7280;' .
                        '--th-body-font:system-ui,sans-serif;--th-ui-font:system-ui,sans-serif;' .
                        '--th-fallback-accent:#374151;',
                ],
                'clasico' => [
                    'id' => 'clasico', 'name' => 'Clásico',
                    'description' => 'Estilo periódico impreso — cabecera negra, papel envejecido, tipografía Georgia y acento carmesí.',
                    'preview' => ['header' => '#1a1a1a', 'accent' => '#8b0000', 'body' => '#f5f0e8'],
                    'vars' =>
                        '--th-header-bg:#1a1a1a;--th-header-fg:#f5f0e8;' .
                        '--th-nav-bg:#2d2d2d;--th-nav-fg:#c8b89a;' .
                        '--th-footer-bg:#1a1a1a;--th-footer-fg:#8a7a6a;' .
                        '--th-body-bg:#f5f0e8;--th-wrap-bg:#fefcf8;' .
                        '--th-wrap-shadow:0 2px 12px rgba(0,0,0,.18);' .
                        '--th-text:#1a1a1a;--th-heading:#0a0a0a;' .
                        '--th-accent:#8b0000;--th-accent-hover:#a00000;' .
                        '--th-muted:#8a7a6a;--th-border:#d4c5a9;' .
                        '--th-sidebar-bg:#f0ead8;--th-sidebar-border:#d4c5a9;' .
                        '--th-pullquote-bg:#f9f4ec;--th-pullquote-fg:#5a2d0c;--th-pullquote-border:#8b0000;' .
                        '--th-card-bg:#fefcf8;--th-card-border:#d4c5a9;' .
                        '--th-tag-bg:#e8dcc8;--th-tag-fg:#5a4a3a;' .
                        '--th-body-font:Georgia,serif;--th-ui-font:Georgia,serif;' .
                        '--th-fallback-accent:#c8b89a;',
                ],
            ];
            foreach ($temasDefault as $id => $tData) {
                $tf = __DIR__ . "/temas/$id.php";
                if (!file_exists($tf)) {
                    $php  = "<?php\n/**\n * Tema: {$tData['name']}\n */\nreturn ";
                    $php .= var_export($tData, true) . ";\n";
                    file_put_contents($tf, $php);
                }
            }

            // ── 11. Crear / regenerar media-index.json ────────
            $mediaIndexFile = __DIR__ . '/media/media-index.json';
            $mimeMap = [
                'svg'  => 'image/svg+xml',   'png'  => 'image/png',
                'jpg'  => 'image/jpeg',       'jpeg' => 'image/jpeg',
                'gif'  => 'image/gif',        'webp' => 'image/webp',
                'avif' => 'image/avif',       'mp3'  => 'audio/mpeg',
                'ogg'  => 'audio/ogg',        'wav'  => 'audio/wav',
                'mp4'  => 'video/mp4',        'webm' => 'video/webm',
                'pdf'  => 'application/pdf',  'md'   => 'text/plain',
                'txt'  => 'text/plain',
                'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'zip'  => 'application/zip',
            ];
            $mediaEntries = [];
            foreach (['images', 'audio', 'video', 'docs'] as $sub) {
                $dir = __DIR__ . "/media/$sub";
                if (!is_dir($dir)) continue;
                foreach ((glob("$dir/*") ?: []) as $fpath) {
                    $fname = basename($fpath);
                    if ($fname[0] === '.' || !is_file($fpath)) continue;
                    $ext   = strtolower(pathinfo($fname, PATHINFO_EXTENSION));
                    $mime  = $mimeMap[$ext] ?? 'application/octet-stream';
                    $entry = [
                        'id' => 'm_' . uniqid('', true), 'filename' => $fname,
                        'subfolder' => $sub, 'mime' => $mime,
                        'size' => (int) filesize($fpath), 'url' => "media/$sub/$fname",
                        'uploadedAt' => date('c'), 'name' => pathinfo($fname, PATHINFO_FILENAME),
                    ];
                    if (in_array($mime, ['image/png','image/jpeg','image/gif','image/webp']) &&
                        function_exists('getimagesize')) {
                        $sz = @getimagesize($fpath);
                        if ($sz) { $entry['width'] = $sz[0]; $entry['height'] = $sz[1]; }
                    }
                    $mediaEntries[] = $entry;
                }
            }
            file_put_contents($mediaIndexFile,
                json_encode($mediaEntries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            // ── 12. Iniciar sesión ────────────────────────────
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                    || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
                    || ($_SERVER['HTTP_X_FORWARDED_SSL']   ?? '') === 'on';
            session_set_cookie_params([
                'lifetime' => 0, 'path' => '/',
                'samesite' => 'Lax', 'httponly' => true, 'secure' => $isHttps,
            ]);
            session_name('newsday_sess');
            session_start();
            $_SESSION['newsday_auth'] = true;
            $_SESSION['newsday_user'] = $user;
            $_SESSION['newsday_role'] = 'admin';

            // ── 13. Archivar instalador ───────────────────────
            @rename(__FILE__, __DIR__ . '/newsday-install.php.trash');

            // ── 14. Redirigir al panel (URL absoluta para máxima compatibilidad) ──
            $proto    = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                      || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
                      ? 'https' : 'http';
            $host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
            $dir      = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
            $panelUrl = $proto . '://' . $host . $dir . '/Newsday.html?installed=1';
            ob_end_clean();
            header('Location: ' . $panelUrl);
            exit;
        }
    }
}

// ── Helper visual ─────────────────────────────────────────────
function chkIcon(bool $ok): string {
    return $ok ? '<span style="color:#16a34a;font-weight:700">✓</span>'
               : '<span style="color:#dc2626;font-weight:700">✗</span>';
}

$phpVer = PHP_VERSION;
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsday — Instalación v<?= ND_VERSION ?></title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f2f5;min-height:100vh;
     display:flex;align-items:flex-start;justify-content:center;padding:32px 16px}
.card{background:#fff;border-radius:14px;padding:38px 40px;width:100%;max-width:580px;
      box-shadow:0 8px 40px rgba(0,0,0,.1)}
.logo{font-size:24px;font-weight:800;color:#5068e8}
.logo span{color:#12122a}
.sub{font-size:13px;color:#64748b;margin-top:3px;margin-bottom:28px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
   color:#94a3b8;margin:24px 0 10px}
.checks{display:grid;gap:7px}
.chk-row{display:flex;align-items:center;gap:10px;font-size:13px;color:#475569;
          background:#f8fafc;border-radius:7px;padding:7px 12px}
.sep{height:1px;background:#f1f5f9;margin:22px 0}
label{display:block;font-size:13px;font-weight:600;color:#334155;margin:16px 0 5px}
label.inline{display:flex;align-items:center;gap:8px;font-weight:400;margin:0;cursor:pointer}
input[type=text],input[type=url],input[type=password],select{
  width:100%;border:1px solid #e2e8f0;border-radius:7px;padding:9px 12px;
  font-size:14px;color:#1e293b;outline:none;font-family:inherit;
  background:#fff;transition:border .15s}
input:focus,select:focus{border-color:#5068e8;box-shadow:0 0 0 3px rgba(80,104,232,.1)}
select{cursor:pointer}
.hint{font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.5}
.opt-row{display:flex;align-items:center;gap:8px;margin-top:14px}
.opt-row input[type=checkbox]{width:15px;height:15px;accent-color:#5068e8;cursor:pointer}
button{width:100%;margin-top:24px;background:#5068e8;color:#fff;border:none;
       border-radius:9px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;
       transition:background .15s;letter-spacing:.3px}
button:hover{background:#3d55d6}
button:disabled{background:#94a3b8;cursor:not-allowed}
.alert{border-radius:8px;padding:13px 16px;font-size:13px;margin-bottom:16px;line-height:1.55}
.alert-err {background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.alert-warn{background:#fffbeb;color:#92400e;border:1px solid #fde68a}
.alert-blue{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
code{background:#f1f5f9;padding:2px 7px;border-radius:4px;font-size:11.5px;word-break:break-all}
.dir-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}
.dir-item{font-size:12px;color:#64748b;background:#f8fafc;border-radius:5px;padding:4px 9px}
.footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center}
.mig-banner{background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;
            padding:16px 18px;margin-bottom:18px}
.mig-banner h3{font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:6px}
.mig-banner p{font-size:13px;color:#1e40af;line-height:1.5;margin-bottom:10px}
.mig-btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;
         border-radius:7px;padding:9px 18px;font-size:13px;font-weight:600}
.mig-btn:hover{background:#1d4ed8}
</style>
</head>
<body>
<div class="card">
  <div class="logo">News<span>day</span></div>
  <div class="sub">Asistente de instalación · v<?= ND_VERSION ?></div>

  <?php if ($error): ?>
    <div class="alert alert-err"><?= htmlspecialchars($error) ?></div>
  <?php endif; ?>

  <!-- ── Aviso de migración (si hay versión anterior) ─────── -->
  <?php if ($needsMigration && empty($_POST['force'])): ?>
    <div class="mig-banner">
      <h3>⚡ Actualización disponible</h3>
      <p>
        Se detecta Newsday <strong>v<?= htmlspecialchars($installedVersion) ?></strong> instalado.
        Hay una actualización a <strong>v<?= ND_VERSION ?></strong> disponible.<br>
        Para actualizar <em>conservando todos tus contenidos</em>, usa el asistente de migración:
      </p>
      <a href="migrate.php" class="mig-btn">▶ Ir a migrate.php →</a>
    </div>
  <?php endif; ?>

  <!-- ── Requisitos ────────────────────────────────────────── -->
  <h2>Requisitos del servidor</h2>
  <div class="checks">
    <?php foreach ($checks as $label => $ok): ?>
      <div class="chk-row">
        <?= chkIcon($ok) ?>
        <span><?= htmlspecialchars($label) ?></span>
        <?php if (!$ok): ?>
          <span style="margin-left:auto;font-size:11px;color:#dc2626">requerido</span>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>

  <?php if (!$allOk): ?>
    <div class="alert alert-err" style="margin-top:14px">
      Corrige los requisitos pendientes antes de instalar.
    </div>
  <?php endif; ?>

  <?php if ($alreadyInstalled && !$needsMigration): ?>
    <div class="alert alert-warn" style="margin-top:14px">
      ⚠ Newsday v<?= htmlspecialchars($installedVersion ?: '?') ?> ya está instalado.
      Marca «Reinstalar» más abajo para sobreescribir solo la configuración
      (usuario, contraseña, URL y nombre del sitio). Los contenidos no se eliminan.
    </div>
  <?php endif; ?>

  <div class="sep"></div>

  <!-- ── Formulario ───────────────────────────────────────── -->
  <form method="post" autocomplete="off">

    <h2>Tu publicación</h2>

    <label>Nombre del sitio</label>
    <input type="text" name="siteName" required
           value="<?= htmlspecialchars($_POST['siteName'] ?? 'Mi Publicación') ?>">
    <div class="hint">Aparece en cabecera, título del navegador y feed RSS.</div>

    <label>URL base <span style="font-weight:400;color:#94a3b8">(opcional)</span></label>
    <input type="text" name="baseUrl" autocomplete="off" spellcheck="false"
           value="<?= htmlspecialchars($_POST['baseUrl'] ?? '') ?>"
           placeholder="https://mipublicacion.com  — déjalo vacío si no tienes dominio">
    <div class="hint">
      Solo tu dominio sin barra final. El protocolo <code>https://</code> se añade automáticamente.
      <strong>Puedes dejarlo vacío</strong> — el sitio usará rutas relativas y funcionará en cualquier servidor.
    </div>

    <label>Idioma del contenido</label>
    <select name="contentLang">
      <option value="es" <?= (($_POST['contentLang'] ?? 'es') === 'es') ? 'selected' : '' ?>>Español (es)</option>
      <option value="en" <?= (($_POST['contentLang'] ?? '') === 'en') ? 'selected' : '' ?>>English (en)</option>
    </select>

    <div class="sep"></div>
    <h2>Cuenta de administrador</h2>

    <label>Usuario</label>
    <input type="text" name="user" autocomplete="off"
           value="<?= htmlspecialchars($_POST['user'] ?? 'admin') ?>" required>

    <label>Contraseña <span style="font-weight:400;color:#94a3b8">(mín. 6 caracteres)</span></label>
    <input type="password" name="pass" autocomplete="new-password" required>

    <label>Repetir contraseña</label>
    <input type="password" name="pass2" autocomplete="new-password" required>

    <?php if ($alreadyInstalled): ?>
      <div class="sep"></div>
      <div class="opt-row">
        <input type="checkbox" name="force" id="force" value="1">
        <label class="inline" for="force">
          Reinstalar (sobreescribirá <code>newsday-config.php</code> y creará nuevo usuario admin)
        </label>
      </div>
    <?php endif; ?>

    <button type="submit" <?= !$allOk ? 'disabled' : '' ?>>
      <?= $alreadyInstalled ? '↺ Reinstalar Newsday' : '✓ Instalar Newsday v' . ND_VERSION ?>
    </button>
  </form>

  <!-- ── Carpetas que se crearán ──────────────────────────── -->
  <div class="sep"></div>
  <h2>Estructura que se creará automáticamente</h2>
  <div class="dir-grid">
    <?php
    $createdDirs = [
      'content/posts'        => 'Posts',
      'content/pages'        => 'Páginas estáticas',
      'content/layouts'      => 'Plantillas Maquetar',
      'content/panel-users'  => 'Usuarios del panel',
      'content/readers'      => 'Lectores web',
      'media/'               => 'Archivos multimedia',
      'public/'              => 'Sitio generado',
      'preview/'             => 'Vista previa temporal',
      'backups/'             => 'Copias de seguridad',
      'temas/'               => 'Temas visuales (4)',
      'languages/'           => 'Idiomas interfaz/contenido',
    ];
    foreach ($createdDirs as $path => $desc): ?>
      <div class="dir-item" title="<?= htmlspecialchars($desc) ?>">
        📁 <?= htmlspecialchars($path) ?>
      </div>
    <?php endforeach; ?>
  </div>

  <div class="footer">
    PHP <?= htmlspecialchars($phpVer) ?> · Newsday v<?= ND_VERSION ?>
  </div>
</div>
</body>
</html>
