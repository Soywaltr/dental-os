// src/App.jsx
import React, { useState, useEffect } from "react";
import { supabase } from './supabase';
import Login from './Login';

// Importar TODAS las vistas modulares
import Dashboard from './components/vistas/Dashboard';
import Agenda from './components/vistas/Agenda';
import Expediente from './components/vistas/Expediente';
import Caja from './components/vistas/Caja';
import Laboratorio from './components/vistas/Laboratorio';
import Reportes from './components/vistas/Reportes';
import WhatsApp from './components/vistas/WhatsApp';
import Config from './components/vistas/Config';

import { PATIENTS } from './utils/constants';

// Diccionario de Iconos SVG Profesionales y Suaves (COMPLETO)
const ICONS = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  agenda: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  expediente: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
  caja: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
  laboratorio: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><line x1="5.52" y1="16" x2="18.48" y2="16"></line></svg>,
  reportes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  whatsapp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  config: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
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
  const [subAccount, setSubAccount] = useState('Sede Principal');

  const handleLogout = async () => await supabase.auth.signOut();

  // Estados Locales
  const [teeth, setTeeth] = useState(() => JSON.parse(localStorage.getItem('dentalOS_odontograma')) || {});
  useEffect(() => { localStorage.setItem('dentalOS_odontograma', JSON.stringify(teeth)); }, [teeth]);

  const [teethEvolucion, setTeethEvolucion] = useState(() => JSON.parse(localStorage.getItem('dentalOS_odontograma_evo')) || {});
  useEffect(() => { localStorage.setItem('dentalOS_odontograma_evo', JSON.stringify(teethEvolucion)); }, [teethEvolucion]);

  const [patientsList, setPatientsList] = useState(() => JSON.parse(localStorage.getItem('dentalOS_patients')) || PATIENTS);
  useEffect(() => { localStorage.setItem('dentalOS_patients', JSON.stringify(patientsList)); }, [patientsList]);

  // NAVEGACIÓN COMPLETA RESTAURADA
  const NAV = [
    { id: 'dashboard', lbl: 'Dashboard' },
    { id: 'agenda', lbl: 'Agenda' },
    { id: 'expediente', lbl: 'Historial' },
    { id: 'caja', lbl: 'Finanzas' },
    { id: 'laboratorio', lbl: 'Lab' },
    { id: 'reportes', lbl: 'Data' },
    { id: 'whatsapp', lbl: 'Chat IA' },
    { id: 'config', lbl: 'Ajustes' }
  ];

  const goTo = (v, p = null) => { setView(v); if (p) setSelPat(p); };

  if (!session) return <Login onLogin={(sessionData) => setSession(sessionData)} />;

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden', 
      background: 'radial-gradient(circle at top left, #F8FAFC 0%, #E8EDF2 100%)',
      color: '#0F172A' 
    }}>
      
      {/* ─── NAVEGACIÓN SUPERIOR FLOTANTE ─── */}
      <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50, flexShrink: 0, gap: '24px' }}>

        {/* LOGO E SELECTOR DE SEDE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
          <div onClick={() => goTo('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>DentalOS</span>
          </div>

          <div style={{ width: 1, height: 20, background: '#CBD5E1' }}></div>

          {/* Selector GHL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', padding: '6px 12px', borderRadius: '100px', border: '1px solid #E2E8F0', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            <select value={subAccount} onChange={e => setSubAccount(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', WebkitAppearance: 'none' }}>
              <option value="Sede Principal">Sede Principal</option>
              <option value="Sucursal El Golf">Sucursal El Golf</option>
            </select>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        {/* MENÚ CENTRAL (Pill Nav Completo) */}
        <div style={{ background: '#FFFFFF', padding: '6px', borderRadius: '100px', display: 'flex', gap: 4, boxShadow: '0 10px 25px rgba(0,0,0,0.03)', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {NAV.map(it => {
            const isActive = view === it.id;
            return (
              <div key={it.id} onClick={() => goTo(it.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', 
                  cursor: 'pointer', borderRadius: '100px',
                  background: isActive ? '#0F172A' : 'transparent', 
                  color: isActive ? '#FFFFFF' : '#64748B',
                  fontWeight: isActive ? 600 : 500,
                  transition: 'all 0.2s ease-in-out',
                  whiteSpace: 'nowrap'
                }}>
                <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>{ICONS[it.id]}</span>
                <span style={{ fontSize: 13 }}>{it.lbl}</span>
              </div>
            );
          })}
        </div>

        {/* BARRA DE BÚSQUEDA Y PERFIL DERECHA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          
          <div style={{ position: 'relative', width: '200px' }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Búsqueda..." style={{ width: '100%', padding: '10px 16px 10px 38px', borderRadius: '100px', border: 'none', background: '#FFFFFF', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontWeight: 500, color: '#0F172A', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }} />
          </div>

          <div style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></div>
          </div>

          <div onClick={handleLogout} style={{ width: 40, height: 40, borderRadius: '50%', background: '#E2E8F0', backgroundImage: 'url(/drasolvargas.jpeg)', backgroundSize: 'cover', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }} title="Cerrar sesión" />
        </div>

      </div>

      {/* ─── CONTENIDO DINÁMICO COMPLETAMENTE RESTAURADO ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px 40px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1500px' }}>
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