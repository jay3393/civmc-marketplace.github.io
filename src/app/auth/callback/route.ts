import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/";
  const res = NextResponse.redirect(new URL(next, req.url));

  const supabase = await createClient();

  console.log("url", url);
  const code = url.searchParams.get("code");
  // to exchange the code for a session, we need code and code verifier
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      console.log("error", error?.message);
    } catch {
      // ignore; always redirect
    }
  }
  return res;
}