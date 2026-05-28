// src/components/vistas/Expediente.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Historia from './Historia';
import { BD, P, DN, MU, MT, LT } from '../../utils/constants';
import { normalizarTexto, ini } from '../../utils/helpers';

// Iconos SVG Profesionales
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const FolderIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;

// Estilo Glassmorphism Premium
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.75)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: '32px',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)'
};

export default function Expediente({ teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView }) {
  // ─── LÓGICA INTACTA DE PACIENTES ───
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [patSeleccionado, setPatSeleccionado] = useState(null);

  const [form, setForm] = useState({
    id: null, paciente: '', name: '', doc: '', phone: '', fecha: '',
    hora: '', motivo: '', reason: '', treatment: '', birthDate: '', age: '', tag: 'nuevo'
  });

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('pacientes').select('*').order('id', { ascending: false });
      if (data) {
        const unicos = [];
        const yaVistos = new Set();
        data.forEach(p => {
          const norm = normalizarTexto(p.name);
          if (!yaVistos.has(norm)) { yaVistos.add(norm); unicos.push(p); }
        });
        setPatientsList(unicos);
      }
    };
    cargar();
  }, []);

  const calcAge = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date();
    const birthDate = new Date(dateStr);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleDocChange = (valorDoc) => {
    if (!valorDoc || valorDoc.trim() === "") {
      setForm({ id: null, name: '', doc: '', phone: '', reason: '', treatment: '', birthDate: '', age: '', tag: 'nuevo' });
      return;
    }
    const existente = patientsList.find(p => p.doc === valorDoc);
    if (existente) setForm({ ...existente, id: existente.id });
    else setForm({ ...form, id: null, doc: valorDoc, name: '', phone: '', reason: '', treatment: '', birthDate: '', age: '' });
  };

  const handleNombreChange = (val) => {
    const normIngresado = normalizarTexto(val);
    const existente = patientsList.find(p => normalizarTexto(p.name) === normIngresado);
    if (existente) setForm({ ...existente, id: existente.id });
    else setForm(prev => ({ ...prev, id: null, name: val }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return alert("Nombre requerido");
    const nombreLimpio = form.name.trim().replace(/\s+/g, " ");

    const datos = {
      name: nombreLimpio, doc: form.doc, phone: form.phone, reason: form.reason,
      treatment: form.treatment, birthDate: form.birthDate, age: form.age, tag: form.tag || 'nuevo'
    };

    let idDestino = form.id;
    if (!idDestino) {
      const existe = patientsList.find(p => normalizarTexto(p.name) === normalizarTexto(nombreLimpio));
      if (existe) idDestino = existe.id;
    }

    if (idDestino) {
      const { data, error } = await supabase.from('pacientes').update(datos).eq('id', idDestino).select();
      if (error) return alert(error.message);
      setPatientsList(prev => {
        const filtrada = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
        return [data[0], ...filtrada];
      });
      if (patSeleccionado?.id === idDestino) setPatSeleccionado(data[0]);
    } else {
      try {
        const { data: hcData } = await supabase.from('pacientes').select('num_hc').not('num_hc', 'is', null).order('id', { ascending: false }).limit(1);
        let nextHcNumber = 1;
        if (hcData && hcData.length > 0 && hcData[0].num_hc) {
          const match = hcData[0].num_hc.match(/\d+/);
          if (match) nextHcNumber = parseInt(match[0], 10) + 1;
        }
        const nuevoHC = String(nextHcNumber).padStart(4, '0');
        datos.num_hc = nuevoHC;

        const { data, error } = await supabase.from('pacientes').insert([datos]).select();
        if (error) throw error;
        setPatientsList(prev => {
          const filtrada = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
          return [data[0], ...filtrada];
        });
      } catch (err) { return alert("Error al crear paciente: " + err.message); }
    }

    setShowModal(false);
    setForm({ id: null, name: '', doc: '', phone: '', reason: '', treatment: '', birthDate: '', age: '', tag: 'nuevo' });
  };

  const list = patientsList.filter(p => {
    const matchBusqueda = normalizarTexto(p.name).includes(normalizarTexto(q)) || (p.doc && p.doc.includes(q));
    const tagActual = p.tag || 'activo';
    const matchFiltro = filter === 'todos' || tagActual === filter;
    return matchBusqueda && matchFiltro;
  });

  return (
    <div style={{ display: 'flex', height: '100%', gap: '24px', flexWrap: 'wrap' }}>
      
      {/* ─── ISLA IZQUIERDA: BUSCADOR DE PACIENTES (380px) ─── */}
      <div style={{ ...glassStyle, flex: '0 0 380px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: '320px' }}>
        
        {/* Cabecera del buscador */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DN }}>Directorio</h2>
            <button onClick={() => setShowModal(true)} style={{ background: '#0F172A', color: '#fff', border: 'none', width: 36, height: 36, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(15,23,42,0.15)', transition: 'transform 0.2s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
              <PlusIcon />
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}><SearchIcon /></div>
            <input placeholder="Buscar nombre o DNI..." value={q} onChange={e => setQ(e.target.value)} style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '50px', border: '1px solid #E2E8F0', outline: 'none', fontSize: 14, color: DN, boxSizing: 'border-box', background: '#FFFFFF', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }} onFocus={e => { e.target.style.borderColor = P; e.target.style.boxShadow = `0 0 0 3px ${P}22`; }} onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 16, background: '#F1F5F9', padding: '6px', borderRadius: '50px' }}>
            {['todos', 'activo', 'nuevo'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ flex: 1, padding: '8px', borderRadius: '50px', cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'capitalize', border: 'none', background: filter === f ? '#FFFFFF' : 'transparent', color: filter === f ? DN : MU, boxShadow: filter === f ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de pacientes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {list.map(p => {
            const isSelected = patSeleccionado?.id === p.id;
            return (
              <div key={p.id} onClick={() => setPatSeleccionado(p)}
                style={{ padding: '16px', cursor: 'pointer', borderRadius: '20px', marginBottom: '8px', background: isSelected ? '#FFFFFF' : 'transparent', border: `1px solid ${isSelected ? '#E2E8F0' : 'transparent'}`, boxShadow: isSelected ? '0 4px 15px rgba(0,0,0,0.03)' : 'none', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.4)' }}
                onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 46, height: 46, borderRadius: '14px', background: isSelected ? `linear-gradient(135deg, ${P} 0%, #0284c7 100%)` : '#F1F5F9', color: isSelected ? '#fff' : P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0, transition: 'all 0.3s' }}>
                  {ini(p.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: MU, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {p.num_hc && <span style={{ color: P, fontWeight: 700 }}>HC: {p.num_hc}</span>}
                    <span>DNI: {p.doc || '---'}</span>
                  </div>
                </div>
                {p.tag === 'nuevo' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8' }} />}
              </div>
            );
          })}
          {list.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: MU, fontSize: 13 }}>No se encontraron pacientes.</div>}
        </div>
      </div>

      {/* ─── ISLA DERECHA: EXPEDIENTE ACTIVO (Historia.jsx) ─── */}
      <div style={{ flex: '1 1 600px', ...glassStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {patSeleccionado ? (
          // Inyectamos el componente Historia aquí, pasándole los props necesarios
          <Historia 
            patient={patSeleccionado} 
            teeth={teeth} setTeeth={setTeeth} 
            teethEvolucion={teethEvolucion} setTeethEvolucion={setTeethEvolucion} 
            setView={setView} 
          />
        ) : (
          // Empty State Premium
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.3)' }}>
            <FolderIcon />
            <h3 style={{ color: DN, fontSize: 20, fontWeight: 700, margin: '20px 0 8px 0' }}>Expediente Clínico</h3>
            <p style={{ color: MU, fontSize: 14, maxWidth: '300px', textAlign: 'center' }}>Selecciona un paciente del directorio a la izquierda para cargar su historial clínico completo, odontograma y consentimientos.</p>
          </div>
        )}
      </div>

      {/* ─── MODAL NUEVO PACIENTE (Glassmorphism) ─── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', padding: 40, borderRadius: '32px', width: '100%', maxWidth: 550, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.8)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
              <h3 style={{ margin: 0, color: DN, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Registrar Paciente</h3>
              <button onClick={() => setShowModal(false)} style={{ background: '#F1F5F9', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', color: '#64748B', fontWeight: 'bold' }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: MU, marginBottom: 6, display: 'block' }}>DNI / CE</label>
                <input value={form.doc} onChange={e => handleDocChange(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: `2px solid ${P}`, boxSizing: 'border-box', outline: 'none', fontSize: 14, background: '#F8FAFC' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: MU, marginBottom: 6, display: 'block' }}>NOMBRE COMPLETO</label>
                <input list="lista-p" value={form.name} onChange={e => handleNombreChange(e.target.value)} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', outline: 'none', fontSize: 14, background: '#F8FAFC' }} />
                <datalist id="lista-p">{patientsList.map(p => <option key={p.id} value={p.name} />)}</datalist>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: MU, marginBottom: 6, display: 'block' }}>CELULAR / WHATSAPP</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Ej: 990711528" style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', outline: 'none', fontSize: 14, background: '#F8FAFC' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: MU, marginBottom: 6, display: 'block' }}>F. NACIMIENTO</label>
                <input type="date" value={form.birthDate} onChange={e => { const v = e.target.value; const anio = v.split('-')[0]; setForm({ ...form, birthDate: v, age: (anio && anio.length === 4) ? calcAge(v) : form.age }); }} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', background: '#F8FAFC', outline: 'none', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: MU, marginBottom: 6, display: 'block' }}>EDAD</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', background: '#F1F5F9', outline: 'none', fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: MU, marginBottom: 6, display: 'block' }}>TRATAMIENTO</label>
                <input value={form.treatment} onChange={e => setForm({ ...form, treatment: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxSizing: 'border-box', outline: 'none', fontSize: 14, background: '#F8FAFC' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: '#F1F5F9', cursor: 'pointer', fontWeight: 700, color: '#475569', fontSize: 14 }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: '#0F172A', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 15px rgba(15, 23, 42, 0.2)' }}>Guardar Paciente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}