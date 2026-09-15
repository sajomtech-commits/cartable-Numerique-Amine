#!/bin/sh
set -e
# Récupère le site et le déploie
wget -qO- "$SITE_URL" | tar xzf - -C /usr/share/nginx/html
chmod -R a+rX /usr/share/nginx/html

# Conf nginx : redirections RELATIVES (donc https conservé derrière le proxy)
cat > /etc/nginx/conf.d/default.conf <<'NGINX'
server {
    listen 80;
    absolute_redirect off;
    port_in_redirect off;
    server_name_in_redirect off;
    root /usr/share/nginx/html;
    index index.html;

    # .mjs = module JavaScript. Absent de /etc/nginx/mime.types sur cette image :
    # sans ceci, le worker PDF.js est servi en octet-stream et le navigateur
    # refuse de l'importer ("Failed to fetch dynamically imported module").
    location ~* \.mjs$ {
        types { application/javascript mjs; }
        default_type application/javascript;
    }

    location / {
        try_files $uri $uri/index.html $uri/ =404;
    }
}
NGINX

exec nginx -g 'daemon off;'
