"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getTimestampLocalTimezone } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import type { DbShop } from "@/data/shops-db";

// Resolve a banner URL possibly stored as a Supabase Storage path
function resolveBannerUrl(bannerUrl: string | null | undefined) {
  if (!bannerUrl) return "/images/default_settlement.jpg";
  if (/^https?:\/\//i.test(bannerUrl)) return bannerUrl;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/images/default_settlement.jpg";
  return `${base}/storage/v1/object/public/shop-images/${bannerUrl}`;
}

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

type SortKey = "updated" | "reviews" | "items" | "name" | "price";

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
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [shops, setShops] = useState<DbShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({});
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [itemsByShop, setItemsByShop] = useState<Record<string, { id: string; name: string; price: number; currency: string | null; unit: string; stock: number | null }[]>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    async function loadShops() {
      setLoading(true);
      const sb = getSupabaseBrowser();
      const { data } = await sb
        .from("shops")
        .select("id,owner_id,shop_name,world,x,y,z,description,is_active,last_updated,created_at,updated_at,banner_url")
        .eq("is_active", true)
        .order("last_updated", { ascending: false });
      setShops((data ?? []) as unknown as DbShop[]);
      setLoading(false);
    }
    loadShops();
  }, []);

  useEffect(() => {
    async function loadCounts() {
      const ids = shops.map((s) => s.id);
      if (ids.length === 0) { setItemCounts({}); setReviewCounts({}); return; }
      const sb = getSupabaseBrowser();
      if (!sb) { setItemCounts({}); setReviewCounts({}); return; }
      // Items count per shop
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
      // Reviews count per shop (best-effort)
      try {
        const { data: reviewRows } = await sb
          .from("shop_reviews")
          .select("shop_id")
          .in("shop_id", ids);
        const revMap: Record<string, number> = {};
        for (const r of (reviewRows ?? []) as Array<{ shop_id: string }>) {
          revMap[r.shop_id] = (revMap[r.shop_id] ?? 0) + 1;
        }
        setReviewCounts(revMap);
      } catch {
        setReviewCounts({});
      }
    }
    loadCounts();
  }, [shops]);

  useEffect(() => {
    async function loadOwners() {
      const ownerIds = Array.from(new Set(shops.map((s) => s.owner_id)));
      if (ownerIds.length === 0) { setOwnerNames({}); return; }
      const sb = getSupabaseBrowser();
      if (!sb) { setOwnerNames({}); return; }
      const { data } = await sb.from("profiles").select("id,username").in("id", ownerIds);
      const map: Record<string, string> = {};
      for (const r of (data ?? []) as Array<{ id: string; username: string | null }>) {
        if (r && r.id) map[r.id] = r.username ?? r.id.slice(0, 6);
      }
      setOwnerNames(map);
    }
    loadOwners();
  }, [shops]);

  useEffect(() => {
    type SupaShopItemRow = {
      id: string;
      shop_id: string;
      item_name: string | null;
      price_per_unit: number | null;
      currency_name: string | null;
      unit: string | null;
      stock_qty: number | null;
      items?: { display_name?: string | null; name?: string | null } | null;
    };
    async function loadItems() {
      const ids = shops.map((s) => s.id);
      if (ids.length === 0) { setItemsByShop({}); return; }
      const sb = getSupabaseBrowser();
      if (!sb) { setItemsByShop({}); return; }
      const { data } = await sb
        .from("shop_items")
        .select("id,shop_id,item_name,item_id,price_per_unit,currency_name,unit,stock_qty,items(display_name,name)")
        .in("shop_id", ids)
        .eq("is_listed", true)
        .order("updated_at", { ascending: false });
      const map: Record<string, { id: string; name: string; price: number; currency: string | null; unit: string; stock: number | null }[]> = {};
      for (const r of (data ?? []) as Array<SupaShopItemRow>) {
        const n = r.item_name ?? r.items?.display_name ?? r.items?.name ?? "Item";
        const entry = {
          id: r.id,
          name: n,
          price: Number(r.price_per_unit ?? 0),
          currency: r.currency_name ?? null,
          unit: r.unit ?? "item",
          stock: r.stock_qty ?? null,
        };
        const arr = map[r.shop_id] ?? [];
        arr.push(entry);
        map[r.shop_id] = arr;
      }
      setItemsByShop(map);
    }
    loadItems();
  }, [shops]);

  const filteredSortedShops = useMemo(() => {
    const query = debouncedQ.trim().toLowerCase();
    // Filter
    const filtered = shops.filter((shop: DbShop) => {
      const items = itemsByShop[shop.id] ?? [];
      const shopMatches = query ? (shop.shop_name.toLowerCase().includes(query) || (shop.description ?? "").toLowerCase().includes(query)) : true;
      const itemMatches = items.some((it) => {
        const nameOk = query ? it.name.toLowerCase().includes(query) : true;
        if (!nameOk) return false;
        return true;
      });
      return shopMatches || itemMatches;
    });

    // Sort
    const sorted = [...filtered];
    sorted.sort((a: DbShop, b: DbShop) => {
      if (sortKey === "updated") {
        return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
      }
      if (sortKey === "reviews") {
        return 0;
      }
      if (sortKey === "items") {
        return 0;
      }
      if (sortKey === "name") {
        return a.shop_name.localeCompare(b.shop_name);
      }
      if (sortKey === "price") {
        // With currency chips removed, default to no-op sort for price
        return 0;
      }
      return 0;
    });

    return sorted;
  }, [debouncedQ, itemsByShop, sortKey, shops]);

  function matchedItemsForShop(shopId: string, query: string) {
    const ql = query.trim().toLowerCase();
    if (!ql) return [] as { id: string; name: string }[];
    const items = itemsByShop[shopId] ?? [];
    const filtered = items.filter((it) => {
      const nameOk = it.name.toLowerCase().includes(ql);
      if (!nameOk) return false;
      return true;
    });
    return filtered.slice(0, 3).map((it) => ({ id: it.id, name: it.name }));
  }

  function clearFilters() {
    setQ("");
    setSortKey("updated");
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
            {/* <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">Top demand items</span> */}
          </div>
        </div>
      </div>
      {/* Search & Filters */}
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
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
            <div className="inline-flex flex-wrap gap-2">
              <Link href="/my-shops" className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100">
                Manage shops
              </Link>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="market-sort" className="text-xs text-muted-foreground">Sort</label>
              <select
                id="market-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
                aria-label="Sort shops"
                title={sortKey === "price" ? "Price sort requires a selected currency (coming soon)" : undefined}
              >
                <option value="updated">Recently updated</option>
                <option value="reviews">Most reviews</option>
                <option value="items">Most items</option>
                <option value="name">Name (A→Z)</option>
                <option value="price" disabled>Lowest price</option>
              </select>
              <button onClick={clearFilters} className="h-8 rounded-md border bg-background px-2 text-xs">Clear</button>
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
                <img
                  src={resolveBannerUrl((shop as unknown as { banner_url?: string | null }).banner_url)}
                  alt={shop.shop_name}
                  className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                />
                {/* Owner pill overlay */}
                <div className="absolute top-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-2 py-1 shadow-sm">
                  <span className="text-xs font-medium text-slate-900 truncate max-w-[160px]">{ownerNames[shop.owner_id] ?? "Owner"}</span>
                </div>
              </div>
              <div className="p-2.5 flex-1 flex flex-col gap-2">
                <div className="space-y-0.5">
                  <div className="text-sm sm:text-base font-semibold leading-tight line-clamp-2">{highlight(shop.shop_name, debouncedQ)}</div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] bg-slate-50 text-slate-700 border-slate-200">XYZ: {shop.x},{shop.y ?? "~"},{shop.z}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] bg-slate-50 text-slate-700 border-slate-200">Items: {itemCounts[shop.id] ?? 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-3">{shop.description ?? ""}</div>
                  {debouncedQ.trim() ? (
                    (() => {
                      const matches = matchedItemsForShop(shop.id, debouncedQ);
                      if (!matches.length) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {matches.map((m) => (
                            <span key={m.id} className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] bg-slate-50 text-slate-700 border-slate-200">{highlight(m.name, debouncedQ)}</span>
                          ))}
                        </div>
                      );
                    })()
                  ) : null}
                </div>

                <div className="pt-0.5 mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Reviews: {reviewCounts[shop.id] ?? 0}</div>
                    <span className="inline-block h-8 sm:h-9 rounded-md border px-2.5 sm:px-3 text-xs sm:text-sm">View shop</span>
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
            {/* <div className="rounded-xl border overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2">
                <div className="text-sm font-semibold">Top demand items</div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto divide-y">
                {TOP_DEMAND_ITEMS.map((it) => (
                  <div key={it.name} className="flex items-center gap-3 px-4 py-3">
                    <Image src={it.imageUrl} alt={it.name} width={24} height={24} className="h-6 w-6 object-contain" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">Requests: {it.requests}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}

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
      <Image src={leftImg} alt={leftLabel} width={24} height={24} className="h-6 w-6 object-contain" />
      <div className="text-xs text-foreground min-w-0">
        1 {rightLabel} = <span className="font-medium">{formatRate(leftPerRight)}</span> {leftLabel}
        <div className="text-[11px] text-muted-foreground">1 {leftLabel} = {formatRate(rightPerLeft)} {rightLabel}</div>
      </div>
      <div className="ml-auto flex items-center gap-2 text-muted-foreground text-xs">
        <Image src={rightImg} alt={rightLabel} width={20} height={20} className="h-5 w-5 object-contain" />
        <span className="hidden sm:inline">{rightLabel}</span>
      </div>
    </div>
  );
}

function formatRate(n: number) {
  return Number.isInteger(n) ? n : Number(n.toFixed(3));
} 