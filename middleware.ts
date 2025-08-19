import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { LOCK_TO_WAITLIST_FLAG, LOCK_INCLUDE_LOCAL } from "./lock.config";

function isTruthy(value: string | undefined | null) {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

function shouldLock(req: NextRequest) {
  const envLocked = isTruthy(process.env.LOCK_TO_WAITLIST) || isTruthy(process.env.NEXT_PUBLIC_LOCK_TO_WAITLIST);
  const codeLocked = Boolean(LOCK_TO_WAITLIST_FLAG);
  if (!envLocked && !codeLocked) return false;

  const hostname = req.nextUrl.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocalhost && !Boolean(LOCK_INCLUDE_LOCAL) && !isTruthy(process.env.LOCK_INCLUDE_LOCAL)) {
    return false;
  }
  return true;
}

export function middleware(req: NextRequest) {
  if (!shouldLock(req)) return NextResponse.next();

  const path = req.nextUrl.pathname;
  const allow =
    path.startsWith("/waitlist") ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/icons") ||
    path.startsWith("/images") ||
    path.startsWith("/api/");

    console.log("path", path);
    console.log("allow", allow);

  if (!allow) {
    const url = new URL("/waitlist", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
}; 