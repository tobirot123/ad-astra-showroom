import type { Action } from "@/lib/domain/permissions-actions";
import type { Actor, Role } from "@/lib/domain/types";

export type { Action };

const ADMIN: Role[] = ["superadmin", "org_admin"];

/**
 * Matriz de la spec v4. Los permisos finos (⚙️) solo amplían al vendedor
 * o al usuario de solo lectura; nunca habilitan a un vendedor a cambiar
 * el estado oficial.
 */
export function can(
  actor: Pick<Actor, "role" | "permisos">,
  action: Action,
): boolean {
  const { role, permisos } = actor;
  const admin = ADMIN.includes(role);

  switch (action) {
    case "manage_org":
    case "create_project":
      return role === "superadmin";
    case "edit_project":
    case "edit_custom_fields":
    case "edit_structure":
    case "edit_overlays":
    case "edit_units":
    case "change_status_direct":
    case "approve_request":
    case "manage_media":
    case "import_units":
    case "invite_users":
    case "view_audit":
    case "undo":
    case "manage_integrations":
    case "publish":
      return admin;
    case "edit_prices":
      return admin || (role === "seller" && permisos.can_edit_prices);
    case "edit_leads":
      return admin || role === "seller";
    case "request_status":
      return role === "seller";
    case "cancel_request":
      return role === "seller" || admin;
    case "export_units":
      return admin || role === "seller" || role === "viewer";
    case "view_leads":
      if (admin || role === "seller") return true;
      return role === "viewer" && permisos.sees_all_leads;
    case "view_metrics":
      if (admin || role === "viewer") return true;
      return role === "seller" && permisos.sees_metrics;
    default:
      return false;
  }
}

export function canAccessProject(
  actor: Pick<Actor, "role" | "organization_id" | "project_ids">,
  project: { id: string; organization_id: string },
): boolean {
  if (actor.role !== "superadmin" && actor.organization_id !== project.organization_id) {
    return false;
  }
  if (actor.project_ids && !actor.project_ids.includes(project.id)) return false;
  return true;
}

/** Un vendedor ve el lead si está asignado a él, o si el admin le habilitó ver todos. */
export function canSeeLead(
  actor: Pick<Actor, "role" | "id" | "permisos">,
  lead: { assigned_to: string | null },
): boolean {
  if (!can(actor, "view_leads")) return false;
  if (actor.role === "org_admin" || actor.role === "superadmin") return true;
  if (actor.role === "viewer") return actor.permisos.sees_all_leads;
  if (actor.permisos.sees_all_leads) return true;
  return lead.assigned_to === actor.id;
}
