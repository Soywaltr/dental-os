// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS · Shell
// Panel de navegación blanco flotante, colapsable a riel de íconos · pill suave
// para el ítem activo y subsecciones colgando de una línea conectora · Ajustes
// y "Contraer" al pie · Header con título, buscador global y perfil ·
// Context + Reducer · Lazy views
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
import useContadoresNav from "./utils/useContadoresNav";
import { AppContext } from "./utils/appContext";
import useSignedUrl from "./utils/useSignedUrl";
import NavIcon from "./components/ui/NavIcons";
import { aplicarTema } from "./utils/theme";
import { rutaPerfil } from "./utils/storage";

// ─── LAZY VIEWS ───────────────────────────────────────────────────────────────
const Dashboard   = lazy(() => import("./components/vistas/Dashboard"));
const Agenda      = lazy(() => import("./components/vistas/Agenda"));
const Expediente  = lazy(() => import("./components/vistas/Expediente"));
const Ortodoncia  = lazy(() => import("./components/vistas/Ortodoncia"));
const Caja        = lazy(() => import("./components/vistas/Caja"));
const Laboratorio = lazy(() => import("./components/vistas/Laboratorio"));
const AsistenteDatos = lazy(() => import("./components/vistas/AsistenteDatos"));
const Config      = lazy(() => import("./components/vistas/Config"));

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Ya no son valores fijos: cada uno apunta a una variable CSS declarada en
// src/tokens.css (":root" + "@media (prefers-color-scheme: dark)"). Ese archivo
// es la única fuente de verdad del color; repuntarlo cambia toda la app de una
// vez y la deja siguiendo el modo claro/oscuro del sistema operativo.
const C = {
  // Fondos.
  pageBg:      "var(--surface-secondary)",
  hoverBg:     "var(--fill-quaternary)",
  glassBlur:   "var(--blur-chrome)",
  glassBorder: "1px solid var(--separator-chrome)",
  glassShadow: "var(--shadow-md)",
  // Texto
  ink:         "var(--label-primary)",
  inkMid:      "var(--label-secondary)",
  inkMute:     "var(--label-tertiary)",
  inkFaint:    "var(--label-quaternary)",
  // Acento — P en utils/constants.js es este mismo azul: es el único acento
  // interactivo de toda la app (botones primarios, tabs activos, focos).
  brand:       "var(--accent)",
  brandHov:    "var(--accent-pressed)",
  brandSoft:   "var(--accent-soft)",
  brandText:   "var(--accent)",
  // Semánticos
  green:       "var(--green)",
  greenSoft:   "var(--green-soft)",
  red:         "var(--red)",
  redSoft:     "var(--red-soft)",
  amber:       "var(--amber)",
  amberSoft:   "var(--amber-soft)",
  blue:        "var(--accent)",
  blueSoft:    "var(--accent-soft)",
  // Bordes
  border:      "var(--separator)",
  borderStrong:"var(--separator-strong)",
  // Sombras
  shadowSm:    "var(--shadow-sm)",
  shadowMd:    "var(--shadow-md)",
  // Tipografía
  font:        "-apple-system, 'SF Pro Text', 'SF Pro Display', 'Inter', system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
  // Radios
  r:           "var(--radius-sm)",
  rl:          "var(--radius-md)",
  rx:          "var(--radius-lg)",
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
// El riel arranca desplegado (con nombres), salvo en pantallas de iPad o menores,
// donde 230px de navegación se comen la vista (ver el efecto en App).
const INIT = {
  view: "dashboard", selectedPat: null, subAccount: "Sede Principal",
  teeth: {}, teethEvolucion: {}, patientsList: [],
  globalSearch: "", notifCount: 3,
  sidebarCollapsed: typeof window !== "undefined" && window.innerWidth <= 1180,
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
  caja: Caja, laboratorio: Laboratorio,
  ortodoncia: Ortodoncia, whatsapp: AsistenteDatos, config: Config,
};

// ─── ESTRUCTURA SIDEBAR ───────────────────────────────────────────────────────
// Ajustes NO está en esta lista: va fijo al pie del riel (ver ITEM_AJUSTES), así
// que tenerlo también acá lo mostraría dos veces.
// Arquitectura de información. Se reagrupó porque la anterior mezclaba cosas
// de distinta naturaleza:
//
//   · "Finanzas" estaba dentro de "Clínica" — no es trabajo clínico, es gestión
//     del negocio. Ahora vive con Chat IA bajo "Gestión".
//   · "Analítica" existió como subsección de Dashboard, pero repetía buena
//     parte de su información (deudores, por cobrar, estado de tratamientos)
//     y mostraba MENOS datos que Dashboard (no cruzaba ortodoncia/gastos/
//     laboratorio). Se eliminó como vista aparte: lo que de verdad aportaba
//     (total de pacientes, tasa de cobro) se plegó directo en Dashboard.
//   · "Clínica" queda con lo que de verdad es asistencial: la agenda, la
//     historia del paciente y los dos tratamientos con flujo propio.
const SIDEBAR_SECTIONS = [
  {
    label: null, // el inicio no necesita rótulo
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    ],
  },
  {
    label: "Clínica",
    items: [
      { id: "agenda",      label: "Agenda",     icon: "agenda" },
      { id: "expediente",  label: "Historial",  icon: "expediente" },
      { id: "ortodoncia",  label: "Ortodoncia", icon: "ortodoncia" },
      { id: "laboratorio", label: "Laboratorio", icon: "laboratorio" },
    ],
  },
  {
    label: "Gestión",
    items: [
      { id: "caja",     label: "Finanzas", icon: "caja" },
      { id: "whatsapp", label: "Chat IA",  icon: "whatsapp", badge: "IA" },
    ],
  },
];

const ITEM_AJUSTES = { id: "config", label: "Ajustes", icon: "config" };

// ─── ETIQUETAS DE VISTA ───────────────────────────────────────────────────────
const VIEW_LABELS = {
  dashboard: "Dashboard", agenda: "Agenda", expediente: "Historial",
  caja: "Finanzas", laboratorio: "Laboratorio",
  ortodoncia: "Ortodoncia", whatsapp: "Chat IA", config: "Ajustes",
};

// ─── COMPONENTE: ITEM DE NAVEGACIÓN ───────────────────────────────────────────
// Activo = "pill" de fondo suave, nunca un borde ni un bloque de color fuerte.
const NavItem = memo(({ item, isActive, collapsed, contador, onClick }) => {
  const [hov, setHov] = useState(false);
  const alto = 40; // área táctil cómoda incluso en el riel angosto

  return (
    <button
      onClick={() => onClick(item.id)}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        width: collapsed ? 40 : "100%", height: alto, minHeight: alto,
        margin: collapsed ? "0 auto" : 0,
        display: "flex", alignItems: "center", gap: 11,
        padding: collapsed ? 0 : "0 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "var(--radius-control)", border: "none",
        // El pill activo es una superficie suave, no el acento a pleno: el
        // violeta se reserva para el ícono y la barrita de la izquierda.
        background: isActive ? "var(--accent-soft)" : hov ? "var(--panel-hover)" : "transparent",
        color: isActive ? "var(--accent)" : hov ? "var(--text-primary)" : "var(--text-secondary)",
        fontFamily: C.font, fontSize: 13.5,
        fontWeight: isActive ? 600 : 400,
        textAlign: "left",
        cursor: "pointer", outline: "none", flexShrink: 0,
        transition: "background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, flexShrink: 0 }}>
        <NavIcon name={item.icon} size={18} />
      </span>

      {/* Colapsado no cabe la píldora "IA": se reduce a un punto. */}
      {collapsed && item.badge && (
        <span style={{
          position: "absolute", top: 7, right: 7,
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--accent)",
          border: "1.5px solid var(--panel)",
        }} />
      )}

      {!collapsed && (
        <>
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
          {item.badge && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: "0.2px",
              padding: "3px 8px", borderRadius: "var(--radius-pill)", flexShrink: 0,
              background: "var(--text-primary)", color: "var(--panel)",
            }}>
              {item.badge}
            </span>
          )}
          {typeof contador === "number" && contador > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              minWidth: 20, height: 20, padding: "0 6px",
              borderRadius: "var(--radius-pill)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isActive ? "var(--panel)" : "var(--panel-sunken)",
              color: "var(--text-secondary)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {contador}
            </span>
          )}
        </>
      )}
    </button>
  );
});

// ─── COMPONENTE: RIEL DE NAVEGACIÓN ───────────────────────────────────────────
// Un solo riel negro, no dos paneles: colapsado muestra sólo los iconos y
// desplegado los mismos iconos con nombre y contador. Nunca se ven las secciones
// duplicadas en pantalla.
//
// Ajustes va fijo al pie, fuera de la lista con scroll, para que siempre esté a
// la vista sin importar cuántas secciones haya arriba.
const Sidebar = memo(({ state, dispatch, clinica, contadores }) => {
  const { sidebarCollapsed: col, view } = state;
  // El bucket es privado: el logo va por URL firmada, no por la pública que
  // quedó guardada en clinicas.logo_url.
  const logoUrl = useSignedUrl(clinica?.logo_url);
  const goTo = useCallback(id => dispatch({ type: "SET_VIEW", payload: { view: id } }), [dispatch]);
  const toggle = useCallback(() => dispatch({ type: "TOGGLE_SIDEBAR" }), [dispatch]);
  const W = col ? 76 : 250;

  return (
    // Un solo panel blanco que flota sobre el fondo lavanda, con esquinas muy
    // redondeadas y sombra difusa. Ajustes va al pie, DENTRO del mismo panel:
    // separarlo en cápsulas sueltas competía visualmente con las secciones.
    <aside style={{
      width: W, minWidth: W,
      margin: "var(--gutter) 0 var(--gutter) var(--gutter)",
      height: "calc(100vh - var(--gutter) * 2)",
      background: "var(--panel)",
      borderRadius: "var(--radius-panel)",
      boxShadow: "var(--shadow-float)",
      display: "flex", flexDirection: "column",
      padding: "18px 0 14px",
      flexShrink: 0, zIndex: 101, overflow: "hidden",
      transition: "width var(--dur-slow) var(--ease), min-width var(--dur-slow) var(--ease)",
    }}>

      {/* ── Marca ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 11, flexShrink: 0,
        padding: col ? 0 : "0 18px", marginBottom: 20,
        justifyContent: col ? "center" : "flex-start",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "var(--radius-control)", overflow: "hidden", flexShrink: 0,
          background: logoUrl ? "transparent" : "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt={clinica?.nombre || "Logo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          )}
        </div>
        {!col && (
          <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {clinica?.nombre || "DentalOS"}
          </span>
        )}
      </div>

      {/* ── Secciones ── */}
      <nav style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: col ? 0 : "0 12px" }}>
        {SIDEBAR_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: 14 }}>
            {section.label && !col && (
              <div style={{
                fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)",
                letterSpacing: "0.4px", textTransform: "uppercase",
                padding: "0 12px 8px",
              }}>
                {section.label}
              </div>
            )}
            {/* Colapsado no hay lugar para el rótulo: un espacio extra separa
                los grupos, en vez de una línea dura. */}
            {section.label && col && si > 0 && <div style={{ height: 10 }} />}

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {section.items.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={view === item.id}
                  collapsed={col}
                  contador={contadores[item.id]}
                  onClick={goTo}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Pie: Ajustes + plegar ── */}
      <div style={{ flexShrink: 0, padding: col ? 0 : "0 12px", marginTop: 10 }}>
        <NavItem
          item={ITEM_AJUSTES}
          isActive={view === ITEM_AJUSTES.id}
          collapsed={col}
          onClick={goTo}
        />
        <button
          onClick={toggle}
          aria-label={col ? "Mostrar nombres de las secciones" : "Ocultar nombres de las secciones"}
          title={col ? "Mostrar nombres de las secciones" : "Ocultar nombres de las secciones"}
          style={{
            width: col ? 40 : "100%", height: 40, minHeight: 40,
            margin: col ? "3px auto 0" : "3px 0 0",
            display: "flex", alignItems: "center", justifyContent: col ? "center" : "flex-start",
            gap: 11, padding: col ? 0 : "0 12px",
            borderRadius: "var(--radius-control)", border: "none", background: "transparent",
            color: "var(--text-tertiary)", fontFamily: C.font, fontSize: 13.5,
            cursor: "pointer", outline: "none",
            transition: "background-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--panel-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
        >
          <span style={{ display: "flex", width: 18, height: 18, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <NavIcon name="panel" size={18} />
          </span>
          {!col && <span>Contraer</span>}
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
        <NavIcon name="buscar" size={17} />
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
const TopHeader = memo(({ state, dispatch, onLogout, avatarUrl, nombreUsuario, rol, onAbrirPaciente }) => {
  const label = VIEW_LABELS[state.view] ?? state.view;
  // En portrait de iPad (~758-810px, menos los 60-230px del riel) este header
  // no tenía ningún mecanismo de achique: grupo derecho a flexShrink:0, sin
  // wrap. El selector de sede es decorativo (no hay más de una sede real
  // todavía) así que es lo primero que se sacrifica; "Nueva cita" se reduce a
  // sólo el ícono en vez de perder alguno de los dos por completo.
  const { isNarrow } = useResponsive();

  return (
    // El header también es un panel flotante: sin borde inferior duro, separado
    // del contenido por aire, igual que el resto de los bloques.
    <header style={{
      height: 64, minHeight: 64,
      display: "flex", alignItems: "center",
      padding: "0 14px 0 22px",
      // Mismo canal que el contenido: el header se alinea con los paneles de
      // abajo en los dos bordes, no flota con su propia medida.
      margin: "var(--gutter) var(--gutter) 0 var(--gutter)",
      gap: isNarrow ? 10 : 16, flexShrink: 0, zIndex: 90, position: "relative",
      background: "var(--panel)",
      borderRadius: "var(--radius-panel)",
      boxShadow: "var(--shadow-float)",
    }}>
      {/* Título de la vista */}
      <span style={{ fontSize: 19, fontWeight: 600, color: C.ink, fontFamily: C.font, letterSpacing: "-0.02em", flexShrink: 0 }}>
        {label}
      </span>

      {/* Buscador global */}
      <BuscadorGlobal
        valor={state.globalSearch}
        onCambio={v => dispatch({ type: "SET_SEARCH", payload: v })}
        onAbrirPaciente={onAbrirPaciente}
      />

      {/* Grupo derecho */}
      <div style={{ display: "flex", alignItems: "center", gap: isNarrow ? 6 : 8, flexShrink: 0, marginLeft: "auto" }}>

        {/* Selector sede: no hay más de una sede real todavía, así que es
            puramente decorativo -- lo primero que se sacrifica por espacio. */}
        {!isNarrow && (
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
            <span style={{ color: C.inkFaint, display: "flex" }}><NavIcon name="chevronDown" size={12} /></span>
          </div>
        )}

        {/* Botón nueva cita: en portrait de iPad, sólo el ícono. */}
        <PrimaryBtn
          onClick={() => dispatch({ type: "SET_VIEW", payload: { view: "agenda" } })}
          title={isNarrow ? "Nueva cita" : undefined}
        >
          <NavIcon name="mas" size={16} />
          {!isNarrow && "Nueva cita"}
        </PrimaryBtn>

        {/* Notificaciones. Ajustes ya no está acá: vive fijo al pie del riel. */}
        <HeaderIconBtn label={`${state.notifCount} notificaciones`} badge={state.notifCount}>
          <NavIcon name="campana" size={18} />
        </HeaderIconBtn>

        {/* Perfil: avatar + quién está usando la app y con qué rol. En angosto,
            sólo el avatar -- el nombre completo ya no entra sin apretar todo
            lo demás. */}
        <button
          onClick={onLogout}
          title={isNarrow ? `${nombreUsuario} — cerrar sesión` : "Cerrar sesión"}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: isNarrow ? 0 : "4px 10px 4px 4px", borderRadius: 100,
            border: isNarrow ? "none" : `1px solid ${C.border}`,
            background: isNarrow ? "transparent" : "#fff",
            cursor: "pointer", outline: "none", boxShadow: isNarrow ? "none" : C.shadowSm,
            transition: "border-color 0.12s", maxWidth: isNarrow ? "none" : 190,
          }}
          onMouseEnter={e => { if (!isNarrow) e.currentTarget.style.borderColor = C.borderStrong; }}
          onMouseLeave={e => { if (!isNarrow) e.currentTarget.style.borderColor = C.border; }}
        >
          <span style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : C.brandSoft,
            border: `1px solid ${C.border}`,
          }} />
          {!isNarrow && (
            <span style={{ minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: C.font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {nombreUsuario}
              </span>
              <span style={{ display: "block", fontSize: 9.5, color: C.inkMute, fontFamily: C.font, textTransform: "capitalize" }}>
                {rol || "Cerrar sesión"}
              </span>
            </span>
          )}
        </button>
      </div>
    </header>
  );
});

// ─── MICRO: BOTÓN PRIMARIO ────────────────────────────────────────────────────
const PrimaryBtn = memo(({ children, onClick, title }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
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
      position: "relative", zIndex: 1,
      width: 48, height: 48, borderRadius: 14, background: GRAD_PRIMARY,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
      animation: "pulse 1.5s ease-in-out infinite",
      boxShadow: GRAD_PRIMARY_SHADOW,
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
  // Compartido por el riel y el panel de secciones: el bucket es privado, así que
  // la foto va por URL firmada y no por la pública guardada en la tabla.
  const avatarUrl = useSignedUrl(clinica?.id ? rutaPerfil(clinica.id) : null);
  const contadores = useContadoresNav(clinicaId);

  // White-label: si la clínica fijó un acento propio (Ajustes → Apariencia),
  // se aplica sobre :root. hover/press/soft/ring se recalculan solos porque
  // son fórmulas de color-mix() en tokens.css -- acá solo se fija --accent y
  // su contraste de texto (ver utils/theme.js).
  useEffect(() => { aplicarTema(clinica); }, [clinica]);

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
          font-family: ${C.font};
          background: ${C.pageBg};
          color: ${C.ink};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
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
        /* Se usa en 9 lugares (Dashboard + Ortodoncia) pero nunca se había
           definido -- esas animaciones no hacían nada. */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Punto "en vivo": un anillo que se expande y se apaga, para indicadores
           de datos que se refrescan solos. */
        @keyframes pulso-vivo {
          0%   { transform: scale(1);   opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
      `}</style>

      <div style={{
        display: "flex", height: "100vh",
        overflow: "hidden", background: C.pageBg,
        fontFamily: C.font, position: "relative",
      }}>
        {/* Sin textura decorativa de fondo: "deferencia" pide una superficie
            neutra que ceda protagonismo al contenido, no un adorno detrás. */}

        {/* Un solo riel: colapsado son los iconos, desplegado los mismos con
            nombre y contador. Nunca las secciones dos veces en pantalla. */}
        <Sidebar state={state} dispatch={dispatch} clinica={clinica} contadores={contadores} />

        {/* Columna derecha */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, position: "relative", zIndex: 1 }}>
          {/* Header: título de vista + buscador + acciones */}
          <TopHeader
            state={state} dispatch={dispatch} onLogout={logout} avatarUrl={avatarUrl}
            nombreUsuario={session?.user?.user_metadata?.full_name || session?.user?.email || "Usuario"}
            rol={clinicaRol}
            onAbrirPaciente={p => dispatch({ type: "SET_VIEW", payload: { view: "expediente", pat: p } })}
          />

          {/* Contenido */}
          {/* Sin ancho máximo fijo: antes centraba el contenido en 1480px pase lo
              que pase, así que colapsar el riel (60px vs 230px) sólo agrandaba el
              margen vacío a los lados en vez de darle ese espacio a la vista. El
              tope de 2000px es sólo para monitores ultra-anchos. */}
          {/* El mismo canal en los cuatro lados: el contenido queda separado del
              riel exactamente igual que del borde derecho. Antes el padding
              izquierdo era 0 y todo quedaba pegado al menú. */}
          <main role="main" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "var(--gutter)", background: "transparent" }}>
            <div style={{ maxWidth: 2000, margin: "0 auto" }}>
              <ViewRouter state={state} dispatch={dispatch} clinicaId={clinicaId} clinica={clinica} clinicaRol={clinicaRol} clinicaLoading={clinicaLoading} refrescarClinica={refrescarClinica} />
            </div>
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}