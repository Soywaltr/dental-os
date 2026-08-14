// src/components/ui/ModalNuevaCita.jsx
// Este archivo era uno de los pocos que no había pasado por los tokens: tenía
// el teal #0D5C6B de la etapa anterior escrito a mano en el título, la etiqueta
// del DNI, el borde de 2px de ese campo y el fondo del botón (que además pisaba
// la variante `primary` de Button, así que ese botón ignoraba el acento de la
// clínica). Ahora todo sale del tema y los estados los da .field/.btn de ui.css.
//
// `inicial` permite abrirlo con fecha y hora ya puestas: la Agenda lo usa cuando
// se toca un hueco libre de la grilla, para no obligar a reescribir el día y la
// hora que se estaban mirando.
import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { findPatientByDoc, findPatientByName } from '../../utils/helpers';
import { BD, DN, MU, LT, FUENTE_CAPTACION_GRUPOS } from '../../utils/constants';
import { notify } from '../../utils/toast';

const LABEL = {
  fontSize: 11.5, fontWeight: 600, color: MU,
  textTransform: 'uppercase', letterSpacing: '0.4px',
};

const CAMPO = {
  width: '100%', padding: '11px 12px', minHeight: 44,
  borderRadius: '10px', border: `1px solid ${BD}`,
  boxSizing: 'border-box', marginTop: 6, outline: 'none',
  fontSize: 15, color: DN, background: LT, fontFamily: 'inherit',
};

export default function ModalNuevaCita({ onClose, onSave, listaPacientes, modo = 'cita', inicial }) {
  const [form, setForm] = useState({
    doc: '',
    paciente: '',
    celular: '',
    fecha: inicial?.fecha || '',
    hora: inicial?.hora || '',
    motivo: '',
    fuenteCaptacion: '',
  });

  const handleDocChange = (val) => {
    if (!val || val.trim() === "") {
      setForm({ ...form, doc: '', paciente: '', celular: '' });
      return;
    }
    const existente = findPatientByDoc(listaPacientes, val);
    if (existente) {
      setForm({ ...form, doc: val, paciente: existente.name, celular: existente.phone || '' });
    } else {
      setForm({ ...form, doc: val, paciente: '', celular: '' });
    }
  };

  const handleNombreChange = (val) => {
    const existente = findPatientByName(listaPacientes, val);
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
        notify("Por favor completa al menos el Nombre, la Fecha y la Hora de la cita.");
        return;
      }
    } else {
      if (!form.paciente || !form.doc) {
        notify("Por favor completa al menos el Nombre y el DNI del paciente.");
        return;
      }
    }
    onSave(form);
  };

  return (
    <Modal cardStyle={{ padding: 24, width: 440 }}>
      <h3 style={{ marginTop: 0, color: DN, marginBottom: 20, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
        {modo === 'cita' ? 'Agendar nueva cita' : 'Registrar nuevo paciente'}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={LABEL}>DNI / CE</label>
          <input
            className="field"
            value={form.doc}
            onChange={e => handleDocChange(e.target.value)}
            placeholder="Ej: 72345678"
            style={{ ...CAMPO, fontVariantNumeric: 'tabular-nums' }}
          />
          <div style={{ fontSize: 11.5, color: MU, marginTop: 5 }}>
            Si el paciente ya existe, se completan sus datos solos.
          </div>
        </div>

        <div>
          <label style={LABEL}>Paciente</label>
          <input
            className="field"
            list="lista-pacientes-modal"
            value={form.paciente}
            onChange={e => handleNombreChange(e.target.value)}
            placeholder="Escribe o selecciona un paciente…"
            style={CAMPO}
          />
          <datalist id="lista-pacientes-modal">
            {listaPacientes.map(p => <option key={p.id} value={p.name} />)}
          </datalist>
        </div>

        <div>
          <label style={LABEL}>Celular / WhatsApp</label>
          <input
            className="field"
            value={form.celular}
            onChange={e => setForm({ ...form, celular: e.target.value })}
            placeholder="Ej: 990711528"
            style={{ ...CAMPO, fontVariantNumeric: 'tabular-nums' }}
          />
        </div>

        <div>
          <label style={LABEL}>Fuente de captación</label>
          <select
            className="field"
            value={form.fuenteCaptacion}
            onChange={e => setForm({ ...form, fuenteCaptacion: e.target.value })}
            style={CAMPO}
          >
            <option value="">Seleccionar</option>
            {FUENTE_CAPTACION_GRUPOS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map(v => <option key={v} value={v}>{v}</option>)}
              </optgroup>
            ))}
          </select>
          <div style={{ fontSize: 11.5, color: MU, marginTop: 5 }}>
            Sólo se guarda si el paciente es nuevo, o si lo cambias a mano para uno ya existente.
          </div>
        </div>

        {modo === 'cita' && (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Fecha</label>
                <input
                  className="field"
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                  style={{ ...CAMPO, fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={LABEL}>Hora</label>
                <input
                  className="field"
                  type="time"
                  value={form.hora}
                  onChange={e => setForm({ ...form, hora: e.target.value })}
                  style={{ ...CAMPO, fontVariantNumeric: 'tabular-nums' }}
                />
              </div>
            </div>

            <div>
              <label style={LABEL}>Motivo de consulta</label>
              <input
                className="field"
                value={form.motivo}
                onChange={e => setForm({ ...form, motivo: e.target.value })}
                placeholder="Ej: Evaluación inicial"
                style={CAMPO}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <Button variant="secondary" onClick={onClose} style={{ flex: 1, minHeight: 44, fontSize: 15 }}>Cancelar</Button>
        {/* Sin `background` propio: así respeta la variante primary y, con ella,
            el acento de cada clínica. */}
        <Button onClick={onSubmit} style={{ flex: 1, minHeight: 44, fontSize: 15 }}>
          {modo === 'cita' ? 'Crear cita' : 'Guardar paciente'}
        </Button>
      </div>
    </Modal>
  );
}
