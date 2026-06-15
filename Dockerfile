# ─── Newsday — Dockerfile ────────────────────────────────────────────────────
# Imagen base: PHP 8.3 + Apache. No requiere base de datos.
# ─────────────────────────────────────────────────────────────────────────────

FROM php:8.3-apache

# Extensiones PHP necesarias para Newsday
RUN docker-php-ext-install zip

# Activar mod_rewrite (necesario para el .htaccess de Newsday)
RUN a2enmod rewrite

# Permitir .htaccess en el directorio raíz
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Permisos para que PHP pueda escribir en content/, media/, backups/, public/
RUN mkdir -p /var/www/html/content \
             /var/www/html/media \
             /var/www/html/backups \
             /var/www/html/public \
             /var/www/html/preview \
  && chown -R www-data:www-data /var/www/html

EXPOSE 80
