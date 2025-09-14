import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

const globalForSupabase = globalThis as unknown as {
  __supabase?: SupabaseClient;
};

export function getSupabaseBrowser(): SupabaseClient {
  if (globalForSupabase.__supabase) return globalForSupabase.__supabase;
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: "civmc-auth-v3",
          flowType: "pkce",
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    ) as unknown as SupabaseClient;
  }
  if (process.env.NODE_ENV !== "production") {
    globalForSupabase.__supabase = client;
  }
  return client!;
} 