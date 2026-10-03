import type { PaymentPlan } from "@/lib/domain/types";
import { quoteUnit, type Quote } from "@/lib/domain/pricing";

export interface ShownQuote {
  moneda: "USD" | "ARS";
  precioUsd: number;
  anticipo: number;
  cuota: number;
  ultima: number;
  saldo: number;
  refuerzos: { pct: number; monto: number; meses: number[] }[];
  cierra: boolean;
  legal: string;
  indice: string | null;
}

/** Pasa la cotización a la moneda de las cuotas y aplica el factor CAC a la última. */
export function showQuote(
  precioUsd: number,
  plan: PaymentPlan,
  usdArs: number,
  cacFactor: number,
): ShownQuote {
  const quote: Quote = quoteUnit(precioUsd, plan);
  const toArs = plan.moneda_cuotas === "ARS";
  const rate = toArs ? Math.max(usdArs, 0) : 1;
  const money = (value: number) => Math.round(value * rate);
  const factor = plan.indice === "CAC" ? Math.max(cacFactor, 0) || 1 : 1;
  const cuota = money(quote.cuota);
  return {
    moneda: plan.moneda_cuotas,
    precioUsd: quote.precio,
    anticipo: money(quote.anticipo),
    cuota,
    ultima: Math.round(cuota * factor),
    saldo: money(quote.saldo),
    refuerzos: quote.refuerzos.map((item) => ({ ...item, monto: money(item.monto) })),
    cierra: quote.cierra,
    legal: plan.texto_legal,
    indice: plan.indice === "CAC" ? plan.indice_leyenda : null,
  };
}
