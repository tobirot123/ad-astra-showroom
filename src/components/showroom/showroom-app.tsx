"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { STATUS_COLOR, STATUS_LABEL, formatM2, formatNumber, formatUsd } from "@/lib/domain/format";
import { sortUnits, tourEmbed, unitMatches, videosToLoad, type FlowFilters } from "@/lib/domain/showroom-flow";
import type { ShowroomData } from "@/lib/services/present";

type Unit = ShowroomData["units"][number];
type Overlay = ShowroomData["overlays"][number];
type Sheet = null | "menu" | "filtros" | "galeria" | "amenities" | "mapa" | "info" | "comparar" | "tour" | "compartir" | "vista" | "acabados";

const EMPTY_FILTERS: FlowFilters = {
  estado: "todos",
  ambientes: "todos",
  orientacion: "todas",
  precioMax: "",
  cochera: "todas",
  sort: "piso",
};

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

function contain(boxW: number, boxH: number, imgW: number, imgH: number) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { left: (boxW - width) / 2, top: (boxH - height) / 2, width, height };
}

function centroid(points: [number, number][]) {
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  return [x, y] as const;
}

function floorMark(nombre: string, numero: number) {
  return /baja/i.test(nombre) ? "PB" : String(numero);
}

export function ShowroomApp({ data }: { data: ShowroomData }) {
  const walk = useMemo(() => data.scenes.filter((scene) => scene.tipo !== "portada"), [data.scenes]);
  const cover = data.scenes.find((scene) => scene.tipo === "portada") ?? walk[0];
  const [entered, setEntered] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [phase, setPhase] = useState<"escena" | "planta">("escena");
  const [floorId, setFloorId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [filters, setFilters] = useState<FlowFilters>(EMPTY_FILTERS);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [lite, setLite] = useState(data.project.lite);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photo, setPhoto] = useState(0);
  const [matchCursor, setMatchCursor] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const moved = useRef(false);

  const scene = walk[sceneIndex] ?? walk[0];
  const building = data.buildings.find((item) => item.id === scene?.building_id) ?? null;
  const floor = data.buildings.flatMap((item) => item.floors).find((item) => item.id === floorId) ?? null;
  const active = data.units.find((unit) => unit.id === unitId) ?? null;
  const videos = entered && phase === "escena" ? videosToLoad(walk, sceneIndex, lite) : { current: null, next: null };

  const filtering = filters.estado !== "todos" || filters.ambientes !== "todos" || filters.orientacion !== "todas" || Boolean(filters.precioMax) || Object.values(extra).some((value) => value && value !== "todos");

  const matches = useMemo(() => {
    return sortUnits(data.units.filter((unit) => {
      if (!unitMatches(unit, filters)) return false;
      for (const field of data.filters.fields) {
        const selected = extra[field.clave];
        if (!selected || selected === "todos") continue;
        const value = unit.values[field.clave];
        if (field.tipo === "boolean") {
          if (String(Boolean(value)) !== selected) return false;
        } else if (String(value ?? "") !== selected) return false;
      }
      return true;
    }), filters.sort);
  }, [data.units, data.filters.fields, filters, extra]);

  useEffect(() => {
    const { visitor, session, fresh } = identity();
    const utm = readUtm();
    const send = (nombre: string) => {
      const payload = JSON.stringify({
        slug: data.project.slug,
        nombre,
        visitorId: visitor,
        sessionId: session,
        unitId: null,
        utm,
        width: window.innerWidth,
      });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      else void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: payload, keepalive: true });
    };
    if (fresh) send("session_start");
    send("page_view");
    const stored = sessionStorage.getItem("adastra-lite");
    if (stored === "1") setLite(true);
    if (stored === "0") setLite(false);
    const code = new URLSearchParams(window.location.search).get("unidad");
    if (code) {
      const unit = data.units.find((item) => item.codigo.toLowerCase() === code.toLowerCase());
      if (unit) {
        setEntered(true);
        openOnPlan(unit, true);
      }
    }
    // La visita se registra una vez por carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.project.slug]);

  useEffect(() => {
    if (!entered || phase !== "escena" || lite) {
      setPlaying(false);
      return;
    }
    setPlaying(Boolean(scene?.video_url));
  }, [entered, phase, sceneIndex, lite, scene?.video_url]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSheet(null);
        setUnitId(null);
      }
      if (sheet || unitId || !entered || phase !== "escena") return;
      if (event.key === "ArrowRight") setSceneIndex((index) => (index + 1) % walk.length);
      if (event.key === "ArrowLeft") setSceneIndex((index) => (index - 1 + walk.length) % walk.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, phase, sheet, unitId, walk.length]);

  function track(nombre: string, unit?: Unit | null, props?: Record<string, unknown>) {
    const { visitor, session } = identity();
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: data.project.slug,
        nombre,
        visitorId: visitor,
        sessionId: session,
        unitId: unit?.id ?? null,
        utm: readUtm(),
        width: window.innerWidth,
        props,
      }),
    });
  }

  function goBuilding(buildingId: string) {
    const index = walk.findIndex((item) => item.building_id === buildingId);
    if (index >= 0) setSceneIndex(index);
    setPhase("escena");
    setUnitId(null);
    setSheet(null);
  }

  function openFloor(nextFloorId: string) {
    setPhase("planta");
    setFloorId(nextFloorId);
    setUnitId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSheet(null);
  }

  function openOnPlan(unit: Unit, card: boolean) {
    const index = walk.findIndex((item) => item.building_id === unit.building_id && (item.tipo === "exterior" || item.tipo === "masterplan"));
    if (index >= 0) setSceneIndex(index);
    if (unit.floor_id) {
      setPhase("planta");
      setFloorId(unit.floor_id);
    } else setPhase("escena");
    setHighlightId(unit.id);
    setUnitId(card ? unit.id : null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPhoto(0);
    setSent(false);
    if (card) track("unit_view", unit, { origen: "link" });
  }

  function chooseUnit(unit: Unit, origen: string) {
    setHighlightId(unit.id);
    setUnitId(unit.id);
    setPhoto(0);
    setSent(false);
    setSheet(null);
    track("unit_view", unit, { origen });
  }

  function zones(): Overlay[] {
    if (!entered || !scene) return [];
    if (phase === "planta" && floorId) {
      return data.overlays.filter((overlay) => overlay.contenedor === "floor" && overlay.contenedor_id === floorId);
    }
    if (scene.tipo === "aereo") return scene.hotspots;
    if (scene.tipo === "masterplan") {
      return data.overlays.filter((overlay) => overlay.contenedor === "masterplan" && overlay.contenedor_id === scene.building_id);
    }
    if (scene.tipo === "exterior") {
      return data.overlays.filter((overlay) => overlay.contenedor === "facade" && overlay.contenedor_id === scene.building_id);
    }
    return [];
  }

  function onZone(overlay: Overlay) {
    if (moved.current) return;
    if (overlay.vinculo_tipo === "building" && overlay.vinculo_id) {
      goBuilding(overlay.vinculo_id);
      return;
    }
    const unit = data.units.find((item) => item.id === overlay.vinculo_id);
    if (!unit) return;
    const onPlan = phase === "planta" || scene?.tipo === "masterplan";
    if (onPlan) {
      chooseUnit(unit, phase === "planta" ? "planta" : "masterplan");
      return;
    }
    if (unit.floor_id) openFloor(unit.floor_id);
    setHighlightId(unit.id);
  }

  function matched(unitIdValue: string | null) {
    if (!filtering || !unitIdValue) return true;
    return matches.some((unit) => unit.id === unitIdValue);
  }

  function nextMatch() {
    if (!matches.length) return;
    const unit = matches[matchCursor % matches.length];
    setMatchCursor((cursor) => cursor + 1);
    setEntered(true);
    openOnPlan(unit, false);
    setHighlightId(unit.id);
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
    track("lead_submitted", active);
  }

  function whatsapp(unit?: Unit | null) {
    const text = encodeURIComponent(`Hola, me interesa ${unit ? `la unidad ${unit.codigo} de ${data.project.nombre}` : data.project.nombre}.`);
    track("whatsapp_click", unit);
    window.open(`https://wa.me/${data.project.contacto.whatsapp}?text=${text}`, "_blank", "noopener");
  }

  async function share(unit?: Unit | null) {
    const url = new URL(`/s/${data.project.slug}`, window.location.origin);
    if (unit) url.searchParams.set("unidad", unit.codigo);
    const payload = { title: data.project.nombre, text: unit ? `Unidad ${unit.codigo}` : data.project.nombre, url: url.toString() };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        /* el visitante canceló: copiamos igual */
      }
    }
    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
  }

  function toggleCompare(id: string) {
    setCompare((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  }

  function enter() {
    setEntered(true);
    setPhase("escena");
    setSceneIndex(0);
    setSheet(null);
  }

  const image = !entered ? cover?.imagen_url ?? data.facade : phase === "planta" ? floor?.plano ?? scene?.imagen_url ?? data.facade : scene?.imagen_url ?? data.facade;
  const cinematic = !entered || scene?.tipo === "barrio";
  const showRail = entered && phase === "escena" && building && building.floors.length > 0 && scene?.tipo === "exterior";
  const polygons = zones();

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#12110f] text-white" data-testid="showroom">
      <Stage
        stageRef={stageRef}
        src={image}
        cover={cinematic}
        zoom={phase === "planta" ? zoom : 1}
        pan={phase === "planta" ? pan : { x: 0, y: 0 }}
        video={playing && videos.current ? videos.current : null}
        onVideoDone={() => setPlaying(false)}
        onPointerDown={(event) => {
          if (phase !== "planta" || zoom === 1) return;
          drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
          moved.current = false;
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const dx = event.clientX - drag.current.x;
          const dy = event.clientY - drag.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
          setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onWheel={(event) => {
          if (phase !== "planta") return;
          event.preventDefault();
          setZoom((value) => Math.min(4, Math.max(1, value + (event.deltaY < 0 ? 0.2 : -0.2))));
        }}
      >
        {polygons.map((overlay) => {
          const unit = overlay.vinculo_tipo === "unit" ? data.units.find((item) => item.id === overlay.vinculo_id) : undefined;
          const color = unit ? STATUS_COLOR[unit.estado] ?? "#1f8a5b" : "#c4a574";
          const on = matched(unit?.id ?? overlay.vinculo_id);
          const selected = highlightId && (highlightId === unit?.id || highlightId === overlay.vinculo_id);
          const aerial = overlay.vinculo_tipo === "building";
          const [cx, cy] = centroid(overlay.puntos);
          return (
            <g key={overlay.id} onClick={(event) => { event.stopPropagation(); onZone(overlay); }} className="cursor-pointer">
              <polygon
                points={overlay.puntos.map((point) => point.join(",")).join(" ")}
                fill={aerial ? "#c4a574" : color}
                fillOpacity={aerial ? 0.01 : on ? (selected ? 0.55 : 0.38) : 0.05}
                stroke={aerial ? "transparent" : "#fff"}
                strokeWidth={selected ? 0.008 : 0.003}
              />
              {aerial && (
                <>
                  <circle cx={cx} cy={cy} r="0.028" fill="#c4a574" stroke="#fff" strokeWidth="0.006" />
                  <text x={cx} y={cy + 0.055} textAnchor="middle" fontSize="0.028" fill="#fff">{overlay.etiqueta}</text>
                </>
              )}
              {unit && phase === "planta" && (
                <text x={cx} y={cy} textAnchor="middle" fontSize="0.032" fill="#fff">{unit.codigo}</text>
              )}
            </g>
          );
        })}
      </Stage>
      {videos.next && <video src={videos.next} preload="auto" muted playsInline className="pointer-events-none absolute h-px w-px opacity-0" />}

      <button
        type="button"
        aria-label="Menú"
        className="absolute left-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-[#c4a574] text-[#1c1915]"
        onClick={() => setSheet(sheet === "menu" ? null : "menu")}
      >
        <span className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </span>
      </button>

      {entered && (
        <div className="pointer-events-none absolute inset-x-0 top-5 z-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/80">{phase === "planta" ? floor?.nombre : scene?.nombre}</p>
          <p className="font-serif text-2xl drop-shadow">{data.project.nombre}</p>
        </div>
      )}

      <div className="absolute right-4 top-4 z-20 flex gap-2">
        <button type="button" className="rounded-full bg-white/15 px-3 py-2 text-sm backdrop-blur" onClick={() => setSheet("filtros")}>Filtros</button>
        {compare.length > 0 && (
          <button type="button" className="rounded-full bg-white px-3 py-2 text-sm text-[#1c1915]" onClick={() => setSheet("comparar")}>Comparar ({compare.length})</button>
        )}
      </div>

      {!entered && (
        <div className="absolute inset-0 z-10 grid place-items-center px-6 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#c4a574]">Showroom</p>
            <h1 className="mt-3 font-serif text-6xl text-white drop-shadow md:text-8xl">{data.project.nombre}</h1>
            <p className="mt-3 text-sm tracking-wide text-white/80">{data.project.direccion}</p>
          </div>
          <button
            type="button"
            data-testid="entrar"
            className="absolute bottom-10 rounded-full bg-white px-10 py-3 text-sm tracking-[0.18em] text-[#1c1915] uppercase"
            onClick={enter}
          >
            Entrar
          </button>
        </div>
      )}

      {entered && phase === "escena" && walk.length > 1 && (
        <>
          <button type="button" aria-label="Escena anterior" className="absolute left-3 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-2xl text-[#1c1915] md:grid" onClick={() => setSceneIndex((index) => (index - 1 + walk.length) % walk.length)}>‹</button>
          <button type="button" aria-label="Escena siguiente" className="absolute right-16 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-2xl text-[#1c1915] md:grid" onClick={() => setSceneIndex((index) => (index + 1) % walk.length)}>›</button>
        </>
      )}

      {showRail && building && (
        <aside className="absolute bottom-24 right-3 top-20 z-20 flex flex-col items-center justify-center gap-1" data-testid="floor-rail">
          {building.floors.map((item) => (
            <button
              key={item.id}
              type="button"
              className="grid min-w-12 place-items-center rounded-full px-2 py-1 text-sm"
              onClick={() => openFloor(item.id)}
            >
              <span className="font-medium">{floorMark(item.nombre, item.numero)}</span>
              <span className="text-[10px] text-white/70">{item.libres} libres</span>
            </button>
          ))}
        </aside>
      )}

      {entered && (
        <div className="absolute inset-x-0 bottom-5 z-20 hidden justify-center gap-2 md:flex">
          <button type="button" className="rounded-full bg-white/90 px-4 py-2 text-sm text-[#1c1915]" onClick={() => { const index = walk.findIndex((item) => item.tipo === "aereo"); if (index >= 0) { setSceneIndex(index); setPhase("escena"); } }}>Vista aérea</button>
          {building && building.floors[0] && (
            <button type="button" className="rounded-full bg-white/90 px-4 py-2 text-sm text-[#1c1915]" onClick={() => openFloor(building.floors[0].id)}>Ver plantas</button>
          )}
          <button type="button" className="rounded-full bg-white/90 px-4 py-2 text-sm text-[#1c1915]" onClick={() => setSheet("galeria")}>Galería</button>
        </div>
      )}

      {phase === "planta" && (
        <div className="absolute bottom-5 left-4 z-20 flex items-center gap-2">
          <button type="button" className="rounded-full bg-white px-3 py-1 text-[#1c1915]" onClick={() => { setPhase("escena"); setZoom(1); setPan({ x: 0, y: 0 }); }}>Volver</button>
          <button type="button" className="rounded-full bg-white/90 px-3 py-1 text-[#1c1915]" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}>−</button>
          <button type="button" className="rounded-full bg-white/90 px-3 py-1 text-[#1c1915]" onClick={() => setZoom((value) => Math.min(4, value + 0.25))}>+</button>
          {zoom > 1 && floor?.plano && (
            <div className="relative hidden h-16 w-24 overflow-hidden rounded-md border border-white/40 md:block" data-testid="minimap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={floor.plano} alt="" className="h-full w-full object-fill" />
              <span className="absolute border border-white" style={{ width: `${100 / zoom}%`, height: `${100 / zoom}%`, left: `${(1 - 1 / zoom) * 50}%`, top: `${(1 - 1 / zoom) * 50}%` }} />
            </div>
          )}
        </div>
      )}

      {active && (
        <UnitPanel
          unit={active}
          projectName={data.project.nombre}
          compared={compare.includes(active.id)}
          sent={sent}
          sending={sending}
          error={error}
          onClose={() => setUnitId(null)}
          onWhatsapp={() => whatsapp(active)}
          onShare={() => void share(active)}
          onCompare={() => toggleCompare(active.id)}
          onTour={() => active.tour && setSheet("tour")}
          onVista={() => active.vista_url && setSheet("vista")}
          onAcabados={() => active.acabados.length && setSheet("acabados")}
          photo={photo}
          setPhoto={setPhoto}
          onLead={submitLead}
        />
      )}

      {sheet === "menu" && (
        <Menu
          lite={lite}
          onClose={() => setSheet(null)}
          onPick={(action) => {
            setSheet(null);
            if (action === "intro") setEntered(false);
            if (action === "edificio") {
              const index = walk.findIndex((item) => item.tipo === "exterior");
              setEntered(true);
              setPhase("escena");
              if (index >= 0) setSceneIndex(index);
            }
            if (action === "plantas") {
              const target = building?.floors[0] ?? data.buildings.find((item) => item.floors.length)?.floors[0];
              if (target) {
                setEntered(true);
                if (building) goBuilding(building.id);
                openFloor(target.id);
              }
            }
            if (action === "amenities") setSheet("amenities");
            if (action === "tour") {
              if (active?.tour) setSheet("tour");
              else {
                const index = walk.findIndex((item) => item.video_url);
                setEntered(true);
                setPhase("escena");
                if (index >= 0) setSceneIndex(index);
                setPlaying(!lite);
              }
            }
            if (action === "video") setPlaying(!lite && Boolean(scene?.video_url));
            if (action === "galeria") setSheet("galeria");
            if (action === "mapa") setSheet("mapa");
            if (action === "info") setSheet("info");
            if (action === "lite") {
              const next = !lite;
              setLite(next);
              sessionStorage.setItem("adastra-lite", next ? "1" : "0");
              if (next) setPlaying(false);
            }
            if (action === "full") {
              if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
              else void document.exitFullscreen();
            }
          }}
        />
      )}

      {sheet && sheet !== "menu" && (
        <Drawer title={sheetTitle(sheet)} onClose={() => setSheet(null)}>
          {sheet === "filtros" && (
            <div className="space-y-3 text-sm text-[#1c1915]">
              <p>{matches.length} coinciden en el edificio. Las demás quedan atenuadas.</p>
              <Select label="Estado" value={filters.estado} onChange={(estado) => setFilters({ ...filters, estado })} options={[["todos", "Todos"], ["disponible", "Disponible"], ["reservada", "Reservada"], ["vendida", "Vendida"], ["pausa", "En pausa"], ["bloqueada", "Bloqueada"], ["consultar", "Consultar"]]} />
              <Select label="Ambientes" value={filters.ambientes} onChange={(ambientes) => setFilters({ ...filters, ambientes })} options={[["todos", "Todos"], ...data.filters.ambientes.map((n) => [String(n), String(n)] as [string, string])]} />
              <Select label="Orientación" value={filters.orientacion} onChange={(orientacion) => setFilters({ ...filters, orientacion })} options={[["todas", "Todas"], ...data.filters.orientaciones.map((n) => [n, n] as [string, string])]} />
              <label className="block">Precio máximo
                <input value={filters.precioMax} onChange={(event) => setFilters({ ...filters, precioMax: event.target.value })} inputMode="numeric" className="mt-1 w-full rounded-xl border border-[#e4d9c8] px-3 py-2" placeholder="USD" />
              </label>
              {data.filters.fields.map((field) => (
                <Select
                  key={field.clave}
                  label={field.nombre}
                  value={extra[field.clave] ?? "todos"}
                  onChange={(value) => setExtra({ ...extra, [field.clave]: value })}
                  options={field.tipo === "boolean" ? [["todos", "Todos"], ["true", "Sí"], ["false", "No"]] : [["todos", "Todos"], ...field.opciones.map((opcion) => [opcion, opcion] as [string, string])]}
                />
              ))}
              <Select label="Orden al saltar" value={filters.sort} onChange={(sort) => setFilters({ ...filters, sort: sort as FlowFilters["sort"] })} options={[["piso", "Piso"], ["precio", "Precio"], ["superficie", "Superficie"]]} />
              <div className="flex gap-2">
                <button type="button" className="rounded-full bg-[#1c1915] px-4 py-2 text-white" onClick={nextMatch}>Siguiente coincidencia</button>
                <button type="button" className="rounded-full border border-[#e4d9c8] px-4 py-2" onClick={() => { setFilters(EMPTY_FILTERS); setExtra({}); }}>Limpiar</button>
              </div>
            </div>
          )}
          {sheet === "galeria" && <Gallery images={data.gallery} />}
          {sheet === "amenities" && (
            <ul className="space-y-4">
              {data.amenities.map((amenity) => (
                <li key={amenity.id}>
                  {amenity.imagen && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={amenity.imagen} alt="" className="h-40 w-full rounded-2xl object-cover" />
                  )}
                  <p className="mt-2 font-serif text-2xl text-[#1c1915]">{amenity.nombre}</p>
                </li>
              ))}
              {!data.amenities.length && <p className="text-sm text-[#6b6258]">Este proyecto todavía no cargó amenities.</p>}
            </ul>
          )}
          {sheet === "mapa" && <MapBlock project={data.project} pois={data.pois} />}
          {sheet === "info" && (
            <div className="space-y-3 text-sm text-[#1c1915]">
              <p>{data.project.descripcion}</p>
              <p>{data.project.direccion}</p>
              {data.project.fecha_entrega && <p>Entrega {new Date(data.project.fecha_entrega).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}</p>}
              <h3 className="font-serif text-2xl">{data.organization.nombre}</h3>
              <p>{data.organization.descripcion}</p>
              <p>{data.project.contacto.telefono}</p>
              <p>{data.project.contacto.email}</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.project.redes).map(([red, url]) => (
                  <a key={red} href={url} className="underline" target="_blank" rel="noreferrer">{red}</a>
                ))}
              </div>
              <button type="button" className="rounded-full bg-[#1f8a5b] px-4 py-2 text-white" onClick={() => whatsapp(null)}>WhatsApp</button>
            </div>
          )}
          {sheet === "comparar" && (
            <div className="grid gap-3 md:grid-cols-3">
              {compare.map((id) => {
                const unit = data.units.find((item) => item.id === id);
                if (!unit) return null;
                return (
                  <article key={id} className="rounded-2xl border border-[#e4d9c8] p-3 text-sm text-[#1c1915]">
                    <p className="font-serif text-2xl">{unit.codigo}</p>
                    <p>{unit.torre} · {unit.piso}</p>
                    <p>{unit.estado === "consultar" || unit.precio == null ? "Consultar" : formatUsd(unit.precio)}</p>
                    <p>{unit.m2_totales ? `${formatM2(unit.m2_totales)} m²` : ""} · {unit.dormitorios ?? "—"} dorm.</p>
                    <p>{STATUS_LABEL[unit.estado]}</p>
                    <button type="button" className="mt-2 text-[#9a6240]" onClick={() => toggleCompare(id)}>Quitar</button>
                    <button type="button" className="mt-2 block" onClick={() => { setSheet(null); chooseUnit(unit, "comparar"); }}>Ver ficha</button>
                  </article>
                );
              })}
            </div>
          )}
          {sheet === "tour" && active?.tour && <TourBlock tour={active.tour} />}
          {sheet === "vista" && active?.vista_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.vista_url} alt="Vista desde esta altura" className="w-full rounded-2xl" />
          )}
          {sheet === "acabados" && (
            <div className="grid grid-cols-2 gap-2">
              {active?.acabados.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="Acabado" className="h-28 w-full rounded-xl object-cover" />
              ))}
            </div>
          )}
          {sheet === "compartir" && (
            <div className="space-y-2 text-sm text-[#1c1915]">
              <button type="button" className="block" onClick={() => void share(active)}>Copiar link</button>
              {copied && <p>Copiamos el link.</p>}
            </div>
          )}
        </Drawer>
      )}
    </main>
  );
}

function sheetTitle(sheet: Sheet) {
  const titles: Record<string, string> = {
    filtros: "Filtros",
    galeria: "Galería",
    amenities: "Amenities",
    mapa: "Ubicación",
    info: "El proyecto",
    comparar: "Comparar",
    tour: "Tour 360",
    vista: "Vista",
    acabados: "Acabados",
    compartir: "Compartir",
  };
  return titles[sheet ?? ""] ?? "";
}

function Stage({
  src,
  cover,
  zoom,
  pan,
  video,
  children,
  stageRef,
  onVideoDone,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
}: {
  src: string;
  cover: boolean;
  zoom: number;
  pan: { x: number; y: number };
  video: string | null;
  children?: React.ReactNode;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onVideoDone: () => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
  onWheel: (event: WheelEvent) => void;
}) {
  const [box, setBox] = useState({ w: 1, h: 1 });
  const [natural, setNatural] = useState({ w: 16, h: 9 });
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setBox({ w: node.clientWidth, h: node.clientHeight }));
    observer.observe(node);
    setBox({ w: node.clientWidth, h: node.clientHeight });
    return () => observer.disconnect();
  }, [stageRef]);
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const listener = (event: WheelEvent) => onWheel(event);
    node.addEventListener("wheel", listener, { passive: false });
    return () => node.removeEventListener("wheel", listener);
  }, [onWheel, stageRef]);
  const frame = cover ? { left: 0, top: 0, width: box.w, height: box.h } : contain(box.w, box.h, natural.w, natural.h);
  return (
    <div
      ref={stageRef}
      className="absolute inset-0"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        className="absolute"
        style={{
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt=""
          className="stage-fade h-full w-full object-fill"
          draggable={false}
          onLoad={(event) => {
            const img = event.currentTarget;
            if (img.naturalWidth) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
        {video && (
          <video
            key={video}
            src={video}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-fill"
            onEnded={onVideoDone}
            onError={onVideoDone}
          />
        )}
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {children}
        </svg>
      </div>
    </div>
  );
}

function Menu({ lite, onClose, onPick }: { lite: boolean; onClose: () => void; onPick: (action: string) => void }) {
  const items = [
    ["intro", "Intro"],
    ["edificio", "El edificio"],
    ["plantas", "Plantas"],
    ["amenities", "Amenities"],
    ["tour", "Recorridos"],
    ["video", "Video"],
    ["galeria", "Galería"],
    ["mapa", "Ubicación"],
    ["info", "Contacto"],
  ];
  return (
    <div className="absolute inset-0 z-40 bg-[#12110f]/94">
      <button type="button" className="absolute right-5 top-5 text-sm" onClick={onClose}>Cerrar</button>
      <nav className="mx-auto flex max-w-md flex-col gap-3 px-8 pt-24">
        {items.map(([action, label]) => (
          <button key={action} type="button" className="text-left font-serif text-4xl" onClick={() => onPick(action)}>{label}</button>
        ))}
        <button type="button" className="mt-6 text-left text-sm text-[#c4a574]" onClick={() => onPick("lite")}>{lite ? "Ver con videos" : "Solo imágenes"}</button>
        <button type="button" className="text-left text-sm text-white/70" onClick={() => onPick("full")}>Pantalla completa</button>
      </nav>
    </div>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside className="absolute inset-x-0 bottom-0 z-30 max-h-[78vh] overflow-auto rounded-t-3xl bg-[#f6f1e8] p-5 text-[#1c1915] shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-3xl">{title}</h2>
        <button type="button" onClick={onClose}>Cerrar</button>
      </div>
      {children}
    </aside>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <label className="block">{label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e4d9c8] bg-white px-3 py-2">
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

function Gallery({ images }: { images: { id: string; nombre: string; url: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {images.map((image) => (
          <button key={image.id} type="button" onClick={() => setOpen(image.url)} className="text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.nombre} className="h-28 w-full rounded-xl object-cover" />
            <span className="text-xs text-[#6b6258]">{image.nombre}</span>
          </button>
        ))}
      </div>
      {open && (
        <button type="button" className="mt-3 w-full" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="" className="max-h-[50vh] w-full rounded-2xl object-contain" />
        </button>
      )}
    </div>
  );
}

function MapBlock({ project, pois }: { project: ShowroomData["project"]; pois: ShowroomData["pois"] }) {
  const lat = project.lat;
  const lng = project.lng;
  if (lat == null || lng == null) return <p className="text-sm text-[#6b6258]">El proyecto todavía no tiene coordenadas.</p>;
  const bbox = `${lng - 0.02}%2C${lat - 0.015}%2C${lng + 0.02}%2C${lat + 0.015}`;
  return (
    <div className="space-y-3 text-sm text-[#1c1915]">
      <iframe title="Mapa" className="h-56 w-full rounded-2xl border-0" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`} />
      <div className="flex flex-wrap gap-2">
        <a className="rounded-full bg-[#1c1915] px-3 py-1 text-white" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`} target="_blank" rel="noreferrer">En auto</a>
        <a className="rounded-full border border-[#e4d9c8] px-3 py-1" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`} target="_blank" rel="noreferrer">Caminando</a>
        <a className="rounded-full border border-[#e4d9c8] px-3 py-1" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`} target="_blank" rel="noreferrer">En transporte</a>
      </div>
      <ul className="space-y-2">
        {pois.map((poi) => (
          <li key={poi.id}>
            <p className="font-medium">{poi.nombre}</p>
            <p className="text-[#6b6258]">{poi.categoria}{poi.distancia_m != null ? ` · ${poi.distancia_m} m` : ""}</p>
            <p>{poi.descripcion}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TourBlock({ tour }: { tour: NonNullable<Unit["tour"]> }) {
  const kind = tourEmbed(tour.proveedor, tour.url);
  if (kind === "panorama") {
    return (
      <div className="overflow-x-auto rounded-2xl bg-[#12110f]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={tour.url} alt={tour.titulo} className="h-64 max-w-none" />
        <p className="p-2 text-xs text-white/70">Arrastrá para mirar alrededor.</p>
      </div>
    );
  }
  return <iframe title={tour.titulo} src={tour.url} className="h-80 w-full rounded-2xl border-0" allow="fullscreen; xr-spatial-tracking" />;
}

function UnitPanel({
  unit,
  projectName,
  compared,
  sent,
  sending,
  error,
  onClose,
  onWhatsapp,
  onShare,
  onCompare,
  onTour,
  onVista,
  onAcabados,
  photo,
  setPhoto,
  onLead,
}: {
  unit: Unit;
  projectName: string;
  compared: boolean;
  sent: boolean;
  sending: boolean;
  error: string;
  onClose: () => void;
  onWhatsapp: () => void;
  onShare: () => void;
  onCompare: () => void;
  onTour: () => void;
  onVista: () => void;
  onAcabados: () => void;
  photo: number;
  setPhoto: (index: number) => void;
  onLead: (form: FormData) => void;
}) {
  const photos = unit.renders.length ? unit.renders : unit.plano ? [unit.plano] : [];
  const current = photos[photo] ?? photos[0];
  return (
    <aside data-testid="unit-panel" className="absolute inset-x-0 bottom-0 z-30 max-h-[78vh] overflow-auto rounded-t-3xl bg-white text-[#1c1915] shadow-2xl md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[400px] md:rounded-none">
      <div className="relative">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="h-52 w-full object-cover" />
        )}
        <button type="button" className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm" onClick={onClose}>Cerrar</button>
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {photos.map((url, index) => (
              <button key={url} type="button" className={`h-2 w-2 rounded-full ${index === photo ? "bg-white" : "bg-white/50"}`} onClick={() => setPhoto(index)} aria-label={`Foto ${index + 1}`} />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <span className="inline-block rounded-full px-2 py-0.5 text-xs text-white" style={{ background: STATUS_COLOR[unit.estado] }}>{STATUS_LABEL[unit.estado]}</span>
        <h2 className="font-serif text-4xl">{unit.codigo}</h2>
        <p className="text-sm text-[#6b6258]">{unit.tipologia} · {unit.torre} · {unit.piso}</p>
        <p className="text-2xl">{unit.mostrar_precio && unit.precio != null ? formatUsd(unit.precio) : "Consultar"}</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {unit.m2_totales != null && <div><dt className="text-[#6b6258]">Superficie</dt><dd>{formatM2(unit.m2_totales)} m²</dd></div>}
          {unit.dormitorios != null && <div><dt className="text-[#6b6258]">Dormitorios</dt><dd>{unit.dormitorios}</dd></div>}
          {unit.banos != null && <div><dt className="text-[#6b6258]">Baños</dt><dd>{unit.banos}</dd></div>}
          {unit.orientacion && <div><dt className="text-[#6b6258]">Orientación</dt><dd>{unit.orientacion}</dd></div>}
          {unit.ambientes != null && <div><dt className="text-[#6b6258]">Ambientes</dt><dd>{unit.ambientes}</dd></div>}
          {unit.vista && <div><dt className="text-[#6b6258]">Vista</dt><dd>{unit.vista}</dd></div>}
        </dl>
        {unit.descripcion && <p className="text-sm">{unit.descripcion}</p>}
        {unit.features.length > 0 && <p className="text-sm">{unit.features.join(" · ")}</p>}
        <ul className="text-sm">
          {unit.custom.map((field) => (
            <li key={field.clave}>{field.nombre}: {typeof field.value === "boolean" ? (field.value ? "sí" : "no") : typeof field.value === "number" ? `${formatNumber(field.value)}${field.unidad ? ` ${field.unidad}` : ""}` : String(field.value)}</li>
          ))}
        </ul>
        {unit.quote && <p className="text-sm text-[#6b6258]">{unit.quote.plan}: cuota {formatUsd(unit.quote.quote.cuota)}. {unit.quote.legal}</p>}
        <div className="flex flex-wrap gap-2 text-sm">
          <button type="button" className="rounded-full bg-[#1f8a5b] px-4 py-2 text-white" onClick={onWhatsapp}>WhatsApp</button>
          {unit.tour && <button type="button" className="rounded-full border border-[#e4d9c8] px-4 py-2" onClick={onTour}>Tour 360</button>}
          {unit.vista_url && <button type="button" className="rounded-full border border-[#e4d9c8] px-4 py-2" onClick={onVista}>Vista</button>}
          {unit.acabados.length > 0 && <button type="button" className="rounded-full border border-[#e4d9c8] px-4 py-2" onClick={onAcabados}>Acabados</button>}
          <button type="button" className="rounded-full border border-[#e4d9c8] px-4 py-2" onClick={onCompare}>{compared ? "En el comparador" : "Comparar"}</button>
          <button type="button" className="rounded-full border border-[#e4d9c8] px-4 py-2" onClick={onShare}>Compartir</button>
        </div>
        {unit.plano && photos[0] !== unit.plano && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={unit.plano} alt={`Plano de ${unit.codigo}`} className="w-full rounded-2xl border border-[#e4d9c8]" />
        )}
        {sent ? <p className="text-sm text-[#1f6b4a]">Recibimos tu consulta por {unit.codigo}.</p> : (
          <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); onLead(new FormData(event.currentTarget)); }}>
            <p className="text-sm font-medium">Consultar por {unit.codigo}</p>
            <input name="nombre" required placeholder="Nombre" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <input name="email" type="email" placeholder="Email" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <input name="telefono" placeholder="Teléfono" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <textarea name="mensaje" rows={2} placeholder={`Hola, quiero saber más de ${unit.codigo} en ${projectName}`} className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            {error && <p className="text-sm text-[#b42318]">{error}</p>}
            <button disabled={sending} className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">{sending ? "Enviando…" : "Enviar consulta"}</button>
          </form>
        )}
      </div>
    </aside>
  );
}
