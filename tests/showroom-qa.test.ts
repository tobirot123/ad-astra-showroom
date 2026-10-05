import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import pol from "@/lib/demo/pol-data.json";
import { galleryHeroRank } from "@/lib/domain/gallery-rank";
import { interiorPoint, pointInPolygon } from "@/lib/domain/polygon";

function polygonArea(points: [number, number][]) {
  let sum = 0;
  for (let index = 0; index < points.length; index++) {
    const [x1, y1] = points[index]!;
    const [x2, y2] = points[(index + 1) % points.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}
import { firstResidentialFloor, isRealTour } from "@/lib/domain/showroom-flow";
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

  it("el área de cada polígono sigue el m² de la unidad en la misma planta", () => {
    const units = pol.units as { codigo: string; planta: string; tipo: string; m2: number | null }[];
    const polygons = pol.polygons as Record<string, Record<string, [number, number][]>>;
    const byFloor = new Map<string, { codigo: string; m2: number; points: [number, number][] }[]>();
    for (const unit of units) {
      if (unit.tipo !== "departamento" && unit.tipo !== "local") continue;
      if (!unit.m2) continue;
      const points = polygons[unit.planta]?.[unit.codigo];
      if (!points || points.length < 3) continue;
      const list = byFloor.get(unit.planta) ?? [];
      list.push({ codigo: unit.codigo, m2: unit.m2, points });
      byFloor.set(unit.planta, list);
    }
    expect(byFloor.size).toBeGreaterThanOrEqual(12);
    for (const [floor, list] of byFloor) {
      expect(list.length, floor).toBeGreaterThan(1);
      const areaSum = list.reduce((sum, item) => sum + polygonArea(item.points), 0);
      const m2Sum = list.reduce((sum, item) => sum + item.m2, 0);
      for (const item of list) {
        const ratio = polygonArea(item.points) / areaSum / (item.m2 / m2Sum);
        expect(Math.abs(ratio - 1), `${floor} ${item.codigo} ${ratio.toFixed(3)}`).toBeLessThanOrEqual(0.25);
      }
    }
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

  it("Ver plantas abre el primer piso residencial, no el techo", () => {
    const floors = [
      { numero: 20, libres: 0, id: "techo" },
      { numero: 11, libres: 2, id: "11" },
      { numero: 1, libres: 4, id: "1" },
    ];
    expect(firstResidentialFloor(floors)?.id).toBe("1");
    expect(firstResidentialFloor([{ numero: 20, libres: 0, id: "techo" }, { numero: 4, libres: 0, id: "4" }, { numero: 2, libres: 1, id: "2" }])?.id).toBe("2");
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
