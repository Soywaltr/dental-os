// src/utils/theme.js
// contrasteTexto(hex) — qué texto (blanco o casi-negro) es legible SOBRE un
// acento arbitrario. La relación de contraste no es lineal con el color, así
// que no se puede decidir con una fórmula fija.
//
// Nota: el acento por clínica (clinicas.accent_color) ya no se aplica en
// runtime -- los colores de la app pasaron a ser literales (hex/rgba) fijos
// en cada componente, no variables CSS, así que no hay ":root" sobre el cual
// sobreescribir --accent. El selector de "Apariencia" en Config.jsx sigue
// guardando accent_color en Supabase, pero hoy no cambia nada visualmente.

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
};

// Luminancia relativa WCAG (misma fórmula que scripts/validate_palette.js del
// skill dataviz y la que se usó para verificar todos los tokens de este archivo).
const luminancia = ([r, g, b]) => {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const contraste = (rgbA, rgbB) => {
  const [l1, l2] = [luminancia(rgbA), luminancia(rgbB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Devuelve blanco o casi-negro: el que tenga MÁS contraste contra `hexAcento`.
// Casi-negro (#141414) en vez de negro puro: es el mismo valor que ya usa el
// tema por defecto en modo oscuro, para que un acento oscuro no golpee con un
// negro más "duro" que el resto de la tinta de la app.
export function contrasteTexto(hexAcento) {
  if (!hexAcento) return '#FFFFFF';
  try {
    const rgbAcento = hexToRgb(hexAcento);
    const blanco = contraste(rgbAcento, [1, 1, 1]);
    const negro = contraste(rgbAcento, [0x14 / 255, 0x14 / 255, 0x14 / 255]);
    return blanco >= negro ? '#FFFFFF' : '#141414';
  } catch {
    return '#FFFFFF'; // hex inválido: no romper el render por un dato corrupto
  }
}
