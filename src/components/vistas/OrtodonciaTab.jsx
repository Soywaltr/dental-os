// src/components/historia/OrtodonciaTab.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { labelStyleDoc, inputStyleDoc, RJ, BD } from '../../utils/constants';

const ORTO_TABS = [{ id: 'examen', lbl: 'Examen clínico' }, { id: 'trabajo', lbl: 'Plan de Trabajo' }, { id: 'tratamiento', lbl: 'Plan de tratamiento' }, { id: 'resumen', lbl: 'Resumen' }, { id: 'fotografias', lbl: 'Fotografías' }];
const ORTO_CAJAS = [{ key: 'Rx Panorámica', icon: '🦷', accept: 'image/*' }, { key: 'Rx Cefalométrica', icon: '📐', accept: 'image/*' }, { key: 'Rx Periapical', icon: '🔍', accept: 'image/*' }, { key: 'Foto frontal', icon: '😁', accept: 'image/*' }, { key: 'Foto lateral izquierda', icon: '📷', accept: 'image/*' }, { key: 'Foto lateral derecha', icon: '📸', accept: 'image/*' }, { key: 'Foto oclusal superior', icon: '👄', accept: 'image/*' }, { key: 'Foto oclusal inferior', icon: '👅', accept: 'image/*' }, { key: 'Modelo inicial', icon: '🧊', accept: 'image/*' }, { key: 'Plan de tratamiento', icon: '📄', accept: '.pdf,.ppt,.pptx,image/*' }];

const SectionHeader = ({ title }) => (
  <div style={{ color: '#0087b3', fontSize: '14px', fontWeight: 700, marginTop: '35px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    {title} <span style={{ fontSize: '18px', cursor: 'pointer' }}>⌃</span>
  </div>
);

export default function OrtodonciaTab({ patient }) {
  const [subTabOrto, setSubTabOrto] = useState('examen');
  const [ortoForm, setOrtoForm] = useState({});
  const [planTrabajoForm, setPlanTrabajoForm] = useState({});
  const [planTrataForm, setPlanTrataForm] = useState({});
  const [resumenForm, setResumenForm] = useState({});
  const [fotosOrto, setFotosOrto] = useState({});
  
  const [savingOrto, setSavingOrto] = useState(false);
  const [savingTrabajo, setSavingTrabajo] = useState(false);
  const [savingTrata, setSavingTrata] = useState(false);
  const [savingResumen, setSavingResumen] = useState(false);
  const [savingFotosOrto, setSavingFotosOrto] = useState(false);

  useEffect(() => {
    if (patient?.id) {
      const cargarDatosOrto = async () => {
        const { data } = await supabase.from('ortodoncia').select('*').eq('paciente_id', patient.id).maybeSingle();
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
  }, [patient]);

  const handleOrto = (c, v) => setOrtoForm(p => ({ ...p, [c]: v }));
  const handlePlanTrabajo = (c, v) => setPlanTrabajoForm(p => ({ ...p, [c]: v }));
  const handlePlanTrata = (c, v) => setPlanTrataForm(p => ({ ...p, [c]: v }));
  const handleResumen = (c, v) => setResumenForm(p => ({ ...p, [c]: v }));

  const genericSave = async (column, dataState, setSavingLoader, successMsg) => {
    setSavingLoader(true);
    const { data: ex } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patient.id).maybeSingle();
    let error;
    if (ex) {
      const res = await supabase.from('ortodoncia').update({ [column]: dataState }).eq('id', ex.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patient.id, [column]: dataState }]);
      error = res.error;
    }
    if (error) alert(`Error al guardar ${successMsg}: ` + error.message);
    else alert(`✅ ${successMsg} guardado con éxito.`);
    setSavingLoader(false);
  };

  const handleSaveOrto = () => genericSave('examen_clinico', ortoForm, setSavingOrto, 'Examen Clínico');
  const handleSavePlanTrabajo = () => genericSave('plan_trabajo', planTrabajoForm, setSavingTrabajo, 'Plan de Trabajo');
  const handleSavePlanTrata = () => genericSave('plan_tratamiento', planTrataForm, setSavingTrata, 'Plan de Tratamiento');
  const handleSaveResumen = () => genericSave('resumen', resumenForm, setSavingResumen, 'Resumen');

  const handleUploadFotoOrto = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingFotosOrto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `orto-${patient.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
    if (!uploadError) {
      const { data } = supabase.storage.from('imagenes').getPublicUrl(fileName);
      const nuevaFoto = { url: data.publicUrl, date: new Date().toLocaleDateString('es-PE'), ext: fileExt };
      const nuevoEstadoFotos = { ...fotosOrto, [key]: nuevaFoto };
      setFotosOrto(nuevoEstadoFotos);
      const { data: ex } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patient.id).maybeSingle();
      if (ex) await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', ex.id);
      else await supabase.from('ortodoncia').insert([{ paciente_id: patient.id, fotografias: nuevoEstadoFotos }]);
    }
    setSavingFotosOrto(false);
  };

  const handleDeleteFotoOrto = async (key, url) => {
    if (!window.confirm(`¿Eliminar ${key} permanentemente?`)) return;
    setSavingFotosOrto(true);
    try {
      await supabase.storage.from('imagenes').remove([url.split('/').pop()]);
      const nuevoEstadoFotos = { ...fotosOrto };
      delete nuevoEstadoFotos[key];
      setFotosOrto(nuevoEstadoFotos);
      const { data: ex } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patient.id).maybeSingle();
      if (ex) await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', ex.id);
    } catch (error) { alert("Error al eliminar."); }
    setSavingFotosOrto(false);
  };

  const renderSelectOrto = (label, field, options, hasNote = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={ortoForm[field] || ''} onChange={e => handleOrto(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasNote && <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, fontStyle: 'italic', color: '#64748b', fontSize: '12.5px', height: '36px', marginTop: '4px' }} />}
    </div>
  );

  const renderSelectTrata = (label, field, options) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={planTrataForm[field] || ''} onChange={e => handlePlanTrata(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const renderIntraRow = (label, field, opts) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9', gap: '20px', width: '100%' }}>
      <div style={{ width: '180px', minWidth: '180px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', gap: '15px', flexShrink: 0, alignItems: 'center' }}>
        {opts.map(opt => (
          <label key={opt} style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={ortoForm[`${field}_${opt}`] || false} onChange={e => handleOrto(`${field}_${opt}`, e.target.checked)} style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px' }} />
            {opt}
          </label>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: '100px' }}>
        <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, width: '100%', height: '34px', fontSize: '12.5px', padding: '4px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
      <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', gap: '20px', background: '#fff', flexShrink: 0, overflowX: 'auto' }}>
          {ORTO_TABS.map(t => (
            <div key={t.id} onClick={() => setSubTabOrto(t.id)}
              style={{ padding: '18px 4px', cursor: 'pointer', fontSize: '13.5px', fontWeight: subTabOrto === t.id ? '700' : '500', color: subTabOrto === t.id ? '#0087b3' : '#64748b', borderBottom: subTabOrto === t.id ? `2px solid #0087b3` : '2px solid transparent', transition: 'all 0.2s ease', marginBottom: '-1px', whiteSpace: 'nowrap' }}>
              {t.lbl}
            </div>
          ))}
        </div>

        <div style={{ padding: '30px', flex: 1, overflowY: 'auto', background: '#fff' }}>
          
          {subTabOrto === 'examen' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <SectionHeader title="Sección General" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {['Motivo de consulta', 'Historia médica', 'Historia odontológica', 'Historia Familiar'].map(f => (
                  <div key={f} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', alignItems: 'center', gap: '20px' }}>
                    <label style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{f}</label>
                    <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={inputStyleDoc} />
                  </div>
                ))}
              </div>

              <SectionHeader title="Examen Extraoral" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {renderSelectOrto('Cráneo', 'craneo', ['Mesocéfalo', 'Braquicéfalo', 'Dolicéfalo'])}
                {renderSelectOrto('Cara', 'cara', ['Mesofacial', 'Braquifacial', 'Dolicofacial'])}
                {renderSelectOrto('Musculatura', 'musculatura', ['Normal', 'Alterada'])}
                {renderSelectOrto('ATM', 'atm', ['Apertura bucal normal', 'Dolor al despertar', 'Dolor agudo', 'Dolor espontáneo', 'Click articular', 'Crepitación', 'Dolor a la palpación', 'Sensibilidad a la palpación', 'Apertura bucal disminuida'])}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                <button onClick={handleSaveOrto} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 40px', fontWeight: '600', cursor: 'pointer' }}>{savingOrto ? 'Guardando...' : '💾 Guardar Examen Clínico'}</button>
              </div>
            </div>
          )}

          {subTabOrto === 'trabajo' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <SectionHeader title="Radiografías e Interconsultas" />
              <textarea placeholder="Notas de sección..." value={planTrabajoForm.notas_seccion || ''} onChange={e => handlePlanTrabajo('notas_seccion', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                <button onClick={handleSavePlanTrabajo} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 40px', fontWeight: '600', cursor: 'pointer' }}>{savingTrabajo ? 'Guardando...' : 'Guardar Plan de Trabajo'}</button>
              </div>
            </div>
          )}

          {subTabOrto === 'tratamiento' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <SectionHeader title="Detalles del Plan de Tratamiento" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                {renderSelectTrata('Técnica', 'tecnica', ['CCO', 'Roth', 'Estándar', 'Mbt', 'Autoligantes', 'Linguales'])}
                {renderSelectTrata('Brackets', 'brackets', ['Brackets de acero', 'Brackets de porcelana', 'Brackets de porcelana superior y de acero inferiores'])}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                <button onClick={handleSavePlanTrata} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 40px', fontWeight: '600', cursor: 'pointer' }}>{savingTrata ? 'Guardando...' : 'Guardar Plan de Tratamiento'}</button>
              </div>
            </div>
          )}

          {subTabOrto === 'resumen' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <SectionHeader title="Resumen General" />
              <textarea value={resumenForm.diagnostico || ''} onChange={e => handleResumen('diagnostico', e.target.value)} placeholder="Diagnóstico final..." style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
                <button onClick={handleSaveResumen} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 40px', fontWeight: '600', cursor: 'pointer' }}>{savingResumen ? 'Guardando...' : 'Guardar Resumen'}</button>
              </div>
            </div>
          )}

          {subTabOrto === 'fotografias' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                {ORTO_CAJAS.map(item => {
                  const fileData = fotosOrto[item.key];
                  const hasFile = !!fileData;
                  return (
                    <div key={item.key} style={{ background: '#fff', border: `1px solid ${hasFile ? '#0087b3' : '#e2e8f0'}`, borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      {hasFile && <button onClick={() => handleDeleteFotoOrto(item.key, fileData.url)} style={{ position: 'absolute', top: 8, right: 8, background: RJ, color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 11, cursor: 'pointer', zIndex: 10 }}>✕</button>}
                      <div style={{ height: '140px', background: hasFile ? '#000' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {hasFile ? <img src={fileData.url} alt={item.key} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ fontSize: '50px', opacity: 0.3 }}>{item.icon}</div>}
                        {!hasFile && (
                          <label style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s', background: 'rgba(241, 245, 249, 0.9)' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <span style={{ fontSize: '12px', color: '#0087b3', fontWeight: 700 }}>Subir {item.key}</span>
                            <input type="file" accept={item.accept} style={{ display: 'none' }} disabled={savingFotosOrto} onChange={e => handleUploadFotoOrto(e, item.key)} />
                          </label>
                        )}
                      </div>
                      <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: hasFile ? '#f0f9ff' : '#fff' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{item.key}</div>
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
  );
}