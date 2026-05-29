import React from 'react';
import { P, RJ, AZ } from '../../utils/constants';
import { gt, isMol, isPM } from '../../utils/helpers';

export default function ToothSVG({ num, upper, surfs = {}, active, onClick, w = 31 }) {
  const W = w, CH = 20, RH = 22, TH = CH + RH, M = isMol(num), PM = isPM(num), cY = upper ? 0 : RH;
  const conds = Object.entries(surfs).filter(([k, v]) => v && v !== 'normal' && k !== 'note');
  const dom = conds.length ? gt(conds[0][1]) : null;
  const cf = !dom ? '#f8fafc' : dom.cr === 'r' ? RJ + 'dd' : dom.mk === 'x' ? '#64748b22' : AZ + 'dd';

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

      {/* Raíz */}
      <path d={rp} fill="#f8fafc" stroke={active ? P : '#64748b'} strokeWidth={active ? 1.5 : .8} />

      {/* Corona */}
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

      {/* Otros marcadores */}
      {dom?.mk === 'x' && <><line x1="2" y1="2" x2={W - 2} y2={TH - 2} stroke="#64748b" strokeWidth="2" /><line x1={W - 2} y1="2" x2="2" y2={TH - 2} stroke="#64748b" strokeWidth="2" /></>}
      {dom?.mk === 'ca' && <ellipse cx={W / 2} cy={cY + CH / 2} rx={(W - 4) / 2} ry={CH / 2 - 1} fill="none" stroke={AZ} strokeWidth="2" />}
      {dom?.mk === 'cr' && <ellipse cx={W / 2} cy={cY + CH / 2} rx={(W - 4) / 2} ry={CH / 2 - 1} fill="none" stroke={RJ} strokeWidth="2" />}
      {dom?.mk === 'frac' && <line x1="3" y1={cY + 2} x2={W - 3} y2={cY + CH - 2} stroke={RJ} strokeWidth="2" />}
      {dom?.mk === 'root' && <line x1={W / 2} y1={upper ? CH + 3 : 2} x2={W / 2} y2={upper ? TH - 2 : RH - 2} stroke={AZ} strokeWidth="2" />}
      {conds.length > 1 && <circle cx={W - 5} cy={4} r="3.5" fill={P} />}
    </svg>
  );
}