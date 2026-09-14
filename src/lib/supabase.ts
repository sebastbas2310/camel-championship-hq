import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Auth project used by the Spring Boot backend to validate JWTs.
 * The publishable key is safe to ship in the browser.
 */
export const SUPABASE_URL =
  (import.meta.env['VITE_SUPABASE_URL'] as string | undefined) ??
  "https://mrftaeijsdhiulsxqyme.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined) ??
  "sb_publishable_je57m_d8e05dJ2aNtfhsdA_h1ypuMZ-";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    autoRefreshToken: true,
    detectSessionInUrl: typeof window !== "undefined",
    flowType: "pkce",
  },
});

/** Returns the current access token, refreshing it when needed. */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
