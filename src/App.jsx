// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS — Shell Principal
// Arquitectura: Context + Reducer para estado global, lazy loading de vistas,
// memoización agresiva, separación de capas (data / UI / navigation).
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
// Cada vista se carga solo cuando el usuario la visita por primera vez.
const Dashboard   = lazy(() => import("./components/vistas/Dashboard"));
const Agenda      = lazy(() => import("./components/vistas/Agenda"));
const Expediente  = lazy(() => import("./components/vistas/Expediente"));
const Caja        = lazy(() => import("./components/vistas/Caja"));
const Laboratorio = lazy(() => import("./components/vistas/Laboratorio"));
const Reportes    = lazy(() => import("./components/vistas/Reportes"));
const WhatsApp    = lazy(() => import("./components/vistas/WhatsApp"));
const Config      = lazy(() => import("./components/vistas/Config"));

// ─── CONTEXTO GLOBAL ──────────────────────────────────────────────────────────
// Expone el estado de la app y los dispatchers a cualquier componente hijo
// sin prop-drilling.
export const AppContext = createContext(null);
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext debe usarse dentro de <AppProvider>");
  return ctx;
};

// ─── REDUCER DE ESTADO GLOBAL ─────────────────────────────────────────────────
const initialState = {
  view:         "dashboard",
  selectedPat:  null,
  subAccount:   "Sede Principal",
  teeth:        {},
  teethEvolucion: {},
  patientsList: [],
  globalSearch: "",
  notifCount:   3,
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.payload.view, selectedPat: action.payload.pat ?? state.selectedPat };
    case "SET_SUB_ACCOUNT":
      return { ...state, subAccount: action.payload };
    case "SET_TEETH":
      return { ...state, teeth: action.payload };
    case "SET_TEETH_EVOLUCION":
      return { ...state, teethEvolucion: action.payload };
    case "SET_PATIENTS":
      return { ...state, patientsList: action.payload };
    case "SET_GLOBAL_SEARCH":
      return { ...state, globalSearch: action.payload };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ─── HOOK: PERSISTENCIA EN LOCALSTORAGE ───────────────────────────────────────
function useLocalPersistence(key, value, setter, initial) {
  // Carga inicial desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setter(JSON.parse(stored));
    } catch (_) { /* ignora datos corruptos */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persiste cambios
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { /* quota exceeded: ignora silenciosamente */ }
  }, [key, value]);
}

// ─── HOOK: SESIÓN SUPABASE ────────────────────────────────────────────────────
function useSupabaseSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const logout = useCallback(() => supabase.auth.signOut(), []);

  return { session, loading, logout };
}

// ─── DEFINICIÓN DE NAVEGACIÓN ─────────────────────────────────────────────────
// Separado del JSX para facilitar futuras extensiones (permisos por rol, badges, etc.)
const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Inicio",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: "expediente",
    label: "Expediente",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "caja",
    label: "Finanzas",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: "laboratorio",
    label: "Lab",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" />
        <path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><line x1="5.52" y1="16" x2="18.48" y2="16" />
      </svg>
    ),
  },
  {
    id: "reportes",
    label: "Data",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "IA",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

// Mapa de rutas → componentes lazy para renderizado dinámico
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

// ─── COMPONENTE: NAV ITEM ─────────────────────────────────────────────────────
const NavItem = memo(({ item, isActive, onClick }) => (
  <button
    onClick={() => onClick(item.id)}
    aria-current={isActive ? "page" : undefined}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 18px",
      cursor: "pointer",
      borderRadius: 100,
      border: "none",
      background: isActive ? "#0F172A" : "transparent",
      color: isActive ? "#fff" : "#64748B",
      fontWeight: isActive ? 700 : 600,
      fontSize: 13,
      fontFamily: "inherit",
      transition: "background 0.25s ease, color 0.25s ease",
      outline: "none",
      whiteSpace: "nowrap",
    }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(15,23,42,0.06)"; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
  >
    <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{item.icon}</span>
    <span>{item.label}</span>
  </button>
));

// ─── COMPONENTE: TOPBAR ───────────────────────────────────────────────────────
const TopBar = memo(({ state, dispatch, onLogout }) => {
  const handleSearch = useCallback(
    e => dispatch({ type: "SET_GLOBAL_SEARCH", payload: e.target.value }),
    [dispatch]
  );

  const handleSubAccount = useCallback(
    e => dispatch({ type: "SET_SUB_ACCOUNT", payload: e.target.value }),
    [dispatch]
  );

  const goTo = useCallback(
    id => dispatch({ type: "SET_VIEW", payload: { view: id } }),
    [dispatch]
  );

  return (
    <header
      role="banner"
      style={{
        height: 72,
        padding: "0 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(255,255,255,0.45)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderBottom: "1px solid rgba(255,255,255,0.75)",
        zIndex: 100,
        flexShrink: 0,
        gap: 16,
      }}
    >
      {/* ── Marca + Selector sede ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", boxShadow: "0 4px 12px rgba(14,165,233,0.35)",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.5px", lineHeight: 1 }}>
            DentalOS
          </span>
        </div>

        {/* Divisor */}
        <div style={{ width: 1, height: 22, background: "rgba(15,23,42,0.1)", flexShrink: 0 }} />

        {/* Selector de sede */}
        <label
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.65)", padding: "7px 14px",
            borderRadius: 12, border: "1px solid rgba(255,255,255,0.85)",
            cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 7, height: 7, borderRadius: "50%", background: "#10b981",
              boxShadow: "0 0 0 2px rgba(16,185,129,0.2)", flexShrink: 0,
            }}
          />
          <select
            value={state.subAccount}
            onChange={handleSubAccount}
            aria-label="Seleccionar sede"
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 13, fontWeight: 700, color: "#475569",
              cursor: "pointer", WebkitAppearance: "none", MozAppearance: "none",
              fontFamily: "inherit",
            }}
          >
            <option value="Sede Principal">Sede Principal</option>
            <option value="Sucursal El Golf">Sucursal El Golf</option>
            <option value="Sucursal Miraflores">Sucursal Miraflores</option>
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </label>
      </div>

      {/* ── Píldora de navegación ── */}
      <nav
        aria-label="Navegación principal"
        style={{
          background: "rgba(255,255,255,0.65)", padding: "5px",
          borderRadius: 100, display: "flex", gap: 2,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          border: "1px solid rgba(255,255,255,0.85)",
          overflow: "hidden",
        }}
      >
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.id}
            item={item}
            isActive={state.view === item.id}
            onClick={goTo}
          />
        ))}
      </nav>

      {/* ── Búsqueda + Perfil ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {/* Buscador */}
        <div style={{ position: "relative", width: 200 }}>
          <svg
            style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94A3B8", pointerEvents: "none" }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={state.globalSearch}
            onChange={handleSearch}
            placeholder="Buscar..."
            aria-label="Búsqueda global"
            style={{
              width: "100%", padding: "9px 14px 9px 36px", borderRadius: 100,
              border: "1px solid rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.55)",
              fontSize: 13, outline: "none", boxSizing: "border-box",
              fontWeight: 500, color: "#0F172A", fontFamily: "inherit",
              transition: "background 0.2s",
            }}
            onFocus={e => { e.target.style.background = "rgba(255,255,255,0.9)"; }}
            onBlur={e => { e.target.style.background = "rgba(255,255,255,0.55)"; }}
          />
        </div>

        {/* Notificaciones */}
        <button
          aria-label={`Notificaciones — ${state.notifCount} sin leer`}
          style={{
            position: "relative", width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.85)", color: "#475569",
            outline: "none", transition: "background 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.9)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.65)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {state.notifCount > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute", top: 4, right: 4, width: 16, height: 16,
                borderRadius: "50%", background: "#EF4444", color: "#fff",
                fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center",
                justifyContent: "center", border: "2px solid #f4f7f9",
              }}
            >
              {state.notifCount}
            </span>
          )}
        </button>

        {/* Avatar / Logout */}
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          style={{
            width: 40, height: 40, borderRadius: "50%", padding: 0,
            background: "#E2E8F0 url(/drasolvargas.jpeg) center/cover no-repeat",
            cursor: "pointer", border: "2px solid rgba(255,255,255,0.9)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)", outline: "none",
            transition: "box-shadow 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
        />
      </div>
    </header>
  );
});

// ─── COMPONENTE: FALLBACK DE CARGA ────────────────────────────────────────────
const ViewSkeleton = () => (
  <div
    role="status"
    aria-label="Cargando vista..."
    style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.4 }}
  >
    <svg
      width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9"
      strokeWidth="2" strokeLinecap="round"
      style={{ animation: "spin 1s linear infinite" }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── COMPONENTE: ROUTER DE VISTAS ─────────────────────────────────────────────
// Renderiza solo la vista activa; el resto no se monta (ahorro de memoria).
// Para preservar estado de vistas ya visitadas, se puede cambiar a
// display:none en lugar de unmounting — aquí se hace unmounting intencionado
// porque el estado de cada vista se persiste en localStorage o en Context.
const ViewRouter = memo(({ state, dispatch }) => {
  const ActiveView = VIEW_MAP[state.view] ?? Dashboard;

  const viewProps = useMemo(() => {
    // Proporciona solo las props que cada vista necesita
    const base = {};
    if (state.view === "expediente") {
      base.teeth           = state.teeth;
      base.setTeeth        = (t) => dispatch({ type: "SET_TEETH", payload: t });
      base.teethEvolucion  = state.teethEvolucion;
      base.setTeethEvolucion = (t) => dispatch({ type: "SET_TEETH_EVOLUCION", payload: t });
    }
    if (state.view === "dashboard" || state.view === "expediente") {
      base.setView   = (v, p) => dispatch({ type: "SET_VIEW", payload: { view: v, pat: p } });
      base.setSelPat = (p)    => dispatch({ type: "SET_VIEW", payload: { view: state.view, pat: p } });
    }
    return base;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  return (
    <Suspense fallback={<ViewSkeleton />}>
      <ActiveView {...viewProps} />
    </Suspense>
  );
});

// ─── PROVEEDOR DE CONTEXTO ────────────────────────────────────────────────────
// Separa la lógica de provisión de contexto de la raíz del árbol.
function AppProvider({ children, state, dispatch, logout }) {
  const value = useMemo(() => ({ state, dispatch, logout }), [state, dispatch, logout]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── COMPONENTE RAÍZ ──────────────────────────────────────────────────────────
export default function App() {
  const { session, loading, logout } = useSupabaseSession();
  const [state, dispatch] = useReducer(appReducer, initialState);

  // ── Hidratación desde localStorage ────────────────────────────────────────
  useEffect(() => {
    const stored = {
      teeth:           safeJsonParse("dentalOS_odontograma",     {}),
      teethEvolucion:  safeJsonParse("dentalOS_odontograma_evo", {}),
      patientsList:    safeJsonParse("dentalOS_patients",        PATIENTS),
    };
    dispatch({ type: "HYDRATE", payload: stored });
  }, []);

  // ── Persistencia reactiva ─────────────────────────────────────────────────
  useEffect(() => { safePersist("dentalOS_odontograma",     state.teeth);          }, [state.teeth]);
  useEffect(() => { safePersist("dentalOS_odontograma_evo", state.teethEvolucion); }, [state.teethEvolucion]);
  useEffect(() => { safePersist("dentalOS_patients",        state.patientsList);   }, [state.patientsList]);

  // ── Sincronización de título de pestaña ───────────────────────────────────
  useEffect(() => {
    const labels = { dashboard: "Inicio", agenda: "Agenda", expediente: "Expediente", caja: "Finanzas", laboratorio: "Lab", reportes: "Data", whatsapp: "IA" };
    document.title = `DentalOS · ${labels[state.view] ?? state.view}`;
  }, [state.view]);

  if (loading) return <SplashScreen />;
  if (!session) return <Login onLogin={(s) => { /* session actualizada por el listener */ }} />;

  return (
    <AppProvider state={state} dispatch={dispatch} logout={logout}>
      <div
        style={{
          display: "flex", flexDirection: "column", height: "100vh",
          fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
          overflow: "hidden",
          background:
            "radial-gradient(circle at 12% 8%,  #dbeafe 0%, transparent 38%)," +
            "radial-gradient(circle at 88% 85%, #ede9fe 0%, transparent 38%)," +
            "radial-gradient(circle at 55% 50%, #f0fdf4 0%, transparent 50%)," +
            "#f1f5f9",
          color: "#0F172A",
        }}
      >
        {/* ── Barra superior ── */}
        <TopBar state={state} dispatch={dispatch} onLogout={logout} />

        {/* ── Área de contenido principal ── */}
        <main
          role="main"
          style={{
            flex: 1, padding: "20px 24px 24px",
            display: "flex", justifyContent: "center", overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: 1640,
              background: "rgba(255,255,255,0.62)",
              backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
              borderRadius: 28, border: "1px solid rgba(255,255,255,0.88)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.9) inset," +
                "0 24px 48px -12px rgba(0,0,0,0.05)," +
                "0 0 0 1px rgba(0,0,0,0.02)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
              <ViewRouter state={state} dispatch={dispatch} />
            </div>
          </div>
        </main>
      </div>
    </AppProvider>
  );
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function safeJsonParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) { return fallback; }
}

function safePersist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (_) { /* quota exceeded */ }
}

// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh",
        background: "linear-gradient(135deg, #f0f9ff 0%, #f5f3ff 100%)",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 52, height: 52, borderRadius: 16,
          background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", boxShadow: "0 8px 24px rgba(14,165,233,0.35)",
          animation: "pulse 1.8s ease-in-out infinite",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <span style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", letterSpacing: "-0.5px" }}>DentalOS</span>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}