import { hash } from '@node-rs/argon2';
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
 * No hay borrado duro: los usuarios quedan referenciados como
 * recibido_por/diagnosticado_por/etc. en reparaciones e historial_estados
 * (auditoría). "Eliminar" un técnico se implementa como desactivar
 * (activo = false) — deja de poder loguearse pero el historial se conserva.
 */
export function toggleActivoUsuario(tenantId: string, id: string, activo: boolean) {
  return withTenant(tenantId, (tx) => tx.usuario.update({ where: { id }, data: { activo } }));
}
