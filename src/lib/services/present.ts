import { computeMetrics, deltaPct, type MetricsSnapshot } from "@/lib/domain/metrics";
import { can, canSeeLead } from "@/lib/domain/permissions";
import type { Actor, Database, Unit } from "@/lib/domain/types";
import { cashPrice, financedQuote, hoursLeftLabel, pendingBadge, publicStatus } from "@/lib/services/engine";
import { withEffectiveAreas } from "@/lib/domain/units";

export function buildShowroom(db: Database, slug: string) {
  const project = db.projects.find((p) => p.slug === slug && p.estado === "published");
  if (!project) return null;
  const floors = db.floors.filter((f) => f.project_id === project.id);
  const buildings = db.buildings.filter((b) => b.project_id === project.id);
  const fields = db.custom_field_definitions
    .filter((f) => f.project_id === project.id && !f.archivado && f.publico)
    .sort((a, b) => a.orden - b.orden);
  const chars = db.characteristics.filter((c) => c.project_id === project.id && !c.archivado);

  const units = db.units
    .filter((u) => u.project_id === project.id && u.estado !== "oculta")
    .map((unit) => {
      const typology = db.typologies.find((t) => t.id === unit.typology_id);
      const eff = withEffectiveAreas(unit, typology);
      const floor = floors.find((f) => f.id === unit.floor_id);
      const building = buildings.find((b) => b.id === floor?.building_id);
      const estado = publicStatus(unit, project.settings.public_pending_display);
      const precio = eff.mostrar_precio ? cashPrice(db, unit) : null;
      const featureIds = new Set<string>();
      for (const link of db.entity_characteristics) {
        if (link.entidad === "unit" && link.entidad_id === unit.id) featureIds.add(link.characteristic_id);
        if (typology && link.entidad === "typology" && link.entidad_id === typology.id) featureIds.add(link.characteristic_id);
      }
      const links = db.media_links.filter((l) =>
        (l.entidad === "unit" && l.entidad_id === unit.id) ||
        (typology && l.entidad === "typology" && l.entidad_id === typology.id),
      );
      const mediaOf = (rol: string) =>
        links
          .filter((l) => l.rol === rol)
          .sort((a, b) => a.orden - b.orden)
          .map((l) => db.media.find((m) => m.id === l.media_id)?.url)
          .filter((u): u is string => Boolean(u));
      const overlay = db.overlays.find(
        (o) => o.project_id === project.id && o.estado === "published" && o.vinculo_tipo === "unit" && o.vinculo_id === unit.id,
      );
      return {
        id: unit.id,
        codigo: unit.codigo,
        piso: floor?.nombre ?? "",
        piso_numero: floor?.numero ?? 0,
        torre: building?.nombre ?? "",
        tipologia: typology?.nombre ?? "",
        tipologia_id: typology?.id ?? null,
        descripcion: typology?.descripcion ?? "",
        ambientes: eff.ambientes,
        dormitorios: eff.dormitorios,
        banos: eff.banos,
        m2_cubiertos: eff.m2_cubiertos,
        m2_totales: eff.m2_totales,
        orientacion: eff.orientacion,
        vista: eff.vista,
        estado,
        precio,
        mostrar_precio: eff.mostrar_precio && estado !== "consultar",
        destacada: unit.destacada,
        features: chars.filter((c) => featureIds.has(c.id)).map((c) => c.nombre),
        custom: fields
          .filter((f) => f.en_ficha)
          .map((f) => ({ clave: f.clave, nombre: f.nombre, tipo: f.tipo, unidad: f.unidad_medida, value: unit.custom_values[f.clave] ?? null }))
          .filter((f) => f.value != null && f.value !== ""),
        values: Object.fromEntries(fields.map((f) => [f.clave, unit.custom_values[f.clave] ?? null])),
        plano: mediaOf("plano")[0] ?? null,
        renders: mediaOf("render"),
        quote: estado === "consultar" ? null : financedQuote(db, unit),
        polygon: overlay?.puntos ?? null,
      };
    })
    .sort((a, b) => a.piso_numero - b.piso_numero || a.codigo.localeCompare(b.codigo, "es"));

  const facade = db.media_links.find((l) => l.entidad === "project" && l.entidad_id === project.id && l.rol === "fachada");
  const facadeUrl = facade ? db.media.find((m) => m.id === facade.media_id)?.url ?? "/demo/fachada.svg" : "/demo/fachada.svg";

  return {
    project: {
      id: project.id,
      nombre: project.nombre,
      slug: project.slug,
      descripcion: project.descripcion,
      direccion: project.direccion,
      fecha_entrega: project.fecha_entrega,
      contacto: project.contacto,
      moneda: project.moneda,
    },
    facade: facadeUrl,
    units,
    filters: {
      ambientes: [...new Set(units.map((u) => u.ambientes).filter((n): n is number => n != null))].sort(),
      orientaciones: [...new Set(units.map((u) => u.orientacion).filter((n): n is string => Boolean(n)))],
      fields: fields.filter((f) => f.en_filtro).map((f) => ({ clave: f.clave, nombre: f.nombre, tipo: f.tipo, opciones: f.opciones })),
    },
  };
}

export function buildBootstrap(db: Database, actor: Actor, now: Date) {
  const projects = db.projects.filter((p) => {
    if (actor.role !== "superadmin" && p.organization_id !== actor.organization_id) return false;
    if (actor.project_ids && !actor.project_ids.includes(p.id)) return false;
    return true;
  });
  const project = projects[0];
  if (!project) return { actor, projects: [], project: null };

  const inProject = <T extends { project_id: string }>(rows: T[]) => rows.filter((r) => r.project_id === project.id);
  const floors = inProject(db.floors);
  const isAdmin = actor.role === "org_admin" || actor.role === "superadmin";
  const listIds = new Set(
    db.price_lists
      .filter((l) => l.project_id === project.id)
      .filter((l) => isAdmin || l.visibilidad === "public" || (actor.role === "seller" && l.visibilidad === "sellers"))
      .map((l) => l.id),
  );

  const units = inProject(db.units).map((unit) => {
    const typology = db.typologies.find((t) => t.id === unit.typology_id);
    const eff = withEffectiveAreas(unit, typology);
    const pending = unit.pending_request_id
      ? db.status_change_requests.find((r) => r.id === unit.pending_request_id && r.estado === "pending")
      : undefined;
    const own = pending?.requested_by === actor.id;
    let pending_label: string | null = null;
    if (pending) {
      const badge = pendingBadge(pending.tipo);
      const left = hoursLeftLabel(pending.expires_at, now);
      if (isAdmin || own) pending_label = `${badge} · vence en ${left}`;
      else pending_label = `Solicitud pendiente — vence en ${left}`;
    }
    const dto: Unit & {
      precio: number | null;
      pending_label: string | null;
      pending_tipo: string | null;
      solicitud_propia: boolean;
      inherited: string[];
    } = {
      ...eff,
      notas_internas: isAdmin ? unit.notas_internas : null,
      precio: cashPrice(db, unit),
      pending_label,
      pending_tipo: pending?.tipo ?? null,
      solicitud_propia: Boolean(own),
      inherited: ["ambientes", "dormitorios", "banos", "m2_cubiertos", "m2_semicubiertos", "m2_descubiertos", "m2_totales"].filter(
        (field) => !unit.overrides.includes(field),
      ),
    };
    if (!isAdmin && !can(actor, "edit_prices")) {
      const hidden = db.price_lists.some((l) => l.project_id === project.id && l.visibilidad === "internal");
      void hidden;
    }
    return dto;
  });

  const leads = inProject(db.leads).filter((l) => canSeeLead(actor, l));
  const requests = inProject(db.status_change_requests).filter((r) => isAdmin || r.requested_by === actor.id);
  const from = new Date(now.getTime() - 30 * 24 * 3_600_000);
  const prevFrom = new Date(now.getTime() - 60 * 24 * 3_600_000);
  const metrics = can(actor, "view_metrics")
    ? computeMetrics({ events: db.events, leads: inProject(db.leads), units, from, to: now })
    : null;
  const previous = can(actor, "view_metrics")
    ? computeMetrics({
        events: db.events,
        leads: inProject(db.leads),
        units,
        from: prevFrom,
        to: from,
      })
    : null;

  const team = db.memberships
    .filter((m) => m.organization_id === project.organization_id)
    .map((m) => {
      const profile = db.profiles.find((p) => p.id === m.user_id);
      return profile ? { id: profile.id, nombre: profile.nombre, email: profile.email, role: m.role, estado: m.estado } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return {
    actor,
    project,
    projects: projects.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      estado: p.estado,
      direccion: p.direccion,
      unidades: db.units.filter((u) => u.project_id === p.id).length,
      vendidas: db.units.filter((u) => u.project_id === p.id && u.estado === "vendida").length,
    })),
    buildings: inProject(db.buildings),
    floors,
    typologies: inProject(db.typologies),
    units,
    fields: inProject(db.custom_field_definitions).filter((f) => !f.archivado),
    characteristics: inProject(db.characteristics).filter((c) => !c.archivado),
    price_lists: db.price_lists.filter((l) => listIds.has(l.id)),
    unit_prices: db.unit_prices.filter((p) => listIds.has(p.price_list_id)),
    payment_plans: db.payment_plans.filter((p) => listIds.has(p.price_list_id)),
    media: inProject(db.media),
    media_links: db.media_links.filter((l) => db.media.some((m) => m.id === l.media_id && m.project_id === project.id)),
    overlays: inProject(db.overlays),
    leads,
    lead_activities: db.lead_activities.filter((a) => leads.some((l) => l.id === a.lead_id)),
    requests,
    request_events: db.status_change_request_events.filter((e) => requests.some((r) => r.id === e.request_id)),
    notifications: db.notifications
      .filter((n) => n.user_id === actor.id && n.canal === "panel")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 40),
    change_log: db.change_log
      .filter((c) => c.project_id === project.id && (isAdmin || c.user_id === actor.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 100),
    change_sets: inProject(db.change_sets),
    metrics,
    deltas: metrics && previous ? deltas(metrics, previous) : null,
    events: can(actor, "view_metrics") ? inProject(db.events) : [],
    integrations: inProject(db.integrations).map((i) => ({
      ...i,
      config: {
        ...i.config,
        api_key: i.config.api_key ? `••••${i.config.api_key.slice(-4)}` : "",
        secret: i.config.secret ? "••••" : "",
      },
    })),
    deliveries: db.integration_deliveries
      .filter((d) => inProject(db.integrations).some((i) => i.id === d.integration_id))
      .slice(-20),
    team,
    pending_count: inProject(db.status_change_requests).filter((r) => r.estado === "pending" && (isAdmin || r.requested_by === actor.id)).length,
    unread: db.notifications.filter((n) => n.user_id === actor.id && n.canal === "panel" && !n.leida).length,
  };
}

function deltas(current: MetricsSnapshot, previous: MetricsSnapshot) {
  return {
    visitas: deltaPct(current.visitas, previous.visitas),
    unicos: deltaPct(current.unicos, previous.unicos),
    fichas: deltaPct(current.fichas, previous.fichas),
    leads: deltaPct(current.leads, previous.leads),
  };
}

export type ShowroomData = NonNullable<ReturnType<typeof buildShowroom>>;
export type AdminData = ReturnType<typeof buildBootstrap>;
