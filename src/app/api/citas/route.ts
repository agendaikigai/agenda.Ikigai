// src/app/api/citas/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generarLinkWhatsApp } from '@/lib/whatsapp';
import { msgConfirmacionCliente, msgNotificacionAdmin, TELEFONO_ADMIN } from '@/lib/mensajesWhatsApp';

// GET: Obtener todas las citas que no estén canceladas
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .neq('estado', 'cancelada')
      .order('fecha', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Crear una nueva cita y generar las alertas de WhatsApp
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cliente_nombre,
      cliente_telefono,
      manicurista_nombre,
      servicio_nombre,
      fecha,
      hora_inicio,
      hora_fin,
      duracion_minutos
    } = body;

    // Validación básica de campos obligatorios
    if (!cliente_nombre || !cliente_telefono || !manicurista_nombre || !servicio_nombre || !fecha || !hora_inicio) {
      return NextResponse.json(
        { success: false, message: 'Faltan campos obligatorios para registrar la cita.' },
        { status: 400 }
      );
    }

    // Insertar la cita en la base de datos Supabase
    const { data, error } = await supabase
      .from('citas')
      .insert([
        {
          cliente_nombre,
          cliente_telefono,
          manicurista_nombre,
          servicio_nombre,
          fecha,
          hora_inicio,
          hora_fin,
          duracion_minutos: duracion_minutos || 120,
          estado: 'confirmada'
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }

    // Generar enlaces de notificación de WhatsApp
    const datosCita = {
      cliente_nombre,
      cliente_telefono,
      manicurista_nombre,
      servicio_nombre,
      fecha,
      hora_inicio
    };

    const linkCliente = generarLinkWhatsApp(cliente_telefono, msgConfirmacionCliente(datosCita));
    const linkAdmin = generarLinkWhatsApp(TELEFONO_ADMIN, msgNotificacionAdmin(datosCita));

    return NextResponse.json(
      {
        success: true,
        message: 'Cita registrada con éxito',
        data,
        whatsappLinks: {
          cliente: linkCliente,
          admin: linkAdmin
        }
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}