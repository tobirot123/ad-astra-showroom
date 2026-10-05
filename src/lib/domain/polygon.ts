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
  const samples: [number, number][] = [];
  for (let gy = 1; gy <= 24; gy++) {
    for (let gx = 1; gx <= 24; gx++) {
      const sx = minX + ((maxX - minX) * gx) / 25;
      const sy = minY + ((maxY - minY) * gy) / 25;
      if (pointInPolygon(points, sx, sy)) samples.push([sx, sy]);
    }
  }
  if (samples.length === 0) return points[0] ?? [(minX + maxX) / 2, (minY + maxY) / 2];
  const mean = samples.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  const center: [number, number] = [mean[0] / samples.length, mean[1] / samples.length];
  if (pointInPolygon(points, center[0], center[1])) return center;
  // Dos ambientes separados por un hueco: el promedio cae en el hueco.
  // La pastilla se queda en el grupo de muestras más grande.
  const stepX = (maxX - minX) / 25 || 1;
  const stepY = (maxY - minY) / 25 || 1;
  const unused = new Set(samples.map((_, index) => index));
  let best: [number, number][] = [];
  for (const start of unused) {
    const group = [samples[start]!];
    unused.delete(start);
    for (let cursor = 0; cursor < group.length; cursor++) {
      const [x, y] = group[cursor]!;
      for (const index of [...unused]) {
        const other = samples[index]!;
        if (Math.abs(other[0] - x) <= stepX * 1.6 && Math.abs(other[1] - y) <= stepY * 1.6) {
          unused.delete(index);
          group.push(other);
        }
      }
    }
    if (group.length > best.length) best = group;
  }
  const mass = best.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  const focus: [number, number] = [mass[0] / best.length, mass[1] / best.length];
  if (pointInPolygon(points, focus[0], focus[1])) return focus;
  return best.reduce((nearest, point) => {
    const next = (point[0] - focus[0]) ** 2 + (point[1] - focus[1]) ** 2;
    const prev = (nearest[0] - focus[0]) ** 2 + (nearest[1] - focus[1]) ** 2;
    return next < prev ? point : nearest;
  });
}
