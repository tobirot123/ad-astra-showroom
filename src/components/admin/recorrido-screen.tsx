"use client";

import { useState } from "react";
import { can } from "@/lib/domain/permissions";
import type { Viewpoint } from "@/lib/domain/types";
import { useAdmin } from "@/components/admin/provider";

const TIPOS: Viewpoint["tipo"][] = ["portada", "aereo", "barrio", "exterior", "masterplan"];

const empty = {
  id: "",
  nombre: "",
  tipo: "exterior" as Viewpoint["tipo"],
  orden: 0,
  imagen_url: "",
  video_url: "",
  building_id: "",
};

export function RecorridoScreen() {
  const { data, mutate } = useAdmin();
  const [form, setForm] = useState(empty);
  if (!data?.project) return null;
  const admin = can(data.actor, "manage_media");
  const images = data.media.filter((item) => item.tipo !== "video");
  const videos = data.media.filter((item) => item.tipo === "video" || item.url.endsWith(".mp4"));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div>
        <h1 className="font-serif text-4xl">Recorrido</h1>
        <p className="mt-1 text-sm text-[#6b6258]">Portada, vuelo y puntos de vista. El video se reproduce al llegar a la escena y solo se precarga el siguiente.</p>
        <ul className="mt-4 space-y-2">
          {data.viewpoints.map((scene) => (
            <li key={scene.id} className="flex items-center justify-between rounded-2xl border border-[#e4d9c8] bg-white px-3 py-2 text-sm">
              <button type="button" className="text-left" onClick={() => setForm({
                id: scene.id,
                nombre: scene.nombre,
                tipo: scene.tipo,
                orden: scene.orden,
                imagen_url: scene.imagen_url,
                video_url: scene.video_url ?? "",
                building_id: scene.building_id ?? "",
              })}>
                <span className="font-medium">{scene.orden}. {scene.nombre}</span>
                <span className="ml-2 text-[#6b6258]">{scene.tipo}{scene.video_url ? " · con video" : ""}</span>
              </button>
              {admin && <button className="text-[#9a6240]" onClick={() => void mutate({ op: "delete_viewpoint", viewpointId: scene.id })}>Quitar</button>}
            </li>
          ))}
        </ul>
      </div>
      {admin && (
        <form
          className="space-y-3 rounded-3xl border border-[#e4d9c8] bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void mutate({
              op: "save_viewpoint",
              projectId: data.project!.id,
              viewpoint: {
                id: form.id || undefined,
                nombre: form.nombre,
                tipo: form.tipo,
                orden: Number(form.orden),
                imagen_url: form.imagen_url,
                video_url: form.video_url || null,
                building_id: form.building_id || null,
              },
            }).then((result) => {
              if (result) setForm(empty);
            });
          }}
        >
          <h2 className="font-serif text-2xl">{form.id ? "Editar escena" : "Nueva escena"}</h2>
          <label className="block text-sm">Nombre
            <input value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} required className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
          </label>
          <label className="block text-sm">Tipo
            <select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as Viewpoint["tipo"] })} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </label>
          <label className="block text-sm">Orden
            <input type="number" value={form.orden} onChange={(event) => setForm({ ...form, orden: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
          </label>
          <label className="block text-sm">Edificio
            <select value={form.building_id} onChange={(event) => setForm({ ...form, building_id: event.target.value })} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="">Ninguno</option>
              {data.buildings.map((building) => <option key={building.id} value={building.id}>{building.nombre}</option>)}
            </select>
          </label>
          <label className="block text-sm">Imagen
            <select value={form.imagen_url} onChange={(event) => setForm({ ...form, imagen_url: event.target.value })} required className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="">Elegí un archivo</option>
              {images.map((item) => <option key={item.id} value={item.url}>{item.nombre}</option>)}
            </select>
          </label>
          <label className="block text-sm">Video de transición (opcional)
            <select value={form.video_url} onChange={(event) => setForm({ ...form, video_url: event.target.value })} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="">Sin video</option>
              {videos.map((item) => <option key={item.id} value={item.url}>{item.nombre}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">Guardar escena</button>
            {form.id && <button type="button" className="rounded-full border border-[#e4d9c8] px-4 py-2 text-sm" onClick={() => setForm(empty)}>Nueva</button>}
          </div>
        </form>
      )}
    </div>
  );
}
