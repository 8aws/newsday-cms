<?php
/**
 * reader.php — Portal público de lectores
 *
 * Rutas (GET ?page=...):
 *   (sin param)  → portada / login si no autenticado
 *   login        → formulario de inicio de sesión
 *   register     → formulario de registro (si está habilitado)
 *   profile      → perfil del lector autenticado
 *   logout       → cerrar sesión
 *   content      → sirve contenido privado protegido por tier
 *
 * POST actions (JSON):
 *   ?action=login     → autenticar lector
 *   ?action=register  → registrar nuevo lector
 *   ?action=logout    → cerrar sesión lector
 *   ?action=check     → estado de sesión actual
 */

// ── Bootstrap ─────────────────────────────────────────────────
$cfgFile = __DIR__ . '/newsday-config.php';
if (file_exists($cfgFile)) require $cfgFile;
else {
    define('NEWSDAY_SITE_NAME', 'Newsday');
    define('NEWSDAY_BASE_URL',  '');
}

define('FILE_READERS',   __DIR__ . '/content/readers/readers.json');
define('FILE_SITE_CFG',  __DIR__ . '/content/site-config.json');
define('DIR_POSTS',      __DIR__ . '/content/posts');

// Sesión de lectores (separada de la sesión del panel admin)
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 30, // 30 días
    'path'     => '/',
    'samesite' => 'Lax',
    'httponly' => true,
    'secure'   => $isHttps,
]);
session_name('nd_reader_sess');
@session_start();

// ── Helpers ───────────────────────────────────────────────────

function rSendJSON(array $d, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function rJsonBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    return json_decode($raw, true) ?? [];
}

function rLoadReaders(): array {
    if (!is_file(FILE_READERS)) return [];
    return json_decode(file_get_contents(FILE_READERS), true) ?? [];
}

function rSaveReaders(array $readers): void {
    $dir = dirname(FILE_READERS);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(FILE_READERS,
        json_encode(array_values($readers), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
}

function rCurrentReader(): ?array {
    if (empty($_SESSION['nd_reader_id'])) return null;
    $readers = rLoadReaders();
    foreach ($readers as $r) {
        if ($r['id'] === $_SESSION['nd_reader_id']) return $r;
    }
    return null;
}

function rIsAuth(): bool {
    return !empty($_SESSION['nd_reader_id']);
}

function rTierLevel(string $tier): int {
    return match($tier) { 'premium' => 3, 'subscriber' => 2, 'free' => 1, default => 0 };
}

function rCanAccess(string $accessLevel, ?array $reader): bool {
    if ($accessLevel === 'public') return true;
    if (!$reader || empty($reader['active'])) return false;
    $required = match($accessLevel) { 'premium' => 3, 'subscriber' => 2, 'members' => 1, default => 0 };
    return rTierLevel($reader['tier'] ?? 'free') >= $required;
}

function esc(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5);
}

function loadSiteCfgR(): array {
    if (!is_file(FILE_SITE_CFG)) return [];
    return json_decode(file_get_contents(FILE_SITE_CFG), true) ?? [];
}

function rRegistrationEnabled(): bool {
    $cfg = loadSiteCfgR();
    return !isset($cfg['readerRegistration']) || $cfg['readerRegistration'] !== false;
}

// ── Procesamiento de acciones POST / GET ──────────────────────

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$page   = $_GET['page']   ?? '';

// ── API JSON ──────────────────────────────────────────────────
if ($action) {
    if ($method === 'POST') {
        switch ($action) {
            case 'login':    readerLogin();    break;
            case 'register': readerRegister(); break;
            case 'logout':   readerLogout();   break;
            default: rSendJSON(['error' => 'Acción desconocida'], 400);
        }
    } elseif ($action === 'check') {
        $r = rCurrentReader();
        rSendJSON([
            'auth'        => rIsAuth(),
            'reader'      => $r ? [
                'id'          => $r['id'],
                'email'       => $r['email']       ?? '',
                'displayName' => $r['displayName'] ?? '',
                'tier'        => $r['tier']        ?? 'free',
            ] : null,
        ]);
    } elseif ($action === 'content') {
        servePrivateContent();
    } else {
        rSendJSON(['error' => 'Acción desconocida'], 400);
    }
    exit;
}

// ── Render HTML ───────────────────────────────────────────────
$reader   = rCurrentReader();
$siteName = defined('NEWSDAY_SITE_NAME') ? NEWSDAY_SITE_NAME : 'Newsday';
$siteCfg  = loadSiteCfgR();
$baseUrl  = defined('NEWSDAY_BASE_URL') ? NEWSDAY_BASE_URL : '';

switch ($page) {
    case 'logout':
        session_unset(); session_destroy();
        header('Location: reader.php'); exit;
    case 'profile': renderProfilePage($reader, $siteName); break;
    case 'register': renderRegisterPage($siteName);         break;
    case 'login':
    default:
        if ($reader) renderDashboardPage($reader, $siteName);
        else         renderLoginPage($siteName, $page === 'register');
        break;
}
exit;

// ── Acciones de autenticación ─────────────────────────────────

function readerLogin(): void {
    $body  = rJsonBody();
    $email = strtolower(trim($body['email'] ?? ''));
    $pass  = $body['pass'] ?? '';

    if (!$email || !$pass) rSendJSON(['error' => 'Email y contraseña requeridos'], 400);

    $readers = rLoadReaders();
    foreach ($readers as $r) {
        if (strtolower($r['email'] ?? '') !== $email) continue;
        if (empty($r['active'])) rSendJSON(['error' => 'Cuenta inactiva'], 403);
        if (!empty($r['passHash']) && password_verify($pass, $r['passHash'])) {
            $_SESSION['nd_reader_id'] = $r['id'];
            rSendJSON([
                'ok'          => true,
                'displayName' => $r['displayName'] ?? $email,
                'tier'        => $r['tier'] ?? 'free',
            ]);
        }
    }
    rSendJSON(['error' => 'Credenciales incorrectas'], 401);
}

function readerRegister(): void {
    if (!rRegistrationEnabled()) {
        rSendJSON(['error' => 'El registro no está disponible en este momento'], 403);
    }

    $body        = rJsonBody();
    $email       = strtolower(trim($body['email']       ?? ''));
    $pass        = $body['pass']        ?? '';
    $displayName = trim($body['displayName'] ?? '');

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        rSendJSON(['error' => 'Email inválido'], 400);
    }
    if (strlen($pass) < 6) {
        rSendJSON(['error' => 'La contraseña debe tener al menos 6 caracteres'], 400);
    }

    $readers = rLoadReaders();
    foreach ($readers as $r) {
        if (strtolower($r['email'] ?? '') === $email) {
            rSendJSON(['error' => 'Ya existe una cuenta con ese email'], 409);
        }
    }

    $newReader = [
        'id'          => 'rdr_' . time() . '_' . rand(100, 999),
        'email'       => $email,
        'username'    => '',
        'passHash'    => password_hash($pass, PASSWORD_DEFAULT),
        'tier'        => 'free',
        'displayName' => $displayName ?: explode('@', $email)[0],
        'active'      => true,
        'notes'       => '',
        'createdAt'   => date('c'),
    ];
    $readers[] = $newReader;
    rSaveReaders($readers);

    $_SESSION['nd_reader_id'] = $newReader['id'];
    rSendJSON(['ok' => true, 'displayName' => $newReader['displayName'], 'tier' => 'free']);
}

function readerLogout(): void {
    session_unset(); session_destroy();
    rSendJSON(['ok' => true]);
}

// ── Servir contenido privado ──────────────────────────────────

function servePrivateContent(): void {
    $slug   = trim($_GET['slug'] ?? '');
    $reader = rCurrentReader();

    if (!$slug) rSendJSON(['error' => 'Falta slug'], 400);

    // Buscar el post por slug
    $postDir = null;
    $meta    = null;
    if (is_dir(DIR_POSTS)) {
        foreach (scandir(DIR_POSTS) as $id) {
            if ($id[0] === '.') continue;
            $m = @json_decode(@file_get_contents(DIR_POSTS . "/$id/meta.json"), true);
            if ($m && ($m['slug'] ?? '') === $slug) {
                $postDir = DIR_POSTS . "/$id";
                $meta    = $m;
                break;
            }
        }
    }

    if (!$meta) rSendJSON(['error' => 'Contenido no encontrado'], 404);

    $access = $meta['access'] ?? 'public';
    if (!rCanAccess($access, $reader)) {
        rSendJSON([
            'error'    => 'Acceso restringido',
            'access'   => $access,
            'tier'     => $reader['tier'] ?? null,
            'authRequired' => !$reader,
        ], 403);
    }

    // Contenido publicado
    if (($meta['status'] ?? '') !== 'published') rSendJSON(['error' => 'Contenido no disponible'], 404);

    $content = is_file("$postDir/content.html") ? file_get_contents("$postDir/content.html") : '';
    rSendJSON([
        'ok'      => true,
        'title'   => $meta['title']  ?? '',
        'date'    => $meta['date']   ?? '',
        'tags'    => $meta['tags']   ?? '',
        'access'  => $access,
        'content' => $content,
    ]);
}

// ════════════════════════════════════════════════════════════════
//  PÁGINAS HTML
// ════════════════════════════════════════════════════════════════

function renderLayout(string $title, string $body, string $siteName, ?array $reader): void {
    $sn    = esc($siteName);
    $t     = esc($title);
    $user  = $reader ? esc($reader['displayName'] ?? $reader['email'] ?? '') : '';
    $tier  = $reader ? esc($reader['tier'] ?? 'free') : '';
    $tierLabel = match($tier) { 'premium' => '★ Premium', 'subscriber' => '◆ Suscriptor', 'free' => 'Gratis', default => '' };
    echo <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$t} — {$sn}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f2f5;color:#1a1a2e;min-height:100vh}
  .rd-top{background:#1a237e;color:#fff;padding:12px 24px;display:flex;align-items:center;gap:16px;justify-content:space-between}
  .rd-top a{color:#c5cae9;text-decoration:none;font-size:13px}.rd-top a:hover{color:#fff}
  .rd-site{font-weight:800;font-size:16px;letter-spacing:2px;color:#fff;text-decoration:none}
  .rd-user{display:flex;align-items:center;gap:10px;font-size:13px}
  .rd-tier{background:rgba(255,255,255,.15);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
  .rd-wrap{max-width:640px;margin:40px auto;padding:0 16px}
  .rd-card{background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.07)}
  .rd-card h1{font-size:22px;margin-bottom:8px;color:#12122a}
  .rd-card h2{font-size:17px;margin:0 0 20px;color:#475569;font-weight:400}
  .rd-form{display:flex;flex-direction:column;gap:14px}
  .rd-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;display:block}
  .rd-input{width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;transition:border .15s}
  .rd-input:focus{border-color:#5068e8}
  .rd-btn{padding:11px 20px;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s}
  .rd-btn-primary{background:#5068e8;color:#fff}.rd-btn-primary:hover{opacity:.88}
  .rd-btn-ghost{background:#f1f5f9;color:#475569}.rd-btn-ghost:hover{background:#e2e8f0}
  .rd-err{color:#dc2626;font-size:13px;display:none;margin-top:4px}
  .rd-ok{color:#16a34a;font-size:13px;display:none;margin-top:4px}
  .rd-sep{height:1px;background:#e2e8f0;margin:8px 0}
  .rd-link{color:#5068e8;font-size:13px;text-decoration:none}.rd-link:hover{text-decoration:underline}
  .rd-tier-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
  .tier-free{background:#e0f2fe;color:#0369a1}
  .tier-subscriber{background:#ede9fe;color:#6d28d9}
  .tier-premium{background:#fef9c3;color:#92400e}
  .rd-info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
  .rd-info-lbl{color:#64748b;font-size:12px}
</style>
</head>
<body>
<div class="rd-top">
  <a href="reader.php" class="rd-site">{$sn}</a>
  <div class="rd-user">
HTML;
    if ($reader) {
        echo "<span>{$user}</span><span class=\"rd-tier\">{$tierLabel}</span>"
           . "<a href=\"reader.php?page=profile\">Perfil</a>"
           . "<a href=\"reader.php?page=logout\">Salir</a>";
    } else {
        echo "<a href=\"reader.php?page=login\">Iniciar sesión</a>";
        if (rRegistrationEnabled()) echo "<a href=\"reader.php?page=register\">Registrarse</a>";
    }
    echo <<<HTML
  </div>
</div>
<div class="rd-wrap">
  {$body}
</div>
<script>
function rdPost(url, data, onOk, onErr) {
  fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(r=>r.json()).then(d=>{ if(d.ok) onOk(d); else onErr(d.error||'Error'); })
    .catch(()=>onErr('Error de conexión'));
}
</script>
</body></html>
HTML;
}

function renderLoginPage(string $siteName, bool $showReg = false): void {
    $regLink = rRegistrationEnabled()
        ? '<a href="reader.php?page=register" class="rd-link">Crear cuenta</a>'
        : '';
    $body = <<<HTML
<div class="rd-card">
  <h1>Área de lectores</h1>
  <h2>Inicia sesión para acceder al contenido exclusivo</h2>
  <div class="rd-form" id="login-form">
    <div>
      <label class="rd-label">Email</label>
      <input class="rd-input" type="email" id="l-email" placeholder="tu@email.com" autocomplete="email">
    </div>
    <div>
      <label class="rd-label">Contraseña</label>
      <input class="rd-input" type="password" id="l-pass" placeholder="••••••••" autocomplete="current-password">
    </div>
    <div id="l-err" class="rd-err"></div>
    <button class="rd-btn rd-btn-primary" onclick="doLogin()">Iniciar sesión</button>
    {$regLink}
  </div>
</div>
<script>
function doLogin() {
  var e=document.getElementById('l-email').value.trim();
  var p=document.getElementById('l-pass').value;
  var err=document.getElementById('l-err');
  err.style.display='none';
  if(!e||!p){err.textContent='Completa todos los campos';err.style.display='block';return;}
  rdPost('reader.php?action=login',{email:e,pass:p},function(d){
    window.location.href='reader.php';
  },function(msg){
    err.textContent=msg;err.style.display='block';
  });
}
document.addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
</script>
HTML;
    renderLayout('Iniciar sesión', $body, $siteName, null);
}

function renderRegisterPage(string $siteName): void {
    if (!rRegistrationEnabled()) {
        $body = '<div class="rd-card"><h1>Registro cerrado</h1><p style="margin-top:12px;color:#64748b">El registro de nuevos lectores no está disponible en este momento.</p><br><a href="reader.php?page=login" class="rd-link">Volver al inicio de sesión</a></div>';
        renderLayout('Registro', $body, $siteName, null);
        return;
    }
    $body = <<<HTML
<div class="rd-card">
  <h1>Crear cuenta</h1>
  <h2>Regístrate para acceder al contenido para miembros</h2>
  <div class="rd-form">
    <div>
      <label class="rd-label">Nombre (opcional)</label>
      <input class="rd-input" type="text" id="r-name" placeholder="Tu nombre">
    </div>
    <div>
      <label class="rd-label">Email</label>
      <input class="rd-input" type="email" id="r-email" placeholder="tu@email.com" autocomplete="email">
    </div>
    <div>
      <label class="rd-label">Contraseña (mín. 6 caracteres)</label>
      <input class="rd-input" type="password" id="r-pass" placeholder="••••••••" autocomplete="new-password">
    </div>
    <div id="r-err" class="rd-err"></div>
    <div id="r-ok" class="rd-ok"></div>
    <button class="rd-btn rd-btn-primary" onclick="doRegister()">Crear cuenta</button>
    <a href="reader.php?page=login" class="rd-link">Ya tengo cuenta</a>
  </div>
</div>
<script>
function doRegister() {
  var name=document.getElementById('r-name').value.trim();
  var e=document.getElementById('r-email').value.trim();
  var p=document.getElementById('r-pass').value;
  var err=document.getElementById('r-err');
  var ok=document.getElementById('r-ok');
  err.style.display='none'; ok.style.display='none';
  if(!e||!p){err.textContent='Email y contraseña son obligatorios';err.style.display='block';return;}
  rdPost('reader.php?action=register',{email:e,pass:p,displayName:name},function(d){
    ok.textContent='¡Cuenta creada! Redirigiendo…';ok.style.display='block';
    setTimeout(()=>window.location.href='reader.php',1200);
  },function(msg){
    err.textContent=msg;err.style.display='block';
  });
}
</script>
HTML;
    renderLayout('Registro', $body, $siteName, null);
}

function renderDashboardPage(?array $reader, string $siteName): void {
    if (!$reader) { renderLoginPage($siteName); return; }

    $name  = esc($reader['displayName'] ?? $reader['email'] ?? '');
    $email = esc($reader['email'] ?? '');
    $tier  = $reader['tier'] ?? 'free';
    $tierLabel = match($tier) {
        'premium'    => 'Premium ★',
        'subscriber' => 'Suscriptor ◆',
        default      => 'Gratis'
    };
    $since = substr($reader['createdAt'] ?? '', 0, 10);

    $body = <<<HTML
<div class="rd-card">
  <h1>Bienvenido, {$name}</h1>
  <br>
  <div class="rd-info-row">
    <span class="rd-info-lbl">Email</span>
    <span>{$email}</span>
  </div>
  <div class="rd-info-row">
    <span class="rd-info-lbl">Nivel de acceso</span>
    <span class="rd-tier-badge tier-{$tier}">{$tierLabel}</span>
  </div>
  <div class="rd-info-row">
    <span class="rd-info-lbl">Miembro desde</span>
    <span>{$since}</span>
  </div>
  <br>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    <a href="reader.php?page=profile" class="rd-btn rd-btn-ghost" style="text-decoration:none">Mi perfil</a>
    <a href="reader.php?page=logout" class="rd-btn rd-btn-ghost" style="text-decoration:none">Cerrar sesión</a>
  </div>
</div>
HTML;
    renderLayout('Mi cuenta', $body, $siteName, $reader);
}

function renderProfilePage(?array $reader, string $siteName): void {
    if (!$reader) { header('Location: reader.php?page=login'); exit; }

    $name  = esc($reader['displayName'] ?? '');
    $email = esc($reader['email'] ?? '');

    $body = <<<HTML
<div class="rd-card">
  <h1>Mi perfil</h1>
  <br>
  <div class="rd-form">
    <div>
      <label class="rd-label">Nombre para mostrar</label>
      <input class="rd-input" type="text" id="p-name" value="{$name}">
    </div>
    <div>
      <label class="rd-label">Nueva contraseña (dejar vacío para no cambiar)</label>
      <input class="rd-input" type="password" id="p-pass" placeholder="Nueva contraseña">
    </div>
    <div id="p-err" class="rd-err"></div>
    <div id="p-ok" class="rd-ok"></div>
    <button class="rd-btn rd-btn-primary" onclick="saveProfile()">Guardar cambios</button>
    <a href="reader.php" class="rd-link">← Volver</a>
  </div>
</div>
<script>
function saveProfile(){
  var name=document.getElementById('p-name').value.trim();
  var pass=document.getElementById('p-pass').value;
  var err=document.getElementById('p-err');
  var ok=document.getElementById('p-ok');
  err.style.display='none';ok.style.display='none';
  rdPost('reader.php?action=update-profile',{displayName:name,pass:pass||undefined},function(d){
    ok.textContent='✓ Perfil actualizado';ok.style.display='block';
  },function(msg){
    err.textContent=msg;err.style.display='block';
  });
}
</script>
HTML;
    renderLayout('Mi perfil', $body, $siteName, $reader);
}
