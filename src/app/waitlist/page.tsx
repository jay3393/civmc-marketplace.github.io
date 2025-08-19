"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/components/auth/auth-button";

export default function WaitlistPage() {
  const user = useSupabaseUser();
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const featureImages = [
        "https://iili.io/FyH8VRt.png",
        "https://iili.io/FyH8WOX.png",
        "https://iili.io/FyH8MJI.png",
        "https://iili.io/FyH8EUN.png",
        "https://iili.io/FyH8Nsf.png"
  ];
  const [idx, setIdx] = useState(0);

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

  function prev() {
    setIdx((i) => (i - 1 + featureImages.length) % featureImages.length);
  }
  function next() {
    setIdx((i) => (i + 1) % featureImages.length);
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
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Join the CivMC Tools Waitlist</h1>
          <p className="text-muted-foreground">Early access to premium features, integrations, and collaboration tools. Be first to try it and help shape the roadmap.</p>
          <div className="flex items-center justify-center gap-3 pt-2 pb-8">
            {user ? (
              <button className="h-10 rounded-md border bg-green-600 text-white px-4" disabled>
                You&apos;re on the list!
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

        {/* Carousel */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="relative w-full max-w-[min(90vw,calc(60vh*16/9))]">
            <div className="relative rounded-xl border bg-background/70 backdrop-blur shadow-xl overflow-hidden transform perspective-[1200px] ">
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/0 pointer-events-none"/>
              <div className="aspect-[16/9] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 grid place-items-center text-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featureImages[idx]} alt="Feature" className="w-full h-full object-cover transition-opacity duration-300" />
              </div>
              {/* Prev/Next */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-between p-2">
                <button onClick={prev} className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/80 backdrop-blur shadow hover:bg-white transition" aria-label="Previous">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>
                <button onClick={next} className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white/80 backdrop-blur shadow hover:bg-white transition" aria-label="Next">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
                </button>
              </div>
            </div>
            {/* Dots */}
            <div className="mt-3 flex items-center justify-center gap-2">
              {featureImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2.5 w-2.5 rounded-full border transition ${i === idx ? "bg-blue-600 border-blue-600" : "bg-white/70 border-slate-200"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 