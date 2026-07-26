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
  background: GLASS_BG, border: GLASS_BORDER, borderRadius: 12, padding: 20,
  backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
};

const IcShield = ({ size = 19, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v6c0 5.2 3.4 9.7 8 11 4.6-1.3 8-5.8 8-11V5l-8-3z" />
  </svg>
);

export default function Seguridad() {
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

  if (loading) return <div style={{ padding: 20, color: MU, fontSize: 12 }}>Cargando…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: verificados.length > 0 ? '#dcfce7' : '#fef3c7', color: verificados.length > 0 ? '#16a34a' : '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IcShield />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Verificación en dos pasos</div>
            <div style={{ fontSize: 10.5, color: verificados.length > 0 ? WA : MU, fontWeight: 600 }}>
              {verificados.length > 0 ? `${verificados.length} dispositivo${verificados.length > 1 ? 's' : ''} activo${verificados.length > 1 ? 's' : ''}` : 'No configurada'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: MU, margin: '0 0 14px', lineHeight: 1.5 }}>
          Además de tu contraseña, pide un código de una app como Google Authenticator o Authy al iniciar sesión.
        </p>

        {verificados.length === 1 && (
          <div style={{ padding: '8px 10px', background: '#fffbeb', borderLeft: `3px solid #f59e0b`, borderRadius: 6, color: '#92400e', fontSize: 11, marginBottom: 14, lineHeight: 1.5 }}>
            Te recomendamos agregar un <b>segundo dispositivo</b>. Supabase no ofrece códigos de respaldo — si pierdes el único dispositivo enrolado, necesitarás que un administrador te restablezca el acceso.
          </div>
        )}

        {!enrolamiento && (
          <>
            {verificados.map(f => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${MT}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: DN }}>{f.friendly_name || 'Dispositivo'}</div>
                  <div style={{ fontSize: 10, color: MU }}>Agregado el {new Date(f.created_at).toLocaleDateString('es-PE')}</div>
                </div>
                <Button variant="danger" onClick={() => quitarFactor(f.id, f.friendly_name || 'este dispositivo')} disabled={quitando === f.id} style={{ fontSize: 10.5, padding: '5px 10px' }}>
                  {quitando === f.id ? 'Quitando…' : 'Quitar'}
                </Button>
              </div>
            ))}

            {error && (
              <div style={{ padding: '8px 10px', background: '#fef2f2', borderLeft: `3px solid ${RJ}`, borderRadius: 6, color: '#b91c1c', fontSize: 11, margin: '12px 0' }}>
                {error}
              </div>
            )}

            <Button onClick={iniciarEnrolamiento} disabled={inscribiendo} style={{ marginTop: 14, fontSize: 11 }}>
              {inscribiendo ? 'Generando código QR…' : (verificados.length > 0 ? '+ Agregar otro dispositivo' : 'Activar verificación en dos pasos')}
            </Button>
          </>
        )}

        {enrolamiento && (
          <form onSubmit={confirmarEnrolamiento}>
            <p style={{ fontSize: 11.5, color: MU, margin: '0 0 10px' }}>
              Escanea este código con tu app de autenticación:
            </p>
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <img src={enrolamiento.qr_code} alt="Código QR" style={{ width: 160, height: 160 }} />
            </div>
            <details style={{ marginBottom: 12 }}>
              <summary style={{ fontSize: 10.5, color: P, cursor: 'pointer', fontWeight: 600 }}>¿No puedes escanear? Ingresa el código manualmente</summary>
              <div style={{ fontSize: 10.5, color: DN, fontFamily: 'monospace', background: MT, padding: 8, borderRadius: 6, marginTop: 6, wordBreak: 'break-all' }}>
                {enrolamiento.secret}
              </div>
            </details>

            <label style={{ fontSize: 9.5, color: MU, fontWeight: 700, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: .3 }}>Código de 6 dígitos</label>
            <input
              value={codigo}
              onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              inputMode="numeric"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${BD}`, borderRadius: 7, fontSize: 16, letterSpacing: 4, textAlign: 'center', marginBottom: 12, boxSizing: 'border-box', color: DN }}
            />

            {error && (
              <div style={{ padding: '8px 10px', background: '#fef2f2', borderLeft: `3px solid ${RJ}`, borderRadius: 6, color: '#b91c1c', fontSize: 11, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="secondary" onClick={cancelarEnrolamiento} style={{ fontSize: 11, flex: 1 }}>Cancelar</Button>
              <Button type="submit" disabled={verificando || codigo.length !== 6} style={{ fontSize: 11, flex: 1 }}>
                {verificando ? 'Verificando…' : 'Confirmar'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
