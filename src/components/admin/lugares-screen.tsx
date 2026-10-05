"use client";

import { useState } from "react";
import { PoiMap } from "@/components/maps/poi-map";
import { distanceMeters } from "@/lib/domain/geo";
import { can } from "@/lib/domain/permissions";
import { POI_CATEGORIES, poiLabel } from "@/lib/domain/poi";
import type { Tour } from "@/lib/domain/types";
import { useAdmin } from "@/components/admin/provider";

const PROVEEDORES: Tour["proveedor"][] = ["url", "matterport", "kuula", "3dvista", "pano2vr", "luma", "layama"];

export function LugaresScreen() {
  const { data, mutate } = useAdmin();
  const [poi, setPoi] = useState({ id: "", nombre: "", categoria: "otro", lat: "", lng: "", distancia_m: "", descripcion: "" });
  const [tour, setTour] = useState({ id: "", titulo: "", url: "", proveedor: "url" as Tour["proveedor"], entidad: "typology" as Tour["entidad"], entidad_id: "" });
  if (!data?.project) return null;
  const admin = can(data.actor, "edit_project");
  const mediaAdmin = can(data.actor, "manage_media");
  const targets = [
    ...data.typologies.map((item) => ({ entidad: "typology" as const, id: item.id, label: `Tipología ${item.nombre}` })),
    ...data.units.map((item) => ({ entidad: "unit" as const, id: item.id, label: `Unidad ${item.codigo}` })),
    ...data.floors.map((item) => ({ entidad: "floor" as const, id: item.id, label: item.nombre })),
    ...data.characteristics.filter((item) => item.icono === "amenity").map((item) => ({ entidad: "amenity" as const, id: item.id, label: `Amenity ${item.nombre}` })),
    { entidad: "project" as const, id: data.project.id, label: "Proyecto" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h1 className="font-serif text-4xl">Lugares</h1>
        <p className="mt-1 text-sm text-[#6b6258]">Puntos del mapa, con distancia, y tours 360. El mapa y el tour se cargan recién cuando el visitante los abre.</p>
        <ul className="mt-4 space-y-2">
          {data.points_of_interest.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-2xl border border-[#e4d9c8] bg-white px-3 py-2 text-sm">
              <button type="button" className="text-left" onClick={() => setPoi({
                id: item.id,
                nombre: item.nombre,
                categoria: item.categoria,
                lat: item.lat == null ? "" : String(item.lat),
                lng: item.lng == null ? "" : String(item.lng),
                distancia_m: item.distancia_m == null ? "" : String(item.distancia_m),
                descripcion: item.descripcion,
              })}>
                {item.nombre} · {poiLabel(item.categoria)}{item.distancia_m != null ? ` · ${item.distancia_m} m` : ""}
              </button>
              {admin && <button className="text-[#9a6240]" onClick={() => void mutate({ op: "delete_poi", poiId: item.id })}>Quitar</button>}
            </li>
          ))}
        </ul>
        {admin && (
          <form
            className="mt-4 space-y-2 rounded-3xl border border-[#e4d9c8] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void mutate({
                op: "save_poi",
                projectId: data.project!.id,
                poi: {
                  id: poi.id || undefined,
                  nombre: poi.nombre,
                  categoria: poi.categoria,
                  lat: poi.lat,
                  lng: poi.lng,
                  distancia_m: poi.distancia_m,
                  descripcion: poi.descripcion,
                },
              });
            }}
          >
            <h2 className="font-serif text-2xl">Punto de interés</h2>
            {data.project.lat != null && data.project.lng != null && (
              <>
                <PoiMap
                  lat={data.project.lat}
                  lng={data.project.lng}
                  nombre={data.project.nombre}
                  pois={data.points_of_interest}
                  selectedId={poi.id || null}
                  onSelect={(id) => {
                    const item = data.points_of_interest.find((point) => point.id === id);
                    if (!item) return;
                    setPoi({
                      id: item.id,
                      nombre: item.nombre,
                      categoria: item.categoria,
                      lat: item.lat == null ? "" : String(item.lat),
                      lng: item.lng == null ? "" : String(item.lng),
                      distancia_m: item.distancia_m == null ? "" : String(item.distancia_m),
                      descripcion: item.descripcion,
                    });
                  }}
                  onPick={(lat, lng) => setPoi((current) => ({
                    ...current,
                    lat: lat.toFixed(6),
                    lng: lng.toFixed(6),
                    distancia_m: String(distanceMeters(data.project!.lat!, data.project!.lng!, lat, lng)),
                  }))}
                />
                <p className="text-xs text-[#6b6258]">Tocá el mapa para marcar el punto. La distancia se calcula sola desde el edificio.</p>
              </>
            )}
            <input value={poi.nombre} onChange={(event) => setPoi({ ...poi, nombre: event.target.value })} placeholder="Nombre" required className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <select value={poi.categoria} onChange={(event) => setPoi({ ...poi, categoria: event.target.value })} className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              {POI_CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input value={poi.lat} onChange={(event) => setPoi({ ...poi, lat: event.target.value })} placeholder="Lat" className="rounded-xl border border-[#e4d9c8] px-3 py-2" />
              <input value={poi.lng} onChange={(event) => setPoi({ ...poi, lng: event.target.value })} placeholder="Lng" className="rounded-xl border border-[#e4d9c8] px-3 py-2" />
              <input value={poi.distancia_m} onChange={(event) => setPoi({ ...poi, distancia_m: event.target.value })} placeholder="Metros" className="rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </div>
            <textarea value={poi.descripcion} onChange={(event) => setPoi({ ...poi, descripcion: event.target.value })} rows={2} placeholder="Descripción" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">Guardar lugar</button>
          </form>
        )}
      </section>
      <section>
        <h2 className="font-serif text-3xl">Tours 360</h2>
        <p className="mt-1 text-sm text-[#6b6258]">Matterport, Kuula, 3DVista, Pano2VR, Luma o una imagen panorámica propia.</p>
        <ul className="mt-4 space-y-2">
          {data.tours.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-2xl border border-[#e4d9c8] bg-white px-3 py-2 text-sm">
              <span>{item.titulo} · {item.proveedor}</span>
              {mediaAdmin && <button className="text-[#9a6240]" onClick={() => void mutate({ op: "delete_tour", tourId: item.id })}>Quitar</button>}
            </li>
          ))}
        </ul>
        {mediaAdmin && (
          <form
            className="mt-4 space-y-2 rounded-3xl border border-[#e4d9c8] bg-white p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const [entidad, entidadId] = tour.entidad_id.split(":");
              void mutate({
                op: "save_tour",
                projectId: data.project!.id,
                tour: {
                  id: tour.id || undefined,
                  titulo: tour.titulo,
                  url: tour.url,
                  proveedor: tour.proveedor,
                  entidad: (entidad || tour.entidad) as Tour["entidad"],
                  entidad_id: entidadId || tour.entidad_id,
                },
              });
            }}
          >
            <input value={tour.titulo} onChange={(event) => setTour({ ...tour, titulo: event.target.value })} placeholder="Título" required className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <input value={tour.url} onChange={(event) => setTour({ ...tour, url: event.target.value })} placeholder="URL del tour o panorama" required className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <select value={tour.proveedor} onChange={(event) => setTour({ ...tour, proveedor: event.target.value as Tour["proveedor"] })} className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              {PROVEEDORES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={tour.entidad_id} onChange={(event) => setTour({ ...tour, entidad_id: event.target.value })} required className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="">Asociar a…</option>
              {targets.map((item) => <option key={`${item.entidad}:${item.id}`} value={`${item.entidad}:${item.id}`}>{item.label}</option>)}
            </select>
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">Guardar tour</button>
          </form>
        )}
        <p className="mt-6 text-sm text-[#6b6258]">Las amenities salen de Campos: una característica con ícono “amenity” aparece en el showroom, con la foto que le asignes en Medios.</p>
      </section>
    </div>
  );
}
