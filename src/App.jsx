// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DentalOS · Shell
// Riel de navegación blanco, pegado al borde izquierdo y colapsable a sólo
// iconos · activo = píldora negra sólida (referencia "YourCRM") · Ajustes y
// "Contraer" al pie · Header con título, buscador global y perfil ·
// Context + Reducer · Lazy views · Un solo modo (claro), por decisión
// explícita del usuario -- ya no hay selector claro/oscuro.
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
const Placeholder = lazy(() => import("./components/vistas/Placeholder"));

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
// Colores/tipografía fijos (hex/rgba) directo acá, sin variables CSS -- ver
// commit "Elimina el sistema de design tokens". Paleta negro/azul/coral +
// Inter, siguiendo la referencia "YourCRM" (UI/UX, Alina Abovyan).
const C = {
  // Fondos.
  pageBg:      "#F9F9F9",
  hoverBg:     "#EDEDED",
  glassBlur:   "blur(20px) saturate(180%)",
  glassBorder: "1px solid rgba(10, 10, 10, 0.06)",
  glassShadow: "0 2px 4px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)",
  // Texto
  ink:         "#030303",
  inkMid:      "#6B7280",
  inkMute:     "#9AA1AC",
  inkFaint:    "#C4C4C4",
  // Acento — P en utils/constants.js es este mismo azul: es el único acento
  // interactivo de toda la app (botones primarios, tabs activos, focos).
  brand:       "#729DEE",
  brandHov:    "#5B82D6",
  brandSoft:   "rgba(114, 157, 238, 0.12)",
  brandText:   "#729DEE",
  // Semánticos
  green:       "#22A55E",
  greenSoft:   "#DCFCE7",
  red:         "#E56868",
  redSoft:     "#FEE2E2",
  amber:       "#E8A63D",
  amberSoft:   "#FEF3C7",
  blue:        "#729DEE",
  blueSoft:    "rgba(114, 157, 238, 0.12)",
  // Bordes
  border:      "rgba(10, 10, 10, 0.06)",
  borderStrong:"rgba(10, 10, 10, 0.11)",
  // Sombras
  shadowSm:    "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 6px rgba(16, 24, 40, 0.05)",
  shadowMd:    "0 2px 4px rgba(16, 24, 40, 0.04), 0 4px 12px rgba(16, 24, 40, 0.06)",
  // Tipografía
  font:        "'Inter', -apple-system, system-ui, sans-serif",
  fontMono:    "'JetBrains Mono', monospace",
  // Radios
  r:           "10px",
  rl:          "14px",
  rx:          "18px",
};

// ─── REDUCER ──────────────────────────────────────────────────────────────────
const INIT = {
  view: "dashboard", selectedPat: null,
  teeth: {}, teethEvolucion: {}, patientsList: [],
  globalSearch: "", notifCount: 3,
};

function reducer(st, action) {
  switch (action.type) {
    // `selectedPat` es un argumento de navegación, no estado que se arrastra:
    // quien navega sin indicar paciente (el menú, por ejemplo) llega sin
    // ninguno abierto. Si se conservara, entrar al Historial desde el menú
    // reabriría solo al último paciente que se vio desde otra vista.
    case "SET_VIEW":        return { ...st, view: action.payload.view, selectedPat: action.payload.pat ?? null };
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

// Fábrica de componentes para las secciones placeholder: VIEWS necesita un
// componente por clave, y las 13 secciones nuevas comparten el mismo
// Placeholder.jsx -- esto le fija el título/ícono a cada una sin escribir 13
// componentes idénticos a mano.
const placeholderVista = (titulo, icono) => (props) => <Placeholder titulo={titulo} icono={icono} {...props} />;

// ─── MAPA DE VISTAS ───────────────────────────────────────────────────────────
const VIEWS = {
  dashboard: Dashboard, agenda: Agenda, expediente: Expediente,
  caja: Caja, laboratorio: Laboratorio,
  ortodoncia: Ortodoncia, whatsapp: AsistenteDatos, config: Config,
  // Secciones agregadas por la referencia "Confidency OS" (ver
  // OVERFLOW_SECTIONS más abajo) -- sin pantalla propia todavía.
  overview:       placeholderVista("Overview", "overview"),
  liveMonitor:    placeholderVista("Live Monitor", "liveMonitor"),
  alerts:         placeholderVista("Alerts", "alerts"),
  orderQueue:     placeholderVista("Order Queue", "orderQueue"),
  catalog:        placeholderVista("Catalog", "catalog"),
  pricingEngine:  placeholderVista("Pricing Engine", "pricingEngine"),
  customers:      placeholderVista("Customers", "customers"),
  reviews:        placeholderVista("Reviews", "reviews"),
  revenueDesk:    placeholderVista("Revenue Desk", "revenueDesk"),
  payouts:        placeholderVista("Payouts", "payouts"),
  taxEngine:      placeholderVista("Tax Engine", "taxEngine"),
  marketplace:    placeholderVista("Marketplace", "marketplace"),
  pos:            placeholderVista("POS", "pos"),
  socialChannels: placeholderVista("Social Channels", "socialChannels"),
};

// ─── ESTRUCTURA DE NAVEGACIÓN ─────────────────────────────────────────────────
// Referencia "YourCRM": barra horizontal de 7 píldoras (Relationship/
// Opportunities/Leads/Calendar/Cases/Reports/Quotes). DentalOS tiene
// exactamente 7 ítems reales -- coincide justo, así que van TODOS en la barra
// horizontal del header, sin reagrupar por secciones (ya no hace falta: la
// agrupación por "Clínica/Gestión" tenía sentido en un riel largo, no en una
// fila de 7 píldoras).
const PRIMARY_NAV = [
  { id: "dashboard",   label: "Dashboard",   icon: "dashboard" },
  { id: "agenda",      label: "Agenda",      icon: "agenda" },
  { id: "expediente",  label: "Historial",   icon: "expediente" },
  { id: "ortodoncia",  label: "Ortodoncia",  icon: "ortodoncia" },
  { id: "laboratorio", label: "Laboratorio", icon: "laboratorio" },
  { id: "caja",        label: "Finanzas",    icon: "caja" },
  { id: "whatsapp",    label: "Chat IA",     icon: "whatsapp", badge: "IA" },
];

// Grupos agregados por la referencia "Confidency OS" -- pedido explícito del
// usuario en su momento: "agregar a lo que ya tiene, no quites nada actual".
// No entran en la barra horizontal (ya tiene sus 7 píldoras justas), así que
// viven detrás del botón "Más" del riel delgado -- siguen alcanzables, sólo
// que no ocupan sitio en la navegación principal. Cada ítem apunta a
// Placeholder.jsx (ver VIEWS arriba) -- no tienen pantalla propia todavía.
const OVERFLOW_SECTIONS = [
  {
    label: "Command",
    items: [
      { id: "overview",    label: "Overview",     icon: "overview" },
      { id: "liveMonitor", label: "Live Monitor", icon: "liveMonitor" },
      { id: "alerts",      label: "Alerts",       icon: "alerts" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { id: "orderQueue",    label: "Order Queue",    icon: "orderQueue" },
      { id: "catalog",       label: "Catalog",        icon: "catalog" },
      { id: "pricingEngine", label: "Pricing Engine", icon: "pricingEngine" },
      { id: "customers",     label: "Customers",      icon: "customers" },
      { id: "reviews",       label: "Reviews",        icon: "reviews" },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "revenueDesk", label: "Revenue Desk", icon: "revenueDesk" },
      { id: "payouts",     label: "Payouts",      icon: "payouts" },
      { id: "taxEngine",   label: "Tax Engine",   icon: "taxEngine" },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "marketplace",    label: "Marketplace",     icon: "marketplace" },
      { id: "pos",            label: "POS",              icon: "pos" },
      { id: "socialChannels", label: "Social Channels", icon: "socialChannels" },
    ],
  },
];

const ITEM_AJUSTES = { id: "config", label: "Ajustes", icon: "config" };

// ─── ETIQUETAS DE VISTA ───────────────────────────────────────────────────────
const VIEW_LABELS = {
  dashboard: "Dashboard", agenda: "Agenda", expediente: "Historial",
  caja: "Finanzas", laboratorio: "Laboratorio",
  ortodoncia: "Ortodoncia", whatsapp: "Chat IA", config: "Ajustes",
  overview: "Overview", liveMonitor: "Live Monitor", alerts: "Alerts",
  orderQueue: "Order Queue", catalog: "Catalog", pricingEngine: "Pricing Engine",
  customers: "Customers", reviews: "Reviews",
  revenueDesk: "Revenue Desk", payouts: "Payouts", taxEngine: "Tax Engine",
  marketplace: "Marketplace", pos: "POS", socialChannels: "Social Channels",
};

// ─── COMPONENTE: PÍLDORA DE NAV HORIZONTAL ────────────────────────────────────
// Calcada de la barra superior de "YourCRM": activa = negro sólido + texto
// blanco, inactiva = texto gris, hover = fondo gris clarito. Vive en el
// header, no en un riel vertical -- ver PRIMARY_NAV arriba.
const TopNavPill = memo(({ item, isActive, contador, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={() => onClick(item.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={isActive ? "page" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        height: 40, padding: "0 18px", flexShrink: 0,
        borderRadius: "999px", border: "none",
        background: isActive ? "#030303" : hover ? "#EDEDED" : "transparent",
        color: isActive ? "#FFFFFF" : "#030303",
        fontFamily: C.font, fontSize: 14, fontWeight: isActive ? 600 : 450,
        cursor: "pointer", whiteSpace: "nowrap",
        transition: "background-color 150ms ease",
      }}
    >
      {item.label}
      {item.badge && (
        <span style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.2px",
          padding: "2px 6px", borderRadius: "999px",
          background: isActive ? "#729DEE" : "#EDEDED",
          color: isActive ? "#FFFFFF" : "#030303",
        }}>
          {item.badge}
        </span>
      )}
      {typeof contador === "number" && contador > 0 && (
        <span style={{
          fontSize: 10.5, fontWeight: 700, minWidth: 17, height: 17, padding: "0 5px",
          borderRadius: "999px", display: "flex", alignItems: "center", justifyContent: "center",
          background: isActive ? "rgba(255, 255, 255, 0.22)" : "#729DEE",
          color: isActive ? "#FFFFFF" : "#FFFFFF",
          fontVariantNumeric: "tabular-nums",
        }}>
          {contador}
        </span>
      )}
    </button>
  );
});

// ─── COMPONENTE: BOTÓN DEL RIEL DELGADO ───────────────────────────────────────
// Círculo de ícono solo, sin texto -- el riel de la referencia es angosto y
// casi invisible (blanco, sin relleno), estos botones son su único contenido.
const IconRailButton = memo(({ icon, title, onClick, badge }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick} title={title} aria-label={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", width: 36, height: 36, borderRadius: "50%",
        border: "none", background: hover ? "#EDEDED" : "transparent",
        color: "#030303", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", flexShrink: 0, transition: "background-color 150ms ease",
      }}
    >
      <NavIcon name={icon} size={17} />
      {typeof badge === "number" && badge > 0 && (
        <span style={{
          position: "absolute", top: -2, right: -2,
          minWidth: 15, height: 15, padding: "0 3px", borderRadius: "999px",
          background: "#729DEE", color: "#FFFFFF", fontSize: 9, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1.5px solid #FFFFFF", fontVariantNumeric: "tabular-nums",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
});

// Panel "Más": las 4 secciones de la referencia "Confidency OS" que no
// entran en la barra horizontal de 7 píldoras -- siguen alcanzables acá,
// agrupadas igual que antes en el riel viejo.
const MasPanel = memo(({ view, onSelect, onClose }) => {
  const ref = React.useRef(null);
  useEffect(() => {
    const alApretar = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    window.addEventListener("mousedown", alApretar);
    return () => window.removeEventListener("mousedown", alApretar);
  }, [onClose]);
  return (
    <div ref={ref} style={{
      position: "absolute", left: "calc(100% + 8px)", top: 0, zIndex: 210,
      width: 220, background: "#FFFFFF", border: "1px solid #E2E2E2",
      borderRadius: "14px", boxShadow: "0 8px 20px rgba(10, 10, 10, 0.10)",
      padding: "8px 0", maxHeight: "80vh", overflowY: "auto",
    }}>
      {OVERFLOW_SECTIONS.map((section, si) => (
        <div key={si} style={{ padding: "6px 0" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "#9AA1AC", letterSpacing: "0.4px", textTransform: "uppercase", padding: "4px 14px" }}>
            {section.label}
          </div>
          {section.items.map(item => (
            <button
              key={item.id} onClick={() => onSelect(item.id)}
              aria-current={view === item.id ? "page" : undefined}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "7px 14px", border: "none", background: view === item.id ? "#EDEDED" : "transparent",
                color: "#030303", fontFamily: C.font, fontSize: 13, cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#EDEDED"; }}
              onMouseLeave={e => { e.currentTarget.style.background = view === item.id ? "#EDEDED" : "transparent"; }}
            >
              <span style={{ display: "flex", opacity: 0.75 }}><NavIcon name={item.icon} size={16} /></span>
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
});

// ─── COMPONENTE: RIEL DELGADO ─────────────────────────────────────────────────
// Sólo iconos, blanco, angosto -- calcado del riel de la referencia "YourCRM"
// (ahí son accesos genéricos de la página; acá son accesos reales: atajos de
// creación, el resto de las secciones que no entran en la barra horizontal,
// Ajustes y cerrar sesión). La navegación PRINCIPAL vive en el header
// (PRIMARY_NAV), no acá -- este riel es un complemento, no el menú.
const IconRail = memo(({ state, dispatch, avatarUrl, nombreUsuario, onLogout }) => {
  const { view } = state;
  const [masAbierto, setMasAbierto] = useState(false);
  const goTo = useCallback(id => { dispatch({ type: "SET_VIEW", payload: { view: id } }); setMasAbierto(false); }, [dispatch]);

  return (
    <aside style={{
      width: 64, minWidth: 64,
      margin: "28px 0 28px 28px",
      height: "calc(100vh - 28px * 2)",
      background: "rgba(255, 255, 255, 0.62)", border: "1px solid rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderRadius: "24px", boxShadow: "0 8px 32px rgba(10, 10, 10, 0.07), 0 2px 8px rgba(10, 10, 10, 0.04)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 0", gap: 6, flexShrink: 0, zIndex: 101,
      position: "relative",
    }}>
      <IconRailButton icon="agenda" title="Nueva cita" onClick={() => goTo("agenda")} />
      <IconRailButton icon="cardPlus" title="Registrar pago" onClick={() => goTo("caja")} />
      <IconRailButton icon="userPlus" title="Nuevo paciente" onClick={() => goTo("expediente")} />

      <div style={{ width: 24, height: 1, background: "#E2E2E2", margin: "6px 0" }} />

      <div style={{ position: "relative" }}>
        <IconRailButton icon="grid" title="Más secciones" onClick={() => setMasAbierto(v => !v)} />
        {masAbierto && <MasPanel view={view} onSelect={goTo} onClose={() => setMasAbierto(false)} />}
      </div>

      <div style={{ flex: 1 }} />

      <IconRailButton icon="config" title="Ajustes" onClick={() => goTo("config")} />
      <span style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginTop: 4,
        background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : "rgba(114, 157, 238, 0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600, color: "#729DEE",
      }}>
        {!avatarUrl && (nombreUsuario || "?").trim().charAt(0).toUpperCase()}
      </span>
      <IconRailButton icon="logout" title="Cerrar sesión" onClick={onLogout} />
    </aside>
  );
});
// ─── COMPONENTE: BUSCADOR GLOBAL ──────────────────────────────────────────────
// Antes el buscador guardaba texto en el estado y NADA lo leía -- era decorativo,
// igual que el hint "/" del teclado. Ahora busca pacientes de verdad por nombre o
// documento y abre su historial. El RLS acota el resultado a la propia clínica,
// así que no hace falta filtrar por clinica_id acá.
const BuscadorGlobal = memo(({ valor, onCambio, onAbrirPaciente, autoFocus, onCerrar }) => {
  // Se guarda la consulta JUNTO a sus resultados: si sólo se guardaran los
  // resultados, al reescribir se mostrarían los de la búsqueda anterior hasta
  // que llegara la nueva.
  const [res, setRes] = useState({ q: "", items: [] });
  const [abierto, setAbierto] = useState(false);
  const cajaRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Header nuevo: el buscador nace como ícono y se expande a este campo al
  // hacer clic -- autoFocus lo enfoca apenas se monta, como cualquier campo
  // que reemplaza a un botón.
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  // El atajo "/" que el teclado ya prometía en la UI.
  useEffect(() => {
    const alTeclear = (e) => {
      const enCampo = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (e.key === "/" && !enCampo) { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "Escape") { setAbierto(false); onCerrar?.(); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  useEffect(() => {
    const alApretar = (e) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) {
        setAbierto(false);
        // Sólo se colapsa de vuelta al ícono si no hay texto -- si el usuario
        // ya escribió algo, cerrar el campo le borraría la búsqueda sin avisar.
        if (onCerrar && !(valor || "").trim()) onCerrar();
      }
    };
    window.addEventListener("mousedown", alApretar);
    return () => window.removeEventListener("mousedown", alApretar);
  }, [onCerrar, valor]);

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
      // Sin archivados: el buscador global es para llegar a un paciente en
      // curso. Los archivados se consultan desde su pestaña del Directorio.
      const { data } = await supabase
        .from("pacientes")
        .select("id, name, doc, phone, treatment")
        .is("archivado_at", null)
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
    <div ref={cajaRef} style={{ position: "relative", width: 260, flexShrink: 0 }}>
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
        // Fondo gris claro sin borde visible: el campo se distingue del panel
        // por el cambio de superficie, no por una línea. El foco lo marca
        // .field en ui.css con box-shadow (un anillo, no un borde nuevo).
        className="field"
        style={{
          width: "100%", padding: "9px 34px 9px 36px",
          borderRadius: "10px", border: "1px solid transparent",
          background: "#F5F5F5", fontSize: 13,
          fontFamily: C.font, color: C.ink, outline: "none",
        }}
      />
      {abierto && hayTexto && (
        // Opaco, no vidrio: es una lista densa de resultados (nombre + DNI),
        // y ahí la legibilidad pesa más que el efecto -- mismo criterio que
        // el tooltip del gráfico. La sombra pasa de un valor azul-marino sin
        // token a --shadow-pop, la misma que usa cualquier otro elemento que
        // flota sobre el contenido.
        <div style={{
          position: "absolute", top: "calc(100% + 7px)", left: 0, right: 0,
          background: "#FFFFFF", borderRadius: "14px", border: `1px solid ${C.border}`,
          boxShadow: "0 8px 20px rgba(16, 24, 40, 0.10), 0 2px 6px rgba(16, 24, 40, 0.05)", overflow: "hidden", zIndex: 200,
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
// Wordmark + barra de píldoras horizontal + buscador/mail/campana/perfil --
// calcado de la cabecera de "YourCRM". El título de vista suelto que había
// antes se retira: la píldora activa de PRIMARY_NAV ya dice en qué sección
// se está, repetirlo como texto sería redundante.
const TopHeader = memo(({ state, dispatch, clinica, contadores, avatarUrl, nombreUsuario, rol, onLogout, onAbrirPaciente }) => {
  const { isNarrow } = useResponsive();
  const [buscarAbierto, setBuscarAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = React.useRef(null);
  const logoUrl = useSignedUrl(clinica?.logo_url);
  const goTo = id => dispatch({ type: "SET_VIEW", payload: { view: id } });

  useEffect(() => {
    const alApretar = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false); };
    window.addEventListener("mousedown", alApretar);
    return () => window.removeEventListener("mousedown", alApretar);
  }, []);

  return (
    <header style={{
      minHeight: 64,
      display: "flex", alignItems: "center",
      padding: "10px 18px",
      margin: "28px 28px 0 28px",
      gap: 18, flexShrink: 0, zIndex: 90, position: "relative",
      background: "rgba(255, 255, 255, 0.62)", border: "1px solid rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderRadius: "24px", flexWrap: "wrap",
      boxShadow: "0 8px 32px rgba(10, 10, 10, 0.07), 0 2px 8px rgba(10, 10, 10, 0.04)",
    }}>
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "8px", overflow: "hidden", flexShrink: 0,
          background: logoUrl ? "transparent" : "#729DEE",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF",
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt={clinica?.nombre || "Logo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          )}
        </div>
        {!isNarrow && (
          <span style={{ fontSize: 16, fontWeight: 800, color: "#030303", letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
            {(clinica?.nombre || "DentalOS").replace(/^Consultorio\s+/i, '')}
          </span>
        )}
      </div>

      {/* Barra de píldoras -- los 7 ítems reales, calcado de la referencia */}
      <nav style={{ display: "flex", alignItems: "center", gap: 2, overflowX: "auto", flex: 1, minWidth: 0 }}>
        {PRIMARY_NAV.map(item => (
          <TopNavPill
            key={item.id} item={item} isActive={state.view === item.id}
            contador={contadores[item.id]} onClick={goTo}
          />
        ))}
      </nav>

      {/* Grupo derecho: buscar, mensajes (Chat IA), notificaciones, perfil */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, position: "relative" }}>
        {buscarAbierto ? (
          <BuscadorGlobal
            valor={state.globalSearch}
            onCambio={v => dispatch({ type: "SET_SEARCH", payload: v })}
            onAbrirPaciente={p => { onAbrirPaciente(p); setBuscarAbierto(false); }}
            autoFocus
            onCerrar={() => setBuscarAbierto(false)}
          />
        ) : (
          <HeaderIconBtn label="Buscar paciente" onClick={() => setBuscarAbierto(true)}>
            <NavIcon name="buscar" size={17} />
          </HeaderIconBtn>
        )}

        <HeaderIconBtn label="Chat IA" onClick={() => goTo("whatsapp")}>
          <NavIcon name="mail" size={17} />
        </HeaderIconBtn>

        <HeaderIconBtn label={`${state.notifCount} notificaciones`} badge={state.notifCount}>
          <NavIcon name="campana" size={17} />
        </HeaderIconBtn>

        {/* Perfil: el bloque "Cuenta" del riel viejo se vuelve este menú --
            el avatar circular arriba a la derecha es el lugar exacto donde
            la referencia lo pone. */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuAbierto(v => !v)}
            aria-label={`${nombreUsuario} — cuenta`}
            style={{
              width: 38, height: 38, borderRadius: "50%", border: "none", padding: 0,
              background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : "#EDEDED",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600, color: "#030303", cursor: "pointer",
            }}
          >
            {!avatarUrl && (nombreUsuario || "?").trim().charAt(0).toUpperCase()}
          </button>
          {menuAbierto && (
            <div style={{
              position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 210,
              width: 200, background: "#FFFFFF", border: "1px solid #E2E2E2",
              borderRadius: "14px", boxShadow: "0 8px 20px rgba(10, 10, 10, 0.10)", padding: 8,
            }}>
              <div style={{ padding: "6px 8px 10px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#030303", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombreUsuario}</div>
                <div style={{ fontSize: 11.5, color: "#9AA1AC", textTransform: "capitalize" }}>{rol || "Usuario"}</div>
              </div>
              <button
                onClick={onLogout}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  padding: "8px 8px", border: "none", background: "transparent",
                  color: "#030303", fontFamily: C.font, fontSize: 13, cursor: "pointer",
                  borderRadius: "8px", borderTop: "1px solid #E2E2E2",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#EDEDED"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <NavIcon name="logout" size={15} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
});

// ─── MICRO: ICONO HEADER ──────────────────────────────────────────────────────
// Círculo gris claro sin borde ni sombra, ícono negro -- calcado pixel a
// pixel del recorte de la referencia (búsqueda/mensajes/campana), no el
// botón bordeado-con-sombra de la versión anterior.
const HeaderIconBtn = memo(({ children, label, badge, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", width: 38, height: 38, borderRadius: "50%",
        border: "none",
        background: hov ? "#E2E2E2" : "#EDEDED",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", color: "#030303", outline: "none",
        transition: "background 0.12s", flexShrink: 0,
      }}
    >
      {children}
      {badge > 0 && (
        <span style={{
          position: "absolute", top: 1, right: 1,
          width: 14, height: 14, borderRadius: "50%",
          background: C.red, color: "#FFFFFF", fontSize: 8, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1.5px solid #EDEDED", fontFamily: C.font,
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
      display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF",
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
  const { clinicaId, clinica, rol: clinicaRol, loading: clinicaLoading, refrescar: refrescarClinica } = useClinic();
  const { handleOAuthCallback: handleMetaWhatsAppCallback } = useMetaWhatsApp(clinicaId);
  // Compartido por el riel y el panel de secciones: el bucket es privado, así que
  // la foto va por URL firmada y no por la pública guardada en la tabla.
  const avatarUrl = useSignedUrl(clinica?.id ? rutaPerfil(clinica.id) : null);
  const contadores = useContadoresNav(clinicaId);

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
        :focus-visible { outline: 2px solid #729DEE; outline-offset: 2px; }
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

      {/* Mesh gradient difuso (azul arriba-izquierda, coral/durazno arriba-
          derecha Y abajo-derecha, blanco al centro) vive en el fondo MÁS
          externo -- riel, header y contenido son todos translúcidos
          (GLASS_BG/GLASS_BLUR) por encima de esta única capa de color, en vez
          de cada uno tener su propio fondo opaco. Así es como se ve en la
          referencia: el color se nota A TRAVÉS de las tarjetas. */}
      <div style={{
        display: "flex", height: "100vh",
        overflow: "hidden",
        background: "radial-gradient(circle at 10% 8%, rgba(114, 157, 238, 0.20), transparent 42%), radial-gradient(circle at 92% 14%, rgba(229, 143, 133, 0.16), transparent 45%), radial-gradient(circle at 88% 85%, rgba(229, 104, 104, 0.15), transparent 50%), #FAFAFA",
        fontFamily: C.font, position: "relative",
      }}>
        {/* Riel delgado sólo-iconos: atajos, "Más" secciones, Ajustes y cerrar
            sesión. La navegación principal ya no vive acá -- ver PRIMARY_NAV
            en el header. */}
        <IconRail
          state={state} dispatch={dispatch}
          avatarUrl={avatarUrl} onLogout={logout}
          nombreUsuario={session?.user?.user_metadata?.full_name || session?.user?.email || "Usuario"}
        />

        {/* Columna derecha */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, position: "relative", zIndex: 1 }}>
          {/* Header: wordmark + nav horizontal + buscador + acciones + perfil */}
          <TopHeader
            state={state} dispatch={dispatch} clinica={clinica} contadores={contadores}
            avatarUrl={avatarUrl} onLogout={logout}
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
          {/* Ya no hay un lienzo propio con su degradado acá adentro -- el
              degradado vive en el fondo más externo (ver arriba) y se ve A
              TRAVÉS de las tarjetas translúcidas, así que este contenedor
              sólo necesita el padding. */}
          <main role="main" style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "28px", background: "transparent" }}>
            <div style={{
              padding: "28px",
              minHeight: "100%", boxSizing: "border-box",
            }}>
              <div style={{ maxWidth: 2000, margin: "0 auto" }}>
                <ViewRouter state={state} dispatch={dispatch} clinicaId={clinicaId} clinica={clinica} clinicaRol={clinicaRol} clinicaLoading={clinicaLoading} refrescarClinica={refrescarClinica} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}