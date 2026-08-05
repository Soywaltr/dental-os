// src/utils/imagen.js
// Miniaturas generadas en el navegador antes de subir. Las fotos clínicas que
// salen de una cámara pesan 2-5 MB cada una, y las grillas de Ortodoncia las
// muestran en recuadros de 150-200 px: bajar la original completa para eso hace
// que la vista tarde en pintarse. Se sube la original (que es la que se abre al
// hacer click) más una miniatura liviana para las grillas.
//
// Todo es "mejor esfuerzo": si el navegador no puede decodificar el archivo
// (por ejemplo un HEIC de iPhone en un navegador que no lo soporta), devuelve
// null y quien llama sigue usando la original. Nunca bloquea una subida.

const MAX_LADO = 480;
const CALIDAD = 0.75;
// Por debajo de esto no vale la pena: el archivo ya es liviano.
const PESO_MINIMO_PARA_REDUCIR = 200_000;

export async function generarMiniatura(file, maxLado = MAX_LADO, calidad = CALIDAD) {
  if (!file?.type?.startsWith('image/')) return null;
  if (file.size <= PESO_MINIMO_PARA_REDUCIR) return null;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise(resolver => canvas.toBlob(resolver, 'image/jpeg', calidad));
    // Si la "miniatura" no salió más chica, no aporta nada.
    return blob && blob.size < file.size ? blob : null;
  } catch {
    return null;
  } finally {
    bitmap?.close?.();
  }
}

// Ruta de la miniatura a partir de la de la original: mismo nombre con `.thumb`
// antes de la extensión, así queda al lado del archivo original en el bucket.
export const rutaMiniatura = (ruta) => {
  const i = String(ruta || '').lastIndexOf('.');
  return i === -1 ? `${ruta}.thumb.jpg` : `${ruta.slice(0, i)}.thumb.jpg`;
};
