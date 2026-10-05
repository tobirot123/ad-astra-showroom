/** Vista por defecto cuando la unidad no tiene una foto propia en Medios. */

export const VISTA_POR_ORIENTACION: Record<string, string> = {
  Norte: "/demo/pol/spin/spin-1-360.webp",
  "Norte-Oeste": "/demo/pol/spin/spin-1-360.webp",
  "Norte-Este": "/demo/pol/fachadas/fachada-01.webp",
  Este: "/demo/pol/spin/spin-2-90.webp",
  Sur: "/demo/pol/spin/spin-3-255.webp",
  "Sur-Este": "/demo/pol/fachadas/fachada-03.webp",
  "Sur-Oeste": "/demo/pol/fachadas/fachada-05.webp",
};

/** Recorte vertical: los pisos altos miran más al cielo. */
export function encuadreVista(piso: number, propia: boolean) {
  if (propia) return "center";
  if (piso >= 9) return "center 22%";
  if (piso >= 4) return "center 48%";
  return "center 78%";
}

export function vistaPorOrientacion(
  orientacion: string | null,
  mapa: Record<string, string> | undefined,
): string | null {
  if (!orientacion) return null;
  if (mapa && Object.prototype.hasOwnProperty.call(mapa, orientacion)) {
    return mapa[orientacion] || null;
  }
  return VISTA_POR_ORIENTACION[orientacion] ?? null;
}
