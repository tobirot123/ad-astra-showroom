import { scryptSync, timingSafeEqual } from "crypto";

const SALT = "adastra-demo-v1";

export function hashDemoPassword(password: string): string {
  return scryptSync(password, SALT, 32).toString("hex");
}

export function verifyDemoPassword(password: string, hash: string): boolean {
  const next = Buffer.from(hashDemoPassword(password), "hex");
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}
