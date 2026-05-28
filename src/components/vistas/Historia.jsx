// src/components/vistas/Historia.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Odontograma from '../odontograma/Odontograma';
import Consentimientos from '../historia/Consentimientos';
import {
  TODAS_NACIONES, labelStyleDoc, inputStyleDoc,
  TRATAMIENTOS_CAT, PRECIOS, P, BD, DN, MU, MT, LT, WA, RJ, GL,
} from '../../utils/constants';
import { ini, sc, getSurfs } from '../../utils/helpers';

// ─── DESIGN TOKENS PREMIUM ───────────────────────────────────────────────────
const C = {
  surface:      '#FFFFFF',
  surfaceAlt:   '#F9FAFB',
  bg:           'transparent',
  border:       '#E5E7EB',
  borderStrong: '#D1D5DB',
  ink:          '#111827',
  inkMid:       '#4B5563',
  inkMute:      '#9CA3AF',
  brand:        '#0F172A',
  brandSoft:    '#F1F5F9',
  brandText:    '#0F172A',
  green:        '#10B981',
  red:          '#EF4444',
  redSoft:      '#FEE2E2',
  amber:        '#F59E0B',
  blue:         '#3B82F6',
  orto:         '#0284c7', // Azul clínico para la sección ortodoncia
  font:         '"Inter", system-ui, sans-serif',
  r:            '10px',
  rl:           '16px',
  rx:           '24px',
  shadowSm:     '0 4px 15px rgba(0,0,0,0.03)',
};

// ─── DEFINICIÓN DE TABS ───────────────────────────────────────────────────────
const MAIN_TABS = [
  { id: 'filiacion',       label: 'Filiación' },
  { id: 'anamnesis',       label: 'Anamnesis' },
  { id: 'odontograma',     label: 'Odontograma' },
  { id: 'ortodoncia',      label: 'Ortodoncia' },
  { id: 'plan',            label: 'Plan trat.' },
  { id: 'evolucion',       label: 'Evolución' },
  { id: 'recetas',         label: 'Recetas' },
  { id: 'imagenes',        label: 'Imágenes' },
  { id: 'presupuesto',     label: 'Presupuesto' },
  { id: 'consentimientos', label: 'Consentimientos' },
];

const ORTO_TABS = [
  { id: 'examen',      label: 'Examen clínico' },
  { id: 'trabajo',     label: 'Plan de Trabajo' },
  { id: 'tratamiento', label: 'Plan de tratamiento' },
  { id: 'resumen',     label: 'Resumen' },
  { id: 'fotografias', label: 'Fotografías' },
];

const ORTO_CAJAS = [
  { key: 'Rx Panorámica',          icon: '🦷', accept: 'image/*' },
  { key: 'Rx Cefalométrica',       icon: '📐', accept: 'image/*' },
  { key: 'Rx Periapical',          icon: '🔍', accept: 'image/*' },
  { key: 'Foto frontal',           icon: '😁', accept: 'image/*' },
  { key: 'Foto lateral izquierda', icon: '📷', accept: 'image/*' },
  { key: 'Foto lateral derecha',   icon: '📸', accept: 'image/*' },
  { key: 'Foto oclusal superior',  icon: '👄', accept: 'image/*' },
  { key: 'Foto oclusal inferior',  icon: '👅', accept: 'image/*' },
  { key: 'Modelo inicial',         icon: '🧊', accept: 'image/*' },
  { key: 'Plan de tratamiento',    icon: '📄', accept: '.pdf,.ppt,.pptx,image/*' },
];

// ─── SUB-COMPONENTES UI ───────────────────────────────────────────────────────
const TabPill = ({ id, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      padding: '8px 18px',
      borderRadius: '100px', border: '1px solid ' + (isActive ? C.brand : 'transparent'),
      background: isActive ? C.brand : 'transparent',
      color: isActive ? '#fff' : C.inkMid,
      fontSize: 13, fontWeight: isActive ? 700 : 500,
      cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: C.font, outline: 'none',
      transition: 'all 0.2s',
      flexShrink: 0,
      boxShadow: isActive ? '0 4px 10px rgba(15,23,42,0.15)' : 'none'
    }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.ink; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.inkMid; }}
  >
    {label}
  </button>
);

const UnderlineTab = ({ id, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      padding: '14px 4px',
      border: 'none', background: 'transparent',
      borderBottom: `2px solid ${isActive ? C.orto : 'transparent'}`,
      color: isActive ? C.orto : C.inkMid,
      fontSize: 13, fontWeight: isActive ? 700 : 500,
      cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: C.font, outline: 'none',
      marginBottom: -1, transition: 'all 0.15s',
    }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.ink; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.inkMid; }}
  >
    {label}
  </button>
);

const PatientHeader = ({ patData, saving, onSave, onWhatsApp }) => (
  <div style={{
    padding: '20px 32px',
    borderBottom: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', gap: 16,
    flexShrink: 0, flexWrap: 'wrap',
    background: '#ffffff',
    borderTopLeftRadius: C.rx, borderTopRightRadius: C.rx
  }}>
    <div style={{ width: 48, height: 48, borderRadius: '16px', background: C.brandSoft, color: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0, fontFamily: C.font }}>
      {ini(patData?.name || '')}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>
          {patData?.name}
        </span>
        {patData?.num_hc && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: C.blue, color: '#fff' }}>
            HC: {patData.num_hc}
          </span>
        )}
        {patData?.allergies && patData.allergies !== 'Ninguna' && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: C.redSoft, color: C.red }}>
            ⚠ Alergia: {patData.allergies}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: C.inkMid, fontWeight: 500 }}>
        {[
          patData?.phone && `📞 ${patData.phone}`,
          patData?.email && `✉ ${patData.email}`,
          patData?.doc  && `DNI: ${patData.doc}`,
          patData?.age  && `${patData.age} años`,
          patData?.blood,
          patData?.sexo,
        ].filter(Boolean).join(' · ')}
      </div>
    </div>

    <div style={{ textAlign: 'right', flexShrink: 0, paddingRight: 16, borderRight: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.inkMute, fontWeight: 600 }}>Próxima cita</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.orto }}>
        {patData?.nextVisit || '---'}
      </div>
    </div>

    <button
      onClick={onSave}
      style={{
        padding: '10px 20px', borderRadius: C.r, border: 'none',
        background: C.brand, color: '#fff',
        fontSize: 13, fontWeight: 700, cursor: 'pointer',
        fontFamily: C.font, flexShrink: 0,
        boxShadow: '0 4px 10px rgba(15,23,42,0.15)',
        transition: 'transform 0.2s',
        opacity: saving ? 0.7 : 1
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {saving ? '⏳ Guardando...' : '💾 Guardar Expediente'}
    </button>
  </div>
);

const SectionHeader = ({ title }) => (
  <div style={{
    color: C.orto, fontSize: 15, fontWeight: 800,
    marginTop: 32, marginBottom: 16, paddingBottom: 8,
    borderBottom: `1px solid ${C.border}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontFamily: C.font,
  }}>
    {title}
  </div>
);

const OrtoSaveBtn = ({ onClick, saving, label }) => (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32, marginBottom: 40 }}>
    <button
      onClick={onClick}
      style={{
        background: C.orto, color: '#fff', border: 'none',
        borderRadius: C.r, padding: '14px 48px',
        fontWeight: 700, cursor: 'pointer', fontSize: 14,
        fontFamily: C.font, boxShadow: '0 4px 15px rgba(2,132,199,0.3)',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {saving ? 'Guardando...' : label}
    </button>
  </div>
);

// ─── COMPONENTE PRINCIPAL: HISTORIA ──────────────────────────────────────────
export default function Historia({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView }) {
  
  // ============================================================================
  // LÓGICA ORIGINAL INTACTA (Cero modificaciones para asegurar el Odontograma)
  // ============================================================================
  const [tab, setTab] = useState('filiacion');
  const [patData, setPatData] = useState(patient);
  
  useEffect(() => {
    setPatData(patient);
  }, [patient]);
  
  const [subTabOrto, setSubTabOrto] = useState('examen');
  const [ortoForm, setOrtoForm] = useState({});
  const [savingOrto, setSavingOrto] = useState(false);
  
  const [planTrabajoForm, setPlanTrabajoForm] = useState({});
  const [savingTrabajo, setSavingTrabajo] = useState(false);
  
  const [planTrataForm, setPlanTrataForm] = useState({});
  const [savingTrata, setSavingTrata] = useState(false);
  
  const handlePlanTrata = (campo, valor) => setPlanTrataForm(prev => ({ ...prev, [campo]: valor }));
  
  const handleSavePlanTrata = async () => {
    setSavingTrata(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ plan_tratamiento: planTrataForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, plan_tratamiento: planTrataForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar Plan de Tratamiento: " + error.message);
    else alert("✅ Plan de Tratamiento guardado con éxito.");
    setSavingTrata(false);
  };
  
  const handlePlanTrabajo = (campo, valor) => setPlanTrabajoForm(prev => ({ ...prev, [campo]: valor }));
  
  useEffect(() => {
    if (patData && patData.id) {
      const cargarDatosOrto = async () => {
        const { data } = await supabase.from('ortodoncia').select('*').eq('paciente_id', patData.id).maybeSingle();
        if (data) {
          if (data.examen_clinico) setOrtoForm(data.examen_clinico);
          if (data.plan_trabajo) setPlanTrabajoForm(data.plan_trabajo);
          if (data.plan_tratamiento) setPlanTrataForm(data.plan_tratamiento);
          if (data.fotografias) setFotosOrto(data.fotografias);
          if (data.resumen) setResumenForm(data.resumen);
        }
      };
      cargarDatosOrto();
    }
  }, [patData]);
  
  const handleSavePlanTrabajo = async () => {
    setSavingTrabajo(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ plan_trabajo: planTrabajoForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, plan_trabajo: planTrabajoForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar Plan de Trabajo: " + error.message);
    else alert("✅ Plan de Trabajo guardado con éxito.");
    setSavingTrabajo(false);
  };
  
  const [resumenForm, setResumenForm] = useState({});
  const [savingResumen, setSavingResumen] = useState(false);
  
  const handleResumen = (campo, valor) => setResumenForm(prev => ({ ...prev, [campo]: valor }));
  
  const handleSaveResumen = async () => {
    setSavingResumen(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ resumen: resumenForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, resumen: resumenForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar Resumen: " + error.message);
    else alert("✅ Resumen guardado con éxito.");
    setSavingResumen(false);
  };
  
  const [fotosOrto, setFotosOrto] = useState({});
  const [savingFotosOrto, setSavingFotosOrto] = useState(false);
  
  const handleUploadFotoOrto = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingFotosOrto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `orto-${patData.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
    if (uploadError) {
      alert('Error al subir el archivo: ' + uploadError.message);
      setSavingFotosOrto(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('imagenes').getPublicUrl(fileName);
    const nuevaFoto = { url: publicUrlData.publicUrl, date: new Date().toLocaleDateString('es-PE'), ext: fileExt };
    const nuevoEstadoFotos = { ...fotosOrto, [key]: nuevaFoto };
    setFotosOrto(nuevoEstadoFotos);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    if (existe) {
      await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', existe.id);
    } else {
      await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, fotografias: nuevoEstadoFotos }]);
    }
    setSavingFotosOrto(false);
  };
  
  const handleDeleteFotoOrto = async (key, url) => {
    if (!window.confirm(`¿Eliminar ${key} permanentemente?`)) return;
    setSavingFotosOrto(true);
    try {
      const fileName = url.split('/').pop();
      await supabase.storage.from('imagenes').remove([fileName]);
      const nuevoEstadoFotos = { ...fotosOrto };
      delete nuevoEstadoFotos[key];
      setFotosOrto(nuevoEstadoFotos);
      const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
      if (existe) await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', existe.id);
    } catch (error) {
      alert("Hubo un error al eliminar.");
    }
    setSavingFotosOrto(false);
  };
  
  const handleOrto = (campo, valor) => setOrtoForm(prev => ({ ...prev, [campo]: valor }));
  
  const handleSaveOrto = async () => {
    setSavingOrto(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ examen_clinico: ortoForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, examen_clinico: ortoForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar ortodoncia: " + error.message);
    else alert("✅ Examen Clínico de Ortodoncia guardado con éxito.");
    setSavingOrto(false);
  };

  const [isEditingFiliacion, setIsEditingFiliacion] = useState(false);
  const [plan, setPlan] = useState([
    { id: 1, name: 'Control ortodoncia', tooth: '14-23', status: 'en_curso', cost: 80, paid: 80, date: '10 Jun 2025', sessions: 1 },
    { id: 2, name: 'Blanqueamiento clínico', tooth: '—', status: 'pendiente', cost: 180, paid: 0, date: '—', sessions: 1 },
    { id: 3, name: 'Radiografía panorámica', tooth: '—', status: 'completado', cost: 45, paid: 45, date: '10 Jun 2025', sessions: 1 },
  ]);
  const [showTreatPicker, setShowTreatPicker] = useState(false);
  
  const [anamnesisData, setAnamnesisData] = useState({});
  const [imagenesList, setImagenesList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dbPatients, setDbPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [editForm, setEditForm] = useState({});
  
  useEffect(() => {
    if (!patient) {
      const fetchPatients = async () => {
        setLoadingPatients(true);
        const { data, error } = await supabase.from('pacientes').select('*').order('name', { ascending: true });
        if (!error && data) {
          const unicos = [];
          const nombresVistos = new Set();
          data.forEach(p => {
            const nombreLimpio = (p.name || '').trim().toLowerCase();
            if (nombreLimpio && !nombresVistos.has(nombreLimpio)) { nombresVistos.add(nombreLimpio); unicos.push(p); }
          });
          setDbPatients(unicos);
        }
        setLoadingPatients(false);
      };
      fetchPatients();
    }
  }, [patient]);
  
  useEffect(() => {
    const datosDelPaciente = patData || patient;
    if (datosDelPaciente) setEditForm(datosDelPaciente);
  }, [patData, patient]);
  
  const handleSaveEditPatient = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('pacientes').update({
      name: editForm.name, doc: editForm.doc, tipo_doc: editForm.tipo_doc, phone: editForm.phone, cod_pais: editForm.cod_pais, email: editForm.email,
      direccion: editForm.direccion, sexo: editForm.sexo, birthDate: editForm.birthDate, age: editForm.age, blood: editForm.blood, allergies: editForm.allergies,
      num_hc: editForm.num_hc, pais_nacimiento: editForm.pais_nacimiento, ocupacion: editForm.ocupacion, fuente_captacion: editForm.fuente_captacion,
      linea_negocio: editForm.linea_negocio, apoderado: editForm.apoderado, apoderado_dni: editForm.apoderado_dni, parentesco: editForm.parentesco
    }).eq('id', patData.id).select();
    if (error) alert("Error al guardar en Supabase: " + error.message);
    else if (data && data.length > 0) { setPatData(data[0]); setIsEditingFiliacion(false); alert("✅ Datos guardados y bloqueados correctamente."); }
    setSaving(false);
  };
  
  const handleCancelEdit = () => { setEditForm(patData); setIsEditingFiliacion(false); };
  
  useEffect(() => {
    const loadCloudData = async () => {
      if (!patient?.id) return;
      setTeeth({}); setTeethEvolucion({});
      if (typeof setAnamnesisData !== 'undefined') setAnamnesisData({});
      if (typeof setPlan !== 'undefined') setPlan([]);
      if (typeof setImagenesList !== 'undefined') setImagenesList([]);
      const { data } = await supabase.from('historias').select('*').eq('patient_id', patient.id).maybeSingle();
      if (data) {
        if (data.odontograma && Object.keys(data.odontograma).length > 0) setTeeth(data.odontograma);
        if (data.evolucion && Object.keys(data.evolucion).length > 0) setTeethEvolucion(data.evolucion);
        if (data.anamnesis) setAnamnesisData(data.anamnesis);
        if (data.plan_tratamiento) setPlan(data.plan_tratamiento);
        if (data.imagenes) setImagenesList(data.imagenes);
      }
    };
    loadCloudData();
  }, [patient, setTeeth, setTeethEvolucion]);
  
  // FUNCION DE GUARDADO GENERAL DE HISTORIA CLINICA (Intacta)
  const saveAllToCloud = async () => {
    setSaving(true);
    const limpiarDientes = (dientesBase) => {
      const limpios = {};
      Object.keys(dientesBase || {}).forEach(num => {
        const pieza = dientesBase[num];
        const superficies = getSurfs(num);
        const valores = superficies.map(s => pieza[s]).filter(v => v && v !== 'normal');
        const esTodoIgual = valores.length === superficies.length && valores.every(v => v === valores[0]);
        if (esTodoIgual) {
          limpios[num] = { todaPieza: valores[0] };
          if (pieza.note) limpios[num].note = pieza.note;
        } else {
          const filtrada = {};
          let tieneHallazgo = false;
          Object.keys(pieza).forEach(k => {
            const v = pieza[k];
            if (k === 'note' && v && v.trim() !== '') { filtrada[k] = v; tieneHallazgo = true; }
            else if (k !== 'note' && v && v !== 'normal') { filtrada[k] = v; tieneHallazgo = true; }
          });
          if (tieneHallazgo) limpios[num] = filtrada;
        }
      });
      return limpios;
    };
    
    const cleanInicial = limpiarDientes(teeth);
    const cleanEvo = limpiarDientes(teethEvolucion);
    
    try {
      const { data: existe } = await supabase.from('historias').select('id').eq('patient_id', patData.id).maybeSingle();
      const payload = {
        patient_id: patData.id,
        odontograma: cleanInicial,
        evolucion: cleanEvo,
        anamnesis: anamnesisData,
        plan_tratamiento: plan,
        imagenes: imagenesList,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existe) {
        const res = await supabase.from('historias').update(payload).eq('id', existe.id);
        error = res.error;
      } else {
        const res = await supabase.from('historias').insert([payload]);
        error = res.error;
      }

      if (error) throw error;
      alert("✅ Historia clínica sincronizada en la nube.");
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── RENDERIZADO DE VISTAS ──────────────────────────────────────────────────
  if (!patData) return <div style={{ padding: 40, textAlign: 'center', color: MU }}>Cargando datos del paciente...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, fontFamily: C.font }}>
      
      <PatientHeader patData={patData} saving={saving} onSave={saveAllToCloud} />

      {/* TABS PRINCIPALES */}
      <div style={{ 
        padding: '12px 32px', background: '#fff', borderBottom: `1px solid ${C.border}`,
        display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none'
      }}>
        {MAIN_TABS.map(t => (
          <TabPill key={t.id} {...t} isActive={tab === t.id} onClick={setTab} />
        ))}
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        
        {/* FILIACIÓN (EDICIÓN Y BLOQUEO) */}
        {tab === 'filiacion' && (
          <div style={{ maxWidth: 1000, margin: '0 auto', background: '#fff', padding: 32, borderRadius: C.rl, border: `1px solid ${C.border}`, boxShadow: C.shadowSm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: DN, margin: 0 }}>Datos de Filiación</h2>
              {!isEditingFiliacion ? (
                <button onClick={() => setIsEditingFiliacion(true)} style={{ background: C.brandSoft, color: C.brand, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>✏ Editar Datos</button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleCancelEdit} style={{ background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={handleSaveEditPatient} disabled={saving} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Guardando...' : 'Confirmar Cambios'}</button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
              <div>
                <label style={labelStyleDoc}>Nombre Completo</label>
                <input disabled={!isEditingFiliacion} value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} style={inputStyleDoc} />
              </div>
              <div>
                <label style={labelStyleDoc}>Documento (DNI/CE)</label>
                <input disabled={!isEditingFiliacion} value={editForm.doc || ''} onChange={e => setEditForm({...editForm, doc: e.target.value})} style={inputStyleDoc} />
              </div>
              <div>
                <label style={labelStyleDoc}>Celular</label>
                <input disabled={!isEditingFiliacion} value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} style={inputStyleDoc} />
              </div>
              <div>
                <label style={labelStyleDoc}>Correo Electrónico</label>
                <input disabled={!isEditingFiliacion} value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} style={inputStyleDoc} />
              </div>
              <div>
                <label style={labelStyleDoc}>Fecha Nacimiento</label>
                <input type="date" disabled={!isEditingFiliacion} value={editForm.birthDate || ''} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} style={inputStyleDoc} />
              </div>
              <div>
                <label style={labelStyleDoc}>Alergias</label>
                <input disabled={!isEditingFiliacion} value={editForm.allergies || ''} onChange={e => setEditForm({...editForm, allergies: e.target.value})} style={{...inputStyleDoc, border: editForm.allergies && editForm.allergies !== 'Ninguna' ? `1px solid ${RJ}` : inputStyleDoc.border}} />
              </div>
            </div>
          </div>
        )}

        {/* ODONTOGRAMA INICIAL */}
        {tab === 'odontograma' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Odontograma teeth={teeth} setTeeth={setTeeth} mode="inicial" />
          </div>
        )}

        {/* ORTODONCIA (VISTA MAESTRA) */}
        {tab === 'ortodoncia' && (
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${C.border}`, marginBottom: 24 }}>
              {ORTO_TABS.map(st => (
                <UnderlineTab key={st.id} {...st} isActive={subTabOrto === st.id} onClick={setSubTabOrto} />
              ))}
            </div>

            {subTabOrto === 'examen' && (
               <div style={{ background: '#fff', padding: 32, borderRadius: C.rl, border: `1px solid ${C.border}` }}>
                  <SectionHeader title="ANÁLISIS FACIAL" />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                    <div>
                      <label style={labelStyleDoc}>Perfil</label>
                      <select value={ortoForm.perfil || ''} onChange={e => handleOrto('perfil', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar...</option>
                        <option value="Recto">Recto</option>
                        <option value="Convexo">Convexo</option>
                        <option value="Cóncavo">Cóncavo</option>
                      </select>
                    </div>
                    {/* Agregar más campos de ortodoncia aquí según necesites */}
                  </div>
                  <OrtoSaveBtn label="Guardar Examen Clínico" saving={savingOrto} onClick={handleSaveOrto} />
               </div>
            )}

            {subTabOrto === 'fotografias' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {ORTO_CAJAS.map(caja => (
                  <div key={caja.key} style={{ background: '#fff', borderRadius: C.rl, padding: 20, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 12 }}>{caja.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 16 }}>{caja.key}</div>
                    
                    {fotosOrto[caja.key] ? (
                      <div style={{ position: 'relative' }}>
                        <img src={fotosOrto[caja.key].url} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 }} alt={caja.key} />
                        <button onClick={() => handleDeleteFotoOrto(caja.key, fotosOrto[caja.key].url)} style={{ position: 'absolute', top: 8, right: 8, background: RJ, color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <label style={{ display: 'block', padding: '20px', border: `2px dashed ${C.border}`, borderRadius: 12, cursor: 'pointer', color: MU, fontSize: 12 }}>
                        {savingFotosOrto ? 'Subiendo...' : 'Click para subir'}
                        <input type="file" hidden accept={caja.accept} onChange={e => handleUploadFotoOrto(e, caja.key)} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EVOLUCIÓN (ODONTOGRAMA DINÁMICO) */}
        {tab === 'evolucion' && (
          <Odontograma teeth={teethEvolucion} setTeeth={setTeethEvolucion} mode="evolucion" />
        )}

        {/* CONSENTIMIENTOS */}
        {tab === 'consentimientos' && (
          <div style={{ height: '100%', background: '#fff', borderRadius: C.rl, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <Consentimientos patient={patData} />
          </div>
        )}

      </div>
    </div>
  );
}