"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const sb = getSupabaseBrowser();
    let timeout: ReturnType<typeof setTimeout> | null = null;
    // allow auth client to handle the URL fragment
    sb.auth.getSession().then(() => {
      timeout = setTimeout(() => router.replace("/"), 300);
    });
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [router]);

  return <div className="container mx-auto px-4 py-16">Completing sign in…</div>;
} 