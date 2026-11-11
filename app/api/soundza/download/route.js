// קישור לקובץ מלא של צליל ב-Soundza (תקף 5 דקות). מבוסס על חבילת Soundza, בפורמט App Router.
// GET ?id=<מזהה הצליל>&search_id=<מהחיפוש> → { url, expires_in }
// ישמש בשלב העריכה: מורידים את הקובץ מיד ושומרים אותו (למשל ב-Supabase Storage), לא את הקישור.
// TODO(שלב 6): להוריד בשרת, לשמור לפי id, ולבדוק פעם בחודש את /v1/removals

const API = "https://api.soundza.com/v1";
const ID = /^[\w-]+$/;

export async function GET(request) {
  const key = process.env.SOUNDZA_API_KEY;
  if (!key) return Response.json({ error: { code: "not_configured" } }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id") || "", searchId = params.get("search_id");
  if (!ID.test(id)) return Response.json({ error: { code: "invalid_request" } }, { status: 400 });
  const qs = searchId ? `?search_id=${encodeURIComponent(searchId)}` : "";
  try {
    const res = await fetch(`${API}/sounds/${id}/file${qs}`, { headers: { Authorization: `Bearer ${key}` }, redirect: "manual" });
    const url = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && url) return Response.json({ url, expires_in: 300 }, { headers: { "Cache-Control": "no-store" } });
    return Response.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return Response.json({ error: { code: "server_error" } }, { status: 502 });
  }
}
