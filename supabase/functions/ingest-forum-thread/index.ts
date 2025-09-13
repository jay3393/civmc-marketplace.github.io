// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logExec, allowFields } from "../_shared/log.ts";

const CORS = {
  "Access-Control-Allow-Origin": "https://civhub.net",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_BEARER = Deno.env.get("INGEST_SHARED_BEARER") || "";
const POST_CONTRACT_FUNCTION_PATH = Deno.env.get("POST_CONTRACT_FUNCTION_PATH") || "/functions/v1/post-contract-to-discord";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || ""; // needed for Edge→Edge call through the gateway

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// ---- tiny helpers ----------------------------------------------------------
const rid = () => Math.random().toString(36).slice(2, 8);
const redact = (v: string | null | undefined) => (v ? v.slice(0, 4) + "…" : "");

function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// ----------------------------------------------------------------------------

serve(async (req) => {
  const exec = rid();
  try {
    // Basic request trace
    logExec(exec, "info", "incoming", {
      method: req.method,
      path: new URL(req.url).pathname,
      // keep headers light; do not log bearer
      hdr_origin: req.headers.get("origin") ?? null,
      hdr_auth_present: !!req.headers.get("authorization"),
      hdr_apikey_present: !!req.headers.get("apikey"),
    }, ["method", "path", "hdr_origin", "hdr_auth_present", "hdr_apikey_present"]);

    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);

    // Auth (shared bearer)
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== SHARED_BEARER) {
      logExec(exec, "error", "unauthorized", { reason: "bad bearer" }, ["reason"]);
      return j({ error: "Unauthorized" }, 401);
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e: any) {
      logExec(exec, "error", "invalid json", { err: e?.message }, ["err"]);
      return j({ error: "Invalid JSON body", detail: e?.message }, 400);
    }

    logExec(exec, "info", "parsed body", { type: body?.type }, ["type"]);

    // 0) Remove forum setup
    if (body.type === "remove_forum") {
      const { guild_id } = body;
      if (!guild_id) {
        logExec(exec, "error", "missing fields (remove_forum)", { guild_id_present: !!guild_id }, ["guild_id_present"]);
        return j({ error: "Missing guild_id/forum_channel_id" }, 400);
      }

      const { error } = await sb.from("source_forums").delete().eq("guild_id", guild_id);
      if (error) {
        logExec(exec, "error", "delete source_forums failed", { code: (error as any)?.code, details: (error as any)?.details, hint: (error as any)?.hint, message: error.message }, ["code", "details", "hint", "message"]);
        return j({ error: "DB error: delete source_forums", code: (error as any)?.code, details: (error as any)?.details, hint: (error as any)?.hint, message: error.message }, 500);
      }

      logExec(exec, "info", "remove_forum ok", { guild_id }, ["guild_id"]);
      return j({ ok: true });
    }

    // 1) Save forum setup
    if (body.type === "setup_forum") {
      const { guild_id, guild_name, forum_channel_id } = body;
      if (!guild_id || !forum_channel_id) {
        logExec(exec, "error", "missing fields (setup_forum)", { guild_id_present: !!guild_id, forum_channel_id_present: !!forum_channel_id }, ["guild_id_present", "forum_channel_id_present"]);
        return j({ error: "Missing guild_id/forum_channel_id" }, 400);
      }

      const { error } = await sb.from("source_forums").upsert({
        guild_id, guild_name, forum_channel_id, enabled: true,
      });

      if (error) {
        logExec(exec, "error", "upsert source_forums failed", { code: (error as any)?.code, details: (error as any)?.details, hint: (error as any)?.hint, message: error.message }, ["code", "details", "hint", "message"]);
        return j({ error: "DB error: upsert source_forums", code: (error as any)?.code, details: (error as any)?.details, hint: (error as any)?.hint, message: error.message }, 500);
      }

      logExec(exec, "info", "setup_forum ok", { guild_id, forum_channel_id }, ["guild_id", "forum_channel_id"]);
      return j({ ok: true });
    }

    // 2) Ingest new thread
    if (body.type === "thread_create") {
      const safeBody = allowFields(body, ["guild_id", "parent_forum_id", "thread_id", "thread_name"]);
      logExec(exec, "info", "thread_create", safeBody, ["guild_id", "parent_forum_id", "thread_id", "thread_name"]);
      const { guild_id, parent_forum_id, thread_id, thread_name, starter_content } = body;

      if (!guild_id || !parent_forum_id || !thread_id) {
        logExec(exec, "error", "missing fields (thread_create)", {
          guild_id_present: !!guild_id,
          parent_forum_id_present: !!parent_forum_id,
          thread_id_present: !!thread_id,
        }, ["guild_id_present", "parent_forum_id_present", "thread_id_present"]);
        return j({ error: "Missing fields (guild_id, parent_forum_id, thread_id)" }, 400);
      }

      // Ensure this forum is configured
      const { data: src, error: srcErr } = await sb
        .from("source_forums")
        .select("guild_id, forum_channel_id, nation")
        .eq("guild_id", guild_id)
        .eq("forum_channel_id", parent_forum_id)
        .eq("enabled", true)
        .maybeSingle();

      if (srcErr) {
        logExec(exec, "error", "select source_forums failed", { code: (srcErr as any)?.code, details: (srcErr as any)?.details, hint: (srcErr as any)?.hint, message: srcErr.message }, ["code", "details", "hint", "message"]);
        return j({ error: "DB error: select source_forums", code: (srcErr as any)?.code, details: (srcErr as any)?.details, hint: (srcErr as any)?.hint, message: srcErr.message }, 500);
      }

      if (!src) {
        logExec(exec, "info", "unconfigured forum, ignoring", { guild_id, parent_forum_id }, ["guild_id", "parent_forum_id"]);
        return j({ ok: true, ignored: true });
      }

      // Deduplicate
      const { data: existing, error: dedupeErr } = await sb
        .from("thread_mirrors")
        .select("source_thread_id")
        .eq("source_thread_id", thread_id)
        .maybeSingle();

      if (dedupeErr) {
        logExec(exec, "error", "select thread_mirrors failed", { code: (dedupeErr as any)?.code, details: (dedupeErr as any)?.details, hint: (dedupeErr as any)?.hint, message: dedupeErr.message }, ["code", "details", "hint", "message"]);
        return j({ error: "DB error: select thread_mirrors", code: (dedupeErr as any)?.code, details: (dedupeErr as any)?.details, hint: (dedupeErr as any)?.hint, message: dedupeErr.message }, 500);
      }

      if (existing) {
        logExec(exec, "info", "already_ingested", { thread_id }, ["thread_id"]);
        return j({ ok: true, already_ingested: true });
      }

      // Minimal contract (adjust to your schema defaults)
      const contractInsert: any = {
        title: (thread_name ?? "Untitled").slice(0, 200),
        description: starter_content ?? null,
        nation_id: null,
        settlement_id: null,
        type: "request",
        category: "Other",
        budget_amount: 0,
        budget_currency_id: "17ecbfcf-6e00-44e9-95ba-6408b7adb3af", // TODO: replace or make nullable in schema
        deadline: null,
        deadline_asap: false,
        status: "open",
        created_by: "ad71270c-853a-4743-96c2-b7867f53de1a", // system user
      };

      const { data: newContract, error: insErr } = await sb
        .from("contracts")
        .insert(contractInsert)
        .select("id")
        .single();

      if (insErr || !newContract) {
        logExec(exec, "error", "insert contracts failed", { code: (insErr as any)?.code, details: (insErr as any)?.details, hint: (insErr as any)?.hint, message: insErr?.message }, ["code", "details", "hint", "message"]);
        return j({ error: "DB error: insert contracts", code: (insErr as any)?.code, details: (insErr as any)?.details, hint: (insErr as any)?.hint, message: insErr?.message }, 500);
      }

      // Mirror record
      const { error: mirrorErr } = await sb.from("thread_mirrors").insert({
        source_guild_id: guild_id,
        source_thread_id: thread_id,
        contract_id: newContract.id,
      });

      if (mirrorErr) {
        logExec(exec, "error", "insert thread_mirrors failed", { code: (mirrorErr as any)?.code, details: (mirrorErr as any)?.details, hint: (mirrorErr as any)?.hint, message: mirrorErr.message }, ["code", "details", "hint", "message"]);
        // not fatal? choose: return error OR continue
        return j({ error: "DB error: insert thread_mirrors", code: (mirrorErr as any)?.code, details: (mirrorErr as any)?.details, hint: (mirrorErr as any)?.hint, message: mirrorErr.message }, 500);
      }

      // Call your existing function to mirror into your central server
      const url = `${SUPABASE_URL}${POST_CONTRACT_FUNCTION_PATH}`;
      const payload = { contract_id: newContract.id };

      logExec(exec, "info", "calling post-contract fn", { url, has_apikey: !!SUPABASE_ANON_KEY, contract_id: newContract.id }, ["url", "has_apikey", "contract_id"]);

      const postResp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY, // required by Supabase gateway even with no-verify-jwt
          // Optionally also send Authorization with anon:
          // "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!postResp.ok) {
        const text = await postResp.text().catch(() => "");
        logExec(exec, "error", "post-contract call failed", { status: postResp.status, body: text.slice(0, 500) }, ["status", "body"]);
        return j({ error: "Upstream error: post-contract-to-discord", status: postResp.status, body: text }, 502);
      }

      logExec(exec, "info", "ingest complete", { contract_id: newContract.id }, ["contract_id"]);
      return j({ ok: true, contract_id: newContract.id });
    }

    logExec(exec, "error", "unknown type", { type: body?.type }, ["type"]);
    return j({ error: "Unknown type" }, 400);

  } catch (e: any) {
    logExec(exec, "error", "top-level exception", { err: e?.message, stack: e?.stack }, ["err", "stack"]);
    return j({ error: "Server error", message: e?.message ?? String(e) }, 500);
  }
});