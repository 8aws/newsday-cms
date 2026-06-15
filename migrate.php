<?php
/**
 * Newsday — Asistente de Migración
 * ────────────────────────────────────────────────────────────────
 * Detecta la versión instalada, compara con la versión objetivo
 * (ND_VERSION_TARGET) y aplica automáticamente todas las
 * migraciones necesarias sin modificar el contenido editorial.
 *
 * Uso:
 *   1. Sube los archivos nuevos al servidor (sobreescribe los viejos).
 *   2. Abre este script en el navegador: https://tusite.com/migrate.php
 *   3. Revisa el informe y confirma la migración.
 *   4. Elimina o renombra migrate.php una vez completado.
 *
 * Cada migración es idempotente: puedes ejecutarlo varias veces
 * sin riesgo (ya aplicado = marcado como ✓ sin repetirlo).
 */

define('ND_VERSION_TARGET', '0.8');
define('ND_VERSION_FILE',   __DIR__ . '/content/nd-version.json');
define('ND_CONFIG_FILE',    __DIR__ . '/newsday-config.php');
define('ND_SITE_CFG',       __DIR__ . '/content/site-config.json');
define('ND_POSTS_DIR',      __DIR__ . '/content/posts');
define('ND_PANEL_USERS',    __DIR__ . '/content/panel-users/users.json');
define('ND_READERS',        __DIR__ . '/content/readers/readers.json');
define('ND_LAYOUTS_DIR',    __DIR__ . '/content/layouts');

// ── Seguridad básica: solo acceso local o con token GET ───────
$secret = trim(file_get_contents(__DIR__ . '/.migrate-token') ?: '');
if ($secret !== '') {
    $tok = $_GET['token'] ?? '';
    if (!hash_equals($secret, $tok)) {
        http_response_code(403);
        die('Acceso denegado. Añade ?token=TU_TOKEN a la URL.');
    }
}

// ── Detectar versión instalada ────────────────────────────────
function readInstalledVersion(): string {
    // 1. Fichero de versión explícito (introducido en v0.8)
    if (is_file(ND_VERSION_FILE)) {
        $d = json_decode(file_get_contents(ND_VERSION_FILE), true);
        return $d['version'] ?? '';
    }
    // 2. Inferir desde site-config.json
    if (is_file(ND_SITE_CFG)) {
        $d = json_decode(file_get_contents(ND_SITE_CFG), true);
        if (!empty($d['ndVersion'])) return $d['ndVersion'];
        // Si existe site-config pero sin ndVersion → instalación vieja (≤0.7)
        return '0.0';
    }
    // 3. Nada encontrado → no instalado
    return '';
}

function writeInstalledVersion(string $ver): void {
    $dir = dirname(ND_VERSION_FILE);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(ND_VERSION_FILE, json_encode(
        ['version' => $ver, 'updatedAt' => date('c')],
        JSON_PRETTY_PRINT
    ));
    // También en site-config para redundancia
    if (is_file(ND_SITE_CFG)) {
        $d = json_decode(file_get_contents(ND_SITE_CFG), true) ?? [];
        $d['ndVersion'] = $ver;
        file_put_contents(ND_SITE_CFG, json_encode($d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}

function versionLt(string $a, string $b): bool {
    return version_compare($a, $b, '<');
}

// ── Registro de resultados ────────────────────────────────────
$log    = [];   // [['status'=>'ok'|'skip'|'err', 'msg'=>'...'], ...]
$errors = 0;

function mlog(string $status, string $msg): void {
    global $log, $errors;
    $log[] = ['status' => $status, 'msg' => $msg];
    if ($status === 'err') $errors++;
}

// ════════════════════════════════════════════════════════════════
//  DEFINICIÓN DE MIGRACIONES
// ════════════════════════════════════════════════════════════════
//
// Cada migración tiene:
//   'from'   → versión instalada desde la que aplica (inclusive)
//   'to'     → versión objetivo (inclusive en el rango)
//   'title'  → descripción breve
//   'run'    → callable, devuelve true (ok), false (error) o null (ya hecho)
//
// Se ejecutan en orden. Una migración 'run' que devuelve null
// se muestra como "ya aplicada" (✓ omitido).
// ════════════════════════════════════════════════════════════════

$migrations = [

    // ── v0.8: Nuevos directorios ─────────────────────────────
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Crear carpetas content/panel-users y content/readers',
        'run'   => function(): ?bool {
            $done = true;
            foreach ([
                dirname(ND_PANEL_USERS),
                dirname(ND_READERS),
            ] as $d) {
                if (!is_dir($d)) {
                    if (!mkdir($d, 0755, true)) $done = false;
                }
            }
            return $done;
        },
    ],

    // ── v0.8: Proteger nuevas carpetas con .htaccess ─────────
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Proteger content/ con .htaccess (denegación HTTP directa)',
        'run'   => function(): ?bool {
            $ht  = __DIR__ . '/content/.htaccess';
            $body = "Order Deny,Allow\nDeny from all\n";
            if (!file_exists($ht)) {
                return (bool) file_put_contents($ht, $body);
            }
            return null; // ya existe
        },
    ],

    // ── v0.8: Migrar usuario admin → panel-users/users.json ──
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Migrar cuenta de administrador a content/panel-users/users.json',
        'run'   => function(): ?bool {
            if (is_file(ND_PANEL_USERS)) return null; // ya migrado

            // Leer credenciales del config
            $user     = 'admin';
            $passHash = '';
            if (is_file(ND_CONFIG_FILE)) {
                $src = file_get_contents(ND_CONFIG_FILE);
                if (preg_match("/define\s*\(\s*'NEWSDAY_USER'\s*,\s*'([^']+)'\s*\)/", $src, $m))     $user     = $m[1];
                if (preg_match("/define\s*\(\s*'NEWSDAY_PASS_HASH'\s*,\s*'([^']+)'\s*\)/", $src, $m)) $passHash = $m[1];
            }
            if (!$passHash) $passHash = password_hash('admin', PASSWORD_DEFAULT);

            $users = [[
                'id'          => 'admin',
                'username'    => $user,
                'passHash'    => $passHash,
                'role'        => 'admin',
                'displayName' => 'Administrador',
                'email'       => '',
                'createdAt'   => date('c'),
            ]];
            $dir = dirname(ND_PANEL_USERS);
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            return (bool) file_put_contents(
                ND_PANEL_USERS,
                json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );
        },
    ],

    // ── v0.8: Crear readers.json vacío si no existe ───────────
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Inicializar content/readers/readers.json (lista vacía)',
        'run'   => function(): ?bool {
            if (is_file(ND_READERS)) return null;
            $dir = dirname(ND_READERS);
            if (!is_dir($dir)) mkdir($dir, 0755, true);
            return (bool) file_put_contents(ND_READERS, "[]");
        },
    ],

    // ── v0.8: Crear content/layouts/ si no existe ────────────
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Crear carpeta content/layouts/ para plantillas de Maquetar',
        'run'   => function(): ?bool {
            if (is_dir(ND_LAYOUTS_DIR)) return null;
            return mkdir(ND_LAYOUTS_DIR, 0755, true);
        },
    ],

    // ── v0.8: Añadir campo access a todos los posts existentes
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Añadir campo "access: public" a todos los posts existentes',
        'run'   => function(): ?bool {
            if (!is_dir(ND_POSTS_DIR)) return null;
            $updated = 0;
            $skipped = 0;
            foreach (scandir(ND_POSTS_DIR) as $id) {
                if ($id[0] === '.') continue;
                $metaFile = ND_POSTS_DIR . "/$id/meta.json";
                if (!is_file($metaFile)) continue;
                $meta = json_decode(file_get_contents($metaFile), true);
                if (!is_array($meta)) continue;
                if (isset($meta['access'])) { $skipped++; continue; }
                $meta['access'] = 'public';
                file_put_contents($metaFile, json_encode(
                    $meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                ));
                $updated++;
            }
            // null si todo ya estaba actualizado, true si se actualizó algo
            return ($updated === 0 && $skipped > 0) ? null : true;
        },
    ],

    // ── v0.8: Actualizar site-config.json con nuevos campos ──
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Añadir campos nuevos a site-config.json (readerRegistration, siteStructure)',
        'run'   => function(): ?bool {
            if (!is_file(ND_SITE_CFG)) return null;
            $cfg     = json_decode(file_get_contents(ND_SITE_CFG), true) ?? [];
            $changed = false;
            // Campo para registro de lectores (nuevo en v0.8)
            if (!array_key_exists('readerRegistration', $cfg)) {
                $cfg['readerRegistration'] = true;
                $changed = true;
            }
            // siteStructure si falta (introducido en v0.6)
            if (!array_key_exists('siteStructure', $cfg)) {
                $cfg['siteStructure'] = ['homepage' => 'posts', 'homepageRef' => '', 'activePortada' => ''];
                $changed = true;
            }
            // autoBackup si falta
            if (!array_key_exists('autoBackup', $cfg)) {
                $cfg['autoBackup'] = ['enabled' => false, 'keepDays' => 7];
                $changed = true;
            }
            if (!$changed) return null;
            file_put_contents(ND_SITE_CFG, json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
            return true;
        },
    ],

    // ── v0.8: Crear carpeta preview/ si no existe ─────────────
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Crear carpeta preview/ para vistas previas temporales',
        'run'   => function(): ?bool {
            $d = __DIR__ . '/preview';
            if (is_dir($d)) return null;
            return mkdir($d, 0755, true);
        },
    ],

    // ── v0.8: Crear carpeta backups/ si no existe ─────────────
    [
        'from'  => '0.0',
        'to'    => '0.8',
        'title' => 'Crear carpeta backups/ para copias de seguridad',
        'run'   => function(): ?bool {
            $d = __DIR__ . '/backups';
            if (is_dir($d)) return null;
            return mkdir($d, 0755, true);
        },
    ],
];

// ════════════════════════════════════════════════════════════════
//  EJECUCIÓN
// ════════════════════════════════════════════════════════════════

$installedVersion = readInstalledVersion();
$isNewInstall     = ($installedVersion === '');
$alreadyCurrent   = ($installedVersion === ND_VERSION_TARGET);
$doRun            = (isset($_POST['run']) && $_POST['run'] === '1');

if ($doRun && !$alreadyCurrent) {
    foreach ($migrations as $m) {
        // Solo ejecutar migraciones que apliquen al rango de versiones
        if (!versionLt($installedVersion, $m['to'])) {
            mlog('skip', $m['title'] . ' — ya aplicada (versión ' . $installedVersion . ')');
            continue;
        }
        try {
            $result = ($m['run'])();
            if ($result === null) {
                mlog('skip', $m['title'] . ' — ya estaba hecha');
            } elseif ($result === true) {
                mlog('ok', $m['title']);
            } else {
                mlog('err', $m['title'] . ' — falló (comprueba permisos de escritura)');
            }
        } catch (Throwable $e) {
            mlog('err', $m['title'] . ' — excepción: ' . $e->getMessage());
        }
    }

    if ($errors === 0) {
        writeInstalledVersion(ND_VERSION_TARGET);
        $installedVersion = ND_VERSION_TARGET;
        $alreadyCurrent   = true;
    }
}

// ════════════════════════════════════════════════════════════════
//  VISTA HTML
// ════════════════════════════════════════════════════════════════
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsday — Migración</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f2f5;min-height:100vh;
     display:flex;align-items:flex-start;justify-content:center;padding:32px 16px}
.card{background:#fff;border-radius:14px;padding:38px 40px;width:100%;max-width:640px;
      box-shadow:0 8px 40px rgba(0,0,0,.1)}
.logo{font-size:22px;font-weight:800;color:#5068e8}
.logo span{color:#12122a}
.sub{font-size:13px;color:#64748b;margin-top:3px;margin-bottom:24px}
h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;
   color:#94a3b8;margin:22px 0 10px}
.ver-row{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.ver-box{flex:1;min-width:130px;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px 16px}
.ver-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
.ver-val{font-size:20px;font-weight:800;color:#12122a}
.ver-box.current{border-color:#5068e8;background:#eff6ff}
.ver-box.target {border-color:#16a34a;background:#f0fdf4}
.ver-val.ok{color:#16a34a}
.sep{height:1px;background:#f1f5f9;margin:22px 0}
.mig-list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.mig-row{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;
         border-radius:8px;font-size:13px;line-height:1.5}
.mig-row.pending{background:#f8fafc;border:1px solid #e2e8f0;color:#334155}
.mig-row.ok    {background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d}
.mig-row.skip  {background:#f8fafc;border:1px solid #e2e8f0;color:#94a3b8}
.mig-row.err   {background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}
.mig-icon{font-size:14px;flex-shrink:0;margin-top:1px}
.alert{border-radius:8px;padding:13px 16px;font-size:13px;margin:14px 0;line-height:1.55}
.alert-ok  {background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
.alert-warn{background:#fffbeb;color:#92400e;border:1px solid #fde68a}
.alert-err {background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
.btn{display:block;width:100%;margin-top:20px;background:#5068e8;color:#fff;border:none;
     border-radius:9px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;
     transition:background .15s;text-align:center;text-decoration:none}
.btn:hover{background:#3d55d6}
.btn-green{background:#16a34a}.btn-green:hover{background:#15803d}
.btn-ghost{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
.btn-ghost:hover{background:#e2e8f0}
.hint{font-size:11px;color:#94a3b8;margin-top:5px;line-height:1.5}
code{background:#f1f5f9;padding:2px 7px;border-radius:4px;font-size:11.5px}
.footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center}
.warn-box{background:#fffbeb;border:1.5px solid #fde68a;border-radius:10px;padding:14px 16px;
          font-size:13px;color:#92400e;margin-bottom:16px}
.warn-box strong{display:block;margin-bottom:4px}
</style>
</head>
<body>
<div class="card">

  <div class="logo">News<span>day</span></div>
  <div class="sub">Asistente de migración · v<?= htmlspecialchars(ND_VERSION_TARGET) ?></div>

  <!-- Versiones -->
  <div class="ver-row">
    <div class="ver-box current">
      <div class="ver-lbl">Versión instalada</div>
      <div class="ver-val <?= $installedVersion === ND_VERSION_TARGET ? 'ok' : '' ?>">
        <?= $isNewInstall ? 'Sin instalar' : ('v' . htmlspecialchars($installedVersion)) ?>
      </div>
    </div>
    <div class="ver-box target">
      <div class="ver-lbl">Versión objetivo</div>
      <div class="ver-val">v<?= htmlspecialchars(ND_VERSION_TARGET) ?></div>
    </div>
  </div>

  <?php if ($isNewInstall): ?>
    <div class="alert alert-warn">
      ⚠ No se detecta ninguna instalación de Newsday en este directorio.
      Usa <a href="newsday-install.php" style="color:#92400e;font-weight:600">newsday-install.php</a> para hacer una instalación nueva.
    </div>

  <?php elseif ($alreadyCurrent && !$doRun): ?>
    <div class="alert alert-ok">
      ✓ Newsday ya está en la versión <?= htmlspecialchars($installedVersion) ?>. No hay migraciones pendientes.
    </div>

  <?php elseif ($doRun): ?>
    <!-- Resultados de la ejecución -->
    <?php if ($errors === 0): ?>
      <div class="alert alert-ok">
        ✓ Migración completada correctamente. Newsday actualizado a v<?= htmlspecialchars(ND_VERSION_TARGET) ?>.
      </div>
    <?php else: ?>
      <div class="alert alert-err">
        ✗ Se produjeron <?= $errors ?> error<?= $errors !== 1 ? 'es' : '' ?> durante la migración.
        Comprueba los permisos de escritura en el directorio y vuelve a intentarlo.
      </div>
    <?php endif; ?>

    <h2>Registro de migraciones</h2>
    <div class="mig-list">
      <?php foreach ($log as $entry): ?>
        <?php
          $icon = match($entry['status']) {
              'ok'   => '✓',
              'skip' => '–',
              'err'  => '✗',
              default=> '?',
          };
        ?>
        <div class="mig-row <?= htmlspecialchars($entry['status']) ?>">
          <span class="mig-icon"><?= $icon ?></span>
          <span><?= htmlspecialchars($entry['msg']) ?></span>
        </div>
      <?php endforeach; ?>
    </div>

    <?php if ($errors === 0): ?>
      <a href="Newsday.html" class="btn btn-green">→ Ir al panel de administración</a>
      <div class="hint" style="text-align:center;margin-top:10px">
        Elimina o renombra <code>migrate.php</code> por seguridad una vez verificada la migración.
      </div>
    <?php else: ?>
      <form method="post">
        <input type="hidden" name="run" value="1">
        <button type="submit" class="btn">↺ Reintentar migración</button>
      </form>
    <?php endif; ?>

  <?php else: ?>
    <!-- Previsualización: migraciones pendientes -->
    <div class="warn-box">
      <strong>⚠ Crea una copia de seguridad antes de continuar</strong>
      Se recomienda hacer un backup completo desde el panel antes de migrar.
      La migración modifica ficheros de configuración y metadatos de posts.
    </div>

    <h2>Migraciones pendientes detectadas</h2>
    <div class="mig-list">
      <?php foreach ($migrations as $m): ?>
        <?php $applies = versionLt($installedVersion, $m['to']); ?>
        <div class="mig-row <?= $applies ? 'pending' : 'skip' ?>">
          <span class="mig-icon"><?= $applies ? '▶' : '–' ?></span>
          <span><?= htmlspecialchars($m['title']) ?><?= !$applies ? ' <em style="opacity:.6">(ya aplicada)</em>' : '' ?></span>
        </div>
      <?php endforeach; ?>
    </div>

    <form method="post">
      <input type="hidden" name="run" value="1">
      <button type="submit" class="btn">▶ Ejecutar migraciones</button>
    </form>
    <a href="Newsday.html" class="btn btn-ghost" style="margin-top:10px">Cancelar — ir al panel</a>
  <?php endif; ?>

  <div class="sep"></div>
  <h2>¿Qué hace esta herramienta?</h2>
  <p style="font-size:13px;color:#475569;line-height:1.7">
    <strong>Detecta</strong> la versión instalada de Newsday comparando <code>content/nd-version.json</code>.<br>
    <strong>Aplica</strong> solo las migraciones que faltan (idempotente — seguro de ejecutar varias veces).<br>
    <strong>No borra</strong> contenido editorial, posts, medios ni configuración de temas.<br>
    <strong>Actualiza</strong> la versión registrada al finalizar sin errores.
  </p>

  <div class="footer">
    Newsday Migrate · PHP <?= PHP_VERSION ?> · v<?= htmlspecialchars(ND_VERSION_TARGET) ?>
  </div>
</div>
</body>
</html>
