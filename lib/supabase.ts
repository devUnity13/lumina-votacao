import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = serviceRoleKey || secretKey;
  if (!url || !apiKey) {
    if (process.env.NODE_ENV === "production") throw new Error("SUPABASE_NOT_CONFIGURED");
    return null;
  }
  if (!adminClient) {
    const serverFetch: typeof fetch = async (input, init = {}) => {
      const headers = new Headers(init.headers);
      const authorization = headers.get("authorization");

      // As chaves modernas sb_secret_ são opacas, não tokens JWT/JWS.
      // O Supabase deve recebê-las em `apikey`, nunca como `Bearer`.
      if (apiKey.startsWith("sb_secret_") && authorization === `Bearer ${apiKey}`) {
        headers.delete("authorization");
      }

      return fetch(input, { ...init, headers });
    };

    adminClient = createClient(url, apiKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: serverFetch },
    });
  }
  return adminClient;
}
