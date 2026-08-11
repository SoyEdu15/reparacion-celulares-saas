import { requireDueno } from '@/lib/auth/guards';

export default async function ReportesPage() {
  await requireDueno();

  return (
    <>
      <div className="page-header">
        <h1>Reportes</h1>
      </div>

      <div className="card">
        <h2>Exportar a CSV</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8, marginBottom: 16 }}>
          Se descargan con los datos actuales, listos para abrir en Excel o Google Sheets.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn-primary" href="/reportes/reparaciones">
            Reparaciones
          </a>
          <a className="btn btn-primary" href="/reportes/clientes">
            Clientes
          </a>
          <a className="btn btn-primary" href="/reportes/facturas">
            Facturas
          </a>
        </div>
      </div>
    </>
  );
}
