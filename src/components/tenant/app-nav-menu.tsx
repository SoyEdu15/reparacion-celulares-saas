'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

export type EnlaceNav = { href: string; label: string };

/**
 * Menú principal. En computador y tablet los enlaces se ven en línea; en el
 * celular se recogen detrás de un botón "Menú" para no ocupar media pantalla,
 * y se cierran solos al cambiar de página.
 */
export function AppNavMenu({ enlaces, children }: { enlaces: EnlaceNav[]; children: ReactNode }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  const activo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const actual = enlaces.find((e) => activo(e.href));

  return (
    <nav className={`app-nav ${abierto ? 'app-nav-abierto' : ''}`}>
      <button
        type="button"
        className="app-nav-toggle"
        aria-expanded={abierto}
        aria-controls="app-nav-enlaces"
        onClick={() => setAbierto((v) => !v)}
      >
        <span aria-hidden="true">{abierto ? '✕' : '☰'}</span> {actual?.label ?? 'Menú'}
      </button>
      <div className="app-nav-enlaces" id="app-nav-enlaces">
        {enlaces.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className={activo(e.href) ? 'activo' : undefined}
            aria-current={activo(e.href) ? 'page' : undefined}
            onClick={() => setAbierto(false)}
          >
            {e.label}
          </Link>
        ))}
      </div>
      {children}
    </nav>
  );
}
