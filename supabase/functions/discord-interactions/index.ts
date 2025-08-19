// supabase/functions/discord-interactions/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;  // from Dev Portal
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REQUIRED_APPROVALS = Number(Deno.env.get("REQUIRED_APPROVALS") || "1");

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession:false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-signature-ed25519, x-signature-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Verify request signature (Discord)
async function verifyDiscordRequest(req: Request, bodyText: string): Promise<boolean> {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  if (!signature || !timestamp) return false;
  const encoder = new TextEncoder();
  const verified = nacl.sign.detached.verify(
    encoder.encode(timestamp + bodyText),
    hexToUint8Array(signature),
    hexToUint8Array(DISCORD_PUBLIC_KEY)
  );
  return verified;
}
function hexToUint8Array(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status:405, headers: CORS });

  const bodyText = await req.text();
  const valid = await verifyDiscordRequest(req, bodyText);
  if (!valid) return new Response("Bad signature", { status: 401, headers: CORS });

  const body = JSON.parse(bodyText);

  // 1) PING
  if (body.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { "Content-Type":"application/json", ...CORS }});
  }

  // 2) COMPONENT INTERACTION (buttons)
  if (body.type === 3 /* MESSAGE_COMPONENT */) {
    const customId: string = body.data?.custom_id ?? "";
    // expected: app:<application_id>:approve|reject
    const [prefix, application_id, action] = customId.split(":");
    if (prefix !== "app" || !application_id || !["approve","reject"].includes(action)) {
      return respondEphemeral("❌ Invalid button.", []);
    }

    const reviewer_discord_id = body.member?.user?.id ?? body.user?.id ?? null;
    if (!reviewer_discord_id) return respondEphemeral("❌ Missing reviewer.", []);

    // OPTIONAL: check role gating here by inspecting body.member.roles (array of role IDs) and comparing to an allowed list stored in DB

    // Upsert review
    const { error: upErr } = await sb.from("application_reviews").upsert({
      application_id,
      reviewer_discord_id,
      decision: action as "approve" | "reject"
    });
    if (upErr) return respondEphemeral(`❌ DB error: ${upErr.message}`, []);

    // Recount
    const { count: approvals, error: apprErr } = await sb
    .from("application_reviews")
    .select("*", { count: "exact", head: true })
    .eq("application_id", application_id)
    .eq("decision", "approve");
    if (apprErr) return respondEphemeral(`❌ DB error (approvals): ${apprErr.message}`, []);
    
    const { count: rejects, error: rejErr } = await sb
      .from("application_reviews")
      .select("*", { count: "exact", head: true })
      .eq("application_id", application_id)
      .eq("decision", "reject");
    if (rejErr) return respondEphemeral(`❌ DB error (rejects): ${rejErr.message}`, []);
    
    // Persist tallies
    await sb.from("applications").update({ approvals, rejects }).eq("id", application_id);

    // If threshold met → create entity + mark approved
    let finalized = false;
    // Load app
    const { data: app } = await sb.from("applications").select("*").eq("id", application_id).maybeSingle();
    if (!app) return respondEphemeral("❌ Application not found.", []);

    if (app.status === "pending" && approvals >= REQUIRED_APPROVALS) {
      if (app.kind === "nation") {
        const { data: nation, error: nationErr } = await sb.from("nations").insert({
          nation_name: app.data.nation_name,
          description: app.data.description ?? null,
          x: app.data.x ?? null,
          z: app.data.z ?? null,
          discord: app.data.discord ?? null,
          active: true,
        }).select().single();
        if (nationErr) console.error("❌ DB error (nation):", nationErr);
        console.log("✅ Nation created:", nation);
      } else {
        const { data: settlement, error: settlementErr } = await sb.from("settlements").insert({
          settlement_name: app.data.settlement_name,
          description: app.data.description ?? null,
          nation_name: app.data.nation_name ?? null,
          x: app.data.x ?? null,
          z: app.data.z ?? null,
          discord: app.data.discord ?? null,
          member_count: app.data.member_count ?? null,
          tags: app.data.tags ?? null,
          size: app.data.size ?? null,
          active: true,
        }).select().single();
        if (settlementErr) console.error("❌ DB error (settlement):", settlementErr);
        console.log("✅ Settlement created:", settlement);
      }
      await sb.from("applications").update({ status: "approved" }).eq("id", application_id);
      finalized = true;
    }

    // Build new components/embeds for the message update
    const disable = finalized;
    const components = [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Approve", custom_id: `app:${application_id}:approve`, disabled: disable },
          { type: 2, style: 4, label: "Reject",  custom_id: `app:${application_id}:reject`,  disabled: disable },
        ]
      }
    ];
    const content = finalized
      ? "✅ **Approved** — threshold met."
      : `Pending • Approvals: **${approvals}** / ${REQUIRED_APPROVALS} • Rejects: ${rejects}`;

    // Respond with UPDATE_MESSAGE (type 7) to edit the original message in-place
    return new Response(JSON.stringify({
      type: 7, // UPDATE_MESSAGE
      data: {
        content,
        components
      }
    }), { headers: { "Content-Type": "application/json", ...CORS }});
  }

  // Fallback
  return new Response(JSON.stringify({ type: 4, data: { content: "Unsupported interaction", flags: 64 } }), {
    headers: { "Content-Type":"application/json", ...CORS }
  });
});

// Helper: ephemeral message
function respondEphemeral(text: string, components: any[]) {
  return new Response(JSON.stringify({
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: { content: text, flags: 64, components }
  }), { headers: { "Content-Type":"application/json", ...CORS }});
}