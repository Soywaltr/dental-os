// src/components/vistas/Seguridad.jsx
// Pestaña de Ajustes para gestionar la verificación en dos pasos (MFA/TOTP)
// del usuario logueado. Fase 1 del plan de MFA: solo enrolamiento — todavía no
// se exige en el login (eso es la Fase 2, App.jsx) ni en el RLS (Fase 3).
//
// No hay códigos de respaldo (Supabase no los ofrece: "Supabase does not
// return recovery codes"). La recuperación se apoya en:
//  1. Enrolar un SEGUNDO dispositivo — esta pantalla lo promueve activamente.
//  2. Reset por un admin de la misma clínica (pestaña aparte, cuando exista).
//  3. Break-glass: el dueño del proyecto puede borrar el factor desde
//     Authentication → Users en el dashboard de Supabase.
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import Button from '../ui/Button';
import { BD, DN, MU, MT, P, RJ, WA, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

const cardStyle = {
  background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', padding: 20,
  backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
};

const EASE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

const tituloCardStyle = { fontSize: 15, fontWeight: 600, color: DN };

const parrafoStyle = { fontSize: 13, color: MU, lineHeight: 1.5 };

const avisoErrorStyle = {
  padding: '10px 12px', background: '#FEE2E2', borderLeft: `3px solid ${RJ}`,
  borderRadius: '10px', color: RJ, fontSize: 13, lineHeight: 1.5,
};

// Fila de dispositivo/persona: alto de toque cómodo y separador de 1px.
const filaStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12, padding: '10px 0', minHeight: 52, borderBottom: `1px solid ${BD}`,
};

const filaBtnStyle = { fontSize: 12, fontWeight: 600, padding: '9px 14px', minHeight: 36, borderRadius: '10px' };

const accionBtnStyle = { fontSize: 13.5, fontWeight: 600, padding: '12px 20px', minHeight: 44, borderRadius: '10px' };

const IcShield = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v6c0 5.2 3.4 9.7 8 11 4.6-1.3 8-5.8 8-11V5l-8-3z" />
  </svg>
);

export default function Seguridad({ rol }) {
  const [factores, setFactores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [enrolamiento, setEnrolamiento] = useState(null); // { id, qr_code, secret }
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const [quitando, setQuitando] = useState(null); // id del factor en proceso de borrado

  const cargarFactores = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (!err) setFactores(data?.all || []);
    setLoading(false);
  }, []);

  useEffect(() => { cargarFactores(); }, [cargarFactores]);

  const verificados = factores.filter(f => f.status === 'verified');

  const iniciarEnrolamiento = async () => {
    setError('');
    setInscribiendo(true);
    const numero = factores.length + 1;
    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Dispositivo ${numero}`,
    });
    setInscribiendo(false);
    if (err) { setError(err.message); return; }
    setEnrolamiento({ id: data.id, qr_code: data.totp.qr_code, secret: data.totp.secret });
  };

  const cancelarEnrolamiento = async () => {
    // El factor queda "unverified" hasta que se confirme con el código; si el
    // usuario cancela a mitad de camino, se desenrola para no dejar basura.
    if (enrolamiento) await supabase.auth.mfa.unenroll({ factorId: enrolamiento.id });
    setEnrolamiento(null);
    setCodigo('');
    setError('');
  };

  const confirmarEnrolamiento = async (e) => {
    e.preventDefault();
    setError('');
    setVerificando(true);
    try {
      const { data: challengeData, error: errChallenge } = await supabase.auth.mfa.challenge({ factorId: enrolamiento.id });
      if (errChallenge) throw errChallenge;
      const { error: errVerify } = await supabase.auth.mfa.verify({
        factorId: enrolamiento.id, challengeId: challengeData.id, code: codigo,
      });
      if (errVerify) throw errVerify;
      setEnrolamiento(null);
      setCodigo('');
      await cargarFactores();
    } catch (err) {
      setError(err.message || 'Código incorrecto. Intenta de nuevo.');
    } finally {
      setVerificando(false);
    }
  };

  const quitarFactor = async (factorId, nombre) => {
    if (!window.confirm(`¿Quitar "${nombre}"? Ya no podrás usarlo para iniciar sesión.`)) return;
    setQuitando(factorId);
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId });
    setQuitando(null);
    if (err) { alert('Error al quitar el dispositivo: ' + err.message); return; }
    await cargarFactores();
  };

  if (loading) return <div style={{ padding: 20, color: MU, fontSize: 13.5 }}>Cargando…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: verificados.length > 0 ? '#DCFCE7' : '#FEF3C7', color: verificados.length > 0 ? WA : '#E8A63D', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IcShield />
          </div>
          <div>
            <div style={tituloCardStyle}>Verificación en dos pasos</div>
            <div style={{ fontSize: 12, color: verificados.length > 0 ? WA : MU, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {verificados.length > 0 ? `${verificados.length} dispositivo${verificados.length > 1 ? 's' : ''} activo${verificados.length > 1 ? 's' : ''}` : 'No configurada'}
            </div>
          </div>
        </div>
        <p style={{ ...parrafoStyle, margin: '0 0 14px' }}>
          Además de tu contraseña, pide un código de una app como Google Authenticator o Authy al iniciar sesión.
        </p>

        {verificados.length === 1 && (
          <div style={{ padding: '10px 12px', background: '#FEF3C7', borderLeft: '3px solid #E8A63D', borderRadius: '10px', color: DN, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
            Te recomendamos agregar un <b>segundo dispositivo</b>. Supabase no ofrece códigos de respaldo — si pierdes el único dispositivo enrolado, necesitarás que un administrador te restablezca el acceso.
          </div>
        )}

        {!enrolamiento && (
          <>
            {verificados.map(f => (
              <div key={f.id} className="row-hoverable" style={{ ...filaStyle, borderRadius: '10px', paddingLeft: 8, paddingRight: 8 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: DN }}>{f.friendly_name || 'Dispositivo'}</div>
                  <div style={{ fontSize: 12, color: MU, fontVariantNumeric: 'tabular-nums' }}>Agregado el {new Date(f.created_at).toLocaleDateString('es-PE')}</div>
                </div>
                <Button variant="danger" onClick={() => quitarFactor(f.id, f.friendly_name || 'este dispositivo')} disabled={quitando === f.id} style={filaBtnStyle}>
                  {quitando === f.id ? 'Quitando…' : 'Quitar'}
                </Button>
              </div>
            ))}

            {error && (
              <div style={{ ...avisoErrorStyle, margin: '12px 0' }}>
                {error}
              </div>
            )}

            <Button onClick={iniciarEnrolamiento} disabled={inscribiendo} style={{ ...accionBtnStyle, marginTop: 14 }}>
              {inscribiendo ? 'Generando código QR…' : (verificados.length > 0 ? '+ Agregar otro dispositivo' : 'Activar verificación en dos pasos')}
            </Button>
          </>
        )}

        {enrolamiento && (
          <form onSubmit={confirmarEnrolamiento}>
            <p style={{ ...parrafoStyle, margin: '0 0 10px' }}>
              Escanea este código con tu app de autenticación:
            </p>
            {/* El fondo del QR se queda blanco literal: es la zona de silencio que
                necesita el lector para escanearlo, no una superficie del tema. */}
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: '14px', padding: 14, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <img src={enrolamiento.qr_code} alt="Código QR" style={{ width: 160, height: 160 }} />
            </div>
            <details style={{ marginBottom: 12 }}>
              <summary style={{ fontSize: 13, color: P, cursor: 'pointer', fontWeight: 600, minHeight: 36, display: 'flex', alignItems: 'center', transition: `color .18s ${EASE}` }}>¿No puedes escanear? Ingresa el código manualmente</summary>
              <div style={{ fontSize: 13, color: DN, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: .5, lineHeight: 1.5, background: MT, padding: 10, borderRadius: '10px', marginTop: 6, wordBreak: 'break-all' }}>
                {enrolamiento.secret}
              </div>
            </details>

            <label style={{ fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .4 }}>Código de 6 dígitos</label>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
              className="field"
              style={{
                width: '100%', minHeight: 52, padding: '12px 14px', border: `1px solid ${BD}`,
                borderRadius: '10px', background: '#F5F5F5',
                fontSize: 22, fontWeight: 600, letterSpacing: 8, fontVariantNumeric: 'tabular-nums',
                textAlign: 'center', marginBottom: 12, boxSizing: 'border-box', color: DN, outline: 'none',
                transition: `border-color .18s ${EASE}`,
              }}
            />

            {error && (
              <div style={{ ...avisoErrorStyle, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="secondary" onClick={cancelarEnrolamiento} style={{ ...accionBtnStyle, flex: 1 }}>Cancelar</Button>
              <Button type="submit" disabled={verificando || codigo.length !== 6} style={{ ...accionBtnStyle, flex: 1 }}>
                {verificando ? 'Verificando…' : 'Confirmar'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {rol === 'admin' && <GestionMFA />}
    </div>
  );
}

// ── GESTIÓN DE MFA DEL PERSONAL (solo admin) ─────────────────────────────────
// Vía la Edge Function mfa-admin-reset, que en el servidor exige que quien
// llama sea admin de la clínica, esté el mismo en aal2, y que el objetivo
// pertenezca a esa misma clínica. Es la segunda vía de recuperación (la
// primera es enrolar un segundo dispositivo; la tercera, break-glass, es que
// el dueño del proyecto borre el factor desde el dashboard de Supabase).
function GestionMFA() {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reseteando, setReseteando] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase.functions.invoke('mfa-admin-reset', { body: { action: 'list' } });
      const mensajeError = err?.message || data?.error || null;
      if (mensajeError) setError(mensajeError);
      else setMiembros(data?.miembros || []);
      setLoading(false);
    };
    cargar();
  }, [reloadTick]);

  const resetear = async (userId, email) => {
    if (!window.confirm(`¿Restablecer la verificación en dos pasos de ${email || 'este usuario'}? Va a perder el acceso con su dispositivo actual y tendrá que enrolar uno nuevo.`)) return;
    setReseteando(userId);
    const { data, error: err } = await supabase.functions.invoke('mfa-admin-reset', { body: { action: 'reset', targetUserId: userId } });
    setReseteando(null);
    if (err) { alert('Error: ' + err.message); return; }
    if (data?.error) { alert('Error: ' + data.error); return; }
    setReloadTick(t => t + 1);
  };

  if (loading) return <div style={{ ...cardStyle, color: MU, fontSize: 13.5 }}>Cargando personal…</div>;

  return (
    <div style={cardStyle}>
      <div style={{ ...tituloCardStyle, marginBottom: 6 }}>Verificación en dos pasos del personal</div>
      <p style={{ ...parrafoStyle, margin: '0 0 14px' }}>
        Si alguien de tu clínica pierde su dispositivo, restablécelo aquí para que pueda enrolar uno nuevo.
      </p>

      {error && (
        <div style={{ ...avisoErrorStyle, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {miembros.map(m => {
        const verificados = m.factores.filter(f => f.status === 'verified');
        return (
          <div key={m.userId} className="row-hoverable" style={{ ...filaStyle, borderRadius: '10px', paddingLeft: 8, paddingRight: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: DN }}>
                {m.email || m.userId}{m.esUnoMismo ? ' (tú)' : ''}
              </div>
              <div style={{ fontSize: 12, color: MU, textTransform: 'capitalize', fontVariantNumeric: 'tabular-nums' }}>
                {m.rol} · {verificados.length > 0 ? `${verificados.length} dispositivo${verificados.length > 1 ? 's' : ''} verificado${verificados.length > 1 ? 's' : ''}` : 'sin MFA configurado'}
              </div>
            </div>
            {!m.esUnoMismo && verificados.length > 0 && (
              <Button variant="danger" onClick={() => resetear(m.userId, m.email)} disabled={reseteando === m.userId} style={filaBtnStyle}>
                {reseteando === m.userId ? 'Restableciendo…' : 'Restablecer'}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
