"use client";

import { useState } from "react";
import { referenceColor, type FacadeMask } from "@/lib/domain/facade-mask";
import type { Unit } from "@/lib/domain/types";
import { useAdmin } from "@/components/admin/provider";

type Draft = FacadeMask;

export function MaskPanel({ viewpointId, units }: { viewpointId: string; units: Unit[] }) {
  const { data, mutate } = useAdmin();
  const project = data?.project;
  const saved = project?.settings.mascaras?.find((item) => item.viewpoint_id === viewpointId) ?? null;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [alphaUnit, setAlphaUnit] = useState("");
  const mask = draft ?? saved ?? { viewpoint_id: viewpointId, modo: "idcolor" as const, imagen_url: null, mapa: [], alphas: [] };
  const departamentos = units.filter((unit) => unit.tipo === "departamento");

  if (!project) return null;

  async function upload(file: File, modo: "idcolor" | "alpha") {
    setBusy(true);
    setNotice("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("projectId", project!.id);
      body.set("modo", modo);
      const response = await fetch("/api/admin/mask", { method: "POST", body });
      const json = await response.json() as { url?: string; mapa?: { color: string; unidad_id: string }[]; error?: string };
      if (!response.ok || !json.url) {
        setNotice(json.error ?? "No pudimos leer el PNG.");
        return;
      }
      if (modo === "alpha") {
        if (!alphaUnit) {
          setNotice("Elegí la unidad antes de subir su PNG.");
          return;
        }
        setDraft({
          ...mask,
          modo: "alpha",
          alphas: [...mask.alphas.filter((entry) => entry.unidad_id !== alphaUnit), { unidad_id: alphaUnit, imagen_url: json.url }],
        });
        setNotice("PNG cargado. Revisá la lista y publicalo.");
        return;
      }
      setDraft({
        viewpoint_id: viewpointId,
        modo: "idcolor",
        imagen_url: json.url,
        mapa: json.mapa ?? [],
        alphas: [],
      });
      const assigned = (json.mapa ?? []).filter((entry) => entry.unidad_id).length;
      setNotice(assigned
        ? `Leímos ${json.mapa?.length ?? 0} colores y asignamos ${assigned} solos. Corregí los que falten y publicalo.`
        : "Leímos los colores, pero no coinciden con la paleta. Asigná cada uno a su unidad.");
    } finally {
      setBusy(false);
    }
  }

  async function publish(next: Draft | null) {
    setBusy(true);
    setNotice("");
    const result = await mutate({ op: "save_facade_mask", projectId: project!.id, viewpointId, mask: next });
    setBusy(false);
    if (result) {
      setDraft(null);
      setNotice(next ? "Máscara publicada. En el showroom reemplaza a los polígonos de esta parada." : "Volvimos a los polígonos.");
    }
  }

  function assign(color: string, unidadId: string) {
    setDraft({ ...mask, mapa: mask.mapa.map((entry) => entry.color === color ? { ...entry, unidad_id: unidadId } : entry) });
  }

  return (
    <div className="rounded-3xl border border-[#e4d9c8] bg-white p-4">
      <h2 className="font-serif text-2xl">Máscara del estudio</h2>
      <p className="mt-1 text-sm text-[#6b6258]">
        Un PNG por parada, del mismo encuadre que la foto. Puede ser un pase de color (un color plano por unidad) o un PNG con alpha por unidad.
        Si no hay máscara, se usan los polígonos.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button type="button" className={`rounded-full px-3 py-1 ${mask.modo === "idcolor" ? "bg-[#1c1915] text-white" : "border border-[#e4d9c8]"}`} onClick={() => setDraft({ ...mask, modo: "idcolor" })}>Pase de color</button>
        <button type="button" className={`rounded-full px-3 py-1 ${mask.modo === "alpha" ? "bg-[#1c1915] text-white" : "border border-[#e4d9c8]"}`} onClick={() => setDraft({ ...mask, modo: "alpha" })}>PNG con alpha</button>
      </div>

      {mask.modo === "idcolor" ? (
        <label className="mt-3 block text-sm">
          Pase PNG
          <input
            type="file"
            accept="image/png"
            className="mt-1 block w-full text-sm"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file, "idcolor");
            }}
          />
        </label>
      ) : (
        <div className="mt-3 space-y-2">
          <select value={alphaUnit} onChange={(event) => setAlphaUnit(event.target.value)} className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2 text-sm">
            <option value="">Unidad del PNG</option>
            {departamentos.map((unit) => <option key={unit.id} value={unit.id}>{unit.codigo}</option>)}
          </select>
          <input
            type="file"
            accept="image/png"
            className="block w-full text-sm"
            disabled={busy || !alphaUnit}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file, "alpha");
            }}
          />
          <ul className="space-y-1 text-sm">
            {mask.alphas.map((entry) => (
              <li key={entry.unidad_id} className="flex items-center justify-between gap-2">
                <span>{units.find((unit) => unit.id === entry.unidad_id)?.codigo ?? "Unidad"}</span>
                <button type="button" className="text-[#9a6240]" onClick={() => setDraft({ ...mask, alphas: mask.alphas.filter((item) => item.unidad_id !== entry.unidad_id) })}>Quitar</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mask.modo === "idcolor" && mask.mapa.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
          {mask.mapa.map((entry) => (
            <li key={entry.color} className="flex items-center gap-2">
              <span className="h-5 w-5 shrink-0 rounded-full border border-[#e4d9c8]" style={{ background: entry.color }} />
              <select value={entry.unidad_id} onChange={(event) => assign(entry.color, event.target.value)} className="w-full rounded-xl border border-[#e4d9c8] px-2 py-1 text-sm">
                <option value="">Sin asignar</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.codigo}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-3 text-sm text-[#6b6258]">
        <summary className="cursor-pointer">Paleta de referencia</summary>
        <p className="mt-1">Si el estudio pinta cada unidad con estos colores, la asignación es automática.</p>
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
          {departamentos.map((unit) => (
            <li key={unit.id} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: referenceColor(unit.codigo) }} />
              <span>{unit.codigo}</span>
              <span className="font-mono text-xs">{referenceColor(unit.codigo)}</span>
            </li>
          ))}
        </ul>
      </details>

      {notice && <p className="mt-3 text-sm">{notice}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-full bg-[#1c1915] px-3 py-1 text-sm text-white" disabled={busy} onClick={() => void publish({ ...mask, viewpoint_id: viewpointId })}>Publicar máscara</button>
        <button type="button" className="rounded-full border border-[#e4d9c8] px-3 py-1 text-sm" disabled={busy || !saved} onClick={() => void publish(null)}>Volver a polígonos</button>
      </div>
    </div>
  );
}
