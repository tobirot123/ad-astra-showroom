"use client";

import { useState } from "react";
import { formatUsd } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

export function ComercialScreen() {
  const { data, mutate } = useAdmin();
  const [planId, setPlanId] = useState("");
  if (!data?.project) return null;
  const project = data.project;
  const plans = data.payment_plans;
  const plan = plans.find((item) => item.id === (planId || plans[0]?.id)) ?? plans[0];
  const prices = can(data.actor, "edit_prices");
  const projectEdit = can(data.actor, "edit_project");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
        <h1 className="font-serif text-4xl">Listas de precios</h1>
        <p className="mt-1 text-sm text-[#6b6258]">Cada lista puede tener su plan de pago. El showroom solo publica las listas marcadas como públicas.</p>
        <ul className="mt-4 space-y-3">
          {data.price_lists.map((list) => {
            const count = data.unit_prices.filter((row) => row.price_list_id === list.id).length;
            const sample = data.unit_prices.find((row) => row.price_list_id === list.id);
            return (
              <li key={list.id} className="rounded-2xl border border-[#e4d9c8] px-4 py-3 text-sm">
                <p className="font-medium">{list.nombre}</p>
                <p className="text-[#6b6258]">
                  {list.moneda} · {list.visibilidad === "public" ? "pública" : list.visibilidad === "sellers" ? "vendedores" : "interna"}
                  {list.regla ? ` · ${list.regla.percent > 0 ? "+" : ""}${list.regla.percent}% sobre otra lista` : ""}
                  {count ? ` · ${count} precios` : ""}
                  {sample ? ` · ej. ${formatUsd(sample.precio)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
        {projectEdit && (
          <form
            className="mt-5 space-y-2 text-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void mutate({
                op: "update_project",
                projectId: project.id,
                patch: {
                  settings: {
                    usd_ars: Number(form.get("usd_ars")),
                    cac_factor: Number(form.get("cac_factor")),
                  },
                },
              });
            }}
          >
            <h2 className="font-serif text-2xl">Cambio y CAC</h2>
            <label className="block">Dólar (ARS por USD)
              <input name="usd_ars" defaultValue={project.settings.usd_ars ?? 1450} inputMode="decimal" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </label>
            <label className="block">Factor CAC sobre la última cuota
              <input name="cac_factor" defaultValue={project.settings.cac_factor ?? 1} inputMode="decimal" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </label>
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-white">Guardar índices</button>
          </form>
        )}
      </section>
      {plan && (
        <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
          <h2 className="font-serif text-3xl">Plan de pago</h2>
          <label className="mt-3 block text-sm">Esquema
            <select value={plan.id} onChange={(event) => setPlanId(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              {plans.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>
          {prices && (
            <form
              key={plan.id}
              className="mt-4 grid gap-2 text-sm"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const meses = String(form.get("meses") ?? "")
                  .split(",")
                  .map((part) => Number(part.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0);
                const pct = Number(form.get("refuerzo_pct") || 0);
                void mutate({
                  op: "save_plan",
                  projectId: project.id,
                  plan: {
                    id: plan.id,
                    nombre: String(form.get("nombre") ?? plan.nombre),
                    anticipo_pct: Number(form.get("anticipo_pct")),
                    cuotas: Number(form.get("cuotas")),
                    saldo_posesion_pct: Number(form.get("saldo")),
                    descuento_pct: Number(form.get("descuento") || 0),
                    moneda_cuotas: String(form.get("moneda")),
                    indice: String(form.get("indice")),
                    indice_leyenda: String(form.get("leyenda") ?? ""),
                    texto_legal: String(form.get("legal") ?? ""),
                    refuerzos: pct > 0 ? [{ pct, meses }] : [],
                  },
                });
              }}
            >
              <input name="nombre" defaultValue={plan.nombre} className="rounded-xl border border-[#e4d9c8] px-3 py-2" />
              <div className="grid grid-cols-2 gap-2">
                <label>Anticipo %<input name="anticipo_pct" defaultValue={plan.anticipo_pct} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
                <label>Cuotas<input name="cuotas" defaultValue={plan.cuotas} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
                <label>Saldo a posesión %<input name="saldo" defaultValue={plan.saldo_posesion_pct} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
                <label>Descuento %<input name="descuento" defaultValue={plan.descuento_pct} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
              </div>
              <label>Refuerzo % (0 para ninguno)
                <input name="refuerzo_pct" defaultValue={plan.refuerzos[0]?.pct ?? 0} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
              </label>
              <label>Meses del refuerzo, separados por coma
                <input name="meses" defaultValue={plan.refuerzos[0]?.meses.join(", ") ?? ""} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
              </label>
              <label>Moneda de las cuotas
                <select name="moneda" defaultValue={plan.moneda_cuotas} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </label>
              <label>Índice
                <select name="indice" defaultValue={plan.indice} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
                  <option value="ninguno">Sin índice</option>
                  <option value="CAC">CAC</option>
                </select>
              </label>
              <input name="leyenda" defaultValue={plan.indice_leyenda ?? ""} placeholder="Leyenda del índice" className="rounded-xl border border-[#e4d9c8] px-3 py-2" />
              <textarea name="legal" defaultValue={plan.texto_legal} rows={3} className="rounded-xl border border-[#e4d9c8] px-3 py-2" />
              <button className="rounded-full bg-[#1c1915] px-4 py-2 text-white">Guardar plan</button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
