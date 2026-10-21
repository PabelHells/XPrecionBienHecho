import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL || "";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const configured =
  /^https?:\/\//.test(url) &&
  !url.includes("YOUR_PROJECT") &&
  key.length > 20 &&
  !key.includes("YOUR_PUBLIC");
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
export function db() {
  if (!supabase)
    throw new Error("La conexión con la clínica todavía no está configurada.");
  return supabase;
}
export const authRedirect = () =>
  `${(import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin).replace(/\/$/, "")}/`;
