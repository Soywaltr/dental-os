// src/utils/useSignedUrl.js
// Resuelve una ruta (o una URL pública antigua) del bucket a una URL firmada,
// vigente por una hora. Devuelve null mientras resuelve o si el archivo no
// existe, para que la vista muestre su estado vacío sin parpadear.
import { useState, useEffect } from 'react';
import { firmar } from './storage';

export default function useSignedUrl(rutaOUrl) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let vivo = true;
    const resolver = async () => {
      if (!rutaOUrl) { setUrl(null); return; }
      const firmada = await firmar(rutaOUrl);
      if (vivo) setUrl(firmada);
    };
    resolver();
    return () => { vivo = false; };
  }, [rutaOUrl]);

  return url;
}
