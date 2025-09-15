"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import AuthButton, { useSupabaseUser } from "@/components/auth/auth-button";
import CreateClaimModal from "@/components/claims/create-claim-modal";

export const dynamic = "force-dynamic";

type ClaimsRow = {
  id: number;
  name: string;
  parent_claim: number | null;
  coord_x: number | string | null;
  coord_z: number | string | null;
  discord_url: string | null;
  description?: string | null;
  member_count?: number | null;
  is_active?: boolean | null;
  tags?: string[] | null;
  diamond_count?: number | null;
  image_url?: string | null;
  updated_at?: string | null;
};

function resolveClaimImageUrl(src: string | null | undefined) {
  if (!src) return "/images/default_settlement.jpg";
  if (/^https?:\/\//i.test(src)) return src;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/images/default_settlement.jpg";
  const encoded = encodeURI(src);
  return `${base}/storage/v1/object/public/${encoded}`;
}

const TAGS = [
  { key: "newbie", label: "✨ Newbie friendly" },
  { key: "rail", label: "🚂 Rail station" },
  { key: "market", label: "💰 Market/Trade" },
  { key: "buildings", label: "🏠 Buildings" },
  { key: "pvp", label: "⚔️ PvP" },
] as const;

async function fetchSettlements(): Promise<ClaimsRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("claims")
    .select("id,name,parent_claim,coord_x,coord_z,discord_url,description,member_count,is_active,tags,diamond_count,image_url,updated_at")
    .eq("claim_type", "SETTLEMENT")
    .order("name", { ascending: true });
  if (error) throw new Error("Failed to load settlements");
  return (data ?? []) as ClaimsRow[];
}

async function fetchNations(): Promise<{ id: string | number; nation_name: string }[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("claims")
    .select("id,name")
    .eq("claim_type", "NATION")
    .order("name");
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, nation_name: r.name }));
}

async function fetchClaims(): Promise<ClaimsRow[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("claims")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error("Failed to load claims");
  return (data ?? []) as ClaimsRow[];
}

async function getRequestor() {
  const sb = getSupabaseBrowser();
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const profileId = user.id as string;
  // Try to read username from profiles; fallback to discord metadata
  let username: string | null = null;
  const { data: profile }: { data: { username: string } | null } = await sb.from("profiles").select("username").eq("id", profileId).maybeSingle();
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
  const trimmed = url.trim();

  // If this looks like a raw invite code (no dots or slashes), assume it's an invite
  if (/^[\w-]+$/.test(trimmed)) {
    return `https://discord.gg/${encodeURIComponent(trimmed)}`;
  }

  try {
    // Ensure URL can be parsed even if scheme is missing
    const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(candidate);
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === "discord.gg" ||
      host.endsWith(".discord.gg") ||
      host === "discord.com" ||
      host.endsWith(".discord.com");

    if (!allowed) return null;

    // Always render as https
    return `https://${host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // If parsing fails, reject the input
    return null;
  }
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
  const user = useSupabaseUser();
  const [q, setQ] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSizes] = useState<string[]>([]);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimType, setClaimType] = useState<"NATION" | "SETTLEMENT">("SETTLEMENT");
  const [chooserOpen, setChooserOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({ queryKey: ["claims"], queryFn: fetchClaims });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      const matchesQuery =
        !query ||
        (row.name ?? "").toLowerCase().includes(query);

      const rowTags = (row.tags ?? []).map((t) => String(t).toLowerCase());
      const rowSize = ""; // removed size; not in new schema

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
    function getNetWorth(row: ClaimsRow): number {
      const n = typeof row.diamond_count === "number" ? row.diamond_count : (row.member_count ?? 0);
      return n || 0;
    }
    arr.sort((a, b) => {
      const aActive = Boolean(a.is_active);
      const bActive = Boolean(b.is_active);
      if (aActive !== bActive) return aActive ? -1 : 1;
      const bnw = getNetWorth(b) - getNetWorth(a);
      if (bnw !== 0) return bnw;
      const an = (a.name ?? "").localeCompare(b.name ?? "");
      if (an !== 0) return an;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
    return arr;
  }, [filtered]);

  function toggleTag(key: string) {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <div className="relative min-h-screen w-full">

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
              { user ? 
                <button
                  className="underline text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    setChooserOpen(true);
                  }}
                > 
                  Click here to register your own.
                </button>
              : 
                <button
                  className="underline text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    setChooserOpen(true);
                  }}
                > 
                  Click here to register your own.
                </button>
            }

              
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
              const x = toNumber(row.coord_x);
              const z = toNumber(row.coord_z);
              const discordUrl = normalizeDiscord(row.discord_url);
              const active = row.is_active ?? false;
              const memberCount = row.member_count ?? undefined;
              const netWorthDiamonds = row.diamond_count ?? 0;
              const tags = row.tags ?? [];
              const nation = ""; // parent shown elsewhere if needed
              const settlement = row.name ?? "Unknown";
              const flagUrl = row.image_url ?? null;
              const updatedAt = row.updated_at;
              return (
                <div key={`${row.name}-${x}-${z}`} className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg">
                  {/* Top banner with flag (fallback gradient) */}
                  <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                    {flagUrl ? (
                      <Image src={resolveClaimImageUrl(flagUrl)} alt={`${settlement} flag`} fill className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
                    ) : (
                      <Image src="/images/default_settlement.jpg" alt="Default settlement" fill className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
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
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last updated: {updatedAt ? new Date(updatedAt).toLocaleDateString() : "N/A"}</span>
                      {discordUrl ? (
                        <a
                          href={discordUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-3 rounded-md border inline-flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-500 transition"
                        >
                          Join {settlement.length > 10 ? settlement.slice(0, 10) + "..." : settlement} Discord
                        </a>
                      ) : (
                        <button className="h-8 px-3 rounded-md border opacity-60 cursor-not-allowed">
                          Join {settlement.length > 10 ? settlement.slice(0, 10) + "..." : settlement} Discord
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

        {/* New Create Claim modal */}
        <CreateClaimModal
          open={claimModalOpen}
          onOpenChange={setClaimModalOpen}
          defaultClaimType={claimType}
          onCreated={() => { /* could refresh list if needed */ }}
        />

        {/* Chooser dialog */}
        <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Register your community</DialogTitle>
            </DialogHeader>
            {!user ? (
              <div className="mb-3">
                <div className="text-sm text-muted-foreground mb-2">Please log in with Discord to continue.</div>
                <AuthButton />
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                className="h-10 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => {
                  setClaimType("NATION");
                  setChooserOpen(false);
                  setClaimModalOpen(true);
                }}
              >
                Register Nation
              </Button>
              <Button
                className="h-10 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => {
                  setClaimType("SETTLEMENT");
                  setChooserOpen(false);
                  setClaimModalOpen(true);
                }}
              >
                Register Settlement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}