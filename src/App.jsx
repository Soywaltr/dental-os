// src/App.jsx
import React, { useState, useEffect } from "react";
import { supabase } from './supabase';
import Login from './Login';

// Importar todas las vistas
import Dashboard from './components/vistas/Dashboard';
import Agenda from './components/vistas/Agenda';
import Caja from './components/vistas/Caja';
import Laboratorio from './components/vistas/Laboratorio';
import Reportes from './components/vistas/Reportes';
import WhatsApp from './components/vistas/WhatsApp';
import Config from './components/vistas/Config';
import Expediente from './components/vistas/Expediente';

import { PATIENTS, P, DN, MU, BD } from './utils/constants';

// Diccionario de Iconos SVG Profesionales (Reemplazo de emojis)
const ICONS = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  agenda: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  pacientes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  historia: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  caja: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
  laboratorio: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><line x1="5.52" y1="16" x2="18.48" y2="16"></line></svg>,
  reportes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  whatsapp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  config: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
};

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const [view, setView] = useState('dashboard'); 
  const [selPat, setSelPat] = useState(null);

  const handleLogout = async () => await supabase.auth.signOut();

  // Estados de datos (simplificados visualmente para mantener foco en UI)
  const [teeth, setTeeth] = useState(() => JSON.parse(localStorage.getItem('dentalOS_odontograma')) || {});
  useEffect(() => { localStorage.setItem('dentalOS_odontograma', JSON.stringify(teeth)); }, [teeth]);

  const [teethEvolucion, setTeethEvolucion] = useState(() => JSON.parse(localStorage.getItem('dentalOS_odontograma_evo')) || {});
  useEffect(() => { localStorage.setItem('dentalOS_odontograma_evo', JSON.stringify(teethEvolucion)); }, [teethEvolucion]);

  const [patientsList, setPatientsList] = useState(() => JSON.parse(localStorage.getItem('dentalOS_patients')) || PATIENTS);
  useEffect(() => { localStorage.setItem('dentalOS_patients', JSON.stringify(patientsList)); }, [patientsList]);

  const NAV = [
    { id: 'dashboard', i: '▦', title: 'Dashboard' },
    { id: 'agenda', i: '◫', title: 'Agenda' },
    { id: 'expediente', i: '🗂️', title: 'Expediente' }, // <-- El nuevo unificado
    { id: 'caja', i: '◆', title: 'Finanzas' },
    { id: 'laboratorio', i: '◌', title: 'Laboratorio' },
    { id: 'reportes', i: '◍', title: 'Métricas' },
    { id: 'whatsapp', i: '◎', title: 'IA' },
    { id: 'config', i: '⚙', title: 'Ajustes' }
  ];

  const goTo = (v, p = null) => { setView(v); if (p) setSelPat(p); };

  if (!session) return <Login onLogin={(sessionData) => setSession(sessionData)} />;

  const viewTitles = {
    dashboard: 'Dashboard', agenda: 'Agenda', pacientes: 'Directorio de Pacientes',
    historia: 'Expediente Clínico', caja: 'Finanzas y Caja', laboratorio: 'Laboratorio',
    reportes: 'Métricas', whatsapp: 'Asistente IA', config: 'Configuraciones'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden', background: '#F8FAFC', color: '#0F172A' }}>
      
      {/* ─── SIDEBAR IZQUIERDO (Estilo Premium) ─── */}
      <div style={{ width: '250px', background: '#FFFFFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 20 }}>
        
        {/* LOGO */}
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>DentalOS</div>
            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>Dra. Sol Vargas</div>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '16px 12px 8px' }}>Menu</div>
          {NAV.map(it => {
            const isActive = view === it.id;
            return (
              <div key={it.id} onClick={() => goTo(it.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', 
                  cursor: 'pointer', borderRadius: '8px',
                  background: isActive ? '#F1F5F9' : 'transparent', 
                  color: isActive ? '#0F172A' : '#64748B',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => { if(!isActive) e.currentTarget.style.color = '#0F172A' }}
                onMouseLeave={e => { if(!isActive) e.currentTarget.style.color = '#64748B' }}>
                <span style={{ color: isActive ? '#0F172A' : '#94A3B8' }}>{ICONS[it.id]}</span>
                <span style={{ fontSize: 14 }}>{it.lbl}</span>
              </div>
            );
          })}
        </div>

        {/* PERFIL BOTTOM */}
        <div style={{ padding: '20px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 600, fontSize: 14 }}>SV</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Sol Vargas</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Admin</div>
          </div>
          <div onClick={handleLogout} style={{ color: '#94A3B8', cursor: 'pointer' }} title="Salir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </div>
        </div>
      </div>

      {/* ─── ÁREA PRINCIPAL ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* HEADER TOP (Buscador) */}
        <div style={{ height: '72px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Buscar paciente, factura..." style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '13px', outline: 'none', transition: 'border 0.2s' }} onFocus={e => e.target.style.borderColor = '#94A3B8'} onBlur={e => e.target.style.borderColor = '#E2E8F0'} />
            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>⌘K</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <button onClick={() => goTo('agenda')} style={{ background: '#0F172A', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: 13, color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 0.9} onMouseLeave={e => e.currentTarget.style.opacity = 1}>
              + Nueva Cita
            </button>
          </div>
        </div>

        {/* TÍTULO DE VISTA */}
        <div style={{ padding: '32px 32px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
          {selPat && view === 'historia' && (
            <button onClick={() => setSelPat(null)} style={{ background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Atrás
            </button>
          )}
          <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            {selPat && view === 'historia' ? `Expediente: ${selPat.name}` : viewTitles[view]}
          </h1>
        </div>

        {/* CONTENIDO (Responsivo) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            {view === 'dashboard' && <Dashboard setView={goTo} setSelPat={setSelPat} />}
            {view === 'agenda' && <Agenda />}
            {view === 'expediente' && <Expediente teeth={teeth} setTeeth={setTeeth} teethEvolucion={teethEvolucion} setTeethEvolucion={setTeethEvolucion} setView={goTo} />}
            {view === 'caja' && <Caja />}
            {view === 'laboratorio' && <Laboratorio />}
            {view === 'reportes' && <Reportes />}
            {view === 'whatsapp' && <WhatsApp />}
            {view === 'config' && <Config />}
        </div>

      </div>
    </div>
  );
}