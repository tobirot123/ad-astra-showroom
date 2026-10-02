import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/domain/metrics";
import { classifySource } from "@/lib/domain/source";
import { buildWebcontactBody, nextRetryAt, postWebcontact, shouldAlertAdmin, tokkoUrl } from "@/lib/domain/tokko";
import { quoteUnit } from "@/lib/domain/pricing";
import type { AnalyticsEvent, Lead, PaymentPlan } from "@/lib/domain/types";

describe("métricas", () => {
  it("atribuye las visitas a la fuente y la campaña de la sesión", () => {
    const events: AnalyticsEvent[] = [];
    const leads: Lead[] = [];
    const plan = [
      { n: 62, fuente: "Meta Ads", utm_source: "meta", utm_medium: "paid", utm_campaign: "preventa_oct" },
      { n: 14, fuente: "Google Ads", utm_source: "google", utm_medium: "cpc", utm_campaign: "search_marca" },
      { n: 11, fuente: "Directo", utm_source: null, utm_medium: null, utm_campaign: null },
      { n: 8, fuente: "Orgánico", utm_source: "google", utm_medium: "organic", utm_campaign: null },
      { n: 5, fuente: "WhatsApp", utm_source: "whatsapp", utm_medium: "referral", utm_campaign: null },
    ];
    let i = 0;
    for (const bucket of plan) {
      for (let k = 0; k < bucket.n; k++) {
        const fuente = classifySource(
          {
            utm_source: bucket.utm_source ?? undefined,
            utm_medium: bucket.utm_medium ?? undefined,
            utm_campaign: bucket.utm_campaign ?? undefined,
          },
          bucket.fuente === "Directo" ? "" : undefined,
        );
        expect(fuente).toBe(bucket.fuente);
        events.push({
          id: `e-${i}`,
          project_id: "p",
          visitor_id: `v-${i}`,
          session_id: `s-${i}`,
          nombre: "session_start",
          props: {},
          unit_id: null,
          device: "mobile",
          utm_source: bucket.utm_source,
          utm_medium: bucket.utm_medium,
          utm_campaign: bucket.utm_campaign,
          referrer_tipo: null,
          fuente,
          ts: "2026-10-01T12:00:00.000Z",
        });
        if (k === 0 && bucket.utm_campaign) {
          leads.push({
            id: `l-${i}`,
            project_id: "p",
            unit_id: "u-4a",
            nombre: "Ana",
            email: `a${i}@example.com`,
            telefono: null,
            mensaje: null,
            canal: "form",
            estado: "nuevo",
            assigned_to: null,
            utm: { utm_campaign: bucket.utm_campaign },
            fuente,
            session_id: `s-${i}`,
            visitor_id: `v-${i}`,
            created_at: "2026-10-01T12:05:00.000Z",
            updated_at: "2026-10-01T12:05:00.000Z",
          });
        }
        i += 1;
      }
    }
    const metrics = computeMetrics({
      events,
      leads,
      units: [{ id: "u-4a", codigo: "4A" }],
      from: new Date("2026-10-01T00:00:00.000Z"),
      to: new Date("2026-10-02T00:00:00.000Z"),
    });
    expect(metrics.visitas).toBe(100);
    expect(metrics.unicos).toBe(100);
    const meta = metrics.porFuente.find((f) => f.fuente === "Meta Ads");
    const google = metrics.porCampana.find((c) => c.campana === "search_marca");
    expect(meta?.visitas).toBe(62);
    expect(google?.visitas).toBe(14);
    const attributed = metrics.porFuente.reduce((s, f) => s + f.visitas, 0);
    expect(attributed / metrics.visitas).toBeGreaterThanOrEqual(0.98);
  });
});

describe("Tokko y cotizador", () => {
  it("arma el webcontact con el emprendimiento, la unidad y la campaña", async () => {
    const body = buildWebcontactBody({
      lead: {
        nombre: "Ana López",
        email: "ana@example.com",
        telefono: "341555",
        mensaje: "Quiero la 4A",
        fuente: "Meta Ads",
        canal: "form",
        utm: { utm_campaign: "preventa_oct" },
      },
      unit: { codigo: "4A" },
      projectName: "ALBA",
      developmentId: "39254",
    });
    expect(body.developments).toEqual(["39254"]);
    expect(body.tags).toContain("showroom");
    expect(body.text).toMatch(/4A/);
    expect(body.text).toMatch(/preventa_oct/);
    expect(tokkoUrl("abc")).toBe("https://www.tokkobroker.com/api/v1/webcontact/?key=abc");

    const posted = await postWebcontact({
      apiKey: "abc",
      body,
      fetchImpl: async (url, init) => {
        expect(String(url)).toContain("/api/v1/webcontact/?key=abc");
        expect(init?.method).toBe("POST");
        return new Response("ok", { status: 201 });
      },
    });
    expect(posted.ok).toBe(true);
    expect(shouldAlertAdmin(5)).toBe(true);
    expect(shouldAlertAdmin(4)).toBe(false);
    const retry = nextRetryAt(3, new Date("2026-10-02T00:00:00.000Z"));
    expect(retry.toISOString()).toBe("2026-10-02T00:08:00.000Z");
  });

  it("el plan financiado cierra en 100 %", () => {
    const plan: PaymentPlan = {
      id: "plan",
      price_list_id: "fin",
      nombre: "Financiado 36",
      anticipo_pct: 30,
      anticipo_min: 20_000,
      cuotas: 36,
      periodicidad: "mensual",
      moneda_cuotas: "USD",
      refuerzos: [
        { pct: 10, meses: [12] },
        { pct: 10, meses: [24] },
      ],
      saldo_posesion_pct: 10,
      indice: "CAC",
      indice_leyenda: null,
      descuento_pct: 0,
      texto_legal: "",
    };
    const quote = quoteUnit(163_400, plan);
    expect(quote.cierra).toBe(true);
    expect(quote.anticipo).toBe(49020);
    expect(quote.cuota).toBeGreaterThan(0);
  });
});
