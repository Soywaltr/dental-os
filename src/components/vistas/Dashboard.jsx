// src/components/vistas/Dashboard.jsx
import React from 'react';
import { TODAY, DN, MU, WA, RJ } from '../../utils/constants';

// Iconos vectoriales miniatura
const IconArrowUp = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>;
const IconArrowDown = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>;
const IconDots = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;

// Estilos de la tarjeta Glassmorphism
const glassCard = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px)',
  borderRadius: '24px',
  padding: '24px',
  border: '1px solid rgba(255, 255, 255, 0.9)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
  display: 'flex', flexDirection: 'column'
};

export default function Dashboard() {
  
  const MetricCard = ({ title, subTitle, mainValue, trend, isPositive, children }) => (
    <div style={glassCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{title}</div>
          {subTitle && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{subTitle}</div>}
        </div>
        <div style={{ color: '#94A3B8', cursor: 'pointer' }}><IconDots /></div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#0F172A', lineHeight: 1, letterSpacing: '-1px' }}>{mainValue}</div>
        {trend && (
          <div style={{ fontSize: 12, fontWeight: 600, color: isPositive ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: 2 }}>
            {isPositive ? <IconArrowUp /> : <IconArrowDown />} {trend}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>{children}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ─── ROW 1: BANNER DE INGRESOS ─── */}
      <div style={{ ...glassCard, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, padding: '32px' }}>
        <div>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginBottom: 8 }}>Ingresos Consolidados del Mes</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#0F172A', letterSpacing: '-1.5px', lineHeight: 1 }}>S/ 4,820</div>
        </div>
        <div style={{ display: 'flex', gap: 40 }}>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>Total Facturado</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>S/ 5,570</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>Crecimiento Mensual</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}><IconArrowUp /> +12.5%</div>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: MÉTRICAS (GRID PERFECTO) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        <MetricCard title="Citas de Hoy" subTitle="Agendadas en sistema" mainValue={TODAY.length} trend="2 pendientes" isPositive={true}>
          <div style={{ display: 'flex', gap: 6, height: 40, width: '100%', alignItems: 'flex-end' }}>
            {[30, 50, 40, 70, 60, 90, 80].map((h, i) => (
              <div key={i} style={{ flex: 1, background: i > 4 ? 'rgba(15,23,42,0.1)' : '#0ea5e9', height: `${h}%`, borderRadius: '4px' }} />
            ))}
          </div>
        </MetricCard>

        <MetricCard title="Pacientes Nuevos" subTitle="Adquisición mensual" mainValue="88" trend="12% crecimiento" isPositive={true}>
          <div style={{ display: 'flex', gap: 6, height: 40, width: '100%', alignItems: 'flex-end' }}>
            {[60, 40, 50, 30, 80, 60, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, background: i % 2 === 0 ? '#10B981' : 'rgba(15,23,42,0.1)', height: `${h}%`, borderRadius: '4px' }} />
            ))}
          </div>
        </MetricCard>

        <MetricCard title="Saldos Pendientes" subTitle="Facturas por cobrar" mainValue="S/ 750" trend="Requiere acción" isPositive={false}>
           <div style={{ display: 'flex', gap: 6, height: 40, width: '100%', alignItems: 'flex-end' }}>
            {[20, 30, 10, 40, 20, 30, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, background: i > 4 ? '#F43F5E' : 'rgba(15,23,42,0.1)', height: `${h}%`, borderRadius: '4px' }} />
            ))}
          </div>
        </MetricCard>
      </div>

      {/* ─── ROW 3: AGENDA E INTELIGENCIA ARTIFICIAL ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* Tabla Agenda */}
        <div style={{ ...glassCard, flex: '1 1 600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Agenda del Día</div>
            <div style={{ color: '#94A3B8', cursor: 'pointer' }}><IconDots /></div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 600, color: '#64748B', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Hora</th>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 600, color: '#64748B', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Paciente</th>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 600, color: '#64748B', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>Tratamiento</th>
                <th style={{ paddingBottom: 16, fontSize: 12, fontWeight: 600, color: '#64748B', borderBottom: '1px solid rgba(0,0,0,0.05)', textAlign: 'right' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {TODAY.map((a, i) => (
                <tr key={i}>
                  <td style={{ padding: '16px 0', fontSize: 13, color: '#0F172A', borderBottom: '1px solid rgba(0,0,0,0.03)', fontWeight: 600 }}>{a.time}</td>
                  <td style={{ padding: '16px 0', fontSize: 13, fontWeight: 700, color: '#0F172A', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>{a.patient}</td>
                  <td style={{ padding: '16px 0', fontSize: 13, color: '#64748B', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>{a.treat}</td>
                  <td style={{ padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.03)', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: '8px', background: a.status === 'pendiente' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: a.status === 'pendiente' ? '#EF4444' : '#10B981', textTransform: 'capitalize' }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Asistente IA */}
        <div style={{ ...glassCard, flex: '1 1 400px', height: '480px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#0ea5e9' }}>✦</span> Asistente IA Nanda
            </div>
            <div style={{ color: '#94A3B8', cursor: 'pointer', background: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '8px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.08 5.08"></path></svg></div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a2 2 0 0 1 2 2v2"></path></svg></div>
              <div style={{ background: 'rgba(255,255,255,0.8)', padding: '12px 16px', borderRadius: '0 16px 16px 16px', fontSize: 13, color: '#475569', lineHeight: 1.5, border: '1px solid rgba(255,255,255,1)' }}>
                Sube una radiografía para procesar datos clínicos automáticamente.
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 'bold' }}>SV</div>
              <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '12px 16px', borderRadius: '16px 0 16px 16px', fontSize: 13, color: '#0369A1', lineHeight: 1.5, border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: '8px', marginBottom: 8, border: '1px solid rgba(255,255,255,1)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#0F172A' }}>Panoramica.pdf</div>
                </div>
                Documento adjunto. ¿Qué ves aquí?
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, background: 'rgba(255,255,255,0.8)', padding: '8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,1)' }}>
            <input placeholder="Comando de IA..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#0F172A', padding: '4px 8px' }} />
            <button style={{ width: 32, height: 32, borderRadius: '8px', background: '#0F172A', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}