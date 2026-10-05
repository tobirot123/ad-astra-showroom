import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import pol from "@/lib/demo/pol-data.json";
import { galleryHeroRank } from "@/lib/domain/gallery-rank";
import { interiorPoint, pointInPolygon } from "@/lib/domain/polygon";

const PX_PER_M2 = 495.6584659913169;
const PLATE_FLOORS = ["03", "04", "05", "06", "07", "08", "09"];

function rasterize(points: [number, number][], width: number, height: number) {
  const mask = new Uint8Array(width * height);
  const poly = points.map(([x, y]) => [Math.round(x * width), Math.round(y * height)] as const);
  for (let y = 0; y < height; y++) {
    const crossings: number[] = [];
    for (let index = 0; index < poly.length; index++) {
      const [x1, y1] = poly[index]!;
      const [x2, y2] = poly[(index + 1) % poly.length]!;
      if (y1 === y2) continue;
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        crossings.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let index = 0; index + 1 < crossings.length; index += 2) {
      let start = Math.ceil(crossings[index]!);
      let end = Math.floor(crossings[index + 1]!);
      if (start < 0) start = 0;
      if (end >= width) end = width - 1;
      // Un cruce de ida y vuelta no pinta la columna del puente.
      if (start >= end) continue;
      for (let x = start; x <= end; x++) mask[y * width + x] = 1;
    }
  }
  return mask;
}

import { markerQuad, stackMarkers } from "@/lib/domain/fachada-grilla";
import { entryFloor, facadeMatch, firstResidentialFloor, isRealTour } from "@/lib/domain/showroom-flow";
import { buildSeed } from "@/lib/demo/seed";
import { buildShowroom } from "@/lib/services/present";

describe("showroom QA", () => {
  it("cada pastilla cae dentro de su unidad", () => {
    const polygons = pol.polygons as Record<string, Record<string, [number, number][]>>;
    for (const floorKey of ["03", "04", "05", "06", "07", "08", "09"]) {
      const entries = Object.entries(polygons[floorKey] ?? {});
      expect(entries.length, floorKey).toBeGreaterThan(3);
      for (const [code, points] of entries) {
        const [x, y] = interiorPoint(points);
        expect(pointInPolygon(points, x, y), `${floorKey} ${code}`).toBe(true);
        const hits = entries.filter(([, shape]) => pointInPolygon(shape, x, y)).map(([id]) => id);
        expect(hits[hits.length - 1], `${floorKey} ${code}`).toBe(code);
      }
    }
  });

  it("la geometría sigue el plano aunque el m² informado sea otro", () => {
    const units = pol.units as { codigo: string; planta: string; m2_int: number | null }[];
    const polygons = pol.polygons as Record<string, Record<string, [number, number][]>>;
    const listed = units.find((unit) => unit.codigo === "605")?.m2_int ?? 0;
    const points = polygons["06"]?.["605"];
    expect(points?.length).toBeGreaterThan(3);
    const measured = rasterize(points!, 1920, 1080).reduce((sum, value) => sum + value, 0) / PX_PER_M2;
    expect(measured).toBeGreaterThan(listed * 1.2);
  });

  it("las huellas no salen de la losa, no pisan el núcleo y no se solapan", async () => {
    const polygons = pol.polygons as Record<string, Record<string, [number, number][]>>;
    const shared = JSON.parse(readFileSync("tests/fixtures/plates/shared-rooms.json", "utf8")) as Record<string, unknown[]>;
    for (const floor of PLATE_FLOORS) {
      const slabFile = await sharp(`tests/fixtures/plates/slab-${floor}.png`).raw().toBuffer({ resolveWithObject: true });
      const coreFile = await sharp(`tests/fixtures/plates/core-${floor}.png`).raw().toBuffer({ resolveWithObject: true });
      const { width, height, channels } = slabFile.info;
      const slab = slabFile.data;
      const core = coreFile.data;
      const slabAt = (index: number) => slab[index * channels] ?? 0;
      const coreAt = (index: number) => core[index * (coreFile.info.channels ?? 1)] ?? 0;
      const entries = Object.entries(polygons[floor] ?? {});
      expect(entries.length, floor).toBeGreaterThan(2);
      const covered = new Uint8Array(width * height);
      for (const [code, points] of entries) {
        const mask = rasterize(points, width, height);
        let outside = 0;
        let onCore = 0;
        let overlap = 0;
        for (let index = 0; index < mask.length; index++) {
          if (!mask[index]) continue;
          if (slabAt(index) === 0) outside += 1;
          if (coreAt(index) > 0) onCore += 1;
          if (covered[index]) overlap += 1;
          covered[index] = 1;
        }
        expect(outside, `${code} fuera de la losa`).toBe(0);
        expect(onCore, `${code} sobre el núcleo`).toBe(0);
        expect(overlap, `${code} solapa otra huella`).toBe(0);
      }
      let unitPixels = 0;
      let openPixels = 0;
      for (let index = 0; index < slab.length; index++) {
        if (slabAt(index) === 0 || coreAt(index) > 0) continue;
        unitPixels += 1;
        if (!covered[index]) openPixels += 1;
      }
      const share = openPixels / Math.max(1, unitPixels);
      expect(shared[floor], floor).toEqual([]);
      expect(share, `${floor} sin asignar ${(share * 100).toFixed(1)}%`).toBeLessThan(0.05);
      const roomsFile = await sharp(`tests/fixtures/plates/rooms-${floor}.png`).raw().toBuffer({ resolveWithObject: true });
      const labels = new Uint16Array(roomsFile.data.buffer, roomsFile.data.byteOffset, roomsFile.data.length / 2);
      const totals = new Map<number, number>();
      const hits = new Map<number, number>();
      for (let index = 0; index < labels.length; index++) {
        const label = labels[index] ?? 0;
        if (!label || coreAt(index) > 0) continue;
        totals.set(label, (totals.get(label) ?? 0) + 1);
        if (covered[index]) hits.set(label, (hits.get(label) ?? 0) + 1);
      }
      for (const [label, total] of totals) {
        if (total < 80) continue;
        const ratio = (hits.get(label) ?? 0) / total;
        expect(ratio <= 0.08 || ratio >= 0.92, `${floor} ambiente ${label} cortado ${ratio.toFixed(2)}`).toBe(true);
      }
    }
  });

  it("las huellas viejas, medidas al m², no cubren la losa del plano", async () => {
    const legacy = JSON.parse(readFileSync("tests/fixtures/plates/legacy-08.json", "utf8")) as Record<string, [number, number][]>;
    const slabFile = await sharp("tests/fixtures/plates/slab-08.png").raw().toBuffer({ resolveWithObject: true });
    const coreFile = await sharp("tests/fixtures/plates/core-08.png").raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = slabFile.info;
    const covered = new Uint8Array(width * height);
    for (const points of Object.values(legacy)) {
      const mask = rasterize(points, width, height);
      for (let index = 0; index < mask.length; index++) if (mask[index]) covered[index] = 1;
    }
    let unitPixels = 0;
    let openPixels = 0;
    for (let index = 0; index < slabFile.data.length; index++) {
      const slab = slabFile.data[index * channels] ?? 0;
      const core = coreFile.data[index * (coreFile.info.channels ?? 1)] ?? 0;
      if (slab === 0 || core > 0) continue;
      unitPixels += 1;
      if (!covered[index]) openPixels += 1;
    }
    expect(openPixels / Math.max(1, unitPixels)).toBeGreaterThan(0.3);
  });

  it("las plantas distintas no comparten el mismo rectángulo de la grilla", () => {
    const floor = pol.polygons["04"] as Record<string, [number, number][]>;
    const signatures = new Set(Object.values(floor).map((points) => JSON.stringify(points)));
    expect(signatures.size).toBe(6);
    for (const points of Object.values(floor)) {
      const width = Math.max(...points.map((point) => point[0])) - Math.min(...points.map((point) => point[0]));
      const height = Math.max(...points.map((point) => point[1])) - Math.min(...points.map((point) => point[1]));
      expect(width).toBeLessThan(0.45);
      expect(height).toBeLessThan(0.55);
    }
  });

  it("Ver plantas abre el piso residencial más alto", () => {
    expect(entryFloor([
      { numero: 20, id: "techo", plano: "/t.webp" },
      { numero: 11, id: "11", plano: "/11.webp" },
      { numero: 1, id: "1", plano: "/1.webp" },
    ])?.id).toBe("11");
    expect(entryFloor([
      { numero: 20, id: "techo", plano: "/t.webp" },
    ])?.id).toBe("techo");
    expect(entryFloor([
      { numero: 4, id: "4", plano: "/4.webp" },
      { numero: 2, id: "2", plano: "/2.webp" },
    ])?.id).toBe("4");
    expect(firstResidentialFloor([{ numero: 20, libres: 0, id: "techo" }, { numero: 1, libres: 4, id: "1" }])?.id).toBe("1");
  });

  it("los filtros de fachada combinan dormitorios y estado", () => {
    const two = { estado: "disponible", dormitorios: 2, m2_totales: 70 };
    const sold = { estado: "vendida", dormitorios: 2, m2_totales: 70 };
    const one = { estado: "disponible", dormitorios: 1, m2_totales: 40 };
    expect(facadeMatch(two, { estados: ["disponible"], dorms: ["2"], areaMin: 0, areaMax: 200, areaOn: false })).toBe(true);
    expect(facadeMatch(sold, { estados: ["disponible"], dorms: ["2"], areaMin: 0, areaMax: 200, areaOn: false })).toBe(false);
    expect(facadeMatch(one, { estados: [], dorms: ["2"], areaMin: 0, areaMax: 200, areaOn: false })).toBe(false);
    expect(facadeMatch(two, { estados: ["disponible", "vendida"], dorms: [], areaMin: 0, areaMax: 200, areaOn: false })).toBe(true);
    const quad = markerQuad([[0, 0], [0.2, 0], [0.2, 0.1], [0, 0.1]]);
    const span = quad[1]![0] - quad[0]![0];
    const height = quad[2]![1] - quad[1]![1];
    expect(span).toBeGreaterThan(0.005);
    expect(span).toBeLessThan(0.008);
    expect(height).toBeGreaterThan(0.016);
    expect(height).toBeLessThan(0.022);
    const stacked = stackMarkers([
      { id: "a", stack: "Norte", points: [[0.1, 0.2], [0.2, 0.2], [0.2, 0.28], [0.1, 0.28]] },
      { id: "b", stack: "Norte", points: [[0.12, 0.4], [0.22, 0.4], [0.22, 0.48], [0.12, 0.48]] },
    ]);
    expect(stacked.get("a")?.[0]?.[0]).toBe(stacked.get("b")?.[0]?.[0]);
  });

  it("un interior común no es un tour 360", () => {
    expect(isRealTour("url", "/demo/pol/interiores/int-04_101-201.webp", 1920, 1080)).toBe(false);
    expect(isRealTour("url", "/demo/pano.webp", 4000, 2000)).toBe(true);
    expect(isRealTour("matterport", "https://my.matterport.com/show/?m=abc")).toBe(true);
  });

  it("el hero de la galería no es un baño y el recorrido falso no se publica", () => {
    expect(galleryHeroRank("/demo/pol/interiores/int-09_110-210.webp")).toBeLessThan(galleryHeroRank("/demo/pol/interiores/int-12_304.webp"));
    expect(galleryHeroRank("/demo/pol/interiores/int-12_304.webp")).toBeGreaterThanOrEqual(70);
    const showroom = buildShowroom(buildSeed(new Date("2026-10-04T12:00:00.000Z")), "pol");
    const unit = showroom?.units.find((item) => item.codigo === "406");
    expect(unit?.galeria[0]).toContain("int-09_");
    const uno = showroom?.units.find((item) => item.codigo === "404");
    expect(uno?.galeria[0] ?? "").not.toMatch(/int-12_|int-04_|int-06_|int-08_/);
    expect(unit?.tour).toBeNull();
  });

  it("la portada y los polígonos no vuelven a tapar la pantalla", () => {
    const source = readFileSync("src/components/showroom/showroom-app.tsx", "utf8");
    expect(source).toContain('data-testid="entrar"');
    expect(source).toContain('stroke="none"');
    expect(source).toContain('pointerEvents="fill"');
    expect(source).not.toContain('stroke="transparent"');
  });
});
