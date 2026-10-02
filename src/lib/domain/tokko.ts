import type { Lead, Unit } from "@/lib/domain/types";

export interface TokkoContact {
  name: string;
  email?: string;
  cellphone?: string;
  text: string;
  tags: string[];
  developments?: string[];
}

export function buildWebcontactBody(input: {
  lead: Pick<Lead, "nombre" | "email" | "telefono" | "mensaje" | "fuente" | "utm" | "canal">;
  unit: Pick<Unit, "codigo"> | null;
  projectName: string;
  developmentId?: string | null;
}): TokkoContact {
  const { lead, unit } = input;
  const parts = [
    lead.mensaje?.trim() || "Consulta desde el showroom",
    unit ? `Unidad: ${unit.codigo}` : null,
    `Proyecto: ${input.projectName}`,
    `Fuente: ${lead.fuente}`,
    lead.utm.utm_campaign ? `Campaña: ${lead.utm.utm_campaign}` : null,
    `Canal: ${lead.canal === "whatsapp" ? "WhatsApp" : "Formulario"}`,
  ].filter(Boolean);
  const body: TokkoContact = {
    name: lead.nombre.trim(),
    text: parts.join(" · "),
    tags: ["showroom", lead.fuente].filter(Boolean),
  };
  if (lead.email) body.email = lead.email.trim();
  if (lead.telefono) body.cellphone = lead.telefono.trim();
  if (input.developmentId) body.developments = [String(input.developmentId)];
  return body;
}

export function tokkoUrl(apiKey: string, baseUrl = "https://www.tokkobroker.com"): string {
  const root = baseUrl.replace(/\/$/, "");
  return `${root}/api/v1/webcontact/?key=${encodeURIComponent(apiKey)}`;
}

export interface TokkoResponse {
  ok: boolean;
  status: number;
  body: string;
}

export async function postWebcontact(input: {
  apiKey: string;
  body: TokkoContact;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<TokkoResponse> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const res = await fetchImpl(tokkoUrl(input.apiKey, input.baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input.body),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 2000) };
}

/** Backoff: 2, 4, 8… minutos, tope 24 h. */
export function nextRetryAt(attempt: number, now: Date): Date {
  const minutes = Math.min(60 * 24, 2 ** Math.max(1, attempt));
  return new Date(now.getTime() + minutes * 60_000);
}

export function shouldAlertAdmin(consecutiveErrors: number): boolean {
  return consecutiveErrors >= 5;
}
