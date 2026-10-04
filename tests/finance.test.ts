import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/demo/seed";
import { showQuote } from "@/lib/domain/finance";
import { computeMetrics } from "@/lib/domain/metrics";
import type { AnalyticsEvent, PaymentPlan } from "@/lib/domain/types";

const plan: PaymentPlan = {
  id: "p",
  price_list_id: "l",
  nombre: "Financiado",
  anticipo_pct: 30,
  anticipo_min: 0,
  cuotas: 36,
  periodicidad: "mensual",
  moneda_cuotas: "ARS",
  refuerzos: [{ pct: 10, meses: [12] }],
  saldo_posesion_pct: 10,
  indice: "CAC",
  indice_leyenda: "La última cuota usa el factor CAC.",
  descuento_pct: 0,
  texto_legal: "Orientativo.",
};

describe("cotizador", () => {
  it("pasa a pesos y ajusta solo la última cuota con CAC", () => {
    const shown = showQuote(100000, plan, 1000, 1.08);
    expect(shown.moneda).toBe("ARS");
    expect(shown.anticipo).toBe(30_000_000);
    expect(shown.saldo).toBe(10_000_000);
    expect(shown.refuerzos[0]?.monto).toBe(10_000_000);
    expect(shown.ultima).toBe(Math.round(shown.cuota * 1.08));
    expect(shown.indice).toContain("CAC");
  });

  it("suma el tiempo en pantalla de cada ficha", () => {
    const events: AnalyticsEvent[] = [
      event("unit_view", "u1", {}),
      event("unit_dwell", "u1", { segundos: 90 }),
      event("unit_dwell", "u1", { segundos: 40 }),
      event("unit_dwell", "u1", { segundos: 99999 }),
    ];
    const metrics = computeMetrics({
      events,
      leads: [],
      units: [{ id: "u1", codigo: "3A" }],
      from: new Date("2026-10-01T00:00:00.000Z"),
      to: new Date("2026-10-03T00:00:00.000Z"),
    });
    expect(metrics.topUnidades[0]?.codigo).toBe("3A");
    expect(metrics.topUnidades[0]?.segundos).toBe(90 + 40 + 30 * 60);
  });

  it("el seed publica planes, obra y la ficha", () => {
    const data = buildSeed(new Date("2026-10-02T15:00:00.000Z"));
    expect(data.construction_updates.length).toBeGreaterThan(0);
    expect(data.custom_sections[0]?.titulo).toBe("El edificio");
    expect(data.projects[0]?.settings.usd_ars).toBe(1450);
    expect(data.projects[0]?.slug).toBe("pol");
    expect(data.projects[0]?.settings.color_acento).toBe("#C4A574");
  });
});

function event(nombre: string, unitId: string, props: Record<string, unknown>): AnalyticsEvent {
  return {
    id: `${nombre}-${unitId}-${JSON.stringify(props)}`,
    project_id: "p",
    visitor_id: "v",
    session_id: "s",
    nombre,
    props,
    unit_id: unitId,
    device: "desktop",
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer_tipo: null,
    fuente: "Directo",
    ts: "2026-10-02T12:00:00.000Z",
  };
}
