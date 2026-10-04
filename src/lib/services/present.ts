import { computeMetrics, deltaPct, type MetricsSnapshot } from "@/lib/domain/metrics";
import { can, canSeeLead } from "@/lib/domain/permissions";
import type { Actor, Database, Project, Unit } from "@/lib/domain/types";
import { cashPrice, financedQuote, hoursLeftLabel, pendingBadge, publicStatus } from "@/lib/services/engine";
import { floorKey, isRealTour } from "@/lib/domain/showroom-flow";
import { withEffectiveAreas } from "@/lib/domain/units";
import { galleryHeroRank } from "@/lib/domain/gallery-rank";
import { encuadreVista, vistaPorOrientacion } from "@/lib/domain/vista";
import { celdasDeGrilla, plantaDePiso, recortarPoligono } from "@/lib/domain/fachada-grilla";

function mediaUrl(db: Database, mediaId: string | undefined): string | null {
  if (!mediaId) return null;
  return db.media.find((item) => item.id === mediaId)?.url ?? null;
}

function urlsFor(
  db: Database,
  links: Database["media_links"],
  rol: string,
): string[] {
  return links
    .filter((link) => link.rol === rol)
    .sort((a, b) => a.orden - b.orden)
    .map((link) => mediaUrl(db, link.media_id))
    .filter((url): url is string => Boolean(url));
}

function hotspotsDeFachada(db: Database, project: Project, sceneId: string) {
  const grilla = project.settings.fachadas?.find((item) => item.viewpoint_id === sceneId);
  if (!grilla?.caras.length) return null;
  const floors = db.floors.filter((floor) => floor.project_id === project.id);
  const units = db.units
    .filter((unit) => unit.project_id === project.id)
    .map((unit) => {
      const floor = floors.find((item) => item.id === unit.floor_id);
      return {
        id: unit.id,
        codigo: unit.codigo,
        planta: plantaDePiso(floor?.numero ?? -99),
        tipo: unit.tipo,
        orientacion: unit.orientacion,
      };
    });
  const silueta = grilla.silueta ?? [];
  const cells = celdasDeGrilla(grilla.caras, units);
  const hotspots = cells.flatMap((cell, index) => {
    const unit = units.find((item) => item.codigo === cell.codigo);
    const puntos = recortarPoligono(cell.puntos, silueta);
    if (!unit || puntos.length < 3) return [];
    return [{
      id: `fachada-${sceneId}-${cell.codigo}-${index}`,
      contenedor: "scene" as const,
      contenedor_id: sceneId,
      puntos,
      vinculo_tipo: "unit" as const,
      vinculo_id: unit.id,
      etiqueta: cell.codigo,
    }];
  });
  return hotspots.length ? hotspots : null;
}

export function buildShowroom(db: Database, slug: string) {
  const project = db.projects.find((p) => p.slug === slug && p.estado === "published");
  if (!project) return null;
  const floors = db.floors.filter((f) => f.project_id === project.id);
  const buildings = db.buildings.filter((b) => b.project_id === project.id).sort((a, b) => a.orden - b.orden);
  const fields = db.custom_field_definitions
    .filter((f) => f.project_id === project.id && !f.archivado && f.publico)
    .sort((a, b) => a.orden - b.orden);
  const chars = db.characteristics.filter((c) => c.project_id === project.id && !c.archivado);
  const org = db.organizations.find((item) => item.id === project.organization_id);

  const units = db.units
    .filter((u) => u.project_id === project.id && u.estado !== "oculta")
    .map((unit) => {
      const typology = db.typologies.find((t) => t.id === unit.typology_id);
      const eff = withEffectiveAreas(unit, typology);
      const floor = floors.find((f) => f.id === unit.floor_id);
      const building = buildings.find((b) => b.id === (unit.building_id || floor?.building_id));
      const estado = publicStatus(unit, project.settings.public_pending_display);
      const precio = eff.mostrar_precio ? cashPrice(db, unit) : null;
      const featureIds = new Set<string>();
      for (const link of db.entity_characteristics) {
        if (link.entidad === "unit" && link.entidad_id === unit.id) featureIds.add(link.characteristic_id);
        if (typology && link.entidad === "typology" && link.entidad_id === typology.id) featureIds.add(link.characteristic_id);
      }
      const unitLinks = db.media_links.filter((l) => l.entidad === "unit" && l.entidad_id === unit.id);
      const typologyLinks = typology ? db.media_links.filter((l) => l.entidad === "typology" && l.entidad_id === typology.id) : [];
      const links = [...unitLinks, ...typologyLinks];
      const vistaPropia = urlsFor(db, unitLinks, "vista")[0] ?? urlsFor(db, typologyLinks, "vista")[0] ?? null;
      const vistaUrl = unit.vista === "sin" ? null : vistaPropia ?? vistaPorOrientacion(unit.orientacion, project.settings.vistas_orientacion);
      const floorLinks = db.media_links.filter((l) => l.entidad === "floor" && l.entidad_id === unit.floor_id);
      const mediaOf = (rol: string) => urlsFor(db, links, rol);
      const galeria = mediaOf("galeria")
        .map((url, index) => ({ url, index }))
        .sort((a, b) => galleryHeroRank(a.url) - galleryHeroRank(b.url) || a.index - b.index)
        .map((item) => item.url);
      const overlay = db.overlays.find(
        (o) => o.project_id === project.id && o.estado === "published" && o.contenedor === "facade" && o.vinculo_tipo === "unit" && o.vinculo_id === unit.id,
      );
      const tour = db.tours
        .filter((item) => item.project_id === project.id)
        .filter((item) =>
          (item.entidad === "unit" && item.entidad_id === unit.id) ||
          (typology && item.entidad === "typology" && item.entidad_id === typology.id) ||
          (floor && item.entidad === "floor" && item.entidad_id === floor.id),
        )
        .sort((a, b) => a.orden - b.orden)
        .find((item) => {
          const media = db.media.find((entry) => entry.url === item.url);
          return isRealTour(item.proveedor, item.url, media?.ancho, media?.alto);
        });
      return {
        id: unit.id,
        codigo: unit.codigo,
        floor_id: unit.floor_id,
        building_id: building?.id ?? unit.building_id ?? null,
        piso: floor?.nombre ?? (unit.tipo === "lote" ? "Lote" : ""),
        piso_numero: floor?.numero ?? 0,
        torre: building?.nombre ?? "",
        tipo: unit.tipo,
        tipologia: typology?.nombre ?? (unit.tipo === "lote" ? "Lote" : ""),
        tipologia_id: typology?.id ?? null,
        descripcion: typology?.descripcion ?? "",
        ambientes: eff.ambientes,
        dormitorios: eff.dormitorios,
        banos: eff.banos,
        m2_cubiertos: eff.m2_cubiertos,
        m2_totales: eff.m2_totales,
        orientacion: eff.orientacion,
        vista: unit.vista === "sin" ? null : eff.vista,
        planta: floor ? floorKey(floor.numero) : "",
        estado,
        precio,
        mostrar_precio: eff.mostrar_precio && estado !== "consultar",
        destacada: unit.destacada,
        features: chars.filter((c) => featureIds.has(c.id) && c.icono !== "amenity").map((c) => c.nombre),
        custom: fields
          .filter((f) => f.en_ficha)
          .map((f) => ({ clave: f.clave, nombre: f.nombre, tipo: f.tipo, unidad: f.unidad_medida, value: unit.custom_values[f.clave] ?? null }))
          .filter((f) => f.value != null && f.value !== ""),
        values: Object.fromEntries(fields.map((f) => [f.clave, unit.custom_values[f.clave] ?? null])),
        plano: mediaOf("plano")[0] ?? null,
        planta3d: mediaOf("render")[0] ?? null,
        galeria,
        renders: [...mediaOf("render"), ...mediaOf("galeria")],
        acabados: mediaOf("acabado"),
        videos: mediaOf("video"),
        vista_url: vistaUrl,
        vista_encuadre: encuadreVista(floor?.numero ?? 0, Boolean(vistaPropia)),
        quote: estado === "consultar" ? null : financedQuote(db, unit),
        polygon: overlay?.puntos ?? null,
        tour: tour
          ? { titulo: tour.titulo, proveedor: tour.proveedor, url: tour.url }
          : unit.tour_url && isRealTour("url", unit.tour_url)
            ? { titulo: "Tour 360", proveedor: "url" as const, url: unit.tour_url }
            : null,
      };
    })
    .sort((a, b) => a.piso_numero - b.piso_numero || a.codigo.localeCompare(b.codigo, "es"));

  const facade = db.media_links.find((l) => l.entidad === "project" && l.entidad_id === project.id && l.rol === "fachada");
  const facadeUrl = facade ? db.media.find((m) => m.id === facade.media_id)?.url ?? "/demo/fachada.webp" : "/demo/fachada.webp";

  const publishedOverlays = db.overlays
    .filter((overlay) => overlay.project_id === project.id && overlay.estado === "published")
    .map((overlay) => ({
      id: overlay.id,
      contenedor: overlay.contenedor,
      contenedor_id: overlay.contenedor_id,
      puntos: overlay.puntos,
      vinculo_tipo: overlay.vinculo_tipo,
      vinculo_id: overlay.vinculo_id,
      etiqueta: overlay.etiqueta,
    }));

  const scenes = db.viewpoints
    .filter((scene) => scene.project_id === project.id)
    .sort((a, b) => a.orden - b.orden)
    .map((scene) => {
      const parada = project.settings.recorrido?.paradas.find((item) => item.orden === scene.orden);
      return {
        ...scene,
        transicion_url: parada?.transicion_url ?? null,
        reversa_url: parada?.reversa_url ?? null,
        vuelo_url: parada?.vuelo_url ?? null,
        hotspots: hotspotsDeFachada(db, project, scene.id) ?? publishedOverlays.filter((overlay) => overlay.contenedor === "scene" && overlay.contenedor_id === scene.id),
        mascara: project.settings.mascaras?.find((item) => item.viewpoint_id === scene.id) ?? null,
        silueta: project.settings.fachadas?.find((item) => item.viewpoint_id === scene.id)?.silueta ?? null,
      };
    });
  if (!scenes.length) {
    scenes.push({
      id: "fachada",
      project_id: project.id,
      building_id: buildings[0]?.id ?? null,
      nombre: "Fachada",
      tipo: "exterior",
      orden: 0,
      imagen_url: facadeUrl,
      video_url: null,
      transicion_url: null,
      reversa_url: null,
      vuelo_url: null,
      hotspots: [],
      mascara: null,
      silueta: null,
    });
  }

  const buildingCards = buildings.map((building) => {
    const fachadaLink = db.media_links.find((link) => link.entidad === "building" && link.entidad_id === building.id && link.rol === "fachada");
    return {
      id: building.id,
      nombre: building.nombre,
      tipo: building.tipo,
      fachada: mediaUrl(db, fachadaLink?.media_id) ?? (building.orden === 1 ? facadeUrl : null),
      floors: floors
        .filter((floor) => floor.building_id === building.id)
        .sort((a, b) => b.numero - a.numero)
        .map((floor) => {
          const links = db.media_links.filter((link) => link.entidad === "floor" && link.entidad_id === floor.id);
          return {
            id: floor.id,
            nombre: floor.nombre,
            numero: floor.numero,
            clave: floorKey(floor.numero),
            plano: urlsFor(db, links, "plano")[0] ?? null,
            vista: urlsFor(db, links, "vista")[0] ?? null,
            libres: units.filter((unit) => unit.floor_id === floor.id && unit.estado === "disponible").length,
          };
        }),
    };
  });

  const amenities = chars
    .filter((item) => item.icono === "amenity")
    .sort((a, b) => a.orden - b.orden)
    .map((item) => {
      const links = db.media_links.filter((link) => link.entidad === "amenity" && link.entidad_id === item.id);
      const tour = db.tours.find((entry) => entry.entidad === "amenity" && entry.entidad_id === item.id);
      return {
        id: item.id,
        nombre: item.nombre,
        imagen: urlsFor(db, links, "render")[0] ?? urlsFor(db, links, "galeria")[0] ?? null,
        tour: tour ? { titulo: tour.titulo, proveedor: tour.proveedor, url: tour.url } : null,
      };
    });

  const gallery = db.media
    .filter((item) => item.project_id === project.id && item.tipo === "imagen" && item.carpeta !== "planos")
    .map((item) => ({ id: item.id, nombre: item.titulo || item.nombre, url: item.url }));

  return {
    mode: "showroom" as const,
    project: {
      id: project.id,
      nombre: project.nombre,
      slug: project.slug,
      descripcion: project.descripcion,
      direccion: project.direccion,
      fecha_entrega: project.fecha_entrega,
      contacto: project.contacto,
      moneda: project.moneda,
      lat: project.lat ?? null,
      lng: project.lng ?? null,
      redes: project.redes ?? {},
      lite: Boolean(project.settings.showroom_lite),
      legal: project.settings.texto_legal ?? "",
      cookies: project.settings.aviso_cookies ?? "",
      pasos: project.settings.pasos ?? [],
      brochure: project.settings.brochure_url || null,
      logo: project.settings.logo_url ?? null,
      acento: project.settings.color_acento ?? "#c4a574",
      titulo: project.settings.titulo_publico || project.nombre,
      usdArs: project.settings.usd_ars ?? 1450,
      cac: project.settings.cac_factor ?? 1,
      ga4: project.settings.ga4_id ?? "",
      gtm: project.settings.gtm_id ?? "",
      pixel: project.settings.pixel_id ?? "",
      remarketing: Boolean(project.settings.remarketing),
      ficha: {
        precio: project.settings.ficha?.precio !== false,
        whatsapp: project.settings.ficha?.whatsapp !== false,
        compartir: project.settings.ficha?.compartir !== false,
        pdf: project.settings.ficha?.pdf !== false,
        ambientes: project.settings.ficha?.ambientes !== false,
      },
      dominio: project.dominio,
    },
    organization: {
      nombre: org?.nombre ?? "",
      descripcion: org?.descripcion ?? "",
    },
    facade: facadeUrl,
    scenes,
    buildings: buildingCards,
    overlays: publishedOverlays,
    amenities,
    pois: db.points_of_interest
      .filter((poi) => poi.project_id === project.id)
      .sort((a, b) => a.orden - b.orden)
      .map((poi) => ({
        id: poi.id,
        nombre: poi.nombre,
        categoria: poi.categoria,
        lat: poi.lat,
        lng: poi.lng,
        distancia_m: poi.distancia_m,
        descripcion: poi.descripcion,
      })),
    gallery,
    units,
    plans: db.payment_plans
      .filter((plan) => db.price_lists.some((list) => list.id === plan.price_list_id && list.project_id === project.id && list.visibilidad === "public"))
      .map((plan) => ({
        id: plan.id,
        nombre: plan.nombre,
        price_list_id: plan.price_list_id,
        lista: db.price_lists.find((list) => list.id === plan.price_list_id)?.nombre ?? "",
        anticipo_pct: plan.anticipo_pct,
        cuotas: plan.cuotas,
        periodicidad: plan.periodicidad,
        moneda_cuotas: plan.moneda_cuotas,
        refuerzos: plan.refuerzos,
        saldo_posesion_pct: plan.saldo_posesion_pct,
        indice: plan.indice,
        indice_leyenda: plan.indice_leyenda,
        descuento_pct: plan.descuento_pct,
        texto_legal: plan.texto_legal,
        anticipo_min: plan.anticipo_min,
      })),
    progress: db.construction_updates
      .filter((item) => item.project_id === project.id)
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    sections: db.custom_sections
      .filter((item) => item.project_id === project.id && item.visible)
      .sort((a, b) => a.orden - b.orden),
    filters: {
      ambientes: [...new Set(units.map((u) => u.ambientes).filter((n): n is number => n != null))].sort(),
      orientaciones: [...new Set(units.map((u) => u.orientacion).filter((n): n is string => Boolean(n)))],
      fields: fields.filter((f) => f.en_filtro).map((f) => ({ clave: f.clave, nombre: f.nombre, tipo: f.tipo, opciones: f.opciones })),
    },
  };
}

export function buildPublic(db: Database, slug: string) {
  const project = db.projects.find((item) => item.slug === slug);
  if (!project || project.estado === "draft") return null;
  if (project.estado === "coming_soon") {
    const cover = db.viewpoints.find((scene) => scene.project_id === project.id && scene.tipo === "portada");
    return {
      kind: "coming_soon" as const,
      project: {
        nombre: project.nombre,
        slug: project.slug,
        descripcion: project.descripcion,
        direccion: project.direccion,
        contacto: project.contacto,
        imagen: cover?.imagen_url ?? "/demo/portada.webp",
      },
    };
  }
  const data = buildShowroom(db, slug);
  if (!data) return null;
  return { kind: "showroom" as const, data };
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
    viewpoints: inProject(db.viewpoints).sort((a, b) => a.orden - b.orden),
    construction_updates: inProject(db.construction_updates).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    custom_sections: inProject(db.custom_sections).sort((a, b) => a.orden - b.orden),
    improvement_requests: inProject(db.improvement_requests).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    points_of_interest: inProject(db.points_of_interest).sort((a, b) => a.orden - b.orden),
    tours: inProject(db.tours).sort((a, b) => a.orden - b.orden),
    galleries: inProject(db.galleries).sort((a, b) => a.orden - b.orden),
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
