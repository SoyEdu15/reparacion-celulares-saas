-- CreateEnum
CREATE TYPE "TipoPagoReparacion" AS ENUM ('ABONO', 'SALDO', 'DEVOLUCION');

-- CreateTable
CREATE TABLE "pagos_reparacion" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "tipo" "TipoPagoReparacion" NOT NULL,
    "monto" INTEGER NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL,
    "nota" TEXT,
    "registrado_por_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_reparacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pagos_reparacion_tenant_id_reparacion_id_idx" ON "pagos_reparacion"("tenant_id", "reparacion_id");

-- CreateIndex
CREATE INDEX "pagos_reparacion_tenant_id_fecha_idx" ON "pagos_reparacion"("tenant_id", "fecha");

-- AddForeignKey
ALTER TABLE "pagos_reparacion" ADD CONSTRAINT "pagos_reparacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_reparacion" ADD CONSTRAINT "pagos_reparacion_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "reparaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_reparacion" ADD CONSTRAINT "pagos_reparacion_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Pasar los anticipos que ya existían a pagos, y registrar como "saldo" lo que
-- se cobró en las entregas ya hechas, para que la caja cuadre con la historia.
-- No se sabe cómo pagaron: quedan con método OTRO. Se recorre tenant por
-- tenant fijando app.tenant_id, así funciona aunque el usuario de la
-- migración no se salte el RLS de reparaciones/facturas.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tid text;
BEGIN
  FOR tid IN SELECT id FROM tenants LOOP
    PERFORM set_config('app.tenant_id', tid, true);

    INSERT INTO pagos_reparacion (id, tenant_id, reparacion_id, tipo, monto, metodo_pago, nota, registrado_por_id, fecha, created_at)
    SELECT gen_random_uuid()::text, r.tenant_id, r.id, 'ABONO', r.anticipo, 'OTRO',
           'Anticipo registrado antes de llevar los pagos', r.recibido_por_id, r.fecha_recibido, now()
    FROM reparaciones r
    WHERE r.tenant_id = tid AND r.anticipo > 0;

    INSERT INTO pagos_reparacion (id, tenant_id, reparacion_id, tipo, monto, metodo_pago, nota, registrado_por_id, fecha, created_at)
    SELECT gen_random_uuid()::text, f.tenant_id, f.reparacion_id, 'SALDO', f.total - f.anticipo, 'OTRO',
           'Cobro de la entrega registrado antes de llevar los pagos', r.recibido_por_id, f.created_at, now()
    FROM (
      SELECT DISTINCT ON (reparacion_id) * FROM facturas
      WHERE tenant_id = tid ORDER BY reparacion_id, created_at DESC
    ) f
    JOIN reparaciones r ON r.id = f.reparacion_id
    WHERE f.total - f.anticipo > 0;
  END LOOP;
  PERFORM set_config('app.tenant_id', '', true);
END
$$;

-- RLS: misma política estándar que el resto de tablas de tenant.
GRANT SELECT, INSERT, UPDATE, DELETE ON pagos_reparacion TO app_tenant, app_admin;
ALTER TABLE pagos_reparacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_reparacion FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pagos_reparacion
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
