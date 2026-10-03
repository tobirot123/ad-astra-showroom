import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export async function buildPdf(input: { title: string; lines: string[]; url: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  page.drawRectangle({ x: 0, y: 780, width: 595, height: 62, color: rgb(0.11, 0.1, 0.08) });
  page.drawText("Ad Astra", { x: 48, y: 804, size: 12, font, color: rgb(0.77, 0.65, 0.45) });
  page.drawText(input.title.slice(0, 42), { x: 48, y: 784, size: 18, font: bold, color: rgb(1, 1, 1) });
  let y = 740;
  for (const line of input.lines) {
    const text = line.normalize("NFD").replace(/\p{Diacritic}/gu, "").slice(0, 90);
    page.drawText(text, { x: 48, y, size: 12, font, color: rgb(0.11, 0.1, 0.08) });
    y -= 20;
    if (y < 180) break;
  }
  const png = await QRCode.toBuffer(input.url, { type: "png", width: 240, margin: 0 });
  const image = await doc.embedPng(png);
  page.drawImage(image, { x: 400, y: 48, width: 140, height: 140 });
  page.drawText("Escanea para abrir la unidad", { x: 48, y: 70, size: 10, font, color: rgb(0.4, 0.38, 0.34) });
  return doc.save();
}
