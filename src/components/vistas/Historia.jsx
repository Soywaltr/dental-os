// src/components/vistas/Historia.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Consentimientos from '../historia/Consentimientos';
import { 
  TODAS_NACIONES, labelStyleDoc, inputStyleDoc, TRATAMIENTOS_CAT, PRECIOS, 
  P, BD, DN, MU, MT, LT, WA, RJ, GL, AZ, TOOLS, UA, LA, UP, LP, TNAME 
} from '../../utils/constants';
import { ini, sc, getSurfs, gt, isMol, isPM } from '../../utils/helpers';

// ============================================================================
// 1. COMPONENTE TOOTHSVG (Corregido .g)
// ============================================================================
function ToothSVG({ num, upper, surfs = {}, active, onClick, w = 31 }) {
  const W = w, CH = 20, RH = 22, TH = CH + RH, M = isMol(num), PM = isPM(num), cY = upper ? 0 : RH;
  const conds = Object.entries(surfs).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
  const dom = conds.length ? gt(conds[0][1]) : null;
  
  // AQUÍ ESTABA EL ERROR: Cambiado dom.cr por dom.g
  const cf = !dom ? '#f8fafc' : dom.g === 'r' ? RJ + 'dd' : dom.mk === 'x' ? '#64748b22' : AZ + 'dd';

  const isExtraer = Object.values(surfs).some(s => s === 'extraer');

  const rp = upper
    ? M ? `M 2 ${CH} L ${W / 2 - 1} ${TH - 1} L ${W / 2 - 1} ${CH} Z M ${W / 2 + 1} ${CH} L ${W - 2} ${TH - 1} L ${W - 2} ${CH} Z` : `M 3 ${CH} L ${W / 2} ${TH - 1} L ${W - 3} ${CH} Z`
    : M ? `M 2 ${RH} L ${W / 2 - 1} 1 L ${W / 2 - 1} ${RH} Z M ${W / 2 + 1} ${RH} L ${W - 2} 1 L ${W - 2} ${RH} Z` : `M 3 ${RH} L ${W / 2} 1 L ${W - 3} ${RH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${TH}`} width={W} height={TH} onClick={onClick}
      style={{ display: 'block', cursor: 'pointer', transition: 'opacity .12s' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '.72'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}>

      {active && <rect x="0" y="0" width={W} height={TH} rx="4" fill={P + '33'} stroke={P} strokeWidth="2" />}
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
        const fill = h ? (t.g === 'r' ? RJ + 'cc' : AZ + 'cc') : '#f8fafc';
        
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
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={sf === sf0 ? 12 : 10}
              fontWeight="800" fill={esExtraer || h ? '#fff' : '#94a3b8'} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {esExtraer ? 'EXT' : (h && t.sig ? t.sig : sf)}
            </text>
          </g>
        );
      })}

      <text x={cx} y={S + 12} textAnchor="middle" fontSize="11" fill="#0D5C6B" fontWeight="900">
        {num}
      </text>
    </svg>
  );
}

// ============================================================================
// 3. COMPONENTE ODONTOGRAMA (Corregido .g y React State a prueba de fallos)
// ============================================================================
function Odontograma({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion }) {
  const [act, setAct] = useState('caries');
  const [sel, setSel] = useState(null);
  const [specs, setSpecs] = useState('');
  const [mode, setMode] = useState('inicial');
  const [showP, setShowP] = useState(true);

  const at = gt(act);
  const aw = 42;
  const pw = 32;

  const currentTeeth = mode === 'inicial' ? (teeth || {}) : (teethEvolucion || {});
  const setCurrentTeeth = mode === 'inicial' ? setTeeth : setTeethEvolucion;

  const applyAll = n => {
    if (act === 'normal') { 
      setCurrentTeeth(p => {
        const next = { ...(p || {}) };
        delete next[n];
        return next;
      }); 
      return; 
    }
    const up = {};
    getSurfs(n).forEach(s => up[s] = act);
    setCurrentTeeth(p => ({ ...(p || {}), [n]: { ...((p || {})[n] || {}), ...up } }));
    setSel(n);
  };

  const applySurf = (n, sf) => {
    setCurrentTeeth(p => {
      const safeP = p || {};
      const currentPiece = safeP[n] || {};
      const cur = currentPiece[sf];
      
      if (act === 'normal' || cur === act) {
        const nextPiece = { ...currentPiece };
        delete nextPiece[sf];
        return { ...safeP, [n]: nextPiece };
      } else {
        return { ...safeP, [n]: { ...currentPiece, [sf]: act } };
      }
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
        const ss = currentTeeth[n] || {}, cs = Object.entries(ss).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
        const t = cs.length ? gt(cs[0][1]) : null;
        return (
          <div key={n} style={{ width: w, height: 18, border: '0.5px solid #374151', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: sel === n ? P + '22' : undefined, borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : '0.5px solid #374151' }}>
            {/* AQUÍ ESTABA EL ERROR: Cambiado t.cr por t.g */}
            {t && <span style={{ fontSize: 11, fontWeight: 800, color: t.g === 'r' ? RJ : AZ }}>{t.sig}</span>}
          </div>
        );
      })}
    </div>
  );

  const nRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ width: w, fontSize: 12, textAlign: 'center', userSelect: 'none', color: sel === n ? P : MU, fontWeight: sel === n ? 900 : 600, borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : 'none', padding: '2px 0 6px' }}>
          {n}
        </div>
      ))}
    </div>
  );

  const tRow = (list, upper, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : 'none' }}>
          <ToothSVG num={n} upper={upper} surfs={currentTeeth[n] || {}} active={sel === n} onClick={() => setSel(sel === n ? null : n)} w={w} />
        </div>
      ))}
    </div>
  );

  const eRow = (list, w) => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      {list.map((n, i) => (
        <div key={n} style={{ width: w, height: 13, border: '0.5px solid #374151', boxSizing: 'border-box', background: sel === n ? P + '11' : undefined, borderLeft: i === 8 && list.length === 16 ? '2px solid #374151' : '0.5px solid #374151' }} />
      ))}
    </div>
  );

  const selSurfs = sel ? (currentTeeth[sel] || {}) : {};

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* SIDEBAR HERRAMIENTAS */}
      <div style={{ width: 180, background: '#fff', borderRight: `1px solid ${BD}`, overflowY: 'auto', flexShrink: 0, padding: 12 }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: LT, borderRadius: 6, padding: 4 }}>
          {['inicial', 'evolución'].map(m => (
            <div key={m} onClick={() => setMode(m)} style={{ flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, background: mode === m ? P : 'transparent', color: mode === m ? '#fff' : MU }}>
              {m}
            </div>
          ))}
        </div>
        <div style={{ background: at.col, color: at.tc, padding: '6px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 10 }}>{at.lbl}</div>

        {[{ label: 'Rojo — mal estado', g: 'r' }, { label: 'Azul — buen estado', g: 'a' }].map(({ label, g }) => (
          <div key={g}>
            <div style={{ fontSize: 9, fontWeight: 800, color: g === 'r' ? RJ : AZ, textTransform: 'uppercase', letterSpacing: .5, margin: '12px 0 6px', borderTop: '1px solid #f0f4f8', paddingTop: 8 }}>{label}</div>
            {TOOLS.filter(t => t.g === g).map(t => (
              <div key={t.id} onClick={() => setAct(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 2, background: act === t.id ? t.col : 'transparent' }}
                onMouseEnter={e => { if (act !== t.id) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (act !== t.id) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: t.col, border: '1px solid #cbd5e1', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: act === t.id ? '#fff' : '#374151', fontWeight: act === t.id ? 700 : 500 }}>{t.lbl}</span>
              </div>
            ))}
          </div>
        ))}

        <div onClick={() => setAct('normal')} style={{ marginTop: 10, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'center', border: `1px solid ${BD}`, fontSize: 11, color: '#374151', fontWeight: 700 }}>↺ Limpiar pincel</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: MU, marginTop: 12, fontWeight: 600 }}>
          <input type="checkbox" checked={showP} onChange={e => setShowP(e.target.checked)} style={{ transform: 'scale(1.2)' }} /> Dientes Primarios
        </label>
        {allF.length > 0 && <button onClick={() => { setCurrentTeeth({}); setSel(null); }} style={{ width: '100%', marginTop: 10, padding: '8px', background: '#fef2f2', border: `1px solid ${RJ}55`, borderRadius: 6, fontSize: 11, color: RJ, cursor: 'pointer', fontWeight: 800 }}>Limpiar todo el mapa</button>}
      </div>

      {/* ÁREA CENTRAL */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '30px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 14, padding: '24px 30px', display: 'inline-block', minWidth: 750, boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', gap: 15, marginBottom: 15, alignItems: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: DN }}>{patient?.name || 'Paciente'}</div>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 12, background: mode === 'inicial' ? MT : '#fef3c7', color: mode === 'inicial' ? P : GL }}>{mode}</span>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: MU, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6 }}>Maxilar superior</div>

          {recRow(UA, aw)}{eRow(UA, aw)}{nRow(UA, aw)}{tRow(UA, true, aw)}

          {showP && (
            <div style={{ marginTop: 3 }}>
              {tRow(UP, true, pw)}
              {nRow(UP, pw)}
            </div>
          )}

          {/* PLANO OCLUSAL */}
          <div style={{ margin: '12px 0 10px', borderTop: '2px solid #374151', position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%) translateY(-50%)', background: '#fff', padding: '0 12px', fontSize: 9, color: '#94a3b8', fontWeight: 800, whiteSpace: 'nowrap' }}>PLANO OCLUSAL</span>
          </div>

          {showP && (
            <div style={{ marginTop: 8 }}>
              {nRow(LP, pw)}
              {tRow(LP, false, pw)}
            </div>
          )}

          {tRow(LA, false, aw)}{nRow(LA, aw)}{eRow(LA, aw)}{recRow(LA, aw)}

          <div style={{ fontSize: 10, fontWeight: 800, color: MU, textTransform: 'uppercase', textAlign: 'center', marginTop: 6 }}>Maxilar inferior</div>

          <div style={{ marginTop: 20, borderTop: `1px solid ${BD}`, paddingTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: DN }}>ESPECIFICACIONES CLÍNICAS: </span>
            <textarea value={specs} onChange={e => setSpecs(e.target.value)} placeholder="Ej. Hallazgos múltiples o anotaciones no gráficas..."
              style={{ width: '100%', minHeight: 30, marginTop: 5, padding: '4px 8px', border: '1px solid transparent', borderBottom: '1px solid #94a3b8', fontSize: 11, resize: 'vertical', outline: 'none', color: DN, background: '#f8fafc', borderRadius: '4px 4px 0 0', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {allF.length > 0 && <div style={{ marginTop: 15, padding: 12, background: LT, borderRadius: 10, border: `1px solid ${BD}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: P, marginBottom: 8 }}>Resumen de Hallazgos ({allF.length}):</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allF.map(({ n, sf, c }, i) => {
                const t = gt(c);
                return (
                  <span key={i} onClick={() => applySurf(n, sf)} title="Clic para quitar"
                    style={{ fontSize: 10, background: '#fff', color: t.g === 'r' ? RJ : AZ, padding: '3px 10px', borderRadius: 12, fontWeight: 800, cursor: 'pointer', border: `1px solid ${t.g === 'r' ? RJ : AZ}55`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
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
        <div style={{ width: 250, background: '#fff', borderLeft: `1px solid ${BD}`, overflowY: 'auto', flexShrink: 0, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <div><div style={{ fontSize: 22, fontWeight: 900, color: P }}>Pieza {sel}</div><div style={{ fontSize: 11, color: MU, fontWeight: 600 }}>{TNAME[sel] || '—'}</div></div>
            <button onClick={() => setSel(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 18, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: MU, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>Vista Oclusal</div>
            <OcclusalMap num={sel} surfs={selSurfs} activeTool={act} onSurf={sf => applySurf(sel, sf)} size={160} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 15 }}>
            <button onClick={() => applyAll(sel)} style={{ flex: 1, background: at.col, color: at.tc, border: 'none', borderRadius: 8, padding: '8px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Aplicar toda pieza</button>
            <button onClick={() => setCurrentTeeth(p => { const next = {...p}; delete next[sel]; return next; })} style={{ background: '#fef2f2', color: RJ, border: `1px solid ${RJ}44`, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>↺</button>
          </div>

          <div style={{ fontSize: 10, color: MU, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Superficies</div>
          {getSurfs(sel).map(sf => {
            const c = selSurfs[sf], t = gt(c), has = c && c !== 'normal';
            return (
              <div key={sf} onClick={() => applySurf(sel, sf)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: has ? (t.g === 'r' ? '#fef2f2' : '#eff6ff') : LT, border: `1px solid ${has ? (t.g === 'r' ? RJ + '44' : AZ + '44') : BD}` }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: has ? (t.g === 'r' ? RJ : AZ) : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: has ? '#fff' : '#94a3b8', fontWeight: 900 }}>{sf}</span>
                </div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: has ? 800 : 500, color: has ? (t.g === 'r' ? RJ : AZ) : MU }}>{has ? t.lbl : 'Sin hallazgo'}</div></div>
                {has && <span style={{ fontSize: 14, color: MU, fontWeight: 800 }}>✕</span>}
              </div>
            );
          })}

          <div style={{ fontSize: 10, color: MU, marginTop: 15, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Notas de pieza</div>
          <textarea placeholder="Observaciones específicas..." defaultValue={selSurfs.note || ''} onBlur={e => setCurrentTeeth(p => ({ ...p, [sel]: { ...(p[sel] || {}), note: e.target.value } }))}
            style={{ width: '100%', minHeight: 60, padding: 10, border: `1px solid ${BD}`, borderRadius: 8, fontSize: 11, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }} />
        </div>
      )}
    </div>
  );
}

// ... Continúa el resto de tu archivo original (export default function Historia)

// ============================================================================
// 4. COMPONENTE PRINCIPAL HISTORIA
// ============================================================================
export default function Historia({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion, setView }) {
  const [tab, setTab] = useState('filiacion');
  const [patData, setPatData] = useState(patient);
  
  useEffect(() => {
    setPatData(patient);
  }, [patient]);
  
  // --- ESTADOS DE ORTODONCIA ---
  const [subTabOrto, setSubTabOrto] = useState('examen');
  const [ortoForm, setOrtoForm] = useState({});
  const [savingOrto, setSavingOrto] = useState(false);
  
  const [planTrabajoForm, setPlanTrabajoForm] = useState({});
  const [savingTrabajo, setSavingTrabajo] = useState(false);
  
  const [planTrataForm, setPlanTrataForm] = useState({});
  const [savingTrata, setSavingTrata] = useState(false);
  
  const handlePlanTrata = (campo, valor) => setPlanTrataForm(prev => ({ ...prev, [campo]: valor }));
  
  const handleSavePlanTrata = async () => {
    setSavingTrata(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ plan_tratamiento: planTrataForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, plan_tratamiento: planTrataForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar Plan de Tratamiento: " + error.message);
    else alert("✅ Plan de Tratamiento guardado con éxito.");
    setSavingTrata(false);
  };
  
  const handlePlanTrabajo = (campo, valor) => setPlanTrabajoForm(prev => ({ ...prev, [campo]: valor }));
  
  useEffect(() => {
    if (patData && patData.id) {
      const cargarDatosOrto = async () => {
        const { data } = await supabase.from('ortodoncia').select('*').eq('paciente_id', patData.id).maybeSingle();
        if (data) {
          if (data.examen_clinico) setOrtoForm(data.examen_clinico);
          if (data.plan_trabajo) setPlanTrabajoForm(data.plan_trabajo);
          if (data.plan_tratamiento) setPlanTrataForm(data.plan_tratamiento);
          if (data.fotografias) setFotosOrto(data.fotografias);
          if (data.resumen) setResumenForm(data.resumen);
        }
      };
      cargarDatosOrto();
    }
  }, [patData]);
  
  const handleSavePlanTrabajo = async () => {
    setSavingTrabajo(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ plan_trabajo: planTrabajoForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, plan_trabajo: planTrabajoForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar Plan de Trabajo: " + error.message);
    else alert("✅ Plan de Trabajo guardado con éxito.");
    setSavingTrabajo(false);
  };
  
  const [resumenForm, setResumenForm] = useState({});
  const [savingResumen, setSavingResumen] = useState(false);
  
  const handleResumen = (campo, valor) => setResumenForm(prev => ({ ...prev, [campo]: valor }));
  
  const handleSaveResumen = async () => {
    setSavingResumen(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ resumen: resumenForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, resumen: resumenForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar Resumen: " + error.message);
    else alert("✅ Resumen guardado con éxito.");
    setSavingResumen(false);
  };
  
  const [fotosOrto, setFotosOrto] = useState({});
  const [savingFotosOrto, setSavingFotosOrto] = useState(false);
  
  const handleUploadFotoOrto = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    setSavingFotosOrto(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `orto-${patData.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
    if (uploadError) {
      alert('Error al subir el archivo: ' + uploadError.message);
      setSavingFotosOrto(false);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('imagenes').getPublicUrl(fileName);
    const nuevaFoto = { url: publicUrlData.publicUrl, date: new Date().toLocaleDateString('es-PE'), ext: fileExt };
    const nuevoEstadoFotos = { ...fotosOrto, [key]: nuevaFoto };
    setFotosOrto(nuevoEstadoFotos);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    if (existe) {
      await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', existe.id);
    } else {
      await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, fotografias: nuevoEstadoFotos }]);
    }
    setSavingFotosOrto(false);
  };
  
  const handleDeleteFotoOrto = async (key, url) => {
    if (!window.confirm(`¿Eliminar ${key} permanentemente?`)) return;
    setSavingFotosOrto(true);
    try {
      const fileName = url.split('/').pop();
      await supabase.storage.from('imagenes').remove([fileName]);
      const nuevoEstadoFotos = { ...fotosOrto };
      delete nuevoEstadoFotos[key];
      setFotosOrto(nuevoEstadoFotos);
      const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
      if (existe) await supabase.from('ortodoncia').update({ fotografias: nuevoEstadoFotos }).eq('id', existe.id);
    } catch (error) {
      alert("Hubo un error al eliminar.");
    }
    setSavingFotosOrto(false);
  };
  
  const handleOrto = (campo, valor) => setOrtoForm(prev => ({ ...prev, [campo]: valor }));
  
  const handleSaveOrto = async () => {
    setSavingOrto(true);
    const { data: existe } = await supabase.from('ortodoncia').select('id').eq('paciente_id', patData.id).maybeSingle();
    let error;
    if (existe) {
      const res = await supabase.from('ortodoncia').update({ examen_clinico: ortoForm }).eq('id', existe.id);
      error = res.error;
    } else {
      const res = await supabase.from('ortodoncia').insert([{ paciente_id: patData.id, examen_clinico: ortoForm }]);
      error = res.error;
    }
    if (error) alert("Error al guardar ortodoncia: " + error.message);
    else alert("✅ Examen Clínico de Ortodoncia guardado con éxito.");
    setSavingOrto(false);
  };
  
  // FUNCIONES AYUDANTES UI INTERNAS
  const SectionHeader = ({ title }) => (
    <div style={{ color: '#0087b3', fontSize: '14px', fontWeight: 700, marginTop: '35px', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {title} <span style={{ fontSize: '18px', cursor: 'pointer' }}>⌃</span>
    </div>
  );
  
  const renderSelectOrto = (label, field, options, hasNote = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={ortoForm[field] || ''} onChange={e => handleOrto(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hasNote && <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, fontStyle: 'italic', color: '#64748b', fontSize: '12.5px', height: '36px', marginTop: '4px' }} />}
    </div>
  );
  
  const renderSelectTrata = (label, field, options) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ ...labelStyleDoc, marginBottom: 2 }}>{label}</label>
      <select value={planTrataForm[field] || ''} onChange={e => handlePlanTrata(field, e.target.value)} style={inputStyleDoc}>
        <option value="">Seleccionar</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  
  const renderIntraRow = (label, field, opts) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9', gap: '20px', width: '100%' }}>
      <div style={{ width: '180px', minWidth: '180px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', gap: '15px', flexShrink: 0, alignItems: 'center' }}>
        {opts.map(opt => (
          <label key={opt} style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={ortoForm[`${field}_${opt}`] || false} onChange={e => handleOrto(`${field}_${opt}`, e.target.checked)} style={{ cursor: 'pointer', margin: 0, width: '16px', height: '16px' }} />
            {opt}
          </label>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: '100px' }}>
        <input placeholder="Nota..." value={ortoForm[`${field}_nota`] || ''} onChange={e => handleOrto(`${field}_nota`, e.target.value)} style={{ ...inputStyleDoc, width: '100%', height: '34px', fontSize: '12.5px', padding: '4px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }} />
      </div>
    </div>
  );
  
  // --- ESTADOS GENERALES DE HISTORIA ---
  const [isEditingFiliacion, setIsEditingFiliacion] = useState(false);
  const [plan, setPlan] = useState([
    { id: 1, name: 'Control ortodoncia', tooth: '14-23', status: 'en_curso', cost: 80, paid: 80, date: '10 Jun 2025', sessions: 1 },
    { id: 2, name: 'Blanqueamiento clínico', tooth: '—', status: 'pendiente', cost: 180, paid: 0, date: '—', sessions: 1 },
    { id: 3, name: 'Radiografía panorámica', tooth: '—', status: 'completado', cost: 45, paid: 45, date: '10 Jun 2025', sessions: 1 },
  ]);
  const [showTreatPicker, setShowTreatPicker] = useState(false);
  
  const TABS = [{ id: 'filiacion', lbl: 'Filiación' }, { id: 'anamnesis', lbl: 'Anamnesis' }, { id: 'odontograma', lbl: 'Odontograma' }, { id: 'ortodoncia', lbl: 'Ortodoncia' }, { id: 'plan', lbl: 'Plan trat.' }, { id: 'evolucion', lbl: 'Evolución' }, { id: 'recetas', lbl: 'Recetas' }, { id: 'imagenes', lbl: 'Imágenes' }, { id: 'presupuesto', lbl: 'Presupuesto' }, { id: 'consentimientos', lbl: 'Consentimientos' }];
  const ORTO_TABS = [{ id: 'examen', lbl: 'Examen clínico' }, { id: 'trabajo', lbl: 'Plan de Trabajo' }, { id: 'tratamiento', lbl: 'Plan de tratamiento' }, { id: 'resumen', lbl: 'Resumen' }, { id: 'fotografias', lbl: 'Fotografías' }];
  const ORTO_CAJAS = [{ key: 'Rx Panorámica', icon: '🦷', accept: 'image/*' }, { key: 'Rx Cefalométrica', icon: '📐', accept: 'image/*' }, { key: 'Rx Periapical', icon: '🔍', accept: 'image/*' }, { key: 'Foto frontal', icon: '😁', accept: 'image/*' }, { key: 'Foto lateral izquierda', icon: '📷', accept: 'image/*' }, { key: 'Foto lateral derecha', icon: '📸', accept: 'image/*' }, { key: 'Foto oclusal superior', icon: '👄', accept: 'image/*' }, { key: 'Foto oclusal inferior', icon: '👅', accept: 'image/*' }, { key: 'Modelo inicial', icon: '🧊', accept: 'image/*' }, { key: 'Plan de tratamiento', icon: '📄', accept: '.pdf,.ppt,.pptx,image/*' }];
  
  const [anamnesisData, setAnamnesisData] = useState({});
  const [imagenesList, setImagenesList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  
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
      setTeeth({});
      setTeethEvolucion({});
      const { data } = await supabase.from('historias').select('*').eq('patient_id', patient.id).maybeSingle();
      if (data) {
        if (data.odontograma && Object.keys(data.odontograma).length > 0) setTeeth(data.odontograma);
        if (data.evolucion && Object.keys(data.evolucion).length > 0) setTeethEvolucion(data.evolucion);
        if (data.anamnesis) setAnamnesisData(data.anamnesis);
        if (data.plan_tratamiento) setPlan(data.plan_tratamiento);
        if (data.imagenes) setImagenesList(data.imagenes);
      }
    };
    loadCloudData();
  }, [patient?.id]); 
  
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
    const { error } = await supabase.from('historias').upsert({ patient_id: patient.id, odontograma: cleanInicial, evolucion: cleanEvo, anamnesis: anamnesisData, plan_tratamiento: plan, imagenes: imagenesList }, { onConflict: 'patient_id' });
    if (error) alert("Error al guardar: " + error.message);
    else alert("¡Datos guardados con éxito!");
    setSaving(false);
  };
  
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${patient.id}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('imagenes').upload(fileName, file);
    if (uploadError) { alert('Error al subir la imagen: ' + uploadError.message); setSaving(false); return; }
    const { data: publicUrlData } = supabase.storage.from('imagenes').getPublicUrl(fileName);
    const nuevaImagen = { type: 'Radiografía / Foto', date: new Date().toLocaleDateString('es-PE'), url: publicUrlData.publicUrl };
    const nuevaLista = [...imagenesList, nuevaImagen];
    setImagenesList(nuevaLista);
    await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    setSaving(false);
    alert("¡Imagen subida y guardada correctamente!");
  };
  
  const handleDeleteImage = async (indexToDelete, imageUrl) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta imagen permanentemente?")) return;
    setSaving(true);
    try {
      const fileName = imageUrl.split('/').pop();
      await supabase.storage.from('imagenes').remove([fileName]);
      const nuevaLista = imagenesList.filter((_, i) => i !== indexToDelete);
      setImagenesList(nuevaLista);
      await supabase.from('historias').upsert({ patient_id: patient.id, imagenes: nuevaLista }, { onConflict: 'patient_id' });
    } catch (error) { alert("Hubo un error al intentar eliminar la imagen."); } finally { setSaving(false); }
  };
  
  if (!patient) return null;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* CABECERA DE HISTORIA */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${BD}`, padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: MT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: P, flexShrink: 0 }}>{ini(patData?.name || patient.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: DN }}>{patData?.name || patient.name}</div>
          </div>
          <div style={{ fontSize: 10, color: MU, marginTop: 3 }}>
            📞 {patData?.phone || 'Sin celular'} · ✉ {patData?.email || 'Sin email'} · DNI: {patData?.doc} · {patData?.age} años · {patData?.blood || 'O+'} {patData?.sexo ? `· ${patData.sexo}` : ''}
          </div>
          {(patData?.direccion) && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>📍 {patData.direccion}</div>}
        </div>
        {patData?.allergies && patData.allergies !== 'Ninguna' && <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: RJ, padding: '4px 10px', borderRadius: 10 }}>⚠ Alergia: {patData.allergies}</span>}
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, color: MU }}>Próx. cita</div><div style={{ fontSize: 12, fontWeight: 700, color: P }}>{patData?.nextVisit || '---'}</div></div>

        <button onClick={saveAllToCloud} style={{ background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? '⏳...' : '💾 Guardar en Nube'}
        </button>

        <button style={{ background: WA, color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💬</button>
      </div>

      {/* PESTAÑAS PRINCIPALES */}
      <div style={{ display: 'flex', gap: 1, padding: '5px 14px', background: LT, borderBottom: `1px solid ${BD}`, flexShrink: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '5px 13px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: tab === t.id ? 700 : 400, background: tab === t.id ? P : 'transparent', color: tab === t.id ? '#fff' : MU, whiteSpace: 'nowrap', transition: 'all .15s' }}>
            {t.lbl}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>

        {/* --- PESTAÑA ORTODONCIA --- */}
        {tab === 'ortodoncia' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', gap: '20px', background: '#fff', flexShrink: 0, overflowX: 'auto' }}>
                {ORTO_TABS.map(t => (
                  <div key={t.id} onClick={() => setSubTabOrto(t.id)}
                    style={{
                      padding: '18px 4px', cursor: 'pointer', fontSize: '13.5px',
                      fontWeight: subTabOrto === t.id ? '700' : '500',
                      color: subTabOrto === t.id ? '#0087b3' : '#64748b',
                      borderBottom: subTabOrto === t.id ? `2px solid #0087b3` : '2px solid transparent',
                      transition: 'all 0.2s ease', marginBottom: '-1px', whiteSpace: 'nowrap'
                    }}>
                    {t.lbl}
                  </div>
                ))}
              </div>

              <div style={{ padding: '30px', flex: 1, overflowY: 'auto', background: '#fff' }}>

                {subTabOrto === 'examen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>

                    <SectionHeader title="Sección" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {['Motivo de consulta', 'Historia médica', 'Historia odontológica', 'Historia Familiar'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{f}</label>
                          <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={inputStyleDoc} />
                        </div>
                      ))}
                    </div>

                    <SectionHeader title="Examen Extraoral" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Cráneo', 'craneo', ['Mesocéfalo', 'Braquicéfalo', 'Dolicéfalo'])}
                      {renderSelectOrto('Cara', 'cara', ['Mesofacial', 'Braquifacial', 'Dolicofacial'])}
                      {renderSelectOrto('Musculatura', 'musculatura', ['Normal', 'Alterada'])}
                      {renderSelectOrto('ATM', 'atm', ['Apertura bucal normal', 'Dolor al despertar', 'Dolor agudo', 'Dolor espontáneo', 'Click articular', 'Crepitación', 'Dolor a la palpación', 'Sensibilidad a la palpación', 'Apertura bucal disminuida'])}

                      {renderSelectOrto('Mentón', 'menton_ext', ['Normal', 'Pobre', 'Prominente'])}
                      {renderSelectOrto('ANL', 'anl', ['Normal', 'Cerrado', 'Abierto', 'Cerrado con nariz baja', 'Abierto con nariz respingada'])}
                      {renderSelectOrto('Fonación', 'fonacion', ['Normal', 'Rotacismo', 'Seseo'])}
                      {renderSelectOrto('Deglución', 'deglucion', ['Normal', 'Atípica tipo I', 'Atípica tipo II', 'Atípica tipo III', 'Atípico tipo IV'])}

                      {renderSelectOrto('Respiración', 'respiracion', ['Normal', 'Mixta'])}
                      {renderSelectOrto('Permeabilidad nasal', 'permeabilidad', ['Normal', 'Disminuida'])}
                      {renderSelectOrto('Hábitos', 'habitos', ['Ausentes', 'Respiración oral', 'Succión del pulgar', 'Succión de otro dedo', 'Succión de objetos'])}
                    </div>
                    <textarea value={ortoForm.extraoral_notas || ''} onChange={e => handleOrto('extraoral_notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', marginTop: '20px', resize: 'none' }} />

                    <SectionHeader title="Asimetría facial" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Plano bipupilar', 'plano_bipupilar', ['Adecuado', 'Discrepante'])}
                      {renderSelectOrto('Tabique nasal', 'tabique_nasal', ['Alineado', 'Desviado a la derecha', 'Desviado a la izquierda'])}
                      {renderSelectOrto('Comisura bucales', 'comisuras', ['Niveladas', 'Discrepantes a la derecha', 'Discrepantes a la izquierda'])}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 250px 150px', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Filtrum</div>
                      <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.filtrum_alineado || false} onChange={e => handleOrto('filtrum_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Desviación lateral del filtrum</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.filtrum_izq || false} onChange={e => handleOrto('filtrum_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.filtrum_der || false} onChange={e => handleOrto('filtrum_der', e.target.checked)} /> Derecha</label>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 250px 150px', gap: '15px', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Mentón</div>
                      <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.menton_alineado || false} onChange={e => handleOrto('menton_alineado', e.target.checked)} /> Alineado</label>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Desviación lateral del mentón</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.menton_izq || false} onChange={e => handleOrto('menton_izq', e.target.checked)} /> Izquierdo</label>
                        <label style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '6px' }}><input type="checkbox" checked={ortoForm.menton_der || false} onChange={e => handleOrto('menton_der', e.target.checked)} /> Derecha</label>
                      </div>
                    </div>
                    <textarea value={ortoForm.asimetria_notas || ''} onChange={e => handleOrto('asimetria_notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', marginTop: '20px', resize: 'none' }} />

                    <SectionHeader title="Perfil AP y proyección sagital de maxilares" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Tipo de Perfil', 'perfil_ap_tipo', ['Convexo', 'Recto', 'Cóncavo'])}
                      {renderSelectOrto('Tercio Medio', 'perfil_ap_medio', ['1/3 medio normal', '1/3 medio pobre', '1/3 medio aumentado'])}
                      {renderSelectOrto('Tercio Inferior', 'perfil_ap_inf', ['1/3 inferior normal', '1/3 inferior pobre', '1/3 inferior aumentado'])}
                    </div>

                    <SectionHeader title="Perfil y desarrollo vertical de maxilares" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Divergencia', 'perfil_vert_div', ['Normodivergente', 'Hipodivergente', 'Hiperdivergente'])}
                      {renderSelectOrto('Tercio Medio', 'perfil_vert_medio', ['1/3 medio normal', '1/3 medio pobre', '1/3 medio aumentado'])}
                      {renderSelectOrto('Tercio Inferior', 'perfil_vert_inf', ['1/3 inferior normal', '1/3 inferior pobre', '1/3 inferior aumentado'])}
                    </div>

                    <SectionHeader title="Labios" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Relación', 'labios_relacion', ['En relación normal', 'En relación alterada'])}
                      {renderSelectOrto('Posición', 'labios_posicion', ['En posición retruída', 'En posición protuída', 'En posición normal'])}
                      {renderSelectOrto('Competencia', 'labios_competencia', ['Competentes con sellado suave', 'Competentes con sellado excesivo', 'Incompetentes separados por'], true)}
                      {renderSelectOrto('Tonicidad', 'labios_tonicidad', ['Hipotónicos', 'Normales', 'Hipértonicos'])}
                    </div>

                    <SectionHeader title="Labio inferior" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Posición', 'labio_inf_pos', ['En posición retruída', 'En posición protuída', 'En posición normal'], true)}
                      {renderSelectOrto('Eversión', 'labio_inf_ever', ['Evertido', 'No evertido'])}
                      {renderSelectOrto('Grosor', 'labio_inf_grosor', ['Delgado', 'Grueso', 'Promedio'])}
                    </div>

                    <SectionHeader title="Labio superior" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Posición', 'labio_sup_pos', ['En posición retruída', 'En posición protuída', 'En posición normal'], true)}
                      {renderSelectOrto('Eversión', 'labio_sup_ever', ['Evertido', 'No evertido'])}
                      {renderSelectOrto('Grosor', 'labio_sup_grosor', ['Delgado', 'Grueso', 'Promedio'])}
                    </div>

                    <SectionHeader title="Sonrisa" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Altura', 'sonrisa_altura', ['Gingival (alta)', 'Media', 'Baja'])}
                      {renderSelectOrto('Corredores', 'sonrisa_corredores', ['Con corredores bucales normales', 'Con corredores bucales cerrados', 'Con corredores bucales amplios'])}
                      {renderSelectOrto('Acompañamiento', 'sonrisa_acomp', ['Acompañada con el labio inferior', 'No acompañada con el labio inferior'])}
                    </div>
                    <textarea value={ortoForm.sonrisa_notas || ''} onChange={e => handleOrto('sonrisa_notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', marginTop: '20px', resize: 'none' }} />

                    <SectionHeader title="Examen Intraoral" />
                    <div>
                      {renderIntraRow('Mucosa de labio', 'mucosa_labio', ['Normal', 'Alterada'])}
                      {renderIntraRow('Mucosa vestibular', 'mucosa_vestibular', ['Normal', 'Alterada'])}
                      {renderIntraRow('Frenillos vestibulares', 'frenillos_vest', ['Normal', 'Alterada'])}
                      {renderIntraRow('Mucosa palatina', 'mucosa_palatina', ['Normal', 'Alterada'])}
                      {renderIntraRow('Mucosa orofaríngea', 'mucosa_oro', ['Normal', 'Alterada'])}
                      {renderIntraRow('Amígdalas', 'amigdalas', ['Normales', 'Hipertróficas', 'Hipertróficas y crípticas'])}
                    </div>

                    <SectionHeader title="Lengua" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Tonicidad', 'lengua_tonicidad', ['Normotónica', 'Hipotónica'])}
                      {renderSelectOrto('Posición', 'lengua_pos', ['Posición normal', 'Posición Baja'])}
                      {renderSelectOrto('Movilidad', 'lengua_mov', ['Movilidad normal', 'Hipomovilidad', 'Hipermovilidad'])}
                      {renderSelectOrto('Frenillo', 'lengua_frenillo', ['Frenillo lingual normal', 'Frenillo lingual corto'])}
                    </div>

                    <SectionHeader title="Gíngiva" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Gíngiva incisivos inferiores (Grosor)', 'gingiva_inf_grosor', ['Grosor normal', 'Delgada', 'Delgada y traslúcida', 'Gruesa', 'Muy gruesa'])}
                      {renderSelectOrto('Gíngiva incisivos inferiores (Adherida)', 'gingiva_inf_adherida', ['Encía adherida de 2.5mm', 'Encía adherida de 3 mm', 'Encía adherida de 3.5mm', 'Encía adherida de 4mm', 'Encía adherida de 4.5mm'])}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Evaluación general (Grosor)', 'gingiva_gral_grosor', ['Grosor normal', 'Delgada', 'Delgada y traslúcida', 'Gruesa', 'Muy gruesa'])}
                      {renderSelectOrto('Evaluación general (Margen)', 'gingiva_gral_margen', ['Margen gingival', 'Retraída en piezas'], true)}
                    </div>

                    <SectionHeader title="Arcos" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      {renderSelectOrto('Arco superior', 'arco_sup_forma', ['Ovoide', 'Triangular', 'Cuadrado'])}
                      {renderSelectOrto('Simetría superior', 'arco_sup_sim', ['Simétrico', 'Asimétrico'])}
                      {renderSelectOrto('Alineación superior', 'arco_sup_alin', ['Alineado', 'Apiñado en', 'Espaciado en'], true)}
                      {renderSelectOrto('DAD superior', 'arco_sup_dad', ['Sin DAD', 'Con DAD de'], true)}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                      {renderSelectOrto('Arco inferior', 'arco_inf_forma', ['Ovoide', 'Triangular', 'Cuadrado'])}
                      {renderSelectOrto('Simetría inferior', 'arco_inf_sim', ['Simétrico', 'Asimétrico'])}
                      {renderSelectOrto('Alineación inferior', 'arco_inf_alin', ['Alineado', 'Apiñado en', 'Espaciado en'], true)}
                      {renderSelectOrto('DAD inferior', 'arco_inf_dad', ['Sin DAD', 'Con DAD de'], true)}
                    </div>

                    <SectionHeader title="Dientes y Alteraciones" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {['Error molar derecho', 'Error molar izquierdo', 'Dientes ausentes', 'Alteraciones de número, forma y tamaño de dientes'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{f}</label>
                          <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} style={inputStyleDoc} />
                        </div>
                      ))}
                    </div>

                    <SectionHeader title="Relaciones Oclusales" />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', rowGap: '30px' }}>
                      {renderSelectOrto('Relación molar derecha', 'rel_molar_der', ['Llave molar ideal', 'Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación molar izquierda', 'rel_molar_izq', ['Llave molar ideal', 'Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación canina derecha', 'rel_can_der', ['Clase I', 'Clase II', 'Clase III', 'NR'])}
                      {renderSelectOrto('Relación canina izquierda', 'rel_can_izq', ['Clase I', 'Clase II', 'Clase III', 'NR'])}

                      {renderSelectOrto('Mordida invertida', 'mord_invertida', ['Dentaria', 'Funcional', 'Esquelética'], true)}
                      {renderSelectOrto('Resalte horizontal', 'res_horizontal', ['NR', 'Normal', 'Aumentado', 'Invertido'], true)}
                      {renderSelectOrto('Curva de Spee', 'curva_spee', ['NR', 'Normal', 'Acentuada'], true)}
                      {renderSelectOrto('Resalte vertical', 'res_vertical', ['NR', 'Normal', 'Acentuada'], true)}

                      {renderSelectOrto('Des. Vert. Proceso Alveolar Sup', 'des_vert_sup', ['Normal', 'Disminuido', 'Aumentado'])}
                      {renderSelectOrto('Mordida abierta anterior', 'mord_abierta_ant', ['Dentaria', 'Dentialveolar por hábito', 'Esquelética'])}
                      {renderSelectOrto('Mordida abierta posterior', 'mord_abierta_post', ['Dentaria', 'Dentoalveolar por hábito', 'Esquelética', 'Completa'], true)}
                      {renderSelectOrto('Dimensión transversal maxilar', 'dim_trans_max', ['Normal', 'Disminuida', 'Aumentada'], true)}

                      {renderSelectOrto('Mordida cruzada posterior', 'mord_cruz_post', ['Ausente', 'Presente'])}
                      {renderSelectOrto('Altura Cusp. Palatinas Sup.', 'alt_cusp_pal', ['Normales', 'Altas', 'Bajas'])}
                      {renderSelectOrto('Línea media superior', 'linea_med_sup', ['Alineada', 'Discrepante a la derecha', 'Discrepante a la izquierda'], true)}
                      {renderSelectOrto('Línea media inferior', 'linea_med_inf', ['Alineada', 'Discrepante a la derecha', 'Discrepante a la izquierda'], true)}

                      {renderSelectOrto('Incisivos superiores', 'inc_sup', ['Normales', 'Vestibularizados', 'Palatinizados', 'Protruidos', 'Retruidos', 'Vestibularizados y protruídos', 'Vestibularizados y retruídos', 'Palatinizados y protruídos', 'Palatinizados y retruídos'])}
                      {renderSelectOrto('Incisivos inferiores', 'inc_inf', ['Normales', 'Vestibularizados', 'Palatinizados', 'Protruidos', 'Retruidos', 'Vestibularizados y protruídos', 'Vestibularizados y retruídos', 'Lingualizados y protruídos', 'Lingualizados y retruídos'])}
                      {renderSelectOrto('Patrón de Clase II-2', 'patron_clase_2', ['Tipo A', 'Tipo B', 'Tipo C'], true)}
                    </div>

                    <SectionHeader title="Conclusión" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px' }}>
                      {['Observaciones', 'Maloclusión'].map(f => (
                        <div key={f} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: '20px' }}>
                          <label style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{f}</label>
                          <input value={ortoForm[f] || ''} onChange={e => handleOrto(f, e.target.value)} placeholder="Anotaciones adicionales..." style={inputStyleDoc} />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                      <button onClick={handleSaveOrto} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 40px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {savingOrto ? 'Guardando en Supabase...' : '💾 Guardar Examen Clínico'}
                      </button>
                    </div>

                  </div>
                )}

                {subTabOrto === 'trabajo' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>

                    <SectionHeader title="Sección" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Fotografías set ortodóntico', 'Fotografías set quirúrgico'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Modelos de estudio con alginato', 'Modelos de estudio con silicona'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['TAC de volumen completo con protocolo Morzán', 'TAC de volumen completo sin informe', 'TAC de campo pequeño'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea placeholder="Notas de sección..." value={planTrabajoForm.notas_seccion || ''} onChange={e => handlePlanTrabajo('notas_seccion', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />

                    <SectionHeader title="Radiografías" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Postero anterior', 'Periapicales de incisivos superiores', 'Periapicales de incisivos inferiores'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Bitewing de molares', 'Bitewing de molares y premolares', 'Bitewing de premolares'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Carpal', 'Oclusal superior', 'Oclusal inferior', 'Panorámica'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea placeholder="Notas de radiografías..." value={planTrabajoForm.notas_radio || ''} onChange={e => handlePlanTrabajo('notas_radio', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />

                    <SectionHeader title="Interconsultas" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Otorrinolaringólogo', 'Odontopediatra', 'Odontólogo General'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Cirujano Máxilo facial', 'Periodoncista', 'Médica'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                        {['Fisioterapeuta Oral', 'Psicólogo', 'Encerado diagnóstico', 'Exámenes auxiliares'].map(opt => (
                          <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={planTrabajoForm[opt] || false} onChange={e => handlePlanTrabajo(opt, e.target.checked)} /> {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                    <textarea placeholder="Notas de interconsultas..." value={planTrabajoForm.notas_inter || ''} onChange={e => handlePlanTrabajo('notas_inter', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none', marginBottom: '30px' }} />

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Informes</label>
                      <textarea value={planTrabajoForm.informes || ''} onChange={e => handlePlanTrabajo('informes', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Diagnóstico definitivo</label>
                      <textarea value={planTrabajoForm.diag_definitivo || ''} onChange={e => handlePlanTrabajo('diag_definitivo', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Objetivo</label>
                      <textarea value={planTrabajoForm.objetivo || ''} onChange={e => handlePlanTrabajo('objetivo', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                      <button onClick={handleSavePlanTrabajo} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 60px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)' }}>
                        {savingTrabajo ? 'Guardando...' : 'Guardar Plan de Trabajo'}
                      </button>
                    </div>

                  </div>
                )}

                {subTabOrto === 'tratamiento' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>

                    <SectionHeader title="Sección" />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha inicial</label>
                        <input type="date" value={planTrataForm.fecha_inicial || ''} onChange={e => handlePlanTrata('fecha_inicial', e.target.value)} style={inputStyleDoc} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Tiempo estimado <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>(meses)</span></label>
                        <input type="number" placeholder="Ej: 18" value={planTrataForm.tiempo_estimado || ''} onChange={e => handlePlanTrata('tiempo_estimado', e.target.value)} style={inputStyleDoc} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha final</label>
                        <input type="date" value={planTrataForm.fecha_final || ''} onChange={e => handlePlanTrata('fecha_final', e.target.value)} style={inputStyleDoc} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Tipo</span>
                      <select value={planTrataForm.tipo_1 || ''} onChange={e => handlePlanTrata('tipo_1', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Interceptivo', 'Guía de oclusión', 'Ortodóntico', 'Ortopédico', 'Ortodóntico - Ortopédico', 'Ortodóntico interdisciplinario', 'Ortodóntico interprofesional'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={planTrataForm.tipo_2 || ''} onChange={e => handlePlanTrata('tipo_2', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Ortodoncia con PAOO'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={planTrataForm.tipo_3 || ''} onChange={e => handlePlanTrata('tipo_3', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Alineadores Invisaling'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={planTrataForm.tipo_4 || ''} onChange={e => handlePlanTrata('tipo_4', e.target.value)} style={inputStyleDoc}>
                        <option value="">Seleccionar</option>
                        {['Ortodoncia con corticotomía', 'Alineadores Keep Smiling'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <textarea placeholder="Notas de sección..." value={planTrataForm.notas_seccion || ''} onChange={e => handlePlanTrata('notas_seccion', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none', marginBottom: '10px' }} />

                    <SectionHeader title="Aparatos Ortopédicos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '15px', marginBottom: '15px' }}>
                      {['AEO', 'Hiperpropulsión con bloques gemelos', 'Hiperpropulsión con Bionator', 'ERP Haas', 'ERP Hyrax', 'ERP MARPE tipo Moon', 'ERP MARPE con acrílico', 'Máscara facial Delaire', 'Máscara facial Petit', 'Mentonera', 'Placa labio activa', 'Pantalla oral'].map(opt => (
                        <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea placeholder="Notas de aparatos ortopédicos..." value={planTrataForm.notas_ortopedicos || ''} onChange={e => handlePlanTrata('notas_ortopedicos', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />

                    <SectionHeader title="Anclaje" />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '20px', maxWidth: '700px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Superior</span>
                        <select value={planTrataForm.anclaje_sup || ''} onChange={e => handlePlanTrata('anclaje_sup', e.target.value)} style={{ ...inputStyleDoc, flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>Inferior</span>
                        <select value={planTrataForm.anclaje_inf || ''} onChange={e => handlePlanTrata('anclaje_inf', e.target.value)} style={{ ...inputStyleDoc, flex: 1 }}>
                          <option value="">Seleccionar</option>
                          {['Máximo', 'Mediano', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '15px' }}>
                      {['Mini implantes', 'Bicorticales', 'Mini placas', 'Mini implantes palatinos paramediales', 'Mini implantes bicorticales paramediales'].map(opt => (
                        <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea placeholder="Notas de anclaje..." value={planTrataForm.notas_anclaje || ''} onChange={e => handlePlanTrata('notas_anclaje', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />

                    <SectionHeader title="Aparatos" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '15px', marginBottom: '15px' }}>
                      {['Distal jet óseo', 'ATP semi fijo', 'Brazo de poder para tracción mesial de molar', 'Placa activa de expansión', 'Péndulo óseo', 'ATP más botón de Nance', 'Placa para levantar mordida', 'Mantenedor de espacio', 'Resorte vestibular para distalizar molar', 'ATP fijo', 'VAC modificado', 'Recuperador de espacio', 'MUST óseo', 'Arco lingual semi fijo', 'ALF', 'Rejilla lingual', 'Cantilever óseo', 'Botón de Nance óseo', 'AEO ortodóntico', 'QUAD HÉLIX'].map(opt => (
                        <label key={opt} style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={planTrataForm[opt] || false} onChange={e => handlePlanTrata(opt, e.target.checked)} /> {opt}
                        </label>
                      ))}
                    </div>
                    <textarea placeholder="Notas de aparatos..." value={planTrataForm.notas_aparatos || ''} onChange={e => handlePlanTrata('notas_aparatos', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />

                    <SectionHeader title="Otros" />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '15px' }}>
                      {renderSelectTrata('Técnica', 'tecnica', ['CCO', 'Roth', 'Estándar', 'Mbt', 'Autoligantes', 'Linguales'])}
                      {renderSelectTrata('Brackets', 'brackets', ['Brackets de acero', 'Brackets de porcelana', 'Brackets de porcelana superior y de acero inferiores'])}
                      {renderSelectTrata('Tubos adhesivos sup.', 'tubos_adh_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Tubos adhesivos inf.', 'tubos_adh_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}

                      {renderSelectTrata('Banda superior', 'banda_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Banda inferior', 'banda_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Tubos soldados sup.', 'tubos_sol_sup', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}
                      {renderSelectTrata('Tubos soldados inf.', 'tubos_sol_inf', ['Primeras molares', 'Segundas molares', 'Primeras y segundas molares'])}

                      <div style={{ gridColumn: 'span 2' }}>
                        {renderSelectTrata('Extracciones', 'extracciones', ['Primeras premolares superiores e inferiores', 'Primeras premolares superiores', 'Primeras premolares superiores y segundas premolares inferiores'])}
                      </div>
                    </div>
                    <textarea placeholder="Notas de la sección Otros..." value={planTrataForm.notas_otros || ''} onChange={e => handlePlanTrata('notas_otros', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none', marginBottom: '30px' }} />

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '14px', marginBottom: '8px' }}>Descripción</label>
                      <textarea value={planTrataForm.descripcion_general || ''} onChange={e => handlePlanTrata('descripcion_general', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                      <button onClick={handleSavePlanTrata} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 60px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {savingTrata ? 'Guardando...' : 'Guardar Plan de Tratamiento'}
                      </button>
                    </div>

                  </div>
                )}

                {subTabOrto === 'resumen' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>

                    <SectionHeader title="Sección" />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha inicial</label>
                        <input type="date" value={resumenForm.fecha_inicial || ''} onChange={e => handleResumen('fecha_inicial', e.target.value)} style={inputStyleDoc} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Fecha final</label>
                        <input type="date" value={resumenForm.fecha_final || ''} onChange={e => handleResumen('fecha_final', e.target.value)} style={inputStyleDoc} />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Tiempo estimado</label>
                        <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                          <input type="number" value={resumenForm.tiempo_estimado || ''} onChange={e => handleResumen('tiempo_estimado', e.target.value)} style={{ ...inputStyleDoc, border: 'none', borderRadius: 0, flex: 1 }} />
                          <div style={{ background: '#f8fafc', padding: '0 20px', display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '13px', borderLeft: '1px solid #cbd5e1' }}>Meses</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Tipo de Brackets</label>
                        <select value={resumenForm.tipo_brackets || ''} onChange={e => handleResumen('tipo_brackets', e.target.value)} style={inputStyleDoc}>
                          <option value="">Seleccionar</option>
                          {['Bracket metálico', 'Bracket cerámico', 'Bracket zafiro', 'Bracket lingual', 'Bracket férulas', 'Bracket resina', 'Autoligante metálico', 'Autoligante estético', 'Iconix', 'Carriere slx 3D', 'Invisalign', 'Aliwell', 'Smartaligner', 'CCO system', 'Otros'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '13px', marginBottom: '8px' }}>Diagnóstico</label>
                      <textarea value={resumenForm.diagnostico || ''} onChange={e => handleResumen('diagnostico', e.target.value)} style={{ ...inputStyleDoc, height: '100px', resize: 'none' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Anclaje superior</label>
                        <select value={resumenForm.anclaje_sup || ''} onChange={e => handleResumen('anclaje_sup', e.target.value)} style={inputStyleDoc}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ ...labelStyleDoc, fontSize: '13px' }}>Anclaje inferior</label>
                        <select value={resumenForm.anclaje_inf || ''} onChange={e => handleResumen('anclaje_inf', e.target.value)} style={inputStyleDoc}>
                          <option value="">Seleccionar</option>
                          {['Absoluto', 'Máximo', 'Medio', 'Mínimo'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                      <label style={{ ...labelStyleDoc, fontSize: '13px', marginBottom: '8px' }}>Nota</label>
                      <textarea value={resumenForm.notas || ''} onChange={e => handleResumen('notas', e.target.value)} style={{ ...inputStyleDoc, height: '80px', resize: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
                      <button onClick={handleSaveResumen} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 60px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,135,179,0.3)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {savingResumen ? 'Guardando...' : 'Guardar Resumen'}
                      </button>
                    </div>

                  </div>
                )}

                {subTabOrto === 'fotografias' && (
                  <div style={{ animation: 'fadeIn 0.3s ease' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', marginTop: '10px' }}>
                      <h3 style={{ color: '#0f172a', fontSize: '18px', fontWeight: 700, margin: 0 }}>Archivos Clínicos Iniciales</h3>
                      {savingFotosOrto && <span style={{ fontSize: '12px', color: '#0087b3', fontWeight: 600 }}>⏳ Sincronizando...</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', paddingBottom: '40px' }}>
                      {ORTO_CAJAS.map(item => {
                        const fileData = fotosOrto[item.key];
                        const hasFile = !!fileData;

                        return (
                          <div key={item.key} style={{ background: '#fff', border: `1px solid ${hasFile ? '#0087b3' : '#e2e8f0'}`, borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: hasFile ? '0 4px 6px rgba(0,135,179,0.1)' : '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>

                            {hasFile && (
                              <button onClick={() => handleDeleteFotoOrto(item.key, fileData.url)} style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, fontSize: 11, fontWeight: 'bold', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} title="Eliminar">✕</button>
                            )}

                            <div style={{ height: '140px', background: hasFile ? '#000' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

                              {hasFile ? (
                                fileData.ext.match(/(pdf|ppt|pptx)/i) ? (
                                  <a href={fileData.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontSize: '50px', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    📄 <span style={{ fontSize: '10px', marginTop: '5px', color: '#cbd5e1' }}>Abrir {fileData.ext.toUpperCase()}</span>
                                  </a>
                                ) : (
                                  <a href={fileData.url} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
                                    <img src={fileData.url} alt={item.key} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                  </a>
                                )
                              ) : (
                                <div style={{ fontSize: '50px', opacity: 0.3, filter: 'grayscale(100%)' }}>{item.icon}</div>
                              )}

                              {!hasFile && (
                                <label style={{ position: 'absolute', inset: 0, cursor: savingFotosOrto ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.2s', background: 'rgba(241, 245, 249, 0.9)' }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0087b3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '8px', boxShadow: '0 4px 6px rgba(0,135,179,0.3)' }}>+</div>
                                  <span style={{ fontSize: '12px', color: '#0087b3', fontWeight: 700 }}>Subir {item.key}</span>
                                  <input type="file" accept={item.accept} style={{ display: 'none' }} disabled={savingFotosOrto} onChange={e => handleUploadFotoOrto(e, item.key)} />
                                </label>
                              )}
                            </div>

                            <div style={{ padding: '12px 14px', borderTop: '1px solid #e2e8f0', background: hasFile ? '#f0f9ff' : '#fff' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>{item.key}</div>
                              <div style={{ fontSize: '10px', color: hasFile ? '#0087b3' : '#94a3b8', marginTop: '4px', fontWeight: hasFile ? 600 : 400 }}>
                                {hasFile ? `✓ Subido el ${fileData.date}` : 'Pendiente'}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* --- PESTAÑA FILIACIÓN --- */}
        {tab === 'filiacion' && (
          <div style={{ padding: '30px', overflowY: 'auto', height: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '35px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: 600 }}>Datos Personales</h2>
                <div>
                  {!isEditingFiliacion ? (
                    <button onClick={() => setIsEditingFiliacion(true)} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
                      ✏️ Editar Campos
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleCancelEdit} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
                      <button onClick={handleSaveEditPatient} style={{ background: '#0087b3', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>{saving ? 'Guardando...' : '💾 Guardar Cambios'}</button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div><label style={labelStyleDoc}>Nombres y Apellidos</label><input disabled={!isEditingFiliacion} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>N° HC</label><input readOnly disabled value={editForm.num_hc || ''} placeholder="Autogenerado" style={{ ...inputStyleDoc, background: '#f1f5f9', borderColor: 'transparent', cursor: 'not-allowed', fontWeight: 'bold', color: '#64748b' }} /></div>
                <div><label style={labelStyleDoc}>Sexo</label><select disabled={!isEditingFiliacion} value={editForm.sexo || ''} onChange={e => setEditForm({ ...editForm, sexo: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Mujer">Mujer</option><option value="Hombre">Hombre</option></select></div>
                <div><label style={labelStyleDoc}>Documento</label><div style={{ display: 'grid', gridTemplateColumns: '85px 1fr', gap: '8px' }}><select disabled={!isEditingFiliacion} value={editForm.tipo_doc || ''} onChange={e => setEditForm({ ...editForm, tipo_doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="DNI">DNI</option><option value="CE">C.E.</option><option value="Pasaporte">Pasap.</option><option value="RUC">RUC</option></select><input disabled={!isEditingFiliacion} value={editForm.doc || ''} onChange={e => setEditForm({ ...editForm, doc: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div></div>
                <div><label style={labelStyleDoc}>Teléfono</label><div style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: '8px' }}><select disabled={!isEditingFiliacion} value={editForm.cod_pais || '+51'} onChange={e => setEditForm({ ...editForm, cod_pais: e.target.value })} style={{ ...inputStyleDoc, padding: '10px 6px', background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}>{TODAS_NACIONES.map(n => <option key={n.n} value={n.c}>{n.b} {n.c}</option>)}</select><input disabled={!isEditingFiliacion} value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div></div>
                <div><label style={labelStyleDoc}>Email</label><input disabled={!isEditingFiliacion} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>F. nacimiento y Edad</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '8px' }}><input disabled={!isEditingFiliacion} type="date" value={editForm.birthDate || ''} onChange={e => { const bDay = e.target.value; let calculatedAge = editForm.age; if (bDay) { const today = new Date(); const birth = new Date(bDay); calculatedAge = today.getFullYear() - birth.getFullYear(); } setEditForm({ ...editForm, birthDate: bDay, age: calculatedAge }); }} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /><input value={editForm.age || ''} readOnly placeholder="Edad" style={{ ...inputStyleDoc, background: '#f1f5f9', textAlign: 'center', borderColor: 'transparent' }} /></div></div>
                <div><label style={labelStyleDoc}>País de nacimiento</label><select disabled={!isEditingFiliacion} value={editForm.pais_nacimiento || ''} onChange={e => setEditForm({ ...editForm, pais_nacimiento: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option>{TODAS_NACIONES.map(n => <option key={n.n} value={n.n}>{n.b} {n.n}</option>)}</select></div>
                <div><label style={labelStyleDoc}>Ocupación</label><input disabled={!isEditingFiliacion} value={editForm.ocupacion || ''} onChange={e => setEditForm({ ...editForm, ocupacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div style={{ gridColumn: 'span 2' }}><label style={labelStyleDoc}>Dirección</label><input disabled={!isEditingFiliacion} value={editForm.direccion || ''} onChange={e => setEditForm({ ...editForm, direccion: e.target.value })} placeholder="+ Agregar" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>Grupo Sanguíneo</label><input disabled={!isEditingFiliacion} value={editForm.blood || ''} onChange={e => setEditForm({ ...editForm, blood: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
                <div><label style={labelStyleDoc}>Fuente captación</label><select disabled={!isEditingFiliacion} value={editForm.fuente_captacion || ''} onChange={e => setEditForm({ ...editForm, fuente_captacion: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Facebook">Facebook</option><option value="Instagram">Instagram</option><option value="Tiktok">Tiktok</option><option value="Google">Google</option><option value="Referido por paciente">Referido por paciente</option><option value="Referido por doctor">Referido por doctor</option><option value="Amigos y familiares">Amigos y familiares</option><option value="Fachada">Fachada</option></select></div>
                <div><label style={labelStyleDoc}>Línea de negocio</label><select disabled={!isEditingFiliacion} value={editForm.linea_negocio || ''} onChange={e => setEditForm({ ...editForm, linea_negocio: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }}><option value="">Seleccionar</option><option value="Ortodoncia">Ortodoncia</option><option value="Rehabilitación">Rehabilitación</option><option value="Estética">Estética</option><option value="Endodoncia">Endodoncia</option><option value="Tratamiento integral">Tratamiento integral</option><option value="Odontopediatría">Odontopediatría</option></select></div>
                <div><label style={labelStyleDoc}>Alergias</label><input disabled={!isEditingFiliacion} value={editForm.allergies || ''} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })} style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f8fafc', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} /></div>
              </div>

              {editForm.age < 18 && (
                <div style={{ marginTop: '45px' }}>
                  <h3 style={{ color: '#0087b3', fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Familiar / Apoderado <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 4 }}>Requerido</span>
                  </h3>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#0087b3', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '12px 20px' }}><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Nombre</div><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>N° doc</div><div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Parentesco</div></div>
                    <div style={{ background: '#f8fafc', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', padding: '20px' }}>
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado || ''} onChange={e => setEditForm({ ...editForm, apoderado: e.target.value })} placeholder="Nombre completo" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f1f5f9', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.apoderado_dni || ''} onChange={e => setEditForm({ ...editForm, apoderado_dni: e.target.value })} placeholder="DNI/CE" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f1f5f9', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} />
                      <input disabled={!isEditingFiliacion} value={editForm.parentesco || ''} onChange={e => setEditForm({ ...editForm, parentesco: e.target.value })} placeholder="Ej: Madre, Padre" style={{ ...inputStyleDoc, background: isEditingFiliacion ? '#fff' : '#f1f5f9', borderColor: isEditingFiliacion ? '#cbd5e1' : 'transparent' }} />
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
          />
        )}

        {/* --- PESTAÑA ANAMNESIS --- */}
        {tab === 'anamnesis' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%' }}>
              {[
                { title: 'Motivo de consulta', fields: ['Motivo principal', 'Tiempo con el síntoma', 'Intensidad del dolor (1-10)', 'Tratamientos previos para este problema'] },
                { title: 'Antecedentes médicos generales', fields: ['Enfermedades sistémicas', 'Medicamentos actuales', 'Alergias (medicamentos/materiales)', 'Cirugías o hospitalizaciones', 'Embarazo / lactancia'] },
                { title: 'Antecedentes estomatológicos', fields: ['Última visita dental', 'Tratamientos previos recibidos', 'Experiencias traumáticas dentales', 'Hábitos: bruxismo, succión, otros', 'Higiene oral: frecuencia de cepillado'] },
                { title: 'Signos vitales', fields: ['Presión arterial', 'Frecuencia cardíaca', 'Temperatura', 'Peso / Talla'] },
              ].map((sec, si) => (
                <div key={si} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 15 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 11, paddingBottom: 7, borderBottom: `1px solid ${MT}` }}>{sec.title}</div>
                  {sec.fields.map((f, fi) => (
                    <div key={fi} style={{ marginBottom: 9 }}>
                      <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 2 }}>{f}</label>
                      <input style={{ width: '100%', border: 'none', borderBottom: `1px solid ${BD}`, padding: '3px 0', fontSize: 12, outline: 'none', color: DN, background: 'transparent', boxSizing: 'border-box' }}
                        value={anamnesisData[f] !== undefined ? anamnesisData[f] : (f.includes('Alerg') ? (patData?.allergies || patient.allergies) : f.includes('Medic') ? (patData?.meds || patient.meds) : '')}
                        onChange={e => setAnamnesisData({ ...anamnesisData, [f]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={saveAllToCloud} style={{ marginTop: 14, background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar anamnesis</button>
          </div>
        )}

        {/* --- PESTAÑA PLAN --- */}
        {tab === 'plan' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Plan de tratamiento — {patData?.name || patient.name}</div>
              <button onClick={() => setShowTreatPicker(!showTreatPicker)} style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Agregar tratamiento</button>
            </div>
            {showTreatPicker && (
              <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: DN, marginBottom: 10 }}>Seleccionar tratamiento:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                  {TRATAMIENTOS_CAT.map(cat => (
                    <div key={cat.cat}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: P, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .3 }}>{cat.cat}</div>
                      {cat.items.map(item => (
                        <div key={item} onClick={() => { setPlan(p => [...p, { id: Date.now(), name: item, tooth: '—', status: 'pendiente', cost: PRECIOS[item] || 0, paid: 0, date: '—', sessions: 1 }]); setShowTreatPicker(false); }}
                          style={{ fontSize: 11, color: DN, padding: '3px 7px', borderRadius: 5, cursor: 'pointer', marginBottom: 2 }}
                          onMouseEnter={e => { e.currentTarget.style.background = MT; e.currentTarget.style.color = P }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DN }}>
                          {item} — S/{PRECIOS[item] || 0}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {['pendiente', 'en_curso', 'completado'].map(st => {
              const items = plan.filter(i => i.status === st);
              const b = sc(st);
              return (
                <div key={st} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: b.c, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.c }} />{st.replace('_', ' ')} ({items.length})
                  </div>
                  {items.map(item => (
                    <div key={item.id} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: '10px 14px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 120 }}><div style={{ fontSize: 12, fontWeight: 600, color: DN }}>{item.name}</div><div style={{ fontSize: 10, color: MU }}>Pieza: {item.tooth} · {item.date}</div></div>
                      <div style={{ fontSize: 12, color: DN }}>S/{item.cost}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {['pendiente', 'en_curso', 'completado'].filter(s => s !== st).map(ns => (
                          <button key={ns} onClick={() => setPlan(p => p.map(i => i.id === item.id ? { ...i, status: ns } : i))}
                            style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${sc(ns).c}`, background: sc(ns).bg, color: sc(ns).c, fontWeight: 600 }}>
                            → {ns.replace('_', ' ')}
                          </button>
                        ))}
                        <button onClick={() => setPlan(p => p.filter(i => i.id !== item.id))}
                          style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, cursor: 'pointer', border: `1px solid ${RJ}44`, background: '#fef2f2', color: RJ, fontWeight: 700 }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 11, color: MU, fontStyle: 'italic', padding: '5px 8px' }}>Sin tratamientos en este estado</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* --- PESTAÑA EVOLUCIÓN --- */}
        {tab === 'evolucion' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Notas de evolución</div>
              <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva nota</button>
            </div>
            {[{ date: '10 Jun 2025', dr: 'Dra. Sol Vargas', txt: 'Control de ortodoncia. Arco superior ajustado. Paciente refiere leve sensibilidad en pieza 14. Se recomienda pasta para dientes sensibles y enjuague con fluoruro. Próximo control en 4 semanas.' }, { date: '15 Mar 2025', dr: 'Dra. Sol Vargas', txt: 'Instalación de brackets superior e inferior. Se explica protocolo de higiene oral detallado. Paciente tolera bien el procedimiento. Sin complicaciones postoperatorias inmediatas.' }, { date: '10 Ene 2025', dr: 'Dra. Sol Vargas', txt: 'Consulta inicial. Evaluación integral de salud bucal. Se presenta maloclusión clase II. Se propone tratamiento de ortodoncia con brackets metálicos. Plan y presupuesto aceptado.' }]
              .map((n, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 15, marginBottom: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: P }}>{n.date}</span>
                    <span style={{ fontSize: 10, color: MU }}>{n.dr}</span>
                  </div>
                  <div style={{ fontSize: 12, color: DN, lineHeight: 1.7 }}>{n.txt}</div>
                </div>
              ))}
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: DN, marginBottom: 8 }}>Nueva nota clínica</div>
              <textarea placeholder="Descripción de la consulta, hallazgos clínicos, procedimiento realizado y recomendaciones..." style={{ width: '100%', minHeight: 80, padding: 9, border: `1px solid ${BD}`, borderRadius: 7, fontSize: 12, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <button style={{ marginTop: 8, background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💾 Guardar</button>
            </div>
          </div>
        )}

        {/* --- PESTAÑA RECETAS --- */}
        {tab === 'recetas' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Recetas médicas</div>
              <button style={{ background: P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Nueva receta</button>
            </div>
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 20, maxWidth: 500 }}>
              <div style={{ textAlign: 'center', borderBottom: `1px solid ${BD}`, paddingBottom: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: MU }}>Cirujano Dentista · COP 12345</div>
                <div style={{ fontSize: 10, color: MU }}>Los Diamantes 178, Trujillo · +51 915 054 145</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[['Paciente', patData?.name || patient.name], ['DNI', patData?.doc || patient.doc], ['Edad', (patData?.age || patient.age) + ' años'], ['Fecha', new Date().toLocaleDateString('es-PE')]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 9, color: MU }}>{k}</div><div style={{ fontSize: 11, fontWeight: 600, color: DN, borderBottom: `1px solid ${BD}` }}>{v}</div></div>
                ))}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: DN, marginBottom: 8 }}>Rp:</div>
              {[{ med: 'Amoxicilina 500mg', dose: '1 cápsula cada 8h x 7 días', inst: 'Tomar con alimentos' }, { med: 'Ibuprofeno 400mg', dose: '1 tableta cada 8h si hay dolor', inst: 'No superar 3 dosis/día' }].map((r, i) => (
                <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px dashed ${BD}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: DN }}>• {r.med}</div>
                  <div style={{ fontSize: 11, color: MU, marginLeft: 12 }}>{r.dose}</div>
                  <div style={{ fontSize: 10, color: MU, marginLeft: 12, fontStyle: 'italic' }}>{r.inst}</div>
                </div>
              ))}
              <textarea placeholder="Agregar medicamentos..." style={{ width: '100%', minHeight: 44, padding: 6, border: `1px solid ${BD}`, borderRadius: 6, fontSize: 11, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <div style={{ marginTop: 12, borderTop: `1px solid ${BD}`, paddingTop: 10, textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: MU, marginBottom: 2 }}>Firma y sello</div>
                <div style={{ height: 40, border: `1px dashed ${BD}`, borderRadius: 5 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button style={{ flex: 1, background: P, color: '#fff', border: 'none', borderRadius: 7, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🖨 Imprimir</button>
                <button style={{ flex: 1, background: WA, color: '#fff', border: 'none', borderRadius: 7, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💬 Enviar WA</button>
              </div>
            </div>
          </div>
        )}

        {/* --- PESTAÑA IMÁGENES --- */}
        {tab === 'imagenes' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DN }}>Imágenes y Radiografías</div>

              <input type="file" id="file-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              <label htmlFor="file-upload" style={{ background: saving ? MU : P, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? '⏳ Subiendo...' : '+ Subir imagen'}
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
              {imagenesList.map((img, i) => (
                <div key={i} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, overflow: 'hidden', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(i, img.url);
                    }}
                    style={{ position: 'absolute', top: 6, right: 6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 10, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    title="Eliminar imagen"
                  >
                    ✕
                  </button>

                  <div style={{ height: 100, background: LT, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img src={img.url} alt="Radiografía" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '7px 10px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: DN }}>{img.type}</div>
                    <div style={{ fontSize: 9.5, color: MU }}>{img.date}</div>
                  </div>
                </div>
              ))}

              <label htmlFor="file-upload" style={{ background: LT, border: `2px dashed ${BD}`, borderRadius: 10, height: 148, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 6 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = P} onMouseLeave={e => e.currentTarget.style.borderColor = BD}>
                <div style={{ fontSize: 28, color: BD }}>+</div>
                <div style={{ fontSize: 10, color: MU, fontWeight: 600 }}>Subir archivo</div>
              </label>
            </div>
          </div>
        )}

        {/* --- PESTAÑA PRESUPUESTO --- */}
        {tab === 'presupuesto' && (
          <div style={{ padding: 18, overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Presupuesto</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ background: '#fff', color: '#0087b3', border: `1px solid #0087b3`, borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🖨 Imprimir</button>
                <button style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>💬 WhatsApp</button>
              </div>
            </div>
            
            <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BD}` }}>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: MU }}>Tratamiento</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: MU }}>Pieza</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: MU }}>Costo (S/)</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: MU }}>Acuenta (S/)</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: MU }}>Saldo (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: idx === plan.length - 1 ? 'none' : `1px solid ${BD}` }}>
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: DN }}>{item.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: DN }}>{item.tooth}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: DN }}>{item.cost.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#0ea5e9', fontWeight: 600 }}>{item.paid.toFixed(2)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: (item.cost - item.paid) > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{(item.cost - item.paid).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: '#f8fafc', borderTop: `2px solid ${BD}` }}>
                  <tr>
                    <td colSpan={2} style={{ padding: '14px 16px', fontSize: 12, fontWeight: 800, color: DN, textAlign: 'right' }}>TOTALES:</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: DN }}>S/ {plan.reduce((acc, curr) => acc + curr.cost, 0).toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: '#0ea5e9' }}>S/ {plan.reduce((acc, curr) => acc + curr.paid, 0).toFixed(2)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 800, color: '#ef4444' }}>S/ {plan.reduce((acc, curr) => acc + (curr.cost - curr.paid), 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div style={{ marginTop: 20, background: '#fff', border: `1px dashed ${BD}`, borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 'bold' }}>$</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0284c7' }}>Registrar nuevo pago / abono</span>
            </div>
            
          </div>
        )}

        {/* --- PESTAÑA CONSENTIMIENTOS --- */}
        {tab === 'consentimientos' && (
          <Consentimientos patient={patData || patient} />
        )}

      </div>
    </div>
  );
}