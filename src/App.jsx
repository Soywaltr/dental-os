import React, { useState, useRef, useEffect } from "react";
import { supabase } from './supabase';
import { gapi } from 'gapi-script';
import { useGoogleLogin } from '@react-oauth/google';
import Login from './Login';


const TODAS_NACIONES = [
  { n: "Perú", c: "+51", b: "🇵🇪" }, { n: "Colombia", c: "+57", b: "🇨🇴" }, { n: "Venezuela", c: "+58", b: "🇻🇪" },
  { n: "Ecuador", c: "+593", b: "🇪🇨" }, { n: "Argentina", c: "+54", b: "🇦🇷" }, { n: "Chile", c: "+56", b: "🇨🇱" },
  { n: "España", c: "+34", b: "🇪🇸" }, { n: "México", c: "+52", b: "🇲🇽" }, { n: "Estados Unidos", c: "+1", b: "🇺🇸" },
  { n: "Bolivia", c: "+591", b: "🇧🇴" }, { n: "Brasil", c: "+55", b: "🇧🇷" }, { n: "Costa Rica", c: "+506", b: "🇨🇷" },
  { n: "Guatemala", c: "+502", b: "🇬🇹" }, { n: "Honduras", c: "+504", b: "🇭🇳" }, { n: "Nicaragua", c: "+505", b: "🇳🇮" },
  { n: "Panamá", c: "+507", b: "🇵🇦" }, { n: "Paraguay", c: "+595", b: "🇵🇾" }, { n: "Rep. Dominicana", c: "+1", b: "🇩🇴" },
  { n: "Uruguay", c: "+598", b: "🇺🇾" }, { n: "Italia", c: "+39", b: "🇮🇹" }
].sort((a, b) => a.n.localeCompare(b.n));

const labelStyleDoc = {
  fontSize: '12px',
  fontWeight: '500',
  color: '#64748b', // Gris azulado elegante
  display: 'block',
  marginBottom: '6px'
};

const inputStyleDoc = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '6px',
  border: '1px solid #cbd5e1', // Borde gris claro premium
  fontSize: '13.5px',
  color: '#334155',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  height: '42px',
  transition: 'border-color 0.2s ease',
};

// Dibuja un título de sección estilo Doctocliq
const SectionHeader = ({ title }) => (
  <div style={{ color: '#0087b3', fontSize: '14px', fontWeight: 700, marginTop: '35px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    {title} <span style={{ fontSize: '18px', cursor: 'pointer' }}>⌃</span>
  </div>
);

// Dibuja un Select con diseño perfecto y nota opcional
const renderSelectOrto = (label, field, options, hasNote = false) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={labelStyleDoc}>{label}</label>
    <select value={ortoForm[field] || ''} onChange={e => handleOrto(field, e.target.value)} style={inputStyleDoc}>
      <option value="">Seleccionar</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    {hasNote && (
      <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, fontStyle: 'italic', color: '#64748b', fontSize: '12.5px', height: '36px', marginTop: '4px' }} />
    )}
  </div>
);

// Dibuja la fila del examen intraoral
const renderIntraRow = (label, field, opts) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: '12px',
    gap: '15px'
  }}>
    {/* 1. ETIQUETA (Ancho fijo suficiente) */}
    <div style={{
      width: '180px',
      minWidth: '180px',
      fontSize: '13px',
      color: '#475569',
      fontWeight: 500
    }}>
      {label}
    </div>

    {/* 2. CONTENEDOR DE CHECKBOXES (Se expande según el contenido) */}
    <div style={{
      display: 'flex',
      gap: '15px',
      flex: '1', // 👈 Toma todo el espacio disponible del centro
      flexWrap: 'nowrap',
      alignItems: 'center'
    }}>
      {opts.map(opt => (
        <label key={opt} style={{
          fontSize: '12.5px',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          whiteSpace: 'nowrap' // 👈 Evita que el texto de la opción se rompa
        }}>
          <input
            type="checkbox"
            checked={ortoForm[`${field}_${opt}`] || false}
            onChange={e => handleOrto(`${field}_${opt}`, e.target.checked)}
            style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px' }}
          />
          {opt}
        </label>
      ))}
    </div>

    {/* 3. CAJA DE NOTAS (Tamaño reducido y fijo al final) */}
    <div style={{ width: '220px', minWidth: '220px' }}>
      <input
        placeholder="Nota..."
        value={ortoForm[`${field}_nota`] || ''}
        onChange={e => handleOrto(`${field}_nota`, e.target.value)}
        style={{
          ...inputStyleDoc,
          height: '32px',
          width: '100%',
          fontSize: '12px',
          padding: '4px 10px',
          background: '#fff'
        }}
      />
    </div>
  </div>
);

// 👉 FUNCIÓN AYUDANTE MEJORADA: Quita tildes Y colapsa múltiples espacios

const normalizarTexto = (texto) => {

  if (!texto) return '';

  return texto

    .normalize("NFD")             // Separa las letras de las tildes

    .replace(/[\u0300-\u036f]/g, "") // Borra las tildes

    .replace(/\s+/g, " ")         // 🪄 MAGIA: Convierte 2, 3 o más espacios seguidos en un solo espacio

    .toLowerCase()                // Lo pasa a minúsculas

    .trim();                      // Quita los espacios al principio y al final

};



const CLIENT_ID = "849091491290-t1h1q1p8j40rhndjlosh0e0dsokm5907.apps.googleusercontent.com";

const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];

const SCOPES = "https://www.googleapis.com/auth/calendar.events";



const P = '#0D5C6B', PD = '#0A4352', DN = '#0D2B2B', LT = '#F2FAF9', MT = '#E2F2F0', BD = '#C2DFDD', MU = '#7AAFAD', GL = '#C4955A', WA = '#25D366', AZ = '#1e40af', RJ = '#dc2626';



const ini = n => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const sc = s => s === 'confirmado' || s === 'pagado' || s === 'completado' ? { bg: '#dcfce7', c: '#16a34a' } : s === 'nuevo' || s === 'parcial' || s === 'en_curso' ? { bg: '#fef3c7', c: '#d97706' } : s === 'pendiente' ? { bg: '#fee2e2', c: RJ } : { bg: MT, c: P };



const PATIENTS = [

  { id: 1, name: 'María López', age: 32, phone: '+51 987 654 321', email: 'maria@gmail.com', tag: 'activo', treatment: 'Ortodoncia', nextVisit: 'Hoy 9:00', since: '2023', balance: 0, doc: '72345678', blood: 'O+', allergies: 'Ninguna', meds: 'Ninguno' },

  { id: 2, name: 'Juan Ramírez', age: 28, phone: '+51 976 543 210', email: 'juan@gmail.com', tag: 'nuevo', treatment: 'Limpieza', nextVisit: 'Hoy 10:30', since: '2025', balance: 80, doc: '87654321', blood: 'A+', allergies: 'Penicilina', meds: 'Ninguno' },

  { id: 3, name: 'Ana Solís', age: 45, phone: '+51 965 432 109', email: 'ana@gmail.com', tag: 'activo', treatment: 'Blanqueamiento', nextVisit: 'Hoy 12:00', since: '2022', balance: 0, doc: '23456789', blood: 'B+', allergies: 'Ninguna', meds: 'Enalapril' },

  { id: 4, name: 'Carlos Vega', age: 38, phone: '+51 954 321 098', email: 'carlos@gmail.com', tag: 'activo', treatment: 'Implante', nextVisit: 'Mar 9:00', since: '2021', balance: 350, doc: '34567890', blood: 'AB-', allergies: 'Ibuprofeno', meds: 'Ninguno' },

  { id: 5, name: 'Lucía Torres', age: 22, phone: '+51 943 210 987', email: 'lucia@gmail.com', tag: 'activo', treatment: 'Carillas', nextVisit: 'Mié 11:00', since: '2024', balance: 0, doc: '45678901', blood: 'O-', allergies: 'Ninguna', meds: 'Ninguno' },

  { id: 6, name: 'Roberto Paz', age: 55, phone: '+51 932 109 876', email: 'roberto@gmail.com', tag: 'activo', treatment: 'Corona CMC', nextVisit: 'Jue 3:00', since: '2020', balance: 120, doc: '56789012', blood: 'A-', allergies: 'Ninguna', meds: 'Metformina' },

];

const TODAY = [

  { time: '9:00', patient: 'María López', pid: 1, treat: 'Control ortodoncia', dur: 30, status: 'confirmado', av: 'ML', cost: 80 },

  { time: '10:30', patient: 'Juan Ramírez', pid: 2, treat: 'Limpieza y profilaxis', dur: 45, status: 'nuevo', av: 'JR', cost: 60 },

  { time: '12:00', patient: 'Ana Solís', pid: 3, treat: 'Blanqueamiento', dur: 60, status: 'confirmado', av: 'AS', cost: 180 },

  { time: '15:00', patient: 'Karla Ríos', pid: null, treat: 'Consulta inicial', dur: 30, status: 'pendiente', av: 'KR', cost: 30 },

  { time: '16:30', patient: 'Miguel Paredes', pid: null, treat: 'Extracción simple', dur: 45, status: 'confirmado', av: 'MP', cost: 90 },

];

const WEEK_APTS = {

  0: [{ h: 9, p: 'María L.', t: 'Ortodoncia', col: P }, { h: 10, p: 'Juan R.', t: 'Limpieza', col: '#0a7a4a' }, { h: 12, p: 'Ana S.', t: 'Blanqueamiento', col: GL }, { h: 15, p: 'Karla R.', t: 'Consulta', col: MU }, { h: 16, p: 'Miguel P.', t: 'Extracción', col: P }],

  1: [{ h: 9, p: 'Carlos V.', t: 'Implante', col: P }, { h: 11, p: 'Diego M.', t: 'Control', col: '#0a7a4a' }, { h: 15, p: 'Rosa L.', t: 'Limpieza', col: MU }],

  2: [{ h: 10, p: 'Fernanda C.', t: 'Consulta', col: P }, { h: 11, p: 'Lucía T.', t: 'Carillas', col: GL }, { h: 14, p: 'Pedro N.', t: 'Corona', col: P }],

  3: [{ h: 9, p: 'Ana S.', t: 'Control', col: '#0a7a4a' }, { h: 15, p: 'Roberto P.', t: 'Corona', col: GL }],

  4: [{ h: 10, p: 'Fernanda C.', t: 'Consulta', col: P }, { h: 16, p: 'Elena R.', t: 'Blanqueamiento', col: P }],

  5: [{ h: 9, p: 'Juan R.', t: 'Control', col: '#0a7a4a' }],

};

const INVOICES = [

  { id: 'F-0042', patient: 'María López', pid: 1, treat: 'Control ortodoncia', date: '10 Jun 2025', total: 80, paid: 80, status: 'pagado', method: 'Yape' },

  { id: 'F-0041', patient: 'Carlos Vega', pid: 4, treat: 'Implante dental', date: '15 May 2025', total: 1200, paid: 850, status: 'parcial', method: 'Transferencia' },

  { id: 'F-0040', patient: 'Roberto Paz', pid: 6, treat: 'Corona CMC', date: '20 May 2025', total: 450, paid: 330, status: 'parcial', method: 'Efectivo' },

  { id: 'F-0039', patient: 'Ana Solís', pid: 3, treat: 'Blanqueamiento', date: '01 Jun 2025', total: 180, paid: 180, status: 'pagado', method: 'Yape' },

  { id: 'F-0038', patient: 'Diego M.', pid: null, treat: 'Endodoncia', date: '28 Abr 2025', total: 320, paid: 0, status: 'pendiente', method: '—' },

  { id: 'F-0037', patient: 'Lucía Torres', pid: 5, treat: 'Carillas porcelana', date: '01 May 2025', total: 600, paid: 600, status: 'pagado', method: 'Transferencia' },

];

const LAB_ORDERS = [

  { id: 'L-021', patient: 'Roberto Paz', type: 'Corona CMC', tooth: '26', lab: 'Laboratorio Dental Cruz', status: 'en_proceso', sent: '05 Jun', eta: '12 Jun', cost: 180 },

  { id: 'L-020', patient: 'Carlos Vega', type: 'Implante abutment', tooth: '36', lab: 'ProDental Trujillo', status: 'listo', sent: '28 May', eta: '04 Jun', cost: 220 },

  { id: 'L-019', patient: 'Lucía Torres', type: 'Carillas porcelana x4', tooth: '12-22', lab: 'Laboratorio Dental Cruz', status: 'en_proceso', sent: '03 Jun', eta: '14 Jun', cost: 480 },

  { id: 'L-018', patient: 'María López', type: 'Retenedor Hawley', tooth: '—', lab: 'OrthoLab', status: 'entregado', sent: '20 May', eta: '27 May', cost: 90 },

];

const TRATAMIENTOS_CAT = [

  { cat: 'Preventivo', items: ['Consulta / Diagnóstico', 'Limpieza y profilaxis', 'Radiografía periapical', 'Radiografía panorámica', 'Fluorización', 'Sellantes'] },

  { cat: 'Restaurador', items: ['Resina compuesta', 'Amalgama', 'Ionómero de vidrio', 'Incrustación metálica', 'Incrustación estética'] },

  { cat: 'Endodoncia', items: ['Tratamiento de conducto (1 raíz)', 'Tratamiento de conducto (2 raíces)', 'Tratamiento de conducto (3+ raíces)', 'Pulpectomía', 'Pulpotomía'] },

  { cat: 'Estética', items: ['Blanqueamiento clínico', 'Carillas de porcelana', 'Carillas de resina', 'Micropigmentación gingival'] },

  { cat: 'Cirugía', items: ['Extracción simple', 'Extracción compleja', 'Cirugía de tercero molar', 'Frenectomía'] },

  { cat: 'Prótesis', items: ['Corona completa metálica', 'Corona metal-cerámica', 'Corona jacket', 'Prótesis removible parcial', 'Prótesis total'] },

  { cat: 'Implantología', items: ['Implante dental', 'Implante + corona', 'Injerto óseo'] },

  { cat: 'Ortodoncia', items: ['Ortodoncia fija metálica', 'Ortodoncia fija estética', 'Alineadores', 'Control mensual ortodoncia', 'Retenedor'] },

];

const PRECIOS = {

  'Consulta / Diagnóstico': 30, 'Limpieza y profilaxis': 60, 'Radiografía periapical': 20, 'Radiografía panorámica': 45, 'Fluorización': 35, 'Sellantes': 25,

  'Resina compuesta': 80, 'Amalgama': 60, 'Ionómero de vidrio': 70, 'Incrustación metálica': 250, 'Incrustación estética': 300,

  'Tratamiento de conducto (1 raíz)': 280, 'Tratamiento de conducto (2 raíces)': 350, 'Tratamiento de conducto (3+ raíces)': 420, 'Pulpectomía': 180, 'Pulpotomía': 150,

  'Blanqueamiento clínico': 180, 'Carillas de porcelana': 350, 'Carillas de resina': 150, 'Micropigmentación gingival': 200,

  'Extracción simple': 90, 'Extracción compleja': 180, 'Cirugía de tercero molar': 280, 'Frenectomía': 200,

  'Corona completa metálica': 380, 'Corona metal-cerámica': 480, 'Corona jacket': 520, 'Prótesis removible parcial': 650, 'Prótesis total': 900,

  'Implante dental': 1200, 'Implante + corona': 1600, 'Injerto óseo': 800,

  'Ortodoncia fija metálica': 1800, 'Ortodoncia fija estética': 2400, 'Alineadores': 2800, 'Control mensual ortodoncia': 80, 'Retenedor': 90,

};

const WA_MSGS = [

  { id: 1, name: 'Juan Ramírez', time: 'Hace 5 min', msg: 'Hola doctora, ¿tienen cita para el viernes?', unread: 1, thread: [{ from: 'patient', txt: 'Hola doctora, ¿tienen cita para el viernes?', t: '15:01' }, { from: 'bot', txt: '¡Hola Juan! Soy el asistente de la Dra. Sol Vargas 😊 Claro que sí, tenemos disponibilidad el viernes. ¿Prefieres mañana o tarde?', t: '15:01' }] },

  { id: 2, name: 'Karla Ríos', time: 'Hace 12 min', msg: 'Confirmado, ahí estaré a las 3pm 🙌', unread: 0, thread: [{ from: 'bot', txt: 'Hola Karla, te recordamos que tienes cita mañana a las 3:00 pm con la Dra. Sol Vargas. ¿Confirmas asistencia?', t: '14:50' }, { from: 'patient', txt: 'Confirmado, ahí estaré a las 3pm 🙌', t: '14:55' }] },

  { id: 3, name: 'Elena Ríos', time: 'Ayer', msg: '¿Cuánto cuesta el blanqueamiento?', unread: 2, thread: [{ from: 'patient', txt: '¿Cuánto cuesta el blanqueamiento?', t: '10:22' }, { from: 'bot', txt: '¡Hola Elena! El blanqueamiento dental clínico tiene un costo de S/180 e incluye la sesión completa en consultorio. El resultado es inmediato y dura hasta 2 años con buenos cuidados. ¿Te gustaría agendar una consulta de evaluación gratuita?', t: '10:22' }, { from: 'patient', txt: 'Sí me interesa', t: 'Ayer' }, { from: 'bot', txt: '¡Perfecto! ¿Qué días y horarios tienes disponibles esta semana?', t: 'Ayer' }] },

];



// ─── FDI Odontogram ────────────────────────────────────────────────────

const UA = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];

const LA = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const UP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];

const LP = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const TNAME = { 18: '3M sup der', 17: '2M sup der', 16: '1M sup der', 15: '2P sup der', 14: '1P sup der', 13: 'C sup der', 12: 'IL sup der', 11: 'IC sup der', 21: 'IC sup izq', 22: 'IL sup izq', 23: 'C sup izq', 24: '1P sup izq', 25: '2P sup izq', 26: '1M sup izq', 27: '2M sup izq', 28: '3M sup izq', 31: 'IC inf izq', 32: 'IL inf izq', 33: 'C inf izq', 34: '1P inf izq', 35: '2P inf izq', 36: '1M inf izq', 37: '2M inf izq', 38: '3M inf izq', 48: '3M inf der', 47: '2M inf der', 46: '1M inf der', 45: '2P inf der', 44: '1P inf der', 43: 'C inf der', 42: 'IL inf der', 41: 'IC inf der' };

const getSurfs = n => n % 10 <= 3 ? ['I', 'L', 'V', 'M', 'D'] : ['O', 'L', 'V', 'M', 'D'];

const isMol = n => n % 10 >= 6; const isPM = n => n % 10 >= 4 && n % 10 <= 5;

const TOOLS = [

  { id: 'normal', lbl: 'Normal', col: '#f1f5f9', tc: '#475569', sig: '', cr: 'n', mk: '' },

  { id: 'caries', lbl: 'Caries', col: RJ, tc: '#fff', sig: 'CA', cr: 'r', mk: 'fill', g: 'r' },

  { id: 'r_t', lbl: 'Rest. temporal', col: '#f97316', tc: '#fff', sig: 'RT', cr: 'r', mk: 'outline', g: 'r' },

  { id: 'ct', lbl: 'Corona temporal', col: RJ, tc: '#fff', sig: 'CT', cr: 'r', mk: 'cr', g: 'r' },

  { id: 'frac', lbl: 'Fractura', col: RJ, tc: '#fff', sig: 'FR', cr: 'r', mk: 'frac', g: 'r' },

  { id: 'rr', lbl: 'Rem. Radicular', col: RJ, tc: '#fff', sig: 'RR', cr: 'r', mk: 'txt', g: 'r' },

  { id: 'r_r', lbl: 'Resina (R)', col: AZ, tc: '#fff', sig: 'R', cr: 'a', mk: 'fill', g: 'a' },

  { id: 'r_am', lbl: 'Amalgama (AM)', col: AZ, tc: '#fff', sig: 'AM', cr: 'a', mk: 'fill', g: 'a' },

  { id: 'r_iv', lbl: 'Ionómero (IV)', col: AZ, tc: '#fff', sig: 'IV', cr: 'a', mk: 'fill', g: 'a' },

  { id: 'r_im', lbl: 'Incrustación IM', col: AZ, tc: '#fff', sig: 'IM', cr: 'a', mk: 'fill', g: 'a' },

  { id: 'r_ie', lbl: 'Incrustación IE', col: AZ, tc: '#fff', sig: 'IE', cr: 'a', mk: 'fill', g: 'a' },

  { id: 'aus', lbl: 'Ausente', col: '#64748b', tc: '#fff', sig: 'A', cr: 'a', mk: 'x', g: 'a' },

  { id: 'cc', lbl: 'Corona CC', col: AZ, tc: '#fff', sig: 'CC', cr: 'a', mk: 'ca', g: 'a' },

  { id: 'cmc', lbl: 'Corona CMC', col: AZ, tc: '#fff', sig: 'CMC', cr: 'a', mk: 'ca', g: 'a' },

  { id: 'cj', lbl: 'Corona CJ', col: AZ, tc: '#fff', sig: 'CJ', cr: 'a', mk: 'ca', g: 'a' },

  { id: 'imp', lbl: 'Implante', col: AZ, tc: '#fff', sig: 'IMP', cr: 'a', mk: 'txt', g: 'a' },

  { id: 'tc', lbl: 'T. Conducto', col: AZ, tc: '#fff', sig: 'TC', cr: 'a', mk: 'root', g: 'a' },

  { id: 'pc', lbl: 'Pulpectomía', col: AZ, tc: '#fff', sig: 'PC', cr: 'a', mk: 'root', g: 'a' },

  { id: 'des', lbl: 'Desgaste DES', col: AZ, tc: '#fff', sig: 'DES', cr: 'a', mk: 'txt', g: 'a' },

  { id: 'ii', lbl: 'Impactación I', col: AZ, tc: '#fff', sig: 'I', cr: 'a', mk: 'txt', g: 'a' },

  { id: 'si', lbl: 'Semi-imp. SI', col: AZ, tc: '#fff', sig: 'SI', cr: 'a', mk: 'txt', g: 'a' },

  { id: 'm1', lbl: 'Movilidad M1', col: AZ, tc: '#fff', sig: 'M1', cr: 'a', mk: 'txt', g: 'a' },

  { id: 'dis', lbl: 'Discrómico', col: AZ, tc: '#fff', sig: 'DIS', cr: 'a', mk: 'txt', g: 'a' },

  { id: 'extraer', lbl: 'Por extraer', col: RJ, tc: '#fff', sig: 'EXT', cr: 'r', mk: 'txt', g: 'r' },

];

const gt = id => TOOLS.find(t => t.id === id) || TOOLS[0];

function ToothSVG({ num, upper, surfs = {}, active, onClick, w = 31 }) {
  // Escala aumentada (CH, RH y w)
  const W = w, CH = 20, RH = 22, TH = CH + RH, M = isMol(num), PM = isPM(num), cY = upper ? 0 : RH;
  const conds = Object.entries(surfs).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
  const dom = conds.length ? gt(conds[0][1]) : null;
  const cf = !dom ? '#f8fafc' : dom.cr === 'r' ? RJ + 'dd' : dom.mk === 'x' ? '#64748b22' : AZ + 'dd';

  // 👉 Lógica para detectar si la pieza está "Por extraer"
  const isExtraer = Object.values(surfs).some(s => s === 'extraer');

  const rp = upper
    ? M ? `M 2 ${CH} L ${W / 2 - 1} ${TH - 1} L ${W / 2 - 1} ${CH} Z M ${W / 2 + 1} ${CH} L ${W - 2} ${TH - 1} L ${W - 2} ${CH} Z` : `M 3 ${CH} L ${W / 2} ${TH - 1} L ${W - 3} ${CH} Z`
    : M ? `M 2 ${RH} L ${W / 2 - 1} 1 L ${W / 2 - 1} ${RH} Z M ${W / 2 + 1} ${RH} L ${W - 2} 1 L ${W - 2} ${RH} Z` : `M 3 ${RH} L ${W / 2} 1 L ${W - 3} ${RH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${TH}`} width={W} height={TH} onClick={onClick}
      style={{ display: 'block', cursor: 'pointer', transition: 'opacity .12s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '.72'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>

      {active && <rect x="0" y="0" width={W} height={TH} rx="4" fill={P + '33'} stroke={P} strokeWidth="2" />}

      {/* Raíz */}
      <path d={rp} fill="#f8fafc" stroke={active ? P : '#64748b'} strokeWidth={active ? 1.5 : .8} />

      {/* Corona */}
      <rect x={1} y={cY} width={W - 2} height={CH} rx="2" fill={cf} stroke={active ? P : '#64748b'} strokeWidth={active ? 1.5 : .8} />

      {cf === '#f8fafc' && (M || PM) && <>
        <line x1={1} y1={cY + CH * .45} x2={W - 1} y2={cY + CH * .45} stroke="#cbd5e1" strokeWidth=".8" />
        <line x1={W / 2} y1={cY} x2={W / 2} y2={cY + CH} stroke="#cbd5e1" strokeWidth=".8" />
      </>}

      {/* 🔴 NUEVA LÓGICA: X ROJA PARA "POR EXTRAER" */}
      {isExtraer && (
        <g style={{ pointerEvents: 'none' }}>
          <line x1="2" y1="2" x2={W - 2} y2={TH - 2} stroke={RJ} strokeWidth="3" strokeLinecap="round" />
          <line x1={W - 2} y1="2" x2="2" y2={TH - 2} stroke={RJ} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {/* Otros marcadores */}
      {dom?.mk === 'x' && <><line x1="2" y1="2" x2={W - 2} y2={TH - 2} stroke="#64748b" strokeWidth="2" /><line x1={W - 2} y1="2" x2="2" y2={TH - 2} stroke="#64748b" strokeWidth="2" /></>}
      {dom?.mk === 'ca' && <ellipse cx={W / 2} cy={cY + CH / 2} rx={(W - 4) / 2} ry={CH / 2 - 1} fill="none" stroke={AZ} strokeWidth="2" />}
      {dom?.mk === 'cr' && <ellipse cx={W / 2} cy={cY + CH / 2} rx={(W - 4) / 2} ry={CH / 2 - 1} fill="none" stroke={RJ} strokeWidth="2" />}
      {dom?.mk === 'frac' && <line x1="3" y1={cY + 2} x2={W - 3} y2={cY + CH - 2} stroke={RJ} strokeWidth="2" />}
      {dom?.mk === 'root' && <line x1={W / 2} y1={upper ? CH + 3 : 2} x2={W / 2} y2={upper ? TH - 2 : RH - 2} stroke={AZ} strokeWidth="2" />}
      {conds.length > 1 && <circle cx={W - 5} cy={4} r="3.5" fill={P} />}
    </svg>
  );
}

function OcclusalMap({ num, surfs, activeTool, onSurf, size = 160 }) {
  // Escala aumentada (size=160)
  const S = size, cx = S / 2, cy = S / 2, ir = S * .18, ob = S / 2 - 5;
  const sf0 = getSurfs(num)[0];
  const at = gt(activeTool);

  const ZONES = {
    [sf0]: `M ${cx - ir} ${cy - ir} L ${cx + ir} ${cy - ir} L ${cx + ir} ${cy + ir} L ${cx - ir} ${cy + ir} Z`,
    L: `M ${cx - ob} ${cy - ob} L ${cx + ob} ${cy - ob} L ${cx + ir} ${cy - ir} L ${cx - ir} ${cy - ir} Z`,
    V: `M ${cx - ob} ${cy + ob} L ${cx + ob} ${cy + ob} L ${cx + ir} ${cy + ir} L ${cx - ir} ${cy + ir} Z`,
    M: `M ${cx - ob} ${cy - ob} L ${cx - ir} ${cy - ir} L ${cx - ir} ${cy + ir} L ${cx - ob} ${cy + ob} Z`,
    D: `M ${cx + ob} ${cy - ob} L ${cx + ir} ${cy - ir} L ${cx + ir} ${cy + ir} L ${cx + ob} ${cy + ob} Z`
  };

  const CTR = { [sf0]: [cx, cy], L: [cx, 16], V: [cx, S - 16], M: [16, cy], D: [S - 16, cy] };

  return (
    /* Aumentamos el alto del viewBox a S + 20 para que el número de pieza no se corte */
    <svg viewBox={`0 0 ${S} ${S + 20}`} width={S} height={S + 20} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>

      {/* Recuadro base del diente */}
      <rect x="4" y="4" width={S - 8} height={S - 8} rx="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth=".7" />

      {/* Dibujo de las zonas (superficies) */}
      {Object.entries(ZONES).map(([sf, path]) => {
        const c = surfs[sf], t = gt(c), h = c && c !== 'normal';
        const fill = h ? (t.cr === 'r' ? RJ + 'cc' : AZ + 'cc') : '#f8fafc';
        return (
          <path key={sf} d={path} fill={fill} stroke="rgba(0,0,0,.1)" strokeWidth="1"
            style={{ cursor: 'pointer' }} onClick={() => onSurf(sf)}
            onMouseEnter={e => e.target.setAttribute('fill', at.col + '88')}
            onMouseLeave={e => e.target.setAttribute('fill', fill)}
          />
        );
      })}

      {/* 🔴 LÓGICA DE LA X ROJA: Se dibuja si alguna superficie tiene el estado 'extraer' */}
      {Object.values(surfs).some(s => s === 'extraer') && (
        <g style={{ pointerEvents: 'none' }}>
          <line x1="10" y1="10" x2={S - 10} y2={S - 10} stroke={RJ} strokeWidth="5" strokeLinecap="round" />
          <line x1={S - 10} y1="10" x2="10" y2={S - 10} stroke={RJ} strokeWidth="5" strokeLinecap="round" />
        </g>
      )}

      {/* Etiquetas de texto y denominación EXT con fondo rojo */}
      {Object.entries(CTR).map(([sf, [tx, ty]]) => {
        const c = surfs[sf], t = gt(c), h = c && c !== 'normal';
        const esExtraer = c === 'extraer';

        return (
          <g key={sf}>
            {/* Si es 'extraer', dibujamos un pequeño rectángulo de fondo rojo para el texto EXT */}
            {esExtraer && (
              <rect x={tx - 14} y={ty - 6} width="28" height="13" rx="2" fill={RJ} />
            )}
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={sf === sf0 ? 12 : 10}
              fontWeight="800" fill={esExtraer || h ? '#fff' : '#94a3b8'} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {esExtraer ? 'EXT' : (h && t.sig ? t.sig : sf)}
            </text>
          </g>
        );
      })}

      {/* Número de pieza dental corregido: separado de la línea inferior y más legible */}
      <text x={cx} y={S + 12} textAnchor="middle" fontSize="11" fill="#0D5C6B" fontWeight="900">
        {num}
      </text>
    </svg>
  );
}


// ─── MÓDULOS ───────────────────────────────────────────────────────────

function Stat({ label, value, sub, col, onClick }) {

  return (

    <div onClick={onClick} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: '13px 17px', flex: 1, minWidth: 115, cursor: onClick ? 'pointer' : 'default' }}

      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = P)}

      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = BD)}>

      <div style={{ fontSize: 10, color: MU, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>{label}</div>

      <div style={{ fontSize: 22, fontWeight: 800, color: col || DN, lineHeight: 1 }}>{value}</div>

      {sub && <div style={{ fontSize: 10, color: '#22a55a', marginTop: 3 }}>{sub}</div>}

    </div>

  );

}



function Dashboard({ setView, setSelPat }) {

  return (

    <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

      <div style={{ display: 'flex', gap: 11, marginBottom: 18, flexWrap: 'wrap' }}>

        <Stat label="Citas hoy" value="5" sub="↑ 2 vs ayer" onClick={() => setView('agenda')} />

        <Stat label="Pacientes" value="340" sub="↑ 12 este mes" onClick={() => setView('pacientes')} />

        <Stat label="Ingresos mes" value="S/4,820" sub="↑ 18%" col={P} onClick={() => setView('caja')} />

        <Stat label="Por cobrar" value="S/750" col={GL} onClick={() => setView('caja')} />

        <Stat label="Lab. pendiente" value="2" col={MU} onClick={() => setView('laboratorio')} />

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>

        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 17 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>

            <div style={{ fontWeight: 700, fontSize: 13, color: DN }}>Citas de hoy — Lun 7 Jul</div>

            <span onClick={() => setView('agenda')} style={{ fontSize: 11, color: P, cursor: 'pointer', fontWeight: 600 }}>Agenda completa →</span>

          </div>

          {TODAY.map((a, i) => {

            const b = sc(a.status);

            return (

              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < TODAY.length - 1 ? `1px solid ${MT}` : 'none' }}>

                <div style={{ fontSize: 10, fontWeight: 700, color: MU, minWidth: 40 }}>{a.time}</div>

                <div style={{ width: 28, height: 28, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color: P, flexShrink: 0 }}>{a.av}</div>

                <div style={{ flex: 1, minWidth: 0 }}>

                  <div style={{ fontSize: 12, fontWeight: 600, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patient}</div>

                  <div style={{ fontSize: 10, color: MU }}>{a.treat} · {a.dur}min · S/{a.cost}</div>

                </div>

                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: b.bg, color: b.c, whiteSpace: 'nowrap' }}>{a.status}</span>

              </div>

            );

          })}

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 15 }}>

            <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 10 }}>Acciones rápidas</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

              {[['◫ Nueva cita', 'agenda'], ['◉ Nuevo paciente', 'pacientes'], ['◆ Registrar pago', 'caja'], ['◎ WhatsApp IA', 'whatsapp'], ['◌ Laboratorio', 'laboratorio'], ['⊞ Reportes', 'reportes']].map(([l, v], i) => (

                <div key={i} onClick={() => setView(v)} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 8, padding: '9px 8px', cursor: 'pointer', textAlign: 'center', fontSize: 11, fontWeight: 600, color: DN }}

                  onMouseEnter={e => { e.currentTarget.style.background = MT; e.currentTarget.style.color = P }}

                  onMouseLeave={e => { e.currentTarget.style.background = LT; e.currentTarget.style.color = DN }}>{l}</div>

              ))}

            </div>

          </div>

          <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 15 }}>

            <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 10 }}>Saldos pendientes</div>

            {PATIENTS.filter(p => p.balance > 0).map((p, i) => (

              <div key={i} onClick={() => { setSelPat(p); setView('historia'); }}

                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < PATIENTS.filter(x => x.balance > 0).length - 1 ? `1px solid ${MT}` : 'none', cursor: 'pointer' }}>

                <div style={{ width: 26, height: 26, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: P, flexShrink: 0 }}>{ini(p.name)}</div>

                <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: DN }}>{p.name}</div>

                <div style={{ fontSize: 11, fontWeight: 700, color: GL }}>S/{p.balance}</div>

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  );

}

// 👉 COMPONENTE UNIVERSAL: MODAL NUEVA CITA / NUEVO PACIENTE
function ModalNuevaCita({ onClose, onSave, listaPacientes, modo = 'cita' }) {
  const [form, setForm] = useState({
    doc: '',
    paciente: '',
    celular: '',
    fecha: '',
    hora: '',
    motivo: ''
  });

  // Ayudante para comparar nombres sin tildes ni mayúsculas
  const normalizar = (t) => t ? t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

  // 1. Lógica al escribir DNI
  const handleDocChange = (val) => {
    if (!val || val.trim() === "") {
      setForm({ ...form, doc: '', paciente: '', celular: '' });
      return;
    }
    const existente = listaPacientes.find(p => p.doc === val);
    if (existente) {
      setForm({ ...form, doc: val, paciente: existente.name, celular: existente.phone || '' });
    } else {
      setForm({ ...form, doc: val, paciente: '', celular: '' });
    }
  };

  // 2. Lógica al escribir o seleccionar Nombre
  const handleNombreChange = (val) => {
    const normIngresado = normalizar(val);
    const existente = listaPacientes.find(p => normalizar(p.name) === normIngresado);
    if (existente) {
      setForm({ ...form, paciente: existente.name, doc: existente.doc || '', celular: existente.phone || '' });
    } else {
      setForm({ ...form, paciente: val });
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();

    // Validación según el modo
    if (modo === 'cita') {
      if (!form.paciente || !form.fecha || !form.hora) {
        alert("Por favor completa al menos el Nombre, la Fecha y la Hora de la cita.");
        return;
      }
    } else {
      if (!form.paciente || !form.doc) {
        alert("Por favor completa al menos el Nombre y el DNI del paciente.");
        return;
      }
    }

    onSave(form);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 25, borderRadius: 16, width: 420, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#0D5C6B', marginBottom: 20 }}>
          {modo === 'cita' ? 'Agendar Nueva Cita' : 'Registrar Nuevo Paciente'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* CAMPO INTELIGENTE DNI */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: '#0D5C6B' }}>DNI / CE (Para buscar o crear paciente)</label>
            <input
              value={form.doc}
              onChange={e => handleDocChange(e.target.value)}
              placeholder="Ej: 72345678"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '2px solid #0D5C6B', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
            />
          </div>

          {/* CAMPO NOMBRE CON DATALIST */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Paciente (Nombre Completo)</label>
            <input
              list="lista-pacientes-modal"
              value={form.paciente}
              onChange={e => handleNombreChange(e.target.value)}
              placeholder="Escribe o selecciona un paciente..."
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
            />
            <datalist id="lista-pacientes-modal">
              {listaPacientes.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>

          {/* CAMPO CELULAR */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Celular / WhatsApp</label>
            <input
              value={form.celular}
              onChange={e => setForm({ ...form, celular: e.target.value })}
              placeholder="Ej: 990711528"
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
            />
          </div>

          {/* 🔴 CAMPOS EXCLUSIVOS DE CITA (Se ocultan si el modo es "paciente") */}
          {modo === 'cita' && (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={e => setForm({ ...form, fecha: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none', background: '#fff' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Hora</label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={e => setForm({ ...form, hora: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none', background: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Motivo de consulta</label>
                <input
                  value={form.motivo}
                  onChange={e => setForm({ ...form, motivo: e.target.value })}
                  placeholder="Ej: Evaluación inicial"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', marginTop: 4, outline: 'none' }}
                />
              </div>
            </>
          )}

        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 12, border: 'none', background: '#f1f5f9', borderRadius: 8, cursor: 'pointer', fontWeight: 700, color: '#64748b' }}>Cancelar</button>
          <button onClick={onSubmit} style={{ flex: 1, padding: 12, background: '#0D5C6B', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
            {modo === 'cita' ? 'Crear Cita' : 'Guardar Paciente'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Agenda() {
  const hours = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('Semana');

  const [showModalCita, setShowModalCita] = useState(false);
  const [datosTemp, setDatosTemp] = useState(null);

  const [googleToken, setGoogleToken] = useState(() => localStorage.getItem('google_access_token'));

  const [weekApts, setWeekApts] = useState([[], [], [], [], [], []]);
  const [allApts, setAllApts] = useState([]);
  const [listaPacientes, setListaPacientes] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // 1. CARGAR DATOS
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('pacientes').select('*');
      if (error) { console.error("Error cargando Supabase:", error); return; }

      let externalGoogleApts = [];
      if (googleToken) {
        try {
          const timeMin = new Date(); timeMin.setDate(timeMin.getDate() - 30);
          const timeMax = new Date(); timeMax.setDate(timeMax.getDate() + 60);

          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true`, {
            headers: { 'Authorization': `Bearer ${googleToken}` }
          });

          if (res.ok) {
            const gData = await res.json();
            externalGoogleApts = (gData.items || [])
              .filter(gEvent => !data.some(dbCita => dbCita.google_event_id === gEvent.id))
              .map(gEvent => {
                if (!gEvent.start || !gEvent.start.dateTime) return null;
                // 👉 CORRECCIÓN FECHAS GOOGLE
                const dateParts = gEvent.start.dateTime.split('T');
                const timeStr = dateParts[1].substring(0, 5);
                return {
                  id: gEvent.id,
                  google_event_id: gEvent.id,
                  isGoogleOnly: true,
                  name: gEvent.summary || 'Cita Google',
                  doc: '',
                  phone: '',
                  reason: gEvent.description || 'Agendada desde Google Calendar',
                  fecha: dateParts[0],
                  hora_cita: timeStr,
                  tag: 'google',
                  col: '#6366f1'
                };
              }).filter(Boolean);
          } else if (res.status === 401) {
            localStorage.removeItem('google_access_token');
            setGoogleToken(null);
          }
        } catch (e) { console.error("Error conectando a Google:", e); }
      }

      const combinedData = [...data, ...externalGoogleApts];
      setAllApts(combinedData);

      const unicos = [];
      const nombresVistos = new Set();
      data.forEach(p => {
        if (!nombresVistos.has(p.name)) {
          nombresVistos.add(p.name);
          unicos.push({ name: p.name, phone: p.phone, id: p.id, doc: p.doc });
        }
      });
      setListaPacientes(unicos);

      // 👉 CORRECCIÓN ABSOLUTA LÓGICA DE SEMANA Y ZONA HORARIA
      const tempApts = [[], [], [], [], [], [], []]; // Ahora de Lunes a Domingo para evitar desbordes

      const startOfWeek = new Date(currentDate);
      startOfWeek.setHours(0, 0, 0, 0);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1)); // Lunes

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
      endOfWeek.setHours(23, 59, 59, 999);

      // Generar strings de los días de la semana actual para comparación exacta
      const weekDatesStr = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        // Formato YYYY-MM-DD local
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });

      combinedData.forEach(p => {
        if (p.fecha && p.hora_cita) {
          // Buscamos si la fecha exacta en String existe en nuestra semana
          const dayIndex = weekDatesStr.indexOf(p.fecha);

          if (dayIndex !== -1) {
            tempApts[dayIndex].push({
              ...p,
              p: p.name,
              t: p.treatment || p.reason,
              h: parseInt(p.hora_cita.split(':')[0], 10), // Hora para agrupar
              col: p.isGoogleOnly ? '#6366f1' : (p.tag === 'nuevo' ? '#0D5C6B' : '#e11d48') // Rojo para pacientes que ya existen (tu rosado/rojo)
            });
          }
        }
      });
      setWeekApts(tempApts);
    };

    fetchData();
  }, [currentDate, view, googleToken]);

  // 2. NAVEGACIÓN
  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === 'Mensual') next.setMonth(currentDate.getMonth() + 1);
    else if (view === 'Semana') next.setDate(currentDate.getDate() + 7);
    else next.setDate(currentDate.getDate() + 1);
    setCurrentDate(next);
  };

  const handlePrev = () => {
    const prev = new Date(currentDate);
    if (view === 'Mensual') prev.setMonth(currentDate.getMonth() - 1);
    else if (view === 'Semana') prev.setDate(currentDate.getDate() - 7);
    else prev.setDate(currentDate.getDate() - 1);
    setCurrentDate(prev);
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const day = start.getDay();
    start.setDate(1 + ((day === 0 ? -6 : 1) - day));
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setHours(12, 0, 0, 0); // Truco para evitar saltos por DST (Horario de Verano)
    const day = start.getDay();
    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  };

  const displayDays = view === 'Semana' ? getWeekDays() : view === 'Día' ? [currentDate] : getMonthDays();

  // 3. LOGICA GOOGLE CALENDAR & GUARDAR
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      localStorage.setItem('google_access_token', tokenResponse.access_token);
      setGoogleToken(tokenResponse.access_token);
      if (datosTemp) {
        await enviarAGoogleCalendar(tokenResponse.access_token, datosTemp);
        setDatosTemp(null);
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
  });

  const handleGuardarCita = (datosCita) => {
    const isOccupied = allApts.some(cita => cita.fecha === datosCita.fecha && cita.hora_cita === datosCita.hora);

    if (isOccupied) {
      alert("⚠️ Ese horario ya está ocupado. Por favor, elige otra fecha u hora para la cita.");
      return;
    }

    if (googleToken) enviarAGoogleCalendar(googleToken, datosCita);
    else { setDatosTemp(datosCita); login(); }
  };

  const enviarAGoogleCalendar = async (accessToken, cita) => {
    try {
      const startDateTime = `${cita.fecha}T${cita.hora}:00-05:00`;
      const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000);
      const endDateTime = endDate.toISOString();

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `${cita.paciente} - ${cita.motivo}`,
          description: `Celular: ${cita.celular} | DNI: ${cita.doc}`,
          start: { dateTime: startDateTime }, end: { dateTime: endDateTime }
        })
      });

      if (!response.ok) throw new Error("Error al crear evento en Google");
      const { id: googleEventId } = await response.json();

      let pacienteEncontrado = null;
      const docLimpio = cita.doc ? cita.doc.trim() : '';
      const nombreLimpio = cita.paciente ? cita.paciente.trim() : '';

      if (docLimpio !== '') {
        const { data: porDoc } = await supabase.from('pacientes').select('id').eq('doc', docLimpio).limit(1);
        if (porDoc && porDoc.length > 0) {
          pacienteEncontrado = porDoc[0];
        }
      }

      if (pacienteEncontrado) {
        await supabase
          .from('pacientes')
          .update({
            fecha: cita.fecha,
            hora_cita: cita.hora,
            reason: cita.motivo,
            google_event_id: googleEventId,
            name: nombreLimpio,
            phone: cita.celular ? cita.celular : undefined
          })
          .eq('id', pacienteEncontrado.id);
      } else {
        await supabase
          .from('pacientes')
          .insert([{
            name: nombreLimpio,
            doc: docLimpio,
            phone: cita.celular,
            reason: cita.motivo,
            fecha: cita.fecha,
            hora_cita: cita.hora,
            tag: 'nuevo',
            google_event_id: googleEventId
          }]);
      }

      alert("¡Cita agendada correctamente!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al guardar la cita.");
    }
  };

  // 4. LÓGICA DE EDICIÓN
  const handleSaveEdit = async () => {
    const isOccupied = allApts.some(cita =>
      cita.id !== selectedCita.id &&
      cita.fecha === selectedCita.fecha &&
      cita.hora_cita === selectedCita.hora_cita
    );

    if (isOccupied) {
      alert("⚠️ Ese horario ya está ocupado por otra cita. Por favor, elige otra fecha u hora.");
      return;
    }

    setSavingEdit(true);

    if (!selectedCita.isGoogleOnly) {
      const { error } = await supabase.from('pacientes').update({
        fecha: selectedCita.fecha, hora_cita: selectedCita.hora_cita,
        reason: selectedCita.reason, treatment: selectedCita.treatment
      }).eq('id', selectedCita.id);
      if (error) { alert('Error: ' + error.message); setSavingEdit(false); return; }
    }

    if (googleToken && selectedCita.google_event_id) {
      try {
        const startDateTime = `${selectedCita.fecha}T${selectedCita.hora_cita}:00-05:00`;
        const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000);
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${selectedCita.google_event_id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: { dateTime: startDateTime }, end: { dateTime: endDate.toISOString() },
            summary: `${selectedCita.name} - ${selectedCita.treatment || selectedCita.reason}`
          })
        });
      } catch (err) { console.error("Error Google Calendar", err); }
    }

    alert('Cita actualizada correctamente.');
    setShowEditModal(false);
    setSavingEdit(false);
    window.location.reload();
  };

  // 👉 NUEVA LÓGICA DE ELIMINACIÓN
  const handleDeleteCita = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cita de ${selectedCita.name}?`)) return;

    setSavingEdit(true);

    try {
      // A. Eliminar de Google Calendar
      if (googleToken && selectedCita.google_event_id) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${selectedCita.google_event_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${googleToken}` }
        });
      }

      // B. Eliminar de Supabase (Liberar el horario del paciente)
      if (!selectedCita.isGoogleOnly) {
        const { error } = await supabase
          .from('pacientes')
          .update({
            fecha: null,
            hora_cita: null,
            google_event_id: null
          })
          .eq('id', selectedCita.id);

        if (error) throw error;
      }

      alert("Cita eliminada correctamente.");
      setShowEditModal(false);
      window.location.reload();
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Hubo un problema al eliminar la cita.");
    } finally {
      setSavingEdit(false);
    }
  };


  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>

        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={handlePrev} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, color: DN }}>◄</button>
          <button onClick={() => setCurrentDate(new Date())} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, color: DN, fontSize: 11 }}>Hoy</button>
          <button onClick={handleNext} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, color: DN }}>►</button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: DN, textTransform: 'capitalize' }}>
          {view === 'Mensual'
            ? currentDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' })
            : view === 'Semana' ? `Semana del ${getWeekDays()[0].getDate()} al ${getWeekDays()[5].getDate()}` : `Día: ${currentDate.toLocaleDateString()}`}
        </div>

        <select value={view} onChange={e => setView(e.target.value)} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, background: '#fff', outline: 'none' }}>
          <option value="Semana">Vista semanal</option>
          <option value="Día">Vista diaria</option>
          <option value="Mensual">Vista mensual</option>
        </select>

        {!googleToken && (
          <button onClick={() => login()} style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Sincronizar Google
          </button>
        )}

        <button onClick={() => setShowModalCita(true)} style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          + Nueva cita
        </button>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* CABECERA DÍAS */}
        <div style={{ display: 'grid', gridTemplateColumns: view === 'Mensual' ? 'repeat(7, 1fr)' : `50px repeat(${displayDays.length},1fr)`, borderBottom: `1px solid ${BD}`, background: LT }}>
          {view !== 'Mensual' && <div style={{ padding: 4 }} />}
          {(view === 'Mensual' ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : displayDays).map((d, i) => {
            const label = view === 'Mensual' ? d : d.toLocaleDateString('es-ES', { weekday: 'short' }) + ' ' + d.getDate();
            const isToday = view !== 'Mensual' && d.toDateString() === new Date().toDateString();
            return (
              <div key={i} style={{ padding: '9px 6px', textAlign: 'center', background: isToday ? MT : LT, borderLeft: i > 0 ? `1px solid ${BD}` : 'none' }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? P : MU, textTransform: 'capitalize' }}>{label}</div>
                {isToday && <div style={{ fontSize: 8, color: P, fontWeight: 700, letterSpacing: .3 }}>HOY</div>}
              </div>
            )
          })}
        </div>

        {/* CUERPO DEL CALENDARIO */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {view === 'Mensual' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, 1fr)' }}>
              {displayDays.map((d, i) => {
                // Formato exacto YYYY-MM-DD
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const apts = allApts.filter(a => a.fecha === dateStr);
                const isCurrentMonth = d.getMonth() === currentDate.getMonth();

                return (
                  <div key={i} style={{ borderRight: `1px solid ${MT}`, borderBottom: `1px solid ${MT}`, padding: 4, background: isCurrentMonth ? '#fff' : '#f8fafc' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isCurrentMonth ? DN : MU, marginBottom: 4 }}>{d.getDate()}</div>
                    {apts.map((a, ai) => (
                      <div key={ai} onClick={() => { setSelectedCita(a); setShowEditModal(true); }}
                        style={{ background: a.col || P, color: '#fff', padding: '3px 5px', borderRadius: 4, fontSize: 9, marginBottom: 2, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <b>{a.hora_cita}</b> {a.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            hours.map(h => (
              <div key={h} style={{ display: 'grid', gridTemplateColumns: `50px repeat(${displayDays.length},1fr)`, borderBottom: `1px solid ${MT}`, minHeight: 46 }}>
                <div style={{ padding: '3px 6px', fontSize: 9, color: MU, textAlign: 'right', background: LT, borderRight: `1px solid ${BD}` }}>{h}</div>
                {displayDays.map((d, di) => {
                  const mapIndex = view === 'Semana' ? di : d.getUTCDay() - 1;
                  // Formato exacto YYYY-MM-DD
                  const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                  return (
                    <div key={di} style={{ borderLeft: `1px solid ${MT}`, padding: 2, minHeight: 46 }}>
                      {(weekApts[mapIndex] || []).filter(a => a.h === parseInt(h, 10) && a.fecha === targetDate).map((a, ai) => (
                        <div key={ai} onClick={() => { setSelectedCita(a); setShowEditModal(true); }} style={{ background: a.col, borderRadius: 5, padding: '5px 8px', cursor: 'pointer', marginBottom: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.p}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.9)' }}>{a.t}</div>
                          <div style={{ fontSize: 8, marginTop: 4, background: 'rgba(0,0,0,0.2)', display: 'inline-block', padding: '2px 4px', borderRadius: 4, color: '#fff' }}>⏰ {a.hora_cita}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {showModalCita && <ModalNuevaCita onClose={() => setShowModalCita(false)} onSave={handleGuardarCita} listaPacientes={listaPacientes} modo="cita" />}

      {showEditModal && selectedCita && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 25, borderRadius: 16, width: 400 }}>
            <h3 style={{ marginTop: 0, color: P }}>
              {selectedCita.isGoogleOnly ? 'Editar Evento de Google' : `Editar Cita: ${selectedCita.name}`}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: MU }}>TRATAMIENTO / MOTIVO</label>
                <input
                  value={selectedCita.treatment || selectedCita.reason || ''}
                  onChange={e => setSelectedCita({ ...selectedCita, treatment: e.target.value, reason: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${BD}`, marginTop: 4, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: MU }}>NUEVA FECHA</label>
                  <input
                    type="date"
                    value={selectedCita.fecha || ''}
                    onChange={e => setSelectedCita({ ...selectedCita, fecha: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${BD}`, marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: MU }}>NUEVA HORA</label>
                  <input
                    type="time"
                    value={selectedCita.hora_cita || ''}
                    onChange={e => setSelectedCita({ ...selectedCita, hora_cita: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${BD}`, marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* 👉 BOTONES ACTUALIZADOS: ELIMINAR, CANCELAR Y ACTUALIZAR */}
            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button
                onClick={handleDeleteCita}
                disabled={savingEdit}
                style={{ padding: '10px 15px', border: 'none', background: '#fef2f2', color: '#ef4444', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                🗑️ Eliminar
              </button>

              <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                <button onClick={() => setShowEditModal(false)} disabled={savingEdit} style={{ flex: 1, padding: 10, border: 'none', background: '#f1f5f9', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} disabled={savingEdit} style={{ flex: 1, padding: 10, background: P, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
                  {savingEdit ? 'Procesando...' : 'Actualizar'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function Pacientes({ setView, setSelPat }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('todos');
  const [showModal, setShowModal] = useState(false);
  const [patientsList, setPatientsList] = useState([]);

  // 👉 CORRECCIÓN 1: Estado inicial
  const [form, setForm] = useState({
    id: null,
    paciente: '',
    name: '',
    doc: '',
    phone: '',
    fecha: '',
    hora: '',
    motivo: '',
    reason: '',
    treatment: '',
    birthDate: '',
    age: '',
    tag: 'nuevo'
  });

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from('pacientes').select('*').order('id', { ascending: false });
      if (data) {
        const unicos = [];
        const yaVistos = new Set();
        data.forEach(p => {
          const norm = normalizarTexto(p.name);
          if (!yaVistos.has(norm)) { yaVistos.add(norm); unicos.push(p); }
        });
        setPatientsList(unicos);
      }
    };
    cargar();
  }, []);

  const calcAge = (dateStr) => {
    if (!dateStr) return '';
    const today = new Date();
    const birthDate = new Date(dateStr);
    if (isNaN(birthDate.getTime())) return '';
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleDocChange = (valorDoc) => {
    if (!valorDoc || valorDoc.trim() === "") {
      setForm({
        id: null,
        name: '',
        doc: '',
        phone: '',
        reason: '',
        treatment: '',
        birthDate: '',
        age: '',
        tag: 'nuevo'
      });
      return;
    }

    const existente = patientsList.find(p => p.doc === valorDoc);

    if (existente) {
      setForm({ ...existente, id: existente.id });
    } else {
      setForm({
        ...form,
        id: null,
        doc: valorDoc,
        name: '',
        phone: '',
        reason: '',
        treatment: '',
        birthDate: '',
        age: ''
      });
    }
  };

  const handleNombreChange = (val) => {
    const normIngresado = normalizarTexto(val);
    const existente = patientsList.find(p => normalizarTexto(p.name) === normIngresado);

    if (existente) {
      setForm({
        ...existente,
        id: existente.id
      });
    } else {
      setForm(prev => ({
        ...prev,
        id: null,
        name: val
      }));
    }
  };

  // 👉 NUEVA LÓGICA DE GUARDADO CON HC AUTOMÁTICO
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) return alert("Nombre requerido");
    const nombreLimpio = form.name.trim().replace(/\s+/g, " ");

    // Preparar datos base para Supabase
    const datos = {
      name: nombreLimpio,
      doc: form.doc,
      phone: form.phone,
      reason: form.reason,
      treatment: form.treatment,
      birthDate: form.birthDate,
      age: form.age,
      tag: form.tag || 'nuevo'
    };

    let idDestino = form.id;
    if (!idDestino) {
      const existe = patientsList.find(p => normalizarTexto(p.name) === normalizarTexto(nombreLimpio));
      if (existe) idDestino = existe.id;
    }

    if (idDestino) {
      // 1. ACTUALIZAR PACIENTE EXISTENTE
      const { data, error } = await supabase.from('pacientes').update(datos).eq('id', idDestino).select();
      if (error) return alert(error.message);

      setPatientsList(prev => {
        const filtrada = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
        return [data[0], ...filtrada];
      });

    } else {
      // 2. CREAR NUEVO PACIENTE Y ASIGNAR HC
      try {
        // Buscar el último HC registrado
        const { data: hcData, error: hcError } = await supabase
          .from('pacientes')
          .select('num_hc')
          .not('num_hc', 'is', null)
          .order('id', { ascending: false })
          .limit(1);

        let nextHcNumber = 1;

        if (hcData && hcData.length > 0 && hcData[0].num_hc) {
          const match = hcData[0].num_hc.match(/\d+/); // Extraer solo los números
          if (match) {
            nextHcNumber = parseInt(match[0], 10) + 1;
          }
        }

        // Formatear con 4 dígitos (ej: 0001, 0002)
        const nuevoHC = String(nextHcNumber).padStart(4, '0');
        datos.num_hc = nuevoHC; // Añadir el HC a los datos a guardar

        // Insertar en Supabase
        const { data, error } = await supabase.from('pacientes').insert([datos]).select();
        if (error) throw error;

        alert(`✅ Paciente creado con éxito. Se le asignó la HC: ${nuevoHC}`);

        setPatientsList(prev => {
          const filtrada = prev.filter(p => normalizarTexto(p.name) !== normalizarTexto(data[0].name));
          return [data[0], ...filtrada];
        });
      } catch (err) {
        return alert("Error al crear paciente: " + err.message);
      }
    }

    setShowModal(false);
    setForm({ id: null, name: '', doc: '', phone: '', reason: '', treatment: '', birthDate: '', age: '', tag: 'nuevo' });
  };

  const list = patientsList.filter(p => {
    const matchBusqueda = normalizarTexto(p.name).includes(normalizarTexto(q)) || (p.doc && p.doc.includes(q));
    const tagActual = p.tag || 'activo';
    const matchFiltro = filter === 'todos' || tagActual === filter;
    return matchBusqueda && matchFiltro;
  });

  return (
    <div style={{ padding: '24px 30px', flex: 1, overflowY: 'auto' }}>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <input
          placeholder="🔍 Buscar nombre, DNI o tratamiento..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${BD}`, outline: 'none', fontSize: 13, color: DN }}
        />

        <div style={{ display: 'flex', gap: 6 }}>
          {['todos', 'activo', 'nuevo'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                border: `1px solid ${filter === f ? P : BD}`,
                background: filter === f ? P : '#fff',
                color: filter === f ? '#fff' : MU
              }}>
              {f}
            </button>
          ))}
        </div>

        <button onClick={() => setShowModal(true)} style={{ background: P, color: '#fff', border: 'none', padding: '12px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
          + Nuevo paciente
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {list.map(p => (
          <div key={p.id} onClick={() => { setSelPat(p); setView('historia'); }}
            style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 16, padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}
          >

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: P, fontSize: 16, flexShrink: 0 }}>
                {ini(p.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: DN }}>{p.name}</div>
                <div style={{ fontSize: 11, color: MU, marginTop: 3 }}>
                  {/* Mostrar HC si la tiene */}
                  {p.num_hc ? <span style={{ color: P, fontWeight: 800 }}>HC: {p.num_hc} · </span> : ''}
                  DNI: {p.doc || '---'} · {p.age ? `${p.age} años` : '-- años'}
                </div>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: (p.tag || 'activo') === 'nuevo' ? MT : '#f1f5f9', color: (p.tag || 'activo') === 'nuevo' ? P : '#64748b' }}>
                {p.tag || 'activo'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Tratamiento</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>{p.treatment || 'Sin especificar'}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Próx. cita</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>
                  {p.fecha ? `${p.fecha} ${p.hora_cita || ''}` : '---'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Sangre</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>{p.blood || 'O+'}</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Alergias</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>{p.allergies || 'Ninguna'}</div>
              </div>
            </div>

            {(p.balance > 0) && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', color: '#d97706', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚠ Saldo pendiente: S/{p.balance}
              </div>
            )}

          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: '90%', maxWidth: 500 }}>
            <h3 style={{ marginTop: 0, color: '#0D5C6B', marginBottom: 20 }}>Registrar/Actualizar Paciente</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: '#0D5C6B' }}>DNI / CE</label>
                <input value={form.doc} onChange={e => handleDocChange(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '2px solid #0D5C6B', boxSizing: 'border-box', outline: 'none' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>NOMBRE COMPLETO</label>
                <input list="lista-p" value={form.name} onChange={e => handleNombreChange(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none' }} />
                <datalist id="lista-p">{patientsList.map(p => <option key={p.id} value={p.name} />)}</datalist>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>CELULAR / WHATSAPP</label>
                <input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ej: 990711528"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>FECHA DE NACIMIENTO</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={e => {
                    const fechaValue = e.target.value;
                    const anio = fechaValue.split('-')[0];
                    if (anio && anio.length === 4) {
                      const edad = calcAge(fechaValue);
                      setForm({ ...form, birthDate: fechaValue, age: edad });
                    } else {
                      setForm({ ...form, birthDate: fechaValue });
                    }
                  }}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#fff', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>EDAD</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', background: '#f8fafc', outline: 'none' }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>TRATAMIENTO</label>
                <input value={form.treatment} onChange={e => setForm({ ...form, treatment: e.target.value })} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700, color: '#64748b' }}>Cancelar</button>
              <button onClick={handleSave} style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', background: '#0D5C6B', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Odontograma({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion }) {
  const [act, setAct] = useState('caries');
  const [sel, setSel] = useState(null);
  const [specs, setSpecs] = useState('');
  const [mode, setMode] = useState('inicial');
  const [showP, setShowP] = useState(true);

  const at = gt(act);
  const aw = 42;
  const pw = 32;

  const currentTeeth = mode === 'inicial' ? teeth : (teethEvolucion || {});
  const setCurrentTeeth = mode === 'inicial' ? setTeeth : setTeethEvolucion;

  const applyAll = n => {
    if (act === 'normal') { setCurrentTeeth(p => ({ ...p, [n]: {} })); return; }
    const up = {};
    getSurfs(n).forEach(s => up[s] = act);
    setCurrentTeeth(p => ({ ...p, [n]: { ...p[n], ...up } }));
    setSel(n);
  };

  const applySurf = (n, sf) => {
    const cur = (currentTeeth[n] || {})[sf];
    if (act === 'normal' || cur === act) setCurrentTeeth(p => ({ ...p, [n]: { ...p[n], [sf]: undefined } }));
    else setCurrentTeeth(p => ({ ...p, [n]: { ...p[n], [sf]: act } }));
  };

  const allF = [];
  Object.entries(currentTeeth).forEach(([n, ss]) => {
    const superficies = getSurfs(n);

    // Verificamos si en los datos ya viene colapsado o si debemos colapsarlo al vuelo
    const valores = superficies.map(s => ss[s]).filter(v => v && v !== 'normal');
    const esTodoIgual = ss.todaPieza || (valores.length === superficies.length && valores.every(v => v === valores[0]));

    if (esTodoIgual) {
      const hallazgoDeteccion = ss.todaPieza || valores[0];
      allF.push({ n, sf: 'Toda la pieza', c: hallazgoDeteccion });
    } else {
      // Detalle normal si falta alguna superficie o son diferentes
      Object.entries(ss).forEach(([sf, c]) => {
        if (c && c !== 'normal' && sf !== 'note' && sf !== 'todaPieza') {
          allF.push({ n, sf, c });
        }
      });
    }
  });

  const recRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => {
        const ss = currentTeeth[n] || {}, cs = Object.entries(ss).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
        const t = cs.length ? gt(cs[0][1]) : null;
        return (
          <div key={n} style={{ width: w, height: 18, border: '0.5px solid #374151', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel === n ? P + '22' : undefined, borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : '0.5px solid #374151' }}>
            {t && <span style={{ fontSize: 11, fontWeight: 800, color: t.cr === 'r' ? RJ : AZ }}>{t.sig}</span>}
          </div>
        );
      })}
    </div>
  );

  // 👉 FUNCIÓN nRow CORREGIDA para bajar los números
  const nRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{
          width: w,
          fontSize: 12,
          textAlign: 'center',
          userSelect: 'none',
          color: sel === n ? P : MU,
          fontWeight: sel === n ? 900 : 600,
          borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : 'none',

          // --- EL CAMBIO ESTÁ AQUÍ ---
          // Antes: '2px 0' (Arriba/Abajo 2px, Izq/Der 0px)
          // Ahora: '2px 0 6px' (Arriba 2px, Izq/Der 0px, Abajo 6px)
          // Esto empuja el número hacia arriba y lo separa de la línea inferior.
          padding: '2px 0 6px'
        }}>
          {n}
        </div>
      ))}
    </div>
  );

  const tRow = (list, upper, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : 'none' }}>
          <ToothSVG num={n} upper={upper} surfs={currentTeeth[n] || {}} active={sel === n} onClick={() => setSel(sel === n ? null : n)} w={w} />
        </div>
      ))}
    </div>
  );

  const eRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ width: w, height: 13, border: '0.5px solid #374151', boxSizing: 'border-box', background: sel === n ? P + '11' : undefined, borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : '0.5px solid #374151' }} />
      ))}
    </div>
  );

  const selSurfs = sel ? (currentTeeth[sel] || {}) : {};

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* SIDEBAR HERRAMIENTAS */}
      <div style={{ width: 180, background: '#fff', borderRight: `1px solid ${BD}`, overflowY: 'auto', flexShrink: 0, padding: 12 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: LT, borderRadius: 6, padding: 4 }}>
          {['inicial', 'evolución'].map(m => (
            <div key={m} onClick={() => setMode(m)} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: mode === m ? P : 'transparent', color: mode === m ? '#fff' : MU }}>
              {m}
            </div>
          ))}
        </div>
        <div style={{ background: at.col, color: at.tc, padding: '6px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 10 }}>{at.lbl}</div>

        {[{ label: 'Rojo — mal estado', g: 'r' }, { label: 'Azul — buen estado', g: 'a' }].map(({ label, g }) => (
          <div key={g}>
            <div style={{ fontSize: 9, fontWeight: 800, color: g === 'r' ? RJ : AZ, textTransform: 'uppercase', letterSpacing: .5, margin: '12px 0 6px', borderTop: '1px solid #f0f4f8', paddingTop: 8 }}>{label}</div>
            {TOOLS.filter(t => t.g === g).map(t => (
              <div key={t.id} onClick={() => setAct(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, background: act === t.id ? t.col : 'transparent' }}
                onMouseEnter={e => { if (act !== t.id) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (act !== t.id) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: t.col, border: '1px solid #cbd5e1', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: act === t.id ? '#fff' : '#374151', fontWeight: act === t.id ? 700 : 500 }}>{t.lbl}</span>
              </div>
            ))}
          </div>
        ))}

        <div onClick={() => setAct('normal')} style={{ marginTop: 10, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center', border: `1px solid ${BD}`, fontSize: 11, color: '#374151', fontWeight: 700 }}>↺ Limpiar pincel</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: MU, marginTop: 12, fontWeight: 600 }}>
          <input type="checkbox" checked={showP} onChange={e => setShowP(e.target.checked)} style={{ transform: 'scale(1.2)' }} /> Dientes Primarios
        </label>
        {allF.length > 0 && <button onClick={() => { setCurrentTeeth({}); setSel(null); }} style={{ width: '100%', marginTop: 10, padding: '8px', background: '#fef2f2', border: `1px solid ${RJ}55`, borderRadius: 6, fontSize: 11, color: RJ, cursor: 'pointer', fontWeight: 800 }}>Limpiar todo el mapa</button>}
      </div>

      {/* ÁREA CENTRAL */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '30px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 14, padding: '24px 30px', display: 'inline-block', minWidth: 750, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>

          <div style={{ display: 'flex', gap: 15, marginBottom: 15, alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: DN }}>{patient?.name || 'Paciente'}</div>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 12, background: mode === 'inicial' ? MT : '#fef3c7', color: mode === 'inicial' ? P : GL }}>{mode}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: MU, fontWeight: 600 }}>{new Date().toLocaleDateString('es-PE')}</span>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: MU, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 }}>Maxilar superior</div>

          {/* Fila Maxilar (18-28) */}
          {recRow(UA, aw)}{eRow(UA, aw)}{nRow(UA, aw)}{tRow(UA, true, aw)}

          {/* Fila Primarios Sup (55-65) */}
          {showP && (
            <>
              <div style={{ marginTop: 3 }}>
                {tRow(UP, true, pw)}
                {nRow(UP, pw)}
              </div>
            </>
          )}

          {/* PLANO OCLUSAL */}
          <div style={{ margin: '12px 0 10px', borderTop: '2px solid #374151', position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%) translateY(-50%)', background: '#fff', padding: '0 12px', fontSize: 9, color: '#94a3b8', fontWeight: 800, whiteSpace: 'nowrap' }}>PLANO OCLUSAL</span>
          </div>

          {/* Fila Primarios Inf (85-75) */}
          {showP && (
            <>
              <div style={{ marginTop: 8 }}>
                {nRow(LP, pw)}
                {tRow(LP, false, pw)}
              </div>
            </>
          )}

          {/* Fila Mandíbula (48-38) */}
          {tRow(LA, false, aw)}{nRow(LA, aw)}{eRow(LA, aw)}{recRow(LA, aw)}

          <div style={{ fontSize: 10, fontWeight: 800, color: MU, textTransform: 'uppercase', textAlign: 'center', marginTop: 6 }}>Maxilar inferior</div>

          <div style={{ marginTop: 20, borderTop: `1px solid ${BD}`, paddingTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: DN }}>ESPECIFICACIONES CLÍNICAS: </span>
            <textarea value={specs} onChange={e => setSpecs(e.target.value)} placeholder="Ej. Hallazgos múltiples o anotaciones no gráficas..."
              style={{ width: '100%', minHeight: 30, marginTop: 5, padding: '4px 8px', border: '1px solid transparent', borderBottom: '1px solid #94a3b8', fontSize: 11, resize: 'vertical', outline: 'none', color: DN, background: '#f8fafc', borderRadius: '4px 4px 0 0', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {allF.length > 0 && <div style={{ marginTop: 15, padding: 12, background: LT, borderRadius: 10, border: `1px solid ${BD}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: P, marginBottom: 8 }}>Resumen de Hallazgos ({allF.length}):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allF.map(({ n, sf, c }, i) => {
                const t = gt(c);
                return (
                  <span key={i} onClick={() => applySurf(n, sf)} title="Clic para quitar"
                    style={{ fontSize: 10, background: '#fff', color: t.cr === 'r' ? RJ : AZ, padding: '3px 10px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', border: `1px solid ${t.cr === 'r' ? RJ : AZ}55`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    Pieza {n} / {sf} : {t.sig}
                  </span>
                );
              })}
            </div>
          </div>}
        </div>
      </div>

      {/* DETALLE LATERAL DE LA PIEZA */}
      {sel && (
        <div style={{ width: 250, background: '#fff', borderLeft: `1px solid ${BD}`, overflowY: 'auto', flexShrink: 0, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <div><div style={{ fontSize: 22, fontWeight: 900, color: P }}>Pieza {sel}</div><div style={{ fontSize: 11, color: MU, fontWeight: 600 }}>{TNAME[sel] || '—'}</div></div>
            <button onClick={() => setSel(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 18, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: MU, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>Vista Oclusal</div>
            <OcclusalMap num={sel} surfs={selSurfs} activeTool={act} onSurf={sf => applySurf(sel, sf)} size={160} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 15 }}>
            <button onClick={() => applyAll(sel)} style={{ flex: 1, background: at.col, color: at.tc, border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Aplicar toda pieza</button>
            <button onClick={() => setCurrentTeeth(p => ({ ...p, [sel]: {} }))} style={{ background: '#fef2f2', color: RJ, border: `1px solid ${RJ}44`, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>↺</button>
          </div>

          <div style={{ fontSize: 10, color: MU, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Superficies</div>
          {getSurfs(sel).map(sf => {
            const c = selSurfs[sf], t = gt(c), has = c && c !== 'normal';
            return (
              <div key={sf} onClick={() => applySurf(sel, sf)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: has ? (t.cr === 'r' ? '#fef2f2' : '#eff6ff') : LT, border: `1px solid ${has ? (t.cr === 'r' ? RJ + '44' : AZ + '44') : BD}` }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: has ? (t.cr === 'r' ? RJ : AZ) : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: has ? '#fff' : '#94a3b8', fontWeight: 900 }}>{sf}</span>
                </div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: has ? 800 : 500, color: has ? (t.cr === 'r' ? RJ : AZ) : MU }}>{has ? t.lbl : 'Sin hallazgo'}</div></div>
                {has && <span style={{ fontSize: 14, color: MU, fontWeight: 800 }}>✕</span>}
              </div>
            );
          })}

          <div style={{ fontSize: 10, color: MU, marginTop: 15, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Notas de pieza</div>
          <textarea placeholder="Observaciones específicas..." defaultValue={selSurfs.note || ''} onBlur={e => setCurrentTeeth(p => ({ ...p, [sel]: { ...p[sel], note: e.target.value } }))}
            style={{ width: '100%', minHeight: 60, padding: 10, border: `1px solid ${BD}`, borderRadius: 8, fontSize: 11, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }} />
        </div>
      )}
    </div>
  );
}

// ─── CONSTANTES PARA CONSENTIMIENTOS ───────────────────────────────
const TODAY_STR = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

// ─── FUNCIÓN INTELIGENTE PARA AUTOCOMPLETAR EL ENCABEZADO ─────────────
const getPreamble = (p) => {
  if (!p) return "";
  const isMinor = parseInt(p.age) < 18;

  if (isMinor) {
    return `Yo ${p.apoderado || '...................................................'} con DNI No. ${p.apoderado_dni || '................'} , mayor de edad, y con domicilio en ${p.apoderado_direccion || p.direccion || '...................................................'}, en calidad de representante legal del paciente menor de edad ${p.name || '...................................................'}.`;
  } else {
    return `Yo ${p.name || '...................................................'} (como paciente), con DNI No. ${p.doc || '................'}, mayor de edad, y con domicilio en ${p.direccion || '...................................................'}.`;
  }
};

const DOCS = [
  {
    id: 'rehabilitacion', title: 'Rehabilitación Oral', icon: '🦷',
    subtitle: 'Anestesia · Extracciones · Empastes · Endodoncia · Prótesis',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO EN REHABILITACIÓN ORAL\n\n${getPreamble(p)}\n\nDECLARO\n\nQue para la realización el Cirujano Dentista Dra. Sol Vargas\nme ha explicado que es conveniente en mi situación proceder a realizar un tratamiento de rehabilitación\noral que puede precisar distintos tipos de técnicas y tratamientos entre ellos:\n\n 1.- ANESTESIA LOCAL. Me ha explicado que el tratamiento que voy a recibir implica la administración de\nanestesia local, que consiste en proporcionar, mediante una inyección, sustancias que provocan un\nbloqueo reversible de los nervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin\nde realizar el tratamiento sin dolor.\n\nMe ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que normalmente\nvan a desaparecer en dos o tres horas.\nTambién me ha explicado que la administración de la anestesia puede provocar, en el punto en el que se\nadministre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca baja de la presión arterial que, en casos menos frecuentes, pueden provocar un síncope o\nfibrilación ventricular, que deben tratarse posteriormente, e, incluso, excepcionalmente, la muerte.\n\nComprendo que aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico, asfixia y que en casos extremos puede requerir tratamiento urgente.\n\n2.- EXTRACCIONES SIMPLES. La intervención consiste en la aplicación de un fórceps a la corona,\npracticando la luxación con movimientos de lateralidad, de manera que pueda desprenderse fácilmente\ndel alvéolo donde está insertada.\n\nAunque se me realizarán los medios diagnósticos que se estimen convenientes, comprendo que es\nposible que el estado inflamatorio del diente que se me vaya a extraer pueda producir un proceso\ninfeccioso, que puede requerir tratamiento con antibióticos y/o antiinflamatorios, del mismo modo que\nen el curso del procedimiento puede producirse una hemorragia, que exigiría, para cohibirla, la\ncolocación en el alvéolo de una sustancia o de sutura. También sé que en el curso del procedimiento de\nla extracción se pueden producir, aunque no es frecuente, la rotura de la corona, heridas en la mucosa\nde la mejilla o en la lengua, inserción de la raíz en el seno maxilar, fractura del maxilar o de la\ntuberosidad, que no dependen de la forma o modo de practicarse la intervención, ni de su correcta\nrealización, sino que son imprevisibles, en cuyo caso el facultativo tomará las medidas precisas u\ncontinuará con la extracción.\n\n3.- OBTURACIONES O EMPASTES. El propósito principal de esta intervención es restaurar los tejidos\ndentarios duros y proteger la pulpa, para conservar el diente o molar y su función, restableciendo al\ntiempo, siempre que sea posible, la estética adecuada. La intervención consiste en limpiar la cavidad de\ntejido cariado y reblandecido y rellenarla posteriormente para conseguir un sellado hermético,\nconservando el diente o molar.\n\nEl Dentista me ha advertido que es frecuente que se produzca una mayor sensibilidad, sobre doto al\nfrío, que normalmente desaparecerá de modo espontáneo.\n\nTambién me ha recomendado que vuelva a visitarle si advierto signos de movilidad o alteraciones de\nla oclusión, pues en ese caso sería preciso ajustar la oclusión, para aliviar el dolor y para impedir la\nformación de una enfermedad periodontal y/o trauma.\n\nComprendo que el sellado hermético puede reactivar procesos infecciosos que hagan necesaria la\nendodoncia y que, especialmente si la caries es profunda, el diente o molar quedar frágil y podrá ser\nnecesario llevar a cabo otro tipo de reconstrucción o colocar una funda protésica.\n\nTambién comprendo que es posible que no me encuentre satisfecho con la forma u el color del diente\ntras el tratamiento porque las cualidades de los empastes nunca serán idénticos a su aspecto sano.\n\n4.- ENDODONCIA. El propósito principal de esta intervención es la eliminación del tejido pulpar\n(conocido vulgarmente por el nervio del diente) inflamado o infectado, o de un proceso granulomatoso\no quístico. La intervención consiste en la eliminación del tejido enfermo y rellenar la cámara pulpar y\nlos tejidos radiculares con un material que selle la cavidad e impida el paso a las bacterias y toxinas\ninfecciosas, conservando el diente o molar. El Dentista me ha advertido que, a pesar de realizarse\ncorrectamente la técnica, cabe la posibilidad de que la infección o el proceso quístico o granulomatoso\nno se eliminen totalmente, por lo que puede ser necesario acudir a la cirugía del ápice radicular, llamada\napicectomía al cabo de algunas semanas, meses o incluso años.\n\nA pesar de realizarse correctamente la técnica, es posible que no se obtenga el relleno total de los\nconductos, por lo que también puede ser necesario proceder a una reendodoncia, como en el caso de\nque el relleno quede corto o largo.\n\nEl Dentista me ha advertido que es muy posible que después de la endodoncia el diente cambie de color\nu se oscurezca ligeramente.\n\nTambién sé que es frecuente que el diente/molar en que se realice la endodoncia se debilite y tienda a\nfracturarse, por lo que puede ser necesario realizar coronas protésicas e insertar refuerzos dentro de la\nraíz llamados espigos.\n\n5.- PRÓTESIS. Me ha explicado el Dentista, la necesidad de tallar los pilares de la prótesis, lo que\nconlleva la posibilidad de aproximación excesiva a la cámara pulpar (nervio) que nos obligaría a realizar\nuna endodoncia y en algunos casos si el muñón quedase frágil, a realizar un espigo colado o de fibra.\n\nTambién se me ha explicado la necesidad de mantener una higiene escrupulosa para evitar el desarrollo\nde, caries, gingivitis y secundariamente enfermedad periodontal.\n\nAsimismo, se me informa de la importancia de visitas periódicas (entre 6 meses y un año) para controlar\nla situación de la prótesis y su entorno.\n\nPor otro lado, se me aclaró que existe la posibilidad de fractura de cualquiera de los componentes de\nla prótesis, muy relacionada con en el uso que yo haga de la misma.\n\nEl Dentista me ha explicado que todo acto odontológico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de rehabilitación oral.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'exodoncia_simple', title: 'Exodoncia Simple', icon: '🔧',
    subtitle: 'Extracción de una o más piezas dentarias',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA LA EXODONCIA SIMPLE\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que es conveniente en mi\nsituación realizar la extracción de una o más piezas dentarias:\n\n1.- En consecuencia, comprendo que no mantendré esa o esas piezas dentarias y que, únicamente, podrá\nser sustituido por una prótesis o implante. Que podría recurrir a técnicas conservadoras como la\nperiodoncia o la endodoncia, y las descarto por el estado que presenta, y que no hace razonable su\nconservación.\n\n2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Asimismo, me ha explicado que tendré la sensación de adormecimiento del labio o de la cara,\nque normalmente van a desaparecer en dos o tres horas. También me explicó que la administración de\nla anestesia puede provocar, en el punto en el que se administre la inyección, ulceración de la mucosa y\ndolor, y menos frecuentemente, limitaciones en el movimiento de apertura de la boca, que pueden\nrequerir tratamiento ulterior, y que la anestesia puede provocar bajada de tensión que, en casos menos\nfrecuentes, pueden provocar un síncope o fibrilación ventricular, que deben tratarse posteriormente, e,\nincluso, excepcionalmente, la muerte. Comprendo que, aunque de mis antecedentes personales no se\ndeducen posibles alergias o alergia al agente anestésico, la anestesia puede provocar urticaria,\ndermatitis, asma, edema angioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\n3.- La intervención consiste en el empleo alternado de instrumental especializado quirúrgico, aplicando\nfuerza manual, de leve a moderada, cuya finalidad es movilizar y finalmente extraer del alveolo la pieza\no piezas dentales problema.\n\n4.- Aunque se me han realizado los medios diagnósticos que se han estimado precisos, comprendo que\nes posible que el estado inflamatorio del diente/molar que se me va a extraer pueda producir un proceso\ninfeccioso, que puede requerir tratamiento con antibióticos y/o antiinflamatorios, del mismo modo que\nen el curso del procedimiento puede producirse una hemorragia, que exigiría, para cohibirla, la\ncolocación en el alvéolo de una torunda de algodón seca u otro producto hemostático, incluso sutura.\nTambién sé que en el curso del procedimiento pueden producirse, aunque no es frecuente, la rotura de\nla corona, heridas en la mucosa de la mejilla o en la lengua, intrusión de la raíz en el seno maxilar,\nfractura del maxilar, que no dependen de la forma o modo de practicarse la intervención, ni de su\ncorrecta realización, sino que son imprevisibles, en cuyo caso el cirujano dentista tomará las medidas\npertinentes para continuar con el tratamiento.\n\n5.- Mi dentista me ha explicado que todo acto quirúrgico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de extracción simple.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'tercera_molar', title: 'Exodoncia Tercera Molar', icon: '🦷',
    subtitle: 'Extracción de cordal / muela de juicio',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA LA EXODONCIA DE LA TERCERA MOLAR\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que es conveniente en mi\nsituación proceder a la extracción de un cordal o muela de juicio por los síntomas y signos que\nmanifiesto. Entiendo que el objetivo del procedimiento consiste en conseguir eliminar los problemas y\ncomplicaciones que su mantenimiento en la boca pueda ocasionar.\n\nMe ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Me ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que\nnormalmente van a desaparecer en dos o tres horas.\n\nTambién me ha explicado que la administración de la anestesia puede provocar, en el punto en el que se\nadministre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca la baja de la presión arterial que, en casos menos frecuentes, pueden provocar un síncope o\nfibrilación ventricular, que deben tratarse posteriormente, e, incluso, excepcionalmente, la muerte.\n\nComprendo que, aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\nAunque se me han practicado los medios diagnósticos que se han estimado necesarios, comprendo que\nes posible que el estado inflamatorio de la pieza que se me va extraer pueda producir un proceso\ninfeccioso, que puede requerir tratamiento con antibióticos y antiinflamatorios.\n\nTambién sé que en el curso del procedimiento pueden producirse, aunque no es frecuente: la rotura de\nla corona, laceraciones en la mucosa yugal o en la lengua, inserción de la raíz en el seno maxilar, fractura\ndel tabique intrarradicular o de la tuberosidad, que no dependen de la forma o modo de practicarse la\nintervención, ni de su correcta realización, sino que son imprevisibles, en cuyo caso el cirujano dentista\ntomará las medidas precisas, y continuará con la extracción.\n\nSe me informa también que, aunque no es frecuente, puede producirse luxación de la articulación de la\nmandíbula e incluso fractura del maxilar, en cuyo caso deberé recibir el tratamiento preciso con un\nespecialista en esa materia y ser revisado para control de ese proceso.\n\nTambién se me ha explicado que, aunque infrecuentemente, y con independencia de la técnica empleada\nen el procedimiento y de su correcta realización, pueden lesionarse el nervio dentario o el nervio lingual,\ncon pérdida de sensibilidad que normalmente es temporal y desaparece en algunas semanas, pero que\npuede perdurar durante tres a seis meses, o ser definitiva.\n\nMenos graves resultan las complicaciones infecciosas locales, celulitis, trismo, estomatitis, etc., que\nsuelen poder controlarse farmacológicamente pero que pueden precisar de tratamiento quirúrgico\nposterior.\n\nHe comprendido que, como alternativa a la extracción del molar de juicio, podría recurrir a técnicas\nconservadoras como la endodoncia y la periodoncia, que descarto por su estado.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique la extracción de la tercera molar.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'endodoncia', title: 'Endodoncia', icon: '🔬',
    subtitle: 'Tratamiento de conductos radiculares',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA ENDODONCIA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que es conveniente en mi situación proceder\na realizar el tratamiento endodóntico de mi pieza dentaria, para los que me ha informado debidamente\nde lo siguiente:\n\n1. El propósito principal de la intervención es la eliminación del tejido pulpar inflamado o infectado,\ndel interior del diente para evitar secuelas dolorosas o infecciosas.\n\n2. El tratamiento que voy a recibir implica la administración de anestesia local, que consiste en\nproporcionar, mediante una inyección, sustancias que provocan el bloqueo reversible de los nervios de\ntal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento sin dolor.\nMe ha explicado también que tendré la sensación de adormecimiento del labio o de la cara que\nnormalmente va a desaparecer en dos o tres horas.\n\nIgualmente me ha explicado que la administración de la anestesia puede provocar, en el punto en el que\nse administre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca bajada de tensión que, más infrecuentemente, pueden provocar un síncope o fibrilación\nventricular, que deben tratarse posteriormente, e incluso, excepcionalmente, la muerte. También puede\nprovoca la administración de anestesia urticaria, dermatitis, asma, edema angioneurótico, es decir\nasfixia, que en casos extremos puede requerir tratamiento urgente.\n\n3. La intervención consiste en la eliminación y el relleno de la cámara pulpar y los tejidos radiculares\ncon un material que selle la cavidad e impida el paso a las bacterias y toxinas infecciosas, conservando\nel diente o molar.\n\n4. Se me ha informado, que, a pesar de realizar correctamente la técnica, cabe la posibilidad de que la\ninfección o el proceso quístico o granulomatoso no se eliminen totalmente, por lo que puede ser\nnecesario acudir a la cirugía periapical al cabo de algunas semanas, meses o incluso años. Igualmente\nes posible que no se obtenga el relleno total de los conductos, por lo que también puede ser necesario\nproceder a una repetición del tratamiento, como en el caso de que el relleno quede corto o largo.\n\nTambién me ha advertido que es muy posible que después de la endodoncia el diente cambie de color y\nse oscurezca ligeramente. Y me ha indicado que es frecuente que el diente o molar en el que se ha\nrealizado la endodoncia se debilite y tienda a fracturarse, por lo que puede ser necesario realizar coronas\nprotésicas e insertar refuerzos interradiculares.\n\n5. Me ha informado de que todo acto quirúrgico que lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado mi cirujano dentista de forma clara, con un lenguaje sencillo,\nhabiendo resuelto todas las dudas que se me han planteado, y la información complementaria que le he\nsolicitado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de endodoncia.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'implantes', title: 'Implantes Dentales', icon: '⚙️',
    subtitle: 'Reposición de dientes con fijación al hueso',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA IMPLANTES DENTALES\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que el propósito de la intervención es la\nreposición de los dientes perdidos mediante la fijación de tornillos o láminas al hueso, y posteriormente\nla colocación de un/ospilar/es metálico/s que soportará las futuras piezas dentales artificiales.\n\nHe sido informado/a de otras alternativas de tratamiento mediante la utilización de prótesis\nconvencionales. Para llevar a cabo el procedimiento se aplicará anestesia, de cuyos posibles riesgos\ntambién he sido informado/a. Igualmente se me ha informado de que existen ciertos riesgos potenciales\nen toda intervención quirúrgica realizada en la boca, concretamente:\n\n1. Alergia al anestésico, antes, durante o después de la cirugía.\n2. Molestias, hematomas e inflamación postoperatoria, durante los primeros días.\n3. Sangrado.\n4. Infección postoperatoria que requiera tratamiento posterior.\n5. Lesión de raíces de dientes adyacentes.\n6. Lesión nerviosa que provoque hipoestesia o anestesia del labio inferior, superior, mentón, dientes,\n   encía y/o de la lengua, que sueles ser transitoria y excepcionalmente permanente.\n7. Comunicación con los senos nasales o con las fosas nasales.\n8. Aspiración o deglución de algún instrumento quirúrgico de pequeño tamaño.\n9. Desplazamiento del implante a estructuras vecinas.\n10. Rotura de instrumentos.\n\nLos implantes han sido utilizados ampliamente en todo el mundo, desde hace más de 25 años y es un\nprocedimiento considerado seguro por la comunidad internacional, pero se me ha explicado que, aunque\nla técnica se realice correctamente, existe un porcentaje de fracasos entre el 8 y el 10 por ciento.\n\nHe sido informado de las complicaciones potenciales de este procedimiento quirúrgico:\n1. Dehiscencia de sutura y exposición del implante.\n2. Falta de integración del implante con el hueso que lo rodea.\n3. Imposibilidad de colocar un implante en la localización prevista.\n4. En casos excepcionales, puede producirse una fractura mandibular.\n5. Fractura del implante o de algún componente de la prótesis.\n6. Complicaciones inherentes a la prótesis dental.\n\nEntiendo que el tratamiento no concluye con la colocación del implante, sino que será preciso visitar\nperiódicamente al facultativo y seguir escrupulosamente las normas de higiene que me ha explicado.\n\nHe comprendido lo que se me ha explicado por el facultativo de forma clara, con un lenguaje sencillo,\nhabiendo resuelto todas las dudas que se me han planteado, y la información complementaria que le he\nsolicitado.\n\nMe ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de implantes.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'ortodoncia', title: 'Ortodoncia', icon: '😁',
    subtitle: 'Aparatología fija o removible',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA ORTODONCIA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que es conveniente en mi situación proceder\na realizar un tratamiento ortodóntico, con objeto de conseguir una mejor alineación de los dientes, para\nde esta manera prevenir problemas posteriores, mejorando a la vez la masticación y la estética.\n\nPara ello se emplean aparatos de ortodoncia que pueden ser removibles o fijos.\n\nSe que es posible que los aparatos removibles se pierdan fácilmente si no están en la boca, y que en\neste caso el coste de reposición correrá por mi cuenta.\nEl Dentista me ha explicado que los aparatos pueden producir úlceras o llagas, dolor en los dientes que\nestán con los aparatos y que es frecuente que con el tiempo se produzca reabsorción de las raíces, de\nmanera que estas queden más pequeñas, así como la disminución de las encías, que pueden requerir\ntratamiento posterior. También me ha explicado el Dentista que el tratamiento puede requerir la\nextracción de algún o algunos dientes sanos, incluso puede ser necesario la extracción de las muelas\ndel juicio.\n\nTambién sé que el tratamiento ortodóntico puede ser largo en el tiempo, meses e incluso años, lo que\nno depende de la técnica empleada ni de su correcta realización sino de factores generalmente\nbiológicos, y de la respuesta de mi organismo, totalmente impredecibles, y que durante todo este tiempo\ndeberé extremar las medidas de higiene de la boca para evitar caries y enfermedad de las encías.\n\nEl Dentista me ha explicado que suspenderá el tratamiento si la higiene no es la adecuada porque corre\ngran riesgo mi dentición de sufrir lesiones cariosas múltiples u otros padecimientos derivados de la\nescasez de higiene oral.\n\nAsimismo, me ha informado que tras la conclusión del tratamiento, se pueden producir algunos\nmovimientos dentarios no deseados y que deberé acudir periódicamente para ser revisado para evitar\nrecaídas.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento. Estoy satisfecho con la información recibida y comprendido el alcance y riesgos\nde este tratamiento, y en por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento\nde ortodoncia.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'protesis_fija', title: 'Prótesis Fija', icon: '👑',
    subtitle: 'Coronas cementadas sobre pilares',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA PRÓTESIS FIJA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que es conveniente en mi\nsituación proceder a realizar el tratamiento de prótesis dental, dándome la siguiente información:\n\nQue para realizar un tratamiento de prótesis dental se me ha explicado la necesidad de tallar los dientes\npilares de la prótesis, lo que puede conllevar la posibilidad de aproximación excesiva a la cámara pulpar\n(nervio) que nos obligaría a realizar un tratamiento de endodoncia y en algunos casos si el muñón queda\nfrágil, a realizar un espigo de fibra o colado.\n\nTambién se me ha explicado la necesidad de mantener una higiene escrupulosa para evitar el desarrollo\nde gingivitis y secundariamente enfermedad periodontal.\n\nAsimismo, se me informa sobre la importancia de visitas periódicas (en principio anuales) para controlar\nla situación de la prótesis y su entorno. Por otro lado, se me ha aclarado que existe la posibilidad de\nfractura de cualquier componente de la prótesis, que implique la reparación o el cambio total de la\nmisma. Si ocurre dentro del periodo de garantía pactado, siempre y cuando se deba al uso adecuado de\nla prótesis (masticación de alimentos), la restauración será asumida por mi dentista, de lo contrario los\ngastos de reparación y honorarios serán asumidos completamente por mi persona.\n\nHe comprendido lo explicado de forma clara, con un lenguaje sencillo, habiendo resuelto todas las dudas\nque se me han planteado, y la información complementaria que le he solicitado. Me queda claro que en\ncualquier momento y sin necesidad de dar ninguna explicación, puedo revocar este consentimiento.\nEstoy satisfecho con la información recibida y he comprendido el alcance y riesgos de este tratamiento,\ny en por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de prótesis fija.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'periodoncia', title: 'Periodoncia', icon: '🩺',
    subtitle: 'Tratamiento de tejidos de soporte dental',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA PERIODONCIA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que es conveniente, en mi\nsituación, proceder a realizar un tratamiento periodontal, dándome la siguiente información:\n\n1.- El propósito principal de la intervención es la eliminación de los factores irritativos e infecciosos\npresentes en los tejidos de soporte de los dientes (encía, hueso alveolar, ligamiento periodontal, cemento\nradicular), para conseguir el mantenimiento de los dientes en el tiempo, función y estética, evitando\nmovilidad, pérdida de hueso y caída de los mismos.\n\n 2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local,\nque consiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible\nde los nervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el\ntratamiento sin dolor.\n\nMe ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que normalmente\nvan a desaparecer en dos o tres horas.\n\nTambién me ha explicado que la administración de la anestesia puede provocar, en el punto en el que se\nadministre la inyección, ulceración de la mucosa y dolor, y menos frecuentemente, limitaciones en el\nmovimiento de apertura de la boca, que pueden requerir tratamiento ulterior, y que la anestesia puede\nprovoca la baja de la presión arterial que, en casos menos frecuentes, pueden provocar un síncope o\nfibrilación ventricular, que deben tratarse posteriormente, e, incluso, excepcionalmente, la muerte.\n\nComprendo que, aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\n3.- La intervención consiste en la eliminación de la placa y cálculo con curetas o ultrasonido, y a las\npocas semanas, de ser necesario, la cirugía de las encías a colgajo para eliminar las bolsas infecciosas,\naumentar el nivel de la encía y/o tratar los defectos óseos.\n\n4.- Aunque se me han practicado los medios diagnósticos que se han estimado convenientes,\ncomprendo que pueden producirse procesos edematosos, hinchazón, dolor o laceraciones en la mucosa\ndel labio o mejilla, o en la lengua, que no dependen de la técnica empleada ni de su correcta realización,\nsino que son imprevisibles, aunque relativamente frecuentes, en cuyo caso el dentista tomará las\nmedidas pertinentes y continuará el tratamiento.\n\nSé que es frecuente que después del tratamiento advierta un aumento de la sensibilidad dentaria u\nmovilidad de los dientes que normalmente desaparecerán bien espontáneamente o por un tratamiento\nposterior.\n\nTambién sé que va a producirse un cierto alargamiento de los dientes, más perceptible al sonreír, como\nconsecuencia segura de haberse eliminado el tejido enfermo e inflamado. Igualmente comprendo que el\ntratamiento puede extenderse incluso hasta un año o más.\n\nMe ha explicado también pormenorizadamente la importancia del cuidado dental y el mantenimiento con\nvisitas periódicas de sesiones de profilaxis e higiene dental, lo que debe realizarse a lo largo de toda la vida.\n\nTambién comprendo que el objetivo perseguido NO SE PUEDA lograr, total o parcialmente, con\nindependencia de la técnica empleada y de su correcta realización, y de que, sin la esmerada contribución\nde mi parte en el control de placa bacteriana, mediante la higiene frecuente, los objetivos perseguidos no\nse puedan cumplir.\n\n5.- El Dentista me ha explicado que todo acto quirúrgico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de periodoncia.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'obturaciones', title: 'Obturaciones / Empastes', icon: '🪥',
    subtitle: 'Restauración de tejidos dentarios duros',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA OBTURACIONES\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que es conveniente en mi\nsituación proceder a realizar una obturación o empaste a un diente o molar, dándome la siguiente\ninformación:\n\n1.- El propósito principal de la intervención es restaurar los tejidos dentarios duros y proteger la pulpa,\npara conservar el diente/molar y su función, restableciendo al momento, siempre que sea posible, la\nestética adecuada.\n\n2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Me ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que\nnormalmente van a desaparecer en dos o tres horas. También me ha explicado que la administración de\nla anestesia puede provocar, en el punto en el que se administre la inyección, ulceración de la mucosa y\ndolor, y menos frecuentemente, limitaciones en el movimiento de apertura de la boca, que pueden\nrequerir tratamiento ulterior, y que la anestesia puede provocar la baja de presión arterial que, en casos\nmenos frecuentes, pueden provocar un síncope o fibrilación ventricular, que deben tratarse\nposteriormente, e, incluso, excepcionalmente, la muerte.\nComprendo que, aunque de mis antecedentes personales no se deducen posibles alergias o\nhipersensibilidad al agente anestésico, la anestesia puede provocar urticarias, dermatitis, asma, edema\nangioneurótico (asfixia), que en casos extremos puede requerir tratamiento urgente.\n\n3.- La intervención consiste en eliminar de la cavidad el tejido cariado y rellenarla posteriormente con\nmateriales plásticos adhesivos para conseguir un sellado hermético, conservando la integridad de la\npieza dental.\n\n4.- Mi dentista me ha advertido que es frecuente que se produzca una mayor sensibilidad, sobre todo al\nfrío, que normalmente desaparecerá de modo espontáneo. También me ha recomendado que vuelva a\nla consulta lo más pronto posible, si advierto signos de movilidad o alteraciones de la oclusión (mordida),\npues en ese caso sería preciso ajustarla, para aliviar el dolor y para impedir la formación de una\nenfermedad periodontal y/o trauma.\n\nComprendo que la obturación puede reactivar procesos infecciosos que hagan necesaria la endodoncia\ny que, especialmente si la caries es profunda, el diente/molar quedará frágil y podrá ser necesario llevar\na cabo otro tipo de reconstrucción o colocar una corona protésica. También comprendo que es posible\nque no me encuentre satisfecho con la forma y el color del diente tras el tratamiento, porque las\ncualidades de las restauraciones directas nunca serán idénticas a su aspecto de diente sano.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado. Me ha\nqueda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar este\nconsentimiento. Estoy satisfecho con la información recibida y comprendido el alcance y riesgos de este\ntratamiento, y en por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de\nobturación.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'cirugia_oral', title: 'Cirugía Oral Menor', icon: '🔪',
    subtitle: 'Extirpación, frenillos, quistes, cirugía preprotésica',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA LA CIRUGÍA ORAL MENOR\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano Dentista Dra. Sol Vargas me ha explicado que el propósito de la\nintervención de cirugía oral menor es para resolver alguno de los siguientes problemas de la cavidad oral\n(borrar los que no correspondan): extracción de piezas dentarias o restos apicales incluidos,\nfenestración o tracción de dientes retenidos, plastia de frenillos labiales, extirpación de quistes\nmaxilares y pequeños tumores de los mismos o del resto de la cavidad bucal y cirugía preprotésica\nfundamentalmente.\n\nPara llevar a cabo el procedimiento se aplicará anestesia, de cuyos posibles riesgos también he sido\ninformado/a, es posible que los fármacos utilizados puedan producir determinadas alteraciones del nivel\nde conciencia por lo que se me ha informado que no podré realizar determinadas actividades\ninmediatamente, tales como conducir un vehículo.\n\nIgualmente se me ha informado de que existen ciertos riesgos potenciales y complicaciones, algunas\nde ellas inevitables, concretamente:\n\n1.- Alergia al anestésico u otro medicamento utilizado, antes o después de la cirugía.\n2.- Hematoma y edema de la región.\n3.- Hemorragia postoperatoria.\n4.- Dehiscencia de la sutura.\n5.- Daño de dientes adyacentes.\n6.- Hipoestesia o anestesia del nervio dentario inferior, temporal o definitiva.\n7.- Hipoestesia o anestesia del nervio lingual, temporal o definitiva.\n8.- Hipoestesia o anestesia del nervio infraorbitario, temporal o definitiva.\n9.- Infección postoperatoria.\n10.- Osteítis.\n11.- Sinusitis.\n12.- Comunicación buconasal y/o bucosinual.\n13.- Fracturas óseas.\n14.- Rotura de instrumentos.\n\nTras la información recibida, he comprendido la naturaleza y propósitos del tratamiento de cirugía que\nse me va a practicar.\n\nHe comprendido lo que se me ha explicado de forma clara, con un lenguaje sencillo, habiendo resuelto\ntodas las dudas que se me han planteado, y la información complementaria que le he solicitado.\n\nMe queda claro que en cualquier momento y sin necesidad de dar ninguna explicación, puedo revocar\neste consentimiento.\n\nEstoy satisfecho con la información recibida y comprendido el alcance y riesgos de este tratamiento, y\nen por ello, DOY MI CONSENTIMIENDO, para que se me practique el tratamiento de cirugía.\n\nEn Trujillo, a ${fecha}`
  },
  {
    id: 'apicectomia', title: 'Apicectomía / Cirugía Periapical', icon: '🔬',
    subtitle: 'Cirugía del ápice radicular',
    getText: (fecha, p) => `CONSENTIMIENTO INFORMADO PARA LA REALIZACIÓN DE APICECTOMÍA\n\n${getPreamble(p)}\n\nDECLARO\n\nQue el Cirujano-Dentista Dra. Sol Vargas me ha explicado que es conveniente en mi\nsituación proceder a realizar cirugía periapical a un diente, dándome la siguiente información:\n\n1.- El propósito principal de la intervención es eliminar restos de un proceso infeccioso, (granuloma o\nquiste periapical).\n\n2.- Me ha explicado que el tratamiento que voy a recibir implica la administración de anestesia local, que\nconsiste en proporcionar, mediante una inyección, sustancias que provocan un bloqueo reversible de los\nnervios de tal manera que se inhibe transitoriamente la sensibilidad con el fin de realizar el tratamiento\nsin dolor. Me ha explicado que tendré la sensación de adormecimiento del labio o de la cara, que\nnormalmente van a desaparecer en unas 2 o 3 horas. También me ha explicado que la administración de\nla anestesia puede provocar, en el punto en el que se administre la inyección, ulceración de la mucosa y\ndolor, y menos frecuentemente, limitaciones en el movimiento de apertura de la boca, que pueden\nrequerir tratamiento ulterior, y que la anestesia puede provocar bajada de tensión que, en casos menos\nfrecuentes, pueden provocar un síncope o fibrilación ventricular, que deben tratarse posteriormente, e,\nincluso, excepcionalmente, la muerte. Comprendo que, aunque de mis antecedentes personales no se\ndeducen posibles alergias o hipersensibilidad al agente anestésico, la anestesia puede provocar\nurticaria, dermatitis, asma, edema angioneurótico (asfixia), que en casos extremos puede requerir\ntratamiento urgente.\n\n3.- La intervención consiste en la incisión a nivel de la mucosa, eliminación de la tabla ósea y por la\nventana abierta eliminar el ápice de la raíz enferma. Posteriormente se realizaría un legrado de la región\napical.\n\n4.- Aunque se me han realizado los medios diagnósticos que se han estimado precisos, comprendo que\npueden producirse procesos edematosos, inflamación, dolor, laceraciones en la mucosa de la mejilla o\ndel labio, o en la lengua, que no dependen de la forma o modo de practicarse la intervención, ni de su\ncorrecta realización, sino que son imprevisibles, en cuyo caso el facultativo tomará las medidas precisas\ny continuar el procedimiento. También se ha explicado que, aunque con menos frecuencia, y con\nindependencia de la técnica empleada en el procedimiento y de su correcta realización, puede resultar\nlesionado el nervio dentario de la mandíbula, lo que implica anestesia o insensibilidad alguna zona de la\nboca o la cara que puede ser temporal o definitiva.\n\n5.- El Dentista me ha explicado que todo acto quirúrgico lleva implícitas una serie de complicaciones\ncomunes y potencialmente serias que podrían requerir tratamientos complementarios tanto médicos\ncomo quirúrgicos, y que por mi situación actual pueden aumentar las complicaciones.\n\nHe comprendido lo que se me ha explicado por el facultativo de forma clara, con un lenguaje sencillo,\nhabiendo resuelto todas las dudas que se me han planteado, y la información complementaria que le he\nsolicitado. Me ha queda claro que en cualquier momento y sin necesidad de dar ninguna explicación,\npuedo revocar este consentimiento. Estoy satisfecho con la información recibida y comprendido el\nalcance y riesgos de este tratamiento, y en por ello, DOY MI CONSENTIMIENDO, para que se me practique\nel tratamiento de apicectomía.\n\nEn Trujillo, a ${fecha}`
  }
];

// ─── CANVAS FIRMA ──────────────────────────────────────────────────────
function FirmaCanvas({ label, sub, onFirma, firmaUrl, readonly = false }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.clearRect(0, 0, ref.current.width, ref.current.height);
    if (firmaUrl) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, ref.current.width, ref.current.height); img.src = firmaUrl; }
  }, [firmaUrl]);
  const getPos = (e, c) => { const r = c.getBoundingClientRect(); const s = e.touches ? e.touches[0] : e; return { x: (s.clientX - r.left) * (c.width / r.width), y: (s.clientY - r.top) * (c.height / r.height) }; };
  const start = e => { if (readonly) return; e.preventDefault(); drawing.current = true; last.current = getPos(e, ref.current); };
  const move = e => {
    if (!drawing.current || readonly) return; e.preventDefault();
    const p = getPos(e, ref.current);
    const ctx = ref.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; if (onFirma && ref.current) onFirma(ref.current.toDataURL('image/png')); };
  const clear = () => { if (readonly) return; ref.current.getContext('2d').clearRect(0, 0, ref.current.width, ref.current.height); onFirma && onFirma(null); };
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ borderBottom: '1px solid #333', marginBottom: 4, overflow: 'hidden', background: '#fafff9', touchAction: 'none', borderRadius: '4px 4px 0 0', border: `1px solid ${BD}` }}>
        <canvas ref={ref} width={340} height={80}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{ display: 'block', cursor: readonly ? 'default' : 'crosshair', width: '100%', height: 80 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'serif', color: '#333', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 10, color: '#666', fontFamily: 'serif' }}>{sub}</div>}
          {firmaUrl && <div style={{ fontSize: 9, color: WA, fontWeight: 700 }}>✓ Firmado</div>}
        </div>
        {!readonly && <button onClick={clear} style={{ fontSize: 9, color: RJ, background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 2 }}>Borrar</button>}
      </div>
    </div>
  );
}

// ─── MODAL DOCUMENTO ACTUALIZADO (FIRMAS Y TEXTO INTELIGENTE) ──────────
function DocModal({ doc, patient, onClose, onGuardar, saved }) {
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
  // 👉 AQUÍ LE PASAMOS EL PACIENTE AL DOCUMENTO PARA QUE LO AUTOCOMPLETE
  const [texto, setTexto] = useState(() => saved ? saved.texto : doc.getText(fecha, patient));
  const [firmaP, setFirmaP] = useState(saved?.firmaP || null);
  const [firmaDr, setFirmaDr] = useState(saved?.firmaDr || null);
  const [isSaved, setIsSaved] = useState(!!saved);
  const [saving, setSaving] = useState(false);

  // Variables inteligentes para las firmas
  const isMinor = parseInt(patient?.age) < 18;
  const labelFirmaP = isMinor ? "El Apoderado / Representante Legal" : "El Paciente";
  const nameFirmaP = isMinor ? (patient?.apoderado || 'Falta nombre apoderado') : patient?.name;
  const dniFirmaP = isMinor ? (patient?.apoderado_dni || 'Falta DNI') : patient?.doc;

  const guardar = () => {
    if (!firmaP) { alert('El paciente o apoderado debe firmar antes de guardar.'); return; }
    setSaving(true);
    setTimeout(() => {
      onGuardar(doc.id, { texto, firmaP, firmaDr, fecha, titulo: doc.title });
      setIsSaved(true); setSaving(false);
      alert('✓ Consentimiento guardado en la historia clínica');
    }, 500);
  };

  const imprimir = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Times New Roman',serif;color:#000;background:#fff}
      .page{width:210mm;min-height:297mm;margin:0 auto;padding:15mm 22mm 15mm 22mm;position:relative}
      
      .side-bar{position:fixed;right:0;top:0;bottom:0;width:8px;display:flex;flex-direction:column}
      .sb1{flex:1;background:#0D5C6B}
      .sb2{height:25px;background:#E1F5F3}
      .sb3{flex:1;background:#7AAFAD;opacity:.7}
      
      .header-container{display:flex;justify-content:space-between;alignItems:center;padding-bottom:12px;margin-bottom:12px;border-bottom:1.5px solid #C2DFDD}
      .header-left{display:flex;align-items:center;gap:15px}
      .logo-cop-print{width:65px;height:65px;object-fit:contain}
      .header-left-text .inst-cop{font-size:16px;font-weight:bold;color:#5B2D8E}
      .header-left-text .consejo-cop{font-size:11px;color:#666}

      .header-right{display:flex;flex-direction:column;align-items:flex-end}
      .logo-dra-print{width:55px;height:55px;object-fit:contain}
      .header-right-text{font-size:13px;font-weight:bold;color:#0D5C6B;margin-top:5px;fontFamily:serif}
      
      .title{text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;margin:18px 0 20px;letter-spacing:.5px}
      .body-text{white-space:pre-wrap;font-size:12.5px;line-height:1.85;text-align:justify}
      .firma-section{margin-top:40px;display:flex;justify-content:space-between;gap:50px;padding-top:10px}
      .firma-box{flex:1;text-align:center}
      .firma-line{border-bottom:1px solid #333;height:70px;margin-bottom:6px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px}
      .firma-line img{max-height:66px;max-width:95%;object-fit:contain}
      .firma-name{font-size:11px;color:#333}
      .cop-footer{margin-top:30px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.side-bar{position:fixed}}
    </style></head><body>
      <div class="side-bar"><div class="sb1"></div><div class="sb2"></div><div class="sb3"></div></div>
      <div class="page">
        <div class="header-container">
          <div class="header-left">
            <img src="/logo_web.png" alt="Logo COP" class="logo-cop-print" />
            <div class="header-left-text">
              <div class="inst-cop">Colegio Odontológico del Perú</div>
              <div class="consejo-cop">Consejo Administrativo Nacional</div>
            </div>
          </div>
          <div class="header-right">
            <img src="/drasolvargas.jpeg" alt="Logo Sol Vargas" class="logo-dra-print" />
            <div class="header-right-text">Consultorio Sol Vargas</div>
          </div>
        </div>
        
        <div class="title">${doc.title}</div>
        <div class="body-text">${texto.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="firma-section">
          <div class="firma-box">
            <div class="firma-line">${firmaP ? `<img src="${firmaP}"/>` : '&nbsp;'}</div>
            <div class="firma-name">${labelFirmaP}<br><strong>${nameFirmaP}</strong><br>DNI: ${dniFirmaP}</div>
          </div>
          <div class="firma-box">
            <div class="firma-line">${firmaDr ? `<img src="${firmaDr}"/>` : '&nbsp;'}</div>
            <div class="firma-name">El Odontólogo / Estomatólogo<br><strong>Dra. Sol Vargas</strong><br>COP 12345</div>
          </div>
        </div>
        <div class="cop-footer">Los Diamantes 178, Trujillo 13011, Perú · +51 915 054 145</div>
      </div>
    </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 10 }}>
      <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 820, maxHeight: '96vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.35)', position: 'relative' }}>

        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, display: 'flex', flexDirection: 'column', zIndex: 1 }}>
          <div style={{ flex: 1, background: P }} />
          <div style={{ height: 28, background: MT }} />
          <div style={{ flex: 1, background: MU, opacity: .7 }} />
        </div>

        <div style={{ padding: '10px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', flexShrink: 0, background: LT }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <img src="/logo_web.png" alt="Logo COP" style={{ width: 65, height: 65, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#5B2D8E', fontFamily: 'serif' }}>Colegio Odontológico del Perú</div>
              <div style={{ fontSize: 11, color: '#666', fontFamily: 'serif' }}>Consejo Administrativo Nacional</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <img src="/drasolvargas.jpeg" alt="Logo Sol Vargas" style={{ width: 65, height: 65, objectFit: 'contain' }} />
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid #ccc`, borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 14, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 18 }}>×</button>
        </div>

        <div style={{ textAlign: 'center', padding: '12px 40px', background: LT, borderBottom: `1px solid ${BD}`, flexShrink: 0, position: 'relative' }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#222', fontFamily: 'serif', letterSpacing: .4 }}>{doc.title}</div>
          <div style={{ fontSize: 10, color: '#888', marginTop: 2, fontFamily: 'serif' }}>{patient?.name} · DNI {patient?.doc} · {fecha}</div>
          {isSaved && <span style={{ position: 'absolute', right: 16, top: 16, fontSize: 10, fontWeight: 700, background: '#dcfce7', color: WA, padding: '3px 10px', borderRadius: 10, border: `1px solid ${BD}` }}>✓ Guardado</span>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 14px 16px' }}>
          {!isSaved && (
            <div style={{ fontSize: 10, color: GL, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 12px', marginBottom: 10, fontFamily: 'sans-serif' }}>
              ✏️ El documento se autocompletó con la información actual del paciente. Si nota algún error, actualice sus datos en el botón "Editar".
            </div>
          )}
          <textarea
            value={texto}
            onChange={e => !isSaved && setTexto(e.target.value)}
            readOnly={isSaved}
            style={{
              width: '100%', minHeight: 380, padding: '16px 18px',
              border: `1px solid ${isSaved ? '#86efac' : '#ccc'}`, borderRadius: 6,
              fontSize: 12.5, lineHeight: 1.9, resize: 'vertical', outline: 'none',
              color: '#111', fontFamily: '"Times New Roman",serif',
              background: isSaved ? '#fafff9' : '#fff', boxSizing: 'border-box',
              textAlign: 'justify'
            }} />

          <div style={{ marginTop: 18, border: `1px solid ${BD}`, borderRadius: 8, padding: 16, background: LT }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P, fontFamily: 'serif', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .3 }}>
              Firmas del documento
            </div>
            <div style={{ fontSize: 10, color: '#666', fontFamily: 'sans-serif', marginBottom: 14 }}>
              {isSaved
                ? 'Documento firmado y guardado. Solo lectura.'
                : 'Firma con el dedo (tablet) o con el mouse.'}
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

              {/* 👉 FIRMA INTELIGENTE: CAMBIA SI ES MENOR O MAYOR DE EDAD */}
              <FirmaCanvas
                label={labelFirmaP}
                sub={`${nameFirmaP} · DNI ${dniFirmaP}`}
                onFirma={isSaved ? null : setFirmaP}
                firmaUrl={firmaP}
                readonly={isSaved} />

              <FirmaCanvas
                label="El Odontólogo / Estomatólogo"
                sub="Dra. Sol Vargas · COP 12345"
                onFirma={isSaved ? null : setFirmaDr}
                firmaUrl={firmaDr}
                readonly={isSaved} />
            </div>
            {!firmaP && !isSaved && (
              <div style={{ marginTop: 10, fontSize: 10, color: RJ, fontFamily: 'sans-serif' }}>⚠ Se requiere la firma del paciente/apoderado para guardar.</div>
            )}
          </div>
        </div>

        <div style={{ padding: '10px 20px 10px 16px', borderTop: `1px solid ${BD}`, display: 'flex', gap: 8, flexShrink: 0, background: LT, alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#666', fontWeight: 600 }}>Cerrar</button>
          <div style={{ flex: 1 }} />
          <button onClick={imprimir}
            style={{ padding: '7px 16px', background: '#fff', color: P, border: `1px solid ${P}`, borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            🖨️ Imprimir
          </button>
          {!isSaved && (
            <button onClick={guardar} disabled={saving || !firmaP}
              style={{
                padding: '8px 20px', background: firmaP ? P : '#94a3b8', color: '#fff', border: 'none', borderRadius: 7,
                cursor: firmaP && !saving ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700
              }}>
              {saving ? 'Guardando...' : '💾 Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MÓDULO PRINCIPAL DE CONSENTIMIENTOS CON DISEÑO ACTUALIZADO ─────────────────
function Consentimientos({ patient }) {
  const [open, setOpen] = useState(null);
  const [guardados, setGuardados] = useState({});
  const guardar = (id, data) => setGuardados(p => ({ ...p, [id]: data }));
  const sg = Object.values(guardados).length;

  if (!patient) return null;

  return (
    <div style={{ padding: 20, overflowY: 'auto', height: '100%', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif' }}>
      {open && <DocModal doc={open} patient={patient} onClose={() => setOpen(null)} onGuardar={guardar} saved={guardados[open.id] || null} />}

      {/* 👉 CABECERA DE SECCIÓN DUAL ACTUALIZADA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap', background: '#faf8ff', border: `1px solid ${BD}`, padding: '10px 18px', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo_web.png" alt="Logo COP" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#5B2D8E', fontFamily: 'serif' }}>Consentimientos Informados</div>
            <div style={{ fontSize: 10, color: '#888', fontFamily: 'serif' }}>Documentos digitales · Colegio Odontológico del Perú</div>
          </div>
        </div>

        {/* CONTADOR DE FIRMADOS CON TEMA AZUL */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {sg > 0 && (
            <div style={{ background: MT, border: `1px solid ${BD}`, borderRadius: 10, padding: '6px 16px', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: P, lineHeight: 1 }}>{sg}</div>
                <div style={{ fontSize: 9, color: P, fontWeight: 700 }}>FIRMADO{sg > 1 ? 'S' : ''}</div>
              </div>
              <div style={{ fontSize: 11, color: P }}>de {DOCS.length} disponibles</div>
            </div>
          )}
          {sg === 0 && (
            <div style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 10, padding: '6px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: MU }}>Ningún documento firmado aún</div>
            </div>
          )}
          {/* Logo Dra. Sol a la derecha en la vista general */}
          <img src="/drasolvargas.jpeg" alt="Logo Sol Vargas" style={{ width: 38, height: 38, objectFit: 'contain' }} />
        </div>
      </div>

      {/* Barra de progreso de firmados teal */}
      {sg > 0 && (
        <div style={{ marginBottom: 16, background: LT, border: `1px solid ${BD}`, borderRadius: 9, padding: '8px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: P }}>Documentos firmados en esta sesión</span>
            <span style={{ fontSize: 11, color: P, fontWeight: 700 }}>{sg} / {DOCS.length}</span>
          </div>
          <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(sg / DOCS.length) * 100}%`, background: WA, borderRadius: 3, transition: 'width .4s' }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {Object.values(guardados).map((g, i) => (
              <span key={i} style={{ fontSize: 9, background: '#dcfce7', color: WA, padding: '2px 8px', borderRadius: 8, fontWeight: 700, border: '1px solid #86efac' }}>
                ✓ {g.titulo}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grid de documentos con bordes teal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 11 }}>
        {DOCS.map(c => {
          const g = guardados[c.id];
          return (
            <div key={c.id} onClick={() => setOpen(c)}
              style={{
                background: '#fff', border: `1.5px solid ${g ? '#86efac' : P + '33'}`, borderRadius: 11, padding: 14,
                cursor: 'pointer', transition: 'all .15s', position: 'relative', display: 'flex', flexDirection: 'column', gap: 8,
                boxShadow: g ? '0 2px 8px #86efac44' : 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = g ? '#16a34a' : P; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${g ? '#86efac44' : P + '22'}`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = g ? '#86efac' : P + '33'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = g ? '0 2px 8px #86efac44' : 'none'; }}>

              {/* Badge firmado */}
              {g && <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: WA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 900, boxShadow: `0 2px 6px ${WA}44` }}>✓</div>}

              <span style={{ fontSize: 24 }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: DN, lineHeight: 1.3, marginBottom: 3, paddingRight: g ? 22 : 0 }}>{c.title}</div>
                <div style={{ fontSize: 9.5, color: '#888', lineHeight: 1.4 }}>{c.subtitle}</div>
              </div>

              {g ? (
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ fontSize: 9.5, color: WA, fontWeight: 700 }}>Firmado: {g.fecha}</div>
                  <div style={{ fontSize: 9, color: '#888', marginTop: 1 }}>
                    {g.firmaP ? '✓ Paciente ' : ''}{g.firmaDr ? '· ✓ Odontólogo' : ''}
                  </div>
                  <div style={{ marginTop: 7, fontSize: 10, color: P, fontWeight: 700 }}>Ver / reimprimir →</div>
                </div>
              ) : (
                <div style={{ marginTop: 'auto', background: P, color: '#fff', padding: '5px 10px', borderRadius: 6, textAlign: 'center', fontSize: 10.5, fontWeight: 700 }}>
                  Abrir documento →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actualizado */}
      <div style={{ marginTop: 16, padding: '9px 13px', background: LT, border: `1px solid ${BD}`, borderRadius: 8, fontSize: 10, color: '#666', lineHeight: 1.7, fontFamily: 'serif' }}>
        <strong style={{ color: P }}>Flujo recomendado:</strong> Seleccionar el consentimiento del procedimiento → El paciente lee en pantalla → Completar campos punteados (DNI, domicilio) → Firmar digitalmente → Guardar → Imprimir copia para el paciente.
      </div>
    </div>
  );
}

function Historia({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView }) {
  // 1. Esto DEBE ir primero que todo
  const [tab, setTab] = useState('filiacion');
  const [patData, setPatData] = useState(patient);
 
  // 2. Sincronización
  useEffect(() => {
    setPatData(patient);
  }, [patient]);
 
  // --- 2. ESTADOS DE ORTODONCIA ---
  const [subTabOrto, setSubTabOrto] = useState('examen');
  const [ortoForm, setOrtoForm] = useState({});
  const [savingOrto, setSavingOrto] = useState(false);
  // --- ESTADOS PARA PLAN DE TRABAJO ---
  const [planTrabajoForm, setPlanTrabajoForm] = useState({});
  const [savingTrabajo, setSavingTrabajo] = useState(false);
  // --- ESTADOS PARA PLAN DE TRATAMIENTO ---
  const [planTrataForm, setPlanTrataForm] = useState({});
  const [savingTrata, setSavingTrata] = useState(false);
 
  const handlePlanTrata = (campo, valor) => {
    setPlanTrataForm(prev => ({ ...prev, [campo]: valor }));
  };
 
  // Función de guardado específica para Plan de Tratamiento
  const handleSavePlanTrata = async () => {
    setSavingTrata(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
 
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ plan_tratamiento: planTrataForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, plan_tratamiento: planTrataForm }]);
      error = res.error;
    }
 
    if (error) alert("Error al guardar Plan de Tratamiento: " + error.message);
    else alert("✅ Plan de Tratamiento guardado con éxito.");
    setSavingTrata(false);
  };
 
  const handlePlanTrabajo = (campo, valor) => {
    setPlanTrabajoForm(prev => ({ ...prev, [campo]: valor }));
  };
 
  // Actualizamos el useEffect de carga para que también traiga el Plan de Trabajo
  useEffect(() => {
    if (patData && patData.id) {
      const cargarDatosOrto = async () => {
        const { data } = await supabase.from('ortodoncia').select('*').eq('paciente_id', patData.id).maybeSingle();
        if (data) {
          if (data.examen_clinico) setOrtoForm(data.examen_clinico);
          if (data.plan_trabajo) setPlanTrabajoForm(data.plan_trabajo);
          if (data.plan_tratamiento) setPlanTrataForm(data.plan_tratamiento);
          if (data.fotografias) setFotosOrto(data.fotografias);
          if (data.resumen) setResumenForm(data.resumen);
        }
      };
      cargarDatosOrto();
    }
  }, [patData]);
 
  // Función de guardado específica para Plan de Trabajo
  const handleSavePlanTrabajo = async () => {
    setSavingTrabajo(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
 
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ plan_trabajo: planTrabajoForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, plan_trabajo: planTrabajoForm }]);
      error = res.error;
    }
 
    if (error) alert("Error al guardar Plan de Trabajo: " + error.message);
    else alert("✅ Plan de Trabajo guardado con éxito.");
    setSavingTrabajo(false);
  };
 
  // --- ESTADOS PARA RESUMEN ---
  const [resumenForm, setResumenForm] = useState({});
  const [savingResumen, setSavingResumen] = useState(false);
 
  const handleResumen = (campo, valor) => {
    setResumenForm(prev => ({ ...prev, [campo]: valor }));
  };
 
  const handleSaveResumen = async () => {
    setSavingResumen(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
 
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ resumen: resumenForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, resumen: resumenForm }]);
      error = res.error;
    }
 
    if (error) alert("Error al guardar Resumen: " + error.message);
    else alert("✅ Resumen guardado con éxito.");
    setSavingResumen(false);
  };
 
  // --- ESTADOS PARA FOTOGRAFÍAS DE ORTODONCIA ---
  const [fotosOrto, setFotosOrto] = useState({});
  const [savingFotosOrto, setSavingFotosOrto] = useState(false);
 
  const handleUploadFotoOrto = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingFotosOrto(true);
 
    const fileExt = file.name.split('.').pop();
    const fileName = `orto-${patData.id}-${Date.now()}.${fileExt}`;
 
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
 
    if (uploadError) {
      alert('Error al subir el archivo: ' + uploadError.message);
      setSavingFotosOrto(false);
      return;
    }
 
    const { data: publicUrlData } = supabase.storage.from('imagenes').getPublicUrl(fileName);
    const nuevaFoto = { url: publicUrlData.publicUrl, date: new Date().toLocaleDateString('es-PE'), ext: fileExt };
    const nuevoEstadoFotos = { ...fotosOrto, [key]: nuevaFoto };
 
    setFotosOrto(nuevoEstadoFotos);
 
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    if (existe) {
      await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', existe.id);
    } else {
      await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, fotografias: nuevoEstadoFotos }]);
    }
 
    setSavingFotosOrto(false);
  };
 
  const handleDeleteFotoOrto = async (key, url) => {
    if (!window.confirm(`¿Eliminar ${key} permanentemente?`)) return;
    setSavingFotosOrto(true);
 
    try {
      const fileName = url.split('/').pop();
      await supabase.storage.from('imagenes').remove([fileName]);
 
      const nuevoEstadoFotos = { ...fotosOrto };
      delete nuevoEstadoFotos[key];
 
      setFotosOrto(nuevoEstadoFotos);
 
      const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
      if (existe) await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', existe.id);
 
    } catch (error) {
      alert("Hubo un error al eliminar.");
    }
    setSavingFotosOrto(false);
  };
 
  const handleOrto = (campo, valor) => {
    setOrtoForm(prev => ({ ...prev, [campo]: valor }));
  };
 
  useEffect(() => {
    if (patData && patData.id) {
      const cargarOrto = async () => {
        const { data } = await supabase.from('ortodoncia').select('*').eq('paciente_id', patData.id).maybeSingle();
        if (data && data.examen_clinico) {
          setOrtoForm(data.examen_clinico);
        }
      };
      cargarOrto();
    }
  }, [patData]);
 
  const handleSaveOrto = async () => {
    setSavingOrto(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
 
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ examen_clinico: ortoForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, examen_clinico: ortoForm }]);
      error = res.error;
    }
 
    if (error) alert("Error al guardar ortodoncia: " + error.message);
    else alert("✅ Examen Clínico de Ortodoncia guardado con éxito.");
 
    setSavingOrto(false);
  };
 
  // --- 3. FUNCIONES AYUDANTES ORTODONCIA ---
  const SectionHeader = ({ title }) => (
    <div style={{ color: '#0087b3', fontSize: '14px', fontWeight: 700, marginTop: '35px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {title} <span style={{ fontSize: '18px', cursor: 'pointer' }}>⌃</span>
    </div>
  );
 
  const renderSelectOrto = (label, field, options, hasNote = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={ortoForm[field] || ''} onChange={e => handleOrto(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasNote && (
        <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, fontStyle: 'italic', color: '#64748b', fontSize: '12.5px', height: '36px', marginTop: '4px' }} />
      )}
    </div>
  );
 
  const renderSelectTrata = (label, field, options) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={planTrataForm[field] || ''} onChange={e => handlePlanTrata(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
 
  const renderIntraRow = (label, field, opts) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #f1f5f9',
      gap: '20px',
      width: '100%'
    }}>
      <div style={{
        width: '180px',
        minWidth: '180px',
        fontSize: '13px',
        color: '#475569',
        fontWeight: 600
      }}>
        {label}
      </div>
 
      <div style={{
        display: 'flex',
        gap: '15px',
        flexShrink: 0,
        alignItems: 'center'
      }}>
        {opts.map(opt => (
          <label key={opt} style={{
            fontSize: '12.5px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}>
            <input
              type="checkbox"
              checked={ortoForm[`${field}_${opt}`] || false}
              onChange={e => handleOrto(`${field}_${opt}`, e.target.checked)}
              style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px' }}
            />
            {opt}
          </label>
        ))}
      </div>
 
      <div style={{
        flex: 1,
        minWidth: '100px'
      }}>
        <input
          placeholder="Nota..."
          value={ortoForm[`${field}_nota`] || ''}
          onChange={e => handleOrto(`${field}_nota`, e.target.value)}
          style={{
            ...inputStyleDoc,
            width: '100%',
            height: '34px',
            fontSize: '12.5px',
            padding: '4px 12px',
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  );
 
  // --- 4. ESTADOS GENERALES DE HISTORIA ---
  const [isEditingFiliacion, setIsEditingFiliacion] = useState(false);
  const [plan, setPlan] = useState([
    { id: 1, name: 'Control ortodoncia', tooth: '14-23', status: 'en_curso', cost: 80, paid: 80, date: '10 Jun 2025', sessions: 1 },
    { id: 2, name: 'Blanqueamiento clínico', tooth: '—', status: 'pendiente', cost: 180, paid: 0, date: '—', sessions: 1 },
    { id: 3, name: 'Radiografía panorámica', tooth: '—', status: 'completado', cost: 45, paid: 45, date: '10 Jun 2025', sessions: 1 },
  ]);
  const [showTreatPicker, setShowTreatPicker] = useState(false);
  const TABS = [{ id: 'filiacion', lbl: 'Filiación' }, { id: 'anamnesis', lbl: 'Anamnesis' }, { id: 'odontograma', lbl: 'Odontograma' }, { id: 'ortodoncia', lbl: 'Ortodoncia' }, { id: 'plan', lbl: 'Plan trat.' }, { id: 'evolucion', lbl: 'Evolución' }, { id: 'recetas', lbl: 'Recetas' }, { id: 'imagenes', lbl: 'Imágenes' }, { id: 'presupuesto', lbl: 'Presupuesto' }, { id: 'consentimientos', lbl: 'Consentimientos' }];
 
  const ORTO_TABS = [
    { id: 'examen', lbl: 'Examen clínico' },
    { id: 'trabajo', lbl: 'Plan de Trabajo' },
    { id: 'tratamiento', lbl: 'Plan de tratamiento' },
    { id: 'resumen', lbl: 'Resumen' },
    { id: 'fotografias', lbl: 'Fotografías' }
  ];
 
  const ORTO_CAJAS = [
    { key: 'Rx Panorámica', icon: '🦷', accept: 'image/*' },
    { key: 'Rx Cefalométrica', icon: '📐', accept: 'image/*' },
    { key: 'Rx Periapical', icon: '🔍', accept: 'image/*' },
    { key: 'Foto frontal', icon: '😁', accept: 'image/*' },
    { key: 'Foto lateral izquierda', icon: '📷', accept: 'image/*' },
    { key: 'Foto lateral derecha', icon: '📸', accept: 'image/*' },
    { key: 'Foto oclusal superior', icon: '👄', accept: 'image/*' },
    { key: 'Foto oclusal inferior', icon: '👅', accept: 'image/*' },
    { key: 'Modelo inicial', icon: '🧊', accept: 'image/*' },
    { key: 'Plan de tratamiento', icon: '📄', accept: '.pdf,.ppt,.pptx,image/*' }
  ];
 
  const [anamnesisData, setAnamnesisData] = useState({});
  const [imagenesList, setImagenesList] = useState([]);
  const [saving, setSaving] = useState(false);
 
  const [searchTerm, setSearchTerm] = useState('');
  const [dbPatients, setDbPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
 
  // --- BUSCADOR ---
  useEffect(() => {
    if (!patient) {
      const fetchPatients = async () => {
        setLoadingPatients(true);
        const { data, error } = await supabase.from('pacientes').select('*').order('name', { ascending: true });
        if (!error && data) {
          const unicos = [];
          const nombresVistos = new Set();
          data.forEach(p => {
            const nombreLimpio = (p.name || '').trim().toLowerCase();
            if (nombreLimpio && !nombresVistos.has(nombreLimpio)) {
              nombresVistos.add(nombreLimpio);
              unicos.push(p);
            }
          });
          setDbPatients(unicos);
        }
        setLoadingPatients(false);
      };
      fetchPatients();
    }
  }, [patient]);
 
  // --- FILIACION EDIT ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
 
  useEffect(() => {
    const datosDelPaciente = patData || patient;
    if (datosDelPaciente) setEditForm(datosDelPaciente);
  }, [patData, patient]);
 
  const handleSaveEditPatient = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from('pacientes')
      .update({
        name: editForm.name, doc: editForm.doc, tipo_doc: editForm.tipo_doc,
        phone: editForm.phone, cod_pais: editForm.cod_pais, email: editForm.email,
        direccion: editForm.direccion, sexo: editForm.sexo, birthDate: editForm.birthDate,
        age: editForm.age, blood: editForm.blood, allergies: editForm.allergies,
        num_hc: editForm.num_hc, pais_nacimiento: editForm.pais_nacimiento,
        ocupacion: editForm.ocupacion, fuente_captacion: editForm.fuente_captacion,
        linea_negocio: editForm.linea_negocio, apoderado: editForm.apoderado,
        apoderado_dni: editForm.apoderado_dni, parentesco: editForm.parentesco
      })
      .eq('id', patData.id)
      .select();
 
    if (error) alert("Error al guardar en Supabase: " + error.message);
    else if (data && data.length > 0) {
      setPatData(data[0]);
      setIsEditingFiliacion(false);
      alert("✅ Datos guardados y bloqueados correctamente.");
    }
    setSaving(false);
  };
 
  const handleCancelEdit = () => {
    setEditForm(patData);
    setIsEditingFiliacion(false);
  };
 
  // --- HISTORIA CLOUD ---
  useEffect(() => {
    const loadCloudData = async () => {
      if (!patient?.id) return;
      setTeeth({}); setTeethEvolucion({});
      if (typeof setAnamnesisData !== 'undefined') setAnamnesisData({});
      if (typeof setPlan !== 'undefined') setPlan([]);
      if (typeof setImagenesList !== 'undefined') setImagenesList([]);
 
      const { data } = await supabase.from('historias').select('*').eq('patient_id', patient.id).maybeSingle();
 
      if (data) {
        if (data.odontograma && Object.keys(data.odontograma).length > 0) setTeeth(data.odontograma);
        if (data.evolucion && Object.keys(data.evolucion).length > 0) setTeethEvolucion(data.evolucion);
        if (data.anamnesis) setAnamnesisData(data.anamnesis);
        if (data.plan_tratamiento) setPlan(data.plan_tratamiento);
        if (data.imagenes) setImagenesList(data.imagenes);
      }
    };
    loadCloudData();
  }, [patient, setTeeth, setTeethEvolucion]);
 
  const saveAllToCloud = async () => {
    setSaving(true);
    const limpiarDientes = (dientesBase) => {
      const limpios = {};
      Object.keys(dientesBase || {}).forEach(num => {
        const pieza = dientesBase[num];
        const superficies = getSurfs(num);
        const valores = superficies.map(s => pieza[s]).filter(v => v && v !== 'normal');
 
        const esTodoIgual = valores.length === superficies.length && valores.every(v => v === valores[0]);
 
        if (esTodoIgual) {
          limpios[num] = { todaPieza: valores[0] };
          if (pieza.note) limpios[num].note = pieza.note;
        } else {
          const filtrada = {};
          let tieneHallazgo = false;
          Object.keys(pieza).forEach(k => {
            const v = pieza[k];
            if (k === 'note' && v && v.trim() !== '') { filtrada[k] = v; tieneHallazgo = true; }
            else if (k !== 'note' && v && v !== 'normal') { filtrada[k] = v; tieneHallazgo = true; }
          });
          if (tieneHallazgo) limpios[num] = filtrada;
        }
      });
      return limpios;
    };
 
    const cleanInicial = limpiarDientes(teeth);
    const cleanEvo = limpiarDientes(teethEvolucion);
 
    setTeeth(cleanInicial);
    setTeethEvolucion(cleanEvo);
 
    const { error } = await supabase.from('historias').upsert({
      patient_id: patient.id,
      odontograma: cleanInicial,
      evolucion: cleanEvo,
      anamnesis: anamnesisData,
      plan_tratamiento: plan,
      imagenes: imagenesList
    }, { onConflict: 'patient_id' });
 
    if (error) alert("Error al guardar: " + error.message);
    else alert("¡Datos guardados con éxito!");
    setSaving(false);
  };
 
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaving(true);
 
    const fileExt = file.name.split('.').pop();
    const fileName = `${patient.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
 
    if (uploadError) {
      alert('Error al subir la imagen: ' + uploadError.message);
      setSaving(false);
      return;
    }
 
    const { data: publicUrlData } = supabase.storage.from('imagenes').getPublicUrl(fileName);
    const nuevaImagen = { type: 'Radiografía / Foto', date: new Date().toLocaleDateString('es-PE'), url: publicUrlData.publicUrl };
    const nuevaLista = [...imagenesList, nuevaImagen];
 
    setImagenesList(nuevaLista);
    await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    setSaving(false);
    alert("¡Imagen subida y guardada correctamente!");
  };
 
  const handleDeleteImage = async (indexToDelete, imageUrl) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta imagen permanentemente?")) return;
    setSaving(true);
 
    try {
      const fileName = imageUrl.split('/').pop();
      const { error: storageError } = await supabase.storage.from('imagenes').remove([fileName]);
      if (storageError) console.error("Error al borrar del storage:", storageError);
 
      const nuevaLista = imagenesList.filter((_, i) => i !== indexToDelete);
      setImagenesList(nuevaLista);
      await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    } catch (error) {
      alert("Hubo un error al intentar eliminar la imagen.");
    } finally {
      setSaving(false);
    }
  };
 
  if (!patient) {
    const filteredPatients = dbPatients.filter(p => {
      const term = searchTerm.toLowerCase();
      const n = (p.name || '').toLowerCase();
      const d = (p.doc || '').toLowerCase();
      const ph = (p.phone || '').toLowerCase();
      return n.includes(term) || d.includes(term) || ph.includes(term);
    });
 
    return (
      <div style={{ padding: '30px', flex: 1, overflowY: 'auto', background: '#F0F4F4' }}>
        <div style={{ width: '100%', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 45, height: 45, background: P, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px ${P}33` }}>
                <span style={{ fontSize: 22 }}>🔍</span>
              </div>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: DN, margin: 0, letterSpacing: '-0.5px' }}>Buscador de Pacientes</h1>
                <p style={{ fontSize: 13, color: MU, margin: 0 }}>Accede a la historia clínica completa de tus pacientes registrados.</p>
              </div>
            </div>
 
            <div style={{ position: 'relative', background: '#fff', padding: '8px', borderRadius: 16, border: `1px solid ${BD}`, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar por Nombre, DNI o Número de Celular..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '16px 20px', borderRadius: 12,
                  border: 'none', fontSize: 16, outline: 'none',
                  boxSizing: 'border-box', color: DN, background: 'transparent'
                }}
              />
              <div style={{ padding: '0 20px', color: P, fontWeight: 700, fontSize: 13, borderLeft: `1px solid ${BD}` }}>
                {filteredPatients.length} Registros
              </div>
            </div>
          </div>
 
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filteredPatients.map(p => (
              <div key={p.id} onClick={() => setView('historia', p)}
                style={{
                  background: '#fff', border: `1px solid ${BD}`, borderRadius: 18, padding: '20px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 15,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                  overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = P; e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `0 20px 25px -5px ${P}15`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = BD; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
                }}>
 
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: P }} />
 
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 15, background: `linear-gradient(135deg, ${MT} 0%, #fff 100%)`, border: `1.5px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: P, flexShrink: 0 }}>
                    {ini(p.name)}
                  </div>
 
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: DN, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, background: '#F1F5F9', color: MU, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{p.sexo || 'N/A'}</span>
                      <span style={{ fontSize: 10, background: '#F1F5F9', color: MU, padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{p.age ? `${p.age} años` : 'Edad N/A'}</span>
                    </div>
                  </div>
                </div>
 
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 15, borderTop: `1px solid ${MT}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 9, color: MU, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Documento</span>
                    <span style={{ fontSize: 12, color: DN, fontWeight: 600 }}>🆔 {p.doc || '---'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 9, color: MU, fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>WhatsApp</span>
                    <span style={{ fontSize: 12, color: DN, fontWeight: 600 }}>📱 {p.phone || '---'}</span>
                  </div>
                </div>
 
                {p.direccion && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 9, color: MU, fontWeight: 700, textTransform: 'uppercase' }}>Ubicación</span>
                    <span style={{ fontSize: 11, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {p.direccion}</span>
                  </div>
                )}
 
                <div style={{ marginTop: '5px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: P }}>Ver Expediente →</div>
              </div>
            ))}
 
            {!loadingPatients && filteredPatients.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: 20, border: `2px dashed ${BD}` }}>
                <div style={{ fontSize: 50, marginBottom: 20 }}>👤</div>
                <h3 style={{ color: DN, margin: '0 0 10px 0' }}>No encontramos al paciente</h3>
                <p style={{ color: MU, maxWidth: 400, margin: '0 auto' }}>No hay resultados para <b>"{searchTerm}"</b>. Verifica los datos o registra al paciente desde la Agenda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
 
      {/* CABECERA DE HISTORIA */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BD}`, padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: P, flexShrink: 0 }}>{ini(patData?.name || patient.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: DN }}>{patData?.name || patient.name}</div>
          </div>
          <div style={{ fontSize: 10, color: MU, marginTop: 3 }}>
            📞 {patData?.phone || 'Sin celular'} · ✉ {patData?.email || 'Sin email'} · DNI: {patData?.doc} · {patData?.age} años · {patData?.blood || 'O+'} {patData?.sexo ? `· ${patData.sexo}` : ''}
          </div>
          {(patData?.direccion) && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>📍 {patData.direccion}</div>}
        </div>
        {patData?.allergies && patData.allergies !== 'Ninguna' && <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: RJ, padding: '4px 10px', borderRadius: 10 }}>⚠ Alergia: {patData.allergies}</span>}
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: MU }}>Próx. cita</div><div style={{ fontSize: 12, fontWeight: 700, color: P }}>{patData?.nextVisit || '---'}</div></div>
 
        <button onClick={saveAllToCloud} style={{ background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? '⏳...' : '💾 Guardar en Nube'}
        </button>
 
        <button style={{ background: WA, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💬</button>
      </div>
 
      {/* PESTAÑAS PRINCIPALES */}
      <div style={{ display: 'flex', gap: 1, padding: '5px 14px', background: LT, borderBottom: `1px solid ${BD}`, flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '5px 13px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? P : 'transparent', color: tab === t.id ? '#fff' : MU, whiteSpace: 'nowrap', transition: 'all .15s' }}>
            {t.lbl}
          </div>
        ))}
      </div>
 
      <div style={{ flex: 1, overflow: 'hidden' }}>
 
        {/* --- PESTAÑA ORTODONCIA --- */}
        {tab === 'ortodoncia' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
 
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', gap: '20px', background: '#fff', flexShrink: 0, overflowX: 'auto' }}>
                {ORTO_TABS.map(t => (
                  <div key={t.id} onClick={() => setSubTabOrto(t.id)}
                    style={{
                      padding: '18px 4px', cursor: 'pointer', fontSize: '13.5px',
                      fontWeight: subTabOrto === t.id ? '700' : '500',
                      color: subTabOrto === t.id ? '#0087b3' : '#64748b',
                      borderBottom: subTabOrto === t.id ? `2px solid #0087b3` : '2px solid transparent',
                      transition: 'all 0.2s ease', marginBottom: '-1px', whiteSpace: 'nowrap'
                    }}>
                    {t.lbl}
                  </div>
                ))}
              </div>
 
              <div style={{ padding: '30px', flex: 1, overflowY: 'auto', background: '#fff' }}>
 
                {subTabOrto === 'examen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
 
                    <SectionHeader title="Sección" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {['Motivo de consulta', 'Historia médica', 'Historia odontológica', 'Historia Familiar'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{f}</label>
                          <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={inputStyleDoc} />
                        </div>
                      ))}
                    </div>
 
                    <SectionHeader title="Examen Extraoral" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Cráneo', 'craneo', ['Mesocéfalo', 'Braquicéfalo', 'Dolicéfalo'])}
                      {renderSelectOrto('Cara', 'cara', ['Mesofacial', 'Braquifacial', 'Dolicofacial'])}
                      {renderSelectOrto('Musculatura', 'musculatura', ['Normal', 'Alterada'])}
                      {renderSelectOrto('ATM', 'atm', ['Apertura bucal normal', 'Dolor al despertar', 'Dolor agudo', 'Dolor espontáneo', 'Click articular', 'Crepitación', 'Dolor a la palpación', 'Sensibilidad a la palpación', 'Apertura bucal disminuida'])}
 
                      {renderSelectOrto('Mentón', 'menton_ext', ['Normal', 'Pobre', 'Prominente'])}
                      {renderSelectOrto('ANL', 'anl', ['Normal', 'Cerrado', 'Abierto', 'Cerrado con nariz baja', 'Abierto con nariz respingada'])}
                      {renderSelectOrto('Fonación', 'fonacion', ['Normal', 'Rotacismo', 'Seseo'])}
                      {renderSelectOrto('Deglución', 'deglucion', ['Normal', 'Atípica tipo I', 'Atípica tipo II', 'Atípica tipo III', 'Atípico tipo IV'])}
 
                      {renderSelectOrto('Respiración', 'respiracion', ['Normal', 'Mixta'])}
                      {renderSelectOrto('Permeabilidad nasal', 'permeabilidad', ['Normal', 'Disminuida'])}
                      {renderSelectOrto('Hábitos', 'habitos', ['Ausentes', 'Respiración oral', 'Succión del pulgar', 'Succión de otro dedo', 'Succión de objetos'])}
                    </div>
                    <textarea value={ortoForm.extraoral_notas || ''} onChange={e => handleOrto('extraoral_notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', marginTop: '20px', resize: 'none' }} />
 
                    <SectionHeader title="Asimetría facial" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Plano bipupilar', 'plano_bipupilar', ['Adecuado', 'Discrepante'])}
                      {renderSelectOrto('Tabique nasal', 'tabique_nasal', ['Alineado', 'Desviado a la derecha', 'Desviado a la izquierda'])}
                      {renderSelectOrto('Comisura bucales', 'comisuras', ['Niveladas', 'Discrepantes a la derecha', 'Discrepantes a la izquierda'])}
                    </div>
 
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 250px 150px', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Filtrum</div>
                      <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.filtrum_alineado || false} onChange={e => handleOrto('filtrum_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Desviación lateral del filtrum</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.filtrum_izq || false} onChange={e => handleOrto('filtrum_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.filtrum_der || false} onChange={e => handleOrto('filtrum_der', e.target.checked)} /> Derecha</label>
                      </div>
                    </div>
 
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 250px 150px', gap: '15px', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Mentón</div>
                      <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.menton_alineado || false} onChange={e => handleOrto('menton_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Desviación lateral del mentón</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.menton_izq || false} onChange={e => handleOrto('menton_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.menton_der || false} onChange={e => handleOrto('menton_der', e.target.checked)} /> Derecha</label>
                      </div>
                    </div>
                    <textarea value={ortoForm.asimetria_notas || ''} onChange={e => handleOrto('asimetria_notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', marginTop: '20px', resize: 'none' }} />
 
                    <SectionHeader title="Perfil AP y proyección sagital de maxilares" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Tipo de Perfil', 'perfil_ap_tipo', ['Convexo', 'Recto', 'Cóncavo'])}
                      {renderSelectOrto('Tercio Medio', 'perfil_ap_medio', ['1/3 medio normal', '1/3 medio pobre', '1/3 medio aumentado'])}
                      {renderSelectOrto('Tercio Inferior', 'perfil_ap_inf', ['1/3 inferior normal', '1/3 inferior pobre', '1/3 inferior aumentado'])}
                    </div>
 
                    <SectionHeader title="Perfil y desarrollo vertical de maxilares" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Divergencia', 'perfil_vert_div', ['Normodivergente', 'Hipodivergente', 'Hiperdivergente'])}
                      {renderSelectOrto('Tercio Medio', 'perfil_vert_medio', ['1/3 medio normal', '1/3 medio pobre', '1/3 medio aumentado'])}
                      {renderSelectOrto('Tercio Inferior', 'perfil_vert_inf', ['1/3 inferior normal', '1/3 inferior pobre', '1/3 inferior aumentado'])}
                    </div>
 
                    <SectionHeader title="Labios" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Relación', 'labios_relacion', ['En relación normal', 'En relación alterada'])}
                      {renderSelectOrto('Posición', 'labios_posicion', ['En posición retruída', 'En posición protuída', 'En posición normal'])}
                      {renderSelectOrto('Competencia', 'labios_competencia', ['Competentes con sellado suave', 'Competentes con sellado excesivo', 'Incompetentes separados por'], true)}
                      {renderSelectOrto('Tonicidad', 'labios_tonicidad', ['Hipotónicos', 'Normales', 'Hipértonicos'])}
                    </div>
 
                    <SectionHeader title="Labio inferior" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Posición', 'labio_inf_pos', ['En posición retruída', 'En posición protuída', 'En posición normal'], true)}
                      {renderSelectOrto('Eversión', 'labio_inf_ever', ['Evertido', 'No evertido'])}
                      {renderSelectOrto('Grosor', 'labio_inf_grosor', ['Delgado', 'Grueso', 'Promedio'])}
                    </div>
 
                    <SectionHeader title="Labio superior" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Posición', 'labio_sup_pos', ['En posición retruída', 'En posición protuída', 'En posición normal'], true)}
                      {renderSelectOrto('Eversión', 'labio_sup_ever', ['Evertido', 'No evertido'])}
                      {renderSelectOrto('Grosor', 'labio_sup_grosor', ['Delgado', 'Grueso', 'Promedio'])}
                    </div>
 
                    <SectionHeader title="Sonrisa" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Altura', 'sonrisa_altura', ['Gingival (alta)', 'Media', 'Baja'])}
                      {renderSelectOrto('Corredores', 'sonrisa_corredores', ['Con corredores bucales normales', 'Con corredores bucales cerrados', 'Con corredores bucales amplios'])}
                      {renderSelectOrto('Acompañamiento', 'sonrisa_acomp', ['Acompañada con el labio inferior', 'No acompañada con el labio inferior'])}
                    </div>
                    <textarea value={ortoForm.sonrisa_notas || ''} onChange={e => handleOrto('sonrisa_notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', marginTop: '20px', resize: 'none' }} />
 
                    <SectionHeader title="Examen Intraoral" />
                    <div>
                      {renderIntraRow('Mucosa de labio', 'mucosa_labio', ['Normal', 'Alterada'])}
                      {renderIntraRow('Mucosa vestibular', 'mucosa_vestibular', ['Normal', 'Alterada'])}
                      {renderIntraRow('Frenillos vestibulares', 'frenillos_vest', ['Normal', 'Alterada'])}
                      {renderIntraRow('Mucosa palatina', 'mucosa_palatina', ['Normal', 'Alterada'])}
                      {renderIntraRow('Mucosa orofaríngea', 'mucosa_oro', ['Normal', 'Alterada'])}
                      {renderIntraRow('Amígdalas', 'amigdalas', ['Normales', 'Hipertróficas', 'Hipertróficas y crípticas'])}
                    </div>
 
                    <SectionHeader title="Lengua" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Tonicidad', 'lengua_tonicidad', ['Normotónica', 'Hipotónica'])}
                      {renderSelectOrto('Posición', 'lengua_pos', ['Posición normal', 'Posición Baja'])}
                      {renderSelectOrto('Movilidad', 'lengua_mov', ['Movilidad normal', 'Hipomovilidad', 'Hipermovilidad'])}
                      {renderSelectOrto('Frenillo', 'lengua_frenillo', ['Frenillo lingual normal', 'Frenillo lingual corto'])}
                    </div>
 
                    <SectionHeader title="Gíngiva" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Gíngiva incisivos inferiores (Grosor)', 'gingiva_inf_grosor', ['Grosor normal', 'Delgada', 'Delgada y traslúcida', 'Gruesa', 'Muy gruesa'])}
                      {renderSelectOrto('Gíngiva incisivos inferiores (Adherida)', 'gingiva_inf_adherida', ['Encía adherida de 2.5mm', 'Encía adherida de 3 mm', 'Encía adherida de 3.5mm', 'Encía adherida de 4mm', 'Encía adherida de 4.5mm'])}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Evaluación general (Grosor)', 'gingiva_gral_grosor', ['Grosor normal', 'Delgada', 'Delgada y traslúcida', 'Gruesa', 'Muy gruesa'])}
                      {renderSelectOrto('Evaluación general (Margen)', 'gingiva_gral_margen', ['Margen gingival', 'Retraída en piezas'], true)}
                    </div>
 
                    <SectionHeader title="Arcos" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Arco superior', 'arco_sup_forma', ['Ovoide', 'Triangular', 'Cuadrado'])}
                      {renderSelectOrto('Simetría superior', 'arco_sup_sim', ['Simétrico', 'Asimétrico'])}
                      {renderSelectOrto('Alineación superior', 'arco_sup_alin', ['Alineado', 'Apiñado en', 'Espaciado en'], true)}
                      {renderSelectOrto('DAD superior', 'arco_sup_dad', ['Sin DAD', 'Con DAD de'], true)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Arco inferior', 'arco_inf_forma', ['Ovoide', 'Triangular', 'Cuadrado'])}
                      {renderSelectOrto('Simetría inferior', 'arco_inf_sim', ['Simétrico', 'Asimétrico'])}
                      {renderSelectOrto('Alineación inferior', 'arco_inf_alin', ['Alineado', 'Apiñado en', 'Espaciado en'], true)}
                      {renderSelectOrto('DAD inferior', 'arco_inf_dad', ['Sin DAD', 'Con DAD de'], true)}
                    </div>
 
                    <SectionHeader title="Dientes y Alteraciones" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {['Error molar derecho', 'Error molar izquierdo', 'Dientes ausentes', 'Alteraciones de número, forma y tamaño de dientes'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{f}</label>
                          <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={inputStyleDoc} />
                        </div>
                      ))}
                    </div>
 
                    <SectionHeader title="Relaciones Oclusales" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', rowGap: '30px' }}>
                      {renderSelectOrto('Relación molar derecha', 'rel_molar_der', ['Llave molar ideal', 'Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación molar izquierda', 'rel_molar_izq', ['Llave molar ideal', 'Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación canina derecha', 'rel_can_der', ['Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación canina izquierda', 'rel_can_izq', ['Clase I', 'Clase II', 'Clase III', 'NR'])}
 
                      {renderSelectOrto('Mordida invertida', 'mord_invertida', ['Dentaria', 'Funcional', 'Esquelética'], true)}
                      {renderSelectOrto('Resalte horizontal', 'res_horizontal', ['NR', 'Normal', 'Aumentado', 'Invertido'], true)}
                      {renderSelectOrto('Curva de Spee', 'curva_spee', ['NR', 'Normal', 'Acentuada'], true)}
                      {renderSelectOrto('Resalte vertical', 'res_vertical', ['NR', 'Normal', 'Acentuada'], true)}
 
                      {renderSelectOrto('Des. Vert. Proceso Alveolar Sup', 'des_vert_sup', ['Normal', 'Disminuido', 'Aumentado'])}
                      {renderSelectOrto('Mordida abierta anterior', 'mord_abierta_ant', ['Dentaria', 'Dentialveolar por hábito', 'Esquelética'])}
                      {renderSelectOrto('Mordida abierta posterior', 'mord_abierta_post', ['Dentaria', 'Dentoalveolar por hábito', 'Esquelética', 'Completa'], true)}
                      {renderSelectOrto('Dimensión transversal maxilar', 'dim_trans_max', ['Normal', 'Disminuida', 'Aumentada'], true)}
 
                      {renderSelectOrto('Mordida cruzada posterior', 'mord_cruz_post', ['Ausente', 'Presente'])}
                      {renderSelectOrto('Altura Cusp. Palatinas Sup.', 'alt_cusp_pal', ['Normales', 'Altas', 'Bajas'])}
                      {renderSelectOrto('Línea media superior', 'linea_med_sup', ['Alineada', 'Discrepante a la derecha', 'Discrepante a la izquierda'], true)}
                      {renderSelectOrto('Línea media inferior', 'linea_med_inf', ['Alineada', 'Discrepante a la derecha', 'Discrepante a la izquierda'], true)}
 
                      {renderSelectOrto('Incisivos superiores', 'inc_sup', ['Normales', 'Vestibularizados', 'Palatinizados', 'Protruidos', 'Retruidos', 'Vestibularizados y protruídos', 'Vestibularizados y retruídos', 'Palatinizados y protruídos', 'Palatinizados y retruídos'])}
                      {renderSelectOrto('Incisivos inferiores', 'inc_inf', ['Normales', 'Vestibularizados', 'Palatinizados', 'Protruidos', 'Retruidos', 'Vestibularizados y protruídos', 'Vestibularizados y retruídos', 'Lingualizados y protruídos', 'Lingualizados y retruídos'])}
                      {renderSelectOrto('Patrón de Clase II-2', 'patron_clase_2', ['Tipo A', 'Tipo B', 'Tipo C'], true)}
                    </div>
 
                    <SectionHeader title="Conclusión" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
                      {['Observaciones', 'Maloclusión'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{f}</label>
                          <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} placeholder="Anotaciones adicionales..." style={inputStyleDoc} />
                        </div>
                      ))}
                    </div>
 
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                      <button onClick={handleSaveOrto} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 40px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {savingOrto ? 'Guardando en Supabase...' : '💾 Guardar Examen Clínico'}
                      </button>
                    </div>
 
                  </div>
                )}
 
                {subTabOrto === 'trabajo' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
 
                    <SectionHeader title="Sección" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Fotografías set ortodóntico', 'Fotografías set quirúrgico'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Modelos de estudio con alginato', 'Modelos de estudio con silicona'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['TAC de volumen completo con protocolo Morzán', 'TAC de volumen completo sin informe', 'TAC de campo pequeño'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea placeholder="Notas de sección..." value={planTrabajoForm.notas_seccion || ''} onChange={e => handlePlanTrabajo('notas_seccion', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
 
                    <SectionHeader title="Radiografías" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Postero anterior', 'Periapicales de incisivos superiores', 'Periapicales de incisivos inferiores'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Bitewing de molares', 'Bitewing de molares y premolares', 'Bitewing de premolares'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Carpal', 'Oclusal superior', 'Oclusal inferior', 'Panorámica'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea placeholder="Notas de radiografías..." value={planTrabajoForm.notas_radio || ''} onChange={e => handlePlanTrabajo('notas_radio', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
 
                    <SectionHeader title="Interconsultas" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Otorrinolaringólogo', 'Odontopediatra', 'Odontólogo General'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Cirujano Máxilo facial', 'Periodoncista', 'Médica'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Fisioterapeuta Oral', 'Psicólogo', 'Encerado diagnóstico', 'Exámenes auxiliares'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea placeholder="Notas de interconsultas..." value={planTrabajoForm.notas_inter || ''} onChange={e => handlePlanTrabajo('notas_inter', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none', marginBottom: '30px' }} />
 
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Informes</label>
                      <textarea value={planTrabajoForm.informes || ''} onChange={e => handlePlanTrabajo('informes', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>
 
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Diagnóstico definitivo</label>
                      <textarea value={planTrabajoForm.diag_definitivo || ''} onChange={e => handlePlanTrabajo('diag_definitivo', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>
 
                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Objetivo</label>
                      <textarea value={planTrabajoForm.objetivo || ''} onChange={e => handlePlanTrabajo('objetivo', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>
 
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                      <button onClick={handleSavePlanTrabajo} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 60px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)' }}>
                        {savingTrabajo ? 'Guardando...' : 'Guardar Plan de Trabajo'}
                      </button>
                    </div>
 
                  </div>
                )}
 
                {subTabOrto === 'tratamiento' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
 
                    <SectionHeader title="Sección" />
 
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha inicial</label>
                        <input type="date" value={planTrataForm.fecha_inicial || ''} onChange={e => handlePlanTrata('fecha_inicial', e.target.value)} style={inputStyleDoc} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Tiempo estimado <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>(meses)</span></label>
                        <input type="number" placeholder="Ej: 18" value={planTrataForm.tiempo_estimado || ''} onChange={e => handlePlanTrata('tiempo_estimado', e.target.value)} style={inputStyleDoc} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha final</label>
                        <input type="date" value={planTrataForm.fecha_final || ''} onChange={e => handlePlanTrata('fecha_final', e.target.value)} style={inputStyleDoc} />
                      </div>
                    </div>
 
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Tipo</span>
                      <select value={planTrataForm.tipo_1 || ''} onChange={e => handlePlanTrata('tipo_1', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Interceptivo', 'Guía de oclusión', 'Ortodóntico', 'Ortopédico', 'Ortodóntico - Ortopédico', 'Ortodóntico interdisciplinario', 'Ortodóntico interprofesional'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={planTrataForm.tipo_2 || ''} onChange={e => handlePlanTrata('tipo_2', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Ortodoncia con PAOO'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={planTrataForm.tipo_3 || ''} onChange={e => handlePlanTrata('tipo_3', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Alineadores Invisaling'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={planTrataForm.tipo_4 || ''} onChange={e => handlePlanTrata('tipo_4', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Alineadores Keep Smiling'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <textarea placeholder="Notas de sección..." value={planTrataForm.notas_seccion || ''} onChange={e => handlePlanTrata('notas_seccion', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none', marginBottom: '10px' }} />
 
                    <SectionHeader title="Aparatos Ortopédicos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '15px', marginBottom: '15px' }}>
                      {['AEO', 'Hiperpropulsión con bloques gemelos', 'Hiperpropulsión con Bionator', 'ERP Haas', 'ERP Hyrax', 'ERP MARPE tipo Moon', 'ERP MARPE con acrílico', 'Máscara facial Delaire', 'Máscara facial Petit', 'Mentonera', 'Placa labio activa', 'Pantalla oral'].map(opt => (
                        <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea placeholder="Notas de aparatos ortopédicos..." value={planTrataForm.notas_ortopedicos || ''} onChange={e => handlePlanTrata('notas_ortopedicos', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
 
                    <SectionHeader title="Anclaje" />
 
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '20px', maxWidth: '700px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Superior</span>
                        <select value={planTrataForm.anclaje_sup || ''} onChange={e => handlePlanTrata('anclaje_sup', e.target.value)} style={{ ...inputStyleDoc, flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Inferior</span>
                        <select value={planTrataForm.anclaje_inf || ''} onChange={e => handlePlanTrata('anclaje_inf', e.target.value)} style={{ ...inputStyleDoc, flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
 
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '15px' }}>
                      {['Mini implantes', 'Bicorticales', 'Mini placas', 'Mini implantes palatinos paramediales', 'Mini implantes bicorticales paramediales'].map(opt => (
                        <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea placeholder="Notas de anclaje..." value={planTrataForm.notas_anclaje || ''} onChange={e => handlePlanTrata('notas_anclaje', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
 
                    <SectionHeader title="Aparatos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '15px', marginBottom: '15px' }}>
                      {['Distal jet óseo', 'ATP semi fijo', 'Brazo de poder para tracción mesial de molar', 'Placa activa de expansión', 'Péndulo óseo', 'ATP más botón de Nance', 'Placa para levantar mordida', 'Mantenedor de espacio', 'Resorte vestibular para distalizar molar', 'ATP fijo', 'VAC modificado', 'Recuperador de espacio', 'MUST óseo', 'Arco lingual semi fijo', 'ALF', 'Rejilla lingual', 'Cantilever óseo', 'Botón de Nance óseo', 'AEO ortodóntico', 'QUAD HÉLIX'].map(opt => (
                        <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea placeholder="Notas de aparatos..." value={planTrataForm.notas_aparatos || ''} onChange={e => handlePlanTrata('notas_aparatos', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
 
                    <SectionHeader title="Otros" />
 
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '15px' }}>
                      {renderSelectTrata('Técnica', 'tecnica', ['CCO', 'Roth', 'Estándar', 'Mbt', 'Autoligantes', 'Linguales'])}
                      {renderSelectTrata('Brackets', 'brackets', ['Brackets de acero', 'Brackets de porcelana', 'Brackets de porcelana superior y de acero inferiores'])}
                      {renderSelectTrata('Tubos adhesivos sup.', 'tubos_adh_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Tubos adhesivos inf.', 'tubos_adh_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
 
                      {renderSelectTrata('Banda superior', 'banda_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Banda inferior', 'banda_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Tubos soldados sup.', 'tubos_sol_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Tubos soldados inf.', 'tubos_sol_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
 
                      <div style={{ gridColumn: 'span 2' }}>
                        {renderSelectTrata('Extracciones', 'extracciones', ['Primeras premolares superiores e inferiores', 'Primeras premolares superiores', 'Primeras premolares superiores y segundas premolares inferiores'])}
                      </div>
                    </div>
                    <textarea placeholder="Notas de la sección Otros..." value={planTrataForm.notas_otros || ''} onChange={e => handlePlanTrata('notas_otros', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none', marginBottom: '30px' }} />
 
                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Descripción</label>
                      <textarea value={planTrataForm.descripcion_general || ''} onChange={e => handlePlanTrata('descripcion_general', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
                    </div>
 
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                      <button onClick={handleSavePlanTrata} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 60px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {savingTrata ? 'Guardando...' : 'Guardar Plan de Tratamiento'}
                      </button>
                    </div>
 
                  </div>
                )}
 
                {subTabOrto === 'resumen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
 
                    <SectionHeader title="Sección" />
 
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha inicial</label>
                        <input type="date" value={resumenForm.fecha_inicial || ''} onChange={e => handleResumen('fecha_inicial', e.target.value)} style={inputStyleDoc} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha final</label>
                        <input type="date" value={resumenForm.fecha_final || ''} onChange={e => handleResumen('fecha_final', e.target.value)} style={inputStyleDoc} />
                      </div>
                    </div>
 
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Tiempo estimado</label>
                        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                          <input type="number" value={resumenForm.tiempo_estimado || ''} onChange={e => handleResumen('tiempo_estimado', e.target.value)} style={{ ...inputStyleDoc, border: 'none', borderRadius: 0, flex: 1 }} />
                          <div style={{ background: '#f8fafc', padding: '0 20px', display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '13px', borderLeft: '1px solid #cbd5e1' }}>Meses</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Tipo de Brackets</label>
                        <select value={resumenForm.tipo_brackets || ''} onChange={e => handleResumen('tipo_brackets', e.target.value)} style={inputStyleDoc}>
                          <option value="">Seleccionar</option>
                          {['Bracket metálico', 'Bracket cerámico', 'Bracket zafiro', 'Bracket lingual', 'Bracket férulas', 'Bracket resina', 'Autoligante metálico', 'Autoligante estético', 'Iconix', 'Carriere slx 3D', 'Invisalign', 'Aliwell', 'Smartaligner', 'CCO system', 'Otros'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
 
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '13px', marginBottom: '8px' }}>Diagnóstico</label>
                      <textarea value={resumenForm.diagnostico || ''} onChange={e => handleResumen('diagnostico', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
                    </div>
 
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Anclaje superior</label>
                        <select value={resumenForm.anclaje_sup || ''} onChange={e => handleResumen('anclaje_sup', e.target.value)} style={inputStyleDoc}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Anclaje inferior</label>
                        <select value={resumenForm.anclaje_inf || ''} onChange={e => handleResumen('anclaje_inf', e.target.value)} style={inputStyleDoc}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
 
                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '13px', marginBottom: '8px' }}>Nota</label>
                      <textarea value={resumenForm.notas || ''} onChange={e => handleResumen('notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>
 
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                      <button onClick={handleSaveResumen} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 60px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {savingResumen ? 'Guardando...' : 'Guardar Resumen'}
                      </button>
                    </div>
 
                  </div>
                )}
 
                {subTabOrto === 'fotografias' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>
 
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', marginTop: '10px' }}>
                      <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: 700, margin: 0 }}>Archivos Clínicos Iniciales</h3>
                      {savingFotosOrto && <span style={{ fontSize: '12px', color: '#0087b3', fontWeight: 600 }}>⏳ Sincronizando...</span>}
                    </div>
 
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', paddingBottom: '40px' }}>
                      {ORTO_CAJAS.map(item => {
                        const fileData = fotosOrto[item.key];
                        const hasFile = !!fileData;
 
                        return (
                          <div key={item.key} style={{ background: '#fff', border: `1px solid ${hasFile ? '#0087b3' : '#e2e8f0'}`, borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: hasFile ? '0 4px 6px rgba(0,135,179,0.1)' : '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
 
                            {hasFile && (
                              <button onClick={() => handleDeleteFotoOrto(item.key, fileData.url)} style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} title="Eliminar">✕</button>
                            )}
 
                            <div style={{ height: '140px', background: hasFile ? '#000' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
 
                              {hasFile ? (
                                fileData.ext.match(/(pdf|ppt|pptx)/i) ? (
                                  <a href={fileData.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontSize: '50px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    📄 <span style={{ fontSize: '10px', marginTop: '5px', color: '#cbd5e1' }}>Abrir {fileData.ext.toUpperCase()}</span>
                                  </a>
                                ) : (
                                  <a href={fileData.url} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                                    <img src={fileData.url} alt={item.key} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                  </a>
                                )
                              ) : (
                                <div style={{ fontSize: '50px', opacity: 0.3, filter: 'grayscale(100%)' }}>{item.icon}</div>
                              )}
 
                              {!hasFile && (
                                <label style={{ position: 'absolute', inset: 0, cursor: savingFotosOrto ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s', background: 'rgba(241, 245, 249, 0.9)' }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0087b3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '8px', boxShadow: '0 4px 6px rgba(0,135,179,0.3)' }}>+</div>
                                  <span style={{ fontSize: '12px', color: '#0087b3', fontWeight: 700 }}>Subir {item.key}</span>
                                  <input type="file" accept={item.accept} style={{ display: 'none' }} disabled={savingFotosOrto} onChange={e => handleUploadFotoOrto(e, item.key)} />
                                </label>
                              )}
                            </div>
 
                            <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: hasFile ? '#f0f9ff' : '#fff' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{item.key}</div>
                              <div style={{ fontSize: '10px', color: hasFile ? '#0087b3' : '#94a3b8', marginTop: '4px', fontWeight: hasFile ? 600 : 400 }}>
                                {hasFile ? `✓ Subido el ${fileData.date}` : 'Pendiente'}
                              </div>
                            </div>
 
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
 
              </div>
            </div>
          </div>
        )}
 
        {/* --- PESTAÑA FILIACIÓN --- */}
        {tab === 'filiacion' && (
          <div style={{ padding: '30px', overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '35px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
 
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 600 }}>Datos Personales</h2>
                <div>
                  {!isEditingFiliacion ? (
                    <button onClick={() => setIsEditingFiliacion(true)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                      ✏️ Editar Campos
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleCancelEdit} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                      <button onClick={handleSaveEditPatient} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>{saving ? 'Guardando...' : '💾 Guardar Cambios'}</button>
                    </div>
                  )}
                </div>
              </div>
 
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div><label style={labelStyleDoc}>Nombres y Apellidos</label><input disabled={!isEditingFiliacion} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>N° HC</label><input readOnly disabled value={editForm.num_hc || ''} placeholder="Autogenerado" style={{ ...inputStyleDoc, background: '#f1f5f9', borderColor: 'transparent', cursor: 'not-allowed', fontWeight: 'bold', color: '#64748b' }} /></div>
                <div><label style={labelStyleDoc}>Sexo</label><select disabled={!isEditingFiliacion} value={editForm.sexo || ''} onChange={e => setEditForm({ ...editForm, sexo: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Mujer">Mujer</option><option value="Hombre">Hombre</option></select></div>
                <div><label style={labelStyleDoc}>Documento</label><div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: '8px' }}><select disabled={!isEditingFiliacion} value={editForm.tipo_doc || ''} onChange={e => setEditForm({ ...editForm, tipo_doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="DNI">DNI</option><option value="CE">C.E.</option><option value="Pasaporte">Pasap.</option><option value="RUC">RUC</option></select><input disabled={!isEditingFiliacion} value={editForm.doc || ''} onChange={e => setEditForm({ ...editForm, doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div></div>
                <div><label style={labelStyleDoc}>Teléfono</label><div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '8px' }}><select disabled={!isEditingFiliacion} value={editForm.cod_pais || '+51'} onChange={e => setEditForm({ ...editForm, cod_pais: e.target.value })} style={{ ...inputStyleDoc, padding: '10px 6px', background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}>{TODAS_NACIONES.map(n => <option key={n.n} value={n.c}>{n.b} {n.c}</option>)}</select><input disabled={!isEditingFiliacion} value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div></div>
                <div><label style={labelStyleDoc}>Email</label><input disabled={!isEditingFiliacion} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>F. nacimiento y Edad</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '8px' }}><input disabled={!isEditingFiliacion} type="date" value={editForm.birthDate || ''} onChange={e => { const bDay = e.target.value; let calculatedAge = editForm.age; if (bDay) { const today = new Date(); const birth = new Date(bDay); calculatedAge = today.getFullYear() - birth.getFullYear(); } setEditForm({ ...editForm, birthDate: bDay, age: calculatedAge }); }} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /><input value={editForm.age || ''} readOnly placeholder="Edad" style={{ ...inputStyleDoc, background: '#f1f5f9', textAlign: 'center', borderColor: 'transparent' }} /></div></div>
                <div><label style={labelStyleDoc}>País de nacimiento</label><select disabled={!isEditingFiliacion} value={editForm.pais_nacimiento || ''} onChange={e => setEditForm({ ...editForm, pais_nacimiento: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option>{TODAS_NACIONES.map(n => <option key={n.n} value={n.n}>{n.b} {n.n}</option>)}</select></div>
                <div><label style={labelStyleDoc}>Ocupación</label><input disabled={!isEditingFiliacion} value={editForm.ocupacion || ''} onChange={e => setEditForm({ ...editForm, ocupacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={labelStyleDoc}>Dirección</label><input disabled={!isEditingFiliacion} value={editForm.direccion || ''} onChange={e => setEditForm({ ...editForm, direccion: e.target.value })} placeholder="+ Agregar" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>Grupo Sanguíneo</label><input disabled={!isEditingFiliacion} value={editForm.blood || ''} onChange={e => setEditForm({ ...editForm, blood: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>Fuente captación</label><select disabled={!isEditingFiliacion} value={editForm.fuente_captacion || ''} onChange={e => setEditForm({ ...editForm, fuente_captacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Facebook">Facebook</option><option value="Instagram">Instagram</option><option value="Tiktok">Tiktok</option><option value="Google">Google</option><option value="Referido por paciente">Referido por paciente</option><option value="Referido por doctor">Referido por doctor</option><option value="Amigos y familiares">Amigos y familiares</option><option value="Fachada">Fachada</option></select></div>
                <div><label style={labelStyleDoc}>Línea de negocio</label><select disabled={!isEditingFiliacion} value={editForm.linea_negocio || ''} onChange={e => setEditForm({ ...editForm, linea_negocio: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Ortodoncia">Ortodoncia</option><option value="Rehabilitación">Rehabilitación</option><option value="Estética">Estética</option><option value="Endodoncia">Endodoncia</option><option value="Tratamiento integral">Tratamiento integral</option><option value="Odontopediatría">Odontopediatría</option></select></div>
                <div><label style={labelStyleDoc}>Alergias</label><input disabled={!isEditingFiliacion} value={editForm.allergies || ''} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
              </div>
 
              {editForm.age < 18 && (
                <div style={{ marginTop: '45px' }}>
                  <h3 style={{ color: '#0087b3', fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Familiar / Apoderado <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 4 }}>Requerido</span>
                  </h3>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#0087b3', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 20px' }}><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Nombre</div><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>N° doc</div><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Parentesco</div></div>
                    <div style={{ background: '#f8fafc', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', padding: '20px' }}>
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado || ''} onChange={e => setEditForm({ ...editForm, apoderado: e.target.value })} placeholder="Nombre completo" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f1f5f9', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado_dni || ''} onChange={e => setEditForm({ ...editForm, apoderado_dni: e.target.value })} placeholder="DNI/CE" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f1f5f9', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.parentesco || ''} onChange={e => setEditForm({ ...editForm, parentesco: e.target.value })} placeholder="Ej: Madre, Padre" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f1f5f9', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
 
        {/* --- OTRAS PESTAÑAS --- */}
        {tab === 'odontograma' && <Odontograma patient={patData || patient} teeth={teeth} setTeeth={setTeeth} teethEvolucion={teethEvolucion} setTeethEvolucion={setTeethEvolucion} />}
 
        {tab === 'anamnesis' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%' }}>
              {[
                { title: 'Motivo de consulta', fields: ['Motivo principal', 'Tiempo con el síntoma', 'Intensidad del dolor (1-10)', 'Tratamientos previos para este problema'] },
                { title: 'Antecedentes médicos generales', fields: ['Enfermedades sistémicas', 'Medicamentos actuales', 'Alergias (medicamentos/materiales)', 'Cirugías o hospitalizaciones', 'Embarazo / lactancia'] },
                { title: 'Antecedentes estomatológicos', fields: ['Última visita dental', 'Tratamientos previos recibidos', 'Experiencias traumáticas dentales', 'Hábitos: bruxismo, succión, otros', 'Higiene oral: frecuencia de cepillado'] },
                { title: 'Signos vitales', fields: ['Presión arterial', 'Frecuencia cardíaca', 'Temperatura', 'Peso / Talla'] },
              ].map((sec, si) => (
                <div key={si} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 15 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 11, paddingBottom: 7, borderBottom: `1px solid ${MT}` }}>{sec.title}</div>
                  {sec.fields.map((f, fi) => (
                    <div key={fi} style={{ marginBottom: 9 }}>
                      <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 2 }}>{f}</label>
                      <input style={{ width: '100%', border: 'none', borderBottom: `1px solid ${BD}`, padding: '3px 0', fontSize: 12, outline: 'none', color: DN, background: 'transparent', boxSizing: 'border-box' }}
                        value={anamnesisData[f] !== undefined ? anamnesisData[f] : (f.includes('Alerg') ? (patData?.allergies || patient.allergies) : f.includes('Medic') ? (patData?.meds || patient.meds) : '')}
                        onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={saveAllToCloud} style={{ marginTop: 14, background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar anamnesis</button>
          </div>
        )}
 
        {tab === 'plan' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Plan de tratamiento — {patData?.name || patient.name}</div>
              <button onClick={() => setShowTreatPicker(!showTreatPicker)} style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Agregar tratamiento</button>
            </div>
            {showTreatPicker && (
              <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: DN, marginBottom: 10 }}>Seleccionar tratamiento:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                  {TRATAMIENTOS_CAT.map(cat => (
                    <div key={cat.cat}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: P, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .3 }}>{cat.cat}</div>
                      {cat.items.map(item => (
                        <div key={item} onClick={() => { setPlan(p => [...p, { id: Date.now(), name: item, tooth: '—', status: 'pendiente', cost: PRECIOS[item] || 0, paid: 0, date: '—', sessions: 1 }]); setShowTreatPicker(false); }}
                          style={{ fontSize: 11, color: DN, padding: '3px 7px', borderRadius: 5, cursor: 'pointer', marginBottom: 2 }}
                          onMouseEnter={e => { e.currentTarget.style.background = MT; e.currentTarget.style.color = P }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DN }}>
                          {item} — S/{PRECIOS[item] || 0}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {['pendiente', 'en_curso', 'completado'].map(st => {
              const items = plan.filter(i => i.status === st);
              const b = sc(st);
              return (
                <div key={st} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: b.c, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.c }} />{st.replace('_', ' ')} ({items.length})
                  </div>
                  {items.map(item => (
                    <div key={item.id} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: '10px 14px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 120 }}><div style={{ fontSize: 12, fontWeight: 600, color: DN }}>{item.name}</div><div style={{ fontSize: 10, color: MU }}>Pieza: {item.tooth} · {item.date}</div></div>
                      <div style={{ fontSize: 12, color: DN }}>S/{item.cost}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['pendiente', 'en_curso', 'completado'].filter(s => s !== st).map(ns => (
                          <button key={ns} onClick={() => setPlan(p => p.map(i => i.id === item.id ? { ...i, status: ns } : i))}
                            style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${sc(ns).c}`, background: sc(ns).bg, color: sc(ns).c, fontWeight: 600 }}>
                            → {ns.replace('_', ' ')}
                          </button>
                        ))}
                        <button onClick={() => setPlan(p => p.filter(i => i.id !== item.id))}
                          style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${RJ}44`, background: '#fef2f2', color: RJ, fontWeight: 700 }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 11, color: MU, fontStyle: 'italic', padding: '5px 8px' }}>Sin tratamientos en este estado</div>}
                </div>
              );
            })}
          </div>
        )}
 
        {tab === 'evolucion' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Notas de evolución</div>
              <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva nota</button>
            </div>
            {[{ date: '10 Jun 2025', dr: 'Dra. Sol Vargas', txt: 'Control de ortodoncia. Arco superior ajustado. Paciente refiere leve sensibilidad en pieza 14. Se recomienda pasta para dientes sensibles y enjuague con fluoruro. Próximo control en 4 semanas.' }, { date: '15 Mar 2025', dr: 'Dra. Sol Vargas', txt: 'Instalación de brackets superior e inferior. Se explica protocolo de higiene oral detallado. Paciente tolera bien el procedimiento. Sin complicaciones postoperatorias inmediatas.' }, { date: '10 Ene 2025', dr: 'Dra. Sol Vargas', txt: 'Consulta inicial. Evaluación integral de salud bucal. Se presenta maloclusión clase II. Se propone tratamiento de ortodoncia con brackets metálicos. Plan y presupuesto aceptado.' }]
              .map((n, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 15, marginBottom: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: P }}>{n.date}</span>
                    <span style={{ fontSize: 10, color: MU }}>{n.dr}</span>
                  </div>
                  <div style={{ fontSize: 12, color: DN, lineHeight: 1.7 }}>{n.txt}</div>
                </div>
              ))}
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: DN, marginBottom: 8 }}>Nueva nota clínica</div>
              <textarea placeholder="Descripción de la consulta, hallazgos clínicos, procedimiento realizado y recomendaciones..." style={{ width: '100%', minHeight: 80, padding: 9, border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <button style={{ marginTop: 8, background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar</button>
            </div>
          </div>
        )}
 
        {tab === 'recetas' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Recetas médicas</div>
              <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva receta</button>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 20, maxWidth: 500 }}>
              <div style={{ textAlign: 'center', borderBottom: `1px solid ${BD}`, paddingBottom: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: MU }}>Cirujano Dentista · COP 12345</div>
                <div style={{ fontSize: 10, color: MU }}>Los Diamantes 178, Trujillo · +51 915 054 145</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[['Paciente', patData?.name || patient.name], ['DNI', patData?.doc || patient.doc], ['Edad', (patData?.age || patient.age) + ' años'], ['Fecha', new Date().toLocaleDateString('es-PE')]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 9, color: MU }}>{k}</div><div style={{ fontSize: 11, fontWeight: 600, color: DN, borderBottom: `1px solid ${BD}` }}>{v}</div></div>
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: DN, marginBottom: 8 }}>Rp:</div>
              {[{ med: 'Amoxicilina 500mg', dose: '1 cápsula cada 8h x 7 días', inst: 'Tomar con alimentos' }, { med: 'Ibuprofeno 400mg', dose: '1 tableta cada 8h si hay dolor', inst: 'No superar 3 dosis/día' }].map((r, i) => (
                <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px dashed ${BD}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>• {r.med}</div>
                  <div style={{ fontSize: 11, color: MU, marginLeft: 12 }}>{r.dose}</div>
                  <div style={{ fontSize: 10, color: MU, marginLeft: 12, fontStyle: 'italic' }}>{r.inst}</div>
                </div>
              ))}
              <textarea placeholder="Agregar medicamentos..." style={{ width: '100%', minHeight: 44, padding: 6, border: `1px solid ${BD}`, borderRadius: 6, fontSize: 11, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <div style={{ marginTop: 12, borderTop: `1px solid ${BD}`, paddingTop: 10, textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Firma y sello</div>
                <div style={{ height: 40, border: `1px dashed ${BD}`, borderRadius: 5 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ flex: 1, background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🖨 Imprimir</button>
                <button style={{ flex: 1, background: WA, color: '#fff', border: 'none', borderRadius: 7, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💬 Enviar WA</button>
              </div>
            </div>
          </div>
        )}
 
        {tab === 'imagenes' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Imágenes y Radiografías</div>
 
              <input type="file" id="file-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              <label htmlFor="file-upload" style={{ background: saving ? MU : P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '⏳ Subiendo...' : '+ Subir imagen'}
              </label>
            </div>
 
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {imagenesList.map((img, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}>
 
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(i, img.url);
                    }}
                    style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 10, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    title="Eliminar imagen"
                  >
                    ✕
                  </button>
 
                  <div style={{ height: 100, background: LT, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={img.url} alt="Radiografía" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '7px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{img.type}</div>
                    <div style={{ fontSize: 9.5, color: MU }}>{img.date}</div>
                  </div>
                </div>
              ))}
 
              <label htmlFor="file-upload" style={{ background: LT, border: `2px dashed ${BD}`, borderRadius: 10, height: 148, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}>
                <div style={{ fontSize: 28, color: BD }}>+</div>
                <div style={{ fontSize: 10, color: MU, fontWeight: 600 }}>Subir archivo</div>
              </label>
            </div>
          </div>
        )}
 
        {tab === 'presupuesto' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Presupuesto</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ background: '#fff', color: '#0087b3', border: `1px solid #0087b3`, borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🖨 Imprimir</button>
                <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💬 Enviar WA</button>
              </div>
            </div>
            <div style={{ background: '#fff', border: `1px solid #e2e8f0`, borderRadius: 12, overflow: 'hidden', maxWidth: 700 }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid #e2e8f0`, display: 'flex', justifyContent: 'space-between', background: '#f8fafc' }}>
                <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0087b3' }}>Presupuesto dental</div><div style={{ fontSize: 10, color: '#64748b' }}>Dra. Sol Vargas · {new Date().toLocaleDateString('es-PE')}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{patData?.name || patient.name}</div><div style={{ fontSize: 10, color: '#64748b' }}>DNI: {patData?.doc || patient.doc}</div></div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {['Tratamiento', 'Pieza', 'Costo', 'Pagado', 'Saldo'].map(h => <th key={h} style={{ padding: '8px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 10, borderBottom: `1px solid #e2e8f0` }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {plan.map((row, i) => {
                    const saldo = row.cost - row.paid;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid #f1f5f9` }}>
                        <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 500 }}>{row.name}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.tooth}</td>
                        <td style={{ padding: '10px 14px', color: '#0f172a' }}>S/{row.cost}</td>
                        <td style={{ padding: '10px 14px', color: '#0087b3', fontWeight: 600 }}>S/{row.paid}</td>
                        <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#64748b' }}>S/{saldo}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr style={{ background: '#f8fafc' }}>
                  <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>TOTAL</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>S/{plan.reduce((s, i) => s + i.cost, 0)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0087b3' }}>S/{plan.reduce((s, i) => s + i.paid, 0)}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 800, color: '#10b981' }}>S/{plan.reduce((s, i) => s + (i.cost - i.paid), 0)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
        )}
 
        {tab === 'consentimientos' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <Consentimientos patient={patData || patient} />
          </div>
        )}
 
      </div>
    </div>
  );
}

function Caja() {
  const total = INVOICES.reduce((s, i) => s + i.total, 0);
  const cobrado = INVOICES.reduce((s, i) => s + i.paid, 0);
            const [tab, setTab] = useState('facturas');

            return (
            <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
                <Stat label="Total facturado" value={`S/${total.toLocaleString()}`} />
                <Stat label="Cobrado" value={`S/${cobrado.toLocaleString()}`} col={P} sub="✓ al día" />
                <Stat label="Pendiente" value={`S/${(total - cobrado).toLocaleString()}`} col={GL} />
                <Stat label="Ingresos del mes" value="S/4,820" col={P} sub="↑ 18% vs anterior" />
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {['facturas', 'pagos', 'gastos'].map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${BD}`, fontSize: 11, cursor: 'pointer', fontWeight: tab === t ? 700 : 400, background: tab === t ? P : '#fff', color: tab === t ? '#fff' : MU, textTransform: 'capitalize' }}>{t}</button>
                ))}
                <button style={{ marginLeft: 'auto', background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva factura</button>
              </div>

              {tab === 'facturas' && (
                <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead><tr style={{ background: LT }}>
                      {['N°', 'Paciente', 'Tratamiento', 'Fecha', 'Método', 'Total', 'Cobrado', 'Estado', ''].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: MU, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${BD}`, whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {INVOICES.map((inv, i) => {
                        const b = sc(inv.status); return (
                          <tr key={i} style={{ borderBottom: `1px solid ${MT}` }}
                            onMouseEnter={e => e.currentTarget.style.background = LT}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '9px 12px', color: P, fontWeight: 700 }}>{inv.id}</td>
                            <td style={{ padding: '9px 12px', color: DN, fontWeight: 500 }}>{inv.patient}</td>
                            <td style={{ padding: '9px 12px', color: MU }}>{inv.treat}</td>
                            <td style={{ padding: '9px 12px', color: MU }}>{inv.date}</td>
                            <td style={{ padding: '9px 12px', color: MU }}>{inv.method}</td>
                            <td style={{ padding: '9px 12px', color: DN, fontWeight: 600 }}>S/{inv.total}</td>
                            <td style={{ padding: '9px 12px', color: inv.paid < inv.total ? GL : P }}>S/{inv.paid}</td>
                            <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: b.bg, color: b.c }}>{inv.status}</span></td>
                            <td style={{ padding: '9px 12px' }}><span style={{ fontSize: 10, color: P, cursor: 'pointer', fontWeight: 600 }}>ver →</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'pagos' && (
                <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 12 }}>Registrar nuevo pago</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 500 }}>
                    {[['Paciente', 'select'], ['Factura', 'select'], ['Monto (S/)', 'number'], ['Método de pago', 'select'], ['Fecha', 'date'], ['Referencia / N° operación', 'text']].map(([l, t]) => (
                      <div key={l}>
                        <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>{l}</label>
                        {t === 'select' ? <select style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', background: '#fff' }}>
                          {l === 'Paciente' ? PATIENTS.map(p => <option key={p.id}>{p.name}</option>) : l === 'Factura' ? INVOICES.map(i => <option key={i.id}>{i.id}</option>) : <><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option><option>Tarjeta</option></>}
                        </select> : <input type={t} style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' }} />}
                      </div>
                    ))}
                  </div>
                  <button style={{ marginTop: 14, background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Registrar pago</button>
                </div>
              )}

              {tab === 'gastos' && (
                <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 12 }}>Gastos del consultorio</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {[['Materiales', 'S/320', 'Jun 2025'], ['Laboratorio', 'S/480', 'Jun 2025'], ['Servicios', 'S/150', 'Jun 2025'], ['Sueldos', 'S/1,200', 'Jun 2025'], ['Otros', 'S/80', 'Jun 2025']].map(([c, v, d]) => (
                      <div key={c} style={{ background: LT, borderRadius: 9, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, color: MU, marginBottom: 3 }}>{c}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: DN }}>{v}</div>
                        <div style={{ fontSize: 9, color: MU }}>{d}</div>
                      </div>
                    ))}
                  </div>
                  <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Registrar gasto</button>
                </div>
              )}
            </div>
            );
}

            // ─── SECCIÓN LABORATORIO ───────────────────────────────────────────────
            function Laboratorio() {
  const [orders, setOrders] = useState(LAB_ORDERS);
            return (
            <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Órdenes de laboratorio</div>
                <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva orden</button>
              </div>
              <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
                {[['Total órdenes', orders.length, null], ['En proceso', orders.filter(o => o.status === 'en_proceso').length, MU], ['Listo para retirar', orders.filter(o => o.status === 'listo').length, P], ['Entregado', orders.filter(o => o.status === 'entregado').length, '#22a55a']].map(([l, v, c]) => (
                  <Stat key={l} label={l} value={v} col={c} />
                ))}
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {orders.map(o => {
                  const b = o.status === 'listo' ? { bg: MT, c: P } : o.status === 'entregado' ? { bg: '#dcfce7', c: '#16a34a' } : { bg: '#fef3c7', c: '#d97706' };
                  return (
                    <div key={o.id} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>{o.type}</div>
                        <div style={{ fontSize: 10, color: MU }}>Paciente: {o.patient} · Pieza: {o.tooth}</div>
                        <div style={{ fontSize: 10, color: MU }}>Lab: {o.lab}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>Enviado</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{o.sent}</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>ETA</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{o.eta}</div></div>
                      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 9, color: MU }}>Costo</div><div style={{ fontSize: 11, fontWeight: 600, color: DN }}>S/{o.cost}</div></div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 10, background: b.bg, color: b.c }}>{o.status.replace('_', ' ')}</span>
                      {o.status === 'listo' && (
                        <button onClick={() => setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: 'entregado' } : x))}
                          style={{ background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>✓ Marcar entregado</button>
                      )}
                      <span style={{ fontSize: 11, color: P, cursor: 'pointer', fontWeight: 600 }}>ID: {o.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            );
}

            // ─── SECCIÓN REPORTES ──────────────────────────────────────────────────
            function Reportes() {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
            const vals = [2800, 3100, 2600, 3800, 4200, 4820];
            const maxV = Math.max(...vals);
            return (
            <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 16 }}>Reportes y estadísticas — 2025</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 14 }}>Ingresos mensuales (S/)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 140 }}>
                    {months.map((m, i) => (
                      <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: P }}>{vals[i].toLocaleString()}</div>
                        <div style={{ width: '100%', background: i === 5 ? P : MT, borderRadius: '4px 4px 0 0', height: `${(vals[i] / maxV) * 100}%`, transition: 'height .3s' }} />
                        <div style={{ fontSize: 9, color: MU, fontWeight: 600 }}>{m}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 14 }}>Tratamientos más frecuentes</div>
                  {[['Limpieza y profilaxis', 45, P], ['Control ortodoncia', 32, GL], ['Consulta / diagnóstico', 28, MU], ['Blanqueamiento', 18, '#0a7a4a'], ['Restauración resina', 15, AZ], ['Extracción simple', 12, RJ]].map(([t, n, c]) => (
                    <div key={t} style={{ marginBottom: 9 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: DN, fontWeight: 500 }}>{t}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{n}</span>
                      </div>
                      <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(n / 45) * 100}%`, background: c, borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            );
}

            function WhatsApp(){

  const[chat,setChat]=useState(null);

            const[msg,setMsg]=useState('');

            const[msgs,setMsgs]=useState(WA_MSGS);

            const[loading,setLoading]=useState(false);

            const endRef=useRef(null);

  useEffect(()=>{endRef.current?.scrollIntoView({ behavior: 'smooth' });},[chat,msgs]);

  const send=async()=>{

    if(!msg.trim()||!chat)return;

            const txt=msg;setMsg('');

    setMsgs(prev=>prev.map(m=>m.id===chat?{...m, thread:[...m.thread,{from:'patient',txt,t:'ahora'}]}:m));

            setLoading(true);

            try{

      const active=msgs.find(m=>m.id===chat);

      const history=(active?.thread||[]).map(t=>({role:t.from==='bot'?'assistant':'user',content:t.txt}));

            const res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:`Eres Nanda, asistente dental de la Dra. Sol Vargas. Consultorio en Trujillo, Perú. WhatsApp: +51 915 054 145. Servicios: limpieza S/60, blanqueamiento S/180, ortodoncia desde S/1,800, implantes S/1,200, carillas S/350, coronas S/480, consulta S/30. Solo con cita previa. Horario: Lun-Sáb. Responde en español, de forma amable, concisa y profesional. Si preguntan por cita, ofrece disponibilidad. No menciones precios de otros consultorios.`,messages:[...history,{role:'user',content:txt}]})});

            const data=await res.json();

            const reply=data.content?.[0]?.text||'Disculpa, ¿puedes repetir tu consulta?';

      setMsgs(prev=>prev.map(m=>m.id===chat?{...m, thread:[...m.thread,{from:'bot',txt:reply,t:'ahora'}]}:m));

    }catch{

              setMsgs(prev => prev.map(m => m.id === chat ? { ...m, thread: [...m.thread, { from: 'bot', txt: 'Disculpa, hubo un error. Escríbenos directamente al +51 915 054 145', t: 'ahora' }] } : m));

    }finally{setLoading(false);}

  };

  const activeChat=msgs.find(m=>m.id===chat);

            return(

            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

              <div style={{ width: 220, borderRight: `1px solid ${BD}`, background: '#fff', overflowY: 'auto', flexShrink: 0 }}>

                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BD}` }}>

                  <div style={{ fontSize: 12, fontWeight: 700, color: DN, marginBottom: 8 }}>Conversaciones</div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>

                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: WA }} />

                    <span style={{ fontSize: 10, color: MU }}>Agente IA activo — +51 915 054 145</span>

                  </div>

                </div>

                {msgs.map(m => (

                  <div key={m.id} onClick={() => setChat(m.id)}

                    style={{ display: 'flex', gap: 9, padding: '11px 14px', borderBottom: `1px solid ${MT}`, cursor: 'pointer', background: chat === m.id ? MT : 'transparent' }}

                    onMouseEnter={e => chat !== m.id && (e.currentTarget.style.background = LT)}

                    onMouseLeave={e => chat !== m.id && (e.currentTarget.style.background = 'transparent')}>

                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: P, flexShrink: 0 }}>{ini(m.name)}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>

                        <span style={{ fontSize: 12, fontWeight: 600, color: DN }}>{m.name}</span>

                        <span style={{ fontSize: 9, color: MU }}>{m.time}</span>

                      </div>

                      <div style={{ fontSize: 10, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.msg}</div>

                    </div>

                    {m.unread > 0 && <div style={{ width: 16, height: 16, borderRadius: '50%', background: WA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.unread}</div>}

                  </div>

                ))}

              </div>

              {!chat ? (

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: LT }}>

                  <div style={{ fontSize: 36, color: BD }}>◎</div>

                  <div style={{ fontSize: 13, color: MU }}>Selecciona una conversación</div>

                  <div style={{ background: WA, color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Agente IA Nanda activo</div>

                </div>

              ) : (

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                  <div style={{ background: '#fff', borderBottom: `1px solid ${BD}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: P }}>{ini(activeChat?.name || '')}</div>

                    <div><div style={{ fontSize: 13, fontWeight: 700, color: DN }}>{activeChat?.name}</div><div style={{ fontSize: 10, color: WA, fontWeight: 600 }}>● en línea</div></div>

                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#f0f2f5', display: 'flex', flexDirection: 'column', gap: 8 }}>

                    {activeChat?.thread.map((t, i) => (

                      <div key={i} style={{ display: 'flex', justifyContent: t.from === 'patient' ? 'flex-end' : 'flex-start' }}>

                        {t.from === 'bot' && <div style={{ width: 24, height: 24, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: 6, alignSelf: 'flex-end' }}>IA</div>}

                        <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: t.from === 'patient' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: t.from === 'patient' ? P : '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>

                          <div style={{ fontSize: 12, color: t.from === 'patient' ? '#fff' : DN, lineHeight: 1.5 }}>{t.txt}</div>

                          <div style={{ fontSize: 9, color: t.from === 'patient' ? 'rgba(255,255,255,.7)' : MU, marginTop: 3, textAlign: 'right' }}>{t.t}</div>

                        </div>

                      </div>

                    ))}

                    {loading && <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#fff', borderRadius: '12px 12px 12px 2px', width: 'fit-content', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>

                      {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: MU, animation: `bounce ${.6 + i * .1}s infinite alternate` }} />)}

                    </div>}

                    <div ref={endRef} />

                  </div>

                  <div style={{ background: '#fff', borderTop: `1px solid ${BD}`, padding: '10px 14px', display: 'flex', gap: 8, flexShrink: 0 }}>

                    <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Escribir mensaje..." onKeyDown={e => e.key === 'Enter' && send()}

                      style={{ flex: 1, padding: '8px 12px', border: `1px solid ${BD}`, borderRadius: 20, fontSize: 12, outline: 'none', color: DN }} />

                    <button onClick={send} disabled={loading} style={{ background: loading ? MU : WA, color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>

                  </div>

                </div>

              )}

            </div>

            );

}



            function Config(){

  return(

            <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 800 }}>

                {[

                  { title: 'Datos del consultorio', fields: [['Nombre', 'Consultorio Dra. Sol Vargas'], ['Dirección', 'Los Diamantes 178, Trujillo 13011'], ['Teléfono', '+51 915 054 145'], ['Email', 'drasolvargass@gmail.com'], ['COP', '12345']] },

                  { title: 'Horario de atención', fields: [['Lunes - Viernes', '8:00 am - 6:00 pm'], ['Sábado', '8:00 am - 1:00 pm'], ['Domingo', 'Cerrado'], ['Duración cita por defecto', '30 minutos']] },

                  { title: 'WhatsApp IA — Agente Nanda', fields: [['Número WA', '+51 915 054 145'], ['Nombre del agente', 'Nanda'], ['Recordatorio (horas antes)', '24h y 1h'], ['Auto-respuesta', 'Activada']] },

                  { title: 'Notificaciones', fields: [['Nuevas citas', 'Email + WhatsApp'], ['Pagos recibidos', 'Email'], ['Laboratorio listo', 'WhatsApp'], ['Ausencias', 'WhatsApp']] },

                ].map((sec, si) => (

                  <div key={si} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 17 }}>

                    <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${MT}` }}>{sec.title}</div>

                    {sec.fields.map(([k, v]) => (

                      <div key={k} style={{ marginBottom: 10 }}>

                        <label style={{ fontSize: 9.5, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>{k}</label>

                        <input defaultValue={v} style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' }} />

                      </div>

                    ))}

                  </div>

                ))}

              </div>

              <button style={{ marginTop: 16, background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar configuración</button>

            </div>

            );

}



            // ─── ROOT (APP PRINCIPAL) ──────────────────────────────────────────────

            export default function App(){
              const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [view, setView] = useState('dashboard');
  const [selPat, setSelPat] = useState(null);
  const [col, setCol] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Memoria del Odontograma (Inicial)
  const [teeth, setTeeth] = useState(() => {
    const savedTeeth = localStorage.getItem('dentalOS_odontograma');
            return savedTeeth ? JSON.parse(savedTeeth) : { };
  });

  useEffect(() => {
              localStorage.setItem('dentalOS_odontograma', JSON.stringify(teeth));
  }, [teeth]);

  // 👉 AÑADIDO: Memoria del Odontograma (Evolución) para evitar la pantalla blanca
  const [teethEvolucion, setTeethEvolucion] = useState(() => {
    const savedEvo = localStorage.getItem('dentalOS_odontograma_evo');
            return savedEvo ? JSON.parse(savedEvo) : { };
  });

  useEffect(() => {
              localStorage.setItem('dentalOS_odontograma_evo', JSON.stringify(teethEvolucion));
  }, [teethEvolucion]);

  // Memoria de Pacientes (¡Esta es la que faltaba conectar bien!)
  const [patientsList, setPatientsList] = useState(() => {
    const saved = localStorage.getItem('dentalOS_patients');
            return saved ? JSON.parse(saved) : PATIENTS;
  });

  useEffect(() => {
              localStorage.setItem('dentalOS_patients', JSON.stringify(patientsList));
  }, [patientsList]);

 // Estado del Login
const [isLogged, setIsLogged] = useState(() => {
  return localStorage.getItem('dentalOS_auth') === 'true';
});

const handleLogin = () => {
  localStorage.setItem('dentalOS_auth', 'true');
  setIsLogged(true);
};

            const NAV=[{id:'dashboard',lbl:'Dashboard',i:'▦'},{id:'agenda',lbl:'Agenda',i:'◫'},{id:'pacientes',lbl:'Pacientes',i:'◉'},{id:'historia',lbl:'Historia Clínica',i:'◈'},{id:'caja',lbl:'Caja',i:'◆'},{id:'laboratorio',lbl:'Laboratorio',i:'◌'},{id:'reportes',lbl:'Reportes',i:'◍'},{id:'whatsapp',lbl:'WhatsApp IA',i:'◎'},{id:'config',lbl:'Configuración',i:'⚙'}];
            const TITLES={dashboard:'Dashboard',agenda:'Agenda de citas',pacientes:'Pacientes',historia:'Historia Clínica',caja:'Caja & Facturación',laboratorio:'Laboratorio dental',reportes:'Reportes',whatsapp:'WhatsApp IA — Nanda',config:'Configuración'};
  const goTo=(v,p=null)=>{setView(v);if(p)setSelPat(p);};



 // Si no hay sesión, detenemos todo y mostramos la pantalla de Login
  if (!session) {
    return <Login onLogin={(sessionData) => setSession(sessionData)} />;
  }

            return(
            <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui,sans-serif', overflow: 'hidden', background: LT }}>
              <style>{`@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-5px)}}`}</style>

              {/* Sidebar */}
              <div style={{ width: col ? 52 : 198, background: DN, display: 'flex', flexDirection: 'column', transition: 'width .2s', flexShrink: 0 }}>
                <div style={{ padding: col ? '13px 9px' : '14px 13px', borderBottom: '1px solid #1e3a3a', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff', fontStyle: 'italic', flexShrink: 0 }}>S</div>
                  {!col && <div><div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Dra. Sol Vargas</div><div style={{ fontSize: 9, color: MU }}>Trujillo · COP 12345</div></div>}
                </div>
                <nav style={{ flex: 1, padding: '7px 5px', overflowY: 'auto' }}>
                  {NAV.map(it => (
                    <div key={it.id} onClick={() => goTo(it.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: col ? '8px 0' : '8px 10px', cursor: 'pointer', background: view === it.id ? P : 'transparent', borderRadius: 7, margin: '1px 0', justifyContent: col ? 'center' : 'flex-start', transition: 'background .12s' }}
                      onMouseEnter={e => view !== it.id && (e.currentTarget.style.background = 'rgba(255,255,255,.09)')}
                      onMouseLeave={e => view !== it.id && (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ fontSize: 14, color: view === it.id ? '#fff' : MU, minWidth: 16, textAlign: 'center' }}>{it.i}</span>
                      {!col && <span style={{ fontSize: 11.5, color: view === it.id ? '#fff' : MU, fontWeight: view === it.id ? 700 : 400 }}>{it.lbl}</span>}
                    </div>
                  ))}
                </nav>
                <div onClick={() => setCol(!col)} style={{ padding: 9, cursor: 'pointer', color: MU, fontSize: 9.5, borderTop: '1px solid #1e3a3a', textAlign: 'center' }}>
                  {col ? '→' : '← colapsar'}
                </div>
              </div>

              {/* Main */}
<div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
  {/* Header: Ahora es responsivo con flexWrap */}
  <div style={{ 
    background: '#fff', 
    borderBottom: `1px solid ${BD}`, 
    padding: '10px 20px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    flexShrink: 0,
    flexWrap: 'wrap', // Permite que los botones bajen si no hay espacio
    gap: '10px' 
  }}>
    <div style={{ minWidth: 'fit-content' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: DN }}>{TITLES[view]}</div>
      <div style={{ fontSize: 9.5, color: MU }}>Lunes 7 de julio de 2025</div>
    </div>

    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {selPat && view === 'historia' && (
        <button 
          onClick={() => setSelPat(null)} 
          style={{ background: LT, color: MU, border: `1px solid ${BD}`, borderRadius: 7, padding: '5px 12px', fontSize: 10, cursor: 'pointer' }}
        >
          ← Volver
        </button>
      )}
      <div 
        style={{ background: LT, border: `1px solid ${BD}`, borderRadius: 7, padding: '5px 12px', fontSize: 10, color: P, fontWeight: 600, cursor: 'pointer' }} 
        onClick={() => goTo('agenda')}
      >
        + Nueva cita
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', cursor: 'pointer', fontStyle: 'italic' }}>
        S
      </div>
      <div 
        onClick={handleLogout} 
        style={{ background: '#fef2f2', border: `1px solid ${RJ}44`, borderRadius: 7, padding: '5px 10px', fontSize: 10, color: RJ, fontWeight: 600, cursor: 'pointer', marginLeft: '5px' }} 
        title="Cerrar sesión"
      >
        Salir
      </div>
    </div>
  </div>

  {/* Contenido Dinámico */}
  <div style={{ 
    flex: 1, 
    overflow: ['historia', 'whatsapp'].includes(view) ? 'hidden' : 'auto', 
    display: 'flex', 
    flexDirection: 'column',
    width: '100%' 
  }}>
    {view === 'dashboard' && <Dashboard setView={goTo} setSelPat={setSelPat} />}
    {view === 'agenda' && <Agenda />}
    {/* Aquí inyectamos la memoria a la pantalla de Pacientes */}
    {view === 'pacientes' && <Pacientes setView={goTo} setSelPat={setSelPat} patientsList={patientsList} setPatientsList={setPatientsList} />}
    {view === 'historia' && <Historia patient={selPat} teeth={teeth} setTeeth={setTeeth} teethEvolucion={teethEvolucion} setTeethEvolucion={setTeethEvolucion} setView={goTo} />}
    {view === 'caja' && <Caja />}
    {view === 'laboratorio' && <Laboratorio />}
    {view === 'reportes' && <Reportes />}
    {view === 'whatsapp' && <WhatsApp />}
    {view === 'config' && <Config />}
    </div>
  </div>
</div>
);
}
