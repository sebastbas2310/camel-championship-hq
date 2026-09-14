import { supabase as lovableSupabase } from "@/integrations/supabase/client";

/**
 * Lovable Cloud-managed Supabase client.
 * The publishable key is injected by the platform and is safe to ship in the browser.
 */
export const supabase = lovableSupabase;

/** Returns the current access token, refreshing it when needed. */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
