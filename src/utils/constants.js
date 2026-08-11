// src/utils/constants.js

export const TODAS_NACIONES = [
  { n: "Perú", c: "+51", b: "🇵🇪" }, { n: "Colombia", c: "+57", b: "🇨🇴" }, { n: "Venezuela", c: "+58", b: "🇻🇪" },
  { n: "Ecuador", c: "+593", b: "🇪🇨" }, { n: "Argentina", c: "+54", b: "🇦🇷" }, { n: "Chile", c: "+56", b: "🇨🇱" },
  { n: "España", c: "+34", b: "🇪🇸" }, { n: "México", c: "+52", b: "🇲🇽" }, { n: "Estados Unidos", c: "+1", b: "🇺🇸" },
  { n: "Bolivia", c: "+591", b: "🇧🇴" }, { n: "Brasil", c: "+55", b: "🇧🇷" }, { n: "Costa Rica", c: "+506", b: "🇨🇷" },
  { n: "Guatemala", c: "+502", b: "🇬🇹" }, { n: "Honduras", c: "+504", b: "🇭🇳" }, { n: "Nicaragua", c: "+505", b: "🇳🇮" },
  { n: "Panamá", c: "+507", b: "🇵🇦" }, { n: "Paraguay", c: "+595", b: "🇵🇾" }, { n: "Rep. Dominicana", c: "+1", b: "🇩🇴" },
  { n: "Uruguay", c: "+598", b: "🇺🇾" }, { n: "Italia", c: "+39", b: "🇮🇹" }
].sort((a, b) => a.n.localeCompare(b.n));

export const labelStyleDoc = {
  fontSize: '10px', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '4px'
};

export const inputStyleDoc = {
  width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',
  fontSize: '12px', color: '#334155', background: '#fff', boxSizing: 'border-box',
  outline: 'none', height: '36px', transition: 'border-color 0.2s ease',
};

export const CLIENT_ID = "849091491290-t1h1q1p8j40rhndjlosh0e0dsokm5907.apps.googleusercontent.com";
export const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
export const SCOPES = "https://www.googleapis.com/auth/calendar.events";

// Integración WhatsApp Business (Meta) — OAuth de autorización de negocio.
// META_APP_ID es un PLACEHOLDER: reemplázalo por el App ID real de tu app en
// developers.facebook.com (producto "WhatsApp" agregado) para que el botón
// "Conectar WhatsApp Business" funcione. Sin un App ID real, Meta rechaza el
// diálogo de OAuth con un error de "invalid app id".
export const META_APP_ID = "TU_META_APP_ID_AQUI";
export const META_OAUTH_SCOPE = "whatsapp_business_management,whatsapp_business_messaging";
export const META_OAUTH_STATE = "dentalos_whatsapp_connect";

// Paleta — ya no hex fijos, sino alias de las variables CSS declaradas en
// src/tokens.css (":root" y ':root[data-theme="dark"]'). P es el ÚNICO acento
// interactivo de toda la app (botones primarios, tabs activos, enlaces, foco)
// -- por eso apunta a --accent, que cada clínica puede fijar como su color de
// marca (white-label). Como estas ~15 vistas ya importan de aquí, repuntar
// un solo valor cambia toda la app y además la deja lista para modo oscuro sin
// tocar cada archivo.
// MT apunta a --surface-TERTIARY (la superficie hundida), no a --secondary (el
// fondo de página), porque eso es lo que significa en las ~10 llamadas que lo
// usan: fondo de avatar sin foto, bloque de código del MFA, input
// deshabilitado, caja de aviso. Con el fondo de página ahora casi blanco
// (#F8F9FC, para que el lienzo teñido resalte), apuntarlo ahí dejaría todos
// esos elementos invisibles sobre una tarjeta blanca.
export const P = 'var(--accent)', PD = 'var(--accent-pressed)', DN = 'var(--label-primary)', LT = 'var(--surface-primary)', MT = 'var(--surface-tertiary)', BD = 'var(--separator)', MU = 'var(--label-secondary)', GL = 'var(--amber)', WA = 'var(--green)', AZ = 'var(--accent)', RJ = 'var(--red)';

// Identidad de la serie "Ingresos" en los gráficos. NO sigue el tema: es el
// color fijo de una serie de datos, no chrome.
//
// Es teal. El acento pasó de violeta a verde salvia en el rediseño
// glassmorphism, así que este teal quedó más cerca en tono de --accent (ΔE
// 10.5 en OKLab) y de --green (ΔE 9.1) que antes -- no colisiona (ambos siguen
// por encima del piso de daltonismo) pero ya no tiene el margen amplio que
// tenía contra el violeta (ΔE 24.2). Aparecen en formas y lugares distintos
// (línea de gráfico vs. píldora de nav vs. barra de estado), así que no se
// confunden en pantalla, pero si en el futuro se agrega una CUARTA serie
// verde/teal, hay que remedir con validate_palette.js antes de elegirla.
export const CAT_ACCENT = '#0D9488';

// Superficies de tarjeta — vidrio de verdad: fondo translúcido + blur +
// borde de luz, no la superficie sólida y plana de la etapa anterior (ese
// diseño evitaba blur a propósito; el rediseño actual lo pide explícitamente
// en las 12 vistas que ya importan estas cuatro constantes, más Login.jsx,
// Modal.jsx y MFAChallenge.jsx -- repuntar sólo esto les da vidrio a todas
// sin tocar cada archivo). Los tokens --panel-glass-* están en tokens.css.
export const GLASS_BG = 'var(--panel-glass-bg)';
export const GLASS_BLUR = 'var(--panel-glass-blur)';
export const GLASS_BORDER = '1px solid var(--panel-glass-border)';
export const GLASS_SHADOW = 'var(--shadow-raised)';
// Botón primario: relleno plano con el acento, sin degradado -- Apple casi
// nunca degrada un botón. El nombre GRAD_PRIMARY se conserva por compatibilidad
// con los imports existentes (Button.jsx, Login.jsx, MFAChallenge.jsx, App.jsx).
export const GRAD_PRIMARY = 'var(--accent)';
export const GRAD_PRIMARY_SHADOW = '0 4px 14px var(--accent-soft)';
export const GRAD_SUCCESS = 'var(--green)';

export const PATIENTS = [
  { id: 1, name: 'María López', age: 32, phone: '+51 987 654 321', email: 'maria@gmail.com', tag: 'activo', treatment: 'Ortodoncia', nextVisit: 'Hoy 9:00', since: '2023', balance: 0, doc: '72345678', blood: 'O+', allergies: 'Ninguna', meds: 'Ninguno' },
  { id: 2, name: 'Juan Ramírez', age: 28, phone: '+51 976 543 210', email: 'juan@gmail.com', tag: 'nuevo', treatment: 'Limpieza', nextVisit: 'Hoy 10:30', since: '2025', balance: 80, doc: '87654321', blood: 'A+', allergies: 'Penicilina', meds: 'Ninguno' },
  { id: 3, name: 'Ana Solís', age: 45, phone: '+51 965 432 109', email: 'ana@gmail.com', tag: 'activo', treatment: 'Blanqueamiento', nextVisit: 'Hoy 12:00', since: '2022', balance: 0, doc: '23456789', blood: 'B+', allergies: 'Ninguna', meds: 'Enalapril' },
  { id: 4, name: 'Carlos Vega', age: 38, phone: '+51 954 321 098', email: 'carlos@gmail.com', tag: 'activo', treatment: 'Implante', nextVisit: 'Mar 9:00', since: '2021', balance: 350, doc: '34567890', blood: 'AB-', allergies: 'Ibuprofeno', meds: 'Ninguno' },
  { id: 5, name: 'Lucía Torres', age: 22, phone: '+51 943 210 987', email: 'lucia@gmail.com', tag: 'activo', treatment: 'Carillas', nextVisit: 'Mié 11:00', since: '2024', balance: 0, doc: '45678901', blood: 'O-', allergies: 'Ninguna', meds: 'Ninguno' },
  { id: 6, name: 'Roberto Paz', age: 55, phone: '+51 932 109 876', email: 'roberto@gmail.com', tag: 'activo', treatment: 'Corona CMC', nextVisit: 'Jue 3:00', since: '2020', balance: 120, doc: '56789012', blood: 'A-', allergies: 'Ninguna', meds: 'Metformina' },
];

export const TODAY = [
  { time: '9:00', patient: 'María López', pid: 1, treat: 'Control ortodoncia', dur: 30, status: 'confirmado', av: 'ML', cost: 80 },
  { time: '10:30', patient: 'Juan Ramírez', pid: 2, treat: 'Limpieza y profilaxis', dur: 45, status: 'nuevo', av: 'JR', cost: 60 },
  { time: '12:00', patient: 'Ana Solís', pid: 3, treat: 'Blanqueamiento', dur: 60, status: 'confirmado', av: 'AS', cost: 180 },
  { time: '15:00', patient: 'Karla Ríos', pid: null, treat: 'Consulta inicial', dur: 30, status: 'pendiente', av: 'KR', cost: 30 },
  { time: '16:30', patient: 'Miguel Paredes', pid: null, treat: 'Extracción simple', dur: 45, status: 'confirmado', av: 'MP', cost: 90 },
];

export const WEEK_APTS = {
  0: [{ h: 9, p: 'María L.', t: 'Ortodoncia', col: P }, { h: 10, p: 'Juan R.', t: 'Limpieza', col: '#0a7a4a' }, { h: 12, p: 'Ana S.', t: 'Blanqueamiento', col: GL }, { h: 15, p: 'Karla R.', t: 'Consulta', col: MU }, { h: 16, p: 'Miguel P.', t: 'Extracción', col: P }],
  1: [{ h: 9, p: 'Carlos V.', t: 'Implante', col: P }, { h: 11, p: 'Diego M.', t: 'Control', col: '#0a7a4a' }, { h: 15, p: 'Rosa L.', t: 'Limpieza', col: MU }],
  2: [{ h: 10, p: 'Fernanda C.', t: 'Consulta', col: P }, { h: 11, p: 'Lucía T.', t: 'Carillas', col: GL }, { h: 14, p: 'Pedro N.', t: 'Corona', col: P }],
  3: [{ h: 9, p: 'Ana S.', t: 'Control', col: '#0a7a4a' }, { h: 15, p: 'Roberto P.', t: 'Corona', col: GL }],
  4: [{ h: 10, p: 'Fernanda C.', t: 'Consulta', col: P }, { h: 16, p: 'Elena R.', t: 'Blanqueamiento', col: P }],
  5: [{ h: 9, p: 'Juan R.', t: 'Control', col: '#0a7a4a' }],
};

export const INVOICES = [
  { id: 'F-0042', patient: 'María López', pid: 1, treat: 'Control ortodoncia', date: '10 Jun 2025', total: 80, paid: 80, status: 'pagado', method: 'Yape' },
  { id: 'F-0041', patient: 'Carlos Vega', pid: 4, treat: 'Implante dental', date: '15 May 2025', total: 1200, paid: 850, status: 'parcial', method: 'Transferencia' },
  { id: 'F-0040', patient: 'Roberto Paz', pid: 6, treat: 'Corona CMC', date: '20 May 2025', total: 450, paid: 330, status: 'parcial', method: 'Efectivo' },
  { id: 'F-0039', patient: 'Ana Solís', pid: 3, treat: 'Blanqueamiento', date: '01 Jun 2025', total: 180, paid: 180, status: 'pagado', method: 'Yape' },
  { id: 'F-0038', patient: 'Diego M.', pid: null, treat: 'Endodoncia', date: '28 Abr 2025', total: 320, paid: 0, status: 'pendiente', method: '—' },
  { id: 'F-0037', patient: 'Lucía Torres', pid: 5, treat: 'Carillas porcelana', date: '01 May 2025', total: 600, paid: 600, status: 'pagado', method: 'Transferencia' },
];

export const LAB_ORDERS = [
  { id: 'L-021', patient: 'Roberto Paz', type: 'Corona CMC', tooth: '26', lab: 'Laboratorio Dental Cruz', status: 'en_proceso', sent: '05 Jun', eta: '12 Jun', cost: 180 },
  { id: 'L-020', patient: 'Carlos Vega', type: 'Implante abutment', tooth: '36', lab: 'ProDental Trujillo', status: 'listo', sent: '28 May', eta: '04 Jun', cost: 220 },
  { id: 'L-019', patient: 'Lucía Torres', type: 'Carillas porcelana x4', tooth: '12-22', lab: 'Laboratorio Dental Cruz', status: 'en_proceso', sent: '03 Jun', eta: '14 Jun', cost: 480 },
  { id: 'L-018', patient: 'María López', type: 'Retenedor Hawley', tooth: '—', lab: 'OrthoLab', status: 'entregado', sent: '20 May', eta: '27 May', cost: 90 },
];

export const TRATAMIENTOS_CAT = [
  { cat: 'Preventivo', items: ['Consulta / Diagnóstico', 'Limpieza y profilaxis', 'Radiografía periapical', 'Radiografía panorámica', 'Fluorización', 'Sellantes'] },
  { cat: 'Restaurador', items: ['Resina compuesta', 'Amalgama', 'Ionómero de vidrio', 'Incrustación metálica', 'Incrustación estética'] },
  { cat: 'Endodoncia', items: ['Tratamiento de conducto (1 raíz)', 'Tratamiento de conducto (2 raíces)', 'Tratamiento de conducto (3+ raíces)', 'Pulpectomía', 'Pulpotomía'] },
  { cat: 'Estética', items: ['Blanqueamiento clínico', 'Carillas de porcelana', 'Carillas de resina', 'Micropigmentación gingival'] },
  { cat: 'Cirugía', items: ['Extracción simple', 'Extracción compleja', 'Cirugía de tercero molar', 'Frenectomía'] },
  { cat: 'Prótesis', items: ['Corona completa metálica', 'Corona metal-cerámica', 'Corona jacket', 'Prótesis removible parcial', 'Prótesis total'] },
  { cat: 'Implantología', items: ['Implante dental', 'Implante + corona', 'Injerto óseo'] },
  { cat: 'Ortodoncia', items: ['Ortodoncia fija metálica', 'Ortodoncia fija estética', 'Alineadores', 'Control mensual ortodoncia', 'Retenedor'] },
];

export const PRECIOS = {
  'Consulta / Diagnóstico': 30, 'Limpieza y profilaxis': 60, 'Radiografía periapical': 20, 'Radiografía panorámica': 45, 'Fluorización': 35, 'Sellantes': 25,
  'Resina compuesta': 80, 'Amalgama': 60, 'Ionómero de vidrio': 70, 'Incrustación metálica': 250, 'Incrustación estética': 300,
  'Tratamiento de conducto (1 raíz)': 280, 'Tratamiento de conducto (2 raíces)': 350, 'Tratamiento de conducto (3+ raíces)': 420, 'Pulpectomía': 180, 'Pulpotomía': 150,
  'Blanqueamiento clínico': 180, 'Carillas de porcelana': 350, 'Carillas de resina': 150, 'Micropigmentación gingival': 200,
  'Extracción simple': 90, 'Extracción compleja': 180, 'Cirugía de tercero molar': 280, 'Frenectomía': 200,
  'Corona completa metálica': 380, 'Corona metal-cerámica': 480, 'Corona jacket': 520, 'Prótesis removible parcial': 650, 'Prótesis total': 900,
  'Implante dental': 1200, 'Implante + corona': 1600, 'Injerto óseo': 800,
  'Ortodoncia fija metálica': 1800, 'Ortodoncia fija estética': 2400, 'Alineadores': 2800, 'Control mensual ortodoncia': 80, 'Retenedor': 90,
};

export const WA_MSGS = [
  { id: 1, name: 'Juan Ramírez', time: 'Hace 5 min', msg: 'Hola doctora, ¿tienen cita para el viernes?', unread: 1, thread: [{ from: 'patient', txt: 'Hola doctora, ¿tienen cita para el viernes?', t: '15:01' }, { from: 'bot', txt: '¡Hola Juan! Soy el asistente de la Dra. Sol Vargas 😊 Claro que sí, tenemos disponibilidad el viernes. ¿Prefieres mañana o tarde?', t: '15:01' }] },
  { id: 2, name: 'Karla Ríos', time: 'Hace 12 min', msg: 'Confirmado, ahí estaré a las 3pm 🙌', unread: 0, thread: [{ from: 'bot', txt: 'Hola Karla, te recordamos que tienes cita mañana a las 3:00 pm con la Dra. Sol Vargas. ¿Confirmas asistencia?', t: '14:50' }, { from: 'patient', txt: 'Confirmado, ahí estaré a las 3pm 🙌', t: '14:55' }] },
  { id: 3, name: 'Elena Ríos', time: 'Ayer', msg: '¿Cuánto cuesta el blanqueamiento?', unread: 2, thread: [{ from: 'patient', txt: '¿Cuánto cuesta el blanqueamiento?', t: '10:22' }, { from: 'bot', txt: '¡Hola Elena! El blanqueamiento dental clínico tiene un costo de S/180 e incluye la sesión completa en consultorio. El resultado es inmediato y dura hasta 2 años con buenos cuidados. ¿Te gustaría agendar una consulta de evaluación gratuita?', t: '10:22' }, { from: 'patient', txt: 'Sí me interesa', t: 'Ayer' }, { from: 'bot', txt: '¡Perfecto! ¿Qué días y horarios tienes disponibles esta semana?', t: 'Ayer' }] },
];

// FDI Odontogram Constantes
export const UA = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LA = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const UP = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const LP = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
export const TNAME = { 18: '3M sup der', 17: '2M sup der', 16: '1M sup der', 15: '2P sup der', 14: '1P sup der', 13: 'C sup der', 12: 'IL sup der', 11: 'IC sup der', 21: 'IC sup izq', 22: 'IL sup izq', 23: 'C sup izq', 24: '1P sup izq', 25: '2P sup izq', 26: '1M sup izq', 27: '2M sup izq', 28: '3M sup izq', 31: 'IC inf izq', 32: 'IL inf izq', 33: 'C inf izq', 34: '1P inf izq', 35: '2P inf izq', 36: '1M inf izq', 37: '2M inf izq', 38: '3M inf izq', 48: '3M inf der', 47: '2M inf der', 46: '1M inf der', 45: '2P inf der', 44: '1P inf der', 43: 'C inf der', 42: 'IL inf der', 41: 'IC inf der' };

export const TOOLS = [
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

export const TODAY_STR = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

// Horario de atención por defecto — usado como respaldo mientras clinica.horario
// no esté configurado, y como valor inicial del formulario en Ajustes.
export const DEFAULT_HORARIO = { lv_inicio: '08:00', lv_fin: '18:00', sab_inicio: '08:00', sab_fin: '13:00', sab_cerrado: false, duracion_cita: 30 };