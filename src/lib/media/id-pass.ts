import sharp from "sharp";
import { quantizeHex } from "@/lib/domain/facade-mask";

/** Colores planos de un pase, del más presente al menos. Ignora fondo negro, blanco y transparencia. */
export async function readIdPassColors(buffer: Buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts = new Map<string, number>();
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    if (alpha < 20) continue;
    if (red < 14 && green < 14 && blue < 14) continue;
    if (red > 244 && green > 244 && blue > 244) continue;
    const color = quantizeHex(red, green, blue);
    counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  const minimum = Math.max(48, Math.round(info.width * info.height * 0.00035));
  return [...counts.entries()]
    .filter(([, count]) => count >= minimum)
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);
}
