// src/MFAChallenge.jsx
// Pantalla intermedia entre el login y la app — Fase 2 del plan de MFA.
// App.jsx la muestra cuando useAAL() detecta que la sesión tiene un factor
// verificado pero todavía está en aal1 (o sea, el usuario acaba de loguearse
// solo con su contraseña y falta el segundo paso).
//
// Verificado el código, la sesión se eleva sola a aal2 — no hay nada que
// hacer aquí después de un verify exitoso: onAuthStateChange actualiza la
// sesión en App.jsx, useAAL() lo recalcula, y esta pantalla desaparece sola.
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Button from './components/ui/Button';
import { BACKDROP_IMAGE_URL } from './utils/backdrop';
import {
  P, DN, MU, BD, RJ,
  GRAD_PRIMARY, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW,
} from './utils/constants';

export default function MFAChallenge({ onLogout }) {
  const [factores, setFactores] = useState([]);
  const [factorId, setFactorId] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const { data, error: err } = await supabase.auth.mfa.listFactors();
      if (err) { setError(err.message); setLoading(false); return; }
      const verificados = (data?.totp || []).filter(f => f.status === 'verified');
      setFactores(verificados);
      setFactorId(verificados[0]?.id || null);
      setLoading(false);
    };
    cargar();
  }, []);

  const cambiarDispositivo = (id) => {
    setFactorId(id);
    setCodigo('');
    setError('');
  };

  const verificar = async (e) => {
    e.preventDefault();
    setError('');
    setVerificando(true);
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: codigo });
    setVerificando(false);
    if (err) {
      setError('Código incorrecto o expirado. Vuelve a intentarlo.');
      setCodigo('');
    }
    // Sin else: al verificar bien, la sesión se actualiza sola y App.jsx
    // reacciona — esta pantalla no tiene que hacer nada más.
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: `1.5px solid ${BD}`,
    borderRadius: 10, fontSize: 20, letterSpacing: 6, textAlign: 'center',
    boxSizing: 'border-box', outline: 'none', backgroundColor: 'rgba(255,255,255,0.7)', color: DN,
  };

  const labelStyle = {
    display: 'block', fontSize: 11.5, color: MU, fontWeight: 700,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', fontFamily: "'Urbanist', system-ui, -apple-system, sans-serif", padding: 24, boxSizing: 'border-box' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: BACKDROP_IMAGE_URL, backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(50px)', transform: 'scale(1.15)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
        background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
        border: GLASS_BORDER, boxShadow: GLASS_SHADOW, borderRadius: 22,
        padding: '44px 40px', boxSizing: 'border-box',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: GRAD_PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 20px', boxShadow: '0 10px 24px rgba(39,39,42,0.28)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 4 5v6c0 5.2 3.4 9.7 8 11 4.6-1.3 8-5.8 8-11V5l-8-3z" />
            </svg>
          </div>
          <h1 style={{ margin: '0 0 8px', color: DN, fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
            Verificación en dos pasos
          </h1>
          <p style={{ margin: 0, color: MU, fontSize: 13.5, lineHeight: 1.5 }}>
            Ingresa el código de tu app de autenticación<br />para continuar.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: MU, fontSize: 12.5 }}>Cargando…</p>
        ) : factores.length === 0 ? (
          <div>
            <div style={{ padding: '10px 14px', background: '#fef2f2', borderLeft: `3px solid ${RJ}`, borderRadius: 6, color: '#b91c1c', fontSize: 12.5, marginBottom: 20, lineHeight: 1.5 }}>
              No se encontró un dispositivo de verificación activo. Contacta a un administrador de tu clínica para que restablezca tu acceso.
            </div>
            <Button variant="secondary" onClick={onLogout} style={{ width: '100%', padding: '12px', fontSize: 13.5, borderRadius: 10 }}>
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={verificar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Código de 6 dígitos</label>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                style={inputStyle}
              />
            </div>

            {factores.length > 1 && (
              <div style={{ fontSize: 12, color: MU }}>
                Usar otro dispositivo:{' '}
                {factores.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => cambiarDispositivo(f.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                      fontWeight: f.id === factorId ? 700 : 500, color: f.id === factorId ? P : MU,
                      textDecoration: f.id === factorId ? 'none' : 'underline', fontSize: 12,
                    }}
                  >
                    {f.friendly_name || 'Dispositivo'}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', borderLeft: `3px solid ${RJ}`, borderRadius: 6, color: '#b91c1c', fontSize: 12.5, fontWeight: 500 }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={verificando || codigo.length !== 6}
              style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 10 }}
            >
              {verificando ? 'Verificando…' : 'Continuar'}
            </Button>

            <div style={{ textAlign: 'center', borderTop: `1px solid ${BD}`, paddingTop: 16 }}>
              <button
                type="button"
                onClick={onLogout}
                style={{ background: 'none', border: 'none', color: MU, cursor: 'pointer', fontSize: 12.5, textDecoration: 'underline', padding: 0 }}
              >
                Cerrar sesión
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
