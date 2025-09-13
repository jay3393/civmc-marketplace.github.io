"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseUser } from "@/components/auth/auth-button";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import type { DbShop } from "@/data/shops-db";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function ManageShopPage() {
  const params = useParams();
  const router = useRouter();
  const user = useSupabaseUser();
  const shopId = String(params?.id ?? "");

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<DbShop | null>(null);

  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [world, setWorld] = useState("overworld");
  const [x, setX] = useState<string>("");
  const [y, setY] = useState<string>("");
  const [z, setZ] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [settlementId, setSettlementId] = useState<string>("");

  // Banner file upload state (reuse settlements UI pattern)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  type DbShopMaybeBanner = DbShop & { banner_url?: string | null };

  const isOwner = Boolean(user?.id && shop?.owner_id && user.id === shop.owner_id);

  // Settlements combobox
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementOptions, setSettlementOptions] = useState<{ id: string | number; settlement_name: string }[]>([]);

  useEffect(() => {
    async function load() {
      if (!shopId || !user) { setLoading(false); return; }
      const sb = getSupabaseBrowser();
      const { data: s } = await sb.from("shops").select("*").eq("id", shopId).maybeSingle();
      if (s) {
        const sh = s as unknown as DbShopMaybeBanner;
        setShop(sh);
        setName(sh.shop_name ?? "");
        setDescription(sh.description ?? "");
        setWorld(sh.world ?? "overworld");
        setX(String(sh.x ?? ""));
        setY(sh.y === null || sh.y === undefined ? "" : String(sh.y));
        setZ(String(sh.z ?? ""));
        setIsActive(Boolean(sh.is_active));
        setSettlementId(sh.settlement_id === null || sh.settlement_id === undefined ? "" : String(sh.settlement_id));
        const existingBanner = (sh.banner_url ?? "") || "";
        setBannerPreview(existingBanner || null);
        setBannerFile(null);
      }
      setLoading(false);
    }
    load();
  }, [shopId, user]);

  useEffect(() => {
    async function loadSettlements() {
      const sb = getSupabaseBrowser();
      const { data } = await sb.from("settlements").select("id,settlement_name").order("settlement_name");
      setSettlementOptions((data ?? []) as { id: string | number; settlement_name: string }[]);
    }
    loadSettlements();
  }, []);

  const dirty = useMemo(() => {
    if (!shop) return false;
    const current = {
      name,
      description,
      world,
      x,
      y,
      z,
      isActive,
      settlementId,
      bannerPreview, // track preview URL differences
    };
    const base = {
      name: shop.shop_name ?? "",
      description: shop.description ?? "",
      world: shop.world ?? "overworld",
      x: String(shop.x ?? ""),
      y: shop.y === null || shop.y === undefined ? "" : String(shop.y),
      z: String(shop.z ?? ""),
      isActive: Boolean(shop.is_active),
      settlementId: shop.settlement_id === null || shop.settlement_id === undefined ? "" : String(shop.settlement_id),
      bannerPreview: (shop as DbShopMaybeBanner).banner_url ?? null,
    };
    return JSON.stringify(current) !== JSON.stringify(base);
  }, [shop, name, description, world, x, y, z, isActive, settlementId, bannerPreview]);

  function onPickBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0] ?? null;
    setBannerFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setBannerPreview(url);
    } else {
      setBannerPreview(null);
    }
  }

  async function saveShop() {
    if (!isOwner || saving) return;
    setSaving(true);
    const sb = getSupabaseBrowser();

    const payloadBase = {
      shop_name: name.trim(),
      description: description.trim() || null,
      world,
      x: Number(x) || 0,
      y: y.trim() ? Number(y) : null,
      z: Number(z) || 0,
      is_active: isActive,
      settlement_id: settlementId.trim() ? Number(settlementId) : null,
    } as Record<string, unknown>;

    // Optional: try upload banner to storage if a file was selected
    // This will no-op if storage is not configured.
    try {
      if (bannerFile) {
        const ext = (bannerFile.name.split(".").pop() || "png").toLowerCase();
        const path = `shops/${shopId}/${Date.now()}.${ext}`;
        const up = await sb.storage.from("shop-images").upload(path, bannerFile, { upsert: true });
        // update shop banner_url
        const { error: updateError } = await sb.from("shops").update({ banner_url: path }).eq("id", shopId);
          if (updateError) {
            console.error("Error updating shop banner_url:", updateError.message);
          }
        if (!up.error) {
          const pub = sb.storage.from("shop-images").getPublicUrl(path);
          const url = pub.data?.publicUrl;
          if (url) {
            (payloadBase as { banner_url?: string | null }).banner_url = url;
          }
        }
      }
    } catch {
      // ignore storage errors
    }

    try {
      const { error } = await sb.from("shops").update(payloadBase as never).eq("id", shopId);
      if (error) {
        // Retry without banner_url if backend doesn't have the column
        if (Object.prototype.hasOwnProperty.call(payloadBase, "banner_url")) {
          delete (payloadBase as { [k: string]: unknown }).banner_url;
          await sb.from("shops").update(payloadBase as never).eq("id", shopId);
        }
      }
    } catch {
      // swallow for now
    }

    // Reload to get fresh values
    const { data: s2 } = await sb.from("shops").select("*").eq("id", shopId).maybeSingle();
    if (s2) {
      const sh2 = s2 as unknown as DbShopMaybeBanner;
      setShop(sh2);
      setName(sh2.shop_name ?? "");
      setDescription(sh2.description ?? "");
      setWorld(sh2.world ?? "overworld");
      setX(String(sh2.x ?? ""));
      setY(sh2.y === null || sh2.y === undefined ? "" : String(sh2.y));
      setZ(String(sh2.z ?? ""));
      setIsActive(Boolean(sh2.is_active));
      setSettlementId(sh2.settlement_id === null || sh2.settlement_id === undefined ? "" : String(sh2.settlement_id));
      setBannerPreview((sh2.banner_url ?? null) || null);
      setBannerFile(null);
    }

    setSaving(false);
  }

  function discardChanges() {
    if (!shop) return;
    setName(shop.shop_name ?? "");
    setDescription(shop.description ?? "");
    setWorld(shop.world ?? "overworld");
    setX(String(shop.x ?? ""));
    setY(shop.y === null || shop.y === undefined ? "" : String(shop.y));
    setZ(String(shop.z ?? ""));
    setIsActive(Boolean(shop.is_active));
    setSettlementId(shop.settlement_id === null || shop.settlement_id === undefined ? "" : String(shop.settlement_id));
    setBannerPreview(((shop as unknown as DbShopMaybeBanner).banner_url ?? null) || null);
    setBannerFile(null);
  }

  async function deleteShop() {
    if (!isOwner || deleting) return;
    const confirmed = typeof window !== "undefined" ? window.confirm("Delete this shop? This cannot be undone.") : false;
    if (!confirmed) return;
    setDeleting(true);
    const sb = getSupabaseBrowser();
    await sb.from("shops").delete().eq("id", shopId);
    setDeleting(false);
    router.push("/my-shops");
  }

  if (!user) return <div className="text-sm text-muted-foreground">Please log in.</div>;
  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!shop) return <div className="text-sm text-muted-foreground">Shop not found.</div>;
  if (!isOwner) return <div className="text-sm text-muted-foreground">You do not have permission to manage this shop.</div>;

  const selectedSettlementName = settlementId ? (settlementOptions.find((s) => String(s.id) === String(settlementId))?.settlement_name ?? "") : "";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Manage Shop</h1>
        <div className="text-sm text-muted-foreground">Update your shop details, banner, and visibility.</div>
      </div>

      {/* Banner preview & upload */}
      <div className="rounded-xl border overflow-hidden">
        <div className="relative h-40 sm:h-48 bg-muted">
          {bannerPreview ? (
            <Image src={bannerPreview} alt="Shop banner" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Image src="/images/default_settlement.jpg" alt="Shop banner" fill className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <div className="p-3 grid gap-2">
          <input ref={fileInputRef} id="banner" type="file" accept="image/*" className="hidden" onChange={onPickBanner} />
          <label htmlFor="banner" className="cursor-pointer">
            <div className="rounded-lg border bg-white text-slate-900 p-4 hover:bg-slate-50 transition grid gap-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                    <path d="M12 3l4 4h-3v6h-2V7H8l4-4zm-7 8h2v7h10v-7h2v9H5v-9z"/>
                  </svg>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Click to select a banner image</div>
                  <div className="text-xs text-muted-foreground">PNG, JPG, or GIF. Max a few MB.</div>
                </div>
              </div>
              {bannerFile ? (
                <div className="grid gap-2">
                  <div className="text-xs text-muted-foreground">Selected: {bannerFile.name}</div>
                  {bannerPreview ? (
                    <div className="relative h-28 w-full overflow-hidden rounded border bg-muted/40">
                      <Image src={bannerPreview} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </label>
        </div>
      </div>

      <div className="grid gap-3 max-w-2xl">
        <div className="grid gap-2">
          <Label htmlFor="shopname">Name</Label>
          <Input id="shopname" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="shopdesc">Description</Label>
          <Textarea id="shopdesc" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="coordx">X Coord</Label>
            <Input id="coordx" inputMode="numeric" placeholder="X" value={x} onChange={(e) => setX(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coordy">Y Coord</Label>
            <Input id="coordy" inputMode="numeric" placeholder="Y" value={y} onChange={(e) => setY(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="coordz">Z Coord</Label>
            <Input id="coordz" inputMode="numeric" placeholder="Z" value={z} onChange={(e) => setZ(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsActive((v) => !v)} className={`h-8 rounded-md border px-2 text-xs ${isActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""}`}>
            {isActive ? "Active" : "Inactive"}
          </button>
          <div className="text-xs text-muted-foreground">Toggle whether this shop is publicly visible.</div>
        </div>
        <div className="grid gap-2">
          <Label>Settlement</Label>
          <Popover open={settlementOpen} onOpenChange={setSettlementOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={settlementId ? "justify-between" : "justify-between text-muted-foreground"}>
                {settlementId ? selectedSettlementName : "Select settlement"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-w-sm max-h-80 overflow-y-auto" align="start">
              <Command>
                <CommandInput placeholder="Search settlements..." />
                <CommandEmpty>No settlements found.</CommandEmpty>
                <CommandList className="max-h-72 overflow-y-auto">
                  <CommandGroup>
                    {settlementOptions.map((s) => (
                      <CommandItem
                        key={String(s.id)}
                        value={s.settlement_name}
                        onSelect={() => {
                          setSettlementId(String(s.id));
                          setSettlementOpen(false);
                        }}
                      >
                        {s.settlement_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={saveShop} disabled={!name.trim() || !x.trim() || !z.trim() || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="secondary" onClick={discardChanges} disabled={!dirty || saving}>
          Discard changes
        </Button>
        <div className="ml-auto" />
        <Button variant="destructive" onClick={deleteShop} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete shop"}
        </Button>
      </div>
    </div>
  );
} 