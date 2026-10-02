import type { PaymentPlan, PriceList, UnitPrice } from "@/lib/domain/types";

export function adjustPrice(
  price: number,
  mode: "percent" | "amount",
  value: number,
  roundTo?: number | null,
): number {
  let next = mode === "percent" ? price * (1 + value / 100) : price + value;
  if (roundTo && roundTo > 0) next = Math.round(next / roundTo) * roundTo;
  if (next < 0) next = 0;
  return next;
}

export function resolveUnitPrice(
  unitId: string,
  list: PriceList,
  lists: PriceList[],
  prices: UnitPrice[],
  seen: Set<string> = new Set(),
): number | null {
  if (seen.has(list.id)) return null;
  seen.add(list.id);
  if (list.regla?.base_list_id) {
    const base = lists.find((l) => l.id === list.regla!.base_list_id);
    if (!base) return null;
    const basePrice = resolveUnitPrice(unitId, base, lists, prices, seen);
    if (basePrice == null) return null;
    return Math.round(basePrice * (1 + list.regla.percent / 100));
  }
  const row = prices.find((p) => p.unit_id === unitId && p.price_list_id === list.id);
  return row ? row.precio : null;
}

export interface Quote {
  precio: number;
  anticipo: number;
  cuota: number;
  saldo: number;
  refuerzos: { pct: number; monto: number; meses: number[] }[];
  porcentajes: number;
  cierra: boolean;
}

/** Anticipo + refuerzos + saldo + resto en cuotas. Los porcentajes tienen que cerrar en 100. */
export function quoteUnit(precioLista: number, plan: PaymentPlan): Quote {
  const precio = Math.round(precioLista * (1 - (plan.descuento_pct || 0) / 100));
  const anticipoPct = plan.anticipo_pct;
  const refuerzoPct = plan.refuerzos.reduce((s, r) => s + r.pct, 0);
  const saldoPct = plan.saldo_posesion_pct;
  const cuotasPct = 100 - anticipoPct - refuerzoPct - saldoPct;
  const anticipo = Math.max(Math.round((precio * anticipoPct) / 100), plan.anticipo_min || 0);
  const refuerzos = plan.refuerzos.map((r) => ({
    pct: r.pct,
    monto: Math.round((precio * r.pct) / 100),
    meses: r.meses,
  }));
  const saldo = Math.round((precio * saldoPct) / 100);
  const resto = Math.max(0, precio - anticipo - saldo - refuerzos.reduce((s, r) => s + r.monto, 0));
  const cuota = plan.cuotas > 0 ? Math.round(resto / plan.cuotas) : 0;
  const porcentajes = Math.round((anticipoPct + refuerzoPct + saldoPct + cuotasPct) * 100) / 100;
  return {
    precio,
    anticipo,
    cuota,
    saldo,
    refuerzos,
    porcentajes,
    cierra: Math.abs(porcentajes - 100) < 0.01 && cuotasPct >= 0,
  };
}

export function planIsValid(plan: Pick<PaymentPlan, "anticipo_pct" | "refuerzos" | "saldo_posesion_pct" | "cuotas">): boolean {
  const refuerzoPct = plan.refuerzos.reduce((s, r) => s + r.pct, 0);
  const explicito = plan.anticipo_pct + refuerzoPct + plan.saldo_posesion_pct;
  return explicito <= 100.001 && explicito >= 0 && plan.cuotas >= 0;
}
