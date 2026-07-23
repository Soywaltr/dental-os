// src/components/vistas/Config.jsx
import React from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { BD, DN, MU, MT } from '../../utils/constants';

export default function Config() {
  return (
    <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 800 }}>
        {[
          { title: 'Datos del consultorio', fields: [['Nombre', 'Consultorio Dra. Sol Vargas'], ['Dirección', 'Los Diamantes 178, Trujillo 13011'], ['Teléfono', '+51 915 054 145'], ['Email', 'drasolvargass@gmail.com'], ['COP', '12345']] },
          { title: 'Horario de atención', fields: [['Lunes - Viernes', '8:00 am - 6:00 pm'], ['Sábado', '8:00 am - 1:00 pm'], ['Domingo', 'Cerrado'], ['Duración cita por defecto', '30 minutos']] },
          { title: 'WhatsApp IA — Agente Nanda', fields: [['Número WA', '+51 915 054 145'], ['Nombre del agente', 'Nanda'], ['Recordatorio (horas antes)', '24h y 1h'], ['Auto-respuesta', 'Activada']] },
          { title: 'Notificaciones', fields: [['Nuevas citas', 'Email + WhatsApp'], ['Pagos recibidos', 'Email'], ['Laboratorio listo', 'WhatsApp'], ['Ausencias', 'WhatsApp']] },
        ].map((sec, si) => (
          <div key={si} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 17 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${MT}` }}>{sec.title}</div>
            {sec.fields.map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 9.5, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>{k}</label>
                <input defaultValue={v} style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <Button style={{ marginTop: 16, padding: '9px 24px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon name="save" size={13} /> Guardar configuración
      </Button>
    </div>
  );
}