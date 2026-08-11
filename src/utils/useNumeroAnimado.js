// src/utils/useNumeroAnimado.js
// Anima una cifra de un valor a otro con requestAnimationFrame (ease-out
// cúbico), en vez de saltar directo al nuevo número. Sirve para que las
// tarjetas de KPI del Dashboard se sientan "vivas" cuando los datos cambian
// (por ejemplo, tras la auto-actualización periódica) en vez de parpadear.
import { useEffect, useRef, useState } from 'react';

export default function useNumeroAnimado(valorObjetivo, duracionMs = 600) {
  const [mostrado, setMostrado] = useState(valorObjetivo);
  const anteriorRef = useRef(valorObjetivo);

  useEffect(() => {
    const inicio = anteriorRef.current;
    const fin = valorObjetivo;
    if (!Number.isFinite(inicio) || !Number.isFinite(fin) || inicio === fin) {
      // Nada que animar: en el montaje `mostrado` ya arrancó en `fin` (viene
      // del useState de arriba), así que llamar setState aquí sería
      // redundante y además dispara la regla "no setState síncrono en un
      // efecto". Sólo se actualiza la referencia para la próxima comparación.
      anteriorRef.current = fin;
      return;
    }

    let vivo = true;
    let inicioMs = null;
    const paso = (marca) => {
      if (!vivo) return;
      if (inicioMs === null) inicioMs = marca;
      const p = Math.min(1, (marca - inicioMs) / duracionMs);
      const suavizado = 1 - Math.pow(1 - p, 3);
      setMostrado(inicio + (fin - inicio) * suavizado);
      if (p < 1) requestAnimationFrame(paso);
      else anteriorRef.current = fin;
    };
    const raf = requestAnimationFrame(paso);
    return () => { vivo = false; cancelAnimationFrame(raf); };
  }, [valorObjetivo, duracionMs]);

  return mostrado;
}
