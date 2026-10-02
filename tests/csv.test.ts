import { describe, expect, it } from "vitest";
import { actorFor, exportCsv, importUnits } from "@/lib/services/engine";
import { parseArNumber, parseCsv, parseStatus, previewImport, readImportRows } from "@/lib/domain/csv";
import { adjustPrice } from "@/lib/domain/pricing";
import { buildSeed } from "@/lib/demo/seed";
import type { Database } from "@/lib/domain/types";

function clone(): Database {
  return structuredClone(buildSeed(new Date("2026-10-02T12:00:00.000Z")));
}

describe("números y estados argentinos", () => {
  it("lee 48,20 y 142.000 y también 48.20", () => {
    expect(parseArNumber("48,20")).toBeCloseTo(48.2);
    expect(parseArNumber("142.000")).toBe(142000);
    expect(parseArNumber("142.000,50")).toBeCloseTo(142000.5);
    expect(parseArNumber("48.20")).toBeCloseTo(48.2);
    expect(parseArNumber("USD 141.500")).toBe(141500);
    expect(parseStatus("Reservada")).toBe("reservada");
    expect(parseStatus("sold")).toBe("vendida");
    expect(parseStatus("disponible ")).toBe("disponible");
  });

  it("separa columnas con coma y respeta comillas", () => {
    const rows = parseCsv('codigo,m2_cubiertos\n1A,"48,20"\n');
    expect(rows).toEqual([
      ["codigo", "m2_cubiertos"],
      ["1A", "48,20"],
    ]);
  });
});

describe("importación", () => {
  it("marcar error si los m² totales son menores que los cubiertos", () => {
    const db = clone();
    const fields = db.custom_field_definitions;
    const parsed = readImportRows("codigo,m2_cubiertos,m2_totales\n1A,\"40,00\",\"30,00\"\n", fields);
    expect(parsed.rows[0].errors.join(" ")).toMatch(/totales no pueden ser menores/i);
    const preview = previewImport(parsed.rows, db.units, new Map(), new Map(), new Map());
    expect(preview.errors).toBe(1);
  });

  it("exportar e importar sin editar da 0 cambios", () => {
    const db = clone();
    const actor = actorFor(db, db.profiles.find((p) => p.email.startsWith("martin"))!.id)!;
    const csv = exportCsv(db, actor, db.projects[0].id);
    const result = importUnits(db, actor, db.projects[0].id, csv, false, false, new Date());
    const preview = result.extra?.preview as { unchanged: number; modified: number; created: number; errors: number };
    expect(preview.errors).toBe(0);
    expect(preview.created).toBe(0);
    expect(preview.modified).toBe(0);
    expect(preview.unchanged).toBe(db.units.filter((u) => u.project_id === db.projects[0].id).length);
  });

  it("una fila editada en formato argentino modifica solo esa unidad", () => {
    const db = clone();
    const actor = actorFor(db, db.profiles.find((p) => p.email.startsWith("martin"))!.id)!;
    const projectId = db.projects[0].id;
    const csv = ["codigo,m2_cubiertos,m2_totales,precio_usd,estado", '3A,"49,80","57,00","150.000",disponible'].join("\n");
    const dry = importUnits(db, actor, projectId, csv, false, false, new Date());
    const preview = dry.extra?.preview as { modified: number; errors: number; rows: { codigo: string; kind: string; changes: { field: string; after: unknown }[] }[] };
    expect(preview.errors).toBe(0);
    expect(preview.modified).toBe(1);
    const before = db.units.find((u) => u.codigo === "3A")!.m2_cubiertos;
    importUnits(db, actor, projectId, csv, true, false, new Date());
    const unit = db.units.find((u) => u.codigo === "3A")!;
    expect(unit.m2_cubiertos).toBeCloseTo(49.8);
    expect(unit.overrides).toContain("m2_cubiertos");
    expect(before).toBeNull();
    const price = db.unit_prices.find((p) => p.unit_id === unit.id && p.price_list_id === db.price_lists.find((l) => !l.regla)!.id);
    expect(price?.precio).toBe(150000);
  });

  it("el vendedor no importa", () => {
    const db = clone();
    const seller = actorFor(db, db.profiles.find((p) => p.email.startsWith("laura"))!.id)!;
    expect(() => importUnits(db, seller, db.projects[0].id, "codigo\n1A\n", false, false, new Date())).toThrow(/permiso/i);
  });
});

describe("ajuste masivo de precio", () => {
  it("suma 5 % y redondea a 500", () => {
    expect(adjustPrice(141_000, "percent", 5, 500)).toBe(148_000);
    expect(adjustPrice(100_000, "amount", 2500, 1000)).toBe(103_000);
  });
});
