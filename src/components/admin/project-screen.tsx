"use client";

import { useState } from "react";
import { ROLE_LABEL } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

export function ProjectScreen() {
  const { data, mutate } = useAdmin();
  const [invite, setInvite] = useState({ nombre: "", email: "", role: "seller" });
  const [password, setPassword] = useState("");
  if (!data?.project) return null;
  const project = data.project;
  const actor = data.actor;
  const admin = can(actor, "edit_project");
  const checklist = [
    { ok: Boolean(project.nombre && project.direccion), label: "Nombre y dirección" },
    { ok: data.units.length > 0, label: "Unidades cargadas" },
    { ok: data.overlays.some((o) => o.estado === "published"), label: "Zonas publicadas sobre la fachada" },
    { ok: data.media.length > 0, label: "Renders o planos" },
    { ok: project.estado === "published", label: "Showroom publicado" },
  ];

  async function save(form: FormData) {
    await mutate({
      op: "update_project",
      projectId: project.id,
      patch: {
        nombre: String(form.get("nombre") ?? ""),
        descripcion: String(form.get("descripcion") ?? ""),
        direccion: String(form.get("direccion") ?? ""),
        fecha_entrega: String(form.get("fecha_entrega") ?? "") || null,
        contacto: {
          whatsapp: String(form.get("whatsapp") ?? ""),
          email: String(form.get("email") ?? ""),
          telefono: String(form.get("telefono") ?? ""),
        },
        settings: {
          request_expiry_hours: Number(form.get("expiry") ?? 48),
          public_pending_display: String(form.get("pending") ?? "available"),
          lead_required_for_request: form.get("lead_required") === "on",
          escalate_to_superadmin: form.get("escalate") === "on",
        },
      },
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <h1 className="font-serif text-4xl">Proyecto</h1>
        <p className="mt-1 text-sm text-[#6b6258]">
          {project.nombre} · /s/{project.slug} · {project.estado === "published" ? "publicado" : "borrador"}
        </p>
        <form
          className="mt-5 space-y-3 rounded-3xl border border-[#e4d9c8] bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save(new FormData(event.currentTarget));
          }}
        >
          <label className="block text-sm">
            Nombre
            <input name="nombre" defaultValue={project.nombre} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
          </label>
          <label className="block text-sm">
            Descripción
            <textarea name="descripcion" defaultValue={project.descripcion} disabled={!admin} rows={3} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
          </label>
          <label className="block text-sm">
            Dirección
            <input name="direccion" defaultValue={project.direccion} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
          </label>
          <label className="block text-sm">
            Entrega
            <input name="fecha_entrega" defaultValue={project.fecha_entrega ?? ""} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              WhatsApp
              <input name="whatsapp" defaultValue={project.contacto.whatsapp} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </label>
            <label className="text-sm">
              Email
              <input name="email" defaultValue={project.contacto.email} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </label>
            <label className="text-sm">
              Teléfono
              <input name="telefono" defaultValue={project.contacto.telefono} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Vencimiento de solicitudes (horas)
              <input name="expiry" type="number" min={1} max={168} defaultValue={project.settings.request_expiry_hours} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            </label>
            <label className="text-sm">
              Mientras hay una solicitud
              <select name="pending" defaultValue={project.settings.public_pending_display} disabled={!admin} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
                <option value="available">Seguir mostrando el estado oficial</option>
                <option value="ask">Mostrar “Consultar disponibilidad”</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input name="lead_required" type="checkbox" defaultChecked={project.settings.lead_required_for_request} disabled={!admin} />
            Pedir un cliente para reservar o vender
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="escalate" type="checkbox" defaultChecked={project.settings.escalate_to_superadmin} disabled={!admin} />
            Avisar también a Ad Astra si nadie responde
          </label>
          {admin && <button className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">Guardar proyecto</button>}
        </form>
      </div>
      <div className="space-y-4">
        <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
          <h2 className="font-serif text-2xl">Listo para vender</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${item.ok ? "bg-[#1f6b4a] text-white" : "bg-[#e4d9c8]"}`}>{item.ok ? "✓" : ""}</span>
                {item.label}
              </li>
            ))}
          </ul>
          <a href={`/s/${project.slug}`} className="mt-4 inline-block text-sm text-[#9a6240] underline" target="_blank" rel="noreferrer">
            Abrir el showroom
          </a>
        </section>
        <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
          <h2 className="font-serif text-2xl">Equipo</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.team.map((person) => (
              <li key={person.id} className="flex justify-between gap-3">
                <span>{person.nombre}<br /><span className="text-xs text-[#6b6258]">{person.email}</span></span>
                <span className="text-[#6b6258]">{ROLE_LABEL[person.role]}</span>
              </li>
            ))}
          </ul>
          {can(actor, "invite_users") && (
            <form
              className="mt-4 space-y-2 border-t border-[#e4d9c8] pt-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await mutate({ op: "invite", projectId: project.id, ...invite });
                const temp = result && typeof result.tempPassword === "string" ? result.tempPassword : "";
                setPassword(temp);
                if (temp) setInvite({ nombre: "", email: "", role: "seller" });
              }}
            >
              <p className="text-sm font-medium">Invitar</p>
              <input value={invite.nombre} onChange={(e) => setInvite({ ...invite, nombre: e.target.value })} placeholder="Nombre" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" required />
              <input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} type="email" placeholder="Email" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" required />
              <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
                <option value="seller">Vendedor</option>
                <option value="viewer">Solo lectura</option>
                <option value="org_admin">Admin desarrolladora</option>
              </select>
              <button className="rounded-full bg-[#c4a574] px-4 py-2 text-sm">Crear usuario</button>
              {password && <p className="text-sm">Contraseña temporal: <strong>{password}</strong></p>}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
