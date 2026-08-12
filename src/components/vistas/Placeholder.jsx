// src/components/vistas/Placeholder.jsx
// Pantalla para las secciones agregadas por la referencia "Confidency OS"
// (Command/Commerce/Finance/Platform en App.jsx) que todavía no tienen
// funcionalidad propia -- el usuario pidió agregar el ítem de menú ya, sin
// inventar datos ni una pantalla real para cada uno. Un solo componente
// parametrizado por título/ícono, no 13 archivos idénticos.
import React from 'react';
import NavIcon from '../ui/NavIcons';
import { MU } from '../../utils/constants';

export default function Placeholder({ titulo, icono }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: '18px',
      boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 6px rgba(16, 24, 40, 0.05)',
      minHeight: 360, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40,
      textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'rgba(14, 169, 196, 0.12)', color: '#0EA9C4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <NavIcon name={icono} size={24} />
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#252733' }}>{titulo}</div>
        <div style={{ fontSize: 13.5, color: MU, marginTop: 6, maxWidth: 320 }}>
          Sección agregada al menú, todavía sin contenido propio.
        </div>
      </div>
    </div>
  );
}
