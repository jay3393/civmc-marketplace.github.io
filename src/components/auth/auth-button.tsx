"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { log } from "../../lib/log";

export function useSupabaseUser() {
  const [user, setUser] = useState<null | { id: string; user_metadata?: Record<string, unknown> }>(null);
  useEffect(() => {
    const sb = getSupabaseBrowser();
    sb.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);
  return user;
}

type DiscordUserMetadata = {
  user_name?: string;
  avatar_url?: string;
  custom_claims?: {
    global_name?: string;
  };
};

export default function AuthButton() {
  const [loading, setLoading] = useState(false);
  const user = useSupabaseUser();

  const meta = (user?.user_metadata ?? {}) as DiscordUserMetadata;
  const username = meta.custom_claims?.global_name ?? null;
  const avatarUrl = meta.avatar_url ?? null;

  async function signInWithDiscord() {
    try {
      setLoading(true);
      const sb = getSupabaseBrowser();
      const redirectTo = typeof window !== "undefined" ? `${window.location.href}` : undefined;
      const { error } = await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo, scopes: "identify,guilds" } });
      if (error) {
        log("error", "Auth error", { error }, ["error"]);
        setLoading(false);
      }
    } catch (e) {
      log("error", "Unexpected auth error", { error: e }, ["error"]);
      setLoading(false);
    }
  }

  async function signOut() {
    const sb = getSupabaseBrowser();
    await sb.auth.signOut();
    if (typeof window !== "undefined") window.location.reload();
  }

  if (!username) {
    return (
      <button
        onClick={signInWithDiscord}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#5865F2] hover:bg-[#4752C4] text-white h-10 px-4 text-sm font-medium shadow transition"
        aria-label="Login with Discord"
      >
        {/* Discord logo */}
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
          <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.211.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.398-.405-.874-.617-1.249a.077.077 0 00-.079-.037 19.736 19.736 0 00-4.885 1.515.07.07 0 00-.032.027C.533 9.045-.32 13.58.099 18.057a.082.082 0 00.031.057c2.052 1.506 4.041 2.422 5.993 3.029a.077.077 0 00.084-.027c.461-.63.873-1.295 1.226-1.994a.074.074 0 00-.041-.102c-.652-.247-1.27-.549-1.861-.892a.075.075 0 01-.007-.124c.125-.094.25-.192.368-.291a.074.074 0 01.077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.118.099.243.197.368.291a.075.075 0 01-.006.124c-.591.343-1.209.645-1.861.892a.074.074 0 00-.041.103c.36.698.772 1.362 1.226 1.993a.076.076 0 00.084.028c1.953-.607 3.942-1.523 5.993-3.03a.082.082 0 00.031-.056c.5-5.251-.838-9.737-3.548-13.661a.061.061 0 00-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.175 1.095 2.157 2.419 0 1.334-.955 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.175 1.095 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
        </svg>
        <span>{loading ? "Redirecting…" : "Login with Discord"}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="avatar" className="h-6 w-6 rounded-full" />
      ) : null}
      <span className="text-xs text-muted-foreground hidden sm:inline" title={username}>{username}</span>
      <Button variant="outline" onClick={signOut} className="h-8 px-3 text-xs">Sign out</Button>
    </div>
  );
}
