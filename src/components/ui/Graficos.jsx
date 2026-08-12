// src/components/ui/Graficos.jsx
// Primitivas de gráfico en SVG inline, sin librerías: la app ya pesa lo que pesa
// y estos gráficos no justifican sumar Recharts/D3 al bundle.
//
// Reglas de marca (las mismas en toda la app):
//  · monocromo: la barra y la línea van en tinta, no en colores de serie. El
//    color se reserva para UN acento (el pico, un delta positivo).
//  · rejilla de 1px, siempre recesiva; el eje Y cae en números limpios.
//  · el texto nunca lleva el color de la serie.
import React, { useRef, useState, useId } from 'react';

// Techo del eje Y tal que CADA marca caiga en un número limpio, no sólo el
// techo: se redondea el valor por marca (max/divisiones) y después se multiplica.
// Si sólo se redondeara el techo, un máximo de 1.500 daría marcas en 375 y 1.125.
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

// Anillo / arco de progreso. `barrido` en grados: 360 = anillo completo, 180 =
// semicírculo (el medidor de la referencia). Con barrido<360 el trazo arranca
// a la izquierda y abre hacia arriba, que es como se lee un gauge.
export function Anillo({ pct, color, tamano = 92, grosor = 9, barrido = 360, children }) {
  const valor = Math.max(0, Math.min(100, pct || 0));
  const r = (tamano - grosor) / 2;
  const circ = 2 * Math.PI * r;
  const largoArco = circ * (barrido / 360);
  const completo = barrido >= 360;
  // Un arco de 180° sólo ocupa la mitad de alto: recortar la caja evita el
  // hueco de aire muerto debajo del semicírculo.
  const altoCaja = completo ? tamano : tamano / 2 + grosor;
  return (
    <div style={{ position: 'relative', width: tamano, height: altoCaja, flexShrink: 0 }}>
      <svg width={tamano} height={tamano} style={{ transform: completo ? 'rotate(-90deg)' : 'rotate(180deg)', display: 'block' }} aria-hidden="true">
        <circle
          cx={tamano / 2} cy={tamano / 2} r={r} fill="none"
          stroke={`color-mix(in srgb, ${color} 18%, transparent)`} strokeWidth={grosor}
          strokeDasharray={`${largoArco} ${circ}`} strokeLinecap="round"
        />
        <circle
          cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={color} strokeWidth={grosor}
          strokeDasharray={`${largoArco * (valor / 100)} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: completo ? 'center' : 'flex-end',
        paddingBottom: completo ? 0 : 2, pointerEvents: 'none',
      }}>
        {children}
      </div>
    </div>
  );
}

const VB_W = 720;

// Histograma denso: muchas barras finas + una línea que traza la misma serie
// encima, eje Y opcionalmente a la derecha y una tarjeta de anotación anclada a
// un punto. `etiquetas` es un array paralelo a `valores` donde el string vacío
// significa "no rotular este punto" -- así quien llama decide la densidad de
// etiquetas (nombre de mes en el primer día de cada mes, por ejemplo) sin que
// este componente tenga que adivinar el calendario.
export function GraficoBarras({
  valores, etiquetas, formato = String, alto = 236,
  colorBarra = 'rgba(37, 39, 51, 0.11)',
  colorLinea = '#252733',
  colorTexto = '#94A0AC',
  colorRejilla = 'rgba(37, 39, 51, 0.06)',
  colorAcento = '#16A34A',
  colorAcentoInk = '#FFFFFF',
  mostrarLinea = true,
  mostrarBarras = true,
  mostrarArea = false,
  colorArea,
  ejeDerecha = false,
  mostrarEjeY = true,
  anotacion = null,
}) {
  const ref = useRef(null);
  const [idx, setIdx] = useState(null);
  const gradId = useId();

  const n = valores.length;
  const anchoEje = mostrarEjeY ? 44 : 8;
  const PAD = {
    l: ejeDerecha ? 8 : anchoEje,
    r: ejeDerecha ? anchoEje : 12,
    t: 16,
    b: etiquetas.some(Boolean) ? 24 : 6,
  };
  const plotW = VB_W - PAD.l - PAD.r;
  const plotH = alto - PAD.t - PAD.b;
  const baseY = alto - PAD.b;

  const maxY = maximoLimpio(Math.max(...valores, 0));
  const x = (i) => PAD.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => baseY - (v / maxY) * plotH;
  // Con 365 barras cada una mide menos de 1px: el piso de 0.75 evita que
  // desaparezcan del todo, y el 0.62 deja aire entre barras sin que se peguen.
  const anchoBarra = Math.max(0.75, (plotW / Math.max(n, 1)) * 0.62);

  const ticks = [0, 0.5, 1].map(f => f * maxY);

  const alMover = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const xVb = ((e.clientX - rect.left) / rect.width) * VB_W;
    const i = Math.round(((xVb - PAD.l) / plotW) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  };

  const dLinea = mostrarLinea && n > 1
    ? valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={ref} viewBox={`0 0 ${VB_W} ${alto}`} width="100%" height={alto}
        onMouseMove={alMover} onMouseLeave={() => setIdx(null)}
        style={{ display: 'block', touchAction: 'none' }}
        role="img" aria-label="Histograma"
      >
        {mostrarEjeY && ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={y(t)} x2={VB_W - PAD.r} y2={y(t)} stroke={colorRejilla} strokeWidth="1" />
            <text
              x={ejeDerecha ? VB_W - PAD.r + 8 : PAD.l - 8} y={y(t) + 3.5}
              textAnchor={ejeDerecha ? 'start' : 'end'}
              fontSize="9.5" fill={colorTexto} style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatoTick(t)}
            </text>
          </g>
        ))}

        {etiquetas.map((lbl, i) => (
          lbl ? (
            <text key={i} x={x(i)} y={alto - 7} textAnchor="middle" fontSize="9.5"
              fill={colorTexto} style={{ textTransform: 'capitalize' }}>
              {lbl}
            </text>
          ) : null
        ))}

        {mostrarBarras && valores.map((v, i) => {
          const esHover = idx === i;
          const esAnotado = anotacion && anotacion.idx === i;
          return (
            <rect
              key={i}
              x={x(i) - anchoBarra / 2} y={y(v)}
              width={anchoBarra} height={Math.max(0, baseY - y(v))}
              fill={esAnotado ? colorAcento : (esHover ? colorLinea : colorBarra)}
              opacity={esAnotado || esHover ? 1 : 0.7}
            />
          );
        })}

        {/* Área bajo la curva: un degradé que se apaga hacia abajo, no un
            relleno plano -- la línea sola encima ya alcanza para que se lea
            como serie. Sólo tiene sentido con la línea activa. */}
        {mostrarArea && dLinea && (
          <>
            <defs>
              <linearGradient id={`area-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorArea || colorLinea} stopOpacity="0.22" />
                <stop offset="100%" stopColor={colorArea || colorLinea} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`${dLinea} L${x(n - 1).toFixed(1)},${baseY.toFixed(1)} L${x(0).toFixed(1)},${baseY.toFixed(1)} Z`}
              fill={`url(#area-${gradId})`} stroke="none"
            />
          </>
        )}

        {dLinea && (
          <path d={dLinea} pathLength="1" className="linea-progresiva" fill="none"
            stroke={colorLinea} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Marcador sobre la línea en el punto anotado: sin barras, la línea
            sola no deja ninguna marca ahí -- el pill flotante quedaría
            "señalando a la nada". */}
        {dLinea && !mostrarBarras && anotacion && (
          <circle cx={x(anotacion.idx)} cy={y(valores[anotacion.idx] ?? 0)} r="4" fill={colorAcento} stroke="#FFFFFF" strokeWidth="2" />
        )}
        {dLinea && !mostrarBarras && idx !== null && idx !== anotacion?.idx && (
          <circle cx={x(idx)} cy={y(valores[idx])} r="4" fill={colorLinea} stroke="#FFFFFF" strokeWidth="2" />
        )}

        {idx !== null && (
          <line x1={x(idx)} y1={PAD.t} x2={x(idx)} y2={baseY} stroke="rgba(37, 39, 51, 0.11)" strokeWidth="1" />
        )}
      </svg>

      {/* Tarjeta de anotación anclada a un punto: la cifra, su delta en el
          color de acento y una frase corta. Persistente, no depende del hover
          -- es la conclusión del gráfico, no un detalle al pasar el mouse. */}
      {anotacion && (
        <div style={{
          // top en px: el SVG mide `alto` en px reales (no se re-escala con el
          // ancho), así que y() ya devuelve un px de CSS directo.
          position: 'absolute', top: y(valores[anotacion.idx] ?? 0),
          left: `${(x(anotacion.idx) / VB_W) * 100}%`,
          transform: `translate(${anotacion.idx > n / 2 ? '-100%' : '0'}, calc(-100% - 10px))`,
          marginLeft: anotacion.idx > n / 2 ? -8 : 8,
          background: '#FFFFFF', borderRadius: '14px',
          border: '1px solid rgba(37, 39, 51, 0.06)', boxShadow: '0 8px 20px rgba(16, 24, 40, 0.10), 0 2px 6px rgba(16, 24, 40, 0.05)',
          padding: '9px 12px', maxWidth: 210, pointerEvents: 'none', zIndex: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#252733', fontVariantNumeric: 'tabular-nums' }}>
              {formato(valores[anotacion.idx] ?? 0)}
            </span>
            {anotacion.delta != null && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, borderRadius: '999px',
                padding: '1px 7px', background: colorAcento, color: colorAcentoInk,
              }}>
                {anotacion.delta >= 0 ? '+' : ''}{anotacion.delta}%
              </span>
            )}
          </div>
          {anotacion.texto && (
            <div style={{ fontSize: 10.5, color: '#667085', marginTop: 3, lineHeight: 1.4 }}>
              {anotacion.texto}
            </div>
          )}
        </div>
      )}

      {idx !== null && idx !== anotacion?.idx && (
        <div style={{
          position: 'absolute', top: y(valores[idx]),
          left: `${(x(idx) / VB_W) * 100}%`,
          transform: `translate(${idx > n / 2 ? '-100%' : '0'}, calc(-100% - 8px))`,
          marginLeft: idx > n / 2 ? -6 : 6,
          background: '#252733', color: '#FFFFFF',
          borderRadius: '10px', padding: '5px 9px',
          fontSize: 11, fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formato(valores[idx])}
        </div>
      )}
    </div>
  );
}
