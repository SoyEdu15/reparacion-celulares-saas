const ZONA_HORARIA = 'America/Bogota';

/** Saludo según la hora del día en Colombia, sin depender de la zona horaria del servidor. */
export function saludoSegunHora(fecha: Date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, hour: 'numeric', hourCycle: 'h23' }).format(fecha),
  );
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}
