import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mapIdColors } from "@/lib/domain/facade-mask";
import { can } from "@/lib/domain/permissions";
import { errorResponse, requireActor } from "@/lib/http";
import { readIdPassColors } from "@/lib/media/id-pass";
import { usingSupabase, withDb } from "@/lib/repo";
import { uid } from "@/lib/domain/ids";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    if (!can(actor, "edit_overlays")) {
      return NextResponse.json({ error: "No podés editar las zonas." }, { status: 403 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const modo = String(form.get("modo") ?? "idcolor");
    if (!(file instanceof File)) return NextResponse.json({ error: "Elegí un archivo." }, { status: 400 });
    if (!/\.png$/i.test(file.name) && file.type !== "image/png") {
      return NextResponse.json({ error: "Subí un PNG. El JPG cambia los colores y pierde el alpha." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.byteLength > 25_000_000) return NextResponse.json({ error: "El PNG pesa más de 25 MB." }, { status: 400 });
    const id = uid();
    const filename = `${id}-mascara.png`;
    let url = "";
    if (usingSupabase()) {
      const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      });
      const objectPath = `${projectId}/${filename}`;
      const uploaded = await client.storage.from("media").upload(objectPath, bytes, { contentType: "image/png", upsert: true });
      if (uploaded.error) throw new Error(uploaded.error.message);
      url = client.storage.from("media").getPublicUrl(objectPath).data.publicUrl;
    } else {
      const dir = path.join(process.cwd(), "public", "uploads");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), bytes);
      url = `/uploads/${filename}`;
    }

    if (modo === "alpha") return NextResponse.json({ url, mapa: [], colores: [] });

    const colores = await readIdPassColors(bytes);
    const units = await withDb((db) =>
      db.units
        .filter((unit) => unit.project_id === projectId)
        .map((unit) => ({ id: unit.id, codigo: unit.codigo })),
    );
    const mapa = mapIdColors(colores, units).map(({ color, unidad_id }) => ({ color, unidad_id }));
    return NextResponse.json({ url, colores, mapa });
  } catch (error) {
    return errorResponse(error);
  }
}
