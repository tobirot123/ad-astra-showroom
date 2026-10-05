import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { errorResponse, requireActor } from "@/lib/http";
import { optimizeImage } from "@/lib/media/optimize";
import { usingSupabase, withDb } from "@/lib/repo";
import { addMedia } from "@/lib/services/engine";
import { buildBootstrap } from "@/lib/services/present";
import { uid } from "@/lib/domain/ids";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const carpeta = String(form.get("carpeta") ?? "renders");
    const rol = String(form.get("rol") ?? "render") as "render" | "plano" | "portada" | "fachada" | "vista" | "corte";
    const unitId = String(form.get("unitId") ?? "") || null;
    const typologyId = String(form.get("typologyId") ?? "") || null;
    const floorId = String(form.get("floorId") ?? "") || null;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Elegí un archivo." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const id = uid();
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    let url = "";
    let variantes: { nombre: string; url: string; ancho: number }[] = [];
    let ancho: number | null = null;
    let alto: number | null = null;
    let aviso: string | null = null;
    let peso = bytes.byteLength;

    if (isImage) {
      const optimized = await optimizeImage(bytes);
      ancho = optimized.ancho;
      alto = optimized.alto;
      aviso = optimized.aviso;
      const main = optimized.variantes[optimized.variantes.length - 1] ?? optimized.variantes[0];
      peso = main?.buffer.byteLength ?? peso;
      if (usingSupabase()) {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });
        for (const variant of optimized.variantes) {
          const objectPath = `${projectId}/${id}-${variant.nombre}.webp`;
          const uploaded = await client.storage.from("media").upload(objectPath, variant.buffer, {
            contentType: "image/webp",
            upsert: true,
          });
          if (uploaded.error) throw new Error(uploaded.error.message);
          const publicUrl = client.storage.from("media").getPublicUrl(objectPath).data.publicUrl;
          variantes.push({ nombre: variant.nombre, url: publicUrl, ancho: variant.ancho });
        }
        url = variantes[variantes.length - 1]?.url ?? "";
      } else {
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        for (const variant of optimized.variantes) {
          const filename = `${id}-${variant.nombre}.webp`;
          await writeFile(path.join(dir, filename), variant.buffer);
          variantes.push({ nombre: variant.nombre, url: `/uploads/${filename}`, ancho: variant.ancho });
        }
        url = variantes[variantes.length - 1]?.url ?? "";
      }
    } else {
      aviso = "Guardamos el archivo original. La compresión de video queda para cuando haya ffmpeg en el servidor.";
      if (usingSupabase()) {
        const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false },
        });
        const objectPath = `${projectId}/${id}-${file.name}`;
        const uploaded = await client.storage.from("media").upload(objectPath, bytes, { contentType: file.type, upsert: true });
        if (uploaded.error) throw new Error(uploaded.error.message);
        url = client.storage.from("media").getPublicUrl(objectPath).data.publicUrl;
      } else {
        const dir = path.join(process.cwd(), "public", "uploads");
        await mkdir(dir, { recursive: true });
        const filename = `${id}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        await writeFile(path.join(dir, filename), bytes);
        url = `/uploads/${filename}`;
      }
      variantes = [{ nombre: "original", url, ancho: 0 }];
    }

    const now = new Date();
    const bootstrap = await withDb((db) => {
      const target = projectId || db.projects.find((p) => p.organization_id === actor.organization_id)?.id;
      if (!target) throw new Error("Sin proyecto");
      addMedia(db, actor, {
        projectId: target,
        nombre: file.name,
        url,
        variantes,
        peso,
        ancho,
        alto,
        aviso,
        carpeta,
        unitId,
        typologyId,
        floorId,
        rol,
        now,
      });
      return buildBootstrap(db, actor, now);
    });
    return NextResponse.json({ bootstrap, aviso });
  } catch (error) {
    return errorResponse(error);
  }
}
