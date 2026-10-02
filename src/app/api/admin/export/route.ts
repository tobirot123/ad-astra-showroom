import { NextResponse } from "next/server";
import { errorResponse, requireActor } from "@/lib/http";
import { withDb } from "@/lib/repo";
import { exportCsv } from "@/lib/services/engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const projectId = new URL(request.url).searchParams.get("projectId");
    const csv = await withDb((db) => {
      const project = projectId
        ? db.projects.find((p) => p.id === projectId)
        : db.projects.find((p) => p.organization_id === actor.organization_id);
      if (!project) throw new Error("missing");
      return exportCsv(db, actor, project.id);
    });
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=unidades.csv",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
