import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: Request) {
  try {
    // 1. Obtener citas de las próximas 2 horas que no tengan recordatorio enviado
    const { data: citas, error } = await supabase
      .from('citas')
      .select('id, fecha, hora_inicio, clientes(nombre, telefono), servicios(nombre)')
      .eq('recordatorio_enviado', false)
      .eq('fecha', new Date().toISOString().split('T')[0]);

    if (error) throw error;

    for (let cita of citas || []) {
      const cliente = cita.clientes as any;
      const servicio = cita.servicios as any;

      const mensaje = `Hola ${cliente.nombre} 👋. Te recordamos tu cita de *${servicio.nombre}* pautada para hoy a las *${cita.hora_inicio}*. ¡Te esperamos! 💅✨`;

      // 2. Enviar a través de la API de WhatsApp (Ej: UltraMsg o Meta API)
      await fetch(`https://api.ultramsg.com/TU_INSTANCE_ID/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: 'TU_ULTRAMSG_TOKEN',
          to: cliente.telefono,
          body: mensaje
        })
      });

      // 3. Marcar como enviado
      await supabase
        .from('citas')
        .update({ recordatorio_enviado: true })
        .eq('id', cita.id);
    }

    return NextResponse.json({ ok: true, procesados: citas?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}