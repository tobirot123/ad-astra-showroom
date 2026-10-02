"use client";

import { useState } from "react";
import { REQUEST_LABEL, REQUEST_STATE_LABEL, STATUS_LABEL, formatDateTime, formatUsd } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import { hoursLeftLabel } from "@/lib/domain/requests";
import { useAdmin } from "@/components/admin/provider";

export function RequestsScreen() {
  const { data, mutate } = useAdmin();
  const [comment, setComment] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("pending");
  if (!data?.project) return null;
  const approve = can(data.actor, "approve_request");
  const names = new Map(data.team.map((person) => [person.id, person.nombre]));
  const units = new Map(data.units.map((unit) => [unit.id, unit.codigo]));
  const rows = data.requests
    .filter((request) => filter === "todas" || request.estado === filter)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <h1 className="font-serif text-4xl">Solicitudes</h1>
      <p className="mt-1 max-w-2xl text-sm text-[#6b6258]">
        Reservar, vender o liberar pasa por el admin. Mientras tanto la unidad queda tomada para otros vendedores y el showroom sigue con el estado oficial.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {["pending", "approved", "rejected", "expired", "todas"].map((key) => (
          <button key={key} onClick={() => setFilter(key)} className={`rounded-full px-3 py-1 ${filter === key ? "bg-[#1c1915] text-white" : "bg-white"}`}>
            {key === "todas" ? "Todas" : REQUEST_STATE_LABEL[key]}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((request) => {
          const lead = data.leads.find((item) => item.id === request.lead_id);
          const own = request.requested_by === data.actor.id;
          return (
            <li key={request.id} className="rounded-3xl border border-[#e4d9c8] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{REQUEST_LABEL[request.tipo]} {units.get(request.unit_id) ?? "unidad"}</p>
                  <p className="text-sm text-[#6b6258]">
                    {STATUS_LABEL[request.estado_desde]} → {STATUS_LABEL[request.estado_hacia]} · {REQUEST_STATE_LABEL[request.estado]}
                    {request.estado === "pending" ? ` · vence en ${hoursLeftLabel(request.expires_at, new Date())}` : ""}
                  </p>
                  <p className="text-sm">{names.get(request.requested_by) ?? "Vendedor"}{lead ? ` · ${lead.nombre}` : ""}{request.monto_sena ? ` · seña ${formatUsd(request.monto_sena)}` : ""}</p>
                  {request.comentario_vendedor && <p className="mt-1 text-sm">“{request.comentario_vendedor}”</p>}
                  {request.comentario_admin && <p className="mt-1 text-sm text-[#6b6258]">Admin: {request.comentario_admin}</p>}
                  <p className="mt-1 text-xs text-[#6b6258]">{formatDateTime(request.created_at)}</p>
                </div>
              </div>
              {request.estado === "pending" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={comment[request.id] ?? ""}
                    onChange={(e) => setComment({ ...comment, [request.id]: e.target.value })}
                    placeholder={approve ? "Comentario (obligatorio para rechazar)" : "Comentario"}
                    className="min-w-56 flex-1 rounded-xl border border-[#e4d9c8] px-3 py-2 text-sm"
                  />
                  {approve && (
                    <>
                      <button className="rounded-full bg-[#1f6b4a] px-3 py-1 text-sm text-white" onClick={() => void mutate({ op: "approve_request", requestId: request.id, comentario: comment[request.id] })}>Aprobar</button>
                      <button className="rounded-full bg-[#b42318] px-3 py-1 text-sm text-white" onClick={() => void mutate({ op: "reject_request", requestId: request.id, comentario: comment[request.id] ?? "" })}>Rechazar</button>
                      <button className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" onClick={() => void mutate({ op: "extend_request", requestId: request.id, hours: 24 })}>+24 h</button>
                    </>
                  )}
                  {(own || approve) && (
                    <button className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" onClick={() => void mutate({ op: "cancel_request", requestId: request.id, comentario: comment[request.id] })}>Cancelar</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {!rows.length && <li className="text-sm text-[#6b6258]">No hay solicitudes en este filtro.</li>}
      </ul>
    </div>
  );
}
