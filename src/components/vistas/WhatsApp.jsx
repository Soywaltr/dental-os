// src/components/vistas/WhatsApp.jsx
import React from 'react';
import Icon from '../ui/Icon';
import { P, DN, MU, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

export default function WhatsApp() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, boxShadow: GLASS_SHADOW, borderRadius: 24, padding: '40px 32px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.6)', border: GLASS_BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: P }}>
          <Icon name="chat" size={28} />
        </div>
        <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: P, background: '#e0f2fe', padding: '4px 10px', borderRadius: 100, marginBottom: 12 }}>
          MUY PRONTO
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: DN, margin: '0 0 8px' }}>Chat IA</h2>
        <p style={{ fontSize: 13, color: MU, lineHeight: 1.6, margin: 0 }}>
          Estamos preparando un asistente de IA para atender consultas de tus pacientes por WhatsApp,
          agendar citas y responder preguntas frecuentes de forma automática. Pronto podrás activarlo aquí.
        </p>
      </div>
    </div>
  );
}
