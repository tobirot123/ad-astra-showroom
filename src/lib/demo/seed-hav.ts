import geometryJson from "./hav-geometry.json"
import lotsJson from "./hav-lots.json"

export type LotStatus = "disponible" | "vendido" | "reservado"
export type PriceKind = "estandar" | "consultar" | "precio_especial"

export type HavLot = {
  lote: number
  m2: number
  estado: LotStatus
  precio_contado_usd: number | null
  anticipo_usd: number | null
  cuotas: number | null
  cuota_usd: number | null
  tipo_precio: PriceKind
  etiqueta: string | null
  laguna: boolean
  card_html_publicado: string | null
}

export const havLots = lotsJson as unknown as HavLot[]

export const havLotsByNumber: Record<number, HavLot> = Object.fromEntries(
  havLots.map((lot) => [lot.lote, lot]),
)

export type LotPoint = [number, number]

export const havGeometry = geometryJson as unknown as {
  width: number
  height: number
  image: string
  lots: Record<string, LotPoint[]>
}

export const havContact = {
  project: "Haras Andrea Virginia",
  place: "Plomer, General Las Heras",
  whatsapp: "5491134298884",
  phone: "+54 11 3429-8884",
  email: "gruposigales@hotmail.com",
}

/**
 * Pintar el mapa según disponibilidad.
 * Hoy está en false: TOP 2 se ve limpio, solo con el número de lote.
 * Para el próximo pase, pasalo a true. Cada lote ya trae `estado`
 * (disponible / vendido / reservado). La ficha muestra estado, precio
 * y financiación aunque esto siga en false.
 */
export const showAvailabilityColors = false

export function showsPrice(lot: HavLot) {
  return lot.tipo_precio !== "consultar" && lot.precio_contado_usd != null
}

export function formatUsd(value: number) {
  return `U$D ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}`
}

export function formatM2(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)
}

export function statusLabel(status: LotStatus) {
  if (status === "vendido") return "Vendido"
  if (status === "reservado") return "Reservado"
  return "Disponible"
}

export function whatsappLink(lote: number) {
  const text = `Hola, quiero consultar por el Lote ${lote} de Haras Andrea Virginia.`
  return `https://wa.me/${havContact.whatsapp}?text=${encodeURIComponent(text)}`
}
