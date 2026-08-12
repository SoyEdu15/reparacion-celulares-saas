-- AlterTable
ALTER TABLE "facturas" ADD COLUMN     "anticipo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reparaciones" ADD COLUMN     "anticipo" INTEGER NOT NULL DEFAULT 0;
