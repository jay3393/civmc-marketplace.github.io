"use client";

import { useMemo, useState, useTransition } from "react";
import { createSupabase } from "@/lib/supabaseClient";
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
} from "@/components/ui/command";

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
};

type Currency = { id: string; name: string };

type SettlementOpt = { id: number; settlement_name: string };

type DiscordUserMetadata = {
  provider_id?: string;
  sub?: string;
  user_name?: string;
  avatar_url?: string;
  [key: string]: unknown;
};

async function loadCurrencies(): Promise<Currency[]> {
  const sb = createSupabase();
  const { data, error } = await sb.from("currencies").select("id,name").order("name");
  if (error) {
    console.error("Failed to load currencies", { error });
    throw new Error("Failed to load currencies.");
  }
  return (data ?? []) as Currency[];
}

async function loadSettlements(): Promise<SettlementOpt[]> {
  const sb = createSupabase();
  const { data, error } = await sb.from("settlements").select("id,settlement_name").order("settlement_name");
  if (error) {
    console.error("Failed to load settlements", { error });
    throw new Error("Failed to load settlements.");
  }
  return (data ?? []) as SettlementOpt[];
}

export default function CreateContract() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    type: "request" as "request" | "offer",
    category: "Resource",
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
    const sb = createSupabase();
    const { data: userData } = await sb.auth.getUser();
    const user = userData?.user;
    if (!user) throw new Error("Not authenticated");

    const { data: profById } = await sb.from("profiles").select("id").eq("id", user.id).limit(1).maybeSingle();
    if (profById?.id) return profById.id as string;

    const meta = (user.user_metadata ?? {}) as DiscordUserMetadata;
    const discordId = meta.provider_id || meta.sub || null;
    if (discordId) {
      const { data: profByDiscord } = await sb.from("profiles").select("id").eq("discord_user_id", String(discordId)).limit(1).maybeSingle();
      if (profByDiscord?.id) return profByDiscord.id as string;
    }

    throw new Error("Profile not found for user");
  }

  async function onSubmit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const createdBy = await resolveCreatedById();
        const supabase = createSupabase();
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
        };

        const { error: insertError } = await supabase.from("contracts").insert(payload);
        if (insertError) {
          console.error("Failed to create contract", { insertError });
          setError("Could not create contract. Please try again.");
          return;
        }
        setSuccess("Contract created.");
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ["contracts"], exact: false });
      } catch (e) {
        console.error("Unexpected error creating contract", e);
        setError("Could not create contract. Please try again.");
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

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>
          )}
          {success && (
            <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">{success}</div>
          )}

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => onChange("title", e.target.value)} />
            </div>

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
                <Select value={form.category} onValueChange={(v) => onChange("category", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Resource">Resource</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                    <SelectItem value="Logistics">Logistics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => onChange("description", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="budget_amount">Budget amount</Label>
                <Input id="budget_amount" type="number" min="0" step="0.01" value={form.budget_amount} onChange={(e) => onChange("budget_amount", e.target.value)} />
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      {form.settlement_id
                        ? settlements?.find((s) => String(s.id) === String(form.settlement_id))?.settlement_name ?? "Select settlement"
                        : "Select settlement"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-w-sm max-h-72 overflow-auto" align="start">
                    <Command className="max-h-64" filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                      <CommandInput placeholder="Search settlements..." />
                      <CommandEmpty>No settlements found.</CommandEmpty>
                      <CommandGroup>
                        {settlements?.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={s.settlement_name}
                            onSelect={() => onChange("settlement_id", String(s.id))}
                          >
                            {s.settlement_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
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
                !form.budget_currency_id
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