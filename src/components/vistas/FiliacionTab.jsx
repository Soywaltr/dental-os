// src/components/historia/FiliacionTab.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { TODAS_NACIONES, labelStyleDoc, inputStyleDoc } from '../../utils/constants';

export default function FiliacionTab({ patient, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) setEditForm(patient);
  }, [patient]);

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('pacientes').update({
      name: editForm.name, doc: editForm.doc, tipo_doc: editForm.tipo_doc, phone: editForm.phone, cod_pais: editForm.cod_pais, email: editForm.email,
      direccion: editForm.direccion, sexo: editForm.sexo, birthDate: editForm.birthDate, age: editForm.age, blood: editForm.blood, allergies: editForm.allergies,
      num_hc: editForm.num_hc, pais_nacimiento: editForm.pais_nacimiento, ocupacion: editForm.ocupacion, fuente_captacion: editForm.fuente_captacion,
      linea_negocio: editForm.linea_negocio, apoderado: editForm.apoderado, apoderado_dni: editForm.apoderado_dni, parentesco: editForm.parentesco
    }).eq('id', patient.id).select();
    
    if (error) alert("Error al guardar en Supabase: " + error.message);
    else if (data && data.length > 0) { 
      onUpdate(data[0]); 
      setIsEditing(false); 
      alert("✅ Datos de filiación guardados correctamente."); 
    }
    setSaving(false);
  };

  const handleCancel = () => { 
    setEditForm(patient); 
    setIsEditing(false); 
  };

  return (
    <div style={{ padding: '30px', overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '35px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 600 }}>Datos Personales</h2>
          <div>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                ✏️ Editar Campos
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleCancel} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                <button onClick={handleSave} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>{saving ? 'Guardando...' : '💾 Guardar Cambios'}</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div><label style={labelStyleDoc}>Nombres y Apellidos</label><input disabled={!isEditing} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div>
          <div><label style={labelStyleDoc}>N° HC</label><input readOnly disabled value={editForm.num_hc || ''} placeholder="Autogenerado" style={{ ...inputStyleDoc, background: '#f1f5f9', borderColor: 'transparent', cursor: 'not-allowed', fontWeight: 'bold', color: '#64748b' }} /></div>
          <div><label style={labelStyleDoc}>Sexo</label><select disabled={!isEditing} value={editForm.sexo || ''} onChange={e => setEditForm({ ...editForm, sexo: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Mujer">Mujer</option><option value="Hombre">Hombre</option></select></div>
          <div><label style={labelStyleDoc}>Documento</label><div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: '8px' }}><select disabled={!isEditing} value={editForm.tipo_doc || ''} onChange={e => setEditForm({ ...editForm, tipo_doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }}><option value="DNI">DNI</option><option value="CE">C.E.</option><option value="Pasaporte">Pasap.</option><option value="RUC">RUC</option></select><input disabled={!isEditing} value={editForm.doc || ''} onChange={e => setEditForm({ ...editForm, doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div></div>
          <div><label style={labelStyleDoc}>Teléfono</label><div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '8px' }}><select disabled={!isEditing} value={editForm.cod_pais || '+51'} onChange={e => setEditForm({ ...editForm, cod_pais: e.target.value })} style={{ ...inputStyleDoc, padding: '10px 6px', background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }}>{TODAS_NACIONES.map(n => <option key={n.n} value={n.c}>{n.b} {n.c}</option>)}</select><input disabled={!isEditing} value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div></div>
          <div><label style={labelStyleDoc}>Email</label><input disabled={!isEditing} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div>
          <div><label style={labelStyleDoc}>F. nacimiento y Edad</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '8px' }}><input disabled={!isEditing} type="date" value={editForm.birthDate || ''} onChange={e => { const bDay = e.target.value; let calculatedAge = editForm.age; if (bDay) { const today = new Date(); const birth = new Date(bDay); calculatedAge = today.getFullYear() - birth.getFullYear(); } setEditForm({ ...editForm, birthDate: bDay, age: calculatedAge }); }} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /><input value={editForm.age || ''} readOnly placeholder="Edad" style={{ ...inputStyleDoc, background: '#f1f5f9', textAlign: 'center', borderColor: 'transparent' }} /></div></div>
          <div><label style={labelStyleDoc}>País de nacimiento</label><select disabled={!isEditing} value={editForm.pais_nacimiento || ''} onChange={e => setEditForm({ ...editForm, pais_nacimiento: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option>{TODAS_NACIONES.map(n => <option key={n.n} value={n.n}>{n.b} {n.n}</option>)}</select></div>
          <div><label style={labelStyleDoc}>Ocupación</label><input disabled={!isEditing} value={editForm.ocupacion || ''} onChange={e => setEditForm({ ...editForm, ocupacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div>
          <div style={{ gridColumn: 'span 2' }}><label style={labelStyleDoc}>Dirección</label><input disabled={!isEditing} value={editForm.direccion || ''} onChange={e => setEditForm({ ...editForm, direccion: e.target.value })} placeholder="+ Agregar" style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div>
          <div><label style={labelStyleDoc}>Grupo Sanguíneo</label><input disabled={!isEditing} value={editForm.blood || ''} onChange={e => setEditForm({ ...editForm, blood: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div>
          <div><label style={labelStyleDoc}>Fuente captación</label><select disabled={!isEditing} value={editForm.fuente_captacion || ''} onChange={e => setEditForm({ ...editForm, fuente_captacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Facebook">Facebook</option><option value="Instagram">Instagram</option><option value="Tiktok">Tiktok</option><option value="Google">Google</option><option value="Referido por paciente">Referido por paciente</option><option value="Referido por doctor">Referido por doctor</option><option value="Amigos y familiares">Amigos y familiares</option><option value="Fachada">Fachada</option></select></div>
          <div><label style={labelStyleDoc}>Línea de negocio</label><select disabled={!isEditing} value={editForm.linea_negocio || ''} onChange={e => setEditForm({ ...editForm, linea_negocio: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Ortodoncia">Ortodoncia</option><option value="Rehabilitación">Rehabilitación</option><option value="Estética">Estética</option><option value="Endodoncia">Endodoncia</option><option value="Tratamiento integral">Tratamiento integral</option><option value="Odontopediatría">Odontopediatría</option></select></div>
          <div><label style={labelStyleDoc}>Alergias</label><input disabled={!isEditing} value={editForm.allergies || ''} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })} style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f8fafc', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} /></div>
        </div>

        {editForm.age < 18 && (
          <div style={{ marginTop: '45px' }}>
            <h3 style={{ color: '#0087b3', fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              Familiar / Apoderado <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 4 }}>Requerido</span>
            </h3>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#0087b3', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 20px' }}><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Nombre</div><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>N° doc</div><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Parentesco</div></div>
              <div style={{ background: '#f8fafc', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', padding: '20px' }}>
                <input disabled={!isEditing} value={editForm.apoderado || ''} onChange={e => setEditForm({ ...editForm, apoderado: e.target.value })} placeholder="Nombre completo" style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f1f5f9', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} />
                <input disabled={!isEditing} value={editForm.apoderado_dni || ''} onChange={e => setEditForm({ ...editForm, apoderado_dni: e.target.value })} placeholder="DNI/CE" style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f1f5f9', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} />
                <input disabled={!isEditing} value={editForm.parentesco || ''} onChange={e => setEditForm({ ...editForm, parentesco: e.target.value })} placeholder="Ej: Madre, Padre" style={{ ...inputStyleDoc, background: isEditing ? '#fff' : '#f1f5f9', borderColor: isEditing ? '#cbd5e1' : 'transparent' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}