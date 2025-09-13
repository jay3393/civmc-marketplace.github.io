// supabase/functions/submit-application/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set<string>([
  "https://www.civhub.net",
  "https://civhub.net",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.civhub.net";
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

// -------------------------- Helpers --------------------------
function parseJsonBody(rawBody: string): any {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch (e) {
    throw new Error("Invalid JSON");
  }
}

function validateInput(body: any): { kind: string; data: any; derivedName: string; derivedDescription: string | null; requester_profile_id: string | null } {
  const kind: string | undefined = body?.kind;
  const data = body?.data ?? {};
  const derivedName = data?.nation_name ?? data?.settlement_name;
  const derivedDescription = data?.description ?? null;
  const requester_profile_id = body?.requester_profile_id || body?.requestor?.profileId || null;
  if (!kind || !derivedName) {
    throw new Error("Missing kind/name");
  }
  return { kind, data, derivedName, derivedDescription, requester_profile_id };
}

function pickColor(kind: string): number {
  const COLOR_BY_KIND: Record<string, number> = {
    nation: 0x2B6CB0,
    settlement: 0x3182CE,
    contract: 0x38B2AC,
    default: 0x4FD1C5,
  };
  return COLOR_BY_KIND[kind?.toLowerCase() as string] ?? COLOR_BY_KIND.default;
}

function getCoordsField(data: Record<string, unknown>): any | null {
  const hasX = data?.x !== undefined && data?.x !== null && String(data?.x) !== "";
  const hasZ = data?.z !== undefined && data?.z !== null && String(data?.z) !== "";
  if (!hasX && !hasZ) return null;
  return {
    name: "Coordinates",
    value: `\`(X: ${hasX ? String(data.x) : "?"}, Z: ${hasZ ? String(data.z) : "?"})\``,
    inline: true,
  };
}

function normalizeDiscordUrl(data: Record<string, unknown>): string | null {
  const raw = (data?.discord || data?.discord_url || "").toString().trim();
  if (!raw) return null;
  return raw.startsWith("http") ? raw : `https://discord.gg/${raw.replace(/^\/+/, "")}`;
}

function extraFieldsFromData(data: Record<string, unknown>): Array<{ name: string; value: string; inline?: boolean }>{
  const FRIENDLY_LABELS: Record<string, string> = {
    x: "X",
    z: "Z",
    discord: "Discord",
    discord_url: "Discord",
  };
  return Object.entries(data)
    .filter(([key]) => !["nation_name","settlement_name","description","flag_url","x","z","discord","discord_url"].includes(key))
    .map(([key, value]) => {
      const label = (FRIENDLY_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
      const str = (value === null || value === undefined || String(value).trim() === "") ? "N/A" : String(value).slice(0, 1024);
      return { name: label, value: str, inline: str.length <= 48 };
    });
}

function resolveImageUrl(rawFlag: unknown): string | null {
  const raw = (rawFlag ? String(rawFlag) : "").trim();
  if (!raw) return null;
  let imageUrl = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `${SUPABASE_URL}/storage/v1/object/public/${encodeURI(raw)}`;
  try {
    // eslint-disable-next-line no-new
    new URL(imageUrl);
    return imageUrl;
  } catch {
    return null;
  }
}

function buildEmbed(params: { kind: string; name: string; description: string | null; data: any; appId: string; imageUrl: string | null }) {
  const { kind, name, description, data, appId, imageUrl } = params;
  const color = pickColor(kind);
  const nameLine = name ? `**${name}**` : "**(unnamed)**";
  const desc = (description ?? "(no description)").slice(0, 2048);
  const topFields: any[] = [];
  const coordsField = getCoordsField(data);
  if (coordsField) topFields.push(coordsField);
  const discordUrl = normalizeDiscordUrl(data);
  if (discordUrl) topFields.push({ name: "Discord", value: `[Join / View](${discordUrl})`, inline: true });
  const extraFields = extraFieldsFromData(data);

  const embed: any = {
    color,
    author: { name: "Application Submitted" },
    title: `New ${kind} Application`,
    description: `${nameLine}\n\n${desc}`,
    fields: [
      ...topFields,
      ...extraFields,
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `Application ID: ${appId}` },
  };
  if (imageUrl) embed.image = { url: imageUrl };
  return embed;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const CORS = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status:405, headers: CORS });

  try {
    const rawBody = await req.text();
    let body: any = {};
    try { body = parseJsonBody(rawBody); } catch (e) {
      console.error("submit-application: invalid JSON body", { rawBody, error: String(e) });
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status:400, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    console.log("submit-application: received", {
      kind: body?.kind,
      hasData: !!body?.data,
      requestorKeys: body?.requestor ? Object.keys(body.requestor) : [],
    });

    let kind: string, data: any, derivedName: string, derivedDescription: string | null, requester_profile_id: string | null;
    try {
      ({ kind, data, derivedName, derivedDescription, requester_profile_id } = validateInput(body));
    } catch (e) {
      console.error("submit-application: validation failed", { error: String(e) });
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
      console.error("submit-application: DB insert failed", { error: error, insertPayload });
      return new Response(JSON.stringify({ error: "Database insert failed" }), { status:500, headers:{ "Content-Type":"application/json", ...CORS }});
    }

    const imageUrl = resolveImageUrl(data?.flag_url);

    const embed = buildEmbed({ kind, name: derivedName, description: derivedDescription, data, appId: app.id, imageUrl });
    if (imageUrl) console.log("submit-application: imageUrl", imageUrl);

    const components = [
      {
        type: 1,
        components: [
          { type: 2, style: 3, label: "Approve", custom_id: `app:${app.id}:approve` },
          { type: 2, style: 4, label: "Reject",  custom_id: `app:${app.id}:reject`  },
        ]
      }
    ];

    // Post to Discord
    console.log("submit-application: posting to Discord", { APPLICATIONS_CHANNEL_ID, title: embed.title });
    const allowed_mentions = { parse: [], roles: ["1415199449696702526"] };
    const resp = await fetch(`https://discord.com/api/v10/channels/${APPLICATIONS_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: "📥 New application <@&1415199449696702526>",
        embeds: [embed],
        components,
        allowed_mentions
      })
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