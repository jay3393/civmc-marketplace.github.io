"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useSupabaseUser } from "@/components/auth/auth-button";
import { Button } from "@/components/ui/button";
import { getTimestampLocalTimezone } from "@/lib/utils";

export type ContractRow = {
  id: string;
  title: string;
  description: string | null;
  type: "request" | "offer";
  category: string;
  budget_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
  settlement: {
    id: number | null;
    settlement_name: string | null;
    nation_name: string | null;
  } | null;
  owner: {
    id: string;
    username?: string | null;
    discord_user_id?: string | null;
  } | null;
  currency: {
    id: string;
    name: string;
  } | null;
  discord_thread_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

async function signInWithDiscord() {
  const sb = getSupabaseBrowser();
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
  await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
}

async function fetchContracts(): Promise<ContractRow[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      `id,title,description,type,category,budget_amount,deadline,status,created_at,discord_thread_id,metadata,
       settlement:settlements(id,settlement_name,nation_name),
       owner:profiles(id,username,discord_user_id),
       currency:currencies(id,name)`
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load contracts", { error });
    throw new Error("Failed to load contracts.");
  }
  return (data ?? []) as unknown as ContractRow[];
}

type Props = {
  searchQuery?: string;
  category?: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  Building: "bg-sky-50 text-sky-700 border-sky-200",
  Gathering: "bg-amber-50 text-amber-700 border-amber-200",
  Services: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Bounty: "bg-rose-50 text-rose-700 border-rose-200",
  Other: "bg-slate-50 text-slate-700 border-slate-200",
};

function TypeBadge({ value }: { value: "request" | "offer" }) {
  const isReq = value === "request";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${isReq ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${isReq ? "bg-blue-500" : "bg-emerald-500"}`} />
      {isReq ? "Request" : "Offer"}
    </span>
  );
}

function CategoryBadge({ value }: { value: string }) {
  const cls = CATEGORY_COLORS[value] ?? "bg-slate-50 text-slate-700 border-slate-200";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>{value}</span>;
}

export default function ContractsTable({ searchQuery = "", category = null }: Props) {
  const { data, isLoading, isError } = useQuery({ queryKey: ["contracts"], queryFn: fetchContracts });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const user = useSupabaseUser();
  
  const currencyMapNameToImage = {
    "diamond": "Diamond_JE3_BE3.png",
    "essence": "Eye_of_Ender_JE2_BE2.png",
    "emerald": "Emerald_JE3_BE3.png",
  }

  const getCurrencyImagePath = (name: string) => {
    return `/images/${currencyMapNameToImage[name as keyof typeof currencyMapNameToImage]}`;
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      const matchesCategory = !category || c.category === category;
      const matchesQuery =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.settlement?.nation_name ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [data, searchQuery, category]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading contracts…</div>;
  if (isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
        Failed to load contracts. Please try again later.
      </div>
    );
  }
  if (!filtered || filtered.length === 0)
    return <div className="text-sm text-muted-foreground">No contracts match your filters.</div>;

  function threadUrlFor(c: ContractRow): string | null {
    const metaUrl = (c.metadata?.discord_thread_url as string | undefined) ?? undefined;
    if (metaUrl) return metaUrl;
    const threadId = c.discord_thread_id || null;
    const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID as string | undefined;
    if (threadId && guildId) return `discord.com/channels/${guildId}/${threadId}`;
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl divide-y rounded-xl border bg-background overflow-hidden">
      {filtered.map((c) => (
        <div key={c.id} className="group relative grid gap-2 p-4 sm:p-5">
          {/* Accent bar by type */}
          <div className={`absolute inset-y-0 left-0 w-[3px] ${c.type === "request" ? "bg-blue-400" : "bg-emerald-400"}`}/>

          <div className="flex flex-wrap items-center gap-2 pl-2 sm:pl-3">
            <TypeBadge value={c.type} />
            <CategoryBadge value={c.category} />
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border bg-white/85 backdrop-blur px-2 py-0.5 text-[11px] text-slate-900">
              {/* Map current name to icon */}
              <img src={getCurrencyImagePath(c.currency?.name ?? "")} alt={c.currency?.name ?? ""} className="h-3 w-3" />
              {c.budget_amount > 0 ? `${c.budget_amount.toLocaleString()} ${c.currency?.name ?? ""}` : "—"}
            </span>
          </div>

          <div className="pl-2 sm:pl-3 space-y-1">
            <div className="text-base font-semibold leading-tight line-clamp-2">{c.title}</div>
            <div className="text-xs text-muted-foreground">{c.settlement?.nation_name ?? "-"}{c.settlement?.settlement_name ? ` • ${c.settlement.settlement_name}` : ""} • Owner: {c.owner?.username ?? "-"}</div>
          </div>

          <p className="pl-2 sm:pl-3 text-sm text-muted-foreground line-clamp-2">{c.description ?? "-"}</p>

          <div className="pl-2 sm:pl-3 flex items-center justify-between text-xs text-muted-foreground">
            {/* <span>{c.deadline ? `Due: ${c.deadline}` : "ASAP"}</span> */}
            <span>Posted: {getTimestampLocalTimezone(c.created_at)}</span>
            {(() => {
              const url = threadUrlFor(c);
              if (url && user) {
                return (
                  <Button className="h-8 rounded-md border bg-blue-600 text-white px-3 text-xs hover:bg-blue-500 transition" onClick={() => {
                    window.open(`discord://${url}`, '_blank');
                  }}>
                    View on Discord
                  </Button>              
                );
              }
              if (!user) {
                return (
                  <Button className="h-8 rounded-md border bg-blue-600 text-white px-3 text-xs hover:bg-blue-500 transition" onClick={signInWithDiscord}>
                    Login with Discord to view
                  </Button>
                );
              }
              return (
                <Button className="h-8 rounded-md border opacity-60 cursor-not-allowed px-3 text-xs" title="Not yet posted to Discord">
                  View on Discord
                </Button>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
} 