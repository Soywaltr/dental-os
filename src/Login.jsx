import React, { useState } from 'react';
import { supabase } from './supabase';
import Button from './components/ui/Button';
import Icon from './components/ui/Icon';
import { BACKDROP_IMAGE_URL } from './utils/backdrop';
import useResponsive from './utils/useResponsive';
import {
  P, DN, MU, BD, MT, RJ,
  GRAD_PRIMARY, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW,
} from './utils/constants';

const FEATURES = [
  { icon: 'document', text: 'Historia clínica y odontograma digital' },
  { icon: 'clock', text: 'Agenda con recordatorios automáticos' },
  { icon: 'trendingUp', text: 'Finanzas y analítica del consultorio en tiempo real' },
  { icon: 'chat', text: 'Comunicación con pacientes desde un solo lugar' },
];

export default function Login({ onLogin }) {
  const { isTablet } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = reqLength && reqUpper && reqNumber && reqSpecial;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!isEmailValid) {
      setErrorMsg('Por favor, ingresa un correo electrónico válido.');
      setLoading(false);
      return;
    }

    if (isRegistering) {
      if (!isPasswordValid) {
        setErrorMsg('La contraseña no cumple con los requisitos de seguridad.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setErrorMsg(error.message);
      } else {
        alert('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
        setIsRegistering(false);
        setPassword('');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMsg('Correo o contraseña incorrectos.');
      } else if (data.session) {
        onLogin(data.session);
      }
    }
    setLoading(false);
  };

  const inputStyle = (focused) => ({
    width: '100%', padding: '13px 14px', border: `1.5px solid ${focused ? P : BD}`,
    borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s', backgroundColor: '#fff', color: DN,
    boxShadow: focused ? `0 0 0 3px ${P}22` : 'none',
  });

  const labelStyle = {
    display: 'block', fontSize: 11.5, color: MU, fontWeight: 700,
    marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5,
  };

  const logoMark = (size) => (
    <div style={{ width: size, height: size, borderRadius: size * 0.26, background: GRAD_PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 8px 20px rgba(39,39,42,0.25)' }}>
      <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Fondo decorativo compartido con el resto de la app */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: BACKDROP_IMAGE_URL, backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(50px)', transform: 'scale(1.15)',
      }} />

      {/* PANEL IZQUIERDO — marca y propuesta de valor (oculto en tablet/iPad) */}
      {!isTablet && (
        <div style={{ position: 'relative', zIndex: 1, flex: '1 1 50%', display: 'flex', flexDirection: 'column', padding: '56px 72px', maxWidth: 640, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoMark(42)}
            <span style={{ fontSize: 19, fontWeight: 800, color: DN, letterSpacing: '-0.4px' }}>DentalOS</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontSize: 54, fontWeight: 800, color: DN, margin: '0 0 20px', letterSpacing: '-1.5px', lineHeight: 1.08 }}>
              Toda tu<br />clínica, en un<br />solo lugar.
            </h1>
            <p style={{ fontSize: 16, color: MU, margin: '0 0 40px', lineHeight: 1.6, maxWidth: 440 }}>
              Historias clínicas, agenda, finanzas y comunicación con pacientes,
              todo conectado en una sola plataforma diseñada para consultorios dentales.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {FEATURES.map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.6)', border: GLASS_BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P, flexShrink: 0 }}>
                    <Icon name={f.icon} size={16} />
                  </div>
                  <span style={{ fontSize: 14.5, color: DN, fontWeight: 500 }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 12.5, color: MU, fontWeight: 500 }}>
            Consultorio Dra. Sol Vargas · Trujillo, Perú
          </p>
        </div>
      )}

      {/* PANEL DERECHO — formulario, en su propio panel de cristal a todo lo alto */}
      <div style={{
        position: 'relative', zIndex: 1, flex: isTablet ? '1 1 100%' : '0 0 520px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '56px 40px', boxSizing: 'border-box',
        background: isTablet ? 'transparent' : GLASS_BG,
        backdropFilter: isTablet ? 'none' : GLASS_BLUR, WebkitBackdropFilter: isTablet ? 'none' : GLASS_BLUR,
        borderLeft: isTablet ? 'none' : GLASS_BORDER,
      }}>
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {isTablet && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
            {logoMark(36)}
            <span style={{ fontSize: 17, fontWeight: 800, color: DN, letterSpacing: '-0.3px' }}>DentalOS</span>
          </div>
        )}

        <div style={{
          width: '100%', maxWidth: 380, padding: isTablet ? '36px 32px' : 0, borderRadius: 20,
          background: isTablet ? GLASS_BG : 'transparent',
          backdropFilter: isTablet ? GLASS_BLUR : 'none', WebkitBackdropFilter: isTablet ? GLASS_BLUR : 'none',
          border: isTablet ? GLASS_BORDER : 'none', boxShadow: isTablet ? GLASS_SHADOW : 'none',
          boxSizing: 'border-box',
        }}>
          <div style={{ marginBottom: 30 }}>
            <h2 style={{ margin: '0 0 6px', color: DN, fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>
              {isRegistering ? 'Crear cuenta' : 'Bienvenida de nuevo'}
            </h2>
            <p style={{ margin: 0, color: MU, fontSize: 13.5 }}>
              {isRegistering ? 'Completa tus datos para solicitar acceso.' : 'Ingresa tus credenciales para continuar.'}
            </p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Correo electrónico</label>
              <input
                type="email"
                placeholder="doctora@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
                required
                style={inputStyle(focusEmail)}
              />
            </div>

            <div>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusPass(true)}
                  onBlur={() => setFocusPass(false)}
                  required
                  style={{ ...inputStyle(focusPass), paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: showPassword ? P : '#94a3b8', transition: 'color 0.15s' }}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div style={{ background: MT, padding: 14, borderRadius: 10, border: `1px solid ${BD}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <p style={{ margin: '0 0 2px', fontSize: 11.5, fontWeight: 700, color: MU }}>Requisitos de contraseña:</p>
                {[
                  [reqLength, 'Mínimo 8 caracteres'],
                  [reqUpper, 'Al menos una letra mayúscula'],
                  [reqNumber, 'Al menos un número'],
                  [reqSpecial, 'Al menos un carácter especial (!@#$...)'],
                ].map(([met, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: met ? P : MU, transition: 'color 0.2s' }}>
                    {met ? <Icon name="checkCircle" size={13} /> : <span style={{ width: 13, height: 13, borderRadius: '50%', border: `1.5px solid ${MU}`, display: 'inline-block', flexShrink: 0 }} />}
                    {label}
                  </div>
                ))}
              </div>
            )}

            {errorMsg && (
              <div style={{ padding: '10px 14px', background: '#fef2f2', borderLeft: `3px solid ${RJ}`, borderRadius: 6, color: '#b91c1c', fontSize: 12.5, fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (isRegistering && !isPasswordValid)}
              style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 10, marginTop: 4 }}
            >
              {loading ? 'Procesando...' : (isRegistering ? 'Crear cuenta segura' : 'Ingresar al sistema')}
            </Button>
          </form>

          {/* ENLACE PARA CAMBIAR ENTRE LOGIN Y REGISTRO (OCULTO TEMPORALMENTE) */}
          {/* Para volver a habilitarlo en el futuro, simplemente borra los símbolos {/* y */}
          {/* <div style={{ marginTop: 22, textAlign: 'center', borderTop: `1px solid ${BD}`, paddingTop: 18 }}>
            <p style={{ margin: 0, fontSize: 13, color: MU }}>
              {isRegistering ? '¿Ya tienes una cuenta?' : '¿Personal nuevo?'}
              <button
                type="button"
                onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); setPassword(''); setShowPassword(false); }}
                style={{ background: 'none', border: 'none', color: P, cursor: 'pointer', fontWeight: 700, marginLeft: 5, fontSize: 13, padding: 0 }}
              >
                {isRegistering ? 'Inicia sesión aquí' : 'Solicitar acceso'}
              </button>
            </p>
          </div>
          */}
        </div>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: MU, textAlign: 'center', maxWidth: 340 }}>
          Tus datos están cifrados y respaldados en la nube.
        </p>
      </div>
    </div>
  );
}
