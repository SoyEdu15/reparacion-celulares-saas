# Reparación de Celulares — SaaS multi-tenant

> **Beta 1** — en desarrollo activo. La pasarela de pagos y la integración real de WhatsApp Business todavía no están conectadas (ver [Estado del proyecto](#estado-del-proyecto--roadmap)).

**Patrocinador oficial: E-TECH** — [@eduard.tech](https://www.instagram.com/eduard.tech) en Instagram y TikTok.

Plataforma SaaS para talleres de reparación de celulares en Colombia. Cada taller (*tenant*) tiene su propio subdominio, su propio equipo (dueño/técnicos) y sus propios clientes, con aislamiento real de datos a nivel de base de datos — no solo a nivel de código de aplicación.

## Índice

- [Características](#características)
- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Empezar en local](#empezar-en-local)
- [Scripts disponibles](#scripts-disponibles)
- [Seguridad](#seguridad)
- [Estado del proyecto / Roadmap](#estado-del-proyecto--roadmap)
- [Licencia](#licencia)

## Características

- **Multi-tenancy con aislamiento real**: Row-Level Security de PostgreSQL forzado a nivel de base de datos, no solo filtros en el código de la aplicación.
- **Login en dos pasos**: subdominio del taller (`taller.tuapp.com`) → credenciales de dueño o técnico. Panel de super-admin completamente separado en `admin.tuapp.com`, con su propia sesión y secreto.
- **Máquina de estados de reparación** completa y auditable: ingreso → diagnóstico → (aprobación del cliente si aplica) → reparación → testeo → entrega, con rutas alternas a "no reparable" / "cancelado" desde cualquier estado en curso.
- **Asignación de técnico flexible**: opcional desde el ingreso; si queda pendiente, el propio técnico se autoasigna al tomarla, o el dueño elige a quién asignarla.
- **Facturación**: logo del negocio, 3 plantillas visuales (clásica/moderna/minimalista) y 3 formatos de impresión (térmico 58mm/80mm, carta/A4), responsive en pantalla.
- **Envío automático de factura por correo** al entregar el equipo — HTML con logo embebido, no solo un texto genérico.
- **Notificaciones asíncronas** (WhatsApp/Email) por cola con reintentos — un fallo de envío nunca bloquea ni revierte un cambio de estado ya guardado.
- **PIN/patrón de desbloqueo cifrado** (AES-256-GCM), con purga manual y automática configurable.
- **Política de custodia y bodegaje** configurable por taller, con recordatorios automáticos y marcado de abandono.
- **Reportes exportables a CSV** (reparaciones, clientes, facturas), con BOM para que Excel no rompa los acentos.
- **Habeas Data**: consentimiento explícito de tratamiento de datos personales conforme a la Ley 1581 de 2012.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Actions, Turbopack) |
| Lenguaje | TypeScript (`strict`) |
| Base de datos | PostgreSQL 16 + [Prisma 6](https://www.prisma.io), con Row-Level Security a nivel de DB |
| Autenticación | [NextAuth v5](https://authjs.dev) — dos instancias independientes (tenant y admin) |
| Colas / jobs | [BullMQ](https://docs.bullmq.io) + Redis, worker como proceso independiente |
| Almacenamiento de objetos | S3-compatible (Cloudflare R2 en producción, MinIO en local) |
| Email | Nodemailer sobre SMTP (Maildev en local; cualquier proveedor transaccional en producción) |
| Validación | [Zod](https://zod.dev) |
| Contraseñas | Argon2 (`@node-rs/argon2`) |
| Cifrado | AES-256-GCM (PIN/patrón y credenciales de canal por tenant) |

## Arquitectura

### Multi-tenancy

Cada taller vive en su propio subdominio (`taller1.tuapp.com`). `src/proxy.ts` corre en el edge (sin acceso a base de datos ni Redis) y solo resuelve el subdominio a partir del header `Host`, reescribiendo la ruta hacia `/tenant/*` o `/admin/*`. El `tenant_id` **nunca se confía desde el cliente** — siempre se deriva de la sesión ya resuelta en el login.

El aislamiento real ocurre en la base de datos, no solo en el código:

- **`app_tenant`**: `FORCE ROW LEVEL SECURITY`. Cada query de negocio corre dentro de una transacción que fija `app.tenant_id` (`src/lib/rls.ts`) — una fila de otro tenant es invisible aunque haya un bug en el código de la aplicación.
- **`app_admin`**: `BYPASSRLS`. Solo lo usan el panel de super-admin y los jobs cross-tenant (recordatorios de custodia, etc.).

### Estados de una reparación

```
ESPERANDO_TECNICO → DIAGNOSTICO → [ESPERANDO_APROBACION_CLIENTE] → REPARANDO → TESTEO → LISTO_PARA_ENTREGA → ENTREGADO
                          ↓                    ↓                       ↓          ↓
                          └──────────────── NO_REPARABLE / CANCELADO ──┴──────────┘
                                    (desde cualquier estado en curso)
```

El diagnóstico nunca se salta, ni siquiera con presupuesto pre-aceptado en el ingreso: si el técnico confirma ese mismo presupuesto, pasa directo a reparación; si cotiza uno distinto (o no había uno previo), pasa a esperar aprobación del cliente.

### Notificaciones

Cada cambio de estado encola un job por canal activo del tenant (WhatsApp/Email) en la tabla `mensajes_log`. Un worker de BullMQ corriendo como **proceso separado** (`npm run worker`) los procesa con reintentos — nunca vive dentro del servidor de Next.js, porque el HMR del modo desarrollo duplicaría el procesamiento de jobs.

## Estructura del proyecto

```
prisma/
  schema.prisma          # Modelo de datos completo (multi-tenant, snake_case en DB)
  migrations/             # Incluye la migración de roles + políticas RLS
  seed.ts                 # Tenants y usuarios de prueba para desarrollo local

scripts/
  worker.ts               # Proceso del worker de BullMQ (notificaciones + custodia diaria)

src/
  proxy.ts                # Resolución de subdominio → tenant (edge, sin DB)
  app/
    tenant/                # App del taller (dueño/técnico)
      (app)/                # Rutas autenticadas: ingreso, reparaciones, clientes, reportes...
      login/
    admin/                 # Panel de super-admin (subdominio aparte)
  components/              # Componentes de UI por app (tenant/admin)
  lib/
    auth/                  # Las dos instancias de NextAuth + guards de sesión
    crypto/                # Cifrado de PIN/patrón
    facturas/               # Lógica de plantillas y formatos de impresión
    notifications/          # Proveedores (Email/WhatsApp) y plantillas de mensajes
    queues/                 # Definición de colas BullMQ
    storage/                 # Cliente S3-compatible (fotos, logos)
    validation/               # Esquemas Zod por dominio
    rls.ts                    # Helper obligatorio para toda query de negocio de un tenant
  server/
    services/                 # Lógica de negocio (una función por caso de uso)
```

## Empezar en local

### Requisitos

- Node.js ≥ 20
- Docker Desktop (Postgres, Redis, MinIO y Maildev corren como contenedores)

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# completa los valores marcados como "CAMBIAR" (para local, cualquier valor sirve;
# ver los comentarios de cada bloque en .env.example)

# 3. Servicios de fondo
docker compose up -d

# 4. Base de datos
npx prisma migrate deploy
npx prisma generate
npm run db:seed

# 5. Arrancar la app (un terminal)
npm run dev

# 6. Arrancar el worker de notificaciones (otro terminal aparte, obligatorio para que
#    WhatsApp/Email realmente se procesen — si no corre, los mensajes se quedan encolados)
npm run worker
```

Con eso arriba:

| Servicio | URL |
|---|---|
| App de un taller de prueba | http://tallerdemo1.localhost:3000 (dueño y técnico: `password123`) |
| Panel super-admin | http://admin.localhost:3000 (`admin@plataforma.test` / `password123`) |
| Correos de prueba (Maildev) | http://localhost:1080 |
| Consola de archivos (MinIO) | http://localhost:9001 |

> El puerto de Postgres en Docker es **5433**, no el 5432 por defecto — evita chocar con una instalación nativa de Postgres en la máquina.

## Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de Next.js en modo desarrollo (Turbopack) |
| `npm run build` / `npm run start` | Build y arranque en modo producción |
| `npm run worker` | Worker de BullMQ (notificaciones + job diario de custodia) — proceso aparte, obligatorio |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run prisma:generate` | Regenera el cliente de Prisma |
| `npm run prisma:migrate` | Nueva migración en desarrollo |
| `npm run prisma:deploy` | Aplica migraciones pendientes (producción) |
| `npm run prisma:studio` | Explorador de datos de Prisma |
| `npm run db:seed` | Carga tenants y usuarios de prueba |
| `npm run db:verify-isolation` | Prueba automatizada de que el aislamiento entre tenants (RLS) funciona de verdad |

## Seguridad

- **Aislamiento multi-tenant a nivel de base de datos** (RLS forzado), no solo en la capa de aplicación — ver [Arquitectura](#arquitectura).
- **PIN/patrón de desbloqueo cifrado** (AES-256-GCM) con clave independiente del resto de secretos; purga manual y automática.
- **Contraseñas** con Argon2, nunca en texto plano.
- **URLs firmadas de corta duración** para fotos y logos — el bucket de almacenamiento nunca es público.
- **Sesión de tenant nunca confía en datos del cliente**: el `tenant_id` siempre se deriva del subdominio ya resuelto en el login, nunca de un valor enviado en el request.
- Las variables de entorno reales (`.env`) nunca se commitean — ver `.gitignore`. `.env.example` solo tiene placeholders.

Si encuentras una vulnerabilidad, por favor repórtala de forma privada en vez de abrir un issue público.

## Estado del proyecto / Roadmap

Este proyecto está en **beta**. Ya funciona de punta a punta en local (multi-tenancy, flujo completo de reparación, facturación, notificaciones, panel de super-admin), pero todavía faltan piezas para producción:

- [ ] Integración real de pasarela de pagos (suscripción de los talleres a la plataforma)
- [ ] Credenciales reales de WhatsApp Business API (hoy corre con un stub que deja todo el pipeline listo)
- [ ] Envío de correo con credenciales propias por tenant (hoy sale desde un remitente compartido de la plataforma)
- [ ] Despliegue a un dominio real con proveedor de email transaccional verificado

## Patrocinador oficial

**E-TECH** — síguenos en Instagram y TikTok: [@eduard.tech](https://www.instagram.com/eduard.tech)

## Licencia

Todos los derechos reservados. El código de este repositorio se publica para fines de consulta/portafolio — no se otorga ninguna licencia de uso, copia, modificación o distribución sin autorización expresa.
