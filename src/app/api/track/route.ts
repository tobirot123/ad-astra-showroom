import { NextResponse } from "next/server";
import { classifySource, deviceFromUa, isBot } from "@/lib/domain/source";
import { withDb } from "@/lib/repo";
import { track } from "@/lib/services/engine";

export const dynamic = "force-dynamic";

const hits = new Map<string, { n: number; at: number }>();

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return NextResponse.json({ ok: true, ignored: true });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const nowMs = Date.now();
  const bucket = hits.get(ip);
  if (!bucket || nowMs - bucket.at > 60_000) hits.set(ip, { n: 1, at: nowMs });
  else if (bucket.n > 120) return NextResponse.json({ ok: true, limited: true });
  else bucket.n += 1;

  const body = (await request.json()) as {
    slug?: string;
    nombre?: string;
    visitorId?: string;
    sessionId?: string;
    unitId?: string | null;
    utm?: { utm_source?: string; utm_medium?: string; utm_campaign?: string; referrer?: string };
    width?: number;
    props?: Record<string, unknown>;
  };
  if (!body.slug || !body.nombre || !body.visitorId || !body.sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const fuente = classifySource(body.utm ?? {}, body.utm?.referrer);
  await withDb((db) => {
    const project = db.projects.find((p) => p.slug === body.slug && p.estado === "published");
    if (!project) return;
    track(db, {
      project_id: project.id,
      visitor_id: body.visitorId!,
      session_id: body.sessionId!,
      nombre: body.nombre!,
      props: body.props && typeof body.props === "object" ? body.props : {},
      unit_id: body.unitId ?? null,
      device: deviceFromUa(ua, body.width),
      utm_source: body.utm?.utm_source ?? null,
      utm_medium: body.utm?.utm_medium ?? null,
      utm_campaign: body.utm?.utm_campaign ?? null,
      referrer_tipo: fuente,
      fuente,
      ts: new Date().toISOString(),
    });
  });
  return NextResponse.json({ ok: true });
}
