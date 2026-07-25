// src/utils/useMetaWhatsApp.js
// Conexión de WhatsApp Business vía OAuth de Meta. El estado real (token,
// negocios asociados) vive en Supabase (tabla `integraciones_whatsapp`), no en
// localStorage, porque es una integración de todo el consultorio, no del
// navegador de quien la conectó. Se filtra/etiqueta por `clinicaId` para que
// dos clínicas nunca vean (ni puedan desconectar) el WhatsApp de la otra.
//
// Requiere, para funcionar de verdad:
//  - META_APP_ID real en utils/constants.js (hoy es un placeholder).
//  - Esa misma URL (origin + pathname) registrada como Redirect URI válida en
//    developers.facebook.com para la app.
//  - Los secretos META_APP_ID / META_APP_SECRET configurados en Supabase para
//    la función de Edge `whatsapp-meta-callback` (ver scratch/sql-integraciones.md).
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { META_APP_ID, META_OAUTH_SCOPE, META_OAUTH_STATE } from './constants';

const RETURN_VIEW_KEY = 'dentalos_return_view';

export default function useMetaWhatsApp(clinicaId) {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const cargar = useCallback(async () => {
    if (!clinicaId) { setConnection(null); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('integraciones_whatsapp')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (!error) setConnection((data && data[0]) || null);
    setLoading(false);
  }, [clinicaId]);

  useEffect(() => { cargar(); }, [cargar]);

  const connect = useCallback(() => {
    sessionStorage.setItem(RETURN_VIEW_KEY, 'config');
    const redirectUri = window.location.origin + window.location.pathname;
    const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    url.searchParams.set('client_id', META_APP_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', META_OAUTH_SCOPE);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', META_OAUTH_STATE);
    window.location.href = url.toString();
  }, []);

  const disconnect = useCallback(async () => {
    if (!connection) return;
    await supabase.from('integraciones_whatsapp').delete().eq('id', connection.id);
    setConnection(null);
  }, [connection]);

  // Se llama una vez al cargar la app: si Meta acaba de redirigir aquí con
  // ?code=..., intercambia el código y guarda la conexión. Devuelve el id de
  // vista a la que había que regresar (o null) para que App.jsx la restaure.
  const handleOAuthCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const returnView = sessionStorage.getItem(RETURN_VIEW_KEY);
    sessionStorage.removeItem(RETURN_VIEW_KEY);

    if (!code || state !== META_OAUTH_STATE) return returnView;
    if (!clinicaId) return returnView;

    window.history.replaceState({}, '', window.location.pathname);
    setConnecting(true);
    setErrorMsg(null);
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const { data, error } = await supabase.functions.invoke('whatsapp-meta-callback', {
        body: { code, redirectUri },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: dbError } = await supabase.from('integraciones_whatsapp').insert([{
        clinica_id: clinicaId, access_token: data.accessToken, businesses: data.businesses || [], connected_at: new Date().toISOString(),
      }]);
      if (dbError) throw dbError;
      await cargar();
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo completar la conexión con Meta.');
    } finally {
      setConnecting(false);
    }
    return returnView;
  }, [cargar, clinicaId]);

  return { connection, connected: !!connection, loading, connecting, errorMsg, connect, disconnect, handleOAuthCallback };
}
