import {
  AERIAL_HOTSPOTS,
  lotePolygon,
  planPolygon,
  torreBPlanPolygon,
  torreBPolygon,
} from "@/lib/demo/geometry";
import { seedId } from "@/lib/domain/ids";
import type { Database, Overlay, Unit, UnitStatus } from "@/lib/domain/types";

function media(n: number, projectId: string, url: string, nombre: string, carpeta: string): Database["media"][number] {
  return {
    id: seedId(n),
    project_id: projectId,
    tipo: carpeta === "planos" ? "plano" : "imagen",
    carpeta,
    nombre,
    url,
    variantes: [{ nombre: "original", url, ancho: 1200 }],
    peso: 20_000,
    ancho: 1200,
    alto: 800,
    estado_proceso: "listo",
    aviso: null,
    tags: [carpeta],
    titulo: nombre,
    descripcion: "",
    created_at: new Date().toISOString(),
  };
}

function zone(
  n: number,
  projectId: string,
  contenedor: Overlay["contenedor"],
  contenedorId: string | null,
  puntos: [number, number][],
  vinculoTipo: Overlay["vinculo_tipo"],
  vinculoId: string,
  etiqueta: string,
): Overlay {
  return {
    id: seedId(n),
    project_id: projectId,
    contenedor,
    contenedor_id: contenedorId,
    forma: "polygon",
    puntos,
    vinculo_tipo: vinculoTipo,
    vinculo_id: vinculoId,
    etiqueta,
    estado: "published",
    orden: n,
  };
}

export function appendShowcase(db: Database, iso: string) {
  const project = db.projects[0];
  if (!project) return;
  const projectId = project.id;
  const torreA = db.buildings[0]?.id;
  const cash = db.price_lists.find((list) => list.project_id === projectId && list.visibilidad === "public");
  const typ2 = db.typologies.find((typ) => typ.project_id === projectId);
  if (!torreA || !cash || !typ2) return;

  project.lat = -32.9442;
  project.lng = -60.6505;
  project.redes = {
    instagram: "https://instagram.com/adastrait",
    facebook: "https://facebook.com/adastrait",
  };
  project.settings = { ...project.settings, showroom_lite: false };

  const torreB = seedId(900);
  const loteo = seedId(901);
  db.buildings.push(
    { id: torreB, project_id: projectId, nombre: "Torre B", tipo: "torre", parent_id: null, orden: 2 },
    { id: loteo, project_id: projectId, nombre: "Loteo del parque", tipo: "loteo", parent_id: null, orden: 3 },
  );

  const floorsB = [1, 2, 3].map((n) => {
    const id = seedId(909 + n);
    db.floors.push({
      id,
      building_id: torreB,
      project_id: projectId,
      nombre: n === 1 ? "Planta baja" : `Piso ${n}`,
      numero: n,
      orden: n,
    });
    return { n, id };
  });

  let cursor = 0;
  for (const floor of floorsB) {
    for (const letter of ["A", "B"] as const) {
      const id = seedId(920 + cursor);
      const codigo = `B${floor.n}${letter}`;
      const estado: UnitStatus = codigo === "B2A" ? "vendida" : "disponible";
      const unit: Unit = {
        id,
        project_id: projectId,
        floor_id: floor.id,
        building_id: torreB,
        typology_id: typ2.id,
        codigo,
        tipo: "departamento",
        ambientes: null,
        dormitorios: null,
        banos: null,
        m2_cubiertos: null,
        m2_semicubiertos: null,
        m2_descubiertos: null,
        m2_totales: null,
        orientacion: letter === "A" ? "Norte" : "Sur",
        vista: "al parque",
        tour_url: null,
        operacion: "venta",
        estado,
        pending_request_id: null,
        reserved_by_user_id: null,
        reserved_lead_id: null,
        mostrar_precio: true,
        destacada: false,
        notas_internas: null,
        custom_values: { tipo_cochera: "simple", apto_profesional: false, expensas: 62000 },
        overrides: ["orientacion"],
        version: 1,
        updated_at: iso,
        updated_by: null,
      };
      db.units.push(unit);
      db.unit_prices.push({ unit_id: id, price_list_id: cash.id, precio: 126_000 + floor.n * 5_000 });
      db.overlays.push(
        zone(1100 + cursor, projectId, "facade", torreB, torreBPolygon(floor.n, letter), "unit", id, codigo),
        zone(1120 + cursor, projectId, "floor", floor.id, torreBPlanPolygon(letter), "unit", id, codigo),
      );
      cursor += 1;
    }
  }

  for (let i = 0; i < 6; i += 1) {
    const id = seedId(930 + i);
    const codigo = `L${i + 1}`;
    const estado: UnitStatus = i === 5 ? "pausa" : i === 4 ? "vendida" : "disponible";
    db.units.push({
      id,
      project_id: projectId,
      floor_id: null,
      building_id: loteo,
      typology_id: null,
      codigo,
      tipo: "lote",
      ambientes: null,
      dormitorios: null,
      banos: null,
      m2_cubiertos: null,
      m2_semicubiertos: null,
      m2_descubiertos: null,
      m2_totales: 280 + i * 20,
      orientacion: "Norte",
      vista: null,
      tour_url: null,
      operacion: "venta",
      estado,
      pending_request_id: null,
      reserved_by_user_id: null,
      reserved_lead_id: null,
      mostrar_precio: true,
      destacada: false,
      notas_internas: null,
      custom_values: {},
      overrides: ["m2_totales", "orientacion"],
      version: 1,
      updated_at: iso,
      updated_by: null,
    });
    db.unit_prices.push({ unit_id: id, price_list_id: cash.id, precio: 42_000 + i * 2_500 });
    db.overlays.push(zone(1140 + i, projectId, "masterplan", loteo, lotePolygon(i), "unit", id, codigo));
  }

  for (const unit of db.units) {
    if (unit.building_id !== torreA || !unit.floor_id) continue;
    const letter = unit.codigo.slice(-1);
    db.overlays.push(zone(1200 + Number.parseInt(unit.codigo, 36), projectId, "floor", unit.floor_id, planPolygon(letter), "unit", unit.id, unit.codigo));
  }

  const assets: Array<[number, string, string, string]> = [
    [980, "/demo/portada.svg", "Portada", "portada"],
    [981, "/demo/aereo.svg", "Vista aérea", "aereo"],
    [982, "/demo/barrio.svg", "Barrio", "barrio"],
    [983, "/demo/fachada-b.svg", "Fachada Torre B", "fachada"],
    [984, "/demo/plano-piso.svg", "Planta Torre A", "planos"],
    [985, "/demo/plano-piso-b.svg", "Planta Torre B", "planos"],
    [986, "/demo/masterplan.svg", "Masterplan", "masterplan"],
    [987, "/demo/panorama.svg", "Panorama del living", "tours"],
    [988, "/demo/vista-altura.svg", "Vista desde la altura", "vistas"],
    [989, "/demo/vuelo-intro.mp4", "Vuelo de introducción", "videos"],
  ];
  for (const [n, url, nombre, carpeta] of assets) {
    const row = media(n, projectId, url, nombre, carpeta);
    if (url.endsWith(".mp4")) row.tipo = "video";
    db.media.push(row);
  }

  const planoA = seedId(984);
  const planoB = seedId(985);
  const vista = seedId(988);
  for (const floor of db.floors.filter((f) => f.building_id === torreA)) {
    db.media_links.push(
      { id: seedId(1300 + floor.numero), media_id: planoA, entidad: "floor", entidad_id: floor.id, rol: "plano", orden: 0 },
      { id: seedId(1310 + floor.numero), media_id: vista, entidad: "floor", entidad_id: floor.id, rol: "vista", orden: 0 },
    );
  }
  for (const floor of floorsB) {
    db.media_links.push(
      { id: seedId(1320 + floor.n), media_id: planoB, entidad: "floor", entidad_id: floor.id, rol: "plano", orden: 0 },
      { id: seedId(1330 + floor.n), media_id: vista, entidad: "floor", entidad_id: floor.id, rol: "vista", orden: 0 },
    );
  }
  db.media_links.push({
    id: seedId(1340),
    media_id: seedId(983),
    entidad: "building",
    entidad_id: torreB,
    rol: "fachada",
    orden: 0,
  });

  const aereoId = seedId(941);
  db.viewpoints.push(
    { id: seedId(940), project_id: projectId, building_id: null, nombre: "Portada", tipo: "portada", orden: 0, imagen_url: "/demo/portada.svg", video_url: null },
    { id: aereoId, project_id: projectId, building_id: null, nombre: "Vista aérea", tipo: "aereo", orden: 1, imagen_url: "/demo/aereo.svg", video_url: "/demo/vuelo-intro.mp4" },
    { id: seedId(942), project_id: projectId, building_id: null, nombre: "Barrio", tipo: "barrio", orden: 2, imagen_url: "/demo/barrio.svg", video_url: null },
    { id: seedId(943), project_id: projectId, building_id: torreA, nombre: "Torre A", tipo: "exterior", orden: 3, imagen_url: "/demo/fachada.svg", video_url: null },
    { id: seedId(944), project_id: projectId, building_id: torreB, nombre: "Torre B", tipo: "exterior", orden: 4, imagen_url: "/demo/fachada-b.svg", video_url: null },
    { id: seedId(945), project_id: projectId, building_id: loteo, nombre: "Loteo", tipo: "masterplan", orden: 5, imagen_url: "/demo/masterplan.svg", video_url: null },
  );
  db.overlays.push(
    zone(1350, projectId, "scene", aereoId, AERIAL_HOTSPOTS.torreA, "building", torreA, "Torre A"),
    zone(1351, projectId, "scene", aereoId, AERIAL_HOTSPOTS.torreB, "building", torreB, "Torre B"),
    zone(1352, projectId, "scene", aereoId, AERIAL_HOTSPOTS.loteo, "building", loteo, "Loteo"),
  );

  db.characteristics.push(
    { id: seedId(85), project_id: projectId, nombre: "SUM", icono: "amenity", orden: 10, archivado: false },
    { id: seedId(86), project_id: projectId, nombre: "Pileta", icono: "amenity", orden: 11, archivado: false },
    { id: seedId(87), project_id: projectId, nombre: "Gimnasio", icono: "amenity", orden: 12, archivado: false },
  );
  db.media_links.push(
    { id: seedId(1360), media_id: seedId(403), entidad: "amenity", entidad_id: seedId(85), rol: "render", orden: 0 },
    { id: seedId(1361), media_id: seedId(404), entidad: "amenity", entidad_id: seedId(86), rol: "render", orden: 0 },
    { id: seedId(1362), media_id: seedId(403), entidad: "amenity", entidad_id: seedId(87), rol: "galeria", orden: 0 },
  );

  db.tours.push({
    id: seedId(960),
    project_id: projectId,
    entidad: "typology",
    entidad_id: typ2.id,
    proveedor: "url",
    url: "/demo/panorama.svg",
    titulo: "Living en 360",
    orden: 1,
  });

  db.points_of_interest.push(
    { id: seedId(950), project_id: projectId, nombre: "Parque del centro", categoria: "plaza", lat: -32.946, lng: -60.648, distancia_m: 350, descripcion: "A dos cuadras, con juegos y pista.", orden: 1 },
    { id: seedId(951), project_id: projectId, nombre: "Colegio del parque", categoria: "educacion", lat: -32.941, lng: -60.653, distancia_m: 700, descripcion: "Nivel inicial y primario.", orden: 2 },
    { id: seedId(952), project_id: projectId, nombre: "Acceso Av. del Parque", categoria: "acceso", lat: -32.9442, lng: -60.6505, distancia_m: 80, descripcion: "Entrada principal del emprendimiento.", orden: 3 },
  );

  db.galleries.push({
    id: seedId(970),
    project_id: projectId,
    nombre: "Renders",
    slug: "renders",
    descripcion: "Imágenes del proyecto.",
    entidad: "project",
    entidad_id: projectId,
    orden: 1,
  });
}
