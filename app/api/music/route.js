// חיפוש מוזיקה ממקורות פתוחים, דרך השרת שלנו (כדי לשמור מפתחות בצד השרת ולשמור תוצאות במטמון).
// מחזיר רק רישיונות שמותרים לשימוש מסחרי ולעריכה: CC0, נחלת הכלל, ו-CC BY (דורש קרדיט ליוצר).
//   Soundza    — המקור הראשי. בלי מפתח: חיפוש בלבד, בלי האזנה, עד 3 עמודים. עם SOUNDZA_API_KEY ב-Vercel: הכול
//   Openverse  — בלי מפתח (מוגבל ל-20 בקשות בדקה ו-200 ביום), כולל שירים מלאים מ-Jamendo
//   Freesound  — דורש מפתח: FREESOUND_API_KEY במשתני הסביבה ב-Vercel

const UA = "GILOS/1.1 (+https://gilos-1-1.vercel.app)";
const LICENSES = {
  cc0: { name: "CC0", credit: false }, pdm: { name: "Public domain", credit: false }, by: { name: "CC BY", credit: true },
  "Creative Commons 0": { name: "CC0", credit: false }, Attribution: { name: "CC BY", credit: true },
};

async function soundza(q, page, type) {
  const key = process.env.SOUNDZA_API_KEY;
  const url = new URL("https://api.soundza.com/v1/sounds/search");
  url.search = new URLSearchParams({ q, type: type || "music", page: String(page), per_page: "20" }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA, ...(key ? { Authorization: `Bearer ${key}` } : {}) }, next: { revalidate: 3600 } });
  if (res.status === 401 || res.status === 403) return { error: "bad_key" };
  if (res.status === 429) return { error: "rate_limited" };
  if (!res.ok) return { error: "source_failed" };
  const data = await res.json();
  // preview_files הוא מערך של { type, bitrate, link }. בוחרים MP3, באיכות הגבוהה ביותר
  const previewOf = (s) => {
    const files = Array.isArray(s.preview_files) ? s.preview_files.filter((f) => f && typeof f.link === "string") : [];
    const mp3 = files.filter((f) => !f.type || /mpeg|mp3/i.test(f.type)).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return (mp3[0] || files[0])?.link || (typeof s.listen_url === "string" ? s.listen_url : null);
  };
  return {
    keyless: !key, searchId: data.search_id || null, hasMore: !!data.next_page,
    total: data.total_results ?? (data.sounds || []).length,
    items: (data.sounds || []).map((s) => ({
      id: `sz-${s.id}`, source: "soundza", provider: "soundza", soundId: s.id,
      title: s.title || "Untitled", creator: s.creator?.name || "Soundza",
      url: typeof previewOf(s) === "string" ? previewOf(s) : null, // קובץ האזנה (רק עם מפתח)
      duration: s.duration ? Math.round(s.duration) : null, bpm: s.bpm || null,
      license: "Soundza", credit: false, licenseUrl: s.license?.url, link: s.url,
      ai: s.ai_content === "ai" || s.ai_content === "some_ai", // צלילים שנוצרו ב-AI מסומנים למשתמש
      tags: (s.tags || []).slice(0, 6), attribution: s.attribution || "",
    })),
  };
}

async function openverse(q, page) {
  const url = new URL("https://api.openverse.org/v1/audio/");
  url.search = new URLSearchParams({ q, license: "cc0,by,pdm", category: "music", mature: "false", page_size: "20", page: String(page) }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA }, next: { revalidate: 3600 } });
  if (res.status === 429) return { error: "rate_limited" };
  if (!res.ok) return { error: "source_failed" };
  const data = await res.json();
  return {
    total: data.result_count || 0,
    items: (data.results || []).filter((r) => r.url && LICENSES[r.license]).map((r) => ({
      id: `ov-${r.id}`, source: "openverse", provider: r.source,
      title: r.title || "Untitled", creator: r.creator || "", url: r.url,
      duration: r.duration ? Math.round(r.duration / 1000) : null,
      license: LICENSES[r.license].name, credit: LICENSES[r.license].credit,
      licenseUrl: r.license_url, link: r.foreign_landing_url,
      tags: [...(r.genres || []), ...(r.tags || []).map((t) => t.name)].filter(Boolean).slice(0, 6),
      attribution: r.attribution || "",
    })),
  };
}

async function freesound(q, page) {
  const key = process.env.FREESOUND_API_KEY;
  if (!key) return { error: "not_configured" };
  const url = new URL("https://freesound.org/apiv2/search/");
  url.search = new URLSearchParams({
    query: q, page: String(page), page_size: "20",
    filter: 'license:("Creative Commons 0" OR "Attribution") duration:[5 TO 600]',
    fields: "id,name,username,license,duration,tags,previews,url",
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": UA, Authorization: `Token ${key}` }, next: { revalidate: 3600 } });
  if (res.status === 401 || res.status === 403) return { error: "bad_key" };
  if (res.status === 429) return { error: "rate_limited" };
  if (!res.ok) return { error: "source_failed" };
  const data = await res.json();
  return {
    total: data.count || 0,
    items: (data.results || []).map((r) => {
      const lic = /zero|publicdomain/i.test(r.license) ? LICENSES["Creative Commons 0"] : LICENSES.Attribution;
      return {
        id: `fs-${r.id}`, source: "freesound", provider: "freesound",
        title: r.name, creator: r.username, url: r.previews?.["preview-hq-mp3"],
        duration: r.duration ? Math.round(r.duration) : null,
        license: lic.name, credit: lic.credit, licenseUrl: r.license, link: r.url,
        tags: (r.tags || []).slice(0, 6),
        attribution: `"${r.name}" by ${r.username} (freesound.org), ${lic.name}`,
      };
    }).filter((r) => r.url),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 100);
  const source = ["freesound", "openverse"].includes(searchParams.get("source")) ? searchParams.get("source") : "soundza";
  const page = Math.min(Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1), 20);
  if (!q) return Response.json({ error: "empty_query" }, { status: 400 });
  try {
    const out = source === "freesound" ? await freesound(q, page) : source === "openverse" ? await openverse(q, page) : await soundza(q, page, searchParams.get("type"));
    const status = out.error === "not_configured" ? 503 : out.error === "rate_limited" ? 429 : out.error ? 502 : 200;
    return Response.json({ source, ...out }, { status, headers: status === 200 ? { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } : {} });
  } catch {
    return Response.json({ source, error: "source_failed" }, { status: 502 });
  }
}
