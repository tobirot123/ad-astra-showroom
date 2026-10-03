import { NextResponse } from "next/server";
import { buildPdf } from "@/lib/docs/sheets";
import { formatM2, formatUsd } from "@/lib/domain/format";
import { withDb } from "@/lib/repo";
import { buildShowroom } from "@/lib/services/present";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const codigo = url.searchParams.get("codigo") ?? "";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const payload = await withDb((db) => {
    const showroom = buildShowroom(db, slug);
    const unit = showroom?.units.find((item) => item.codigo.toLowerCase() === codigo.toLowerCase());
    if (!showroom || !unit) return null;
    return { showroom, unit };
  });
  if (!payload) return NextResponse.json({ error: "No encontramos la unidad." }, { status: 404 });
  const { showroom, unit } = payload;
  const link = `${origin}/s/${slug}?unidad=${unit.codigo}`;
  const bytes = await buildPdf({
    title: `${showroom.project.nombre} · ${unit.codigo}`,
    url: link,
    lines: [
      `${unit.tipologia} · ${unit.torre} · ${unit.piso}`,
      unit.mostrar_precio && unit.precio != null ? formatUsd(unit.precio) : "Consultar precio",
      unit.m2_totales != null ? `${formatM2(unit.m2_totales)} m2 totales` : "",
      unit.dormitorios != null ? `${unit.dormitorios} dormitorios · ${unit.banos ?? "—"} banos` : "",
      unit.orientacion ? `Orientacion ${unit.orientacion}` : "",
      showroom.project.direccion,
      showroom.project.legal,
    ].filter(Boolean),
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="ficha-${unit.codigo}.pdf"`,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { slug?: string; codigo?: string; email?: string };
  if (!body.slug || !body.codigo || !body.email?.includes("@")) {
    return NextResponse.json({ message: "Escribí un email válido." }, { status: 400 });
  }
  const url = new URL(request.url);
  const sheetUrl = `${url.origin}/api/public/ficha?slug=${encodeURIComponent(body.slug)}&codigo=${encodeURIComponent(body.codigo)}`;
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ message: "El correo del proyecto no está activo. Descargá la ficha en PDF." });
  }
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "showroom@adastra.demo",
      to: [body.email],
      subject: `Ficha ${body.codigo}`,
      text: `Tu ficha está en ${sheetUrl}`,
    }),
  }).then((response) => response.ok).catch(() => false);
  return NextResponse.json({
    message: sent ? "Te mandamos el link de la ficha." : "No pudimos enviar el correo. Descargá el PDF.",
  });
}
