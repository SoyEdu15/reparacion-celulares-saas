# Lista de trámites para empezar a vender

Esta lista es para ti como dueño de la plataforma. Reúne lo que exige la ley colombiana para cobrar por un software en línea (SaaS) y manejar datos de terceros. Lo que se puede resolver dentro del software ya está hecho. **Lo de esta lista lo tienes que hacer tú**, idealmente con un contador y un abogado.

> **Importante:** los documentos legales de esta carpeta son una base sólida, escrita para el funcionamiento real de esta aplicación y la ley colombiana. Aun así, **no reemplazan la revisión de un abogado**. Antes de vender, pídele a uno que los revise con tus datos reales. Es una consulta corta, porque el trabajo pesado ya está hecho.

## 1. Formalizar el negocio

- [ ] **Decidir cómo vas a vender**: como persona natural comerciante o creando una empresa. La forma más común es una **S.A.S.**: se constituye rápido y separa tu patrimonio personal del de la empresa. Tu contador te dice qué te conviene según cuánto esperas facturar.
- [ ] **RUT** ante la DIAN, con la actividad económica correcta. Para este negocio aplican códigos CIIU como el **6201** (desarrollo de software) o el **6312** (portales web); confírmalo con tu contador.
- [ ] **Registro mercantil** en la Cámara de Comercio de tu ciudad, y renovarlo cada año antes del 31 de marzo.
- [ ] **Cuenta bancaria** a nombre del negocio o de la empresa, para recibir los pagos.

## 2. Impuestos y facturación

- [ ] **Facturación electrónica DIAN**. Si estás obligado a facturar, cada pago de suscripción necesita su factura electrónica. Se habilita en el portal de la DIAN o con un proveedor tecnológico (por ejemplo, Alegra, Siigo o Facture).
- [ ] **IVA**. Las suscripciones de software en Colombia, por regla general, causan **IVA del 19%**, salvo exclusiones puntuales. Define con tu contador si eres responsable de IVA y si tus precios lo incluyen o no. Los Términos dicen que, si no se indica otra cosa, los precios **no** incluyen impuestos.
- [ ] **Retenciones e ICA** según tu ciudad: tu contador te dice cuáles aplican.

> Ojo con algo que se presta a confusión: los comprobantes que la app les genera a los talleres **no son factura electrónica**. Los Términos ya lo dicen, para que ningún taller lo entienda mal. Si más adelante quieres que la app emita facturas electrónicas para los talleres, eso es otro desarrollo, con integración a un proveedor tecnológico de la DIAN.

## 3. Protección de datos personales (Ley 1581 de 2012)

Esto ya quedó resuelto en la app:

- Política de privacidad de la plataforma, publicada.
- Acuerdo de tratamiento de datos con cada taller, que la app hace aceptar al dueño en su primer ingreso.
- Política de datos del taller, que se genera sola con los datos de cada taller.
- Casilla de autorización del cliente final en cada ingreso, con enlace a esa política.
- PIN cifrado, aislamiento entre talleres y bitácora de auditoría.

Lo que te toca:

- [ ] **Completar tus datos legales** en las variables de entorno: razón social, NIT, dirección, correo y teléfono (ver [README de esta carpeta](README.md)). Hasta que lo hagas, los documentos muestran avisos de "pendiente".
- [ ] **Crear un correo para temas de datos personales y soporte** y revisarlo a diario. La ley te da 10 días hábiles para consultas y 15 para reclamos.
- [ ] **Registro Nacional de Bases de Datos (RNBD) de la SIC**. Hoy solo están obligadas las sociedades y entidades sin ánimo de lucro con **activos totales mayores a 100.000 UVT**, y las entidades públicas (Decreto 090 de 2018). Al empezar seguramente no estás obligado; revísalo cada año con tu contador.
- [ ] **Definir el hosting y el proveedor de correo** de producción, y completar sus nombres en el acuerdo de tratamiento de datos (variables `LEGAL_PROVEEDOR_HOSTING` y `LEGAL_PROVEEDOR_EMAIL`).
- [ ] **Plan ante incidentes**: si hay una fuga de datos, debes avisar a los talleres (el acuerdo dice 72 horas) y reportarla a la SIC en su portal dentro de los 15 días hábiles siguientes a detectarla.

## 4. Propiedad intelectual

- [ ] **Registrar la marca** (el nombre de la plataforma y su logo) en la **Superintendencia de Industria y Comercio**. Primero haz una búsqueda de antecedentes en el portal de la SIC, para no chocar con una marca ya registrada. Se registra en la clase **42** (software como servicio) y, si quieres, en la **9** (software descargable).
- [ ] **Registrar el software** ante la **Dirección Nacional de Derecho de Autor (DNDA)**. Es gratis y en línea. No es obligatorio, porque el derecho de autor nace al crear la obra, pero sirve como prueba de fecha y autoría si alguien copia el código. Recuerda que el repositorio es público.
- [ ] **Evaluar si conviene hacer privado el repositorio** antes de vender: con el código público, un competidor puede leerlo, aunque legalmente no pueda usarlo.

## 5. Cobro de la suscripción

- [ ] **Escoger una pasarela de pagos** colombiana (por ejemplo Wompi, ePayco, PayU o Mercado Pago). Esa pieza está pendiente en el código y es la que guarda los datos de tarjeta, no la app.
- [ ] **Definir precios y planes** y publicarlos (en una página de precios o en la cotización). Los Términos remiten a "la oferta o cotización aceptada", así que basta con que el precio quede por escrito.
- [ ] **Orden de servicio o cotización** por cliente con plan, precio, si incluye IVA, fecha de inicio y forma de pago. Con la aceptación electrónica de la app, tienes el contrato completo.

## 6. Protección al consumidor

- La mayoría de tus clientes serán talleres que compran el software para su negocio. Esa compra está ligada a su actividad económica, por lo que, en principio, **no es una relación de consumo** (Ley 1480 de 2011). Aun así, los Términos incluyen el derecho de retracto de 5 días hábiles para cuando sí aplique, y la cancelación es libre y sin permanencia. Eso te protege de reclamos.
- [ ] Si vendes por una página web, publica en ella tu razón social, NIT, dirección, correo y teléfono (artículo 50 de la Ley 1480).

## 7. Antes del primer cliente

- [ ] Abogado revisa los documentos.
- [ ] Datos legales completos en el servidor de producción.
- [ ] Dominio propio con HTTPS.
- [ ] Copias de seguridad diarias automáticas de la base de datos, y una restauración de prueba hecha al menos una vez.
- [ ] Correo transaccional con dominio verificado (SPF, DKIM y DMARC).
- [ ] Facturación electrónica habilitada.
- [ ] Marca radicada en la SIC.
