import sharp from "sharp";

export interface OptimizedImage {
  ancho: number;
  alto: number;
  variantes: { nombre: string; ancho: number; buffer: Buffer }[];
  aviso: string | null;
}

const TARGETS = [480, 960, 1600];

/** Genera WebP en varios anchos. El original pesado no se publica. */
export async function optimizeImage(input: Buffer): Promise<OptimizedImage> {
  const meta = await sharp(input, { failOn: "none" }).rotate().metadata();
  const ancho = meta.width ?? 0;
  const alto = meta.height ?? 0;
  const widths = TARGETS.filter((w) => !ancho || w < ancho);
  if (!widths.includes(Math.min(ancho || 1600, 1600))) {
    widths.push(Math.min(ancho || 960, 1600));
  }
  const unique = [...new Set(widths)].sort((a, b) => a - b);
  const variantes: OptimizedImage["variantes"] = [];
  for (const width of unique) {
    const buffer = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    variantes.push({ nombre: `w${width}`, ancho: width, buffer });
  }
  let aviso: string | null = null;
  if (input.byteLength > 1_500_000) {
    aviso = "La imagen original pesaba más de 1,5 MB. La publicamos comprimida en WebP.";
  }
  if (ancho && alto && ancho > alto * 1.15) {
    aviso = aviso
      ? `${aviso} Además es horizontal: en el celular se ve mejor una versión vertical.`
      : "Esta imagen es horizontal. En el celular se ve mejor una versión vertical.";
  }
  return { ancho, alto, variantes, aviso };
}
