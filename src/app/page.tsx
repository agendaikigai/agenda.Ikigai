'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { supabase } from '../lib/supabase';
import { generarLinkWhatsApp } from '@/lib/whatsapp';
import { msgConfirmacionCliente } from '@/lib/mensajesWhatsApp';
import ReporteSemanalModal from '@/components/ReporteSemanalModal';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

const COLORES_PREDEFINIDOS = [
  { bg: '#e9d5ff', border: '#8b5cf6', text: '#4c1d95' }, // Morado Cálido
  { bg: '#d9f99d', border: '#65a30d', text: '#1a2e05' }, // Verde Menta / Pistacho
  { bg: '#fbcfe8', border: '#db2777', text: '#831843' }, // Rosado Suave
  { bg: '#fef08a', border: '#ca8a04', text: '#713f12' }, // Amarillo Pastel
  { bg: '#bae6fd', border: '#0284c7', text: '#0c4a6e' }, // Celeste Suave
  { bg: '#fed7aa', border: '#ea580c', text: '#7c2d12' }, // Melocotón
];

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [citasList, setCitasList] = useState<any[]>([]);
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);

  // Estado para filtrado por especialista
  const [especialistaSeleccionada, setEspecialistaSeleccionada] = useState<string | null>(null);

  // Modales y estados
  const [modalOpen, setModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [reporteModalOpen, setReporteModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState<'citas' | 'especialistas' | 'servicios'>('citas');

  // Formularios rápidos de Admin
  const [nuevoEspNombre, setNuevoEspNombre] = useState('');
  const [nuevoServNombre, setNuevoServNombre] = useState('');
  const [nuevoServDuracion, setNuevoServDuracion] = useState(120);
  const [nuevoServPrecio, setNuevoServPrecio] = useState<number | string>(0);

  // Estado para editar/mover cita desde Admin
  const [editingCita, setEditingCita] = useState<any | null>(null);

  // Formulario cliente público
  const [formData, setFormData] = useState({
    cliente_nombre: '',
    cliente_telefono: '',
    manicurista_nombre: '',
    servicio_nombre: '',
    fecha: '',
    hora_inicio: '09:00'
  });

  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setFormData((prev) => ({ ...prev, fecha: hoy }));
  }, []);

  const fetchData = useCallback(async () => {
    // 1. Especialistas
    let currentEspecialistas: any[] = [];
    const { data: espData } = await supabase.from('especialistas').select('*').order('id', { ascending: true });
    if (espData && espData.length > 0) {
      currentEspecialistas = espData;
    } else {
      currentEspecialistas = [
        { id: 1, nombre: 'STEFANY' },
      ];
    }
    setEspecialistas(currentEspecialistas);
    setFormData((prev) => ({ ...prev, manicurista_nombre: prev.manicurista_nombre || currentEspecialistas[0]?.nombre || '' }));

    // 2. Servicios
    let currentServicios: any[] = [];
    const { data: servData } = await supabase.from('servicios').select('*').order('id', { ascending: true });
    if (servData && servData.length > 0) {
      currentServicios = servData;
    } else {
      currentServicios = [
        { id: 1, nombre: 'Manicure', duracion_minutos: 120, precio: 0 },
        { id: 2, nombre: 'Pedicure', duracion_minutos: 100, precio: 0 },
        { id: 3, nombre: 'Manicure + Pedicure', duracion_minutos: 220, precio: 0 }
      ];
    }
    setServicios(currentServicios);
    setFormData((prev) => ({ ...prev, servicio_nombre: prev.servicio_nombre || currentServicios[0]?.nombre || '' }));

    // 3. Citas
    const { data: citasData, error } = await supabase
      .from('citas')
      .select('*')
      .neq('estado', 'cancelada')
      .order('fecha', { ascending: true });

    if (!error && citasData) {
      setCitasList(citasData);

      const formattedEvents = citasData.map((item: any) => {
        let hInicio = item.hora_inicio || '09:00';
        let hFin = item.hora_fin;

        if (hInicio.length === 5) hInicio += ':00';

        if (!hFin) {
          const serv = currentServicios.find((s) => s.nombre === item.servicio_nombre);
          const duracionMin = serv ? serv.duracion_minutos : item.duracion_minutos || 120;
          const [h, m] = hInicio.split(':').map(Number);
          const totalMin = h * 60 + m + duracionMin;
          const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
          const endM = String(totalMin % 60).padStart(2, '0');
          hFin = `${endH}:${endM}:00`;
        } else if (hFin.length === 5) {
          hFin += ':00';
        }

        const clienteNom = item.cliente_nombre || 'Cliente';
        const servicioNom = item.servicio_nombre || 'Servicio';
        const manicuristaNom = item.manicurista_nombre || 'Especialista';

        const espIndex = currentEspecialistas.findIndex((e) => e.nombre.toLowerCase() === manicuristaNom.toLowerCase());
        const colores =
          espIndex !== -1
            ? COLORES_PREDEFINIDOS[espIndex % COLORES_PREDEFINIDOS.length]
            : COLORES_PREDEFINIDOS[0];

        return {
          id: String(item.id),
          resourceId: manicuristaNom,
          title: `${clienteNom}\n${servicioNom}`,
          start: `${item.fecha}T${hInicio}`,
          end: `${item.fecha}T${hFin}`,
          backgroundColor: colores.bg,
          textColor: colores.text,
          borderColor: colores.border,
          extendedProps: {
            rawCita: item,
            cliente: clienteNom,
            servicio: servicioNom,
            manicurista: manicuristaNom,
            horaInicioStr: hInicio.substring(0, 5),
            horaFinStr: hFin.substring(0, 5)
          }
        };
      });

      setEvents(formattedEvents);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Login Admin
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = adminPasswordInput ? adminPasswordInput.trim() : '';

    if (!cleanPassword) {
      alert('Por favor, ingresa la contraseña de administrador.');
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanPassword })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAdmin(true);
        setAdminPasswordInput('');
      } else {
        alert(data.message || 'Contraseña incorrecta');
      }
    } catch (error) {
      console.error('Error al autenticar admin:', error);
      alert('Ocurrió un error de red al intentar iniciar sesión.');
    }
  };

  // Validar restricciones de horario y días (Lunes a Sábado, 9:00 AM a 5:00 PM)
  const validarHorarioYDia = (fechaStr: string, horaInicioStr: string, duracionMinutos: number) => {
    const [year, month, day] = fechaStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek === 0) {
      alert('⚠️ Solo se pueden agendar citas de Lunes a Sábado.');
      return false;
    }

    const [h, m] = horaInicioStr.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + duracionMinutos;

    const limiteInicioMin = 9 * 60;
    const limiteFinMin = 18 * 60;

    if (startMin < limiteInicioMin || endMin > limiteFinMin) {
      alert('⚠️ El horario permitido de atención es de 9:00 AM a 6:00 PM. Por favor selecciona un horario adecuado.');
      return false;
    }

    return true;
  };

  // Notificación por WhatsApp
  const notificarPorWhatsApp = (datosNuevaCita: any) => {
    const urlCliente = generarLinkWhatsApp(
      datosNuevaCita.cliente_telefono,
      msgConfirmacionCliente(datosNuevaCita)
    );

    const win = window.open(urlCliente, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = urlCliente;
    }
  };

  // Abrir modal de nueva cita con especialista preseleccionada
  const handleAbrirModalCita = () => {
    if (especialistaSeleccionada) {
      setFormData((prev) => ({ ...prev, manicurista_nombre: especialistaSeleccionada }));
    }
    setModalOpen(true);
  };

  // Clic directo sobre una celda vacía del grid
  const handleDateClick = (arg: any) => {
    const fechaSeleccionada = arg.dateStr.split('T')[0];
    
    let horaSeleccionada = '09:00';
    if (arg.dateStr.includes('T')) {
      horaSeleccionada = arg.dateStr.split('T')[1].substring(0, 5);
    }

    const especialistaAAsignar = especialistaSeleccionada || (especialistas[0]?.nombre || '');

    setFormData((prev) => ({
      ...prev,
      fecha: fechaSeleccionada,
      hora_inicio: horaSeleccionada,
      manicurista_nombre: especialistaAAsignar
    }));

    setModalOpen(true);
  };

  // Clic sobre un evento existente
  const handleEventClick = (arg: any) => {
    if (!isAdmin) return;
    const rawCita = arg.event.extendedProps.rawCita;
    if (rawCita) {
      setEditingCita(rawCita);
      setAdminTab('citas');
      setAdminModalOpen(true);
    }
  };

  // Crear cita público
  const handleSubmitCita = async (e: React.FormEvent) => {
    e.preventDefault();

    const servObj = servicios.find((s) => s.nombre === formData.servicio_nombre);
    const duracionMin = servObj ? servObj.duracion_minutos : 120;

    if (!validarHorarioYDia(formData.fecha, formData.hora_inicio, duracionMin)) {
      return;
    }

    const [h, m] = formData.hora_inicio.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + duracionMin;
    const horaFinCalc = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const colision = events.some((evt) => {
      if (evt.resourceId !== formData.manicurista_nombre) return false;
      const evtFecha = evt.start.split('T')[0];
      if (evtFecha !== formData.fecha) return false;

      const [eHStart, eMStart] = evt.start.split('T')[1].split(':').map(Number);
      const [eHEnd, eMEnd] = evt.end.split('T')[1].split(':').map(Number);
      const evtStartMin = eHStart * 60 + eMStart;
      const evtEndMin = eHEnd * 60 + eMEnd;

      return startMin < evtEndMin && endMin > evtStartMin;
    });

    if (colision) {
      alert(`⚠️ La especialista ${formData.manicurista_nombre} ya tiene una cita agendada en ese rango de horario.`);
      return;
    }

    const payload = {
      cliente_nombre: formData.cliente_nombre,
      cliente_telefono: formData.cliente_telefono,
      manicurista_nombre: formData.manicurista_nombre,
      servicio_nombre: formData.servicio_nombre,
      fecha: formData.fecha,
      hora_inicio: formData.hora_inicio,
      hora_fin: horaFinCalc,
      duracion_minutos: duracionMin,
      estado: 'confirmada'
    };

    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        alert('¡Cita agendada correctamente!');
        setModalOpen(false);
        fetchData();
        notificarPorWhatsApp(payload);
      } else {
        alert(`Error al guardar cita: ${result.message || 'Ocurrió un error en el servidor.'}`);
      }
    } catch (err) {
      console.error('Error al guardar cita:', err);
      alert('Error de conexión al intentar guardar la cita.');
    }
  };

  // Acciones Rápidas
  const handleLiberarCita = async (id: number) => {
    if (!confirm('¿Deseas liberar/cancelar este espacio de cita?')) return;
    const { error } = await supabase.from('citas').update({ estado: 'cancelada' }).eq('id', id);
    if (!error) {
      alert('Cita liberada con éxito.');
      fetchData();
    } else {
      alert('Error al liberar la cita: ' + error.message);
    }
  };

  const handleEliminarCita = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar permanentemente esta cita?')) return;
    const { error } = await supabase.from('citas').delete().eq('id', id);
    if (!error) {
      alert('Cita eliminada correctamente.');
      fetchData();
    } else {
      alert('Error al eliminar la cita: ' + error.message);
    }
  };

  const handleGuardarModificacionCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCita) return;

    const servObj = servicios.find((s) => s.nombre === editingCita.servicio_nombre);
    const duracionMin = servObj ? servObj.duracion_minutos : editingCita.duracion_minutos || 120;

    if (!validarHorarioYDia(editingCita.fecha, editingCita.hora_inicio, duracionMin)) {
      return;
    }

    const [h, m] = editingCita.hora_inicio.split(':').map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + duracionMin;
    const horaFinCalc = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

    const { error } = await supabase
      .from('citas')
      .update({
        cliente_nombre: editingCita.cliente_nombre,
        cliente_telefono: editingCita.cliente_telefono,
        manicurista_nombre: editingCita.manicurista_nombre,
        servicio_nombre: editingCita.servicio_nombre,
        fecha: editingCita.fecha,
        hora_inicio: editingCita.hora_inicio,
        hora_fin: horaFinCalc,
        duracion_minutos: duracionMin
      })
      .eq('id', editingCita.id);

    if (!error) {
      alert('Cita modificada con éxito.');
      setEditingCita(null);
      fetchData();
    } else {
      alert('Error al modificar cita: ' + error.message);
    }
  };

  const handleAgregarEspecialista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEspNombre.trim()) return;

    const { error } = await supabase.from('especialistas').insert([{ nombre: nuevoEspNombre.trim() }]);
    if (!error) {
      alert('Especialista agregado(a) con éxito.');
      setNuevoEspNombre('');
      fetchData();
    } else {
      alert('Error al agregar especialista: ' + error.message);
    }
  };

  const handleEliminarEspecialista = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este especialista?')) return;
    const { error } = await supabase.from('especialistas').delete().eq('id', id);
    if (!error) {
      alert('Especialista eliminado.');
      fetchData();
    } else {
      alert('Error al eliminar especialista: ' + error.message);
    }
  };

  const handleAgregarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoServNombre.trim()) return;

    const { error } = await supabase
      .from('servicios')
      .insert([
        { 
          nombre: nuevoServNombre.trim(), 
          duracion_minutos: Number(nuevoServDuracion),
          precio: Number(nuevoServPrecio) || 0 
        }
      ]);

    if (!error) {
      alert('Servicio agregado con éxito.');
      setNuevoServNombre('');
      setNuevoServDuracion(120);
      setNuevoServPrecio(0);
      fetchData();
    } else {
      alert('Error al agregar servicio: ' + error.message);
    }
  };

  const handleEliminarServicio = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este servicio?')) return;
    const { error } = await supabase.from('servicios').delete().eq('id', id);
    if (!error) {
      alert('Servicio eliminado.');
      fetchData();
    } else {
      alert('Error al eliminar servicio: ' + error.message);
    }
  };

  // Eventos y citas filtrados según especialistaSeleccionada
  const eventsFiltrados = especialistaSeleccionada
    ? events.filter((e) => e.extendedProps.manicurista.toLowerCase() === especialistaSeleccionada.toLowerCase())
    : events;

  const citasFiltradas = especialistaSeleccionada
    ? citasList.filter((c) => c.manicurista_nombre.toLowerCase() === especialistaSeleccionada.toLowerCase())
    : citasList;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#fcf8ff', padding: '1.25rem' }}>
      <style jsx global>{`
  /* 1. Ampliación y apertura de desbordamiento en la columna del tiempo */
  .fc .fc-timegrid-axis,
  .fc .fc-timegrid-slot-label,
  .fc col.fc-timegrid-axis {
    width: 110px !important;
    min-width: 110px !important;
    max-width: 110px !important;
    background-color: #f7fee7 !important; /* Verde menta clarito */
    border-right: 2px solid #e9d5ff !important; /* Separación morada con el día lunes */
    overflow: visible !important;
  }

  .fc .fc-timegrid-axis-frame,
  .fc .fc-timegrid-slot-label-frame,
  .fc-timegrid-slots,
  .fc-timegrid-cols {
    overflow: visible !important;
  }

  .fc .fc-timegrid-slot-label-frame {
    text-align: center !important;
    font-weight: 600 !important;
    color: #581c87 !important;
  }

  .fc .fc-v-event {
    border-radius: 10px !important;
    border: none !important;
    box-shadow: 0 4px 8px -2px rgba(139, 92, 246, 0.2) !important;
    padding: 6px 8px !important;
  }

  /* 2. Óvalo indicador de hora actual centrado y flotante */
  .fc .fc-timegrid-now-indicator-arrow {
    margin-top: -13px !important;
    left: 10px !important;
    border: 1.5px solid #7c3aed !important;
    background-color: #7c3aed !important;
    color: #ffffff !important;
    font-size: 0.75rem !important;
    font-weight: 800 !important;
    padding: 3px 10px !important;
    border-radius: 9999px !important;
    z-index: 50 !important;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4);
    white-space: nowrap !important;
    display: inline-block !important;
    visibility: visible !important;
  }

  .fc .fc-timegrid-now-indicator-line {
    border-color: #8b5cf6 !important;
    border-width: 2px 0 0 0 !important;
    z-index: 40 !important;
  }

  /* Estilos de botones */
  .fc .fc-button-primary {
    background-color: #f3e8ff !important;
    border-color: #e9d5ff !important;
    color: #6b21a8 !important;
    font-weight: 700 !important;
    border-radius: 10px !important;
    box-shadow: none !important;
  }

  .fc .fc-button-primary:hover {
    background-color: #e9d5ff !important;
    color: #581c87 !important;
  }

  .fc .fc-button-active {
    background-color: #8b5cf6 !important;
    border-color: #8b5cf6 !important;
    color: #ffffff !important;
  }

  .fc-theme-standard td, .fc-theme-standard th {
    border-color: #f3e8ff !important;
  }

  .fc-timegrid-body {
    position: relative !important;
    overflow: visible !important;
  }

  .fc-timegrid-slot {
    cursor: pointer;
  }
`}</style>

      <div style={{ maxWidth: '1220px', margin: '0 auto', backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '1.25rem', boxShadow: '0 4px 20px -2px rgba(139, 92, 246, 0.08)', border: '1px solid #f3e8ff' }}>
        
        {/* Encabezado e Indicadores / Filtros de Especialistas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setEspecialistaSeleccionada(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.3rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                opacity: especialistaSeleccionada === null ? 1 : 0.5,
                transform: especialistaSeleccionada === null ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: especialistaSeleccionada === null ? '#8b5cf6' : '#f3e8ff',
                color: especialistaSeleccionada === null ? '#ffffff' : '#6b21a8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                boxShadow: '0 2px 6px rgba(139,92,246,0.15)'
              }}>
                TODAS
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#581c87', letterSpacing: '0.05em' }}>
                TODAS
              </span>
            </button>

            {especialistas.map((esp, idx) => {
              const col = COLORES_PREDEFINIDOS[idx % COLORES_PREDEFINIDOS.length];
              const inicial = esp.nombre ? esp.nombre.charAt(0).toUpperCase() : '?';
              const estaSeleccionada = especialistaSeleccionada?.toLowerCase() === esp.nombre.toLowerCase();

              return (
                <button
                  key={esp.id || idx}
                  type="button"
                  onClick={() => setEspecialistaSeleccionada(estaSeleccionada ? null : esp.nombre)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.3rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    opacity: especialistaSeleccionada === null || estaSeleccionada ? 1 : 0.4,
                    transform: estaSeleccionada ? 'scale(1.08)' : 'scale(1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: estaSeleccionada ? col.border : '#ffffff',
                    border: `2px solid ${col.border}`,
                    color: estaSeleccionada ? '#ffffff' : col.border,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}>
                    {inicial}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#581c87', letterSpacing: '0.05em' }}>
                    {esp.nombre ? esp.nombre.toUpperCase() : ''}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setAdminModalOpen(true)}
            style={{ backgroundColor: isAdmin ? '#7c3aed' : '#f3e8ff', color: isAdmin ? '#ffffff' : '#6b21a8', padding: '0.55rem 1.1rem', borderRadius: '0.625rem', border: '1px solid #e9d5ff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {isAdmin ? '🔓 Panel Admin' : '🔒 Panel Admin'}
          </button>
        </div>

        {/* Header Agenda Ikigai con Logo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '58px', height: '58px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #f3e8ff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(139,92,246,0.12)' }}>
              <img
                src="/logoIKIGAI.jpeg"
                alt="Ikigai Logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#4c1d95', margin: 0, letterSpacing: '-0.02em' }}>
                Agenda Ikigai {especialistaSeleccionada ? `- ${especialistaSeleccionada.toUpperCase()}` : ''}
              </h1>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#7c3aed', opacity: 0.85 }}>Horario de atención de Lunes a Sábado, 9:00 AM - 5:00 PM</p>
            </div>
          </div>

          <button
            onClick={handleAbrirModalCita}
            style={{ backgroundColor: '#84cc16', color: '#1a2e05', padding: '0.6rem 1.25rem', borderRadius: '0.625rem', fontWeight: 800, cursor: 'pointer', border: 'none', boxShadow: '0 4px 12px rgba(132,204,22,0.3)', transition: 'all 0.2s ease' }}
          >
            + Nueva Cita
          </button>
        </div>

        {/* Calendario */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale={esLocale}
            nowIndicator={true}
            now={new Date()}
            selectable={true}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            nowIndicatorContent={(args: any) => {
              if (args.isAxis) {
                const date = args.date || new Date();
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const hours12 = hours % 12 === 0 ? 12 : hours % 12;
                const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
                const ampm = hours >= 12 ? 'PM' : 'AM';
                return `${hours12}:${minutesFormatted} ${ampm}`;
              }
              return null;
            }}
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek'
            }}
            buttonText={{
              today: 'Hoy',
              timeGridDay: 'Día',
              timeGridWeek: 'Semana'
            }}
            slotMinTime="09:00:00"
            slotMaxTime="18:00:00"
            allDaySlot={false}
            events={eventsFiltrados}
            eventContent={(eventInfo: any) => {
              const { cliente, servicio, horaInicioStr, horaFinStr } = eventInfo.event.extendedProps;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start', color: eventInfo.event.textColor }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 'bold', opacity: 0.9 }}>
                    {horaInicioStr} - {horaFinStr}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', margin: '2px 0 1px 0', lineHeight: '1.1' }}>
                    {cliente}
                  </div>
                  <div style={{ fontSize: '0.73rem', fontWeight: '600', textTransform: 'uppercase', opacity: 0.95 }}>
                    {servicio}
                  </div>
                </div>
              );
            }}
          />
        </div>

      </div>

      {/* MODAL CREAR CITA PÚBLICO */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(243, 232, 255, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '1rem', maxWidth: '420px', width: '100%', boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.15)', border: '1px solid #f3e8ff' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#4c1d95' }}>Agendar Nueva Cita</h2>
            <p style={{ fontSize: '0.78rem', color: '#7c3aed', marginBottom: '1.25rem', opacity: 0.85 }}>Horario: Lunes a Sábado (9:00 AM - 6:00 PM)</p>
            
            <form onSubmit={handleSubmitCita} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formData.cliente_nombre}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  style={{ width: '100%', border: '1px solid #e9d5ff', padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box', outlineColor: '#8b5cf6' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>Teléfono</label>
                <input
                  type="tel"
                  required
                  value={formData.cliente_telefono}
                  onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                  style={{ width: '100%', border: '1px solid #e9d5ff', padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box', outlineColor: '#8b5cf6' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>Especialista</label>
                <select
                  value={formData.manicurista_nombre}
                  onChange={(e) => setFormData({ ...formData, manicurista_nombre: e.target.value })}
                  style={{ width: '100%', border: '1px solid #e9d5ff', padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.875rem', backgroundColor: '#fff', boxSizing: 'border-box', outlineColor: '#8b5cf6' }}
                >
                  {especialistas.map((esp) => (
                    <option key={esp.id} value={esp.nombre}>{esp.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>Servicio</label>
                <select
                  value={formData.servicio_nombre}
                  onChange={(e) => setFormData({ ...formData, servicio_nombre: e.target.value })}
                  style={{ width: '100%', border: '1px solid #e9d5ff', padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.875rem', backgroundColor: '#fff', boxSizing: 'border-box', outlineColor: '#8b5cf6' }}
                >
                  {servicios.map((s) => (
                    <option key={s.id} value={s.nombre}>{s.nombre} ({s.duracion_minutos} min)</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>Fecha</label>
                  <input
                    type="date"
                    required
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    style={{ width: '100%', border: '1px solid #e9d5ff', padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box', outlineColor: '#8b5cf6' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>Hora de Inicio</label>
                  <input
                    type="time"
                    required
                    min="09:00"
                    max="17:00"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    style={{ width: '100%', border: '1px solid #e9d5ff', padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box', outlineColor: '#8b5cf6' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '0.55rem 0.85rem', backgroundColor: '#f3e8ff', color: '#6b21a8', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1rem', backgroundColor: '#84cc16', color: '#1a2e05', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}
                >
                  Confirmar Cita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADMIN */}
      {adminModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(243, 232, 255, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '1rem', maxWidth: isAdmin ? '850px' : '380px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.15)', border: '1px solid #f3e8ff' }}>
            
            {!isAdmin ? (
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', marginBottom: '0.85rem', color: '#4c1d95' }}>Acceso Administrativo</h2>
                <form onSubmit={handleAdminAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#581c87', marginBottom: '0.25rem' }}>Contraseña de Administrador</label>
                    <input
                      type="password"
                      placeholder="Ingrese su clave"
                      value={adminPasswordInput}
                      required
                      autoFocus
                      style={{ width: '100%', border: '1px solid #e9d5ff', padding: '0.55rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box', outlineColor: '#8b5cf6' }}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setAdminModalOpen(false)}
                      style={{ padding: '0.55rem 0.85rem', backgroundColor: '#f3e8ff', color: '#6b21a8', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '0.55rem 1rem', backgroundColor: '#8b5cf6', color: '#ffffff', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                    >
                      Ingresar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4c1d95', margin: 0 }}>Panel Administrativo</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setReporteModalOpen(true)}
                      style={{ padding: '0.4rem 0.8rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      📊 Reporte Semanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminModalOpen(false)}
                      style={{ padding: '0.4rem 0.8rem', backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      ✕ Cerrar
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #f3e8ff', marginBottom: '1rem' }}>
                  <button
                    onClick={() => setAdminTab('citas')}
                    style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer', borderBottom: adminTab === 'citas' ? '3px solid #8b5cf6' : 'transparent', color: adminTab === 'citas' ? '#8b5cf6' : '#6b21a8' }}
                  >
                    📅 Citas ({citasFiltradas.length})
                  </button>
                  <button
                    onClick={() => setAdminTab('especialistas')}
                    style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer', borderBottom: adminTab === 'especialistas' ? '3px solid #8b5cf6' : 'transparent', color: adminTab === 'especialistas' ? '#8b5cf6' : '#6b21a8' }}
                  >
                    💅 Especialistas ({especialistas.length})
                  </button>
                  <button
                    onClick={() => setAdminTab('servicios')}
                    style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, cursor: 'pointer', borderBottom: adminTab === 'servicios' ? '3px solid #8b5cf6' : 'transparent', color: adminTab === 'servicios' ? '#8b5cf6' : '#6b21a8' }}
                  >
                    ✨ Servicios ({servicios.length})
                  </button>
                </div>

                {/* TAB CITAS */}
                {adminTab === 'citas' && (
                  <div>
                    {editingCita && (
                      <div style={{ backgroundColor: '#fcf8ff', border: '1px solid #e9d5ff', padding: '0.85rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#581c87', fontSize: '0.9rem' }}>Modificar Cita ID #{editingCita.id}</h4>
                        <form onSubmit={handleGuardarModificacionCita} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                          <input
                            type="text"
                            placeholder="Cliente"
                            value={editingCita.cliente_nombre}
                            onChange={(e) => setEditingCita({ ...editingCita, cliente_nombre: e.target.value })}
                            style={{ padding: '0.4rem', border: '1px solid #e9d5ff', borderRadius: '0.375rem' }}
                            required
                          />
                          <input
                            type="text"
                            placeholder="Teléfono"
                            value={editingCita.cliente_telefono}
                            onChange={(e) => setEditingCita({ ...editingCita, cliente_telefono: e.target.value })}
                            style={{ padding: '0.4rem', border: '1px solid #e9d5ff', borderRadius: '0.375rem' }}
                            required
                          />
                          <select
                            value={editingCita.manicurista_nombre}
                            onChange={(e) => setEditingCita({ ...editingCita, manicurista_nombre: e.target.value })}
                            style={{ padding: '0.4rem', border: '1px solid #e9d5ff', borderRadius: '0.375rem', backgroundColor: '#fff' }}
                          >
                            {especialistas.map((esp) => (
                              <option key={esp.id} value={esp.nombre}>{esp.nombre}</option>
                            ))}
                          </select>
                          <select
                            value={editingCita.servicio_nombre}
                            onChange={(e) => setEditingCita({ ...editingCita, servicio_nombre: e.target.value })}
                            style={{ padding: '0.4rem', border: '1px solid #e9d5ff', borderRadius: '0.375rem', backgroundColor: '#fff' }}
                          >
                            {servicios.map((s) => (
                              <option key={s.id} value={s.nombre}>{s.nombre}</option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={editingCita.fecha}
                            onChange={(e) => setEditingCita({ ...editingCita, fecha: e.target.value })}
                            style={{ padding: '0.4rem', border: '1px solid #e9d5ff', borderRadius: '0.375rem' }}
                            required
                          />
                          <input
                            type="time"
                            value={editingCita.hora_inicio}
                            min="09:00"
                            max="17:00"
                            onChange={(e) => setEditingCita({ ...editingCita, hora_inicio: e.target.value })}
                            style={{ padding: '0.4rem', border: '1px solid #e9d5ff', borderRadius: '0.375rem' }}
                            required
                          />
                          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                            <button type="button" onClick={() => setEditingCita(null)} style={{ padding: '0.35rem 0.75rem', backgroundColor: '#f3e8ff', color: '#6b21a8', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancelar</button>
                            <button type="submit" style={{ padding: '0.35rem 0.75rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 600 }}>Guardar Cambios</button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#fcf8ff', borderBottom: '1px solid #f3e8ff' }}>
                            <th style={{ padding: '0.6rem', color: '#581c87' }}>Fecha</th>
                            <th style={{ padding: '0.6rem', color: '#581c87' }}>Hora</th>
                            <th style={{ padding: '0.6rem', color: '#581c87' }}>Cliente</th>
                            <th style={{ padding: '0.6rem', color: '#581c87' }}>Especialista</th>
                            <th style={{ padding: '0.6rem', color: '#581c87' }}>Servicio</th>
                            <th style={{ padding: '0.6rem', color: '#581c87' }}>Acciones Rápidas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {citasFiltradas.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', color: '#7c3aed' }}>No hay citas registradas.</td>
                            </tr>
                          ) : (
                            citasFiltradas.map((cita) => (
                              <tr key={cita.id} style={{ borderBottom: '1px solid #fcf8ff' }}>
                                <td style={{ padding: '0.6rem' }}>{cita.fecha}</td>
                                <td style={{ padding: '0.6rem' }}>{cita.hora_inicio} - {cita.hora_fin}</td>
                                <td style={{ padding: '0.6rem' }}><strong>{cita.cliente_nombre}</strong><br/><span style={{ color: '#7c3aed', opacity: 0.85 }}>{cita.cliente_telefono}</span></td>
                                <td style={{ padding: '0.6rem' }}>{cita.manicurista_nombre}</td>
                                <td style={{ padding: '0.6rem' }}>{cita.servicio_nombre}</td>
                                <td style={{ padding: '0.6rem' }}>
                                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    <button
                                      onClick={() => {
                                        const urlCliente = generarLinkWhatsApp(cita.cliente_telefono, msgConfirmacionCliente(cita));
                                        window.open(urlCliente, '_blank');
                                      }}
                                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                                    >
                                      💬 WhatsApp
                                    </button>
                                    <button
                                      onClick={() => setEditingCita(cita)}
                                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      ✏️ Cambiar
                                    </button>
                                    <button
                                      onClick={() => handleLiberarCita(cita.id)}
                                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      🔓 Liberar
                                    </button>
                                    <button
                                      onClick={() => handleEliminarCita(cita.id)}
                                      style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                                    >
                                      🗑️ Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB ESPECIALISTAS */}
                {adminTab === 'especialistas' && (
                  <div>
                    <form onSubmit={handleAgregarEspecialista} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Nombre de nueva especialista"
                        value={nuevoEspNombre}
                        onChange={(e) => setNuevoEspNombre(e.target.value)}
                        style={{ flex: 1, padding: '0.55rem', border: '1px solid #e9d5ff', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                        required
                      />
                      <button
                        type="submit"
                        style={{ padding: '0.55rem 1rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        + Agregar
                      </button>
                    </form>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fcf8ff', borderBottom: '1px solid #f3e8ff', textAlign: 'left' }}>
                          <th style={{ padding: '0.6rem', color: '#581c87' }}>ID</th>
                          <th style={{ padding: '0.6rem', color: '#581c87' }}>Nombre</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right', color: '#581c87' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {especialistas.map((esp) => (
                          <tr key={esp.id} style={{ borderBottom: '1px solid #fcf8ff' }}>
                            <td style={{ padding: '0.6rem' }}>#{esp.id}</td>
                            <td style={{ padding: '0.6rem', fontWeight: 600 }}>{esp.nombre}</td>
                            <td style={{ padding: '0.6rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleEliminarEspecialista(esp.id)}
                                style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                🗑️ Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB SERVICIOS */}
                {adminTab === 'servicios' && (
                  <div>
                    <form onSubmit={handleAgregarServicio} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Nombre del servicio"
                        value={nuevoServNombre}
                        onChange={(e) => setNuevoServNombre(e.target.value)}
                        style={{ padding: '0.55rem', border: '1px solid #e9d5ff', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Duración (min)"
                        value={nuevoServDuracion}
                        onChange={(e) => setNuevoServDuracion(Number(e.target.value))}
                        style={{ padding: '0.55rem', border: '1px solid #e9d5ff', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio ($)"
                        value={nuevoServPrecio}
                        onChange={(e) => setNuevoServPrecio(e.target.value)}
                        style={{ padding: '0.55rem', border: '1px solid #e9d5ff', borderRadius: '0.5rem', fontSize: '0.85rem' }}
                      />
                      <button
                        type="submit"
                        style={{ padding: '0.55rem 1rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        + Agregar
                      </button>
                    </form>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#fcf8ff', borderBottom: '1px solid #f3e8ff', textAlign: 'left' }}>
                          <th style={{ padding: '0.6rem', color: '#581c87' }}>ID</th>
                          <th style={{ padding: '0.6rem', color: '#581c87' }}>Servicio</th>
                          <th style={{ padding: '0.6rem', color: '#581c87' }}>Duración</th>
                          <th style={{ padding: '0.6rem', color: '#581c87' }}>Precio</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right', color: '#581c87' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servicios.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #fcf8ff' }}>
                            <td style={{ padding: '0.6rem' }}>#{s.id}</td>
                            <td style={{ padding: '0.6rem', fontWeight: 600 }}>{s.nombre}</td>
                            <td style={{ padding: '0.6rem' }}>{s.duracion_minutos} min</td>
                            <td style={{ padding: '0.6rem' }}>${s.precio ?? 0}</td>
                            <td style={{ padding: '0.6rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleEliminarServicio(s.id)}
                                style={{ padding: '0.25rem 0.5rem', backgroundColor: '#f43f5e', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                🗑️ Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL REPORTE SEMANAL */}
      <ReporteSemanalModal
        isOpen={reporteModalOpen}
        onClose={() => setReporteModalOpen(false)}
        citas={citasList}
        servicios={servicios}
      />
    </main>
  );
}