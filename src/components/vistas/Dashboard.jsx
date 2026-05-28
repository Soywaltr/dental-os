// src/components/vistas/Dashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS — Dashboard
// Arquitectura: hooks propios por sección, memoización de componentes,
// sub-componentes con responsabilidad única, datos tipados por constantes.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  memo,
} from "react";
import { TODAY, DN, MU, WA, RJ } from "../../utils/constants";
import { useAppContext } from "../../App";

// ─── TOKENS DE DISEÑO ─────────────────────────────────────────────────────────
// Un único objeto fuente de verdad para colores, radios y sombras.
// Cualquier cambio aquí se propaga a todo el Dashboard.
const T = {
  // Colores
  bg:         "rgba(255,255,255,0.72)",
  bgHover:    "rgba(255,255,255,0.92)",
  bgInner:    "rgba(255,255,255,0.82)",
  border:     "rgba(255,255,255,0.9)",
  borderSub:  "rgba(0,0,0,0.05)",
  text:       "#0F172A",
  textMid:    "#475569",
  textMute:   "#64748B",
  textFaint:  "#94A3B8",
  accent:     "#0ea5e9",
  accentDark: "#0284c7",
  success:    "#10B981",
  danger:     "#EF4444",
  warn:       "#F59E0B",
  // Radios
  r:  "16px",
  rl: "24px",
  rx: "32px",
  // Sombras
  cardShadow: "0 8px 32px rgba(0,0,0,0.04)",
  dropShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

// ─── ESTILOS COMPARTIDOS ──────────────────────────────────────────────────────
const S = {
  card: {
    background:     T.bg,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius:   T.rl,
    padding:        "24px",
    border:         `1px solid ${T.border}`,
    boxShadow:      T.cardShadow,
    display:        "flex",
    flexDirection:  "column",
  },
  cardHeader: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "flex-start",
    marginBottom:   18,
  },
  sectionLabel: {
    fontSize: 13, fontWeight: 700, color: T.textMid,
  },
  subLabel: {
    fontSize: 11, color: T.textFaint, marginTop: 3,
  },
  bigNumber: {
    fontSize: 34, fontWeight: 800, color: T.text,
    lineHeight: 1, letterSpacing: "-1.2px",
  },
  tag: (color, bg) => ({
    fontSize: 11, fontWeight: 700, padding: "5px 11px",
    borderRadius: 8, background: bg, color: color,
    textTransform: "capitalize", whiteSpace: "nowrap",
  }),
};

// ─── DATOS MOCK INTERNOS ──────────────────────────────────────────────────────
// En producción se reemplazarían por llamadas a un hook de datos (useDashboardData).
const METRICS = [
  {
    id:       "citas",
    title:    "Citas de Hoy",
    subtitle: "Agendadas en sistema",
    getValue: () => TODAY.length,
    trend:    "+2 vs ayer",
    positive: true,
    color:    T.accent,
    bars:     [30, 55, 42, 70, 62, 90, 80],
  },
  {
    id:       "nuevos",
    title:    "Pacientes Nuevos",
    subtitle: "Adquisición mensual",
    getValue: () => 88,
    trend:    "+12% crecimiento",
    positive: true,
    color:    T.success,
    bars:     [60, 40, 52, 34, 80, 62, 54],
  },
  {
    id:       "saldos",
    title:    "Saldos Pendientes",
    subtitle: "Facturas por cobrar",
    getValue: () => "S/ 750",
    trend:    "Requiere acción",
    positive: false,
    color:    T.danger,
    bars:     [20, 30, 12, 40, 22, 32, 54],
  },
];

const STATUS_COLORS = {
  pendiente:  { text: T.danger,  bg: "rgba(239,68,68,0.1)"  },
  confirmada: { text: T.success, bg: "rgba(16,185,129,0.1)" },
  atendido:   { text: T.accent,  bg: "rgba(14,165,233,0.1)" },
};

// ─── HOOK: ASISTENTE IA ───────────────────────────────────────────────────────
// Encapsula el estado del chat del asistente para que Dashboard no lo gestione.
function useAIAssistant() {
  const [messages, setMessages] = useState([
    {
      id:   1,
      from: "ai",
      text: "Hola. Sube una radiografía o escribe un comando para procesar datos clínicos automáticamente.",
    },
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), from: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulación de respuesta IA (reemplazar por fetch a API real)
    await new Promise(r => setTimeout(r, 800));
    setMessages(prev => [
      ...prev,
      { id: Date.now() + 1, from: "ai", text: `Procesando: "${text}". Funcionalidad disponible con API conectada.` },
    ]);
    setLoading(false);
  }, [input, loading]);

  const handleKey = useCallback(
    e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } },
    [sendMessage]
  );

  return { messages, input, setInput, loading, sendMessage, handleKey, bottomRef };
}

// ─── SUB-COMPONENTE: BARRA DE MINI-GRÁFICO ────────────────────────────────────
const MiniBar = memo(({ bars, color }) => {
  const max = Math.max(...bars);
  return (
    <div
      role="img"
      aria-label="Mini gráfico de tendencia"
      style={{ display: "flex", gap: 4, height: 36, width: "100%", alignItems: "flex-end" }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(h / max) * 100}%`,
            borderRadius: 4,
            background: i >= bars.length - 2 ? color : "rgba(15,23,42,0.08)",
            transition: "height 0.4s cubic-bezier(.23,1,.32,1)",
          }}
        />
      ))}
    </div>
  );
});

// ─── SUB-COMPONENTE: BOTÓN DE MENÚ ────────────────────────────────────────────
const DotsButton = memo(({ onClick, label = "Opciones" }) => (
  <button
    onClick={onClick}
    aria-label={label}
    style={{
      background: "transparent", border: "none", cursor: "pointer",
      color: T.textFaint, padding: 4, borderRadius: 8, lineHeight: 0,
      transition: "color 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.color = T.textMid; }}
    onMouseLeave={e => { e.currentTarget.style.color = T.textFaint; }}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5"  r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
    </svg>
  </button>
));

// ─── SUB-COMPONENTE: TARJETA MÉTRICA ─────────────────────────────────────────
const MetricCard = memo(({ metric }) => {
  const { title, subtitle, getValue, trend, positive, color, bars } = metric;
  const value = useMemo(() => getValue(), [getValue]);
  const TrendIcon = positive
    ? () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
    : () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>;

  return (
    <article style={S.card}>
      <div style={S.cardHeader}>
        <div>
          <div style={S.sectionLabel}>{title}</div>
          {subtitle && <div style={S.subLabel}>{subtitle}</div>}
        </div>
        <DotsButton label={`Opciones de ${title}`} />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <div style={S.bigNumber}>{value}</div>
        {trend && (
          <div
            style={{
              fontSize: 12, fontWeight: 600,
              color: positive ? T.success : T.danger,
              display: "flex", alignItems: "center", gap: 3,
            }}
          >
            <TrendIcon /> {trend}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
        <MiniBar bars={bars} color={color} />
      </div>
    </article>
  );
});

// ─── SUB-COMPONENTE: FILA DE AGENDA ──────────────────────────────────────────
const AgendaRow = memo(({ appt, isLast }) => {
  const sc = STATUS_COLORS[appt.status] ?? STATUS_COLORS["pendiente"];
  return (
    <tr>
      <td style={{ padding: "14px 0", fontSize: 13, color: T.text, fontWeight: 700, borderBottom: isLast ? "none" : `1px solid ${T.borderSub}` }}>
        {appt.time}
      </td>
      <td style={{ padding: "14px 0", fontSize: 13, fontWeight: 700, color: T.text, borderBottom: isLast ? "none" : `1px solid ${T.borderSub}` }}>
        {appt.patient}
      </td>
      <td style={{ padding: "14px 0", fontSize: 13, color: T.textMute, borderBottom: isLast ? "none" : `1px solid ${T.borderSub}` }}>
        {appt.treat}
      </td>
      <td style={{ padding: "14px 0", textAlign: "right", borderBottom: isLast ? "none" : `1px solid ${T.borderSub}` }}>
        <span style={S.tag(sc.text, sc.bg)}>{appt.status}</span>
      </td>
    </tr>
  );
});

// ─── SUB-COMPONENTE: TABLA AGENDA ─────────────────────────────────────────────
const AgendaTable = memo(({ setView }) => {
  const appointments = useMemo(() => TODAY, []);

  return (
    <section style={{ ...S.card, flex: "1 1 580px" }} aria-labelledby="agenda-heading">
      <div style={S.cardHeader}>
        <h2 id="agenda-heading" style={{ ...S.sectionLabel, fontSize: 15, fontWeight: 800, margin: 0 }}>
          Agenda del Día
        </h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setView("agenda")}
            style={{
              fontSize: 12, fontWeight: 700, color: T.accent, background: "rgba(14,165,233,0.08)",
              padding: "5px 12px", borderRadius: 100, border: "none", cursor: "pointer",
              fontFamily: "inherit", transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(14,165,233,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(14,165,233,0.08)"; }}
          >
            Ver todo →
          </button>
          <DotsButton label="Opciones de agenda" />
        </div>
      </div>

      {appointments.length === 0 ? (
        <EmptyState message="No hay citas agendadas para hoy." />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr>
                {["Hora", "Paciente", "Tratamiento", "Estado"].map((col, i) => (
                  <th
                    key={col}
                    style={{
                      paddingBottom: 14, fontSize: 11, fontWeight: 700,
                      color: T.textFaint, textTransform: "uppercase",
                      letterSpacing: "0.5px", borderBottom: `1px solid ${T.borderSub}`,
                      textAlign: i === 3 ? "right" : "left",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, i) => (
                <AgendaRow key={appt.id ?? i} appt={appt} isLast={i === appointments.length - 1} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

// ─── SUB-COMPONENTE: BURBUJA DE MENSAJE ───────────────────────────────────────
const ChatBubble = memo(({ msg }) => {
  const isAI = msg.from === "ai";
  return (
    <div
      style={{
        display: "flex", gap: 10, alignItems: "flex-start",
        flexDirection: isAI ? "row" : "row-reverse",
      }}
    >
      {/* Avatar */}
      <div
        aria-hidden="true"
        style={{
          width: 28, height: 28, borderRadius: isAI ? 8 : "50%",
          background: isAI
            ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
            : "#0F172A",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0, fontSize: 10, fontWeight: 700,
        }}
      >
        {isAI
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a2 2 0 0 1 2 2v2" /><circle cx="12" cy="12" r="3" /><path d="M12 17v3" /><path d="M7 7l-2-2" /><path d="M17 7l2-2" /></svg>
          : "SV"}
      </div>

      {/* Burbuja */}
      <div
        style={{
          background: isAI ? T.bgInner : "rgba(14,165,233,0.1)",
          padding: "10px 14px", maxWidth: "76%",
          borderRadius: isAI ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
          fontSize: 13, color: isAI ? T.textMid : "#0369A1",
          lineHeight: 1.55,
          border: isAI ? `1px solid ${T.border}` : "1px solid rgba(14,165,233,0.2)",
        }}
      >
        {msg.text}
        {msg.file && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.9)", padding: "7px 11px",
              borderRadius: 8, marginBottom: 8, border: `1px solid ${T.border}`,
              marginTop: 6,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: 12, color: T.text }}>{msg.file}</span>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── SUB-COMPONENTE: PANEL ASISTENTE IA ──────────────────────────────────────
const AIAssistantPanel = memo(() => {
  const { messages, input, setInput, loading, sendMessage, handleKey, bottomRef } = useAIAssistant();

  return (
    <section
      style={{ ...S.card, flex: "1 1 360px", height: 480 }}
      aria-labelledby="ai-heading"
    >
      {/* Header */}
      <div style={S.cardHeader}>
        <h2
          id="ai-heading"
          style={{
            fontSize: 15, fontWeight: 800, color: T.text, margin: 0,
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <span style={{ color: T.accent, fontSize: 16 }}>✦</span>
          Asistente IA Nanda
        </h2>
        <button
          aria-label="Reiniciar conversación"
          style={{
            background: T.bgInner, border: `1px solid ${T.border}`,
            color: T.textFaint, padding: "5px", borderRadius: 8, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.textMid; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.textFaint; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.08 5.08" />
          </svg>
        </button>
      </div>

      {/* Mensajes */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat con asistente IA"
        style={{
          flex: 1, display: "flex", flexDirection: "column", gap: 14,
          overflowY: "auto", paddingRight: 4,
        }}
      >
        {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: "spin 1s linear infinite" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <div
              style={{
                background: T.bgInner, padding: "10px 14px", borderRadius: "4px 16px 16px 16px",
                border: `1px solid ${T.border}`, display: "flex", gap: 5, alignItems: "center",
              }}
            >
              {[0, 160, 320].map(d => (
                <span
                  key={d}
                  style={{
                    width: 6, height: 6, borderRadius: "50%", background: T.accent,
                    animation: `bounce 1s ease-in-out ${d}ms infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          marginTop: 14, background: T.bgInner, padding: "8px",
          borderRadius: 12, border: `1px solid ${T.border}`,
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Comando de IA…"
          aria-label="Escribe un mensaje al asistente"
          disabled={loading}
          style={{
            flex: 1, background: "transparent", border: "none",
            outline: "none", fontSize: 13, color: T.text,
            padding: "4px 8px", fontFamily: "inherit",
            opacity: loading ? 0.5 : 1,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Enviar mensaje"
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: input.trim() && !loading ? T.text : "rgba(15,23,42,0.15)",
            color: "#fff", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            transition: "background 0.2s, transform 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0);   }
          50%       { transform: translateY(-4px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
});

// ─── SUB-COMPONENTE: BANNER DE INGRESOS ───────────────────────────────────────
const RevenueBanner = memo(() => {
  const kpis = useMemo(
    () => [
      { label: "Total Facturado",    value: "S/ 5,570", color: T.text },
      { label: "Crecimiento Mensual", value: "+12.5%",  color: T.success, arrow: true },
      { label: "Pacientes Activos",   value: "142",     color: T.accent },
    ],
    []
  );

  return (
    <div
      style={{
        ...S.card,
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 24,
        padding: "28px 32px",
        background: "rgba(255,255,255,0.75)",
      }}
      role="region"
      aria-label="Resumen de ingresos"
    >
      {/* Cifra principal */}
      <div>
        <div style={{ fontSize: 13, color: T.textMute, fontWeight: 600, marginBottom: 6 }}>
          Ingresos Consolidados del Mes
        </div>
        <div
          style={{
            fontSize: 46, fontWeight: 900, color: T.text,
            letterSpacing: "-2px", lineHeight: 1,
          }}
        >
          S/ 4,820
        </div>
      </div>

      {/* KPIs secundarios */}
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {kpis.map(k => (
          <div key={k.label}>
            <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              {k.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color, display: "flex", alignItems: "center", gap: 4 }}>
              {k.arrow && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                </svg>
              )}
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Acción rápida */}
      <button
        style={{
          padding: "10px 20px", borderRadius: 100, border: "none",
          background: T.text, color: "#fff", fontSize: 13, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit", transition: "opacity 0.15s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        Ver reporte completo →
      </button>
    </div>
  );
});

// ─── UTILIDAD: ESTADO VACÍO ───────────────────────────────────────────────────
const EmptyState = memo(({ message }) => (
  <div
    style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      color: T.textFaint, fontSize: 13, fontWeight: 500,
    }}
  >
    {message}
  </div>
));

// ─── COMPONENTE RAÍZ: DASHBOARD ───────────────────────────────────────────────
export default function Dashboard({ setView }) {
  // Intentamos obtener setView desde context si no viene por props
  let ctxSetView;
  try {
    const ctx = useAppContext();
    ctxSetView = ctx ? (v, p) => ctx.dispatch({ type: "SET_VIEW", payload: { view: v, pat: p } }) : null;
  } catch (_) {
    ctxSetView = null;
  }
  const navigate = setView ?? ctxSetView ?? (() => {});

  const metrics = useMemo(() => METRICS, []);

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 22,
        maxWidth: 1440, margin: "0 auto",
      }}
    >
      {/* ─ 1. Banner ingresos ─ */}
      <RevenueBanner />

      {/* ─ 2. Métricas ─ */}
      <section
        aria-label="Métricas clave"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 22,
        }}
      >
        {metrics.map(m => <MetricCard key={m.id} metric={m} />)}
      </section>

      {/* ─ 3. Agenda + Asistente ─ */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
        <AgendaTable setView={navigate} />
        <AIAssistantPanel />
      </div>
    </div>
  );
}