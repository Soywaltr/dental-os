// src/components/vistas/Ortodoncia.jsx
// Sección propia de Ortodoncia (antes vivía como una pestaña más dentro de
// Historia.jsx). Tiene su propio directorio de pacientes -- solo los que
// tienen un tratamiento de ortodoncia iniciado (una fila en la tabla
// `ortodoncia`) -- y un botón para iniciar el tratamiento de un paciente
// nuevo. El detalle por paciente reusa exactamente los mismos sub-tabs que
// ya existían (Examen clínico, Plan de Trabajo, Plan de tratamiento,
// Resumen, Fotografías) y suma "Controles Mensuales": un registro fecha a
// fecha del progreso, con fotos, y un comparador antes/después interactivo.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import Stat from '../ui/Stat';
import {
  labelStyleDoc, inputStyleDoc, P, BD, DN, MU, LT, MT, WA, RJ, GL,
  GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW
} from '../../utils/constants';
import { ini, normalizarTexto, resumenPagosOrtodoncia } from '../../utils/helpers';
import useResponsive from '../../utils/useResponsive';
import { BUCKET, rutaFotoOrto, rutaDesdeUrl, firmar, firmarVarias, invalidarFirma } from '../../utils/storage';
import { generarMiniatura, rutaMiniatura } from '../../utils/imagen';

// Mismos métodos de pago que usa Caja.jsx, para que el historial sea coherente
// entre la caja general y los pagos de ortodoncia.
const METODOS_PAGO = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'];

// Capa visual: los estilos compartidos de constants.js todavía traen los hex
// viejos, así que acá se re-visten con los tokens del tema (modo oscuro gratis)
// sin tocar el resto de la app que los importa.
const EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

const etiquetaDoc = { ...labelStyleDoc, fontSize: 12, fontWeight: 600, color: MU, marginBottom: 6 };

const campoDoc = {
  ...inputStyleDoc,
  border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)',
  fontSize: 13.5, color: DN, background: LT, height: '38px',
  // Fechas, montos y cuotas viven en estos campos: cifras de ancho fijo.
  fontVariantNumeric: 'tabular-nums',
  transition: `border-color 150ms ${EASE}`,
};

// Casilleros de Fotografías, agrupados por tipo de registro. Todos escriben en
// las mismas claves de `ortodoncia.fotografias`, así que agregar un grupo no
// migra nada: los casilleros nuevos simplemente aparecen vacíos.
const CLAVE_FOTO_PERFIL = 'Foto de perfil';

const ORTO_GRUPOS_FOTOS = [
  {
    titulo: 'Radiografías',
    cajas: [
      { key: 'Rx Panorámica', icon: 'scan', accept: 'image/*' },
      { key: 'Rx Cefalométrica', icon: 'scan', accept: 'image/*' },
      { key: 'Rx Periapical', icon: 'scan', accept: 'image/*' },
    ],
  },
  {
    titulo: 'Fotos intraorales',
    cajas: [
      { key: 'Foto frontal', icon: 'tooth', accept: 'image/*' },
      { key: 'Foto lateral izquierda', icon: 'tooth', accept: 'image/*' },
      { key: 'Foto lateral derecha', icon: 'tooth', accept: 'image/*' },
      { key: 'Foto oclusal superior', icon: 'tooth', accept: 'image/*' },
      { key: 'Foto oclusal inferior', icon: 'tooth', accept: 'image/*' },
    ],
  },
  {
    titulo: 'Fotos de estudio (extraorales)',
    cajas: [
      { key: CLAVE_FOTO_PERFIL, icon: 'user', accept: 'image/*', nota: 'Es la foto que se ve en la ficha del paciente' },
      { key: 'Frontal en reposo', icon: 'user', accept: 'image/*' },
      { key: 'Frontal sonriendo', icon: 'user', accept: 'image/*' },
      { key: 'Perfil derecho', icon: 'user', accept: 'image/*' },
      { key: 'Perfil izquierdo', icon: 'user', accept: 'image/*' },
      { key: 'Tres cuartos derecho', icon: 'user', accept: 'image/*' },
      { key: 'Tres cuartos izquierdo', icon: 'user', accept: 'image/*' },
      { key: 'Sonrisa de cerca', icon: 'user', accept: 'image/*' },
    ],
  },
  {
    titulo: 'Otros documentos',
    cajas: [
      { key: 'Modelo inicial', icon: 'cube', accept: 'image/*' },
      { key: 'Plan de tratamiento', icon: 'document', accept: '.pdf,.ppt,.pptx,image/*' },
    ],
  },
];

// La foto de la ficha: la elegida a mano si existe, y si no la mejor extraoral
// disponible antes de caer a las iniciales.
const ORDEN_FOTO_FICHA = [CLAVE_FOTO_PERFIL, 'Frontal sonriendo', 'Frontal en reposo', 'Tres cuartos derecho'];

const fotoFicha = (fotografias) =>
  ORDEN_FOTO_FICHA.map(clave => fotografias?.[clave]).find(f => f?.url) || null;

const hoyISO = () => new Date().toISOString().slice(0, 10);
const fmtFecha = (s) => { if (!s) return '—'; const d = new Date(`${s}T00:00:00`); return isNaN(d.getTime()) ? s : d.toLocaleDateString('es-PE'); };
const fmtSoles = (n) => `S/${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mismoMesQueHoy = (s) => {
  if (!s) return false;
  const d = new Date(`${s}T00:00:00`);
  const hoy = new Date();
  return !isNaN(d.getTime()) && d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth();
};

// Funciones y no constantes: la app queda abierta días enteros, y una fecha
// congelada al cargar el módulo terminaría ofreciendo el día de ayer.
const controlVacio = () => ({ fecha: hoyISO(), procedimiento: '', observaciones: '', proxima_cita: '' });
const abonoVacio = () => ({ fecha: hoyISO(), monto: '', metodo: 'Efectivo', concepto: '', tipo: 'cuota' });
const PAGOS_VACIO = { pago_inicial: '', cuota_mensual: '', abonos: [] };

const TIPOS_ABONO = [
  { id: 'inicial', lbl: 'Cuota inicial', corto: 'Inicial', bg: 'var(--accent-soft)', color: P },
  { id: 'cuota', lbl: 'Cuota mensual', corto: 'Cuota', bg: 'var(--fill-tertiary)', color: MU },
  { id: 'extra', lbl: 'Extra / adicional', corto: 'Extra', bg: 'var(--amber-soft)', color: GL },
];
const tipoAbono = (id) => TIPOS_ABONO.find(t => t.id === id) || TIPOS_ABONO[1];

const resumenPagos = resumenPagosOrtodoncia;

// ─── COMPARADOR DESLIZANTE (antes/después con fotos reales del paciente) ─────
// Arrastra el separador para revelar "después" sobre "antes" -- ambas son
// fotos reales del paciente (no hay nada generado acá), solo una forma más
// interactiva de mostrar el mismo par de fotos que ya se ve en la grilla.
function ComparadorDeslizante({ antes, despues, labelAntes = 'Antes', labelDespues = 'Después' }) {
  const [pos, setPos] = useState(50);
  // En el modal de comparación hay hasta 5 de estas, una por ángulo, apiladas
  // con scroll. Sin techo, la proporción 4:3 al 100% del ancho hacía que cada
  // una ocupara ~735px de alto en un iPad -- casi la pantalla completa para una
  // sola foto. El techo por vh la mantiene dentro de una sola pantalla.
  const { isTablet } = useResponsive();

  const mover = (clientX, rect) => {
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const clientXDe = (ev) => ev.touches?.[0]?.clientX ?? ev.clientX;
    mover(clientXDe(e), rect);
    const onMove = (ev) => mover(clientXDe(ev), rect);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!antes || !despues) return null;

  return (
    // object-fit: contain (no "cover"): "cover" recorta la foto para llenar la
    // caja -- en un teléfono la mayoría de fotos clínicas son verticales, así
    // que dentro de una caja 4:3 horizontal "cover" recortaba buena parte de la
    // imagen (se veía "acercada"/incompleta). "contain" muestra la foto entera,
    // con una franja negra a los lados si la proporción no calza -- el fondo ya
    // es negro, así que esa franja es invisible.
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', maxHeight: isTablet ? '46vh' : '62vh', borderRadius: 'var(--radius-md)', overflow: 'hidden', userSelect: 'none', background: '#000', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
      <img src={despues} alt={labelDespues} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={antes} alt={labelAntes} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div
        onPointerDown={onPointerDown}
        style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 0, cursor: 'ew-resize', touchAction: 'none' }}
      >
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: -1, width: 3, background: '#fff', boxShadow: '0 0 8px rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, transform: 'translate(-50%, -50%)', width: 38, height: 38, borderRadius: '50%', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0087b3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 3 12 9 6" /><polyline points="15 18 21 12 15 6" /></svg>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 'var(--radius-lg)', pointerEvents: 'none' }}>{labelAntes}</div>
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 'var(--radius-lg)', pointerEvents: 'none' }}>{labelDespues}</div>
    </div>
  );
}

// ─── CASILLA DE FOTO (una posición fija -- ej. "Frontal" -- dentro de la
// columna de un hito, en la grilla de Progreso del Tratamiento) ──────────────
function CasillaFotoProgreso({ fila, foto, subiendo, onUpload, onDelete }) {
  const hasFile = !!foto;
  return (
    <div style={{ borderTop: `1px solid ${BD}` }}>
      <div style={{ height: 74, background: hasFile ? '#000' : 'var(--surface-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {hasFile && (
          <>
            <a href={foto.urlFirmada} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
              <img src={foto.miniFirmada || foto.urlFirmada} alt={fila} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </a>
            <button onClick={onDelete} title="Eliminar" style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </>
        )}
        {!hasFile && !subiendo && <Icon name="camera" size={20} color="var(--label-quaternary)" />}
        {subiendo && <span style={{ fontSize: 11, color: P, fontWeight: 600 }}>Subiendo...</span>}
        {!hasFile && (
          <label style={{ position: 'absolute', inset: 0, cursor: subiendo ? 'not-allowed' : 'pointer' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
          </label>
        )}
      </div>
      <div style={{ padding: '6px 8px', fontSize: 11, color: hasFile ? P : MU, fontWeight: 600, textAlign: 'center', background: hasFile ? 'var(--accent-soft)' : LT }}>
        {fila}
      </div>
    </div>
  );
}

// ─── MODAL DE COMPARACIÓN (Inicio vs un hito, ángulo por ángulo) ─────────────
function ModalComparacionProgreso({ hito, inicio, comparado, filas, onClose }) {
  return (
    <Modal background="rgba(15,23,42,0.75)" overlayStyle={{ padding: 20, zIndex: 1100 }}
      cardStyle={{ background: '#0f172a', border: 'none', borderRadius: 'var(--radius-lg)', width: '95%', maxWidth: 1100, maxHeight: '94dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>Inicio vs {hito}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 24, lineHeight: 1, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
      <div style={{ padding: 22, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {filas.map(fila => {
          const fotoA = inicio?.fotos?.[fila]?.urlFirmada;
          const fotoB = comparado?.fotos?.[fila]?.urlFirmada;
          return (
            <div key={fila}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>{fila}</div>
              {fotoA && fotoB ? (
                <ComparadorDeslizante antes={fotoA} despues={fotoB} labelAntes="Inicio" labelDespues={hito} />
              ) : (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', padding: '22px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                  Falta la foto de "{!fotoA ? 'Inicio' : hito}" en "{fila}" para poder comparar.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── DETALLE DE ORTODONCIA (un paciente ya en tratamiento) ───────────────────
function OrtodonciaDetalle({ patient, clinicaId, onPacienteActualizado }) {
  const { isTablet } = useResponsive();
 // --- ESTADOS DE ORTODONCIA ---
  const [subTabOrto, setSubTabOrto] = useState('examen');
  
  // Datos
  const [ortoForm, setOrtoForm] = useState({});
  const [planTrabajoForm, setPlanTrabajoForm] = useState({});
  const [planTrataForm, setPlanTrataForm] = useState({});
  const [resumenForm, setResumenForm] = useState({});
  const [fotosOrto, setFotosOrto] = useState({});
  // Igual que imagenesFirmadas: mismas claves, con la URL firmada añadida.
  const [fotosOrtoFirmadas, setFotosOrtoFirmadas] = useState({});

  useEffect(() => {
    let vivo = true;
    const resolver = async () => {
      const datos = Object.entries(fotosOrto || {});
      // Una sola petición para todas las fotos (original + miniatura) en vez de
      // una por cada una: es la diferencia entre ~20 viajes y uno.
      const firmas = await firmarVarias(datos.flatMap(([, d]) => [d.url, d.thumb]));
      if (!vivo) return;
      setFotosOrtoFirmadas(Object.fromEntries(datos.map(([clave, dato]) => [clave, {
        ...dato,
        urlFirmada: firmas.get(rutaDesdeUrl(dato.url)) || null,
        // La grilla usa la miniatura; al abrir la foto se va a la original.
        miniFirmada: (dato.thumb && firmas.get(dato.thumb)) || firmas.get(rutaDesdeUrl(dato.url)) || null,
      }])));
    };
    resolver();
    return () => { vivo = false; };
  }, [fotosOrto]);

  // Seguros (Bloqueos de pantalla)
  const [isEditingOrtoExamen, setIsEditingOrtoExamen] = useState(false);
  const [isEditingOrtoTrabajo, setIsEditingOrtoTrabajo] = useState(false);
  const [isEditingOrtoTrata, setIsEditingOrtoTrata] = useState(false);
  const [isEditingOrtoResumen, setIsEditingOrtoResumen] = useState(false);
  const [isEditingOrtoFotos, setIsEditingOrtoFotos] = useState(false);

  // Loaders
  const [savingOrto, setSavingOrto] = useState(false);
  const [savingTrabajo, setSavingTrabajo] = useState(false);
  const [savingTrata, setSavingTrata] = useState(false);
  const [savingResumen, setSavingResumen] = useState(false);
  const [savingFotosOrto, setSavingFotosOrto] = useState(false);

  // Manejadores de cambios
  const handleOrto = (campo, valor) => setOrtoForm(prev => ({ ...prev, [campo]: valor }));
  const handlePlanTrabajo = (campo, valor) => setPlanTrabajoForm(prev => ({ ...prev, [campo]: valor }));
  const handlePlanTrata = (campo, valor) => setPlanTrataForm(prev => ({ ...prev, [campo]: valor }));
  const handleResumen = (campo, valor) => setResumenForm(prev => ({ ...prev, [campo]: valor }));

  // FUNCIÓN MAESTRA DE GUARDADO (Corregida para bases de datos sin restricción UNIQUE)
  const genericSaveOrto = async (columnaBaseDatos, datosFormulario, setLoader, setLockState, nombreSeccion) => {
    setLoader(true);
    try {
      // 1. Verificamos si ya existe un registro de ortodoncia para este paciente
      const { data: existe, error: fetchError } = await supabase
        .from('ortodoncia')
        .select('id')
        .eq('paciente_id', patient.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let errorGuardado;

      if (existe) {
        // 2. Si existe, actualizamos usando el ID real de la fila
        const { error } = await supabase
          .from('ortodoncia')
          .update({ [columnaBaseDatos]: datosFormulario })
          .eq('id', existe.id);
        errorGuardado = error;
      } else {
        // 3. Si no existe, insertamos un registro completamente nuevo
        const { error } = await supabase
          .from('ortodoncia')
          .insert([{ paciente_id: patient.id, clinica_id: clinicaId, [columnaBaseDatos]: datosFormulario }]);
        errorGuardado = error;
      }

      if (errorGuardado) throw errorGuardado;
      
      alert(`✅ ${nombreSeccion} guardado correctamente.`);
      setLockState(false); // Bloquea la pantalla al terminar con éxito
    } catch (err) {
      alert(`Error al guardar en Supabase: ${err.message}`);
    } finally {
      setLoader(false);
    }
  };

  const handleSaveOrto = () => genericSaveOrto('examen_clinico', ortoForm, setSavingOrto, setIsEditingOrtoExamen, 'Examen Clínico');
  const handleSavePlanTrabajo = () => genericSaveOrto('plan_trabajo', planTrabajoForm, setSavingTrabajo, setIsEditingOrtoTrabajo, 'Plan de Trabajo');
  const handleSavePlanTrata = () => genericSaveOrto('plan_tratamiento', planTrataForm, setSavingTrata, setIsEditingOrtoTrata, 'Plan de Tratamiento');
  const handleSaveResumen = () => genericSaveOrto('resumen', resumenForm, setSavingResumen, setIsEditingOrtoResumen, 'Resumen');

  // Guarda una sola columna del registro de ortodoncia, sin alertas ni bloqueos
  // (mismo patrón sin-UNIQUE que genericSaveOrto: busca la fila, si no existe la crea).
  const guardarColumnaOrto = async (columna, valor) => {
    const { data: existe, error: fetchError } = await supabase
      .from('ortodoncia')
      .select('id')
      .eq('paciente_id', patient.id)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (existe) {
      const { error } = await supabase.from('ortodoncia').update({ [columna]: valor }).eq('id', existe.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('ortodoncia').insert([{ paciente_id: patient.id, clinica_id: clinicaId, [columna]: valor }]);
      if (error) throw error;
    }
  };

  const guardarFotografiasOrto = (nuevoObjetoFotos) => guardarColumnaOrto('fotografias', nuevoObjetoFotos);

  // Sube junto a la original una versión liviana para las grillas. Si el
  // navegador no puede generarla, devuelve null y las grillas usan la original.
  const subirMiniatura = async (file, rutaOriginal) => {
    const mini = await generarMiniatura(file);
    if (!mini) return null;
    const ruta = rutaMiniatura(rutaOriginal);
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, mini, { contentType: 'image/jpeg' });
    return error ? null : ruta;
  };

  // Extraído de handleUploadFotoOrto para poder reusarlo también desde las
  // casillas de "Inicio" en Progreso del Tratamiento (misma fuente de datos).
  const handleUploadFotoOrtoFile = async (file, key) => {
    if (!file) return;
    setSavingFotosOrto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = rutaFotoOrto(clinicaId, patient.id, file.name);
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file);
      if (uploadError) throw uploadError;
      const thumb = await subirMiniatura(file, fileName);
      // Igual que en las imágenes de historia: se guarda la ruta, no la URL.
      const nuevoObjetoFotos = { ...fotosOrto, [key]: { url: fileName, thumb, ext: fileExt, date: new Date().toLocaleDateString('es-PE') } };
      await guardarFotografiasOrto(nuevoObjetoFotos);
      setFotosOrto(nuevoObjetoFotos);

      // Si era un reemplazo, la foto anterior ya no se referencia: sin esto se
      // quedaría ocupando el bucket para siempre.
      const anterior = fotosOrto[key];
      if (anterior?.url) {
        const viejas = [rutaDesdeUrl(anterior.url), anterior.thumb].filter(Boolean);
        await supabase.storage.from(BUCKET).remove(viejas);
        viejas.forEach(invalidarFirma);
      }
    } catch (err) {
      alert('Error al subir el archivo: ' + err.message);
    } finally {
      setSavingFotosOrto(false);
    }
  };

  const handleUploadFotoOrto = (e, key) => handleUploadFotoOrtoFile(e.target.files[0], key);

  const handleDeleteFotoOrto = async (key, url) => {
    if (!window.confirm('¿Eliminar este archivo permanentemente?')) return;
    setSavingFotosOrto(true);
    try {
      const rutas = [rutaDesdeUrl(url), fotosOrto[key]?.thumb].filter(Boolean);
      await supabase.storage.from(BUCKET).remove(rutas);
      rutas.forEach(invalidarFirma);
      const nuevoObjetoFotos = { ...fotosOrto };
      delete nuevoObjetoFotos[key];
      await guardarFotografiasOrto(nuevoObjetoFotos);
      setFotosOrto(nuevoObjetoFotos);
    } catch (err) {
      alert('Error al eliminar el archivo: ' + err.message);
    } finally {
      setSavingFotosOrto(false);
    }
  };

  // Mantiene sincronizada la foto de la ficha en la galería, sin importar si
  // cambió por una subida, un reemplazo o un borrado.
  useEffect(() => {
    let vivo = true;
    const foto = fotoFicha(fotosOrto);
    (async () => {
      // La galería muestra recuadros chicos: le basta la miniatura.
      const url = foto ? await firmar(foto.thumb || foto.url) : null;
      if (vivo) onPacienteActualizado?.(patient.id, { fotoPerfil: url });
    })();
    return () => { vivo = false; };
  }, [fotosOrto, patient.id, onPacienteActualizado]);

  // ⚡ CARGA Y BARRIDO DE MEMORIA DE ORTODONCIA ⚡
  useEffect(() => {
    if (patient && patient.id) {
      // 1. BARRER LA MEMORIA ANTES DE CARGAR EL NUEVO PACIENTE
      setOrtoForm({});
      setPlanTrabajoForm({});
      setPlanTrataForm({});
      setResumenForm({});
      setFotosOrto({});
      setControles([]);
      setBitacora([]);
      setPagos(PAGOS_VACIO);
      setNuevoControl(controlVacio());
      setEditandoControl(null);
      setNuevoAbono(abonoVacio());

      // 2. CERRAR CUALQUIER MODO EDICIÓN QUE HAYA QUEDADO ABIERTO
      setIsEditingOrtoExamen(false);
      setIsEditingOrtoTrabajo(false);
      setIsEditingOrtoTrata(false);
      setIsEditingOrtoResumen(false);
      setIsEditingOrtoFotos(false);

      const cargarDatosOrto = async () => {
        const { data } = await supabase.from('ortodoncia').select('*').eq('paciente_id', patient.id).maybeSingle();
        if (data) {
          if (data.examen_clinico) setOrtoForm(data.examen_clinico);
          if (data.plan_trabajo) setPlanTrabajoForm(data.plan_trabajo);
          if (data.plan_tratamiento) setPlanTrataForm(data.plan_tratamiento);
          if (data.fotografias) setFotosOrto(data.fotografias);
          if (data.resumen) setResumenForm(data.resumen);
          if (data.controles) setControles(data.controles);
          if (data.bitacora) setBitacora(data.bitacora);
          if (data.pagos) setPagos({ ...PAGOS_VACIO, ...data.pagos });
        }
      };
      cargarDatosOrto();
    }
  }, [patient]);
  
  // FUNCIONES AYUDANTES UI INTERNAS
  const getOrtoStyle = (isEditing) => ({
    ...campoDoc,
    background: isEditing ? LT : 'var(--fill-tertiary)', // Superficie al editar, relleno sutil al bloquear
    borderColor: BD, // El borde se mantiene SIEMPRE visible
    cursor: isEditing ? 'auto' : 'not-allowed', // Muestra el cursor de "prohibido" si está bloqueado
    color: DN, // El texto se mantiene siempre legible
    fontWeight: '500',
    opacity: 1,
    WebkitTextFillColor: 'var(--label-primary)', // Fuerza a Safari/iOS a no opacar el texto

    // Eliminamos el truco de "appearance: none" para que la flecha del select vuelva a aparecer.
  });

  const OrtoHeader = ({ title, isEditing, setIsEditing, onSave, saving, onCancel }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', marginTop: '10px', paddingBottom: '15px', borderBottom: `1px solid ${BD}` }}>
      <h2 style={{ margin: 0, color: DN, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</h2>
      <div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: LT, color: DN, border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)', padding: '10px 18px', minHeight: 40, fontWeight: 600, cursor: 'pointer', fontSize: 15, transition: `background 150ms ${EASE}, border-color 150ms ${EASE}`, boxShadow: 'var(--shadow-sm)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--fill-quaternary)'; e.currentTarget.style.borderColor = 'var(--separator-strong)'; }} onMouseLeave={e => { e.currentTarget.style.background = LT; e.currentTarget.style.borderColor = BD; }}>
            {/* ICONO LÁPIZ PREMIUM SVG */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Editar Sección
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} style={{ background: LT, color: RJ, border: `1px solid color-mix(in srgb, ${RJ} 35%, transparent)`, borderRadius: 'var(--radius-sm)', padding: '10px 20px', minHeight: 40, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>Cancelar</button>
            <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: P, color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px 22px', minHeight: 44, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              {saving ? '⏳ Guardando...' : (
                <>
                  {/* ICONO GUARDAR PREMIUM SVG */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const SectionHeader = ({ title }) => (
    <div style={{ color: P, fontSize: 15, fontWeight: 600, marginTop: '30px', marginBottom: '15px' }}>{title}</div>
  );

  const renderSelectOrto = (label, field, options, isEditing, hasNote = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...etiquetaDoc, marginBottom: 4 }}>{label}</label>
      <select disabled={!isEditing} value={ortoForm[field] || ''} onChange={e => handleOrto(field, e.target.value)} style={getOrtoStyle(isEditing)}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasNote && <input disabled={!isEditing} placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...getOrtoStyle(isEditing), fontStyle: 'italic', height: '38px', marginTop: '4px' }} />}
    </div>
  );

  const renderSelectTrata = (label, field, options, isEditing) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...etiquetaDoc, marginBottom: 4 }}>{label}</label>
      <select disabled={!isEditing} value={planTrataForm[field] || ''} onChange={e => handlePlanTrata(field, e.target.value)} style={getOrtoStyle(isEditing)}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const renderIntraRow = (label, field, opts, isEditing) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${BD}`, gap: '20px', width: '100%' }}>
      <div style={{ width: '180px', minWidth: '180px', fontSize: 15, color: MU, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', gap: '15px', flexShrink: 0, alignItems: 'center' }}>
        {opts.map(opt => {
          const isChecked = ortoForm[`${field}_${opt}`];
          return (
            <label key={opt} style={{
              fontSize: 13.5,
              color: isChecked ? DN : 'var(--label-tertiary)', // Color más sutil si está marcado
              fontWeight: 500, // Quitamos la negrita pesada
              display: 'flex', alignItems: 'center', gap: 6, minHeight: 36,
              cursor: isEditing ? 'pointer' : 'default',
              opacity: 1
            }}>
              <input disabled={!isEditing} type="checkbox" checked={isChecked || false} onChange={e => handleOrto(`${field}_${opt}`, e.target.checked)} style={{ cursor: isEditing ? 'pointer' : 'default', accentColor: P }} />
              {opt}
            </label>
          );
        })}
      </div>
      <div style={{ flex: 1, minWidth: '100px' }}>
        <input disabled={!isEditing} placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...getOrtoStyle(isEditing), height: '36px', padding: '4px 12px' }} />
      </div>
    </div>
  );

  // --- PROGRESO DEL TRATAMIENTO (columnas por hito, filas fijas por ángulo) ---
  // Cada columna es un hito del tratamiento; cada columna tiene los mismos 5
  // casilleros fijos (mismo ángulo de foto en la misma posición en todas las
  // columnas) para que el comparador cruce siempre fotos equivalentes contra
  // el hito "Inicio".
  const HITOS_PROGRESO = ['Inicio', '3 meses', '6 meses', '9 meses', '1 año', '18 meses', '24 meses', 'Final'];
  const FILAS_PROGRESO = ['Frontal', 'Lateral derecho', 'Lateral izquierdo', 'Oclusal superior', 'Oclusal inferior'];
  // La columna "Inicio" no guarda sus propias fotos -- lee y escribe directo
  // en `fotosOrto` (la misma fuente que la pestaña Fotografías), así que subir
  // una foto en cualquiera de las dos pestañas la refleja en la otra.
  const FILA_A_CAJA_FOTO = {
    'Frontal': 'Foto frontal',
    'Lateral derecho': 'Foto lateral derecha',
    'Lateral izquierdo': 'Foto lateral izquierda',
    'Oclusal superior': 'Foto oclusal superior',
    'Oclusal inferior': 'Foto oclusal inferior',
  };

  const [controles, setControles] = useState([]); // [{ hito, nota, fotos: { [fila]: {url, ext, date} } }] -- excepto "Inicio"
  // Igual que fotosOrtoFirmadas: cada control con sus fotos ya con URL firmada.
  const [controlesFirmados, setControlesFirmados] = useState([]);
  const [subiendoCasilla, setSubiendoCasilla] = useState(''); // `${hito}::${fila}` en curso
  const [comparando, setComparando] = useState(null); // hito comparado contra "Inicio", o null si el modal está cerrado

  useEffect(() => {
    let vivo = true;
    const resolver = async () => {
      // Todas las fotos de todos los hitos en una sola petición de firmado.
      const firmas = await firmarVarias(
        (controles || []).flatMap(c => Object.values(c.fotos || {}).flatMap(f => [f.url, f.thumb]))
      );
      if (!vivo) return;
      setControlesFirmados((controles || []).map(c => ({
        ...c,
        fotos: Object.fromEntries(Object.entries(c.fotos || {}).map(([fila, f]) => {
          const original = firmas.get(rutaDesdeUrl(f.url)) || null;
          return [fila, { ...f, urlFirmada: original, miniFirmada: (f.thumb && firmas.get(f.thumb)) || original }];
        })),
      })));
    };
    resolver();
    return () => { vivo = false; };
  }, [controles]);

  const guardarControles = (nuevosControles) => guardarColumnaOrto('controles', nuevosControles);

  const subirFotoCasilla = async (hito, fila, file) => {
    if (!file) return;
    const clave = `${hito}::${fila}`;
    setSubiendoCasilla(clave);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = rutaFotoOrto(clinicaId, patient.id, file.name);
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file);
      if (uploadError) throw uploadError;
      const thumb = await subirMiniatura(file, fileName);
      const nuevaFoto = { url: fileName, thumb, ext: fileExt, date: new Date().toLocaleDateString('es-PE') };
      const existente = controles.find(c => c.hito === hito);
      const nuevosControles = existente
        ? controles.map(c => (c.hito === hito ? { ...c, fotos: { ...c.fotos, [fila]: nuevaFoto } } : c))
        : [...controles, { hito, nota: '', fotos: { [fila]: nuevaFoto } }];
      await guardarControles(nuevosControles);
      setControles(nuevosControles);
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    } finally {
      setSubiendoCasilla('');
    }
  };

  const eliminarFotoCasilla = async (hito, fila) => {
    if (!window.confirm('¿Eliminar esta foto?')) return;
    const control = controles.find(c => c.hito === hito);
    const foto = control?.fotos?.[fila];
    if (!foto) return;
    try {
      const rutas = [rutaDesdeUrl(foto.url), foto.thumb].filter(Boolean);
      await supabase.storage.from(BUCKET).remove(rutas);
      rutas.forEach(invalidarFirma);
      const nuevasFotos = { ...control.fotos };
      delete nuevasFotos[fila];
      const nuevosControles = controles.map(c => (c.hito === hito ? { ...c, fotos: nuevasFotos } : c));
      await guardarControles(nuevosControles);
      setControles(nuevosControles);
    } catch (err) {
      alert('Error al eliminar la foto: ' + err.message);
    }
  };

  const actualizarNotaHito = (hito, nota) => {
    setControles(prev => {
      const existe = prev.find(c => c.hito === hito);
      if (existe) return prev.map(c => (c.hito === hito ? { ...c, nota } : c));
      return [...prev, { hito, nota, fotos: {} }];
    });
  };

  const guardarNotaHito = async () => {
    try { await guardarControles(controles); } catch (err) { alert('Error al guardar la nota: ' + err.message); }
  };

  // --- CONTROLES MENSUALES (bitácora clínica: qué se hizo en cada cita) ------
  // Aparte de las fotos por hito: acá se registra el procedimiento de cada
  // control para que en la cita siguiente se sepa qué se hizo el mes anterior.
  const [bitacora, setBitacora] = useState([]); // [{id, fecha, procedimiento, observaciones, proxima_cita}]
  const [savingBitacora, setSavingBitacora] = useState(false);
  const [nuevoControl, setNuevoControl] = useState(controlVacio());
  const [editandoControl, setEditandoControl] = useState(null); // id en edición

  const agregarControlMensual = async () => {
    if (!nuevoControl.fecha) { alert('Indica la fecha del control.'); return; }
    if (!nuevoControl.procedimiento.trim()) { alert('Describe qué se hizo en este control.'); return; }
    setSavingBitacora(true);
    try {
      const entrada = {
        id: editandoControl || `${Date.now()}`,
        fecha: nuevoControl.fecha,
        procedimiento: nuevoControl.procedimiento.trim(),
        observaciones: nuevoControl.observaciones.trim(),
        proxima_cita: nuevoControl.proxima_cita || '',
      };
      const sinLaEntrada = editandoControl ? bitacora.filter(b => b.id !== editandoControl) : bitacora;
      // Más reciente primero: es el orden en que se lee una bitácora clínica.
      const nueva = [...sinLaEntrada, entrada].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      await guardarColumnaOrto('bitacora', nueva);
      setBitacora(nueva);
      setNuevoControl(controlVacio());
      setEditandoControl(null);
    } catch (err) {
      alert('Error al guardar el control: ' + err.message);
    } finally {
      setSavingBitacora(false);
    }
  };

  const editarControlMensual = (entrada) => {
    setEditandoControl(entrada.id);
    setNuevoControl({
      fecha: entrada.fecha || '',
      procedimiento: entrada.procedimiento || '',
      observaciones: entrada.observaciones || '',
      proxima_cita: entrada.proxima_cita || '',
    });
  };

  const eliminarControlMensual = async (id) => {
    if (!window.confirm('¿Eliminar este control de la bitácora?')) return;
    try {
      const nueva = bitacora.filter(b => b.id !== id);
      await guardarColumnaOrto('bitacora', nueva);
      setBitacora(nueva);
      if (editandoControl === id) { setEditandoControl(null); setNuevoControl(controlVacio()); }
    } catch (err) {
      alert('Error al eliminar el control: ' + err.message);
    }
  };

  // --- PAGOS (cuota mensual fija + extras) ----------------------------------
  const [pagos, setPagos] = useState(PAGOS_VACIO);
  const [savingAbono, setSavingAbono] = useState(false);
  const [nuevoAbono, setNuevoAbono] = useState(abonoVacio());

  const guardarConfigPagos = async (nuevosPagos) => {
    try { await guardarColumnaOrto('pagos', nuevosPagos); } catch (err) { alert('Error al guardar los datos de pago: ' + err.message); }
  };

  const agregarAbono = async () => {
    const monto = parseFloat(nuevoAbono.monto);
    if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }
    if (!nuevoAbono.fecha) { alert('Indica la fecha del pago.'); return; }
    setSavingAbono(true);
    try {
      const entrada = {
        id: `${Date.now()}`,
        fecha: nuevoAbono.fecha,
        monto,
        metodo: nuevoAbono.metodo,
        concepto: nuevoAbono.concepto.trim(),
        tipo: nuevoAbono.tipo,
      };
      const nuevosPagos = { ...pagos, abonos: [...(pagos.abonos || []), entrada].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')) };
      await guardarColumnaOrto('pagos', nuevosPagos);
      setPagos(nuevosPagos);
      setNuevoAbono({ ...abonoVacio(), fecha: nuevoAbono.fecha });
      onPacienteActualizado?.(patient.id, { pagos: nuevosPagos });
    } catch (err) {
      alert('Error al registrar el pago: ' + err.message);
    } finally {
      setSavingAbono(false);
    }
  };

  const eliminarAbono = async (id) => {
    if (!window.confirm('¿Eliminar este pago del historial?')) return;
    try {
      const nuevosPagos = { ...pagos, abonos: (pagos.abonos || []).filter(a => a.id !== id) };
      await guardarColumnaOrto('pagos', nuevosPagos);
      setPagos(nuevosPagos);
      onPacienteActualizado?.(patient.id, { pagos: nuevosPagos });
    } catch (err) {
      alert('Error al eliminar el pago: ' + err.message);
    }
  };

  const ORTO_TABS = [{ id: 'examen', lbl: 'Examen clínico' }, { id: 'trabajo', lbl: 'Plan de Trabajo' }, { id: 'tratamiento', lbl: 'Plan de tratamiento' }, { id: 'resumen', lbl: 'Resumen' }, { id: 'fotografias', lbl: 'Fotografías' }, { id: 'controles', lbl: 'Progreso del Tratamiento' }, { id: 'bitacora', lbl: 'Controles Mensuales' }, { id: 'pagos', lbl: 'Pagos' }];

  // Progreso del tratamiento: meses transcurridos desde la fecha inicial
  // (Plan de tratamiento o Resumen, la que exista) contra el tiempo estimado.
  const fechaInicioTrata = planTrataForm.fecha_inicial || resumenForm.fecha_inicial || '';
  const tiempoEstimadoMeses = Number(planTrataForm.tiempo_estimado || resumenForm.tiempo_estimado) || 0;
  const mesesTranscurridos = fechaInicioTrata
    ? Math.max(0, (Date.now() - new Date(fechaInicioTrata).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 0;
  const progresoPct = tiempoEstimadoMeses > 0 ? Math.min(100, (mesesTranscurridos / tiempoEstimadoMeses) * 100) : null;
  const inicioTieneFotos = FILAS_PROGRESO.some(fila => !!fotosOrtoFirmadas[FILA_A_CAJA_FOTO[fila]]);
  // Misma prioridad que fotoFicha, pero sobre las URLs ya firmadas. El avatar
  // es diminuto, así que va con la miniatura.
  const fotoFichaFirmada = ORDEN_FOTO_FICHA
    .map(clave => fotosOrtoFirmadas[clave]?.miniFirmada).find(Boolean) || null;
  const hitosProgresoConFotos = HITOS_PROGRESO.filter(h =>
    h === 'Inicio' ? inicioTieneFotos : controles.some(c => c.hito === h && Object.keys(c.fotos || {}).length > 0)
  );
  const ultimoControl = hitosProgresoConFotos.length > 0 ? hitosProgresoConFotos[hitosProgresoConFotos.length - 1] : null;

  return (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: MT }}>
            <div style={{ flex: 1, background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderRadius: 'var(--radius-lg)', border: GLASS_BORDER, display: 'flex', flexDirection: 'column', boxShadow: GLASS_SHADOW, overflow: 'hidden' }}>

              {/* Superficie de color FIJO: el degradado se cambió por un plano,
                  pero sigue siendo un fondo oscuro fijo -- todo el texto de
                  adentro se queda blanco literal en ambos temas. */}
              <div style={{ padding: '20px 24px', background: '#0f172a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* La foto de perfil se cambia desde acá mismo: escribe en la
                      misma casilla "Foto de perfil" de la pestaña Fotografías. */}
                  <label
                    title={savingFotosOrto ? 'Subiendo...' : 'Cambiar foto de perfil'}
                    style={{ position: 'relative', width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 17, flexShrink: 0, overflow: 'hidden', cursor: savingFotosOrto ? 'wait' : 'pointer' }}
                    onMouseEnter={e => { const o = e.currentTarget.querySelector('[data-overlay]'); if (o) o.style.opacity = 1; }}
                    onMouseLeave={e => { const o = e.currentTarget.querySelector('[data-overlay]'); if (o) o.style.opacity = 0; }}
                  >
                    {fotoFichaFirmada
                      ? <img src={fotoFichaFirmada} alt={patient.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : ini(patient.name)}
                    <span data-overlay style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: `opacity 150ms ${EASE}` }}>
                      <Icon name="camera" size={16} color="#fff" />
                    </span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={savingFotosOrto}
                      onChange={e => handleUploadFotoOrto(e, CLAVE_FOTO_PERFIL)} />
                  </label>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>{patient.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      {hitosProgresoConFotos.length} de {HITOS_PROGRESO.length} hitos con fotos
                      {ultimoControl ? ` · Último: ${ultimoControl}` : ''}
                    </div>
                  </div>
                </div>
                {progresoPct !== null && (
                  <div style={{ minWidth: 200, flex: '0 1 240px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 6, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      <span>Progreso del tratamiento</span>
                      <span>{Math.round(progresoPct)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progresoPct}%`, background: '#fff', borderRadius: 'var(--radius-sm)', transition: `width 400ms ${EASE}` }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, padding: '0 24px', gap: '20px', background: LT, flexShrink: 0, overflowX: 'auto' }}>
                {ORTO_TABS.map(t => (
                  <div key={t.id} onClick={() => setSubTabOrto(t.id)}
                    style={{
                      padding: '0 4px', minHeight: 46, display: 'flex', alignItems: 'center',
                      cursor: 'pointer', fontSize: 13,
                      fontWeight: subTabOrto === t.id ? 600 : 500,
                      color: subTabOrto === t.id ? P : MU,
                      borderBottom: subTabOrto === t.id ? `2px solid ${P}` : '2px solid transparent',
                      transition: `color 150ms ${EASE}, border-color 150ms ${EASE}`, marginBottom: '-1px', whiteSpace: 'nowrap'
                    }}>
                    {t.lbl}
                  </div>
                ))}
              </div>

              <div style={{ padding: '30px', flex: 1, overflowY: 'auto', background: LT }}>

                {subTabOrto === 'examen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <OrtoHeader title="Examen Clínico de Ortodoncia" isEditing={isEditingOrtoExamen} setIsEditing={setIsEditingOrtoExamen} onSave={handleSaveOrto} saving={savingOrto} onCancel={() => setIsEditingOrtoExamen(false)} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {['Motivo de consulta', 'Historia médica', 'Historia odontológica', 'Historia Familiar'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '250px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: 13, color: MU, fontWeight: 500 }}>{f}</label>
                          <input disabled={!isEditingOrtoExamen} value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={getOrtoStyle(isEditingOrtoExamen)} />
                        </div>
                      ))}
                    </div>

                    <SectionHeader title="Examen Extraoral" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Cráneo', 'craneo', ['Mesocéfalo', 'Braquicéfalo', 'Dolicéfalo'], isEditingOrtoExamen)}
                      {renderSelectOrto('Cara', 'cara', ['Mesofacial', 'Braquifacial', 'Dolicofacial'], isEditingOrtoExamen)}
                      {renderSelectOrto('Musculatura', 'musculatura', ['Normal', 'Alterada'], isEditingOrtoExamen)}
                      {renderSelectOrto('ATM', 'atm', ['Apertura bucal normal', 'Dolor al despertar', 'Dolor agudo', 'Dolor espontáneo', 'Click articular', 'Crepitación', 'Dolor a la palpación', 'Sensibilidad a la palpación', 'Apertura bucal disminuida'], isEditingOrtoExamen)}
                      {renderSelectOrto('Mentón', 'menton_ext', ['Normal', 'Pobre', 'Prominente'], isEditingOrtoExamen)}
                      {renderSelectOrto('ANL', 'anl', ['Normal', 'Cerrado', 'Abierto', 'Cerrado con nariz baja', 'Abierto con nariz respingada'], isEditingOrtoExamen)}
                      {renderSelectOrto('Fonación', 'fonacion', ['Normal', 'Rotacismo', 'Seseo'], isEditingOrtoExamen)}
                      {renderSelectOrto('Deglución', 'deglucion', ['Normal', 'Atípica tipo I', 'Atípica tipo II', 'Atípica tipo III', 'Atípico tipo IV'], isEditingOrtoExamen)}
                      {renderSelectOrto('Respiración', 'respiracion', ['Normal', 'Mixta'], isEditingOrtoExamen)}
                      {renderSelectOrto('Permeabilidad nasal', 'permeabilidad', ['Normal', 'Disminuida'], isEditingOrtoExamen)}
                      {renderSelectOrto('Hábitos', 'habitos', ['Ausentes', 'Respiración oral', 'Succión del pulgar', 'Succión de otro dedo', 'Succión de objetos'], isEditingOrtoExamen)}
                    </div>
                    <textarea disabled={!isEditingOrtoExamen} placeholder="Notas extraorales..." value={ortoForm.extraoral_notas || ''} onChange={e => handleOrto('extraoral_notas', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoExamen), height: '80px', marginTop: '20px', resize: 'none' }} />

                    <SectionHeader title="Asimetría facial" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Plano bipupilar', 'plano_bipupilar', ['Adecuado', 'Discrepante'], isEditingOrtoExamen)}
                      {renderSelectOrto('Tabique nasal', 'tabique_nasal', ['Alineado', 'Desviado a la derecha', 'Desviado a la izquierda'], isEditingOrtoExamen)}
                      {renderSelectOrto('Comisura bucales', 'comisuras', ['Niveladas', 'Discrepantes a la derecha', 'Discrepantes a la izquierda'], isEditingOrtoExamen)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '120px 100px 250px 150px', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={{ fontSize: 13, color: MU, fontWeight: 500 }}>Filtrum</div>
                      <label style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.filtrum_alineado || false} onChange={e => handleOrto('filtrum_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: 13, color: MU, fontWeight: 500 }}>Desviación lateral del filtrum</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.filtrum_izq || false} onChange={e => handleOrto('filtrum_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.filtrum_der || false} onChange={e => handleOrto('filtrum_der', e.target.checked)} /> Derecha</label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '120px 100px 250px 150px', gap: '15px', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, color: MU, fontWeight: 500 }}>Mentón</div>
                      <label style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.menton_alineado || false} onChange={e => handleOrto('menton_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: 13, color: MU, fontWeight: 500 }}>Desviación lateral del mentón</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.menton_izq || false} onChange={e => handleOrto('menton_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 6, minHeight: 36, opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.menton_der || false} onChange={e => handleOrto('menton_der', e.target.checked)} /> Derecha</label>
                      </div>
                    </div>
                    <textarea disabled={!isEditingOrtoExamen} placeholder="Notas de asimetría..." value={ortoForm.asimetria_notas || ''} onChange={e => handleOrto('asimetria_notas', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoExamen), height: '80px', marginTop: '20px', resize: 'none' }} />

                    <SectionHeader title="Perfil AP y proyección sagital de maxilares" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Tipo de Perfil', 'perfil_ap_tipo', ['Convexo', 'Recto', 'Cóncavo'], isEditingOrtoExamen)}
                      {renderSelectOrto('Tercio Medio', 'perfil_ap_medio', ['1/3 medio normal', '1/3 medio pobre', '1/3 medio aumentado'], isEditingOrtoExamen)}
                      {renderSelectOrto('Tercio Inferior', 'perfil_ap_inf', ['1/3 inferior normal', '1/3 inferior pobre', '1/3 inferior aumentado'], isEditingOrtoExamen)}
                    </div>

                    <SectionHeader title="Perfil y desarrollo vertical de maxilares" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Divergencia', 'perfil_vert_div', ['Normodivergente', 'Hipodivergente', 'Hiperdivergente'], isEditingOrtoExamen)}
                      {renderSelectOrto('Tercio Medio', 'perfil_vert_medio', ['1/3 medio normal', '1/3 medio pobre', '1/3 medio aumentado'], isEditingOrtoExamen)}
                      {renderSelectOrto('Tercio Inferior', 'perfil_vert_inf', ['1/3 inferior normal', '1/3 inferior pobre', '1/3 inferior aumentado'], isEditingOrtoExamen)}
                    </div>

                    <SectionHeader title="Labios" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Relación', 'labios_relacion', ['En relación normal', 'En relación alterada'], isEditingOrtoExamen)}
                      {renderSelectOrto('Posición', 'labios_posicion', ['En posición retruída', 'En posición protuída', 'En posición normal'], isEditingOrtoExamen)}
                      {renderSelectOrto('Competencia', 'labios_competencia', ['Competentes con sellado suave', 'Competentes con sellado excesivo', 'Incompetentes separados por'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Tonicidad', 'labios_tonicidad', ['Hipotónicos', 'Normales', 'Hipértonicos'], isEditingOrtoExamen)}
                    </div>

                    <SectionHeader title="Labio inferior" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Posición', 'labio_inf_pos', ['En posición retruída', 'En posición protuída', 'En posición normal'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Eversión', 'labio_inf_ever', ['Evertido', 'No evertido'], isEditingOrtoExamen)}
                      {renderSelectOrto('Grosor', 'labio_inf_grosor', ['Delgado', 'Grueso', 'Promedio'], isEditingOrtoExamen)}
                    </div>

                    <SectionHeader title="Labio superior" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Posición', 'labio_sup_pos', ['En posición retruída', 'En posición protuída', 'En posición normal'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Eversión', 'labio_sup_ever', ['Evertido', 'No evertido'], isEditingOrtoExamen)}
                      {renderSelectOrto('Grosor', 'labio_sup_grosor', ['Delgado', 'Grueso', 'Promedio'], isEditingOrtoExamen)}
                    </div>

                    <SectionHeader title="Sonrisa" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Altura', 'sonrisa_altura', ['Gingival (alta)', 'Media', 'Baja'], isEditingOrtoExamen)}
                      {renderSelectOrto('Corredores', 'sonrisa_corredores', ['Con corredores bucales normales', 'Con corredores bucales cerrados', 'Con corredores bucales amplios'], isEditingOrtoExamen)}
                      {renderSelectOrto('Acompañamiento', 'sonrisa_acomp', ['Acompañada con el labio inferior', 'No acompañada con el labio inferior'], isEditingOrtoExamen)}
                    </div>
                    <textarea disabled={!isEditingOrtoExamen} placeholder="Notas sonrisa..." value={ortoForm.sonrisa_notas || ''} onChange={e => handleOrto('sonrisa_notas', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoExamen), height: '80px', marginTop: '20px', resize: 'none' }} />

                    <SectionHeader title="Examen Intraoral" />
                    <div>
                      {renderIntraRow('Mucosa de labio', 'mucosa_labio', ['Normal', 'Alterada'], isEditingOrtoExamen)}
                      {renderIntraRow('Mucosa vestibular', 'mucosa_vestibular', ['Normal', 'Alterada'], isEditingOrtoExamen)}
                      {renderIntraRow('Frenillos vestibulares', 'frenillos_vest', ['Normal', 'Alterada'], isEditingOrtoExamen)}
                      {renderIntraRow('Mucosa palatina', 'mucosa_palatina', ['Normal', 'Alterada'], isEditingOrtoExamen)}
                      {renderIntraRow('Mucosa orofaríngea', 'mucosa_oro', ['Normal', 'Alterada'], isEditingOrtoExamen)}
                      {renderIntraRow('Amígdalas', 'amigdalas', ['Normales', 'Hipertróficas', 'Hipertróficas y crípticas'], isEditingOrtoExamen)}
                    </div>

                    <SectionHeader title="Lengua" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Tonicidad', 'lengua_tonicidad', ['Normotónica', 'Hipotónica'], isEditingOrtoExamen)}
                      {renderSelectOrto('Posición', 'lengua_pos', ['Posición normal', 'Posición Baja'], isEditingOrtoExamen)}
                      {renderSelectOrto('Movilidad', 'lengua_mov', ['Movilidad normal', 'Hipomovilidad', 'Hipermovilidad'], isEditingOrtoExamen)}
                      {renderSelectOrto('Frenillo', 'lengua_frenillo', ['Frenillo lingual normal', 'Frenillo lingual corto'], isEditingOrtoExamen)}
                    </div>

                    <SectionHeader title="Gíngiva" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Gíngiva incisivos inferiores (Grosor)', 'gingiva_inf_grosor', ['Grosor normal', 'Delgada', 'Delgada y traslúcida', 'Gruesa', 'Muy gruesa'], isEditingOrtoExamen)}
                      {renderSelectOrto('Gíngiva incisivos inferiores (Adherida)', 'gingiva_inf_adherida', ['Encía adherida de 2.5mm', 'Encía adherida de 3 mm', 'Encía adherida de 3.5mm', 'Encía adherida de 4mm', 'Encía adherida de 4.5mm'], isEditingOrtoExamen)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Evaluación general (Grosor)', 'gingiva_gral_grosor', ['Grosor normal', 'Delgada', 'Delgada y traslúcida', 'Gruesa', 'Muy gruesa'], isEditingOrtoExamen)}
                      {renderSelectOrto('Evaluación general (Margen)', 'gingiva_gral_margen', ['Margen gingival', 'Retraída en piezas'], isEditingOrtoExamen, true)}
                    </div>

                    <SectionHeader title="Arcos" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Arco superior', 'arco_sup_forma', ['Ovoide', 'Triangular', 'Cuadrado'], isEditingOrtoExamen)}
                      {renderSelectOrto('Simetría superior', 'arco_sup_sim', ['Simétrico', 'Asimétrico'], isEditingOrtoExamen)}
                      {renderSelectOrto('Alineación superior', 'arco_sup_alin', ['Alineado', 'Apiñado en', 'Espaciado en'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('DAD superior', 'arco_sup_dad', ['Sin DAD', 'Con DAD de'], isEditingOrtoExamen, true)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Arco inferior', 'arco_inf_forma', ['Ovoide', 'Triangular', 'Cuadrado'], isEditingOrtoExamen)}
                      {renderSelectOrto('Simetría inferior', 'arco_inf_sim', ['Simétrico', 'Asimétrico'], isEditingOrtoExamen)}
                      {renderSelectOrto('Alineación inferior', 'arco_inf_alin', ['Alineado', 'Apiñado en', 'Espaciado en'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('DAD inferior', 'arco_inf_dad', ['Sin DAD', 'Con DAD de'], isEditingOrtoExamen, true)}
                    </div>

                    <SectionHeader title="Dientes y Alteraciones" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {['Error molar derecho', 'Error molar izquierdo', 'Dientes ausentes', 'Alteraciones de número, forma y tamaño de dientes'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '250px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: 13, color: MU, fontWeight: 500 }}>{f}</label>
                          <input disabled={!isEditingOrtoExamen} value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={getOrtoStyle(isEditingOrtoExamen)} />
                        </div>
                      ))}
                    </div>

                    <SectionHeader title="Relaciones Oclusales" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', rowGap: '30px' }}>
                      {renderSelectOrto('Relación molar derecha', 'rel_molar_der', ['Llave molar ideal', 'Clase I', 'Clase II', 'Clase III', 'NR'], isEditingOrtoExamen)}
                      {renderSelectOrto('Relación molar izquierda', 'rel_molar_izq', ['Llave molar ideal', 'Clase I', 'Clase II', 'Clase III', 'NR'], isEditingOrtoExamen)}
                      {renderSelectOrto('Relación canina derecha', 'rel_can_der', ['Clase I', 'Clase II', 'Clase III', 'NR'], isEditingOrtoExamen)}
                      {renderSelectOrto('Relación canina izquierda', 'rel_can_izq', ['Clase I', 'Clase II', 'Clase III', 'NR'], isEditingOrtoExamen)}

                      {renderSelectOrto('Mordida invertida', 'mord_invertida', ['Dentaria', 'Funcional', 'Esquelética'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Resalte horizontal', 'res_horizontal', ['NR', 'Normal', 'Aumentado', 'Invertido'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Curva de Spee', 'curva_spee', ['NR', 'Normal', 'Acentuada'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Resalte vertical', 'res_vertical', ['NR', 'Normal', 'Acentuada'], isEditingOrtoExamen, true)}

                      {renderSelectOrto('Des. Vert. Proceso Alveolar Sup', 'des_vert_sup', ['Normal', 'Disminuido', 'Aumentado'], isEditingOrtoExamen)}
                      {renderSelectOrto('Mordida abierta anterior', 'mord_abierta_ant', ['Dentaria', 'Dentialveolar por hábito', 'Esquelética'], isEditingOrtoExamen)}
                      {renderSelectOrto('Mordida abierta posterior', 'mord_abierta_post', ['Dentaria', 'Dentoalveolar por hábito', 'Esquelética', 'Completa'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Dimensión transversal maxilar', 'dim_trans_max', ['Normal', 'Disminuida', 'Aumentada'], isEditingOrtoExamen, true)}

                      {renderSelectOrto('Mordida cruzada posterior', 'mord_cruz_post', ['Ausente', 'Presente'], isEditingOrtoExamen)}
                      {renderSelectOrto('Altura Cusp. Palatinas Sup.', 'alt_cusp_pal', ['Normales', 'Altas', 'Bajas'], isEditingOrtoExamen)}
                      {renderSelectOrto('Línea media superior', 'linea_med_sup', ['Alineada', 'Discrepante a la derecha', 'Discrepante a la izquierda'], isEditingOrtoExamen, true)}
                      {renderSelectOrto('Línea media inferior', 'linea_med_inf', ['Alineada', 'Discrepante a la derecha', 'Discrepante a la izquierda'], isEditingOrtoExamen, true)}

                      {renderSelectOrto('Incisivos superiores', 'inc_sup', ['Normales', 'Vestibularizados', 'Palatinizados', 'Protruidos', 'Retruidos', 'Vestibularizados y protruídos', 'Vestibularizados y retruídos', 'Palatinizados y protruídos', 'Palatinizados y retruídos'], isEditingOrtoExamen)}
                      {renderSelectOrto('Incisivos inferiores', 'inc_inf', ['Normales', 'Vestibularizados', 'Palatinizados', 'Protruidos', 'Retruidos', 'Vestibularizados y protruídos', 'Vestibularizados y retruídos', 'Lingualizados y protruídos', 'Lingualizados y retruídos'], isEditingOrtoExamen)}
                      {renderSelectOrto('Patrón de Clase II-2', 'patron_clase_2', ['Tipo A', 'Tipo B', 'Tipo C'], isEditingOrtoExamen, true)}
                    </div>

                    <SectionHeader title="Conclusión" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
                      {['Observaciones', 'Maloclusión'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '150px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: 13, color: MU, fontWeight: 500 }}>{f}</label>
                          <input disabled={!isEditingOrtoExamen} value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} placeholder="Anotaciones adicionales..." style={getOrtoStyle(isEditingOrtoExamen)} />
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {subTabOrto === 'trabajo' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <OrtoHeader title="Plan de Trabajo" isEditing={isEditingOrtoTrabajo} setIsEditing={setIsEditingOrtoTrabajo} onSave={handleSavePlanTrabajo} saving={savingTrabajo} onCancel={() => setIsEditingOrtoTrabajo(false)} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Fotografías set ortodóntico', 'Fotografías set quirúrgico'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Modelos de estudio con alginato', 'Modelos de estudio con silicona'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['TAC de volumen completo con protocolo Morzán', 'TAC de volumen completo sin informe', 'TAC de campo pequeño'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea disabled={!isEditingOrtoTrabajo} placeholder="Notas de sección..." value={planTrabajoForm.notas_seccion || ''} onChange={e => handlePlanTrabajo('notas_seccion', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '100px', resize: 'none' }} />

                    <SectionHeader title="Radiografías" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Postero anterior', 'Periapicales de incisivos superiores', 'Periapicales de incisivos inferiores'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Bitewing de molares', 'Bitewing de molares y premolares', 'Bitewing de premolares'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Carpal', 'Oclusal superior', 'Oclusal inferior', 'Panorámica'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea disabled={!isEditingOrtoTrabajo} placeholder="Notas de radiografías..." value={planTrabajoForm.notas_radio || ''} onChange={e => handlePlanTrabajo('notas_radio', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '100px', resize: 'none' }} />

                    <SectionHeader title="Interconsultas" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Otorrinolaringólogo', 'Odontopediatra', 'Odontólogo General'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Cirujano Máxilo facial', 'Periodoncista', 'Médica'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Fisioterapeuta Oral', 'Psicólogo', 'Encerado diagnóstico', 'Exámenes auxiliares'].map(opt => (
                          <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea disabled={!isEditingOrtoTrabajo} placeholder="Notas de interconsultas..." value={planTrabajoForm.notas_inter || ''} onChange={e => handlePlanTrabajo('notas_inter', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '100px', resize: 'none', marginBottom: '30px' }} />

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...etiquetaDoc, marginBottom: 8 }}>Informes</label>
                      <textarea disabled={!isEditingOrtoTrabajo} value={planTrabajoForm.informes || ''} onChange={e => handlePlanTrabajo('informes', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...etiquetaDoc, marginBottom: 8 }}>Diagnóstico definitivo</label>
                      <textarea disabled={!isEditingOrtoTrabajo} value={planTrabajoForm.diag_definitivo || ''} onChange={e => handlePlanTrabajo('diag_definitivo', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...etiquetaDoc, marginBottom: 8 }}>Objetivo</label>
                      <textarea disabled={!isEditingOrtoTrabajo} value={planTrabajoForm.objetivo || ''} onChange={e => handlePlanTrabajo('objetivo', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '80px', resize: 'none' }} />
                    </div>
                  </div>
                )}

                {subTabOrto === 'tratamiento' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <OrtoHeader title="Plan de Tratamiento" isEditing={isEditingOrtoTrata} setIsEditing={setIsEditingOrtoTrata} onSave={handleSavePlanTrata} saving={savingTrata} onCancel={() => setIsEditingOrtoTrata(false)} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Fecha inicial</label>
                        <input disabled={!isEditingOrtoTrata} type="date" value={planTrataForm.fecha_inicial || ''} onChange={e => handlePlanTrata('fecha_inicial', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Tiempo estimado <span style={{ fontSize: 12, color: 'var(--label-tertiary)', fontWeight: 400 }}>(meses)</span></label>
                        <input disabled={!isEditingOrtoTrata} type="number" placeholder="Ej: 18" value={planTrataForm.tiempo_estimado || ''} onChange={e => handlePlanTrata('tiempo_estimado', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Fecha final</label>
                        <input disabled={!isEditingOrtoTrata} type="date" value={planTrataForm.fecha_final || ''} onChange={e => handlePlanTrata('fecha_final', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : '100px 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <span style={{ fontSize: 13, color: MU, fontWeight: 600 }}>Tipo</span>
                      <select disabled={!isEditingOrtoTrata} value={planTrataForm.tipo_1 || ''} onChange={e => handlePlanTrata('tipo_1', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)}>
                        <option value="">Seleccionar</option>
                        {['Interceptivo', 'Guía de oclusión', 'Ortodóntico', 'Ortopédico', 'Ortodóntico - Ortopédico', 'Ortodóntico interdisciplinario', 'Ortodóntico interprofesional'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select disabled={!isEditingOrtoTrata} value={planTrataForm.tipo_2 || ''} onChange={e => handlePlanTrata('tipo_2', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Ortodoncia con PAOO'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select disabled={!isEditingOrtoTrata} value={planTrataForm.tipo_3 || ''} onChange={e => handlePlanTrata('tipo_3', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Alineadores Invisaling'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select disabled={!isEditingOrtoTrata} value={planTrataForm.tipo_4 || ''} onChange={e => handlePlanTrata('tipo_4', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Alineadores Keep Smiling'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <textarea disabled={!isEditingOrtoTrata} placeholder="Notas de sección..." value={planTrataForm.notas_seccion || ''} onChange={e => handlePlanTrata('notas_seccion', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '80px', resize: 'none', marginBottom: '10px' }} />

                    <SectionHeader title="Aparatos Ortopédicos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '15px', marginBottom: '15px' }}>
                      {['AEO', 'Hiperpropulsión con bloques gemelos', 'Hiperpropulsión con Bionator', 'ERP Haas', 'ERP Hyrax', 'ERP MARPE tipo Moon', 'ERP MARPE con acrílico', 'Máscara facial Delaire', 'Máscara facial Petit', 'Mentonera', 'Placa labio activa', 'Pantalla oral'].map(opt => (
                        <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrata ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrata ? 1 : 0.6 }}>
                          <input disabled={!isEditingOrtoTrata} type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea disabled={!isEditingOrtoTrata} placeholder="Notas de aparatos ortopédicos..." value={planTrataForm.notas_ortopedicos || ''} onChange={e => handlePlanTrata('notas_ortopedicos', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '80px', resize: 'none' }} />

                    <SectionHeader title="Anclaje" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '20px', maxWidth: '700px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: 13, color: MU, fontWeight: 500 }}>Superior</span>
                        <select disabled={!isEditingOrtoTrata} value={planTrataForm.anclaje_sup || ''} onChange={e => handlePlanTrata('anclaje_sup', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: 13, color: MU, fontWeight: 500 }}>Inferior</span>
                        <select disabled={!isEditingOrtoTrata} value={planTrataForm.anclaje_inf || ''} onChange={e => handlePlanTrata('anclaje_inf', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '15px' }}>
                      {['Mini implantes', 'Bicorticales', 'Mini placas', 'Mini implantes palatinos paramediales', 'Mini implantes bicorticales paramediales'].map(opt => (
                        <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrata ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrata ? 1 : 0.6 }}>
                          <input disabled={!isEditingOrtoTrata} type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea disabled={!isEditingOrtoTrata} placeholder="Notas de anclaje..." value={planTrataForm.notas_anclaje || ''} onChange={e => handlePlanTrata('notas_anclaje', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '80px', resize: 'none' }} />

                    <SectionHeader title="Aparatos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '15px', marginBottom: '15px' }}>
                      {['Distal jet óseo', 'ATP semi fijo', 'Brazo de poder para tracción mesial de molar', 'Placa activa de expansión', 'Péndulo óseo', 'ATP más botón de Nance', 'Placa para levantar mordida', 'Mantenedor de espacio', 'Resorte vestibular para distalizar molar', 'ATP fijo', 'VAC modificado', 'Recuperador de espacio', 'MUST óseo', 'Arco lingual semi fijo', 'ALF', 'Rejilla lingual', 'Cantilever óseo', 'Botón de Nance óseo', 'AEO ortodóntico', 'QUAD HÉLIX'].map(opt => (
                        <label key={opt} style={{ fontSize: 13, color: MU, display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, cursor: isEditingOrtoTrata ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrata ? 1 : 0.6 }}>
                          <input disabled={!isEditingOrtoTrata} type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea disabled={!isEditingOrtoTrata} placeholder="Notas de aparatos..." value={planTrataForm.notas_aparatos || ''} onChange={e => handlePlanTrata('notas_aparatos', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '80px', resize: 'none' }} />

                    <SectionHeader title="Otros" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '15px' }}>
                      {renderSelectTrata('Técnica', 'tecnica', ['CCO', 'Roth', 'Estándar', 'Mbt', 'Autoligantes', 'Linguales'], isEditingOrtoTrata)}
                      {renderSelectTrata('Brackets', 'brackets', ['Brackets de acero', 'Brackets de porcelana', 'Brackets de porcelana superior y de acero inferiores'], isEditingOrtoTrata)}
                      {renderSelectTrata('Tubos adhesivos sup.', 'tubos_adh_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'], isEditingOrtoTrata)}
                      {renderSelectTrata('Tubos adhesivos inf.', 'tubos_adh_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'], isEditingOrtoTrata)}

                      {renderSelectTrata('Banda superior', 'banda_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'], isEditingOrtoTrata)}
                      {renderSelectTrata('Banda inferior', 'banda_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'], isEditingOrtoTrata)}
                      {renderSelectTrata('Tubos soldados sup.', 'tubos_sol_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'], isEditingOrtoTrata)}
                      {renderSelectTrata('Tubos soldados inf.', 'tubos_sol_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'], isEditingOrtoTrata)}

                      <div style={{ gridColumn: 'span 2' }}>
                        {renderSelectTrata('Extracciones', 'extracciones', ['Primeras premolares superiores e inferiores', 'Primeras premolares superiores', 'Primeras premolares superiores y segundas premolares inferiores'], isEditingOrtoTrata)}
                      </div>
                    </div>
                    <textarea disabled={!isEditingOrtoTrata} placeholder="Notas de la sección Otros..." value={planTrataForm.notas_otros || ''} onChange={e => handlePlanTrata('notas_otros', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '80px', resize: 'none', marginBottom: '30px' }} />

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...etiquetaDoc, marginBottom: 8 }}>Descripción</label>
                      <textarea disabled={!isEditingOrtoTrata} value={planTrataForm.descripcion_general || ''} onChange={e => handlePlanTrata('descripcion_general', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '100px', resize: 'none' }} />
                    </div>
                  </div>
                )}

                {subTabOrto === 'resumen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <OrtoHeader title="Resumen" isEditing={isEditingOrtoResumen} setIsEditing={setIsEditingOrtoResumen} onSave={handleSaveResumen} saving={savingResumen} onCancel={() => setIsEditingOrtoResumen(false)} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Fecha inicial</label>
                        <input disabled={!isEditingOrtoResumen} type="date" value={resumenForm.fecha_inicial || ''} onChange={e => handleResumen('fecha_inicial', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Fecha final</label>
                        <input disabled={!isEditingOrtoResumen} type="date" value={resumenForm.fecha_final || ''} onChange={e => handleResumen('fecha_final', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Tiempo estimado</label>
                        <div style={{ display: 'flex', border: '1px solid', borderColor: isEditingOrtoResumen ? BD : 'transparent', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                          <input disabled={!isEditingOrtoResumen} type="number" value={resumenForm.tiempo_estimado || ''} onChange={e => handleResumen('tiempo_estimado', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoResumen), border: 'none', borderRadius: 0, flex: 1 }} />
                          <div style={{ background: 'var(--surface-tertiary)', padding: '0 20px', display: 'flex', alignItems: 'center', color: MU, fontSize: 13, borderLeft: isEditingOrtoResumen ? `1px solid ${BD}` : 'none' }}>Meses</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Tipo de Brackets</label>
                        <select disabled={!isEditingOrtoResumen} value={resumenForm.tipo_brackets || ''} onChange={e => handleResumen('tipo_brackets', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)}>
                          <option value="">Seleccionar</option>
                          {['Bracket metálico', 'Bracket cerámico', 'Bracket zafiro', 'Bracket lingual', 'Bracket férulas', 'Bracket resina', 'Autoligante metálico', 'Autoligante estético', 'Iconix', 'Carriere slx 3D', 'Invisalign', 'Aliwell', 'Smartaligner', 'CCO system', 'Otros'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...etiquetaDoc, marginBottom: 8 }}>Diagnóstico</label>
                      <textarea disabled={!isEditingOrtoResumen} value={resumenForm.diagnostico || ''} onChange={e => handleResumen('diagnostico', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoResumen), height: '100px', resize: 'none' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Anclaje superior</label>
                        <select disabled={!isEditingOrtoResumen} value={resumenForm.anclaje_sup || ''} onChange={e => handleResumen('anclaje_sup', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...etiquetaDoc }}>Anclaje inferior</label>
                        <select disabled={!isEditingOrtoResumen} value={resumenForm.anclaje_inf || ''} onChange={e => handleResumen('anclaje_inf', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...etiquetaDoc, marginBottom: 8 }}>Nota</label>
                      <textarea disabled={!isEditingOrtoResumen} value={resumenForm.notas || ''} onChange={e => handleResumen('notas', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoResumen), height: '80px', resize: 'none' }} />
                    </div>
                  </div>
                )}

                {subTabOrto === 'fotografias' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', marginTop: '10px' }}>
                      <h3 style={{ color: DN, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Archivos Clínicos Iniciales</h3>
                      <div>
                        {savingFotosOrto && <span style={{ fontSize: 13.5, color: P, fontWeight: 600, marginRight: 10 }}>Subiendo...</span>}
                        <button onClick={() => setIsEditingOrtoFotos(!isEditingOrtoFotos)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isEditingOrtoFotos ? LT : 'var(--fill-tertiary)', color: isEditingOrtoFotos ? RJ : MU, border: `1px solid ${isEditingOrtoFotos ? `color-mix(in srgb, ${RJ} 35%, transparent)` : BD}`, borderRadius: 'var(--radius-sm)', padding: '10px 20px', minHeight: 40, fontWeight: 600, cursor: 'pointer', fontSize: 13.5 }}>
                          {isEditingOrtoFotos ? 'Cerrar Edición' : <><Icon name="edit" size={13} /> Editar Fotografías</>}
                        </button>
                      </div>
                    </div>

                    {ORTO_GRUPOS_FOTOS.map(grupo => {
                      const subidas = grupo.cajas.filter(c => !!fotosOrtoFirmadas[c.key]).length;
                      return (
                        <div key={grupo.titulo} style={{ marginBottom: 30 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: DN }}>{grupo.titulo}</span>
                            <span style={{ fontSize: 12, color: 'var(--label-tertiary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{subidas}/{grupo.cajas.length}</span>
                            <div style={{ flex: 1, height: 1, background: BD }} />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                            {grupo.cajas.map(item => {
                              // fotosOrtoFirmadas trae la urlFirmada para mostrar;
                              // fileData.url sigue siendo el localizador para borrar.
                              const fileData = fotosOrtoFirmadas[item.key];
                              const hasFile = !!fileData;
                              const esPerfil = item.key === CLAVE_FOTO_PERFIL;

                              return (
                                <div key={item.key} style={{ background: LT, border: `1px solid ${hasFile ? `color-mix(in srgb, ${P} 45%, transparent)` : BD}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)', transition: `border-color 150ms ${EASE}, box-shadow 150ms ${EASE}` }}>
                                  {hasFile && isEditingOrtoFotos && (
                                    <button onClick={() => handleDeleteFotoOrto(item.key, fileData.url)} style={{ position: 'absolute', top: 8, right: 8, background: RJ, color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 12, fontWeight: 600, cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} title="Eliminar">✕</button>
                                  )}

                                  <div style={{ height: '130px', background: hasFile ? '#000' : 'var(--surface-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    {hasFile ? (
                                      fileData.ext?.match(/(pdf|ppt|pptx)/i) ? (
                                        <a href={fileData.urlFirmada} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                          <Icon name="document" size={38} />
                                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Abrir {fileData.ext.toUpperCase()}</span>
                                        </a>
                                      ) : (
                                        <a href={fileData.urlFirmada} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                                          <img src={fileData.miniFirmada || fileData.urlFirmada} alt={item.key} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: esPerfil ? 'cover' : 'contain' }} />
                                        </a>
                                      )
                                    ) : (
                                      <Icon name={item.icon} size={34} color="var(--label-quaternary)" />
                                    )}

                                    {/* Reemplazar sin borrar primero: en modo edición, una foto ya
                                        subida también acepta un archivo nuevo encima. */}
                                    {isEditingOrtoFotos && (
                                      <label style={{ position: 'absolute', inset: 0, cursor: savingFotosOrto ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: `opacity 150ms ${EASE}`, background: `color-mix(in srgb, ${LT} 92%, transparent)` }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: P, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '7px', boxShadow: 'var(--shadow-sm)' }}>+</div>
                                        <span style={{ fontSize: 13, color: P, fontWeight: 600, textAlign: 'center', padding: '0 8px' }}>
                                          {hasFile ? 'Reemplazar' : 'Subir'} {item.key}
                                        </span>
                                        <input type="file" accept={item.accept} style={{ display: 'none' }} disabled={savingFotosOrto} onChange={e => handleUploadFotoOrto(e, item.key)} />
                                      </label>
                                    )}
                                  </div>

                                  <div style={{ padding: '12px 14px', borderTop: `1px solid ${BD}`, background: hasFile ? 'var(--accent-soft)' : LT }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: DN }}>{item.key}</div>
                                    <div style={{ fontSize: 12, color: hasFile ? P : 'var(--label-tertiary)', marginTop: '4px', fontWeight: hasFile ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                                      {hasFile ? `✓ Subido el ${fileData.date}` : (item.nota || 'Pendiente')}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {subTabOrto === 'controles' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', marginTop: '10px' }}>
                      <h3 style={{ color: DN, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Progreso del Tratamiento</h3>
                      <span style={{ fontSize: 13, color: MU, fontVariantNumeric: 'tabular-nums' }}>
                        {hitosProgresoConFotos.length} de {HITOS_PROGRESO.length} hitos con fotos
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--label-tertiary)', marginBottom: '16px', lineHeight: 1.5 }}>
                      Cada columna es un momento del tratamiento. Sube la misma toma (frontal, lateral, oclusal...) en cada hito y usa "Comparar" para ver el avance contra el Inicio.
                    </div>

                    <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
                      <div style={{ display: 'flex', gap: '14px', minWidth: HITOS_PROGRESO.length * 158 }}>
                        {HITOS_PROGRESO.map(hito => {
                          const esInicio = hito === 'Inicio';
                          const control = controlesFirmados.find(c => c.hito === hito);
                          // "Inicio" no tiene su propio control -- sus fotos son las de la
                          // pestaña Fotografías (fotosOrtoFirmadas), para que ambas pestañas
                          // queden siempre sincronizadas sin importar por dónde se suban.
                          const fotos = esInicio
                            ? Object.fromEntries(FILAS_PROGRESO.map(fila => [fila, fotosOrtoFirmadas[FILA_A_CAJA_FOTO[fila]]]).filter(([, v]) => v))
                            : (control?.fotos || {});
                          const cantidad = Object.keys(fotos).length;
                          const mitad = Math.ceil(FILAS_PROGRESO.length / 2);

                          return (
                            <div key={hito} style={{ flex: '0 0 150px', width: 150, background: LT, border: `1px solid ${cantidad > 0 ? `color-mix(in srgb, ${P} 45%, transparent)` : BD}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
                              <div style={{ padding: '11px 10px', textAlign: 'center', background: cantidad > 0 ? 'var(--accent-soft)' : 'var(--surface-tertiary)' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: DN }}>{hito}</div>
                                <div style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{cantidad}/{FILAS_PROGRESO.length} fotos</div>
                              </div>

                              {FILAS_PROGRESO.slice(0, mitad).map(fila => (
                                <CasillaFotoProgreso
                                  key={fila} fila={fila} foto={fotos[fila]}
                                  subiendo={esInicio ? savingFotosOrto : subiendoCasilla === `${hito}::${fila}`}
                                  onUpload={file => (esInicio ? handleUploadFotoOrtoFile(file, FILA_A_CAJA_FOTO[fila]) : subirFotoCasilla(hito, fila, file))}
                                  onDelete={() => (esInicio ? handleDeleteFotoOrto(FILA_A_CAJA_FOTO[fila], fotosOrto[FILA_A_CAJA_FOTO[fila]]?.url) : eliminarFotoCasilla(hito, fila))}
                                />
                              ))}

                              <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'center', borderTop: `1px solid ${BD}` }}>
                                {esInicio ? (
                                  <span style={{ fontSize: 11, color: 'var(--label-tertiary)', fontWeight: 600, textAlign: 'center', minHeight: 36, display: 'flex', alignItems: 'center' }}>Punto de partida</span>
                                ) : (
                                  <button
                                    onClick={() => setComparando(hito)}
                                    disabled={!inicioTieneFotos || cantidad === 0}
                                    style={{
                                      background: (!inicioTieneFotos || cantidad === 0) ? 'var(--fill-tertiary)' : P,
                                      color: (!inicioTieneFotos || cantidad === 0) ? 'var(--label-quaternary)' : '#fff',
                                      border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 10px', minHeight: 36, fontSize: 13, fontWeight: 600,
                                      cursor: (!inicioTieneFotos || cantidad === 0) ? 'not-allowed' : 'pointer', width: '100%',
                                    }}
                                  >
                                    Comparar
                                  </button>
                                )}
                              </div>

                              {FILAS_PROGRESO.slice(mitad).map(fila => (
                                <CasillaFotoProgreso
                                  key={fila} fila={fila} foto={fotos[fila]}
                                  subiendo={esInicio ? savingFotosOrto : subiendoCasilla === `${hito}::${fila}`}
                                  onUpload={file => (esInicio ? handleUploadFotoOrtoFile(file, FILA_A_CAJA_FOTO[fila]) : subirFotoCasilla(hito, fila, file))}
                                  onDelete={() => (esInicio ? handleDeleteFotoOrto(FILA_A_CAJA_FOTO[fila], fotosOrto[FILA_A_CAJA_FOTO[fila]]?.url) : eliminarFotoCasilla(hito, fila))}
                                />
                              ))}

                              <textarea
                                placeholder="Nota..."
                                defaultValue={control?.nota || ''}
                                onChange={e => actualizarNotaHito(hito, e.target.value)}
                                onBlur={guardarNotaHito}
                                style={{ margin: '8px 10px 10px', padding: '7px 9px', border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)', fontSize: 12, color: DN, background: LT, resize: 'none', height: '40px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {subTabOrto === 'bitacora' && (
                  <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: 30 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', marginTop: '10px' }}>
                      <h3 style={{ color: DN, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Controles Mensuales</h3>
                      <span style={{ fontSize: 13, color: MU, fontVariantNumeric: 'tabular-nums' }}>{bitacora.length} control{bitacora.length !== 1 ? 'es' : ''} registrado{bitacora.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Lo primero que se necesita al atender: qué se hizo la vez anterior. */}
                    {bitacora.length > 0 && (
                      <div style={{ background: 'var(--accent-soft)', border: `1px solid color-mix(in srgb, ${P} 25%, transparent)`, borderRadius: 'var(--radius-md)', padding: '16px 18px', marginBottom: '20px' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: P, letterSpacing: 0.4, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>ÚLTIMO CONTROL · {fmtFecha(bitacora[0].fecha)}</div>
                        <div style={{ fontSize: 15, color: DN, fontWeight: 500, lineHeight: 1.5 }}>{bitacora[0].procedimiento}</div>
                        {bitacora[0].observaciones && <div style={{ fontSize: 13, color: MU, marginTop: 6, lineHeight: 1.5 }}>{bitacora[0].observaciones}</div>}
                        {bitacora[0].proxima_cita && <div style={{ fontSize: 13, color: P, marginTop: 8, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>Próxima cita: {fmtFecha(bitacora[0].proxima_cita)}</div>}
                      </div>
                    )}

                    <div style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '24px' }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: DN, marginBottom: '14px' }}>
                        {editandoControl ? 'Editar control' : 'Registrar control del mes'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '150px 1fr 150px', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Fecha del control</label>
                          <input type="date" value={nuevoControl.fecha} onChange={e => setNuevoControl(p => ({ ...p, fecha: e.target.value }))} style={campoDoc} />
                        </div>
                        <div>
                          <label style={{ ...etiquetaDoc, marginBottom: 6 }}>¿Qué se hizo?</label>
                          <input placeholder="Ej: cambio de ligas, activación de arco superior 016..." value={nuevoControl.procedimiento} onChange={e => setNuevoControl(p => ({ ...p, procedimiento: e.target.value }))} style={campoDoc} />
                        </div>
                        <div>
                          <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Próxima cita</label>
                          <input type="date" value={nuevoControl.proxima_cita} onChange={e => setNuevoControl(p => ({ ...p, proxima_cita: e.target.value }))} style={campoDoc} />
                        </div>
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Observaciones (opcional)</label>
                        <textarea placeholder="Evolución, indicaciones al paciente, pendientes para el próximo control..." value={nuevoControl.observaciones} onChange={e => setNuevoControl(p => ({ ...p, observaciones: e.target.value }))} style={{ ...campoDoc, height: '68px', resize: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={agregarControlMensual} disabled={savingBitacora} style={{ background: savingBitacora ? 'var(--label-quaternary)' : P, color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px 22px', minHeight: 44, fontWeight: 600, fontSize: 15, cursor: savingBitacora ? 'not-allowed' : 'pointer' }}>
                          {savingBitacora ? 'Guardando...' : (editandoControl ? 'Guardar cambios' : '+ Agregar control')}
                        </button>
                        {editandoControl && (
                          <button onClick={() => { setEditandoControl(null); setNuevoControl(controlVacio()); }} style={{ background: LT, color: MU, border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)', padding: '11px 18px', minHeight: 44, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: 15, fontWeight: 600, color: DN, marginBottom: '12px' }}>Historial de controles</div>
                    {bitacora.length === 0 && (
                      <div style={{ fontSize: 13.5, color: 'var(--label-tertiary)', padding: '28px 0', textAlign: 'center', lineHeight: 1.5 }}>
                        Todavía no hay controles registrados. Registra el primero para ir llevando mes a mes lo que se hace.
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {bitacora.map((b, i) => (
                        <div key={b.id} style={{ display: 'flex', gap: '14px', background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                          <div style={{ width: 84, flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: P, fontVariantNumeric: 'tabular-nums' }}>{fmtFecha(b.fecha)}</div>
                            <div style={{ fontSize: 11, color: 'var(--label-tertiary)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>Control {bitacora.length - i}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, color: DN, fontWeight: 500, lineHeight: 1.5 }}>{b.procedimiento}</div>
                            {b.observaciones && <div style={{ fontSize: 13, color: MU, marginTop: 5, lineHeight: 1.5 }}>{b.observaciones}</div>}
                            {b.proxima_cita && <div style={{ fontSize: 12, color: P, marginTop: 6, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>Próxima cita: {fmtFecha(b.proxima_cita)}</div>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => editarControlMensual(b)} title="Editar" style={{ background: 'none', border: 'none', color: 'var(--label-tertiary)', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="edit" size={15} />
                            </button>
                            <button onClick={() => eliminarControlMensual(b.id)} title="Eliminar" style={{ background: 'none', border: 'none', color: 'var(--label-tertiary)', cursor: 'pointer', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subTabOrto === 'pagos' && (() => {
                  const r = resumenPagos(pagos, fechaInicioTrata);
                  return (
                    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: 30 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', marginTop: '10px' }}>
                        <h3 style={{ color: DN, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Pagos del tratamiento</h3>
                        {r.deuda !== null && (
                          <span style={{
                            fontSize: 13, fontWeight: 600, padding: '5px 13px', borderRadius: 'var(--radius-lg)',
                            background: r.deuda > 0 ? 'var(--red-soft)' : 'var(--green-soft)',
                            color: r.deuda > 0 ? RJ : WA, fontVariantNumeric: 'tabular-nums',
                          }}>
                            {r.deuda > 0 ? `Debe ${fmtSoles(r.deuda)}` : 'Al día'}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px', marginBottom: '22px' }}>
                        {[
                          { lbl: 'Pago inicial', val: r.pagoInicial > 0 ? fmtSoles(r.pagoInicial) : '—', col: DN },
                          { lbl: 'Cuota mensual', val: r.cuota > 0 ? fmtSoles(r.cuota) : '—', col: P },
                          { lbl: 'Costo total acumulado', val: fmtSoles(r.acumulado), col: DN },
                          { lbl: 'Por cobrar', val: r.deuda !== null ? fmtSoles(r.deuda) : '—', col: r.deuda > 0 ? RJ : WA },
                        ].map(s => (
                          <div key={s.lbl} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                            <div style={{ fontSize: 11, color: 'var(--label-tertiary)', fontWeight: 600, letterSpacing: 0.3, marginBottom: 6 }}>{s.lbl.toUpperCase()}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: s.col, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '22px' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: DN, marginBottom: '6px' }}>Condiciones del tratamiento</div>
                        <div style={{ fontSize: 13, color: 'var(--label-tertiary)', marginBottom: '16px', lineHeight: 1.5 }}>
                          No se pacta un costo total de entrada: se va acumulando control a control. El pago inicial se cobra una sola vez, el mes que arranca el tratamiento.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: '14px' }}>
                          <div>
                            <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Pago inicial (S/)</label>
                            <input type="number" min="0" step="0.01" placeholder="0.00" value={pagos.pago_inicial}
                              onChange={e => setPagos(p => ({ ...p, pago_inicial: e.target.value }))}
                              onBlur={() => guardarConfigPagos(pagos)} style={campoDoc} />
                          </div>
                          <div>
                            <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Cuota mensual fija (S/)</label>
                            <input type="number" min="0" step="0.01" placeholder="0.00" value={pagos.cuota_mensual}
                              onChange={e => setPagos(p => ({ ...p, cuota_mensual: e.target.value }))}
                              onBlur={() => guardarConfigPagos(pagos)} style={campoDoc} />
                          </div>
                        </div>
                        {r.esperado !== null && (
                          <div style={{ fontSize: 13, color: MU, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BD}`, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }}>
                            A la fecha debería estar cobrado <strong style={{ color: DN, fontWeight: 600 }}>{fmtSoles(r.esperado)}</strong>
                            {' '}— pago inicial + {r.meses} {r.meses === 1 ? 'cuota' : 'cuotas'} desde el {fmtFecha(fechaInicioTrata)}.
                          </div>
                        )}
                      </div>

                      <div style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '24px' }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: DN, marginBottom: '14px' }}>Registrar pago</div>
                        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : '140px 130px 1fr 150px', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Fecha</label>
                            <input type="date" value={nuevoAbono.fecha} onChange={e => setNuevoAbono(p => ({ ...p, fecha: e.target.value }))} style={campoDoc} />
                          </div>
                          <div>
                            <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Monto (S/)</label>
                            <input type="number" min="0" step="0.01" placeholder="0.00" value={nuevoAbono.monto} onChange={e => setNuevoAbono(p => ({ ...p, monto: e.target.value }))} style={campoDoc} />
                          </div>
                          <div>
                            <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Tipo</label>
                            {/* Al elegir el tipo se propone el monto pactado, para no
                                tener que recordarlo en cada control. */}
                            <select value={nuevoAbono.tipo} style={campoDoc}
                              onChange={e => {
                                const tipo = e.target.value;
                                const sugerido = tipo === 'inicial' ? r.pagoInicial : tipo === 'cuota' ? r.cuota : 0;
                                setNuevoAbono(p => ({ ...p, tipo, monto: sugerido > 0 ? String(sugerido) : p.monto }));
                              }}>
                              {TIPOS_ABONO.map(t => <option key={t.id} value={t.id}>{t.lbl}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Método</label>
                            <select value={nuevoAbono.metodo} onChange={e => setNuevoAbono(p => ({ ...p, metodo: e.target.value }))} style={campoDoc}>
                              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                          <label style={{ ...etiquetaDoc, marginBottom: 6 }}>Concepto {nuevoAbono.tipo === 'extra' ? '(qué extra se cobró)' : '(opcional)'}</label>
                          <input
                            placeholder={nuevoAbono.tipo === 'extra' ? 'Ej: reposición de bracket, aparato de contención...'
                              : nuevoAbono.tipo === 'inicial' ? 'Ej: cuota inicial del tratamiento'
                              : 'Ej: cuota de agosto'}
                            value={nuevoAbono.concepto} onChange={e => setNuevoAbono(p => ({ ...p, concepto: e.target.value }))} style={campoDoc} />
                        </div>
                        <button onClick={agregarAbono} disabled={savingAbono} style={{ background: savingAbono ? 'var(--label-quaternary)' : WA, color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px 22px', minHeight: 44, fontWeight: 600, fontSize: 15, cursor: savingAbono ? 'not-allowed' : 'pointer' }}>
                          {savingAbono ? 'Guardando...' : '+ Registrar pago'}
                        </button>
                      </div>

                      <div style={{ fontSize: 15, fontWeight: 600, color: DN, marginBottom: '12px' }}>Historial de pagos</div>
                      {r.abonos.length === 0 && (
                        <div style={{ fontSize: 13.5, color: 'var(--label-tertiary)', padding: '28px 0', textAlign: 'center', lineHeight: 1.5 }}>Todavía no hay pagos registrados para este tratamiento.</div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {r.abonos.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)', padding: '12px 16px', minHeight: 44 }}>
                            <div style={{ width: 84, flexShrink: 0, fontSize: 13, fontWeight: 500, color: MU, fontVariantNumeric: 'tabular-nums' }}>{fmtFecha(a.fecha)}</div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: WA, width: 100, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtSoles(a.monto)}</div>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-lg)', background: tipoAbono(a.tipo).bg, color: tipoAbono(a.tipo).color, flexShrink: 0 }}>
                              {tipoAbono(a.tipo).corto}
                            </span>
                            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.metodo}{a.concepto ? ` · ${a.concepto}` : ''}
                            </div>
                            <button onClick={() => eliminarAbono(a.id)} title="Eliminar pago" style={{ background: 'none', border: 'none', color: 'var(--label-tertiary)', cursor: 'pointer', flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {r.abonos.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', marginTop: 4, borderTop: `1px solid var(--separator-strong)` }}>
                          <div style={{ width: 84, flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--label-tertiary)', letterSpacing: 0.3 }}>TOTAL</div>
                          <div style={{ fontSize: 17, fontWeight: 600, color: DN, fontVariantNumeric: 'tabular-nums' }}>{fmtSoles(r.acumulado)}</div>
                          <div style={{ fontSize: 12, color: 'var(--label-tertiary)', fontVariantNumeric: 'tabular-nums' }}>en {r.abonos.length} pago{r.abonos.length !== 1 ? 's' : ''}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {comparando && (
                  <ModalComparacionProgreso
                    hito={comparando}
                    inicio={{
                      hito: 'Inicio',
                      fotos: Object.fromEntries(FILAS_PROGRESO.map(fila => [fila, fotosOrtoFirmadas[FILA_A_CAJA_FOTO[fila]]]).filter(([, v]) => v)),
                    }}
                    comparado={controlesFirmados.find(c => c.hito === comparando)}
                    filas={FILAS_PROGRESO}
                    onClose={() => setComparando(null)}
                  />
                )}

              </div>
            </div>
          </div>
  );
}

// ─── VISTA PRINCIPAL: galería de pacientes en tratamiento ────────────────────
// Dos momentos: primero la galería (foto + nombre + estado de pago de cada
// paciente, más los ingresos del mes de toda la ortodoncia); al hacer click en
// una tarjeta se abre el detalle con todas las secciones del paciente.
export default function Ortodoncia({ clinicaId, setView, patient }) {
  const { isTablet } = useResponsive();
  const [pacientesOrto, setPacientesOrto] = useState([]);
  const [todosPacientes, setTodosPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  // `undefined` = todavía no eligió nada acá (vale el paciente con el que
  // abrieron la vista, si vino uno); `null` = volvió a propósito a la galería.
  const [seleccionado, setSeleccionado] = useState(undefined);
  const [showIniciar, setShowIniciar] = useState(false);
  const [busquedaIniciar, setBusquedaIniciar] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargarTodo = async () => {
      setLoading(true);
      const [{ data: ortoRows }, { data: pacientes }] = await Promise.all([
        supabase.from('ortodoncia').select('id, paciente_id, fotografias, pagos, plan_tratamiento, resumen'),
        supabase.from('pacientes').select('id, name, doc'),
      ]);
      if (!vivo) return;

      const pacientesPorId = Object.fromEntries((pacientes || []).map(p => [p.id, p]));
      // La foto de la tarjeta es la "Foto de perfil" del expediente, o la mejor
      // extraoral disponible si todavía no se eligió una (ver fotoFicha).
      const conTratamiento = (ortoRows || [])
        .filter(o => pacientesPorId[o.paciente_id])
        .map(o => {
          const foto = fotoFicha(o.fotografias);
          return {
            ...pacientesPorId[o.paciente_id],
            ortodonciaId: o.id,
            pagos: o.pagos || {},
            fechaInicio: o.plan_tratamiento?.fecha_inicial || o.resumen?.fecha_inicial || '',
            rutaFoto: foto ? (foto.thumb || foto.url) : null,
            fotoPerfil: null,
          };
        });

      // Se pinta la lista ya, con nombres, pagos e iniciales: firmar las fotos
      // son viajes extra a Storage y antes la galería entera los esperaba.
      setPacientesOrto(conTratamiento);
      setTodosPacientes(pacientes || []);
      setLoading(false);

      const rutas = conTratamiento.map(p => p.rutaFoto).filter(Boolean);
      if (rutas.length === 0) return;
      const firmas = await firmarVarias(rutas);
      if (!vivo) return;
      setPacientesOrto(prev => prev.map(p => (
        p.rutaFoto ? { ...p, fotoPerfil: firmas.get(rutaDesdeUrl(p.rutaFoto)) || null } : p
      )));
    };
    cargarTodo();
    return () => { vivo = false; };
  }, []);

  const iniciarTratamiento = useCallback(async (paciente) => {
    setIniciando(true);
    try {
      const { data, error } = await supabase
        .from('ortodoncia')
        .insert([{ paciente_id: paciente.id, clinica_id: clinicaId }])
        .select().single();
      if (error) throw error;
      const nuevo = { ...paciente, ortodonciaId: data.id, pagos: {}, fechaInicio: '', rutaFoto: null, fotoPerfil: null };
      setPacientesOrto(prev => [...prev, nuevo]);
      setSeleccionado(nuevo);
      setShowIniciar(false);
      setBusquedaIniciar('');
    } catch (err) {
      alert('Error al iniciar el tratamiento: ' + err.message);
    } finally {
      setIniciando(false);
    }
  }, [clinicaId]);

  // El detalle avisa cuando cambia algo que la galería muestra (pagos, foto de
  // perfil) para que no quede desactualizada hasta el próximo refresh.
  const onPacienteActualizado = useCallback((pacienteId, parcial) => {
    setPacientesOrto(prev => prev.map(p => (p.id === pacienteId ? { ...p, ...parcial } : p)));
  }, []);

  const disponibles = todosPacientes.filter(p =>
    !pacientesOrto.some(o => o.id === p.id) &&
    (normalizarTexto(p.name).includes(normalizarTexto(busquedaIniciar)) || (p.doc || '').includes(busquedaIniciar))
  );

  const visibles = pacientesOrto.filter(p =>
    normalizarTexto(p.name).includes(normalizarTexto(busqueda)) || (p.doc || '').includes(busqueda)
  );

  // Ingresos de ortodoncia del mes en curso. "Cobrado" suma todos los pagos
  // fechados este mes sin importar el tipo, así que una cuota inicial se suma a
  // las cuotas mensuales del mismo mes, y lo mismo con los extras.
  const resumenes = pacientesOrto.map(p => resumenPagos(p.pagos, p.fechaInicio));
  const cuotasDelMes = resumenes.reduce((s, r) => s + r.cuota, 0);
  const cobradoEsteMes = pacientesOrto.reduce((s, p) =>
    s + (p.pagos?.abonos || []).filter(a => mismoMesQueHoy(a.fecha)).reduce((t, a) => t + (Number(a.monto) || 0), 0), 0);
  const porCobrar = resumenes.reduce((s, r) => s + (r.deuda || 0), 0);
  const mesActualNombre = new Date().toLocaleDateString('es-PE', { month: 'long' });

  // Salta al Historial con este paciente ya abierto, para no tener que buscarlo
  // de nuevo a mano cuando hace falta ver su historia odontológica completa.
  const irAHistoriaClinica = (paciente) => setView?.('expediente', paciente);

  // Si llegaron acá desde el botón "Ortodoncia" del Historial, se abre directo
  // su tratamiento. Se resuelve contra `pacientesOrto` porque las tarjetas
  // llevan datos que la otra vista no tiene (pagos, fecha de inicio, foto).
  const pacienteActivo = seleccionado !== undefined
    ? seleccionado
    : (patient?.id ? pacientesOrto.find(p => p.id === patient.id) ?? null : null);

  // ── MOMENTO 2: detalle completo del paciente ──
  if (pacienteActivo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', minHeight: 0 }}>
        <div style={{ padding: '14px 24px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSeleccionado(null)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)', padding: '9px 16px', minHeight: 40, fontSize: 13.5, fontWeight: 600, color: DN, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Volver a pacientes
          </button>
          <button
            onClick={() => irAHistoriaClinica(pacienteActivo)}
            title={`Abrir la historia odontológica de ${pacienteActivo.name} en Historial`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)', padding: '9px 16px', minHeight: 40, fontSize: 13.5, fontWeight: 600, color: P, cursor: 'pointer' }}
          >
            <Icon name="document" size={15} />
            Historia odontológica
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <OrtodonciaDetalle patient={pacienteActivo} clinicaId={clinicaId} onPacienteActualizado={onPacienteActualizado} />
        </div>
      </div>
    );
  }

  // ── MOMENTO 1: galería de pacientes ──
  return (
    <div style={{ padding: 24, boxSizing: 'border-box', height: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, color: DN, letterSpacing: '-0.02em' }}>Pacientes en ortodoncia</div>
          <div style={{ fontSize: 13, color: MU, marginTop: 3 }}>Selecciona un paciente para ver todo su tratamiento</div>
        </div>
        <button
          onClick={() => setShowIniciar(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: P, color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '11px 20px', minHeight: 44, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          <Icon name="plus" size={15} /> Iniciar tratamiento
        </button>
      </div>

      {/* Mismo componente Stat que usan Dashboard/Reportes/Caja/Laboratorio,
          no una tarjeta hecha a mano con otro lenguaje visual. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <Stat label="En tratamiento" value={String(pacientesOrto.length)} col={DN} sub="pacientes activos" subCol={MU} icon={<Icon name="users" size={15} />} />
        <Stat label={`Cobrado en ${mesActualNombre}`} value={fmtSoles(cobradoEsteMes)} col={WA} sub="cuotas iniciales + mensuales + extras" subCol={MU} icon={<Icon name="checkCircle" size={15} />} />
        <Stat label="Cuotas mensuales" value={fmtSoles(cuotasDelMes)} col={P} sub="lo recurrente pactado por mes" subCol={MU} icon={<Icon name="calendar" size={15} />} />
        <Stat label="Por cobrar" value={fmtSoles(porCobrar)} col={porCobrar > 0 ? RJ : WA} sub="atrasos acumulados a la fecha" subCol={MU} icon={<Icon name="clock" size={15} />} />
      </div>

      {pacientesOrto.length > 0 && (
        <input
          placeholder="Buscar paciente por nombre o DNI..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', maxWidth: 340, padding: '11px 14px', minHeight: 40, borderRadius: 'var(--radius-sm)', border: `1px solid ${BD}`, background: LT, color: DN, fontSize: 15, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }}
        />
      )}

      {loading && <div style={{ fontSize: 15, color: MU, textAlign: 'center', padding: 40 }}>Cargando pacientes...</div>}

      {!loading && pacientesOrto.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: 'var(--radius-md)' }}>
          <Icon name="camera" size={34} color="var(--label-quaternary)" />
          <div style={{ fontSize: 17, fontWeight: 600, color: DN, marginTop: 14, marginBottom: 6 }}>Ningún paciente en tratamiento</div>
          <div style={{ fontSize: 13.5, color: MU }}>Usa "Iniciar tratamiento" para agregar el primero.</div>
        </div>
      )}

      {!loading && pacientesOrto.length > 0 && visibles.length === 0 && (
        <div style={{ fontSize: 13.5, color: MU, textAlign: 'center', padding: 30 }}>Ningún paciente coincide con la búsqueda.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? 'repeat(auto-fill, minmax(150px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, paddingBottom: 30 }}>
        {visibles.map(p => {
          const r = resumenPagos(p.pagos, p.fechaInicio);
          return (
            <div
              key={p.id}
              onClick={() => setSeleccionado(p)}
              style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 'var(--radius-md)', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)', transition: `transform 150ms ${EASE}, box-shadow 150ms ${EASE}` }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <div style={{ aspectRatio: '1 / 1', background: p.fotoPerfil ? '#000' : 'var(--fill-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.fotoPerfil ? (
                  <img src={p.fotoPerfil} alt={p.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: LT, color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 20 }}>
                    {ini(p.name)}
                  </div>
                )}
              </div>
              <div style={{ padding: '12px 14px 14px' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: MU, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>DNI {p.doc || '---'}</div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* "Al día" solo se puede afirmar si hay fecha de inicio y algo
                      pactado; sin eso, lo honesto es no arriesgar un estado. */}
                  <div>
                    {r.deuda === null ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-lg)', background: 'var(--fill-tertiary)', color: MU }}>Sin plan de pago</span>
                    ) : r.deuda > 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-lg)', background: 'var(--red-soft)', color: RJ, fontVariantNumeric: 'tabular-nums' }}>Debe {fmtSoles(r.deuda)}</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-lg)', background: 'var(--green-soft)', color: WA }}>Al día</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: MU, fontVariantNumeric: 'tabular-nums' }}>
                    Histórico: <strong style={{ color: DN, fontWeight: 600 }}>{fmtSoles(r.acumulado)}</strong>
                  </div>
                  {/* stopPropagation: la tarjeta entera abre el expediente de
                      ortodoncia, este botón lleva al historial general. */}
                  <button
                    onClick={e => { e.stopPropagation(); irAHistoriaClinica(p); }}
                    title={`Abrir la historia odontológica de ${p.name} en Historial`}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, background: 'var(--surface-tertiary)', border: `1px solid ${BD}`, borderRadius: 'var(--radius-sm)', padding: '8px 10px', minHeight: 36, fontSize: 12, fontWeight: 600, color: P, cursor: 'pointer', width: '100%', transition: `background 150ms ${EASE}` }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-tertiary)'; }}
                  >
                    <Icon name="document" size={13} />
                    Historia odontológica
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showIniciar && (
        <Modal background="rgba(17,24,39,0.45)" overlayStyle={{ padding: 24 }}
          cardStyle={{ background: LT, borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420, maxHeight: '80dvh', display: 'flex', flexDirection: 'column', border: `1px solid ${BD}` }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: DN, letterSpacing: '-0.01em' }}>Iniciar tratamiento de ortodoncia</span>
            <button onClick={() => setShowIniciar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MU, fontSize: 22, lineHeight: 1, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
            <input
              autoFocus
              placeholder="Buscar paciente por nombre o DNI..."
              value={busquedaIniciar}
              onChange={e => setBusquedaIniciar(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', minHeight: 40, borderRadius: 'var(--radius-sm)', border: `1px solid ${BD}`, background: LT, color: DN, fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />
            {disponibles.length === 0 && (
              <div style={{ fontSize: 13.5, color: MU, textAlign: 'center', padding: '16px 0', lineHeight: 1.5 }}>
                {busquedaIniciar ? 'Ningún paciente coincide.' : 'Todos los pacientes ya están en tratamiento, o no hay pacientes registrados.'}
              </div>
            )}
            {disponibles.slice(0, 30).map(p => (
              <div
                key={p.id}
                onClick={() => !iniciando && iniciarTratamiento(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', minHeight: 44, borderRadius: 'var(--radius-sm)', cursor: iniciando ? 'not-allowed' : 'pointer', transition: `background 150ms ${EASE}` }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--fill-quaternary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--fill-tertiary)', color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                  {ini(p.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: MU, fontVariantNumeric: 'tabular-nums' }}>DNI {p.doc || '---'}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
