// src/utils/helpers.js
import { MT, P, RJ, TOOLS } from './constants';

export const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
};

export const ini = n => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export const findPatientByDoc = (list, doc) => {
  if (!doc?.trim()) return null;
  return list.find(p => p.doc === doc) || null;
};

export const findPatientByName = (list, name) => {
  const norm = normalizarTexto(name);
  return list.find(p => normalizarTexto(p.name) === norm) || null;
};

// Convierte un teléfono guardado (con o sin código de país/espacios) al formato que espera wa.me
export const toWhatsAppNumber = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9) return `51${digits}`; // celular peruano sin código de país
  return digits;
};

export const sc = s => s === 'confirmado' || s === 'pagado' || s === 'completado' ? { bg: '#dcfce7', c: '#16a34a' } : s === 'nuevo' || s === 'parcial' || s === 'en_curso' ? { bg: '#fef3c7', c: '#d97706' } : s === 'pendiente' ? { bg: '#fee2e2', c: RJ } : { bg: MT, c: P };

export const getSurfs = n => n % 10 <= 3 ? ['I', 'L', 'V', 'M', 'D'] : ['O', 'L', 'V', 'M', 'D'];
export const isMol = n => n % 10 >= 6;
export const isPM = n => n % 10 >= 4 && n % 10 <= 5;

export const BAD_SUFFIX = '::bad';
export const isBad = v => typeof v === 'string' && v.endsWith(BAD_SUFFIX);
export const baseId = v => isBad(v) ? v.slice(0, -BAD_SUFFIX.length) : v;

export const gt = id => TOOLS.find(t => t.id === baseId(id)) || TOOLS[0];

// Estado del paciente, derivado de fechas reales (no un campo fijo que nunca se actualiza):
// Nuevo = registrado hace ≤30 días · Inactivo = sin cita hace más de 6 meses.
const DIAS_NUEVO = 30;
const MESES_INACTIVO = 6;

export const estadoPaciente = (p) => {
  const hoy = new Date();

  if (p.created_at) {
    const dias = (hoy - new Date(p.created_at)) / 86400000;
    if (dias >= 0 && dias <= DIAS_NUEVO) return 'nuevo';
  }

  if (p.fecha) {
    const meses = (hoy - new Date(p.fecha)) / (86400000 * 30);
    if (meses > MESES_INACTIVO) return 'inactivo';
  }

  return 'activo';
};

export const getPreamble = (p) => {
  if (!p) return "";
  const isMinor = parseInt(p.age) < 18;
  if (isMinor) {
    return `Yo ${p.apoderado || '...................................................'} con DNI No. ${p.apoderado_dni || '................'} , mayor de edad, y con domicilio en ${p.apoderado_direccion || p.direccion || '...................................................'}, en calidad de representante legal del paciente menor de edad ${p.name || '...................................................'}.`;
  } else {
    return `Yo ${p.name || '...................................................'} (como paciente), con DNI No. ${p.doc || '................'}, mayor de edad, y con domicilio en ${p.direccion || '...................................................'}.`;
  }
};