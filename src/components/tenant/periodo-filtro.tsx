import type { Periodo } from '@/lib/fechas-bogota';

const OPCIONES: { valor: Periodo; label: string }[] = [
  { valor: 'hoy', label: 'Hoy' },
  { valor: 'ayer', label: 'Ayer' },
  { valor: 'semana', label: 'Esta semana' },
  { valor: 'mes', label: 'Este mes' },
  { valor: 'mes-anterior', label: 'Mes anterior' },
];

/** Selector de período compartido por ventas, gastos y cuentas (GET, sin JS). */
export function PeriodoFiltro({
  base,
  periodo,
  desdeDia,
  hastaDia,
}: {
  base: string;
  periodo: Periodo;
  desdeDia: string;
  hastaDia: string;
}) {
  return (
    <div className="periodo-filtro">
      <div className="periodo-chips">
        {OPCIONES.map((o) => (
          <a key={o.valor} href={`${base}?periodo=${o.valor}`} className={periodo === o.valor ? 'activo' : ''}>
            {o.label}
          </a>
        ))}
      </div>
      <form method="get" action={base} className="periodo-rango">
        <input type="hidden" name="periodo" value="rango" />
        <label>
          Desde <input type="date" name="desde" defaultValue={desdeDia} required />
        </label>
        <label>
          Hasta <input type="date" name="hasta" defaultValue={hastaDia} required />
        </label>
        <button type="submit" className={`btn ${periodo === 'rango' ? 'btn-primary' : 'btn-secondary'}`}>
          Ver
        </button>
      </form>
    </div>
  );
}
