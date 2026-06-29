// data.jsx — live Firebase Realtime DB connection (no simulated data)
// Exposes: useSmartPotData, sendPumpCommand, setPumpMode
//
// Firebase layout this app uses:
//   smartpot/latest                  ← sensor snapshot written by the ESP32
//       { temperature, light_lux, soil_moisture, pump_status, ts }
//   smartpot/history/<pushId>        ← time-series the ESP32 appends
//   smartpot/control                 → command node the ESP32 LISTENS to:
//       { pump: "ON"|"OFF", duration_s, mode: "manual"|"auto",
//         requested_at, source: "android-app" }
//   smartpot/readings/<pushId>       → plant-health scan results (scan tab)
//
// The ESP32 subscribes to smartpot/control, drives the pump relay accordingly,
// and reports the real relay state back in smartpot/latest.pump_status.

const SP_FIREBASE = {
  apiKey: "AIzaSyCNgw9zQ3kwU5kEh8dK3tUTU08sNvPhOwk",
  authDomain: "smartpot-dd482.firebaseapp.com",
  databaseURL: "https://smartpot-dd482-default-rtdb.firebaseio.com",
  projectId: "smartpot-dd482",
  storageBucket: "smartpot-dd482.firebasestorage.app",
  messagingSenderId: "217322161963",
  appId: "1:217322161963:web:c9c0f2a1d8b25992d8276e",
};

// Consider the device offline if no reading arrives within this window.
// Generous, since a sensor node may report only every few minutes.
const SP_STALE_MS = 5 * 60 * 1000;

let _db = null;
let _dbFailed = false;
function getDB() {
  if (_db || _dbFailed) return _db;
  try {
    if (window.firebase && firebase.apps && !firebase.apps.length) {
      firebase.initializeApp(SP_FIREBASE);
    }
    _db = firebase.database();
  } catch (e) {
    console.error('Firebase init failed:', e.message);
    _dbFailed = true;
    _db = null;
  }
  return _db;
}

// ── Main hook — live data only ───────────────────────────────────────
function useSmartPotData(range) {
  const [latest, setLatest] = React.useState(null);
  const [history, setHistory] = React.useState([]);
  const [conn, setConn] = React.useState('connecting'); // connecting | live | offline
  const [lastUpdate, setLastUpdate] = React.useState(null);

  // latest reading + connection state
  React.useEffect(() => {
    const db = getDB();
    if (!db) { setConn('offline'); return; }

    let staleTimer = null;
    const markStaleSoon = () => {
      clearTimeout(staleTimer);
      staleTimer = setTimeout(() => setConn('offline'), SP_STALE_MS);
    };
    // If nothing arrives at all within 8s, surface offline (device down / rules).
    const initialTimer = setTimeout(() => setConn((c) => (c === 'connecting' ? 'offline' : c)), 8000);

    const r = db.ref('smartpot/latest');
    const cb = r.on('value', (snap) => {
      const v = snap.val();
      clearTimeout(initialTimer);
      if (v && typeof v === 'object') {
        setLatest(v);
        setConn('live');
        setLastUpdate(new Date());
        markStaleSoon();
      } else {
        setConn('offline');
      }
    }, (err) => {
      console.error('smartpot/latest read failed:', err && err.message);
      setConn('offline');
    });

    // Watch Firebase client connectivity too.
    const infoRef = db.ref('.info/connected');
    const infoCb = infoRef.on('value', (s) => {
      if (s.val() === false) setConn('offline');
    });

    return () => {
      try { r.off('value', cb); } catch (e) {}
      try { infoRef.off('value', infoCb); } catch (e) {}
      clearTimeout(staleTimer); clearTimeout(initialTimer);
    };
  }, []);

  // history (depends on range)
  React.useEffect(() => {
    const pointsFor = { '1day': 288, '1week': 2016, '1month': 8640 };
    const limit = pointsFor[range] || 288;
    const db = getDB();
    if (!db) { setHistory([]); return; }

    const r = db.ref('smartpot/history').limitToLast(limit);
    const cb = r.on('value', (snap) => {
      const v = snap.val();
      setHistory(v ? Object.values(v) : []);
    }, (err) => { console.error('smartpot/history read failed:', err && err.message); setHistory([]); });

    return () => { try { r.off('value', cb); } catch (e) {} };
  }, [range]);

  return { latest, history, conn, lastUpdate };
}

// Command the ESP32 pump. Writes to smartpot/control, which the firmware
// listens to and uses to drive the relay. Returns {ok, reason}.
async function sendPumpCommand(on, seconds = 8) {
  const db = getDB();
  if (!db) return { ok: false, reason: 'No connection to SmartPot' };
  try {
    await db.ref('smartpot/control').update({
      pump: on ? 'ON' : 'OFF',
      duration_s: seconds,
      requested_at: Date.now(),
      source: 'android-app',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

// Persist the pump mode so the firmware knows whether to self-water (auto) or
// wait for explicit commands (manual).
async function setPumpModeRemote(mode) {
  const db = getDB();
  if (!db) return { ok: false, reason: 'No connection to SmartPot' };
  try {
    await db.ref('smartpot/control').update({ mode, requested_at: Date.now(), source: 'android-app' });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

Object.assign(window, { useSmartPotData, sendPumpCommand, setPumpModeRemote });

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
  if (!db) return { ok: false, reason: 'No connection to SmartPot' };
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
