// app.jsx — SmartPot app shell: theming, navigation, alerts engine, watering
const { useState, useEffect, useRef, useCallback } = React;

// Derive active alert conditions from the latest reading + settings
function deriveConditions(latest, t, pumpMode) {
  if (!latest) return [];
  const out = [];
  const moist = latest.soil_moisture ?? 100;
  const lux = latest.light_lux ?? 1000;
  const temp = latest.temperature;
  if (moist < 10) out.push({ key: 'water-empty', sev: 'bad', title: 'Reservoir empty', body: `Soil moisture at ${Math.round(moist)}%. ${pumpMode === 'auto' ? 'Refill the reservoir so auto-watering can run.' : 'Switch on the pump or refill the reservoir.'}` });
  else if (moist < 30) out.push({ key: 'water-low', sev: 'warn', title: 'Soil is getting dry', body: `Moisture at ${Math.round(moist)}%. Consider watering soon.` });
  if (lux < 100) out.push({ key: 'light-dark', sev: 'warn', title: 'Not enough light', body: `Only ${Math.round(lux)} lux detected. Move your plant somewhere brighter.` });
  if (temp != null && temp > 33) out.push({ key: 'temp-hot', sev: 'bad', title: 'Temperature too high', body: `${temp.toFixed(1)}°C is too warm for most plants.` });
  else if (temp != null && temp < 12) out.push({ key: 'temp-cold', sev: 'warn', title: 'Temperature too low', body: `${temp.toFixed(1)}°C is colder than ideal.` });
  return out;
}

function overallStatus(latest, t) {
  if (!latest) return { title: 'Loading…', body: '', level: 'ok' };
  const w = waterStatus(latest.soil_moisture ?? 100, t);
  const l = lightStatus(latest.light_lux ?? 1000, t);
  const tp = tempStatus(latest.temperature, t);
  const levels = [w.level, l.level, tp.level];
  if (levels.includes('bad')) return { title: 'Needs attention', body: 'A reading is out of range — check below.', level: 'bad' };
  if (levels.includes('warn')) return { title: 'Doing okay', body: 'One thing could be better.', level: 'warn' };
  return { title: 'Thriving', body: 'All readings look healthy right now.', level: 'good' };
}

function TabBar({ tab, setTab }) {
  const t = useTheme();
  const tabs = [
    { id: 'home', label: 'Home', icon: 'leaf' },
    { id: 'scan', label: 'Scan', icon: 'sparkles' },
    { id: 'history', label: 'History', icon: 'activity' },
    { id: 'settings', label: 'Settings', icon: 'sliders' },
  ];
  return (
    <div style={{
      display: 'flex', background: t.surface, borderTop: `1px solid ${t.hair}`,
      paddingTop: 6, paddingBottom: 4, flexShrink: 0,
    }}>
      {tabs.map((x) => {
        const active = tab === x.id;
        return (
          <button key={x.id} onClick={() => setTab(x.id)} style={{
            flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0',
            fontFamily: 'inherit',
          }}>
            <div style={{
              padding: '4px 16px', borderRadius: 999,
              background: active ? t.primarySoft : 'transparent', transition: 'background .2s',
            }}>
              <Icon name={x.icon} size={23} color={active ? t.primary : t.textMuted} stroke={active ? 2.4 : 2}
                fill={active && x.id === 'home' ? t.primary : 'none'} />
            </div>
            <span style={{ fontSize: 11, fontWeight: active ? 800 : 600, color: active ? t.primary : t.textMuted }}>{x.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Header({ t, badge, onBell }) {
  return (
    <div style={{
      background: t.primaryGrad, padding: '11px 14px 12px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 2px 12px -4px rgba(0,0,0,0.2)',
    }}>
      <Logo height={27} plate plateBg="#ffffff" />
      <button onClick={onBell} style={{
        position: 'relative', width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="bell" size={21} color="#fff" stroke={2.2} />
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5, minWidth: 17, height: 17, padding: '0 4px',
            borderRadius: 999, background: '#ff5a5a', color: '#fff', fontSize: 10.5, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${t.primaryDeep}`,
          }}>{badge}</span>
        )}
      </button>
    </div>
  );
}

function SmartPotApp() {
  const [dark, setDark] = useState(() => localStorage.getItem('sp_dark') === '1');
  const [tab, setTab] = useState('home');
  const [range, setRange] = useState('1day');
  const [alertsEnabled, setAlertsEnabled] = useState(() => localStorage.getItem('sp_alerts') !== '0');
  const [pumpMode, setPumpMode] = useState(() => localStorage.getItem('sp_pumpmode') || 'manual');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState(null);
  const [watering, setWatering] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const t = dark ? SP_DARK : SP_LIGHT;
  const { latest, history, conn, lastUpdate, triggerDemoWater } = useSmartPotData(range);

  useEffect(() => { localStorage.setItem('sp_dark', dark ? '1' : '0'); window.dispatchEvent(new Event('sp-theme')); }, [dark]);
  useEffect(() => { localStorage.setItem('sp_alerts', alertsEnabled ? '1' : '0'); }, [alertsEnabled]);
  useEffect(() => { localStorage.setItem('sp_pumpmode', pumpMode); }, [pumpMode]);

  const tsMap = useRef({});         // key -> first-seen timestamp
  const dismissed = useRef(new Set());
  const toastTimer = useRef(null);
  const lastAutoRef = useRef(0);

  // Alerts engine
  useEffect(() => {
    if (!alertsEnabled) { setAlerts([]); return; }
    const conds = deriveConditions(latest, t, pumpMode);
    const activeKeys = new Set(conds.map((c) => c.key));
    // clear stale
    Object.keys(tsMap.current).forEach((k) => { if (!activeKeys.has(k)) { delete tsMap.current[k]; dismissed.current.delete(k); } });
    let newlyAdded = null;
    conds.forEach((c) => { if (!tsMap.current[c.key]) { tsMap.current[c.key] = Date.now(); newlyAdded = c; } });
    const list = conds
      .filter((c) => !dismissed.current.has(c.key))
      .map((c) => ({ ...c, id: c.key, time: relTime(tsMap.current[c.key]) }));
    setAlerts(list);
    if (newlyAdded && !dismissed.current.has(newlyAdded.key)) {
      setToast({ ...newlyAdded });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3800);
    }
  }, [latest, alertsEnabled, pumpMode, dark]);

  const dismissAlert = (id) => { dismissed.current.add(id); setAlerts((a) => a.filter((x) => x.id !== id)); };
  const clearAlerts = () => { alerts.forEach((a) => dismissed.current.add(a.id)); setAlerts([]); };

  // shared toast helper (used by the scan screen too)
  const pushToast = useCallback((tt) => {
    setToast(tt);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Watering
  const onWater = useCallback(() => {
    if (watering) return;
    const dur = 8;
    setWatering(true); setSecondsLeft(dur);
    triggerDemoWater(dur);
    sendPumpCommand(true, dur);
    let s = dur;
    const iv = setInterval(() => {
      s -= 1; setSecondsLeft(s);
      if (s <= 0) { clearInterval(iv); setWatering(false); sendPumpCommand(false, 0);
        setToast({ key: 'watered', sev: 'good', title: 'Watering complete', body: 'Soil moisture is topping up.' });
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 3200);
      }
    }, 1000);
  }, [watering, triggerDemoWater]);

  // Automatic mode: dispense water when the soil gets dry (cooldown-guarded)
  useEffect(() => {
    if (pumpMode !== 'auto' || !latest || watering) return;
    const moist = latest.soil_moisture ?? 100;
    if (moist < 35 && Date.now() - lastAutoRef.current > 12000) {
      lastAutoRef.current = Date.now();
      setToast({ key: 'autowater', sev: 'info', title: 'Auto-watering', body: `Soil dropped to ${Math.round(moist)}% — topping up.` });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3500);
      onWater();
    }
  }, [latest, pumpMode, watering, onWater]);

  const overall = overallStatus(latest, t);

  return (
    <ThemeCtx.Provider value={t}>
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', position: 'relative',
        background: t.bg, fontFamily: "'Manrope', system-ui, sans-serif", overflow: 'hidden',
      }}>
        <Header t={t} badge={alertsEnabled ? alerts.length : 0} onBell={() => setSheetOpen(true)} />
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', background: t.bgGrad }} key={tab}>
          {tab === 'home' && (
            <HomeScreen latest={latest} conn={conn} lastUpdate={lastUpdate} overall={overall}
              onWater={onWater} watering={watering} secondsLeft={secondsLeft} pumpMode={pumpMode} />
          )}
          {tab === 'scan' && <ScanScreen latest={latest} pushToast={pushToast} />}
          {tab === 'history' && <HistoryScreen history={history} range={range} setRange={setRange} />}
          {tab === 'settings' && (
            <SettingsScreen dark={dark} setDark={setDark} alertsEnabled={alertsEnabled} setAlertsEnabled={setAlertsEnabled}
              pumpMode={pumpMode} setPumpMode={setPumpMode} conn={conn} />
          )}
        </div>
        <TabBar tab={tab} setTab={setTab} />
        <Toast toast={toast} />
        <AlertsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} alerts={alerts}
          onDismiss={dismissAlert} onClear={clearAlerts} />
      </div>
    </ThemeCtx.Provider>
  );
}

function relTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} hr ago`;
}

// Mount inside the Android frame
function Root() {
  const [dark, setDark] = useState(localStorage.getItem('sp_dark') === '1');
  useEffect(() => {
    const sync = () => setDark(localStorage.getItem('sp_dark') === '1');
    window.addEventListener('sp-theme', sync);
    return () => window.removeEventListener('sp-theme', sync);
  }, []);
  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', boxSizing: 'border-box',
      background: dark ? 'radial-gradient(120% 120% at 50% 0%, #16211b 0%, #0a0f0d 70%)' : 'radial-gradient(120% 120% at 50% 0%, #e9f1ec 0%, #d6e2da 75%)',
      transition: 'background .4s ease',
    }}>
      <AndroidDevice dark={dark} bg={dark ? '#0d1411' : '#eef3ef'}>
        <SmartPotApp />
      </AndroidDevice>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
