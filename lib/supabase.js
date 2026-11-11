import { createClient } from "@supabase/supabase-js";

// חיבור ל-Supabase מהדפדפן. המפתח הציבורי (publishable) בטוח לחשיפה בדפדפן;
// ההגנה על הנתונים היא בחוקי ה-RLS שבקובץ supabase/schema.sql.
// כשהמשתנים לא מוגדרים, supabase הוא null והאפליקציה ממשיכה לעבוד במצב הדגמה מקומי.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;
