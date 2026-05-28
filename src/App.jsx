// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS — Shell Principal · Estética heal.me
// Topbar limpio con nav centrada tipo píldora, fondo #F8FAFC, sin sidebar.
// Arquitectura: Context + Reducer, lazy views, memoización, custom hooks.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  useMemo,
  createContext,
  useContext,
  lazy,
  Suspense,
  memo,
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
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext debe usarse dentro de <App>");
  return ctx;
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
const initialState = {
  view:             "dashboard",
  selectedPat:      null,
  subAccount:       "Sede Principal",
  teeth:            {},
  teethEvolucion:   {},
  patientsList:     [],
  globalSearch:     "",
  notifCount:       3,
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.payload.view, selectedPat: action.payload.pat ?? state.selectedPat };
    case "SET_SUB_ACCOUNT":
      return { ...state, subAccount: action.payload };
    case "SET_TEETH":
      return { ...state, teeth: action.payload };
    case "SET_TEETH_EVO":
      return { ...state, teethEvolucion: action.payload };
    case "SET_PATIENTS":
      return { ...state, patientsList: action.payload };
    case "SET_SEARCH":
      return { ...state, globalSearch: action.payload };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function safeJsonParse(key, fallback) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : fallback;
  } catch { return fallback; }
}
function safePersist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
}

// ─── HOOK: SESION SUPABASE ────────────────────────────────────────────────────
function useSupabaseSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  const logout = useCallback(() => supabase.auth.signOut(), []);
  return { session, loading, logout };
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const D = {
  bg:          "#F8FAFC",
  surface:     "#FFFFFF",
  surfaceAlt:  "#F1F5F9",
  border:      "rgba(0,0,0,0.07)",
  borderMid:   "rgba(0,0,0,0.11)",
  text:        "#0F172A",
  textMid:     "#475569",
  textMute:    "#94A3B8",
  accent:      "#6366F1",
  accentSoft:  "#EEF2FF",
  accentText:  "#4338CA",
  success:     "#10B981",
  danger:      "#EF4444",
  font:        "'DM Sans', 'Plus Jakarta Sans', system-ui, sans-serif",
};

// ─── NAVEGACION ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    id: "dashboard", label: "Dashboard",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  },
  {
    id: "agenda", label: "Agenda",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: "expediente", label: "Historial",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },
  {
    id: "caja", label: "Finanzas",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  {
    id: "laboratorio", label: "Lab",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>,
  },
  {
    id: "reportes", label: "Actividad",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
  {
    id: "whatsapp", label: "IA",
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
];

const VIEW_MAP = {
  dashboard:   Dashboard,
  agenda:      Agenda,
  expediente:  Expediente,
  caja:        Caja,
  laboratorio: Laboratorio,
  reportes:    Reportes,
  whatsapp:    WhatsApp,
  config:      Config,
};

// ─── COMPONENTE: SPINNER ──────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", minHeight:240 }}>
    <div style={{ width:26, height:26, borderRadius:"50%", border:`2.5px solid ${D.accentSoft}`, borderTopColor:D.accent, animation:"spin 0.65s linear infinite" }} />
  </div>
);

// ─── COMPONENTE: NAV PILL ─────────────────────────────────────────────────────
const NavPill = memo(({ item, isActive, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => onClick(item.id)}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:6,
        padding:"7px 16px", borderRadius:100, border:"none",
        cursor:"pointer", fontFamily:D.font, fontSize:13,
        fontWeight: isActive ? 600 : 500,
        background: isActive ? D.text : hov ? D.surfaceAlt : "transparent",
        color: isActive ? "#fff" : D.textMid,
        transition:"background 0.16s, color 0.16s",
        outline:"none", whiteSpace:"nowrap",
      }}
    >
      <span style={{ display:"flex", alignItems:"center", opacity: isActive ? 1 : 0.65 }}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );
});

// ─── COMPONENTE: ICONO TOPBAR ─────────────────────────────────────────────────
const TopbarIconBtn = memo(({ children, label, badge, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", width:36, height:36, borderRadius:"50%",
        border:`1px solid ${D.border}`,
        background: hov ? D.surfaceAlt : D.surface,
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", color:D.textMid, outline:"none",
        transition:"background 0.15s", flexShrink:0,
      }}
    >
      {children}
      {badge > 0 && (
        <span aria-hidden="true" style={{
          position:"absolute", top:1, right:1,
          width:15, height:15, borderRadius:"50%",
          background:D.danger, color:"#fff", fontSize:9, fontWeight:700,
          display:"flex", alignItems:"center", justifyContent:"center",
          border:`2px solid ${D.surface}`, fontFamily:D.font,
        }}>
          {badge}
        </span>
      )}
    </button>
  );
});

// ─── COMPONENTE: TOPBAR ───────────────────────────────────────────────────────
const TopBar = memo(({ state, dispatch, onLogout }) => {
  const goTo = useCallback(id => dispatch({ type:"SET_VIEW", payload:{ view:id } }), [dispatch]);
  return (
    <header style={{
      height:62, display:"flex", alignItems:"center",
      background:D.surface, borderBottom:`1px solid ${D.border}`,
      padding:"0 24px", zIndex:100, flexShrink:0, gap:16,
    }}>

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0, minWidth:140 }}>
        <div style={{
          width:30, height:30, borderRadius:9, background:D.accent,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:"#fff", flexShrink:0, boxShadow:"0 2px 8px rgba(99,102,241,0.28)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span style={{ fontSize:16, fontWeight:700, color:D.text, letterSpacing:"-0.3px", fontFamily:D.font }}>
          DentalOS
        </span>
      </div>

      {/* Nav central */}
      <nav aria-label="Navegación principal" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
        {NAV_ITEMS.map(item => (
          <NavPill key={item.id} item={item} isActive={state.view === item.id} onClick={goTo} />
        ))}
      </nav>

      {/* Zona derecha */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0, minWidth:140, justifyContent:"flex-end" }}>

        {/* Buscador */}
        <div style={{ position:"relative" }}>
          <svg style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:D.textMute, pointerEvents:"none" }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={state.globalSearch}
            onChange={e => dispatch({ type:"SET_SEARCH", payload:e.target.value })}
            placeholder="Buscar..."
            aria-label="Búsqueda global"
            style={{
              width:155, padding:"8px 12px 8px 30px",
              border:`1px solid ${D.border}`, borderRadius:100,
              background:D.surfaceAlt, fontSize:13, fontFamily:D.font,
              color:D.text, outline:"none", transition:"border-color 0.15s, width 0.2s ease",
            }}
            onFocus={e => { e.target.style.borderColor=D.accent; e.target.style.width="195px"; }}
            onBlur={e  => { e.target.style.borderColor=D.border; e.target.style.width="155px"; }}
          />
        </div>

        {/* Config */}
        <TopbarIconBtn label="Configuración" onClick={() => dispatch({ type:"SET_VIEW", payload:{ view:"config" } })}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </TopbarIconBtn>

        {/* Notificaciones */}
        <TopbarIconBtn label={`${state.notifCount} notificaciones`} badge={state.notifCount}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </TopbarIconBtn>

        {/* Avatar */}
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          style={{
            width:34, height:34, borderRadius:"50%", padding:0,
            background:`${D.accentSoft} url(/drasolvargas.jpeg) center/cover no-repeat`,
            cursor:"pointer", border:`2px solid ${D.accentSoft}`,
            outline:"none", flexShrink:0, transition:"border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor=D.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor=D.accentSoft; }}
        />
      </div>
    </header>
  );
});

// ─── COMPONENTE: BANDA DE SEDE ────────────────────────────────────────────────
const SubAccountBand = memo(({ state, dispatch }) => {
  const today = useMemo(() =>
    new Date().toLocaleDateString("es-PE", { weekday:"long", year:"numeric", month:"long", day:"numeric" })
  , []);

  return (
    <div style={{
      height:38, display:"flex", alignItems:"center",
      justifyContent:"space-between", padding:"0 28px",
      background:D.surface, borderBottom:`1px solid ${D.border}`, flexShrink:0,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <span style={{
          width:7, height:7, borderRadius:"50%", background:D.success,
          boxShadow:"0 0 0 2.5px rgba(16,185,129,0.15)",
          display:"inline-block", flexShrink:0,
        }} />
        <select
          value={state.subAccount}
          onChange={e => dispatch({ type:"SET_SUB_ACCOUNT", payload:e.target.value })}
          aria-label="Seleccionar sede"
          style={{
            border:"none", outline:"none", background:"transparent",
            fontSize:12, fontWeight:600, color:D.textMid,
            cursor:"pointer", fontFamily:D.font,
            appearance:"none", WebkitAppearance:"none", MozAppearance:"none",
          }}
        >
          <option value="Sede Principal">Sede Principal</option>
          <option value="Sucursal El Golf">Sucursal El Golf</option>
          <option value="Sucursal Miraflores">Sucursal Miraflores</option>
        </select>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={D.textMute} strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <span style={{ fontSize:12, color:D.textMute, fontWeight:500, textTransform:"capitalize" }}>
        {today}
      </span>
    </div>
  );
});

// ─── COMPONENTE: ROUTER DE VISTAS ─────────────────────────────────────────────
const ViewRouter = memo(({ state, dispatch }) => {
  const ActiveView = VIEW_MAP[state.view] ?? Dashboard;

  const viewProps = useMemo(() => {
    const base = {};
    if (state.view === "expediente") {
      base.teeth              = state.teeth;
      base.setTeeth           = t => dispatch({ type:"SET_TEETH",    payload:t });
      base.teethEvolucion     = state.teethEvolucion;
      base.setTeethEvolucion  = t => dispatch({ type:"SET_TEETH_EVO", payload:t });
    }
    if (["dashboard","expediente"].includes(state.view)) {
      base.setView   = (v, p) => dispatch({ type:"SET_VIEW", payload:{ view:v, pat:p } });
      base.setSelPat = p      => dispatch({ type:"SET_VIEW", payload:{ view:state.view, pat:p } });
    }
    return base;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  return (
    <Suspense fallback={<Spinner />}>
      <ActiveView {...viewProps} />
    </Suspense>
  );
});

// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", height:"100vh", background:D.bg, gap:16,
      fontFamily:D.font,
    }}>
      <div style={{
        width:48, height:48, borderRadius:14, background:D.accent,
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#fff", boxShadow:"0 4px 16px rgba(99,102,241,0.32)",
        animation:"pulse 1.6s ease-in-out infinite",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span style={{ fontSize:20, fontWeight:700, color:D.text, letterSpacing:"-0.3px" }}>DentalOS</span>
      <Spinner />
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const { session, loading, logout } = useSupabaseSession();
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Hidratación
  useEffect(() => {
    dispatch({
      type: "HYDRATE",
      payload: {
        teeth:          safeJsonParse("dentalOS_odontograma",     {}),
        teethEvolucion: safeJsonParse("dentalOS_odontograma_evo", {}),
        patientsList:   safeJsonParse("dentalOS_patients",        PATIENTS),
      },
    });
  }, []);

  // Persistencia reactiva
  useEffect(() => { safePersist("dentalOS_odontograma",     state.teeth);          }, [state.teeth]);
  useEffect(() => { safePersist("dentalOS_odontograma_evo", state.teethEvolucion); }, [state.teethEvolucion]);
  useEffect(() => { safePersist("dentalOS_patients",        state.patientsList);   }, [state.patientsList]);

  // Título de pestaña
  useEffect(() => {
    const labels = { dashboard:"Dashboard", agenda:"Agenda", expediente:"Historial", caja:"Finanzas", laboratorio:"Lab", reportes:"Actividad", whatsapp:"IA", config:"Configuración" };
    document.title = `DentalOS · ${labels[state.view] ?? state.view}`;
  }, [state.view]);

  if (loading)  return <SplashScreen />;
  if (!session) return <Login onLogin={() => {}} />;

  const ctxValue = useMemo(() => ({ state, dispatch, logout }), [state, dispatch, logout]);

  return (
    <AppContext.Provider value={ctxValue}>

      {/* Fuentes + reset + animaciones globales */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #F8FAFC;
          color: #0F172A;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.11); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.20); }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .view-enter { animation: fadeSlideUp 0.22s cubic-bezier(0.23, 1, 0.32, 1) forwards; }

        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
      `}</style>

      <div style={{
        display:"flex", flexDirection:"column", height:"100vh",
        fontFamily:"'DM Sans', system-ui, sans-serif",
        background:D.bg, color:D.text, overflow:"hidden",
      }}>
        {/* 1. Topbar */}
        <TopBar state={state} dispatch={dispatch} onLogout={logout} />

        {/* 2. Contenido */}
        <main role="main" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <SubAccountBand state={state} dispatch={dispatch} />
          <div
            key={state.view}
            className="view-enter"
            style={{ flex:1, overflowY:"auto", padding:"28px 28px 40px" }}
          >
            <ViewRouter state={state} dispatch={dispatch} />
          </div>
        </main>
      </div>

    </AppContext.Provider>
  );
}