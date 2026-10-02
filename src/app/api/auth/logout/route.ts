import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, createSupabaseServer } from "@/lib/auth/session";
import { usingSupabase } from "@/lib/repo";

export async function POST() {
  if (usingSupabase()) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
