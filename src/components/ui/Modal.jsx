// src/components/ui/Modal.jsx
import React from 'react';
import { GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

export default function Modal({ children, overlayStyle, cardStyle, zIndex = 1000, background = 'rgba(15,23,42,0.45)' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex, ...overlayStyle }}>
      <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, boxShadow: GLASS_SHADOW, borderRadius: 16, ...cardStyle }}>
        {children}
      </div>
    </div>
  );
}
