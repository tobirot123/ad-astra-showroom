/** Máscaras de estudio: pase de color (un color por unidad) o PNG con alpha. Los polígonos quedan de respaldo. */

export interface MaskMapEntry {
  color: string;
  unidad_id: string;
}

export interface FacadeMask {
  viewpoint_id: string;
  modo: "idcolor" | "alpha";
  imagen_url: string | null;
  mapa: MaskMapEntry[];
  alphas: { unidad_id: string; imagen_url: string }[];
}

export function maskReady(mask: FacadeMask | null | undefined): mask is FacadeMask {
  if (!mask) return false;
  if (mask.modo === "idcolor") return Boolean(mask.imagen_url && mask.mapa.some((entry) => entry.unidad_id && entry.color));
  return mask.alphas.some((entry) => entry.unidad_id && entry.imagen_url);
}

function hslToHex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/** Color estable por código. El estudio pinta el pase con esta paleta y el mapeo es directo. */
export function referenceColor(codigo: string) {
  let hash = 2166136261;
  for (const char of codigo) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hslToHex((hash >>> 0) % 360, 0.72, 0.48);
}

export function quantizeChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value / 16) * 16));
}

export function quantizeHex(r: number, g: number, b: number) {
  const channel = (value: number) => quantizeChannel(value).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function rgb(hex: string) {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

export function colorDistance(a: string, b: string) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

const MATCH_DISTANCE = 42;

/** Asigna cada color del pase a la unidad cuya paleta de referencia queda más cerca. */
export function mapIdColors(colors: string[], units: { id: string; codigo: string }[]) {
  const used = new Set<string>();
  return colors.map((color) => {
    let best: { id: string; distancia: number } | null = null;
    for (const unit of units) {
      if (used.has(unit.id)) continue;
      const distancia = colorDistance(color, referenceColor(unit.codigo));
      if (!best || distancia < best.distancia) best = { id: unit.id, distancia };
    }
    if (best && best.distancia <= MATCH_DISTANCE) {
      used.add(best.id);
      return { color, unidad_id: best.id, distancia: Math.round(best.distancia) };
    }
    return { color, unidad_id: "", distancia: best ? Math.round(best.distancia) : 999 };
  });
}
