// src/app/api/cron/recordatorios/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generarLinkWhatsApp } from '@/lib/whatsapp';
import { msgRecordatorioCliente } from '@/lib/mensajesWhatsApp';

export async function GET() {
  try {
    const ahora = new Date();
    const horaProxima = new Date(ahora.getTime() + 60 * 60 * 1000); // 1 hora después

    const fechaStr = ahora.toISOString().split('T')[0];
    const horaStr = horaProxima.toTimeString().substring(0, 5);

    const { data: citas, error } = await supabase
      .from('citas')
      .select('*')
      .eq('fecha', fechaStr)
      .eq('hora_inicio', horaStr)
      .eq('estado', 'confirmada');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const enlacesEnviados = (citas || []).map((cita) => {
      return generarLinkWhatsApp(cita.cliente_telefono, msgRecordatorioCliente(cita));
    });

    return NextResponse.json({
      success: true,
      mensaje: `Se procesaron ${enlacesEnviados.length} recordatorios`,
      links: enlacesEnviados
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}