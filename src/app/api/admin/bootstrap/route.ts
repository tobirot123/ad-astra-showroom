import { NextResponse } from "next/server";
import { errorResponse, requireActor } from "@/lib/http";
import { flushJobs } from "@/lib/integrations/flush";
import { withDb } from "@/lib/repo";
import { dueJobs, sweep } from "@/lib/services/engine";
import { buildBootstrap } from "@/lib/services/present";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireActor();
    const now = new Date();
    const first = await withDb((db) => {
      sweep(db, now);
      return { bootstrap: buildBootstrap(db, actor, now), jobs: dueJobs(db, now) };
    });
    if (first.jobs.length) {
      await flushJobs(first.jobs);
      const bootstrap = await withDb((db) => buildBootstrap(db, actor, now));
      return NextResponse.json(bootstrap);
    }
    return NextResponse.json(first.bootstrap);
  } catch (error) {
    return errorResponse(error);
  }
}
