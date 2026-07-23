// src/components/vistas/Caja.jsx
import React, { useState } from 'react';
import Stat from '../ui/Stat';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { INVOICES, PATIENTS, BD, P, GL, MU, DN, MT, LT } from '../../utils/constants';
import { sc } from '../../utils/helpers';

export default function Caja() {
  const total = INVOICES.reduce((s, i) => s + i.total, 0);
  const cobrado = INVOICES.reduce((s, i) => s + i.paid, 0);
  const [tab, setTab] = useState('facturas');

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat label="Total facturado" value={`S/${total.toLocaleString()}`} />
        <Stat label="Cobrado" value={`S/${cobrado.toLocaleString()}`} col={P} sub="✓ al día" />
        <Stat label="Pendiente" value={`S/${(total - cobrado).toLocaleString()}`} col={GL} />
        <Stat label="Ingresos del mes" value="S/4,820" col={P} sub="↑ 18% vs anterior" />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {['facturas', 'pagos', 'gastos'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${BD}`, fontSize: 11, cursor: 'pointer', fontWeight: tab === t ? 700 : 400, background: tab === t ? P : '#fff', color: tab === t ? '#fff' : MU, textTransform: 'capitalize' }}>{t}</button>
        ))}
        <Button style={{ marginLeft: 'auto', padding: '6px 16px' }}>+ Nueva factura</Button>
      </div>

      {tab === 'facturas' && (
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead><tr style={{ background: LT }}>
              {['N°', 'Paciente', 'Tratamiento', 'Fecha', 'Método', 'Total', 'Cobrado', 'Estado', ''].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: MU, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${BD}`, whiteSpace: 'nowrap' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {INVOICES.map((inv, i) => {
                const b = sc(inv.status); return (
                  <tr key={i} style={{ borderBottom: `1px solid ${MT}` }}
                    onMouseEnter={e => e.currentTarget.style.background = LT}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 12px', color: P, fontWeight: 700 }}>{inv.id}</td>
                    <td style={{ padding: '9px 12px', color: DN, fontWeight: 500 }}>{inv.patient}</td>
                    <td style={{ padding: '9px 12px', color: MU }}>{inv.treat}</td>
                    <td style={{ padding: '9px 12px', color: MU }}>{inv.date}</td>
                    <td style={{ padding: '9px 12px', color: MU }}>{inv.method}</td>
                    <td style={{ padding: '9px 12px', color: DN, fontWeight: 600 }}>S/{inv.total}</td>
                    <td style={{ padding: '9px 12px', color: inv.paid < inv.total ? GL : P }}>S/{inv.paid}</td>
                    <td style={{ padding: '9px 12px' }}><Badge bg={b.bg} color={b.c} style={{ fontSize: 9, padding: '2px 8px' }}>{inv.status}</Badge></td>
                    <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, color: P, cursor: 'pointer', fontWeight: 600 }}>ver →</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'pagos' && (
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 12 }}>Registrar nuevo pago</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 500 }}>
            {[['Paciente', 'select'], ['Factura', 'select'], ['Monto (S/)', 'number'], ['Método de pago', 'select'], ['Fecha', 'date'], ['Referencia / N° operación', 'text']].map(([l, t]) => (
              <div key={l}>
                <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>{l}</label>
                {t === 'select' ? <select style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', background: '#fff' }}>
                  {l === 'Paciente' ? PATIENTS.map(p => <option key={p.id}>{p.name}</option>) : l === 'Factura' ? INVOICES.map(i => <option key={i.id}>{i.id}</option>) : <><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option><option>Tarjeta</option></>}
                </select> : <input type={t} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' }} />}
              </div>
            ))}
          </div>
          <Button style={{ marginTop: 14, padding: '8px 20px', fontSize: 12 }}>Registrar pago</Button>
        </div>
      )}

      {tab === 'gastos' && (
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 12 }}>Gastos del consultorio</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[['Materiales', 'S/320', 'Jun 2025'], ['Laboratorio', 'S/480', 'Jun 2025'], ['Servicios', 'S/150', 'Jun 2025'], ['Sueldos', 'S/1,200', 'Jun 2025'], ['Otros', 'S/80', 'Jun 2025']].map(([c, v, d]) => (
              <div key={c} style={{ background: LT, borderRadius: 9, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 3 }}>{c}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: DN }}>{v}</div>
                <div style={{ fontSize: 9, color: MU }}>{d}</div>
              </div>
            ))}
          </div>
          <Button>+ Registrar gasto</Button>
        </div>
      )}
    </div>
  );
}