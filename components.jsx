// components.jsx — reusable UI pieces
// Exposes: SensorTile, BigSensor, AreaChart, Segmented, Switch, ConnChip,
//          PumpControl, AlertRow, Toast, Ring

// Brand wordmark. The logo art is built for light backgrounds, so it sits on a
// white plate that stays legible on the green header and in dark mode.
function Logo({ height = 26, plate = true, plateBg = '#ffffff' }) {
  const img = <img src="assets/smartpot-logo.png" alt="SmartPot" style={{ height, display: 'block', width: 'auto' }} />;
  if (!plate) return img;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', background: plateBg,
      borderRadius: 12, padding: `${Math.round(height * 0.34)}px ${Math.round(height * 0.55)}px`,
      boxShadow: '0 2px 8px rgba(20,40,30,0.18)',
    }}>{img}</div>
  );
}

function ConnChip({ conn }) {
  const t = useTheme();
  const map = {
    live: { c: t.good, label: 'Live', icon: 'wifi' },
    demo: { c: t.warn, label: 'Demo data', icon: 'cloudoff' },
    connecting: { c: t.textMuted, label: 'Connecting…', icon: 'wifi' },
  };
  const m = map[conn] || map.connecting;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px 5px 8px', borderRadius: 999,
      background: t.name === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(20,40,30,0.05)',
      border: `1px solid ${t.hair}`,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: 999, background: m.c,
        boxShadow: conn === 'live' ? `0 0 0 3px ${m.c}33` : 'none',
        animation: conn === 'live' ? 'sp-pulse 1.8s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: t.textSec, letterSpacing: 0.1 }}>{m.label}</span>
    </div>
  );
}

// Circular progress ring
function Ring({ value, max = 100, size = 56, stroke = 6, color, track }) {
  const t = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || t.hair} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)' }} />
    </svg>
  );
}

// Small sensor tile (grid)
function SensorTile({ icon, accent, accentSoft, label, value, unit, status }) {
  const t = useTheme();
  return (
    <div style={{
      background: t.card, borderRadius: 20, padding: 16,
      border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow,
      display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: accentSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={22} color={accent} stroke={2.2} />
        </div>
        {status && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: status.color,
            background: t.name === 'dark' ? 'transparent' : status.color + '14',
            border: t.name === 'dark' ? `1px solid ${status.color}44` : 'none',
            padding: '3px 8px', borderRadius: 999, letterSpacing: 0.2,
          }}>{status.label}</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 13, color: t.textSec, fontWeight: 600, marginBottom: 3 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: t.text, letterSpacing: -0.5, lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ fontSize: 14, fontWeight: 600, color: t.textMuted }}>{unit}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Smooth SVG area chart ────────────────────────────────────────────
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function AreaChart({ data, color, height = 150, unit = '', decimals = 0 }) {
  const t = useTheme();
  const W = 320, H = height, padT = 12, padB = 14, padX = 4;
  const id = React.useMemo(() => 'g' + Math.random().toString(36).slice(2, 8), []);
  if (!data || data.length < 2) {
    return <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 13 }}>No data yet</div>;
  }
  const vals = data;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const lo = min - span * 0.12, hi = max + span * 0.12;
  const rng = hi - lo || 1;
  const n = vals.length;
  const pts = vals.map((v, i) => ({
    x: padX + (i / (n - 1)) * (W - padX * 2),
    y: padT + (1 - (v - lo) / rng) * (H - padT - padB),
  }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[n - 1].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`;
  const last = pts[n - 1];
  const fmt = (x) => x.toFixed(decimals);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.5].map((g, i) => (
        <line key={i} x1={padX} x2={W - padX} y1={padT + g * (H - padT - padB)} y2={padT + g * (H - padT - padB)}
          stroke={t.hair} strokeWidth="1" strokeDasharray="3 4" />
      ))}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4.5" fill={color} stroke={t.card} strokeWidth="2.5" />
      <text x={padX} y={11} fill={t.textMuted} fontSize="10" fontWeight="600" fontFamily="inherit">{fmt(max)}{unit}</text>
      <text x={padX} y={H - 3} fill={t.textMuted} fontSize="10" fontWeight="600" fontFamily="inherit">{fmt(min)}{unit}</text>
    </svg>
  );
}

// Segmented control
function Segmented({ options, value, onChange }) {
  const t = useTheme();
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4, borderRadius: 14,
      background: t.surfaceMuted, border: `1px solid ${t.hair}`,
    }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: '9px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: active ? t.card : 'transparent',
            color: active ? t.primary : t.textSec,
            fontSize: 13, fontWeight: active ? 800 : 700, fontFamily: 'inherit',
            boxShadow: active ? t.cardShadow : 'none',
            transition: 'all .2s ease',
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// iOS-ish switch
function Switch({ on, onChange }) {
  const t = useTheme();
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 50, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 3,
      background: on ? t.primary : (t.name === 'dark' ? '#39443e' : '#d6ded8'),
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start',
      transition: 'background .25s ease', flexShrink: 0,
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 999, background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'all .25s ease',
      }} />
    </button>
  );
}

// ── Pump control ─────────────────────────────────────────────────────
function PumpControl({ mode, onWater, watering, secondsLeft }) {
  const t = useTheme();
  const auto = mode === 'auto';
  const subtitle = watering
    ? `Dispensing · ${secondsLeft}s left`
    : auto ? 'Waters when soil is dry' : 'Tap to water now';
  return (
    <div style={{
      background: watering ? t.primaryGrad : t.card, borderRadius: 22, padding: 18,
      border: `1px solid ${watering ? 'transparent' : t.cardBorder}`,
      boxShadow: t.cardShadow, transition: 'background .4s ease',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
        background: watering ? 'rgba(255,255,255,0.18)' : t.waterSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <Icon name="droplet" size={26} color={watering ? '#fff' : t.water} stroke={2.2}
          fill={watering ? 'rgba(255,255,255,0.25)' : 'none'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: watering ? '#fff' : t.text }}>
          {watering ? 'Watering…' : 'Water Pump'}
        </div>
        <div style={{ fontSize: 13, color: watering ? 'rgba(255,255,255,0.85)' : t.textSec, fontWeight: 500 }}>
          {subtitle}
        </div>
      </div>
      {watering ? (
        <div style={{
          padding: '11px 18px', borderRadius: 14, background: 'rgba(255,255,255,0.22)',
          color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
        }}>
          <Icon name="clock" size={17} color="#fff" stroke={2.4} /> On
        </div>
      ) : auto ? (
        <div style={{
          padding: '11px 16px', borderRadius: 14, background: t.primarySoft,
          color: t.primary, fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
        }}>
          <Icon name="refresh" size={16} color={t.primary} stroke={2.4} /> Auto
        </div>
      ) : (
        <button onClick={onWater} style={{
          padding: '11px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: t.primary, color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, transition: 'all .2s',
        }}>
          <Icon name="power" size={17} color="#fff" stroke={2.4} /> Water
        </button>
      )}
    </div>
  );
}

// Alert row
function AlertRow({ alert, onDismiss }) {
  const t = useTheme();
  const colorFor = { bad: t.bad, warn: t.warn, info: t.info, good: t.good };
  const iconFor = { bad: 'alert', warn: 'alert', info: 'info', good: 'check' };
  const c = colorFor[alert.sev] || t.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 13, padding: 14,
      background: t.card, borderRadius: 16, border: `1px solid ${t.cardBorder}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: t.name === 'dark' ? c + '22' : c + '14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={iconFor[alert.sev]} size={19} color={c} stroke={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 2 }}>{alert.title}</div>
        <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.4 }}>{alert.body}</div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6, fontWeight: 600 }}>{alert.time}</div>
      </div>
      {onDismiss && (
        <button onClick={() => onDismiss(alert.id)} style={{
          border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, color: t.textMuted,
        }}>
          <Icon name="x" size={16} stroke={2.4} />
        </button>
      )}
    </div>
  );
}

// Transient toast
function Toast({ toast }) {
  const t = useTheme();
  if (!toast) return null;
  const colorFor = { bad: t.bad, warn: t.warn, info: t.info, good: t.good };
  const c = colorFor[toast.sev] || t.info;
  return (
    <div style={{
      position: 'absolute', left: 14, right: 14, top: 8, zIndex: 60,
      display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px',
      background: t.name === 'dark' ? '#222e28' : '#15231c',
      borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
      animation: 'sp-toast .35s cubic-bezier(.2,.9,.2,1)',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: c, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{toast.title}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>{toast.body}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Logo, ConnChip, Ring, SensorTile, AreaChart, Segmented, Switch, PumpControl, AlertRow, Toast,
});
