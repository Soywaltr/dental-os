// src/utils/toast.js
// Bus mínimo para reemplazar el alert() nativo del navegador (aparece pegado
// a la barra de URL, sin poder vestirlo con la marca) por un aviso propio,
// centrado y con el estilo de la app. notify() se puede llamar desde
// cualquier archivo -- componente o función suelta -- sin pasar por context
// ni prop-drilling; <ToastHost/> (montado una sola vez en main.jsx) es el
// único que escucha y dibuja el aviso.
const EVENTO = 'dental-os-toast';
let idSeq = 0;

export function notify(mensaje) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { id: ++idSeq, mensaje } }));
}

export function suscribirseAToasts(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(EVENTO, handler);
  return () => window.removeEventListener(EVENTO, handler);
}
