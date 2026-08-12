// src/components/vistas/Dashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import Stat from '../ui/Stat';
import SegmentedControl from '../ui/SegmentedControl';
import { GraficoBarras, Anillo } from '../ui/Graficos';
import { P, MU, BD, AZ, RJ, GL, TRATAMIENTOS_CAT } from '../../utils/constants';
import { ini, estadoPaciente, resumenPagosOrtodoncia, colorPorNombre } from '../../utils/helpers';
import useResponsive from '../../utils/useResponsive';
import useNumeroAnimado from '../../utils/useNumeroAnimado';

const RANGOS = [
  { key: '7d', label: '7D', n: 7, dia: true },
  { key: '30d', label: '30D', n: 30, dia: true },
  { key: '6m', label: '6M', n: 6, dia: false },
  { key: '12m', label: '12M', n: 12, dia: false },
];
const DIAS_SEMANA_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const METRICAS = [
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'utilidad', label: 'Utilidad' },
  { key: 'gastos', label: 'Gastos' },
];

const NOMBRE_A_CAT = {};
TRATAMIENTOS_CAT.forEach(c => c.items.forEach(n => { NOMBRE_A_CAT[n] = c.cat; }));

const CAT_TABS = [
  { key: 'General', cats: null },
  { key: 'Ortodoncia', cats: ['Ortodoncia'] },
  { key: 'Endodoncia', cats: ['Endodoncia'] },
  { key: 'Rehabilitación', cats: ['Prótesis', 'Restaurador'] },
  { key: 'Implantes', cats: ['Implantología'] },
];

const VERDE = 'var(--green)';
const ESTADO_TRAT = [
  { key: 'pendiente', label: 'Pendiente', color: RJ },
  { key: 'en_curso', label: 'En curso', color: GL },
  { key: 'completado', label: 'Completado', color: VERDE },
];

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseFecha = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
const soles = (n) => `S/${Math.round(n).toLocaleString('es-PE')}`;

const formatoHaceTiempo = (fecha) => {
  const seg = Math.max(0, Math.round((Date.now() - fecha.getTime()) / 1000));
  if (seg < 60) return `${seg}s`;
  return `${Math.round(seg / 60)}min`;
};

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

const SUGERENCIAS_IA = [
  '¿Cuánto facturé este mes?',
  '¿Quién me debe más?',
  '¿Qué tratamiento deja más?',
];

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
  const [rango, setRango] = useState('12m');
  const [metrica, setMetrica] = useState('ingresos');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [, forzarTick] = useState(0);

  const esPrimeraCargaRef = useRef(true);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      if (esPrimeraCargaRef.current) setLoading(true);
      setErrorMsg(null);
      const [
        { data: pacientesData, error: errP },
        { data: historiasData, error: errH },
        { data: ortoData, error: errO },
        { data: labData, error: errL },
        { data: gastosData, error: errG },
      ] = await Promise.all([
        supabase.from('pacientes').select('id, name, doc, phone, tag, created_at, fecha, hora_cita, reason, treatment, archivado_at'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
        supabase.from('ortodoncia').select('paciente_id, pagos, plan_tratamiento, resumen'),
        supabase.from('laboratorio_ordenes').select('id, patient_id, patient_name, type, cost, eta, status'),
        supabase.from('gastos').select('categoria, monto, fecha'),
      ]);
      if (!vivo) return;
      if (errP || errH) {
        setErrorMsg((errP || errH).message);
        setLoading(false);
        return;
      }
      const activos = (pacientesData || []).filter(p => !p.archivado_at);
      setPacientes(activos);

      const idsActivos = new Set(activos.map(p => p.id));
      setTratamientos(
        (historiasData || [])
          .filter(h => idsActivos.has(h.patient_id))
          .flatMap(h => (h.plan_tratamiento || []).map(item => ({ ...item, patient_id: h.patient_id })))
      );
      setOrtoRows((errO ? [] : (ortoData || [])).map(o => {
        const fechaInicio = o.plan_tratamiento?.fecha_inicial || o.resumen?.fecha_inicial || '';
        return { ...o, fechaInicio, resumen: resumenPagosOrtodoncia(o.pagos, fechaInicio) };
      }));
      setLabOrders(errL ? [] : (labData || []));
      setGastos(errG ? [] : (gastosData || []));
      setLoading(false);
      setUltimaActualizacion(new Date());
      esPrimeraCargaRef.current = false;
    };
    cargar();
    const intervaloDatos = setInterval(cargar, 60_000);
    const intervaloTick = setInterval(() => forzarTick(v => v + 1), 15_000);
    return () => { vivo = false; clearInterval(intervaloDatos); clearInterval(intervaloTick); };
  }, []);

  const hoy = new Date();
  const todayStr = dateStr(hoy);

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
  const utilidadPrevia = mesPrevio.ingresos - mesPrevio.gastos;
  const margenPct = ingresosMes > 0 ? Math.round((utilidadMes / ingresosMes) * 100) : 0;

  const deltaPct = (actual, previo) => (previo > 0 ? Math.round(((actual - previo) / previo) * 100) : null);
  const pctIngresos = deltaPct(ingresosMes, mesPrevio.ingresos);
  const pctUtilidad = deltaPct(utilidadMes, utilidadPrevia);
  const pctGastos = deltaPct(gastosMes, mesPrevio.gastos);

  const rangoActual = RANGOS.find(r => r.key === rango) || RANGOS[3];
  const bucketsRango = Array.from({ length: rangoActual.n }).map((_, i) => {
    if (rangoActual.dia) {
      const d = new Date(hoy); d.setDate(d.getDate() - (rangoActual.n - 1 - i));
      const label = rangoActual.n === 7
        ? DIAS_SEMANA_CORTOS[d.getDay()]
        : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { clave: dateStr(d), label, ingresos: 0, gastos: 0 };
    }
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (rangoActual.n - 1 - i), 1);
    return { clave: `${d.getFullYear()}-${d.getMonth()}`, label: `${MESES_CORTOS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, ingresos: 0, gastos: 0 };
  });
  const porClaveRango = new Map(bucketsRango.map(b => [b.clave, b]));
  const claveDeRango = (d) => (rangoActual.dia ? dateStr(d) : `${d.getFullYear()}-${d.getMonth()}`);

  tratamientos.forEach(t => { const d = parseFecha(t.date); if (d) { const b = porClaveRango.get(claveDeRango(d)); if (b) b.ingresos += t.paid || 0; } });
  ortoRows.forEach(o => (o.pagos?.abonos || []).forEach(a => {
    const d = parseFecha(a.fecha); if (d) { const b = porClaveRango.get(claveDeRango(d)); if (b) b.ingresos += Number(a.monto) || 0; }
  }));
  gastos.forEach(g => { const d = parseFecha(g.fecha); if (d) { const b = porClaveRango.get(claveDeRango(d)); if (b) b.gastos += g.monto || 0; } });

  const valoresHistograma = bucketsRango.map(b => (
    metrica === 'ingresos' ? b.ingresos : metrica === 'gastos' ? b.gastos : b.ingresos - b.gastos
  ));

  const totalFacturado = tratamientos.reduce((a, t) => a + (t.cost || 0), 0);
  const totalCobrado = tratamientos.reduce((a, t) => a + (t.paid || 0), 0);
  const pendienteHistorias = tratamientos.reduce((a, t) => a + Math.max(0, (t.cost || 0) - (t.paid || 0)), 0);
  const pendienteOrto = ortoRows.reduce((a, o) => a + (o.resumen.deuda || 0), 0);
  const saldoPendienteTotal = pendienteHistorias + pendienteOrto;
  const tasaCobro = totalFacturado > 0 ? Math.round((totalCobrado / totalFacturado) * 100) : 0;

  const valorMetricaAnim = useNumeroAnimado(metrica === 'ingresos' ? ingresosMes : metrica === 'gastos' ? gastosMes : utilidadMes);

  const estados = { activo: 0, nuevo: 0, inactivo: 0 };
  pacientes.forEach(p => { estados[estadoPaciente(p)]++; });
  const citasHoy = pacientes.filter(p => p.fecha === todayStr && p.hora_cita).sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));

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

  const labEnProceso = labOrders.filter(o => o.status === 'en_proceso');
  const labListo = labOrders.filter(o => o.status === 'listo');
  const labAtrasadas = labEnProceso.filter(o => o.eta && new Date(`${o.eta}T00:00:00`) < hoy);
  const ortoAtrasados = ortoRows.filter(o => o.resumen.deuda > 0);

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

  const weekDays = getWeekDays(weekAnchor);
  const idxHoy = weekDays.findIndex(d => dateStr(d) === todayStr);
  const dayIdx = selectedIdx !== null ? selectedIdx : (idxHoy >= 0 ? idxHoy : 0);
  const selectedDateStr = dateStr(weekDays[dayIdx]);
  const citasDia = pacientes
    .filter(p => p.fecha === selectedDateStr && p.hora_cita)
    .sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));

  const gastosDelMes = gastos.filter(g => { const d = parseFecha(g.fecha); return d && d.getFullYear() === mesActual.anio && d.getMonth() === mesActual.mes; });
  const gastosPorCategoria = Array.from(
    gastosDelMes.reduce((m, g) => m.set(g.categoria || 'Sin categoría', (m.get(g.categoria || 'Sin categoría') || 0) + (g.monto || 0)), new Map())
  ).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const ultimos7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(hoy); d.setDate(d.getDate() - (6 - i));
    return { clave: dateStr(d), label: DIAS_SEMANA_CORTOS[d.getDay()], ingresos: 0 };
  });
  const porClave7 = new Map(ultimos7.map(b => [b.clave, b]));
  tratamientos.forEach(t => { const d = parseFecha(t.date); if (d) { const b = porClave7.get(dateStr(d)); if (b) b.ingresos += t.paid || 0; } });
  ortoRows.forEach(o => (o.pagos?.abonos || []).forEach(a => {
    const d = parseFecha(a.fecha); if (d) { const b = porClave7.get(dateStr(d)); if (b) b.ingresos += Number(a.monto) || 0; }
  }));
  const ingresosSemana = ultimos7.reduce((a, b) => a + b.ingresos, 0);

  const insight = (() => {
    if (pctIngresos !== null && Math.abs(pctIngresos) >= 5) {
      return pctIngresos >= 0
        ? <>Los ingresos <b style={{ color: VERDE }}>subieron {pctIngresos}%</b> este mes frente al anterior.</>
        : <>Los ingresos <b style={{ color: RJ }}>bajaron {Math.abs(pctIngresos)}%</b> este mes frente al anterior.</>;
    }
    if (saldoPendienteTotal > 0) {
      return <>Hay <b style={{ color: RJ }}>{soles(saldoPendienteTotal)}</b> por cobrar entre {deudaPorPaciente.size} paciente{deudaPorPaciente.size !== 1 ? 's' : ''}.</>;
    }
    return <>La cobranza está <b style={{ color: VERDE }}>al día</b> y no hay saldos pendientes.</>;
  })();

  // ESTILOS MEJORADOS (Box Sizing para evitar overflows)
  const card = {
    boxSizing: 'border-box', // Añadido vital
    background: 'var(--panel)', border: '1px solid var(--hairline)',
    borderRadius: 'var(--radius-panel)', padding: 24,
    boxShadow: 'var(--shadow-raised)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden' // Previene cortes abruptos
  };
  const h2 = { margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' };
  const rotulo = { fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' };
  const subCard = { background: 'var(--panel-sunken)', borderRadius: 'var(--radius-card)', boxSizing: 'border-box' };
  const col = (n) => ({ gridColumn: isTablet ? 'auto' : `span ${n}`, minWidth: 0 }); // minWidth: 0 vital para flex/grid hijos

  const nombreClinica = (clinica?.nombre || '').replace(/^Consultorio\s+/i, '').trim();

  const atajos = [
    { icon: 'calendar', titulo: 'Nueva cita', sub: 'Agendar paciente', view: 'agenda' },
    { icon: 'card', titulo: 'Registrar pago', sub: 'Cobrar saldo', view: 'caja' },
    { icon: 'userPlus', titulo: 'Nuevo paciente', sub: 'Abrir historial', view: 'expediente' },
    { icon: 'chat', titulo: 'Asistente Virtual', sub: 'Consultas IA', view: 'whatsapp' },
  ];

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>Cargando dashboard…</div>;
  }
  if (errorMsg) {
    return <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 13.5 }}>Error al cargar el dashboard: {errorMsg}</div>;
  }

  const pctMetricaActiva = metrica === 'ingresos' ? pctIngresos : metrica === 'gastos' ? pctGastos : pctUtilidad;
  const labelMetrica = METRICAS.find(m => m.key === metrica)?.label;

  return (
    <div style={{ display: 'grid', boxSizing: 'border-box', width: '100%', gridTemplateColumns: isTablet ? '1fr' : 'repeat(12, 1fr)', gap: 'var(--gap-panel)', alignItems: 'stretch', animation: 'fadeIn 0.4s ease-in-out' }}>
      
      {/* ─── HERO ─── */}
      <div style={{ ...col(12), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Hola{nombreClinica ? `, ${nombreClinica}` : ''}
            </h1>
            <p style={{ fontSize: 12.5, color: MU, margin: '3px 0 0' }}>
              {citasHoy.length > 0
                ? <>{citasHoy.length} cita{citasHoy.length !== 1 ? 's' : ''} hoy, la próxima a las {citasHoy[0].hora_cita}.</>
                : <>Hoy no tienes citas agendadas.</>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: VERDE, flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: VERDE, animation: 'pulso-vivo 2.2s ease-out infinite' }} />
            </span>
            <span style={{ fontSize: 11.5, color: MU }}>
              {ultimaActualizacion ? `Actualizado hace ${formatoHaceTiempo(ultimaActualizacion)}` : 'Cargando…'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginTop: 22 }}>
          <div>
            <div style={{ ...rotulo, marginBottom: 11 }}>Estado de resultados</div>
            <div style={{ display: 'flex', gap: 20 }}>
              {METRICAS.map(m => (
                <button key={m.key} onClick={() => setMetrica(m.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', font: 'inherit',
                    fontSize: 12.5, fontWeight: 600, color: metrica === m.key ? 'var(--text-primary)' : MU,
                  }}>
                  <span style={{
                    width: 9, height: 9, borderRadius: '50%',
                    border: `1.5px solid ${metrica === m.key ? 'var(--text-primary)' : 'var(--hairline-strong)'}`,
                    background: metrica === m.key ? 'var(--text-primary)' : 'transparent',
                  }} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 2, background: 'var(--panel-sunken)', padding: 3, borderRadius: 'var(--radius-pill)' }}>
            {RANGOS.map(r => {
              const activo = rango === r.key;
              return (
                <button key={r.key} onClick={() => setRango(r.key)}
                  style={{
                    border: 'none', cursor: 'pointer', font: 'inherit',
                    fontSize: 12, fontWeight: 600, padding: '6px 13px', borderRadius: 'var(--radius-pill)',
                    color: activo ? 'var(--text-primary)' : MU,
                    background: activo ? 'var(--panel)' : 'transparent',
                    boxShadow: activo ? 'var(--shadow-raised)' : 'none',
                    transition: 'background-color var(--dur-fast) var(--ease)',
                  }}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '30px 0 4px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{
              fontSize: 'clamp(40px, 7vw, 68px)', fontWeight: 700, letterSpacing: '-0.03em',
              color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>
              {soles(valorMetricaAnim)}
            </span>
            {pctMetricaActiva !== null && (
              <span style={{
                fontSize: 13, fontWeight: 700, color: pctMetricaActiva >= 0 ? VERDE : RJ,
                background: `color-mix(in srgb, ${pctMetricaActiva >= 0 ? 'var(--green)' : RJ} 12%, transparent)`,
                padding: '4px 10px', borderRadius: 'var(--radius-pill)', marginTop: 6,
              }}>
                {pctMetricaActiva >= 0 ? '↑' : '↓'} {Math.abs(pctMetricaActiva)}%
              </span>
            )}
          </div>
          <div style={{ ...rotulo, marginTop: 14 }}>
            {labelMetrica} del mes · vs. mes anterior
          </div>
        </div>

        <GraficoBarras
          valores={valoresHistograma}
          etiquetas={bucketsRango.map(b => b.label)}
          formato={soles}
          alto={220}
          mostrarCadaN={rango === '30d' ? 3 : 1}
          resaltarPico
        />
      </div>

      {/* ─── COMMAND BAR ─── */}
      <div style={{ ...col(12) }}>
        <div
          onClick={() => setView && setView('whatsapp')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setView && setView('whatsapp'); }}
          style={{
            background: 'var(--text-primary)', borderRadius: 'var(--radius-pill)',
            padding: '10px 10px 10px 22px', display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', boxShadow: 'var(--shadow-raised)',
          }}
        >
          <Icon name="chat" size={16} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13.5, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Pregúntale a Sofia sobre tu clínica…
          </span>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: VERDE, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon name="chat" size={16} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {SUGERENCIAS_IA.map(q => (
            <button key={q} onClick={() => setView && setView('whatsapp')}
              style={{
                border: '1px solid var(--hairline)', background: 'var(--panel)', cursor: 'pointer',
                font: 'inherit', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                padding: '6px 12px', borderRadius: 'var(--radius-pill)',
                transition: 'background-color var(--dur-fast) var(--ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--fill-quaternary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel)'; }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ─── ROW 2 ─── */}
      <div style={{ ...col(3), ...card }}>
        <div style={rotulo}>Ingresos de la semana</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>{soles(ingresosSemana)}</div>
        <GraficoBarras valores={ultimos7.map(b => b.ingresos)} etiquetas={ultimos7.map(b => b.label)} formato={soles} alto={90} />
      </div>

      <div style={{ ...col(3), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={rotulo}>Gastos del mes</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{soles(gastosMes)}</div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {gastosPorCategoria.length === 0 ? (
            <div style={{ fontSize: 12.5, color: MU }}>Sin gastos este mes.</div>
          ) : gastosPorCategoria.map(([cat, monto]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorPorNombre(cat), flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{soles(monto)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...col(3), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={rotulo}>Cobranza</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: saldoPendienteTotal > 0 ? RJ : VERDE, fontVariantNumeric: 'tabular-nums' }}>{soles(saldoPendienteTotal)}</div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, justifyContent: 'center' }}>
          {[{ l: 'Facturado', v: totalFacturado, max: Math.max(totalFacturado, 1) }, { l: 'Cobrado', v: totalCobrado, max: Math.max(totalFacturado, 1) }].map(f => (
            <div key={f.l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{f.l}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{soles(f.v)}</span>
              </div>
              <div style={{ height: 5, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(f.v / f.max) * 100}%`, background: f.l === 'Cobrado' ? VERDE : 'var(--text-tertiary)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...col(3), ...card }}>
        <div style={rotulo}>Insight</div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: '8px 0 12px' }}>{insight}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 'auto' }}>
          <Anillo pct={tasaCobro} color={VERDE} tamano={64} grosor={7}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{tasaCobro}%</span>
          </Anillo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Cobrado <b style={{ color: 'var(--text-primary)' }}>{soles(totalCobrado)}</b></div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>Pendiente <b style={{ color: 'var(--text-primary)' }}>{soles(saldoPendienteTotal)}</b></div>
          </div>
        </div>
      </div>

      {/* ─── ATAJOS ─── */}
      <div style={{ ...col(12), ...card, flexDirection: isTablet ? 'column' : 'row', padding: 6, gap: 0 }}>
        {atajos.map((a, i) => (
          <button key={a.titulo} onClick={() => setView && setView(a.view)}
            style={{
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 14px', cursor: 'pointer', borderRadius: 'var(--radius-md)', textAlign: 'left',
              background: 'transparent', border: 'none', font: 'inherit', minHeight: 44,
              borderLeft: (!isTablet && i > 0) ? `1px solid var(--hairline)` : 'none',
              borderTop: (isTablet && i > 0) ? `1px solid var(--hairline)` : 'none',
              transition: 'background-color 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--fill-quaternary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
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

      {/* ─── INDICADORES ─── */}
      <div style={{ ...col(12), display: 'flex', flexWrap: 'wrap', gap: 'var(--gap-panel)' }}>
        <Stat
          label="Ingresos del mes" value={soles(ingresosMes)} icon={<Icon name="trendingUp" size={15} />}
          col={VERDE} onClick={() => setView && setView('caja')}
          sub={pctIngresos === null ? null : `${pctIngresos >= 0 ? '↑' : '↓'} ${Math.abs(pctIngresos)}% vs. mes anterior`}
          subCol={pctIngresos === null ? MU : (pctIngresos >= 0 ? VERDE : RJ)}
        />
        <Stat
          label="Gastos del mes" value={soles(gastosMes)} icon={<Icon name="card" size={15} />}
          col={GL} onClick={() => setView && setView('caja')}
          sub={`${gastosDelMes.length} registro${gastosDelMes.length !== 1 ? 's' : ''}`} subCol={MU}
        />
        <Stat
          label="Utilidad neta" value={soles(utilidadMes)} icon={<Icon name="checkCircle" size={15} />}
          col={utilidadMes >= 0 ? VERDE : RJ} onClick={() => setView && setView('caja')}
          sub={`${margenPct}% de margen`} subCol={utilidadMes >= 0 ? VERDE : RJ}
        />
        <Stat
          label="Por cobrar" value={soles(saldoPendienteTotal)} icon={<Icon name="clock" size={15} />}
          col={saldoPendienteTotal > 0 ? RJ : VERDE} onClick={() => setView && setView('caja')}
          sub={saldoPendienteTotal > 0 ? `${deudaPorPaciente.size} paciente${deudaPorPaciente.size !== 1 ? 's' : ''} · ${tasaCobro}% cobrado` : 'Todo cobrado'}
          subCol={saldoPendienteTotal > 0 ? RJ : VERDE}
        />
      </div>

      {/* ─── AGENDA ─── */}
      <div style={{ ...col(4), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={h2}>{weekDays[0].toLocaleString('es-PE', { month: 'long' }).replace(/^./, c => c.toUpperCase())} {weekDays[0].getFullYear()}</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['<', -7], ['>', 7]].map(([lbl, delta]) => (
              <div key={lbl} onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; }); setSelectedIdx(null); }}
                style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU, fontSize: 13, background: 'var(--panel-sunken)' }}>
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
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSel ? P : 'transparent', border: 'none', color: isSel ? '#fff' : (isToday ? P : 'var(--text-primary)'), fontWeight: isSel || isToday ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', transition: 'background-color var(--dur-fast) var(--ease)' }}>
                  {d.getDate()}
                </div>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: nCitas > 0 ? P : 'transparent' }} />
              </div>
            );
          })}
        </div>

        {citasDia.length === 0 ? (
          <button
            className="zona-vacia"
            onClick={() => setView && setView('agenda')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 7, width: '100%', minHeight: 96, padding: 16,
              background: 'transparent', color: MU,
              border: '1.5px dashed var(--hairline-strong)',
              borderRadius: 'var(--radius-card)',
              fontFamily: 'inherit', fontSize: 13, cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={17} />
            Agendar una cita
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {citasDia.slice(0, 3).map(c => (
              <div key={c.id} onClick={() => setView && setView('agenda')} style={{ ...subCard, padding: '10px 12px', cursor: 'pointer' }}>
                <div style={{ fontSize: 12, color: MU, fontWeight: 600, marginBottom: 5, fontVariantNumeric: 'tabular-nums' }}>{c.hora_cita}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{ini(c.name || '?')}</div>
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

      {/* ─── NECESITA TU ATENCIÓN ─── */}
      <div style={{ ...col(8), ...card, minHeight: 178 }}>
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
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `color-mix(in srgb, ${a.color} 12%, transparent)`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
      <div style={{ ...col(6), ...card, minHeight: 178 }}>
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
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--panel-sunken)', border: 'none', color: 'var(--label-primary)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini(d.paciente.name)}</div>
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
      <div style={{ ...col(6), ...card, minHeight: 178 }}>
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
              { l: 'En proceso', v: labEnProceso.length, c: 'var(--info)' },
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

      {/* ─── PULSO POR ESPECIALIDAD (FIXED OVERFLOW) ─── */}
      <div style={{ ...col(12), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <h2 style={h2}>Pulso por especialidad</h2>
          
          {/* Contenedor que soluciona el overflow permitiendo scroll horizontal oculto */}
          <div style={{ maxWidth: '100%', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <SegmentedControl
              options={CAT_TABS.map(t => ({ key: t.key, label: t.key }))}
              value={activeTab}
              onChange={setActiveTab}
              style={{ minWidth: 'max-content' }}
            />
          </div>
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

    </div>
  );
}