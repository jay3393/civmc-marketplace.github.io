"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/components/auth/auth-button";

export default function WaitlistPage() {
  const user = useSupabaseUser();
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const featureImages = [
        "/images/waitlist_feature1.png",
        "/images/waitlist_feature2.png",
        "/images/waitlist_feature3.png",
        "/images/waitlist_feature4.png",
        "/images/waitlist_feature5.png",
  ];
  const [idx, setIdx] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchWaitlistCount() {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb.from("profiles").select("*");
      if (error) {
        console.error("Error fetching waitlist count:", error);
        return;
      }
      setWaitlistCount(data.length);
    }
    fetchWaitlistCount();
  }, []);

  async function joinWaitlist() {
    try {
      setJoining(true);
      setMessage(null);
      const sb = getSupabaseBrowser();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo, scopes: "identify" } });
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
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Join the CivHub Waitlist</h1>
          <p className="text-muted-foreground">Early access to premium features, integrations, and collaboration tools. Be first to try it and help shape the roadmap.</p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 pb-8">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/60 backdrop-blur">
              <span className="font-medium">Coming soon</span>
              {waitlistCount !== null ? (
                <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white/70 backdrop-blur text-slate-900">
                  <span className="relative inline-flex items-center justify-center">
                    <span className="absolute inline-flex h-3.5 w-3.5 animate-ping rounded-full bg-emerald-400/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="font-medium">{waitlistCount.toLocaleString()}</span>
                  <span className="text-slate-600">people on the waitlist</span>
                </div>
              ) : null}    
            </div>
            {user ? (
              <button className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-white shadow transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" disabled>
                <span className="font-medium">You&apos;re on the list!</span>
              </button>
            ) : (
              <button onClick={joinWaitlist} disabled={joining} className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-white shadow-lg transition hover:bg-blue-500 pointer-events-auto hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 opacity-90" aria-hidden>
                  <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.398-.405-.874-.617-1.249a.077.077 0 00-.079-.037 19.736 19.736 0 00-4.885 1.515.07.07 0 00-.032.027C.533 9.045-.32 13.58.099 18.057a.082.082 0 00.031.057c2.052 1.506 4.041 2.422 5.993 3.029a.077.077 0 00.084-.027c.461-.63.873-1.295 1.226-1.994a.074.074 0 00-.041-.102c-.652-.247-1.27-.549-1.861-.892a.075.075 0 01-.007-.124c.125-.094.25-.192.368-.291a.074.074 0 01.077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.118.099.243.197.368.291a.075.075 0 01-.006.124c-.591.343-1.209.645-1.861.892a.074.074 0 00-.041.103c.36.698.772 1.362 1.226 1.993a.076.076 0 00.084.028c1.953-.607 3.942-1.523 5.993-3.03a.082.082 0 00.031-.056c.5-5.251-.838-9.737-3.548-13.661a.061.061 0 00-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.175 1.095 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.175 1.095 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                </svg>
                <span className="font-semibold">Join the waitlist with Discord</span>
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
            </div>
            {/* Prev/Next (inside the card) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-between p-3">
              <button onClick={prev} className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/90 text-slate-900 shadow-lg hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              </button>
              <button onClick={next} className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/90 text-slate-900 shadow-lg hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Next">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
              </button>
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