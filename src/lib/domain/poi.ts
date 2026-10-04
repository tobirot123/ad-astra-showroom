export const POI_CATEGORIES = [
  ["parque", "Parque"],
  ["playa", "Playa"],
  ["educacion", "Educación"],
  ["comercio", "Comercio"],
  ["salud", "Salud"],
  ["transporte", "Transporte"],
  ["gastronomia", "Gastronomía"],
  ["cultura", "Cultura"],
  ["otro", "Otro"],
] as const;

export const POI_COLOR: Record<string, string> = {
  parque: "#2f6b4f",
  playa: "#1d6f8a",
  educacion: "#3d4f8a",
  comercio: "#8a5a2b",
  salud: "#8a3030",
  transporte: "#3d3d3d",
  gastronomia: "#8a6230",
  cultura: "#5a3d8a",
  otro: "#5c564e",
};

export function poiLabel(categoria: string) {
  return POI_CATEGORIES.find(([key]) => key === categoria)?.[1] ?? categoria;
}

export function poiColor(categoria: string) {
  return POI_COLOR[categoria] ?? POI_COLOR.otro;
}
