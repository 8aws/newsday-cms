<?php
/**
 * Newsday — Punto de entrada público
 *
 * Flujo:
 *   1. Sin instalar    → redirige al instalador
 *   2. Sin contenido   → landing page de bienvenida
 *   3. Con contenido   → redirige a public/index.html
 *
 * El panel de administración está en Newsday.html
 */

$configFile    = __DIR__ . '/newsday-config.php';
$installerFile = __DIR__ . '/newsday-install.php';
$publicIndex   = __DIR__ . '/public/index.html';

// ── 1. Sistema no instalado ──────────────────────────────────────────────────
if (!file_exists($configFile)) {
    if (file_exists($installerFile)) {
        header('Location: newsday-install.php');
    } else {
        http_response_code(503);
        ?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Newsday — Recuperación</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f2f5;min-height:100vh;
       display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border-radius:12px;padding:36px;max-width:480px;width:100%;
        box-shadow:0 8px 32px rgba(0,0,0,.1);text-align:center}
  .logo{font-size:22px;font-weight:800;color:#5068e8;margin-bottom:4px}
  .logo span{color:#12122a}
  h1{font-size:18px;font-weight:700;color:#dc2626;margin:20px 0 10px}
  p{font-size:13px;color:#64748b;line-height:1.7;margin-bottom:12px}
  code{background:#f1f5f9;padding:2px 7px;border-radius:4px;font-size:12px}
  .steps{text-align:left;margin:16px 0;font-size:13px;color:#475569;line-height:1.8}
  .steps ol{margin-left:20px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">News<span>day</span></div>
  <h1>⚠ Sistema sin configurar</h1>
  <p>No se encontró <code>newsday-config.php</code> y el instalador ya no está disponible.</p>
  <div class="steps">
    <strong>Pasos para recuperar la instalación:</strong>
    <ol>
      <li>Sube de nuevo <code>newsday-install.php</code> al directorio raíz.</li>
      <li>Abre esta página; serás redirigido al instalador.</li>
      <li>Completa la instalación y el instalador se archivará automáticamente.</li>
    </ol>
  </div>
  <p style="font-size:11px;color:#94a3b8;margin-top:8px">Newsday v0.2</p>
</div>
</body>
</html>
        <?php
    }
    exit;
}

// ── 2. Sistema instalado con contenido público ───────────────────────────────
if (file_exists($publicIndex)) {
    header('Location: public/');
    exit;
}

// ── 3. Sin contenido todavía — landing page ──────────────────────────────────
require $configFile;
$siteName = defined('NEWSDAY_SITE_NAME') ? NEWSDAY_SITE_NAME : 'Newsday';
$year     = date('Y');
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= htmlspecialchars($siteName) ?></title>
<meta name="description" content="Sitio construido con Newsday — CMS de archivos planos para publicaciones digitales">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#12122a;--blue:#5068e8;--blue2:#3d55d6;--muted:#64748b;
  --bg:#f8fafc;--card:#fff;--border:#e2e8f0;--radius:14px;
}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh}

/* ── HERO ── */
.hero{
  background:linear-gradient(135deg,#0f0f2a 0%,#1a237e 55%,#283593 100%);
  color:#fff;padding:80px 24px 90px;text-align:center;
  position:relative;overflow:hidden;
}
.hero::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse at 70% 50%,rgba(80,104,232,.35) 0%,transparent 65%);
}
.hero-inner{position:relative;max-width:720px;margin:0 auto}
.logo{font-size:28px;font-weight:800;color:#fff;letter-spacing:-.5px;margin-bottom:32px}
.logo em{color:#7c8ff5;font-style:normal}
.hero h1{font-size:clamp(32px,6vw,56px);font-weight:800;line-height:1.1;margin-bottom:20px;letter-spacing:-.5px}
.hero h1 span{color:#7c8ff5}
.hero p{font-size:18px;opacity:.8;line-height:1.6;max-width:540px;margin:0 auto 36px}
.btn{
  display:inline-block;background:var(--blue);color:#fff;padding:14px 32px;
  border-radius:8px;font-size:16px;font-weight:600;text-decoration:none;
  transition:background .15s,transform .1s;
}
.btn:hover{background:var(--blue2);transform:translateY(-1px)}
.btn-ghost{
  display:inline-block;color:#fff;padding:14px 28px;border:2px solid rgba(255,255,255,.3);
  border-radius:8px;font-size:16px;font-weight:600;text-decoration:none;margin-left:12px;
  transition:border-color .15s;
}
.btn-ghost:hover{border-color:rgba(255,255,255,.7)}

/* ── FEATURES ── */
.section{padding:72px 24px;max-width:1080px;margin:0 auto}
.section-title{font-size:28px;font-weight:800;text-align:center;margin-bottom:8px}
.section-sub{font-size:16px;color:var(--muted);text-align:center;margin-bottom:52px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
.card{
  background:var(--card);border:1px solid var(--border);border-radius:var(--radius);
  padding:28px;transition:box-shadow .2s;
}
.card:hover{box-shadow:0 8px 28px rgba(0,0,0,.08)}
.card-icon{font-size:32px;margin-bottom:14px}
.card h3{font-size:17px;font-weight:700;margin-bottom:8px}
.card p{font-size:14px;color:var(--muted);line-height:1.6}

/* ── HOW ── */
.how{background:#fff;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.steps-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;max-width:900px;margin:0 auto}
.step{text-align:center}
.step-num{
  width:44px;height:44px;border-radius:50%;background:var(--blue);color:#fff;
  display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;
  margin:0 auto 14px;
}
.step h4{font-size:15px;font-weight:700;margin-bottom:6px}
.step p{font-size:13px;color:var(--muted);line-height:1.5}

/* ── CTA ── */
.cta{background:linear-gradient(135deg,#0f0f2a,#1a237e);color:#fff;text-align:center;padding:72px 24px}
.cta h2{font-size:32px;font-weight:800;margin-bottom:12px}
.cta p{font-size:16px;opacity:.75;margin-bottom:32px}

/* ── FOOTER ── */
footer{background:#0f0f2a;color:rgba(255,255,255,.4);text-align:center;padding:24px;font-size:12px}
footer a{color:rgba(255,255,255,.6);text-decoration:none}
footer a:hover{color:#fff}
</style>
</head>
<body>

<!-- HERO -->
<section class="hero">
  <div class="hero-inner">
    <div class="logo">News<em>day</em></div>
    <h1>Publica sin <span>complicaciones</span></h1>
    <p>CMS de archivos planos para publicaciones digitales. Sin base de datos, sin configuraciones complejas. Diseño grid drag &amp; drop listo en minutos.</p>
    <a href="Newsday.html" class="btn">Ir al panel de administración</a>
    <a href="#ventajas" class="btn-ghost">Descubrir</a>
  </div>
</section>

<!-- FEATURES -->
<div id="ventajas">
<section class="section">
  <div class="section-title">Todo lo que necesitas para publicar</div>
  <div class="section-sub">Diseñado para redacciones, bloggers y publicaciones independientes</div>
  <div class="grid">
    <div class="card">
      <div class="card-icon">⚡</div>
      <h3>Sin base de datos</h3>
      <p>Todo se guarda como archivos JSON y HTML en tu servidor. Sin MySQL, sin configuración, sin dependencias.</p>
    </div>
    <div class="card">
      <div class="card-icon">🎨</div>
      <h3>Editor grid drag &amp; drop</h3>
      <p>Diseña cada publicación en una cuadrícula de 12 columnas. Arrastra, redimensiona y reordena bloques con el ratón.</p>
    </div>
    <div class="card">
      <div class="card-icon">📱</div>
      <h3>Responsive automático</h3>
      <p>El sitio generado se adapta a móvil, tablet y escritorio sin configuración adicional.</p>
    </div>
    <div class="card">
      <div class="card-icon">🗂</div>
      <h3>Generador estático</h3>
      <p>Un clic genera HTML puro listo para servir. Rapidísimo para los visitantes, seguro por diseño.</p>
    </div>
    <div class="card">
      <div class="card-icon">📢</div>
      <h3>Gestión de anuncios</h3>
      <p>Zonas de anuncios con soporte para AdSense/código personalizado e imágenes con enlace. Sin plugins.</p>
    </div>
    <div class="card">
      <div class="card-icon">🔖</div>
      <h3>Tags y páginas estáticas</h3>
      <p>Organiza tu contenido con etiquetas. Crea páginas estáticas para el Acerca de, contacto o legales.</p>
    </div>
    <div class="card">
      <div class="card-icon">💾</div>
      <h3>Backup y restauración</h3>
      <p>Descarga un ZIP completo de todo tu contenido y medios. Restaura con un solo archivo.</p>
    </div>
    <div class="card">
      <div class="card-icon">🖼</div>
      <h3>Gestor de medios</h3>
      <p>Sube imágenes, audio, vídeo y documentos. Indexados y accesibles desde el editor en todo momento.</p>
    </div>
    <div class="card">
      <div class="card-icon">🔒</div>
      <h3>Seguro por defecto</h3>
      <p>Autenticación BCrypt, tokens API, sesiones seguras y acceso directo al contenido bloqueado por .htaccess.</p>
    </div>
  </div>
</section>
</div>

<!-- CÓMO FUNCIONA -->
<section class="how">
  <div class="section" style="padding-top:64px;padding-bottom:64px">
    <div class="section-title">Cómo funciona</div>
    <div class="section-sub">De la instalación a la primera publicación en minutos</div>
    <div class="steps-row">
      <div class="step">
        <div class="step-num">1</div>
        <h4>Instala</h4>
        <p>Sube los archivos a tu servidor PHP. El instalador se ejecuta una sola vez y se autoarchiva.</p>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <h4>Diseña</h4>
        <p>Abre el panel, arrastra bloques al grid y escribe tu contenido. El editor es visual e inmediato.</p>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <h4>Publica</h4>
        <p>Un clic en «Generar sitio» produce el HTML estático. Tus lectores ven páginas ultrarrápidas.</p>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <h4>Comparte</h4>
        <p>El feed RSS se genera automáticamente. Compatible con lectores de noticias y agregadores.</p>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta">
  <h2>Empieza a publicar ahora</h2>
  <p>El panel de administración te está esperando</p>
  <a href="Newsday.html" class="btn">Abrir el panel →</a>
</section>

<!-- FOOTER -->
<footer>
  <p>&copy; <?= $year ?> <?= htmlspecialchars($siteName) ?> · Construido con <a href="Newsday.html">Newsday</a></p>
</footer>

</body>
</html>
