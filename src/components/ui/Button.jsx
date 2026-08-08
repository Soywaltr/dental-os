// src/components/ui/Button.jsx
import React from 'react';
import { GRAD_PRIMARY, GRAD_PRIMARY_SHADOW } from '../../utils/constants';

const VARIANTS = {
  primary: { background: GRAD_PRIMARY, color: '#fff', boxShadow: GRAD_PRIMARY_SHADOW },
  secondary: { background: 'var(--fill-tertiary)', color: 'var(--label-secondary)' },
  danger: { background: 'var(--red-soft)', color: 'var(--red)' },
};

export default function Button({ children, onClick, variant = 'primary', disabled, style, type = 'button' }) {
  const base = {
    border: 'none', borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700, fontSize: 11, padding: '7px 16px',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...VARIANTS[variant], ...style }}>
      {children}
    </button>
  );
}
