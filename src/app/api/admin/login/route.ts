import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inputPassword = body?.password ? String(body.password).trim() : '';

    // Lee la clave de las variables de entorno o usa 'admin123' por defecto
    const envPassword = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    const targetPassword = String(envPassword).trim();

    if (inputPassword && inputPassword === targetPassword) {
      return NextResponse.json(
        { success: true, message: 'Acceso concedido' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Contraseña incorrecta' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Error en /api/admin/login:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}