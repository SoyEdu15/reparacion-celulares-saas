import { hash, verify } from '@node-rs/argon2';
import { withTenant } from '@/lib/rls';

export function listarUsuarios(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.usuario.findMany({
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    }),
  );
}

export function obtenerUsuario(tenantId: string, id: string) {
  return withTenant(tenantId, (tx) => tx.usuario.findUnique({ where: { id } }));
}

export async function crearTecnico(tenantId: string, data: { nombre: string; email: string; password: string }) {
  const passwordHash = await hash(data.password);
  return withTenant(tenantId, (tx) =>
    tx.usuario.create({
      data: {
        tenantId,
        rol: 'TECNICO',
        nombre: data.nombre,
        email: data.email,
        passwordHash,
      },
    }),
  );
}

export async function editarUsuario(
  tenantId: string,
  data: { id: string; nombre: string; email: string; password?: string },
) {
  const passwordHash = data.password ? await hash(data.password) : undefined;
  return withTenant(tenantId, (tx) =>
    tx.usuario.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        email: data.email,
        ...(passwordHash ? { passwordHash } : {}),
      },
    }),
  );
}

/**
 * Cambio de contraseña por el propio usuario (dueño o técnico) — exige la
 * contraseña actual para confirmar que quien la cambia es el dueño de la
 * cuenta, no solo alguien con la sesión abierta en el equipo.
 */
export async function cambiarPasswordPropia(
  tenantId: string,
  usuarioId: string,
  passwordActual: string,
  passwordNueva: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const usuario = await withTenant(tenantId, (tx) => tx.usuario.findUnique({ where: { id: usuarioId } }));
  if (!usuario) {
    return { ok: false, error: 'Usuario no encontrado' };
  }

  const valida = await verify(usuario.passwordHash, passwordActual);
  if (!valida) {
    return { ok: false, error: 'La contraseña actual no es correcta' };
  }

  const passwordHash = await hash(passwordNueva);
  await withTenant(tenantId, (tx) => tx.usuario.update({ where: { id: usuarioId }, data: { passwordHash } }));
  return { ok: true };
}

/**
 * No hay borrado duro: los usuarios quedan referenciados como
 * recibido_por/diagnosticado_por/etc. en reparaciones e historial_estados
 * (auditoría). "Eliminar" un técnico se implementa como desactivar
 * (activo = false) — deja de poder loguearse pero el historial se conserva.
 */
export function toggleActivoUsuario(tenantId: string, id: string, activo: boolean) {
  return withTenant(tenantId, (tx) => tx.usuario.update({ where: { id }, data: { activo } }));
}
