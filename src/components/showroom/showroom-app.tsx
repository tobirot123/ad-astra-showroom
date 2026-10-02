"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { STATUS_COLOR, STATUS_LABEL, formatM2, formatUsd } from "@/lib/domain/format";
import type { ShowroomData } from "@/lib/services/present";

type Unit = ShowroomData["units"][number];

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get("utm_source") || undefined,
    utm_medium: params.get("utm_medium") || undefined,
    utm_campaign: params.get("utm_campaign") || undefined,
    utm_content: params.get("utm_content") || undefined,
    utm_term: params.get("utm_term") || undefined,
    fbclid: params.get("fbclid") || undefined,
    gclid: params.get("gclid") || undefined,
    referrer: document.referrer || undefined,
  };
  const stored = sessionStorage.getItem("adastra-utm");
  if (!utm.utm_source && !utm.fbclid && !utm.gclid && stored) return JSON.parse(stored);
  if (utm.utm_source || utm.fbclid || utm.gclid || utm.referrer) sessionStorage.setItem("adastra-utm", JSON.stringify(utm));
  return utm;
}

function identity() {
  let visitor = localStorage.getItem("adastra-visitor");
  if (!visitor) {
    visitor = crypto.randomUUID();
    localStorage.setItem("adastra-visitor", visitor);
  }
  const raw = sessionStorage.getItem("adastra-session");
  const parsed = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
  const fresh = !parsed || Date.now() - parsed.at > 30 * 60 * 1000;
  const session = fresh ? crypto.randomUUID() : parsed!.id;
  sessionStorage.setItem("adastra-session", JSON.stringify({ id: session, at: Date.now() }));
  return { visitor, session, fresh };
}

export function ShowroomApp({ data }: { data: ShowroomData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [estado, setEstado] = useState("todos");
  const [ambientes, setAmbientes] = useState("todos");
  const [orientacion, setOrientacion] = useState("todas");
  const [precioMax, setPrecioMax] = useState("");
  const [cochera, setCochera] = useState("todas");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const { visitor, session, fresh } = identity();
    const utm = readUtm();
    const send = (nombre: string, unitId?: string | null) => {
      const payload = JSON.stringify({
        slug: data.project.slug,
        nombre,
        visitorId: visitor,
        sessionId: session,
        unitId: unitId ?? null,
        utm,
        width: window.innerWidth,
      });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      else void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
    };
    if (fresh) send("session_start");
    send("page_view");
  }, [data.project.slug]);

  const filtered = useMemo(() => {
    return data.units.filter((unit) => {
      if (estado !== "todos" && unit.estado !== estado) return false;
      if (ambientes !== "todos" && String(unit.ambientes) !== ambientes) return false;
      if (orientacion !== "todas" && unit.orientacion !== orientacion) return false;
      if (precioMax && unit.precio != null && unit.precio > Number(precioMax)) return false;
      if (cochera !== "todas" && unit.values.tipo_cochera !== cochera) return false;
      return true;
    });
  }, [data.units, estado, ambientes, orientacion, precioMax, cochera]);

  const active = data.units.find((unit) => unit.id === selected) ?? null;

  function choose(unit: Unit, origen: string) {
    setSelected(unit.id);
    setSent(false);
    const { visitor, session } = identity();
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: data.project.slug,
        nombre: "unit_view",
        visitorId: visitor,
        sessionId: session,
        unitId: unit.id,
        utm: readUtm(),
        width: window.innerWidth,
        props: { origen },
      }),
    });
  }

  async function submitLead(form: FormData) {
    setSending(true);
    setError("");
    const { visitor, session } = identity();
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: data.project.slug,
        unitId: active?.id,
        nombre: form.get("nombre"),
        email: form.get("email"),
        telefono: form.get("telefono"),
        mensaje: form.get("mensaje"),
        canal: "form",
        utm: readUtm(),
        visitorId: visitor,
        sessionId: session,
      }),
    });
    const json = await response.json();
    setSending(false);
    if (!response.ok) {
      setError(json.error ?? "No pudimos enviar la consulta.");
      return;
    }
    setSent(true);
  }

  const whatsapp = data.project.contacto.whatsapp;
  const waText = encodeURIComponent(
    `Hola, me interesa ${active ? `la unidad ${active.codigo}` : data.project.nombre}.`,
  );

  return (
    <main className="min-h-screen bg-[#12110f] text-[#f6f1e8]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#c4a574]">Ad Astra</p>
          <p className="font-serif text-2xl">{data.project.nombre}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a href={`https://wa.me/${whatsapp}?text=${waText}`} className="rounded-full border border-white/20 px-3 py-2">
            WhatsApp
          </a>
          <Link href="/admin/login" className="text-[#c4a574]">
            Panel
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section>
          <p className="max-w-xl text-sm text-[#d9cbb8]">{data.project.descripcion}</p>
          <p className="mt-1 text-sm text-[#b7aa98]">{data.project.direccion}</p>
          <div className="relative mt-4 overflow-hidden rounded-3xl bg-[#efe6d8]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.facade} alt={`Fachada de ${data.project.nombre}`} className="block h-auto w-full" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              {filtered.map((unit) =>
                unit.polygon ? (
                  <polygon
                    key={unit.id}
                    points={unit.polygon.map((point) => point.join(",")).join(" ")}
                    fill={STATUS_COLOR[unit.estado] ?? "#1f8a5b"}
                    fillOpacity={selected === unit.id ? 0.72 : 0.38}
                    stroke="#1c1915"
                    strokeWidth={0.004}
                    className="cursor-pointer"
                    onClick={() => choose(unit, "fachada")}
                  >
                    <title>{`${unit.codigo} · ${STATUS_LABEL[unit.estado]}`}</title>
                  </polygon>
                ) : null,
              )}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#d9cbb8]">
            {["disponible", "reservada", "vendida", "bloqueada", "consultar"].map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[key] }} />
                {STATUS_LABEL[key]}
              </span>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <select className="rounded-xl bg-white/10 px-3 py-2" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
              <option value="todos">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="reservada">Reservada</option>
              <option value="vendida">Vendida</option>
              <option value="bloqueada">Bloqueada</option>
              <option value="consultar">Consultar</option>
            </select>
            <select className="rounded-xl bg-white/10 px-3 py-2" value={ambientes} onChange={(e) => setAmbientes(e.target.value)} aria-label="Ambientes">
              <option value="todos">Ambientes</option>
              {data.filters.ambientes.map((n) => (
                <option key={n} value={n}>
                  {n} amb.
                </option>
              ))}
            </select>
            <select className="rounded-xl bg-white/10 px-3 py-2" value={orientacion} onChange={(e) => setOrientacion(e.target.value)} aria-label="Orientación">
              <option value="todas">Orientación</option>
              {data.filters.orientaciones.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select className="rounded-xl bg-white/10 px-3 py-2" value={cochera} onChange={(e) => setCochera(e.target.value)} aria-label="Cochera">
              <option value="todas">Cochera</option>
              <option value="simple">Simple</option>
              <option value="doble">Doble</option>
              <option value="ninguna">Sin cochera</option>
            </select>
          </div>
          <label className="mt-2 block text-sm text-[#d9cbb8]">
            Precio máximo USD
            <input
              inputMode="numeric"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-[#f6f1e8]"
              placeholder="180000"
            />
          </label>

          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((unit) => (
              <li key={unit.id}>
                <button
                  type="button"
                  onClick={() => choose(unit, "lista")}
                  className={`w-full rounded-2xl border px-3 py-3 text-left ${selected === unit.id ? "border-[#c4a574] bg-white/10" : "border-white/10"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-serif text-lg">{unit.codigo}</span>
                    <i className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[unit.estado] }} />
                  </span>
                  <span className="mt-1 block text-xs text-[#d9cbb8]">
                    {unit.tipologia} · {unit.m2_totales ? `${formatM2(unit.m2_totales)} m²` : ""}
                  </span>
                  <span className="mt-1 block text-sm">{unit.precio != null && unit.mostrar_precio ? formatUsd(unit.precio) : "Consultar"}</span>
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length && <p className="mt-4 text-sm text-[#d9cbb8]">Ninguna unidad coincide con esos filtros.</p>}
        </section>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          {!active && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="font-serif text-3xl">Elegí una unidad</h2>
              <p className="mt-2 text-sm text-[#d9cbb8]">Tocá una ventana de la fachada o una tarjeta. En el celular no hace falta girar el teléfono.</p>
            </div>
          )}
          {active && (
            <article className="rounded-3xl bg-[#f6f1e8] p-5 text-[#1c1915]">
              <p className="text-xs uppercase tracking-[0.16em] text-[#9a6240]">{active.torre} · {active.piso}</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <h2 className="font-serif text-4xl">{active.codigo}</h2>
                <span className="rounded-full px-3 py-1 text-sm text-white" style={{ background: STATUS_COLOR[active.estado] }}>
                  {STATUS_LABEL[active.estado]}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#5c5348]">{active.descripcion}</p>
              <p className="mt-4 font-serif text-3xl">
                {active.precio != null && active.mostrar_precio ? formatUsd(active.precio) : "Consultar"}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-[#6b6258]">Cubiertos</dt><dd>{active.m2_cubiertos != null ? `${formatM2(active.m2_cubiertos)} m²` : "—"}</dd></div>
                <div><dt className="text-[#6b6258]">Totales</dt><dd>{active.m2_totales != null ? `${formatM2(active.m2_totales)} m²` : "—"}</dd></div>
                <div><dt className="text-[#6b6258]">Ambientes</dt><dd>{active.ambientes ?? "—"}</dd></div>
                <div><dt className="text-[#6b6258]">Dormitorios</dt><dd>{active.dormitorios ?? "—"}</dd></div>
                <div><dt className="text-[#6b6258]">Baños</dt><dd>{active.banos ?? "—"}</dd></div>
                <div><dt className="text-[#6b6258]">Orientación</dt><dd>{active.orientacion ?? "—"}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {active.features.map((feature) => (
                  <span key={feature} className="rounded-full bg-[#efe6d8] px-3 py-1 text-xs">{feature}</span>
                ))}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {active.custom.map((field) => (
                  <li key={field.clave}>
                    <span className="text-[#6b6258]">{field.nombre}: </span>
                    {formatCustom(field.value, field.unidad)}
                  </li>
                ))}
              </ul>
              {active.quote && active.mostrar_precio && (
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm">
                  <p className="font-medium">{active.quote.plan}</p>
                  <p className="mt-1">Anticipo {formatUsd(active.quote.quote.anticipo)} · cuota {formatUsd(active.quote.quote.cuota)} · saldo {formatUsd(active.quote.quote.saldo)}</p>
                  <p className="mt-2 text-xs text-[#6b6258]">{active.quote.legal} {active.quote.indice}</p>
                </div>
              )}
              {active.plano && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.plano} alt={`Plano ${active.codigo}`} className="mt-4 w-full rounded-2xl border border-[#e4d9c8]" />
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {active.renders.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="w-full rounded-2xl" />
                ))}
              </div>
              <form
                className="mt-5 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitLead(new FormData(event.currentTarget));
                }}
              >
                <h3 className="font-serif text-2xl">Quiero que me contacten</h3>
                <input name="nombre" required placeholder="Nombre" className="w-full rounded-xl border border-[#e4d9c8] bg-white px-3 py-2" />
                <input name="email" type="email" placeholder="Email" className="w-full rounded-xl border border-[#e4d9c8] bg-white px-3 py-2" />
                <input name="telefono" placeholder="Celular" className="w-full rounded-xl border border-[#e4d9c8] bg-white px-3 py-2" />
                <textarea name="mensaje" placeholder="Mensaje" className="w-full rounded-xl border border-[#e4d9c8] bg-white px-3 py-2" rows={3} />
                {error && <p className="text-sm text-[#b42318]">{error}</p>}
                {sent && <p className="text-sm text-[#1f6b4a]">Listo. Recibimos tu consulta{active ? ` por la ${active.codigo}` : ""}.</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={sending || active.estado === "consultar"} className="rounded-full bg-[#1c1915] px-4 py-2 text-[#f6f1e8] disabled:opacity-50">
                    {sending ? "Enviando…" : "Enviar"}
                  </button>
                  <a
                    href={`https://wa.me/${whatsapp}?text=${waText}`}
                    className="rounded-full border border-[#1c1915] px-4 py-2"
                    onClick={() => {
                      const { visitor, session } = identity();
                      void fetch("/api/track", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          slug: data.project.slug,
                          nombre: "whatsapp_click",
                          visitorId: visitor,
                          sessionId: session,
                          unitId: active.id,
                          utm: readUtm(),
                          width: window.innerWidth,
                        }),
                      });
                    }}
                  >
                    WhatsApp
                  </a>
                </div>
                {active.estado === "consultar" && <p className="text-xs text-[#6b6258]">Esta unidad está en consulta: no se cotiza hasta que la desarrolladora confirme.</p>}
              </form>
            </article>
          )}
        </aside>
      </div>
    </main>
  );
}

function formatCustom(value: unknown, unidad: string | null): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") {
    const formatted = new Intl.NumberFormat("es-AR").format(value);
    return unidad ? `${formatted} ${unidad}` : formatted;
  }
  return String(value ?? "—");
}
