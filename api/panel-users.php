<?php
/**
 * panel-users.php — Gestión de usuarios del panel de administración
 *
 * Roles disponibles:
 *   admin       — Acceso completo, gestión de usuarios
 *   editor      — Edición de todos los posts/páginas, publicar, generar
 *   escritor    — Crear y editar sus propios posts (en borrador)
 *   maquetador  — Acceso a Maquetar y Modelar
 *   publicista  — Generar y publicar el sitio
 *
 * Solo el rol "admin" puede gestionar usuarios del panel.
 */

// ── Permisos por rol ──────────────────────────────────────────
// Define qué acciones puede realizar cada rol en el panel.
// 'admin' siempre puede todo (ver hasRole en auth.php).

define('ROLE_LABELS', [
    'admin'      => 'Administrador',
    'editor'     => 'Editor',
    'escritor'   => 'Escritor',
    'maquetador' => 'Maquetador',
    'publicista' => 'Publicista',
]);

define('ROLE_PERMISSIONS', [
    'admin'      => ['posts','pages','media','layouts','generate','config','backup','users','readers'],
    'editor'     => ['posts','pages','media','layouts','generate','readers'],
    'escritor'   => ['posts','media'],
    'maquetador' => ['layouts','media'],
    'publicista' => ['generate'],
]);

// ── Listar usuarios del panel ─────────────────────────────────

function listPanelUsers(): void {
    requireRole(['admin']);
    $users = loadPanelUsers();
    // No devolver los hashes de contraseña
    $safe = array_map(fn($u) => array_diff_key($u, ['passHash' => 1]), $users);
    sendJSON(array_values($safe));
}

// ── Crear / Actualizar usuario del panel ──────────────────────

function savePanelUser(): void {
    requireRole(['admin']);
    $body = jsonBody();

    $id          = $body['id']          ?? '';
    $username    = trim($body['username']    ?? '');
    $role        = $body['role']        ?? 'escritor';
    $displayName = trim($body['displayName'] ?? $username);
    $email       = trim($body['email']       ?? '');
    $pass        = $body['pass']        ?? '';

    if (!$username) { sendJSON(['error' => 'El nombre de usuario es obligatorio'], 400); }
    if (!array_key_exists($role, ROLE_LABELS)) {
        sendJSON(['error' => 'Rol inválido'], 400);
    }

    // Proteger: no puede haber menos de 1 admin
    $users    = loadPanelUsers();
    $adminCount = count(array_filter($users, fn($u) => ($u['role'] ?? '') === 'admin'));

    // Editar usuario existente
    if ($id) {
        $found = false;
        foreach ($users as &$u) {
            if ($u['id'] === $id) {
                $found = true;
                // Si va a dejar de ser admin y solo hay 1, bloquear
                if ($u['role'] === 'admin' && $role !== 'admin' && $adminCount <= 1) {
                    sendJSON(['error' => 'Debe haber al menos un administrador'], 400);
                }
                $u['username']    = $username;
                $u['role']        = $role;
                $u['displayName'] = $displayName;
                $u['email']       = $email;
                $u['updatedAt']   = date('c');
                if ($pass !== '') $u['passHash'] = password_hash($pass, PASSWORD_DEFAULT);
                break;
            }
        }
        unset($u);
        if (!$found) { sendJSON(['error' => 'Usuario no encontrado'], 404); }
    } else {
        // Nuevo usuario
        if (!$pass) { sendJSON(['error' => 'La contraseña es obligatoria para nuevos usuarios'], 400); }

        // Comprobar que el username no esté duplicado
        foreach ($users as $u) {
            if ($u['username'] === $username) {
                sendJSON(['error' => 'El nombre de usuario ya existe'], 409);
            }
        }

        $newUser = [
            'id'          => 'usr_' . time() . '_' . rand(100, 999),
            'username'    => $username,
            'passHash'    => password_hash($pass, PASSWORD_DEFAULT),
            'role'        => $role,
            'displayName' => $displayName,
            'email'       => $email,
            'createdAt'   => date('c'),
        ];
        $users[] = $newUser;
        $id = $newUser['id'];
    }

    savePanelUsersData($users);
    sendJSON(['ok' => true, 'id' => $id]);
}

// ── Eliminar usuario del panel ────────────────────────────────

function deletePanelUser(): void {
    requireRole(['admin']);
    $body = jsonBody();
    $id   = $body['id'] ?? '';
    if (!$id) { sendJSON(['error' => 'Falta id'], 400); }

    $users      = loadPanelUsers();
    $adminCount = count(array_filter($users, fn($u) => ($u['role'] ?? '') === 'admin'));

    // No auto-eliminarse
    $current = currentUser();
    if ($current && ($current['id'] ?? '') === $id) {
        sendJSON(['error' => 'No puedes eliminar tu propio usuario'], 400);
    }

    $target = null;
    foreach ($users as $u) {
        if ($u['id'] === $id) { $target = $u; break; }
    }
    if (!$target) { sendJSON(['error' => 'Usuario no encontrado'], 404); }

    // Proteger último admin
    if (($target['role'] ?? '') === 'admin' && $adminCount <= 1) {
        sendJSON(['error' => 'No puedes eliminar el único administrador'], 400);
    }

    $users = array_values(array_filter($users, fn($u) => $u['id'] !== $id));
    savePanelUsersData($users);
    sendJSON(['ok' => true]);
}

// ── Permisos del usuario actual ───────────────────────────────

function getCurrentUserInfo(): void {
    if (!isAuth()) { sendJSON(['auth' => false]); }
    $u = currentUser();
    if (!$u) { sendJSON(['auth' => false]); }
    sendJSON([
        'auth'        => true,
        'username'    => $u['username']    ?? '',
        'role'        => $u['role']        ?? 'escritor',
        'displayName' => $u['displayName'] ?? $u['username'] ?? '',
        'email'       => $u['email']       ?? '',
        'permissions' => ROLE_PERMISSIONS[$u['role'] ?? 'escritor'] ?? [],
    ]);
}

// ── Inicializar fichero de usuarios (primera vez) ─────────────

function initPanelUsersFile(): void {
    if (is_file(FILE_PANEL_USERS)) return;
    $dir = dirname(FILE_PANEL_USERS);
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    // Migrar desde las constantes del config
    $username = defined('NEWSDAY_USER') ? NEWSDAY_USER : 'admin';
    $passHash = defined('NEWSDAY_PASS_HASH') ? NEWSDAY_PASS_HASH : password_hash('admin', PASSWORD_DEFAULT);

    $users = [[
        'id'          => 'admin',
        'username'    => $username,
        'passHash'    => $passHash,
        'role'        => 'admin',
        'displayName' => 'Administrador',
        'email'       => '',
        'createdAt'   => date('c'),
    ]];
    file_put_contents(
        FILE_PANEL_USERS,
        json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}
