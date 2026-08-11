import { withTenant } from '@/lib/rls';
import type { ConfiguracionTenantInput } from '@/lib/validation/configuracion-tenant';

export function obtenerConfiguracion(tenantId: string) {
  return withTenant(tenantId, (tx) => tx.tenant.findUniqueOrThrow({ where: { id: tenantId } }));
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
        logoUrl: data.logoUrl || null,
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
