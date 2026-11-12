"use client";

// חלון העריכה: חיתוך, כיתוב מונפש, לוגו, אפקט ומוזיקה, והפקת קובץ וידאו על המכשיר של המשתמש.
// התצוגה המקדימה וההפקה מציירות כל פריים באותה פונקציה (drawFrame), כך שמה שרואים הוא מה שיוצא.
// ההפקה רצה בזמן אמת: canvas + MediaRecorder, בלי שרת ובלי עלות.

import { useEffect, useRef, useState } from "react";

const RATIOS = { "9:16": [1080, 1920], "4:5": [1080, 1350], "1:1": [1080, 1080] };
const CAP_SIZES = { s: 0.05, m: 0.064, l: 0.084 };
const CAP_POS = { top: 0.16, mid: 0.5, bottom: 0.76 };
const CAP_STYLES = [
  ["pop", "מילה-מילה", "Word by word"],
  ["neon", "ניאון", "Neon"],
  ["box", "תיבה", "Box"],
  ["clean", "נקי", "Clean"],
];
const NEON = ["#00E5FF", "#FF2BD6", "#FFE600", "#39FF14"];
const POP_CHUNK = 3;
const PREVIEW_SCALE = 1 / 3;
const MIME_TYPES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
// זמן מדויק לעריכה: 1:05.3
const fmtFine = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const parseTime = (str) => {
  const m = String(str).trim().match(/^(?:(\d+):)?(\d+(?:\.\d+)?)$/);
  return m ? (+(m[1] || 0)) * 60 + +m[2] : null;
};

/* ---------- קטעים: כמה חלקים מאותו סרטון, מחוברים לפי הסדר ---------- */
const segLen = (s) => Math.max(0, s.end - s.start);
const totalLen = (segs) => segs.reduce((a, s) => a + segLen(s), 0);
const segOffset = (segs, i) => totalLen(segs.slice(0, i));
// זמן בסרטון הסופי ← באיזה קטע הוא נמצא ואיפה בסרטון המקורי
function locate(segs, t) {
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const L = segLen(segs[i]);
    if (t < acc + L || i === segs.length - 1) return { i, src: segs[i].start + clamp(t - acc, 0, L) };
    acc += L;
  }
  return { i: 0, src: 0 };
}
const segKey = (segs) => segs.map((s) => `${s.start.toFixed(2)}-${s.end.toFixed(2)}`).join("|");
// סרטון ארוך מזה לא מפוענח כולו לזיכרון בהפקה (זה כבד מדי לטלפון); הסאונד נלקח מהנגן עצמו
const DECODE_MAX_SEC = 240;
const hebrew = (s) => /[֐-׿]/.test(s);
// הכיתוב על הסרטון: בלי האשטגים, שנשארים בטקסט הפוסט
export const captionFromPost = (text = "") => text.replace(/#[^\s#]+/g, "").replace(/\s+/g, " ").trim();

/* ---------- ציור פריים ---------- */
function layoutWords(ctx, words, maxW, space) {
  const lines = [];
  let cur = [], w = 0;
  for (const word of words) {
    const ww = ctx.measureText(word.text).width;
    if (cur.length && w + space + ww > maxW) { lines.push({ items: cur, width: w }); cur = []; w = 0; }
    w += (cur.length ? space : 0) + ww;
    cur.push({ ...word, w: ww });
  }
  if (cur.length) lines.push({ items: cur, width: w });
  return lines;
}

function drawCaption(ctx, W, H, t, dur, cfg, font) {
  const words = cfg.capText.split(/\s+/).filter(Boolean).map((text, i) => ({ text, i }));
  if (!words.length) return;
  const fs = W * CAP_SIZES[cfg.capSize];
  ctx.font = `800 ${fs}px ${font}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const rtl = hebrew(cfg.capText);
  ctx.direction = rtl ? "rtl" : "ltr";

  let shown = words, active = -1, wordStart = 0, alpha = 1;
  // כתוביות מתמלול: כל מילה בזמן שבו היא נאמרת. אם המשתמש תיקן מילים בטקסט ומספר המילים
  // לא השתנה, התיקון נכנס עם אותו תזמון. אחרת חוזרים לחלוקה שווה לאורך הסרטון
  const timed = cfg.words?.length === words.length && cfg.wordsKey === segKey(cfg.segments || []) ? cfg.words : null;
  if (timed) {
    timed.forEach((w, i) => { if (w.start <= t) active = i; });
    if (active < 0 || t > timed[active].end + 0.7) return; // שקט: בלי כיתוב
    wordStart = timed[active].start;
    const from = Math.floor(active / POP_CHUNK) * POP_CHUNK;
    shown = words.slice(from, from + POP_CHUNK);
    if (cfg.capStyle !== "pop") active = -1; // הדגשת המילה רק בסגנון מילה-מילה
  } else if (cfg.capStyle === "pop") {
    const per = Math.max(dur - 0.3, 0.5) / words.length;
    active = clamp(Math.floor(t / per), 0, words.length - 1);
    wordStart = active * per;
    const from = Math.floor(active / POP_CHUNK) * POP_CHUNK;
    shown = words.slice(from, from + POP_CHUNK);
  } else {
    alpha = clamp(t / 0.4, 0, 1);
  }

  const space = fs * 0.4, lineH = fs * 1.32;
  const lines = layoutWords(ctx, shown, W * 0.84, space);
  const y0 = H * CAP_POS[cfg.capPos] - (lines.length * lineH) / 2 + lineH / 2;
  ctx.globalAlpha = alpha;
  lines.forEach((line, li) => {
    const y = y0 + li * lineH;
    if (cfg.capStyle === "box") {
      const bw = line.width + fs * 0.9, bh = lineH * 0.98;
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect((W - bw) / 2, y - bh / 2, bw, bh, fs * 0.25); ctx.fill(); }
      else ctx.fillRect((W - bw) / 2, y - bh / 2, bw, bh); // ספארי ישן בלי פינות מעוגלות
    }
    let x = rtl ? W / 2 + line.width / 2 : W / 2 - line.width / 2;
    for (const word of line.items) {
      if (rtl) x -= word.w;
      const on = word.i === active;
      ctx.save();
      if (on) {
        const k = 1 + 0.16 * clamp(1 - (t - wordStart) / 0.18, 0, 1) + 0.06;
        ctx.translate(x + word.w / 2, y);
        ctx.scale(k, k);
        ctx.translate(-(x + word.w / 2), -y);
      }
      if (cfg.capStyle === "neon") {
        const c = NEON[li % NEON.length];
        ctx.shadowColor = c; ctx.shadowBlur = fs * 0.55; ctx.fillStyle = c;
        ctx.fillText(word.text, x, y);
        ctx.fillText(word.text, x, y);
      } else {
        if (cfg.capStyle !== "box") {
          ctx.lineWidth = fs * 0.13; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.strokeText(word.text, x, y);
        }
        if (on) { ctx.shadowColor = "#FFE600"; ctx.shadowBlur = fs * 0.45; }
        ctx.fillStyle = on ? "#FFE600" : "#fff";
        ctx.fillText(word.text, x, y);
      }
      ctx.restore();
      x = rtl ? x - space : x + word.w + space;
    }
  });
  ctx.globalAlpha = 1;
}

function drawFrame(ctx, W, H, { media, kind, mw, mh, t, dur, cfg, filter, logo, font, still }) {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (media && mw && mh) {
    let s = Math.max(W / mw, H / mh);
    if (kind === "image") s *= 1 + 0.08 * clamp(t / Math.max(dur, 0.1), 0, 1); // זום איטי על תמונה
    const dw = mw * s, dh = mh * s;
    if (filter && cfg.effect) ctx.filter = filter;
    ctx.drawImage(media, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.filter = "none";
  }
  if (logo && cfg.logo) {
    const lw = cfg.logoCfg.size * W, lh = lw / logo.ar;
    ctx.globalAlpha = cfg.logoCfg.opacity;
    ctx.drawImage(logo.canvas, clamp(cfg.logoCfg.x, 0, 1) * W, clamp(cfg.logoCfg.y, 0, 1) * H, lw, lh);
    ctx.globalAlpha = 1;
  }
  if (cfg.caps && cfg.capText.trim()) drawCaption(ctx, W, H, t, dur, cfg, font);
  if (cfg.fade && !still) { // בתצוגה מקדימה עצורה לא מחשיכים, כדי שרואים את התמונה
    const a = Math.max(1 - t / 0.35, 1 - (dur - t) / 0.35, 0);
    if (a > 0) { ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}

/* ---------- טעינת חומרים ---------- */
const loadImage = (src, cors) => new Promise((ok, fail) => {
  const img = new Image();
  if (cors) img.crossOrigin = "anonymous";
  img.onload = () => ok(img);
  img.onerror = fail;
  img.src = src;
});
// הלוגו מוכן מראש כ-canvas, כולל צביעה בצבע שנבחר
async function prepareLogo(logo) {
  if (!logo?.src) return null;
  const img = await loadImage(logo.src);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || 256; c.height = img.naturalHeight || 256;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, c.width, c.height);
  if (logo.color) { g.globalCompositeOperation = "source-in"; g.fillStyle = logo.color; g.fillRect(0, 0, c.width, c.height); }
  return { canvas: c, ar: c.width / c.height };
}
const waitFor = (el, ok, bad = "error", ms = 15000) => new Promise((res, rej) => {
  const timer = setTimeout(() => { done(); rej(new Error("timeout")); }, ms);
  const yes = () => { done(); res(); }, no = () => { done(); rej(new Error(bad)); };
  const done = () => { clearTimeout(timer); el.removeEventListener(ok, yes); el.removeEventListener(bad, no); };
  el.addEventListener(ok, yes); el.addEventListener(bad, no);
});
// מפענח קובץ שמע או וידאו לזיכרון. null אם אי אפשר (פורמט לא נתמך, או שרת שחוסם)
async function decode(audioCtx, url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    return await new Promise((ok, fail) => {
      const p = audioCtx.decodeAudioData(data, ok, fail); // ספארי ישן מכיר רק את צורת ה-callback
      if (p?.then) p.then(ok, fail);
    });
  } catch {
    return null;
  }
}
/* ---------- כתוביות אוטומטיות ---------- */
const STT_RATE = 16000; // מספיק לדיבור, וקטן: כ-32KB לשנייה
const STT_CHUNK_SEC = 110; // כל שליחה לשרת: מתחת למגבלת הגודל שלו
const STT_MAX_SEC = 600; // עד 10 דקות כתוביות לסרטון
const wavBlob = (pcm) => {
  const out = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const str = (o, v) => [...v].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); out.setUint32(4, 36 + pcm.length * 2, true); str(8, "WAVE"); str(12, "fmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
  out.setUint32(24, STT_RATE, true); out.setUint32(28, STT_RATE * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
  str(36, "data"); out.setUint32(40, pcm.length * 2, true);
  pcm.forEach((v, i) => out.setInt16(44 + i * 2, clamp(v, -1, 1) * 0x7fff, true));
  return new Blob([out], { type: "audio/wav" });
};
// מחלץ על המכשיר את הסאונד של כל הקטעים, מחובר לפי הסדר, כקבצי WAV מונו קטנים
async function extractWavs(src, segs) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await decode(ctx, src);
  ctx.close().catch(() => {});
  if (!buf) return null;
  const total = Math.min(totalLen(segs), STT_MAX_SEC);
  if (total < 0.3) return null;
  const off = new OfflineAudioContext(1, Math.ceil(total * STT_RATE), STT_RATE);
  let at = 0;
  for (const sg of segs) {
    const len = Math.min(segLen(sg), total - at);
    if (len <= 0) break;
    const s = off.createBufferSource();
    s.buffer = buf;
    s.connect(off.destination);
    s.start(at, clamp(sg.start, 0, buf.duration), len);
    at += len;
  }
  const pcm = (await off.startRendering()).getChannelData(0);
  const per = STT_CHUNK_SEC * STT_RATE, parts = [];
  for (let i = 0; i < pcm.length; i += per) parts.push({ blob: wavBlob(pcm.subarray(i, i + per)), offset: i / STT_RATE });
  return { parts, cut: totalLen(segs) > STT_MAX_SEC };
}
// שולח לשרת חלק אחרי חלק, ומחזיר מילים עם תזמון בסרטון הסופי, או { error } עם קוד
async function transcribeClip(src, segs, language) {
  const wav = await extractWavs(src, segs);
  if (!wav) return { error: "no_audio" };
  const words = [];
  for (const part of wav.parts) {
    const form = new FormData();
    form.append("file", part.blob, "audio.wav");
    if (language) form.append("language", language);
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: data.error?.code || "server_error" };
      for (const w of data.words || []) words.push({ ...w, start: w.start + part.offset, end: w.end + part.offset });
    } catch {
      return { error: "network" };
    }
  }
  return { words, cut: wav.cut };
}

const pickMime = () => (typeof MediaRecorder === "undefined" ? null : MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) || "");
export const canRender = () => typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!HTMLCanvasElement.prototype.captureStream;

/* ---------- הפקה ---------- */
async function renderVideo({ source, cfg, filter, logo, font, music, audioCtx, onProgress, cancelled }) {
  const [W, H] = RATIOS[cfg.ratio];
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const dest = audioCtx.createMediaStreamDestination();
  const cleanup = [];
  let musicFailed = false, origBuf = null, musicBuf = null;

  let media, mw, mh, dur;
  const segs = (cfg.segments || []).filter((s) => segLen(s) > 0.05);
  if (source.kind === "video") {
    if (!segs.length) throw new Error("no segments");
    const el = document.createElement("video");
    Object.assign(el, { src: source.src, playsInline: true, preload: "auto", muted: false });
    el.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    cleanup.push(() => { el.pause(); el.remove(); });
    if (el.readyState < 1) await waitFor(el, "loadedmetadata");
    dur = totalLen(segs);
    if (cfg.orig && cfg.origVol > 0) {
      // הסאונד המקורי מפוענח מהקובץ, והקטעים מחוברים לרצועה אחת. סרטון ארוך מדי
      // לפענוח בזיכרון: הסאונד נלקח מהנגן עצמו, שקופץ בין הקטעים יחד עם התמונה
      const full = el.duration <= DECODE_MAX_SEC ? await decode(audioCtx, source.src) : null;
      if (full) {
        const sr = full.sampleRate;
        origBuf = audioCtx.createBuffer(full.numberOfChannels, Math.max(1, Math.ceil(dur * sr)), sr);
        let at = 0;
        for (const sg of segs) {
          const from = Math.floor(sg.start * sr), n = Math.min(Math.floor(segLen(sg) * sr), full.length - from, origBuf.length - at);
          for (let ch = 0; ch < full.numberOfChannels; ch++) origBuf.getChannelData(ch).set(full.getChannelData(ch).subarray(from, from + Math.max(0, n)), at);
          at += Math.floor(segLen(sg) * sr);
        }
      } else {
        const gain = audioCtx.createGain();
        gain.gain.value = cfg.origVol;
        audioCtx.createMediaElementSource(el).connect(gain).connect(dest);
      }
    }
    if (origBuf || !cfg.orig || cfg.origVol <= 0) el.muted = true;
    el.currentTime = segs[0].start;
    await waitFor(el, "seeked");
    media = el; mw = el.videoWidth; mh = el.videoHeight;
  } else {
    media = await loadImage(source.src);
    mw = media.naturalWidth; mh = media.naturalHeight; dur = cfg.imgDur;
  }

  if (music && cfg.music && cfg.musicVol > 0) {
    musicBuf = await decode(audioCtx, music.url);
    musicFailed = !musicBuf; // השרת של השיר לא מאפשר עיבוד בדפדפן: ממשיכים בלי מוזיקה
  }
  // מתזמן את הסאונד (המקורי והמוזיקה) לרגע שבו ההקלטה מתחילה
  const startAudio = () => {
    const now = audioCtx.currentTime;
    if (origBuf) {
      const s = audioCtx.createBufferSource(), g = audioCtx.createGain();
      s.buffer = origBuf; g.gain.value = cfg.origVol;
      s.connect(g).connect(dest);
      s.start(now);
      cleanup.push(() => { try { s.stop(); } catch {} });
    }
    if (musicBuf) {
      const s = audioCtx.createBufferSource(), g = audioCtx.createGain();
      s.buffer = musicBuf; s.loop = true;
      g.gain.setValueAtTime(cfg.musicVol, now);
      g.gain.setValueAtTime(cfg.musicVol, now + Math.max(0, dur - 0.8));
      g.gain.linearRampToValueAtTime(0, now + dur); // המוזיקה דועכת בסוף
      s.connect(g).connect(dest);
      s.start(now);
      cleanup.push(() => { try { s.stop(); } catch {} });
    }
  };

  const stream = canvas.captureStream(30);
  dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
  const mime = pickMime();
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 160_000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });

  const frame = (t) => drawFrame(ctx, W, H, { media, kind: source.kind, mw, mh, t, dur, cfg, filter, logo, font });
  frame(0);
  rec.start(250);
  if (source.kind === "video") await media.play();
  startAudio();
  const t0 = performance.now();
  let si = 0, acc = 0; // הקטע הנוכחי, וכמה זמן כבר הוקלט לפניו

  // מעבר לקטע הבא: ההקלטה ומנוע הסאונד נעצרים בזמן הקפיצה, כדי שלא ייכנסו לסרטון
  // פריים קפוא או שקט
  const nextSegment = async () => {
    rec.pause();
    await audioCtx.suspend().catch(() => {});
    media.pause();
    acc += segLen(segs[si]);
    si++;
    media.currentTime = segs[si].start;
    await waitFor(media, "seeked").catch(() => {});
    frame(acc);
    await media.play().catch(() => {});
    await audioCtx.resume().catch(() => {});
    rec.resume();
  };

  await new Promise((resolve) => {
    // רענון מסך הוא הקצב הרגיל. טיימר גיבוי ממשיך לבדוק גם כשהדפדפן מקפיא את הציור
    // (מסך נעול, אפליקציה אחרת), כדי שביטול לא ייתקע
    const next = () => {
      let ran = false;
      const go = () => { if (!ran) { ran = true; tick(); } };
      requestAnimationFrame(go);
      setTimeout(go, 150);
    };
    const tick = () => {
      if (source.kind === "video" && !cancelled() && (media.currentTime >= segs[si].end - 0.02 || media.ended)) {
        if (si === segs.length - 1) return resolve();
        nextSegment().then(next);
        return;
      }
      const t = source.kind === "video" ? acc + (media.currentTime - segs[si].start) : (performance.now() - t0) / 1000;
      if (cancelled() || t >= dur) return resolve();
      frame(clamp(t, 0, dur));
      onProgress(clamp(t / dur, 0, 1));
      next();
    };
    next();
  });
  frame(dur);
  rec.stop();
  await stopped;
  cleanup.forEach((f) => f());
  if (cancelled()) return null;
  const type = (mime || chunks[0]?.type || "video/webm").split(";")[0];
  const blob = new Blob(chunks, { type });
  return { blob, url: URL.createObjectURL(blob), ext: type.includes("mp4") ? "mp4" : "webm", type, musicFailed };
}

/* ---------- חלון העריכה ---------- */
export default function VideoEditor({ t, header, version, source, filter, effectName, logo, logoCfg, defaults, music, saved, Switch, toast, onDone }) {
  const [cfg, setCfg] = useState(() => ({
    ratio: "9:16", start: 0, end: 0, imgDur: 6, fade: true,
    caps: defaults.caps, capText: defaults.capText, capStyle: "pop", capSize: defaults.bigCaps ? "l" : "m", capPos: "bottom",
    orig: true, origVol: 1, music: !!music, musicVol: 0.6,
    effect: true, logo: defaults.logo && !!logo, logoCfg,
    ...(saved || {}),
    // עריכה ישנה שמרה התחלה וסוף אחד: הופך לקטע אחד
    segments: saved?.segments?.length ? saved.segments : [{ start: saved?.start || 0, end: saved?.end || 0 }],
  }));
  const segRef = useRef(0); // באיזה קטע התצוגה המקדימה נמצאת
  const [tab, setTab] = useState("cut");
  const [dur, setDur] = useState(0); // אורך המקור
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [job, setJob] = useState(null); // { p } בזמן הפקה
  const [result, setResult] = useState(null);
  const [stt, setStt] = useState(false); // תמלול בתהליך
  const up = (patch) => setCfg((c) => ({ ...c, ...patch }));

  const canvasRef = useRef(null), vidRef = useRef(null), audRef = useRef(null), imgRef = useRef(null);
  const logoRef = useRef(null), fontRef = useRef("sans-serif"), cfgRef = useRef(cfg), stateRef = useRef({});
  const cancelRef = useRef(false);
  const isVideo = source?.kind === "video";
  const segs = cfg.segments;
  const outDur = isVideo ? totalLen(segs) : cfg.imgDur;
  const curSeg = locate(segs, pos).i; // הקטע שמוצג עכשיו, מסומן ברשימה
  // לולאת הציור קוראת את ההגדרות העדכניות מכאן, בלי להתחיל מחדש בכל שינוי
  useEffect(() => {
    cfgRef.current = cfg;
    stateRef.current = { playing, outDur, filter, pos };
  });

  // גופן האפליקציה (Heebo) והלוגו
  useEffect(() => {
    const fam = getComputedStyle(document.body).fontFamily || "sans-serif";
    fontRef.current = fam;
    document.fonts?.load(`800 40px ${fam}`).catch(() => {});
    prepareLogo(logo).then((l) => { logoRef.current = l; }).catch(() => { logoRef.current = null; });
  }, [logo]);

  // תמונה כמקור
  useEffect(() => {
    if (source?.kind !== "image") return;
    loadImage(source.src).then((img) => { imgRef.current = img; }).catch(() => toast(t("לא הצלחנו לטעון את התמונה", "We couldn't load the image")));
  }, [source, t, toast]);

  // לולאת התצוגה המקדימה: מציירת את הפריים הנוכחי בכל רענון מסך
  useEffect(() => {
    let raf, t0 = performance.now(), last = 0;
    const tick = () => {
      const c = cfgRef.current, st = stateRef.current, canvas = canvasRef.current;
      if (canvas) {
        const [W, H] = RATIOS[c.ratio];
        const w = Math.round(W * PREVIEW_SCALE), h = Math.round(H * PREVIEW_SCALE);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        let media = null, mw = 0, mh = 0, tt = 0;
        if (isVideo && vidRef.current) {
          const v = vidRef.current;
          media = v; mw = v.videoWidth; mh = v.videoHeight;
          const sg = c.segments;
          let ci = Math.min(segRef.current, sg.length - 1);
          // סוף קטע: קופצים לקטע הבא, ואחרי האחרון חוזרים לראשון
          if (st.playing && sg[ci] && v.currentTime >= sg[ci].end - 0.03) {
            ci = (ci + 1) % sg.length;
            v.currentTime = sg[ci].start;
            if (ci === 0 && audRef.current) audRef.current.currentTime = 0;
          }
          segRef.current = ci;
          tt = sg[ci] ? segOffset(sg, ci) + clamp(v.currentTime - sg[ci].start, 0, segLen(sg[ci])) : 0;
        } else if (imgRef.current) {
          media = imgRef.current; mw = media.naturalWidth; mh = media.naturalHeight;
          if (st.playing) { tt = ((performance.now() - t0) / 1000) % Math.max(st.outDur, 0.1); if (tt < last && audRef.current) audRef.current.currentTime = 0; last = tt; }
          else { tt = st.pos; t0 = performance.now() - st.pos * 1000; }
        }
        tt = clamp(tt, 0, st.outDur);
        drawFrame(canvas.getContext("2d"), w, h, { media, kind: source?.kind, mw, mh, t: tt, dur: st.outDur, cfg: c, filter: st.filter, logo: logoRef.current, font: fontRef.current, still: !st.playing });
        if (st.playing) setPos((p) => (Math.abs(p - tt) > 0.2 ? tt : p));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isVideo, source]);

  // עצירה בעזיבת החלון
  useEffect(() => () => { cancelRef.current = true; vidRef.current?.pause(); audRef.current?.pause(); }, []);

  const onMeta = () => {
    const d = vidRef.current?.duration;
    if (!d || !isFinite(d)) return;
    setDur(d);
    // קטע ראשון בלי סוף = כל הסרטון. קטעים שחורגים מאורך הסרטון נחתכים אליו
    setCfg((c) => ({
      ...c,
      segments: c.segments.map((s) => {
        const start = s.start < d ? s.start : 0;
        return { start, end: s.end > start && s.end <= d ? s.end : d };
      }),
    }));
  };
  // הסרטון כבר יכול להיות טעון (מהמטמון) לפני שהאירוע מחובר
  useEffect(() => {
    if (vidRef.current?.readyState >= 1) onMeta();
  }, []);

  const togglePlay = () => {
    const v = vidRef.current, a = audRef.current;
    if (playing) { v?.pause(); a?.pause(); setPlaying(false); return; }
    if (v) {
      // ממשיכים מהמיקום הנוכחי בסרטון הסופי; בסוף, מתחילים מההתחלה
      const at = locate(segs, pos >= outDur - 0.05 ? 0 : pos);
      segRef.current = at.i;
      v.currentTime = at.src;
      v.play().catch(() => {});
    }
    if (a && cfg.music) { a.volume = cfg.musicVol; a.play().catch(() => {}); }
    setPlaying(true);
  };
  const seek = (s) => {
    setPos(s);
    const at = locate(segs, s);
    segRef.current = at.i;
    if (vidRef.current) vidRef.current.currentTime = at.src;
  };
  // שינוי נקודות של קטע מזיז את הסרטון לנקודה כדי שרואים אותה
  const MIN_SEG = 0.5;
  const setSeg = (i, k, val) => {
    if (val == null || !isFinite(val)) return;
    const s = segs[i];
    const v = k === "start" ? clamp(val, 0, Math.max(0, s.end - MIN_SEG)) : clamp(val, s.start + MIN_SEG, dur || s.end);
    up({ segments: segs.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
    segRef.current = i;
    if (vidRef.current) vidRef.current.currentTime = k === "start" ? v : Math.max(0, v - 0.5);
    setPos(segOffset(segs, i) + (k === "start" ? 0 : Math.max(0, v - 0.5 - s.start)));
  };
  // קטע חדש: מתחיל איפה שהקודם נגמר, באורך 5 שניות
  const addSeg = () => {
    const last = segs[segs.length - 1];
    const start = last.end + 1 <= dur ? last.end : Math.max(0, dur - 5);
    up({ segments: [...segs, { start, end: Math.min(dur, start + 5) }] });
    segRef.current = segs.length;
    if (vidRef.current) vidRef.current.currentTime = start;
    setPos(totalLen(segs));
  };
  const removeSeg = (i) => {
    if (segs.length < 2) return;
    up({ segments: segs.filter((_, j) => j !== i) });
    segRef.current = 0;
    seek(0);
  };
  // הזזת קטע למעלה או למטה ברשימה = שינוי הסדר בסרטון
  const moveSeg = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= segs.length) return;
    const next = [...segs];
    [next[i], next[j]] = [next[j], next[i]];
    up({ segments: next });
  };
  useEffect(() => { if (vidRef.current) vidRef.current.volume = cfg.origVol; }, [cfg.origVol]);
  useEffect(() => { if (audRef.current) { audRef.current.volume = cfg.musicVol; if (!cfg.music) audRef.current.pause(); else if (playing) audRef.current.play().catch(() => {}); } }, [cfg.music, cfg.musicVol, playing]);

  const exportVideo = async () => {
    if (!canRender()) return toast(t("הדפדפן הזה לא תומך בהפקת וידאו. נסו בכרום, אדג׳ או ספארי מעודכן.", "This browser can't export video. Try an up-to-date Chrome, Edge or Safari."));
    if (outDur < 0.5) return toast(t("הקטע קצר מדי", "The clip is too short"));
    vidRef.current?.pause(); audRef.current?.pause(); setPlaying(false);
    // את מנוע הסאונד חייבים לפתוח ישירות מהלחיצה, לפני כל המתנה
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume().catch(() => {});
    cancelRef.current = false;
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setJob({ p: 0 });
    // יציאה מהאפליקציה באמצע (מסך נעול, מעבר לאפליקציה אחרת) עוצרת את ההפקה
    let left = false;
    const onHide = () => { if (document.hidden) { left = true; cancelRef.current = true; } };
    document.addEventListener("visibilitychange", onHide);
    try {
      const res = await renderVideo({
        source, cfg, filter, logo: logoRef.current, font: fontRef.current, music, audioCtx,
        onProgress: (p) => setJob((j) => (j && Math.abs(j.p - p) > 0.01 ? { p } : j)),
        cancelled: () => cancelRef.current,
      });
      if (res) {
        setResult(res);
        if (res.musicFailed) toast(t("הסרטון מוכן, אבל בלי המוזיקה: השיר הזה לא זמין להפקה בדפדפן. נסו שיר אחר.", "The video is ready, but without music: this track can't be processed in the browser. Try another track."));
        else toast(t("הסרטון מוכן 🎬", "Your video is ready 🎬"));
      } else if (left) {
        toast(t("ההפקה נעצרה כי יצאתם מהאפליקציה. נסו שוב, והשאירו את המסך פתוח עד הסוף.", "Export stopped because you left the app. Try again and keep the screen open until it ends."));
      }
    } catch {
      toast(t("ההפקה נכשלה. נסו שוב, או בחרו קטע קצר יותר.", "Export failed. Try again, or pick a shorter clip."));
    } finally {
      document.removeEventListener("visibilitychange", onHide);
      setJob(null);
      audioCtx.close().catch(() => {});
    }
  };
  const share = async () => {
    const file = new File([result.blob], `gilos-${version.id}.${result.ext}`, { type: result.type });
    try { await navigator.share({ files: [file] }); } catch {}
  };
  const canShare = result && typeof navigator !== "undefined" && navigator.canShare?.({ files: [new File([result.blob], `x.${result.ext}`, { type: result.type })] });

  if (!source) return (
    <section className="screen" style={{ gap: 12 }}>{header}<div className="empty">{t("לגרסה הזו אין תמונה או סרטון לעריכה.", "This version has no photo or video to edit.")}</div></section>
  );

  const [RW, RH] = RATIOS[cfg.ratio];
  const busy = !!job || stt;

  // כתוביות אוטומטיות: מתמללים את הקטע שנבחר, והמילים נכנסות עם התזמון שלהן
  const STT_ERRORS = {
    not_configured: t("שירות הכתוביות האוטומטיות עוד לא מחובר.", "Automatic captions aren't connected yet."),
    rate_limited: t("יותר מדי בקשות כרגע. נסו שוב בעוד דקה.", "Too many requests right now. Try again in a minute."),
    too_large: t("הקטע ארוך מדי. קצרו אותו בלשונית החיתוך.", "The clip is too long. Shorten it in the Trim tab."),
    no_audio: t("לא הצלחנו לקרוא את הסאונד של הסרטון.", "We couldn't read the video's sound."),
    network: t("אין חיבור לאינטרנט. נסו שוב.", "No internet connection. Try again."),
  };
  const autoCaptions = async () => {
    if (!isVideo || stt || job) return;
    setStt(true);
    const res = await transcribeClip(source.src, segs);
    setStt(false);
    if (res.error) return toast(STT_ERRORS[res.error] || t("התמלול נכשל. נסו שוב.", "Transcription failed. Try again."));
    if (!res.words.length) return toast(t("לא זוהה דיבור בקטע הזה", "No speech found in this part"));
    up({ caps: true, capStyle: "pop", words: res.words, wordsKey: segKey(segs), capText: res.words.map((w) => w.word).join(" ") });
    toast(res.cut ? t("הכתוביות נוצרו ל-10 הדקות הראשונות", "Captions were made for the first 10 minutes")
      : t("הכתוביות נוצרו ✨ אפשר לתקן מילים בטקסט", "Captions are ready ✨ You can fix words in the text"));
  };
  return (
    <section className="screen" style={{ gap: 12 }}>
      {header}
      <div className="scroll" style={{ gap: 12 }}>
        <div className="edstage">
          <canvas ref={canvasRef} className="edcanvas" style={{ aspectRatio: `${RW} / ${RH}` }} onClick={busy ? undefined : togglePlay} aria-label={t("תצוגה מקדימה של העריכה", "Edit preview")} />
          {!playing && !busy && <button className="edplay" onClick={togglePlay} aria-label={t("ניגון", "Play")}>▶</button>}
          {busy && <div className="vapplying"><span className="ring" style={{ width: 54, height: 54 }} /><span>{job ? `${t("מפיקים את הסרטון…", "Exporting your video…")} ${Math.round(job.p * 100)}%` : t("מתמללים את הדיבור…", "Transcribing the speech…")}</span></div>}
        </div>
        {isVideo && <video ref={vidRef} src={source.src} playsInline preload="auto" muted={!cfg.orig} onLoadedMetadata={onMeta} onPause={() => setPlaying(false)} style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />}
        {music && <audio ref={audRef} src={music.url} preload="auto" loop />}
        <label className="rangerow edtime">
          <span>{playing ? "❚❚" : "▶"}</span>
          <input type="range" min="0" max={outDur || 0} step="0.05" value={clamp(pos, 0, outDur)} onChange={(e) => seek(+e.target.value)} dir="ltr" disabled={busy} aria-label={t("מיקום בסרטון", "Position")} />
          <b className="ltr">{fmt(pos)}/{fmt(outDur)}</b>
        </label>

        <div className="seg" role="tablist">
          {[["cut", t("חיתוך", "Trim")], ["caps", t("כיתוב", "Captions")], ["sound", t("סאונד", "Sound")], ["look", t("מראה", "Look")]].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === "cut" && (
          <div className="card stack">
            {isVideo ? <>
              <div className="row"><h3>{t("הקטעים שנכנסים לסרטון", "Parts that go in")}</h3><span className="muted small">{t(`סה״כ ${fmt(outDur)}`, `Total ${fmt(outDur)}`)}</span></div>
              <span className="muted small">{t("הקטעים מתחברים לפי הסדר ברשימה. אפשר לגרור את הפס או להקליד זמן (למשל 2:05).", "Parts play in list order. Drag the slider or type a time (e.g. 2:05).")}</span>
              {segs.map((sg, i) => (
                <div key={i} className={`segcard ${curSeg === i ? "on" : ""}`}>
                  <div className="row">
                    <b>{t(`קטע ${i + 1}`, `Part ${i + 1}`)} <span className="muted small ltr">· {fmt(segLen(sg))}</span></b>
                    <span className="segtools">
                      {segs.length > 1 && <>
                        <button className="chip small" onClick={() => moveSeg(i, -1)} disabled={busy || i === 0} aria-label={t("להזיז למעלה", "Move up")}>▲</button>
                        <button className="chip small" onClick={() => moveSeg(i, 1)} disabled={busy || i === segs.length - 1} aria-label={t("להזיז למטה", "Move down")}>▼</button>
                        <button className="chip small" onClick={() => removeSeg(i)} disabled={busy} aria-label={t("מחיקת הקטע", "Delete part")}>×</button>
                      </>}
                    </span>
                  </div>
                  {[["start", t("התחלה", "Start")], ["end", t("סוף", "End")]].map(([k, l]) => (
                    <label key={k} className="rangerow segrow"><span>{l}</span>
                      <input type="range" min="0" max={dur || 0} step="0.1" value={sg[k]} onChange={(e) => setSeg(i, k, +e.target.value)} dir="ltr" disabled={busy} />
                      <input key={`${k}-${sg[k].toFixed(1)}`} className="ltr segtime" defaultValue={fmtFine(sg[k])} inputMode="decimal" disabled={busy} aria-label={`${l} ${i + 1}`}
                        onBlur={(e) => { const v = parseTime(e.target.value); if (v == null) e.target.value = fmtFine(sg[k]); else setSeg(i, k, v); }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                    </label>
                  ))}
                </div>
              ))}
              <button className="btn btn-soft btn-sm" onClick={addSeg} disabled={busy || !dur}>{t("＋ הוספת קטע", "＋ Add a part")}</button>
            </> : <>
              <h3>{t("כמה זמן התמונה מוצגת", "How long the photo shows")}</h3>
              <label className="rangerow"><span>{t("אורך", "Length")}</span>
                <input type="range" min="3" max="15" step="1" value={cfg.imgDur} onChange={(e) => up({ imgDur: +e.target.value })} dir="ltr" disabled={busy} />
                <b className="ltr">{cfg.imgDur}s</b></label>
            </>}
            <span className="small">{t("פורמט", "Format")}</span>
            <div className="seg">
              {[["9:16", t("סטורי / ריל", "Story / Reel")], ["4:5", t("פוסט", "Post")], ["1:1", t("ריבוע", "Square")]].map(([k, l]) => (
                <button key={k} className={cfg.ratio === k ? "on" : ""} onClick={() => up({ ratio: k })} disabled={busy}>{l}</button>
              ))}
            </div>
            <div className="row"><span className="small">{t("פתיחה וסיום רכים", "Soft fade in and out")}</span><Switch on={cfg.fade} onClick={() => up({ fade: !cfg.fade })} label={t("פתיחה וסיום רכים", "Soft fade in and out")} /></div>
          </div>
        )}

        {tab === "caps" && (
          <div className="card stack">
            <div className="row"><h3>{t("כיתוב על הסרטון", "Captions on the video")}</h3><Switch on={cfg.caps} onClick={() => up({ caps: !cfg.caps })} label={t("כיתוב על הסרטון", "Captions on the video")} /></div>
            {cfg.caps && <>
              <textarea dir="auto" style={{ height: 76, fontSize: 14 }} value={cfg.capText} onChange={(e) => up({ capText: e.target.value })} aria-label={t("טקסט הכיתוב", "Caption text")} placeholder={t("מה יופיע על הסרטון", "What appears on the video")} disabled={busy} />
              {isVideo && (
                <button className="btn btn-soft btn-sm" onClick={autoCaptions} disabled={busy}>
                  {stt ? t("מתמללים את הדיבור…", "Transcribing…") : cfg.words?.length ? t("✨ ליצור שוב ממה שנאמר", "✨ Make again from speech") : t("✨ כתוביות אוטומטיות ממה שנאמר", "✨ Auto captions from speech")}
                </button>
              )}
              {cfg.words?.length > 0 && <span className="muted small">{cfg.wordsKey !== segKey(segs)
                ? t("הקטעים השתנו מאז התמלול. לחצו ״ליצור שוב״ כדי שהכתוביות יתאימו.", "The parts changed since transcription. Tap “Make again” so captions match.")
                : cfg.capText.split(/\s+/).filter(Boolean).length === cfg.words.length
                ? t("הכתוביות מתוזמנות לדיבור. אפשר לתקן מילה, בלי להוסיף או למחוק מילים.", "Captions follow the speech. You can fix a word, without adding or removing words.")
                : t("מספר המילים השתנה, אז הכיתוב מתחלק שווה לאורך הסרטון.", "The word count changed, so the caption is spread evenly over the video.")}</span>}
              <div className="row start" style={{ gap: 8, flexWrap: "wrap" }}>
                {CAP_STYLES.map(([k, he, en]) => (
                  <button key={k} className={`tile capstyle ${cfg.capStyle === k ? "on" : ""}`} aria-pressed={cfg.capStyle === k} onClick={() => up({ capStyle: k })} disabled={busy}>
                    <span className={`capthumb ${k}`} aria-hidden="true">{t("אבג", "Abc")}</span><span className="tilelabel">{t(he, en)}</span>
                  </button>
                ))}
              </div>
              <span className="small">{t("גודל", "Size")}</span>
              <div className="seg">{[["s", t("קטן", "Small")], ["m", t("בינוני", "Medium")], ["l", t("גדול", "Large")]].map(([k, l]) => <button key={k} className={cfg.capSize === k ? "on" : ""} onClick={() => up({ capSize: k })} disabled={busy}>{l}</button>)}</div>
              <span className="small">{t("מיקום", "Position")}</span>
              <div className="seg">{[["top", t("למעלה", "Top")], ["mid", t("באמצע", "Middle")], ["bottom", t("למטה", "Bottom")]].map(([k, l]) => <button key={k} className={cfg.capPos === k ? "on" : ""} onClick={() => up({ capPos: k })} disabled={busy}>{l}</button>)}</div>
            </>}
          </div>
        )}

        {tab === "sound" && (
          <div className="card stack">
            {isVideo && <>
              <div className="row"><h3>{t("הסאונד המקורי", "Original sound")}</h3><Switch on={cfg.orig} onClick={() => up({ orig: !cfg.orig })} label={t("הסאונד המקורי", "Original sound")} /></div>
              {cfg.orig && <label className="rangerow"><span>{t("עוצמה", "Volume")}</span>
                <input type="range" min="0" max="1" step="0.05" value={cfg.origVol} onChange={(e) => up({ origVol: +e.target.value })} dir="ltr" disabled={busy} />
                <b className="ltr">{Math.round(cfg.origVol * 100)}%</b></label>}
            </>}
            {music ? <>
              <div className="row"><div><h3>{t("מוזיקה", "Music")}</h3><span className="muted small" dir="auto">🎵 {music.title}</span></div><Switch on={cfg.music} onClick={() => up({ music: !cfg.music })} label={t("מוזיקה", "Music")} /></div>
              {cfg.music && <label className="rangerow"><span>{t("עוצמה", "Volume")}</span>
                <input type="range" min="0" max="1" step="0.05" value={cfg.musicVol} onChange={(e) => up({ musicVol: +e.target.value })} dir="ltr" disabled={busy} />
                <b className="ltr">{Math.round(cfg.musicVol * 100)}%</b></label>}
            </> : <span className="muted small">{t("עוד לא נבחר שיר. אפשר לבחור במסך ההעלאה, תחת ״סאונד״.", "No track chosen yet. Pick one on the upload screen, under “Sound”.")}</span>}
          </div>
        )}

        {tab === "look" && (
          <div className="card stack">
            <div className="row"><div><h3>{t("אפקט", "Effect")}</h3><span className="muted small">{effectName || t("בלי אפקט. בוחרים במסך התצוגה המקדימה.", "No effect. Pick one on the preview screen.")}</span></div>
              {filter && <Switch on={cfg.effect} onClick={() => up({ effect: !cfg.effect })} label={t("אפקט", "Effect")} />}</div>
            <div className="row"><div><h3>{t("לוגו", "Logo")}</h3><span className="muted small">{logo ? t("המיקום, הגודל והצבע כמו בתצוגה המקדימה", "Position, size and color as on the preview screen") : t("עוד לא הועלה לוגו — אפשר להעלות בהגדרות", "No logo yet — upload one in Settings")}</span></div>
              {logo && <Switch on={cfg.logo} onClick={() => up({ logo: !cfg.logo })} label={t("לוגו", "Logo")} />}</div>
          </div>
        )}

        {result && (
          <div className="card stack">
            <h3>{t("הסרטון הערוך", "Your edited video")}</h3>
            <video className="edresult" src={result.url} controls playsInline style={{ aspectRatio: `${RW} / ${RH}` }} />
            <div className="acts">
              <button className="act pub" style={{ height: 42 }} onClick={() => onDone({ url: result.url, cfg })}>{t("✓ שימוש בגרסה הזו", "✓ Use this version")}</button>
              <a className="act" style={{ height: 42, display: "flex", alignItems: "center", justifyContent: "center" }} href={result.url} download={`gilos-${version.id}.${result.ext}`}>{t("הורדה", "Download")}</a>
              {canShare && <button className="act" style={{ height: 42 }} onClick={share}>{t("שיתוף", "Share")}</button>}
            </div>
            {result.ext === "webm" && <span className="muted small">{t("הקובץ בפורמט WebM. רוב הרשתות מקבלות אותו; אם לא, בכרום מעודכן הוא יוצא כ-MP4.", "The file is WebM. Most networks accept it; if not, an up-to-date Chrome exports MP4.")}</span>}
          </div>
        )}
      </div>
      {stt
        ? <button className="btn btn-outline" style={{ height: 48, fontSize: 15 }} disabled>{t("מתמללים…", "Transcribing…")}</button>
        : job
        ? <button className="btn btn-outline" style={{ height: 48, fontSize: 15 }} onClick={() => { cancelRef.current = true; }}>{t("ביטול ההפקה", "Cancel export")}</button>
        : <button className="btn btn-primary" style={{ height: 48, fontSize: 15 }} onClick={exportVideo}>{result ? t("🎬 הפקה מחדש", "🎬 Export again") : t("🎬 הפקת הסרטון", "🎬 Export the video")}</button>}
      <span className="muted small tc">{t("ההפקה נעשית על המכשיר ולוקחת בערך את אורך הסרטון. השאירו את החלון פתוח עד שהיא מסתיימת.", "Export runs on your device and takes about as long as the video. Keep this window open until it finishes.")}</span>
    </section>
  );
}
