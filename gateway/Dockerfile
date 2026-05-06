FROM nginx:1.27-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom proxy params and server config
COPY proxy_params /etc/nginx/proxy_params
COPY nginx.conf   /etc/nginx/conf.d/gateway.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
