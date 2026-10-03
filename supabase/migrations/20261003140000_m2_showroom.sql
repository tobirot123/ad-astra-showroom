-- M2: escenas del recorrido y estado "en pausa".
-- El showroom público sigue sin poder cambiar estados.

alter table public.units drop constraint if exists units_estado_check;
alter table public.units
  add constraint units_estado_check
  check (estado in ('disponible', 'reservada', 'vendida', 'bloqueada', 'pausa', 'oculta'));

create table public.viewpoints (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  building_id uuid references public.buildings (id) on delete set null,
  nombre text not null,
  tipo text not null check (tipo in ('portada', 'exterior', 'aereo', 'barrio', 'masterplan')),
  orden int not null default 0,
  imagen_url text not null,
  video_url text
);

create index viewpoints_project_idx on public.viewpoints (project_id, orden);

alter table public.viewpoints enable row level security;

create policy viewpoints_select on public.viewpoints
  for select to authenticated using (public.can_read_project(project_id));
create policy viewpoints_write on public.viewpoints
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
