// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS · Shell · Layout Taskk-style
// Sidebar izquierdo fijo con secciones · Header breadcrumb · FAB · Search
// Context + Reducer · Lazy views · Rules of Hooks 100% correctas
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useEffect, useReducer, useCallback,
  useMemo, lazy, Suspense, memo,
} from "react";
import { supabase } from "./supabase";
import Login from "./Login";
import MFAChallenge from "./MFAChallenge";
import { PATIENTS, GRAD_PRIMARY, GRAD_PRIMARY_SHADOW } from "./utils/constants";
import useResponsive from "./utils/useResponsive";
import useMetaWhatsApp from "./utils/useMetaWhatsApp";
import useClinic from "./utils/useClinic";
import useAAL from "./utils/useAAL";
import { BACKDROP_IMAGE_URL } from "./utils/backdrop";
import { AppContext } from "./utils/appContext";
import useSignedUrl from "./utils/useSignedUrl";
import { rutaPerfil } from "./utils/storage";

// ─── LAZY VIEWS ───────────────────────────────────────────────────────────────
const Dashboard   = lazy(() => import("./components/vistas/Dashboard"));
const Agenda      = lazy(() => import("./components/vistas/Agenda"));
const Expediente  = lazy(() => import("./components/vistas/Expediente"));
const Ortodoncia  = lazy(() => import("./components/vistas/Ortodoncia"));
const Caja        = lazy(() => import("./components/vistas/Caja"));
const Laboratorio = lazy(() => import("./components/vistas/Laboratorio"));
const Reportes    = lazy(() => import("./components/vistas/Reportes"));
const AsistenteDatos = lazy(() => import("./components/vistas/AsistenteDatos"));
const Config      = lazy(() => import("./components/vistas/Config"));

// ─── FONDO DECORATIVO (glassmorphism) ─────────────────────────────────────────
// Compartido con Login.jsx vía utils/backdrop.js (evita import circular App<->Login).

// Riel de navegación: grafito oscuro, el mismo primario que ya usan los botones.
// El violeta del referente de diseño no se usa acá a propósito -- está reservado
// para la serie "Ingresos" de los gráficos, y repetirlo como color de marca haría
// que el mismo color signifique dos cosas distintas en la misma pantalla.
const GRAD_SIDEBAR = "linear-gradient(170deg, #2f2f33 0%, #1c1c1f 100%)";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  // Fondos. El sidebar ya no es de vidrio claro (ver GRAD_SIDEBAR), así que
  // sidebarBg/cardBg/activeBg se quitaron al quedar sin uso.
  pageBg:      "#e1e4e1",
  hoverBg:     "rgba(15,23,42,0.05)",
  glassBlur:   "blur(26px) saturate(180%)",
  glassBorder: "1px solid rgba(255,255,255,0.75)",
  glassShadow: "0 12px 40px rgba(30,35,33,0.14)",
  // Texto
  ink:         "#111827",
  inkMid:      "#4B5563",
  inkMute:     "#9CA3AF",
  inkFaint:    "#D1D5DB",
  // Acento
  brand:       "#404040",
  brandHov:    "#262626",
  brandSoft:   "#f1f1f0",
  brandText:   "#262626",
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
// El riel arranca colapsado (solo iconos) en cualquier tamaño de pantalla: es la
// forma en que se diseñó. El nombre de cada sección aparece en el tooltip, y el
// botón de abajo lo expande con etiquetas cuando hace falta. No se persiste, así
// que cada carga vuelve al riel angosto.
const INIT = {
  view: "dashboard", selectedPat: null, subAccount: "Sede Principal",
  teeth: {}, teethEvolucion: {}, patientsList: [],
  globalSearch: "", notifCount: 3,
  sidebarCollapsed: true,
};

function reducer(st, action) {
  switch (action.type) {
    // `selectedPat` es un argumento de navegación, no estado que se arrastra:
    // quien navega sin indicar paciente (el menú, por ejemplo) llega sin
    // ninguno abierto. Si se conservara, entrar al Historial desde el menú
    // reabriría solo al último paciente que se vio desde otra vista.
    case "SET_VIEW":        return { ...st, view: action.payload.view, selectedPat: action.payload.pat ?? null };
    case "SET_SUB_ACCOUNT": return { ...st, subAccount: action.payload };
    case "SET_TEETH": {
      // SOLUCIÓN: Si payload es una función, la ejecutamos pasando el estado anterior
      const newTeeth = typeof action.payload === 'function' ? action.payload(st.teeth) : action.payload;
      return { ...st, teeth: newTeeth };
    }
    case "SET_TEETH_EVO": {
      // SOLUCIÓN: Igual para evolución
      const newTeethEvo = typeof action.payload === 'function' ? action.payload(st.teethEvolucion) : action.payload;
      return { ...st, teethEvolucion: newTeethEvo };
    }
    case "SET_PATIENTS":    return { ...st, patientsList: action.payload };
    case "SET_SEARCH":      return { ...st, globalSearch: action.payload };
    case "TOGGLE_SIDEBAR":  return { ...st, sidebarCollapsed: !st.sidebarCollapsed };
    case "SET_SIDEBAR":     return { ...st, sidebarCollapsed: action.payload };
    case "HYDRATE":         return { ...st, ...action.payload };
    default:                return st;
  }
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
const jp = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const sp = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento no disponible (privado/cuota llena) — se ignora */ } };

// Claves de localStorage con datos clínicos (odontogramas y lista de pacientes).
// Se borran al cerrar sesión y al detectar otro usuario: en la computadora
// compartida de recepción, si no, el siguiente en entrar —incluso de otra
// clínica— se queda con los datos del anterior.
const CLAVES_PHI = ["dentalOS_odontograma", "dentalOS_odontograma_evo", "dentalOS_patients"];
const limpiarPHILocal = () => {
  try { CLAVES_PHI.forEach(k => localStorage.removeItem(k)); } catch { /* almacenamiento no disponible */ }
};
const USER_KEY = "dentalOS_ultimo_usuario";

// ─── HOOK SESIÓN ──────────────────────────────────────────────────────────────
function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, s) => {
      // Al salir, o si entra un usuario distinto al de la sesión anterior en
      // este navegador, se descartan los datos clínicos cacheados.
      const anterior = (() => { try { return localStorage.getItem(USER_KEY); } catch { return null; } })();
      if (evento === "SIGNED_OUT" || (s?.user?.id && anterior && anterior !== s.user.id)) limpiarPHILocal();
      try {
        if (s?.user?.id) localStorage.setItem(USER_KEY, s.user.id);
        else localStorage.removeItem(USER_KEY);
      } catch { /* almacenamiento no disponible */ }
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    limpiarPHILocal();
    // Recarga completa a propósito: borrar localStorage no alcanza, porque el
    // odontograma y la lista de pacientes siguen en el estado de React. Sin
    // esto, quien inicie sesión después en el mismo equipo los seguiría viendo.
    window.location.reload();
  }, []);
  return { session, loading, logout };
}

// ─── MAPA DE VISTAS ───────────────────────────────────────────────────────────
const VIEWS = {
  dashboard: Dashboard, agenda: Agenda, expediente: Expediente,
  caja: Caja, laboratorio: Laboratorio, reportes: Reportes,
  ortodoncia: Ortodoncia, whatsapp: AsistenteDatos, config: Config,
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
      { id: "ortodoncia",  label: "Ortodoncia" },
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
  ortodoncia: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><circle cx="12" cy="12" r="10"/></svg>,
  reportes:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  whatsapp:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  config:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
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
  ortodoncia: "Ortodoncia", whatsapp: "Chat IA", config: "Ajustes",
};

// ─── COMPONENTE: SIDEBAR ITEM ─────────────────────────────────────────────────
// Vive sobre el riel oscuro, así que los colores van invertidos: el item activo
// es una pastilla blanca (no una barra lateral fina) y el inactivo es blanco
// translúcido. Colapsado usa el `title` nativo para el label en vez de un
// tooltip propio: el riel necesita `overflow` recortado para el scroll y un
// tooltip absoluto quedaría cortado.
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
        position: "relative",
        width: collapsed ? 42 : "100%", height: 42,
        margin: collapsed ? "0 auto" : 0,
        display: "flex", alignItems: "center",
        gap: 11,
        padding: collapsed ? 0 : "0 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: 13,
        border: "none",
        background: isActive ? "#fff" : hov ? "rgba(255,255,255,0.13)" : "transparent",
        color: isActive ? C.ink : hov ? "#fff" : "rgba(255,255,255,0.66)",
        fontFamily: C.font, fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        cursor: "pointer", outline: "none",
        transition: "background 0.14s, color 0.14s",
        letterSpacing: "-0.1px",
        flexShrink: 0,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, flexShrink: 0 }}>
        {IC[item.id]}
      </span>

      {/* Colapsado no hay lugar para la píldora del badge: se reduce a un punto,
          que igual comunica "acá hay algo distinto". */}
      {collapsed && item.badge && (
        <span style={{
          position: "absolute", top: 7, right: 7,
          width: 6, height: 6, borderRadius: "50%",
          background: C.green,
          border: `1.5px solid ${isActive ? "#fff" : "#26262a"}`,
        }} />
      )}

      {!collapsed && (
        <>
          <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{item.label}</span>
          {item.badge && (
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.3px",
              padding: "2px 6px", borderRadius: 100,
              background: isActive ? C.ink : "rgba(255,255,255,0.18)",
              color: "#fff",
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
const Sidebar = memo(({ state, dispatch, onLogout, clinica, session }) => {
  const { sidebarCollapsed: col, view } = state;
  // El bucket es privado: el logo se sirve con una URL firmada, no con la
  // pública que quedó guardada en clinicas.logo_url.
  const logoUrl = useSignedUrl(clinica?.logo_url);
  // Antes decía "Dra. Sol Vargas" fijo en el código — cualquier cuenta que
  // entrara veía ese mismo nombre. Se muestra el nombre real de la sesión
  // (o el correo si todavía no lo configuró en Mi perfil), y la foto de
  // perfil de SU clínica (nunca la de otra).
  const nombreUsuario = session?.user?.user_metadata?.full_name || session?.user?.email || "Usuario";
  const avatarUrl = useSignedUrl(clinica?.id ? rutaPerfil(clinica.id) : null);
  const goTo   = useCallback(id => dispatch({ type: "SET_VIEW",       payload: { view: id } }), [dispatch]);
  const toggle = useCallback(()  => dispatch({ type: "TOGGLE_SIDEBAR" }), [dispatch]);
  const W = col ? 68 : 226;

  return (
    <aside style={{
      width: W, minWidth: W,
      height: "calc(100vh - 26px)",
      margin: "13px 0",
      display: "flex", flexDirection: "column",
      background: GRAD_SIDEBAR,
      // Pegado al borde izquierdo y curvo sólo del lado interno: el contenido
      // "envuelve" el riel en vez de que el riel sea una tarjeta más.
      borderRadius: "0 30px 30px 0",
      boxShadow: "0 18px 44px rgba(15,23,42,0.22)",
      transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
      overflow: "hidden", flexShrink: 0, zIndex: 100,
    }}>

      {/* ── Logo ── */}
      <div style={{
        height: 58, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: col ? 0 : "0 14px",
        justifyContent: col ? "center" : "flex-start",
        gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: logoUrl ? "transparent" : "rgba(255,255,255,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", flexShrink: 0, overflow: "hidden",
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt={clinica?.nombre || "Logo del consultorio"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          )}
        </div>
        {!col && (
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {clinica?.nombre || "DentalOS"}
          </span>
        )}
      </div>

      {/* ── Secciones de Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: col ? "6px 0" : "4px 10px" }}>
        {SIDEBAR_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: col ? 10 : 6 }}>
            {section.label && !col && (
              <div style={{
                fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.4)",
                letterSpacing: "0.7px", textTransform: "uppercase",
                padding: "12px 12px 6px",
              }}>
                {section.label}
              </div>
            )}
            {/* Colapsado no hay espacio para el rótulo: una línea fina hace de separador. */}
            {section.label && col && si > 0 && (
              <div style={{ height: 1, background: "rgba(255,255,255,0.13)", margin: "0 16px 10px" }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: col ? 5 : 3 }}>
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

      {/* ── Footer: usuario + colapsar ── */}
      <div style={{ padding: col ? "10px 13px" : 10, flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div
          onClick={onLogout}
          title={`${nombreUsuario} — cerrar sesión`}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: col ? 0 : "7px 8px",
            height: 42,
            justifyContent: col ? "center" : "flex-start",
            borderRadius: 13, cursor: "pointer", transition: "background 0.14s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : "rgba(255,255,255,0.18)",
            border: "1.5px solid rgba(255,255,255,0.28)", flexShrink: 0,
          }} />
          {!col && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {nombreUsuario}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Cerrar sesión</div>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          aria-label={col ? "Expandir menú" : "Colapsar menú"}
          title={col ? "Expandir menú" : "Colapsar menú"}
          style={{
            width: "100%", height: 30, marginTop: 6,
            borderRadius: 10, border: "none",
            background: "rgba(255,255,255,0.09)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.6)", outline: "none",
            transition: "background 0.14s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
        >
          {col ? IC.chevRight : IC.chevLeft}
        </button>
      </div>
    </aside>
  );
});

// ─── COMPONENTE: BUSCADOR GLOBAL ──────────────────────────────────────────────
// Antes el buscador guardaba texto en el estado y NADA lo leía -- era decorativo,
// igual que el hint "/" del teclado. Ahora busca pacientes de verdad por nombre o
// documento y abre su historial. El RLS acota el resultado a la propia clínica,
// así que no hace falta filtrar por clinica_id acá.
const BuscadorGlobal = memo(({ valor, onCambio, onAbrirPaciente }) => {
  // Se guarda la consulta JUNTO a sus resultados: si sólo se guardaran los
  // resultados, al reescribir se mostrarían los de la búsqueda anterior hasta
  // que llegara la nueva.
  const [res, setRes] = useState({ q: "", items: [] });
  const [abierto, setAbierto] = useState(false);
  const cajaRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // El atajo "/" que el teclado ya prometía en la UI.
  useEffect(() => {
    const alTeclear = (e) => {
      const enCampo = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (e.key === "/" && !enCampo) { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, []);

  useEffect(() => {
    const alApretar = (e) => { if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false); };
    window.addEventListener("mousedown", alApretar);
    return () => window.removeEventListener("mousedown", alApretar);
  }, []);

  useEffect(() => {
    const texto = (valor || "").trim();
    if (texto.length < 2) return;
    let vivo = true;
    // Toda la escritura de estado ocurre dentro del timeout, nunca en el cuerpo
    // del efecto: así no se disparan renders en cascada. La espera además evita
    // una consulta por cada tecla.
    const t = setTimeout(async () => {
      // Se limpian comas y paréntesis: tienen significado especial en el filtro
      // .or() de PostgREST.
      const limpio = texto.replace(/[,()]/g, "").slice(0, 60);
      const { data } = await supabase
        .from("pacientes")
        .select("id, name, doc, phone, treatment")
        .or(`name.ilike.%${limpio}%,doc.ilike.%${limpio}%`)
        .limit(6);
      if (!vivo) return;
      setRes({ q: texto, items: data || [] });
      setAbierto(true);
    }, 220);
    return () => { vivo = false; clearTimeout(t); };
  }, [valor]);

  const texto = (valor || "").trim();
  const hayTexto = texto.length >= 2;
  // Sólo se muestran resultados que correspondan al texto actual.
  const buscando = hayTexto && res.q !== texto;
  const resultados = buscando ? [] : res.items;

  return (
    <div ref={cajaRef} style={{ position: "relative", flex: 1, maxWidth: 430, minWidth: 0 }}>
      <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: C.inkMute, display: "flex", pointerEvents: "none" }}>
        {IC.search}
      </span>
      <input
        ref={inputRef}
        type="search"
        value={valor}
        onChange={e => onCambio(e.target.value)}
        onFocus={() => { if (hayTexto) setAbierto(true); }}
        placeholder="Buscar paciente por nombre o documento…"
        style={{
          width: "100%", padding: "9px 34px 9px 36px",
          borderRadius: 12, border: `1px solid ${C.border}`,
          background: "#fff", fontSize: 13,
          fontFamily: C.font, color: C.ink, outline: "none",
          transition: "border-color 0.12s, box-shadow 0.12s",
        }}
        onMouseEnter={e => { e.target.style.borderColor = C.borderStrong; }}
        onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderColor = C.border; }}
      />
      <kbd style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        fontSize: 10, color: C.inkMute, fontFamily: C.fontMono,
        background: C.brandSoft, padding: "2px 6px", borderRadius: 5,
        pointerEvents: "none",
      }}>
        /
      </kbd>

      {abierto && hayTexto && (
        <div style={{
          position: "absolute", top: "calc(100% + 7px)", left: 0, right: 0,
          background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`,
          boxShadow: "0 18px 40px rgba(15,23,42,0.16)", overflow: "hidden", zIndex: 200,
        }}>
          {buscando && <div style={{ padding: "14px 15px", fontSize: 12, color: C.inkMute }}>Buscando…</div>}
          {!buscando && resultados.length === 0 && (
            <div style={{ padding: "14px 15px", fontSize: 12, color: C.inkMute }}>Ningún paciente coincide.</div>
          )}
          {!buscando && resultados.map(p => (
            <div
              key={p.id}
              onClick={() => { onAbrirPaciente(p); setAbierto(false); onCambio(""); }}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.brandSoft}` }}
              onMouseEnter={e => { e.currentTarget.style.background = C.brandSoft; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: C.brandSoft,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10.5, fontWeight: 700, color: C.ink, flexShrink: 0,
              }}>
                {(p.name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: C.inkMute }}>
                  DNI {p.doc || "—"}{p.treatment ? ` · ${p.treatment}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 11, color: C.inkMute, flexShrink: 0 }}>abrir →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── COMPONENTE: HEADER SUPERIOR ──────────────────────────────────────────────
const TopHeader = memo(({ state, dispatch, onLogout, clinica, onAbrirPaciente }) => {
  const label = VIEW_LABELS[state.view] ?? state.view;
  // Mismo motivo que en el Sidebar: antes era una foto fija, ajena a quién
  // tuviera la sesión abierta.
  const avatarUrl = useSignedUrl(clinica?.id ? rutaPerfil(clinica.id) : null);

  return (
    <header style={{
      height: 62,
      display: "flex", alignItems: "center",
      padding: "0 4px 0 22px",
      gap: 16, flexShrink: 0, zIndex: 90, position: "relative",
    }}>
      {/* Título de la vista */}
      <span style={{ fontSize: 17, fontWeight: 700, color: C.ink, fontFamily: C.font, letterSpacing: "-0.4px", flexShrink: 0 }}>
        {label}
      </span>

      {/* Buscador global */}
      <BuscadorGlobal
        valor={state.globalSearch}
        onCambio={v => dispatch({ type: "SET_SEARCH", payload: v })}
        onAbrirPaciente={onAbrirPaciente}
      />

      {/* Grupo derecho */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: "auto" }}>

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
            background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : C.brandSoft,
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

const ViewRouter = memo(({ state, dispatch, clinicaId, clinica, clinicaRol, clinicaLoading, refrescarClinica }) => {
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
  // clinicaId: toda vista que inserte/lea datos de clínica lo necesita para
  // cumplir con el RLS "clinic_isolation" recién aplicado en Supabase.
  const viewProps = {
    setView,
    setSelPat,
    patientsList: state.patientsList,
    setPatientsList,
    clinicaId,
    clinica,
    clinicaRol,
    clinicaLoading,
    refrescarClinica,
  };

  // 3. Vistas que pueden abrirse "en" un paciente concreto: reciben con quién
  // las abrieron, para no obligar a buscarlo de nuevo a mano. Ortodoncia e
  // Historial se enlazan mutuamente con esto.
  if (currentViewKey === "expediente" || currentViewKey === "ortodoncia") {
    viewProps.patient = state.selectedPat;
  }

  // 4. Props específicas del Expediente Clínico (Historia)
  if (currentViewKey === "expediente") {
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
  const { currentLevel: aalActual, nextLevel: aalSiguiente, loading: aalLoading } = useAAL(session);
  const [state, dispatch] = useReducer(reducer, INIT);
  const { isTablet } = useResponsive();
  const { clinicaId, clinica, rol: clinicaRol, loading: clinicaLoading, refrescar: refrescarClinica } = useClinic();
  const { handleOAuthCallback: handleMetaWhatsAppCallback } = useMetaWhatsApp(clinicaId);

  // Colapsa el sidebar automáticamente al cruzar a ancho de iPad o menor.
  // No pelea con un re-expandido manual del usuario mientras siga en ese ancho
  // (el efecto solo se dispara cuando isTablet cambia de valor, no en cada render).
  useEffect(() => {
    if (isTablet) dispatch({ type: "SET_SIDEBAR", payload: true });
  }, [isTablet]);

  // Si Meta acaba de redirigir aquí tras el OAuth de WhatsApp Business
  // (?code=...), procesa la conexión y regresa a Ajustes. Espera a que
  // useClinic() resuelva la clínica (clinica_id es obligatorio al guardar).
  useEffect(() => {
    if (clinicaLoading) return;
    handleMetaWhatsAppCallback().then(returnView => {
      if (returnView) dispatch({ type: "SET_VIEW", payload: { view: returnView } });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicaLoading]);

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
  if (aalLoading) return <Splash />;
  // El usuario tiene un factor MFA verificado (nextLevel llegaría a 'aal2') pero
  // esta sesión todavía está en 'aal1' — se acaba de loguear solo con su
  // contraseña. Se lo intercepta antes de dejarlo entrar a la app.
  if (aalSiguiente === "aal2" && aalActual !== "aal2") return <MFAChallenge onLogout={logout} />;

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
        <Sidebar state={state} dispatch={dispatch} onLogout={logout} clinica={clinica} session={session} />

        {/* Columna derecha */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, position: "relative", zIndex: 1 }}>
          {/* Header: título de vista + buscador + acciones */}
          <TopHeader
            state={state} dispatch={dispatch} onLogout={logout} clinica={clinica}
            onAbrirPaciente={p => dispatch({ type: "SET_VIEW", payload: { view: "expediente", pat: p } })}
          />

          {/* Contenido */}
          <main role="main" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: isTablet ? "4px 14px 32px" : "4px 22px 44px", background: "transparent" }}>
            <div style={{ maxWidth: 1480, margin: "0 auto" }}>
              <ViewRouter state={state} dispatch={dispatch} clinicaId={clinicaId} clinica={clinica} clinicaRol={clinicaRol} clinicaLoading={clinicaLoading} refrescarClinica={refrescarClinica} />
            </div>
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}