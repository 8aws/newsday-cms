<?php
/**
 * Tema: Oscuro OLED
 * Negro puro (#000) como fondo de pantalla y envolvente: maximiza el ahorro
 * de energía en pantallas OLED/AMOLED y reduce la fatiga visual nocturna.
 * Acento lavanda suave para contraste accesible sobre negro.
 */
return [
    'id'          => 'oscuro',
    'name'        => 'Oscuro',
    'description' => 'Negro puro para pantallas OLED — máximo ahorro energético, acento lavanda, texto gris suave.',
    'preview'     => ['header' => '#000000', 'accent' => '#7c9ff5', 'body' => '#0d0d0d'],
    'vars'        =>
        '--th-header-bg:#000000;--th-header-fg:#c8d0f0;' .
        '--th-nav-bg:#0a0a0a;--th-nav-fg:#6b7280;' .
        '--th-footer-bg:#000000;--th-footer-fg:#4b5563;' .
        '--th-body-bg:#000000;--th-wrap-bg:#0d0d0d;' .
        '--th-wrap-shadow:none;' .
        '--th-text:#9ca3af;--th-heading:#e2e8f0;' .
        '--th-accent:#7c9ff5;--th-accent-hover:#a5b4fc;' .
        '--th-muted:#4b5563;--th-border:#1f2937;' .
        '--th-sidebar-bg:#111111;--th-sidebar-border:#1f2937;' .
        '--th-pullquote-bg:#111827;--th-pullquote-fg:#93c5fd;--th-pullquote-border:#3b82f6;' .
        '--th-card-bg:#111111;--th-card-border:#1f2937;' .
        '--th-tag-bg:#1f2937;--th-tag-fg:#6b7280;' .
        '--th-body-font:system-ui,sans-serif;--th-ui-font:system-ui,sans-serif;' .
        '--th-fallback-accent:#374151;',
];
