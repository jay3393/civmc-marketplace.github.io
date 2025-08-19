"use client";

// Settlements Preview (mocked) — for promo/screenshot under /waitlist
// Focus: hype nations to register — show power, members, net worth, status, tags

type PreviewNation = {
  nationName: string;
  settlementName: string;
  members: number;
  netWorthDiamonds: number;
  active: boolean;
  tags: string[];
  coords: { x: number; z: number };
  flagUrl: string;
  discordUrl: string;
  description: string;
};

const TAG_COLORS: Record<string, string> = {
  "Newbie friendly": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Rail station": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Market/Trade": "bg-amber-50 text-amber-700 border-amber-200",
  Buildings: "bg-sky-50 text-sky-700 border-sky-200",
  PvP: "bg-rose-50 text-rose-700 border-rose-200",
};

const MOCK: PreviewNation[] = [
  {
    nationName: "Icenia",
    settlementName: "Icenia City",
    members: 128,
    netWorthDiamonds: 4200,
    active: true,
    tags: ["Newbie friendly", "Rail station", "Market/Trade"],
    coords: { x: -1520, z: 940 },
    flagUrl: "https://cdn.discordapp.com/attachments/1067464882326343680/1067464882737393734/lgAq_l7lVcCZQ9Vk_hoKb8Kbt0qJLRcgCXBFQABsE9CLYoJIJfgyZCduCNTvGl2zdFMw1200-h630-p1.jpg?ex=68a5e8a4&is=68a49724&hm=f711e0f8e368587bf54b269f851f8331491e691247861b38118b40458442c748&",
    discordUrl: "#",
    description: "Icy capital city with bustling trade and scenic alpine builds. Daily activity and frequent events.",
  },
  {
    nationName: "Pavia",
    settlementName: "The Empire of Pavia",
    members: 250,
    netWorthDiamonds: 9800,
    active: true,
    tags: ["Market/Trade", "Buildings"],
    coords: { x: 320, z: -210 },
    flagUrl: "https://cdn.discordapp.com/attachments/1067885415748599960/1067885416499388597/image.png?ex=68a61ecb&is=68a4cd4b&hm=cbb3b0873aea2be18a50a9b48f227ef184454357eba383b11558947408655a79&",
    discordUrl: "#",
    description: "Historic metropolis with massive infrastructure and robust economy. A hub for merchants and builders.",
  },
  {
    nationName: "Nara",
    settlementName: "Shiroyama",
    members: 96,
    netWorthDiamonds: 5100,
    active: true,
    tags: ["Rail station", "Buildings"],
    coords: { x: -80, z: -1200 },
    flagUrl: "https://cdn.discordapp.com/attachments/1021203625130860575/1021203625831301128/nara_6.png?ex=68a5b3bd&is=68a4623d&hm=d19b1486c31f412d92f842387970b1fc71d4e495169a20bd957167602e1001d7&",
    discordUrl: "#",
    description: "Seaside quarter with grand architecture and rail links. Friendly governance and public works.",
  },
  {
    nationName: "Estalia",
    settlementName: "Golden Market",
    members: 180,
    netWorthDiamonds: 12400,
    active: true,
    tags: ["Market/Trade", "PvP"],
    coords: { x: 2100, z: 300 },
    flagUrl: "https://iili.io/FpVPr1R.png",
    discordUrl: "#",
    description: "Wealthy trade nation known for rare goods, competitive bids, and top-tier fortifications.",
  },
  {
    nationName: "Yoahtl",
    settlementName: "Jungle Reach",
    members: 72,
    netWorthDiamonds: 2600,
    active: false,
    tags: ["Buildings"],
    coords: { x: -600, z: 1750 },
    flagUrl: "https://iili.io/FpVPr1R.png",
    discordUrl: "#",
    description: "Lush jungle builds and historic ruins. Quiet lately, but a gem for explorers and artisans.",
  },
  {
    nationName: "Pavia",
    settlementName: "Crown Ward",
    members: 141,
    netWorthDiamonds: 7400,
    active: true,
    tags: ["Buildings", "Market/Trade"],
    coords: { x: -2300, z: -350 },
    flagUrl: "https://iili.io/FpVPr1R.png",
    discordUrl: "#",
    description: "Cathedral spires, marble avenues, and active governance. Strong community with cultural flair.",
  },
  {
    nationName: "Caledonia",
    settlementName: "Highlands",
    members: 55,
    netWorthDiamonds: 1500,
    active: true,
    tags: ["Newbie friendly", "Buildings"],
    coords: { x: 890, z: -1780 },
    flagUrl: "https://iili.io/FpVPr1R.png",
    discordUrl: "#",
    description: "Cozy mountain settlements and helpful residents. Great on-ramp for new players.",
  },
  {
    nationName: "Gabon",
    settlementName: "Amber Bay",
    members: 38,
    netWorthDiamonds: 900,
    active: false,
    tags: ["PvP"],
    coords: { x: 3000, z: 800 },
    flagUrl: "https://iili.io/FpVPr1R.png",
    discordUrl: "#",
    description: "Coastal outpost with PvP history. Strategic location and defensive builds.",
  },
];

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ${
        active ? "bg-emerald-500 ring-emerald-200" : "bg-rose-500 ring-rose-200"
      }`}
      aria-label={active ? "Active" : "Dormant"}
    />
  );
}

function Diamond({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3l3.5 3H20l-8 15L4 6h4.5L12 3z"/>
    </svg>
  );
}

export default function SettlementsPreviewPage() {
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
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"/>
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl"/>
          <div className="relative p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
              Settlements • Nations • Community
            </div>
            <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
              Discover thriving nations and showcase your power
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
              Join the civ-wide network of settlements. Show members, wealth, activity and recruit with style.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><ActiveDot active={true}/> Active communities</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1"><Diamond className="h-3.5 w-3.5"/> Wealth rankings</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">✨ Beautiful builds</span>
            </div>
          </div>
        </div>

        {/* Faux filters for aesthetics */}
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 inline-flex items-center rounded-lg border bg-background px-3 py-2">
              <span className="text-muted-foreground">Search nations or settlements…</span>
            </div>
            <div className="inline-flex flex-wrap gap-2">
              {Object.keys(TAG_COLORS).map((t) => (
                <span key={t} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${TAG_COLORS[t]}`}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="mx-auto w-full max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK.map((n) => (
            <div key={`${n.nationName}-${n.settlementName}`} className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg">
              {/* Top banner with flag */}
              <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={n.flagUrl} alt={`${n.nationName} flag`} className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
                {/* Active pill */}
                <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/85 backdrop-blur px-2 py-1 text-xs shadow-sm">
                  <ActiveDot active={n.active} />
                  <span className="font-medium text-slate-900">{n.active ? "Active" : "Dormant"}</span>
                </div>
                {/* Power / wealth chip */}
                <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full border bg-white/85 backdrop-blur px-2 py-1 text-xs shadow-sm text-slate-900">
                  <Diamond className="h-3.5 w-3.5"/>
                  <span className="font-medium">{n.netWorthDiamonds.toLocaleString()} d</span>
                </div>
              </div>

              <div className="p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{n.nationName}</div>
                    <div className="text-base font-semibold leading-tight truncate">{n.settlementName}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted-foreground">Members</div>
                    <div className="text-sm font-semibold">{n.members.toLocaleString()}</div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">{n.description}</p>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {n.tags.map((t) => (
                    <span key={t} className={`inline-flex items-center rounded-full border px-2 py-0.5 ${TAG_COLORS[t] || "bg-slate-50 text-slate-700 border-slate-200"}`}>{t}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>XZ: {n.coords.x}, {n.coords.z}</span>
                  <span className="inline-flex items-center gap-1"><Diamond className="h-3.5 w-3.5"/> {n.netWorthDiamonds.toLocaleString()} diamonds</span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button className="h-8 rounded-md border bg-blue-600 text-white px-3 text-xs hover:bg-blue-500 transition">Join {n.nationName} Discord</button>
                  <button className="h-8 rounded-md border px-3 text-xs">View details</button>
                </div>
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