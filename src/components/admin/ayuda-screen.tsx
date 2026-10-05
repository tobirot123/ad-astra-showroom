"use client";

import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

const GUIDES = [
  {
    titulo: "Cambiar un render",
    cuerpo: "Reemplazá el archivo en public/demo con el mismo nombre y la misma proporción (mirá public/demo/slots.json), o subilo en Medios y elegilo en Recorrido o Zonas. Las ventanas de la fachada tienen que coincidir con los polígonos: si el render nuevo no calza, redibujá la zona.",
  },
  {
    titulo: "Dibujar una planta",
    cuerpo: "En Zonas elegí el piso, marcá las esquinas de cada unidad y guardá. El showroom pinta el polígono con el color del estado. El visitante no cambia ese estado.",
  },
  {
    titulo: "Precios y cotización",
    cuerpo: "En Comercial ajustás el anticipo, las cuotas, los refuerzos, el saldo, el dólar y el factor CAC. El visitante arma el PDF desde la ficha. La cotización queda asociada al primer vendedor activo.",
  },
  {
    titulo: "Medición",
    cuerpo: "En Marca pegás GA4, GTM y el píxel. Se cargan después de que el visitante acepta las cookies. El remarketing manda ViewContent al abrir una unidad. Tokko y el webhook siguen en Integraciones.",
  },
];

export function AyudaScreen() {
  const { data, mutate } = useAdmin();
  if (!data?.project) return null;
  const edit = can(data.actor, "edit_project");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section>
        <h1 className="font-serif text-4xl">Tutoriales</h1>
        <ul className="mt-4 space-y-3">
          {GUIDES.map((guide) => (
            <li key={guide.titulo} className="rounded-2xl border border-[#e4d9c8] bg-white p-4">
              <h2 className="font-serif text-2xl">{guide.titulo}</h2>
              <p className="mt-1 text-sm text-[#6b6258]">{guide.cuerpo}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
        <h2 className="font-serif text-3xl">Pedir una mejora</h2>
        <p className="mt-1 text-sm text-[#6b6258]">El pedido queda en el proyecto para que Ad Astra lo vea.</p>
        {edit && (
          <form
            className="mt-4 space-y-2 text-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void mutate({
                op: "request_improvement",
                projectId: data.project!.id,
                titulo: String(form.get("titulo")),
                detalle: String(form.get("detalle")),
              });
              event.currentTarget.reset();
            }}
          >
            <input name="titulo" required placeholder="Qué necesitás" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <textarea name="detalle" required rows={4} placeholder="Contanos el caso" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-white">Enviar pedido</button>
          </form>
        )}
        <ul className="mt-4 space-y-2 text-sm">
          {data.improvement_requests.map((item) => (
            <li key={item.id} className="border-t border-[#f4efe6] pt-2">
              <p className="font-medium">{item.titulo}</p>
              <p className="text-[#6b6258]">{item.detalle}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
