// src/components/ui/Button.jsx
import React from 'react';
import { P } from '../../utils/constants';

const VARIANTS = {
  primary: { background: P, color: '#fff' },
  secondary: { background: '#f1f5f9', color: '#64748b' },
  danger: { background: '#fef2f2', color: '#ef4444' },
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
