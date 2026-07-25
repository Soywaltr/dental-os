// src/components/vistas/Reportes.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Stat from '../ui/Stat';
import Icon from '../ui/Icon';
import { BD, P, PD, GL, MU, DN, MT, WA, AZ, RJ, CAT_ACCENT, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import { sc, estadoPaciente } from '../../utils/helpers';

// Paleta categórica validada (contraste + separación CVD) para identidad de tratamientos.
// El color se asigna por hash del nombre, no por ranking, para que un tratamiento
// conserve siempre el mismo color aunque cambie de posición.
const CAT_COLORS = [CAT_ACCENT, GL, AZ, WA, RJ];
const OTROS_COLOR = MU;
const colorPorNombre = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CAT_COLORS[hash % CAT_COLORS.length];
};

const parseFecha = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]); // aplanados, con patient_id
  const [hoverMes, setHoverMes] = useState(null);
  const [hoverTrat, setHoverTrat] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setErrorMsg(null);
      const [{ data: pacientesData, error: errP }, { data: historiasData, error: errH }] = await Promise.all([
        supabase.from('pacientes').select('id, name, tag, created_at, fecha'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
      ]);

      if (errP || errH) {
        setErrorMsg((errP || errH).message);
        setLoading(false);
        return;
      }

      setPacientes(pacientesData || []);
      const flat = (historiasData || []).flatMap(h =>
        (h.plan_tratamiento || []).map(item => ({ ...item, patient_id: h.patient_id }))
      );
      setTratamientos(flat);
      setLoading(false);
    };
    cargar();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 12 }}>Cargando analítica…</div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 12 }}>
        Error al cargar la analítica: {errorMsg}
      </div>
    );
  }

  // ── Pacientes por estado ──────────────────────────────────────────────────
  const estados = { activo: 0, nuevo: 0, inactivo: 0 };
  pacientes.forEach(p => { estados[estadoPaciente(p)]++; });

  // ── Tratamientos por estado ────────────────────────────────────────────────
  const estadoTrat = { pendiente: 0, en_curso: 0, completado: 0 };
  tratamientos.forEach(t => { if (estadoTrat[t.status] !== undefined) estadoTrat[t.status]++; });
  const totalTrat = tratamientos.length;
  const tasaCompletado = totalTrat > 0 ? Math.round((estadoTrat.completado / totalTrat) * 100) : 0;

  // ── Ingresos por mes (últimos 6 meses reales) ─────────────────────────────
  const hoy = new Date();
  const meses = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1);
    return { anio: d.getFullYear(), mes: d.getMonth(), label: MESES_CORTOS[d.getMonth()], facturado: 0, cobrado: 0 };
  });
  tratamientos.forEach(t => {
    const d = parseFecha(t.date);
    if (!d) return;
    const bucket = meses.find(m => m.anio === d.getFullYear() && m.mes === d.getMonth());
    if (bucket) { bucket.facturado += t.cost || 0; bucket.cobrado += t.paid || 0; }
  });
  const maxMes = Math.max(...meses.map(m => m.facturado), 1);
  const mesActualIdx = meses.length - 1;

  // ── Tratamientos más frecuentes ───────────────────────────────────────────
  const conteoNombres = new Map();
  tratamientos.forEach(t => conteoNombres.set(t.name, (conteoNombres.get(t.name) || 0) + 1));
  const ranking = Array.from(conteoNombres.entries()).sort((a, b) => b[1] - a[1]);
  const top = ranking.slice(0, 6);
  const restoCount = ranking.slice(6).reduce((acc, [, n]) => acc + n, 0);
  const frecuencias = [
    ...top.map(([name, n]) => ({ name, n, color: colorPorNombre(name) })),
    ...(restoCount > 0 ? [{ name: 'Otros', n: restoCount, color: OTROS_COLOR }] : []),
  ];
  const maxFrec = Math.max(...frecuencias.map(f => f.n), 1);

  // ── Totales financieros ───────────────────────────────────────────────────
  const totalFacturado = tratamientos.reduce((a, t) => a + (t.cost || 0), 0);
  const totalCobrado = tratamientos.reduce((a, t) => a + (t.paid || 0), 0);
  const totalPendiente = totalFacturado - totalCobrado;

  // ── Pacientes con mayor saldo pendiente ───────────────────────────────────
  const saldoPorPaciente = new Map();
  tratamientos.forEach(t => {
    const saldo = (t.cost || 0) - (t.paid || 0);
    if (saldo <= 0) return;
    saldoPorPaciente.set(t.patient_id, (saldoPorPaciente.get(t.patient_id) || 0) + saldo);
  });
  const topDeudores = Array.from(saldoPorPaciente.entries())
    .map(([patient_id, saldo]) => ({ paciente: pacientes.find(p => p.id === patient_id), saldo }))
    .filter(d => d.paciente)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5);

  const cardStyle = { background: GLASS_BG, border: GLASS_BORDER, borderRadius: 12, padding: 18, backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW };
  const sectionTitle = { fontWeight: 700, fontSize: 13, color: DN, marginBottom: 14 };

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: DN, marginBottom: 16 }}>
        Analítica del consultorio — {hoy.getFullYear()}
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat label="Total pacientes" value={pacientes.length} col={DN} />
        <Stat label="Nuevos (30 días)" value={estados.nuevo} col={AZ} />
        <Stat label="Facturado este mes" value={`S/${meses[mesActualIdx].facturado.toLocaleString()}`} col={P} />
        <Stat label="Cobrado este mes" value={`S/${meses[mesActualIdx].cobrado.toLocaleString()}`} col={WA} />
        <Stat label="Saldo pendiente total" value={`S/${totalPendiente.toLocaleString()}`} col={totalPendiente > 0 ? RJ : WA} />
        <Stat label="Tasa de completados" value={`${tasaCompletado}%`} col={PD} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* ── Ingresos mensuales: facturado vs cobrado ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={sectionTitle}>Facturado vs. cobrado (S/, últimos 6 meses)</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10, color: MU }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: P, display: 'inline-block' }} /> Facturado</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: WA, display: 'inline-block' }} /> Cobrado</span>
            </div>
          </div>

          {totalTrat === 0 ? (
            <div style={{ textAlign: 'center', color: MU, fontSize: 12, padding: '30px 0' }}>Aún no hay tratamientos registrados para graficar ingresos.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 160, position: 'relative' }}>
              {meses.map((m, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}
                  onMouseEnter={() => setHoverMes(i)} onMouseLeave={() => setHoverMes(null)}>
                  {hoverMes === i && (
                    <div style={{ position: 'absolute', bottom: '100%', marginBottom: 6, background: DN, color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 10, whiteSpace: 'nowrap', zIndex: 5, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                      Facturado: S/{m.facturado.toLocaleString()}<br />Cobrado: S/{m.cobrado.toLocaleString()}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, width: '100%', justifyContent: 'center' }}>
                    <div style={{ width: '45%', background: i === mesActualIdx ? P : P + '55', borderRadius: '3px 3px 0 0', height: `${(m.facturado / maxMes) * 100}%`, transition: 'height .3s' }} />
                    <div style={{ width: '45%', background: i === mesActualIdx ? WA : WA + '55', borderRadius: '3px 3px 0 0', height: `${(m.cobrado / maxMes) * 100}%`, transition: 'height .3s' }} />
                  </div>
                  <div style={{ fontSize: 9, color: i === mesActualIdx ? DN : MU, fontWeight: i === mesActualIdx ? 700 : 600, textTransform: 'capitalize' }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tratamientos más frecuentes ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Tratamientos más frecuentes</div>
          {frecuencias.length === 0 ? (
            <div style={{ textAlign: 'center', color: MU, fontSize: 12, padding: '30px 0' }}>Sin tratamientos registrados aún.</div>
          ) : (
            frecuencias.map((f, i) => (
              <div key={f.name} style={{ marginBottom: 9, cursor: 'default' }}
                onMouseEnter={() => setHoverTrat(i)} onMouseLeave={() => setHoverTrat(null)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: DN, fontWeight: 500 }}>{f.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: f.color }}>
                    {f.n}{hoverTrat === i && totalTrat > 0 && <span style={{ color: MU, fontWeight: 500 }}> · {Math.round((f.n / totalTrat) * 100)}%</span>}
                  </span>
                </div>
                <div style={{ height: 6, background: BD, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(f.n / maxFrec) * 100}%`, background: f.color, borderRadius: 3, transition: 'width .3s' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: 16 }}>
        {/* ── Estado de tratamientos ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Estado de tratamientos</div>
          {[
            { key: 'pendiente', label: 'Pendiente', icon: 'clock' },
            { key: 'en_curso', label: 'En curso', icon: 'activity' },
            { key: 'completado', label: 'Completado', icon: 'checkCircle' },
          ].map(({ key, label, icon }) => {
            const c = sc(key);
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: key !== 'completado' ? `1px solid ${MT}` : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, color: c.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={icon} size={14} />
                </div>
                <div style={{ flex: 1, fontSize: 12, color: DN, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: c.c }}>{estadoTrat[key]}</div>
              </div>
            );
          })}
        </div>

        {/* ── Estado de pacientes ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Estado de pacientes</div>
          {[
            { key: 'activo', label: 'Activo', icon: 'users', bg: '#dcfce7', color: '#16a34a' },
            { key: 'nuevo', label: 'Nuevo', icon: 'userPlus', bg: '#dbeafe', color: AZ },
            { key: 'inactivo', label: 'Inactivo', icon: 'users', bg: MT, color: MU },
          ].map(({ key, label, icon, bg, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: key !== 'inactivo' ? `1px solid ${MT}` : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={icon} size={14} />
              </div>
              <div style={{ flex: 1, fontSize: 12, color: DN, fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color }}>{estados[key]}</div>
            </div>
          ))}
        </div>

        {/* ── Pacientes con mayor saldo pendiente ── */}
        <div style={cardStyle}>
          <div style={sectionTitle}>Mayor saldo pendiente</div>
          {topDeudores.length === 0 ? (
            <div style={{ textAlign: 'center', color: MU, fontSize: 12, padding: '20px 0' }}>Nadie tiene saldo pendiente. Al día.</div>
          ) : (
            topDeudores.map((d, i) => (
              <div key={d.paciente.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i !== topDeudores.length - 1 ? `1px solid ${MT}` : 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: MT, color: MU, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: 12, color: DN, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.paciente.name}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: RJ }}>S/{d.saldo.toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
