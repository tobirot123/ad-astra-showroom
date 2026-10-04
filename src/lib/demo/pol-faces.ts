import { POL_CARAS, celdasDeCara } from "@/lib/domain/fachada-grilla";

export { POL_CARAS } from "@/lib/domain/fachada-grilla";

/** Polígonos de respaldo, generados con la misma grilla que usa el showroom. */
export function exteriorCells(units: { codigo: string; planta: string; tipo: string; orientacion: string | null }[]) {
  const cells: { angulo: string; codigo: string; puntos: [number, number][] }[] = [];
  for (const [angulo, caras] of Object.entries(POL_CARAS)) {
    for (const cara of caras) {
      for (const cell of celdasDeCara(cara, units)) {
        cells.push({ angulo, codigo: cell.codigo, puntos: cell.puntos });
      }
    }
  }
  return cells;
}
