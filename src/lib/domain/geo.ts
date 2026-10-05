export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radius = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * radius * Math.asin(Math.min(1, Math.sqrt(h))));
}

export function travelMinutes(meters: number, kmh: number) {
  return Math.max(1, Math.round((meters / 1000 / kmh) * 60));
}
