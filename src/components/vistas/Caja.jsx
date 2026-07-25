// src/components/vistas/Caja.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import Stat from '../ui/Stat';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import { BD, P, GL, MU, DN, MT, LT, WA, RJ } from '../../utils/constants';
import { sc } from '../../utils/helpers';

const METODOS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'];
const CATEGORIAS_GASTO = ['Materiales', 'Laboratorio', 'Servicios', 'Sueldos', 'Otros'];

const hoyISO = () => new Date().toISOString().slice(0, 10);
const parseFecha = (s) => { if (!s) return null; const d = new Date(s); return isNaN(d.getTime()) ? null : d; };
const mismoMes = (d, ref) => d && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();

const PAGO_VACIO = { patientId: '', facturaId: '', monto: '', metodo: 'Efectivo', referencia: '' };
const GASTO_VACIO = { categoria: 'Materiales', monto: '', fecha: hoyISO(), nota: '' };

export default function Caja() {
  const [tab, setTab] = useState('facturas');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pacientes, setPacientes] = useState([]);
  const [facturas, setFacturas] = useState([]); // items de plan_tratamiento, aplanados, con patient_id
  const [gastos, setGastos] = useState([]);
  const [errorGastos, setErrorGastos] = useState(null);

  const [pagoDraft, setPagoDraft] = useState(PAGO_VACIO);
  const [savingPago, setSavingPago] = useState(false);

  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoDraft, setGastoDraft] = useState(GASTO_VACIO);
  const [savingGasto, setSavingGasto] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setErrorMsg(null);
      const [{ data: pacientesData, error: errP }, { data: historiasData, error: errH }, { data: gastosData, error: errG }] = await Promise.all([
        supabase.from('pacientes').select('id, name'),
        supabase.from('historias').select('patient_id, plan_tratamiento'),
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
      ]);

      if (errP || errH) { setErrorMsg((errP || errH).message); setLoading(false); return; }
      setPacientes(pacientesData || []);
      setFacturas((historiasData || []).flatMap(h => (h.plan_tratamiento || []).map(item => ({ ...item, patient_id: h.patient_id }))));

      if (errG) setErrorGastos(errG.message); else setGastos(gastosData || []);
      setLoading(false);
    };
    cargar();
  }, []);

  const nombrePaciente = (id) => pacientes.find(p => String(p.id) === String(id))?.name || '—';

  const irAPagar = (f) => {
    setPagoDraft({ patientId: String(f.patient_id), facturaId: String(f.id), monto: '', metodo: 'Efectivo', referencia: '' });
    setTab('pagos');
  };

  const registrarPago = async () => {
    if (!pagoDraft.patientId || !pagoDraft.facturaId) { alert('Selecciona paciente y tratamiento.'); return; }
    const monto = parseFloat(pagoDraft.monto);
    if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }

    setSavingPago(true);
    const itemsDelPaciente = facturas.filter(f => String(f.patient_id) === String(pagoDraft.patientId));
    const planActualizado = itemsDelPaciente.map(f => {
      const rest = { ...f };
      delete rest.patient_id;
      if (String(rest.id) !== String(pagoDraft.facturaId)) return rest;
      const saldo = rest.cost - rest.paid;
      const abono = Math.min(monto, saldo);
      const nuevoPaid = rest.paid + abono;
      return {
        ...rest, paid: nuevoPaid, metodo: pagoDraft.metodo, referencia: pagoDraft.referencia || rest.referencia || '',
        status: nuevoPaid >= rest.cost ? 'completado' : (rest.status === 'pendiente' ? 'en_curso' : rest.status),
      };
    });

    const { error } = await supabase.from('historias').upsert({ patient_id: pagoDraft.patientId, plan_tratamiento: planActualizado }, { onConflict: 'patient_id' });
    setSavingPago(false);
    if (error) { alert('Error al registrar el pago: ' + error.message); return; }

    setFacturas(prev => prev.map(f => {
      if (String(f.patient_id) !== String(pagoDraft.patientId)) return f;
      const actualizado = planActualizado.find(x => String(x.id) === String(f.id));
      return actualizado ? { ...actualizado, patient_id: f.patient_id } : f;
    }));
    setPagoDraft(PAGO_VACIO);
    alert('Pago registrado correctamente.');
  };

  const registrarGasto = async () => {
    const monto = parseFloat(gastoDraft.monto);
    if (!monto || monto <= 0) { alert('Ingresa un monto válido.'); return; }

    setSavingGasto(true);
    const { data, error } = await supabase.from('gastos').insert([{
      categoria: gastoDraft.categoria, monto, fecha: gastoDraft.fecha, nota: gastoDraft.nota.trim() || null,
    }]).select();
    setSavingGasto(false);

    if (error) { alert('Error al registrar el gasto: ' + error.message); return; }
    setGastos(prev => [data[0], ...prev]);
    setShowGastoModal(false);
    setGastoDraft(GASTO_VACIO);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: MU, fontSize: 12 }}>Cargando finanzas…</div>;

  if (errorMsg) {
    return <div style={{ padding: 40, textAlign: 'center', color: RJ, fontSize: 12 }}>Error al cargar finanzas: {errorMsg}</div>;
  }

  const total = facturas.reduce((s, i) => s + (i.cost || 0), 0);
  const cobrado = facturas.reduce((s, i) => s + (i.paid || 0), 0);
  const pendiente = total - cobrado;

  const hoy = new Date();
  const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const ingresosMesActual = facturas.reduce((s, i) => mismoMes(parseFecha(i.date), hoy) ? s + (i.cost || 0) : s, 0);
  const ingresosMesAnterior = facturas.reduce((s, i) => mismoMes(parseFecha(i.date), mesAnterior) ? s + (i.cost || 0) : s, 0);
  const variacionMes = ingresosMesAnterior > 0 ? Math.round(((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100) : null;

  const gastosDelMes = gastos.filter(g => mismoMes(parseFecha(g.fecha), hoy));
  const gastosPorCategoria = CATEGORIAS_GASTO.map(cat => ({
    cat, monto: gastosDelMes.filter(g => g.categoria === cat).reduce((s, g) => s + (g.monto || 0), 0),
  }));
  const totalGastosMes = gastosDelMes.reduce((s, g) => s + (g.monto || 0), 0);

  const facturasDelPacienteSeleccionado = facturas.filter(f => String(f.patient_id) === String(pagoDraft.patientId) && (f.cost - f.paid) > 0);

  return (
    <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <Stat label="Total facturado" value={`S/${total.toLocaleString()}`} />
        <Stat label="Cobrado" value={`S/${cobrado.toLocaleString()}`} col={WA} sub={pendiente === 0 && total > 0 ? 'Al día' : undefined} />
        <Stat label="Pendiente" value={`S/${pendiente.toLocaleString()}`} col={pendiente > 0 ? RJ : WA} />
        <Stat label="Ingresos del mes" value={`S/${ingresosMesActual.toLocaleString()}`} col={P}
          sub={variacionMes === null ? undefined : `${variacionMes >= 0 ? '↑' : '↓'} ${Math.abs(variacionMes)}% vs anterior`} />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {['facturas', 'pagos', 'gastos'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${BD}`, fontSize: 11, cursor: 'pointer', fontWeight: tab === t ? 700 : 400, background: tab === t ? P : '#fff', color: tab === t ? '#fff' : MU, textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'facturas' && (
        facturas.length === 0 ? (
          <div style={{ background: '#fff', border: `1px dashed ${BD}`, borderRadius: 12, padding: 40, textAlign: 'center', color: MU, fontSize: 12 }}>
            Aún no hay tratamientos facturados. Se agregan desde la pestaña "Plan trat." de cada paciente.
          </div>
        ) : (
          <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead><tr style={{ background: LT }}>
                {['Paciente', 'Tratamiento', 'Pieza', 'Fecha', 'Método', 'Total', 'Cobrado', 'Estado', ''].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: MU, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${BD}`, whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {facturas.map((inv, i) => {
                  const b = sc(inv.status); const saldo = inv.cost - inv.paid;
                  return (
                    <tr key={`${inv.patient_id}-${inv.id}-${i}`} style={{ borderBottom: `1px solid ${MT}` }}
                      onMouseEnter={e => e.currentTarget.style.background = LT}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '9px 12px', color: DN, fontWeight: 500 }}>{nombrePaciente(inv.patient_id)}</td>
                      <td style={{ padding: '9px 12px', color: MU }}>{inv.name}</td>
                      <td style={{ padding: '9px 12px', color: MU }}>{inv.tooth}</td>
                      <td style={{ padding: '9px 12px', color: MU }}>{inv.date}</td>
                      <td style={{ padding: '9px 12px', color: MU }}>{inv.metodo || '—'}</td>
                      <td style={{ padding: '9px 12px', color: DN, fontWeight: 600 }}>S/{inv.cost}</td>
                      <td style={{ padding: '9px 12px', color: inv.paid < inv.cost ? GL : WA }}>S/{inv.paid}</td>
                      <td style={{ padding: '9px 12px' }}><Badge bg={b.bg} color={b.c} style={{ fontSize: 9, padding: '2px 8px' }}>{inv.status}</Badge></td>
                      <td style={{ padding: '9px 12px' }}>
                        {saldo > 0 && (
                          <span onClick={() => irAPagar(inv)} style={{ fontSize: 10, color: P, cursor: 'pointer', fontWeight: 600 }}>registrar pago →</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'pagos' && (
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: DN, marginBottom: 12 }}>Registrar nuevo pago</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 500 }}>
            <div>
              <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Paciente</label>
              <select value={pagoDraft.patientId} onChange={e => setPagoDraft({ ...pagoDraft, patientId: e.target.value, facturaId: '' })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', background: '#fff' }}>
                <option value="">Selecciona un paciente…</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Tratamiento con saldo pendiente</label>
              <select value={pagoDraft.facturaId} onChange={e => setPagoDraft({ ...pagoDraft, facturaId: e.target.value })} disabled={!pagoDraft.patientId}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', background: '#fff' }}>
                <option value="">Selecciona…</option>
                {facturasDelPacienteSeleccionado.map(f => (
                  <option key={f.id} value={f.id}>{f.name} — Saldo S/{(f.cost - f.paid).toLocaleString()}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Monto (S/)</label>
              <input type="number" min="0" step="0.01" value={pagoDraft.monto} onChange={e => setPagoDraft({ ...pagoDraft, monto: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Método de pago</label>
              <select value={pagoDraft.metodo} onChange={e => setPagoDraft({ ...pagoDraft, metodo: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', background: '#fff' }}>
                {METODOS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: MU, fontWeight: 600, display: 'block', marginBottom: 3 }}>Referencia / N° operación</label>
              <input value={pagoDraft.referencia} onChange={e => setPagoDraft({ ...pagoDraft, referencia: e.target.value })}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: `1px solid ${BD}`, fontSize: 11, color: DN, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <Button onClick={registrarPago} disabled={savingPago} style={{ marginTop: 14, padding: '8px 20px', fontSize: 12 }}>
            {savingPago ? 'Registrando...' : 'Registrar pago'}
          </Button>
        </div>
      )}

      {tab === 'gastos' && (
        <div style={{ background: '#fff', border: `1px solid ${BD}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: DN }}>Gastos del consultorio</div>
            <div style={{ fontSize: 11, color: MU }}>Total del mes: <b style={{ color: DN }}>S/{totalGastosMes.toLocaleString()}</b></div>
          </div>

          {errorGastos ? (
            <div style={{ fontSize: 11, color: RJ, marginBottom: 14 }}>
              No se pudo cargar la tabla de gastos: {errorGastos}. La tabla "gastos" todavía no existe en Supabase.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {gastosPorCategoria.map(({ cat, monto }) => (
                  <div key={cat} style={{ background: LT, borderRadius: 9, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: MU, marginBottom: 3 }}>{cat}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: DN }}>S/{monto.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: MU }}>Este mes</div>
                  </div>
                ))}
              </div>

              {gastos.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead><tr style={{ background: LT }}>
                      {['Categoría', 'Monto', 'Fecha', 'Nota'].map(h => <th key={h} style={{ padding: '7px 10px', textAlign: 'left', color: MU, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${BD}` }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {gastos.slice(0, 12).map(g => (
                        <tr key={g.id} style={{ borderBottom: `1px solid ${MT}` }}>
                          <td style={{ padding: '7px 10px', color: DN, fontWeight: 500 }}>{g.categoria}</td>
                          <td style={{ padding: '7px 10px', color: DN, fontWeight: 600 }}>S/{g.monto}</td>
                          <td style={{ padding: '7px 10px', color: MU }}>{g.fecha}</td>
                          <td style={{ padding: '7px 10px', color: MU }}>{g.nota || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button onClick={() => setShowGastoModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon name="plus" size={12} /> Registrar gasto
              </Button>
            </>
          )}
        </div>
      )}

      {showGastoModal && (
        <Modal cardStyle={{ padding: 24, width: 380, boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, color: DN, fontSize: 15 }}>Registrar gasto</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Categoría</label>
            <select value={gastoDraft.categoria} onChange={e => setGastoDraft({ ...gastoDraft, categoria: e.target.value })}
              style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box', background: '#fff' }}>
              {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Monto (S/)</label>
              <input type="number" min="0" step="0.01" value={gastoDraft.monto} onChange={e => setGastoDraft({ ...gastoDraft, monto: e.target.value })}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Fecha</label>
              <input type="date" value={gastoDraft.fecha} onChange={e => setGastoDraft({ ...gastoDraft, fecha: e.target.value })}
                style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: MU, display: 'block', marginBottom: 4 }}>Nota (opcional)</label>
            <input value={gastoDraft.nota} onChange={e => setGastoDraft({ ...gastoDraft, nota: e.target.value })} placeholder="Ej: Compra de guantes y algodón"
              style={{ width: '100%', padding: 9, borderRadius: 8, border: `1px solid ${BD}`, fontSize: 12, boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={() => setShowGastoModal(false)} style={{ flex: 1, padding: 10, fontSize: 12 }}>Cancelar</Button>
            <Button onClick={registrarGasto} disabled={savingGasto} style={{ flex: 1, padding: 10, fontSize: 12 }}>
              {savingGasto ? 'Guardando...' : 'Registrar gasto'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
