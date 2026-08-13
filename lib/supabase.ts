import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    if (process.env.NODE_ENV === "production") throw new Error("SUPABASE_NOT_CONFIGURED");
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return adminClient;
}
