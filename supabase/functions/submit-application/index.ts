// supabase/functions/submit-application/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const APPLICATIONS_CHANNEL_ID = Deno.env.get("APPLICATIONS_CHANNEL_ID")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession:false } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status:405, headers: CORS });

  try {
    const body = await req.json();
    const { kind, name, description, requester_profile_id, requester_discord_id } = body;

    if (!kind || !name) {
      return new Response(JSON.stringify({ error: "Missing kind/name" }), { status:400, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    const { data: app, error } = await sb
      .from("applications")
      .insert({ kind, name, description: description ?? null, requester_profile_id, requester_discord_id })
      .select("*")
      .single();

    if (error || !app) {
      return new Response(JSON.stringify({ error: error?.message }), { status:500, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    const embed = {
      title: `New ${kind} application: ${name}`,
      description: description ?? "(no description)",
      fields: [
        requester_discord_id ? { name: "Requester", value: `<@${requester_discord_id}>`, inline: true } : undefined,
        { name: "Status", value: "Pending — need 2 approvals", inline: true }
      ].filter(Boolean),
      timestamp: new Date().toISOString(),
    };

    const components = [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Approve", custom_id: `app:${app.id}:approve` },
          { type: 2, style: 4, label: "Reject",  custom_id: `app:${app.id}:reject`  },
        ]
      }
    ];

    const resp = await fetch(`https://discord.com/api/v10/channels/${APPLICATIONS_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "📥 New application", embeds: [embed], components })
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Discord post failed", status: resp.status, body: txt }), { status: 502, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    const msg = await resp.json();
    await sb.from("applications").update({ discord_message_id: msg.id, discord_channel_id: APPLICATIONS_CHANNEL_ID }).eq("id", app.id);

    return new Response(JSON.stringify({ ok:true, id: app.id }), { headers:{ "Content-Type":"application/json", ...CORS }});
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status:500, headers:{ "Content-Type":"application/json", ...CORS }});
  }
});