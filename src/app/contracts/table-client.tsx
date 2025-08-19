"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useSupabaseUser } from "@/components/auth/auth-button";
import { Button } from "@/components/ui/button";

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

export default function ContractsTable({ searchQuery = "", category = null }: Props) {
  const { data, isLoading, isError } = useQuery({ queryKey: ["contracts"], queryFn: fetchContracts });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const user = useSupabaseUser();
  
  const currencyMapNameToImage = {
    "diamond": "https://minecraft.wiki/images/Diamond_JE3_BE3.png?99d00&format=original",
    "essence": "https://minecraft.wiki/images/Eye_of_Ender_JE2_BE2.png?3e29b&format=original",
    "emerald": "https://minecraft.wiki/images/Emerald_JE3_BE3.png?99d00&format=original",
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

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function ownerName(c: ContractRow): string {
    return c.owner?.username ?? "-";
  }

  function TypeBadge({ value }: { value: "request" | "offer" }) {
    const isReq = value === "request";
    return (
      <span
        className={
          `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ` +
          (isReq ? `bg-blue-600 text-white` : `bg-green-600 text-white`)
        }
      >
        {value}
      </span>
    );
  }

  function threadUrlFor(c: ContractRow): string | null {
    const metaUrl = (c.metadata?.discord_thread_url as string | undefined) ?? undefined;
    if (metaUrl) return metaUrl;
    const threadId = c.discord_thread_id || null;
    const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID as string | undefined;
    if (threadId && guildId) return `discord.com/channels/${guildId}/${threadId}`;
    return null;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4 w-8" />
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Nation</th>
            <th className="py-2 pr-4">Requested by</th>
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Budget</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => {
            const isOpen = !!expanded[c.id];
            const discordUrl = threadUrlFor(c);
            return (
              <>
                <tr key={c.id} className="border-b">
                  <td className="py-2 pr-4 align-top">
                    <button
                      aria-label="Toggle details"
                      onClick={() => toggle(c.id)}
                      className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted"
                    >
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td className="py-2 pr-4 align-top capitalize">
                    <TypeBadge value={c.type} />
                  </td>
                  <td className="py-2 pr-4 align-top max-w-[100px] truncate" title={c.settlement?.nation_name ?? "-"}>{c.settlement?.nation_name ?? "-"}</td>
                  <td className="py-2 pr-4 align-top">{ownerName(c)}</td>
                  <td className="py-2 pr-4 align-top max-w-[260px] truncate" title={c.title}>
                    {c.title}
                  </td>
                  <td className="py-2 pr-4 align-top">{c.category}</td>
                  <td className="py-2 pr-4 align-top flex items-center gap-1">
                    {c.budget_amount} <img src={currencyMapNameToImage[c.currency?.name as keyof typeof currencyMapNameToImage] ?? ""} alt={c.currency?.name ?? ""} className="w-4 h-4 inline-block" />
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="border-b bg-muted/20">
                    <td className="py-3 pr-4" />
                    <td className="py-3 pr-4" colSpan={6}>
                      <div className="grid gap-6">
                        <div className="grid gap-1">
                          <div className="text-xs text-muted-foreground">Title</div>
                          <div className="text-sm font-semibold break-words">{c.title}</div>
                        </div>

                        <div className="grid gap-1">
                          <div className="text-xs text-muted-foreground">Description</div>
                          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {c.description ?? "-"}
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="grid gap-1">
                            <div className="text-xs text-muted-foreground">Settlement</div>
                            <div className="text-sm">{c.settlement?.settlement_name ?? "-"}</div>
                          </div>
                          <div className="grid gap-1">
                            <div className="text-xs text-muted-foreground">Status</div>
                            {c.status === "open" && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-sm capitalize">Open</Badge>
                            )}
                            {c.status === "closed" && (
                              <Badge variant="secondary" className="bg-red-100 text-red-800 text-sm capitalize">Closed</Badge>
                            )}
                            {c.status === "expired" && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-sm capitalize">Expired</Badge>
                            )}
                          </div>
                          <div className="grid gap-1">
                            <div className="text-xs text-muted-foreground">Created at</div>
                            <div className="text-sm">{new Date(c.created_at).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="grid gap-1">
                          <div className="flex items-center gap-2">
                            {/* if user is not authenicated, show a button to login with discord */}
                            {/* if user is authenicated, show a button to view the contract on discord */}
                            {discordUrl && user ? (
                              <a
                                href={`discord://${discordUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-3 rounded-md border inline-flex items-center gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200"
                                title="Open in Discord"
                                // onClick={(e) => {
                                //   // fallback if discord:// not supported
                                //   setTimeout(() => {
                                //     window.location.href = `https://${discordUrl}`;
                                //   }, 500);
                                // }}
                              >
                                View contract on Discord
                              </a>
                            ) : discordUrl && !user ? (
                              <button className="h-8 px-3 rounded-md border inline-flex items-center gap-2" onClick={signInWithDiscord}>
                                Login with Discord to view contract
                              </button>
                            ) : (
                              <button className="h-8 px-3 rounded-md border opacity-60 cursor-not-allowed" title="Not yet posted to Discord">
                                View contract on Discord
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </td>
                  </tr>
                ) : null}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 