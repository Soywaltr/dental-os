// src/components/odontograma/OcclusalMap.jsx
import React, { useState } from 'react';
import { RJ, AZ } from '../../utils/constants';
import { gt, getSurfs } from '../../utils/helpers';

export default function OcclusalMap({ num, surfs, activeTool, onSurf, size = 160 }) {
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
        const c = surfs[sf];
        const t = gt(c);
        const h = c && c !== 'normal';
        
        // Color base (si tiene hallazgo o no)
        const baseFill = h ? (t.cr === 'r' ? RJ + 'cc' : AZ + 'cc') : '#f8fafc';
        // Color al pasar el mouse
        const fill = hovered === sf ? (at.col + '88') : baseFill;

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