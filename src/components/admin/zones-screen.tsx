"use client";

import { useMemo, useRef, useState } from "react";
import { STATUS_COLOR } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import type { Overlay } from "@/lib/domain/types";
import { useAdmin } from "@/components/admin/provider";

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function ZonesScreen() {
  const { data, mutate } = useAdmin();
  const frame = useRef<HTMLDivElement>(null);
  const [edits, setEdits] = useState<Overlay[] | null>(null);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [unitId, setUnitId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const facade = useMemo(() => {
    if (!data?.project) return "/demo/fachada.svg";
    const link = data.media_links.find((item) => item.entidad === "project" && item.rol === "fachada");
    return data.media.find((item) => item.id === link?.media_id)?.url ?? "/demo/fachada.svg";
  }, [data]);

  if (!data?.project) return null;
  const project = data.project;
  const units = data.units;
  const admin = can(data.actor, "edit_overlays");
  const zones = edits ?? data.overlays.filter((overlay) => overlay.contenedor === "facade");
  const colorOf = (overlay: Overlay) => {
    const unit = data.units.find((item) => item.id === overlay.vinculo_id);
    return STATUS_COLOR[unit?.estado ?? "disponible"] ?? "#1f8a5b";
  };

  function addPoint(event: React.MouseEvent<HTMLDivElement>) {
    if (!admin || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const x = round(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)));
    const y = round(Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)));
    setDraft((points) => [...points, [x, y]]);
  }

  function closeZone() {
    if (draft.length < 3) return;
    const unit = units.find((item) => item.id === unitId);
    const overlay: Overlay = {
      id: crypto.randomUUID(),
      project_id: project.id,
      contenedor: "facade",
      contenedor_id: null,
      forma: "polygon",
      puntos: draft,
      vinculo_tipo: "unit",
      vinculo_id: unit?.id ?? null,
      etiqueta: unit?.codigo ?? "Zona",
      estado: "published",
      orden: zones.length,
    };
    setEdits([...zones, overlay]);
    setDraft([]);
    setSelected(overlay.id);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Zonas</h1>
          <p className="text-sm text-[#6b6258]">Dibujá el polígono sobre la fachada y asignalo a una unidad. Las coordenadas quedan entre 0 y 1.</p>
        </div>
        {admin && (
          <button
            className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white"
            onClick={() => {
              void mutate({ op: "save_overlays", projectId: project.id, overlays: zones }).then((result) => {
                if (result) setEdits(null);
              });
            }}
          >
            Publicar zonas
          </button>
        )}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div
          ref={frame}
          className="relative cursor-crosshair overflow-hidden rounded-3xl bg-[#d9e4ea]"
          onClick={addPoint}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={facade} alt="Fachada" className="block w-full select-none" draggable={false} />
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {zones.map((overlay) => (
              <polygon
                key={overlay.id}
                points={overlay.puntos.map((point) => point.join(",")).join(" ")}
                fill={colorOf(overlay)}
                fillOpacity={selected === overlay.id ? 0.55 : 0.28}
                stroke={selected === overlay.id ? "#1c1915" : colorOf(overlay)}
                strokeWidth="0.004"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelected(overlay.id);
                }}
              />
            ))}
            {draft.length > 0 && (
              <polyline
                points={draft.map((point) => point.join(",")).join(" ")}
                fill="none"
                stroke="#1c1915"
                strokeWidth="0.004"
              />
            )}
            {draft.map((point, index) => (
              <circle key={index} cx={point[0]} cy={point[1]} r="0.012" fill="#1c1915" />
            ))}
          </svg>
        </div>
        <div className="space-y-3">
          {admin && (
            <div className="rounded-3xl border border-[#e4d9c8] bg-white p-4">
              <p className="text-sm">Puntos del trazo: {draft.length}. Hacé clic en la imagen para sumar vértices.</p>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
                <option value="">Elegí la unidad</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.codigo}</option>)}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-full bg-[#c4a574] px-3 py-1 text-sm" disabled={draft.length < 3} onClick={closeZone}>Cerrar zona</button>
                <button type="button" className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" onClick={() => setDraft((points) => points.slice(0, -1))}>Borrar último punto</button>
                <button type="button" className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" onClick={() => setDraft([])}>Limpiar trazo</button>
              </div>
            </div>
          )}
          <ul className="max-h-[520px] space-y-2 overflow-auto">
            {zones.map((overlay) => {
              const unit = units.find((item) => item.id === overlay.vinculo_id);
              return (
                <li key={overlay.id} className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${selected === overlay.id ? "border-[#1c1915] bg-white" : "border-[#e4d9c8] bg-white/70"}`}>
                  <button type="button" className="text-left" onClick={() => setSelected(overlay.id)}>
                    <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: colorOf(overlay) }} />
                    {overlay.etiqueta} · {unit?.codigo ?? "sin unidad"} · {overlay.puntos.length} puntos
                  </button>
                  {admin && (
                    <button
                      className="text-[#9a6240]"
                      onClick={() => {
                        setEdits(zones.filter((item) => item.id !== overlay.id));
                        if (selected === overlay.id) setSelected(null);
                      }}
                    >
                      Quitar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
