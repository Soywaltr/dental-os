// src/components/vistas/AsistenteDatos.jsx
// Reemplaza el placeholder "Muy pronto" que tenía WhatsApp.jsx. Es un chat
// para EL DOCTOR/ADMIN (no para pacientes): pregunta en lenguaje natural
// sobre la propia clínica (finanzas, pacientes, citas, laboratorio) y la
// Edge Function `asistente-datos` responde consultando la base real, con el
// mismo RLS de aislamiento por clínica que el resto de la app.
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabase';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { P, DN, MU, BD, RJ, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';

const SUGERENCIAS = [
  '¿Cuánto facturé este mes?',
  '¿Qué pacientes tienen saldo pendiente?',
  '¿Qué citas tengo esta semana?',
  '¿Cómo van las órdenes de laboratorio?',
];

export default function AsistenteDatos() {
  const [historial, setHistorial] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const finRef = useRef(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [historial, enviando]);

  const enviar = async (mensaje) => {
    const texto_ = (mensaje ?? texto).trim();
    if (!texto_ || enviando) return;
    setError('');
    setTexto('');
    const nuevoHistorial = [...historial, { from: 'user', txt: texto_ }];
    setHistorial(nuevoHistorial);
    setEnviando(true);

    const { data, error: err } = await supabase.functions.invoke('asistente-datos', {
      body: { history: historial, message: texto_ },
    });
    setEnviando(false);

    if (err || data?.error) {
      // supabase-js solo da un mensaje generico en `err.message` para
      // respuestas no-2xx; el cuerpo real (con el motivo especifico) viaja
      // en `err.context`, una Response que hay que leer aparte.
      let mensaje = data?.error || err?.message || 'No se pudo obtener respuesta.';
      if (err?.context) {
        try { mensaje = (await err.context.json())?.error || mensaje; } catch { /* cuerpo no era JSON */ }
      }
      setError(mensaje);
      return;
    }
    setHistorial([...nuevoHistorial, { from: 'bot', txt: data.reply }]);
  };

  const onSubmit = (e) => { e.preventDefault(); enviar(); };

  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{
        background: GLASS_BG, border: GLASS_BORDER, borderRadius: 12,
        backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
        flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="chat" size={17} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: DN }}>Asistente de datos</div>
            <div style={{ fontSize: 10.5, color: MU }}>Pregúntale sobre tu clínica — finanzas, pacientes, citas y laboratorio.</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {historial.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 380 }}>
              <p style={{ fontSize: 12, color: MU, marginBottom: 14 }}>Probá con alguna de estas:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SUGERENCIAS.map(s => (
                  <button key={s} onClick={() => enviar(s)} style={{
                    textAlign: 'left', padding: '9px 12px', borderRadius: 9,
                    border: `1px solid ${BD}`, background: '#fff', color: DN,
                    fontSize: 12, cursor: 'pointer',
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {historial.map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: h.from === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '9px 13px', borderRadius: 12,
                background: h.from === 'user' ? P : '#fff',
                color: h.from === 'user' ? '#fff' : DN,
                border: h.from === 'user' ? 'none' : `1px solid ${BD}`,
                fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {h.txt}
              </div>
            </div>
          ))}

          {enviando && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '9px 13px', borderRadius: 12, background: '#fff', border: `1px solid ${BD}`, color: MU, fontSize: 12.5 }}>
                Pensando…
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', borderLeft: `3px solid ${RJ}`, borderRadius: 6, color: '#b91c1c', fontSize: 11.5 }}>
              {error}
            </div>
          )}
          <div ref={finRef} />
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, padding: 14, borderTop: `1px solid ${BD}` }}>
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta…"
            disabled={enviando}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${BD}`, fontSize: 13, outline: 'none', color: DN }}
          />
          <Button type="submit" disabled={enviando || !texto.trim()} style={{ padding: '10px 20px', fontSize: 13 }}>
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
}
