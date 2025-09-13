import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function log(msg: string, extra: Record<string, unknown> = {}, allow: string[] = []) {
  const base = { t: new Date().toISOString(), msg };
  const safe: Record<string, unknown> = {};
  for (const key of allow) {
    if (Object.prototype.hasOwnProperty.call(extra, key)) {
      safe[key] = extra[key];
    }
  }
  console.log({ ...base, ...safe });
}

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
  log("[mw] hit", { path: req.nextUrl.pathname }, ["path"]);
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