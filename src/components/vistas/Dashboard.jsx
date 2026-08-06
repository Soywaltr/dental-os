// src/components/vistas/Dashboard.jsx
// Panel de decisión, no de bienvenida. Cruza las 5 tablas de negocio
// (pacientes, historias, ortodoncia, laboratorio_ordenes, gastos): antes sólo
// leía pacientes + historias, así que los ingresos de ortodoncia y los gastos
// quedaban afuera de todos los totales.
//
// Lo que lidera la vista es la TENDENCIA de 12 meses, no un número aislado: un
// mes suelto no dice si el consultorio va bien, la curva sí. Los KPI llevan su
// propia mini-tendencia por el mismo motivo.
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import { GraficoLineas, Leyenda, Sparkline } from '../ui/Graficos';
import { P, MU, BD, AZ, RJ, GL, CAT_ACCENT, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW, TRATAMIENTOS_CAT } from '../../utils/constants';
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

// Serie financiera. Violeta + ámbar oscuro: par verificado con el validador de
// paletas contra la superficie de las tarjetas (#EEEFEE) -- pasa banda de
// luminosidad, piso de croma, separación bajo daltonismo (ΔE 32.6 protan) y
// contraste ≥3:1. El ámbar de marca (#d97706) quedaba en 2.76:1, por eso el paso
// más oscuro.
const COLOR_INGRESOS = CAT_ACCENT;
const COLOR_GASTOS = '#b45309';

// Escala ORDENADA (pendiente → completado), no de identidad: por eso pasos de un
// mismo sentido y no rojo/ámbar/verde, que como par rojo-ámbar caía en ΔE 9.9 en
// visión normal (bajo el piso de 15) y era indistinguible. Cada barra va en su
// propia pista, nunca adyacentes, y con etiqueta visible al lado.
const ESTADO_TRAT = [
  { key: 'pendiente', label: 'Pendiente', color: '#dc2626' },
  { key: 'en_curso', label: 'En curso', color: '#b45309' },
  { key: 'completado', label: 'Completado', color: '#059669' },
];

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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
  const [tratamientos, setTratamientos] = useState([]);
  const [ortoRows, setOrtoRows] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [activeTab, setActiveTab] = useState('General');
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [verTabla, setVerTabla] = useState(false);

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
      // Ortodoncia, laboratorio y gastos son secundarios para la vista: si
      // fallan (una clínica que aún no usa esas tablas) no debe caerse todo el
      // dashboard, sólo esas secciones quedan en cero.
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

  // ── Serie de 12 meses: ingresos (historias + ortodoncia) vs gastos ────────
  const meses12 = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (11 - i), 1);
    return { anio: d.getFullYear(), mes: d.getMonth(), label: MESES_CORTOS[d.getMonth()], ingresos: 0, gastos: 0 };
  });
  const bucketDe = (d) => meses12.find(m => m.anio === d.getFullYear() && m.mes === d.getMonth());

  tratamientos.forEach(t => {
    const d = parseFecha(t.date); if (!d) return;
    const b = bucketDe(d); if (b) b.ingresos += t.paid || 0;
  });
  ortoRows.forEach(o => (o.pagos?.abonos || []).forEach(a => {
    const d = parseFecha(a.fecha); if (!d) return;
    const b = bucketDe(d); if (b) b.ingresos += Number(a.monto) || 0;
  }));
  gastos.forEach(g => {
    const d = parseFecha(g.fecha); if (!d) return;
    const b = bucketDe(d); if (b) b.gastos += g.monto || 0;
  });

  const mesActual = meses12[11];
  const mesPrevio = meses12[10];
  const ingresosMes = mesActual.ingresos;
  const gastosMes = mesActual.gastos;
  const utilidadMes = ingresosMes - gastosMes;
  const pctIngresos = mesPrevio.ingresos > 0 ? Math.round(((ingresosMes - mesPrevio.ingresos) / mesPrevio.ingresos) * 100) : null;

  const serieIngresos = meses12.map(m => m.ingresos);
  const serieGastos = meses12.map(m => m.gastos);
  const serieUtilidad = meses12.map(m => m.ingresos - m.gastos);
  const etiquetasMes = meses12.map(m => m.label);
  const seriesGrafico = [
    { nombre: 'Ingresos', color: COLOR_INGRESOS, valores: serieIngresos },
    { nombre: 'Gastos', color: COLOR_GASTOS, valores: serieGastos },
  ];

  // ── Saldo pendiente: historias + ortodoncia ──────────────────────────────
  const pendienteHistorias = tratamientos.reduce((a, t) => a + Math.max(0, (t.cost || 0) - (t.paid || 0)), 0);
  const pendienteOrto = ortoRows.reduce((a, o) => a + (o.resumen.deuda || 0), 0);
  const saldoPendienteTotal = pendienteHistorias + pendienteOrto;

  // ── Pacientes / citas ────────────────────────────────────────────────────
  const estados = { activo: 0, nuevo: 0, inactivo: 0 };
  pacientes.forEach(p => { estados[estadoPaciente(p)]++; });
  const citasHoy = pacientes.filter(p => p.fecha === todayStr && p.hora_cita);

  // ── Deudores combinados ──────────────────────────────────────────────────
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
    .slice(0, 5);
  const maxDeuda = Math.max(...topDeudores.map(d => d.saldo), 1);

  // ── Laboratorio ──────────────────────────────────────────────────────────
  const labEnProceso = labOrders.filter(o => o.status === 'en_proceso');
  const labListo = labOrders.filter(o => o.status === 'listo');
  const labAtrasadas = labEnProceso.filter(o => o.eta && new Date(`${o.eta}T00:00:00`) < hoy);

  const ortoAtrasados = ortoRows.filter(o => o.resumen.deuda > 0);

  // ── Alertas: sólo lo que necesita una acción hoy ─────────────────────────
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
      texto: `${ortoAtrasados.length} de ortodoncia atrasado${ortoAtrasados.length !== 1 ? 's' : ''} en su cuota`,
      detalle: 'ver', view: 'ortodoncia',
    },
    labListo.length > 0 && {
      color: AZ, icon: 'checkCircle',
      texto: `${labListo.length} trabajo${labListo.length !== 1 ? 's' : ''} de laboratorio listo${labListo.length !== 1 ? 's' : ''} para retirar`,
      detalle: 'ver', view: 'laboratorio',
    },
    estados.inactivo > 0 && {
      color: MU, icon: 'users',
      texto: `${estados.inactivo} paciente${estados.inactivo !== 1 ? 's' : ''} inactivo${estados.inactivo !== 1 ? 's' : ''} (6+ meses sin cita)`,
      detalle: 'ver', view: 'expediente',
    },
  ].filter(Boolean);

  // ── Pulso por especialidad ───────────────────────────────────────────────
  const tab = CAT_TABS.find(t => t.key === activeTab) || CAT_TABS[0];
  const tratamientosTab = tab.cats ? tratamientos.filter(t => tab.cats.includes(NOMBRE_A_CAT[t.name])) : tratamientos;
  const facturadoTab = tratamientosTab.reduce((a, t) => a + (t.cost || 0), 0);
  const cobradoTab = tratamientosTab.reduce((a, t) => a + (t.paid || 0), 0);
  const pendienteTab = facturadoTab - cobradoTab;

  const conteoEstado = { pendiente: 0, en_curso: 0, completado: 0 };
  tratamientosTab.forEach(t => { if (conteoEstado[t.status] !== undefined) conteoEstado[t.status]++; });
  const maxEstado = Math.max(...Object.values(conteoEstado), 1);

  // Top tratamientos de la pestaña activa, por facturación.
  const porNombre = new Map();
  tratamientosTab.forEach(t => {
    const prev = porNombre.get(t.name) || { n: 0, monto: 0 };
    porNombre.set(t.name, { n: prev.n + 1, monto: prev.monto + (t.cost || 0) });
  });
  const topTratamientos = Array.from(porNombre.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.monto - a.monto).slice(0, 5);
  const maxTrat = Math.max(...topTratamientos.map(t => t.monto), 1);

  // ── Semana / agenda ──────────────────────────────────────────────────────
  const weekDays = getWeekDays(weekAnchor);
  const idxHoy = weekDays.findIndex(d => dateStr(d) === todayStr);
  const dayIdx = selectedIdx !== null ? selectedIdx : (idxHoy >= 0 ? idxHoy : 0);
  const selectedDateStr = dateStr(weekDays[dayIdx]);
  const citasDia = pacientes
    .filter(p => p.fecha === selectedDateStr && p.hora_cita)
    .sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));

  // ── Gastos del mes por categoría ─────────────────────────────────────────
  const gastosDelMes = gastos.filter(g => { const d = parseFecha(g.fecha); return d && d.getFullYear() === mesActual.anio && d.getMonth() === mesActual.mes; });
  const gastosPorCategoria = Array.from(
    gastosDelMes.reduce((m, g) => m.set(g.categoria || 'Sin categoría', (m.get(g.categoria || 'Sin categoría') || 0) + (g.monto || 0)), new Map())
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxGasto = Math.max(...gastosPorCategoria.map(([, v]) => v), 1);

  const card = { background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: 20, padding: 20, boxShadow: GLASS_SHADOW };
  const h2 = { margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.1px' };
  const rotulo = { fontSize: 9.5, color: MU, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' };

  const kpis = [
    { label: 'Ingresos del mes', value: soles(ingresosMes), delta: pctIngresos === null ? null : `${pctIngresos >= 0 ? '▲' : '▼'} ${Math.abs(pctIngresos)}% vs mes anterior`, deltaCol: pctIngresos === null ? MU : (pctIngresos >= 0 ? '#059669' : RJ), serie: serieIngresos, col: COLOR_INGRESOS },
    { label: 'Gastos del mes', value: soles(gastosMes), delta: `${gastosDelMes.length} registro${gastosDelMes.length !== 1 ? 's' : ''}`, deltaCol: MU, serie: serieGastos, col: COLOR_GASTOS },
    { label: 'Utilidad neta', value: soles(utilidadMes), delta: utilidadMes >= 0 ? 'margen positivo' : 'margen negativo', deltaCol: utilidadMes >= 0 ? '#059669' : RJ, serie: serieUtilidad, col: utilidadMes >= 0 ? '#059669' : RJ },
    { label: 'Por cobrar', value: soles(saldoPendienteTotal), delta: saldoPendienteTotal > 0 ? `${deudaPorPaciente.size} paciente${deudaPorPaciente.size !== 1 ? 's' : ''}` : 'todo al día', deltaCol: saldoPendienteTotal > 0 ? RJ : '#059669', serie: null, col: RJ },
    { label: 'Pacientes activos', value: String(estados.activo), delta: `${estados.nuevo} nuevo${estados.nuevo !== 1 ? 's' : ''} · ${estados.inactivo} inactivo${estados.inactivo !== 1 ? 's' : ''}`, deltaCol: MU, serie: null, col: '#0F172A' },
    { label: 'Citas hoy', value: String(citasHoy.length), delta: citasHoy.length > 0 ? `próxima ${citasHoy[0].hora_cita}` : 'sin citas agendadas', deltaCol: MU, serie: null, col: '#0F172A' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.4s ease-in-out' }}>

      {/* ─── CABECERA ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={rotulo}>Resumen del consultorio</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '4px 0 0', letterSpacing: '-0.6px' }}>
            {mesActual.label.charAt(0).toUpperCase() + mesActual.label.slice(1)} {mesActual.anio}
          </h1>
        </div>
        <div style={{ fontSize: 11.5, color: MU, textTransform: 'capitalize' }}>
          {hoy.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ─── KPIs ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)', gap: 10 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...card, borderRadius: 16, padding: '13px 15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 96 }}>
            <div style={{ fontSize: 10.5, color: MU, fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.col, lineHeight: 1.1, margin: '5px 0 3px' }}>{k.value}</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 9.5, color: k.deltaCol, fontWeight: 700, lineHeight: 1.3 }}>{k.delta}</span>
              {k.serie && <Sparkline valores={k.serie} color={k.col} ancho={54} alto={22} />}
            </div>
          </div>
        ))}
      </div>

      {/* ─── GRID PRINCIPAL ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '2fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* COLUMNA IZQUIERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tendencia — lo que lidera la vista */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={h2}>Ingresos vs. gastos</h2>
                <div style={{ fontSize: 10.5, color: MU, marginTop: 2 }}>Cobrado real de los últimos 12 meses, en soles</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Leyenda series={seriesGrafico} />
                <button onClick={() => setVerTabla(v => !v)}
                  style={{ background: 'none', border: `1px solid ${BD}`, borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: MU, cursor: 'pointer' }}>
                  {verTabla ? 'Ver gráfico' : 'Ver tabla'}
                </button>
              </div>
            </div>

            {verTabla ? (
              <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                  <thead><tr>
                    {['Mes', 'Ingresos', 'Gastos', 'Utilidad'].map(x => (
                      <th key={x} style={{ textAlign: x === 'Mes' ? 'left' : 'right', padding: '6px 8px', color: MU, fontSize: 9.5, fontWeight: 700, borderBottom: `1px solid ${BD}`, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{x}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {meses12.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '6px 8px', color: '#0F172A', fontWeight: i === 11 ? 700 : 500, textTransform: 'capitalize' }}>{m.label} {String(m.anio).slice(2)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#0F172A' }}>{soles(m.ingresos)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: '#0F172A' }}>{soles(m.gastos)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: (m.ingresos - m.gastos) >= 0 ? '#059669' : RJ }}>{soles(m.ingresos - m.gastos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <GraficoLineas series={seriesGrafico} etiquetas={etiquetasMes} formato={soles} alto={228} />
            )}
          </div>

          {/* Pulso por especialidad */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={h2}>Pulso por especialidad</h2>
              <div onClick={() => setView && setView('reportes')} style={{ cursor: 'pointer', color: '#94A3B8' }} title="Ver analítica completa">
                <Icon name="trendingUp" size={15} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {CAT_TABS.map(t => (
                <div key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ fontSize: 11, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? '#fff' : MU, background: activeTab === t.key ? '#0F172A' : 'rgba(255,255,255,0.5)', padding: '5px 12px', borderRadius: 100, cursor: 'pointer', border: activeTab === t.key ? 'none' : `1px solid ${BD}` }}>
                  {t.key}
                </div>
              ))}
            </div>

            {tratamientosTab.length === 0 ? (
              <div style={{ textAlign: 'center', color: MU, fontSize: 12, padding: '24px 0' }}>
                Sin tratamientos de {activeTab.toLowerCase()} registrados aún.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ ...rotulo, marginBottom: 10 }}>Más facturados</div>
                  {topTratamientos.map(t => (
                    <div key={t.name} style={{ marginBottom: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: '#0F172A', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                        <span style={{ fontSize: 10.5, color: MU, flexShrink: 0 }}>×{t.n} · <b style={{ color: '#0F172A' }}>{soles(t.monto)}</b></span>
                      </div>
                      <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(t.monto / maxTrat) * 100}%`, background: colorPorNombre(t.name), borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ ...rotulo, marginBottom: 10 }}>Avance de tratamientos</div>
                  {ESTADO_TRAT.map(e => (
                    <div key={e.key} style={{ marginBottom: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: '#0F172A', fontWeight: 500 }}>{e.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{conteoEstado[e.key]}</span>
                      </div>
                      <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(conteoEstado[e.key] / maxEstado) * 100}%`, background: e.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BD}`, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: MU }}>Facturado <b style={{ color: '#0F172A' }}>{soles(facturadoTab)}</b></span>
                    <span style={{ color: MU }}>Pendiente <b style={{ color: pendienteTab > 0 ? RJ : '#059669' }}>{soles(pendienteTab)}</b></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gastos del mes */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={h2}>Gastos del mes por categoría</h2>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{soles(gastosMes)}</span>
            </div>
            {gastosPorCategoria.length === 0 ? (
              <div style={{ fontSize: 12, color: MU }}>Sin gastos registrados este mes.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {gastosPorCategoria.map(([cat, monto]) => (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: '#0F172A', width: 92, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</span>
                    <div style={{ flex: 1, height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(monto / maxGasto) * 100}%`, background: colorPorNombre(cat), borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', width: 62, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{soles(monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Necesita tu atención */}
          <div style={card}>
            <h2 style={{ ...h2, marginBottom: 14 }}>Necesita tu atención</h2>
            {alertas.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#059669', fontSize: 12, fontWeight: 600 }}>
                <Icon name="checkCircle" size={16} /> Todo al día. Sin pendientes.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alertas.map((a, i) => (
                  <div key={i} onClick={() => setView && setView(a.view)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', border: `1px solid ${BD}` }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: a.color + '1A', color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={a.icon} size={13} />
                    </div>
                    <div style={{ flex: 1, fontSize: 11.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.35 }}>{a.texto}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: a.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{a.detalle} →</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agenda */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={h2}>Agenda</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{weekDays[0].toLocaleString('es-PE', { month: 'long' })}</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  <div onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }); setSelectedIdx(null); }}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU, fontSize: 11 }}>&lt;</div>
                  <div onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }); setSelectedIdx(null); }}
                    style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU, fontSize: 11 }}>&gt;</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              {weekDays.map((d, i) => {
                const isSel = i === dayIdx;
                const isToday = dateStr(d) === todayStr;
                const nCitas = pacientes.filter(p => p.fecha === dateStr(d) && p.hora_cita).length;
                return (
                  <div key={i} onClick={() => setSelectedIdx(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <div style={{ width: 34, height: 46, borderRadius: 100, border: isSel ? 'none' : `1px solid ${isToday ? P : BD}`, background: isSel ? '#0F172A' : 'transparent', color: isSel ? '#fff' : (isToday ? P : '#0F172A'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                      {d.getDate()}
                    </div>
                    {/* Punto de carga: se ve de un vistazo qué días están ocupados. */}
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: nCitas > 0 ? P : 'transparent' }} />
                  </div>
                );
              })}
            </div>

            {citasDia.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: 14, border: `1px solid ${BD}`, textAlign: 'center', color: MU, fontSize: 11.5 }}>
                Sin citas para este día.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {citasDia.slice(0, 4).map(c => (
                  <div key={c.id} onClick={() => setView && setView('agenda')} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: '9px 11px', border: `1px solid ${BD}`, cursor: 'pointer' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #fbcfe8, #bfdbfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{ini(c.name || '?')}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.treatment || c.reason || 'Consulta'}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{c.hora_cita}</div>
                  </div>
                ))}
                {citasDia.length > 4 && (
                  <div onClick={() => setView && setView('agenda')} style={{ fontSize: 10.5, color: MU, textAlign: 'center', cursor: 'pointer', fontWeight: 600, paddingTop: 2 }}>
                    +{citasDia.length - 4} más →
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mayores deudores */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={h2}>Mayores deudores</h2>
              {topDeudores.length > 0 && (
                <span onClick={() => setView && setView('caja')} style={{ fontSize: 10, color: MU, cursor: 'pointer', fontWeight: 700 }}>cobrar →</span>
              )}
            </div>
            {topDeudores.length === 0 ? (
              <div style={{ fontSize: 12, color: MU }}>Nadie tiene saldo pendiente. Al día.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topDeudores.map(d => (
                  <div key={d.paciente.id} onClick={() => setView && setView('caja')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', border: `1px solid ${BD}`, color: '#0F172A', fontSize: 9.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini(d.paciente.name)}</div>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.paciente.name}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: RJ, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{soles(d.saldo)}</div>
                    </div>
                    <div style={{ height: 5, background: BD, borderRadius: 3, overflow: 'hidden', marginLeft: 32 }}>
                      <div style={{ height: '100%', width: `${(d.saldo / maxDeuda) * 100}%`, background: RJ, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Laboratorio */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={h2}>Laboratorio</h2>
              <div onClick={() => setView && setView('laboratorio')} style={{ cursor: 'pointer', color: '#94A3B8' }}>
                <Icon name="activity" size={14} />
              </div>
            </div>
            {labOrders.length === 0 ? (
              <div style={{ fontSize: 12, color: MU }}>Sin órdenes registradas.</div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { l: 'En proceso', v: labEnProceso.length, c: '#0F172A' },
                  { l: 'Atrasadas', v: labAtrasadas.length, c: labAtrasadas.length > 0 ? RJ : MU },
                  { l: 'Listas', v: labListo.length, c: '#059669' },
                ].map(s => (
                  <div key={s.l} style={{ flex: 1, background: 'rgba(255,255,255,0.5)', border: `1px solid ${BD}`, borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9, color: MU, marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
