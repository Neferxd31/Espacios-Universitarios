# Despliegue en Railway

Guía paso a paso para subir los **5 microservicios + 3 workers + gateway + frontend** a Railway, conectados a las **5 Postgres** que ya tienes y a **RabbitMQ**.

## 0. Pre-requisitos

- Cuenta en [Railway](https://railway.app) con plan **Hobby** ($5/mes) o superior.
- Repositorio conectado: `Neferxd31/Espacios-Universitarios`, rama `despliegue`.
- Las **5 Postgres** ya creadas:
  - `users-db`, `spaces-db`, `reservations-db`, `notifications-db`, `reports-db`.

## 1. Añadir RabbitMQ al proyecto

En el proyecto Railway → **+ New** → **Database** → busca *RabbitMQ* en templates (o usa **CloudAMQP Little Lemur** gratis si quieres ahorrar).

Cuando esté listo, fíjate en estas variables que Railway expone:
- `RABBITMQ_URL` (formato `amqp://user:pass@host:port/`)
- `RABBITMQ_PRIVATE_URL` (red interna, más rápido y sin egress)

Usa **`RABBITMQ_PRIVATE_URL`** en los demás servicios.

## 2. Desplegar los 5 microservicios Django

Para **cada uno** (`users`, `spaces`, `reservations`, `notifications`, `reports`):

1. **+ New** → **GitHub Repo** → seleccionar `Espacios-Universitarios`.
2. **Settings** → **Source** → **Root Directory** = `microservices/<nombre>` (ej. `microservices/users`).
3. **Settings** → **Build** → ya detecta `railway.json` y usa el Dockerfile.
4. **Variables** → añade las del cuadro de abajo (usa `${{...}}` para referenciar otros servicios — Railway resuelve en tiempo de deploy).

### Variables comunes a TODOS los servicios Django

```bash
DJANGO_SECRET_KEY=<genera una con: python -c "import secrets;print(secrets.token_urlsafe(50))">
DJANGO_DEBUG=False
JWT_SECRET_KEY=<misma en todos los MS>
JWT_ACCESS_TOKEN_EXPIRE_HOURS=1
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
# El frontend público — para CORS y links de correo
CORS_ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
WEB_CONCURRENCY=2
WEB_THREADS=4
```

### Variables específicas por servicio

#### `users`
```bash
DATABASE_URL=${{users-db.DATABASE_URL}}
RABBITMQ_URL=${{rabbitmq.RABBITMQ_PRIVATE_URL}}
SPACES_SERVICE_URL=http://${{spaces.RAILWAY_PRIVATE_DOMAIN}}:8080
```

#### `spaces`
```bash
DATABASE_URL=${{spaces-db.DATABASE_URL}}
RABBITMQ_URL=${{rabbitmq.RABBITMQ_PRIVATE_URL}}
```

#### `reservations`
```bash
DATABASE_URL=${{reservations-db.DATABASE_URL}}
RABBITMQ_URL=${{rabbitmq.RABBITMQ_PRIVATE_URL}}
USERS_SERVICE_URL=http://${{users.RAILWAY_PRIVATE_DOMAIN}}:8080
SPACES_SERVICE_URL=http://${{spaces.RAILWAY_PRIVATE_DOMAIN}}:8080
```

#### `notifications`
```bash
DATABASE_URL=${{notifications-db.DATABASE_URL}}
RABBITMQ_URL=${{rabbitmq.RABBITMQ_PRIVATE_URL}}
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=Espacios UFPS <no-reply@ufps.edu.co>
REMINDER_HOURS_BEFORE=1
```

> Cuando configures SMTP real (Gmail App Password / SendGrid):
> ```
> EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
> EMAIL_HOST=smtp.gmail.com
> EMAIL_PORT=587
> EMAIL_HOST_USER=tu-correo@gmail.com
> EMAIL_HOST_PASSWORD=tu-app-password
> EMAIL_USE_TLS=True
> ```

#### `reports`
```bash
DATABASE_URL=${{reports-db.DATABASE_URL}}
RABBITMQ_URL=${{rabbitmq.RABBITMQ_PRIVATE_URL}}
SPACES_SERVICE_URL=http://${{spaces.RAILWAY_PRIVATE_DOMAIN}}:8080
```

5. **Settings** → **Networking** → **Generate Domain** SOLO si quieres acceso directo. Normalmente NO necesitas dominio público para los MS porque van detrás del gateway. Déjalo cerrado.
6. **Deploy** → espera el primer build (puede tardar 3-5 min por Postgres + Django + gunicorn).

## 3. Desplegar los 3 workers

Cada worker corre el mismo código de su MS pero con otro comando. Para cada uno:

1. **+ New Service** → **GitHub Repo** → `Espacios-Universitarios`.
2. **Settings** → **Source** → **Root Directory** = `microservices/<padre>`.
3. **Settings** → **Deploy** → **Custom Start Command** (override del Dockerfile CMD):
   - `notifications-worker`: `python manage.py consume_events`
   - `notifications-reminder-cron`: `sh -c 'while true; do python manage.py send_due_reminders; sleep 300; done'`
   - `reports-worker`: `python manage.py consume_events`
4. **Variables** → mismas que su MS padre (DATABASE_URL + RABBITMQ_URL).
5. **Networking** → **NO generes dominio** (no escucha HTTP).
6. Deploy.

## 4. Desplegar el gateway

1. **+ New Service** → **GitHub Repo** → `Espacios-Universitarios`.
2. **Settings** → **Source** → **Root Directory** = `gateway`.
3. **Variables**:
   ```bash
   USERS_HOST=${{users.RAILWAY_PRIVATE_DOMAIN}}:8080
   SPACES_HOST=${{spaces.RAILWAY_PRIVATE_DOMAIN}}:8080
   RESERVATIONS_HOST=${{reservations.RAILWAY_PRIVATE_DOMAIN}}:8080
   NOTIFICATIONS_HOST=${{notifications.RAILWAY_PRIVATE_DOMAIN}}:8080
   REPORTS_HOST=${{reports.RAILWAY_PRIVATE_DOMAIN}}:8080
   ```
4. **Settings** → **Networking** → **Generate Domain** → SÍ. Este es el dominio público de la API. Anota la URL, p.ej. `gateway-production-abc.up.railway.app`.
5. Deploy.

## 5. Desplegar el frontend

1. **+ New Service** → **GitHub Repo** → `Espacios-Universitarios`.
2. **Settings** → **Source** → **Root Directory** = `frontend/frontend`.
3. **Variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://${{gateway.RAILWAY_PUBLIC_DOMAIN}}
   ```
4. **Settings** → **Networking** → **Generate Domain** → SÍ. Este será el sitio público.
5. **Deploy**.

> Importante: `NEXT_PUBLIC_*` se inserta en tiempo de **build** de Next.js, no de runtime. Si lo cambias después, hay que **redeploy**.

## 6. Volver atrás y completar variables cruzadas

Una vez que tengas el dominio del frontend, vuelve a los 5 servicios Django y al gateway y actualiza:

- `CORS_ALLOWED_ORIGINS` = `https://<frontend>.up.railway.app`
- `FRONTEND_URL` = `https://<frontend>.up.railway.app`

Railway detecta el cambio y redeploya solo los servicios afectados.

## 7. Seed inicial en producción

En el proyecto Railway, ve a cada MS y abre **Settings** → **Deploy** → **Custom Start Command** temporalmente, o usa `railway run` desde tu máquina:

```bash
# Si tienes Railway CLI
railway link
railway environment production
railway service users
railway run python manage.py seed_demo

railway service spaces
railway run python manage.py seed_demo

# ... etc
```

O más fácil: desde la **shell del contenedor** que Railway provee en cada servicio:

```
docker compose exec users python manage.py seed_demo
```
(equivalente nativo en Railway: el botón **Logs** → **Shell** → corre el comando)

## 8. Verificar

- `https://<gateway>.up.railway.app/api/gateway/health` → `{"status":"ok"}`
- `https://<gateway>.up.railway.app/api/health/users` → `{"status":"ok","service":"users"}`
- `https://<frontend>.up.railway.app/login` → login con `1152307` / `12345678A`

---

## 📌 Mapa de servicios resultante

```
              ┌─────────────────────────────┐
              │  frontend (Next.js)         │  ← dominio público
              └──────────┬──────────────────┘
                         │ HTTPS
              ┌──────────▼──────────────────┐
              │  gateway (Nginx)            │  ← dominio público
              └──┬────┬────┬────┬────┬──────┘
                 │    │    │    │    │   (red privada Railway)
        ┌────────▼┐  │┌───▼──┐ │┌───▼─────────┐
        │ users  │  ││spaces│ ││reservations │
        └──┬─────┘  │└──┬───┘ │└──┬──────────┘
           │        │   │     │   │
        ┌──▼─────┐  │   │     │┌──▼─────────────┐
        │users-db│  │   │     ││reservations-db │
        └────────┘  │   │     │└────────────────┘
                    │┌──▼──────┐
                    ││spaces-db│
                    │└─────────┘
        ┌───────────▼──┐    ┌─────────┐
        │notifications │    │ reports │
        └──┬───────────┘    └─┬───────┘
           │                  │
        ┌──▼─────────────┐ ┌──▼─────────┐
        │notifications-db│ │ reports-db │
        └────────────────┘ └────────────┘

                 ┌──────────┐
                 │ RabbitMQ │  ← consumido por reservations (publica),
                 └──────────┘    notifications-worker, reports-worker,
                                 notifications-reminder-cron

  Workers (sin dominio público):
  - notifications-worker
  - notifications-reminder-cron
  - reports-worker
```

## 💰 Costo aproximado

Con plan Hobby ($5/mes incluye $5 de uso) y todo idle: **~$15-25/mes**. Con tráfico moderado de demo: **~$25-40/mes**.

Para bajar costo, considera:
- Frontend en **Vercel** (gratis hasta 100 GB egress) → ahorra ~$5
- **CloudAMQP Little Lemur** en lugar de RabbitMQ → gratis
- Consolidar las 5 Postgres en una sola con 5 schemas → ahorra ~$8

## 🚨 Troubleshooting común

| Síntoma | Causa | Fix |
|---|---|---|
| 502 Bad Gateway en frontend | NEXT_PUBLIC_API_URL apunta a localhost | Redeploy frontend con la var correcta apuntando al gateway |
| CORS bloqueado en navegador | CORS_ALLOWED_ORIGINS no incluye el dominio frontend | Añadir a las vars del MS afectado |
| 400 DisallowedHost | ALLOWED_HOSTS no incluye dominio Railway | `RAILWAY_PUBLIC_DOMAIN` ya se inyecta solo — verifica que esté en la lista |
| `connection refused` desde reservations a users | Usaste localhost en lugar de RAILWAY_PRIVATE_DOMAIN | Cambiar a `http://${{users.RAILWAY_PRIVATE_DOMAIN}}:8080` |
| Workers reinician en bucle | RABBITMQ_URL apunta al público (lento) | Usar `RABBITMQ_PRIVATE_URL` |
