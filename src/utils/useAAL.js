// src/utils/useAAL.js
// Nivel de aseguramiento (AAL) de la sesión actual — Fase 2 del plan de MFA.
// currentLevel 'aal1' con nextLevel 'aal2' significa: el usuario tiene un
// factor MFA verificado pero todavía no lo usó en esta sesión (por ejemplo,
// acaba de loguearse con solo su contraseña) — hay que interceptarlo con el
// challenge antes de dejarlo entrar a la app.
//
// Se re-calcula cada vez que cambia el access_token de la sesión: eso incluye
// el login inicial y el momento en que MFAChallenge verifica el código con
// éxito (mfa.verify()/challengeAndVerify() eleva la sesión sola a aal2 y
// dispara onAuthStateChange, que actualiza `session` en App.jsx).
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function useAAL(session) {
  // token + resultado van juntos a propósito: `loading` se deriva comparando
  // el token del último resultado calculado contra el de la sesión actual, en
  // vez de con un booleano de estado aparte. Con un booleano separado, justo
  // después de un login (o de un verify exitoso) hay un render donde `session`
  // ya tiene el token nuevo pero `loading` todavía no se puso en true —porque
  // el efecto que lo haría corre recién DESPUÉS de ese render— y ese único
  // frame dejaría pasar el árbol completo de la app antes del challenge. La
  // RLS de aal2 igual lo bloquearía a nivel de base de datos, pero no hay que
  // depender de eso para una condición de carrera evitable en la UI.
  const [resultado, setResultado] = useState({ token: undefined, currentLevel: null, nextLevel: null });

  useEffect(() => {
    let vivo = true;
    const token = session?.access_token;
    const resolver = async () => {
      if (!token) { setResultado({ token, currentLevel: null, nextLevel: null }); return; }
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!vivo) return;
      if (!error && data) setResultado({ token, currentLevel: data.currentLevel, nextLevel: data.nextLevel });
    };
    resolver();
    return () => { vivo = false; };
  }, [session?.access_token]);

  const loading = resultado.token !== session?.access_token;
  return { currentLevel: resultado.currentLevel, nextLevel: resultado.nextLevel, loading };
}
