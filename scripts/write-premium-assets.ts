import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import sharp from "sharp";
import { COLUMNS, FACADE, FLOOR_BANDS, PLAN_COLUMNS, TORRE_B_COLUMNS, TORRE_B_FLOORS, torreBPolygon, unitPolygon } from "../src/lib/demo/geometry";

const dir = path.join(process.cwd(), "public", "demo");
fs.mkdirSync(dir, { recursive: true });

function writeSvg(name: string, svg: string) {
  fs.writeFileSync(path.join(dir, name), svg);
}

function win(poly: [number, number][], w: number, h: number) {
  const x = poly[0][0] * w;
  const y = poly[0][1] * h;
  const ww = (poly[1][0] - poly[0][0]) * w;
  const hh = (poly[2][1] - poly[0][1]) * h;
  return { x, y, ww, hh };
}

function facade(label: string, floors: { n: number; y0: number; y1: number }[], cols: { letter: string; x0: number; x1: number }[], poly: (floor: number, letter: string) => [number, number][]) {
  const w = FACADE.width;
  const h = FACADE.height;
  const windows = floors
    .flatMap((band) =>
      cols.map((col) => {
        const box = win(poly(band.n, col.letter), w, h);
        const balcony = box.hh * 0.22;
        return `
        <g>
          <rect x="${(box.x - 6).toFixed(1)}" y="${(box.y + box.hh - 2).toFixed(1)}" width="${(box.ww + 12).toFixed(1)}" height="${balcony.toFixed(1)}" fill="#d9cbb8" stroke="#b7a48c"/>
          <path d="M${(box.x - 4).toFixed(1)} ${(box.y + box.hh + 4).toFixed(1)} v${(balcony - 6).toFixed(1)} M${(box.x + box.ww + 4).toFixed(1)} ${(box.y + box.hh + 4).toFixed(1)} v${(balcony - 6).toFixed(1)}" stroke="#8d7358" fill="none"/>
          ${Array.from({ length: 5 }, (_, i) => `<line x1="${(box.x - 4 + ((box.ww + 8) * i) / 4).toFixed(1)}" y1="${(box.y + box.hh + 3).toFixed(1)}" x2="${(box.x - 4 + ((box.ww + 8) * i) / 4).toFixed(1)}" y2="${(box.y + box.hh + balcony - 2).toFixed(1)}" stroke="#a08b72" stroke-width="1.2"/>`).join("")}
          <rect x="${box.x.toFixed(1)}" y="${box.y.toFixed(1)}" width="${box.ww.toFixed(1)}" height="${(box.hh * 0.78).toFixed(1)}" fill="url(#glass)" stroke="#6e5a45" stroke-width="2"/>
          <line x1="${(box.x + box.ww / 2).toFixed(1)}" y1="${box.y.toFixed(1)}" x2="${(box.x + box.ww / 2).toFixed(1)}" y2="${(box.y + box.hh * 0.78).toFixed(1)}" stroke="#efe6da" stroke-width="1.4"/>
          <rect x="${(box.x + 4).toFixed(1)}" y="${(box.y + 4).toFixed(1)}" width="${(box.ww * 0.28).toFixed(1)}" height="${(box.hh * 0.35).toFixed(1)}" fill="#fff" opacity="0.35"/>
        </g>`;
      }),
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#24384a"/>
      <stop offset="0.45" stop-color="#c98662"/>
      <stop offset="1" stop-color="#f4e2cc"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbf7f1"/>
      <stop offset="1" stop-color="#e7d8c6"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e7f2f6"/>
      <stop offset="0.45" stop-color="#9ec0d0"/>
      <stop offset="1" stop-color="#6f93a6"/>
    </linearGradient>
    <radialGradient id="sun" cx="78%" cy="18%" r="22%">
      <stop offset="0" stop-color="#fff1dc" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#fff1dc" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#sun)"/>
  <ellipse cx="120" cy="${h - 70}" rx="90" ry="36" fill="#314237"/>
  <ellipse cx="${w - 110}" cy="${h - 60}" rx="100" ry="40" fill="#3c5144"/>
  <rect y="${h - 90}" width="${w}" height="90" fill="#d5cbbd"/>
  <rect x="48" y="70" width="${w - 96}" height="${h - 150}" fill="url(#stone)"/>
  <rect x="48" y="70" width="${w - 96}" height="28" fill="#2a241f"/>
  <text x="${w / 2}" y="90" text-anchor="middle" fill="#f6f1e8" font-family="Georgia, serif" font-size="18" letter-spacing="8">${label}</text>
  ${cols
    .slice(0, -1)
    .map((col, index) => {
      const next = cols[index + 1];
      const x = ((col.x1 + next.x0) / 2) * w;
      return `<rect x="${x - 3}" y="98" width="6" height="${h - 210}" fill="#efe4d6"/>`;
    })
    .join("")}
  ${windows}
  <rect x="${w / 2 - 70}" y="${h - 150}" width="140" height="62" fill="#2a241f"/>
  <rect x="${w / 2 - 52}" y="${h - 136}" width="44" height="48" fill="url(#glass)"/>
  <rect x="${w / 2 + 8}" y="${h - 136}" width="44" height="48" fill="url(#glass)"/>
</svg>`;
}

function floorPlan(title: string, cols: { letter: string; x0: number; x1: number }[]) {
  const w = 1200;
  const h = 800;
  const rooms = cols
    .map((col) => {
      const x = (col.x0 + 0.02) * w;
      const ww = (col.x1 - col.x0 - 0.04) * w;
      const y = 0.22 * h;
      const hh = 0.56 * h;
      return `
      <g>
        <rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#fbf7f2" stroke="#1c1915" stroke-width="7"/>
        <line x1="${x + ww * 0.42}" y1="${y}" x2="${x + ww * 0.42}" y2="${y + hh * 0.62}" stroke="#1c1915" stroke-width="3"/>
        <line x1="${x}" y1="${y + hh * 0.62}" x2="${x + ww}" y2="${y + hh * 0.62}" stroke="#1c1915" stroke-width="3"/>
        <rect x="${x + 10}" y="${y + 16}" width="${ww * 0.28}" height="${hh * 0.22}" fill="none" stroke="#c4b7a4"/>
        <text x="${x + ww * 0.7}" y="${y + 36}" font-family="Georgia, serif" font-size="18" fill="#6b6258">${col.letter}</text>
        <text x="${x + 14}" y="${y + hh * 0.5}" font-family="Georgia, serif" font-size="13" fill="#8a7b6a">Estar</text>
        <text x="${x + 14}" y="${y + hh * 0.78}" font-family="Georgia, serif" font-size="13" fill="#8a7b6a">Dorm</text>
      </g>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#f3eee6"/>
    <g stroke="#e4d9c8" stroke-width="1">
      ${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="${w}" y2="${i * 50}"/>`).join("")}
      ${Array.from({ length: 24 }, (_, i) => `<line y1="0" x1="${i * 50}" y2="${h}" x2="${i * 50}"/>`).join("")}
    </g>
    <text x="48" y="48" font-family="Georgia, serif" font-size="28" fill="#1c1915">${title}</text>
    <text x="48" y="74" font-family="Georgia, serif" font-size="14" fill="#6b6258">Planta tipo · cotas en metros</text>
    <polygon points="1080,46 1092,78 1068,78" fill="#1c1915"/>
    <text x="1100" y="74" font-family="Georgia, serif" font-size="14" fill="#1c1915">N</text>
    ${rooms}
  </svg>`;
}

function interior(kind: "living" | "cocina") {
  const sofa = kind === "living";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#d7e4ea"/>
        <stop offset="1" stop-color="#f6efe6"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="800" fill="url(#sky)"/>
    <rect y="430" width="1200" height="370" fill="#e7d7c4"/>
    <rect x="70" y="150" width="520" height="300" fill="#c5d7e2" stroke="#8d7358" stroke-width="8"/>
    <rect x="90" y="170" width="200" height="250" fill="#f7f1e8" opacity="0.35"/>
    ${sofa
      ? `<rect x="620" y="470" width="420" height="150" rx="16" fill="#6d5344"/>
         <rect x="650" y="440" width="150" height="80" fill="#8d6a52"/>
         <rect x="860" y="500" width="140" height="70" fill="#c4a574"/>`
      : `<rect x="640" y="360" width="420" height="28" fill="#f7f1e8"/>
         <rect x="660" y="388" width="380" height="220" fill="#efe6da" stroke="#c4b7a4"/>
         <rect x="700" y="430" width="120" height="80" fill="#d7c4ae"/>
         <circle cx="980" cy="470" r="28" fill="#9a6240"/>`}
    <rect x="80" y="620" width="280" height="16" fill="#1c1915" opacity="0.25"/>
  </svg>`;
}

writeSvg("fachada.svg", facade("ALBA", FLOOR_BANDS, COLUMNS, unitPolygon));
writeSvg(
  "fachada-b.svg",
  facade("TORRE B", TORRE_B_FLOORS, TORRE_B_COLUMNS, torreBPolygon),
);
writeSvg("plano-piso.svg", floorPlan("Torre A", PLAN_COLUMNS));
writeSvg(
  "plano-piso-b.svg",
  floorPlan("Torre B", [
    { letter: "A", x0: 0.1, x1: 0.46 },
    { letter: "B", x0: 0.54, x1: 0.9 },
  ]),
);
writeSvg("plano-2amb.svg", floorPlan("2 ambientes", [{ letter: "A", x0: 0.12, x1: 0.88 }]));
writeSvg(
  "plano-3amb.svg",
  floorPlan("3 ambientes", [
    { letter: "A", x0: 0.08, x1: 0.48 },
    { letter: "B", x0: 0.52, x1: 0.92 },
  ]),
);
writeSvg("render-living.svg", interior("living"));
writeSvg("render-cocina.svg", interior("cocina"));

writeSvg(
  "portada.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a2836"/>
        <stop offset="0.55" stop-color="#b86a48"/>
        <stop offset="1" stop-color="#f0d2b4"/>
      </linearGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#sky)"/>
    <circle cx="1180" cy="180" r="64" fill="#f8e2c4"/>
    <rect y="640" width="1600" height="260" fill="#243028"/>
    <rect y="700" width="1600" height="28" fill="#3d4a40"/>
    <g fill="#1b1613">
      <rect x="250" y="250" width="180" height="470"/>
      <rect x="470" y="180" width="210" height="540"/>
      <rect x="720" y="280" width="160" height="440"/>
    </g>
    <g fill="#d5e4ec" opacity="0.55">
      ${[0, 1, 2, 3, 4].map((row) => [0, 1, 2].map((col) => `<rect x="${500 + col * 48}" y="${220 + row * 70}" width="28" height="40"/>`).join("")).join("")}
    </g>
  </svg>`,
);

writeSvg(
  "aereo.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#d5e0d2"/>
    <rect x="30" y="30" width="1540" height="840" fill="#c5d4c2"/>
    <path d="M0 450 H1600" stroke="#f4efe6" stroke-width="54"/>
    <path d="M560 0 V900" stroke="#f4efe6" stroke-width="36"/>
    <ellipse cx="230" cy="190" rx="120" ry="70" fill="#7f9c78"/>
    <rect x="250" y="180" width="210" height="280" fill="#efe6da" stroke="#b7a48c" stroke-width="4"/>
    <rect x="860" y="160" width="190" height="250" fill="#efe6da" stroke="#b7a48c" stroke-width="4"/>
    <g fill="#e7dccb" stroke="#8d7358" stroke-width="3">
      <rect x="250" y="560" width="250" height="130"/>
      <rect x="530" y="560" width="250" height="130"/>
      <rect x="810" y="560" width="250" height="130"/>
      <rect x="250" y="720" width="250" height="120"/>
      <rect x="530" y="720" width="250" height="120"/>
      <rect x="810" y="720" width="250" height="120"/>
    </g>
  </svg>`,
);

writeSvg(
  "barrio.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="#d5e3ea"/>
    <rect y="520" width="1600" height="380" fill="#d2c6b4"/>
    <g fill="#f7f1e8" stroke="#c4b7a4">
      <rect x="80" y="560" width="240" height="150"/>
      <rect x="360" y="540" width="200" height="180"/>
      <rect x="600" y="580" width="280" height="130"/>
      <rect x="930" y="530" width="220" height="190"/>
      <rect x="1200" y="570" width="280" height="140"/>
    </g>
    <rect x="700" y="280" width="80" height="300" fill="#2a241f"/>
    <rect x="810" y="230" width="100" height="350" fill="#3a312a"/>
  </svg>`,
);

writeSvg(
  "masterplan.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#e4efe2"/>
    <rect x="36" y="36" width="1128" height="728" fill="#d7e6d4" stroke="#8eaa86"/>
    <g fill="#f7f3ec" stroke="#8d7358" stroke-width="4">
      <rect x="90" y="140" width="280" height="210"/>
      <rect x="450" y="140" width="280" height="210"/>
      <rect x="810" y="140" width="280" height="210"/>
      <rect x="90" y="450" width="280" height="210"/>
      <rect x="450" y="450" width="280" height="210"/>
      <rect x="810" y="450" width="280" height="210"/>
    </g>
    <text x="600" y="90" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#1c1915">Loteo del parque</text>
  </svg>`,
);

writeSvg(
  "panorama.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="600" viewBox="0 0 2000 600">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8eb4c8"/><stop offset="1" stop-color="#f6efe4"/></linearGradient></defs>
    <rect width="2000" height="600" fill="url(#sky)"/>
    <rect y="390" width="2000" height="210" fill="#b7c8a8"/>
    <g fill="#2a241f">
      <rect x="80" y="210" width="70" height="190"/>
      <rect x="200" y="160" width="110" height="240"/>
      <rect x="520" y="240" width="80" height="160"/>
      <rect x="980" y="140" width="140" height="260"/>
      <rect x="1500" y="200" width="90" height="200"/>
      <rect x="1760" y="230" width="150" height="170"/>
    </g>
  </svg>`,
);

writeSvg(
  "vista-altura.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7d0de"/><stop offset="1" stop-color="#f4ece2"/></linearGradient></defs>
    <rect width="1200" height="800" fill="url(#sky)"/>
    <rect y="520" width="1200" height="280" fill="#9aab8d"/>
    <rect x="90" y="300" width="36" height="240" fill="#2a241f"/>
    <rect x="220" y="250" width="80" height="290" fill="#3a312a"/>
    <rect x="760" y="200" width="100" height="340" fill="#241c17"/>
  </svg>`,
);

const raster: Array<[string, string, number]> = [
  ["fachada.svg", "fachada.webp", 1400],
  ["fachada-b.svg", "fachada-b.webp", 1400],
  ["plano-piso.svg", "plano-piso.webp", 1600],
  ["plano-piso-b.svg", "plano-piso-b.webp", 1600],
  ["plano-2amb.svg", "plano-2amb.webp", 1200],
  ["plano-3amb.svg", "plano-3amb.webp", 1200],
  ["render-living.svg", "render-living.webp", 1400],
  ["render-cocina.svg", "render-cocina.webp", 1400],
  ["portada.svg", "portada.webp", 1600],
  ["aereo.svg", "aereo.webp", 1600],
  ["barrio.svg", "barrio.webp", 1600],
  ["masterplan.svg", "masterplan.webp", 1400],
  ["panorama.svg", "panorama.webp", 2000],
  ["vista-altura.svg", "vista-altura.webp", 1400],
];

async function main() {
  for (const [svg, webp, width] of raster) {
    const input = path.join(dir, svg);
    const out = path.join(dir, webp);
    await sharp(input).resize({ width }).webp({ quality: 86 }).toFile(out);
    console.log(webp, fs.statSync(out).size);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "alba-"));
  await sharp(path.join(dir, "portada.webp")).resize(1280, 720).png().toFile(path.join(tmp, "a.png"));
  await sharp(path.join(dir, "aereo.webp")).resize(1280, 720).png().toFile(path.join(tmp, "b.png"));
  const video = path.join(dir, "vuelo-intro.mp4");
  execSync(
    `ffmpeg -y -loop 1 -t 1.6 -i ${tmp}/a.png -loop 1 -t 1.6 -i ${tmp}/b.png -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.8:offset=0.8,format=yuv420p" -movflags +faststart -an ${video}`,
    { stdio: "inherit" },
  );
  const brochure = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 180>>stream
BT /F1 28 Tf 72 760 Td (ALBA) Tj /F1 14 Tf 0 -36 Td (Brochure de demostracion. Reemplazalo por el PDF real.) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Times-Roman>>endobj
trailer<</Root 1 0 R>>
%%EOF`;
  fs.writeFileSync(path.join(dir, "brochure.pdf"), brochure);
  fs.writeFileSync(
    path.join(dir, "slots.json"),
    JSON.stringify(
      {
        nota: "Reemplazá el archivo manteniendo el nombre y la proporción. El showroom lo toma solo. También podés subir el render en Medios y elegirlo en Recorrido.",
        archivos: raster.map(([, webp]) => webp).concat(["vuelo-intro.mp4", "brochure.pdf"]),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
