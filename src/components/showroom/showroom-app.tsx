"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { PoiMap } from "@/components/maps/poi-map";
import { FacadeVeil } from "@/components/showroom/facade-veil";
import { maskReady } from "@/lib/domain/facade-mask";
import { showQuote } from "@/lib/domain/finance";
import { STATUS_COLOR, STATUS_LABEL, formatM2, formatNumber, formatUsd } from "@/lib/domain/format";
import { travelMinutes } from "@/lib/domain/geo";
import { poiColor, poiLabel } from "@/lib/domain/poi";
import "./showroom.css";
import { coverFrame, portraitCenter } from "@/lib/domain/cover-frame";
import { AmenityStage, ContactStage, FullIcon, GalleryStage, HoverCard, MapStage, PhMenu, QrIcon, RecorridoStage, UnitSheet, VideoStage } from "@/components/showroom/ph-panels";
import { floorKey, sceneKey, sortUnits, tourEmbed, unitMatches, videosToLoad, type FlowFilters } from "@/lib/domain/showroom-flow";
import type { ShowroomData } from "@/lib/services/present";

type Unit = ShowroomData["units"][number];
type Overlay = ShowroomData["overlays"][number];
type Sheet = null | "menu" | "filtros" | "galeria" | "amenities" | "mapa" | "info" | "comparar" | "tour" | "compartir" | "vista" | "acabados" | "obra" | "secciones" | "pasos" | "recorridos" | "video" | "contacto";
type UnitTab = "galeria" | "vistas" | "planta3d" | "planos" | "recorrido" | "video";

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

function plantaLabel(nombre: string, numero: number) {
  if (/^piso\s+\d+/i.test(nombre)) return `Planta ${numero}`;
  return nombre;
}

function bandOf(points: [number, number][]): [number, number][] {
  if (points.length < 4) return points;
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const topLeft = points[0]!;
  const topRight = points[1]!;
  const bottomRight = points[2]!;
  const bottomLeft = points[3]!;
  return [lerp(topLeft, bottomLeft, 0.4), lerp(topRight, bottomRight, 0.4), lerp(topRight, bottomRight, 0.58), lerp(topLeft, bottomLeft, 0.58)];
}

function tabReady(unit: Unit, tab: UnitTab, plantaImagen: string | null) {
  if (tab === "galeria") return unit.galeria.length > 0;
  if (tab === "vistas") return Boolean(unit.vista_url);
  if (tab === "planta3d") return Boolean(unit.planta3d);
  if (tab === "planos") return Boolean(unit.plano || plantaImagen);
  if (tab === "recorrido") return Boolean(unit.tour);
  if (tab === "video") return unit.videos.length > 0;
  return false;
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
  const [card, setCard] = useState<{ id: string; x: number; y: number } | null>(null);
  const [unitTab, setUnitTab] = useState<UnitTab>("planta3d");
  const [filterPop, setFilterPop] = useState<null | "area" | "estado" | "dorm">(null);
  const [dorm, setDorm] = useState("todos");
  const [area, setArea] = useState<{ min: number; max: number } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const pinned = useRef(false);
  const cardTimer = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const swipe = useRef<{ x: number; y: number; lx: number; ly: number; shift: number } | null>(null);
  const moved = useRef(false);

  const scene = walk[sceneIndex] ?? walk[0];
  const building = data.buildings.find((item) => item.id === scene?.building_id) ?? null;
  const floor = data.buildings.flatMap((item) => item.floors).find((item) => item.id === floorId) ?? null;
  const active = data.units.find((unit) => unit.id === unitId) ?? null;
  const videos = entered && phase === "escena" ? videosToLoad(walk, sceneIndex, lite) : { current: null, next: null };

  const areaBound = useMemo(() => {
    const values = data.units.map((unit) => unit.m2_totales).filter((value): value is number => value != null && value > 0);
    if (!values.length) return { min: 0, max: 100 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [data.units]);
  const areaMin = area?.min ?? areaBound.min;
  const areaMax = area?.max ?? areaBound.max;
  const areaActive = area != null && (area.min > areaBound.min + 0.05 || area.max < areaBound.max - 0.05);
  const filtering = filters.estado !== "todos" || filters.ambientes !== "todos" || filters.orientacion !== "todas" || Boolean(filters.precioMax) || dorm !== "todos" || areaActive || Object.values(extra).some((value) => value && value !== "todos");

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
      if (dorm !== "todos" && String(unit.dormitorios ?? "") !== dorm) return false;
      if (areaActive && unit.m2_totales != null && (unit.m2_totales < areaMin || unit.m2_totales > areaMax)) return false;
      return true;
    }), filters.sort);
  }, [data.units, data.filters.fields, filters, extra, dorm, areaActive, areaMin, areaMax]);

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

  function forgetCard() {
    if (cardTimer.current) window.clearTimeout(cardTimer.current);
    pinned.current = false;
    setCard(null);
    setHoverId(null);
  }

  function holdCard(unit: Unit, x: number, y: number, pin: boolean) {
    if (pinned.current && !pin) return;
    if (cardTimer.current) window.clearTimeout(cardTimer.current);
    if (pin) pinned.current = true;
    setCard((current) => (current?.id === unit.id && !pin ? current : { id: unit.id, x, y }));
  }

  function releaseCard() {
    if (pinned.current) return;
    if (cardTimer.current) window.clearTimeout(cardTimer.current);
    cardTimer.current = window.setTimeout(() => {
      if (!pinned.current) setCard(null);
    }, 220);
  }

  function enterUnit(unit: Unit, origen: string, tab?: UnitTab) {
    forgetCard();
    const plantaImagen = data.buildings.flatMap((item) => item.floors).find((item) => item.id === unit.floor_id)?.plano ?? null;
    const order: UnitTab[] = ["planta3d", "planos", "galeria", "vistas", "recorrido", "video"];
    const next = tab && tabReady(unit, tab, plantaImagen) ? tab : order.find((item) => tabReady(unit, item, plantaImagen)) ?? "planos";
    setUnitTab(next);
    setPhoto(0);
    const onPlan = phase === "planta" || scene?.tipo === "masterplan";
    if (onPlan) chooseUnit(unit, origen);
    else revealUnit(unit);
  }

  function onZone(overlay: Overlay, point?: { x: number; y: number }) {
    if (moved.current || bridge) return;
    if (overlay.vinculo_tipo === "building" && overlay.vinculo_id) {
      goBuilding(overlay.vinculo_id);
      return;
    }
    const unit = data.units.find((item) => item.id === overlay.vinculo_id);
    if (!unit) return;
    setTip(null);
    const x = point?.x ?? window.innerWidth / 2;
    const y = point?.y ?? window.innerHeight / 2;
    holdCard(unit, x, y, true);
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

  async function openQr(unit?: Unit | null) {
    const url = new URL(`/s/${data.project.slug}`, window.location.origin);
    if (unit?.planta) url.searchParams.set("planta", unit.planta);
    if (unit) url.searchParams.set("unidad", unit.codigo);
    else if (floor) url.searchParams.set("planta", floor.clave);
    else if (scene) url.searchParams.set("escena", sceneKey(scene.nombre));
    setQr(await QRCode.toDataURL(url.toString(), { margin: 1, width: 320, color: { dark: "#1c2733", light: "#ffffff" } }));
    setSheet("compartir");
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
  const showRail = entered && phase === "planta" && !active && Boolean(tower && tower.floors.length > 0);
  const polygons = zones();
  const cardUnit = card ? data.units.find((unit) => unit.id === card.id) ?? null : null;
  const contextText = phase === "planta" && floor ? plantaLabel(floor.nombre, floor.numero) : scene?.tipo === "aereo" || scene?.tipo === "exterior" ? "Vista aérea" : scene?.nombre ?? "";

  return (
    <main className="showroom relative h-[100dvh] overflow-hidden bg-[#12110f] text-white" data-testid="showroom" style={{ ["--accent" as string]: data.project.acento }}>
      <Stage
        stageRef={stageRef}
        src={image}
        cover={fitCover}
        focus={{ x: phase === "escena" ? portraitCenter(scene?.nombre) : 0.5, y: 0.48 }}
        shift={coverShift}
        clip={phase === "escena" && scene?.tipo === "exterior" ? scene.silueta ?? undefined : undefined}
        zoom={zoom}
        pan={pan}
        soft={!entered}
        backdrop={phase === "planta" ? scene?.imagen_url ?? data.facade : null}
        video={bridge ?? (playing && videos.current ? videos.current : null)}
        poster={image}
        onVideoDone={() => {
          if (bridge) finishBridge();
          else setPlaying(false);
        }}
        marks={phase === "planta" ? polygons.flatMap((overlay) => {
          const unit = overlay.vinculo_tipo === "unit" ? data.units.find((item) => item.id === overlay.vinculo_id) : undefined;
          if (!unit) return [];
          const [x, y] = centroid(overlay.puntos);
          return [{ id: overlay.id, x, y, color: STATUS_COLOR[unit.estado] ?? "#1f8a5b", label: unit.codigo, dim: !matched(unit.id) }];
        }) : []}
        onPointerDown={(event) => {
          moved.current = false;
          const target = event.target as HTMLElement;
          if (!target.closest("g") && !target.closest(".hover-card")) {
            pinned.current = false;
            setCard(null);
          }
          if (zoom > 1) {
            drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
            return;
          }
          if (phase === "escena" && entered && !bridge) swipe.current = { x: event.clientX, y: event.clientY, lx: event.clientX, ly: event.clientY, shift: coverShift };
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
          if (!entered || active) return;
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
              const unit = unitId ? data.units.find((item) => item.id === unitId) : undefined;
              if (unit && point && !window.matchMedia("(pointer: coarse)").matches) holdCard(unit, point.x, point.y, false);
              else if (!unitId) releaseCard();
            }}
            onPick={(unitId) => {
              if (moved.current) return;
              const unit = data.units.find((item) => item.id === unitId);
              if (!unit) return;
              setTip(null);
              holdCard(unit, window.innerWidth / 2, window.innerHeight * 0.42, true);
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
          const fillOpacity = aerial ? 0.01 : exterior && veils ? 0 : hovered || selected ? 0.22 : 0;
          return (
            <g
              key={overlay.id}
              onClick={(event) => { event.stopPropagation(); onZone(overlay, { x: event.clientX, y: event.clientY }); }}
              onMouseEnter={(event) => {
                if (!unit) return;
                if (window.matchMedia("(pointer: coarse)").matches) return;
                setHoverId(overlay.id);
                holdCard(unit, event.clientX, event.clientY, false);
              }}
              onMouseLeave={() => {
                setHoverId((current) => (current === overlay.id ? null : current));
                releaseCard();
              }}
              className="cursor-pointer"
            >
              <polygon
                points={overlay.puntos.map((point) => point.join(",")).join(" ")}
                fill={aerial ? "#c4a574" : color}
                fillOpacity={on ? fillOpacity : 0.04}
                stroke="transparent"
                style={{ transition: "fill-opacity 180ms ease" }}
              />
              {exterior && veils && (
                <polygon
                  points={bandOf(overlay.puntos).map((point) => point.join(",")).join(" ")}
                  fill={color}
                  fillOpacity={hovered ? 0.92 : on ? 0.78 : 0.12}
                  stroke="transparent"
                  style={{ transition: "fill-opacity 180ms ease" }}
                  pointerEvents="none"
                />
              )}
              {aerial && (
                <>
                  <circle cx={cx} cy={cy} r="0.028" fill="#c4a574" stroke="#fff" strokeWidth="0.006" />
                  <text x={cx} y={cy + 0.055} textAnchor="middle" fontSize="0.028" fill="#fff">{overlay.etiqueta}</text>
                </>
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
      {cardUnit && !active && (
        <HoverCard
          unit={cardUnit}
          x={card?.x ?? 0}
          y={card?.y ?? 0}
          onEnter={() => enterUnit(cardUnit, phase === "planta" ? "planta" : "fachada")}
          onTour={() => enterUnit(cardUnit, "tour", "recorrido")}
          onKeep={() => { if (cardTimer.current) window.clearTimeout(cardTimer.current); }}
          onLeave={releaseCard}
        />
      )}

      <div className={`chrome absolute left-4 top-4 z-[36] ${active ? "with-unit" : ""}`}>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Menú" className="round accent" onClick={() => setSheet(sheet === "menu" ? null : "menu")}>
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
              <span className="block h-0.5 w-4 bg-current" />
            </span>
          </button>
          {entered && <button type="button" aria-label="Volver" className="round" onClick={stepBack}>‹</button>}
          <button type="button" aria-label="Compartir" className="round" onClick={() => void openQr(active)}>
            <QrIcon />
          </button>
        </div>
        {entered && <p className="context-label">{contextText}</p>}
      </div>

      {entered && !active && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          {disp && phase === "escena" ? (
            <>
              <button type="button" className={filterPop === "area" ? "pill on" : "pill"} onClick={() => setFilterPop(filterPop === "area" ? null : "area")}>Filtrar área</button>
              <button type="button" className={filterPop === "estado" ? "pill on" : "pill"} onClick={() => setFilterPop(filterPop === "estado" ? null : "estado")}>Filtrar disponibilidad</button>
              <button type="button" className={filterPop === "dorm" ? "pill on" : "pill"} onClick={() => setFilterPop(filterPop === "dorm" ? null : "dorm")}>Filtrar dormitorios</button>
            </>
          ) : (
            <>
              <button type="button" className={phase === "escena" && !disp ? "pill on" : "pill"} onClick={() => { setDisponibilidad(false); const index = walk.findIndex((item) => item.tipo === "aereo" || item.tipo === "exterior"); setEntered(true); setPhase("escena"); setUnitId(null); if (index >= 0) setSceneIndex(index); }}>Vista aérea</button>
              {building && building.floors[0] && <button type="button" className={phase === "planta" ? "pill on" : "pill"} onClick={() => { setDisponibilidad(false); goPlans(); }}>Ver plantas</button>}
              <button type="button" className="pill" onClick={() => setSheet("galeria")}>Galería</button>
            </>
          )}
          <button type="button" aria-label="Pantalla completa" className="round" onClick={() => { if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen(); }}>
            <FullIcon />
          </button>
          {disp && phase === "escena" && filterPop === "area" && (
            <div className="pop">
              <p className="mb-2 text-sm font-medium">Área</p>
              <input type="range" min={areaBound.min} max={areaBound.max} step="0.1" value={areaMin} onChange={(event) => setArea({ min: Math.min(Number(event.target.value), areaMax), max: areaMax })} className="w-full" />
              <input type="range" min={areaBound.min} max={areaBound.max} step="0.1" value={areaMax} onChange={(event) => setArea({ min: areaMin, max: Math.max(Number(event.target.value), areaMin) })} className="mt-1 w-full" />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <label>Mínimo
                  <input value={areaMin.toFixed(2)} onChange={(event) => setArea({ min: Number(event.target.value) || areaBound.min, max: areaMax })} className="mt-1 w-full rounded-full border border-[#e6e0d8] px-3 py-1" />
                  <span className="text-[#8a8178]"> m²</span>
                </label>
                <label>Máximo
                  <input value={areaMax.toFixed(2)} onChange={(event) => setArea({ min: areaMin, max: Number(event.target.value) || areaBound.max })} className="mt-1 w-full rounded-full border border-[#e6e0d8] px-3 py-1" />
                  <span className="text-[#8a8178]"> m²</span>
                </label>
              </div>
            </div>
          )}
          {disp && phase === "escena" && filterPop === "estado" && (
            <div className="pop">
              {([["vendida", "Vendido"], ["reservada", "Reservado"], ["disponible", "Disponible"]] as const).map(([value, label]) => (
                <label key={value} className="radio" onClick={() => setFilters({ ...filters, estado: filters.estado === value ? "todos" : value })}>
                  <input type="radio" name="estado" readOnly checked={filters.estado === value} />
                  {label}
                </label>
              ))}
            </div>
          )}
          {disp && phase === "escena" && filterPop === "dorm" && (
            <div className="pop">
              {["1", "2", "3"].map((value) => (
                <label key={value} className="radio" onClick={() => setDorm(dorm === value ? "todos" : value)}>
                  <input type="radio" name="dorm" readOnly checked={dorm === value} />
                  {value}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {entered && disp && phase === "escena" && !active && !filterPop && (
        <p className="pointer-events-none absolute right-4 top-[4.6rem] z-20 rounded-lg bg-[#1c2733]/80 px-3 py-1 text-xs text-white">Disponibilidad · Departamentos</p>
      )}

      {entered && !active && phase === "escena" && walk.length > 1 && (
        <>
          <button type="button" aria-label="Girar a la izquierda" className="spin-btn absolute left-3 top-1/2 z-30 -translate-y-1/2" onClick={() => spin(-1)}>‹</button>
          <button type="button" aria-label="Girar a la derecha" className="spin-btn absolute right-3 top-1/2 z-30 -translate-y-1/2" onClick={() => spin(1)}>›</button>
          <span className="giro right-3">Giro 360</span>
        </>
      )}

      {entered && !active && (
        <div className="absolute bottom-5 left-4 z-20 flex flex-col gap-2">
          <button type="button" aria-label="Acercar" className="round" onClick={() => setZoom((value) => Math.min(4, value + 0.25))}>+</button>
          <button type="button" aria-label="Alejar" className="round" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}>−</button>
        </div>
      )}

      {showRail && tower && (
        <aside className="floor-rail absolute right-3 top-1/2 z-20 flex max-h-[78vh] -translate-y-1/2 flex-col gap-0.5 overflow-auto rounded-full px-1.5 py-2" data-testid="floor-rail">
          {tower.floors.map((item) => {
            const current = item.id === floorId;
            return (
              <button key={item.id} type="button" title={`${item.libres} libres`} className={current ? "on" : ""} onClick={() => openFloor(item.id, "replace")}>
                {floorMark(item.nombre, item.numero)}
              </button>
            );
          })}
        </aside>
      )}

      {active && (
        <UnitSheet
          unit={active}
          tab={unitTab}
          setTab={setUnitTab}
          project={data.project}
          plans={data.plans}
          fallback={data.facade}
          plantaImagen={data.buildings.flatMap((item) => item.floors).find((item) => item.id === active.floor_id)?.plano ?? null}
          footprint={data.overlays.find((overlay) => overlay.contenedor === "floor" && overlay.vinculo_id === active.id)?.puntos ?? null}
          sent={sent}
          sending={sending}
          error={error}
          photo={photo}
          setPhoto={setPhoto}
          onClose={stepBack}
          onChangeFloor={stepBack}
          onWhatsapp={() => whatsapp(active)}
          onShare={() => void share(active)}
          onLead={submitLead}
        />
      )}

      {sheet === "menu" && (
        <PhMenu
          lite={lite}
          brochure={Boolean(data.project.brochure)}
          redes={data.project.redes}
          whatsapp={data.project.contacto.whatsapp}
          brand={data.project.nombre}
          logo={data.project.logo}
          onClose={() => setSheet(null)}
          onPick={(action) => {
            setSheet(null);
            if (action === "intro") { setEntered(false); setUnitId(null); setDisponibilidad(false); return; }
            if (action === "edificio") {
              setDisponibilidad(false);
              const index = walk.findIndex((item) => item.tipo === "exterior");
              setEntered(true);
              setPhase("escena");
              setUnitId(null);
              if (index >= 0) setSceneIndex(index);
              return;
            }
            if (action === "plantas") { setEntered(true); setDisponibilidad(false); goPlans(); return; }
            if (action === "disponibilidad") {
              setEntered(true);
              setPhase("escena");
              setUnitId(null);
              const index = walk.findIndex((item) => item.tipo === "exterior");
              if (index >= 0) setSceneIndex(index);
              setDisponibilidad(true);
              return;
            }
            if (action === "amenities") setSheet("amenities");
            if (action === "recorridos") setSheet("recorridos");
            if (action === "video") setSheet("video");
            if (action === "galeria") setSheet("galeria");
            if (action === "mapa") setSheet("mapa");
            if (action === "contacto") setSheet("contacto");
            if (action === "brochure" && data.project.brochure) window.open(data.project.brochure, "_blank", "noopener");
            if (action === "obra") setSheet("obra");
            if (action === "pasos") setSheet("pasos");
            if (action === "lite") {
              const next = !lite;
              setLite(next);
              sessionStorage.setItem("adastra-lite", next ? "1" : "0");
              if (next) setPlaying(false);
            }
          }}
        />
      )}

      {sheet === "compartir" && qr && (
        <div className="absolute right-4 top-20 z-40 w-56 rounded-2xl bg-white p-3 text-center text-[#1c1915] shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR" className="mx-auto h-44 w-44" />
          <button type="button" className="mt-2 text-sm underline" onClick={() => void share(active)}>Copiar link</button>
          {copied && <p className="text-xs text-[#6b6258]">Copiamos el link.</p>}
          <button type="button" className="mt-2 block w-full text-sm" onClick={() => setSheet(null)}>Cerrar</button>
        </div>
      )}

      {sheet === "galeria" && <GalleryStage images={data.gallery} title={data.project.nombre} onClose={() => setSheet(null)} />}
      {sheet === "amenities" && <AmenityStage amenities={data.amenities} onClose={() => setSheet(null)} />}
      {sheet === "mapa" && <MapStage project={data.project} pois={data.pois} onClose={() => setSheet(null)} />}
      {sheet === "recorridos" && (
        <RecorridoStage
          options={Array.from(new Map(data.units.filter((unit) => unit.tour).map((unit) => [unit.tipologia, unit.tour!] as const)).entries()).map(([nombre, tour]) => ({ nombre, tour }))}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "video" && <VideoStage src={cover?.video_url ?? null} title={data.project.nombre} onClose={() => setSheet(null)} />}
      {sheet === "contacto" && <ContactStage project={data.project} organization={data.organization} onWhatsapp={() => whatsapp(null)} onClose={() => setSheet(null)} />}

      {(sheet === "obra" || sheet === "secciones" || sheet === "pasos" || sheet === "comparar") && (
        <Drawer title={sheetTitle(sheet)} onClose={() => setSheet(null)}>
          {sheet === "comparar" && (
            <div className="grid gap-3 md:grid-cols-3">
              {compare.map((id) => {
                const unit = data.units.find((item) => item.id === id);
                if (!unit) return null;
                return (
                  <article key={id} className="rounded-2xl border border-[#e4d9c8] p-3 text-sm text-[#1c1915]">
                    <p className="text-2xl">{unit.codigo}</p>
                    <p>{STATUS_LABEL[unit.estado]}</p>
                    <button type="button" className="mt-2 block" onClick={() => { setSheet(null); enterUnit(unit, "comparar"); }}>Ver ficha</button>
                  </article>
                );
              })}
            </div>
          )}
          {sheet === "obra" && (
            <ol className="space-y-4">
              {data.progress.map((item) => (
                <li key={item.id}>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9a6240]">{item.fecha}</p>
                  <p className="text-2xl text-[#1c1915]">{item.titulo}</p>
                  <p className="text-sm text-[#6b6258]">{item.descripcion}</p>
                </li>
              ))}
            </ol>
          )}
          {sheet === "secciones" && (
            <div className="space-y-5">
              {data.sections.map((item) => (
                <article key={item.id}>
                  <h3 className="text-2xl text-[#1c1915]">{item.titulo}</h3>
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
  soft = false,
  backdrop = null,
  marks = [],
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
  soft?: boolean;
  backdrop?: string | null;
  marks?: { id: string; x: number; y: number; color: string; label: string; dim: boolean }[];
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
      {backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backdrop} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ filter: "blur(18px) brightness(0.42)", transform: "scale(1.08)" }} />
      )}
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
          className={`stage-fade h-full w-full object-fill ${soft ? "stage-soft" : ""}`}
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
        {marks.map((mark) => (
          <span key={mark.id} className={mark.dim ? "plan-pill dim" : "plan-pill"} style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%` }}>
            <i style={{ background: mark.color }} />
            {mark.label}
          </span>
        ))}
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
