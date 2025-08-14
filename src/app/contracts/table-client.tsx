"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { ChevronDown, ChevronRight } from "lucide-react";

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
};

async function fetchContracts(): Promise<ContractRow[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("contracts")
    .select(
      `id,title,description,type,category,budget_amount,deadline,status,created_at,
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
          (isReq ? `bg-blue-100 text-blue-800` : `bg-green-100 text-green-800`)
        }
      >
        {value}
      </span>
    );
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
          {filtered.map((c) => {
            const isOpen = !!expanded[c.id];
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
                  <td className="py-2 pr-4 align-top">{c.settlement?.nation_name ?? "-"}</td>
                  <td className="py-2 pr-4 align-top">{ownerName(c)}</td>
                  <td className="py-2 pr-4 align-top max-w-[260px] truncate" title={c.title}>
                    {c.title}
                  </td>
                  <td className="py-2 pr-4 align-top">{c.category}</td>
                  <td className="py-2 pr-4 align-top">
                    {c.budget_amount} {c.currency?.name ?? ""}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="border-b bg-muted/20">
                    <td className="py-3 pr-4" />
                    <td className="py-3 pr-4" colSpan={7}>
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
                            <div className="text-sm capitalize">{c.status}</div>
                          </div>
                          <div className="grid gap-1">
                            <div className="text-xs text-muted-foreground">Created at</div>
                            <div className="text-sm">{new Date(c.created_at).toLocaleString()}</div>
                          </div>
                        </div>

                      <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                          <button className="h-8 px-3 rounded-md border inline-flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                              <path d="M2 5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H8.83L4.12 21.78A1 1 0 0 1 3 20.92V17a3 3 0 0 1-1-2V5Zm3-1a1 1 0 0 0-1 1v10a1 1 0 0 0 .55.89l.45.23v2.38l3.38-1.69A1 1 0 0 1 10 17h9a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H5Z" />
                            </svg>
                            Contact
                          </button>
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