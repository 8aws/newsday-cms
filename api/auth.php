<?php
/**
 * auth.php — Autenticación multi-usuario con roles
 *
 * Usuarios del panel almacenados en content/panel-users/users.json
 * Roles: admin | editor | escritor | maquetador | publicista
 *
 * Compatibilidad inversa: si no existe el JSON de usuarios, usa las
 * constantes NEWSDAY_USER / NEWSDAY_PASS_HASH del config.
 */

// ── Fichero de usuarios del panel ────────────────────────────
define('FILE_PANEL_USERS', __DIR__ . '/../content/panel-users/users.json');

// ── Cargar usuarios ───────────────────────────────────────────

function loadPanelUsers(): array {
    if (!is_file(FILE_PANEL_USERS)) {
        // Compatibilidad: generar usuario admin desde las constantes del config
        return [[
            'id'          => 'admin',
            'username'    => defined('NEWSDAY_USER') ? NEWSDAY_USER : 'admin',
            'passHash'    => defined('NEWSDAY_PASS_HASH') ? NEWSDAY_PASS_HASH : '',
            'role'        => 'admin',
            'displayName' => 'Administrador',
            'email'       => '',
            'createdAt'   => date('c'),
        ]];
    }
    return json_decode(file_get_contents(FILE_PANEL_USERS), true) ?? [];
}

function savePanelUsersData(array $users): void {
    $dir = dirname(FILE_PANEL_USERS);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(
        FILE_PANEL_USERS,
        json_encode(array_values($users), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

// ── Autenticación ─────────────────────────────────────────────

function isAuth(): bool {
    if (!empty($_SESSION['newsday_auth'])) return true;
    $token = $_SERVER['HTTP_X_NEWSDAY_TOKEN'] ?? '';
    if ($token && defined('NEWSDAY_API_TOKEN') && hash_equals(NEWSDAY_API_TOKEN, $token)) return true;
    return false;
}

/**
 * Devuelve el usuario autenticado actual (array) o null si no hay sesión.
 */
function currentUser(): ?array {
    if (!isAuth()) return null;
    $username = $_SESSION['newsday_user'] ?? (defined('NEWSDAY_USER') ? NEWSDAY_USER : '');
    $users    = loadPanelUsers();
    foreach ($users as $u) {
        if (($u['username'] ?? '') === $username) return $u;
    }
    // Si viene por token API y no encontramos el usuario, devolvemos admin
    if (!empty($_SERVER['HTTP_X_NEWSDAY_TOKEN'])) {
        return ['username' => $username, 'role' => 'admin', 'displayName' => $username];
    }
    return null;
}

function currentRole(): string {
    $u = currentUser();
    return $u['role'] ?? 'escritor';
}

/**
 * Comprueba si el usuario actual tiene al menos uno de los roles indicados.
 * admin siempre tiene acceso a todo.
 */
function hasRole(array $roles): bool {
    $role = currentRole();
    if ($role === 'admin') return true;
    return in_array($role, $roles, true);
}

/**
 * Responde 403 si el usuario no tiene el rol requerido.
 */
function requireRole(array $roles): void {
    if (!hasRole($roles)) {
        sendJSON(['error' => 'Permisos insuficientes'], 403);
    }
}

// ── Login / Logout ────────────────────────────────────────────

function doLogin(): void {
    $body = jsonBody();
    $user = trim($body['user'] ?? $_POST['user'] ?? '');
    $pass = $body['pass'] ?? $_POST['pass'] ?? '';

    if (!$user || !$pass) {
        sendJSON(['error' => 'Credenciales incompletas'], 400);
    }

    $users = loadPanelUsers();
    foreach ($users as $u) {
        if (($u['username'] ?? '') === $user && !empty($u['passHash'])) {
            if (password_verify($pass, $u['passHash'])) {
                $_SESSION['newsday_auth'] = true;
                $_SESSION['newsday_user'] = $user;
                $_SESSION['newsday_role'] = $u['role'] ?? 'escritor';
                sendJSON([
                    'ok'          => true,
                    'user'        => $user,
                    'role'        => $u['role'] ?? 'escritor',
                    'displayName' => $u['displayName'] ?? $user,
                ]);
            }
        }
    }

    sendJSON(['error' => 'Credenciales incorrectas'], 401);
}

function doLogout(): void {
    session_unset();
    session_destroy();
    sendJSON(['ok' => true]);
}
