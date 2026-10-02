import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20261002120000_init.sql", "utf8");

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
});
