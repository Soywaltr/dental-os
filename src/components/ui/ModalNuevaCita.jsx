// src/components/ui/ModalNuevaCita.jsx
import React, { useState } from 'react';

export default function ModalNuevaCita({ onClose, onSave, listaPacientes, modo = 'cita' }) {
  const [form, setForm] = useState({
    doc: '',
    paciente: '',
    celular: '',
    fecha: '',
    hora: '',
    motivo: ''
  });

  const normalizar = (t) => t ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

  const handleDocChange = (val) => {
    if (!val || val.trim() === "") {
      setForm({ ...form, doc: '', paciente: '', celular: '' });
      return;
    }
    const existente = listaPacientes.find(p => p.doc === val);
    if (existente) {
      setForm({ ...form, doc: val, paciente: existente.name, celular: existente.phone || '' });
    } else {
      setForm({ ...form, doc: val, paciente: '', celular: '' });
    }
  };

  const handleNombreChange = (val) => {
    const normIngresado = normalizar(val);
    const existente = listaPacientes.find(p => normalizar(p.name) === normIngresado);
    if (existente) {
      setForm({ ...form, paciente: existente.name, doc: existente.doc || '', celular: existente.phone || '' });
    } else {
      setForm({ ...form, paciente: val });
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (modo === 'cita') {
      if (!form.paciente || !form.fecha || !form.hora) {
        alert("Por favor completa al menos el Nombre, la Fecha y la Hora de la cita.");
        return;
      }
    } else {
      if (!form.paciente || !form.doc) {
        alert("Por favor completa al menos el Nombre y el DNI del paciente.");
        return;
      }
    }
    onSave(form);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 25, borderRadius: 16, width: 420, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#0D5C6B', marginBottom: 20 }}>
          {modo === 'cita' ? 'Agendar Nueva Cita' : 'Registrar Nuevo Paciente'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#0D5C6B' }}>DNI / CE (Para buscar o crear paciente)</label>
            <input
              value={form.doc}
              onChange={e => handleDocChange(e.target.value)}
              placeholder="Ej: 72345678"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '2px solid #0D5C6B', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Paciente (Nombre Completo)</label>
            <input
              list="lista-pacientes-modal"
              value={form.paciente}
              onChange={e => handleNombreChange(e.target.value)}
              placeholder="Escribe o selecciona un paciente..."
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
            />
            <datalist id="lista-pacientes-modal">
              {listaPacientes.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Celular / WhatsApp</label>
            <input
              value={form.celular}
              onChange={e => setForm({ ...form, celular: e.target.value })}
              placeholder="Ej: 990711528"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
            />
          </div>

          {modo === 'cita' && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm({ ...form, fecha: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none', background: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Hora</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={e => setForm({ ...form, hora: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none', background: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Motivo de consulta</label>
                <input
                  value={form.motivo}
                  onChange={e => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ej: Evaluación inicial"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, border: 'none', background: '#f1f5f9', borderRadius: 8, cursor: 'pointer', fontWeight: 700, color: '#64748b' }}>Cancelar</button>
          <button onClick={onSubmit} style={{ flex: 1, padding: 12, background: '#0D5C6B', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            {modo === 'cita' ? 'Crear Cita' : 'Guardar Paciente'}
          </button>
        </div>
      </div>
    </div>
  );
}