/**
 * Fachadas visibles en cada parada, trazadas sobre el still 1920×1080.
 * Cada quad es la cara de la torre (no el predio vecino). Las losas salen
 * de la perspectiva del quad; cada unidad visible ocupa un vano.
 * Las caras que no mira la cámara no llevan máscara.
 */

type Quad = [[number, number], [number, number], [number, number], [number, number]];

type Face = {
  quad: Quad;
  /** De izquierda a derecha en la foto. */
  orientaciones: string[];
  /** Pisos de arriba hacia abajo. El 0 es PB. */
  levels: number[];
};

const FACES: Record<string, Face[]> = {
  // Esquina noreste: norte a la izquierda, este a la derecha. El 11 está retirado.
  "360": [
    {
      quad: [[0.398, 0.318], [0.498, 0.3], [0.49, 0.648], [0.372, 0.672]],
      orientaciones: ["Norte"],
      levels: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    },
    {
      quad: [[0.498, 0.3], [0.558, 0.328], [0.548, 0.632], [0.49, 0.648]],
      orientaciones: ["Norte-Este", "Este"],
      levels: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    },
    {
      quad: [[0.43, 0.25], [0.505, 0.24], [0.498, 0.318], [0.418, 0.33]],
      orientaciones: ["Norte"],
      levels: [11],
    },
    {
      quad: [[0.505, 0.24], [0.552, 0.262], [0.558, 0.328], [0.498, 0.318]],
      orientaciones: ["Norte-Este"],
      levels: [11],
    },
  ],
  // Esquina sudeste: este a la izquierda, sur a la derecha. PB solo sobre el sur.
  "90": [
    {
      quad: [[0.378, 0.3], [0.5, 0.268], [0.488, 0.64], [0.36, 0.668]],
      orientaciones: ["Norte-Este", "Este"],
      levels: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    },
    {
      quad: [[0.5, 0.268], [0.612, 0.3], [0.598, 0.62], [0.488, 0.64]],
      orientaciones: ["Sur-Este", "Sur", "Sur-Oeste"],
      levels: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
    },
  ],
  // Fachada norte, de frente.
  "255": [
    {
      quad: [[0.372, 0.3], [0.575, 0.278], [0.562, 0.675], [0.358, 0.7]],
      orientaciones: ["Norte-Oeste", "Norte", "Norte-Este"],
      levels: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    },
  ],
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function onQuad(quad: Quad, u: number, v: number): [number, number] {
  const top: [number, number] = [lerp(quad[0][0], quad[1][0], u), lerp(quad[0][1], quad[1][1], u)];
  const bottom: [number, number] = [lerp(quad[3][0], quad[2][0], u), lerp(quad[3][1], quad[2][1], u)];
  return [Number(lerp(top[0], bottom[0], v).toFixed(4)), Number(lerp(top[1], bottom[1], v).toFixed(4))];
}

function plantaKey(level: number) {
  return level === 0 ? "00" : String(level).padStart(2, "0");
}

/** Vano de la unidad, apenas adentro de la losa y del montante para que se lea la fachada. */
function bay(quad: Quad, u0: number, u1: number, v0: number, v1: number): [number, number][] {
  const padU = (u1 - u0) * 0.07;
  const padV = (v1 - v0) * 0.1;
  return [
    onQuad(quad, u0 + padU, v0 + padV),
    onQuad(quad, u1 - padU, v0 + padV),
    onQuad(quad, u1 - padU, v1 - padV),
    onQuad(quad, u0 + padU, v1 - padV),
  ];
}

export function exteriorCells(units: { codigo: string; planta: string; tipo: string; orientacion: string | null }[]) {
  const cells: { angulo: string; codigo: string; puntos: [number, number][] }[] = [];
  for (const [angulo, faces] of Object.entries(FACES)) {
    for (const face of faces) {
      face.levels.forEach((level, index) => {
        const rows = face.orientaciones.flatMap((orientacion) =>
          units
            .filter((unit) => unit.tipo === "departamento" && unit.planta === plantaKey(level) && unit.orientacion === orientacion)
            .sort((a, b) => a.codigo.localeCompare(b.codigo, "es")),
        );
        if (!rows.length) return;
        const v0 = index / face.levels.length;
        const v1 = (index + 1) / face.levels.length;
        rows.forEach((unit, column) => {
          cells.push({
            angulo,
            codigo: unit.codigo,
            puntos: bay(face.quad, column / rows.length, (column + 1) / rows.length, v0, v1),
          });
        });
      });
    }
  }
  return cells;
}
