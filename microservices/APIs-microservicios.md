# APIs de los microservicios (Users, Spaces, Reservations)

Este documento describe las APIs HTTP expuestas por cada microservicio Django. Las rutas son relativas al origen del servicio (por ejemplo `http://localhost:8080`). Con **Docker Compose**, los puertos publicados en el host son:

| Servicio       | Puerto en el host | Puerto interno del contenedor |
|----------------|-------------------|-------------------------------|
| **users**      | 8080              | 8000                          |
| **reservations** | 8081            | 8000                          |
| **spaces**     | 8082              | 8000                          |

---

## Users (usuarios)

**Qué hace, por encima**  
Gestiona el catálogo de personas de la universidad: código institucional, nombre, rol, correo opcional y estado activo/inactivo. Sirve de fuente de verdad para identificar usuarios por UUID y para **resolver** un usuario a partir de su `university_code` cuando otros servicios lo necesitan.

**Cómo funciona**  
Es una API REST con Django REST Framework. Los datos viven solo en la base de este servicio. Las respuestas JSON incluyen el rol anidado. No hay autenticación JWT ni sesiones en estas rutas: están abiertas (`AllowAny`) para desarrollo y pruebas.

**APIs**

- `GET /api/test/` — Comprobación mínima; respuesta de texto plano (`working`).
- `GET /api/v1/users/<uuid>/` — Detalle de un usuario por su id (UUID).
- `GET /api/v1/users/resolve/?university_code=<valor>` — Busca un usuario por código universitario (comparación sin distinguir mayúsculas/minúsculas). Devuelve el mismo cuerpo que el detalle si existe.

**Ejemplo**

```http
GET http://localhost:8080/api/v1/users/resolve/?university_code=dummy
```

Respuesta aproximada (200):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "university_code": "dummy",
  "first_name": "Dummy",
  "last_name": "User",
  "email": "dummy@university.example.edu",
  "role": {
    "id": "...",
    "name": "admin",
    "description": "..."
  },
  "is_active": true,
  "created_at": "...",
  "updated_at": "..."
}
```

**Observaciones**

- Si falta `university_code` en `resolve`, respuesta **400** con `detail` explicando el error.
- Si no hay usuario, **404** con `{"detail": "User not found."}`.
- El panel de administración Django está en `/admin/` (mismo host y puerto).
- Entre contenedores, el hostname del servicio es `users` y el puerto interno **8000** (p. ej. `http://users:8000`).

---

## Spaces (espacios)

**Qué hace, por encima**  
Mantiene **áreas** (ej. ala SB) y **salas** dentro de cada área (código por planta: 101, 401, etc.), con equipamiento, capacidad, estado operativo/mantenimiento y horarios opcionales. Permite obtener una sala por UUID o **resolverla** por `area_code` + `code`.

**Cómo funciona**  
API REST (DRF). Las rutas bajo `/api/v1/` están definidas en la app `spaces`. La resolución localiza primero el área y luego la sala dentro de ese área; las comparaciones de códigos no distinguen mayúsculas/minúsculas.

**APIs**

- `GET /api/v1/test/` — Texto plano de prueba (`working`).
- `GET /api/v1/hello/` — JSON de bienvenida (DRF).
- `GET /api/v1/spaces/<uuid>/` — Detalle de una sala; incluye el objeto `area` anidado.
- `GET /api/v1/spaces/resolve/?area_code=<slug>&code=<codigo_sala>` — Resuelve la sala; parámetros obligatorios `area_code` y `code` (ej. área `sb`, código de sala `401`).

**Ejemplo**

```http
GET http://localhost:8082/api/v1/spaces/resolve/?area_code=sb&code=401
```

Respuesta aproximada (200):

```json
{
  "id": "...",
  "area": {
    "id": "...",
    "code": "sb",
    "name": "Building SB",
    "description": "...",
    "sort_order": 10
  },
  "code": "401",
  "name": "SB401",
  "floor": 4,
  "capacity": 30,
  "has_air_conditioning": true,
  "has_computers": false,
  "has_projector": true,
  "has_internet": true,
  "amenities": {},
  "status": "operational",
  "created_at": "...",
  "updated_at": "..."
}
```

**Observaciones**

- Área o sala inexistente: **404** (`Area not found.` o `Space not found.`).
- Parámetros faltantes: **400** con mensaje en `detail`.
- `status` `operational` es el valor esperado para permitir reservas desde el servicio de reservas.
- Admin en `/admin/`. Hostname Docker: `spaces`, puerto interno **8000**.

---

## Reservations (reservas)

**Qué hace, por encima**  
Registra reservas de salas en franjas de **horas enteras** (intervalo semiabierto: `start_hour` incluido, `end_hour` excluido). No guarda copias de usuario ni sala más allá de sus UUIDs; antes de crear una reserva **llama por HTTP** a **Users** y a **Spaces** para validar que el código de usuario y el par área/sala existen y cumplen reglas básicas (usuario activo, sala operativa).

**Cómo funciona**  
Un `POST` recibe códigos legibles (`university_code`, `area_code`, `space_code`). El servicio construye URLs a partir de `USERS_SERVICE_URL` y `SPACES_SERVICE_URL` (en Compose: `http://users:8000` y `http://spaces:8000`), consume los endpoints `resolve` de ambos servicios, obtiene los UUIDs y persiste la reserva si no hay solape con otra reserva **confirmada** en la misma sala y fecha.

**APIs**

- `GET /api/test/` — Texto plano (`working`).
- `POST /api/v1/reservations/` — Crea una reserva confirmada. Cuerpo JSON (ver ejemplo).

**Ejemplo**

```http
POST http://localhost:8081/api/v1/reservations/
Content-Type: application/json

{
  "area_code": "sb",
  "space_code": "401",
  "university_code": "dummy",
  "reservation_date": "2026-04-10",
  "start_hour": 8,
  "end_hour": 10
}
```

Respuesta aproximada (201):

```json
{
  "id": "...",
  "space_id": "...",
  "requester_user_id": "...",
  "reservation_date": "2026-04-10",
  "start_hour": 8,
  "end_hour": 10,
  "status": "confirmed"
}
```

**Observaciones**

- **Horas:** `end_hour` debe ser **mayor** que `start_hour`; el bloque representa `[start_hour, end_hour)` en la fecha indicada (ej. 8 y 10 → de 8:00 a 10:00).
- Si Users o Spaces no responden o devuelven error, el servicio puede responder **400**, **502** o **503** según el caso, con `detail` descriptivo.
- Usuario inactivo (`is_active: false`) o sala no operativa: **400**.
- Solape con otra reserva confirmada en la misma sala y día: **400** (validación del modelo).
- En desarrollo local sin Docker, las variables por defecto apuntan a `http://127.0.0.1:8080` (users) y `http://127.0.0.1:8082` (spaces); ajústalas si tus puertos cambian.
- Admin en `/admin/`. Hostname Docker: `reservations`, puerto interno **8000**.

---

*Documento alineado con el `docker-compose.yml` del mismo directorio. Las rutas y comportamientos pueden evolucionar con nuevas versiones del código.*
