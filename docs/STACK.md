# Herramientas y recursos del proyecto

> Documento técnico — Rama `prototipo`
> Plataforma de reserva de espacios universitarios UFPS construida con arquitectura de microservicios.

## 1. Lenguajes de programación

| Lenguaje | Versión | Para qué |
|---|---|---|
| **Python** | 3.12 | Microservicios backend (Django) |
| **JavaScript (JSX)** | ES2024 | Frontend (Next.js) |
| **SQL** | PostgreSQL 16 dialect | Migraciones y queries Django ORM |
| **HCL/YAML** | — | docker-compose, configuraciones |
| **Bash / PowerShell** | — | Scripts de seed |
| **Nginx config** | — | API gateway |

## 2. Frameworks y librerías — Backend (Python)

### Stack común a los 5 microservicios

| Librería | Versión | Propósito |
|---|---|---|
| `Django` | 5.2.12 | Framework web, ORM, migraciones, admin |
| `djangorestframework` | 3.17.1 | APIs REST (serializers, views, paginación) |
| `django-cors-headers` | 4.7.0 | Habilita CORS para que el frontend consuma las APIs |
| `gunicorn` | 23.0.0 | Servidor WSGI de producción (3 workers × 4 threads) |
| `psycopg2-binary` | 2.9.10 | Driver PostgreSQL |
| `dj-database-url` | 2.3.0 | Parsea `DATABASE_URL` env → settings de BD |
| `PyJWT` | 2.10.1 | Generación/validación de JWT compartidos entre MS |
| `asgiref` | 3.11.1 | Soporte async de Django |
| `sqlparse` | 0.5.5 | Dependencia interna de Django |

### Específico por microservicio

| MS | Librería extra | Propósito |
|---|---|---|
| **users** | `bcrypt 4.2.1` | Hash de contraseñas |
| **users** | `pika 1.3.2` | Publica eventos `PasswordResetRequested` a RabbitMQ |
| **reservations** | `pika 1.3.2` | Publica `ReservationCreated/Approved/Rejected/Cancelled` |
| **notifications** | `pika 1.3.2` | Consume eventos de RabbitMQ |
| **reports** | `pika 1.3.2` | Consume eventos para alimentar stats y audit logs |
| **reports** | `reportlab 4.2.5` | Genera PDFs de reportes con Platypus (tablas con estilos) |

## 3. Frameworks y librerías — Frontend (JavaScript)

| Librería | Versión | Propósito |
|---|---|---|
| `next` | 16.2.3 | Framework React (App Router, SSR, build standalone) |
| `react` | 19.2.4 | Librería UI |
| `react-dom` | 19.2.4 | Renderer |
| `tailwindcss` | 4.x | CSS utility-first |
| `@tailwindcss/postcss` | 4.x | Procesador PostCSS para Tailwind 4 |
| `eslint` + `eslint-config-next` | 9 / 16.2.3 | Linter |
| `babel-plugin-react-compiler` | 1.0.0 | React Compiler (memoización automática) |

### Capacidades aprovechadas de Next.js
- **App Router** con route groups `(auth)`, `(main)`, `(admin)`
- **Server Components** por defecto, `"use client"` solo donde hace falta
- **Output standalone** → imagen Docker minimal (solo runtime, sin node_modules)
- **Turbopack** en dev → HMR rápido
- **`reactCompiler: true`** → optimiza re-renders sin escribir `useMemo`

## 4. Bases de datos

| Tipo | Instancia | Servicio | Tablas principales |
|---|---|---|---|
| PostgreSQL 16 | users-db | Railway | `users`, `roles`, `user_sessions` |
| PostgreSQL 16 | spaces-db | Railway | `spaces_area`, `spaces_space`, `spaces_spaceoperatinghours`, `space_holidays` |
| PostgreSQL 16 | reservations-db | Railway | `reservations_reservation`, `reservation_rules`, `reservations_outboxevent` |
| PostgreSQL 16 | notifications-db | Railway | `notification_history`, `scheduled_reminders` |
| PostgreSQL 16 | reports-db | Railway | `audit_logs`, `daily_usage_stats` |

**Conexión:** todas las BDs viven en Railway, accedidas vía `DATABASE_URL` pública con SSL. `conn_max_age=1800` para reusar conexiones (clave por la latencia del proxy público).

## 5. Mensajería y eventos

| Componente | Versión | Para qué |
|---|---|---|
| **RabbitMQ** | 3.13 (image `rabbitmq:3.13-management-alpine`) | Broker de eventos asíncronos |
| **Management UI** | http://localhost:15672 | Inspeccionar colas, exchanges, mensajes |

### Exchanges (topic, durable)

| Exchange | Productor | Consumidores | Routing keys |
|---|---|---|---|
| `reservations` | reservations MS | notifications-worker, reports-worker | `ReservationCreated`, `ReservationApproved`, `ReservationRejected`, `ReservationCancelled` |
| `users` | users MS | notifications-worker | `PasswordResetRequested` |

### Outbox pattern
El MS `reservations` guarda cada evento en la tabla `outbox_event` **dentro de la misma transacción** del cambio de estado, antes de publicar a RabbitMQ. Si Rabbit está caído, el evento queda persistido y puede reintentarse.

## 6. Infraestructura local

| Componente | Versión | Rol |
|---|---|---|
| **Docker** | ≥ 24 | Containerización |
| **Docker Compose** | v2 | Orquestación local (`docker compose up`) |
| **Nginx** | 1.27-alpine | API Gateway: routing, gzip, keepalive |

### Topología (`docker-compose.yml`)

```
13 servicios + 5 PostgreSQL remotas en Railway:

  rabbitmq                          (broker AMQP + UI management)
  gateway                           (nginx reverse proxy)
  users / spaces / reservations     (Django + gunicorn, 3 workers × 4 threads)
  notifications / reports           (Django + gunicorn, 2 workers × 4 threads)
  notifications-worker              (python manage.py consume_events)
  notifications-reminder-cron       (loop: send_due_reminders cada 5 min)
  reports-worker                    (python manage.py consume_events)
  frontend                          (Next.js standalone)
```

Cada MS Django tiene **límite de memoria** (256 MB principales, 192 MB workers, 64 MB gateway).

## 7. Servicios externos integrados

| Servicio | Plan | Uso |
|---|---|---|
| **Railway PostgreSQL** | Hobby | 5 instancias para las BDs |
| **Gmail SMTP** | Cuenta personal + App Password | Envío de correos transaccionales (HU-4, HU-14, HU-15) |
| **Unsplash CDN** | Gratis | Imágenes de espacios sembradas en demo |

## 8. Patrones y técnicas aplicadas

| Patrón | Dónde se ve |
|---|---|
| **Microservicios** | 5 MS Django independientes con BD propia |
| **API Gateway** | Nginx único en puerto 8000 → enruta a cada MS |
| **JWT compartido** | Mismo `JWT_SECRET_KEY` entre los 5 MS → ningún MS necesita validar contra users |
| **Event-driven** | RabbitMQ topic exchanges, productores y consumidores desacoplados |
| **Outbox pattern** | reservations persiste eventos antes de publicar |
| **Fire-and-forget HTTP** | users registra audit logs en reports sin bloquear el login |
| **CQRS-light** | Lecturas de reportes desde `daily_usage_stats` agregada (no se calcula sobre la marcha) |
| **In-memory cache + dedup** | `apiClient.js` cachea GETs 30s y deduplica requests en vuelo |
| **Soft-delete** | Espacios eliminados se desactivan (`is_active=False`) para preservar historial |
| **Singleton config** | `ReservationRules.current()` siempre devuelve la fila única (HU-26) |
| **Throttling vía gunicorn** | `max-requests 1000 + jitter` recicla workers para liberar conexiones a Postgres |

## 9. Estrategia de seguridad

- **Bcrypt** para almacenar contraseñas (cost factor por defecto, 12 rondas)
- **JWT HS256** con secret compartido vía env var
- **Refresh tokens** en BD (revocables al logout)
- **CORS** restringido a orígenes específicos
- **No exposición de `password_hash`** en los serializers
- **Auditoría** en `audit_logs` para login, logout, registro, recuperación, aprobación, rechazo
- **Variables sensibles** en `.env` (excluido por `.gitignore`)

## 10. Optimizaciones de rendimiento aplicadas

| Optimización | Impacto |
|---|---|
| `runserver` → `gunicorn` + threads | De 1 request en paralelo a 12 por MS |
| `conn_max_age=1800` | Reusa conexión Postgres 30 min → evita handshake TLS cada query |
| Nginx `keepalive 16` upstream | Conexiones persistentes gateway ↔ MS |
| Nginx `gzip` para JSON | Respuestas hasta 70% más pequeñas |
| Cache frontend 30s + dedup in-flight | Dashboard se recarga instantáneo |
| Consumer RabbitMQ con retry interno | Elimina spam de logs por restart loop |
| `pika` logging → WARNING | Solo errores reales en logs |
| Memoria limitada por contenedor | Cap total ~2.4 GB |
| React Compiler activado | Memoización automática sin código extra |
| `next build` standalone | Imagen Docker mínima |

## 11. Herramientas de desarrollo usadas

| Herramienta | Para qué |
|---|---|
| **Git + GitHub** | Control de versiones, rama `prototipo` |
| **VS Code** | Editor |
| **Docker Desktop** | Ejecutar contenedores en Windows |
| **PowerShell** | Scripts de seed (`seed-demo.ps1`) |
| **Bash** | Scripts equivalentes (`seed-demo.sh`) |
| **Postman/curl** | Testing manual de endpoints |
| **RabbitMQ Management UI** | Inspección de colas |

## 12. Archivos clave por componente

```
.
├── README.md                          ← entrada al proyecto
├── docker-compose.yml                 ← orquesta los 13 servicios
├── .env                               ← variables (no versionado)
├── seed-demo.ps1 / seed-demo.sh       ← reset + datos demo
├── docs/                              ← este documento + manual de uso
│
├── gateway/
│   ├── Dockerfile
│   ├── nginx.conf                     ← upstreams, keepalive, gzip, CORS
│   └── proxy_params
│
└── microservices/
    └── <users|spaces|reservations|notifications|reports>/
        ├── Dockerfile                 ← gunicorn + migrate + seed roles
        ├── requirements.txt
        ├── manage.py
        ├── config/                    ← settings, urls, wsgi
        └── <app>/
            ├── models.py              ← ORM Django
            ├── serializers.py         ← validación DRF
            ├── api.py                 ← endpoints
            ├── auth.py                ← JWT helpers
            ├── services.py            ← clientes HTTP a otros MS
            ├── consumer.py            ← worker RabbitMQ (solo en notif/reports)
            ├── publisher.py           ← productor RabbitMQ (users, reservations)
            └── management/commands/
                ├── seed_demo.py       ← hard reset + datos coherentes
                └── consume_events.py  ← worker entrypoint

└── frontend/frontend/
    ├── Dockerfile                     ← multi-stage build → standalone
    ├── package.json
    ├── next.config.mjs                ← reactCompiler, output: standalone
    └── src/
        ├── app/
        │   ├── (auth)/                ← login, register, reset
        │   ├── (main)/                ← spaces, reservations, calendar, profile
        │   └── (admin)/               ← dashboard, reservas, usuarios, etc.
        ├── components/                ← Header, RouteGuard, UFPSLogo
        └── lib/
            ├── apiClient.js           ← fetch + cache + dedup
            └── authStorage.js         ← JWT en localStorage
```

## 13. Métricas de código (aprox.)

| Métrica | Valor |
|---|---|
| Microservicios Django | 5 |
| Workers RabbitMQ | 3 |
| Endpoints REST únicos | ~45 |
| Modelos de BD | ~17 |
| Páginas Next.js | ~17 |
| Líneas de Python | ~4500 |
| Líneas de JSX | ~5000 |
| Comandos de management Django | 8 (seed_roles, seed_sb, seed_demo×5, consume_events, send_due_reminders) |

## 14. Compromisos arquitectónicos

| Decisión | Trade-off aceptado |
|---|---|
| 5 Postgres separadas | Aislamiento de datos vs. costo más alto y joins HTTP entre MS |
| RabbitMQ síncrono con pika | Simplicidad vs. menos throughput que un broker async |
| Frontend SSR estático | Caches en CDN simples vs. menos personalización por request |
| Sin Redis | Una pieza menos vs. cache solo en memoria del contenedor |
| Sin TypeScript | Velocidad de iteración vs. menos seguridad de tipos |
| Bcrypt en lugar de Argon2 | Compatibilidad y madurez vs. menor resistencia a GPUs |
