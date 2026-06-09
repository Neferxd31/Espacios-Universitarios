# Manual de uso — Espacios Universitarios UFPS

> Plataforma de reserva de aulas, laboratorios y auditorios para la Universidad Francisco de Paula Santander.

## 1. Finalidad del aplicativo

Centralizar la gestión de espacios físicos universitarios (aulas, laboratorios, auditorios, salas de estudio) reemplazando los procesos manuales con papelería y correos sueltos. La plataforma:

- Permite a **estudiantes y docentes** consultar disponibilidad en tiempo real y reservar el espacio que necesitan.
- Permite a **administrativos y admins** mantener el inventario, aprobar solicitudes, configurar reglas globales y consultar métricas de uso.
- Notifica por correo cada cambio relevante (creada, aprobada, rechazada, cancelada, recordatorio).
- Lleva auditoría completa de todas las acciones críticas (logins, cambios, aprobaciones).

## 2. Roles del sistema

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Estudiante** | Estudiantes activos UFPS | Buscar espacios, reservar, cancelar sus propias reservas, editar su perfil |
| **Docente** | Profesores UFPS | Todo lo anterior + acceso a laboratorios restringidos a docentes |
| **Administrativo** | Personal administrativo | Todo lo anterior + gestionar usuarios y espacios, aprobar reservas |
| **Admin** | Coordinadores/IT | Todo lo anterior + configurar reglas globales del sistema y ver auditoría |

> **Importante:** el rol se asigna al momento del registro y solo puede cambiarse por un admin.

## 3. Reglas de negocio

### 3.1 Reglas de las reservas (HU-26)

Configurables en `/admin/configuracion`. Por defecto:

| Regla | Valor por defecto | Significado |
|---|---|---|
| Horas máximas por día | **4 horas** | Un mismo usuario no puede reservar más de 4 horas en total en un mismo día |
| Reservas activas simultáneas | **5** | Un usuario no puede tener más de 5 reservas vigentes/pendientes al tiempo |
| Anticipación mínima | **1 hora** | No se puede reservar para "dentro de menos de 1 hora" |
| Anticipación máxima | **30 días** | No se puede reservar para "dentro de más de 30 días" |
| Anticipación para cancelar | **2 horas** | Solo se puede cancelar si faltan al menos 2 horas para el inicio |

### 3.2 Autoconfirmación (HU-10)

Cada espacio tiene un campo `requires_approval`:

- **`true`** (por defecto): la reserva queda en estado `pending` y requiere aprobación de un admin
- **`false`** (ej: salas de estudio libres): la reserva entra directamente como `confirmed` y queda activa al instante

### 3.3 Restricción por rol (HU-18)

Cada espacio puede definir una lista `allowed_roles`:

- **Vacía** → cualquier rol puede reservar
- **Con valores** (ej: `["Docente", "Admin"]`) → solo esos roles pueden reservar

El sistema rechaza la solicitud con `403 Forbidden` si el rol no está permitido.

### 3.4 Bloqueo de festivos (HU-19)

En `/admin/horarios` se pueden marcar fechas como **bloqueadas**:

- **Global** → todos los espacios cerrados ese día (ej: festivo nacional)
- **Por espacio** → solo ese espacio (ej: mantenimiento de SB-101)

Cualquier intento de reservar ese día es rechazado con `400 Bad Request` y muestra el motivo del bloqueo.

### 3.5 Horarios de operación

Cada espacio tiene horarios definidos por día de la semana:
- Lunes a Viernes: 7:00 - 21:00 (por defecto)
- Sábado: 8:00 - 14:00 (por defecto)
- Domingo: cerrado (por defecto)

> Las reservas fuera del horario de operación se rechazan.

### 3.6 Soft-delete de espacios (HU-17)

Cuando un admin "elimina" un espacio:
- **No se borra físicamente** de la base de datos
- Se marca como `is_active=False` y `status='inactive'`
- El espacio deja de aparecer en el catálogo público
- **Se preserva el historial de reservas pasadas** asociadas

### 3.7 No solapamiento

Dos reservas activas (`pending`, `confirmed`, `approved`) **no pueden compartir** el mismo espacio + día + franja horaria. El sistema rechaza la segunda solicitud con error de validación.

### 3.8 Estados de una reserva

```
                    ┌──────────┐
   Usuario crea  →  │ pending  │
                    └─────┬────┘
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌─────────┐ ┌──────────┐ ┌──────────┐
        │approved │ │ rejected │ │cancelled │  ← usuario cancela
        └────┬────┘ └──────────┘ └──────────┘
             │
       (queda activa hasta la fecha)
```

Si el espacio tiene `requires_approval=false`, salta `pending` y va directo a `confirmed`.

## 4. Cómo se usa el aplicativo

### 4.1 Acceso

URL local: **http://localhost:3000**

### 4.2 Como estudiante o docente

#### Iniciar sesión
1. Abre la página principal
2. Ingresa tu **código universitario** o correo institucional
3. Ingresa tu contraseña
4. Te redirige al catálogo de espacios

#### Recuperar contraseña
1. En login, click "¿Olvidaste tu contraseña?"
2. Ingresa tu correo institucional
3. Revisa tu inbox (puede tardar 30s) — llega un correo con un enlace
4. Haz click → te lleva a una pantalla para fijar nueva contraseña
5. La contraseña debe tener al menos 8 caracteres
6. Listo, puedes iniciar sesión con la nueva

#### Buscar y reservar un espacio

**Forma 1 — Catálogo directo:**
1. Ve a `Espacios` (menú superior)
2. Usa los filtros: nombre, tipo (Aula/Lab/Auditorio/Sala), estado
3. Click "Filtros avanzados" → puedes filtrar por fecha + rango horario + capacidad mínima
4. Click "Ver disponibilidad" en una tarjeta → te lleva al detalle del espacio
5. En el detalle ves los horarios ocupados de ese día
6. Click en una franja libre → modal para confirmar reserva
7. Confirma → la reserva queda creada

**Forma 2 — Vista calendario (más visual):**
1. Ve a `Mis Reservas` → tab "Activas" → botón "Ver calendario"
2. Selecciona el espacio del dropdown
3. Ves la semana entera con franjas: 🟢 libre, 🟡 pendiente, 🔴 aprobada, ⬜ pasado
4. Click en cualquier celda verde → modal de reserva con fecha y hora pre-llenadas
5. Ajusta la hora fin si quieres más de 1 hora seguida
6. Confirma

#### Ver y cancelar mis reservas
1. Ve a `Mis Reservas`
2. Tab "Activas" → reservas vigentes/futuras
3. Tab "Historial" → pasadas, canceladas, rechazadas
4. Click "Cancelar" en una activa → confirmación
5. **Importante**: solo se permite cancelar si faltan al menos 2h para el inicio (configurable)

#### Editar perfil
1. Ve a `Mi Perfil`
2. Cambia nombres, apellidos o correo
3. Click "Guardar cambios"
4. El correo institucional debe ser único en el sistema

### 4.3 Como administrativo o admin

#### Acceder al panel admin
1. Inicia sesión con cuenta de rol Admin o Administrativo
2. En el header del usuario aparece el botón **"Panel Admin"**
3. Te lleva al dashboard administrativo

#### Aprobar/Rechazar reservas pendientes (HU-3)
1. Panel Admin → `Reservas`
2. La sección "Pendientes" muestra reservas esperando decisión
3. Click en una → modal con detalle
4. Click "Aprobar" o "Rechazar" + nota opcional
5. El usuario recibe correo automáticamente
6. La acción queda registrada en logs de auditoría

#### Gestionar usuarios (HU-16)
1. Panel Admin → `Usuarios`
2. Buscar por nombre, código o correo
3. Filtros por rol y estado activo/inactivo
4. Click "Editar" → cambiar nombre, rol, estado
5. Click "Desactivar" → soft-delete del usuario (no podrá iniciar sesión)
6. Click "+ Nuevo usuario" → formulario de creación

#### Gestionar espacios (HU-17, HU-18)
1. Panel Admin → `Espacios`
2. Crear/editar espacio con:
   - Nombre, código, descripción
   - Tipo (Aula/Laboratorio/Auditorio/Sala)
   - Capacidad, piso
   - Área (dependencia responsable)
   - Estado (operacional/mantenimiento/inactivo)
   - **Roles permitidos** (lista vacía = todos)
   - **Foto** (URL de imagen)
3. "Desactivar" hace soft-delete preservando el historial

#### Configurar horarios y festivos (HU-19)
1. Panel Admin → `Horarios`
2. Selecciona un espacio de la lista izquierda
3. En el panel derecho ves los horarios día por día
4. Editar: cambiar día, hora apertura, hora cierre
5. "+ Agregar horario" → añade un día más
6. "Guardar horarios" → reemplaza el set completo del espacio

#### Generar reportes de uso (HU-22)
1. Panel Admin → `Reportes`
2. Selecciona rango de fechas (por defecto últimos 30 días)
3. Click "Generar" → muestra:
   - Totales: reservas, aprobadas, canceladas, rechazadas, horas totales
   - Top 10 espacios más reservados
   - Mapa de calor por hora del día
4. Botón **"⇩ CSV"** → descarga reporte en Excel (delimitado por `;`, UTF-8 con BOM)
5. Botón **"⇩ PDF"** → descarga reporte con diseño profesional (A4 horizontal)

#### Ver dashboard general (HU-23, HU-24, HU-25)
1. Panel Admin → `Dashboard`
2. Indicadores clave de últimos 30 días:
   - Total reservas, aprobadas, canceladas, rechazadas
   - Top 5 espacios más demandados
   - Mapa de calor horario (oscuro = más demanda)
   - Gráfico de reservas por día

#### Consultar logs de auditoría (HU-27)
1. Panel Admin → `Logs`
2. Tabla con todas las acciones registradas:
   - Fecha y hora
   - Usuario responsable
   - Acción realizada (login, logout, ReservationApproved, user_registered, etc.)
   - Recurso afectado
   - Dirección IP
3. Filtrar por nombre de acción

#### Configurar reglas globales (HU-26)
1. Panel Admin → `Configuración`
2. Sección "Reglas de reserva":
   - Horas máximas por día por usuario
   - Reservas activas simultáneas
   - Anticipación mínima (horas)
   - Anticipación máxima (días)
   - Anticipación para cancelar (horas)
3. "Guardar configuración" → los cambios aplican inmediatamente a nuevas reservas

## 5. Notificaciones por correo

El sistema envía correos automáticamente en estos eventos:

| Evento | Quién recibe | Asunto |
|---|---|---|
| Reserva creada | Solicitante | "Reserva creada — pendiente de aprobación" |
| Reserva auto-confirmada | Solicitante | "Reserva creada — pendiente de aprobación" |
| Reserva aprobada | Solicitante | "Reserva aprobada ✓" |
| Reserva rechazada | Solicitante | "Reserva rechazada" |
| Reserva cancelada | Solicitante | "Reserva cancelada" |
| Recordatorio | Solicitante | "Recordatorio de reserva próxima" (1h antes por defecto) |
| Recuperar contraseña | Quien la solicita | "Recuperación de contraseña — Espacios UFPS" |

> Los correos pueden tardar hasta 30 segundos en llegar (depende de Gmail). Si no aparecen en inbox, revisa SPAM.

## 6. Casos de uso típicos

### Caso 1: Estudiante reserva un aula para estudiar
1. Login con código universitario
2. `Espacios` → buscar "aula"
3. Filtros avanzados → fecha mañana, 14:00 a 16:00, capacidad 4
4. Click en SB-401 (auto-confirma porque no requiere aprobación)
5. Confirmar reserva → llega correo "Reserva creada"
6. Mañana 1h antes → llega correo de recordatorio

### Caso 2: Docente reserva un laboratorio para clase
1. Login con código docente
2. `Calendario` → seleccionar LAB-101
3. Click en martes 8:00 → modal de reserva, ampliar a 8:00-11:00
4. Confirmar → reserva queda `pending` (los labs requieren aprobación)
5. Espera correo "Aprobada" o "Rechazada" del admin

### Caso 3: Admin aprueba reservas del día
1. Login admin
2. Panel Admin → `Reservas` → ver lista de pendientes
3. Click en cada una → modal con detalles
4. Aprobar / Rechazar con nota
5. Verificar en `Logs` que quedó registrada la acción

### Caso 4: Admin saca reporte para la dirección
1. Panel Admin → `Reportes`
2. Seleccionar mes pasado completo
3. Generar
4. Descargar PDF → el documento tiene título, resumen, top espacios y detalle diario
5. Adjuntar al informe institucional

### Caso 5: Estudiante olvida contraseña
1. Login → "¿Olvidaste tu contraseña?"
2. Ingresar correo institucional
3. Revisar inbox (1-2 min) → click en el enlace
4. Definir nueva contraseña (mínimo 8 caracteres)
5. Login con la nueva

## 7. Limitaciones conocidas

- Si dos usuarios intentan reservar el mismo slot simultáneamente, solo el primero tiene éxito; el segundo recibe error 400.
- Los correos dependen del proveedor SMTP (Gmail), límite ~500/día por cuenta personal.
- El cálculo de anticipación usa la zona horaria de Bogotá (`America/Bogota`).
- Los recordatorios se envían cada 5 minutos (no exactamente al minuto cero).
- Las imágenes de espacios deben ser URLs externas (no hay storage propio aún).

## 8. Soporte y resolución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| "Solo se puede cancelar con al menos 2h de anticipación" | Pasaste el plazo configurable | El admin puede ajustar la regla o cancelar por ti |
| "Fecha bloqueada: festivo nacional" | El admin marcó el día como festivo | Escoge otra fecha |
| "El rol Estudiante no tiene permitido reservar este espacio" | El espacio está restringido a docentes/admin | Escoge otro espacio o pide acceso al admin |
| "Máximo 4 horas reservadas por día" | Acumulaste el tope diario | Cancela una existente o espera al día siguiente |
| El correo no llegó | Demora de Gmail / spam | Revisa carpeta SPAM; márcalo "no spam" para los siguientes |
| "Credenciales inválidas" | Contraseña incorrecta o cuenta desactivada | Recuperar contraseña o contactar admin |

## 9. Glosario

- **HU**: Historia de Usuario, requisito funcional numerado en la especificación
- **MS / Microservicio**: pieza de software independiente con su propia BD
- **Outbox**: tabla local que persiste eventos antes de enviarlos al broker, garantizando que no se pierdan
- **JWT**: JSON Web Token, formato de credencial que firma datos del usuario para que cualquier MS los valide
- **RabbitMQ**: cola de mensajes asíncrona — los MS se comunican publicando/consumiendo eventos
- **Soft-delete**: marcar como inactivo en lugar de borrar físicamente — preserva historial
- **Heatmap horario**: visualización de qué horas del día concentran más reservas
- **Auto-confirmación**: la reserva entra directamente como confirmada sin requerir aprobación admin
