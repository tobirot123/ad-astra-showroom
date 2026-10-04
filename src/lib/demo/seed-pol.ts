import pol from "@/lib/demo/pol-data.json";
import { exteriorCells } from "@/lib/demo/pol-faces";
import { seedId } from "@/lib/domain/ids";
import { VISTA_POR_ORIENTACION } from "@/lib/domain/vista";
import type { AnalyticsEvent, Database, MediaAsset, MediaLink, Unit } from "@/lib/domain/types";

const PROJECT = seedId(20);
const BUILDING = seedId(30);
const ROOT = "/demo/pol";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function coveredAreas(row: { tipo: string; m2: number | null; m2_int: number | null; m2_ext: number | null }) {
  const exterior = round2(row.m2_ext ?? 0);
  if (row.tipo !== "departamento") {
    const covered = round2(Math.max(row.m2 ?? 0, row.m2_int ?? 0));
    return {
      m2_cubiertos: covered > 0 ? covered : null,
      m2_semicubiertos: 0,
      m2_descubiertos: exterior,
      m2_totales: covered > 0 ? covered : null,
    };
  }
  const cubiertos = row.m2_int != null && row.m2_int > 0 ? round2(row.m2_int) : null;
  const weighted = row.m2 != null ? round2(row.m2) : cubiertos;
  const totales = cubiertos != null && weighted != null ? Math.max(weighted, cubiertos) : weighted;
  return { m2_cubiertos: cubiertos, m2_semicubiertos: 0, m2_descubiertos: exterior, m2_totales: totales };
}

const FLOOR_NUMERO: Record<string, number> = {
  techo: 20,
  terraza: 19,
  "11": 11,
  "10": 10,
  "09": 9,
  "08": 8,
  "07": 7,
  "06": 6,
  "05": 5,
  "04": 4,
  "03": 3,
  "02": 2,
  "01": 1,
  "00": 0,
  ss1: -1,
  ss2: -2,
};

/** Reemplaza el proyecto demo por POL, con assets reales y sin datos personales. */
export function applyPol(db: Database, now: Date) {
  const project = db.projects[0];
  if (!project) return;
  project.nombre = "POL";
  project.slug = "pol";
  project.descripcion = "Viviendas en la esquina de Bv. España y Dr. Pablo de María, Parque Rodó, Montevideo.";
  project.direccion = pol.location;
  project.lat = pol.lat;
  project.lng = pol.lng;
  project.fecha_entrega = null;
  project.contacto = {
    whatsapp: "59899000000",
    email: "comercial@demo.adastra",
    telefono: "+598 0000 0000",
  };
  project.redes = {};
  project.settings = {
    ...project.settings,
    color_acento: "#4A6844",
    titulo_publico: "POL",
    logo_url: `${ROOT}/brand/pol-logo.svg`,
    texto_legal: "Precios de demostración para este showroom, calculados aparte de la lista comercial. Las imágenes son renders del proyecto.",
    aviso_cookies: "Usamos cookies para medir visitas y, si aceptás, para remarketing.",
    pasos: ["Reservá con seña", "Firmá el boleto", "Pagá las cuotas", "Escriturá en la posesión"],
    recorrido: {
      paradas: [
        {
          orden: 1,
          transicion_url: `${ROOT}/video/spin-clip-1_360-to-90.mp4`,
          reversa_url: `${ROOT}/video/spin-clip-3_360-to-255.mp4`,
          vuelo_url: `${ROOT}/video/vuelo-top-1_from-360.mp4`,
        },
        {
          orden: 2,
          transicion_url: `${ROOT}/video/spin-clip-2_90-to-255.mp4`,
          reversa_url: `${ROOT}/video/spin-clip-1_90-to-360.mp4`,
          vuelo_url: `${ROOT}/video/vuelo-top-2_from-90.mp4`,
        },
        {
          orden: 3,
          transicion_url: `${ROOT}/video/spin-clip-3_255-to-360.mp4`,
          reversa_url: `${ROOT}/video/spin-clip-2_255-to-90.mp4`,
          vuelo_url: `${ROOT}/video/vuelo-top-3_from-255.mp4`,
        },
      ],
    },
    vistas_orientacion: { ...VISTA_POR_ORIENTACION },
  };
  delete project.settings.brochure_url;

  db.buildings = [
    {
      id: BUILDING,
      project_id: PROJECT,
      nombre: "POL",
      tipo: "torre",
      orden: 1,
    },
  ];

  const floorIds = new Map<string, string>();
  db.floors = pol.floors.map((floor) => {
    const id = seedId(4200 + (FLOOR_NUMERO[floor.key] ?? 0) + 30);
    floorIds.set(floor.key, id);
    return {
      id,
      project_id: PROJECT,
      building_id: BUILDING,
      nombre: floor.label,
      numero: FLOOR_NUMERO[floor.key] ?? 0,
      orden: 20 - (FLOOR_NUMERO[floor.key] ?? 0),
    };
  });

  const typologies = new Map<string, string>();
  db.typologies = [];
  let typN = 0;
  for (const unit of pol.units) {
    if (typologies.has(unit.tipologia)) continue;
    const id = seedId(4300 + typN);
    typN += 1;
    typologies.set(unit.tipologia, id);
    const areas = coveredAreas(unit);
    db.typologies.push({
      id,
      project_id: PROJECT,
      nombre: unit.tipologia,
      ambientes: unit.tipo === "departamento" ? (unit.dormitorios === 0 ? 1 : (unit.dormitorios ?? 0) + 1) : 0,
      dormitorios: unit.dormitorios ?? 0,
      banos: unit.banos ?? 0,
      m2_cubiertos: areas.m2_cubiertos ?? 0,
      m2_semicubiertos: 0,
      m2_descubiertos: areas.m2_descubiertos,
      m2_totales: areas.m2_totales ?? areas.m2_cubiertos ?? 0,
      descripcion: "",
      custom_values: {},
      tour_url: null,
    });
  }

  const unitIds = new Map<string, string>();
  db.units = pol.units.map((row, index) => {
    const id = seedId(12000 + index);
    unitIds.set(row.codigo, id);
    const unit: Unit = {
      id,
      project_id: PROJECT,
      floor_id: floorIds.get(row.planta) ?? null,
      building_id: BUILDING,
      typology_id: typologies.get(row.tipologia) ?? null,
      codigo: row.codigo,
      tipo: row.tipo as Unit["tipo"],
      ambientes: row.tipo === "departamento" ? (row.dormitorios === 0 ? 1 : row.dormitorios != null ? row.dormitorios + 1 : null) : null,
      dormitorios: row.dormitorios,
      banos: row.banos,
      ...coveredAreas(row),
      orientacion: row.orientacion,
      vista: null,
      tour_url: null,
      estado: row.estado as Unit["estado"],
      pending_request_id: null,
      reserved_by_user_id: null,
      reserved_lead_id: null,
      mostrar_precio: row.precio != null,
      destacada: false,
      notas_internas: row.sin_plano ? "Sin plano en el material de origen." : null,
      custom_values: {},
      overrides: ["ambientes", "dormitorios", "banos", "m2_cubiertos", "m2_semicubiertos", "m2_descubiertos", "m2_totales"],
      version: 1,
      updated_at: now.toISOString(),
      updated_by: null,
    };
    return unit;
  });

  const reserved = unitIds.get("104");
  const selling = unitIds.get("204");
  const u104 = db.units.find((unit) => unit.id === reserved);
  const u204 = db.units.find((unit) => unit.id === selling);
  if (u104) u104.pending_request_id = seedId(600);
  if (u204) u204.pending_request_id = seedId(601);
  for (const request of db.status_change_requests) {
    if (request.id === seedId(600) && reserved) request.unit_id = reserved;
    if (request.id === seedId(601) && selling) request.unit_id = selling;
  }
  for (const lead of db.leads) {
    if (lead.id === seedId(502) && reserved) {
      lead.unit_id = reserved;
      lead.mensaje = "Quiero reservar la 104.";
    }
    if (lead.id === seedId(503) && selling) {
      lead.unit_id = selling;
      lead.mensaje = "Consulta de demostración por la 204.";
    }
    if (lead.unit_id && !db.units.some((unit) => unit.id === lead.unit_id)) {
      lead.unit_id = unitIds.get("101") ?? null;
    }
    const codigo = db.units.find((unit) => unit.id === lead.unit_id)?.codigo;
    if (codigo && lead.mensaje) {
      lead.mensaje = lead.mensaje.replace(/\b\d+[A-Za-z*]+\b/g, (token) => (unitIds.has(token) ? token : codigo));
    }
  }
  for (const note of db.notifications) {
    if (note.id === seedId(801)) note.cuerpo = "Laura Gómez pidió reservar la unidad 104.";
    if (note.id === seedId(802)) note.cuerpo = "Laura Gómez pidió vender la unidad 204. Vence en pocas horas.";
  }
  for (const entry of db.change_log) {
    if (entry.project_id === PROJECT) entry.entidad_id = unitIds.get("101") ?? entry.entidad_id;
  }

  db.unit_prices = db.units
    .filter((unit) => unit.mostrar_precio)
    .map((unit) => ({
      unit_id: unit.id,
      price_list_id: seedId(50),
      precio: pol.units.find((row) => row.codigo === unit.codigo)?.precio ?? 0,
    }));

  const mediaByUrl = new Map<string, string>();
  const media: MediaAsset[] = [];
  const links: MediaLink[] = [];
  let mediaN = 0;
  let linkN = 0;
  const addMedia = (url: string, nombre: string, carpeta: string, tipo: MediaAsset["tipo"] = "imagen") => {
    const existing = mediaByUrl.get(url);
    if (existing) return existing;
    const id = seedId(20000 + mediaN);
    mediaN += 1;
    mediaByUrl.set(url, id);
    media.push({
      id,
      project_id: PROJECT,
      tipo,
      carpeta,
      nombre,
      url,
      variantes: [{ nombre: "original", url, ancho: 1920 }],
      peso: 80_000,
      ancho: 1920,
      alto: 1080,
      estado_proceso: "listo",
      aviso: null,
      tags: [carpeta],
      created_at: now.toISOString(),
    });
    return id;
  };
  const link = (mediaId: string, entidad: MediaLink["entidad"], entidadId: string, rol: MediaLink["rol"], orden: number) => {
    links.push({ id: seedId(25000 + linkN), media_id: mediaId, entidad, entidad_id: entidadId, rol, orden });
    linkN += 1;
  };

  for (const row of pol.units) {
    const id = unitIds.get(row.codigo);
    if (!id) continue;
    if (row.plano3d) link(addMedia(row.plano3d, `Planta 3D ${row.codigo}`, "unidades"), "unit", id, "render", 0);
    if (row.plano) link(addMedia(row.plano, `Plano ${row.codigo}`, "planos", "plano"), "unit", id, "plano", 0);
    row.interiores.forEach((url, index) => {
      link(addMedia(url, `Interior ${row.codigo}`, "interiores"), "unit", id, "galeria", index + 1);
    });
  }

  pol.floors.forEach((floor) => {
    const id = floorIds.get(floor.key);
    if (!id) return;
    const file = floor.key === "00" ? "planta-00" : floor.key === "ss1" ? "planta-ss1" : floor.key === "ss2" ? "planta-ss2" : `planta-${floor.key}`;
    const url = `${ROOT}/plantas/${file}.webp`;
    link(addMedia(url, floor.label, "plantas"), "floor", id, "plano", 0);
  });

  const fachadas = ["fachada-01", "fachada-02", "fachada-03", "fachada-04", "fachada-05"];
  fachadas.forEach((name, index) => {
    const id = addMedia(`${ROOT}/fachadas/${name}.webp`, `Fachada ${index + 1}`, "fachadas");
    link(id, "project", PROJECT, index === 0 ? "fachada" : "galeria", index);
  });
  ["amenity-coffee", "amenity-cowork", "amenity-laundry", "amenity-parrillero", "amenity-sum"].forEach((name, index) => {
    link(addMedia(`${ROOT}/amenities/${name}.webp`, name, "amenities"), "project", PROJECT, "galeria", 10 + index);
  });

  db.media = media;
  db.media_links = links;

  const amenityNames = [
    ["Coffee", `${ROOT}/amenities/amenity-coffee.webp`],
    ["Cowork", `${ROOT}/amenities/amenity-cowork.webp`],
    ["Laundry", `${ROOT}/amenities/amenity-laundry.webp`],
    ["Parrillero", `${ROOT}/amenities/amenity-parrillero.webp`],
    ["SUM", `${ROOT}/amenities/amenity-sum.webp`],
  ] as const;
  db.characteristics = amenityNames.map(([nombre], index) => ({
    id: seedId(4400 + index),
    project_id: PROJECT,
    nombre,
    icono: "amenity",
    orden: index + 1,
    archivado: false,
  }));
  amenityNames.forEach(([, url], index) => {
    link(addMedia(url, amenityNames[index][0], "amenities"), "amenity", seedId(4400 + index), "render", 0);
  });

  db.viewpoints = [
    {
      id: seedId(7100),
      project_id: PROJECT,
      building_id: BUILDING,
      nombre: "Intro",
      tipo: "portada",
      orden: 0,
      imagen_url: `${ROOT}/video/posters/intro_first.webp`,
      video_url: `${ROOT}/video/intro.mp4`,
    },
    {
      id: seedId(7101),
      project_id: PROJECT,
      building_id: BUILDING,
      nombre: "360°",
      tipo: "exterior",
      orden: 1,
      imagen_url: `${ROOT}/spin/spin-1-360.webp`,
      video_url: null,
    },
    {
      id: seedId(7102),
      project_id: PROJECT,
      building_id: BUILDING,
      nombre: "90°",
      tipo: "exterior",
      orden: 2,
      imagen_url: `${ROOT}/spin/spin-2-90.webp`,
      video_url: null,
    },
    {
      id: seedId(7103),
      project_id: PROJECT,
      building_id: BUILDING,
      nombre: "255°",
      tipo: "exterior",
      orden: 3,
      imagen_url: `${ROOT}/spin/spin-3-255.webp`,
      video_url: null,
    },
  ];

  let overlayN = 0;
  db.overlays = [];
  for (const [floorKey, unitsOfFloor] of Object.entries(pol.polygons)) {
    const floorId = floorIds.get(floorKey);
    if (!floorId) continue;
    for (const [codigo, puntos] of Object.entries(unitsOfFloor)) {
      const unitId = unitIds.get(codigo);
      if (!unitId) continue;
      db.overlays.push({
        id: seedId(30000 + overlayN),
        project_id: PROJECT,
        contenedor: "floor",
        contenedor_id: floorId,
        forma: "polygon",
        puntos: puntos as [number, number][],
        vinculo_tipo: "unit",
        vinculo_id: unitId,
        etiqueta: codigo,
        estado: "published",
        orden: overlayN,
      });
      overlayN += 1;
    }
  }

  const sceneOfAngle: Record<string, string> = { "360": seedId(7101), "90": seedId(7102), "255": seedId(7103) };
  for (const cell of exteriorCells(pol.units)) {
    const unitId = unitIds.get(cell.codigo);
    const sceneId = sceneOfAngle[cell.angulo];
    if (!unitId || !sceneId) continue;
    db.overlays.push({
      id: seedId(30000 + overlayN),
      project_id: PROJECT,
      contenedor: "scene",
      contenedor_id: sceneId,
      forma: "polygon",
      puntos: cell.puntos,
      vinculo_tipo: "unit",
      vinculo_id: unitId,
      etiqueta: cell.codigo,
      estado: "published",
      orden: overlayN,
    });
    overlayN += 1;
  }

  db.points_of_interest = pol.pois.map((poi, index) => ({
    id: seedId(4600 + index),
    project_id: PROJECT,
    nombre: poi.nombre,
    categoria: poi.categoria,
    lat: poi.lat,
    lng: poi.lng,
    distancia_m: poi.distancia_m,
    descripcion: "",
    orden: index + 1,
  }));

  db.tours = [];
  db.construction_updates = [
    {
      id: seedId(4700),
      project_id: PROJECT,
      fecha: "2026-01-15",
      titulo: "Proyecto en el showroom",
      descripcion: "Renders de fachada, spin y plantas listos para recorrer. El avance de obra se carga desde el panel.",
      imagen_url: `${ROOT}/fachadas/fachada-01.webp`,
      orden: 1,
    },
  ];
  db.custom_sections = [
    {
      id: seedId(4701),
      project_id: PROJECT,
      titulo: "El edificio",
      cuerpo: "POL está en Bv. España y Dr. Pablo de María, Parque Rodó. El recorrido gira alrededor del edificio y baja desde el techo por cada planta.",
      orden: 1,
      visible: true,
    },
  ];

  db.events = buildEvents(now, db.units);
}

function buildEvents(now: Date, units: Unit[]): AnalyticsEvent[] {
  const homes = units.filter((unit) => unit.tipo === "departamento" && unit.estado === "disponible").slice(0, 8);
  const events: AnalyticsEvent[] = [];
  let n = 0;
  for (let s = 0; s < 40; s++) {
    const ts = new Date(now.getTime() - (s + 1) * 3_600_000 * 8).toISOString();
    const push = (nombre: string, unitId: string | null) => {
      events.push({
        id: seedId(28000 + n),
        project_id: PROJECT,
        visitor_id: `pol-v-${s % 18}`,
        session_id: `pol-s-${s}`,
        nombre,
        props: nombre === "unit_dwell" ? { segundos: 40 + (s % 5) * 15 } : {},
        unit_id: unitId,
        device: s % 3 === 0 ? "desktop" : "mobile",
        utm_source: s % 2 === 0 ? "meta" : null,
        utm_medium: s % 2 === 0 ? "paid" : null,
        utm_campaign: s % 2 === 0 ? "pol_demo" : null,
        referrer_tipo: null,
        fuente: s % 2 === 0 ? "Meta Ads" : "Directo",
        ts,
      });
      n += 1;
    };
    push("session_start", null);
    push("page_view", null);
    const unit = homes[s % homes.length];
    if (unit) {
      push("unit_view", unit.id);
      push("unit_dwell", unit.id);
    }
  }
  return events;
}
