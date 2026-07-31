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
import { BD, P, DN, MU, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import { normalizarTexto, ini, findPatientByDoc, findPatientByName, estadoPaciente } from '../../utils/helpers';
import useResponsive from '../../utils/useResponsive';

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
  brand:       '#404040',
  brandSoft:   '#f1f1f0',
  brandText:   '#262626',
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
const IcUpload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IcDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IcTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

// ─── IMPORTAR / EXPORTAR CSV ──────────────────────────────────────────────────
// Mismas columnas para exportar e importar: lo que se descarga sirve de
// plantilla para volver a subirlo. Solo name/doc son obligatorios al importar.
const COLUMNAS_PACIENTE = [
  { key: 'name', label: 'Nombre' },
  { key: 'doc', label: 'DNI' },
  { key: 'tipo_doc', label: 'Tipo Doc' },
  { key: 'phone', label: 'Celular' },
  { key: 'email', label: 'Email' },
  { key: 'birthDate', label: 'Fecha Nacimiento' },
  { key: 'age', label: 'Edad' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'direccion', label: 'Direccion' },
  { key: 'treatment', label: 'Tratamiento' },
  { key: 'reason', label: 'Motivo' },
  { key: 'allergies', label: 'Alergias' },
  { key: 'blood', label: 'Grupo Sanguineo' },
];

function filasACSV(filas) {
  return filas.map(fila => fila.map(val => {
    const s = String(val ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\r\n');
}

// Parser CSV mínimo (soporta campos entre comillas con comas/saltos de línea
// adentro) -- no hace falta una librería para esto.
function parseCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let dentroComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; } else dentroComillas = false;
      } else campo += c;
    } else if (c === '"') dentroComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); campo = '';
      if (!(fila.length === 1 && fila[0] === '')) filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila); }
  return filas;
}

function descargarArchivo(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function exportarPacientesCSV(patientsList) {
  const encabezado = COLUMNAS_PACIENTE.map(c => c.label);
  const filas = patientsList.map(p => COLUMNAS_PACIENTE.map(c => p[c.key] ?? ''));
  // BOM al inicio para que Excel detecte UTF-8 y no rompa las tildes.
  descargarArchivo('pacientes.csv', '﻿' + filasACSV([encabezado, ...filas]), 'text/csv;charset=utf-8');
}

// Convierte las filas crudas del CSV (ya parseadas) en objetos { name, doc, ... },
// usando los encabezados de la primera fila para mapear columnas (sin importar
// el orden en que vengan, siempre que el nombre de columna coincida).
function filasCSVaPacientes(filas) {
  if (filas.length < 2) return [];
  const encabezados = filas[0].map(h => normalizarTexto(h.trim()));
  const indicePorClave = {};
  COLUMNAS_PACIENTE.forEach(c => {
    const idx = encabezados.indexOf(normalizarTexto(c.label));
    if (idx !== -1) indicePorClave[c.key] = idx;
  });
  return filas.slice(1)
    .filter(fila => fila.some(v => v.trim() !== ''))
    .map(fila => {
      const obj = {};
      COLUMNAS_PACIENTE.forEach(c => {
        const idx = indicePorClave[c.key];
        obj[c.key] = idx !== undefined ? (fila[idx] || '').trim() : '';
      });
      return obj;
    });
}

// Columnas-resumen del historial de tratamientos (plan_tratamiento de
// `historias`) -- se agregan a las de COLUMNAS_PACIENTE cuando se exporta
// "con historial". Una sola fila por paciente: todos sus tratamientos se
// acumulan en una celda, para no duplicar sus datos personales por cada
// tratamiento que tenga.
const COLUMNAS_HISTORIAL_RESUMEN = [
  { key: '_historial', label: 'Historial de Tratamientos' },
  { key: '_totalCosto', label: 'Total Costo' },
  { key: '_totalPagado', label: 'Total Pagado' },
  { key: '_totalSaldo', label: 'Total Saldo' },
];

// Descarga un CSV con UNA fila por paciente. Si hay rango de fechas, solo se
// acumulan (y sólo cuentan para los totales) los tratamientos con fecha
// dentro del rango -- un paciente sin ninguno en ese rango no aparece. Sin
// filtro de fecha, todos los pacientes aparecen aunque no tengan tratamientos.
function exportarHistorialCompletoCSV(pacientes, historiasPorPacienteId, fechaDesde, fechaHasta) {
  const encabezado = [...COLUMNAS_PACIENTE.map(c => c.label), ...COLUMNAS_HISTORIAL_RESUMEN.map(c => c.label)];
  const hayFiltroFecha = !!(fechaDesde || fechaHasta);

  const filas = pacientes.map(p => {
    const items = (historiasPorPacienteId[p.id]?.plan_tratamiento || [])
      .filter(i => {
        if (!hayFiltroFecha) return true;
        if (!i.date) return false;
        if (fechaDesde && i.date < fechaDesde) return false;
        if (fechaHasta && i.date > fechaHasta) return false;
        return true;
      });

    if (hayFiltroFecha && items.length === 0) return null; // sin actividad en el rango: no aparece

    const baseCols = COLUMNAS_PACIENTE.map(c => p[c.key] ?? '');
    const totalCosto = items.reduce((s, i) => s + (Number(i.cost) || 0), 0);
    const totalPagado = items.reduce((s, i) => s + (Number(i.paid) || 0), 0);
    const historialTexto = items
      .map(i => `${i.date || 's/f'}: ${i.name || 'Tratamiento'} (S/${(Number(i.cost) || 0).toFixed(2)}, pagado S/${(Number(i.paid) || 0).toFixed(2)})`)
      .join(' | ');

    return [
      ...baseCols,
      historialTexto, totalCosto.toFixed(2), totalPagado.toFixed(2), (totalCosto - totalPagado).toFixed(2),
    ];
  }).filter(Boolean);

  descargarArchivo('pacientes_historial.csv', '﻿' + filasACSV([encabezado, ...filas]), 'text/csv;charset=utf-8');
}

// ─── HOOK: LÓGICA DE PACIENTES ────────────────────────────────────────────────
// Toda la lógica de negocio separada del JSX
function usePatientsDirectory(clinicaId) {
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
      datos.clinica_id = clinicaId;

      const { data, error } = await supabase.from('pacientes').insert([datos]).select();
      if (error) throw error;
      setPatientsList(prev => {
        const f = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
        return [data[0], ...f];
      });
      return data[0];
    }
  }, [patientsList, clinicaId]);

  // NUEVA FUNCIÓN PARA BORRAR:
  const deletePatient = useCallback(async (id) => {
    const { error } = await supabase.from('pacientes').delete().eq('id', id);
    if (error) throw error;
    setPatientsList(prev => prev.filter(p => p.id !== id));
  }, []);

  // Importación en bloque: a diferencia de upsertPatient, nunca fusiona por
  // nombre -- cada fila ya llegó etiquetada como "nueva" o "duplicado
  // aprobado por el usuario" desde el modal de importación, así que acá
  // siempre se inserta como paciente nuevo (evita mezclar por error a dos
  // personas distintas que comparten nombre).
  const importarPacientes = useCallback(async (filas) => {
    const { data: hcData } = await supabase
      .from('pacientes').select('num_hc').not('num_hc', 'is', null)
      .order('id', { ascending: false }).limit(1);
    let next = 1;
    if (hcData?.[0]?.num_hc) {
      const match = hcData[0].num_hc.match(/\d+/);
      if (match) next = parseInt(match[0], 10) + 1;
    }

    const datos = filas.map(f => ({
      name: f.name.trim().replace(/\s+/g, ' '),
      doc: f.doc || null,
      phone: f.phone || null,
      treatment: f.treatment || null,
      reason: f.reason || null,
      birthDate: f.birthDate || null,
      age: f.age || null,
      sexo: f.sexo || null,
      direccion: f.direccion || null,
      email: f.email || null,
      allergies: f.allergies || null,
      blood: f.blood || null,
      tipo_doc: f.tipo_doc || null,
      tag: 'nuevo',
      num_hc: String(next++).padStart(4, '0'),
      clinica_id: clinicaId,
    }));

    const { data, error } = await supabase.from('pacientes').insert(datos).select();
    if (error) throw error;
    setPatientsList(prev => [...data, ...prev]);
    return data;
  }, [clinicaId]);

  return { patientsList, loading, upsertPatient, deletePatient, importarPacientes };
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
    const existente = findPatientByDoc(patientsList, valorDoc);
    if (existente) setForm({ ...existente, id: existente.id });
    else setForm(f => ({ ...f, id: null, doc: valorDoc, name: '', phone: '' }));
  }, [patientsList]);

  const handleNombreChange = useCallback((val) => {
    const existente = findPatientByName(patientsList, val);
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
    {['todos', 'activo', 'nuevo', 'inactivo'].map(f => (
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
  const { isTablet } = useResponsive();
  const mostrarEliminar = hov || isTablet; // en tablet/iPad no hay "hover" real, asi que se muestra siempre
  const estado = estadoPaciente(patient);

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
      {/* Botón Eliminar: discreto (icono gris) para no saturar la lista cuando
          queda siempre visible en tablet/iPad -- se pone rojo recien al tocarlo/pasar el mouse. */}
      {mostrarEliminar && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if(window.confirm(`¿Seguro que deseas eliminar a ${patient.name}?`)) onDelete(patient.id);
          }}
          title="Eliminar paciente"
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            width: 28, height: 28, borderRadius: '50%', background: 'transparent', color: C.inkMute,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.redSoft; e.currentTarget.style.color = C.red; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.inkMute; }}
        ><IcTrash /></button>
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

      {/* Indicador de estado (nuevo / inactivo) */}
      {!mostrarEliminar && estado !== 'activo' && (
        <span
          title={estado === 'nuevo' ? 'Paciente nuevo (≤30 días)' : 'Sin actividad hace más de 6 meses'}
          style={{ width: 7, height: 7, borderRadius: '50%', background: estado === 'nuevo' ? C.blue : '#9CA3AF', flexShrink: 0 }}
        />
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

// ─── SUB-COMPONENTE: MODAL EXPORTAR PACIENTES (CSV) ──────────────────────────
const ExportarPacientesModal = memo(({ onClose, patientsList }) => {
  const [seleccionados, setSeleccionados] = useState(() => new Set(patientsList.map(p => p.id)));
  const [conHistorial, setConHistorial] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [descargando, setDescargando] = useState(false);

  const todosMarcados = seleccionados.size === patientsList.length;
  const toggleTodos = () => setSeleccionados(todosMarcados ? new Set() : new Set(patientsList.map(p => p.id)));
  const toggleUno = (id) => setSeleccionados(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const descargar = async () => {
    const pacientesElegidos = patientsList.filter(p => seleccionados.has(p.id));
    if (pacientesElegidos.length === 0) return;

    if (!conHistorial) {
      exportarPacientesCSV(pacientesElegidos);
      onClose();
      return;
    }

    setDescargando(true);
    try {
      const ids = pacientesElegidos.map(p => p.id);
      const { data, error } = await supabase
        .from('historias').select('patient_id, plan_tratamiento').in('patient_id', ids);
      if (error) throw error;
      const historiasPorPacienteId = {};
      (data || []).forEach(h => { historiasPorPacienteId[h.patient_id] = h; });
      exportarHistorialCompletoCSV(pacientesElegidos, historiasPorPacienteId, fechaDesde, fechaHasta);
      onClose();
    } catch (err) {
      alert('No se pudo exportar el historial: ' + err.message);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Modal
      background="rgba(17,24,39,0.45)"
      overlayStyle={{ padding: 24 }}
      cardStyle={{
        background: C.surface, borderRadius: C.rx,
        width: '100%', maxWidth: 560, maxHeight: '85dvh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: C.font }}>Exportar pacientes</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkMute, fontSize: 18 }}>×</button>
      </div>

      <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink, fontWeight: 600, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={conHistorial} onChange={e => setConHistorial(e.target.checked)} />
          Incluir historial de tratamientos (fechas, costos, pagos)
        </label>

        {conHistorial && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.inkMute, display: 'block', marginBottom: 4 }}>DESDE (opcional)</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.inkMute, display: 'block', marginBottom: 4 }}>HASTA (opcional)</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}
        {conHistorial && (fechaDesde || fechaHasta) && (
          <p style={{ fontSize: 11, color: C.inkMute, marginTop: -8, marginBottom: 14 }}>
            Solo se incluyen tratamientos con fecha dentro del rango. Un paciente sin tratamientos en ese rango no aparecerá.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>Pacientes a exportar ({seleccionados.size} de {patientsList.length})</span>
          <button onClick={toggleTodos} style={{ background: 'none', border: 'none', color: C.brand, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
            {todosMarcados ? 'Ninguno' : 'Todos'}
          </button>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: C.r, maxHeight: 260, overflowY: 'auto' }}>
          {patientsList.map((p, i) => (
            <label key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', cursor: 'pointer',
              borderBottom: i < patientsList.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleUno(p.id)} />
              <span style={{ fontSize: 12.5, color: C.ink, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <span style={{ fontSize: 11, color: C.inkMute }}>DNI {p.doc || '---'}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: C.r, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontWeight: 600, color: C.inkMid, fontSize: 13 }}>
          Cancelar
        </button>
        <button
          onClick={descargar}
          disabled={descargando || seleccionados.size === 0}
          style={{ flex: 1, padding: 9, borderRadius: C.r, border: 'none', background: descargando || seleccionados.size === 0 ? C.inkMute : C.brand, color: '#fff', cursor: descargando ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <IcDownload /> {descargando ? 'Generando…' : 'Descargar CSV'}
        </button>
      </div>
    </Modal>
  );
});

// ─── SUB-COMPONENTE: MODAL IMPORTAR PACIENTES (CSV) ──────────────────────────
const ImportarPacientesModal = memo(({ onClose, onImportar, patientsList }) => {
  const [filas, setFilas] = useState(null); // null = todavía no se eligió archivo
  const [seleccionDuplicados, setSeleccionDuplicados] = useState({}); // { indice: boolean }
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null); // { insertados, omitidos }
  const [error, setError] = useState('');

  const docsExistentes = new Set(
    patientsList.map(p => normalizarTexto(p.doc || '')).filter(Boolean)
  );

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const texto = await file.text();
      const crudo = parseCSV(texto);
      const pacientesCSV = filasCSVaPacientes(crudo);
      if (pacientesCSV.length === 0) {
        setError('El archivo no tiene filas con datos, o no coinciden los encabezados esperados.');
        return;
      }
      const docsVistos = new Set();
      const evaluadas = pacientesCSV.map(p => {
        if (!p.name || !p.doc) return { ...p, estado: 'error', motivo: 'Falta Nombre o DNI' };
        const docNorm = normalizarTexto(p.doc);
        const esDuplicado = docsExistentes.has(docNorm) || docsVistos.has(docNorm);
        docsVistos.add(docNorm);
        return { ...p, estado: esDuplicado ? 'duplicado' : 'nuevo' };
      });
      setFilas(evaluadas);
      setSeleccionDuplicados({});
    } catch {
      setError('No se pudo leer el archivo. ¿Es un CSV válido?');
    }
  };

  const confirmar = async () => {
    const aImportar = filas.filter((f, i) =>
      f.estado === 'nuevo' || (f.estado === 'duplicado' && seleccionDuplicados[i])
    );
    if (aImportar.length === 0) { onClose(); return; }
    setImportando(true);
    try {
      await onImportar(aImportar);
      setResultado({
        insertados: aImportar.length,
        omitidos: filas.length - aImportar.length,
      });
    } catch (err) {
      setError('Error al importar: ' + err.message);
    } finally {
      setImportando(false);
    }
  };

  const nuevos = filas?.filter(f => f.estado === 'nuevo').length || 0;
  const duplicados = filas?.filter(f => f.estado === 'duplicado').length || 0;
  const errores = filas?.filter(f => f.estado === 'error').length || 0;

  return (
    <Modal
      background="rgba(17,24,39,0.45)"
      overlayStyle={{ padding: 24 }}
      cardStyle={{
        background: C.surface, borderRadius: C.rx,
        width: '100%', maxWidth: 640, maxHeight: '85dvh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: C.font }}>Importar pacientes desde CSV</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.inkMute, fontSize: 18 }}>×</button>
      </div>

      <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
        {resultado ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.green, marginBottom: 6 }}>
              ✓ {resultado.insertados} paciente{resultado.insertados !== 1 ? 's' : ''} importado{resultado.insertados !== 1 ? 's' : ''}
            </div>
            {resultado.omitidos > 0 && (
              <div style={{ fontSize: 12.5, color: C.inkMute }}>{resultado.omitidos} fila{resultado.omitidos !== 1 ? 's' : ''} omitida{resultado.omitidos !== 1 ? 's' : ''} (duplicado no confirmado, o con error)</div>
            )}
          </div>
        ) : !filas ? (
          <div>
            <p style={{ fontSize: 12.5, color: C.inkMid, lineHeight: 1.6, marginBottom: 14 }}>
              El archivo debe ser un CSV con encabezados. Las columnas <strong>Nombre</strong> y <strong>DNI</strong> son obligatorias
              (el resto son opcionales). Si no tienes un archivo todavía, descarga tu lista actual como plantilla y edítala.
            </p>
            <button
              onClick={() => exportarPacientesCSV(patientsList)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: C.r, border: `1px solid ${C.border}`, background: C.surfaceAlt, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 16 }}>
              <IcDownload /> Descargar plantilla / lista actual
            </button>
            <input type="file" accept=".csv,text/csv" onChange={onFileChange} style={{ display: 'block', fontSize: 13 }} />
            {error && <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{error}</div>}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, fontSize: 12 }}>
              <span style={{ color: C.green, fontWeight: 700 }}>{nuevos} nuevo{nuevos !== 1 ? 's' : ''}</span>
              <span style={{ color: C.amber, fontWeight: 700 }}>{duplicados} duplicado{duplicados !== 1 ? 's' : ''}</span>
              {errores > 0 && <span style={{ color: C.red, fontWeight: 700 }}>{errores} con error</span>}
            </div>
            {duplicados > 0 && (
              <p style={{ fontSize: 11.5, color: C.inkMute, marginBottom: 10 }}>
                Ya existe un paciente con ese DNI. Marca la casilla si igual quieres importarlo como un paciente nuevo y separado.
              </p>
            )}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: C.r, overflow: 'hidden' }}>
              {filas.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderBottom: i < filas.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: f.estado === 'error' ? C.redSoft : f.estado === 'duplicado' ? C.amberSoft : 'transparent',
                }}>
                  {f.estado === 'duplicado' ? (
                    <input
                      type="checkbox"
                      checked={!!seleccionDuplicados[i]}
                      onChange={e => setSeleccionDuplicados(prev => ({ ...prev, [i]: e.target.checked }))}
                    />
                  ) : (
                    <span style={{ width: 13, textAlign: 'center', color: f.estado === 'error' ? C.red : C.green, fontWeight: 700 }}>
                      {f.estado === 'error' ? '!' : '✓'}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.name || '(sin nombre)'}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.inkMute }}>
                      {f.estado === 'error' ? f.motivo : `DNI ${f.doc || '---'}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!resultado && filas && (
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: C.r, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontWeight: 600, color: C.inkMid, fontSize: 13 }}>
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={importando || nuevos + Object.values(seleccionDuplicados).filter(Boolean).length === 0}
            style={{ flex: 1, padding: 9, borderRadius: C.r, border: 'none', background: importando ? C.inkMute : C.brand, color: '#fff', cursor: importando ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
            {importando ? 'Importando…' : 'Confirmar importación'}
          </button>
        </div>
      )}
      {resultado && (
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', padding: 9, borderRadius: C.r, border: 'none', background: C.brand, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Cerrar
          </button>
        </div>
      )}
    </Modal>
  );
});

// ─── COMPONENTE PRINCIPAL: EXPEDIENTE ────────────────────────────────────────
export default function Expediente({ teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView, clinicaId }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [patSeleccionado, setPatSeleccionado] = useState(null);
  const { isNarrow } = useResponsive();

  const { patientsList, loading, upsertPatient, deletePatient, importarPacientes } = usePatientsDirectory(clinicaId);

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
    const matchFilter = filter === 'todos' || estadoPaciente(p) === filter;
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
      gap: isNarrow ? 10 : 20, minHeight: 0,
    }}>

      {/* ─── PANEL IZQUIERDO: DIRECTORIO ─── */}
      <aside style={{
        width: isNarrow ? 230 : 300, minWidth: isNarrow ? 210 : 280,
        display: 'flex', flexDirection: 'column',
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        borderRadius: C.rx,
        border: GLASS_BORDER,
        boxShadow: GLASS_SHADOW,
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
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowExportModal(true)}
                aria-label="Exportar pacientes a CSV"
                title="Exportar a CSV"
                style={{
                  width: 30, height: 30, borderRadius: C.r,
                  background: C.surfaceAlt, color: C.inkMid,
                  border: `1px solid ${C.border}`, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s', outline: 'none',
                }}
              >
                <IcDownload />
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                aria-label="Importar pacientes desde CSV"
                title="Importar desde CSV"
                style={{
                  width: 30, height: 30, borderRadius: C.r,
                  background: C.surfaceAlt, color: C.inkMid,
                  border: `1px solid ${C.border}`, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s', outline: 'none',
                }}
              >
                <IcUpload />
              </button>
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
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        borderRadius: C.rx,
        border: GLASS_BORDER,
        boxShadow: GLASS_SHADOW,
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
            clinicaId={clinicaId}
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

      {/* Modal importar pacientes desde CSV */}
      {showImportModal && (
        <ImportarPacientesModal
          onClose={() => setShowImportModal(false)}
          onImportar={importarPacientes}
          patientsList={patientsList}
        />
      )}

      {/* Modal exportar pacientes (seleccion + fecha + historial) */}
      {showExportModal && (
        <ExportarPacientesModal
          onClose={() => setShowExportModal(false)}
          patientsList={patientsList}
        />
      )}
    </div>
  );
}