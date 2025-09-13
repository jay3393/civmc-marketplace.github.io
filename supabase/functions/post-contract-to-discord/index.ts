// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const CORS = {
  "Access-Control-Allow-Origin": "https://www.civhub.net",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN");
const FORUM_CHANNEL_ID = Deno.env.get("DISCORD_FORUM_CHANNEL_ID"); // the forum channel to post into
const SITE_ORIGIN = (Deno.env.get("PUBLIC_SITE_ORIGIN") ?? "").replace(/\/$/, "");
// optional: comma-separated forum tag IDs (snowflakes)
const FORUM_TAG_IDS = (Deno.env.get("DISCORD_FORUM_TAG_IDS") ?? "").split(",").map((s)=>s.trim()).filter(Boolean);
const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: {
    persistSession: false
  }
});
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: CORS
  });
  if (req.method !== "POST") return new Response("Method not allowed", {
    status: 405,
    headers: CORS
  });
  try {
    const { contract_id } = await req.json();
    if (!contract_id) return new Response("Missing contract_id", {
      status: 400,
      headers: CORS
    });
    // Load contract (your columns)
    const { data: c, error: selErr } = await sb.from("contracts").select([
      "id",
      "nation_id",
      "settlement_id",
      "title",
      "type",
      "category",
      "description",
      "budget_amount",
      "budget_currency_id",
      "deadline",
      "deadline_asap",
      "status",
      "created_by",
      "discord_thread_id",
      "metadata"
    ].join(",")).eq("id", contract_id).single();
    if (selErr || !c) return new Response("Contract not found", {
      status: 404,
      headers: CORS
    });
    if (c.discord_thread_id) {
      return new Response(JSON.stringify({
        ok: true,
        already_posted: true,
        thread_id: c.discord_thread_id
      }), {
        headers: {
          "Content-Type": "application/json",
          ...CORS
        }
      });
    }
    // Optional lookups
    const { data: settlement } = await sb.from("settlements").select("settlement_name,nation_name").eq("id", c.settlement_id).maybeSingle();
    const [{ data: curr }] = await Promise.all([
      sb.from("currencies").select("name,image_url").eq("id", c.budget_currency_id).maybeSingle()
    ]);
    const { data: op } = await sb.from("profiles").select("username,avatar_url").eq("id", c.created_by).maybeSingle();
    const opName = op?.username ?? "Unknown";
    const currencyName = curr?.name ?? "";
    const currencyIcon = curr?.image_url ?? undefined;
    // Build embed
    const embed = {
      author: {
        name: `Contract created by: ${opName}`
      },
      title: `${c.title}`,
      description: (c.description ?? "").slice(0, 4000),
      url: SITE_ORIGIN ? `${SITE_ORIGIN}/contracts/${c.id}` : undefined,
      fields: [
        settlement?.nation_name ? {
          name: "🌍 Nation",
          value: String(settlement?.nation_name ?? "Unknown"),
          inline: true
        } : undefined,
        c.type ? {
          name: "Type",
          value: c.type.charAt(0).toUpperCase() + c.type.slice(1),
          inline: true
        } : undefined,
        c.category ? {
          name: "Category",
          value: c.category.charAt(0).toUpperCase() + c.category.slice(1),
          inline: true
        } : undefined,
        settlement?.settlement_name ? {
          name: "Settlement",
          value: String(settlement?.settlement_name ?? "Unknown"),
          inline: true
        } : undefined,
        c.deadline ? {
          name: "⏰ Deadline",
          value: new Date(c.deadline).toISOString(),
          inline: true
        } : undefined,
        c.deadline_asap ? {
          name: "⚡ ASAP",
          value: c.deadline_asap ? "Yes" : "No",
          inline: true
        } : undefined,
        c.status ? {
          name: "Status",
          value: c.status.charAt(0).toUpperCase() + c.status.slice(1),
          inline: true
        } : undefined
      ].filter(Boolean),
      footer: c.budget_amount ? {
        text: `Budget: ${c.budget_amount} ${currencyName}`,
        icon_url: currencyIcon
      } : undefined,
      timestamp: new Date().toISOString()
    };
    // Forum thread name (<=100 chars)
    // append the settlement name to the thread name if it exists otherwise just title
    const nationName = settlement?.nation_name ?? "";
    const threadName = nationName ? `【${nationName}】 ${c.title}`.slice(0, 100) : c.title.slice(0, 100);
    // Create Forum thread with initial message
    const discordResp = await fetch(`https://discord.com/api/v10/channels/${FORUM_CHANNEL_ID}/threads`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: threadName,
        auto_archive_duration: 4320,
        applied_tags: c.metadata?.discord_tag_id ? [c.metadata.discord_tag_id] : undefined,
        message: {
          // content: "📝 New contract posted:",
          embeds: [
            embed
          ]
        }
      })
    });
    if (!discordResp.ok) {
      const txt = await discordResp.text();
      return new Response(`Discord error ${discordResp.status}: ${txt}`, {
        status: 502,
        headers: CORS
      });
    }
    const thread = await discordResp.json(); // { id, guild_id, ... }
    // Stamp DB
    const { error: updErr } = await sb.from("contracts").update({
      discord_thread_id: thread?.id ?? null
    }).eq("id", c.id);
    if (updErr) {
      return new Response(`Posted but failed to stamp DB: ${updErr.message}`, {
        status: 207,
        headers: CORS
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      thread_id: thread?.id
    }), {
      headers: {
        "Content-Type": "application/json",
        ...CORS
      }
    });
  } catch (e) {
    return new Response(`Server error: ${e.message ?? String(e)}`, {
      status: 500,
      headers: CORS
    });
  }
});
