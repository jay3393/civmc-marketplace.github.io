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
  net_worth_diamonds?: number | null; // optional if available in view
  flag_url?: string | null; // optional if available in view
};

const TAGS = [
  { key: "newbie", label: "✨ Newbie friendly" },
  { key: "rail", label: "🚂 Rail station" },
  { key: "market", label: "💰 Market/Trade" },
  { key: "buildings", label: "🏠 Buildings" },
  { key: "pvp", label: "⚔️ PvP" },
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

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ${
        active ? "bg-emerald-500 ring-emerald-200" : "bg-rose-500 ring-rose-200"
      }`}
      aria-label={active ? "Active" : "Dormant"}
    />
  );
}

function Diamond({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3l3.5 3H20l-8 15L4 6h4.5L12 3z"/>
    </svg>
  );
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

  // Default sorting: active first, then by net worth (fallback to member_count)
  const sorted = useMemo(() => {
    const arr = [...filtered];
    function getNetWorth(row: SettlementRow): number {
      const n = typeof row.net_worth_diamonds === "number" ? row.net_worth_diamonds : (row.member_count ?? 0);
      return n || 0;
    }
    arr.sort((a, b) => {
      const aActive = Boolean(a.active);
      const bActive = Boolean(b.active);
      if (aActive !== bActive) return aActive ? -1 : 1;
      const bnw = getNetWorth(b) - getNetWorth(a);
      if (bnw !== 0) return bnw;
      const an = (a.nation_name ?? "").localeCompare(b.nation_name ?? "");
      if (an !== 0) return an;
      return (a.settlement_name ?? "").localeCompare(b.settlement_name ?? "");
    });
    return arr;
  }, [filtered]);

  function toggleTag(key: string) {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleSize(val: string) {
    setSelectedSizes((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  }

  return (
    <div className="relative min-h-screen w-full overflow-auto">

      <div className="relative grid gap-6 p-6 sm:p-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"/>
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl"/>
          <div className="relative p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
              Settlements • Nations • Community
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
              Discover thriving nations and showcase your power
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
              Join the civ-wide network of settlements. Show members, activity and recruit.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><ActiveDot active={true}/> Active communities</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">✨ Beautiful builds</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">✨ Power / Wealth</span>
            </div>
          </div>
        </div>

        {/* Faux filters (functional under the hood) */}
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 inline-flex items-center rounded-lg border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search nations or settlements…"
                className="ml-2 w-full bg-transparent outline-none text-sm"
                aria-label="Search settlements"
              />
            </div>
            <div className="inline-flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => toggleTag(t.key)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${selectedTags.includes(t.key) ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-row gap-2 justify-start mt-2">
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
          </div>
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading settlements…</div>
        ) : isError ? (
          <div className="text-sm text-red-600">Failed to load settlements.</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center">No results found.</div>
        ) : (
          <div className="mx-auto w-full max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((row) => {
              const x = toNumber(row.x);
              const z = toNumber(row.z);
              const discordUrl = normalizeDiscord(row.discord);
              const active = row.active ?? false;
              const memberCount = row.member_count ?? undefined;
              const netWorthDiamonds = row.net_worth_diamonds ?? 0;
              const tags = row.tags ?? [];
              const nation = row.nation_name ?? "Unknown";
              const settlement = row.settlement_name ?? "Unknown";
              const flagUrl = row.flag_url ?? undefined;
              return (
                <div key={`${row.settlement_name}-${x}-${z}`} className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg">
                  {/* Top banner with flag (fallback gradient) */}
                  <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {flagUrl ? (
                      <img src={flagUrl} alt={`${nation} flag`} className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
                    ) : (
                      <img src="/images/default_settlement.jpg" className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
                    )}
                    {/* Active pill */}
                    <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/85 backdrop-blur px-2 py-1 text-xs shadow-sm">
                      <ActiveDot active={active} />
                      <span className="font-medium text-slate-900">{active ? "Active" : "Dormant"}</span>
                    </div>
                    {/* Power / wealth chip */}
                    <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full border bg-white/85 backdrop-blur px-2 py-1 text-xs shadow-sm text-slate-900">
                      <Diamond className="h-3.5 w-3.5"/>
                      <span className="font-medium">{netWorthDiamonds.toLocaleString()} d</span>
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{nation}</div>
                        <div className="text-base font-semibold leading-tight truncate">{settlement}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-muted-foreground">Members</div>
                        <div className="text-sm font-semibold">{memberCount?.toLocaleString()}</div>
                      </div>
                    </div>

                    {row.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">{row.description}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {tags.map((t) => (
                        <span key={t} className={`inline-flex items-center rounded-full border px-2 py-0.5 bg-slate-50 text-slate-700 border-slate-200`}>{t}</span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>XZ: {x ?? "-"}, {z ?? "-"}</span>
                      {discordUrl ? (
                        <a
                          href={discordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-md border inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 transition"
                        >
                          Join {nation.length > 10 ? nation.slice(0, 10) + "..." : nation} Discord
                        </a>
                      ) : (
                        <button className="h-8 px-3 rounded-md border opacity-60 cursor-not-allowed">
                          Join {nation.length > 10 ? nation.slice(0, 10) + "..." : nation} Discord
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div className="text-center text-[11px] sm:text-xs text-muted-foreground">Live data from the community • Verified with Discord</div>

        {/* Register modal remains functional */}
        <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} mode={mode} setMode={setMode} />
      </div>
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