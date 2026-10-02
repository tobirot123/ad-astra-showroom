import type { UtmBag } from "@/lib/domain/types";

/** Atribución a la primera fuente de la sesión. */
export function classifySource(utm: UtmBag, referrer?: string | null): string {
  const src = (utm.utm_source ?? "").toLowerCase();
  const medium = (utm.utm_medium ?? "").toLowerCase();
  if (utm.fbclid || src.includes("facebook") || src.includes("meta") || src === "ig" || src.includes("instagram")) {
    return "Meta Ads";
  }
  if (utm.gclid || src === "google" || src.includes("adwords")) {
    if (medium === "organic") return "Orgánico";
    return "Google Ads";
  }
  if (src.includes("whatsapp") || medium === "whatsapp") return "WhatsApp";
  if (medium === "email" || src === "email" || src === "newsletter") return "Email";
  if (medium === "organic" || src === "organic") return "Orgánico";
  if (src === "ig_organic" || src.includes("social")) return "Redes";
  if (src) return src;
  const ref = (referrer ?? utm.referrer ?? "").toLowerCase();
  if (!ref) return "Directo";
  if (ref.includes("google.")) return "Orgánico";
  if (ref.includes("facebook.") || ref.includes("instagram.")) return "Redes";
  if (ref.includes("whatsapp")) return "WhatsApp";
  return "Otros";
}

export function deviceFromUa(ua: string | null | undefined, width?: number | null): "mobile" | "desktop" | "tablet" {
  const s = (ua ?? "").toLowerCase();
  if (s.includes("ipad") || s.includes("tablet")) return "tablet";
  if (s.includes("mobile") || s.includes("iphone") || s.includes("android")) return "mobile";
  if (width && width < 768) return "mobile";
  if (width && width < 1024) return "tablet";
  return "desktop";
}

export function isBot(ua: string | null | undefined): boolean {
  return /bot|spider|crawler|preview|lighthouse|headless/i.test(ua ?? "");
}
