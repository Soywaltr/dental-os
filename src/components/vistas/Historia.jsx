// src/components/vistas/Historia.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import Consentimientos from '../historia/Consentimientos';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import {
  TODAS_NACIONES, labelStyleDoc, inputStyleDoc, TRATAMIENTOS_CAT, PRECIOS,
  P, BD, DN, MU, MT, LT, WA, RJ, GL, AZ, TOOLS, UA, LA, UP, LP, TNAME,
  GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW, FUENTE_CAPTACION_GRUPOS
} from '../../utils/constants';
import { ini, sc, getSurfs, gt, isMol, isPM, isBad, baseId, BAD_SUFFIX, toWhatsAppNumber } from '../../utils/helpers';
// No se importa invalidarFirma: aquí cada subida genera una ruta nueva con
// timestamp, así que nunca hay una firma cacheada que quede obsoleta.
import { BUCKET, rutaFirma, rutaImagenPaciente, rutaDesdeUrl, firmar } from '../../utils/storage';
import useResponsive from '../../utils/useResponsive';

// ============================================================================
// 1. COMPONENTE TOOTHSVG (Corregido .g)
// ============================================================================
function ToothSVG({ num, upper, surfs = {}, active, onClick, w = 31, sarroDots = 0, estadoDot = null }) {
  const W = w, CH = 20, RH = 22, TH = CH + RH, M = isMol(num), PM = isPM(num), cY = upper ? 0 : RH;
  const conds = Object.entries(surfs).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
  const domRaw = conds.length ? conds[0][1] : null;
  const dom = domRaw ? gt(domRaw) : null;
  const domIsBad = isBad(domRaw);

  // AQUÍ ESTABA EL ERROR: Cambiado dom.cr por dom.g
  const cf = !dom ? '#f8fafc' : (dom.g === 'r' || domIsBad) ? `color-mix(in srgb, ${RJ} 87%, transparent)` : dom.mk === 'x' ? '#64748b22' : `color-mix(in srgb, ${AZ} 87%, transparent)`;

  const isExtraer = Object.values(surfs).some(s => s === 'extraer');

  const rp = upper
    ? M ? `M 2 ${CH} L ${W / 2 - 1} ${TH - 1} L ${W / 2 - 1} ${CH} Z M ${W / 2 + 1} ${CH} L ${W - 2} ${TH - 1} L ${W - 2} ${CH} Z` : `M 3 ${CH} L ${W / 2} ${TH - 1} L ${W - 3} ${CH} Z`
    : M ? `M 2 ${RH} L ${W / 2 - 1} 1 L ${W / 2 - 1} ${RH} Z M ${W / 2 + 1} ${RH} L ${W - 2} 1 L ${W - 2} ${RH} Z` : `M 3 ${RH} L ${W / 2} 1 L ${W - 3} ${RH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${TH}`} width={W} height={TH} onClick={onClick}
      style={{ display: 'block', cursor: 'pointer', transition: 'opacity .12s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '.72'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>

      {active && <rect x="0" y="0" width={W} height={TH} rx="4" fill={`color-mix(in srgb, ${P} 20%, transparent)`} stroke={P} strokeWidth="2" />}
      <path d={rp} fill="#f8fafc" stroke={active ? P : '#64748b'} strokeWidth={active ? 1.5 : .8} />
      <rect x={1} y={cY} width={W - 2} height={CH} rx="2" fill={cf} stroke={active ? P : '#64748b'} strokeWidth={active ? 1.5 : .8} />

      {cf === '#f8fafc' && (M || PM) && <>
        <line x1={1} y1={cY + CH * .45} x2={W - 1} y2={cY + CH * .45} stroke="#cbd5e1" strokeWidth=".8" />
        <line x1={W / 2} y1={cY} x2={W / 2} y2={cY + CH} stroke="#cbd5e1" strokeWidth=".8" />
      </>}

      {isExtraer && (
        <g style={{ pointerEvents: 'none' }}>
          <line x1="2" y1="2" x2={W - 2} y2={TH - 2} stroke={RJ} strokeWidth="3" strokeLinecap="round" />
          <line x1={W - 2} y1="2" x2="2" y2={TH - 2} stroke={RJ} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {dom?.mk === 'x' && <><line x1="2" y1="2" x2={W - 2} y2={TH - 2} stroke="#64748b" strokeWidth="2" /><line x1={W - 2} y1="2" x2="2" y2={TH - 2} stroke="#64748b" strokeWidth="2" /></>}
      {dom?.mk === 'ca' && <ellipse cx={W / 2} cy={cY + CH / 2} rx={(W - 4) / 2} ry={CH / 2 - 1} fill="none" stroke={AZ} strokeWidth="2" />}
      {dom?.mk === 'cr' && <ellipse cx={W / 2} cy={cY + CH / 2} rx={(W - 4) / 2} ry={CH / 2 - 1} fill="none" stroke={RJ} strokeWidth="2" />}
      {dom?.mk === 'frac' && <line x1="3" y1={cY + 2} x2={W - 3} y2={cY + CH - 2} stroke={RJ} strokeWidth="2" />}
      {dom?.mk === 'root' && <line x1={W / 2} y1={upper ? CH + 3 : 2} x2={W / 2} y2={upper ? TH - 2 : RH - 2} stroke={AZ} strokeWidth="2" />}
      {conds.length > 1 && <circle cx={W - 5} cy={4} r="3.5" fill={P} />}
      {estadoDot && <circle cx={5} cy={4} r="3.5" fill={estadoDot} stroke="#fff" strokeWidth=".8" />}
      {sarroDots > 0 && (
        <g style={{ pointerEvents: 'none' }}>
          {Array.from({ length: sarroDots }).map((_, i) => (
            <circle key={i} cx={4 + i * 6} cy={cY + CH - 4} r="2.2" fill="#a16207" stroke="#fff" strokeWidth=".5" />
          ))}
        </g>
      )}
    </svg>
  );
}

// ============================================================================
// 2. COMPONENTE OCCLUSALMAP (Corregido .g)
// ============================================================================
function OcclusalMap({ num, surfs, activeTool, onSurf, size = 160 }) {
  const S = size, cx = S / 2, cy = S / 2, ir = S * .18, ob = S / 2 - 5;
  const sf0 = getSurfs(num)[0];
  const at = gt(activeTool);

  const ZONES = {
    [sf0]: `M ${cx - ir} ${cy - ir} L ${cx + ir} ${cy - ir} L ${cx + ir} ${cy + ir} L ${cx - ir} ${cy + ir} Z`,
    L: `M ${cx - ob} ${cy - ob} L ${cx + ob} ${cy - ob} L ${cx + ir} ${cy - ir} L ${cx - ir} ${cy - ir} Z`,
    V: `M ${cx - ob} ${cy + ob} L ${cx + ob} ${cy + ob} L ${cx + ir} ${cy + ir} L ${cx - ir} ${cy + ir} Z`,
    M: `M ${cx - ob} ${cy - ob} L ${cx - ir} ${cy - ir} L ${cx - ir} ${cy + ir} L ${cx - ob} ${cy + ob} Z`,
    D: `M ${cx + ob} ${cy - ob} L ${cx + ir} ${cy - ir} L ${cx + ir} ${cy + ir} L ${cx + ob} ${cy + ob} Z`
  };

  const CTR = { [sf0]: [cx, cy], L: [cx, 16], V: [cx, S - 16], M: [16, cy], D: [S - 16, cy] };

  return (
    <svg viewBox={`0 0 ${S} ${S + 20}`} width={S} height={S + 20} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      <rect x="4" y="4" width={S - 8} height={S - 8} rx="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth=".7" />

      {Object.entries(ZONES).map(([sf, path]) => {
        const c = surfs[sf], t = gt(c), h = c && c !== 'normal';

        // AQUÍ ESTABA EL ERROR: Cambiado t.cr por t.g
        const fill = h ? ((t.g === 'r' || isBad(c)) ? `color-mix(in srgb, ${RJ} 80%, transparent)` : `color-mix(in srgb, ${AZ} 80%, transparent)`) : '#f8fafc';
        
        return (
          <path key={sf} d={path} fill={fill} stroke="rgba(0,0,0,.1)" strokeWidth="1"
            style={{ cursor: 'pointer' }} onClick={() => onSurf(sf)}
            onMouseEnter={e => e.target.setAttribute('fill', at.col + '88')}
            onMouseLeave={e => e.target.setAttribute('fill', fill)}
          />
        );
      })}

      {Object.values(surfs).some(s => s === 'extraer') && (
        <g style={{ pointerEvents: 'none' }}>
          <line x1="10" y1="10" x2={S - 10} y2={S - 10} stroke={RJ} strokeWidth="5" strokeLinecap="round" />
          <line x1={S - 10} y1="10" x2="10" y2={S - 10} stroke={RJ} strokeWidth="5" strokeLinecap="round" />
        </g>
      )}

      {Object.entries(CTR).map(([sf, [tx, ty]]) => {
        const c = surfs[sf], t = gt(c), h = c && c !== 'normal';
        const esExtraer = c === 'extraer';

        return (
          <g key={sf}>
            {esExtraer && (
              <rect x={tx - 14} y={ty - 6} width="28" height="13" rx="2" fill={RJ} />
            )}
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={sf === sf0 ? 13 : 11}
              fontWeight="600" fill={esExtraer || h ? '#fff' : '#9AA1AC'} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {esExtraer ? 'EXT' : (h && t.sig ? t.sig : sf)}
            </text>
          </g>
        );
      })}

      <text x={cx} y={S + 13} textAnchor="middle" fontSize="13" fill={DN} fontWeight="600">
        {num}
      </text>
    </svg>
  );
}

// ============================================================================
// 3. COMPONENTE ODONTOGRAMA (Lógica de descompresión para lectura y escritura)
// ============================================================================
function Odontograma({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion, periodontalDx, setPeriodontalDx, plan, setPlan, onGenerarSugerencia }) {
  const [act, setAct] = useState('caries');
  const [sel, setSel] = useState(null);
  const [specs, setSpecs] = useState('');
  const [mode, setMode] = useState('inicial');
  const [showP, setShowP] = useState(true);

  const at = gt(act);
  const aw = 42;
  const pw = 32;

  // Puntos de sarro: se marcan automáticamente en todas las piezas según la evaluación periodontal
  const SARRO_DOTS = { 'Ninguno': 0, 'Gingivitis leve': 1, 'Gingivitis moderada': 2, 'Gingivitis severa': 3, 'Periodontitis': 4 };
  const sarroDots = SARRO_DOTS[periodontalDx] || 0;

  // Odo. Evolución hereda por defecto los hallazgos de Odo. Inicial, cara por cara:
  // una cara no tocada en evolución sigue mostrando lo que diagnosticó Inicial (para
  // saber qué falta por curar); una cara sí editada en evolución (incluso al pincel
  // "Normal", que queda guardado como valor explícito) ya no vuelve a heredar.
  const expandPieza = (p, n) => {
    if (!p || !p.todaPieza) return p || {};
    const exp = {};
    getSurfs(n).forEach(s => { exp[s] = p.todaPieza; });
    if (p.note) exp.note = p.note;
    return exp;
  };
  const mergedPieza = (n) => {
    const base = (teeth || {})[n];
    const evo = (teethEvolucion || {})[n];
    if (!evo) return base || {};
    if (!base) return expandPieza(evo, n);
    return { ...expandPieza(base, n), ...expandPieza(evo, n) };
  };
  const currentTeeth = mode === 'inicial'
    ? (teeth || {})
    : Object.fromEntries(
        Array.from(new Set([...Object.keys(teeth || {}), ...Object.keys(teethEvolucion || {})]))
          .map(n => [n, mergedPieza(n)])
      );
  const setCurrentTeeth = mode === 'inicial' ? setTeeth : setTeethEvolucion;

  const applyAll = n => {
    if (act === 'normal') {
      setCurrentTeeth(p => {
        const next = { ...(p || {}) };
        if (mode === 'evolución') {
          // Override explícito por cara: "normal" queda guardado y ya no hereda de Inicial
          const cleared = {};
          getSurfs(n).forEach(s => { cleared[s] = 'normal'; });
          next[n] = cleared;
        } else {
          delete next[n];
        }
        return next;
      });
      return;
    }
    const up = {};
    getSurfs(n).forEach(s => up[s] = act);
    setCurrentTeeth(p => {
      const safeP = p || {};
      const currentPiece = currentTeeth[n] || {};
      // Borramos "todaPieza" si venía de Supabase para evitar conflictos con las caras
      const { todaPieza: _todaPieza, ...rest } = currentPiece;
      return { ...safeP, [n]: { ...rest, ...up } };
    });
    setSel(n);
  };

  const applySurf = (n, sf) => {
    setCurrentTeeth(p => {
      const safeP = p || {};
      const currentPiece = currentTeeth[n] || {};

      // ⚡ SOLUCIÓN AQUÍ: Si el diente venía guardado entero, lo desglosamos en 5 caras
      let expandedPiece = { ...currentPiece };
      if (expandedPiece.todaPieza) {
        getSurfs(n).forEach(s => expandedPiece[s] = expandedPiece.todaPieza);
        delete expandedPiece.todaPieza;
      }

      const cur = expandedPiece[sf];
      if (act === 'normal' || cur === act) {
        // En evolución, "borrar" una cara heredada debe quedar explícito para no volver
        // a mostrar el hallazgo de Inicial; en inicial no hay nada que heredar.
        if (mode === 'evolución') expandedPiece[sf] = 'normal';
        else delete expandedPiece[sf];
      } else {
        expandedPiece[sf] = act;
      }
      return { ...safeP, [n]: expandedPiece };
    });
  };

  const toggleBadFlag = (n, sf) => {
    setCurrentTeeth(p => {
      const safeP = p || {};
      const currentPiece = currentTeeth[n] || {};

      let expandedPiece = { ...currentPiece };
      if (expandedPiece.todaPieza) {
        getSurfs(n).forEach(s => expandedPiece[s] = expandedPiece.todaPieza);
        delete expandedPiece.todaPieza;
      }

      const cur = expandedPiece[sf];
      if (!cur) return { ...safeP, [n]: expandedPiece };
      expandedPiece[sf] = isBad(cur) ? baseId(cur) : cur + BAD_SUFFIX;
      return { ...safeP, [n]: expandedPiece };
    });
  };

  const allF = [];
  Object.entries(currentTeeth).forEach(([n, ss]) => {
    const superficies = getSurfs(n);
    const valores = superficies.map(s => ss[s]).filter(v => v && v !== 'normal');
    const esTodoIgual = ss.todaPieza || (valores.length === superficies.length && valores.every(v => v === valores[0]));

    if (esTodoIgual) {
      const hallazgoDeteccion = ss.todaPieza || valores[0];
      allF.push({ n, sf: 'Toda la pieza', c: hallazgoDeteccion });
    } else {
      Object.entries(ss).forEach(([sf, c]) => {
        if (c && c !== 'normal' && sf !== 'note' && sf !== 'todaPieza') {
          allF.push({ n, sf, c });
        }
      });
    }
  });

  const recRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => {
        const ss = currentTeeth[n] || {};
        const cs = Object.entries(ss).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
        const csRaw = cs.length ? cs[0][1] : null;
        const t = csRaw ? gt(csRaw) : null;
        return (
          <div key={n} style={{ width: w, height: 18, border: '0.5px solid #374151', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel === n ? `color-mix(in srgb, ${P} 13%, transparent)` : undefined, borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : '0.5px solid #374151' }}>
            {t && <span style={{ fontSize: 12, fontWeight: 600, color: (t.g === 'r' || isBad(csRaw)) ? RJ : AZ }}>{t.sig}</span>}
          </div>
        );
      })}
    </div>
  );

  const nRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ width: w, fontSize: 13, textAlign: 'center', userSelect: 'none', color: sel === n ? P : MU, fontWeight: sel === n ? 700 : 500, fontVariantNumeric: 'tabular-nums', borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : 'none', padding: '2px 0 6px' }}>
          {n}
        </div>
      ))}
    </div>
  );

  // En Odo. Evolución, cada pieza con tratamiento en el Plan muestra un punto de estado
  // (rojo=pendiente, ámbar=en curso, verde=completado) tomando el peor/último estado vigente.
  const estadoParaPieza = (n) => {
    if (mode !== 'evolución') return null;
    const items = (plan || []).filter(i => String(i.tooth) === String(n));
    if (items.length === 0) return null;
    if (items.every(i => i.status === 'completado')) return sc('completado').c;
    if (items.some(i => i.status === 'en_curso')) return sc('en_curso').c;
    return sc('pendiente').c;
  };

  const tRow = (list, upper, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : 'none' }}>
          <ToothSVG num={n} upper={upper} surfs={currentTeeth[n] || {}} active={sel === n} onClick={() => setSel(sel === n ? null : n)} w={w} sarroDots={sarroDots} estadoDot={estadoParaPieza(n)} />
        </div>
      ))}
    </div>
  );

  const eRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ width: w, height: 13, border: '0.5px solid #374151', boxSizing: 'border-box', background: sel === n ? `color-mix(in srgb, ${P} 7%, transparent)` : undefined, borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : '0.5px solid #374151' }} />
      ))}
    </div>
  );

  // ⚡ SEGUNDA SOLUCIÓN AQUÍ: Desglosamos "todaPieza" para que el SVG del panel lateral lo pueda leer
  const rawSelSurfs = sel ? (currentTeeth[sel] || {}) : {};
  const selSurfs = { ...rawSelSurfs };
  if (selSurfs.todaPieza && sel) {
    getSurfs(sel).forEach(s => selSurfs[s] = selSurfs.todaPieza);
  }

  const itemsPieza = sel ? (plan || []).filter(i => String(i.tooth) === String(sel)) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* PESTAÑAS: Odo. Inicial / Odo. Evolución */}
      <div style={{ display: 'flex', gap: 22, padding: '0 20px', background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
        {[{ id: 'inicial', lbl: 'Odo. Inicial' }, { id: 'evolución', lbl: 'Odo. Evolución' }].map(t => (
          <div key={t.id} onClick={() => setMode(t.id)}
            style={{ padding: '13px 2px', minHeight: 44, boxSizing: 'border-box', marginBottom: -1, cursor: 'pointer', fontSize: 15, fontWeight: mode === t.id ? 600 : 500, color: mode === t.id ? P : MU, borderBottom: mode === t.id ? `2px solid ${P}` : '2px solid transparent', transition: 'color .18s cubic-bezier(0.25, 0.1, 0.25, 1), border-color .18s cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
            {t.lbl}
          </div>
        ))}
        {mode === 'evolución' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: MU, fontWeight: 500 }}>
            {[{ s: 'pendiente', l: 'Pendiente' }, { s: 'en_curso', l: 'En curso' }, { s: 'completado', l: 'Completado' }].map(({ s, l }) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc(s).c, display: 'inline-block' }} /> {l}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* SIDEBAR HERRAMIENTAS */}
      <div style={{ width: 180, background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderRight: `1px solid ${BD}`, overflowY: 'auto', flexShrink: 0, padding: 12 }}>
        <div style={{ background: at.col, color: at.tc, padding: '8px 10px', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', borderRadius: '10px', fontSize: 13.5, fontWeight: 600, textAlign: 'center', marginBottom: 10 }}>{at.lbl}</div>

        {[{ label: 'Rojo — mal estado', g: 'r' }, { label: 'Azul — buen estado', g: 'a' }].map(({ label, g }) => (
          <div key={g}>
            <div style={{ fontSize: 11, fontWeight: 600, color: g === 'r' ? RJ : AZ, textTransform: 'uppercase', letterSpacing: .5, margin: '12px 0 6px', borderTop: `1px solid ${BD}`, paddingTop: 8 }}>{label}</div>
            {TOOLS.filter(t => t.g === g).map(t => (
              <div key={t.id} onClick={() => setAct(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', minHeight: 36, boxSizing: 'border-box', borderRadius: '10px', cursor: 'pointer', marginBottom: 2, background: act === t.id ? t.col : 'transparent', transition: 'background-color .18s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
                onMouseEnter={e => { if (act !== t.id) e.currentTarget.style.background = '#EDEDED' }}
                onMouseLeave={e => { if (act !== t.id) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: t.col, border: `1px solid ${BD}`, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: act === t.id ? '#fff' : DN, fontWeight: act === t.id ? 600 : 500 }}>{t.lbl}</span>
              </div>
            ))}
          </div>
        ))}

        <div onClick={() => setAct('normal')} style={{ marginTop: 10, padding: '8px 10px', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', borderRadius: '10px', cursor: 'pointer', textAlign: 'center', border: `1px solid ${BD}`, fontSize: 13, color: DN, fontWeight: 600 }}>↺ Limpiar pincel</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: MU, marginTop: 12, minHeight: 36, fontWeight: 500 }}>
          <input type="checkbox" checked={showP} onChange={e => setShowP(e.target.checked)} style={{ accentColor: P, transform: 'scale(1.2)' }} /> Dientes Deciduos
        </label>
        {allF.length > 0 && <button onClick={() => { setCurrentTeeth({}); setSel(null); }} style={{ width: '100%', marginTop: 10, padding: '9px', minHeight: 36, background: '#FEE2E2', border: `1px solid color-mix(in srgb, ${RJ} 33%, transparent)`, borderRadius: '10px', fontSize: 13, color: RJ, cursor: 'pointer', fontWeight: 600 }}>Limpiar todo el mapa</button>}
      </div>

      {/* ÁREA CENTRAL -- la tarjeta era inline-block con sólo un minWidth,
          así que quedaba chica y perdida en medio de todo el espacio vacío
          de una pantalla ancha (cada fila del diagrama ya se autocentra con
          su propio justifyContent:'center', así que ensanchar la tarjeta no
          rompe el dibujo -- sólo le da un marco a lo ancho en vez de una
          isla flotante). */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '30px 20px', boxSizing: 'border-box' }}>
        <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', padding: '24px 30px', width: '100%', maxWidth: 1400, minWidth: 750, margin: '0 auto', boxSizing: 'border-box', boxShadow: GLASS_SHADOW }}>
          <div style={{ display: 'flex', gap: 15, marginBottom: 15, alignItems: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: DN }}>{patient?.name || 'Paciente'}</div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: '14px', background: mode === 'inicial' ? MT : '#FEF3C7', color: mode === 'inicial' ? P : GL }}>{mode}</span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: MU, textTransform: 'uppercase', letterSpacing: .4, textAlign: 'center', marginBottom: 6 }}>Maxilar superior</div>

          {recRow(UA, aw)}{eRow(UA, aw)}{nRow(UA, aw)}{tRow(UA, true, aw)}

          {showP && (
            <div style={{ marginTop: 3 }}>
              {tRow(UP, true, pw)}
              {nRow(UP, pw)}
            </div>
          )}

          {/* PLANO OCLUSAL */}
          <div style={{ margin: '12px 0 10px', borderTop: '2px solid #374151', position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%) translateY(-50%)', background: LT, padding: '0 12px', fontSize: 11, color: '#9AA1AC', fontWeight: 600, letterSpacing: .4, whiteSpace: 'nowrap' }}>PLANO OCLUSAL</span>
          </div>

          {showP && (
            <div style={{ marginTop: 8 }}>
              {nRow(LP, pw)}
              {tRow(LP, false, pw)}
            </div>
          )}

          {tRow(LA, false, aw)}{nRow(LA, aw)}{eRow(LA, aw)}{recRow(LA, aw)}

          <div style={{ fontSize: 12, fontWeight: 600, color: MU, textTransform: 'uppercase', letterSpacing: .4, textAlign: 'center', marginTop: 6 }}>Maxilar inferior</div>

          <div style={{ marginTop: 20, borderTop: `1px solid ${BD}`, paddingTop: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: DN }}>ESPECIFICACIONES CLÍNICAS: </span>
            <textarea value={specs} onChange={e => setSpecs(e.target.value)} placeholder="Ej. Hallazgos múltiples o anotaciones no gráficas..."
              style={{ width: '100%', minHeight: 40, marginTop: 6, padding: '8px 10px', border: '1px solid transparent', borderBottom: `1px solid ${BD}`, fontSize: 13, lineHeight: 1.5, resize: 'vertical', outline: 'none', color: DN, background: '#F5F5F5', borderRadius: '10px 10px 0 0', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {/* EVALUACIÓN PERIODONTAL — a nivel de boca completa, no por pieza */}
          <div style={{ marginTop: 20, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: '14px', padding: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#7e22ce', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .3 }}>
              Evaluación Periodontal — Boca completa
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Ninguno', 'Gingivitis leve', 'Gingivitis moderada', 'Gingivitis severa', 'Periodontitis'].map(opt => (
                <div key={opt} onClick={() => setPeriodontalDx(opt)}
                  style={{
                    padding: '9px 16px', minHeight: 36, boxSizing: 'border-box', display: 'flex', alignItems: 'center',
                    borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: periodontalDx === opt ? '#7e22ce' : '#fff',
                    color: periodontalDx === opt ? '#fff' : '#7e22ce',
                    border: '1px solid #7e22ce55',
                    transition: 'background-color .18s cubic-bezier(0.25, 0.1, 0.25, 1), color .18s cubic-bezier(0.25, 0.1, 0.25, 1)',
                  }}>
                  {opt}
                </div>
              ))}
            </div>
            {periodontalDx && periodontalDx !== 'Ninguno' && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#7e22ce', fontWeight: 500 }}>
                <Icon name="warning" size={11} /> Este diagnóstico es a nivel de boca completa y se guarda junto con el resto de la historia clínica.
              </div>
            )}
          </div>

          {allF.length > 0 && <div style={{ marginTop: 15, padding: 14, background: LT, borderRadius: '14px', border: `1px solid ${BD}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P, marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>Resumen de Hallazgos ({allF.length}):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allF.map(({ n, sf, c }, i) => {
                const t = gt(c);
                return (
                  <span key={i} onClick={() => applySurf(n, sf)} title="Clic para quitar"
                    style={{ fontSize: 12, background: LT, color: t.g === 'r' ? RJ : AZ, padding: '6px 12px', borderRadius: '14px', fontWeight: 600, cursor: 'pointer', fontVariantNumeric: 'tabular-nums', border: `1px solid color-mix(in srgb, ${t.g === 'r' ? RJ : AZ} 33%, transparent)`, boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 6px rgba(16, 24, 40, 0.05)' }}>
                    Pieza {n} / {sf} : {t.sig}
                  </span>
                );
              })}
            </div>
          </div>}
        </div>
      </div>

      {/* DETALLE LATERAL DE LA PIEZA */}
      {sel && (
        <div style={{ width: 250, background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderLeft: `1px solid ${BD}`, overflowY: 'auto', flexShrink: 0, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <div><div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: P, fontVariantNumeric: 'tabular-nums' }}>Pieza {sel}</div><div style={{ fontSize: 13, color: MU, fontWeight: 500 }}>{TNAME[sel] || '—'}</div></div>
            <button onClick={() => setSel(null)} style={{ background: '#F5F5F5', border: 'none', borderRadius: '50%', width: 36, height: 36, minHeight: 36, fontSize: 17, cursor: 'pointer', color: MU, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {mode === 'evolución' && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: MU, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>Estado del tratamiento</div>
              {itemsPieza.length === 0 ? (
                <div style={{ fontSize: 13, color: MU, lineHeight: 1.5, background: MT, border: `1px solid ${BD}`, borderRadius: '14px', padding: 12 }}>
                  {allF.some(f => String(f.n) === String(sel)) ? (
                    <>
                      Esta pieza aún no tiene un tratamiento en el Plan.
                      {onGenerarSugerencia && (
                        <button onClick={onGenerarSugerencia}
                          style={{ display: 'block', marginTop: 8, width: '100%', padding: '9px', minHeight: 36, background: LT, color: P, border: `1px solid ${P}`, borderRadius: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Generar sugerencias del odontograma
                        </button>
                      )}
                    </>
                  ) : 'Marca un hallazgo en esta pieza para poder generar su tratamiento.'}
                </div>
              ) : itemsPieza.map(item => (
                <div key={item.id} style={{ background: sc(item.status).bg, border: `1px solid color-mix(in srgb, ${sc(item.status).c} 33%, transparent)`, borderRadius: '14px', padding: '12px 14px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: '10px', background: '#fff', color: sc(item.status).c, whiteSpace: 'nowrap' }}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {item.status === 'pendiente' && (
                    <button onClick={() => setPlan(p => p.map(i => i.id === item.id ? { ...i, status: 'en_curso' } : i))}
                      style={{ marginTop: 8, width: '100%', padding: '9px', minHeight: 36, background: sc('en_curso').c, color: '#fff', border: 'none', borderRadius: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Iniciar tratamiento
                    </button>
                  )}
                  {item.status === 'en_curso' && (
                    <button onClick={() => setPlan(p => p.map(i => i.id === item.id ? { ...i, status: 'completado' } : i))}
                      style={{ marginTop: 8, width: '100%', padding: '9px', minHeight: 36, background: sc('completado').c, color: '#fff', border: 'none', borderRadius: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Marcar como completado
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: MU, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>Vista Oclusal</div>
            <OcclusalMap num={sel} surfs={selSurfs} activeTool={act} onSurf={sf => applySurf(sel, sf)} size={160} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 15 }}>
            <button onClick={() => applyAll(sel)} style={{ flex: 1, background: at.col, color: at.tc, border: 'none', borderRadius: '10px', padding: '11px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Aplicar toda pieza</button>
            <button onClick={() => setCurrentTeeth(p => { const next = JSON.parse(JSON.stringify(p||{})); delete next[sel]; return next; })} style={{ background: '#FEE2E2', color: RJ, border: `1px solid color-mix(in srgb, ${RJ} 27%, transparent)`, borderRadius: '10px', padding: '11px 14px', minHeight: 44, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>↺</button>
          </div>

          <div style={{ fontSize: 12, color: MU, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>Superficies</div>
          {getSurfs(sel).map(sf => {
            const c = selSurfs[sf], t = gt(c), has = c && c !== 'normal';
            const bad = has && isBad(c);
            return (
              <div key={sf} onClick={() => applySurf(sel, sf)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, padding: '10px 12px', minHeight: 44, boxSizing: 'border-box', borderRadius: '10px', cursor: 'pointer', background: has ? (t.g === 'r' ? '#FEE2E2' : 'rgba(114, 157, 238, 0.12)') : LT, border: `1px solid ${has ? `color-mix(in srgb, ${t.g === 'r' ? RJ : AZ} 27%, transparent)` : BD}` }}>
                <div style={{ width: 28, height: 28, borderRadius: '10px', background: has ? (t.g === 'r' ? RJ : AZ) : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: has ? '#fff' : '#9AA1AC', fontWeight: 600 }}>{sf}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: has ? 600 : 500, color: has ? (t.g === 'r' ? RJ : AZ) : MU }}>{has ? t.lbl : 'Sin hallazgo'}</div>
                  {bad && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: RJ, fontWeight: 600, marginTop: 3 }}>
                      <Icon name="warning" size={11} /> Marcado en mal estado
                    </div>
                  )}
                  {has && t.g === 'a' && (
                    <label onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 11, lineHeight: 1.4, color: MU, cursor: 'pointer', fontWeight: 500 }}>
                      <input type="checkbox" checked={bad} onChange={() => toggleBadFlag(sel, sf)} style={{ accentColor: P, transform: 'scale(0.9)' }} />
                      Marcar como en mal estado (necesita reemplazo)
                    </label>
                  )}
                </div>
                {has && <span style={{ fontSize: 15, color: MU, fontWeight: 600 }}>✕</span>}
              </div>
            );
          })}

          <div style={{ fontSize: 12, color: MU, marginTop: 15, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>Notas de pieza</div>
          <textarea placeholder="Observaciones específicas..." defaultValue={selSurfs.note || ''} onBlur={e => setCurrentTeeth(p => { const next = JSON.parse(JSON.stringify(p||{})); if(!next[sel]) next[sel] = JSON.parse(JSON.stringify(currentTeeth[sel] || {})); next[sel].note = e.target.value; return next; })}
            style={{ width: '100%', minHeight: 60, padding: 10, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, lineHeight: 1.5, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box', background: '#F5F5F5' }} />
        </div>
      )}
      </div>
    </div>
  );
}

// ============================================================================
// 3.5 SUB-COMPONENTES ANAMNESIS: par de checkboxes No/Sí (con o sin detalle)
// ============================================================================
function AnamnesisSiNo({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', minHeight: 36, boxSizing: 'border-box' }}>
      <span style={{ fontSize: 13.5, color: DN }}>{label}</span>
      <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MU, cursor: 'pointer' }}>
          <input type="checkbox" checked={value === 'no'} onChange={() => onChange(value === 'no' ? '' : 'no')} style={{ accentColor: P, cursor: 'pointer' }} /> No
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MU, cursor: 'pointer' }}>
          <input type="checkbox" checked={value === 'si'} onChange={() => onChange(value === 'si' ? '' : 'si')} style={{ accentColor: P, cursor: 'pointer' }} /> Sí
        </label>
      </div>
    </div>
  );
}

function AnamnesisSiNoDetalle({ label, value, detalle, onChange, onChangeDetalle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', minHeight: 36, boxSizing: 'border-box', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13.5, color: DN, flex: '1 1 240px' }}>{label}</span>
      <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MU, cursor: 'pointer' }}>
          <input type="checkbox" checked={value === 'no'} onChange={() => onChange(value === 'no' ? '' : 'no')} style={{ accentColor: P, cursor: 'pointer' }} /> No
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MU, cursor: 'pointer' }}>
          <input type="checkbox" checked={value === 'si'} onChange={() => onChange(value === 'si' ? '' : 'si')} style={{ accentColor: P, cursor: 'pointer' }} /> Sí
        </label>
      </div>
      <input value={detalle || ''} onChange={e => onChangeDetalle(e.target.value)} placeholder="Detalle (opcional)"
        style={{ flex: '1 1 180px', border: `1px solid ${BD}`, borderRadius: '10px', padding: '7px 10px', minHeight: 36, background: LT, fontSize: 13, color: DN, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

// Campos de la ficha de filiación. labelStyleDoc/inputStyleDoc (constants.js) todavía
// traen hex fijos y una escala de 10-12px; aquí se re-tintan con los tokens del tema y
// se suben a la escala tipográfica nueva, sin tocar el archivo compartido.
const labelDoc = { ...labelStyleDoc, fontSize: '12px', fontWeight: '600', color: MU, marginBottom: '6px' };
const inputDoc = { ...inputStyleDoc, fontSize: '15px', height: '40px', padding: '9px 12px', borderRadius: '10px', color: DN, border: `1px solid ${BD}`, background: LT };

// ============================================================================
// 4. COMPONENTE PRINCIPAL HISTORIA
// ============================================================================
export default function Historia({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion, clinicaId, clinica, setView, onVolver }) {
  // Columnas de los formularios (Filiación/Anamnesis) según el ancho real --
  // calcado de "grid-cols-1 md:grid-cols-2 lg:grid-cols-3": 1 en pantallas
  // angostas, 2 en tablet, 3 en desktop, donde antes era un número fijo.
  const { isTablet, isNarrow } = useResponsive();
  const colsFormulario = isNarrow ? 1 : isTablet ? 2 : 3;

  const [tab, setTab] = useState('filiacion');
  const [patData, setPatData] = useState(patient);

  useEffect(() => {
    setPatData(patient);
  }, [patient]);

  // El acceso directo a Ortodoncia solo se ofrece si el paciente ya tiene un
  // tratamiento iniciado: mandarlo si no lo tiene lo dejaría en una sección
  // donde no aparece, que es peor que no mostrar el botón.
  const [tieneOrtodoncia, setTieneOrtodoncia] = useState(false);
  useEffect(() => {
    let vivo = true;
    if (!patient?.id) return;
    supabase.from('ortodoncia').select('id').eq('paciente_id', patient.id).maybeSingle()
      .then(({ data }) => { if (vivo) setTieneOrtodoncia(!!data); });
    return () => { vivo = false; };
  }, [patient?.id]);

  
  // --- ESTADOS GENERALES DE HISTORIA ---
  const [isEditingFiliacion, setIsEditingFiliacion] = useState(false);
  const [plan, setPlan] = useState([
    { id: 1, name: 'Control ortodoncia', tooth: '14-23', status: 'en_curso', cost: 80, paid: 80, date: '10 Jun 2025', sessions: 1 },
    { id: 2, name: 'Blanqueamiento clínico', tooth: '—', status: 'pendiente', cost: 180, paid: 0, date: '—', sessions: 1 },
    { id: 3, name: 'Radiografía panorámica', tooth: '—', status: 'completado', cost: 45, paid: 45, date: '10 Jun 2025', sessions: 1 },
  ]);
  const [showTreatPicker, setShowTreatPicker] = useState(false);
  const [draftTreatment, setDraftTreatment] = useState(null); // tratamiento seleccionado, pendiente de detalles
const [editingItemId, setEditingItemId] = useState(null);   // id del item en edición inline
const [editDraft, setEditDraft] = useState({});
const [showPagoModal, setShowPagoModal] = useState(false);
const [pagoDraft, setPagoDraft] = useState({ itemId: '', monto: '' });
const [periodontalDx, setPeriodontalDx] = useState('Ninguno'); // diagnóstico periodontal — a nivel de boca completa, no por pieza
  
  const TABS = [{ id: 'filiacion', lbl: 'Filiación' }, { id: 'anamnesis', lbl: 'Anamnesis' }, { id: 'odontograma', lbl: 'Odontograma' }, { id: 'plan', lbl: 'Plan trat.' }, { id: 'evolucion', lbl: 'Evolución' }, { id: 'recetas', lbl: 'Recetas' }, { id: 'imagenes', lbl: 'Imágenes' }, { id: 'presupuesto', lbl: 'Presupuesto' }, { id: 'consentimientos', lbl: 'Consentimientos' }];
  
  const [anamnesisData, setAnamnesisData] = useState({});
  const [imagenesList, setImagenesList] = useState([]);
  // Copia de imagenesList con la URL firmada de cada archivo (bucket privado).
  // Se mantiene aparte para que .url siga siendo el localizador guardado, que es
  // lo que necesita el borrado.
  const [imagenesFirmadas, setImagenesFirmadas] = useState([]);

  useEffect(() => {
    let vivo = true;
    const resolver = async () => {
      const firmadas = await Promise.all(
        (imagenesList || []).map(async img => ({ ...img, urlFirmada: await firmar(img.url) }))
      );
      if (vivo) setImagenesFirmadas(firmadas);
    };
    resolver();
    return () => { vivo = false; };
  }, [imagenesList]);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});

  // --- EVOLUCIÓN (notas clínicas por consulta) ---
  const [notasEvolucion, setNotasEvolucion] = useState([]);
  const [showNuevaNota, setShowNuevaNota] = useState(false);
  const [nuevaNotaTexto, setNuevaNotaTexto] = useState('');
  const [savingNota, setSavingNota] = useState(false);
  const notaTextareaRef = useRef(null);

  // --- RECETAS (historial de recetas; recetas[0] es la receta activa) ---
  const [recetas, setRecetas] = useState([]);
  const [medDraft, setMedDraft] = useState({ med: '', dose: '', inst: '' });
  const [savingReceta, setSavingReceta] = useState(false);

  // --- FIRMA Y SELLO DEL DOCTOR (por clínica, no por paciente) ---
  // Solo lectura aquí: se sube/gestiona desde Ajustes → Mi perfil.
  const [firmaDoctorUrl, setFirmaDoctorUrl] = useState(null);

  useEffect(() => {
    let vivo = true;
    const resolver = async () => {
      if (!clinicaId) { setFirmaDoctorUrl(null); return; }
      // Bucket privado: se firma la ruta. La URL firmada dura una hora, más que
      // suficiente para la ventana de impresión de recetas y presupuestos.
      const url = await firmar(rutaFirma(clinicaId));
      if (vivo) setFirmaDoctorUrl(url);
    };
    resolver();
    return () => { vivo = false; };
  }, [clinicaId]);

  useEffect(() => {
    const datosDelPaciente = patData || patient;
    if (datosDelPaciente) setEditForm(datosDelPaciente);
  }, [patData, patient]);
  
  const handleSaveEditPatient = async () => {
    setSaving(true);
    const { data, error } = await supabase.from('pacientes').update({
      name: editForm.name, doc: editForm.doc, tipo_doc: editForm.tipo_doc, phone: editForm.phone, cod_pais: editForm.cod_pais, email: editForm.email,
      direccion: editForm.direccion, sexo: editForm.sexo, birthDate: editForm.birthDate, age: editForm.age, blood: editForm.blood, allergies: editForm.allergies,
      num_hc: editForm.num_hc, pais_nacimiento: editForm.pais_nacimiento, ocupacion: editForm.ocupacion, fuente_captacion: editForm.fuente_captacion,
      linea_negocio: editForm.linea_negocio, apoderado: editForm.apoderado, apoderado_dni: editForm.apoderado_dni, parentesco: editForm.parentesco
    }).eq('id', patData.id).select();
    if (error) alert("Error al guardar en Supabase: " + error.message);
    else if (data && data.length > 0) { setPatData(data[0]); setIsEditingFiliacion(false); alert("✅ Datos guardados y bloqueados correctamente."); }
    setSaving(false);
  };
  
  const handleCancelEdit = () => { setEditForm(patData); setIsEditingFiliacion(false); };
  
  useEffect(() => {
    const loadCloudData = async () => {
      if (!patient?.id) return;

      // 1. ⚡ BARRER LA MEMORIA GENERAL ANTES DE CARGAR AL NUEVO PACIENTE ⚡
      setTeeth({}); 
      setTeethEvolucion({});
      setAnamnesisData({});
      setPlan([]);
      setImagenesList([]);
      setPeriodontalDx('Ninguno');
      setNotasEvolucion([]);
      setShowNuevaNota(false);
      setRecetas([]);

      // 2. CERRAR MODOS DE EDICIÓN
      setIsEditingFiliacion(false);

      const { data } = await supabase.from('historias').select('*').eq('patient_id', patient.id).maybeSingle();
      if (data) {
        if (data.odontograma && Object.keys(data.odontograma).length > 0) setTeeth(data.odontograma);
        if (data.evolucion && Object.keys(data.evolucion).length > 0) setTeethEvolucion(data.evolucion);
        if (data.anamnesis) setAnamnesisData(data.anamnesis);
        if (data.plan_tratamiento) setPlan(data.plan_tratamiento);
        if (data.imagenes) setImagenesList(data.imagenes);
        if (data.periodontal) setPeriodontalDx(data.periodontal.diagnostico);
        if (data.notas_evolucion) setNotasEvolucion(data.notas_evolucion);
        if (Array.isArray(data.receta) && data.receta.length > 0) {
          // Compatibilidad: registros guardados antes del historial de recetas
          // eran una lista plana de medicamentos, no un historial de recetas.
          const esFormatoAntiguo = !data.receta[0].meds;
          setRecetas(esFormatoAntiguo
            ? [{ id: Date.now(), date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }), meds: data.receta }]
            : data.receta);
        }
      }
    };
    loadCloudData();
  }, [patient?.id, setTeeth, setTeethEvolucion]);
  
  const saveAllToCloud = async () => {
    setSaving(true);
    const limpiarDientes = (dientesBase) => {
      const limpios = {};
      Object.keys(dientesBase || {}).forEach(num => {
        const pieza = dientesBase[num];
        const superficies = getSurfs(num);
        const valores = superficies.map(s => pieza[s]).filter(v => v && v !== 'normal');
        const esTodoIgual = valores.length === superficies.length && valores.every(v => v === valores[0]);
        if (esTodoIgual) {
          limpios[num] = { todaPieza: valores[0] };
          if (pieza.note) limpios[num].note = pieza.note;
        } else {
          const filtrada = {};
          let tieneHallazgo = false;
          Object.keys(pieza).forEach(k => {
            const v = pieza[k];
            if (k === 'note' && v && v.trim() !== '') { filtrada[k] = v; tieneHallazgo = true; }
            else if (k !== 'note' && v && v !== 'normal') { filtrada[k] = v; tieneHallazgo = true; }
          });
          if (tieneHallazgo) limpios[num] = filtrada;
        }
      });
      return limpios;
    };
    const cleanInicial = limpiarDientes(teeth);
    const cleanEvo = limpiarDientes(teethEvolucion);
    setTeeth(cleanInicial); setTeethEvolucion(cleanEvo);
    const { error } = await supabase.from('historias').upsert({ patient_id: patient.id, clinica_id: clinicaId, odontograma: cleanInicial, evolucion: cleanEvo, anamnesis: anamnesisData, plan_tratamiento: plan, imagenes: imagenesList, periodontal: { diagnostico: periodontalDx } }, { onConflict: 'patient_id' });
    if (error) alert("Error al guardar: " + error.message);
    else alert("¡Datos guardados con éxito!");
    setSaving(false);
  };

  // Mapeo de material azul (buen estado) → tratamiento de reemplazo sugerido cuando se marca isBad()
  const REEMPLAZO_POR_MATERIAL = {
    r_r: 'Resina compuesta',
    r_am: 'Amalgama',
    r_iv: 'Ionómero de vidrio',
    r_im: 'Incrustación metálica',
    r_ie: 'Incrustación estética',
    cc: 'Corona metal-cerámica',
    cmc: 'Corona metal-cerámica',
    cj: 'Corona metal-cerámica',
    imp: 'Implante dental',
  };

  // Sugerencias de tratamiento según el diagnóstico periodontal (a nivel de boca completa)
  const PERIODONTAL_TRATAMIENTOS = {
    'Gingivitis leve': [{ name: 'Tratamiento de gingivitis leve', cost: 100 }],
    'Gingivitis moderada': [{ name: 'Tratamiento de gingivitis moderada', cost: 150 }],
    'Gingivitis severa': [{ name: 'Tratamiento de gingivitis severa', cost: 180 }],
    'Periodontitis': [
      { name: 'Tratamiento periodontal', cost: 180 },
      { name: 'Referencia a Periodoncista', cost: 0 },
    ],
  };

  const generarDesdeOdontograma = () => {
    const sugerencias = [];

    [teeth, teethEvolucion].forEach(dientesBase => {
      Object.entries(dientesBase || {}).forEach(([num, pieza]) => {
        const superficies = getSurfs(num);
        const entradas = pieza.todaPieza
          ? superficies.map(s => [s, pieza.todaPieza])
          : Object.entries(pieza).filter(([k]) => k !== 'note' && k !== 'todaPieza');

        const valores = entradas.map(([, v]) => v).filter(v => v && v !== 'normal');
        if (valores.length === 0) return;

        // Un solo tratamiento sugerido por pieza (no por cara): extracción > reemplazo > caries
        if (valores.some(v => baseId(v) === 'extraer')) {
          sugerencias.push({ tooth: num, name: 'Extracción simple', cost: PRECIOS['Extracción simple'] || 0 });
          return;
        }

        const valorBad = valores.find(v => isBad(v) && REEMPLAZO_POR_MATERIAL[baseId(v)]);
        if (valorBad) {
          const nombreBase = REEMPLAZO_POR_MATERIAL[baseId(valorBad)];
          sugerencias.push({ tooth: num, name: `${nombreBase} (reemplazo)`, cost: PRECIOS[nombreBase] || 0 });
          return;
        }

        if (valores.some(v => baseId(v) === 'caries')) {
          sugerencias.push({ tooth: num, name: 'Resina compuesta', cost: PRECIOS['Resina compuesta'] || 0 });
        }
      });
    });

    // Evaluación periodontal — es a nivel de boca completa, sin pieza asociada.
    // El tratamiento de gingivitis/periodontitis ya incluye la limpieza y profilaxis,
    // así que no se sugiere aparte (evita duplicar el cobro).
    const sugerenciasPeriodontal = PERIODONTAL_TRATAMIENTOS[periodontalDx] || [];
    sugerenciasPeriodontal.forEach(t => {
      sugerencias.push({ tooth: '—', name: t.name, cost: t.cost });
    });

    if (sugerencias.length === 0) {
      alert('No se detectaron hallazgos en el odontograma para sugerir al plan de tratamiento.');
      return;
    }

    // Deduplicar por pieza+tratamiento (por si la misma pieza aparece en inicial y evolución)
    const sugerenciasUnicas = Array.from(
      new Map(sugerencias.map(s => [`${s.tooth}|${s.name}`, s])).values()
    );

    // Un tratamiento periodontal generado con un diagnóstico anterior (ej. se cambió de
    // "leve" a "moderada") debe quedar reemplazado, no duplicado junto al nuevo
    const nombresPeriodontalVigentes = new Set(sugerenciasPeriodontal.map(t => t.name));
    const nombresPeriodontalTodos = new Set(Object.values(PERIODONTAL_TRATAMIENTOS).flat().map(t => t.name));
    const esPeriodontalObsoleto = item =>
      item.tooth === '—' &&
      item.notes === 'Generado automáticamente desde el odontograma' &&
      nombresPeriodontalTodos.has(item.name) &&
      !nombresPeriodontalVigentes.has(item.name);

    // No repetir sugerencias que ya estén vigentes en el plan (ej. si se pulsa el botón más de una vez)
    const yaExiste = (tooth, name) => plan.some(item => String(item.tooth) === String(tooth) && item.name === name && !esPeriodontalObsoleto(item));
    const nuevas = sugerenciasUnicas.filter(s => !yaExiste(s.tooth, s.name));

    const removidos = plan.filter(esPeriodontalObsoleto).length;
    if (nuevas.length === 0 && removidos === 0) {
      alert('Las sugerencias detectadas ya estaban en el plan de tratamiento.');
      return;
    }

    setPlan(p => [
      ...p.filter(item => !esPeriodontalObsoleto(item)),
      ...nuevas.map((s, i) => ({
        id: Date.now() + i,
        name: s.name, tooth: s.tooth, status: 'pendiente',
        cost: s.cost, paid: 0, date: new Date().toISOString().slice(0, 10),
        sessions: 1, notes: 'Generado automáticamente desde el odontograma',
      })),
    ]);

    if (removidos > 0) {
      alert(`Se actualizó el tratamiento periodontal en el plan${nuevas.length > removidos ? ` y se agregaron ${nuevas.length - removidos} sugerencia(s) más` : ''}.`);
    } else {
      alert(`Se agregaron ${nuevas.length} sugerencia(s) al plan de tratamiento.`);
    }
  };

  const registrarAbono = () => {
    if (!pagoDraft.itemId) { alert('Selecciona un tratamiento.'); return; }
    const monto = parseFloat(pagoDraft.monto);
    if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }

    setPlan(p => p.map(i => {
      if (String(i.id) !== String(pagoDraft.itemId)) return i;
      const saldo = i.cost - i.paid;
      const abono = Math.min(monto, saldo);
      const nuevoPaid = i.paid + abono;
      return { ...i, paid: nuevoPaid, status: nuevoPaid >= i.cost ? 'completado' : (i.status === 'pendiente' ? 'en_curso' : i.status) };
    }));
    setShowPagoModal(false);
    setPagoDraft({ itemId: '', monto: '' });
    alert('Abono registrado. Recuerda hacer clic en "Guardar en Nube" para persistirlo.');
  };

  const imprimirPresupuesto = () => {
    if (plan.length === 0) { alert('No hay tratamientos en el plan para generar un presupuesto.'); return; }

    // Escapa también & y comillas: hay valores que se interpolan dentro de
    // atributos (src="..."), donde escapar solo < y > no alcanza.
    const esc = s => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const nombre = esc(patData?.name || patient.name);
    const totalCosto = plan.reduce((a, c) => a + c.cost, 0);
    const totalPagado = plan.reduce((a, c) => a + c.paid, 0);
    const totalSaldo = totalCosto - totalPagado;
    const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Presupuesto - ${nombre}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#fff}
      .page{width:210mm;min-height:297mm;margin:0 auto;padding:18mm 20mm}
      .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0087b3;padding-bottom:14px;margin-bottom:18px}
      .header-left{display:flex;align-items:center;gap:12px}
      .header-left img{width:56px;height:56px;object-fit:contain}
      .clinic-name{font-size:16px;font-weight:800;color:#0087b3}
      .clinic-sub{font-size:10.5px;color:#64748b;margin-top:2px}
      .doc-title{text-align:right}
      .doc-title .lbl{font-size:20px;font-weight:900;color:#0f172a;letter-spacing:.5px}
      .doc-title .date{font-size:11px;color:#64748b;margin-top:2px;text-transform:capitalize}
      .patient-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:12.5px}
      .patient-box b{color:#0087b3}
      table{width:100%;border-collapse:collapse;margin-bottom:4px}
      th{background:#f1f5f9;text-align:left;font-size:11px;color:#64748b;padding:10px 12px;border-bottom:2px solid #e2e8f0}
      td{padding:10px 12px;font-size:12px;border-bottom:1px solid #e2e8f0}
      tfoot td{font-weight:800;border-top:2px solid #0f172a;border-bottom:none}
      .saldo-pos{color:#ef4444}
      .saldo-zero{color:#10b981}
      .validity{margin-top:22px;font-size:10.5px;color:#94a3b8;text-align:center}
      .footer{margin-top:40px;text-align:center;font-size:9.5px;color:#94a3b8;border-top:1px solid #eee;padding-top:10px}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
      <div class="page">
        <div class="header">
          <div class="header-left">
            <img src="/logo_web.png" alt="Logo" />
            <div>
              <div class="clinic-name">Consultorio Dra. Sol Vargas</div>
              <div class="clinic-sub">Los Diamantes 178, Trujillo 13011, Perú · +51 915 054 145</div>
            </div>
          </div>
          <div class="doc-title"><div class="lbl">PRESUPUESTO</div><div class="date">${fecha}</div></div>
        </div>

        <div class="patient-box">
          <b>Paciente:</b> ${nombre} &nbsp;·&nbsp;
          <b>DNI:</b> ${esc(patData?.doc || patient.doc || '—')} &nbsp;·&nbsp;
          <b>Edad:</b> ${esc(patData?.age || patient.age || '—')} años
        </div>

        <table>
          <thead><tr><th>Tratamiento</th><th>Pieza</th><th>Costo (S/)</th><th>Abonado (S/)</th><th>Saldo (S/)</th></tr></thead>
          <tbody>
            ${plan.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.tooth)}</td><td>${i.cost.toFixed(2)}</td><td>${i.paid.toFixed(2)}</td><td class="${(i.cost - i.paid) > 0 ? 'saldo-pos' : 'saldo-zero'}">${(i.cost - i.paid).toFixed(2)}</td></tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="2">TOTALES</td><td>${totalCosto.toFixed(2)}</td><td>${totalPagado.toFixed(2)}</td><td class="${totalSaldo > 0 ? 'saldo-pos' : 'saldo-zero'}">${totalSaldo.toFixed(2)}</td></tr>
          </tfoot>
        </table>

        <div class="validity">Este presupuesto tiene una validez de 30 días a partir de la fecha de emisión. Los precios pueden variar según hallazgos clínicos adicionales.</div>
        <div class="footer">Consultorio Dra. Sol Vargas · Los Diamantes 178, Trujillo 13011, Perú · +51 915 054 145</div>
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const enviarPresupuestoWhatsApp = () => {
    if (plan.length === 0) { alert('No hay tratamientos en el plan para generar un presupuesto.'); return; }

    const telefono = toWhatsAppNumber(patData?.phone || patient.phone);
    if (!telefono) { alert('El paciente no tiene un número de celular registrado.'); return; }

    const nombre = patData?.name || patient.name;
    const totalCosto = plan.reduce((a, c) => a + c.cost, 0);
    const totalPagado = plan.reduce((a, c) => a + c.paid, 0);
    const totalSaldo = totalCosto - totalPagado;

    const lineas = plan.map(i => `• ${i.name}${i.tooth && i.tooth !== '—' ? ` (Pieza ${i.tooth})` : ''}: S/${i.cost.toFixed(2)}`).join('\n');

    const mensaje = `Hola ${nombre} 👋, aquí tienes tu presupuesto del *Consultorio Dra. Sol Vargas*:\n\n${lineas}\n\n💰 Total: S/${totalCosto.toFixed(2)}\n✅ Abonado: S/${totalPagado.toFixed(2)}\n${totalSaldo > 0 ? '🔴' : '🟢'} Saldo pendiente: S/${totalSaldo.toFixed(2)}\n\nCualquier consulta, escríbenos. ¡Gracias por tu confianza! 🦷`;

    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };


  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaving(true);
    const fileName = rutaImagenPaciente(clinicaId, patient.id, file.name);
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(fileName, file);
    if (uploadError) { alert('Error al subir la imagen: ' + uploadError.message); setSaving(false); return; }
    // Se guarda la RUTA, no una URL pública: el bucket es privado y la firma se
    // genera al mostrar. Los registros antiguos con URL completa siguen
    // funcionando porque firmar() deriva la ruta de la URL.
    const nuevaImagen = { type: 'Radiografía / Foto', date: new Date().toLocaleDateString('es-PE'), url: fileName };
    const nuevaLista = [...imagenesList, nuevaImagen];
    setImagenesList(nuevaLista);
    await supabase.from('historias').upsert({ patient_id: patient.id, clinica_id: clinicaId, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    setSaving(false);
    alert("¡Imagen subida y guardada correctamente!");
  };
  
  const handleDeleteImage = async (indexToDelete, imageUrl) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta imagen permanentemente?")) return;
    setSaving(true);
    try {
      await supabase.storage.from(BUCKET).remove([rutaDesdeUrl(imageUrl)]);
      const nuevaLista = imagenesList.filter((_, i) => i !== indexToDelete);
      setImagenesList(nuevaLista);
      await supabase.from('historias').upsert({ patient_id: patient.id, clinica_id: clinicaId, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    } catch (err) { console.error(err); alert("Hubo un error al intentar eliminar la imagen."); } finally { setSaving(false); }
  };

  const handleAgregarNotaEvolucion = async () => {
    if (!nuevaNotaTexto.trim()) { alert('Escribe una nota antes de guardar.'); return; }
    setSavingNota(true);
    const nuevaNota = {
      id: Date.now(),
      date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
      dr: 'Dra. Sol Vargas',
      txt: nuevaNotaTexto.trim(),
    };
    const listaActualizada = [nuevaNota, ...notasEvolucion];
    const { error } = await supabase.from('historias').upsert({ patient_id: patient.id, clinica_id: clinicaId, notas_evolucion: listaActualizada }, { onConflict: 'patient_id' });
    if (error) { alert('Error al guardar la nota: ' + error.message); setSavingNota(false); return; }
    setNotasEvolucion(listaActualizada);
    setNuevaNotaTexto('');
    setSavingNota(false);
  };

  const handleEliminarNotaEvolucion = async (id) => {
    if (!window.confirm('¿Eliminar esta nota de evolución?')) return;
    const listaActualizada = notasEvolucion.filter(n => n.id !== id);
    setNotasEvolucion(listaActualizada);
    await supabase.from('historias').upsert({ patient_id: patient.id, clinica_id: clinicaId, notas_evolucion: listaActualizada }, { onConflict: 'patient_id' });
  };

  const fechaLarga = () => new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

  const guardarRecetas = async (listaActualizada) => {
    setRecetas(listaActualizada);
    setSavingReceta(true);
    const { error } = await supabase.from('historias').upsert({ patient_id: patient.id, clinica_id: clinicaId, receta: listaActualizada }, { onConflict: 'patient_id' });
    if (error) alert('Error al guardar la receta: ' + error.message);
    setSavingReceta(false);
  };

  const handleAgregarMedicamento = () => {
    if (!medDraft.med.trim()) { alert('Ingresa al menos el nombre del medicamento.'); return; }
    const nuevoMed = { id: Date.now(), med: medDraft.med.trim(), dose: medDraft.dose.trim(), inst: medDraft.inst.trim() };
    const listaActualizada = recetas.length === 0
      ? [{ id: Date.now(), date: fechaLarga(), meds: [nuevoMed] }]
      : recetas.map((r, i) => i === 0 ? { ...r, meds: [...r.meds, nuevoMed] } : r);
    guardarRecetas(listaActualizada);
    setMedDraft({ med: '', dose: '', inst: '' });
  };

  const handleEliminarMedicamento = (recetaId, medId) => {
    guardarRecetas(recetas.map(r => r.id === recetaId ? { ...r, meds: r.meds.filter(m => m.id !== medId) } : r));
  };

  const handleNuevaReceta = () => {
    if (recetas.length > 0 && recetas[0].meds.length === 0) {
      alert('La receta actual todavía está vacía.');
      return;
    }
    guardarRecetas([{ id: Date.now(), date: fechaLarga(), meds: [] }, ...recetas]);
  };

  const imprimirReceta = (receta) => {
    if (!receta || receta.meds.length === 0) { alert('Esta receta no tiene medicamentos.'); return; }
    // Escapa también & y comillas: hay valores que se interpolan dentro de
    // atributos (src="..."), donde escapar solo < y > no alcanza.
    const esc = s => String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const nombre = esc(patData?.name || patient.name);

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Receta - ${nombre}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#e5e7eb}
      .page{max-width:520px;margin:24px auto;padding:36px 40px;background:#fff;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.1)}
      .header{text-align:center;border-bottom:2px solid #0087b3;padding-bottom:14px;margin-bottom:20px}
      .header .clinic{font-size:15px;font-weight:800;color:#0087b3}
      .header .sub{font-size:10.5px;color:#64748b;margin-top:2px}
      .patient-box{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;margin-bottom:22px;font-size:12px}
      .patient-box b{color:#0087b3}
      .rp{font-size:13px;font-weight:800;margin-bottom:12px}
      .med{margin-bottom:12px;padding-bottom:10px;border-bottom:1px dashed #e2e8f0}
      .med .name{font-size:13px;font-weight:700}
      .med .dose{font-size:11.5px;color:#475569;margin-left:14px}
      .med .inst{font-size:10.5px;color:#64748b;font-style:italic;margin-left:14px}
      .firma{margin-top:44px;text-align:center}
      .firma img{max-height:60px;max-width:220px;object-fit:contain}
      .firma .line{border-top:1px solid #333;width:220px;margin:0 auto;padding-top:6px;font-size:10.5px;color:#333}
      @media print{
        body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .page{max-width:none;margin:0;padding:16mm 18mm;box-shadow:none;border-radius:0}
      }
    </style></head><body>
      <div class="page">
        <div class="header">
          <div class="clinic">Consultorio Dra. Sol Vargas · Cirujano Dentista · COP 12345</div>
          <div class="sub">Los Diamantes 178, Trujillo 13011, Perú · +51 915 054 145</div>
        </div>
        <div class="patient-box">
          <div><b>Paciente:</b> ${nombre}</div>
          <div><b>Fecha:</b> ${esc(receta.date)}</div>
          <div><b>DNI:</b> ${esc(patData?.doc || patient.doc || '—')}</div>
          <div><b>Edad:</b> ${esc(patData?.age || patient.age || '—')} años</div>
        </div>
        <div class="rp">Rp:</div>
        ${receta.meds.map(m => `<div class="med"><div class="name">${esc(m.med)}</div>${m.dose ? `<div class="dose">${esc(m.dose)}</div>` : ''}${m.inst ? `<div class="inst">${esc(m.inst)}</div>` : ''}</div>`).join('')}
        <div class="firma">
          ${firmaDoctorUrl ? `<img src="${esc(firmaDoctorUrl)}" alt="Firma y sello" />` : ''}
          <div class="line">Firma y sello · Dra. Sol Vargas</div>
        </div>
      </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const enviarRecetaWhatsApp = (receta) => {
    if (!receta || receta.meds.length === 0) { alert('Esta receta no tiene medicamentos.'); return; }
    const telefono = toWhatsAppNumber(patData?.phone || patient.phone);
    if (!telefono) { alert('El paciente no tiene un número de celular registrado.'); return; }

    const nombre = patData?.name || patient.name;
    const lineas = receta.meds.map(m => `- ${m.med}${m.dose ? ` — ${m.dose}` : ''}${m.inst ? ` (${m.inst})` : ''}`).join('\n');
    const mensaje = `Hola ${nombre}, esta es tu receta médica del Consultorio Dra. Sol Vargas (${receta.date}):\n\n${lineas}\n\nCualquier duda, escríbenos. Que te mejores pronto.`;

    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  if (!patient) return null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* CABECERA DE HISTORIA */}
      <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderBottom: `1px solid ${BD}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, flexWrap: 'wrap' }}>
        {/* El expediente ahora ocupa toda la pantalla (ya no comparte espacio
            con el Directorio) -- este botón es la única forma de volver. */}
        {onVolver && (
          <button
            onClick={onVolver}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
              background: 'transparent', border: `1px solid ${BD}`, borderRadius: '10px',
              padding: '9px 14px', minHeight: 36, fontSize: 13, fontWeight: 600, color: MU, cursor: 'pointer',
            }}
          >
            <Icon name="chevronDown" size={13} style={{ transform: 'rotate(90deg)' }} /> Directorio
          </button>
        )}
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 600, color: P, flexShrink: 0 }}>{ini(patData?.name || patient.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: DN }}>{patData?.name || patient.name}</div>
          </div>
          <div style={{ fontSize: 12, color: MU, marginTop: 4, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
            <Icon name="phone" size={12} /> {patData?.phone || 'Sin celular'} · <Icon name="mail" size={12} /> {patData?.email || 'Sin email'} · DNI: {patData?.doc} · {patData?.age} años · {patData?.blood || 'O+'} {patData?.sexo ? `· ${patData.sexo}` : ''}
          </div>
          {(patData?.direccion) && (
            <div style={{ fontSize: 11, color: '#9AA1AC', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="pin" size={11} /> {patData.direccion}
            </div>
          )}
        </div>
        {patData?.allergies && patData.allergies !== 'Ninguna' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: '#FEE2E2', color: RJ, padding: '6px 12px', borderRadius: '14px' }}>
            <Icon name="warning" size={12} /> Alergia: {patData.allergies}
          </span>
        )}
        {/* Tarjetita de indicador, mismo lenguaje visual que Stat.jsx (ícono en
            círculo teñido + etiqueta + cifra) en vez de un texto suelto. */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: '#F5F5F5', border: `1px solid ${BD}`, borderRadius: '14px',
          padding: '7px 14px 7px 8px',
        }}>
          <div style={{ width: 30, height: 30, borderRadius: '10px', background: 'rgba(114, 157, 238, 0.12)', color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="calendar" size={14} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, color: MU, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Próx. cita</div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: DN, fontVariantNumeric: 'tabular-nums' }}>{patData?.nextVisit || '---'}</div>
          </div>
        </div>

        {tieneOrtodoncia && (
          <button
            onClick={() => setView?.('ortodoncia', patData || patient)}
            title={`Ver el tratamiento de ortodoncia de ${patData?.name || patient.name}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: LT, color: P, border: `1px solid ${BD}`, borderRadius: '10px', padding: '9px 16px', minHeight: 36, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Icon name="tooth" size={14} /> Ortodoncia
          </button>
        )}

        <button onClick={saveAllToCloud} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Icon name="save" size={14} /> {saving ? 'Guardando...' : 'Guardar en Nube'}
        </button>

        <button style={{ background: WA, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', minHeight: 44, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <Icon name="chat" size={15} />
        </button>
      </div>

      {/* PESTAÑAS PRINCIPALES */}
      <div style={{ display: 'flex', gap: 1, padding: '5px 14px', background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderBottom: `1px solid ${BD}`, flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 14px', minHeight: 36, display: 'flex', alignItems: 'center', boxSizing: 'border-box', borderRadius: '10px', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 600 : 500, background: tab === t.id ? P : 'transparent', color: tab === t.id ? '#fff' : MU, whiteSpace: 'nowrap', transition: 'background-color .18s cubic-bezier(0.25, 0.1, 0.25, 1), color .18s cubic-bezier(0.25, 0.1, 0.25, 1)' }}>
            {t.lbl}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>

       {/* --- PESTAÑA ORTODONCIA --- */}

        {/* --- PESTAÑA FILIACIÓN --- */}
        {tab === 'filiacion' && (
          <div style={{ padding: '30px', overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: MT }}>
            {/* Antes maxWidth:1000 dejaba la tarjeta angosta y centrada con
                grandes vacíos a los lados en una pantalla ancha (el Directorio
                ya es de pantalla completa) -- ahora llena el contenedor, con
                un tope generoso para que en monitores muy anchos no se estire
                al infinito. */}
            <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', boxSizing: 'border-box', background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, borderRadius: '18px', border: GLASS_BORDER, padding: '35px', boxShadow: GLASS_SHADOW }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: DN, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em' }}>Datos Personales</h2>
                <div>
                  {!isEditingFiliacion ? (
                    <button onClick={() => setIsEditingFiliacion(true)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#F5F5F5', color: MU, border: `1px solid ${BD}`, borderRadius: '10px', padding: '10px 20px', minHeight: 44, fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
                      <Icon name="edit" size={14} /> Editar Campos
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleCancelEdit} style={{ background: LT, color: RJ, border: `1px solid color-mix(in srgb, ${RJ} 40%, transparent)`, borderRadius: '10px', padding: '10px 20px', minHeight: 44, fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>Cancelar</button>
                      <button onClick={handleSaveEditPatient} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', minHeight: 44, fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
                        <Icon name="save" size={14} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsFormulario}, 1fr)`, gap: '24px' }}>
                <div><label style={labelDoc}>Nombres y Apellidos</label><input disabled={!isEditingFiliacion} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div>
                <div><label style={labelDoc}>N° HC</label><input readOnly disabled value={editForm.num_hc || ''} placeholder="Autogenerado" style={{ ...inputDoc, background: '#F5F5F5', borderColor: 'transparent', cursor: 'not-allowed', fontWeight: 600, color: MU, fontVariantNumeric: 'tabular-nums' }} /></div>
                <div><label style={labelDoc}>Sexo</label><select disabled={!isEditingFiliacion} value={editForm.sexo || ''} onChange={e => setEditForm({ ...editForm, sexo: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }}><option value="">Seleccionar</option><option value="Mujer">Mujer</option><option value="Hombre">Hombre</option></select></div>
                <div><label style={labelDoc}>Documento</label><div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: '8px' }}><select disabled={!isEditingFiliacion} value={editForm.tipo_doc || ''} onChange={e => setEditForm({ ...editForm, tipo_doc: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }}><option value="DNI">DNI</option><option value="CE">C.E.</option><option value="Pasaporte">Pasap.</option><option value="RUC">RUC</option></select><input disabled={!isEditingFiliacion} value={editForm.doc || ''} onChange={e => setEditForm({ ...editForm, doc: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div></div>
                <div><label style={labelDoc}>Teléfono</label><div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '8px' }}><select disabled={!isEditingFiliacion} value={editForm.cod_pais || '+51'} onChange={e => setEditForm({ ...editForm, cod_pais: e.target.value })} style={{ ...inputDoc, padding: '9px 6px', background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }}>{TODAS_NACIONES.map(n => <option key={n.n} value={n.c}>{n.b} {n.c}</option>)}</select><input disabled={!isEditingFiliacion} value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div></div>
                <div><label style={labelDoc}>Email</label><input disabled={!isEditingFiliacion} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div>
                <div><label style={labelDoc}>F. nacimiento y Edad</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '8px' }}><input disabled={!isEditingFiliacion} type="date" value={editForm.birthDate || ''} onChange={e => { const bDay = e.target.value; let calculatedAge = editForm.age; if (bDay) { const today = new Date(); const birth = new Date(bDay); calculatedAge = today.getFullYear() - birth.getFullYear(); } setEditForm({ ...editForm, birthDate: bDay, age: calculatedAge }); }} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /><input value={editForm.age || ''} readOnly placeholder="Edad" style={{ ...inputDoc, background: '#F5F5F5', textAlign: 'center', borderColor: 'transparent', fontVariantNumeric: 'tabular-nums' }} /></div></div>
                <div><label style={labelDoc}>País de nacimiento</label><select disabled={!isEditingFiliacion} value={editForm.pais_nacimiento || ''} onChange={e => setEditForm({ ...editForm, pais_nacimiento: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }}><option value="">Seleccionar</option>{TODAS_NACIONES.map(n => <option key={n.n} value={n.n}>{n.b} {n.n}</option>)}</select></div>
                <div><label style={labelDoc}>Ocupación</label><input disabled={!isEditingFiliacion} value={editForm.ocupacion || ''} onChange={e => setEditForm({ ...editForm, ocupacion: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={labelDoc}>Dirección</label><input disabled={!isEditingFiliacion} value={editForm.direccion || ''} onChange={e => setEditForm({ ...editForm, direccion: e.target.value })} placeholder="+ Agregar" style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div>
                <div><label style={labelDoc}>Grupo Sanguíneo</label><input disabled={!isEditingFiliacion} value={editForm.blood || ''} onChange={e => setEditForm({ ...editForm, blood: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div>
                <div><label style={labelDoc}>Fuente captación</label><select disabled={!isEditingFiliacion} value={editForm.fuente_captacion || ''} onChange={e => setEditForm({ ...editForm, fuente_captacion: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }}>
                  <option value="">Seleccionar</option>
                  {FUENTE_CAPTACION_GRUPOS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map(v => <option key={v} value={v}>{v}</option>)}
                    </optgroup>
                  ))}
                </select></div>
                <div><label style={labelDoc}>Línea de negocio</label><select disabled={!isEditingFiliacion} value={editForm.linea_negocio || ''} onChange={e => setEditForm({ ...editForm, linea_negocio: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }}><option value="">Seleccionar</option><option value="Ortodoncia">Ortodoncia</option><option value="Rehabilitación">Rehabilitación</option><option value="Estética">Estética</option><option value="Endodoncia">Endodoncia</option><option value="Tratamiento integral">Tratamiento integral</option><option value="Odontopediatría">Odontopediatría</option></select></div>
                <div><label style={labelDoc}>Alergias</label><input disabled={!isEditingFiliacion} value={editForm.allergies || ''} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })} style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} /></div>
              </div>

              {editForm.age < 18 && (
                <div style={{ marginTop: '45px' }}>
                  <h3 style={{ color: P, fontSize: '17px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Familiar / Apoderado <span style={{ fontSize: 12, fontWeight: 600, background: '#FEE2E2', color: RJ, padding: '4px 10px', borderRadius: '10px' }}>Requerido</span>
                  </h3>
                  <div style={{ border: `1px solid ${BD}`, borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ background: P, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 20px' }}><div style={{ color: '#fff', fontSize: '13.5px', fontWeight: 600 }}>Nombre</div><div style={{ color: '#fff', fontSize: '13.5px', fontWeight: 600 }}>N° doc</div><div style={{ color: '#fff', fontSize: '13.5px', fontWeight: 600 }}>Parentesco</div></div>
                    <div style={{ background: '#F5F5F5', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', padding: '20px' }}>
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado || ''} onChange={e => setEditForm({ ...editForm, apoderado: e.target.value })} placeholder="Nombre completo" style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado_dni || ''} onChange={e => setEditForm({ ...editForm, apoderado_dni: e.target.value })} placeholder="DNI/CE" style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.parentesco || ''} onChange={e => setEditForm({ ...editForm, parentesco: e.target.value })} placeholder="Ej: Madre, Padre" style={{ ...inputDoc, background: isEditingFiliacion ? LT : '#F5F5F5', borderColor: isEditingFiliacion ? BD : 'transparent' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- PESTAÑA ODONTOGRAMA --- */}
        {tab === 'odontograma' && (
          <Odontograma
            patient={patData}
            teeth={teeth}
            setTeeth={setTeeth}
            teethEvolucion={teethEvolucion}
            setTeethEvolucion={setTeethEvolucion}
            periodontalDx={periodontalDx}
            setPeriodontalDx={setPeriodontalDx}
            plan={plan}
            setPlan={setPlan}
            onGenerarSugerencia={generarDesdeOdontograma}
          />
        )}

        {/* --- PESTAÑA ANAMNESIS --- */}
        {tab === 'anamnesis' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            {/* Antes maxWidth:1000 -- misma razón que Filiación: el
                Directorio ya no le quita ancho a esta vista. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 1400, margin: '0 auto', boxSizing: 'border-box' }}>

              {/* Motivo de consulta */}
              <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', padding: 18 }}>
                <label style={{ fontSize: 12, color: MU, fontWeight: 500, display: 'block', marginBottom: 6 }}>Motivo de consulta</label>
                <textarea value={anamnesisData['Motivo de consulta'] || ''} onChange={e => setAnamnesisData({ ...anamnesisData, 'Motivo de consulta': e.target.value })}
                  style={{ width: '100%', minHeight: 48, border: `1px solid ${BD}`, borderRadius: '10px', padding: '9px 12px', fontSize: 13.5, lineHeight: 1.5, outline: 'none', color: DN, background: LT, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>

              {/* Enfermedad actual */}
              <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', padding: 18 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: P, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BD}`, textTransform: 'uppercase', letterSpacing: .3 }}>Enfermedad actual</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsFormulario}, 1fr)`, gap: 12 }}>
                  {['Tiempo de enfermedad', 'Signos y síntomas principales', 'Relato cronológico', 'Funciones biológicas'].map(f => (
                    <div key={f}>
                      <label style={{ fontSize: 12, color: MU, fontWeight: 500, display: 'block', marginBottom: 4 }}>{f}</label>
                      <input value={anamnesisData[f] || ''} onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })}
                        style={{ width: '100%', border: 'none', borderBottom: `1px solid ${BD}`, padding: '6px 0', minHeight: 36, fontSize: 13.5, outline: 'none', color: DN, background: 'transparent', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Antecedentes */}
              <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', padding: 18 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: P, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BD}`, textTransform: 'uppercase', letterSpacing: .3 }}>Antecedentes</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {['Antecedentes familiares', 'Antecedentes personales'].map(f => (
                    <div key={f}>
                      <label style={{ fontSize: 12, color: MU, fontWeight: 500, display: 'block', marginBottom: 4 }}>{f}</label>
                      <input value={anamnesisData[f] || ''} onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })}
                        style={{ width: '100%', border: 'none', borderBottom: `1px solid ${BD}`, padding: '6px 0', minHeight: 36, fontSize: 13.5, outline: 'none', color: DN, background: 'transparent', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 12, color: MU, fontWeight: 600, marginBottom:4 }}>¿Tiene o ha tenido?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${BD}` }}>
                  {[['Presión alta', 'VIH'], ['Presión baja', 'Diabetes'], ['Hepatitis', 'Asma'], ['Gastritis', '¿Fuma?'], ['Úlceras', null]].map(([izq, der], i) => (
                    <React.Fragment key={i}>
                      <AnamnesisSiNo label={izq} value={anamnesisData[izq] || ''} onChange={v => setAnamnesisData({ ...anamnesisData, [izq]: v })} />
                      {der ? <AnamnesisSiNo label={der} value={anamnesisData[der] || ''} onChange={v => setAnamnesisData({ ...anamnesisData, [der]: v })} /> : <div />}
                    </React.Fragment>
                  ))}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: MU, fontWeight: 500, display: 'block', marginBottom: 4 }}>Comentario adicional</label>
                  <input value={anamnesisData['Comentario adicional'] || ''} onChange={e => setAnamnesisData({ ...anamnesisData, 'Comentario adicional': e.target.value })}
                    style={{ width: '100%', border: 'none', borderBottom: `1px solid ${BD}`, padding: '6px 0', minHeight: 36, fontSize: 13.5, outline: 'none', color: DN, background: 'transparent', boxSizing: 'border-box' }} />
                </div>

                <div>
                  {[
                    'Enfermedades sanguíneas', 'Problemas cardíacos', '¿Padece de alguna otra enfermedad?',
                    '¿Cuántas veces al día se cepilla los dientes?', '¿Le sangra sus encías?',
                    '¿Ha tenido hemorragias anormales después de una extracción?', '¿Hace rechinar o aprieta los dientes?',
                    'Otras molestias en la boca', 'Alergias', '¿Ha tenido alguna operación grande en los últimos años?',
                    '¿Toma alguna medicación de manera permanente?',
                  ].map(f => (
                    <AnamnesisSiNoDetalle key={f} label={f}
                      value={anamnesisData[f] || ''}
                      detalle={anamnesisData[`${f} (detalle)`] !== undefined ? anamnesisData[`${f} (detalle)`] : (f === 'Alergias' ? (patData?.allergies || patient.allergies) : f.includes('medicación') ? (patData?.meds || patient.meds) : '')}
                      onChange={v => setAnamnesisData({ ...anamnesisData, [f]: v })}
                      onChangeDetalle={v => setAnamnesisData({ ...anamnesisData, [`${f} (detalle)`]: v })}
                    />
                  ))}
                </div>
              </div>

              {/* Examen clínico */}
              <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', padding: 18 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: P, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${BD}`, textTransform: 'uppercase', letterSpacing: .3 }}>Examen clínico</div>

                <div style={{ fontSize: 12, color: MU, fontWeight: 600, marginBottom:8 }}>Signos vitales</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsFormulario}, 1fr)`, gap: 12, marginBottom: 16 }}>
                  {[['PA', 'mmHg'], ['FC', 'bpm'], ['Temperatura', '°C'], ['FR', 'r/m']].map(([f, unidad]) => (
                    <div key={f}>
                      <label style={{ fontSize: 12, color: MU, fontWeight: 500, display: 'block', marginBottom: 4 }}>{f}</label>
                      <div style={{ display: 'flex' }}>
                        <input value={anamnesisData[f] || ''} onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })}
                          style={{ flex: 1, minWidth: 0, border: `1px solid ${BD}`, borderRight: 'none', borderRadius: '10px 0 0 10px', padding: '9px 12px', minHeight: 36, fontSize: 13.5, outline: 'none', color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
                        <span style={{ border: `1px solid ${BD}`, borderRadius: '0 10px 10px 0', padding: '9px 12px', display: 'flex', alignItems: 'center', fontSize: 12, color: MU, background: MT, whiteSpace: 'nowrap' }}>{unidad}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsFormulario}, 1fr)`, gap: 12 }}>
                  {['Examen extraoral', 'Examen intraoral', 'Resultado de exámenes auxiliares', 'Observaciones'].map(f => (
                    <div key={f}>
                      <label style={{ fontSize: 12, color: MU, fontWeight: 500, display: 'block', marginBottom: 4 }}>{f}</label>
                      <textarea value={anamnesisData[f] || ''} onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })}
                        style={{ width: '100%', minHeight: 68, border: `1px solid ${BD}`, borderRadius: '10px', padding: '9px 12px', fontSize: 13.5, lineHeight: 1.5, outline: 'none', color: DN, background: LT, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    </div>
                  ))}
                </div>
              </div>

            </div>
            <button onClick={saveAllToCloud} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 22px', minHeight: 44, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              <Icon name="save" size={14} /> Guardar anamnesis
            </button>
          </div>
        )}

        {/* --- PESTAÑA PLAN --- */}
        
        {tab === 'plan' && (
  <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 600, color: DN }}>Plan de tratamiento — {patData?.name || patient.name}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={generarDesdeOdontograma} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: LT, color: P, border: `1px solid ${P}`, borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Icon name="bolt" size={13} /> Generar desde odontograma
        </button>
        <button onClick={() => { setShowTreatPicker(!showTreatPicker); setDraftTreatment(null); }} style={{ background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {showTreatPicker ? 'Cerrar catálogo' : '+ Agregar tratamiento'}
        </button>
      </div>
    </div>

    {showTreatPicker && !draftTreatment && (
      <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: DN, marginBottom: 12 }}>Seleccionar tratamiento:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
          {TRATAMIENTOS_CAT.map(cat => (
            <div key={cat.cat}>
              <div style={{ fontSize: 12, fontWeight: 600, color: P, marginBottom: 6, textTransform: 'uppercase', letterSpacing: .3 }}>{cat.cat}</div>
              {cat.items.map(item => (
                <div key={item} onClick={() => setDraftTreatment({ name: item, cost: PRECIOS[item] || 0, tooth: '', date: new Date().toISOString().slice(0,10), sessions: 1, notes: '' })}
                  style={{ fontSize: 13, color: DN, padding: '8px 10px', minHeight: 36, display: 'flex', alignItems: 'center', boxSizing: 'border-box', borderRadius: '10px', cursor: 'pointer', marginBottom: 2, fontVariantNumeric: 'tabular-nums', transition: 'background-color .18s cubic-bezier(0.25, 0.1, 0.25, 1), color .18s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EDEDED'; e.currentTarget.style.color = P }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DN }}>
                  {item} — S/{PRECIOS[item] || 0}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )}

    {draftTreatment && (
      <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid color-mix(in srgb, ${P} 33%, transparent)`, borderRadius: '14px', padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: P, marginBottom: 14 }}>Detalles del tratamiento: {draftTreatment.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 }}>Pieza dental</label>
            <input value={draftTreatment.tooth} onChange={e => setDraftTreatment({ ...draftTreatment, tooth: e.target.value })} placeholder="Ej: 14, 24-26" style={{ width: '100%', padding: '9px 12px', minHeight: 40, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13.5, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 }}>Fecha</label>
            <input type="date" value={draftTreatment.date} onChange={e => setDraftTreatment({ ...draftTreatment, date: e.target.value })} style={{ width: '100%', padding: '9px 12px', minHeight: 40, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13.5, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 }}>N° sesiones</label>
            <input type="number" min="1" value={draftTreatment.sessions} onChange={e => setDraftTreatment({ ...draftTreatment, sessions: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: '9px 12px', minHeight: 40, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13.5, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 }}>Costo (S/)</label>
            <input type="number" value={draftTreatment.cost} onChange={e => setDraftTreatment({ ...draftTreatment, cost: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '9px 12px', minHeight: 40, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13.5, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: MU, fontWeight: 600, display: 'block', marginBottom: 5 }}>Notas clínicas</label>
          <textarea value={draftTreatment.notes} onChange={e => setDraftTreatment({ ...draftTreatment, notes: e.target.value })} placeholder="Observaciones, indicaciones, plan específico para esta pieza..." style={{ width: '100%', minHeight: 68, padding: '9px 12px', border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13.5, lineHeight: 1.5, color: DN, background: LT, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setDraftTreatment(null)} style={{ background: LT, color: MU, border: `1px solid ${BD}`, borderRadius: '10px', padding: '11px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => {
            setPlan(p => [...p, { id: Date.now(), name: draftTreatment.name, tooth: draftTreatment.tooth || '—', status: 'pendiente', cost: draftTreatment.cost, paid: 0, date: draftTreatment.date, sessions: draftTreatment.sessions, notes: draftTreatment.notes }]);
            setDraftTreatment(null);
            setShowTreatPicker(false);
          }} style={{ background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Agregar al plan</button>
        </div>
      </div>
    )}

    {['pendiente', 'en_curso', 'completado'].map(st => {
      const items = plan.filter(i => i.status === st);
      const b = sc(st);
      return (
        <div key={st} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: b.c, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.c }} />{st.replace('_', ' ')} ({items.length})
          </div>
          {items.map(item => {
            const isEditing = editingItemId === item.id;
            return (
              <div key={item.id} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: '14px', padding: '12px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: DN }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: MU, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>Pieza: {item.tooth} · {item.date} · {item.sessions || 1} sesión(es)</div>
                  </div>
                  <div style={{ fontSize: 15, color: DN, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>S/{item.cost}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditingItemId(isEditing ? null : item.id); setEditDraft(item); }}
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, padding: '7px 12px', minHeight: 36, borderRadius: '10px', cursor: 'pointer', border: `1px solid color-mix(in srgb, ${P} 33%, transparent)`, background: LT, color: P, fontWeight: 600 }}>
                      {isEditing ? 'Cerrar' : <><Icon name="edit" size={11} /> Editar</>}
                    </button>
                    {['pendiente', 'en_curso', 'completado'].filter(s => s !== st).map(ns => (
                      <button key={ns} onClick={() => setPlan(p => p.map(i => i.id === item.id ? { ...i, status: ns } : i))}
                        style={{ fontSize: 11, padding: '7px 12px', minHeight: 36, borderRadius: '10px', cursor: 'pointer', border: `1px solid ${sc(ns).c}`, background: sc(ns).bg, color: sc(ns).c, fontWeight: 600 }}>
                        → {ns.replace('_', ' ')}
                      </button>
                    ))}
                    <button onClick={() => setPlan(p => p.filter(i => i.id !== item.id))}
                      style={{ fontSize: 11, padding: '7px 12px', minHeight: 36, borderRadius: '10px', cursor: 'pointer', border: `1px solid color-mix(in srgb, ${RJ} 27%, transparent)`, background: '#FEE2E2', color: RJ, fontWeight: 600 }}>✕</button>
                  </div>
                </div>

                {item.notes && !isEditing && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${BD}`, fontSize: 13, lineHeight: 1.5, color: MU, fontStyle: 'italic', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <Icon name="document" size={12} style={{ marginTop: 2, flexShrink: 0 }} /> {item.notes}
                  </div>
                )}

                {isEditing && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${BD}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 4 }}>Pieza</label>
                        <input value={editDraft.tooth || ''} onChange={e => setEditDraft({ ...editDraft, tooth: e.target.value })} style={{ width: '100%', padding: '8px 10px', minHeight: 36, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 4 }}>Fecha</label>
                        <input type="date" value={editDraft.date === '—' ? '' : editDraft.date || ''} onChange={e => setEditDraft({ ...editDraft, date: e.target.value })} style={{ width: '100%', padding: '8px 10px', minHeight: 36, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 4 }}>Sesiones</label>
                        <input type="number" min="1" value={editDraft.sessions || 1} onChange={e => setEditDraft({ ...editDraft, sessions: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: '8px 10px', minHeight: 36, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 4 }}>Costo (S/)</label>
                        <input type="number" value={editDraft.cost || 0} onChange={e => setEditDraft({ ...editDraft, cost: parseFloat(e.target.value) || 0 })} style={{ width: '100%', padding: '8px 10px', minHeight: 36, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <label style={{ fontSize: 11, color: MU, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notas clínicas</label>
                    <textarea value={editDraft.notes || ''} onChange={e => setEditDraft({ ...editDraft, notes: e.target.value })} style={{ width: '100%', minHeight: 60, padding: '9px 12px', border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, lineHeight: 1.5, color: DN, background: LT, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }} />
                    <button onClick={() => { setPlan(p => p.map(i => i.id === item.id ? { ...editDraft } : i)); setEditingItemId(null); }}
                      style={{ background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Guardar cambios</button>
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && <div style={{ fontSize: 13, color: '#9AA1AC', fontStyle: 'italic', padding: '6px 8px' }}>Sin tratamientos en este estado</div>}
        </div>
      );
    })}
  </div>
)}

        {/* --- PESTAÑA EVOLUCIÓN --- */}
        {tab === 'evolucion' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: DN }}>Notas de evolución</div>
              <button
                onClick={() => { setShowNuevaNota(true); setTimeout(() => notaTextareaRef.current?.focus(), 0); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Icon name="plus" size={13} /> Nueva nota
              </button>
            </div>

            {notasEvolucion.length === 0 && !showNuevaNota && (
              <div style={{ background: LT, border: `1px dashed ${BD}`, borderRadius: '14px', padding: 30, textAlign: 'center', color: MU, fontSize: 13.5, marginBottom: 12 }}>
                Aún no hay notas de evolución registradas.
              </div>
            )}

            {showNuevaNota && (
              <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: `1px solid color-mix(in srgb, ${P} 33%, transparent)`, borderRadius: '14px', padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DN, marginBottom: 10 }}>Nueva nota clínica</div>
                <textarea ref={notaTextareaRef} value={nuevaNotaTexto} onChange={e => setNuevaNotaTexto(e.target.value)}
                  placeholder="Descripción de la consulta, hallazgos clínicos, procedimiento realizado y recomendaciones..."
                  style={{ width: '100%', minHeight: 96, padding: '10px 12px', border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13.5, lineHeight: 1.6, resize: 'vertical', outline: 'none', color: DN, background: LT, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button variant="secondary" onClick={() => { setShowNuevaNota(false); setNuevaNotaTexto(''); }} style={{ padding: '10px 18px', minHeight: 44, fontSize: 13 }}>Cancelar</Button>
                  <button onClick={async () => { await handleAgregarNotaEvolucion(); setShowNuevaNota(false); }} disabled={savingNota}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: savingNota ? MU : P, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: savingNota ? 'not-allowed' : 'pointer' }}>
                    <Icon name="save" size={13} /> {savingNota ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}

            {notasEvolucion.map(n => (
              <div key={n.id} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: '14px', padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: P, fontVariantNumeric: 'tabular-nums' }}>{n.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: MU }}>{n.dr}</span>
                    <button onClick={() => handleEliminarNotaEvolucion(n.id)} title="Eliminar nota"
                      style={{ background: 'none', border: 'none', color: RJ, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36, padding: 0 }}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 13.5, color: DN, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{n.txt}</div>
              </div>
            ))}
          </div>
        )}

        {/* --- PESTAÑA RECETAS --- */}
        {tab === 'recetas' && (() => {
          const recetaActual = recetas[0] || null;
          const historialAnterior = recetas.slice(1);

          return (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: DN }}>Recetas médicas</div>
              <button onClick={handleNuevaReceta}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Icon name="plus" size={13} /> Nueva receta
              </button>
            </div>

            <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', padding: 22, maxWidth: 500 }}>
              <div style={{ textAlign: 'center', borderBottom: `1px solid ${BD}`, paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: MU }}>Cirujano Dentista · COP 12345</div>
                <div style={{ fontSize: 12, color: MU, fontVariantNumeric: 'tabular-nums' }}>Los Diamantes 178, Trujillo · +51 915 054 145</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                {[['Paciente', patData?.name || patient.name], ['DNI', patData?.doc || patient.doc], ['Edad', (patData?.age || patient.age) + ' años'], ['Fecha', recetaActual?.date || fechaLarga()]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 11, color: MU }}>{k}</div><div style={{ fontSize: 13, fontWeight: 500, color: DN, paddingBottom: 3, borderBottom: `1px solid ${BD}`, fontVariantNumeric: 'tabular-nums' }}>{v}</div></div>
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: DN, marginBottom: 10 }}>Rp:</div>

              {(!recetaActual || recetaActual.meds.length === 0) && (
                <div style={{ fontSize: 13, color: '#9AA1AC', fontStyle: 'italic', marginBottom: 12 }}>Sin medicamentos agregados aún.</div>
              )}

              {recetaActual?.meds.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px dashed ${BD}` }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: DN }}>{r.med}</div>
                    {r.dose && <div style={{ fontSize: 13, color: MU, marginTop: 2 }}>{r.dose}</div>}
                    {r.inst && <div style={{ fontSize: 12, color: MU, fontStyle: 'italic', marginTop: 2 }}>{r.inst}</div>}
                  </div>
                  <button onClick={() => handleEliminarMedicamento(recetaActual.id, r.id)} title="Quitar medicamento"
                    style={{ background: 'none', border: 'none', color: RJ, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36, padding: 0, flexShrink: 0 }}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 4 }}>
                <input value={medDraft.med} onChange={e => setMedDraft({ ...medDraft, med: e.target.value })} placeholder="Medicamento"
                  style={{ padding: '9px 11px', minHeight: 36, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, color: DN, background: LT, outline: 'none', boxSizing: 'border-box' }} />
                <input value={medDraft.dose} onChange={e => setMedDraft({ ...medDraft, dose: e.target.value })} placeholder="Dosis / frecuencia"
                  style={{ padding: '9px 11px', minHeight: 36, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, color: DN, background: LT, outline: 'none', boxSizing: 'border-box' }} />
                <input value={medDraft.inst} onChange={e => setMedDraft({ ...medDraft, inst: e.target.value })} placeholder="Indicaciones"
                  style={{ padding: '9px 11px', minHeight: 36, border: `1px solid ${BD}`, borderRadius: '10px', fontSize: 13, color: DN, background: LT, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleAgregarMedicamento} disabled={savingReceta}
                style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: savingReceta ? '#F5F5F5' : LT, color: savingReceta ? '#9AA1AC' : P, border: `1px solid ${savingReceta ? BD : P}`, borderRadius: '10px', padding: '10px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: savingReceta ? 'not-allowed' : 'pointer' }}>
                <Icon name="plus" size={13} /> {savingReceta ? 'Guardando...' : 'Agregar medicamento'}
              </button>

              <div style={{ marginTop: 16, borderTop: `1px solid ${BD}`, paddingTop: 10, textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: MU, marginBottom: 6 }}>Firma y sello</div>
                {firmaDoctorUrl ? (
                  <img src={firmaDoctorUrl} alt="Firma y sello" onError={() => setFirmaDoctorUrl(null)} style={{ maxHeight: 44, maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ fontSize: 12, color: '#9AA1AC', fontStyle: 'italic' }}>Configura tu firma en Ajustes → Mi perfil</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => imprimirReceta(recetaActual)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: P, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Icon name="print" size={14} /> Imprimir
                </button>
                <button onClick={() => enviarRecetaWhatsApp(recetaActual)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: WA, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Icon name="chat" size={14} /> Enviar WhatsApp
                </button>
              </div>
            </div>

            {historialAnterior.length > 0 && (
              <div style={{ marginTop: 20, maxWidth: 500 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: MU, textTransform: 'uppercase', letterSpacing: .3, marginBottom: 8 }}>Historial de recetas</div>
                {historialAnterior.map(r => (
                  <div key={r.id} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: '14px', padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon name="document" size={16} color={MU} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: DN, fontVariantNumeric: 'tabular-nums' }}>{r.date}</div>
                      <div style={{ fontSize: 12, color: MU, fontVariantNumeric: 'tabular-nums' }}>{r.meds.length} medicamento{r.meds.length !== 1 ? 's' : ''}</div>
                    </div>
                    <button onClick={() => imprimirReceta(r)} title="Imprimir" style={{ background: 'none', border: 'none', color: P, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36, padding: 4 }}>
                      <Icon name="print" size={15} />
                    </button>
                    <button onClick={() => enviarRecetaWhatsApp(r)} title="Enviar por WhatsApp" style={{ background: 'none', border: 'none', color: WA, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 36, minWidth: 36, padding: 4 }}>
                      <Icon name="chat" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {/* --- PESTAÑA IMÁGENES --- */}
        {tab === 'imagenes' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 600, color: DN }}>Imágenes y Radiografías</div>

              <input type="file" id="file-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              <label htmlFor="file-upload" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: saving ? MU : P, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', minHeight: 44, boxSizing: 'border-box', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '⏳ Subiendo...' : '+ Subir imagen'}
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {imagenesFirmadas.map((img, i) => (
                <div key={i} style={{ background: LT, border: `1px solid ${BD}`, borderRadius: '14px', overflow: 'hidden', position: 'relative', transition: 'border-color .18s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(i, img.url);
                    }}
                    style={{ position: 'absolute', top: 6, right: 6, background: RJ, color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, minHeight: 32, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 4px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)' }}
                    title="Eliminar imagen"
                  >
                    ✕
                  </button>

                  <div style={{ height: 100, background: LT, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={img.urlFirmada} alt="Radiografía" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DN }}>{img.type}</div>
                    <div style={{ fontSize: 12, color: MU, fontVariantNumeric: 'tabular-nums' }}>{img.date}</div>
                  </div>
                </div>
              ))}

              <label htmlFor="file-upload" style={{ background: LT, border: `2px dashed ${BD}`, borderRadius: '14px', height: 148, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6, transition: 'border-color .18s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}>
                <div style={{ fontSize: 28, color: '#9AA1AC' }}>+</div>
                <div style={{ fontSize: 12, color: MU, fontWeight: 500 }}>Subir archivo</div>
              </label>
            </div>
          </div>
        )}

        {/* --- PESTAÑA PRESUPUESTO --- */}
        {tab === 'presupuesto' && (() => {
          const totalCosto = plan.reduce((acc, curr) => acc + curr.cost, 0);
          const totalPagado = plan.reduce((acc, curr) => acc + curr.paid, 0);
          const totalSaldo = totalCosto - totalPagado;
          const sinTratamientos = plan.length === 0;

          return (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 600, color: DN }}>Presupuesto</div>
                <div style={{ fontSize: 13, color: MU, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{patData?.name || patient.name} · {new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={imprimirPresupuesto} disabled={sinTratamientos}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: LT, color: P, border: `1px solid ${P}`, borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: sinTratamientos ? 'not-allowed' : 'pointer', opacity: sinTratamientos ? .5 : 1 }}>
                  <Icon name="print" size={14} /> Imprimir
                </button>
                <button onClick={enviarPresupuestoWhatsApp} disabled={sinTratamientos}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: WA, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', minHeight: 44, fontSize: 13, fontWeight: 600, cursor: sinTratamientos ? 'not-allowed' : 'pointer', opacity: sinTratamientos ? .5 : 1 }}>
                  <Icon name="chat" size={14} /> WhatsApp
                </button>
              </div>
            </div>

            {sinTratamientos ? (
              <div style={{ background: LT, border: `1px dashed ${BD}`, borderRadius: '14px', padding: 40, textAlign: 'center', color: MU, fontSize: 13.5 }}>
                Aún no hay tratamientos en el plan. Agrégalos desde la pestaña "Plan trat." para generar el presupuesto.
              </div>
            ) : (
            <div style={{ background: GLASS_BG, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, border: GLASS_BORDER, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F5F5F5', borderBottom: `1px solid ${BD}` }}>
                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: MU }}>Tratamiento</th>
                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: MU }}>Pieza</th>
                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: MU }}>Costo (S/)</th>
                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: MU }}>Abonado (S/)</th>
                    <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: MU }}>Saldo (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx === plan.length - 1 ? 'none' : `1px solid ${BD}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 13.5, fontWeight: 600, color: DN }}>{item.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13.5, color: DN, fontVariantNumeric: 'tabular-nums' }}>{item.tooth}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13.5, color: DN, fontVariantNumeric: 'tabular-nums' }}>{item.cost.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13.5, color: P, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{item.paid.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13.5, color: (item.cost - item.paid) > 0 ? RJ : WA, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{(item.cost - item.paid).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: '#F5F5F5', borderTop: `2px solid ${BD}` }}>
                  <tr>
                    <td colSpan={2} style={{ padding: '14px 16px', fontSize: 13.5, fontWeight: 600, color: DN, textAlign: 'right' }}>TOTALES:</td>
                    <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 700, color: DN, fontVariantNumeric: 'tabular-nums' }}>S/ {totalCosto.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 700, color: P, fontVariantNumeric: 'tabular-nums' }}>S/ {totalPagado.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 700, color: RJ, fontVariantNumeric: 'tabular-nums' }}>S/ {totalSaldo.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
            )}

            <div
              onClick={() => { setPagoDraft({ itemId: plan.find(i => (i.cost - i.paid) > 0)?.id ? String(plan.find(i => (i.cost - i.paid) > 0).id) : '', monto: '' }); setShowPagoModal(true); }}
              style={{ marginTop: 20, background: LT, border: `1px dashed ${BD}`, borderRadius: '14px', padding: 16, minHeight: 44, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'background-color .18s cubic-bezier(0.25, 0.1, 0.25, 1)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#EDEDED'} onMouseLeave={e => e.currentTarget.style.background = LT}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(114, 157, 238, 0.12)', color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600 }}>$</div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: P }}>Registrar nuevo pago / abono</span>
            </div>

            {showPagoModal && (
              <Modal cardStyle={{ padding: 24, width: 380, boxShadow: '0 2px 4px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)' }}>
                <h3 style={{ marginTop: 0, marginBottom: 16, color: DN, fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>Registrar pago / abono</h3>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: MU, display: 'block', marginBottom: 5 }}>Tratamiento</label>
                  <select value={pagoDraft.itemId} onChange={e => setPagoDraft({ ...pagoDraft, itemId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', minHeight: 40, borderRadius: '10px', border: `1px solid ${BD}`, fontSize: 13.5, color: DN, boxSizing: 'border-box', background: LT }}>
                    <option value="">Selecciona un tratamiento…</option>
                    {plan.filter(i => (i.cost - i.paid) > 0).map(i => (
                      <option key={i.id} value={i.id}>{i.name} (Pieza {i.tooth}) — Saldo S/{(i.cost - i.paid).toFixed(2)}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: MU, display: 'block', marginBottom: 5 }}>Monto a abonar (S/)</label>
                  <input type="number" min="0" step="0.01" value={pagoDraft.monto} onChange={e => setPagoDraft({ ...pagoDraft, monto: e.target.value })}
                    placeholder="0.00" style={{ width: '100%', padding: '10px 12px', minHeight: 40, borderRadius: '10px', border: `1px solid ${BD}`, fontSize: 13.5, color: DN, background: LT, fontVariantNumeric: 'tabular-nums', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="secondary" onClick={() => setShowPagoModal(false)} style={{ flex: 1, padding: 12, minHeight: 44, fontSize: 13.5 }}>Cancelar</Button>
                  <Button onClick={registrarAbono} style={{ flex: 1, padding: 12, minHeight: 44, fontSize: 13.5 }}>Registrar abono</Button>
                </div>
              </Modal>
            )}
          </div>
          );
        })()}

        {/* --- PESTAÑA CONSENTIMIENTOS --- */}
        {tab === 'consentimientos' && (
          <Consentimientos patient={patData || patient} clinica={clinica} />
        )}

      </div>
    </div>
  );
}