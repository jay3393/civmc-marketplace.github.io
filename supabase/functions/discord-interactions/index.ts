// supabase/functions/discord-interactions/index.ts
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PermissionFlagsBits } from "https://deno.land/x/discord_api_types/v10.ts";
import { logExec, log } from "../_shared/log.ts";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;  // from Dev Portal
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REQUIRED_APPROVALS = Number(Deno.env.get("REQUIRED_APPROVALS") || "1");
const APP_ID = Deno.env.get("DISCORD_APP_ID")!;
const INGEST_URL = Deno.env.get("INGEST_URL")!;
const SUPABASE_BEARER = Deno.env.get("_SUPABASE_BEARER")!;
const SUPABASE_API_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;

const INVITE_PERMISSIONS = "309237763072";

type Overwrite = { id: string; type: 0 | 1; allow: string; deny: string };
type Role = { id: string; permissions: string };
type Channel = { id: string; guild_id: string; permission_overwrites?: Overwrite[] };

function b(s?: string): bigint { return s ? BigInt(s) : 0n; }
function has(bits: bigint, flag: bigint) { return (bits & flag) !== 0n; }

function applyOverwrite(base: bigint, allow: bigint, deny: bigint) {
  base &= ~deny;  // remove denied bits
  base |= allow;  // add allowed bits
  return base;
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession:false } });

const CORS = {
  "Access-Control-Allow-Origin": "https://civhub.net",
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
function inviteURL(appId = APP_ID) {
  return `https://discord.com/api/oauth2/authorize?client_id=${appId}&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands`;
}
async function api<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { "Authorization": `Bot ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${path} -> ${res.status} ${text}`);
  }
  return await res.json();
}
/**
 * Compute effective channel permissions for the bot.
 * Follows Discord's algorithm: everyone role -> sum roles -> overwrites (@everyone -> roles -> member).
 */
function computeEffectivePerms(
  guildId: string,
  botRoleIds: string[],
  roles: Role[],
  overwrites: Overwrite[] | undefined
) {
  const roleMap = new Map<string, bigint>();
  for (const r of roles) roleMap.set(r.id, b(r.permissions));

  let perms = roleMap.get(guildId) ?? 0n;         // @everyone role base
  for (const id of botRoleIds) perms |= roleMap.get(id) ?? 0n;

  const ows = overwrites ?? [];

  // 1) @everyone overwrite (id == guildId)
  const everyone = ows.find(o => o.id === guildId);
  if (everyone) perms = applyOverwrite(perms, b(everyone.allow), b(everyone.deny));

  // 2) role overwrites for any of the bot's roles
  for (const o of ows) {
    if (o.type === 0 && botRoleIds.includes(o.id)) {
      perms = applyOverwrite(perms, b(o.allow), b(o.deny));
    }
  }

  // 3) member overwrite for the bot (optional; rarely present on text/forum channels)
  // You can enable this if you fetched the bot's user id as `botUserId`:
  // const memberOw = ows.find(o => o.type === 1 && o.id === botUserId);
  // if (memberOw) perms = applyOverwrite(perms, b(memberOw.allow), b(memberOw.deny));

  return perms;
}

function isGuildAdmin(memberPerms: string): boolean {
  const perms = BigInt(memberPerms);
  return (perms & PermissionFlagsBits.Administrator) !== 0n;
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

  // 2) APPLICATION COMMAND
  if (body.type === 2) {
    const name: string = body.data?.name ?? "";
    const guildId: string | undefined = body.guild_id;
    const userId: string | undefined = body.member?.user?.id ?? body.user?.id;

    if (name === "invite") {
      return respondEphemeral(
        `🔗 **Invite me to your server:**\n${inviteURL()}\n\n` +
          `> Requires permissions: View Channels, Read Message History, Send Messages, Send Messages in Threads, Create Public Threads, Manage Threads, Embed Links, Attach Files.`,
        []
      );
    }

    // Remove the forum from the server
    if (name === "contracts-unsetup") {
      if (!isGuildAdmin(body.member?.permissions ?? "0")) return respondEphemeral("❌ Command must be used by a server administrator.", []);

      if (!guildId) return respondEphemeral("❌ This command must be used in a server.", []);

      const payload = {
        type: "remove_forum",
        guild_id: guildId,
      };

      try {
        const resp = await fetch(INGEST_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_BEARER}`,
            apikey: SUPABASE_API_KEY,
          },
          body: JSON.stringify(payload),
          keepalive: false,
        });
    
        if (resp.ok) {
          return respondEphemeral(`✅ Stopped ingesting contracts from this server.`, []);
        } else {
          const t = await resp.text();
          return respondEphemeral(`❌ Failed to save: ${t || resp.status}`, []);
        }
      } catch (e) {
        logExec("contracts-setup", "error", "ingest error", { error: e?.message }, ["error"]);
        return respondEphemeral("❌ Failed to reach ingest function.", []);
      }
    }

    if (name === "contracts-setup") {
      if (!isGuildAdmin(body.member?.permissions ?? "0")) return respondEphemeral("❌ Command must be used by a server administrator.", []);
      if (!guildId) return respondEphemeral("❌ This command must be used in a server.", []);
      // Expect an option named "forum" with the channel id
      const options: any[] = body.data?.options ?? [];
      const forumOpt = options.find((o) => o.name === "forum");
      const forumId: string | undefined = forumOpt?.value;
      if (!forumId) return respondEphemeral("❌ Please pick a **Forum** channel.", []);

      // Validate the selected channel is actually a Forum (type 15)
      const resolvedChannels = body.data?.resolved?.channels ?? {};
      const selected = resolvedChannels[forumId];
      const isForum = selected?.type === 15; // ChannelType.GuildForum

      if (!isForum) {
        // If Discord didn’t resolve it (older SDKs), we still accept but warn.
        // You can hard‑fail instead if you prefer strictness.
        // return respondEphemeral("❌ Please pick a **Forum** channel.");
        logExec("contracts-setup", "info", "channel type not resolved; proceeding with forumId only");
      }

      try {
        // 0) Get Application Id (the bot's user id)
        const botId = body.application_id;

        // 1) Bot member (roles)
        const me = await api<{ roles: string[]; user: { id: string } }>(`/guilds/${guildId}/members/${botId}`, DISCORD_BOT_TOKEN);

        // 2) Guild roles (permissions bitfields)
        const roles = await api<Role[]>(`/guilds/${guildId}/roles`, DISCORD_BOT_TOKEN);

        // 3) Channel (get target channel id)
        const forumChannelId = body.data.options?.find(o => o.name === "forum")?.value;

        // 4) Channel (permission_overwrites)
        const ch = await api<Channel>(`/channels/${forumChannelId}`, DISCORD_BOT_TOKEN);

        // 5) Check permissions
        const perms = computeEffectivePerms(
          ch.guild_id ?? guildId,
          me.roles,
          roles,
          ch.permission_overwrites
        );

        const hasView = has(perms, PermissionFlagsBits.ViewChannel);
        const hasRead = has(perms, PermissionFlagsBits.ReadMessageHistory);

        if (!hasView || !hasRead) {
          return respondEphemeral(`❌ I don't have permission to read <#${forumId}>. Please grant me "View Channels" and "Read Message History" for that forum channel and try again.`, []);
        }
      } catch (e) {
        logExec("contracts-setup", "error", "error checking permissions", { error: e?.message }, ["error"]);
        return respondEphemeral(`❌ I don't have permission to read <#${forumId}>. Please grant me "View Channels" and "Read Message History" for that forum channel and try again.`, []);
      }

      const payload = {
        type: "setup_forum",
        guild_id: guildId,
        guild_name: body.guild?.name ?? "", // may be undefined; optional
        forum_channel_id: forumId,
        invoker_id: userId ?? "",
      };

      try {
        const resp = await fetch(INGEST_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_BEARER}`,
            apikey: SUPABASE_API_KEY,
          },
          body: JSON.stringify(payload),
          keepalive: false,
        });
    
        if (resp.ok) {
          return respondEphemeral(`✅ Ingesting contracts from <#${forumId}>\nView your ingested contracts at https://civhub.net/contracts`, []);
        } else {
          const t = await resp.text();
          return respondEphemeral(`❌ Failed to save: ${t || resp.status}`, []);
        }
      } catch (e) {
        logExec("contracts-setup", "error", "ingest error", { error: e?.message }, ["error"]);
        return respondEphemeral("❌ Failed to reach ingest function.", []);
      }
    }
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

    // Check if the discord body.member.user has the role "Trusted CivMC Board Member" using role id TRUSTED_CIVMC_BOARD_MEMBER_ROLE_ID
    if (!body.member?.roles.includes("1415199449696702526")) return respondEphemeral("❌ You are not a trusted CivMC Board Member.", []);

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
        if (nationErr) log("error", "DB error (nation)", { error: nationErr.message }, ["error"]);
        log("info", "nation created", { id: nation?.id }, ["id"]);
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
        if (settlementErr) log("error", "DB error (settlement)", { error: settlementErr.message }, ["error"]);
        log("info", "settlement created", { id: settlement?.id }, ["id"]);
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