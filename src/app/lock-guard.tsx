"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCK_TO_WAITLIST_FLAG } from "../../lock.config";

function isTruthy(value: string | undefined) {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export default function LockGuard() {
  const pathname = usePathname();
  const router = useRouter();

  const envLocked = isTruthy(process.env.NEXT_PUBLIC_LOCK_TO_WAITLIST);
  const codeLocked = Boolean(LOCK_TO_WAITLIST_FLAG);
  const shouldLock = envLocked || codeLocked;

  useEffect(() => {
    if (!shouldLock || !pathname) return;
    const allow = pathname.startsWith("/waitlist") || pathname.startsWith("/auth/callback") || pathname.startsWith("/_next");
    if (!allow) {
      router.replace("/waitlist");
    }
  }, [shouldLock, pathname, router]);

  return null;
} 