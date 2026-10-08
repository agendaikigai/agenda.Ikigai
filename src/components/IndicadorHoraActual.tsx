'use client';

import React, { useState, useEffect } from 'react';

interface IndicadorHoraProps {
  startHour?: number; // Hora inicio cuadrante (default: 9 para las 9:00 AM)
  endHour?: number;   // Hora fin cuadrante (default: 18 para las 6:00 PM / 18:00)
  rowHeight?: number; // Altura en píxeles de cada bloque de hora (ajusta si difiere)
}

export default function IndicadorHoraActual({
  startHour = 9,
  endHour = 18,
  rowHeight = 60
}: IndicadorHoraProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Actualiza cada minuto

    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Verificar si la hora actual está dentro del rango visible del calendario
  if (hours < startHour || hours >= endHour) {
    return null;
  }

  // Calcular la posición vertical exacta en px desde la parte superior de la cuadrícula
  const totalMinutesFromStart = (hours - startHour) * 60 + minutes;
  const topPosition = (totalMinutesFromStart / 60) * rowHeight;

  // Formatear hora a 12h (ej. 14:50 -> 2:50)
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
  const timeLabel = `${hours12}:${minutesFormatted}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${topPosition}px`,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        zIndex: 20,
        pointerEvents: 'none'
      }}
    >
      {/* Óvalo con la hora exacta */}
      <div
        style={{
          backgroundColor: '#ffffff',
          color: '#ef4444',
          border: '2px solid #ef4444',
          borderRadius: '9999px',
          padding: '1px 7px',
          fontSize: '0.72rem',
          fontWeight: 'bold',
          lineHeight: 1,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
          marginLeft: '4px',
          whiteSpace: 'nowrap',
          zIndex: 21
        }}
      >
        {timeLabel}
      </div>

      {/* Línea horizontal continua roja */}
      <div
        style={{
          flex: 1,
          height: '2px',
          backgroundColor: '#ef4444',
          width: '100%'
        }}
      />
    </div>
  );
}