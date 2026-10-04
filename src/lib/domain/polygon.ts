/** Punto interior de un polígono en coordenadas 0–1. El promedio de vértices
 * puede caer afuera si la planta es cóncava; la pastilla tiene que quedar adentro. */

export function pointInPolygon(points: [number, number][], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i]![0];
    const yi = points[i]![1];
    const xj = points[j]![0];
    const yj = points[j]![1];
    const den = yj - yi || 1e-12;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / den + xi) inside = !inside;
  }
  return inside;
}

export function interiorPoint(points: [number, number][]): [number, number] {
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
  if (pointInPolygon(points, x, y)) return [x, y];
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of points) {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  }
  for (let gy = 1; gy <= 9; gy++) {
    for (let gx = 1; gx <= 9; gx++) {
      const sx = minX + ((maxX - minX) * gx) / 10;
      const sy = minY + ((maxY - minY) * gy) / 10;
      if (pointInPolygon(points, sx, sy)) return [sx, sy];
    }
  }
  return points[0] ?? [x, y];
}
