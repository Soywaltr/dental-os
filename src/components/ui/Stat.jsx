// src/components/ui/Stat.jsx
// Tarjeta de indicador para las cabeceras de vista ("secciones de arriba"):
// ícono opcional en un círculo teñido con su color, etiqueta, cifra grande y
// una variación abajo. La usan Dashboard, Agenda, Caja, Laboratorio y
// Ortodoncia -- un solo componente para que cualquier KPI de la app se vea
// igual.
import React from 'react';
import { P, WA } from '../../utils/constants';

export default function Stat({ label, value, sub, subCol, col, icon, onClick }) {
  return (
    // Tarjeta de vidrio, igual que el resto de la app (ver GLASS_* en
    // utils/constants.js): fondo translúcido + blur + borde de luz. Usaba
    // --shadow-float (pensada para chrome persistente -- riel, header), no
    // --shadow-raised (la de una tarjeta de contenido) -- se corrige acá.
    <div onClick={onClick} style={{
      background: 'var(--panel-glass-bg)',
      backdropFilter: 'var(--panel-glass-blur)', WebkitBackdropFilter: 'var(--panel-glass-blur)',
      border: '1px solid var(--panel-glass-border)',
      borderRadius: 'var(--radius-panel)',
      boxShadow: 'var(--shadow-raised)',
      padding: '20px 22px', flex: 1, minWidth: 150,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow var(--dur-slow) var(--ease), transform var(--dur-slow) var(--ease)',
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--shadow-pop)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.boxShadow = 'var(--shadow-raised)'; e.currentTarget.style.transform = 'none'; } }}>
      {icon && (
        // El comentario de arriba decía "círculo" desde siempre, pero el radio
        // era var(--radius-control) -- un cuadrado suave, no un círculo. Ahora
        // sí es 50%, igual que el badge de ícono de los Atajos del Dashboard
        // (mismo concepto -- ícono sobre tinte del color -- misma forma).
        <div style={{
          width: 38, height: 38, borderRadius: '50%', marginBottom: 14,
          background: `color-mix(in srgb, ${col || P} 14%, var(--panel))`, color: col || P,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      )}
      {/* La cifra va en tinta neutra; el color vive en el ícono y en la
          variación de abajo. Así una fila de tarjetas no se vuelve un arcoíris. */}
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: subCol || WA, marginTop: 7, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}