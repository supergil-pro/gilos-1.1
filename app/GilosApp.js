"use client";

import { useEffect, useRef, useState } from "react";

/* ---------- נתונים קבועים ---------- */
const SUPPORT_EMAIL = "postenter@gmail.com";
const GUEST_CREDITS = 3;
const MEMBER_CREDITS = 20;

const NETS = [
  { n: "Instagram", c: "#FF3355", v: 100 },
  { n: "Facebook", c: "#1E9BFF", v: 58 },
  { n: "TikTok", c: "#39FF14", v: 82 },
  { n: "YouTube", c: "#FFE600", v: 40 },
];
const color = (n) => NETS.find((x) => x.n === n).c;
const GRADS = [
  "linear-gradient(160deg,#1E9BFF,#0b1030 70%)",
  "linear-gradient(160deg,#FF3355,#2a0612 70%)",
  "linear-gradient(160deg,#FFE600,#3a2500 75%)",
  "linear-gradient(160deg,#39FF14,#04250a 70%)",
  "linear-gradient(160deg,#1E9BFF,#FF3355)",
  "linear-gradient(160deg,#39FF14,#1E9BFF)",
];
const STYLES = ["דינמי וקצבי", "נקי ומינימלי", "סיפורי ורגשי", "טרנדי", "הומוריסטי", "יוקרתי"];
const TIPS = [
  "פתיחה חזקה ב-2 השניות הראשונות",
  "הכתוביות מגדילות צפייה בלי קול",
  "כדאי לקצר את הסיום ב-3 שניות",
  "המוזיקה מתאימה לטרנד הנוכחי",
  "קריאה לפעולה ברורה בסוף",
];
const CAPS = [
  { text: "חדש אצלנו! ✨ בואו לראות מה הכנו לכם השבוע.", tags: ["#חדש", "#עסקקטן", "#מאחוריהקלעים"] },
  { text: "רגע קטן מהיום שלנו 💙 מה דעתכם?", tags: ["#יוםיום", "#קהילה", "#שיתוף"] },
  { text: "סוף השבוע מתחיל כאן 🔥 מחכים לכם!", tags: ["#סופש", "#מבצע", "#בואו"] },
];
const IDEAS = [
  "צלמו 10 שניות של מאחורי הקלעים בעסק — לקוחות אוהבים לראות את האנשים.",
  "שתפו טיפ אחד קצר מהתחום שלכם, עם כיתוב גדול.",
  "לפני / אחרי: שתי תמונות של עבודה שסיימתם השבוע.",
  "ענו בסרטון על שאלה שלקוחות שואלים הכי הרבה.",
];
const SOURCES = [["גלריה", "🖼️"], ["מצלמה", "📷"], ["מחשב", "💻"], ["קישור", "🔗"]];
const TRACKS = ["קצבי", "רגוע", "קיצי"];
const SLOTS = ["היום 20:00", "מחר 09:00", "מחר 18:00"];
const DAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const STEPS = ["מנתח את המדיה", "בוחר את הרגעים הכי חזקים", "מוסיף כתוביות, לוגו וסאונד", "מרכיב 3 גרסאות"];
const QUIZ = [
  { k: "type", t: "איזה תוכן אתם מעלים?", s: "נתאים את העריכה לתחום שלכם", o: ["עסק / מוצרים", "אוכל ומסעדות", "יופי וטיפוח", "כושר ובריאות", "נדל״ן", "אישי / לייף־סטייל"] },
  { k: "nets", t: "באילו רשתות אתם פעילים?", s: "אפשר לבחור כמה", multi: true, o: NETS.map((x) => x.n) },
  { k: "style", t: "איזה סגנון מתאים לכם?", s: "אפשר לשנות בכל רגע בהגדרות", o: ["דינמי וקצבי", "נקי ומינימלי", "חם ואישי", "יוקרתי", "הומוריסטי", "טרנדי"] },
  { k: "aud", t: "מי קהל היעד?", s: "כדי לבחור טון ושעות פרסום", o: ["גילאי 18–24", "גילאי 25–40", "גילאי 40+", "עסקים", "כולם"] },
  { k: "prompt", t: "תארו את העיצוב שאתם רוצים", s: "הפרומפט האישי שלכם — במילים פשוטות" },
];
const TABS = [
  ["home", "בית", <path key="p" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
  ["calendar", "לוח", <g key="p"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></g>],
  ["stats", "נתונים", <path key="p" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />],
  ["settings", "הגדרות", <g key="p"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></g>],
];

const INITIAL = {
  screen: "open",
  user: null,
  authMode: "register",
  name: "", mail: "", pass: "",
  credits: GUEST_CREDITS, maxCredits: GUEST_CREDITS,
  qi: 0,
  quiz: { type: "", nets: ["Instagram", "Facebook"], style: "", aud: "" },
  prompt: "",
  media: [],
  subs: true, watermark: true, sound: "lib", track: "קצבי", soundText: "",
  versions: [], gone: null, chosen: null, pstep: 0,
  cap: 0, caption: CAPS[0].text,
  nets: ["Instagram", "Facebook"], format: "סטורי", when: "best", slot: SLOTS[1], repeat: false,
  done: null,
  queue: [
    { id: 1, text: "מבצע סוף שבוע — 20% על הכול 🔥", nets: ["Instagram", "Facebook"], at: "מחר 09:00", g: GRADS[1] },
    { id: 2, text: "מאחורי הקלעים של הצילומים", nets: ["TikTok"], at: "יום ה׳ 18:30", g: GRADS[3] },
  ],
  saved: [],
  connected: ["Instagram", "Facebook"],
  intro: true, logo: false, fixed: [0, 2, 4], lang: "he", idea: 0,
};

/* ---------- עזרים ---------- */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const toggle = (arr, x) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
const scoreColor = (v) => (v >= 85 ? "var(--green)" : v >= 72 ? "var(--yellow)" : "var(--red)");
const cx = (...a) => a.filter(Boolean).join(" ");

function makeVersions() {
  const st = shuffle(STYLES), g = shuffle(GRADS), base = Date.now();
  return [0, 1, 2].map((i) => ({
    id: base + i, name: st[i], g: g[i],
    dur: "0:" + (12 + Math.floor(Math.random() * 18)),
    score: 62 + Math.floor(Math.random() * 35),
    tip: pick(TIPS), saved: false,
  }));
}

/* ---------- רכיבים קטנים ---------- */
const Back = ({ onClick }) => (
  <button className="back" onClick={onClick} aria-label="חזרה">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
  </button>
);
const Plus = ({ size, sw }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5v30M5 20h30" stroke="#fff" strokeWidth={sw} strokeLinecap="round" /></svg>
);
const Logo = ({ size, spacing }) => (
  <div className="logo ltr" style={{ fontSize: size, letterSpacing: spacing }}>GILOS <span className="plusmark">+</span></div>
);
const Switch = ({ on, onClick, label }) => (
  <button className={cx("switch", on && "on")} role="switch" aria-checked={on} aria-label={label} onClick={onClick} />
);
const Seg = ({ value, options, onChange }) => (
  <div className="seg">
    {options.map(([v, l]) => (<button key={v} className={cx(value === v && "on")} onClick={() => onChange(v)}>{l}</button>))}
  </div>
);
const Thumb = ({ g, style, children }) => <div className="thumb" style={{ "--g": g, ...style }}>{children}</div>;
const NetTags = ({ nets }) => (
  <div className="tags">
    {nets.map((n) => (<span key={n} className="tag net"><i className="dot" style={{ "--c": color(n) }} /><span className="ltr">{n}</span></span>))}
  </div>
);
const Top = ({ title, onBack, end }) => (
  <div className="top"><Back onClick={onBack} /><h3>{title}</h3>{end || <span className="spacer" />}</div>
);

/* ---------- האפליקציה ---------- */
export default function GilosApp() {
  const [S, setS] = useState(INITIAL);
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef(null);

  const set = (patch) => setS((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const go = (screen) => set({ screen });
  const toast = (m) => {
    setToastMsg(m); setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 2000);
  };

  // מסך העיבוד: מתקדם שלב אחרי שלב ואז עובר לבחירת גרסה
  useEffect(() => {
    if (S.screen !== "process") return;
    const last = S.pstep >= STEPS.length;
    const id = setTimeout(() => setS((s) => (last ? { ...s, screen: "versions" } : { ...s, pstep: s.pstep + 1 })), last ? 500 : 650);
    return () => clearTimeout(id);
  }, [S.screen, S.pstep]);

  const name = S.user || "אורח";
  const enterGuest = () => set({ user: null, credits: GUEST_CREDITS, maxCredits: GUEST_CREDITS, screen: "home" });
  const openAuth = (authMode) => set({ authMode, screen: "auth" });

  // TODO(שלב 4): להחליף בהרשמה והתחברות אמיתיות מול Supabase
  const submitAuth = (e) => {
    e?.preventDefault();
    const reg = S.authMode === "register", nm = S.name.trim(), mail = S.mail.trim();
    if (reg && !nm) return toast("נא למלא שם");
    if (!/^\S+@\S+\.\S+$/.test(mail)) return toast("נא להזין אימייל תקין");
    if (S.pass.length < 8) return toast("הסיסמה צריכה לפחות 8 תווים");
    set({ user: nm || mail.split("@")[0], pass: "", credits: MEMBER_CREDITS, maxCredits: MEMBER_CREDITS, qi: 0, screen: reg ? "quiz" : "home" });
  };

  // TODO(שלב 6): להחליף בקריאה למנוע ה-AI האמיתי
  const startProcess = () => {
    if (S.credits < 1) return toast("נגמרו היצירות — אפשר לשדרג בהגדרות");
    const versions = makeVersions();
    set((s) => ({ credits: s.credits - 1, versions, pstep: 0, screen: "process" }));
  };

  const toPublish = (v) => set({ chosen: v, caption: CAPS[S.cap].text, screen: "publish" });
  const saveVersion = (v) => {
    if (v.saved) return;
    const sv = { ...v, saved: true };
    set((s) => ({ versions: s.versions.map((x) => (x.id === v.id ? sv : x)), saved: [sv, ...s.saved] }));
    toast("נשמר בלוח התוכן");
  };
  const deleteVersion = (v) => {
    set({ gone: v.id });
    setTimeout(() => set((s) => ({ versions: s.versions.filter((x) => x.id !== v.id), gone: null })), 280);
    toast("הגרסה נמחקה");
  };

  // TODO(שלב 5 + 7): להחליף בפרסום ותזמון אמיתיים דרך ה-API של מטא
  const publish = () => {
    const v = S.chosen, now = S.when === "now", at = S.when === "best" ? "היום 20:00" : S.slot;
    const done = {
      title: now ? "פורסם!" : "תוזמן!",
      sub: (now ? `ה${S.format} עלה ל-${S.nets.length} רשתות` : `ה${S.format} יעלה ${at}`) + (S.repeat && !now ? " · וחוזר כל שבוע" : ""),
      nets: S.nets, now,
    };
    set((s) => ({
      done,
      queue: now ? s.queue : [{ id: v.id, text: s.caption.trim() || v.name, nets: s.nets, at, g: v.g, rep: s.repeat }, ...s.queue],
      versions: s.versions.filter((x) => x.id !== v.id),
      saved: s.saved.filter((x) => x.id !== v.id),
      chosen: null, media: [], repeat: false, screen: "done",
    }));
  };

  const screens = {
    /* 1. פתיחה */
    open: () => (
      <section className="screen" style={{ alignItems: "center", paddingTop: 70 }}>
        <div className="tc">
          <Logo size={40} />
          <div className="muted" style={{ fontSize: 14.5, marginTop: 6 }}>מעלים. ה-AI עורך. אתם בוחרים ומפרסמים.</div>
        </div>
        <div className="grow center">
          <button className="ring" style={{ width: 210, height: 210 }} onClick={enterGuest} aria-label="כניסה כאורח"><Plus size={96} sw={2.4} /></button>
        </div>
        <div className="col" style={{ width: "100%", gap: 12 }}>
          <button className="btn btn-primary" onClick={() => openAuth("register")}>הרשמה</button>
          <button className="btn btn-outline" onClick={() => openAuth("login")}>התחברות למנויים</button>
          <button className="ghost" onClick={enterGuest}>ניסיון כאורח · {GUEST_CREDITS} יצירות חינם</button>
        </div>
      </section>
    ),

    /* 2. הרשמה / התחברות */
    auth: () => {
      const reg = S.authMode === "register";
      return (
        <section className="screen" style={{ gap: 20 }}>
          <div className="top"><Back onClick={() => go("open")} /><span className="muted small">🔒 חיבור מאובטח</span></div>
          <div><h2>{reg ? "יצירת חשבון" : "ברוכים השבים"}</h2><p className="sub">{reg ? "דקה אחת, ואפשר להתחיל לפרסם" : "התחברו כדי להמשיך מאיפה שעצרתם"}</p></div>
          <hr className="neonline" />
          <form className="col" style={{ gap: 14 }} onSubmit={submitAuth} noValidate>
            {reg && (<div className="field"><label htmlFor="in-name">שם מלא או שם העסק</label><input id="in-name" value={S.name} onChange={(e) => set({ name: e.target.value })} placeholder="השם שלך" autoComplete="name" /></div>)}
            <div className="field"><label htmlFor="in-mail">אימייל</label><input id="in-mail" type="email" className="ltr" style={{ textAlign: "right" }} value={S.mail} onChange={(e) => set({ mail: e.target.value })} placeholder="name@email.com" autoComplete="email" /></div>
            <div className="field"><label htmlFor="in-pass">סיסמה</label><input id="in-pass" type="password" value={S.pass} onChange={(e) => set({ pass: e.target.value })} placeholder="לפחות 8 תווים" autoComplete={reg ? "new-password" : "current-password"} /></div>
            <button type="submit" hidden />
          </form>
          <div className="grow" />
          <button className="btn btn-primary" onClick={submitAuth}>{reg ? "הרשמה והמשך לשאלון" : "התחברות"}</button>
          <p className="muted tc" style={{ margin: 0, fontSize: 13.5 }}>
            {reg ? "כבר יש לך חשבון?" : "עדיין אין חשבון?"}{" "}
            <button className="link" onClick={() => set({ authMode: reg ? "login" : "register" })}>{reg ? "התחברות" : "הרשמה"}</button>
          </p>
        </section>
      );
    },

    /* 3. שאלון היכרות */
    quiz: () => {
      const q = QUIZ[S.qi], last = S.qi === QUIZ.length - 1;
      const isOn = (o) => (q.multi ? S.quiz[q.k].includes(o) : S.quiz[q.k] === o);
      const choose = (o) => set((s) => ({ quiz: { ...s.quiz, [q.k]: q.multi ? toggle(s.quiz[q.k], o) : o } }));
      const next = () => {
        if (!last) return set({ qi: S.qi + 1 });
        toast("מעולה! התאמנו את GILOS אליך");
        go("home");
      };
      return (
        <section className="screen" style={{ gap: 18 }}>
          <div className="top">
            <Back onClick={() => (S.qi > 0 ? set({ qi: S.qi - 1 }) : go("auth"))} />
            <span className="muted" style={{ fontSize: 13 }}>{S.qi + 1} מתוך {QUIZ.length}</span>
            <button className="ghost" style={{ padding: 6 }} onClick={() => go("home")}>דילוג</button>
          </div>
          <div className="meter"><i style={{ width: ((S.qi + 1) / QUIZ.length) * 100 + "%" }} /></div>
          <div><h2 style={{ fontSize: 23 }}>{q.t}</h2><p className="sub">{q.s}</p></div>
          {q.o ? (
            <div className="grid2">{q.o.map((o) => (<button key={o} className={cx("chip tall", isOn(o) && "on")} onClick={() => choose(o)}>{o}</button>))}</div>
          ) : (
            <textarea style={{ height: 150 }} value={S.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="לדוגמה: סרטונים קצרים וצבעוניים, כיתוב גדול בעברית, מוזיקה קצבית, והלוגו שלי בפינה" />
          )}
          <div className="grow" />
          <button className="btn btn-primary" onClick={next}>{last ? "סיום והתחלה" : "המשך"}</button>
        </section>
      );
    },

    /* 4. בית */
    home: () => (
      <section className="screen tab">
        <div className="top">
          <div><span className="muted" style={{ fontSize: 13.5 }}>שלום,</span><div style={{ fontSize: 21, fontWeight: 700 }}>{name}</div></div>
          <Logo size={18} spacing={3} />
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <div className="row" style={{ fontSize: 13 }}>
            <span>נשארו <b>{S.credits}</b> מתוך {S.maxCredits} יצירות</span>
            <button className="link" style={{ fontSize: 13 }} onClick={() => (S.user ? toast("חבילות מנוי יתווספו בקרוב") : openAuth("register"))}>{S.user ? "שדרוג" : "הרשמה לקבלת עוד"}</button>
          </div>
          <div className="meter"><i style={{ width: (S.credits / S.maxCredits) * 100 + "%" }} /></div>
        </div>
        <div className="grow col center" style={{ gap: 14 }}>
          <button className="ring" style={{ width: 170, height: 170 }} onClick={() => go("upload")} aria-label="העלאת מדיה"><Plus size={80} sw={2.3} /></button>
          <div className="tc"><div style={{ fontSize: 18, fontWeight: 700 }}>העלו תמונה או סרטון</div><div className="muted" style={{ fontSize: 13.5 }}>ה-AI יחזיר 3 גרסאות ערוכות לבחירה</div></div>
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <div className="row"><h3>💡 רעיון להיום</h3><button className="link small" style={{ fontWeight: 500 }} onClick={() => set({ idea: (S.idea + 1) % IDEAS.length })}>רעיון אחר</button></div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{IDEAS[S.idea]}</div>
        </div>
        <div className="card row" style={{ fontSize: 13.5 }}><span className="muted">הפרסום הבא</span><b>{S.queue.length ? S.queue[0].at : "אין פרסום מתוזמן"}</b></div>
      </section>
    ),

    /* 5. העלאה */
    upload: () => {
      // TODO(שלב 6): להחליף בבחירת קבצים אמיתית והעלאה לאחסון
      const add = (src) => {
        if (S.media.length >= 6) return toast("עד 6 קבצים בכל יצירה");
        set((s) => ({ media: [...s.media, { id: Date.now(), g: pick(GRADS), t: src }] }));
        if (src === "קישור") toast("הקישור נוסף — ניצור ממנו סרטון קצר");
      };
      return (
        <section className="screen">
          <Top title="העלאת מדיה" onBack={() => go("home")} />
          <div className="grid4">{SOURCES.map(([s, icon]) => (<button key={s} className="src" onClick={() => add(s)}><span>{icon}</span>{s}</button>))}</div>
          <div className="tray">
            {S.media.length ? S.media.map((m) => (
              <Thumb key={m.id} g={m.g}>{m.t}<button className="x" aria-label="הסרה" onClick={() => set((s) => ({ media: s.media.filter((x) => x.id !== m.id) }))}>×</button></Thumb>
            )) : <span className="muted" style={{ fontSize: 13 }}>עוד לא נבחרה מדיה — בחרו מקור למעלה</span>}
          </div>
          <div className="scroll">
            <div className="card row"><div><h3>כתוביות אוטומטיות</h3><span className="muted small">כיתוב מונפש לפי מה שנאמר בסרטון</span></div><Switch on={S.subs} onClick={() => set({ subs: !S.subs })} label="כתוביות אוטומטיות" /></div>
            <div className="card row"><div><h3>לוגו / סימן מים</h3><span className="muted small">מתוך ערכת המותג שלך</span></div><Switch on={S.watermark} onClick={() => set({ watermark: !S.watermark })} label="לוגו או סימן מים" /></div>
            <div className="card stack">
              <div className="row"><h3>סאונד</h3><span className="muted ltr" style={{ fontSize: 11.5 }}>Soundza</span></div>
              <Seg value={S.sound} onChange={(sound) => set({ sound })} options={[["none", "ללא"], ["lib", "ספרייה"], ["text", "מטקסט"]]} />
              {S.sound === "lib" && (<div className="grid3">{TRACKS.map((t) => (<button key={t} className={cx("chip small", t === S.track && "on")} style={{ "--c": "var(--yellow)" }} onClick={() => set({ track: t })}>♪ {t}</button>))}</div>)}
              {S.sound === "text" && (<input value={S.soundText} onChange={(e) => set({ soundText: e.target.value })} placeholder="תארו סאונד: קצבי, שמח, קיצי…" />)}
            </div>
          </div>
          <button className="btn btn-primary" disabled={!S.media.length} onClick={startProcess}>{S.media.length ? `עבדו עם AI · ${S.media.length} קבצים · יצירה אחת` : "בחרו מדיה כדי להמשיך"}</button>
        </section>
      );
    },

    /* 5ב. עיבוד */
    process: () => (
      <section className="screen center" style={{ gap: 34 }}>
        <div className="ring" style={{ width: 150, height: 150 }}><span className="logo" style={{ fontSize: 22, letterSpacing: 3 }}>AI</span></div>
        <div className="tc"><h2 style={{ fontSize: 22 }}>ה-AI עורך בשבילך…</h2><p className="sub">זה לוקח כמה שניות</p></div>
        <div className="steps">{STEPS.map((s, i) => (<div key={s} className={cx("step", i < S.pstep && "ok")}><i />{s}</div>))}</div>
      </section>
    ),

    /* 6. בחירת גרסה */
    versions: () => (
      <section className="screen">
        <Top title="בחירת גרסה" onBack={() => go("upload")} end={<span className="muted small">{S.credits} יצירות נותרו</span>} />
        <p className="sub" style={{ margin: 0 }}>לכל גרסה: לפרסם, לשמור לאחר כך או למחוק.</p>
        <div className="scroll">
          {S.versions.length ? S.versions.map((v, i) => (
            <div key={v.id} className={cx("card ver", v.saved && "saved", S.gone === v.id && "gone")} style={{ animationDelay: i * 90 + "ms" }}>
              <Thumb g={v.g} style={{ height: 148 }}>
                <span className="play">▶</span><span className="dur">{v.dur}</span>
                {S.subs && <span className="subs" />}{S.watermark && <span className="wm">LOGO</span>}
              </Thumb>
              <div className="ver-body">
                <div className="row">
                  <div><div className="muted" style={{ fontSize: 11.5 }}>גרסה {i + 1}{v.saved ? " · נשמרה" : ""}</div><h3 style={{ fontSize: 15.5 }}>{v.name}</h3></div>
                  <div className="score" style={{ "--v": v.score, "--c": scoreColor(v.score) }} title="ציון פוטנציאל">{v.score}</div>
                </div>
                <div className="ver-tip">💡 {v.tip}</div>
                <div className="grow" />
                <div className="acts">
                  <button className="act pub" onClick={() => toPublish(v)}>פרסום</button>
                  <button className="act" onClick={() => saveVersion(v)}>{v.saved ? "✓ נשמר" : "שמירה"}</button>
                  <button className="act del" onClick={() => deleteVersion(v)}>מחיקה</button>
                </div>
              </div>
            </div>
          )) : <div className="empty">כל הגרסאות טופלו.<br />אפשר לייצר 3 חדשות.</div>}
        </div>
        <button className="btn btn-outline" style={{ height: 48, fontSize: 15 }} disabled={S.credits < 1} onClick={startProcess}>{S.credits > 0 ? "↻ 3 גרסאות חדשות · יצירה אחת" : "נגמרו היצירות"}</button>
      </section>
    ),

    /* 7. פרסום */
    publish: () => (
      <section className="screen" style={{ gap: 11 }}>
        <Top title="פרסום" onBack={() => go("versions")} />
        <div className="scroll" style={{ gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: 10, flex: "none" }}>
            <Thumb g={S.chosen?.g} style={{ height: 112 }} />
            <textarea style={{ height: 112, fontSize: 14 }} aria-label="כיתוב" value={S.caption} onChange={(e) => set({ caption: e.target.value })} />
          </div>
          <div className="tags">{CAPS[S.cap].tags.map((t) => (<span key={t} className="tag">{t}</span>))}</div>
          <button className="btn btn-sm btn-soft" onClick={() => set((s) => { const cap = (s.cap + 1) % CAPS.length; return { cap, caption: CAPS[cap].text }; })}>✨ כיתוב והאשטגים חדשים</button>
          <h3>לאן?</h3>
          <div className="grid4">{NETS.map((x) => (<button key={x.n} className={cx("chip small ltr", S.nets.includes(x.n) && "on")} style={{ "--c": x.c, fontSize: 11.5, padding: 2 }} onClick={() => set({ nets: toggle(S.nets, x.n) })}>{x.n}</button>))}</div>
          <Seg value={S.format} onChange={(format) => set({ format })} options={[["סטורי", "סטורי"], ["ריל", "ריל"], ["פוסט", "פוסט"]]} />
          <h3>מתי?</h3>
          <Seg value={S.when} onChange={(when) => set({ when })} options={[["now", "עכשיו"], ["best", "מומלץ · 20:00"], ["later", "תזמון"]]} />
          {S.when === "later" && (<div className="grid3">{SLOTS.map((s) => (<button key={s} className={cx("chip small", s === S.slot && "on")} onClick={() => set({ slot: s })}>{s}</button>))}</div>)}
          {S.when !== "now" && (<div className="card row"><div><h3>לחזור על זה כל שבוע</h3><span className="muted small">פרסום קבוע באותו יום ושעה</span></div><Switch on={S.repeat} onClick={() => set({ repeat: !S.repeat })} label="פרסום קבוע" /></div>)}
        </div>
        <button className="btn btn-primary" disabled={!S.nets.length || !S.chosen} onClick={publish}>
          {!S.nets.length ? "בחרו לפחות רשת אחת" : S.when === "now" ? `פרסום עכשיו ל-${S.nets.length} רשתות` : S.when === "best" ? "תזמון לזמן המומלץ · היום 20:00" : `תזמון ל${S.slot}`}
        </button>
      </section>
    ),

    /* 7ב. הצלחה */
    done: () => (
      <section className="screen tc" style={{ alignItems: "center", paddingTop: 80, gap: 20 }}>
        <div className="ring pop" style={{ width: 140, height: 140 }}>
          <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
        </div>
        <div><h2>{S.done?.title}</h2><p className="sub">{S.done?.sub}</p></div>
        <div className="col" style={{ width: "100%", gap: 8 }}>
          {S.done?.nets.map((n) => (
            <div key={n} className="card row"><span className="row"><i className="dot" style={{ "--c": color(n) }} /><span className="ltr">{n}</span></span><span style={{ color: color(n), fontSize: 13 }}>{S.done.now ? "✓ עלה" : "◷ מתוזמן"}</span></div>
          ))}
        </div>
        <div className="grow" />
        <button className="btn btn-primary" onClick={() => go("upload")}>העלאה נוספת</button>
        <button className="ghost" onClick={() => go("calendar")}>ללוח התוכן</button>
      </section>
    ),

    /* לוח תוכן */
    calendar: () => {
      const now = new Date(), today = now.getDay();
      const dateOf = (i) => { const d = new Date(now); d.setDate(now.getDate() - today + i); return d.getDate(); };
      return (
        <section className="screen tab">
          <div><h2>לוח תוכן</h2><p className="sub">השבוע שלך במבט אחד</p></div>
          <div className="grid7">
            {DAYS.map((d, i) => (<div key={d} className={cx("day", i === today && "today")}>{d}<b>{dateOf(i)}</b><span>{S.fixed.includes(i) && <i />}</span></div>))}
          </div>
          <div className="scroll">
            <h3>מתוזמנים</h3>
            {S.queue.length ? S.queue.map((p) => (
              <div key={p.id} className="card q-item">
                <Thumb g={p.g} style={{ height: 62 }} />
                <div>
                  <div className="row"><span className="small" style={{ color: "var(--blue)", fontWeight: 700 }}>{p.at}{p.rep ? " · כל שבוע" : ""}</span><button className="link small muted" style={{ fontWeight: 400 }} onClick={() => { set((s) => ({ queue: s.queue.filter((x) => x.id !== p.id) })); toast("הפרסום בוטל"); }}>ביטול</button></div>
                  <div className="ellipsis" style={{ fontSize: 13.5 }}>{p.text}</div>
                  <NetTags nets={p.nets} />
                </div>
              </div>
            )) : <div className="muted" style={{ fontSize: 13.5 }}>אין פרסומים מתוזמנים.</div>}
            <h3 style={{ marginTop: 6 }}>גרסאות שמורות</h3>
            {S.saved.length ? S.saved.map((v) => (
              <div key={v.id} className="card row">
                <span className="row"><Thumb g={v.g} style={{ width: 36, height: 46 }} /><span><h3>{v.name}</h3><span className="muted ltr" style={{ fontSize: 12 }}>{v.dur}</span></span></span>
                <button className="act pub fixed" onClick={() => toPublish(v)}>פרסום</button>
              </div>
            )) : <div className="muted" style={{ fontSize: 13.5 }}>גרסאות שתשמרו במסך הבחירה יופיעו כאן.</div>}
          </div>
        </section>
      );
    },

    /* נתונים — TODO(שלב 5): נתונים אמיתיים מה-API של מטא */
    stats: () => (
      <section className="screen tab">
        <div><h2>נתונים</h2><p className="sub">7 הימים האחרונים · נתוני דוגמה</p></div>
        <div className="grid3">
          {[["12.4K", "צפיות", "var(--blue)"], ["1,870", "לייקים", "var(--red)"], ["+312", "עוקבים", "var(--green)"]].map(([v, l, c]) => (
            <div key={l} className="card kpi" style={{ "--c": c }}><div className="logo">{v}</div><div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{l}</div></div>
          ))}
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <h3>צפיות לפי רשת</h3>
          <div className="bars">{NETS.map((x, i) => (<div key={x.n} className="bar" style={{ "--c": x.c, height: x.v + "%", animationDelay: i * 80 + "ms" }} />))}</div>
          <div className="bar-labels">{NETS.map((x) => (<span key={x.n}>{x.n}</span>))}</div>
        </div>
        <div className="card row"><div><h3>השעה הכי טובה לפרסם</h3><span className="muted small">לפי הפעילות של העוקבים שלך</span></div><span className="logo bignum" style={{ "--c": "var(--yellow)" }}>20:00</span></div>
        <div className="card row"><div><h3>רצף פרסום</h3><span className="muted small">ימים רצופים שנשארת בתודעה</span></div><span className="logo bignum" style={{ "--c": "var(--green)" }}>12</span></div>
      </section>
    ),

    /* הגדרות */
    settings: () => (
      <section className="screen tab">
        <div className="row start" style={{ gap: 12, flex: "none" }}>
          <div className="ring" style={{ width: 54, height: 54 }}><span style={{ fontSize: 20, fontWeight: 700 }}>{name[0]}</span></div>
          <div><div style={{ fontSize: 20, fontWeight: 700 }}>{name}</div><div className="muted small">{S.user ? `מנוי בסיסי · ${S.credits} יצירות נותרו` : `מצב אורח · ${S.credits} יצירות ניסיון`}</div></div>
        </div>
        <div className="scroll">
          <h3>חשבונות מחוברים</h3>
          {/* TODO(שלב 5): חיבור אמיתי דרך ההתחברות של מטא */}
          {NETS.map((x) => {
            const on = S.connected.includes(x.n);
            const flip = () => { set({ connected: toggle(S.connected, x.n) }); toast(on ? `${x.n} נותק` : `${x.n} חובר בהצלחה`); };
            return (
              <div key={x.n} className="card row">
                <span className="row"><i className="dot" style={{ "--c": x.c }} /><span className="ltr">{x.n}</span></span>
                {on ? <button className="link small" style={{ color: "var(--green)" }} onClick={flip}>✓ מחובר</button> : <button className="chip small" style={{ color: "#fff", minHeight: 32 }} onClick={flip}>חיבור בלחיצה</button>}
              </div>
            );
          })}
          <h3 style={{ marginTop: 6 }}>ערכת מותג</h3>
          <div className="card stack" style={{ gap: 12 }}>
            <div className="row"><span style={{ fontSize: 14 }}>לוגו</span><button className={cx("chip small", S.logo && "on")} style={{ minHeight: 34 }} onClick={() => set({ logo: !S.logo })}>{S.logo ? "✓ logo.png" : "＋ העלאת לוגו"}</button></div>
            <div className="row"><span style={{ fontSize: 14 }}>צבעי המותג</span><span className="row" style={{ gap: 6 }}>{["var(--blue)", "var(--red)", "var(--yellow)"].map((c) => (<i key={c} className="dot big" style={{ "--c": c }} />))}</span></div>
            <div className="row"><span style={{ fontSize: 14 }}>פתיח וסיום קבועים לסרטונים</span><Switch on={S.intro} onClick={() => set({ intro: !S.intro })} label="פתיח וסיום" /></div>
          </div>
          <h3 style={{ marginTop: 6 }}>הפרומפט האישי שלי</h3>
          <textarea style={{ height: 84, fontSize: 14 }} value={S.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder="תארו את הסגנון שאתם רוצים שה-AI ייצר" />
          <h3 style={{ marginTop: 6 }}>ימי פרסום קבועים</h3>
          <div className="grid7">{DAYS.map((d, i) => (<button key={d} className={cx("chip small", S.fixed.includes(i) && "on")} style={{ "--c": "var(--green)", minHeight: 38, padding: 0 }} onClick={() => set({ fixed: toggle(S.fixed, i) })}>{d}</button>))}</div>
          <h3 style={{ marginTop: 6 }}>שפה</h3>
          <Seg value={S.lang} onChange={(lang) => { set({ lang }); if (lang === "en") toast("הגרסה באנגלית תתווסף בשלב הבא"); }} options={[["he", "עברית"], ["en", "English"]]} />
          <div className="card stack" style={{ gap: 12, marginTop: 6 }}>
            <button className="setrow" onClick={() => go("about")}><span>אודות ותמיכה</span><span className="muted">‹</span></button>
            {S.user && <button className="setrow" onClick={() => toast("מחיקת חשבון תופעל עם חיבור מסד הנתונים")}><span>מחיקת החשבון</span><span className="muted">‹</span></button>}
            <button className="setrow danger" onClick={() => set({ ...INITIAL })}>{S.user ? "התנתקות" : "יציאה ממצב אורח"}</button>
          </div>
        </div>
      </section>
    ),

    /* אודות */
    about: () => (
      <section className="screen" style={{ gap: 16 }}>
        <Top title="אודות" onBack={() => go("settings")} />
        <div className="col center" style={{ gap: 10, padding: "10px 0" }}>
          <div className="ring" style={{ width: 96, height: 96 }}><Plus size={44} sw={2.6} /></div>
          <Logo size={26} />
          <div className="muted" style={{ fontSize: 13 }}>גרסה 1.1</div>
        </div>
        <hr className="neonline" />
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: "#D6D6E0" }}>GILOS עוזרת לבעלי עסקים ולאנשים פרטיים להישאר בתודעה של הקהל שלהם: מעלים תמונות וסרטונים, ה-AI מחזיר 3 גרסאות ערוכות, ואתם בוחרים מה לפרסם ומתי.</p>
        <div className="card stack">
          <h3>יצירת קשר ותמיכה</h3>
          <a className="mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <span className="muted small">אנחנו עונים בדרך כלל תוך יום עסקים אחד.</span>
          <a className="btn btn-primary btn-sm" href={`mailto:${SUPPORT_EMAIL}`}>✉️ כתבו לנו</a>
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <button className="setrow" onClick={() => toast("המסמך יתווסף לפני ההשקה")}><span>תנאי שימוש</span><span className="muted">‹</span></button>
          <button className="setrow" onClick={() => toast("המסמך יתווסף לפני ההשקה")}><span>מדיניות פרטיות</span><span className="muted">‹</span></button>
        </div>
        <div className="grow" />
        <div className="logo ltr tc" style={{ fontSize: 10.5, letterSpacing: 4, color: "#7d7d8d" }}>BY GILOS · 2026</div>
      </section>
    ),
  };

  const isTab = TABS.some(([k]) => k === S.screen);
  return (
    <main className="app">
      <div key={S.screen} style={{ display: "contents" }}>{screens[S.screen]()}</div>
      {isTab && (
        <nav>
          {TABS.map(([k, label, icon]) => (
            <button key={k} className={cx(S.screen === k && "on")} onClick={() => go(k)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
              {label}
            </button>
          ))}
        </nav>
      )}
      <div className={cx("toast", toastOn && "show")} role="status">{toastMsg}</div>
    </main>
  );
}
