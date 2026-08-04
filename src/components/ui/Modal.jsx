// src/components/ui/Modal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

// Se monta con un portal directo a <body>: si quedara anidado dentro de algún
// contenedor con backdrop-filter (como las tarjetas "glass" de esta misma
// app), ese ancestro pasa a ser el "containing block" del position:fixed y el
// modal queda recortado a su tamaño en vez de cubrir toda la pantalla.
export default function Modal({ children, overlayStyle, cardStyle, zIndex = 1000, background = 'rgba(15,23,42,0.45)' }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex, ...overlayStyle }}>
      <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, boxShadow: GLASS_SHADOW, borderRadius: 16, ...cardStyle }}>
        {children}
      </div>
    </div>,
    document.body
  );
}
