// src/App.jsx
import React, { useState, useEffect } from "react";
import { supabase } from './supabase';
import Login from './Login';

// Importar todas las vistas modulares
import Dashboard from './components/vistas/Dashboard';
import Agenda from './components/vistas/Agenda';
import Pacientes from './components/vistas/Pacientes';
import Historia from './components/vistas/Historia';
import Caja from './components/vistas/Caja';
import Laboratorio from './components/vistas/Laboratorio';
import Reportes from './components/vistas/Reportes';
import WhatsApp from './components/vistas/WhatsApp';
import Config from './components/vistas/Config';

import { PATIENTS, P, DN, MU, BD, LT, MT } from './utils/constants';

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [view, setView] = useState('pacientes'); 
  const [selPat, setSelPat] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [teeth, setTeeth] = useState(() => {
    const savedTeeth = localStorage.getItem('dentalOS_odontograma');
    return savedTeeth ? JSON.parse(savedTeeth) : {};
  });

  useEffect(() => {
    localStorage.setItem('dentalOS_odontograma', JSON.stringify(teeth));
  }, [teeth]);

  const [teethEvolucion, setTeethEvolucion] = useState(() => {
    const savedEvo = localStorage.getItem('dentalOS_odontograma_evo');
    return savedEvo ? JSON.parse(savedEvo) : {};
  });

  useEffect(() => {
    localStorage.setItem('dentalOS_odontograma_evo', JSON.stringify(teethEvolucion));
  }, [teethEvolucion]);

  const [patientsList, setPatientsList] = useState(() => {
    const saved = localStorage.getItem('dentalOS_patients');
    return saved ? JSON.parse(saved) : PATIENTS;
  });

  useEffect(() => {
    localStorage.setItem('dentalOS_patients', JSON.stringify(patientsList));
  }, [patientsList]);

  const NAV = [
    { id: 'dashboard', lbl: 'Inicio', i: '▦' },
    { id: 'agenda', lbl: 'Agenda', i: '◫' },
    { id: 'pacientes', lbl: 'Pacientes', i: '◉' },
    { id: 'historia', lbl: 'Clínica', i: '◈' },
    { id: 'caja', lbl: 'Finanzas', i: '◆' },
    { id: 'laboratorio', lbl: 'Lab', i: '◌' },
    { id: 'reportes', lbl: 'Métricas', i: '◍' },
    { id: 'whatsapp', lbl: 'IA', i: '◎' },
    { id: 'config', lbl: 'Ajustes', i: '⚙' }
  ];

  const goTo = (v, p = null) => { setView(v); if (p) setSelPat(p); };

  if (!session) {
    return <Login onLogin={(sessionData) => setSession(sessionData)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden', background: '#F4F7FA' }}>
      
      {/* ─── NIVEL 1: BARRA DE UTILIDADES (Logo, Buscador, Notificaciones, Perfil) ─── */}
      <div style={{ background: '#ffffff', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 30, position: 'relative' }}>
        
        {/* Izquierda: Logo y Clínica */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '12px', background: `linear-gradient(135deg, ${P} 0%, #0284c7 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, color: '#fff', boxShadow: `0 4px 12px ${P}44` }}>S</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: DN, letterSpacing: '-0.5px', lineHeight: 1.2 }}>DentalOS</div>
            <div style={{ fontSize: 11, color: P, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dra. Sol Vargas</div>
          </div>
        </div>

        {/* Centro: Buscador Global (Nuevo elemento) */}
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 24px', position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder="Comando rápido (Ej: Buscar paciente, cita...)" 
            style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', color: DN, outline: 'none', transition: 'all 0.2s' }}
            onFocus={e => { e.target.style.background = '#fff'; e.target.style.borderColor = P; e.target.style.boxShadow = `0 0 0 3px ${P}22`; }}
            onBlur={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
          />
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: '#e2e8f0', color: '#64748b', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Ctrl K</div>
        </div>

        {/* Derecha: Acciones Rápidas y Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          
          {/* Botón Nueva Cita Primario */}
          <button onClick={() => goTo('agenda')} style={{ background: DN, border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: 13, color: '#fff', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(15,23,42,0.15)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Agendar
          </button>

          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>

          {/* Notificaciones (Nuevo) */}
          <div style={{ position: 'relative', cursor: 'pointer', color: '#64748b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: 8, height: 8, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }}></div>
          </div>

          {/* Perfil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 8px', borderRadius: '10px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <img src="/drasolvargas.jpeg" alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${P}` }} onError={(e) => e.target.style.display='none'} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: DN }}>Administrador</span>
            </div>
            <div onClick={handleLogout} style={{ marginLeft: 8, color: '#ef4444', padding: '4px' }} title="Cerrar sesión">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
          </div>

        </div>
      </div>

      {/* ─── NIVEL 2: NAVEGACIÓN TIPO "PÍLDORA" (Centrada e Innovadora) ─── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', background: '#ffffff', borderBottom: `1px solid ${BD}`, boxShadow: '0 10px 20px -10px rgba(0,0,0,0.05)', zIndex: 20, position: 'relative' }}>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px', borderRadius: '16px' }}>
          {NAV.map(it => {
            const isActive = view === it.id;
            return (
              <div key={it.id} onClick={() => goTo(it.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', 
                  cursor: 'pointer', borderRadius: '12px',
                  background: isActive ? '#ffffff' : 'transparent', 
                  color: isActive ? P : '#64748b',
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={e => { if(!isActive) { e.currentTarget.style.color = DN; } }}
                onMouseLeave={e => { if(!isActive) { e.currentTarget.style.color = '#64748b'; } }}>
                <span style={{ fontSize: 16 }}>{it.i}</span>
                <span style={{ fontSize: 13, fontWeight: isActive ? 800 : 600 }}>{it.lbl}</span>
              </div>
            );
          })}
        </nav>
      </div>

      {/* ─── ÁREA DE CONTENIDO (Lienzo Central Expandido) ─── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', width: '100%', margin: '0 auto' }}>
        
        {/* Header Dinámico Contextual (Aparece al entrar a una historia) */}
        {selPat && view === 'historia' && (
          <div style={{ background: '#ffffff', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${BD}` }}>
            <button onClick={() => setSelPat(null)} style={{ background: '#f1f5f9', color: '#475569', border: `none`, borderRadius: '10px', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Volver a Pacientes
            </button>
            <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }}></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: DN }}>Expediente Clínico: <span style={{ color: P }}>{selPat.name}</span></div>
          </div>
        )}

        {/* Las Vistas (Con un max-width gigante para aprovechar el espacio) */}
        <div style={{ flex: 1, width: '100%', maxWidth: '1600px', margin: '0 auto', padding: '32px' }}>
            {view === 'dashboard' && <Dashboard setView={goTo} setSelPat={setSelPat} />}
            {view === 'agenda' && <Agenda />}
            {view === 'pacientes' && <Pacientes setView={goTo} setSelPat={setSelPat} />}
            {view === 'historia' && <Historia patient={selPat} teeth={teeth} setTeeth={setTeeth} teethEvolucion={teethEvolucion} setTeethEvolucion={setTeethEvolucion} setView={goTo} />}
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