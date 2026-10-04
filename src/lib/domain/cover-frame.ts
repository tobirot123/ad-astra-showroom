/**
 * Encuadre de la foto del recorrido.
 * En el celular la foto siempre cubre el alto de la pantalla. Si hace falta
 * para que entre el ancho de la torre, se agranda más y se puede correr de costado.
 * En el escritorio la foto llena el viewport.
 */
/** Centro horizontal del recorte en el celular, para que la torre entre entera. */
export function portraitCenter(nombre: string | undefined) {
  if (nombre?.startsWith("90")) return 0.515;
  if (nombre?.startsWith("255")) return 0.46;
  if (nombre?.startsWith("360")) return 0.506;
  return 0.5;
}

export function coverFrame(boxW: number, boxH: number, imgW: number, imgH: number, focusX: number, focusY: number, shiftX: number) {
  const portrait = boxH > boxW * 1.15;
  const centerX = focusX;
  const centerY = portrait ? 0.52 : focusY;
  const fitTower = boxW / (0.38 * imgW);
  const scale = portrait ? Math.max(boxH / imgH, fitTower) : Math.max(boxW / imgW, boxH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  let left = boxW / 2 - centerX * width + shiftX;
  let top = boxH / 2 - centerY * height;
  left = Math.min(0, Math.max(boxW - width, left));
  top = Math.min(0, Math.max(boxH - height, top));
  return { left, top, width, height };
}
