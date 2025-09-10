import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

export function middleware(req: NextRequest) {
  console.log("[mw] hit", req.nextUrl.pathname);
  const { pathname } = req.nextUrl;

  // 1) WIP redirects (prod only unless ALLOW_WIP_ROUTES=true)
  if (shouldRedirectWip(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 2) Global waitlist lock (mirror main-shell.tsx)
  if (shouldRedirectToWaitlist()) {
    if (!isAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/waitlist", req.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/(.*)"] }; 