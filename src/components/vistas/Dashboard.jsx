// src/components/vistas/Dashboard.jsx
import React from 'react';
import { TODAY, P, DN, MU, WA, RJ } from '../../utils/constants';

export default function Dashboard({ setView, setSelPat }) {
  
  const MetricCard = ({ title, date, mainValue, subValue, subColor, children }) => (
    <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', border: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: DN, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: P }}>✦</span> {title}
          </div>
          {date && <div style={{ fontSize: 11, color: MU, marginTop: 4 }}>{date}</div>}
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU }}>
          ↗
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: DN, lineHeight: 1 }}>{mainValue}</div>
        {subValue && <div style={{ fontSize: 12, fontWeight: 700, color: subColor, display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 4 }}>● {subValue}</div>}
      </div>
      
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* ─── BANNER SUPERIOR DE INGRESOS (Corregido: Ya no se superpone) ─── */}
      <div style={{ alignSelf: 'center', background: '#fff', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f1f5f9', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: P, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 12 }}>SV</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: DN }}>Consultorio Activo</span>
        </div>
        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: MU, fontWeight: 600 }}>Ingresos del mes:</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: DN }}>S/ 4,820</span>
          <span style={{ color: WA, background: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontSize: 10, fontWeight: 800 }}>✓</span>
        </div>
      </div>

      {/* ─── CONTENEDOR PRINCIPAL RESPONSIVO ─── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* LADO IZQUIERDO: GRID DE MÉTRICAS */}
        <div style={{ flex: '2 1 600px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignContent: 'start' }}>
          
          <MetricCard title="Citas Hoy" date="Última actualización: hace 5m" mainValue={TODAY.length} subValue="2 Pendientes" subColor={WA}>
            <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'flex-end' }}>
              {[30, 50, 40, 70, 60, 90, 80, 50, 60, 100].map((h, i) => (
                <div key={i} style={{ flex: 1, background: i > 6 ? '#e2e8f0' : '#86efac', height: `${h}%`, borderRadius: '4px' }} />
              ))}
            </div>
          </MetricCard>

          <MetricCard title="Pacientes Nuevos" date="Mes de Mayo" mainValue="88" subValue="+12% Crecimiento" subColor={WA}>
            <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'flex-end' }}>
              {[60, 40, 50, 30, 80, 60, 50, 90, 70, 40].map((h, i) => (
                <div key={i} style={{ flex: 1, background: i % 2 === 0 ? '#86efac' : '#e2e8f0', height: `${h}%`, borderRadius: '4px' }} />
              ))}
            </div>
          </MetricCard>

          <MetricCard title="Saldos Pendientes" date="Facturas no pagadas" mainValue="S/ 750" subValue="Revisión necesaria" subColor={RJ}>
             <div style={{ display: 'flex', gap: 4, height: 40, alignItems: 'flex-end' }}>
              {[20, 30, 10, 40, 20, 30, 50, 60, 30, 20].map((h, i) => (
                <div key={i} style={{ flex: 1, background: i > 5 ? '#fca5a5' : '#e2e8f0', height: `${h}%`, borderRadius: '4px' }} />
              ))}
            </div>
          </MetricCard>

          {/* Citas del Día a lo ancho */}
          <div style={{ gridColumn: '1 / -1', background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: DN, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ color: P }}>✦</span> Citas de Hoy
            </div>
             {TODAY.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < TODAY.length - 1 ? `1px solid #f1f5f9` : 'none', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: P, minWidth: 45 }}>{a.time}</div>
                <div style={{ width: 36, height: 36, borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: DN }}>{a.av}</div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DN }}>{a.patient}</div>
                  <div style={{ fontSize: 12, color: MU }}>{a.treat}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: '20px', background: a.status === 'pendiente' ? '#fef2f2' : '#f0f9ff', color: a.status === 'pendiente' ? RJ : P, textTransform: 'capitalize' }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* LADO DERECHO: ASISTENTE IA RESPONSIVO */}
        <div style={{ flex: '1 1 350px', background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', height: '650px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: DN, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: MU }}>✦</span> Asistente IA Nanda
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MU }}>⟳</div>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 18, marginTop: 4 }}>✨</div>
              <div style={{ flex: 1 }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', fontSize: 13, color: DN, lineHeight: 1.5 }}>
                  Por favor, sube una radiografía o un PDF de laboratorio para procesar los datos clínicos de hoy.
                </div>
                <div style={{ fontSize: 10, color: MU, marginTop: 6, textAlign: 'right' }}>10:57</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: P, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' }}>SV</div>
              <div style={{ flex: 1 }}>
                <div style={{ background: '#e0f2fe', padding: '12px 16px', borderRadius: '16px 16px 4px 16px', fontSize: 13, color: '#0369a1', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 12px', borderRadius: '10px', marginBottom: 8, border: '1px solid #bae6fd' }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: DN }}>Panoramica_Lozano.pdf</div>
                      <div style={{ fontSize: 10, color: MU }}>2.4 MB</div>
                    </div>
                  </div>
                  Claro, estoy subiendo el documento ahora. Avísame cuál es el siguiente paso.
                </div>
                <div style={{ fontSize: 10, color: MU, marginTop: 6 }}>10:59</div>
              </div>
            </div>

             <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 18, marginTop: 4 }}>✨</div>
              <div style={{ flex: 1 }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', fontSize: 13, color: DN, lineHeight: 1.5 }}>
                  Gracias. Procesando el archivo para extraer diagnóstico preliminar...
                </div>
                <div style={{ fontSize: 10, color: MU, marginTop: 6, textAlign: 'right' }}>11:00</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {['GPT-4o', 'Analizar Rx', 'Finanzas', 'Odontograma AI'].map(tag => (
              <div key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '6px 12px', background: tag === 'GPT-4o' ? DN : '#f1f5f9', color: tag === 'GPT-4o' ? '#fff' : '#64748b', borderRadius: '20px', cursor: 'pointer' }}>
                {tag}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, background: '#f8fafc', padding: '8px', borderRadius: '20px', border: `1px solid #e2e8f0` }}>
            <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MU, cursor: 'pointer' }}>+</div>
            <input placeholder="Escribe a Nanda..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: DN }} />
            <button style={{ width: 32, height: 32, borderRadius: '50%', background: DN, color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>➤</button>
          </div>

        </div>
      </div>
    </div>
  );
}