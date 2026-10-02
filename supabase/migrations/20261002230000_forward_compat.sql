-- Huecos para M2–M7. No cambia el showroom ni el panel de M1:
-- multi-torre y loteos, galerías, tours 360, puntos de interés,
-- idiomas y monedas, brokers, y cotizaciones.
-- Las tablas nuevas quedan vacías. Las columnas nuevas tienen default.

-- ---------------------------------------------------------------------------
-- Columnas y checks que hoy cerrarían el modelo
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists descripcion text not null default '',
  add column if not exists logo_url text;

alter table public.projects
  add column if not exists locale text not null default 'es',
  add column if not exists idiomas text[] not null default '{es}',
  add column if not exists monedas text[] not null default '{USD}',
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists redes jsonb not null default '{}'::jsonb;

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'projects'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ~* 'estado|moneda'
  loop
    execute format('alter table public.projects drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.projects
  add constraint projects_estado_check check (estado in ('draft', 'published', 'coming_soon')),
  add constraint projects_moneda_check check (moneda ~ '^[A-Z]{3}$');

alter table public.buildings
  add column if not exists parent_id uuid references public.buildings (id) on delete set null;

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'buildings'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%tipo%'
  loop
    execute format('alter table public.buildings drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.buildings
  add constraint buildings_tipo_check
  check (tipo in ('torre', 'etapa', 'manzana', 'loteo', 'casa', 'condominio', 'barrio'));

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'price_lists'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%moneda%'
  loop
    execute format('alter table public.price_lists drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.price_lists
  add constraint price_lists_moneda_check check (moneda ~ '^[A-Z]{3}$');

do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'integrations'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%tipo%'
  loop
    execute format('alter table public.integrations drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.integrations
  add constraint integrations_tipo_check
  check (tipo in ('tokko', 'webhook', 'kommo', 'meta_leadads', 'whatsapp', 'ga4', 'pixel'));

alter table public.units
  add column if not exists building_id uuid references public.buildings (id) on delete set null,
  add column if not exists tour_url text,
  add column if not exists operacion text not null default 'venta' check (operacion in ('venta', 'alquiler'));

alter table public.media
  add column if not exists titulo text,
  add column if not exists descripcion text not null default '';

-- ---------------------------------------------------------------------------
-- Tablas que M2–M4 van a llenar. M1 no las muestra.
-- ---------------------------------------------------------------------------

create table public.galleries (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null,
  slug text not null,
  descripcion text not null default '',
  entidad text not null default 'project' check (entidad in ('project', 'building', 'floor', 'unit', 'typology', 'amenity')),
  entidad_id uuid,
  orden int not null default 0,
  unique (project_id, slug)
);

create table public.tours (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  entidad text not null check (entidad in ('project', 'unit', 'typology', 'amenity', 'floor')),
  entidad_id uuid not null,
  proveedor text not null default 'url' check (proveedor in ('url', 'matterport', 'layama', '3dvista', 'pano2vr', 'luma', 'kuula')),
  url text not null,
  titulo text not null default '',
  orden int not null default 0
);

create table public.points_of_interest (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null,
  categoria text not null default 'otro',
  lat double precision,
  lng double precision,
  distancia_m int,
  descripcion text not null default '',
  orden int not null default 0
);

create table public.translations (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  entidad text not null,
  entidad_id uuid not null,
  campo text not null,
  locale text not null,
  valor text not null,
  unique (entidad, entidad_id, campo, locale)
);

create table public.brokers (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nombre text not null,
  slug text not null,
  marca jsonb not null default '{}'::jsonb,
  contacto jsonb not null default '{}'::jsonb,
  estado text not null default 'active' check (estado in ('active', 'suspended')),
  unique (organization_id, slug)
);

create table public.broker_projects (
  broker_id uuid not null references public.brokers (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  codigo text not null,
  activo boolean not null default true,
  primary key (broker_id, project_id),
  unique (codigo)
);

create table public.quotations (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  seller_id uuid references public.profiles (id) on delete set null,
  broker_id uuid references public.brokers (id) on delete set null,
  price_list_id uuid references public.price_lists (id) on delete set null,
  payment_plan_id uuid references public.payment_plans (id) on delete set null,
  moneda text not null default 'USD',
  precio double precision,
  detalle jsonb not null default '{}'::jsonb,
  estado text not null default 'draft' check (estado in ('draft', 'enviada', 'aceptada', 'vencida')),
  created_at timestamptz not null default now()
);

alter table public.media_links
  add column if not exists titulo text,
  add column if not exists descripcion text not null default '',
  add column if not exists gallery_id uuid references public.galleries (id) on delete set null;

alter table public.leads
  add column if not exists broker_id uuid references public.brokers (id) on delete set null;

alter table public.events
  add column if not exists broker_id uuid references public.brokers (id) on delete set null,
  add column if not exists pais text;

create index if not exists units_building_idx on public.units (building_id);
create index if not exists leads_broker_idx on public.leads (broker_id);
create index if not exists events_broker_idx on public.events (broker_id);
create index if not exists translations_lookup_idx on public.translations (project_id, locale, entidad, entidad_id);

create or replace view public.showroom_units with (security_invoker = false) as
select
  u.id,
  u.project_id,
  u.codigo,
  u.estado as estado_oficial,
  case
    when coalesce(p.settings ->> 'public_pending_display', 'available') = 'ask'
      and u.pending_request_id is not null then 'consultar'
    else u.estado
  end as estado_publico,
  u.ambientes,
  u.dormitorios,
  u.banos,
  u.m2_cubiertos,
  u.m2_totales,
  u.orientacion,
  u.vista,
  u.mostrar_precio,
  u.destacada,
  u.custom_values,
  u.typology_id,
  u.floor_id,
  u.building_id,
  u.tour_url,
  u.operacion
from public.units u
join public.projects p on p.id = u.project_id
where p.estado = 'published'
  and u.estado <> 'oculta';

grant select on public.showroom_units to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS. Misma idea que el resto: cada organización ve lo suyo.
-- ---------------------------------------------------------------------------

alter table public.galleries enable row level security;
alter table public.tours enable row level security;
alter table public.points_of_interest enable row level security;
alter table public.translations enable row level security;
alter table public.brokers enable row level security;
alter table public.broker_projects enable row level security;
alter table public.quotations enable row level security;

create policy galleries_select on public.galleries for select to authenticated using (public.can_read_project(project_id));
create policy galleries_write on public.galleries for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy tours_select on public.tours for select to authenticated using (public.can_read_project(project_id));
create policy tours_write on public.tours for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy pois_select on public.points_of_interest for select to authenticated using (public.can_read_project(project_id));
create policy pois_write on public.points_of_interest for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy translations_select on public.translations for select to authenticated using (public.can_read_project(project_id));
create policy translations_write on public.translations for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy brokers_select on public.brokers for select to authenticated
using (
  public.is_superadmin()
  or organization_id in (
    select m.organization_id from public.memberships m
    where m.user_id = auth.uid() and m.estado = 'active'
  )
);
create policy brokers_write on public.brokers for all to authenticated
using (
  public.is_superadmin()
  or organization_id in (
    select m.organization_id from public.memberships m
    where m.user_id = auth.uid() and m.estado = 'active' and m.role in ('org_admin', 'superadmin')
  )
)
with check (
  public.is_superadmin()
  or organization_id in (
    select m.organization_id from public.memberships m
    where m.user_id = auth.uid() and m.estado = 'active' and m.role in ('org_admin', 'superadmin')
  )
);

create policy broker_projects_select on public.broker_projects for select to authenticated using (public.can_read_project(project_id));
create policy broker_projects_write on public.broker_projects for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy quotations_select on public.quotations for select to authenticated using (public.can_read_project(project_id));
create policy quotations_write on public.quotations for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
