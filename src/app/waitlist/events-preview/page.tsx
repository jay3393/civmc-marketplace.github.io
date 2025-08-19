"use client";

// Events Preview (mocked) — for promo/screenshot under /waitlist
// Goal: single hub for server-wide events (live + scheduled). UI-only, screenshot-ready.

function LiveDot({ className = "h-2.5 w-2.5" }: { className?: string }) {
	return (
		<span className="relative inline-flex items-center justify-center">
			<span className={`absolute inline-flex h-4 w-4 animate-ping rounded-full bg-rose-400/60`} />
			<span className={`relative inline-flex rounded-full ${className} bg-rose-500`} />
		</span>
	);
}

function CalendarIcon({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
			<path d="M7 2h2v3H7V2zm8 0h2v3h-2V2zM4 6h16v14H4V6zm2 2v10h12V8H6z"/>
		</svg>
	);
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
			<path d="M10 4a6 6 0 014.472 9.999l4.264 4.265-1.414 1.414-4.265-4.264A6 6 0 1110 4zm0 2a4 4 0 100 8 4 4 0 000-8z"/>
		</svg>
	);
}

type EventItem = {
	title: string;
	host: string;
	when: string; // formatted
	location: string;
	category: "Wedding" | "Party" | "War" | "Tournament" | "Trade Fair" | "Other";
	status: "Live" | "Upcoming";
	description: string;
	discordUrl: string;
	imageUrl?: string;
};

const CATEGORY_COLORS: Record<EventItem["category"], string> = {
	Wedding: "bg-pink-50 text-pink-700 border-pink-200",
	Party: "bg-violet-50 text-violet-700 border-violet-200",
	War: "bg-rose-50 text-rose-700 border-rose-200",
	Tournament: "bg-amber-50 text-amber-700 border-amber-200",
	"Trade Fair": "bg-emerald-50 text-emerald-700 border-emerald-200",
	Other: "bg-slate-50 text-slate-700 border-slate-200",
};

const MOCK_EVENTS: EventItem[] = [
	{
		title: "Wedding Ceremony: Snowspire Overlook",
		host: "femboysilly",
		when: "Live now",
		location: "Heikki — Snowspire",
		category: "Wedding",
		status: "Live",
		description: "Join us atop Snowspire for vows, fireworks, and cake. All welcome!",
		discordUrl: "#",
		imageUrl: "https://media.discordapp.net/attachments/1405047462938546206/1405128438381285406/2025-08-13_09.34.46.png?ex=68a59c55&is=68a44ad5&hm=cf0420db0131a9de92f0cead199d3ffe0f4ad25a62fd0ed7ebefdc71ac944fed&=&format=webp&quality=lossless&width=2566&height=1444",
	},
	{
		title: "Wedding Ceremony: Heikki — Snowspire",
		host: "femboysilly",
		when: "Today 20:00 UTC",
		location: "Icenia — Arena",
		category: "Tournament",
		status: "Upcoming",
		description: "Bracket play continues. Bring your A-game and your fans!",
		discordUrl: "#",
		imageUrl: "https://cdn.discordapp.com/attachments/1405047462938546206/1405047901784248480/Screenshot_2025-08-13_000812.png?ex=68a5fa14&is=68a4a894&hm=e738686314035428a7d5b99ae1ec9862cf022b05639385d421ea43ceab76eef4&",
	},
	{
		title: "Trade Fair Weekend",
		host: "Pavia Merchants Guild",
		when: "Aug 30, 18:00 UTC",
		location: "Pavia — Crown Ward Market",
		category: "Trade Fair",
		status: "Upcoming",
		description: "Stalls, auctions, and rare goods. Vendor registration open now.",
		discordUrl: "#",
		imageUrl: "https://media.discordapp.net/attachments/1405047462938546206/1405127532839178351/2025-08-13_09.31.56.png?ex=68a59b7d&is=68a449fd&hm=2374f110331b4b5945d571ce42b394fc5e3189ad7a11b66730e89c4687f025b2&=&format=webp&quality=lossless&width=2566&height=1444",
	},
	{
		title: "War Council: Southern Pact",
		host: "Estalia Defense",
		when: "Aug 28, 21:00 UTC",
		location: "Estalia — Golden Keep",
		category: "War",
		status: "Upcoming",
		description: "Strategic briefing and alliance coordination. Limited attendance.",
		discordUrl: "#",
		imageUrl: "https://iili.io/FpVPr1R.png",
	},
];

function CategoryBadge({ category }: { category: EventItem["category"] }) {
	return (
		<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${CATEGORY_COLORS[category]}`}>{category}</span>
	);
}

function LiveBadge({ status }: { status: EventItem["status"] }) {
	if (status !== "Live") return null;
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
			<LiveDot className="h-2 w-2" />
			Live now
		</span>
	);
}

export default function EventsPreviewPage() {
	return (
		<div className="relative min-h-screen w-full overflow-auto">
			{/* Ambient glow */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"/>
				<div className="absolute top-1/3 -right-24 h-[22rem] w-[22rem] rounded-full bg-indigo-500/20 blur-3xl"/>
				<div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl"/>
			</div>

			<div className="relative grid gap-6 p-6 sm:p-8">
				{/* Hero */}
				<div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
					<div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-rose-500/30 blur-3xl"/>
					<div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-violet-500/30 blur-3xl"/>
					<div className="relative p-6 sm:p-8">
						<div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
							Events • Live • Scheduled
						</div>
						<h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
							One place to see everything happening on the server
						</h1>
						<p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
							From birthdays to weddings to wars — discover whats live and whats next.
						</p>
						<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs text-white/80">
							<LiveDot className="h-2 w-2"/> Live indicators update in real time
						</div>
					</div>
				</div>

				{/* Search + filters */}
				<div className="mx-auto w-full max-w-5xl space-y-3">
					<div className="inline-flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2">
						<SearchIcon className="h-4 w-4 text-muted-foreground"/>
						<span className="text-muted-foreground">Search events, hosts, locations…</span>
					</div>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<div className="inline-flex items-center gap-2 rounded-md border px-1.5 py-1 text-xs">
							<button className="rounded px-2 py-0.5 bg-muted">All</button>
							<button className="rounded px-2 py-0.5">Live</button>
							<button className="rounded px-2 py-0.5">Upcoming</button>
						</div>
						<div className="inline-flex flex-wrap gap-2">
							{(Object.keys(CATEGORY_COLORS) as EventItem["category"][]).map((c) => (
								<span key={c} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${CATEGORY_COLORS[c]}`}>{c}</span>
							))}
						</div>
					</div>
				</div>

				{/* Event list */}
				<div className="mx-auto w-full max-w-5xl divide-y rounded-xl border bg-background overflow-hidden">
					{MOCK_EVENTS.map((e, idx) => (
						<div key={`${e.title}-${idx}`} className="relative grid gap-2 p-4 sm:p-5">
							{/* Accent by status */}
							<div className={`absolute inset-y-0 left-0 w-[3px] ${e.status === "Live" ? "bg-rose-400" : "bg-slate-300"}`}/>

							<div className="flex flex-wrap items-center gap-2 pl-2 sm:pl-3">
								{e.status === "Live" ? <LiveBadge status="Live" /> : <span className="inline-flex items-center gap-1 rounded-full border bg-white/85 backdrop-blur px-2 py-0.5 text-[11px] text-slate-900"><CalendarIcon className="h-3.5 w-3.5"/> {e.when}</span>}
								<CategoryBadge category={e.category} />
								<span className="text-xs text-muted-foreground">Host: <span className="font-medium">{e.host}</span></span>
							</div>

							<div className="pl-2 sm:pl-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
								<div className="min-w-0 space-y-1">
									<div className="text-base font-semibold leading-tight line-clamp-2">{e.title}</div>
									<div className="text-xs text-muted-foreground">{e.location}</div>
									<p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
								</div>
								{e.imageUrl ? (
									<div className="hidden sm:block shrink-0">
										<div className="relative h-20 w-36 overflow-hidden rounded border bg-muted/50">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img src={e.imageUrl} alt="event" className="absolute inset-0 h-full w-full object-cover" />
										</div>
									</div>
								) : null}
							</div>

							<div className="pl-2 sm:pl-3 flex items-center justify-between text-xs text-muted-foreground">
								<span>{e.status === "Live" ? "Happening now" : e.when}</span>
								<button className="h-8 rounded-md border bg-blue-600 text-white px-3 text-xs hover:bg-blue-500 transition">Open in Discord</button>
							</div>
						</div>
					))}
				</div>

				{/* Footer note */}
				<div className="p-6 text-center text-[11px] sm:text-xs text-muted-foreground">All content above is mocked for a screenshot preview.</div>
			</div>
		</div>
	);
} 