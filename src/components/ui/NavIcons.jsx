// src/components/ui/NavIcons.jsx
// Íconos de navegación, de lucide-react. Se centraliza el mapa acá (en vez de
// importar lucide en cada vista) para que el grosor de trazo y el tamaño sean
// idénticos en toda la app: un solo lugar donde cambiarlos.
//
// Nota: los íconos de dentro de las vistas siguen viniendo de ui/Icon.jsx. Este
// mapa cubre sólo el riel de navegación y el chrome del shell.
import React from 'react';
import {
  LayoutDashboard, CalendarDays, FolderOpen,
  Wallet, FlaskConical, Smile, MessageCircle, Settings,
  Search, Bell, Plus, PanelLeft, ChevronDown, Sun, Moon,
  Gauge, Radio, ListOrdered, BookOpen, Tag, Users, Star,
  Landmark, Banknote, Receipt, Store, CreditCard, Share2,
} from 'lucide-react';

// Trazo fino y uniforme, como pide el lenguaje visual.
const STROKE = 1.5;

const MAPA = {
  dashboard:   LayoutDashboard,
  agenda:      CalendarDays,
  expediente:  FolderOpen,
  caja:        Wallet,
  laboratorio: FlaskConical,
  ortodoncia:  Smile,
  whatsapp:    MessageCircle,
  config:      Settings,
  // Secciones nuevas (placeholder, referencia "Confidency OS") -- ver
  // App.jsx SIDEBAR_SECTIONS, grupos Command/Commerce/Finance/Platform.
  overview:      Gauge,
  liveMonitor:   Radio,
  alerts:        Bell,
  orderQueue:    ListOrdered,
  catalog:       BookOpen,
  pricingEngine: Tag,
  customers:     Users,
  reviews:       Star,
  revenueDesk:   Landmark,
  payouts:       Banknote,
  taxEngine:     Receipt,
  marketplace:   Store,
  pos:           CreditCard,
  socialChannels: Share2,
  // chrome del shell
  buscar:      Search,
  campana:     Bell,
  mas:         Plus,
  panel:       PanelLeft,
  chevronDown: ChevronDown,
  sol:         Sun,
  luna:        Moon,
};

export default function NavIcon({ name, size = 18, strokeWidth = STROKE, style }) {
  const Cmp = MAPA[name];
  if (!Cmp) return null;
  return <Cmp size={size} strokeWidth={strokeWidth} style={style} aria-hidden="true" />;
}
