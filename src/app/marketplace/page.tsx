export const dynamic = "force-dynamic";

import Link from "next/link";
import { shops } from "@/data/shops";
import { getTimestampLocalTimezone } from "@/lib/utils";

const TOP_DEMAND_ITEMS: { name: string; imageUrl: string; requests: number }[] = [
  { name: "Elytra", imageUrl: "https://minecraft.wiki/images/Elytra_%28item%29_JE2_BE2.png", requests: 14 },
  { name: "Mending Book", imageUrl: "https://minecraft.wiki/images/Book_JE2_BE2.png", requests: 22 },
  { name: "Netherite Scrap", imageUrl: "https://minecraft.wiki/images/Netherite_Scrap_JE1_BE1.png", requests: 18 },
  { name: "Golden Carrot (stack)", imageUrl: "https://minecraft.wiki/images/Carrot_JE3_BE2.png", requests: 11 },
  { name: "Rocket (stack)", imageUrl: "https://minecraft.wiki/images/Firework_Rocket_JE2_BE2.gif", requests: 9 },
];

// Mock exchange rates (diamond as base currency)
const RATES = {
  iron_per_diamond: 16,
  diamonds_per_iron: 1 / 16,
  diamonds_per_ancient_debris: 4,
  ancient_debris_per_diamond: 1 / 4,
  diamonds_per_emerald_block: 2,
  emerald_blocks_per_diamond: 1 / 2,
  diamonds_per_essence: 2,
  essence_per_diamond: 1 / 2,
};

export default function MarketplacePage() {
  return (
    <div className="relative space-y-6">
      {/* Ambient page glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"/>
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl"/>
      </div>
      {/* Hero (shorter) */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-blue-500/30 blur-3xl"/>
        <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-emerald-500/30 blur-3xl"/>
        <div className="relative grid gap-2 p-5 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Marketplace</h1>
          {/* <p className="text-white/70 max-w-2xl text-sm sm:text-base">Discover player shops across Civhub.</p> */}
        </div>
      </div>

      {/* Content grid with sticky sidebar */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Left: shops */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop) => (
            <Link
              href={`/shop/${shop.id}`}
              key={shop.id}
              className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg"
            >
              {/* Top banner with shop image */}
              <div className="relative aspect-[16/8] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shop.imageUrl}
                  alt={shop.name}
                  className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                />
                {/* Owner + nation pill overlay */}
                <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-2 py-1 shadow-sm">
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[160px]">{shop.ownerUsername}</span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-xs text-slate-700 truncate max-w-[160px]">{shop.nationName}</span>
                </div>
              </div>
              <div className="p-2.5 space-y-2">
                <div className="space-y-0.5">
                  <div className="text-sm sm:text-base font-semibold leading-tight truncate">{shop.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{shop.description}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span>XYZ: {shop.coords.x}, {shop.coords.y}, {shop.coords.z}</span>
                    <span>·</span>
                    <span>Items: {shop.itemCount}</span>
                    <span>·</span>
                    <span>Reviews: {shop.reviewsCount}</span>
                    <span>·</span>
                    <span>Updated: {getTimestampLocalTimezone(shop.updatedAt)}</span>
                  </div>
                </div>

                <div className="pt-0.5">
                  <span className="inline-block h-8 sm:h-9 rounded-md border px-2.5 sm:px-3 text-xs sm:text-sm">View shop</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Right: sticky insights */}
        <aside className="relative">
          <div className="sticky top-4">
            <div className="rounded-xl border overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2">
                <div className="text-sm font-semibold">Top demand items</div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto divide-y">
                {TOP_DEMAND_ITEMS.map((it) => (
                  <div key={it.name} className="flex items-center gap-3 px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.imageUrl} alt={it.name} className="h-6 w-6 object-contain" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">Requests: {it.requests}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-4" />

            <div className="rounded-xl border overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2">
                <div className="text-sm font-semibold">Exchange rates</div>
                <div className="text-[11px] text-muted-foreground">Diamond is the base currency</div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto divide-y">
                {/* Iron ⇄ Diamond */}
                <RateRow
                  leftImg="https://minecraft.wiki/images/Iron_Ingot_JE3_BE2.png"
                  leftLabel="Iron"
                  rightImg="/images/Diamond_JE3_BE3.png"
                  rightLabel="Diamond"
                  leftPerRight={RATES.iron_per_diamond}
                  rightPerLeft={RATES.diamonds_per_iron}
                />
                {/* Ancient Debris ⇄ Diamond */}
                <RateRow
                  leftImg="https://minecraft.wiki/images/Ancient_Debris_JE2_BE2.png"
                  leftLabel="Ancient Debris"
                  rightImg="/images/Diamond_JE3_BE3.png"
                  rightLabel="Diamond"
                  leftPerRight={RATES.ancient_debris_per_diamond}
                  rightPerLeft={RATES.diamonds_per_ancient_debris}
                />
                {/* Emerald Block ⇄ Diamond */}
                <RateRow
                  leftImg="https://minecraft.wiki/images/Emerald_Block_JE3_BE3.png"
                  leftLabel="Emerald Block"
                  rightImg="/images/Diamond_JE3_BE3.png"
                  rightLabel="Diamond"
                  leftPerRight={RATES.emerald_blocks_per_diamond}
                  rightPerLeft={RATES.diamonds_per_emerald_block}
                />
                {/* Essence (Eye of Ender) ⇄ Diamond */}
                <RateRow
                  leftImg="/images/Eye_of_Ender_JE2_BE2.png"
                  leftLabel="Essence"
                  rightImg="/images/Diamond_JE3_BE3.png"
                  rightLabel="Diamond"
                  leftPerRight={RATES.essence_per_diamond}
                  rightPerLeft={RATES.diamonds_per_essence}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer hint */}
      <div className="text-center text-[11px] sm:text-xs text-muted-foreground">Browse player-run shops.</div>
    </div>
  );
}

function RateRow({
  leftImg,
  leftLabel,
  rightImg,
  rightLabel,
  leftPerRight,
  rightPerLeft,
}: {
  leftImg: string;
  leftLabel: string;
  rightImg: string;
  rightLabel: string;
  leftPerRight: number;
  rightPerLeft: number;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={leftImg} alt={leftLabel} className="h-6 w-6 object-contain" />
      <div className="text-xs text-foreground min-w-0">
        1 {rightLabel} = <span className="font-medium">{formatRate(leftPerRight)}</span> {leftLabel}
        <div className="text-[11px] text-muted-foreground">1 {leftLabel} = {formatRate(rightPerLeft)} {rightLabel}</div>
      </div>
      <div className="ml-auto flex items-center gap-2 text-muted-foreground text-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={rightImg} alt={rightLabel} className="h-5 w-5 object-contain" />
        <span className="hidden sm:inline">{rightLabel}</span>
      </div>
    </div>
  );
}

function formatRate(n: number) {
  return Number.isInteger(n) ? n : Number(n.toFixed(3));
} 