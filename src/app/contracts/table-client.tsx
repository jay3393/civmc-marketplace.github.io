"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { ChevronDown, ChevronRight } from "lucide-react";

export type ContractRow = {
  id: string;
  title: string;
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
};

async function fetchContracts(): Promise<ContractRow[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      `id,title,type,category,budget_amount,deadline,status,created_at,
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

export default function ContractsTable() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["contracts"], queryFn: fetchContracts });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading contracts…</div>;
  if (isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
        Failed to load contracts. Please try again later.
      </div>
    );
  }
  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground">No contracts yet.</div>;

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function ownerName(c: ContractRow): string {
    return c.owner?.username ?? "-";
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
            <th className="py-2 pr-4">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => {
            const isOpen = !!expanded[c.id];
            return (
              <>
                <tr key={c.id} className="border-b">
                  <td className="py-2 pr-4 align-top">
                    <button aria-label="Toggle details" onClick={() => toggle(c.id)} className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </td>
                  <td className="py-2 pr-4 align-top capitalize">{c.type}</td>
                  <td className="py-2 pr-4 align-top">{c.settlement?.nation_name ?? "-"}</td>
                  <td className="py-2 pr-4 align-top">{ownerName(c)}</td>
                  <td className="py-2 pr-4 align-top">{c.title}</td>
                  <td className="py-2 pr-4 align-top">{c.category}</td>
                  <td className="py-2 pr-4 align-top">{c.budget_amount} {c.currency?.name ?? ""}</td>
                  <td className="py-2 pr-4 align-top">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</td>
                </tr>
                {isOpen ? (
                  <tr className="border-b bg-muted/20">
                    <td className="py-3 pr-4" />
                    <td className="py-3 pr-4" colSpan={7}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Settlement</div>
                          <div className="text-sm">{c.settlement?.settlement_name ?? "-"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Status</div>
                          <div className="text-sm capitalize">{c.status}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Created at</div>
                          <div className="text-sm">{new Date(c.created_at).toLocaleString()}</div>
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