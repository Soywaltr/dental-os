// src/components/vistas/Pacientes.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { BD, P, DN, MU, MT, GL, LT } from '../../utils/constants';
import { normalizarTexto, ini } from '../../utils/helpers';

export default function Pacientes({ setView, setSelPat }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [patientsList, setPatientsList] = useState([]);

  const [form, setForm] = useState({
    id: null,
    paciente: '',
    name: '',
    doc: '',
    phone: '',
    fecha: '',
    hora: '',
    motivo: '',
    reason: '',
    treatment: '',
    birthDate: '',
    age: '',
    tag: 'nuevo'
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
      setForm({
        id: null, name: '', doc: '', phone: '', reason: '', treatment: '', birthDate: '', age: '', tag: 'nuevo'
      });
      return;
    }
    const existente = patientsList.find(p => p.doc === valorDoc);
    if (existente) {
      setForm({ ...existente, id: existente.id });
    } else {
      setForm({ ...form, id: null, doc: valorDoc, name: '', phone: '', reason: '', treatment: '', birthDate: '', age: '' });
    }
  };

  const handleNombreChange = (val) => {
    const normIngresado = normalizarTexto(val);
    const existente = patientsList.find(p => normalizarTexto(p.name) === normIngresado);
    if (existente) {
      setForm({ ...existente, id: existente.id });
    } else {
      setForm(prev => ({ ...prev, id: null, name: val }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return alert("Nombre requerido");
    const nombreLimpio = form.name.trim().replace(/\s+/g, " ");

    const datos = {
      name: nombreLimpio,
      doc: form.doc,
      phone: form.phone,
      reason: form.reason,
      treatment: form.treatment,
      birthDate: form.birthDate,
      age: form.age,
      tag: form.tag || 'nuevo'
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
    } else {
      try {
        const { data: hcData, error: hcError } = await supabase
          .from('pacientes')
          .select('num_hc')
          .not('num_hc', 'is', null)
          .order('id', { ascending: false })
          .limit(1);

        let nextHcNumber = 1;
        if (hcData && hcData.length > 0 && hcData[0].num_hc) {
          const match = hcData[0].num_hc.match(/\d+/);
          if (match) nextHcNumber = parseInt(match[0], 10) + 1;
        }

        const nuevoHC = String(nextHcNumber).padStart(4, '0');
        datos.num_hc = nuevoHC;

        const { data, error } = await supabase.from('pacientes').insert([datos]).select();
        if (error) throw error;

        alert(`✅ Paciente creado con éxito. Se le asignó la HC: ${nuevoHC}`);
        setPatientsList(prev => {
          const filtrada = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
          return [data[0], ...filtrada];
        });
      } catch (err) {
        return alert("Error al crear paciente: " + err.message);
      }
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
    <div style={{ padding: '24px 30px', flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input
          placeholder="🔍 Buscar nombre, DNI o tratamiento..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${BD}`, outline: 'none', fontSize: 13, color: DN }}
        />

        <div style={{ display: 'flex', gap: 6 }}>
          {['todos', 'activo', 'nuevo'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                border: `1px solid ${filter === f ? P : BD}`, background: filter === f ? P : '#fff', color: filter === f ? '#fff' : MU
              }}>
              {f}
            </button>
          ))}
        </div>

        <button onClick={() => setShowModal(true)} style={{ background: P, color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
          + Nuevo paciente
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {list.map(p => (
          <div key={p.id} onClick={() => { setSelPat(p); setView('historia'); }}
            style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 16, padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: P, fontSize: 16, flexShrink: 0 }}>
                {ini(p.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: DN }}>{p.name}</div>
                <div style={{ fontSize: 11, color: MU, marginTop: 3 }}>
                  {p.num_hc ? <span style={{ color: P, fontWeight: 800 }}>HC: {p.num_hc} · </span> : ''}
                  DNI: {p.doc || '---'} · {p.age ? `${p.age} años` : '-- años'}
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: (p.tag || 'activo') === 'nuevo' ? MT : '#f1f5f9', color: (p.tag || 'activo') === 'nuevo' ? P : '#64748b' }}>
                {p.tag || 'activo'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Tratamiento</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>{p.treatment || 'Sin especificar'}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Próx. cita</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>
                  {p.fecha ? `${p.fecha} ${p.hora_cita || ''}` : '---'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Sangre</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>{p.blood || 'O+'}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Alergias</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>{p.allergies || 'Ninguna'}</div>
              </div>
            </div>

            {(p.balance > 0) && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', color: '#d97706', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠ Saldo pendiente: S/{p.balance}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: '90%', maxWidth: 500 }}>
            <h3 style={{ marginTop: 0, color: '#0D5C6B', marginBottom: 20 }}>Registrar/Actualizar Paciente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#0D5C6B' }}>DNI / CE</label>
                <input value={form.doc} onChange={e => handleDocChange(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '2px solid #0D5C6B', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>NOMBRE COMPLETO</label>
                <input list="lista-p" value={form.name} onChange={e => handleNombreChange(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none' }} />
                <datalist id="lista-p">{patientsList.map(p => <option key={p.id} value={p.name} />)}</datalist>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CELULAR / WHATSAPP</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ej: 990711528"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>FECHA DE NACIMIENTO</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={e => {
                    const fechaValue = e.target.value;
                    const anio = fechaValue.split('-')[0];
                    if (anio && anio.length === 4) {
                      const edad = calcAge(fechaValue);
                      setForm({ ...form, birthDate: fechaValue, age: edad });
                    } else {
                      setForm({ ...form, birthDate: fechaValue });
                    }
                  }}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>EDAD</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#f8fafc', outline: 'none' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TRATAMIENTO</label>
                <input value={form.treatment} onChange={e => setForm({ ...form, treatment: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700, color: '#64748b' }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#0D5C6B', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}