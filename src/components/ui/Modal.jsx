// src/components/ui/Modal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { GLASS_BORDER } from '../../utils/constants';

// Se monta con un portal directo a <body>: si quedara anidado dentro de algún
// contenedor con backdrop-filter (como las tarjetas "glass" de esta misma
// app), ese ancestro pasa a ser el "containing block" del position:fixed y el
// modal queda recortado a su tamaño en vez de cubrir toda la pantalla.
//
// El panel SÍ lleva vibrancy (a diferencia de las tarjetas de contenido, que
// van opacas): un modal es chrome que flota sobre la app, exactamente el caso
// que Apple reserva para blur/translucidez.
//
// La sombra usa --shadow-pop directo, NO el alias GLASS_SHADOW/--shadow-sm que
// consumen las tarjetas de contenido: "sombras solo donde algo flota" significa
// que un modal SÍ debe flotar aunque las tarjetas comunes dejen de tenerla.
export default function Modal({ children, overlayStyle, cardStyle, zIndex = 1000, background = 'rgba(15,23,42,0.45)' }) {
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex, ...overlayStyle }}>
      <div style={{ background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: GLASS_BORDER, boxShadow: '0 8px 20px rgba(16, 24, 40, 0.10), 0 2px 6px rgba(16, 24, 40, 0.05)', borderRadius: '18px', ...cardStyle }}>
        {children}
      </div>
    </div>,
    document.body
  );
}
