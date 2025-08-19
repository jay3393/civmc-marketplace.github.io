import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isTruthy(value: string | undefined | null) {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const lockToWaitlist = isTruthy(process.env.LOCK_TO_WAITLIST) || isTruthy(process.env.NEXT_PUBLIC_LOCK_TO_WAITLIST);

  if (lockToWaitlist) {
    const path = url.pathname;
    // Allow waitlist and auth callback so login works, and static assets only
    const allow =
      path.startsWith("/waitlist") ||
      path.startsWith("/auth/callback") ||
      path.startsWith("/_next") ||
      path.startsWith("/favicon") ||
      path.startsWith("/icons") ||
      path.startsWith("/images");

    if (!allow) {
      const waitlistUrl = new URL("/waitlist", req.url);
      return NextResponse.redirect(waitlistUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
}; 