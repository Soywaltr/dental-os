// src/components/ui/ToastHost.jsx
// Reemplazo con marca del alert() nativo -- mismo Modal (portal + overlay
// oscuro + tarjeta glass) que ya usa el resto de la app, en vez del cuadro
// del navegador pegado a la barra de URL. Se monta una sola vez en
// main.jsx; cada llamada a notify() (utils/toast.js) hace cola acá.
import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { suscribirseAToasts } from '../../utils/toast';
import { DN, RJ, P, GRAD_PRIMARY, GRAD_PRIMARY_SHADOW } from '../../utils/constants';

// Sin tipo explícito en cada uno de los ~85 sitios que llamaban alert():
// alcanza con mirar si el propio mensaje dice "Error" para pintarlo en rojo,
// que es exactamente el mismo texto que ya distinguía un error de un aviso
// normal cuando era un alert() plano.
const esError = (mensaje) => /error/i.test(mensaje || '');

export default function ToastHost() {
  const [cola, setCola] = useState([]);
  const botonRef = useRef(null);

  useEffect(() => suscribirseAToasts((t) => setCola((q) => [...q, t])), []);

  const actual = cola[0];
  // Foco en el botón cada vez que entra un aviso nuevo -- un alert() nativo
  // también se llevaba el foco de teclado, así que Enter/Espacio lo cierran
  // igual que antes.
  useEffect(() => { if (actual) botonRef.current?.focus(); }, [actual]);

  if (!actual) return null;
  const error = esError(actual.mensaje);
  const cerrar = () => setCola((q) => q.slice(1));

  return (
    <Modal cardStyle={{ padding: 28, width: 380, maxWidth: 'calc(100vw - 32px)', textAlign: 'center', boxSizing: 'border-box' }} zIndex={2000}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in srgb, ${error ? RJ : P} 14%, transparent)`,
        color: error ? RJ : P,
      }}>
        <Icon name={error ? 'warning' : 'checkCircle'} size={22} />
      </div>
      <p style={{ margin: '0 0 20px', fontSize: 14.5, color: DN, lineHeight: 1.5 }}>{actual.mensaje}</p>
      <button ref={botonRef} onClick={cerrar} className="u-focusable" style={{
        width: '100%', padding: '11px', minHeight: 44, fontSize: 14, fontWeight: 600,
        border: 'none', borderRadius: '10px', cursor: 'pointer',
        background: GRAD_PRIMARY, color: '#FFFFFF', boxShadow: GRAD_PRIMARY_SHADOW,
      }}>
        Aceptar
      </button>
    </Modal>
  );
}
