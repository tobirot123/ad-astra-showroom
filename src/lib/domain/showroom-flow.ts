/** Decisiones puras del recorrido. El showroom no cambia estados. */

export interface FlowScene {
  video_url: string | null;
}

export interface FlowUnit {
  id: string;
  estado: string;
  ambientes: number | null;
  orientacion: string | null;
  precio: number | null;
  m2_totales: number | null;
  piso_numero: number;
  codigo: string;
  values: Record<string, unknown>;
}

export interface FlowFilters {
  estado: string;
  ambientes: string;
  orientacion: string;
  precioMax: string;
  cochera: string;
  sort: "piso" | "precio" | "superficie";
}

export function videosToLoad(scenes: FlowScene[], index: number, lite: boolean): { current: string | null; next: string | null } {
  if (lite) return { current: null, next: null };
  return {
    current: scenes[index]?.video_url ?? null,
    next: scenes[index + 1]?.video_url ?? null,
  };
}

const TOUR_HOST = /matterport\.com|kuula\.co|3dvista|pano2vr|lumalabs|roundme|theasys\.io|momento360/i;

/** Un recorrido se muestra solo si es un visor embebido o una foto equirectangular 2:1. */
export function isRealTour(proveedor: string, url: string, ancho?: number | null, alto?: number | null) {
  if (TOUR_HOST.test(url)) return true;
  if (["matterport", "kuula", "3dvista", "pano2vr", "luma"].includes(proveedor)) return true;
  if (ancho && alto && ancho / alto >= 1.9 && ancho / alto <= 2.15) return true;
  return false;
}

export function tourEmbed(proveedor: string, url: string): "iframe" | "panorama" {
  if (/\.(svg|png|jpe?g|webp)(\?|$)/i.test(url)) return "panorama";
  const known = ["matterport", "kuula", "3dvista", "pano2vr", "luma"];
  if (known.includes(proveedor)) return "iframe";
  if (/matterport\.com|kuula\.co|3dvista|pano2vr|lumalabs/i.test(url)) return "iframe";
  return "iframe";
}

/** Filtros de fachada: OR dentro de cada grupo y AND entre grupos. El área es un rango. */
export function facadeMatch(
  unit: { estado: string; dormitorios: number | null; m2_totales: number | null },
  query: { estados: string[]; dorms: string[]; areaMin: number; areaMax: number; areaOn: boolean },
): boolean {
  if (query.estados.length && !query.estados.includes(unit.estado)) return false;
  if (query.dorms.length && !query.dorms.includes(String(unit.dormitorios ?? ""))) return false;
  if (query.areaOn && unit.m2_totales != null && (unit.m2_totales < query.areaMin || unit.m2_totales > query.areaMax)) return false;
  return true;
}

export function unitMatches(unit: FlowUnit, filters: FlowFilters): boolean {
  if (filters.estado !== "todos" && unit.estado !== filters.estado) return false;
  if (filters.ambientes !== "todos" && String(unit.ambientes ?? "") !== filters.ambientes) return false;
  if (filters.orientacion !== "todas" && unit.orientacion !== filters.orientacion) return false;
  if (filters.precioMax && unit.precio != null && unit.precio > Number(filters.precioMax)) return false;
  if (filters.cochera !== "todas" && unit.values.tipo_cochera !== filters.cochera) return false;
  return true;
}

export function sortUnits<T extends FlowUnit>(units: T[], sort: FlowFilters["sort"]): T[] {
  const copy = [...units];
  copy.sort((a, b) => {
    if (sort === "precio") return (a.precio ?? Number.MAX_SAFE_INTEGER) - (b.precio ?? Number.MAX_SAFE_INTEGER);
    if (sort === "superficie") return (b.m2_totales ?? 0) - (a.m2_totales ?? 0);
    return a.piso_numero - b.piso_numero || a.codigo.localeCompare(b.codigo, "es");
  });
  return copy;
}

/** Ver plantas abre el nivel más alto que tiene imagen: techo, azotea o el último piso. */
export function entryFloor<T extends { numero: number; plano?: string | null }>(floors: T[]): T | null {
  const drawn = floors.filter((floor) => floor.plano);
  const homes = drawn.filter((floor) => floor.numero >= 1 && floor.numero < 19);
  const pool = homes.length ? homes : drawn.length ? drawn : floors;
  return pool.slice().sort((a, b) => b.numero - a.numero)[0] ?? null;
}

/** La primera planta residencial: el piso más bajo con unidades libres, si no el piso 1. */
export function firstResidentialFloor<T extends { numero: number; libres: number }>(floors: T[]): T | null {
  const homes = floors.filter((floor) => floor.numero >= 1 && floor.numero < 19);
  const withStock = homes.filter((floor) => floor.libres > 0).sort((a, b) => a.numero - b.numero);
  if (withStock[0]) return withStock[0];
  return homes.slice().sort((a, b) => a.numero - b.numero)[0] ?? null;
}

export function floorKey(numero: number) {
  if (numero >= 20) return "techo";
  if (numero === 19) return "terraza";
  if (numero === 0) return "pb";
  if (numero === -1) return "ss1";
  if (numero === -2) return "ss2";
  return String(numero);
}

export function sceneKey(nombre: string) {
  return nombre.match(/\d+/)?.[0] ?? nombre;
}
