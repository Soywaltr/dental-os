// src/components/ui/TabsScroll.jsx
// Pestañas de ancho automático con scroll horizontal, para listas de
// categorías de largo variable (ej. especialidades: "12M" y "Rehabilitación"
// no pueden ser columnas del mismo ancho sin que una sobre o la otra se
// apriete). SegmentedControl (ui/SegmentedControl.jsx) sigue siendo mejor
// para 2-4 opciones cortas y parejas -- esto es lo que corresponde cuando no
// lo son.
import React from 'react';

export default function TabsScroll({ options, value, onChange, style }) {
  return (
    <div role="tablist" className="tabs-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', ...style }}>
      {options.map(o => {
        const activo = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(o.key)}
            className="tab-pill"
            style={{
              flexShrink: 0, border: 'none', cursor: 'pointer', font: 'inherit',
              padding: '7px 14px', borderRadius: 'var(--radius-pill)',
              fontSize: 12.5, fontWeight: activo ? 600 : 500,
              background: activo ? 'var(--accent-soft)' : 'transparent',
              color: activo ? 'var(--accent)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap', transition: 'background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
