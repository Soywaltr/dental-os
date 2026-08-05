// src/utils/storage.js
// Rutas del bucket `imagenes`, siempre con el UUID de la clínica como primer
// segmento. Eso cumple dos cosas a la vez:
//
//  1. Aislamiento entre clínicas: la política de Storage exige que ese primer
//     segmento sea una clínica a la que pertenece el usuario, así que nadie
//     puede escribir ni borrar en la carpeta de otro consultorio.
//  2. Rutas no adivinables: antes la firma vivía en `firma-doctor.png`, un
//     nombre fijo que cualquiera podía pedir por URL. Con el UUID delante
//     (122 bits) la ruta deja de ser deducible.
//
// El UUID no es un secreto en sí, pero solo se expone a los miembros de la
// clínica: la tabla `clinicas` está protegida por RLS.
import { supabase } from '../supabase';

export const BUCKET = 'imagenes';

export const rutaPerfil = (clinicaId) => `${clinicaId}/perfil.png`;
export const rutaFirma  = (clinicaId) => `${clinicaId}/firma.png`;
export const rutaLogo   = (clinicaId) => `${clinicaId}/logo.png`;

const extensionDe = (nombreArchivo, porDefecto = 'jpg') =>
  (nombreArchivo?.split('.').pop() || porDefecto).toLowerCase().replace(/[^a-z0-9]/g, '');

export const rutaImagenPaciente = (clinicaId, pacienteId, nombreArchivo) =>
  `${clinicaId}/pacientes/${pacienteId}-${Date.now()}.${extensionDe(nombreArchivo)}`;

export const rutaFotoOrto = (clinicaId, pacienteId, nombreArchivo) =>
  `${clinicaId}/ortodoncia/${pacienteId}-${Date.now()}.${extensionDe(nombreArchivo)}`;

// Deriva la ruta dentro del bucket a partir de una URL pública guardada.
// Hace falta para borrar: antes se usaba `url.split('/').pop()`, que devuelve
// solo el último segmento — con rutas anidadas el borrado fallaba en silencio y
// el archivo quedaba huérfano en el bucket. El fallback cubre los archivos
// antiguos, que viven en la raíz del bucket.
export const rutaDesdeUrl = (url) => {
  const texto = String(url || '');
  if (!texto) return '';
  const marca = `/object/public/${BUCKET}/`;
  const i = texto.indexOf(marca);
  // Ya es una ruta (lo que guardan los registros nuevos), no una URL.
  if (i === -1 && !texto.startsWith('http')) return texto.split('?')[0];
  if (i === -1) return texto.split('/').pop().split('?')[0];
  return decodeURIComponent(texto.slice(i + marca.length).split('?')[0]);
};

// ─── URLs FIRMADAS ───────────────────────────────────────────────────────────
// El bucket es privado: las URLs públicas no pasan por RLS, así que cualquiera
// con la ruta descargaba el archivo. Con URLs firmadas cada acceso exige una
// firma temporal que solo se emite si el RLS del usuario lo permite.
//
// Acepta tanto una ruta como una URL pública antigua: los registros existentes
// guardan URLs completas, y de ahí se deriva la ruta. Así no hace falta migrar
// los datos ya guardados en historias.imagenes ni en ortodoncia.fotografias.
const VIGENCIA_SEGUNDOS = 3600;
const MARGEN_MS = 60_000;
const cacheFirmas = new Map(); // ruta -> { url, expiraEn }

export async function firmar(rutaOUrl, segundos = VIGENCIA_SEGUNDOS) {
  const ruta = rutaDesdeUrl(rutaOUrl);
  if (!ruta) return null;

  const enCache = cacheFirmas.get(ruta);
  if (enCache && enCache.expiraEn - MARGEN_MS > Date.now()) return enCache.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, segundos);
  // Un error aquí normalmente significa que el archivo no existe (por ejemplo,
  // una clínica que todavía no subió su firma). Se devuelve null y la vista
  // muestra su estado vacío.
  if (error || !data?.signedUrl) return null;

  cacheFirmas.set(ruta, { url: data.signedUrl, expiraEn: Date.now() + segundos * 1000 });
  return data.signedUrl;
}

// Firma muchas rutas de una sola vez. Las vistas de Ortodoncia muestran hasta
// ~20 fotos juntas: pedir una firma por foto son ~20 viajes de ida y vuelta y la
// grilla no se pinta hasta que termina el más lento. `createSignedUrls` resuelve
// todas en una sola petición.
//
// Devuelve un Map ruta -> URL firmada. Las rutas que fallen (archivo borrado,
// por ejemplo) simplemente no aparecen en el Map, igual que `firmar` devuelve
// null: quien llama muestra su estado vacío.
export async function firmarVarias(rutasOUrls, segundos = VIGENCIA_SEGUNDOS) {
  const rutas = [...new Set((rutasOUrls || []).map(rutaDesdeUrl).filter(Boolean))];
  const resultado = new Map();
  const faltantes = [];

  for (const ruta of rutas) {
    const enCache = cacheFirmas.get(ruta);
    if (enCache && enCache.expiraEn - MARGEN_MS > Date.now()) resultado.set(ruta, enCache.url);
    else faltantes.push(ruta);
  }
  if (faltantes.length === 0) return resultado;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(faltantes, segundos);
  if (error || !data) return resultado;

  const expiraEn = Date.now() + segundos * 1000;
  for (const fila of data) {
    if (!fila?.signedUrl || fila.error || !fila.path) continue;
    cacheFirmas.set(fila.path, { url: fila.signedUrl, expiraEn });
    resultado.set(fila.path, fila.signedUrl);
  }
  return resultado;
}

// Se llama tras subir o reemplazar un archivo: si no, la firma vieja seguiría
// sirviendo la versión anterior desde la caché.
export function invalidarFirma(rutaOUrl) {
  const ruta = rutaDesdeUrl(rutaOUrl);
  if (ruta) cacheFirmas.delete(ruta);
}
