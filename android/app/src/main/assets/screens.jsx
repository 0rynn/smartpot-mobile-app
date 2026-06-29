// screens.jsx — HomeScreen, HistoryScreen, SettingsScreen, AlertsSheet
// Exposes them to window.

function PlantHero({ latest, overall }) {
  const t = useTheme();
  const moist = Math.round(latest?.soil_moisture ?? 0);
  return (
    <div style={{
      background: t.primaryGrad, borderRadius: 26, padding: 20,
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 14px 30px -14px ' + (t.name === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(15,123,67,0.5)'),
    }}>
      {/* decorative leaves */}
      <div style={{ position: 'absolute', right: -26, top: -26, opacity: 0.16 }}>
        <Icon name="leaf" size={150} color="#fff" stroke={1.2} />
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', width: 78, height: 78, flexShrink: 0 }}>
          <Ring value={moist} size={78} stroke={7} color="#fff" track="rgba(255,255,255,0.25)" />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="sprout" size={26} color="#fff" stroke={2} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Plant Status
          </div>
          <div style={{ fontSize: 27, fontWeight: 800, color: '#fff', letterSpacing: -0.6, lineHeight: 1.05, marginTop: 3 }}>
            {overall.title}
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 4, fontWeight: 500 }}>
            {overall.body}
          </div>
        </div>
      </div>
      <div style={{
        position: 'relative', display: 'flex', marginTop: 18, paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.18)',
      }}>
        {[
          { k: 'Soil', v: `${moist}%` },
          { k: 'Temp', v: latest?.temperature != null ? `${latest.temperature.toFixed(1)}°` : '—' },
          { k: 'Light', v: latest?.light_lux != null ? `${Math.round(latest.light_lux)}lx` : '—' },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: i === 0 ? 'left' : 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>{s.v}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: 1 }}>{s.k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeScreen({ latest, conn, lastUpdate, overall, onWater, watering, secondsLeft, pumpMode }) {
  const t = useTheme();
  if (!latest) {
    const offline = conn === 'offline';
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, textAlign: 'center' }}>
        {offline ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: t.name === 'dark' ? t.bad + '22' : t.bad + '14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="cloudoff" size={30} color={t.bad} stroke={2} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>SmartPot is offline</div>
            <div style={{ color: t.textSec, fontSize: 13.5, fontWeight: 500, maxWidth: 240, lineHeight: 1.45 }}>
              Waiting for the device to report sensor data. Check that the ESP32 is powered on and connected to Wi-Fi.
            </div>
          </>
        ) : (
          <>
            <div className="sp-spin"><Icon name="refresh" size={34} color={t.primary} /></div>
            <div style={{ color: t.textSec, fontSize: 14, fontWeight: 600 }}>Connecting to SmartPot…</div>
          </>
        )}
      </div>
    );
  }
  const tS = tempStatus(latest.temperature, t);
  const lS = lightStatus(latest.light_lux || 0, t);
  const wS = waterStatus(latest.soil_moisture || 0, t);
  const pumpOn = (latest.pump_status === 'ON') || watering;
  return (
    <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ConnChip conn={conn} />
        <span style={{ fontSize: 11.5, color: t.textMuted, fontWeight: 600 }}>
          {lastUpdate ? `Updated ${lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
        </span>
      </div>

      <PlantHero latest={latest} overall={overall} />

      <PumpControl mode={pumpMode} onWater={onWater} watering={watering} secondsLeft={secondsLeft} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <SensorTile icon="thermometer" accent={t.temp} accentSoft={t.tempSoft} label="Temperature"
          value={latest.temperature != null ? latest.temperature.toFixed(1) : '—'} unit="°C" status={tS} />
        <SensorTile icon="sun" accent={t.light} accentSoft={t.lightSoft} label="Light Level"
          value={latest.light_lux != null ? Math.round(latest.light_lux).toLocaleString() : '—'} unit="lux" status={lS} />
        <SensorTile icon="droplet" accent={t.water} accentSoft={t.waterSoft} label="Soil Moisture"
          value={latest.soil_moisture != null ? Math.round(latest.soil_moisture) : '—'} unit="%" status={wS} />
        <SensorTile icon="power" accent={pumpOn ? t.pump : t.textMuted} accentSoft={pumpOn ? t.waterSoft : t.surfaceMuted}
          label="Pump Status" value={pumpOn ? 'ON' : 'OFF'} unit="" status={{ label: pumpOn ? 'Active' : 'Standby', color: pumpOn ? t.pump : t.textMuted }} />
      </div>

      <div style={{ textAlign: 'center', paddingTop: 6 }}>
        <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 700 }}>Group 24 · Senior Design 2026</div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>UCF Electrical &amp; Computer Engineering</div>
      </div>
    </div>
  );
}

// ── History ──────────────────────────────────────────────────────────
function statsOf(history, key) {
  if (!history.length) return { min: 0, max: 0, avg: 0 };
  const v = history.map((h) => h[key] || 0);
  return { min: Math.min(...v), max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length };
}
function sample(history, key, max = 40) {
  if (!history.length) return [];
  const step = Math.max(1, Math.ceil(history.length / max));
  return history.filter((_, i) => i % step === 0).map((h) => h[key] || 0);
}

// ── Overall plant health score (0–100) ───────────────────────────────
const clamp01 = (x) => Math.max(0, Math.min(100, x));
function scoreTemp(c) {
  if (c == null) return 70;
  if (c >= 18 && c <= 28) return 100;          // ideal band
  if (c < 18) return clamp01(100 - (18 - c) * 7);
  return clamp01(100 - (c - 28) * 7);
}
function scoreMoist(m) {
  if (m == null) return 70;
  if (m >= 40 && m <= 80) return 100;          // ideal band
  if (m < 40) return clamp01(((m - 5) / 35) * 100); // 5%→0, 40%→100
  return clamp01(100 - (m - 80) * 1.5);        // mild over-watering penalty
}
function scoreLight(lux) {
  if (lux == null) return 70;
  if (lux >= 1000) return 100;
  if (lux >= 500) return 70 + ((lux - 500) / 500) * 30;
  if (lux >= 100) return 30 + ((lux - 100) / 400) * 40;
  return clamp01((lux / 100) * 30);
}
// Soil weighted highest (it's the actionable one), then temp, then light.
function healthOf(r) {
  if (!r) return 0;
  const s = scoreMoist(r.soil_moisture), tp = scoreTemp(r.temperature), l = scoreLight(r.light_lux);
  return Math.round(s * 0.4 + tp * 0.32 + l * 0.28);
}
function healthBand(v, t) {
  if (v >= 75) return { label: 'Thriving', color: t.good };
  if (v >= 50) return { label: 'Doing okay', color: t.warn };
  return { label: 'Needs care', color: t.bad };
}

// Dedicated health chart: fixed 0–100 domain with zone bands + value-coloured area.
function HealthChart({ data, color, height = 168 }) {
  const t = useTheme();
  const W = 320, H = height, padT = 10, padB = 16, padX = 4;
  const id = React.useMemo(() => 'h' + Math.random().toString(36).slice(2, 8), []);
  if (!data || data.length < 2) {
    return <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 13 }}>No data yet</div>;
  }
  const yOf = (v) => padT + (1 - v / 100) * (H - padT - padB);
  const n = data.length;
  const pts = data.map((v, i) => ({ x: padX + (i / (n - 1)) * (W - padX * 2), y: yOf(clamp01(v)) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[n - 1].x} ${H - padB} L ${pts[0].x} ${H - padB} Z`;
  const last = pts[n - 1];
  const band75 = yOf(75), band50 = yOf(50);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* health zone guide lines */}
      <line x1={padX} x2={W - padX} y1={band75} y2={band75} stroke={t.good} strokeWidth="1" strokeDasharray="2 5" opacity="0.5" />
      <line x1={padX} x2={W - padX} y1={band50} y2={band50} stroke={t.warn} strokeWidth="1" strokeDasharray="2 5" opacity="0.5" />
      <text x={W - padX} y={band75 - 4} textAnchor="end" fill={t.good} fontSize="9.5" fontWeight="700" fontFamily="inherit" opacity="0.8">Thriving</text>
      <text x={W - padX} y={band50 - 4} textAnchor="end" fill={t.warn} fontSize="9.5" fontWeight="700" fontFamily="inherit" opacity="0.8">Okay</text>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="4.5" fill={color} stroke={t.card} strokeWidth="2.5" />
    </svg>
  );
}

function HealthFactor({ icon, accent, label, score }) {
  const t = useTheme();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <Ring value={score} size={44} stroke={4.5} color={accent} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={17} color={accent} stroke={2.2} />
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{Math.round(score)}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: t.textMuted }}>{label}</div>
    </div>
  );
}

function HealthHero({ history }) {
  const t = useTheme();
  const series = React.useMemo(() => {
    if (!history.length) return [];
    const step = Math.max(1, Math.ceil(history.length / 48));
    return history.filter((_, i) => i % step === 0).map(healthOf);
  }, [history]);
  const latest = history.length ? history[history.length - 1] : null;
  const hasData = history.length > 0;
  const current = healthOf(latest);
  const avg = series.length ? Math.round(series.reduce((a, b) => a + b, 0) / series.length) : 0;
  const band = hasData ? healthBand(current, t) : { label: 'No data', color: t.textMuted };
  return (
    <div style={{
      background: t.card, borderRadius: 22, padding: 18,
      border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: t.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="activity" size={20} color={t.primary} stroke={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, whiteSpace: 'nowrap' }}>Overall Health</div>
            <div style={{ fontSize: 11.5, color: t.textMuted, fontWeight: 600 }}>Composite of all sensors</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: band.color, letterSpacing: -1, lineHeight: 1 }}>{hasData ? current : '—'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textMuted }}>/100</span>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: band.color }}>{band.label}</span>
        </div>
      </div>
      <HealthChart data={series} color={band.color} />
      <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 14, borderTop: `1px solid ${t.hair}` }}>
        <HealthFactor icon="droplet" accent={t.water} label="Soil" score={scoreMoist(latest && latest.soil_moisture)} />
        <HealthFactor icon="thermometer" accent={t.temp} label="Temp" score={scoreTemp(latest && latest.temperature)} />
        <HealthFactor icon="sun" accent={t.light} label="Light" score={scoreLight(latest && latest.light_lux)} />
        <div style={{ width: 1, background: t.hair, margin: '2px 4px' }} />
        <HealthFactor icon="gauge" accent={t.primary} label="Avg" score={avg} />
      </div>
    </div>
  );
}

function ChartCard({ title, icon, accent, accentSoft, series, stats, unit, decimals }) {
  const t = useTheme();
  return (
    <div style={{
      background: t.card, borderRadius: 22, padding: 18,
      border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={accent} stroke={2.2} />
        </div>
        <span style={{ fontSize: 16, fontWeight: 800, color: t.text, whiteSpace: 'nowrap' }}>{title}</span>
      </div>
      <AreaChart data={series} color={accent} unit={unit} decimals={decimals} />
      <div style={{ display: 'flex', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.hair}` }}>
        {[['Min', stats.min], ['Avg', stats.avg], ['Max', stats.max]].map(([k, v], i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 700, marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>
              {decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString()}<span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryScreen({ history, range, setRange }) {
  const t = useTheme();
  const rangeLabel = { '1day': '24 hours', '1week': '7 days', '1month': '30 days' }[range];
  return (
    <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Segmented value={range} onChange={setRange} options={[
        { value: '1day', label: '1 Day' }, { value: '1week', label: '1 Week' }, { value: '1month', label: '1 Month' },
      ]} />
      <HealthHero history={history} />
      <ChartCard title="Temperature" icon="thermometer" accent={t.temp} accentSoft={t.tempSoft}
        series={sample(history, 'temperature')} stats={statsOf(history, 'temperature')} unit="°" decimals={1} />
      <ChartCard title="Light Level" icon="sun" accent={t.light} accentSoft={t.lightSoft}
        series={sample(history, 'light_lux')} stats={statsOf(history, 'light_lux')} unit="lx" decimals={0} />
      <ChartCard title="Soil Moisture" icon="droplet" accent={t.water} accentSoft={t.waterSoft}
        series={sample(history, 'soil_moisture')} stats={statsOf(history, 'soil_moisture')} unit="%" decimals={0} />
      <div style={{ textAlign: 'center', fontSize: 12, color: t.textMuted, fontWeight: 600 }}>
        {history.length.toLocaleString()} readings over {rangeLabel}
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────
function SettingsRow({ icon, accent, accentSoft, title, subtitle, right }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px' }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={20} color={accent} stroke={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: t.textSec, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function Card({ children }) {
  const t = useTheme();
  return (
    <div style={{ background: t.card, borderRadius: 20, border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow, overflow: 'hidden' }}>
      {children}
    </div>
  );
}
function Divider() { const t = useTheme(); return <div style={{ height: 1, background: t.hair, marginLeft: 67 }} />; }
function SectionLabel({ children }) {
  const t = useTheme();
  return <div style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', padding: '4px 4px 2px' }}>{children}</div>;
}

function SettingsScreen({ dark, setDark, alertsEnabled, setAlertsEnabled, pumpMode, setPumpMode, conn }) {
  const t = useTheme();
  const team = ['Ryan Bamasi', 'David Orozco', 'Jason Moore', 'Vlad Vulpe'];
  return (
    <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'flex-start' }}>
        <Logo height={34} />
        <div style={{ fontSize: 13, color: t.textSec, fontWeight: 600, paddingLeft: 2 }}>
          Version 1.0.0 · {conn === 'live' ? 'Connected' : conn === 'offline' ? 'Device offline' : 'Connecting…'}
        </div>
      </div>

      <div>
        <SectionLabel>Preferences</SectionLabel>
        <Card>
          <SettingsRow icon="moon" accent={t.primary} accentSoft={t.primarySoft} title="Dark Mode"
            right={<Switch on={dark} onChange={setDark} />} />
          <Divider />
          <SettingsRow icon="bell" accent={t.warn} accentSoft={t.lightSoft} title="Alerts &amp; Notifications"
            right={<Switch on={alertsEnabled} onChange={setAlertsEnabled} />} />
        </Card>
      </div>

      <div>
        <SectionLabel>Water Pump</SectionLabel>
        <Card>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: t.waterSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="droplet" size={20} color={t.water} stroke={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text }}>Pump Mode</div>
              </div>
            </div>
            <Segmented value={pumpMode} onChange={setPumpMode} options={[
              { value: 'auto', label: 'Automatic' }, { value: 'manual', label: 'Manual' },
            ]} />
          </div>
        </Card>
      </div>

      <div>
        <SectionLabel>About</SectionLabel>
        <Card>
          <div style={{ padding: 16, fontSize: 13.5, color: t.textSec, lineHeight: 1.55 }}>
            SmartPot is an intelligent plant monitoring system that tracks temperature, light, and soil moisture to keep your plants healthy — powered by an ESP32 and Firebase.
          </div>
        </Card>
      </div>

      <div>
        <SectionLabel>Team · Group 24</SectionLabel>
        <Card>
          <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {team.map((m) => (
              <span key={m} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 12px 7px 10px', borderRadius: 999,
                background: t.primarySoft,
              }}>
                <Icon name="users" size={15} color={t.primary} stroke={2.2} />
                <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{m}</span>
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <SectionLabel>Institution</SectionLabel>
        <Card>
          <SettingsRow icon="building" accent={t.info} accentSoft={t.waterSoft}
            title="University of Central Florida" subtitle="Electrical &amp; Computer Engineering · Senior Design 2026" />
        </Card>
      </div>
    </div>
  );
}

// ── Alerts sheet ─────────────────────────────────────────────────────
function AlertsSheet({ open, onClose, alerts, onDismiss, onClear }) {
  const t = useTheme();
  return (
    <>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 70,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .3s ease',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 71,
        background: t.bg, borderRadius: '24px 24px 0 0', maxHeight: '82%',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform .36s cubic-bezier(.2,.9,.2,1)',
        boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
      }}>
        <div style={{ padding: '14px 18px 8px' }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: t.hair, margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: t.text }}>Notifications</div>
            {alerts.length > 0 && (
              <button onClick={onClear} style={{ border: 'none', background: 'transparent', color: t.primary, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>
            )}
          </div>
        </div>
        <div style={{ padding: '6px 16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: t.textMuted }}>
              <Icon name="check" size={40} color={t.good} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: t.textSec }}>All clear</div>
              <div style={{ fontSize: 13, marginTop: 3 }}>Your plant is happy right now.</div>
            </div>
          ) : alerts.map((a) => <AlertRow key={a.id} alert={a} onDismiss={onDismiss} />)}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { HomeScreen, HistoryScreen, SettingsScreen, AlertsSheet, PlantHero });
