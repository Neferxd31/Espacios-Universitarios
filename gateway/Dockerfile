FROM nginx:1.27-alpine

# envsubst viene en gettext
RUN apk add --no-cache gettext

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Proxy params (estáticos)
COPY proxy_params /etc/nginx/proxy_params

# Template + entrypoint (procesados en runtime)
COPY nginx.conf.template /etc/nginx/conf.d/gateway.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.d/99-render-nginx.sh
RUN chmod +x /docker-entrypoint.d/99-render-nginx.sh

# Railway inyecta $PORT; local docker-compose usa 80
ENV PORT=80
EXPOSE 80

# Override del CMD por defecto de nginx para usar nuestro entrypoint
CMD ["/docker-entrypoint.d/99-render-nginx.sh"]
