import { describe, expect, it } from "vitest";
import {
  approveStatusRequest,
  createStatusRequest,
  directStatusChange,
  expireStatusRequest,
  publicStatus,
  rejectStatusRequest,
} from "@/lib/domain/requests";
import type { Actor, Lead, StatusChangeRequest, Unit } from "@/lib/domain/types";

const now = new Date("2026-10-02T15:00:00.000Z");

function seller(id = "laura"): Actor {
  return {
    id,
    nombre: "Laura",
    email: "laura@example.com",
    role: "seller",
    organization_id: "org",
    project_ids: null,
    permisos: { can_edit_prices: false, sees_all_leads: false, sees_metrics: false },
  };
}

function admin(): Actor {
  return { ...seller("martin"), nombre: "Martín", role: "org_admin" };
}

function unit(partial: Partial<Unit> = {}): Unit {
  return {
    id: "u1",
    project_id: "p1",
    floor_id: "f1",
    typology_id: null,
    codigo: "1D",
    tipo: "departamento",
    ambientes: 2,
    dormitorios: 1,
    banos: 1,
    m2_cubiertos: 48.2,
    m2_semicubiertos: 0,
    m2_descubiertos: 0,
    m2_totales: 55.1,
    orientacion: "Oeste",
    vista: null,
    estado: "disponible",
    pending_request_id: null,
    reserved_by_user_id: null,
    reserved_lead_id: null,
    mostrar_precio: true,
    destacada: false,
    notas_internas: null,
    custom_values: {},
    overrides: [],
    version: 3,
    updated_at: now.toISOString(),
    updated_by: null,
    ...partial,
  };
}

const lead: Lead = {
  id: "lead-1",
  project_id: "p1",
  unit_id: "u1",
  nombre: "Ana López",
  email: "ana@example.com",
  telefono: "123",
  mensaje: null,
  canal: "form",
  estado: "nuevo",
  assigned_to: "laura",
  utm: {},
  fuente: "Meta Ads",
  session_id: null,
  visitor_id: null,
  created_at: now.toISOString(),
  updated_at: now.toISOString(),
};

describe("solicitudes de estado", () => {
  it("un vendedor reserva y el showroom sigue disponible", () => {
    const created = createStatusRequest({
      unit: unit(),
      actor: seller(),
      tipo: "reserve",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: null,
      lead,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const pendingUnit = unit({ pending_request_id: created.value.request.id });
    expect(publicStatus(pendingUnit, "available")).toBe("disponible");
    expect(publicStatus(pendingUnit, "ask")).toBe("consultar");
    expect(created.value.request.estado_hacia).toBe("reservada");
    const hours = (new Date(created.value.request.expires_at).getTime() - now.getTime()) / 3_600_000;
    expect(hours).toBe(48);
  });

  it("un admin no crea solicitudes y un vendedor no aprueba", () => {
    const asAdmin = createStatusRequest({
      unit: unit(),
      actor: admin(),
      tipo: "reserve",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: null,
      lead,
    });
    expect(asAdmin.ok).toBe(false);

    const created = createStatusRequest({
      unit: unit(),
      actor: seller(),
      tipo: "reserve",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: null,
      lead,
    });
    if (!created.ok) throw new Error("debía crearse");
    const approved = approveStatusRequest({
      request: created.value.request,
      unit: unit({ pending_request_id: created.value.request.id }),
      actor: seller(),
      now,
    });
    expect(approved.ok).toBe(false);
  });

  it("la segunda solicitud sobre la misma unidad no entra", () => {
    const first = createStatusRequest({
      unit: unit(),
      actor: seller(),
      tipo: "reserve",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: null,
      lead,
    });
    if (!first.ok) throw new Error("debía crearse");
    const second = createStatusRequest({
      unit: unit({ pending_request_id: first.value.request.id }),
      actor: seller("otro"),
      tipo: "sell",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: first.value.request,
      lead,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/solicitud pendiente/i);
  });

  it("liberar solo vale sobre una reserva propia", () => {
    const foreign = createStatusRequest({
      unit: unit({ estado: "reservada", reserved_by_user_id: "otra" }),
      actor: seller(),
      tipo: "release",
      now,
      expiryHours: 48,
      leadRequired: false,
      pending: null,
      lead: null,
    });
    expect(foreign.ok).toBe(false);
    const own = createStatusRequest({
      unit: unit({ estado: "reservada", reserved_by_user_id: "laura" }),
      actor: seller(),
      tipo: "release",
      now,
      expiryHours: 48,
      leadRequired: false,
      pending: null,
      lead: null,
    });
    expect(own.ok).toBe(true);
  });

  it("aprobar cambia el estado, asigna la reserva y exige comentario para rechazar", () => {
    const created = createStatusRequest({
      unit: unit(),
      actor: seller(),
      tipo: "reserve",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: null,
      lead,
    });
    if (!created.ok) throw new Error("debía crearse");
    const live = unit({ pending_request_id: created.value.request.id });
    const rejected = rejectStatusRequest({ request: created.value.request, unit: live, actor: admin(), now, comentario: "  " });
    expect(rejected.ok).toBe(false);

    const approved = approveStatusRequest({
      request: created.value.request,
      unit: live,
      actor: admin(),
      now,
      comentario: "Seña confirmada",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.value.unit.estado).toBe("reservada");
    expect(approved.value.unit.pending_request_id).toBeNull();
    expect(approved.value.unit.reserved_by_user_id).toBe("laura");
    expect(approved.value.leadEstado).toBe("reserva");
    expect(approved.value.unit.version).toBe(4);

    const denied = rejectStatusRequest({
      request: created.value.request,
      unit: live,
      actor: admin(),
      now,
      comentario: "Ya está señada por oficina",
    });
    expect(denied.ok).toBe(true);
    if (denied.ok) expect(denied.value.unit.pending_request_id).toBeNull();
    expect(denied.ok && denied.value.unit.estado).toBe("disponible");
  });

  it("no aprueba si el estado cambió, salvo confirmación explícita", () => {
    const created = createStatusRequest({
      unit: unit(),
      actor: seller(),
      tipo: "reserve",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: null,
      lead,
    });
    if (!created.ok) throw new Error("debía crearse");
    const changed = unit({ estado: "reservada", version: 9, pending_request_id: created.value.request.id });
    const blocked = approveStatusRequest({ request: created.value.request, unit: changed, actor: admin(), now });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.conflict).toBe(true);
    const forced = approveStatusRequest({
      request: created.value.request,
      unit: changed,
      actor: admin(),
      now,
      force: true,
    });
    expect(forced.ok).toBe(true);
  });

  it("vence a las 48 h y libera el bloqueo", () => {
    const created = createStatusRequest({
      unit: unit(),
      actor: seller(),
      tipo: "reserve",
      now,
      expiryHours: 48,
      leadRequired: true,
      pending: null,
      lead,
    });
    if (!created.ok) throw new Error("debía crearse");
    const before = expireStatusRequest(created.value.request, unit({ pending_request_id: created.value.request.id }), new Date(now.getTime() + 47 * 3_600_000));
    expect(before).toBeNull();
    const after = expireStatusRequest(
      created.value.request,
      unit({ pending_request_id: created.value.request.id }),
      new Date(now.getTime() + 48 * 3_600_000 + 1000),
    );
    expect(after?.ok).toBe(true);
    if (after?.ok) {
      expect(after.value.request.estado).toBe("expired");
      expect(after.value.unit.pending_request_id).toBeNull();
    }
  });

  it("el cambio directo del admin cierra la solicitud y un vendedor no puede hacerlo", () => {
    const pending = {
      id: "req",
      estado: "pending",
      requested_by: "laura",
      unit_id: "u1",
    } as StatusChangeRequest;
    const denied = directStatusChange({
      unit: unit({ pending_request_id: "req" }),
      actor: seller(),
      estado: "reservada",
      now,
      pending,
    });
    expect(denied.ok).toBe(false);

    const needs = directStatusChange({
      unit: unit({ pending_request_id: "req" }),
      actor: admin(),
      estado: "vendida",
      now,
      pending,
    });
    expect(needs.ok).toBe(false);
    if (!needs.ok) expect(needs.needsConfirm).toBe(true);

    const done = directStatusChange({
      unit: unit({ pending_request_id: "req", estado: "vendida" }),
      actor: admin(),
      estado: "disponible",
      now,
      pending,
      confirm: true,
    });
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.value.unit.estado).toBe("disponible");
      expect(done.value.unit.pending_request_id).toBeNull();
      expect(done.value.pending?.estado).toBe("resolved_by_direct_change");
    }
  });
});
