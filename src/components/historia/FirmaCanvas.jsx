// src/components/historia/FirmaCanvas.jsx
import React, { useRef, useEffect } from 'react';
import { BD, WA, RJ } from '../../utils/constants';

export default function FirmaCanvas({ label, sub, onFirma, firmaUrl, readonly = false }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext('2d');
    ctx.clearRect(0, 0, ref.current.width, ref.current.height);
    if (firmaUrl) { 
      const img = new Image(); 
      img.onload = () => ctx.drawImage(img, 0, 0, ref.current.width, ref.current.height); 
      img.src = firmaUrl; 
    }
  }, [firmaUrl]);

  const getPos = (e, c) => { 
    const r = c.getBoundingClientRect(); 
    const s = e.touches ? e.touches[0] : e; 
    return { x: (s.clientX - r.left) * (c.width / r.width), y: (s.clientY - r.top) * (c.height / r.height) }; 
  };

  const start = e => { if (readonly) return; e.preventDefault(); drawing.current = true; last.current = getPos(e, ref.current); };
  
  const move = e => {
    if (!drawing.current || readonly) return; e.preventDefault();
    const p = getPos(e, ref.current);
    const ctx = ref.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    last.current = p;
  };

  const end = () => { drawing.current = false; if (onFirma && ref.current) onFirma(ref.current.toDataURL('image/png')); };
  const clear = () => { if (readonly) return; ref.current.getContext('2d').clearRect(0, 0, ref.current.width, ref.current.height); onFirma && onFirma(null); };

  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ borderBottom: '1px solid #333', marginBottom: 4, overflow: 'hidden', background: '#fafff9', touchAction: 'none', borderRadius: '4px 4px 0 0', border: `1px solid ${BD}` }}>
        <canvas ref={ref} width={340} height={80}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{ display: 'block', cursor: readonly ? 'default' : 'crosshair', width: '100%', height: 80 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'serif', color: '#333', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 10, color: '#666', fontFamily: 'serif' }}>{sub}</div>}
          {firmaUrl && <div style={{ fontSize: 9, color: WA, fontWeight: 700 }}>✓ Firmado</div>}
        </div>
        {!readonly && <button onClick={clear} style={{ fontSize: 9, color: RJ, background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 2 }}>Borrar</button>}
      </div>
    </div>
  );
}