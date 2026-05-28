// src/App.jsx
import React, { useState, useEffect } from "react";
import { supabase } from './supabase';
import Login from './Login';

// Importar todas las vistas
import Dashboard from './components/vistas/Dashboard';
import Agenda from './components/vistas/Agenda';
import Expediente from './components/vistas/Expediente';
import Caja from './components/vistas/Caja';
import Laboratorio from './components/vistas/Laboratorio';
import Reportes from './components/vistas/Reportes';
import WhatsApp from './components/vistas/WhatsApp';
import Config from './components/vistas/Config';

import { PATIENTS, P, DN, MU } from './utils/constants';

// Diccionario de Iconos SVG Profesionales
const ICONS = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
  agenda: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  expediente: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  caja: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
  laboratorio: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><line x1="5.52" y1="16" x2="18.48" y2="16"></line></svg>,
  reportes: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  whatsapp: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
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

  const [teeth, setTeeth] = useState(() => JSON.parse(localStorage.getItem('dentalOS_odontograma')) || {});
  useEffect(() => { localStorage.setItem('dentalOS_odontograma', JSON.stringify(teeth)); }, [teeth]);

  const [teethEvolucion, setTeethEvolucion] = useState(() => JSON.parse(localStorage.getItem('dentalOS_odontograma_evo')) || {});
  useEffect(() => { localStorage.setItem('dentalOS_odontograma_evo', JSON.stringify(teethEvolucion)); }, [teethEvolucion]);

  const [patientsList, setPatientsList] = useState(() => JSON.parse(localStorage.getItem('dentalOS_patients')) || PATIENTS);
  useEffect(() => { localStorage.setItem('dentalOS_patients', JSON.stringify(patientsList)); }, [patientsList]);

  const NAV = [
    { id: 'dashboard', lbl: 'Inicio' },
    { id: 'agenda', lbl: 'Agenda' },
    { id: 'expediente', lbl: 'Expediente' },
    { id: 'caja', lbl: 'Finanzas' },
    { id: 'laboratorio', lbl: 'Lab' },
    { id: 'reportes', lbl: 'Data' },
    { id: 'whatsapp', lbl: 'IA' }
  ];

  const goTo = (v, p = null) => { setView(v); if (p) setSelPat(p); };

  if (!session) return <Login onLogin={(sessionData) => setSession(sessionData)} />;

  return (
    // FONDO DE GRADIENTES SUAVES Y "ORBES" DE LUZ PARA ACTIVAR EL EFECTO CRISTAL
    <div style={{ 
      display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden', 
      background: 'radial-gradient(circle at 15% 10%, #e0f2fe 0%, transparent 40%), radial-gradient(circle at 85% 80%, #ede9fe 0%, transparent 40%), #f4f7f9',
      color: '#0F172A' 
    }}>
      
      {/* ─── NAVEGACIÓN SUPERIOR (Glassmorphism Puro) ─── */}
      <div style={{ height: '80px', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.7)', zIndex: 50 }}>

        {/* Logo e Insignia */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(14, 165, 233, 0.3)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            </div>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>DentalOS</span>
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(15,23,42,0.1)' }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.8)', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <select value={subAccount} onChange={e => setSubAccount(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer', WebkitAppearance: 'none' }}>
              <option value="Sede Principal">Sede Principal</option>
              <option value="Sucursal El Golf">Sucursal El Golf</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        {/* Píldora de Menú */}
        <div style={{ background: 'rgba(255,255,255,0.6)', padding: '6px', borderRadius: '100px', display: 'flex', gap: 4, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid rgba(255,255,255,0.8)' }}>
          {NAV.map(it => {
            const isActive = view === it.id;
            return (
              <div key={it.id} onClick={() => goTo(it.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
                  cursor: 'pointer', borderRadius: '100px',
                  background: isActive ? '#0F172A' : 'transparent', 
                  color: isActive ? '#fff' : '#64748B',
                  fontWeight: isActive ? 700 : 600,
                  transition: 'all 0.3s ease'
                }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>{ICONS[it.id]}</span>
                <span style={{ fontSize: 13 }}>{it.lbl}</span>
              </div>
            );
          })}
        </div>

        {/* Buscador & Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Búsqueda global..." style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '100px', border: '1px solid rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.5)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontWeight: 500 }} />
          </div>

          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.8)', color: '#475569' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>

          <div onClick={handleLogout} style={{ width: 44, height: 44, borderRadius: '50%', background: '#E2E8F0', backgroundImage: 'url(/drasolvargas.jpeg)', backgroundSize: 'cover', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Cerrar sesión" />
        </div>

      </div>

      {/* ─── LIENZO PRINCIPAL GLASSMORPHISM ─── */}
      <div style={{ flex: 1, padding: '24px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ 
          width: '100%', maxWidth: '1600px', 
          background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '32px', border: '1px solid rgba(255, 255, 255, 0.9)', 
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)', 
          display: 'flex', flexDirection: 'column', overflow: 'hidden' 
        }}>
          
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

    </div>
  );
}