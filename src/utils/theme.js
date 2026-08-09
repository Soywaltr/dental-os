// src/utils/theme.js
// White-label: cada clínica puede fijar su propio color de acento
// (clinicas.accent_color). Este archivo tiene las dos piezas que CSS no puede
// resolver solo:
//
//   1. contrasteTexto(hex) — qué texto (blanco o casi-negro) es legible SOBRE
//      un acento arbitrario. La relación de contraste no es lineal con el
//      color, así que color-mix() no puede decidir esto por sí solo (ver el
//      comentario de --accent-contrast en tokens.css).
//   2. aplicarTema(clinica) — fija --accent y --accent-contrast en
//      document.documentElement. Todo lo demás (--accent-hover/-press/-soft/
//      -ring) son fórmulas de color-mix() sobre --accent en tokens.css: se
//      recalculan solas, no hay que tocarlas desde JS.
//
// Si `clinica.accent_color` es null/vacío, no se toca nada: la hoja de estilos
// ya tiene el tema por defecto ("Dra. Sol Vargas", violeta) en :root.

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

// Aplica el tema de una clínica sobre :root. Sin clínica o sin accent_color,
// no hace nada -- se queda el default de tokens.css.
export function aplicarTema(clinica) {
  const acento = clinica?.accent_color;
  const root = document.documentElement.style;
  if (!acento) {
    // Vuelve al tema por defecto si antes había uno custom aplicado (ej. al
    // cambiar de clínica en la misma pestaña, caso multi-cuenta futuro).
    root.removeProperty('--accent');
    root.removeProperty('--accent-contrast');
    return;
  }
  root.setProperty('--accent', acento);
  root.setProperty('--accent-contrast', contrasteTexto(acento));
}
