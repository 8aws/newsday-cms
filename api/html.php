<?php
/**
 * html.php — Constructores de páginas HTML estáticas
 *
 * Correcciones incluidas:
 *  - buildPostPage: fallback article cuando no hay bloques o no hay bloque 'content'
 *  - buildNavHref: soporte para tipo 'post' en navegación
 *  - getTypeCSS(): función única, elimina duplicación en 6 funciones
 *  - buildBlockInner(): renderizado de bloque extraído y compartido
 */

// ════════════════════════════════════════════════════════════════
//  CSS COMPARTIDO
// ════════════════════════════════════════════════════════════════

/** Estilos inline por tipo de bloque. Centralizado — antes estaba duplicado 6 veces. */
function getTypeCSS(): array {
    return [
        'header'    => 'background:var(--th-header-bg);color:var(--th-header-fg);padding:20px 28px;font-size:22px;font-weight:700;',
        'nav'       => 'background:var(--th-nav-bg);color:var(--th-nav-fg);padding:10px 28px;font-size:13px;display:flex;gap:20px;align-items:center;flex-wrap:wrap;',
        'content'   => 'padding:28px 32px;color:var(--th-text);line-height:1.8;font-size:16px;overflow:auto;',
        'sidebar'   => 'background:var(--th-sidebar-bg);padding:18px;color:var(--th-text);border-left:1px solid var(--th-sidebar-border);overflow:auto;',
        'image'     => 'overflow:hidden;background:var(--th-sidebar-bg);display:flex;align-items:center;justify-content:center;',
        'text'      => 'padding:18px 22px;color:var(--th-text);font-size:15px;line-height:1.7;overflow:auto;',
        'pullquote' => 'background:var(--th-pullquote-bg);padding:22px 28px;color:var(--th-pullquote-fg);font-style:italic;font-size:17px;border-left:4px solid var(--th-pullquote-border);display:flex;align-items:center;',
        'footer'    => 'background:var(--th-footer-bg);color:var(--th-footer-fg);padding:18px 28px;font-size:13px;display:flex;align-items:center;',
        'separator' => 'display:flex;align-items:center;padding:0 20px;',
        'ad'        => 'background:#fffbeb;display:flex;align-items:center;justify-content:center;color:#d97706;font-size:13px;font-weight:600;',
        'site-logo' => 'background:var(--th-header-bg);display:flex;align-items:center;padding:8px 20px;',
        'site-title'=> 'background:var(--th-header-bg);color:var(--th-header-fg);display:flex;align-items:center;padding:8px 20px;',
        'site-desc' => 'padding:8px 20px;color:var(--th-nav-fg);font-size:13px;background:var(--th-nav-bg);',
        'site-promo'=> 'background:var(--th-nav-bg);color:var(--th-nav-fg);padding:12px 20px;',
    ];
}

// ════════════════════════════════════════════════════════════════
//  RENDERIZADO DE BLOQUES
// ════════════════════════════════════════════════════════════════

/**
 * Genera el HTML interior de un bloque de layout dado su tipo.
 * $postContent: contenido del post (para bloques tipo 'content')
 * $depth: profundidad de carpeta para URLs relativas
 */
function buildBlockInner(
    array  $b,
    string $postContent,
    string $baseUrl,
    array  $navItems,
    array  $adZones,
    string $siteName,
    int    $depth
): string {
    $btype = $b['t'] ?? 'text';
    $sn    = htmlspecialchars($siteName);

    switch ($btype) {
        case 'content':
            return $postContent !== ''
                ? rewriteContentMediaUrls($postContent, $baseUrl, $depth)
                : '<p style="color:#94a3b8">Sin contenido</p>';

        case 'image':
            $url = $b['mediaUrl'] ?? '';
            $alt = htmlspecialchars($b['tx'] ?? '');
            $src = relMedia($baseUrl, $url, $depth);
            return $url
                ? "<img src=\"" . htmlspecialchars($src) . "\" alt=\"$alt\" style=\"width:100%;height:100%;object-fit:cover\">"
                : '<span style="font-size:48px;opacity:.3">🖼</span>';

        case 'separator':
            return '<hr style="border:none;border-top:2px solid var(--th-border);width:100%">';

        case 'nav':
            return buildSiteNavHtml($navItems, $b['tx'] ?? '', $baseUrl, 'color:inherit;text-decoration:none', $depth);

        case 'ad':
            return resolveAdZone($b['tx'] ?? '', $adZones, $baseUrl, $depth);

        case 'site-logo':
            $logoUrl  = $b['mediaUrl'] ?? '';
            $homeHref = relHome($baseUrl, $depth);
            $logoSrc  = htmlspecialchars(relMedia($baseUrl, $logoUrl, $depth));
            return $logoUrl
                ? "<a href=\"$homeHref\" style=\"display:inline-flex;align-items:center;text-decoration:none\"><img src=\"$logoSrc\" alt=\"$sn\" style=\"max-height:60px;width:auto\"></a>"
                : "<a href=\"$homeHref\" style=\"font-weight:800;font-size:20px;letter-spacing:3px;text-decoration:none;color:inherit\">$sn</a>";

        case 'site-title':
            $homeHref = relHome($baseUrl, $depth);
            return "<a href=\"$homeHref\" style=\"font-size:18px;font-weight:700;text-decoration:none;color:inherit\">$sn</a>";

        case 'site-desc':
            return "<span style=\"font-size:13px;opacity:.75\">" . nl2br(htmlspecialchars($b['tx'] ?? '')) . "</span>";

        case 'site-promo':
            return "<div style=\"font-size:14px;line-height:1.6\">" . nl2br(htmlspecialchars($b['tx'] ?? '')) . "</div>";

        case 'header':
        case 'footer':
            return buildBrandBlockContent($b, $baseUrl, $siteName, $depth);

        default: // text, pullquote, sidebar (sin contenido dinámico)
            return nl2br(htmlspecialchars($b['tx'] ?? ''));
    }
}

/**
 * Construye el CSS de posición y estilo de un bloque en la rejilla.
 * Devuelve la regla CSS como string (e.g., "#b42{grid-column:1/span 8;...}").
 */
function buildBlockCSS(array $b, array $typeCSS): string {
    $bid  = $b['id'] ?? 0;
    $bc   = $b['c']  ?? 1;
    $br   = $b['r']  ?? 1;
    $bcs  = $b['cs'] ?? 1;
    $brs  = $b['rs'] ?? 1;
    $type = $b['t']  ?? 'text';
    $css  = $typeCSS[$type] ?? 'padding:16px;';
    return "#b$bid{grid-column:$bc/span $bcs;grid-row:$br/span $brs;$css}\n";
}

// ════════════════════════════════════════════════════════════════
//  CONTENIDO INTEGRADO DE BLOQUES CABECERA / PIE
// ════════════════════════════════════════════════════════════════

/**
 * Renderiza el contenido de un bloque header/footer con logo+título+desc+promo
 * integrados en un único bloque (nuevo formato v0.7+).
 * Mantiene retrocompatibilidad: si no tiene esas propiedades, usa tx como texto.
 */
function buildBrandBlockContent(
    array  $b,
    string $baseUrl,
    string $siteName,
    int    $depth
): string {
    // Nuevo formato (v0.7+)
    $hasNew = isset($b['showTitle']) || isset($b['logoUrl']) || isset($b['desc']) || isset($b['promo']);

    if (!$hasNew) {
        // Retrocompatibilidad: renderizar como texto plano
        return nl2br(htmlspecialchars($b['tx'] ?? ''));
    }

    $logoUrl    = $b['logoUrl']   ?? '';
    $showTitle  = ($b['showTitle'] ?? true) !== false;
    $desc       = $b['desc']      ?? '';
    $promo      = $b['promo']     ?? '';
    $sn         = htmlspecialchars($siteName);
    $homeHref   = relHome($baseUrl, $depth);

    $parts = [];

    // Logo
    if ($logoUrl) {
        $logoSrc = htmlspecialchars(relMedia($baseUrl, $logoUrl, $depth));
        $parts[] = "<a href=\"$homeHref\" style=\"display:inline-flex;align-items:center;text-decoration:none\"><img src=\"$logoSrc\" alt=\"$sn\" style=\"max-height:56px;width:auto\"></a>";
    }

    // Título y descripción agrupados verticalmente
    $textBlock = '';
    if ($showTitle) {
        $textBlock .= "<a href=\"$homeHref\" style=\"font-weight:800;font-size:18px;letter-spacing:.5px;text-decoration:none;color:inherit;display:block\">$sn</a>";
    }
    if ($desc !== '') {
        $textBlock .= "<span style=\"font-size:12px;opacity:.72;display:block;margin-top:2px\">" . htmlspecialchars($desc) . "</span>";
    }
    if ($textBlock !== '') {
        $parts[] = "<div>$textBlock</div>";
    }

    // Promo
    if ($promo !== '') {
        $parts[] = "<div style=\"font-size:13px;opacity:.85;padding:3px 10px;background:rgba(255,255,255,.1);border-radius:4px\">" . htmlspecialchars($promo) . "</div>";
    }

    if (empty($parts)) {
        // Fallback si todo está vacío
        return "<a href=\"$homeHref\" style=\"font-weight:800;font-size:18px;text-decoration:none;color:inherit\">$sn</a>";
    }

    return "<div style=\"display:flex;align-items:center;gap:14px;flex-wrap:wrap\">" . implode('', $parts) . "</div>";
}

// ════════════════════════════════════════════════════════════════
//  NAVEGACIÓN GLOBAL Y SECCIONES DEL SITIO
// ════════════════════════════════════════════════════════════════

function buildSiteNavHtml(
    array  $navItems,
    string $fallbackTx,
    string $baseUrl,
    string $aStyle,
    int    $depth = 0
): string {
    $html = '';
    if (!empty($navItems)) {
        foreach ($navItems as $ni) {
            $lbl  = htmlspecialchars($ni['label'] ?? '');
            $href = buildNavHref($ni, $baseUrl, $depth);
            $html .= "<a href=\"$href\" style=\"$aStyle\">$lbl</a> ";
        }
    } else {
        foreach (array_filter(array_map('trim', explode('·', $fallbackTx))) as $l) {
            $l     = htmlspecialchars($l);
            $html .= "<a href=\"#\" style=\"$aStyle\">$l</a> ";
        }
    }
    return "<div class=\"nd-nav\">$html</div>";
}

/**
 * Construye el href de un ítem de navegación.
 * FIX: ahora maneja tipo 'post' correctamente (igual que 'page').
 */
function buildNavHref(array $item, string $baseUrl, int $depth = 0): string {
    $type   = $item['type']   ?? 'url';
    $target = $item['target'] ?? '#';
    $base   = rtrim($baseUrl, '/');
    return match($type) {
        'tag'  => relLink($base, 'tag/' . makeSlug($target) . '/', $depth),
        'page' => relLink($base, "$target/", $depth),
        'post' => relLink($base, "$target/", $depth),   // FIX: antes caía en default
        default => $target,  // URL externa: devolver tal cual
    };
}

/**
 * Construye el HTML de la sección global de cabecera o pie de un bloque.
 * Usado en buildSiteSection().
 */
function buildSectionBlockInner(
    array  $b,
    array  $navItems,
    array  $adZones,
    string $baseUrl,
    string $siteName,
    int    $depth
): string {
    $btype = $b['t'] ?? 'text';
    switch ($btype) {
        // ── Bloques de identidad integrados (v0.7+) ───────────
        case 'header':
        case 'footer':
            return buildBrandBlockContent($b, $baseUrl, $siteName, $depth);

        case 'nav':
            return buildSiteNavHtml($navItems, $b['tx'] ?? '', $baseUrl, 'color:inherit;text-decoration:none', $depth);

        case 'image':
            $imgRaw = $b['mediaUrl'] ?? '';
            $imgSrc = htmlspecialchars(relMedia($baseUrl, $imgRaw, $depth));
            return $imgRaw
                ? "<img src=\"$imgSrc\" alt=\"\" style=\"width:100%;max-height:280px;object-fit:cover;display:block\">"
                : '';

        case 'separator':
            return '';

        case 'ad':
            return resolveAdZone($b['tx'] ?? '', $adZones, $baseUrl, $depth);

        // ── Bloques legados de identidad (retrocompatibilidad) ─
        case 'site-logo':
            $logoUrl  = $b['mediaUrl'] ?? '';
            $sn       = htmlspecialchars($siteName);
            $homeHref = relHome($baseUrl, $depth);
            $logoSrc  = htmlspecialchars(relMedia($baseUrl, $logoUrl, $depth));
            return $logoUrl
                ? "<a href=\"$homeHref\" style=\"display:inline-flex;align-items:center;text-decoration:none\"><img src=\"$logoSrc\" alt=\"$sn\" style=\"max-height:60px;width:auto\"></a>"
                : "<a href=\"$homeHref\" style=\"font-weight:800;font-size:20px;letter-spacing:3px;text-decoration:none;color:inherit\">$sn</a>";
        case 'site-title':
            $homeHref = relHome($baseUrl, $depth);
            return "<a href=\"$homeHref\" style=\"font-size:18px;font-weight:700;text-decoration:none;color:inherit\">" . htmlspecialchars($siteName) . "</a>";
        case 'site-desc':
            return "<span style=\"font-size:13px;opacity:.75\">" . nl2br(htmlspecialchars($b['tx'] ?? '')) . "</span>";
        case 'site-promo':
            return "<div style=\"font-size:14px;line-height:1.6\">" . nl2br(htmlspecialchars($b['tx'] ?? '')) . "</div>";

        default:
            return nl2br(htmlspecialchars($b['tx'] ?? ''));
    }
}

/** Renderiza los bloques del header/footer global del sitio. */
function buildSiteSection(
    array  $blocks,
    array  $navItems,
    array  $adZones,
    string $baseUrl,
    array  $typeCSS,
    string $siteName,
    int    $depth = 0
): string {
    if (empty($blocks)) return '';
    $html = '';
    foreach ($blocks as $b) {
        $btype = $b['t'] ?? 'text';
        $css   = $typeCSS[$btype] ?? 'padding:16px;';
        $inner = buildSectionBlockInner($b, $navItems, $adZones, $baseUrl, $siteName, $depth);
        $html .= "<div style=\"{$css}width:100%\">$inner</div>\n";
    }
    return $html;
}

/** Resuelve el contenido de una zona publicitaria. */
function resolveAdZone(string $zoneId, array $adZones, string $baseUrl, int $depth = 0): string {
    $fallback = '<div style="text-align:center;color:#d97706;font-weight:600;padding:8px">ESPACIO PUBLICITARIO</div>';
    if (!$zoneId) return $fallback;
    foreach ($adZones as $z) {
        if (($z['label'] ?? '') === $zoneId) {
            if ($z['type'] === 'code') return $z['content'] ?? $fallback;
            if ($z['type'] === 'image') {
                $imgRaw = $z['imageUrl'] ?? '';
                $link   = htmlspecialchars($z['linkUrl'] ?? '#');
                $alt    = htmlspecialchars($z['alt']     ?? 'Anuncio');
                if (!$imgRaw) return $fallback;
                $imgSrc = htmlspecialchars(relMedia($baseUrl, $imgRaw, $depth));
                return "<a href=\"$link\" target=\"_blank\" rel=\"noopener sponsored\"><img src=\"$imgSrc\" alt=\"$alt\" style=\"width:100%;height:100%;object-fit:cover\"></a>";
            }
        }
    }
    return $fallback;
}

// ════════════════════════════════════════════════════════════════
//  POST INDIVIDUAL
// ════════════════════════════════════════════════════════════════

/**
 * FIX PRINCIPAL: si el post no tiene layout o no tiene bloque de tipo 'content',
 * se renderiza el contenido del editor como artículo de texto plano.
 */
function buildPostPage(
    array  $meta,
    array  $layout,
    string $content,
    string $siteName,
    string $baseUrl,
    array  $siteCfg = [],
    string $themeVars = ''
): string {
    $blocks   = $layout['blocks'] ?? [];
    $cols     = (int)($layout['cols'] ?? 12);
    $title    = htmlspecialchars($meta['title'] ?? 'Sin título');
    $date     = htmlspecialchars($meta['date']  ?? '');
    $tags     = $meta['tags'] ?? '';
    $lang     = htmlspecialchars($siteCfg['_primaryLang'] ?? 'es');
    $navItems = $siteCfg['nav']          ?? [];
    $adZones  = $siteCfg['adZones']      ?? [];
    $hBlocks  = $siteCfg['headerBlocks'] ?? [];
    $fBlocks  = $siteCfg['footerBlocks'] ?? [];
    $typeCSS  = getTypeCSS();
    $sn       = htmlspecialchars($siteName);

    // ── ¿Tiene bloque de tipo 'content' en el layout? ─────────
    $hasContentBlock = !empty(array_filter($blocks, fn($b) => ($b['t'] ?? '') === 'content'));
    $useGrid = !empty($blocks);

    // Construir cabecera y pie globales
    $globalHeader = buildSiteSection($hBlocks, $navItems, $adZones, $baseUrl, $typeCSS, $siteName, 1);
    $globalFooter = buildSiteSection($fBlocks, $navItems, $adZones, $baseUrl, $typeCSS, $siteName, 1);

    // ── Etiquetas ─────────────────────────────────────────────
    $tagLinks = '';
    if ($tags) {
        foreach (array_filter(array_map('trim', explode(',', $tags))) as $tag) {
            $ts       = makeSlug($tag);
            $tagHref  = relLink($baseUrl, "tag/$ts/", 1);
            $tagLinks .= "<a href=\"$tagHref\" style=\"display:inline-block;margin:2px 4px 2px 0;padding:2px 10px;"
                       . "background:var(--th-tag-bg);border-radius:12px;font-size:12px;color:var(--th-tag-fg);text-decoration:none\">"
                       . htmlspecialchars($tag) . "</a>";
        }
        $tagLinks = "<div style=\"padding:8px 32px;background:#f8fafc;border-top:1px solid #e2e8f0\">$tagLinks</div>";
    }

    // ── Sección de contenido ──────────────────────────────────
    $contentSection = '';

    if ($useGrid) {
        // Modo rejilla: el post tiene bloques de Maquetar
        $blockCSS  = '';
        $blockHTML = '';
        foreach ($blocks as $b) {
            $bid   = $b['id'] ?? 0;
            $inner = buildBlockInner($b, $content, $baseUrl, $navItems, $adZones, $siteName, 1);
            $blockCSS  .= buildBlockCSS($b, $typeCSS);
            $blockHTML .= "  <div id=\"b$bid\">$inner</div>\n";
        }

        // Si hay rejilla pero ningún bloque 'content', añadir el contenido debajo
        $extraContent = (!$hasContentBlock && $content !== '')
            ? '<div class="nd-post-body">' . rewriteContentMediaUrls($content, $baseUrl, 1) . '</div>'
            : '';

        $contentSection = <<<GRID
<style>
#nd-page{
  display:grid;
  grid-template-columns:repeat({$cols},1fr);
  grid-auto-rows:minmax(48px,auto);
  width:100%;
}
{$blockCSS}
@media(max-width:900px){#nd-page{grid-template-columns:repeat(6,1fr)}}
@media(max-width:600px){#nd-page{display:flex;flex-direction:column}#nd-page>*{height:auto!important;min-height:48px}}
</style>
<div id="nd-page">
{$blockHTML}</div>
{$extraContent}
GRID;
    } else {
        // Sin rejilla: renderizar como artículo clásico
        $bodyHtml = rewriteContentMediaUrls($content, $baseUrl, 1);
        $contentSection = "<div class=\"nd-post-body\">"
                        . ($bodyHtml ?: '<p style="color:#94a3b8;text-align:center;padding:40px">Sin contenido</p>')
                        . "</div>";
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{$title}">
<meta property="og:title" content="{$title}">
<meta property="og:type" content="article">
<title>{$title} — {$sn}</title>
<style>
:root{{$themeVars}}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-body-font);background:var(--th-body-bg);color:var(--th-text)}
.nd-wrap{max-width:1200px;margin:0 auto;background:var(--th-wrap-bg);box-shadow:var(--th-wrap-shadow)}
/* Artículo (modo fallback y modo mixto sin content-block) */
.nd-post-body{max-width:860px;margin:0 auto;padding:40px 28px;line-height:1.85;font-size:16px;color:var(--th-text)}
.nd-post-body h1,.nd-post-body h2,.nd-post-body h3{line-height:1.3;margin:1.1em 0 .4em;color:var(--th-heading)}
.nd-post-body p{margin-bottom:.9em}
.nd-post-body blockquote{border-left:3px solid var(--th-accent);margin:1em 0;padding:.5em 1em;background:var(--th-sidebar-bg);color:var(--th-muted)}
.nd-post-body ul,.nd-post-body ol{margin:.5em 0 .5em 1.4em}
.nd-post-body li{margin-bottom:.2em}
.nd-post-body a{color:var(--th-accent)}
.nd-post-body img{max-width:100%;border-radius:4px}
/* Navegación */
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}
.nd-nav a:hover{opacity:.75}
/* Tipografía global (para bloques de rejilla) */
h1{font-size:2em;line-height:1.2;margin-bottom:.5em;color:var(--th-heading)}
h2{font-size:1.4em;margin-bottom:.4em;color:var(--th-heading)}
h3{font-size:1.1em;margin-bottom:.3em;color:var(--th-heading)}
p{margin-bottom:.9em}
blockquote{border-left:3px solid var(--th-accent);margin:1em 0;padding:.5em 1em;background:var(--th-sidebar-bg);color:var(--th-muted);border-radius:0 4px 4px 0}
ul,ol{margin:.5em 0 .5em 1.4em}li{margin-bottom:.2em}
a{color:var(--th-accent)}
img{max-width:100%;border-radius:4px}
</style>
</head>
<body>
<div class="nd-wrap">
{$globalHeader}
{$contentSection}
{$tagLinks}
{$globalFooter}
</div>
<!-- Newsday v0.6 · {$date} -->
</body>
</html>
HTML;
}

// ════════════════════════════════════════════════════════════════
//  ÍNDICE DE PUBLICACIONES
// ════════════════════════════════════════════════════════════════

function buildIndexPage(
    array  $posts,
    string $siteName,
    string $baseUrl,
    array  $siteCfg = [],
    string $themeVars = ''
): string {
    $siteNameH    = htmlspecialchars($siteName);
    $lang         = htmlspecialchars($siteCfg['_primaryLang'] ?? 'es');
    $navItems     = $siteCfg['nav']          ?? [];
    $hBlocks      = $siteCfg['headerBlocks'] ?? [];
    $fBlocks      = $siteCfg['footerBlocks'] ?? [];
    $typeCSS      = getTypeCSS();
    $count        = count($posts);
    $globalHeader = buildSiteSection($hBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName);
    $globalFooter = buildSiteSection($fBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName);

    $fallbackHeader = '';
    $standaloneNav  = '';
    if (empty($hBlocks)) {
        $fallbackHeader = '<div class="nd-fallback-header"><h1>' . $siteNameH . '</h1><p>'
                        . $count . ' publicaciones · <a href="feed.xml">RSS</a></p></div>';
        $standaloneNav  = '<nav style="background:var(--th-nav-bg);padding:10px 28px"><div class="nd-nav">'
                        . buildSiteNavHtml($navItems, '', $baseUrl, 'color:var(--th-nav-fg);text-decoration:none')
                        . '</div></nav>';
    }

    $items = '';
    foreach ($posts as $p) {
        $t      = htmlspecialchars($p['title'] ?? 'Sin título');
        $d      = htmlspecialchars($p['date']  ?? '');
        $s      = htmlspecialchars($p['slug']  ?? '');
        $access = $p['access'] ?? 'public';
        $tgs    = array_filter(array_map('trim', explode(',', $p['tags'] ?? '')));
        $tgH    = implode('', array_map(fn($tg) =>
            '<a href="' . relLink($baseUrl, 'tag/' . makeSlug($tg) . '/', 0) . '" '
            . 'style="display:inline-block;margin:2px 3px 2px 0;padding:1px 8px;background:var(--th-tag-bg);'
            . 'border-radius:10px;font-size:11px;color:var(--th-tag-fg);text-decoration:none">'
            . htmlspecialchars($tg) . '</a>',
        $tgs));
        $postHref  = relLink($baseUrl, "$s/", 0);
        // Badge de acceso restringido
        $accessBadge = match($access) {
            'premium'    => ' <span style="font-size:10px;background:#fef9c3;color:#92400e;border-radius:8px;padding:1px 6px;vertical-align:middle;font-weight:600">★ Premium</span>',
            'subscriber' => ' <span style="font-size:10px;background:#ede9fe;color:#6d28d9;border-radius:8px;padding:1px 6px;vertical-align:middle;font-weight:600">◆ Suscriptor</span>',
            'members'    => ' <span style="font-size:10px;background:#e0f2fe;color:#0369a1;border-radius:8px;padding:1px 6px;vertical-align:middle;font-weight:600">👤 Miembros</span>',
            default      => '',
        };
        $items .= "  <article>\n    <time>$d</time>\n    <h2><a href=\"$postHref\">$t</a>$accessBadge</h2>\n    <div class=\"tags\">$tgH</div>\n  </article>\n";
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$siteNameH}</title>
<link rel="alternate" type="application/rss+xml" href="feed.xml" title="{$siteNameH}">
<style>
:root{{$themeVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-ui-font);background:var(--th-body-bg);color:var(--th-text)}
.nd-wrap{max-width:1200px;margin:0 auto;background:var(--th-wrap-bg);box-shadow:var(--th-wrap-shadow)}
.nd-fallback-header{background:var(--th-header-bg);color:var(--th-header-fg);padding:32px 28px;text-align:center}
.nd-fallback-header h1{font-size:2.2em;margin-bottom:6px}
.nd-fallback-header p{color:var(--th-fallback-accent);font-size:14px}
.nd-fallback-header a{color:var(--th-fallback-accent)}
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}
.nd-nav a:hover{opacity:.75}
main{max-width:860px;margin:0 auto;padding:28px 16px}
article{background:var(--th-card-bg);border-radius:8px;padding:22px 26px;margin-bottom:14px;
  box-shadow:0 2px 8px rgba(0,0,0,.06);border:1px solid var(--th-card-border);transition:box-shadow .15s}
article:hover{box-shadow:0 4px 18px rgba(0,0,0,.12)}
article h2{font-size:1.25em;margin:5px 0 8px}
article h2 a{color:var(--th-heading);text-decoration:none}
article h2 a:hover{color:var(--th-accent)}
time{font-size:12px;color:var(--th-muted);display:block}
.tags{margin-top:6px}
.rss-link{text-align:center;padding:12px;font-size:12px;color:var(--th-muted)}
.rss-link a{color:var(--th-accent)}
@media(max-width:600px){
  .nd-nav{flex-direction:column;gap:6px;align-items:flex-start}
  main{padding:16px 10px}
}
</style>
</head>
<body>
<div class="nd-wrap">
{$globalHeader}
{$standaloneNav}
{$fallbackHeader}
<main>
{$items}
</main>
<div class="rss-link"><a href="feed.xml">📡 Feed RSS</a></div>
{$globalFooter}
</div>
</body>
</html>
HTML;
}

// ════════════════════════════════════════════════════════════════
//  PÁGINA DE ETIQUETA
// ════════════════════════════════════════════════════════════════

function buildTagPage(
    string $tag,
    array  $posts,
    string $siteName,
    string $baseUrl,
    array  $siteCfg = [],
    string $themeVars = ''
): string {
    $tagH         = htmlspecialchars($tag);
    $siteNameH    = htmlspecialchars($siteName);
    $lang         = htmlspecialchars($siteCfg['_primaryLang'] ?? 'es');
    $navItems     = $siteCfg['nav']          ?? [];
    $hBlocks      = $siteCfg['headerBlocks'] ?? [];
    $fBlocks      = $siteCfg['footerBlocks'] ?? [];
    $typeCSS      = getTypeCSS();
    $globalHeader = buildSiteSection($hBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName, 2);
    $globalFooter = buildSiteSection($fBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName, 2);
    $postCount    = count($posts);
    $homeHref     = relHome($baseUrl, 2);

    $items = '';
    foreach ($posts as $p) {
        $t      = htmlspecialchars($p['title'] ?? '');
        $d      = htmlspecialchars($p['date']  ?? '');
        $s      = htmlspecialchars($p['slug']  ?? '');
        $access = $p['access'] ?? 'public';
        $pHref  = relLink($baseUrl, "$s/", 2);
        $badge  = match($access) {
            'premium'    => ' <span style="font-size:10px;background:#fef9c3;color:#92400e;border-radius:8px;padding:1px 6px;font-weight:600">★</span>',
            'subscriber' => ' <span style="font-size:10px;background:#ede9fe;color:#6d28d9;border-radius:8px;padding:1px 6px;font-weight:600">◆</span>',
            'members'    => ' <span style="font-size:10px;background:#e0f2fe;color:#0369a1;border-radius:8px;padding:1px 6px;font-weight:600">👤</span>',
            default      => '',
        };
        $items .= "<article><time>$d</time><h2><a href=\"$pHref\">$t</a>$badge</h2></article>\n";
    }

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$tagH} — {$siteNameH}</title>
<style>
:root{{$themeVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-ui-font);background:var(--th-body-bg);color:var(--th-text)}
.nd-wrap{max-width:1200px;margin:0 auto;background:var(--th-wrap-bg);box-shadow:var(--th-wrap-shadow)}
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}.nd-nav a:hover{opacity:.75}
.tag-header{background:var(--th-sidebar-bg);border-bottom:1px solid var(--th-border);padding:20px 28px}
.tag-header h1{font-size:1.5em;color:var(--th-heading);margin-bottom:4px}
.tag-header p{font-size:13px;color:var(--th-muted)}
main{max-width:860px;margin:0 auto;padding:24px 16px}
article{background:var(--th-card-bg);border:1px solid var(--th-card-border);border-radius:8px;padding:18px 22px;margin-bottom:12px;transition:box-shadow .15s}
article:hover{box-shadow:0 4px 14px rgba(0,0,0,.1)}
article h2{font-size:1.15em;margin:4px 0}
article h2 a{color:var(--th-heading);text-decoration:none}article h2 a:hover{color:var(--th-accent)}
time{font-size:12px;color:var(--th-muted);display:block}
.back{display:inline-block;margin-bottom:16px;font-size:13px;color:var(--th-accent);text-decoration:none}
</style>
</head>
<body>
<div class="nd-wrap">
{$globalHeader}
<div class="tag-header">
  <a class="back" href="{$homeHref}">← Inicio</a>
  <h1>#{$tagH}</h1>
  <p>{$postCount} publicaciones</p>
</div>
<main>{$items}</main>
{$globalFooter}
</div>
</body>
</html>
HTML;
}

// ════════════════════════════════════════════════════════════════
//  PÁGINA ESTÁTICA
// ════════════════════════════════════════════════════════════════

function buildStaticPage(
    array  $meta,
    string $content,
    string $siteName,
    string $baseUrl,
    array  $siteCfg = [],
    string $themeVars = ''
): string {
    $title        = htmlspecialchars($meta['title'] ?? 'Página');
    $siteNameH    = htmlspecialchars($siteName);
    $lang         = htmlspecialchars($siteCfg['_primaryLang'] ?? 'es');
    $navItems     = $siteCfg['nav']          ?? [];
    $hBlocks      = $siteCfg['headerBlocks'] ?? [];
    $fBlocks      = $siteCfg['footerBlocks'] ?? [];
    $typeCSS      = getTypeCSS();
    $content      = rewriteContentMediaUrls($content, $baseUrl, 1);
    $globalHeader = buildSiteSection($hBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName, 1);
    $globalFooter = buildSiteSection($fBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName, 1);

    // CSS de plugins activos (si la función está disponible)
    $pluginCSS = function_exists('getActivePluginsCSS') ? getActivePluginsCSS() : '';
    $pluginStyleTag = $pluginCSS ? "\n<style>/* plugins */\n{$pluginCSS}\n</style>" : '';

    // Modo fullpage: sin wrapper .page-body ni h1 automático —
    // el content.html controla todo su propio layout.
    $layoutMode = $meta['layout'] ?? 'standard';
    if ($layoutMode === 'fullpage') {
        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$title}</title>
<style>
:root{{$themeVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-body-font,Inter,system-ui,sans-serif);background:var(--th-body-bg);color:var(--th-text)}
.nd-wrap{width:100%;background:var(--th-wrap-bg)}
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}.nd-nav a:hover{opacity:.75}
a{color:var(--th-accent)}
img{max-width:100%}
</style>{$pluginStyleTag}
</head>
<body>
<div class="nd-wrap">
{$globalHeader}
{$content}
{$globalFooter}
</div>
</body>
</html>
HTML;
    }

    // Modo estándar (por defecto)
    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$title} — {$siteNameH}</title>
<style>
:root{{$themeVars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-body-font);background:var(--th-body-bg);color:var(--th-text)}
.nd-wrap{max-width:1200px;margin:0 auto;background:var(--th-wrap-bg);box-shadow:var(--th-wrap-shadow)}
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}.nd-nav a:hover{opacity:.75}
.page-body{max-width:760px;margin:0 auto;padding:40px 24px;color:var(--th-text);line-height:1.85;font-size:16px}
.page-body h1,.page-body h2,.page-body h3{line-height:1.3;margin:1.2em 0 .5em;color:var(--th-heading)}
.page-body p{margin-bottom:.9em}
.page-body a{color:var(--th-accent)}
.page-body img{max-width:100%;border-radius:6px}
.page-body blockquote{border-left:3px solid var(--th-accent);padding:.5em 1em;background:var(--th-pullquote-bg);color:var(--th-pullquote-fg);margin:1em 0}
</style>{$pluginStyleTag}
</head>
<body>
<div class="nd-wrap">
{$globalHeader}
<div class="page-body">
  <h1 style="font-size:2em;margin-bottom:.6em;color:var(--th-heading)">{$title}</h1>
  {$content}
</div>
{$globalFooter}
</div>
</body>
</html>
HTML;
}

// ════════════════════════════════════════════════════════════════
//  PÁGINA DE MANTENIMIENTO
// ════════════════════════════════════════════════════════════════

function buildMaintenancePage(
    string $pageSlug,
    string $siteName,
    string $baseUrl,
    array  $siteCfg = [],
    string $themeVars = ''
): string {
    $sn       = htmlspecialchars($siteName);
    $lang     = htmlspecialchars($siteCfg['_primaryLang'] ?? 'es');
    $hBlocks  = $siteCfg['headerBlocks'] ?? [];
    $fBlocks  = $siteCfg['footerBlocks'] ?? [];
    $navItems = $siteCfg['nav']          ?? [];
    $typeCSS  = getTypeCSS();

    $globalHeader = buildSiteSection($hBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName, 0);
    $globalFooter = buildSiteSection($fBlocks, $navItems, [], $baseUrl, $typeCSS, $siteName, 0);

    $customContent = '';
    if ($pageSlug && is_dir(DIR_PAGES)) {
        foreach (scandir(DIR_PAGES) as $pid) {
            if ($pid[0] === '.') continue;
            $pmeta = readJSON(DIR_PAGES . "/$pid/meta.json");
            if ($pmeta && ($pmeta['slug'] ?? '') === $pageSlug) {
                $customContent = is_file(DIR_PAGES . "/$pid/content.html")
                    ? file_get_contents(DIR_PAGES . "/$pid/content.html") : '';
                break;
            }
        }
    }

    $body = $customContent
        ? "<div class=\"nd-maint-custom\">$customContent</div>"
        : <<<DEFBODY
<div class="nd-maint-icon">🔧</div>
<h1>Estamos en mantenimiento</h1>
<p>Estamos realizando mejoras en el sitio. Volveremos muy pronto.<br>Gracias por tu paciencia.</p>
<div class="nd-maint-badge">Volvemos pronto</div>
DEFBODY;

    return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mantenimiento — {$sn}</title>
<style>
:root{{$themeVars}}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--th-ui-font);background:var(--th-body-bg);color:var(--th-text);min-height:100vh;display:flex;flex-direction:column}
.nd-wrap{max-width:1200px;margin:0 auto;background:var(--th-wrap-bg);box-shadow:var(--th-wrap-shadow);flex:1;display:flex;flex-direction:column;width:100%}
.nd-maint-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 24px;text-align:center}
.nd-maint-icon{font-size:64px;margin-bottom:24px;animation:spin 6s linear infinite}
@keyframes spin{0%,100%{transform:rotate(0deg)}50%{transform:rotate(20deg)}}
h1{font-size:2.2em;font-weight:800;color:var(--th-heading);margin-bottom:16px;line-height:1.2}
p{font-size:1.05em;color:var(--th-muted);line-height:1.7;max-width:480px;margin-bottom:24px}
.nd-maint-badge{display:inline-block;padding:6px 18px;background:var(--th-accent);color:#fff;border-radius:20px;font-size:13px;font-weight:600;letter-spacing:.5px}
.nd-maint-custom{max-width:720px;margin:0 auto;line-height:1.8;color:var(--th-text);font-size:16px;text-align:left;width:100%}
.nd-maint-custom h1,.nd-maint-custom h2{margin:.8em 0 .4em;color:var(--th-heading)}
.nd-maint-custom p{margin-bottom:.9em}
.nd-nav{display:flex;gap:16px;flex-wrap:wrap;align-items:center}
.nd-nav a{color:inherit;text-decoration:none;font-size:13px;font-weight:500}.nd-nav a:hover{opacity:.75}
</style>
</head>
<body>
<div class="nd-wrap">
{$globalHeader}
<div class="nd-maint-body">
{$body}
</div>
{$globalFooter}
</div>
</body>
</html>
HTML;
}

// ════════════════════════════════════════════════════════════════
//  FEED RSS
// ════════════════════════════════════════════════════════════════

function buildRSSFeed(array $posts, string $siteName, string $baseUrl): string {
    $siteNameE = htmlspecialchars($siteName);
    $baseUrl   = rtrim($baseUrl, '/');
    $items     = '';
    $now       = date(DATE_RSS);
    foreach ($posts as $p) {
        $title   = htmlspecialchars($p['title'] ?? 'Sin título');
        $slug    = $p['slug'] ?? '';
        $link    = "$baseUrl/$slug/";
        $pubDate = isset($p['date']) ? date(DATE_RSS, strtotime($p['date'])) : $now;
        $items  .= "    <item>\n"
                 . "      <title>$title</title>\n"
                 . "      <link>$link</link>\n"
                 . "      <pubDate>$pubDate</pubDate>\n"
                 . "      <guid>$link</guid>\n"
                 . "    </item>\n";
    }
    return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>{$siteNameE}</title>
  <link>{$baseUrl}/</link>
  <description>Feed de {$siteNameE}</description>
  <language>es</language>
  <lastBuildDate>{$now}</lastBuildDate>
  <atom:link href="{$baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
{$items}
</channel>
</rss>
XML;
}
