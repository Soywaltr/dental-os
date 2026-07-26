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
  const marca = `/object/public/${BUCKET}/`;
  const i = texto.indexOf(marca);
  if (i === -1) return texto.split('/').pop().split('?')[0];
  return decodeURIComponent(texto.slice(i + marca.length).split('?')[0]);
};
