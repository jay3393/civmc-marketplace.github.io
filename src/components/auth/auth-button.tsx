"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

export function useSupabaseUser() {
  const [user, setUser] = useState<null | { id: string; email?: string | null; user_metadata?: Record<string, unknown> }>(null);
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
};

export default function AuthButton() {
  const [loading, setLoading] = useState(false);
  const user = useSupabaseUser();

  const meta = (user?.user_metadata ?? {}) as DiscordUserMetadata;
  const emailOrUsername = (user?.email as string | undefined) ?? meta.user_name ?? null;
  const avatarUrl = meta.avatar_url ?? null;

  async function signInWithDiscord() {
    try {
      setLoading(true);
      const sb = getSupabaseBrowser();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
      if (error) {
        console.error("Auth error", error);
        setLoading(false);
      }
    } catch (e) {
      console.error("Unexpected auth error", e);
      setLoading(false);
    }
  }

  async function signOut() {
    const sb = getSupabaseBrowser();
    await sb.auth.signOut();
    if (typeof window !== "undefined") window.location.reload();
  }

  if (!emailOrUsername) {
    return (
      <Button onClick={signInWithDiscord} disabled={loading} className="h-8 px-3 text-xs">
        {loading ? "Redirecting…" : "Login with Discord"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="avatar" className="h-6 w-6 rounded-full" />
      ) : null}
      <span className="text-xs text-muted-foreground hidden sm:inline" title={emailOrUsername}>{emailOrUsername}</span>
      <Button variant="outline" onClick={signOut} className="h-8 px-3 text-xs">Sign out</Button>
    </div>
  );
} 