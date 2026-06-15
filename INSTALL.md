# Newsday v0.5 — Guía de instalación / Installation Guide

---

## 🇪🇸 Español

### Requisitos del servidor

| Requisito | Versión mínima |
|-----------|---------------|
| PHP | 8.0 o superior |
| Extensión ZipArchive | activada |
| Extensión fileinfo | activada |
| GD (getimagesize) | activada |
| Sessions PHP | activadas |
| Permisos de escritura | en el directorio raíz |

La mayoría de hostings compartidos (cPanel, Plesk, Hestia) cumplen estos requisitos por defecto.

---

### Instalación en 3 pasos

**1. Subir los archivos al servidor**

Sube el contenido de esta carpeta (`v2/`) a tu servidor mediante FTP, SFTP o el gestor de archivos de tu panel de control. El destino puede ser:

- La raíz del dominio: `public_html/` → acceso en `https://tudominio.com/Newsday.html`
- Un subdirectorio: `public_html/newsday/` → `https://tudominio.com/newsday/Newsday.html`

> No es necesario instalar nada en el servidor ni configurar bases de datos.

**2. Ejecutar el instalador**

Abre en el navegador la URL del instalador:

```
https://tudominio.com/newsday-install.php
```

Rellena el formulario:

- **Nombre del sitio** — el nombre de tu publicación (ej: «El Rincón del Café»)
- **URL base** *(opcional)* — tu dominio completo sin barra final: `https://tudominio.com`  
  Déjalo vacío para usar rutas relativas (funciona localmente o sin dominio fijo)
- **Idioma del contenido** — establece el atributo `lang=` del HTML generado
- **Usuario y contraseña** — credenciales de acceso al panel de administración

Haz clic en **Instalar Newsday**. El instalador:
- Crea toda la estructura de carpetas
- Genera los 4 temas visuales iniciales
- Configura los archivos de idioma
- Te deja logueado automáticamente en el panel

**3. Empezar a publicar**

Tras la instalación serás redirigido directamente al panel de administración (`Newsday.html`). El instalador se archiva como `.trash` automáticamente.

---

### Estructura de carpetas creada

```
v2/
├── Newsday.html              ← Panel de administración
├── newsday-api.php           ← API backend (no borrar)
├── newsday-config.php        ← Configuración generada (no borrar)
├── admin/                    ← JS, CSS del panel
├── content/
│   ├── posts/                ← Tus artículos
│   ├── pages/                ← Páginas estáticas
│   └── site-config.json      ← Nav, temas, idioma, etc.
├── media/                    ← Imágenes, vídeos, audios, docs
├── public/                   ← Sitio estático generado (publicado)
├── preview/                  ← Vista previa temporal (se regenera)
├── backups/                  ← Copias de seguridad en servidor
├── temas/                    ← Temas visuales PHP (ampliable)
└── languages/
    ├── interface/             ← Traducciones del panel (en.json, …)
    └── content/               ← Idiomas del sitio (es.json, en.json, …)
```

---

### Uso básico

| Pestaña | Para qué sirve |
|---------|----------------|
| **Escribir** | Redactar y editar artículos con editor WYSIWYG |
| **Maquetar** | Diseño en cuadrícula con bloques de contenido |
| **Organizar** | Menú de navegación y zonas de anuncios |
| **Modelar** | Cabecera/pie global y selector de temas |
| **Medios** | Gestión de archivos multimedia |
| **Publicar** | Vista previa, generar sitio estático y backups |
| **Ajustes** | Configuración del sitio, idiomas y cuenta |

**Flujo de trabajo recomendado:**

1. En **Ajustes** configura el nombre del sitio y la URL base
2. En **Modelar → Temas** elige el aspecto visual
3. En **Modelar → Cabecera/Pie** añade tu logo y menú
4. En **Organizar** define los enlaces de navegación
5. En **Escribir** crea tus artículos (guarda → cambia estado a «Publicado»)
6. En **Publicar → Vista previa** comprueba el resultado antes de publicar
7. En **Publicar → Generar sitio** publica en `public/`

---

### Añadir idiomas

**Idioma de la interfaz** (panel de administración):  
Crea `languages/interface/fr.json` (o cualquier código ISO 639-1) con las traducciones. El archivo `en.json` incluido sirve de referencia para las claves disponibles.

**Idioma del contenido** (páginas generadas):  
Crea `languages/content/fr.json` con `{"_name":"Français","_native":"Français","_code":"fr"}`. Aparecerá automáticamente en Ajustes → Idioma del contenido.

---

### Añadir temas

Crea un archivo PHP en `temas/mitema.php` que devuelva un array con las claves `id`, `name`, `description`, `preview` y `vars`. Toma como referencia cualquiera de los cuatro temas incluidos.

---

### Seguridad

- Las carpetas `content/` y `backups/` quedan protegidas con `.htaccess` (Apache).  
  En **nginx** añade manualmente: `location ~ ^/(content|backups)/ { deny all; }`
- El instalador (`newsday-install.php`) se archiva automáticamente como `.trash` tras instalar. Puedes eliminarlo del servidor.
- No expongas `newsday-api.php` sin autenticación; el sistema requiere sesión activa para todas las operaciones.

---

### Solución de problemas frecuentes

| Problema | Solución |
|----------|----------|
| Pantalla en blanco tras instalar | Comprueba permisos: `chmod 755` en el directorio y `chmod 644` en los archivos |
| Error 500 en la API | Activa el log de errores PHP (`display_errors=On` temporalmente) |
| El sitio generado no se ve | Verifica que la URL base en Ajustes es correcta; prueba dejándola vacía |
| El iframe de preview no carga | Asegúrate de que `preview/` tiene permisos de escritura |
| No puedo subir archivos | Aumenta `upload_max_filesize` y `post_max_size` en `php.ini` |

---

---

## 🇬🇧 English

### Server Requirements

| Requirement | Minimum version |
|-------------|----------------|
| PHP | 8.0 or higher |
| ZipArchive extension | enabled |
| fileinfo extension | enabled |
| GD (getimagesize) | enabled |
| PHP Sessions | enabled |
| Write permission | on the root directory |

Most shared hosting providers (cPanel, Plesk, Hestia) meet these requirements by default.

---

### Installation in 3 steps

**1. Upload files to the server**

Upload the contents of this folder (`v2/`) to your server via FTP, SFTP, or your control panel's file manager. The destination can be:

- Domain root: `public_html/` → access at `https://yourdomain.com/Newsday.html`
- A subdirectory: `public_html/newsday/` → `https://yourdomain.com/newsday/Newsday.html`

> No server-side installation or database configuration is required.

**2. Run the installer**

Open the installer URL in your browser:

```
https://yourdomain.com/newsday-install.php
```

Fill in the form:

- **Site name** — the name of your publication (e.g. "The Coffee Corner")
- **Base URL** *(optional)* — your full domain without trailing slash: `https://yourdomain.com`  
  Leave blank to use relative paths (works locally or without a fixed domain)
- **Content language** — sets the `lang=` attribute of the generated HTML
- **Username and password** — admin panel login credentials

Click **Install Newsday**. The installer will:
- Create the entire folder structure
- Generate the 4 built-in visual themes
- Configure language files
- Log you in automatically to the panel

**3. Start publishing**

After installation you will be redirected to the admin panel (`Newsday.html`). The installer is automatically archived as `.trash`.

---

### Folder structure created

```
v2/
├── Newsday.html              ← Admin panel
├── newsday-api.php           ← Backend API (do not delete)
├── newsday-config.php        ← Generated config (do not delete)
├── admin/                    ← Panel JS and CSS
├── content/
│   ├── posts/                ← Your articles
│   ├── pages/                ← Static pages
│   └── site-config.json      ← Nav, themes, language, etc.
├── media/                    ← Images, videos, audio, docs
├── public/                   ← Generated static site (published)
├── preview/                  ← Temporary preview (regenerated on demand)
├── backups/                  ← Server-side backups
├── temas/                    ← Visual themes as PHP files (extensible)
└── languages/
    ├── interface/             ← Panel translations (en.json, …)
    └── content/               ← Site content languages (es.json, en.json, …)
```

---

### Basic usage

| Tab | Purpose |
|-----|---------|
| **Write** | Compose and edit articles with a WYSIWYG editor |
| **Layout** | Grid-based design with content blocks |
| **Organize** | Navigation menu and ad zones |
| **Design** | Global header/footer and theme selector |
| **Media** | File manager for multimedia assets |
| **Publish** | Preview, generate static site, and manage backups |
| **Settings** | Site config, languages, and admin account |

**Recommended workflow:**

1. In **Settings** set the site name and base URL
2. In **Design → Themes** pick a visual style
3. In **Design → Header/Footer** add your logo and menu
4. In **Organize** define navigation links
5. In **Write** create articles (save → set status to «Published»)
6. In **Publish → Preview** check the result before publishing
7. In **Publish → Generate site** publish to `public/`

---

### Adding languages

**Interface language** (admin panel):  
Create `languages/interface/fr.json` (or any ISO 639-1 code) with your translations. The included `en.json` file serves as a reference for available keys.

**Content language** (generated pages):  
Create `languages/content/fr.json` with `{"_name":"Français","_native":"Français","_code":"fr"}`. It will automatically appear in Settings → Content language.

---

### Adding themes

Create a PHP file at `temas/mytheme.php` that returns an array with the keys `id`, `name`, `description`, `preview`, and `vars`. Use any of the four included themes as a reference.

---

### Security

- The `content/` and `backups/` folders are protected with `.htaccess` (Apache).  
  On **nginx**, add manually: `location ~ ^/(content|backups)/ { deny all; }`
- The installer (`newsday-install.php`) is automatically archived as `.trash` after installation. You may delete it from the server.
- Do not expose `newsday-api.php` without authentication; the system requires an active session for all operations.

---

### Common troubleshooting

| Issue | Solution |
|-------|----------|
| Blank screen after install | Check permissions: `chmod 755` on the directory, `chmod 644` on files |
| 500 error in the API | Enable PHP error log (`display_errors=On` temporarily) |
| Generated site not visible | Verify the base URL in Settings is correct; try leaving it blank |
| Preview iframe not loading | Make sure `preview/` has write permissions |
| Cannot upload files | Increase `upload_max_filesize` and `post_max_size` in `php.ini` |
