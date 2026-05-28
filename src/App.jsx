// src/App.jsx
import React, { useState, useEffect } from "react";
import { supabase } from './supabase';
import Login from './Login';

import Dashboard from './components/vistas/Dashboard';
import Agenda from './components/vistas/Agenda';
import Pacientes from './components/vistas/Pacientes';
import Historia from './components/vistas/Historia';
import Caja from './components/vistas/Caja';
import Laboratorio from './components/vistas/Laboratorio';
import Reportes from './components/vistas/Reportes';
import WhatsApp from './components/vistas/WhatsApp';
import Config from './components/vistas/Config';

import { PATIENTS, P, DN, MU, BD } from './utils/constants';

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
    { id: 'dashboard', i: '▦', title: 'Dashboard' },
    { id: 'agenda', i: '◫', title: 'Agenda' },
    { id: 'pacientes', i: '◉', title: 'Pacientes' },
    { id: 'historia', i: '◈', title: 'Clínica' },
    { id: 'caja', i: '◆', title: 'Finanzas' },
    { id: 'laboratorio', i: '◌', title: 'Laboratorio' },
    { id: 'whatsapp', i: '◎', title: 'IA' },
    { id: 'config', i: '⚙', title: 'Ajustes' }
  ];

  const goTo = (v, p = null) => { setView(v); if (p) setSelPat(p); };

  if (!session) {
    return <Login onLogin={(sessionData) => setSession(sessionData)} />;
  }

  const viewTitles = {
    dashboard: 'General Data', agenda: 'Calendario', pacientes: 'Directorio',
    historia: 'Expediente', caja: 'Finanzas', laboratorio: 'Laboratorio',
    reportes: 'Métricas', whatsapp: 'Asistente IA', config: 'Ajustes'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden', background: 'linear-gradient(135deg, #B5D8F6 0%, #E2F0FB 100%)' }}>
      
      {/* ─── NAVEGACIÓN SUPERIOR ─── */}
      <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 10, flexWrap: 'wrap', gap: '20px' }}>
        
        {/* LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#0369a1', border: '1px solid rgba(255,255,255,0.6)' }}>
            S
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0369a1', letterSpacing: '-0.5px' }}>DentalOS</span>
        </div>

        {/* NAVEGACIÓN CENTRAL EN PÍLDORA (Mejor contraste) */}
        <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: '30px', padding: '6px 8px', display: 'flex', gap: '4px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          {NAV.map(it => {
            const isActive = view === it.id;
            return (
              <div key={it.id} onClick={() => goTo(it.id)} title={it.title}
                style={{ 
                  width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', borderRadius: '50%',
                  background: isActive ? '#ffffff' : 'transparent', 
                  color: isActive ? '#0284c7' : '#64748b', // Color oscuro para que se vea
                  boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.4)' }}
                onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize: 18, opacity: isActive ? 1 : 0.8 }}>{it.i}</span>
              </div>
            );
          })}
        </div>

        {/* PERFIL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => goTo('agenda')} style={{ background: '#fff', color: '#0284c7', border: '1px solid #bae6fd', padding: '8px 16px', borderRadius: '20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
            + Agendar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#ffffff', padding: '6px 12px 6px 6px', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' }}>SV</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: DN }}>Dra. Sol Vargas</span>
            </div>
            <div onClick={handleLogout} style={{ marginLeft: 4, color: '#94a3b8' }}>
              ✕
            </div>
          </div>
        </div>
      </div>

      {/* ─── TÍTULO GRANDE (Mejor contraste) ─── */}
      <div style={{ padding: '0 50px', marginBottom: '25px', zIndex: 10, position: 'relative' }}>
        <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
          {selPat && view === 'historia' ? 'Expediente del paciente' : 'Resumen de métricas'}
        </div>
        <h1 style={{ fontSize: 42, color: '#0f172a', margin: 0, fontWeight: 900, letterSpacing: '-1px' }}>
          {selPat && view === 'historia' ? selPat.name : viewTitles[view]}
        </h1>
      </div>

      {/* ─── CONTENEDOR BLANCO GIGANTE ─── */}
      <div style={{ flex: 1, background: '#f8fafc', borderRadius: '40px 40px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '0 10px' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
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