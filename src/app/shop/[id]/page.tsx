"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getTimestampLocalTimezone } from "@/lib/utils";
import { useSupabaseUser } from "@/components/auth/auth-button";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import type { DbShop, DbShopReview, ShopExchange } from "@/data/shops-db";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function resolveBannerUrl(bannerUrl: string | null | undefined) {
  if (!bannerUrl) return "/images/default_settlement.jpg";
  if (/^https?:\/\//i.test(bannerUrl)) return bannerUrl;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "/images/default_settlement.jpg";
  return `${base}/storage/v1/object/public/shop-images/${bannerUrl}`;
}

export default function ShopDetailPage() {
  const params = useParams();
  const user = useSupabaseUser();
  const shopId = String(params?.id ?? "");

  const [shop, setShop] = useState<DbShop | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [reviews, setReviews] = useState<DbShopReview[]>([]);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShopExchange[]>([]);

  const isOwner = Boolean(user?.id && shop?.owner_id && user.id === shop.owner_id);

  // Owner-only: add/edit item listings
  const [itemsCatalog, setItemsCatalog] = useState<Array<{ id: string; name: string; texture_url: string | null }>>([]);
  const [inputItemName, setInputItemName] = useState("");
  const [outputItemId, setOutputItemId] = useState<string | null>(null);
  const [outputItemName, setOutputItemName] = useState("");
  const [inputQty, setInputQty] = useState<string>("");
  const [outputQty, setOutputQty] = useState<string>("");
  const [newStock, setNewStock] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInputName, setEditInputName] = useState("");
  const [editOutputName, setEditOutputName] = useState("");
  const [editInputQty, setEditInputQty] = useState(1);
  const [editOutputQty, setEditOutputQty] = useState(1);
  const [editStock, setEditStock] = useState<string>("");
  const [editNotes, setEditNotes] = useState("");
  const [editListed, setEditListed] = useState<boolean>(true);

  useEffect(() => {
    type SupaShopItemRow = {
      id: string;
      stock_qty: number | null;
      is_listed?: boolean | null;
      notes?: string | null;
      input_item_id?: string | null;
      input_item_name: string | null;
      input_qty: number | null;
      output_item_id?: string | null;
      output_item_name: string | null;
      output_qty: number | null;
      input?: { display_name?: string | null; name?: string | null } | null;
      output?: { display_name?: string | null; name?: string | null } | null;
      updated_at?: string | null;
    };
    async function loadCatalog() {
      try {
        const sb = getSupabaseBrowser();
        type CatalogRow = { id: string; display_name: string | null; texture_url: string | null };
        const { data } = await sb.from("items").select("id,display_name,texture_url").order("display_name");
        const rows = (data ?? []) as unknown as CatalogRow[];
        const list = rows.map((r) => ({ id: r.id, name: r.display_name ?? "", texture_url: r.texture_url }));
        setItemsCatalog(list);
      } catch {
        setItemsCatalog([]);
      }
    }
    async function loadShop() {
      if (!shopId) return;
      const sb = getSupabaseBrowser();
      const { data: s } = await sb.from("shops").select("*,banner_url").eq("id", shopId).maybeSingle();
      if (s) {
        const sh = s as unknown as DbShop & { banner_url?: string | null };
        setShop(sh);
        // owner username
        const { data: prof } = await sb.from("profiles").select("username").eq("id", sh.owner_id).maybeSingle();
        setOwnerName((prof?.username as string | undefined) ?? null);
        // items for this shop
        const { data: its } = await sb
          .from("shop_items")
          .select("id,stock_qty,is_listed,notes,input_item_id,input_item_name,input_qty,output_item_id,output_item_name,output_qty,updated_at,input:items!shop_items_input_item_id_fkey(display_name,name),output:items!shop_items_output_item_id_fkey(display_name,name)")
          .eq("shop_id", shopId)
          .order("updated_at", { ascending: false });
        const rows = (its ?? []) as unknown as SupaShopItemRow[];
        const lines: ShopExchange[] = rows.map((r) => {
          return {
            id: r.id,
            inputName: r.input_item_name ?? r.input?.display_name ?? r.input?.name ?? "",
            inputQty: Number(r.input_qty ?? 1),
            outputName: r.output_item_name ?? r.output?.display_name ?? r.output?.name ?? "",
            outputQty: Number(r.output_qty ?? 1),
            stock: r.stock_qty ?? null,
            is_listed: Boolean(r.is_listed ?? true),
            notes: r.notes ?? null,
            updatedAt: r.updated_at as string | undefined,
          };
        });
        setItems(lines);
      }
      setLoading(false);
    }
    loadCatalog();
    loadShop();
  }, [shopId]);

  useEffect(() => {
    async function loadReviews() {
      if (!shopId) return;
      const sb = getSupabaseBrowser();
      const { data } = await sb.from("shop_reviews").select("id,shop_id,author_id,rating,content,created_at").eq("shop_id", shopId).order("created_at", { ascending: false });
      setReviews((data ?? []) as unknown as DbShopReview[]);
    }
    loadReviews();
  }, [shopId]);

  if (!shopId) return <div className="text-sm text-muted-foreground">Invalid shop.</div>;
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!shop) return <div className="text-sm text-muted-foreground">Shop not found.</div>;

  async function submitReview() {
    if (!user) return;
    const sb = getSupabaseBrowser();
    const payload = { shop_id: shopId, author_id: user.id, rating: reviewRating, content: reviewText.trim() };
    const { data, error } = await sb.from("shop_reviews").insert(payload).select("*").single();
    if (!error && data) {
      setReviews((prev) => [data as unknown as DbShopReview, ...prev]);
      setReviewText("");
      setReviewRating(5);
    }
  }

  async function addListing() {
    if (!isOwner || !outputItemName.trim() || !inputItemName.trim() || !inputQty.trim() || !outputQty.trim()) return;
    const sb = getSupabaseBrowser();
    const payload = {
      shop_id: shopId,
      input_item_id: null,
      input_item_name: inputItemName.trim(),
      input_qty: Number(inputQty),
      output_item_id: outputItemId,
      output_item_name: outputItemId ? null : outputItemName.trim(),
      output_qty: Number(outputQty),
      stock_qty: newStock.trim() ? Number(newStock) : null,
      is_listed: true,
      notes: newNotes.trim() || null,
    };
    const { data, error } = await sb.from("shop_items").insert(payload).select("*").single();
    if (!error && data) {
      setItems((prev) => [
        {
          id: data.id,
          inputName: data.input_item_name ?? inputItemName,
          inputQty: Number(data.input_qty ?? inputQty) || 1,
          outputName: data.output_item_name ?? outputItemName,
          outputQty: Number(data.output_qty ?? outputQty) || 1,
          stock: data.stock_qty ?? (newStock.trim() ? Number(newStock) : null),
          is_listed: Boolean(data.is_listed ?? true),
          notes: data.notes ?? null,
        },
        ...prev,
      ]);
      // reset and close modal
      setInputItemName("");
      setOutputItemId(null); setOutputItemName("");
      setInputQty(""); setOutputQty(""); setNewStock(""); setNewNotes("");
      setAddOpen(false);
    }
  }

  async function updateListing(id: string, patch: Partial<{ inputName: string; inputQty: number; outputName: string; outputQty: number; stock: number | null; is_listed: boolean; notes: string | null }>) {
    if (!isOwner) return;
    const sb = getSupabaseBrowser();
    const dbPatch: Record<string, unknown> = {};
    if (patch.inputName !== undefined) dbPatch.input_item_name = patch.inputName;
    if (patch.inputQty !== undefined) dbPatch.input_qty = patch.inputQty;
    if (patch.outputName !== undefined) dbPatch.output_item_name = patch.outputName;
    if (patch.outputQty !== undefined) dbPatch.output_qty = patch.outputQty;
    if (patch.stock !== undefined) dbPatch.stock_qty = patch.stock;
    if (patch.is_listed !== undefined) dbPatch.is_listed = patch.is_listed;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes;
    const { data } = await sb.from("shop_items").update(dbPatch).eq("id", id).select("*").maybeSingle();
    if (data) {
      setItems((prev) => prev.map((it) => it.id === id ? {
        id: data.id,
        inputName: data.input_item_name ?? it.inputName,
        inputQty: Number(data.input_qty ?? it.inputQty) || 1,
        outputName: data.output_item_name ?? it.outputName,
        outputQty: Number(data.output_qty ?? it.outputQty) || 1,
        stock: data.stock_qty ?? it.stock,
        is_listed: Boolean(data.is_listed ?? it.is_listed),
        notes: data.notes ?? it.notes ?? null,
      } : it));
    }
  }

  function resolveCatalogByName(name: string) {
    const found = itemsCatalog.find((i) => i.name.toLowerCase() === name.toLowerCase());
    return found ?? null;
  }

  const inputPreview = (resolveCatalogByName(inputItemName)?.texture_url) ?? null;
  const outputPreview = (resolveCatalogByName(outputItemName)?.texture_url) ?? null;

  // Progressive unlock for Create modal
  const inputNameFilled = inputItemName.trim().length > 0;
  const outputNameFilled = outputItemName.trim().length > 0;
  const inputQtyFilled = inputQty.trim().length > 0;
  const outputQtyFilled = outputQty.trim().length > 0;
  const stockEnabled = (
    (inputNameFilled ? inputQtyFilled : true) &&
    (outputNameFilled ? outputQtyFilled : true) &&
    (inputNameFilled || outputNameFilled)
  );
  const descriptionEnabled = stockEnabled && newStock.trim().length > 0;
  const editInputPreview = (resolveCatalogByName(editInputName)?.texture_url) ?? null;
  const editOutputPreview = (resolveCatalogByName(editOutputName)?.texture_url) ?? null;

  const bannerSrc = resolveBannerUrl((shop as unknown as { banner_url?: string | null }).banner_url);

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
            <img src={bannerSrc} alt={shop.shop_name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute bottom-2 left-2 inline-flex items-center gap-2 rounded-full border bg-white/80 backdrop-blur px-2 py-1 shadow-sm">
              <span className="text-xs font-medium text-slate-900 truncate max-w-[180px]">{ownerName ?? "Owner"}</span>
              <span className="text-[10px] text-slate-600">·</span>
              <span className="text-xs text-slate-700 truncate max-w-[180px]">{shop.world} @ {shop.x},{shop.y ?? "~"},{shop.z}</span>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold leading-tight">{shop.shop_name}</h1>
            {isOwner ? (
              <Button className="h-9" onClick={() => setAddOpen(true)}>Create exchange listing</Button>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <span>Last updated: {getTimestampLocalTimezone(shop.last_updated)}</span>
          </div>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{shop.description}</p>
        </div>
      </div>

      {/* Add listing modal */}
      {isOwner ? (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create exchange listing</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Input (what players give)</label>
                    <input list="item-catalog" className="border rounded-md h-9 px-2 text-sm" placeholder="Search or type item…" value={inputItemName} onChange={(e) => { setInputItemName(e.target.value); }} />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-muted-foreground">Qty</label>
                      <Input type="number" min={0} value={inputQty} onChange={(e) => setInputQty(e.target.value)} className="h-8 w-20" disabled={!inputNameFilled} />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {inputPreview ? <img src={inputPreview} alt="input preview" className="h-8 w-8 object-contain" /> : null}
                  </div>
                  <div className="text-center text-muted-foreground">⇄</div>
                  <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Output (what players receive)</label>
                    <input list="item-catalog" className="border rounded-md h-9 px-2 text-sm" placeholder="Search or type item…" value={outputItemName} onChange={(e) => { setOutputItemName(e.target.value); const f = resolveCatalogByName(e.target.value); setOutputItemId(f?.id ?? null); }} />
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-muted-foreground">Qty</label>
                      <Input type="number" value={outputQty} min={0} onChange={(e) => setOutputQty(e.target.value)} className="h-8 w-20" disabled={!outputNameFilled} />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {outputPreview ? <img src={outputPreview} alt="output preview" className="h-8 w-8 object-contain" /> : null}
                  </div>
                </div>
                <datalist id="item-catalog">
                  {itemsCatalog.map((it) => (
                    <option key={it.id} value={it.name} />
                  ))}
                </datalist>
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Stock (exchanges available)</label>
                <Input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} disabled={!stockEnabled} />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Description (optional)</label>
                <Textarea placeholder="Enchantment details, notes…" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} disabled={!descriptionEnabled} />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={addListing} disabled={!outputItemName.trim() || !inputItemName.trim() || !inputQtyFilled || !outputQtyFilled || !newStock }>Add listing</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Items grid */}
      {isOwner ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No items available.</div>
          ) : (
            items.map((item) => {
              const inPrev = resolveCatalogByName(item.inputName)?.texture_url ?? null;
              const outPrev = resolveCatalogByName(item.outputName)?.texture_url ?? null;
              return (
                <div key={item.id} className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg">
                  <div className="p-4 grid gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold truncate" title={item.outputName}>{item.outputName}</div>
                      <Button
                        variant="outline"
                        className="h-8"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditInputName(item.inputName);
                          setEditOutputName(item.outputName);
                          setEditInputQty(item.inputQty);
                          setEditOutputQty(item.outputQty);
                          setEditStock(String(item.stock ?? ""));
                          setEditNotes(item.notes ?? "");
                          setEditListed(item.is_listed !== false);
                          setEditOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="grid gap-1 text-center">
                        <div className="text-[11px] text-muted-foreground">You give</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {inPrev ? <img src={inPrev} alt={item.inputName} className="h-10 w-10 mx-auto object-contain" /> : null}
                        <div className="text-xs font-medium truncate">{item.inputQty} {item.inputName}</div>
                      </div>
                      <div className="text-muted-foreground">⇄</div>
                      <div className="grid gap-1 text-center">
                        <div className="text-[11px] text-muted-foreground">You receive</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {outPrev ? <img src={outPrev} alt={item.outputName} className="h-10 w-10 mx-auto object-contain" /> : null}
                        <div className="text-xs font-medium truncate">{item.outputQty} {item.outputName}</div>
                      </div>
                    </div>
                    {item.notes ? (
                      <div className="text-xs text-muted-foreground">{item.notes}</div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${item.stock && item.stock > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                        Stock: {item.stock ?? "—"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{item.updatedAt ? `Updated: ${getTimestampLocalTimezone(item.updatedAt)}` : null}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No items available.</div>
          ) : (
            items.filter((i) => i.is_listed !== false).map((item) => {
              const inPrev = resolveCatalogByName(item.inputName)?.texture_url ?? null;
              const outPrev = resolveCatalogByName(item.outputName)?.texture_url ?? null;
              return (
                <div key={item.id} className="group rounded-xl border bg-background overflow-hidden transition hover:shadow-lg">
                  <div className="p-4 grid gap-3">
                    <div className="text-sm font-semibold truncate" title={item.outputName}>{item.outputName}</div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="grid gap-1 text-center">
                        <div className="text-[11px] text-muted-foreground">You give</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {inPrev ? <img src={inPrev} alt={item.inputName} className="h-10 w-10 mx-auto object-contain" /> : null}
                        <div className="text-xs font-medium truncate">{item.inputQty} {item.inputName}</div>
                      </div>
                      <div className="text-muted-foreground">⇄</div>
                      <div className="grid gap-1 text-center">
                        <div className="text-[11px] text-muted-foreground">You receive</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {outPrev ? <img src={outPrev} alt={item.outputName} className="h-10 w-10 mx-auto object-contain" /> : null}
                        <div className="text-xs font-medium truncate">{item.outputQty} {item.outputName}</div>
                      </div>
                    </div>
                    {item.notes ? (
                      <div className="text-xs text-muted-foreground">{item.notes}</div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${item.stock && item.stock > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}>
                        Stock: {item.stock ?? "—"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{item.updatedAt ? `Updated: ${getTimestampLocalTimezone(item.updatedAt)}` : null}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Edit listing modal */}
      {isOwner ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="w-[min(92vw,900px)]">
            <DialogHeader>
              <DialogTitle>Edit exchange listing</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              {/* Item sides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2 rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Input (what players give)</div>
                  <input list="item-catalog" className="border rounded-md h-9 px-2 text-sm" placeholder="Search or type item…" value={editInputName} onChange={(e) => setEditInputName(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-muted-foreground">Qty</label>
                    <Input type="number" min={0} value={editInputQty} onChange={(e) => setEditInputQty(Number(e.target.value) || 0)} className="h-8 w-24" />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {editInputPreview ? <img src={editInputPreview} alt="input preview" className="h-10 w-10 object-contain" /> : null}
                </div>
                <div className="grid gap-2 rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Output (what players receive)</div>
                  <input list="item-catalog" className="border rounded-md h-9 px-2 text-sm" placeholder="Search or type item…" value={editOutputName} onChange={(e) => setEditOutputName(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-muted-foreground">Qty</label>
                    <Input type="number" min={0} value={editOutputQty} onChange={(e) => setEditOutputQty(Number(e.target.value) || 0)} className="h-8 w-24" />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {editOutputPreview ? <img src={editOutputPreview} alt="output preview" className="h-10 w-10 object-contain" /> : null}
                </div>
              </div>
              {/* Meta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Stock</label>
                  <Input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <button
                    type="button"
                    onClick={() => setEditListed((v) => !v)}
                    className={`h-9 rounded-md border px-3 text-sm ${editListed ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}
                  >
                    {editListed ? "Listed" : "Unlisted"}
                  </button>
                </div>
                <div className="md:col-span-1" />
              </div>
              <div className="grid gap-1">
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={() => { if (!editingId) return; updateListing(editingId, { inputName: editInputName, inputQty: editInputQty, outputName: editOutputName, outputQty: editOutputQty, stock: editStock.trim() ? Number(editStock) : 0, is_listed: editListed, notes: editNotes || null }); setEditOpen(false); }}>Save changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {/* Reviews disabled for now */}
      { false && (
        <div className="grid gap-3">
          <div className="text-sm font-semibold">Reviews</div>
          {reviews.length === 0 ? (
            <div className="text-sm text-muted-foreground">No reviews yet.</div>
          ) : (
            <div className="grid gap-2">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()} · Rating: {r.rating}/5</div>
                  <div className="text-sm">{r.content}</div>
                </div>
              ))}
            </div>
          )}
          {user ? (
            <div className="grid gap-2 max-w-xl">
              <div className="text-xs text-muted-foreground">Leave a review</div>
              <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
                <label htmlFor="rating" className="text-xs">Rating</label>
                <select id="rating" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="h-8 rounded-md border bg-background px-2 text-xs">
                  {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <textarea className="border rounded-md p-2 text-sm" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Write your review…" />
              <div>
                <button className="h-8 rounded-md border px-2 text-xs" onClick={submitReview} disabled={!reviewText.trim()}>Submit</button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Login to leave a review.</div>
          )}
        </div>
      )}
    </div>
  );
} 