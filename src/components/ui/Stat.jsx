// src/components/ui/Stat.jsx
import React from 'react';
import { BD, P, MU, DN } from '../../utils/constants';

export default function Stat({ label, value, sub, col, onClick }) {
  return (
    <div onClick={onClick} style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 11, padding: '13px 17px', flex: 1, minWidth: 115, cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = P)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = BD)}>
      <div style={{ fontSize: 10, color: MU, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: col || DN, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#22a55a', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}