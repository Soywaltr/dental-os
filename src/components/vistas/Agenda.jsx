// src/components/vistas/Agenda.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '../../supabase';
import useGoogleCalendar from '../../utils/useGoogleCalendar';
import ModalNuevaCita from '../ui/ModalNuevaCita';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import Stat from '../ui/Stat';
import { BD, P, GL, MU, DN, LT, RJ, WA, DEFAULT_HORARIO, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

const horaNum = (str) => parseInt((str || '0:00').split(':')[0], 10);

// Curva y duración estándar del sistema para los controles del encabezado:
// propiedades explícitas (nunca "all") para no animar layout sin querer.
const NAV_TRANSITION = 'background-color .15s cubic-bezier(0.25, 0.1, 0.25, 1), border-color .15s cubic-bezier(0.25, 0.1, 0.25, 1)';

// Horas cerradas: rayado diagonal con dos superficies del tema (antes dos
// grises fijos), para que el patrón siga leyéndose en modo oscuro.
const RAYADO_CERRADO = 'repeating-linear-gradient(45deg, #F1F1F7, #F1F1F7 6px, #F1F1F7 6px, #F1F1F7 12px)';

// Tipos de bloque de cita. Antes eran tres colores saturados con texto blanco
// (#6366f1 indigo, #0D5C6B teal, #e11d48 rojo) y el rojo era el caso POR
// DEFECTO -- en el resto de la app el rojo significa "problema", así que una
// cita normal se leía como una alerta. Ahora son tintes suaves con texto
// oscuro, que es además lo que hace legible el título Y la hora dentro de un
// bloque de 46px de alto.
//
// `borde` da el filo de color a la izquierda: es lo que sigue distinguiendo un
// tipo de otro cuando el relleno es tenue.
const TIPO_CITA = {
  google: { tinte: 'color-mix(in srgb, #7B5CFA 14%, #FFFFFF)', borde: '#7B5CFA' },
  nuevo:  { tinte: '#DCFCE7', borde: '#16A34A' },
  normal: { tinte: '#F1F1F7', borde: 'rgba(22, 22, 29, 0.11)' },
};
const tipoDeCita = (p) => (p.isGoogleOnly ? 'google' : p.tag === 'nuevo' ? 'nuevo' : 'normal');

// Asistencia: un evento de Google puede no tener fila en `pacientes` (ver
// isGoogleOnly), así que el estado se guarda en su propia tabla
// (estados_cita) keyeada por google_event_id -- toda cita, con o sin
// paciente vinculado, termina teniendo uno porque agendar exige Google
// Calendar conectado (ver enviarAGoogleCalendar).
const claveCita = (p) => p.google_event_id || `pac-${p.id}`;
const ESTADOS_CITA = [
  { key: 'pendiente',    label: 'Pendiente',   color: MU },
  { key: 'asistio',      label: 'Asistió',     color: WA },
  { key: 'no_asistio',   label: 'No asistió',  color: RJ },
  { key: 'reprogramada', label: 'Reprogramada',color: GL },
];

const LABEL_MODAL = { fontSize: 13, fontWeight: 600, color: MU };
const INPUT_MODAL = {
  width: '100%', padding: '10px 12px', minHeight: 44, borderRadius: '10px',
  border: `1px solid ${BD}`, marginTop: 6, boxSizing: 'border-box', fontSize: 15,
  color: DN, background: LT, outline: 'none',
  transition: 'border-color .15s cubic-bezier(0.25, 0.1, 0.25, 1)',
};

export default function Agenda({ clinicaId, clinica }) {
  // Horario real del consultorio (Ajustes > Generales > Horario de atención),
  // con respaldo a un horario por defecto mientras la clínica no lo configure.
  const horario = { ...DEFAULT_HORARIO, ...(clinica?.horario || {}) };
  const lvInicioH = horaNum(horario.lv_inicio);
  const lvFinH = horaNum(horario.lv_fin);
  const sabInicioH = horaNum(horario.sab_inicio);
  const sabFinH = horaNum(horario.sab_fin);
  const inicioH = horario.sab_cerrado ? lvInicioH : Math.min(lvInicioH, sabInicioH);
  const finH = horario.sab_cerrado ? lvFinH : Math.max(lvFinH, sabFinH);
  const hours = Array.from({ length: Math.max(finH - inicioH + 1, 0) }, (_, i) => `${inicioH + i}:00`);

  // Domingo (0) siempre cerrado — la Agenda nunca agenda ese día. Sábado (6)
  // usa su propio rango; el resto (Lun-Vie) usa el rango general.
  const estaAbierto = (fecha, hora) => {
    const dow = fecha.getDay();
    if (dow === 0) return false;
    if (dow === 6) return !horario.sab_cerrado && hora >= sabInicioH && hora <= sabFinH;
    return hora >= lvInicioH && hora <= lvFinH;
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('Semana');

  const [showModalCita, setShowModalCita] = useState(false);
  const [datosTemp, setDatosTemp] = useState(null);

  const { connected: googleConnected, connect: login, disconnect: googleDisconnect, getToken } = useGoogleCalendar(clinicaId, async (accessToken) => {
    if (datosTemp) {
      await enviarAGoogleCalendar(accessToken, datosTemp);
      setDatosTemp(null);
    }
  });

  const [weekApts, setWeekApts] = useState([[], [], [], [], [], []]);
  const [allApts, setAllApts] = useState([]);
  const [listaPacientes, setListaPacientes] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Hora actual para la línea de "ahora" sobre la grilla. Se refresca cada
  // minuto: con un `new Date()` calculado en el render, la línea se quedaría
  // congelada donde estaba al montar la vista, que es justo lo que la haría
  // inútil en una agenda que se deja abierta toda la jornada.
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Fecha y hora con las que abrir "Nueva cita" precargada; null = en blanco.
  const [preseleccion, setPreseleccion] = useState(null);

  // Abre "Nueva cita" con la fecha y la hora del hueco que se tocó, en vez de
  // obligar a reescribirlas.
  const abrirNuevaCitaEn = (fechaISO, hora) => {
    const hh = String(parseInt(hora, 10)).padStart(2, '0');
    setPreseleccion({ fecha: fechaISO, hora: `${hh}:00` });
    setShowModalCita(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('pacientes').select('*');
      if (error) { console.error("Error cargando Supabase:", error); return; }

      let externalGoogleApts = [];
      const googleToken = googleConnected ? await getToken() : null;
      if (googleToken) {
        try {
          const timeMin = new Date(); timeMin.setDate(timeMin.getDate() - 30);
          const timeMax = new Date(); timeMax.setDate(timeMax.getDate() + 60);

          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true`, {
            headers: { 'Authorization': `Bearer ${googleToken}` }
          });

          if (res.ok) {
            const gData = await res.json();
            externalGoogleApts = (gData.items || [])
              .filter(gEvent => !data.some(dbCita => dbCita.google_event_id === gEvent.id))
              .map(gEvent => {
                if (!gEvent.start || !gEvent.start.dateTime) return null;
                const dateParts = gEvent.start.dateTime.split('T');
                const timeStr = dateParts[1].substring(0, 5);
                return {
                  id: gEvent.id, google_event_id: gEvent.id, isGoogleOnly: true,
                  name: gEvent.summary || 'Cita Google', doc: '', phone: '',
                  reason: gEvent.description || 'Agendada desde Google Calendar',
                  fecha: dateParts[0], hora_cita: timeStr, tag: 'google'
                };
              }).filter(Boolean);
          } else if (res.status === 401) {
            // getToken() ya renovó el token antes de esta llamada — un 401 aquí
            // significa que el usuario revocó el acceso desde su cuenta de Google.
            googleDisconnect();
          }
        } catch (e) { console.error("Error conectando a Google:", e); }
      }

      let estadosMap = {};
      if (clinicaId) {
        const { data: estadosData } = await supabase.from('estados_cita').select('google_event_id, estado').eq('clinica_id', clinicaId);
        (estadosData || []).forEach(e => { estadosMap[e.google_event_id] = e.estado; });
      }

      const combinedData = [...data, ...externalGoogleApts].map(p => ({ ...p, estado: estadosMap[claveCita(p)] || 'pendiente' }));
      setAllApts(combinedData);

      // El autocompletado de "Nueva cita" no ofrece pacientes archivados: si
      // hay que volver a atender a alguien, primero se lo recupera desde el
      // Directorio, y así su ficha vuelve a estar visible en todas las vistas.
      const unicos = [];
      const nombresVistos = new Set();
      data.filter(p => !p.archivado_at).forEach(p => {
        if (!nombresVistos.has(p.name)) {
          nombresVistos.add(p.name);
          unicos.push({ name: p.name, phone: p.phone, id: p.id, doc: p.doc });
        }
      });
      setListaPacientes(unicos);

      const tempApts = [[], [], [], [], [], [], []]; 

      const startOfWeek = new Date(currentDate);
      startOfWeek.setHours(0, 0, 0, 0);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1));

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weekDatesStr = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });

      combinedData.forEach(p => {
        if (p.fecha && p.hora_cita) {
          const dayIndex = weekDatesStr.indexOf(p.fecha);
          if (dayIndex !== -1) {
            tempApts[dayIndex].push({
              ...p, p: p.name, t: p.treatment || p.reason,
              h: parseInt(p.hora_cita.split(':')[0], 10),
              tipo: tipoDeCita(p),
            });
          }
        }
      });
      setWeekApts(tempApts);
    };

    fetchData();
  }, [currentDate, view, googleConnected, getToken, googleDisconnect, clinicaId]);

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === 'Mensual') next.setMonth(currentDate.getMonth() + 1);
    else if (view === 'Semana') next.setDate(currentDate.getDate() + 7);
    else next.setDate(currentDate.getDate() + 1);
    setCurrentDate(next);
  };

  const handlePrev = () => {
    const prev = new Date(currentDate);
    if (view === 'Mensual') prev.setMonth(currentDate.getMonth() - 1);
    else if (view === 'Semana') prev.setDate(currentDate.getDate() - 7);
    else prev.setDate(currentDate.getDate() - 1);
    setCurrentDate(prev);
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const day = start.getDay();
    start.setDate(1 + ((day === 0 ? -6 : 1) - day));
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setHours(12, 0, 0, 0); 
    const day = start.getDay();
    start.setDate(start.getDate() - day + (day === 0 ? -6 : 1));
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  };

  const displayDays = view === 'Semana' ? getWeekDays() : view === 'Día' ? [currentDate] : getMonthDays();

  const handleGuardarCita = async (datosCita) => {
    const isOccupied = allApts.some(cita => cita.fecha === datosCita.fecha && cita.hora_cita === datosCita.hora);
    if (isOccupied) {
      alert("⚠️ Ese horario ya está ocupado. Por favor, elige otra fecha u hora para la cita.");
      return;
    }
    const googleToken = googleConnected ? await getToken() : null;
    if (googleToken) enviarAGoogleCalendar(googleToken, datosCita);
    else { setDatosTemp(datosCita); login(); }
  };

  // "No bloqueante" quiere decir que un fallo de GHL nunca le muestra un
  // error al usuario ni impide que la cita se haya guardado -- pero SI hay
  // que esperar (await) a que termine antes de recargar la pagina, porque
  // un window.location.reload() inmediato cancela cualquier request que
  // todavia este en camino (asi se perdio la sincronizacion la primera vez:
  // solo llegaba a completarse el preflight CORS, nunca el POST real).
  const sincronizarConGHL = async (datos) => {
    try {
      const { data, error } = await supabase.functions.invoke('ghl-sincronizar-cita', { body: datos });
      if (error || data?.error) console.error('No se pudo sincronizar con GHL:', error?.message || data?.error);
    } catch (err) {
      console.error('No se pudo sincronizar con GHL:', err);
    }
  };

  const enviarAGoogleCalendar = async (accessToken, cita) => {
    try {
      const startDateTime = `${cita.fecha}T${cita.hora}:00-05:00`;
      const endDate = new Date(new Date(startDateTime).getTime() + horario.duracion_cita * 60 * 1000);
      const endDateTime = endDate.toISOString();

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `${cita.paciente} - ${cita.motivo}`,
          description: `Celular: ${cita.celular} | DNI: ${cita.doc}`,
          start: { dateTime: startDateTime }, end: { dateTime: endDateTime }
        })
      });

      if (!response.ok) throw new Error("Error al crear evento en Google");
      const { id: googleEventId } = await response.json();

      let pacienteEncontrado = null;
      const docLimpio = cita.doc ? cita.doc.trim() : '';
      const nombreLimpio = cita.paciente ? cita.paciente.trim() : '';

      if (docLimpio !== '') {
        const { data: porDoc } = await supabase.from('pacientes').select('id').eq('doc', docLimpio).limit(1);
        if (porDoc && porDoc.length > 0) { pacienteEncontrado = porDoc[0]; }
      }

      if (pacienteEncontrado) {
        await supabase.from('pacientes').update({
          fecha: cita.fecha, hora_cita: cita.hora, reason: cita.motivo,
          google_event_id: googleEventId, name: nombreLimpio, phone: cita.celular ? cita.celular : undefined
        }).eq('id', pacienteEncontrado.id);
      } else {
        await supabase.from('pacientes').insert([{
          name: nombreLimpio, doc: docLimpio, phone: cita.celular, reason: cita.motivo,
          fecha: cita.fecha, hora_cita: cita.hora, tag: 'nuevo', google_event_id: googleEventId,
          clinica_id: clinicaId
        }]);
      }

      if (cita.celular) {
        await sincronizarConGHL({ nombre: nombreLimpio, telefono: cita.celular, fecha: cita.fecha, hora: cita.hora, motivo: cita.motivo });
      }

      alert("¡Cita agendada correctamente!");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Hubo un problema al guardar la cita.");
    }
  };

  const handleSaveEdit = async () => {
    const isOccupied = allApts.some(cita => cita.id !== selectedCita.id && cita.fecha === selectedCita.fecha && cita.hora_cita === selectedCita.hora_cita);
    if (isOccupied) {
      alert("⚠️ Ese horario ya está ocupado por otra cita. Por favor, elige otra fecha u hora.");
      return;
    }

    setSavingEdit(true);
    if (!selectedCita.isGoogleOnly) {
      const { error } = await supabase.from('pacientes').update({
        fecha: selectedCita.fecha, hora_cita: selectedCita.hora_cita,
        reason: selectedCita.reason, treatment: selectedCita.treatment
      }).eq('id', selectedCita.id);
      if (error) { alert('Error: ' + error.message); setSavingEdit(false); return; }

      if (selectedCita.phone) {
        await sincronizarConGHL({
          nombre: selectedCita.name, telefono: selectedCita.phone,
          fecha: selectedCita.fecha, hora: selectedCita.hora_cita,
          motivo: selectedCita.treatment || selectedCita.reason,
        });
      }
    }

    const googleToken = googleConnected ? await getToken() : null;
    if (googleToken && selectedCita.google_event_id) {
      try {
        const startDateTime = `${selectedCita.fecha}T${selectedCita.hora_cita}:00-05:00`;
        const endDate = new Date(new Date(startDateTime).getTime() + horario.duracion_cita * 60 * 1000);
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${selectedCita.google_event_id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start: { dateTime: startDateTime }, end: { dateTime: endDate.toISOString() },
            summary: `${selectedCita.name} - ${selectedCita.treatment || selectedCita.reason}`
          })
        });
      } catch (err) { console.error("Error Google Calendar", err); }
    }

    alert('Cita actualizada correctamente.');
    setShowEditModal(false); setSavingEdit(false); window.location.reload();
  };

  const handleDeleteCita = async () => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la cita de ${selectedCita.name}?`)) return;
    setSavingEdit(true);
    try {
      const googleToken = googleConnected ? await getToken() : null;
      if (googleToken && selectedCita.google_event_id) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${selectedCita.google_event_id}`, {
          method: 'DELETE', headers: { 'Authorization': `Bearer ${googleToken}` }
        });
      }
      if (!selectedCita.isGoogleOnly) {
        const { error } = await supabase.from('pacientes').update({ fecha: null, hora_cita: null, google_event_id: null }).eq('id', selectedCita.id);
        if (error) throw error;
      }
      alert("Cita eliminada correctamente.");
      setShowEditModal(false); window.location.reload();
    } catch (error) {
      console.error("Error al eliminar:", error); alert("Hubo un problema al eliminar la cita.");
    } finally { setSavingEdit(false); }
  };

  // ── Resumen de arriba: sólo lo que se puede saber sin abrir el calendario ──
  const hoyStr = new Date().toISOString().slice(0, 10);
  const semana = getWeekDays();
  const semanaSet = new Set(semana.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`));
  const citasAgendadas = allApts.filter(a => a.fecha && a.hora_cita);
  const citasHoy = citasAgendadas.filter(a => a.fecha === hoyStr);
  const citasSemana = citasAgendadas.filter(a => semanaSet.has(a.fecha));
  const proximaCita = citasAgendadas
    .filter(a => a.fecha > hoyStr || (a.fecha === hoyStr && a.hora_cita >= new Date().toTimeString().slice(0, 5)))
    .sort((a, b) => (a.fecha + a.hora_cita).localeCompare(b.fecha + b.hora_cita))[0];

  return (
    // 28px/20px, no números sueltos (18/12/16): son el
    // mismo canal de aire que usa el resto de la app -- con su propio número
    // acá, Agenda se leía un poco más apretada que las demás vistas aunque
    // nadie pudiera decir por qué.
    <div style={{ padding: '28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
        <Stat label="Citas hoy" value={citasHoy.length} col={P} icon={<Icon name="calendar" size={15} />} />
        <Stat label="Esta semana" value={citasSemana.length} col={DN} icon={<Icon name="activity" size={15} />} />
        <Stat
          label="Próxima cita"
          value={proximaCita ? proximaCita.hora_cita : '—'}
          sub={proximaCita ? proximaCita.name : 'Sin citas próximas'}
          subCol={MU}
          col={proximaCita ? WA : MU}
          icon={<Icon name="clock" size={15} />}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handlePrev} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: '10px', padding: '6px 12px', minHeight: 36, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: DN, transition: NAV_TRANSITION }}>◄</button>
          <button onClick={() => setCurrentDate(new Date())} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: '10px', padding: '6px 14px', minHeight: 36, cursor: 'pointer', fontWeight: 600, color: DN, fontSize: 13, transition: NAV_TRANSITION }}>Hoy</button>
          <button onClick={handleNext} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: '10px', padding: '6px 12px', minHeight: 36, cursor: 'pointer', fontWeight: 600, fontSize: 13, color: DN, transition: NAV_TRANSITION }}>►</button>
        </div>

        <div style={{ fontSize: 15, fontWeight: 600, color: DN, textTransform: 'capitalize', fontVariantNumeric: 'tabular-nums' }}>
          {view === 'Mensual'
            ? currentDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' })
            : view === 'Semana' ? `Semana del ${getWeekDays()[0].getDate()} al ${getWeekDays()[5].getDate()}` : `Día: ${currentDate.toLocaleDateString()}`}
        </div>

        <select value={view} onChange={e => setView(e.target.value)} style={{ marginLeft: 'auto', padding: '6px 12px', minHeight: 36, borderRadius: '10px', border: `1px solid ${BD}`, fontSize: 13, color: DN, background: LT, outline: 'none', transition: NAV_TRANSITION }}>
          <option value="Semana">Vista semanal</option>
          <option value="Día">Vista diaria</option>
          <option value="Mensual">Vista mensual</option>
        </select>

        {!googleConnected && (
          <button onClick={() => login()} style={{ background: '#FEF3C7', color: GL, border: `1px solid color-mix(in srgb, ${GL} 30%, transparent)`, borderRadius: '10px', padding: '6px 14px', minHeight: 36, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: NAV_TRANSITION }}>
            Sincronizar Google
          </button>
        )}

        <Button onClick={() => { setPreseleccion(null); setShowModalCita(true); }} style={{ padding: '8px 16px', minHeight: 44, fontSize: 15 }}>
          + Nueva cita
        </Button>
      </div>

      <div style={{ background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW }}>

        {/* minmax(0, 1fr), no 1fr a secas, en las TRES grillas de este
            archivo (esta cabecera, cada fila de hora y la vista mensual): por
            defecto una columna de grid no se achica más allá del contenido
            mínimo de lo que tiene adentro. Un evento traído de Google
            Calendar con un título largo y sin espacio donde partir
            (whiteSpace: 'nowrap' + ellipsis) empujaba la columna entera a
            crecer para no cortarlo -- el bloque se leía "estirado" sobre la
            columna vecina en vez de truncarse con "…", que es lo que de
            verdad rompía el orden de la grilla. */}
        {/* Cabecera de días. La columna de HOY se marca con la tinta invertida
            (fondo oscuro), no con un tono suave: es la referencia visual que
            más se busca al abrir la agenda. */}
        <div style={{ display: 'grid', gridTemplateColumns: view === 'Mensual' ? 'repeat(7, minmax(0, 1fr))' : `56px repeat(${displayDays.length},minmax(0, 1fr))`, borderBottom: `1px solid ${BD}`, background: LT }}>
          {view !== 'Mensual' && <div style={{ padding: 4 }} />}
          {(view === 'Mensual' ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : displayDays).map((d, i) => {
            const label = view === 'Mensual' ? d : `${d.getDate()} · ${d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')}`;
            const isToday = view !== 'Mensual' && d.toDateString() === new Date().toDateString();
            return (
              <div key={i} style={{
                padding: '11px 8px', textAlign: 'center',
                background: isToday ? DN : LT,
                borderLeft: i > 0 ? `1px solid ${BD}` : 'none',
              }}>
                <div style={{
                  fontSize: 13, fontWeight: isToday ? 600 : 500,
                  color: isToday ? LT : MU,
                  textTransform: 'capitalize', fontVariantNumeric: 'tabular-nums',
                }}>
                  {label}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {view === 'Mensual' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(100px, 1fr)' }}>
              {displayDays.map((d, i) => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const apts = allApts.filter(a => a.fecha === dateStr);
                const isCurrentMonth = d.getMonth() === currentDate.getMonth();

                return (
                  <div key={i} style={{ borderRight: `1px solid ${BD}`, borderBottom: `1px solid ${BD}`, padding: 6, background: isCurrentMonth ? LT : '#F1F1F7' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: isCurrentMonth ? DN : MU, marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>{d.getDate()}</div>
                    {/* Mismo tratamiento de tinte que la vista semanal. El tipo
                        se calcula acá porque estas filas vienen de `allApts`
                        (datos crudos), no de `weekApts`, que es donde se
                        precalcula `.tipo`. */}
                    {apts.map((a, ai) => {
                      const tipo = TIPO_CITA[tipoDeCita(a)];
                      return (
                        <div key={ai} onClick={() => { setSelectedCita(a); setShowEditModal(true); }}
                          className="bloque-cita"
                          style={{
                            background: tipo.tinte, borderLeft: `3px solid ${tipo.borde}`,
                            color: DN, padding: '7px 9px', minHeight: 36, boxSizing: 'border-box',
                            borderRadius: '10px', fontSize: 11.5, lineHeight: 1.35,
                            marginBottom: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums',
                          }}>
                          <b>{a.hora_cita}</b> {a.name}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            hours.map(h => {
              const horaFila = parseInt(h, 10);
              // ¿La línea de "ahora" cae dentro de esta fila? Si sí, se calcula
              // a qué % de alto va, para que la línea quede en el minuto real y
              // no pegada al borde de la hora.
              const esFilaActual = ahora.getHours() === horaFila;
              const pctMinuto = (ahora.getMinutes() / 60) * 100;

              return (
              <div key={h} style={{ display: 'grid', gridTemplateColumns: `56px repeat(${displayDays.length},minmax(0, 1fr))`, borderBottom: `1px solid ${BD}`, minHeight: 52, position: 'relative' }}>
                <div style={{ padding: '6px 9px', fontSize: 11.5, color: '#8A8A96', textAlign: 'right', background: LT, borderRight: `1px solid ${BD}`, fontVariantNumeric: 'tabular-nums' }}>{h}</div>
                {displayDays.map((d, di) => {
                  const mapIndex = view === 'Semana' ? di : d.getUTCDay() - 1;
                  const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const abierto = estaAbierto(d, horaFila);
                  const esHoy = d.toDateString() === ahora.toDateString();
                  const citasCelda = (weekApts[mapIndex] || []).filter(a => a.h === horaFila && a.fecha === targetDate);

                  return (
                    <div key={di} style={{
                      borderLeft: `1px solid ${BD}`, padding: 4, minHeight: 52,
                      background: abierto ? undefined : RAYADO_CERRADO,
                      position: 'relative',
                    }}>
                      {/* Línea de hora actual: sólo en la columna de hoy y sólo
                          en la fila de la hora en curso. */}
                      {esHoy && esFilaActual && (
                        <div aria-hidden="true" style={{
                          position: 'absolute', left: 0, right: 0, top: `${pctMinuto}%`,
                          height: 2, background: RJ, zIndex: 3, pointerEvents: 'none',
                        }}>
                          <span style={{
                            position: 'absolute', left: 0, top: -1, width: 7, height: 7,
                            borderRadius: '50%', background: RJ, transform: 'translate(-3px, -2.5px)',
                          }} />
                        </div>
                      )}

                      {/* Celda vacía y abierta: crea una cita YA con esa fecha y
                          hora. Antes había que abrir "Nueva cita" y volver a
                          escribir a mano el día y la hora que ya se estaban
                          mirando. El :hover lo pone .celda-libre en ui.css. */}
                      {citasCelda.length === 0 && abierto && (
                        <button
                          className="celda-libre"
                          onClick={() => abrirNuevaCitaEn(targetDate, h)}
                          aria-label={`Agendar el ${targetDate} a las ${h}`}
                          title={`Agendar a las ${h}`}
                          style={{
                            position: 'absolute', inset: 4,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'transparent', border: 'none',
                            borderRadius: '10px', cursor: 'pointer',
                            color: 'transparent', padding: 0,
                          }}
                        >
                          <Icon name="plus" size={15} />
                        </button>
                      )}

                      {citasCelda.map((a, ai) => {
                        const tipo = TIPO_CITA[a.tipo] || TIPO_CITA.normal;
                        return (
                          <div key={ai} onClick={() => { setSelectedCita(a); setShowEditModal(true); }}
                            className="bloque-cita"
                            style={{
                              background: tipo.tinte,
                              borderLeft: `3px solid ${tipo.borde}`,
                              borderRadius: '10px',
                              padding: '7px 10px', minHeight: 44, boxSizing: 'border-box',
                              cursor: 'pointer', marginBottom: 4, position: 'relative', zIndex: 2,
                            }}
                          >
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: DN, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.p}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                              <span style={{ fontSize: 11.5, color: MU, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{a.hora_cita}</span>
                              {a.t && (
                                <span style={{ fontSize: 11.5, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>· {a.t}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                })}
              </div>
              );
            })
          )}
        </div>
      </div>

      {showModalCita && <ModalNuevaCita onClose={() => { setShowModalCita(false); setPreseleccion(null); }} onSave={handleGuardarCita} listaPacientes={listaPacientes} modo="cita" inicial={preseleccion} />}

      {showEditModal && selectedCita && (
        <Modal cardStyle={{ padding: 24, width: 400 }}>
            <h3 style={{ marginTop: 0, marginBottom: 18, color: DN, fontSize: 17, fontWeight: 600 }}>
              {selectedCita.isGoogleOnly ? 'Editar Evento de Google' : `Editar Cita: ${selectedCita.name}`}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={LABEL_MODAL}>TRATAMIENTO / MOTIVO</label>
                <input
                  value={selectedCita.treatment || selectedCita.reason || ''}
                  onChange={e => setSelectedCita({ ...selectedCita, treatment: e.target.value, reason: e.target.value })}
                  style={INPUT_MODAL}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_MODAL}>NUEVA FECHA</label>
                  <input
                    type="date"
                    value={selectedCita.fecha || ''}
                    onChange={e => setSelectedCita({ ...selectedCita, fecha: e.target.value })}
                    style={{ ...INPUT_MODAL, fontVariantNumeric: 'tabular-nums' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={LABEL_MODAL}>NUEVA HORA</label>
                  <input
                    type="time"
                    value={selectedCita.hora_cita || ''}
                    onChange={e => setSelectedCita({ ...selectedCita, hora_cita: e.target.value })}
                    style={{ ...INPUT_MODAL, fontVariantNumeric: 'tabular-nums' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <Button
                variant="danger"
                onClick={handleDeleteCita}
                disabled={savingEdit}
                style={{ padding: '10px 16px', minHeight: 44, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Icon name="trash" size={15} /> Eliminar
              </Button>

              <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={savingEdit} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15 }}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit} style={{ flex: 1, padding: 10, minHeight: 44, fontSize: 15 }}>
                  {savingEdit ? 'Procesando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
        </Modal>
      )}
    </div>
  );
}