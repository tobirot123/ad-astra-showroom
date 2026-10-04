import { POL_CARAS, POL_SILUETA, celdasDeCara, recortarPoligono } from "@/lib/domain/fachada-grilla";

export { POL_CARAS, POL_SILUETA } from "@/lib/domain/fachada-grilla";

/** Polígonos de respaldo, generados con la misma grilla que usa el showroom. */
export function exteriorCells(units: { codigo: string; planta: string; tipo: string; orientacion: string | null }[]) {
  const cells: { angulo: string; codigo: string; puntos: [number, number][] }[] = [];
  for (const [angulo, caras] of Object.entries(POL_CARAS)) {
    const silueta = POL_SILUETA[angulo] ?? [];
    for (const cara of caras) {
      for (const cell of celdasDeCara(cara, units)) {
        const puntos = recortarPoligono(cell.puntos, silueta);
        if (puntos.length < 3) continue;
        cells.push({ angulo, codigo: cell.codigo, puntos });
      }
    }
  }
  return cells;
}
