"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/* ---------- נתונים קבועים ---------- */
const SUPPORT_EMAIL = "postenter@gmail.com";
const GUEST_CREDITS = 3;
const MEMBER_CREDITS = 20;
const LANG_KEY = "gilos-lang";
const MAX_MEDIA = 6;

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
const CAPS = {
  he: [
    { text: "חדש אצלנו! ✨ בואו לראות מה הכנו לכם השבוע.", tags: ["#חדש", "#עסקקטן", "#מאחוריהקלעים"] },
    { text: "רגע קטן מהיום שלנו 💙 מה דעתכם?", tags: ["#יוםיום", "#קהילה", "#שיתוף"] },
    { text: "סוף השבוע מתחיל כאן 🔥 מחכים לכם!", tags: ["#סופש", "#מבצע", "#בואו"] },
  ],
  en: [
    { text: "New this week! ✨ Come see what we've been working on.", tags: ["#new", "#smallbusiness", "#behindthescenes"] },
    { text: "A little moment from our day 💙 What do you think?", tags: ["#daily", "#community", "#share"] },
    { text: "The weekend starts here 🔥 See you soon!", tags: ["#weekend", "#sale", "#joinus"] },
  ],
};
const IDEAS = [
  "צלמו 10 שניות של מאחורי הקלעים בעסק — לקוחות אוהבים לראות את האנשים.",
  "שתפו טיפ אחד קצר מהתחום שלכם, עם כיתוב גדול.",
  "לפני / אחרי: שתי תמונות של עבודה שסיימתם השבוע.",
  "ענו בסרטון על שאלה שלקוחות שואלים הכי הרבה.",
];
const SOURCES = [
  ["גלריה", "var(--blue)", <g key="i"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5-8 8" /></g>],
  ["מצלמה", "var(--red)", <g key="i"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.4" /></g>],
  ["קישור", "var(--green)", <g key="i"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></g>],
];
const TRACKS = ["קצבי", "רגוע", "קיצי"];
const SLOTS = ["היום 20:00", "מחר 09:00", "מחר 18:00"];
const BEST_SLOT = "היום 20:00";
const DAYS = { he: ["א", "ב", "ג", "ד", "ה", "ו", "ש"], en: ["S", "M", "T", "W", "T", "F", "S"] };
const STEPS = ["מנתח את המדיה", "בוחר את הרגעים הכי חזקים", "מוסיף כתוביות, לוגו וסאונד", "מרכיב 3 גרסאות"];
const FORMATS = ["סטורי", "ריל", "פוסט"];
const OTHER = "אחר";

// האשטגים מוצעים לפי תחום התוכן שנבחר בשאלון. המפתחות בעברית משמשים כמזהים פנימיים.
const HASHTAGS = {
  "עסק / מוצרים": { he: ["#עסקקטן", "#קנייהמקומית", "#מוצרחדש", "#מבצע", "#עסקיםקטנים", "#כחוללבן"], en: ["#smallbusiness", "#shoplocal", "#newproduct", "#sale", "#supportsmall", "#handpicked"] },
  "אוכל ומסעדות": { he: ["#אוכל", "#מסעדה", "#פודי", "#טעים", "#שף", "#אוכלישראלי"], en: ["#food", "#restaurant", "#foodie", "#delicious", "#chef", "#instafood"] },
  "יופי וטיפוח": { he: ["#יופי", "#טיפוח", "#איפור", "#שיער", "#לפניואחרי", "#קוסמטיקה"], en: ["#beauty", "#skincare", "#makeup", "#hair", "#beforeandafter", "#cosmetics"] },
  "כושר ובריאות": { he: ["#כושר", "#אימון", "#בריאות", "#מוטיבציה", "#תזונה", "#אורחחייםבריא"], en: ["#fitness", "#workout", "#health", "#motivation", "#nutrition", "#healthylifestyle"] },
  "נדל״ן": { he: ["#נדלן", "#דירהלמכירה", "#השקעות", "#בית", "#נכסים", "#תיווך"], en: ["#realestate", "#forsale", "#investment", "#home", "#property", "#realtor"] },
  "אישי / לייף־סטייל": { he: ["#לייףסטייל", "#יוםיום", "#השראה", "#רגעים", "#אהבה", "#חיים"], en: ["#lifestyle", "#daily", "#inspiration", "#moments", "#love", "#life"] },
  "דיג׳יי ומוזיקה": { he: ["#דיגיי", "#DJ", "#מסיבה", "#מוזיקה", "#סט", "#רחבה"], en: ["#DJ", "#djlife", "#party", "#music", "#djset", "#dancefloor"] },
  "אירועים והפקות": { he: ["#אירועים", "#חתונה", "#הפקה", "#ברמצווה", "#מסיבה", "#אירועחברה"], en: ["#events", "#wedding", "#production", "#celebration", "#party", "#corporateevent"] },
  "צילום ווידאו": { he: ["#צילום", "#צלם", "#וידאו", "#מאחוריהקלעים", "#פורטרט", "#צילוםאירועים"], en: ["#photography", "#photographer", "#video", "#behindthescenes", "#portrait", "#eventphotography"] },
  "אופנה": { he: ["#אופנה", "#סטייל", "#לוק", "#קולקציהחדשה", "#אאוטפיט", "#בגדים"], en: ["#fashion", "#style", "#look", "#newcollection", "#outfit", "#ootd"] },
  "חינוך והדרכה": { he: ["#למידה", "#טיפים", "#הדרכה", "#קורס", "#ידע", "#סדנה"], en: ["#learning", "#tips", "#howto", "#course", "#knowledge", "#workshop"] },
  "אמנות ויצירה": { he: ["#אמנות", "#יצירה", "#עבודתיד", "#ציור", "#עיצוב", "#אמןישראלי"], en: ["#art", "#creative", "#handmade", "#painting", "#design", "#artist"] },
};
const GENERAL_TAGS = { he: ["#ישראל", "#חדש", "#מומלץ", "#שתפו"], en: ["#new", "#recommended", "#share", "#followus"] };
const typeTags = (type, lang) => HASHTAGS[type]?.[lang] || [];
const tagsFor = (type, lang) => [...typeTags(type, lang), ...GENERAL_TAGS[lang]];

const TEMPLATES = [
  ["קצבי וצבעוני", "סרטונים קצרים וקצביים, צבעים חזקים, כיתוב גדול ומודגש ומוזיקה אנרגטית."],
  ["נקי ויוקרתי", "עיצוב נקי ומינימלי עם הרבה אוויר, גופן דק, צבעים שקטים ומוזיקה רגועה."],
  ["ניאון ולילה", "אווירת מועדון: רקע כהה, אורות ניאון, חיתוכים מהירים לפי הביט ולוגו זוהר בפינה."],
  ["אישי וחם", "תחושה אישית ואותנטית, צבעים חמים, כתוביות פשוטות ודגש על אנשים ופנים."],
  ["מקצועי ועסקי", "מראה מקצועי ואמין, צבעי המותג, כותרת ברורה וקריאה לפעולה בסוף."],
  ["מצחיק וטרנדי", "הומור קליל, אפקטים וסאונדים טרנדיים, כיתוב שנון וקצב מהיר."],
];
const QUIZ = [
  { k: "type", t: "איזה תוכן אתם מעלים?", s: "נתאים את העריכה וההאשטגים לתחום שלכם", o: Object.keys(HASHTAGS) },
  { k: "nets", t: "באילו רשתות אתם פעילים?", s: "אפשר לבחור כמה", multi: true, o: [...NETS.map((x) => x.n), "LinkedIn", "X", "Threads", "Pinterest", "Snapchat", "Telegram"] },
  { k: "style", t: "איזה סגנון מתאים לכם?", s: "אפשר לשנות בכל רגע בהגדרות", o: ["דינמי וקצבי", "נקי ומינימלי", "חם ואישי", "יוקרתי", "הומוריסטי", "טרנדי", "ניאון ומועדונים", "רטרו / וינטג׳", "קולנועי", "צבעוני ושמח", "מקצועי ורשמי", "טבעי ואותנטי"] },
  { k: "aud", t: "מי קהל היעד?", s: "כדי לבחור טון ושעות פרסום", o: ["גילאי 18–24", "גילאי 25–40", "גילאי 40+", "עסקים", "כולם"] },
  { k: "tags", t: "האשטגים שמתאימים לכם", s: "בחרנו אוטומטית לפי התחום — אפשר לשנות", tags: true },
  { k: "prompt", t: "תארו את העיצוב שאתם רוצים", s: "בחרו תבנית מוכנה או כתבו בעצמכם", prompt: true },
];
const TABS = [
  ["home", "בית", <path key="p" d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />],
  ["calendar", "לוח", <g key="p"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></g>],
  ["stats", "נתונים", <path key="p" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />],
  ["settings", "הגדרות", <g key="p"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></g>],
];

// תרגום לאנגלית של הנתונים הקבועים. טקסטים של המסכים עצמם מתורגמים במקום, עם t(עברית, אנגלית).
const EN = {
  "אחר": "Other",
  // תחומים
  "עסק / מוצרים": "Business / products", "אוכל ומסעדות": "Food & restaurants", "יופי וטיפוח": "Beauty & care",
  "כושר ובריאות": "Fitness & health", "נדל״ן": "Real estate", "אישי / לייף־סטייל": "Personal / lifestyle",
  "דיג׳יי ומוזיקה": "DJ & music", "אירועים והפקות": "Events & production", "צילום ווידאו": "Photo & video",
  "אופנה": "Fashion", "חינוך והדרכה": "Education & training", "אמנות ויצירה": "Art & craft",
  // סגנונות
  "דינמי וקצבי": "Dynamic & upbeat", "נקי ומינימלי": "Clean & minimal", "חם ואישי": "Warm & personal",
  "יוקרתי": "Luxury", "הומוריסטי": "Humorous", "טרנדי": "Trendy", "ניאון ומועדונים": "Neon & clubs",
  "רטרו / וינטג׳": "Retro / vintage", "קולנועי": "Cinematic", "צבעוני ושמח": "Colorful & happy",
  "מקצועי ורשמי": "Professional & formal", "טבעי ואותנטי": "Natural & authentic", "סיפורי ורגשי": "Story-driven & emotional",
  // קהל יעד
  "גילאי 18–24": "Ages 18–24", "גילאי 25–40": "Ages 25–40", "גילאי 40+": "Ages 40+", "עסקים": "Businesses", "כולם": "Everyone",
  // שאלון
  "איזה תוכן אתם מעלים?": "What kind of content do you post?", "נתאים את העריכה וההאשטגים לתחום שלכם": "We'll match the editing and hashtags to your field",
  "באילו רשתות אתם פעילים?": "Which networks are you active on?", "אפשר לבחור כמה": "You can pick several",
  "איזה סגנון מתאים לכם?": "Which style suits you?", "אפשר לשנות בכל רגע בהגדרות": "You can change this any time in Settings",
  "מי קהל היעד?": "Who is your audience?", "כדי לבחור טון ושעות פרסום": "So we can pick the tone and posting times",
  "האשטגים שמתאימים לכם": "Hashtags that fit you", "בחרנו אוטומטית לפי התחום — אפשר לשנות": "Picked automatically for your field — feel free to change",
  "תארו את העיצוב שאתם רוצים": "Describe the look you want", "בחרו תבנית מוכנה או כתבו בעצמכם": "Pick a ready-made template or write your own",
  // תבניות פרומפט
  "קצבי וצבעוני": "Upbeat & colorful", "נקי ויוקרתי": "Clean & luxurious", "ניאון ולילה": "Neon & night",
  "אישי וחם": "Personal & warm", "מקצועי ועסקי": "Professional & business", "מצחיק וטרנדי": "Funny & trendy",
  "סרטונים קצרים וקצביים, צבעים חזקים, כיתוב גדול ומודגש ומוזיקה אנרגטית.": "Short, fast-paced videos with bold colors, large bold captions and energetic music.",
  "עיצוב נקי ומינימלי עם הרבה אוויר, גופן דק, צבעים שקטים ומוזיקה רגועה.": "Clean, minimal design with lots of white space, a thin font, quiet colors and calm music.",
  "אווירת מועדון: רקע כהה, אורות ניאון, חיתוכים מהירים לפי הביט ולוגו זוהר בפינה.": "Club vibe: dark background, neon lights, fast cuts on the beat and a glowing logo in the corner.",
  "תחושה אישית ואותנטית, צבעים חמים, כתוביות פשוטות ודגש על אנשים ופנים.": "A personal, authentic feel with warm colors, simple captions and a focus on people and faces.",
  "מראה מקצועי ואמין, צבעי המותג, כותרת ברורה וקריאה לפעולה בסוף.": "A professional, trustworthy look with brand colors, a clear headline and a call to action at the end.",
  "הומור קליל, אפקטים וסאונדים טרנדיים, כיתוב שנון וקצב מהיר.": "Light humor, trending effects and sounds, witty captions and a fast pace.",
  // טיפים, רעיונות, שלבי עיבוד
  "פתיחה חזקה ב-2 השניות הראשונות": "Strong hook in the first 2 seconds", "הכתוביות מגדילות צפייה בלי קול": "Captions boost views with sound off",
  "כדאי לקצר את הסיום ב-3 שניות": "Try trimming 3 seconds off the ending", "המוזיקה מתאימה לטרנד הנוכחי": "The music matches a current trend",
  "קריאה לפעולה ברורה בסוף": "Clear call to action at the end",
  "צלמו 10 שניות של מאחורי הקלעים בעסק — לקוחות אוהבים לראות את האנשים.": "Film 10 seconds behind the scenes — customers love seeing the people.",
  "שתפו טיפ אחד קצר מהתחום שלכם, עם כיתוב גדול.": "Share one short tip from your field, with a big caption.",
  "לפני / אחרי: שתי תמונות של עבודה שסיימתם השבוע.": "Before / after: two photos of a job you finished this week.",
  "ענו בסרטון על שאלה שלקוחות שואלים הכי הרבה.": "Answer your most-asked customer question in a short video.",
  "מנתח את המדיה": "Analyzing your media", "בוחר את הרגעים הכי חזקים": "Picking the strongest moments",
  "מוסיף כתוביות, לוגו וסאונד": "Adding captions, logo and sound", "מרכיב 3 גרסאות": "Building 3 versions",
  // מקורות, סאונד, פורמטים, זמנים
  "גלריה": "Gallery", "מצלמה": "Camera", "מחשב": "Computer", "קישור": "Link",
  "קצבי": "Upbeat", "רגוע": "Calm", "קיצי": "Summery",
  "סטורי": "Story", "ריל": "Reel", "פוסט": "Post",
  "היום 20:00": "Today 20:00", "מחר 09:00": "Tomorrow 09:00", "מחר 18:00": "Tomorrow 18:00", "יום ה׳ 18:30": "Thu 18:30",
  // ניווט ונתוני דוגמה
  "בית": "Home", "לוח": "Calendar", "נתונים": "Stats", "הגדרות": "Settings",
  "מבצע סוף שבוע — 20% על הכול 🔥": "Weekend sale — 20% off everything 🔥", "מאחורי הקלעים של הצילומים": "Behind the scenes of the shoot",
};

const INITIAL = {
  screen: "open",
  user: null,
  authMode: "register",
  name: "", mail: "", pass: "",
  credits: GUEST_CREDITS, maxCredits: GUEST_CREDITS,
  qi: 0,
  quiz: { type: "", nets: ["Instagram", "Facebook"], style: "", aud: "" },
  other: { type: "", nets: "", style: "", aud: "" },
  tags: [], myTag: "", offTags: [],
  prompt: "", tpl: null,
  media: [], linkOpen: false, linkUrl: "",
  subs: true, watermark: true, sound: "lib", track: "קצבי", soundText: "",
  versions: [], gone: null, chosen: null, pstep: 0,
  cap: 0, caption: "",
  nets: ["Instagram", "Facebook"], format: "סטורי", when: "best", slot: SLOTS[1], repeat: false,
  done: null,
  queue: [
    { id: 1, text: "מבצע סוף שבוע — 20% על הכול 🔥", nets: ["Instagram", "Facebook"], at: "מחר 09:00", g: GRADS[1] },
    { id: 2, text: "מאחורי הקלעים של הצילומים", nets: ["TikTok"], at: "יום ה׳ 18:30", g: GRADS[3] },
  ],
  saved: [],
  connected: ["Instagram", "Facebook"],
  intro: true, logo: false, fixed: [0, 2, 4], idea: 0,
  // פרופילים: כמה עסקים תחת אותו משתמש. הנתונים של הפרופיל הפעיל יושבים ישירות ב-state,
  // ושל האחרים נשמרים ב-profiles[].data עד שעוברים אליהם.
  profiles: [], pid: null, newProf: "", prev: "home", quizFrom: "auth",
};
// השדות ששייכים לפרופיל (ולא לחשבון): הגדרות, שאלון, האשטגים, חשבונות מחוברים ולוח תוכן
const PROFILE_KEYS = ["quiz", "other", "tags", "offTags", "prompt", "tpl", "subs", "watermark", "sound", "track", "soundText", "nets", "format", "queue", "saved", "connected", "intro", "logo", "fixed"];
const snapshot = (s) => Object.fromEntries(PROFILE_KEYS.map((k) => [k, s[k]]));
const NEW_PROFILE = { ...snapshot(INITIAL), queue: [], connected: [] };
const WORK_RESET = { versions: [], chosen: null, media: [], done: null, qi: 0 };

/* ---------- עזרים ---------- */
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const toggle = (arr, x) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
const scoreColor = (v) => (v >= 85 ? "var(--green)" : v >= 72 ? "var(--yellow)" : "var(--red)");
const cx = (...a) => a.filter(Boolean).join(" ");

function makeVersions() {
  const st = shuffle(STYLES), g = shuffle(GRADS), tips = shuffle(TIPS), base = Date.now();
  return [0, 1, 2].map((i) => ({
    id: base + i, name: st[i], g: g[i],
    dur: "0:" + (12 + Math.floor(Math.random() * 18)),
    score: 62 + Math.floor(Math.random() * 35),
    tip: tips[i], saved: false,
  }));
}

/* ---------- רכיבים קטנים ---------- */
const Back = ({ onClick, label }) => (
  <button className="back" onClick={onClick} aria-label={label}>
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
// תצוגה מקדימה של קובץ שנבחר מהמכשיר (כתובת מקומית בדפדפן), או של קישור
const MediaView = ({ m }) => {
  if (m.kind === "link") return <span className="linkthumb"><span>🔗</span><span className="ellipsis ltr">{m.name}</span></span>;
  if (m.kind === "video") return <><video className="fill" src={m.url} muted playsInline preload="metadata" /><span className="vbadge">▶</span></>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="fill" src={m.url} alt={m.name} />;
};
// תמונת הרקע של גרסה: התמונה שהועלתה, עם גוון הסגנון מעליה
const Cover = ({ img, g }) => (img ? (
  <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="fill" src={img} alt="" />
    <span className="tint" style={{ background: g }} />
  </>
) : null);
const NetTags = ({ nets }) => (
  <div className="tags">
    {nets.map((n) => (<span key={n} className="tag net"><i className="dot" style={{ "--c": color(n) }} /><span className="ltr">{n}</span></span>))}
  </div>
);

// השפה נשמרת בדפדפן, כדי שתישאר גם אחרי רענון. אם האחסון חסום, היא נשמרת בזיכרון בלבד.
let memLang = null;
const langStore = {
  subscribe(cb) {
    window.addEventListener("gilos-lang", cb);
    return () => window.removeEventListener("gilos-lang", cb);
  },
  get() {
    if (memLang) return memLang;
    try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "he"; } catch { return "he"; }
  },
  set(l) {
    memLang = l;
    try { localStorage.setItem(LANG_KEY, l); } catch {}
    window.dispatchEvent(new Event("gilos-lang"));
  },
};

/* ---------- האפליקציה ---------- */
export default function GilosApp() {
  const [S, setS] = useState(INITIAL);
  const lang = useSyncExternalStore(langStore.subscribe, langStore.get, () => "he");
  const changeLang = langStore.set;
  const [toastMsg, setToastMsg] = useState("");
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef(null);

  const en = lang === "en";
  const t = (he, english) => (en ? english : he); // טקסט של מסך
  const tr = (s) => (en ? EN[s] ?? s : s); // נתון קבוע שנשמר בעברית
  const chev = t("‹", "›");

  const set = (patch) => setS((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  const go = (screen) => set({ screen });
  const toast = (m) => {
    setToastMsg(m); setToastOn(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOn(false), 2000);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
  }, [lang]);

  // מסך העיבוד: מתקדם שלב אחרי שלב ואז עובר לבחירת גרסה
  useEffect(() => {
    if (S.screen !== "process") return;
    const last = S.pstep >= STEPS.length;
    const id = setTimeout(() => setS((s) => (last ? { ...s, screen: "versions" } : { ...s, pstep: s.pstep + 1 })), last ? 500 : 650);
    return () => clearTimeout(id);
  }, [S.screen, S.pstep]);

  const name = S.user || t("אורח", "Guest");
  const caps = CAPS[lang];
  const enterGuest = () => set({ user: null, credits: GUEST_CREDITS, maxCredits: GUEST_CREDITS, profiles: [{ id: 1, name: null }], pid: 1, screen: "home" });

  // פרופילים
  const activeProfile = S.profiles.find((p) => p.id === S.pid);
  const profileName = activeProfile ? activeProfile.name || t("אורח", "Guest") : "";
  const openProfiles = () => set((s) => ({ prev: s.screen === "profiles" ? s.prev : s.screen, screen: "profiles" }));
  const stash = (s) => s.profiles.map((p) => (p.id === s.pid ? { ...p, data: snapshot(s) } : p));
  const switchProfile = (id) => {
    set((s) => {
      const profiles = stash(s), target = profiles.find((p) => p.id === id);
      return { profiles, pid: id, ...(target.data || NEW_PROFILE), ...WORK_RESET, screen: "home" };
    });
    toast(t("עברת פרופיל", "Profile switched"));
  };
  const addProfile = (e) => {
    e?.preventDefault();
    const nm = S.newProf.trim();
    if (!S.user) return toast(t("פרופילים נוספים זמינים אחרי הרשמה", "Extra profiles are available after sign-up"));
    if (!nm) return toast(t("נא לתת שם לפרופיל", "Please name the profile"));
    if (S.profiles.some((p) => p.name === nm)) return toast(t("כבר יש פרופיל בשם הזה", "A profile with this name already exists"));
    const id = Math.max(...S.profiles.map((p) => p.id)) + 1;
    set((s) => ({ profiles: [...stash(s), { id, name: nm, data: null }], pid: id, ...NEW_PROFILE, ...WORK_RESET, newProf: "", quizFrom: "profiles", screen: "quiz" }));
  };
  const deleteProfile = (id) => {
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }));
    toast(t("הפרופיל נמחק", "Profile deleted"));
  };
  const openAuth = (authMode) => set({ authMode, screen: "auth" });
  const back = (to) => <Back onClick={typeof to === "function" ? to : () => go(to)} label={t("חזרה", "Back")} />;
  const top = (title, to, end) => (<div className="top">{back(to)}<h3>{title}</h3>{end || <span className="spacer" />}</div>);

  // TODO(שלב 4): להחליף בהרשמה והתחברות אמיתיות מול Supabase
  const submitAuth = (e) => {
    e?.preventDefault();
    const reg = S.authMode === "register", nm = S.name.trim(), mail = S.mail.trim();
    if (reg && !nm) return toast(t("נא למלא שם", "Please enter a name"));
    if (!/^\S+@\S+\.\S+$/.test(mail)) return toast(t("נא להזין אימייל תקין", "Please enter a valid email"));
    if (S.pass.length < 8) return toast(t("הסיסמה צריכה לפחות 8 תווים", "Password needs at least 8 characters"));
    const user = nm || mail.split("@")[0];
    set({ user, pass: "", credits: MEMBER_CREDITS, maxCredits: MEMBER_CREDITS, qi: 0, profiles: [{ id: 1, name: user }], pid: 1, quizFrom: "auth", screen: reg ? "quiz" : "home" });
  };

  // TODO(שלב 6): להחליף בקריאה למנוע ה-AI האמיתי
  const startProcess = () => {
    if (S.credits < 1) return toast(t("נגמרו היצירות — אפשר לשדרג בהגדרות", "You're out of creations — upgrade in Settings"));
    const img = S.media.find((m) => m.kind === "image")?.url;
    const versions = makeVersions().map((v) => ({ ...v, img }));
    set((s) => ({ credits: s.credits - 1, versions, pstep: 0, linkOpen: false, screen: "process" }));
  };

  const toPublish = (v) => set({ chosen: v, caption: caps[S.cap].text, screen: "publish" });
  const saveVersion = (v) => {
    if (v.saved) return;
    const sv = { ...v, saved: true };
    set((s) => ({ versions: s.versions.map((x) => (x.id === v.id ? sv : x)), saved: [sv, ...s.saved] }));
    toast(t("נשמר בלוח התוכן", "Saved to your calendar"));
  };
  const deleteVersion = (v) => {
    set({ gone: v.id });
    setTimeout(() => set((s) => ({ versions: s.versions.filter((x) => x.id !== v.id), gone: null })), 280);
    toast(t("הגרסה נמחקה", "Version deleted"));
  };

  // TODO(שלב 5 + 7): להחליף בפרסום ותזמון אמיתיים דרך ה-API של מטא
  const publish = () => {
    const v = S.chosen, now = S.when === "now", at = S.when === "best" ? BEST_SLOT : S.slot;
    set((s) => ({
      done: { now, at, format: s.format, nets: s.nets, rep: s.repeat && !now },
      queue: now ? s.queue : [{ id: v.id, text: s.caption.trim() || v.name, nets: s.nets, at, g: v.g, rep: s.repeat }, ...s.queue],
      versions: s.versions.filter((x) => x.id !== v.id),
      saved: s.saved.filter((x) => x.id !== v.id),
      chosen: null, media: [], repeat: false, screen: "done",
    }));
  };

  const screens = {
    /* 1. פתיחה */
    open: () => (
      <section className="screen" style={{ alignItems: "center", paddingTop: 84 }}>
        <div className="tc">
          <Logo size={40} />
          <div className="muted" style={{ fontSize: 14.5, marginTop: 6 }}>{t("מעלים. ה-AI עורך. אתם בוחרים ומפרסמים.", "Upload. AI edits. You pick and publish.")}</div>
        </div>
        <div className="grow center">
          <button className="ring" style={{ width: 210, height: 210 }} onClick={enterGuest} aria-label={t("כניסה כאורח", "Enter as guest")}><Plus size={96} sw={2.4} /></button>
        </div>
        <div className="col" style={{ width: "100%", gap: 12 }}>
          <button className="btn btn-primary" onClick={() => openAuth("register")}>{t("הרשמה", "Sign up")}</button>
          <button className="btn btn-outline" onClick={() => openAuth("login")}>{t("התחברות למנויים", "Log in for subscribers")}</button>
          <button className="ghost" onClick={enterGuest}>{t(`ניסיון כאורח · ${GUEST_CREDITS} יצירות חינם`, `Try as guest · ${GUEST_CREDITS} free creations`)}</button>
        </div>
      </section>
    ),

    /* 2. הרשמה / התחברות */
    auth: () => {
      const reg = S.authMode === "register";
      return (
        <section className="screen" style={{ gap: 20 }}>
          <div className="top">{back("open")}<span className="muted small">🔒 {t("חיבור מאובטח", "Secure connection")}</span></div>
          <div>
            <h2>{reg ? t("יצירת חשבון", "Create account") : t("ברוכים השבים", "Welcome back")}</h2>
            <p className="sub">{reg ? t("דקה אחת, ואפשר להתחיל לפרסם", "One minute and you're ready to publish") : t("התחברו כדי להמשיך מאיפה שעצרתם", "Log in to pick up where you left off")}</p>
          </div>
          <hr className="neonline" />
          <form className="col" style={{ gap: 14 }} onSubmit={submitAuth} noValidate>
            {reg && (<div className="field"><label htmlFor="in-name">{t("שם מלא או שם העסק", "Full name or business name")}</label><input id="in-name" value={S.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("השם שלך", "Your name")} autoComplete="name" /></div>)}
            <div className="field"><label htmlFor="in-mail">{t("אימייל", "Email")}</label><input id="in-mail" type="email" className="ltr" style={{ textAlign: t("right", "left") }} value={S.mail} onChange={(e) => set({ mail: e.target.value })} placeholder="name@email.com" autoComplete="email" /></div>
            <div className="field"><label htmlFor="in-pass">{t("סיסמה", "Password")}</label><input id="in-pass" type="password" value={S.pass} onChange={(e) => set({ pass: e.target.value })} placeholder={t("לפחות 8 תווים", "At least 8 characters")} autoComplete={reg ? "new-password" : "current-password"} /></div>
            <button type="submit" hidden />
          </form>
          <div className="grow" />
          <button className="btn btn-primary" onClick={submitAuth}>{reg ? t("הרשמה והמשך לשאלון", "Sign up and continue") : t("התחברות", "Log in")}</button>
          <p className="muted tc" style={{ margin: 0, fontSize: 13.5 }}>
            {reg ? t("כבר יש לך חשבון?", "Already have an account?") : t("עדיין אין חשבון?", "No account yet?")}{" "}
            <button className="link" onClick={() => set({ authMode: reg ? "login" : "register" })}>{reg ? t("התחברות", "Log in") : t("הרשמה", "Sign up")}</button>
          </p>
        </section>
      );
    },

    /* 3. שאלון היכרות */
    quiz: () => {
      const q = QUIZ[S.qi], last = S.qi === QUIZ.length - 1;
      const isOn = (o) => (q.multi ? S.quiz[q.k].includes(o) : S.quiz[q.k] === o);
      // בחירת תחום ממלאת אוטומטית את ההאשטגים המתאימים לו
      const choose = (o) => set((s) => ({
        quiz: { ...s.quiz, [q.k]: q.multi ? toggle(s.quiz[q.k], o) : o },
        ...(q.k === "type" ? { tags: tagsFor(o, lang).slice(0, 4) } : {}),
      }));
      const tagPool = [...new Set([...tagsFor(S.quiz.type, lang), ...S.tags])];
      const addTag = (e) => {
        e?.preventDefault();
        const tag = S.myTag.trim().replace(/^#*/, "#").replace(/\s+/g, "");
        if (tag.length < 2) return;
        set((s) => ({ tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag], myTag: "" }));
      };
      const next = () => {
        if (!last) return set({ qi: S.qi + 1 });
        toast(t("מעולה! התאמנו את GILOS אליך", "Great! GILOS is now tuned to you"));
        go("home");
      };
      return (
        <section className="screen" style={{ gap: 18 }}>
          <div className="top">
            {back(() => (S.qi > 0 ? set({ qi: S.qi - 1 }) : go(S.quizFrom)))}
            <span className="muted" style={{ fontSize: 13 }}>{t(`${S.qi + 1} מתוך ${QUIZ.length}`, `${S.qi + 1} of ${QUIZ.length}`)}</span>
            <button className="ghost" style={{ padding: 6 }} onClick={() => go("home")}>{t("דילוג", "Skip")}</button>
          </div>
          <div className="meter"><i style={{ width: ((S.qi + 1) / QUIZ.length) * 100 + "%" }} /></div>
          <div><h2 style={{ fontSize: 23 }}>{tr(q.t)}</h2><p className="sub">{tr(q.s)}</p></div>
          <div className="scroll">
            {q.o && (
              <>
                <div className="grid2">
                  {[...q.o, OTHER].map((o) => (<button key={o} className={cx("chip tall", isOn(o) && "on")} onClick={() => choose(o)}>{tr(o)}</button>))}
                </div>
                {isOn(OTHER) && (
                  <input autoFocus aria-label={t("פירוט אחר", "Other details")} value={S.other[q.k]} onChange={(e) => set((s) => ({ other: { ...s.other, [q.k]: e.target.value } }))} placeholder={t("כתבו כאן במילים שלכם", "Write it in your own words")} />
                )}
              </>
            )}
            {q.tags && (
              <>
                <div className="tags">
                  {tagPool.map((tag) => (<button key={tag} dir="auto" className={cx("chip small", S.tags.includes(tag) && "on")} style={{ "--c": "var(--green)" }} onClick={() => set({ tags: toggle(S.tags, tag) })}>{tag}</button>))}
                </div>
                <form className="row" onSubmit={addTag}>
                  <input aria-label={t("האשטג משלכם", "Your own hashtag")} value={S.myTag} onChange={(e) => set({ myTag: e.target.value })} placeholder={t("האשטג משלכם", "Your own hashtag")} style={{ flex: 1 }} />
                  <button type="submit" className="chip" style={{ color: "#fff", minHeight: 48, flex: "none" }}>{t("הוספה", "Add")}</button>
                </form>
                <span className="muted small">{t(`נבחרו ${S.tags.length} האשטגים. הם יצורפו אוטומטית לכל פרסום.`, `${S.tags.length} hashtags selected. They'll be added to every post automatically.`)}</span>
              </>
            )}
            {q.prompt && (
              <>
                <div className="grid2">
                  {TEMPLATES.map(([tplName, text], i) => (<button key={tplName} className={cx("chip tall", S.tpl === i && "on")} onClick={() => set({ tpl: i, prompt: tr(text) })}>{tr(tplName)}</button>))}
                </div>
                <button className={cx("chip", S.tpl === "own" && "on")} style={{ "--c": "var(--yellow)", flex: "none" }} onClick={() => set({ tpl: "own", prompt: "" })}>✏️ {t("לכתוב לבד", "Write my own")}</button>
                <textarea style={{ height: 120 }} aria-label={t("תיאור העיצוב", "Design description")} value={S.prompt} onChange={(e) => set({ prompt: e.target.value, tpl: S.tpl ?? "own" })} placeholder={t("לדוגמה: סרטונים קצרים וצבעוניים, כיתוב גדול בעברית, מוזיקה קצבית, והלוגו שלי בפינה", "For example: short colorful videos, large captions, upbeat music, and my logo in the corner")} />
              </>
            )}
          </div>
          <button className="btn btn-primary" onClick={next}>{last ? t("סיום והתחלה", "Finish and start") : t("המשך", "Continue")}</button>
        </section>
      );
    },

    /* 4. בית */
    home: () => (
      <section className="screen tab">
        <div className="top">
          <div><span className="muted" style={{ fontSize: 13.5 }}>{t("שלום,", "Hello,")}</span><div style={{ fontSize: 21, fontWeight: 700 }}>{name}</div></div>
          <Logo size={18} spacing={3} />
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <div className="row" style={{ fontSize: 13 }}>
            <span>{t("נשארו", "")} <b>{S.credits}</b> {t(`מתוך ${S.maxCredits} יצירות`, `of ${S.maxCredits} creations left`)}</span>
            <button className="link" style={{ fontSize: 13 }} onClick={() => (S.user ? toast(t("חבילות מנוי יתווספו בקרוב", "Subscription plans are coming soon")) : openAuth("register"))}>{S.user ? t("שדרוג", "Upgrade") : t("הרשמה לקבלת עוד", "Sign up for more")}</button>
          </div>
          <div className="meter"><i style={{ width: (S.credits / S.maxCredits) * 100 + "%" }} /></div>
        </div>
        <div className="grow col center" style={{ gap: 14 }}>
          <button className="ring" style={{ width: 170, height: 170 }} onClick={() => go("upload")} aria-label={t("העלאת מדיה", "Upload media")}><Plus size={80} sw={2.3} /></button>
          <div className="tc">
            <div style={{ fontSize: 18, fontWeight: 700 }}>{t("העלו תמונה או סרטון", "Upload a photo or video")}</div>
            <div className="muted" style={{ fontSize: 13.5 }}>{t("ה-AI יחזיר 3 גרסאות ערוכות לבחירה", "AI will return 3 edited versions to choose from")}</div>
          </div>
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <div className="row"><h3>💡 {t("רעיון להיום", "Idea for today")}</h3><button className="link small" style={{ fontWeight: 500 }} onClick={() => set({ idea: (S.idea + 1) % IDEAS.length })}>{t("רעיון אחר", "Another idea")}</button></div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{tr(IDEAS[S.idea])}</div>
        </div>
        <div className="card row" style={{ fontSize: 13.5 }}><span className="muted">{t("הפרסום הבא", "Next post")}</span><b>{S.queue.length ? tr(S.queue[0].at) : t("אין פרסום מתוזמן", "Nothing scheduled")}</b></div>
      </section>
    ),

    /* 5. העלאה */
    upload: () => {
      // הקבצים נבחרים מהמכשיר ומוצגים מקומית בלבד.
      // TODO(שלב 6): להעלות אותם לאחסון ולשלוח למנוע ה-AI
      const room = MAX_MEDIA - S.media.length;
      const tooMany = () => toast(t(`עד ${MAX_MEDIA} קבצים בכל יצירה`, `Up to ${MAX_MEDIA} files per creation`));
      const addFiles = (e) => {
        const picked = [...e.target.files];
        e.target.value = "";
        const files = picked.filter((f) => /^(image|video)\//.test(f.type));
        if (picked.length && !files.length) return toast(t("אפשר להעלות רק תמונות וסרטונים", "Only photos and videos can be uploaded"));
        if (files.length > room) tooMany();
        const items = files.slice(0, Math.max(room, 0)).map((f, i) => ({
          id: `${f.name}-${f.size}-${f.lastModified}-${S.media.length + i}`,
          kind: f.type.startsWith("video") ? "video" : "image",
          url: URL.createObjectURL(f), name: f.name,
        }));
        if (items.length) set((s) => ({ media: [...s.media, ...items] }));
      };
      const addLink = (e) => {
        e?.preventDefault();
        const url = S.linkUrl.trim();
        if (!/^https?:\/\/\S+\.\S+/.test(url)) return toast(t("נא להדביק קישור מלא שמתחיל ב-https://", "Please paste a full link starting with https://"));
        if (room < 1) return tooMany();
        if (S.media.some((m) => m.id === url)) return toast(t("הקישור כבר נוסף", "This link was already added"));
        set((s) => ({ media: [...s.media, { id: url, kind: "link", name: url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] }], linkUrl: "", linkOpen: false }));
        toast(t("הקישור נוסף — ניצור ממנו סרטון קצר", "Link added — we'll turn it into a short video"));
      };
      return (
        <section className="screen">
          {top(t("העלאת מדיה", "Upload media"), "home")}
          <div className="grid3">
            {SOURCES.map(([s, c, icon]) => {
              const inner = (
                <>
                  <i><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg></i>
                  {tr(s)}
                </>
              );
              // קישור פותח שדה להדבקה; שאר המקורות פותחים את בורר הקבצים של המכשיר
              if (s === "קישור") return <button key={s} className={cx("src", S.linkOpen && "on")} style={{ "--c": c }} onClick={() => set({ linkOpen: !S.linkOpen })}>{inner}</button>;
              return (
                <label key={s} className="src" style={{ "--c": c }}>
                  <input type="file" accept="image/*,video/*" multiple={s === "גלריה"} capture={s === "מצלמה" ? "environment" : undefined} onChange={addFiles} aria-label={tr(s)} />
                  {inner}
                </label>
              );
            })}
          </div>
          {S.linkOpen && (
            <form className="row" onSubmit={addLink} noValidate style={{ flex: "none" }}>
              <input autoFocus type="url" className="ltr" aria-label={t("קישור לסרטון או לכתבה", "Link to a video or article")} value={S.linkUrl} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="https://youtube.com/…" style={{ flex: 1 }} />
              <button type="submit" className="chip" style={{ color: "#fff", minHeight: 48, flex: "none" }}>{t("הוספה", "Add")}</button>
            </form>
          )}
          <div className="tray">
            {S.media.length ? S.media.map((m) => (
              <Thumb key={m.id} g={GRADS[0]}>
                <MediaView m={m} />
                <button className="x" aria-label={t(`הסרת ${m.name}`, `Remove ${m.name}`)} onClick={() => set((s) => ({ media: s.media.filter((x) => x.id !== m.id) }))}>×</button>
              </Thumb>
            )) : <span className="muted" style={{ fontSize: 13 }}>{t("עוד לא נבחרה מדיה — בחרו מקור למעלה", "No media yet — pick a source above")}</span>}
          </div>
          <div className="scroll">
            <div className="card row"><div><h3>{t("כתוביות אוטומטיות", "Auto captions")}</h3><span className="muted small">{t("כיתוב מונפש לפי מה שנאמר בסרטון", "Animated captions from what's said in the video")}</span></div><Switch on={S.subs} onClick={() => set({ subs: !S.subs })} label={t("כתוביות אוטומטיות", "Auto captions")} /></div>
            <div className="card row"><div><h3>{t("לוגו / סימן מים", "Logo / watermark")}</h3><span className="muted small">{t("מתוך ערכת המותג שלך", "From your brand kit")}</span></div><Switch on={S.watermark} onClick={() => set({ watermark: !S.watermark })} label={t("לוגו או סימן מים", "Logo or watermark")} /></div>
            <div className="card stack">
              <div className="row"><h3>{t("סאונד", "Sound")}</h3><span className="muted ltr" style={{ fontSize: 11.5 }}>Soundza</span></div>
              <Seg value={S.sound} onChange={(sound) => set({ sound })} options={[["none", t("ללא", "None")], ["lib", t("ספרייה", "Library")], ["text", t("מטקסט", "From text")]]} />
              {S.sound === "lib" && (<div className="grid3">{TRACKS.map((tk) => (<button key={tk} dir="auto" className={cx("chip small", tk === S.track && "on")} style={{ "--c": "var(--yellow)" }} onClick={() => set({ track: tk })}>♪ {tr(tk)}</button>))}</div>)}
              {S.sound === "text" && (<input value={S.soundText} onChange={(e) => set({ soundText: e.target.value })} placeholder={t("תארו סאונד: קצבי, שמח, קיצי…", "Describe a sound: upbeat, happy, summery…")} />)}
            </div>
          </div>
          <button className="btn btn-primary" disabled={!S.media.length} onClick={startProcess}>
            {S.media.length ? t(`עבדו עם AI · ${S.media.length} קבצים · יצירה אחת`, `Process with AI · ${S.media.length} files · 1 creation`) : t("בחרו מדיה כדי להמשיך", "Pick media to continue")}
          </button>
        </section>
      );
    },

    /* 5ב. עיבוד */
    process: () => (
      <section className="screen center" style={{ gap: 34 }}>
        <div className="ring" style={{ width: 150, height: 150 }}><span className="logo" style={{ fontSize: 22, letterSpacing: 3 }}>AI</span></div>
        <div className="tc"><h2 style={{ fontSize: 22 }}>{t("ה-AI עורך בשבילך…", "AI is editing for you…")}</h2><p className="sub">{t("זה לוקח כמה שניות", "This takes a few seconds")}</p></div>
        <div className="steps">{STEPS.map((s, i) => (<div key={s} className={cx("step", i < S.pstep && "ok")}><i />{tr(s)}</div>))}</div>
      </section>
    ),

    /* 6. בחירת גרסה */
    versions: () => (
      <section className="screen">
        {top(t("בחירת גרסה", "Pick a version"), "upload", <span className="muted small">{t(`${S.credits} יצירות נותרו`, `${S.credits} creations left`)}</span>)}
        <p className="sub" style={{ margin: 0 }}>{t("לכל גרסה: לפרסם, לשמור לאחר כך או למחוק.", "For each version: publish, save for later, or delete.")}</p>
        <div className="scroll">
          {S.versions.length ? S.versions.map((v, i) => (
            <div key={v.id} className={cx("card ver", v.saved && "saved", S.gone === v.id && "gone")} style={{ animationDelay: i * 90 + "ms" }}>
              <Thumb g={v.g} style={{ height: 148 }}>
                <Cover img={v.img} g={v.g} />
                <span className="play">▶</span><span className="dur">{v.dur}</span>
                {S.subs && <span className="subs" />}{S.watermark && <span className="wm">LOGO</span>}
              </Thumb>
              <div className="ver-body">
                <div className="row">
                  <div><div className="muted" style={{ fontSize: 11.5 }}>{t(`גרסה ${i + 1}`, `Version ${i + 1}`)}{v.saved ? t(" · נשמרה", " · saved") : ""}</div><h3 style={{ fontSize: 15.5 }}>{tr(v.name)}</h3></div>
                  <button className="scorebox" aria-label={t(`ציון פוטנציאל ${v.score} מתוך 99. הסבר`, `Potential score ${v.score} out of 99. Explain`)} onClick={() => toast(t("ציון פוטנציאל, 0 עד 99: הערכה של כמה הסרטון צפוי להצליח ברשתות", "Potential score, 0 to 99: an estimate of how well this video should perform"))}>
                    <span className="score" style={{ "--v": v.score, "--c": scoreColor(v.score) }}>{v.score}</span>
                    <small>{t("ציון", "Score")}</small>
                  </button>
                </div>
                <div className="ver-tip">💡 {tr(v.tip)}</div>
                <div className="grow" />
                <div className="acts">
                  <button className="act pub" onClick={() => toPublish(v)}>{t("פרסום", "Publish")}</button>
                  <button className="act" onClick={() => saveVersion(v)}>{v.saved ? t("✓ נשמר", "✓ Saved") : t("שמירה", "Save")}</button>
                  <button className="act del" onClick={() => deleteVersion(v)}>{t("מחיקה", "Delete")}</button>
                </div>
              </div>
            </div>
          )) : <div className="empty">{t("כל הגרסאות טופלו.", "All versions are handled.")}<br />{t("אפשר לייצר 3 חדשות.", "You can generate 3 new ones.")}</div>}
        </div>
        <button className="btn btn-outline" style={{ height: 48, fontSize: 15 }} disabled={S.credits < 1} onClick={startProcess}>{S.credits > 0 ? t("↻ 3 גרסאות חדשות · יצירה אחת", "↻ 3 new versions · 1 creation") : t("נגמרו היצירות", "No creations left")}</button>
      </section>
    ),

    /* 7. פרסום */
    publish: () => (
      <section className="screen" style={{ gap: 11 }}>
        {top(t("פרסום", "Publish"), "versions")}
        <div className="scroll" style={{ gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: 10, flex: "none" }}>
            <Thumb g={S.chosen?.g} style={{ height: 112 }}><Cover img={S.chosen?.img} g={S.chosen?.g} /></Thumb>
            <textarea dir="auto" style={{ height: 112, fontSize: 14 }} aria-label={t("כיתוב", "Caption")} value={S.caption} onChange={(e) => set({ caption: e.target.value })} />
          </div>
          <div className="tags">
            {(S.tags.length ? S.tags : caps[S.cap].tags).map((tag) => (
              <button key={tag} dir="auto" className={cx("chip small", !S.offTags.includes(tag) && "on")} style={{ "--c": "var(--green)", minHeight: 30 }} aria-pressed={!S.offTags.includes(tag)} onClick={() => set({ offTags: toggle(S.offTags, tag) })}>{tag}</button>
            ))}
          </div>
          <button className="btn btn-sm btn-soft" onClick={() => set((s) => { const cap = (s.cap + 1) % caps.length; return { cap, caption: caps[cap].text }; })}>✨ {t("כיתוב והאשטגים חדשים", "New caption and hashtags")}</button>
          <h3>{t("לאן?", "Where?")}</h3>
          <div className="grid4">{NETS.map((x) => (<button key={x.n} className={cx("chip small ltr", S.nets.includes(x.n) && "on")} style={{ "--c": x.c, fontSize: 11.5, padding: 2 }} onClick={() => set({ nets: toggle(S.nets, x.n) })}>{x.n}</button>))}</div>
          <Seg value={S.format} onChange={(format) => set({ format })} options={FORMATS.map((f) => [f, tr(f)])} />
          <h3>{t("מתי?", "When?")}</h3>
          <Seg value={S.when} onChange={(when) => set({ when })} options={[["now", t("עכשיו", "Now")], ["best", t("מומלץ · 20:00", "Best · 20:00")], ["later", t("תזמון", "Schedule")]]} />
          {S.when === "later" && (<div className="grid3">{SLOTS.map((s) => (<button key={s} className={cx("chip small", s === S.slot && "on")} onClick={() => set({ slot: s })}>{tr(s)}</button>))}</div>)}
          {S.when !== "now" && (<div className="card row"><div><h3>{t("לחזור על זה כל שבוע", "Repeat every week")}</h3><span className="muted small">{t("פרסום קבוע באותו יום ושעה", "A fixed post on the same day and time")}</span></div><Switch on={S.repeat} onClick={() => set({ repeat: !S.repeat })} label={t("פרסום קבוע", "Recurring post")} /></div>)}
        </div>
        <button className="btn btn-primary" disabled={!S.nets.length || !S.chosen} onClick={publish}>
          {!S.nets.length ? t("בחרו לפחות רשת אחת", "Pick at least one network")
            : S.when === "now" ? t(`פרסום עכשיו ל-${S.nets.length} רשתות`, `Publish now to ${S.nets.length} networks`)
            : S.when === "best" ? t("תזמון לזמן המומלץ · היום 20:00", "Schedule for the best time · Today 20:00")
            : t(`תזמון ל${S.slot}`, `Schedule for ${tr(S.slot)}`)}
        </button>
      </section>
    ),

    /* 7ב. הצלחה */
    done: () => {
      const d = S.done;
      if (!d) return <section className="screen" />;
      const sub = d.now
        ? t(`ה${d.format} עלה ל-${d.nets.length} רשתות`, `${tr(d.format)} published to ${d.nets.length} networks`)
        : t(`ה${d.format} יעלה ${d.at}`, `${tr(d.format)} scheduled for ${tr(d.at)}`);
      return (
        <section className="screen tc" style={{ alignItems: "center", paddingTop: 90, gap: 20 }}>
          <div className="ring pop" style={{ width: 140, height: 140 }}>
            <svg width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="#39FF14" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
          </div>
          <div><h2>{d.now ? t("פורסם!", "Published!") : t("תוזמן!", "Scheduled!")}</h2><p className="sub">{sub}{d.rep ? t(" · וחוזר כל שבוע", " · repeats weekly") : ""}</p></div>
          <div className="col" style={{ width: "100%", gap: 8 }}>
            {d.nets.map((n) => (
              <div key={n} className="card row"><span className="row"><i className="dot" style={{ "--c": color(n) }} /><span className="ltr">{n}</span></span><span style={{ color: color(n), fontSize: 13 }}>{d.now ? t("✓ עלה", "✓ Live") : t("◷ מתוזמן", "◷ Scheduled")}</span></div>
            ))}
          </div>
          <div className="grow" />
          <button className="btn btn-primary" onClick={() => go("upload")}>{t("העלאה נוספת", "Upload another")}</button>
          <button className="ghost" onClick={() => go("calendar")}>{t("ללוח התוכן", "Go to calendar")}</button>
        </section>
      );
    },

    /* לוח תוכן */
    calendar: () => {
      const now = new Date(), today = now.getDay();
      const dateOf = (i) => { const d = new Date(now); d.setDate(now.getDate() - today + i); return d.getDate(); };
      return (
        <section className="screen tab">
          <div><h2>{t("לוח תוכן", "Content calendar")}</h2><p className="sub">{t("השבוע שלך במבט אחד", "Your week at a glance")}</p></div>
          <div className="grid7">
            {DAYS[lang].map((d, i) => (<div key={i} className={cx("day", i === today && "today")}>{d}<b>{dateOf(i)}</b><span>{S.fixed.includes(i) && <i />}</span></div>))}
          </div>
          <div className="scroll">
            <h3>{t("מתוזמנים", "Scheduled")}</h3>
            {S.queue.length ? S.queue.map((p) => (
              <div key={p.id} className="card q-item">
                <Thumb g={p.g} style={{ height: 62 }} />
                <div>
                  <div className="row"><span className="small" style={{ color: "var(--blue)", fontWeight: 700 }}>{tr(p.at)}{p.rep ? t(" · כל שבוע", " · weekly") : ""}</span><button className="link small muted" style={{ fontWeight: 400 }} onClick={() => { set((s) => ({ queue: s.queue.filter((x) => x.id !== p.id) })); toast(t("הפרסום בוטל", "Post cancelled")); }}>{t("ביטול", "Cancel")}</button></div>
                  <div className="ellipsis" dir="auto" style={{ fontSize: 13.5 }}>{tr(p.text)}</div>
                  <NetTags nets={p.nets} />
                </div>
              </div>
            )) : <div className="muted" style={{ fontSize: 13.5 }}>{t("אין פרסומים מתוזמנים.", "Nothing scheduled.")}</div>}
            <h3 style={{ marginTop: 6 }}>{t("גרסאות שמורות", "Saved versions")}</h3>
            {S.saved.length ? S.saved.map((v) => (
              <div key={v.id} className="card row">
                <span className="row"><Thumb g={v.g} style={{ width: 36, height: 46 }} /><span><h3>{tr(v.name)}</h3><span className="muted ltr" style={{ fontSize: 12 }}>{v.dur}</span></span></span>
                <button className="act pub fixed" onClick={() => toPublish(v)}>{t("פרסום", "Publish")}</button>
              </div>
            )) : <div className="muted" style={{ fontSize: 13.5 }}>{t("גרסאות שתשמרו במסך הבחירה יופיעו כאן.", "Versions you save on the picker screen will appear here.")}</div>}
          </div>
        </section>
      );
    },

    /* נתונים — TODO(שלב 5): נתונים אמיתיים מה-API של מטא */
    stats: () => (
      <section className="screen tab">
        <div><h2>{t("נתונים", "Stats")}</h2><p className="sub">{t("7 הימים האחרונים · נתוני דוגמה", "Last 7 days · sample data")}</p></div>
        <div className="grid3">
          {[["12.4K", t("צפיות", "Views"), "var(--blue)"], ["1,870", t("לייקים", "Likes"), "var(--red)"], ["+312", t("עוקבים", "Followers"), "var(--green)"]].map(([v, l, c]) => (
            <div key={l} className="card kpi" style={{ "--c": c }}><div className="logo">{v}</div><div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{l}</div></div>
          ))}
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <h3>{t("צפיות לפי רשת", "Views by network")}</h3>
          <div className="bars">{NETS.map((x, i) => (<div key={x.n} className="bar" style={{ "--c": x.c, height: x.v + "%", animationDelay: i * 80 + "ms" }} />))}</div>
          <div className="bar-labels">{NETS.map((x) => (<span key={x.n}>{x.n}</span>))}</div>
        </div>
        <div className="card row"><div><h3>{t("השעה הכי טובה לפרסם", "Best time to post")}</h3><span className="muted small">{t("לפי הפעילות של העוקבים שלך", "Based on your followers' activity")}</span></div><span className="logo bignum" style={{ "--c": "var(--yellow)" }}>20:00</span></div>
        <div className="card row"><div><h3>{t("רצף פרסום", "Posting streak")}</h3><span className="muted small">{t("ימים רצופים שנשארת בתודעה", "Days in a row you stayed top of mind")}</span></div><span className="logo bignum" style={{ "--c": "var(--green)" }}>12</span></div>
      </section>
    ),

    /* הגדרות */
    settings: () => (
      <section className="screen tab">
        <div className="row start" style={{ gap: 12, flex: "none" }}>
          <div className="ring" style={{ width: 54, height: 54 }}><span style={{ fontSize: 20, fontWeight: 700 }}>{name[0]}</span></div>
          <div><div style={{ fontSize: 20, fontWeight: 700 }}>{name}</div><div className="muted small">{S.user ? t(`מנוי בסיסי · ${S.credits} יצירות נותרו`, `Basic plan · ${S.credits} creations left`) : t(`מצב אורח · ${S.credits} יצירות ניסיון`, `Guest mode · ${S.credits} trial creations`)}</div></div>
        </div>
        <div className="scroll">
          <h3>{t("חשבונות מחוברים", "Connected accounts")}</h3>
          {/* TODO(שלב 5): חיבור אמיתי דרך ההתחברות של מטא */}
          {NETS.map((x) => {
            const on = S.connected.includes(x.n);
            const flip = () => { set({ connected: toggle(S.connected, x.n) }); toast(on ? t(`${x.n} נותק`, `${x.n} disconnected`) : t(`${x.n} חובר בהצלחה`, `${x.n} connected`)); };
            return (
              <div key={x.n} className="card row">
                <span className="row"><i className="dot" style={{ "--c": x.c }} /><span className="ltr">{x.n}</span></span>
                {on ? <button className="link small" style={{ color: "var(--green)" }} onClick={flip}>{t("✓ מחובר", "✓ Connected")}</button> : <button className="chip small" style={{ color: "#fff", minHeight: 32 }} onClick={flip}>{t("חיבור בלחיצה", "Connect")}</button>}
              </div>
            );
          })}
          <h3 style={{ marginTop: 6 }}>{t("ערכת מותג", "Brand kit")}</h3>
          <div className="card stack" style={{ gap: 12 }}>
            <div className="row"><span style={{ fontSize: 14 }}>{t("לוגו", "Logo")}</span><button className={cx("chip small", S.logo && "on")} style={{ minHeight: 34 }} onClick={() => set({ logo: !S.logo })}>{S.logo ? "✓ logo.png" : t("＋ העלאת לוגו", "＋ Upload logo")}</button></div>
            <div className="row"><span style={{ fontSize: 14 }}>{t("צבעי המותג", "Brand colors")}</span><span className="row" style={{ gap: 6 }}>{["var(--blue)", "var(--red)", "var(--yellow)"].map((c) => (<i key={c} className="dot big" style={{ "--c": c }} />))}</span></div>
            <div className="row"><span style={{ fontSize: 14 }}>{t("פתיח וסיום קבועים לסרטונים", "Fixed intro and outro for videos")}</span><Switch on={S.intro} onClick={() => set({ intro: !S.intro })} label={t("פתיח וסיום", "Intro and outro")} /></div>
          </div>
          <h3 style={{ marginTop: 6 }}>{t("הפרומפט האישי שלי", "My personal prompt")}</h3>
          <textarea dir="auto" style={{ height: 84, fontSize: 14 }} value={S.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder={t("תארו את הסגנון שאתם רוצים שה-AI ייצר", "Describe the style you want the AI to create")} />
          <h3 style={{ marginTop: 6 }}>{t("ימי פרסום קבועים", "Fixed posting days")}</h3>
          <div className="grid7">{DAYS[lang].map((d, i) => (<button key={i} className={cx("chip small", S.fixed.includes(i) && "on")} style={{ "--c": "var(--green)", minHeight: 38, padding: 0 }} onClick={() => set({ fixed: toggle(S.fixed, i) })}>{d}</button>))}</div>
          <div className="card stack" style={{ gap: 12, marginTop: 6 }}>
            <button className="setrow" onClick={openProfiles}><span>{t("הפרופילים שלי", "My profiles")} · {S.profiles.length}</span><span className="muted">{chev}</span></button>
            <button className="setrow" onClick={() => go("about")}><span>{t("אודות ותמיכה", "About and support")}</span><span className="muted">{chev}</span></button>
            {S.user && <button className="setrow" onClick={() => toast(t("מחיקת חשבון תופעל עם חיבור מסד הנתונים", "Account deletion will work once the database is connected"))}><span>{t("מחיקת החשבון", "Delete account")}</span><span className="muted">{chev}</span></button>}
            <button className="setrow danger" onClick={() => set({ ...INITIAL })}>{S.user ? t("התנתקות", "Log out") : t("יציאה ממצב אורח", "Exit guest mode")}</button>
          </div>
        </div>
      </section>
    ),

    /* פרופילים — כמה עסקים תחת אותו משתמש */
    profiles: () => (
      <section className="screen" style={{ gap: 14 }}>
        {top(t("הפרופילים שלי", "My profiles"), S.prev)}
        <p className="sub" style={{ margin: 0 }}>{t("לכל פרופיל הגדרות, האשטגים, חשבונות מחוברים ולוח תוכן משלו. היצירות משותפות לכל החשבון.", "Each profile has its own settings, hashtags, connected accounts and calendar. Creations are shared across the account.")}</p>
        <div className="scroll">
          {S.profiles.map((p) => {
            const active = p.id === S.pid, nm = p.name || t("אורח", "Guest");
            return (
              <div key={p.id} className={cx("card row prof", active && "active")}>
                <span className="row" style={{ minWidth: 0 }}>
                  <span className="ring" style={{ width: 42, height: 42 }}><span style={{ fontWeight: 700 }}>{nm[0]}</span></span>
                  <span style={{ minWidth: 0 }}><h3 className="ellipsis" dir="auto" style={{ fontSize: 16 }}>{nm}</h3><span className="muted small">{active ? t("הפרופיל הפעיל", "Active profile") : t("לחצו כדי לעבור", "Tap to switch")}</span></span>
                </span>
                {active ? <span className="small" style={{ color: "var(--green)" }}>✓ {t("פעיל", "Active")}</span> : (
                  <span className="row" style={{ gap: 6, flex: "none" }}>
                    <button className="act pub fixed" onClick={() => switchProfile(p.id)}>{t("מעבר", "Switch")}</button>
                    <button className="act del fixed" aria-label={t(`מחיקת ${nm}`, `Delete ${nm}`)} onClick={() => deleteProfile(p.id)}>×</button>
                  </span>
                )}
              </div>
            );
          })}
          <h3 style={{ marginTop: 6 }}>{t("פרופיל חדש", "New profile")}</h3>
          <form className="col" style={{ gap: 10 }} onSubmit={addProfile}>
            <input dir="auto" aria-label={t("שם הפרופיל החדש", "New profile name")} value={S.newProf} onChange={(e) => set({ newProf: e.target.value })} placeholder={t("שם העסק או הפרופיל", "Business or profile name")} />
            <button type="submit" className="btn btn-outline" style={{ height: 48, fontSize: 15 }}>＋ {t("יצירת פרופיל והגדרה", "Create and set up profile")}</button>
          </form>
          {!S.user && <span className="muted small">{t("במצב אורח יש פרופיל אחד. ", "Guest mode has one profile. ")}<button className="link" onClick={() => openAuth("register")}>{t("להרשמה", "Sign up")}</button></span>}
        </div>
      </section>
    ),

    /* אודות */
    about: () => (
      <section className="screen" style={{ gap: 16 }}>
        {top(t("אודות", "About"), "settings")}
        <div className="col center" style={{ gap: 10, padding: "10px 0" }}>
          <div className="ring" style={{ width: 96, height: 96 }}><Plus size={44} sw={2.6} /></div>
          <Logo size={26} />
          <div className="muted" style={{ fontSize: 13 }}>{t("גרסה 1.1", "Version 1.1")}</div>
        </div>
        <hr className="neonline" />
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: "#D6D6E0" }}>
          {t("GILOS עוזרת לבעלי עסקים ולאנשים פרטיים להישאר בתודעה של הקהל שלהם: מעלים תמונות וסרטונים, ה-AI מחזיר 3 גרסאות ערוכות, ואתם בוחרים מה לפרסם ומתי.",
            "GILOS helps business owners and individuals stay top of mind with their audience: upload photos and videos, the AI returns 3 edited versions, and you choose what to publish and when.")}
        </p>
        <div className="card stack">
          <h3>{t("יצירת קשר ותמיכה", "Contact and support")}</h3>
          <a className="mail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <span className="muted small">{t("אנחנו עונים בדרך כלל תוך יום עסקים אחד.", "We usually reply within one business day.")}</span>
          <a className="btn btn-primary btn-sm" href={`mailto:${SUPPORT_EMAIL}`}>✉️ {t("כתבו לנו", "Email us")}</a>
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <button className="setrow" onClick={() => toast(t("המסמך יתווסף לפני ההשקה", "This document will be added before launch"))}><span>{t("תנאי שימוש", "Terms of use")}</span><span className="muted">{chev}</span></button>
          <button className="setrow" onClick={() => toast(t("המסמך יתווסף לפני ההשקה", "This document will be added before launch"))}><span>{t("מדיניות פרטיות", "Privacy policy")}</span><span className="muted">{chev}</span></button>
        </div>
        <div className="grow" />
        <div className="logo ltr tc" style={{ fontSize: 10.5, letterSpacing: 4, color: "#7d7d8d" }}>BY GILOS · 2026</div>
      </section>
    ),
  };

  const isTab = TABS.some(([k]) => k === S.screen);
  return (
    <main className="app" dir={en ? "ltr" : "rtl"} lang={lang}>
      <div className={cx("stars", S.screen === "open" && "strong")} aria-hidden="true"><span className="haze" /><span className="dust" /><i /></div>
      <div className="topbar">
        {activeProfile && S.screen !== "open" && S.screen !== "auth" ? (
          <button className="profname" onClick={openProfiles} aria-label={t(`פרופיל: ${profileName}. החלפת פרופיל`, `Profile: ${profileName}. Switch profile`)}>
            <i className="dot" style={{ "--c": "var(--green)" }} /><span className="ellipsis" dir="auto">{profileName}</span><small>▾</small>
          </button>
        ) : <span />}
        <div className="langpill" role="group" aria-label="Language / שפה">
          <button className={cx(!en && "on")} aria-pressed={!en} onClick={() => changeLang("he")}>עברית</button>
          <button className={cx(en && "on")} aria-pressed={en} onClick={() => changeLang("en")}>English</button>
        </div>
      </div>
      <div key={S.screen} style={{ display: "contents" }}>{screens[S.screen]()}</div>
      {isTab && (
        <nav>
          {TABS.map(([k, label, icon]) => (
            <button key={k} className={cx(S.screen === k && "on")} onClick={() => go(k)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
              {tr(label)}
            </button>
          ))}
        </nav>
      )}
      <div className={cx("toast", toastOn && "show")} role="status">{toastMsg}</div>
    </main>
  );
}
