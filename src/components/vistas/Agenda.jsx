// src/components/vistas/Agenda.jsx
import React, { useState, useEffect } from "react";
import { supabase } from '../../supabase';
import { useGoogleLogin } from '@react-oauth/google';
import ModalNuevaCita from '../ui/ModalNuevaCita';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { BD, P, GL, MU, DN, MT, LT, RJ } from '../../utils/constants';

export default function Agenda() {
  const hours = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('Semana');

  const [showModalCita, setShowModalCita] = useState(false);
  const [datosTemp, setDatosTemp] = useState(null);

  const [googleToken, setGoogleToken] = useState(() => localStorage.getItem('google_access_token'));

  const [weekApts, setWeekApts] = useState([[], [], [], [], [], []]);
  const [allApts, setAllApts] = useState([]);
  const [listaPacientes, setListaPacientes] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('pacientes').select('*');
      if (error) { console.error("Error cargando Supabase:", error); return; }

      let externalGoogleApts = [];
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
                  fecha: dateParts[0], hora_cita: timeStr, tag: 'google', col: '#6366f1'
                };
              }).filter(Boolean);
          } else if (res.status === 401) {
            localStorage.removeItem('google_access_token');
            setGoogleToken(null);
          }
        } catch (e) { console.error("Error conectando a Google:", e); }
      }

      const combinedData = [...data, ...externalGoogleApts];
      setAllApts(combinedData);

      const unicos = [];
      const nombresVistos = new Set();
      data.forEach(p => {
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
              col: p.isGoogleOnly ? '#6366f1' : (p.tag === 'nuevo' ? '#0D5C6B' : '#e11d48')
            });
          }
        }
      });
      setWeekApts(tempApts);
    };

    fetchData();
  }, [currentDate, view, googleToken]);

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

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      localStorage.setItem('google_access_token', tokenResponse.access_token);
      setGoogleToken(tokenResponse.access_token);
      if (datosTemp) {
        await enviarAGoogleCalendar(tokenResponse.access_token, datosTemp);
        setDatosTemp(null);
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar.events',
  });

  const handleGuardarCita = (datosCita) => {
    const isOccupied = allApts.some(cita => cita.fecha === datosCita.fecha && cita.hora_cita === datosCita.hora);
    if (isOccupied) {
      alert("⚠️ Ese horario ya está ocupado. Por favor, elige otra fecha u hora para la cita.");
      return;
    }
    if (googleToken) enviarAGoogleCalendar(googleToken, datosCita);
    else { setDatosTemp(datosCita); login(); }
  };

  const enviarAGoogleCalendar = async (accessToken, cita) => {
    try {
      const startDateTime = `${cita.fecha}T${cita.hora}:00-05:00`;
      const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000);
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
          fecha: cita.fecha, hora_cita: cita.hora, tag: 'nuevo', google_event_id: googleEventId
        }]);
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
    }

    if (googleToken && selectedCita.google_event_id) {
      try {
        const startDateTime = `${selectedCita.fecha}T${selectedCita.hora_cita}:00-05:00`;
        const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000);
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

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>

        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={handlePrev} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, color: DN }}>◄</button>
          <button onClick={() => setCurrentDate(new Date())} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, color: DN, fontSize: 11 }}>Hoy</button>
          <button onClick={handleNext} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, color: DN }}>►</button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: DN, textTransform: 'capitalize' }}>
          {view === 'Mensual'
            ? currentDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' })
            : view === 'Semana' ? `Semana del ${getWeekDays()[0].getDate()} al ${getWeekDays()[5].getDate()}` : `Día: ${currentDate.toLocaleDateString()}`}
        </div>

        <select value={view} onChange={e => setView(e.target.value)} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, background: '#fff', outline: 'none' }}>
          <option value="Semana">Vista semanal</option>
          <option value="Día">Vista diaria</option>
          <option value="Mensual">Vista mensual</option>
        </select>

        {!googleToken && (
          <button onClick={() => login()} style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Sincronizar Google
          </button>
        )}

        <Button onClick={() => setShowModalCita(true)} style={{ padding: '6px 14px' }}>
          + Nueva cita
        </Button>
      </div>

      <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'grid', gridTemplateColumns: view === 'Mensual' ? 'repeat(7, 1fr)' : `50px repeat(${displayDays.length},1fr)`, borderBottom: `1px solid ${BD}`, background: LT }}>
          {view !== 'Mensual' && <div style={{ padding: 4 }} />}
          {(view === 'Mensual' ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] : displayDays).map((d, i) => {
            const label = view === 'Mensual' ? d : d.toLocaleDateString('es-ES', { weekday: 'short' }) + ' ' + d.getDate();
            const isToday = view !== 'Mensual' && d.toDateString() === new Date().toDateString();
            return (
              <div key={i} style={{ padding: '9px 6px', textAlign: 'center', background: isToday ? MT : LT, borderLeft: i > 0 ? `1px solid ${BD}` : 'none' }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? P : MU, textTransform: 'capitalize' }}>{label}</div>
                {isToday && <div style={{ fontSize: 8, color: P, fontWeight: 700, letterSpacing: .3 }}>HOY</div>}
              </div>
            )
          })}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {view === 'Mensual' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(100px, 1fr)' }}>
              {displayDays.map((d, i) => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const apts = allApts.filter(a => a.fecha === dateStr);
                const isCurrentMonth = d.getMonth() === currentDate.getMonth();

                return (
                  <div key={i} style={{ borderRight: `1px solid ${MT}`, borderBottom: `1px solid ${MT}`, padding: 4, background: isCurrentMonth ? '#fff' : '#f8fafc' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isCurrentMonth ? DN : MU, marginBottom: 4 }}>{d.getDate()}</div>
                    {apts.map((a, ai) => (
                      <div key={ai} onClick={() => { setSelectedCita(a); setShowEditModal(true); }}
                        style={{ background: a.col || P, color: '#fff', padding: '3px 5px', borderRadius: 4, fontSize: 9, marginBottom: 2, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <b>{a.hora_cita}</b> {a.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            hours.map(h => (
              <div key={h} style={{ display: 'grid', gridTemplateColumns: `50px repeat(${displayDays.length},1fr)`, borderBottom: `1px solid ${MT}`, minHeight: 46 }}>
                <div style={{ padding: '3px 6px', fontSize: 9, color: MU, textAlign: 'right', background: LT, borderRight: `1px solid ${BD}` }}>{h}</div>
                {displayDays.map((d, di) => {
                  const mapIndex = view === 'Semana' ? di : d.getUTCDay() - 1;
                  const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                  return (
                    <div key={di} style={{ borderLeft: `1px solid ${MT}`, padding: 2, minHeight: 46 }}>
                      {(weekApts[mapIndex] || []).filter(a => a.h === parseInt(h, 10) && a.fecha === targetDate).map((a, ai) => (
                        <div key={ai} onClick={() => { setSelectedCita(a); setShowEditModal(true); }} style={{ background: a.col, borderRadius: 5, padding: '5px 8px', cursor: 'pointer', marginBottom: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.p}</div>
                          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.9)' }}>{a.t}</div>
                          <div style={{ fontSize: 8, marginTop: 4, background: 'rgba(0,0,0,0.2)', display: 'inline-block', padding: '2px 4px', borderRadius: 4, color: '#fff' }}>⏰ {a.hora_cita}</div>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {showModalCita && <ModalNuevaCita onClose={() => setShowModalCita(false)} onSave={handleGuardarCita} listaPacientes={listaPacientes} modo="cita" />}

      {showEditModal && selectedCita && (
        <Modal cardStyle={{ padding: 25, width: 400 }}>
            <h3 style={{ marginTop: 0, color: P }}>
              {selectedCita.isGoogleOnly ? 'Editar Evento de Google' : `Editar Cita: ${selectedCita.name}`}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: MU }}>TRATAMIENTO / MOTIVO</label>
                <input
                  value={selectedCita.treatment || selectedCita.reason || ''}
                  onChange={e => setSelectedCita({ ...selectedCita, treatment: e.target.value, reason: e.target.value })}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${BD}`, marginTop: 4, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: MU }}>NUEVA FECHA</label>
                  <input
                    type="date"
                    value={selectedCita.fecha || ''}
                    onChange={e => setSelectedCita({ ...selectedCita, fecha: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${BD}`, marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: MU }}>NUEVA HORA</label>
                  <input
                    type="time"
                    value={selectedCita.hora_cita || ''}
                    onChange={e => setSelectedCita({ ...selectedCita, hora_cita: e.target.value })}
                    style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${BD}`, marginTop: 4, boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <Button
                variant="danger"
                onClick={handleDeleteCita}
                disabled={savingEdit}
                style={{ padding: '10px 15px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="trash" size={13} /> Eliminar
              </Button>

              <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={savingEdit} style={{ flex: 1, padding: 10, fontSize: 14 }}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit} style={{ flex: 1, padding: 10, fontSize: 14 }}>
                  {savingEdit ? 'Procesando...' : 'Actualizar'}
                </Button>
              </div>
            </div>
        </Modal>
      )}
    </div>
  );
}