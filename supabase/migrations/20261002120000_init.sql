-- Ad Astra · showroom y panel. Milestone 1.
-- Aislamiento por organización con RLS. El service role solo se usa en el servidor.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key,
  nombre text not null,
  slug text not null unique,
  estado text not null default 'active' check (estado in ('active', 'suspended')),
  plan text not null default 'showroom',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  nombre text not null,
  email text not null unique,
  telefono text,
  ultimo_acceso timestamptz
);

create table public.memberships (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('superadmin', 'org_admin', 'seller', 'viewer')),
  permisos jsonb not null default '{"can_edit_prices":false,"sees_all_leads":false,"sees_metrics":false}',
  estado text not null default 'active' check (estado in ('active', 'invited', 'suspended')),
  unique (user_id, organization_id)
);

create table public.projects (
  id uuid primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  nombre text not null,
  slug text not null unique,
  dominio text,
  estado text not null default 'draft' check (estado in ('draft', 'published')),
  moneda text not null default 'USD' check (moneda in ('USD', 'ARS')),
  descripcion text not null default '',
  direccion text not null default '',
  fecha_entrega date,
  contacto jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{"request_expiry_hours":48,"public_pending_display":"available","lead_required_for_request":true,"escalate_to_superadmin":false,"approver_user_ids":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.project_members (
  membership_id uuid not null references public.memberships (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  primary key (membership_id, project_id)
);

create table public.buildings (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null,
  tipo text not null default 'torre' check (tipo in ('torre', 'etapa', 'manzana')),
  orden int not null default 0
);

create table public.floors (
  id uuid primary key,
  building_id uuid not null references public.buildings (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null,
  numero int not null,
  orden int not null default 0
);

create table public.typologies (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null,
  ambientes int not null default 0,
  dormitorios int not null default 0,
  banos int not null default 0,
  m2_cubiertos double precision not null default 0,
  m2_semicubiertos double precision not null default 0,
  m2_descubiertos double precision not null default 0,
  m2_totales double precision not null default 0,
  descripcion text not null default '',
  custom_values jsonb not null default '{}'::jsonb,
  tour_url text
);

create table public.custom_field_definitions (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  clave text not null,
  nombre text not null,
  tipo text not null check (tipo in ('text', 'longtext', 'number', 'boolean', 'select', 'multiselect', 'date', 'url')),
  unidad_medida text,
  opciones jsonb not null default '[]'::jsonb,
  aplica_a text not null default 'unit' check (aplica_a in ('unit', 'typology')),
  obligatorio boolean not null default false,
  publico boolean not null default true,
  en_ficha boolean not null default true,
  en_filtro boolean not null default false,
  orden int not null default 0,
  ayuda text,
  archivado boolean not null default false,
  unique (project_id, clave)
);

create table public.characteristics (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null,
  icono text not null default 'check',
  orden int not null default 0,
  archivado boolean not null default false
);

create table public.entity_characteristics (
  entidad text not null check (entidad in ('typology', 'unit')),
  entidad_id uuid not null,
  characteristic_id uuid not null references public.characteristics (id) on delete cascade,
  primary key (entidad, entidad_id, characteristic_id)
);

create table public.units (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  floor_id uuid references public.floors (id) on delete set null,
  typology_id uuid references public.typologies (id) on delete set null,
  codigo text not null,
  tipo text not null default 'departamento',
  ambientes int,
  dormitorios int,
  banos int,
  m2_cubiertos double precision,
  m2_semicubiertos double precision,
  m2_descubiertos double precision,
  m2_totales double precision,
  orientacion text,
  vista text,
  estado text not null default 'disponible' check (estado in ('disponible', 'reservada', 'vendida', 'bloqueada', 'oculta')),
  pending_request_id uuid,
  reserved_by_user_id uuid references public.profiles (id),
  reserved_lead_id uuid,
  mostrar_precio boolean not null default true,
  destacada boolean not null default false,
  notas_internas text,
  custom_values jsonb not null default '{}'::jsonb,
  overrides text[] not null default '{}',
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  unique (project_id, codigo)
);

create table public.price_lists (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  nombre text not null,
  moneda text not null default 'USD' check (moneda in ('USD', 'ARS')),
  visibilidad text not null default 'public' check (visibilidad in ('public', 'sellers', 'internal')),
  vigente_desde timestamptz,
  vigente_hasta timestamptz,
  regla jsonb
);

create table public.unit_prices (
  unit_id uuid not null references public.units (id) on delete cascade,
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  precio double precision not null,
  primary key (unit_id, price_list_id)
);

create table public.payment_plans (
  id uuid primary key,
  price_list_id uuid not null references public.price_lists (id) on delete cascade,
  nombre text not null,
  anticipo_pct double precision not null default 0,
  anticipo_min double precision not null default 0,
  cuotas int not null default 0,
  periodicidad text not null default 'mensual' check (periodicidad in ('mensual', 'trimestral')),
  moneda_cuotas text not null default 'USD',
  refuerzos jsonb not null default '[]'::jsonb,
  saldo_posesion_pct double precision not null default 0,
  indice text not null default 'ninguno',
  indice_leyenda text,
  descuento_pct double precision not null default 0,
  texto_legal text not null default ''
);

create table public.media (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  tipo text not null,
  carpeta text not null default 'general',
  nombre text not null,
  url text not null,
  variantes jsonb not null default '[]'::jsonb,
  peso int not null default 0,
  ancho int,
  alto int,
  estado_proceso text not null default 'listo',
  aviso text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.media_links (
  id uuid primary key,
  media_id uuid not null references public.media (id) on delete cascade,
  entidad text not null,
  entidad_id uuid not null,
  rol text not null,
  orden int not null default 0
);

create table public.overlays (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  contenedor text not null,
  contenedor_id uuid,
  forma text not null,
  puntos jsonb not null,
  vinculo_tipo text not null,
  vinculo_id uuid,
  etiqueta text not null default '',
  estado text not null default 'published' check (estado in ('draft', 'published')),
  orden int not null default 0
);

create table public.leads (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  unit_id uuid references public.units (id) on delete set null,
  nombre text not null,
  email text,
  telefono text,
  mensaje text,
  canal text not null default 'form' check (canal in ('form', 'whatsapp')),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'contactado', 'visita', 'reserva', 'venta', 'perdido')),
  assigned_to uuid references public.profiles (id),
  utm jsonb not null default '{}'::jsonb,
  fuente text not null default 'Directo',
  session_id text,
  visitor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_activities (
  id uuid primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  tipo text not null,
  detalle text not null,
  user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.status_change_requests (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete cascade,
  tipo text not null check (tipo in ('reserve', 'sell', 'release')),
  estado_desde text not null,
  estado_hacia text not null,
  requested_by uuid not null references public.profiles (id),
  lead_id uuid references public.leads (id),
  price_list_id uuid references public.price_lists (id),
  payment_plan_id uuid references public.payment_plans (id),
  monto_sena double precision,
  moneda_sena text,
  comentario_vendedor text,
  estado text not null check (estado in ('pending', 'approved', 'rejected', 'expired', 'cancelled', 'resolved_by_direct_change')),
  expires_at timestamptz not null,
  extended_count int not null default 0,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  comentario_admin text,
  unit_version_at_request int not null,
  reverted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una sola solicitud activa por unidad, también ante dos inserts simultáneos.
create unique index status_change_requests_one_pending
  on public.status_change_requests (unit_id)
  where estado = 'pending';

alter table public.units
  add constraint units_pending_request_fk
  foreign key (pending_request_id) references public.status_change_requests (id)
  deferrable initially deferred;

alter table public.units
  add constraint units_reserved_lead_fk
  foreign key (reserved_lead_id) references public.leads (id)
  deferrable initially deferred;

create table public.status_change_request_events (
  id uuid primary key,
  request_id uuid not null references public.status_change_requests (id) on delete cascade,
  tipo text not null,
  user_id uuid references public.profiles (id),
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  cuerpo text not null,
  entidad text,
  entidad_id uuid,
  canal text not null check (canal in ('email', 'panel')),
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.change_sets (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  tipo text not null,
  descripcion text not null,
  cantidad int not null default 0,
  deshecho_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.change_log (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  change_set_id uuid references public.change_sets (id) on delete set null,
  user_id uuid not null references public.profiles (id),
  requested_by uuid references public.profiles (id),
  request_id uuid references public.status_change_requests (id),
  entidad text not null,
  entidad_id uuid not null,
  campo text not null,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  origen text not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  visitor_id text not null,
  session_id text not null,
  nombre text not null,
  props jsonb not null default '{}'::jsonb,
  unit_id uuid,
  device text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer_tipo text,
  fuente text not null,
  ts timestamptz not null default now()
);

create index events_project_ts_idx on public.events (project_id, ts);
create index leads_project_created_idx on public.leads (project_id, created_at);
create index units_project_idx on public.units (project_id);

create table public.integrations (
  id uuid primary key,
  project_id uuid not null references public.projects (id) on delete cascade,
  tipo text not null check (tipo in ('tokko', 'webhook')),
  config jsonb not null default '{}'::jsonb,
  estado text not null default 'idle',
  ultimo_envio timestamptz,
  errores_consecutivos int not null default 0,
  unique (project_id, tipo)
);

create table public.integration_deliveries (
  id uuid primary key,
  integration_id uuid not null references public.integrations (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  intento int not null default 0,
  estado text not null,
  respuesta text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Showroom público: no expone notas, precios internos ni el id de la solicitud.
-- ---------------------------------------------------------------------------

create view public.showroom_units with (security_invoker = false) as
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
  u.floor_id
from public.units u
join public.projects p on p.id = u.project_id
where p.estado = 'published'
  and u.estado <> 'oculta';

-- ---------------------------------------------------------------------------
-- Helpers de permisos
-- ---------------------------------------------------------------------------

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.role = 'superadmin'
      and m.estado = 'active'
  );
$$;

create or replace function public.project_role(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_superadmin() then 'superadmin'
    else (
      select m.role
      from public.memberships m
      join public.projects p on p.organization_id = m.organization_id
      where p.id = p_project_id
        and m.user_id = auth.uid()
        and m.estado = 'active'
        and (
          not exists (select 1 from public.project_members pm where pm.membership_id = m.id)
          or exists (
            select 1 from public.project_members pm
            where pm.membership_id = m.id and pm.project_id = p.id
          )
        )
      limit 1
    )
  end;
$$;

create or replace function public.can_read_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.project_role(p_project_id) is not null;
$$;

create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.project_role(p_project_id) in ('org_admin', 'superadmin');
$$;

-- ---------------------------------------------------------------------------
-- Solicitudes: el vendedor no escribe el estado. Lo garantiza la función.
-- ---------------------------------------------------------------------------

create or replace function public.request_status_change(
  p_unit_id uuid,
  p_tipo text,
  p_lead_id uuid,
  p_comentario text,
  p_monto_sena double precision
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit public.units%rowtype;
  v_project public.projects%rowtype;
  v_role text;
  v_id uuid := gen_random_uuid();
  v_hacia text;
  v_hours int;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión';
  end if;
  select * into v_unit from public.units where id = p_unit_id;
  if not found then
    raise exception 'No encontramos la unidad';
  end if;
  if not public.can_read_project(v_unit.project_id) then
    raise exception 'No tenés acceso a esta organización';
  end if;
  v_role := public.project_role(v_unit.project_id);
  if v_role <> 'seller' then
    raise exception 'Solo un vendedor puede solicitar un cambio. El admin cambia el estado directo.';
  end if;
  if exists (
    select 1 from public.status_change_requests
    where unit_id = p_unit_id and estado = 'pending'
  ) then
    raise exception 'Esta unidad tiene una solicitud pendiente';
  end if;
  select * into v_project from public.projects where id = v_unit.project_id;
  if p_tipo = 'reserve' then
    if v_unit.estado <> 'disponible' then
      raise exception 'No se puede reservar una unidad en ese estado';
    end if;
    v_hacia := 'reservada';
  elsif p_tipo = 'sell' then
    if v_unit.estado not in ('disponible', 'reservada') then
      raise exception 'No se puede vender una unidad en ese estado';
    end if;
    v_hacia := 'vendida';
  elsif p_tipo = 'release' then
    if v_unit.estado <> 'reservada' or v_unit.reserved_by_user_id is distinct from auth.uid() then
      raise exception 'Solo podés pedir liberar unidades reservadas a tu nombre';
    end if;
    v_hacia := 'disponible';
  else
    raise exception 'Tipo de solicitud inválido';
  end if;
  if p_tipo in ('reserve', 'sell')
     and coalesce((v_project.settings ->> 'lead_required_for_request')::boolean, true)
     and p_lead_id is null then
    raise exception 'Para reservar o vender tenés que indicar el cliente';
  end if;
  v_hours := least(168, greatest(1, coalesce((v_project.settings ->> 'request_expiry_hours')::int, 48)));
  insert into public.status_change_requests (
    id, project_id, unit_id, tipo, estado_desde, estado_hacia, requested_by, lead_id,
    monto_sena, moneda_sena, comentario_vendedor, estado, expires_at, unit_version_at_request
  ) values (
    v_id, v_unit.project_id, v_unit.id, p_tipo, v_unit.estado, v_hacia, auth.uid(), p_lead_id,
    p_monto_sena, case when p_monto_sena is null then null else 'USD' end, nullif(trim(coalesce(p_comentario, '')), ''),
    'pending', now() + make_interval(hours => v_hours), v_unit.version
  );
  update public.units set pending_request_id = v_id, updated_at = now() where id = v_unit.id;
  insert into public.status_change_request_events (id, request_id, tipo, user_id, detalle)
  values (gen_random_uuid(), v_id, 'created', auth.uid(), jsonb_build_object('tipo', p_tipo));
  return v_id;
end;
$$;

create or replace function public.approve_status_request(p_request_id uuid, p_comentario text, p_force boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.status_change_requests%rowtype;
  v_unit public.units%rowtype;
  v_role text;
begin
  if auth.uid() is null then raise exception 'Tenés que iniciar sesión'; end if;
  select * into v_req from public.status_change_requests where id = p_request_id;
  if not found then raise exception 'No encontramos la solicitud'; end if;
  v_role := public.project_role(v_req.project_id);
  if v_role not in ('org_admin', 'superadmin') then
    raise exception 'No tenés permiso para aprobar solicitudes';
  end if;
  if v_req.estado <> 'pending' then raise exception 'La solicitud ya no está pendiente'; end if;
  if v_req.expires_at <= now() then raise exception 'La solicitud está vencida'; end if;
  select * into v_unit from public.units where id = v_req.unit_id;
  if (v_unit.estado is distinct from v_req.estado_desde or v_unit.version is distinct from v_req.unit_version_at_request)
     and not coalesce(p_force, false) then
    raise exception 'La unidad cambió desde la solicitud. Confirmá si igual querés aprobar';
  end if;
  update public.units set
    estado = v_req.estado_hacia,
    pending_request_id = null,
    version = version + 1,
    updated_at = now(),
    updated_by = auth.uid(),
    reserved_by_user_id = case when v_req.tipo = 'release' then null when v_req.tipo in ('reserve', 'sell') then v_req.requested_by else reserved_by_user_id end,
    reserved_lead_id = case when v_req.tipo = 'release' then null when v_req.tipo in ('reserve', 'sell') then v_req.lead_id else reserved_lead_id end
  where id = v_unit.id;
  update public.status_change_requests set
    estado = 'approved', decided_by = auth.uid(), decided_at = now(),
    comentario_admin = nullif(trim(coalesce(p_comentario, '')), ''), updated_at = now()
  where id = v_req.id;
  if v_req.lead_id is not null and v_req.tipo in ('reserve', 'sell') then
    update public.leads set estado = case when v_req.tipo = 'sell' then 'venta' else 'reserva' end, updated_at = now()
    where id = v_req.lead_id;
  end if;
  insert into public.change_log (
    id, project_id, user_id, requested_by, request_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, origen
  ) values (
    gen_random_uuid(), v_req.project_id, auth.uid(), v_req.requested_by, v_req.id, 'unit', v_unit.id,
    'estado', to_jsonb(v_unit.estado), to_jsonb(v_req.estado_hacia), 'request_approved'
  );
  insert into public.status_change_request_events (id, request_id, tipo, user_id, detalle)
  values (gen_random_uuid(), v_req.id, 'approved', auth.uid(), '{}'::jsonb);
end;
$$;

create or replace function public.reject_status_request(p_request_id uuid, p_comentario text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.status_change_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Tenés que iniciar sesión'; end if;
  if nullif(trim(coalesce(p_comentario, '')), '') is null then
    raise exception 'El rechazo necesita un comentario';
  end if;
  select * into v_req from public.status_change_requests where id = p_request_id;
  if not found then raise exception 'No encontramos la solicitud'; end if;
  if public.project_role(v_req.project_id) not in ('org_admin', 'superadmin') then
    raise exception 'No tenés permiso para rechazar solicitudes';
  end if;
  if v_req.estado <> 'pending' then raise exception 'La solicitud ya no está pendiente'; end if;
  update public.units set pending_request_id = null, updated_at = now() where id = v_req.unit_id;
  update public.status_change_requests set
    estado = 'rejected', decided_by = auth.uid(), decided_at = now(),
    comentario_admin = trim(p_comentario), updated_at = now()
  where id = v_req.id;
  insert into public.status_change_request_events (id, request_id, tipo, user_id, detalle)
  values (gen_random_uuid(), v_req.id, 'rejected', auth.uid(), jsonb_build_object('comentario', trim(p_comentario)));
end;
$$;

create or replace function public.expire_due_requests()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_req public.status_change_requests%rowtype;
begin
  for v_req in
    select * from public.status_change_requests
    where estado = 'pending' and expires_at <= now()
  loop
    update public.units set pending_request_id = null, updated_at = now()
    where id = v_req.unit_id and pending_request_id = v_req.id;
    update public.status_change_requests set estado = 'expired', decided_at = now(), updated_at = now()
    where id = v_req.id;
    insert into public.status_change_request_events (id, request_id, tipo, detalle)
    values (gen_random_uuid(), v_req.id, 'expired', '{}'::jsonb);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Para programarlo en Supabase: select cron.schedule('expire-requests', '*/5 * * * *', $$select public.expire_due_requests()$$);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.project_members enable row level security;
alter table public.projects enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.typologies enable row level security;
alter table public.custom_field_definitions enable row level security;
alter table public.characteristics enable row level security;
alter table public.entity_characteristics enable row level security;
alter table public.units enable row level security;
alter table public.price_lists enable row level security;
alter table public.unit_prices enable row level security;
alter table public.payment_plans enable row level security;
alter table public.media enable row level security;
alter table public.media_links enable row level security;
alter table public.overlays enable row level security;
alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;
alter table public.status_change_requests enable row level security;
alter table public.status_change_request_events enable row level security;
alter table public.notifications enable row level security;
alter table public.change_sets enable row level security;
alter table public.change_log enable row level security;
alter table public.events enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_deliveries enable row level security;

create policy organizations_select on public.organizations for select to authenticated
using (
  public.is_superadmin()
  or id in (
    select m.organization_id from public.memberships m
    where m.user_id = auth.uid() and m.estado = 'active'
  )
);

create policy profiles_select on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.is_superadmin()
  or id in (
    select m2.user_id from public.memberships m
    join public.memberships m2 on m2.organization_id = m.organization_id
    where m.user_id = auth.uid() and m.estado = 'active'
  )
);

create policy memberships_select on public.memberships for select to authenticated
using (
  user_id = auth.uid()
  or public.is_superadmin()
  or organization_id in (
    select m.organization_id from public.memberships m
    where m.user_id = auth.uid() and m.estado = 'active' and m.role in ('org_admin', 'superadmin')
  )
);

create policy projects_select on public.projects for select to authenticated
using (public.can_read_project(id));
create policy projects_write on public.projects for all to authenticated
using (public.can_edit_project(id)) with check (public.can_edit_project(id));

create policy buildings_select on public.buildings for select to authenticated using (public.can_read_project(project_id));
create policy buildings_write on public.buildings for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy floors_select on public.floors for select to authenticated using (public.can_read_project(project_id));
create policy floors_write on public.floors for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy typologies_select on public.typologies for select to authenticated using (public.can_read_project(project_id));
create policy typologies_write on public.typologies for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy fields_select on public.custom_field_definitions for select to authenticated using (public.can_read_project(project_id));
create policy fields_write on public.custom_field_definitions for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy chars_select on public.characteristics for select to authenticated using (public.can_read_project(project_id));
create policy chars_write on public.characteristics for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy units_select on public.units for select to authenticated using (public.can_read_project(project_id));
create policy units_write on public.units for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy prices_select on public.price_lists for select to authenticated
using (
  public.can_read_project(project_id)
  and (
    visibilidad <> 'internal'
    or public.can_edit_project(project_id)
  )
);
create policy prices_write on public.price_lists for all to authenticated
using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy unit_prices_select on public.unit_prices for select to authenticated
using (
  exists (
    select 1 from public.price_lists l
    where l.id = price_list_id
      and public.can_read_project(l.project_id)
      and (l.visibilidad <> 'internal' or public.can_edit_project(l.project_id))
  )
);
create policy unit_prices_write on public.unit_prices for all to authenticated
using (
  exists (select 1 from public.units u where u.id = unit_id and public.can_edit_project(u.project_id))
)
with check (
  exists (select 1 from public.units u where u.id = unit_id and public.can_edit_project(u.project_id))
);

create policy plans_select on public.payment_plans for select to authenticated
using (
  exists (
    select 1 from public.price_lists l
    where l.id = price_list_id and public.can_read_project(l.project_id)
  )
);
create policy plans_write on public.payment_plans for all to authenticated
using (
  exists (select 1 from public.price_lists l where l.id = price_list_id and public.can_edit_project(l.project_id))
)
with check (
  exists (select 1 from public.price_lists l where l.id = price_list_id and public.can_edit_project(l.project_id))
);

create policy media_select on public.media for select to authenticated using (public.can_read_project(project_id));
create policy media_write on public.media for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));
create policy overlays_select on public.overlays for select to authenticated using (public.can_read_project(project_id));
create policy overlays_write on public.overlays for all to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy leads_select on public.leads for select to authenticated
using (
  public.can_edit_project(project_id)
  or (
    public.project_role(project_id) = 'seller'
    and (
      assigned_to = auth.uid()
      or exists (
        select 1 from public.memberships m
        join public.projects p on p.organization_id = m.organization_id
        where p.id = leads.project_id
          and m.user_id = auth.uid()
          and coalesce((m.permisos ->> 'sees_all_leads')::boolean, false)
      )
    )
  )
);
create policy leads_update on public.leads for update to authenticated
using (
  public.can_edit_project(project_id)
  or (public.project_role(project_id) = 'seller' and assigned_to = auth.uid())
)
with check (
  public.can_edit_project(project_id)
  or (public.project_role(project_id) = 'seller' and assigned_to = auth.uid())
);
create policy leads_public_insert on public.leads for insert to anon, authenticated
with check (
  exists (select 1 from public.projects p where p.id = project_id and p.estado = 'published')
);

create policy requests_select on public.status_change_requests for select to authenticated
using (
  public.can_edit_project(project_id)
  or requested_by = auth.uid()
);

create policy notifications_select on public.notifications for select to authenticated
using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy changelog_select on public.change_log for select to authenticated
using (
  public.can_edit_project(project_id)
  or user_id = auth.uid()
);

create policy events_select on public.events for select to authenticated
using (public.can_read_project(project_id));
create policy events_public_insert on public.events for insert to anon, authenticated
with check (
  exists (select 1 from public.projects p where p.id = project_id and p.estado = 'published')
);

create policy integrations_all on public.integrations for all to authenticated
using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- El resto de tablas de apoyo se leen si podés leer el proyecto, vía service role en el servidor.
create policy project_members_select on public.project_members for select to authenticated
using (
  exists (select 1 from public.projects p where p.id = project_id and public.can_read_project(p.id))
);
create policy media_links_select on public.media_links for select to authenticated
using (
  exists (select 1 from public.media m where m.id = media_id and public.can_read_project(m.project_id))
);
create policy activities_select on public.lead_activities for select to authenticated
using (
  exists (select 1 from public.leads l where l.id = lead_id and public.can_read_project(l.project_id))
);
create policy request_events_select on public.status_change_request_events for select to authenticated
using (
  exists (
    select 1 from public.status_change_requests r
    where r.id = request_id
      and (public.can_edit_project(r.project_id) or r.requested_by = auth.uid())
  )
);
create policy change_sets_select on public.change_sets for select to authenticated
using (public.can_edit_project(project_id) or user_id = auth.uid());
create policy deliveries_select on public.integration_deliveries for select to authenticated
using (
  exists (
    select 1 from public.integrations i
    where i.id = integration_id and public.can_edit_project(i.project_id)
  )
);
create policy entity_chars_select on public.entity_characteristics for select to authenticated
using (true);

grant select on public.showroom_units to anon, authenticated;
grant execute on function public.request_status_change(uuid, text, uuid, text, double precision) to authenticated;
grant execute on function public.approve_status_request(uuid, text, boolean) to authenticated;
grant execute on function public.reject_status_request(uuid, text) to authenticated;
grant execute on function public.expire_due_requests() to authenticated;

revoke all on function public.request_status_change(uuid, text, uuid, text, double precision) from public;
revoke all on function public.approve_status_request(uuid, text, boolean) from public;
revoke all on function public.reject_status_request(uuid, text) from public;
revoke all on function public.expire_due_requests() from public;
grant execute on function public.request_status_change(uuid, text, uuid, text, double precision) to authenticated;
grant execute on function public.approve_status_request(uuid, text, boolean) to authenticated;
grant execute on function public.reject_status_request(uuid, text) to authenticated;
grant execute on function public.expire_due_requests() to authenticated;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_fk
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

-- Bucket de medios. No falla si el esquema storage todavía no está.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    values ('media', 'media', true)
    on conflict (id) do nothing;
  end if;
end $$;
