// src/components/vistas/Dashboard.jsx
// Cruza las 5 tablas de negocio reales (pacientes, historias, ortodoncia,
// laboratorio_ordenes, gastos), con el mismo filtro de archivados/huérfanos
// que el resto de la app -- nada de datos de ejemplo ni Math.random().
//
// Reconstruido desde cero (el archivo se había vaciado) siguiendo la
// referencia "YourCRM" (UI/UX, Alina Abovyan), pantalla "Cases/Customer
// Journeys": el tablero de 4 columnas ("Flujo de tratamiento") es ahora lo
// primero que se ve bajo el título, con la tira de avatares CENTRADA en su
// fila de cabecera -- esa era la diferencia real contra la referencia (antes
// vivía metida en la tarjeta del saludo, a la izquierda). Paleta negro/azul/
// coral hardcodeada acá abajo, no importada de utils/constants.js (ver nota
// de alcance en commits anteriores).
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import { Anillo, Dona } from '../ui/Graficos';
import { ini, estadoPaciente, resumenPagosOrtodoncia, colorPorNombre } from '../../utils/helpers';
import useResponsive from '../../utils/useResponsive';

// ── Paleta local (referencia "YourCRM") ─────────────────────────────────────
const NEGRO = '#030303';
const P = '#729DEE';   // azul primario -- línea de gráfico, día seleccionado, foco
const AZ = P;
const RJ = '#E56868';  // coral -- deuda, alertas urgentes
const GL = '#E8A63D';  // ámbar -- pendiente/cobranza
const VERDE = '#22A55E';
const MU = '#6B7280';  // texto secundario
const GLASS_BG = 'rgba(255, 255, 255, 0.62)';
const GLASS_BLUR = 'blur(24px) saturate(180%)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.5)';
const GLASS_SHADOW = '0 8px 32px rgba(10, 10, 10, 0.07), 0 2px 8px rgba(10, 10, 10, 0.04)';

// Tabs de métrica del histograma principal. Utilidad se deriva de
// ingresos-gastos en cada bucket, nunca se guarda aparte -- así no puede
// desincronizarse de esos dos.
const METRICAS = [
  { key: 'ingresos', label: 'Ingresos' },
  { key: 'utilidad', label: 'Utilidad' },
  { key: 'gastos', label: 'Gastos' },
];

const ESTADO_TRAT = [
  { key: 'pendiente', label: 'Pendiente', color: RJ },
  { key: 'en_curso', label: 'En curso', color: GL },
  { key: 'completado', label: 'Completado', color: VERDE },
];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Trío de botones circulares blancos que la referencia pone en la cabecera de
// CADA tarjeta (+ / abrir / calendario). Antes sólo existía suelto en dos
// tarjetas, copiado y pegado; acá vive en un solo lugar.
function AccionesCard({ onPlus, onAbrir, onCalendario }) {
  const b = {
    width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#FFFFFF',
    boxShadow: '0 3px 10px rgba(10, 10, 10, 0.10)', color: '#030303',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
      <button onClick={onPlus} title="Agregar" style={b}><Icon name="plus" size={14} /></button>
      <button onClick={onAbrir} title="Abrir" style={b}><Icon name="external" size={13} /></button>
      <button onClick={onCalendario} title="Ir a Agenda" style={b}><Icon name="calendar" size={14} /></button>
    </div>
  );
}

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

export default function Dashboard({ setView, clinica }) {
  const { isTablet } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [ortoRows, setOrtoRows] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [metrica, setMetrica] = useState('ingresos');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [, forzarTick] = useState(0);
  const [abiertoNuevos, setAbiertoNuevos] = useState(true);
  const [abiertoPendientes, setAbiertoPendientes] = useState(true);

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
        supabase.from('pacientes').select('id, name, doc, phone, tag, created_at, fecha, hora_cita, reason, treatment, archivado_at, fuente_captacion'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
        supabase.from('ortodoncia').select('paciente_id, pagos, plan_tratamiento, resumen'),
        supabase.from('laboratorio_ordenes').select('id, patient_id, patient_name, type, cost, eta, status'),
        supabase.from('gastos').select('categoria, monto, fecha'),
      ]);
      if (!vivo) return;
      // Ortodoncia, laboratorio y gastos son secundarios: si fallan (una
      // clínica que aún no usa esas tablas) no debe caerse todo el dashboard.
      if (errP || errH) {
        setErrorMsg((errP || errH).message);
        setLoading(false);
        return;
      }
      const activos = (pacientesData || []).filter(p => !p.archivado_at);
      setPacientes(activos);

      // Historias filtradas contra pacientes activos: sin esto se cuelan
      // historias huérfanas/archivadas en todos los totales financieros.
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

  // ── Serie de 12 meses: ingresos/gastos (utilidad se deriva al leer) ───────
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
  const ingresosMes = mesActual.ingresos;
  const gastosMes = mesActual.gastos;
  const utilidadMes = ingresosMes - gastosMes;

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

  // ── Tira de avatares ─── calcada de "Case Allocation": círculos parejos
  // (sin superponerse) con una insignia circular ABAJO de cada uno -- vive
  // CENTRADA en la fila de cabecera de "Flujo de tratamiento" (ver más abajo),
  // no metida en la tarjeta del saludo como en la versión anterior. Sin citas
  // hoy, se cae a los pacientes más recientes -- la tira nunca se queda vacía
  // mientras haya al menos un paciente.
  const avataresStrip = (citasHoy.length > 0 ? citasHoy : [...pacientes].sort((a, b) => (b.created_at || b.fecha || '').localeCompare(a.created_at || a.fecha || ''))).slice(0, 8);

  // ── Próximas citas agrupadas por día (hoy + 4 días) ───────────────────────
  const gruposProximos = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date(hoy); d.setDate(d.getDate() + i);
    const clave = dateStr(d);
    const etiqueta = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'short' }).replace(/^./, c => c.toUpperCase());
    const citas = pacientes.filter(p => p.fecha === clave && p.hora_cita).sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));
    return { etiqueta, citas };
  }).filter(g => g.citas.length > 0);

  // ── Deudores combinados ──────────────────────────────────────────────────
  const deudaPorPaciente = new Map();
  tratamientos.forEach(t => {
    const saldo = (t.cost || 0) - (t.paid || 0);
    if (saldo > 0) deudaPorPaciente.set(t.patient_id, (deudaPorPaciente.get(t.patient_id) || 0) + saldo);
  });
  ortoRows.forEach(o => {
    if (o.resumen.deuda > 0) deudaPorPaciente.set(o.paciente_id, (deudaPorPaciente.get(o.paciente_id) || 0) + o.resumen.deuda);
  });
  // Cuántos tratamientos con saldo pendiente tiene cada paciente -- para la
  // insignia bajo cada avatar de la tira, no cuánto debe.
  const pendientesCountPorPaciente = new Map();
  tratamientos.forEach(t => {
    if ((t.cost || 0) - (t.paid || 0) > 0) {
      pendientesCountPorPaciente.set(t.patient_id, (pendientesCountPorPaciente.get(t.patient_id) || 0) + 1);
    }
  });
  const topDeudores = Array.from(deudaPorPaciente.entries())
    .map(([id, saldo]) => ({ paciente: pacientes.find(p => p.id === id), saldo }))
    .filter(d => d.paciente)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5);

  // ── Top pacientes por facturación ─── calcado de "Top Clients" (Reports):
  // suma de t.cost (lo facturado, no lo cobrado) por paciente en historias.
  const facturadoPorPaciente = new Map();
  tratamientos.forEach(t => {
    facturadoPorPaciente.set(t.patient_id, (facturadoPorPaciente.get(t.patient_id) || 0) + (t.cost || 0));
  });
  const topClientes = Array.from(facturadoPorPaciente.entries())
    .map(([id, monto]) => ({ paciente: pacientes.find(p => p.id === id), monto }))
    .filter(d => d.paciente && d.monto > 0)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  // ── Flujo de tratamiento ─────────────────────────────────────────────────
  // Calcado de "Case Allocation" de la referencia (tablero de 4 columnas con
  // tarjetas de persona conectadas por flechas), pero con datos reales: cada
  // paciente cae en UNA sola columna según el estado más avanzado de sus
  // tratamientos -- en_curso > pendiente > completado > (recién ingresado,
  // sin tratamientos aún). Nunca en dos columnas a la vez.
  const tratamientosPorPaciente = new Map();
  tratamientos.forEach(t => {
    const arr = tratamientosPorPaciente.get(t.patient_id) || [];
    arr.push(t);
    tratamientosPorPaciente.set(t.patient_id, arr);
  });
  const FLUJO_COLS = [
    { key: 'nuevo', label: 'Nuevo ingreso' },
    { key: 'diagnostico', label: 'Diagnóstico' },
    { key: 'tratamiento', label: 'En tratamiento' },
    { key: 'completado', label: 'Completado' },
  ];
  const flujoBuckets = { nuevo: [], diagnostico: [], tratamiento: [], completado: [] };
  pacientes.forEach(p => {
    const trats = tratamientosPorPaciente.get(p.id) || [];
    const etapa = trats.some(t => t.status === 'en_curso') ? 'tratamiento'
      : trats.some(t => t.status === 'pendiente') ? 'diagnostico'
      : trats.length > 0 ? 'completado'
      : 'nuevo';
    flujoBuckets[etapa].push(p);
  });
  // Primer tratamiento con saldo encontrado para ese paciente -- deudaPorPaciente
  // sólo suma montos, no guarda a qué tratamiento corresponden.
  const tratamientoDeudaPorPaciente = new Map();
  tratamientos.forEach(t => {
    if ((t.cost || 0) - (t.paid || 0) > 0 && !tratamientoDeudaPorPaciente.has(t.patient_id)) {
      tratamientoDeudaPorPaciente.set(t.patient_id, t.name);
    }
  });

  // ── "Oportunidades de hoy" ────────────────────────────────────────────────
  // Pacientes nuevos (por altas recientes) y pacientes con saldo pendiente,
  // con su fuente de captación real (pacientes.fuente_captacion) -- no hay
  // campo de "nota" libre en el esquema, así que en su lugar se muestra la
  // próxima cita agendada, que es el dato equivalente más útil que sí existe.
  const pacientesNuevos = pacientes
    .filter(p => estadoPaciente(p) === 'nuevo')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 5);

  // ── Laboratorio ──────────────────────────────────────────────────────────
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

  // ── Tratamientos por estado y por nombre ─────────────────────────────────
  // Sobre TODOS los tratamientos: el filtro por especialidad se quitó junto
  // con las tabs (la referencia no tiene tabs en esa tarjeta).
  const conteoEstado = { pendiente: 0, en_curso: 0, completado: 0 };
  tratamientos.forEach(t => { if (conteoEstado[t.status] !== undefined) conteoEstado[t.status]++; });
  const totalEstadoTrat = Object.values(conteoEstado).reduce((a, b) => a + b, 0);

  const porNombre = new Map();
  tratamientos.forEach(t => {
    const prev = porNombre.get(t.name) || { n: 0, monto: 0 };
    porNombre.set(t.name, { n: prev.n + 1, monto: prev.monto + (t.cost || 0) });
  });
  const topTratamientos = Array.from(porNombre.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.monto - a.monto).slice(0, 5);

  // ── Semana / agenda ──────────────────────────────────────────────────────
  const weekDays = getWeekDays(weekAnchor);
  const idxHoy = weekDays.findIndex(d => dateStr(d) === todayStr);
  const dayIdx = selectedIdx !== null ? selectedIdx : (idxHoy >= 0 ? idxHoy : 0);
  const selectedDateStr = dateStr(weekDays[dayIdx]);
  const citasDia = pacientes
    .filter(p => p.fecha === selectedDateStr && p.hora_cita)
    .sort((a, b) => a.hora_cita.localeCompare(b.hora_cita));

  // ── Estilos base ─────────────────────────────────────────────────────────
  const card = {
    background: GLASS_BG, border: GLASS_BORDER,
    backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
    borderRadius: '28px', padding: 24,
    boxShadow: GLASS_SHADOW,
    display: 'flex', flexDirection: 'column',
  };
  const h2 = { margin: 0, fontSize: 16, fontWeight: 600, color: NEGRO, letterSpacing: '-0.01em' };
  const subCard = { background: 'rgba(245, 245, 245, 0.7)', borderRadius: '18px' };
  const col = (n) => ({ gridColumn: isTablet ? 'auto' : `span ${n}` });

  const nombreClinica = (clinica?.nombre || '').replace(/^Consultorio\s+/i, '').trim();

  const atajos = [
    { icon: 'calendar', titulo: 'Nueva cita', sub: 'Agendar paciente', view: 'agenda' },
    { icon: 'card', titulo: 'Registrar pago', sub: 'Cobrar saldo', view: 'caja' },
    { icon: 'userPlus', titulo: 'Nuevo paciente', sub: 'Abrir historial', view: 'expediente' },
    { icon: 'chat', titulo: 'Preguntar a la IA', sub: 'Sobre tus datos', view: 'whatsapp' },
  ];

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>Cargando dashboard…</div>;
  }
  if (errorMsg) {
    return <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 13.5 }}>Error al cargar el dashboard: {errorMsg}</div>;
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'repeat(12, 1fr)', gap: '20px', alignItems: 'stretch', animation: 'fadeIn 0.4s ease-in-out' }}>

      {/* ─── TÍTULO ─── comparte fila con los indicadores, calcado de
          "Reports": el título a la izquierda y las 4 tarjetas de KPI a su
          derecha, en la MISMA banda horizontal. Antes el título vivía solo en
          su propia fila y los KPIs recién aparecían después del kanban. El
          saludo pasa acá abajo como subtítulo (antes estaba dentro de la
          tarjeta del gráfico, donde la referencia sólo tiene un título). */}
      <div style={{ ...col(3), display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: NEGRO, margin: 0, letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 12.5, color: MU, margin: 0, lineHeight: 1.45 }}>
          Hola{nombreClinica ? `, ${nombreClinica}` : ''}.{' '}
          {citasHoy.length > 0
            ? <>{citasHoy.length} cita{citasHoy.length !== 1 ? 's' : ''} hoy, la próxima a las {citasHoy[0].hora_cita}.</>
            : <>Hoy no tienes citas agendadas.</>}
        </p>
      </div>

      {/* ─── FLUJO DE TRATAMIENTO ─── calcado de "Case Allocation" (pantalla
          "Cases" de la referencia). Se queda en el código acá arriba pero
          RENDERIZA AL FINAL vía `order` de grid: la pantalla que se está
          copiando ahora es "Reports", que arranca con título + KPIs +
          gráfico, no con un tablero. Se conserva porque es funcionalidad
          real que el usuario pidió, sólo pierde el primer lugar.
          La tira de avatares va CENTRADA en la fila de cabecera
          (título — avatares — íconos), tal cual la referencia -- antes
          vivía a la izquierda, metida en la tarjeta del saludo. Las 4
          columnas son etapas reales de tratamiento (flujoBuckets arriba),
          cada tarjeta un paciente real. Las flechas entre columnas son
          decorativas (conectan columna con columna, no paciente con paciente
          específico como en la referencia -- eso pediría la posición en
          píxeles de cada tarjeta, que cambia según cuántos pacientes tenga
          cada clínica en cada etapa). */}
      <div style={{ ...col(12), ...card, order: 2 }}>
        {/* Cabecera en DOS filas, calcada de "Case Allocation": fila 1 sólo
            el título; fila 2 la píldora de avatares (izquierda-centro) y los
            íconos de acción empujados al extremo derecho con auto-margin --
            antes las 3 cosas vivían apretadas en una sola fila. */}
        <h2 style={{ ...h2, marginBottom: 16 }}>Flujo de tratamiento</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
          {/* Tira de avatares -- dentro de un contenedor en forma de píldora
              (glassmorphism, la "abraza" de cerca) calcado del
              "top_users_bar" de la referencia. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            background: 'rgba(255, 255, 255, 0.55)', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
            border: GLASS_BORDER, borderRadius: 999, padding: '8px 18px 12px',
            boxShadow: '0 6px 20px rgba(10, 10, 10, 0.06)',
          }}>
            {avataresStrip.map((p, i) => {
              const pendientes = pendientesCountPorPaciente.get(p.id) || 0;
              const badgeColor = pendientes > 0 ? (i % 2 === 0 ? P : RJ) : null;
              return (
                <div key={p.id} style={{ position: 'relative', flexShrink: 0 }} title={p.name}>
                  <div
                    onClick={() => setView && setView('expediente')}
                    style={{
                      width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
                      background: `color-mix(in srgb, ${colorPorNombre(p.name)} 22%, #FFFFFF)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: NEGRO,
                      border: '2px solid #FFFFFF', boxShadow: '0 2px 6px rgba(10, 10, 10, 0.08)',
                    }}
                  >
                    {ini(p.name || '?')}
                  </div>
                  <span style={{
                    position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                    minWidth: 19, height: 19, padding: '0 3px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, border: '2px solid #FFFFFF',
                    background: badgeColor || '#E5E5E5', color: badgeColor ? '#FFFFFF' : '#9AA1AC',
                  }}>
                    {pendientes > 0 ? pendientes : '+'}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
            <button onClick={() => setView && setView('expediente')} title="Nuevo paciente" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#FFFFFF', boxShadow: '0 3px 10px rgba(10, 10, 10, 0.10)', color: NEGRO, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="plus" size={14} />
            </button>
            <button onClick={() => setView && setView('agenda')} title="Ir a Agenda" style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#FFFFFF', boxShadow: '0 3px 10px rgba(10, 10, 10, 0.10)', color: NEGRO, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="calendar" size={14} />
            </button>
          </div>
        </div>

        <div>
          {/* Flechas decorativas -- franja propia de 36px ARRIBA de la
              grilla, para no estirarse contra el alto de las tarjetas. */}
          {!isTablet && (
            <div style={{ height: 36, position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 1000 36" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none' }}>
                {[125, 375, 625].map(x => (
                  <path key={x} d={`M ${x} 4 C ${x + 60} 4, ${x + 60} 32, ${x + 120} 32`} stroke={P} strokeWidth="2" fill="none" />
                ))}
              </svg>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'repeat(4, 1fr)', gap: 16 }}>
            {FLUJO_COLS.map(colDef => {
              const items = flujoBuckets[colDef.key];
              return (
                <div key={colDef.key}>
                  <div style={{ ...subCard, padding: 14, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.length === 0 ? (
                      // Maqueta -- filas fantasma (silueta gris, sin datos
                      // inventados) para que la columna vacía mantenga la
                      // estructura de la referencia en vez de un hueco en
                      // blanco con solo texto.
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.45 }}>
                        {[0, 1].map(i => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: '#E2E2E2' }} />
                            <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                              <div style={{ height: 8, width: `${60 - i * 12}%`, borderRadius: 4, background: '#DADADA' }} />
                              <div style={{ height: 7, width: `${40 - i * 8}%`, borderRadius: 4, background: '#E6E6E6' }} />
                            </div>
                          </div>
                        ))}
                        <div style={{ fontSize: 11, color: '#B0B0B0', textAlign: 'center', marginTop: 2 }}>Sin pacientes aún</div>
                      </div>
                    ) : items.slice(0, 3).map(p => (
                      <div key={p.id} onClick={() => setView && setView('expediente')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: `color-mix(in srgb, ${colorPorNombre(p.name)} 22%, #FFFFFF)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: NEGRO, fontWeight: 700, fontSize: 11.5,
                        }}>
                          {ini(p.name || '?')}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: NEGRO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: 10.5, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.treatment || p.reason || 'Consulta'}</div>
                        </div>
                        <Icon name="checkCircle" size={13} style={{ color: colDef.key === 'completado' ? VERDE : '#C4C4C4', flexShrink: 0 }} />
                        <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: MU }}>
                          <Icon name="calendar" size={11} />
                        </div>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div style={{ fontSize: 11, color: MU, fontWeight: 600, textAlign: 'center' }}>+{items.length - 3} más</div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: MU, fontWeight: 600, textAlign: 'center', marginTop: 10 }}>{colDef.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── INDICADORES ─── sin ícono, sólo rótulo chico arriba y cifra
          grande abajo -- la métrica activa del hero (tab de Ingresos/
          Utilidad/Gastos) se resalta como tarjeta negra sólida, igual que
          "Total Opportunities" en la referencia; el resto queda blanco. */}
      <div style={{ ...col(9), display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {[
          { key: 'ingresos', label: 'Ingresos del mes', value: soles(ingresosMes), view: 'caja' },
          { key: 'gastos', label: 'Gastos del mes', value: soles(gastosMes), view: 'caja' },
          { key: 'utilidad', label: 'Utilidad neta', value: soles(utilidadMes), view: 'caja' },
          { key: 'pacientes', label: 'Pacientes activos', value: String(pacientes.length), view: 'expediente' },
        ].map(k => {
          const activa = k.key === metrica;
          return (
            <div
              key={k.label} onClick={() => setView && setView(k.view)}
              style={{
                ...card, flex: 1, minWidth: 180, padding: '20px 22px', cursor: 'pointer',
                background: activa ? NEGRO : GLASS_BG,
                border: activa ? 'none' : GLASS_BORDER,
                boxShadow: activa ? '0 10px 24px rgba(10, 10, 10, 0.22)' : GLASS_SHADOW,
                transition: 'box-shadow 250ms cubic-bezier(0.25, 0.1, 0.25, 1), transform 250ms cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: 12.5, color: activa ? 'rgba(255, 255, 255, 0.65)' : MU, fontWeight: 500 }}>{k.label}</div>
              <div style={{ fontSize: 25, fontWeight: 700, color: activa ? '#FFFFFF' : NEGRO, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, marginTop: 6, whiteSpace: 'nowrap' }}>{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* ─── CRECIMIENTO DE INGRESOS ─── calcado de "Revenue Growth" (vista
          Reports de la referencia): barras cápsula (100% redondeadas), valor
          arriba de cada una, mes abajo -- el mes ACTUAL en negro sólido con
          su etiqueta en píldora. Reemplaza el área/línea anterior; se
          conservan las tabs de métrica (Ingresos/Utilidad/Gastos) porque son
          funcionalidad real que ya existía, sólo que ahora chicas arriba en
          vez de con una cifra gigante (esa cifra ya vive en la fila de KPIs). */}
      <div style={{ ...col(12), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <h2 style={h2}>Crecimiento de ingresos</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: VERDE, flexShrink: 0 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: VERDE, animation: 'pulso-vivo 2.2s ease-out infinite' }} />
              </span>
              <span style={{ fontSize: 11.5, color: MU, whiteSpace: 'nowrap' }}>
                {ultimaActualizacion ? `Actualizado hace ${formatoHaceTiempo(ultimaActualizacion)}` : 'Cargando…'}
              </span>
            </div>
            <AccionesCard
              onPlus={() => setView && setView('caja')}
              onAbrir={() => setView && setView('caja')}
              onCalendario={() => setView && setView('agenda')}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, margin: '14px 0 18px' }}>
          {METRICAS.map(m => (
            <button key={m.key} onClick={() => setMetrica(m.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                padding: 0, cursor: 'pointer', font: 'inherit',
                fontSize: 12.5, fontWeight: 600, color: metrica === m.key ? NEGRO : MU,
              }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                border: `1.5px solid ${metrica === m.key ? P : 'rgba(10, 10, 10, 0.11)'}`,
                background: metrica === m.key ? P : 'transparent',
              }} />
              {m.label}
            </button>
          ))}
        </div>

        {(() => {
          const valorDe = (m) => (metrica === 'gastos' ? m.gastos : metrica === 'utilidad' ? (m.ingresos - m.gastos) : m.ingresos);
          const maxVal = Math.max(...meses12.map(valorDe), 1);
          // Las cápsulas arrancan en un 34% en vez de en cero: en la
          // referencia son barras altas y parejas, y con los meses en cero
          // (clínica recién empezando) unos muñones de 8px dejaban la tarjeta
          // casi vacía. El valor exacto va rotulado sobre cada barra, así que
          // el piso es sólo visual, no esconde el dato.
          const alturaDe = (valor) => 34 + 66 * (Math.max(0, valor) / maxVal);
          return (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: isTablet ? 6 : 12, height: 200 }}>
                {meses12.map((m, i) => {
                  const valor = valorDe(m);
                  const esUltimo = i === meses12.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', minWidth: 0 }}>
                      <span style={{
                        fontSize: 10.5, marginBottom: 8, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                        color: esUltimo ? NEGRO : MU, fontWeight: esUltimo ? 700 : 400,
                      }}>
                        {(!isTablet || i % 2 === 0) ? soles(valor) : ''}
                      </span>
                      {/* El mes actual es la cápsula BLANCA brillante con
                          sombra (en la referencia el mes destacado resalta por
                          ser más claro, no más oscuro -- antes iba en negro). */}
                      <div style={{
                        width: isTablet ? 14 : 30, height: `${alturaDe(valor)}%`, borderRadius: 999,
                        background: esUltimo ? '#FFFFFF' : 'rgba(10, 10, 10, 0.07)',
                        boxShadow: esUltimo ? '0 4px 16px rgba(10, 10, 10, 0.13)' : 'none',
                        transition: 'height 400ms cubic-bezier(0.25, 0.1, 0.25, 1)',
                      }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: isTablet ? 6 : 12, marginTop: 10 }}>
                {meses12.map((m, i) => {
                  const esUltimo = i === meses12.length - 1;
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: esUltimo ? 700 : 500, color: esUltimo ? '#FFFFFF' : MU,
                        background: esUltimo ? NEGRO : 'transparent', padding: esUltimo ? '4px 11px' : 0, borderRadius: 999,
                      }}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      {/* ─── TRATAMIENTOS POR ESTADO ─── calcado de "Deals by Stage": la
          tarjeta más angosta de la fila (3/12), leyenda con puntos de color y
          porcentaje a la IZQUIERDA, dona a la derecha. Se quitó el filtro por
          especialidad (General/Ortodoncia/...): en la referencia no hay tabs y
          acá se envolvían a dos líneas, dejando la tarjeta hecha un lío. La
          dona ahora cubre TODOS los tratamientos. */}
      <div style={{ ...col(3), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 }}>
          <h2 style={h2}>Por estado</h2>
          <AccionesCard
            onPlus={() => setView && setView('expediente')}
            onAbrir={() => setView && setView('historia')}
            onCalendario={() => setView && setView('agenda')}
          />
        </div>
        {tratamientos.length === 0 ? (
          <div style={{ textAlign: 'center', color: MU, fontSize: 13.5, padding: '24px 0' }}>
            Sin tratamientos registrados aún.
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {ESTADO_TRAT.map(e => (
                <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, color: NEGRO, fontWeight: 500, whiteSpace: 'nowrap' }}>{e.label}</span>
                  <span style={{ fontSize: 11.5, color: MU, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    — {totalEstadoTrat > 0 ? Math.round((conteoEstado[e.key] / totalEstadoTrat) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
            <Dona
              segmentos={ESTADO_TRAT.map(e => ({ valor: conteoEstado[e.key], color: e.color }))}
              tamano={96} grosor={17}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: NEGRO }}>{totalEstadoTrat}</span>
            </Dona>
          </div>
        )}
      </div>

      {/* ─── TRATAMIENTOS MÁS FACTURADOS ─── tabla de 3 columnas, calcada de
          la tabla "Manager / Deals Closed / Revenue" de "Reports" -- la más
          ancha de la fila (5/12), igual que ahí. */}
      <div style={{ ...col(5), ...card, padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '20px 20px 0' }}>
          <h2 style={h2}>Más facturados</h2>
          <AccionesCard
            onPlus={() => setView && setView('historia')}
            onAbrir={() => setView && setView('caja')}
            onCalendario={() => setView && setView('agenda')}
          />
        </div>
        {topTratamientos.length === 0 ? (
          <div style={{ fontSize: 13, color: MU, padding: '12px 20px 20px' }}>Sin tratamientos registrados aún.</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                {['Tratamiento', 'Cant.', 'Facturado'].map(x => (
                  <th key={x} style={{ textAlign: 'left', padding: '6px 20px', color: MU, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{x}</th>
                ))}
              </tr></thead>
              <tbody>
                {topTratamientos.map(t => (
                  <tr key={t.name} className="row-hoverable" style={{ borderTop: '1px solid rgba(10, 10, 10, 0.06)' }}>
                    <td style={{ padding: '10px 20px', fontWeight: 600, color: NEGRO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{t.name}</td>
                    <td style={{ padding: '10px 20px', color: MU }}>{String(t.n).padStart(2, '0')}</td>
                    <td style={{ padding: '10px 20px', color: NEGRO, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{soles(t.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ height: 12 }} />
      </div>

      {/* ─── TOP PACIENTES POR FACTURACIÓN ─── tabla, calcada de "Top
          Clients" de "Reports". */}
      <div style={{ ...col(4), ...card, padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '20px 20px 0' }}>
          <h2 style={h2}>Top pacientes</h2>
          <AccionesCard
            onPlus={() => setView && setView('expediente')}
            onAbrir={() => setView && setView('expediente')}
            onCalendario={() => setView && setView('agenda')}
          />
        </div>
        {topClientes.length === 0 ? (
          <div style={{ fontSize: 13, color: MU, padding: '12px 20px 20px' }}>Sin facturación registrada aún.</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                {['Paciente', 'Facturado'].map(x => (
                  <th key={x} style={{ textAlign: 'left', padding: '6px 20px', color: MU, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{x}</th>
                ))}
              </tr></thead>
              <tbody>
                {topClientes.map(c => (
                  <tr key={c.paciente.id} onClick={() => setView && setView('expediente')} className="row-hoverable" style={{ borderTop: '1px solid rgba(10, 10, 10, 0.06)', cursor: 'pointer' }}>
                    <td style={{ padding: '10px 20px', fontWeight: 600, color: NEGRO, whiteSpace: 'nowrap' }}>{c.paciente.name}</td>
                    <td style={{ padding: '10px 20px', color: NEGRO, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{soles(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ height: 12 }} />
      </div>

      {/* ─── ATAJOS ─── */}
      <div style={{ ...col(12), ...card, flexDirection: isTablet ? 'column' : 'row', padding: 6, gap: 0 }}>
        {atajos.map((a, i) => (
          <button key={a.titulo} onClick={() => setView && setView(a.view)}
            style={{
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 14px', cursor: 'pointer', borderRadius: '14px', textAlign: 'left',
              background: 'transparent', border: 'none', font: 'inherit', minHeight: 44,
              borderLeft: (!isTablet && i > 0) ? `1px solid rgba(10, 10, 10, 0.06)` : 'none',
              borderTop: (isTablet && i > 0) ? `1px solid rgba(10, 10, 10, 0.06)` : 'none',
              transition: 'background-color 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EDEDED'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(114, 157, 238, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: P, flexShrink: 0 }}>
              <Icon name={a.icon} size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: NEGRO, lineHeight: 1.3, whiteSpace: 'nowrap' }}>{a.titulo}</div>
              <div style={{ fontSize: 12, color: MU, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ─── COBRANZA ─── par de semicírculos (Cobrado/Pendiente), calcado del
          gauge doble "Executed/Active" de la referencia. Baja acá porque en
          "Reports" la fila de abajo tiene exactamente 3 tarjetas (dona +
          tabla + tabla) y ésta era una cuarta que rompía la composición. */}
      <div style={{ ...col(4), ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={h2}>Cobranza</h2>
          <AccionesCard
            onPlus={() => setView && setView('caja')}
            onAbrir={() => setView && setView('caja')}
            onCalendario={() => setView && setView('agenda')}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 12, margin: '14px 0 6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Anillo pct={tasaCobro} color={P} tamano={104} grosor={11} barrido={180}>
              <span style={{ fontSize: 19, fontWeight: 700, color: NEGRO }}>{tasaCobro}%</span>
            </Anillo>
            <span style={{ fontSize: 11.5, color: MU, fontWeight: 600 }}>Cobrado</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: NEGRO }}>{soles(totalCobrado)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Anillo pct={100 - tasaCobro} color={RJ} tamano={104} grosor={11} barrido={180}>
              <span style={{ fontSize: 19, fontWeight: 700, color: NEGRO }}>{100 - tasaCobro}%</span>
            </Anillo>
            <span style={{ fontSize: 11.5, color: MU, fontWeight: 600 }}>Pendiente</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: saldoPendienteTotal > 0 ? RJ : NEGRO }}>{soles(saldoPendienteTotal)}</span>
          </div>
        </div>
        <div style={{ ...subCard, padding: '12px 14px', marginTop: 'auto', fontSize: 12.5, color: NEGRO, lineHeight: 1.5 }}>
          {saldoPendienteTotal > 0
            ? <>Hay <b style={{ color: RJ }}>{soles(saldoPendienteTotal)}</b> por cobrar entre {deudaPorPaciente.size} paciente{deudaPorPaciente.size !== 1 ? 's' : ''}.</>
            : <>La cobranza está <b style={{ color: VERDE }}>al día</b>.</>}
        </div>
      </div>

      {/* ─── PRÓXIMAS CITAS ─── muesca de carpeta en la esquina superior
          izquierda vía clip-path (corte recto, no la curva cóncava exacta de
          la referencia -- clip-path es la única técnica que corta limpio
          sobre una tarjeta de vidrio con blur). Cada cita: avatar + nombre +
          doble check + botón de calendario, con leyenda y divisor. */}
      <div style={{ ...col(4), ...card, minHeight: 178, clipPath: 'polygon(28px 0, 100% 0, 100% 100%, 0 100%, 0 28px)', paddingTop: 30, paddingLeft: 30 }}>
        <h2 style={{ ...h2, marginBottom: 14 }}>Próximas citas</h2>
        {gruposProximos.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MU }}>Sin citas en los próximos días.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: 360 }}>
            {gruposProximos.map(g => (
              <div key={g.etiqueta}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P, textTransform: 'capitalize', margin: '10px 0 9px' }}>{g.etiqueta}</div>
                {g.citas.map((c, i) => (
                  <div key={c.id}>
                    <div onClick={() => setView && setView('agenda')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: `color-mix(in srgb, ${colorPorNombre(c.name)} 22%, #FFFFFF)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: NEGRO, fontWeight: 700, fontSize: 13,
                      }}>
                        {ini(c.name || '?')}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: NEGRO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                        <div style={{ fontSize: 11.5, color: MU }}>
                          {estadoPaciente(c) === 'nuevo' ? 'Nuevo paciente' : 'Confirmado'}
                        </div>
                      </div>
                      <Icon name="checkCircle" size={15} style={{ color: estadoPaciente(c) === 'nuevo' ? '#C4C4C4' : VERDE, flexShrink: 0 }} />
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(245, 245, 245, 0.8)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: MU,
                      }}>
                        <Icon name="calendar" size={13} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: MU, margin: '6px 0 0 51px' }}>
                      {c.treatment || c.reason || 'Consulta'} · {c.hora_cita}
                    </div>
                    {!(g === gruposProximos[gruposProximos.length - 1] && i === g.citas.length - 1) && (
                      <div style={{ height: 1, background: 'rgba(10, 10, 10, 0.08)', margin: '12px 0' }} />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── AGENDA (mini-calendario semanal) ─── */}
      <div style={{ ...col(4), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={h2}>{weekDays[0].toLocaleString('es-PE', { month: 'long' }).replace(/^./, c => c.toUpperCase())} {weekDays[0].getFullYear()}</h2>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['<', -7], ['>', 7]].map(([lbl, delta]) => (
              <div key={lbl} onClick={() => { setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; }); setSelectedIdx(null); }}
                style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU, fontSize: 13, background: '#F5F5F5' }}>
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
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSel ? P : 'transparent', border: 'none', color: isSel ? '#FFFFFF' : (isToday ? P : NEGRO), fontWeight: isSel || isToday ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontVariantNumeric: 'tabular-nums', transition: 'background-color 150ms cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
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
              border: '1.5px dashed rgba(10, 10, 10, 0.11)',
              borderRadius: '14px',
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
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{ini(c.name || '?')}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: NEGRO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
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
      <div style={{ ...col(6), ...card, minHeight: 178 }}>
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: NEGRO, lineHeight: 1.35 }}>{a.texto}</div>
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

      {/* ─── LABORATORIO ─── sube acá para completar la fila junto a
          "Necesita tu atención" (6+6): antes quedaba solo al final, con media
          fila vacía a su derecha. */}
      <div style={{ ...col(6), ...card, minHeight: 178 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
          <h2 style={h2}>Laboratorio</h2>
          <AccionesCard
            onPlus={() => setView && setView('laboratorio')}
            onAbrir={() => setView && setView('laboratorio')}
            onCalendario={() => setView && setView('agenda')}
          />
        </div>
        {labOrders.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MU }}>Sin órdenes registradas.</div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { l: 'En proceso', v: labEnProceso.length, c: P },
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

      {/* ─── OPORTUNIDADES DE HOY ─── dos tablas apiladas, cada una con su
          cabecera (título + contador + chevron de colapso). "Referido de"
          sale de pacientes.fuente_captacion, un campo real de Supabase. */}
      <div style={{ ...col(12), ...card, padding: 0, gap: 0 }}>
        <div style={{ padding: '18px 22px' }}>
          <button onClick={() => setAbiertoNuevos(v => !v)} style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left',
          }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: NEGRO, display: 'flex', alignItems: 'center', gap: 8 }}>
              Pacientes nuevos
              <span style={{ fontSize: 12, fontWeight: 600, color: MU }}>({pacientesNuevos.length})</span>
            </span>
            <Icon name={abiertoNuevos ? 'chevronUp' : 'chevronDown'} size={15} />
          </button>
          {abiertoNuevos && (
            pacientesNuevos.length === 0 ? (
              <div style={{ fontSize: 13, color: MU, marginTop: 12 }}>Sin altas nuevas por ahora.</div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>
                    {['Nombre', 'Interesado en', 'Referido de', 'Próxima cita'].map(x => (
                      <th key={x} style={{ textAlign: 'left', padding: '6px 12px', color: MU, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{x}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {pacientesNuevos.map(p => (
                      <tr key={p.id} onClick={() => setView && setView('expediente')} className="row-hoverable" style={{ borderTop: '1px solid rgba(10, 10, 10, 0.06)', cursor: 'pointer' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: NEGRO, whiteSpace: 'nowrap' }}>{p.name}</td>
                        <td style={{ padding: '10px 12px', color: NEGRO }}>{p.treatment || p.reason || '—'}</td>
                        <td style={{ padding: '10px 12px', color: MU }}>{p.fuente_captacion || 'Directo'}</td>
                        <td style={{ padding: '10px 12px', color: MU, fontVariantNumeric: 'tabular-nums' }}>{p.fecha ? `${p.fecha} · ${p.hora_cita || ''}` : 'Sin agendar'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(10, 10, 10, 0.06)' }} />

        <div style={{ padding: '18px 22px' }}>
          <button onClick={() => setAbiertoPendientes(v => !v)} style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left',
          }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: NEGRO, display: 'flex', alignItems: 'center', gap: 8 }}>
              Tratamiento pendiente de pago
              <span style={{ fontSize: 12, fontWeight: 600, color: MU }}>({topDeudores.length})</span>
            </span>
            <Icon name={abiertoPendientes ? 'chevronUp' : 'chevronDown'} size={15} />
          </button>
          {abiertoPendientes && (
            topDeudores.length === 0 ? (
              <div style={{ fontSize: 13, color: MU, marginTop: 12 }}>Nadie tiene saldo pendiente. Al día.</div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr>
                    {['Nombre', 'Tratamiento', 'Referido de', 'Saldo'].map(x => (
                      <th key={x} style={{ textAlign: 'left', padding: '6px 12px', color: MU, fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{x}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {topDeudores.map(d => (
                      <tr key={d.paciente.id} onClick={() => setView && setView('caja')} className="row-hoverable" style={{ borderTop: '1px solid rgba(10, 10, 10, 0.06)', cursor: 'pointer' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: NEGRO, whiteSpace: 'nowrap' }}>{d.paciente.name}</td>
                        <td style={{ padding: '10px 12px', color: NEGRO }}>{tratamientoDeudaPorPaciente.get(d.paciente.id) || d.paciente.treatment || d.paciente.reason || '—'}</td>
                        <td style={{ padding: '10px 12px', color: MU }}>{d.paciente.fuente_captacion || 'Directo'}</td>
                        <td style={{ padding: '10px 12px', color: RJ, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{soles(d.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      </div>
    </>
  );
}
