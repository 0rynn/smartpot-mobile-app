// scan.jsx — Plant Health scan screen (on-device classification flow)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sevColor(sev, t) {
  return sev === 'good' ? t.good : sev === 'bad' ? t.bad : sev === 'warn' ? t.warn : t.info;
}
const STATE_META = {
  healthy:  { label: 'Healthy',  sev: 'good' },
  warning:  { label: 'Warning',  sev: 'warn' },
  critical: { label: 'Critical', sev: 'bad'  },
};

function ProbBar({ name, value, color }) {
  const t = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 92, fontSize: 12.5, fontWeight: 700, color: t.textSec, flexShrink: 0 }}>{name}</span>
      <div style={{ flex: 1, height: 8, borderRadius: 999, background: t.hair, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(value * 100)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
      </div>
      <span style={{ width: 38, textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: t.text, flexShrink: 0 }}>{Math.round(value * 100)}%</span>
    </div>
  );
}

function ScanScreen({ latest, pushToast }) {
  const t = useTheme();
  const inputRef = React.useRef();
  const [stage, setStage] = React.useState('idle'); // idle | analyzing | result | error
  const [preview, setPreview] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [recent, setRecent] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_scans') || '[]'); } catch (e) { return []; }
  });

  // Warm up the real model in the background so the first scan is fast.
  React.useEffect(() => { try { warmTflite(); } catch (e) {} }, []);

  const openPicker = (camera) => {
    const el = inputRef.current;
    if (camera) el.setAttribute('capture', 'environment'); else el.removeAttribute('capture');
    el.value = ''; el.click();
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => runInference(img, url);
    img.onerror = () => { setErrorMsg('That image could not be opened. Try another photo.'); setStage('error'); };
    img.src = url;
  };

  const runInference = async (img, url) => {
    setPreview(url); setResult(null); setSaved(false); setStage('analyzing');
    let res = null;
    // Try the real trained model first; fall back to the heuristic if the
    // TFLite runtime/model can't load (offline, WASM blocked, etc).
    try {
      res = await runTfliteInference(img);
    } catch (err) {
      console.warn('TFLite inference unavailable, using heuristic:', err && err.message);
      await sleep(700 + Math.random() * 400); // simulated on-device latency
      try {
        res = await classifyPlantImage(img);
        res.engine = 'heuristic';
      } catch (err2) {
        setErrorMsg(err2.message || 'Classification failed.');
        setStage('error');
        return;
      }
    }
    const overall = computeOverallState(res.label, latest);
    setResult({ ...res, overall });
    setStage('result');
  };

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    // Write the scan to Firebase (smartpot/readings) using the documented schema.
    const r = await saveScanResult({ label: result.label, confidence: result.confidence, overallState: result.overall });
    setSaving(false);
    const item = { label: result.label, badge: result.badge, sev: result.sev, confidence: result.confidence, overall_state: result.overall, thumb: result.thumb, ts: Date.now() };
    const next = [item, ...recent].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem('sp_scans', JSON.stringify(next)); } catch (e) {}
    setSaved(true);
    pushToast(r.ok
      ? { key: 'scan-saved', sev: 'good', title: 'Saved to SmartPot', body: `${result.badge} · synced to cloud` }
      : { key: 'scan-saved', sev: 'warn', title: 'Saved on device', body: `Cloud sync failed: ${r.reason || 'offline'}` });
  };

  const reset = () => { setStage('idle'); setPreview(null); setResult(null); setSaved(false); };

  const clearRecent = () => { setRecent([]); try { localStorage.removeItem('sp_scans'); } catch (e) {} };

  return (
    <div style={{ padding: '16px 16px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      {/* Intro */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon name="sparkles" size={20} color={t.primary} stroke={2.2} />
          <span style={{ fontSize: 19, fontWeight: 800, color: t.text, letterSpacing: -0.3 }}>Plant Health Scan</span>
        </div>
        <div style={{ fontSize: 13.5, color: t.textSec, marginTop: 4, lineHeight: 1.45 }}>
          Photograph a leaf and an on-device AI model checks it for disease and browning.
        </div>
      </div>

      {/* Image area */}
      <div style={{
        position: 'relative', borderRadius: 22, overflow: 'hidden',
        background: t.card, border: `1.5px ${preview ? 'solid' : 'dashed'} ${preview ? t.cardBorder : t.hair}`,
        boxShadow: preview ? t.cardShadow : 'none',
        aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {preview ? (
          <img src={preview} alt="plant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: t.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Icon name="camera" size={30} color={t.primary} stroke={2} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>No photo yet</div>
            <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 3 }}>Take or choose a clear photo of one leaf</div>
          </div>
        )}

        {/* analyzing overlay */}
        {stage === 'analyzing' && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(8,16,12,0.6)', backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div className="sp-spin"><Icon name="refresh" size={30} color="#fff" /></div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Analyzing…</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11.5, fontWeight: 600 }}>MobileNetV2 · 224×224 · on-device</div>
          </div>
        )}
      </div>

      {/* Actions / result */}
      {stage === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => openPicker(true)} style={primaryBtn(t)}>
            <Icon name="camera" size={19} color="#fff" stroke={2.3} /> Scan Plant
          </button>
          <button onClick={() => openPicker(false)} style={ghostBtn(t)}>
            <Icon name="image" size={18} color={t.primary} stroke={2.3} /> Choose from gallery
          </button>
        </div>
      )}

      {stage === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 11, padding: 14, background: t.name === 'dark' ? t.bad + '22' : t.bad + '14', borderRadius: 14 }}>
            <Icon name="alert" size={20} color={t.bad} stroke={2.2} />
            <div style={{ fontSize: 13.5, color: t.text, fontWeight: 600 }}>{errorMsg}</div>
          </div>
          <button onClick={reset} style={ghostBtn(t)}>Try again</button>
        </div>
      )}

      {stage === 'result' && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Result card */}
          <div style={{ background: t.card, borderRadius: 22, padding: 18, border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: t.name === 'dark' ? sevColor(result.sev, t) + '22' : sevColor(result.sev, t) + '16', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={result.sev === 'good' ? 'check' : result.sev === 'bad' ? 'alert' : 'leaf'} size={24} color={sevColor(result.sev, t)} stroke={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Diagnosis</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: sevColor(result.sev, t), letterSpacing: -0.3, lineHeight: 1.1 }}>{result.badge}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, padding: '3px 8px', borderRadius: 999, background: t.surfaceMuted }}>
                  <Icon name={result.engine === 'model' ? 'sparkles' : 'gauge'} size={11} color={result.engine === 'model' ? t.primary : t.textMuted} stroke={2.4} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: t.textSec }}>
                    {result.engine === 'model' ? 'MobileNetV2 · on-device' : 'Preview classifier'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: t.text, letterSpacing: -0.5 }}>{Math.round(result.confidence * 100)}%</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted }}>confidence</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 14, borderTop: `1px solid ${t.hair}` }}>
              <ProbBar name="Healthy" value={result.probs.healthy} color={t.good} />
              <ProbBar name="Disease" value={result.probs.disease_spots} color={t.bad} />
              <ProbBar name="Browning" value={result.probs.leaf_browning} color={t.warn} />
            </div>

            {/* overall state */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14, background: t.surfaceMuted }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: t.textSec, flex: 1 }}>Overall plant state</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999,
                background: sevColor(STATE_META[result.overall].sev, t), color: '#fff', fontSize: 12.5, fontWeight: 800,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />
                {STATE_META[result.overall].label}
              </span>
            </div>
          </div>

          {saved ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 14, borderRadius: 14, background: t.primarySoft, color: t.primary, fontSize: 14.5, fontWeight: 800 }}>
              <Icon name="check" size={19} color={t.primary} stroke={2.3} /> Saved to SmartPot
            </div>
          ) : (
            <button onClick={onSave} disabled={saving} style={{ ...primaryBtn(t), opacity: saving ? 0.7 : 1 }}>
              {saving ? <span className="sp-spin"><Icon name="refresh" size={18} color="#fff" /></span> : <Icon name="check" size={19} color="#fff" stroke={2.3} />}
              {saving ? 'Saving…' : 'Save to SmartPot'}
            </button>
          )}
          <button onClick={reset} style={ghostBtn(t)}>
            <Icon name="camera" size={18} color={t.primary} stroke={2.3} /> Scan another
          </button>
        </div>
      )}

      {/* Recent scans */}
      {recent.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px 8px' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: t.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>Recent Scans</span>
            <button onClick={clearRecent} style={{ border: 'none', background: 'transparent', color: t.textMuted, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name="trash" size={14} stroke={2.2} /> Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, background: t.card, borderRadius: 16, border: `1px solid ${t.cardBorder}` }}>
                <img src={s.thumb} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: sevColor(s.sev, t) }}>{s.badge}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600, marginTop: 1 }}>
                    {Math.round(s.confidence * 100)}% · {timeAgo(s.ts)}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: sevColor(STATE_META[s.overall_state].sev, t), padding: '4px 9px', borderRadius: 999 }}>
                  {STATE_META[s.overall_state].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function primaryBtn(t) {
  return {
    width: '100%', padding: '15px', borderRadius: 16, border: 'none', cursor: 'pointer',
    background: t.primary, color: '#fff', fontSize: 15.5, fontWeight: 800, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    boxShadow: '0 8px 20px -10px ' + t.primary,
  };
}
function ghostBtn(t) {
  return {
    width: '100%', padding: '14px', borderRadius: 16, cursor: 'pointer',
    background: 'transparent', border: `1.5px solid ${t.hair}`, color: t.primary,
    fontSize: 14.5, fontWeight: 800, fontFamily: 'inherit', whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  };
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

Object.assign(window, { ScanScreen });
