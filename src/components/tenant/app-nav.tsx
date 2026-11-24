import Link from 'next/link';
import { auth, signOut } from '@/lib/auth/tenant-auth';

export async function AppNav() {
  const session = await auth();

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <nav className="app-nav">
      <Link href="/dashboard">Inicio</Link>
      <Link href="/ingreso">Nuevo ingreso</Link>
      <Link href="/reparaciones">Reparaciones</Link>
      <Link href="/clientes">Clientes</Link>
      <Link href="/equipos">Equipos</Link>
      <Link href="/ventas">Ventas</Link>
      {session?.user.rol === 'DUENO' ? <Link href="/inventario">Inventario</Link> : null}
      {session?.user.rol === 'DUENO' ? <Link href="/gastos">Gastos</Link> : null}
      {session?.user.rol === 'DUENO' ? <Link href="/cuentas">Cuentas</Link> : null}
      {session?.user.rol === 'DUENO' ? <Link href="/tecnicos">Técnicos</Link> : null}
      {session?.user.rol === 'DUENO' ? <Link href="/configuracion">Configuración</Link> : null}
      {session?.user.rol === 'DUENO' ? <Link href="/reportes">Reportes</Link> : null}
      <div className="app-nav-cuenta">
        <Link href="/perfil" className="app-nav-user">
          {session?.user.name} ({session?.user.rol})
        </Link>
        <form action={logout}>
          <button type="submit" className="btn btn-secondary">
            Salir
          </button>
        </form>
      </div>
    </nav>
  );
}
