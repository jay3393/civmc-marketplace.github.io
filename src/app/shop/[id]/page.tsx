"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { shops, shopItems } from "@/data/shops";
import { getTimestampLocalTimezone } from "@/lib/utils";

const CURRENCY_IMAGES: Record<string, string> = {
  diamond: "/images/Diamond_JE3_BE3.png",
  emerald: "/images/Emerald_JE3_BE3.png",
  essence: "/images/Eye_of_Ender_JE2_BE2.png",
};

export default function ShopDetailPage() {
  const params = useParams();
  const shopId = String(params?.id ?? "");
  const shop = useMemo(() => shops.find((s) => s.id === shopId), [shopId]);
  const items = useMemo(() => shopItems.filter((i) => i.shopId === shopId), [shopId]);

  if (!shopId) return <div className="text-sm text-muted-foreground">Invalid shop.</div>;
  if (!shop) return <div className="text-sm text-muted-foreground">Shop not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/marketplace" className="text-sm text-muted-foreground hover:underline">← Back to marketplace</Link>
      </div>

      {/* Header */}
      <div className="grid gap-3">
        <div className="relative overflow-hidden rounded-xl border">
          <div className="relative aspect-[16/6] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shop.imageUrl} alt={shop.name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute bottom-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-2 py-1 shadow-sm">
              <span className="text-xs font-medium text-slate-900 truncate max-w-[180px]">{shop.ownerUsername}</span>
              <span className="text-[10px] text-slate-600">·</span>
              <span className="text-xs text-slate-700 truncate max-w-[180px]">{shop.nationName}</span>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold leading-tight">{shop.name}</h1>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span>XYZ: {shop.coords.x}, {shop.coords.y}, {shop.coords.z}</span>
            <span>·</span>
            <span>Items: {shop.itemCount}</span>
            <span>·</span>
            <span>Reviews: {shop.reviewsCount}</span>
            <span>·</span>
            <span>Updated: {getTimestampLocalTimezone(shop.updatedAt)}</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{shop.description}</p>
        </div>
      </div>

      {/* Items grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No items available.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg">
              {/* Exchange layout */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
                {/* Left: currency given */}
                <div className="flex flex-col items-center text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={CURRENCY_IMAGES[item.currency] || CURRENCY_IMAGES.diamond} alt={item.currency} className="h-12 w-12 object-contain" />
                  <div className="text-xs text-muted-foreground">You give</div>
                  <div className="text-sm font-semibold">{item.price} {item.currency === "diamond" ? "diamonds" : item.currency}</div>
                </div>
                {/* Arrow */}
                <div className="text-muted-foreground">→</div>
                {/* Right: item received */}
                <div className="flex flex-col items-center text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.name} className="h-12 w-12 object-contain" />
                  <div className="text-xs text-muted-foreground">You get</div>
                  <div className="text-sm font-semibold truncate max-w-[200px]">{item.name}</div>
                </div>
              </div>

              <div className="px-4 pb-4 space-y-1">
                {item.description ? (
                  <div className="text-xs text-muted-foreground line-clamp-2">{item.description}</div>
                ) : null}
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <span>Stock: {item.stock}</span>
                  <span>·</span>
                  <span>Updated: {getTimestampLocalTimezone(item.updatedAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 