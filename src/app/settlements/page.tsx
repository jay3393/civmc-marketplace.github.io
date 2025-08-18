"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

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
    </div>
  );
} 