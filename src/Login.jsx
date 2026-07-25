import React, { useState } from 'react';
import { supabase } from './supabase';
import Button from './components/ui/Button';
import Icon from './components/ui/Icon';
import { BACKDROP_IMAGE_URL } from './utils/backdrop';
import useResponsive from './utils/useResponsive';
import {
  P, DN, MU, RJ,
  GRAD_PRIMARY, GLASS_BLUR, GLASS_BORDER,
} from './utils/constants';

const FEATURES = [
  { icon: 'document', text: 'Historia clínica y odontograma digital' },
  { icon: 'clock', text: 'Agenda con recordatorios automáticos' },
  { icon: 'trendingUp', text: 'Finanzas y analítica en tiempo real' },
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

  // Campo "flotante": una sola cápsula de cristal con el label arriba y el
  // input transparente adentro, sin tarjeta contenedora ni fondo sólido.
  const glassField = (focused) => ({
    background: 'rgba(255,255,255,0.4)', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR,
    border: `1.5px solid ${focused ? P : 'rgba(255,255,255,0.7)'}`, borderRadius: 14,
    padding: '10px 16px', boxShadow: focused ? `0 0 0 3px ${P}22` : '0 4px 16px rgba(30,35,33,0.06)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });
  const fieldLabelStyle = {
    display: 'block', fontSize: 10.5, color: MU, fontWeight: 700,
    marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5,
  };
  const bareInputStyle = {
    width: '100%', border: 'none', background: 'transparent', outline: 'none',
    fontSize: 15, color: DN, padding: 0, fontFamily: 'inherit',
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
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Fondo decorativo compartido con el resto de la app — un solo lienzo, sin panel dividido */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: BACKDROP_IMAGE_URL, backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(50px)', transform: 'scale(1.15)',
      }} />

      <div style={{
        position: 'relative', zIndex: 1, minHeight: '100vh', boxSizing: 'border-box',
        display: 'flex', flexDirection: isTablet ? 'column' : 'row',
        alignItems: isTablet ? 'center' : 'stretch', justifyContent: isTablet ? 'center' : 'space-between',
        padding: isTablet ? '48px 24px' : '64px 72px', gap: isTablet ? 44 : 24,
      }}>
        {/* IZQUIERDA — marca y propuesta de valor, flotando directo sobre el fondo */}
        <div style={{ flex: isTablet ? 'none' : '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', maxWidth: isTablet ? 480 : 560 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logoMark(40)}
            <span style={{ fontSize: 18, fontWeight: 800, color: DN, letterSpacing: '-0.4px' }}>DentalOS</span>
          </div>

          {!isTablet && (
            <div>
              <h1 style={{ fontSize: 52, fontWeight: 800, color: DN, margin: '0 0 18px', letterSpacing: '-1.5px', lineHeight: 1.08 }}>
                Bienvenida<br />de nuevo.
              </h1>
              <p style={{ fontSize: 15.5, color: MU, margin: '0 0 30px', lineHeight: 1.6, maxWidth: 400 }}>
                Historias clínicas, agenda, finanzas y comunicación con pacientes,
                todo en un solo lugar diseñado para tu consultorio.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {FEATURES.map(f => (
                  <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name={f.icon} size={15} color={P} />
                    <span style={{ fontSize: 13.5, color: DN, fontWeight: 500 }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isTablet && (
            <p style={{ margin: 0, fontSize: 12, color: MU }}>Consultorio Dra. Sol Vargas · Trujillo, Perú</p>
          )}
        </div>

        {/* DERECHA — campos flotantes de cristal, sin tarjeta contenedora */}
        <div style={{ flex: isTablet ? 'none' : '0 0 400px', width: isTablet ? '100%' : undefined, maxWidth: isTablet ? 380 : undefined, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
          {isTablet && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 4 }}>
              {logoMark(34)}
              <span style={{ fontSize: 16, fontWeight: 800, color: DN, letterSpacing: '-0.3px' }}>DentalOS</span>
            </div>
          )}

          <div style={{ textAlign: isTablet ? 'center' : 'left' }}>
            <h2 style={{ margin: '0 0 4px', color: DN, fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
              {isRegistering ? 'Crear cuenta' : 'Ingresa a tu cuenta'}
            </h2>
            <p style={{ margin: 0, color: MU, fontSize: 13 }}>
              {isRegistering ? 'Completa tus datos para solicitar acceso.' : 'Ingresa tus credenciales para continuar.'}
            </p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={glassField(focusEmail)}>
              <label style={fieldLabelStyle}>Correo electrónico</label>
              <input
                type="email"
                placeholder="doctora@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
                required
                style={bareInputStyle}
              />
            </div>

            <div style={glassField(focusPass)}>
              <label style={fieldLabelStyle}>Contraseña</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusPass(true)}
                  onBlur={() => setFocusPass(false)}
                  required
                  style={bareInputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: showPassword ? P : '#94a3b8', flexShrink: 0, transition: 'color 0.15s' }}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, padding: 14, borderRadius: 14, border: GLASS_BORDER, display: 'flex', flexDirection: 'column', gap: 7 }}>
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
              <div style={{ padding: '10px 14px', background: 'rgba(254,242,242,0.85)', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderLeft: `3px solid ${RJ}`, borderRadius: 10, color: '#b91c1c', fontSize: 12.5, fontWeight: 500 }}>
                {errorMsg}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (isRegistering && !isPasswordValid)}
              style={{ width: '100%', padding: '13px', fontSize: 14, borderRadius: 14, marginTop: 4 }}
            >
              {loading ? 'Procesando...' : (isRegistering ? 'Crear cuenta segura' : 'Ingresar al sistema')}
            </Button>
          </form>

          <p style={{ margin: 0, fontSize: 11.5, color: MU, textAlign: isTablet ? 'center' : 'left' }}>
            Tus datos están cifrados y respaldados en la nube.
          </p>

          {/* ENLACE PARA CAMBIAR ENTRE LOGIN Y REGISTRO (OCULTO TEMPORALMENTE) */}
          {/* Para volver a habilitarlo en el futuro, simplemente borra los símbolos {/* y */}
          {/* <div style={{ textAlign: 'center', marginTop: 6 }}>
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
    </div>
  );
}
