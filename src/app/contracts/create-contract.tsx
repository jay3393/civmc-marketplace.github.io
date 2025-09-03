"use client";

import { useMemo, useState, useTransition } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSupabaseUser } from "@/components/auth/auth-button";
import { toast } from "sonner";

const CATEGORY_OPTIONS = [
  "Building",
  "Gathering",
  "Services",
  "Bounty",
  "Other",
] as const;

const CATEGORY_TO_TAG_ID: Record<string, string> = {
  Building: "1406705159119044638",
  Gathering: "1406705237930147940",
  Services: "1406705387989897346",
  Bounty: "1406705477638815844",
  Other: "1406715678408310864",
};

// types

type ContractInsert = {
  title: string;
  type: "request" | "offer";
  category: string;
  description: string | null;
  budget_amount: number;
  budget_currency_id: string;
  deadline: string | null;
  deadline_asap: boolean;
  settlement_id: number | null;
  created_by: string;
  metadata: Record<string, unknown> | null;
};

type Currency = { id: string; name: string };

type SettlementOpt = { id: number; settlement_name: string };

type DiscordUserMetadata = {
  provider_id?: string;
  sub?: string;
};

async function loadCurrencies(): Promise<Currency[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from("currencies").select("id,name").order("name");
  if (error) {
    throw new Error("Failed to load currencies.");
  }
  return (data ?? []) as Currency[];
}

async function loadSettlements(): Promise<SettlementOpt[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb.from("settlements").select("id,settlement_name").order("settlement_name");
  if (error) {
    throw new Error("Failed to load settlements.");
  }
  return (data ?? []) as SettlementOpt[];
}

export default function CreateContract() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const user = useSupabaseUser();
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "request" as "request" | "offer",
    category: "", // require explicit selection
    budget_amount: "",
    budget_currency_id: "",
    deadline: "",
    deadline_asap: true,
    settlement_id: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parsedDeadline = useMemo(() => (form.deadline ? new Date(form.deadline) : undefined), [form.deadline]);

  const { data: currencies } = useQuery({ queryKey: ["currencies"], queryFn: loadCurrencies });
  const { data: settlements } = useQuery({ queryKey: ["settlements:options"], queryFn: loadSettlements });

  function onChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function resolveCreatedById(): Promise<string> {
    const sb = getSupabaseBrowser();
    const { data: userData } = await sb.auth.getUser();
    const authUser = userData?.user;
    if (!authUser) throw new Error("Not authenticated");

    const { data: profById } = await sb.from("profiles").select("id").eq("id", authUser.id).limit(1).maybeSingle();
    if (profById?.id) return profById.id as string;

    const meta = (authUser.user_metadata ?? {}) as DiscordUserMetadata;
    const discordId = meta.provider_id || meta.sub || null;
    if (discordId) {
      const { data: profByDiscord } = await sb
        .from("profiles")
        .select("id")
        .eq("discord_user_id", String(discordId))
        .limit(1)
        .maybeSingle();
      if (profByDiscord?.id) return profByDiscord.id as string;
    }

    throw new Error("Profile not found for user");
  }

  async function signInWithDiscord() {
    const sb = getSupabaseBrowser();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
  }

  async function onSubmit() {
    setError(null);
    setSuccess(null);
    toast.info("Creating contract…");
    startTransition(async () => {
      try {
        const createdBy = await resolveCreatedById();
        const supabase = getSupabaseBrowser();
        const discordTagId = CATEGORY_TO_TAG_ID[form.category] ?? undefined;
        const payload: ContractInsert = {
          title: form.title.trim(),
          type: form.type,
          category: form.category,
          description: form.description.trim() ? form.description.trim() : null,
          budget_amount: Number(form.budget_amount),
          budget_currency_id: form.budget_currency_id,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
          deadline_asap: form.deadline_asap,
          settlement_id: form.settlement_id ? Number(form.settlement_id) : null,
          created_by: createdBy,
          metadata: discordTagId ? { discord_tag_id: discordTagId } : null,
        };

        // 1) Create contract and RETURN the id so we can post to Discord
        const { data: inserted, error: insertError } = await supabase
        .from("contracts")
        .insert(payload)
        .select("id")          // important: return id
        .single();             // single row

        if (insertError || !inserted?.id) {
          console.error("Failed to create contract", { insertError });
          const msg = insertError?.message || "Could not create contract. Please try again.";
          setError(msg);
          return;
        }

        // 2) Kick off the Discord webhook via Edge Function
        //    (Edge function name must match your deployed one)
        const { data: fxData, error: fxError } = await supabase.functions.invoke(
          "post-contract-to-discord",
          { body: { contract_id: inserted.id } }
        );

        // 3) UI feedback
        if (fxError) {
          // Contract is created; Discord failed — warn but don't roll back
          console.warn("Discord post failed", fxError);
          setSuccess("Contract created. (Heads up: Discord post failed — try re‑posting from the contract page.)");
          toast.warning("Contract created, but Discord post failed.");
        } else if (fxData?.already_posted) {
          setSuccess("Contract created. Already posted to Discord.");
          toast.success("Contract created (already posted to Discord)");
        } else {
          setSuccess("Contract created and posted to Discord.");
          toast.success("Contract created and posted to Discord");
        }

        setOpen(false);
        // Refresh any contract lists
        queryClient.invalidateQueries({ queryKey: ["contracts"], exact: false });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not create contract. Please try again.";
        if (message.toLowerCase().includes("not authenticated")) {
          setError("You must be logged in to create a contract.");
          toast.error("Please log in to create a contract");
        } else {
          console.error("Unexpected error creating contract", e);
          setError("Could not create contract. Please try again.");
          toast.error("Failed to create contract");
        }
      }
    });
  }

  const isRequest = form.type === "request";

  return (
    <>
      <Button
        aria-label="Create contract"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 px-5 rounded-full shadow-lg transition flex items-center gap-2 border bg-primary text-primary-foreground hover:brightness-95"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/20">+</span>
        <span className="font-medium">Create contract</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>New contract</DialogTitle>
          </DialogHeader>

          {!user ? (
            <Alert className="mb-2">
              <AlertTitle>Sign in required</AlertTitle>
              <AlertDescription>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm">Please log in with Discord to create a contract.</span>
                  <Button size="sm" onClick={signInWithDiscord}>Login with Discord</Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>
          )}
          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">{success}</div>
          )}

          <div className="grid gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <div
                  role="tablist"
                  aria-label="Contract type"
                  className="relative h-9 w-full rounded-md border bg-background grid grid-cols-2 text-sm"
                >
                  <motion.span
                    layout
                    className={cn(
                      "absolute inset-y-0 w-1/2 rounded-md bg-muted",
                      isRequest ? "left-0" : "left-1/2"
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                  <button
                    role="tab"
                    aria-selected={isRequest}
                    className={cn("z-10", "rounded-md", "transition-colors", isRequest ? "text-foreground" : "text-muted-foreground")}
                    onClick={() => onChange("type", "request")}
                    type="button"
                  >
                    Request
                  </button>
                  <button
                    role="tab"
                    aria-selected={!isRequest}
                    className={cn("z-10", "rounded-md", "transition-colors", !isRequest ? "text-foreground" : "text-muted-foreground")}
                    onClick={() => onChange("type", "offer")}
                    type="button"
                  >
                    Offer
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={form.category || undefined} onValueChange={(v) => onChange("category", v)}>
                  <SelectTrigger className="data-[placeholder]:text-muted-foreground">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => onChange("title", e.target.value)} placeholder="Contract title..."/>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => onChange("description", e.target.value)} className="max-h-[200px] overflow-y-auto" placeholder="Describe your contract..."/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="budget_amount">Budget amount</Label>
                <Input id="budget_amount" type="number" min="1" step="1" value={form.budget_amount} onChange={(e) => onChange("budget_amount", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Currency</Label>
                <Select value={form.budget_currency_id} onValueChange={(v) => onChange("budget_currency_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={currencies && currencies.length ? "Select currency" : "Loading…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Settlement (optional)</Label>
                <Popover open={settlementOpen} onOpenChange={setSettlementOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-between",
                        form.settlement_id ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {form.settlement_id
                        ? settlements?.find((s) => String(s.id) === String(form.settlement_id))?.settlement_name ?? "Select settlement"
                        : "Select settlement"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-w-sm max-h-80 overflow-y-auto" align="start">
                    <Command>
                      <CommandInput placeholder="Search settlements..." className="placeholder:text-muted-foreground" />
                      <CommandEmpty>No settlements found.</CommandEmpty>
                      <CommandList className="max-h-72 overflow-y-auto">
                        <CommandGroup>
                          {settlements?.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.settlement_name}
                              onSelect={() => {
                                onChange("settlement_id", String(s.id))
                                setSettlementOpen(false)
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
              <div className="grid gap-1.5 opacity-60">
                <Label htmlFor="nation_id">Nation (server-set)</Label>
                <Input id="nation_id" value="" placeholder="Set on server" disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="grid gap-1.5">
                <Label>Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("justify-start text-left font-normal", !parsedDeadline && "text-muted-foreground")}
                      disabled={form.deadline_asap}
                    >
                      {parsedDeadline ? format(parsedDeadline, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parsedDeadline}
                      onSelect={(d) => onChange("deadline", d ? new Date(d.setHours(12,0,0,0)).toISOString() : "")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-3 pt-5 sm:pt-0">
                <Switch id="asap" checked={form.deadline_asap} onCheckedChange={(v) => onChange("deadline_asap", Boolean(v))} />
                <Label htmlFor="asap">ASAP</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={onSubmit}
              disabled={
                isPending ||
                !form.title ||
                !form.budget_amount ||
                !form.budget_currency_id ||
                !user ||
                !form.category
              }
            >
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 