"use client";

import { useState } from "react";
import { can } from "@/lib/domain/permissions";
import type { FieldType } from "@/lib/domain/types";
import { useAdmin } from "@/components/admin/provider";

const TYPES: { id: FieldType; label: string }[] = [
  { id: "text", label: "Texto" },
  { id: "longtext", label: "Texto largo" },
  { id: "number", label: "Número" },
  { id: "boolean", label: "Sí / no" },
  { id: "select", label: "Lista" },
  { id: "multiselect", label: "Lista múltiple" },
  { id: "date", label: "Fecha" },
  { id: "url", label: "Link" },
];

export function FieldsScreen() {
  const { data, mutate } = useAdmin();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<FieldType>("text");
  const [opciones, setOpciones] = useState("");
  const [unidad, setUnidad] = useState("");
  const [publico, setPublico] = useState(true);
  const [filtro, setFiltro] = useState(false);
  const [feature, setFeature] = useState("");
  if (!data?.project) return null;
  const admin = can(data.actor, "edit_custom_fields");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h1 className="font-serif text-4xl">Campos</h1>
        <p className="mt-1 text-sm text-[#6b6258]">Lo que no entra en m², ambientes o precio. Cada desarrolladora arma los suyos.</p>
        <ul className="mt-4 space-y-2">
          {data.fields.map((field) => (
            <li key={field.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[#e4d9c8] bg-white px-4 py-3">
              <div>
                <p className="font-medium">{field.nombre}</p>
                <p className="text-xs text-[#6b6258]">
                  {field.clave} · {TYPES.find((t) => t.id === field.tipo)?.label ?? field.tipo}
                  {field.unidad_medida ? ` · ${field.unidad_medida}` : ""}
                  {field.publico ? " · público" : " · interno"}
                  {field.en_filtro ? " · filtro" : ""}
                </p>
                {!!field.opciones.length && <p className="text-xs text-[#6b6258]">{field.opciones.join(" · ")}</p>}
              </div>
              {admin && (
                <button className="text-sm text-[#9a6240]" onClick={() => void mutate({ op: "archive_field", fieldId: field.id })}>
                  Archivar
                </button>
              )}
            </li>
          ))}
        </ul>
        {admin && (
          <form
            className="mt-4 space-y-2 rounded-3xl border border-[#e4d9c8] bg-white p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await mutate({
                op: "create_field",
                projectId: data.project!.id,
                field: {
                  nombre,
                  tipo,
                  opciones: opciones.split(",").map((item) => item.trim()).filter(Boolean),
                  unidad_medida: unidad || null,
                  publico,
                  en_ficha: true,
                  en_filtro: filtro,
                },
              });
              if (result) {
                setNombre("");
                setOpciones("");
              }
            }}
          >
            <p className="font-medium">Nuevo campo</p>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre, por ejemplo Tipo de cochera" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" required />
            <div className="grid gap-2 sm:grid-cols-2">
              <select value={tipo} onChange={(e) => setTipo(e.target.value as FieldType)} className="rounded-xl border border-[#e4d9c8] px-3 py-2">
                {TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
              <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="Unidad (ARS, m²…)" className="rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </div>
            {(tipo === "select" || tipo === "multiselect") && (
              <input value={opciones} onChange={(e) => setOpciones(e.target.value)} placeholder="Opciones separadas por coma" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} /> Visible en la ficha pública</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filtro} onChange={(e) => setFiltro(e.target.checked)} /> Usarlo como filtro del showroom</label>
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">Crear campo</button>
          </form>
        )}
      </section>
      <section>
        <h2 className="font-serif text-3xl">Características</h2>
        <p className="mt-1 text-sm text-[#6b6258]">Amenities y atributos que se muestran como lista en la ficha.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {data.characteristics.map((item) => (
            <li key={item.id} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-[#e4d9c8]">{item.nombre}</li>
          ))}
        </ul>
        {admin && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await mutate({ op: "create_characteristic", projectId: data.project!.id, nombre: feature });
              if (result) setFeature("");
            }}
          >
            <input value={feature} onChange={(e) => setFeature(e.target.value)} placeholder="Pileta, parrilla, balcón…" className="flex-1 rounded-xl border border-[#e4d9c8] bg-white px-3 py-2" required />
            <button className="rounded-full bg-[#c4a574] px-4 py-2 text-sm">Agregar</button>
          </form>
        )}
      </section>
    </div>
  );
}
