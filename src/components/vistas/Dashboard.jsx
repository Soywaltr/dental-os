// src/components/vistas/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import { P, MT, MU, AZ, RJ, TRATAMIENTOS_CAT } from '../../utils/constants';
import { ini, estadoPaciente } from '../../utils/helpers';

const NOMBRE_A_CAT = {};
TRATAMIENTOS_CAT.forEach(c => c.items.forEach(n => { NOMBRE_A_CAT[n] = c.cat; }));

const TABS = [
  { key: 'General', cats: null },
  { key: 'Ortodoncia', cats: ['Ortodoncia'] },
  { key: 'Endodoncia', cats: ['Endodoncia'] },
  { key: 'Rehabilitación', cats: ['Prótesis', 'Restaurador'] },
  { key: 'Implantes', cats: ['Implantología'] },
];

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekDays = (anchor) => {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
  return Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

export default function Dashboard({ setView }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [activeTab, setActiveTab] = useState('General');
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setErrorMsg(null);
      const [{ data: pacientesData, error: errP }, { data: historiasData, error: errH }] = await Promise.all([
        supabase.from('pacientes').select('id, name, doc, phone, tag, created_at, fecha, hora_cita, reason, treatment'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
      ]);
      if (errP || errH) {
        setErrorMsg((errP || errH).message);
        setLoading(false);
        return;
      }
      setPacientes(pacientesData || []);
      setTratamientos((historiasData || []).flatMap(h => (h.plan_tratamiento || []).map(item => ({ ...item, patient_id: h.patient_id }))));
      setLoading(false);
    };
    cargar();
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 12 }}>Cargando dashboard…</div>;
  }
  if (errorMsg) {
    return <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 12 }}>Error al cargar el dashboard: {errorMsg}</div>;
  }

  const hoy = new Date();
  const todayStr = dateStr(hoy);
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);

  const parseFecha = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };

  const cobradoEnRango = (desde, hasta) => tratamientos.reduce((acc, t) => {
    const d = parseFecha(t.date);
    if (d && d >= desde && (!hasta || d < hasta)) return acc + (t.paid || 0);
    return acc;
  }, 0);

  const ingresosMes = cobradoEnRango(inicioMes, null);
  const ingresosMesAnterior = cobradoEnRango(inicioMesAnterior, inicioMes);
  const pctCambio = ingresosMesAnterior > 0 ? Math.round(((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100) : null;

  const estados = { activo: 0, nuevo: 0, inactivo: 0 };
  pacientes.forEach(p => { estados[estadoPaciente(p)]++; });

  const citasHoy = pacientes.filter(p => p.fecha === todayStr && p.hora_cita);
  const pctActivos = pacientes.length > 0 ? Math.round((estados.activo / pacientes.length) * 100) : 0;

  const tab = TABS.find(t => t.key === activeTab) || TABS[0];
  const tratamientosTab = tab.cats ? tratamientos.filter(t => tab.cats.includes(NOMBRE_A_CAT[t.name])) : tratamientos;
  const facturadoTab = tratamientosTab.reduce((a, t) => a + (t.cost || 0), 0);
  const cobradoTab = tratamientosTab.reduce((a, t) => a + (t.paid || 0), 0);

  const bubbles = tab.cats === null
    ? [
      { value: estados.nuevo, label: 'Nuevos', big: true },
      { value: citasHoy.length, label: 'Citas hoy', small: true },
      { value: `S/${(ingresosMes / 1000).toFixed(1)}k`, label: 'Ingresos mes', mid: true },
      { value: `${pctActivos}%`, label: 'Activos', large: true },
    ]
    : [
      { value: tratamientosTab.length, label: 'Tratamientos', big: true },
      { value: `S/${facturadoTab.toLocaleString()}`, label: 'Facturado', small: true },
      { value: `S/${cobradoTab.toLocaleString()}`, label: 'Cobrado', mid: true },
      { value: `S/${(facturadoTab - cobradoTab).toLocaleString()}`, label: 'Pendiente', large: true },
    ];

  // ── Semana / próxima cita ──────────────────────────────────────────────
  const weekDays = getWeekDays(weekAnchor);
  const idxHoy = weekDays.findIndex(d => dateStr(d) === todayStr);
  const dayIdx = selectedIdx !== null ? selectedIdx : (idxHoy >= 0 ? idxHoy : 0);
  const selectedDateStr = dateStr(weekDays[dayIdx]);
  const citasDia = pacientes
    .filter(p => p.fecha === selectedDateStr && p.hora_cita)
    .sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));

  // ── Tasa de cobro y mejor paciente ─────────────────────────────────────
  const totalFacturado = tratamientos.reduce((a, t) => a + (t.cost || 0), 0);
  const totalCobrado = tratamientos.reduce((a, t) => a + (t.paid || 0), 0);
  const totalPendiente = totalFacturado - totalCobrado;
  const tasaCobro = totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 100) : 0;

  const pagadoPorPaciente = new Map();
  tratamientos.forEach(t => { pagadoPorPaciente.set(t.patient_id, (pagadoPorPaciente.get(t.patient_id) || 0) + (t.paid || 0)); });
  let mejorPaciente = null;
  pagadoPorPaciente.forEach((monto, patient_id) => {
    if (monto > 0 && (!mejorPaciente || monto > mejorPaciente.monto)) {
      const p = pacientes.find(pp => pp.id === patient_id);
      if (p) mejorPaciente = { p, monto };
    }
  });

  const bubbleStyle = (b) => {
    if (b.big) return { left: '15%', top: '30%', width: 120, height: 120, background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: '#fff', shadow: 'rgba(139, 92, 246, 0.3)', fs: 24, fl: 11 };
    if (b.small) return { left: '5%', top: '60%', width: 70, height: 70, background: '#e0f2fe', color: '#0369a1', shadow: null, fs: 16, fl: 9 };
    if (b.mid) return { left: '45%', top: '55%', width: 140, height: 140, background: 'linear-gradient(135deg, #c4b5fd, #7c3aed)', color: '#fff', shadow: 'rgba(124, 58, 237, 0.3)', fs: 22, fl: 12 };
    return { right: '5%', top: '20%', width: 150, height: 150, background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: '#fff', shadow: 'rgba(59, 130, 246, 0.3)', fs: 26, fl: 12 };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeIn 0.5s ease-in-out' }}>

      {/* ─── HERO ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-1px' }}>
            Bienvenida de nuevo
          </h1>
          <p style={{ fontSize: 15, color: '#64748B', margin: 0, fontWeight: 500 }}>
            Mira el resumen de tus pacientes y actividad actual aquí
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ background: '#FFFFFF', padding: '16px 24px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
              <Icon name="trendingUp" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                Ingresos este mes
                {pctChangeBadge(pctCambio)}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>S/ {ingresosMes.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: '16px 24px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}>
              <Icon name="userPlus" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Pacientes Nuevos</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{estados.nuevo} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Últimos 30 días</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── GRID PRINCIPAL ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '32px' }}>

        {/* COLUMNA IZQUIERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Analíticas Clínicas */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)', height: '420px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Analíticas Clínicas</h2>
              <div style={{ cursor: 'pointer', color: '#94A3B8' }} onClick={() => setView && setView('reportes')} title="Ver analítica completa">
                <Icon name="trendingUp" size={18} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #F1F5F9', paddingBottom: 16, flexWrap: 'wrap' }}>
              {TABS.map(t => (
                <div key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? '#fff' : '#64748B', background: activeTab === t.key ? '#0F172A' : 'transparent', padding: '6px 16px', borderRadius: '100px', cursor: 'pointer' }}>
                  {t.key}
                </div>
              ))}
            </div>

            <div style={{ flex: 1, position: 'relative', backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #F1F5F9 1px, transparent 1px), linear-gradient(to bottom, #F1F5F9 1px, transparent 1px)' }}>
              {tratamientosTab.length === 0 && tab.cats !== null ? (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MU, fontSize: 13 }}>
                  Sin tratamientos de {activeTab.toLowerCase()} registrados aún.
                </div>
              ) : (
                bubbles.map((b, i) => {
                  const s = bubbleStyle(b);
                  return (
                    <div key={i} style={{ position: 'absolute', left: s.left, right: s.right, top: s.top, width: s.width, height: s.height, borderRadius: '50%', background: s.background, opacity: s.shadow ? 0.9 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: s.color, boxShadow: s.shadow ? `0 10px 25px ${s.shadow}` : 'none' }}>
                      <span style={{ fontSize: s.fs, fontWeight: 800 }}>{b.value}</span>
                      <span style={{ fontSize: s.fl, fontWeight: 500 }}>{b.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Asistente IA Nanda */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '24px 32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Asistente IA Nanda</h2>
              <div onClick={() => setView && setView('whatsapp')} title="Ir a Chat IA"
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#0F172A' }}>
                <Icon name="plus" size={14} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div onClick={() => setView && setView('expediente')} style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', padding: '16px', borderRadius: '20px', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="document" size={16} color="#fff" /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Redactar presupuesto</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>Ir al historial del paciente</div>
                </div>
              </div>
              <div onClick={() => setView && setView('expediente')} style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', padding: '16px', borderRadius: '20px', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="edit" size={16} color="#fff" /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Subir radiografía</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>En la pestaña Imágenes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Agenda */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Agenda</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{weekDays[0].toLocaleString('es-PE', { month: 'long' })}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); setSelectedIdx(null); }}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>&lt;</div>
                  <div onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); setSelectedIdx(null); }}
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>&gt;</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
              {weekDays.map((d, i) => {
                const isSel = i === dayIdx;
                const isToday = dateStr(d) === todayStr;
                return (
                  <div key={i} onClick={() => setSelectedIdx(i)}
                    style={{ width: 44, height: 60, borderRadius: '100px', border: isSel ? 'none' : `1px solid ${isToday ? P : '#E2E8F0'}`, background: isSel ? '#0F172A' : 'transparent', color: isSel ? '#fff' : (isToday ? P : '#0F172A'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {citasDia.length === 0 ? (
              <div style={{ background: '#F8FAFC', borderRadius: '24px', padding: '20px', border: '1px solid #F1F5F9', textAlign: 'center', color: MU, fontSize: 12 }}>
                Sin citas para este día.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {citasDia.slice(0, 3).map(c => (
                  <div key={c.id} onClick={() => setView && setView('agenda')} style={{ background: '#F8FAFC', borderRadius: '24px', padding: '20px', border: '1px solid #F1F5F9', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '16px', background: 'linear-gradient(135deg, #fbcfe8, #bfdbfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{ini(c.name || '?')}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.treatment || c.reason || 'Consulta'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0F172A', marginTop: 8 }}>
                          <Icon name="clock" size={13} />
                          {dateStr(new Date()) === c.fecha ? 'Hoy' : c.fecha}, {c.hora_cita}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rendimiento */}
          <div style={{ background: '#FFFFFF', borderRadius: '32px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.03)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0F172A' }}>Rendimiento</h2>
              <div onClick={() => setView && setView('reportes')} title="Ver analítica completa"
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B' }}>
                <Icon name="trendingUp" size={14} />
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${AZ} ${tasaCobro * 3.6}deg, ${MT} 0deg)` }} />
                <div style={{ position: 'absolute', top: 24, left: 24, right: 24, bottom: 24, borderRadius: '50%', background: '#fff' }} />
                <div style={{ position: 'relative', fontSize: 36, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{tasaCobro}<span style={{ fontSize: 20, color: '#94A3B8' }}>%</span></div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Tasa de cobro</div>
              <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', margin: 0, lineHeight: 1.5, maxWidth: '220px' }}>
                {totalPendiente > 0 ? `S/${totalPendiente.toLocaleString()} pendientes de cobro en total.` : 'No hay saldos pendientes de cobro. Al día.'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              {mejorPaciente ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F5F9', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12, flexShrink: 0 }}>{ini(mejorPaciente.p.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mejorPaciente.p.name}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>Mayor pagador</div>
                    </div>
                  </div>
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: '100px', flexShrink: 0 }}>S/{mejorPaciente.monto.toLocaleString()}</span>
                </>
              ) : (
                <div style={{ fontSize: 12, color: MU }}>Aún no hay pagos registrados.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function pctChangeBadge(pct) {
  if (pct === null) return null;
  const positivo = pct >= 0;
  return (
    <span style={{ background: positivo ? '#0ea5e9' : '#ef4444', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>
      {positivo ? '+' : ''}{pct}%
    </span>
  );
}
