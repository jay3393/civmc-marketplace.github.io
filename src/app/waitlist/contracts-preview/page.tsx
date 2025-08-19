"use client";

// Contracts Preview (mocked) — for promo/screenshot under /waitlist
// Focus: striking UI to showcase request/offer marketplace with simple thread list

type PreviewContract = {
  title: string;
  type: "request" | "offer";
  category: "Building" | "Gathering" | "Services" | "Bounty" | "Other";
  budgetAmount: number;
  currency: string;
  deadline?: string; // undefined means ASAP
  nationName: string;
  settlementName?: string;
  ownerName: string;
  description: string;
  status: "New" | "In Progress" | "Completed";
  discordUrl: string;
};

const CATEGORY_COLORS: Record<PreviewContract["category"], string> = {
  Building: "bg-sky-50 text-sky-700 border-sky-200",
  Gathering: "bg-amber-50 text-amber-700 border-amber-200",
  Services: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Bounty: "bg-rose-50 text-rose-700 border-rose-200",
  Other: "bg-slate-50 text-slate-700 border-slate-200",
};

const TYPE_COLORS: Record<PreviewContract["type"], string> = {
  request: "bg-blue-50 text-blue-700 border-blue-200",
  offer: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_COLORS: Record<PreviewContract["status"], string> = {
  New: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-slate-100 text-slate-600 border-slate-200",
};

const MOCK_CONTRACTS: PreviewContract[] = [
  {
    title: "City Gatehouse Construction",
    type: "request",
    category: "Building",
    budgetAmount: 128,
    currency: "Diamonds",
    deadline: "2025-09-01",
    nationName: "Pavia",
    settlementName: "Crown Ward",
    ownerName: "ImperialWorks",
    status: "New",
    discordUrl: "#",
    description:
      "Seeking skilled builders to construct a fortified gatehouse with redstone portcullis and crenellations. Materials supplied.",
  },
  {
    title: "Quartz Supply — Bulk",
    type: "request",
    category: "Gathering",
    budgetAmount: 96,
    currency: "Diamonds",
    nationName: "Icenia",
    ownerName: "IcyTrade",
    status: "In Progress",
    discordUrl: "#",
    description:
      "Buying nether quartz in bulk for cathedral build. Competitive prices for large deliveries.",
  },
  {
    title: "Rail Line Commission",
    type: "offer",
    category: "Services",
    budgetAmount: 0,
    currency: "Diamonds",
    deadline: "2025-10-15",
    nationName: "Estalia",
    ownerName: "Railwrights",
    status: "Completed",
    discordUrl: "#",
    description:
      "Offering end-to-end rail line planning and construction. Includes stations and signage. Limited Q4 slots.",
  },
  {
    title: "Bounty: Vault Griefer",
    type: "request",
    category: "Bounty",
    budgetAmount: 256,
    currency: "Diamonds",
    nationName: "Gabon",
    ownerName: "AmberGuard",
    status: "New",
    discordUrl: "#",
    description:
      "Bounty for intel and capture of a suspected vault griefer. Evidence and proof-of-work required for payout.",
  },
  {
    title: "Guild Hall Interior Design",
    type: "request",
    category: "Building",
    budgetAmount: 64,
    currency: "Diamonds",
    deadline: undefined,
    nationName: "Nara",
    settlementName: "Shiroyama",
    ownerName: "SakuraCouncil",
    status: "In Progress",
    discordUrl: "#",
    description:
      "Looking for warm, lived-in interiors with storage and displays. Preference for spruce and cherry palettes.",
  },
  {
    title: "Terraforming Services — Coastal City",
    type: "offer",
    category: "Services",
    budgetAmount: 0,
    currency: "Diamonds",
    nationName: "Heikki",
    ownerName: "TerraForma",
    status: "New",
    discordUrl: "#",
    description:
      "Professional terrain shaping for harbors, cliffs and beaches. Includes tree planting and pathing.",
  },
];

function TypeBadge({ type }: { type: PreviewContract["type"] }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${TYPE_COLORS[type]}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${type === "request" ? "bg-blue-500" : "bg-emerald-500"}`} />
      {type === "request" ? "Request" : "Offer"}
    </span>
  );
}

function CategoryBadge({ category }: { category: PreviewContract["category"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${CATEGORY_COLORS[category]}`}>{category}</span>
  );
}

function StatusBadge({ status }: { status: PreviewContract["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[status]}`}>{status}</span>
  );
}

function Diamond({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3l3.5 3H20l-8 15L4 6h4.5L12 3z"/>
    </svg>
  );
}

export default function ContractsPreviewPage() {
  return (
    <div className="relative min-h-screen w-full overflow-auto">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"/>
        <div className="absolute top-1/3 -right-24 h-[22rem] w-[22rem] rounded-full bg-indigo-500/20 blur-3xl"/>
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"/>
      </div>

      <div className="relative grid gap-6 p-6 sm:p-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl"/>
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"/>
          <div className="relative p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
              Contracts • Requests • Offers
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
              Get things built. Find work. Reward bounty hunters.
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
              Building, gathering, services, and bounties — a player-driven economy for CivMC.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><TypeBadge type="request"/> Nations post needs</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><TypeBadge type="offer"/> Players offer skills</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">💬 Discord threads</span>
            </div>
          </div>
        </div>

        {/* Filters: spacious layout */}
        <div className="mx-auto w-full max-w-5xl space-y-3">
          <div className="inline-flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-foreground" aria-hidden="true"><path fill="currentColor" d="M10 4a6 6 0 014.472 9.999l4.264 4.265-1.414 1.414-4.265-4.264A6 6 0 1110 4zm0 2a4 4 0 100 8 4 4 0 000-8z"/></svg>
            <span className="text-muted-foreground">Search title or nation…</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <TypeBadge type="request" />
              <TypeBadge type="offer" />
            </div>
            <div className="inline-flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_COLORS) as PreviewContract["category"][]).map((c) => (
                <CategoryBadge key={c} category={c} />
              ))}
            </div>
          </div>
        </div>

        {/* Thread list */}
        <div className="mx-auto w-full max-w-5xl divide-y rounded-xl border bg-background overflow-hidden">
          {MOCK_CONTRACTS.map((c, idx) => (
            <div key={`${c.title}-${idx}`} className="group relative grid gap-2 p-4 sm:p-5">
              {/* Accent bar by type */}
              <div className={`absolute inset-y-0 left-0 w-[3px] ${c.type === "request" ? "bg-blue-400" : "bg-emerald-400"}`}/>

              <div className="flex flex-wrap items-center gap-2 pl-2 sm:pl-3">
                <TypeBadge type={c.type} />
                <CategoryBadge category={c.category} />
                <StatusBadge status={c.status} />
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border bg-white/85 backdrop-blur px-2 py-0.5 text-[11px] text-slate-900">
                  <Diamond className="h-3.5 w-3.5"/>
                  {c.budgetAmount > 0 ? `${c.budgetAmount.toLocaleString()} ${c.currency}` : "—"}
                </span>
              </div>

              <div className="pl-2 sm:pl-3 space-y-1">
                <div className="text-base font-semibold leading-tight line-clamp-2">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.nationName}{c.settlementName ? ` • ${c.settlementName}` : ""} • Owner: {c.ownerName}</div>
              </div>

              <p className="pl-2 sm:pl-3 text-sm text-muted-foreground line-clamp-2">{c.description}</p>

              <div className="pl-2 sm:pl-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{c.deadline ? `Due: ${c.deadline}` : "ASAP"}</span>
                <button className="h-8 rounded-md border bg-blue-600 text-white px-3 text-xs hover:bg-blue-500 transition">View on Discord</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center text-[11px] sm:text-xs text-muted-foreground">All content above is mocked for a screenshot preview.</div>
      </div>
    </div>
  );
} 