// src/components/ui/TabsWrap.jsx
// Pestañas de ancho automático, para listas de categorías de largo variable
// (ej. especialidades: "12M" y "Rehabilitación" no pueden ser columnas del
// mismo ancho sin que una sobre o la otra se apriete). Si no entran todas en
// una fila, bajan a la siguiente -- nunca scroll ni recorte: en una tarjeta
// de ancho variable no hay forma de garantizar que siempre quepan en una
// sola línea, y un texto cortado a la mitad es peor que ocupar dos líneas.
// SegmentedControl (ui/SegmentedControl.jsx) sigue siendo mejor para 2-4
// opciones cortas y parejas -- esto es lo que corresponde cuando no lo son.
import React from 'react';

export default function TabsWrap({ options, value, onChange, style }) {
  return (
    <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, ...style }}>
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
              border: 'none', cursor: 'pointer', font: 'inherit',
              padding: '7px 14px', borderRadius: '999px',
              fontSize: 12.5, fontWeight: activo ? 600 : 500,
              background: activo ? 'rgba(123, 92, 250, 0.12)' : 'transparent',
              color: activo ? '#7B5CFA' : '#6B6B78',
              whiteSpace: 'nowrap', transition: 'background-color 150ms cubic-bezier(0.25, 0.1, 0.25, 1), color 150ms cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
