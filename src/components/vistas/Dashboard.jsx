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
  '¿Qué tratamiento deja más margen?',
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
      texto: `${labAtrasadas.length} orden${labAtrasadas.length !== 1 ? 'es' : ''} de lab. atrasada${labAtrasadas.length !== 1 ? 's' : ''}`,
      etiqueta: 'CRÍTICO',
    },
    ortoAtrasados.length > 0 && {
      color: GL, icon: 'warning', view: 'ortodoncia',
      texto: `${ortoAtrasados.length} cuota${ortoAtrasados.length !== 1 ? 's' : ''} de ortodoncia vencida${ortoAtrasados.length !== 1 ? 's' : ''}`,
      etiqueta: 'COBRANZA',
    },
    labListo.length > 0 && {
      color: AZ, icon: 'checkCircle', view: 'laboratorio',
      texto: `${labListo.length} trabajo${labListo.length !== 1 ? 's' : ''} listo${labListo.length !== 1 ? 's' : ''} para retiro`,
      etiqueta: 'ACCIÓN',
    },
    estados.inactivo > 0 && {
      color: MU, icon: 'users', view: 'expediente',
      texto: `${estados.inactivo} paciente${estados.inactivo !== 1 ? 's' : ''} inactivo${estados.inactivo !== 1 ? 's' : ''} (> 6 meses)`,
      etiqueta: 'RETENCIÓN',
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
        ? <>MRR up. Los ingresos <b style={{ color: VERDE }}>crecieron {pctIngresos}%</b> vs mes anterior.</>
        : <>Los ingresos <b style={{ color: RJ }}>cayeron {Math.abs(pctIngresos)}%</b> vs mes anterior.</>;
    }
    if (saldoPendienteTotal > 0) {
      return <>Saldo de <b style={{ color: RJ, fontFamily: 'ui-monospace, monospace' }}>{soles(saldoPendienteTotal)}</b> por cobrar a {deudaPorPaciente.size} perfiles.</>;
    }
    return <>Cobranza <b style={{ color: VERDE }}>optimizada</b>. 0 saldos pendientes.</>;
  })();

  // ─── ESTÉTICA TECH PREMIUM ───
  const card = {
    boxSizing: 'border-box',
    background: 'var(--panel)', 
    border: '1px solid var(--hairline-strong)', // Borde un poco más definido
    borderRadius: '12px', // Curva elegante pero tech
    padding: 24,
    boxShadow: '0 2px 14px -4px rgba(0,0,0,0.04)', // Sombra más plana y difusa
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative'
  };
  
  // Títulos más sharp, con letter-spacing de UI técnica
  const h2 = { margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' };
  
  // Rótulos ultracrisp para data-density
  const rotulo = { fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' };
  
  const subCard = { background: 'var(--panel-sunken)', border: '1px solid var(--hairline)', borderRadius: '8px', boxSizing: 'border-box' };
  const col = (n) => ({ gridColumn: isTablet ? 'auto' : `span ${n}`, minWidth: 0 });

  // Fuentes monoespaciadas para data financiera dura
  const monoFont = { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', letterSpacing: '-0.03em' };

  const nombreClinica = (clinica?.nombre || '').replace(/^Consultorio\s+/i, '').trim();

  const atajos = [
    { icon: 'calendar', titulo: 'Agendar', sub: 'Nueva cita', view: 'agenda' },
    { icon: 'card', titulo: 'Cobrar', sub: 'Registrar pago', view: 'caja' },
    { icon: 'userPlus', titulo: 'Paciente', sub: 'Crear perfil', view: 'expediente' },
    { icon: 'activity', titulo: 'Flujos', sub: 'Ver reportes', view: 'whatsapp' },
  ];

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 13.5, fontFamily: monoFont.fontFamily }}>[ Cargando entorno... ]</div>;
  }
  if (errorMsg) {
    return <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 13.5, fontFamily: monoFont.fontFamily }}>[ Error de conexión: {errorMsg} ]</div>;
  }

  const pctMetricaActiva = metrica === 'ingresos' ? pctIngresos : metrica === 'gastos' ? pctGastos : pctUtilidad;
  const labelMetrica = METRICAS.find(m => m.key === metrica)?.label;

  return (
    <div style={{ display: 'grid', boxSizing: 'border-box', width: '100%', gridTemplateColumns: isTablet ? '1fr' : 'repeat(12, 1fr)', gap: 16, alignItems: 'stretch', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* ─── HERO COMPONENT ─── */}
      <div style={{ ...col(12), ...card, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Workspace {nombreClinica ? `· ${nombreClinica}` : ''}
            </h1>
            <p style={{ fontSize: 13, color: MU, margin: '4px 0 0' }}>
              {citasHoy.length > 0
                ? <>{citasHoy.length} eventos en cola. Próximo a las {citasHoy[0].hora_cita}.</>
                : <>No hay eventos programados para hoy.</>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel-sunken)', padding: '4px 10px', borderRadius: 100, border: '1px solid var(--hairline)' }}>
            <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: VERDE, flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: -2, borderRadius: '50%', background: VERDE, animation: 'pulso-vivo 2s ease-out infinite', opacity: 0.6 }} />
            </span>
            <span style={{ fontSize: 11, color: MU, fontWeight: 600, ...monoFont }}>
              {ultimaActualizacion ? `SYNC ${ultimaActualizacion.toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'})}` : 'SYNCING...'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginTop: 28 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, background: 'var(--panel-sunken)', padding: 4, borderRadius: 8, border: '1px solid var(--hairline)' }}>
              {METRICAS.map(m => (
                <button key={m.key} onClick={() => setMetrica(m.key)}
                  style={{
                    border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6,
                    color: metrica === m.key ? 'var(--text-primary)' : MU,
                    background: metrica === m.key ? 'var(--panel)' : 'transparent',
                    boxShadow: metrica === m.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 2, background: 'var(--panel-sunken)', padding: 4, borderRadius: 8, border: '1px solid var(--hairline)' }}>
            {RANGOS.map(r => {
              const activo = rango === r.key;
              return (
                <button key={r.key} onClick={() => setRango(r.key)}
                  style={{
                    border: 'none', cursor: 'pointer', ...monoFont,
                    fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 6,
                    color: activo ? 'var(--text-primary)' : MU,
                    background: activo ? 'var(--panel)' : 'transparent',
                    boxShadow: activo ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s ease',
                  }}>
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '36px 0 16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{
              fontSize: 'clamp(44px, 7vw, 72px)', fontWeight: 700,
              color: 'var(--text-primary)', lineHeight: 1, ...monoFont, letterSpacing: '-0.05em'
            }}>
              {soles(valorMetricaAnim)}
            </span>
            {pctMetricaActiva !== null && (
              <span style={{
                fontSize: 12.5, fontWeight: 700, color: pctMetricaActiva >= 0 ? VERDE : RJ,
                background: `color-mix(in srgb, ${pctMetricaActiva >= 0 ? 'var(--green)' : RJ} 12%, transparent)`,
                padding: '4px 10px', borderRadius: 6, marginTop: 8, border: `1px solid color-mix(in srgb, ${pctMetricaActiva >= 0 ? 'var(--green)' : RJ} 20%, transparent)`
              }}>
                {pctMetricaActiva >= 0 ? '↗' : '↘'} {Math.abs(pctMetricaActiva)}%
              </span>
            )}
          </div>
          <div style={{ ...rotulo, marginTop: 14, color: MU }}>
            {labelMetrica} DEL PERÍODO ACTUAL
          </div>
        </div>

        <GraficoBarras
          valores={valoresHistograma}
          etiquetas={bucketsRango.map(b => b.label)}
          formato={soles}
          alto={180}
          mostrarCadaN={rango === '30d' ? 3 : 1}
          resaltarPico
        />
      </div>

      {/* ─── AI COMMAND PALETTE (Estilo Cmd+K) ─── */}
      <div style={{ ...col(12) }}>
        <div
          onClick={() => setView && setView('whatsapp')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setView && setView('whatsapp'); }}
          style={{
            background: 'var(--panel)', border: '1px solid var(--hairline-strong)',
            borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer', boxShadow: '0 2px 12px -4px rgba(0,0,0,0.05)',
            transition: 'border-color 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = VERDE}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--hairline-strong)'}
        >
          <div style={{ color: VERDE, display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={18} />
          </div>
          <span style={{ color: MU, fontSize: 13.5, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: monoFont.fontFamily }}>
            &gt; Pregúntale a Sofia sobre métricas, pacientes o flujos...
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <kbd style={{ background: 'var(--panel-sunken)', border: '1px solid var(--hairline)', padding: '3px 6px', borderRadius: 4, fontSize: 11, color: MU, fontFamily: monoFont.fontFamily }}>Cmd</kbd>
            <kbd style={{ background: 'var(--panel-sunken)', border: '1px solid var(--hairline)', padding: '3px 6px', borderRadius: 4, fontSize: 11, color: MU, fontFamily: monoFont.fontFamily }}>K</kbd>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {SUGERENCIAS_IA.map(q => (
            <button key={q} onClick={() => setView && setView('whatsapp')}
              style={{
                border: '1px solid var(--hairline)', background: 'transparent', cursor: 'pointer',
                fontFamily: monoFont.fontFamily, fontSize: 11.5, color: 'var(--text-secondary)',
                padding: '6px 12px', borderRadius: 6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel)'; e.currentTarget.style.borderColor = 'var(--hairline-strong)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--hairline)'; }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ─── INDICADORES (KPIs) ─── */}
      <div style={{ ...col(12), display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <Stat
          label="INGRESOS (MRR)" value={soles(ingresosMes)} icon={<Icon name="trendingUp" size={15} />}
          col={VERDE} onClick={() => setView && setView('caja')}
          sub={pctIngresos === null ? null : `${pctIngresos >= 0 ? '↑' : '↓'} ${Math.abs(pctIngresos)}% vs mes anterior`}
          subCol={pctIngresos === null ? MU : (pctIngresos >= 0 ? VERDE : RJ)}
        />
        <Stat
          label="GASTOS OPEX" value={soles(gastosMes)} icon={<Icon name="card" size={15} />}
          col={GL} onClick={() => setView && setView('caja')}
          sub={`${gastosDelMes.length} registros computados`} subCol={MU}
        />
        <Stat
          label="PROFIT MARGIN" value={soles(utilidadMes)} icon={<Icon name="activity" size={15} />}
          col={utilidadMes >= 0 ? VERDE : RJ} onClick={() => setView && setView('caja')}
          sub={`Margen neto: ${margenPct}%`} subCol={utilidadMes >= 0 ? VERDE : RJ}
        />
        <Stat
          label="CHURN / DEUDA" value={soles(saldoPendienteTotal)} icon={<Icon name="clock" size={15} />}
          col={saldoPendienteTotal > 0 ? RJ : VERDE} onClick={() => setView && setView('caja')}
          sub={saldoPendienteTotal > 0 ? `Riesgo en ${deudaPorPaciente.size} perfiles` : 'Flujo de caja óptimo'}
          subCol={saldoPendienteTotal > 0 ? RJ : VERDE}
        />
      </div>

      {/* ─── ATAJOS (CONSOLE ACTIONS) ─── */}
      <div style={{ ...col(12), display: 'flex', gap: 16, flexDirection: isTablet ? 'column' : 'row' }}>
        {atajos.map((a) => (
          <button key={a.titulo} onClick={() => setView && setView(a.view)}
            style={{
              ...card, padding: '16px', flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14,
              cursor: 'pointer', minHeight: 'auto', transition: 'transform 0.15s ease, border-color 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--hairline-strong)'; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--panel-sunken)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexShrink: 0 }}>
              <Icon name={a.icon} size={16} />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--label-primary)', lineHeight: 1.2 }}>{a.titulo}</div>
              <div style={{ fontSize: 11.5, color: MU, marginTop: 3, ...monoFont }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ─── FILA DE 4: DATA VIZ ─── */}
      <div style={{ ...col(3), ...card }}>
        <div style={rotulo}>Run Rate Semanal</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, marginBottom: 16, ...monoFont }}>{soles(ingresosSemana)}</div>
        <GraficoBarras valores={ultimos7.map(b => b.ingresos)} etiquetas={ultimos7.map(b => b.label)} formato={soles} alto={80} />
      </div>

      <div style={{ ...col(3), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={rotulo}>Distribución Gastos</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', ...monoFont }}>{soles(gastosMes)}</div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {gastosPorCategoria.length === 0 ? (
            <div style={{ fontSize: 12.5, color: MU, fontFamily: monoFont.fontFamily }}>Null</div>
          ) : gastosPorCategoria.map(([cat, monto]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: colorPorNombre(cat), flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', ...monoFont }}>{soles(monto)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...col(3), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={rotulo}>Salud de Cobranza</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: saldoPendienteTotal > 0 ? RJ : VERDE, ...monoFont }}>{soles(saldoPendienteTotal)}</div>
        </div>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16, flex: 1, justifyContent: 'center' }}>
          {[{ l: 'Total Facturado', v: totalFacturado, max: Math.max(totalFacturado, 1) }, { l: 'Capital Recuperado', v: totalCobrado, max: Math.max(totalFacturado, 1) }].map(f => (
            <div key={f.l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{f.l}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', ...monoFont }}>{soles(f.v)}</span>
              </div>
              <div style={{ height: 4, background: BD, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(f.v / f.max) * 100}%`, background: f.l === 'Capital Recuperado' ? VERDE : 'var(--text-tertiary)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...col(3), ...card }}>
        <div style={rotulo}>Status General</div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: '12px 0 16px' }}>{insight}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto' }}>
          <Anillo pct={tasaCobro} color={VERDE} tamano={58} grosor={5}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', ...monoFont }}>{tasaCobro}%</span>
          </Anillo>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', ...monoFont }}>IN: <b style={{ color: 'var(--text-primary)' }}>{soles(totalCobrado)}</b></div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', ...monoFont }}>OUT: <b style={{ color: 'var(--text-primary)' }}>{soles(saldoPendienteTotal)}</b></div>
          </div>
        </div>
      </div>

      {/* ─── AGENDA & ALERTAS ─── */}
      <div style={{ ...col(4), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={h2}>{weekDays[0].toLocaleString('es-PE', { month: 'long' }).replace(/^./, c => c.toUpperCase())} {weekDays[0].getFullYear()}</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['<', -7], ['>', 7]].map(([lbl, delta]) => (
              <div key={lbl} onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; }); setSelectedIdx(null); }}
                style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU, fontSize: 12, background: 'var(--panel-sunken)', fontFamily: monoFont.fontFamily }}>
                {lbl}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          {weekDays.map((d, i) => {
            const isSel = i === dayIdx;
            const isToday = dateStr(d) === todayStr;
            const nCitas = pacientes.filter(p => p.fecha === dateStr(d) && p.hora_cita).length;
            return (
              <div key={i} onClick={() => setSelectedIdx(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }}>
                <span style={{ fontSize: 10.5, color: isSel || isToday ? 'var(--text-primary)' : MU, fontWeight: 700, textTransform: 'uppercase' }}>{DIAS_CORTOS[i]}</span>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: isSel ? 'var(--text-primary)' : 'transparent', border: isSel ? 'none' : (isToday ? '1px solid var(--hairline-strong)' : 'none'), color: isSel ? 'var(--panel)' : 'var(--text-primary)', fontWeight: isSel || isToday ? 700 : 500, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, ...monoFont, transition: 'all 0.2s ease' }}>
                  {d.getDate()}
                </div>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: nCitas > 0 ? (isSel ? 'var(--text-primary)' : VERDE) : 'transparent' }} />
              </div>
            );
          })}
        </div>

        {citasDia.length === 0 ? (
          <button
            onClick={() => setView && setView('agenda')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 8, width: '100%', minHeight: 90, padding: 16,
              background: 'transparent', color: MU,
              border: '1px dashed var(--hairline-strong)',
              borderRadius: 8,
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Icon name="plus" size={16} />
            Agendar un evento
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {citasDia.slice(0, 3).map(c => (
              <div key={c.id} onClick={() => setView && setView('agenda')} style={{ ...subCard, padding: '12px', cursor: 'pointer', transition: 'border-color 0.2s ease' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-tertiary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--hairline)'}>
                <div style={{ fontSize: 11.5, color: MU, fontWeight: 700, marginBottom: 6, ...monoFont }}>{c.hora_cita}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--panel)', border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{ini(c.name || '?')}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.treatment || c.reason || 'Consulta'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...col(8), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={h2}>System Logs & Alertas</h2>
          {alertas.length > 0 && (
            <span style={{ background: `color-mix(in srgb, ${RJ} 15%, transparent)`, color: RJ, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, ...monoFont }}>{alertas.length} ERRORS</span>
          )}
        </div>
        {alertas.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: VERDE, fontSize: 13, fontWeight: 600, padding: '12px 0', fontFamily: monoFont.fontFamily }}>
            <Icon name="checkCircle" size={15} /> ALL SYSTEMS OPERATIONAL
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alertas.map((a, i) => (
              <div key={i} onClick={() => setView && setView(a.view)}
                style={{ ...subCard, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderLeft: `3px solid ${a.color}` }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: `color-mix(in srgb, ${a.color} 15%, transparent)`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={a.icon} size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', lineHeight: 1.35 }}>{a.texto}</div>
                  <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, fontWeight: 700, color: a.color, background: `color-mix(in srgb, ${a.color} 10%, transparent)`, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>
                    {a.etiqueta}
                  </span>
                </div>
                <span style={{ fontSize: 14, color: MU, flexShrink: 0, fontFamily: monoFont.fontFamily }}>-&gt;</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── DEUDORES & LABORATORIO ─── */}
      <div style={{ ...col(6), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={h2}>Top Deudores</h2>
          {topDeudores.length > 0 && (
            <span onClick={() => setView && setView('caja')} style={{ fontSize: 11, color: MU, cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>View All</span>
          )}
        </div>
        {topDeudores.length === 0 ? (
          <div style={{ fontSize: 13, color: MU, fontFamily: monoFont.fontFamily }}>0 records found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topDeudores.map(d => (
              <div key={d.paciente.id} onClick={() => setView && setView('caja')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--panel-sunken)', border: '1px solid var(--hairline)', color: 'var(--text-secondary)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ini(d.paciente.name)}</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--label-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.paciente.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: RJ, flexShrink: 0, ...monoFont }}>{soles(d.saldo)}</div>
                </div>
                <div style={{ height: 4, background: BD, borderRadius: 2, overflow: 'hidden', marginLeft: 34 }}>
                  <div style={{ height: '100%', width: `${(d.saldo / maxDeuda) * 100}%`, background: RJ, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...col(6), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={h2}>Pipeline Laboratorio</h2>
          <div onClick={() => setView && setView('laboratorio')} style={{ cursor: 'pointer', color: MU }}>
            <Icon name="activity" size={14} />
          </div>
        </div>
        {labOrders.length === 0 ? (
          <div style={{ fontSize: 13, color: MU, fontFamily: monoFont.fontFamily }}>0 records found.</div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { l: 'EN PROCESO', v: labEnProceso.length, c: 'var(--info)' },
              { l: 'ATRASADAS', v: labAtrasadas.length, c: labAtrasadas.length > 0 ? RJ : MU },
              { l: 'LISTAS', v: labListo.length, c: VERDE },
            ].map(s => (
              <div key={s.l} style={{ ...subCard, flex: 1, padding: '16px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.c, ...monoFont }}>{s.v}</div>
                <div style={{ fontSize: 10, color: MU, marginTop: 6, fontWeight: 700, letterSpacing: '0.05em' }}>{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── PULSO POR ESPECIALIDAD (FIXED OVERFLOW) ─── */}
      <div style={{ ...col(12), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={h2}>Desglose por Especialidad</h2>
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
          <div style={{ textAlign: 'center', color: MU, fontSize: 13, padding: '32px 0', fontFamily: monoFont.fontFamily }}>
            No data for {activeTab.toUpperCase()}.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ ...rotulo, marginBottom: 14 }}>Top Revenue Streams</div>
              {topTratamientos.map(t => (
                <div key={t.name} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--label-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                    <span style={{ fontSize: 12, color: MU, flexShrink: 0, ...monoFont }}>×{t.n} · <b style={{ color: 'var(--text-primary)' }}>{soles(t.monto)}</b></span>
                  </div>
                  <div style={{ height: 4, background: BD, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(t.monto / maxTrat) * 100}%`, background: colorPorNombre(t.name), borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ ...rotulo, marginBottom: 14 }}>Estado de Ejecución</div>
              {ESTADO_TRAT.map(e => (
                <div key={e.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, color: 'var(--label-primary)', fontWeight: 600 }}>{e.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', ...monoFont }}>{conteoEstado[e.key]}</span>
                  </div>
                  <div style={{ height: 4, background: BD, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(conteoEstado[e.key] / maxEstado) * 100}%`, background: e.color, borderRadius: 2 }} />
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