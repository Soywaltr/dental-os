// src/components/vistas/Reportes.jsx
import React from 'react';
import { BD, P, GL, MU, DN, MT, AZ, RJ } from '../../utils/constants';

export default function Reportes() {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
  const vals = [2800, 3100, 2600, 3800, 4200, 4820];
  const maxV = Math.max(...vals);

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 16 }}>Reportes y estadísticas — 2025</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 14 }}>Ingresos mensuales (S/)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: P }}>{vals[i].toLocaleString()}</div>
                <div style={{ width: '100%', background: i === 5 ? P : MT, borderRadius: '4px 4px 0 0', height: `${(vals[i] / maxV) * 100}%`, transition: 'height .3s' }} />
                <div style={{ fontSize: 9, color: MU, fontWeight: 600 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 14 }}>Tratamientos más frecuentes</div>
          {[['Limpieza y profilaxis', 45, P], ['Control ortodoncia', 32, GL], ['Consulta / diagnóstico', 28, MU], ['Blanqueamiento', 18, '#0a7a4a'], ['Restauración resina', 15, AZ], ['Extracción simple', 12, RJ]].map(([t, n, c]) => (
            <div key={t} style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: DN, fontWeight: 500 }}>{t}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{n}</span>
              </div>
              <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(n / 45) * 100}%`, background: c, borderRadius: 3, transition: 'width .3s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}