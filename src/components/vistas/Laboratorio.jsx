// src/components/vistas/Laboratorio.jsx
import React, { useState } from 'react';
import Stat from '../ui/Stat';
import { LAB_ORDERS, BD, P, DN, MU, MT } from '../../utils/constants';

export default function Laboratorio() {
  const [orders, setOrders] = useState(LAB_ORDERS);

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Órdenes de laboratorio</div>
        <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva orden</button>
      </div>
      <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['Total órdenes', orders.length, null], ['En proceso', orders.filter(o => o.status === 'en_proceso').length, MU], ['Listo para retirar', orders.filter(o => o.status === 'listo').length, P], ['Entregado', orders.filter(o => o.status === 'entregado').length, '#22a55a']].map(([l, v, c]) => (
          <Stat key={l} label={l} value={v} col={c} />
        ))}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {orders.map(o => {
          const b = o.status === 'listo' ? { bg: MT, c: P } : o.status === 'entregado' ? { bg: '#dcfce7', c: '#16a34a' } : { bg: '#fef3c7', c: '#d97706' };
          return (
            <div key={o.id} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>{o.type}</div>
                <div style={{ fontSize: 10, color: MU }}>Paciente: {o.patient} · Pieza: {o.tooth}</div>
                <div style={{ fontSize: 10, color: MU }}>Lab: {o.lab}</div>
              </div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>Enviado</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{o.sent}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>ETA</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{o.eta}</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>Costo</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>S/{o.cost}</div></div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 10, background: b.bg, color: b.c }}>{o.status.replace('_', ' ')}</span>
              {o.status === 'listo' && (
                <button onClick={() => setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: 'entregado' } : x))}
                  style={{ background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓ Marcar entregado</button>
              )}
              <span style={{ fontSize: 11, color: P, cursor: 'pointer', fontWeight: 600 }}>ID: {o.id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}