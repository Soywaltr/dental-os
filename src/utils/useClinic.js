// src/utils/useClinic.js
// Resuelve a qué clínica pertenece el usuario logueado (tabla usuarios_clinica),
// para que el resto de la app pueda filtrar/etiquetar cada consulta con clinica_id.
// Si el usuario perteneciera a más de una clínica (caso futuro), hoy se toma la
// primera — el selector de clínica activa queda fuera de esta fase.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

export default function useClinic() {
  const [userId, setUserId] = useState(null);
  const [clinicaId, setClinicaId] = useState(null);
  const [clinica, setClinica] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  // App.jsx monta este hook ANTES del gate de sesión, así que la primera vez
  // suele correr con el usuario deslogueado. Hay que reaccionar al login/logout
  // (que ocurren sin recargar la página): si no, clinicaId se queda en null para
  // siempre y todo lo que depende de él —integraciones y cada insert, porque
  // clinica_id es NOT NULL— falla en silencio.
  // Solo se hace setState aquí dentro; llamar a otras funciones de supabase
  // dentro de este callback puede bloquear el cliente.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      if (!userId) { setClinicaId(null); setClinica(null); setLoading(false); return; }
      setLoading(true);

      const { data, error } = await supabase
        .from('usuarios_clinica')
        .select('clinica_id, rol, clinicas ( id, nombre, direccion, telefono, email, cop, whatsapp_numero, logo_url, horario )')
        .eq('user_id', userId)
        .limit(1);

      if (cancelado) return;
      if (!error && data && data.length > 0) {
        setClinicaId(data[0].clinica_id);
        setClinica(data[0].clinicas);
      } else {
        setClinicaId(null);
        setClinica(null);
      }
      setLoading(false);
    };

    cargar();
    return () => { cancelado = true; };
  }, [userId, reloadTick]);

  const refrescar = useCallback(() => setReloadTick(t => t + 1), []);

  return { clinicaId, clinica, loading, refrescar };
}
