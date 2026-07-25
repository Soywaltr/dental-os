// src/utils/useGoogleCalendar.js
// Estado de conexión de Google Calendar, compartido entre Agenda.jsx (donde se
// usa para crear/editar/borrar eventos) y Ajustes > Integraciones (donde se
// muestra el estado de conexión y se puede desconectar). El token vive en
// localStorage bajo esta misma key en ambos lugares.
import { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

export const GOOGLE_TOKEN_KEY = 'google_access_token';
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export default function useGoogleCalendar(onConnected) {
  const [token, setToken] = useState(() => localStorage.getItem(GOOGLE_TOKEN_KEY));

  const connect = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      localStorage.setItem(GOOGLE_TOKEN_KEY, tokenResponse.access_token);
      setToken(tokenResponse.access_token);
      onConnected?.(tokenResponse.access_token);
    },
    scope: GOOGLE_CALENDAR_SCOPE,
  });

  const disconnect = useCallback(() => {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    setToken(null);
  }, []);

  return { token, connected: !!token, connect, disconnect };
}
