# Documentos legales

Esta carpeta tiene los documentos legales de la plataforma. Son la **fuente única**: la app los lee de aquí y los publica en las rutas `/legal/...` de cada dominio. Si cambias un archivo, cambia la página.

| Archivo | Se publica en | Para quién |
|---|---|---|
| [terminos-y-condiciones.md](terminos-y-condiciones.md) | `/legal/terminos` | Contrato entre la plataforma y cada taller |
| [politica-de-privacidad.md](politica-de-privacidad.md) | `/legal/privacidad` | Cómo la plataforma trata los datos de talleres y usuarios |
| [acuerdo-tratamiento-datos.md](acuerdo-tratamiento-datos.md) | `/legal/tratamiento-datos` | Contrato de transmisión: la plataforma como Encargado de los datos de los clientes de cada taller |
| [acuerdo-nivel-servicio.md](acuerdo-nivel-servicio.md) | `/legal/sla` | Disponibilidad, respaldos y soporte |
| [politica-de-cookies.md](politica-de-cookies.md) | `/legal/cookies` | Cookies que usa la plataforma |
| [plantilla-politica-datos-taller.md](plantilla-politica-datos-taller.md) | `/legal/politica-datos` (solo en el subdominio de cada taller) | Política de datos de cada taller para sus clientes, armada con los datos de su configuración |
| [checklist-para-vender.md](checklist-para-vender.md) | No se publica | Tus trámites pendientes como dueño de la plataforma |

> Estos documentos son una base preparada para esta aplicación y para la ley colombiana. **Hazlos revisar por un abogado** antes de vender.

## Datos que debes completar

Los documentos usan variables del tipo `{{PLATFORM_LEGAL_NAME}}`, que se llenan desde las variables de entorno del servidor. Mientras una no esté configurada, la página muestra un aviso amarillo de **PENDIENTE** en su lugar, para que no se te pase.

| Variable de entorno | Qué va | Ejemplo |
|---|---|---|
| `PLATFORM_NAME` | Nombre comercial de la plataforma | `TallerPro` |
| `PLATFORM_LEGAL_NAME` | Razón social o nombre completo del titular | `E-TECH S.A.S.` |
| `PLATFORM_LEGAL_ID` | NIT o cédula | `NIT 901.234.567-8` |
| `PLATFORM_LEGAL_ADDRESS` | Dirección de notificaciones | `Calle 10 # 20-30` |
| `PLATFORM_LEGAL_CITY` | Ciudad del domicilio (define también los jueces competentes) | `Bogotá D.C.` |
| `PLATFORM_LEGAL_EMAIL` | Correo de soporte y de datos personales | `soporte@tallerpro.co` |
| `PLATFORM_LEGAL_PHONE` | Teléfono o WhatsApp de soporte | `+57 300 123 4567` |
| `LEGAL_PROVEEDOR_HOSTING` | Dónde corre la app y la base de datos | `Railway` |
| `LEGAL_UBICACION_HOSTING` | País o región de esos servidores | `Estados Unidos` |
| `LEGAL_PROVEEDOR_EMAIL` | Proveedor de correo transaccional | `Resend` |
| `LEGAL_UBICACION_EMAIL` | País o región de ese proveedor | `Estados Unidos` |

La versión y la fecha (`{{LEGAL_VERSION}}` y `{{LEGAL_FECHA}}`) salen de `src/lib/legal.ts`.

La plantilla de la política de cada taller usa sus propios datos (`{{TALLER_NOMBRE}}`, `{{TALLER_NIT}}`, `{{TALLER_DIRECCION}}`, `{{TALLER_TELEFONO}}`), que el dueño llena en **Configuración**.

## Cuando cambies un documento

1. Edita el `.md`.
2. Si el cambio es **sustancial** (precio, responsabilidad, datos personales, subencargados), sube `LEGAL_VERSION` y `LEGAL_FECHA` en `src/lib/legal.ts`. Al subir la versión, la app le vuelve a pedir la aceptación al dueño de cada taller en su próximo ingreso, y guarda la nueva fecha, la IP y el usuario como prueba.
3. Avisa a los talleres con la anticipación que piden los Términos: 15 días para cambios en los Términos y 15 días para nuevos subencargados.

## Formato que entiende la app

Títulos con `#`, `##` y `###`; párrafos; listas con `-` o `1.` (con sublistas indentadas); **negrita**; enlaces `[texto](/ruta)`; tablas simples con `|`; notas con `>`; y `<br>` para salto de línea. Nada más: todo lo demás se muestra como texto.
