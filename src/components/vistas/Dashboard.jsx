// src/components/vistas/Dashboard.jsx
// Pensado como panel de decisión, no de bienvenida: arriba los números que
// resumen el mes (con la utilidad neta, que antes no existía en ningún lado
// de la app), después lo que necesita acción hoy, y a los costados agenda y
// los focos de riesgo (laboratorio, ortodoncia, pacientes inactivos). Cruza
// las 5 tablas de negocio (pacientes, historias, ortodoncia, laboratorio_ordenes,
// gastos) -- antes el Dashboard solo leía pacientes + historias, así que los
// ingresos de ortodoncia y los gastos quedaban completamente afuera del total.
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import { P, MU, BD, AZ, RJ, GL, WA, CAT_ACCENT, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW, TRATAMIENTOS_CAT } from '../../utils/constants';
import { ini, estadoPaciente, resumenPagosOrtodoncia, colorPorNombre } from '../../utils/helpers';
import useResponsive from '../../utils/useResponsive';

const NOMBRE_A_CAT = {};
TRATAMIENTOS_CAT.forEach(c => c.items.forEach(n => { NOMBRE_A_CAT[n] = c.cat; }));

const CAT_TABS = [
  { key: 'General', cats: null },
  { key: 'Ortodoncia', cats: ['Ortodoncia'] },
  { key: 'Endodoncia', cats: ['Endodoncia'] },
  { key: 'Rehabilitación', cats: ['Prótesis', 'Restaurador'] },
  { key: 'Implantes', cats: ['Implantología'] },
];

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseFecha = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
const soles = (n) => `S/${Math.round(n).toLocaleString('es-PE')}`;

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
  const { isTablet } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]); // plan_tratamiento de historias, aplanado
  const [ortoRows, setOrtoRows] = useState([]); // filas de ortodoncia, con resumen de pagos ya calculado
  const [labOrders, setLabOrders] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [activeTab, setActiveTab] = useState('General');
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedIdx, setSelectedIdx] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setErrorMsg(null);
      const [
        { data: pacientesData, error: errP },
        { data: historiasData, error: errH },
        { data: ortoData, error: errO },
        { data: labData, error: errL },
        { data: gastosData, error: errG },
      ] = await Promise.all([
        supabase.from('pacientes').select('id, name, doc, phone, tag, created_at, fecha, hora_cita, reason, treatment'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
        supabase.from('ortodoncia').select('paciente_id, pagos, plan_tratamiento, resumen'),
        supabase.from('laboratorio_ordenes').select('id, patient_id, patient_name, type, cost, eta, status'),
        supabase.from('gastos').select('categoria, monto, fecha'),
      ]);
      // Laboratorio y gastos son secundarios para la vista: si fallan (por
      // ejemplo, una clínica que aún no usa esas tablas) no debe tumbar todo
      // el dashboard -- solo esas secciones quedan en 0.
      if (errP || errH) {
        setErrorMsg((errP || errH).message);
        setLoading(false);
        return;
      }
      setPacientes(pacientesData || []);
      setTratamientos((historiasData || []).flatMap(h => (h.plan_tratamiento || []).map(item => ({ ...item, patient_id: h.patient_id }))));
      setOrtoRows((errO ? [] : (ortoData || [])).map(o => {
        const fechaInicio = o.plan_tratamiento?.fecha_inicial || o.resumen?.fecha_inicial || '';
        return { ...o, fechaInicio, resumen: resumenPagosOrtodoncia(o.pagos, fechaInicio) };
      }));
      setLabOrders(errL ? [] : (labData || []));
      setGastos(errG ? [] : (gastosData || []));
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

  // ── Ingresos: combina historias (tratamientos generales) + ortodoncia (pago
  // inicial/cuotas/extras) -- antes el dashboard solo veía la primera fuente. ──
  const cobradoHistoriasEnRango = (desde, hasta) => tratamientos.reduce((acc, t) => {
    const d = parseFecha(t.date);
    return (d && d >= desde && (!hasta || d < hasta)) ? acc + (t.paid || 0) : acc;
  }, 0);
  const cobradoOrtoEnRango = (desde, hasta) => ortoRows.reduce((acc, o) =>
    acc + (o.pagos?.abonos || []).reduce((s, a) => {
      const d = parseFecha(a.fecha);
      return (d && d >= desde && (!hasta || d < hasta)) ? s + (Number(a.monto) || 0) : s;
    }, 0), 0);

  const ingresosMes = cobradoHistoriasEnRango(inicioMes, null) + cobradoOrtoEnRango(inicioMes, null);
  const ingresosMesAnterior = cobradoHistoriasEnRango(inicioMesAnterior, inicioMes) + cobradoOrtoEnRango(inicioMesAnterior, inicioMes);
  const pctIngresos = ingresosMesAnterior > 0 ? Math.round(((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100) : null;

  const gastosDelMes = gastos.filter(g => { const d = parseFecha(g.fecha); return d && d >= inicioMes; });
  const gastosMes = gastosDelMes.reduce((s, g) => s + (g.monto || 0), 0);
  const utilidadMes = ingresosMes - gastosMes;

  // ── Saldo pendiente: historias + ortodoncia ──────────────────────────────
  const pendienteHistorias = tratamientos.reduce((a, t) => a + Math.max(0, (t.cost || 0) - (t.paid || 0)), 0);
  const pendienteOrto = ortoRows.reduce((a, o) => a + (o.resumen.deuda || 0), 0);
  const saldoPendienteTotal = pendienteHistorias + pendienteOrto;

  // ── Pacientes / citas ─────────────────────────────────────────────────────
  const estados = { activo: 0, nuevo: 0, inactivo: 0 };
  pacientes.forEach(p => { estados[estadoPaciente(p)]++; });
  const citasHoy = pacientes.filter(p => p.fecha === todayStr && p.hora_cita);

  // ── Deudores combinados (historias + ortodoncia) ─────────────────────────
  const deudaPorPaciente = new Map();
  tratamientos.forEach(t => {
    const saldo = (t.cost || 0) - (t.paid || 0);
    if (saldo > 0) deudaPorPaciente.set(t.patient_id, (deudaPorPaciente.get(t.patient_id) || 0) + saldo);
  });
  ortoRows.forEach(o => {
    if (o.resumen.deuda > 0) deudaPorPaciente.set(o.paciente_id, (deudaPorPaciente.get(o.paciente_id) || 0) + o.resumen.deuda);
  });
  const topDeudores = Array.from(deudaPorPaciente.entries())
    .map(([id, saldo]) => ({ paciente: pacientes.find(p => p.id === id), saldo }))
    .filter(d => d.paciente)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 4);

  // ── Laboratorio ───────────────────────────────────────────────────────────
  const labEnProceso = labOrders.filter(o => o.status === 'en_proceso');
  const labListo = labOrders.filter(o => o.status === 'listo');
  const labAtrasadas = labEnProceso.filter(o => o.eta && new Date(`${o.eta}T00:00:00`) < hoy);

  // ── Ortodoncia atrasada ───────────────────────────────────────────────────
  const ortoAtrasados = ortoRows.filter(o => o.resumen.deuda > 0);

  // ── Alertas: solo lo que de verdad necesita una acción hoy ───────────────
  const alertas = [
    deudaPorPaciente.size > 0 && {
      color: RJ, icon: 'warning',
      texto: `${deudaPorPaciente.size} paciente${deudaPorPaciente.size !== 1 ? 's' : ''} con saldo pendiente`,
      detalle: soles(saldoPendienteTotal), view: 'caja',
    },
    labAtrasadas.length > 0 && {
      color: GL, icon: 'clock',
      texto: `${labAtrasadas.length} orden${labAtrasadas.length !== 1 ? 'es' : ''} de laboratorio atrasada${labAtrasadas.length !== 1 ? 's' : ''}`,
      detalle: 'ver', view: 'laboratorio',
    },
    ortoAtrasados.length > 0 && {
      color: GL, icon: 'clock',
      texto: `${ortoAtrasados.length} paciente${ortoAtrasados.length !== 1 ? 's' : ''} de ortodoncia atrasado${ortoAtrasados.length !== 1 ? 's' : ''} en su cuota`,
      detalle: 'ver', view: 'ortodoncia',
    },
    estados.inactivo > 0 && {
      color: MU, icon: 'users',
      texto: `${estados.inactivo} paciente${estados.inactivo !== 1 ? 's' : ''} inactivo${estados.inactivo !== 1 ? 's' : ''} (sin cita hace 6+ meses)`,
      detalle: 'ver', view: 'expediente',
    },
  ].filter(Boolean);

  // ── Pulso por especialidad (pestañas) ────────────────────────────────────
  const tab = CAT_TABS.find(t => t.key === activeTab) || CAT_TABS[0];
  const tratamientosTab = tab.cats ? tratamientos.filter(t => tab.cats.includes(NOMBRE_A_CAT[t.name])) : tratamientos;
  const facturadoTab = tratamientosTab.reduce((a, t) => a + (t.cost || 0), 0);
  const cobradoTab = tratamientosTab.reduce((a, t) => a + (t.paid || 0), 0);
  const pendienteTab = facturadoTab - cobradoTab;
  const maxBarraTab = Math.max(facturadoTab, cobradoTab, 1);

  // ── Semana / próxima cita ─────────────────────────────────────────────────
  const weekDays = getWeekDays(weekAnchor);
  const idxHoy = weekDays.findIndex(d => dateStr(d) === todayStr);
  const dayIdx = selectedIdx !== null ? selectedIdx : (idxHoy >= 0 ? idxHoy : 0);
  const selectedDateStr = dateStr(weekDays[dayIdx]);
  const citasDia = pacientes
    .filter(p => p.fecha === selectedDateStr && p.hora_cita)
    .sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));

  // ── Gastos del mes por categoría ──────────────────────────────────────────
  const gastosPorCategoria = Array.from(
    gastosDelMes.reduce((m, g) => m.set(g.categoria || 'Sin categoría', (m.get(g.categoria || 'Sin categoría') || 0) + (g.monto || 0)), new Map())
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxGasto = Math.max(...gastosPorCategoria.map(([, v]) => v), 1);

  const cardStyle = { background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: 24, padding: 24, boxShadow: GLASS_SHADOW };
  const sectionTitle = { margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.5s ease-in-out' }}>

      {/* ─── HERO ─── */}
      <div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
          Bienvenida de nuevo
        </h1>
        <p style={{ fontSize: 13, color: '#475569', margin: 0, fontWeight: 500 }}>
          {hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} — esto es lo que necesita tu atención hoy
        </p>
      </div>

      {/* ─── FILA DE KPIs ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { label: 'Ingresos del mes', value: soles(ingresosMes), sub: pctIngresos === null ? null : `${pctIngresos >= 0 ? '↑' : '↓'} ${Math.abs(pctIngresos)}% vs mes anterior`, subColor: pctIngresos === null ? MU : (pctIngresos >= 0 ? '#16a34a' : RJ), col: '#0F172A' },
          { label: 'Gastos del mes', value: soles(gastosMes), sub: null, col: '#0F172A' },
          { label: 'Utilidad neta', value: soles(utilidadMes), sub: utilidadMes >= 0 ? 'positiva' : 'negativa', subColor: utilidadMes >= 0 ? '#16a34a' : RJ, col: utilidadMes >= 0 ? '#16a34a' : RJ },
          { label: 'Por cobrar', value: soles(saldoPendienteTotal), sub: saldoPendienteTotal > 0 ? `${deudaPorPaciente.size} pacientes` : 'al día', subColor: saldoPendienteTotal > 0 ? RJ : '#16a34a', col: saldoPendienteTotal > 0 ? RJ : '#0F172A' },
          { label: 'Pacientes nuevos', value: String(estados.nuevo), sub: 'últimos 30 días', subColor: MU, col: '#0F172A' },
          { label: 'Citas hoy', value: String(citasHoy.length), sub: citasHoy.length > 0 ? 'agendadas' : 'sin citas', subColor: MU, col: '#0F172A' },
        ].map(k => (
          <div key={k.label} style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 18, padding: '14px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: 10.5, color: '#64748B', fontWeight: 600, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: k.col, lineHeight: 1.15 }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 10, color: k.subColor, fontWeight: 700, marginTop: 3 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ─── GRID PRINCIPAL ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1.6fr 1fr', gap: '20px' }}>

        {/* COLUMNA IZQUIERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Necesita tu atención */}
          <div style={cardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 16 }}>Necesita tu atención</h2>
            {alertas.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#16a34a', fontSize: 13, fontWeight: 600 }}>
                <Icon name="checkCircle" size={18} /> Todo al día. Sin pendientes urgentes.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alertas.map((a, i) => (
                  <div key={i} onClick={() => setView && setView(a.view)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F8FAFC', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', border: '1px solid #F1F5F9' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: a.color + '18', color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={a.icon} size={15} />
                    </div>
                    <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#0F172A' }}>{a.texto}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: a.color, whiteSpace: 'nowrap' }}>{a.detalle} →</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pulso por especialidad */}
          <div style={{ ...cardStyle, padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={sectionTitle}>Pulso por especialidad</h2>
              <div onClick={() => setView && setView('reportes')} style={{ cursor: 'pointer', color: '#94A3B8' }} title="Ver analítica completa">
                <Icon name="trendingUp" size={16} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 14, flexWrap: 'wrap' }}>
              {CAT_TABS.map(t => (
                <div key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ fontSize: 12, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? '#fff' : '#64748B', background: activeTab === t.key ? '#0F172A' : 'transparent', padding: '5px 14px', borderRadius: 100, cursor: 'pointer' }}>
                  {t.key}
                </div>
              ))}
            </div>

            {tratamientosTab.length === 0 && tab.cats !== null ? (
              <div style={{ textAlign: 'center', color: MU, fontSize: 12.5, padding: '20px 0' }}>
                Sin tratamientos de {activeTab.toLowerCase()} registrados aún.
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
                  {[
                    { l: 'Tratamientos', v: String(tratamientosTab.length), c: '#0F172A' },
                    { l: 'Cobrado', v: soles(cobradoTab), c: '#16a34a' },
                    { l: 'Pendiente', v: soles(pendienteTab), c: pendienteTab > 0 ? RJ : MU },
                  ].map(s => (
                    <div key={s.l} style={{ background: '#F8FAFC', borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {/* Facturado vs. cobrado: dos barras finas, mismo eje, sin decorar de más. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['Facturado', facturadoTab, CAT_ACCENT], ['Cobrado', cobradoTab, WA]].map(([lbl, val, color]) => (
                    <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10.5, color: '#64748B', width: 64, flexShrink: 0 }}>{lbl}</span>
                      <div style={{ flex: 1, height: 8, background: BD, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(val / maxBarraTab) * 100}%`, background: color, borderRadius: 4, transition: 'width .3s' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', width: 68, textAlign: 'right', flexShrink: 0 }}>{soles(val)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Agenda */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={sectionTitle}>Agenda</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{weekDays[0].toLocaleString('es-PE', { month: 'long' })}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); setSelectedIdx(null); }}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', fontSize: 12 }}>&lt;</div>
                  <div onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); setSelectedIdx(null); }}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748B', fontSize: 12 }}>&gt;</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              {weekDays.map((d, i) => {
                const isSel = i === dayIdx;
                const isToday = dateStr(d) === todayStr;
                return (
                  <div key={i} onClick={() => setSelectedIdx(i)}
                    style={{ width: 38, height: 52, borderRadius: 100, border: isSel ? 'none' : `1px solid ${isToday ? P : '#E2E8F0'}`, background: isSel ? '#0F172A' : 'transparent', color: isSel ? '#fff' : (isToday ? P : '#0F172A'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {d.getDate()}
                  </div>
                );
              })}
            </div>

            {citasDia.length === 0 ? (
              <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 16, border: '1px solid #F1F5F9', textAlign: 'center', color: MU, fontSize: 12 }}>
                Sin citas para este día.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {citasDia.slice(0, 3).map(c => (
                  <div key={c.id} onClick={() => setView && setView('agenda')} style={{ background: '#F8FAFC', borderRadius: 16, padding: 14, border: '1px solid #F1F5F9', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, #fbcfe8, #bfdbfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{ini(c.name || '?')}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.treatment || c.reason || 'Consulta'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>
                        <Icon name="clock" size={12} /> {c.hora_cita}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mayores deudores */}
          <div style={cardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 14 }}>Mayores deudores</h2>
            {topDeudores.length === 0 ? (
              <div style={{ fontSize: 12, color: MU }}>Nadie tiene saldo pendiente. Al día.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {topDeudores.map((d, i) => (
                  <div key={d.paciente.id} onClick={() => setView && setView('caja')}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i !== topDeudores.length - 1 ? '1px solid #F1F5F9' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1F5F9', color: '#0F172A', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini(d.paciente.name)}</div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.paciente.name}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: RJ, flexShrink: 0 }}>{soles(d.saldo)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Laboratorio */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={sectionTitle}>Laboratorio</h2>
              <div onClick={() => setView && setView('laboratorio')} style={{ cursor: 'pointer', color: '#94A3B8' }}>
                <Icon name="activity" size={15} />
              </div>
            </div>
            {labOrders.length === 0 ? (
              <div style={{ fontSize: 12, color: MU }}>Sin órdenes registradas.</div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { l: 'En proceso', v: labEnProceso.length, c: AZ },
                  { l: 'Atrasadas', v: labAtrasadas.length, c: labAtrasadas.length > 0 ? RJ : MU },
                  { l: 'Listas', v: labListo.length, c: '#16a34a' },
                ].map(s => (
                  <div key={s.l} style={{ flex: 1, background: '#F8FAFC', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9.5, color: '#64748B', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gastos del mes */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={sectionTitle}>Gastos del mes</h2>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{soles(gastosMes)}</span>
            </div>
            {gastosPorCategoria.length === 0 ? (
              <div style={{ fontSize: 12, color: MU }}>Sin gastos registrados este mes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gastosPorCategoria.map(([cat, monto]) => {
                  const color = colorPorNombre(cat);
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 10.5, color: '#64748B', width: 84, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</span>
                      <div style={{ flex: 1, height: 8, background: BD, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(monto / maxGasto) * 100}%`, background: color, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', width: 56, textAlign: 'right', flexShrink: 0 }}>{soles(monto)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
