// src/components/ui/SegmentedControl.jsx
// Control segmentado estilo iOS: una pista gris con un "thumb" blanco que se
// desliza al segmento activo, en vez de botones-píldora sueltos cada uno con
// su propio color cuando está activo.
import React from 'react';

export default function SegmentedControl({ options, value, onChange, style }) {
  const idx = Math.max(0, options.findIndex(o => o.key === value));
  const n = options.length;
  const pad = 2;

  return (
    <div
      role="tablist"
      style={{
        position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`,
        background: 'var(--fill-tertiary)', borderRadius: 'var(--radius-sm)', padding: pad,
        ...style,
      }}
    >
      <div aria-hidden="true" style={{
        position: 'absolute', top: pad, bottom: pad,
        left: `calc(${idx} * (100% - ${pad * 2}px) / ${n} + ${pad}px)`,
        width: `calc((100% - ${pad * 2}px) / ${n})`,
        background: 'var(--surface-primary)', borderRadius: 'calc(var(--radius-sm) - 2px)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'left 200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
      }} />
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          style={{
            position: 'relative', zIndex: 1, border: 'none', background: 'transparent',
            padding: '7px 12px', fontSize: 11.5, fontWeight: value === o.key ? 600 : 500,
            color: value === o.key ? 'var(--label-primary)' : 'var(--label-secondary)',
            cursor: 'pointer', borderRadius: 'calc(var(--radius-sm) - 2px)',
            transition: 'color 150ms ease', whiteSpace: 'nowrap', minHeight: 30,
            font: 'inherit', fontFamily: 'inherit',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
