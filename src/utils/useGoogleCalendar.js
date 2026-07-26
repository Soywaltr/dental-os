// src/utils/useGoogleCalendar.js
// Estado de conexión de Google Calendar, compartido entre Agenda.jsx (donde se
// usa para crear/editar/borrar eventos) y Ajustes > Integraciones (donde se
// muestra el estado de conexión y se puede desconectar). Guardado en la tabla
// `integraciones_google`, por clínica (clinica_id) — no en localStorage, para
// que la conexión sea de todo el consultorio y no de un solo navegador.
//
// El refresh_token nunca pasa por el navegador: la Edge Function
// `google-calendar-token` deduce la clínica del JWT de la sesión, lee el token
// de la base y devuelve solo un access_token efímero. Así el client secret no
// queda expuesto como oráculo de canje.
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
      // No se pide refresh_token: el cliente no lo necesita para nada.
      const { data, error } = await supabase
        .from('integraciones_google')
        .select('access_token, token_expires_at, connected_at')
        .eq('clinica_id', clinicaId)
        .limit(1);
      if (!error && data && data.length > 0) {
        filaRef.current = data[0];
        setConnected(true);
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
        // La función canjea el código y guarda ella misma los tokens.
        const { data, error } = await supabase.functions.invoke('google-calendar-token', {
          body: { action: 'exchange', code },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        filaRef.current = {
          access_token: data.access_token,
          token_expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
        };
        setConnected(true);
        onConnected?.(data.access_token);
      } catch (err) {
        alert('No se pudo conectar con Google Calendar: ' + (err.message || 'error desconocido'));
      }
    },
  });

  // Devuelve un access_token vigente, renovándolo primero si está por vencer.
  // Devuelve null si no hay conexión o si la renovación falla.
  const getToken = useCallback(async () => {
    const fila = filaRef.current;
    if (!fila) return null;

    const vigente = fila.token_expires_at && new Date(fila.token_expires_at).getTime() - REFRESH_MARGIN_MS > Date.now();
    if (vigente) return fila.access_token;

    const { data, error } = await supabase.functions.invoke('google-calendar-token', {
      body: { action: 'refresh' },
    });
    if (error || data?.error || !data?.access_token) {
      // Solo se borra la conexión guardada si Google dice que el permiso ya no
      // sirve ('invalid_grant': revocado o expirado). Ante un fallo pasajero
      // (red, Edge Function caída) se deja la fila intacta y se reintenta luego.
      if (data?.error_code === 'invalid_grant') await disconnect();
      return null;
    }

    filaRef.current = {
      ...fila,
      access_token: data.access_token,
      token_expires_at: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    };
    return data.access_token;
  }, [disconnect]);

  return { connected, loading, connect, disconnect, getToken };
}
