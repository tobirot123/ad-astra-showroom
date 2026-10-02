import { NextResponse } from "next/server";
import { actorFor } from "@/lib/services/engine";
import { currentUserId } from "@/lib/auth/session";
import { withDb } from "@/lib/repo";
import { ServiceError, type Actor } from "@/lib/domain/types";

export async function requireActor(): Promise<Actor> {
  const userId = await currentUserId();
  if (!userId) throw new ServiceError("Tenés que iniciar sesión.", 401);
  const actor = await withDb((db) => actorFor(db, userId));
  if (!actor) throw new ServiceError("Tu usuario no tiene una organización asignada.", 403);
  return actor;
}

export function errorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, ...(error.extra ?? {}) }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "No pudimos completar la acción." }, { status: 500 });
}
