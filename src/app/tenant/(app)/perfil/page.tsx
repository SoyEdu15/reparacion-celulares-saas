import { requireSession } from '@/lib/auth/guards';
import { cambiarPasswordAction } from './actions';

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireSession();
  const { error, ok } = await searchParams;

  return (
    <>
      <div className="page-header">
        <h1>Mi perfil</h1>
      </div>

      <div className="card">
        <h2>Datos de la cuenta</h2>
        <p>
          {session.user.name} — {session.user.email}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Rol: {session.user.rol}</p>
      </div>

      <div className="card">
        <h2>Cambiar contraseña</h2>

        {error ? <p className="form-error">{error}</p> : null}
        {ok ? <p className="form-success">Contraseña actualizada.</p> : null}

        <form action={cambiarPasswordAction} className="form-grid">
          <label className="form-field">
            Contraseña actual
            <input name="passwordActual" type="password" required autoComplete="current-password" />
          </label>
          <label className="form-field">
            Contraseña nueva
            <input name="passwordNueva" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label className="form-field">
            Confirmar contraseña nueva
            <input name="passwordConfirmar" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
        </form>
      </div>
    </>
  );
}
