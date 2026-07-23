// src/components/ui/Badge.jsx
import React from 'react';

export default function Badge({ children, bg, color, style }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: bg, color, ...style }}>
      {children}
    </span>
  );
}
