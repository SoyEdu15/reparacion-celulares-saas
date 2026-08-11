-- CreateEnum
CREATE TYPE "EstadoTenant" AS ENUM ('ACTIVO', 'MOROSO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('DUENO', 'TECNICO');

-- CreateEnum
CREATE TYPE "EstadoReparacion" AS ENUM ('RECIBIDO', 'ESPERANDO_TECNICO', 'DIAGNOSTICO', 'ESPERANDO_APROBACION_CLIENTE', 'REPARANDO', 'TESTEO', 'LISTO_PARA_ENTREGA', 'ENTREGADO', 'NO_REPARABLE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CanalAprobacion" AS ENUM ('LLAMADA', 'WHATSAPP', 'PRESENCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoPin" AS ENUM ('PIN', 'PATRON', 'CONTRASENA', 'OTRO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "PlantillaFactura" AS ENUM ('CLASICA', 'MODERNA', 'MINIMALISTA');

-- CreateEnum
CREATE TYPE "FormatoFactura" AS ENUM ('TERMICO_58MM', 'TERMICO_80MM', 'CARTA_A4');

-- CreateEnum
CREATE TYPE "EstadoPagoSuscripcion" AS ENUM ('PENDIENTE', 'PAGADO', 'FALLIDO', 'VENCIDO');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "estado" "EstadoTenant" NOT NULL DEFAULT 'ACTIVO',
    "subdominio" TEXT NOT NULL,
    "nombre_comercial" TEXT,
    "nit" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "logo_url" TEXT,
    "whatsapp_contacto_soporte" TEXT,
    "dias_custodia_gratis" INTEGER NOT NULL DEFAULT 15,
    "tarifa_bodegaje_diaria" INTEGER NOT NULL DEFAULT 0,
    "intervalo_recordatorio_dias" INTEGER NOT NULL DEFAULT 3,
    "dias_limite_abandono" INTEGER NOT NULL DEFAULT 90,
    "garantia_activa" BOOLEAN NOT NULL DEFAULT false,
    "dias_garantia_default" INTEGER NOT NULL DEFAULT 30,
    "whatsapp_activo" BOOLEAN NOT NULL DEFAULT false,
    "email_activo" BOOLEAN NOT NULL DEFAULT false,
    "dias_purga_pin" INTEGER,
    "plantilla_factura_default" "PlantillaFactura" NOT NULL DEFAULT 'CLASICA',
    "formato_factura_default" "FormatoFactura" NOT NULL DEFAULT 'TERMICO_80MM',
    "pie_pagina_factura" TEXT,
    "remitente_email_facturas" TEXT,
    "ultimo_numero_orden" INTEGER NOT NULL DEFAULT 0,
    "ultimo_numero_factura" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credenciales_tenant" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "whatsapp_credenciales_cifradas" TEXT,
    "email_credenciales_cifradas" TEXT,
    "pago_credenciales_cifradas" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credenciales_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs_admin" (
    "id" TEXT NOT NULL,
    "super_admin_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "cedula" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "color" TEXT,
    "imei" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_reparacion" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "garantia_activa" BOOLEAN NOT NULL DEFAULT true,
    "dias_garantia" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_reparacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reparaciones" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "tipo_reparacion_id" TEXT,
    "numero_orden" INTEGER NOT NULL,
    "estado" "EstadoReparacion" NOT NULL DEFAULT 'RECIBIDO',
    "danos_reportados" TEXT NOT NULL,
    "estado_fisico" TEXT,
    "fecha_recibido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recibido_por_id" TEXT NOT NULL,
    "tecnico_asignado_id" TEXT,
    "tecnico_asignado_en" TIMESTAMP(3),
    "diagnostico_texto" TEXT,
    "diagnosticado_por_id" TEXT,
    "diagnosticado_en" TIMESTAMP(3),
    "presupuesto_estimado" INTEGER,
    "presupuesto_estimado_aceptado" BOOLEAN NOT NULL DEFAULT false,
    "presupuesto_final" INTEGER,
    "presupuesto_aprobado_en" TIMESTAMP(3),
    "presupuesto_aprobado_por_id" TEXT,
    "canal_aprobacion" "CanalAprobacion",
    "fecha_estimada_entrega" TIMESTAMP(3),
    "dias_custodia_gratis_aplicado" INTEGER NOT NULL,
    "fecha_limite_custodia" TIMESTAMP(3),
    "reparado_por_id" TEXT,
    "fecha_entrega_real" TIMESTAMP(3),
    "dias_garantia" INTEGER,
    "fecha_fin_garantia" TIMESTAMP(3),
    "es_reclamo_garantia_de_id" TEXT,
    "marcado_abandonado" BOOLEAN NOT NULL DEFAULT false,
    "marcado_abandonado_en" TIMESTAMP(3),
    "consentimiento_datos_aceptado_en" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reparaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "estado_anterior" "EstadoReparacion",
    "estado_nuevo" "EstadoReparacion" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nota_corta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos_equipo" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "historial_estado_id" TEXT,
    "es_foto_ingreso" BOOLEAN NOT NULL DEFAULT false,
    "storage_key" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "subido_por_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pin_desbloqueo" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "tipo" "TipoPin" NOT NULL,
    "valor_cifrado" TEXT NOT NULL,
    "consentimiento_aceptado_en" TIMESTAMP(3) NOT NULL,
    "purgado_en" TIMESTAMP(3),
    "purgado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_desbloqueo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "numero_factura" INTEGER NOT NULL,
    "plantilla" "PlantillaFactura" NOT NULL,
    "formato" "FormatoFactura" NOT NULL,
    "subtotal_reparacion" INTEGER NOT NULL,
    "cargo_bodegaje" INTEGER NOT NULL DEFAULT 0,
    "dias_bodegaje_cobrados" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "storage_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_log" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "historial_estado_id" TEXT,
    "canal" "CanalNotificacion" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "estado" "EstadoMensaje" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "error_mensaje" TEXT,
    "enviado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_suscripcion" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "estado" "EstadoPagoSuscripcion" NOT NULL DEFAULT 'PENDIENTE',
    "periodo_inicio" TIMESTAMP(3) NOT NULL,
    "periodo_fin" TIMESTAMP(3) NOT NULL,
    "referencia_externa" TEXT,
    "pagado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdominio_key" ON "tenants"("subdominio");

-- CreateIndex
CREATE UNIQUE INDEX "credenciales_tenant_tenant_id_key" ON "credenciales_tenant"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "audit_logs_admin_super_admin_id_idx" ON "audit_logs_admin"("super_admin_id");

-- CreateIndex
CREATE INDEX "audit_logs_admin_tenant_id_idx" ON "audit_logs_admin"("tenant_id");

-- CreateIndex
CREATE INDEX "usuarios_tenant_id_idx" ON "usuarios"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenant_id_email_key" ON "usuarios"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "clientes_tenant_id_telefono_idx" ON "clientes"("tenant_id", "telefono");

-- CreateIndex
CREATE INDEX "clientes_tenant_id_cedula_idx" ON "clientes"("tenant_id", "cedula");

-- CreateIndex
CREATE INDEX "equipos_tenant_id_cliente_id_idx" ON "equipos"("tenant_id", "cliente_id");

-- CreateIndex
CREATE INDEX "equipos_tenant_id_imei_idx" ON "equipos"("tenant_id", "imei");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_reparacion_tenant_id_nombre_key" ON "tipos_reparacion"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "reparaciones_tenant_id_estado_idx" ON "reparaciones"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "reparaciones_tenant_id_fecha_recibido_idx" ON "reparaciones"("tenant_id", "fecha_recibido");

-- CreateIndex
CREATE INDEX "reparaciones_tenant_id_cliente_id_idx" ON "reparaciones"("tenant_id", "cliente_id");

-- CreateIndex
CREATE INDEX "reparaciones_tenant_id_equipo_id_idx" ON "reparaciones"("tenant_id", "equipo_id");

-- CreateIndex
CREATE INDEX "reparaciones_tenant_id_marcado_abandonado_idx" ON "reparaciones"("tenant_id", "marcado_abandonado");

-- CreateIndex
CREATE UNIQUE INDEX "reparaciones_tenant_id_numero_orden_key" ON "reparaciones"("tenant_id", "numero_orden");

-- CreateIndex
CREATE INDEX "historial_estados_tenant_id_reparacion_id_idx" ON "historial_estados"("tenant_id", "reparacion_id");

-- CreateIndex
CREATE INDEX "fotos_equipo_tenant_id_reparacion_id_idx" ON "fotos_equipo"("tenant_id", "reparacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "pin_desbloqueo_reparacion_id_key" ON "pin_desbloqueo"("reparacion_id");

-- CreateIndex
CREATE INDEX "pin_desbloqueo_tenant_id_reparacion_id_idx" ON "pin_desbloqueo"("tenant_id", "reparacion_id");

-- CreateIndex
CREATE INDEX "facturas_tenant_id_reparacion_id_idx" ON "facturas"("tenant_id", "reparacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "facturas_tenant_id_numero_factura_key" ON "facturas"("tenant_id", "numero_factura");

-- CreateIndex
CREATE INDEX "mensajes_log_tenant_id_reparacion_id_idx" ON "mensajes_log"("tenant_id", "reparacion_id");

-- CreateIndex
CREATE INDEX "mensajes_log_tenant_id_estado_idx" ON "mensajes_log"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "pagos_suscripcion_tenant_id_estado_idx" ON "pagos_suscripcion"("tenant_id", "estado");

-- AddForeignKey
ALTER TABLE "credenciales_tenant" ADD CONSTRAINT "credenciales_tenant_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs_admin" ADD CONSTRAINT "audit_logs_admin_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs_admin" ADD CONSTRAINT "audit_logs_admin_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_reparacion" ADD CONSTRAINT "tipos_reparacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_tipo_reparacion_id_fkey" FOREIGN KEY ("tipo_reparacion_id") REFERENCES "tipos_reparacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_recibido_por_id_fkey" FOREIGN KEY ("recibido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_tecnico_asignado_id_fkey" FOREIGN KEY ("tecnico_asignado_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_diagnosticado_por_id_fkey" FOREIGN KEY ("diagnosticado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_presupuesto_aprobado_por_id_fkey" FOREIGN KEY ("presupuesto_aprobado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_reparado_por_id_fkey" FOREIGN KEY ("reparado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparaciones" ADD CONSTRAINT "reparaciones_es_reclamo_garantia_de_id_fkey" FOREIGN KEY ("es_reclamo_garantia_de_id") REFERENCES "reparaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "reparaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_equipo" ADD CONSTRAINT "fotos_equipo_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "reparaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_equipo" ADD CONSTRAINT "fotos_equipo_historial_estado_id_fkey" FOREIGN KEY ("historial_estado_id") REFERENCES "historial_estados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos_equipo" ADD CONSTRAINT "fotos_equipo_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_desbloqueo" ADD CONSTRAINT "pin_desbloqueo_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "reparaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin_desbloqueo" ADD CONSTRAINT "pin_desbloqueo_purgado_por_id_fkey" FOREIGN KEY ("purgado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "reparaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_log" ADD CONSTRAINT "mensajes_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_log" ADD CONSTRAINT "mensajes_log_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "reparaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_log" ADD CONSTRAINT "mensajes_log_historial_estado_id_fkey" FOREIGN KEY ("historial_estado_id") REFERENCES "historial_estados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_suscripcion" ADD CONSTRAINT "pagos_suscripcion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
