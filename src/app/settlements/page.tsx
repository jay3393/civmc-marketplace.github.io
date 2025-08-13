export const dynamic = "force-dynamic";

import { createSupabase } from "@/lib/supabaseClient";

type SettlementRow = {
  settlement_name: string;
  x: number;
  z: number;
  nation_name: string | null;
  discord: string | null;
};

export default async function SettlementsPage() {
  let rows: SettlementRow[] = [];
  let loadError: string | null = null;

  try {
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from("settlements_readonly")
      .select("*")
      .order("settlement_name", { ascending: true });

    if (error) {
      console.error("Failed to load settlements from Supabase", { error });
      loadError = "Failed to load settlements. Please try again later.";
    } else {
      rows = (data ?? []) as SettlementRow[];
    }
  } catch (e) {
    console.error("Unexpected error loading settlements", e);
    loadError = "Failed to load settlements. Please try again later.";
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settlements</h1>
          <p className="text-muted-foreground">Register your settlement and explore others.</p>
        </div>
        <input placeholder="Settlement name" className="h-9 rounded-md border px-3 text-sm bg-background w-full" />
        <input placeholder="Nation" className="h-9 rounded-md border px-3 text-sm bg-background w-full" />
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="X coordinate" className="h-9 rounded-md border px-3 text-sm bg-background" />
          <input placeholder="Z coordinate" className="h-9 rounded-md border px-3 text-sm bg-background" />
        </div>
        <textarea placeholder="Description" className="min-h-24 rounded-md border p-3 text-sm bg-background w-full" />
        <button className="h-9 rounded-md border px-3 w-fit">Register settlement</button>
      </div>
      <div className="rounded-lg border p-4">
        <div className="text-sm text-muted-foreground">Registered settlements</div>
        {loadError ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
            {loadError}
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Nation</th>
                  <th className="py-2 pr-4">Coordinates</th>
                  <th className="py-2 pr-4">Discord</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="py-3 text-muted-foreground" colSpan={4}>No settlements found.</td>
                  </tr>
                ) : (
                  rows.map((c) => (
                    <tr key={`${c.settlement_name}-${c.x}-${c.z}`} className="border-b">
                      <td className="py-2 pr-4">{c.settlement_name}</td>
                      <td className="py-2 pr-4">{c.nation_name}</td>
                      <td className="py-2 pr-4">({c.x}, {c.z})</td>
                      <td className="py-2 pr-4">{c.discord ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 