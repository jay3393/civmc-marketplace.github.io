import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "./utils/supabase/middleware";

const LOCK_TO_WAITLIST_FLAG : boolean = process.env.NEXT_PUBLIC_LOCK_TO_WAITLIST === "true";
const ALLOW_WIP_ROUTES : boolean = process.env.NEXT_PUBLIC_ALLOW_WIP_ROUTES === "false";

function shouldRedirectToWaitlist() {
  return LOCK_TO_WAITLIST_FLAG;
}

function isAllowedPath(pathname: string) {
  const isWaitlistRoot = pathname === "/waitlist" || pathname === "/waitlist/";
  return (
    isWaitlistRoot ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/api/")
  );
}

function shouldRedirectWip(pathname: string) {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd || !ALLOW_WIP_ROUTES) return false;
  return (
    pathname === "/events" || pathname.startsWith("/events/") ||
    pathname === "/routes" || pathname.startsWith("/routes/")
  );
}

function isAlphaGated(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith('/marketplace') ||
    pathname.startsWith('/shop') ||
    pathname.startsWith('/my-shops') ||
    pathname.startsWith('/contracts') ||
    pathname.startsWith('/settlements') || 
    pathname.startsWith('/claims')
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0) Never redirect the waitlist itself (prevents loops)
  if (pathname === "/waitlist" || pathname.startsWith("/waitlist/")) {
    return NextResponse.next();
  }

  // 1) WIP redirects (prod only unless ALLOW_WIP_ROUTES=true)
  if (shouldRedirectWip(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 2) Alpha gating (only for gated paths)
  if (isAlphaGated(pathname)) {
    const res = NextResponse.next();
    const supabase = await createSupabaseMiddlewareClient(req, res);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('alpha_testers').select('*').eq('user_id', user.id).maybeSingle();
      if (!data) {
        return NextResponse.redirect(new URL("/waitlist", req.url));
      }
      return res;
    }
  }

  // 3) Global waitlist lock (mirror main-shell.tsx)
  if (shouldRedirectToWaitlist()) {
    if (!isAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/waitlist", req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/(.*)"] }; 