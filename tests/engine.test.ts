import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/demo/seed";
import { publicStatus } from "@/lib/domain/requests";
import {
  actorFor,
  approveRequest,
  bulkUnits,
  createRequest,
  directStatus,
  rejectRequest,
  submitLead,
  updateUnit,
} from "@/lib/services/engine";
import { buildShowroom } from "@/lib/services/present";
import { ServiceError } from "@/lib/domain/types";

function db() {
  return structuredClone(buildSeed(new Date("2026-10-02T15:00:00.000Z")));
}

describe("flujo del panel sobre el proyecto demo", () => {
  it("aprueba una reserva: cambia el estado, el lead y el historial, y el showroom lo refleja", () => {
    const data = db();
    const admin = actorFor(data, data.profiles.find((p) => p.email.startsWith("martin"))!.id)!;
    const seller = actorFor(data, data.profiles.find((p) => p.email.startsWith("laura"))!.id)!;
    const unit = data.units.find((u) => u.codigo === "1D")!;
    expect(publicStatus(unit, "available")).toBe("disponible");

    expect(() => directStatus(data, seller, unit.id, "reservada", true, new Date())).toThrow(ServiceError);

    const other = { ...seller, id: "otro-vendedor" };
    expect(() =>
      createRequest(data, other, { unitId: unit.id, tipo: "sell", leadId: data.leads[0].id, now: new Date() }),
    ).toThrow(/pendiente/i);

    approveRequest(data, admin, unit.pending_request_id!, "Seña ok", false, new Date("2026-10-02T16:00:00.000Z"));
    const updated = data.units.find((u) => u.codigo === "1D")!;
    expect(updated.estado).toBe("reservada");
    expect(updated.pending_request_id).toBeNull();
    expect(updated.reserved_by_user_id).toBe(seller.id);
    const lead = data.leads.find((l) => l.id === data.status_change_requests.find((r) => r.unit_id === unit.id)!.lead_id);
    expect(lead?.estado).toBe("reserva");
    const log = data.change_log.find((c) => c.entidad_id === unit.id && c.origen === "request_approved");
    expect(log?.requested_by).toBe(seller.id);
    expect(log?.user_id).toBe(admin.id);

    const showroom = buildShowroom(data, "alba");
    expect(showroom?.units.find((u) => u.codigo === "1D")?.estado).toBe("reservada");
  });

  it("rechazar sin comentario no desbloquea; con comentario sí", () => {
    const data = db();
    const admin = actorFor(data, data.profiles.find((p) => p.email.startsWith("martin"))!.id)!;
    const unit = data.units.find((u) => u.codigo === "2C")!;
    expect(() => rejectRequest(data, admin, unit.pending_request_id!, "  ", new Date())).toThrow(/comentario/i);
    expect(data.units.find((u) => u.codigo === "2C")!.pending_request_id).toBeTruthy();
    rejectRequest(data, admin, unit.pending_request_id!, "La oferta no cierra", new Date());
    expect(data.units.find((u) => u.codigo === "2C")!.pending_request_id).toBeNull();
    expect(data.units.find((u) => u.codigo === "2C")!.estado).toBe("disponible");
  });

  it("el admin de otra organización no lee ni escribe", () => {
    const data = db();
    const stranger = actorFor(data, data.profiles[0].id)!;
    stranger.organization_id = "otra-org";
    stranger.role = "org_admin";
    const unit = data.units[0];
    expect(() => updateUnit(data, stranger, unit.id, { orientacion: "Sur" }, new Date())).toThrow(/acceso/i);
  });

  it("la edición masiva de precio deja un único change set", () => {
    const data = db();
    const admin = actorFor(data, data.profiles.find((p) => p.email.startsWith("martin"))!.id)!;
    const ids = data.units.filter((u) => u.estado === "disponible").map((u) => u.id);
    const result = bulkUnits(data, admin, ids, { price: { mode: "percent", value: 5, roundTo: 500 } }, new Date());
    expect(result.extra?.cantidad).toBe(ids.length);
    expect(data.change_sets.filter((s) => s.tipo === "bulk")).toHaveLength(1);
  });

  it("un lead del showroom deduplica por email y clasifica la fuente", () => {
    const data = db();
    const projectId = data.projects[0].id;
    const first = submitLead(data, {
      projectId,
      nombre: "Nueva Persona",
      email: "nueva@example.com",
      telefono: "+54 9 341 555-9999",
      mensaje: "Vi la 4A",
      canal: "form",
      utm: { utm_source: "meta", utm_medium: "paid", utm_campaign: "preventa_oct" },
      now: new Date(),
    });
    expect(first.created).toBe(true);
    expect(first.lead.fuente).toBe("Meta Ads");
    const again = submitLead(data, {
      projectId,
      nombre: "Nueva Persona",
      email: "nueva@example.com",
      mensaje: "Sigo mirando",
      canal: "form",
      utm: {},
      now: new Date(),
    });
    expect(again.created).toBe(false);
    expect(again.lead.id).toBe(first.lead.id);
  });
});
