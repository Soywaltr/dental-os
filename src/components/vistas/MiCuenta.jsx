// src/components/vistas/MiCuenta.jsx
// Todo lo que es "perfil y negocio" en un solo lugar, con acceso directo
// desde el menú de la foto en el header (ya no vive detrás del ícono de
// engranaje: eso quedó para Datos del consultorio/Integraciones/Seguridad).
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { BD, DN, MU, MT, P, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import { BUCKET, rutaPerfil, rutaFirma, rutaLogo, firmar, invalidarFirma } from '../../utils/storage';

const TABS = [
  { id: 'perfil', lbl: 'Mi perfil' },
  { id: 'negocio', lbl: 'Negocio' },
];

const cardStyle = {
  background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', padding: 20,
  backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
};

const EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

const tituloCardStyle = { fontSize: 15, fontWeight: 600, color: DN };

const labelStyle = { fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 };

const labelCapsStyle = { ...labelStyle, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6 };

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

const enlaceArchivoStyle = {
  fontSize: 13, color: P, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', minHeight: 36,
  transition: `color .18s ${EASE}`,
};

export default function MiCuenta({ clinicaId, clinica, refrescarClinica }) {
  const [tab, setTab] = useState('perfil');

  return (
    <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
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

      {tab === 'perfil' && (
        <MiPerfil clinicaId={clinicaId} cardStyle={cardStyle} tituloCardStyle={tituloCardStyle}
          labelCapsStyle={labelCapsStyle} inputStyle={inputStyle} guardarBtnStyle={guardarBtnStyle}
          enlaceArchivoStyle={enlaceArchivoStyle} />
      )}
      {tab === 'negocio' && (
        <Negocio clinicaId={clinicaId} clinica={clinica} refrescarClinica={refrescarClinica}
          cardStyle={cardStyle} tituloCardStyle={tituloCardStyle} labelStyle={labelStyle}
          labelCapsStyle={labelCapsStyle} inputStyle={inputStyle} guardarBtnStyle={guardarBtnStyle}
          enlaceArchivoStyle={enlaceArchivoStyle} />
      )}
    </div>
  );
}

// ── MI PERFIL ────────────────────────────────────────────────────────────────
function MiPerfil({ clinicaId, cardStyle, tituloCardStyle, labelCapsStyle, inputStyle, guardarBtnStyle, enlaceArchivoStyle }) {
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
          <div style={{ height: 70, border: `1px dashed ${BD}`, borderRadius: '14px', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9AA1AC', fontSize: 13, marginBottom: 12 }}>
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

// ── NEGOCIO (marca: logo + nombre comercial) ─────────────────────────────────
// El color de acento que vivía acá se quitó: no aplicaba ningún cambio real
// en la app (los colores de los componentes son literales, no variables CSS
// -- ver utils/theme.js), así que era un control que no hacía nada.
function Negocio({ clinicaId, clinica, refrescarClinica, cardStyle, tituloCardStyle, labelStyle, labelCapsStyle, inputStyle, guardarBtnStyle, enlaceArchivoStyle }) {
  const [nombre, setNombre] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  useEffect(() => {
    let vivo = true;
    const sincronizar = async () => {
      if (!clinica) return;
      setNombre(clinica.nombre || '');
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
    const path = rutaLogo(clinicaId, file.name);
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
    setGuardando(true);
    const { error } = await supabase.from('clinicas').update({ nombre }).eq('id', clinicaId);
    setGuardando(false);
    if (error) { alert('Error al guardar: ' + error.message); return; }
    alert('Datos del negocio actualizados.');
    refrescarClinica?.();
  };

  return (
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
        className="field" style={{ ...inputStyle, marginBottom: 16, maxWidth: 420 }} />

      <Button onClick={guardar} disabled={guardando} style={guardarBtnStyle}>
        <Icon name="save" size={15} /> {guardando ? 'Guardando...' : 'Guardar'}
      </Button>
    </div>
  );
}
