// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS · Shell · Navegación superior · UI/UX premium original
// Paleta: crema cálida + índigo profundo + verde menta · Fuente: Outfit
// Arquitectura: Context + Reducer · Lazy views · Rules of Hooks correctas
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useEffect, useReducer, useCallback,
  useMemo, createContext, useContext, lazy, Suspense, memo,
} from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import { PATIENTS } from "./utils/constants";

// ─── LAZY VIEWS ───────────────────────────────────────────────────────────────
const Dashboard   = lazy(() => import("./components/vistas/Dashboard"));
const Agenda      = lazy(() => import("./components/vistas/Agenda"));
const Expediente  = lazy(() => import("./components/vistas/Expediente"));
const Caja        = lazy(() => import("./components/vistas/Caja"));
const Laboratorio = lazy(() => import("./components/vistas/Laboratorio"));
const Reportes    = lazy(() => import("./components/vistas/Reportes"));
const WhatsApp    = lazy(() => import("./components/vistas/WhatsApp"));
const Config      = lazy(() => import("./components/vistas/Config"));

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Paleta clínica premium: no genérica, no "IA azul". 
// Inspirada en espacios médicos de lujo: crema, índigo, menta, terracota suave.
const C = {
  // Fondos
  pageBg:    "#F7F4EF",        // crema cálida — nunca blanco puro
  topbarBg:  "#FFFFFF",
  cardBg:    "#FFFFFF",
  pillBg:    "#F0EDE8",        // píldora nav inactiva
  // Texto
  ink:       "#1A1714",        // casi negro cálido
  inkMid:    "#6B6560",        // medio
  inkFaint:  "#A8A29E",        // sutil
  // Acento principal — índigo profundo (no "apple blue")
  brand:     "#3D3580",
  brandSoft: "#ECEAFA",
  brandText: "#2A2460",
  // Acento secundario — menta
  mint:      "#1A9E8A",
  mintSoft:  "#E6F5F2",
  // Terracota — alertas y badges únicos
  terra:     "#C4622D",
  terraSoft: "#FBF0EA",
  // Separadores
  line:      "#EDE9E4",
  lineStrong:"#D6D0C8",
  // Sombras
  shadowSm:  "0 1px 4px rgba(26,23,20,0.06)",
  shadowMd:  "0 4px 20px rgba(26,23,20,0.07)",
  shadowLg:  "0 12px 40px rgba(26,23,20,0.09)",
  // Tipografía — Outfit: geométrica, médica, no genérica
  font:      "'Outfit', 'DM Sans', system-ui, sans-serif",
  fontMono:  "'JetBrains Mono', monospace",
  // Radios
  pill:      "100px",
  card:      "20px",
  btn:       "12px",
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
const INIT = {
  view: "dashboard", selectedPat: null, subAccount: "Sede Principal",
  teeth: {}, teethEvolucion: {}, patientsList: [],
  globalSearch: "", notifCount: 3,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_VIEW":        return { ...state, view: action.payload.view, selectedPat: action.payload.pat ?? state.selectedPat };
    case "SET_SUB_ACCOUNT": return { ...state, subAccount: action.payload };
    case "SET_TEETH":       return { ...state, teeth: action.payload };
    case "SET_TEETH_EVO":   return { ...state, teethEvolucion: action.payload };
    case "SET_PATIENTS":    return { ...state, patientsList: action.payload };
    case "SET_SEARCH":      return { ...state, globalSearch: action.payload };
    case "HYDRATE":         return { ...state, ...action.payload };
    default:                return state;
  }
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
const jp = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const sp = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── HOOK SESIÓN ──────────────────────────────────────────────────────────────
function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  return { session, loading, logout: useCallback(() => supabase.auth.signOut(), []) };
}

// ─── MAPA DE VISTAS ───────────────────────────────────────────────────────────
const VIEWS = {
  dashboard: Dashboard, agenda: Agenda, expediente: Expediente,
  caja: Caja, laboratorio: Laboratorio, reportes: Reportes,
  whatsapp: WhatsApp, config: Config,
};

// ─── NAVEGACIÓN ───────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard",   label: "Inicio",     dot: null },
  { id: "agenda",      label: "Agenda",     dot: null },
  { id: "expediente",  label: "Historial",  dot: null },
  { id: "caja",        label: "Finanzas",   dot: null },
  { id: "laboratorio", label: "Lab",        dot: null },
  { id: "reportes",    label: "Analítica",  dot: null },
  { id: "whatsapp",    label: "Chat IA",    dot: "new" },
  { id: "config",      label: "Ajustes",    dot: null },
];

// Iconos limpios — trazo 1.6px, estilo clínico refinado
const ICONS = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  agenda: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  expediente: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  caja: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  laboratorio: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/>
      <path d="M14 9.3a6.5 6.5 0 1 1-4 0"/>
    </svg>
  ),
  reportes: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  whatsapp: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  config: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
};

// ─── COMPONENTE: TAB ──────────────────────────────────────────────────────────
const Tab = memo(({ item, isActive, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => onClick(item.id)}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 14px",
        borderRadius: C.btn,
        border: "none",
        background: isActive ? C.brand : hov ? C.pillBg : "transparent",
        color: isActive ? "#fff" : hov ? C.ink : C.inkMid,
        fontFamily: C.font,
        fontSize: 13,
        fontWeight: isActive ? 600 : 450,
        letterSpacing: isActive ? "-0.1px" : "0",
        cursor: "pointer",
        outline: "none",
        transition: "background 0.16s, color 0.16s",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", opacity: isActive ? 1 : 0.7 }}>
        {ICONS[item.id]}
      </span>
      {item.label}
      {item.dot === "new" && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: isActive ? "rgba(255,255,255,0.7)" : C.mint,
          position: "absolute", top: 6, right: 6,
        }} />
      )}
    </button>
  );
});

// ─── COMPONENTE: TOPBAR ───────────────────────────────────────────────────────
const TopBar = memo(({ state, dispatch, onLogout }) => {
  const goTo = useCallback(id => dispatch({ type: "SET_VIEW", payload: { view: id } }), [dispatch]);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header style={{
      background: C.topbarBg,
      borderBottom: `1px solid ${C.line}`,
      flexShrink: 0,
      zIndex: 200,
    }}>

      {/* ── Fila 1: Logo · Sede · Búsqueda · Acciones ── */}
      <div style={{
        height: 56,
        display: "flex", alignItems: "center",
        padding: "0 20px", gap: 16,
        borderBottom: `1px solid ${C.line}`,
      }}>

        {/* Logo */}
        <button
          onClick={() => goTo("dashboard")}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "none", border: "none", cursor: "pointer",
            padding: 0, flexShrink: 0,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: C.brand,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff",
            boxShadow: `0 2px 8px ${C.brandSoft}`,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{
            fontSize: 17, fontWeight: 700, color: C.ink,
            fontFamily: C.font, letterSpacing: "-0.4px",
          }}>
            DentalOS
          </span>
        </button>

        {/* Divisor */}
        <div style={{ width: 1, height: 20, background: C.line, flexShrink: 0 }} />

        {/* Selector sede */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "5px 11px", borderRadius: C.pill,
          background: C.pillBg, flexShrink: 0,
          border: `1px solid ${C.line}`,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: C.mint,
            boxShadow: `0 0 0 2px ${C.mintSoft}`,
            flexShrink: 0,
          }} />
          <select
            value={state.subAccount}
            onChange={e => dispatch({ type: "SET_SUB_ACCOUNT", payload: e.target.value })}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 12, fontWeight: 600, color: C.inkMid,
              cursor: "pointer", fontFamily: C.font,
              appearance: "none", WebkitAppearance: "none",
            }}
          >
            <option>Sede Principal</option>
            <option>Sucursal El Golf</option>
            <option>Sucursal Miraflores</option>
          </select>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.inkFaint} strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Búsqueda — crece al hacer focus */}
        <div style={{
          position: "relative",
          width: searchFocused ? 300 : 220,
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          marginLeft: "auto",
        }}>
          <svg style={{
            position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
            color: C.inkFaint, pointerEvents: "none",
          }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={state.globalSearch}
            onChange={e => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
            placeholder="Buscar pacientes..."
            aria-label="Búsqueda global"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: "100%",
              padding: "8px 36px 8px 30px",
              borderRadius: C.pill,
              border: `1px solid ${searchFocused ? C.brand : C.line}`,
              background: searchFocused ? "#fff" : C.pillBg,
              fontSize: 13, fontFamily: C.font,
              color: C.ink, outline: "none",
              transition: "border-color 0.15s, background 0.15s",
              boxShadow: searchFocused ? `0 0 0 3px ${C.brandSoft}` : "none",
            }}
          />
          <kbd style={{
            position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)",
            fontSize: 10, color: C.inkFaint, fontFamily: C.fontMono,
            background: C.pillBg, padding: "2px 5px",
            borderRadius: 5, border: `1px solid ${C.line}`,
            display: searchFocused ? "none" : "block",
          }}>⌘K</kbd>
        </div>

        {/* Botón nueva cita */}
        <ActionBtn
          label="+ Nueva cita"
          onClick={() => dispatch({ type: "SET_VIEW", payload: { view: "agenda" } })}
          primary
        />

        {/* Notificaciones */}
        <IconBtn badge={state.notifCount} label="Notificaciones">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </IconBtn>

        {/* Avatar */}
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          style={{
            width: 34, height: 34, borderRadius: "50%", padding: 0,
            background: `${C.brandSoft} url(/drasolvargas.jpeg) center/cover no-repeat`,
            border: `2px solid ${C.line}`, cursor: "pointer", outline: "none",
            flexShrink: 0, transition: "border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; }}
        />
      </div>

      {/* ── Fila 2: Tabs de navegación ── */}
      <div style={{
        height: 44,
        display: "flex", alignItems: "center",
        padding: "0 20px", gap: 2,
        overflowX: "auto",
      }}>
        {NAV.map(item => (
          <Tab
            key={item.id}
            item={item}
            isActive={state.view === item.id}
            onClick={goTo}
          />
        ))}

        {/* Separador + fecha */}
        <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 1, height: 16, background: C.line }} />
          <span style={{
            fontSize: 11, color: C.inkFaint, fontFamily: C.font, fontWeight: 500,
            textTransform: "capitalize", whiteSpace: "nowrap",
          }}>
            {new Date().toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
      </div>
    </header>
  );
});

// ─── MICRO: BOTÓN PRIMARIO ────────────────────────────────────────────────────
const ActionBtn = memo(({ label, onClick, primary }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "7px 15px",
        borderRadius: C.btn,
        border: primary ? "none" : `1px solid ${C.line}`,
        background: primary
          ? hov ? C.brandText : C.brand
          : hov ? C.pillBg : "transparent",
        color: primary ? "#fff" : C.inkMid,
        fontSize: 13, fontWeight: 600,
        fontFamily: C.font, cursor: "pointer",
        outline: "none", flexShrink: 0,
        letterSpacing: "-0.1px",
        transition: "background 0.14s",
        boxShadow: primary ? `0 2px 8px ${C.brandSoft}` : "none",
      }}
    >
      {label}
    </button>
  );
});

// ─── MICRO: BOTÓN ICONO ───────────────────────────────────────────────────────
const IconBtn = memo(({ children, label, badge, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        width: 34, height: 34, borderRadius: 10,
        border: `1px solid ${hov ? C.lineStrong : C.line}`,
        background: hov ? C.pillBg : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: C.inkMid,
        outline: "none", transition: "all 0.14s", flexShrink: 0,
      }}
    >
      {children}
      {badge > 0 && (
        <span style={{
          position: "absolute", top: 3, right: 3,
          width: 14, height: 14, borderRadius: "50%",
          background: C.terra, color: "#fff",
          fontSize: 8, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1.5px solid #fff`, fontFamily: C.font,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
});

// ─── COMPONENTE: ROUTER ───────────────────────────────────────────────────────
const Loader = () => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "60vh", gap: 8,
  }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 7, height: 7, borderRadius: "50%",
        background: C.brand, opacity: 0.3,
        animation: `dot 1.2s ease-in-out ${i * 0.18}s infinite`,
      }} />
    ))}
  </div>
);

const ViewRouter = memo(({ state, dispatch }) => {
  const ActiveView = VIEWS[state.view] ?? Dashboard;

  // Callbacks estables — dispatch de useReducer nunca cambia referencia
  const setView          = useCallback((v, p) => dispatch({ type: "SET_VIEW",     payload: { view: v, pat: p } }), [dispatch]);
  const setSelPat        = useCallback(p      => dispatch({ type: "SET_VIEW",     payload: { view: state.view, pat: p } }), [dispatch, state.view]);
  const setTeeth         = useCallback(t      => dispatch({ type: "SET_TEETH",    payload: t }), [dispatch]);
  const setTeethEvolucion= useCallback(t      => dispatch({ type: "SET_TEETH_EVO",payload: t }), [dispatch]);

  // Props por vista — objeto plano, sin hooks condicionales
  const viewProps = {};
  if (state.view === "expediente") {
    viewProps.teeth              = state.teeth;
    viewProps.setTeeth           = setTeeth;
    viewProps.teethEvolucion     = state.teethEvolucion;
    viewProps.setTeethEvolucion  = setTeethEvolucion;
    viewProps.setView            = setView;
  }
  if (state.view === "dashboard") {
    viewProps.setView   = setView;
    viewProps.setSelPat = setSelPat;
  }

  return (
    <Suspense fallback={<Loader />}>
      <div key={state.view} style={{ animation: "viewIn 0.18s ease forwards" }}>
        <ActiveView {...viewProps} />
      </div>
    </Suspense>
  );
});

// ─── SPLASH ───────────────────────────────────────────────────────────────────
const Splash = () => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100vh", background: C.pageBg,
    gap: 14, fontFamily: C.font,
  }}>
    <div style={{
      width: 52, height: 52, borderRadius: 16, background: C.brand,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
      animation: "pulse 1.6s ease-in-out infinite",
      boxShadow: `0 8px 24px ${C.brandSoft}`,
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: "-0.4px" }}>DentalOS</div>
  </div>
);

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { session, loading, logout } = useSession();
  const [state, dispatch] = useReducer(reducer, INIT);

  // Hidratación inicial
  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: {
      teeth:          jp("dentalOS_odontograma",     {}),
      teethEvolucion: jp("dentalOS_odontograma_evo", {}),
      patientsList:   jp("dentalOS_patients",        PATIENTS),
    }});
  }, []);

  // Persistencia reactiva
  useEffect(() => { sp("dentalOS_odontograma",     state.teeth);          }, [state.teeth]);
  useEffect(() => { sp("dentalOS_odontograma_evo", state.teethEvolucion); }, [state.teethEvolucion]);
  useEffect(() => { sp("dentalOS_patients",        state.patientsList);   }, [state.patientsList]);

  // Título de pestaña
  useEffect(() => {
    const L = { dashboard:"Inicio", agenda:"Agenda", expediente:"Historial", caja:"Finanzas", laboratorio:"Lab", reportes:"Analítica", whatsapp:"Chat IA", config:"Ajustes" };
    document.title = `DentalOS · ${L[state.view] ?? state.view}`;
  }, [state.view]);

  // ⌘K para búsqueda
  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); document.querySelector('input[type="search"]')?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ─ TODOS los hooks arriba. Los return condicionales van DESPUÉS. ─
  const ctxValue = useMemo(() => ({ state, dispatch, logout }), [state, dispatch, logout]);

  if (loading)  return <Splash />;
  if (!session) return <Login onLogin={() => {}} />;

  return (
    <AppContext.Provider value={ctxValue}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;450;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          font-family: 'Outfit', system-ui, sans-serif;
          background: ${C.pageBg};
          color: ${C.ink};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Scrollbar ultra-fina, cálida */
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.lineStrong}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.inkFaint}; }

        /* Ocultar flecha de input search */
        input[type="search"]::-webkit-search-cancel-button,
        input[type="search"]::-webkit-search-decoration { display: none; }

        /* Animaciones */
        @keyframes viewIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }

        /* Eliminar outline feo en botones/selects */
        button:focus-visible { outline: 2px solid ${C.brand}; outline-offset: 2px; }
        select:focus { outline: none; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        height: "100vh", overflow: "hidden",
        fontFamily: C.font,
        background: C.pageBg,
      }}>

        {/* ── Topbar (logo + tabs) ── */}
        <TopBar state={state} dispatch={dispatch} onLogout={logout} />

        {/* ── Contenido principal ── */}
        <main
          role="main"
          style={{
            flex: 1, overflowY: "auto",
            padding: "28px 28px 48px",
          }}
        >
          <div style={{ maxWidth: 1520, margin: "0 auto" }}>
            <ViewRouter state={state} dispatch={dispatch} />
          </div>
        </main>

      </div>
    </AppContext.Provider>
  );
}