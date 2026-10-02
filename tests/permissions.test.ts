import { describe, expect, it } from "vitest";
import { can, canAccessProject, canSeeLead } from "@/lib/domain/permissions";
import type { Actor, Permisos } from "@/lib/domain/types";

const basePerm: Permisos = { can_edit_prices: false, sees_all_leads: false, sees_metrics: false };

function actor(role: Actor["role"], permisos: Partial<Permisos> = {}, organization_id = "org-a"): Actor {
  return {
    id: "user",
    nombre: "Test",
    email: "test@example.com",
    role,
    organization_id,
    project_ids: null,
    permisos: { ...basePerm, ...permisos },
  };
}

describe("permisos", () => {
  it("el vendedor no cambia el estado ni edita precios, salvo el permiso fino", () => {
    const seller = actor("seller");
    expect(can(seller, "change_status_direct")).toBe(false);
    expect(can(seller, "edit_prices")).toBe(false);
    expect(can(seller, "edit_units")).toBe(false);
    expect(can(seller, "approve_request")).toBe(false);
    expect(can(seller, "request_status")).toBe(true);
    expect(can(seller, "edit_leads")).toBe(true);
    expect(can(actor("seller", { can_edit_prices: true }), "edit_prices")).toBe(true);
    expect(can(actor("seller", { can_edit_prices: true }), "change_status_direct")).toBe(false);
  });

  it("el admin de la desarrolladora edita y aprueba, pero no crea organizaciones", () => {
    const admin = actor("org_admin");
    expect(can(admin, "edit_units")).toBe(true);
    expect(can(admin, "change_status_direct")).toBe(true);
    expect(can(admin, "approve_request")).toBe(true);
    expect(can(admin, "edit_custom_fields")).toBe(true);
    expect(can(admin, "edit_overlays")).toBe(true);
    expect(can(admin, "manage_integrations")).toBe(true);
    expect(can(admin, "create_project")).toBe(false);
    expect(can(admin, "request_status")).toBe(false);
  });

  it("solo lectura no edita y ve métricas", () => {
    const viewer = actor("viewer");
    expect(can(viewer, "edit_units")).toBe(false);
    expect(can(viewer, "view_metrics")).toBe(true);
    expect(can(viewer, "view_leads")).toBe(false);
    expect(can(viewer, "export_units")).toBe(true);
    expect(can(actor("viewer", { sees_all_leads: true }), "view_leads")).toBe(true);
  });

  it("un usuario de la organización A no entra a un proyecto de la B", () => {
    const admin = actor("org_admin", {}, "org-a");
    expect(canAccessProject(admin, { id: "p1", organization_id: "org-a" })).toBe(true);
    expect(canAccessProject(admin, { id: "p2", organization_id: "org-b" })).toBe(false);
    expect(canAccessProject(actor("superadmin", {}, "org-a"), { id: "p2", organization_id: "org-b" })).toBe(true);
  });

  it("limita al vendedor a los proyectos asignados y a sus leads", () => {
    const seller = actor("seller");
    seller.project_ids = ["p1"];
    expect(canAccessProject(seller, { id: "p1", organization_id: "org-a" })).toBe(true);
    expect(canAccessProject(seller, { id: "p9", organization_id: "org-a" })).toBe(false);
    expect(canSeeLead(seller, { assigned_to: "user" })).toBe(true);
    expect(canSeeLead(seller, { assigned_to: "otro" })).toBe(false);
    expect(canSeeLead(actor("seller", { sees_all_leads: true }), { assigned_to: "otro" })).toBe(true);
  });
});
