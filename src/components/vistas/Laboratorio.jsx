// src/components/vistas/Laboratorio.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Stat from '../ui/Stat';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { BD, P, DN, MU, MT, RJ, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

const ESTADO_COLOR = {
  en_proceso: { bg: '#fef3c7', c: '#d97706' },
  listo: { bg: MT, c: P },
  entregado: { bg: '#dcfce7', c: '#16a34a' },
};

const ORDEN_VACIA = { patient_id: '', type: '', tooth: '', lab: '', cost: '', sent: new Date().toISOString().slice(0, 10), eta: '' };

export default function Laboratorio() {
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 12 }}>Cargando órdenes de laboratorio…</div>;

  if (errorMsg) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 12 }}>
        Error al cargar laboratorio: {errorMsg}
        {errorMsg.includes('laboratorio_ordenes') && (
          <div style={{ marginTop: 10, color: MU }}>La tabla "laboratorio_ordenes" todavía no existe en Supabase.</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Órdenes de laboratorio</div>
        <Button onClick={() => { setDraft(ORDEN_VACIA); setShowModal(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="plus" size={12} /> Nueva orden
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['Total órdenes', orders.length, null], ['En proceso', orders.filter(o => o.status === 'en_proceso').length, MU], ['Listo para retirar', orders.filter(o => o.status === 'listo').length, P], ['Entregado', orders.filter(o => o.status === 'entregado').length, '#16a34a']].map(([l, v, c]) => (
          <Stat key={l} label={l} value={v} col={c} />
        ))}
      </div>

      {orders.length === 0 ? (
        <div style={{ background: '#fff', border: `1px dashed ${BD}`, borderRadius: 12, padding: 40, textAlign: 'center', color: MU, fontSize: 12 }}>
          No hay órdenes de laboratorio registradas. Crea la primera con "+ Nueva orden".
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {orders.map(o => {
            const b = ESTADO_COLOR[o.status] || ESTADO_COLOR.en_proceso;
            return (
              <div key={o.id} style={{ background: GLASS_BG, border: GLASS_BORDER, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>{o.type}</div>
                  <div style={{ fontSize: 10, color: MU }}>Paciente: {o.patient_name} · Pieza: {o.tooth}</div>
                  <div style={{ fontSize: 10, color: MU }}>Lab: {o.lab}</div>
                </div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>Enviado</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{o.sent}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>ETA</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{o.eta || '—'}</div></div>
                <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>Costo</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>S/{o.cost}</div></div>
                <Badge bg={b.bg} color={b.c} style={{ padding: '4px 12px' }}>{o.status.replace('_', ' ')}</Badge>
                {o.status === 'en_proceso' && (
                  <Button onClick={() => handleMarcar(o.id, 'listo')} style={{ borderRadius: 7, padding: '5px 12px', fontSize: 10 }}>Marcar listo</Button>
                )}
                {o.status === 'listo' && (
                  <Button onClick={() => handleMarcar(o.id, 'entregado')} style={{ borderRadius: 7, padding: '5px 12px', fontSize: 10 }}>Marcar entregado</Button>
                )}
                <span style={{ fontSize: 11, color: P, fontWeight: 600 }}>ID: {o.id}</span>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal cardStyle={{ padding: 24, width: 400, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, color: DN, fontSize: 15 }}>Nueva orden de laboratorio</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Paciente</label>
            <select value={draft.patient_id} onChange={e => setDraft({ ...draft, patient_id: e.target.value })}
              style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box', background: '#fff' }}>
              <option value="">Selecciona un paciente…</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Tipo de trabajo</label>
              <input value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} placeholder="Ej: Corona CMC"
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Pieza</label>
              <input value={draft.tooth} onChange={e => setDraft({ ...draft, tooth: e.target.value })} placeholder="Ej: 26"
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Laboratorio</label>
            <input value={draft.lab} onChange={e => setDraft({ ...draft, lab: e.target.value })} placeholder="Ej: Laboratorio Dental Cruz"
              style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Costo (S/)</label>
              <input type="number" min="0" value={draft.cost} onChange={e => setDraft({ ...draft, cost: e.target.value })}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Enviado</label>
              <input type="date" value={draft.sent} onChange={e => setDraft({ ...draft, sent: e.target.value })}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>ETA</label>
              <input type="date" value={draft.eta} onChange={e => setDraft({ ...draft, eta: e.target.value })}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 10, fontSize: 12 }}>Cancelar</Button>
            <Button onClick={handleCrearOrden} disabled={saving} style={{ flex: 1, padding: 10, fontSize: 12 }}>
              {saving ? 'Creando...' : 'Crear orden'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
