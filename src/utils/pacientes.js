// src/utils/pacientes.js
import { supabase } from '../supabase';

// Borra al paciente Y, en cascada, su historia clínica, órdenes de
// laboratorio, tratamiento de ortodoncia y el estado de asistencia de su
// cita (si tenía una vinculada a Google Calendar).
//
// El orden importa: `laboratorio_ordenes`/`ortodoncia`/`historias` tienen
// una FK a `pacientes` sin ON DELETE CASCADE, así que hay que borrar esas
// filas ANTES que la del paciente. La primera vez que este borrado existió
// no seguía este orden -- fallaba con un error de Postgres en inglés si
// había órdenes de laboratorio, y cuando no fallaba se llevaba la
// ortodoncia pero dejaba la historia clínica huérfana e invisible (así se
// acumularon 9 historias sin paciente). Por eso Expediente.jsx pasó a
// archivar en vez de borrar. Este borrado es la reconstrucción cuidadosa
// de esa función, para el caso puntual de un "paciente" que nunca llegó a
// tener una historia real que valga la pena conservar (ej. no se presentó
// a la cita) -- irreversible, se llama sólo después de una doble
// confirmación en la UI.
export async function eliminarPacienteCompleto(pacienteId) {
  const { data: paciente, error: errLectura } = await supabase
    .from('pacientes').select('google_event_id').eq('id', pacienteId).maybeSingle();
  if (errLectura) throw errLectura;

  const { error: errLab } = await supabase.from('laboratorio_ordenes').delete().eq('patient_id', pacienteId);
  if (errLab) throw errLab;

  const { error: errOrto } = await supabase.from('ortodoncia').delete().eq('paciente_id', pacienteId);
  if (errOrto) throw errOrto;

  const { error: errHistoria } = await supabase.from('historias').delete().eq('patient_id', pacienteId);
  if (errHistoria) throw errHistoria;

  if (paciente?.google_event_id) {
    const { error: errEstado } = await supabase.from('estados_cita').delete().eq('google_event_id', paciente.google_event_id);
    // No detiene el borrado del paciente por esto: estados_cita es sólo un
    // registro auxiliar de asistencia, no una historia clínica.
    if (errEstado) console.error('No se pudo limpiar estados_cita:', errEstado);
  }

  const { error: errPaciente } = await supabase.from('pacientes').delete().eq('id', pacienteId);
  if (errPaciente) throw errPaciente;
}
