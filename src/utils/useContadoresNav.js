// src/utils/useContadoresNav.js
// Contadores que se muestran al lado de cada sección del menú. Son consultas de
// sólo-conteo (`head: true`), así que el servidor devuelve el número sin traer
// ninguna fila: abrir el menú no puede costar lo que cuesta abrir una vista.
//
// Se cuentan sólo las cosas que un COUNT puede responder por sí solo. Los saldos
// pendientes, por ejemplo, viven dentro de jsonb (historias.plan_tratamiento y
// ortodoncia.pagos) y habría que traer y sumar todas las filas para saberlos: eso
// no es un contador de menú, es lo que ya hace el Dashboard.
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function useContadoresNav(clinicaId) {
  const [contadores, setContadores] = useState({});

  useEffect(() => {
    if (!clinicaId) return;
    let vivo = true;

    const cargar = async () => {
      const hoy = hoyISO();
      // El RLS acota cada conteo a la clínica del usuario; no hace falta
      // filtrar por clinica_id acá.
      const [citasHoy, pacientes, orto, lab] = await Promise.all([
        supabase.from('pacientes').select('id', { count: 'exact', head: true })
          .eq('fecha', hoy).not('hora_cita', 'is', null),
        supabase.from('pacientes').select('id', { count: 'exact', head: true }),
        supabase.from('ortodoncia').select('id', { count: 'exact', head: true }),
        supabase.from('laboratorio_ordenes').select('id', { count: 'exact', head: true })
          .neq('status', 'entregado'),
      ]);
      if (!vivo) return;
      // Un error deja ese contador en null y la sección simplemente no muestra
      // número, en vez de mostrar un 0 que sería mentira.
      setContadores({
        agenda: citasHoy.error ? null : citasHoy.count,
        expediente: pacientes.error ? null : pacientes.count,
        ortodoncia: orto.error ? null : orto.count,
        laboratorio: lab.error ? null : lab.count,
      });
    };

    cargar();
    return () => { vivo = false; };
  }, [clinicaId]);

  return contadores;
}
