// src/components/vistas/Historia.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS · Historia Clínica · Arquitectura optimizada
// Sub-componentes memo · Hooks por sección · Tokens unificados con App.jsx
// La lógica de Supabase se mantiene intacta — solo se mejora la UI/arquitectura
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '../../supabase';
import Odontograma from '../odontograma/Odontograma';
import Consentimientos from '../historia/Consentimientos';
import {
  TODAS_NACIONES, labelStyleDoc, inputStyleDoc,
  TRATAMIENTOS_CAT, PRECIOS, P, BD, DN, MU, MT, LT, WA, RJ, GL,
} from '../../utils/constants';
import { ini, sc, getSurfs } from '../../utils/helpers';

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  surface:     '#FFFFFF',
  surfaceAlt:  '#F9FAFB',
  bg:          '#F4F6F8',
  border:      '#E5E7EB',
  borderStrong:'#D1D5DB',
  ink:         '#111827',
  inkMid:      '#4B5563',
  inkMute:     '#9CA3AF',
  brand:       '#4F46E5',
  brandSoft:   '#EEF2FF',
  brandText:   '#4338CA',
  green:       '#10B981',
  red:         '#EF4444',
  redSoft:     '#FEE2E2',
  amber:       '#F59E0B',
  blue:        '#3B82F6',
  // Ortodoncia mantiene su color propio (azul teal del sistema original)
  orto:        '#0087b3',
  font:        "'Inter', system-ui, sans-serif",
  r:           '8px',
  rl:          '12px',
  rx:          '16px',
  shadowSm:    '0 1px 3px rgba(0,0,0,0.06)',
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

// ─── SUB-COMPONENTE: TAB PILL ─────────────────────────────────────────────────
const TabPill = memo(({ id, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    role="tab"
    aria-selected={isActive}
    style={{
      padding: '6px 14px',
      borderRadius: C.r, border: 'none',
      background: isActive ? C.brand : 'transparent',
      color: isActive ? '#fff' : C.inkMid,
      fontSize: 12.5, fontWeight: isActive ? 600 : 450,
      cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: C.font, outline: 'none',
      transition: 'background 0.12s, color 0.12s',
      flexShrink: 0,
    }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.surfaceAlt; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
  >
    {label}
  </button>
));

// ─── SUB-COMPONENTE: UNDERLINE TAB (usado en Ortodoncia) ──────────────────────
const UnderlineTab = memo(({ id, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    role="tab"
    aria-selected={isActive}
    style={{
      padding: '14px 4px',
      border: 'none', background: 'transparent',
      borderBottom: `2px solid ${isActive ? C.orto : 'transparent'}`,
      color: isActive ? C.orto : C.inkMid,
      fontSize: 13, fontWeight: isActive ? 700 : 450,
      cursor: 'pointer', whiteSpace: 'nowrap',
      fontFamily: C.font, outline: 'none',
      marginBottom: -1, transition: 'all 0.15s',
    }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.ink; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.inkMid; }}
  >
    {label}
  </button>
));

// ─── SUB-COMPONENTE: PATIENT HEADER ──────────────────────────────────────────
const PatientHeader = memo(({ patData, saving, onSave, onWhatsApp }) => (
  <div style={{
    padding: '10px 16px',
    borderBottom: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', gap: 12,
    flexShrink: 0, flexWrap: 'wrap',
    background: C.surface,
  }}>
    {/* Avatar */}
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: C.brandSoft, color: C.brand,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 15, flexShrink: 0,
      fontFamily: C.font,
    }}>
      {ini(patData?.name || '')}
    </div>

    {/* Info */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>
          {patData?.name}
        </span>
        {patData?.num_hc && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            borderRadius: 100, background: C.brandSoft, color: C.brand,
          }}>
            HC: {patData.num_hc}
          </span>
        )}
        {patData?.allergies && patData.allergies !== 'Ninguna' && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            borderRadius: 100, background: C.redSoft, color: C.red,
          }}>
            ⚠ Alergia: {patData.allergies}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: C.inkMute, marginTop: 2 }}>
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

    {/* Próx. cita */}
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: 10, color: C.inkMute }}>Próx. cita</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.brand }}>
        {patData?.nextVisit || '---'}
      </div>
    </div>

    {/* Acciones */}
    <button
      onClick={onSave}
      style={{
        padding: '7px 14px', borderRadius: C.r, border: 'none',
        background: C.brand, color: '#fff',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: C.font, flexShrink: 0,
        opacity: saving ? 0.6 : 1,
      }}
    >
      {saving ? '⏳ Guardando…' : '💾 Guardar'}
    </button>

    <button
      onClick={onWhatsApp}
      style={{
        width: 34, height: 34, borderRadius: C.r, border: 'none',
        background: '#25D366', color: '#fff', fontSize: 16,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}
    >
      💬
    </button>
  </div>
));

// ─── SUB-COMPONENTE: SECTION HEADER (usado en Ortodoncia) ────────────────────
const SectionHeader = memo(({ title }) => (
  <div style={{
    color: C.orto, fontSize: 14, fontWeight: 700,
    marginTop: 32, marginBottom: 16,
    paddingBottom: 10,
    borderBottom: `1px solid ${C.border}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    fontFamily: C.font,
  }}>
    {title}
    <span style={{ fontSize: 18, cursor: 'pointer', color: C.inkMute }}>⌃</span>
  </div>
));

// ─── SUB-COMPONENTE: SAVE BUTTON (Ortodoncia) ─────────────────────────────────
const OrtoSaveBtn = memo(({ onClick, saving, label }) => (
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 40 }}>
    <button
      onClick={onClick}
      style={{
        background: C.orto, color: '#fff', border: 'none',
        borderRadius: C.r, padding: '12px 48px',
        fontWeight: 600, cursor: 'pointer', fontSize: 14,
        fontFamily: C.font,
        boxShadow: '0 4px 12px rgba(0,135,179,0.25)',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {saving ? 'Guardando…' : label}
    </button>
  </div>
));

// ─── COMPONENTE PRINCIPAL: HISTORIA ──────────────────────────────────────────
export default function Historia({
  patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView,
}) {
  const [tab, setTab] = useState('filiacion');
  const [patData, setPatData] = useState(patient);

  useEffect(() => { setPatData(patient); }, [patient]);

  // ── Estados ortodoncia ──────────────────────────────────────────────────
  const [subTabOrto, setSubTabOrto]     = useState('examen');
  const [ortoForm, setOrtoForm]         = useState({});
  const [savingOrto, setSavingOrto]     = useState(false);
  const [planTrabajoForm, setPlanTrabajoForm] = useState({});
  const [savingTrabajo, setSavingTrabajo]     = useState(false);
  const [planTrataForm, setPlanTrataForm]     = useState({});
  const [savingTrata, setSavingTrata]         = useState(false);
  const [resumenForm, setResumenForm]         = useState({});
  const [savingResumen, setSavingResumen]     = useState(false);
  const [fotosOrto, setFotosOrto]             = useState({});
  const [savingFotosOrto, setSavingFotosOrto] = useState(false);

  // ── Estados generales ───────────────────────────────────────────────────
  const [isEditingFiliacion, setIsEditingFiliacion] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [anamnesisData, setAnamnesisData] = useState({});
  const [imagenesList, setImagenesList]   = useState([]);
  const [editForm, setEditForm]           = useState({});
  const [showTreatPicker, setShowTreatPicker] = useState(false);
  const [plan, setPlan] = useState([
    { id: 1, name: 'Control ortodoncia', tooth: '14-23', status: 'en_curso', cost: 80, paid: 80, date: '10 Jun 2025', sessions: 1 },
    { id: 2, name: 'Blanqueamiento clínico', tooth: '—', status: 'pendiente', cost: 180, paid: 0, date: '—', sessions: 1 },
    { id: 3, name: 'Radiografía panorámica', tooth: '—', status: 'completado', cost: 45, paid: 45, date: '10 Jun 2025', sessions: 1 },
  ]);
  const [dbPatients, setDbPatients]   = useState([]);
  const [searchTerm, setSearchTerm]   = useState('');
  const [loadingPats, setLoadingPats] = useState(false);

  // ── Handlers ortodoncia ─────────────────────────────────────────────────
  const handleOrto        = (f, v) => setOrtoForm(prev => ({ ...prev, [f]: v }));
  const handlePlanTrabajo = (f, v) => setPlanTrabajoForm(prev => ({ ...prev, [f]: v }));
  const handlePlanTrata   = (f, v) => setPlanTrataForm(prev => ({ ...prev, [f]: v }));
  const handleResumen     = (f, v) => setResumenForm(prev => ({ ...prev, [f]: v }));

  // ── Cargar datos ortodoncia ─────────────────────────────────────────────
  useEffect(() => {
    if (!patData?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('ortodoncia').select('*').eq('paciente_id', patData.id).maybeSingle();
      if (data) {
        if (data.examen_clinico)  setOrtoForm(data.examen_clinico);
        if (data.plan_trabajo)    setPlanTrabajoForm(data.plan_trabajo);
        if (data.plan_tratamiento) setPlanTrataForm(data.plan_tratamiento);
        if (data.fotografias)     setFotosOrto(data.fotografias);
        if (data.resumen)         setResumenForm(data.resumen);
      }
    };
    load();
  }, [patData]);

  // ── Helper upsert ortodoncia ─────────────────────────────────────────────
  const ortoUpsert = useCallback(async (payload) => {
    const { data: existe } = await supabase
      .from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    if (existe) {
      return supabase.from('ortodoncia').update(payload).eq('id', existe.id);
    }
    return supabase.from('ortodoncia').insert([{ paciente_id: patData.id, ...payload }]);
  }, [patData]);

  const handleSaveOrto = useCallback(async () => {
    setSavingOrto(true);
    const { error } = await ortoUpsert({ examen_clinico: ortoForm });
    if (error) alert('Error: ' + error.message);
    else alert('✅ Examen Clínico guardado.');
    setSavingOrto(false);
  }, [ortoUpsert, ortoForm]);

  const handleSavePlanTrabajo = useCallback(async () => {
    setSavingTrabajo(true);
    const { error } = await ortoUpsert({ plan_trabajo: planTrabajoForm });
    if (error) alert('Error: ' + error.message);
    else alert('✅ Plan de Trabajo guardado.');
    setSavingTrabajo(false);
  }, [ortoUpsert, planTrabajoForm]);

  const handleSavePlanTrata = useCallback(async () => {
    setSavingTrata(true);
    const { error } = await ortoUpsert({ plan_tratamiento: planTrataForm });
    if (error) alert('Error: ' + error.message);
    else alert('✅ Plan de Tratamiento guardado.');
    setSavingTrata(false);
  }, [ortoUpsert, planTrataForm]);

  const handleSaveResumen = useCallback(async () => {
    setSavingResumen(true);
    const { error } = await ortoUpsert({ resumen: resumenForm });
    if (error) alert('Error: ' + error.message);
    else alert('✅ Resumen guardado.');
    setSavingResumen(false);
  }, [ortoUpsert, resumenForm]);

  // ── Fotos ortodoncia ──────────────────────────────────────────────────
  const handleUploadFotoOrto = useCallback(async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingFotosOrto(true);
    const ext = file.name.split('.').pop();
    const fileName = `orto-${patData.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
    if (uploadError) { alert('Error al subir: ' + uploadError.message); setSavingFotosOrto(false); return; }
    const { data: urlData } = supabase.storage.from('imagenes').getPublicUrl(fileName);
    const nuevaFoto = { url: urlData.publicUrl, date: new Date().toLocaleDateString('es-PE'), ext };
    const nuevoEstado = { ...fotosOrto, [key]: nuevaFoto };
    setFotosOrto(nuevoEstado);
    await ortoUpsert({ fotografias: nuevoEstado });
    setSavingFotosOrto(false);
  }, [patData, fotosOrto, ortoUpsert]);

  const handleDeleteFotoOrto = useCallback(async (key, url) => {
    if (!window.confirm(`¿Eliminar ${key} permanentemente?`)) return;
    setSavingFotosOrto(true);
    const fileName = url.split('/').pop();
    await supabase.storage.from('imagenes').remove([fileName]);
    const nuevoEstado = { ...fotosOrto };
    delete nuevoEstado[key];
    setFotosOrto(nuevoEstado);
    await ortoUpsert({ fotografias: nuevoEstado });
    setSavingFotosOrto(false);
  }, [fotosOrto, ortoUpsert]);

  // ── Cargar historia ───────────────────────────────────────────────────
  useEffect(() => {
    if (!patient?.id) return;
    const load = async () => {
      setTeeth({}); setTeethEvolucion({}); setAnamnesisData({}); setPlan([]); setImagenesList([]);
      const { data } = await supabase.from('historias').select('*').eq('patient_id', patient.id).maybeSingle();
      if (data) {
        if (data.odontograma && Object.keys(data.odontograma).length > 0) setTeeth(data.odontograma);
        if (data.evolucion   && Object.keys(data.evolucion).length > 0)   setTeethEvolucion(data.evolucion);
        if (data.anamnesis)        setAnamnesisData(data.anamnesis);
        if (data.plan_tratamiento) setPlan(data.plan_tratamiento);
        if (data.imagenes)         setImagenesList(data.imagenes);
      }
    };
    load();
  }, [patient, setTeeth, setTeethEvolucion]);

  useEffect(() => {
    if (patData || patient) setEditForm(patData || patient);
  }, [patData, patient]);

  // ── Cargar pacientes para buscador sin paciente ─────────────────────
  useEffect(() => {
    if (patient) return;
    const fetch = async () => {
      setLoadingPats(true);
      const { data } = await supabase.from('pacientes').select('*').order('name', { ascending: true });
      if (data) {
        const unicos = []; const vistos = new Set();
        data.forEach(p => {
          const n = (p.name || '').trim().toLowerCase();
          if (n && !vistos.has(n)) { vistos.add(n); unicos.push(p); }
        });
        setDbPatients(unicos);
      }
      setLoadingPats(false);
    };
    fetch();
  }, [patient]);

  // ── Guardar historia en nube ─────────────────────────────────────────
  const saveAllToCloud = useCallback(async () => {
    setSaving(true);
    const limpiarDientes = (base) => {
      const res = {};
      Object.keys(base || {}).forEach(num => {
        const pieza = base[num];
        const surfs = getSurfs(num);
        const vals = surfs.map(s => pieza[s]).filter(v => v && v !== 'normal');
        if (vals.length === surfs.length && vals.every(v => v === vals[0])) {
          res[num] = { todaPieza: vals[0] };
          if (pieza.note) res[num].note = pieza.note;
        } else {
          const f = {};
          let hay = false;
          Object.keys(pieza).forEach(k => {
            const v = pieza[k];
            if (k === 'note' && v?.trim()) { f[k] = v; hay = true; }
            else if (k !== 'note' && v && v !== 'normal') { f[k] = v; hay = true; }
          });
          if (hay) res[num] = f;
        }
      });
      return res;
    };
    const cleanInicial = limpiarDientes(teeth);
    const cleanEvo     = limpiarDientes(teethEvolucion);
    setTeeth(cleanInicial); setTeethEvolucion(cleanEvo);
    const { error } = await supabase.from('historias').upsert(
      { patient_id: patient.id, odontograma: cleanInicial, evolucion: cleanEvo, anamnesis: anamnesisData, plan_tratamiento: plan, imagenes: imagenesList },
      { onConflict: 'patient_id' }
    );
    if (error) alert('Error al guardar: ' + error.message);
    else alert('¡Datos guardados con éxito!');
    setSaving(false);
  }, [teeth, teethEvolucion, anamnesisData, plan, imagenesList, patient, setTeeth, setTeethEvolucion]);

  // ── Imágenes ─────────────────────────────────────────────────────────
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaving(true);
    const ext = file.name.split('.').pop();
    const fileName = `${patient.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('imagenes').upload(fileName, file);
    if (error) { alert('Error: ' + error.message); setSaving(false); return; }
    const { data: urlData } = supabase.storage.from('imagenes').getPublicUrl(fileName);
    const nueva = { type: 'Radiografía / Foto', date: new Date().toLocaleDateString('es-PE'), url: urlData.publicUrl };
    const nuevaLista = [...imagenesList, nueva];
    setImagenesList(nuevaLista);
    await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    setSaving(false);
    alert('¡Imagen subida y guardada!');
  }, [imagenesList, patient]);

  const handleDeleteImage = useCallback(async (idx, url) => {
    if (!window.confirm('¿Eliminar esta imagen permanentemente?')) return;
    setSaving(true);
    const fileName = url.split('/').pop();
    await supabase.storage.from('imagenes').remove([fileName]);
    const nuevaLista = imagenesList.filter((_, i) => i !== idx);
    setImagenesList(nuevaLista);
    await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    setSaving(false);
  }, [imagenesList, patient]);

  // ── Editar filiación ─────────────────────────────────────────────────
  const handleSaveEditPatient = useCallback(async () => {
    setSaving(true);
    const { data, error } = await supabase.from('pacientes').update({
      name: editForm.name, doc: editForm.doc, tipo_doc: editForm.tipo_doc,
      phone: editForm.phone, cod_pais: editForm.cod_pais, email: editForm.email,
      direccion: editForm.direccion, sexo: editForm.sexo, birthDate: editForm.birthDate,
      age: editForm.age, blood: editForm.blood, allergies: editForm.allergies,
      num_hc: editForm.num_hc, pais_nacimiento: editForm.pais_nacimiento,
      ocupacion: editForm.ocupacion, fuente_captacion: editForm.fuente_captacion,
      linea_negocio: editForm.linea_negocio, apoderado: editForm.apoderado,
      apoderado_dni: editForm.apoderado_dni, parentesco: editForm.parentesco,
    }).eq('id', patData.id).select();
    if (error) alert('Error: ' + error.message);
    else if (data?.[0]) { setPatData(data[0]); setIsEditingFiliacion(false); alert('✅ Datos guardados.'); }
    setSaving(false);
  }, [editForm, patData]);

  // ── Helpers selectores ortodoncia ─────────────────────────────────────
  const renderSelectOrto = (label, field, options, hasNote = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={ortoForm[field] || ''} onChange={e => handleOrto(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasNote && <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, fontStyle: 'italic', color: C.inkMid, fontSize: '12.5px', height: '36px', marginTop: 4 }} />}
    </div>
  );

  const renderSelectTrata = (label, field, options) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={planTrataForm[field] || ''} onChange={e => handlePlanTrata(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const renderIntraRow = (label, field, opts) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${C.border}`, gap: 20, width: '100%' }}>
      <div style={{ width: 180, minWidth: 180, fontSize: 13, color: C.inkMid, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', gap: 15, flexShrink: 0 }}>
        {opts.map(opt => (
          <label key={opt} style={{ fontSize: 12.5, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={ortoForm[`${field}_${opt}`] || false} onChange={e => handleOrto(`${field}_${opt}`, e.target.checked)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
            {opt}
          </label>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, width: '100%', height: 32, fontSize: '12.5px', padding: '4px 10px', border: `1px solid ${C.borderStrong}`, borderRadius: C.r, boxSizing: 'border-box' }} />
      </div>
    </div>
  );

  // ── Vista sin paciente (buscador) ─────────────────────────────────────
  if (!patient) {
    const filtered = dbPatients.filter(p => {
      const t = searchTerm.toLowerCase();
      return (p.name || '').toLowerCase().includes(t) || (p.doc || '').toLowerCase().includes(t) || (p.phone || '').toLowerCase().includes(t);
    });

    return (
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto', background: C.bg }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.ink, margin: '0 0 4px', fontFamily: C.font }}>
            Buscador de Pacientes
          </h1>
          <p style={{ fontSize: 13, color: C.inkMute, margin: 0 }}>
            Accede al historial clínico completo de tus pacientes.
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o celular..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            style={{
              width: '100%', padding: '12px 16px',
              borderRadius: C.rl, border: `1px solid ${C.border}`,
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
              color: C.ink, fontFamily: C.font, background: C.surface,
              boxShadow: C.shadowSm,
            }}
            onFocus={e => { e.target.style.borderColor = C.brand; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          />
          <span style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 12, color: C.inkMute, fontFamily: C.font, fontWeight: 500,
          }}>
            {filtered.length} registros
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => setView('historia', p)}
              style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: C.rl, padding: 18, cursor: 'pointer',
                boxShadow: C.shadowSm, transition: 'all 0.15s',
                borderLeft: `3px solid ${C.brand}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = C.shadowSm; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: C.r, background: C.brandSoft, color: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                  {ini(p.name)}
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 11, background: C.surfaceAlt, color: C.inkMid, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{p.sexo || 'N/A'}</span>
                    <span style={{ fontSize: 11, background: C.surfaceAlt, color: C.inkMid, padding: '2px 7px', borderRadius: 4, fontWeight: 500 }}>{p.age ? `${p.age} años` : '—'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div><span style={{ fontSize: 10, color: C.inkMute, fontWeight: 600, textTransform: 'uppercase' }}>Documento</span><div style={{ fontSize: 12, color: C.ink, fontWeight: 600, marginTop: 1 }}>🆔 {p.doc || '---'}</div></div>
                <div><span style={{ fontSize: 10, color: C.inkMute, fontWeight: 600, textTransform: 'uppercase' }}>WhatsApp</span><div style={{ fontSize: 12, color: C.ink, fontWeight: 600, marginTop: 1 }}>📱 {p.phone || '---'}</div></div>
              </div>
              <div style={{ marginTop: 10, textAlign: 'right', fontSize: 11, fontWeight: 700, color: C.brand }}>
                Ver expediente →
              </div>
            </div>
          ))}
          {!loadingPats && filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '60px 0', textAlign: 'center', color: C.inkMute, fontSize: 13 }}>
              No se encontraron resultados para <strong>"{searchTerm}"</strong>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista con paciente ────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Cabecera del paciente */}
      <PatientHeader
        patData={patData}
        saving={saving}
        onSave={saveAllToCloud}
        onWhatsApp={() => {}}
      />

      {/* Tabs principales */}
      <div style={{
        display: 'flex', gap: 2, padding: '6px 12px',
        background: C.surfaceAlt, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0, overflowX: 'auto',
      }}>
        {MAIN_TABS.map(t => (
          <TabPill key={t.id} id={t.id} label={t.label} isActive={tab === t.id} onClick={setTab} />
        ))}
      </div>

      {/* Contenido de tabs */}
      <div style={{ flex: 1, overflow: 'hidden' }}>

        {/* ── FILIACIÓN ── */}
        {tab === 'filiacion' && (
          <div style={{ padding: 24, overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ maxWidth: 960, margin: '0 auto', background: C.surface, borderRadius: C.rl, border: `1px solid ${C.border}`, padding: 32, boxShadow: C.shadowSm }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <h2 style={{ margin: 0, color: C.ink, fontSize: 18, fontWeight: 700, fontFamily: C.font }}>Datos Personales</h2>
                <div>
                  {!isEditingFiliacion ? (
                    <button onClick={() => setIsEditingFiliacion(true)} style={{ background: C.surfaceAlt, color: C.inkMid, border: `1px solid ${C.borderStrong}`, borderRadius: C.r, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: C.font }}>
                      ✏️ Editar
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setEditForm(patData); setIsEditingFiliacion(false); }} style={{ background: C.surface, color: C.red, border: `1px solid ${C.red}44`, borderRadius: C.r, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: C.font }}>Cancelar</button>
                      <button onClick={handleSaveEditPatient} style={{ background: C.brand, color: '#fff', border: 'none', borderRadius: C.r, padding: '7px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: C.font }}>{saving ? 'Guardando…' : '💾 Guardar'}</button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {/* Nombre */}
                <div><label style={labelStyleDoc}>Nombres y Apellidos</label><input disabled={!isEditingFiliacion} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div>
                {/* HC */}
                <div><label style={labelStyleDoc}>N° HC</label><input readOnly value={editForm.num_hc || ''} placeholder="Autogenerado" style={{ ...inputStyleDoc, background: C.surfaceAlt, borderColor: 'transparent', cursor: 'not-allowed', fontWeight: 700, color: C.inkMid }} /></div>
                {/* Sexo */}
                <div><label style={labelStyleDoc}>Sexo</label><select disabled={!isEditingFiliacion} value={editForm.sexo || ''} onChange={e => setEditForm({ ...editForm, sexo: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }}><option value="">Seleccionar</option><option>Mujer</option><option>Hombre</option></select></div>
                {/* Documento */}
                <div><label style={labelStyleDoc}>Documento</label><div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8 }}><select disabled={!isEditingFiliacion} value={editForm.tipo_doc || 'DNI'} onChange={e => setEditForm({ ...editForm, tipo_doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }}><option>DNI</option><option>CE</option><option>Pasaporte</option><option>RUC</option></select><input disabled={!isEditingFiliacion} value={editForm.doc || ''} onChange={e => setEditForm({ ...editForm, doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div></div>
                {/* Teléfono */}
                <div><label style={labelStyleDoc}>Teléfono</label><div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}><select disabled={!isEditingFiliacion} value={editForm.cod_pais || '+51'} onChange={e => setEditForm({ ...editForm, cod_pais: e.target.value })} style={{ ...inputStyleDoc, padding: '8px 4px', background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }}>{TODAS_NACIONES.map(n => <option key={n.n} value={n.c}>{n.b} {n.c}</option>)}</select><input disabled={!isEditingFiliacion} value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div></div>
                {/* Email */}
                <div><label style={labelStyleDoc}>Email</label><input disabled={!isEditingFiliacion} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div>
                {/* Nacimiento */}
                <div><label style={labelStyleDoc}>F. Nacimiento y Edad</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 65px', gap: 8 }}><input disabled={!isEditingFiliacion} type="date" value={editForm.birthDate || ''} onChange={e => { const bDay = e.target.value; let age = editForm.age; if (bDay) { const today = new Date(); const b = new Date(bDay); age = today.getFullYear() - b.getFullYear(); } setEditForm({ ...editForm, birthDate: bDay, age }); }} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /><input readOnly value={editForm.age || ''} style={{ ...inputStyleDoc, background: C.surfaceAlt, textAlign: 'center', borderColor: 'transparent' }} /></div></div>
                {/* País */}
                <div><label style={labelStyleDoc}>País de nacimiento</label><select disabled={!isEditingFiliacion} value={editForm.pais_nacimiento || ''} onChange={e => setEditForm({ ...editForm, pais_nacimiento: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }}><option value="">Seleccionar</option>{TODAS_NACIONES.map(n => <option key={n.n} value={n.n}>{n.b} {n.n}</option>)}</select></div>
                {/* Ocupación */}
                <div><label style={labelStyleDoc}>Ocupación</label><input disabled={!isEditingFiliacion} value={editForm.ocupacion || ''} onChange={e => setEditForm({ ...editForm, ocupacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div>
                {/* Dirección */}
                <div style={{ gridColumn: 'span 2' }}><label style={labelStyleDoc}>Dirección</label><input disabled={!isEditingFiliacion} value={editForm.direccion || ''} onChange={e => setEditForm({ ...editForm, direccion: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div>
                {/* Sangre */}
                <div><label style={labelStyleDoc}>Grupo Sanguíneo</label><input disabled={!isEditingFiliacion} value={editForm.blood || ''} onChange={e => setEditForm({ ...editForm, blood: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div>
                {/* Fuente */}
                <div><label style={labelStyleDoc}>Fuente captación</label><select disabled={!isEditingFiliacion} value={editForm.fuente_captacion || ''} onChange={e => setEditForm({ ...editForm, fuente_captacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }}><option value="">Seleccionar</option>{['Facebook','Instagram','Tiktok','Google','Referido por paciente','Referido por doctor','Amigos y familiares','Fachada'].map(o => <option key={o}>{o}</option>)}</select></div>
                {/* Línea */}
                <div><label style={labelStyleDoc}>Línea de negocio</label><select disabled={!isEditingFiliacion} value={editForm.linea_negocio || ''} onChange={e => setEditForm({ ...editForm, linea_negocio: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }}><option value="">Seleccionar</option>{['Ortodoncia','Rehabilitación','Estética','Endodoncia','Tratamiento integral','Odontopediatría'].map(o => <option key={o}>{o}</option>)}</select></div>
                {/* Alergias */}
                <div><label style={labelStyleDoc}>Alergias</label><input disabled={!isEditingFiliacion} value={editForm.allergies || ''} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} /></div>
              </div>

              {/* Apoderado (menores) */}
              {editForm.age < 18 && (
                <div style={{ marginTop: 40 }}>
                  <h3 style={{ color: C.orto, fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    Familiar / Apoderado
                    <span style={{ fontSize: 10, background: '#fee2e2', color: C.red, padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>Requerido</span>
                  </h3>
                  <div style={{ border: `1px solid ${C.border}`, borderRadius: C.r, overflow: 'hidden' }}>
                    <div style={{ background: C.brand, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '10px 16px' }}>
                      {['Nombre', 'N° doc', 'Parentesco'].map(h => <div key={h} style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{h}</div>)}
                    </div>
                    <div style={{ background: C.surfaceAlt, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, padding: 16 }}>
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado || ''} onChange={e => setEditForm({ ...editForm, apoderado: e.target.value })} placeholder="Nombre completo" style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado_dni || ''} onChange={e => setEditForm({ ...editForm, apoderado_dni: e.target.value })} placeholder="DNI/CE" style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.parentesco || ''} onChange={e => setEditForm({ ...editForm, parentesco: e.target.value })} placeholder="Ej: Madre" style={{ ...inputStyleDoc, background: isEditingFiliacion ? C.surface : C.surfaceAlt, borderColor: isEditingFiliacion ? C.borderStrong : 'transparent' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ODONTOGRAMA ── */}
        {tab === 'odontograma' && (
          <Odontograma patient={patData || patient} teeth={teeth} setTeeth={setTeeth} teethEvolucion={teethEvolucion} setTeethEvolucion={setTeethEvolucion} />
        )}

        {/* ── ANAMNESIS ── */}
        {tab === 'anamnesis' && (
          <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { title: 'Motivo de consulta', fields: ['Motivo principal', 'Tiempo con el síntoma', 'Intensidad del dolor (1-10)', 'Tratamientos previos'] },
                { title: 'Antecedentes médicos', fields: ['Enfermedades sistémicas', 'Medicamentos actuales', 'Alergias', 'Cirugías/hospitalizaciones', 'Embarazo / lactancia'] },
                { title: 'Antecedentes estomatológicos', fields: ['Última visita dental', 'Tratamientos previos', 'Experiencias traumáticas', 'Hábitos (bruxismo, succión)', 'Higiene oral: frecuencia'] },
                { title: 'Signos vitales', fields: ['Presión arterial', 'Frecuencia cardíaca', 'Temperatura', 'Peso / Talla'] },
              ].map((sec, si) => (
                <div key={si} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>{sec.title}</div>
                  {sec.fields.map((f, fi) => (
                    <div key={fi} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: C.inkMute, fontWeight: 600, display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f}</label>
                      <input
                        style={{ width: '100%', border: 'none', borderBottom: `1px solid ${C.border}`, padding: '4px 0', fontSize: 13, outline: 'none', color: C.ink, background: 'transparent', boxSizing: 'border-box', fontFamily: C.font }}
                        value={anamnesisData[f] !== undefined ? anamnesisData[f] : (f.includes('Alerg') ? (patData?.allergies || '') : f.includes('Medic') ? (patData?.meds || '') : '')}
                        onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={saveAllToCloud} style={{ marginTop: 16, background: C.brand, color: '#fff', border: 'none', borderRadius: C.r, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>
              💾 Guardar anamnesis
            </button>
          </div>
        )}

        {/* ── ORTODONCIA ── */}
        {tab === 'ortodoncia' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ flex: 1, background: C.surface, borderRadius: C.rl, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', boxShadow: C.shadowSm, overflow: 'hidden' }}>
              {/* Sub-tabs ortodoncia */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 20px', gap: 16, background: C.surface, flexShrink: 0, overflowX: 'auto' }}>
                {ORTO_TABS.map(t => (
                  <UnderlineTab key={t.id} id={t.id} label={t.label} isActive={subTabOrto === t.id} onClick={setSubTabOrto} />
                ))}
              </div>

              <div style={{ padding: '24px 28px', flex: 1, overflowY: 'auto' }}>

                {/* Examen clínico — el contenido original completo se mantiene */}
                {subTabOrto === 'examen' && (
                  <div>
                    <SectionHeader title="Sección" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {['Motivo de consulta', 'Historia médica', 'Historia odontológica', 'Historia Familiar'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'center', gap: 16 }}>
                          <label style={{ fontSize: 13, color: C.inkMid, fontWeight: 500 }}>{f}</label>
                          <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={inputStyleDoc} />
                        </div>
                      ))}
                    </div>
                    <SectionHeader title="Examen Extraoral" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
                      {renderSelectOrto('Cráneo', 'craneo', ['Mesocéfalo', 'Braquicéfalo', 'Dolicéfalo'])}
                      {renderSelectOrto('Cara', 'cara', ['Mesofacial', 'Braquifacial', 'Dolicofacial'])}
                      {renderSelectOrto('Musculatura', 'musculatura', ['Normal', 'Alterada'])}
                      {renderSelectOrto('ATM', 'atm', ['Apertura bucal normal', 'Dolor al despertar', 'Dolor agudo', 'Click articular', 'Crepitación'])}
                      {renderSelectOrto('Mentón', 'menton_ext', ['Normal', 'Pobre', 'Prominente'])}
                      {renderSelectOrto('ANL', 'anl', ['Normal', 'Cerrado', 'Abierto'])}
                      {renderSelectOrto('Fonación', 'fonacion', ['Normal', 'Rotacismo', 'Seseo'])}
                      {renderSelectOrto('Deglución', 'deglucion', ['Normal', 'Atípica tipo I', 'Atípica tipo II', 'Atípica tipo III'])}
                      {renderSelectOrto('Respiración', 'respiracion', ['Normal', 'Mixta'])}
                      {renderSelectOrto('Permeabilidad nasal', 'permeabilidad', ['Normal', 'Disminuida'])}
                      {renderSelectOrto('Hábitos', 'habitos', ['Ausentes', 'Respiración oral', 'Succión del pulgar'])}
                    </div>
                    <textarea value={ortoForm.extraoral_notas || ''} onChange={e => handleOrto('extraoral_notas', e.target.value)} style={{ ...inputStyleDoc, height: 72, marginTop: 16, resize: 'none', width: '100%' }} />

                    <SectionHeader title="Examen Intraoral" />
                    {[
                      ['Mucosa de labio', 'mucosa_labio', ['Normal', 'Alterada']],
                      ['Mucosa vestibular', 'mucosa_vestibular', ['Normal', 'Alterada']],
                      ['Frenillos vestibulares', 'frenillos_vest', ['Normal', 'Alterada']],
                      ['Mucosa palatina', 'mucosa_palatina', ['Normal', 'Alterada']],
                      ['Amígdalas', 'amigdalas', ['Normales', 'Hipertróficas']],
                    ].map(([label, field, opts]) => renderIntraRow(label, field, opts))}

                    <SectionHeader title="Relaciones Oclusales" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
                      {renderSelectOrto('Relación molar derecha', 'rel_molar_der', ['Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación molar izquierda', 'rel_molar_izq', ['Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación canina derecha', 'rel_can_der', ['Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación canina izquierda', 'rel_can_izq', ['Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Resalte horizontal', 'res_horizontal', ['NR', 'Normal', 'Aumentado', 'Invertido'], true)}
                      {renderSelectOrto('Resalte vertical', 'res_vertical', ['NR', 'Normal', 'Acentuada'], true)}
                      {renderSelectOrto('Línea media superior', 'linea_med_sup', ['Alineada', 'Discrepante derecha', 'Discrepante izquierda'], true)}
                      {renderSelectOrto('Línea media inferior', 'linea_med_inf', ['Alineada', 'Discrepante derecha', 'Discrepante izquierda'], true)}
                    </div>

                    <SectionHeader title="Conclusión" />
                    {['Observaciones', 'Maloclusión'].map(f => (
                      <div key={f} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                        <label style={{ fontSize: 13, color: C.inkMid, fontWeight: 500 }}>{f}</label>
                        <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={inputStyleDoc} />
                      </div>
                    ))}
                    <OrtoSaveBtn onClick={handleSaveOrto} saving={savingOrto} label="💾 Guardar Examen Clínico" />
                  </div>
                )}

                {subTabOrto === 'trabajo' && (
                  <div>
                    <SectionHeader title="Sección" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                      {[['Fotografías set ortodóntico', 'Fotografías set quirúrgico'], ['Modelos de estudio con alginato', 'Modelos de estudio con silicona'], ['TAC de volumen completo con protocolo Morzán', 'TAC de campo pequeño']].map((row, ri) => (
                        <div key={ri} style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                          {row.map(opt => (
                            <label key={opt} style={{ fontSize: 13, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                              <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                    <textarea placeholder="Notas..." value={planTrabajoForm.notas_seccion || ''} onChange={e => handlePlanTrabajo('notas_seccion', e.target.value)} style={{ ...inputStyleDoc, height: 80, resize: 'none', width: '100%' }} />

                    <SectionHeader title="Radiografías" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                      {['Postero anterior', 'Periapicales de incisivos superiores', 'Periapicales de incisivos inferiores', 'Bitewing de molares', 'Panorámica', 'Carpal', 'Oclusal superior', 'Oclusal inferior'].map(opt => (
                        <label key={opt} style={{ fontSize: 13, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>

                    <SectionHeader title="Interconsultas" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                      {['Otorrinolaringólogo', 'Odontopediatra', 'Cirujano Máxilo facial', 'Periodoncista', 'Fisioterapeuta Oral', 'Psicólogo'].map(opt => (
                        <label key={opt} style={{ fontSize: 13, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ ...labelStyleDoc, marginBottom: 6 }}>Diagnóstico definitivo</label>
                      <textarea value={planTrabajoForm.diag_definitivo || ''} onChange={e => handlePlanTrabajo('diag_definitivo', e.target.value)} style={{ ...inputStyleDoc, height: 72, resize: 'none', width: '100%' }} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ ...labelStyleDoc, marginBottom: 6 }}>Objetivo</label>
                      <textarea value={planTrabajoForm.objetivo || ''} onChange={e => handlePlanTrabajo('objetivo', e.target.value)} style={{ ...inputStyleDoc, height: 72, resize: 'none', width: '100%' }} />
                    </div>
                    <OrtoSaveBtn onClick={handleSavePlanTrabajo} saving={savingTrabajo} label="Guardar Plan de Trabajo" />
                  </div>
                )}

                {subTabOrto === 'tratamiento' && (
                  <div>
                    <SectionHeader title="Sección" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
                      <div><label style={labelStyleDoc}>Fecha inicial</label><input type="date" value={planTrataForm.fecha_inicial || ''} onChange={e => handlePlanTrata('fecha_inicial', e.target.value)} style={inputStyleDoc} /></div>
                      <div><label style={labelStyleDoc}>Tiempo estimado (meses)</label><input type="number" placeholder="Ej: 18" value={planTrataForm.tiempo_estimado || ''} onChange={e => handlePlanTrata('tiempo_estimado', e.target.value)} style={inputStyleDoc} /></div>
                      <div><label style={labelStyleDoc}>Fecha final</label><input type="date" value={planTrataForm.fecha_final || ''} onChange={e => handlePlanTrata('fecha_final', e.target.value)} style={inputStyleDoc} /></div>
                    </div>

                    <SectionHeader title="Aparatos Ortopédicos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
                      {['AEO', 'ERP Haas', 'ERP Hyrax', 'ERP MARPE tipo Moon', 'Máscara facial Delaire', 'Máscara facial Petit', 'Mentonera', 'Placa labio activa'].map(opt => (
                        <label key={opt} style={{ fontSize: 13, color: C.inkMid, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>

                    <SectionHeader title="Otros" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                      {renderSelectTrata('Técnica', 'tecnica', ['CCO', 'Roth', 'Estándar', 'Mbt', 'Autoligantes', 'Linguales'])}
                      {renderSelectTrata('Brackets', 'brackets', ['Brackets de acero', 'Brackets de porcelana', 'Mixto sup/inf'])}
                      {renderSelectTrata('Tubos adhesivos sup.', 'tubos_adh_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas'])}
                      {renderSelectTrata('Tubos adhesivos inf.', 'tubos_adh_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas'])}
                    </div>
                    <OrtoSaveBtn onClick={handleSavePlanTrata} saving={savingTrata} label="Guardar Plan de Tratamiento" />
                  </div>
                )}

                {subTabOrto === 'resumen' && (
                  <div>
                    <SectionHeader title="Sección" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                      <div><label style={labelStyleDoc}>Fecha inicial</label><input type="date" value={resumenForm.fecha_inicial || ''} onChange={e => handleResumen('fecha_inicial', e.target.value)} style={inputStyleDoc} /></div>
                      <div><label style={labelStyleDoc}>Fecha final</label><input type="date" value={resumenForm.fecha_final || ''} onChange={e => handleResumen('fecha_final', e.target.value)} style={inputStyleDoc} /></div>
                      <div><label style={labelStyleDoc}>Tiempo estimado (meses)</label><input type="number" value={resumenForm.tiempo_estimado || ''} onChange={e => handleResumen('tiempo_estimado', e.target.value)} style={inputStyleDoc} /></div>
                      <div><label style={labelStyleDoc}>Tipo de Brackets</label><select value={resumenForm.tipo_brackets || ''} onChange={e => handleResumen('tipo_brackets', e.target.value)} style={inputStyleDoc}><option value="">Seleccionar</option>{['Bracket metálico', 'Bracket cerámico', 'Bracket zafiro', 'Bracket lingual', 'Invisalign', 'Autoligante metálico', 'Autoligante estético'].map(o => <option key={o}>{o}</option>)}</select></div>
                    </div>
                    <div style={{ marginBottom: 16 }}><label style={labelStyleDoc}>Diagnóstico</label><textarea value={resumenForm.diagnostico || ''} onChange={e => handleResumen('diagnostico', e.target.value)} style={{ ...inputStyleDoc, height: 80, resize: 'none', width: '100%' }} /></div>
                    <div style={{ marginBottom: 16 }}><label style={labelStyleDoc}>Nota</label><textarea value={resumenForm.notas || ''} onChange={e => handleResumen('notas', e.target.value)} style={{ ...inputStyleDoc, height: 72, resize: 'none', width: '100%' }} /></div>
                    <OrtoSaveBtn onClick={handleSaveResumen} saving={savingResumen} label="Guardar Resumen" />
                  </div>
                )}

                {subTabOrto === 'fotografias' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <h3 style={{ color: C.ink, fontSize: 16, fontWeight: 700, margin: 0, fontFamily: C.font }}>Archivos Clínicos Iniciales</h3>
                      {savingFotosOrto && <span style={{ fontSize: 12, color: C.orto, fontWeight: 600 }}>⏳ Sincronizando…</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16, paddingBottom: 40 }}>
                      {ORTO_CAJAS.map(item => {
                        const fileData = fotosOrto[item.key];
                        const hasFile = !!fileData;
                        return (
                          <div key={item.key} style={{ background: C.surface, border: `1px solid ${hasFile ? C.orto : C.border}`, borderRadius: C.rl, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', transition: 'all 0.15s' }}>
                            {hasFile && (
                              <button onClick={() => handleDeleteFotoOrto(item.key, fileData.url)} style={{ position: 'absolute', top: 7, right: 7, background: C.red, color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 10, fontWeight: 700, cursor: 'pointer', zIndex: 10 }}>✕</button>
                            )}
                            <div style={{ height: 130, background: hasFile ? '#000' : C.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                              {hasFile ? (
                                fileData.ext?.match(/(pdf|ppt|pptx)/i) ? (
                                  <a href={fileData.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontSize: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff' }}>📄<span style={{ fontSize: 10, marginTop: 4, color: '#ccc' }}>Abrir {fileData.ext.toUpperCase()}</span></a>
                                ) : (
                                  <a href={fileData.url} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                                    <img src={fileData.url} alt={item.key} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                  </a>
                                )
                              ) : (
                                <>
                                  <div style={{ fontSize: 40, opacity: 0.25 }}>{item.icon}</div>
                                  {!savingFotosOrto && (
                                    <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, background: 'rgba(239,246,255,0.92)', transition: 'opacity 0.15s' }}
                                      onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                                      onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}>
                                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.orto, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>+</div>
                                      <span style={{ fontSize: 11, color: C.orto, fontWeight: 700 }}>Subir archivo</span>
                                      <input type="file" accept={item.accept} style={{ display: 'none' }} onChange={e => handleUploadFotoOrto(e, item.key)} />
                                    </label>
                                  )}
                                </>
                              )}
                            </div>
                            <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}`, background: hasFile ? '#f0f9ff' : C.surface }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{item.key}</div>
                              <div style={{ fontSize: 10, color: hasFile ? C.orto : C.inkMute, marginTop: 3, fontWeight: hasFile ? 600 : 400 }}>
                                {hasFile ? `✓ Subido el ${fileData.date}` : 'Pendiente'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PLAN DE TRATAMIENTO ── */}
        {tab === 'plan' && (
          <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: C.font }}>Plan — {patData?.name || patient.name}</div>
              <button onClick={() => setShowTreatPicker(!showTreatPicker)} style={{ background: C.brand, color: '#fff', border: 'none', borderRadius: C.r, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>
                + Agregar tratamiento
              </button>
            </div>

            {showTreatPicker && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, padding: 16, marginBottom: 16, boxShadow: C.shadowSm }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.ink, marginBottom: 10 }}>Seleccionar tratamiento:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {TRATAMIENTOS_CAT.map(cat => (
                    <div key={cat.cat}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.brand, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 }}>{cat.cat}</div>
                      {cat.items.map(item => (
                        <div key={item}
                          onClick={() => { setPlan(p => [...p, { id: Date.now(), name: item, tooth: '—', status: 'pendiente', cost: PRECIOS[item] || 0, paid: 0, date: '—', sessions: 1 }]); setShowTreatPicker(false); }}
                          style={{ fontSize: 12, color: C.ink, padding: '3px 6px', borderRadius: C.r, cursor: 'pointer', marginBottom: 2 }}
                          onMouseEnter={e => { e.currentTarget.style.background = C.brandSoft; e.currentTarget.style.color = C.brand; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.ink; }}
                        >
                          {item} — S/{PRECIOS[item] || 0}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {['pendiente', 'en_curso', 'completado'].map(st => {
              const items = plan.filter(i => i.status === st);
              const b = sc(st);
              return (
                <div key={st} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: b.c, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.c }} />
                    {st.replace('_', ' ')} ({items.length})
                  </div>
                  {items.map(item => (
                    <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, padding: '10px 14px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: C.inkMute }}>Pieza: {item.tooth} · {item.date}</div>
                      </div>
                      <div style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>S/{item.cost}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['pendiente', 'en_curso', 'completado'].filter(s => s !== st).map(ns => (
                          <button key={ns}
                            onClick={() => setPlan(p => p.map(i => i.id === item.id ? { ...i, status: ns } : i))}
                            style={{ fontSize: 10, padding: '3px 8px', borderRadius: C.r, cursor: 'pointer', border: `1px solid ${sc(ns).c}44`, background: sc(ns).bg, color: sc(ns).c, fontWeight: 600, fontFamily: C.font }}>
                            → {ns.replace('_', ' ')}
                          </button>
                        ))}
                        <button onClick={() => setPlan(p => p.filter(i => i.id !== item.id))} style={{ fontSize: 10, padding: '3px 8px', borderRadius: C.r, cursor: 'pointer', border: `1px solid ${C.red}44`, background: '#fef2f2', color: C.red, fontWeight: 700, fontFamily: C.font }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 12, color: C.inkMute, fontStyle: 'italic', padding: '4px 8px' }}>Sin tratamientos en este estado</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── EVOLUCIÓN ── */}
        {tab === 'evolucion' && (
          <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: C.font }}>Notas de evolución</div>
              <button style={{ background: C.brand, color: '#fff', border: 'none', borderRadius: C.r, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>+ Nueva nota</button>
            </div>
            {[
              { date: '10 Jun 2025', dr: 'Dra. Sol Vargas', txt: 'Control de ortodoncia. Arco superior ajustado. Paciente refiere leve sensibilidad en pieza 14. Se recomienda pasta para dientes sensibles.' },
              { date: '15 Mar 2025', dr: 'Dra. Sol Vargas', txt: 'Instalación de brackets superior e inferior. Se explica protocolo de higiene oral. Sin complicaciones postoperatorias.' },
              { date: '10 Ene 2025', dr: 'Dra. Sol Vargas', txt: 'Consulta inicial. Evaluación integral. Maloclusión clase II. Se propone ortodoncia con brackets metálicos.' },
            ].map((n, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.brand }}>{n.date}</span>
                  <span style={{ fontSize: 11, color: C.inkMute }}>{n.dr}</span>
                </div>
                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.65 }}>{n.txt}</div>
              </div>
            ))}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 10 }}>Nueva nota clínica</div>
              <textarea placeholder="Descripción de la consulta, hallazgos clínicos y recomendaciones…" style={{ width: '100%', minHeight: 80, padding: 10, border: `1px solid ${C.border}`, borderRadius: C.r, fontSize: 13, resize: 'vertical', outline: 'none', color: C.ink, fontFamily: C.font, boxSizing: 'border-box' }} />
              <button style={{ marginTop: 10, background: C.brand, color: '#fff', border: 'none', borderRadius: C.r, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>💾 Guardar</button>
            </div>
          </div>
        )}

        {/* ── RECETAS ── */}
        {tab === 'recetas' && (
          <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, padding: 20, maxWidth: 520 }}>
              <div style={{ textAlign: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: C.inkMute }}>Cirujano Dentista · COP 12345</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {[['Paciente', patData?.name || patient.name], ['DNI', patData?.doc || patient.doc], ['Edad', `${patData?.age || patient.age} años`], ['Fecha', new Date().toLocaleDateString('es-PE')]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 10, color: C.inkMute, fontWeight: 600 }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, borderBottom: `1px solid ${C.border}`, paddingBottom: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Rp:</div>
              {[{ med: 'Amoxicilina 500mg', dose: '1 cápsula cada 8h x 7 días', inst: 'Tomar con alimentos' }, { med: 'Ibuprofeno 400mg', dose: '1 tableta cada 8h si hay dolor', inst: 'No superar 3 dosis/día' }].map((r, i) => (
                <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px dashed ${C.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>• {r.med}</div>
                  <div style={{ fontSize: 12, color: C.inkMid, marginLeft: 12 }}>{r.dose}</div>
                  <div style={{ fontSize: 11, color: C.inkMute, marginLeft: 12, fontStyle: 'italic' }}>{r.inst}</div>
                </div>
              ))}
              <textarea placeholder="Agregar medicamentos…" style={{ width: '100%', minHeight: 44, padding: 8, border: `1px solid ${C.border}`, borderRadius: C.r, fontSize: 12, resize: 'vertical', outline: 'none', fontFamily: C.font, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button style={{ flex: 1, background: C.brand, color: '#fff', border: 'none', borderRadius: C.r, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>🖨 Imprimir</button>
                <button style={{ flex: 1, background: '#25D366', color: '#fff', border: 'none', borderRadius: C.r, padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>💬 Enviar WA</button>
              </div>
            </div>
          </div>
        )}

        {/* ── IMÁGENES ── */}
        {tab === 'imagenes' && (
          <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: C.font }}>Imágenes y Radiografías</div>
              <label style={{ background: saving ? C.inkMute : C.brand, color: '#fff', borderRadius: C.r, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: C.font }}>
                {saving ? '⏳ Subiendo…' : '+ Subir imagen'}
                <input type="file" id="file-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
              {imagenesList.map((img, i) => (
                <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, overflow: 'hidden', position: 'relative', transition: 'border-color 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                  <button onClick={e => { e.stopPropagation(); handleDeleteImage(i, img.url); }} style={{ position: 'absolute', top: 6, right: 6, background: C.red, color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 10, fontWeight: 700, cursor: 'pointer', zIndex: 10 }}>✕</button>
                  <div style={{ height: 100, background: C.surfaceAlt, overflow: 'hidden' }}>
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>{img.type}</div>
                    <div style={{ fontSize: 10, color: C.inkMute }}>{img.date}</div>
                  </div>
                </div>
              ))}
              <label htmlFor="file-upload" style={{ background: C.surfaceAlt, border: `2px dashed ${C.border}`, borderRadius: C.rl, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6, transition: 'border-color 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <div style={{ fontSize: 24, color: C.border }}>+</div>
                <div style={{ fontSize: 11, color: C.inkMute, fontWeight: 600 }}>Subir archivo</div>
              </label>
            </div>
          </div>
        )}

        {/* ── PRESUPUESTO ── */}
        {tab === 'presupuesto' && (
          <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: C.bg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: C.font }}>Presupuesto</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ background: C.surface, color: C.brand, border: `1px solid ${C.brand}`, borderRadius: C.r, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>🖨 Imprimir</button>
                <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: C.r, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: C.font }}>💬 Enviar WA</button>
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: C.rl, overflow: 'hidden', maxWidth: 680, boxShadow: C.shadowSm }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', background: C.surfaceAlt }}>
                <div><div style={{ fontSize: 14, fontWeight: 700, color: C.brand }}>Presupuesto dental</div><div style={{ fontSize: 11, color: C.inkMute }}>Dra. Sol Vargas · {new Date().toLocaleDateString('es-PE')}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{patData?.name || patient.name}</div><div style={{ fontSize: 11, color: C.inkMute }}>DNI: {patData?.doc || patient.doc}</div></div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: C.surfaceAlt }}>
                  {['Tratamiento', 'Pieza', 'Costo', 'Pagado', 'Saldo'].map(h => <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: C.inkMute, fontWeight: 600, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {plan.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 14px', color: C.ink, fontWeight: 500 }}>{row.name}</td>
                      <td style={{ padding: '10px 14px', color: C.inkMid }}>{row.tooth}</td>
                      <td style={{ padding: '10px 14px', color: C.ink }}>S/{row.cost}</td>
                      <td style={{ padding: '10px 14px', color: C.brand, fontWeight: 600 }}>S/{row.paid}</td>
                      <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: C.surfaceAlt, color: C.inkMid }}>S/{row.cost - row.paid}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr style={{ background: C.surfaceAlt, borderTop: `2px solid ${C.borderStrong}` }}>
                  <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, color: C.ink }}>TOTAL</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: C.ink }}>S/{plan.reduce((s, i) => s + i.cost, 0)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: C.brand }}>S/{plan.reduce((s, i) => s + i.paid, 0)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: C.green }}>S/{plan.reduce((s, i) => s + (i.cost - i.paid), 0)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── CONSENTIMIENTOS ── */}
        {tab === 'consentimientos' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <Consentimientos patient={patData || patient} />
          </div>
        )}

      </div>
    </div>
  );
}