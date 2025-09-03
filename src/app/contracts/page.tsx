"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import ContractsTable from "./table-client";
import CreateContract from "./create-contract";

const CATEGORIES = ["Building", "Gathering", "Services", "Bounty", "Other"] as const;

export default function ContractsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen w-full overflow-auto">
      <div className="relative grid gap-6 p-6 sm:p-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl"/>
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"/>
          <div className="relative p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
              Contracts • Job Postings • Bounties
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
              Create and find contracts, job postings, and bounties nation-wide.
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
              Building, gathering, services, and bounties — a player-driven economy for CivMC.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">Request • Offer threads</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">💬 Discord threads</span>
            </div>
          </div>
        </div>

        {/* Filters: spacious layout */}
        <div className="mx-auto w-full max-w-5xl space-y-3">
          <div className="inline-flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" aria-hidden="true"><path fill="currentColor" d="M10 4a6 6 0 014.472 9.999l4.264 4.265-1.414 1.414-4.265-4.264A6 6 0 1110 4zm0 2a4 4 0 100 8 4 4 0 000-8z"/></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or nation…"
              className="w-full bg-transparent outline-none text-sm"
              aria-label="Search contracts"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span>Filter by category</span>
            </div>
            <div className="inline-flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(category === c ? null : c)}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${category === c ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Thread list (functional) */}
        <div className="mx-auto w-full max-w-5xl">
          <ContractsTable searchQuery={search} category={category} />
        </div>

        {/* Footer note */}
        <div className="text-center text-[11px] sm:text-xs text-muted-foreground">Live data • Discord links open threads</div>
      </div>
      <CreateContract />
    </div>
  );
} 