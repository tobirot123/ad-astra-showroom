import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { withDemo, usingSupabase, type DemoFile } from "@/lib/demo/store";
import type { Database } from "@/lib/domain/types";

export { usingSupabase };

export async function withDb<T>(fn: (db: Database) => T): Promise<T> {
  if (!usingSupabase()) return withDemo((file) => fn(file.db));
  return withSupabase(fn);
}

export async function withDemoFile<T>(fn: (file: DemoFile) => T): Promise<T> {
  if (usingSupabase()) throw new Error("Esta operación es solo del modo demo.");
  return withDemo(fn);
}

const ORDER: (keyof Database)[] = [
  "organizations",
  "profiles",
  "memberships",
  "projects",
  "project_members",
  "buildings",
  "floors",
  "typologies",
  "custom_field_definitions",
  "characteristics",
  "entity_characteristics",
  "price_lists",
  "payment_plans",
  "units",
  "media",
  "media_links",
  "overlays",
  "leads",
  "lead_activities",
  "unit_prices",
  "status_change_requests",
  "status_change_request_events",
  "notifications",
  "change_sets",
  "change_log",
  "events",
  "integrations",
  "integration_deliveries",
  "galleries",
  "tours",
  "points_of_interest",
  "translations",
  "brokers",
  "broker_projects",
  "quotations",
];

const CONFLICT: Partial<Record<keyof Database, string>> = {
  project_members: "membership_id,project_id",
  entity_characteristics: "entidad,entidad_id,characteristic_id",
  unit_prices: "unit_id,price_list_id",
  broker_projects: "broker_id,project_id",
};

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadAll(client: SupabaseClient): Promise<Database> {
  const db = {} as Database;
  for (const table of ORDER) {
    const { data, error } = await client.from(table).select("*");
    if (error) throw new Error(`No pudimos leer ${table}: ${error.message}`);
    db[table] = (data ?? []) as never;
  }
  return db;
}

function rowKey(table: keyof Database, row: Record<string, unknown>): string {
  if (table === "project_members") return `${row.membership_id}:${row.project_id}`;
  if (table === "entity_characteristics") return `${row.entidad}:${row.entidad_id}:${row.characteristic_id}`;
  if (table === "unit_prices") return `${row.unit_id}:${row.price_list_id}`;
  if (table === "broker_projects") return `${row.broker_id}:${row.project_id}`;
  return String(row.id);
}

const PHASES: (keyof Database)[][] = [
  [
    "organizations",
    "profiles",
    "memberships",
    "projects",
    "project_members",
    "buildings",
    "floors",
    "typologies",
    "custom_field_definitions",
    "characteristics",
    "price_lists",
    "payment_plans",
    "media",
    "overlays",
    "integrations",
    "notifications",
    "change_sets",
    "galleries",
    "tours",
    "points_of_interest",
    "translations",
    "brokers",
    "broker_projects",
  ],
  ["leads", "unit_prices", "media_links", "entity_characteristics"],
  ["status_change_requests", "status_change_request_events", "change_log", "lead_activities", "integration_deliveries", "quotations"],
];

async function persist(client: SupabaseClient, before: Database, after: Database) {
  for (const table of PHASES[0]) await upsert(client, table, after[table] as unknown as Record<string, unknown>[]);
  await upsert(
    client,
    "units",
    after.units.map((unit) => ({ ...unit, pending_request_id: null, reserved_lead_id: null })) as unknown as Record<string, unknown>[],
  );
  for (const table of PHASES[1]) await upsert(client, table, after[table] as unknown as Record<string, unknown>[]);
  for (const table of PHASES[2]) await upsert(client, table, after[table] as unknown as Record<string, unknown>[]);
  await upsert(client, "units", after.units as unknown as Record<string, unknown>[]);

  for (const table of [...ORDER].reverse()) {
    const prev = new Map((before[table] as unknown as Record<string, unknown>[]).map((row) => [rowKey(table, row), row]));
    const next = new Set((after[table] as unknown as Record<string, unknown>[]).map((row) => rowKey(table, row)));
    for (const [key, row] of prev) {
      if (next.has(key)) continue;
      if (table === "units") {
        await client.from("units").update({ pending_request_id: null, reserved_lead_id: null }).eq("id", row.id);
      }
      if (table === "status_change_requests") {
        await client.from("units").update({ pending_request_id: null }).eq("pending_request_id", row.id);
      }
      if (table === "leads") {
        await client.from("units").update({ reserved_lead_id: null }).eq("reserved_lead_id", row.id);
      }
      await remove(client, table, row);
    }
  }
}

async function upsert(client: SupabaseClient, table: keyof Database, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { error } = await client.from(table).upsert(rows, { onConflict: CONFLICT[table] ?? "id" });
  if (error) throw new Error(`No pudimos guardar ${table}: ${error.message}`);
}

async function remove(client: SupabaseClient, table: keyof Database, row: Record<string, unknown>) {
  let query = client.from(table).delete();
  if (table === "project_members") query = query.eq("membership_id", row.membership_id).eq("project_id", row.project_id);
  else if (table === "entity_characteristics") {
    query = query.eq("entidad", row.entidad).eq("entidad_id", row.entidad_id).eq("characteristic_id", row.characteristic_id);
  } else if (table === "unit_prices") query = query.eq("unit_id", row.unit_id).eq("price_list_id", row.price_list_id);
  else if (table === "broker_projects") query = query.eq("broker_id", row.broker_id).eq("project_id", row.project_id);
  else query = query.eq("id", row.id);
  const { error } = await query;
  if (error) throw new Error(`No pudimos borrar en ${table}: ${error.message}`);
}

async function withSupabase<T>(fn: (db: Database) => T): Promise<T> {
  const client = service();
  const before = await loadAll(client);
  const draft = structuredClone(before);
  const result = fn(draft);
  await persist(client, before, draft);
  return result;
}
