// src/utils/useTema.js
// Modo claro/oscuro con control manual, no sólo la preferencia del sistema.
//
// El tema efectivo se estampa como data-theme en <html>. Quien lo hace PRIMERO
// es un script inline en index.html, antes del primer pintado (si no, habría un
// destello del tema equivocado). Este hook sólo lee ese estado ya resuelto y lo
// cambia cuando el usuario elige.
//
// Tres estados posibles, aunque la UI muestre dos botones:
//   · 'light' / 'dark' → elección explícita, guardada en localStorage.
//   · sin nada guardado → se sigue la preferencia del sistema, y cambia con ella
//     en vivo (si el usuario cambia el tema de su SO, la app lo acompaña).
// En cuanto elige uno de los dos botones, deja de seguir al sistema. `reiniciar`
// borra la elección y vuelve a seguirlo.
import { useCallback, useEffect, useState } from 'react';

const CLAVE = 'dentalOS_tema';

const leerGuardado = () => {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null; // modo privado: no se puede persistir, se sigue al sistema
  }
};

const sistemaPrefiereOscuro = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const aplicar = (tema) => {
  document.documentElement.setAttribute('data-theme', tema);
};

export default function useTema() {
  // Se inicializa desde el atributo que ya dejó el script de index.html, no
  // recalculando: así el estado de React y el DOM arrancan de acuerdo.
  const [tema, setTema] = useState(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  );
  const [explicito, setExplicito] = useState(() => leerGuardado() !== null);

  // Mientras no haya elección explícita, la app acompaña al sistema en vivo.
  useEffect(() => {
    if (explicito) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const alCambiar = (e) => {
      const nuevo = e.matches ? 'dark' : 'light';
      aplicar(nuevo);
      setTema(nuevo);
    };
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, [explicito]);

  const elegir = useCallback((nuevo) => {
    aplicar(nuevo);
    setTema(nuevo);
    setExplicito(true);
    try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin persistencia */ }
  }, []);

  // Vuelve a seguir la preferencia del sistema.
  const reiniciar = useCallback(() => {
    try { localStorage.removeItem(CLAVE); } catch { /* nada que borrar */ }
    const nuevo = sistemaPrefiereOscuro() ? 'dark' : 'light';
    aplicar(nuevo);
    setTema(nuevo);
    setExplicito(false);
  }, []);

  return { tema, explicito, elegir, reiniciar };
}
