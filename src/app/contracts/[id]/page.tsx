"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

type ContractDetail = {
  id: string;
  title: string;
  description: string | null;
  type: "request" | "offer";
  category: string;
  budget_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
  created_by: string;
  settlement: {
    id: number | null;
    settlement_name: string | null;
    nation_name: string | null;
  } | null;
  owner: {
    id: string;
    username?: string | null;
  } | null;
  currency: {
    id: string;
    name: string;
  } | null;
  discord_thread_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function useContract(contractId: string) {
  return useQuery<ContractDetail>({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("contracts")
        .select(
          `id,title,description,type,category,budget_amount,deadline,status,created_at,created_by,discord_thread_id,metadata,
           settlement:settlements(id,settlement_name,nation_name),
           owner:profiles(id,username),
           currency:currencies(id,name)`
        )
        .eq("id", contractId)
        .maybeSingle();
      if (error) throw new Error("Failed to load contract");
      return data as unknown as ContractDetail;
    },
  });
}

function discordThreadUrl(c: ContractDetail): string | null {
  const metaUrl = (c.metadata?.discord_thread_url as string | undefined) ?? undefined;
  if (metaUrl) return metaUrl;
  const threadId = c.discord_thread_id || null;
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID as string | undefined;
  if (threadId && guildId) return `discord://discord.com/channels/${guildId}/${threadId}`;
  return null;
}

export default function ContractDetailPage() {
  const params = useParams();
  const contractId = String(params?.id ?? "");
  const { data: contract, isLoading: loadingContract, isError: errorContract } = useContract(contractId);

  if (!contractId) return <div className="text-sm text-muted-foreground">Invalid contract.</div>;
  if (loadingContract) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (errorContract || !contract) return <div className="text-sm text-red-600">Failed to load contract.</div>;

  const url = discordThreadUrl(contract);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contracts" className="text-sm text-muted-foreground hover:underline">← Back to contracts</Link>
      </div>

      <div className="grid gap-2">
        <div className="text-2xl font-semibold">{contract.title}</div>
        <div className="text-sm text-muted-foreground">
          <span className="capitalize">{contract.type}</span> · {contract.category} · {contract.currency?.name ?? ""} {contract.budget_amount}
        </div>
        <div className="text-sm">{contract.settlement?.nation_name ?? "-"} — {contract.settlement?.settlement_name ?? "-"}</div>
        <div className="text-sm text-muted-foreground">Owner: {contract.owner?.username ?? "-"}</div>
        <div className="text-sm text-muted-foreground">Status: <span className="capitalize">{contract.status}</span></div>
        <div className="prose text-sm whitespace-pre-wrap leading-relaxed">{contract.description ?? "No description."}</div>
      </div>

      <div className="flex items-center gap-2">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="h-9 px-3 rounded-md border inline-flex items-center">
            View contract on Discord
          </a>
        ) : (
          <button className="h-9 px-3 rounded-md border opacity-60 cursor-not-allowed" title="Not yet posted to Discord">
            View contract on Discord
          </button>
        )}
      </div>
    </div>
  );
} 