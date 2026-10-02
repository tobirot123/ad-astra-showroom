import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { hashDemoPassword } from "@/lib/demo/passwords";
import { errorResponse, requireActor } from "@/lib/http";
import { flushJobs } from "@/lib/integrations/flush";
import { usingSupabase, withDb, withDemoFile } from "@/lib/repo";
import { createClient } from "@supabase/supabase-js";
import {
  approveRequest,
  archiveField,
  bulkUnits,
  cancelRequest,
  createCharacteristic,
  createField,
  createRequest,
  directStatus,
  extendRequest,
  importUnits,
  inviteUser,
  markRead,
  rejectRequest,
  revertInherit,
  saveIntegration,
  saveOverlays,
  sweep,
  undoChange,
  updateLead,
  updateProject,
  updateUnit,
  type OpResult,
} from "@/lib/services/engine";
import { buildBootstrap } from "@/lib/services/present";
import { ServiceError, type Actor, type Database, type FieldType, type Role, type UnitStatus } from "@/lib/domain/types";
import type { InheritedField } from "@/lib/domain/units";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date();
    const op = String(body.op ?? "");

    if (op === "invite") {
      const tempPassword = randomBytes(9).toString("base64url");
      const email = String(body.email ?? "");
      const nombre = String(body.nombre ?? "");
      const role = String(body.role ?? "seller") as Role;
      const projectId = String(body.projectId ?? "");
      let userId = "";
      if (usingSupabase()) {
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });
        const created = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { nombre },
        });
        if (created.error || !created.data.user) {
          return NextResponse.json({ error: created.error?.message ?? "No pudimos crear el usuario." }, { status: 400 });
        }
        userId = created.data.user.id;
      }
      await withDb((db) => {
        const invited = inviteUser(db, actor, projectId || db.projects[0].id, {
          email,
          nombre,
          role,
          userId: userId || undefined,
        });
        userId = invited.userId;
      });
      if (!usingSupabase()) {
        await withDemoFile((file) => {
          file.passwords[userId] = hashDemoPassword(tempPassword);
        });
      }
      const bootstrap = await withDb((db) => buildBootstrap(db, actor, now));
      return NextResponse.json({ bootstrap, tempPassword });
    }

    const result = await withDb((db) => run(db, actor, op, body, now));
    if (result.jobs.length) await flushJobs(result.jobs);
    const bootstrap = await withDb((db) => buildBootstrap(db, actor, now));
    return NextResponse.json({ bootstrap, extra: result.extra ?? null, emails: result.emails.length });
  } catch (error) {
    return errorResponse(error);
  }
}

function run(db: Database, actor: Actor, op: string, body: Record<string, unknown>, now: Date): OpResult {
  sweep(db, now);
  const projectId = String(body.projectId ?? db.projects.find((p) => p.organization_id === actor.organization_id)?.id ?? "");
  switch (op) {
    case "update_unit":
      return updateUnit(db, actor, String(body.unitId), (body.patch ?? {}) as never, now);
    case "direct_status":
      return directStatus(db, actor, String(body.unitId), body.estado as UnitStatus, Boolean(body.confirm), now);
    case "revert_inherit":
      return revertInherit(db, actor, String(body.unitId), body.field as InheritedField, now);
    case "bulk_units":
      return bulkUnits(db, actor, body.unitIds as string[], (body.patch ?? {}) as never, now);
    case "import_units":
      return importUnits(db, actor, projectId, String(body.csv ?? ""), Boolean(body.apply), Boolean(body.hideMissing), now);
    case "create_field":
      return createField(db, actor, projectId, body.field as { nombre: string; tipo: FieldType }, now);
    case "archive_field":
      return archiveField(db, actor, String(body.fieldId));
    case "create_characteristic":
      return createCharacteristic(db, actor, projectId, String(body.nombre ?? ""));
    case "save_overlays":
      return saveOverlays(db, actor, projectId, (body.overlays ?? []) as never, now);
    case "update_lead":
      return updateLead(db, actor, String(body.leadId), (body.patch ?? {}) as never, now);
    case "create_request":
      return createRequest(db, actor, { ...(body as object), now } as never);
    case "approve_request":
      return approveRequest(db, actor, String(body.requestId), body.comentario as string | undefined, Boolean(body.force), now);
    case "reject_request":
      return rejectRequest(db, actor, String(body.requestId), String(body.comentario ?? ""), now);
    case "cancel_request":
      return cancelRequest(db, actor, String(body.requestId), body.comentario as string | undefined, now);
    case "extend_request":
      return extendRequest(db, actor, String(body.requestId), Number(body.hours ?? 24), now);
    case "undo":
      return undoChange(db, actor, String(body.changeLogId), Boolean(body.force), now);
    case "mark_read":
      return markRead(db, actor, (body.notificationId as string) ?? "all");
    case "update_project":
      return updateProject(db, actor, projectId, (body.patch ?? {}) as never);
    case "save_integration":
      return saveIntegration(db, actor, projectId, body.tipo as "tokko" | "webhook", (body.config ?? {}) as never);
    case "test_tokko": {
      const integration = db.integrations.find((i) => i.project_id === projectId && i.tipo === "tokko");
      if (!integration?.config.api_key || !integration.config.development_id) {
        throw new ServiceError("Pegá la API key y el ID del emprendimiento antes de probar.");
      }
      const project = db.projects.find((p) => p.id === projectId);
      const lead = db.leads.find((l) => l.project_id === projectId);
      if (!lead || !project) throw new ServiceError("Necesitás al menos un lead en el proyecto para probar el envío.");
      integration.config.enabled = true;
      db.integration_deliveries.push({
        id: crypto.randomUUID(),
        integration_id: integration.id,
        lead_id: lead.id,
        intento: 0,
        estado: "pendiente",
        respuesta: null,
        next_retry_at: now.toISOString(),
        created_at: now.toISOString(),
      });
      const unit = lead.unit_id ? db.units.find((u) => u.id === lead.unit_id) ?? null : null;
      return {
        emails: [],
        jobs: [
          {
            integrationId: integration.id,
            leadId: lead.id,
            tipo: "tokko",
            url: `https://www.tokkobroker.com/api/v1/webcontact/?key=${encodeURIComponent(integration.config.api_key)}`,
            body: {
              name: lead.nombre,
              email: lead.email ?? undefined,
              cellphone: lead.telefono ?? undefined,
              text: `Prueba del showroom · ${project.nombre}${unit ? ` · Unidad ${unit.codigo}` : ""}`,
              tags: ["showroom", "prueba"],
              developments: [String(integration.config.development_id)],
            },
          },
        ],
        extra: { prueba: true },
      };
    }
    default:
      throw new ServiceError("Acción desconocida.");
  }
}
