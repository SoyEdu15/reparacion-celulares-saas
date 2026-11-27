import Link from 'next/link';
import { auth, signOut } from '@/lib/auth/tenant-auth';
import { AppNavMenu, type EnlaceNav } from './app-nav-menu';

export async function AppNav() {
  const session = await auth();
  const esDueno = session?.user.rol === 'DUENO';

  async function logout() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  const enlaces: EnlaceNav[] = [
    { href: '/dashboard', label: 'Inicio' },
    { href: '/ingreso', label: 'Nuevo ingreso' },
    { href: '/reparaciones', label: 'Reparaciones' },
    { href: '/clientes', label: 'Clientes' },
    { href: '/equipos', label: 'Equipos' },
    { href: '/ventas', label: 'Ventas' },
    ...(esDueno
      ? [
          { href: '/inventario', label: 'Inventario' },
          { href: '/gastos', label: 'Gastos' },
          { href: '/cuentas', label: 'Cuentas' },
          { href: '/tecnicos', label: 'Técnicos' },
          { href: '/configuracion', label: 'Configuración' },
          { href: '/reportes', label: 'Reportes' },
        ]
      : []),
  ];

  return (
    <AppNavMenu enlaces={enlaces}>
      <div className="app-nav-cuenta">
        <Link href="/perfil" className="app-nav-user">
          {session?.user.name} <span className="app-nav-rol">({session?.user.rol})</span>
        </Link>
        <form action={logout}>
          <button type="submit" className="btn btn-secondary">
            Salir
          </button>
        </form>
      </div>
    </AppNavMenu>
  );
}
