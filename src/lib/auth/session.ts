import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { usingSupabase } from "@/lib/demo/store";

export const SESSION_COOKIE = "adastra_session";

function secret(): string {
  return process.env.DEMO_AUTH_SECRET || "dev-only-adastra-secret";
}

export function signSession(userId: string): string {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    if (!data.uid || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function createSupabaseServer() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(items: { name: string; value: string; options?: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2] }[]) {
          for (const item of items) jar.set(item.name, item.value, item.options);
        },
      },
    },
  );
}

export async function currentUserId(): Promise<string | null> {
  if (usingSupabase()) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}
