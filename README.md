# Newsday

> CMS editorial de **archivos planos** (sin base de datos) con maquetación sobre **rejilla libre de 12 columnas**.

Newsday combina la simplicidad de un CMS de ficheros planos (estilo Bludit) con un
maquetador visual editorial (estilo revista/boletín). El contenido se organiza sobre
una rejilla, el layout se guarda como datos (JSON) y el sitio puede exportarse a HTML
estático autocontenido.

## Características

- **Sin base de datos** — todo se almacena en JSON + Markdown.
- **Maquetador visual** de páginas y posts sobre rejilla de 12 columnas (drag & drop).
- **Sistema de plugins** de componentes (galería, slider, formularios, listados…).
- **Temas** intercambiables (`temas/*.php`).
- **Multi-usuario con roles**: admin · editor · escritor · maquetador · publicista.
- **Multi-idioma** (UI y contenido).
- **Generación de sitio estático** + previsualización.
- **Backups y actualizaciones** in-place vía ZIP (con respaldo/rollback automático).

## Requisitos

| Requisito | Mínimo |
|-----------|--------|
| PHP | 8.0+ |
| Extensiones | `ZipArchive`, `fileinfo`, `GD`, sesiones |
| Servidor | Apache/Nginx con permisos de escritura en la raíz |

## Instalación

1. Sube los archivos a tu servidor.
2. Abre `https://tudominio.com/newsday-install.php` y crea el usuario admin.
3. Accede al panel en `https://tudominio.com/Newsday.html`.

Guía completa en [INSTALL.md](INSTALL.md). Arquitectura en [docs/](docs/) ·
desarrollo de plugins en [docs/creating-plugins.md](docs/creating-plugins.md).

## Seguridad

- Autenticación con `password_hash`/`password_verify` y sesiones `httponly`/`secure`.
- Autorización por roles centralizada: las acciones que escriben código o tocan la
  configuración (actualizaciones, plugins, temas, config, backups) exigen rol **admin**.
- CORS restringido a orígenes de confianza (sin reflejar `*` con credenciales).
- Saneado de SVG subidos contra XSS almacenado.

## Stack

HTML5 + CSS3 + JavaScript ES6 vanilla (sin frameworks) · Backend PHP modular ·
Almacenamiento en ficheros planos · Renderizado con CSS Grid nativo.

---

*Sin frameworks. Sin base de datos. Sin servidor dinámico para el sitio publicado.*
