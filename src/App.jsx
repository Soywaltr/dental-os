// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS · Shell · Layout Taskk-style
// Sidebar izquierdo fijo con secciones · Header breadcrumb · FAB · Search
// Context + Reducer · Lazy views · Rules of Hooks 100% correctas
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useEffect, useReducer, useCallback,
  useMemo, createContext, useContext, lazy, Suspense, memo,
} from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import { PATIENTS, GRAD_PRIMARY, GRAD_PRIMARY_SHADOW } from "./utils/constants";

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

// ─── FONDO DECORATIVO (glassmorphism) ─────────────────────────────────────────
// Textura odontológica difuminada de fondo. Placeholder generado en SVG — se puede
// reemplazar más adelante por una foto real del consultorio sin tocar el resto del look.
const DENTAL_TOOTH_PATH = "M12 2C7 2 4 5 4 9c0 3 1 5 1 8 0 2 1 4 3 4s2-3 2-5 1-2 2-2 2 0 2 2 0 5 2 5 3-2 3-4c0-3 1-5 1-8 0-4-3-7-8-7z";
const BACKDROP_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d7e6e1"/>
      <stop offset="45%" stop-color="#c8d9d5"/>
      <stop offset="100%" stop-color="#8fb8a8"/>
    </linearGradient>
    <radialGradient id="g2" cx="25%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#dff2b0" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#dff2b0" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g3" cx="80%" cy="75%" r="55%">
      <stop offset="0%" stop-color="#6fd6ab" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#6fd6ab" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#g)"/>
  <rect width="1600" height="1000" fill="url(#g2)"/>
  <rect width="1600" height="1000" fill="url(#g3)"/>
  <g fill="#4caf7d" opacity="0.14">
    <path transform="translate(140,120) scale(3.4) rotate(-14)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(1120,80) scale(4.6) rotate(20)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(760,560) scale(6.2) rotate(-6)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(1280,620) scale(3.2) rotate(28)" d="${DENTAL_TOOTH_PATH}"/>
    <path transform="translate(60,700) scale(3.8) rotate(10)" d="${DENTAL_TOOTH_PATH}"/>
  </g>
</svg>
`);
const BACKDROP_IMAGE_URL = `url("data:image/svg+xml,${BACKDROP_SVG}")`;

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  // Fondos
  sidebarBg:   "rgba(255,255,255,0.6)",
  pageBg:      "#c8d9d5",
  cardBg:      "rgba(255,255,255,0.6)",
  hoverBg:     "rgba(15,23,42,0.05)",
  activeBg:    "rgba(227,243,236,0.75)",
  glassBlur:   "blur(20px)",
  glassBorder: "1px solid rgba(255,255,255,0.7)",
  glassShadow: "0 8px 32px rgba(16,120,80,0.10)",
  // Texto
  ink:         "#111827",
  inkMid:      "#4B5563",
  inkMute:     "#9CA3AF",
  inkFaint:    "#D1D5DB",
  // Acento
  brand:       "#2f9d76",
  brandHov:    "#1f7a5a",
  brandSoft:   "#e3f3ec",
  brandText:   "#1f7a5a",
  // Semánticos
  green:       "#10B981",
  greenSoft:   "#D1FAE5",
  red:         "#EF4444",
  redSoft:     "#FEE2E2",
  amber:       "#F59E0B",
  amberSoft:   "#FEF3C7",
  blue:        "#3B82F6",
  blueSoft:    "#DBEAFE",
  // Bordes
  border:      "#E5E7EB",
  borderStrong:"#D1D5DB",
  // Sombras
  shadowSm:    "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:    "0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)",
  // Tipografía
  font:        "'Inter', 'DM Sans', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
  // Radios
  r:           "8px",
  rl:          "12px",
  rx:          "16px",
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
const INIT = {
  view: "dashboard", selectedPat: null, subAccount: "Sede Principal",
  teeth: {}, teethEvolucion: {}, patientsList: [],
  globalSearch: "", notifCount: 3, sidebarCollapsed: false,
};

function reducer(st, action) {
  switch (action.type) {
    case "SET_VIEW":        return { ...st, view: action.payload.view, selectedPat: action.payload.pat ?? st.selectedPat };
    case "SET_SUB_ACCOUNT": return { ...st, subAccount: action.payload };
    case "SET_TEETH": 
      // SOLUCIÓN: Si payload es una función, la ejecutamos pasando el estado anterior
      const newTeeth = typeof action.payload === 'function' ? action.payload(st.teeth) : action.payload;
      return { ...st, teeth: newTeeth };
    case "SET_TEETH_EVO": 
      // SOLUCIÓN: Igual para evolución
      const newTeethEvo = typeof action.payload === 'function' ? action.payload(st.teethEvolucion) : action.payload;
      return { ...st, teethEvolucion: newTeethEvo };
    case "SET_PATIENTS":    return { ...st, patientsList: action.payload };
    case "SET_SEARCH":      return { ...st, globalSearch: action.payload };
    case "TOGGLE_SIDEBAR":  return { ...st, sidebarCollapsed: !st.sidebarCollapsed };
    case "HYDRATE":         return { ...st, ...action.payload };
    default:                return st;
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
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

// ─── ESTRUCTURA SIDEBAR ───────────────────────────────────────────────────────
const SIDEBAR_SECTIONS = [
  {
    label: null, // sin etiqueta para la sección principal
    items: [
      { id: "dashboard",  label: "Dashboard" },
      { id: "agenda",     label: "Agenda" },
      { id: "expediente", label: "Historial" },
      { id: "reportes",   label: "Analítica" },
    ],
  },
  {
    label: "Clínica",
    items: [
      { id: "caja",        label: "Finanzas" },
      { id: "laboratorio", label: "Laboratorio" },
      { id: "whatsapp",    label: "Chat IA",    badge: "IA" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { id: "config", label: "Ajustes" },
    ],
  },
];

// Iconos — 16px, stroke 1.75
const IC = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  agenda:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  expediente: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  caja:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  laboratorio:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>,
  reportes:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  whatsapp:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  config:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  home:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  chevRight:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  chevLeft:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  chevDown:   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  search:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  bell:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  settings:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  plus:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  support:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

// ─── ETIQUETAS DE VISTA ───────────────────────────────────────────────────────
const VIEW_LABELS = {
  dashboard: "Dashboard", agenda: "Agenda", expediente: "Historial",
  caja: "Finanzas", laboratorio: "Laboratorio", reportes: "Analítica",
  whatsapp: "Chat IA", config: "Ajustes",
};

// ─── COMPONENTE: SIDEBAR ITEM ─────────────────────────────────────────────────
const SidebarItem = memo(({ item, isActive, collapsed, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => onClick(item.id)}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        display: "flex", alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "8px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: C.r,
        border: "none",
        background: isActive ? C.activeBg : hov ? C.hoverBg : "transparent",
        color: isActive ? C.brand : hov ? C.ink : C.inkMid,
        fontFamily: C.font, fontSize: 13.5,
        fontWeight: isActive ? 600 : 450,
        cursor: "pointer", outline: "none",
        transition: "background 0.12s, color 0.12s",
        letterSpacing: "-0.1px",
        position: "relative",
      }}
    >
      {/* Barra activa izquierda */}
      {isActive && !collapsed && (
        <span style={{
          position: "absolute", left: 0, top: "20%", bottom: "20%",
          width: 3, borderRadius: "0 3px 3px 0",
          background: C.brand,
        }} />
      )}

      {/* Ícono */}
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 20, height: 20, flexShrink: 0,
        color: isActive ? C.brand : hov ? C.ink : C.inkMute,
      }}>
        {IC[item.id]}
      </span>

      {/* Label + badge */}
      {!collapsed && (
        <>
          <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
          {item.badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.2px",
              padding: "2px 7px", borderRadius: 100,
              background: isActive ? C.brand : C.brandSoft,
              color: isActive ? "#fff" : C.brand,
            }}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );
});

// ─── COMPONENTE: SIDEBAR ─────────────────────────────────────────────────────
const Sidebar = memo(({ state, dispatch, onLogout }) => {
  const { sidebarCollapsed: col, view, subAccount, notifCount } = state;
  const goTo   = useCallback(id => dispatch({ type: "SET_VIEW",       payload: { view: id } }), [dispatch]);
  const toggle = useCallback(()  => dispatch({ type: "TOGGLE_SIDEBAR" }), [dispatch]);
  const W = col ? 60 : 220;

  return (
    <aside style={{
      width: W, minWidth: W,
      height: "100vh",
      display: "flex", flexDirection: "column",
      background: C.sidebarBg,
      backdropFilter: C.glassBlur, WebkitBackdropFilter: C.glassBlur,
      borderRight: `1px solid rgba(255,255,255,0.4)`,
      boxShadow: C.glassShadow,
      transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden", flexShrink: 0, zIndex: 100,
    }}>

      {/* ── Logo ── */}
      <div style={{
        height: 56,
        display: "flex", alignItems: "center",
        padding: col ? "0" : "0 16px",
        justifyContent: col ? "center" : "space-between",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {!col && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: GRAD_PRIMARY,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.ink, fontFamily: C.font, letterSpacing: "-0.3px" }}>
              DentalOS
            </span>
          </div>
        )}
        <button
          onClick={toggle}
          aria-label={col ? "Expandir menú" : "Colapsar menú"}
          style={{
            width: 24, height: 24, borderRadius: 6,
            border: `1px solid ${C.border}`,
            background: C.hoverBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.inkMute,
            outline: "none", transition: "background 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.border; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.hoverBg; }}
        >
          {col ? IC.chevRight : IC.chevLeft}
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: col ? "10px 8px" : "10px 12px", flexShrink: 0 }}>
        {col ? (
          <button onClick={() => {}} style={{
            width: "100%", height: 32, borderRadius: C.r,
            border: `1px solid ${C.border}`, background: C.hoverBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.inkMute, outline: "none",
          }}>
            {IC.search}
          </button>
        ) : (
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.inkMute, display: "flex" }}>
              {IC.search}
            </span>
            <input
              type="search"
              value={state.globalSearch}
              onChange={e => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
              placeholder="Buscar..."
              style={{
                width: "100%", padding: "7px 28px 7px 28px",
                borderRadius: C.r, border: `1px solid ${C.border}`,
                background: C.hoverBg, fontSize: 13,
                fontFamily: C.font, color: C.ink, outline: "none",
                transition: "border-color 0.12s",
              }}
              onFocus={e => { e.target.style.borderColor = C.brand; }}
              onBlur={e  => { e.target.style.borderColor = C.border; }}
            />
            <kbd style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 10, color: C.inkFaint, fontFamily: C.fontMono,
              background: "#fff", padding: "1px 4px", borderRadius: 4,
              border: `1px solid ${C.border}`,
            }}>
              /
            </kbd>
          </div>
        )}
      </div>

      {/* ── Secciones de Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: col ? "0 8px" : "0 8px" }}>
        {SIDEBAR_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: 8 }}>
            {section.label && !col && (
              <div style={{
                fontSize: 11, fontWeight: 600, color: C.inkFaint,
                letterSpacing: "0.6px", textTransform: "uppercase",
                padding: "10px 12px 4px",
                fontFamily: C.font,
              }}>
                {section.label}
              </div>
            )}
            {section.label && col && si > 0 && (
              <div style={{ height: "1px", background: C.border, margin: "8px 4px" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {section.items.map(item => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isActive={view === item.id}
                  collapsed={col}
                  onClick={goTo}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer sidebar ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: col ? "8px" : "8px",
        flexShrink: 0, display: "flex", flexDirection: "column", gap: 1,
      }}>
        {/* Soporte */}
        <SidebarItem
          item={{ id: "support_fake", label: "Soporte" }}
          isActive={false}
          collapsed={col}
          onClick={() => {}}
        />

        {/* Usuario */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: 8, padding: col ? "8px 0" : "8px 12px",
          justifyContent: col ? "center" : "flex-start",
          borderRadius: C.r, marginTop: 4,
          cursor: "pointer",
          transition: "background 0.12s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = C.hoverBg; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          onClick={onLogout}
          title="Cerrar sesión"
        >
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `${C.brandSoft} url(/drasolvargas.jpeg) center/cover no-repeat`,
            border: `1.5px solid ${C.border}`, flexShrink: 0,
          }} />
          {!col && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Dra. Sol Vargas
              </div>
              <div style={{ fontSize: 11, color: C.inkMute }}>Cerrar sesión</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});

// ─── COMPONENTE: HEADER SUPERIOR ──────────────────────────────────────────────
const TopHeader = memo(({ state, dispatch, onLogout }) => {
  const label = VIEW_LABELS[state.view] ?? state.view;

  return (
    <header style={{
      height: 56,
      display: "flex", alignItems: "center",
      padding: "0 24px",
      background: "rgba(255,255,255,0.45)",
      backdropFilter: C.glassBlur, WebkitBackdropFilter: C.glassBlur,
      borderBottom: `1px solid rgba(255,255,255,0.4)`,
      gap: 12, flexShrink: 0, zIndex: 90, position: "relative",
    }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
        <span style={{ color: C.inkMute, display: "flex" }}>{IC.home}</span>
        <span style={{ color: C.inkFaint, display: "flex" }}>{IC.chevRight}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, fontFamily: C.font }}>
          {label}
        </span>
      </div>

      {/* Grupo derecho */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

        {/* Selector sede */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: C.r,
          border: `1px solid ${C.border}`, background: "#fff",
          boxShadow: C.shadowSm,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
          <select
            value={state.subAccount}
            onChange={e => dispatch({ type: "SET_SUB_ACCOUNT", payload: e.target.value })}
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 12.5, fontWeight: 500, color: C.inkMid,
              cursor: "pointer", fontFamily: C.font,
              appearance: "none", WebkitAppearance: "none",
            }}
          >
            <option>Sede Principal</option>
            <option>Sucursal El Golf</option>
            <option>Sucursal Miraflores</option>
          </select>
          <span style={{ color: C.inkFaint }}>{IC.chevDown}</span>
        </div>

        {/* Botón nueva cita */}
        <PrimaryBtn
          onClick={() => dispatch({ type: "SET_VIEW", payload: { view: "agenda" } })}
        >
          {IC.plus}
          Nueva cita
        </PrimaryBtn>

        {/* Settings */}
        <HeaderIconBtn label="Configuración" onClick={() => dispatch({ type: "SET_VIEW", payload: { view: "config" } })}>
          {IC.settings}
        </HeaderIconBtn>

        {/* Notificaciones */}
        <HeaderIconBtn label={`${state.notifCount} notificaciones`} badge={state.notifCount}>
          {IC.bell}
        </HeaderIconBtn>

        {/* Avatar */}
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          style={{
            width: 32, height: 32, borderRadius: "50%", padding: 0,
            background: `${C.brandSoft} url(/drasolvargas.jpeg) center/cover no-repeat`,
            border: `2px solid ${C.border}`, cursor: "pointer", outline: "none",
            transition: "border-color 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.brand; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
        />
      </div>
    </header>
  );
});

// ─── MICRO: BOTÓN PRIMARIO ────────────────────────────────────────────────────
const PrimaryBtn = memo(({ children, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 14px", borderRadius: C.r, border: "none",
        background: GRAD_PRIMARY,
        opacity: hov ? 0.9 : 1,
        color: "#fff", fontSize: 13, fontWeight: 600,
        fontFamily: C.font, cursor: "pointer", outline: "none",
        transition: "opacity 0.12s",
        boxShadow: GRAD_PRIMARY_SHADOW,
        letterSpacing: "-0.1px",
      }}
    >
      {children}
    </button>
  );
});

// ─── MICRO: ICONO HEADER ──────────────────────────────────────────────────────
const HeaderIconBtn = memo(({ children, label, badge, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", width: 34, height: 34, borderRadius: C.r,
        border: `1px solid ${C.border}`,
        background: hov ? C.hoverBg : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: C.inkMid, outline: "none",
        transition: "background 0.12s", flexShrink: 0,
        boxShadow: C.shadowSm,
      }}
    >
      {children}
      {badge > 0 && (
        <span style={{
          position: "absolute", top: 2, right: 2,
          width: 14, height: 14, borderRadius: "50%",
          background: C.red, color: "#fff", fontSize: 8, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1.5px solid #fff", fontFamily: C.font,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
});

// ─── COMPONENTE: ROUTER ───────────────────────────────────────────────────────
const Loader = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", gap: 6 }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{
        width: 6, height: 6, borderRadius: "50%", background: C.brand,
        animation: `dotBounce 1.1s ease-in-out ${i * 0.16}s infinite`,
      }} />
    ))}
  </div>
);

const ViewRouter = memo(({ state, dispatch }) => {
  // Aseguramos que si alguna vista vieja llama a 'historia', renderice 'expediente'
  const currentViewKey = state.view === 'historia' ? 'expediente' : state.view;
  const ActiveView = VIEWS[currentViewKey] ?? Dashboard;

  // 1. Añadido setPatientsList para que puedas crear nuevos pacientes
  const setView           = useCallback((v, p) => dispatch({ type: "SET_VIEW",     payload: { view: v, pat: p } }), [dispatch]);
  const setSelPat         = useCallback(p      => dispatch({ type: "SET_VIEW",     payload: { view: state.view, pat: p } }), [dispatch, state.view]);
  const setTeeth          = useCallback(t      => dispatch({ type: "SET_TEETH",    payload: t }), [dispatch]);
  const setTeethEvolucion = useCallback(t      => dispatch({ type: "SET_TEETH_EVO",payload: t }), [dispatch]);
  const setPatientsList   = useCallback(p      => dispatch({ type: "SET_PATIENTS", payload: p }), [dispatch]);

  // 2. Props globales (Se le pasan a todas las vistas por defecto)
  const viewProps = {
    setView,
    setSelPat,
    patientsList: state.patientsList,
    setPatientsList
  };

  // 3. Props específicas para el Expediente Clínico (Historia)
  if (currentViewKey === "expediente") {
    viewProps.patient            = state.selectedPat; // ¡ESTE ERA EL DATO FALTANTE CRÍTICO!
    viewProps.teeth              = state.teeth;
    viewProps.setTeeth           = setTeeth;
    viewProps.teethEvolucion     = state.teethEvolucion;
    viewProps.setTeethEvolucion  = setTeethEvolucion;
  }

  return (
    <Suspense fallback={<Loader />}>
      <div key={currentViewKey} style={{ animation: "viewIn 0.16s ease forwards" }}>
        <ActiveView {...viewProps} />
      </div>
    </Suspense>
  );
});

// ─── SPLASH ───────────────────────────────────────────────────────────────────
const Splash = () => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100vh", position: "relative", overflow: "hidden",
    background: C.pageBg, gap: 16, fontFamily: C.font,
  }}>
    <div style={{
      position: "fixed", inset: 0, zIndex: 0,
      backgroundImage: BACKDROP_IMAGE_URL,
      backgroundSize: "cover", backgroundPosition: "center",
      filter: "blur(50px)", transform: "scale(1.15)",
    }} />
    <div style={{
      position: "relative", zIndex: 1,
      width: 48, height: 48, borderRadius: 14, background: GRAD_PRIMARY,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
      animation: "pulse 1.5s ease-in-out infinite",
      boxShadow: `0 8px 24px rgba(53,107,90,0.3)`,
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    </div>
    <span style={{ position: "relative", zIndex: 1, fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-0.3px" }}>DentalOS</span>
  </div>
);

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { session, loading, logout } = useSession();
  const [state, dispatch] = useReducer(reducer, INIT);

  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: {
      teeth:          jp("dentalOS_odontograma",     {}),
      teethEvolucion: jp("dentalOS_odontograma_evo", {}),
      patientsList:   jp("dentalOS_patients",        PATIENTS),
    }});
  }, []);

  useEffect(() => { sp("dentalOS_odontograma",     state.teeth);          }, [state.teeth]);
  useEffect(() => { sp("dentalOS_odontograma_evo", state.teethEvolucion); }, [state.teethEvolucion]);
  useEffect(() => { sp("dentalOS_patients",        state.patientsList);   }, [state.patientsList]);

  useEffect(() => {
    const L = VIEW_LABELS;
    document.title = `DentalOS · ${L[state.view] ?? state.view}`;
  }, [state.view]);

  useEffect(() => {
    const h = e => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); document.querySelector('input[type="search"]')?.focus(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // ── TODOS LOS HOOKS ANTES DE CUALQUIER RETURN CONDICIONAL ──────────────────
  const ctxValue = useMemo(() => ({ state, dispatch, logout }), [state, dispatch, logout]);

  if (loading)  return <Splash />;
  if (!session) return <Login onLogin={() => {}} />;

  return (
    <AppContext.Provider value={ctxValue}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          font-family: 'Inter', system-ui, sans-serif;
          background: ${C.pageBg};
          color: ${C.ink};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.borderStrong}; }
        input[type="search"]::-webkit-search-cancel-button { display: none; }
        button { -webkit-tap-highlight-color: transparent; }

        @keyframes viewIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.05); }
        }
      `}</style>

      <div style={{
        display: "flex", height: "100vh",
        overflow: "hidden", background: C.pageBg,
        fontFamily: C.font, position: "relative",
      }}>
        {/* Fondo decorativo: textura odontológica difuminada (glassmorphism) */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0,
          backgroundImage: BACKDROP_IMAGE_URL,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(50px)", transform: "scale(1.15)",
        }} />

        {/* Sidebar izquierdo */}
        <Sidebar state={state} dispatch={dispatch} onLogout={logout} />

        {/* Columna derecha */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, position: "relative", zIndex: 1 }}>
          {/* Header con breadcrumb */}
          <TopHeader state={state} dispatch={dispatch} onLogout={logout} />

          {/* Contenido */}
          <main role="main" style={{ flex: 1, overflowY: "auto", padding: "24px 24px 48px", background: "transparent" }}>
            <div style={{ maxWidth: 1480, margin: "0 auto" }}>
              <ViewRouter state={state} dispatch={dispatch} />
            </div>
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}