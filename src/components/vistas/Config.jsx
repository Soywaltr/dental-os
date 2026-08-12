// src/components/vistas/Config.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import useGoogleCalendar from '../../utils/useGoogleCalendar';
import useMetaWhatsApp from '../../utils/useMetaWhatsApp';
import { BD, DN, MU, MT, P, RJ, WA, DEFAULT_HORARIO, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import { BUCKET, rutaPerfil, rutaFirma, rutaLogo, firmar, invalidarFirma } from '../../utils/storage';
import { contrasteTexto } from '../../utils/theme';
import Seguridad from './Seguridad';

const TABS = [
  { id: 'generales', lbl: 'Generales' },
  { id: 'apariencia', lbl: 'Apariencia' },
  { id: 'perfil', lbl: 'Mi perfil' },
  { id: 'integraciones', lbl: 'Integraciones' },
  { id: 'seguridad', lbl: 'Seguridad' },
];

// Tema por defecto ("Dra. Sol Vargas") -- el mismo valor que :root en
// tokens.css. Si accent_color es null en Supabase, la clínica todavía no
// eligió un color propio y el selector arranca mostrando este.
const ACENTO_DEFECTO = '#6C5CE7';

const cardStyle = {
  background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', padding: 20,
  backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
};

const EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

// Cabecera de tarjeta, etiqueta de campo, campo y botón de guardar: un solo
// estilo para los tres bloques de Ajustes, así los formularios no divergen.
const tituloCardStyle = { fontSize: 15, fontWeight: 600, color: DN };

const labelStyle = { fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 };

const labelCapsStyle = { ...labelStyle, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 };

const inputStyle = {
  width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: '10px',
  border: `1px solid ${BD}`, background: '#F1F1F7', fontSize: 13, color: DN,
  outline: 'none', boxSizing: 'border-box',
  transition: `border-color .18s ${EASE}, background-color .18s ${EASE}`,
};

const guardarBtnStyle = {
  minHeight: 44, padding: '12px 22px', fontSize: 13.5, fontWeight: 600,
  borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: 8,
};

const enlaceArchivoStyle = {
  fontSize: 13, color: P, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', minHeight: 36,
  transition: `color .18s ${EASE}`,
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
      {tab === 'apariencia' && <Apariencia clinicaId={clinicaId} clinica={clinica} refrescarClinica={refrescarClinica} />}
      {tab === 'perfil' && <MiPerfil clinicaId={clinicaId} />}
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
        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: MU, background: '#F1F1F7' }}>Cerrado — la Agenda no muestra domingos</div>
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

// ── APARIENCIA / MARCA (white-label) ─────────────────────────────────────────
// Todo lo que hace a la identidad visual de la clínica en un solo lugar:
// nombre comercial, logo y el acento de marca. El acento elegido acá es lo
// único que cambia el tema de TODA la app -- ver utils/theme.js: al guardar,
// refrescarClinica() vuelve a traer accent_color, y App.jsx lo aplica sobre
// :root. hover/press/soft/ring se recalculan solos (color-mix en tokens.css).
function Apariencia({ clinicaId, clinica, refrescarClinica }) {
  const [nombre, setNombre] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [acento, setAcento] = useState(ACENTO_DEFECTO);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  useEffect(() => {
    let vivo = true;
    const sincronizar = async () => {
      if (!clinica) return;
      setNombre(clinica.nombre || '');
      setAcento(clinica.accent_color || ACENTO_DEFECTO);
      const firmada = clinica.logo_url ? await firmar(clinica.logo_url) : null;
      if (vivo) setLogoUrl(firmada);
    };
    sincronizar();
    return () => { vivo = false; };
  }, [clinica]);

  const subirLogo = async (e) => {
    const file = e.target.files[0];
    if (!file || !clinicaId) return;
    setSubiendoLogo(true);
    const path = rutaLogo(clinicaId);
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (upErr) { alert('Error al subir el logo: ' + upErr.message); setSubiendoLogo(false); return; }
    // Se guarda la RUTA, no una URL pública: con el bucket privado esa URL no
    // resuelve, y la firma se genera al momento de mostrar.
    const { error: dbErr } = await supabase.from('clinicas').update({ logo_url: path }).eq('id', clinicaId);
    setSubiendoLogo(false);
    if (dbErr) { alert('Error al guardar el logo: ' + dbErr.message); return; }
    invalidarFirma(path);
    setLogoUrl(await firmar(path));
    refrescarClinica?.();
  };

  const guardar = async () => {
    if (!clinicaId) return;
    // El campo de texto acepta cualquier tecleo -- sin este chequeo, un hex a
    // medio escribir se guardaría tal cual, aplicarTema() lo fijaría en
    // --accent, y CADA componente que usa #7B5CFA quedaría inválido en
    // tiempo de cómputo: botones, ítem activo del menú, foco, todo a la vez.
    // Justo lo que "el diseño no debe romperse con ningún acento" pide evitar.
    if (!/^#[0-9A-Fa-f]{6}$/.test(acento)) {
      alert('El color de acento debe ser un hex válido, por ejemplo #6C5CE7.');
      return;
    }
    setGuardando(true);
    // null cuando vuelve a ser exactamente el default: así una clínica que
    // "restablece" no se queda pegada a un accent_color que por casualidad
    // coincide con el tema por defecto de hoy -- si el default cambia en
    // tokens.css el día de mañana, esta clínica lo sigue automáticamente.
    const valor = acento.toUpperCase() === ACENTO_DEFECTO ? null : acento;
    const { error } = await supabase.from('clinicas')
      .update({ nombre, accent_color: valor })
      .eq('id', clinicaId);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    alert('Apariencia actualizada.');
    refrescarClinica?.();
  };

  const textoSobreAcento = contrasteTexto(acento);

  return (
    <div className="u-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
      <div style={cardStyle}>
        <div style={{ ...tituloCardStyle, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${BD}` }}>Marca</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: '14px', background: MT, border: `1px solid ${BD}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo del consultorio" onError={() => setLogoUrl(null)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Icon name="document" size={20} color={MU} />
            )}
          </div>
          <div>
            <div style={{ ...labelCapsStyle, marginBottom: 2 }}>Logo</div>
            <label htmlFor="logo-upload" className="link-accent" style={enlaceArchivoStyle}>
              {subiendoLogo ? 'Subiendo...' : (logoUrl ? 'Cambiar logo' : '+ Subir logo')}
            </label>
            <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={subirLogo} />
          </div>
        </div>

        <label style={labelStyle}>Nombre comercial</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Consultorio Dra. Sol Vargas"
          className="field" style={{ ...inputStyle, marginBottom: 16 }} />

        <label style={labelStyle}>Color de acento</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <input type="color" value={acento} onChange={e => setAcento(e.target.value)} className="color-swatch u-focusable" aria-label="Elegir color de acento" />
          <input value={acento} onChange={e => setAcento(e.target.value)} placeholder="#6C5CE7" maxLength={7}
            className="field" style={{ ...inputStyle, flex: 1, fontVariantNumeric: 'tabular-nums' }} />
        </div>
        {acento !== ACENTO_DEFECTO && (
          <button onClick={() => setAcento(ACENTO_DEFECTO)} className="link-accent u-focusable"
            style={{ ...enlaceArchivoStyle, background: 'none', border: 'none', padding: 0, marginBottom: 14 }}>
            Restablecer al color por defecto
          </button>
        )}

        <Button onClick={guardar} disabled={guardando} style={{ ...guardarBtnStyle, marginTop: acento !== ACENTO_DEFECTO ? 0 : 10 }}>
          <Icon name="save" size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {/* Vista previa EN VIVO: usa el color todavía sin guardar (acento),
          nunca la variable --accent real -- si repintara la app entera con
          cada tecla, una clínica probando colores vería parpadear todo el
          software antes de decidirse. */}
      <div style={cardStyle}>
        <div style={{ ...tituloCardStyle, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${BD}` }}>Vista previa</div>

        <div style={{ background: '#F1F1F7', borderRadius: '14px', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '10px', overflow: 'hidden', background: logoUrl ? 'transparent' : acento, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {logoUrl
                ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: textoSobreAcento, fontSize: 13, fontWeight: 700 }}>{(nombre || 'C').charAt(0).toUpperCase()}</span>}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: DN }}>{nombre || 'Nombre del consultorio'}</div>
          </div>

          {/* Ítem de navegación activo — mismo patrón que el sidebar real. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: '10px', background: `color-mix(in srgb, ${acento} 10%, transparent)`, color: acento, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            <Icon name="calendar" size={15} /> Agenda
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', fontSize: 13, color: MU, marginBottom: 14 }}>
            <Icon name="document" size={15} /> Historial
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button disabled style={{ background: acento, color: textoSobreAcento, border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'default' }}>
              + Nueva cita
            </button>
            {/* --accent se fija SOLO en este input (las variables CSS heredan
                al elemento, no escalan hacia arriba): el switch real de
                .switch:checked usa #7B5CFA, así que acá se previsualiza
                con el color en edición sin tocar el tema global de la app. */}
            <input type="checkbox" defaultChecked disabled className="switch" style={{ '--accent': acento, cursor: 'default' }} aria-hidden="true" tabIndex={-1} />
          </div>
        </div>

        <p style={{ fontSize: 12, color: MU, margin: '12px 0 0', lineHeight: 1.5 }}>
          Así se ve el ítem activo del menú, el botón principal y el interruptor con este color. Guarda para aplicarlo a todo el sistema.
        </p>
      </div>
    </div>
  );
}

// ── MI PERFIL ────────────────────────────────────────────────────────────────
function MiPerfil({ clinicaId }) {
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [firmaUrl, setFirmaUrl] = useState(null);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [subiendoFirma, setSubiendoFirma] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setNombre(user.user_metadata?.full_name || '');
        setTelefono(user.user_metadata?.phone || '');
        setEmail(user.email || '');
      }
      if (clinicaId) {
        // firmar() devuelve null si el archivo no existe, así que la tarjeta
        // muestra su estado vacío en vez de una imagen rota.
        setAvatarUrl(await firmar(rutaPerfil(clinicaId)));
        setFirmaUrl(await firmar(rutaFirma(clinicaId)));
      }
      setLoading(false);
    };
    cargar();
  }, [clinicaId]);

  const guardar = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nombre, phone: telefono } });
    setSaving(false);
    if (error) alert('Error al guardar: ' + error.message);
    else alert('Perfil actualizado.');
  };

  const subirAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file || !clinicaId) return;
    setSubiendoAvatar(true);
    const ruta = rutaPerfil(clinicaId);
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { upsert: true });
    if (error) { alert('Error al subir la foto: ' + error.message); setSubiendoAvatar(false); return; }
    invalidarFirma(ruta);
    setAvatarUrl(await firmar(ruta));
    setSubiendoAvatar(false);
  };

  const subirFirma = async (e) => {
    const file = e.target.files[0];
    if (!file || !clinicaId) return;
    setSubiendoFirma(true);
    const ruta = rutaFirma(clinicaId);
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { upsert: true });
    if (error) { alert('Error al subir la firma: ' + error.message); setSubiendoFirma(false); return; }
    invalidarFirma(ruta);
    setFirmaUrl(await firmar(ruta));
    setSubiendoFirma(false);
  };

  if (loading) return <div style={{ padding: 20, color: MU, fontSize: 13.5 }}>Cargando perfil…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
      <div style={cardStyle}>
        <div style={{ ...tituloCardStyle, marginBottom: 16 }}>Datos personales</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: MT, border: `1px solid ${BD}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" onError={() => setAvatarUrl(null)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Icon name="users" size={24} color={MU} />
            )}
          </div>
          <div>
            <label htmlFor="avatar-upload" className="link-accent" style={enlaceArchivoStyle}>
              {subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
            </label>
            <input type="file" id="avatar-upload" accept="image/*" style={{ display: 'none' }} onChange={subirAvatar} />
          </div>
        </div>

        <label style={labelCapsStyle}>Nombre completo</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Dra. Sol Vargas"
          className="field" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelCapsStyle}>Teléfono</label>
        <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+51 915 054 145"
          className="field" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelCapsStyle}>Email</label>
        <input value={email} disabled
          className="field" style={{ ...inputStyle, background: MT, color: MU }} />

        <Button onClick={guardar} disabled={saving} style={{ ...guardarBtnStyle, marginTop: 18 }}>
          <Icon name="save" size={15} /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      <div style={cardStyle}>
        <div style={{ ...tituloCardStyle, marginBottom: 6 }}>Firma y sello digital</div>
        <p style={{ fontSize: 13, color: MU, margin: '0 0 14px', lineHeight: 1.5 }}>Se usa al imprimir recetas y presupuestos en el Historial.</p>
        {firmaUrl ? (
          <img src={firmaUrl} alt="Firma y sello" onError={() => setFirmaUrl(null)} style={{ maxHeight: 70, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 12 }} />
        ) : (
          <div style={{ height: 70, border: `1px dashed ${BD}`, borderRadius: '14px', background: '#F1F1F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A8A96', fontSize: 13, marginBottom: 12 }}>
            Sin firma configurada
          </div>
        )}
        <label htmlFor="firma-upload" className="link-accent" style={enlaceArchivoStyle}>
          {subiendoFirma ? 'Subiendo...' : (firmaUrl ? 'Cambiar firma/sello' : '+ Subir firma y sello')}
        </label>
        <input type="file" id="firma-upload" accept="image/*" style={{ display: 'none' }} onChange={subirFirma} />
      </div>
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
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(123, 92, 250, 0.12)', color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
