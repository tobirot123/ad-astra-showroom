"use client";

import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

export function ObraScreen() {
  const { data, mutate } = useAdmin();
  if (!data?.project) return null;
  const project = data.project;
  const edit = can(data.actor, "edit_project");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h1 className="font-serif text-4xl">Avance de obra</h1>
        <p className="mt-1 text-sm text-[#6b6258]">Una foto y un texto por fecha. El showroom los muestra en orden.</p>
        <ul className="mt-4 space-y-3">
          {data.construction_updates.map((item) => (
            <li key={item.id} className="rounded-2xl border border-[#e4d9c8] bg-white p-4 text-sm">
              <p className="text-xs text-[#6b6258]">{item.fecha}</p>
              <p className="font-medium">{item.titulo}</p>
              <p className="text-[#6b6258]">{item.descripcion}</p>
              {edit && (
                <button className="mt-2 text-xs underline" onClick={() => void mutate({ op: "delete_progress", projectId: project.id, progressId: item.id })}>Quitar</button>
              )}
            </li>
          ))}
        </ul>
        {edit && (
          <form
            className="mt-4 space-y-2 rounded-2xl border border-[#e4d9c8] bg-white p-4 text-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void mutate({
                op: "save_progress",
                projectId: project.id,
                progress: {
                  fecha: String(form.get("fecha")),
                  titulo: String(form.get("titulo")),
                  descripcion: String(form.get("descripcion") ?? ""),
                  imagen_url: String(form.get("imagen") ?? "") || null,
                },
              });
              event.currentTarget.reset();
            }}
          >
            <input name="fecha" type="date" required className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <input name="titulo" required placeholder="Título" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <textarea name="descripcion" placeholder="Qué se hizo" rows={2} className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <input name="imagen" placeholder="URL de la foto" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-white">Agregar hito</button>
          </form>
        )}
      </section>
      <section>
        <h2 className="font-serif text-3xl">Secciones</h2>
        <p className="mt-1 text-sm text-[#6b6258]">Textos propios del proyecto: cómo comprar, amenities escritas, lo que quieras sumar al menú.</p>
        <ul className="mt-4 space-y-3">
          {data.custom_sections.map((item) => (
            <li key={item.id} className="rounded-2xl border border-[#e4d9c8] bg-white p-4 text-sm">
              <p className="font-medium">{item.titulo}{item.visible ? "" : " · oculta"}</p>
              <p className="text-[#6b6258]">{item.cuerpo}</p>
              {edit && (
                <button className="mt-2 text-xs underline" onClick={() => void mutate({ op: "delete_section", projectId: project.id, sectionId: item.id })}>Quitar</button>
              )}
            </li>
          ))}
        </ul>
        {edit && (
          <form
            className="mt-4 space-y-2 rounded-2xl border border-[#e4d9c8] bg-white p-4 text-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void mutate({
                op: "save_section",
                projectId: project.id,
                section: {
                  titulo: String(form.get("titulo")),
                  cuerpo: String(form.get("cuerpo") ?? ""),
                  visible: true,
                },
              });
              event.currentTarget.reset();
            }}
          >
            <input name="titulo" required placeholder="Título" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <textarea name="cuerpo" required rows={4} placeholder="Texto" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-white">Publicar sección</button>
          </form>
        )}
      </section>
    </div>
  );
}
