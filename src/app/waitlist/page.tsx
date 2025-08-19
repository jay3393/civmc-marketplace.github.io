"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/components/auth/auth-button";

export default function WaitlistPage() {
  const user = useSupabaseUser();
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function joinWaitlist() {
    try {
      setJoining(true);
      setMessage(null);
      const sb = getSupabaseBrowser();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
      if (error) {
        setMessage("Could not start Discord sign-in. Please try again.");
      }
    } catch {
      setMessage("Could not start Discord sign-in. Please try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Blue glowing backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl"/>
        <div className="absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-3xl"/>
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"/>
      </div>

      <div className="relative h-full w-full px-4 py-6 sm:py-8 flex flex-col">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/60 backdrop-blur">
            Coming soon
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Join the CivMC Tools SaaS Waitlist</h1>
          <p className="text-muted-foreground">Early access to premium features, integrations, and collaboration tools. Be first to try it and help shape the roadmap.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {user ? (
              <button className="h-10 rounded-md border bg-green-600 text-white px-4" disabled>
                You 7re on the list 26 signed in
              </button>
            ) : (
              <button onClick={joinWaitlist} disabled={joining} className="h-10 rounded-md border bg-blue-600 text-white px-4 hover:bg-blue-500 transition">
                {joining ? "Opening Discord…" : "Join the waitlist with Discord"}
              </button>
            )}
          </div>
          {message ? <div className="text-sm text-red-600">{message}</div> : null}
          {/* <div className="text-xs text-muted-foreground">We&apos;ll never post as you or share your data. Discord is used for auth and community access.</div> */}
        </div>

        {/* Sneak peek card */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="relative w-full max-w-[min(90vw,calc(60vh*16/9))]">
            <div className="relative rounded-xl border bg-background/70 backdrop-blur shadow-xl overflow-hidden transform perspective-[1200px] rotate-x-[4deg] rotate-y-[8deg] sm:rotate-x-[6deg] sm:rotate-y-[12deg]">
              {/* Placeholder image area */}
              <div className="aspect-[16/9] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 grid place-items-center text-slate-200">
                <img src="https://iili.io/FpXJv6B.png" alt="Sneak peek image" className="w-full h-full object-cover" />
              </div>
            </div>
            {/* Subtle glow under the card */}
            <div className="pointer-events-none absolute inset-x-10 -bottom-5 h-10 bg-blue-500/30 blur-2xl"/>
          </div>
        </div>
      </div>
    </div>
  );
} 