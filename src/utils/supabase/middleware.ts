import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server'

export async function createSupabaseMiddlewareClient(req: NextRequest, res: NextResponse) {
    const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
          flowType: 'pkce',
          storageKey: 'civmc-auth-v3',
        },
        cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {
                // The `setAll` method was called from a Server Component.
                // This can be ignored if you have middleware refreshing
                // user sessions.
              }
            },
        },
    }
  )
}