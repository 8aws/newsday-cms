# ─── Newsday — Dockerfile ────────────────────────────────────────────────────
# Imagen base: PHP 8.3 + Apache. No requiere base de datos.
# ─────────────────────────────────────────────────────────────────────────────

FROM php:8.3-apache

# Dependencias del sistema para las extensiones PHP
RUN apt-get update && apt-get install -y --no-install-recommends \
        libzip-dev libpng-dev libjpeg-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Extensiones PHP necesarias para Newsday (zip para backups/updates, gd para imágenes)
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install zip gd

# Activar mod_rewrite (necesario para el .htaccess de Newsday)
RUN a2enmod rewrite

# Permitir .htaccess en el directorio raíz
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copiar el código de la aplicación (imagen autocontenida).
# .dockerignore excluye datos de instalación, secretos y material de cliente.
# En desarrollo, docker-compose monta el código encima para edición en vivo.
COPY . /var/www/html/

# Crear los directorios de datos y dar permisos de escritura a PHP
RUN mkdir -p /var/www/html/content \
             /var/www/html/media \
             /var/www/html/backups \
             /var/www/html/public \
             /var/www/html/preview \
  && chown -R www-data:www-data /var/www/html

EXPOSE 80
