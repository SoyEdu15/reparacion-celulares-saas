import { auth } from '@/lib/auth/tenant-auth';
import { obtenerMetricas } from '@/server/services/metricas';
import { ESTADO_LABELS, badgeClassParaEstado } from '@/lib/estados-reparacion';

function formatoCOP(valor: number): string {
  return valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatoFecha(fecha: Date): string {
  return new Date(fecha).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const metricas = await obtenerMetricas(session.user.tenantId);

  return (
    <>
      <div className="page-header">
        <h1>Bienvenido, {session.user.name}</h1>
      </div>

      <div className="form-grid" style={{ marginBottom: 20 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>Ingresos este mes</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{formatoCOP(metricas.ingresosMes)}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '4px 0 0' }}>
            {metricas.facturasMesCount} factura(s)
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>Tiempo promedio de reparación</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            {metricas.tiempoPromedioDias != null ? `${metricas.tiempoPromedioDias.toFixed(1)} días` : '—'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '4px 0 0' }}>
            Desde el ingreso hasta la entrega
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>Clientes</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{metricas.totalClientes}</p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <h2>Reparaciones totales</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{metricas.totalReparaciones}</p>
          {metricas.abandonadas > 0 ? (
            <p style={{ color: 'var(--danger)', fontSize: '0.75rem', margin: '4px 0 0' }}>
              {metricas.abandonadas} marcada(s) como abandonada(s)
            </p>
          ) : null}
        </div>
      </div>

      {metricas.garantiasPorVencer.length > 0 ? (
        <div className="card" style={{ borderColor: 'var(--warning-border)' }}>
          <h2>Garantías por vencer (próximos 7 días)</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Cliente</th>
                <th>Equipo</th>
                <th>Vence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {metricas.garantiasPorVencer.map((g) => (
                <tr key={g.id}>
                  <td>#{g.numeroOrden}</td>
                  <td>{g.clienteNombre}</td>
                  <td>{g.equipo}</td>
                  <td>{formatoFecha(g.fechaFinGarantia)}</td>
                  <td>
                    <a className="btn btn-secondary" href={`/reparaciones/${g.id}`}>
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="card">
        <h2>Órdenes por estado</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {metricas.porEstado.map(({ estado, cantidad }) => (
              <tr key={estado}>
                <td>
                  <span className={`badge ${badgeClassParaEstado(estado)}`}>{ESTADO_LABELS[estado] ?? estado}</span>
                </td>
                <td>{cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
