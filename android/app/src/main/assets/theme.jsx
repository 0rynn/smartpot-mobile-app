// theme.jsx — design tokens (light/dark), icon set, status helpers
// Exposes: SP_LIGHT, SP_DARK, ThemeCtx, useTheme, Icon, statusHelpers

const SP_LIGHT = {
  name: 'light',
  bg: '#eef3ef',
  bgGrad: 'linear-gradient(180deg,#f1f6f2 0%,#e9efea 100%)',
  surface: '#ffffff',
  surfaceMuted: '#f4f7f5',
  card: '#ffffff',
  cardBorder: 'rgba(20,40,30,0.07)',
  cardShadow: '0 1px 2px rgba(20,40,30,0.05), 0 8px 24px -12px rgba(20,40,30,0.16)',
  primary: '#159a57',
  primaryDeep: '#0f7b44',
  primarySoft: '#e4f3ea',
  primaryGrad: 'linear-gradient(135deg,#1aa45f 0%,#0e7a43 100%)',
  onPrimary: '#ffffff',
  text: '#15231c',
  textSec: '#5a6b62',
  textMuted: '#93a199',
  hair: 'rgba(20,40,30,0.08)',
  // sensor accents
  temp: '#e8596f',
  tempSoft: '#fde8ec',
  light: '#e9a40c',
  lightSoft: '#fdf2d8',
  water: '#2596d8',
  waterSoft: '#e0f0fb',
  pump: '#2596d8',
  // status
  good: '#159a57',
  warn: '#e9920c',
  bad: '#e8485f',
  info: '#2596d8',
  statusBarIconsDark: true,
};

const SP_DARK = {
  name: 'dark',
  bg: '#0d1411',
  bgGrad: 'linear-gradient(180deg,#0e1613 0%,#0b120f 100%)',
  surface: '#161f1a',
  surfaceMuted: '#131b17',
  card: '#18221d',
  cardBorder: 'rgba(255,255,255,0.06)',
  cardShadow: '0 1px 2px rgba(0,0,0,0.4), 0 12px 30px -16px rgba(0,0,0,0.7)',
  primary: '#2fcf7d',
  primaryDeep: '#1aa45f',
  primarySoft: 'rgba(47,207,125,0.14)',
  primaryGrad: 'linear-gradient(135deg,#15784a 0%,#0c5234 100%)',
  onPrimary: '#04140c',
  text: '#e9f1ec',
  textSec: '#a3b3aa',
  textMuted: '#6f817a',
  hair: 'rgba(255,255,255,0.07)',
  temp: '#ff7088',
  tempSoft: 'rgba(255,112,136,0.15)',
  light: '#f5b525',
  lightSoft: 'rgba(245,181,37,0.15)',
  water: '#46abe8',
  waterSoft: 'rgba(70,171,232,0.15)',
  pump: '#46abe8',
  good: '#2fcf7d',
  warn: '#f5b525',
  bad: '#ff6076',
  info: '#46abe8',
  statusBarIconsDark: false,
};

const ThemeCtx = React.createContext(SP_LIGHT);
const useTheme = () => React.useContext(ThemeCtx);

// ── Icon set (Lucide-style stroke icons) ─────────────────────────────
const ICON_PATHS = {
  leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></>,
  thermometer: <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
  droplet: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5 12 2.5C11.5 5 10 7.4 8 9.5S5 13 5 15a7 7 0 0 0 7 7Z"/>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/></>,
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>,
  power: <><path d="M12 2v10"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/></>,
  refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
  chevron: <path d="M9 18l6-6-6-6"/>,
  wifi: <><path d="M5 12.55a11 11 0 0 1 14 0M8.5 16.1a6 6 0 0 1 7 0M2 8.8a16 16 0 0 1 20 0"/><path d="M12 20h.01"/></>,
  cloudoff: <><path d="M3 3l18 18"/><path d="M5.8 5.8A6 6 0 0 0 8 17h10a4 4 0 0 0 1.9-7.5"/></>,
  flask: <path d="M9 3h6M10 3v6L5.6 16.2A2 2 0 0 0 7.3 19h9.4a2 2 0 0 0 1.7-2.8L14 9V3"/>,
  gauge: <><path d="M12 14l4-4"/><path d="M3.3 17a9 9 0 1 1 17.4 0"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  x: <path d="M18 6 6 18M6 6l12 12"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></>,
  building: <><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></>,
  sprout: <><path d="M7 20h10"/><path d="M12 20c0-7 0-9-3-11"/><path d="M12 13c0-3 1.5-5 5-5 0 3-2 5-5 5Z"/><path d="M12 11C9 11 7 9 7 6c3 0 5 2 5 5Z"/></>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.5"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="M21 15l-5-5L5 21"/></>,
  scan: <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>,
  sparkles: <><path d="M12 3l1.7 4.8L18.5 9.5 13.7 11.2 12 16l-1.7-4.8L5.5 9.5l4.8-1.7L12 3Z"/><path d="M19 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"/></>,
  trash: <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>,
};

function Icon({ name, size = 24, color = 'currentColor', stroke = 2, fill = 'none', style }) {
  const p = ICON_PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}>
      {p}
    </svg>
  );
}

// ── Status helpers (ported from the original app) ────────────────────
function waterStatus(p, t) {
  if (p < 10) return { label: 'Empty', color: t.bad, level: 'bad' };
  if (p < 30) return { label: 'Low', color: t.warn, level: 'warn' };
  if (p < 70) return { label: 'Medium', color: t.light, level: 'ok' };
  return { label: 'Good', color: t.good, level: 'good' };
}
function lightStatus(lux, t) {
  if (lux < 100) return { label: 'Too Dark', color: t.bad, level: 'bad' };
  if (lux < 500) return { label: 'Low Light', color: t.warn, level: 'warn' };
  if (lux < 1000) return { label: 'Moderate', color: t.light, level: 'ok' };
  if (lux < 5000) return { label: 'Bright', color: t.good, level: 'good' };
  return { label: 'Very Bright', color: t.info, level: 'good' };
}
function tempStatus(c, t) {
  if (c == null) return { label: '—', color: t.textMuted, level: 'ok' };
  if (c < 12) return { label: 'Cold', color: t.info, level: 'warn' };
  if (c < 18) return { label: 'Cool', color: t.good, level: 'ok' };
  if (c <= 28) return { label: 'Ideal', color: t.good, level: 'good' };
  if (c <= 33) return { label: 'Warm', color: t.warn, level: 'warn' };
  return { label: 'Hot', color: t.bad, level: 'bad' };
}

Object.assign(window, {
  SP_LIGHT, SP_DARK, ThemeCtx, useTheme, Icon,
  waterStatus, lightStatus, tempStatus,
});
