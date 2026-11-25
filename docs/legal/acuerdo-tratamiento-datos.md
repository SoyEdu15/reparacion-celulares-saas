# Acuerdo de Tratamiento de Datos Personales (Contrato de Transmisión)

**{{PLATFORM_NAME}}**

Versión {{LEGAL_VERSION}}, vigente desde el {{LEGAL_FECHA}}.

Este acuerdo forma parte de los [Términos y Condiciones](/legal/terminos). Las partes son:

- **El Taller**, en calidad de **Responsable del tratamiento** de los datos de sus clientes finales.
- **{{PLATFORM_LEGAL_NAME}}** ({{PLATFORM_LEGAL_ID}}), en calidad de **Encargado del tratamiento** (el "Encargado").

Es el contrato de transmisión de datos que exigen los artículos 2.2.2.25.5.1 y 2.2.2.25.5.2 del Decreto 1074 de 2015 (antes artículos 24 y 25 del Decreto 1377 de 2013), y se acepta por medios electrónicos conforme a la Ley 527 de 1999.

## 1. Objeto

El Encargado tratará los datos personales que el Taller cargue en la Plataforma **únicamente para prestarle el servicio contratado**, por cuenta del Taller y siguiendo sus instrucciones. Esas instrucciones son las que el Taller da al usar las funciones de la Plataforma y las que dé por escrito.

## 2. Datos y titulares

- **Titulares**: los clientes finales del Taller.
- **Datos**:
  - nombre, teléfono, número de identificación y correo;
  - marca, modelo, color e IMEI del equipo;
  - falla reportada y estado físico del equipo;
  - fotos del equipo;
  - PIN o patrón de desbloqueo, solo si el titular lo autoriza;
  - historial de la reparación, pagos, abonos y comprobantes.
- **Operaciones**: recolección por medio del Taller, almacenamiento, consulta, actualización, envío de notificaciones transaccionales (correo y WhatsApp), generación de comprobantes, copias de respaldo y supresión.

El Taller no debe cargar datos sensibles (salud, biométricos, origen racial, etc.) en campos de texto libre. Las fotos deben ser del equipo y no de las personas.

## 3. Obligaciones del Taller (Responsable)

1. Obtener la autorización previa, expresa e informada de cada titular, y conservar prueba de ella. La Plataforma registra la autorización en el ingreso de cada equipo.
2. Tener y publicar una política de tratamiento de datos. La Plataforma le genera una a partir de una plantilla con los datos del Taller, que el Taller debe revisar y adoptar.
3. Informar a los titulares para qué se usan sus datos y cuáles son sus derechos.
4. Atender las consultas y reclamos de los titulares en los plazos de ley.
5. Si atiende a menores de edad, recolectar sus datos con autorización de su representante legal.
6. Registrar sus bases de datos en el Registro Nacional de Bases de Datos de la SIC, si está obligado a hacerlo.

## 4. Obligaciones del Encargado

1. Tratar los datos solo para prestar el servicio, nunca para fines propios, y no venderlos, cederlos ni usarlos con fines comerciales.
2. Mantener los datos de cada Taller aislados de los demás y aplicar medidas de seguridad razonables:
   - aislamiento por taller en la base de datos;
   - cifrado del PIN o patrón;
   - almacenamiento privado de las fotos;
   - conexiones cifradas;
   - control de acceso y bitácora de auditoría.
3. Guardar confidencialidad y exigirla a su personal y a sus subencargados.
4. Ayudar al Taller a atender las solicitudes de los titulares que no pueda resolver por sí mismo en la Plataforma.
5. Avisar al Taller **sin demora injustificada, y a más tardar dentro de las setenta y dos (72) horas** siguientes a conocerlo, sobre cualquier incidente de seguridad que afecte sus datos. El aviso indicará lo ocurrido, los datos afectados y las medidas tomadas. Así el Taller y el Encargado pueden cumplir el deber de reportar a la Superintendencia de Industria y Comercio.
6. Informar al Taller cuando reciba una solicitud de una autoridad sobre sus datos, salvo que la ley lo prohíba.
7. Al terminar el contrato, devolver o eliminar los datos según la sección 11 de los Términos.

## 5. Subencargados y transmisiones internacionales

El Taller autoriza al Encargado a apoyarse en los siguientes subencargados para prestar el servicio:

| Servicio | Proveedor | Ubicación de los datos |
|---|---|---|
| Alojamiento de la aplicación y base de datos | {{LEGAL_PROVEEDOR_HOSTING}} | {{LEGAL_UBICACION_HOSTING}} |
| Almacenamiento de fotos y logos | Cloudflare R2 (Cloudflare, Inc.) | Según la región del bucket |
| Envío de correo transaccional | {{LEGAL_PROVEEDOR_EMAIL}} | {{LEGAL_UBICACION_EMAIL}} |
| Mensajería de WhatsApp (si el Taller la activa) | WhatsApp Business Platform (Meta Platforms, Inc.) | Estados Unidos y otros países |

Cuando un subencargado tiene servidores fuera de Colombia, la información viaja como transmisión internacional a un encargado. El Encargado exige a cada subencargado obligaciones de protección equivalentes a las de este acuerdo. Si agrega o cambia un subencargado, lo avisará al Taller con quince (15) días de anticipación. Si el Taller tiene una objeción razonable, puede cancelar sin penalidad.

## 6. Auditoría

El Taller puede pedir, una vez al año y con aviso de treinta (30) días, información razonable que demuestre el cumplimiento de este acuerdo. El Encargado la entregará por escrito, sin dar acceso a datos de otros talleres ni a secretos de seguridad.

## 7. Duración

Este acuerdo dura lo mismo que la suscripción y las obligaciones de confidencialidad y supresión que sigan después.
