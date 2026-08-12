// src/components/ui/Stat.jsx
// Tarjeta de indicador para las cabeceras de vista ("secciones de arriba"):
// ícono opcional en un círculo teñido con su color, etiqueta, cifra grande y
// una variación abajo. La usan Dashboard, Agenda, Caja, Laboratorio y
// Ortodoncia -- un solo componente para que cualquier KPI de la app se vea
// igual.
import React from 'react';
import { P, WA, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

export default function Stat({ label, value, sub, subCol, col, icon, onClick }) {
  return (
    // GLASS_* de utils/constants.js, no --panel-glass-* a mano: esos tokens
    // ya no existen desde que se volvió al lenguaje plano (violeta) -- este
    // componente seguía apuntando a ellos y su fondo quedaba transparente,
    // sin que se notara del todo por encima de un fondo ya casi blanco. Bug
    // real, no sólo estético.
    <div onClick={onClick} style={{
      background: GLASS_BG,
      backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
      border: GLASS_BORDER,
      borderRadius: 'var(--radius-panel)',
      boxShadow: GLASS_SHADOW,
      padding: '18px 20px', flex: 1, minWidth: 150,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow var(--dur-slow) var(--ease), transform var(--dur-slow) var(--ease)',
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--shadow-pop)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = GLASS_SHADOW; e.currentTarget.style.transform = 'none'; } }}>
      {icon && (
        <div style={{
          width: 36, height: 36, borderRadius: '50%', marginBottom: 12,
          background: `color-mix(in srgb, ${col || P} 14%, var(--panel))`, color: col || P,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      )}
      {/* La cifra va en tinta neutra; el color vive en el ícono y en la
          píldora de variación. Así una fila de tarjetas no se vuelve un
          arcoíris. */}
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {/* Píldora, no texto suelto de color -- así se ve como el badge de la
          referencia sin depender de que el texto sea corto: 4 de los 5 usos
          de `sub` en la app son frases largas ("cuotas iniciales + mensuales
          + extras"), no un delta de 3 caracteres -- un badge en la esquina se
          hubiera roto ahí. Va debajo del número, donde el texto puede
          envolver sin problema. */}
      {sub && (
        <span style={{
          display: 'inline-block', marginTop: 8,
          fontSize: 11.5, fontWeight: 600, color: subCol || WA,
          background: `color-mix(in srgb, ${subCol || WA} 12%, transparent)`,
          padding: '2px 9px', borderRadius: 'var(--radius-pill)',
        }}>
          {sub}
        </span>
      )}
    </div>
  );
}