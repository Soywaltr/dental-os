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

export const sc = s => s === 'confirmado' || s === 'pagado' || s === 'completado' ? { bg: '#dcfce7', c: '#16a34a' } : s === 'nuevo' || s === 'parcial' || s === 'en_curso' ? { bg: '#fef3c7', c: '#d97706' } : s === 'pendiente' ? { bg: '#fee2e2', c: RJ } : { bg: MT, c: P };

export const getSurfs = n => n % 10 <= 3 ? ['I', 'L', 'V', 'M', 'D'] : ['O', 'L', 'V', 'M', 'D'];
export const isMol = n => n % 10 >= 6; 
export const isPM = n => n % 10 >= 4 && n % 10 <= 5;
export const gt = id => TOOLS.find(t => t.id === id) || TOOLS[0];

export const getPreamble = (p) => {
  if (!p) return "";
  const isMinor = parseInt(p.age) < 18;
  if (isMinor) {
    return `Yo ${p.apoderado || '...................................................'} con DNI No. ${p.apoderado_dni || '................'} , mayor de edad, y con domicilio en ${p.apoderado_direccion || p.direccion || '...................................................'}, en calidad de representante legal del paciente menor de edad ${p.name || '...................................................'}.`;
  } else {
    return `Yo ${p.name || '...................................................'} (como paciente), con DNI No. ${p.doc || '................'}, mayor de edad, y con domicilio en ${p.direccion || '...................................................'}.`;
  }
};