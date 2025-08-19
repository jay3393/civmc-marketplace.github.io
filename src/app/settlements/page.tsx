"use client";

import { useMemo, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

type SettlementRow = {
  settlement_name: string;
  nation_name: string | null;
  x: number | string | null;
  z: number | string | null;
  discord: string | null;
  description?: string | null;
  member_count?: number | null;
  active?: boolean | null;
  tags?: string[] | null;
  size?: "small" | "medium" | "large" | null;
};

const TAGS = [
  { key: "newbie", label: "Newbie friendly" },
  { key: "rail", label: "Rail station" },
  { key: "market", label: "Market/Trade" },
  { key: "buildings", label: "Buildings" },
  { key: "pvp", label: "PvP" },
] as const;

const SIZES = ["small", "medium", "large"] as const;

async function fetchSettlements(): Promise<SettlementRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("settlements_readonly")
    .select("*")
    .order("settlement_name", { ascending: true });
  if (error) throw new Error("Failed to load settlements");
  return (data ?? []) as SettlementRow[];
}

async function fetchNations(): Promise<{ id: string | number; nation_name: string }[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from("nations").select("id,nation_name").order("nation_name");
  if (error) return [];
  return (data ?? []) as { id: string | number; nation_name: string }[];
}

async function getRequestor() {
  const sb = getSupabaseBrowser();
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const profileId = user.id as string;
  // Try to read username from profiles; fallback to discord metadata
  let username: string | null = null;
  const { data: profile } = await sb.from("profiles").select("username").eq("id", profileId).maybeSingle();
  if (profile?.username) username = profile.username as string;
  const meta = (user.user_metadata ?? {}) as { user_name?: string; global_name?: string };
  const discordUsername = meta.global_name || meta.user_name || null;
  return { profileId, username, discordUsername };
}

function toNumber(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return val;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function normalizeDiscord(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://discord.gg/${url}`;
}

export default function SettlementsPage() {
  const [q, setQ] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [mode, setMode] = useState<"chooser" | "nation" | "settlement">("chooser");

  const { data, isLoading, isError } = useQuery({ queryKey: ["settlements"], queryFn: fetchSettlements });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      const matchesQuery =
        !query ||
        (row.settlement_name ?? "").toLowerCase().includes(query) ||
        (row.nation_name ?? "").toLowerCase().includes(query);

      const rowTags = (row.tags ?? []).map((t) => t.toLowerCase());
      const rowSize = (row.size ?? "").toString().toLowerCase();

      const matchesTags =
        selectedTags.length === 0 || selectedTags.every((t) => rowTags.includes(t));

      const matchesSize =
        selectedSizes.length === 0 || (rowSize && selectedSizes.includes(rowSize));

      return matchesQuery && matchesTags && matchesSize;
    });
  }, [data, q, selectedTags, selectedSizes]);

  function toggleTag(key: string) {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleSize(val: string) {
    setSelectedSizes((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="flex w-full max-w-xl items-center gap-2">
          <Input
            placeholder="Search nations or settlements"
            className="h-10 placeholder:text-muted-foreground"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button className="h-10" onClick={() => setQ((prev) => prev.trim())}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-center text-sm">
        Don&apos;t see your nation/settlement?{' '}
        <button
          className="underline text-blue-600 hover:text-blue-700"
          onClick={() => {
            setMode("chooser");
            setRegisterOpen(true);
          }}
        >
          Click here to register your own.
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {TAGS.map((t) => (
          <button
            key={t.key}
            className={`h-8 px-3 rounded-md border text-sm ${selectedTags.includes(t.key) ? "bg-muted" : "bg-background"}`}
            onClick={() => toggleTag(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {SIZES.map((s) => (
          <button
            key={s}
            className={`h-8 px-3 rounded-md border text-sm capitalize ${selectedSizes.includes(s) ? "bg-muted" : "bg-background"}`}
            onClick={() => toggleSize(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading settlements…</div>
      ) : isError ? (
        <div className="text-sm text-red-600">Failed to load settlements.</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center">No results found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => {
            const x = toNumber(row.x);
            const z = toNumber(row.z);
            const discordUrl = normalizeDiscord(row.discord);
            const active = row.active ?? null;
            const memberCount = row.member_count ?? null;
            const tags = row.tags ?? [];
            const nation = row.nation_name ?? "Unknown";
            return (
              <div key={`${row.settlement_name}-${x}-${z}`} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{nation}</div>
                    <div className="text-lg font-semibold leading-tight">{row.settlement_name}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {memberCount !== null ? <span>{memberCount} members</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${active === null ? "bg-muted-foreground/40" : active ? "bg-green-500" : "bg-red-500"}`}
                      />
                      {active === null ? "Unknown" : active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {row.description ? (
                  <div className="text-sm text-foreground/90 whitespace-pre-wrap">{row.description}</div>
                ) : null}

                <div className="text-xs text-muted-foreground">Coords: {x !== null && z !== null ? `(${x}, ${z})` : "-"}</div>

                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="pt-2">
                  {discordUrl ? (
                    <a
                      href={discordUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-3 rounded-md border inline-flex items-center text-sm"
                    >
                      Join {nation} Discord
                    </a>
                  ) : (
                    <button className="h-8 px-3 rounded-md border opacity-60 cursor-not-allowed text-sm" title="No Discord provided">
                      Join {nation} Discord
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} mode={mode} setMode={setMode} />
    </div>
  );
}

function RegisterModal({ open, onOpenChange, mode, setMode }: { open: boolean; onOpenChange: (v: boolean) => void; mode: "chooser" | "nation" | "settlement"; setMode: (m: "chooser" | "nation" | "settlement") => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {mode === "chooser" ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Register your community</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button className="h-10" onClick={() => setMode("nation")}>Register Nation</Button>
              <Button className="h-10" onClick={() => setMode("settlement")}>Register Settlement</Button>
            </div>
          </div>
        ) : mode === "nation" ? (
          <RegisterNation onDone={() => onOpenChange(false)} onBack={() => setMode("chooser")} />
        ) : (
          <RegisterSettlement onDone={() => onOpenChange(false)} onBack={() => setMode("chooser")} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RegisterNation({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [x, setX] = useState("");
  const [z, setZ] = useState("");
  const [description, setDescription] = useState("");
  const [discord, setDiscord] = useState("");
  const [flagUrl, setFlagUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authAlert, setAuthAlert] = useState(false);

  async function signInWithDiscord() {
    const sb = getSupabaseBrowser();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
  }

  async function submit() {
    setError(null);
    setSuccess(null);
    setAuthAlert(false);
    startTransition(async () => {
      try {
        const req = await getRequestor();
        if (!req) {
          setAuthAlert(true);
          return;
        }
        const sb = getSupabaseBrowser();
        const payload = {
          kind: "nation" as const,
          data: {
            nation_name: name.trim(),
            description: description.trim() || null,
            x: x.trim() || null,
            z: z.trim() || null,
            discord: discord.trim() || null,
            flag_url: flagUrl.trim() || null,
          },
          requestor: req,
        };
        const { error: fxError } = await sb.functions.invoke("submit-application", { body: payload });
        if (fxError) {
          console.warn("submit-application nation failed", fxError);
          setError("Failed to submit application. Please try again later.");
          return;
        }
        setSuccess("Application submitted for review.");
        onDone();
      } catch (e) {
        console.warn("Unexpected submit-application error (nation)", e);
        setError("Failed to submit application. Please try again later.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>Register Nation</DialogTitle>
      </DialogHeader>
      {authAlert ? (
        <Alert>
          <AlertTitle>Sign in required</AlertTitle>
          <AlertDescription>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">Please log in with Discord to register a nation.</span>
              <Button size="sm" onClick={signInWithDiscord}>Login with Discord</Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div> : null}
      {success ? <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">{success}</div> : null}
      <div className="grid gap-2">
        <Label htmlFor="nation-name">Nation name</Label>
        <Input id="nation-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="nx">X</Label>
          <Input id="nx" value={x} onChange={(e) => setX(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nz">Z</Label>
          <Input id="nz" value={z} onChange={(e) => setZ(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-2 max-h-40 overflow-y-auto">
        <Label htmlFor="nd">Description</Label>
        <Textarea id="nd" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ndu">Discord URL</Label>
        <Input id="ndu" value={discord} onChange={(e) => setDiscord(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="flag">Nation flag image URL</Label>
        <Input id="flag" value={flagUrl} onChange={(e) => setFlagUrl(e.target.value)} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={submit} disabled={isPending || !name.trim()}>Submit</Button>
      </div>
    </div>
  );
}

function RegisterSettlement({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [nationOpen, setNationOpen] = useState(false);
  const [nationId, setNationId] = useState<string | number | null>(null);
  const [nationName, setNationName] = useState("");
  const [settlementName, setSettlementName] = useState("");
  const [x, setX] = useState("");
  const [z, setZ] = useState("");
  const [discord, setDiscord] = useState("");
  const [description, setDescription] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authAlert, setAuthAlert] = useState(false);

  const { data: nations } = useQuery({ queryKey: ["nations"], queryFn: fetchNations });

  function toggleTag(key: string) {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function calculatedSize(): "small" | "medium" | "large" | null {
    const n = Number(memberCount);
    if (!Number.isFinite(n)) return null;
    if (n < 30) return "small";
    if (n < 100) return "medium";
    return "large";
  }

  async function signInWithDiscord() {
    const sb = getSupabaseBrowser();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
  }

  async function submit() {
    setError(null);
    setSuccess(null);
    setAuthAlert(false);
    startTransition(async () => {
      try {
        const req = await getRequestor();
        if (!req) {
          setAuthAlert(true);
          return;
        }
        const sb = getSupabaseBrowser();
        const payload = {
          kind: "settlement" as const,
          data: {
            settlement_name: settlementName.trim(),
            nation_name: nationName.trim() || null,
            x: x.trim() || null,
            z: z.trim() || null,
            discord: discord.trim() || null,
            description: description.trim() || null,
            member_count: memberCount ? Number(memberCount) : null,
            tags: selectedTags.length ? selectedTags : null,
            size: calculatedSize(),
          },
          requestor: req,
        };
        const { error: fxError } = await sb.functions.invoke("submit-application", { body: payload });
        if (fxError) {
          console.warn("submit-application settlement failed", fxError);
          setError("Failed to submit application. Please try again later.");
          return;
        }
        setSuccess("Application submitted for review.");
        onDone();
      } catch (e) {
        console.warn("Unexpected submit-application error (settlement)", e);
        setError("Failed to submit application. Please try again later.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>Register Settlement</DialogTitle>
      </DialogHeader>
      {authAlert ? (
        <Alert>
          <AlertTitle>Sign in required</AlertTitle>
          <AlertDescription>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm">Please log in with Discord to register a settlement.</span>
              <Button size="sm" onClick={signInWithDiscord}>Login with Discord</Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div> : null}
      {success ? <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">{success}</div> : null}

      <div className="grid gap-2">
        <Label>Nation</Label>
        <Popover open={nationOpen} onOpenChange={setNationOpen} modal>
          <PopoverTrigger asChild>
            <Button variant="outline" className={nationId ? "justify-between" : "justify-between text-muted-foreground"}>
              {nationId ? nations?.find((n) => String(n.id) === String(nationId))?.nation_name ?? "Select nation" : "Select nation"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-w-sm max-h-80 overflow-y-auto" align="start">
            <Command>
              <CommandInput placeholder="Search nations..." />
              <CommandEmpty>No nations found.</CommandEmpty>
              <CommandList className="max-h-72 overflow-y-auto">
                <CommandGroup>
                  {nations?.map((n) => (
                    <CommandItem
                      key={String(n.id)}
                      value={n.nation_name}
                      onSelect={() => {
                        setNationId(n.id);
                        setNationName(n.nation_name);
                        setNationOpen(false);
                      }}
                    >
                      {n.nation_name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sname">Settlement name</Label>
        <Input id="sname" value={settlementName} onChange={(e) => setSettlementName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="sx">X</Label>
          <Input id="sx" value={x} onChange={(e) => setX(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sz">Z</Label>
          <Input id="sz" value={z} onChange={(e) => setZ(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sdiscord">Discord URL</Label>
        <Input id="sdiscord" value={discord} onChange={(e) => setDiscord(e.target.value)} />
      </div>

      <div className="grid gap-2 max-h-40 overflow-y-auto">
        <Label htmlFor="sdesc">Description</Label>
        <Textarea id="sdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="smemb">Member count (estimate)</Label>
        <Input id="smemb" type="number" min="0" value={memberCount} onChange={(e) => setMemberCount(e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t.key}
              className={`h-8 px-3 rounded-md border text-sm ${selectedTags.includes(t.key) ? "bg-muted" : "bg-background"}`}
              onClick={() => toggleTag(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={submit} disabled={isPending || !settlementName.trim() || !nationName.trim()}>Submit</Button>
      </div>
    </div>
  );
} 