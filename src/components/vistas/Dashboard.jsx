// src/components/vistas/Dashboard.jsx
import React from 'react';
import { TODAY } from '../../utils/constants';

export default function Dashboard() {
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.5s ease-in-out' }}>
      
      {/* ─── SECCIÓN HERO ("Welcome back!" + Top Stats) ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-1px' }}>
            Bienvenida de nuevo
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', margin: 0, fontWeight: 500 }}>
            Mira el resumen de tus pacientes y actividad actual aquí
          </p>
        </div>

        {/* Top Floating Stats */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Stat 1 */}
          <div style={{ background: '#FFFFFF', padding: '16px 24px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Ingresos <span style={{ background: '#0ea5e9', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>+12%</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>S/ 4,820</div>
            </div>
          </div>
          
          {/* Stat 2 */}
          <div style={{ background: '#FFFFFF', padding: '16px 24px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Pacientes Nuevos</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>88 <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Mes actual</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN GRID (Left: Analytics, Right: Schedule/Performance) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '32px' }}>
        
        {/* COLUMNA IZQUIERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Tarjeta: Test Analytics (Gráfico de Burbujas calcado a heal.me) */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)', height: '420px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Analíticas Clínicas</h2>
              <div style={{ cursor: 'pointer', color: '#94A3B8' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></div>
            </div>

            {/* Sub Nav Analytics */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #F1F5F9', paddingBottom: 16 }}>
              {['General', 'Ortodoncia', 'Endodoncia', 'Rehabilitación', 'Implantes'].map((t, i) => (
                <div key={t} style={{ fontSize: 13, fontWeight: i===0 ? 700 : 500, color: i===0 ? '#fff' : '#64748B', background: i===0 ? '#0F172A' : 'transparent', padding: '6px 16px', borderRadius: '100px', cursor: 'pointer' }}>{t}</div>
              ))}
            </div>

            {/* Bubble Chart Area (Simulado con CSS y Grid de fondo) */}
            <div style={{ flex: 1, position: 'relative', backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #F1F5F9 1px, transparent 1px), linear-gradient(to bottom, #F1F5F9 1px, transparent 1px)' }}>
              
              {/* Y Axis labels */}
              <div style={{ position: 'absolute', left: -20, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                <span>100</span><span>80</span><span>60</span><span>30</span><span>10</span>
              </div>
              
              {/* X Axis labels */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: -20, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94A3B8', fontWeight: 600, paddingLeft: 20 }}>
                <span>20</span><span>30</span><span>40</span><span>50</span><span>60</span><span>70</span><span>90</span><span>100</span>
              </div>

              {/* Burbujas Flotantes estilo heal.me */}
              <div style={{ position: 'absolute', left: '15%', top: '30%', width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', opacity: 0.9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)' }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>88</span>
                <span style={{ fontSize: 11, fontWeight: 500 }}>Nuevos</span>
              </div>

              <div style={{ position: 'absolute', left: '5%', top: '60%', width: '70px', height: '70px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>12</span>
                <span style={{ fontSize: 9, fontWeight: 600 }}>Citas</span>
              </div>

              <div style={{ position: 'absolute', left: '45%', top: '55%', width: '140px', height: '140px', borderRadius: '50%', background: 'linear-gradient(135deg, #c4b5fd, #7c3aed)', opacity: 0.85, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 10px 25px rgba(124, 58, 237, 0.3)' }}>
                <span style={{ fontSize: 28, fontWeight: 800 }}>S/ 4.8k</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Ingresos</span>
              </div>

              <div style={{ position: 'absolute', right: '5%', top: '20%', width: '150px', height: '150px', borderRadius: '50%', background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', opacity: 0.9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' }}>
                <span style={{ fontSize: 32, fontWeight: 800 }}>92%</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Retención</span>
              </div>
            </div>
          </div>

          {/* Tarjeta: Medication Management -> Convertida en "Asistente IA Rápido" */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '24px 32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Asistente IA Nanda</h2>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</div>
            </div>
            
            <div style={{ display: 'flex', gap: 16 }}>
              {/* IA Pill 1 */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', padding: '16px', borderRadius: '20px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Redactar Presupuesto</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Para paciente actual</div>
                </div>
              </div>
              {/* IA Pill 2 */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', padding: '16px', borderRadius: '20px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="14 2 18 6 7 17 3 17 3 13 14 2"></polygon><line x1="3" y1="22" x2="21" y2="22"></line></svg></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Analizar Radiografía</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Subir archivo JPG/PDF</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Tarjeta: Schedule (Agenda) */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Agenda</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Mayo</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>&lt;</div>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>&gt;</div>
                </div>
              </div>
            </div>

            {/* Date Selector Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
              {[26, 27, 28, 29, 30, 31].map((d, i) => (
                <div key={d} style={{ width: 44, height: 60, borderRadius: '100px', border: i===2 ? 'none' : '1px solid #E2E8F0', background: i===2 ? '#0F172A' : 'transparent', color: i===2 ? '#fff' : '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Next Appointment Card */}
            <div style={{ background: '#F8FAFC', borderRadius: '24px', padding: '20px', border: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'linear-gradient(135deg, #fbcfe8, #bfdbfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 800, fontSize: 18 }}>ML</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>María López</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Control Ortodoncia</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0F172A', marginTop: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Hoy, 09:00 AM
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta: Performance (Rendimiento Arc) */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Rendimiento</h2>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>→</div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {/* SVG Arc Score Calcado */}
              <div style={{ position: 'relative', width: 180, height: 90, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ width: 180, height: 180, borderRadius: '50%', border: '24px solid #F1F5F9', boxSizing: 'border-box' }}></div>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 180, height: 180, borderRadius: '50%', border: '24px solid #3b82f6', borderBottomColor: 'transparent', borderRightColor: 'transparent', transform: 'rotate(45deg)', boxSizing: 'border-box' }}></div>
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: '#0F172A', lineHeight: 1, marginBottom: 8 }}>9.2<span style={{ fontSize: 24, color: '#94A3B8' }}>/10</span></div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Puntaje de Clínica</div>
              <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', margin: 0, lineHeight: 1.5, maxWidth: '200px' }}>
                Estás rindiendo mejor que el 85% de consultorios en tu red.
              </p>
            </div>
            
            {/* User row at bottom */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>CC</div>
                 <div>
                   <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Carlos Cabrera</div>
                   <div style={{ fontSize: 11, color: '#64748B' }}>Mejor paciente</div>
                 </div>
              </div>
              <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: '100px' }}>+8%</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}