#!/usr/bin/env sh
# ============================================================================
# Entrypoint del gateway:
#   - Sustituye env vars en nginx.conf.template usando envsubst
#   - Lanza nginx en foreground
#
# Defaults pensados para docker-compose (hostnames internos del compose).
# En Railway se override con `<service>.railway.internal:8080`.
# ============================================================================

set -e

export PORT="${PORT:-80}"
export USERS_HOST="${USERS_HOST:-users:8000}"
export SPACES_HOST="${SPACES_HOST:-spaces:8000}"
export RESERVATIONS_HOST="${RESERVATIONS_HOST:-reservations:8000}"
export NOTIFICATIONS_HOST="${NOTIFICATIONS_HOST:-notifications:8000}"
export REPORTS_HOST="${REPORTS_HOST:-reports:8000}"

echo "[gateway] PORT=$PORT"
echo "[gateway] USERS_HOST=$USERS_HOST"
echo "[gateway] SPACES_HOST=$SPACES_HOST"
echo "[gateway] RESERVATIONS_HOST=$RESERVATIONS_HOST"
echo "[gateway] NOTIFICATIONS_HOST=$NOTIFICATIONS_HOST"
echo "[gateway] REPORTS_HOST=$REPORTS_HOST"

envsubst '${PORT} ${USERS_HOST} ${SPACES_HOST} ${RESERVATIONS_HOST} ${NOTIFICATIONS_HOST} ${REPORTS_HOST}' \
  < /etc/nginx/conf.d/gateway.conf.template \
  > /etc/nginx/conf.d/gateway.conf

exec nginx -g 'daemon off;'
