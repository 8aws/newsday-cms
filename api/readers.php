<?php
/**
 * readers.php — Gestión de lectores web (usuarios del sitio público)
 *
 * Niveles de acceso (tier):
 *   free        — Registrado sin pago (accede a contenido "members")
 *   subscriber  — Suscriptor de pago básico (accede a "subscriber")
 *   premium     — Suscriptor premium (accede a todo contenido privado)
 *
 * Gestión desde el panel solo para admin y editor.
 * El autoregistro se gestiona desde reader.php (portal público).
 */

define('FILE_READERS', __DIR__ . '/../content/readers/readers.json');

// ── Carga / guardado ──────────────────────────────────────────

function loadReaders(): array {
    if (!is_file(FILE_READERS)) return [];
    return json_decode(file_get_contents(FILE_READERS), true) ?? [];
}

function saveReadersData(array $readers): void {
    $dir = dirname(FILE_READERS);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(
        FILE_READERS,
        json_encode(array_values($readers), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
}

// ── Listar lectores ───────────────────────────────────────────

function listReaders(): void {
    requireRole(['admin', 'editor']);
    $readers = loadReaders();
    // No devolver passHash
    $safe = array_map(function($r) {
        $out = array_diff_key($r, ['passHash' => 1]);
        return $out;
    }, $readers);
    sendJSON(array_values($safe));
}

// ── Crear / Actualizar lector ─────────────────────────────────

function saveReader(): void {
    requireRole(['admin', 'editor']);
    $body  = jsonBody();

    $id          = $body['id']          ?? '';
    $email       = strtolower(trim($body['email']       ?? ''));
    $username    = trim($body['username']    ?? '');
    $tier        = $body['tier']        ?? 'free';
    $displayName = trim($body['displayName'] ?? $username ?: $email);
    $active      = isset($body['active']) ? (bool)$body['active'] : true;
    $pass        = $body['pass']        ?? '';
    $notes       = trim($body['notes']       ?? '');

    if (!$email) { sendJSON(['error' => 'El email es obligatorio'], 400); }
    if (!in_array($tier, ['free','subscriber','premium'], true)) {
        sendJSON(['error' => 'Nivel de acceso inválido'], 400);
    }

    $readers = loadReaders();

    if ($id) {
        // Editar existente
        $found = false;
        foreach ($readers as &$r) {
            if ($r['id'] === $id) {
                $found = true;
                $r['email']       = $email;
                $r['username']    = $username ?: $r['username'] ?? '';
                $r['tier']        = $tier;
                $r['displayName'] = $displayName;
                $r['active']      = $active;
                $r['notes']       = $notes;
                $r['updatedAt']   = date('c');
                if ($pass !== '') $r['passHash'] = password_hash($pass, PASSWORD_DEFAULT);
                break;
            }
        }
        unset($r);
        if (!$found) { sendJSON(['error' => 'Lector no encontrado'], 404); }
    } else {
        // Comprobar email único
        foreach ($readers as $r) {
            if (strtolower($r['email'] ?? '') === $email) {
                sendJSON(['error' => 'Ya existe un lector con ese email'], 409);
            }
        }

        $readers[] = [
            'id'          => 'rdr_' . time() . '_' . rand(100, 999),
            'email'       => $email,
            'username'    => $username,
            'passHash'    => $pass ? password_hash($pass, PASSWORD_DEFAULT) : '',
            'tier'        => $tier,
            'displayName' => $displayName,
            'active'      => true,
            'notes'       => $notes,
            'createdAt'   => date('c'),
        ];
        $id = end($readers)['id'];
    }

    saveReadersData($readers);
    sendJSON(['ok' => true, 'id' => $id]);
}

// ── Eliminar lector ───────────────────────────────────────────

function deleteReader(): void {
    requireRole(['admin', 'editor']);
    $body = jsonBody();
    $id   = $body['id'] ?? '';
    if (!$id) { sendJSON(['error' => 'Falta id'], 400); }

    $readers = loadReaders();
    $before  = count($readers);
    $readers = array_values(array_filter($readers, fn($r) => $r['id'] !== $id));
    if (count($readers) === $before) { sendJSON(['error' => 'Lector no encontrado'], 404); }
    saveReadersData($readers);
    sendJSON(['ok' => true]);
}

// ── Importar lectores en masa (CSV) ──────────────────────────

function importReaders(): void {
    requireRole(['admin']);
    $body = jsonBody();
    $rows = $body['rows'] ?? [];   // [['email'=>'...','tier'=>'...','displayName'=>'...'], ...]
    if (!is_array($rows) || !$rows) { sendJSON(['error' => 'Sin datos para importar'], 400); }

    $readers  = loadReaders();
    $existing = array_column($readers, 'email');
    $added    = 0;
    $skipped  = 0;

    foreach ($rows as $row) {
        $email = strtolower(trim($row['email'] ?? ''));
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $skipped++; continue; }
        if (in_array($email, $existing, true)) { $skipped++; continue; }
        $tier = in_array($row['tier'] ?? '', ['free','subscriber','premium']) ? $row['tier'] : 'free';
        $readers[]  = [
            'id'          => 'rdr_' . time() . '_' . rand(100, 999) . '_' . $added,
            'email'       => $email,
            'username'    => trim($row['username'] ?? ''),
            'passHash'    => '',
            'tier'        => $tier,
            'displayName' => trim($row['displayName'] ?? $email),
            'active'      => true,
            'notes'       => trim($row['notes'] ?? ''),
            'createdAt'   => date('c'),
        ];
        $existing[] = $email;
        $added++;
    }

    saveReadersData($readers);
    sendJSON(['ok' => true, 'added' => $added, 'skipped' => $skipped]);
}

// ── Auth de lector (usado por reader.php) ────────────────────

function authenticateReader(string $email, string $pass): ?array {
    $readers = loadReaders();
    $email   = strtolower(trim($email));
    foreach ($readers as $r) {
        if (strtolower($r['email'] ?? '') !== $email) continue;
        if (empty($r['active'])) continue;
        if (!empty($r['passHash']) && password_verify($pass, $r['passHash'])) {
            return $r;
        }
    }
    return null;
}

function findReaderById(string $id): ?array {
    $readers = loadReaders();
    foreach ($readers as $r) {
        if ($r['id'] === $id) return $r;
    }
    return null;
}

function findReaderByEmail(string $email): ?array {
    $readers = loadReaders();
    $email   = strtolower(trim($email));
    foreach ($readers as $r) {
        if (strtolower($r['email'] ?? '') === $email) return $r;
    }
    return null;
}

// ── Estadísticas rápidas ──────────────────────────────────────

function getReaderStats(): array {
    $readers = loadReaders();
    $tiers   = ['free' => 0, 'subscriber' => 0, 'premium' => 0];
    $active  = 0;
    foreach ($readers as $r) {
        $t = $r['tier'] ?? 'free';
        if (isset($tiers[$t])) $tiers[$t]++;
        if (!empty($r['active'])) $active++;
    }
    return [
        'total'      => count($readers),
        'active'     => $active,
        'tiers'      => $tiers,
    ];
}
