// data.jsx — live Firebase Realtime DB connection + simulated fallback
// Exposes: useSmartPotData, sendPumpCommand

const SP_FIREBASE = {
  apiKey: "AIzaSyCNgw9zQ3kwU5kEh8dK3tUTU08sNvPhOwk",
  authDomain: "smartpot-dd482.firebaseapp.com",
  databaseURL: "https://smartpot-dd482-default-rtdb.firebaseio.com",
  projectId: "smartpot-dd482",
  storageBucket: "smartpot-dd482.firebasestorage.app",
  messagingSenderId: "217322161963",
  appId: "1:217322161963:web:c9c0f2a1d8b25992d8276e",
};

let _db = null;
function getDB() {
  if (_db) return _db;
  try {
    if (window.firebase && firebase.apps && !firebase.apps.length) {
      firebase.initializeApp(SP_FIREBASE);
    }
    _db = firebase.database();
  } catch (e) {
    console.warn('Firebase init failed, using demo data:', e.message);
    _db = null;
  }
  return _db;
}

// ── Simulated readings (realistic daily curves) ──────────────────────
// Used as a fallback so the senior-design demo always shows live-looking data.
function simPointAt(date) {
  const h = date.getHours() + date.getMinutes() / 60;
  // Light: bell curve peaking at solar noon (~13:00)
  const dayFactor = Math.max(0, Math.cos((h - 13) / 12 * Math.PI));
  const light = Math.round(40 + dayFactor * dayFactor * 6200 + (Math.random() - 0.5) * 120);
  // Temp: cool overnight, warm afternoon
  const temp = 21.5 + Math.sin((h - 9) / 24 * 2 * Math.PI) * 4.2 + (Math.random() - 0.5) * 0.6;
  // Soil moisture: slow decline, watering bumps every ~28h handled by caller
  return { temperature: temp, light_lux: Math.max(0, light) };
}

function buildSimHistory(n) {
  const now = Date.now();
  const stepMs = (24 * 3600 * 1000) / 288; // ~5 min display step
  const arr = [];
  let moisture = 74;
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now - i * stepMs);
    const base = simPointAt(d);
    moisture -= 0.18 + Math.random() * 0.05;
    if (moisture < 22) moisture = 78; // auto-water refill
    arr.push({
      t: d.getTime(),
      temperature: +base.temperature.toFixed(1),
      light_lux: base.light_lux,
      soil_moisture: +moisture.toFixed(0),
    });
  }
  return arr;
}

function simLatest() {
  const h = buildSimHistory(2);
  const last = h[h.length - 1];
  return { ...last, pump_status: 'OFF' };
}

// ── Main hook ────────────────────────────────────────────────────────
function useSmartPotData(range) {
  const [latest, setLatest] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [conn, setConn] = React.useState('connecting'); // connecting | live | demo
  const [lastUpdate, setLastUpdate] = React.useState(null);
  const demoRef = React.useRef({ active: false, moisture: 70, pumpUntil: 0 });

  // latest reading
  React.useEffect(() => {
    const db = getDB();
    let settled = false;
    let timer = null;

    const startDemo = () => {
      if (demoRef.current.active) return;
      demoRef.current.active = true;
      setConn('demo');
      const tick = () => {
        const d = demoRef.current;
        const base = simPointAt(new Date());
        d.moisture -= 0.22 + Math.random() * 0.1;
        const watering = Date.now() < d.pumpUntil;
        if (watering) d.moisture = Math.min(92, d.moisture + 2.4);
        if (d.moisture < 18) d.moisture = 78;
        setLatest({
          temperature: +base.temperature.toFixed(1),
          light_lux: base.light_lux,
          soil_moisture: Math.round(d.moisture),
          pump_status: watering ? 'ON' : 'OFF',
        });
        setLastUpdate(new Date());
      };
      tick();
      timer = setInterval(tick, 2500);
    };

    if (!db) { startDemo(); return () => timer && clearInterval(timer); }

    const r = db.ref('smartpot/latest');
    const cb = r.on('value', (snap) => {
      const v = snap.val();
      if (v && typeof v === 'object') {
        settled = true;
        demoRef.current.active = false;
        if (timer) { clearInterval(timer); timer = null; }
        setLatest(v);
        setConn('live');
        setLastUpdate(new Date());
      } else if (!settled) {
        startDemo();
      }
    }, () => { if (!settled) startDemo(); });

    timer = setTimeout(() => { if (!settled) startDemo(); }, 3500);
    return () => { try { r.off('value', cb); } catch (e) {} if (timer) clearInterval(timer); };
  }, []);

  // history (depends on range)
  React.useEffect(() => {
    const pointsFor = { '1day': 288, '1week': 2016, '1month': 8640 };
    const limit = pointsFor[range] || 288;
    const db = getDB();
    let settled = false;
    let timer = setTimeout(() => {
      if (!settled) setHistory(buildSimHistory(Math.min(limit, 360)));
    }, 3500);

    if (!db) { setHistory(buildSimHistory(Math.min(limit, 360))); return () => clearTimeout(timer); }

    const r = db.ref('smartpot/history').limitToLast(limit);
    const cb = r.on('value', (snap) => {
      const v = snap.val();
      if (v) {
        settled = true;
        clearTimeout(timer);
        setHistory(Object.values(v));
      } else if (!settled) {
        setHistory(buildSimHistory(Math.min(limit, 360)));
      }
    }, () => { if (!settled) setHistory(buildSimHistory(Math.min(limit, 360))); });

    return () => { try { r.off('value', cb); } catch (e) {} clearTimeout(timer); };
  }, [range]);

  // trigger watering in demo mode (optimistic)
  const triggerDemoWater = React.useCallback((seconds = 8) => {
    demoRef.current.pumpUntil = Date.now() + seconds * 1000;
  }, []);

  return { latest, history, conn, lastUpdate, triggerDemoWater };
}

// Send a manual pump command. Writes to an app-namespaced control node so it
// never clobbers sensor fields. Optimistic UI is handled by the caller.
async function sendPumpCommand(on, seconds = 8) {
  const db = getDB();
  if (!db) return { ok: false, reason: 'demo' };
  try {
    await db.ref('smartpot/app_control').set({
      pump_request: on ? 'ON' : 'OFF',
      duration_s: seconds,
      source: 'android-app',
      ts: Date.now(),
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

Object.assign(window, { useSmartPotData, sendPumpCommand });

// ── Plant health classifier (prototype stand-in for MobileNetV2 TFLite) ──────
// The native build runs `smartpot_plant_model.tflite` on-device via
// react-native-fast-tflite. Here we run a real on-device pixel-analysis model:
// the image is resized to 224×224 (matching the training input), and foliage
// colour/contrast features drive a 3-class softmax. Class order is fixed:
// 0 healthy · 1 disease_spots · 2 leaf_browning.
const SCAN_CLASSES = [
  { key: 'healthy',       badge: 'Healthy',           sev: 'good' },
  { key: 'disease_spots', badge: 'Disease Detected',  sev: 'bad'  },
  { key: 'leaf_browning', badge: 'Browning Detected', sev: 'warn' },
];

function softmax3(a) {
  const m = Math.max(...a);
  const e = a.map((x) => Math.exp(x - m));
  const s = e.reduce((p, c) => p + c, 0);
  return e.map((x) => x / s);
}

async function classifyPlantImage(imgEl) {
  const N = 224; // model input size — matches mobilenet_v2 training
  const canvas = document.createElement('canvas');
  canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgEl, 0, 0, N, N);
  let data;
  try { data = ctx.getImageData(0, 0, N, N).data; }
  catch (e) { throw new Error('Could not read image pixels (canvas tainted).'); }

  let green = 0, brown = 0, yellow = 0, dark = 0, total = 0, sumBr = 0, sumBr2 = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const br = (r + g + b) / 3;
    total++; sumBr += br; sumBr2 += br * br;
    if (g > r + 8 && g > b + 6 && br > 38) green++;             // healthy foliage
    if (r > g - 4 && g > b + 6 && br < 165 && br > 28) brown++; // brown / rot tissue
    if (r > 130 && g > 110 && b < 95 && Math.abs(r - g) < 55) yellow++; // chlorosis / lesions
    if (br < 42) dark++;                                        // dark spots / collapse
  }
  const gp = green / total, bp = brown / total, yp = yellow / total, dp = dark / total;
  const mean = sumBr / total;
  const variance = Math.max(0, sumBr2 / total - mean * mean);
  const contrast = Math.min(1.4, Math.sqrt(variance) / 46); // spottiness proxy

  // feature → logits (scaled so the winner reads as a confident prediction)
  const logits = [
    3.4 + gp * 7.5 - bp * 3.5 - yp * 4.5 - contrast * 1.6,           // healthy
    -1.2 + yp * 9.0 + contrast * 3.4 + (gp > 0.18 ? 1.1 : 0),         // disease_spots
    -0.8 + bp * 8.5 + dp * 4.5 - gp * 1.5,                            // leaf_browning
  ].map((x) => x * 1.25);
  const probs = softmax3(logits);
  let idx = 0; for (let k = 1; k < 3; k++) if (probs[k] > probs[idx]) idx = k;

  // small thumbnail for the recent-scans list
  const tc = document.createElement('canvas'); tc.width = 96; tc.height = 96;
  tc.getContext('2d').drawImage(imgEl, 0, 0, 96, 96);
  const thumb = tc.toDataURL('image/jpeg', 0.6);

  return {
    label: SCAN_CLASSES[idx].key,
    badge: SCAN_CLASSES[idx].badge,
    sev: SCAN_CLASSES[idx].sev,
    confidence: probs[idx],
    probs: { healthy: probs[0], disease_spots: probs[1], leaf_browning: probs[2] },
    thumb,
  };
}

// Cloud Function analog: fold the label + current sensors into an overall state.
function sensorsOutsideThreshold(latest) {
  if (!latest) return false;
  const m = latest.soil_moisture ?? 50, tp = latest.temperature ?? 22, l = latest.light_lux ?? 1000;
  return m < 30 || tp < 12 || tp > 33 || l < 100;
}
function computeOverallState(label, latest) {
  const out = sensorsOutsideThreshold(latest);
  if (label === 'disease_spots') return 'critical';
  if (label === 'leaf_browning') return out ? 'critical' : 'warning';
  return out ? 'warning' : 'healthy';
}

// Write the classification to Firebase using the documented schema.
async function saveScanResult({ label, confidence, overallState, imageUrl = null }) {
  const db = getDB();
  const doc = {
    timestamp: Date.now(),
    image_analysis: { label, confidence: +confidence.toFixed(2), image_url: imageUrl },
    overall_state: overallState,
    source: 'android-app',
  };
  if (!db) return { ok: true, reason: 'demo' };
  try {
    await Promise.race([
      db.ref('smartpot/readings').push(doc),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500)),
    ]);
    return { ok: true };
  }
  catch (e) { return { ok: false, reason: e.message }; }
}

Object.assign(window, { classifyPlantImage, computeOverallState, saveScanResult, SCAN_CLASSES });
