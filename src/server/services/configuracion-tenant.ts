import { withTenant } from '@/lib/rls';
import { uploadLogo, presignLogoView } from '@/lib/storage/r2';
import type { ConfiguracionTenantInput } from '@/lib/validation/configuracion-tenant';

export async function obtenerConfiguracion(tenantId: string) {
  const tenant = await withTenant(tenantId, (tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantId } }));
  const logoPreviewUrl = tenant.logoUrl ? await presignLogoView(tenant.logoUrl) : null;
  return { ...tenant, logoPreviewUrl };
}

/** logoUrl guarda la key del objeto en R2, no una URL directa (el bucket es privado). */
export async function actualizarLogo(tenantId: string, file: File) {
  const key = await uploadLogo(tenantId, file);
  return withTenant(tenantId, (tx) => tx.tenant.update({ where: { id: tenantId }, data: { logoUrl: key } }));
}

export function actualizarConfiguracion(tenantId: string, data: ConfiguracionTenantInput) {
  return withTenant(tenantId, (tx) =>
    tx.tenant.update({
      where: { id: tenantId },
      data: {
        nombreComercial: data.nombreComercial,
        nit: data.nit || null,
        direccion: data.direccion || null,
        telefono: data.telefono || null,
        piePaginaFactura: data.piePaginaFactura || null,
        remitenteEmailFacturas: data.remitenteEmailFacturas || null,
        plantillaFacturaDefault: data.plantillaFacturaDefault,
        formatoFacturaDefault: data.formatoFacturaDefault,
        diasCustodiaGratis: data.diasCustodiaGratis,
        tarifaBodegajeDiaria: data.tarifaBodegajeDiaria,
        intervaloRecordatorioDias: data.intervaloRecordatorioDias,
        diasLimiteAbandono: data.diasLimiteAbandono,
        garantiaActiva: data.garantiaActiva,
        diasGarantiaDefault: data.diasGarantiaDefault,
        diasPurgaPin: data.diasPurgaPin,
        whatsappActivo: data.whatsappActivo,
        emailActivo: data.emailActivo,
      },
    }),
  );
}
