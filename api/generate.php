<?php
/**
 * generate.php — Generación de sitio estático y vista previa
 */

// ════════════════════════════════════════════════════════════════
//  SITIO PÚBLICO
// ════════════════════════════════════════════════════════════════

function generateSite(): void {
    $publicDir = DIR_PUBLIC;
    $siteName  = defined('NEWSDAY_SITE_NAME') ? NEWSDAY_SITE_NAME : 'Newsday';
    $baseUrl   = normalizeBaseUrl(defined('NEWSDAY_BASE_URL') ? NEWSDAY_BASE_URL : '');
    $siteCfg   = loadSiteCfgData();

    if (!is_dir($publicDir)) mkdir($publicDir, 0755, true);

    // Copiar media dentro de public/media/
    if (is_dir(DIR_MEDIA)) {
        $pubMediaDir = "$publicDir/media";
        if (!is_dir($pubMediaDir)) mkdir($pubMediaDir, 0755, true);
        copyr(DIR_MEDIA, $pubMediaDir);
    }

    [$theme, $themeVars, $siteCfg] = prepareGenerationContext($siteCfg);
    [$allPosts, $generated]        = generatePostPages($publicDir, $siteName, $baseUrl, $siteCfg, $themeVars, false);

    usort($allPosts, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));

    // ── Índice o mantenimiento ────────────────────────────────
    $maintenance = $siteCfg['maintenance'] ?? ['active' => false];
    if (!empty($maintenance['active'])) {
        $maintHtml = buildMaintenancePage($maintenance['page'] ?? '', $siteName, $baseUrl, $siteCfg, $themeVars);
        file_put_contents("$publicDir/index.html", $maintHtml);
        $generated[] = 'index.html (mantenimiento activo)';
    } else {
        $generated[] = generateHomepage($publicDir, $allPosts, $siteName, $baseUrl, $siteCfg, $themeVars);
    }

    // ── Feed RSS ──────────────────────────────────────────────
    file_put_contents("$publicDir/feed.xml", buildRSSFeed($allPosts, $siteName, $baseUrl));
    $generated[] = 'feed.xml';

    // ── Páginas de etiqueta ───────────────────────────────────
    $tagFiles  = generateTagPages($publicDir, $allPosts, $siteName, $baseUrl, $siteCfg, $themeVars, 0);
    $generated = array_merge($generated, $tagFiles);

    // ── Páginas estáticas ─────────────────────────────────────
    $pageFiles = generateStaticPages($publicDir, $siteName, $baseUrl, $siteCfg, $themeVars);
    $generated = array_merge($generated, $pageFiles);

    // ── Favicon — copiar a public/ ────────────────────────────
    if (function_exists('copyFaviconsToPublic')) {
        $favFiles  = copyFaviconsToPublic($publicDir);
        $generated = array_merge($generated, $favFiles);
    }

    // ── Sitemap XML ───────────────────────────────────────────
    file_put_contents("$publicDir/sitemap.xml", buildSitemapXml($allPosts, $siteName, $baseUrl, $siteCfg));
    $generated[] = 'sitemap.xml';

    // ── robots.txt ────────────────────────────────────────────
    file_put_contents("$publicDir/robots.txt", buildRobotsTxt($baseUrl));
    $generated[] = 'robots.txt';

    // ── manifest.json (PWA) ───────────────────────────────────
    file_put_contents("$publicDir/manifest.json", buildManifestJson($siteName, $baseUrl));
    $generated[] = 'manifest.json';

    // ── Inyectar favicon + manifest + RSS en todos los HTML ───
    if (function_exists('ndInjectHeadExtras')) {
        ndInjectHeadExtras($publicDir, $baseUrl, $siteName);
    }

    sendJSON(['ok' => true, 'generated' => count($allPosts), 'files' => $generated]);
}

// ════════════════════════════════════════════════════════════════
//  VISTA PREVIA TEMPORAL (incluye borradores, URLs relativas)
// ════════════════════════════════════════════════════════════════

function generatePreview(): void {
    $previewDir = DIR_PREVIEW;
    $siteName   = defined('NEWSDAY_SITE_NAME') ? NEWSDAY_SITE_NAME : 'Newsday';
    $baseUrl    = '';   // URLs relativas para el iframe
    $siteCfg    = loadSiteCfgData();

    // Limpiar y recrear directorio preview
    if (is_dir($previewDir)) rrmdir($previewDir);
    mkdir($previewDir, 0755, true);

    // Copiar media
    if (is_dir(DIR_MEDIA)) {
        $pmedia = "$previewDir/media";
        if (!is_dir($pmedia)) mkdir($pmedia, 0755, true);
        copyr(DIR_MEDIA, $pmedia);
    }

    [$theme, $themeVars, $siteCfg] = prepareGenerationContext($siteCfg);
    [$allPosts, $generated]        = generatePostPages($previewDir, $siteName, $baseUrl, $siteCfg, $themeVars, true);

    usort($allPosts, fn($a, $b) => strcmp($b['date'] ?? '', $a['date'] ?? ''));

    // ── Índice — mismo tipo que el sitio publicado ────────────
    // (portada personalizada, página estática o lista de posts)
    // El modo mantenimiento NO se aplica en preview.
    $generated[] = generateHomepage($previewDir, $allPosts, $siteName, $baseUrl, $siteCfg, $themeVars);

    // ── Páginas de etiqueta ───────────────────────────────────
    $tagFiles  = generateTagPages($previewDir, $allPosts, $siteName, $baseUrl, $siteCfg, $themeVars, 0);
    $generated = array_merge($generated, $tagFiles);

    // ── Páginas estáticas ─────────────────────────────────────
    $pageFiles = generateStaticPages($previewDir, $siteName, $baseUrl, $siteCfg, $themeVars);
    $generated = array_merge($generated, $pageFiles);

    // ── Inyectar rastreador de navegación en cada HTML ────────
    // Permite que el panel admin sincronice su URL bar con el iframe
    injectPreviewNavTracker($previewDir);

    sendJSON(['ok' => true, 'files' => $generated]);
}

/**
 * Inyecta un script postMessage en cada archivo HTML del preview.
 * El script reporta la URL actual al frame padre cada vez que
 * la página carga — esto mantiene la barra de URL del admin en sync
 * al navegar entre posts, tags y páginas estáticas.
 */
function injectPreviewNavTracker(string $dir): void {
    $script = '<script data-nd="nav-tracker">'
        . 'window.addEventListener("load",function(){'
        . 'try{parent.postMessage({ndPreview:true,url:location.href},"*")}catch(e){}'
        . '});'
        . 'document.addEventListener("click",function(e){'
        . 'var a=e.target.closest("a");'
        . 'if(!a||!a.href)return;'
        . 'try{parent.postMessage({ndPreview:true,url:a.href},"*")}catch(e){}'
        . '});'
        . '</script>';

    $rii = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    foreach ($rii as $file) {
        if ($file->getExtension() !== 'html') continue;
        $html = file_get_contents($file->getPathname());
        if (str_contains($html, 'data-nd="nav-tracker"')) continue;
        $patched = str_replace('</head>', $script . '</head>', $html);
        if ($patched !== $html) file_put_contents($file->getPathname(), $patched);
    }
}

// ════════════════════════════════════════════════════════════════
//  HELPERS DE GENERACIÓN COMPARTIDOS
// ════════════════════════════════════════════════════════════════

/** Inicializa el tema, idioma y campos auxiliares del siteCfg. */
function prepareGenerationContext(array $siteCfg): array {
    $theme        = loadTheme($siteCfg['theme'] ?? 'newsday');
    $themeVars    = $theme['vars'];
    $contentLangs = $siteCfg['contentLangs'] ?? ['es'];
    $siteCfg['_primaryLang']  = $contentLangs[0] ?? 'es';
    $siteCfg['_contentLangs'] = $contentLangs;
    return [$theme, $themeVars, $siteCfg];
}

/**
 * Genera las páginas individuales de posts y devuelve [allPosts[], generatedFiles[]].
 * $includeDrafts = true en modo preview.
 *
 * Lógica de acceso (solo en modo publicación, no en preview):
 *   public      → genera HTML estático normal en $outDir/$slug/
 *   members     → genera solo un teaser estático; contenido completo via reader.php
 *   subscriber  → solo teaser estático
 *   premium     → solo teaser estático
 *
 * Los teasers incluyen un "candado" con enlace al portal de lectores.
 */
function generatePostPages(
    string $outDir,
    string $siteName,
    string $baseUrl,
    array  $siteCfg,
    string $themeVars,
    bool   $includeDrafts
): array {
    $postsDir  = DIR_POSTS;
    $allPosts  = [];
    $generated = [];
    if (!is_dir($postsDir)) return [$allPosts, $generated];

    foreach (scandir($postsDir) as $id) {
        if ($id[0] === '.') continue;
        $dir = "$postsDir/$id";
        if (!is_dir($dir)) continue;
        $meta = readJSON("$dir/meta.json");
        if (!$meta) continue;
        $isDraft = ($meta['status'] ?? 'draft') !== 'published';
        if ($isDraft && !$includeDrafts) continue;

        $access   = $meta['access'] ?? 'public';
        $layout   = readJSON("$dir/layout.json") ?? ['cols' => 12, 'rows' => 16, 'blocks' => []];
        $content  = is_file("$dir/content.html") ? file_get_contents("$dir/content.html") : '';
        $postSlug = $meta['slug'] ?? $id;
        $postDir  = "$outDir/$postSlug";
        if (!is_dir($postDir)) mkdir($postDir, 0755, true);

        if ($isDraft) $meta['_previewDraft'] = true;

        // En preview siempre se genera el contenido completo
        if ($includeDrafts || $access === 'public') {
            $html = buildPostPage($meta, $layout, $content, $siteName, $baseUrl, $siteCfg, $themeVars);
        } else {
            // Contenido privado: genera un teaser con candado
            $html = buildPaywallTeaserPage($meta, $siteName, $baseUrl, $siteCfg, $themeVars);
        }

        file_put_contents("$postDir/index.html", $html);
        $meta['id']   = $id;
        $meta['slug'] = $postSlug;
        $allPosts[]   = $meta;
        $generated[]  = "$postSlug/index.html" . ($access !== 'public' && !$includeDrafts ? " [privado:$access]" : '');
    }
    return [$allPosts, $generated];
}

/**
 * Genera una página de teaser con candado para contenido privado.
 * Muestra el título, fecha y un extracto mínimo, con botón para acceder via reader.php.
 */
function buildPaywallTeaserPage(
    array  $meta,
    string $siteName,
    string $baseUrl,
    array  $siteCfg,
    string $themeVars
): string {
    $title      = htmlspecialchars($meta['title'] ?? 'Sin título');
    $date       = htmlspecialchars($meta['date']  ?? '');
    $tags       = htmlspecialchars($meta['tags']  ?? '');
    $slug       = htmlspecialchars($meta['slug']  ?? '');
    $access     = $meta['access'] ?? 'members';
    $sn         = htmlspecialchars($siteName);
    $lang       = htmlspecialchars($siteCfg['_primaryLang'] ?? 'es');
    $homeHref   = relHome($baseUrl, 1);
    // reader.php vive en la raíz de la instalación; la página del post está en
    // public/<slug>/index.html, dos niveles por debajo → ../../reader.php.
    $slug       = $meta['slug'] ?? '';
    $slugJson   = json_encode($slug);
    $returnPath = 'public/' . $slug . '/';
    $loginUrl   = '../../reader.php?page=login&return=' . rawurlencode($returnPath);

    $accessLabel = match($access) {
        'premium'    => '★ Contenido Premium',
        'subscriber' => '◆ Solo Suscriptores',
        'members'    => '👤 Solo Miembros',
        default      => '🔒 Contenido Privado',
    };
    $accessDesc = match($access) {
        'premium'    => 'Este contenido es exclusivo para lectores con acceso Premium.',
        'subscriber' => 'Necesitas una suscripción activa para leer este artículo completo.',
        'members'    => 'Regístrate gratis para acceder a este contenido para miembros.',
        default      => 'Este contenido requiere identificación para acceder.',
    };
    $btnLabel = match($access) {
        'members' => 'Registrarme gratis',
        default   => 'Acceder con mi cuenta',
    };
    $registerUrl = '../../reader.php?page=register';

    $hBlocks     = $siteCfg['headerBlocks'] ?? [];
    $fBlocks     = $siteCfg['footerBlocks'] ?? [];
    $navItems    = $siteCfg['nav']          ?? [];
    $adZones     = $siteCfg['adZones']      ?? [];
    $typeCSS     = getTypeCSS();
    $globalHeader = buildSiteSection($hBlocks, $navItems, $adZones, $baseUrl, $typeCSS, $siteName, 1);
    $globalFooter = buildSiteSection($fBlocks, $navItems, $adZones, $baseUrl, $typeCSS, $siteName, 1);
    $date_gen  = date('Y-m-d');
    $tagsHtml  = $tags ? '<span>· ' . $tags . '</span>' : '';

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$title} — {$sn}</title>
<style>
:root{{$themeVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-body-font,Georgia,serif);background:var(--th-body-bg,#f5f5f5);color:var(--th-text,#1a1a1a)}
#nd-wrap{max-width:800px;margin:0 auto;background:var(--th-wrap-bg,#fff);box-shadow:var(--th-wrap-shadow,none);min-height:100vh}
.nd-post-hero{padding:40px 40px 28px;border-bottom:1px solid #e2e8f0}
.nd-post-title{font-size:28px;font-weight:800;line-height:1.3;margin-bottom:12px;color:var(--th-heading,#12122a)}
.nd-post-meta{font-size:13px;color:#94a3b8;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.nd-access-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#fef9c3;color:#92400e}
.nd-paywall{margin:32px 40px;background:#f8fafc;border:2px dashed #cbd5e1;border-radius:16px;padding:40px;text-align:center}
.nd-paywall-icon{font-size:48px;margin-bottom:16px}
.nd-paywall-title{font-size:20px;font-weight:700;color:#12122a;margin-bottom:10px}
.nd-paywall-desc{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;max-width:400px;margin-left:auto;margin-right:auto}
.nd-paywall-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.nd-btn-login{display:inline-block;padding:11px 24px;background:#5068e8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
.nd-btn-login:hover{opacity:.88}
.nd-btn-reg{display:inline-block;padding:11px 24px;background:#f1f5f9;color:#475569;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
.nd-btn-reg:hover{background:#e2e8f0}
.nd-back{display:inline-block;margin:0 40px 24px;font-size:13px;color:var(--th-accent,#5068e8);text-decoration:none}
.nd-back:hover{text-decoration:underline}
.nd-post-body{padding:8px 40px 40px;font-size:16px;line-height:1.75}
.nd-post-body p{margin:0 0 16px}.nd-post-body img{max-width:100%;height:auto}
a{color:var(--th-accent,#5068e8)}
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}.nd-nav a:hover{opacity:.75}
</style>
</head>
<body>
<div id="nd-wrap">
{$globalHeader}
<div class="nd-post-hero">
  <h1 class="nd-post-title">{$title}</h1>
  <div class="nd-post-meta">
    {$date}
    {$tagsHtml}
    <span class="nd-access-badge">{$accessLabel}</span>
  </div>
</div>
<div class="nd-paywall" id="nd-locked">
  <div class="nd-paywall-icon">🔒</div>
  <div class="nd-paywall-title">{$accessLabel}</div>
  <div class="nd-paywall-desc">{$accessDesc}</div>
  <div class="nd-paywall-btns">
    <a href="{$loginUrl}" class="nd-btn-login">Acceder con mi cuenta</a>
    <a href="{$registerUrl}" class="nd-btn-reg">{$btnLabel}</a>
  </div>
</div>
<div id="nd-unlocked" class="nd-post-body" style="display:none"></div>
<a href="{$homeHref}" class="nd-back">← Volver al inicio</a>
{$globalFooter}
</div>
<script>
// Si el lector ya está autenticado y su tier da acceso, se carga el
// contenido completo inline (reader.php lo sirve tras validar el tier).
(function(){
  var slug={$slugJson}, base='../../reader.php';
  fetch(base+'?action=check',{credentials:'include'})
    .then(function(r){return r.json();})
    .then(function(s){
      if(!s || !s.auth) return;                 // sin sesión → se mantiene el teaser
      return fetch(base+'?action=content&slug='+encodeURIComponent(slug),{credentials:'include'})
        .then(function(r){return r.ok? r.json():null;})
        .then(function(d){
          if(d && d.content){
            var l=document.getElementById('nd-locked'); if(l) l.style.display='none';
            var u=document.getElementById('nd-unlocked');
            u.innerHTML=d.content; u.style.display='';
          }
        });
    }).catch(function(){});
})();
</script>
<!-- Newsday v0.8 · {$date_gen} -->
</body>
</html>
HTML;
}

/**
 * Genera la página de inicio según siteStructure.homepage.
 * Devuelve la línea descriptiva para el array $generated.
 */
function generateHomepage(
    string $publicDir,
    array  $allPosts,
    string $siteName,
    string $baseUrl,
    array  $siteCfg,
    string $themeVars
): string {
    $siteStruct   = $siteCfg['siteStructure'] ?? [];
    $homepageType = $siteStruct['homepage']   ?? 'posts';

    if ($homepageType === 'portada') {
        $activeId    = $siteStruct['activePortada'] ?? '';
        $portadaFile = DIR_LAYOUTS . "/$activeId.json";
        if ($activeId && is_file($portadaFile)) {
            $portadaLayout = json_decode(file_get_contents($portadaFile), true) ?? [];
            $html = buildPortadaPage($portadaLayout, $allPosts, $siteName, $baseUrl, $siteCfg, $themeVars);
            file_put_contents("$publicDir/index.html", $html);
            return 'index.html (portada: ' . ($portadaLayout['name'] ?? $activeId) . ')';
        }
        // Portada activa no encontrada → fallback lista
        file_put_contents("$publicDir/index.html", buildIndexPage($allPosts, $siteName, $baseUrl, $siteCfg, $themeVars));
        return 'index.html (fallback: portada no encontrada)';
    }

    if ($homepageType === 'page') {
        $pageSlug = $siteStruct['homepageRef'] ?? '';
        $pageHtml = buildHomepageFromPage($pageSlug, $siteName, $baseUrl, $siteCfg, $themeVars);
        file_put_contents(
            "$publicDir/index.html",
            $pageHtml ?? buildIndexPage($allPosts, $siteName, $baseUrl, $siteCfg, $themeVars)
        );
        return 'index.html (página: ' . $pageSlug . ')';
    }

    // posts (por defecto)
    file_put_contents("$publicDir/index.html", buildIndexPage($allPosts, $siteName, $baseUrl, $siteCfg, $themeVars));
    return 'index.html';
}

/** Genera páginas de etiqueta y devuelve array de rutas generadas. */
function generateTagPages(
    string $outDir,
    array  $allPosts,
    string $siteName,
    string $baseUrl,
    array  $siteCfg,
    string $themeVars,
    int    $depth
): array {
    $generated = [];
    $tagMap    = [];
    foreach ($allPosts as $p) {
        $tags = array_filter(array_map('trim', explode(',', $p['tags'] ?? '')));
        foreach ($tags as $tag) {
            $ts = makeSlug($tag);
            $tagMap[$ts]['label']   = $tag;
            $tagMap[$ts]['posts'][] = $p;
        }
    }
    $tagDir = "$outDir/tag";
    if (!is_dir($tagDir)) mkdir($tagDir, 0755, true);
    foreach ($tagMap as $ts => $data) {
        $td = "$tagDir/$ts";
        if (!is_dir($td)) mkdir($td, 0755, true);
        file_put_contents(
            "$td/index.html",
            buildTagPage($data['label'], $data['posts'], $siteName, $baseUrl, $siteCfg, $themeVars)
        );
        $generated[] = "tag/$ts/index.html";
    }
    return $generated;
}

/** Genera páginas estáticas y devuelve array de rutas generadas. */
function generateStaticPages(
    string $outDir,
    string $siteName,
    string $baseUrl,
    array  $siteCfg,
    string $themeVars
): array {
    $generated = [];
    if (!is_dir(DIR_PAGES)) return $generated;
    foreach (scandir(DIR_PAGES) as $pid) {
        if ($pid[0] === '.') continue;
        $pdir = DIR_PAGES . "/$pid";
        if (!is_dir($pdir)) continue;
        $pmeta = readJSON("$pdir/meta.json");
        if (!$pmeta) continue;
        $pcontent = is_file("$pdir/content.html") ? file_get_contents("$pdir/content.html") : '';
        $pslug    = $pmeta['slug'] ?? $pid;
        $ppubDir  = "$outDir/$pslug";
        if (!is_dir($ppubDir)) mkdir($ppubDir, 0755, true);
        file_put_contents(
            "$ppubDir/index.html",
            buildStaticPage($pmeta, $pcontent, $siteName, $baseUrl, $siteCfg, $themeVars)
        );
        $generated[] = "$pslug/index.html (página)";
    }
    return $generated;
}

// ════════════════════════════════════════════════════════════════
//  PORTADA PERSONALIZADA
// ════════════════════════════════════════════════════════════════

function buildPortadaPage(
    array  $layout,
    array  $allPosts,
    string $siteName,
    string $baseUrl,
    array  $siteCfg = [],
    string $themeVars = ''
): string {
    $blocks      = $layout['blocks'] ?? [];
    $layoutId    = $layout['id']     ?? '';
    $lang        = htmlspecialchars($siteCfg['_primaryLang'] ?? 'es');
    $navItems    = $siteCfg['nav']          ?? [];
    $adZones     = $siteCfg['adZones']      ?? [];
    $hBlocks     = $siteCfg['headerBlocks'] ?? [];
    $fBlocks     = $siteCfg['footerBlocks'] ?? [];
    $assignments = ($siteCfg['blockAssignments'] ?? [])[$layoutId] ?? [];
    $sn          = htmlspecialchars($siteName);
    $typeCSS     = getTypeCSS();
    $blockCSS    = '';
    $blockHTML   = '';

    foreach ($blocks as $b) {
        $bid   = $b['id'] ?? 0;
        $btype = $b['t']  ?? 'text';
        $asgn  = $assignments[$bid] ?? ['type' => 'auto', 'ref' => ''];
        $blockCSS  .= buildBlockCSS($b, $typeCSS);
        $blockHTML .= "  <div id=\"b$bid\">" . resolvePortadaBlock($btype, $b, $asgn, $allPosts, $baseUrl, $navItems, $adZones, $siteName, $siteCfg) . "</div>\n";
    }

    $globalHeader = buildSiteSection($hBlocks, $navItems, $adZones, $baseUrl, $typeCSS, $siteName, 0);
    $globalFooter = buildSiteSection($fBlocks, $navItems, $adZones, $baseUrl, $typeCSS, $siteName, 0);
    $date         = date('Y-m-d');

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$sn}</title>
<style>
:root{{$themeVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-body-font,Georgia,serif);background:var(--th-body-bg,#f5f5f5);color:var(--th-text,#1a1a1a)}
#nd-wrap{max-width:1200px;margin:0 auto;background:var(--th-wrap-bg,#fff);box-shadow:var(--th-wrap-shadow,none)}
#nd-page{display:grid;grid-template-columns:repeat(12,1fr);grid-auto-rows:48px}
{$blockCSS}
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}.nd-nav a:hover{opacity:.75}
a{color:var(--th-accent,#5068e8)}
img{max-width:100%}
@media(max-width:700px){#nd-page{grid-template-columns:repeat(6,1fr)}}
@media(max-width:480px){#nd-page{display:flex;flex-direction:column}#nd-page>*{height:auto!important;min-height:48px}}
</style>
</head>
<body>
<div id="nd-wrap">
{$globalHeader}
<div id="nd-page">
{$blockHTML}</div>
{$globalFooter}
</div>
<!-- Newsday v0.6 · {$date} -->
</body>
</html>
HTML;
}

/** Resuelve el contenido de cualquier bloque en una portada. */
function resolvePortadaBlock(
    string $btype,
    array  $b,
    array  $asgn,
    array  $allPosts,
    string $baseUrl,
    array  $navItems,
    array  $adZones,
    string $siteName,
    array  $siteCfg
): string {
    $sn = htmlspecialchars($siteName);
    switch ($btype) {
        case 'content':
            return resolvePortadaBlockContent($asgn, $allPosts, $baseUrl, $siteCfg);
        case 'sidebar':
            return resolvePortadaBlockSidebar($asgn, $allPosts, $baseUrl, $siteCfg);
        case 'image':
            $url  = $b['mediaUrl'] ?? '';
            $alt  = htmlspecialchars($b['tx'] ?? '');
            $src  = relMedia($baseUrl, $url, 0);
            return $url
                ? "<img src=\"" . htmlspecialchars($src) . "\" alt=\"$alt\" style=\"width:100%;height:100%;object-fit:cover\">"
                : '<span style="font-size:48px;opacity:.3">🖼</span>';
        case 'separator':
            return '<hr style="border:none;border-top:2px solid var(--th-border);width:100%">';
        case 'nav':
            return buildSiteNavHtml($navItems, $b['tx'] ?? '', $baseUrl, 'color:inherit;text-decoration:none', 0);
        case 'ad':
            return resolveAdZone($b['tx'] ?? '', $adZones, $baseUrl, 0);
        case 'site-logo':
            $logoUrl  = $b['mediaUrl'] ?? '';
            $homeHref = relHome($baseUrl, 0);
            $logoSrc  = htmlspecialchars(relMedia($baseUrl, $logoUrl, 0));
            return $logoUrl
                ? "<a href=\"$homeHref\" style=\"display:inline-flex;align-items:center;text-decoration:none\"><img src=\"$logoSrc\" alt=\"$sn\" style=\"max-height:60px;width:auto\"></a>"
                : "<a href=\"$homeHref\" style=\"font-weight:800;font-size:20px;letter-spacing:3px;text-decoration:none;color:inherit\">$sn</a>";
        case 'site-title':
            $homeHref = relHome($baseUrl, 0);
            return "<a href=\"$homeHref\" style=\"font-size:18px;font-weight:700;text-decoration:none;color:inherit\">$sn</a>";
        case 'site-desc':
            return '<span style="font-size:13px;opacity:.75">' . nl2br(htmlspecialchars($b['tx'] ?? '')) . '</span>';
        case 'site-promo':
            return '<div style="font-size:14px;line-height:1.6">' . nl2br(htmlspecialchars($b['tx'] ?? '')) . '</div>';
        default:
            return nl2br(htmlspecialchars($b['tx'] ?? ''));
    }
}

function resolvePortadaBlockContent(array $asgn, array $allPosts, string $baseUrl, array $siteCfg): string {
    $type = $asgn['type'] ?? 'auto';
    $ref  = $asgn['ref']  ?? '';

    if ($type === 'post' && $ref) {
        foreach ($allPosts as $post) {
            if (($post['id'] ?? '') === $ref || ($post['slug'] ?? '') === $ref) {
                $postDir = DIR_POSTS . '/' . $post['id'];
                $content = is_file("$postDir/content.html") ? file_get_contents("$postDir/content.html") : '';
                $slug    = htmlspecialchars($post['slug'] ?? $post['id']);
                $title   = htmlspecialchars($post['title'] ?? '');
                $href    = relLink($baseUrl, "$slug/", 0);
                return "<h2 style=\"margin-bottom:12px\"><a href=\"$href\" style=\"color:var(--th-heading);text-decoration:none\">$title</a></h2>"
                     . rewriteContentMediaUrls($content, $baseUrl, 0);
            }
        }
    }
    if ($type === 'page' && $ref && is_dir(DIR_PAGES)) {
        foreach (scandir(DIR_PAGES) as $pid) {
            if ($pid[0] === '.') continue;
            $pmeta = readJSON(DIR_PAGES . "/$pid/meta.json");
            if ($pmeta && ($pmeta['slug'] ?? '') === $ref) {
                return is_file(DIR_PAGES . "/$pid/content.html")
                    ? file_get_contents(DIR_PAGES . "/$pid/content.html") : '';
            }
        }
    }
    if ($type === 'text' && $ref) {
        return '<div style="line-height:1.7">' . nl2br(htmlspecialchars($ref)) . '</div>';
    }
    return buildRecentPostsHtml($allPosts, $baseUrl, 6);
}

function resolvePortadaBlockSidebar(array $asgn, array $allPosts, string $baseUrl, array $siteCfg): string {
    $type = $asgn['type'] ?? 'auto';
    $ref  = $asgn['ref']  ?? '';

    if ($type === 'tag' && $ref) {
        $filtered = array_values(array_filter($allPosts, fn($p) => str_contains($p['tags'] ?? '', $ref)));
        $ts       = makeSlug($ref);
        $href     = relLink($baseUrl, "tag/$ts/", 0);
        $label    = htmlspecialchars($ref);
        return "<div style=\"font-weight:700;font-size:13px;margin-bottom:10px;color:var(--th-heading)\">"
             . "<a href=\"$href\" style=\"color:inherit;text-decoration:none\">$label</a></div>"
             . buildRecentPostsHtml($filtered, $baseUrl, 5);
    }
    if ($type === 'post' && $ref) {
        return resolvePortadaBlockContent($asgn, $allPosts, $baseUrl, $siteCfg);
    }
    if ($type === 'text' && $ref) {
        return '<div style="line-height:1.7;font-size:14px">' . nl2br(htmlspecialchars($ref)) . '</div>';
    }
    return buildRecentPostsHtml($allPosts, $baseUrl, 5);
}

function buildRecentPostsHtml(array $posts, string $baseUrl, int $limit = 5): string {
    if (!$posts) return '<p style="color:var(--th-muted);font-size:14px">Sin publicaciones</p>';
    $html = '<ul style="list-style:none;padding:0;margin:0">';
    foreach (array_slice($posts, 0, $limit) as $p) {
        $slug   = htmlspecialchars($p['slug'] ?? $p['id'] ?? '');
        $title  = htmlspecialchars($p['title'] ?? 'Sin título');
        $date   = htmlspecialchars($p['date']  ?? '');
        $href   = relLink($baseUrl, "$slug/", 0);
        $access = $p['access'] ?? 'public';
        $lock   = match($access) {
            'premium'    => ' <span style="font-size:10px;background:#fef9c3;color:#92400e;border-radius:8px;padding:1px 5px;vertical-align:middle">★</span>',
            'subscriber' => ' <span style="font-size:10px;background:#ede9fe;color:#6d28d9;border-radius:8px;padding:1px 5px;vertical-align:middle">◆</span>',
            'members'    => ' <span style="font-size:10px;background:#e0f2fe;color:#0369a1;border-radius:8px;padding:1px 5px;vertical-align:middle">👤</span>',
            default      => '',
        };
        $html .= "<li style=\"padding:8px 0;border-bottom:1px solid var(--th-border)\">"
               . "<a href=\"$href\" style=\"color:var(--th-heading);text-decoration:none;font-weight:600;font-size:14px;display:block\">$title$lock</a>"
               . ($date ? "<span style=\"font-size:11px;color:var(--th-muted)\">$date</span>" : '')
               . "</li>";
    }
    $html .= '</ul>';
    return $html;
}

function buildHomepageFromPage(
    string $pageSlug,
    string $siteName,
    string $baseUrl,
    array  $siteCfg,
    string $themeVars
): ?string {
    if (!$pageSlug || !is_dir(DIR_PAGES)) return null;
    foreach (scandir(DIR_PAGES) as $pid) {
        if ($pid[0] === '.') continue;
        $pmeta = readJSON(DIR_PAGES . "/$pid/meta.json");
        if ($pmeta && ($pmeta['slug'] ?? '') === $pageSlug) {
            $pcontent = is_file(DIR_PAGES . "/$pid/content.html")
                ? file_get_contents(DIR_PAGES . "/$pid/content.html") : '';
            return buildStaticPage($pmeta, $pcontent, $siteName, $baseUrl, $siteCfg, $themeVars);
        }
    }
    return null;
}

// ════════════════════════════════════════════════════════════════
//  SITEMAP XML
// ════════════════════════════════════════════════════════════════
function buildSitemapXml(array $allPosts, string $siteName, string $baseUrl, array $siteCfg): string {
    $b    = rtrim($baseUrl, '/');
    $now  = date('Y-m-d');
    $urls = [];

    // Página principal
    $urls[] = "<url>\n  <loc>{$b}/</loc>\n  <changefreq>daily</changefreq>\n  <priority>1.0</priority>\n</url>";

    // Posts publicados
    foreach ($allPosts as $p) {
        $slug    = htmlspecialchars($p['slug'] ?? '');
        if (!$slug) continue;
        $lastmod = htmlspecialchars(substr($p['date'] ?? $now, 0, 10));
        $urls[] = "<url>\n  <loc>{$b}/{$slug}/</loc>\n  <lastmod>{$lastmod}</lastmod>\n  <changefreq>weekly</changefreq>\n  <priority>0.8</priority>\n</url>";
    }

    // Páginas estáticas
    if (is_dir(DIR_PAGES)) {
        foreach (scandir(DIR_PAGES) as $pid) {
            if ($pid[0] === '.') continue;
            $pmeta = readJSON(DIR_PAGES . "/$pid/meta.json");
            if (!$pmeta || empty($pmeta['slug'])) continue;
            $slug    = htmlspecialchars($pmeta['slug']);
            $lastmod = htmlspecialchars(substr($pmeta['updatedAt'] ?? $now, 0, 10));
            $urls[] = "<url>\n  <loc>{$b}/{$slug}/</loc>\n  <lastmod>{$lastmod}</lastmod>\n  <changefreq>monthly</changefreq>\n  <priority>0.6</priority>\n</url>";
        }
    }

    // Páginas de etiquetas
    $tagSet = [];
    foreach ($allPosts as $p) {
        foreach (array_filter(array_map('trim', explode(',', $p['tags'] ?? ''))) as $tag) {
            $tagSet[makeSlug($tag)] = true;
        }
    }
    foreach (array_keys($tagSet) as $slug) {
        $urls[] = "<url>\n  <loc>{$b}/tag/{$slug}/</loc>\n  <changefreq>weekly</changefreq>\n  <priority>0.5</priority>\n</url>";
    }

    $urlBlock = implode("\n", $urls);
    return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{$urlBlock}
</urlset>
XML;
}

// ════════════════════════════════════════════════════════════════
//  ROBOTS.TXT
// ════════════════════════════════════════════════════════════════
function buildRobotsTxt(string $baseUrl): string {
    $b = rtrim($baseUrl, '/');
    return "User-agent: *\nAllow: /\n\nSitemap: {$b}/sitemap.xml\n";
}

// ════════════════════════════════════════════════════════════════
//  MANIFEST.JSON (PWA)
// ════════════════════════════════════════════════════════════════
function buildManifestJson(string $siteName, string $baseUrl): string {
    $b       = rtrim($baseUrl, '/');
    $hasIcons = is_file(DIR_FAVICONS . '/icon-192.png');

    $data = [
        'name'             => $siteName,
        'short_name'       => mb_substr($siteName, 0, 12),
        'start_url'        => $b ? "$b/" : '/',
        'display'          => 'standalone',
        'background_color' => '#ffffff',
        'theme_color'      => '#ffffff',
    ];

    if ($hasIcons) {
        $data['icons'] = [
            ['src' => "$b/icon-192.png", 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any maskable'],
            ['src' => "$b/icon-512.png", 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any maskable'],
        ];
    }

    return json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
