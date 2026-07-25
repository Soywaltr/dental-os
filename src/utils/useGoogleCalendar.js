// src/utils/useGoogleCalendar.js
// Estado de conexión de Google Calendar, compartido entre Agenda.jsx (donde se
// usa para crear/editar/borrar eventos) y Ajustes > Integraciones (donde se
// muestra el estado de conexión y se puede desconectar). El token vive en la
// tabla `integraciones_google`, por clínica (clinica_id) — no en localStorage,
// para que la conexión sea de todo el consultorio y no de un solo navegador.
import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { supabase } from '../supabase';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export default function useGoogleCalendar(clinicaId, onConnected) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      if (!clinicaId) { setToken(null); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('integraciones_google')
        .select('access_token')
        .eq('clinica_id', clinicaId)
        .limit(1);
      setToken(!error && data && data.length > 0 ? data[0].access_token : null);
      setLoading(false);
    };
    cargar();
  }, [clinicaId]);

  const guardarToken = useCallback(async (accessToken) => {
    if (!clinicaId) return;
    await supabase.from('integraciones_google').upsert({
      clinica_id: clinicaId,
      access_token: accessToken,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'clinica_id' });
    setToken(accessToken);
  }, [clinicaId]);

  const connect = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      guardarToken(tokenResponse.access_token);
      onConnected?.(tokenResponse.access_token);
    },
    scope: GOOGLE_CALENDAR_SCOPE,
  });

  const disconnect = useCallback(async () => {
    if (!clinicaId) return;
    await supabase.from('integraciones_google').delete().eq('clinica_id', clinicaId);
    setToken(null);
  }, [clinicaId]);

  return { token, connected: !!token, loading, connect, disconnect };
}
