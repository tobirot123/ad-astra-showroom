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

export function tourEmbed(proveedor: string, url: string): "iframe" | "panorama" {
  if (/\.(svg|png|jpe?g|webp)(\?|$)/i.test(url)) return "panorama";
  const known = ["matterport", "kuula", "3dvista", "pano2vr", "luma"];
  if (known.includes(proveedor)) return "iframe";
  if (/matterport\.com|kuula\.co|3dvista|pano2vr|lumalabs/i.test(url)) return "iframe";
  return "iframe";
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
