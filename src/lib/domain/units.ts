import type { Typology, Unit } from "@/lib/domain/types";

const INHERITED = [
  "ambientes",
  "dormitorios",
  "banos",
  "m2_cubiertos",
  "m2_semicubiertos",
  "m2_descubiertos",
  "m2_totales",
] as const;

export type InheritedField = (typeof INHERITED)[number];

export function isInherited(unit: Unit, field: string): boolean {
  return (INHERITED as readonly string[]).includes(field) && !unit.overrides.includes(field);
}

export function effectiveNumber(unit: Unit, typology: Typology | undefined, field: InheritedField): number | null {
  if (!typology || unit.overrides.includes(field)) return unit[field];
  return typology[field];
}

export function withEffectiveAreas(unit: Unit, typology: Typology | undefined): Unit {
  if (!typology) return unit;
  const next = { ...unit };
  for (const field of INHERITED) {
    if (!unit.overrides.includes(field)) next[field] = typology[field];
  }
  return next;
}

export function markOverride(unit: Unit, field: string): Unit {
  if (unit.overrides.includes(field)) return unit;
  return { ...unit, overrides: [...unit.overrides, field] };
}

export function clearOverride(unit: Unit, typology: Typology | undefined, field: InheritedField): Unit {
  const overrides = unit.overrides.filter((f) => f !== field);
  const next: Unit = { ...unit, overrides };
  if (typology) next[field] = typology[field];
  return next;
}

export function validateAreas(m2Cubiertos: number | null, m2Totales: number | null): string | null {
  if (m2Cubiertos != null && m2Cubiertos <= 0) return "Los m² cubiertos tienen que ser mayores a 0.";
  if (m2Totales != null && m2Cubiertos != null && m2Totales < m2Cubiertos) {
    return "Los m² totales no pueden ser menores que los cubiertos.";
  }
  return null;
}
