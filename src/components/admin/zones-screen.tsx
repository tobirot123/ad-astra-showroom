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
  const [targetKey, setTargetKey] = useState("");
  const [edits, setEdits] = useState<Overlay[] | null>(null);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [unitId, setUnitId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const targets = useMemo(() => {
    if (!data?.project) return [];
    const projectFacade = data.media.find((item) => item.id === data.media_links.find((link) => link.entidad === "project" && link.rol === "fachada")?.media_id)?.url ?? "/demo/fachada.webp";
    const rows: { key: string; label: string; contenedor: Overlay["contenedor"]; contenedorId: string; image: string; link: "unit" | "building" }[] = [];
    for (const building of data.buildings) {
      if (building.tipo === "loteo" || building.tipo === "manzana") {
        const scene = data.viewpoints.find((item) => item.building_id === building.id && item.tipo === "masterplan");
        rows.push({
          key: `master-${building.id}`,
          label: `Masterplan ${building.nombre}`,
          contenedor: "masterplan",
          contenedorId: building.id,
          image: scene?.imagen_url ?? "/demo/masterplan.webp",
          link: "unit",
        });
      } else {
        const fachada = data.media.find((item) => item.id === data.media_links.find((link) => link.entidad === "building" && link.entidad_id === building.id && link.rol === "fachada")?.media_id)?.url;
        rows.push({
          key: `facade-${building.id}`,
          label: `Fachada ${building.nombre}`,
          contenedor: "facade",
          contenedorId: building.id,
          image: fachada ?? projectFacade,
          link: "unit",
        });
      }
      for (const floor of data.floors.filter((item) => item.building_id === building.id).sort((a, b) => a.numero - b.numero)) {
        const plano = data.media.find((item) => item.id === data.media_links.find((link) => link.entidad === "floor" && link.entidad_id === floor.id && link.rol === "plano")?.media_id)?.url;
        rows.push({
          key: `floor-${floor.id}`,
          label: `${building.nombre} · ${floor.nombre}`,
          contenedor: "floor",
          contenedorId: floor.id,
          image: plano ?? "/demo/plano-piso.webp",
          link: "unit",
        });
      }
    }
    for (const scene of data.viewpoints.filter((item) => item.tipo === "aereo")) {
      rows.push({
        key: `scene-${scene.id}`,
        label: scene.nombre,
        contenedor: "scene",
        contenedorId: scene.id,
        image: scene.imagen_url,
        link: "building",
      });
    }
    return rows;
  }, [data]);

  const target = targets.find((item) => item.key === (targetKey || targets[0]?.key)) ?? targets[0];

  if (!data?.project || !target) return null;
  const project = data.project;
  const surface: NonNullable<typeof target> = target;
  const units = data.units;
  const buildings = data.buildings;
  const admin = can(data.actor, "edit_overlays");
  const zones = edits ?? data.overlays.filter((overlay) => overlay.contenedor === target.contenedor && overlay.contenedor_id === target.contenedorId);
  const colorOf = (overlay: Overlay) => STATUS_COLOR[data.units.find((item) => item.id === overlay.vinculo_id)?.estado ?? "disponible"] ?? "#c4a574";

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
    const building = buildings.find((item) => item.id === buildingId);
    const overlay: Overlay = {
      id: crypto.randomUUID(),
      project_id: project.id,
      contenedor: surface.contenedor,
      contenedor_id: surface.contenedorId,
      forma: "polygon",
      puntos: draft,
      vinculo_tipo: surface.link === "building" ? "building" : "unit",
      vinculo_id: surface.link === "building" ? building?.id ?? null : unit?.id ?? null,
      etiqueta: surface.link === "building" ? building?.nombre ?? "Zona" : unit?.codigo ?? "Zona",
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
          <p className="text-sm text-[#6b6258]">Elegí fachada, planta, masterplan o vista aérea. El polígono queda en coordenadas de 0 a 1.</p>
        </div>
        {admin && (
          <button
            className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white"
            onClick={() => {
              void mutate({
                op: "save_overlays",
                projectId: project.id,
                overlays: zones,
                contenedor: target.contenedor,
                contenedorId: target.contenedorId,
              }).then((result) => {
                if (result) setEdits(null);
              });
            }}
          >
            Publicar zonas
          </button>
        )}
      </div>
      <label className="mt-4 block text-sm">
        Superficie
        <select
          value={target.key}
          onChange={(event) => {
            setTargetKey(event.target.value);
            setEdits(null);
            setDraft([]);
            setSelected(null);
          }}
          className="mt-1 w-full max-w-md rounded-xl border border-[#e4d9c8] bg-white px-3 py-2"
        >
          {targets.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </label>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div ref={frame} className="relative cursor-crosshair overflow-hidden rounded-3xl bg-[#d9e4ea]" onClick={addPoint}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={target.image} alt={target.label} className="block w-full select-none" draggable={false} />
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
            {draft.length > 0 && <polyline points={draft.map((point) => point.join(",")).join(" ")} fill="none" stroke="#1c1915" strokeWidth="0.004" />}
            {draft.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r="0.012" fill="#1c1915" />)}
          </svg>
        </div>
        <div className="space-y-3">
          {admin && (
            <div className="rounded-3xl border border-[#e4d9c8] bg-white p-4">
              <p className="text-sm">Puntos del trazo: {draft.length}. Hacé clic en la imagen para sumar vértices.</p>
              {target.link === "unit" ? (
                <select value={unitId} onChange={(event) => setUnitId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
                  <option value="">Elegí la unidad</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.codigo}</option>)}
                </select>
              ) : (
                <select value={buildingId} onChange={(event) => setBuildingId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
                  <option value="">Elegí el edificio</option>
                  {buildings.map((building) => <option key={building.id} value={building.id}>{building.nombre}</option>)}
                </select>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="rounded-full bg-[#c4a574] px-3 py-1 text-sm" disabled={draft.length < 3} onClick={closeZone}>Cerrar zona</button>
                <button type="button" className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" onClick={() => setDraft((points) => points.slice(0, -1))}>Borrar último punto</button>
                <button type="button" className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" onClick={() => setDraft([])}>Limpiar trazo</button>
              </div>
            </div>
          )}
          <ul className="max-h-[520px] space-y-2 overflow-auto">
            {zones.map((overlay) => (
              <li key={overlay.id} className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ${selected === overlay.id ? "border-[#1c1915] bg-white" : "border-[#e4d9c8] bg-white/70"}`}>
                <button type="button" className="text-left" onClick={() => setSelected(overlay.id)}>
                  <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ background: colorOf(overlay) }} />
                  {overlay.etiqueta} · {overlay.puntos.length} puntos
                </button>
                {admin && (
                  <button className="text-[#9a6240]" onClick={() => { setEdits(zones.filter((item) => item.id !== overlay.id)); if (selected === overlay.id) setSelected(null); }}>Quitar</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
