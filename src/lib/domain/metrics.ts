import type { AnalyticsEvent, Lead, Unit } from "@/lib/domain/types";

export interface MetricsQuery {
  events: AnalyticsEvent[];
  leads: Lead[];
  units: Pick<Unit, "id" | "codigo">[];
  from: Date;
  to: Date;
}

export interface DayPoint {
  fecha: string;
  visitas: number;
  leads: number;
}

export interface MetricsSnapshot {
  visitas: number;
  unicos: number;
  fichas: number;
  leads: number;
  whatsapp: number;
  conversion: number;
  porDia: DayPoint[];
  porFuente: { fuente: string; visitas: number; leads: number }[];
  porCampana: { campana: string; visitas: number; leads: number }[];
  porDispositivo: { device: string; visitas: number }[];
  topUnidades: { unitId: string; codigo: string; vistas: number; unicos: number; leads: number }[];
  embudo: { paso: string; valor: number }[];
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function computeMetrics(q: MetricsQuery): MetricsSnapshot {
  const events = q.events.filter((e) => inRange(e.ts, q.from, q.to));
  const leads = q.leads.filter((l) => inRange(l.created_at, q.from, q.to));

  const sessions = new Set(events.map((e) => e.session_id));
  const visitors = new Set(events.map((e) => e.visitor_id));
  const unitEvents = events.filter((e) => e.nombre === "unit_view");
  const fichaSessions = new Set(unitEvents.map((e) => e.session_id));
  const leadEvents = events.filter((e) => e.nombre === "lead_submitted" || e.nombre === "whatsapp_click");
  const leadSessions = new Set(leadEvents.map((e) => e.session_id));
  const whatsapp = events.filter((e) => e.nombre === "whatsapp_click").length;

  const byDay = new Map<string, DayPoint>();
  for (const e of events) {
    if (e.nombre !== "session_start" && e.nombre !== "page_view" && e.nombre !== "unit_view") continue;
    const key = dayKey(e.ts);
    const row = byDay.get(key) ?? { fecha: key, visitas: 0, leads: 0 };
    byDay.set(key, row);
  }
  const sessionsByDay = new Map<string, Set<string>>();
  for (const e of events) {
    const key = dayKey(e.ts);
    const set = sessionsByDay.get(key) ?? new Set<string>();
    set.add(e.session_id);
    sessionsByDay.set(key, set);
    const row = byDay.get(key) ?? { fecha: key, visitas: 0, leads: 0 };
    row.visitas = set.size;
    byDay.set(key, row);
  }
  for (const lead of leads) {
    const key = dayKey(lead.created_at);
    const row = byDay.get(key) ?? { fecha: key, visitas: 0, leads: 0 };
    row.leads += 1;
    byDay.set(key, row);
  }

  const fuenteVisits = new Map<string, Set<string>>();
  const fuenteSession = new Map<string, string>();
  for (const e of events) {
    if (!fuenteSession.has(e.session_id)) fuenteSession.set(e.session_id, e.fuente || "Directo");
  }
  for (const [session, fuente] of fuenteSession) {
    const set = fuenteVisits.get(fuente) ?? new Set<string>();
    set.add(session);
    fuenteVisits.set(fuente, set);
  }
  const fuenteLeads = new Map<string, number>();
  for (const lead of leads) {
    fuenteLeads.set(lead.fuente, (fuenteLeads.get(lead.fuente) ?? 0) + 1);
  }
  const porFuente = [...new Set([...fuenteVisits.keys(), ...fuenteLeads.keys()])]
    .map((fuente) => ({
      fuente,
      visitas: fuenteVisits.get(fuente)?.size ?? 0,
      leads: fuenteLeads.get(fuente) ?? 0,
    }))
    .sort((a, b) => b.visitas - a.visitas || b.leads - a.leads);

  const campVisits = new Map<string, Set<string>>();
  const campOfSession = new Map<string, string>();
  for (const e of events) {
    if (!campOfSession.has(e.session_id)) campOfSession.set(e.session_id, e.utm_campaign || "—");
  }
  for (const [session, camp] of campOfSession) {
    if (camp === "—") continue;
    const set = campVisits.get(camp) ?? new Set<string>();
    set.add(session);
    campVisits.set(camp, set);
  }
  const campLeads = new Map<string, number>();
  for (const lead of leads) {
    const camp = lead.utm.utm_campaign;
    if (!camp) continue;
    campLeads.set(camp, (campLeads.get(camp) ?? 0) + 1);
  }
  const porCampana = [...new Set([...campVisits.keys(), ...campLeads.keys()])]
    .map((campana) => ({
      campana,
      visitas: campVisits.get(campana)?.size ?? 0,
      leads: campLeads.get(campana) ?? 0,
    }))
    .sort((a, b) => b.visitas - a.visitas);

  const deviceSessions = new Map<string, Set<string>>();
  const deviceOf = new Map<string, string>();
  for (const e of events) if (!deviceOf.has(e.session_id)) deviceOf.set(e.session_id, e.device);
  for (const [session, device] of deviceOf) {
    const set = deviceSessions.get(device) ?? new Set<string>();
    set.add(session);
    deviceSessions.set(device, set);
  }
  const porDispositivo = [...deviceSessions.entries()]
    .map(([device, set]) => ({ device, visitas: set.size }))
    .sort((a, b) => b.visitas - a.visitas);

  const viewsByUnit = new Map<string, { vistas: number; visitors: Set<string> }>();
  for (const e of unitEvents) {
    if (!e.unit_id) continue;
    const row = viewsByUnit.get(e.unit_id) ?? { vistas: 0, visitors: new Set<string>() };
    row.vistas += 1;
    row.visitors.add(e.visitor_id);
    viewsByUnit.set(e.unit_id, row);
  }
  const leadsByUnit = new Map<string, number>();
  for (const lead of leads) {
    if (!lead.unit_id) continue;
    leadsByUnit.set(lead.unit_id, (leadsByUnit.get(lead.unit_id) ?? 0) + 1);
  }
  const codigo = new Map(q.units.map((u) => [u.id, u.codigo]));
  const topUnidades = [...viewsByUnit.entries()]
    .map(([unitId, row]) => ({
      unitId,
      codigo: codigo.get(unitId) ?? unitId,
      vistas: row.vistas,
      unicos: row.visitors.size,
      leads: leadsByUnit.get(unitId) ?? 0,
    }))
    .sort((a, b) => b.unicos - a.unicos || b.vistas - a.vistas)
    .slice(0, 8);

  const visitas = sessions.size;
  return {
    visitas,
    unicos: visitors.size,
    fichas: fichaSessions.size,
    leads: leads.length,
    whatsapp,
    conversion: visitas ? leads.length / visitas : 0,
    porDia: [...byDay.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    porFuente,
    porCampana,
    porDispositivo,
    topUnidades,
    embudo: [
      { paso: "Visitas", valor: visitas },
      { paso: "Vio una ficha", valor: fichaSessions.size },
      { paso: "Dejó un lead", valor: leadSessions.size },
    ],
  };
}

export function deltaPct(current: number, previous: number): number | null {
  if (!previous) return current ? 100 : null;
  return (current - previous) / previous;
}
