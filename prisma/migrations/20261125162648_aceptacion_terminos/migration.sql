-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "terminos_aceptados_en" TIMESTAMP(3),
ADD COLUMN     "terminos_aceptados_ip" TEXT,
ADD COLUMN     "terminos_aceptados_por_id" TEXT,
ADD COLUMN     "terminos_version_aceptada" TEXT;
