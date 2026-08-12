import { requireSession } from '@/lib/auth/guards';
import { buscarClientes, obtenerCliente } from '@/server/services/clientes';
import { listarUsuarios } from '@/server/services/usuarios';
import { withTenant } from '@/lib/rls';
import { crearReparacionAction } from './actions';

export default async function IngresoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; clienteId?: string; error?: string }>;
}) {
  const session = await requireSession();
  const { q, clienteId, error } = await searchParams;

  const [tenant, resultados, clienteSeleccionado, usuarios] = await Promise.all([
    withTenant(session.user.tenantId, (tx) =>
      tx.tenant.findUniqueOrThrow({ where: { id: session.user.tenantId }, select: { diasCustodiaGratis: true, tarifaBodegajeDiaria: true } }),
    ),
    q ? buscarClientes(session.user.tenantId, q) : Promise.resolve([]),
    clienteId ? obtenerCliente(session.user.tenantId, clienteId) : Promise.resolve(null),
    listarUsuarios(session.user.tenantId),
  ]);
  const tecnicos = usuarios.filter((u) => u.rol === 'TECNICO' && u.activo);

  return (
    <>
      <div className="page-header">
        <h1>Nuevo ingreso de equipo</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      {!clienteSeleccionado ? (
        <>
          <div className="card">
            <h2>1. Cliente — buscar por teléfono o cédula</h2>
            <form className="form-grid" method="GET">
              <label className="form-field">
                Buscar
                <input name="q" defaultValue={q ?? ''} placeholder="Teléfono, cédula o nombre" />
              </label>
              <button type="submit" className="btn btn-secondary">
                Buscar
              </button>
            </form>
            {q ? (
              resultados.length === 0 ? (
                <p className="empty-state">Sin resultados para &quot;{q}&quot;. Puedes registrar un cliente nuevo abajo.</p>
              ) : (
                <table className="data-table" style={{ marginTop: 16 }}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Cédula</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nombre}</td>
                        <td>{c.telefono}</td>
                        <td>{c.cedula ?? '—'}</td>
                        <td>
                          <a className="btn btn-primary" href={`/ingreso?clienteId=${c.id}`}>
                            Usar este cliente
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : null}
          </div>

          <div className="card">
            <h2>O registrar cliente nuevo</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
              Se crea junto con el resto del ingreso — no hace falta un paso aparte.
            </p>
          </div>
        </>
      ) : (
        <div className="card">
          <h2>1. Cliente</h2>
          <p>
            <strong>{clienteSeleccionado.nombre}</strong> — {clienteSeleccionado.telefono}
          </p>
          <a href="/ingreso" className="btn btn-secondary">
            Cambiar cliente
          </a>
        </div>
      )}

      <form action={crearReparacionAction} className="card">
        {clienteSeleccionado ? (
          <input type="hidden" name="clienteId" value={clienteSeleccionado.id} />
        ) : (
          <>
            <h2>Datos del cliente nuevo</h2>
            <div className="form-grid" style={{ marginBottom: 20 }}>
              <label className="form-field">
                Nombre
                <input name="clienteNombre" maxLength={160} />
              </label>
              <label className="form-field">
                Teléfono
                <div className="input-prefijo">
                  <span className="input-prefijo-tag">+57</span>
                  <input name="clienteTelefono" inputMode="numeric" maxLength={10} placeholder="3001234567" />
                </div>
              </label>
              <label className="form-field">
                Cédula (opcional)
                <input name="clienteCedula" />
              </label>
              <label className="form-field">
                Email (opcional)
                <input name="clienteEmail" type="email" />
              </label>
            </div>
          </>
        )}

        <h2>2. Equipo</h2>
        {clienteSeleccionado && clienteSeleccionado.equipos.length > 0 ? (
          <div className="form-field" style={{ marginBottom: 12 }}>
            Equipo existente de este cliente (opcional)
            <select name="equipoId">
              <option value="">— Registrar equipo nuevo —</option>
              {clienteSeleccionado.equipos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.marca} {e.modelo} {e.imei ? `(${e.imei})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <label className="form-field">
            Marca
            <input name="equipoMarca" />
          </label>
          <label className="form-field">
            Modelo
            <input name="equipoModelo" />
          </label>
          <label className="form-field">
            Color
            <input name="equipoColor" />
          </label>
          <label className="form-field">
            IMEI/Serial
            <input name="equipoImei" />
          </label>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -12 }}>
          Si eliges un equipo existente arriba, deja marca/modelo en blanco.
        </p>

        <h2 style={{ marginTop: 20 }}>3. Estado del equipo</h2>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <label className="form-field" style={{ gridColumn: '1 / -1' }}>
            Daño o falla reportada por el cliente
            <textarea name="danosReportados" rows={3} required />
          </label>
          <label className="form-field" style={{ gridColumn: '1 / -1' }}>
            Estado físico (rayones, golpes, pantalla rota, etc.)
            <textarea name="estadoFisico" rows={2} />
          </label>
        </div>

        {tecnicos.length > 0 ? (
          <>
            <h2>4. Técnico (opcional)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
              Si dejas esto vacío, el equipo queda en la cola de espera y cualquier técnico puede tomarlo o el dueño
              asignarlo después.
            </p>
            <div className="form-grid" style={{ marginBottom: 20 }}>
              <label className="form-field">
                Asignar directamente a
                <select name="tecnicoAsignadoId" defaultValue="">
                  <option value="">— Dejar en cola —</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}

        <h2>5. Fotos del equipo (4 obligatorias)</h2>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <label className="form-field">
            Foto 1
            <input type="file" name="fotos" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <label className="form-field">
            Foto 2
            <input type="file" name="fotos" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <label className="form-field">
            Foto 3
            <input type="file" name="fotos" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <label className="form-field">
            Foto 4
            <input type="file" name="fotos" accept="image/jpeg,image/png,image/webp" required />
          </label>
        </div>

        <h2>6. Tiempo estimado y presupuesto</h2>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label className="form-field">
            Fecha estimada de entrega
            <input type="date" name="fechaEstimadaEntrega" />
          </label>
          <label className="form-field">
            Presupuesto estimado (COP, opcional)
            <input type="number" name="presupuestoEstimado" min={0} step={1000} />
          </label>
          <label className="form-field">
            Anticipo que deja el cliente (COP, opcional)
            <input type="number" name="anticipo" min={0} step={1000} />
          </label>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', marginBottom: 20 }}>
          <input type="checkbox" name="presupuestoEstimadoAceptado" />
          El cliente acepta este presupuesto estimado (si el diagnóstico lo confirma, se repara directo sin volver a pedir aprobación)
        </label>

        <h2>7. PIN o patrón de desbloqueo (opcional)</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: -8 }}>
          Solo para probar el software tras la reparación. Explica al cliente para qué se usa antes de pedir su
          autorización — sin el checkbox marcado, este dato no se guarda.
        </p>
        <div className="form-grid" style={{ marginBottom: 12 }}>
          <label className="form-field">
            Tipo
            <select name="pinTipo" defaultValue="">
              <option value="">— No aplica —</option>
              <option value="PIN">PIN numérico</option>
              <option value="PATRON">Patrón</option>
              <option value="CONTRASENA">Contraseña</option>
              <option value="OTRO">Otro</option>
            </select>
          </label>
          <label className="form-field">
            Valor
            <input name="pinValor" placeholder="Ej: 1234, o descripción del patrón" />
          </label>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', marginBottom: 20 }}>
          <input type="checkbox" name="consentimientoPin" />
          El cliente autoriza explícitamente el uso de este PIN/patrón únicamente para probar el software tras la
          reparación
        </label>

        <div className="card" style={{ background: 'var(--bg)', marginBottom: 20 }}>
          <p style={{ margin: 0, fontSize: '0.8125rem' }}>
            Política de custodia: {tenant.diasCustodiaGratis} días gratis desde el ingreso. Después, bodegaje de{' '}
            {tenant.tarifaBodegajeDiaria.toLocaleString('es-CO')} COP por día. Se le informa al cliente en el
            comprobante.
          </p>
        </div>

        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.875rem', marginBottom: 20 }}>
          <input type="checkbox" name="consentimientoDatos" required style={{ marginTop: 3 }} />
          El cliente autoriza el tratamiento de sus datos personales conforme a la Ley 1581 de 2012 (Habeas Data)
        </label>

        <button type="submit" className="btn btn-primary">
          Registrar ingreso
        </button>
      </form>
    </>
  );
}
