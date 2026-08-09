// src/components/vistas/Laboratorio.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Stat from '../ui/Stat';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { BD, P, DN, MU, LT, GL, WA, RJ, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

// Estados de la orden: cada uno conserva su significado semántico (ámbar en
// curso, azul listo, verde entregado) pero sobre los tokens del tema, para que
// el badge siga legible en modo oscuro.
const ESTADO_COLOR = {
  en_proceso: { bg: 'var(--amber-soft)', c: GL },
  listo: { bg: 'var(--accent-soft)', c: P },
  entregado: { bg: 'var(--green-soft)', c: WA },
};

const LABEL_MODAL = { fontSize: 13, fontWeight: 600, color: MU, display: 'block', marginBottom: 6 };
const INPUT_MODAL = {
  width: '100%', padding: '10px 12px', minHeight: 44, borderRadius: 'var(--radius-sm)',
  border: `1px solid ${BD}`, fontSize: 15, boxSizing: 'border-box',
  color: DN, background: LT, outline: 'none',
  transition: 'border-color .15s cubic-bezier(0.25, 0.1, 0.25, 1)',
};

const ORDEN_VACIA = { patient_id: '', type: '', tooth: '', lab: '', cost: '', sent: new Date().toISOString().slice(0, 10), eta: '' };

export default function Laboratorio({ clinicaId }) {
  const [orders, setOrders] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft] = useState(ORDEN_VACIA);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setErrorMsg(null);
      const [{ data: ordenesData, error: errO }, { data: pacientesData, error: errP }] = await Promise.all([
        supabase.from('laboratorio_ordenes').select('*').order('sent', { ascending: false }),
        supabase.from('pacientes').select('id, name'),
      ]);
      if (errO || errP) { setErrorMsg((errO || errP).message); setLoading(false); return; }
      setOrders(ordenesData || []);
      setPacientes(pacientesData || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const handleMarcar = async (id, nuevoStatus) => {
    const { error } = await supabase.from('laboratorio_ordenes').update({ status: nuevoStatus }).eq('id', id);
    if (error) { alert('Error al actualizar: ' + error.message); return; }
    setOrders(prev => prev.map(x => x.id === id ? { ...x, status: nuevoStatus } : x));
  };

  const handleCrearOrden = async () => {
    if (!draft.patient_id) { alert('Selecciona un paciente.'); return; }
    if (!draft.type.trim()) { alert('Ingresa el tipo de trabajo.'); return; }
    if (!draft.lab.trim()) { alert('Ingresa el laboratorio.'); return; }

    setSaving(true);
    const paciente = pacientes.find(p => String(p.id) === String(draft.patient_id));
    const { data, error } = await supabase.from('laboratorio_ordenes').insert([{
      patient_id: draft.patient_id,
      clinica_id: clinicaId,
      patient_name: paciente?.name || '—',
      type: draft.type.trim(),
      tooth: draft.tooth.trim() || '—',
      lab: draft.lab.trim(),
      cost: parseFloat(draft.cost) || 0,
      sent: draft.sent,
      eta: draft.eta || null,
      status: 'en_proceso',
    }]).select();
    setSaving(false);

    if (error) { alert('Error al crear la orden: ' + error.message); return; }
    setOrders(prev => [data[0], ...prev]);
    setShowModal(false);
    setDraft(ORDEN_VACIA);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>Cargando órdenes de laboratorio…</div>;

  if (errorMsg) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 13.5 }}>
        Error al cargar laboratorio: {errorMsg}
        {errorMsg.includes('laboratorio_ordenes') && (
          <div style={{ marginTop: 10, color: MU, fontSize: 13 }}>La tabla "laboratorio_ordenes" todavía no existe en Supabase.</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: DN }}>Órdenes de laboratorio</div>
        <Button onClick={() => { setDraft(ORDEN_VACIA); setShowModal(true); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, padding: '8px 16px', fontSize: 15 }}>
          <Icon name="plus" size={14} /> Nueva orden
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['Total órdenes', orders.length, null, 'document'],
          ['En proceso', orders.filter(o => o.status === 'en_proceso').length, MU, 'activity'],
          ['Listo para retirar', orders.filter(o => o.status === 'listo').length, P, 'clock'],
          ['Entregado', orders.filter(o => o.status === 'entregado').length, WA, 'checkCircle'],
        ].map(([l, v, c, ic]) => (
          <Stat key={l} label={l} value={v} col={c} icon={<Icon name={ic} size={15} />} />
        ))}
      </div>

      {orders.length === 0 ? (
        <div style={{ background: LT, border: `1px dashed ${BD}`, borderRadius: 'var(--radius-md)', padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>
          No hay órdenes de laboratorio registradas. Crea la primera con "+ Nueva orden".
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {orders.map(o => {
            const b = ESTADO_COLOR[o.status] || ESTADO_COLOR.en_proceso;
            return (
              <div key={o.id} style={{ background: GLASS_BG, border: GLASS_BORDER, borderRadius: 'var(--radius-md)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: DN }}>{o.type}</div>
                  <div style={{ fontSize: 12, color: MU }}>Paciente: {o.patient_name} · Pieza: {o.tooth}</div>
                  <div style={{ fontSize: 12, color: MU }}>Lab: {o.lab}</div>
                </div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>Enviado</div><div style={{ fontSize: 13, fontWeight: 600, color: DN, fontVariantNumeric: 'tabular-nums' }}>{o.sent}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>ETA</div><div style={{ fontSize: 13, fontWeight: 600, color: DN, fontVariantNumeric: 'tabular-nums' }}>{o.eta || '—'}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 11, color: 'var(--label-tertiary)' }}>Costo</div><div style={{ fontSize: 13, fontWeight: 600, color: DN, fontVariantNumeric: 'tabular-nums' }}>S/{o.cost}</div></div>
                <Badge bg={b.bg} color={b.c} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 'var(--radius-sm)' }}>{o.status.replace('_', ' ')}</Badge>
                {o.status === 'en_proceso' && (
                  <Button onClick={() => handleMarcar(o.id, 'listo')} style={{ borderRadius: 'var(--radius-sm)', padding: '8px 14px', minHeight: 36, fontSize: 13 }}>Marcar listo</Button>
                )}
                {o.status === 'listo' && (
                  <Button onClick={() => handleMarcar(o.id, 'entregado')} style={{ borderRadius: 'var(--radius-sm)', padding: '8px 14px', minHeight: 36, fontSize: 13 }}>Marcar entregado</Button>
                )}
                <span style={{ fontSize: 13, color: 'var(--label-tertiary)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>ID: {o.id}</span>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal cardStyle={{ padding: 24, width: 400, boxShadow: 'var(--shadow-md)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 18, color: DN, fontSize: 17, fontWeight: 600 }}>Nueva orden de laboratorio</h3>

          <div style={{ marginBottom: 14 }}>
            <label style={LABEL_MODAL}>Paciente</label>
            <select value={draft.patient_id} onChange={e => setDraft({ ...draft, patient_id: e.target.value })}
              style={INPUT_MODAL}>
              <option value="">Selecciona un paciente…</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={LABEL_MODAL}>Tipo de trabajo</label>
              <input value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} placeholder="Ej: Corona CMC"
                style={INPUT_MODAL} />
            </div>
            <div>
              <label style={LABEL_MODAL}>Pieza</label>
              <input value={draft.tooth} onChange={e => setDraft({ ...draft, tooth: e.target.value })} placeholder="Ej: 26"
                style={INPUT_MODAL} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={LABEL_MODAL}>Laboratorio</label>
            <input value={draft.lab} onChange={e => setDraft({ ...draft, lab: e.target.value })} placeholder="Ej: Laboratorio Dental Cruz"
              style={INPUT_MODAL} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div>
              <label style={LABEL_MODAL}>Costo (S/)</label>
              <input type="number" min="0" value={draft.cost} onChange={e => setDraft({ ...draft, cost: e.target.value })}
                style={{ ...INPUT_MODAL, fontVariantNumeric: 'tabular-nums' }} />
            </div>
            <div>
              <label style={LABEL_MODAL}>Enviado</label>
              <input type="date" value={draft.sent} onChange={e => setDraft({ ...draft, sent: e.target.value })}
                style={{ ...INPUT_MODAL, fontVariantNumeric: 'tabular-nums' }} />
            </div>
            <div>
              <label style={LABEL_MODAL}>ETA</label>
              <input type="date" value={draft.eta} onChange={e => setDraft({ ...draft, eta: e.target.value })}
                style={{ ...INPUT_MODAL, fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15 }}>Cancelar</Button>
            <Button onClick={handleCrearOrden} disabled={saving} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15 }}>
              {saving ? 'Creando...' : 'Crear orden'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
