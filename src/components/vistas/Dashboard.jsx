// src/components/vistas/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import useResponsive from '../../utils/useResponsive';
import { ini, estadoPaciente } from '../../utils/helpers';

// --- COLORES EXACTOS DE LA REFERENCIA ---
const COLORS = {
  primary: '#8A74F9',       // Morado principal
  primaryLight: '#EAE7FD',  // Morado translúcido para fondos
  bg: '#F4F5FB',            // Fondo general de la app
  surface: '#FFFFFF',       // Fondo de tarjetas
  textMain: '#202224',      // Texto principal oscuro
  textMuted: '#8F92A1',     // Texto secundario gris
  iconBg1: '#EAE7FD',       // Fondo icono ingresos (morado)
  iconBg2: '#FEF1E8',       // Fondo icono pacientes (naranja)
  iconBg3: '#E6F8F3',       // Fondo icono nuevos (verde)
  iconBg4: '#EBEBF2',       // Fondo icono completados (gris oscuro)
  iconCol1: '#8A74F9',
  iconCol2: '#F97316',
  iconCol3: '#22C55E',
  iconCol4: '#202224',
};

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const soles = (n) => `$${Math.round(n).toLocaleString('en-US')}`; // Formato similar a la imagen

// Componente para el gráfico de línea suavizada (Estilo de la imagen)
const GraficoLineaArea = ({ data, color, alto = 200 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.val), 1);
  const min = 0;
  const ancho = 800; // viewBox width
  
  // Generar curva Bezier suave
  const puntos = data.map((d, i) => {
    const x = (i / (data.length - 1)) * ancho;
    const y = alto - ((d.val - min) / (max - min)) * alto;
    return { x, y, label: d.label };
  });

  let pathD = `M ${puntos[0].x} ${puntos[0].y}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i];
    const p1 = puntos[i + 1];
    const cp1x = p0.x + (p1.x - p0.x) / 2;
    const cp1y = p0.y;
    const cp2x = p0.x + (p1.x - p0.x) / 2;
    const cp2y = p1.y;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${ancho} ${alto} L 0 ${alto} Z`;

  return (
    <div style={{ position: 'relative', width: '100%', height: alto, marginTop: 20 }}>
      <svg viewBox={`0 -10 ${ancho} ${alto + 30}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="gradienteLinea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Eje Y (Grid lines) */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1="0" y1={alto * pct} x2={ancho} y2={alto * pct} stroke="#F0F0F0" strokeWidth="1" />
        ))}
        {/* Área y Línea */}
        <path d={areaD} fill="url(#gradienteLinea)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        {/* Tooltip simulado en el pico más alto */}
        <circle cx={puntos[4].x} cy={puntos[4].y} r="5" fill={color} stroke="#fff" strokeWidth="2" />
        <rect x={puntos[4].x - 55} y={puntos[4].y - 35} width="110" height="24" rx="12" fill={COLORS.textMain} />
        <text x={puntos[4].x} y={puntos[4].y - 19} fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">46 Appointments</text>
        {/* Etiquetas Eje X */}
        {puntos.map((p, i) => (
          <text key={i} x={p.x} y={alto + 20} fill={COLORS.textMuted} fontSize="12" textAnchor="middle" fontWeight="500">{p.label}</text>
        ))}
      </svg>
    </div>
  );
};

export default function Dashboard({ setView, clinica }) {
  const { isTablet } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [ingresosTotales, setIngresosTotales] = useState(0);

  const hoy = new Date();
  const todayStr = dateStr(hoy);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      setLoading(true);
      const [
        { data: pacientesData },
        { data: historiasData },
      ] = await Promise.all([
        supabase.from('pacientes').select('id, name, doc, phone, tag, created_at, fecha, hora_cita, reason, treatment, archivado_at'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
      ]);
      
      if (!vivo) return;
      const activos = (pacientesData || []).filter(p => !p.archivado_at);
      setPacientes(activos);

      let ingresos = 0;
      const trats = [];
      const idsActivos = new Set(activos.map(p => p.id));
      (historiasData || []).forEach(h => {
        if (idsActivos.has(h.patient_id)) {
          (h.plan_tratamiento || []).forEach(item => {
            trats.push({ ...item, patient_id: h.patient_id });
            ingresos += (item.paid || 0);
          });
        }
      });
      setTratamientos(trats);
      setIngresosTotales(ingresos);
      setLoading(false);
    };
    cargar();
    return () => { vivo = false; };
  }, []);

  // ─── DATA MAPPING ───
  const nuevosPacientes = pacientes.filter(p => estadoPaciente(p) === 'nuevo').length;
  const tratamientosCompletados = tratamientos.filter(t => t.status === 'completado').length;
  
  // Data simulada para el gráfico mensual según la imagen (Ene a Dic)
  const chartData = [
    { label: 'Jan', val: 30 }, { label: 'Feb', val: 45 }, { label: 'Mar', val: 40 },
    { label: 'Apr', val: 25 }, { label: 'May', val: 40 }, { label: 'Jun', val: 42 },
    { label: 'Jul', val: 32 }, { label: 'Aug', val: 46 }, { label: 'Sep', val: 35 },
    { label: 'Oct', val: 40 }, { label: 'Nov', val: 25 }, { label: 'Dec', val: 42 },
  ];

  const citasHoy = pacientes.filter(p => p.fecha === todayStr && p.hora_cita).sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));
  const pacientesTabla = pacientes.slice(0, 5); // Últimos pacientes para la tabla
  const nombreUsuario = (clinica?.nombre || 'Usuario').split(' ')[0];

  // ─── ESTILOS ───
  const s = {
    layout: { background: COLORS.bg, minHeight: '100vh', fontFamily: "'Inter', sans-serif", padding: isTablet ? 12 : 24, boxSizing: 'border-box' },
    topNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: COLORS.surface, padding: '12px 24px', borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: 24 },
    navPills: { display: 'flex', gap: 10, background: '#F8F9FA', padding: 6, borderRadius: 100 },
    pillActive: { background: COLORS.primary, color: '#fff', padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' },
    pillInactive: { background: 'transparent', color: COLORS.textMuted, padding: '8px 12px', borderRadius: 100, cursor: 'pointer', display: 'flex', alignItems: 'center' },
    grid: { display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '2fr 1fr', gap: 24, alignItems: 'start' },
    card: { background: COLORS.surface, borderRadius: 24, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' },
    h1: { fontSize: 26, fontWeight: 700, color: COLORS.textMain, margin: '0 0 4px 0' },
    h2: { fontSize: 18, fontWeight: 700, color: COLORS.textMain, margin: 0 },
    subtitle: { fontSize: 14, color: COLORS.textMuted, margin: 0 },
    statsGrid: { display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 16, marginTop: 24, marginBottom: 24 },
    statCard: { background: COLORS.surface, borderRadius: 20, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 14px rgba(0,0,0,0.03)' },
    statNum: { fontSize: 22, fontWeight: 700, color: COLORS.textMain, margin: '0 0 4px 0' },
    statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: 500 },
    iconBox: (bg, col) => ({ width: 44, height: 44, borderRadius: 12, background: bg, color: col, display: 'flex', justifyContent: 'center', alignItems: 'center' }),
    dropdown: { border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: 8, fontSize: 12, color: COLORS.textMuted, fontWeight: 600, background: '#fff', cursor: 'pointer' },
    tableHeader: { background: COLORS.primary, color: '#fff', padding: '14px 20px', borderRadius: '12px 12px 0 0', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 0.5fr', fontSize: 12, fontWeight: 600 },
    tableRow: { display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 0.5fr', padding: '16px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center', fontSize: 13, color: COLORS.textMain },
    avatar: { width: 36, height: 36, borderRadius: '50%', background: COLORS.primaryLight, color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
    sidebarDate: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', borderRadius: 12, border: '1px solid #E2E8F0', minWidth: 50, cursor: 'pointer' },
    sidebarDateActive: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', borderRadius: 12, border: `2px solid ${COLORS.primary}`, minWidth: 50, cursor: 'pointer' },
    appointTime: { width: '70px', fontSize: 13, fontWeight: 600, color: COLORS.textMain, flexShrink: 0 },
    appointCard: { background: '#F8F9FA', borderRadius: 16, padding: 12, display: 'flex', alignItems: 'center', gap: 12, flex: 1, position: 'relative' },
    badge: { position: 'absolute', right: 12, top: 12, background: '#FF7D54', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 100 }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: COLORS.primary }}>Loading Dashboard...</div>;

  return (
    <div style={s.layout} className="dashboard-wrapper">
      
      {/* ─── TOP NAVIGATION ─── */}
      <div style={s.topNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, fontWeight: 800, color: COLORS.textMain }}>
          <div style={{ width: 28, height: 28, background: COLORS.primary, borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={16} />
          </div>
          Dental
        </div>
        
        <div style={s.navPills}>
          <div style={s.pillActive}><Icon name="dashboard" size={16} /> Dashboard</div>
          <div style={s.pillInactive} onClick={() => setView && setView('agenda')}><Icon name="calendar" size={16} /></div>
          <div style={s.pillInactive}><Icon name="help" size={16} /></div>
          <div style={s.pillInactive} onClick={() => setView && setView('expediente')}><Icon name="users" size={16} /></div>
          <div style={s.pillInactive}><Icon name="activity" size={16} /></div>
          <div style={s.pillInactive} onClick={() => setView && setView('whatsapp')}><Icon name="chat" size={16} /></div> {/* Conexión con IA Sofia */}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={s.pillInactive}><Icon name="search" size={18} /></div>
          <div style={s.pillInactive}><Icon name="settings" size={18} /></div>
          <div style={s.pillInactive}><Icon name="bell" size={18} /></div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: COLORS.iconBg2, color: COLORS.iconCol2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {ini(nombreUsuario)}
          </div>
        </div>
      </div>

      <div style={s.grid}>
        {/* ─── COLUMNA IZQUIERDA ─── */}
        <div>
          <div>
            <h1 style={s.h1}>Welcome Back, {nombreUsuario}</h1>
            <p style={s.subtitle}>Here are today's updates!</p>
          </div>

          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div>
                <div style={s.statNum}>{soles(ingresosTotales)}</div>
                <div style={s.statLabel}>Total Earnings</div>
              </div>
              <div style={s.iconBox(COLORS.iconBg1, COLORS.iconCol1)}><Icon name="card" size={20} /></div>
            </div>
            <div style={s.statCard}>
              <div>
                <div style={s.statNum}>{pacientes.length}</div>
                <div style={s.statLabel}>Total Patients</div>
              </div>
              <div style={s.iconBox(COLORS.iconBg2, COLORS.iconCol2)}><Icon name="users" size={20} /></div>
            </div>
            <div style={s.statCard}>
              <div>
                <div style={s.statNum}>{nuevosPacientes}</div>
                <div style={s.statLabel}>New Patients</div>
              </div>
              <div style={s.iconBox(COLORS.iconBg3, COLORS.iconCol3)}><Icon name="userPlus" size={20} /></div>
            </div>
            <div style={s.statCard}>
              <div>
                <div style={s.statNum}>{tratamientosCompletados}</div>
                <div style={s.statLabel}>Treatment Done</div>
              </div>
              <div style={s.iconBox(COLORS.iconBg4, COLORS.iconCol4)}><Icon name="checkCircle" size={20} /></div>
            </div>
          </div>

          <div style={{ ...s.card, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={s.h2}>Appointments Status</h2>
              <div style={s.dropdown}>Monthly <Icon name="chevronDown" size={12} style={{marginLeft: 6}} /></div>
            </div>
            <GraficoLineaArea data={chartData} color={COLORS.primary} />
          </div>

          <div style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={s.h2}>Current Patients</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8F9FA', border: '1px solid #E2E8F0', borderRadius: 100, padding: '8px 16px', color: COLORS.textMuted, fontSize: 13 }}>
                  <Icon name="search" size={14} /> Search...
                </div>
                <button onClick={() => setView && setView('expediente')} style={{ background: COLORS.surface, border: `1px solid ${COLORS.primary}`, color: COLORS.primary, borderRadius: 100, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="plus" size={14} /> Add Patients
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 700 }}>
                <div style={s.tableHeader}>
                  <div>Patients Info</div>
                  <div>Treatment</div>
                  <div>Date</div>
                  <div>Time</div>
                  <div>Chair No.</div>
                  <div style={{ textAlign: 'right' }}></div>
                </div>
                {pacientesTabla.map((p, i) => (
                  <div key={p.id} style={s.tableRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={s.avatar}>{ini(p.name)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{estadoPaciente(p) === 'nuevo' ? '1st visit' : 'Returning'}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 500 }}>{p.treatment || p.reason || 'Checkup'}</div>
                    <div style={{ color: COLORS.textMuted }}>{p.fecha === todayStr ? 'Today' : (p.fecha || 'N/A')}</div>
                    <div style={{ color: COLORS.textMuted }}>{p.hora_cita || 'TBD'}</div>
                    <div style={{ color: COLORS.textMuted }}>A - {10 + i}</div>
                    <div style={{ textAlign: 'right', color: COLORS.textMuted, cursor: 'pointer' }}>
                      <Icon name="eye" size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Paginación simple */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20, fontSize: 13, fontWeight: 600 }}>
              <Icon name="chevronLeft" size={14} style={{ color: COLORS.textMuted }} />
              <span>1</span>
              <span style={{ background: COLORS.primary, color: '#fff', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>2</span>
              <span>3</span>
              <span style={{ color: COLORS.textMuted }}>...</span>
              <span>8</span>
              <Icon name="chevronRight" size={14} />
            </div>
          </div>
        </div>

        {/* ─── COLUMNA DERECHA (Agenda) ─── */}
        <div style={{ ...s.card, minHeight: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={s.h2}>Upcoming Appointments</h2>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
            <Icon name="chevronLeft" size={16} style={{ color: COLORS.textMuted, cursor: 'pointer' }} />
            {hoy.toLocaleString('en-US', { month: 'long' })} {hoy.getFullYear()}
            <Icon name="chevronRight" size={16} style={{ color: COLORS.textMuted, cursor: 'pointer' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            {['Mon', 'Tues', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const isActive = i === 0; // Simulando que el primero es el activo
              return (
                <div key={day} style={isActive ? s.sidebarDateActive : s.sidebarDate}>
                  <div style={{ fontSize: 11, color: isActive ? COLORS.primary : COLORS.textMuted, marginBottom: 4, fontWeight: 600 }}>{day}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isActive ? COLORS.primary : COLORS.textMain }}>{19 + i}</div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 13, color: COLORS.primary, fontWeight: 600, marginBottom: 16 }}>Today, 19 Jan</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {citasHoy.length === 0 ? (
              <div style={{ fontSize: 13, color: COLORS.textMuted, textAlign: 'center', padding: '20px 0' }}>No appointments today.</div>
            ) : (
              citasHoy.map(cita => (
                <div key={cita.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={s.appointTime}>{cita.hora_cita}</div>
                  <div style={s.appointCard}>
                    {estadoPaciente(cita) === 'nuevo' && <div style={s.badge}>New Patients</div>}
                    <div style={s.avatar}>{ini(cita.name)}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textMain }}>{cita.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{cita.treatment || cita.reason || 'Consultation'}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}