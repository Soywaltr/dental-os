// src/utils/useGoogleCalendar.js
// Estado de conexión de Google Calendar, compartido entre Agenda.jsx (donde se
// usa para crear/editar/borrar eventos) y Ajustes > Integraciones (donde se
// muestra el estado de conexión y se puede desconectar). Guardado en la tabla
// `integraciones_google`, por clínica (clinica_id) — no en localStorage, para
// que la conexión sea de todo el consultorio y no de un solo navegador.
//
// Usa el flujo OAuth "auth-code" (no el "implicit" por defecto): Google entrega
// un refresh_token de larga duración además del access_token de ~1h. El
// intercambio y la renovación pasan por el Edge Function `google-calendar-token`
// (necesita el Client Secret del lado del servidor, nunca en el navegador). Así
// la conexión se renueva sola y no hay que volver a "Conectar con Google" cada hora.
import { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { supabase } from '../supabase';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Margen de seguridad: si al access_token le queda menos de esto para vencer, se renueva antes de usarlo.
const REFRESH_MARGIN_MS = 60_000;

export default function useGoogleCalendar(clinicaId, onConnected) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  // Ref (no state) para que getToken() siempre lea el valor más reciente dentro
  // de una función async, sin quedar atado a un closure de un render viejo.
  const filaRef = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      if (!clinicaId) { filaRef.current = null; setConnected(false); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('integraciones_google')
        .select('access_token, refresh_token, token_expires_at')
        .eq('clinica_id', clinicaId)
        .limit(1);
      if (!error && data && data.length > 0) {
        filaRef.current = data[0];
        setConnected(!!data[0].refresh_token);
      } else {
        filaRef.current = null;
        setConnected(false);
      }
      setLoading(false);
    };
    cargar();
  }, [clinicaId]);

  const disconnect = useCallback(async () => {
    if (!clinicaId) return;
    await supabase.from('integraciones_google').delete().eq('clinica_id', clinicaId);
    filaRef.current = null;
    setConnected(false);
  }, [clinicaId]);

  const connect = useGoogleLogin({
    flow: 'auth-code',
    scope: GOOGLE_CALENDAR_SCOPE,
    onSuccess: async ({ code }) => {
      try {
        const { data, error } = await supabase.functions.invoke('google-calendar-token', {
          body: { action: 'exchange', code },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data.refresh_token) {
          throw new Error('Google no entregó un refresh_token. Revoca el acceso de la app en myaccount.google.com/permissions e inténtalo de nuevo.');
        }

        const token_expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();
        const fila = {
          clinica_id: clinicaId,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await supabase.from('integraciones_google').upsert(fila, { onConflict: 'clinica_id' });
        filaRef.current = fila;
        setConnected(true);
        onConnected?.(data.access_token);
      } catch (err) {
        alert('No se pudo conectar con Google Calendar: ' + (err.message || 'error desconocido'));
      }
    },
  });

  // Devuelve un access_token vigente, renovándolo primero si está por vencer.
  // Devuelve null si no hay conexión, o si la renovación falla (ej. el usuario
  // revocó el acceso desde su cuenta de Google) — en ese caso desconecta.
  const getToken = useCallback(async () => {
    const fila = filaRef.current;
    if (!fila || !fila.refresh_token) return null;

    const vigente = fila.token_expires_at && new Date(fila.token_expires_at).getTime() - REFRESH_MARGIN_MS > Date.now();
    if (vigente) return fila.access_token;

    const { data, error } = await supabase.functions.invoke('google-calendar-token', {
      body: { action: 'refresh', refreshToken: fila.refresh_token },
    });
    if (error || data?.error || !data?.access_token) {
      await disconnect();
      return null;
    }

    const token_expires_at = new Date(Date.now() + data.expires_in * 1000).toISOString();
    await supabase.from('integraciones_google').update({
      access_token: data.access_token, token_expires_at, updated_at: new Date().toISOString(),
    }).eq('clinica_id', clinicaId);
    filaRef.current = { ...fila, access_token: data.access_token, token_expires_at };
    return data.access_token;
  }, [clinicaId, disconnect]);

  return { connected, loading, connect, disconnect, getToken };
}
