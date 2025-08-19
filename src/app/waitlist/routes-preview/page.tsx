"use client";

// Routes Preview (mocked) — for promo/screenshot under /waitlist
// Purpose: search source/destination and display transfer itinerary + station coords

function SwapIcon({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
			<path d="M7 7h10l-3-3 1.4-1.4L21.8 7l-6.4 4.4L14 10l3-3H7V7zm10 10H7l3 3-1.4 1.4L2.2 17l6.4-4.4L10 14l-3 3h10v0z"/>
		</svg>
	);
}

function PinIcon({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
			<path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
		</svg>
	);
}

type Station = {
	nation: string;
	station: string;
	coords: { x: number; y?: number; z: number };
	lines: string[];
	active: boolean;
};

const MOCK_STATIONS: Station[] = [
	{ nation: "Pavia", station: "Crown Station", coords: { x: -2300, z: -350 }, lines: ["Blue", "Gold"], active: true },
	{ nation: "Icenia", station: "Central", coords: { x: -80, z: -1200 }, lines: ["Blue", "Northern"], active: true },
	{ nation: "Estalia", station: "Golden Market", coords: { x: 2100, z: 300 }, lines: ["Gold"], active: true },
	{ nation: "Nara", station: "Shiroyama", coords: { x: 640, z: 940 }, lines: ["Cherry"], active: true },
	{ nation: "Gabon", station: "Amber Bay", coords: { x: 3000, z: 800 }, lines: ["Coast"], active: false },
];

export default function RoutesPreviewPage() {
	return (
		<div className="relative min-h-screen w-full overflow-auto">
			{/* Ambient glow */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"/>
				<div className="absolute top-1/3 -right-24 h-[22rem] w-[22rem] rounded-full bg-indigo-500/20 blur-3xl"/>
				<div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"/>
			</div>

			<div className="relative grid gap-6 p-6 sm:p-8">
				{/* Hero */}
				<div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
					<div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl"/>
					<div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"/>
					<div className="relative p-6 sm:p-8">
						<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
							Rails • Stations • Transfers
						</div>
						<h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
							Find the fastest route between stations
						</h1>
						<p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
							Enter a source and destination. Well show transfers by nation and exact station coordinates.
						</p>
					</div>
				</div>

				{/* Search + filters (spacious) */}
				<div className="mx-auto w-full max-w-5xl space-y-3">
					<div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] items-stretch">
						<div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
							<PinIcon className="h-4 w-4 text-muted-foreground"/>
							<span className="text-muted-foreground">From: Pavia (Crown Station)</span>
						</div>
						<button className="inline-flex items-center justify-center rounded-lg border px-3 py-2 hover:bg-muted transition" aria-label="Swap">
							<SwapIcon className="h-4 w-4"/>
						</button>
						<div className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
							<PinIcon className="h-4 w-4 text-muted-foreground"/>
							<span className="text-muted-foreground">To: Icenia (Central)</span>
						</div>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
						<span>Showing optimal route with 1 transfer</span>
						<span>Estimated travel time: 7 min</span>
					</div>
				</div>

				{/* Itinerary */}
				<div className="mx-auto w-full max-w-5xl rounded-xl border bg-background overflow-hidden">
					<div className="p-5">
						<div className="grid gap-4">
							{/* Step 1 */}
							<div className="grid gap-1">
								<div className="flex items-center gap-2">
									<span className="inline-flex h-2 w-2 rounded-full bg-blue-500"/>
									<span className="text-sm font-semibold">Depart: Pavia — Crown Station</span>
								</div>
								<div className="text-xs text-muted-foreground">XYZ: -2300, 64, -350 • Line: Blue</div>
							</div>
							{/* Step 2 */}
							<div className="grid gap-1">
								<div className="flex items-center gap-2">
									<span className="inline-flex h-2 w-2 rounded-full bg-amber-500"/>
									<span className="text-sm font-semibold">Transfer: Estalia — Golden Market</span>
								</div>
								<div className="text-xs text-muted-foreground">XYZ: 2100, 64, 300 • Lines: Blue  b7 Gold</div>
							</div>
							{/* Step 3 */}
							<div className="grid gap-1">
								<div className="flex items-center gap-2">
									<span className="inline-flex h-2 w-2 rounded-full bg-emerald-500"/>
									<span className="text-sm font-semibold">Arrive: Icenia — Central</span>
								</div>
								<div className="text-xs text-muted-foreground">XYZ: -80, 64, -1200 • Line: Gold</div>
							</div>
						</div>
					</div>
				</div>

				{/* Stations directory */}
				<div className="mx-auto w-full max-w-6xl grid gap-3">
					<div className="text-sm text-muted-foreground">Popular stations</div>
					<div className="overflow-hidden rounded-xl border">
						<div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-0 bg-muted/50 text-xs font-medium text-muted-foreground">
							<div className="px-3 py-2">Nation</div>
							<div className="px-3 py-2">Station</div>
							<div className="px-3 py-2">XYZ</div>
							<div className="px-3 py-2">Lines</div>
						</div>
						<div className="divide-y">
							{MOCK_STATIONS.map((s, i) => (
								<div key={`${s.nation}-${i}`} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center">
									<div className="px-3 py-3 inline-flex items-center gap-2">
										<span className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ${s.active ? "bg-emerald-500 ring-emerald-200" : "bg-rose-500 ring-rose-200"}`}/>
										<span className="font-medium">{s.nation}</span>
									</div>
									<div className="px-3 py-3 text-sm">{s.station}</div>
									<div className="px-3 py-3 text-sm">{s.coords.x}, {s.coords.y ?? 64}, {s.coords.z}</div>
									<div className="px-3 py-3 text-xs text-muted-foreground">{s.lines.join(", ")}</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Footer note */}
				<div className="text-center text-[11px] sm:text-xs text-muted-foreground">All content above is mocked for a screenshot preview.</div>
			</div>
		</div>
	);
} 