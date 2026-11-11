"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

/* ---------- נתונים קבועים ---------- */
const SUPPORT_EMAIL = "postenter@gmail.com";
const GUEST_CREDITS = 3;
const MEMBER_CREDITS = 20;
const LANG_KEY = "gilos-lang";
const MAX_MEDIA = 6;
// הלוגו על הגרסה: x,y הם מיקום הפינה העליונה-שמאלית כחלק מהרוחב/הגובה; size הוא הרוחב כחלק מרוחב הגרסה
const LOGO_DEFAULT = { x: 0.04, y: 0.04, size: 0.2, opacity: 1, color: "orig" };
const LOGO_COLORS = [["orig", "מקורי", "Original", null], ["white", "לבן", "White", "#ffffff"], ["black", "שחור", "Black", "#000000"], ["blue", "כחול", "Blue", "#1E9BFF"], ["red", "אדום", "Red", "#FF3355"], ["yellow", "צהוב", "Yellow", "#FFE600"], ["green", "ירוק", "Green", "#39FF14"]];
let logoDrag = null; // מצב גרירת הלוגו (רק בזמן גרירה)
// יחסי תמונה במצלמה: מלא (כל מה שהמצלמה רואה), סטורי/ריל, פוסט, ריבוע
const RATIOS = [["full", null], ["9:16", 9 / 16], ["4:5", 4 / 5], ["1:1", 1]];
let mediaSeq = 0; // מזהה רץ לקבצים שנבחרו (רק לזיהוי בתוך הדפדפן)

const NETS = [
  { n: "Instagram", c: "#FF3355", v: 100 },
  { n: "Facebook", c: "#1E9BFF", v: 58 },
  { n: "TikTok", c: "#39FF14", v: 82 },
  { n: "YouTube", c: "#FFE600", v: 40 },
];
const color = (n) => NETS.find((x) => x.n === n)?.c || "#8E97A8";
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
  { k: "connect", t: "חיבור החשבונות", s: "חיבור חד־פעמי — ומעכשיו הפרסום יוצא אוטומטית", connect: true },
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
  "מי קהל היעד?": "Who is your audience?", "חיבור החשבונות": "Connect your accounts", "חיבור חד־פעמי — ומעכשיו הפרסום יוצא אוטומטית": "Connect once — from then on, posting is automatic", "כדי לבחור טון ושעות פרסום": "So we can pick the tone and posting times",
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
  intro: true, logo: false, logoAR: 1, logoCfg: LOGO_DEFAULT, fixed: [0, 2, 4], idea: 0,
  // פרופילים: כמה עסקים תחת אותו משתמש. הנתונים של הפרופיל הפעיל יושבים ישירות ב-state,
  // ושל האחרים נשמרים ב-profiles[].data עד שעוברים אליהם.
  profiles: [], pid: null, newProf: "", prev: "home", quizFrom: "auth",
  uid: null, busy: false, authNote: "", confirmDelete: false,
  connecting: null,
  mediaSel: null, camTry: 0, pv: null, note: "", picks: [], aiN: 0, applying: false,
  camFacing: "environment", camMode: "photo", camZoom: 1, camHW: null, camTorchOK: false, camTorch: false, camRatio: "full", camGrid: false, camTimer: 0, countdown: 0, camDims: null, camError: "", camReady: false, recording: false, recSec: 0,
};
// השדות ששייכים לפרופיל (ולא לחשבון): הגדרות, שאלון, האשטגים, חשבונות מחוברים ולוח תוכן
const PROFILE_KEYS = ["logoAR", "logoCfg", "quiz", "other", "tags", "offTags", "prompt", "tpl", "subs", "watermark", "sound", "track", "soundText", "nets", "format", "queue", "saved", "connected", "intro", "logo", "fixed"];
const snapshot = (s) => Object.fromEntries(PROFILE_KEYS.map((k) => [k, s[k]]));
const NEW_PROFILE = { ...snapshot(INITIAL), queue: [], connected: [] };
const WORK_RESET = { versions: [], chosen: null, media: [], done: null, qi: 0 };
// מה שנשמר במסד הנתונים: בלי כתובות מקומיות של תמונות, שלא שורדות רענון
const cleanSnap = (s) => {
  const d = snapshot(s);
  return { ...d, saved: d.saved.map(({ img, vid, ...v }) => v) };
};
const ACTIVE_KEY = "gilos-active-profile";
const readActive = () => { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } };
const writeActive = (id) => { try { localStorage.setItem(ACTIVE_KEY, id); } catch {} };

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
    tip: tips[i], saved: false, rev: 1, notes: [],
  }));
}
// תיקונים שהאפליקציה יודעת לבצע כבר עכשיו, בלי מנוע AI: צבע, תאורה, לוגו וכיתוב.
// כל כלל מזהה ניסוח בעברית או באנגלית ומעדכן את האפקטים של הגרסה.
const FX_RULES = [
  [/שחור.?ו?.?לבן|מונוכרום|black.?(and|&).?white|\bb&w\b|grayscale|greyscale|monochrome/i, (f) => ({ ...f, gray: 1, sepia: 0 }), ["שחור לבן", "Black & white"]],
  [/וינטג|ספיה|רטרו|vintage|sepia|retro/i, (f) => ({ ...f, sepia: 0.7, gray: 0 }), ["וינטג׳", "Vintage"]],
  [/בצבע|בחזרה לצבע|צבע מלא|in colou?r|full colou?r/i, (f) => ({ ...f, gray: 0, sepia: 0 }), ["חזרה לצבע", "Back to color"]],
  [/בהיר|יותר אור|brighter|lighter/i, (f) => ({ ...f, bright: (f.bright || 1) + 0.2 }), ["בהיר יותר", "Brighter"]],
  [/כהה|darker/i, (f) => ({ ...f, bright: Math.max(0.4, (f.bright || 1) - 0.2) }), ["כהה יותר", "Darker"]],
  [/ניגודיות|קונטרסט|contrast/i, (f) => ({ ...f, contrast: (f.contrast || 1) + 0.25 }), ["יותר ניגודיות", "More contrast"]],
  [/צבעוני יותר|צבעים חזקים|רווי|vivid|more colou?r|saturat/i, (f) => ({ ...f, sat: (f.sat || 1) + 0.4, gray: 0 }), ["צבעים חזקים יותר", "More vivid"]],
  [/פחות צבע|דהוי|muted|faded/i, (f) => ({ ...f, sat: Math.max(0.2, (f.sat || 1) - 0.4) }), ["פחות צבע", "Less color"]],
  [/חמים|חם יותר|warm/i, (f) => ({ ...f, warm: 1, cool: 0 }), ["צבעים חמים", "Warmer"]],
  [/צבעים קרים|קר יותר|cool/i, (f) => ({ ...f, cool: 1, warm: 0 }), ["צבעים קרים", "Cooler"]],
  [/בלי לוגו|ללא לוגו|הסר.{0,6}לוגו|no logo|remove.{0,6}logo/i, (f) => ({ ...f, logo: false }), ["בלי לוגו", "No logo"]],
  [/עם לוגו|הוסף.{0,6}לוגו|with logo|add.{0,6}logo/i, (f) => ({ ...f, logo: true }), ["עם לוגו", "With logo"]],
  [/בלי כתוביות|ללא כתוביות|בלי כיתוב|ללא כיתוב|no captions?|no subtitles/i, (f) => ({ ...f, subs: false }), ["בלי כיתוב", "No captions"]],
  [/כיתוב גדול|כתוביות גדולות|גדול יותר.{0,8}כיתוב|bigger captions?|larger captions?/i, (f) => ({ ...f, subs: true, bigSubs: true }), ["כיתוב גדול", "Bigger captions"]],
];
const parseFx = (note, fx = {}) => FX_RULES.reduce((acc, [re, fn, label]) => (re.test(note) ? { fx: fn(acc.fx), applied: [...acc.applied, label] } : acc), { fx, applied: [] });
// מתרגם את האפקטים לפילטר CSS שמוחל על התמונה או הסרטון של הגרסה
const fxFilter = (f = {}) => [
  f.gray && "grayscale(1)", f.sepia && `sepia(${f.sepia})`, f.warm && "sepia(0.35) saturate(1.25)", f.cool && "hue-rotate(-18deg) saturate(1.1)",
  f.hue && `hue-rotate(${f.hue}deg)`,
  f.bright && f.bright !== 1 && `brightness(${f.bright})`, f.contrast && f.contrast !== 1 && `contrast(${f.contrast})`, f.sat && f.sat !== 1 && `saturate(${f.sat})`,
].filter(Boolean).join(" ") || undefined;
// הגוון הצבעוני של הסגנון לא מוצג כשיש אפקט, או כשמבקשים שחור לבן, וינטג׳ או צבעים רגועים
const fxTint = (f = {}) => !(f.look || f.gray || f.sepia || (f.sat && f.sat < 1));

// אפקטים מוכנים לתמונות ולסרטונים. כל אפקט מחליף את הצבע והתאורה, ולא נוגע בלוגו ובכיתוב.
const COLOR_KEYS = ["gray", "sepia", "warm", "cool", "hue", "bright", "contrast", "sat", "look", "lookName"];
const EFFECTS = [
  ["none", "ללא", "None", {}],
  ["bw", "שחור לבן", "B&W", { gray: 1 }],
  ["noir", "נואר", "Noir", { gray: 1, contrast: 1.6, bright: 0.85 }],
  ["vintage", "וינטג׳", "Vintage", { sepia: 0.6, contrast: 1.1, bright: 0.95 }],
  ["warm", "חמים", "Warm", { warm: 1 }],
  ["cool", "קרים", "Cool", { cool: 1 }],
  ["vivid", "עז", "Vivid", { sat: 1.6, contrast: 1.1 }],
  ["faded", "דהוי", "Faded", { sat: 0.55, bright: 1.1, contrast: 0.85 }],
  ["drama", "דרמטי", "Drama", { contrast: 1.45, bright: 0.9, sat: 1.15 }],
  ["neon", "ניאון", "Neon", { hue: -40, sat: 1.8, contrast: 1.2 }],
  ["dreamy", "חלומי", "Dreamy", { bright: 1.15, sat: 1.2, contrast: 0.9 }],
  ["sunset", "שקיעה", "Sunset", { sepia: 0.35, sat: 1.4, hue: -12 }],
];
const withLook = (fx = {}, key, name, fields) => {
  const base = Object.fromEntries(Object.entries(fx).filter(([k]) => !COLOR_KEYS.includes(k)));
  return key === "none" ? base : { ...base, ...fields, look: key, lookName: name };
};
// מצב AI: בכל לחיצה ממציא אפקט חדש מצירוף אקראי של גוון, רוויה, ניגודיות ותאורה
const AI_NAMES = [["זוהר", "Glow"], ["לילה", "Night"], ["קיץ", "Summer"], ["ערפל", "Haze"], ["חשמלי", "Electric"], ["אורבני", "Urban"], ["קולנועי", "Cinema"], ["פסטל", "Pastel"], ["גלקסיה", "Galaxy"], ["אש", "Fire"]];
function aiEffect(n) {
  const r = (a, b) => +(a + Math.random() * (b - a)).toFixed(2);
  const [he, en] = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
  return {
    key: `ai-${n}`, he: `AI · ${he}`, en: `AI · ${en}`,
    fields: { hue: Math.round(r(-70, 70)), sat: r(0.6, 1.9), contrast: r(0.85, 1.5), bright: r(0.85, 1.2), sepia: Math.random() < 0.3 ? r(0.2, 0.6) : 0 },
  };
}

// תיקון לגרסה לפי הערות המשתמש. מה שאפשר כבר מבוצע; השאר יבוצע כשמנוע ה-AI יחובר (שלב 6)
function reviseVersion(v, note) {
  const { fx, applied } = parseFx(note, v.fx || {});
  return { version: { ...v, fx, rev: (v.rev || 1) + 1, notes: [...(v.notes || []), note], score: Math.min(99, v.score + 2 + Math.floor(Math.random() * 6)) }, applied };
}
// קבוצות חיבור לפי הרשתות שנבחרו. אינסטגרם ופייסבוק מתחברות יחד, בהתחברות אחת של מטא.
const NET_STYLE = {
  Instagram: { bg: "linear-gradient(135deg, #833AB4, #E1306C 50%, #FCAF45)", mark: "IG" },
  Facebook: { bg: "#1877F2", mark: "f" },
  TikTok: { bg: "linear-gradient(135deg, #25F4EE, #000 45%, #000 55%, #FE2C55)", mark: "TT" },
  YouTube: { bg: "#FF0000", mark: "▶" },
  LinkedIn: { bg: "#0A66C2", mark: "in" },
  X: { bg: "#000", mark: "X" },
  Threads: { bg: "#000", mark: "@" },
  Pinterest: { bg: "#E60023", mark: "P" },
  Snapchat: { bg: "#FFFC00", fg: "#000", mark: "S" },
  Telegram: { bg: "#26A5E4", mark: "✈" },
};
function connectGroups(nets) {
  const chosen = nets.filter((n) => NET_STYLE[n]);
  const meta = chosen.filter((n) => n === "Instagram" || n === "Facebook");
  const groups = meta.length ? [{ key: "meta", nets: meta, meta: meta.length > 1, ...NET_STYLE[meta[0]], ...(meta.length > 1 ? { bg: "linear-gradient(135deg, #833AB4, #E1306C 40%, #1877F2)", mark: "IG·f" } : {}) }] : [];
  return [...groups, ...chosen.filter((n) => !meta.includes(n)).map((n) => ({ key: n, nets: [n], ...NET_STYLE[n] }))];
}

// סט אייקונים קווי אחיד (24×24, קו לבן), בסגנון אייקוני האפליקציות של אינסטגרם
const GLYPHS = {
  short: <><circle cx="6" cy="7" r="2.6" /><circle cx="6" cy="17" r="2.6" /><path d="M8.3 8.5L20 17M8.3 15.5L20 7" /></>,
  opening: <path d="M13.2 2.8L5.5 13.4h5.6l-.9 7.8 7.8-10.7h-5.7z" />,
  bigsubs: <><path d="M3.5 18.5L8.2 5.5l4.7 13M5.2 14h6" /><path d="M14.5 18.5l3-7.5 3 7.5M15.4 16.4h4.2" /></>,
  nosubs: <><rect x="3" y="5.5" width="18" height="13" rx="3" /><path d="M7 11.5h5M14.5 11.5H17M7 14.8h3.5M12.5 14.8H17" /><path d="M3.5 3.5l17 17" /></>,
  nologo: <><path d="M3.5 11.6V4.4c0-.5.4-.9.9-.9h7.2l8.9 8.9-8.2 8.2z" /><circle cx="8" cy="8" r="1.5" /><path d="M2.5 2.5l19 19" /></>,
  logo: <><path d="M3.5 11.6V4.4c0-.5.4-.9.9-.9h7.2l8.9 8.9-8.2 8.2z" /><circle cx="8" cy="8" r="1.5" /></>,
  calm: <><path d="M9 17.5V6.2l10-2.2v11.3" /><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="15.3" r="2.5" /></>,
  upbeat: <path d="M3.5 10v4M7.5 6.5v11M11.5 9v6M15.5 4v16M19.5 8.5v7" />,
  bright: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></>,
  cta: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12.8 8.4l3.6 3.6-3.6 3.6" /></>,
  sparkle: <><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" /><path d="M18.5 3.5v3M17 5h3M5.5 16.5v3M4 18h3" /></>,
  flash: <path d="M13.2 2.8L5.5 13.4h5.6l-.9 7.8 7.8-10.7h-5.7z" />,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 13.5V9.5M9.5 2.5h5M18.4 6.6l1.4-1.4" /></>,
  grid: <><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" /></>,
};
const Glyph = ({ name, size = 22, sw = 1.9 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{GLYPHS[name]}</svg>
);
// אייקון על רקע גרדיאנט מעוגל, כמו אייקוני אפליקציות
const GlyphBadge = ({ name, from, to }) => (
  <span className="glyphbadge" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}><Glyph name={name} /></span>
);

// זוגות סותרים: בחירה באחד מבטלת את השני
const OPPOSITE = { nologo: "logo", logo: "nologo", nosubs: "bigsubs", bigsubs: "nosubs", calm: "upbeat", upbeat: "calm" };
// תיקונים מהירים: כל אחד נבחר פעם אחת (לחיצה נוספת מבטלת), כדי שלא יופיע כפול בהערה. [מזהה, צבע התחלה, צבע סוף, עברית, אנגלית]
const QUICK_NOTES = [
  ["short", "#FF3D7F", "#FF8A3D", "קצר יותר", "Shorter"],
  ["opening", "#FF8A00", "#FFD000", "פתיחה חזקה יותר", "Stronger opening"],
  ["bigsubs", "#6A5CFF", "#00B4FF", "כיתוב גדול יותר", "Bigger captions"],
  ["nosubs", "#5B6475", "#8E97A8", "בלי כיתוב", "No captions"],
  ["nologo", "#833AB4", "#E1306C", "בלי לוגו", "No logo"],
  ["logo", "#E1306C", "#F77737", "עם לוגו", "With logo"],
  ["calm", "#00B4FF", "#00D9A6", "מוזיקה רגועה יותר", "Calmer music"],
  ["upbeat", "#FF2E63", "#B23BFF", "מוזיקה קצבית יותר", "More upbeat music"],
  ["bright", "#FFB800", "#FFE45C", "בהיר יותר", "Brighter"],
  ["cta", "#00C46A", "#6BE27A", "קריאה לפעולה בסוף", "Call to action at the end"],
];

/* ---------- רכיבים קטנים ---------- */
// שורה נגללת לצדדים: החלקה באצבע בטלפון, וחיצים בצדדים במחשב
const HScroll = ({ label, prev, next, children }) => {
  const by = (e, dir) => {
    const row = e.currentTarget.parentElement.querySelector(".hscroll");
    const rtl = getComputedStyle(row).direction === "rtl";
    row.scrollBy({ left: dir * (rtl ? -1 : 1) * row.clientWidth * 0.7, behavior: "smooth" });
  };
  return (
    <div className="hswrap">
      <button className="harrow start" aria-label={prev} onClick={(e) => by(e, -1)}>‹</button>
      <div className="hscroll" role="group" aria-label={label}>{children}</div>
      <button className="harrow end" aria-label={next} onClick={(e) => by(e, 1)}>›</button>
    </div>
  );
};
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
// אייקון קטן בפינה הימנית התחתונה: תמונה או סרטון (עם משך, רק לסרטון)
const KindBadge = ({ kind, dur, label }) => (
  <span className="kindbadge" title={label} aria-label={label}>
    {kind === "image" ? (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M21 16l-5-5-8 8" /></svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" /></svg>
    )}
    {kind !== "image" && dur ? <span className="ltr">{dur}</span> : null}
  </span>
);
const verKind = (v) => (v?.img ? "image" : "video"); // גרסה בלי תמונה (קישור או בלי מדיה) נחשבת סרטון

// תצוגה מקדימה של קובץ שנבחר מהמכשיר (כתובת מקומית בדפדפן), או של קישור
const MediaView = ({ m }) => {
  if (m.kind === "link") return <span className="linkthumb"><span>🔗</span><span className="ellipsis ltr">{m.name}</span></span>;
  if (m.kind === "video") return <><video className="fill" src={m.url} muted playsInline preload="metadata" /><KindBadge kind="video" /></>;
  return <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="fill" src={m.url} alt={m.name} /><KindBadge kind="image" />
  </>;
};
// תמונת הרקע של גרסה: התמונה או הסרטון שהועלו, עם האפקטים מהתיקונים וגוון הסגנון
const Cover = ({ img, vid, g, fx }) => (img || vid ? (
  <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {img ? <img className="fill" src={img} alt="" style={{ filter: fxFilter(fx) }} /> : <video className="fill" src={`${vid}#t=0.1`} muted playsInline preload="metadata" style={{ filter: fxFilter(fx) }} />}
    {fxTint(fx) && <span className="tint" style={{ background: g }} />}
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
  const go = (screen) => set({ screen, confirmDelete: false });
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
  const enterGuest = () => set({ user: null, uid: null, credits: GUEST_CREDITS, maxCredits: GUEST_CREDITS, profiles: [{ id: 1, name: null }], pid: 1, screen: "home" });

  /* ---------- Supabase: טעינה ושמירה ---------- */
  // טוען את החשבון והפרופילים של המשתמש המחובר, ופותח את הפרופיל הפעיל במכשיר הזה
  const loadAccount = async (user, nextScreen) => {
    const [acc, profs] = await Promise.all([
      supabase.from("accounts").select("credits").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("id, name, data").order("created_at"),
    ]);
    if (acc.error || profs.error || !profs.data?.length) {
      await supabase.auth.signOut();
      set({ ...INITIAL, busy: false });
      return toast(t("לא הצלחנו לטעון את החשבון. נסו שוב.", "We couldn't load your account. Please try again."));
    }
    const profiles = profs.data.map((p) => ({ id: p.id, name: p.name, data: Object.keys(p.data || {}).length ? p.data : null }));
    const saved = readActive();
    const active = profiles.find((p) => p.id === saved) || profiles[0];
    writeActive(active.id);
    // מי שעוד לא מילא שאלון בפרופיל הזה (למשל אחרי אישור אימייל) מגיע אליו
    const screen = nextScreen || (active.data ? "home" : "quiz");
    set({
      ...WORK_RESET, ...NEW_PROFILE, ...(active.data || {}),
      user: user.user_metadata?.name || user.email.split("@")[0], uid: user.id,
      credits: acc.data?.credits ?? 0, maxCredits: Math.max(MEMBER_CREDITS, acc.data?.credits ?? 0),
      profiles, pid: active.id, pass: "", busy: false, authNote: "", quizFrom: "auth", screen,
    });
  };

  // התחברות קיימת (גם אחרי לחיצה על קישור האישור באימייל)
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive && data.session) loadAccount(data.session.user);
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // שמירה אוטומטית של הפרופיל הפעיל, שנייה אחרי השינוי האחרון
  const cloudSnap = S.uid && S.pid ? JSON.stringify(cleanSnap(S)) : "";
  useEffect(() => {
    if (!supabase || !cloudSnap) return;
    const id = setTimeout(() => {
      supabase.from("profiles").update({ data: JSON.parse(cloudSnap), updated_at: new Date().toISOString() }).eq("id", S.pid).then(({ error }) => {
        if (error) toast(t("השמירה נכשלה — בדקו את החיבור", "Saving failed — check your connection"));
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [cloudSnap, S.pid]); // eslint-disable-line react-hooks/exhaustive-deps
  const saveNow = (s) => {
    if (supabase && s.uid && s.pid) supabase.from("profiles").update({ data: cleanSnap(s), updated_at: new Date().toISOString() }).eq("id", s.pid).then(() => {});
  };

  // פרופילים
  const activeProfile = S.profiles.find((p) => p.id === S.pid);
  const profileName = activeProfile ? activeProfile.name || t("אורח", "Guest") : "";
  const openProfiles = () => set((s) => ({ prev: s.screen === "profiles" ? s.prev : s.screen, screen: "profiles" }));
  const stash = (s) => s.profiles.map((p) => (p.id === s.pid ? { ...p, data: snapshot(s) } : p));
  const switchProfile = (id) => {
    saveNow(S); // לא לאבד שינוי אחרון בפרופיל שעוזבים
    if (S.uid) writeActive(id);
    set((s) => {
      const profiles = stash(s), target = profiles.find((p) => p.id === id);
      return { profiles, pid: id, ...NEW_PROFILE, ...(target.data || {}), ...WORK_RESET, screen: "home" };
    });
    toast(t("עברת פרופיל", "Profile switched"));
  };
  const addProfile = async (e) => {
    e?.preventDefault();
    const nm = S.newProf.trim();
    if (!S.user) return toast(t("פרופילים נוספים זמינים אחרי הרשמה", "Extra profiles are available after sign-up"));
    if (!nm) return toast(t("נא לתת שם לפרופיל", "Please name the profile"));
    if (S.profiles.some((p) => p.name === nm)) return toast(t("כבר יש פרופיל בשם הזה", "A profile with this name already exists"));
    let id;
    if (supabase && S.uid) {
      saveNow(S);
      set({ busy: true });
      const { data, error } = await supabase.from("profiles").insert({ name: nm, data: {} }).select("id").single();
      set({ busy: false });
      if (error) return toast(t("יצירת הפרופיל נכשלה. נסו שוב.", "Couldn't create the profile. Please try again."));
      id = data.id;
      writeActive(id);
    } else {
      id = Math.max(...S.profiles.map((p) => p.id)) + 1;
    }
    set((s) => ({ profiles: [...stash(s), { id, name: nm, data: null }], pid: id, ...NEW_PROFILE, ...WORK_RESET, newProf: "", quizFrom: "profiles", screen: "quiz" }));
  };
  const deleteProfile = async (id) => {
    if (supabase && S.uid) {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) return toast(t("המחיקה נכשלה. נסו שוב.", "Delete failed. Please try again."));
    }
    set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) }));
    toast(t("הפרופיל נמחק", "Profile deleted"));
  };

  // התנתקות ומחיקת חשבון
  const logout = async () => {
    saveNow(S);
    if (supabase && S.uid) await supabase.auth.signOut();
    set({ ...INITIAL });
  };
  const deleteAccount = async () => {
    if (!S.confirmDelete) {
      set({ confirmDelete: true });
      return toast(t("לחצו שוב כדי למחוק לצמיתות את החשבון וכל הפרופילים", "Tap again to permanently delete your account and all profiles"));
    }
    if (!supabase || !S.uid) return set({ ...INITIAL });
    set({ busy: true });
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token}` } }).catch(() => null);
    if (!res?.ok) {
      set({ busy: false, confirmDelete: false });
      return toast(t("המחיקה נכשלה. אפשר לכתוב לנו לתמיכה.", "Deletion failed. Please contact support."));
    }
    await supabase.auth.signOut();
    try { localStorage.removeItem(ACTIVE_KEY); } catch {}
    set({ ...INITIAL });
    toast(t("החשבון נמחק", "Your account was deleted"));
  };
  const openAuth = (authMode) => set({ authMode, screen: "auth" });
  const back = (to) => <Back onClick={typeof to === "function" ? to : () => go(to)} label={t("חזרה", "Back")} />;
  const top = (title, to, end) => (<div className="top">{back(to)}<h3>{title}</h3>{end || <span className="spacer" />}</div>);

  // הרשמה והתחברות. עם Supabase: אמיתיות. בלי: מצב הדגמה מקומי.
  const submitAuth = async (e) => {
    e?.preventDefault();
    if (S.busy) return;
    const reg = S.authMode === "register", nm = S.name.trim(), mail = S.mail.trim();
    if (reg && !nm) return toast(t("נא למלא שם", "Please enter a name"));
    if (!/^\S+@\S+\.\S+$/.test(mail)) return toast(t("נא להזין אימייל תקין", "Please enter a valid email"));
    if (S.pass.length < 8) return toast(t("הסיסמה צריכה לפחות 8 תווים", "Password needs at least 8 characters"));

    if (!supabase) {
      const user = nm || mail.split("@")[0];
      return set({ user, pass: "", credits: MEMBER_CREDITS, maxCredits: MEMBER_CREDITS, qi: 0, profiles: [{ id: 1, name: user }], pid: 1, quizFrom: "auth", screen: reg ? "quiz" : "home" });
    }

    set({ busy: true, authNote: "" });
    if (reg) {
      const { data, error } = await supabase.auth.signUp({ email: mail, password: S.pass, options: { data: { name: nm }, emailRedirectTo: window.location.origin } });
      if (error) {
        set({ busy: false });
        return toast(error.code === "weak_password" ? t("הסיסמה חלשה מדי — נסו סיסמה ארוכה ומגוונת יותר", "Password is too weak — try a longer, more varied one")
          : error.status === 429 ? t("יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.", "Too many attempts. Try again in a few minutes.")
          : t("ההרשמה נכשלה. בדקו את הפרטים ונסו שוב.", "Sign-up failed. Check your details and try again."));
      }
      // כשנדרש אישור אימייל, אין עדיין התחברות: מחכים שהמשתמש ילחץ על הקישור
      if (!data.session) return set({ busy: false, pass: "", authMode: "login", authNote: t(`שלחנו אימייל אישור ל-${mail}. לחצו על הקישור שבו, ואז התחברו.`, `We sent a confirmation email to ${mail}. Click the link in it, then log in.`) });
      return loadAccount(data.session.user, "quiz");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: mail, password: S.pass });
    if (error) {
      set({ busy: false });
      return toast(error.code === "email_not_confirmed" ? t("צריך קודם לאשר את האימייל — חפשו את הקישור בתיבת הדואר", "Please confirm your email first — look for the link in your inbox")
        : t("אימייל או סיסמה שגויים", "Wrong email or password"));
    }
    return loadAccount(data.user);
  };

  // TODO(שלב 6): להחליף בקריאה למנוע ה-AI האמיתי
  const startProcess = async () => {
    if (S.busy) return;
    if (S.credits < 1) return toast(t("נגמרו היצירות — אפשר לשדרג בהגדרות", "You're out of creations — upgrade in Settings"));
    // משתמש רשום: היצירה יורדת במסד הנתונים, כך שהמספר נשמר בין מכשירים
    if (supabase && S.uid) {
      set({ busy: true });
      const { data, error } = await supabase.rpc("use_credit");
      set({ busy: false });
      if (error) {
        if (/no_credits/.test(error.message)) set({ credits: 0 });
        return toast(/no_credits/.test(error.message) ? t("נגמרו היצירות — אפשר לשדרג בהגדרות", "You're out of creations — upgrade in Settings") : t("משהו השתבש. נסו שוב.", "Something went wrong. Please try again."));
      }
      set({ credits: data + 1 }); // השורה הבאה מורידה אחת, כמו במצב המקומי
    }
    const first = S.media.find((m) => m.kind !== "link");
    const img = first?.kind === "image" ? first.url : null, vid = first?.kind === "video" ? first.url : null;
    const versions = makeVersions().map((v) => ({ ...v, img, vid }));
    set((s) => ({ credits: s.credits - 1, versions, pstep: 0, linkOpen: false, screen: "process" }));
  };

  /* ---------- מדיה: קבצים מהמכשיר ומצלמה ---------- */
  // הקבצים מוצגים מקומית בלבד. TODO(שלב 6): להעלות אותם לאחסון ולשלוח למנוע ה-AI
  const room = MAX_MEDIA - S.media.length;
  // המדיה שמוצגת בתצוגה המקדימה: מה שנבחר בלחיצה, או האחרונה שנוספה
  const sel = S.media.find((m) => m.id === S.mediaSel) || S.media[S.media.length - 1];
  const selIdx = sel ? S.media.indexOf(sel) : -1;
  const tooMany = () => toast(t(`עד ${MAX_MEDIA} קבצים בכל יצירה`, `Up to ${MAX_MEDIA} files per creation`));
  const addFiles = (e) => {
    const picked = [...e.target.files];
    e.target.value = "";
    const files = picked.filter((f) => /^(image|video)\//.test(f.type));
    if (picked.length && !files.length) return toast(t("אפשר להעלות רק תמונות וסרטונים", "Only photos and videos can be uploaded"));
    if (files.length > room) tooMany();
    const items = files.slice(0, Math.max(room, 0)).map((f) => ({
      id: `file-${++mediaSeq}`,
      kind: f.type.startsWith("video") ? "video" : "image",
      url: URL.createObjectURL(f), name: f.name,
    }));
    if (items.length) set((s) => ({ media: [...s.media, ...items], screen: s.screen === "camera" ? "upload" : s.screen }));
  };

  // מצלמה בתוך האפליקציה: עובדת גם במחשב (מצלמת רשת) וגם בטלפון, בלי לצאת מהאפליקציה
  const videoRef = useRef(null), streamRef = useRef(null), recRef = useRef(null), chunksRef = useRef([]), keepRef = useRef(true);
  const zoomRef = useRef(1), pinchRef = useRef(null), drawRef = useRef(0), countRef = useRef(0);
  const openCamera = () => (room < 1 ? tooMany() : set({ screen: "camera", camError: "", camReady: false, countdown: 0 }));
  const addCaptured = (blob, kind) => {
    const item = { id: `cam-${++mediaSeq}`, kind, url: URL.createObjectURL(blob), name: kind === "image" ? "photo.jpg" : "video" };
    set((s) => ({ media: [...s.media, item].slice(0, MAX_MEDIA), mediaSel: item.id, screen: "upload", recording: false, countdown: 0 }));
    toast(kind === "image" ? t("התמונה נוספה", "Photo added") : t("הסרטון נוסף", "Video added"));
  };
  const stopRec = (keep = true) => {
    keepRef.current = keep;
    if (recRef.current?.state === "recording") recRef.current.stop();
    recRef.current = null;
    cancelAnimationFrame(drawRef.current);
  };
  const cancelCountdown = () => { clearTimeout(countRef.current); };
  useEffect(() => {
    if (S.screen !== "camera") return;
    let cancelled = false;
    const md = navigator.mediaDevices;
    const fail = (camError) => !cancelled && set({ camError, camReady: false });
    if (!md?.getUserMedia) { Promise.resolve().then(() => fail("unsupported")); return () => { cancelled = true; }; }
    // מבקשים את הרזולוציה המלאה של המצלמה, בלי לכפות יחס, כדי שהמצלמה לא תחתוך את התמונה
    md.getUserMedia({ video: { facingMode: S.camFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: S.camMode === "video" })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() || {};
        // זום אמיתי של המצלמה, כשהמכשיר תומך (בעיקר אנדרואיד). אחרת: זום דיגיטלי
        const hw = caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max } : null;
        const z = hw ? (track.getSettings?.().zoom ?? Math.max(1, hw.min)) : 1;
        zoomRef.current = hw ? 1 : z;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
        set({ camError: "", camReady: true, camHW: hw, camZoom: z, camTorchOK: !!caps.torch, camTorch: false });
      })
      .catch((err) => fail(err?.name === "NotAllowedError" || err?.name === "SecurityError" ? "denied" : err?.name === "NotFoundError" || err?.name === "OverconstrainedError" ? "nocam" : "failed"));
    return () => {
      cancelled = true;
      cancelCountdown();
      stopRec(false);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [S.screen, S.camFacing, S.camMode, S.camTry]);

  // מונה זמן הקלטה; עוצר אוטומטית אחרי דקה
  useEffect(() => {
    if (!S.recording) return;
    const id = setInterval(() => {
      setS((s) => ({ ...s, recSec: s.recSec + 1 }));
      if (recRef.current && Date.now() - recRef.current.startedAt >= 60000) stopRec(true);
    }, 1000);
    return () => clearInterval(id);
  }, [S.recording]);

  // זום: אמיתי כשיש, דיגיטלי (חיתוך מהמרכז) כשאין
  const zoomRange = S.camHW || { min: 1, max: 4 };
  const setZoom = (value) => {
    const z = Math.round(Math.min(zoomRange.max, Math.max(zoomRange.min, value)) * 10) / 10;
    if (S.camHW) streamRef.current?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ zoom: z }] }).catch(() => {});
    else zoomRef.current = z;
    set({ camZoom: z });
  };
  const zoomPresets = [0.5, 1, 2, 3, 5].filter((p) => p >= zoomRange.min - 0.01 && p <= zoomRange.max + 0.01);
  // צביטה בשתי אצבעות על התצוגה
  const dist = (e) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  const onPinchStart = (e) => { if (e.touches.length === 2) pinchRef.current = { d: dist(e), z: S.camZoom }; };
  const onPinchMove = (e) => { if (e.touches.length === 2 && pinchRef.current) setZoom(pinchRef.current.z * (dist(e) / pinchRef.current.d)); };
  const onPinchEnd = () => { pinchRef.current = null; };
  const toggleTorch = () => {
    const on = !S.camTorch;
    streamRef.current?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ torch: on }] }).then(() => set({ camTorch: on })).catch(() => toast(t("הפנס לא זמין במצלמה הזו", "The flash isn't available on this camera")));
  };

  // האזור שנשמר: יחס התמונה שנבחר, ואחריו הזום הדיגיטלי, תמיד מהמרכז
  const ratioValue = RATIOS.find(([k]) => k === S.camRatio)?.[1] || null;
  const cropRect = (vw, vh, z) => {
    let w = vw, h = vh;
    if (ratioValue) { if (vw / vh > ratioValue) w = vh * ratioValue; else h = vw / ratioValue; }
    w /= z; h /= z;
    return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
  };

  const takePhoto = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const r = cropRect(v.videoWidth, v.videoHeight, zoomRef.current);
    const c = document.createElement("canvas");
    c.width = Math.round(r.w); c.height = Math.round(r.h);
    c.getContext("2d").drawImage(v, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
    c.toBlob((b) => b && addCaptured(b, "image"), "image/jpeg", 0.92);
  };
  const startRec = () => {
    const stream = streamRef.current, v = videoRef.current;
    if (!stream || !v?.videoWidth || typeof MediaRecorder === "undefined") return toast(t("הדפדפן הזה לא תומך בהקלטת וידאו", "This browser can't record video"));
    let recStream = stream;
    // כשיש חיתוך (יחס או זום דיגיטלי), מקליטים דרך קנבס כדי שהסרטון ייראה כמו התצוגה
    const r0 = cropRect(v.videoWidth, v.videoHeight, zoomRef.current);
    if (r0.w < v.videoWidth - 1 || r0.h < v.videoHeight - 1 || ratioValue) {
      const c = document.createElement("canvas");
      const base = cropRect(v.videoWidth, v.videoHeight, 1);
      c.width = Math.round(base.w / 2) * 2; c.height = Math.round(base.h / 2) * 2;
      const ctx = c.getContext("2d");
      const draw = () => {
        const r = cropRect(v.videoWidth, v.videoHeight, zoomRef.current);
        ctx.drawImage(v, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
        drawRef.current = requestAnimationFrame(draw);
      };
      draw();
      recStream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...stream.getAudioTracks()]);
    }
    const type = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
    const rec = new MediaRecorder(recStream, type ? { mimeType: type } : undefined);
    chunksRef.current = [];
    keepRef.current = true;
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      cancelAnimationFrame(drawRef.current);
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
      if (keepRef.current && blob.size) addCaptured(blob, "video");
      else set({ recording: false });
    };
    rec.start();
    rec.startedAt = Date.now();
    recRef.current = rec;
    set({ recording: true, recSec: 0 });
  };
  const leaveCamera = () => { cancelCountdown(); stopRec(false); go("upload"); };
  // טיימר: ספירה לאחור לפני צילום או הקלטה
  const fire = () => (S.camMode === "photo" ? takePhoto() : startRec());
  const shutter = () => {
    if (S.recording) return stopRec(true);
    if (S.countdown) { cancelCountdown(); return set({ countdown: 0 }); }
    if (!S.camTimer) return fire();
    const tick = (n) => {
      set({ countdown: n });
      countRef.current = setTimeout(() => (n > 1 ? tick(n - 1) : (set({ countdown: 0 }), fire())), 1000);
    };
    tick(S.camTimer);
  };

  // תצוגה מקדימה של גרסה ותיקונים לפי הערות
  // לוגו מהמכשיר: מוקטן ל-256 פיקסלים לכל היותר ונשמר עם הפרופיל, ומשמש כסימן המים על הגרסאות
  const logoImg = typeof S.logo === "string" ? S.logo : null;
  const pickLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast(t("הלוגו צריך להיות קובץ תמונה", "The logo must be an image file"));
    if (file.size > 5 * 1024 * 1024) return toast(t("הקובץ גדול מדי (עד 5MB)", "The file is too large (max 5MB)"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 256 / Math.max(img.naturalWidth || 256, img.naturalHeight || 256));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round((img.naturalWidth || 256) * scale));
      c.height = Math.max(1, Math.round((img.naturalHeight || 256) * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      set({ logo: c.toDataURL("image/png"), logoAR: +(c.width / c.height).toFixed(3), watermark: true });
      toast(t("הלוגו נשמר ויופיע על הגרסאות", "Logo saved — it will appear on your versions"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast(t("לא הצלחנו לקרוא את התמונה", "We couldn't read that image")); };
    img.src = url;
  };
  // הלוגו על הגרסה: מיקום, גודל, שקיפות וצבע לפי בחירת המשתמש (ברירת מחדל: למעלה משמאל, בלי שקיפות)
  const lc = { ...LOGO_DEFAULT, ...(S.logoCfg || {}) };
  const logoColor = LOGO_COLORS.find((x) => x[0] === lc.color)?.[3] || null;
  const wm = (editable = false) => {
    const style = { left: `${lc.x * 100}%`, top: `${lc.y * 100}%`, width: `${lc.size * 100}%`, opacity: lc.opacity, aspectRatio: String(logoImg ? S.logoAR || 1 : 2.6) };
    const inner = !logoImg
      ? <svg viewBox="0 0 52 20" width="100%" height="100%" aria-hidden="true"><text x="26" y="15" textAnchor="middle" fontFamily="var(--font-orbitron), sans-serif" fontWeight="900" fontSize="13" fill={logoColor || "#fff"}>LOGO</text></svg>
      : logoColor
        ? <span className="wmmask" style={{ background: logoColor, WebkitMaskImage: `url(${logoImg})`, maskImage: `url(${logoImg})` }} />
        : <img src={logoImg} alt="" />; // eslint-disable-line @next/next/no-img-element
    if (!editable) return <span className="wmbox" style={style}>{inner}</span>;
    return (
      <span className="wmbox drag" style={style} onPointerDown={logoDragStart} onPointerMove={logoDragMove} onPointerUp={logoDragEnd} onPointerCancel={logoDragEnd}
        role="slider" aria-valuenow={Math.round(lc.x * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={t("מיקום הלוגו — גררו כדי להזיז", "Logo position — drag to move")} aria-valuetext={`${Math.round(lc.x * 100)}%, ${Math.round(lc.y * 100)}%`}>
        {inner}
      </span>
    );
  };
  const setLogo = (patch) => set((s) => {
    const cur = { ...LOGO_DEFAULT, ...(s.logoCfg || {}), ...patch };
    return { logoCfg: { ...cur, x: Math.min(cur.x, Math.max(0, 1 - cur.size)) } };
  });
  // גרירת הלוגו על הנגן, בעכבר או באצבע
  const logoDragStart = (e) => {
    const box = e.currentTarget, area = box.parentElement.getBoundingClientRect(), r = box.getBoundingClientRect();
    box.setPointerCapture?.(e.pointerId);
    logoDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top, area, w: r.width, h: r.height };
    e.preventDefault();
  };
  const logoDragMove = (e) => {
    if (!logoDrag) return;
    const { dx, dy, area, w, h } = logoDrag;
    const x = Math.min(Math.max(0, e.clientX - dx - area.left), Math.max(0, area.width - w)) / area.width;
    const y = Math.min(Math.max(0, e.clientY - dy - area.top), Math.max(0, area.height - h)) / area.height;
    setLogo({ x: +x.toFixed(3), y: +y.toFixed(3) });
  };
  const logoDragEnd = () => { logoDrag = null; };
  // מיקומים מהירים: פינות ומרכז, מחושבים לפי גודל הנגן
  const placeLogo = (pos) => {
    const p = document.querySelector(".vplayer")?.getBoundingClientRect();
    const hf = p ? (lc.size * p.width) / (logoImg ? S.logoAR || 1 : 2.6) / p.height : lc.size;
    const m = 0.04, right = 1 - lc.size - m, bottom = Math.max(m, 1 - hf - m);
    const at = { tl: { x: m, y: m }, tr: { x: right, y: m }, c: { x: (1 - lc.size) / 2, y: (1 - hf) / 2 }, bl: { x: m, y: bottom }, br: { x: right, y: bottom } }[pos];
    setLogo(at);
  };

  // חיבור חשבונות. TODO(שלב 5): להחליף בהתחברות אמיתית — אינסטגרם ופייסבוק יחד דרך התחברות אחת של מטא
  const connectMany = (groups) => {
    const queue = groups.filter((g) => !g.nets.every((n) => S.connected.includes(n)));
    const step = (i) => {
      if (i >= queue.length) {
        set({ connecting: null });
        return toast(t("החשבונות חוברו", "Accounts connected"));
      }
      set({ connecting: queue[i].key });
      setTimeout(() => {
        set((s) => ({ connected: [...new Set([...s.connected, ...queue[i].nets])] }));
        step(i + 1);
      }, 900);
    };
    step(0);
  };

  const findVersion = (id) => S.versions.find((x) => x.id === id) || S.saved.find((x) => x.id === id);
  const openPreview = (v) => set({ pv: v.id, note: "", picks: [], applying: false, screen: "vpreview" });
  const updateVersion = (id, fn) => set((s) => {
    const swap = (list) => list.map((x) => (x.id === id ? fn(x) : x));
    return { versions: swap(s.versions), saved: swap(s.saved), chosen: s.chosen?.id === id ? fn(s.chosen) : s.chosen };
  });
  // אפקט מוכן: מוחל מיד, בלי לשלוח
  const applyEffect = (v, [key, he, en, fields]) => {
    updateVersion(v.id, (x) => ({ ...x, fx: withLook(x.fx, key, [he, en], fields) }));
    toast(key === "none" ? t("האפקט הוסר", "Effect removed") : t(`אפקט: ${he}`, `Effect: ${en}`));
  };
  // מצב AI: אפקט חדש בכל לחיצה
  const aiMode = (v) => {
    const e = aiEffect(S.aiN + 1);
    set({ aiN: S.aiN + 1 });
    updateVersion(v.id, (x) => ({ ...x, fx: withLook(x.fx, e.key, [e.he, e.en], e.fields) }));
    toast(t(`✨ ${e.he} — לחצו שוב לאפקט אחר`, `✨ ${e.en} — tap again for another`));
  };
  // ההערה הנשלחת: התיקונים המהירים שנבחרו ואחריהם הטקסט החופשי
  const composedNote = [...S.picks.map((k) => { const q = QUICK_NOTES.find((x) => x[0] === k); return t(q[2], q[3]); }), S.note.trim()].filter(Boolean).join(", ");
  const applyNote = (v) => {
    const note = composedNote;
    if (!note || S.applying) return;
    set({ applying: true, picks: [] });
    setTimeout(() => {
      const { version: nv, applied } = reviseVersion(v, note);
      const swap = (list) => list.map((x) => (x.id === v.id ? nv : x));
      set((s) => ({ versions: swap(s.versions), saved: swap(s.saved), chosen: s.chosen?.id === v.id ? nv : s.chosen, note: "", applying: false }));
      // אומרים בדיוק מה בוצע, ומה מחכה למנוע ה-AI
      toast(applied.length
        ? t(`בוצע: ${applied.map((a) => a[0]).join(", ")}`, `Done: ${applied.map((a) => a[1]).join(", ")}`)
        : t("ההערה נשמרה. שינוי כזה יבוצע כשמנוע העריכה יחובר.", "Note saved. This kind of change will apply once the editing engine is connected."));
    }, 1200);
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
          {S.authNote && <div className="card note" role="status">✉️ {S.authNote}</div>}
          <form className="col" style={{ gap: 14 }} onSubmit={submitAuth} noValidate>
            {reg && (<div className="field"><label htmlFor="in-name">{t("שם מלא או שם העסק", "Full name or business name")}</label><input id="in-name" value={S.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("השם שלך", "Your name")} autoComplete="name" /></div>)}
            <div className="field"><label htmlFor="in-mail">{t("אימייל", "Email")}</label><input id="in-mail" type="email" className="ltr" style={{ textAlign: t("right", "left") }} value={S.mail} onChange={(e) => set({ mail: e.target.value })} placeholder="name@email.com" autoComplete="email" /></div>
            <div className="field"><label htmlFor="in-pass">{t("סיסמה", "Password")}</label><input id="in-pass" type="password" value={S.pass} onChange={(e) => set({ pass: e.target.value })} placeholder={t("לפחות 8 תווים", "At least 8 characters")} autoComplete={reg ? "new-password" : "current-password"} /></div>
            <button type="submit" hidden />
          </form>
          <div className="grow" />
          <button className="btn btn-primary" disabled={S.busy} onClick={submitAuth}>{S.busy ? t("רגע…", "One moment…") : reg ? t("הרשמה והמשך לשאלון", "Sign up and continue") : t("התחברות", "Log in")}</button>
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
      const groups = q.connect ? connectGroups(S.quiz.nets) : [];
      const pending = groups.filter((g) => !g.nets.every((n) => S.connected.includes(n)));
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
            {q.connect && !groups.length && <div className="empty">{t("לא נבחרו רשתות. אפשר לחזור צעד אחורה ולבחור, או לחבר בהמשך בהגדרות.", "No networks selected. Go back a step to pick some, or connect later in Settings.")}</div>}
            {q.connect && groups.length > 0 && (
                <>
                  <button className="btn btn-primary btn-sm" disabled={!pending.length || !!S.connecting} onClick={() => connectMany(pending)}>
                    {pending.length ? t(`⚡ חיבור הכול (${pending.length})`, `⚡ Connect all (${pending.length})`) : t("✓ הכול מחובר", "✓ All connected")}
                  </button>
                  {groups.map((g) => {
                    const done = g.nets.every((n) => S.connected.includes(n)), busy = S.connecting === g.key;
                    return (
                      <div key={g.key} className={cx("card row connrow", done && "done")}>
                        <span className="row start" style={{ gap: 12, minWidth: 0 }}>
                          <span className="netbadge" style={{ background: g.bg, color: g.fg || "#fff" }} aria-hidden="true">{g.mark}</span>
                          <span style={{ minWidth: 0 }}>
                            <h3 className="ltr" style={{ textAlign: "start" }}>{g.nets.join(" + ")}</h3>
                            <span className="muted small">{g.meta ? t("חיבור אחד לשתיהן, דרך חשבון מטא", "One connection for both, via your Meta account") : t("התחברות לחשבון ואישור הרשאה", "Log in and approve access")}</span>
                          </span>
                        </span>
                        {done ? <span className="small" style={{ color: "var(--green)", flex: "none" }}>✓ {t("מחובר", "Connected")}</span>
                          : <button className="chip small" style={{ color: "#fff", minHeight: 34, flex: "none" }} disabled={!!S.connecting} onClick={() => connectMany([g])}>{busy ? t("מתחבר…", "Connecting…") : t("חיבור", "Connect")}</button>}
                      </div>
                    );
                  })}
                  <span className="muted small">{t("🔒 אנחנו לא רואים ולא שומרים את הסיסמאות שלכם. אפשר לנתק בכל רגע בהגדרות.", "🔒 We never see or store your passwords. You can disconnect any time in Settings.")}</span>
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
              // קישור פותח שדה להדבקה, מצלמה פותחת את מסך המצלמה, וגלריה את בורר הקבצים של המכשיר
              if (s === "קישור") return <button key={s} className={cx("src", S.linkOpen && "on")} style={{ "--c": c }} onClick={() => set({ linkOpen: !S.linkOpen })}>{inner}</button>;
              if (s === "מצלמה") return <button key={s} className="src" style={{ "--c": c }} onClick={openCamera}>{inner}</button>;
              return (
                <label key={s} className="src" style={{ "--c": c }}>
                  <input type="file" accept="image/*,video/*" multiple onChange={addFiles} aria-label={tr(s)} />
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
              <Thumb key={m.id} g={GRADS[0]} style={sel?.id === m.id ? { boxShadow: "0 0 0 2px var(--blue), 0 0 12px var(--blue)" } : undefined}>
                <MediaView m={m} />
                <button className="thumbhit" aria-label={t(`תצוגה מקדימה: ${m.name}`, `Preview: ${m.name}`)} aria-pressed={sel?.id === m.id} onClick={() => set({ mediaSel: m.id })} />
                <button className="x" aria-label={t(`הסרת ${m.name}`, `Remove ${m.name}`)} onClick={() => set((s) => ({ media: s.media.filter((x) => x.id !== m.id) }))}>×</button>
              </Thumb>
            )) : <span className="muted" style={{ fontSize: 13 }}>{t("עוד לא נבחרה מדיה — בחרו מקור למעלה", "No media yet — pick a source above")}</span>}
          </div>
          <div className="scroll">
            {sel && (
              <div className="card stack bigprev">
                <div className="row">
                  <h3>{t("תצוגה מקדימה", "Preview")}</h3>
                  <span className="muted small">{t(`${selIdx + 1} מתוך ${S.media.length}`, `${selIdx + 1} of ${S.media.length}`)}</span>
                </div>
                <div className="prevframe">
                  {sel.kind === "video" ? <video key={sel.id} src={sel.url} controls playsInline preload="metadata" />
                    : sel.kind === "image" ? <img key={sel.id} src={sel.url} alt={sel.name} /> // eslint-disable-line @next/next/no-img-element
                    : <div className="prevlink"><span>🔗</span><span className="ltr">{sel.id}</span><span className="muted small">{t("ניצור סרטון קצר מהקישור הזה", "We'll create a short video from this link")}</span></div>}
                </div>
              </div>
            )}
            <div className="card row"><div><h3>{t("כתוביות אוטומטיות", "Auto captions")}</h3><span className="muted small">{t("כיתוב מונפש לפי מה שנאמר בסרטון", "Animated captions from what's said in the video")}</span></div><Switch on={S.subs} onClick={() => set({ subs: !S.subs })} label={t("כתוביות אוטומטיות", "Auto captions")} /></div>
            <div className="card row"><div><h3>{t("לוגו / סימן מים", "Logo / watermark")}</h3><span className="muted small">{logoImg ? t("הלוגו שהעלית בהגדרות", "The logo you uploaded in Settings") : t("עוד לא הועלה לוגו — אפשר להעלות בהגדרות", "No logo yet — upload one in Settings")}</span></div><Switch on={S.watermark} onClick={() => set({ watermark: !S.watermark })} label={t("לוגו או סימן מים", "Logo or watermark")} /></div>
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

    /* 5א. מצלמה */
    camera: () => {
      const errText = {
        denied: t("אין הרשאה למצלמה. אפשרו גישה למצלמה בהגדרות הדפדפן (סמל המנעול ליד הכתובת), ואז נסו שוב.", "No camera permission. Allow camera access in your browser settings (the lock icon by the address), then try again."),
        nocam: t("לא נמצאה מצלמה במכשיר הזה.", "No camera was found on this device."),
        unsupported: t("הדפדפן הזה לא תומך במצלמה בתוך האפליקציה.", "This browser doesn't support the in-app camera."),
        failed: t("לא הצלחנו לפתוח את המצלמה. ייתכן שאפליקציה אחרת משתמשת בה.", "We couldn't open the camera. Another app may be using it."),
      }[S.camError];
      const mmss = `${Math.floor(S.recSec / 60)}:${String(S.recSec % 60).padStart(2, "0")}`;
      const digital = S.camHW ? 1 : S.camZoom;
      const frameAspect = ratioValue || (S.camDims ? S.camDims.w / S.camDims.h : 3 / 4);
      const zl = (z) => `${String(z).replace(/^0\./, ".")}×`;
      const busy = S.recording || S.countdown > 0;
      return (
        <section className="screen camscreen">
          <div className="campane" onTouchStart={onPinchStart} onTouchMove={onPinchMove} onTouchEnd={onPinchEnd}>
            <div className="camframe" style={{ aspectRatio: String(frameAspect) }}>
              <video ref={videoRef} className={cx("campreview", !S.camReady && "dim")} autoPlay muted playsInline
                onLoadedMetadata={(e) => set({ camDims: { w: e.currentTarget.videoWidth, h: e.currentTarget.videoHeight } })}
                style={{ transform: `${S.camFacing === "user" ? "scaleX(-1) " : ""}scale(${digital})` }} />
              {S.camGrid && <span className="camgrid" aria-hidden="true" />}
              {S.countdown > 0 && <span className="countdown" aria-live="assertive">{S.countdown}</span>}
            </div>
          </div>
          <div className="top camtop">
            <Back onClick={leaveCamera} label={t("חזרה", "Back")} />
            {S.recording ? <span className="recbadge ltr">● {mmss}</span> : <span />}
            <div className="camtools">
              {S.camTorchOK && <button className={cx("camtool", S.camTorch && "on")} onClick={toggleTorch} aria-pressed={S.camTorch} aria-label={t("פנס", "Flash")}><Glyph name="flash" size={18} /></button>}
              <button className={cx("camtool", S.camTimer && "on")} disabled={busy} onClick={() => set({ camTimer: S.camTimer === 0 ? 3 : S.camTimer === 3 ? 10 : 0 })} aria-label={t(`טיימר: ${S.camTimer || "כבוי"}`, `Timer: ${S.camTimer || "off"}`)}>
                <Glyph name="timer" size={18} />{S.camTimer ? <small>{S.camTimer}</small> : null}
              </button>
              <button className={cx("camtool", S.camGrid && "on")} onClick={() => set({ camGrid: !S.camGrid })} aria-pressed={S.camGrid} aria-label={t("קווי רשת", "Grid lines")}><Glyph name="grid" size={18} /></button>
            </div>
          </div>
          {S.camError ? (
            <div className="card stack camerr" role="alert">
              <span>{errText}</span>
              <button className="btn btn-sm btn-primary" onClick={() => set((s) => ({ camError: "", camReady: false, camTry: s.camTry + 1 }))}>{t("נסו שוב", "Try again")}</button>
              {/* חלופה: מצלמת המכשיר עצמה, דרך בורר הקבצים */}
              <label className="btn btn-sm btn-soft">
                <input type="file" accept={S.camMode === "video" ? "video/*" : "image/*"} capture="environment" onChange={addFiles} hidden />
                {t("פתיחת מצלמת המכשיר", "Open the device camera")}
              </label>
            </div>
          ) : !S.camReady && <div className="camwait muted">{t("פותחים את המצלמה…", "Opening the camera…")}</div>}
          <div className="camcontrols">
            {S.camReady && (
              <div className="zoombar" role="group" aria-label={t("זום", "Zoom")}>
                {zoomPresets.map((p) => (
                  <button key={p} className={cx("zoomchip", Math.abs(S.camZoom - p) < 0.05 && "on")} onClick={() => setZoom(p)} aria-label={t(`זום ${p}`, `Zoom ${p}`)}>{zl(p)}</button>
                ))}
                {!zoomPresets.some((p) => Math.abs(S.camZoom - p) < 0.05) && <span className="zoomchip on">{zl(S.camZoom)}</span>}
              </div>
            )}
            {S.camReady && (
              <input type="range" className="zoomslider" min={zoomRange.min} max={zoomRange.max} step="0.1" value={S.camZoom}
                onChange={(e) => setZoom(+e.target.value)} aria-label={t("זום", "Zoom")} dir="ltr" />
            )}
            {!busy && (
              <div className="ratiobar">
                {RATIOS.map(([k]) => (
                  <button key={k} className={cx("ratiochip", S.camRatio === k && "on")} onClick={() => set({ camRatio: k })}>{k === "full" ? t("מלא", "Full") : k}</button>
                ))}
              </div>
            )}
            {!busy && <Seg value={S.camMode} onChange={(camMode) => set({ camMode, camReady: false })} options={[["photo", t("תמונה", "Photo")], ["video", t("וידאו", "Video")]]} />}
            <div className="camrow">
              <span className="camside small">{S.media.length}/{MAX_MEDIA}</span>
              <button className={cx("shutter", S.camMode === "video" && "vid", S.recording && "rec")} disabled={!S.camReady} onClick={shutter}
                aria-label={S.countdown ? t("ביטול הטיימר", "Cancel timer") : S.camMode === "photo" ? t("צילום תמונה", "Take photo") : S.recording ? t("עצירת הקלטה", "Stop recording") : t("התחלת הקלטה", "Start recording")} />
              <button className="camside flip" disabled={busy} onClick={() => set({ camFacing: S.camFacing === "user" ? "environment" : "user", camReady: false })} aria-label={t("החלפת מצלמה", "Switch camera")}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><path d="M9.5 12.5a2.8 2.8 0 0 1 5-1.5M14.5 14a2.8 2.8 0 0 1-5 1.2" /><path d="M14.6 9.6v1.6h-1.6M9.4 16.6V15h1.6" /></svg>
              </button>
            </div>
          </div>
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
                <Cover img={v.img} vid={v.vid} g={v.g} fx={v.fx} />
                {verKind(v) === "video" && <span className="play">▶</span>}
                {(v.fx?.subs ?? S.subs) && <span className="subs" />}{(v.fx?.logo ?? S.watermark) && wm()}
                <KindBadge kind={verKind(v)} dur={v.dur} label={verKind(v) === "image" ? t("תמונה", "Photo") : t("סרטון", "Video")} />
                <button className="thumbhit" aria-label={t(`תצוגה מקדימה ותיקונים לגרסה ${i + 1}`, `Preview and edit version ${i + 1}`)} onClick={() => openPreview(v)} />
              </Thumb>
              <div className="ver-body">
                <div className="row">
                  <div><div className="muted" style={{ fontSize: 11.5 }}>{t(`גרסה ${i + 1}`, `Version ${i + 1}`)}{v.rev > 1 ? t(` · תיקון ${v.rev - 1}`, ` · edit ${v.rev - 1}`) : ""}{v.saved ? t(" · נשמרה", " · saved") : ""}</div><h3 style={{ fontSize: 15.5 }}>{tr(v.name)}</h3></div>
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

    /* 6א. תצוגה מקדימה של גרסה, עם הערות ותיקונים */
    vpreview: () => {
      const v = findVersion(S.pv);
      if (!v) return <section className="screen">{top(t("תצוגה מקדימה", "Preview"), "versions")}<div className="empty">{t("הגרסה לא נמצאה.", "Version not found.")}</div></section>;
      const idx = S.versions.findIndex((x) => x.id === v.id);
      return (
        <section className="screen" style={{ gap: 12 }}>
          {top(idx >= 0 ? t(`גרסה ${idx + 1} · ${tr(v.name)}`, `Version ${idx + 1} · ${tr(v.name)}`) : tr(v.name), "versions",
            <div className="score" style={{ "--v": v.score, "--c": scoreColor(v.score), width: 38, height: 38, fontSize: 11.5 }} title={t("ציון", "Score")}>{v.score}</div>)}
          <div className="scroll" style={{ gap: 12 }}>
            <div className={cx("vplayer", S.applying && "busy")} style={{ "--g": v.g }}>
              {/* הסרטון מתנגן פעם אחת ונעצר. אחרי תיקון הוא נטען מחדש (key חדש) ומתנגן שוב */}
              {v.vid ? <video key={`${v.id}-${v.rev}`} src={v.vid} autoPlay muted playsInline controls style={{ filter: fxFilter(v.fx) }} />
                : v.img ? <img key={`${v.id}-${v.rev}`} src={v.img} alt="" style={{ filter: fxFilter(v.fx) }} /> // eslint-disable-line @next/next/no-img-element
                : <div className="vplaceholder">{tr(v.name)}</div>}
              {fxTint(v.fx) && <span className="tint" style={{ background: v.g }} />}
              {(v.fx?.subs ?? S.subs) && <span className={cx("vsubs", v.fx?.bigSubs && "big")} dir="auto">{(S.caption || caps[S.cap].text).slice(0, 42)}</span>}
              {(v.fx?.logo ?? S.watermark) && wm(true)}
              <KindBadge kind={verKind(v)} dur={v.vid ? null : v.dur} label={verKind(v) === "image" ? t("תמונה", "Photo") : t("סרטון", "Video")} />
              {v.rev > 1 && <span className="revbadge">{t(`תיקון ${v.rev - 1}`, `Edit ${v.rev - 1}`)}</span>}
              {S.applying && <div className="vapplying"><span className="ring" style={{ width: 54, height: 54 }} /><span>{t("מעדכנים את הגרסה…", "Updating this version…")}</span></div>}
            </div>
            <div className="card stack logocard">
              <div className="row">
                <h3>{t("לוגו", "Logo")}</h3>
                {logoImg ? <span className="muted small">{t("גררו את הלוגו על הגרסה כדי להזיז", "Drag the logo on the version to move it")}</span>
                  : <label className="chip small" style={{ minHeight: 32, cursor: "pointer", color: "#fff" }}>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={pickLogo} />
                      {t("＋ העלאת לוגו", "＋ Upload logo")}
                    </label>}
              </div>
              {!(v.fx?.logo ?? S.watermark) && <span className="muted small">{t("הלוגו מוסתר בגרסה הזו. אפשר להחזיר עם ״עם לוגו״ בתיקונים המהירים.", "The logo is hidden in this version. Bring it back with “With logo” in the quick fixes.")}</span>}
              <div className="logopos" role="group" aria-label={t("מיקום מהיר", "Quick position")}>
                {[["tl", t("למעלה משמאל", "Top left")], ["tr", t("למעלה מימין", "Top right")], ["c", t("מרכז", "Center")], ["bl", t("למטה משמאל", "Bottom left")], ["br", t("למטה מימין", "Bottom right")]].map(([k, l]) => (
                  <button key={k} className={cx("posbtn", k)} onClick={() => placeLogo(k)} aria-label={l} title={l}><i /></button>
                ))}
                <button className="chip small" style={{ minHeight: 30, marginInlineStart: "auto" }} onClick={() => set({ logoCfg: LOGO_DEFAULT })}>{t("איפוס", "Reset")}</button>
              </div>
              <label className="rangerow"><span>{t("גודל", "Size")}</span>
                <input type="range" min="0.06" max="0.5" step="0.01" value={lc.size} onChange={(e) => setLogo({ size: +e.target.value })} dir="ltr" />
                <b className="ltr">{Math.round(lc.size * 100)}%</b></label>
              <label className="rangerow"><span>{t("שקיפות", "Opacity")}</span>
                <input type="range" min="0.1" max="1" step="0.05" value={lc.opacity} onChange={(e) => setLogo({ opacity: +e.target.value })} dir="ltr" />
                <b className="ltr">{Math.round(lc.opacity * 100)}%</b></label>
              <div className="row start" style={{ gap: 8, flexWrap: "wrap" }} role="group" aria-label={t("צבע הלוגו", "Logo color")}>
                <span className="small" style={{ minWidth: 44 }}>{t("צבע", "Color")}</span>
                {LOGO_COLORS.map(([k, he, en, c]) => (
                  <button key={k} className={cx("swatch", lc.color === k && "on", !c && "orig")} style={c ? { background: c } : undefined} onClick={() => setLogo({ color: k })} aria-pressed={lc.color === k} aria-label={t(he, en)} title={t(he, en)} />
                ))}
              </div>
            </div>
            <div className="card stack">
              <div className="row"><h3>{t("אפקטים", "Effects")}</h3>{v.fx?.lookName && <span className="small" style={{ color: "var(--yellow)" }}>{t(v.fx.lookName[0], v.fx.lookName[1])}</span>}</div>
              <HScroll label={t("אפקטים", "Effects")} prev={t("הקודם", "Previous")} next={t("הבא", "Next")}>
                <button className={cx("tile fxtile ai", v.fx?.look?.startsWith("ai-") && "on")} onClick={() => aiMode(v)} aria-label={t("מצב AI: אפקט חדש בכל לחיצה", "AI mode: a new effect on every tap")}>
                  <span className="fxthumb aiglow" aria-hidden="true"><Glyph name="sparkle" size={28} sw={1.7} /></span><span className="tilelabel">{t("מצב AI", "AI mode")}</span>
                </button>
                {EFFECTS.map((e) => {
                  const [key, he, en, fields] = e, on = (v.fx?.look || "none") === key;
                  return (
                    <button key={key} className={cx("tile fxtile", on && "on")} aria-pressed={on} onClick={() => !on && applyEffect(v, e)}>
                      <span className="fxthumb" style={{ "--g": v.g }}>
                        {v.img ? <img src={v.img} alt="" style={{ filter: fxFilter(fields) }} /> // eslint-disable-line @next/next/no-img-element
                          : v.vid ? <video src={`${v.vid}#t=0.1`} muted playsInline preload="metadata" style={{ filter: fxFilter(fields) }} />
                          : <span className="fxswatch" style={{ filter: fxFilter(fields) }} />}
                      </span>
                      <span className="tilelabel">{t(he, en)}</span>
                    </button>
                  );
                })}
              </HScroll>
            </div>
            <div className="card stack">
              <h3>{t("הערות ותיקונים לגרסה", "Notes and fixes for this version")}</h3>
              {v.notes?.length > 0 && (
                <ol className="notelist">{v.notes.map((n, i) => (<li key={i} dir="auto"><span className="muted small">{t(`תיקון ${i + 1}:`, `Edit ${i + 1}:`)}</span> {n}</li>))}</ol>
              )}
              <span className="muted small">{t("תיקונים מהירים — לחיצה בוחרת, לחיצה נוספת מבטלת", "Quick fixes — tap to pick, tap again to remove")}</span>
              <HScroll label={t("תיקונים מהירים", "Quick fixes")} prev={t("הקודם", "Previous")} next={t("הבא", "Next")}>
                {QUICK_NOTES.map(([k, from, to, he, eng]) => {
                  const on = S.picks.includes(k);
                  if (k === "logo" && !logoImg) return (
                    <label key={k} className={cx("tile", on && "on")} style={{ cursor: "pointer" }}>
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden disabled={S.applying}
                        onChange={(e) => { pickLogo(e); set((s) => ({ picks: [...s.picks.filter((p) => p !== "nologo" && p !== "logo"), "logo"] })); }} />
                      <GlyphBadge name={k} from={from} to={to} /><span className="tilelabel">{t("הוספת לוגו", "Add logo")}</span>
                    </label>
                  );
                  return (
                    <button key={k} className={cx("tile", on && "on")} aria-pressed={on} disabled={S.applying} onClick={() => set((s) => ({ picks: toggle(s.picks.filter((p) => p !== OPPOSITE[k]), k) }))}>
                      <GlyphBadge name={k} from={from} to={to} /><span className="tilelabel">{t(he, eng)}</span>
                    </button>
                  );
                })}
              </HScroll>
              <textarea dir="auto" style={{ height: 76, fontSize: 14 }} aria-label={t("הערות ותיקונים", "Notes and fixes")} value={S.note} onChange={(e) => set({ note: e.target.value })} placeholder={t("ועוד משהו במילים שלכם? למשל: להחליף את המוזיקה, להתחיל מהרגע השני", "Anything else in your own words? e.g. change the music, start from the second moment")} />
              {composedNote && <span className="muted small" dir="auto">{t("יישלח:", "Will send:")} {composedNote}</span>}
              <button className="btn btn-primary btn-sm" disabled={!composedNote || S.applying} onClick={() => applyNote(v)}>{S.applying ? t("מעדכנים…", "Updating…") : t("✨ שליחת התיקון", "✨ Send the fix")}</button>
            </div>
          </div>
          <div className="acts">
            <button className="act pub" style={{ height: 44 }} disabled={S.applying} onClick={() => toPublish(v)}>{t("פרסום", "Publish")}</button>
            <button className="act" style={{ height: 44 }} disabled={S.applying} onClick={() => saveVersion(v)}>{v.saved ? t("✓ נשמר", "✓ Saved") : t("שמירה", "Save")}</button>
          </div>
        </section>
      );
    },

    /* 7. פרסום */
    publish: () => (
      <section className="screen" style={{ gap: 11 }}>
        {top(t("פרסום", "Publish"), "versions")}
        <div className="scroll" style={{ gap: 11 }}>
          <div style={{ display: "grid", gridTemplateColumns: "76px minmax(0, 1fr)", gap: 10, flex: "none" }}>
            <Thumb g={S.chosen?.g} style={{ height: 112 }}><Cover img={S.chosen?.img} vid={S.chosen?.vid} g={S.chosen?.g} fx={S.chosen?.fx} /></Thumb>
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
                <span className="row"><Thumb g={v.g} style={{ width: 36, height: 46 }} /><span><h3>{tr(v.name)}</h3><span className="muted" style={{ fontSize: 12 }}>{verKind(v) === "image" ? t("תמונה", "Photo") : <>{t("סרטון", "Video")} · <span className="ltr">{v.dur}</span></>}</span></span></span>
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
          {[...new Set([...NETS.map((x) => x.n), ...S.quiz.nets, ...S.connected])].filter((n) => NET_STYLE[n]).map((n) => ({ n, c: color(n) })).map((x) => {
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
            <div className="row">
              <span style={{ fontSize: 14 }}>{t("לוגו", "Logo")}</span>
              <span className="row" style={{ gap: 8 }}>
                {logoImg && <span className="logoprev"><img src={logoImg} alt={t("הלוגו שלך", "Your logo")} /></span> /* eslint-disable-line @next/next/no-img-element */}
                <label className={cx("chip small", logoImg && "on")} style={{ minHeight: 34, cursor: "pointer" }}>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pickLogo} hidden />
                  {logoImg ? t("החלפה", "Replace") : t("＋ העלאת לוגו", "＋ Upload logo")}
                </label>
                {logoImg && <button className="chip small" style={{ minHeight: 34 }} onClick={() => set({ logo: false })} aria-label={t("הסרת הלוגו", "Remove logo")}>×</button>}
              </span>
            </div>
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
            {S.user && <button className={cx("setrow", S.confirmDelete && "danger")} disabled={S.busy} onClick={deleteAccount}><span>{S.confirmDelete ? t("לחצו שוב לאישור מחיקה סופית", "Tap again to confirm permanent deletion") : t("מחיקת החשבון", "Delete account")}</span><span className="muted">{chev}</span></button>}
            <button className="setrow danger" onClick={logout}>{S.user ? t("התנתקות", "Log out") : t("יציאה ממצב אורח", "Exit guest mode")}</button>
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

  // סרגל הניווט התחתון מוצג תמיד אחרי הכניסה, חוץ ממסך הפתיחה, ההרשמה והמצלמה (מסך מלא)
  const showNav = !["open", "auth", "camera"].includes(S.screen);
  // הלשונית המודגשת: המסך עצמו, או הלשונית שהוא שייך אליה
  const navTab = TABS.some(([k]) => k === S.screen) ? S.screen
    : ["upload", "process", "versions", "vpreview", "publish", "done"].includes(S.screen) ? "home"
    : ["profiles", "about"].includes(S.screen) ? "settings" : null;
  return (
    <main className={cx("app", showNav && "withnav")} dir={en ? "ltr" : "rtl"} lang={lang}>
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
      {showNav && (
        <nav>
          {TABS.map(([k, label, icon]) => (
            <button key={k} className={cx(navTab === k && "on")} aria-current={navTab === k ? "page" : undefined} onClick={() => go(k)}>
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
