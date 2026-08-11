import { notFound } from 'next/navigation';
import { requireDueno } from '@/lib/auth/guards';
import { obtenerUsuario } from '@/server/services/usuarios';
import { editarTecnicoAction } from '../actions';

export default async function EditarTecnicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireDueno();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const usuario = await obtenerUsuario(session.user.tenantId, id);

  if (!usuario || usuario.rol !== 'TECNICO') {
    notFound();
  }

  return (
    <>
      <div className="page-header">
        <h1>Editar técnico</h1>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="card">
        <form action={editarTecnicoAction} className="form-grid">
          <input type="hidden" name="id" value={usuario.id} />
          <label className="form-field">
            Nombre
            <input name="nombre" required maxLength={120} defaultValue={usuario.nombre} />
          </label>
          <label className="form-field">
            Email
            <input name="email" type="email" required defaultValue={usuario.email} />
          </label>
          <label className="form-field">
            Nueva contraseña (opcional)
            <input name="password" type="password" minLength={8} placeholder="Dejar en blanco para no cambiar" />
          </label>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </form>
      </div>
    </>
  );
}
