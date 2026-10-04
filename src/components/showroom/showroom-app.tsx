"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PoiMap } from "@/components/maps/poi-map";
import { FacadeVeil } from "@/components/showroom/facade-veil";
import { maskReady } from "@/lib/domain/facade-mask";
import { showQuote } from "@/lib/domain/finance";
import { STATUS_COLOR, STATUS_LABEL, formatM2, formatNumber, formatUsd } from "@/lib/domain/format";
import { travelMinutes } from "@/lib/domain/geo";
import { poiColor, poiLabel } from "@/lib/domain/poi";
import "./showroom.css";
import { coverFrame } from "@/lib/domain/cover-frame";
import { floorKey, sceneKey, sortUnits, tourEmbed, unitMatches, videosToLoad, type FlowFilters } from "@/lib/domain/showroom-flow";
import type { ShowroomData } from "@/lib/services/present";

type Unit = ShowroomData["units"][number];
type Overlay = ShowroomData["overlays"][number];
type Sheet = null | "menu" | "filtros" | "galeria" | "amenities" | "mapa" | "info" | "comparar" | "tour" | "compartir" | "vista" | "acabados" | "obra" | "secciones" | "pasos";

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
  if (/techo/i.test(nombre)) return "T";
  if (/terraza|azotea/i.test(nombre)) return "Az";
  if (/baja/i.test(nombre)) return "PB";
  if (/subsuelo 1|ss1/i.test(nombre)) return "S1";
  if (/subsuelo 2|ss2/i.test(nombre)) return "S2";
  return String(numero);
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
  const [cookies, setCookies] = useState<"ask" | "yes" | "no">("ask");
  const [bridge, setBridge] = useState<string | null>(null);
  const [afterBridge, setAfterBridge] = useState<null | { kind: "scene"; index: number } | { kind: "floor"; id: string }>(null);
  const [photo, setPhoto] = useState(0);
  const [matchCursor, setMatchCursor] = useState(0);
  const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [disp, setDisp] = useState(false);
  const [coverShift, setCoverShift] = useState(0);
  const [floorsOpen, setFloorsOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const swipe = useRef<{ x: number; y: number; lx: number; ly: number; shift: number } | null>(null);
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
    const consent = localStorage.getItem("adastra-cookies");
    if (consent === "1") setCookies("yes");
    else if (consent === "0") setCookies("no");
    const stored = sessionStorage.getItem("adastra-lite");
    if (stored === "1") setLite(true);
    if (stored === "0") setLite(false);
    applySearch(window.location.search);
    const params = new URLSearchParams(window.location.search);
    if (params.get("disp") === "1") setDisp(true);
    if (params.has("escena") || params.has("planta") || params.has("unidad")) {
      history.replaceState({ showroom: 1 }, "", window.location.href);
    }
    const onPop = () => applySearch(window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // La visita se registra una vez por carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.project.slug]);

  useEffect(() => {
    if (!entered || phase !== "escena" || lite) {
      setPlaying(false);
      return;
    }
    setPlaying(Boolean(scene?.video_url) && !scene?.transicion_url);
  }, [entered, phase, sceneIndex, lite, scene?.video_url, scene?.transicion_url]);

  useEffect(() => { setCoverShift(0); }, [sceneIndex]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSheet(null);
        setUnitId(null);
      }
      if (sheet || unitId || !entered || phase !== "escena") return;
      if (event.key === "ArrowRight") spin(1);
      if (event.key === "ArrowLeft") spin(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, phase, sheet, unitId, walk.length, sceneIndex, lite, bridge, scene]);

  const activeId = active?.id;
  useEffect(() => {
    if (!activeId) return;
    const started = Date.now();
    const unitId = activeId;
    return () => {
      const segundos = Math.round((Date.now() - started) / 1000);
      if (segundos < 1) return;
      const { visitor, session } = identity();
      const payload = JSON.stringify({
        slug: data.project.slug,
        nombre: "unit_dwell",
        visitorId: visitor,
        sessionId: session,
        unitId,
        props: { segundos },
        utm: readUtm(),
        width: window.innerWidth,
      });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    };
  }, [activeId, data.project.slug]);

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

  function openFloor(nextFloorId: string, historyMode: "push" | "replace" | "none" = "none") {
    setPhase("planta");
    setFloorId(nextFloorId);
    setUnitId(null);
    setHighlightId(null);
    if (historyMode !== "none") {
      const floor = data.buildings.flatMap((item) => item.floors).find((item) => item.id === nextFloorId);
      if (floor) pushLocation({ planta: floor.clave }, historyMode);
    }
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
    if (unit.planta) pushLocation({ planta: unit.planta, unidad: unit.codigo });
  }

  function revealUnit(unit: Unit) {
    if (unit.floor_id) {
      setPhase("planta");
      setFloorId(unit.floor_id);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    setHighlightId(unit.id);
    setUnitId(unit.id);
    setPhoto(0);
    setSent(false);
    setSheet(null);
    track("unit_view", unit, { origen: "fachada" });
    if (unit.planta) {
      pushLocation({ planta: unit.planta });
      pushLocation({ planta: unit.planta, unidad: unit.codigo });
    }
  }

  function zones(): Overlay[] {
    if (!entered || !scene || bridge || (playing && phase === "escena")) return [];
    if (phase === "planta" && floorId) {
      return data.overlays.filter((overlay) => overlay.contenedor === "floor" && overlay.contenedor_id === floorId);
    }
    if (scene.tipo === "aereo") return scene.hotspots;
    if (scene.tipo === "masterplan") {
      return data.overlays.filter((overlay) => overlay.contenedor === "masterplan" && overlay.contenedor_id === scene.building_id);
    }
    if (scene.tipo === "exterior") return disp && maskReady(scene.mascara) ? [] : scene.hotspots;
    return [];
  }

  function onZone(overlay: Overlay) {
    if (moved.current || bridge) return;
    if (overlay.vinculo_tipo === "building" && overlay.vinculo_id) {
      goBuilding(overlay.vinculo_id);
      return;
    }
    const unit = data.units.find((item) => item.id === overlay.vinculo_id);
    if (!unit) return;
    setTip(null);
    setHoverId(null);
    const onPlan = phase === "planta" || scene?.tipo === "masterplan";
    if (onPlan) {
      chooseUnit(unit, phase === "planta" ? "planta" : "masterplan");
      return;
    }
    revealUnit(unit);
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

  function setDisponibilidad(on: boolean) {
    setDisp(on);
    if (!on) setLegendOpen(false);
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("disp", "1");
    else url.searchParams.delete("disp");
    history.replaceState(window.history.state ?? { showroom: 1 }, "", url);
  }

  function pushLocation(loc: { escena?: string; planta?: string; unidad?: string }, mode: "push" | "replace" = "push") {
    const url = new URL(window.location.href);
    url.searchParams.delete("escena");
    url.searchParams.delete("planta");
    url.searchParams.delete("unidad");
    if (loc.unidad && loc.planta) {
      url.searchParams.set("planta", loc.planta);
      url.searchParams.set("unidad", loc.unidad);
    } else if (loc.planta) url.searchParams.set("planta", loc.planta);
    else if (loc.escena) url.searchParams.set("escena", loc.escena);
    const state = { showroom: 1 };
    if (mode === "replace") history.replaceState(state, "", url);
    else history.pushState(state, "", url);
  }

  function applySearch(search: string) {
    const params = new URLSearchParams(search);
    const unidad = params.get("unidad");
    const planta = params.get("planta");
    const escena = params.get("escena");
    if (unidad) {
      const unit = data.units.find((item) => item.codigo.toLowerCase() === unidad.toLowerCase());
      if (!unit) return;
      setEntered(true);
      if (unit.floor_id) {
        setPhase("planta");
        setFloorId(unit.floor_id);
      }
      setHighlightId(unit.id);
      setUnitId(unit.id);
      setPhoto(0);
      setSheet(null);
      return;
    }
    setUnitId(null);
    setHighlightId(null);
    if (planta) {
      const floor = data.buildings.flatMap((item) => item.floors).find((item) => item.clave === planta);
      if (!floor) return;
      setEntered(true);
      setPhase("planta");
      setFloorId(floor.id);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    if (escena) {
      const index = walk.findIndex((item) => sceneKey(item.nombre) === escena);
      setEntered(true);
      setPhase("escena");
      if (index >= 0) setSceneIndex(index);
      return;
    }
    setEntered(false);
    setPhase("escena");
  }

  function enter() {
    setEntered(true);
    setPhase("escena");
    setSceneIndex(0);
    setUnitId(null);
    setSheet(null);
    const first = walk[0];
    if (first) pushLocation({ escena: sceneKey(first.nombre) });
    if (!lite && cover?.video_url) {
      setAfterBridge(null);
      setBridge(cover.video_url);
    }
  }

  function finishBridge() {
    const job = afterBridge;
    setBridge(null);
    setAfterBridge(null);
    setPlaying(false);
    if (job?.kind === "scene") {
      setSceneIndex(job.index);
      setPhase("escena");
      const next = walk[job.index];
      if (next) pushLocation({ escena: sceneKey(next.nombre) }, "replace");
    }
    if (job?.kind === "floor") openFloor(job.id, "push");
  }

  function spin(direction: 1 | -1) {
    if (!scene || bridge) return;
    const next = (sceneIndex + direction + walk.length) % walk.length;
    const clip = direction > 0 ? scene.transicion_url : scene.reversa_url;
    setTip(null);
    if (!lite && clip) {
      setAfterBridge({ kind: "scene", index: next });
      setBridge(clip);
      return;
    }
    setSceneIndex(next);
    setPhase("escena");
    const target = walk[next];
    if (target) pushLocation({ escena: sceneKey(target.nombre) }, "replace");
  }

  function stepBack() {
    if (window.history.state?.showroom) {
      history.back();
      return;
    }
    if (unitId) {
      setUnitId(null);
      if (floor) pushLocation({ planta: floor.clave }, "replace");
      return;
    }
    setPhase("escena");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function goPlans() {
    const top = tower?.floors[0];
    if (!top) return;
    if (!lite && scene?.vuelo_url) {
      setAfterBridge({ kind: "floor", id: top.id });
      setBridge(scene.vuelo_url);
      return;
    }
    openFloor(top.id, "push");
  }

  const image = !entered ? cover?.imagen_url ?? data.facade : phase === "planta" ? floor?.plano ?? scene?.imagen_url ?? data.facade : scene?.imagen_url ?? data.facade;
  const fitCover = phase !== "planta" && scene?.tipo !== "barrio" && scene?.tipo !== "masterplan";
  const veils = disp && phase === "escena" && scene?.tipo === "exterior" && !bridge && !playing;
  const tower = phase === "planta"
    ? data.buildings.find((item) => item.floors.some((floorItem) => floorItem.id === floorId)) ?? building
    : building;
  const showRail = entered && Boolean(tower && tower.floors.length > 0 && (phase === "planta" || scene?.tipo === "exterior"));
  const polygons = zones();

  return (
    <main className="showroom relative h-[100dvh] overflow-hidden bg-[#12110f] text-white" data-testid="showroom" style={{ ["--accent" as string]: data.project.acento }}>
      <Stage
        stageRef={stageRef}
        src={image}
        cover={fitCover}
        focus={{ x: 0.49, y: 0.48 }}
        shift={coverShift}
        clip={phase === "escena" && scene?.tipo === "exterior" ? scene.silueta ?? undefined : undefined}
        zoom={phase === "planta" ? zoom : 1}
        pan={phase === "planta" ? pan : { x: 0, y: 0 }}
        video={bridge ?? (playing && videos.current ? videos.current : null)}
        poster={image}
        onVideoDone={() => {
          if (bridge) finishBridge();
          else setPlaying(false);
        }}
        onPointerDown={(event) => {
          moved.current = false;
          if (phase === "escena" && entered && !bridge) swipe.current = { x: event.clientX, y: event.clientY, lx: event.clientX, ly: event.clientY, shift: coverShift };
          if (phase !== "planta" || zoom === 1) return;
          drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
        }}
        onPointerMove={(event) => {
          if (swipe.current && phase === "escena" && !bridge) {
            swipe.current.lx = event.clientX;
            swipe.current.ly = event.clientY;
            const dx = swipe.current.lx - swipe.current.x;
            const dy = swipe.current.ly - swipe.current.y;
            const portrait = window.matchMedia("(max-width: 767px)").matches;
            if (portrait && fitCover) {
              setCoverShift(swipe.current.shift + dx);
              if (Math.abs(dx) > 8) moved.current = true;
            } else if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
              swipe.current = null;
              moved.current = true;
              spin(dx < 0 ? 1 : -1);
            }
          }
          if (!drag.current) return;
          const dx = event.clientX - drag.current.x;
          const dy = event.clientY - drag.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
          setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
        }}
        onPointerUp={(event) => {
          drag.current = null;
          const start = swipe.current;
          swipe.current = null;
          if (!start || phase !== "escena" || bridge) return;
          if (window.matchMedia("(max-width: 767px)").matches) return;
          const lost = event.type === "pointercancel" || event.type === "pointerleave";
          const endX = lost ? start.lx : event.clientX;
          const endY = lost ? start.ly : event.clientY;
          const dx = endX - start.x;
          const dy = endY - start.y;
          if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            moved.current = true;
            spin(dx < 0 ? 1 : -1);
          }
        }}
        onWheel={(event) => {
          if (phase !== "planta") return;
          event.preventDefault();
          setZoom((value) => Math.min(4, Math.max(1, value + (event.deltaY < 0 ? 0.2 : -0.2))));
        }}
        veil={veils && scene && maskReady(scene.mascara) ? (
          <FacadeVeil
            mask={scene.mascara}
            units={data.units}
            matched={(unitId) => matched(unitId)}
            hoverId={hoverId}
            onHover={(unitId, point) => {
              setHoverId(unitId);
              setTip(unitId && point ? { id: unitId, x: point.x, y: point.y } : null);
            }}
            onPick={(unitId) => {
              if (moved.current) return;
              const unit = data.units.find((item) => item.id === unitId);
              if (!unit) return;
              setTip(null);
              setHoverId(null);
              revealUnit(unit);
            }}
          />
        ) : null}
      >
        {polygons.map((overlay) => {
          const unit = overlay.vinculo_tipo === "unit" ? data.units.find((item) => item.id === overlay.vinculo_id) : undefined;
          const color = unit ? STATUS_COLOR[unit.estado] ?? "#1f8a5b" : "#c4a574";
          const on = matched(unit?.id ?? overlay.vinculo_id);
          const selected = highlightId && (highlightId === unit?.id || highlightId === overlay.vinculo_id);
          const aerial = overlay.vinculo_tipo === "building";
          const exterior = phase === "escena" && !aerial;
          const hovered = hoverId === overlay.id;
          const [cx, cy] = centroid(overlay.puntos);
          const fillOpacity = aerial ? 0.01 : exterior ? (veils ? (hovered ? 0.62 : on ? 0.35 : 0.08) : 0) : on ? (selected ? 0.55 : 0.34) : 0.06;
          const outline = exterior && hovered && !veils;
          return (
            <g
              key={overlay.id}
              onClick={(event) => { event.stopPropagation(); onZone(overlay); }}
              onMouseEnter={(event) => {
                if (phase !== "escena" || overlay.vinculo_tipo !== "unit") return;
                if (window.matchMedia("(pointer: coarse)").matches) return;
                setHoverId(overlay.id);
                setTip({ id: overlay.id, x: event.clientX, y: event.clientY });
              }}
              onMouseMove={(event) => {
                if (tip?.id !== overlay.id) return;
                setTip({ id: overlay.id, x: event.clientX, y: event.clientY });
              }}
              onMouseLeave={() => {
                setHoverId((current) => (current === overlay.id ? null : current));
                setTip((current) => (current?.id === overlay.id ? null : current));
              }}
              className="cursor-pointer"
            >
              <polygon
                points={overlay.puntos.map((point) => point.join(",")).join(" ")}
                fill={aerial ? "#c4a574" : color}
                fillOpacity={fillOpacity}
                stroke={outline ? "#ffffff" : exterior ? "transparent" : aerial ? "transparent" : "#fff"}
                strokeWidth={outline ? 0.0035 : exterior ? 0 : selected ? 0.008 : 0.003}
                style={exterior ? { transition: "fill-opacity 180ms ease" } : undefined}
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
      {phase === "escena" && scene?.transicion_url && (
        <video src={scene.transicion_url} preload="auto" muted playsInline className="pointer-events-none absolute h-px w-px opacity-0" />
      )}
      {phase === "escena" && scene?.reversa_url && (
        <video src={scene.reversa_url} preload="auto" muted playsInline className="pointer-events-none absolute h-px w-px opacity-0" />
      )}
      {phase === "escena" && walk[(sceneIndex + 1) % walk.length]?.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={walk[(sceneIndex + 1) % walk.length]?.imagen_url} alt="" className="pointer-events-none absolute h-px w-px opacity-0" />
      )}
      {phase === "escena" && walk[(sceneIndex - 1 + walk.length) % walk.length]?.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={walk[(sceneIndex - 1 + walk.length) % walk.length]?.imagen_url} alt="" className="pointer-events-none absolute h-px w-px opacity-0" />
      )}
      {tip && phase === "escena" && <HoverTip tip={tip} overlays={scene?.hotspots ?? []} units={data.units} />}

      <button
        type="button"
        aria-label="Menú"
        className="menu-btn absolute left-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full text-[#1c1915]"
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
        <button type="button" className="glass rounded-full px-3 py-2 text-sm" onClick={() => setSheet("filtros")}>Filtros</button>
        {compare.length > 0 && (
          <button type="button" className="rounded-full bg-white px-3 py-2 text-sm text-[#1c1915]" onClick={() => setSheet("comparar")}>Comparar ({compare.length})</button>
        )}
      </div>

      {!entered && (
        <div className="absolute inset-0 z-10 grid place-items-center px-6 text-center">
          <div>
            {data.project.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.project.logo} alt="" className="mx-auto mb-5 h-14 w-auto" />
            )}
            <p className="eyebrow">Showroom</p>
            <h1 className="wordmark mt-3 font-serif text-6xl text-white md:text-8xl">{data.project.titulo || data.project.nombre}</h1>
            <p className="mt-3 text-sm tracking-wide text-white/80">{data.project.direccion}</p>
          </div>
          <button
            type="button"
            data-testid="entrar"
            className="enter absolute bottom-10 rounded-full bg-white px-12 py-3.5 text-sm tracking-[0.22em] text-[#1c1915] uppercase"
            onClick={enter}
          >
            Entrar
          </button>
        </div>
      )}

      {entered && phase === "escena" && walk.length > 1 && (
        <>
          <button type="button" aria-label="Girar a la izquierda" className="spin-btn absolute left-1 top-1/2 z-30 -translate-y-1/2 md:left-4" onClick={() => spin(-1)}>‹</button>
          <button type="button" aria-label="Girar a la derecha" className="spin-btn absolute right-1 top-1/2 z-30 -translate-y-1/2 md:right-20" onClick={() => spin(1)}>›</button>
        </>
      )}

      {showRail && tower && floorsOpen && (
        <div className="absolute inset-x-3 bottom-24 z-20 flex gap-1 overflow-x-auto rounded-2xl bg-[#12110f]/80 px-2 py-2 md:hidden" data-testid="floor-rail-mobile">
          {tower.floors.map((item) => (
            <button key={item.id} type="button" className="grid min-w-11 place-items-center rounded-full px-2 py-1 text-white" onClick={() => { setFloorsOpen(false); openFloor(item.id, phase === "planta" ? "replace" : "push"); }}>
              <span className="text-sm font-semibold">{floorMark(item.nombre, item.numero)}</span>
              <span className="text-[10px] text-white/75">{item.libres}</span>
            </button>
          ))}
        </div>
      )}

      {showRail && tower && (
        <aside className="rail absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-0.5 rounded-full px-1.5 py-2 md:flex" data-testid="floor-rail">
          {tower.floors.map((item) => {
            const current = phase === "planta" && item.id === floorId;
            return (
              <button
                key={item.id}
                type="button"
                title={`${item.libres} libres`}
                className={`grid min-w-11 place-items-center rounded-full px-1 py-1 leading-none ${current ? "bg-white text-[#1c1915]" : "text-white"}`}
                onClick={() => openFloor(item.id, phase === "planta" ? "replace" : "push")}
              >
                <span className="text-sm font-semibold">{floorMark(item.nombre, item.numero)}</span>
                <span className={`text-[10px] ${current ? "text-[#6b6258]" : "text-white/75"}`}>{item.libres}</span>
              </button>
            );
          })}
        </aside>
      )}

      {entered && (
        <div className="context absolute inset-x-0 bottom-2 z-20 flex flex-nowrap justify-start gap-2 overflow-x-auto px-2 md:bottom-6 md:flex-wrap md:justify-center md:overflow-visible md:px-3">
          <button type="button" data-testid="disponibilidad" aria-pressed={disp} className={disp ? "disp on" : "disp"} onClick={() => setDisponibilidad(!disp)}>
            <span className="dots" aria-hidden="true"><i /><i /><i /></span>
            Disponibilidad
          </button>
          {showRail && (
            <button type="button" className="md:hidden" onClick={() => setFloorsOpen((open) => !open)}>Pisos</button>
          )}
          {veils && (
            <button type="button" className="md:hidden" aria-pressed={legendOpen} onClick={() => setLegendOpen((open) => !open)}>Leyenda</button>
          )}
          {walk.some((item) => item.tipo === "aereo") && (
            <button type="button" onClick={() => { const index = walk.findIndex((item) => item.tipo === "aereo"); if (index >= 0) { setSceneIndex(index); setPhase("escena"); } }}>Vista aérea</button>
          )}
          {building && building.floors[0] && (
            <button type="button" onClick={goPlans}>Ver plantas</button>
          )}
          <button type="button" onClick={() => setSheet("mapa")}>Ubicación</button>
          <button type="button" onClick={() => setSheet("galeria")}>Galería</button>
          {data.progress.length > 0 && <button type="button" onClick={() => setSheet("obra")}>Obra</button>}
          {data.project.brochure && <a href={data.project.brochure} target="_blank" rel="noreferrer">Brochure</a>}
        </div>
      )}

      {entered && phase === "escena" && veils && legendOpen && (
        <ul className="legend legend-pop md:hidden" data-testid="legend-mobile">
          {(["disponible", "reservada", "vendida", "pausa"] as const).map((estado) => (
            <li key={estado}><i style={{ background: STATUS_COLOR[estado] }} />{STATUS_LABEL[estado]}</li>
          ))}
        </ul>
      )}

      {entered && (phase === "planta" || scene?.tipo === "masterplan" || veils) && (
        <ul className={`legend ${phase === "escena" ? "only-desk" : ""}`} data-testid="legend">
          {(["disponible", "reservada", "vendida", "pausa"] as const).map((estado) => (
            <li key={estado}><i style={{ background: STATUS_COLOR[estado] }} />{STATUS_LABEL[estado]}</li>
          ))}
        </ul>
      )}

      {phase === "planta" && (
        <div className="absolute bottom-5 left-4 z-20 flex items-center gap-2">
          <button type="button" className="rounded-full bg-white px-3 py-1 text-[#1c1915]" onClick={stepBack}>Volver</button>
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
          project={data.project}
          plans={data.plans}
          fallback={data.facade}
          plantaImagen={data.buildings.flatMap((item) => item.floors).find((item) => item.id === active.floor_id)?.plano ?? null}
          compared={compare.includes(active.id)}
          sent={sent}
          sending={sending}
          error={error}
          onClose={stepBack}
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
          extras={[
            ...(data.progress.length ? [["obra", "Avance de obra"] as [string, string]] : []),
            ...(data.sections.length ? [["secciones", "Secciones"] as [string, string]] : []),
            ...(data.project.pasos.length ? [["pasos", "Cómo se paga"] as [string, string]] : []),
            ...(data.project.brochure ? [["brochure", "Brochure"] as [string, string]] : []),
            ["disponibilidad", disp ? "Ocultar disponibilidad" : "Disponibilidad"] as [string, string],
          ]}
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
              setEntered(true);
              goPlans();
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
            if (action === "obra") setSheet("obra");
            if (action === "secciones") setSheet("secciones");
            if (action === "pasos") setSheet("pasos");
            if (action === "brochure" && data.project.brochure) window.open(data.project.brochure, "_blank", "noopener");
            if (action === "disponibilidad") setDisponibilidad(!disp);
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
              <p>{veils ? `${matches.length} coinciden en el edificio. Las demás quedan atenuadas.` : "La fachada está limpia. Activá Disponibilidad para ver el filtro pintado sobre los departamentos."}</p>
              {!disp && <button type="button" className="rounded-full bg-[#1c1915] px-3 py-1 text-white" onClick={() => setDisponibilidad(true)}>Ver disponibilidad</button>}
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
          {sheet === "obra" && (
            <ol className="space-y-4">
              {data.progress.map((item) => (
                <li key={item.id}>
                  {item.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagen_url} alt="" className="h-40 w-full rounded-2xl object-cover" />
                  )}
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#9a6240]">{item.fecha}</p>
                  <p className="font-serif text-2xl text-[#1c1915]">{item.titulo}</p>
                  <p className="text-sm text-[#6b6258]">{item.descripcion}</p>
                </li>
              ))}
            </ol>
          )}
          {sheet === "secciones" && (
            <div className="space-y-5">
              {data.sections.map((item) => (
                <article key={item.id}>
                  <h3 className="font-serif text-2xl text-[#1c1915]">{item.titulo}</h3>
                  <p className="mt-1 text-sm text-[#1c1915]">{item.cuerpo}</p>
                </article>
              ))}
            </div>
          )}
          {sheet === "pasos" && (
            <ol className="space-y-3 text-sm text-[#1c1915]">
              {data.project.pasos.map((paso, index) => (
                <li key={paso} className="flex gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1c1915] text-xs text-white">{index + 1}</span>
                  <span className="pt-1">{paso}</span>
                </li>
              ))}
              {data.project.legal && <p className="pt-2 text-xs text-[#6b6258]">{data.project.legal}</p>}
            </ol>
          )}
        </Drawer>
      )}
      {cookies === "ask" && data.project.cookies && (
        <div className="cookie" data-testid="cookies">
          <p className="max-w-xl text-sm">{data.project.cookies}</p>
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={() => { localStorage.setItem("adastra-cookies", "0"); setCookies("no"); }}>Solo necesarias</button>
            <button type="button" className="chip chip-solid" onClick={() => { localStorage.setItem("adastra-cookies", "1"); setCookies("yes"); }}>Aceptar</button>
          </div>
        </div>
      )}
      <Pixels project={data.project} accepted={cookies === "yes"} unitCode={active?.codigo ?? null} />
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
    obra: "Avance de obra",
    secciones: "Secciones",
    pasos: "Cómo se paga",
  };
  return titles[sheet ?? ""] ?? "";
}

function HoverTip({ tip, overlays, units }: { tip: { id: string; x: number; y: number }; overlays: Overlay[]; units: Unit[] }) {
  const overlay = overlays.find((item) => item.id === tip.id);
  const unit = units.find((item) => item.id === (overlay?.vinculo_id ?? tip.id));
  if (!unit) return null;
  return (
    <div className="unit-tip" style={{ left: tip.x, top: tip.y }}>
      <p className="font-medium">{unit.codigo} · {STATUS_LABEL[unit.estado]}</p>
      <p>{unit.tipologia}{unit.m2_totales != null ? ` · ${formatM2(unit.m2_totales)} m²` : ""}</p>
      <p>{unit.mostrar_precio && unit.precio != null ? formatUsd(unit.precio) : "Consultar"}</p>
    </div>
  );
}

function Stage({
  src,
  cover,
  focus = { x: 0.5, y: 0.5 },
  shift = 0,
  clip,
  zoom,
  pan,
  video,
  poster,
  children,
  veil,
  stageRef,
  onVideoDone,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
}: {
  src: string;
  cover: boolean;
  focus?: { x: number; y: number };
  shift?: number;
  clip?: [number, number][];
  zoom: number;
  pan: { x: number; y: number };
  video: string | null;
  poster?: string;
  children?: React.ReactNode;
  veil?: React.ReactNode;
  stageRef: React.RefObject<HTMLDivElement | null>;
  onVideoDone: () => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onWheel: (event: WheelEvent) => void;
}) {
  const [box, setBox] = useState({ w: 1, h: 1 });
  const [natural, setNatural] = useState({ w: 16, h: 9 });
  const doneRef = useRef(onVideoDone);
  doneRef.current = onVideoDone;
  useEffect(() => {
    if (!video) return;
    const timer = window.setTimeout(() => doneRef.current(), 20000);
    return () => window.clearTimeout(timer);
  }, [video]);
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
  const frame = cover ? coverFrame(box.w, box.h, natural.w, natural.h, focus.x, focus.y, shift) : contain(box.w, box.h, natural.w, natural.h);
  return (
    <div
      ref={stageRef}
      className="absolute inset-0 touch-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
            poster={poster}
            autoPlay
            muted
            playsInline
            preload="auto"
            className="clip absolute inset-0 h-full w-full object-fill"
            onCanPlay={(event) => {
              const node = event.currentTarget;
              void node.play().catch(() => doneRef.current());
            }}
            onPlaying={(event) => { event.currentTarget.dataset.ready = "1"; }}
            onEnded={onVideoDone}
            onError={onVideoDone}
          />
        )}
        <div
          className="absolute inset-0"
          style={clip && clip.length >= 3 ? { clipPath: `polygon(${clip.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(",")})` } : undefined}
        >
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="hotspots absolute inset-0 h-full w-full">
            {children}
          </svg>
          {veil}
        </div>
      </div>
    </div>
  );
}

function Menu({ lite, extras, onClose, onPick }: { lite: boolean; extras: [string, string][]; onClose: () => void; onPick: (action: string) => void }) {
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
    ...extras,
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
    <aside className="drawer sheet absolute inset-x-0 bottom-0 z-30 max-h-[78vh] overflow-auto rounded-t-3xl p-5 text-[#1c1915] md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[420px] md:rounded-none">
      <div className="handle" />
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
  const [active, setActive] = useState<string | null>(null);
  if (lat == null || lng == null) return <p className="text-sm text-[#6b6258]">El proyecto todavía no tiene coordenadas.</p>;
  const selected = pois.find((poi) => poi.id === active) ?? null;
  return (
    <div className="space-y-3 text-sm text-[#1c1915]">
      <PoiMap lat={lat} lng={lng} nombre={project.nombre} pois={pois} selectedId={active} onSelect={setActive} className="h-64 w-full overflow-hidden rounded-2xl md:h-80" />
      <p className="text-xs text-[#6b6258]">Los puntos cercanos son de demostración. La línea es un recorrido orientativo, no un camino real.</p>
      {selected && (
        <div className="rounded-2xl bg-white p-3">
          <p className="font-medium">{selected.nombre}</p>
          <p className="text-[#6b6258]">{poiLabel(selected.categoria)}{selected.distancia_m != null ? ` · ${selected.distancia_m} m` : ""}</p>
          {selected.distancia_m != null && (
            <p className="text-[#6b6258]">A pie unos {travelMinutes(selected.distancia_m, 4.5)} min · en auto unos {travelMinutes(selected.distancia_m, 28)} min</p>
          )}
          {selected.descripcion && <p className="mt-1">{selected.descripcion}</p>}
        </div>
      )}
      <ul className="space-y-2">
        {pois.map((poi) => (
          <li key={poi.id}>
            <button type="button" className={`flex w-full items-start gap-2 rounded-2xl px-2 py-2 text-left ${active === poi.id ? "bg-white" : ""}`} onClick={() => setActive(poi.id)}>
              <i className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: poiColor(poi.categoria) }} />
              <span>
                <span className="block font-medium">{poi.nombre}</span>
                <span className="text-[#6b6258]">{poiLabel(poi.categoria)}{poi.distancia_m != null ? ` · ${poi.distancia_m} m` : ""}</span>
              </span>
            </button>
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

function moneyLabel(value: number, moneda: "USD" | "ARS") {
  if (moneda === "USD") return formatUsd(value);
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function safeId(value: string, pattern: RegExp) {
  return pattern.test(value) ? value : "";
}

function Pixels({ project, accepted, unitCode }: { project: ShowroomData["project"]; accepted: boolean; unitCode: string | null }) {
  useEffect(() => {
    if (!accepted) return;
    const ga4 = safeId(project.ga4, /^G-[A-Z0-9]+$/);
    const gtm = safeId(project.gtm, /^GTM-[A-Z0-9]+$/);
    const pixel = safeId(project.pixel, /^\d{5,20}$/);
    if (ga4 && !document.getElementById("adastra-ga4")) {
      const src = document.createElement("script");
      src.id = "adastra-ga4";
      src.async = true;
      src.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
      document.head.appendChild(src);
      const inline = document.createElement("script");
      inline.id = "adastra-ga4-inline";
      inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`;
      document.head.appendChild(inline);
    }
    if (gtm && !document.getElementById("adastra-gtm")) {
      const inline = document.createElement("script");
      inline.id = "adastra-gtm";
      inline.text = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`;
      document.head.appendChild(inline);
    }
    if (pixel && !document.getElementById("adastra-pixel")) {
      const inline = document.createElement("script");
      inline.id = "adastra-pixel";
      inline.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`;
      document.head.appendChild(inline);
    }
  }, [accepted, project.ga4, project.gtm, project.pixel]);

  useEffect(() => {
    if (!accepted || !project.remarketing || !unitCode) return;
    const pixel = safeId(project.pixel, /^\d{5,20}$/);
    if (!pixel) return;
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    fbq?.("track", "ViewContent", { content_ids: [unitCode], content_type: "product" });
  }, [accepted, project.remarketing, project.pixel, unitCode]);

  return null;
}

function UnitPanel({
  unit,
  project,
  plans,
  fallback,
  plantaImagen,
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
  project: ShowroomData["project"];
  plans: ShowroomData["plans"];
  fallback: string;
  plantaImagen: string | null;
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
  const ficha = project.ficha;
  const sinPlano = !unit.plano;
  const photos = [
    ...(unit.plano ? [unit.plano] : []),
    ...unit.renders,
    ...(!unit.plano && plantaImagen ? [plantaImagen] : []),
  ];
  if (!photos.length) photos.push(fallback);
  const current = photos[photo] ?? photos[0];
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [buyer, setBuyer] = useState("");
  const [mail, setMail] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setPlanId(plans[0]?.id ?? "");
    setNote("");
  }, [unit.id, plans]);
  const plan = plans.find((item) => item.id === planId) ?? plans[0];
  const shown = ficha.precio && unit.precio != null && plan ? showQuote(unit.precio, plan, project.usdArs, project.cac) : null;

  async function downloadQuote() {
    if (!plan) return;
    if (!buyer.trim()) {
      setNote("Escribí un nombre para la cotización.");
      return;
    }
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
    setNote(mail ? "Descargamos el PDF. Si el correo está activo, también se lo mandamos." : "Descargamos el PDF.");
  }

  async function emailSheet() {
    if (!mail.trim()) {
      setNote("Escribí un email para enviar la ficha.");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/public/ficha", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: project.slug, codigo: unit.codigo, email: mail }),
    });
    const json = await response.json().catch(() => ({}));
    setBusy(false);
    setNote(typeof json.message === "string" ? json.message : "No pudimos enviar la ficha.");
  }

  return (
    <aside data-testid="unit-panel" className="unit-card sheet absolute inset-x-0 bottom-0 z-30 max-h-[78vh] overflow-auto rounded-t-3xl text-[#1c1915] md:inset-y-0 md:left-0 md:right-auto md:max-h-none md:w-[400px] md:rounded-none">
      <div className="handle md:hidden" />
      <div className="relative">
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="h-52 w-full object-cover" />
        )}
        <button type="button" className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm shadow" onClick={onClose}>Cerrar</button>
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
        {sinPlano && <p className="text-sm text-[#6b6258]">Esta unidad no tiene un plano propio. La marcamos en la planta.</p>}
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#6b6258]">Vista</p>
          {unit.vista_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={unit.vista_url} alt={unit.orientacion ? `Vista al ${unit.orientacion}` : "Vista de la unidad"} className="mt-2 h-36 w-full rounded-2xl object-cover" style={{ objectPosition: unit.vista_encuadre }} />
          ) : (
            <p className="mt-2 rounded-2xl bg-[#f4efe6] px-3 py-6 text-sm text-[#6b6258]">Esta unidad todavía no tiene una vista cargada.</p>
          )}
        </div>
        <p className="font-serif text-3xl">{ficha.precio && unit.mostrar_precio && unit.precio != null ? formatUsd(unit.precio) : "Consultar"}</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {unit.m2_cubiertos != null && <div><dt className="text-[#6b6258]">Cubiertos</dt><dd>{formatM2(unit.m2_cubiertos)} m²</dd></div>}
          {unit.m2_totales != null && <div><dt className="text-[#6b6258]">Totales</dt><dd>{formatM2(unit.m2_totales)} m²</dd></div>}
          {unit.dormitorios != null && <div><dt className="text-[#6b6258]">Dormitorios</dt><dd>{unit.dormitorios}</dd></div>}
          {unit.banos != null && <div><dt className="text-[#6b6258]">Baños</dt><dd>{unit.banos}</dd></div>}
          {unit.orientacion && <div><dt className="text-[#6b6258]">Orientación</dt><dd>{unit.orientacion}</dd></div>}
          {ficha.ambientes && unit.ambientes != null && <div><dt className="text-[#6b6258]">Ambientes</dt><dd>{unit.ambientes}</dd></div>}
          {unit.vista && <div><dt className="text-[#6b6258]">Vista</dt><dd>{unit.vista}</dd></div>}
        </dl>
        {unit.descripcion && <p className="text-sm">{unit.descripcion}</p>}
        {unit.features.length > 0 && <p className="text-sm">{unit.features.join(" · ")}</p>}
        <ul className="text-sm">
          {unit.custom.map((field) => (
            <li key={field.clave}>{field.nombre}: {typeof field.value === "boolean" ? (field.value ? "sí" : "no") : typeof field.value === "number" ? `${formatNumber(field.value)}${field.unidad ? ` ${field.unidad}` : ""}` : String(field.value)}</li>
          ))}
        </ul>
        {shown && plan && (
          <div className="space-y-2 rounded-2xl bg-white/70 p-3" data-testid="cotizador">
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
            {shown.refuerzos.map((item) => (
              <p key={item.meses.join("-")} className="text-xs text-[#6b6258]">Refuerzo {item.pct}% en el mes {item.meses.join(" y ")}: {moneyLabel(item.monto, shown.moneda)}</p>
            ))}
            {shown.indice && <p className="text-xs text-[#6b6258]">{shown.indice}</p>}
            <p className="text-xs text-[#6b6258]">{shown.legal}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {ficha.whatsapp && <button type="button" className="chip chip-wa" onClick={onWhatsapp}>WhatsApp</button>}
          {unit.tour && <button type="button" className="chip" onClick={onTour}>Tour 360</button>}
          {unit.vista_url && <button type="button" className="chip" onClick={onVista}>Vista</button>}
          {unit.acabados.length > 0 && <button type="button" className="chip" onClick={onAcabados}>Acabados</button>}
          <button type="button" className="chip" onClick={onCompare}>{compared ? "En el comparador" : "Comparar"}</button>
          {ficha.compartir && <button type="button" className="chip" onClick={onShare}>Compartir</button>}
          {ficha.pdf && <a className="chip" href={`/api/public/ficha?slug=${project.slug}&codigo=${encodeURIComponent(unit.codigo)}`} target="_blank" rel="noreferrer">Ficha PDF</a>}
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
            <textarea name="mensaje" rows={2} placeholder={`Hola, quiero saber más de ${unit.codigo} en ${project.nombre}`} className="field" />
            {error && <p className="text-sm text-[#b42318]">{error}</p>}
            <button disabled={sending} className="chip chip-solid">{sending ? "Enviando…" : "Enviar consulta"}</button>
          </form>
        )}
        {shown && (
          <div className="space-y-2 border-t border-[#e4d9c8] pt-3">
            <p className="text-sm font-medium">Cotización en PDF</p>
            <input value={buyer} onChange={(event) => setBuyer(event.target.value)} placeholder="Nombre" className="field" />
            <input value={mail} onChange={(event) => setMail(event.target.value)} type="email" placeholder="Email" className="field" />
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} className="chip chip-accent" onClick={() => void downloadQuote()}>{busy ? "Armando…" : "Descargar cotización"}</button>
              {ficha.pdf && <button type="button" disabled={busy} className="chip" onClick={() => void emailSheet()}>Enviar ficha</button>}
            </div>
            {note && <p className="text-xs text-[#6b6258]">{note}</p>}
          </div>
        )}
        {project.legal && <p className="text-xs text-[#6b6258]">{project.legal}</p>}
      </div>
    </aside>
  );
}
