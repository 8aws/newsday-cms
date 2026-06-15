<?php
/**
 * Tema: Newsday (por defecto)
 * Cabecera azul noche, fondo gris claro, tipografía editorial con Georgia.
 */
return [
    'id'          => 'newsday',
    'name'        => 'Newsday',
    'description' => 'El tema original — cabecera azul medianoche, fondo gris perla y tipografía editorial.',
    'preview'     => ['header' => '#12122a', 'accent' => '#5068e8', 'body' => '#e8ebf0'],
    'vars'        =>
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
];
