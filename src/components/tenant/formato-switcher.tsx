import type { FormatoFactura } from '@prisma/client';
import { FORMATO_LABELS } from '@/lib/facturas/formato';

const FORMATOS: FormatoFactura[] = ['TERMICO_58MM', 'TERMICO_80MM', 'CARTA_A4'];

export function FormatoSwitcher({ basePath, formatoActivo }: { basePath: string; formatoActivo: FormatoFactura }) {
  return (
    <div className="formato-switcher">
      {FORMATOS.map((f) => (
        <a key={f} href={`${basePath}?formato=${f}`} className={f === formatoActivo ? 'activo' : ''}>
          {FORMATO_LABELS[f]}
        </a>
      ))}
    </div>
  );
}
