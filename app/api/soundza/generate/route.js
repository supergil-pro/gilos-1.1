// יצירת צליל מטקסט ב-Soundza (AI, עד 10 שניות). מבוסס על חבילת Soundza, בפורמט App Router.
// POST { prompt, duration_seconds, takes }  → 200 עם takes, או 202 שממשיכים לבדוק ב-GET ?id=
// דורש SOUNDZA_API_KEY ב-Vercel. בחינם: 250 יצירות בשבוע לחשבון. יש לסמן למשתמש שהצליל נוצר ב-AI.

const API = "https://api.soundza.com/v1";
const ID = /^[\w-]+$/;

function auth() {
  const key = process.env.SOUNDZA_API_KEY;
  return key ? { Authorization: `Bearer ${key}` } : null;
}

async function relay(res) {
  const body = await res.json().catch(() => ({}));
  const headers = {};
  const retry = res.headers.get("retry-after");
  if (retry) headers["Retry-After"] = retry;
  return Response.json(body, { status: res.status, headers });
}

export async function POST(request) {
  const headers = auth();
  if (!headers) return Response.json({ error: { code: "not_configured" } }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim().slice(0, 300);
  if (!prompt) return Response.json({ error: { code: "invalid_request", message: "prompt is required" } }, { status: 400 });
  const payload = { prompt };
  if (body.duration_seconds) payload.duration_seconds = Math.min(10, Math.max(0.5, Number(body.duration_seconds) || 3));
  if (body.takes) payload.takes = Math.min(3, Math.max(1, parseInt(body.takes, 10) || 1));
  try {
    return relay(await fetch(`${API}/generations`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(payload) }));
  } catch {
    return Response.json({ error: { code: "server_error" } }, { status: 502 });
  }
}

export async function GET(request) {
  const headers = auth();
  if (!headers) return Response.json({ error: { code: "not_configured" } }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!ID.test(id)) return Response.json({ error: { code: "invalid_request" } }, { status: 400 });
  try {
    return relay(await fetch(`${API}/generations/${id}`, { headers }));
  } catch {
    return Response.json({ error: { code: "server_error" } }, { status: 502 });
  }
}
