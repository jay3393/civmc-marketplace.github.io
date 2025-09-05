// supabase/functions/submit-application/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "https://civhub.net",
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
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
      console.error("submit-application: invalid JSON body", { rawBody, error: String(e) });
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status:400, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    // Log a safe snapshot of the incoming payload (no secrets)
    console.log("submit-application: received", {
      kind: body?.kind,
      hasData: !!body?.data,
      requestorKeys: body?.requestor ? Object.keys(body.requestor) : [],
    });

    // Accept both legacy and new payload shapes
    const kind: string | undefined = body?.kind;
    const data = body?.data ?? {};

    // Derive name/description
    const derivedName = data?.nation_name ?? data?.settlement_name;
    const derivedDescription = data?.description ?? null;

    // Derive requester identifiers
    const requester_profile_id = body?.requester_profile_id || body?.requestor?.profileId || null;
    const requester_discord_id = body?.requester_discord_id || body?.requestor?.discordId || null; // may be null if not available

    if (!kind || !derivedName) {
      console.error("submit-application: validation failed", { kind, derivedName });
      return new Response(JSON.stringify({ error: "Missing kind/name" }), { status:400, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    // Insert an application record (legacy-compatible columns). If your table supports a JSON payload column,
    // you can also store `data` there by adding it to the insert.
    const insertPayload: Record<string, any> = {
      kind,
      name: derivedName,
      description: derivedDescription,
      data: data, // this is jsonb type column
      requester_profile_id,
      requester_discord_id,
    };

    // Log what we are about to insert (sanitized)
    console.log("submit-application: inserting application", { kind, data, requester_profile_id: !!requester_profile_id });

    const { data: app, error } = await sb
      .from("applications")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !app) {
      console.error("submit-application: DB insert failed", { error: error, insertPayload });
      return new Response(JSON.stringify({ error: "Database insert failed" }), { status:500, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    // Process data to be displayed in the Discord embed fields for each key in data (readable format)
    // exclude nation/settlement name and description
    const fields = Object.entries(data).filter(([key]) => key !== "nation_name" && key !== "settlement_name" && key !== "description").map(([key, value]) => ({
      name: key.replace(/_/g, " ").charAt(0).toUpperCase() + key.replace(/_/g, " ").slice(1),
      value: value ? String(value).slice(0, 1024) : "N/A",
      inline: key === "x" || key === "z"
    }));
    
    console.log("submit-application: fields", fields);

    const embed = {
      title: `New ${kind} application: ${derivedName}`,
      description: derivedDescription ?? "(no description)",
      fields: [
        requester_discord_id ? { name: "Requester", value: `<@${requester_discord_id}>`, inline: true } : undefined,
        ...fields,
        // { name: "Status", value: "Pending — need 2 approvals", inline: false },
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

    console.log("submit-application: posting to Discord", { APPLICATIONS_CHANNEL_ID, title: embed.title });

    const resp = await fetch(`https://discord.com/api/v10/channels/${APPLICATIONS_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: "📥 New application", embeds: [embed], components })
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("submit-application: Discord post failed", { status: resp.status, body: txt });
      return new Response(JSON.stringify({ error: "Discord post failed" }), { status: 502, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    const msg = await resp.json();
    console.log("submit-application: Discord post ok", { message_id: msg?.id });

    const { error: updateError } = await sb
      .from("applications")
      .update({ discord_message_id: msg.id, discord_channel_id: APPLICATIONS_CHANNEL_ID })
      .eq("id", app.id);

    if (updateError) {
      console.error("submit-application: failed to update application with discord IDs", { error: updateError.message, application_id: app.id });
      // Still return success for application creation; logging is sufficient
    }

    return new Response(JSON.stringify({ ok:true, id: app.id }), { headers:{ "Content-Type":"application/json", ...CORS }});
  } catch (e:any) {
    console.error("submit-application: unhandled error", { error: e?.message ?? String(e) });
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status:500, headers:{ "Content-Type":"application/json", ...CORS }});
  }
});