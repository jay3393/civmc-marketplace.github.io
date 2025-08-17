"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSupabaseUser } from "@/components/auth/auth-button";

type ContractDetail = {
  id: string;
  title: string;
  description: string | null;
  type: "request" | "offer";
  category: string;
  budget_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
  created_by: string;
  settlement: {
    id: number | null;
    settlement_name: string | null;
    nation_name: string | null;
  } | null;
  owner: {
    id: string;
    username?: string | null;
  } | null;
  currency: {
    id: string;
    name: string;
  } | null;
};

type ProposalRow = {
  id: string;
  contract_id: string;
  created_by: string;
  message: string | null;
  created_at: string;
  proposer: { id: string; username: string | null } | null;
};

async function resolveProfileId(): Promise<string | null> {
  const sb = getSupabaseBrowser();
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data: profById } = await sb.from("profiles").select("id").eq("id", user.id).limit(1).maybeSingle();
  if (profById?.id) return profById.id as string;
  const meta = (user.user_metadata ?? {}) as { provider_id?: string; sub?: string };
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
  return null;
}

function useContract(contractId: string) {
  return useQuery<ContractDetail>({
    queryKey: ["contract", contractId],
    queryFn: async () => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("contracts")
        .select(
          `id,title,description,type,category,budget_amount,deadline,status,created_at,created_by,
           settlement:settlements(id,settlement_name,nation_name),
           owner:profiles(id,username),
           currency:currencies(id,name)`
        )
        .eq("id", contractId)
        .maybeSingle();
      if (error) throw new Error("Failed to load contract");
      return data as unknown as ContractDetail;
    },
  });
}

function useProposals(contractId: string, profileId: string | null, isOwner: boolean) {
  return useQuery<ProposalRow[]>({
    queryKey: ["proposals", contractId, profileId, isOwner],
    enabled: Boolean(contractId && (isOwner || profileId)),
    queryFn: async () => {
      const sb = getSupabaseBrowser();
      let query = sb
        .from("proposals")
        .select(`id,contract_id,created_by,message,created_at,proposer:profiles(id,username)`) // expects FK proposer
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      if (!isOwner && profileId) {
        query = query.eq("created_by", profileId);
      }
      const { data, error } = await query;
      if (error) throw new Error("Failed to load proposals");
      return (data ?? []) as unknown as ProposalRow[];
    },
  });
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSupabaseUser();
  const [profileId, setProfileId] = useState<string | null>(null);

  const contractId = String(params?.id ?? "");
  const { data: contract, isLoading: loadingContract, isError: errorContract } = useContract(contractId);

  useEffect(() => {
    resolveProfileId().then(setProfileId).catch(() => setProfileId(null));
  }, []);

  const isOwner = useMemo(() => Boolean(contract && profileId && contract.created_by === profileId), [contract, profileId]);

  const { data: proposals, isLoading: loadingProposals } = useProposals(contractId, profileId, isOwner);

  if (!contractId) return <div className="text-sm text-muted-foreground">Invalid contract.</div>;
  if (loadingContract) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (errorContract || !contract) return <div className="text-sm text-red-600">Failed to load contract.</div>;

  const alreadyProposed = Boolean(proposals?.some((p) => p.created_by === profileId));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contracts" className="text-sm text-muted-foreground hover:underline">← Back to contracts</Link>
      </div>

      <div className="grid gap-2">
        <div className="text-2xl font-semibold">{contract.title}</div>
        <div className="text-sm text-muted-foreground">
          <span className="capitalize">{contract.type}</span> · {contract.category} · {contract.currency?.name ?? ""} {contract.budget_amount}
        </div>
        <div className="text-sm">{contract.settlement?.nation_name ?? "-"} — {contract.settlement?.settlement_name ?? "-"}</div>
        <div className="text-sm text-muted-foreground">Owner: {contract.owner?.username ?? "-"}</div>
        <div className="text-sm text-muted-foreground">Status: <span className="capitalize">{contract.status}</span></div>
        <div className="prose text-sm whitespace-pre-wrap leading-relaxed">{contract.description ?? "No description."}</div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-medium">Proposals</div>
        {!isOwner ? (
          <CreateProposalButton
            contractId={contract.id}
            disabledReason={!user ? "Login required" : alreadyProposed ? "You already proposed" : undefined}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ["proposals", contract.id], exact: false })}
          />
        ) : null}
      </div>

      {loadingProposals ? (
        <div className="text-sm text-muted-foreground">Loading proposals…</div>
      ) : proposals && proposals.length > 0 ? (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Proposer</th>
                <th className="py-2 pr-4">Message</th>
                <th className="py-2 pr-4">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 pr-4">{p.proposer?.username ?? "-"}</td>
                  <td className="py-2 pr-4 max-w-[480px] whitespace-pre-wrap break-words">{p.message ?? "-"}</td>
                  <td className="py-2 pr-4">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No proposals yet.</div>
      )}

      {isOwner ? (
        <Alert>
          <AlertTitle>Owner visibility</AlertTitle>
          <AlertDescription>You are viewing all proposals for this contract.</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function CreateProposalButton({ contractId, disabledReason, onCreated }: { contractId: string; disabledReason?: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const user = useSupabaseUser();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function signInWithDiscord() {
    const sb = getSupabaseBrowser();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
    await sb.auth.signInWithOAuth({ provider: "discord", options: { redirectTo } });
  }

  async function submit() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        // resolve profile
        const profileId = await resolveProfileId();
        if (!profileId) throw new Error("Not authenticated");
        const sb = getSupabaseBrowser();
        const payload = {
          contract_id: contractId,
          created_by: profileId,
          message: message.trim() || null,
        };
        const { error: insertError } = await sb.from("proposals").insert(payload);
        if (insertError) {
          setError(insertError.message || "Failed to submit proposal");
          return;
        }
        setSuccess("Proposal submitted.");
        setOpen(false);
        onCreated();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to submit proposal";
        if (msg.toLowerCase().includes("not authenticated")) {
          setError("You must be logged in to create a proposal.");
        } else setError("Failed to submit proposal");
      }
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={Boolean(disabledReason)} title={disabledReason}>
        Create proposal
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-lg rounded-lg border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">New proposal</div>
              <button className="h-8 px-3 rounded-md border" onClick={() => setOpen(false)}>Close</button>
            </div>

            {!user ? (
              <Alert>
                <AlertTitle>Sign in required</AlertTitle>
                <AlertDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm">Please log in with Discord to create a proposal.</span>
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

            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your proposal" />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button className="h-9 rounded-md border px-3" onClick={() => setOpen(false)}>Cancel</button>
              <Button onClick={submit} disabled={isPending || !user || !message.trim()}>Submit</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
} 