/** Grilla de fachada: 4 esquinas y una división pisos × vanos, en perspectiva. */

export type Point = [number, number];
export type Quad = [Point, Point, Point, Point];

export interface FachadaCara {
  id: string;
  /** Arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda. Del borde exterior a la esquina, de la losa de arriba del 11 a la losa de PB. */
  esquinas: Quad;
  /** De arriba hacia abajo. 0 es PB. */
  pisos: number[];
  /**
   * Cada losa, de la losa superior del primer piso a la losa inferior del último.
   * Longitud = pisos.length + 1. 0 es la esquina de arriba, 1 la de abajo, sobre cada borde.
   * Así PB puede ser más alto que un piso tipo.
   */
  losas?: { izq: number; der: number }[];
  /** De izquierda a derecha. Los departamentos de esas orientaciones llenan los vanos. */
  orientaciones: string[];
}

export interface FachadaGrilla {
  viewpoint_id: string;
  caras: FachadaCara[];
  /** Contorno de la torre en esa parada. Nada se pinta afuera. */
  silueta?: Point[];
}

export const ORIENTACIONES_FACHADA = [
  "Norte-Oeste",
  "Norte",
  "Norte-Este",
  "Este",
  "Sur-Este",
  "Sur",
  "Sur-Oeste",
] as const;

type UnitLite = { codigo: string; planta: string; tipo: string; orientacion: string | null };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Punto del plano de la fachada. v constante es una losa; u constante es un montante. */
export function onQuad(quad: Quad, u: number, v: number): Point {
  const top: Point = [lerp(quad[0][0], quad[1][0], u), lerp(quad[0][1], quad[1][1], u)];
  const bottom: Point = [lerp(quad[3][0], quad[2][0], u), lerp(quad[3][1], quad[2][1], u)];
  return [Number(lerp(top[0], bottom[0], v).toFixed(4)), Number(lerp(top[1], bottom[1], v).toFixed(4))];
}

export function plantaDePiso(numero: number) {
  if (numero === 0) return "00";
  if (numero < 0) return "";
  return String(numero).padStart(2, "0");
}

function plantaKey(level: number) {
  return plantaDePiso(level);
}

/** Pesos de arriba hacia abajo para 11…PB. El último es PB, más alto que un piso tipo. */
const ALTURA_PISO = [1.04, 1.02, 1, 0.98, 0.97, 0.96, 0.95, 0.94, 0.94, 0.96, 1, 1.42];

export function losasPorAltura(pesos: number[] = ALTURA_PISO) {
  const total = pesos.reduce((sum, peso) => sum + peso, 0) || 1;
  const losas = [{ izq: 0, der: 0 }];
  let acc = 0;
  for (const peso of pesos) {
    acc += peso / total;
    const t = Number(acc.toFixed(4));
    losas.push({ izq: t, der: t });
  }
  losas[losas.length - 1] = { izq: 1, der: 1 };
  return losas;
}

function losasDe(cara: FachadaCara) {
  if (cara.losas && cara.losas.length === cara.pisos.length + 1) return cara.losas;
  const n = Math.max(1, cara.pisos.length);
  return Array.from({ length: n + 1 }, (_, index) => ({ izq: index / n, der: index / n }));
}

function edgePoint(from: Point, to: Point, t: number): Point {
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)];
}

function slabPoint(quad: Quad, slab: { izq: number; der: number }, u: number): Point {
  const left = edgePoint(quad[0], quad[3], slab.izq);
  const right = edgePoint(quad[1], quad[2], slab.der);
  return [Number(lerp(left[0], right[0], u).toFixed(4)), Number(lerp(left[1], right[1], u).toFixed(4))];
}

/** Vano entre dos losas. Un margen chico deja ver la losa sin cruzarla. */
function bay(quad: Quad, top: { izq: number; der: number }, bottom: { izq: number; der: number }, u0: number, u1: number): Point[] {
  const padU = (u1 - u0) * 0.04;
  const pad = 0.07;
  const topIn = { izq: top.izq + (bottom.izq - top.izq) * pad, der: top.der + (bottom.der - top.der) * pad };
  const bottomIn = { izq: bottom.izq - (bottom.izq - top.izq) * pad, der: bottom.der - (bottom.der - top.der) * pad };
  return [
    slabPoint(quad, topIn, u0 + padU),
    slabPoint(quad, topIn, u1 - padU),
    slabPoint(quad, bottomIn, u1 - padU),
    slabPoint(quad, bottomIn, u0 + padU),
  ];
}

export function celdasDeCara(cara: FachadaCara, units: UnitLite[]) {
  const cells: { codigo: string; puntos: Point[] }[] = [];
  const losas = losasDe(cara);
  cara.pisos.forEach((level, index) => {
    const rows = cara.orientaciones.flatMap((orientacion) =>
      units
        .filter((unit) => unit.tipo === "departamento" && unit.planta === plantaKey(level) && unit.orientacion === orientacion)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es")),
    );
    if (!rows.length || !losas[index] || !losas[index + 1]) return;
    rows.forEach((unit, column) => {
      cells.push({
        codigo: unit.codigo,
        puntos: bay(cara.esquinas, losas[index]!, losas[index + 1]!, column / rows.length, (column + 1) / rows.length),
      });
    });
  });
  return cells;
}

export function celdasDeGrilla(caras: FachadaCara[], units: UnitLite[]) {
  return caras.flatMap((cara) => celdasDeCara(cara, units).map((cell) => ({ ...cell, caraId: cara.id })));
}

function area(points: Point[]) {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]!;
    const b = points[(index + 1) % points.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

function ccw(points: Point[]) {
  return area(points) < 0 ? [...points].reverse() : points;
}

function leftOf(point: Point, a: Point, b: Point) {
  return (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]) >= -1e-8;
}

function cross(p: Point, q: Point, a: Point, b: Point): Point {
  const rx = q[0] - p[0];
  const ry = q[1] - p[1];
  const sx = b[0] - a[0];
  const sy = b[1] - a[1];
  const den = rx * sy - ry * sx;
  const t = den === 0 ? 0 : ((a[0] - p[0]) * sy - (a[1] - p[1]) * sx) / den;
  return [Number((p[0] + rx * t).toFixed(4)), Number((p[1] + ry * t).toFixed(4))];
}

/** Recorta un polígono contra la silueta convexa de la torre. */
export function recortarPoligono(subject: Point[], clip: Point[]) {
  if (clip.length < 3 || subject.length < 3) return subject;
  let output = subject.map((point) => [point[0], point[1]] as Point);
  const ring = ccw(clip);
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index]!;
    const b = ring[(index + 1) % ring.length]!;
    const input = output;
    output = [];
    if (!input.length) break;
    let prev = input[input.length - 1]!;
    for (const current of input) {
      const currentIn = leftOf(current, a, b);
      const prevIn = leftOf(prev, a, b);
      if (currentIn) {
        if (!prevIn) output.push(cross(prev, current, a, b));
        output.push(current);
      } else if (prevIn) output.push(cross(prev, current, a, b));
      prev = current;
    }
  }
  return output;
}

export function dentroDe(point: Point, polygon: Point[]) {
  const ring = ccw(polygon);
  return ring.every((vertex, index) => leftOf(point, vertex, ring[(index + 1) % ring.length]!));
}

/** Hexágono exterior de las dos caras que se ven en una parada. */
export function siluetaDe(caras: FachadaCara[]): Point[] {
  if (caras.length < 2) return caras[0]?.esquinas ? [...caras[0].esquinas] : [];
  const [left, right] = caras;
  return [
    left!.esquinas[0],
    left!.esquinas[1],
    right!.esquinas[1],
    right!.esquinas[2],
    left!.esquinas[2],
    left!.esquinas[3],
  ];
}

const PISOS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const LOSAS = losasPorAltura();

/**
 * Esquinas trazadas sobre el still 1920×1080.
 * Cada cara va del borde exterior a la esquina, y de la losa de arriba del 11
 * (no el techo) a la losa de PB. Las losas no son parejas: PB es más alto.
 */
export const POL_CARAS: Record<string, FachadaCara[]> = {
  "360": [
    {
      id: "360-norte",
      esquinas: [[0.37, 0.402], [0.5, 0.382], [0.494, 0.744], [0.39, 0.766]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Oeste", "Norte"],
    },
    {
      id: "360-este",
      esquinas: [[0.5, 0.382], [0.634, 0.416], [0.62, 0.72], [0.494, 0.744]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Este", "Este"],
    },
  ],
  "90": [
    {
      id: "90-balcones",
      esquinas: [[0.386, 0.402], [0.498, 0.368], [0.49, 0.672], [0.38, 0.692]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Oeste", "Norte", "Norte-Este"],
    },
    {
      id: "90-ranuras",
      esquinas: [[0.498, 0.368], [0.65, 0.414], [0.63, 0.656], [0.49, 0.672]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Este", "Sur-Este", "Sur", "Sur-Oeste"],
    },
  ],
  "255": [
    {
      id: "255-norte",
      esquinas: [[0.352, 0.398], [0.494, 0.376], [0.486, 0.74], [0.366, 0.762]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Oeste", "Norte", "Norte-Este"],
    },
    {
      id: "255-este",
      esquinas: [[0.494, 0.376], [0.578, 0.404], [0.552, 0.708], [0.486, 0.74]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Este", "Sur-Este", "Sur", "Sur-Oeste"],
    },
  ],
};

export const POL_SILUETA: Record<string, Point[]> = Object.fromEntries(
  Object.entries(POL_CARAS).map(([angulo, caras]) => [angulo, siluetaDe(caras)]),
);
