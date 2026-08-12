// src/components/vistas/Caja.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Stat from '../ui/Stat';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { BD, P, GL, MU, DN, LT, WA, RJ, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import { sc } from '../../utils/helpers';
import { BUCKET, rutaComprobante, firmar } from '../../utils/storage';

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'];
const CATEGORIAS_GASTO = ['Materiales', 'Laboratorio', 'Servicios', 'Sueldos', 'Otros'];

const hoyISO = () => new Date().toISOString().slice(0, 10);
const parseFecha = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
const formatFecha = (s) => { const d = parseFecha(s); return d ? d.toLocaleDateString('es-PE') : (s || '—'); };
const mismoMes = (d, ref) => d && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();

const PAGO_VACIO = { patientId: '', grupoKey: '', monto: '', metodo: 'Efectivo', referencia: '' };
const GASTO_VACIO = { categoria: 'Materiales', monto: '', fecha: hoyISO(), nota: '' };

const TRANSICION = 'border-color .15s cubic-bezier(0.25, 0.1, 0.25, 1), background .15s cubic-bezier(0.25, 0.1, 0.25, 1)';

// Dos densidades de formulario: la "compacta" para las rejillas de varias
// columnas (form de pagos, serie/número/fecha del comprobante), que no entran
// a tamaño completo sin desbordar; la de modal para los campos a ancho entero.
const LABEL_CAMPO = { fontSize: 12, color: MU, fontWeight: 600, display: 'block', marginBottom: 6 };
const INPUT_CAMPO = {
  width: '100%', padding: '9px 12px', minHeight: 36, borderRadius: '10px',
  border: `1px solid ${BD}`, fontSize: 13.5, color: DN, background: LT,
  outline: 'none', boxSizing: 'border-box', transition: TRANSICION,
};
const LABEL_MODAL = { fontSize: 13, color: MU, fontWeight: 600, display: 'block', marginBottom: 6 };
const INPUT_MODAL = {
  width: '100%', padding: '10px 12px', minHeight: 44, borderRadius: '10px',
  border: `1px solid ${BD}`, fontSize: 15, color: DN, background: LT,
  outline: 'none', boxSizing: 'border-box', transition: TRANSICION,
};

// Emisión de comprobantes: no hay integración con una API de SUNAT (ese servicio
// solo permite CONSULTAR comprobantes ya emitidos, no crearlos -- emitir de verdad
// exige un certificado digital propio o un proveedor OSE/PSE de pago). Mientras
// tanto, este botón deja los datos listos para copiar y abre SUNAT SOL en una
// pestaña nueva -- SOL bloquea ser embebido en un iframe (X-Frame-Options), así
// que no es posible mostrarlo dentro de DentalOS.
//
// URL verificada rastreando el botón "Ingresar" de MIS TRÁMITES Y CONSULTAS en
// sunat.gob.pe/sol.html: su JS (`tramiteConsulta()`) abre
// cl-ti-itmenucabina/MenuInternet.htm, que redirige a
// api-seguridad.sunat.gob.pe/.../oauth2/authen, que a su vez redirige (302) a
// esta URL con estos mismos parámetros -- son necesarios los 5 (lang, showDni,
// showLanguages, originalUrl, state); quitar alguno hace que SUNAT muestre una
// pantalla intermedia de selección en vez del formulario de login. El `state`
// no es una sesión de un usuario particular: es un hash fijo que depende solo
// del `originalUrl`, así que es seguro dejarlo hardcodeado.
const SOL_LOGIN_URL = 'https://api-seguridad.sunat.gob.pe/v1/clientessol/4f3b88b3-d9d6-402a-b85d-6a0bc857746a/oauth2/loginMenuSol?lang=es-PE&showDni=true&showLanguages=false&originalUrl=https://e-menu.sunat.gob.pe/cl-ti-itmenu/AutenticaMenuInternet.htm&state=rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwP0AAAAAAAAx3CAAAABAAAAADdAADZXhlcHQABnBhcmFtc3QASyomKiYvY2wtdGktaXRtZW51L01lbnVJbnRlcm5ldC5odG0mYjY0ZDI2YThiNWFmMDkxOTIzYjIzYjY0MDdhMWMxZGI0MWU3MzNhNnQABGV4ZWNweA==';
const GUIA_SOL = {
  boleta: 'En SOL: Empresas → Comprobantes de pago → SEE - SOL → Emitir Boleta de Venta / Factura Electrónica.',
  rxh: 'En SOL: Comprobantes de pago → Recibos por Honorarios → Emisión de Recibos por Honorarios.',
};

export default function Caja({ clinicaId }) {
  const [tab, setTab] = useState('facturas');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [facturas, setFacturas] = useState([]); // items de plan_tratamiento, aplanados, con patient_id
  const [gastos, setGastos] = useState([]);
  const [errorGastos, setErrorGastos] = useState(null);

  const [pagoDraft, setPagoDraft] = useState(PAGO_VACIO);
  const [savingPago, setSavingPago] = useState(false);

  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoDraft, setGastoDraft] = useState(GASTO_VACIO);
  const [savingGasto, setSavingGasto] = useState(false);

  const [expandidosPacientes, setExpandidosPacientes] = useState(new Set());
  const [emitirDraft, setEmitirDraft] = useState(null); // { patientId, tipo, grupos, monto, serie, numero, fecha, archivoFile, archivoExistente }
  const [copiado, setCopiado] = useState(false);
  const [savingComprobante, setSavingComprobante] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setErrorMsg(null);
      const [{ data: pacientesData, error: errP }, { data: historiasData, error: errH }, { data: gastosData, error: errG }] = await Promise.all([
        supabase.from('pacientes').select('id, name, doc, archivado_at'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      ]);

      if (errP || errH) { setErrorMsg((errP || errH).message); setLoading(false); return; }
      // Igual que en el Dashboard: sólo pacientes activos, y sólo historias que
      // correspondan a uno de ellos. Antes entraban a los totales las historias
      // huérfanas de pacientes ya borrados, inflando facturado y cobrado con
      // dinero que no era de nadie.
      const activos = (pacientesData || []).filter(p => !p.archivado_at);
      const idsActivos = new Set(activos.map(p => p.id));
      setPacientes(activos);
      setFacturas(
        (historiasData || [])
          .filter(h => idsActivos.has(h.patient_id))
          .flatMap(h => (h.plan_tratamiento || []).map(item => ({ ...item, patient_id: h.patient_id })))
      );

      if (errG) setErrorGastos(errG.message); else setGastos(gastosData || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const nombrePaciente = (id) => pacientes.find(p => String(p.id) === String(id))?.name || '—';
  const docPaciente = (id) => pacientes.find(p => String(p.id) === String(id))?.doc || '';

  const toggleExpandido = (id) => setExpandidosPacientes(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const abrirEmitir = (patientId, grupos) => {
    const monto = grupos.reduce((s, g) => s + g.cost, 0);
    // Si es un solo tratamiento y ya tiene comprobante guardado, se precarga
    // para poder verlo o corregirlo -- si son varios, siempre se parte en blanco.
    const existente = grupos.length === 1 ? grupos[0].comprobante : null;
    setEmitirDraft({
      patientId, grupos, monto: String(monto),
      tipo: existente?.tipo || 'boleta',
      serie: existente?.serie || '',
      numero: existente?.numero || '',
      fecha: existente?.fecha || hoyISO(),
      archivoFile: null,
      archivoExistente: existente?.archivo || null,
    });
    setCopiado(false);
  };

  const verComprobante = async (path) => {
    const url = await firmar(path);
    if (url) window.open(url, '_blank', 'noopener');
    else alert('No se pudo abrir el archivo adjunto.');
  };

  const guardarComprobante = async () => {
    const d = emitirDraft;
    const serie = d.serie.trim();
    const numero = d.numero.trim();
    if (!serie && !numero && !d.archivoFile && !d.archivoExistente) {
      alert('Ingresa la serie y número del comprobante, o adjunta el archivo emitido en SUNAT.');
      return;
    }
    setSavingComprobante(true);
    try {
      let archivo = d.archivoExistente;
      if (d.archivoFile) {
        const ruta = rutaComprobante(clinicaId, d.patientId, d.archivoFile.name);
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(ruta, d.archivoFile);
        if (upErr) throw upErr;
        archivo = ruta;
      }
      const comprobante = { tipo: d.tipo, serie, numero, fecha: d.fecha, archivo };
      const idsCubiertos = new Set(d.grupos.flatMap(g => g.items.map(i => i.id)));

      const itemsDelPaciente = facturas.filter(f => String(f.patient_id) === String(d.patientId));
      const planActualizado = itemsDelPaciente.map(f => {
        const rest = { ...f };
        delete rest.patient_id;
        return idsCubiertos.has(rest.id) ? { ...rest, comprobante } : rest;
      });

      const { error } = await supabase.from('historias').upsert({ patient_id: d.patientId, clinica_id: clinicaId, plan_tratamiento: planActualizado }, { onConflict: 'patient_id' });
      if (error) throw error;

      setFacturas(prev => prev.map(f => {
        if (String(f.patient_id) !== String(d.patientId)) return f;
        const actualizado = planActualizado.find(x => String(x.id) === String(f.id));
        return actualizado ? { ...actualizado, patient_id: f.patient_id } : f;
      }));
      setEmitirDraft(null);
    } catch (err) {
      alert('Error al guardar el comprobante: ' + err.message);
    } finally {
      setSavingComprobante(false);
    }
  };

  const textoParaCopiar = (d) => {
    const conceptos = d.grupos
      .map(g => `- ${g.name}${g.toothLabel !== '—' ? ` (pieza ${g.toothLabel})` : ''}: S/${g.cost}`)
      .join('\n');
    return `Paciente: ${nombrePaciente(d.patientId)}\nDNI: ${docPaciente(d.patientId) || '(sin DNI registrado)'}\nMonto: S/${d.monto}\nConceptos:\n${conceptos}`;
  };

  const copiarDatos = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert('No se pudo copiar automáticamente. Selecciona el texto manualmente.');
    }
  };

  const irAPagar = (grupo) => {
    setPagoDraft({ patientId: String(grupo.patient_id), grupoKey: grupo.key, monto: '', metodo: 'Efectivo', referencia: '' });
    setTab('pagos');
  };

  const registrarPago = async () => {
    if (!pagoDraft.patientId || !pagoDraft.grupoKey) { alert('Selecciona paciente y tratamiento.'); return; }
    const monto = parseFloat(pagoDraft.monto);
    if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }

    const grupo = facturasAgrupadas.find(g => g.key === pagoDraft.grupoKey);
    if (!grupo) { alert('No se encontró el tratamiento seleccionado.'); return; }

    setSavingPago(true);

    // Reparte el monto entre las piezas del grupo (la más antigua primero) hasta agotarlo
    let restante = monto;
    const cambiosPorId = new Map();
    grupo.items.forEach(item => {
      if (restante <= 0) return;
      const saldo = item.cost - item.paid;
      if (saldo <= 0) return;
      const abono = Math.min(restante, saldo);
      restante -= abono;
      const nuevoPaid = item.paid + abono;
      cambiosPorId.set(item.id, {
        paid: nuevoPaid,
        status: nuevoPaid >= item.cost ? 'completado' : (item.status === 'pendiente' ? 'en_curso' : item.status),
      });
    });

    const itemsDelPaciente = facturas.filter(f => String(f.patient_id) === String(pagoDraft.patientId));
    const planActualizado = itemsDelPaciente.map(f => {
      const rest = { ...f };
      delete rest.patient_id;
      const cambio = cambiosPorId.get(rest.id);
      if (!cambio) return rest;
      return { ...rest, ...cambio, metodo: pagoDraft.metodo, referencia: pagoDraft.referencia || rest.referencia || '' };
    });

    const { error } = await supabase.from('historias').upsert({ patient_id: pagoDraft.patientId, clinica_id: clinicaId, plan_tratamiento: planActualizado }, { onConflict: 'patient_id' });
    setSavingPago(false);
    if (error) { alert('Error al registrar el pago: ' + error.message); return; }

    setFacturas(prev => prev.map(f => {
      if (String(f.patient_id) !== String(pagoDraft.patientId)) return f;
      const actualizado = planActualizado.find(x => String(x.id) === String(f.id));
      return actualizado ? { ...actualizado, patient_id: f.patient_id } : f;
    }));
    setPagoDraft(PAGO_VACIO);
    alert('Pago registrado correctamente.');
  };

  const registrarGasto = async () => {
    const monto = parseFloat(gastoDraft.monto);
    if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }

    setSavingGasto(true);
    const { data, error } = await supabase.from('gastos').insert([{
      categoria: gastoDraft.categoria, monto, fecha: gastoDraft.fecha, nota: gastoDraft.nota.trim() || null,
      clinica_id: clinicaId,
    }]).select();
    setSavingGasto(false);

    if (error) { alert('Error al registrar el gasto: ' + error.message); return; }
    setGastos(prev => [data[0], ...prev]);
    setShowGastoModal(false);
    setGastoDraft(GASTO_VACIO);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>Cargando finanzas…</div>;

  if (errorMsg) {
    return <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 13.5 }}>Error al cargar finanzas: {errorMsg}</div>;
  }

  const total = facturas.reduce((s, i) => s + (i.cost || 0), 0);
  const cobrado = facturas.reduce((s, i) => s + (i.paid || 0), 0);
  const pendiente = total - cobrado;

  const hoy = new Date();
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const ingresosMesActual = facturas.reduce((s, i) => mismoMes(parseFecha(i.date), hoy) ? s + (i.cost || 0) : s, 0);
  const ingresosMesAnterior = facturas.reduce((s, i) => mismoMes(parseFecha(i.date), mesAnterior) ? s + (i.cost || 0) : s, 0);
  const variacionMes = ingresosMesAnterior > 0 ? Math.round(((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100) : null;

  const gastosDelMes = gastos.filter(g => mismoMes(parseFecha(g.fecha), hoy));
  const gastosPorCategoria = CATEGORIAS_GASTO.map(cat => ({
    cat, monto: gastosDelMes.filter(g => g.categoria === cat).reduce((s, g) => s + (g.monto || 0), 0),
  }));
  const totalGastosMes = gastosDelMes.reduce((s, g) => s + (g.monto || 0), 0);

  // Agrupa por paciente + fecha + tratamiento: varias piezas del mismo tratamiento
  // en la misma fecha aparecen como una sola fila (ej. "Resina compuesta, piezas 12, 14, 15")
  const grupos = new Map();
  facturas.forEach(f => {
    const key = `${f.patient_id}|${f.date}|${f.name}`;
    if (!grupos.has(key)) {
      grupos.set(key, { key, patient_id: f.patient_id, date: f.date, name: f.name, teeth: [], cost: 0, paid: 0, items: [], metodos: new Set() });
    }
    const g = grupos.get(key);
    if (f.tooth && f.tooth !== '—') g.teeth.push(f.tooth);
    g.cost += f.cost || 0;
    g.paid += f.paid || 0;
    g.items.push(f);
    if (f.metodo) g.metodos.add(f.metodo);
  });
  const facturasAgrupadas = Array.from(grupos.values())
    .map(g => ({
      ...g,
      toothLabel: g.teeth.length > 0 ? g.teeth.join(', ') : '—',
      metodo: g.metodos.size === 1 ? [...g.metodos][0] : (g.metodos.size > 1 ? 'Mixto' : null),
      status: g.items.every(i => i.status === 'completado') ? 'completado' : (g.items.some(i => i.status === 'pendiente') ? 'pendiente' : 'en_curso'),
      // El comprobante se guarda por ítem (un mismo documento puede cubrir
      // varias piezas emitidas juntas); alcanza con el del primero que lo tenga.
      comprobante: g.items.find(i => i.comprobante)?.comprobante || null,
    }))
    .sort((a, b) => nombrePaciente(a.patient_id).localeCompare(nombrePaciente(b.patient_id)) || String(b.date).localeCompare(String(a.date)));

  const gruposDelPacienteSeleccionado = facturasAgrupadas.filter(g => String(g.patient_id) === String(pagoDraft.patientId) && (g.cost - g.paid) > 0);

  // Una fila por paciente en vez de una por tratamiento -- el detalle por
  // tratamiento se ve al desplegar. Antes cada tratamiento de un mismo
  // paciente ensuciaba la tabla con una fila propia.
  const facturasPorPacienteMap = new Map();
  facturasAgrupadas.forEach(g => {
    if (!facturasPorPacienteMap.has(g.patient_id)) {
      facturasPorPacienteMap.set(g.patient_id, { patient_id: g.patient_id, grupos: [], cost: 0, paid: 0 });
    }
    const p = facturasPorPacienteMap.get(g.patient_id);
    p.grupos.push(g);
    p.cost += g.cost;
    p.paid += g.paid;
  });
  const facturasPorPaciente = Array.from(facturasPorPacienteMap.values())
    .map(p => ({
      ...p,
      saldo: p.cost - p.paid,
      estado: p.grupos.every(g => g.status === 'completado') ? 'completado' : (p.grupos.some(g => g.status === 'pendiente') ? 'pendiente' : 'en_curso'),
      comprobantesEmitidos: p.grupos.filter(g => g.comprobante).length,
    }))
    .sort((a, b) => nombrePaciente(a.patient_id).localeCompare(nombrePaciente(b.patient_id)));

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat label="Total facturado" value={`S/${total.toLocaleString()}`} icon={<Icon name="document" size={15} />} />
        <Stat label="Cobrado" value={`S/${cobrado.toLocaleString()}`} col={WA} icon={<Icon name="checkCircle" size={15} />} sub={pendiente === 0 && total > 0 ? 'Al día' : undefined} />
        <Stat label="Pendiente" value={`S/${pendiente.toLocaleString()}`} col={pendiente > 0 ? RJ : WA} icon={<Icon name="clock" size={15} />} />
        <Stat label="Ingresos del mes" value={`S/${ingresosMesActual.toLocaleString()}`} col={P} icon={<Icon name="trendingUp" size={15} />}
          sub={variacionMes === null ? undefined : `${variacionMes >= 0 ? '↑' : '↓'} ${Math.abs(variacionMes)}% vs anterior`} />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {['facturas', 'pagos', 'gastos'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', minHeight: 36, borderRadius: '10px', border: `1px solid ${tab === t ? P : BD}`, fontSize: 13, cursor: 'pointer', fontWeight: tab === t ? 600 : 500, background: tab === t ? P : LT, color: tab === t ? '#fff' : MU, textTransform: 'capitalize', transition: TRANSICION }}>{t}</button>
        ))}
      </div>

      {tab === 'facturas' && (
        facturas.length === 0 ? (
          <div style={{ background: LT, border: `1px dashed ${BD}`, borderRadius: '14px', padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>
            Aún no hay tratamientos facturados. Se agregan desde la pestaña "Plan trat." de cada paciente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {facturasPorPaciente.map(p => {
              const abierto = expandidosPacientes.has(p.patient_id);
              const b = sc(p.estado);
              return (
                <div key={p.patient_id} style={{ background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', overflow: 'hidden', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW }}>
                  <div onClick={() => toggleExpandido(p.patient_id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', minHeight: 44, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MU} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .15s cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: DN }}>{nombrePaciente(p.patient_id)}</div>
                      <div style={{ fontSize: 12, color: MU, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                        {p.grupos.length} tratamiento{p.grupos.length !== 1 ? 's' : ''} · {docPaciente(p.patient_id) ? `DNI ${docPaciente(p.patient_id)}` : 'sin DNI registrado'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: '#8A8A96' }}>Total</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: DN, fontVariantNumeric: 'tabular-nums' }}>S/{p.cost.toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: '#8A8A96' }}>Saldo</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: p.saldo > 0 ? RJ : WA, fontVariantNumeric: 'tabular-nums' }}>S/{p.saldo.toLocaleString()}</div>
                    </div>
                    <Badge bg={b.bg} color={b.c} style={{ fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: '10px', flexShrink: 0 }}>{p.estado}</Badge>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); abrirEmitir(p.patient_id, p.grupos); }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 36, background: LT, border: `1px solid ${BD}`, borderRadius: '10px', padding: '8px 14px', fontSize: 13, fontWeight: 600, color: P, cursor: 'pointer', whiteSpace: 'nowrap', transition: TRANSICION }}
                      >
                        <Icon name="document" size={13} /> Emitir comprobante
                      </button>
                      {p.comprobantesEmitidos > 0 && (
                        <span style={{ fontSize: 11, color: WA, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{p.comprobantesEmitidos}/{p.grupos.length} emitidos</span>
                      )}
                    </div>
                  </div>

                  {abierto && (
                    <div style={{ borderTop: `1px solid ${BD}`, overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr style={{ background: '#F1F1F7' }}>
                          {['Fecha', 'Tratamiento', 'Piezas', 'Método', 'Total', 'Cobrado', 'Estado', ''].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: MU, fontWeight: 600, fontSize: 12, borderBottom: `1px solid ${BD}`, whiteSpace: 'nowrap' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {p.grupos.map(g => {
                            const bg = sc(g.status); const saldoG = g.cost - g.paid;
                            return (
                              <tr key={g.key} style={{ borderBottom: `1px solid ${BD}` }}>
                                <td style={{ padding: '11px 12px', color: MU, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatFecha(g.date)}</td>
                                <td style={{ padding: '11px 12px', color: DN }}>{g.name}{g.items.length > 1 ? ` (x${g.items.length})` : ''}</td>
                                <td style={{ padding: '11px 12px', color: MU, fontVariantNumeric: 'tabular-nums' }}>{g.toothLabel}</td>
                                <td style={{ padding: '11px 12px', color: MU }}>{g.metodo || '—'}</td>
                                <td style={{ padding: '11px 12px', color: DN, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>S/{g.cost}</td>
                                <td style={{ padding: '11px 12px', color: g.paid < g.cost ? GL : WA, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>S/{g.paid}</td>
                                <td style={{ padding: '11px 12px' }}><Badge bg={bg.bg} color={bg.c} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: '10px' }}>{g.status}</Badge></td>
                                <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                                  {saldoG > 0 && <span onClick={() => irAPagar(g)} style={{ fontSize: 13, color: P, cursor: 'pointer', fontWeight: 600, marginRight: 14 }}>registrar pago →</span>}
                                  {g.comprobante ? (
                                    <span onClick={() => abrirEmitir(p.patient_id, [g])} style={{ fontSize: 13, color: WA, cursor: 'pointer', fontWeight: 600, marginRight: g.comprobante.archivo ? 12 : 0 }}>
                                      {g.comprobante.tipo === 'rxh' ? 'RxH' : 'Boleta'}{(g.comprobante.serie || g.comprobante.numero) ? ` ${g.comprobante.serie}${g.comprobante.numero ? '-' + g.comprobante.numero : ''}` : ' guardada'}
                                    </span>
                                  ) : (
                                    <span onClick={() => abrirEmitir(p.patient_id, [g])} style={{ fontSize: 13, color: MU, cursor: 'pointer', fontWeight: 600, marginRight: g.comprobante?.archivo ? 12 : 0 }}>emitir →</span>
                                  )}
                                  {g.comprobante?.archivo && (
                                    <span onClick={() => verComprobante(g.comprobante.archivo)} style={{ fontSize: 13, color: P, cursor: 'pointer', fontWeight: 600 }}>ver</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'pagos' && (
        <div style={{ background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', padding: 18, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: DN, marginBottom: 14 }}>Registrar nuevo pago</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 560 }}>
            <div>
              <label style={LABEL_CAMPO}>Paciente</label>
              <select value={pagoDraft.patientId} onChange={e => setPagoDraft({ ...pagoDraft, patientId: e.target.value, grupoKey: '' })}
                style={INPUT_CAMPO}>
                <option value="">Selecciona un paciente…</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_CAMPO}>Tratamiento con saldo pendiente</label>
              <select value={pagoDraft.grupoKey} onChange={e => setPagoDraft({ ...pagoDraft, grupoKey: e.target.value })} disabled={!pagoDraft.patientId}
                style={INPUT_CAMPO}>
                <option value="">Selecciona…</option>
                {gruposDelPacienteSeleccionado.map(g => (
                  <option key={g.key} value={g.key}>
                    {g.name}{g.items.length > 1 ? ` (piezas ${g.toothLabel})` : (g.toothLabel !== '—' ? ` (Pieza ${g.toothLabel})` : '')} — Saldo S/{(g.cost - g.paid).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_CAMPO}>Monto (S/)</label>
              <input type="number" min="0" step="0.01" value={pagoDraft.monto} onChange={e => setPagoDraft({ ...pagoDraft, monto: e.target.value })}
                style={{ ...INPUT_CAMPO, fontVariantNumeric: 'tabular-nums' }} />
            </div>
            <div>
              <label style={LABEL_CAMPO}>Método de pago</label>
              <select value={pagoDraft.metodo} onChange={e => setPagoDraft({ ...pagoDraft, metodo: e.target.value })}
                style={INPUT_CAMPO}>
                {METODOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL_CAMPO}>Referencia / N° operación</label>
              <input value={pagoDraft.referencia} onChange={e => setPagoDraft({ ...pagoDraft, referencia: e.target.value })}
                style={{ ...INPUT_CAMPO, fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>
          <Button onClick={registrarPago} disabled={savingPago} style={{ marginTop: 16, padding: '10px 22px', minHeight: 44, fontSize: 15, borderRadius: '10px' }}>
            {savingPago ? 'Registrando...' : 'Registrar pago'}
          </Button>
        </div>
      )}

      {tab === 'gastos' && (
        <div style={{ background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', padding: 18, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: DN }}>Gastos del consultorio</div>
            <div style={{ fontSize: 13, color: MU, fontVariantNumeric: 'tabular-nums' }}>Total del mes: <b style={{ color: DN, fontWeight: 600 }}>S/{totalGastosMes.toLocaleString()}</b></div>
          </div>

          {errorGastos ? (
            <div style={{ fontSize: 13, color: RJ, marginBottom: 14 }}>
              No se pudo cargar la tabla de gastos: {errorGastos}. La tabla "gastos" todavía no existe en Supabase.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 18 }}>
                {gastosPorCategoria.map(({ cat, monto }) => (
                  <div key={cat} style={{ background: '#F1F1F7', border: `1px solid ${BD}`, borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, color: MU, marginBottom: 4 }}>{cat}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: DN, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>S/{monto.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#8A8A96', marginTop: 2 }}>Este mes</div>
                  </div>
                ))}
              </div>

              {gastos.length > 0 && (
                <div style={{ marginBottom: 18, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#F1F1F7' }}>
                      {['Categoría', 'Monto', 'Fecha', 'Nota'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: MU, fontWeight: 600, fontSize: 12, borderBottom: `1px solid ${BD}` }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {gastos.slice(0, 12).map(g => (
                        <tr key={g.id} style={{ borderBottom: `1px solid ${BD}` }}>
                          <td style={{ padding: '11px 12px', color: DN }}>{g.categoria}</td>
                          <td style={{ padding: '11px 12px', color: DN, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>S/{g.monto}</td>
                          <td style={{ padding: '11px 12px', color: MU, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{g.fecha}</td>
                          <td style={{ padding: '11px 12px', color: MU }}>{g.nota || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button onClick={() => setShowGastoModal(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, padding: '8px 16px', fontSize: 15, borderRadius: '10px' }}>
                <Icon name="plus" size={14} /> Registrar gasto
              </Button>
            </>
          )}
        </div>
      )}

      {showGastoModal && (
        <Modal cardStyle={{ padding: 24, width: 380, boxShadow: '0 2px 4px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 18, color: DN, fontSize: 17, fontWeight: 600 }}>Registrar gasto</h3>

          <div style={{ marginBottom: 14 }}>
            <label style={LABEL_MODAL}>Categoría</label>
            <select value={gastoDraft.categoria} onChange={e => setGastoDraft({ ...gastoDraft, categoria: e.target.value })}
              style={INPUT_MODAL}>
              {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={LABEL_MODAL}>Monto (S/)</label>
              <input type="number" min="0" step="0.01" value={gastoDraft.monto} onChange={e => setGastoDraft({ ...gastoDraft, monto: e.target.value })}
                style={{ ...INPUT_MODAL, fontVariantNumeric: 'tabular-nums' }} />
            </div>
            <div>
              <label style={LABEL_MODAL}>Fecha</label>
              <input type="date" value={gastoDraft.fecha} onChange={e => setGastoDraft({ ...gastoDraft, fecha: e.target.value })}
                style={{ ...INPUT_MODAL, fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={LABEL_MODAL}>Nota (opcional)</label>
            <input value={gastoDraft.nota} onChange={e => setGastoDraft({ ...gastoDraft, nota: e.target.value })} placeholder="Ej: Compra de guantes y algodón"
              style={INPUT_MODAL} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setShowGastoModal(false)} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15, borderRadius: '10px' }}>Cancelar</Button>
            <Button onClick={registrarGasto} disabled={savingGasto} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15, borderRadius: '10px' }}>
              {savingGasto ? 'Guardando...' : 'Registrar gasto'}
            </Button>
          </div>
        </Modal>
      )}

      {emitirDraft && (
        <Modal cardStyle={{ padding: 0, width: 460, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: DN }}>Emitir comprobante</div>
              <div style={{ fontSize: 13, color: MU, marginTop: 3 }}>{nombrePaciente(emitirDraft.patientId)}</div>
            </div>
            <button onClick={() => setEmitirDraft(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MU, fontSize: 22, lineHeight: 1, width: 36, height: 36, minHeight: 36, borderRadius: '10px', flexShrink: 0, transition: TRANSICION }}>×</button>
          </div>

          <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={LABEL_CAMPO}>Tipo de comprobante</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['boleta', 'Boleta / Factura'], ['rxh', 'Recibo por Honorarios']].map(([id, lbl]) => (
                  <button key={id} onClick={() => setEmitirDraft(d => ({ ...d, tipo: id }))}
                    style={{ flex: 1, padding: '10px 12px', minHeight: 36, borderRadius: '10px', border: `1px solid ${emitirDraft.tipo === id ? P : BD}`, background: emitirDraft.tipo === id ? P : LT, color: emitirDraft.tipo === id ? '#fff' : DN, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: TRANSICION }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={LABEL_CAMPO}>Incluye</label>
              <div style={{ background: '#F1F1F7', border: `1px solid ${BD}`, borderRadius: '10px', padding: '10px 12px', fontSize: 13, color: DN }}>
                {emitirDraft.grupos.map(g => (
                  <div key={g.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0' }}>
                    <span>{g.name}{g.toothLabel !== '—' ? ` (${g.toothLabel})` : ''}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>S/{g.cost}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={LABEL_CAMPO}>DNI del paciente</label>
                <div style={{ ...INPUT_CAMPO, display: 'flex', alignItems: 'center', color: docPaciente(emitirDraft.patientId) ? DN : RJ, background: '#F1F1F7', fontVariantNumeric: 'tabular-nums' }}>
                  {docPaciente(emitirDraft.patientId) || 'Sin DNI en Historial'}
                </div>
              </div>
              <div>
                <label style={LABEL_CAMPO}>Monto (S/)</label>
                <input type="number" min="0" step="0.01" value={emitirDraft.monto} onChange={e => setEmitirDraft(d => ({ ...d, monto: e.target.value }))}
                  style={{ ...INPUT_CAMPO, fontVariantNumeric: 'tabular-nums' }} />
              </div>
            </div>

            <div style={{ background: 'rgba(123, 92, 250, 0.12)', border: `1px solid color-mix(in srgb, ${P} 24%, transparent)`, borderRadius: '10px', padding: '12px 14px', fontSize: 12, color: DN, marginBottom: 18, lineHeight: 1.5 }}>
              {GUIA_SOL[emitirDraft.tipo]} La ruta exacta del menú puede variar según cómo esté configurado tu RUC en SUNAT; si no la encuentras igual, usa el buscador dentro de SOL.
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
              <Button variant="secondary" onClick={() => copiarDatos(textoParaCopiar(emitirDraft))} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15, borderRadius: '10px' }}>
                {copiado ? '✓ Copiado' : 'Copiar datos'}
              </Button>
              <Button onClick={() => window.open(SOL_LOGIN_URL, '_blank', 'noopener')} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15, borderRadius: '10px' }}>
                Abrir SUNAT SOL ↗
              </Button>
            </div>

            <div style={{ borderTop: `1px solid ${BD}`, paddingTop: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: DN, marginBottom: 5 }}>Ya lo emitiste en SUNAT? Guárdalo aquí</div>
              <div style={{ fontSize: 13, color: MU, marginBottom: 14, lineHeight: 1.45 }}>Queda asociado a este tratamiento, para tener el registro sin volver a entrar a SOL.</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={LABEL_CAMPO}>Serie</label>
                  <input placeholder="E001" value={emitirDraft.serie} onChange={e => setEmitirDraft(d => ({ ...d, serie: e.target.value }))}
                    style={{ ...INPUT_CAMPO, fontVariantNumeric: 'tabular-nums' }} />
                </div>
                <div>
                  <label style={LABEL_CAMPO}>Número</label>
                  <input placeholder="749" value={emitirDraft.numero} onChange={e => setEmitirDraft(d => ({ ...d, numero: e.target.value }))}
                    style={{ ...INPUT_CAMPO, fontVariantNumeric: 'tabular-nums' }} />
                </div>
                <div>
                  <label style={LABEL_CAMPO}>Fecha</label>
                  <input type="date" value={emitirDraft.fecha} onChange={e => setEmitirDraft(d => ({ ...d, fecha: e.target.value }))}
                    style={{ ...INPUT_CAMPO, padding: '9px 8px', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }} />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={LABEL_CAMPO}>Adjuntar comprobante (PDF o imagen, opcional)</label>
                {emitirDraft.archivoExistente && !emitirDraft.archivoFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: WA }}>
                    <Icon name="document" size={14} /> Ya hay un archivo guardado
                    <span onClick={() => verComprobante(emitirDraft.archivoExistente)} style={{ color: P, cursor: 'pointer', fontWeight: 600 }}>ver</span>
                  </div>
                )}
                <input type="file" accept="application/pdf,image/*" onChange={e => setEmitirDraft(d => ({ ...d, archivoFile: e.target.files?.[0] || null }))}
                  style={{ fontSize: 13, color: MU }} />
              </div>

              <Button onClick={guardarComprobante} disabled={savingComprobante} style={{ width: '100%', padding: 10, minHeight: 44, fontSize: 15, borderRadius: '10px', background: WA }}>
                {savingComprobante ? 'Guardando...' : 'Guardar comprobante'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
