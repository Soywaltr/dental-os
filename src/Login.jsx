import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estado para previsualizar contraseña
  const [showPassword, setShowPassword] = useState(false);

  // Estados para simular el efecto "Focus" (Premium) en los inputs
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  // Validaciones en tiempo real para la contraseña
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqNumber = /[0-9]/.test(password);
  const reqSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const isPasswordValid = reqLength && reqUpper && reqNumber && reqSpecial;

  // Validación de formato de correo real
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
      // LÓGICA DE REGISTRO
      if (!isPasswordValid) {
        setErrorMsg('La contraseña no cumple con los requisitos de seguridad.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        alert('✅ ¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
        setIsRegistering(false);
        setPassword(''); // Limpiamos contraseña por seguridad
      }
    } else {
      // LÓGICA DE INICIO DE SESIÓN
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        setErrorMsg('Correo o contraseña incorrectos.');
      } else if (data.session) {
        onLogin(data.session);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: '#ffffff', padding: '45px 40px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.06)', width: '100%', maxWidth: '400px', transition: 'all 0.3s ease' }}>
        
        {/* LOGO Y CABECERA */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #005f73 0%, #0a9396 100%)', color: '#fff', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: 'bold', margin: '0 auto 15px', fontStyle: 'italic', boxShadow: '0 10px 20px rgba(0, 95, 115, 0.2)' }}>
            S
          </div>
          <h2 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '24px', letterSpacing: '-0.5px' }}>DentalOS</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Portal Clínico Seguro</p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* INPUT CORREO */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Correo Electrónico
            </label>
            <input 
              type="email" 
              placeholder="doctora@clinica.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusEmail(true)}
              onBlur={() => setFocusEmail(false)}
              required
              style={{ width: '100%', padding: '14px', border: focusEmail ? '2px solid #0a9396' : '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc', color: '#0f172a' }}
            />
          </div>

          {/* INPUT CONTRASEÑA CON OJO */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#475569', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                required
                style={{ width: '100%', padding: '14px', paddingRight: '45px', border: focusPass ? '2px solid #0a9396' : '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#f8fafc', color: '#0f172a' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: showPassword ? '#0a9396' : '#94a3b8', transition: 'color 0.2s' }}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {/* SVG del Ojo */}
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                )}
              </button>
            </div>
          </div>

          {/* CHECKLIST EN VIVO (Solo se muestra al Crear Usuario) */}
          {isRegistering && (
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Requisitos de contraseña:</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: reqLength ? '#0a9396' : '#64748b', transition: 'color 0.3s' }}>
                <span style={{ fontWeight: 'bold' }}>{reqLength ? '✓' : '○'}</span> Mínimo 8 caracteres
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: reqUpper ? '#0a9396' : '#64748b', transition: 'color 0.3s' }}>
                <span style={{ fontWeight: 'bold' }}>{reqUpper ? '✓' : '○'}</span> Al menos una letra mayúscula
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: reqNumber ? '#0a9396' : '#64748b', transition: 'color 0.3s' }}>
                <span style={{ fontWeight: 'bold' }}>{reqNumber ? '✓' : '○'}</span> Al menos un número
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: reqSpecial ? '#0a9396' : '#64748b', transition: 'color 0.3s' }}>
                <span style={{ fontWeight: 'bold' }}>{reqSpecial ? '✓' : '○'}</span> Al menos un carácter especial (!@#$...)
              </div>
            </div>
          )}

          {/* MENSAJE DE ERROR */}
          {errorMsg && (
            <div style={{ padding: '10px 15px', background: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '4px', color: '#b91c1c', fontSize: '13px', fontWeight: '500' }}>
              {errorMsg}
            </div>
          )}

          {/* BOTÓN PRINCIPAL */}
          <button 
            type="submit" 
            disabled={loading || (isRegistering && !isPasswordValid)}
            style={{ width: '100%', padding: '16px', background: (isRegistering && !isPasswordValid) ? '#94a3b8' : 'linear-gradient(135deg, #005f73 0%, #0a9396 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: (loading || (isRegistering && !isPasswordValid)) ? 'not-allowed' : 'pointer', transition: 'all 0.3s', marginTop: '10px', boxShadow: (isRegistering && !isPasswordValid) ? 'none' : '0 4px 12px rgba(10, 147, 150, 0.3)' }}
          >
            {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta Segura' : 'Ingresar al sistema')}
          </button>
        </form>

        {/* ENLACE PARA CAMBIAR ENTRE LOGIN Y REGISTRO (OCULTO TEMPORALMENTE) */}
        {/* Para volver a habilitarlo en el futuro, simplemente borra los símbolos {/* y */} 
        {/* <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿Personal nuevo?'} 
            <button 
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); setPassword(''); setShowPassword(false); }} 
              style={{ background: 'none', border: 'none', color: '#0a9396', cursor: 'pointer', fontWeight: '700', marginLeft: '5px', fontSize: '14px', padding: 0 }}
            >
              {isRegistering ? 'Inicia sesión aquí' : 'Solicitar acceso'}
            </button>
          </p>
        </div>
        */}

      </div>
    </div>
  );
}