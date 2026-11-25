# Manual de usuario

Guía para los talleres que usan la plataforma: el **dueño**, que administra todo, y los **técnicos**, que trabajan las reparaciones.

## Contenido

1. [Entrar a la plataforma](#1-entrar-a-la-plataforma)
2. [Primer ingreso del dueño](#2-primer-ingreso-del-dueño)
3. [Configurar el taller](#3-configurar-el-taller)
4. [Técnicos](#4-técnicos)
5. [Recibir un equipo](#5-recibir-un-equipo-nuevo-ingreso)
6. [Seguir una reparación](#6-seguir-una-reparación)
7. [Abonos y pagos del cliente](#7-abonos-y-pagos-del-cliente)
8. [Entregar el equipo](#8-entregar-el-equipo)
9. [Costos de cada reparación](#9-costos-de-cada-reparación)
10. [Ventas de mostrador](#10-ventas-de-mostrador)
11. [Inventario](#11-inventario)
12. [Gastos del local](#12-gastos-del-local)
13. [Cuentas del local](#13-cuentas-del-local)
14. [Clientes, equipos y reportes](#14-clientes-equipos-y-reportes)
15. [Notificaciones al cliente](#15-notificaciones-al-cliente)
16. [Custodia, bodegaje y equipos abandonados](#16-custodia-bodegaje-y-equipos-abandonados)
17. [Datos personales: lo que debe saber el taller](#17-datos-personales-lo-que-debe-saber-el-taller)
18. [Preguntas frecuentes](#18-preguntas-frecuentes)

## Quién puede hacer qué

| Función | Dueño | Técnico |
|---|:---:|:---:|
| Recibir equipos, ver y avanzar reparaciones | Sí | Sí |
| Tomar equipos de la cola para diagnóstico | — | Sí |
| Asignar un equipo a un técnico | Sí | — |
| Registrar abonos del cliente | Sí | Sí |
| Borrar abonos y devolver plata | Sí | — |
| Registrar ventas de mostrador | Sí | Sí (sin ver costos ni ganancia) |
| Inventario, gastos, cuentas y costos de reparación | Sí | — |
| Técnicos, configuración y reportes | Sí | — |

## 1. Entrar a la plataforma

Cada taller tiene su propia dirección, por ejemplo `mitaller.dominio.com`. Ábrela en el navegador del computador o del celular, y entra con tu correo y contraseña.

- Si olvidaste la contraseña, pídele al dueño o al soporte de la plataforma que te genere una temporal. Después puedes cambiarla en **Perfil** (tu nombre, arriba a la derecha).
- Si la pantalla dice **"Pago pendiente"** o **"Suspendido"**, la suscripción del taller está bloqueada. Tus datos no se borran; escribe al soporte por WhatsApp desde esa misma pantalla.

## 2. Primer ingreso del dueño

La primera vez que el dueño entra, la plataforma le pide aceptar tres documentos:

1. **Términos y Condiciones** y el **Acuerdo de Nivel de Servicio**: el contrato del servicio.
2. **Política de Privacidad**: cómo la plataforma trata los datos del taller y de sus usuarios.
3. **Acuerdo de Tratamiento de Datos**: el taller es el responsable de los datos de sus clientes y la plataforma los guarda por cuenta del taller.

Si la plataforma actualiza alguno de estos documentos, volverá a pedir la aceptación. Los técnicos no tienen que aceptar nada. Todos los documentos están en el pie de cada página.

## 3. Configurar el taller

Menú **Configuración** (solo el dueño):

- **Logo**: aparece en los comprobantes, en los correos y en la pantalla de inicio de sesión.
- **Datos comerciales**: nombre, NIT, dirección y teléfono. **Llénalos todos**: además de los comprobantes, se usan para armar la **política de datos de tu taller**, que tus clientes pueden consultar en `/legal/politica-datos`.
- **Facturación**: plantilla visual (clásica, moderna o minimalista), formato de impresión (tirilla de 58 mm, tirilla de 80 mm o carta) y texto del pie del comprobante.
- **Custodia y bodegaje**: días gratis de custodia después de que el equipo está listo, tarifa diaria de bodegaje, cada cuántos días recordarle al cliente y a los cuántos días se considera abandonado.
- **Garantía**: actívala y define los días; empiezan a contar el día de la entrega.
- **PIN/patrón**: a los cuántos días se borra solo. Si lo dejas vacío, se borra solo a mano.
- **Canales de notificación**: WhatsApp y correo, independientes entre sí.

## 4. Técnicos

Menú **Técnicos** (solo el dueño): crea la cuenta de cada técnico con su nombre, correo y contraseña. Si un técnico deja el taller, **desactívalo**: pierde el acceso, pero su historial se conserva.

## 5. Recibir un equipo (Nuevo ingreso)

1. **Cliente**: búscalo si ya existe o crea uno con nombre y teléfono; la cédula y el correo son opcionales. Con correo, el cliente recibe el comprobante con fotos.
2. **Equipo**: marca, modelo, color e IMEI.
3. **Falla reportada** y **estado físico**, por ejemplo: rayones, pantalla partida, sin SIM.
4. **Cuatro fotos** del equipo. Son obligatorias y quedan como soporte del estado en que se recibió.
5. **Técnico** (opcional): si lo asignas aquí, el equipo pasa directo a diagnóstico. Si no, queda en la cola y el primer técnico libre lo toma.
6. **Presupuesto estimado** (opcional), y si el cliente ya lo acepta.
7. **Abono** (opcional) y **cómo lo pagó**: efectivo, transferencia o tarjeta.
8. **PIN o patrón** (opcional): solo si el cliente lo autoriza en la casilla de consentimiento. Se guarda cifrado y solo lo ve el técnico asignado.
9. **Autorización de datos**: marca la casilla solo después de informarle al cliente para qué se usan sus datos. Puedes mostrarle la política del taller desde el enlace de la casilla.

Al guardar se crea la orden con su número consecutivo y se genera el **comprobante de ingreso**, para imprimir o enviar por correo.

## 6. Seguir una reparación

Cada orden pasa por estos estados:

**Esperando técnico → Diagnóstico → (Esperando aprobación del cliente) → Reparando → En testeo → Listo para entrega → Entregado**

- **Diagnóstico**: el técnico escribe lo que encontró. Si había un presupuesto ya aceptado y el técnico lo confirma, pasa directo a **Reparando**. Si cotiza otro valor, la orden queda **esperando aprobación** hasta que registres que el cliente aceptó, y por qué medio: llamada, WhatsApp o presencial.
- **Reparando → En testeo → Listo para entrega**: cada paso admite una nota y hasta cuatro fotos.
- **No reparable o Cancelado**: se puede marcar desde cualquier estado en curso, con un motivo.

Cada cambio queda en el **Historial** de la orden, con la fecha y el usuario que lo hizo, y le avisa al cliente por los canales activos.

## 7. Abonos y pagos del cliente

En la orden, la tarjeta **Pagos del cliente** muestra el total a cobrar, lo que ha pagado y lo que falta.

- **Registrar abono**: escribe el monto, cómo pagó y una nota opcional. Puede haber **varios abonos** por orden.
- Cada abono entra a la **caja del día en que se recibe**.
- Si registraste un abono por error, el dueño puede **borrarlo** mientras la orden siga abierta.
- Si la orden termina en **No reparable o Cancelado**, el dueño puede registrar la **devolución** al cliente. Si no se le devuelve, el abono cuenta como ingreso del día del cierre.

## 8. Entregar el equipo

Cuando la orden está en **Listo para entrega**:

1. La pantalla muestra **cuánto paga el cliente ahora**, que es el total menos los abonos. Si se pasó de los días de custodia gratis, se suma el bodegaje.
2. Elige **cómo paga lo que falta**.
3. Pulsa **Entregar al cliente y generar factura**.

Se genera el **comprobante de entrega** con el número consecutivo, el total, los abonos y el saldo. El pago queda registrado y empieza a contar la garantía, si está activa.

> El comprobante es un documento interno de control. **No es factura electrónica de la DIAN.** Si tu taller está obligado a facturar electrónicamente, debes expedir la factura en tu sistema de facturación.

## 9. Costos de cada reparación

Solo el dueño. En la orden, la tarjeta **Costos y ganancia** muestra lo cobrado, lo que costó y la ganancia.

- **Repuesto del inventario**: elígelo en "Del inventario" y deja el costo vacío. Se descuenta del stock y el costo se toma solo.
- **Repuesto comprado aparte, transporte, insumos o mano de obra externa**: escribe la descripción y el costo.
- **Quitar** un costo devuelve el repuesto al inventario.

## 10. Ventas de mostrador

Menú **Ventas**, para lo que se vende sin orden de reparación:

1. Agrega ítems: un **producto del inventario**, cuyo precio se llena solo y cuyo stock se descuenta, o un **ítem libre** (accesorio, repuesto o servicio), con lo que te costó si quieres ver la ganancia.
2. **Reparación rápida (sin orden)**: para trabajos de minutos, como un cambio de pin de carga, que no necesitan orden.
3. Elige el método de pago, y si quieres el cliente y una nota. Pulsa **Registrar venta**.

Debajo están las ventas del período y los **pagos de reparaciones** (abonos y saldos), con el **total en caja**. Solo el dueño puede **anular** una venta; al anularla, la mercancía vuelve al inventario.

## 11. Inventario

Menú **Inventario** (solo el dueño):

- **Nuevo producto**: nombre, categoría (accesorio o repuesto), código, precio de compra, precio de venta, cantidad actual y a partir de cuántas unidades avisar.
- **Entrada de mercancía**: cuando compras más unidades. Si el precio cambió, el sistema **promedia el costo** solo.
- **Ajuste por conteo**: si al contar tienes menos unidades de las que dice el sistema, la diferencia queda registrada como pérdida.
- Arriba ves cuánto vale tu mercancía a costo y a precio de venta, y cuántos productos están por reponer.

## 12. Gastos del local

Menú **Gastos** (solo el dueño): arriendo, servicios, nómina, transporte, insumos y otros. Son los gastos que no pertenecen a una reparación puntual; los de una reparación van en su tarjeta de costos.

## 13. Cuentas del local

Menú **Cuentas** (solo el dueño). Elige el período: hoy, ayer, esta semana, este mes, el mes anterior o un rango de fechas.

- **Ingresos, costo de lo vendido, gastos y ganancia real**.
- **Por tipo de ingreso**: accesorios, repuestos y reparaciones, con su margen.
- **Caja**: plata que entró de verdad, separada por método de pago.
- **Reparaciones entregadas**: ganancia de cada orden. Si una dice "Sin registrar", falta anotar sus costos.
- **Movimientos**: todo lo que entró y salió, en orden.

Reglas que conviene conocer:

1. Una reparación cuenta su **ingreso y sus costos el día de la entrega**, aunque el repuesto se haya comprado antes.
2. Los **abonos** entran a la caja el día en que se reciben, pero la ganancia se cuenta en la entrega.
3. **Comprar mercancía no es un gasto**: se vuelve inventario, y su costo se descuenta cuando se vende.

## 14. Clientes, equipos y reportes

- **Clientes** y **Equipos**: historial de cada cliente y de cada equipo, con todas sus órdenes.
- **Reportes** (solo el dueño): exporta a CSV, que se abre en Excel, las reparaciones, los clientes y las facturas.

## 15. Notificaciones al cliente

Si el taller activa WhatsApp o correo, el cliente recibe un aviso en cada cambio de estado: comprobante de ingreso, diagnóstico y presupuesto, equipo listo y entrega. Los correos llevan el logo del taller y las fotos del momento. Si un mensaje falla, se reintenta solo, y el cambio de estado nunca se pierde.

## 16. Custodia, bodegaje y equipos abandonados

Cuando un equipo está listo y el cliente no lo recoge, el sistema:

1. le envía recordatorios cada cierto número de días;
2. pasados los días gratis de custodia, suma el bodegaje diario al cobrar;
3. después del límite configurado, marca el equipo como **abandonado**.

Todo se configura en **Configuración**.

## 17. Datos personales: lo que debe saber el taller

Tu taller es el **responsable** de los datos de sus clientes (Ley 1581 de 2012). En la práctica:

- **Pide la autorización** en cada ingreso; la casilla de la plataforma deja el registro. Antes, explícale al cliente para qué se usan sus datos.
- **Llena tus datos comerciales** en Configuración, para que tu política de datos quede completa. Está publicada en `tu-taller.dominio.com/legal/politica-datos`; puedes imprimirla o compartir el enlace.
- **No anotes datos sensibles** (de salud, por ejemplo) en los campos de texto, y toma las fotos al equipo, no a la persona.
- **Pide el PIN solo si hace falta**, y configura la purga automática.
- **Si un cliente pide corregir o borrar sus datos**, respóndele en máximo 15 días hábiles; las consultas, en 10. Si necesitas ayuda para borrar algo que la plataforma no te deja, escribe al soporte.

## 18. Preguntas frecuentes

**¿Puedo usarla desde el celular?** Sí, todas las pantallas se adaptan al celular.

**¿Un técnico puede ver cuánto gano?** No. Los técnicos no ven costos, ganancias, inventario, gastos ni cuentas.

**¿Qué pasa con mis datos si dejo de pagar?** El acceso se bloquea, pero los datos se conservan. Si cancelas, tienes 30 días para pedir una copia completa.

**¿Otro taller puede ver mis clientes?** No. Cada taller está aislado de los demás a nivel de la base de datos.

**Me equivoqué de estado en una orden, ¿cómo lo devuelvo?** Los estados solo avanzan, para que el historial sea confiable. Escribe al soporte si necesitas corregir algo.
