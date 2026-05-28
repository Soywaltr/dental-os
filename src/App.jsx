// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS — Shell Premium · Arquitectura Apple-grade
// Sidebar vertical colapsable · Secciones agrupadas · Micro-animaciones CSS
// Context + Reducer · Lazy views · Zero prop-drilling · Accesibilidad WCAG AA
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

// ─── CONTEXTO GLOBAL ──────────────────────────────────────────────────────────
export const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
// Paleta macOS Sonoma: blancos translúcidos, grises warmth, azul sistema.
const DS = {
  // Superficies
  sidebar:     "rgba(246,246,248,0.92)",
  sidebarBdr:  "rgba(0,0,0,0.07)",
  surface:     "#FFFFFF",
  surfaceHov:  "rgba(0,0,0,0.04)",
  bg:          "#F2F2F7",           // iOS/macOS system background
  // Texto
  text:        "#1C1C1E",           // apple label
  textSec:     "#3C3C43",           // apple secondary label (60% opacity equiv)
  textTer:     "#8E8E93",           // apple tertiary label
  textQuat:    "#C7C7CC",           // apple quaternary
  // Acento sistema
  accent:      "#007AFF",           // apple blue
  accentSoft:  "rgba(0,122,255,0.12)",
  accentText:  "#0056CC",
  // Semánticos
  success:     "#34C759",
  warn:        "#FF9500",
  danger:      "#FF3B30",
  // Separadores
  sep:         "rgba(60,60,67,0.13)",
  sepStrong:   "rgba(60,60,67,0.22)",
  // Tipografía — SF Pro Display / -apple-system como fallback exacto
  fontDisplay: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
  fontText:    "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif",
  fontMono:    "'SF Mono', 'Fira Code', monospace",
  // Radio
  r:    "10px",
  rl:   "14px",
  rx:   "18px",
  // Sombras (apple-style: muy suaves, multicapa)
  shadowSm:  "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:  "0 4px 16px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)",
  shadowLg:  "0 12px 40px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)",
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
const initialState = {
  view:           "dashboard",
  selectedPat:    null,
  subAccount:     "Sede Principal",
  teeth:          {},
  teethEvolucion: {},
  patientsList:   [],
  globalSearch:   "",
  notifCount:     3,
  sidebarOpen:    true,
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_VIEW":         return { ...state, view: action.payload.view, selectedPat: action.payload.pat ?? state.selectedPat };
    case "SET_SUB_ACCOUNT":  return { ...state, subAccount: action.payload };
    case "SET_TEETH":        return { ...state, teeth: action.payload };
    case "SET_TEETH_EVO":    return { ...state, teethEvolucion: action.payload };
    case "SET_PATIENTS":     return { ...state, patientsList: action.payload };
    case "SET_SEARCH":       return { ...state, globalSearch: action.payload };
    case "TOGGLE_SIDEBAR":   return { ...state, sidebarOpen: !state.sidebarOpen };
    case "HYDRATE":          return { ...state, ...action.payload };
    default:                 return state;
  }
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
const safeJsonParse = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const safePersist   = (key, v)  => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota */ } };

// ─── HOOK SESIÓN ──────────────────────────────────────────────────────────────
function useSupabaseSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  const logout = useCallback(() => supabase.auth.signOut(), []);
  return { session, loading, logout };
}

// ─── MAPA DE VISTAS ───────────────────────────────────────────────────────────
const VIEW_MAP = { dashboard: Dashboard, agenda: Agenda, expediente: Expediente, caja: Caja, laboratorio: Laboratorio, reportes: Reportes, whatsapp: WhatsApp, config: Config };

// ─── DEFINICIÓN DE NAVEGACIÓN (grupos estilo macOS) ──────────────────────────
const NAV_SECTIONS = [
  {
    label: "Principal",
    items: [
      { id: "dashboard",  label: "Dashboard",  icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z", filled: true },
      { id: "agenda",     label: "Agenda",     icon: null, iconJsx: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
      { id: "expediente", label: "Historial",  icon: null, iconJsx: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    ],
  },
  {
    label: "Gestión",
    items: [
      { id: "caja",       label: "Finanzas",   icon: null, iconJsx: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
      { id: "laboratorio",label: "Lab",        icon: null, iconJsx: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg> },
      { id: "reportes",   label: "Analítica",  icon: null, iconJsx: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { id: "whatsapp",   label: "Chat IA",    icon: null, iconJsx: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: "IA" },
      { id: "config",     label: "Ajustes",    icon: null, iconJsx: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
    ],
  },
];

// ─── COMPONENTE: NAV ITEM ─────────────────────────────────────────────────────
const NavItemRow = memo(({ item, isActive, collapsed, onClick }) => {
  const [hov, setHov] = useState(false);

  const bg = isActive
    ? DS.accent
    : hov
      ? DS.surfaceHov
      : "transparent";

  const color = isActive ? "#fff" : hov ? DS.text : DS.textSec;

  return (
    <button
      onClick={() => onClick(item.id)}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "9px 0" : "9px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: DS.r,
        border: "none",
        background: bg,
        color,
        cursor: "pointer",
        fontFamily: DS.fontText,
        fontSize: 14,
        fontWeight: isActive ? 600 : 450,
        letterSpacing: "-0.1px",
        transition: "background 0.15s, color 0.15s",
        outline: "none",
        position: "relative",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Icon */}
      <span style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 20, height: 20, flexShrink: 0,
        opacity: isActive ? 1 : hov ? 0.9 : 0.65,
        transition: "opacity 0.15s",
      }}>
        {item.filled
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d={item.icon}/></svg>
          : item.iconJsx
        }
      </span>

      {/* Label + Badge — solo cuando expandido */}
      {!collapsed && (
        <>
          <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
          {item.badge && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.3px",
              padding: "2px 6px", borderRadius: 100,
              background: isActive ? "rgba(255,255,255,0.25)" : DS.accentSoft,
              color: isActive ? "#fff" : DS.accent,
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
  const { sidebarOpen: open, view, subAccount, notifCount } = state;
  const goTo = useCallback(id => dispatch({ type: "SET_VIEW", payload: { view: id } }), [dispatch]);
  const toggle = useCallback(() => dispatch({ type: "TOGGLE_SIDEBAR" }), [dispatch]);

  const W = open ? 240 : 64;

  return (
    <aside
      aria-label="Navegación principal"
      style={{
        width: W,
        minWidth: W,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: DS.sidebar,
        backdropFilter: "blur(40px) saturate(1.8)",
        WebkitBackdropFilter: "blur(40px) saturate(1.8)",
        borderRight: `0.5px solid ${DS.sidebarBdr}`,
        transition: "width 0.28s cubic-bezier(0.4,0,0.2,1), min-width 0.28s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        flexShrink: 0,
        zIndex: 200,
        position: "relative",
      }}
    >
      {/* ── Header: Avatar + Nombre ── */}
      <div style={{
        padding: open ? "20px 16px 16px" : "20px 0 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        justifyContent: open ? "flex-start" : "center",
        flexShrink: 0,
      }}>
        {/* Avatar */}
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          style={{
            width: 36, height: 36, borderRadius: "50%", padding: 0,
            background: "#E2E8F0 url(/drasolvargas.jpeg) center/cover no-repeat",
            border: "2px solid rgba(255,255,255,0.9)",
            cursor: "pointer", flexShrink: 0, outline: "none",
            boxShadow: DS.shadowSm,
            transition: "box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = DS.shadowMd; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = DS.shadowSm; }}
        />

        {/* Nombre — solo expandido */}
        {open && (
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: 11, color: DS.textTer, fontFamily: DS.fontText, letterSpacing: "0.2px", lineHeight: 1.2 }}>
              Buenos días ☀️
            </div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: DS.text,
              fontFamily: DS.fontDisplay, letterSpacing: "-0.3px",
              lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              Dra. Sol Vargas
            </div>
          </div>
        )}

        {/* Botón colapsar */}
        {open && (
          <button
            onClick={toggle}
            aria-label="Colapsar sidebar"
            style={{
              width: 26, height: 26, borderRadius: "50%", border: "none",
              background: "rgba(0,0,0,0.06)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: DS.textTer, flexShrink: 0, outline: "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Selector sede ── */}
      {open ? (
        <div style={{ padding: "0 10px 12px", flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: DS.surface, padding: "7px 12px",
            borderRadius: DS.r, border: `0.5px solid ${DS.sep}`,
            boxShadow: DS.shadowSm,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: DS.success, flexShrink: 0 }} />
            <select
              value={subAccount}
              onChange={e => dispatch({ type: "SET_SUB_ACCOUNT", payload: e.target.value })}
              aria-label="Seleccionar sede"
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent",
                fontSize: 12, fontWeight: 600, color: DS.textSec, cursor: "pointer",
                fontFamily: DS.fontText, appearance: "none", WebkitAppearance: "none",
              }}
            >
              <option value="Sede Principal">Sede Principal</option>
              <option value="Sucursal El Golf">Sucursal El Golf</option>
              <option value="Sucursal Miraflores">Sucursal Miraflores</option>
            </select>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={DS.textTer} strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 0 12px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: DS.success }} />
        </div>
      )}

      {/* ── Separador ── */}
      <div style={{ height: "0.5px", background: DS.sep, margin: "0 12px 8px", flexShrink: 0 }} />

      {/* ── Secciones de navegación ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: open ? "0 10px" : "0 8px" }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label} style={{ marginBottom: 6 }}>
            {/* Etiqueta de sección — solo expandido */}
            {open && (
              <div style={{
                fontSize: 11, fontWeight: 600, color: DS.textQuat, letterSpacing: "0.6px",
                textTransform: "uppercase", padding: "10px 12px 4px",
                fontFamily: DS.fontText,
              }}>
                {section.label}
              </div>
            )}
            {!open && si > 0 && (
              <div style={{ height: "0.5px", background: DS.sep, margin: "8px 4px" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map(item => (
                <NavItemRow
                  key={item.id}
                  item={item}
                  isActive={view === item.id}
                  collapsed={!open}
                  onClick={goTo}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer: Notificaciones + Expand btn (colapsado) ── */}
      <div style={{
        padding: open ? "12px 10px 20px" : "12px 0 20px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: open ? "stretch" : "center",
      }}>
        <div style={{ height: "0.5px", background: DS.sep, margin: "0 4px 6px" }} />

        {/* Botón notificaciones */}
        <button
          aria-label={`${notifCount} notificaciones`}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: open ? "9px 12px" : "9px 0",
            justifyContent: open ? "flex-start" : "center",
            borderRadius: DS.r, border: "none", background: "transparent",
            cursor: "pointer", color: DS.textSec, fontFamily: DS.fontText,
            fontSize: 14, fontWeight: 450, outline: "none",
            transition: "background 0.15s",
            position: "relative", width: open ? "100%" : "auto",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = DS.surfaceHov; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <span style={{ display:"flex", alignItems:"center", position:"relative", flexShrink:0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span style={{
                position:"absolute", top:-4, right:-4,
                width:14, height:14, borderRadius:"50%",
                background: DS.danger, color:"#fff",
                fontSize:8, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center",
                border:"1.5px solid " + DS.sidebar,
              }}>
                {notifCount}
              </span>
            )}
          </span>
          {open && <span>Notificaciones</span>}
        </button>

        {/* Botón expandir — solo colapsado */}
        {!open && (
          <button
            onClick={toggle}
            aria-label="Expandir sidebar"
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: DS.surfaceHov, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: DS.textTer, outline: "none", transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = DS.surfaceHov; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
});

// ─── COMPONENTE: TOPBAR DEL CONTENIDO ─────────────────────────────────────────
const ContentTopBar = memo(({ state, dispatch }) => {
  const VIEW_TITLES = { dashboard:"Dashboard", agenda:"Agenda", expediente:"Historial clínico", caja:"Finanzas", laboratorio:"Laboratorio", reportes:"Analítica", whatsapp:"Chat IA", config:"Ajustes" };
  const title = VIEW_TITLES[state.view] ?? state.view;

  return (
    <div style={{
      height: 52,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: `0.5px solid ${DS.sep}`,
      flexShrink: 0,
      zIndex: 100,
      gap: 16,
    }}>

      {/* Título de vista con breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h1 style={{
          fontSize: 15, fontWeight: 700, color: DS.text,
          fontFamily: DS.fontDisplay, letterSpacing: "-0.3px", margin: 0,
          lineHeight: 1,
        }}>
          {title}
        </h1>
      </div>

      {/* Búsqueda centrada */}
      <div style={{ position: "relative", maxWidth: 320, width: "100%" }}>
        <svg style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:DS.textQuat, pointerEvents:"none" }}
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="search"
          value={state.globalSearch}
          onChange={e => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
          placeholder="Buscar pacientes, tratamientos…"
          aria-label="Búsqueda global"
          style={{
            width: "100%", padding: "7px 14px 7px 30px",
            border: `0.5px solid ${DS.sep}`, borderRadius: 100,
            background: "rgba(120,120,128,0.08)",
            fontSize: 13, fontFamily: DS.fontText,
            color: DS.text, outline: "none",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onFocus={e => { e.target.style.borderColor = DS.accent; e.target.style.background = DS.surface; }}
          onBlur={e  => { e.target.style.borderColor = DS.sep; e.target.style.background = "rgba(120,120,128,0.08)"; }}
        />
        {/* Shortcut hint */}
        <kbd style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
          fontSize: 10, color: DS.textQuat, fontFamily: DS.fontMono,
          background: "rgba(0,0,0,0.05)", padding: "2px 5px", borderRadius: 4,
          border: "0.5px solid rgba(0,0,0,0.08)",
        }}>
          ⌘K
        </kbd>
      </div>

      {/* Acciones derecha */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <TopBarBtn label="Nueva cita" primary onClick={() => dispatch({ type:"SET_VIEW", payload:{ view:"agenda" } })}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva cita
        </TopBarBtn>
      </div>
    </div>
  );
});

// ─── MICRO-COMPONENTE: BOTÓN TOPBAR ───────────────────────────────────────────
const TopBarBtn = memo(({ children, label, primary, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 12px", borderRadius: DS.r, border: "none",
        background: primary
          ? hov ? DS.accentText : DS.accent
          : hov ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.04)",
        color: primary ? "#fff" : DS.textSec,
        fontSize: 13, fontWeight: 600, fontFamily: DS.fontText,
        cursor: "pointer", outline: "none",
        transition: "background 0.15s",
        letterSpacing: "-0.1px",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {children}
    </button>
  );
});

// ─── COMPONENTE: FAB (botón acción flotante) ──────────────────────────────────
const FAB = memo(({ onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label="Acción principal"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "fixed", bottom: 28, right: 28,
        width: 52, height: 52, borderRadius: "50%",
        border: "none",
        background: hov
          ? `linear-gradient(145deg, #1a8aff, ${DS.accentText})`
          : `linear-gradient(145deg, #2196ff, ${DS.accent})`,
        color: "#fff", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hov
          ? `0 8px 24px rgba(0,122,255,0.45), 0 2px 8px rgba(0,122,255,0.3)`
          : `0 4px 16px rgba(0,122,255,0.35), 0 1px 4px rgba(0,122,255,0.2)`,
        outline: "none",
        transition: "transform 0.15s, box-shadow 0.15s, background 0.15s",
        transform: hov ? "scale(1.06)" : "scale(1)",
        zIndex: 300,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  );
});

// ─── COMPONENTE: ROUTER DE VISTAS ─────────────────────────────────────────────
const ViewSkeleton = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", minHeight:300 }}>
    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:6, height:6, borderRadius:"50%", background: DS.accent,
          animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`,
        }} />
      ))}
    </div>
  </div>
);

const ViewRouter = memo(({ state, dispatch }) => {
  const ActiveView = VIEW_MAP[state.view] ?? Dashboard;

  // ─ Callbacks estables — dispatch es estable por useReducer, nunca cambia.
  // NO usar useMemo con deps incompletas: causa Error #310 en producción.
  const setView          = useCallback((v, p) => dispatch({ type:"SET_VIEW",     payload:{ view:v, pat:p } }), [dispatch]);
  const setSelPat        = useCallback(p      => dispatch({ type:"SET_VIEW",     payload:{ view:state.view, pat:p } }), [dispatch, state.view]);
  const setTeeth         = useCallback(t      => dispatch({ type:"SET_TEETH",    payload:t }), [dispatch]);
  const setTeethEvolucion= useCallback(t      => dispatch({ type:"SET_TEETH_EVO",payload:t }), [dispatch]);

  // Props por vista — objeto plano, sin useMemo
  const viewProps = {};
  if (state.view === "expediente") {
    viewProps.teeth              = state.teeth;
    viewProps.setTeeth           = setTeeth;
    viewProps.teethEvolucion     = state.teethEvolucion;
    viewProps.setTeethEvolucion  = setTeethEvolucion;
  }
  if (state.view === "dashboard" || state.view === "expediente") {
    viewProps.setView   = setView;
    viewProps.setSelPat = setSelPat;
  }

  return (
    <Suspense fallback={<ViewSkeleton />}>
      <div
        key={state.view}
        style={{ animation: "viewIn 0.2s cubic-bezier(0.4,0,0.2,1) forwards" }}
      >
        <ActiveView {...viewProps} />
      </div>
    </Suspense>
  );
});

// ─── SPLASH ───────────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      height:"100vh", background: DS.bg, fontFamily: DS.fontDisplay, gap:14,
    }}>
      <div style={{
        width:52, height:52, borderRadius:16,
        background:`linear-gradient(145deg, #2196ff, ${DS.accent})`,
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#fff",
        boxShadow:`0 8px 24px rgba(0,122,255,0.4)`,
        animation:"splashPulse 1.8s ease-in-out infinite",
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div style={{ fontSize:22, fontWeight:800, color:DS.text, letterSpacing:"-0.6px" }}>DentalOS</div>
      <div style={{ fontSize:13, color:DS.textTer, fontFamily:DS.fontText }}>Cargando…</div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { session, loading, logout } = useSupabaseSession();
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Hidratación
  useEffect(() => {
    dispatch({ type:"HYDRATE", payload:{
      teeth:          safeJsonParse("dentalOS_odontograma",     {}),
      teethEvolucion: safeJsonParse("dentalOS_odontograma_evo", {}),
      patientsList:   safeJsonParse("dentalOS_patients",        PATIENTS),
    }});
  }, []);

  // Persistencia
  useEffect(() => { safePersist("dentalOS_odontograma",     state.teeth);          }, [state.teeth]);
  useEffect(() => { safePersist("dentalOS_odontograma_evo", state.teethEvolucion); }, [state.teethEvolucion]);
  useEffect(() => { safePersist("dentalOS_patients",        state.patientsList);   }, [state.patientsList]);

  // Título
  useEffect(() => {
    const L = { dashboard:"Dashboard", agenda:"Agenda", expediente:"Historial", caja:"Finanzas", laboratorio:"Lab", reportes:"Analítica", whatsapp:"Chat IA", config:"Ajustes" };
    document.title = `DentalOS · ${L[state.view] ?? state.view}`;
  }, [state.view]);

  // Atajo ⌘K para búsqueda
  useEffect(() => {
    const handler = e => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); document.querySelector('input[type="search"]')?.focus(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // REGLA DE HOOKS: useMemo debe estar ANTES de cualquier return condicional.
  // Colocarlo después de "if (loading) return" viola las Rules of Hooks → Error #310.
  const ctxValue = useMemo(() => ({ state, dispatch, logout }), [state, dispatch, logout]);

  if (loading)  return <SplashScreen />;
  if (!session) return <Login onLogin={() => {}} />;

  return (
    <AppContext.Provider value={ctxValue}>

      {/* ── Fuentes + Reset + Keyframes ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
        html { font-size: 16px; }
        body {
          font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif;
          background: ${DS.bg};
          color: ${DS.text};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
        @keyframes viewIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes bounce {
          0%,100% { transform:translateY(0); opacity:0.4; }
          50%      { transform:translateY(-5px); opacity:1; }
        }
        @keyframes splashPulse {
          0%,100% { transform:scale(1);    box-shadow:0 8px 24px rgba(0,122,255,0.4); }
          50%      { transform:scale(1.06); box-shadow:0 12px 32px rgba(0,122,255,0.55); }
        }
        input[type="search"]::-webkit-search-cancel-button { display:none; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div style={{
        display: "flex",
        height: "100vh",
        background: DS.bg,
        overflow: "hidden",
        fontFamily: DS.fontText,
      }}>

        {/* ── Sidebar ── */}
        <Sidebar state={state} dispatch={dispatch} onLogout={logout} />

        {/* ── Área principal ── */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}>
          {/* Topbar del contenido */}
          <ContentTopBar state={state} dispatch={dispatch} />

          {/* Canvas de la vista */}
          <main
            role="main"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 28px 80px",
              background: DS.bg,
            }}
          >
            <div style={{ maxWidth: 1480, margin: "0 auto" }}>
              <ViewRouter state={state} dispatch={dispatch} />
            </div>
          </main>
        </div>

        {/* ── FAB ── */}
        <FAB onClick={() => dispatch({ type:"SET_VIEW", payload:{ view:"agenda" } })} />

      </div>
    </AppContext.Provider>
  );
}