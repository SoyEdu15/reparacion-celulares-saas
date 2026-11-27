# Servidor de pruebas en este computador

Publica la app gratis desde este PC con un túnel de Cloudflare (`https://<algo>.trycloudflare.com`), sin abrir puertos del router ni crear cuentas.

- `iniciar.ps1`: levanta Docker, la app en modo producción, el worker de notificaciones y el túnel. Al final escribe los enlaces de cada taller en `ENLACES.txt` y en el Escritorio (`Enlaces del servidor.txt`).
- `detener.ps1`: apaga la app, el worker y el túnel.
- Arranca solo al iniciar sesión en Windows (`Servidor reparaciones.cmd` en la carpeta de Inicio). En el Escritorio queda un acceso directo, "Iniciar servidor de pruebas", para correrlo a mano.
- `bin/cloudflared.exe`: versión portable oficial de Cloudflare (no se sube al repo).

## Cómo entra cada taller

El túnel gratuito no permite subdominios, así que cada taller entra con su enlace: `https://<túnel>/?taller=<subdominio>`. El navegador recuerda el taller (cookie `taller`) y después basta con la dirección base. El panel de administración se abre con `?panel=admin`.

## Limitaciones

- **El enlace cambia** cada vez que se reinicia el computador o el túnel. El script siempre escribe los enlaces nuevos.
- Los correos salen a Maildev (local), no a los clientes reales. WhatsApp sigue sin conectar.
- Para una dirección fija con subdominios por taller hace falta un dominio propio (~USD 10 al año) y un túnel con nombre de Cloudflare (gratis), o un hosting real.
