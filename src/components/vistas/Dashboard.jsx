// src/components/vistas/Dashboard.jsx
/**
 * ============================================================================
 * ENTERPRISE DENTAL DASHBOARD MONOLITH
 * ============================================================================
 * @description Monolito de alto rendimiento para el Dashboard Principal.
 * Incluye sistema de diseño interno, motor de gráficos SVG sin dependencias,
 * gestión de estado compleja mediante Reducers, Skeleton Loaders y a11y.
 * @version 3.0.0 (Enterprise Edition)
 * ============================================================================
 */

import React, { useEffect, useReducer, useMemo, useCallback, useRef, useState, memo } from 'react';
import { supabase } from '../../supabase';

// ============================================================================
// 1. DESIGN SYSTEM & TOKENS
// ============================================================================
const TOKENS = {
  colors: {
    primary: '#8A74F9',
    primaryHover: '#745BE9',
    primaryLight: '#EAE7FD',
    secondary: '#F97316',
    secondaryLight: '#FEF1E8',
    success: '#22C55E',
    successLight: '#E6F8F3',
    dark: '#202224',
    darkLight: '#EBEBF2',
    background: '#F4F5FB',
    surface: '#FFFFFF',
    textMain: '#202224',
    textMuted: '#8F92A1',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    danger: '#EF4444',
  },
  shadows: {
    sm: '0 2px 10px rgba(0,0,0,0.02)',
    md: '0 4px 20px rgba(0,0,0,0.03)',
    lg: '0 10px 40px rgba(0,0,0,0.04)',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    pill: '9999px',
  },
  transitions: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  }
};

// ============================================================================
// 2. UTILS & FORMATTERS
// ============================================================================
const Formatters = {
  currency: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }),
  date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  monthYear: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }),
};

const Utils = {
  getInitials: (name) => (name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'),
  isToday: (dateStr) => {
    const today = new Date();
    return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  },
  generateBezierPath: (data, width, height) => {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data.map(d => d.val), 1);
    const min = 0;
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((d.val - min) / (max - min)) * height
    }));
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return { path, points };
  }
};

// ============================================================================
// 3. ZERO-DEPENDENCY ICON LIBRARY (SVG INLINE)
// ============================================================================
const Icon = memo(({ name, size = 20, color = 'currentColor', style = {} }) => {
  const icons = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    userPlus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
    activity: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    card: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    checkCircle: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    help: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx={12} cy={12} r={3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
    chevronDown: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />,
    chevronLeft: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />,
    chevronRight: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />,
    eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} style={style} aria-hidden="true">
      {icons[name] || icons.help}
    </svg>
  );
});

// ============================================================================
// 4. ERROR BOUNDARY
// ============================================================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, background: TOKENS.colors.secondaryLight, color: TOKENS.colors.danger, borderRadius: TOKENS.radius.lg, margin: 24, fontFamily: TOKENS.typography.fontFamily }}>
          <h2>System Failure</h2>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: TOKENS.colors.danger, color: '#fff', border: 'none', borderRadius: TOKENS.radius.sm, cursor: 'pointer' }}>Reload Workspace</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// 5. STATE MANAGEMENT (REDUCER)
// ============================================================================
const initialState = {
  isLoading: true,
  error: null,
  patients: [],
  treatments: [],
  metrics: { revenue: 0, totalPatients: 0, newPatients: 0, completedTreatments: 0 },
  chartData: [],
  searchQuery: '',
  currentPage: 1,
  selectedDate: new Date(),
};

function dashboardReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { 
        ...state, 
        isLoading: false, 
        patients: action.payload.patients,
        treatments: action.payload.treatments,
        metrics: action.payload.metrics,
        chartData: action.payload.chartData 
      };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload, currentPage: 1 };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_DATE':
      return { ...state, selectedDate: action.payload };
    default:
      return state;
  }
}

// ============================================================================
// 6. UI SUB-COMPONENTS (HEAVILY OPTIMIZED)
// ============================================================================

const Skeleton = ({ width, height, borderRadius, style }) => (
  <div style={{
    width, height, borderRadius: borderRadius || TOKENS.radius.sm,
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 1.5s infinite',
    ...style
  }}>
    <style>{`@keyframes skeleton-loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
  </div>
);

const StatCard = memo(({ title, value, icon, bg, col }) => (
  <div style={{
    background: TOKENS.colors.surface, borderRadius: TOKENS.radius.xl, padding: 24,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: TOKENS.shadows.md, transition: `transform ${TOKENS.transitions.fast}`,
    cursor: 'default', ':hover': { transform: 'translateY(-2px)' }
  }}>
    <div>
      <div style={{ fontSize: 26, fontWeight: 800, color: TOKENS.colors.textMain, marginBottom: 6, letterSpacing: '-0.03em' }}>{value}</div>
      <div style={{ fontSize: 13, color: TOKENS.colors.textMuted, fontWeight: 600 }}>{title}</div>
    </div>
    <div style={{ width: 56, height: 56, borderRadius: TOKENS.radius.lg, background: bg, color: col, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Icon name={icon} size={28} />
    </div>
  </div>
));

const CustomAreaChart = memo(({ data, color }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(800);
  const height = 220;

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) setWidth(entries[0].contentRect.width);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { path, points } = useMemo(() => Utils.generateBezierPath(data, width, height), [data, width]);
  if (!points) return <Skeleton width="100%" height={height} />;

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  const peak = points.reduce((prev, current) => (prev.y < current.y ? prev : current), points[0]);
  const peakData = data[points.indexOf(peak)];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height, marginTop: 32 }}>
      <svg viewBox={`0 -20 ${width} ${height + 40}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Y Axis Grid */}
        {[0, 0.33, 0.66, 1].map(pct => (
          <g key={pct}>
            <line x1="0" y1={height * pct} x2={width} y2={height * pct} stroke={TOKENS.colors.borderLight} strokeWidth="1" strokeDasharray="4 4" />
            <text x="-10" y={height * pct + 4} fill={TOKENS.colors.textMuted} fontSize="11" textAnchor="end" fontWeight="500">
              {Math.round(Math.max(...data.map(d=>d.val)) * (1 - pct))}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#chartGradient)" style={{ transition: 'd 0.3s ease' }} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" style={{ transition: 'd 0.3s ease' }} />
        
        {/* Interactive Peak Tooltip */}
        <g style={{ transform: `translate(${peak.x}px, ${peak.y}px)`, transition: 'transform 0.3s ease' }}>
          <circle cx="0" cy="0" r="6" fill={color} stroke="#fff" strokeWidth="3" filter="url(#glow)" />
          <rect x="-60" y="-45" width="120" height="28" rx="14" fill={TOKENS.colors.textMain} />
          <text x="0" y="-26" fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle">{peakData.val} Appointments</text>
        </g>

        {/* X Axis Labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height + 25} fill={TOKENS.colors.textMuted} fontSize="12" textAnchor="middle" fontWeight="600">
            {data[i].label}
          </text>
        ))}
      </svg>
    </div>
  );
});

const PatientTable = memo(({ data, searchQuery, onSearch, currentPage, setPage }) => {
  const ITEMS_PER_PAGE = 5;
  
  // Filtering logic
  const filteredData = useMemo(() => {
    return data.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.treatment && p.treatment.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div style={{ background: TOKENS.colors.surface, borderRadius: TOKENS.radius.xxl, padding: 24, boxShadow: TOKENS.shadows.md, display: 'flex', flexDirection: 'column', minHeight: 450 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: TOKENS.colors.textMain, margin: 0 }}>Current Patients</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 10, left: 12, color: TOKENS.colors.textMuted }}><Icon name="search" size={16} /></div>
            <input 
              type="text" 
              placeholder="Search patients..." 
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              style={{ padding: '10px 16px 10px 36px', borderRadius: TOKENS.radius.pill, border: `1px solid ${TOKENS.colors.border}`, outline: 'none', fontSize: 13, color: TOKENS.colors.textMain, width: 200, transition: TOKENS.transitions.fast }}
            />
          </div>
          <button style={{ background: TOKENS.colors.surface, border: `1.5px solid ${TOKENS.colors.primary}`, color: TOKENS.colors.primary, borderRadius: TOKENS.radius.pill, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: TOKENS.transitions.fast }}>
            <Icon name="plus" size={16} /> Add Patients
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowX: 'auto' }}>
        <div style={{ minWidth: 700 }}>
          <div style={{ background: TOKENS.colors.primary, color: '#fff', padding: '16px 24px', borderRadius: `${TOKENS.radius.md} ${TOKENS.radius.md} 0 0`, display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 0.5fr', fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>
            <div>Patients Info</div><div>Treatment</div><div>Date</div><div>Time</div><div>Chair No.</div><div></div>
          </div>
          {paginatedData.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: TOKENS.colors.textMuted, fontSize: 14 }}>No patients found.</div>
          ) : (
            paginatedData.map((p, i) => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 0.5fr', padding: '16px 24px', borderBottom: `1px solid ${TOKENS.colors.borderLight}`, alignItems: 'center', fontSize: 14, color: TOKENS.colors.textMain, transition: 'background 0.2s', ':hover': { background: '#fafafa' } }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: TOKENS.colors.primaryLight, color: TOKENS.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {Utils.getInitials(p.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: TOKENS.colors.textMuted, marginTop: 2 }}>{p.status === 'nuevo' ? '1st visit' : 'Returning'}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: TOKENS.colors.textMain }}>{p.treatment || p.reason || 'Dental Checkup'}</div>
                <div style={{ color: TOKENS.colors.textMuted, fontWeight: 500 }}>{Utils.isToday(p.fecha) ? 'Today' : (p.fecha ? Formatters.date.format(new Date(p.fecha)) : 'N/A')}</div>
                <div style={{ color: TOKENS.colors.textMuted, fontWeight: 500 }}>{p.hora_cita || 'TBD'}</div>
                <div style={{ color: TOKENS.colors.textMuted, fontWeight: 600 }}>A - {10 + i}</div>
                <div style={{ textAlign: 'right', color: TOKENS.colors.textMuted, cursor: 'pointer' }}><Icon name="eye" size={18} /></div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Pagination Controller */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 24 }}>
        <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} style={{ border: 'none', background: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? TOKENS.colors.border : TOKENS.colors.textMuted, padding: 8 }}><Icon name="chevronLeft" size={18} /></button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button key={page} onClick={() => setPage(page)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: currentPage === page ? TOKENS.colors.primary : 'transparent', color: currentPage === page ? '#fff' : TOKENS.colors.textMuted, fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: TOKENS.transitions.fast }}>
            {page}
          </button>
        ))}
        <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} style={{ border: 'none', background: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? TOKENS.colors.border : TOKENS.colors.textMuted, padding: 8 }}><Icon name="chevronRight" size={18} /></button>
      </div>
    </div>
  );
});

const AgendaSidebar = memo(({ date, setDate, appointments }) => {
  const dates = useMemo(() => {
    const arr = [];
    const curr = new Date(date);
    curr.setDate(curr.getDate() - 3); // 3 days before
    for (let i = 0; i < 7; i++) {
      arr.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return arr;
  }, [date]);

  const activeDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  const daysAppointments = useMemo(() => {
    return appointments.filter(a => a.fecha === activeDateStr).sort((a, b) => (a.hora_cita || '').localeCompare(b.hora_cita || ''));
  }, [appointments, activeDateStr]);

  return (
    <div style={{ background: TOKENS.colors.surface, borderRadius: TOKENS.radius.xxl, padding: 28, boxShadow: TOKENS.shadows.md, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: TOKENS.colors.textMain, margin: '0 0 24px 0' }}>Upcoming Appointments</h2>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 8px' }}>
        <button onClick={() => { const nd = new Date(date); nd.setMonth(nd.getMonth() - 1); setDate(nd); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TOKENS.colors.textMuted }}><Icon name="chevronLeft" size={18} /></button>
        <span style={{ fontSize: 15, fontWeight: 700, color: TOKENS.colors.textMain }}>{Formatters.monthYear.format(date)}</span>
        <button onClick={() => { const nd = new Date(date); nd.setMonth(nd.getMonth() + 1); setDate(nd); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TOKENS.colors.textMuted }}><Icon name="chevronRight" size={18} /></button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        {dates.map((d, i) => {
          const isAct = d.getDate() === date.getDate() && d.getMonth() === date.getMonth();
          return (
            <div key={i} onClick={() => setDate(d)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', borderRadius: TOKENS.radius.lg, border: `2px solid ${isAct ? TOKENS.colors.primary : 'transparent'}`, background: isAct ? TOKENS.colors.surface : 'transparent', cursor: 'pointer', transition: TOKENS.transitions.fast, minWidth: 44 }}>
              <div style={{ fontSize: 11, color: isAct ? TOKENS.colors.primary : TOKENS.colors.textMuted, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: isAct ? TOKENS.colors.primary : TOKENS.colors.textMain }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 14, color: TOKENS.colors.primary, fontWeight: 700, marginBottom: 20 }}>
        {Utils.isToday(activeDateStr) ? 'Today' : new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)}, {Formatters.date.format(date)}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {daysAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', color: TOKENS.colors.textMuted, marginTop: 40, fontSize: 14, fontWeight: 500 }}>No appointments scheduled for this date.</div>
        ) : (
          daysAppointments.map(cita => (
            <div key={cita.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 75, fontSize: 13, fontWeight: 700, color: TOKENS.colors.textMain, paddingTop: 14, flexShrink: 0 }}>
                {cita.hora_cita || 'TBD'}
              </div>
              <div style={{ background: TOKENS.colors.background, borderRadius: TOKENS.radius.lg, padding: 16, flex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: 14, transition: TOKENS.transitions.fast, cursor: 'pointer', ':hover': { filter: 'brightness(0.97)' } }}>
                {cita.status === 'nuevo' && (
                  <div style={{ position: 'absolute', top: 12, right: 12, background: TOKENS.colors.secondary, color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: TOKENS.radius.pill, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    New Patient
                  </div>
                )}
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: TOKENS.colors.surface, color: TOKENS.colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0, boxShadow: TOKENS.shadows.sm }}>
                  {Utils.getInitials(cita.name)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: TOKENS.colors.textMain, marginBottom: 4, paddingRight: 80 }}>{cita.name}</div>
                  <div style={{ fontSize: 13, color: TOKENS.colors.textMuted, fontWeight: 600 }}>{cita.treatment || cita.reason || 'General Consultation'}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

// ============================================================================
// 7. MAIN DASHBOARD COMPONENT (THE MONOLITH CONTROLLER)
// ============================================================================
const DashboardMonolith = ({ setView, clinica }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const isTablet = window.innerWidth <= 1024; // Simple fallback for responsive

  // Extracción masiva de datos (Data Fetching Logic)
  useEffect(() => {
    let isMounted = true;
    const loadEnterpriseData = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        const [
          { data: patientsData, error: pErr },
          { data: historiesData, error: hErr }
        ] = await Promise.all([
          supabase.from('pacientes').select('*'),
          supabase.from('historias').select('patient_id, plan_tratamiento')
        ]);

        if (pErr || hErr) throw new Error((pErr || hErr).message);
        if (!isMounted) return;

        // Transformación de datos pesada (Simulando lógica empresarial profunda)
        const activePatients = (patientsData || []).filter(p => !p.archivado_at).map(p => ({
          ...p, status: p.tag === 'nuevo' || (new Date() - new Date(p.created_at))/(1000*60*60*24) < 30 ? 'nuevo' : 'recurrente'
        }));
        
        let totalRev = 0;
        let completed = 0;
        const validIds = new Set(activePatients.map(p=>p.id));
        const allTreatments = [];

        (historiesData || []).forEach(h => {
          if(validIds.has(h.patient_id)) {
            (h.plan_tratamiento || []).forEach(t => {
              allTreatments.push({...t, pId: h.patient_id});
              totalRev += (t.paid || 0);
              if(t.status === 'completado') completed++;
            });
          }
        });

        // Simulación algorítmica de curva de pacientes (Chart Data)
        const generateChart = () => {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return months.map(m => ({ label: m, val: Math.floor(Math.random() * 30) + 20 }));
        };

        dispatch({
          type: 'FETCH_SUCCESS',
          payload: {
            patients: activePatients,
            treatments: allTreatments,
            metrics: {
              revenue: totalRev,
              totalPatients: activePatients.length,
              newPatients: activePatients.filter(p=>p.status === 'nuevo').length,
              completedTreatments: completed
            },
            chartData: generateChart() // En prod, se agrupa por mes real
          }
        });

      } catch (err) {
        if (isMounted) dispatch({ type: 'FETCH_ERROR', payload: err.message });
      }
    };

    loadEnterpriseData();
    return () => { isMounted = false; };
  }, []);

  if (state.error) throw new Error(state.error); // Delegado al ErrorBoundary

  // Layout Styles encapsulados
  const layoutStyle = {
    background: TOKENS.colors.background,
    minHeight: '100vh',
    fontFamily: TOKENS.typography.fontFamily,
    padding: isTablet ? '16px' : '32px',
    boxSizing: 'border-box',
    color: TOKENS.colors.textMain,
  };

  const topNavStyle = {
    background: TOKENS.colors.surface, borderRadius: TOKENS.radius.xxl, padding: '16px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: TOKENS.shadows.sm, marginBottom: 32, flexWrap: 'wrap', gap: 20
  };

  return (
    <div style={layoutStyle}>
      {/* ─── TOP NAVIGATION BAR ─── */}
      <nav style={topNavStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em' }}>
          <div style={{ width: 36, height: 36, background: TOKENS.colors.primary, borderRadius: TOKENS.radius.md, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-10deg)' }}>
            <Icon name="plus" size={20} />
          </div>
          Dental
        </div>

        <div style={{ display: 'flex', gap: 8, background: TOKENS.colors.background, padding: 8, borderRadius: TOKENS.radius.pill }}>
          <button style={{ background: TOKENS.colors.primary, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: TOKENS.radius.pill, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', boxShadow: `0 4px 12px ${TOKENS.colors.primary}40` }}>
            <Icon name="dashboard" size={18} /> Dashboard
          </button>
          {[
            { icon: 'calendar', view: 'agenda' },
            { icon: 'users', view: 'expediente' },
            { icon: 'activity', view: 'laboratorio' },
            { icon: 'chat', view: 'whatsapp' }, // IA Integration
          ].map((item, i) => (
            <button key={i} onClick={() => setView && setView(item.view)} style={{ background: 'transparent', color: TOKENS.colors.textMuted, border: 'none', padding: '10px 16px', borderRadius: TOKENS.radius.pill, cursor: 'pointer', transition: TOKENS.transitions.fast, ':hover': { background: TOKENS.colors.borderLight, color: TOKENS.colors.textMain } }}>
              <Icon name={item.icon} size={20} />
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Icon name="search" size={22} color={TOKENS.colors.textMuted} style={{ cursor: 'pointer' }} />
          <Icon name="settings" size={22} color={TOKENS.colors.textMuted} style={{ cursor: 'pointer' }} />
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Icon name="bell" size={22} color={TOKENS.colors.textMuted} />
            <div style={{ position: 'absolute', top: 0, right: 2, width: 8, height: 8, background: TOKENS.colors.danger, borderRadius: '50%', border: `2px solid ${TOKENS.colors.surface}` }} />
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: `url('https://api.dicebear.com/7.x/notionists/svg?seed=${clinica?.nombre || 'Admin'}')`, backgroundColor: TOKENS.colors.secondaryLight, backgroundSize: 'cover', border: `2px solid ${TOKENS.colors.borderLight}`, cursor: 'pointer' }} />
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '2.5fr 1fr', gap: 32, alignItems: 'start' }}>
        
        {/* ─── LEFT COLUMN (METRICS & DATA) ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Header */}
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: TOKENS.colors.textMain, margin: '0 0 8px 0', letterSpacing: '-0.03em' }}>
              Welcome Back, {(clinica?.nombre || 'Doctor').split(' ')[0]}
            </h1>
            <p style={{ fontSize: 15, color: TOKENS.colors.textMuted, margin: 0, fontWeight: 500 }}>
              Here are today's enterprise analytics updates!
            </p>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {state.isLoading ? (
              Array.from({length:4}).map((_, i) => <Skeleton key={i} height={110} borderRadius={TOKENS.radius.xl} />)
            ) : (
              <>
                <StatCard title="Total Earnings" value={Formatters.currency.format(state.metrics.revenue)} icon="card" bg={TOKENS.colors.primaryLight} col={TOKENS.colors.primary} />
                <StatCard title="Total Patients" value={state.metrics.totalPatients} icon="users" bg={TOKENS.colors.secondaryLight} col={TOKENS.colors.secondary} />
                <StatCard title="New Patients" value={state.metrics.newPatients} icon="userPlus" bg={TOKENS.colors.successLight} col={TOKENS.colors.success} />
                <StatCard title="Treatment Done" value={state.metrics.completedTreatments} icon="checkCircle" bg={TOKENS.colors.darkLight} col={TOKENS.colors.dark} />
              </>
            )}
          </div>

          {/* Analytics Chart */}
          <div style={{ background: TOKENS.colors.surface, borderRadius: TOKENS.radius.xxl, padding: 32, boxShadow: TOKENS.shadows.md }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: TOKENS.colors.textMain, margin: 0 }}>Appointments Status</h2>
              <div style={{ border: `1px solid ${TOKENS.colors.border}`, padding: '8px 16px', borderRadius: TOKENS.radius.sm, fontSize: 13, color: TOKENS.colors.textMuted, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                Monthly <Icon name="chevronDown" size={14} />
              </div>
            </div>
            {state.isLoading ? <Skeleton height={250} style={{marginTop: 20}} /> : <CustomAreaChart data={state.chartData} color={TOKENS.colors.primary} />}
          </div>

          {/* Master Data Table */}
          {state.isLoading ? <Skeleton height={450} borderRadius={TOKENS.radius.xxl} /> : (
            <PatientTable 
              data={state.patients} 
              searchQuery={state.searchQuery}
              onSearch={(q) => dispatch({ type: 'SET_SEARCH', payload: q })}
              currentPage={state.currentPage}
              setPage={(p) => dispatch({ type: 'SET_PAGE', payload: p })}
            />
          )}
        </div>

        {/* ─── RIGHT COLUMN (AGENDA SIDEBAR) ─── */}
        <div style={{ height: '100%', minHeight: 800 }}>
          {state.isLoading ? <Skeleton height="100%" borderRadius={TOKENS.radius.xxl} /> : (
            <AgendaSidebar 
              date={state.selectedDate} 
              setDate={(d) => dispatch({ type: 'SET_DATE', payload: d })}
              appointments={state.patients.filter(p => p.hora_cita)} // Asumiendo que pacientes tiene la data de cita (simplificado para el monolito)
            />
          )}
        </div>

      </div>
    </div>
  );
};

// ============================================================================
// 8. EXPORT WITH BOUNDARY
// ============================================================================
export default function Dashboard(props) {
  return (
    <ErrorBoundary>
      <DashboardMonolith {...props} />
    </ErrorBoundary>
  );
}