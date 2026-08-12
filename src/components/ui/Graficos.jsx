// src/components/ui/Graficos.jsx
// Primitivas de gráfico en SVG inline, sin librerías: la app ya pesa lo que pesa
// y estos dos gráficos no justifican sumar Recharts/D3 al bundle.
//
// Reglas de marca que respetan (las mismas en toda la app):
//  · línea de 2px con uniones redondeadas; marcador del extremo de r=4 (8px) con
//    anillo de 2px en el color de la superficie, para que se lea al cruzarse.
//  · rejilla de 1px sólida, un paso por encima del fondo, siempre recesiva.
//  · el texto nunca lleva el color de la serie: la identidad la da la marca de
//    color al lado (punto de leyenda), no el color de la letra.
//  · el eje Y cae en números limpios, no en el máximo crudo de los datos.
import React, { useRef, useState } from 'react';

// Techo del eje Y tal que CADA marca caiga en un número limpio, no sólo el
// techo: se redondea el valor por marca (max/divisiones) y después se multiplica.
// Si sólo se redondeara el techo, un máximo de 1.500 daría marcas en 375 y 1.125.
// Sin exportar: este archivo sólo exporta componentes, para no romper el
// fast-refresh de Vite.
const maximoLimpio = (v, divisiones = 4) => {
  if (!v || v <= 0) return 100;
  const porMarca = v / divisiones;
  const mag = Math.pow(10, Math.floor(Math.log10(porMarca)));
  const paso = ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => porMarca <= s * mag) ?? 10) * mag;
  return paso * divisiones;
};

// "2k" para 2.000 pero "1,5k" para 1.500: redondear a "2k" un tick de 1.500
// etiquetaría mal el eje.
const formatoTick = (t) => {
  if (t < 1000) return String(Math.round(t));
  const miles = t / 1000;
  return `${miles.toLocaleString('es-PE', { maximumFractionDigits: 1 })}k`;
};

// Mini-tendencia para las tarjetas de KPI: la línea va en el gris de
// de-énfasis y sólo el punto del periodo actual lleva el color de acento.
export function Sparkline({ valores, color, colorTenue = 'var(--hairline-strong)', ancho = 92, alto = 28 }) {
  if (!valores || valores.length < 2) return null;
  const max = Math.max(...valores);
  const min = Math.min(...valores, 0);
  const rango = (max - min) || 1;
  const paso = ancho / (valores.length - 1);
  const yDe = (v) => (alto - 3) - ((v - min) / rango) * (alto - 6);
  const puntos = valores.map((v, i) => [i * paso, yDe(v)]);
  const d = puntos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [ux, uy] = puntos[puntos.length - 1];
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} fill="none" stroke={colorTenue} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ux} cy={uy} r="4" fill={color} stroke="var(--panel)" strokeWidth="2" />
    </svg>
  );
}

// Anillo de progreso (medidor). La pista sin llenar va en un paso claro del
// MISMO color del relleno, no en gris neutro: así el estado se lee a lo largo de
// todo el anillo y no sólo en el tramo lleno.
export function Anillo({ pct, color, tamano = 92, grosor = 9, children }) {
  const valor = Math.max(0, Math.min(100, pct || 0));
  const r = (tamano - grosor) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: tamano, height: tamano, flexShrink: 0 }}>
      <svg width={tamano} height={tamano} style={{ transform: 'rotate(-90deg)', display: 'block' }} aria-hidden="true">
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={`color-mix(in srgb, ${color} 18%, transparent)`} strokeWidth={grosor} />
        <circle
          cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={color} strokeWidth={grosor}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - valor / 100)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

const VB_W = 720;
const PAD = { l: 54, r: 18, t: 14, b: 26 };

// Gráfico de líneas multi-serie con cruceta y tooltip. `series` es
// [{ nombre, color, valores }] -- todas las series comparten el MISMO eje: dos
// escalas distintas en un gráfico es la forma más fácil de mentir con datos.
// `mostrarCadaN` esparce las etiquetas del eje X (mostrar 1 de cada N) sin
// alterar `etiquetas` -- el tooltip de la cruceta sigue usando la etiqueta
// completa de cada punto, sólo el eje se aligera cuando hay muchos puntos
// (ej. una serie diaria de 30 días no cabe legible con las 30 escritas).
export function GraficoLineas({ series, etiquetas, formato = String, alto = 236, mostrarCadaN = 1, colorTexto = 'var(--text-tertiary)', colorRejilla = 'var(--hairline)', colorSuperficie = 'var(--panel)', resaltarPico = false, colorPico = 'var(--green)', colorPicoInk = '#FFFFFF' }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(null);

  const n = etiquetas.length;
  const plotW = VB_W - PAD.l - PAD.r;
  const plotH = alto - PAD.t - PAD.b;
  const baseY = alto - PAD.b;

  const maxCrudo = Math.max(...series.flatMap(s => s.valores), 0);
  const maxY = maximoLimpio(maxCrudo);
  const x = (i) => PAD.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => baseY - (v / maxY) * plotH;

  // Pico de la serie principal: marca persistente (no sólo al pasar el
  // mouse) en colorPico -- el color es un prop, no un token fijo, porque
  // cada referencia visual que pidió esto (verde, lima, etc.) traía el suyo.
  // Sólo tiene sentido con >0 en la serie -- un pico de 0 no es "un pico",
  // es que no hay datos todavía.
  const picoIdx = resaltarPico && series[0]
    ? series[0].valores.reduce((mejor, v, i) => (v > series[0].valores[mejor] ? i : mejor), 0)
    : null;
  const picoValor = picoIdx !== null ? series[0].valores[picoIdx] : 0;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * maxY);

  const alMover = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const xVb = ((e.clientX - rect.left) / rect.width) * VB_W;
    const i = Math.round(((xVb - PAD.l) / plotW) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={ref} viewBox={`0 0 ${VB_W} ${alto}`} width="100%" height={alto}
        onMouseMove={alMover} onMouseLeave={() => setIdx(null)}
        style={{ display: 'block', touchAction: 'none' }}
        role="img" aria-label={`Gráfico de líneas: ${series.map(s => s.nombre).join(' y ')}`}
      >
        {/* Rejilla + eje Y: hairline sólida, recesiva. */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={y(t)} x2={VB_W - PAD.r} y2={y(t)} stroke={colorRejilla} strokeWidth="1" />
            <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={colorTexto} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatoTick(t)}
            </text>
          </g>
        ))}

        {/* Etiquetas del eje X -- sólo 1 de cada `mostrarCadaN`, y siempre la
            última, para que el rango final (el mes/día actual) nunca falte. */}
        {etiquetas.map((lbl, i) => (
          (i % mostrarCadaN === 0 || i === n - 1) && (
            <text key={i} x={x(i)} y={alto - 8} textAnchor="middle" fontSize="10"
              fill={idx === i ? 'var(--text-primary)' : colorTexto} fontWeight={idx === i ? 700 : 400}>
              {lbl}
            </text>
          )
        ))}

        {/* Cruceta: se dibuja debajo de las líneas para no taparlas. */}
        {idx !== null && (
          <line x1={x(idx)} y1={PAD.t} x2={x(idx)} y2={baseY} stroke="var(--hairline-strong)" strokeWidth="1" />
        )}

        {series.map((s, si) => {
          const d = s.valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
          // El pico sólo se marca en la serie principal (si===0): marcarlo en
          // todas volvería a leerse turbio, mismo motivo que el área bajo la
          // curva de rondas anteriores sólo tomaba la primera serie.
          const esPico = (i) => si === 0 && picoIdx !== null && i === picoIdx && picoValor > 0;
          return (
            <g key={s.nombre}>
              {/* pathLength="1" normaliza el largo del trazo a 0-1 sin importar
                  la geometría real -- así "dibujarse progresivamente al
                  cargar" es una sola animación CSS (.linea-progresiva en
                  ui.css), sin medir el path a mano con getTotalLength(). */}
              <path d={d} pathLength="1" className="linea-progresiva" fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {/* Marcador sólo en el extremo, en el pico (si resaltarPico) y en
                  el punto con hover: un punto en cada mes serían 24 marcas
                  compitiendo con la línea. */}
              <circle cx={x(n - 1)} cy={y(s.valores[n - 1])} r="4" fill={esPico(n - 1) ? colorPico : s.color} stroke={colorSuperficie} strokeWidth="2" />
              {idx !== null && idx !== n - 1 && (
                <circle cx={x(idx)} cy={y(s.valores[idx])} r="4" fill={esPico(idx) ? colorPico : s.color} stroke={colorSuperficie} strokeWidth="2" />
              )}
              {picoIdx !== null && esPico(picoIdx) && picoIdx !== n - 1 && picoIdx !== idx && (
                <circle cx={x(picoIdx)} cy={y(s.valores[picoIdx])} r="4" fill={colorPico} stroke={colorSuperficie} strokeWidth="2" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Pill persistente sobre el pico (colorPico) -- no depende del hover,
          a diferencia del tooltip de abajo. Se oculta mientras el tooltip de
          hover está sobre el mismo punto, para no superponer dos globos. */}
      {picoIdx !== null && picoValor > 0 && idx !== picoIdx && (
        <div style={{
          // top en PX, no %: el SVG mide `alto` en px reales (no se re-escala
          // con el ancho), así que la coordenada de y() ya es un px de CSS
          // directo. El -50%/-100% de la transform sí puede ser porcentual
          // -- ésos son relativos al tamaño del propio pill, que es lo que
          // corresponde para centrarlo y apoyarlo arriba del punto.
          position: 'absolute', top: y(picoValor), left: `${(x(picoIdx) / VB_W) * 100}%`,
          transform: 'translate(-50%, calc(-100% - 8px))',
          background: colorPico, color: colorPicoInk,
          borderRadius: 'var(--radius-pill)', padding: '3px 9px',
          fontSize: 11, fontWeight: 700, pointerEvents: 'none', whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formato(picoValor)}
        </div>
      )}

      {idx !== null && (
        <div style={{
          position: 'absolute', top: 0, left: `${(x(idx) / VB_W) * 100}%`,
          transform: `translateX(${idx > n / 2 ? '-100%' : '0'})`,
          marginLeft: idx > n / 2 ? -10 : 10,
          // Tooltip = algo que flota sobre el contenido: superficie de panel con
          // --shadow-pop, no un bloque azul-pizarra fijo que en modo oscuro
          // quedaba más claro que el propio panel.
          background: 'var(--panel)', color: 'var(--text-primary)',
          borderRadius: 'var(--radius-card)', padding: '9px 12px',
          fontSize: 11.5, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
          boxShadow: 'var(--shadow-pop)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 5, textTransform: 'capitalize' }}>{etiquetas[idx]}</div>
          {series.map(s => (
            <div key={s.nombre} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-secondary)' }}>{s.nombre}</span>
              <span style={{ fontWeight: 600, marginLeft: 'auto', paddingLeft: 10, fontVariantNumeric: 'tabular-nums' }}>{formato(s.valores[idx])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Histograma de barras finas + línea superpuesta (una sola serie): el
// "Call Reporting"/"Half-Year Income Statement" de las referencias tipo
// contable -- muchas barras angostas y grises, una línea oscura que traza la
// misma serie encima, y el pico marcado en colorPico con un pill persistente.
// Comparte PAD/VB_W con GraficoLineas para que ambos se alineen si conviven
// en la misma tarjeta.
export function GraficoBarras({ valores, etiquetas, formato = String, alto = 236, mostrarCadaN = 1, colorBarra = 'var(--hairline-strong)', colorLinea = 'var(--text-primary)', colorTexto = 'var(--text-tertiary)', mostrarLinea = true, resaltarPico = false, colorPico = 'var(--green)', colorPicoInk = '#FFFFFF' }) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(null);

  const n = etiquetas.length;
  const plotW = VB_W - PAD.l - PAD.r;
  const plotH = alto - PAD.t - PAD.b;
  const baseY = alto - PAD.b;

  const maxY = maximoLimpio(Math.max(...valores, 0));
  const x = (i) => PAD.l + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => baseY - (v / maxY) * plotH;
  const anchoBarra = Math.max(1.5, (plotW / Math.max(n, 1)) * 0.5);

  const picoIdx = resaltarPico
    ? valores.reduce((mejor, v, i) => (v > valores[mejor] ? i : mejor), 0)
    : null;
  const picoValor = picoIdx !== null ? valores[picoIdx] : 0;

  const alMover = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const xVb = ((e.clientX - rect.left) / rect.width) * VB_W;
    const i = Math.round(((xVb - PAD.l) / plotW) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  };

  const dLinea = mostrarLinea
    ? valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={ref} viewBox={`0 0 ${VB_W} ${alto}`} width="100%" height={alto}
        onMouseMove={alMover} onMouseLeave={() => setIdx(null)}
        style={{ display: 'block', touchAction: 'none' }}
        role="img" aria-label="Gráfico de barras"
      >
        {etiquetas.map((lbl, i) => (
          (i % mostrarCadaN === 0 || i === n - 1) && (
            <text key={i} x={x(i)} y={alto - 8} textAnchor="middle" fontSize="10"
              fill={idx === i ? 'var(--text-primary)' : colorTexto} fontWeight={idx === i ? 700 : 400}>
              {lbl}
            </text>
          )
        ))}

        {valores.map((v, i) => {
          const esPico = resaltarPico && i === picoIdx && picoValor > 0;
          const esHover = idx === i;
          return (
            <rect
              key={i}
              x={x(i) - anchoBarra / 2} y={y(v)} width={anchoBarra} height={Math.max(0, baseY - y(v))}
              rx={anchoBarra / 2}
              fill={esPico ? colorPico : (esHover ? colorLinea : colorBarra)}
              opacity={esPico || esHover ? 1 : 0.55}
            />
          );
        })}

        {mostrarLinea && (
          <path d={dLinea} pathLength="1" className="linea-progresiva" fill="none" stroke={colorLinea} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {idx !== null && (
          <line x1={x(idx)} y1={PAD.t} x2={x(idx)} y2={baseY} stroke="var(--hairline-strong)" strokeWidth="1" />
        )}
      </svg>

      {picoIdx !== null && picoValor > 0 && idx !== picoIdx && (
        <div style={{
          position: 'absolute', top: y(picoValor), left: `${(x(picoIdx) / VB_W) * 100}%`,
          transform: 'translate(-50%, calc(-100% - 8px))',
          background: colorPico, color: colorPicoInk,
          borderRadius: 'var(--radius-pill)', padding: '3px 9px',
          fontSize: 11, fontWeight: 700, pointerEvents: 'none', whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formato(picoValor)}
        </div>
      )}

      {idx !== null && idx !== picoIdx && (
        <div style={{
          position: 'absolute', top: y(valores[idx]), left: `${(x(idx) / VB_W) * 100}%`,
          transform: `translate(${idx > n / 2 ? '-100%' : '0'}, calc(-100% - 8px))`,
          marginLeft: idx > n / 2 ? -6 : 6,
          background: 'var(--panel)', color: 'var(--text-primary)',
          borderRadius: 'var(--radius-card)', padding: '6px 10px',
          fontSize: 11.5, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
          boxShadow: 'var(--shadow-pop)', fontVariantNumeric: 'tabular-nums',
        }}>
          {formato(valores[idx])}
        </div>
      )}
    </div>
  );
}

// Leyenda: siempre presente con 2+ series. La identidad la carga el punto de
// color, nunca el color del texto.
export function Leyenda({ series, colorTexto = 'var(--text-secondary)' }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {series.map(s => (
        <span key={s.nombre} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: colorTexto, fontWeight: 600 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
          {s.nombre}
        </span>
      ))}
    </div>
  );
}
