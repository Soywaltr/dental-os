// src/components/ui/Stat.jsx
// Tarjeta de indicador para las cabeceras de vista ("secciones de arriba"):
// ícono opcional en un círculo teñido con su color, etiqueta, cifra grande y
// una variación abajo. Un solo componente para que cualquier KPI de la app
// (Reportes, Caja, o cabeceras nuevas) se vea igual.
import React from 'react';
import { BD, P, MU, DN, LT, WA } from '../../utils/constants';

export default function Stat({ label, value, sub, subCol, col, icon, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)',
      padding: '14px 16px', flex: 1, minWidth: 130, cursor: onClick ? 'pointer' : 'default',
      transition: `border-color 0.15s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)`,
    }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = col || P; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = BD; e.currentTarget.style.boxShadow = 'none'; } }}>
      {icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 'var(--radius-sm)', marginBottom: 10,
          background: `color-mix(in srgb, ${col || P} 12%, transparent)`, color: col || P,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 11, color: MU, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: col || DN, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: subCol || WA, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}