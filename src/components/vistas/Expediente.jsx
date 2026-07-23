// src/components/vistas/Expediente.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS · Expediente · Arquitectura optimizada
// Tokens de diseño alineados con App.jsx · Sub-componentes memo
// Lógica de negocio separada del JSX · Sin glassmorphism (consistente con Taskk layout)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, memo } from 'react';
import { supabase } from '../../supabase';
import Historia from './Historia';
import Modal from '../ui/Modal';
import { BD, P, DN, MU } from '../../utils/constants';
import { normalizarTexto, ini } from '../../utils/helpers';

// ─── DESIGN TOKENS (alineados con App.jsx) ───────────────────────────────────
const C = {
  bg:          '#F4F6F8',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F9FAFB',
  border:      '#E5E7EB',
  borderStrong:'#D1D5DB',
  ink:         '#111827',
  inkMid:      '#4B5563',
  inkMute:     '#9CA3AF',
  brand:       '#4F46E5',
  brandSoft:   '#EEF2FF',
  brandText:   '#4338CA',
  green:       '#10B981',
  greenSoft:   '#D1FAE5',
  blue:        '#3B82F6',
  blueSoft:    '#DBEAFE',
  red:         '#EF4444',
  redSoft:     '#FEE2E2',
  amber:       '#F59E0B',
  amberSoft:   '#FEF3C7',
  r:           '8px',
  rl:          '12px',
  rx:          '16px',
  font:        "'Inter', system-ui, sans-serif",
  shadowSm:    '0 1px 3px rgba(0,0,0,0.06)',
  shadowMd:    '0 4px 12px rgba(0,0,0,0.06)',
};

// ─── ICONOS ───────────────────────────────────────────────────────────────────
const IcSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IcPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IcFolder = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={C.borderStrong} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

// ─── HOOK: LÓGICA DE PACIENTES ────────────────────────────────────────────────
// Toda la lógica de negocio separada del JSX
function usePatientsDirectory() {
  const [patientsList, setPatientsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('pacientes')
        .select('*')
        .order('id', { ascending: false });

      if (data) {
        const unicos = [];
        const yaVistos = new Set();
        data.forEach(p => {
          const norm = normalizarTexto(p.name);
          if (!yaVistos.has(norm)) { yaVistos.add(norm); unicos.push(p); }
        });
        setPatientsList(unicos);
      }
      setLoading(false);
    };
    cargar();
  }, []);

  const upsertPatient = useCallback(async (form) => {
    const nombreLimpio = form.name.trim().replace(/\s+/g, ' ');
    const datos = {
      name: nombreLimpio, doc: form.doc, phone: form.phone,
      reason: form.reason, treatment: form.treatment,
      birthDate: form.birthDate, age: form.age, tag: form.tag || 'nuevo',
    };

    let idDestino = form.id;
    if (!idDestino) {
      const existe = patientsList.find(
        p => normalizarTexto(p.name) === normalizarTexto(nombreLimpio)
      );
      if (existe) idDestino = existe.id;
    }

    if (idDestino) {
      const { data, error } = await supabase
        .from('pacientes').update(datos).eq('id', idDestino).select();
      if (error) throw error;
      setPatientsList(prev => {
        const f = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
        return [data[0], ...f];
      });
      return data[0];
    } else {
      // Generar num_hc autoincremental
      const { data: hcData } = await supabase
        .from('pacientes').select('num_hc').not('num_hc', 'is', null)
        .order('id', { ascending: false }).limit(1);
      let next = 1;
      if (hcData?.[0]?.num_hc) {
        const match = hcData[0].num_hc.match(/\d+/);
        if (match) next = parseInt(match[0], 10) + 1;
      }
      datos.num_hc = String(next).padStart(4, '0');

      const { data, error } = await supabase.from('pacientes').insert([datos]).select();
      if (error) throw error;
      setPatientsList(prev => {
        const f = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
        return [data[0], ...f];
      });
      return data[0];
    }
  }, [patientsList]);

  // NUEVA FUNCIÓN PARA BORRAR:
  const deletePatient = useCallback(async (id) => {
    const { error } = await supabase.from('pacientes').delete().eq('id', id);
    if (error) throw error;
    setPatientsList(prev => prev.filter(p => p.id !== id));
  }, []);

  return { patientsList, loading, upsertPatient, deletePatient };
}

// ─── HOOK: FORMULARIO DE PACIENTE ────────────────────────────────────────────
const FORM_EMPTY = {
  id: null, name: '', doc: '', phone: '',
  reason: '', treatment: '', birthDate: '', age: '', tag: 'nuevo',
};

function usePatientForm(patientsList) {
  const [form, setForm] = useState(FORM_EMPTY);

  const calcAge = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date();
    const birth = new Date(dateStr);
    if (isNaN(birth.getTime())) return '';
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleDocChange = useCallback((valorDoc) => {
    if (!valorDoc?.trim()) { setForm(FORM_EMPTY); return; }
    const existente = patientsList.find(p => p.doc === valorDoc);
    if (existente) setForm({ ...existente, id: existente.id });
    else setForm(f => ({ ...f, id: null, doc: valorDoc, name: '', phone: '' }));
  }, [patientsList]);

  const handleNombreChange = useCallback((val) => {
    const normIngresado = normalizarTexto(val);
    const existente = patientsList.find(p => normalizarTexto(p.name) === normIngresado);
    if (existente) setForm({ ...existente, id: existente.id });
    else setForm(f => ({ ...f, id: null, name: val }));
  }, [patientsList]);

  const handleBirthDate = useCallback((v) => {
    const anio = v.split('-')[0];
    setForm(f => ({ ...f, birthDate: v, age: anio?.length === 4 ? calcAge(v) : f.age }));
  }, []);

  const reset = useCallback(() => setForm(FORM_EMPTY), []);

  return { form, setForm, handleDocChange, handleNombreChange, handleBirthDate, reset };
}

// ─── SUB-COMPONENTE: FILTROS ──────────────────────────────────────────────────
const FilterPills = memo(({ active, onChange }) => (
  <div style={{
    display: 'flex', gap: 4,
    background: C.surfaceAlt, padding: 4,
    borderRadius: C.rl, border: `1px solid ${C.border}`,
  }}>
    {['todos', 'activo', 'nuevo'].map(f => (
      <button
        key={f}
        onClick={() => onChange(f)}
        style={{
          flex: 1, padding: '6px 0',
          borderRadius: C.r, border: 'none',
          background: active === f ? C.surface : 'transparent',
          color: active === f ? C.ink : C.inkMute,
          fontSize: 12, fontWeight: active === f ? 600 : 450,
          cursor: 'pointer', fontFamily: C.font,
          boxShadow: active === f ? C.shadowSm : 'none',
          textTransform: 'capitalize',
          transition: 'all 0.12s',
        }}
      >
        {f}
      </button>
    ))}
  </div>
));

// ─── SUB-COMPONENTE: TARJETA DE PACIENTE ─────────────────────────────────────
const PatientCard = memo(({ patient, isSelected, onClick, onDelete }) => {
  const [hov, setHov] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-pressed={isSelected}
      style={{
        padding: '12px 14px', cursor: 'pointer', borderRadius: C.rl, marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 12, position: 'relative', // position relative es clave
        background: isSelected ? C.brandSoft : hov ? C.surfaceAlt : 'transparent',
        border: `1px solid ${isSelected ? C.brand + '40' : 'transparent'}`,
        transition: 'all 0.12s', outline: 'none',
      }}
    >
      {/* Botón Eliminar (Solo aparece al pasar el mouse por encima) */}
      {hov && !isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if(window.confirm(`¿Seguro que deseas eliminar a ${patient.name}?`)) onDelete(patient.id);
          }}
          title="Eliminar paciente"
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 24, height: 24, borderRadius: '50%', background: C.redSoft, color: C.red,
            border: `1px solid ${C.red}40`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 12, fontWeight: 'bold', zIndex: 10
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.redSoft; e.currentTarget.style.color = C.red; }}
        >✕</button>
      )}

      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: C.r, flexShrink: 0,
        background: isSelected ? C.brand : C.surfaceAlt, color: isSelected ? '#fff' : C.brand,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 14, fontFamily: C.font, transition: 'all 0.15s',
      }}>
        {ini(patient.name)}
      </div>

      {/* Datos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? C.brandText : C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {patient.name}
        </div>
        <div style={{ fontSize: 11, color: C.inkMute, marginTop: 1, display: 'flex', gap: 6 }}>
          {patient.num_hc && <span style={{ color: C.brand, fontWeight: 600 }}>HC: {patient.num_hc}</span>}
          <span>DNI: {patient.doc || '---'}</span>
        </div>
      </div>

      {/* Dot nuevo */}
      {patient.tag === 'nuevo' && !hov && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.blue, flexShrink: 0 }} />
      )}
    </div>
  );
});

// ─── SUB-COMPONENTE: EMPTY STATE ─────────────────────────────────────────────
const EmptyState = memo(() => (
  <div style={{
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 40, gap: 12, textAlign: 'center',
  }}>
    <IcFolder />
    <div style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>
      Expediente Clínico
    </div>
    <div style={{ fontSize: 13, color: C.inkMute, maxWidth: 260, lineHeight: 1.6 }}>
      Selecciona un paciente del directorio para cargar su historial clínico completo.
    </div>
  </div>
));

// ─── SUB-COMPONENTE: INPUT DE FORMULARIO ─────────────────────────────────────
const FormField = memo(({ label, children, span }) => (
  <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
    <label style={{
      fontSize: 11, fontWeight: 600, color: C.inkMute,
      textTransform: 'uppercase', letterSpacing: '0.4px',
      display: 'block', marginBottom: 6, fontFamily: C.font,
    }}>
      {label}
    </label>
    {children}
  </div>
));

const inputStyle = {
  width: '100%', padding: '9px 12px',
  borderRadius: C.r, border: `1px solid ${C.border}`,
  fontSize: 13, fontFamily: C.font, color: C.ink,
  background: C.surface, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.12s',
};

// ─── SUB-COMPONENTE: MODAL NUEVO PACIENTE ────────────────────────────────────
const NewPatientModal = memo(({ onClose, onSave, patientsList }) => {
  const { form, setForm, handleDocChange, handleNombreChange, handleBirthDate } =
    usePatientForm(patientsList);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) { alert('Nombre requerido'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      background="rgba(17,24,39,0.45)"
      overlayStyle={{ padding: 24 }}
      cardStyle={{
        background: C.surface, borderRadius: C.rx,
        width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, fontFamily: C.font }}>
            Registrar paciente
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `1px solid ${C.border}`, background: C.surfaceAlt,
              cursor: 'pointer', color: C.inkMute, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: C.font, outline: 'none',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: 24,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
        }}>
          <FormField label="DNI / CE" span>
            <input
              value={form.doc}
              onChange={e => handleDocChange(e.target.value)}
              style={{ ...inputStyle, borderColor: C.brand }}
              onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brandSoft}`; }}
              onBlur={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = 'none'; }}
            />
          </FormField>

          <FormField label="Nombre completo" span>
            <input
              list="lista-p-modal"
              value={form.name}
              onChange={e => handleNombreChange(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brandSoft}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
            />
            <datalist id="lista-p-modal">
              {patientsList.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </FormField>

          <FormField label="Celular / WhatsApp" span>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Ej: 990711528"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brandSoft}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
            />
          </FormField>

          <FormField label="F. Nacimiento">
            <input
              type="date"
              value={form.birthDate}
              onChange={e => handleBirthDate(e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            />
          </FormField>

          <FormField label="Edad">
            <input
              type="number"
              value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              style={{ ...inputStyle, background: C.surfaceAlt }}
            />
          </FormField>

          <FormField label="Tratamiento" span>
            <input
              value={form.treatment}
              onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brandSoft}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
            />
          </FormField>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '9px', borderRadius: C.r,
              border: `1px solid ${C.border}`, background: C.surface,
              cursor: 'pointer', fontWeight: 600, color: C.inkMid,
              fontSize: 13, fontFamily: C.font,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1, padding: '9px', borderRadius: C.r,
              border: 'none',
              background: saving ? C.inkMute : C.brand,
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 13, fontFamily: C.font,
              boxShadow: C.shadowSm,
            }}
          >
            {saving ? 'Guardando…' : 'Guardar paciente'}
          </button>
        </div>
    </Modal>
  );
});

// ─── COMPONENTE PRINCIPAL: EXPEDIENTE ────────────────────────────────────────
export default function Expediente({ teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [patSeleccionado, setPatSeleccionado] = useState(null);

  const { patientsList, loading, upsertPatient, deletePatient } = usePatientsDirectory();

  const handleDeleteWrapper = async (id) => {
    try {
      await deletePatient(id);
      if (patSeleccionado?.id === id) setPatSeleccionado(null);
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  // Lista filtrada — solo se recalcula cuando cambian q, filter o patientsList
  const filteredList = patientsList.filter(p => {
    const matchSearch =
      normalizarTexto(p.name).includes(normalizarTexto(q)) ||
      (p.doc && p.doc.includes(q));
    const tagActual = p.tag || 'activo';
    const matchFilter = filter === 'todos' || tagActual === filter;
    return matchSearch && matchFilter;
  });

  const handleSave = useCallback(async (form) => {
    const saved = await upsertPatient(form);
    // Si el paciente seleccionado fue editado, actualizarlo
    if (patSeleccionado?.id === saved.id) setPatSeleccionado(saved);
  }, [upsertPatient, patSeleccionado]);

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 100px)',
      gap: 20, minHeight: 0,
    }}>

      {/* ─── PANEL IZQUIERDO: DIRECTORIO ─── */}
      <aside style={{
        width: 300, minWidth: 280,
        display: 'flex', flexDirection: 'column',
        background: C.surface,
        borderRadius: C.rx,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowSm,
        overflow: 'hidden',
        flexShrink: 0,
      }}>

        {/* Header directorio */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: C.ink, fontFamily: C.font,
            }}>
              Directorio
            </span>
            <button
              onClick={() => setShowModal(true)}
              aria-label="Nuevo paciente"
              style={{
                width: 30, height: 30, borderRadius: C.r,
                background: C.brand, color: '#fff',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: C.shadowSm, transition: 'background 0.12s', outline: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.brandText; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.brand; }}
            >
              <IcPlus />
            </button>
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: C.inkMute, display: 'flex', pointerEvents: 'none',
            }}>
              <IcSearch />
            </span>
            <input
              type="search"
              placeholder="Buscar nombre o DNI…"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{
                ...inputStyle, paddingLeft: 32,
                background: C.surfaceAlt,
              }}
              onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.background = C.surface; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.background = C.surfaceAlt; }}
            />
          </div>

          <FilterPills active={filter} onChange={setFilter} />
        </div>

        {/* Lista de pacientes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {loading && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: C.inkMute, fontSize: 13 }}>
              Cargando…
            </div>
          )}

          {!loading && filteredList.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              isSelected={patSeleccionado?.id === p.id}
              onClick={() => setPatSeleccionado(p)}
              onDelete={handleDeleteWrapper}
            />
          ))}

          {!loading && filteredList.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: C.inkMute, fontSize: 13 }}>
              No se encontraron pacientes.
            </div>
          )}
        </div>

        {/* Footer con contador */}
        <div style={{
          padding: '10px 16px',
          borderTop: `1px solid ${C.border}`,
          fontSize: 11, color: C.inkMute, fontFamily: C.font,
        }}>
          {filteredList.length} paciente{filteredList.length !== 1 ? 's' : ''}
        </div>
      </aside>

      {/* ─── PANEL DERECHO: EXPEDIENTE ACTIVO ─── */}
      <main style={{
        flex: 1, minWidth: 0,
        background: C.surface,
        borderRadius: C.rx,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowSm,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {patSeleccionado ? (
          <Historia
            patient={patSeleccionado}
            teeth={teeth}
            setTeeth={setTeeth}
            teethEvolucion={teethEvolucion}
            setTeethEvolucion={setTeethEvolucion}
            setView={setView}
          />
        ) : (
          <EmptyState />
        )}
      </main>

      {/* Modal nuevo paciente */}
      {showModal && (
        <NewPatientModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          patientsList={patientsList}
        />
      )}
    </div>
  );
}