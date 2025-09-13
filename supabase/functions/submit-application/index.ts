// supabase/functions/submit-application/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set<string>([
  "https://civhub.net",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://civhub.net";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  } as Record<string, string>;
}

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const APPLICATIONS_CHANNEL_ID = Deno.env.get("APPLICATIONS_CHANNEL_ID")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession:false } });

serve(async (req) => {
  const origin = req.headers.get("origin");
  const CORS = corsHeaders(origin);

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

    console.log("submit-application: received", {
      kind: body?.kind,
      hasData: !!body?.data,
      requestorKeys: body?.requestor ? Object.keys(body.requestor) : [],
    });

    const kind: string | undefined = body?.kind;
    const data = body?.data ?? {};

    const derivedName = data?.nation_name ?? data?.settlement_name;
    const derivedDescription = data?.description ?? null;

    const requester_profile_id = body?.requester_profile_id || body?.requestor?.profileId || null;

    if (!kind || !derivedName) {
      console.error("submit-application: validation failed", { kind, derivedName });
      return new Response(JSON.stringify({ error: "Missing kind/name" }), { status:400, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    const insertPayload: Record<string, any> = {
      kind,
      name: derivedName,
      description: derivedDescription,
      data: data,
      requester_profile_id,
    };

    console.log("submit-application: inserting application", { kind, data, requester_profile_id: !!requester_profile_id });

    const { data: app, error } = await sb
      .from("applications")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !app) {
      console.error("submit-application: DB insert failed", { error: error?.message, insertPayload });
      return new Response(JSON.stringify({ error: "Database insert failed" }), { status:500, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    // Build a public URL for the flag if provided as a storage path
    let imageUrl: string | null = null;
    const rawFlag = (data?.flag_url ? String(data.flag_url) : "").trim();
    if (rawFlag) {
      if (rawFlag.startsWith("http://") || rawFlag.startsWith("https://")) {
        imageUrl = rawFlag;
      } else {
        // Encode path to handle spaces/special chars
        const encodedPath = encodeURI(rawFlag);
        imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodedPath}`;
      }
      // Validate URL; if invalid, drop image
      try {
        // eslint-disable-next-line no-new
        new URL(imageUrl);
      } catch {
        console.warn("submit-application: image URL invalid, dropping", { imageUrl });
        imageUrl = null;
      }
    }

    const fields = Object.entries(data)
      .filter(([key]) => key !== "nation_name" && key !== "settlement_name" && key !== "description" && key !== "flag_url")
      .map(([key, value]) => ({
        name: key.replace(/_/g, " ").charAt(0).toUpperCase() + key.replace(/_/g, " ").slice(1),
        value: value ? String(value).slice(0, 1024) : "N/A",
        inline: key === "x" || key === "z"
      }));
    
    console.log("submit-application: fields", fields);

    const embed: any = {
      title: `New ${kind} application: ${derivedName}`,
      description: derivedDescription ?? "(no description)",
      fields: [
        ...fields,
      ].filter(Boolean),
      timestamp: new Date().toISOString(),
    };

    if (imageUrl) {
      embed.image = { url: imageUrl };
      console.log("submit-application: imageUrl", imageUrl);
    }

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
    }

    return new Response(JSON.stringify({ ok:true, id: app.id }), { headers:{ "Content-Type":"application/json", ...CORS }});
  } catch (e:any) {
    console.error("submit-application: unhandled error", { error: e?.message ?? String(e) });
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status:500, headers:{ "Content-Type":"application/json", ...CORS }});
  }
});