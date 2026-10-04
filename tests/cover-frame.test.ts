import { describe, expect, it } from "vitest";
import { coverFrame } from "@/lib/domain/cover-frame";

const phones = [
  [390, 844],
  [393, 852],
  [360, 780],
] as const;

describe("encuadre del recorrido", () => {
  it("en el celular la foto cubre el alto y no deja franjas negras", () => {
    for (const [boxW, boxH] of phones) {
      const frame = coverFrame(boxW, boxH, 1920, 1080, 0.49, 0.48, 0);
      expect(frame.height).toBeGreaterThanOrEqual(boxH - 0.5);
      expect(frame.width).toBeGreaterThanOrEqual(boxW - 0.5);
      expect(frame.top).toBeLessThanOrEqual(0.5);
      expect(frame.top + frame.height).toBeGreaterThanOrEqual(boxH - 0.5);
      expect(frame.left).toBeLessThanOrEqual(0.5);
      expect(frame.left + frame.width).toBeGreaterThanOrEqual(boxW - 0.5);
    }
  });

  it("el arrastre horizontal corre la foto sin descubrir el fondo", () => {
    const still = coverFrame(390, 844, 1920, 1080, 0.49, 0.48, 0);
    const panned = coverFrame(390, 844, 1920, 1080, 0.49, 0.48, 180);
    expect(panned.left).toBeGreaterThan(still.left);
    expect(panned.top + panned.height).toBeGreaterThanOrEqual(844 - 0.5);
    expect(panned.left).toBeLessThanOrEqual(0);
    expect(panned.left + panned.width).toBeGreaterThanOrEqual(390 - 0.5);
  });

  it("en el escritorio la foto llena el viewport", () => {
    const frame = coverFrame(1440, 900, 1920, 1080, 0.49, 0.48, 0);
    expect(frame.height).toBeGreaterThanOrEqual(900 - 0.5);
    expect(frame.width).toBeGreaterThanOrEqual(1440 - 0.5);
    expect(frame.top).toBeLessThanOrEqual(0.5);
    expect(frame.left).toBeLessThanOrEqual(0.5);
  });
});
