-- ============================================================================
-- Roles de aplicación + Row-Level Security (RLS)
--
-- app_tenant: usado por la app Next.js en runtime para TODAS las queries de
--   negocio de un tenant ya autenticado. RLS forzado (FORCE ROW LEVEL
--   SECURITY): ni siquiera el dueño de las tablas (app_owner) se salta las
--   políticas con este rol. Cada conexión debe ejecutar
--   `SET LOCAL app.tenant_id = '<uuid>'` al inicio de la transacción (ver
--   lib/rls.ts) antes de correr cualquier query. Sin esa variable seteada,
--   current_setting(...) devuelve NULL y las políticas bloquean todo por
--   defecto (fail-closed).
--
-- app_admin: usado SOLO por el panel de super-admin, los jobs cross-tenant
--   (recordatorios de custodia, purga de PIN) y la resolución de subdominio
--   del Paso 1 del login (que por definición corre ANTES de tener un
--   tenant_id resuelto, así que no puede pasar por app_tenant). Tiene
--   BYPASSRLS. Nunca se expone a queries que reciban tenant_id desde el
--   cliente/frontend.
--
-- Contraseñas: las de abajo son SOLO para desarrollo local (coinciden con
-- .env.local, que nunca se sube a git). Antes de aplicar esta migración en
-- staging/producción, rotarlas con ALTER ROLE ... WITH PASSWORD usando un
-- secreto real generado para ese entorno.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_tenant') THEN
    CREATE ROLE app_tenant WITH LOGIN PASSWORD 'app_tenant_local_pw';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin WITH LOGIN PASSWORD 'app_admin_local_pw' BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_tenant, app_admin;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_tenant, app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_tenant, app_admin;

-- Para que las tablas/secuencias creadas por futuras migraciones hereden
-- los mismos privilegios automáticamente.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_tenant, app_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_tenant, app_admin;

-- super_admins y audit_logs_admin no son tablas de tenant: app_tenant no
-- tiene ningún negocio ahí, ni siquiera filtrado por RLS. Se revoca por
-- completo (defensa en profundidad, además del control a nivel de app).
REVOKE ALL ON super_admins, audit_logs_admin FROM app_tenant;

-- ----------------------------------------------------------------------------
-- RLS: tablas con columna tenant_id — política estándar
-- ----------------------------------------------------------------------------
-- FORCE ROW LEVEL SECURITY además de ENABLE: sin FORCE, el dueño de la tabla
-- seguiría viendo todas las filas sin restricción. WITH CHECK además de
-- USING: evita que una fila se inserte o se reasigne a otro tenant_id.

DO $$
DECLARE
  t text;
  tenant_id_tables text[] := ARRAY[
    'credenciales_tenant', 'usuarios', 'clientes', 'equipos',
    'tipos_reparacion', 'reparaciones', 'historial_estados', 'fotos_equipo',
    'pin_desbloqueo', 'facturas', 'mensajes_log', 'pagos_suscripcion'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_id_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    -- Comparación como texto: id/tenant_id se guardan como text (uuid()
    -- generado por Prisma en la app, no un tipo nativo uuid de Postgres).
    EXECUTE format(
      $f$CREATE POLICY tenant_isolation ON %I
           USING (tenant_id = current_setting('app.tenant_id', true))
           WITH CHECK (tenant_id = current_setting('app.tenant_id', true))$f$,
      t
    );
  END LOOP;
END
$$;

-- ----------------------------------------------------------------------------
-- RLS: tabla tenants — caso especial
-- ----------------------------------------------------------------------------
-- tenants no tiene columna tenant_id (la fila ES el tenant), así que su
-- propia id hace las veces de tenant_id. Bajo app_tenant, una sesión solo
-- puede ver/editar su propia fila — nunca la lista completa de talleres.
--
-- La resolución de subdominio del Paso 1 del login (que necesita mirar
-- CUALQUIER tenant por su subdominio antes de saber cuál es "el suyo")
-- corre por diseño con app_admin (BYPASSRLS), no con app_tenant — ver nota
-- de arquitectura al inicio de este archivo.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.tenant_id', true))
  WITH CHECK (id = current_setting('app.tenant_id', true));
