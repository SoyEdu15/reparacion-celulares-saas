# Servidor de pruebas en este computador

Publica la app gratis desde este PC con un **enlace fijo** de Tailscale Funnel (`https://<equipo>.<red>.ts.net`), sin abrir puertos del router. El enlace no cambia aunque se reinicie el computador.

- `iniciar.ps1`: levanta Docker, la app en modo producción, el worker de notificaciones y revisa que el Funnel de Tailscale esté encendido. Escribe los enlaces de cada taller en `ENLACES.txt` y en el Escritorio (`Enlaces del servidor.txt`), y **se queda vigilando**: cada minuto revisa cada pieza y levanta la que se haya caído. También le pide a Windows que no suspenda el equipo. Registro en `logs/vigilante.log`.
- `instalar-tarea.ps1`: registra la tarea **"Servidor reparaciones"** en el Programador de tareas de Windows, que corre `iniciar.ps1` al iniciar sesión.
- `detener.ps1`: apaga la app y el worker (detén antes la tarea en el Programador de tareas, o el vigilante los vuelve a levantar). Para cortar el acceso desde internet: `tailscale funnel --https=443 off`.
- `cerrar-firewall.ps1` (administrador): desactiva las reglas del firewall de Windows que dejaban entrar desde redes públicas a Node, Docker, Apache, MySQL, Python y el puerto 80. Registro en `logs/firewall.log`.
- `CLAVES.txt` (no se sube al repo): contraseñas de las cuentas de prueba.

## Cómo entra cada taller

Funnel da un solo dominio (sin subdominios), así que cada taller entra con su enlace: `https://<enlace>/?taller=<subdominio>`. El navegador recuerda el taller (cookie `taller`) y después basta con la dirección base.

## Seguridad

- La app, Postgres, Redis, MinIO y Maildev escuchan **solo en localhost**: nadie de la red Wi-Fi ni de otra VPN puede conectarse a ellos. Desde internet solo se llega a la app, por el Funnel.
- El **panel de super-admin no se publica**: solo abre desde este equipo en `http://admin.localhost:3000`. Un pedido que llega por un túnel (dominio no local o `X-Forwarded-For` con una IP de afuera) recibe 404. Las rutas internas `/admin/*` y `/tenant/*` tampoco se pueden abrir directo.
- Encabezados de seguridad en todas las páginas (CSP, no se puede meter en un iframe, HSTS, nosniff) y sin `X-Powered-By`.
- Las fotos y logos se revisan por su contenido real (JPG, PNG o WebP de verdad, máximo 10 MB): un archivo disfrazado de imagen se rechaza.
- Probado con `node_modules/.cache/demo/atacar.cjs`: con la sesión de un taller no se puede ver órdenes ni fotos de otro, ni cambiar de taller con la cookie, ni falsificar el encabezado del taller.
- Las contraseñas de ejemplo de `prisma/seed.ts` son públicas (el repo es público): en este servidor ya se cambiaron. Si se vuelve a correr el seed, hay que cambiarlas otra vez.

## Limitaciones

- Para enlaces con subdominio por taller (`etech.tudominio.com`) hace falta un dominio propio.
