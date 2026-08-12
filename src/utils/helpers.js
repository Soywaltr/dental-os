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

// Resumen de pagos de un tratamiento de ortodoncia. No hay un costo total
// pactado de antemano: el histórico se va acumulando control a control (cuota
// inicial + cuotas mensuales + extras), y lo adeudado se calcula contra lo que
// debería estar cobrado a la fecha: la inicial una sola vez, más una cuota por
// mes cumplido. Compartida entre Ortodoncia.jsx (detalle del paciente) y
// Dashboard.jsx (deuda consolidada de toda la clínica).
export const resumenPagosOrtodoncia = (pagos, fechaInicio) => {
  const abonos = pagos?.abonos || [];
  const acumulado = abonos.reduce((s, a) => s + (Number(a.monto) || 0), 0);
  // `costo_total` es el nombre viejo del campo, se lee por compatibilidad.
  const pagoInicial = Number(pagos?.pago_inicial || pagos?.costo_total) || 0;
  const cuota = Number(pagos?.cuota_mensual) || 0;

  let esperado = null, deuda = null, meses = null;
  if (fechaInicio && (pagoInicial > 0 || cuota > 0)) {
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    if (!isNaN(inicio.getTime())) {
      meses = Math.max(0, Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
      esperado = pagoInicial + meses * cuota;
      deuda = Math.max(0, esperado - acumulado);
    }
  }
  return { acumulado, pagoInicial, cuota, esperado, deuda, meses, abonos };
};

// Tinte por nombre para barras de tratamiento / categoría de gasto.
//
// Antes eran 5 tonos distintos (violeta, ámbar, azul, verde, rojo). Se cambió a
// una escala MONOCROMÁTICA de un solo tono por dos razones:
//
// 1. El diseño es monocromático con el violeta como único acento; barras de
//    cinco colores lo contradicen y meten ruido.
// 2. Esa paleta no pasaba la validación: con el acento nuevo quedaban dos
//    violetas a ΔE 6.5 (indistinguibles), y ninguna combinación de 5 tonos
//    llegó al piso de ΔE 15 en todos los pares. Con más de ~4 series, lo
//    correcto no es inventar tonos sino apoyarse en otra codificación.
//
// Cada barra ya lleva su nombre escrito al lado, así que la identidad la
// carga la etiqueta, no el color: el tono sólo aporta variación visual. Se
// mantiene el hash por nombre para que una misma categoría conserve siempre
// su mismo paso, en cualquier vista.
const PASOS_TINTE = [0.95, 0.72, 0.52, 0.36, 0.24];
export const CAT_COLORS = PASOS_TINTE.map(
  a => `color-mix(in srgb, #729DEE ${Math.round(a * 100)}%, #F5F5F5)`
);
export const colorPorNombre = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CAT_COLORS[hash % CAT_COLORS.length];
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