// src/components/vistas/WhatsApp.jsx
import React, { useState, useRef, useEffect } from 'react';
import { WA_MSGS, BD, P, WA, DN, MU, MT, LT } from '../../utils/constants';
import { ini } from '../../utils/helpers';

export default function WhatsApp() {
  const [chat, setChat] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgs, setMsgs] = useState(WA_MSGS);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat, msgs]);

  const send = async () => {
    if (!msg.trim() || !chat) return;
    const txt = msg; setMsg('');
    setMsgs(prev => prev.map(m => m.id === chat ? { ...m, thread: [...m.thread, { from: 'patient', txt, t: 'ahora' }] } : m));
    setLoading(true);
    try {
      const active = msgs.find(m => m.id === chat);
      const history = (active?.thread || []).map(t => ({ role: t.from === 'bot' ? 'assistant' : 'user', content: t.txt }));
      
      const res = await fetch('https://api.anthropic.com/v1/messages', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          model: 'claude-sonnet-4-20250514', 
          max_tokens: 1000, 
          system: `Eres Nanda, asistente dental de la Dra. Sol Vargas. Consultorio en Trujillo, Perú. WhatsApp: +51 915 054 145. Servicios: limpieza S/60, blanqueamiento S/180, ortodoncia desde S/1,800, implantes S/1,200, carillas S/350, coronas S/480, consulta S/30. Solo con cita previa. Horario: Lun-Sáb. Responde en español, de forma amable, concisa y profesional. Si preguntan por cita, ofrece disponibilidad. No menciones precios de otros consultorios.`, 
          messages: [...history, { role: 'user', content: txt }] 
        }) 
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Disculpa, ¿puedes repetir tu consulta?';
      setMsgs(prev => prev.map(m => m.id === chat ? { ...m, thread: [...m.thread, { from: 'bot', txt: reply, t: 'ahora' }] } : m));
    } catch {
      setMsgs(prev => prev.map(m => m.id === chat ? { ...m, thread: [...m.thread, { from: 'bot', txt: 'Disculpa, hubo un error. Escríbenos directamente al +51 915 054 145', t: 'ahora' }] } : m));
    } finally { setLoading(false); }
  };

  const activeChat = msgs.find(m => m.id === chat);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 220, borderRight: `1px solid ${BD}`, background: '#fff', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BD}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: DN, marginBottom: 8 }}>Conversaciones</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: WA }} />
            <span style={{ fontSize: 10, color: MU }}>Agente IA activo — +51 915 054 145</span>
          </div>
        </div>
        {msgs.map(m => (
          <div key={m.id} onClick={() => setChat(m.id)}
            style={{ display: 'flex', gap: 9, padding: '11px 14px', borderBottom: `1px solid ${MT}`, cursor: 'pointer', background: chat === m.id ? MT : 'transparent' }}
            onMouseEnter={e => chat !== m.id && (e.currentTarget.style.background = LT)}
            onMouseLeave={e => chat !== m.id && (e.currentTarget.style.background = 'transparent')}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: P, flexShrink: 0 }}>{ini(m.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: DN }}>{m.name}</span>
                <span style={{ fontSize: 9, color: MU }}>{m.time}</span>
              </div>
              <div style={{ fontSize: 10, color: MU, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.msg}</div>
            </div>
            {m.unread > 0 && <div style={{ width: 16, height: 16, borderRadius: '50%', background: WA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8.5, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.unread}</div>}
          </div>
        ))}
      </div>
      {!chat ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: LT }}>
          <div style={{ fontSize: 36, color: BD }}>◎</div>
          <div style={{ fontSize: 13, color: MU }}>Selecciona una conversación</div>
          <div style={{ background: WA, color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>Agente IA Nanda activo</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#fff', borderBottom: `1px solid ${BD}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: P }}>{ini(activeChat?.name || '')}</div>
            <div><div style={{ fontSize: 13, fontWeight: 700, color: DN }}>{activeChat?.name}</div><div style={{ fontSize: 10, color: WA, fontWeight: 600 }}>● en línea</div></div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#f0f2f5', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeChat?.thread.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: t.from === 'patient' ? 'flex-end' : 'flex-start' }}>
                {t.from === 'bot' && <div style={{ width: 24, height: 24, borderRadius: '50%', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0, marginRight: 6, alignSelf: 'flex-end' }}>IA</div>}
                <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: t.from === 'patient' ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: t.from === 'patient' ? P : '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
                  <div style={{ fontSize: 12, color: t.from === 'patient' ? '#fff' : DN, lineHeight: 1.5 }}>{t.txt}</div>
                  <div style={{ fontSize: 9, color: t.from === 'patient' ? 'rgba(255,255,255,.7)' : MU, marginTop: 3, textAlign: 'right' }}>{t.t}</div>
                </div>
              </div>
            ))}
            {loading && <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#fff', borderRadius: '12px 12px 12px 2px', width: 'fit-content', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: MU, animation: `bounce ${.6 + i * .1}s infinite alternate` }} />)}
            </div>}
            <div ref={endRef} />
          </div>
          <div style={{ background: '#fff', borderTop: `1px solid ${BD}`, padding: '10px 14px', display: 'flex', gap: 8, flexShrink: 0 }}>
            <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Escribir mensaje..." onKeyDown={e => e.key === 'Enter' && send()}
              style={{ flex: 1, padding: '8px 12px', border: `1px solid ${BD}`, borderRadius: 20, fontSize: 12, outline: 'none', color: DN }} />
            <button onClick={send} disabled={loading} style={{ background: loading ? MU : WA, color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}