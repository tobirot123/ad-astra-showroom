import { NextResponse } from "next/server";
import { classifySource, isBot } from "@/lib/domain/source";
import { ServiceError } from "@/lib/domain/types";
import { flushJobs } from "@/lib/integrations/flush";
import { withDb } from "@/lib/repo";
import { submitLead, track } from "@/lib/services/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (isBot(request.headers.get("user-agent"))) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    const body = (await request.json()) as {
      slug?: string;
      unitId?: string;
      nombre?: string;
      email?: string;
      telefono?: string;
      mensaje?: string;
      canal?: "form" | "whatsapp";
      utm?: Record<string, string | undefined>;
      sessionId?: string;
      visitorId?: string;
    };
    const now = new Date();
    const created = await withDb((db) => {
      const project = db.projects.find((p) => p.slug === body.slug && p.estado === "published");
      if (!project) throw new ServiceError("No encontramos el emprendimiento.", 404);
      const result = submitLead(db, {
        projectId: project.id,
        unitId: body.unitId,
        nombre: body.nombre ?? "",
        email: body.email,
        telefono: body.telefono,
        mensaje: body.mensaje,
        canal: body.canal ?? "form",
        utm: body.utm ?? {},
        sessionId: body.sessionId,
        visitorId: body.visitorId,
        now,
      });
      track(db, {
        project_id: project.id,
        visitor_id: body.visitorId || "anon",
        session_id: body.sessionId || "anon",
        nombre: body.canal === "whatsapp" ? "whatsapp_click" : "lead_submitted",
        props: { lead_id: result.lead.id },
        unit_id: body.unitId ?? null,
        device: "mobile",
        utm_source: body.utm?.utm_source ?? null,
        utm_medium: body.utm?.utm_medium ?? null,
        utm_campaign: body.utm?.utm_campaign ?? null,
        referrer_tipo: null,
        fuente: classifySource(body.utm ?? {}),
        ts: now.toISOString(),
      });
      return result;
    });
    if (created.result.jobs.length) await flushJobs(created.result.jobs);
    return NextResponse.json({ ok: true, leadId: created.lead.id, created: created.created });
  } catch (error) {
    const message = error instanceof ServiceError ? error.message : "No pudimos enviar la consulta.";
    const status = error instanceof ServiceError ? error.status : 500;
    if (!(error instanceof ServiceError)) console.error(error);
    return NextResponse.json({ error: message }, { status });
  }
}
