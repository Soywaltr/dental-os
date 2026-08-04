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
import {
  labelStyleDoc, inputStyleDoc, P, BD, DN, MU,
  GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW
} from '../../utils/constants';
import { ini, normalizarTexto } from '../../utils/helpers';
import useResponsive from '../../utils/useResponsive';
import { BUCKET, rutaFotoOrto, rutaDesdeUrl, firmar } from '../../utils/storage';

// ─── COMPARADOR DESLIZANTE (antes/después con fotos reales del paciente) ─────
// Arrastra el separador para revelar "después" sobre "antes" -- ambas son
// fotos reales del paciente (no hay nada generado acá), solo una forma más
// interactiva de mostrar el mismo par de fotos que ya se ve en la grilla.
function ComparadorDeslizante({ antes, despues, labelAntes = 'Antes', labelDespues = 'Después' }) {
  const [pos, setPos] = useState(50);

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
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 14, overflow: 'hidden', userSelect: 'none', background: '#000', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
      <img src={despues} alt={labelDespues} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={antes} alt={labelAntes} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, pointerEvents: 'none' }}>{labelAntes}</div>
      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, pointerEvents: 'none' }}>{labelDespues}</div>
    </div>
  );
}

// ─── DETALLE DE ORTODONCIA (un paciente ya en tratamiento) ───────────────────
function OrtodonciaDetalle({ patient, clinicaId }) {
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
      const entradas = await Promise.all(
        Object.entries(fotosOrto || {}).map(async ([clave, dato]) =>
          [clave, { ...dato, urlFirmada: await firmar(dato.url) }]
        )
      );
      if (vivo) setFotosOrtoFirmadas(Object.fromEntries(entradas));
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

  // Guarda el objeto completo de fotografías de ortodoncia (mismo patrón sin-UNIQUE que genericSaveOrto)
  const guardarFotografiasOrto = async (nuevoObjetoFotos) => {
    const { data: existe, error: fetchError } = await supabase
      .from('ortodoncia')
      .select('id')
      .eq('paciente_id', patient.id)
      .maybeSingle();
    if (fetchError) throw fetchError;

    if (existe) {
      const { error } = await supabase.from('ortodoncia').update({ fotografias: nuevoObjetoFotos }).eq('id', existe.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('ortodoncia').insert([{ paciente_id: patient.id, clinica_id: clinicaId, fotografias: nuevoObjetoFotos }]);
      if (error) throw error;
    }
  };

  const handleUploadFotoOrto = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingFotosOrto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = rutaFotoOrto(clinicaId, patient.id, file.name);
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file);
      if (uploadError) throw uploadError;
      // Igual que en las imágenes de historia: se guarda la ruta, no la URL.
      const nuevoObjetoFotos = { ...fotosOrto, [key]: { url: fileName, ext: fileExt, date: new Date().toLocaleDateString('es-PE') } };
      await guardarFotografiasOrto(nuevoObjetoFotos);
      setFotosOrto(nuevoObjetoFotos);
    } catch (err) {
      alert('Error al subir el archivo: ' + err.message);
    } finally {
      setSavingFotosOrto(false);
    }
  };

  const handleDeleteFotoOrto = async (key, url) => {
    if (!window.confirm('¿Eliminar este archivo permanentemente?')) return;
    setSavingFotosOrto(true);
    try {
      await supabase.storage.from(BUCKET).remove([rutaDesdeUrl(url)]);
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
      setVistasPrevia([]);

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
          if (data.vistas_previa) setVistasPrevia(data.vistas_previa);
        }
      };
      cargarDatosOrto();
    }
  }, [patient]);
  
  // FUNCIONES AYUDANTES UI INTERNAS
  const getOrtoStyle = (isEditing) => ({
    ...inputStyleDoc,
    background: isEditing ? '#fff' : '#f1f5f9', // Blanco al editar, gris sutil al bloquear
    borderColor: '#cbd5e1', // El borde se mantiene SIEMPRE visible
    cursor: isEditing ? 'auto' : 'not-allowed', // Muestra el cursor de "prohibido" si está bloqueado
    color: '#0f172a', // El texto se mantiene siempre oscuro y legible
    fontWeight: '500', 
    opacity: 1, 
    WebkitTextFillColor: '#0f172a', // Fuerza a Safari/iOS a no opacar el texto
    
    // Eliminamos el truco de "appearance: none" para que la flecha del select vuelva a aparecer.
  });

  const OrtoHeader = ({ title, isEditing, setIsEditing, onSave, saving, onCancel }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', marginTop: '10px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
      <h2 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 700 }}>{title}</h2>
      <div>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 16px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}>
            {/* ICONO LÁPIZ PREMIUM SVG */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Editar Sección
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onCancel} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
            <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0087b3', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 4px rgba(0,135,179,0.2)' }}>
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
    <div style={{ color: '#0087b3', fontSize: '14px', fontWeight: 700, marginTop: '30px', marginBottom: '15px' }}>{title}</div>
  );

  const renderSelectOrto = (label, field, options, isEditing, hasNote = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select disabled={!isEditing} value={ortoForm[field] || ''} onChange={e => handleOrto(field, e.target.value)} style={getOrtoStyle(isEditing)}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasNote && <input disabled={!isEditing} placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...getOrtoStyle(isEditing), fontStyle: 'italic', height: '36px', marginTop: '4px' }} />}
    </div>
  );

  const renderSelectTrata = (label, field, options, isEditing) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select disabled={!isEditing} value={planTrataForm[field] || ''} onChange={e => handlePlanTrata(field, e.target.value)} style={getOrtoStyle(isEditing)}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const renderIntraRow = (label, field, opts, isEditing) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9', gap: '20px', width: '100%' }}>
      <div style={{ width: '180px', minWidth: '180px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', gap: '15px', flexShrink: 0, alignItems: 'center' }}>
        {opts.map(opt => {
          const isChecked = ortoForm[`${field}_${opt}`];
          return (
            <label key={opt} style={{ 
              fontSize: '12.5px', 
              color: isChecked ? '#334155' : '#94a3b8', // Color más sutil si está marcado
              fontWeight: 500, // Quitamos la negrita pesada
              display: 'flex', alignItems: 'center', gap: '6px', 
              cursor: isEditing ? 'pointer' : 'default',
              opacity: 1
            }}>
              <input disabled={!isEditing} type="checkbox" checked={isChecked || false} onChange={e => handleOrto(`${field}_${opt}`, e.target.checked)} style={{ cursor: isEditing ? 'pointer' : 'default', accentColor: '#0087b3' }} />
              {opt}
            </label>
          );
        })}
      </div>
      <div style={{ flex: 1, minWidth: '100px' }}>
        <input disabled={!isEditing} placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...getOrtoStyle(isEditing), height: '34px', padding: '4px 12px' }} />
      </div>
    </div>
  );

  // --- CONTROLES MENSUALES (progreso mes a mes, con fotos antes/después) ---
  const [controles, setControles] = useState([]);
  // Igual que fotosOrtoFirmadas: cada control con sus fotos ya con URL firmada.
  const [controlesFirmados, setControlesFirmados] = useState([]);
  const [savingControl, setSavingControl] = useState(false);
  const [nuevaFechaControl, setNuevaFechaControl] = useState(() => new Date().toISOString().slice(0, 10));
  const [nuevaNotaControl, setNuevaNotaControl] = useState('');
  const [nuevasFotosControl, setNuevasFotosControl] = useState([]);
  const [compararA, setCompararA] = useState(null);
  const [compararB, setCompararB] = useState(null);

  useEffect(() => {
    let vivo = true;
    const resolver = async () => {
      const firmados = await Promise.all((controles || []).map(async (c) => ({
        ...c,
        fotos: await Promise.all((c.fotos || []).map(async (f) => ({ ...f, urlFirmada: await firmar(f.url) }))),
      })));
      if (vivo) setControlesFirmados(firmados);
    };
    resolver();
    return () => { vivo = false; };
  }, [controles]);

  // Por defecto compara el primer control contra el más reciente -- el
  // usuario puede cambiar cualquiera de los dos con los selects.
  useEffect(() => {
    if (controles.length >= 2) {
      setCompararA(prev => (prev !== null && prev < controles.length ? prev : 0));
      setCompararB(prev => (prev !== null && prev < controles.length ? prev : controles.length - 1));
    }
  }, [controles.length]);

  const guardarControles = async (nuevosControles) => {
    const { data: existe, error: fetchError } = await supabase
      .from('ortodoncia').select('id').eq('paciente_id', patient.id).maybeSingle();
    if (fetchError) throw fetchError;
    if (existe) {
      const { error } = await supabase.from('ortodoncia').update({ controles: nuevosControles }).eq('id', existe.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('ortodoncia').insert([{ paciente_id: patient.id, clinica_id: clinicaId, controles: nuevosControles }]);
      if (error) throw error;
    }
  };

  const agregarControl = async () => {
    if (!nuevaFechaControl) { alert('Selecciona la fecha del control.'); return; }
    setSavingControl(true);
    try {
      const fotosSubidas = [];
      for (const file of nuevasFotosControl) {
        const fileName = rutaFotoOrto(clinicaId, patient.id, file.name);
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file);
        if (uploadError) throw uploadError;
        fotosSubidas.push({ url: fileName, nombre: file.name, date: new Date().toLocaleDateString('es-PE') });
      }
      const nuevoControl = { id: `${Date.now()}`, fecha: nuevaFechaControl, nota: nuevaNotaControl, fotos: fotosSubidas };
      const nuevosControles = [...controles, nuevoControl].sort((a, b) => a.fecha.localeCompare(b.fecha));
      await guardarControles(nuevosControles);
      setControles(nuevosControles);
      setNuevaFechaControl(new Date().toISOString().slice(0, 10));
      setNuevaNotaControl('');
      setNuevasFotosControl([]);
    } catch (err) {
      alert('Error al guardar el control: ' + err.message);
    } finally {
      setSavingControl(false);
    }
  };

  const eliminarControl = async (id) => {
    if (!window.confirm('¿Eliminar este control y sus fotos?')) return;
    const control = controles.find(c => c.id === id);
    try {
      if (control) {
        await Promise.all((control.fotos || []).map(f => supabase.storage.from(BUCKET).remove([rutaDesdeUrl(f.url)])));
      }
      const nuevosControles = controles.filter(c => c.id !== id);
      await guardarControles(nuevosControles);
      setControles(nuevosControles);
    } catch (err) {
      alert('Error al eliminar el control: ' + err.message);
    }
  };

  // --- VISTA PREVIA DE SONRISA (IA) --------------------------------------
  // OJO: esto es una aproximación ilustrativa generada por IA a partir de una
  // sola foto -- NO es una simulación clínica real (eso requeriría un scanner
  // 3D como iTero, no fotos de celular). Se muestra siempre con esa
  // aclaración visible, nunca como si fuera un resultado garantizado.
  const [vistasPrevia, setVistasPrevia] = useState([]);
  const [vistasPreviaFirmadas, setVistasPreviaFirmadas] = useState([]);
  const [fotoOrigenIA, setFotoOrigenIA] = useState('');
  const [generandoIA, setGenerandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState('');
  // Fotos subidas directo acá (sin pasar por Fotografías ni Controles) --
  // se guardan en el mismo bucket, solo para no obligar a subir la foto en
  // otra pestaña antes de poder usarla.
  const [fotosSubidasIA, setFotosSubidasIA] = useState([]);
  const [subiendoFotoIA, setSubiendoFotoIA] = useState(false);

  // Fotos disponibles como origen: las subidas acá + las de Fotografías + la primera de cada control.
  const fotosDisponiblesIA = [
    ...fotosSubidasIA.map(f => ({ ruta: f.ruta, etiqueta: `Subida: ${f.nombre}` })),
    ...Object.entries(fotosOrto || {}).map(([key, f]) => ({ ruta: f.url, etiqueta: key })),
    ...controles.flatMap(c => (c.fotos || []).map((f, i) => ({ ruta: f.url, etiqueta: `Control ${c.fecha} · foto ${i + 1}` }))),
  ];

  const subirFotoParaIA = async (file) => {
    if (!file) return;
    setSubiendoFotoIA(true);
    setErrorIA('');
    try {
      const ruta = rutaFotoOrto(clinicaId, patient.id, file.name);
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(ruta, file);
      if (uploadError) throw uploadError;
      setFotosSubidasIA(prev => [...prev, { ruta, nombre: file.name }]);
      setFotoOrigenIA(ruta);
    } catch (err) {
      setErrorIA('No se pudo subir la foto: ' + err.message);
    } finally {
      setSubiendoFotoIA(false);
    }
  };

  useEffect(() => {
    let vivo = true;
    const resolver = async () => {
      const firmadas = await Promise.all((vistasPrevia || []).map(async (v) => ({
        ...v,
        urlOriginal: await firmar(v.rutaOriginal),
        urlGenerada: await firmar(v.rutaGenerada),
      })));
      if (vivo) setVistasPreviaFirmadas(firmadas);
    };
    resolver();
    return () => { vivo = false; };
  }, [vistasPrevia]);

  const guardarVistasPrevia = async (nuevasVistas) => {
    const { data: existe, error: fetchError } = await supabase
      .from('ortodoncia').select('id').eq('paciente_id', patient.id).maybeSingle();
    if (fetchError) throw fetchError;
    if (existe) {
      const { error } = await supabase.from('ortodoncia').update({ vistas_previa: nuevasVistas }).eq('id', existe.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('ortodoncia').insert([{ paciente_id: patient.id, clinica_id: clinicaId, vistas_previa: nuevasVistas }]);
      if (error) throw error;
    }
  };

  const generarVistaPreviaIA = async () => {
    if (!fotoOrigenIA) { setErrorIA('Elige de qué foto partir.'); return; }
    setGenerandoIA(true);
    setErrorIA('');
    try {
      const { data, error } = await supabase.functions.invoke('ortodoncia-vista-previa', {
        body: { rutaFoto: fotoOrigenIA, pacienteId: patient.id, clinicaId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'No se pudo generar la vista previa.');
      const nuevaVista = { id: `${Date.now()}`, fecha: new Date().toLocaleDateString('es-PE'), rutaOriginal: fotoOrigenIA, rutaGenerada: data.ruta };
      const nuevasVistas = [...vistasPrevia, nuevaVista];
      await guardarVistasPrevia(nuevasVistas);
      setVistasPrevia(nuevasVistas);
    } catch (err) {
      setErrorIA(err.message);
    } finally {
      setGenerandoIA(false);
    }
  };

  const eliminarVistaPreviaIA = async (id) => {
    if (!window.confirm('¿Eliminar esta vista previa generada?')) return;
    const nuevasVistas = vistasPrevia.filter(v => v.id !== id);
    try {
      await guardarVistasPrevia(nuevasVistas);
      setVistasPrevia(nuevasVistas);
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const ORTO_TABS = [{ id: 'examen', lbl: 'Examen clínico' }, { id: 'trabajo', lbl: 'Plan de Trabajo' }, { id: 'tratamiento', lbl: 'Plan de tratamiento' }, { id: 'resumen', lbl: 'Resumen' }, { id: 'fotografias', lbl: 'Fotografías' }, { id: 'controles', lbl: 'Controles Mensuales' }, { id: 'vista_previa_ia', lbl: 'Vista Previa IA' }];
  const ORTO_CAJAS = [{ key: 'Rx Panorámica', icon: '🦷', accept: 'image/*' }, { key: 'Rx Cefalométrica', icon: '📐', accept: 'image/*' }, { key: 'Rx Periapical', icon: '🔍', accept: 'image/*' }, { key: 'Foto frontal', icon: '😁', accept: 'image/*' }, { key: 'Foto lateral izquierda', icon: '📷', accept: 'image/*' }, { key: 'Foto lateral derecha', icon: '📸', accept: 'image/*' }, { key: 'Foto oclusal superior', icon: '👄', accept: 'image/*' }, { key: 'Foto oclusal inferior', icon: '👅', accept: 'image/*' }, { key: 'Modelo inicial', icon: '🧊', accept: 'image/*' }, { key: 'Plan de tratamiento', icon: '📄', accept: '.pdf,.ppt,.pptx,image/*' }];

  // Progreso del tratamiento: meses transcurridos desde la fecha inicial
  // (Plan de tratamiento o Resumen, la que exista) contra el tiempo estimado.
  const fechaInicioTrata = planTrataForm.fecha_inicial || resumenForm.fecha_inicial || '';
  const tiempoEstimadoMeses = Number(planTrataForm.tiempo_estimado || resumenForm.tiempo_estimado) || 0;
  const mesesTranscurridos = fechaInicioTrata
    ? Math.max(0, (Date.now() - new Date(fechaInicioTrata).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : 0;
  const progresoPct = tiempoEstimadoMeses > 0 ? Math.min(100, (mesesTranscurridos / tiempoEstimadoMeses) * 100) : null;
  const ultimoControl = controles.length > 0 ? controles[controles.length - 1].fecha : null;

  return (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
            <div style={{ flex: 1, background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderRadius: '12px', border: GLASS_BORDER, display: 'flex', flexDirection: 'column', boxShadow: GLASS_SHADOW, overflow: 'hidden' }}>

              <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #0f172a 0%, #0087b3 100%)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
                    {ini(patient.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{patient.name}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)' }}>
                      {controles.length} control{controles.length !== 1 ? 'es' : ''} registrado{controles.length !== 1 ? 's' : ''}
                      {ultimoControl ? ` · Último: ${ultimoControl}` : ''}
                    </div>
                  </div>
                </div>
                {progresoPct !== null && (
                  <div style={{ minWidth: 200, flex: '0 1 240px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.85)', marginBottom: 4, fontWeight: 700 }}>
                      <span>Progreso del tratamiento</span>
                      <span>{Math.round(progresoPct)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progresoPct}%`, background: '#fff', borderRadius: 4, transition: 'width .4s' }} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', gap: '20px', background: '#fff', flexShrink: 0, overflowX: 'auto' }}>
                {ORTO_TABS.map(t => (
                  <div key={t.id} onClick={() => setSubTabOrto(t.id)}
                    style={{
                      padding: '14px 4px', cursor: 'pointer', fontSize: '11px',
                      fontWeight: subTabOrto === t.id ? '700' : '500',
                      color: subTabOrto === t.id ? '#0087b3' : '#64748b',
                      borderBottom: subTabOrto === t.id ? `2px solid #0087b3` : '2px solid transparent',
                      transition: 'all 0.2s ease', marginBottom: '-1px', whiteSpace: 'nowrap'
                    }}>
                    {t.lbl}
                  </div>
                ))}
              </div>

              <div style={{ padding: '30px', flex: 1, overflowY: 'auto', background: '#fff' }}>

                {subTabOrto === 'examen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <OrtoHeader title="Examen Clínico de Ortodoncia" isEditing={isEditingOrtoExamen} setIsEditing={setIsEditingOrtoExamen} onSave={handleSaveOrto} saving={savingOrto} onCancel={() => setIsEditingOrtoExamen(false)} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {['Motivo de consulta', 'Historia médica', 'Historia odontológica', 'Historia Familiar'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '250px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>{f}</label>
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
                      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>Filtrum</div>
                      <label style={{ fontSize: '11px', color: '#475569', display: 'flex', gap: '6px', opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.filtrum_alineado || false} onChange={e => handleOrto('filtrum_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>Desviación lateral del filtrum</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: '11px', color: '#475569', display: 'flex', gap: '6px', opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.filtrum_izq || false} onChange={e => handleOrto('filtrum_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: '11px', color: '#475569', display: 'flex', gap: '6px', opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.filtrum_der || false} onChange={e => handleOrto('filtrum_der', e.target.checked)} /> Derecha</label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '120px 100px 250px 150px', gap: '15px', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>Mentón</div>
                      <label style={{ fontSize: '11px', color: '#475569', display: 'flex', gap: '6px', opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.menton_alineado || false} onChange={e => handleOrto('menton_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>Desviación lateral del mentón</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: '11px', color: '#475569', display: 'flex', gap: '6px', opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.menton_izq || false} onChange={e => handleOrto('menton_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: '11px', color: '#475569', display: 'flex', gap: '6px', opacity: isEditingOrtoExamen ? 1 : 0.6 }}><input disabled={!isEditingOrtoExamen} type="checkbox" checked={ortoForm.menton_der || false} onChange={e => handleOrto('menton_der', e.target.checked)} /> Derecha</label>
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
                          <label style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>{f}</label>
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
                          <label style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>{f}</label>
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
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Modelos de estudio con alginato', 'Modelos de estudio con silicona'].map(opt => (
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['TAC de volumen completo con protocolo Morzán', 'TAC de volumen completo sin informe', 'TAC de campo pequeño'].map(opt => (
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
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
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Bitewing de molares', 'Bitewing de molares y premolares', 'Bitewing de premolares'].map(opt => (
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Carpal', 'Oclusal superior', 'Oclusal inferior', 'Panorámica'].map(opt => (
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
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
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Cirujano Máxilo facial', 'Periodoncista', 'Médica'].map(opt => (
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Fisioterapeuta Oral', 'Psicólogo', 'Encerado diagnóstico', 'Exámenes auxiliares'].map(opt => (
                          <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrabajo ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrabajo ? 1 : 0.6 }}>
                            <input disabled={!isEditingOrtoTrabajo} type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea disabled={!isEditingOrtoTrabajo} placeholder="Notas de interconsultas..." value={planTrabajoForm.notas_inter || ''} onChange={e => handlePlanTrabajo('notas_inter', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '100px', resize: 'none', marginBottom: '30px' }} />

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '12px', marginBottom: '8px' }}>Informes</label>
                      <textarea disabled={!isEditingOrtoTrabajo} value={planTrabajoForm.informes || ''} onChange={e => handlePlanTrabajo('informes', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '12px', marginBottom: '8px' }}>Diagnóstico definitivo</label>
                      <textarea disabled={!isEditingOrtoTrabajo} value={planTrabajoForm.diag_definitivo || ''} onChange={e => handlePlanTrabajo('diag_definitivo', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '12px', marginBottom: '8px' }}>Objetivo</label>
                      <textarea disabled={!isEditingOrtoTrabajo} value={planTrabajoForm.objetivo || ''} onChange={e => handlePlanTrabajo('objetivo', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrabajo), height: '80px', resize: 'none' }} />
                    </div>
                  </div>
                )}

                {subTabOrto === 'tratamiento' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <OrtoHeader title="Plan de Tratamiento" isEditing={isEditingOrtoTrata} setIsEditing={setIsEditingOrtoTrata} onSave={handleSavePlanTrata} saving={savingTrata} onCancel={() => setIsEditingOrtoTrata(false)} />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Fecha inicial</label>
                        <input disabled={!isEditingOrtoTrata} type="date" value={planTrataForm.fecha_inicial || ''} onChange={e => handlePlanTrata('fecha_inicial', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Tiempo estimado <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>(meses)</span></label>
                        <input disabled={!isEditingOrtoTrata} type="number" placeholder="Ej: 18" value={planTrataForm.tiempo_estimado || ''} onChange={e => handlePlanTrata('tiempo_estimado', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Fecha final</label>
                        <input disabled={!isEditingOrtoTrata} type="date" value={planTrataForm.fecha_final || ''} onChange={e => handlePlanTrata('fecha_final', e.target.value)} style={getOrtoStyle(isEditingOrtoTrata)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr 1fr' : '100px 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Tipo</span>
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
                        <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrata ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrata ? 1 : 0.6 }}>
                          <input disabled={!isEditingOrtoTrata} type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea disabled={!isEditingOrtoTrata} placeholder="Notas de aparatos ortopédicos..." value={planTrataForm.notas_ortopedicos || ''} onChange={e => handlePlanTrata('notas_ortopedicos', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '80px', resize: 'none' }} />

                    <SectionHeader title="Anclaje" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '20px', maxWidth: '700px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>Superior</span>
                        <select disabled={!isEditingOrtoTrata} value={planTrataForm.anclaje_sup || ''} onChange={e => handlePlanTrata('anclaje_sup', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>Inferior</span>
                        <select disabled={!isEditingOrtoTrata} value={planTrataForm.anclaje_inf || ''} onChange={e => handlePlanTrata('anclaje_inf', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '15px' }}>
                      {['Mini implantes', 'Bicorticales', 'Mini placas', 'Mini implantes palatinos paramediales', 'Mini implantes bicorticales paramediales'].map(opt => (
                        <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrata ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrata ? 1 : 0.6 }}>
                          <input disabled={!isEditingOrtoTrata} type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea disabled={!isEditingOrtoTrata} placeholder="Notas de anclaje..." value={planTrataForm.notas_anclaje || ''} onChange={e => handlePlanTrata('notas_anclaje', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '80px', resize: 'none' }} />

                    <SectionHeader title="Aparatos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '15px', marginBottom: '15px' }}>
                      {['Distal jet óseo', 'ATP semi fijo', 'Brazo de poder para tracción mesial de molar', 'Placa activa de expansión', 'Péndulo óseo', 'ATP más botón de Nance', 'Placa para levantar mordida', 'Mantenedor de espacio', 'Resorte vestibular para distalizar molar', 'ATP fijo', 'VAC modificado', 'Recuperador de espacio', 'MUST óseo', 'Arco lingual semi fijo', 'ALF', 'Rejilla lingual', 'Cantilever óseo', 'Botón de Nance óseo', 'AEO ortodóntico', 'QUAD HÉLIX'].map(opt => (
                        <label key={opt} style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingOrtoTrata ? 'pointer' : 'not-allowed', opacity: isEditingOrtoTrata ? 1 : 0.6 }}>
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
                      <label style={{ ...labelStyleDoc, fontSize: '12px', marginBottom: '8px' }}>Descripción</label>
                      <textarea disabled={!isEditingOrtoTrata} value={planTrataForm.descripcion_general || ''} onChange={e => handlePlanTrata('descripcion_general', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoTrata), height: '100px', resize: 'none' }} />
                    </div>
                  </div>
                )}

                {subTabOrto === 'resumen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <OrtoHeader title="Resumen" isEditing={isEditingOrtoResumen} setIsEditing={setIsEditingOrtoResumen} onSave={handleSaveResumen} saving={savingResumen} onCancel={() => setIsEditingOrtoResumen(false)} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Fecha inicial</label>
                        <input disabled={!isEditingOrtoResumen} type="date" value={resumenForm.fecha_inicial || ''} onChange={e => handleResumen('fecha_inicial', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Fecha final</label>
                        <input disabled={!isEditingOrtoResumen} type="date" value={resumenForm.fecha_final || ''} onChange={e => handleResumen('fecha_final', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Tiempo estimado</label>
                        <div style={{ display: 'flex', border: '1px solid', borderColor: isEditingOrtoResumen ? '#cbd5e1' : 'transparent', borderRadius: '8px', overflow: 'hidden' }}>
                          <input disabled={!isEditingOrtoResumen} type="number" value={resumenForm.tiempo_estimado || ''} onChange={e => handleResumen('tiempo_estimado', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoResumen), border: 'none', borderRadius: 0, flex: 1 }} />
                          <div style={{ background: '#f8fafc', padding: '0 20px', display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '11px', borderLeft: isEditingOrtoResumen ? '1px solid #cbd5e1' : 'none' }}>Meses</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Tipo de Brackets</label>
                        <select disabled={!isEditingOrtoResumen} value={resumenForm.tipo_brackets || ''} onChange={e => handleResumen('tipo_brackets', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)}>
                          <option value="">Seleccionar</option>
                          {['Bracket metálico', 'Bracket cerámico', 'Bracket zafiro', 'Bracket lingual', 'Bracket férulas', 'Bracket resina', 'Autoligante metálico', 'Autoligante estético', 'Iconix', 'Carriere slx 3D', 'Invisalign', 'Aliwell', 'Smartaligner', 'CCO system', 'Otros'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '11px', marginBottom: '8px' }}>Diagnóstico</label>
                      <textarea disabled={!isEditingOrtoResumen} value={resumenForm.diagnostico || ''} onChange={e => handleResumen('diagnostico', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoResumen), height: '100px', resize: 'none' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Anclaje superior</label>
                        <select disabled={!isEditingOrtoResumen} value={resumenForm.anclaje_sup || ''} onChange={e => handleResumen('anclaje_sup', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '11px' }}>Anclaje inferior</label>
                        <select disabled={!isEditingOrtoResumen} value={resumenForm.anclaje_inf || ''} onChange={e => handleResumen('anclaje_inf', e.target.value)} style={getOrtoStyle(isEditingOrtoResumen)}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '11px', marginBottom: '8px' }}>Nota</label>
                      <textarea disabled={!isEditingOrtoResumen} value={resumenForm.notas || ''} onChange={e => handleResumen('notas', e.target.value)} style={{ ...getOrtoStyle(isEditingOrtoResumen), height: '80px', resize: 'none' }} />
                    </div>
                  </div>
                )}

                {subTabOrto === 'fotografias' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', marginTop: '10px' }}>
                      <h3 style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, margin: 0 }}>Archivos Clínicos Iniciales</h3>
                      <div>
                        {savingFotosOrto && <span style={{ fontSize: '12px', color: '#0087b3', fontWeight: 600, marginRight: 10 }}>Subiendo...</span>}
                        <button onClick={() => setIsEditingOrtoFotos(!isEditingOrtoFotos)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isEditingOrtoFotos ? '#fff' : '#f1f5f9', color: isEditingOrtoFotos ? '#ef4444' : '#475569', border: `1px solid ${isEditingOrtoFotos ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '11px' }}>
                          {isEditingOrtoFotos ? 'Cerrar Edición' : <><Icon name="edit" size={13} /> Editar Fotografías</>}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', paddingBottom: '40px' }}>
                      {ORTO_CAJAS.map(item => {
                        // fotosOrtoFirmadas trae la urlFirmada para mostrar;
                        // fileData.url sigue siendo el localizador para borrar.
                        const fileData = fotosOrtoFirmadas[item.key];
                        const hasFile = !!fileData;

                        return (
                          <div key={item.key} style={{ background: '#fff', border: `1px solid ${hasFile ? '#0087b3' : '#e2e8f0'}`, borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: hasFile ? '0 4px 6px rgba(0,135,179,0.1)' : '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
                            {hasFile && isEditingOrtoFotos && (
                              <button onClick={() => handleDeleteFotoOrto(item.key, fileData.url)} style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} title="Eliminar">✕</button>
                            )}

                            <div style={{ height: '140px', background: hasFile ? '#000' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                              {hasFile ? (
                                fileData.ext.match(/(pdf|ppt|pptx)/i) ? (
                                  <a href={fileData.urlFirmada} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                    <Icon name="document" size={40} />
                                    <span style={{ fontSize: '10px', color: '#cbd5e1' }}>Abrir {fileData.ext.toUpperCase()}</span>
                                  </a>
                                ) : (
                                  <a href={fileData.urlFirmada} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                                    <img src={fileData.urlFirmada} alt={item.key} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                  </a>
                                )
                              ) : (
                                <div style={{ fontSize: '50px', opacity: 0.3, filter: 'grayscale(100%)' }}>{item.icon}</div>
                              )}

                              {!hasFile && isEditingOrtoFotos && (
                                <label style={{ position: 'absolute', inset: 0, cursor: savingFotosOrto ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s', background: 'rgba(241, 245, 249, 0.9)' }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0087b3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '8px', boxShadow: '0 4px 6px rgba(0,135,179,0.3)' }}>+</div>
                                  <span style={{ fontSize: '12px', color: '#0087b3', fontWeight: 700 }}>Subir {item.key}</span>
                                  <input type="file" accept={item.accept} style={{ display: 'none' }} disabled={savingFotosOrto} onChange={e => handleUploadFotoOrto(e, item.key)} />
                                </label>
                              )}
                            </div>

                            <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: hasFile ? '#f0f9ff' : '#fff' }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>{item.key}</div>
                              <div style={{ fontSize: '10px', color: hasFile ? '#0087b3' : '#94a3b8', marginTop: '4px', fontWeight: hasFile ? 600 : 400 }}>
                                {hasFile ? `✓ Subido el ${fileData.date}` : 'Pendiente'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {subTabOrto === 'controles' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h2 style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>Controles Mensuales</h2>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{controles.length} control{controles.length !== 1 ? 'es' : ''} registrado{controles.length !== 1 ? 's' : ''}</span>
                    </div>

                    {controlesFirmados.length >= 2 && (
                      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '18px', marginBottom: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1' }}>Comparar progreso</span>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '11px' }}>
                            <select value={compararA ?? 0} onChange={e => setCompararA(Number(e.target.value))} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                              {controlesFirmados.map((c, i) => <option key={c.id} value={i}>{c.fecha}</option>)}
                            </select>
                            <span style={{ color: '#64748b' }}>vs</span>
                            <select value={compararB ?? controlesFirmados.length - 1} onChange={e => setCompararB(Number(e.target.value))} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                              {controlesFirmados.map((c, i) => <option key={c.id} value={i}>{c.fecha}</option>)}
                            </select>
                          </div>
                        </div>

                        {(() => {
                          const cA = controlesFirmados[compararA ?? 0];
                          const cB = controlesFirmados[compararB ?? controlesFirmados.length - 1];
                          const fotoA = cA?.fotos?.[0]?.urlFirmada;
                          const fotoB = cB?.fotos?.[0]?.urlFirmada;
                          return fotoA && fotoB ? (
                            <div style={{ marginBottom: '16px' }}>
                              <ComparadorDeslizante antes={fotoA} despues={fotoB} labelAntes={cA.fecha} labelDespues={cB.fecha} />
                              <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>Arrastra el círculo para comparar</div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '16px' }}>
                              Para el comparador deslizante, ambos controles necesitan al menos una foto.
                            </div>
                          );
                        })()}

                        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          {[compararA ?? 0, compararB ?? controlesFirmados.length - 1].map((idx, col) => {
                            const c = controlesFirmados[idx];
                            if (!c) return <div key={col} />;
                            return (
                              <div key={col} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e0f2fe', overflow: 'hidden' }}>
                                <div style={{ padding: '8px 12px', background: col === 0 ? '#fef3c7' : '#dcfce7', fontSize: '10.5px', fontWeight: 700, color: col === 0 ? '#92400e' : '#166534' }}>
                                  {col === 0 ? 'ANTES' : 'DESPUÉS'} · {c.fecha}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px', padding: '10px' }}>
                                  {(c.fotos || []).length === 0 && <div style={{ fontSize: '10.5px', color: '#94a3b8', padding: '10px' }}>Sin fotos en este control.</div>}
                                  {(c.fotos || []).map((f, i) => (
                                    <a key={i} href={f.urlFirmada} target="_blank" rel="noreferrer">
                                      <img src={f.urlFirmada} alt={f.nombre} style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: '6px' }} />
                                    </a>
                                  ))}
                                </div>
                                {c.nota && <div style={{ padding: '0 12px 10px', fontSize: '10.5px', color: '#475569' }}>{c.nota}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '28px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>+ Nuevo control</div>
                      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '160px 1fr', gap: '14px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ ...labelStyleDoc, marginBottom: 4 }}>Fecha del control</label>
                          <input type="date" value={nuevaFechaControl} onChange={e => setNuevaFechaControl(e.target.value)} style={inputStyleDoc} />
                        </div>
                        <div>
                          <label style={{ ...labelStyleDoc, marginBottom: 4 }}>Nota del control</label>
                          <input placeholder="Ej: se ajustaron brackets, buena evolución de línea media..." value={nuevaNotaControl} onChange={e => setNuevaNotaControl(e.target.value)} style={inputStyleDoc} />
                        </div>
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ ...labelStyleDoc, marginBottom: 4 }}>Fotos de este control</label>
                        <input type="file" accept="image/*" multiple onChange={e => setNuevasFotosControl(Array.from(e.target.files || []))} style={{ fontSize: '11.5px' }} />
                        {nuevasFotosControl.length > 0 && <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: 4 }}>{nuevasFotosControl.length} archivo(s) seleccionado(s)</div>}
                      </div>
                      <button onClick={agregarControl} disabled={savingControl} style={{ background: savingControl ? '#94a3b8' : '#0087b3', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 20px', fontWeight: 700, fontSize: '11.5px', cursor: savingControl ? 'not-allowed' : 'pointer' }}>
                        {savingControl ? 'Guardando...' : '+ Agregar control'}
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Historial de controles</div>
                    {controlesFirmados.length === 0 && (
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>Todavía no hay controles registrados para este paciente.</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '30px' }}>
                      {[...controlesFirmados].reverse().map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: '14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                          <div style={{ width: '80px', flexShrink: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0087b3' }}>{c.fecha}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {c.nota && <div style={{ fontSize: '11.5px', color: '#334155', marginBottom: 8 }}>{c.nota}</div>}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {(c.fotos || []).map((f, i) => (
                                <a key={i} href={f.urlFirmada} target="_blank" rel="noreferrer">
                                  <img src={f.urlFirmada} alt={f.nombre} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                </a>
                              ))}
                              {(c.fotos || []).length === 0 && <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Sin fotos</span>}
                            </div>
                          </div>
                          <button onClick={() => eliminarControl(c.id)} title="Eliminar control" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', alignSelf: 'flex-start' }}>
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {subTabOrto === 'vista_previa_ia' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h2 style={{ margin: 0, color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>Vista Previa de Sonrisa (IA)</h2>
                    </div>

                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Icon name="warning" size={16} color="#92400e" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ fontSize: '11.5px', color: '#92400e', lineHeight: 1.5 }}>
                        <strong>Esto es una aproximación ilustrativa generada por inteligencia artificial, no una simulación clínica.</strong> A diferencia de un scanner 3D (como iTero), se genera a partir de una sola foto y una IA de imágenes -- no calcula el movimiento dental real ni garantiza ese resultado. Úsala solo como referencia motivacional, nunca como promesa de tratamiento.
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '24px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Generar una nueva vista previa</div>
                      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '1fr auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                          <label style={{ ...labelStyleDoc, marginBottom: 4 }}>Foto de partida</label>
                          <select value={fotoOrigenIA} onChange={e => setFotoOrigenIA(e.target.value)} style={inputStyleDoc}>
                            <option value="">Selecciona una foto ya subida...</option>
                            {fotosDisponiblesIA.map((f, i) => <option key={i} value={f.ruta}>{f.etiqueta}</option>)}
                          </select>
                        </div>
                        <button onClick={generarVistaPreviaIA} disabled={generandoIA || !fotoOrigenIA} style={{ background: generandoIA || !fotoOrigenIA ? '#94a3b8' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '11.5px', cursor: generandoIA || !fotoOrigenIA ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                          {generandoIA ? 'Generando...' : '✨ Generar con IA'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 4px' }}>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>O SUBE UNA FOTO NUEVA</span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                        <input
                          type="file" accept="image/*" disabled={subiendoFotoIA}
                          onChange={e => { subirFotoParaIA(e.target.files?.[0]); e.target.value = ''; }}
                          style={{ fontSize: '11.5px' }}
                        />
                        {subiendoFotoIA && <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>Subiendo...</span>}
                      </div>

                      {fotosDisponiblesIA.length === 0 && !subiendoFotoIA && (
                        <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: 8 }}>Todavía no hay fotos disponibles -- sube una arriba, o agrega una en Fotografías/Controles Mensuales.</div>
                      )}
                      {errorIA && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: 10 }}>{errorIA}</div>}
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Vistas previas generadas</div>
                    {vistasPreviaFirmadas.length === 0 && (
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>Todavía no generaste ninguna vista previa.</div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px', marginBottom: '30px' }}>
                      {[...vistasPreviaFirmadas].reverse().map(v => (
                        <div key={v.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                          <ComparadorDeslizante antes={v.urlOriginal} despues={v.urlGenerada} labelAntes="Foto real" labelDespues="Vista previa IA" />
                          <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>Generada el {v.fecha}</span>
                            <button onClick={() => eliminarVistaPreviaIA(v.id)} title="Eliminar" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
  );
}

// ─── VISTA PRINCIPAL: directorio de pacientes en tratamiento ─────────────────
export default function Ortodoncia({ clinicaId }) {
  const [pacientesOrto, setPacientesOrto] = useState([]);
  const [todosPacientes, setTodosPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [showIniciar, setShowIniciar] = useState(false);
  const [busquedaIniciar, setBusquedaIniciar] = useState('');
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargarTodo = async () => {
      setLoading(true);
      const [{ data: ortoRows }, { data: pacientes }] = await Promise.all([
        supabase.from('ortodoncia').select('id, paciente_id'),
        supabase.from('pacientes').select('id, name, doc'),
      ]);
      if (!vivo) return;
      const pacientesPorId = Object.fromEntries((pacientes || []).map(p => [p.id, p]));
      const conTratamiento = (ortoRows || [])
        .map(o => (pacientesPorId[o.paciente_id] ? { ...pacientesPorId[o.paciente_id], ortodonciaId: o.id } : null))
        .filter(Boolean);
      setPacientesOrto(conTratamiento);
      setTodosPacientes(pacientes || []);
      setLoading(false);
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
      setPacientesOrto(prev => [...prev, { ...paciente, ortodonciaId: data.id }]);
      setSeleccionado(paciente);
      setShowIniciar(false);
      setBusquedaIniciar('');
    } catch (err) {
      alert('Error al iniciar el tratamiento: ' + err.message);
    } finally {
      setIniciando(false);
    }
  }, [clinicaId]);

  const disponibles = todosPacientes.filter(p =>
    !pacientesOrto.some(o => o.id === p.id) &&
    (normalizarTexto(p.name).includes(normalizarTexto(busquedaIniciar)) || (p.doc || '').includes(busquedaIniciar))
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 20, minHeight: 0, padding: 20, boxSizing: 'border-box' }}>
      <aside style={{
        width: 280, minWidth: 260, display: 'flex', flexDirection: 'column',
        background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
        borderRadius: 14, border: GLASS_BORDER, boxShadow: GLASS_SHADOW, overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${BD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: DN }}>En tratamiento</span>
          <button
            onClick={() => setShowIniciar(true)}
            title="Iniciar tratamiento de ortodoncia"
            style={{ width: 28, height: 28, borderRadius: 8, background: P, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="plus" size={13} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          {loading && <div style={{ fontSize: 11.5, color: MU, textAlign: 'center', padding: 20 }}>Cargando...</div>}
          {!loading && pacientesOrto.length === 0 && (
            <div style={{ fontSize: 11.5, color: MU, textAlign: 'center', padding: '20px 10px' }}>
              Ningún paciente en tratamiento todavía. Usa "+" para iniciar el de alguien.
            </div>
          )}
          {pacientesOrto.map(p => {
            const isSel = seleccionado?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSeleccionado(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                  background: isSel ? P + '18' : 'transparent',
                  border: `1px solid ${isSel ? P + '40' : 'transparent'}`,
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: isSel ? P : '#fff', color: isSel ? '#fff' : P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                  {ini(p.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: MU }}>DNI {p.doc || '---'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {seleccionado ? (
          <OrtodonciaDetalle patient={seleccionado} clinicaId={clinicaId} />
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
            borderRadius: 14, border: GLASS_BORDER,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 6 }}>Ortodoncia</div>
            <div style={{ fontSize: 11.5, color: MU }}>Selecciona un paciente en tratamiento, o inicia uno nuevo con "+".</div>
          </div>
        )}
      </main>

      {showIniciar && (
        <Modal background="rgba(17,24,39,0.45)" overlayStyle={{ padding: 24 }}
          cardStyle={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, maxHeight: '80dvh', display: 'flex', flexDirection: 'column', border: `1px solid ${BD}` }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: DN }}>Iniciar tratamiento de ortodoncia</span>
            <button onClick={() => setShowIniciar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MU, fontSize: 18 }}>×</button>
          </div>
          <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
            <input
              autoFocus
              placeholder="Buscar paciente por nombre o DNI..."
              value={busquedaIniciar}
              onChange={e => setBusquedaIniciar(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12.5, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />
            {disponibles.length === 0 && (
              <div style={{ fontSize: 11.5, color: MU, textAlign: 'center', padding: '16px 0' }}>
                {busquedaIniciar ? 'Ningún paciente coincide.' : 'Todos los pacientes ya están en tratamiento, o no hay pacientes registrados.'}
              </div>
            )}
            {disponibles.slice(0, 30).map(p => (
              <div
                key={p.id}
                onClick={() => !iniciando && iniciarTratamiento(p)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 8, cursor: iniciando ? 'not-allowed' : 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 30, height: 30, borderRadius: 7, background: '#f1f5f9', color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                  {ini(p.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: MU }}>DNI {p.doc || '---'}</div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
