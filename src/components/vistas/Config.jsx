// src/components/vistas/Config.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import useGoogleCalendar from '../../utils/useGoogleCalendar';
import useMetaWhatsApp from '../../utils/useMetaWhatsApp';
import { BD, DN, MU, MT, P, RJ, WA, DEFAULT_HORARIO, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import { BUCKET, rutaPerfil, rutaFirma, rutaLogo, firmar, invalidarFirma } from '../../utils/storage';
import Seguridad from './Seguridad';

const TABS = [
  { id: 'generales', lbl: 'Generales' },
  { id: 'perfil', lbl: 'Mi perfil' },
  { id: 'integraciones', lbl: 'Integraciones' },
  { id: 'seguridad', lbl: 'Seguridad' },
];

const cardStyle = {
  background: GLASS_BG, border: GLASS_BORDER, borderRadius: 12, padding: 20,
  backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
};

export default function Config({ clinicaId, clinica, clinicaRol, refrescarClinica }) {
  const [tab, setTab] = useState('generales');

  return (
    <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', gap: 1, marginBottom: 20, borderBottom: `1px solid ${BD}` }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? P : MU, borderBottom: tab === t.id ? `2px solid ${P}` : '2px solid transparent', marginBottom: -1, transition: 'all .15s' }}>
            {t.lbl}
          </div>
        ))}
      </div>

      {tab === 'generales' && <Generales clinicaId={clinicaId} clinica={clinica} refrescarClinica={refrescarClinica} />}
      {tab === 'perfil' && <MiPerfil clinicaId={clinicaId} />}
      {tab === 'integraciones' && <Integraciones clinicaId={clinicaId} />}
      {tab === 'seguridad' && <Seguridad clinicaId={clinicaId} rol={clinicaRol} />}
    </div>
  );
}

// ── GENERALES ────────────────────────────────────────────────────────────────
// Datos del consultorio (nombre + logo): funcional, se guarda en la tabla
// `clinicas` y alimenta la marca del sidebar. El resto (horario, agente IA,
// notificaciones) sigue como maqueta — fuera de alcance de esta fase.
function Generales({ clinicaId, clinica, refrescarClinica }) {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [cop, setCop] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  useEffect(() => {
    let vivo = true;
    const sincronizar = async () => {
      if (!clinica) return;
      setNombre(clinica.nombre || '');
      setDireccion(clinica.direccion || '');
      setTelefono(clinica.telefono || '');
      setEmail(clinica.email || '');
      setCop(clinica.cop || '');
      // Bucket privado: hay que firmar la ruta guardada para poder mostrarla.
      const firmada = clinica.logo_url ? await firmar(clinica.logo_url) : null;
      if (vivo) setLogoUrl(firmada);
    };
    sincronizar();
    return () => { vivo = false; };
  }, [clinica]);

  const guardar = async () => {
    if (!clinicaId) return;
    setGuardando(true);
    const { error } = await supabase.from('clinicas')
      .update({ nombre, direccion, telefono, email, cop })
      .eq('id', clinicaId);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    alert('Datos del consultorio actualizados.');
    refrescarClinica?.();
  };

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

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${MT}` }}>Datos del consultorio</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, background: MT, border: `1px solid ${BD}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo del consultorio" onError={() => setLogoUrl(null)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Icon name="document" size={20} color={MU} />
              )}
            </div>
            <div>
              <div style={{ fontSize: 9.5, color: MU, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .3, marginBottom: 3 }}>Logo del consultorio</div>
              <label htmlFor="logo-upload" style={{ fontSize: 11, color: P, fontWeight: 700, cursor: 'pointer' }}>
                {subiendoLogo ? 'Subiendo...' : (logoUrl ? 'Cambiar logo' : '+ Subir logo')}
              </label>
              <input type="file" id="logo-upload" accept="image/*" style={{ display: 'none' }} onChange={subirLogo} />
            </div>
          </div>

          {[
            ['Nombre', nombre, setNombre],
            ['Dirección', direccion, setDireccion],
            ['Teléfono', telefono, setTelefono],
            ['Email', email, setEmail],
            ['COP', cop, setCop],
          ].map(([label, value, setValue]) => (
            <div key={label} style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 9.5, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
              <input value={value} onChange={e => setValue(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}

          <Button onClick={guardar} disabled={guardando} style={{ marginTop: 6, padding: '9px 24px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="save" size={13} /> {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>

        <HorarioCard clinicaId={clinicaId} clinica={clinica} refrescarClinica={refrescarClinica} />

        {[
          { title: 'WhatsApp IA — Agente Nanda', fields: [['Número WA', '+51 915 054 145'], ['Nombre del agente', 'Nanda'], ['Recordatorio (horas antes)', '24h y 1h'], ['Auto-respuesta', 'Activada']] },
          { title: 'Notificaciones', fields: [['Nuevas citas', 'Email + WhatsApp'], ['Pagos recibidos', 'Email'], ['Laboratorio listo', 'WhatsApp'], ['Ausencias', 'WhatsApp']] },
        ].map((sec, si) => (
          <div key={si} style={cardStyle}>
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

  const timeInputStyle = { flex: 1, padding: '6px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${MT}` }}>Horario de atención</div>

      <label style={{ fontSize: 9.5, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Lunes a viernes</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="time" value={lvInicio} onChange={e => setLvInicio(e.target.value)} style={timeInputStyle} />
        <input type="time" value={lvFin} onChange={e => setLvFin(e.target.value)} style={timeInputStyle} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <label style={{ fontSize: 9.5, color: MU, fontWeight: 600 }}>Sábado</label>
        <label style={{ fontSize: 10, color: MU, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={!sabCerrado} onChange={e => setSabCerrado(!e.target.checked)} style={{ accentColor: P, cursor: 'pointer' }} /> Abierto
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, opacity: sabCerrado ? .5 : 1 }}>
        <input type="time" disabled={sabCerrado} value={sabInicio} onChange={e => setSabInicio(e.target.value)} style={timeInputStyle} />
        <input type="time" disabled={sabCerrado} value={sabFin} onChange={e => setSabFin(e.target.value)} style={timeInputStyle} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 9.5, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Domingo</label>
        <div style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 10.5, color: MU, background: MT }}>Cerrado — la Agenda no muestra domingos</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 9.5, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Duración de cita por defecto</label>
        <select value={duracionCita} onChange={e => setDuracionCita(e.target.value)}
          style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
          {[15, 20, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m} minutos</option>)}
        </select>
      </div>

      <Button onClick={guardar} disabled={guardando} style={{ padding: '9px 24px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Icon name="save" size={13} /> {guardando ? 'Guardando...' : 'Guardar'}
      </Button>
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

  if (loading) return <div style={{ padding: 20, color: MU, fontSize: 12 }}>Cargando perfil…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 16 }}>Datos personales</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: MT, border: `1px solid ${BD}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" onError={() => setAvatarUrl(null)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Icon name="users" size={24} color={MU} />
            )}
          </div>
          <div>
            <label htmlFor="avatar-upload" style={{ fontSize: 11, color: P, fontWeight: 700, cursor: 'pointer' }}>
              {subiendoAvatar ? 'Subiendo...' : 'Cambiar foto'}
            </label>
            <input type="file" id="avatar-upload" accept="image/*" style={{ display: 'none' }} onChange={subirAvatar} />
          </div>
        </div>

        <label style={{ fontSize: 9.5, color: MU, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .3 }}>Nombre completo</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Dra. Sol Vargas"
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, marginBottom: 12, boxSizing: 'border-box', color: DN }} />

        <label style={{ fontSize: 9.5, color: MU, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .3 }}>Teléfono</label>
        <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+51 915 054 145"
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, marginBottom: 12, boxSizing: 'border-box', color: DN }} />

        <label style={{ fontSize: 9.5, color: MU, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .3 }}>Email</label>
        <input value={email} disabled
          style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, background: MT, color: MU, boxSizing: 'border-box' }} />

        <Button onClick={guardar} disabled={saving} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="save" size={12} /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 6 }}>Firma y sello digital</div>
        <p style={{ fontSize: 11, color: MU, margin: '0 0 14px' }}>Se usa al imprimir recetas y presupuestos en el Historial.</p>
        {firmaUrl ? (
          <img src={firmaUrl} alt="Firma y sello" onError={() => setFirmaUrl(null)} style={{ maxHeight: 70, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 12 }} />
        ) : (
          <div style={{ height: 70, border: `1px dashed ${BD}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MU, fontSize: 11, marginBottom: 12 }}>
            Sin firma configurada
          </div>
        )}
        <label htmlFor="firma-upload" style={{ fontSize: 11, color: P, fontWeight: 700, cursor: 'pointer' }}>
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
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="clock" size={19} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Google Calendar</div>
            <div style={{ fontSize: 10.5, color: google.connected ? WA : MU, fontWeight: 600 }}>
              {google.connected ? 'Conectado' : 'No conectado'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: MU, margin: '0 0 16px', lineHeight: 1.5 }}>
          Sincroniza las citas de tu Agenda con tu calendario de Google: al crear, editar o eliminar una cita se refleja automáticamente.
        </p>
        {google.connected ? (
          <Button variant="danger" onClick={google.disconnect} style={{ fontSize: 11 }}>Desconectar</Button>
        ) : (
          <Button onClick={() => google.connect()} style={{ fontSize: 11 }}>Conectar con Google</Button>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="chat" size={19} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>WhatsApp Business</div>
            <div style={{ fontSize: 10.5, color: wa.connected ? WA : MU, fontWeight: 600 }}>
              {wa.loading ? 'Verificando…' : wa.connected ? 'Conectado' : 'No conectado'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: MU, margin: '0 0 12px', lineHeight: 1.5 }}>
          Conecta tu número de WhatsApp Business (Meta) para automatizar mensajes con pacientes.
        </p>

        {wa.errorMsg && (
          <div style={{ padding: '8px 10px', background: '#fef2f2', borderLeft: `3px solid ${RJ}`, borderRadius: 6, color: '#b91c1c', fontSize: 11, marginBottom: 12 }}>
            {wa.errorMsg}
          </div>
        )}

        {wa.connected ? (
          <>
            {wa.connection?.businesses?.length > 0 && (
              <div style={{ fontSize: 11, color: DN, marginBottom: 10 }}>
                {wa.connection.businesses.map(b => b.name).join(', ')}
              </div>
            )}
            <Button variant="danger" onClick={wa.disconnect} style={{ fontSize: 11 }}>Desconectar</Button>
          </>
        ) : (
          <Button onClick={wa.connect} disabled={wa.connecting} style={{ fontSize: 11 }}>
            {wa.connecting ? 'Conectando…' : 'Conectar con Meta'}
          </Button>
        )}
      </div>
    </div>
  );
}
