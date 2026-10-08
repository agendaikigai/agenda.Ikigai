import { createClient } from '@supabase/supabase-js';

// 1. Cliente Anónimo para el Frontend (Navegador)
const getSupabaseCredentials = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://bfphnddoayzbmgayizah.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcGhuZGRvYXl6Ym1nYXlpemFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NTg4NjQsImV4cCI6MjEwNzAzNDg2NH0.3X3j4SFtGOL0Yeyh4l6eoc4udwBNrlBoDiPSA4Q9l3w';

  const validUrl = url.startsWith('http')
    ? url
    : 'https://bfphnddoayzbmgayizah.supabase.co';

  return { validUrl, key };
};

const { validUrl, key } = getSupabaseCredentials();

export const supabase = createClient(validUrl, key);

// 2. Cliente Admin para las API Routes (Servidor de Next.js)
// IMPORTANTE: Este cliente ignora RLS, úsalo ÚNICAMENTE dentro de la carpeta /app/api/
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'Falta la variable SUPABASE_SERVICE_ROLE_KEY en el archivo .env.local'
    );
  }

  return createClient(validUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};