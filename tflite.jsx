// tflite.jsx — real on-device inference for the trained MobileNetV2 model.
//
// Runtime: Google MediaPipe Tasks (Vision) ImageClassifier. We tried
// @tensorflow/tfjs-tflite first, but its final release (alpha.10, ~2022) is too
// old to run this model — the model's FULLY_CONNECTED op is version 12 (exported
// with a recent TensorFlow). MediaPipe's runtime is current and supports it.
//
// MediaPipe's ImageClassifier needs the .tflite to carry NormalizationOptions
// metadata (so it knows how to scale pixels). If the model has it, real
// on-device inference runs in the browser. If not (a raw Keras→TFLite export),
// createFromOptions throws and callers fall back to the heuristic classifier in
// data.jsx, so the demo always works. The user's React Native app
// (react-native-fast-tflite) runs the model natively regardless of metadata.

// Class order must match the model's training label order (Keras sorts class
// folders alphabetically). Adjust here if your training used a different order.
const TFLITE_CLASSES = [
  { key: 'healthy',       badge: 'Healthy',          sev: 'good' },
  { key: 'disease_spots', badge: 'Disease Detected', sev: 'bad'  },
  { key: 'leaf_browning', badge: 'Browning Detected', sev: 'warn' },
];
const TFLITE_MODEL_URL = 'smartpot_plant_model.tflite';
const MP_VER = '0.0.1-alpha.10'; // unused marker kept for clarity
const MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';

let _clfPromise = null;
let _state = 'idle';     // idle | loading | ready | failed
let _failReason = '';

function classifierState() { return _state; }
function classifierFailReason() { return _failReason; }

function loadClassifier() {
  if (_clfPromise) return _clfPromise;
  _state = 'loading';
  _clfPromise = (async () => {
    // Use a runtime-constructed import so Babel doesn't transpile import() → require().
    const _dynImport = new Function('u', 'return import(u)');
    const vision = await _dynImport(`${MP_BASE}/vision_bundle.mjs`);
    const { ImageClassifier, FilesetResolver } = vision;
    const fileset = await FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
    const clf = await ImageClassifier.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: TFLITE_MODEL_URL },
      maxResults: 3,
      runningMode: 'IMAGE',
    });
    _state = 'ready';
    return clf;
  })().catch((err) => {
    _state = 'failed';
    _failReason = (err && err.message) ? err.message : String(err);
    throw err;
  });
  return _clfPromise;
}

function _softmaxIfNeeded(scores) {
  const sum = scores.reduce((a, b) => a + b, 0);
  const looksProb = scores.every((v) => v >= -1e-6 && v <= 1 + 1e-6) && Math.abs(sum - 1) < 0.05;
  if (looksProb) return scores.slice();
  const m = Math.max(...scores);
  const e = scores.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

// Run the real model on an HTMLImageElement. Returns the same shape as the
// heuristic classifier, plus engine:'model'. Throws on any failure.
async function runTfliteInference(imgEl) {
  const clf = await loadClassifier();
  const res = clf.classify(imgEl);
  const cats = (res && res.classifications && res.classifications[0] && res.classifications[0].categories) || [];
  if (!cats.length) throw new Error('Model produced no output');

  // Build a probability vector indexed by class position.
  const raw = new Array(TFLITE_CLASSES.length).fill(0);
  cats.forEach((c) => { if (c.index != null && c.index < raw.length) raw[c.index] = c.score; });
  const probsArr = _softmaxIfNeeded(raw);

  let idx = 0;
  for (let k = 1; k < probsArr.length; k++) if (probsArr[k] > probsArr[idx]) idx = k;
  const cls = TFLITE_CLASSES[idx] || TFLITE_CLASSES[0];

  const tc = document.createElement('canvas'); tc.width = 96; tc.height = 96;
  tc.getContext('2d').drawImage(imgEl, 0, 0, 96, 96);
  const thumb = tc.toDataURL('image/jpeg', 0.6);

  return {
    engine: 'model',
    label: cls.key, badge: cls.badge, sev: cls.sev,
    confidence: probsArr[idx],
    probs: {
      healthy: probsArr[0] ?? 0,
      disease_spots: probsArr[1] ?? 0,
      leaf_browning: probsArr[2] ?? 0,
    },
    thumb,
  };
}

function tfliteStatus() { return _state; }
function warmTflite() { loadClassifier().catch(() => {}); }

Object.assign(window, {
  runTfliteInference, loadClassifier, tfliteStatus, classifierState, classifierFailReason,
  warmTflite, TFLITE_CLASSES,
});
