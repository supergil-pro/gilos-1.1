import { createClient } from "@supabase/supabase-js";

// מחיקת חשבון לבקשת המשתמש (דרישה של חנויות האפליקציות).
// רץ בשרת בלבד, כי מחיקת משתמש דורשת את המפתח הסודי. המפתח נשמר רק כמשתנה סביבה ב-Vercel.
// מחיקת המשתמש מוחקת אוטומטית גם את החשבון והפרופילים שלו (on delete cascade).
export async function POST(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return Response.json({ error: "not_configured" }, { status: 503 });

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  // מזהים את המשתמש לפי הטוקן שלו, כך שאפשר למחוק רק את החשבון של עצמך
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) return Response.json({ error: "delete_failed" }, { status: 500 });

  return Response.json({ ok: true });
}
