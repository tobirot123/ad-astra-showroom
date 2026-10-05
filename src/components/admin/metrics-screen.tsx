"use client";

import { useMemo, useState } from "react";
import { formatNumber } from "@/lib/domain/format";
import { computeMetrics } from "@/lib/domain/metrics";
import { useAdmin } from "@/components/admin/provider";

const RANGES = [
  { id: 7, label: "7 días" },
  { id: 30, label: "30 días" },
  { id: 90, label: "90 días" },
];

export function MetricsScreen() {
  const { data } = useAdmin();
  const [days, setDays] = useState(30);
  const metrics = useMemo(() => {
    if (!data?.project) return null;
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
    return computeMetrics({
      events: data.events,
      leads: data.leads,
      units: data.units,
      from,
      to,
    });
  }, [data, days]);
  if (!data?.project || !metrics) return null;
  const maxFuente = Math.max(1, ...metrics.porFuente.map((f) => f.visitas));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Métricas</h1>
          <p className="text-sm text-[#6b6258]">Visitas, leads y tiempo que cada unidad estuvo abierta en pantalla.</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((range) => (
            <button key={range.id} onClick={() => setDays(range.id)} className={`rounded-full px-3 py-1 text-sm ${days === range.id ? "bg-[#1c1915] text-white" : "bg-white"}`}>
              {range.label}
            </button>
          ))}
          <a className="rounded-full bg-white px-3 py-1 text-sm" href={`/api/admin/export?projectId=${data.project.id}`}>
            CSV unidades
          </a>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Visitas" value={String(metrics.visitas)} hint="Sesiones" />
        <Card label="Usuarios únicos" value={String(metrics.unicos)} hint="Un id por navegador" />
        <Card label="Fichas" value={String(metrics.fichas)} hint="Sesiones que abrieron una unidad" />
        <Card label="Leads" value={String(metrics.leads)} hint={metrics.visitas ? `${formatPct(metrics.conversion)} de las visitas` : "Sin visitas"} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5">
          <h2 className="font-serif text-2xl">Embudo</h2>
          <ul className="mt-4 space-y-3">
            {metrics.embudo.map((step) => (
              <li key={step.paso}>
                <div className="flex justify-between text-sm"><span>{step.paso}</span><span>{step.valor}</span></div>
                <div className="mt-1 h-2 rounded-full bg-[#f4efe6]">
                  <div className="h-2 rounded-full bg-[#9a6240]" style={{ width: `${metrics.visitas ? (step.valor / metrics.visitas) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl bg-white p-5">
          <h2 className="font-serif text-2xl">Origen</h2>
          <ul className="mt-4 space-y-3">
            {metrics.porFuente.map((row) => (
              <li key={row.fuente}>
                <div className="flex justify-between text-sm"><span>{row.fuente}</span><span>{row.visitas} visitas · {row.leads} leads</span></div>
                <div className="mt-1 h-2 rounded-full bg-[#f4efe6]">
                  <div className="h-2 rounded-full bg-[#1c1915]" style={{ width: `${(row.visitas / maxFuente) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl bg-white p-5">
          <h2 className="font-serif text-2xl">Unidades más vistas</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {metrics.topUnidades.map((unit, index) => (
              <li key={unit.unitId} className="flex justify-between border-b border-[#f4efe6] py-2">
                <span>{index + 1}. {unit.codigo}</span>
                <span>{unit.unicos} personas · {unit.segundos ? `${Math.round(unit.segundos / 60)} min` : "sin tiempo"} · {unit.leads} leads</span>
              </li>
            ))}
            {!metrics.topUnidades.length && <li className="text-[#6b6258]">Todavía no hay fichas abiertas en este período.</li>}
          </ol>
        </section>
        <section className="rounded-3xl bg-white p-5">
          <h2 className="font-serif text-2xl">Campañas</h2>
          <table className="mt-3 w-full text-sm">
            <thead><tr className="text-left text-[#6b6258]"><th>UTM</th><th>Visitas</th><th>Leads</th></tr></thead>
            <tbody>
              {metrics.porCampana.map((row) => (
                <tr key={row.campana} className="border-t border-[#f4efe6]"><td className="py-2">{row.campana}</td><td>{row.visitas}</td><td>{row.leads}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-[#6b6258]">Dispositivo: {metrics.porDispositivo.map((d) => `${labelDevice(d.device)} ${d.visitas}`).join(" · ") || "sin datos"}</p>
        </section>
      </div>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-3xl bg-white p-4">
      <p className="text-sm text-[#6b6258]">{label}</p>
      <p className="mt-1 font-serif text-4xl">{value}</p>
      <p className="text-xs text-[#6b6258]">{hint}</p>
    </article>
  );
}

function formatPct(value: number) {
  return `${formatNumber(value * 100)} %`;
}

function labelDevice(device: string) {
  if (device === "mobile") return "Celular";
  if (device === "tablet") return "Tablet";
  return "Computadora";
}
