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

import { PATIENTS, P, DN, MU } from './utils/constants';

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

  const [view, setView] = useState('dashboard');
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
    { id: 'dashboard', lbl: 'Dashboard', i: '▦' },
    { id: 'agenda', lbl: 'Agenda', i: '◫' },
    { id: 'pacientes', lbl: 'Pacientes', i: '◉' },
    { id: 'historia', lbl: 'Historia Clínica', i: '◈' },
    { id: 'caja', lbl: 'Caja', i: '◆' },
    { id: 'laboratorio', lbl: 'Laboratorio', i: '◌' },
    { id: 'reportes', lbl: 'Reportes', i: '◍' },
    { id: 'whatsapp', lbl: 'WhatsApp IA', i: '◎' },
    { id: 'config', lbl: 'Configuración', i: '⚙' }
  ];

  const goTo = (v, p = null) => { setView(v); if (p) setSelPat(p); };

  if (!session) {
    return <Login onLogin={(sessionData) => setSession(sessionData)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden', background: '#f8fafc' }}>
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.02)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: '10px', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', boxShadow: `0 4px 10px ${P}33` }}>S</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: DN, letterSpacing: '-0.3px' }}>DentalOS</div>
            <div style={{ fontSize: 11, color: MU, fontWeight: 500 }}>Dra. Sol Vargas</div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '100%' }}>
          {NAV.map(it => (
            <div key={it.id} onClick={() => goTo(it.id)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', 
                cursor: 'pointer', borderRadius: '0px', background: 'transparent', 
                color: view === it.id ? P : MU, borderBottom: view === it.id ? `3px solid ${P}` : '3px solid transparent',
                transition: 'all 0.2s', height: '100%', boxSizing: 'border-box'
              }}
              onMouseEnter={e => view !== it.id && (e.currentTarget.style.color = DN)}
              onMouseLeave={e => view !== it.id && (e.currentTarget.style.color = MU)}>
              <span style={{ fontSize: 16 }}>{it.i}</span>
              <span style={{ fontSize: 13, fontWeight: view === it.id ? 700 : 600 }}>{it.lbl}</span>
            </div>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => goTo('agenda')} style={{ background: P, border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: 12, color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: `0 4px 12px ${P}44`, transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            + Nueva cita
          </button>
          <div onClick={handleLogout} style={{ width: 38, height: 38, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s', border: `1px solid #ef444433` }} title="Cerrar sesión">
            ✕
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {selPat && view === 'historia' && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 15, flexShrink: 0 }}>
              <button onClick={() => setSelPat(null)} style={{ background: '#fff', color: '#475569', border: `1px solid #cbd5e1`, borderRadius: '8px', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                ← Volver al listado
              </button>
              <div style={{ fontSize: 15, fontWeight: 700, color: DN }}>Historia Clínica de {selPat.name}</div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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
    </div>
  );
}