import { NextResponse } from "next/server";
import { buildPdf } from "@/lib/docs/sheets";
import { showQuote } from "@/lib/domain/finance";
import { formatUsd } from "@/lib/domain/format";
import { uid } from "@/lib/domain/ids";
import { cashPrice } from "@/lib/services/engine";
import { withDb } from "@/lib/repo";

export const dynamic = "force-dynamic";

function money(value: number, moneda: "USD" | "ARS") {
  if (moneda === "USD") return formatUsd(value);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { slug?: string; codigo?: string; planId?: string; nombre?: string; email?: string };
  if (!body.slug || !body.codigo || !body.planId || !body.nombre?.trim()) {
    return NextResponse.json({ error: "Faltan datos de la cotización." }, { status: 400 });
  }
  const origin = new URL(request.url).origin;
  const site = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const built = await withDb((db) => {
    const project = db.projects.find((item) => item.slug === body.slug && item.estado === "published");
    const unit = project ? db.units.find((item) => item.project_id === project.id && item.codigo.toLowerCase() === body.codigo!.toLowerCase()) : undefined;
    const plan = db.payment_plans.find((item) => item.id === body.planId);
    const list = plan ? db.price_lists.find((item) => item.id === plan.price_list_id && item.project_id === project?.id) : undefined;
    if (!project || !unit || !plan || !list) return null;
    const precio = cashPrice(db, unit);
    if (precio == null) return { error: "Esta unidad no publica precio." };
    const shown = showQuote(precio, plan, project.settings.usd_ars ?? 1450, project.settings.cac_factor ?? 1);
    const seller = db.memberships.find((item) => item.organization_id === project.organization_id && item.role === "seller" && item.estado === "active");
    const sellerProfile = seller ? db.profiles.find((item) => item.id === seller.user_id) : undefined;
    const id = uid();
    db.quotations.push({
      id,
      project_id: project.id,
      unit_id: unit.id,
      lead_id: null,
      seller_id: seller?.user_id ?? null,
      broker_id: null,
      price_list_id: list.id,
      payment_plan_id: plan.id,
      moneda: shown.moneda,
      precio: shown.precioUsd,
      detalle: { nombre: body.nombre, email: body.email ?? null, shown },
      estado: "enviada",
      created_at: new Date().toISOString(),
    });
    return { project, unit, plan, shown, seller: sellerProfile ?? null, id };
  });
  if (!built) return NextResponse.json({ error: "No pudimos armar la cotización." }, { status: 404 });
  if ("error" in built) return NextResponse.json({ error: built.error }, { status: 400 });
  const link = `${site}/s/${built.project.slug}?unidad=${built.unit.codigo}`;
  const { shown } = built;
  const lines = [
    `${built.unit.codigo} · ${built.plan.nombre}`,
    `Precio de lista ${formatUsd(shown.precioUsd)}`,
    `Anticipo ${money(shown.anticipo, shown.moneda)}`,
    `${built.plan.cuotas} cuotas de ${money(shown.cuota, shown.moneda)}`,
    `Ultima cuota estimada ${money(shown.ultima, shown.moneda)}`,
    ...shown.refuerzos.map((item) => `Refuerzo ${item.pct}% · ${money(item.monto, shown.moneda)}`),
    `Saldo a la posesion ${money(shown.saldo, shown.moneda)}`,
    built.seller ? `Vendedor ${built.seller.nombre} · ${built.seller.email}` : "Comercial del proyecto",
    `Para ${body.nombre}`,
    shown.legal,
    shown.indice ?? "",
  ].filter(Boolean);
  const bytes = await buildPdf({ title: `Cotizacion ${built.unit.codigo}`, url: link, lines });
  if (body.email && process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "showroom@adastra.demo",
        to: [body.email, built.seller?.email].filter(Boolean),
        subject: `Cotización ${built.unit.codigo} · ${built.project.nombre}`,
        text: lines.join("\n"),
      }),
    }).catch(() => undefined);
  }
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="cotizacion-${built.unit.codigo}.pdf"`,
    },
  });
}
