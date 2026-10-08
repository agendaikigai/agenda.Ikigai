// src/lib/mensajesWhatsApp.ts

export const TELEFONO_ADMIN = '04121752136';

interface DatosCita {
  cliente_nombre: string;
  cliente_telefono: string;
  manicurista_nombre: string;
  servicio_nombre: string;
  fecha: string;
  hora_inicio: string;
}

// Mensaje de confirmación al cliente
export function msgConfirmacionCliente(cita: DatosCita): string {
  return `✨ *¡Hola, ${cita.cliente_nombre}!* Tu cita en *Ikigai!* ha sido agendada con éxito. 💅\n\n` +
    `📅 *Fecha:* ${cita.fecha}\n` +
    `⏰ *Hora:* ${cita.hora_inicio}\n` +
    `💅 *Especialista:* ${cita.manicurista_nombre}\n` +
    `✨ *Servicio:* ${cita.servicio_nombre}\n\n` +
    `Te esperamos. Si necesitas modificar tu cita, comunícate con nosotros.`;
}

// Notificación de nueva cita al administrador
export function msgNotificacionAdmin(cita: DatosCita): string {
  return `🚨 *NUEVA CITA REGISTRADA*\n\n` +
    `👤 *Cliente:* ${cita.cliente_nombre} (${cita.cliente_telefono})\n` +
    `📅 *Fecha:* ${cita.fecha} a las ${cita.hora_inicio}\n` +
    `💅 *Especialista:* ${cita.manicurista_nombre}\n` +
    `✨ *Servicio:* ${cita.servicio_nombre}`;
}

// Recordatorio para el cliente
export function msgRecordatorioCliente(cita: DatosCita): string {
  return `⏰ *Recordatorio de Cita - Ikigai!* \n\n` +
    `Hola ${cita.cliente_nombre}, te recordamos que tienes una cita agendada en *1 hora* (${cita.hora_inicio}).\n\n` +
    `💅 *Servicio:* ${cita.servicio_nombre}\n` +
    `👩‍🎨 *Atendido por:* ${cita.manicurista_nombre}\n\n` +
    `¡Te esperamos pronto!`;
}