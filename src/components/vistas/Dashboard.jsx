// src/components/vistas/Dashboard.jsx
// Panel de decisión con layout tipo "bento": tarjetas de distinto tamaño sobre
// una rejilla de 12 columnas, en vez de filas uniformes. Cada tarjeta tiene un
// trabajo claro (saludo, atajos, tendencia, agenda, cobranza, avance) y el peso
// visual sigue la importancia, no el orden en que se escribió el código.
//
// Cruza las 5 tablas de negocio (pacientes, historias, ortodoncia,
// laboratorio_ordenes, gastos): los ingresos de ortodoncia y los gastos no
// existían en ningún total antes.
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import SegmentedControl from '../ui/SegmentedControl';
import { GraficoLineas, Leyenda, Sparkline, Anillo } from '../ui/Graficos';
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
// paletas contra la superficie de las tarjetas -- pasa banda de luminosidad,
// piso de croma, separación bajo daltonismo (ΔE 32.6 protan) y contraste ≥3:1.
// El ámbar de marca (#d97706) quedaba en 2.76:1, de ahí el paso más oscuro.
const COLOR_INGRESOS = CAT_ACCENT;
const COLOR_GASTOS = '#b45309';
const VERDE = '#059669';

// Escala ORDENADA (pendiente → completado), no de identidad: por eso pasos del
// mismo sentido y no rojo/ámbar/verde, cuyo par rojo-ámbar caía en ΔE 9.9 en
// visión normal (piso 15) y era indistinguible. Cada barra en su propia pista.
const ESTADO_TRAT = [
  { key: 'pendiente', label: 'Pendiente', color: '#dc2626' },
  { key: 'en_curso', label: 'En curso', color: '#b45309' },
  { key: 'completado', label: 'Completado', color: VERDE },
];

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

export default function Dashboard({ setView, clinica }) {
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
      // Ortodoncia, laboratorio y gastos son secundarios para la vista: si fallan
      // (una clínica que aún no usa esas tablas) no debe caerse todo el
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
    return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>Cargando dashboard…</div>;
  }
  if (errorMsg) {
    return <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 13.5 }}>Error al cargar el dashboard: {errorMsg}</div>;
  }

  const hoy = new Date();
  const todayStr = dateStr(hoy);

  // ── Serie de 12 meses: ingresos (historias + ortodoncia) vs gastos ────────
  const meses12 = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (11 - i), 1);
    return { anio: d.getFullYear(), mes: d.getMonth(), label: MESES_CORTOS[d.getMonth()], ingresos: 0, gastos: 0 };
  });
  const bucketDe = (d) => meses12.find(m => m.anio === d.getFullYear() && m.mes === d.getMonth());

  tratamientos.forEach(t => { const d = parseFecha(t.date); if (d) { const b = bucketDe(d); if (b) b.ingresos += t.paid || 0; } });
  ortoRows.forEach(o => (o.pagos?.abonos || []).forEach(a => {
    const d = parseFecha(a.fecha); if (d) { const b = bucketDe(d); if (b) b.ingresos += Number(a.monto) || 0; }
  }));
  gastos.forEach(g => { const d = parseFecha(g.fecha); if (d) { const b = bucketDe(d); if (b) b.gastos += g.monto || 0; } });

  const mesActual = meses12[11];
  const mesPrevio = meses12[10];
  const ingresosMes = mesActual.ingresos;
  const gastosMes = mesActual.gastos;
  const utilidadMes = ingresosMes - gastosMes;
  const pctIngresos = mesPrevio.ingresos > 0 ? Math.round(((ingresosMes - mesPrevio.ingresos) / mesPrevio.ingresos) * 100) : null;
  const margenPct = ingresosMes > 0 ? Math.round((utilidadMes / ingresosMes) * 100) : 0;

  const serieIngresos = meses12.map(m => m.ingresos);
  const serieGastos = meses12.map(m => m.gastos);
  const serieUtilidad = meses12.map(m => m.ingresos - m.gastos);
  const seriesGrafico = [
    { nombre: 'Ingresos', color: COLOR_INGRESOS, valores: serieIngresos },
    { nombre: 'Gastos', color: COLOR_GASTOS, valores: serieGastos },
  ];

  // ── Cobranza ─────────────────────────────────────────────────────────────
  const totalFacturado = tratamientos.reduce((a, t) => a + (t.cost || 0), 0);
  const totalCobrado = tratamientos.reduce((a, t) => a + (t.paid || 0), 0);
  const pendienteHistorias = tratamientos.reduce((a, t) => a + Math.max(0, (t.cost || 0) - (t.paid || 0)), 0);
  const pendienteOrto = ortoRows.reduce((a, o) => a + (o.resumen.deuda || 0), 0);
  const saldoPendienteTotal = pendienteHistorias + pendienteOrto;
  const tasaCobro = totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 100) : 0;

  // ── Pacientes / citas ────────────────────────────────────────────────────
  const estados = { activo: 0, nuevo: 0, inactivo: 0 };
  pacientes.forEach(p => { estados[estadoPaciente(p)]++; });
  const citasHoy = pacientes.filter(p => p.fecha === todayStr && p.hora_cita).sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));

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
    .slice(0, 4);
  const maxDeuda = Math.max(...topDeudores.map(d => d.saldo), 1);

  // ── Laboratorio ──────────────────────────────────────────────────────────
  const labEnProceso = labOrders.filter(o => o.status === 'en_proceso');
  const labListo = labOrders.filter(o => o.status === 'listo');
  const labAtrasadas = labEnProceso.filter(o => o.eta && new Date(`${o.eta}T00:00:00`) < hoy);
  const ortoAtrasados = ortoRows.filter(o => o.resumen.deuda > 0);

  // ── Alertas: sólo lo que necesita una acción hoy ─────────────────────────
  const alertas = [
    labAtrasadas.length > 0 && {
      color: RJ, icon: 'clock', view: 'laboratorio',
      texto: `${labAtrasadas.length} orden${labAtrasadas.length !== 1 ? 'es' : ''} de laboratorio atrasada${labAtrasadas.length !== 1 ? 's' : ''}`,
      etiqueta: 'Urgente',
    },
    ortoAtrasados.length > 0 && {
      color: GL, icon: 'warning', view: 'ortodoncia',
      texto: `${ortoAtrasados.length} paciente${ortoAtrasados.length !== 1 ? 's' : ''} de ortodoncia atrasado${ortoAtrasados.length !== 1 ? 's' : ''} en su cuota`,
      etiqueta: 'Cobranza',
    },
    labListo.length > 0 && {
      color: AZ, icon: 'checkCircle', view: 'laboratorio',
      texto: `${labListo.length} trabajo${labListo.length !== 1 ? 's' : ''} de laboratorio listo${labListo.length !== 1 ? 's' : ''} para retirar`,
      etiqueta: 'Laboratorio',
    },
    estados.inactivo > 0 && {
      color: MU, icon: 'users', view: 'expediente',
      texto: `${estados.inactivo} paciente${estados.inactivo !== 1 ? 's' : ''} sin cita hace 6+ meses`,
      etiqueta: 'Seguimiento',
    },
  ].filter(Boolean);

  // ── Pulso por especialidad ───────────────────────────────────────────────
  const tab = CAT_TABS.find(t => t.key === activeTab) || CAT_TABS[0];
  const tratamientosTab = tab.cats ? tratamientos.filter(t => tab.cats.includes(NOMBRE_A_CAT[t.name])) : tratamientos;
  const conteoEstado = { pendiente: 0, en_curso: 0, completado: 0 };
  tratamientosTab.forEach(t => { if (conteoEstado[t.status] !== undefined) conteoEstado[t.status]++; });
  const maxEstado = Math.max(...Object.values(conteoEstado), 1);

  const porNombre = new Map();
  tratamientosTab.forEach(t => {
    const prev = porNombre.get(t.name) || { n: 0, monto: 0 };
    porNombre.set(t.name, { n: prev.n + 1, monto: prev.monto + (t.cost || 0) });
  });
  const topTratamientos = Array.from(porNombre.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.monto - a.monto).slice(0, 4);
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
  ).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxGasto = Math.max(...gastosPorCategoria.map(([, v]) => v), 1);

  // ── Estilos base ─────────────────────────────────────────────────────────
  const card = {
    background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
    border: GLASS_BORDER, borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: GLASS_SHADOW,
    display: 'flex', flexDirection: 'column',
  };
  const h2 = { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--label-primary)', letterSpacing: '-0.1px' };
  const rotulo = { fontSize: 11, color: MU, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' };
  const subCard = { background: 'var(--surface-tertiary)', border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)' };
  // En tablet la rejilla colapsa a una columna y los `span` dejan de aplicar.
  const col = (n) => ({ gridColumn: isTablet ? 'auto' : `span ${n}` });

  const nombreClinica = (clinica?.nombre || '').replace(/^Consultorio\s+/i, '').trim();

  const atajos = [
    { icon: 'calendar', titulo: 'Nueva cita', sub: 'Agendar paciente', view: 'agenda' },
    { icon: 'card', titulo: 'Registrar pago', sub: 'Cobrar saldo', view: 'caja' },
    { icon: 'userPlus', titulo: 'Nuevo paciente', sub: 'Abrir historial', view: 'expediente' },
    { icon: 'chat', titulo: 'Preguntar a la IA', sub: 'Sobre tus datos', view: 'whatsapp' },
  ];

  const kpisMini = [
    { label: 'Ingresos', value: soles(ingresosMes), serie: serieIngresos, col: COLOR_INGRESOS,
      delta: pctIngresos === null ? null : `${pctIngresos >= 0 ? '▲' : '▼'} ${Math.abs(pctIngresos)}%`,
      deltaCol: pctIngresos === null ? MU : (pctIngresos >= 0 ? VERDE : RJ) },
    { label: 'Gastos', value: soles(gastosMes), serie: serieGastos, col: COLOR_GASTOS,
      delta: `${gastosDelMes.length} registro${gastosDelMes.length !== 1 ? 's' : ''}`, deltaCol: MU },
    { label: 'Utilidad neta', value: soles(utilidadMes), serie: serieUtilidad, col: utilidadMes >= 0 ? VERDE : RJ,
      delta: `${margenPct}% de margen`, deltaCol: utilidadMes >= 0 ? VERDE : RJ },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'repeat(12, 1fr)', gap: 14, alignItems: 'start', animation: 'fadeIn 0.4s ease-in-out' }}>

      {/* ─── SALUDO ─── (fila 1: 4 + 8 = 12) */}
      <div style={{ ...col(4), padding: '6px 4px 0' }}>
        <h1 style={{ fontSize: 27, fontWeight: 600, color: 'var(--label-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Hola{nombreClinica ? `, ${nombreClinica}` : ''}
          <br />¿qué tienes para hoy?
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--label-secondary)', margin: '12px 0 0', fontWeight: 500, lineHeight: 1.6, maxWidth: 340 }}>
          {citasHoy.length > 0
            ? <>Tienes <b style={{ color: 'var(--label-primary)' }}>{citasHoy.length} cita{citasHoy.length !== 1 ? 's' : ''}</b> hoy, la próxima a las {citasHoy[0].hora_cita}. </>
            : <>Hoy no tienes citas agendadas. </>}
          {saldoPendienteTotal > 0
            ? <>Quedan <b style={{ color: 'var(--label-primary)' }}>{soles(saldoPendienteTotal)}</b> por cobrar.</>
            : <>La cobranza está al día.</>}
        </p>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ ...subCard, padding: '5px 11px', fontSize: 12, fontWeight: 600, color: 'var(--label-primary)' }}>
            {estados.activo} activos
          </span>
          <span style={{ ...subCard, padding: '5px 11px', fontSize: 12, fontWeight: 600, color: AZ }}>
            {estados.nuevo} nuevos
          </span>
          <span style={{ ...subCard, padding: '5px 11px', fontSize: 12, fontWeight: 600, color: MU }}>
            {tratamientos.length} tratamientos
          </span>
        </div>
      </div>

      {/* ─── ATAJOS ─── una sola tira de accesos rápidos, no 4 tarjetas cuadradas
          idénticas (ícono en cuadrado + título + subtítulo, repetido 4 veces,
          es de los patrones más reconocibles de un dashboard genérico). */}
      <div style={{ ...col(8), ...card, flexDirection: isTablet ? 'column' : 'row', padding: 6, gap: 0 }}>
        {atajos.map((a, i) => (
          <button key={a.titulo} onClick={() => setView && setView(a.view)}
            style={{
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 14px', cursor: 'pointer', borderRadius: 'var(--radius-md)', textAlign: 'left',
              background: 'transparent', border: 'none', font: 'inherit', minHeight: 44,
              borderLeft: (!isTablet && i > 0) ? `1px solid ${BD}` : 'none',
              borderTop: (isTablet && i > 0) ? `1px solid ${BD}` : 'none',
              transition: 'background-color 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--fill-quaternary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Círculo teñido con el acento (var(--accent-soft)/P): un fondo de
                token de texto tipo --label-primary se invierte en modo oscuro y
                se come el ícono blanco fijo -- el acento se mantiene saturado en
                los dos modos. */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: P, flexShrink: 0 }}>
              <Icon name={a.icon} size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--label-primary)', lineHeight: 1.3, whiteSpace: 'nowrap' }}>{a.titulo}</div>
              <div style={{ fontSize: 12, color: MU, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ─── TENDENCIA ─── (fila 2: 8 + 4 = 12) */}
      <div style={{ ...col(8), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <div>
            <h2 style={h2}>Ingresos vs. gastos</h2>
            <div style={{ fontSize: 12, color: MU, marginTop: 2 }}>Cobrado real de los últimos 12 meses, en soles</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Leyenda series={seriesGrafico} />
            <button onClick={() => setVerTabla(v => !v)}
              style={{ background: 'var(--surface-tertiary)', border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)', padding: '4px 11px', fontSize: 12, fontWeight: 600, color: MU, cursor: 'pointer' }}>
              {verTabla ? 'Ver gráfico' : 'Ver tabla'}
            </button>
          </div>
        </div>

        {verTabla ? (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              <thead><tr>
                {['Mes', 'Ingresos', 'Gastos', 'Utilidad'].map(x => (
                  <th key={x} style={{ textAlign: x === 'Mes' ? 'left' : 'right', padding: '6px 8px', color: MU, fontSize: 11, fontWeight: 600, borderBottom: `1px solid ${BD}`, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{x}</th>
                ))}
              </tr></thead>
              <tbody>
                {meses12.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--label-primary)', fontWeight: i === 11 ? 700 : 500, textTransform: 'capitalize' }}>{m.label} {String(m.anio).slice(2)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--label-primary)' }}>{soles(m.ingresos)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--label-primary)' }}>{soles(m.gastos)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: (m.ingresos - m.gastos) >= 0 ? VERDE : RJ }}>{soles(m.ingresos - m.gastos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <GraficoLineas series={seriesGrafico} etiquetas={meses12.map(m => m.label)} formato={soles} alto={218} />
        )}
      </div>

      {/* ─── AGENDA ─── */}
      <div style={{ ...col(4), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={h2}>{weekDays[0].toLocaleString('es-PE', { month: 'long' }).replace(/^./, c => c.toUpperCase())} {weekDays[0].getFullYear()}</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['<', -7], ['>', 7]].map(([lbl, delta]) => (
              <div key={lbl} onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; }); setSelectedIdx(null); }}
                style={{ width: 22, height: 22, borderRadius: '50%', border: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU, fontSize: 13, background: 'var(--surface-tertiary)' }}>
                {lbl}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          {weekDays.map((d, i) => {
            const isSel = i === dayIdx;
            const isToday = dateStr(d) === todayStr;
            const nCitas = pacientes.filter(p => p.fecha === dateStr(d) && p.hora_cita).length;
            return (
              <div key={i} onClick={() => setSelectedIdx(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
                <span style={{ fontSize: 11, color: MU, fontWeight: 600 }}>{DIAS_CORTOS[i]}</span>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: isSel ? 'var(--label-primary)' : 'transparent', border: isSel ? 'none' : `1px solid ${isToday ? P : 'transparent'}`, color: isSel ? '#fff' : 'var(--label-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontWeight: 600 }}>
                  {d.getDate()}
                </div>
                {/* Punto de carga: qué días están ocupados, de un vistazo. */}
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: nCitas > 0 ? P : 'transparent' }} />
              </div>
            );
          })}
        </div>

        {citasDia.length === 0 ? (
          <div style={{ ...subCard, padding: 16, textAlign: 'center', color: MU, fontSize: 13 }}>Sin citas para este día.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {citasDia.slice(0, 3).map(c => (
              <div key={c.id} onClick={() => setView && setView('agenda')} style={{ ...subCard, padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ fontSize: 12, color: MU, fontWeight: 600, marginBottom: 5, fontVariantNumeric: 'tabular-nums' }}>{c.hora_cita}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: `color-mix(in srgb, ${colorPorNombre(c.name)} 9%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colorPorNombre(c.name), fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{ini(c.name || '?')}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.treatment || c.reason || 'Consulta'}</div>
                  </div>
                </div>
              </div>
            ))}
            {citasDia.length > 3 && (
              <div onClick={() => setView && setView('agenda')} style={{ fontSize: 12, color: MU, textAlign: 'center', cursor: 'pointer', fontWeight: 600, paddingTop: 2 }}>
                +{citasDia.length - 3} más →
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── RESUMEN FINANCIERO ─── una sola tira con divisores, no 5 tarjetas
          sueltas con formas distintas (esa mezcla de tarjeta de acento + anillo
          + 3 mini-tarjetas era el tramo más "desordenado" del panel). */}
      <div style={{
        ...col(12), ...card,
        flexDirection: isTablet ? 'column' : 'row',
        alignItems: isTablet ? 'stretch' : 'center',
        gap: isTablet ? 16 : 0,
        padding: isTablet ? 18 : '18px 24px',
      }}>
        {kpisMini.map(k => (
          <React.Fragment key={k.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: isTablet ? undefined : '1 1 0', minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rotulo}>{k.label}</div>
                <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--label-primary)', lineHeight: 1.15, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
                <div style={{ fontSize: 11, color: k.deltaCol, fontWeight: 600, marginTop: 3 }}>{k.delta}</div>
              </div>
              <Sparkline valores={k.serie} color={k.col} ancho={50} alto={26} />
            </div>
            {!isTablet && <div style={{ width: 1, alignSelf: 'stretch', background: BD, margin: '0 22px' }} />}
          </React.Fragment>
        ))}

        <div style={{ flex: isTablet ? undefined : '1.3 1 0', minWidth: 0 }}>
          <div style={{ ...rotulo, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: saldoPendienteTotal > 0 ? RJ : VERDE, flexShrink: 0 }} />
            Por cobrar
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--label-primary)', lineHeight: 1.15, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            {soles(saldoPendienteTotal)}
          </div>
          <div onClick={() => setView && setView('caja')} style={{ fontSize: 11, color: P, fontWeight: 600, marginTop: 3, cursor: 'pointer' }}>
            {saldoPendienteTotal > 0
              ? `${deudaPorPaciente.size} paciente${deudaPorPaciente.size !== 1 ? 's' : ''} · ir a cobrar →`
              : 'Todo cobrado →'}
          </div>
        </div>
        {!isTablet && <div style={{ width: 1, alignSelf: 'stretch', background: BD, margin: '0 22px' }} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Anillo pct={tasaCobro} color={tasaCobro >= 80 ? VERDE : tasaCobro >= 50 ? GL : RJ} tamano={52} grosor={6}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums' }}>{tasaCobro}%</span>
          </Anillo>
          <div>
            <div style={rotulo}>Tasa de cobro</div>
            <div style={{ fontSize: 12, color: MU, marginTop: 3 }}>{soles(totalCobrado)} de {soles(totalFacturado)}</div>
          </div>
        </div>
      </div>

      {/* ─── NECESITA TU ATENCIÓN ─── (fila 4: 5 + 4 + 3 = 12) — las 3 tarjetas
          comparten minHeight para no quedar despareja como antes. */}
      <div style={{ ...col(5), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={h2}>Necesita tu atención</h2>
          {alertas.length > 0 && (
            <span style={{ background: `color-mix(in srgb, ${RJ} 12%, transparent)`, color: RJ, fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 100 }}>{alertas.length}</span>
          )}
        </div>
        {alertas.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: VERDE, fontSize: 13.5, fontWeight: 600, padding: '8px 0' }}>
            <Icon name="checkCircle" size={16} /> Todo al día. Sin pendientes.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {alertas.map((a, i) => (
              <div key={i} onClick={() => setView && setView(a.view)}
                style={{ ...subCard, padding: '11px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', background: `color-mix(in srgb, ${a.color} 10%, transparent)`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={a.icon} size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', lineHeight: 1.35 }}>{a.texto}</div>
                  <span style={{ display: 'inline-block', marginTop: 5, fontSize: 11, fontWeight: 600, color: a.color, background: `color-mix(in srgb, ${a.color} 8%, transparent)`, padding: '2px 7px', borderRadius: 100, letterSpacing: '0.3px' }}>
                    {a.etiqueta}
                  </span>
                </div>
                <span style={{ fontSize: 15, color: MU, flexShrink: 0 }}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── DEUDORES ─── */}
      <div style={{ ...col(4), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={h2}>Mayores deudores</h2>
          {topDeudores.length > 0 && (
            <span onClick={() => setView && setView('caja')} style={{ fontSize: 12, color: MU, cursor: 'pointer', fontWeight: 600 }}>ver todo →</span>
          )}
        </div>
        {topDeudores.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MU }}>Nadie tiene saldo pendiente. Al día.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {topDeudores.map(d => (
              <div key={d.paciente.id} onClick={() => setView && setView('caja')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--fill-tertiary)', border: `1px solid ${BD}`, color: 'var(--label-primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini(d.paciente.name)}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.paciente.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: RJ, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{soles(d.saldo)}</div>
                </div>
                <div style={{ height: 5, background: BD, borderRadius: 3, overflow: 'hidden', marginLeft: 35 }}>
                  <div style={{ height: '100%', width: `${(d.saldo / maxDeuda) * 100}%`, background: RJ, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── LABORATORIO ─── */}
      <div style={{ ...col(3), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={h2}>Laboratorio</h2>
          <div onClick={() => setView && setView('laboratorio')} style={{ cursor: 'pointer', color: 'var(--label-tertiary)' }}>
            <Icon name="activity" size={14} />
          </div>
        </div>
        {labOrders.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MU }}>Sin órdenes registradas.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { l: 'En proceso', v: labEnProceso.length, c: 'var(--label-primary)' },
              { l: 'Atrasadas', v: labAtrasadas.length, c: labAtrasadas.length > 0 ? RJ : MU },
              { l: 'Listas', v: labListo.length, c: VERDE },
            ].map(s => (
              <div key={s.l} style={{ ...subCard, flex: 1, padding: '12px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 19, fontWeight: 600, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, color: MU, marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── PULSO POR ESPECIALIDAD ─── */}
      <div style={{ ...col(8), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={h2}>Pulso por especialidad</h2>
          <SegmentedControl
            options={CAT_TABS.map(t => ({ key: t.key, label: t.key }))}
            value={activeTab}
            onChange={setActiveTab}
            style={{ maxWidth: isTablet ? '100%' : 420 }}
          />
        </div>

        {tratamientosTab.length === 0 ? (
          <div style={{ textAlign: 'center', color: MU, fontSize: 13.5, padding: '24px 0' }}>
            Sin tratamientos de {activeTab.toLowerCase()} registrados aún.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 22 }}>
            <div>
              <div style={{ ...rotulo, marginBottom: 11 }}>Más facturados</div>
              {topTratamientos.map(t => (
                <div key={t.name} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--label-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                    <span style={{ fontSize: 12, color: MU, flexShrink: 0 }}>×{t.n} · <b style={{ color: 'var(--label-primary)' }}>{soles(t.monto)}</b></span>
                  </div>
                  <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(t.monto / maxTrat) * 100}%`, background: colorPorNombre(t.name), borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ ...rotulo, marginBottom: 11 }}>Avance de tratamientos</div>
              {ESTADO_TRAT.map(e => (
                <div key={e.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--label-primary)', fontWeight: 500 }}>{e.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)' }}>{conteoEstado[e.key]}</span>
                  </div>
                  <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(conteoEstado[e.key] / maxEstado) * 100}%`, background: e.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── GASTOS POR CATEGORÍA ─── */}
      <div style={{ ...col(4), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={h2}>Gastos del mes</h2>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--label-primary)' }}>{soles(gastosMes)}</span>
        </div>
        {gastosPorCategoria.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MU }}>Sin gastos registrados este mes.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gastosPorCategoria.map(([cat, monto]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--label-primary)', fontWeight: 500 }}>{cat}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', fontVariantNumeric: 'tabular-nums' }}>{soles(monto)}</span>
                </div>
                <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(monto / maxGasto) * 100}%`, background: colorPorNombre(cat), borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
