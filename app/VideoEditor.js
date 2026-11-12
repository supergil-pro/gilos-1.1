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
const POP_CHUNK = 4;
const PREVIEW_SCALE = 1 / 3;
const MIME_TYPES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
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
  if (cfg.capStyle === "pop") {
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
      ctx.beginPath();
      ctx.roundRect((W - bw) / 2, y - bh / 2, bw, bh, fs * 0.25);
      ctx.fill();
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
  let musicFailed = false;

  let media, mw, mh, dur;
  if (source.kind === "video") {
    const el = document.createElement("video");
    Object.assign(el, { src: source.src, playsInline: true, preload: "auto", muted: false });
    el.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    cleanup.push(() => { el.pause(); el.remove(); });
    if (el.readyState < 1) await waitFor(el, "loadedmetadata");
    const gain = audioCtx.createGain();
    gain.gain.value = cfg.orig ? cfg.origVol : 0;
    audioCtx.createMediaElementSource(el).connect(gain).connect(dest);
    el.currentTime = cfg.start;
    await waitFor(el, "seeked");
    media = el; mw = el.videoWidth; mh = el.videoHeight; dur = cfg.end - cfg.start;
  } else {
    media = await loadImage(source.src);
    mw = media.naturalWidth; mh = media.naturalHeight; dur = cfg.imgDur;
  }

  let musicEl = null;
  if (music && cfg.music) {
    musicEl = new Audio();
    musicEl.crossOrigin = "anonymous";
    musicEl.src = music.url;
    musicEl.loop = true;
    try {
      await waitFor(musicEl, "canplay", "error", 10000);
      const g = audioCtx.createGain();
      const now = audioCtx.currentTime;
      g.gain.setValueAtTime(cfg.musicVol, now);
      g.gain.setValueAtTime(cfg.musicVol, now + Math.max(0, dur - 0.8));
      g.gain.linearRampToValueAtTime(0, now + dur); // המוזיקה דועכת בסוף
      audioCtx.createMediaElementSource(musicEl).connect(g).connect(dest);
      cleanup.push(() => musicEl.pause());
    } catch {
      musicFailed = true; // השרת של השיר לא מאפשר עיבוד בדפדפן: ממשיכים בלי מוזיקה
      musicEl = null;
    }
  }

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
  if (musicEl) await musicEl.play().catch(() => {});
  const t0 = performance.now();

  await new Promise((resolve) => {
    const tick = () => {
      const t = source.kind === "video" ? media.currentTime - cfg.start : (performance.now() - t0) / 1000;
      if (cancelled() || t >= dur || (source.kind === "video" && media.ended)) return resolve();
      frame(clamp(t, 0, dur));
      onProgress(clamp(t / dur, 0, 1));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
  }));
  const [tab, setTab] = useState("cut");
  const [dur, setDur] = useState(0); // אורך המקור
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [job, setJob] = useState(null); // { p } בזמן הפקה
  const [result, setResult] = useState(null);
  const up = (patch) => setCfg((c) => ({ ...c, ...patch }));

  const canvasRef = useRef(null), vidRef = useRef(null), audRef = useRef(null), imgRef = useRef(null);
  const logoRef = useRef(null), fontRef = useRef("sans-serif"), cfgRef = useRef(cfg), stateRef = useRef({});
  const cancelRef = useRef(false);
  const isVideo = source?.kind === "video";
  const outDur = isVideo ? Math.max(0, cfg.end - cfg.start) : cfg.imgDur;
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
          if (st.playing && v.currentTime >= c.end - 0.03) {
            v.currentTime = c.start;
            if (audRef.current) audRef.current.currentTime = 0;
          }
          tt = v.currentTime - c.start;
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
    setCfg((c) => ({ ...c, end: c.end > 0 && c.end <= d ? c.end : d, start: c.start < d ? c.start : 0 }));
  };
  // הסרטון כבר יכול להיות טעון (מהמטמון) לפני שהאירוע מחובר
  useEffect(() => {
    if (vidRef.current?.readyState >= 1) onMeta();
  }, []);

  const togglePlay = () => {
    const v = vidRef.current, a = audRef.current;
    if (playing) { v?.pause(); a?.pause(); setPlaying(false); return; }
    if (v) { if (v.currentTime < cfg.start || v.currentTime >= cfg.end - 0.05) v.currentTime = cfg.start; v.play().catch(() => {}); }
    if (a && cfg.music) { a.volume = cfg.musicVol; a.play().catch(() => {}); }
    setPlaying(true);
  };
  const seek = (s) => {
    setPos(s);
    if (vidRef.current) vidRef.current.currentTime = cfg.start + s;
  };
  // שינוי נקודות החיתוך מזיז את הסרטון לנקודה כדי שרואים אותה
  const setTrim = (k, val) => {
    const next = k === "start" ? { start: clamp(val, 0, cfg.end - 1) } : { end: clamp(val, cfg.start + 1, dur) };
    up(next);
    if (vidRef.current) vidRef.current.currentTime = k === "start" ? next.start : Math.max(0, next.end - 0.5);
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
      }
    } catch {
      toast(t("ההפקה נכשלה. נסו שוב, או בחרו קטע קצר יותר.", "Export failed. Try again, or pick a shorter clip."));
    } finally {
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
  const busy = !!job;
  return (
    <section className="screen" style={{ gap: 12 }}>
      {header}
      <div className="scroll" style={{ gap: 12 }}>
        <div className="edstage">
          <canvas ref={canvasRef} className="edcanvas" style={{ aspectRatio: `${RW} / ${RH}` }} onClick={busy ? undefined : togglePlay} aria-label={t("תצוגה מקדימה של העריכה", "Edit preview")} />
          {!playing && !busy && <button className="edplay" onClick={togglePlay} aria-label={t("ניגון", "Play")}>▶</button>}
          {busy && <div className="vapplying"><span className="ring" style={{ width: 54, height: 54 }} /><span>{t("מפיקים את הסרטון…", "Exporting your video…")} {Math.round(job.p * 100)}%</span></div>}
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
              <h3>{t("איזה קטע נכנס לסרטון", "Which part goes in")}</h3>
              <label className="rangerow"><span>{t("התחלה", "Start")}</span>
                <input type="range" min="0" max={dur || 0} step="0.1" value={cfg.start} onChange={(e) => setTrim("start", +e.target.value)} dir="ltr" disabled={busy} />
                <b className="ltr">{fmt(cfg.start)}</b></label>
              <label className="rangerow"><span>{t("סוף", "End")}</span>
                <input type="range" min="0" max={dur || 0} step="0.1" value={cfg.end} onChange={(e) => setTrim("end", +e.target.value)} dir="ltr" disabled={busy} />
                <b className="ltr">{fmt(cfg.end)}</b></label>
              <span className="muted small">{t(`אורך הסרטון: ${outDur.toFixed(1)} שניות`, `Length: ${outDur.toFixed(1)} seconds`)}</span>
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
              <span className="muted small">{t("בקרוב: כיתוב אוטומטי ממה שנאמר בסרטון", "Coming soon: automatic captions from what's said")}</span>
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
      {busy
        ? <button className="btn btn-outline" style={{ height: 48, fontSize: 15 }} onClick={() => { cancelRef.current = true; }}>{t("ביטול ההפקה", "Cancel export")}</button>
        : <button className="btn btn-primary" style={{ height: 48, fontSize: 15 }} onClick={exportVideo}>{result ? t("🎬 הפקה מחדש", "🎬 Export again") : t("🎬 הפקת הסרטון", "🎬 Export the video")}</button>}
      <span className="muted small tc">{t("ההפקה נעשית על המכשיר ולוקחת בערך את אורך הסרטון. השאירו את החלון פתוח עד שהיא מסתיימת.", "Export runs on your device and takes about as long as the video. Keep this window open until it finishes.")}</span>
    </section>
  );
}
