"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { LOCK_TO_WAITLIST_FLAG } from "../../lock.config";

function isTruthy(value: string | undefined) {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export default function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isWaitlistRoot = pathname === "/waitlist" || pathname === "/waitlist/";

  const shouldLock = useMemo(() => {
    const envLocked = isTruthy(process.env.NEXT_PUBLIC_LOCK_TO_WAITLIST);
    const codeLocked = Boolean(LOCK_TO_WAITLIST_FLAG);
    return envLocked || codeLocked;
  }, []);

  const isAllowed = useMemo(() => {
    if (!pathname) return true;
    return (
      isWaitlistRoot ||
      pathname.startsWith("/auth/callback") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/icons") ||
      pathname.startsWith("/images") ||
      pathname.startsWith("/api/")
    );
  }, [pathname, isWaitlistRoot]);

  useEffect(() => {
    if (shouldLock && !isAllowed && pathname) {
      router.replace("/waitlist");
    }
  }, [shouldLock, isAllowed, pathname, router]);

  if (shouldLock && !isAllowed) {
    return null;
  }

  if (isWaitlistRoot) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <main className="h-full w-full p-0 m-0">{children}</main>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"/>
        <div className="absolute top-1/3 -right-24 h-[22rem] w-[22rem] rounded-full bg-emerald-500/20 blur-3xl"/>
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"/>
      </div>
      {children}
    </main>
  );
} 