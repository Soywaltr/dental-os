// src/components/vistas/Historia.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

// IMPORTAMOS LOS COMPONENTES QUE SEPARAMOS
import Odontograma from '../odontograma/Odontograma';
import Consentimientos from '../historia/Consentimientos';
import FiliacionTab from '../historia/FiliacionTab';
import OrtodonciaTab from '../historia/OrtodonciaTab';

import { TRATAMIENTOS_CAT, PRECIOS, P, BD, DN, MU, MT, LT, WA, RJ, GL } from '../../utils/constants';
import { ini, sc, getSurfs } from '../../utils/helpers';

export default function Historia({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView }) {
  const [tab, setTab] = useState('filiacion');
  const [patData, setPatData] = useState(patient);
  
  // ESTADOS DEL BUSCADOR DE PACIENTES
  const [searchTerm, setSearchTerm] = useState('');
  const [dbPatients, setDbPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // ESTADOS DE LAS PESTAÑAS INTERNAS
  const [anamnesisData, setAnamnesisData] = useState({});
  const [imagenesList, setImagenesList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showTreatPicker, setShowTreatPicker] = useState(false);
  const [plan, setPlan] = useState([
    { id: 1, name: 'Control ortodoncia', tooth: '14-23', status: 'en_curso', cost: 80, paid: 80, date: '10 Jun 2025', sessions: 1 },
    { id: 2, name: 'Blanqueamiento clínico', tooth: '—', status: 'pendiente', cost: 180, paid: 0, date: '—', sessions: 1 },
    { id: 3, name: 'Radiografía panorámica', tooth: '—', status: 'completado', cost: 45, paid: 45, date: '10 Jun 2025', sessions: 1 },
  ]);

  const TABS = [
    { id: 'filiacion', lbl: 'Filiación' }, { id: 'anamnesis', lbl: 'Anamnesis' }, 
    { id: 'odontograma', lbl: 'Odontograma' }, { id: 'ortodoncia', lbl: 'Ortodoncia' }, 
    { id: 'plan', lbl: 'Plan trat.' }, { id: 'evolucion', lbl: 'Evolución' }, 
    { id: 'recetas', lbl: 'Recetas' }, { id: 'imagenes', lbl: 'Imágenes' }, 
    { id: 'presupuesto', lbl: 'Presupuesto' }, { id: 'consentimientos', lbl: 'Consentimientos' }
  ];

  // CARGAR PACIENTES SI NO HAY UNO SELECCIONADO
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
            if (nombreLimpio && !nombresVistos.has(nombreLimpio)) { 
              nombresVistos.add(nombreLimpio); 
              unicos.push(p); 
            }
          });
          setDbPatients(unicos);
        }
        setLoadingPatients(false);
      };
      fetchPatients();
    }
  }, [patient]);

  useEffect(() => {
    setPatData(patient);
  }, [patient]);

  // CARGAR DATOS DE LA HISTORIA CLÍNICA DESDE SUPABASE
  useEffect(() => {
    const loadCloudData = async () => {
      if (!patient?.id) return;
      setTeeth({}); setTeethEvolucion({});
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
  }, [patient?.id]); 

  // FUNCIÓN MAESTRA DE GUARDADO
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
    setTeeth(cleanInicial); setTeethEvolucion(cleanEvo);
    
    const { error } = await supabase.from('historias').upsert({ 
      patient_id: patient.id, 
      odontograma: cleanInicial, 
      evolucion: cleanEvo, 
      anamnesis: anamnesisData, 
      plan_tratamiento: plan, 
      imagenes: imagenesList 
    }, { onConflict: 'patient_id' });
    
    if (error) alert("Error al guardar: " + error.message);
    else alert("¡Datos guardados con éxito!");
    setSaving(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${patient.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
    if (!uploadError) {
      const { data } = supabase.storage.from('imagenes').getPublicUrl(fileName);
      const nuevaLista = [...imagenesList, { type: 'Radiografía / Foto', date: new Date().toLocaleDateString('es-PE'), url: data.publicUrl }];
      setImagenesList(nuevaLista);
      await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    }
    setSaving(false);
  };

  const handleDeleteImage = async (indexToDelete, imageUrl) => {
    if (!window.confirm("¿Estás seguro de eliminar esta imagen?")) return;
    setSaving(true);
    try {
      await supabase.storage.from('imagenes').remove([imageUrl.split('/').pop()]);
      const nuevaLista = imagenesList.filter((_, i) => i !== indexToDelete);
      setImagenesList(nuevaLista);
      await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    } catch (error) {} setSaving(false);
  };

  // =========================================================================
  // VISTA: BUSCADOR DE PACIENTES (Si no hay paciente seleccionado)
  // =========================================================================
  if (!patient) {
    const filteredPatients = dbPatients.filter(p => {
      const term = searchTerm.toLowerCase();
      return (p.name || '').toLowerCase().includes(term) || (p.doc || '').toLowerCase().includes(term) || (p.phone || '').toLowerCase().includes(term);
    });
    
    return (
      <div style={{ padding: '30px', flex: 1, overflowY: 'auto', background: '#F0F4F4' }}>
        <div style={{ width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 45, height: 45, background: P, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px ${P}33` }}>
                <span style={{ fontSize: 22 }}>🔍</span>
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: DN, margin: 0, letterSpacing: '-0.5px' }}>Buscador de Pacientes</h1>
                <p style={{ fontSize: 13, color: MU, margin: 0 }}>Accede a la historia clínica completa de tus pacientes registrados.</p>
              </div>
            </div>
            <div style={{ position: 'relative', background: '#fff', padding: '8px', borderRadius: 16, border: `1px solid ${BD}`, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
              <input type="text" placeholder="Buscar por Nombre, DNI o Número de Celular..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus style={{ width: '100%', padding: '16px 20px', borderRadius: 12, border: 'none', fontSize: 16, outline: 'none', boxSizing: 'border-box', color: DN, background: 'transparent' }} />
              <div style={{ padding: '0 20px', color: P, fontWeight: 700, fontSize: 13, borderLeft: `1px solid ${BD}` }}>{filteredPatients.length} Registros</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filteredPatients.map(p => (
              <div key={p.id} onClick={() => setView('historia', p)} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 18, padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 15, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = P; e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 20px 25px -5px ${P}15`; }} onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'; }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: P }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 15, background: `linear-gradient(135deg, ${MT} 0%, #fff 100%)`, border: `1.5px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: P, flexShrink: 0 }}>{ini(p.name)}</div>
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: DN, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 6 }}><span style={{ fontSize: 10, background: '#F1F5F9', color: MU, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{p.sexo || 'N/A'}</span><span style={{ fontSize: 10, background: '#F1F5F9', color: MU, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{p.age ? `${p.age} años` : 'Edad N/A'}</span></div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 15, borderTop: `1px solid ${MT}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 9, color: MU, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Documento</span><span style={{ fontSize: 12, color: DN, fontWeight: 600 }}>🆔 {p.doc || '---'}</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 9, color: MU, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>WhatsApp</span><span style={{ fontSize: 12, color: DN, fontWeight: 600 }}>📱 {p.phone || '---'}</span></div>
                </div>
                {p.direccion && <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 9, color: MU, fontWeight: 700, textTransform: 'uppercase' }}>Ubicación</span><span style={{ fontSize: 11, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {p.direccion}</span></div>}
                <div style={{ marginTop: '5px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: P }}>Ver Expediente →</div>
              </div>
            ))}
            {!loadingPatients && filteredPatients.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 20, border: `2px dashed ${BD}` }}>
                <div style={{ fontSize: 50, marginBottom: 20 }}>👤</div>
                <h3 style={{ color: DN, margin: '0 0 10px 0' }}>No encontramos al paciente</h3>
                <p style={{ color: MU, maxWidth: 400, margin: '0 auto' }}>No hay resultados para <b>"{searchTerm}"</b>. Verifica los datos o registra al paciente desde la Agenda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA: HISTORIA CLÍNICA (Cuando SI hay un paciente seleccionado)
  // =========================================================================
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* CABECERA */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BD}`, padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: P, flexShrink: 0 }}>{ini(patData?.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: DN }}>{patData?.name}</div>
          <div style={{ fontSize: 10, color: MU, marginTop: 3 }}>📞 {patData?.phone} · DNI: {patData?.doc} · {patData?.age} años</div>
        </div>
        <button onClick={saveAllToCloud} style={{ background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{saving ? '⏳...' : '💾 Guardar en Nube'}</button>
      </div>

      {/* TABS PRINCIPALES */}
      <div style={{ display: 'flex', gap: 1, padding: '5px 14px', background: LT, borderBottom: `1px solid ${BD}`, flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ padding: '5px 13px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? P : 'transparent', color: tab === t.id ? '#fff' : MU }}>
            {t.lbl}
          </div>
        ))}
      </div>

      {/* CONTENIDO DE LAS TABS */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        
        {/* COMPONENTES SEPARADOS */}
        {tab === 'filiacion' && <FiliacionTab patient={patData} onUpdate={setPatData} />}
        {tab === 'odontograma' && <Odontograma patient={patData} teeth={teeth} setTeeth={setTeeth} teethEvolucion={teethEvolucion} setTeethEvolucion={setTeethEvolucion} />}
        {tab === 'ortodoncia' && <OrtodonciaTab patient={patData} />}
        
        {/* COMPONENTES INTEGRADOS */}
        {tab === 'anamnesis' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%' }}>
              {[{ title: 'Motivo de consulta', fields: ['Motivo principal', 'Tiempo con el síntoma', 'Intensidad del dolor (1-10)'] }, { title: 'Antecedentes médicos', fields: ['Enfermedades sistémicas', 'Medicamentos actuales', 'Alergias (medicamentos/materiales)'] }].map((sec, si) => (
                <div key={si} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 15 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 11 }}>{sec.title}</div>
                  {sec.fields.map((f, fi) => (
                    <div key={fi} style={{ marginBottom: 9 }}><label style={{ fontSize: 10, color: MU, fontWeight: 600 }}>{f}</label><input style={{ width: '100%', border: 'none', borderBottom: `1px solid ${BD}`, padding: '3px 0', fontSize: 12, outline: 'none' }} value={anamnesisData[f] || ''} onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })} /></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'plan' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Plan de tratamiento — {patData?.name}</div>
              <button onClick={() => setShowTreatPicker(!showTreatPicker)} style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Agregar</button>
            </div>
            {showTreatPicker && (
              <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                  {TRATAMIENTOS_CAT.map(cat => (
                    <div key={cat.cat}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: P }}>{cat.cat}</div>
                      {cat.items.map(item => (
                        <div key={item} onClick={() => { setPlan(p => [...p, { id: Date.now(), name: item, tooth: '—', status: 'pendiente', cost: PRECIOS[item] || 0, paid: 0 }]); setShowTreatPicker(false); }} style={{ fontSize: 11, color: DN, cursor: 'pointer' }}>{item}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {['pendiente', 'en_curso', 'completado'].map(st => {
              const items = plan.filter(i => i.status === st);
              return (
                <div key={st} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: sc(st).c, textTransform: 'uppercase' }}>{st.replace('_', ' ')} ({items.length})</div>
                  {items.map(item => (
                    <div key={item.id} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: '10px 14px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div></div>
                      <button onClick={() => setPlan(p => p.filter(i => i.id !== item.id))} style={{ background: '#fef2f2', color: RJ, border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'imagenes' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Imágenes y Radiografías</div>
              <label style={{ background: P, color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Subir imagen<input type="file" hidden accept="image/*" onChange={handleImageUpload} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {imagenesList.map((img, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                  <button onClick={() => handleDeleteImage(i, img.url)} style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer' }}>✕</button>
                  <img src={img.url} alt="Radiografía" style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'presupuesto' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', borderRadius: 12 }}>
              <thead><tr style={{ borderBottom: `1px solid ${BD}` }}><th style={{ padding: 12 }}>Tratamiento</th><th style={{ padding: 12 }}>Costo</th></tr></thead>
              <tbody>
                {plan.map(item => (<tr key={item.id} style={{ borderBottom: `1px solid ${BD}` }}><td style={{ padding: 12 }}>{item.name}</td><td style={{ padding: 12 }}>S/{item.cost}</td></tr>))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'evolucion' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Notas de evolución</div>
              <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva nota</button>
            </div>
            {[{ date: '10 Jun 2025', dr: 'Dra. Sol Vargas', txt: 'Control de ortodoncia. Arco superior ajustado.' }].map((n, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 15, marginBottom: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: P }}>{n.date}</span>
                    <span style={{ fontSize: 10, color: MU }}>{n.dr}</span>
                  </div>
                  <div style={{ fontSize: 12, color: DN, lineHeight: 1.7 }}>{n.txt}</div>
                </div>
            ))}
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: DN, marginBottom: 8 }}>Nueva nota clínica</div>
              <textarea placeholder="Descripción..." style={{ width: '100%', minHeight: 80, padding: 9, border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, resize: 'vertical', outline: 'none' }} />
              <button style={{ marginTop: 8, background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar</button>
            </div>
          </div>
        )}

        {tab === 'recetas' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Recetas médicas</div>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 20, maxWidth: 500 }}>
              <div style={{ textAlign: 'center', borderBottom: `1px solid ${BD}`, paddingBottom: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: MU }}>Cirujano Dentista · COP 12345</div>
              </div>
              <textarea placeholder="Rp." style={{ width: '100%', minHeight: 100, padding: 6, border: `1px solid ${BD}`, borderRadius: 6, fontSize: 11, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ flex: 1, background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🖨 Imprimir</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'consentimientos' && <Consentimientos patient={patData} />}
      </div>
    </div>
  );
}