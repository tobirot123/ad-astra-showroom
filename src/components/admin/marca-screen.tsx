"use client";

import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

export function MarcaScreen() {
  const { data, mutate } = useAdmin();
  if (!data?.project) return null;
  const project = data.project;
  const edit = can(data.actor, "edit_project");
  const s = project.settings;

  return (
    <form
      className="max-w-2xl space-y-3 rounded-3xl border border-[#e4d9c8] bg-white p-5 text-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!edit) return;
        const form = new FormData(event.currentTarget);
        const pasos = String(form.get("pasos") ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        void mutate({
          op: "update_project",
          projectId: project.id,
          patch: {
            dominio: String(form.get("dominio") ?? ""),
            settings: {
              titulo_publico: String(form.get("titulo") ?? ""),
              logo_url: String(form.get("logo") ?? ""),
              color_acento: String(form.get("color") ?? "#c4a574"),
              brochure_url: String(form.get("brochure") ?? ""),
              texto_legal: String(form.get("legal") ?? ""),
              aviso_cookies: String(form.get("cookies") ?? ""),
              pasos,
              ga4_id: String(form.get("ga4") ?? "").trim(),
              gtm_id: String(form.get("gtm") ?? "").trim(),
              pixel_id: String(form.get("pixel") ?? "").trim(),
              remarketing: form.get("remarketing") === "on",
              ficha: {
                precio: form.get("precio") === "on",
                whatsapp: form.get("whatsapp") === "on",
                compartir: form.get("compartir") === "on",
                pdf: form.get("pdf") === "on",
                ambientes: form.get("ambientes") === "on",
              },
            },
          },
        });
      }}
    >
      <h1 className="font-serif text-4xl">Marca y dominio</h1>
      <p className="text-[#6b6258]">El color, el título y el logo salen en el showroom. El dominio queda pedido: Ad Astra lo conecta en DNS. Este panel no emite el certificado.</p>
      <label className="block">Título público<input name="titulo" defaultValue={s.titulo_publico ?? project.nombre} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">Logo (URL)<input name="logo" defaultValue={s.logo_url ?? ""} placeholder="/demo/logo.webp" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">Color de acento<input name="color" type="color" defaultValue={s.color_acento ?? "#c4a574"} className="mt-1 h-10 w-24" /></label>
      <label className="block">Brochure PDF<input name="brochure" defaultValue={s.brochure_url ?? ""} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">Dominio pedido<input name="dominio" defaultValue={project.dominio ?? ""} placeholder="alba.desarrolladora.com" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">Texto legal<textarea name="legal" defaultValue={s.texto_legal ?? ""} rows={3} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">Aviso de cookies<textarea name="cookies" defaultValue={s.aviso_cookies ?? ""} rows={2} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">Pasos de la financiación, uno por línea<textarea name="pasos" defaultValue={(s.pasos ?? []).join("\n")} rows={4} className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <h2 className="pt-2 font-serif text-2xl">Medición</h2>
      <p className="text-[#6b6258]">GA4, Tag Manager y el píxel se cargan recién cuando el visitante acepta las cookies.</p>
      <label className="block">GA4<input name="ga4" defaultValue={s.ga4_id ?? ""} placeholder="G-XXXXXXXX" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">GTM<input name="gtm" defaultValue={s.gtm_id ?? ""} placeholder="GTM-XXXX" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="block">Meta Pixel<input name="pixel" defaultValue={s.pixel_id ?? ""} placeholder="1234567890" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" /></label>
      <label className="flex items-center gap-2"><input name="remarketing" type="checkbox" defaultChecked={Boolean(s.remarketing)} /> Remarketing: ViewContent al abrir una unidad</label>
      <h2 className="pt-2 font-serif text-2xl">Qué muestra la ficha</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2"><input name="precio" type="checkbox" defaultChecked={s.ficha?.precio !== false} /> Precio y cotizador</label>
        <label className="flex items-center gap-2"><input name="whatsapp" type="checkbox" defaultChecked={s.ficha?.whatsapp !== false} /> WhatsApp</label>
        <label className="flex items-center gap-2"><input name="compartir" type="checkbox" defaultChecked={s.ficha?.compartir !== false} /> Compartir</label>
        <label className="flex items-center gap-2"><input name="pdf" type="checkbox" defaultChecked={s.ficha?.pdf !== false} /> PDF</label>
        <label className="flex items-center gap-2"><input name="ambientes" type="checkbox" defaultChecked={s.ficha?.ambientes !== false} /> Ambientes</label>
      </div>
      {edit && <button className="rounded-full bg-[#1c1915] px-4 py-2 text-white">Guardar marca</button>}
    </form>
  );
}
