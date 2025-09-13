// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import jwt from "npm:jsonwebtoken@9.0.2";
import { log } from "../_shared/log.ts";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID")!;
const IN_GUILD_JWT_SECRET = Deno.env.get("IN_GUILD_JWT_SECRET") || crypto.randomUUID();
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://civhub.net,http://localhost:3000,http://127.0.0.1:3000").split(",").map((s) => s.trim());

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  } as Record<string, string>;
}

function maskUser(id: string | undefined): string {
  if (!id) return "unknown";
  const s = String(id);
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const CORS = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const body = await req.json().catch(() => ({}));
    const discordUserId: string | undefined = body?.discord_user_id;
    const providerAccessToken: string | undefined = body?.provider_token; // from supabase session
    const joinIfNeeded: boolean = Boolean(body?.join_if_needed);

    if (!discordUserId) {
      return new Response(JSON.stringify({ error: "missing discord_user_id" }), { status: 400, headers: { "Content-Type": "application/json", ...CORS } });
    }

    log("info", "verify-guild: request", { user: maskUser(discordUserId), joinIfNeeded }, ["user", "joinIfNeeded"]);

    // Check membership
    const memberResp = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}` , {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });

    let inGuild = memberResp.ok;
    const inGuildBefore = inGuild;

    // Attempt to join if not in guild and we have an access token
    let attemptedJoin = false;
    if (!inGuild && joinIfNeeded && providerAccessToken) {
      attemptedJoin = true;
      const joinResp = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: providerAccessToken }),
      });
      inGuild = joinResp.ok;
    }

    log("info", "verify-guild: result", { user: maskUser(discordUserId), inGuildBefore, attemptedJoin, inGuild }, ["user", "inGuildBefore", "attemptedJoin", "inGuild"]);

    const token = jwt.sign({ in_guild: inGuild }, IN_GUILD_JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: "1h",
    });
    const decoded: any = jwt.decode(token);
    const exp = decoded?.exp ?? null;

    return new Response(JSON.stringify({ in_guild: inGuild, token, exp }), { headers: { "Content-Type": "application/json", ...CORS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...CORS } });
  }
}); 