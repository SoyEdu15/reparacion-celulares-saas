# Documentación técnica

Complementa el [README](../README.md), que cubre el stack, la arquitectura general y cómo arrancar en local. Aquí está lo necesario para **operar la plataforma en producción**: el modelo de datos, los módulos, la seguridad, el despliegue, los respaldos y la solución de problemas.

## Contenido

1. [Vista general](#1-vista-general)
2. [Modelo de datos](#2-modelo-de-datos)
3. [Mapa del código por módulo](#3-mapa-del-código-por-módulo)
4. [Reglas de negocio importantes](#4-reglas-de-negocio-importantes)
5. [Seguridad](#5-seguridad)
6. [Documentos legales dentro de la app](#6-documentos-legales-dentro-de-la-app)
7. [Despliegue a producción](#7-despliegue-a-producción)
8. [Operación diaria](#8-operación-diaria)
9. [Respaldos y recuperación](#9-respaldos-y-recuperación)
10. [Versiones y releases](#10-versiones-y-releases)
11. [Solución de problemas](#11-solución-de-problemas)

## 1. Vista general

```
navegador ──► taller.dominio.com ─┐
              admin.dominio.com ──┼─► Next.js 16 (src/proxy.ts reescribe a /tenant/* o /admin/*)
              dominio.com ────────┘        │
                                           ├─► PostgreSQL 16 (RLS forzado por taller)
                                           ├─► Redis ─► worker BullMQ (proceso aparte)
                                           │              ├─► SMTP (correos)
                                           │              └─► WhatsApp Business (stub hoy)
                                           └─► Almacenamiento S3 (R2 / MinIO): fotos y logos privados
```

Hay tres procesos:

1. **App Next.js** (`npm run start`): interfaz y Server Actions.
2. **Worker** (`npm run worker`): notificaciones y el job diario de custodia. **Debe correr siempre**, o los mensajes se quedan en cola.
3. **PostgreSQL + Redis + almacenamiento**: servicios administrados en producción, o Docker en local.

## 2. Modelo de datos

Todas las tablas de negocio tienen `tenant_id` y una política RLS `tenant_isolation`. Los nombres en la base de datos están en snake_case (`@@map`). Los montos son **enteros en pesos (COP)**, sin decimales.

| Área | Tablas | Notas |
|---|---|---|
| Plataforma | `tenants`, `super_admins`, `audit_logs_admin`, `credenciales_tenant`, `pagos_suscripcion` | `tenants` guarda la configuración y la aceptación de los documentos legales (`terminos_*`) |
| Usuarios | `usuarios` | Rol `DUENO` o `TECNICO`; contraseña con Argon2 |
| Reparaciones | `clientes`, `equipos`, `reparaciones`, `historial_estados`, `fotos_equipo`, `pin_desbloqueo`, `facturas`, `mensajes_log` | `reparaciones.anticipo` = suma de los abonos (lo usan el recibo y la factura) |
| Pagos de reparación | `pagos_reparacion` | `ABONO`, `SALDO` (al entregar) y `DEVOLUCION`. Base de la caja del día |
| Inventario | `productos`, `entradas_inventario` | `costo_promedio` ponderado, recalculado con cada entrada |
| Ventas | `ventas`, `venta_items` | Cada ítem guarda una copia del costo al momento de vender |
| Cuentas | `gastos`, `costos_reparacion` | Los costos de reparación se reconocen el día de la entrega |

Las migraciones están en `prisma/migrations`. Las que crean tablas nuevas incluyen al final los `GRANT` y la política RLS. **Toda tabla nueva de negocio debe incluirlos**, o no será visible para `app_tenant`, o peor, será visible sin aislamiento.

## 3. Mapa del código por módulo

| Módulo | Páginas (`src/app/tenant/(app)/…`) | Lógica (`src/server/services/…`) |
|---|---|---|
| Ingreso y reparaciones | `ingreso`, `reparaciones/[id]` | `reparaciones.ts`, `reparacion-estados.ts` |
| Pagos del cliente | Tarjeta en `reparaciones/[id]` | `pagos-reparacion.ts` |
| Costos por reparación | Tarjeta en `reparaciones/[id]` | `gastos.ts` (`agregarCostoReparacion`) |
| Ventas | `ventas` | `ventas.ts` |
| Inventario | `inventario`, `inventario/[id]` | `inventario.ts` |
| Gastos | `gastos` | `gastos.ts` |
| Cuentas | `cuentas` | `cuentas.ts` |
| Configuración | `configuracion` | `configuracion-tenant.ts` |
| Super-admin | `src/app/admin/(app)/tenants` | `admin-tenants.ts` |
| Documentos legales | `src/app/legal/[doc]`, `src/app/tenant/legal/[doc]`, `src/app/tenant/aceptar-terminos` | `src/lib/legal.ts` |

Convenciones:

- Toda consulta de negocio pasa por `withTenant(tenantId, fn)` (`src/lib/rls.ts`). `dbAdmin` (BYPASSRLS) solo se usa en el panel de admin, en los jobs y para resolver el subdominio.
- Cada Server Action valida con Zod (`src/lib/validation/*`) y verifica el rol con `requireSession()` o `requireDueno()`. **Nunca** confía en un `tenantId` que venga del formulario.
- Las operaciones que tocan stock bloquean la fila con `SELECT … FOR UPDATE`.
- Las fechas de los reportes se cortan en hora de Colombia (`src/lib/fechas-bogota.ts`).

## 4. Reglas de negocio importantes

- **Máquina de estados**: `TRANSICIONES_VALIDAS` en `reparacion-estados.ts`. La entrega (`entregarReparacion`) es aparte, porque genera la factura, el cobro del saldo y la garantía.
- **Ingreso de una reparación**: se reconoce completo el día de la factura. Sus costos, ese mismo día.
- **Caja**: ventas de mostrador + `pagos_reparacion`, restando las devoluciones.
- **Cierre sin reparar con abono no devuelto**: lo retenido cuenta como ingreso del día del cierre.
- **Inventario**: las compras no son gasto; el costo pasa a ser costo de lo vendido al vender. Un ajuste por faltante genera un gasto.
- **Numeración**: `ultimo_numero_orden` y `ultimo_numero_factura` por taller, incrementados dentro de la misma transacción.

## 5. Seguridad

- **Aislamiento**: RLS forzado (`FORCE ROW LEVEL SECURITY`) con `app.tenant_id` fijado por transacción. Se verifica con `npm run db:verify-isolation`.
- **Tres roles de base de datos**:
  - `app_owner` para las migraciones;
  - `app_tenant` para la app, con RLS;
  - `app_admin` para el panel y los jobs, con BYPASSRLS.
- **Sesiones**: dos instancias de Auth.js con secretos y cookies distintos (`tenant-session-token` y `admin-session-token`).
- **Cifrado**: PIN/patrón y credenciales de canales con AES-256-GCM, cada uno con su propia llave (`PIN_ENCRYPTION_KEY` y `CREDENTIALS_ENCRYPTION_KEY`). **Si se pierde una llave, lo cifrado con ella es irrecuperable**: guárdalas en un gestor de secretos.
- **Archivos**: buckets privados y URLs firmadas de corta duración.
- **Auditoría**: las acciones del super-admin quedan en `audit_logs_admin`.
- **Documentos legales**: el renderizador escapa todo el HTML antes de dar formato, así que los datos de un taller no pueden inyectar código en su página pública.

### Si hay un incidente de seguridad

1. Contener: rotar el secreto o la llave comprometidos y suspender el taller afectado si hace falta.
2. Determinar qué talleres y qué datos se afectaron (`audit_logs_admin` y logs del hosting).
3. Avisar a esos talleres dentro de **72 horas**; así lo promete el Acuerdo de Tratamiento de Datos.
4. Reportar a la SIC en su portal dentro de los 15 días hábiles siguientes.

## 6. Documentos legales dentro de la app

- La fuente son los archivos `docs/legal/*.md`. `src/lib/legal.ts` los lee en tiempo de ejecución, llena las variables `{{…}}` y los convierte a HTML.
- Las rutas públicas son `/legal/terminos`, `/privacidad`, `/tratamiento-datos`, `/sla` y `/cookies`, tanto en el dominio raíz como en el de cada taller. `/legal/politica-datos` existe solo en el subdominio de un taller y usa sus datos de Configuración.
- **Aceptación**: `src/app/tenant/(app)/layout.tsx` manda al dueño a `/aceptar-terminos` mientras `tenants.terminos_version_aceptada` sea distinta de `LEGAL_VERSION`. Al aceptar se guardan la versión, la fecha, el usuario y la IP. El panel de super-admin muestra ese estado en la ficha de cada taller.
- Para publicar un cambio sustancial, sube `LEGAL_VERSION` y `LEGAL_FECHA`. Detalles en [docs/legal/README.md](legal/README.md).

## 7. Despliegue a producción

### Requisitos

- Un dominio propio con **DNS comodín** (`*.dominio.com`) apuntando a la app, y un certificado TLS que cubra el comodín.
- PostgreSQL 16 administrado, con respaldos automáticos.
- Redis administrado.
- Un bucket S3-compatible privado (Cloudflare R2).
- Un proveedor de correo transaccional con el dominio verificado (SPF, DKIM y DMARC).
- Un lugar para correr **dos procesos Node 20+**: la app y el worker.

### Pasos

1. **Base de datos**: crea la base y el usuario `app_owner`. La migración de RLS crea los roles `app_tenant` y `app_admin`; después define sus contraseñas con `ALTER ROLE … PASSWORD`.
2. **Variables de entorno**: copia `.env.example`.
   - Usa valores reales y secretos largos y aleatorios (`openssl rand -base64 32` para los secretos y las llaves de 32 bytes).
   - Define `PLATFORM_ROOT_DOMAIN` con tu dominio.
   - Completa las variables `PLATFORM_LEGAL_*` y `LEGAL_*`.
3. **Migraciones**: `npm ci`, luego `npm run prisma:deploy` y `npm run prisma:generate`.
4. **Build**: `npm run build`.
5. **Arranque**: `npm run start` para la app y el worker como un segundo proceso.

   > El script `worker` usa `tsx watch`, pensado para desarrollo. En producción, córrelo sin `watch` (`npx tsx scripts/worker.ts`) bajo un supervisor que lo reinicie si se cae.
6. **Super-admin**: hoy la única forma de crear la cuenta es `prisma/seed.ts`, que también crea talleres de prueba. En producción, adapta el seed para que solo cree el super-admin con tu correo y una contraseña fuerte, córrelo una vez y entra en `admin.dominio.com`.
7. **Prueba de humo**:
   - crear un taller de prueba;
   - aceptar los términos;
   - hacer un ingreso con fotos;
   - recorrer los estados hasta la entrega;
   - verificar que llegue el correo;
   - correr `npm run db:verify-isolation` contra producción con un usuario de prueba.

### Al actualizar a una versión nueva

1. `git pull`
2. `npm ci`
3. `npm run prisma:deploy`
4. `npm run build`
5. Reiniciar **los dos procesos**.

Las notas de cada release dicen si trae migraciones de datos.

## 8. Operación diaria

- **Crear un taller**: en el panel de admin, con subdominio, nombre, WhatsApp de soporte y la cuenta del dueño. El dueño acepta los documentos legales en su primer ingreso.
- **Mora y suspensión**: en la ficha del taller, el botón "Moroso" o "Suspendido" bloquea el acceso sin borrar datos, y "Activar" lo restablece.
- **Contraseñas**: el super-admin genera una contraseña temporal para el dueño desde la ficha del taller.
- **Terminación de un taller**:
  1. exporta sus datos si los pide (CSV desde Reportes, o un volcado filtrado por `tenant_id`);
  2. 30 días después de terminado, bórralo;
  3. el borrado en cascada desde `tenants` elimina sus datos;
  4. borra también sus archivos del bucket, guardados bajo el prefijo de su `tenant_id`.
- **Supervisar**: que el worker esté vivo, los mensajes `FALLIDO` en `mensajes_log` y el espacio del bucket.

## 9. Respaldos y recuperación

El SLA promete un respaldo diario, siete días de retención, recuperar el servicio en 24 horas y perder como máximo 24 horas de información.

- **Base de datos**: activa los respaldos automáticos diarios del proveedor, o programa `pg_dump -Fc` diario hacia otro almacenamiento.
- **Archivos**: el bucket de R2 ya es redundante. Si quieres protegerte de borrados accidentales, replícalo a otro bucket.
- **Llaves de cifrado**: guárdalas aparte de los respaldos. Un respaldo sin su llave no sirve para recuperar los PIN.
- **Prueba de restauración**: restaura un respaldo en una base de prueba al menos una vez por trimestre, y anota cuánto tardó.

## 10. Versiones y releases

- La versión está en `package.json` (`0.1.0-beta.N`) y cada conjunto de cambios publica un release en GitHub ("Beta 1.0N") con su tag.
- Los commits se hacen con la identidad del titular del proyecto.
- Antes de publicar, revisa que no se suban secretos: `.env` está ignorado y `.env.example` solo lleva valores de ejemplo.

## 11. Solución de problemas

| Síntoma | Causa | Solución |
|---|---|---|
| "Can't reach database server at localhost:5433" en local | Docker Desktop se cayó | Reiniciar Docker y luego `docker compose up -d` |
| Docker Desktop no arranca en Windows ("El sistema no tiene acceso al archivo") | Archivos de socket viejos que Docker no puede borrar | Cerrar Docker y borrarlos desde WSL: `wsl -d Ubuntu -- rm -f /mnt/c/Users/<usuario>/AppData/Local/Docker/run/dockerInference /mnt/c/Users/<usuario>/AppData/Local/docker-secrets-engine/engine.sock` (y los demás `.sock` de esa carpeta). Luego abrir Docker de nuevo |
| `EPERM … query_engine-windows.dll.node` al migrar | `next dev` tiene bloqueado el cliente de Prisma | Detener `next dev`, correr `npx prisma generate` y volver a arrancar |
| "Jest worker encountered 2 child process exceptions" en desarrollo | El servidor de desarrollo lleva muchas horas corriendo | Reiniciar `npm run dev` |
| Los clientes no reciben correos o WhatsApp | El worker no está corriendo, o el SMTP está mal configurado | Revisar el proceso del worker y `mensajes_log.error_mensaje` |
| Un taller nuevo no carga ("Taller no encontrado") | El subdominio no coincide, o falta el DNS comodín | Revisar `tenants.subdominio` y el DNS |
| Los documentos legales muestran "PENDIENTE" | Faltan variables `PLATFORM_LEGAL_*` | Completarlas y reiniciar la app |
| El dueño queda en un bucle en "Antes de empezar" | La aceptación no se guardó | Revisar los logs de `aceptarTerminosAction` y los permisos de `app_tenant` sobre `tenants` |
