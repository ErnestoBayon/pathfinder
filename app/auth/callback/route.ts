import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Callback de OAuth: Supabase regresa con un `code` que intercambiamos por la
// sesión (cookies) y mandamos al usuario a /home. Si falla, de vuelta a /login.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/home`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
