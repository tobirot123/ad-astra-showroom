import type {
  Actor,
  Lead,
  RequestEstado,
  RequestTipo,
  StatusChangeRequest,
  StatusChangeRequestEvent,
  Unit,
  UnitStatus,
} from "@/lib/domain/types";
import { uid } from "@/lib/domain/ids";
import { REQUEST_LABEL, STATUS_LABEL } from "@/lib/domain/format";

export const TRANSITIONS: Record<RequestTipo, { from: UnitStatus[]; to: UnitStatus }> = {
  reserve: { from: ["disponible"], to: "reservada" },
  sell: { from: ["disponible", "reservada"], to: "vendida" },
  release: { from: ["reservada"], to: "disponible" },
};

export interface RequestFail {
  ok: false;
  error: string;
  conflict?: boolean;
  needsConfirm?: boolean;
}

export interface RequestOk<T> {
  ok: true;
  value: T;
}

export type RequestResult<T> = RequestOk<T> | RequestFail;

export function hoursUntil(expiresAt: string, now: Date): number {
  return (new Date(expiresAt).getTime() - now.getTime()) / 3_600_000;
}

export function hoursLeftLabel(expiresAt: string, now: Date): string {
  const h = hoursUntil(expiresAt, now);
  if (h <= 0) return "vencida";
  if (h < 1) return "menos de 1 h";
  return `${Math.ceil(h)} h`;
}

/**
 * El showroom público no muestra la reserva hasta que el admin aprueba.
 * Con `ask`, la unidad figura como "consultar" y no se cotiza.
 */
export function publicStatus(
  unit: Pick<Unit, "estado" | "pending_request_id">,
  display: "available" | "ask",
): UnitStatus | "consultar" {
  if (unit.estado === "oculta") return "oculta";
  if (unit.pending_request_id && display === "ask") return "consultar";
  return unit.estado;
}

export function pendingBadge(tipo: RequestTipo | null): string | null {
  if (tipo === "reserve") return "Reserva pendiente";
  if (tipo === "sell") return "Venta pendiente";
  if (tipo === "release") return "Liberación pendiente";
  return null;
}

function fail(error: string, extra?: { conflict?: boolean; needsConfirm?: boolean }): RequestFail {
  return { ok: false, error, ...extra };
}

export interface CreateRequestInput {
  unit: Unit;
  actor: Actor;
  tipo: RequestTipo;
  now: Date;
  expiryHours: number;
  leadRequired: boolean;
  pending: StatusChangeRequest | null;
  lead: Lead | null;
  comentario?: string | null;
  montoSena?: number | null;
  priceListId?: string | null;
  paymentPlanId?: string | null;
}

export function createStatusRequest(
  input: CreateRequestInput,
): RequestResult<{
  request: StatusChangeRequest;
  event: StatusChangeRequestEvent;
  unitPatch: Pick<Unit, "pending_request_id" | "updated_at">;
}> {
  const { unit, actor, tipo, now, pending, lead, leadRequired } = input;

  if (actor.role !== "seller") {
    return fail("Solo un vendedor puede solicitar un cambio. El admin cambia el estado directo.");
  }
  const rule = TRANSITIONS[tipo];
  if (!rule.from.includes(unit.estado)) {
    return fail(
      `No se puede ${REQUEST_LABEL[tipo].toLowerCase()} una unidad en estado ${STATUS_LABEL[unit.estado]}.`,
    );
  }
  if (tipo === "release" && unit.reserved_by_user_id !== actor.id) {
    return fail("Solo podés pedir liberar unidades reservadas a tu nombre.");
  }
  if (pending && pending.estado === "pending") {
    return fail(
      `Esta unidad tiene una solicitud pendiente — vence en ${hoursLeftLabel(pending.expires_at, now)}.`,
    );
  }
  if ((tipo === "reserve" || tipo === "sell") && leadRequired && !lead) {
    return fail("Para reservar o vender tenés que indicar el cliente.");
  }

  const hours = Math.min(24 * 7, Math.max(1, input.expiryHours || 48));
  const id = uid();
  const created = now.toISOString();
  const request: StatusChangeRequest = {
    id,
    project_id: unit.project_id,
    unit_id: unit.id,
    tipo,
    estado_desde: unit.estado,
    estado_hacia: rule.to,
    requested_by: actor.id,
    lead_id: lead?.id ?? null,
    price_list_id: input.priceListId ?? null,
    payment_plan_id: input.paymentPlanId ?? null,
    monto_sena: input.montoSena ?? null,
    moneda_sena: input.montoSena ? "USD" : null,
    comentario_vendedor: input.comentario?.trim() || null,
    estado: "pending",
    expires_at: new Date(now.getTime() + hours * 3_600_000).toISOString(),
    extended_count: 0,
    decided_by: null,
    decided_at: null,
    comentario_admin: null,
    unit_version_at_request: unit.version,
    reverted: false,
    created_at: created,
    updated_at: created,
  };
  const event: StatusChangeRequestEvent = {
    id: uid(),
    request_id: id,
    tipo: "created",
    user_id: actor.id,
    detalle: { tipo, unit: unit.codigo },
    created_at: created,
  };
  return {
    ok: true,
    value: {
      request,
      event,
      unitPatch: { pending_request_id: id, updated_at: created },
    },
  };
}

export interface DecideContext {
  request: StatusChangeRequest;
  unit: Unit;
  actor: Actor;
  now: Date;
}

export function approveStatusRequest(
  ctx: DecideContext & { comentario?: string | null; force?: boolean },
): RequestResult<{
  request: StatusChangeRequest;
  unit: Unit;
  event: StatusChangeRequestEvent;
  leadEstado: "reserva" | "venta" | null;
}> {
  const { request, unit, actor, now } = ctx;
  if (actor.role !== "org_admin" && actor.role !== "superadmin") {
    return fail("No tenés permiso para aprobar solicitudes.");
  }
  if (request.estado !== "pending") return fail("La solicitud ya no está pendiente.");
  if (new Date(request.expires_at).getTime() <= now.getTime()) {
    return fail("La solicitud está vencida. Ya no se puede aprobar.");
  }

  const conflict =
    unit.estado !== request.estado_desde || unit.version !== request.unit_version_at_request;
  if (conflict && !ctx.force) {
    return fail(
      `La unidad ${unit.codigo} cambió desde la solicitud (ahora está ${STATUS_LABEL[unit.estado]}). Confirmá si igual querés aprobar.`,
      { conflict: true },
    );
  }
  if (!TRANSITIONS[request.tipo].from.includes(unit.estado) && !ctx.force) {
    return fail(
      `El estado actual (${STATUS_LABEL[unit.estado]}) no permite ${REQUEST_LABEL[request.tipo].toLowerCase()}.`,
      { conflict: true },
    );
  }

  const at = now.toISOString();
  const nextUnit: Unit = {
    ...unit,
    estado: request.estado_hacia,
    pending_request_id: null,
    version: unit.version + 1,
    updated_at: at,
    updated_by: actor.id,
  };
  if (request.tipo === "reserve" || request.tipo === "sell") {
    nextUnit.reserved_by_user_id = request.requested_by;
    nextUnit.reserved_lead_id = request.lead_id;
  }
  if (request.tipo === "release") {
    nextUnit.reserved_by_user_id = null;
    nextUnit.reserved_lead_id = null;
  }
  const nextReq: StatusChangeRequest = {
    ...request,
    estado: "approved",
    decided_by: actor.id,
    decided_at: at,
    comentario_admin: ctx.comentario?.trim() || null,
    updated_at: at,
  };
  return {
    ok: true,
    value: {
      request: nextReq,
      unit: nextUnit,
      event: {
        id: uid(),
        request_id: request.id,
        tipo: "approved",
        user_id: actor.id,
        detalle: { force: Boolean(ctx.force) },
        created_at: at,
      },
      leadEstado: request.tipo === "sell" ? "venta" : request.tipo === "reserve" ? "reserva" : null,
    },
  };
}

export function rejectStatusRequest(
  ctx: DecideContext & { comentario?: string | null },
): RequestResult<{ request: StatusChangeRequest; unit: Unit; event: StatusChangeRequestEvent }> {
  const { request, unit, actor, now } = ctx;
  if (actor.role !== "org_admin" && actor.role !== "superadmin") {
    return fail("No tenés permiso para rechazar solicitudes.");
  }
  if (request.estado !== "pending") return fail("La solicitud ya no está pendiente.");
  const comentario = ctx.comentario?.trim() ?? "";
  if (!comentario) return fail("El rechazo necesita un comentario.");
  const at = now.toISOString();
  return {
    ok: true,
    value: {
      request: {
        ...request,
        estado: "rejected",
        decided_by: actor.id,
        decided_at: at,
        comentario_admin: comentario,
        updated_at: at,
      },
      unit: { ...unit, pending_request_id: null, updated_at: at },
      event: {
        id: uid(),
        request_id: request.id,
        tipo: "rejected",
        user_id: actor.id,
        detalle: { comentario },
        created_at: at,
      },
    },
  };
}

export function cancelStatusRequest(
  ctx: DecideContext & { comentario?: string | null },
): RequestResult<{ request: StatusChangeRequest; unit: Unit; event: StatusChangeRequestEvent }> {
  const { request, unit, actor, now } = ctx;
  if (request.estado !== "pending") return fail("La solicitud ya no está pendiente.");
  const isOwner = request.requested_by === actor.id;
  const isAdmin = actor.role === "org_admin" || actor.role === "superadmin";
  if (!isOwner && !isAdmin) return fail("Solo podés cancelar tus propias solicitudes.");
  const at = now.toISOString();
  return {
    ok: true,
    value: {
      request: {
        ...request,
        estado: "cancelled",
        decided_by: actor.id,
        decided_at: at,
        comentario_admin: ctx.comentario?.trim() || request.comentario_admin,
        updated_at: at,
      },
      unit: { ...unit, pending_request_id: null, updated_at: at },
      event: {
        id: uid(),
        request_id: request.id,
        tipo: "cancelled",
        user_id: actor.id,
        detalle: {},
        created_at: at,
      },
    },
  };
}

export function extendStatusRequest(
  ctx: DecideContext & { hours: number },
): RequestResult<{ request: StatusChangeRequest; event: StatusChangeRequestEvent }> {
  const { request, actor, now } = ctx;
  if (actor.role !== "org_admin" && actor.role !== "superadmin") {
    return fail("No tenés permiso para extender el vencimiento.");
  }
  if (request.estado !== "pending") return fail("La solicitud ya no está pendiente.");
  const hours = Math.min(24 * 7, Math.max(1, ctx.hours));
  const at = now.toISOString();
  const base = Math.max(new Date(request.expires_at).getTime(), now.getTime());
  return {
    ok: true,
    value: {
      request: {
        ...request,
        expires_at: new Date(base + hours * 3_600_000).toISOString(),
        extended_count: request.extended_count + 1,
        updated_at: at,
      },
      event: {
        id: uid(),
        request_id: request.id,
        tipo: "extended",
        user_id: actor.id,
        detalle: { hours },
        created_at: at,
      },
    },
  };
}

export function expireStatusRequest(
  request: StatusChangeRequest,
  unit: Unit,
  now: Date,
): RequestResult<{ request: StatusChangeRequest; unit: Unit; event: StatusChangeRequestEvent }> | null {
  if (request.estado !== "pending") return null;
  if (new Date(request.expires_at).getTime() > now.getTime()) return null;
  const at = now.toISOString();
  return {
    ok: true,
    value: {
      request: { ...request, estado: "expired" satisfies RequestEstado, updated_at: at, decided_at: at },
      unit: {
        ...unit,
        pending_request_id: unit.pending_request_id === request.id ? null : unit.pending_request_id,
        updated_at: at,
      },
      event: {
        id: uid(),
        request_id: request.id,
        tipo: "expired",
        user_id: null,
        detalle: {},
        created_at: at,
      },
    },
  };
}

export function directStatusChange(input: {
  unit: Unit;
  actor: Actor;
  estado: UnitStatus;
  now: Date;
  pending: StatusChangeRequest | null;
  confirm?: boolean;
}): RequestResult<{
  unit: Unit;
  pending: StatusChangeRequest | null;
  event: StatusChangeRequestEvent | null;
}> {
  const { unit, actor, estado, now, pending } = input;
  if (actor.role !== "org_admin" && actor.role !== "superadmin") {
    return fail("Un vendedor no puede cambiar el estado oficial. Tenés que enviar una solicitud.");
  }
  if (unit.estado === estado && !pending) return fail("La unidad ya está en ese estado.");
  if (unit.estado === "vendida" && estado === "disponible" && !input.confirm) {
    return fail("La unidad está vendida. Confirmá si querés volver a dejarla disponible.", {
      needsConfirm: true,
    });
  }
  if (pending && pending.estado === "pending" && !input.confirm) {
    return fail(
      "Hay una solicitud pendiente. Si cambiás el estado, se cierra como resuelta por cambio directo y se avisa al vendedor.",
      { needsConfirm: true },
    );
  }
  const at = now.toISOString();
  let nextPending: StatusChangeRequest | null = pending;
  let event: StatusChangeRequestEvent | null = null;
  if (pending && pending.estado === "pending") {
    nextPending = {
      ...pending,
      estado: "resolved_by_direct_change",
      decided_by: actor.id,
      decided_at: at,
      updated_at: at,
    };
    event = {
      id: uid(),
      request_id: pending.id,
      tipo: "resolved",
      user_id: actor.id,
      detalle: { estado },
      created_at: at,
    };
  }
  const nextUnit: Unit = {
    ...unit,
    estado,
    pending_request_id: null,
    version: unit.version + 1,
    updated_at: at,
    updated_by: actor.id,
  };
  if (estado === "disponible") {
    nextUnit.reserved_by_user_id = null;
    nextUnit.reserved_lead_id = null;
  }
  return { ok: true, value: { unit: nextUnit, pending: nextPending, event } };
}

export function dueReminders(
  request: StatusChangeRequest,
  events: StatusChangeRequestEvent[],
  now: Date,
): Array<"reminder_sent" | "reminder_4h"> {
  if (request.estado !== "pending") return [];
  const out: Array<"reminder_sent" | "reminder_4h"> = [];
  const ageH = (now.getTime() - new Date(request.created_at).getTime()) / 3_600_000;
  const leftH = hoursUntil(request.expires_at, now);
  if (ageH >= 24 && !events.some((e) => e.tipo === "reminder_sent")) out.push("reminder_sent");
  if (leftH <= 4 && leftH > 0 && !events.some((e) => e.tipo === "reminder_4h")) out.push("reminder_4h");
  return out;
}
