// src/components/vistas/AsistenteDatos.jsx
// Reemplaza el placeholder "Muy pronto" que tenía WhatsApp.jsx. Es un chat
// para EL DOCTOR/ADMIN (no para pacientes): pregunta en lenguaje natural
// sobre la propia clínica (finanzas, pacientes, citas y laboratorio) y la
// Edge Function `asistente-datos` responde consultando la base real, con el
// mismo RLS de aislamiento por clínica que el resto de la app. Cada
// conversación se guarda en `asistente_conversaciones` (aislada por usuario,
// no solo por clínica: es un asistente personal) para poder retomarla luego.
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

const TITULO_MAX = 42;
const tituloDesde = (texto) => (texto.length > TITULO_MAX ? texto.slice(0, TITULO_MAX - 1).trimEnd() + '…' : texto);

const fechaRelativa = (iso) => {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'Hoy';
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
};

// Formato minimo y seguro (sin dangerouslySetInnerHTML): negritas **texto** y
// listas "- item", que es todo lo que el asistente usa en sus respuestas.
const conNegritas = (linea, keyPrefix) =>
  linea.split(/\*\*(.+?)\*\*/g).map((parte, i) => (
    i % 2 === 1 ? <strong key={`${keyPrefix}-${i}`}>{parte}</strong> : <React.Fragment key={`${keyPrefix}-${i}`}>{parte}</React.Fragment>
  ));

function renderMensaje(texto) {
  const bloques = [];
  let listaActual = [];
  const cerrarLista = () => {
    if (listaActual.length) {
      bloques.push(<ul key={`ul-${bloques.length}`} style={{ margin: '2px 0 6px', paddingLeft: 18 }}>{listaActual}</ul>);
      listaActual = [];
    }
  };
  texto.split('\n').forEach((linea, i) => {
    const matchItem = linea.match(/^\s*[-*]\s+(.*)$/);
    if (matchItem) {
      listaActual.push(<li key={`li-${i}`} style={{ marginBottom: 2 }}>{conNegritas(matchItem[1], `li-${i}`)}</li>);
      return;
    }
    cerrarLista();
    if (linea.trim() === '') bloques.push(<div key={`br-${i}`} style={{ height: 6 }} />);
    else bloques.push(<div key={`p-${i}`}>{conNegritas(linea, `p-${i}`)}</div>);
  });
  cerrarLista();
  return bloques;
}

export default function AsistenteDatos({ clinicaId }) {
  const [conversaciones, setConversaciones] = useState([]);
  const [conversacionActivaId, setConversacionActivaId] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const finRef = useRef(null);
  const userIdRef = useRef(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [historial, enviando]);

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!vivo) return;
      userIdRef.current = userData?.user?.id ?? null;

      const { data, error: err } = await supabase
        .from('asistente_conversaciones')
        .select('id, titulo, mensajes, updated_at')
        .order('updated_at', { ascending: false })
        .limit(30);
      if (vivo && !err) setConversaciones(data || []);
    };
    cargar();
    return () => { vivo = false; };
  }, []);

  const abrirConversacion = (conv) => {
    setConversacionActivaId(conv.id);
    setHistorial(conv.mensajes || []);
    setError('');
  };

  const nuevaConversacion = () => {
    setConversacionActivaId(null);
    setHistorial([]);
    setError('');
  };

  const eliminarConversacion = async (id, e) => {
    e.stopPropagation();
    const { error: err } = await supabase.from('asistente_conversaciones').delete().eq('id', id);
    if (err) return;
    setConversaciones((prev) => prev.filter((c) => c.id !== id));
    if (id === conversacionActivaId) nuevaConversacion();
  };

  // Guarda (inserta o actualiza) la conversacion despues de cada intercambio.
  // No bloquea la respuesta al usuario si falla -- el historial en pantalla
  // ya se actualizo, solo se pierde el guardado para retomarla despues.
  const guardarConversacion = async (mensajes) => {
    if (!clinicaId || !userIdRef.current) return;
    if (conversacionActivaId) {
      await supabase.from('asistente_conversaciones')
        .update({ mensajes, updated_at: new Date().toISOString() })
        .eq('id', conversacionActivaId);
      setConversaciones((prev) => {
        const resto = prev.filter((c) => c.id !== conversacionActivaId);
        const actual = prev.find((c) => c.id === conversacionActivaId);
        return [{ ...actual, mensajes, updated_at: new Date().toISOString() }, ...resto];
      });
    } else {
      const primerMensaje = mensajes.find((m) => m.from === 'user')?.txt || 'Nueva conversación';
      const { data, error: err } = await supabase.from('asistente_conversaciones')
        .insert({ clinica_id: clinicaId, user_id: userIdRef.current, titulo: tituloDesde(primerMensaje), mensajes })
        .select('id, titulo, mensajes, updated_at')
        .single();
      if (!err && data) {
        setConversacionActivaId(data.id);
        setConversaciones((prev) => [data, ...prev]);
      }
    }
  };

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
      let mensajeError = data?.error || err?.message || 'No se pudo obtener respuesta.';
      if (err?.context) {
        try { mensajeError = (await err.context.json())?.error || mensajeError; } catch { /* cuerpo no era JSON */ }
      }
      setError(mensajeError);
      return;
    }
    const historialFinal = [...nuevoHistorial, { from: 'bot', txt: data.reply }];
    setHistorial(historialFinal);
    guardarConversacion(historialFinal);
  };

  const onSubmit = (e) => { e.preventDefault(); enviar(); };

  return (
    <div style={{ padding: 18, display: 'flex', gap: 14, flex: 1, minHeight: 0 }}>
      <div style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
        background: GLASS_BG, border: GLASS_BORDER, borderRadius: 12,
        backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
        padding: 12, overflow: 'hidden',
      }}>
        <Button onClick={nuevaConversacion} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, padding: '8px 10px' }}>
          <Icon name="plus" size={14} /> Nueva conversación
        </Button>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: MU, textTransform: 'uppercase', letterSpacing: 0.4, padding: '2px 2px 0' }}>
          Historial
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {conversaciones.length === 0 && (
            <div style={{ fontSize: 11.5, color: MU, padding: '6px 2px' }}>Todavía no hay conversaciones guardadas.</div>
          )}
          {conversaciones.map((conv) => (
            <div
              key={conv.id}
              onClick={() => abrirConversacion(conv)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', borderRadius: 8, cursor: 'pointer',
                background: conv.id === conversacionActivaId ? '#ede9fe' : 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11.5, fontWeight: 600, color: conv.id === conversacionActivaId ? '#7c3aed' : DN,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {conv.titulo}
                </div>
                <div style={{ fontSize: 10, color: MU }}>{fechaRelativa(conv.updated_at)}</div>
              </div>
              <button
                onClick={(e) => eliminarConversacion(conv.id, e)}
                title="Eliminar conversación"
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: MU, padding: 2, flexShrink: 0 }}
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

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
                fontSize: 12.5, lineHeight: 1.5,
              }}>
                {h.from === 'bot' ? renderMensaje(h.txt) : h.txt}
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
