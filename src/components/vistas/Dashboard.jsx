// src/components/vistas/Dashboard.jsx
import React from 'react';
import Stat from '../ui/Stat';
import { TODAY, PATIENTS, BD, P, GL, MU, DN, MT, LT } from '../../utils/constants';
import { sc, ini } from '../../utils/helpers';

export default function Dashboard({ setView, setSelPat }) {
  return (
    <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', gap: 11, marginBottom: 18, flexWrap: 'wrap' }}>
        <Stat label="Citas hoy" value="5" sub="↑ 2 vs ayer" onClick={() => setView('agenda')} />
        <Stat label="Pacientes" value="340" sub="↑ 12 este mes" onClick={() => setView('pacientes')} />
        <Stat label="Ingresos mes" value="S/4,820" sub="↑ 18%" col={P} onClick={() => setView('caja')} />
        <Stat label="Por cobrar" value="S/750" col={GL} onClick={() => setView('caja')} />
        <Stat label="Lab. pendiente" value="2" col={MU} onClick={() => setView('laboratorio')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 17 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: DN }}>Citas de hoy — Lun 7 Jul</div>
            <span onClick={() => setView('agenda')} style={{ fontSize: 11, color: P, cursor: 'pointer', fontWeight: 600 }}>Agenda completa →</span>
          </div>
          {TODAY.map((a, i) => {
            const b = sc(a.status);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < TODAY.length - 1 ? `1px solid ${MT}` : 'none' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MU, minWidth: 40 }}>{a.time}</div>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color: P, flexShrink: 0 }}>{a.av}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient}</div>
                  <div style={{ fontSize: 10, color: MU }}>{a.treat} · {a.dur}min · S/{a.cost}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: b.bg, color: b.c, whiteSpace: 'nowrap' }}>{a.status}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 15 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 10 }}>Acciones rápidas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['◫ Nueva cita', 'agenda'], ['◉ Nuevo paciente', 'pacientes'], ['◆ Registrar pago', 'caja'], ['◎ WhatsApp IA', 'whatsapp'], ['◌ Laboratorio', 'laboratorio'], ['⊞ Reportes', 'reportes']].map(([l, v], i) => (
                <div key={i} onClick={() => setView(v)} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 8, padding: '9px 8px', cursor: 'pointer', textAlign: 'center', fontSize: 11, fontWeight: 600, color: DN }}
                  onMouseEnter={e => { e.currentTarget.style.background = MT; e.currentTarget.style.color = P }}
                  onMouseLeave={e => { e.currentTarget.style.background = LT; e.currentTarget.style.color = DN }}>{l}</div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 15 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 10 }}>Saldos pendientes</div>
            {PATIENTS.filter(p => p.balance > 0).map((p, i) => (
              <div key={i} onClick={() => { setSelPat(p); setView('historia'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < PATIENTS.filter(x => x.balance > 0).length - 1 ? `1px solid ${MT}` : 'none', cursor: 'pointer' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: P, flexShrink: 0 }}>{ini(p.name)}</div>
                <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: DN }}>{p.name}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: GL }}>S/{p.balance}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}