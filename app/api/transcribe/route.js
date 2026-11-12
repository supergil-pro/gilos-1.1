// תמלול דיבור לכתוביות אוטומטיות, דרך Groq (Whisper large-v3), עם תזמון לכל מילה.
// POST multipart: file = קובץ WAV קצר (הדפדפן מחלץ את הסאונד מהסרטון), language = he / en (לא חובה)
// → { text, words: [{ word, start, end }] } בשניות מתחילת הקובץ
// דורש GROQ_API_KEY ב-Vercel (חינמי מ-console.groq.com). בלי מפתח: 503 not_configured.

export const maxDuration = 60;

const API = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3";
const MAX_BYTES = 4 * 1024 * 1024; // מתחת למגבלת הגוף של Vercel (4.5MB): כ-2 דקות של WAV מונו 16kHz
const LANGS = new Set(["he", "en"]);

export async function POST(request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: { code: "not_configured" } }, { status: 503 });

  let form;
  try { form = await request.formData(); } catch { return Response.json({ error: { code: "invalid_request" } }, { status: 400 }); }
  const file = form.get("file");
  if (!file || typeof file === "string" || !file.size) return Response.json({ error: { code: "invalid_request" } }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: { code: "too_large" } }, { status: 413 });
  const lang = String(form.get("language") || "");

  const body = new FormData();
  body.append("file", file, "audio.wav");
  body.append("model", MODEL);
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "word");
  body.append("timestamp_granularities[]", "segment");
  body.append("temperature", "0");
  if (LANGS.has(lang)) body.append("language", lang);

  try {
    const res = await fetch(API, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const headers = {};
      const retry = res.headers.get("retry-after");
      if (retry) headers["Retry-After"] = retry;
      return Response.json({ error: { code: res.status === 429 ? "rate_limited" : "upstream_error" } }, { status: res.status === 429 ? 429 : 502, headers });
    }
    // המילים מגיעות ברמה העליונה (פורמט OpenAI); ליתר ביטחון גם מתוך המקטעים
    const raw = Array.isArray(data.words) && data.words.length ? data.words : (data.segments || []).flatMap((s) => s.words || []);
    const words = raw
      .map((w) => ({ word: String(w.word || "").trim(), start: +w.start || 0, end: +w.end || 0 }))
      .filter((w) => w.word);
    return Response.json({ text: String(data.text || "").trim(), words }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "server_error" } }, { status: 502 });
  }
}
