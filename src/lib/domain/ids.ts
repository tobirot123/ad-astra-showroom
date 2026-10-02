export function uid(): string {
  return crypto.randomUUID();
}

/** Ids estables del seed demo. n cabe en 12 hex. */
export function seedId(n: number): string {
  return `10000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}
