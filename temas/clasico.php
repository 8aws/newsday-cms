<?php
/**
 * Tema: Clásico
 * Estética de periódico impreso y revista de divulgación:
 * cabecera negra de tinta, fondo color papel envejecido, tipografía Georgia serif
 * y acento carmesí para titulares y enlaces.
 */
return [
    'id'          => 'clasico',
    'name'        => 'Clásico',
    'description' => 'Estilo periódico impreso — cabecera negra, papel envejecido, tipografía Georgia y acento carmesí.',
    'preview'     => ['header' => '#1a1a1a', 'accent' => '#8b0000', 'body' => '#f5f0e8'],
    'vars'        =>
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
];
