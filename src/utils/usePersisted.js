// src/utils/usePersisted.js
// useState que sobrevive un F5: mismo patrón que ya se usó en Agenda.jsx
// para currentDate/view, generalizado para no repetirlo a mano en cada
// vista. Guarda en localStorage bajo `key` y se restaura al montar --
// "dónde me quedé" (pestaña activa, modo del odontograma, etc.), no datos
// clínicos (esos ya viven en Supabase).
import { useState, useEffect } from 'react';

export default function usePersisted(key, valorInicial) {
  const [valor, setValor] = useState(() => {
    try {
      const guardado = localStorage.getItem(key);
      return guardado !== null ? JSON.parse(guardado) : valorInicial;
    } catch {
      return valorInicial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(valor)); } catch { /* localStorage lleno o deshabilitado: no es crítico */ }
  }, [key, valor]);

  return [valor, setValor];
}
