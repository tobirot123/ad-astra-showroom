import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { POL_CARAS } from "@/lib/domain/fachada-grilla";
import { buildSeed } from "@/lib/demo/seed";
import { colorDistance, mapIdColors, maskReady, quantizeHex, referenceColor } from "@/lib/domain/facade-mask";
import { readIdPassColors } from "@/lib/media/id-pass";
import { actorFor, saveFacadeMask } from "@/lib/services/engine";
import { buildShowroom } from "@/lib/services/present";
import { ServiceError } from "@/lib/domain/types";

const BOUNDS: Record<string, { x0: number; x1: number; y0: number; y1: number }> = {
  "360°": { x0: 0.34, x1: 0.63, y0: 0.33, y1: 0.83 },
  "90°": { x0: 0.36, x1: 0.65, y0: 0.33, y1: 0.76 },
  "255°": { x0: 0.32, x1: 0.64, y0: 0.33, y1: 0.83 },
};

describe("máscaras de fachada", () => {
  it("deja cada polígono dentro de la torre y solo en la cara visible", () => {
    const data = buildSeed(new Date("2026-10-02T15:00:00.000Z"));
    const showroom = buildShowroom(data, "pol");
    const hidden: Record<string, string[]> = {
      "360°": ["Sur", "Sur-Este", "Sur-Oeste"],
      "90°": [],
      "255°": [],
    };
    for (const [nombre, box] of Object.entries(BOUNDS)) {
      const scene = showroom?.scenes.find((item) => item.nombre === nombre);
      expect(scene?.hotspots.length).toBeGreaterThan(0);
      expect(scene?.mascara).toBeNull();
      for (const hotspot of scene?.hotspots ?? []) {
        expect(hotspot.puntos).toHaveLength(4);
        for (const [x, y] of hotspot.puntos) {
          expect(x).toBeGreaterThanOrEqual(box.x0);
          expect(x).toBeLessThanOrEqual(box.x1);
          expect(y).toBeGreaterThanOrEqual(box.y0);
          expect(y).toBeLessThanOrEqual(box.y1);
        }
        const unit = showroom?.units.find((item) => item.id === hotspot.vinculo_id);
        expect(hidden[nombre]).not.toContain(unit?.orientacion);
      }
      const lows = (scene?.hotspots ?? []).flatMap((hotspot) => hotspot.puntos.map((point) => point[1]));
      expect(Math.min(...lows)).toBeGreaterThan(0.28);
      expect(Math.max(...lows)).toBeGreaterThan(0.7);
    }
  });

  it("inclina cada cara para seguir las losas", () => {
    for (const caras of Object.values(POL_CARAS)) {
      expect(caras.length).toBeGreaterThan(0);
      for (const cara of caras) {
        const [topLeft, topRight, bottomRight, bottomLeft] = cara.esquinas;
        expect(Math.abs(topLeft[1] - topRight[1])).toBeGreaterThan(0.012);
        expect(Math.abs(bottomLeft[1] - bottomRight[1])).toBeGreaterThan(0.012);
        expect(cara.pisos[0]).toBeGreaterThanOrEqual(cara.pisos.at(-1) ?? 0);
        expect(cara.losas).toHaveLength(cara.pisos.length + 1);
        const gap = (cara.losas ?? []).map((slab, index, all) => (all[index + 1] ? all[index + 1]!.izq - slab.izq : 0)).filter((value) => value > 0);
        expect(gap.at(-1)).toBeGreaterThan((gap.reduce((sum, value) => sum + value, 0) / gap.length) * 1.2);
      }
    }
  });

  it("asigna el pase de color a la paleta de la unidad", () => {
    const units = [
      { id: "a", codigo: "501" },
      { id: "b", codigo: "502" },
    ];
    const mapa = mapIdColors([referenceColor("501"), "#010101"], units);
    expect(mapa[0]).toMatchObject({ unidad_id: "a", distancia: 0 });
    expect(mapa[1]?.unidad_id).toBe("");
    expect(colorDistance(referenceColor("501"), referenceColor("501"))).toBe(0);
    expect(referenceColor("501")).toBe(referenceColor("501"));
    expect(quantizeHex(10, 10, 10)).toBe("#101010");
  });

  it("lee los colores planos de un PNG", async () => {
    const color = referenceColor("501");
    const [r, g, b] = [color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)].map((hex) => parseInt(hex, 16));
    const raw = Buffer.alloc(32 * 32 * 3, 0);
    for (let i = 0; i < 16 * 16; i += 1) {
      raw[i * 3] = r;
      raw[i * 3 + 1] = g;
      raw[i * 3 + 2] = b;
    }
    const png = await sharp(raw, { raw: { width: 32, height: 32, channels: 3 } }).png().toBuffer();
    const colors = await readIdPassColors(png);
    expect(colors).toContain(quantizeHex(r, g, b));
  });

  it("guarda la máscara de una parada y el showroom la prefiere", () => {
    const data = buildSeed(new Date("2026-10-02T15:00:00.000Z"));
    const admin = actorFor(data, data.profiles.find((profile) => profile.email.startsWith("martin"))!.id)!;
    const scene = data.viewpoints.find((item) => item.nombre === "360°")!;
    const unit = data.units.find((item) => item.codigo === "501")!;
    saveFacadeMask(data, admin, data.projects[0].id, scene.id, {
      viewpoint_id: scene.id,
      modo: "idcolor",
      imagen_url: "/uploads/pase.png",
      mapa: [{ color: "#10e040", unidad_id: unit.id }],
      alphas: [],
    }, new Date());
    const showroom = buildShowroom(data, "pol");
    const published = showroom?.scenes.find((item) => item.nombre === "360°")?.mascara;
    expect(maskReady(published)).toBe(true);
    expect(published?.mapa[0]?.unidad_id).toBe(unit.id);
    expect(showroom?.scenes.find((item) => item.nombre === "360°")?.hotspots.length).toBeGreaterThan(0);
    const seller = actorFor(data, data.profiles.find((profile) => profile.email.startsWith("laura"))!.id)!;
    expect(() => saveFacadeMask(data, seller, data.projects[0].id, scene.id, null, new Date())).toThrow(ServiceError);
  });
});
