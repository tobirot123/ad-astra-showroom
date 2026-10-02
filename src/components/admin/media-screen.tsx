"use client";

import { useState } from "react";
import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

export function MediaScreen() {
  const { data, refresh } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  if (!data?.project) return null;
  const admin = can(data.actor, "manage_media");

  async function upload(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    setAviso("");
    const body = new FormData(form);
    body.set("projectId", data!.project!.id);
    const response = await fetch("/api/admin/media", { method: "POST", body });
    const json = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(json.error ?? "No pudimos subir el archivo.");
      return;
    }
    if (json.aviso) setAviso(json.aviso);
    form.reset();
    await refresh();
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Medios</h1>
      <p className="mt-1 text-sm text-[#6b6258]">Las fotos se convierten a WebP en 480, 960 y 1600 px. Los videos se guardan como vinieron.</p>
      {admin && (
        <form
          className="mt-4 grid gap-3 rounded-3xl border border-[#e4d9c8] bg-white p-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void upload(event.currentTarget);
          }}
        >
          <input name="file" type="file" accept="image/*,video/*,.pdf" required className="md:col-span-2 text-sm" />
          <label className="text-sm">
            Carpeta
            <select name="carpeta" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="renders">Renders</option>
              <option value="planos">Planos</option>
              <option value="fachada">Fachada</option>
              <option value="videos">Videos</option>
            </select>
          </label>
          <label className="text-sm">
            Rol
            <select name="rol" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="render">Render</option>
              <option value="plano">Plano</option>
              <option value="fachada">Fachada</option>
              <option value="portada">Portada</option>
            </select>
          </label>
          <label className="text-sm">
            Unidad
            <select name="unitId" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="">Sin unidad</option>
              {data.units.map((unit) => <option key={unit.id} value={unit.id}>{unit.codigo}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Tipología
            <select name="typologyId" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2">
              <option value="">Sin tipología</option>
              {data.typologies.map((typ) => <option key={typ.id} value={typ.id}>{typ.nombre}</option>)}
            </select>
          </label>
          <button disabled={busy} className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white md:col-span-2 disabled:opacity-60">
            {busy ? "Optimizando…" : "Subir"}
          </button>
          {error && <p className="text-sm text-[#b42318] md:col-span-2">{error}</p>}
          {aviso && <p className="text-sm text-[#9a6240] md:col-span-2">{aviso}</p>}
        </form>
      )}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.media.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-3xl border border-[#e4d9c8] bg-white">
            {item.tipo === "imagen" || item.tipo === "plano" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.variantes[0]?.url ?? item.url} alt={item.nombre} className="h-40 w-full object-cover" />
            ) : (
              <div className="grid h-40 place-items-center bg-[#1c1915] text-sm text-[#f6f1e8]">{item.tipo}</div>
            )}
            <div className="p-3 text-sm">
              <p className="font-medium">{item.nombre}</p>
              <p className="text-xs text-[#6b6258]">{item.carpeta} · {Math.round(item.peso / 1024)} KB{item.ancho ? ` · ${item.ancho}px` : ""}</p>
              {item.aviso && <p className="mt-1 text-xs text-[#9a6240]">{item.aviso}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
