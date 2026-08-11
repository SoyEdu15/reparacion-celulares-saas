import type { FormatoFactura, PlantillaFactura } from '@prisma/client';

export function claseFormato(formato: FormatoFactura): string {
  switch (formato) {
    case 'TERMICO_58MM':
      return 'formato-termico-58mm';
    case 'TERMICO_80MM':
      return 'formato-termico-80mm';
    case 'CARTA_A4':
      return 'formato-carta';
    default:
      return 'formato-termico-80mm';
  }
}

export function clasePlantilla(plantilla: PlantillaFactura): string {
  switch (plantilla) {
    case 'MODERNA':
      return 'recibo--moderna';
    case 'MINIMALISTA':
      return 'recibo--minimalista';
    case 'CLASICA':
    default:
      return '';
  }
}

/** @page se inyecta inline por documento porque el formato es dinámico por request, no algo fijo del stylesheet. */
export function reglaPaginaImpresion(formato: FormatoFactura): string {
  switch (formato) {
    case 'TERMICO_58MM':
      return '@page { size: 58mm auto; margin: 2mm; }';
    case 'TERMICO_80MM':
      return '@page { size: 80mm auto; margin: 3mm; }';
    case 'CARTA_A4':
    default:
      return '@page { margin: 20mm; }';
  }
}

export const FORMATO_LABELS: Record<FormatoFactura, string> = {
  TERMICO_58MM: '58mm',
  TERMICO_80MM: '80mm',
  CARTA_A4: 'Carta/A4',
};

export function esFormatoValido(valor: string | undefined): valor is FormatoFactura {
  return valor === 'TERMICO_58MM' || valor === 'TERMICO_80MM' || valor === 'CARTA_A4';
}
