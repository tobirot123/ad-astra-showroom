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
      esquinas: [[0.378, 0.366], [0.502, 0.346], [0.492, 0.77], [0.358, 0.81]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Oeste", "Norte"],
    },
    {
      id: "360-este",
      esquinas: [[0.502, 0.346], [0.608, 0.386], [0.588, 0.73], [0.492, 0.77]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Este", "Este"],
    },
  ],
  "90": [
    {
      id: "90-balcones",
      esquinas: [[0.392, 0.366], [0.502, 0.346], [0.49, 0.705], [0.375, 0.725]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Oeste", "Norte", "Norte-Este"],
    },
    {
      id: "90-ranuras",
      esquinas: [[0.502, 0.346], [0.6, 0.392], [0.585, 0.685], [0.49, 0.705]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Este", "Sur-Este", "Sur", "Sur-Oeste"],
    },
  ],
  "255": [
    {
      id: "255-norte",
      esquinas: [[0.348, 0.366], [0.498, 0.346], [0.488, 0.772], [0.332, 0.802]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Norte-Oeste", "Norte", "Norte-Este"],
    },
    {
      id: "255-este",
      esquinas: [[0.498, 0.346], [0.608, 0.378], [0.59, 0.732], [0.488, 0.772]],
      pisos: PISOS,
      losas: LOSAS,
      orientaciones: ["Este", "Sur-Este", "Sur", "Sur-Oeste"],
    },
  ],
};
