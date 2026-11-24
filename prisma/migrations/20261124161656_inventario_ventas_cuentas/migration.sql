-- CreateEnum
CREATE TYPE "CategoriaProducto" AS ENUM ('ACCESORIO', 'REPUESTO');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('ACCESORIO', 'REPUESTO', 'REPARACION');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'OTRO');

-- CreateEnum
CREATE TYPE "CategoriaGasto" AS ENUM ('TRANSPORTE', 'INSUMOS', 'ARRIENDO', 'SERVICIOS', 'NOMINA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoCostoReparacion" AS ENUM ('REPUESTO', 'TRANSPORTE', 'INSUMOS', 'MANO_OBRA_EXTERNA', 'OTRO');

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaProducto" NOT NULL,
    "codigo" TEXT,
    "costo_promedio" INTEGER NOT NULL DEFAULT 0,
    "precio_venta" INTEGER NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas_inventario" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costo_unitario" INTEGER NOT NULL,
    "proveedor" TEXT,
    "nota" TEXT,
    "registrado_por_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entradas_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "metodo_pago" "MetodoPago" NOT NULL DEFAULT 'EFECTIVO',
    "cliente" TEXT,
    "nota" TEXT,
    "total" INTEGER NOT NULL,
    "costo_total" INTEGER NOT NULL,
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "anulada_en" TIMESTAMP(3),
    "registrado_por_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "venta_id" TEXT NOT NULL,
    "producto_id" TEXT,
    "tipo" "TipoVenta" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" INTEGER NOT NULL,
    "costo_unitario" INTEGER NOT NULL,

    CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "categoria" "CategoriaGasto" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "registrado_por_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costos_reparacion" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reparacion_id" TEXT NOT NULL,
    "tipo" "TipoCostoReparacion" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "producto_id" TEXT,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "monto" INTEGER NOT NULL,
    "registrado_por_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "costos_reparacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "productos_tenant_id_categoria_idx" ON "productos"("tenant_id", "categoria");

-- CreateIndex
CREATE INDEX "productos_tenant_id_nombre_idx" ON "productos"("tenant_id", "nombre");

-- CreateIndex
CREATE INDEX "entradas_inventario_tenant_id_fecha_idx" ON "entradas_inventario"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "entradas_inventario_tenant_id_producto_id_idx" ON "entradas_inventario"("tenant_id", "producto_id");

-- CreateIndex
CREATE INDEX "ventas_tenant_id_fecha_idx" ON "ventas"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "venta_items_tenant_id_venta_id_idx" ON "venta_items"("tenant_id", "venta_id");

-- CreateIndex
CREATE INDEX "gastos_tenant_id_fecha_idx" ON "gastos"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "costos_reparacion_tenant_id_reparacion_id_idx" ON "costos_reparacion"("tenant_id", "reparacion_id");

-- CreateIndex
CREATE INDEX "costos_reparacion_tenant_id_fecha_idx" ON "costos_reparacion"("tenant_id", "fecha");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_inventario" ADD CONSTRAINT "entradas_inventario_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_inventario" ADD CONSTRAINT "entradas_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas_inventario" ADD CONSTRAINT "entradas_inventario_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_reparacion" ADD CONSTRAINT "costos_reparacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_reparacion" ADD CONSTRAINT "costos_reparacion_reparacion_id_fkey" FOREIGN KEY ("reparacion_id") REFERENCES "reparaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_reparacion" ADD CONSTRAINT "costos_reparacion_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costos_reparacion" ADD CONSTRAINT "costos_reparacion_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- RLS para las tablas de inventario, ventas y cuentas — misma política
-- estándar que el resto de tablas de tenant (ver 20260811011500_rls_and_roles).
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
  productos, entradas_inventario, ventas, venta_items, gastos, costos_reparacion
  TO app_tenant, app_admin;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'productos', 'entradas_inventario', 'ventas', 'venta_items', 'gastos', 'costos_reparacion'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      $f$CREATE POLICY tenant_isolation ON %I
           USING (tenant_id = current_setting('app.tenant_id', true))
           WITH CHECK (tenant_id = current_setting('app.tenant_id', true))$f$,
      t
    );
  END LOOP;
END
$$;
