# Espacios Universitarios UFPS

Plataforma de **reserva de espacios universitarios** construida con arquitectura de **microservicios**. Permite a estudiantes, docentes y administrativos consultar disponibilidad, reservar aulas y laboratorios, y al equipo administrativo gestionar usuarios, espacios, reglas globales y reportes de uso.

## Arquitectura

```
                     ┌─────────────────────────┐
                     │  Frontend (Next.js 16)  │
                     │       puerto 3000       │
                     └────────────┬────────────┘
                                  │  HTTPS
                                  ▼
                     ┌─────────────────────────┐
                     │   API Gateway (Nginx)   │
                     │       puerto 8000       │
                     └─┬─────┬─────┬─────┬─────┘
                       │     │     │     │
            ┌──────────┘     │     │     └──────────┐
            │      ┌─────────┘     └─────────┐      │
            ▼      ▼                         ▼      ▼
       ┌────────┐ ┌────────┐         ┌─────────┐ ┌─────────┐
       │ Users  │ │ Spaces │         │  Notif. │ │ Reports │
       │  8080  │ │  8082  │         │   8083  │ │  8084   │
       └───┬────┘ └───┬────┘         └────┬────┘ └────┬────┘
           │          │  ┌──────────┐     │           │
           │          └──┤Reservat. ├──┐  │           │
           │             │   8081   │  │  │           │
           │             └──────────┘  │  │           │
           ▼             ▼             ▼  ▼           ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ users-db │  │spaces-db │  │ reserv.  │  │ reports  │
     │(Postgres)│  │(Postgres)│  │   db     │  │   db     │
     └──────────┘  └──────────┘  └──────────┘  └──────────┘
                       ▲                ▲
                       │                │
                  ┌────┴────────────────┴────┐
                  │       RabbitMQ           │  ← eventos asíncronos
                  │       puerto 5672        │     (publicar/suscribir)
                  └──────────────────────────┘
```

### Microservicios

| Servicio        | Stack          | Puerto host | BD                |
|-----------------|----------------|-------------|-------------------|
| `users`         | Django + DRF   | 8080        | users-db          |
| `spaces`        | Django + DRF   | 8082        | spaces-db         |
| `reservations`  | Django + DRF   | 8081        | reservations-db   |
| `notifications` | Django + DRF   | 8083        | notifications-db  |
| `reports`       | Django + DRF   | 8084        | reports-db        |
| `gateway`       | Nginx          | 8000        | —                 |
| `frontend`      | Next.js 16     | 3000        | —                 |

### Workers (procesos de fondo, sin HTTP)

- `notifications-worker` — consume eventos de RabbitMQ y dispara correos
- `notifications-reminder-cron` — cada 5 min envía recordatorios programados
- `reports-worker` — alimenta `DailyUsageStats` y `AuditLog` desde eventos

### Bases de datos (PostgreSQL en Railway)

5 instancias Postgres separadas, una por microservicio. Cross-references por FK lógica (UUIDs), no físicas.

## Estado del proyecto — Historias de Usuario

| ✅ Completas (24) | 🟡 Pendientes de SMTP real (3) |
|---|---|
| HU-1 Registro de usuarios | **HU-4** Recuperación de contraseña ← endpoint + token + evento RabbitMQ + plantilla OK; falta SMTP |
| HU-2 Login JWT | **HU-14** Notificaciones email ← eventos + consumer + plantillas OK; falta SMTP |
| HU-3 Logout | **HU-15** Recordatorios programados ← worker cron + plantilla OK; falta SMTP |
| HU-5 Editar perfil | |
| HU-6 Catálogo con fotos y paginación | |
| HU-7 Detalle de espacio | |
| HU-8 Filtros (fecha, hora, capacidad, tipo) | |
| HU-9 Calendario semanal con modal de reserva | |
| HU-10 Realizar reserva (auto-confirma si aplica) | |
| HU-11 Mis reservas activas | |
| HU-12 Historial de reservas | |
| HU-13 Cancelar con anticipación mínima | |
| HU-16 CRUD usuarios (admin) | |
| HU-17 CRUD espacios (soft-delete preserva historial) | |
| HU-18 Restricción de rol por aula | |
| HU-19 Bloqueo de festivos (global y por espacio) | |
| HU-20 Supervisión global de reservas | |
| HU-22 Reportes con export CSV/PDF | |
| HU-23 Dashboard admin con gráficos | |
| HU-24 Top espacios más reservados | |
| HU-25 Mapa de calor horario | |
| HU-26 Configuración global de reglas | |
| HU-27 Logs de auditoría | |

**Estado:** **24 de 27 HUs completas (89 %)**. Las 3 restantes solo requieren configurar SMTP real en variables de entorno; el código ya está listo y los correos se loguean a consola por defecto.

> El correo backend `console.EmailBackend` deja los correos en `docker compose logs notifications-worker`. Para activar SMTP real, basta con cambiar 4 variables en `.env`:
> ```
> EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
> EMAIL_HOST=smtp.gmail.com
> EMAIL_HOST_USER=tu@correo.com
> EMAIL_HOST_PASSWORD=tu-app-password
> ```

## Cómo correr el proyecto localmente

### Pre-requisitos

- Docker Desktop / Docker Engine
- Las 5 URLs públicas de Postgres de Railway en el archivo `.env` (raíz del repo)

### `.env` mínimo (raíz del proyecto)

```bash
USERS_DATABASE_URL=postgresql://...
SPACES_DATABASE_URL=postgresql://...
RESERVATIONS_DATABASE_URL=postgresql://...
NOTIFICATIONS_DATABASE_URL=postgresql://...
REPORTS_DATABASE_URL=postgresql://...

JWT_SECRET_KEY=ufps-espacios-jwt-secret-cambiar-en-produccion
JWT_ACCESS_TOKEN_EXPIRE_HOURS=1
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
DEFAULT_FROM_EMAIL=Espacios UFPS <no-reply@ufps.edu.co>
REMINDER_HOURS_BEFORE=1
FRONTEND_URL=http://localhost:3000

RABBITMQ_USER=guest
RABBITMQ_PASS=guest
```

### Levantar todo

```powershell
docker compose up -d --build
```

Espera ~30 s a que los healthchecks pasen. Después:

| URL | Para qué |
|---|---|
| http://localhost:3000 | Frontend |
| http://localhost:8000/api/gateway/health | Health del API Gateway |
| http://localhost:15672 | RabbitMQ Management UI (guest/guest) |

### Sembrar datos de demo

Con los contenedores corriendo:

```powershell
.\seed-demo.ps1
```

Esto borra TODO de las 5 BDs y siembra 6 usuarios, 6 espacios con fotos, 11 reservas mixtas (pasadas+futuras+todos los estados), 20 notificaciones y 30 días de estadísticas.

### Credenciales después del seed

| Código | Contraseña | Rol |
|---|---|---|
| **1152307** | **12345678A** | Nefer (Estudiante) — cuenta principal de demo |
| **admin001** | **admin1234** | Carlos (Admin) — ve dashboard, reportes, logs |
| 1152888 | Docente123 | María (Docente) |
| 1152444 | Estudiante1 | Juan (Estudiante) |
| 1152555 | Estudiante1 | Ana (Estudiante) |
| 1152666 | Personal123 | Pedro (Administrativo) |

## Tour rápido por las funcionalidades

**Como Nefer (Estudiante):**
- `/spaces` → 6 espacios con foto, filtros básicos y panel de filtros avanzados (fecha+hora+capacidad)
- `/reservations` → tabs "Activas" e "Historial"
- `/reservations/calendar` → vista semanal, click en celda libre abre modal de reserva
- Intenta reservar SB-401 → se auto-confirma (HU-10)
- Intenta reservar LAB-101 como estudiante → 403 por restricción de rol (HU-18)
- Intenta reservar el día del festivo sembrado → 400 por día bloqueado (HU-19)

**Como Admin (admin001):**
- `/admin/dashboard` → KPIs reales, top 5 espacios, heatmap horario
- `/admin/reportes` → genera reporte por rango, exporta CSV (delimitado `;`, con BOM UTF-8) o PDF (A4 horizontal, layout profesional)
- `/admin/logs` → 15 acciones registradas con filtro por acción
- `/admin/configuracion` → edita reglas globales (max horas/día, anticipación, etc.)
- `/admin/reservas` → aprueba o rechaza pending

## Stack técnico

- **Backend:** Django 5.2 + DRF + Gunicorn (3 workers × 4 threads, `worker-class gthread` para concurrencia real)
- **Frontend:** Next.js 16 (App Router, React 19), Tailwind 4, Turbopack en dev
- **BD:** PostgreSQL (`conn_max_age=1800` para reusar conexiones a Railway)
- **Mensajería:** RabbitMQ (exchange `reservations` topic + exchange `users` topic)
- **Auth:** JWT compartido entre microservicios, bcrypt para passwords
- **Reportes PDF:** reportlab + Platypus para layout
- **API Gateway:** Nginx con `keepalive` upstream + gzip + CORS preflight
- **Caching frontend:** in-memory + in-flight dedup en `apiClient.js` (30 s TTL)

## Estructura del repositorio

```
.
├── docker-compose.yml          ← orquesta todo localmente
├── seed-demo.ps1 / .sh         ← reset + datos de demo
├── .env                        ← variables (no versionado)
├── gateway/                    ← Nginx + reverse proxy
├── microservices/
│   ├── users/                  ← Django MS de identidad/auth
│   ├── spaces/                 ← Django MS de catálogo + horarios + festivos
│   ├── reservations/           ← Django MS de reservas + reglas (HU-26)
│   ├── notifications/          ← Django MS de correos + recordatorios
│   │   └── notifications/
│   │       ├── consumer.py        ← worker RabbitMQ
│   │       └── management/commands/
│   │           ├── consume_events.py
│   │           ├── send_due_reminders.py
│   │           └── seed_demo.py
│   └── reports/                ← Django MS de auditoría + stats
└── frontend/frontend/          ← Next.js
    └── src/
        ├── app/
        │   ├── (auth)/         ← login, register, reset
        │   ├── (main)/         ← spaces, reservations, profile
        │   └── (admin)/        ← dashboard, reportes, logs, config
        ├── components/         ← Header, RouteGuard, UFPSLogo
        └── lib/
            ├── apiClient.js    ← wrapper fetch + cache + dedup
            └── authStorage.js  ← JWT en localStorage
```

## Decisiones de diseño relevantes

- **5 bases de datos separadas** (una por MS) — true microservices, FKs lógicas vía UUIDs
- **Outbox pattern** en `reservations` — los eventos se persisten en `OutboxEvent` antes de publicar a RabbitMQ; si Rabbit cae, no se pierden
- **Auto-confirmación condicional** (HU-10) — `Space.requires_approval` controla si la reserva entra como `pending` (espera admin) o `confirmed` directo
- **Restricción de rol por aula** (HU-18) — campo `Space.allowed_roles: JSON`, validado en el servicio de reservas con datos del MS de usuarios
- **Singleton de reglas** (HU-26) — `ReservationRules` con un solo registro, expuesto vía `GET/PATCH /admin/rules/`
- **Stats en tiempo real** — el worker de reports consume eventos `ReservationApproved/Cancelled/Rejected` y va actualizando `DailyUsageStats` por día y espacio, sin batch nocturno

## Licencia y créditos

Proyecto académico — Curso de Microservicios — Universidad Francisco de Paula Santander.
