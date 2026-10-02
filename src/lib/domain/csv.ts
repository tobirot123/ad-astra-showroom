import type { CustomField, Unit, UnitStatus } from "@/lib/domain/types";
import { formatM2, formatNumber } from "@/lib/domain/format";

const STATUS_ALIASES: Record<string, UnitStatus> = {
  disponible: "disponible",
  disponibles: "disponible",
  available: "disponible",
  reservada: "reservada",
  reservado: "reservada",
  reserved: "reservada",
  vendida: "vendida",
  vendido: "vendida",
  sold: "vendida",
  bloqueada: "bloqueada",
  bloqueado: "bloqueada",
  blocked: "bloqueada",
  oculta: "oculta",
  oculto: "oculta",
  hidden: "oculta",
};

const COLUMN_ALIASES: Record<string, string[]> = {
  codigo: ["codigo", "código", "unidad", "unit", "code", "uf"],
  torre: ["torre", "edificio", "etapa", "building"],
  piso: ["piso", "floor", "nivel"],
  tipologia: ["tipologia", "tipología", "tipo", "typology"],
  m2_cubiertos: ["m2 cubiertos", "m² cubiertos", "m2_cubiertos", "cubiertos", "m2 cub"],
  m2_semicubiertos: ["m2 semicubiertos", "m² semicubiertos", "semicubiertos", "m2_semicubiertos"],
  m2_descubiertos: ["m2 descubiertos", "descubiertos", "m2_descubiertos"],
  m2_totales: ["m2 totales", "m² totales", "m2_totales", "totales", "m2 tot", "sup total"],
  orientacion: ["orientacion", "orientación", "orientation"],
  precio_usd: ["precio usd", "precio", "price", "precio_usd", "contado"],
  estado: ["estado", "status"],
  ambientes: ["ambientes", "amb", "rooms"],
  dormitorios: ["dormitorios", "dorm", "dormitorio"],
  banos: ["banos", "baños", "baths"],
  mostrar_precio: ["mostrar precio", "mostrar_precio"],
};

export function parseArNumber(raw: string): number | null {
  let s = raw
    .trim()
    .replace(/[\s\u00A0\u202F]/g, "")
    .replace(/usd/gi, "")
    .replace(/\$/g, "");
  if (!s || s === "-" || /^consultar$/i.test(s)) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (hasComma) s = s.replace(",", ".");
  else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseStatus(raw: string): UnitStatus | null {
  const key = raw.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return STATUS_ALIASES[key] ?? null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === "," || ch === ";") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      cell = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

function normHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

export function mapHeaders(headers: string[], fields: CustomField[]): Record<number, string> {
  const map: Record<number, string> = {};
  const aliasToKey = new Map<string, string>();
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) aliasToKey.set(normHeader(alias), key);
  }
  for (const field of fields) {
    if (field.archivado) continue;
    aliasToKey.set(normHeader(field.clave), `custom:${field.clave}`);
    aliasToKey.set(normHeader(field.nombre), `custom:${field.clave}`);
  }
  headers.forEach((header, index) => {
    const key = aliasToKey.get(normHeader(header));
    if (key) map[index] = key;
  });
  return map;
}

export interface ImportRow {
  line: number;
  codigo: string;
  torre: string | null;
  values: Record<string, unknown>;
  errors: string[];
}

export interface ImportDiff {
  line: number;
  codigo: string;
  kind: "new" | "modified" | "unchanged" | "error";
  changes: { field: string; before: unknown; after: unknown }[];
  errors: string[];
}

export interface ImportPreview {
  rows: ImportDiff[];
  unchanged: number;
  modified: number;
  created: number;
  errors: number;
}

function boolish(raw: string): boolean | null {
  const s = normHeader(raw);
  if (["si", "sí", "true", "1", "yes"].includes(s)) return true;
  if (["no", "false", "0"].includes(s)) return false;
  return null;
}

export function readImportRows(csv: string, fields: CustomField[]): { rows: ImportRow[]; headerError?: string } {
  const table = parseCsv(csv);
  if (table.length < 2) return { rows: [], headerError: "El archivo no tiene filas de datos." };
  const headers = table[0];
  const mapped = mapHeaders(headers, fields);
  if (!Object.values(mapped).includes("codigo")) {
    return { rows: [], headerError: "No encontramos la columna de código de unidad." };
  }
  const rows: ImportRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    const values: Record<string, unknown> = {};
    const errors: string[] = [];
    let codigo = "";
    let torre: string | null = null;
    for (const [index, key] of Object.entries(mapped)) {
      const raw = cells[Number(index)] ?? "";
      if (raw === "") continue;
      if (key === "codigo") codigo = raw.trim();
      else if (key === "torre") torre = raw.trim();
      else if (key === "piso") values.piso = raw.trim();
      else if (key === "tipologia") values.tipologia = raw.trim();
      else if (key === "estado") {
        const estado = parseStatus(raw);
        if (!estado) errors.push(`estado «${raw}» no es válido`);
        else values.estado = estado;
      } else if (key === "orientacion") values.orientacion = raw.trim();
      else if (key === "mostrar_precio") {
        const b = boolish(raw);
        if (b == null) errors.push("mostrar precio tiene que ser sí o no");
        else values.mostrar_precio = b;
      } else if (key.startsWith("m2_") || key === "precio_usd" || key === "ambientes" || key === "dormitorios" || key === "banos") {
        const n = parseArNumber(raw);
        if (n == null) errors.push(`no pudimos leer el número de ${key} («${raw}»)`);
        else values[key] = n;
      } else if (key.startsWith("custom:")) {
        const clave = key.slice("custom:".length);
        const field = fields.find((f) => f.clave === clave);
        values[`custom:${clave}`] = coerceCustom(field, raw, errors);
      }
    }
    if (!codigo) errors.push("falta el código de unidad");
    if (values.m2_cubiertos != null && Number(values.m2_cubiertos) <= 0) {
      errors.push("los m² cubiertos tienen que ser mayores a 0");
    }
    if (
      values.m2_cubiertos != null &&
      values.m2_totales != null &&
      Number(values.m2_totales) < Number(values.m2_cubiertos)
    ) {
      errors.push("los m² totales no pueden ser menores que los cubiertos");
    }
    if (values.precio_usd != null && Number(values.precio_usd) <= 0) {
      errors.push("el precio tiene que ser mayor a 0 (o dejalo vacío para «consultar»)");
    }
    rows.push({ line: r + 1, codigo, torre, values, errors });
  }
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = `${(row.torre ?? "").toLowerCase()}|${row.codigo.toLowerCase()}`;
    if (seen.has(key)) row.errors.push(`código repetido en el archivo (también en la fila ${seen.get(key)})`);
    else seen.set(key, row.line);
  }
  return { rows };
}

function coerceCustom(field: CustomField | undefined, raw: string, errors: string[]): unknown {
  if (!field) return raw;
  if (field.tipo === "number") {
    const n = parseArNumber(raw);
    if (n == null) errors.push(`«${field.nombre}» no es un número`);
    return n;
  }
  if (field.tipo === "boolean") {
    const b = boolish(raw);
    if (b == null) errors.push(`«${field.nombre}» tiene que ser sí o no`);
    return b;
  }
  if (field.tipo === "select") {
    const match = field.opciones.find((o) => normHeader(o) === normHeader(raw));
    if (!match) errors.push(`«${raw}» no está entre las opciones de ${field.nombre}`);
    return match ?? raw;
  }
  return raw;
}

export function previewImport(
  rows: ImportRow[],
  units: Unit[],
  priceByUnit: Map<string, number>,
  typologyName: Map<string, string>,
  floorLabel: Map<string, string>,
): ImportPreview {
  const diffs: ImportDiff[] = [];
  for (const row of rows) {
    if (row.errors.length) {
      diffs.push({ line: row.line, codigo: row.codigo || "—", kind: "error", changes: [], errors: row.errors });
      continue;
    }
    const unit = units.find((u) => u.codigo.toLowerCase() === row.codigo.toLowerCase());
    if (!unit) {
      diffs.push({
        line: row.line,
        codigo: row.codigo,
        kind: "new",
        changes: Object.entries(row.values).map(([field, after]) => ({ field, before: null, after })),
        errors: [],
      });
      continue;
    }
    const changes: ImportDiff["changes"] = [];
    for (const [field, after] of Object.entries(row.values)) {
      const before = currentValue(unit, field, priceByUnit, typologyName, floorLabel);
      if (!sameValue(before, after)) changes.push({ field, before, after });
    }
    diffs.push({
      line: row.line,
      codigo: row.codigo,
      kind: changes.length ? "modified" : "unchanged",
      changes,
      errors: [],
    });
  }
  return {
    rows: diffs,
    unchanged: diffs.filter((d) => d.kind === "unchanged").length,
    modified: diffs.filter((d) => d.kind === "modified").length,
    created: diffs.filter((d) => d.kind === "new").length,
    errors: diffs.filter((d) => d.kind === "error").length,
  };
}

function currentValue(
  unit: Unit,
  field: string,
  priceByUnit: Map<string, number>,
  typologyName: Map<string, string>,
  floorLabel: Map<string, string>,
): unknown {
  if (field === "precio_usd") return priceByUnit.get(unit.id) ?? null;
  if (field === "tipologia") return unit.typology_id ? typologyName.get(unit.typology_id) ?? null : null;
  if (field === "piso") return unit.floor_id ? floorLabel.get(unit.floor_id) ?? null : null;
  if (field.startsWith("custom:")) return unit.custom_values[field.slice("custom:".length)] ?? null;
  return (unit as unknown as Record<string, unknown>)[field] ?? null;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 0.001;
  if (typeof a === "string" && typeof b === "string") return a.trim().toLowerCase() === b.trim().toLowerCase();
  return a === b || (a == null && b == null);
}

export function exportUnitsCsv(input: {
  units: Unit[];
  priceByUnit: Map<string, number>;
  typologyName: Map<string, string>;
  floorLabel: Map<string, string>;
  buildingName: Map<string, string>;
  floorBuilding: Map<string, string>;
  fields: CustomField[];
  includePrices: boolean;
}): string {
  const fields = input.fields.filter((f) => !f.archivado && f.aplica_a === "unit");
  const headers = [
    "codigo",
    "torre",
    "piso",
    "tipologia",
    "ambientes",
    "dormitorios",
    "banos",
    "m2_cubiertos",
    "m2_semicubiertos",
    "m2_descubiertos",
    "m2_totales",
    "orientacion",
    ...(input.includePrices ? ["precio_usd"] : []),
    "estado",
    "mostrar_precio",
    ...fields.map((f) => f.clave),
  ];
  const lines = [headers.join(",")];
  const sorted = [...input.units].sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));
  for (const unit of sorted) {
    const buildingId = unit.floor_id ? input.floorBuilding.get(unit.floor_id) : unit.building_id;
    const cells: Array<string | number | boolean | null> = [
      unit.codigo,
      buildingId ? input.buildingName.get(buildingId) ?? "" : "",
      unit.floor_id ? input.floorLabel.get(unit.floor_id) ?? "" : "",
      unit.typology_id ? input.typologyName.get(unit.typology_id) ?? "" : "",
      unit.ambientes,
      unit.dormitorios,
      unit.banos,
      unit.m2_cubiertos == null ? "" : formatM2(unit.m2_cubiertos),
      unit.m2_semicubiertos == null ? "" : formatM2(unit.m2_semicubiertos),
      unit.m2_descubiertos == null ? "" : formatM2(unit.m2_descubiertos),
      unit.m2_totales == null ? "" : formatM2(unit.m2_totales),
      unit.orientacion ?? "",
    ];
    if (input.includePrices) {
      const price = input.priceByUnit.get(unit.id);
      cells.push(price == null ? "" : formatNumber(price));
    }
    cells.push(unit.estado, unit.mostrar_precio ? "sí" : "no");
    for (const field of fields) {
      const value = unit.custom_values[field.clave];
      if (value == null) cells.push("");
      else if (typeof value === "boolean") cells.push(value ? "sí" : "no");
      else if (typeof value === "number") cells.push(field.tipo === "number" ? formatNumber(value) : String(value));
      else cells.push(String(value));
    }
    lines.push(cells.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

function csvEscape(value: string | number | boolean | null): string {
  const s = value == null ? "" : String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const TEMPLATE_HINT =
  "codigo,torre,piso,tipologia,m2_cubiertos,m2_totales,orientacion,precio_usd,estado\n1A,Torre A,1,2 ambientes,48,20,55,10,Norte,142000,disponible\n";
