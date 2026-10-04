/** Orden de la galería: el living o el comedor va primero. Los baños y los
 * patios quedan al final para que el hero de la ficha no abra en un baño. */

const LIVING: [string, number][] = [
  ["int-12_", 0],
  ["int-10_", 1],
  ["int-15_", 2],
  ["int-18_", 3],
  ["int-07_", 4],
  ["int-16_", 5],
  ["int-05_", 6],
  ["int-09_", 8],
];
const BATH = ["int-04_", "int-01_", "int-02_", "int-13_", "int-14_", "int-17_", "int-19_", "int-21_", "int-22_", "int-08_", "int-06_"];

export function galleryHeroRank(url: string) {
  const name = url.split("/").pop() ?? url;
  if (/ext-patio/i.test(name)) return 90;
  if (BATH.some((token) => name.includes(token))) return 70;
  const living = LIVING.find(([token]) => name.includes(token));
  if (living) return living[1];
  return 30;
}
