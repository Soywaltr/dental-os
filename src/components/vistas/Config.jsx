// src/components/vistas/Config.jsx
import React, { useState } from 'react';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import useGoogleCalendar from '../../utils/useGoogleCalendar';
import useMetaWhatsApp from '../../utils/useMetaWhatsApp';
import { BD, DN, MU, P, RJ, WA, GLASS_BG, GLASS_BLUR, GLASS_BORDER, GLASS_SHADOW } from '../../utils/constants';
import Seguridad from './Seguridad';

const TABS = [
  { id: 'integraciones', lbl: 'Integraciones' },
  { id: 'seguridad', lbl: 'Seguridad' },
];

const cardStyle = {
  background: GLASS_BG, border: GLASS_BORDER, borderRadius: '14px', padding: 20,
  backdropFilter: GLASS_BLUR, WebkitBackdropFilter: GLASS_BLUR, boxShadow: GLASS_SHADOW,
};

// Cabecera de tarjeta: un solo estilo para los bloques de Ajustes, así los
// formularios no divergen.
const tituloCardStyle = { fontSize: 15, fontWeight: 600, color: DN };

const accionBtnStyle = { minHeight: 44, padding: '12px 20px', fontSize: 13.5, fontWeight: 600, borderRadius: '10px' };

const avisoErrorStyle = {
  padding: '10px 12px', background: '#FEE2E2', borderLeft: `3px solid ${RJ}`,
  borderRadius: '10px', color: RJ, fontSize: 13, lineHeight: 1.5,
};

export default function Config({ clinicaId, clinicaRol }) {
  const [tab, setTab] = useState('integraciones');

  return (
    <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
      {/* <button>, no <div onClick>: antes la pestaña no tenía foco de teclado
          ni :hover -- una inactiva se veía igual pasándole el mouse o no. */}
      <div role="tablist" style={{ display: 'flex', gap: 1, marginBottom: 20, borderBottom: `1px solid ${BD}` }}>
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className="tab-item u-focusable"
            style={{
              padding: '12px 18px', minHeight: 44, display: 'flex', alignItems: 'center',
              cursor: 'pointer', fontSize: 15, fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? P : MU, background: 'none', border: 'none',
              borderBottom: tab === t.id ? `2px solid ${P}` : '2px solid transparent',
              marginBottom: -1, borderRadius: 0, font: 'inherit',
            }}>
            {t.lbl}
          </button>
        ))}
      </div>

      {tab === 'integraciones' && <Integraciones clinicaId={clinicaId} />}
      {tab === 'seguridad' && <Seguridad clinicaId={clinicaId} rol={clinicaRol} />}
    </div>
  );
}

// ── INTEGRACIONES ────────────────────────────────────────────────────────────
function Integraciones({ clinicaId }) {
  const google = useGoogleCalendar(clinicaId);
  const wa = useMetaWhatsApp(clinicaId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(114, 157, 238, 0.12)', color: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="clock" size={19} />
          </div>
          <div>
            <div style={tituloCardStyle}>Google Calendar</div>
            <div style={{ fontSize: 12, color: google.connected ? WA : MU, fontWeight: 600 }}>
              {google.connected ? 'Conectado' : 'No conectado'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: MU, margin: '0 0 16px', lineHeight: 1.5 }}>
          Sincroniza las citas de tu Agenda con tu calendario de Google: al crear, editar o eliminar una cita se refleja automáticamente.
        </p>
        {google.connected ? (
          <Button variant="danger" onClick={google.disconnect} style={accionBtnStyle}>Desconectar</Button>
        ) : (
          <Button onClick={() => google.connect()} style={accionBtnStyle}>Conectar con Google</Button>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#DCFCE7', color: WA, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="chat" size={19} />
          </div>
          <div>
            <div style={tituloCardStyle}>WhatsApp Business</div>
            <div style={{ fontSize: 12, color: wa.connected ? WA : MU, fontWeight: 600 }}>
              {wa.loading ? 'Verificando…' : wa.connected ? 'Conectado' : 'No conectado'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: MU, margin: '0 0 12px', lineHeight: 1.5 }}>
          Conecta tu número de WhatsApp Business (Meta) para automatizar mensajes con pacientes.
        </p>

        {wa.errorMsg && (
          <div style={{ ...avisoErrorStyle, marginBottom: 12 }}>
            {wa.errorMsg}
          </div>
        )}

        {wa.connected ? (
          <>
            {wa.connection?.businesses?.length > 0 && (
              <div style={{ fontSize: 13, color: DN, marginBottom: 10 }}>
                {wa.connection.businesses.map(b => b.name).join(', ')}
              </div>
            )}
            <Button variant="danger" onClick={wa.disconnect} style={accionBtnStyle}>Desconectar</Button>
          </>
        ) : (
          <Button onClick={wa.connect} disabled={wa.connecting} style={accionBtnStyle}>
            {wa.connecting ? 'Conectando…' : 'Conectar con Meta'}
          </Button>
        )}
      </div>
    </div>
  );
}
