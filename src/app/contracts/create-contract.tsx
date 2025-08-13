"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createSupabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type ContractInsert = {
  title: string;
  type: "request" | "offer";
  category: string;
  description: string | null;
  budget_amount: number;
  budget_currency_id: string;
  deadline: string | null;
  deadline_asap: boolean;
  nation_id: number;
  settlement_id: number | null;
};

export default function CreateContract() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    type: "request" as "request" | "offer",
    category: "Resource",
    budget_amount: "",
    budget_currency_id: "",
    deadline: "",
    deadline_asap: false,
    nation_id: "",
    settlement_id: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parsedDeadline = useMemo(() => (form.deadline ? new Date(form.deadline) : undefined), [form.deadline]);

  function onChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
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
          nation_id: Number(form.nation_id),
          settlement_id: form.settlement_id ? Number(form.settlement_id) : null,
        };

        const { error: insertError } = await supabase.from("contracts").insert(payload);
        if (insertError) {
          console.error("Failed to create contract", { insertError });
          setError("Could not create contract. Please try again.");
          return;
        }
        setSuccess("Contract created.");
        setOpen(false);
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
                <Label htmlFor="budget_currency_id">Currency ID (UUID)</Label>
                <Input id="budget_currency_id" value={form.budget_currency_id} onChange={(e) => onChange("budget_currency_id", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="nation_id">Nation ID</Label>
                <Input id="nation_id" value={form.nation_id} onChange={(e) => onChange("nation_id", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="settlement_id">Settlement ID (optional)</Label>
                <Input id="settlement_id" value={form.settlement_id} onChange={(e) => onChange("settlement_id", e.target.value)} />
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
              disabled={isPending || !form.title || !form.budget_amount || !form.budget_currency_id || !form.nation_id}
            >
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 