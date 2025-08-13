"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabase } from "@/lib/supabaseClient";

export type ContractRow = {
  id: string;
  title: string;
  type: "request" | "offer";
  category: string;
  budget_amount: number;
  // assuming currencies.name exists; adjust when joining later
  budget_currency_id: string;
  deadline: string | null;
  nation_id: number;
  settlement_id: number | null;
  status: string;
  created_at: string;
};

async function fetchContracts(): Promise<ContractRow[]> {
  const supabase = createSupabase();
  const { data, error } = await supabase
    .from("contracts")
    .select("id,title,type,category,budget_amount,budget_currency_id,deadline,nation_id,settlement_id,status,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    // Do not leak internals to UI; throw generic error
    console.error("Failed to load contracts", { error });
    throw new Error("Failed to load contracts.");
  }
  return (data ?? []) as ContractRow[];
}

export default function ContractsTable() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["contracts"], queryFn: fetchContracts });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading contracts…</div>;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
        Failed to load contracts. Please try again later.
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-sm text-muted-foreground">No contracts yet.</div>;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Nation</th>
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Budget</th>
            <th className="py-2 pr-4">Deadline</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2 pr-4">{c.nation_id}</td>
              <td className="py-2 pr-4">{c.title}</td>
              <td className="py-2 pr-4 capitalize">{c.type}</td>
              <td className="py-2 pr-4">{c.category}</td>
              <td className="py-2 pr-4">{c.budget_amount} {c.budget_currency_id.slice(0, 4)}…</td>
              <td className="py-2 pr-4">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 