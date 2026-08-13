// src/components/vistas/Config.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import useGoogleCalendar from '../../utils/useGoogleCalendar';
import useMetaWhatsApp from '../../utils/useMetaWhatsApp';
import { BD, DN, MU, P, RJ, WA, DEFAULT_HORARIO, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import Seguridad from './Seguridad';

const TABS = [
  { id: 'generales', lbl: 'Generales' },
  { id: 'integraciones', lbl: 'Integraciones' },
  { id: 'seguridad', lbl: 'Seguridad' },
];

const cardStyle = {
  background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', padding: 20,
  backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
};

const EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

// Cabecera de tarjeta, etiqueta de campo, campo y botón de guardar: un solo
// estilo para los tres bloques de Ajustes, así los formularios no divergen.
const tituloCardStyle = { fontSize: 15, fontWeight: 600, color: DN };

const labelStyle = { fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 };

const inputStyle = {
  width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: '10px',
  border: `1px solid ${BD}`, background: '#F5F5F5', fontSize: 13, color: DN,
  outline: 'none', boxSizing: 'border-box',
  transition: `border-color .18s ${EASE}, background-color .18s ${EASE}`,
};

const guardarBtnStyle = {
  minHeight: 44, padding: '12px 22px', fontSize: 13.5, fontWeight: 600,
  borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: 8,
};

const accionBtnStyle = { minHeight: 44, padding: '12px 20px', fontSize: 13.5, fontWeight: 600, borderRadius: '10px' };

const avisoErrorStyle = {
  padding: '10px 12px', background: '#FEE2E2', borderLeft: `3px solid ${RJ}`,
  borderRadius: '10px', color: RJ, fontSize: 13, lineHeight: 1.5,
};

export default function Config({ clinicaId, clinica, clinicaRol, refrescarClinica }) {
  const [tab, setTab] = useState('generales');

  return (
    <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
      {/* <button>, no <div onClick>: antes la pestaña no tenía foco de teclado
          ni :hover -- una inactiva se veía igual pasándole el mouse o no. */}
      <div role="tablist" style={{ display: 'flex', gap: 1, marginBottom: 20, borderBottom: `1px solid ${BD}` }}>
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className="tab-item u-focusable"
            style={{
              padding: '12px 18px', minHeight: 44, display: 'flex', alignItems: 'center',
              cursor: 'pointer', fontSize: 15, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? P : MU, background: 'none', border: 'none',
              borderBottom: tab === t.id ? `2px solid ${P}` : '2px solid transparent',
              marginBottom: -1, borderRadius: 0, font: 'inherit',
            }}>
            {t.lbl}
          </button>
        ))}
      </div>

      {tab === 'generales' && <Generales clinicaId={clinicaId} clinica={clinica} refrescarClinica={refrescarClinica} />}
      {tab === 'integraciones' && <Integraciones clinicaId={clinicaId} />}
      {tab === 'seguridad' && <Seguridad clinicaId={clinicaId} rol={clinicaRol} />}
    </div>
  );
}

// ── GENERALES ────────────────────────────────────────────────────────────────
// Datos de contacto del consultorio: funcional, se guarda en la tabla
// `clinicas`. Nombre, logo y color de marca viven en la pestaña Apariencia —
// eso es identidad de marca, esto es información operativa. El resto
// (horario, agente IA, notificaciones) sigue como maqueta — fuera de alcance
// de esta fase.
function Generales({ clinicaId, clinica, refrescarClinica }) {
  // Un solo objeto en vez de 4 useState sueltos: la regla de lint marca varios
  // setState síncronos seguidos en el cuerpo de un efecto (pueden encadenar
  // renders) -- acá no hace falta, es sincronizar 4 campos de un mismo
  // formulario a la vez cuando llega `clinica`.
  const [datos, setDatos] = useState({ direccion: '', telefono: '', email: '', cop: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // La regla de lint marca un setState LLAMADO DIRECTO en el cuerpo del
    // efecto (no importa cuántos); envolverlo en una función y llamarla es el
    // patrón que ya usa el resto del archivo (MiPerfil, Apariencia) para
    // sincronizar estado local desde una prop que llega después del primer render.
    const sincronizar = () => {
      if (!clinica) return;
      setDatos({
        direccion: clinica.direccion || '',
        telefono: clinica.telefono || '',
        email: clinica.email || '',
        cop: clinica.cop || '',
      });
    };
    sincronizar();
  }, [clinica]);

  const guardar = async () => {
    if (!clinicaId) return;
    setGuardando(true);
    const { error } = await supabase.from('clinicas').update(datos).eq('id', clinicaId);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    alert('Datos del consultorio actualizados.');
    refrescarClinica?.();
  };

  return (
    <div>
      <div className="u-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
        <div style={cardStyle}>
          <div style={{ ...tituloCardStyle, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${BD}` }}>Datos de contacto</div>

          {[
            ['Dirección', 'direccion'],
            ['Teléfono', 'telefono'],
            ['Email', 'email'],
            ['COP', 'cop'],
          ].map(([label, k]) => (
            <div key={k} style={{ marginBottom: 12 }}>
              <label style={labelStyle}>{label}</label>
              <input value={datos[k]} onChange={e => setDatos(d => ({ ...d, [k]: e.target.value }))} className="field" style={inputStyle} />
            </div>
          ))}

          <Button onClick={guardar} disabled={guardando} style={{ ...guardarBtnStyle, marginTop: 8 }}>
            <Icon name="save" size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>

        <HorarioCard clinicaId={clinicaId} clinica={clinica} refrescarClinica={refrescarClinica} />

        {[
          { title: 'WhatsApp IA — Agente Nanda', fields: [['Número WA', '+51 915 054 145'], ['Nombre del agente', 'Nanda'], ['Recordatorio (horas antes)', '24h y 1h'], ['Auto-respuesta', 'Activada']] },
          { title: 'Notificaciones', fields: [['Nuevas citas', 'Email + WhatsApp'], ['Pagos recibidos', 'Email'], ['Laboratorio listo', 'WhatsApp'], ['Ausencias', 'WhatsApp']] },
        ].map((sec, si) => (
          <div key={si} style={cardStyle}>
            <div style={{ ...tituloCardStyle, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${BD}` }}>{sec.title}</div>
            {sec.fields.map(([k, v]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{k}</label>
                <input defaultValue={v} className="field" style={inputStyle} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HORARIO DE ATENCIÓN ──────────────────────────────────────────────────────
// Se guarda en clinicas.horario (jsonb) y alimenta el rango de horas y el
// estado abierto/cerrado que dibuja Agenda.jsx en su grilla semanal/diaria.
function HorarioCard({ clinicaId, clinica, refrescarClinica }) {
  const [lvInicio, setLvInicio] = useState(DEFAULT_HORARIO.lv_inicio);
  const [lvFin, setLvFin] = useState(DEFAULT_HORARIO.lv_fin);
  const [sabCerrado, setSabCerrado] = useState(DEFAULT_HORARIO.sab_cerrado);
  const [sabInicio, setSabInicio] = useState(DEFAULT_HORARIO.sab_inicio);
  const [sabFin, setSabFin] = useState(DEFAULT_HORARIO.sab_fin);
  const [duracionCita, setDuracionCita] = useState(DEFAULT_HORARIO.duracion_cita);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const sincronizar = () => {
      const h = { ...DEFAULT_HORARIO, ...(clinica?.horario || {}) };
      setLvInicio(h.lv_inicio);
      setLvFin(h.lv_fin);
      setSabCerrado(h.sab_cerrado);
      setSabInicio(h.sab_inicio);
      setSabFin(h.sab_fin);
      setDuracionCita(h.duracion_cita);
    };
    sincronizar();
  }, [clinica]);

  const guardar = async () => {
    if (!clinicaId) return;
    setGuardando(true);
    const horario = { lv_inicio: lvInicio, lv_fin: lvFin, sab_inicio: sabInicio, sab_fin: sabFin, sab_cerrado: sabCerrado, duracion_cita: Number(duracionCita) };
    const { error } = await supabase.from('clinicas').update({ horario }).eq('id', clinicaId);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    alert('Horario de atención actualizado.');
    refrescarClinica?.();
  };

  const timeInputStyle = { ...inputStyle, width: 'auto', flex: 1, fontVariantNumeric: 'tabular-nums' };

  return (
    <div style={cardStyle}>
      <div style={{ ...tituloCardStyle, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${BD}` }}>Horario de atención</div>

      <label style={labelStyle}>Lunes a viernes</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="time" value={lvInicio} onChange={e => setLvInicio(e.target.value)} className="field" style={timeInputStyle} />
        <input type="time" value={lvFin} onChange={e => setLvFin(e.target.value)} className="field" style={timeInputStyle} />
      </div>

      {/* Toggle pill en vez de checkbox nativo: mismo <input type="checkbox">
          por debajo (teclado y lector de pantalla de fábrica), redibujado
          con la clase .switch de ui.css. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 4 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Sábado</label>
        <label style={{ fontSize: 12, color: MU, display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', minHeight: 36 }}>
          Abierto
          <input type="checkbox" checked={!sabCerrado} onChange={e => setSabCerrado(!e.target.checked)} className="switch" />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, opacity: sabCerrado ? .5 : 1 }}>
        <input type="time" disabled={sabCerrado} value={sabInicio} onChange={e => setSabInicio(e.target.value)} className="field" style={timeInputStyle} />
        <input type="time" disabled={sabCerrado} value={sabFin} onChange={e => setSabFin(e.target.value)} className="field" style={timeInputStyle} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Domingo</label>
        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: MU, background: '#F5F5F5' }}>Cerrado — la Agenda no muestra domingos</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Duración de cita por defecto</label>
        <select value={duracionCita} onChange={e => setDuracionCita(e.target.value)} className="field" style={inputStyle}>
          {[15, 20, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m} minutos</option>)}
        </select>
      </div>

      <Button onClick={guardar} disabled={guardando} style={guardarBtnStyle}>
        <Icon name="save" size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  );
}


// ── INTEGRACIONES ────────────────────────────────────────────────────────────
function Integraciones({ clinicaId }) {
  const google = useGoogleCalendar(clinicaId);
  const wa = useMetaWhatsApp(clinicaId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(114, 157, 238, 0.12)', color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="clock" size={19} />
          </div>
          <div>
            <div style={tituloCardStyle}>Google Calendar</div>
            <div style={{ fontSize: 12, color: google.connected ? WA : MU, fontWeight: 600 }}>
              {google.connected ? 'Conectado' : 'No conectado'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: MU, margin: '0 0 16px', lineHeight: 1.5 }}>
          Sincroniza las citas de tu Agenda con tu calendario de Google: al crear, editar o eliminar una cita se refleja automáticamente.
        </p>
        {google.connected ? (
          <Button variant="danger" onClick={google.disconnect} style={accionBtnStyle}>Desconectar</Button>
        ) : (
          <Button onClick={() => google.connect()} style={accionBtnStyle}>Conectar con Google</Button>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#DCFCE7', color: WA, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="chat" size={19} />
          </div>
          <div>
            <div style={tituloCardStyle}>WhatsApp Business</div>
            <div style={{ fontSize: 12, color: wa.connected ? WA : MU, fontWeight: 600 }}>
              {wa.loading ? 'Verificando…' : wa.connected ? 'Conectado' : 'No conectado'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: MU, margin: '0 0 12px', lineHeight: 1.5 }}>
          Conecta tu número de WhatsApp Business (Meta) para automatizar mensajes con pacientes.
        </p>

        {wa.errorMsg && (
          <div style={{ ...avisoErrorStyle, marginBottom: 12 }}>
            {wa.errorMsg}
          </div>
        )}

        {wa.connected ? (
          <>
            {wa.connection?.businesses?.length > 0 && (
              <div style={{ fontSize: 13, color: DN, marginBottom: 10 }}>
                {wa.connection.businesses.map(b => b.name).join(', ')}
              </div>
            )}
            <Button variant="danger" onClick={wa.disconnect} style={accionBtnStyle}>Desconectar</Button>
          </>
        ) : (
          <Button onClick={wa.connect} disabled={wa.connecting} style={accionBtnStyle}>
            {wa.connecting ? 'Conectando…' : 'Conectar con Meta'}
          </Button>
        )}
      </div>
    </div>
  );
}
