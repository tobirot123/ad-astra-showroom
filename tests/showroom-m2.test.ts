import { existsSync, readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { buildSeed } from "@/lib/demo/seed";
import { videosToLoad } from "@/lib/domain/showroom-flow";
import { actorFor, directStatus, saveOverlays } from "@/lib/services/engine";
import { buildPublic, buildShowroom } from "@/lib/services/present";
import { ServiceError } from "@/lib/domain/types";

function db() {
  return structuredClone(buildSeed(new Date("2026-10-02T15:00:00.000Z")));
}

describe("showroom M2", () => {
  it("arma portada, torres, plantas y loteo sin listar estados editables", () => {
    const data = db();
    const showroom = buildShowroom(data, "pol");
    expect(showroom?.scenes.map((scene) => scene.tipo)).toEqual(["portada", "exterior", "exterior", "exterior"]);
    expect(showroom?.scenes.find((scene) => scene.nombre === "360°")?.transicion_url).toContain("spin-clip-1");
    expect(showroom?.scenes.find((scene) => scene.nombre === "360°")?.reversa_url).toContain("360-to-255");
    const stops = ["360°", "90°", "255°"];
    const counts = stops.map((nombre) => showroom?.scenes.find((scene) => scene.nombre === nombre)?.hotspots.length ?? 0);
    expect(counts.every((count) => count > 0)).toBe(true);
    expect(new Set(counts).size).toBeGreaterThan(1);
    expect(showroom?.units.find((unit) => unit.codigo === "501")?.vista_url).toBeTruthy();
    expect(showroom?.units.find((unit) => unit.codigo === "602")?.planta).toBe("6");
    expect(showroom?.buildings.map((building) => building.nombre)).toEqual(["POL"]);
    expect(showroom?.units.find((unit) => unit.codigo === "602")?.plano).toBeNull();
    expect(showroom?.units.find((unit) => unit.codigo === "18**")?.estado).toBe("pausa");
    expect(showroom?.units.find((unit) => unit.codigo === "501")?.plano).toContain("UF-501");
    expect(showroom?.pois.length).toBeGreaterThan(0);
    expect(showroom?.project.brochure).toBeNull();
    for (const scene of showroom?.scenes ?? []) {
      for (const url of [scene.video_url, scene.transicion_url, scene.vuelo_url]) {
        if (!url) continue;
        expect(existsSync(`public${url}`), url).toBe(true);
        const poster = url.replace(/\/([^/]+)\.mp4$/, "/posters/$1_first.webp");
        expect(existsSync(`public${poster}`), poster).toBe(true);
      }
    }
    const source = readFileSync("src/components/showroom/showroom-app.tsx", "utf8");
    expect(source).not.toContain("direct_status");
    expect(source).not.toContain("Aprobar");
    expect(source).not.toMatch(/grid-cols-2 gap-3[\s\S]{0,80}units\.map/);
  });

  it("precarga solo el video de la escena actual y la siguiente, y lite no pide videos", () => {
    const scenes = [{ video_url: "/a.mp4" }, { video_url: null }, { video_url: "/c.mp4" }];
    expect(videosToLoad(scenes, 0, false)).toEqual({ current: "/a.mp4", next: null });
    expect(videosToLoad(scenes, 1, false)).toEqual({ current: null, next: "/c.mp4" });
    expect(videosToLoad(scenes, 0, true)).toEqual({ current: null, next: null });
  });

  it("guardar la planta no borra la fachada", () => {
    const data = db();
    const admin = actorFor(data, data.profiles.find((profile) => profile.email.startsWith("martin"))!.id)!;
    const projectId = data.projects[0].id;
    const before = data.overlays.filter((overlay) => overlay.contenedor === "facade").length;
    const floor = data.floors[0];
    saveOverlays(data, admin, projectId, [], new Date(), { contenedor: "floor", contenedorId: floor.id });
    expect(data.overlays.filter((overlay) => overlay.contenedor === "facade")).toHaveLength(before);
    expect(data.overlays.filter((overlay) => overlay.contenedor === "floor" && overlay.contenedor_id === floor.id)).toHaveLength(0);
  });

  it("el vendedor no pone una unidad en pausa", () => {
    const data = db();
    const seller = actorFor(data, data.profiles.find((profile) => profile.email.startsWith("laura"))!.id)!;
    const unit = data.units.find((item) => item.codigo === "101")!;
    expect(() => directStatus(data, seller, unit.id, "pausa", true, new Date())).toThrow(ServiceError);
  });

  it("un proyecto próximamente no abre el recorrido", () => {
    const data = db();
    data.projects[0].estado = "coming_soon";
    expect(buildShowroom(data, "pol")).toBeNull();
    expect(buildPublic(data, "pol")?.kind).toBe("coming_soon");
  });
});
