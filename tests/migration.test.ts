import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261002120000_init.sql", "utf8");
const forward = readFileSync("supabase/migrations/20261002230000_forward_compat.sql", "utf8");

describe("migración", () => {
  it("garantiza una sola solicitud pendiente por unidad y aísla con RLS", () => {
    expect(sql).toMatch(/status_change_requests_one_pending/);
    expect(sql).toMatch(/where estado = 'pending'/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toContain("public.request_status_change");
    expect(sql).toContain("public.approve_status_request");
    expect(sql).toContain("public.reject_status_request");
    expect(sql).toContain("public.expire_due_requests");
    expect(sql).not.toMatch(/showroom_units[\s\S]{0,500}notas_internas/);
  });

  it("deja lugar para torres, galerías, tours, puntos de interés, idiomas, brokers y cotizaciones", () => {
    for (const table of ["galleries", "tours", "points_of_interest", "translations", "brokers", "broker_projects", "quotations"]) {
      expect(forward).toContain(`create table public.${table}`);
      expect(forward).toContain(`alter table public.${table} enable row level security`);
    }
    expect(forward).toContain("building_id");
    expect(forward).toContain("parent_id");
    expect(forward).toContain("idiomas");
    expect(forward).toContain("coming_soon");
    expect(forward).not.toMatch(/showroom_units[\s\S]{0,800}notas_internas/);
  });
});
