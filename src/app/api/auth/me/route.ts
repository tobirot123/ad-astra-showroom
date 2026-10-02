import { NextResponse } from "next/server";
import { errorResponse, requireActor } from "@/lib/http";
import { usingSupabase } from "@/lib/repo";

export async function GET() {
  try {
    const actor = await requireActor();
    return NextResponse.json({ actor, mode: usingSupabase() ? "supabase" : "demo" });
  } catch (error) {
    return errorResponse(error);
  }
}
