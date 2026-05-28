// src/components/vistas/Dashboard.jsx
import React from 'react';
import { TODAY, DN, MU, WA, RJ } from '../../utils/constants';

// Iconos limpios para el Dashboard
const IconArrowUp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const IconArrowDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;
const IconDots = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;

export default function Dashboard({ setView, setSelPat }) {
  
  const MetricCard = ({ title, subTitle, mainValue, trend, isPositive, children }) => (
    <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{title}</div>
          {subTitle && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{subTitle}</div>}
        </div>
        <div style={{ color: '#94A3B8', cursor: 'pointer' }}><IconDots /></div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 600, color: '#0F172A', lineHeight: 1, letterSpacing: '-1px' }}>{mainValue}</div>
        {trend && (
          <div style={{ fontSize: 12, fontWeight: 500, color: isPositive ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: 2 }}>
            {isPositive ? <IconArrowUp /> : <IconArrowDown />} {trend}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>{children}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      
      {/* ─── TARJETA PRINCIPAL (Resumen Financiero) ─── */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '32px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500, marginBottom: 8 }}>Ingresos del Mes</div>
          <div style={{ fontSize: 48, fontWeight: 600, color: '#0F172A', letterSpacing: '-1.5px', lineHeight: 1 }}>S/ 4,820</div>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Facturado</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#0F172A' }}>S/ 5,570</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Crecimiento</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#10B981' }}>+12.5%</div>
          </div>
        </div>
      </div>

      {/* ─── GRID DE MÉTRICAS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        <MetricCard title="Citas Hoy" subTitle="Agendadas en sistema" mainValue={TODAY.length} trend="2 pendientes" isPositive={true}>
          <div style={{ display: 'flex', gap: 6, height: 40, width: '100%', alignItems: 'flex-end' }}>
            {[30, 50, 40, 70, 60, 90, 80].map((h, i) => (
              <div key={i} style={{ flex: 1, background: i > 4 ? '#E2E8F0' : '#3B82F6', height: `${h}%`, borderRadius: '2px' }} />
            ))}
          </div>
        </MetricCard>

        <MetricCard title="Pacientes Nuevos" subTitle="Adquisición mensual" mainValue="88" trend="12% vs mes ant." isPositive={true}>
          <div style={{ display: 'flex', gap: 6, height: 40, width: '100%', alignItems: 'flex-end' }}>
            {[60, 40, 50, 30, 80, 60, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, background: i % 2 === 0 ? '#10B981' : '#E2E8F0', height: `${h}%`, borderRadius: '2px' }} />
            ))}
          </div>
        </MetricCard>

        <MetricCard title="Saldos Pendientes" subTitle="Por cobrar" mainValue="S/ 750" trend="Requiere revisión" isPositive={false}>
           <div style={{ display: 'flex', gap: 6, height: 40, width: '100%', alignItems: 'flex-end' }}>
            {[20, 30, 10, 40, 20, 30, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, background: i > 4 ? '#F43F5E' : '#E2E8F0', height: `${h}%`, borderRadius: '2px' }} />
            ))}
          </div>
        </MetricCard>

      </div>

      {/* ─── FILA INFERIOR: TABLA Y ASISTENTE IA ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* Tabla de Citas */}
        <div style={{ flex: '2 1 500px', background: '#FFFFFF', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Agenda del Día</div>
            <div style={{ color: '#94A3B8', cursor: 'pointer' }}><IconDots /></div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 500, color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>Hora</th>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 500, color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>Paciente</th>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 500, color: '#64748B', borderBottom: '1px solid #F1F5F9' }}>Tratamiento</th>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 500, color: '#64748B', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {TODAY.map((a, i) => (
                <tr key={i}>
                  <td style={{ padding: '16px 0', fontSize: 13, color: '#0F172A', borderBottom: '1px solid #F8FAFC' }}>{a.time}</td>
                  <td style={{ padding: '16px 0', fontSize: 13, fontWeight: 500, color: '#0F172A', borderBottom: '1px solid #F8FAFC' }}>{a.patient}</td>
                  <td style={{ padding: '16px 0', fontSize: 13, color: '#64748B', borderBottom: '1px solid #F8FAFC' }}>{a.treat}</td>
                  <td style={{ padding: '16px 0', borderBottom: '1px solid #F8FAFC', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 8px', borderRadius: '4px', background: a.status === 'pendiente' ? '#FEF2F2' : '#F0FDF4', color: a.status === 'pendiente' ? '#EF4444' : '#10B981', textTransform: 'capitalize' }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Asistente IA */}
        <div style={{ flex: '1 1 300px', background: '#FFFFFF', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v4h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v3a2 2 0 0 1-4 0v-3h-1a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1v-4h-1a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1V1a2 2 0 0 1 4 0v1h1z"></path></svg> 
              Asistente IA
            </div>
            <div style={{ color: '#94A3B8', cursor: 'pointer' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.08 5.08"></path></svg></div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '4px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2v2"></path></svg></div>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '0 8px 8px 8px', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                Sube una radiografía para procesar datos clínicos.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#475569', fontWeight: 'bold' }}>SV</div>
              <div style={{ background: '#EFF6FF', padding: '10px 12px', borderRadius: '8px 0 8px 8px', fontSize: 12, color: '#0369A1', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', padding: '6px 8px', borderRadius: '4px', marginBottom: 6, border: '1px solid #BAE6FD' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <div style={{ fontWeight: 500, fontSize: 11, color: '#0F172A' }}>Panoramica.pdf</div>
                </div>
                Documento adjunto.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, background: '#F8FAFC', padding: '6px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
            <input placeholder="Ingresar comando..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: '#0F172A', padding: '4px 8px' }} />
            <button style={{ width: 24, height: 24, borderRadius: '4px', background: '#0F172A', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}