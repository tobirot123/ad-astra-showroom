/**
 * Cada pieza del recorrido demo es un archivo con nombre fijo.
 * Para usar un render real, reemplazá el archivo (misma proporción) o
 * subilo en Medios y apuntalo desde Recorrido / Zonas. No hace falta cambiar código.
 */
export const ASSET_SLOTS = {
  portada: { file: "/demo/portada.webp", ratio: "16:9", uso: "Portada" },
  aereo: { file: "/demo/aereo.webp", ratio: "16:9", uso: "Vista aérea" },
  barrio: { file: "/demo/barrio.webp", ratio: "16:9", uso: "Barrio" },
  fachada: { file: "/demo/fachada.webp", ratio: "8:11", uso: "Fachada Torre A. Las ventanas coinciden con los polígonos." },
  fachadaB: { file: "/demo/fachada-b.webp", ratio: "8:11", uso: "Fachada Torre B" },
  plano: { file: "/demo/plano-piso.webp", ratio: "3:2", uso: "Planta Torre A. Las unidades van de izquierda a derecha." },
  planoB: { file: "/demo/plano-piso-b.webp", ratio: "3:2", uso: "Planta Torre B" },
  masterplan: { file: "/demo/masterplan.webp", ratio: "3:2", uso: "Loteo" },
  panorama: { file: "/demo/panorama.webp", ratio: "10:3", uso: "Panorama para arrastrar" },
  vista: { file: "/demo/vista-altura.webp", ratio: "3:2", uso: "Vista por altura" },
  living: { file: "/demo/render-living.webp", ratio: "3:2", uso: "Render de living" },
  cocina: { file: "/demo/render-cocina.webp", ratio: "3:2", uso: "Render de cocina" },
  plano2: { file: "/demo/plano-2amb.webp", ratio: "4:3", uso: "Plano de la tipología 2 ambientes" },
  plano3: { file: "/demo/plano-3amb.webp", ratio: "4:3", uso: "Plano de la tipología 3 ambientes" },
  vuelo: { file: "/demo/vuelo-intro.mp4", ratio: "16:9", uso: "Video corto de transición" },
  brochure: { file: "/demo/brochure.pdf", ratio: "A4", uso: "Brochure del proyecto" },
} as const;
