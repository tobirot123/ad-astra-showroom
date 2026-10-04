"use client";

import { useEffect, useRef, useState } from "react";
import { PoiMap } from "@/components/maps/poi-map";
import { showQuote } from "@/lib/domain/finance";
import { STATUS_COLOR, STATUS_LABEL, formatM2, formatNumber, formatUsd } from "@/lib/domain/format";
import { poiLabel } from "@/lib/domain/poi";
import { tourEmbed } from "@/lib/domain/showroom-flow";
import type { ShowroomData } from "@/lib/services/present";

type Unit = ShowroomData["units"][number];
type Tab = "galeria" | "vistas" | "planta3d" | "planos" | "recorrido" | "video";
type Tour = NonNullable<Unit["tour"]>;

export function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M1 1h6v6H1V1zm1.4 1.4v3.2h3.2V2.4H2.4zM9 1h6v6H9V1zm1.4 1.4v3.2h3.2V2.4h-3.2zM1 9h6v6H1V9zm1.4 1.4v3.2h3.2v-3.2H2.4zM9 9h2v2H9V9zm4 0h2v2h-2V9zM9 13h2v2H9v-2zm4 0h2v2h-2v-2z" />
    </svg>
  );
}

export function FullIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.4" d="M5 1.5H1.5V5M10 1.5h3.5V5M5 13.5H1.5V10M10 13.5h3.5V10" />
    </svg>
  );
}

function statusTone(estado: string) {
  if (estado === "disponible") return { color: "#1f8a5b", label: "Disponible" };
  if (estado === "reservada") return { color: "#c49214", label: "Reservada" };
  if (estado === "vendida") return { color: "#b42318", label: "Vendida" };
  return { color: STATUS_COLOR[estado] ?? "#667085", label: STATUS_LABEL[estado] ?? estado };
}

export function HoverCard({
  unit,
  x,
  y,
  onEnter,
  onTour,
  onKeep,
  onLeave,
}: {
  unit: Unit;
  x: number;
  y: number;
  onEnter: () => void;
  onTour: () => void;
  onKeep: () => void;
  onLeave: () => void;
}) {
  const tone = statusTone(unit.estado);
  const price = unit.mostrar_precio && unit.precio != null ? formatUsd(unit.precio) : "Consultar precio";
  return (
    <div className="hover-card" data-testid="hover-card" style={{ left: x, top: y, transform: "translate(-50%, calc(-100% - 14px))" }} onMouseEnter={onKeep} onMouseLeave={onLeave}>
      <p className="status-line" style={{ color: tone.color }}>{tone.label.toUpperCase()} <i /></p>
      <p className="mt-1 text-center text-3xl font-semibold tracking-wide">{unit.codigo}</p>
      <div className="mt-3 flex items-center justify-center gap-4 text-[13px] text-[#8a7358]">
        <span>▦ {unit.m2_totales != null ? `${formatM2(unit.m2_totales)} m²` : "—"}</span>
        <span>⌂ {unit.dormitorios ?? "—"}</span>
        <span>◈ {unit.banos ?? "—"}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" className="outline-pill flex-1" onClick={onEnter}>{price}</button>
        {unit.tour && <button type="button" className="outline-pill flex-1" onClick={onTour}>Tour 360°</button>}
      </div>
      <button type="button" className="enter-btn mt-3" onClick={onEnter}>Ingresar</button>
    </div>
  );
}

const MENU = [
  ["intro", "Intro"],
  ["edificio", "El edificio"],
  ["plantas", "Plantas"],
  ["disponibilidad", "Disponibilidad"],
  ["amenities", "Amenities"],
  ["recorridos", "Recorridos 360"],
  ["video", "Video"],
  ["brochure", "Brochure"],
  ["mapa", "Ubicación"],
  ["contacto", "Contacto"],
] as const;

export function PhMenu({
  lite,
  brochure,
  redes,
  whatsapp,
  brand,
  logo,
  onClose,
  onPick,
}: {
  lite: boolean;
  brochure: boolean;
  redes: Record<string, string>;
  whatsapp: string;
  brand: string;
  logo: string | null;
  onClose: () => void;
  onPick: (action: string) => void;
}) {
  return (
    <>
      <button type="button" className="scrim" aria-label="Cerrar menú" onClick={onClose} />
      <aside className="drawer-ph" data-testid="drawer-menu">
        <div className="flex items-start justify-between px-6 pt-6">
          <div>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="mb-2 h-10 w-auto" />
            )}
            <p className="text-2xl tracking-[0.18em]">{brand}</p>
          </div>
          <button type="button" aria-label="Cerrar" className="text-xl" onClick={onClose}>×</button>
        </div>
        <nav className="mt-6 px-6">
          {MENU.map(([action, label]) => (
            <button key={action} type="button" className="row" disabled={action === "brochure" && !brochure} onClick={() => onPick(action)}>
              <MenuGlyph name={action} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-8 flex items-center gap-3 px-6 text-sm">
          {Object.entries(redes).map(([red, url]) => (
            <a key={red} href={url} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full border border-[#ece7e1]">{red.slice(0, 1).toUpperCase()}</a>
          ))}
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full border border-[#ece7e1]">W</a>
          )}
        </div>
        <button type="button" className="mt-6 px-6 pb-8 text-left text-sm text-[#8a8178]" onClick={() => onPick("lite")}>{lite ? "Ver con videos" : "Solo imágenes"}</button>
      </aside>
    </>
  );
}

function MenuGlyph({ name }: { name: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.3 };
  if (name === "intro") return <svg {...common}><path d="M3 12.5V3.5h10v9" /><path d="M2 12.5h12" /></svg>;
  if (name === "edificio") return <svg {...common}><path d="M4 13V3h5v10M9 7h3v6" /></svg>;
  if (name === "plantas") return <svg {...common}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></svg>;
  if (name === "disponibilidad") return <svg {...common}><circle cx="8" cy="8" r="3" /></svg>;
  if (name === "amenities") return <svg {...common}><path d="M8 2.5l1.4 3.2H13l-2.6 2 1 3.3L8 9.8 4.6 11l1-3.3L3 5.7h3.6z" /></svg>;
  if (name === "recorridos") return <svg {...common}><circle cx="8" cy="8" r="5" /><path d="M8 5.5v3l2 1.2" /></svg>;
  if (name === "video") return <svg {...common}><circle cx="8" cy="8" r="5" /><path d="M7 6.2v3.6l3-1.8z" fill="currentColor" stroke="none" /></svg>;
  if (name === "brochure") return <svg {...common}><path d="M4 2.5h6l2.5 2.5V13.5H4z" /></svg>;
  if (name === "mapa") return <svg {...common}><path d="M8 13s4-3.2 4-6.2A4 4 0 0 0 4 6.8C4 9.8 8 13 8 13z" /><circle cx="8" cy="6.7" r="1.2" /></svg>;
  return <svg {...common}><path d="M3 4.5h10v7H3z" /><path d="M3 6.5l5 3 5-3" /></svg>;
}

export function GalleryStage({ images, title, onClose }: { images: { id: string; nombre: string; url: string }[]; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  return (
    <section className="full-stage">
      <StageBar title={title} onClose={onClose} />
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.url} alt={current.nombre} className="h-full w-full object-contain" />
      )}
      <Arrows index={index} total={images.length} onChange={setIndex} />
      {current && <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1 text-sm">{current.nombre}</p>}
    </section>
  );
}

export function AmenityStage({ amenities, onClose }: { amenities: ShowroomData["amenities"]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const current = amenities[index];
  return (
    <section className="full-stage">
      <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-3">
        <button type="button" className="round" onClick={onClose} aria-label="Cerrar">×</button>
        <select value={index} onChange={(event) => setIndex(Number(event.target.value))} className="rounded-full bg-white px-3 py-2 text-sm text-[#1c1915]">
          {amenities.map((item, itemIndex) => <option key={item.id} value={itemIndex}>{item.nombre}</option>)}
        </select>
      </div>
      {current?.imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.imagen} alt="" className="h-full w-full object-cover" />
      )}
      <p className="absolute bottom-8 left-8 text-3xl">{current?.nombre}</p>
      <Arrows index={index} total={amenities.length} onChange={setIndex} />
      {!amenities.length && <p className="grid h-full place-items-center">Este proyecto todavía no cargó amenities.</p>}
    </section>
  );
}

export function MapStage({ project, pois, onClose }: { project: ShowroomData["project"]; pois: ShowroomData["pois"]; onClose: () => void }) {
  const [active, setActive] = useState<string | null>(null);
  const [cat, setCat] = useState("todas");
  const categories = Array.from(new Set(pois.map((poi) => poi.categoria)));
  const shown = cat === "todas" ? pois : pois.filter((poi) => poi.categoria === cat);
  const selected = pois.find((poi) => poi.id === active) ?? null;
  return (
    <section className="full-stage bg-[#f4f1ea]">
      <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2">
        <button type="button" className="round" onClick={onClose} aria-label="Cerrar">×</button>
        <span className="rounded-full bg-white px-3 py-2 text-sm text-[#1c1915]">{project.nombre}</span>
        <button type="button" className={cat === "todas" ? "pill on" : "pill"} onClick={() => setCat("todas")}>Todo</button>
        {categories.map((item) => (
          <button key={item} type="button" className={cat === item ? "pill on" : "pill"} onClick={() => setCat(item)}>{poiLabel(item)}</button>
        ))}
      </div>
      {project.lat != null && project.lng != null && (
        <PoiMap lat={project.lat} lng={project.lng} nombre={project.nombre} pois={shown} selectedId={active} onSelect={setActive} className="absolute inset-0" />
      )}
      {selected && (
        <div className="absolute bottom-6 left-1/2 z-10 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl bg-white p-4 text-[#1c1915] shadow-xl">
          <p className="text-lg">{selected.nombre}</p>
          <p className="text-sm text-[#6b6258]">{poiLabel(selected.categoria)}{selected.distancia_m != null ? ` · ${selected.distancia_m} m` : ""}</p>
        </div>
      )}
    </section>
  );
}

export function RecorridoStage({ options, onClose }: { options: { nombre: string; tour: Tour }[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const current = options[index];
  return (
    <section className="full-stage">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <button type="button" className="round" onClick={onClose} aria-label="Cerrar">×</button>
        {options.length > 0 && (
          <select value={index} onChange={(event) => setIndex(Number(event.target.value))} className="rounded-full bg-white px-3 py-2 text-sm text-[#1c1915]">
            {options.map((item, itemIndex) => <option key={item.nombre} value={itemIndex}>{item.nombre}</option>)}
          </select>
        )}
      </div>
      {current ? <Panorama tour={current.tour} /> : <p className="grid h-full place-items-center px-6 text-center">Este proyecto todavía no tiene recorridos 360.</p>}
    </section>
  );
}

export function VideoStage({ src, title, onClose }: { src: string | null; title: string; onClose: () => void }) {
  return (
    <section className="full-stage">
      <StageBar title={title} onClose={onClose} />
      {src ? <video src={src} controls autoPlay className="h-full w-full object-contain" /> : <p className="grid h-full place-items-center">Este proyecto todavía no tiene video.</p>}
    </section>
  );
}

export function ContactStage({
  project,
  organization,
  onWhatsapp,
  onClose,
}: {
  project: ShowroomData["project"];
  organization: ShowroomData["organization"];
  onWhatsapp: () => void;
  onClose: () => void;
}) {
  return (
    <section className="full-stage overflow-auto bg-white text-[#1c1915]">
      <div className="mx-auto max-w-lg px-6 py-8">
        <button type="button" className="round" onClick={onClose} aria-label="Cerrar">×</button>
        <h2 className="mt-6 text-3xl">{project.nombre}</h2>
        <p className="mt-3 text-sm leading-6">{project.descripcion}</p>
        <p className="mt-3 text-sm">{project.direccion}</p>
        <p className="mt-6 text-xl">{organization.nombre}</p>
        <p className="text-sm text-[#6b6258]">{organization.descripcion}</p>
        <p className="mt-4">{project.contacto.telefono}</p>
        <p>{project.contacto.email}</p>
        <button type="button" className="enter-btn mt-6" onClick={onWhatsapp}>WhatsApp</button>
      </div>
    </section>
  );
}

function StageBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
      <button type="button" className="round" onClick={onClose} aria-label="Cerrar">×</button>
      <span className="rounded-full bg-black/45 px-3 py-1 text-sm">{title}</span>
    </div>
  );
}

function Arrows({ index, total, onChange }: { index: number; total: number; onChange: (index: number) => void }) {
  if (total < 2) return null;
  return (
    <>
      <button type="button" aria-label="Anterior" className="round absolute left-4 top-1/2 z-10 -translate-y-1/2" onClick={() => onChange((index - 1 + total) % total)}>‹</button>
      <button type="button" aria-label="Siguiente" className="round absolute right-4 top-1/2 z-10 -translate-y-1/2" onClick={() => onChange((index + 1) % total)}>›</button>
    </>
  );
}

function Panorama({ tour }: { tour: Tour }) {
  const [help, setHelp] = useState(true);
  const [shift, setShift] = useState(0);
  const drag = useRef<{ x: number; shift: number } | null>(null);
  const kind = tourEmbed(tour.proveedor, tour.url);
  if (kind === "iframe") {
    return (
      <div className="relative h-full w-full" onPointerDown={() => setHelp(false)}>
        <iframe title={tour.titulo} src={tour.url} className="h-full w-full border-0" allow="fullscreen; xr-spatial-tracking" />
        {help && <HelpOverlay />}
      </div>
    );
  }
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      onPointerDown={(event) => { setHelp(false); drag.current = { x: event.clientX, shift }; }}
      onPointerMove={(event) => { if (!drag.current) return; setShift(drag.current.shift + event.clientX - drag.current.x); }}
      onPointerUp={() => { drag.current = null; }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tour.url} alt={tour.titulo} className="h-full max-w-none object-cover" style={{ width: "160%", transform: `translateX(${shift}px)` }} draggable={false} />
      {help && <HelpOverlay />}
    </div>
  );
}

function HelpOverlay() {
  return (
    <div className="tour-help">
      <span>SEÑALAR<br />Y MOVER</span>
      <span>GIRAR<br />LA VISTA</span>
      <span>CAMBIAR<br />EL ZOOM</span>
      <span>PASO<br />CORTO</span>
    </div>
  );
}

function ready(unit: Unit, tab: Tab, planta: string | null) {
  if (tab === "galeria") return unit.galeria.length > 0;
  if (tab === "vistas") return Boolean(unit.vista_url);
  if (tab === "planta3d") return Boolean(unit.planta3d);
  if (tab === "planos") return Boolean(unit.plano || planta);
  if (tab === "recorrido") return Boolean(unit.tour);
  return unit.videos.length > 0;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "galeria", label: "Galería" },
  { id: "vistas", label: "Vistas" },
  { id: "planta3d", label: "Planta 3D" },
  { id: "planos", label: "Planos" },
  { id: "recorrido", label: "Recorrido" },
  { id: "video", label: "Video" },
];

function moneyLabel(value: number, moneda: "USD" | "ARS") {
  if (moneda === "USD") return formatUsd(value);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

export function UnitSheet({
  unit,
  tab,
  setTab,
  project,
  plans,
  fallback,
  plantaImagen,
  footprint,
  sent,
  sending,
  error,
  photo,
  setPhoto,
  onClose,
  onChangeFloor,
  onWhatsapp,
  onShare,
  onLead,
}: {
  unit: Unit;
  tab: Tab;
  setTab: (tab: Tab) => void;
  project: ShowroomData["project"];
  plans: ShowroomData["plans"];
  fallback: string;
  plantaImagen: string | null;
  footprint: [number, number][] | null;
  sent: boolean;
  sending: boolean;
  error: string;
  photo: number;
  setPhoto: (index: number) => void;
  onClose: () => void;
  onChangeFloor: () => void;
  onWhatsapp: () => void;
  onShare: () => void;
  onLead: (form: FormData) => void;
}) {
  const ficha = project.ficha;
  const [ask, setAsk] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [buyer, setBuyer] = useState("");
  const [mail, setMail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setPlanId(plans[0]?.id ?? "");
    setNote("");
    setAsk(false);
    setQuoteOpen(false);
  }, [unit.id, plans]);
  useEffect(() => {
    if (ready(unit, tab, plantaImagen)) return;
    const next = TABS.find((item) => ready(unit, item.id, plantaImagen));
    if (next && next.id !== tab) setTab(next.id);
  }, [unit, tab, plantaImagen, setTab]);
  const plan = plans.find((item) => item.id === planId) ?? plans[0];
  const shown = ficha.precio && unit.precio != null && plan ? showQuote(unit.precio, plan, project.usdArs, project.cac) : null;
  const tone = statusTone(unit.estado);
  const hero = unit.galeria[0] ?? unit.planta3d ?? unit.vista_url ?? unit.plano ?? fallback;
  const blocked = unit.estado === "vendida" || unit.estado === "reservada" || unit.estado === "pausa" || unit.estado === "bloqueada";
  const balcon = unit.m2_totales != null && unit.m2_cubiertos != null ? Math.max(0, unit.m2_totales - unit.m2_cubiertos) : null;
  const gallery = unit.galeria.length ? unit.galeria : unit.renders.filter((url) => url !== unit.planta3d);
  const currentPhoto = gallery[photo] ?? gallery[0];

  async function downloadQuote() {
    if (!plan) return;
    if (!buyer.trim()) { setNote("Escribí un nombre para la cotización."); return; }
    setBusy(true);
    setNote("");
    const response = await fetch("/api/public/cotizacion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: project.slug, codigo: unit.codigo, planId: plan.id, nombre: buyer, email: mail }),
    });
    setBusy(false);
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      setNote(typeof json.error === "string" ? json.error : "No pudimos armar la cotización.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cotizacion-${unit.codigo}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    setNote("Descargamos el PDF.");
  }

  return (
    <section className="unit-sheet" data-testid="unit-panel">
      <aside className="unit-side">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero} alt="" className="h-36 w-full object-cover" />
          <button type="button" aria-label="Compartir unidad" className="round absolute right-3 top-3" onClick={onShare}><QrIcon /></button>
          <button type="button" aria-label="Cerrar ficha" className="absolute left-3 top-3 text-sm text-white" onClick={onClose}>Cerrar</button>
        </div>
        <div className="body">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-3xl font-semibold">{unit.codigo}</h2>
              {unit.tipologia && <p className="text-sm text-[#8a8178]">Modelo {unit.tipologia}</p>}
            </div>
            <p className="status-line" style={{ color: tone.color }}>{tone.label.toUpperCase()} <i /></p>
          </div>
          {blocked && <p className="mt-2 text-sm text-[#8a8178]">Esta unidad no está disponible</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((item) => (
              <button key={item.id} type="button" className={tab === item.id ? "icon-tab on" : "icon-tab"} disabled={!ready(unit, item.id, plantaImagen)} onClick={() => setTab(item.id)} aria-label={item.label} title={item.label}>
                <TabGlyph name={item.id} />
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#8a8178]">Características</p>
          <div className="mt-1">
            {unit.m2_totales != null && <p className="spec">▦ Área total {formatM2(unit.m2_totales)} m²</p>}
            {unit.m2_cubiertos != null && <p className="spec">▢ Cubierta {formatM2(unit.m2_cubiertos)} m²</p>}
            {balcon != null && balcon > 0 && <p className="spec">▤ Balcón {formatM2(balcon)} m²</p>}
            {unit.dormitorios != null && <p className="spec">⌂ {unit.dormitorios} dormitorios</p>}
            {unit.banos != null && <p className="spec">◈ {unit.banos} baños</p>}
            {unit.orientacion && <p className="spec">◎ Orientación {unit.orientacion}</p>}
            {unit.piso && <p className="spec">☰ {unit.piso}</p>}
            {ficha.precio && unit.mostrar_precio && unit.precio != null && <p className="spec">{formatUsd(unit.precio)}</p>}
            {unit.custom.map((field) => (
              <p key={field.clave} className="spec">{field.nombre}: {typeof field.value === "boolean" ? (field.value ? "sí" : "no") : typeof field.value === "number" ? `${formatNumber(field.value)}${field.unidad ? ` ${field.unidad}` : ""}` : String(field.value)}</p>
            ))}
          </div>
          {ask && !sent && (
            <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); onLead(new FormData(event.currentTarget)); }}>
              <input name="nombre" required placeholder="Nombre" className="field" />
              <input name="email" type="email" placeholder="Email" className="field" />
              <input name="telefono" placeholder="Teléfono" className="field" />
              <textarea name="mensaje" rows={2} placeholder={`Hola, quiero saber más de ${unit.codigo}`} className="field" />
              {error && <p className="text-sm text-[#b42318]">{error}</p>}
              <button disabled={sending} className="enter-btn">{sending ? "Enviando…" : "Enviar"}</button>
            </form>
          )}
          {sent && <p className="mt-3 text-sm text-[#1f6b4a]">Recibimos tu consulta por {unit.codigo}.</p>}
          {quoteOpen && shown && plan && (
            <div className="mt-3 space-y-2" data-testid="cotizador">
              <label className="block text-sm">Esquema de pago
                <select value={plan.id} onChange={(event) => setPlanId(event.target.value)} className="field mt-1">
                  {plans.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                </select>
              </label>
              <div className="quote-grid text-sm">
                <div><p className="text-[#6b6258]">Anticipo</p><p>{moneyLabel(shown.anticipo, shown.moneda)}</p></div>
                <div><p className="text-[#6b6258]">{plan.cuotas} cuotas</p><p>{moneyLabel(shown.cuota, shown.moneda)}</p></div>
                <div><p className="text-[#6b6258]">Última cuota</p><p>{moneyLabel(shown.ultima, shown.moneda)}</p></div>
                <div><p className="text-[#6b6258]">Saldo a posesión</p><p>{moneyLabel(shown.saldo, shown.moneda)}</p></div>
              </div>
              <input value={buyer} onChange={(event) => setBuyer(event.target.value)} placeholder="Nombre" className="field" />
              <input value={mail} onChange={(event) => setMail(event.target.value)} type="email" placeholder="Email" className="field" />
              <button type="button" disabled={busy} className="enter-btn" onClick={() => void downloadQuote()}>{busy ? "Armando…" : "Descargar PDF"}</button>
              {note && <p className="text-xs text-[#6b6258]">{note}</p>}
            </div>
          )}
        </div>
        <div className="dock">
          <button type="button" className="text-sm font-medium" onClick={() => setAsk((open) => !open)}>Solicitar información</button>
          <a className="round light" style={{ height: "2.1rem", width: "2.1rem" }} href={`mailto:${project.contacto.email}`} aria-label="Email">@</a>
          <a className="round light" style={{ height: "2.1rem", width: "2.1rem" }} href={`tel:${project.contacto.telefono}`} aria-label="Teléfono">☎</a>
          {ficha.whatsapp && <button type="button" className="round light" style={{ height: "2.1rem", width: "2.1rem" }} onClick={onWhatsapp} aria-label="WhatsApp">W</button>}
          {shown && <button type="button" className="outline-pill" onClick={() => setQuoteOpen((open) => !open)}>Cotizar</button>}
          {ficha.pdf && <a className="outline-pill" href={`/api/public/ficha?slug=${project.slug}&codigo=${encodeURIComponent(unit.codigo)}`} target="_blank" rel="noreferrer">PDF</a>}
        </div>
      </aside>
      <div className="unit-main">
        {tab === "galeria" && currentPhoto && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentPhoto} alt="" className="fit" />
            <Arrows index={photo} total={gallery.length} onChange={setPhoto} />
          </>
        )}
        {tab === "vistas" && unit.vista_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={unit.vista_url} alt={unit.orientacion ? `Vista al ${unit.orientacion}` : "Vista"} className="fit" style={{ objectFit: "cover", objectPosition: unit.vista_encuadre }} />
        )}
        {tab === "planta3d" && unit.planta3d && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={unit.planta3d} alt={`Planta 3D de ${unit.codigo}`} className="fit" />
        )}
        {tab === "planos" && (
          unit.plano ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={unit.plano} alt={`Plano de ${unit.codigo}`} className="fit" />
          ) : plantaImagen ? (
            <FloorHighlight src={plantaImagen} points={footprint} codigo={unit.codigo} />
          ) : (
            <p className="grid h-full place-items-center text-[#6b6258]">Esta unidad no tiene un plano cargado.</p>
          )
        )}
        {tab === "recorrido" && unit.tour && <Panorama tour={unit.tour} />}
        {tab === "video" && unit.videos[0] && <video src={unit.videos[0]} controls className="fit" />}
        <button type="button" className="pill absolute right-4 top-4" onClick={onChangeFloor}>Cambiar planta</button>
        {plantaImagen && (
          <button type="button" className="loc-thumb" onClick={() => setTab("planos")}>
            <FloorHighlight src={plantaImagen} points={footprint} codigo={unit.codigo} compact />
            <span className="block px-2 py-1 text-center text-[10px] text-[#6b6258]">Ubicación en planta</span>
          </button>
        )}
      </div>
    </section>
  );
}

function FloorHighlight({ src, points, codigo, compact = false }: { src: string; points: [number, number][] | null; codigo: string; compact?: boolean }) {
  return (
    <div className={compact ? "relative h-16" : "relative h-full w-full"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={compact ? "" : `Planta con ${codigo}`} className={compact ? "h-full w-full object-cover" : "fit"} />
      {points && (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polygon points={points.map((point) => point.join(",")).join(" ")} fill="#c4a574" fillOpacity={compact ? 0.85 : 0.35} />
        </svg>
      )}
    </div>
  );
}

function TabGlyph({ name }: { name: Tab }) {
  const common = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.3 };
  if (name === "galeria") return <svg {...common}><rect x="2" y="3" width="12" height="10" rx="1" /><path d="M2 10l3-3 2 2 3-4 4 5" /></svg>;
  if (name === "vistas") return <svg {...common}><circle cx="8" cy="8" r="2" /><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" /></svg>;
  if (name === "planta3d") return <svg {...common}><path d="M8 2l5 3v6l-5 3-5-3V5z" /></svg>;
  if (name === "planos") return <svg {...common}><rect x="3" y="2.5" width="10" height="11" /><path d="M3 6h10M7 6v7.5" /></svg>;
  if (name === "recorrido") return <svg {...common}><circle cx="8" cy="8" r="5" /><path d="M8 5.5v3l2 1" /></svg>;
  return <svg {...common}><circle cx="8" cy="8" r="5" /><path d="M7 6.2v3.6l3-1.8z" fill="currentColor" stroke="none" /></svg>;
}
