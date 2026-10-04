import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import pol from "@/lib/demo/pol-data.json";
import { galleryHeroRank } from "@/lib/domain/gallery-rank";
import { interiorPoint, pointInPolygon } from "@/lib/domain/polygon";
import { firstResidentialFloor, isRealTour } from "@/lib/domain/showroom-flow";
import { buildSeed } from "@/lib/demo/seed";
import { buildShowroom } from "@/lib/services/present";

describe("showroom QA", () => {
  it("cada pastilla de la planta 4 cae dentro de su unidad", () => {
    const floor = pol.polygons["04"] as Record<string, [number, number][]>;
    const entries = Object.entries(floor);
    expect(entries.length).toBe(6);
    for (const [code, points] of entries) {
      const [x, y] = interiorPoint(points);
      const hits = entries.filter(([, shape]) => pointInPolygon(shape, x, y)).map(([id]) => id);
      expect(hits[hits.length - 1]).toBe(code);
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
    expect(galleryHeroRank("/demo/pol/interiores/int-12_304.webp")).toBeLessThan(galleryHeroRank("/demo/pol/interiores/int-04_101-201.webp"));
    const showroom = buildShowroom(buildSeed(new Date("2026-10-04T12:00:00.000Z")), "pol");
    const unit = showroom?.units.find((item) => item.codigo === "406");
    expect(unit?.galeria[0]).toContain("int-12_");
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
