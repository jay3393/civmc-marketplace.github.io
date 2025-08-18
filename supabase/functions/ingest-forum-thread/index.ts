// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_BEARER = Deno.env.get("INGEST_SHARED_BEARER") || "";
const POST_CONTRACT_FUNCTION_PATH = Deno.env.get("POST_CONTRACT_FUNCTION_PATH") || "/functions/v1/post-contract-to-discord";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.slice(7) !== SHARED_BEARER) {
    return new Response("Unauthorized", { status: 401, headers: CORS });
  }

  try {
    const body = await req.json();

    // 1) Save forum setup
    if (body.type === "setup_forum") {
      const { guild_id, guild_name, forum_channel_id } = body;
      if (!guild_id || !forum_channel_id) {
        return new Response("Missing guild_id/forum_channel_id", { status: 400, headers: CORS });
      }
      const { error } = await sb.from("source_forums").upsert({
        guild_id, guild_name, forum_channel_id, enabled: true,
      });
      if (error) return new Response(`DB error: ${error.message}`, { status: 500, headers: CORS });
      return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...CORS } });
    }

    // 2) Ingest new thread
    if (body.type === "thread_create") {
      const { guild_id, parent_forum_id, thread_id, thread_name, starter_content } = body;
      if (!guild_id || !parent_forum_id || !thread_id) {
        return new Response("Missing fields", { status: 400, headers: CORS });
      }

      // Ensure this forum is configured
      const { data: src } = await sb
        .from("source_forums")
        .select("guild_id, forum_channel_id, nation")
        .eq("guild_id", guild_id)
        .eq("forum_channel_id", parent_forum_id)
        .eq("enabled", true)
        .maybeSingle();

      if (!src) {
        return new Response(JSON.stringify({ ok: true, ignored: true }), { headers: { "Content-Type": "application/json", ...CORS } });
      }

      // Deduplicate
      const { data: existing } = await sb
        .from("thread_mirrors")
        .select("source_thread_id")
        .eq("source_thread_id", thread_id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ ok: true, already_ingested: true }), { headers: { "Content-Type": "application/json", ...CORS } });
      }

      // Minimal contract (adjust to your schema defaults)
      const contractInsert: any = {
        title: (thread_name ?? "Untitled").slice(0, 200),
        description: starter_content ?? null,
        nation_id: null,
        settlement_id: null,
        type: "request",
        category: "misc",
        budget_amount: 0,
        budget_currency_id: "00000000-0000-0000-0000-000000000000", // replace or make nullable in schema
        deadline: null,
        deadline_asap: false,
        status: "open",
        created_by: "00000000-0000-0000-0000-000000000000", // system user
      };

      const { data: newContract, error: insErr } = await sb
        .from("contracts")
        .insert(contractInsert)
        .select("id")
        .single();

      if (insErr || !newContract) {
        return new Response(`Insert error: ${insErr?.message}`, { status: 500, headers: CORS });
      }

      await sb.from("thread_mirrors").insert({
        source_guild_id: guild_id,
        source_thread_id: thread_id,
        contract_id: newContract.id,
      });

      // Mirror into your central server via existing function
      const postResp = await fetch(`${SUPABASE_URL}${POST_CONTRACT_FUNCTION_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: newContract.id }),
      });

      const ok = postResp.ok;
      return new Response(JSON.stringify({ ok, contract_id: newContract.id }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    return new Response("Unknown type", { status: 400, headers: CORS });
  } catch (e: any) {
    return new Response(`Server error: ${e.message ?? String(e)}`, { status: 500, headers: CORS });
  }
});