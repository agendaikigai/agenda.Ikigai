// src/lib/whatsapp.ts

/**
 * Genera un enlace directo para enviar mensajes por WhatsApp Web/App
 */
export function generarLinkWhatsApp(telefono: string, mensaje: string): string {
  // Limpiar el número y formatear a código de país (+58 para Venezuela)
  let numLimpio = telefono.replace(/\D/g, '');

  if (numLimpio.startsWith('0')) {
    numLimpio = '58' + numLimpio.substring(1);
  } else if (!numLimpio.startsWith('58')) {
    numLimpio = '58' + numLimpio;
  }

  // Codificar el texto para la URL
  const mensajeEncode = encodeURIComponent(mensaje);

  return `https://api.whatsapp.com/send?phone=${numLimpio}&text=${mensajeEncode}`;
}

/**
 * Exportación adicional para compatibilidad con rutas API / backend
 */
export function enviarMensajeWhatsApp(telefono: string, mensaje: string): string {
  return generarLinkWhatsApp(telefono, mensaje);
}