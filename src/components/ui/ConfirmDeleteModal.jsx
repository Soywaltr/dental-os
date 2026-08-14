// src/components/ui/ConfirmDeleteModal.jsx
// Confirmación de dos pasos para un borrado irreversible (estilo GitHub):
// el botón de eliminar sólo se habilita cuando el texto escrito coincide
// exactamente con `nombreConfirmacion`. Se usa para borrar la ficha
// completa de un paciente -- Agenda.jsx (modal de cita) y Expediente.jsx
// (paciente ya archivado).
import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { BD, DN, MU, RJ } from '../../utils/constants';

export default function ConfirmDeleteModal({ titulo, mensaje, nombreConfirmacion, onConfirm, onClose, confirmando }) {
  const [texto, setTexto] = useState('');
  const habilitado = texto.trim() === nombreConfirmacion.trim();

  return (
    <Modal cardStyle={{ padding: 24, width: 420, boxSizing: 'border-box' }} zIndex={1200}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', color: RJ, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="warning" size={18} />
        </div>
        <h3 style={{ margin: 0, color: DN, fontSize: 16, fontWeight: 600 }}>{titulo}</h3>
      </div>

      <p style={{ margin: '0 0 14px', color: MU, fontSize: 13.5, lineHeight: 1.5 }}>{mensaje}</p>

      <label style={{ display: 'block', margin: '0 0 6px', color: DN, fontSize: 13, fontWeight: 600 }}>
        Para confirmar, escribe <span style={{ color: RJ }}>{nombreConfirmacion}</span>:
      </label>
      <input
        value={texto} onChange={e => setTexto(e.target.value)} autoFocus
        onKeyDown={e => { if (e.key === 'Enter' && habilitado && !confirmando) onConfirm(); }}
        style={{ width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: '10px', border: `1px solid ${BD}`, fontSize: 14, color: DN, outline: 'none', boxSizing: 'border-box', marginBottom: 18 }}
      />

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" onClick={onClose} disabled={confirmando} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 14 }}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={!habilitado || confirmando}
          style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 14, opacity: habilitado ? 1 : .5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Icon name="trash" size={14} /> {confirmando ? 'Eliminando...' : 'Eliminar definitivamente'}
        </Button>
      </div>
    </Modal>
  );
}
