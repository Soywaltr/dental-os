// src/utils/backdrop.js
// Fondo decorativo compartido (glassmorphism): textura odontológica difuminada.
// Placeholder generado en SVG — se puede reemplazar más adelante por una foto
// real del consultorio cambiando solo este archivo, sin tocar App.jsx ni Login.jsx.
const DENTAL_TOOTH_PATH = "M12 2C7 2 4 5 4 9c0 3 1 5 1 8 0 2 1 4 3 4s2-3 2-5 1-2 2-2 2 0 2 2 0 5 2 5 3-2 3-4c0-3 1-5 1-8 0-4-3-7-8-7z";

const BACKDROP_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f2f3f2"/>
      <stop offset="45%" stop-color="#e1e4e1"/>
      <stop offset="100%" stop-color="#c4cac6"/>
    </linearGradient>
    <radialGradient id="g2" cx="25%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#e8ece6" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#e8ece6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g3" cx="80%" cy="75%" r="55%">
      <stop offset="0%" stop-color="#b7c1bb" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#b7c1bb" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#g)"/>
  <rect width="1600" height="1000" fill="url(#g2)"/>
  <rect width="1600" height="1000" fill="url(#g3)"/>
  <g fill="#8a908c" opacity="0.12">
    <path transform="translate(140,120) scale(3.4) rotate(-14)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(1120,80) scale(4.6) rotate(20)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(760,560) scale(6.2) rotate(-6)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(1280,620) scale(3.2) rotate(28)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(60,700) scale(3.8) rotate(10)" d="${DENTAL_TOOTH_PATH}"/>
  </g>
</svg>
`);

export const BACKDROP_IMAGE_URL = `url("data:image/svg+xml,${BACKDROP_SVG}")`;
