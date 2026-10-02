const ar = "es-AR";
const tz = "America/Argentina/Buenos_Aires";

export function formatUsd(value: number): string {
  return new Intl.NumberFormat(ar, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatM2(value: number): string {
  return new Intl.NumberFormat(ar, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(ar, { maximumFractionDigits: 2 }).format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(ar, {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(ar, {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const STATUS_LABEL: Record<string, string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  bloqueada: "Bloqueada",
  oculta: "Oculta",
  consultar: "Consultar disponibilidad",
};

export const REQUEST_LABEL: Record<string, string> = {
  reserve: "Reservar",
  sell: "Vender",
  release: "Liberar",
};

export const REQUEST_STATE_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  expired: "Vencida",
  cancelled: "Cancelada",
  resolved_by_direct_change: "Resuelta por cambio directo",
};

export const LEAD_STATE_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita: "Visita",
  reserva: "Reserva",
  venta: "Venta",
  perdido: "Perdido",
};

export const ROLE_LABEL: Record<string, string> = {
  superadmin: "Superadmin Ad Astra",
  org_admin: "Admin desarrolladora",
  seller: "Vendedor",
  viewer: "Solo lectura",
};

export const STATUS_COLOR: Record<string, string> = {
  disponible: "#1f8a5b",
  reservada: "#c49214",
  vendida: "#b42318",
  bloqueada: "#667085",
  oculta: "#98a2b3",
  consultar: "#b45309",
};
