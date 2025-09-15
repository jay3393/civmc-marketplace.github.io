"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getSupabaseBrowser } from "@/utils/supabase/client";
import { toast } from "sonner";

export type ClaimType = "NATION" | "SETTLEMENT";

type NationOpt = { id: number | string; nation_name: string };

const TAGS = [
  { key: "newbie", label: "✨ Newbie friendly" },
  { key: "rail", label: "🚂 Rail station" },
  { key: "market", label: "💰 Market/Trade" },
  { key: "buildings", label: "🏠 Buildings" },
  { key: "pvp", label: "⚔️ PvP" },
] as const;

function sanitizeFilename(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 64);
}

function toNumberOrNull(v: string): number | null {
  if (!v || !v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchNations(): Promise<NationOpt[]> {
  const sb = getSupabaseBrowser();
  const { data } = await sb
    .from("claims")
    .select("id,name")
    .eq("claim_type", "NATION")
    .order("name");
  return (data ?? []).map((r: any) => ({ id: r.id, nation_name: r.name }));
}

async function getRequestor() {
  const sb = getSupabaseBrowser();
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const profileId = user.id as string;
  let username: string | null = null;
  const { data: profile }: { data: { username: string } | null } = await sb.from("profiles").select("username").eq("id", profileId).maybeSingle();
  if (profile?.username) username = profile.username as string;
  const meta = (user.user_metadata ?? {}) as { user_name?: string; global_name?: string };
  const discordUsername = meta.global_name || meta.user_name || null;
  return { profileId, username, discordUsername };
}

export default function CreateClaimModal({
  open,
  onOpenChange,
  defaultClaimType = "SETTLEMENT",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultClaimType?: ClaimType;
  onCreated?: (created: { id: number | string } | null) => void;
}) {
  const claimType: ClaimType = defaultClaimType;
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discord, setDiscord] = useState("");
  const [x, setX] = useState("");
  const [z, setZ] = useState("");
  const [memberCount, setMemberCount] = useState("");
  const [networth, setNetworth] = useState(""); // diamond_count
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [nationOpen, setNationOpen] = useState(false);
  const [nationId, setNationId] = useState<string | number | null>(null);
  const [nationName, setNationName] = useState("");
  const [nations, setNations] = useState<NationOpt[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchNations().then(setNations).catch(() => setNations([]));
    setStep(0);
  }, [open, defaultClaimType]);

  function toggleTag(key: string) {
    setSelectedTags((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0] ?? null;
    setThumbFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setThumbPreview(url);
    } else {
      setThumbPreview(null);
    }
  }

  const baseValid = useMemo(() => {
    if (!name.trim()) return false;
    if (claimType === "SETTLEMENT" && !nationName.trim()) return false;
    return true;
  }, [name, claimType, nationName]);

  const canNext = useMemo(() => {
    if (step === 0) return baseValid; // require basic info
    return true;
  }, [step, baseValid]);

  const canSubmit = baseValid;

  async function submit() {
    try {
      setIsPending(true);
      toast.info("Submitting claim application…");
      const sb = getSupabaseBrowser();

      // Ensure user is logged in (edge function requires Authorization bearer)
      const { data: userData } = await sb.auth.getUser();
      if (!userData?.user) {
        toast.error("Please log in with Discord to submit.");
        setIsPending(false);
        return;
      }

      const req = await getRequestor();

      // upload thumbnail if provided
      let flag_url: string | null = null;
      if (thumbFile) {
        const ext = (thumbFile.name.split(".").pop() || "png").toLowerCase();
        const filename = `${Date.now()}-${sanitizeFilename(name)}.${ext}`;
        const { data: up, error: upErr } = await sb.storage
          .from("settlement-images/nations")
          .upload(filename, thumbFile);
        if (upErr) {
          console.warn("Thumbnail upload failed", upErr.message);
        } else if (up?.fullPath) {
          flag_url = up.fullPath;
        }
      }

      const isSettlement = claimType === "SETTLEMENT";
      const payload = {
        kind: isSettlement ? "settlement" : "nation",
        data: {
          // names
          ...(isSettlement ? { settlement_name: name.trim(), nation_name: nationName.trim() || null } : { nation_name: name.trim() }),
          description: description.trim() || null,
          // coords
          x: x.trim() || null,
          z: z.trim() || null,
          // discord
          discord: discord.trim() || null,
          // media
          flag_url,
          // community
          member_count: memberCount ? Number(memberCount) : null,
          tags: selectedTags.length ? selectedTags : null,
          diamond_count: networth ? Number(networth) : null,
        },
        requester_profile_id: req?.profileId ?? null,
      } as const;

      const { error: fxError } = await sb.functions.invoke("submit-application", { body: payload });
      if (fxError) {
        console.warn("submit-application failed", fxError.message);
        toast.error("Failed to submit application. Please try again later.");
        setIsPending(false);
        return;
      }

      toast.success("Application submitted for review.");
      onOpenChange(false);
      if (onCreated) onCreated(null);
    } catch (e) {
      console.error("Unexpected create claim error", (e as Error)?.message ?? String(e));
      toast.error("Failed to submit application");
    } finally {
      setIsPending(false);
    }
  }

  const title = claimType === "NATION" ? "Create nation claim" : "Create settlement claim";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[min(92vw,700px)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid gap-3">
          {/* Step indicator */}
          <div className="text-xs text-muted-foreground">Step {step + 1} of 4</div>

          {/* Step 1: Basic info */}
          {step === 0 ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="claim-name">Name</Label>
                <Input id="claim-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name..." />
              </div>
              {claimType === "SETTLEMENT" ? (
                <div className="grid gap-1.5">
                  <Label>Nation</Label>
                  <Popover open={nationOpen} onOpenChange={setNationOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={nationId ? "justify-between" : "justify-between text-muted-foreground"}>
                        {nationId ? nations.find((n) => String(n.id) === String(nationId))?.nation_name ?? "Select nation" : "Select nation"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-w-sm max-h-80 overflow-y-auto" align="start">
                      <Command>
                        <CommandInput placeholder="Search nations..." />
                        <CommandEmpty>No nations found.</CommandEmpty>
                        <CommandList className="max-h-72 overflow-y-auto">
                          <CommandGroup>
                            {nations.map((n) => (
                              <CommandItem
                                key={String(n.id)}
                                value={n.nation_name}
                                onSelect={() => {
                                  setNationId(n.id);
                                  setNationName(n.nation_name);
                                  setNationOpen(false);
                                }}
                              >
                                {n.nation_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Step 2: Details */}
          {step === 1 ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="claim-desc">Description</Label>
                <Textarea id="claim-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe..." className="max-h-40" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="coord-x">X</Label>
                  <Input id="coord-x" inputMode="numeric" value={x} onChange={(e) => setX(e.target.value)} placeholder="1234" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="coord-z">Z</Label>
                  <Input id="coord-z" inputMode="numeric" value={z} onChange={(e) => setZ(e.target.value)} placeholder="1234" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="discord">Discord Invite Link</Label>
                <Input id="discord" value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="https://discord.gg/abc123" />
              </div>
            </div>
          ) : null}

          {/* Step 3: Community */}
          {step === 2 ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="mcount">Member count</Label>
                  <Input id="mcount" type="number" min="0" value={memberCount} onChange={(e) => setMemberCount(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="networth">Net worth (diamonds)</Label>
                  <Input id="networth" type="number" min="0" value={networth} onChange={(e) => setNetworth(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={`h-8 px-3 rounded-md border text-sm ${selectedTags.includes(t.key) ? "bg-muted" : "bg-background"}`}
                      onClick={() => toggleTag(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Step 4: Thumbnail */}
          {step === 3 ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Thumbnail</Label>
                <input ref={fileInputRef} id="thumb" type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" onChange={onPickFile} />
                <label htmlFor="thumb" className="cursor-pointer">
                  <div className="rounded-lg border bg-white text-slate-900 p-4 hover:bg-slate-50 transition grid gap-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                          <path d="M12 3l4 4h-3v6h-2V7H8l4-4zm-7 8h2v7h10v-7h2v9H5v-9z"/>
                        </svg>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Click to select an image</div>
                        <div className="text-xs text-muted-foreground">PNG, JPG, or JPEG. 5MB max.</div>
                      </div>
                    </div>
                    {thumbFile ? (
                      <div className="grid gap-2">
                        <div className="text-xs text-muted-foreground">Selected: {thumbFile.name}</div>
                        {thumbPreview ? (
                          <div className="relative h-28 w-full overflow-hidden rounded border bg-muted/40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumbPreview} alt="Preview" className="absolute inset-0 h-full w-full object-cover" />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>
            </div>
          ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="text-xs text-muted-foreground" />
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</Button>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={!canNext}>Next</Button>
            ) : (
              <Button onClick={submit} disabled={isPending || !canSubmit}>Create</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 