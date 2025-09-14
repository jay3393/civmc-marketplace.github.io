"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTimestampLocalTimezone } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import type { DbShop } from "@/data/shops-db";

// Resolve a banner URL possibly stored as a Supabase Storage path
function resolveBannerUrl(bannerUrl: string | null | undefined) {
  if (!bannerUrl) return "/images/default_settlement.jpg";
  if (/^https?:\/\//i.test(bannerUrl)) return bannerUrl;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/images/default_settlement.jpg";
  return `${base}/storage/v1/object/public/shop-images/${bannerUrl}`;
}

// Exchange rates displayed in the sidebar
const RATES = {
  iron_per_diamond: 8,
  ancient_debris_per_diamond: 1 / 5,
  xp_blocks_per_diamond: 1 / 2.5,
  essence_per_diamond: 5 / 2,
};

const EXCHANGE_ITEMS_MAP = {
  iron_ingot: {
    name: "Iron Ingot",
    image: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/refs/heads/master/data/1.21.1/items/iron_ingot.png",
  },
  diamonds: {
    name: "Diamond",
    image: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/refs/heads/master/data/1.21.1/items/diamond.png",
  },
  ancient_debris: {
    name: "Ancient Debris",
    image: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/refs/heads/master/data/1.21.1/blocks/ancient_debris_top.png",
  },
  emerald_block: {
    name: "XP Block",
    image: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/refs/heads/master/data/1.21.1/blocks/emerald_block.png",
  },
  essence: {
    name: "Essence",
    image: "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/refs/heads/master/data/1.21.1/items/ender_eye.png",
  },
};

type SortKey = "updated" | "name" | "items" | "reviews" | "price";

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-200/60 text-inherit rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

export default function MarketplacePage() {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [shops, setShops] = useState<DbShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});

  async function fetchShopsApi(params: { q: string; sortKey: SortKey }) {
    const { q, sortKey } = params;
    const sb = getSupabaseBrowser();
    // Map sort
    const order = (() => {
      if (sortKey === "name") return { column: "shop_name", ascending: true } as const;
      // Default to updated
      return { column: "last_updated", ascending: false } as const;
    })();

    const baseSelect = "id,owner_id,shop_name,world,x,y,z,description,is_active,last_updated,created_at,updated_at,banner_url";

    // 1) Match by shop fields
    let shopMatches: DbShop[] = [];
    if (q.trim()) {
      const pattern = `%${q.trim()}%`;
      const { data } = await sb
        .from("shops")
        .select(baseSelect)
        .or(`shop_name.ilike.${pattern},description.ilike.${pattern}`)
        .eq("is_active", true)
        .order(order.column, { ascending: order.ascending });
      shopMatches = (data ?? []) as unknown as DbShop[];
    } else {
      const { data } = await sb
        .from("shops")
        .select(baseSelect)
        .eq("is_active", true)
        .order(order.column, { ascending: order.ascending });
      shopMatches = (data ?? []) as unknown as DbShop[];
    }

    // 2) Match by item names (shop_items), using free-text item_name only
    let itemShopIds: string[] = [];
    if (q.trim()) {
      const pattern = `%${q.trim()}%`;
      const { data: items } = await sb
        .from("shop_items")
        .select("shop_id")
        .eq("is_listed", true)
        .or(`output_item_name.ilike.${pattern}`);
      const ids = new Set<string>();
      for (const r of (items ?? []) as Array<{ shop_id: string }>) ids.add(r.shop_id);
      itemShopIds = Array.from(ids);
    }

    // 3) Final fetch of union IDs (to ensure server-side order)
    const idSet = new Set<string>(shopMatches.map((s) => s.id));
    for (const id of itemShopIds) idSet.add(id);
    let finalShops: DbShop[] = shopMatches;
    if (idSet.size > 0 && (itemShopIds.length > 0 || q.trim())) {
      const ids = Array.from(idSet);
      const { data } = await sb
        .from("shops")
        .select(baseSelect)
        .in("id", ids)
        .order(order.column, { ascending: order.ascending });
      finalShops = (data ?? []) as unknown as DbShop[];
    }

    setShops(finalShops);
  }

  async function runSearch(nextQ?: string, nextSort?: SortKey) {
    setLoading(true);
    try {
      await fetchShopsApi({ q: nextQ ?? q, sortKey: nextSort ?? sortKey });
    } finally {
      setLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    runSearch("", "updated");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load counts and owners when shops change
  useEffect(() => {
    async function loadCounts() {
      const ids = shops.map((s) => s.id);
      if (ids.length === 0) { setItemCounts({}); return; }
      const sb = getSupabaseBrowser();
      const { data: itemsRows } = await sb
        .from("shop_items")
        .select("shop_id")
        .in("shop_id", ids)
        .eq("is_listed", true);
      const itemsMap: Record<string, number> = {};
      for (const r of (itemsRows ?? []) as Array<{ shop_id: string }>) {
        itemsMap[r.shop_id] = (itemsMap[r.shop_id] ?? 0) + 1;
      }
      setItemCounts(itemsMap);
    }
    loadCounts();
  }, [shops]);

  useEffect(() => {
    async function loadOwners() {
      const ownerIds = Array.from(new Set(shops.map((s) => s.owner_id)));
      if (ownerIds.length === 0) { setOwnerNames({}); return; }
      const sb = getSupabaseBrowser();
      // Try to load optional minecraft username if present; fall back gracefully
      let data: unknown[] | null = null;
      try {
        const resp = await sb.from("profiles").select("id,username").in("id", ownerIds);
        data = (resp.data ?? []) as unknown[];
      } catch {
        const resp = await sb.from("profiles").select("id,username").in("id", ownerIds);
        data = (resp.data ?? []) as unknown[];
      }
      const names: Record<string, string> = {};
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        const id = String(row.id ?? "");
        if (!id) continue;
        const uname = (row.username as string | null) ?? null;
        names[id] = uname ?? id.slice(0, 6);
      }
      setOwnerNames(names);
    }
    loadOwners();
  }, [shops]);

  // Disable client-side filtering; just render shops
  const filteredSortedShops = useMemo(() => shops, [shops]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch();
  }

  return (
  <div className="relative min-h-screen w-full">

      <div className="relative grid gap-6 p-6 sm:p-8">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl"/>
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"/>
        <div className="relative p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90">
            Marketplace
          </div>
          <h1 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-white">
            Browse shops, find items, and exchange resources server wide.
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/80">
            Buy and sell items in player-run shops – a player-driven economy for CivMC.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">Player-run shops</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">Exchange rates</span>
          </div>
        </div>
      </div>
      {/* Search & Filters */}
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-3">
          <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleSearchSubmit}>
            <div className="flex-1 inline-flex items-center rounded-lg border bg-background px-3 py-2">
              <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by item or shop name…"
                className="ml-2 w-full bg-transparent outline-none text-sm"
                aria-label="Search marketplace"
              />
            </div>
            <button type="submit" className="h-9 w-9 rounded-md border bg-white text-black inline-flex items-center justify-center" aria-label="Search">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
            </button>
          </form>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="inline-flex flex-wrap gap-2">
              <Link href="/my-shops" className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm hover:bg-slate-50">
                Manage shops
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="market-sort" className="text-xs text-muted-foreground">Sort</label>
              <select
                id="market-sort"
                value={sortKey}
                onChange={(e) => { const v = e.target.value as SortKey; setSortKey(v); runSearch(undefined, v); }}
                className="h-8 rounded-md border bg-background px-2 text-xs"
                aria-label="Sort shops"
              >
                <option value="updated">Recently updated</option>
                <option value="name">Name (A→Z)</option>
                <option value="items" disabled>Most items</option>
                <option value="reviews" disabled>Most reviews</option>
                <option value="price" disabled>Lowest price</option>
              </select>
              <button onClick={() => { setQ(""); setSortKey("updated"); runSearch("", "updated"); }} className="h-8 rounded-md border bg-background px-2 text-xs">Clear</button>
            </div>
          </div>
        </div>
      </div>
      

      {/* Content grid with sticky sidebar */}
      <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
        {/* Left: shops */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(loading ? [] : filteredSortedShops).map((shop) => (
            <Link
              href={`/shop/${shop.id}`}
              key={shop.id}
              className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg h-72 flex flex-col"
            >
              {/* Top banner with shop image */}
              <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <Image
                  fill
                  src={resolveBannerUrl((shop as unknown as { banner_url?: string | null }).banner_url)}
                  alt={shop.shop_name}
                  className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                />
                {/* Owner chip (top-left) */}
                <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/90 backdrop-blur px-2 py-1 text-xs shadow-sm text-slate-900 max-w-[60%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://minotar.net/helm/${encodeURIComponent(ownerNames[shop.owner_id] ?? "user")}/100.png`}
                    alt="Owner avatar"
                    className="h-4 w-4 rounded-sm"
                  />
                  <span className="truncate">{ownerNames[shop.owner_id] ?? "Owner"}</span>
                </div>
                {/* XYZ chip (top-right) */}
                <div className="absolute top-2 right-2 inline-flex items-center gap-2 rounded-full border bg-white/90 backdrop-blur px-2 py-1 text-xs shadow-sm text-slate-900">
                  XYZ: {shop.x},{shop.y ?? "~"},{shop.z}
                </div>
              </div>
              <div className="p-2.5 flex-1 flex flex-col gap-2">
                <div className="space-y-0.5">
                  <div className="text-sm sm:text-base font-semibold leading-tight line-clamp-2">{highlight(shop.shop_name, q)}</div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-2 rounded-full border bg-white px-2 py-1 text-xs shadow-sm text-slate-900">Items for exchange: {itemCounts[shop.id] ?? 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-3">{highlight(shop.description ?? "", q)}</div>
                </div>

                <div className="pt-0.5 mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground" />
                    <span className="inline-flex items-center justify-center h-8 sm:h-9 rounded-md border px-2.5 sm:px-3 text-xs sm:text-sm hover:brightness-200">View shop</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Updated: {getTimestampLocalTimezone(shop.last_updated)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Right: sticky insights */}
        <aside className="relative">
          <div className="sticky top-4">
            <div className="h-4" />
            <div className="rounded-xl border overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2">
                <div className="text-sm font-semibold">Exchange rates</div>
                <div className="text-[11px] text-muted-foreground">Diamond is the base currency</div>
                <div className="text-[11px] text-muted-foreground">Exchange rates are subject to change</div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto divide-y">
                <RateRow
                  leftImg={EXCHANGE_ITEMS_MAP.iron_ingot.image}
                  leftLabel={EXCHANGE_ITEMS_MAP.iron_ingot.name}
                  rightImg={EXCHANGE_ITEMS_MAP.diamonds.image}
                  rightLabel={EXCHANGE_ITEMS_MAP.diamonds.name}
                  leftPerRight={RATES.iron_per_diamond}
                  rightPerLeft={1 / RATES.iron_per_diamond}
                />
                <RateRow
                  leftImg={EXCHANGE_ITEMS_MAP.ancient_debris.image}
                  leftLabel={EXCHANGE_ITEMS_MAP.ancient_debris.name}
                  rightImg={EXCHANGE_ITEMS_MAP.diamonds.image}
                  rightLabel={EXCHANGE_ITEMS_MAP.diamonds.name}
                  leftPerRight={RATES.ancient_debris_per_diamond}
                  rightPerLeft={1 / RATES.ancient_debris_per_diamond}
                />
                <RateRow
                  leftImg={EXCHANGE_ITEMS_MAP.emerald_block.image}
                  leftLabel={EXCHANGE_ITEMS_MAP.emerald_block.name}
                  rightImg={EXCHANGE_ITEMS_MAP.diamonds.image}
                  rightLabel={EXCHANGE_ITEMS_MAP.diamonds.name}
                  leftPerRight={RATES.xp_blocks_per_diamond}
                  rightPerLeft={1 / RATES.xp_blocks_per_diamond}
                />
                <RateRow
                  leftImg={EXCHANGE_ITEMS_MAP.essence.image}
                  leftLabel={EXCHANGE_ITEMS_MAP.essence.name}
                  rightImg={EXCHANGE_ITEMS_MAP.diamonds.image}
                  rightLabel={EXCHANGE_ITEMS_MAP.diamonds.name}
                  leftPerRight={RATES.essence_per_diamond}
                  rightPerLeft={1 / RATES.essence_per_diamond}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer hint */}
      <div className="text-center text-[11px] sm:text-xs text-muted-foreground">Browse player-run shops.</div>
    </div>
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
      {/* separate into three rows to show the images on the same row and two other rows for the exchange rates */}
      <div className="flex items-center gap-3">
        <Image src={leftImg} alt={leftLabel} width={24} height={24} className="h-6 w-6 object-contain" />
      </div>
      <div className="text-xs text-foreground min-w-0">
        <div className="font-medium">{formatRate(leftPerRight)} {leftLabel} = <span className="font-medium"> 1</span> {rightLabel}</div>
        <div className="text-[11px] text-muted-foreground">1 {leftLabel} = {formatRate(rightPerLeft)} {rightLabel}</div>
      </div>
      <div className="ml-auto flex items-center gap-2 text-muted-foreground text-xs">
        <Image src={rightImg} alt={rightLabel} width={20} height={20} className="h-5 w-5 object-contain" />
      </div>
    </div>
  );
}

function formatRate(n: number) {
  return Number.isInteger(n) ? n : Number(n.toFixed(3));
} 