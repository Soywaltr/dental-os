// src/components/ui/Modal.jsx
import React from 'react';

export default function Modal({ children, overlayStyle, cardStyle, zIndex = 1000, background = 'rgba(0,0,0,0.5)' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex, ...overlayStyle }}>
      <div style={{ background: '#fff', borderRadius: 16, ...cardStyle }}>
        {children}
      </div>
    </div>
  );
}
