/** Coordenadas normalizadas (0–1) de la fachada demo. El SVG y los polígonos comparten estos números. */
export const FACADE = { width: 800, height: 1100 };

export const COLUMNS = [
  { letter: "A", x0: 0.15, x1: 0.31, orientacion: "Norte", amb: 2 as const },
  { letter: "B", x0: 0.35, x1: 0.51, orientacion: "NE", amb: 2 as const },
  { letter: "C", x0: 0.55, x1: 0.71, orientacion: "Este", amb: 3 as const },
  { letter: "D", x0: 0.75, x1: 0.91, orientacion: "Oeste", amb: 3 as const },
];

export const FLOOR_BANDS = [
  { n: 5, y0: 0.115, y1: 0.245 },
  { n: 4, y0: 0.265, y1: 0.395 },
  { n: 3, y0: 0.415, y1: 0.545 },
  { n: 2, y0: 0.565, y1: 0.695 },
  { n: 1, y0: 0.715, y1: 0.845 },
];

export function unitPolygon(floor: number, letter: string): [number, number][] {
  const col = COLUMNS.find((c) => c.letter === letter);
  const band = FLOOR_BANDS.find((f) => f.n === floor);
  if (!col || !band) throw new Error(`Sin geometría para ${floor}${letter}`);
  const ix = (col.x1 - col.x0) * 0.1;
  const iy = (band.y1 - band.y0) * 0.14;
  const x0 = round(col.x0 + ix);
  const x1 = round(col.x1 - ix);
  const y0 = round(band.y0 + iy);
  const y1 = round(band.y1 - iy);
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function rect(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [
    [round(x0), round(y0)],
    [round(x1), round(y0)],
    [round(x1), round(y1)],
    [round(x0), round(y1)],
  ];
}

/** Planta tipo de Torre A: cuatro unidades de izquierda a derecha. */
export const PLAN_COLUMNS = [
  { letter: "A", x0: 0.07, x1: 0.27 },
  { letter: "B", x0: 0.29, x1: 0.49 },
  { letter: "C", x0: 0.51, x1: 0.71 },
  { letter: "D", x0: 0.73, x1: 0.93 },
];

export function planPolygon(letter: string): [number, number][] {
  const col = PLAN_COLUMNS.find((c) => c.letter === letter);
  if (!col) throw new Error(`Sin planta para ${letter}`);
  return rect(col.x0 + 0.015, 0.2, col.x1 - 0.015, 0.8);
}

export const TORRE_B_COLUMNS = [
  { letter: "A", x0: 0.2, x1: 0.46 },
  { letter: "B", x0: 0.54, x1: 0.8 },
];

export const TORRE_B_FLOORS = [
  { n: 3, y0: 0.16, y1: 0.34 },
  { n: 2, y0: 0.4, y1: 0.58 },
  { n: 1, y0: 0.64, y1: 0.82 },
];

export function torreBPolygon(floor: number, letter: string): [number, number][] {
  const col = TORRE_B_COLUMNS.find((c) => c.letter === letter);
  const band = TORRE_B_FLOORS.find((f) => f.n === floor);
  if (!col || !band) throw new Error(`Sin geometría B ${floor}${letter}`);
  return rect(col.x0 + 0.02, band.y0 + 0.02, col.x1 - 0.02, band.y1 - 0.02);
}

export function torreBPlanPolygon(letter: string): [number, number][] {
  const col = letter === "A" ? { x0: 0.1, x1: 0.46 } : { x0: 0.54, x1: 0.9 };
  return rect(col.x0, 0.18, col.x1, 0.82);
}

export function lotePolygon(index: number): [number, number][] {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const x0 = 0.08 + col * 0.3;
  const y0 = 0.16 + row * 0.4;
  return rect(x0, y0, x0 + 0.24, y0 + 0.3);
}

export const AERIAL_HOTSPOTS = {
  torreA: rect(0.16, 0.2, 0.4, 0.52),
  torreB: rect(0.5, 0.18, 0.74, 0.5),
  loteo: rect(0.18, 0.6, 0.78, 0.88),
};

export function facadeSvg(): string {
  const { width: w, height: h } = FACADE;
  const windows = FLOOR_BANDS.flatMap((band) =>
    COLUMNS.map((col) => {
      const poly = unitPolygon(band.n, col.letter);
      const x = poly[0][0] * w;
      const y = poly[0][1] * h;
      const ww = (poly[1][0] - poly[0][0]) * w;
      const hh = (poly[2][1] - poly[0][1]) * h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" height="${hh.toFixed(1)}" rx="2" fill="url(#glass)" stroke="#8d7358" stroke-width="3"/>
      <line x1="${(x + ww / 2).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + ww / 2).toFixed(1)}" y2="${(y + hh).toFixed(1)}" stroke="#8d7358" stroke-width="2"/>
      <line x1="${x.toFixed(1)}" y1="${(y + hh / 2).toFixed(1)}" x2="${(x + ww).toFixed(1)}" y2="${(y + hh / 2).toFixed(1)}" stroke="#8d7358" stroke-width="2"/>`;
    }),
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Fachada del emprendimiento ALBA">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d9e4ea"/>
      <stop offset="1" stop-color="#f3efe6"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f1e7"/>
      <stop offset="1" stop-color="#e4d8c8"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c5d5df"/>
      <stop offset="1" stop-color="#8eabbc"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect x="0" y="980" width="${w}" height="120" fill="#d7cfc3"/>
  <rect x="40" y="1000" width="720" height="8" fill="#c4b6a4"/>
  <rect x="70" y="78" width="660" height="910" rx="6" fill="url(#stone)" stroke="#c3b29a" stroke-width="2"/>
  <rect x="90" y="48" width="620" height="40" fill="#1f1a17"/>
  <text x="400" y="75" text-anchor="middle" fill="#f4efe6" font-family="Georgia, serif" font-size="22" letter-spacing="8">ALBA</text>
  <rect x="300" y="930" width="200" height="58" fill="#1f1a17"/>
  <rect x="318" y="944" width="70" height="44" fill="#8eabbc"/>
  <rect x="412" y="944" width="70" height="44" fill="#8eabbc"/>
  ${windows}
</svg>`;
}
