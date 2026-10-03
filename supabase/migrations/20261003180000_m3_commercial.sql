-- M3: avance de obra, secciones del cliente y pedidos de mejora.
-- Precios, planes, cotizaciones, branding e integraciones ya existían.

create table public.construction_updates (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  fecha date not null,
  titulo text not null,
  descripcion text not null default '',
  imagen_url text,
  orden int not null default 0
);

create table public.custom_sections (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  titulo text not null,
  cuerpo text not null default '',
  orden int not null default 0,
  visible boolean not null default true
);

create table public.improvement_requests (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null,
  titulo text not null,
  detalle text not null default '',
  created_at timestamptz not null default now()
);

alter table public.construction_updates enable row level security;
alter table public.custom_sections enable row level security;
alter table public.improvement_requests enable row level security;

create policy construction_select on public.construction_updates
  for select to authenticated using (public.can_read_project(project_id));
create policy construction_write on public.construction_updates
  for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy sections_select on public.custom_sections
  for select to authenticated using (public.can_read_project(project_id));
create policy sections_write on public.custom_sections
  for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy improvements_select on public.improvement_requests
  for select to authenticated using (public.can_read_project(project_id));
create policy improvements_write on public.improvement_requests
  for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
