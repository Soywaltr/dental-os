// src/components/ui/Button.jsx
import React from 'react';
import { GRAD_PRIMARY, GRAD_PRIMARY_SHADOW } from '../../utils/constants';

// El primario usaba color: '#fff' fijo. Con acento por clínica (blanco-etiqueta)
// eso puede fallar contraste con cualquier color que la clínica elija -- de
// hecho YA fallaba hoy: el violeta de modo oscuro (#8B7BF5) da 3.36:1 con
// blanco, por debajo de AA. --accent-contrast se calcula en JS (utils/theme.js)
// porque la relación de contraste no es lineal con el color: CSS no puede
// resolver "blanco o negro" por sí solo.
const VARIANTS = {
  primary: { background: GRAD_PRIMARY, color: '#FFFFFF', boxShadow: GRAD_PRIMARY_SHADOW },
  secondary: { background: '#F1F1F7', color: '#6B6B78' },
  danger: { background: '#FEE2E2', color: '#EF4444' },
};

export default function Button({ children, onClick, variant = 'primary', disabled, style, className, type = 'button' }) {
  const base = {
    border: 'none', borderRadius: '10px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600, fontSize: 13, padding: '7px 16px',
  };
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={`btn btn-${variant} u-focusable${className ? ` ${className}` : ''}`}
      style={{ ...base, ...VARIANTS[variant], ...style }}
    >
      {children}
    </button>
  );
}
