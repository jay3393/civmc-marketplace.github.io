"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabaseUser } from "@/components/auth/auth-button";
import { getSupabaseBrowser } from "@/lib/supabaseClient";

export default function UsernamePrompt() {
  const user = useSupabaseUser();
  const [username, setUsername] = useState("");
  const [isSaving, startTransition] = useTransition();
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const shouldShow = useMemo(() => Boolean(user && visible), [user, visible]);

  useEffect(() => {
    async function check() {
      if (!user) return;
      const sb = getSupabaseBrowser();
      const { data }: { data: { username: string } | null } = await sb.from("profiles").select("username").eq("id", user.id).maybeSingle();
      if (data?.username) setVisible(false);
    }
    check();
  }, [user]);

  if (!shouldShow) return null;

  async function save() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const sb = getSupabaseBrowser();
        const { error } = await sb.from("profiles").update({ username: username.trim() || null } as never).eq("id", user!.id);
          if (error) {
            console.error("Failed to set username", error.message);
            setError("Could not save username. Try again.");
            return;
          }
        setSuccess("Saved.");
        setVisible(false);
        } catch (e) {
          console.error("Unexpected error saving username", (e as Error)?.message ?? String(e));
          setError("Could not save username. Try again.");
        }
    });
  }

  return (
    <div className="container mx-auto px-4">
      <Alert>
        <AlertTitle>Complete your profile</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
            <span className="text-sm">Set your Minecraft username to enable posting contracts.</span>
            <div className="flex items-center gap-2">
              <Input placeholder="Minecraft username" value={username} onChange={(e) => setUsername(e.target.value)} className="h-9 w-56" />
              <Button size="sm" onClick={save} disabled={isSaving || !username.trim()}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setVisible(false)}>Dismiss</Button>
            </div>
          </div>
          {error ? <div className="text-red-600 text-xs mt-2">{error}</div> : null}
          {success ? <div className="text-green-600 text-xs mt-2">{success}</div> : null}
        </AlertDescription>
      </Alert>
    </div>
  );
} 