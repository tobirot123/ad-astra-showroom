"use client";

import { useMemo, useState } from "react";
import { LEAD_STATE_LABEL, formatDateTime } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import type { LeadEstado } from "@/lib/domain/types";
import { useAdmin } from "@/components/admin/provider";

const STATES = Object.keys(LEAD_STATE_LABEL) as LeadEstado[];

export function LeadsScreen() {
  const { data, mutate } = useAdmin();
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState("todos");
  const [open, setOpen] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const rows = useMemo(() => {
    if (!data?.project) return [];
    return data.leads.filter((lead) => {
      if (estado !== "todos" && lead.estado !== estado) return false;
      const blob = `${lead.nombre} ${lead.email ?? ""} ${lead.telefono ?? ""} ${lead.fuente}`.toLowerCase();
      return !query || blob.includes(query.toLowerCase());
    });
  }, [data, estado, query]);
  if (!data?.project) return null;
  const editable = can(data.actor, "edit_leads");
  const names = new Map(data.team.map((person) => [person.id, person.nombre]));
  const units = new Map(data.units.map((unit) => [unit.id, unit.codigo]));
  const current = data.leads.find((lead) => lead.id === open);

  return (
    <div>
      <h1 className="font-serif text-4xl">Leads</h1>
      <p className="mt-1 text-sm text-[#6b6258]">CRM liviano: estado, vendedor y notas. Tokko y el webhook salen desde Integraciones.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nombre, mail o teléfono" className="rounded-full border border-[#e4d9c8] bg-white px-4 py-2 text-sm" />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-full border border-[#e4d9c8] bg-white px-3 py-2 text-sm">
          <option value="todos">Todos</option>
          {STATES.map((key) => <option key={key} value={key}>{LEAD_STATE_LABEL[key]}</option>)}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-[#e4d9c8] bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[#6b6258]">
            <tr>
              <th className="px-3 py-3">Cliente</th>
              <th>Unidad</th>
              <th>Fuente</th>
              <th>Campaña</th>
              <th>Estado</th>
              <th>Asignado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} className="cursor-pointer border-t border-[#f0e7da] hover:bg-[#fbf7f1]" onClick={() => setOpen(lead.id)}>
                <td className="px-3 py-3">
                  <p className="font-medium">{lead.nombre}</p>
                  <p className="text-xs text-[#6b6258]">{lead.email || lead.telefono || "Sin contacto"}</p>
                </td>
                <td>{lead.unit_id ? units.get(lead.unit_id) ?? "—" : "—"}</td>
                <td>{lead.fuente}</td>
                <td>{lead.utm.utm_campaign || "—"}</td>
                <td>{LEAD_STATE_LABEL[lead.estado]}</td>
                <td>{lead.assigned_to ? names.get(lead.assigned_to) ?? "—" : "Sin asignar"}</td>
                <td>{formatDateTime(lead.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {current && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-[#f6f1e8] p-5" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-serif text-3xl">{current.nombre}</h2>
            <p className="text-sm text-[#6b6258]">{current.email} · {current.telefono} · {current.fuente}</p>
            {current.mensaje && <p className="mt-3 text-sm">“{current.mensaje}”</p>}
            <p className="mt-2 text-xs text-[#6b6258]">
              {current.utm.utm_source || "sin utm"} / {current.utm.utm_medium || "—"} / {current.utm.utm_campaign || "—"}
            </p>
            {editable && (
              <div className="mt-4 space-y-2">
                <select
                  value={current.estado}
                  className="w-full rounded-xl bg-white px-3 py-2"
                  onChange={(e) => void mutate({ op: "update_lead", leadId: current.id, patch: { estado: e.target.value } })}
                >
                  {STATES.map((key) => <option key={key} value={key}>{LEAD_STATE_LABEL[key]}</option>)}
                </select>
                {data.actor.role !== "seller" && (
                  <select
                    value={current.assigned_to ?? ""}
                    className="w-full rounded-xl bg-white px-3 py-2"
                    onChange={(e) => void mutate({ op: "update_lead", leadId: current.id, patch: { assigned_to: e.target.value || null } })}
                  >
                    <option value="">Sin asignar</option>
                    {data.team.map((person) => <option key={person.id} value={person.id}>{person.nombre}</option>)}
                  </select>
                )}
                <form
                  className="flex gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const result = await mutate({ op: "update_lead", leadId: current.id, patch: { nota } });
                    if (result) setNota("");
                  }}
                >
                  <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota interna" className="flex-1 rounded-xl bg-white px-3 py-2" />
                  <button className="rounded-full bg-[#1c1915] px-3 py-2 text-sm text-white">Anotar</button>
                </form>
              </div>
            )}
            <ul className="mt-4 space-y-2 text-sm">
              {data.lead_activities.filter((item) => item.lead_id === current.id).map((item) => (
                <li key={item.id} className="rounded-2xl bg-white px-3 py-2">
                  <p>{item.detalle}</p>
                  <p className="text-xs text-[#6b6258]">{item.tipo} · {formatDateTime(item.created_at)}</p>
                </li>
              ))}
            </ul>
            <button className="mt-4 text-sm" onClick={() => setOpen(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
