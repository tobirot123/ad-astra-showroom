import { previewImport, readImportRows, exportUnitsCsv } from "@/lib/domain/csv";
import { uid } from "@/lib/domain/ids";
import { can, canAccessProject, canSeeLead } from "@/lib/domain/permissions";
import { adjustPrice, quoteUnit, resolveUnitPrice } from "@/lib/domain/pricing";
import {
  approveStatusRequest,
  cancelStatusRequest,
  createStatusRequest,
  directStatusChange,
  dueReminders,
  expireStatusRequest,
  extendStatusRequest,
  hoursLeftLabel,
  pendingBadge,
  publicStatus,
  rejectStatusRequest,
} from "@/lib/domain/requests";
import { classifySource } from "@/lib/domain/source";
import type {
  Actor,
  AnalyticsEvent,
  ChangeLog,
  CustomField,
  Database,
  FieldType,
  Lead,
  NotificationRow,
  Project,
  RequestTipo,
  Role,
  Unit,
  UnitStatus,
} from "@/lib/domain/types";
import { ServiceError } from "@/lib/domain/types";
import {
  clearOverride,
  effectiveNumber,
  validateAreas,
  withEffectiveAreas,
  type InheritedField,
} from "@/lib/domain/units";
import { buildWebcontactBody, nextRetryAt, shouldAlertAdmin, tokkoUrl } from "@/lib/domain/tokko";

export interface EmailDraft {
  to: string;
  subject: string;
  text: string;
}

export interface DeliveryJob {
  integrationId: string;
  leadId: string;
  tipo: "tokko" | "webhook";
  url: string;
  secret?: string;
  body: unknown;
}

export interface OpResult {
  emails: EmailDraft[];
  extra?: Record<string, unknown>;
  jobs: DeliveryJob[];
}

const noResult = (): OpResult => ({ emails: [], jobs: [] });

export function actorFor(db: Database, userId: string): Actor | null {
  const profile = db.profiles.find((p) => p.id === userId);
  const membership = db.memberships.find((m) => m.user_id === userId && m.estado === "active");
  if (!profile || !membership) return null;
  const links = db.project_members.filter((pm) => pm.membership_id === membership.id);
  return {
    id: profile.id,
    nombre: profile.nombre,
    email: profile.email,
    role: membership.role,
    organization_id: membership.organization_id,
    project_ids: links.length ? links.map((l) => l.project_id) : null,
    permisos: membership.permisos,
  };
}

export function accessibleProjects(db: Database, actor: Actor): Project[] {
  return db.projects.filter((p) => canAccessProject(actor, p));
}

function requireProject(db: Database, actor: Actor, projectId: string): Project {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) throw new ServiceError("No encontramos el proyecto.", 404);
  if (!canAccessProject(actor, project)) throw new ServiceError("No tenés acceso a esta organización.", 403);
  return project;
}

function requireAction(actor: Actor, action: Parameters<typeof can>[1]) {
  if (!can(actor, action)) throw new ServiceError("No tenés permiso para esta acción.", 403);
}

function approverIds(db: Database, project: Project): string[] {
  if (project.settings.approver_user_ids.length) return project.settings.approver_user_ids;
  return db.memberships
    .filter((m) => m.organization_id === project.organization_id && m.estado === "active" && (m.role === "org_admin" || m.role === "superadmin"))
    .map((m) => m.user_id);
}

function pushNote(
  db: Database,
  result: OpResult,
  userIds: string[],
  project: Project,
  input: { tipo: string; titulo: string; cuerpo: string; entidad?: string; entidadId?: string; now: Date },
) {
  const unique = [...new Set(userIds)];
  for (const userId of unique) {
    const row: NotificationRow = {
      id: uid(),
      user_id: userId,
      organization_id: project.organization_id,
      project_id: project.id,
      tipo: input.tipo,
      titulo: input.titulo,
      cuerpo: input.cuerpo,
      entidad: input.entidad ?? null,
      entidad_id: input.entidadId ?? null,
      canal: "panel",
      leida: false,
      created_at: input.now.toISOString(),
    };
    db.notifications.push(row);
    const profile = db.profiles.find((p) => p.id === userId);
    if (profile) {
      result.emails.push({
        to: profile.email,
        subject: input.titulo,
        text: `${input.cuerpo}\n\nEntrá al panel para ver el detalle.`,
      });
      db.notifications.push({ ...row, id: uid(), canal: "email" });
    }
  }
}

function logChange(db: Database, row: Omit<ChangeLog, "id" | "created_at"> & { created_at?: string }, now: Date) {
  db.change_log.push({ id: uid(), created_at: row.created_at ?? now.toISOString(), ...row });
}

function typologyOf(db: Database, unit: Unit) {
  return db.typologies.find((t) => t.id === unit.typology_id);
}

function effectiveUnit(db: Database, unit: Unit): Unit {
  return withEffectiveAreas(unit, typologyOf(db, unit));
}

export function sweep(db: Database, now: Date): OpResult {
  const result = noResult();
  for (const request of [...db.status_change_requests]) {
    const unit = db.units.find((u) => u.id === request.unit_id);
    const project = db.projects.find((p) => p.id === request.project_id);
    if (!unit || !project) continue;
    const events = db.status_change_request_events.filter((e) => e.request_id === request.id);
    for (const kind of dueReminders(request, events, now)) {
      db.status_change_request_events.push({
        id: uid(),
        request_id: request.id,
        tipo: kind,
        user_id: null,
        detalle: {},
        created_at: now.toISOString(),
      });
      const titulo = kind === "reminder_4h" ? "Una solicitud vence en menos de 4 h" : "Solicitud sin respuesta hace 24 h";
      pushNote(db, result, approverIds(db, project), project, {
        tipo: "reminder",
        titulo,
        cuerpo: `La solicitud sobre la unidad ${unit.codigo} sigue pendiente.`,
        entidad: "status_change_request",
        entidadId: request.id,
        now,
      });
    }
    const expired = expireStatusRequest(request, unit, now);
    if (!expired || !expired.ok) continue;
    const idx = db.status_change_requests.findIndex((r) => r.id === request.id);
    db.status_change_requests[idx] = expired.value.request;
    const uidx = db.units.findIndex((u) => u.id === unit.id);
    db.units[uidx] = expired.value.unit;
    db.status_change_request_events.push(expired.value.event);
    const seller = request.requested_by;
    pushNote(db, result, [seller, ...approverIds(db, project)], project, {
      tipo: "expired",
      titulo: `Se venció la solicitud de la ${unit.codigo}`,
      cuerpo: "La unidad volvió a quedar libre para otras solicitudes. El showroom no había cambiado.",
      entidad: "status_change_request",
      entidadId: request.id,
      now,
    });
  }
  return result;
}

export function track(db: Database, input: Omit<AnalyticsEvent, "id" | "fuente"> & { fuente?: string }): void {
  db.events.push({
    ...input,
    id: uid(),
    fuente: input.fuente || classifySource({
      utm_source: input.utm_source ?? undefined,
      utm_medium: input.utm_medium ?? undefined,
      utm_campaign: input.utm_campaign ?? undefined,
    }),
  });
}

export function submitLead(
  db: Database,
  input: {
    projectId: string;
    unitId?: string | null;
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    mensaje?: string | null;
    canal: "form" | "whatsapp";
    utm: Lead["utm"];
    sessionId?: string | null;
    visitorId?: string | null;
    now: Date;
  },
): { lead: Lead; created: boolean; result: OpResult } {
  const project = db.projects.find((p) => p.id === input.projectId);
  if (!project || project.estado !== "published") throw new ServiceError("El proyecto no está publicado.", 404);
  const nombre = input.nombre.trim();
  if (nombre.length < 2) throw new ServiceError("Necesitamos un nombre.");
  if (!input.email?.trim() && !input.telefono?.trim()) {
    throw new ServiceError("Dejá un email o un teléfono para que te contactemos.");
  }
  const email = input.email?.trim().toLowerCase() || null;
  const telefono = input.telefono?.trim() || null;
  const fuente = classifySource(input.utm);
  const existing = db.leads.find((l) => {
    if (l.project_id !== project.id) return false;
    if (email && l.email?.toLowerCase() === email) return true;
    if (telefono && l.telefono === telefono) return true;
    return false;
  });
  const result = noResult();
  const nowIso = input.now.toISOString();
  if (existing) {
    existing.updated_at = nowIso;
    if (input.unitId) existing.unit_id = input.unitId;
    if (input.mensaje) existing.mensaje = input.mensaje;
    db.lead_activities.push({
      id: uid(),
      lead_id: existing.id,
      tipo: "consulta",
      detalle: input.mensaje?.trim() || "Nueva consulta desde el showroom",
      user_id: null,
      created_at: nowIso,
    });
    queueDeliveries(db, project, existing, result, input.now);
    return { lead: existing, created: false, result };
  }
  const lead: Lead = {
    id: uid(),
    project_id: project.id,
    unit_id: input.unitId ?? null,
    nombre,
    email,
    telefono,
    mensaje: input.mensaje?.trim() || null,
    canal: input.canal,
    estado: "nuevo",
    assigned_to: null,
    utm: input.utm,
    fuente,
    session_id: input.sessionId ?? null,
    visitor_id: input.visitorId ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };
  db.leads.push(lead);
  const unit = input.unitId ? db.units.find((u) => u.id === input.unitId) : undefined;
  pushNote(db, result, approverIds(db, project), project, {
    tipo: "lead",
    titulo: `Nuevo lead: ${lead.nombre}`,
    cuerpo: unit ? `Consultó la unidad ${unit.codigo} (${fuente}).` : `Dejó sus datos en ${project.nombre} (${fuente}).`,
    entidad: "lead",
    entidadId: lead.id,
    now: input.now,
  });
  queueDeliveries(db, project, lead, result, input.now);
  return { lead, created: true, result };
}

function queueDeliveries(db: Database, project: Project, lead: Lead, result: OpResult, now: Date) {
  const unit = lead.unit_id ? db.units.find((u) => u.id === lead.unit_id) ?? null : null;
  for (const integration of db.integrations.filter((i) => i.project_id === project.id && i.config.enabled)) {
    if (integration.tipo === "tokko") {
      if (!integration.config.api_key || !integration.config.development_id) continue;
      const body = buildWebcontactBody({
        lead,
        unit,
        projectName: project.nombre,
        developmentId: integration.config.development_id,
      });
      db.integration_deliveries.push({
        id: uid(),
        integration_id: integration.id,
        lead_id: lead.id,
        intento: 0,
        estado: "pendiente",
        respuesta: null,
        next_retry_at: now.toISOString(),
        created_at: now.toISOString(),
      });
      result.jobs.push({
        integrationId: integration.id,
        leadId: lead.id,
        tipo: "tokko",
        url: tokkoUrl(integration.config.api_key),
        body,
      });
    }
    if (integration.tipo === "webhook" && integration.config.url) {
      const body = {
        event: "lead.created",
        project: { id: project.id, nombre: project.nombre },
        unit: unit ? { id: unit.id, codigo: unit.codigo } : null,
        lead: {
          id: lead.id,
          nombre: lead.nombre,
          email: lead.email,
          telefono: lead.telefono,
          mensaje: lead.mensaje,
          fuente: lead.fuente,
          canal: lead.canal,
          utm: lead.utm,
        },
      };
      db.integration_deliveries.push({
        id: uid(),
        integration_id: integration.id,
        lead_id: lead.id,
        intento: 0,
        estado: "pendiente",
        respuesta: null,
        next_retry_at: now.toISOString(),
        created_at: now.toISOString(),
      });
      result.jobs.push({
        integrationId: integration.id,
        leadId: lead.id,
        tipo: "webhook",
        url: integration.config.url,
        secret: integration.config.secret,
        body,
      });
    }
  }
}

export function recordDelivery(
  db: Database,
  job: DeliveryJob,
  outcome: { ok: boolean; status: number; body: string },
  now: Date,
): OpResult {
  const result = noResult();
  const integration = db.integrations.find((i) => i.id === job.integrationId);
  if (!integration) return result;
  const delivery = [...db.integration_deliveries]
    .reverse()
    .find((d) => d.integration_id === job.integrationId && d.lead_id === job.leadId && d.estado === "pendiente");
  const intento = (delivery?.intento ?? 0) + 1;
  if (delivery) {
    delivery.intento = intento;
    delivery.respuesta = `${outcome.status} ${outcome.body}`.slice(0, 500);
    delivery.estado = outcome.ok ? "ok" : "error";
    delivery.next_retry_at = outcome.ok ? null : nextRetryAt(intento, now).toISOString();
  }
  integration.ultimo_envio = now.toISOString();
  if (outcome.ok) {
    integration.errores_consecutivos = 0;
    integration.estado = "ok";
  } else {
    integration.errores_consecutivos += 1;
    integration.estado = "error";
    if (!outcome.ok && delivery) {
      db.integration_deliveries.push({
        id: uid(),
        integration_id: integration.id,
        lead_id: job.leadId,
        intento,
        estado: "pendiente",
        respuesta: null,
        next_retry_at: nextRetryAt(intento, now).toISOString(),
        created_at: now.toISOString(),
      });
    }
    const project = db.projects.find((p) => p.id === integration.project_id);
    if (project && shouldAlertAdmin(integration.errores_consecutivos)) {
      pushNote(db, result, approverIds(db, project), project, {
        tipo: "integration_error",
        titulo: `Falló el envío a ${integration.tipo === "tokko" ? "Tokko" : "el webhook"}`,
        cuerpo: "Hubo 5 errores seguidos. Los leads siguen guardados en el panel. Revisá la API key o la URL.",
        now,
      });
      integration.errores_consecutivos = 0;
    }
  }
  return result;
}

export interface UnitPatch {
  version?: number;
  m2_cubiertos?: number | null;
  m2_semicubiertos?: number | null;
  m2_descubiertos?: number | null;
  m2_totales?: number | null;
  ambientes?: number | null;
  dormitorios?: number | null;
  banos?: number | null;
  orientacion?: string | null;
  vista?: string | null;
  mostrar_precio?: boolean;
  destacada?: boolean;
  notas_internas?: string | null;
  typology_id?: string | null;
  custom_values?: Record<string, unknown>;
  precio_usd?: number | null;
  estado?: UnitStatus;
  confirm?: boolean;
}

const AREA_FIELDS = ["m2_cubiertos", "m2_semicubiertos", "m2_descubiertos", "m2_totales", "ambientes", "dormitorios", "banos"] as const;

export function updateUnit(db: Database, actor: Actor, unitId: string, patch: UnitPatch, now: Date): OpResult {
  const unit = db.units.find((u) => u.id === unitId);
  if (!unit) throw new ServiceError("No encontramos la unidad.", 404);
  const project = requireProject(db, actor, unit.project_id);
  const result = noResult();
  if (patch.version != null && patch.version !== unit.version) {
    throw new ServiceError("Esta unidad cambió hace un momento. Recargá antes de pisar el cambio.", 409);
  }
  if (patch.estado && patch.estado !== unit.estado) {
    requireAction(actor, "change_status_direct");
    return applyDirect(db, actor, unit, patch.estado, Boolean(patch.confirm), now, result, "edit");
  }
  const touchesPrice = patch.precio_usd !== undefined;
  const touchesData = Object.keys(patch).some((k) => !["version", "precio_usd", "estado", "confirm"].includes(k));
  if (touchesData) requireAction(actor, "edit_units");
  if (touchesPrice) requireAction(actor, "edit_prices");

  const before = { ...unit, custom_values: { ...unit.custom_values } };
  if (patch.typology_id !== undefined) unit.typology_id = patch.typology_id;
  for (const field of AREA_FIELDS) {
    if (patch[field] !== undefined) {
      (unit as unknown as Record<string, unknown>)[field] = patch[field];
      if (!unit.overrides.includes(field)) unit.overrides = [...unit.overrides, field];
    }
  }
  if (patch.orientacion !== undefined) unit.orientacion = patch.orientacion;
  if (patch.vista !== undefined) unit.vista = patch.vista;
  if (patch.mostrar_precio !== undefined) unit.mostrar_precio = patch.mostrar_precio;
  if (patch.destacada !== undefined) unit.destacada = patch.destacada;
  if (patch.notas_internas !== undefined) unit.notas_internas = patch.notas_internas;
  if (patch.custom_values) {
    const fields = db.custom_field_definitions.filter((f) => f.project_id === project.id && !f.archivado);
    for (const [clave, value] of Object.entries(patch.custom_values)) {
      const field = fields.find((f) => f.clave === clave);
      if (!field) throw new ServiceError(`El campo ${clave} no existe en este proyecto.`);
      unit.custom_values[clave] = normalizeCustom(field, value);
    }
  }
  const effective = effectiveUnit(db, unit);
  const areaError = validateAreas(effective.m2_cubiertos, effective.m2_totales);
  if (areaError) throw new ServiceError(areaError);
  unit.version += 1;
  unit.updated_at = now.toISOString();
  unit.updated_by = actor.id;
  for (const field of [...AREA_FIELDS, "orientacion", "vista", "mostrar_precio", "destacada", "typology_id"] as const) {
    if (patch[field] !== undefined && before[field] !== unit[field]) {
      logChange(db, {
        project_id: project.id,
        change_set_id: null,
        user_id: actor.id,
        requested_by: null,
        request_id: null,
        entidad: "unit",
        entidad_id: unit.id,
        campo: field,
        valor_anterior: before[field],
        valor_nuevo: unit[field],
        origen: "edit",
      }, now);
    }
  }
  if (patch.precio_usd !== undefined) setPrice(db, actor, project, unit, patch.precio_usd, now, null, "edit");
  return result;
}

function normalizeCustom(field: CustomField, value: unknown): unknown {
  if (value == null || value === "") return null;
  if (field.tipo === "number") {
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    if (!Number.isFinite(n)) throw new ServiceError(`${field.nombre} tiene que ser un número.`);
    return n;
  }
  if (field.tipo === "boolean") return Boolean(value);
  if (field.tipo === "select") {
    const s = String(value);
    if (!field.opciones.includes(s)) throw new ServiceError(`«${s}» no es una opción de ${field.nombre}.`);
    return s;
  }
  return value;
}

function setPrice(
  db: Database,
  actor: Actor,
  project: Project,
  unit: Unit,
  precio: number | null,
  now: Date,
  changeSetId: string | null,
  origen: ChangeLog["origen"],
) {
  const list = publicCashList(db, project.id);
  if (!list) throw new ServiceError("No hay una lista de precios de contado publicada.");
  if (precio != null && precio <= 0) throw new ServiceError("El precio tiene que ser mayor a 0, o vacío para «consultar».");
  const row = db.unit_prices.find((p) => p.unit_id === unit.id && p.price_list_id === list.id);
  const before = row?.precio ?? null;
  if (before === precio) return;
  if (precio == null) {
    db.unit_prices = db.unit_prices.filter((p) => !(p.unit_id === unit.id && p.price_list_id === list.id));
    unit.mostrar_precio = false;
  } else if (row) row.precio = precio;
  else db.unit_prices.push({ unit_id: unit.id, price_list_id: list.id, precio });
  logChange(db, {
    project_id: project.id,
    change_set_id: changeSetId,
    user_id: actor.id,
    requested_by: null,
    request_id: null,
    entidad: "unit",
    entidad_id: unit.id,
    campo: "precio_usd",
    valor_anterior: before,
    valor_nuevo: precio,
    origen,
  }, now);
}

function publicCashList(db: Database, projectId: string) {
  return db.price_lists.find((l) => l.project_id === projectId && l.visibilidad === "public" && !l.regla);
}

function applyDirect(
  db: Database,
  actor: Actor,
  unit: Unit,
  estado: UnitStatus,
  confirm: boolean,
  now: Date,
  result: OpResult,
  origen: ChangeLog["origen"],
): OpResult {
  const project = requireProject(db, actor, unit.project_id);
  const pending = db.status_change_requests.find((r) => r.id === unit.pending_request_id && r.estado === "pending") ?? null;
  const decided = directStatusChange({ unit, actor, estado, now, pending, confirm });
  if (!decided.ok) {
    throw new ServiceError(decided.error, 409, { needsConfirm: decided.needsConfirm, conflict: decided.conflict });
  }
  const idx = db.units.findIndex((u) => u.id === unit.id);
  db.units[idx] = decided.value.unit;
  if (decided.value.pending) {
    const ridx = db.status_change_requests.findIndex((r) => r.id === decided.value.pending!.id);
    db.status_change_requests[ridx] = decided.value.pending;
  }
  if (decided.value.event) db.status_change_request_events.push(decided.value.event);
  logChange(db, {
    project_id: project.id,
    change_set_id: null,
    user_id: actor.id,
    requested_by: pending?.requested_by ?? null,
    request_id: pending?.id ?? null,
    entidad: "unit",
    entidad_id: unit.id,
    campo: "estado",
    valor_anterior: unit.estado,
    valor_nuevo: estado,
    origen: pending ? "request_resolved" : origen,
  }, now);
  if (pending) {
    pushNote(db, result, [pending.requested_by], project, {
      tipo: "resolved",
      titulo: `Se cerró tu solicitud de la ${unit.codigo}`,
      cuerpo: `El admin cambió el estado a ${estado} y la solicitud quedó resuelta por cambio directo.`,
      entidad: "status_change_request",
      entidadId: pending.id,
      now,
    });
  }
  return result;
}

export function directStatus(db: Database, actor: Actor, unitId: string, estado: UnitStatus, confirm: boolean, now: Date): OpResult {
  const unit = db.units.find((u) => u.id === unitId);
  if (!unit) throw new ServiceError("No encontramos la unidad.", 404);
  requireProject(db, actor, unit.project_id);
  requireAction(actor, "change_status_direct");
  return applyDirect(db, actor, unit, estado, confirm, now, noResult(), "edit");
}

export interface BulkPatch {
  estado?: UnitStatus;
  confirm?: boolean;
  price?: { mode: "percent" | "amount"; value: number; roundTo?: number | null };
  typologyId?: string;
  custom?: { clave: string; value: unknown };
  ocultar?: boolean;
}

export function bulkUnits(db: Database, actor: Actor, unitIds: string[], patch: BulkPatch, now: Date): OpResult {
  if (!unitIds.length) throw new ServiceError("Seleccioná al menos una unidad.");
  const units = unitIds.map((id) => db.units.find((u) => u.id === id)).filter((u): u is Unit => Boolean(u));
  if (units.length !== unitIds.length) throw new ServiceError("Hay unidades que no existen.");
  const project = requireProject(db, actor, units[0].project_id);
  if (units.some((u) => u.project_id !== project.id)) throw new ServiceError("Las unidades tienen que ser del mismo proyecto.");
  if (patch.price) requireAction(actor, "edit_prices");
  if (patch.estado || patch.ocultar) requireAction(actor, "change_status_direct");
  if (patch.typologyId || patch.custom) requireAction(actor, "edit_units");
  const result = noResult();
  const changeSetId = uid();
  let count = 0;
  const list = publicCashList(db, project.id);
  if (patch.price && list) {
    for (const unit of units) {
      const current = resolveUnitPrice(unit.id, list, db.price_lists, db.unit_prices);
      if (current == null) continue;
      const next = adjustPrice(current, patch.price.mode, patch.price.value, patch.price.roundTo);
      setPrice(db, actor, project, unit, next, now, changeSetId, "bulk");
      count += 1;
    }
  }
  if (patch.estado) {
    for (const unit of units) {
      if (unit.estado === patch.estado) continue;
      applyDirect(db, actor, unit, patch.estado, Boolean(patch.confirm), now, result, "bulk");
      count += 1;
    }
  }
  if (patch.ocultar) {
    for (const unit of units) {
      if (unit.estado === "oculta") continue;
      applyDirect(db, actor, unit, "oculta", true, now, result, "bulk");
      count += 1;
    }
  }
  if (patch.typologyId) {
    for (const unit of units) {
      const before = unit.typology_id;
      unit.typology_id = patch.typologyId;
      unit.version += 1;
      unit.updated_at = now.toISOString();
      unit.updated_by = actor.id;
      logChange(db, {
        project_id: project.id, change_set_id: changeSetId, user_id: actor.id, requested_by: null, request_id: null,
        entidad: "unit", entidad_id: unit.id, campo: "typology_id", valor_anterior: before, valor_nuevo: patch.typologyId, origen: "bulk",
      }, now);
      count += 1;
    }
  }
  if (patch.custom) {
    const field = db.custom_field_definitions.find((f) => f.project_id === project.id && f.clave === patch.custom!.clave && !f.archivado);
    if (!field) throw new ServiceError("No encontramos ese campo.");
    const value = normalizeCustom(field, patch.custom.value);
    for (const unit of units) {
      const before = unit.custom_values[field.clave] ?? null;
      unit.custom_values[field.clave] = value;
      unit.version += 1;
      logChange(db, {
        project_id: project.id, change_set_id: changeSetId, user_id: actor.id, requested_by: null, request_id: null,
        entidad: "unit", entidad_id: unit.id, campo: `custom:${field.clave}`, valor_anterior: before, valor_nuevo: value, origen: "bulk",
      }, now);
      count += 1;
    }
  }
  db.change_sets.push({
    id: changeSetId,
    project_id: project.id,
    user_id: actor.id,
    tipo: "bulk",
    descripcion: describeBulk(patch),
    cantidad: count,
    deshecho_por: null,
    created_at: now.toISOString(),
  });
  result.extra = { changeSetId, cantidad: count };
  return result;
}

function describeBulk(patch: BulkPatch): string {
  if (patch.price?.mode === "percent") return `Precio ${patch.price.value > 0 ? "+" : ""}${patch.price.value} %`;
  if (patch.price?.mode === "amount") return `Precio ${patch.price.value > 0 ? "+" : ""}${patch.price.value} USD`;
  if (patch.estado) return `Estado → ${patch.estado}`;
  if (patch.ocultar) return "Ocultar unidades";
  if (patch.custom) return `Campo ${patch.custom.clave}`;
  if (patch.typologyId) return "Asignar tipología";
  return "Edición masiva";
}

export function importUnits(
  db: Database,
  actor: Actor,
  projectId: string,
  csv: string,
  apply: boolean,
  hideMissing: boolean,
  now: Date,
): OpResult {
  const project = requireProject(db, actor, projectId);
  requireAction(actor, apply ? "import_units" : "import_units");
  const fields = db.custom_field_definitions.filter((f) => f.project_id === projectId);
  const parsed = readImportRows(csv, fields);
  if (parsed.headerError) throw new ServiceError(parsed.headerError);
  const list = publicCashList(db, projectId);
  const priceByUnit = new Map<string, number>();
  if (list) {
    for (const unit of db.units.filter((u) => u.project_id === projectId)) {
      const price = resolveUnitPrice(unit.id, list, db.price_lists, db.unit_prices);
      if (price != null) priceByUnit.set(unit.id, price);
    }
  }
  const typologyName = new Map(db.typologies.filter((t) => t.project_id === projectId).map((t) => [t.id, t.nombre]));
  const floors = db.floors.filter((f) => f.project_id === projectId);
  const floorLabel = new Map(floors.map((f) => [f.id, f.nombre]));
  const effectiveUnits = db.units.filter((u) => u.project_id === projectId).map((u) => effectiveUnit(db, u));
  const preview = previewImport(parsed.rows, effectiveUnits, priceByUnit, typologyName, floorLabel);
  const result = noResult();
  result.extra = { preview };
  if (!apply) return result;
  const changeSetId = uid();
  let applied = 0;
  for (const row of parsed.rows) {
    if (row.errors.length) continue;
    const diff = preview.rows.find((d) => d.line === row.line);
    if (!diff || diff.kind === "unchanged" || diff.kind === "error") continue;
    if (diff.kind === "new") {
      const created = createImportedUnit(db, actor, project, row.values, row.codigo, now, changeSetId);
      if (created) applied += 1;
      continue;
    }
    const unit = db.units.find((u) => u.project_id === projectId && u.codigo.toLowerCase() === row.codigo.toLowerCase());
    if (!unit) continue;
    applyImportedValues(db, actor, project, unit, row.values, now, changeSetId);
    applied += 1;
  }
  if (hideMissing) {
    const codes = new Set(parsed.rows.filter((r) => !r.errors.length).map((r) => r.codigo.toLowerCase()));
    for (const unit of db.units.filter((u) => u.project_id === projectId)) {
      if (!codes.has(unit.codigo.toLowerCase()) && unit.estado !== "oculta") {
        applyDirect(db, actor, unit, "oculta", true, now, result, "import");
      }
    }
  }
  db.change_sets.push({
    id: changeSetId,
    project_id: project.id,
    user_id: actor.id,
    tipo: "import",
    descripcion: `Importación CSV: ${applied} unidades`,
    cantidad: applied,
    deshecho_por: null,
    created_at: now.toISOString(),
  });
  result.extra = { preview, applied, changeSetId };
  return result;
}

function createImportedUnit(
  db: Database,
  actor: Actor,
  project: Project,
  values: Record<string, unknown>,
  codigo: string,
  now: Date,
  changeSetId: string,
): boolean {
  const floors = db.floors.filter((f) => f.project_id === project.id);
  const piso = String(values.piso ?? "");
  const floor = floors.find((f) => f.nombre.toLowerCase() === piso.toLowerCase() || String(f.numero) === piso);
  if (!floor) throw new ServiceError(`No encontramos el piso «${piso || "?"}» para la unidad nueva ${codigo}.`);
  const typName = String(values.tipologia ?? "");
  const typology = db.typologies.find((t) => t.project_id === project.id && t.nombre.toLowerCase() === typName.toLowerCase());
  const unit: Unit = {
    id: uid(),
    project_id: project.id,
    floor_id: floor.id,
    typology_id: typology?.id ?? null,
    codigo,
    tipo: "departamento",
    ambientes: null,
    dormitorios: null,
    banos: null,
    m2_cubiertos: null,
    m2_semicubiertos: null,
    m2_descubiertos: null,
    m2_totales: null,
    orientacion: null,
    vista: null,
    estado: (values.estado as UnitStatus) || "disponible",
    pending_request_id: null,
    reserved_by_user_id: null,
    reserved_lead_id: null,
    mostrar_precio: values.mostrar_precio !== false,
    destacada: false,
    notas_internas: null,
    custom_values: {},
    overrides: [],
    version: 1,
    updated_at: now.toISOString(),
    updated_by: actor.id,
  };
  db.units.push(unit);
  applyImportedValues(db, actor, project, unit, values, now, changeSetId);
  logChange(db, {
    project_id: project.id, change_set_id: changeSetId, user_id: actor.id, requested_by: null, request_id: null,
    entidad: "unit", entidad_id: unit.id, campo: "codigo", valor_anterior: null, valor_nuevo: codigo, origen: "import",
  }, now);
  return true;
}

function applyImportedValues(
  db: Database,
  actor: Actor,
  project: Project,
  unit: Unit,
  values: Record<string, unknown>,
  now: Date,
  changeSetId: string,
) {
  const typology = typologyOf(db, unit);
  for (const field of AREA_FIELDS) {
    if (values[field] == null) continue;
    const next = Number(values[field]);
    const inherited = typology ? effectiveNumber(unit, typology, field) : unit[field];
    if (inherited != null && Math.abs(inherited - next) < 0.001 && typology && Math.abs(typology[field] - next) < 0.001) {
      continue;
    }
    const before = unit[field];
    unit[field] = next;
    if (!unit.overrides.includes(field)) unit.overrides.push(field);
    if (before !== next) {
      logChange(db, {
        project_id: project.id, change_set_id: changeSetId, user_id: actor.id, requested_by: null, request_id: null,
        entidad: "unit", entidad_id: unit.id, campo: field, valor_anterior: before, valor_nuevo: next, origen: "import",
      }, now);
    }
  }
  if (typeof values.orientacion === "string") unit.orientacion = values.orientacion;
  if (typeof values.mostrar_precio === "boolean") unit.mostrar_precio = values.mostrar_precio;
  if (values.estado && values.estado !== unit.estado) {
    applyDirect(db, actor, unit, values.estado as UnitStatus, true, now, noResult(), "import");
  }
  if (values.precio_usd != null) setPrice(db, actor, project, unit, Number(values.precio_usd), now, changeSetId, "import");
  for (const [key, value] of Object.entries(values)) {
    if (!key.startsWith("custom:") || value == null) continue;
    const clave = key.slice("custom:".length);
    const before = unit.custom_values[clave] ?? null;
    if (before === value) continue;
    unit.custom_values[clave] = value;
    logChange(db, {
      project_id: project.id, change_set_id: changeSetId, user_id: actor.id, requested_by: null, request_id: null,
      entidad: "unit", entidad_id: unit.id, campo: key, valor_anterior: before, valor_nuevo: value, origen: "import",
    }, now);
  }
  const effective = effectiveUnit(db, unit);
  const areaError = validateAreas(effective.m2_cubiertos, effective.m2_totales);
  if (areaError) throw new ServiceError(`Unidad ${unit.codigo}: ${areaError}`);
  unit.updated_at = now.toISOString();
  unit.updated_by = actor.id;
}

export function exportCsv(db: Database, actor: Actor, projectId: string): string {
  const project = requireProject(db, actor, projectId);
  if (!can(actor, "export_units")) throw new ServiceError("No tenés permiso para exportar.", 403);
  const includePrices = can(actor, "edit_prices") || actor.role === "org_admin" || actor.role === "superadmin" || actor.role === "viewer";
  const units = db.units.filter((u) => u.project_id === project.id).map((u) => effectiveUnit(db, u));
  const list = publicCashList(db, project.id);
  const priceByUnit = new Map<string, number>();
  if (includePrices && list) {
    for (const unit of units) {
      const price = resolveUnitPrice(unit.id, list, db.price_lists, db.unit_prices);
      if (price != null) priceByUnit.set(unit.id, price);
    }
  }
  const typologyName = new Map(db.typologies.map((t) => [t.id, t.nombre]));
  const floorLabel = new Map(db.floors.map((f) => [f.id, f.nombre]));
  const floorBuilding = new Map(db.floors.map((f) => [f.id, f.building_id]));
  const buildingName = new Map(db.buildings.map((b) => [b.id, b.nombre]));
  return exportUnitsCsv({
    units,
    priceByUnit,
    typologyName,
    floorLabel,
    buildingName,
    floorBuilding,
    fields: db.custom_field_definitions.filter((f) => f.project_id === project.id),
    includePrices,
  });
}

export function createRequest(
  db: Database,
  actor: Actor,
  input: {
    unitId: string;
    tipo: RequestTipo;
    leadId?: string | null;
    newLead?: { nombre: string; email?: string; telefono?: string };
    comentario?: string;
    montoSena?: number | null;
    now: Date;
  },
): OpResult {
  requireAction(actor, "request_status");
  const unit = db.units.find((u) => u.id === input.unitId);
  if (!unit) throw new ServiceError("No encontramos la unidad.", 404);
  const project = requireProject(db, actor, unit.project_id);
  let lead = input.leadId ? db.leads.find((l) => l.id === input.leadId && l.project_id === project.id) ?? null : null;
  if (!lead && input.newLead?.nombre) {
    const created = submitLead(db, {
      projectId: project.id,
      unitId: unit.id,
      nombre: input.newLead.nombre,
      email: input.newLead.email,
      telefono: input.newLead.telefono,
      mensaje: input.comentario,
      canal: "form",
      utm: {},
      now: input.now,
    });
    lead = created.lead;
    lead.assigned_to = actor.id;
    lead.fuente = lead.fuente || "Vendedor";
  }
  const pending = db.status_change_requests.find((r) => r.unit_id === unit.id && r.estado === "pending") ?? null;
  const created = createStatusRequest({
    unit,
    actor,
    tipo: input.tipo,
    now: input.now,
    expiryHours: project.settings.request_expiry_hours,
    leadRequired: project.settings.lead_required_for_request,
    pending,
    lead,
    comentario: input.comentario,
    montoSena: input.montoSena,
    priceListId: publicCashList(db, project.id)?.id ?? null,
  });
  if (!created.ok) throw new ServiceError(created.error, 409);
  db.status_change_requests.push(created.value.request);
  db.status_change_request_events.push(created.value.event);
  Object.assign(unit, created.value.unitPatch);
  const result = noResult();
  pushNote(db, result, approverIds(db, project), project, {
    tipo: "status_request",
    titulo: `Nueva solicitud: ${input.tipo === "reserve" ? "reservar" : input.tipo === "sell" ? "vender" : "liberar"} ${unit.codigo}`,
    cuerpo: `${actor.nombre} envió la solicitud. Vence en ${project.settings.request_expiry_hours} h. La unidad sigue ${publicStatus(unit, project.settings.public_pending_display) === "consultar" ? "en consulta" : "con su estado oficial"} en el showroom.`,
    entidad: "status_change_request",
    entidadId: created.value.request.id,
    now: input.now,
  });
  result.extra = { requestId: created.value.request.id };
  return result;
}

function loadRequest(db: Database, requestId: string) {
  const request = db.status_change_requests.find((r) => r.id === requestId);
  if (!request) throw new ServiceError("No encontramos la solicitud.", 404);
  const unit = db.units.find((u) => u.id === request.unit_id);
  if (!unit) throw new ServiceError("La unidad de la solicitud ya no está.", 404);
  return { request, unit };
}

export function approveRequest(db: Database, actor: Actor, requestId: string, comentario: string | undefined, force: boolean, now: Date): OpResult {
  const { request, unit } = loadRequest(db, requestId);
  const project = requireProject(db, actor, request.project_id);
  requireAction(actor, "approve_request");
  const decided = approveStatusRequest({ request, unit, actor, now, comentario, force });
  if (!decided.ok) throw new ServiceError(decided.error, 409, { conflict: decided.conflict });
  const ridx = db.status_change_requests.findIndex((r) => r.id === request.id);
  db.status_change_requests[ridx] = decided.value.request;
  const uidx = db.units.findIndex((u) => u.id === unit.id);
  db.units[uidx] = decided.value.unit;
  db.status_change_request_events.push(decided.value.event);
  if (decided.value.leadEstado && request.lead_id) {
    const lead = db.leads.find((l) => l.id === request.lead_id);
    if (lead) {
      lead.estado = decided.value.leadEstado;
      lead.updated_at = now.toISOString();
    }
  }
  logChange(db, {
    project_id: project.id,
    change_set_id: null,
    user_id: actor.id,
    requested_by: request.requested_by,
    request_id: request.id,
    entidad: "unit",
    entidad_id: unit.id,
    campo: "estado",
    valor_anterior: unit.estado,
    valor_nuevo: decided.value.unit.estado,
    origen: "request_approved",
  }, now);
  const result = noResult();
  const seller = db.profiles.find((p) => p.id === request.requested_by);
  pushNote(db, result, [request.requested_by], project, {
    tipo: "approved",
    titulo: `Aprobaron tu solicitud de la ${unit.codigo}`,
    cuerpo: `${actor.nombre} aprobó el cambio a ${decided.value.unit.estado}.`,
    entidad: "status_change_request",
    entidadId: request.id,
    now,
  });
  void seller;
  return result;
}

export function rejectRequest(db: Database, actor: Actor, requestId: string, comentario: string, now: Date): OpResult {
  const { request, unit } = loadRequest(db, requestId);
  const project = requireProject(db, actor, request.project_id);
  requireAction(actor, "approve_request");
  const decided = rejectStatusRequest({ request, unit, actor, now, comentario });
  if (!decided.ok) throw new ServiceError(decided.error);
  db.status_change_requests[db.status_change_requests.findIndex((r) => r.id === request.id)] = decided.value.request;
  db.units[db.units.findIndex((u) => u.id === unit.id)] = decided.value.unit;
  db.status_change_request_events.push(decided.value.event);
  const result = noResult();
  pushNote(db, result, [request.requested_by], project, {
    tipo: "rejected",
    titulo: `Rechazaron tu solicitud de la ${unit.codigo}`,
    cuerpo: comentario.trim(),
    entidad: "status_change_request",
    entidadId: request.id,
    now,
  });
  return result;
}

export function cancelRequest(db: Database, actor: Actor, requestId: string, comentario: string | undefined, now: Date): OpResult {
  const { request, unit } = loadRequest(db, requestId);
  requireProject(db, actor, request.project_id);
  const decided = cancelStatusRequest({ request, unit, actor, now, comentario });
  if (!decided.ok) throw new ServiceError(decided.error, 403);
  db.status_change_requests[db.status_change_requests.findIndex((r) => r.id === request.id)] = decided.value.request;
  db.units[db.units.findIndex((u) => u.id === unit.id)] = decided.value.unit;
  db.status_change_request_events.push(decided.value.event);
  return noResult();
}

export function extendRequest(db: Database, actor: Actor, requestId: string, hours: number, now: Date): OpResult {
  const { request, unit } = loadRequest(db, requestId);
  requireProject(db, actor, request.project_id);
  const decided = extendStatusRequest({ request, unit, actor, now, hours });
  if (!decided.ok) throw new ServiceError(decided.error, 403);
  db.status_change_requests[db.status_change_requests.findIndex((r) => r.id === request.id)] = decided.value.request;
  db.status_change_request_events.push(decided.value.event);
  return noResult();
}

export function undoChange(db: Database, actor: Actor, changeLogId: string, force: boolean, now: Date): OpResult {
  requireAction(actor, "undo");
  const entry = db.change_log.find((c) => c.id === changeLogId);
  if (!entry) throw new ServiceError("No encontramos ese cambio.", 404);
  requireProject(db, actor, entry.project_id);
  const ids = entry.change_set_id
    ? db.change_log.filter((c) => c.change_set_id === entry.change_set_id).map((c) => c.id)
    : [entry.id];
  const result = noResult();
  for (const id of ids) {
    const row = db.change_log.find((c) => c.id === id)!;
    const later = db.change_log.filter(
      (c) =>
        c.id !== row.id &&
        c.entidad === row.entidad &&
        c.entidad_id === row.entidad_id &&
        c.campo === row.campo &&
        c.created_at > row.created_at,
    );
    if (later.length && !force) {
      throw new ServiceError("Ese campo se modificó de nuevo después. Confirmá si igual querés volver al valor anterior.", 409, {
        conflict: true,
      });
    }
    applyUndoValue(db, actor, row, now);
  }
  if (entry.change_set_id) {
    const set = db.change_sets.find((s) => s.id === entry.change_set_id);
    if (set) set.deshecho_por = actor.id;
  }
  return result;
}

function applyUndoValue(db: Database, actor: Actor, row: ChangeLog, now: Date) {
  const unit = db.units.find((u) => u.id === row.entidad_id);
  if (!unit || row.entidad !== "unit") throw new ServiceError("Por ahora solo se puede deshacer un cambio de unidad.");
  const project = db.projects.find((p) => p.id === unit.project_id)!;
  if (row.campo === "precio_usd") {
    setPrice(db, actor, project, unit, row.valor_anterior as number | null, now, null, "undo");
    return;
  }
  if (row.campo === "estado") {
    applyDirect(db, actor, unit, row.valor_anterior as UnitStatus, true, now, noResult(), "undo");
    return;
  }
  if (row.campo.startsWith("custom:")) {
    const clave = row.campo.slice("custom:".length);
    unit.custom_values[clave] = row.valor_anterior;
  } else if (row.campo in unit) {
    (unit as unknown as Record<string, unknown>)[row.campo] = row.valor_anterior;
  }
  unit.version += 1;
  unit.updated_at = now.toISOString();
  unit.updated_by = actor.id;
  logChange(db, {
    project_id: unit.project_id, change_set_id: null, user_id: actor.id, requested_by: null, request_id: null,
    entidad: "unit", entidad_id: unit.id, campo: row.campo, valor_anterior: row.valor_nuevo, valor_nuevo: row.valor_anterior, origen: "undo",
  }, now);
}

export function revertInherit(db: Database, actor: Actor, unitId: string, field: InheritedField, now: Date): OpResult {
  const unit = db.units.find((u) => u.id === unitId);
  if (!unit) throw new ServiceError("No encontramos la unidad.", 404);
  requireProject(db, actor, unit.project_id);
  requireAction(actor, "edit_units");
  const next = clearOverride(unit, typologyOf(db, unit), field);
  Object.assign(unit, next, { version: unit.version + 1, updated_at: now.toISOString(), updated_by: actor.id });
  return noResult();
}

export function createField(
  db: Database,
  actor: Actor,
  projectId: string,
  input: { nombre: string; tipo: FieldType; opciones?: string[]; publico?: boolean; en_ficha?: boolean; en_filtro?: boolean; unidad_medida?: string | null; ayuda?: string | null },
  now: Date,
): OpResult {
  const project = requireProject(db, actor, projectId);
  requireAction(actor, "edit_custom_fields");
  const clave = input.nombre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  if (!clave) throw new ServiceError("El campo necesita un nombre.");
  if (db.custom_field_definitions.some((f) => f.project_id === projectId && f.clave === clave && !f.archivado)) {
    throw new ServiceError("Ya hay un campo con ese nombre.");
  }
  const orden = db.custom_field_definitions.filter((f) => f.project_id === projectId).length + 1;
  db.custom_field_definitions.push({
    id: uid(),
    project_id: project.id,
    clave,
    nombre: input.nombre.trim(),
    tipo: input.tipo,
    unidad_medida: input.unidad_medida ?? null,
    opciones: input.opciones ?? [],
    aplica_a: "unit",
    obligatorio: false,
    publico: input.publico !== false,
    en_ficha: input.en_ficha !== false,
    en_filtro: Boolean(input.en_filtro),
    orden,
    ayuda: input.ayuda ?? null,
    archivado: false,
    });
  void now;
  return noResult();
}

export function archiveField(db: Database, actor: Actor, fieldId: string): OpResult {
  const field = db.custom_field_definitions.find((f) => f.id === fieldId);
  if (!field) throw new ServiceError("No encontramos el campo.", 404);
  requireProject(db, actor, field.project_id);
  requireAction(actor, "edit_custom_fields");
  field.archivado = true;
  return noResult();
}

export function createCharacteristic(db: Database, actor: Actor, projectId: string, nombre: string): OpResult {
  const project = requireProject(db, actor, projectId);
  requireAction(actor, "edit_custom_fields");
  db.characteristics.push({
    id: uid(),
    project_id: project.id,
    nombre: nombre.trim(),
    icono: "check",
    orden: db.characteristics.filter((c) => c.project_id === projectId).length + 1,
    archivado: false,
  });
  return noResult();
}

export function saveOverlays(
  db: Database,
  actor: Actor,
  projectId: string,
  overlays: Database["overlays"],
  now: Date,
): OpResult {
  const project = requireProject(db, actor, projectId);
  requireAction(actor, "edit_overlays");
  const previous = db.overlays.filter((o) => o.project_id === projectId && o.contenedor === "facade");
  for (const overlay of overlays) {
    if (overlay.puntos.some((p) => p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1)) {
      throw new ServiceError("Las zonas tienen que quedar dentro de la imagen.");
    }
  }
  db.overlays = db.overlays.filter((o) => !(o.project_id === projectId && o.contenedor === "facade"));
  for (const overlay of overlays) {
    db.overlays.push({ ...overlay, project_id: projectId, contenedor: "facade", estado: "published" });
  }
  logChange(db, {
    project_id: project.id, change_set_id: null, user_id: actor.id, requested_by: null, request_id: null,
    entidad: "overlay", entidad_id: project.id, campo: "fachada", valor_anterior: previous, valor_nuevo: overlays, origen: "edit",
  }, now);
  return noResult();
}

export function updateLead(
  db: Database,
  actor: Actor,
  leadId: string,
  patch: { estado?: Lead["estado"]; assigned_to?: string | null; nota?: string },
  now: Date,
): OpResult {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) throw new ServiceError("No encontramos el lead.", 404);
  requireProject(db, actor, lead.project_id);
  if (!canSeeLead(actor, lead)) throw new ServiceError("No podés ver este lead.", 403);
  requireAction(actor, "edit_leads");
  if (actor.role === "seller" && lead.assigned_to !== actor.id && !actor.permisos.sees_all_leads) {
    throw new ServiceError("Solo podés editar los leads asignados a vos.", 403);
  }
  if (patch.estado && patch.estado !== lead.estado) {
    db.lead_activities.push({
      id: uid(), lead_id: lead.id, tipo: "cambio_estado", detalle: `${lead.estado} → ${patch.estado}`, user_id: actor.id, created_at: now.toISOString(),
    });
    lead.estado = patch.estado;
  }
  if (patch.assigned_to !== undefined && actor.role !== "seller") {
    lead.assigned_to = patch.assigned_to;
    db.lead_activities.push({
      id: uid(), lead_id: lead.id, tipo: "asignacion", detalle: "Cambió el vendedor asignado", user_id: actor.id, created_at: now.toISOString(),
    });
  }
  if (patch.nota?.trim()) {
    db.lead_activities.push({
      id: uid(), lead_id: lead.id, tipo: "nota", detalle: patch.nota.trim(), user_id: actor.id, created_at: now.toISOString(),
    });
  }
  lead.updated_at = now.toISOString();
  return noResult();
}

export function updateProject(
  db: Database,
  actor: Actor,
  projectId: string,
  patch: Partial<Pick<Project, "nombre" | "descripcion" | "direccion" | "contacto" | "fecha_entrega">> & { settings?: Partial<Project["settings"]> },
): OpResult {
  const project = requireProject(db, actor, projectId);
  requireAction(actor, "edit_project");
  if (patch.nombre) project.nombre = patch.nombre;
  if (patch.descripcion != null) project.descripcion = patch.descripcion;
  if (patch.direccion != null) project.direccion = patch.direccion;
  if (patch.fecha_entrega !== undefined) project.fecha_entrega = patch.fecha_entrega;
  if (patch.contacto) project.contacto = { ...project.contacto, ...patch.contacto };
  if (patch.settings) {
    if (patch.settings.request_expiry_hours != null) {
      const hours = patch.settings.request_expiry_hours;
      if (hours < 1 || hours > 24 * 7) throw new ServiceError("El vencimiento tiene que estar entre 1 hora y 7 días.");
    }
    project.settings = { ...project.settings, ...patch.settings };
  }
  project.updated_at = new Date().toISOString();
  return noResult();
}

export function saveIntegration(
  db: Database,
  actor: Actor,
  projectId: string,
  tipo: "tokko" | "webhook",
  config: Database["integrations"][number]["config"],
): OpResult {
  const project = requireProject(db, actor, projectId);
  requireAction(actor, "manage_integrations");
  const row = db.integrations.find((i) => i.project_id === project.id && i.tipo === tipo);
  if (!row) throw new ServiceError("No encontramos la integración.", 404);
  const next = { ...row.config, ...config };
  if (tipo === "tokko" && config.api_key === undefined) next.api_key = row.config.api_key;
  if (typeof config.api_key === "string" && config.api_key.includes("•")) next.api_key = row.config.api_key;
  row.config = next;
  row.estado = next.enabled ? row.estado : "idle";
  return noResult();
}

export function addMedia(
  db: Database,
  actor: Actor,
  input: {
    projectId: string;
    nombre: string;
    url: string;
    variantes: { nombre: string; url: string; ancho: number }[];
    peso: number;
    ancho: number | null;
    alto: number | null;
    aviso: string | null;
    carpeta: string;
    unitId?: string | null;
    typologyId?: string | null;
    rol?: "render" | "plano" | "portada" | "fachada";
    now: Date;
  },
): OpResult {
  requireProject(db, actor, input.projectId);
  requireAction(actor, "manage_media");
  const id = uid();
  db.media.push({
    id,
    project_id: input.projectId,
    tipo: input.rol === "plano" ? "plano" : "imagen",
    carpeta: input.carpeta,
    nombre: input.nombre,
    url: input.url,
    variantes: input.variantes,
    peso: input.peso,
    ancho: input.ancho,
    alto: input.alto,
    estado_proceso: "listo",
    aviso: input.aviso,
    tags: [input.carpeta],
    created_at: input.now.toISOString(),
  });
  if (input.unitId) {
    db.media_links.push({ id: uid(), media_id: id, entidad: "unit", entidad_id: input.unitId, rol: input.rol ?? "render", orden: 1 });
  } else if (input.typologyId) {
    db.media_links.push({ id: uid(), media_id: id, entidad: "typology", entidad_id: input.typologyId, rol: input.rol ?? "render", orden: 1 });
  }
  return noResult();
}

export function markRead(db: Database, actor: Actor, notificationId: string | "all"): OpResult {
  for (const note of db.notifications) {
    if (note.user_id !== actor.id || note.canal !== "panel") continue;
    if (notificationId === "all" || note.id === notificationId) note.leida = true;
  }
  return noResult();
}

export function inviteUser(
  db: Database,
  actor: Actor,
  projectId: string,
  input: { email: string; nombre: string; role: Role; userId?: string },
): { result: OpResult; userId: string } {
  const project = requireProject(db, actor, projectId);
  requireAction(actor, "invite_users");
  if (input.role === "superadmin") throw new ServiceError("Solo Ad Astra puede crear superadmins.", 403);
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new ServiceError("El email no es válido.");
  let profile = db.profiles.find((p) => p.email.toLowerCase() === email);
  if (!profile) {
    profile = { id: input.userId || uid(), nombre: input.nombre.trim() || email, email, telefono: null, ultimo_acceso: null };
    db.profiles.push(profile);
  }
  if (db.memberships.some((m) => m.user_id === profile!.id && m.organization_id === project.organization_id && m.estado !== "suspended")) {
    throw new ServiceError("Esa persona ya está en la organización.");
  }
  db.memberships.push({
    id: uid(),
    user_id: profile.id,
    organization_id: project.organization_id,
    role: input.role,
    permisos: { can_edit_prices: false, sees_all_leads: false, sees_metrics: input.role !== "seller" },
    estado: "active",
  });
  return { result: noResult(), userId: profile.id };
}

export function cashPrice(db: Database, unit: Unit): number | null {
  const list = publicCashList(db, unit.project_id);
  if (!list) return null;
  return resolveUnitPrice(unit.id, list, db.price_lists, db.unit_prices);
}

export function financedQuote(db: Database, unit: Unit) {
  const list = db.price_lists.find((l) => l.project_id === unit.project_id && l.regla);
  const plan = list ? db.payment_plans.find((p) => p.price_list_id === list.id) : undefined;
  if (!list || !plan) return null;
  const precio = resolveUnitPrice(unit.id, list, db.price_lists, db.unit_prices);
  if (precio == null) return null;
  return { list: list.nombre, plan: plan.nombre, quote: quoteUnit(precio, plan), legal: plan.texto_legal, indice: plan.indice_leyenda };
}

export function dueJobs(db: Database, now: Date): DeliveryJob[] {
  const jobs: DeliveryJob[] = [];
  for (const delivery of db.integration_deliveries) {
    if (delivery.estado !== "pendiente") continue;
    if (delivery.next_retry_at && new Date(delivery.next_retry_at).getTime() > now.getTime()) continue;
    const integration = db.integrations.find((i) => i.id === delivery.integration_id);
    const lead = db.leads.find((l) => l.id === delivery.lead_id);
    const project = integration ? db.projects.find((p) => p.id === integration.project_id) : undefined;
    if (!integration?.config.enabled || !lead || !project) continue;
    const unit = lead.unit_id ? db.units.find((u) => u.id === lead.unit_id) ?? null : null;
    if (integration.tipo === "tokko" && integration.config.api_key && integration.config.development_id) {
      jobs.push({
        integrationId: integration.id,
        leadId: lead.id,
        tipo: "tokko",
        url: tokkoUrl(integration.config.api_key),
        body: buildWebcontactBody({
          lead,
          unit,
          projectName: project.nombre,
          developmentId: integration.config.development_id,
        }),
      });
    }
    if (integration.tipo === "webhook" && integration.config.url) {
      jobs.push({
        integrationId: integration.id,
        leadId: lead.id,
        tipo: "webhook",
        url: integration.config.url,
        secret: integration.config.secret,
        body: {
          event: "lead.created",
          project: { id: project.id, nombre: project.nombre },
          unit: unit ? { id: unit.id, codigo: unit.codigo } : null,
          lead,
        },
      });
    }
  }
  return jobs;
}

export { hoursLeftLabel, pendingBadge, publicStatus };
