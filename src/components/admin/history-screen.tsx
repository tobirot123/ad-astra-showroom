"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

function preview(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  const text = JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function HistoryScreen() {
  const { data, mutate } = useAdmin();
  const [query, setQuery] = useState("");
  if (!data?.project) return null;
  const undo = can(data.actor, "undo");
  const names = new Map(data.team.map((person) => [person.id, person.nombre]));
  const codes = new Map(data.units.map((unit) => [unit.id, unit.codigo]));
  const needle = query.trim().toLowerCase();
  const rows = data.change_log.filter((entry) => {
    if (!needle) return true;
    const code = entry.entidad === "unit" ? codes.get(entry.entidad_id) ?? "" : "";
    return `${code} ${entry.entidad} ${entry.campo}`.toLowerCase().includes(needle);
  });

  return (
    <div>
      <h1 className="font-serif text-4xl">Historial</h1>
      <p className="mt-1 text-sm text-[#6b6258]">Cada cambio de unidad, precio, zona o estado queda acá. Filtrá por código para ver una sola unidad.</p>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, por ejemplo 3A" className="mt-4 w-full max-w-xs rounded-xl border border-[#e4d9c8] bg-white px-3 py-2 text-sm" />
      <ul className="mt-4 space-y-2">
        {rows.map((entry) => (
          <li key={entry.id} className="grid gap-2 rounded-2xl border border-[#e4d9c8] bg-white px-4 py-3 text-sm md:grid-cols-[160px_1fr_auto]">
            <div>
              <p>{formatDateTime(entry.created_at)}</p>
              <p className="text-xs text-[#6b6258]">{names.get(entry.user_id) ?? "Sistema"} · {entry.origen}</p>
            </div>
            <div>
              <p className="font-medium">{entry.entidad === "unit" ? codes.get(entry.entidad_id) ?? entry.entidad : entry.entidad} · {entry.campo}</p>
              <p className="text-[#6b6258]">{preview(entry.valor_anterior)} → {preview(entry.valor_nuevo)}</p>
            </div>
            {undo && entry.origen !== "undo" && (
              <button className="self-center rounded-full border border-[#e4d9c8] px-3 py-1 text-xs" onClick={() => void mutate({ op: "undo", changeLogId: entry.id })}>
                Deshacer
              </button>
            )}
          </li>
        ))}
        {!rows.length && <li className="text-sm text-[#6b6258]">Todavía no hay cambios para ese filtro.</li>}
      </ul>
    </div>
  );
}
