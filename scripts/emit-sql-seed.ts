import fs from "fs";
import path from "path";
import { DEMO_USERS, buildSeed } from "../src/lib/demo/seed";
import type { Database } from "../src/lib/domain/types";

const now = new Date();
const db = buildSeed(now);

function relTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 2) return "now()";
  if (seconds < 0) return `now() - interval '${Math.abs(seconds)} seconds'`;
  return `now() + interval '${seconds} seconds'`;
}

const JSON_COLS = new Set([
  "permisos",
  "contacto",
  "settings",
  "custom_values",
  "regla",
  "refuerzos",
  "variantes",
  "puntos",
  "utm",
  "props",
  "detalle",
  "config",
  "opciones",
  "redes",
  "marca",
  "valor_anterior",
  "valor_nuevo",
]);
const TEXT_ARRAYS = new Set(["overrides", "tags", "idiomas", "monedas"]);
const TIME_COLS = new Set([
  "created_at",
  "updated_at",
  "ultimo_acceso",
  "expires_at",
  "decided_at",
  "ts",
  "ultimo_envio",
  "next_retry_at",
  "vigente_desde",
  "vigente_hasta",
]);

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlValue(key: string, value: unknown): string {
  if (value == null) return "null";
  if (JSON_COLS.has(key)) return `${lit(JSON.stringify(value))}::jsonb`;
  if (TIME_COLS.has(key) && typeof value === "string") return relTime(value);
  if (key === "fecha_entrega" && typeof value === "string") return `${lit(value)}::date`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "string") return lit(value);
  if (Array.isArray(value) && TEXT_ARRAYS.has(key)) {
    if (!value.length) return "'{}'::text[]";
    return `array[${value.map((v) => lit(String(v))).join(", ")}]::text[]`;
  }
  if (typeof value === "object") return `${lit(JSON.stringify(value))}::jsonb`;
  return "null";
}

function insert(table: string, rows: object[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0] as Record<string, unknown>);
  const values = rows
    .map((row) => {
      const record = row as Record<string, unknown>;
      return `  (${cols.map((col) => sqlValue(col, record[col])).join(", ")})`;
    })
    .join(",\n");
  return `insert into public.${table} (${cols.join(", ")})\nvalues\n${values};\n\n`;
}

const units = db.units.map((unit) => ({
  ...unit,
  pending_request_id: null,
  reserved_lead_id: null,
}));

const chunks: string[] = [];
chunks.push(`-- Datos demo de ALBA. Se regenera con npm run seed:sql.
-- Contraseña de todos los usuarios: AdAstra2026!
-- Las fechas quedan relativas a now() para que las solicitudes sigan vigentes.

`);

const authRows = DEMO_USERS.map(
  (user) => `  (
    '00000000-0000-0000-0000-000000000000',
    '${user.id}',
    'authenticated',
    'authenticated',
    '${user.email}',
    extensions.crypt('AdAstra2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    ${lit(JSON.stringify({ nombre: user.nombre }))}::jsonb,
    now(),
    now(),
    '',
    0,
    '',
    false,
    false
  )`,
).join(",\n");

chunks.push(`insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  email_change_token_current, email_change_confirm_status, reauthentication_token,
  is_sso_user, is_anonymous
) values
${authRows};

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
${DEMO_USERS.map(
  (user) => `  (
    gen_random_uuid(),
    '${user.id}',
    '${user.id}',
    ${lit(JSON.stringify({ sub: user.id, email: user.email }))}::jsonb,
    'email',
    now(), now(), now()
  )`,
).join(",\n")};

`);

const tables: [string, object[]][] = [
  ["organizations", db.organizations],
  ["profiles", db.profiles],
  ["memberships", db.memberships],
  ["projects", db.projects],
  ["buildings", db.buildings],
  ["floors", db.floors],
  ["typologies", db.typologies],
  ["custom_field_definitions", db.custom_field_definitions],
  ["characteristics", db.characteristics],
  ["entity_characteristics", db.entity_characteristics],
  ["price_lists", db.price_lists],
  ["payment_plans", db.payment_plans],
  ["units", units],
  ["media", db.media],
  ["media_links", db.media_links],
  ["overlays", db.overlays],
  ["leads", db.leads],
  ["unit_prices", db.unit_prices],
  ["status_change_requests", db.status_change_requests],
  ["status_change_request_events", db.status_change_request_events],
  ["notifications", db.notifications],
  ["change_sets", db.change_sets],
  ["change_log", db.change_log],
  ["events", db.events],
  ["integrations", db.integrations],
  ["viewpoints", db.viewpoints],
  ["tours", db.tours],
  ["points_of_interest", db.points_of_interest],
  ["galleries", db.galleries],
];

for (const [table, rows] of tables) chunks.push(insert(table, rows));

const updates = db.units
  .filter((unit) => unit.pending_request_id || unit.reserved_lead_id)
  .map(
    (unit) =>
      `update public.units set pending_request_id = ${sqlValue("pending_request_id", unit.pending_request_id)}, reserved_lead_id = ${sqlValue("reserved_lead_id", unit.reserved_lead_id)} where id = '${unit.id}';`,
  );
chunks.push(updates.join("\n") + "\n");

const out = path.join(process.cwd(), "supabase", "seed.sql");
fs.writeFileSync(out, chunks.join(""));
console.log(`Escribí ${out} (${db.units.length} unidades, ${db.events.length} eventos)`);

void (0 as unknown as Database);
