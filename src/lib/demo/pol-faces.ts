/** Fachadas visibles en cada parada del spin, en coordenadas 0–1 de la foto. */

type Quad = [[number, number], [number, number], [number, number], [number, number]];

export const SPIN_FACES: Record<string, { quad: Quad; orientaciones: string[] }[]> = {
  "360": [
    { quad: [[0.3, 0.21], [0.52, 0.18], [0.5, 0.74], [0.27, 0.78]], orientaciones: ["Norte", "Norte-Oeste"] },
    { quad: [[0.52, 0.18], [0.76, 0.26], [0.73, 0.7], [0.5, 0.74]], orientaciones: ["Este", "Norte-Este"] },
  ],
  "90": [
    { quad: [[0.24, 0.23], [0.48, 0.18], [0.46, 0.74], [0.22, 0.78]], orientaciones: ["Sur", "Sur-Oeste"] },
    { quad: [[0.48, 0.18], [0.78, 0.23], [0.75, 0.72], [0.46, 0.74]], orientaciones: ["Sur-Este", "Este"] },
  ],
  "255": [
    { quad: [[0.28, 0.15], [0.64, 0.13], [0.66, 0.78], [0.26, 0.82]], orientaciones: ["Este", "Norte-Este", "Sur-Este"] },
  ],
};

const LEVELS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

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

export function exteriorCells(units: { codigo: string; planta: string; tipo: string; orientacion: string | null }[]) {
  const cells: { angulo: string; codigo: string; puntos: [number, number][] }[] = [];
  for (const [angulo, faces] of Object.entries(SPIN_FACES)) {
    faces.forEach((face) => {
      LEVELS.forEach((level, index) => {
        const rows = units
          .filter((unit) => unit.tipo === "departamento" && unit.planta === plantaKey(level) && unit.orientacion && face.orientaciones.includes(unit.orientacion))
          .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));
        if (!rows.length) return;
        const v0 = index / LEVELS.length;
        const v1 = (index + 1) / LEVELS.length;
        rows.forEach((unit, column) => {
          const u0 = column / rows.length;
          const u1 = (column + 1) / rows.length;
          const padU = (u1 - u0) * 0.08;
          const padV = (v1 - v0) * 0.1;
          cells.push({
            angulo,
            codigo: unit.codigo,
            puntos: [
              onQuad(face.quad, u0 + padU, v0 + padV),
              onQuad(face.quad, u1 - padU, v0 + padV),
              onQuad(face.quad, u1 - padU, v1 - padV),
              onQuad(face.quad, u0 + padU, v1 - padV),
            ],
          });
        });
      });
    });
  }
  return cells;
}
