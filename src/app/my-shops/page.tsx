"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/components/auth/auth-button";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { DbShop } from "@/data/shops-db";

export default function MyShopsPage() {
  const user = useSupabaseUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<DbShop[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [world, setWorld] = useState("overworld");
  const [x, setX] = useState<string>("");
  const [y, setY] = useState<string>("");
  const [z, setZ] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) { setLoading(false); return; }
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("shops")
        .select("id,owner_id,shop_name,world,x,y,z,description,is_active,last_updated,created_at,updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });
      if (!error) setShops((data ?? []) as unknown as DbShop[]);
      setLoading(false);
    }
    load();
  }, [user]);

  const canCreate = Boolean(user) && shops.length < 2;
  const nameRemaining = 60 - name.length;
  const descRemaining = 280 - description.length;

  async function createShop() {
    if (!user) return;
    setSubmitting(true);
    try {
      const sb = getSupabaseBrowser();
      const payload = {
        owner_id: user.id,
        shop_name: name.trim(),
        world,
        x: Number(x) || 0,
        y: y.trim() ? Number(y) : null,
        z: Number(z) || 0,
        description: description.trim() || null,
        is_active: true,
      };
      const { data, error } = await sb.from("shops").insert(payload).select("id").single();
      if (!error && data?.id) {
        router.push(`/my-shops/${data.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">My Shops</h1>
        <div className="text-sm text-muted-foreground">Create up to 2 shops. Manage items and settings.</div>
      </div>

      {!user ? (
        <div className="rounded-md border bg-muted/30 p-4 text-sm">Please log in to manage your shops.</div>
      ) : loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="grid gap-3">
            {shops.length === 0 ? (
              <div className="text-sm text-muted-foreground">You don&apos;t have any shops yet.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {shops.map((s) => (
                  <Link key={s.id} href={`/my-shops/${s.id}`} className="rounded-lg border p-3 hover:bg-muted/50">
                    <div className="text-base font-medium truncate">{s.shop_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.description ?? "No description"}</div>
                    <div className="text-xs text-muted-foreground">{s.world} @ {s.x},{s.y ?? "~"},{s.z}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="grid gap-3">
            <div className="text-sm font-semibold">Create a new shop</div>
            {!canCreate ? (
              <div className="text-xs text-muted-foreground">Shop limit reached (2). Delete one to create another.</div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                {/* Left: form */}
                <div className="rounded-xl border bg-background p-4 grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="shop-name">Shop name</Label>
                    <Input id="shop-name" maxLength={60} placeholder="e.g., I_rs General Store" value={name} onChange={(e) => setName(e.target.value)} />
                    <div className="text-[11px] text-muted-foreground">{nameRemaining} characters left</div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="shop-desc">Description</Label>
                    <Textarea id="shop-desc" maxLength={280} placeholder="Directions, landmarks, what you sell…" value={description} onChange={(e) => setDescription(e.target.value)} />
                    <div className="text-[11px] text-muted-foreground">{descRemaining} characters left</div>
                  </div>
                  <div className="grid gap-2">
                    <Label>World</Label>
                    <div className="inline-flex gap-2">
                      <button type="button" onClick={() => setWorld("overworld")} className={`h-8 rounded-md border px-2 text-xs ${world === "overworld" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""}`}>Overworld</button>
                      <button type="button" onClick={() => setWorld("nether")} className={`h-8 rounded-md border px-2 text-xs ${world === "nether" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""}`}>Nether</button>
                      <button type="button" onClick={() => setWorld("end")} className={`h-8 rounded-md border px-2 text-xs ${world === "end" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : ""}`}>End</button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Coordinates</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input inputMode="numeric" placeholder="X" value={x} onChange={(e) => setX(e.target.value)} />
                      <Input inputMode="numeric" placeholder="Y" value={y} onChange={(e) => setY(e.target.value)} />
                      <Input inputMode="numeric" placeholder="Z" value={z} onChange={(e) => setZ(e.target.value)} />
                    </div>
                    <div className="text-[11px] text-muted-foreground">Y optional. Provide X/Z at minimum.</div>
                  </div>
                  <div className="pt-1">
                    <Button onClick={createShop} disabled={!name.trim() || !x.trim() || !z.trim() || submitting} className="h-9">
                      {submitting ? "Creating…" : "Create shop"}
                    </Button>
                  </div>
                </div>

                {/* Right: live preview */}
                <div className="rounded-xl border bg-background overflow-hidden">
                  <div className="border-b bg-muted/50 px-4 py-2 text-sm font-semibold">Preview</div>
                  <div className="p-3 space-y-1">
                    <div className="text-base font-semibold leading-tight truncate">{name || "Your shop name"}</div>
                    <div className="text-xs text-muted-foreground truncate">{description || "Short description of your shop…"}</div>
                    <div className="text-xs text-muted-foreground">{world} @ {x || "X"},{y || "~"},{z || "Z"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 