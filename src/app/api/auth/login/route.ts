import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, createSupabaseServer, signSession } from "@/lib/auth/session";
import { verifyDemoPassword } from "@/lib/demo/passwords";
import { usingSupabase, withDemoFile } from "@/lib/repo";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Completá el email y la contraseña." }, { status: 400 });
  }

  if (usingSupabase()) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
    return NextResponse.json({ ok: true });
  }

  const userId = await withDemoFile((file) => {
    const profile = file.db.profiles.find((p) => p.email.toLowerCase() === email);
    const hash = profile ? file.passwords[profile.id] : undefined;
    if (!profile || !hash || !verifyDemoPassword(password, hash)) return null;
    profile.ultimo_acceso = new Date().toISOString();
    return profile.id;
  });
  if (!userId) return NextResponse.json({ error: "Email o contraseña incorrectos." }, { status: 401 });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return NextResponse.json({ ok: true });
}
