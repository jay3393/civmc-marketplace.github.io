// supabase/functions/post-contract-to-discord/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL")!;
const siteOrigin = Deno.env.get("PUBLIC_SITE_ORIGIN") ?? "";

const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

type Body = { contract_id: string };

serve(async (req) => {
  // Always answer preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  try {
    const { contract_id } = (await req.json()) as Body;
    if (!contract_id) return new Response("Missing contract_id", { status: 400, headers: CORS });

    // Load contract
    const { data: c, error: selErr } = await supabase
      .from("contracts")
      .select("id, title, description, nation, budget_currency, budget_amount, deadline_date")
      .single();
    console.log("c", c);
    if (selErr || !c) return new Response("Contract not found", { status: 404, headers: CORS });
    if (c.discord_posted_at) {
      return new Response(JSON.stringify({ ok: true, already_posted: true, message_id: c.discord_message_id }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // Build embed
    const embed: any = {
      title: `🛠️ ${c.title}`,
      description: (c.description ?? "").slice(0, 4000),
      url: siteOrigin ? `${siteOrigin}/contracts/${c.id}` : undefined,
      fields: [
        c.nation ? { name: "🌍 Nation", value: c.nation, inline: true } : undefined,
        c.budget_amount && c.budget_currency ? { name: "💰 Budget", value: `${c.budget_amount} ${c.budget_currency}`, inline: true } : undefined,
        c.deadline_date ? { name: "⏰ Deadline", value: String(c.deadline_date), inline: true } : undefined,
        Array.isArray(c.tags) && c.tags.length ? { name: "Tags", value: c.tags.map((t: string) => `\`${t}\``).join(" "), inline: false } : undefined,
      ].filter(Boolean),
    };

    // Post to Discord
    const resp = await fetch(`${discordWebhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "📢 New contract posted:", embeds: [embed] }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(`Discord error ${resp.status}: ${text}`, { status: 502, headers: CORS });
    }

    const msg = await resp.json();

    // Stamp DB
    const { error: updErr } = await supabase
      .from("contracts")
      .update({ discord_posted_at: new Date().toISOString(), discord_message_id: msg?.id ?? null })
      .eq("id", c.id);

    if (updErr) return new Response(`Posted but failed to stamp DB: ${updErr.message}`, { status: 207, headers: CORS });

    return new Response(JSON.stringify({ ok: true, message_id: msg?.id }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    return new Response(`Server error: ${(e as Error).message}`, { status: 500, headers: CORS });
  }
});