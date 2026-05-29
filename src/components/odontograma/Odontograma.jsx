// src/components/odontograma/Odontograma.jsx
import React, { useState } from 'react';
import { P, RJ, AZ, BD, MU, DN, LT, MT, TOOLS, UA, LA, UP, LP, TNAME } from '../../utils/constants';
import { gt, getSurfs, isMol, isPM } from '../../utils/helpers';

// ============================================================================
// 1. TOOTHSVG (Integrado nativamente)
// ============================================================================
function ToothSVG({ num, upper, surfs = {}, active, onClick, w = 31 }) {
  const W = w, CH = 20, RH = 22, TH = CH + RH, M = isMol(num), PM = isPM(num), cY = upper ? 0 : RH;
  const conds = Object.entries(surfs).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
  const dom = conds.length ? gt(conds[0][1]) : null;
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
// 2. OCCLUSALMAP (Integrado nativamente y reparado para React)
// ============================================================================
function OcclusalMap({ num, surfs, activeTool, onSurf, size = 160 }) {
  const [hovered, setHovered] = useState(null);
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
        const baseFill = h ? (t.g === 'r' ? RJ + 'cc' : AZ + 'cc') : '#f8fafc';
        const fill = hovered === sf ? at.col + '88' : baseFill;
        
        return (
          <path key={sf} d={path} fill={fill} stroke="rgba(0,0,0,.1)" strokeWidth="1"
            style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }} 
            onClick={() => onSurf(sf)}
            onMouseEnter={() => setHovered(sf)}
            onMouseLeave={() => setHovered(null)}
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
            {esExtraer && <rect x={tx - 14} y={ty - 6} width="28" height="13" rx="2" fill={RJ} />}
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={sf === sf0 ? 12 : 10}
              fontWeight="800" fill={esExtraer || h ? '#fff' : '#94a3b8'} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {esExtraer ? 'EXT' : (h && t.sig ? t.sig : sf)}
            </text>
          </g>
        );
      })}
      <text x={cx} y={S + 12} textAnchor="middle" fontSize="11" fill="#0D5C6B" fontWeight="900">{num}</text>
    </svg>
  );
}

// ============================================================================
// 3. ODONTOGRAMA PRINCIPAL (Lógica de clonado profundo a prueba de balas)
// ============================================================================
export default function Odontograma({ patient, teeth, setTeeth, teethEvolucion, setTeethEvolucion }) {
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

  // Lógica blindada: Copia profunda del objeto para forzar re-render en React
  const applyAll = n => {
    setCurrentTeeth(prev => {
      const nextState = JSON.parse(JSON.stringify(prev || {}));
      if (act === 'normal') {
        delete nextState[n];
      } else {
        if (!nextState[n]) nextState[n] = {};
        getSurfs(n).forEach(s => nextState[n][s] = act);
      }
      return nextState;
    });
    setSel(n);
  };

  const applySurf = (n, sf) => {
    // Console log agregado para diagnosticar si el clic está llegando
    console.log(`Pintando pieza ${n}, superficie ${sf} con la herramienta: ${act}`);
    setCurrentTeeth(prev => {
      const nextState = JSON.parse(JSON.stringify(prev || {}));
      if (!nextState[n]) nextState[n] = {};
      
      if (act === 'normal' || nextState[n][sf] === act) {
        delete nextState[n][sf];
      } else {
        nextState[n][sf] = act;
      }
      return nextState;
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
            <span style={{ marginLeft: 'auto', fontSize: 11, color: MU, fontWeight: 600 }}>{new Date().toLocaleDateString('es-PE')}</span>
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
            <button onClick={() => setCurrentTeeth(p => { const next = JSON.parse(JSON.stringify(p||{})); delete next[sel]; return next; })} style={{ background: '#fef2f2', color: RJ, border: `1px solid ${RJ}44`, borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>↺</button>
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
          <textarea placeholder="Observaciones específicas..." defaultValue={selSurfs.note || ''} onBlur={e => setCurrentTeeth(p => { const next = JSON.parse(JSON.stringify(p||{})); if(!next[sel]) next[sel]={}; next[sel].note = e.target.value; return next; })}
            style={{ width: '100%', minHeight: 60, padding: 10, border: `1px solid ${BD}`, borderRadius: 8, fontSize: 11, resize: 'vertical', outline: 'none', color: DN, fontFamily: 'inherit', boxSizing: 'border-box', background: '#f8fafc' }} />
        </div>
      )}
    </div>
  );
}