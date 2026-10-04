/** Grilla de fachada: 4 esquinas y una división pisos × vanos, en perspectiva. */

export type Point = [number, number];
export type Quad = [Point, Point, Point, Point];

export interface FachadaCara {
  id: string;
  /** Arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda. */
  esquinas: Quad;
  /** De arriba hacia abajo. 0 es PB. */
  pisos: number[];
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

function bay(quad: Quad, u0: number, u1: number, v0: number, v1: number): Point[] {
  const padU = (u1 - u0) * 0.05;
  const padV = (v1 - v0) * 0.07;
  return [
    onQuad(quad, u0 + padU, v0 + padV),
    onQuad(quad, u1 - padU, v0 + padV),
    onQuad(quad, u1 - padU, v1 - padV),
    onQuad(quad, u0 + padU, v1 - padV),
  ];
}

export function celdasDeCara(cara: FachadaCara, units: UnitLite[]) {
  const cells: { codigo: string; puntos: Point[] }[] = [];
  const total = Math.max(1, cara.pisos.length);
  cara.pisos.forEach((level, index) => {
    const rows = cara.orientaciones.flatMap((orientacion) =>
      units
        .filter((unit) => unit.tipo === "departamento" && unit.planta === plantaKey(level) && unit.orientacion === orientacion)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es")),
    );
    if (!rows.length) return;
    const v0 = index / total;
    const v1 = (index + 1) / total;
    rows.forEach((unit, column) => {
      cells.push({
        codigo: unit.codigo,
        puntos: bay(cara.esquinas, column / rows.length, (column + 1) / rows.length, v0, v1),
      });
    });
  });
  return cells;
}

export function celdasDeGrilla(caras: FachadaCara[], units: UnitLite[]) {
  return caras.flatMap((cara) => celdasDeCara(cara, units).map((cell) => ({ ...cell, caraId: cara.id })));
}

/**
 * Esquinas trazadas sobre el still 1920×1080.
 * 360 y 255 muestran las dos caras vidriadas. En 90 la cara derecha es un muro ciego:
 * las unidades van en la cara de ventanas, y PB en la franja del basamento.
 */
export const POL_CARAS: Record<string, FachadaCara[]> = {
  "360": [
    {
      id: "360-norte",
      esquinas: [[0.412, 0.348], [0.508, 0.322], [0.498, 0.728], [0.392, 0.762]],
      pisos: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      orientaciones: ["Norte-Oeste", "Norte"],
    },
    {
      id: "360-este",
      esquinas: [[0.508, 0.322], [0.585, 0.358], [0.562, 0.705], [0.498, 0.728]],
      pisos: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      orientaciones: ["Norte-Este", "Este"],
    },
  ],
  "90": [
    {
      id: "90-ventanas",
      esquinas: [[0.398, 0.338], [0.515, 0.316], [0.503, 0.712], [0.387, 0.741]],
      pisos: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
      orientaciones: ["Norte", "Norte-Este", "Este"],
    },
    {
      id: "90-pb",
      esquinas: [[0.387, 0.741], [0.503, 0.712], [0.502, 0.748], [0.386, 0.778]],
      pisos: [0],
      orientaciones: ["Sur-Este", "Sur", "Sur-Oeste"],
    },
  ],
  "255": [
    {
      id: "255-norte",
      esquinas: [[0.398, 0.318], [0.512, 0.292], [0.5, 0.742], [0.382, 0.775]],
      pisos: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      orientaciones: ["Norte-Oeste", "Norte", "Norte-Este"],
    },
    {
      id: "255-este",
      esquinas: [[0.512, 0.292], [0.588, 0.332], [0.568, 0.708], [0.5, 0.742]],
      pisos: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
      orientaciones: ["Este", "Sur-Este", "Sur", "Sur-Oeste"],
    },
  ],
};
