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
import ConfirmDeleteModal from '../ui/ConfirmDeleteModal';
import { BD, P, DN, MU, RJ, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import { normalizarTexto, ini, findPatientByDoc, findPatientByName, estadoPaciente } from '../../utils/helpers';
import useResponsive from '../../utils/useResponsive';
import { notify } from '../../utils/toast';
import { eliminarPacienteCompleto } from '../../utils/pacientes';

// ─── DESIGN TOKENS (alineados con App.jsx) ───────────────────────────────────
// Ya no son hex fijos: cada entrada apunta a la MISMA variable CSS declarada en
// src/tokens.css (":root"). Así este archivo hereda el acento de cada clínica
// sin duplicar paleta, y `C` queda como un alias local de los mismos tokens
// que exporta utils/constants.js.
const C = {
  bg:          '#F9F9F9',
  surface:     '#FFFFFF',
  surfaceAlt:  '#F5F5F5',
  fill:        '#F5F5F5',
  fillHover:   '#EDEDED',
  border:      'rgba(10, 10, 10, 0.06)',
  borderStrong:'rgba(10, 10, 10, 0.11)',
  ink:         '#0A0A0A',
  inkMid:      '#6B7280',
  inkMute:     '#9AA1AC',
  brand:       '#729DEE',
  brandSoft:   'rgba(114, 157, 238, 0.12)',
  brandText:   '#5B82D6',
  green:       '#22A55E',
  greenSoft:   '#DCFCE7',
  blue:        '#729DEE',
  blueSoft:    'rgba(114, 157, 238, 0.12)',
  red:         '#E56868',
  redSoft:     '#FEE2E2',
  amber:       '#E8A63D',
  amberSoft:   '#FEF3C7',
  r:           '10px',
  rl:          '14px',
  rx:          '18px',
  font:        "'Urbanist', system-ui, sans-serif",
  shadowSm:    '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 6px rgba(16, 24, 40, 0.05)',
  shadowMd:    '0 2px 4px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)',
  ease:        'cubic-bezier(0.25, 0.1, 0.25, 1)',
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
// El ícono de papelera se reemplazó por uno de archivar: la acción ya no borra
// nada, y una papelera prometía lo contrario de lo que hace.
const IcArchivar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><line x1="10" y1="13" x2="14" y2="13"/>
  </svg>
);
const IcRestaurar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/>
  </svg>
);
// A diferencia de IcArchivar, este SÍ borra -- por eso sólo aparece sobre un
// paciente YA archivado (un paso extra a propósito antes de un borrado
// irreversible).
const IcEliminar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      // Se traen TODOS, archivados incluidos: el filtro "Archivados" del
      // Directorio los necesita para poder recuperar un paciente sin recargar.
      const { data } = await supabase
        .from('pacientes')
        .select('*')
        .order('id', { ascending: false });

      if (data) {
        // Deduplica por nombre, pero un archivado nunca desplaza a un activo con
        // el mismo nombre: si no, al archivar a alguien su tocayo activo podría
        // desaparecer del listado.
        const unicos = [];
        const indicePorNombre = new Map();
        data.forEach(p => {
          const norm = normalizarTexto(p.name);
          const yaEsta = indicePorNombre.get(norm);
          if (yaEsta === undefined) {
            indicePorNombre.set(norm, unicos.length);
            unicos.push(p);
          } else if (unicos[yaEsta].archivado_at && !p.archivado_at) {
            unicos[yaEsta] = p;
          }
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

  // Archivar en vez de borrar. Antes esto hacía un DELETE real, y eso tenía dos
  // problemas: fallaba con un error de Postgres en inglés si el paciente tenía
  // órdenes de laboratorio, y cuando NO fallaba se llevaba la ortodoncia en
  // cascada y dejaba la historia clínica huérfana e invisible (así se
  // acumularon 9 historias sin paciente, cuyos montos además seguían sumando en
  // el Dashboard).
  //
  // Una historia clínica debe conservarse, así que el paciente sale del
  // Directorio pero ningún registro clínico se destruye. Es reversible con
  // `desarchivarPatient`.
  const archivarPatient = useCallback(async (id) => {
    const { error } = await supabase
      .from('pacientes')
      .update({ archivado_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    setPatientsList(prev => prev.map(p => (
      p.id === id ? { ...p, archivado_at: new Date().toISOString() } : p
    )));
  }, []);

  const desarchivarPatient = useCallback(async (id) => {
    const { error } = await supabase
      .from('pacientes')
      .update({ archivado_at: null })
      .eq('id', id);
    if (error) throw error;
    setPatientsList(prev => prev.map(p => (
      p.id === id ? { ...p, archivado_at: null } : p
    )));
  }, []);

  // Borrado real (ficha + historia clínica + laboratorio + ortodoncia) --
  // ver el comentario largo de archivarPatient arriba: esto es la
  // reconstrucción cuidadosa, en orden, de lo que antes rompía datos.
  const eliminarPatientDefinitivo = useCallback(async (id) => {
    await eliminarPacienteCompleto(id);
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

  return { patientsList, loading, upsertPatient, archivarPatient, desarchivarPatient, eliminarPatientDefinitivo, importarPacientes };
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
    display: 'flex', gap: 2,
    background: C.fill, padding: 2,
    borderRadius: C.rl, border: `1px solid ${C.border}`,
  }}>
    {/* "Archivados" es su propia pestaña y NO aparece en las otras: un paciente
        archivado saldría del Directorio sin dejar forma de recuperarlo. */}
    {['todos', 'activo', 'nuevo', 'inactivo', 'archivados'].map(f => (
      <button
        key={f}
        onClick={() => onChange(f)}
        className="tab-item"
        aria-selected={active === f}
        style={{
          flex: 1, padding: '0 2px', minHeight: 36,
          borderRadius: C.r, border: 'none',
          background: active === f ? C.surface : 'transparent',
          color: active === f ? C.ink : C.inkMid,
          fontSize: 12, fontWeight: active === f ? 600 : 400,
          cursor: 'pointer', fontFamily: C.font,
          boxShadow: active === f ? C.shadowSm : 'none',
          textTransform: 'capitalize', whiteSpace: 'nowrap',
        }}
      >
        {f}
      </button>
    ))}
  </div>
));

// ─── SUB-COMPONENTE: TARJETA DE PACIENTE ─────────────────────────────────────
const PatientCard = memo(({ patient, isSelected, onClick, onArchivar, onEliminar }) => {
  const [hov, setHov] = useState(false);
  const { isTablet } = useResponsive();
  const mostrarAccion = hov || isTablet; // en tablet/iPad no hay "hover" real, asi que se muestra siempre
  const estado = estadoPaciente(patient);
  const archivado = !!patient.archivado_at;

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
        padding: '10px 12px', paddingRight: mostrarAccion ? (archivado ? 82 : 46) : 12,
        minHeight: 44, cursor: 'pointer', borderRadius: C.rl, marginBottom: 2,
        display: 'flex', alignItems: 'center', gap: 12, position: 'relative', // position relative es clave
        background: isSelected ? C.brandSoft : hov ? C.fillHover : 'transparent',
        border: `1px solid ${isSelected ? `color-mix(in srgb, ${C.brand} 28%, transparent)` : 'transparent'}`,
        // Un archivado se ve atenuado, para que no se confunda con uno activo
        // cuando se está mirando la pestaña "Archivados".
        opacity: archivado ? 0.62 : 1,
        transition: `background 0.15s ${C.ease}, border-color 0.15s ${C.ease}, opacity 0.15s ${C.ease}`, outline: 'none',
      }}
    >
      {/* Archivar / recuperar. Discreto (ícono gris) para no saturar la lista
          cuando queda siempre visible en tablet/iPad. Ya no es un "eliminar":
          archivar conserva la historia clínica, así que tampoco se pinta de
          rojo -- no es una acción destructiva. */}
      {mostrarAccion && (
        <button
          onClick={(e) => { e.stopPropagation(); onArchivar(patient); }}
          title={archivado ? `Recuperar a ${patient.name}` : `Archivar a ${patient.name}`}
          aria-label={archivado ? 'Recuperar paciente' : 'Archivar paciente'}
          style={{
            position: 'absolute', right: archivado ? 42 : 6, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, minHeight: 36, borderRadius: '50%', background: 'transparent', color: C.inkMute,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            transition: `background 0.15s ${C.ease}, color 0.15s ${C.ease}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.brandSoft; e.currentTarget.style.color = C.brand; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.inkMute; }}
        >{archivado ? <IcRestaurar /> : <IcArchivar />}</button>
      )}

      {/* Borrado real, sólo disponible sobre un paciente YA archivado -- un
          paso extra a propósito antes de algo irreversible. */}
      {mostrarAccion && archivado && (
        <button
          onClick={(e) => { e.stopPropagation(); onEliminar(patient); }}
          title={`Eliminar a ${patient.name} para siempre`}
          aria-label="Eliminar paciente para siempre"
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            width: 36, height: 36, minHeight: 36, borderRadius: '50%', background: 'transparent', color: C.inkMute,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
            transition: `background 0.15s ${C.ease}, color 0.15s ${C.ease}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = RJ; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.inkMute; }}
        ><IcEliminar /></button>
      )}

      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: C.r, flexShrink: 0,
        background: isSelected ? C.brand : C.fill, color: isSelected ? '#fff' : C.inkMid,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 600, fontSize: 15, fontFamily: C.font,
        transition: `background 0.15s ${C.ease}, color 0.15s ${C.ease}`,
      }}>
        {ini(patient.name)}
      </div>

      {/* Datos — el nombre se envuelve a 2 líneas en vez de cortarse con
          "...": un nombre completo se lee mejor entero que a la mitad. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: isSelected ? C.brandText : C.ink, lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {patient.name}
        </div>
        <div style={{ fontSize: 12.5, color: C.inkMid, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
          {patient.num_hc && <span style={{ color: C.brand, fontWeight: 600, whiteSpace: 'nowrap' }}>HC: {patient.num_hc}</span>}
          <span style={{ whiteSpace: 'nowrap' }}>DNI: {patient.doc || '---'}</span>
        </div>
      </div>

      {/* Indicador de estado (nuevo / inactivo). En un archivado no aporta: su
          estado relevante ya es "archivado", que se comunica con la opacidad. */}
      {!mostrarAccion && !archivado && estado !== 'activo' && (
        <span
          title={estado === 'nuevo' ? 'Paciente nuevo (≤30 días)' : 'Sin actividad hace más de 6 meses'}
          style={{ width: 8, height: 8, borderRadius: '50%', background: estado === 'nuevo' ? C.blue : C.inkMute, flexShrink: 0 }}
        />
      )}
    </div>
  );
});

// ─── SUB-COMPONENTE: INPUT DE FORMULARIO ─────────────────────────────────────
const FormField = memo(({ label, children, span }) => (
  <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
    <label style={{
      fontSize: 13, fontWeight: 600, color: C.inkMid,
      display: 'block', marginBottom: 6, fontFamily: C.font,
    }}>
      {label}
    </label>
    {children}
  </div>
));

const inputStyle = {
  width: '100%', padding: '11px 12px', minHeight: 44,
  borderRadius: C.r, border: `1px solid ${C.border}`,
  fontSize: 15, fontFamily: C.font, color: C.ink,
  background: C.surface, outline: 'none', boxSizing: 'border-box',
  transition: `border-color 0.15s ${C.ease}, box-shadow 0.15s ${C.ease}`,
};

// ─── SUB-COMPONENTE: MODAL NUEVO PACIENTE ────────────────────────────────────
const NewPatientModal = memo(({ onClose, onSave, patientsList }) => {
  const { form, setForm, handleDocChange, handleNombreChange, handleBirthDate } =
    usePatientForm(patientsList);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim()) { notify('Nombre requerido'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      notify('Error: ' + err.message);
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
        boxShadow: C.shadowMd,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: C.ink, fontFamily: C.font, letterSpacing: '-0.02em' }}>
            Registrar paciente
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, minHeight: 36, borderRadius: '50%',
              border: 'none', background: C.fill,
              cursor: 'pointer', color: C.inkMid, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: C.font, outline: 'none',
              transition: `background 0.15s ${C.ease}`,
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
              style={{ ...inputStyle, borderColor: C.brand, fontVariantNumeric: 'tabular-nums' }}
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
              style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
              onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.boxShadow = `0 0 0 3px ${C.brandSoft}`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
            />
          </FormField>

          <FormField label="F. Nacimiento">
            <input
              type="date"
              value={form.birthDate}
              onChange={e => handleBirthDate(e.target.value)}
              style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e => { e.target.style.borderColor = C.border; }}
            />
          </FormField>

          <FormField label="Edad">
            <input
              type="number"
              value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
              style={{ ...inputStyle, background: C.fill, fontVariantNumeric: 'tabular-nums' }}
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
              flex: 1, padding: '0 16px', minHeight: 44, borderRadius: C.r,
              border: `1px solid ${C.border}`, background: C.surface,
              cursor: 'pointer', fontWeight: 600, color: C.inkMid,
              fontSize: 15, fontFamily: C.font,
              transition: `background 0.15s ${C.ease}`,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1, padding: '0 16px', minHeight: 44, borderRadius: C.r,
              border: 'none',
              background: saving ? C.inkMute : C.brand,
              color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: 15, fontFamily: C.font,
              boxShadow: C.shadowSm,
              transition: `background 0.15s ${C.ease}, opacity 0.15s ${C.ease}`,
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
      notify('No se pudo exportar el historial: ' + err.message);
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
        boxShadow: C.shadowMd,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: C.ink, fontFamily: C.font, letterSpacing: '-0.02em' }}>Exportar pacientes</span>
        <button onClick={onClose} style={{ width: 36, height: 36, minHeight: 36, borderRadius: '50%', background: C.fill, border: 'none', cursor: 'pointer', color: C.inkMid, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `background 0.15s ${C.ease}` }}>×</button>
      </div>

      <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, fontSize: 15, color: C.ink, fontWeight: 500, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={conHistorial} onChange={e => setConHistorial(e.target.checked)} style={{ width: 17, height: 17, accentColor: C.brand, cursor: 'pointer' }} />
          Incluir historial de tratamientos (fechas, costos, pagos)
        </label>

        {conHistorial && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.inkMid, display: 'block', marginBottom: 6 }}>DESDE (opcional)</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.inkMid, display: 'block', marginBottom: 6 }}>HASTA (opcional)</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={{ ...inputStyle, fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>
        )}
        {conHistorial && (fechaDesde || fechaHasta) && (
          <p style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.5, marginTop: -6, marginBottom: 14 }}>
            Solo se incluyen tratamientos con fecha dentro del rango. Un paciente sin tratamientos en ese rango no aparecerá.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>Pacientes a exportar ({seleccionados.size} de {patientsList.length})</span>
          <button onClick={toggleTodos} style={{ background: 'none', border: 'none', color: C.brand, fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 36, padding: '0 4px' }}>
            {todosMarcados ? 'Ninguno' : 'Todos'}
          </button>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: C.rl, maxHeight: 260, overflowY: 'auto' }}>
          {patientsList.map((p, i) => (
            <label key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', minHeight: 44, cursor: 'pointer',
              borderBottom: i < patientsList.length - 1 ? `1px solid ${C.border}` : 'none',
            }}>
              <input type="checkbox" checked={seleccionados.has(p.id)} onChange={() => toggleUno(p.id)} style={{ width: 17, height: 17, accentColor: C.brand, cursor: 'pointer' }} />
              <span style={{ fontSize: 15, color: C.ink, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
              <span style={{ fontSize: 13, color: C.inkMid, fontVariantNumeric: 'tabular-nums' }}>DNI {p.doc || '---'}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={onClose} style={{ flex: 1, padding: '0 16px', minHeight: 44, borderRadius: C.r, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontWeight: 600, color: C.inkMid, fontSize: 15, transition: `background 0.15s ${C.ease}` }}>
          Cancelar
        </button>
        <button
          onClick={descargar}
          disabled={descargando || seleccionados.size === 0}
          style={{ flex: 1, padding: '0 16px', minHeight: 44, borderRadius: C.r, border: 'none', background: descargando || seleccionados.size === 0 ? C.inkMute : C.brand, color: '#fff', cursor: descargando ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: `background 0.15s ${C.ease}` }}>
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
        boxShadow: C.shadowMd,
        border: `1px solid ${C.border}`, overflow: 'hidden',
      }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: C.ink, fontFamily: C.font, letterSpacing: '-0.02em' }}>Importar pacientes desde CSV</span>
        <button onClick={onClose} style={{ width: 36, height: 36, minHeight: 36, flexShrink: 0, borderRadius: '50%', background: C.fill, border: 'none', cursor: 'pointer', color: C.inkMid, fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: `background 0.15s ${C.ease}` }}>×</button>
      </div>

      <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
        {resultado ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: C.green, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
              ✓ {resultado.insertados} paciente{resultado.insertados !== 1 ? 's' : ''} importado{resultado.insertados !== 1 ? 's' : ''}
            </div>
            {resultado.omitidos > 0 && (
              <div style={{ fontSize: 13.5, color: C.inkMid, fontVariantNumeric: 'tabular-nums' }}>{resultado.omitidos} fila{resultado.omitidos !== 1 ? 's' : ''} omitida{resultado.omitidos !== 1 ? 's' : ''} (duplicado no confirmado, o con error)</div>
            )}
          </div>
        ) : !filas ? (
          <div>
            <p style={{ fontSize: 13.5, color: C.inkMid, lineHeight: 1.55, marginBottom: 14 }}>
              El archivo debe ser un CSV con encabezados. Las columnas <strong>Nombre</strong> y <strong>DNI</strong> son obligatorias
              (el resto son opcionales). Si no tienes un archivo todavía, descarga tu lista actual como plantilla y edítala.
            </p>
            <button
              onClick={() => exportarPacientesCSV(patientsList)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 14px', minHeight: 36, borderRadius: C.r, border: `1px solid ${C.border}`, background: C.fill, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.inkMid, marginBottom: 16, transition: `background 0.15s ${C.ease}` }}>
              <IcDownload /> Descargar plantilla / lista actual
            </button>
            <input type="file" accept=".csv,text/csv" onChange={onFileChange} style={{ display: 'block', fontSize: 15, color: C.inkMid }} />
            {error && <div style={{ marginTop: 10, fontSize: 13, color: C.red }}>{error}</div>}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: C.green, fontWeight: 600 }}>{nuevos} nuevo{nuevos !== 1 ? 's' : ''}</span>
              <span style={{ color: C.amber, fontWeight: 600 }}>{duplicados} duplicado{duplicados !== 1 ? 's' : ''}</span>
              {errores > 0 && <span style={{ color: C.red, fontWeight: 600 }}>{errores} con error</span>}
            </div>
            {duplicados > 0 && (
              <p style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.5, marginBottom: 10 }}>
                Ya existe un paciente con ese DNI. Marca la casilla si igual quieres importarlo como un paciente nuevo y separado.
              </p>
            )}
            <div style={{ border: `1px solid ${C.border}`, borderRadius: C.rl, overflow: 'hidden' }}>
              {filas.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', minHeight: 44,
                  borderBottom: i < filas.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: f.estado === 'error' ? C.redSoft : f.estado === 'duplicado' ? C.amberSoft : 'transparent',
                }}>
                  {f.estado === 'duplicado' ? (
                    <input
                      type="checkbox"
                      checked={!!seleccionDuplicados[i]}
                      onChange={e => setSeleccionDuplicados(prev => ({ ...prev, [i]: e.target.checked }))}
                      style={{ width: 17, height: 17, accentColor: C.brand, cursor: 'pointer' }}
                    />
                  ) : (
                    <span style={{ width: 17, textAlign: 'center', color: f.estado === 'error' ? C.red : C.green, fontWeight: 600 }}>
                      {f.estado === 'error' ? '!' : '✓'}
                    </span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.name || '(sin nombre)'}
                    </div>
                    <div style={{ fontSize: 12, color: C.inkMid, fontVariantNumeric: 'tabular-nums' }}>
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
          <button onClick={onClose} style={{ flex: 1, padding: '0 16px', minHeight: 44, borderRadius: C.r, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontWeight: 600, color: C.inkMid, fontSize: 15, transition: `background 0.15s ${C.ease}` }}>
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={importando || nuevos + Object.values(seleccionDuplicados).filter(Boolean).length === 0}
            style={{ flex: 1, padding: '0 16px', minHeight: 44, borderRadius: C.r, border: 'none', background: importando ? C.inkMute : C.brand, color: '#fff', cursor: importando ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15, transition: `background 0.15s ${C.ease}` }}>
            {importando ? 'Importando…' : 'Confirmar importación'}
          </button>
        </div>
      )}
      {resultado && (
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ width: '100%', padding: '0 16px', minHeight: 44, borderRadius: C.r, border: 'none', background: C.brand, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 15, transition: `background 0.15s ${C.ease}` }}>
            Cerrar
          </button>
        </div>
      )}
    </Modal>
  );
});

// ─── COMPONENTE PRINCIPAL: EXPEDIENTE ────────────────────────────────────────
export default function Expediente({ teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView, setSelPat, clinicaId, patient }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  // `undefined` = todavía no eligió nada en esta vista (vale el paciente con el
  // que la abrieron, si vino uno); `null` = eligió no tener ninguno abierto.
  const [patSeleccionado, setPatSeleccionado] = useState(undefined);

  const { patientsList, loading, upsertPatient, archivarPatient, desarchivarPatient, eliminarPatientDefinitivo, importarPacientes } = usePatientsDirectory(clinicaId);

  // Permite entrar directo a la historia de un paciente desde otra vista (por
  // ejemplo el botón "Historia odontológica" de Ortodoncia). Se resuelve la fila
  // completa del directorio, porque la vista que navega puede traer solo unos
  // pocos campos del paciente. Es un valor derivado y no un efecto: en cuanto el
  // usuario elige (o cierra) un paciente acá, manda su elección.
  const patActivo = patSeleccionado !== undefined
    ? patSeleccionado
    : (patient?.id ? patientsList.find(p => p.id === patient.id) ?? null : null);

  // Mantiene sincronizado a nivel de App cuál es el paciente abierto acá --
  // sin esto, App.jsx sólo se enteraba del paciente con el que se entró
  // desde OTRA vista, nunca de los que se eligen haciendo clic dentro del
  // propio Directorio. Eso hacía que "volver exactamente a donde se quedó"
  // tras un F5 sólo funcionara para el primer paciente abierto en la sesión.
  //
  // Sólo sincroniza cuando `patSeleccionado` cambia por una acción explícita
  // en ESTA vista (elegir o cerrar un paciente) -- nunca como eco del valor
  // ya derivado de `patient` (la prop que ya vino de App.jsx). Sincronizar
  // ese eco en el montaje competía en una carrera con la restauración de
  // sesión desde localStorage: `patient` llega en null en el primer render
  // (antes de que App.jsx la hidrate), este efecto lo reenviaba para arriba,
  // y borraba el paciente restaurado antes de que patientsList terminara de
  // cargar y pudiera resolverlo.
  useEffect(() => {
    if (patSeleccionado === undefined) return;
    setSelPat?.(patSeleccionado);
  }, [patSeleccionado, setSelPat]);

  const handleArchivar = async (paciente) => {
    const archivar = !paciente.archivado_at;
    if (archivar && !window.confirm(
      `¿Archivar a ${paciente.name}?\n\nSale del Directorio, pero su historia clínica, órdenes de laboratorio y tratamientos se conservan. Podés recuperarlo desde el filtro "Archivados".`
    )) return;
    try {
      if (archivar) await archivarPatient(paciente.id);
      else await desarchivarPatient(paciente.id);
      if (archivar && patActivo?.id === paciente.id) setPatSeleccionado(null);
    } catch (err) {
      notify(`No se pudo ${archivar ? 'archivar' : 'recuperar'} el paciente: ${err.message}`);
    }
  };

  // Borrado real -- sólo se ofrece sobre un paciente ya archivado (ver
  // ConfirmDeleteModal más abajo para la doble confirmación).
  const [pacienteAEliminar, setPacienteAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const handleEliminarDefinitivo = async () => {
    if (!pacienteAEliminar) return;
    setEliminando(true);
    try {
      await eliminarPatientDefinitivo(pacienteAEliminar.id);
      if (patActivo?.id === pacienteAEliminar.id) setPatSeleccionado(null);
      notify('Paciente eliminado correctamente.');
      setPacienteAEliminar(null);
    } catch (err) {
      notify('No se pudo eliminar el paciente: ' + err.message);
    } finally {
      setEliminando(false);
    }
  };

  // Lista filtrada — solo se recalcula cuando cambian q, filter o patientsList
  const filteredList = patientsList.filter(p => {
    const matchSearch =
      normalizarTexto(p.name).includes(normalizarTexto(q)) ||
      (p.doc && p.doc.includes(q));
    // Los archivados sólo se ven en su propia pestaña; el resto de los filtros
    // (incluido "todos") trabaja únicamente sobre pacientes activos.
    const estaArchivado = !!p.archivado_at;
    const matchFilter = filter === 'archivados'
      ? estaArchivado
      : !estaArchivado && (filter === 'todos' || estadoPaciente(p) === filter);
    return matchSearch && matchFilter;
  });

  const handleSave = useCallback(async (form) => {
    const saved = await upsertPatient(form);
    // Si el paciente seleccionado fue editado, actualizarlo
    if (patActivo?.id === saved.id) setPatSeleccionado(saved);
  }, [upsertPatient, patActivo]);

  // Dos vistas en pantalla completa, no un panel compartido: sin paciente
  // seleccionado se ve SÓLO el directorio (a lo ancho, organizado en grilla
  // en vez de una columna angosta); al hacer clic, el directorio desaparece
  // y el expediente ocupa toda la pantalla (con un botón "Directorio" para
  // volver, ver Historia.jsx).
  if (patActivo) {
    return (
      <div style={{
        height: 'calc(100vh - 100px)',
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        borderRadius: C.rx,
        border: GLASS_BORDER,
        boxShadow: GLASS_SHADOW,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <Historia
          patient={patActivo}
          teeth={teeth}
          setTeeth={setTeeth}
          teethEvolucion={teethEvolucion}
          setTeethEvolucion={setTeethEvolucion}
          setView={setView}
          clinicaId={clinicaId}
          onVolver={() => setPatSeleccionado(null)}
        />

        {showModal && <NewPatientModal onClose={() => setShowModal(false)} onSave={handleSave} patientsList={patientsList} />}
        {showImportModal && <ImportarPacientesModal onClose={() => setShowImportModal(false)} onImportar={importarPacientes} patientsList={patientsList} />}
        {showExportModal && <ExportarPacientesModal onClose={() => setShowExportModal(false)} patientsList={patientsList} />}
      </div>
    );
  }

  return (
    <>
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 100px)', minHeight: 0,
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        borderRadius: C.rx,
        border: GLASS_BORDER,
        boxShadow: GLASS_SHADOW,
        overflow: 'hidden',
      }}>

        {/* Header directorio */}
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <span style={{
              fontSize: 17, fontWeight: 600, color: C.ink, fontFamily: C.font,
            }}>
              Directorio
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowExportModal(true)}
                aria-label="Exportar pacientes a CSV"
                title="Exportar a CSV"
                style={{
                  width: 36, height: 36, minHeight: 36, borderRadius: C.r,
                  background: C.fill, color: C.inkMid,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: `background 0.15s ${C.ease}, color 0.15s ${C.ease}`, outline: 'none',
                }}
              >
                <IcDownload />
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                aria-label="Importar pacientes desde CSV"
                title="Importar desde CSV"
                style={{
                  width: 36, height: 36, minHeight: 36, borderRadius: C.r,
                  background: C.fill, color: C.inkMid,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: `background 0.15s ${C.ease}, color 0.15s ${C.ease}`, outline: 'none',
                }}
              >
                <IcUpload />
              </button>
              <button
                onClick={() => setShowModal(true)}
                aria-label="Nuevo paciente"
                style={{
                  width: 36, height: 36, minHeight: 36, borderRadius: C.r,
                  background: C.brand, color: '#fff',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: C.shadowSm, transition: `background 0.15s ${C.ease}`, outline: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.brandText; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.brand; }}
              >
                <IcPlus />
              </button>
            </div>
          </div>

          {/* Buscador -- con tope de ancho: a lo ancho completo de la
              pantalla un campo de búsqueda estirado se ve raro. */}
          <div style={{ position: 'relative', marginBottom: 10, maxWidth: 420 }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
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
                ...inputStyle, paddingLeft: 36,
                background: C.fill, borderColor: 'transparent',
              }}
              onFocus={e => { e.target.style.borderColor = C.brand; e.target.style.background = C.surface; }}
              onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = C.fill; }}
            />
          </div>

          <FilterPills active={filter} onChange={setFilter} />
        </div>

        {/* Lista de pacientes -- grilla a lo ancho de toda la pantalla (antes
            era una columna angosta de 320px porque compartía el espacio con
            el expediente abierto al lado). */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {loading && (
            <div style={{ padding: '32px 0', textAlign: 'center', color: C.inkMute, fontSize: 15 }}>
              Cargando…
            </div>
          )}

          {!loading && filteredList.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 4 }}>
              {filteredList.map(p => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  isSelected={false}
                  onClick={() => setPatSeleccionado(p)}
                  onArchivar={handleArchivar}
                  onEliminar={setPacienteAEliminar}
                />
              ))}
            </div>
          )}

          {!loading && filteredList.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: C.inkMute, fontSize: 15 }}>
              No se encontraron pacientes.
            </div>
          )}
        </div>

        {/* Footer con contador */}
        <div style={{
          padding: '10px 16px',
          borderTop: `1px solid ${C.border}`,
          fontSize: 13, color: C.inkMute, fontFamily: C.font,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {filteredList.length} paciente{filteredList.length !== 1 ? 's' : ''}
        </div>
      </div>

      {showModal && <NewPatientModal onClose={() => setShowModal(false)} onSave={handleSave} patientsList={patientsList} />}
      {showImportModal && <ImportarPacientesModal onClose={() => setShowImportModal(false)} onImportar={importarPacientes} patientsList={patientsList} />}
      {showExportModal && <ExportarPacientesModal onClose={() => setShowExportModal(false)} patientsList={patientsList} />}
      {pacienteAEliminar && (
        <ConfirmDeleteModal
          titulo="Eliminar ficha de paciente"
          mensaje={`Se va a borrar para siempre a "${pacienteAEliminar.name}": su ficha, historia clínica, odontograma, órdenes de laboratorio y tratamiento de ortodoncia (si tenía). Esta acción no se puede deshacer.`}
          nombreConfirmacion={pacienteAEliminar.name}
          confirmando={eliminando}
          onConfirm={handleEliminarDefinitivo}
          onClose={() => setPacienteAEliminar(null)}
        />
      )}
    </>
  );
}