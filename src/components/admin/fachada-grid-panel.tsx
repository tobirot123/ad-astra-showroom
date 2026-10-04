"use client";

import { useEffect, useMemo, useState } from "react";
import { celdasDeCara, ORIENTACIONES_FACHADA, plantaDePiso, type FachadaCara, type Point, type Quad } from "@/lib/domain/fachada-grilla";
import { STATUS_COLOR } from "@/lib/domain/format";
import type { Floor, Unit } from "@/lib/domain/types";
import { useAdmin } from "@/components/admin/provider";

const PISOS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

function pisoLabel(level: number) {
  return level === 0 ? "PB" : String(level);
}

function freshFace(index: number): FachadaCara {
  const shift = index * 0.04;
  return {
    id: `cara-${Date.now().toString(36)}-${index}`,
    esquinas: [
      [0.4 + shift, 0.32],
      [0.56 + shift, 0.3],
      [0.55 + shift, 0.74],
      [0.39 + shift, 0.77],
    ],
    pisos: [...PISOS],
    orientaciones: ["Norte"],
  };
}

export function FachadaGridPanel({ viewpointId, image, units, floors }: { viewpointId: string; image: string; units: Unit[]; floors: Floor[] }) {
  const { data, mutate } = useAdmin();
  const fachadas = data?.project?.settings.fachadas;
  const [caras, setCaras] = useState<FachadaCara[]>(() => fachadas?.find((item) => item.viewpoint_id === viewpointId)?.caras ?? []);
  const [face, setFace] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setCaras(fachadas?.find((item) => item.viewpoint_id === viewpointId)?.caras ?? []);
    setFace(0);
  }, [viewpointId, fachadas]);
  const current = caras[face] ?? null;

  const lite = useMemo(
    () => units.map((unit) => ({
      codigo: unit.codigo,
      tipo: unit.tipo,
      orientacion: unit.orientacion,
      planta: plantaDePiso(floors.find((item) => item.id === unit.floor_id)?.numero ?? -99),
    })),
    [units, floors],
  );
  const preview = current ? celdasDeCara(current, lite) : [];

  function patch(next: FachadaCara) {
    setCaras((rows) => rows.map((row, index) => (index === face ? next : row)));
  }

  function moveCorner(index: number, point: Point) {
    if (!current) return;
    const esquinas = current.esquinas.map((corner, cornerIndex) => (cornerIndex === index ? point : corner)) as Quad;
    patch({ ...current, esquinas });
  }

  async function save() {
    if (!data?.project) return;
    setBusy(true);
    setNotice("");
    const result = await mutate({ op: "save_fachadas", projectId: data.project.id, viewpointId, caras });
    setBusy(false);
    setNotice(result ? "Grilla guardada. El showroom se reacomoda con estas esquinas." : "No pudimos guardar la grilla.");
  }

  return (
    <section className="mt-4 rounded-2xl border border-[#e4d9c8] bg-[#faf7f2] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Grilla de la fachada</h3>
        <button type="button" className="rounded-full border border-[#e4d9c8] px-3 py-1 text-xs" onClick={() => { setCaras((rows) => [...rows, freshFace(rows.length)]); setFace(caras.length); }}>Nueva cara</button>
      </div>
      <p className="mb-3 text-xs text-[#6b6258]">Arrastrá las cuatro esquinas. Los vanos siguen las losas entre esas esquinas. Los pisos y las orientaciones definen cuántas filas y columnas hay.</p>
      {caras.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {caras.map((cara, index) => (
            <button key={cara.id} type="button" className={`rounded-full px-3 py-1 text-xs ${index === face ? "bg-[#1c1915] text-white" : "border border-[#e4d9c8]"}`} onClick={() => setFace(index)}>Cara {index + 1}</button>
          ))}
        </div>
      )}
      {current && (
        <>
          <CornerField image={image} cara={current} cells={preview} units={units} onCorner={moveCorner} />
          <p className="mt-3 text-xs font-medium">Pisos, de arriba hacia abajo</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {PISOS.map((level) => {
              const on = current.pisos.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  className={`rounded-full px-2 py-1 text-xs ${on ? "bg-[#1c1915] text-white" : "border border-[#e4d9c8]"}`}
                  onClick={() => patch({ ...current, pisos: on ? current.pisos.filter((item) => item !== level) : [...current.pisos, level].sort((a, b) => b - a) })}
                >
                  {pisoLabel(level)}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-medium">Orientaciones, de izquierda a derecha</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {ORIENTACIONES_FACHADA.map((name) => {
              const on = current.orientaciones.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  className={`rounded-full px-2 py-1 text-xs ${on ? "bg-[#4A6844] text-white" : "border border-[#e4d9c8]"}`}
                  onClick={() => {
                    const orientaciones = on ? current.orientaciones.filter((item) => item !== name) : [...current.orientaciones, name];
                    patch({ ...current, orientaciones });
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {current.orientaciones.map((name, index) => (
              <span key={name} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs">
                {name}
                <button type="button" aria-label="Mover a la izquierda" disabled={index === 0} onClick={() => {
                  const orientaciones = [...current.orientaciones];
                  const [item] = orientaciones.splice(index, 1);
                  if (item) orientaciones.splice(index - 1, 0, item);
                  patch({ ...current, orientaciones });
                }}>‹</button>
                <button type="button" aria-label="Mover a la derecha" disabled={index === current.orientaciones.length - 1} onClick={() => {
                  const orientaciones = [...current.orientaciones];
                  const [item] = orientaciones.splice(index, 1);
                  if (item) orientaciones.splice(index + 1, 0, item);
                  patch({ ...current, orientaciones });
                }}>›</button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-[#1c1915] px-3 py-1 text-sm text-white" disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar grilla"}</button>
            <button type="button" className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" onClick={() => { setCaras((rows) => rows.filter((_, index) => index !== face)); setFace(0); }}>Quitar esta cara</button>
          </div>
        </>
      )}
      {!current && <p className="text-sm text-[#6b6258]">Esta parada no tiene grilla. Creá una cara para alinear las máscaras.</p>}
      {notice && <p className="mt-2 text-sm">{notice}</p>}
    </section>
  );
}

function CornerField({
  image,
  cara,
  cells,
  units,
  onCorner,
}: {
  image: string;
  cara: FachadaCara;
  cells: { codigo: string; puntos: Point[] }[];
  units: Unit[];
  onCorner: (index: number, point: Point) => void;
}) {
  const labels = ["Arriba izquierda", "Arriba derecha", "Abajo derecha", "Abajo izquierda"];
  return (
    <div
      className="relative mt-2 aspect-video overflow-hidden rounded-xl bg-[#d9d3c8]"
      onPointerMove={(event) => {
        const handle = event.currentTarget.dataset.drag;
        if (handle == null) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        onCorner(Number(handle), [Number(x.toFixed(4)), Number(y.toFixed(4))]);
      }}
      onPointerUp={(event) => { delete event.currentTarget.dataset.drag; }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-fill" draggable={false} />
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polygon points={cara.esquinas.map((point) => point.join(",")).join(" ")} fill="rgba(74,104,68,0.08)" stroke="#ffffff" strokeWidth={0.003} />
        {cells.map((cell) => {
          const unit = units.find((item) => item.codigo === cell.codigo);
          return <polygon key={cell.codigo} points={cell.puntos.map((point) => point.join(",")).join(" ")} fill={STATUS_COLOR[unit?.estado ?? "disponible"] ?? "#1f8a5b"} fillOpacity={0.4} />;
        })}
        {cara.esquinas.map((point, index) => (
          <circle
            key={labels[index]}
            cx={point[0]}
            cy={point[1]}
            r={0.016}
            fill="#fff"
            stroke="#1c1915"
            strokeWidth={0.003}
            className="cursor-grab"
            onPointerDown={(event) => {
              const host = event.currentTarget.ownerSVGElement?.parentElement;
              if (!host) return;
              host.dataset.drag = String(index);
              host.setPointerCapture(event.pointerId);
            }}
          />
        ))}
      </svg>
      <p className="absolute bottom-1 left-2 text-[11px] text-white drop-shadow">Arrastrá las esquinas blancas. {labels.join(" · ")}.</p>
    </div>
  );
}
