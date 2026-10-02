-- Datos demo de ALBA. Se regenera con npm run seed:sql.
-- Contraseña de todos los usuarios: AdAstra2026!
-- Las fechas quedan relativas a now() para que las solicitudes sigan vigentes.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  email_change_token_current, email_change_confirm_status, reauthentication_token,
  is_sso_user, is_anonymous
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'superadmin@demo.adastra',
    extensions.crypt('AdAstra2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Sofía Ad Astra"}'::jsonb,
    now(),
    now(),
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'martin.admin@demo.adastra',
    extensions.crypt('AdAstra2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Martín Ruiz"}'::jsonb,
    now(),
    now(),
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'laura.ventas@demo.adastra',
    extensions.crypt('AdAstra2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Laura Gómez"}'::jsonb,
    now(),
    now(),
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'pedro.lectura@demo.adastra',
    extensions.crypt('AdAstra2026!', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Pedro Soler"}'::jsonb,
    now(),
    now(),
    '',
    0,
    '',
    false,
    false
  );

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  (
    gen_random_uuid(),
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '{"sub":"10000000-0000-4000-8000-000000000001","email":"superadmin@demo.adastra"}'::jsonb,
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    '{"sub":"10000000-0000-4000-8000-000000000002","email":"martin.admin@demo.adastra"}'::jsonb,
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    '{"sub":"10000000-0000-4000-8000-000000000003","email":"laura.ventas@demo.adastra"}'::jsonb,
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    '{"sub":"10000000-0000-4000-8000-000000000004","email":"pedro.lectura@demo.adastra"}'::jsonb,
    'email',
    now(), now(), now()
  );

insert into public.organizations (id, nombre, slug, estado, plan, created_at)
values
  ('10000000-0000-4000-8000-00000000000a', 'Norte Desarrollos', 'norte', 'active', 'showroom', now());

insert into public.profiles (id, nombre, email, telefono, ultimo_acceso)
values
  ('10000000-0000-4000-8000-000000000001', 'Sofía Ad Astra', 'superadmin@demo.adastra', '+54 9 341 555-0101', null),
  ('10000000-0000-4000-8000-000000000002', 'Martín Ruiz', 'martin.admin@demo.adastra', '+54 9 341 555-0102', null),
  ('10000000-0000-4000-8000-000000000003', 'Laura Gómez', 'laura.ventas@demo.adastra', '+54 9 341 555-0103', null),
  ('10000000-0000-4000-8000-000000000004', 'Pedro Soler', 'pedro.lectura@demo.adastra', '+54 9 341 555-0104', null);

insert into public.memberships (id, user_id, organization_id, role, permisos, estado)
values
  ('10000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-00000000000a', 'superadmin', '{"can_edit_prices":false,"sees_all_leads":false,"sees_metrics":false}'::jsonb, 'active'),
  ('10000000-0000-4000-8000-00000000000c', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-00000000000a', 'org_admin', '{"can_edit_prices":false,"sees_all_leads":false,"sees_metrics":false}'::jsonb, 'active'),
  ('10000000-0000-4000-8000-00000000000d', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-00000000000a', 'seller', '{"can_edit_prices":false,"sees_all_leads":false,"sees_metrics":true}'::jsonb, 'active'),
  ('10000000-0000-4000-8000-00000000000e', '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-00000000000a', 'viewer', '{"can_edit_prices":false,"sees_all_leads":false,"sees_metrics":false}'::jsonb, 'active');

insert into public.projects (id, organization_id, nombre, slug, dominio, estado, moneda, descripcion, direccion, fecha_entrega, contacto, settings, updated_at)
values
  ('10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000000a', 'ALBA', 'alba', null, 'published', 'USD', 'Torre de 5 pisos frente al parque, con unidades de 2 y 3 ambientes. Datos de demostración para el showroom de Ad Astra.', 'Av. del Parque 1450, Rosario', '2027-12-01'::date, '{"whatsapp":"5493415550100","email":"comercial@nortedesarrollos.demo","telefono":"+54 341 555-0100"}'::jsonb, '{"request_expiry_hours":48,"public_pending_display":"available","lead_required_for_request":true,"escalate_to_superadmin":false,"approver_user_ids":[]}'::jsonb, now());

insert into public.buildings (id, project_id, nombre, tipo, orden)
values
  ('10000000-0000-4000-8000-00000000001e', '10000000-0000-4000-8000-000000000014', 'Torre A', 'torre', 1);

insert into public.floors (id, building_id, project_id, nombre, numero, orden)
values
  ('10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-00000000001e', '10000000-0000-4000-8000-000000000014', 'Piso 5', 5, 5),
  ('10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-00000000001e', '10000000-0000-4000-8000-000000000014', 'Piso 4', 4, 4),
  ('10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-00000000001e', '10000000-0000-4000-8000-000000000014', 'Piso 3', 3, 3),
  ('10000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-00000000001e', '10000000-0000-4000-8000-000000000014', 'Piso 2', 2, 2),
  ('10000000-0000-4000-8000-00000000001f', '10000000-0000-4000-8000-00000000001e', '10000000-0000-4000-8000-000000000014', 'Piso 1', 1, 1);

insert into public.typologies (id, project_id, nombre, ambientes, dormitorios, banos, m2_cubiertos, m2_semicubiertos, m2_descubiertos, m2_totales, descripcion, custom_values, tour_url)
values
  ('10000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000014', '2 ambientes', 2, 1, 1, 48.2, 4.5, 2.4, 55.1, 'Living-comedor integrado, cocina separada y balcón corrido.', '{}'::jsonb, null),
  ('10000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000014', '3 ambientes', 3, 2, 2, 71, 6.2, 3.2, 80.4, 'Dos dormitorios, suite principal y toilette de recepción.', '{}'::jsonb, null);

insert into public.custom_field_definitions (id, project_id, clave, nombre, tipo, unidad_medida, opciones, aplica_a, obligatorio, publico, en_ficha, en_filtro, orden, ayuda, archivado)
values
  ('10000000-0000-4000-8000-000000000046', '10000000-0000-4000-8000-000000000014', 'tipo_cochera', 'Tipo de cochera', 'select', null, '["ninguna","simple","doble"]'::jsonb, 'unit', false, true, true, true, 1, 'Simple, doble o sin cochera.', false),
  ('10000000-0000-4000-8000-000000000047', '10000000-0000-4000-8000-000000000014', 'apto_profesional', 'Apto profesional', 'boolean', null, '[]'::jsonb, 'unit', false, true, true, true, 2, null, false),
  ('10000000-0000-4000-8000-000000000048', '10000000-0000-4000-8000-000000000014', 'expensas', 'Expensas estimadas', 'number', 'ARS', '[]'::jsonb, 'unit', false, true, true, false, 3, 'Valor orientativo, no incluye servicios extraordinarios.', false);

insert into public.characteristics (id, project_id, nombre, icono, orden, archivado)
values
  ('10000000-0000-4000-8000-000000000050', '10000000-0000-4000-8000-000000000014', 'Balcón', 'balcon', 1, false),
  ('10000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000014', 'Lavadero', 'lavadero', 2, false),
  ('10000000-0000-4000-8000-000000000052', '10000000-0000-4000-8000-000000000014', 'Parrilla', 'parrilla', 3, false),
  ('10000000-0000-4000-8000-000000000053', '10000000-0000-4000-8000-000000000014', 'Toilette', 'toilette', 4, false),
  ('10000000-0000-4000-8000-000000000054', '10000000-0000-4000-8000-000000000014', 'Vestidor', 'vestidor', 5, false);

insert into public.entity_characteristics (entidad, entidad_id, characteristic_id)
values
  ('typology', '10000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000050'),
  ('typology', '10000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000051'),
  ('typology', '10000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000050'),
  ('typology', '10000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000052'),
  ('typology', '10000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000053'),
  ('typology', '10000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000054');

insert into public.price_lists (id, project_id, nombre, moneda, visibilidad, vigente_desde, vigente_hasta, regla)
values
  ('10000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000014', 'Contado', 'USD', 'public', null, null, null),
  ('10000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000014', 'Financiado', 'USD', 'public', null, null, '{"base_list_id":"10000000-0000-4000-8000-000000000032","percent":12}'::jsonb);

insert into public.payment_plans (id, price_list_id, nombre, anticipo_pct, anticipo_min, cuotas, periodicidad, moneda_cuotas, refuerzos, saldo_posesion_pct, indice, indice_leyenda, descuento_pct, texto_legal)
values
  ('10000000-0000-4000-8000-00000000003c', '10000000-0000-4000-8000-000000000033', 'Financiado 36', 30, 20000, 36, 'mensual', 'USD', '[{"pct":10,"meses":[12]},{"pct":10,"meses":[24]}]'::jsonb, 10, 'CAC', 'El índice CAC se carga a mano y es orientativo.', 0, 'Cotización orientativa. No incluye impuestos ni gastos de escrituración.');

insert into public.units (id, project_id, floor_id, typology_id, codigo, tipo, ambientes, dormitorios, banos, m2_cubiertos, m2_semicubiertos, m2_descubiertos, m2_totales, orientacion, vista, estado, pending_request_id, reserved_by_user_id, reserved_lead_id, mostrar_precio, destacada, notas_internas, custom_values, overrides, version, updated_at, updated_by)
values
  ('10000000-0000-4000-8000-000000000074', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000028', '5A', 'departamento', null, null, null, null, null, null, null, 'Norte', 'al parque', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":false,"expensas":100000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000075', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000028', '5B', 'departamento', null, null, null, null, null, null, null, 'NE', 'al parque', 'disponible', null, null, null, true, true, null, '{"tipo_cochera":"ninguna","apto_profesional":false,"expensas":100000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000076', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000029', '5C', 'departamento', null, null, null, null, null, null, null, 'Este', 'contrafrente', 'oculta', null, null, null, true, false, null, '{"tipo_cochera":"doble","apto_profesional":true,"expensas":100000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000077', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000029', '5D', 'departamento', null, null, null, null, null, null, null, 'Oeste', 'contrafrente', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":true,"expensas":100000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000070', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000028', '4A', 'departamento', null, null, null, null, null, null, null, 'Norte', 'al parque', 'disponible', null, null, null, true, true, null, '{"tipo_cochera":"simple","apto_profesional":false,"expensas":94000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000071', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000028', '4B', 'departamento', null, null, null, null, null, null, null, 'NE', 'al parque', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"ninguna","apto_profesional":false,"expensas":94000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000072', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000029', '4C', 'departamento', null, null, null, null, null, null, null, 'Este', 'contrafrente', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"doble","apto_profesional":true,"expensas":94000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000073', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000029', '4D', 'departamento', null, null, null, null, null, null, null, 'Oeste', 'contrafrente', 'bloqueada', null, null, null, true, false, 'Retenida por la desarrolladora para showroom.', '{"tipo_cochera":"simple","apto_profesional":true,"expensas":94000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-00000000006c', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000028', '3A', 'departamento', null, null, null, null, null, null, null, 'Norte', 'al parque', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":false,"expensas":88000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-00000000006d', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000028', '3B', 'departamento', null, null, null, null, null, null, null, 'NE', 'al parque', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"ninguna","apto_profesional":false,"expensas":88000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-00000000006e', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000029', '3C', 'departamento', null, null, null, null, null, null, null, 'Este', 'contrafrente', 'vendida', null, null, null, true, false, null, '{"tipo_cochera":"doble","apto_profesional":true,"expensas":88000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-00000000006f', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000029', '3D', 'departamento', null, null, null, null, null, null, null, 'Oeste', 'contrafrente', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":true,"expensas":88000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000068', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000028', '2A', 'departamento', null, null, null, null, null, null, null, 'Norte', 'al parque', 'reservada', null, '10000000-0000-4000-8000-000000000003', null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":false,"expensas":82000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000069', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000028', '2B', 'departamento', null, null, null, null, null, null, null, 'NE', 'al parque', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"ninguna","apto_profesional":false,"expensas":82000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-00000000006a', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000029', '2C', 'departamento', null, null, null, null, null, null, null, 'Este', 'contrafrente', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"doble","apto_profesional":false,"expensas":82000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-00000000006b', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000029', '2D', 'departamento', null, null, null, null, null, null, null, 'Oeste', 'contrafrente', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":false,"expensas":82000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000064', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000001f', '10000000-0000-4000-8000-000000000028', '1A', 'departamento', null, null, null, null, null, null, null, 'Norte', 'al parque', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":false,"expensas":76000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000065', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000001f', '10000000-0000-4000-8000-000000000028', '1B', 'departamento', null, null, null, null, null, null, null, 'NE', 'al parque', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"ninguna","apto_profesional":false,"expensas":76000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000066', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000001f', '10000000-0000-4000-8000-000000000029', '1C', 'departamento', null, null, null, null, null, null, null, 'Este', 'contrafrente', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"doble","apto_profesional":false,"expensas":76000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000067', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000001f', '10000000-0000-4000-8000-000000000029', '1D', 'departamento', null, null, null, null, null, null, null, 'Oeste', 'contrafrente', 'disponible', null, null, null, true, false, null, '{"tipo_cochera":"simple","apto_profesional":false,"expensas":76000}'::jsonb, array['orientacion']::text[], 1, now(), '10000000-0000-4000-8000-000000000002');

insert into public.media (id, project_id, tipo, carpeta, nombre, url, variantes, peso, ancho, alto, estado_proceso, aviso, tags, created_at)
values
  ('10000000-0000-4000-8000-000000000190', '10000000-0000-4000-8000-000000000014', 'imagen', 'fachada', 'Fachada Torre A', '/demo/fachada.svg', '[{"nombre":"original","url":"/demo/fachada.svg","ancho":800}]'::jsonb, 12000, 800, 1100, 'listo', null, array['fachada']::text[], now()),
  ('10000000-0000-4000-8000-000000000191', '10000000-0000-4000-8000-000000000014', 'plano', 'planos', 'Plano 2 ambientes', '/demo/plano-2amb.svg', '[{"nombre":"original","url":"/demo/plano-2amb.svg","ancho":800}]'::jsonb, 12000, 800, 640, 'listo', null, array['planos']::text[], now()),
  ('10000000-0000-4000-8000-000000000192', '10000000-0000-4000-8000-000000000014', 'plano', 'planos', 'Plano 3 ambientes', '/demo/plano-3amb.svg', '[{"nombre":"original","url":"/demo/plano-3amb.svg","ancho":800}]'::jsonb, 12000, 800, 640, 'listo', null, array['planos']::text[], now()),
  ('10000000-0000-4000-8000-000000000193', '10000000-0000-4000-8000-000000000014', 'imagen', 'renders', 'Living', '/demo/render-living.svg', '[{"nombre":"original","url":"/demo/render-living.svg","ancho":800}]'::jsonb, 12000, 800, 640, 'listo', null, array['renders']::text[], now()),
  ('10000000-0000-4000-8000-000000000194', '10000000-0000-4000-8000-000000000014', 'imagen', 'renders', 'Cocina', '/demo/render-cocina.svg', '[{"nombre":"original","url":"/demo/render-cocina.svg","ancho":800}]'::jsonb, 12000, 800, 640, 'listo', null, array['renders']::text[], now());

insert into public.media_links (id, media_id, entidad, entidad_id, rol, orden)
values
  ('10000000-0000-4000-8000-00000000019a', '10000000-0000-4000-8000-000000000190', 'project', '10000000-0000-4000-8000-000000000014', 'fachada', 0),
  ('10000000-0000-4000-8000-00000000019b', '10000000-0000-4000-8000-000000000191', 'typology', '10000000-0000-4000-8000-000000000028', 'plano', 0),
  ('10000000-0000-4000-8000-00000000019c', '10000000-0000-4000-8000-000000000192', 'typology', '10000000-0000-4000-8000-000000000029', 'plano', 0),
  ('10000000-0000-4000-8000-00000000019d', '10000000-0000-4000-8000-000000000193', 'typology', '10000000-0000-4000-8000-000000000028', 'render', 1),
  ('10000000-0000-4000-8000-00000000019e', '10000000-0000-4000-8000-000000000193', 'typology', '10000000-0000-4000-8000-000000000029', 'render', 1),
  ('10000000-0000-4000-8000-00000000019f', '10000000-0000-4000-8000-000000000194', 'typology', '10000000-0000-4000-8000-000000000029', 'render', 2);

insert into public.overlays (id, project_id, contenedor, contenedor_id, forma, puntos, vinculo_tipo, vinculo_id, etiqueta, estado, orden)
values
  ('10000000-0000-4000-8000-0000000000d8', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.166,0.133],[0.294,0.133],[0.294,0.227],[0.166,0.227]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000074', '5A', 'published', 16),
  ('10000000-0000-4000-8000-0000000000d9', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.366,0.133],[0.494,0.133],[0.494,0.227],[0.366,0.227]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000075', '5B', 'published', 17),
  ('10000000-0000-4000-8000-0000000000da', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.566,0.133],[0.694,0.133],[0.694,0.227],[0.566,0.227]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000076', '5C', 'published', 18),
  ('10000000-0000-4000-8000-0000000000db', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.766,0.133],[0.894,0.133],[0.894,0.227],[0.766,0.227]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000077', '5D', 'published', 19),
  ('10000000-0000-4000-8000-0000000000d4', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.166,0.283],[0.294,0.283],[0.294,0.377],[0.166,0.377]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000070', '4A', 'published', 12),
  ('10000000-0000-4000-8000-0000000000d5', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.366,0.283],[0.494,0.283],[0.494,0.377],[0.366,0.377]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000071', '4B', 'published', 13),
  ('10000000-0000-4000-8000-0000000000d6', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.566,0.283],[0.694,0.283],[0.694,0.377],[0.566,0.377]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000072', '4C', 'published', 14),
  ('10000000-0000-4000-8000-0000000000d7', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.766,0.283],[0.894,0.283],[0.894,0.377],[0.766,0.377]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000073', '4D', 'published', 15),
  ('10000000-0000-4000-8000-0000000000d0', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.166,0.433],[0.294,0.433],[0.294,0.527],[0.166,0.527]]'::jsonb, 'unit', '10000000-0000-4000-8000-00000000006c', '3A', 'published', 8),
  ('10000000-0000-4000-8000-0000000000d1', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.366,0.433],[0.494,0.433],[0.494,0.527],[0.366,0.527]]'::jsonb, 'unit', '10000000-0000-4000-8000-00000000006d', '3B', 'published', 9),
  ('10000000-0000-4000-8000-0000000000d2', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.566,0.433],[0.694,0.433],[0.694,0.527],[0.566,0.527]]'::jsonb, 'unit', '10000000-0000-4000-8000-00000000006e', '3C', 'published', 10),
  ('10000000-0000-4000-8000-0000000000d3', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.766,0.433],[0.894,0.433],[0.894,0.527],[0.766,0.527]]'::jsonb, 'unit', '10000000-0000-4000-8000-00000000006f', '3D', 'published', 11),
  ('10000000-0000-4000-8000-0000000000cc', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.166,0.583],[0.294,0.583],[0.294,0.677],[0.166,0.677]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000068', '2A', 'published', 4),
  ('10000000-0000-4000-8000-0000000000cd', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.366,0.583],[0.494,0.583],[0.494,0.677],[0.366,0.677]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000069', '2B', 'published', 5),
  ('10000000-0000-4000-8000-0000000000ce', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.566,0.583],[0.694,0.583],[0.694,0.677],[0.566,0.677]]'::jsonb, 'unit', '10000000-0000-4000-8000-00000000006a', '2C', 'published', 6),
  ('10000000-0000-4000-8000-0000000000cf', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.766,0.583],[0.894,0.583],[0.894,0.677],[0.766,0.677]]'::jsonb, 'unit', '10000000-0000-4000-8000-00000000006b', '2D', 'published', 7),
  ('10000000-0000-4000-8000-0000000000c8', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.166,0.733],[0.294,0.733],[0.294,0.827],[0.166,0.827]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000064', '1A', 'published', 0),
  ('10000000-0000-4000-8000-0000000000c9', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.366,0.733],[0.494,0.733],[0.494,0.827],[0.366,0.827]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000065', '1B', 'published', 1),
  ('10000000-0000-4000-8000-0000000000ca', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.566,0.733],[0.694,0.733],[0.694,0.827],[0.566,0.827]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000066', '1C', 'published', 2),
  ('10000000-0000-4000-8000-0000000000cb', '10000000-0000-4000-8000-000000000014', 'facade', null, 'polygon', '[[0.766,0.733],[0.894,0.733],[0.894,0.827],[0.766,0.827]]'::jsonb, 'unit', '10000000-0000-4000-8000-000000000067', '1D', 'published', 3);

insert into public.leads (id, project_id, unit_id, nombre, email, telefono, mensaje, canal, estado, assigned_to, utm, fuente, session_id, visitor_id, created_at, updated_at)
values
  ('10000000-0000-4000-8000-0000000001f4', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000068', 'Valentina Ortiz', 'valentina.ortiz@example.com', '+54 9 341 555-2010', 'Señó la 2A la semana pasada.', 'form', 'reserva', '10000000-0000-4000-8000-000000000003', '{"utm_source":"meta","utm_medium":"paid","utm_campaign":"preventa_oct"}'::jsonb, 'Meta Ads', 'seed-session-reserva', 'seed-visitor-reserva', now() - interval '720000 seconds', now() - interval '648000 seconds'),
  ('10000000-0000-4000-8000-0000000001f5', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000006e', 'Hernán Paz', 'hernan.paz@example.com', '+54 9 341 555-2011', 'Compró la 3C de contado.', 'form', 'venta', '10000000-0000-4000-8000-000000000003', '{"utm_source":"google","utm_medium":"cpc","utm_campaign":"search_marca"}'::jsonb, 'Google Ads', 'seed-session-venta', 'seed-visitor-venta', now() - interval '1440000 seconds', now() - interval '1080000 seconds'),
  ('10000000-0000-4000-8000-0000000001f6', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000067', 'Ana López', 'ana.lopez@example.com', '+54 9 341 555-2001', 'Quiere reservar la 1D. Seña el lunes por transferencia.', 'form', 'nuevo', '10000000-0000-4000-8000-000000000003', '{"utm_source":"meta","utm_medium":"paid","utm_campaign":"preventa_oct"}'::jsonb, 'Meta Ads', 'seed-session-1d', 'seed-visitor-1d', now() - interval '10800 seconds', now() - interval '7200 seconds'),
  ('10000000-0000-4000-8000-0000000001f7', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000006a', 'Juan Pérez', 'juan.perez@example.com', '+54 9 341 555-2002', 'Oferta de contado por la 2C.', 'form', 'contactado', '10000000-0000-4000-8000-000000000003', '{"utm_source":"google","utm_medium":"cpc","utm_campaign":"search_marca"}'::jsonb, 'Google Ads', 'seed-session-2c', 'seed-visitor-2c', now() - interval '165600 seconds', now() - interval '162000 seconds'),
  ('10000000-0000-4000-8000-0000000001fe', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000070', 'Camila Torres', 'camila.torres@example.com', '+54 9 341 555-2001', 'Hola, quiero saber más de la 4A.', 'form', 'nuevo', null, '{"utm_source":"meta","utm_medium":"paid","utm_campaign":"preventa_oct"}'::jsonb, 'Meta Ads', 'seed-lead-0', 'seed-visitor-lead-0', now() - interval '18000 seconds', now() - interval '18000 seconds'),
  ('10000000-0000-4000-8000-0000000001ff', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000075', 'Juan Pérez', 'juan.perez@example.com', '+54 9 341 555-2002', 'Hola, quiero saber más de la 5B.', 'form', 'contactado', '10000000-0000-4000-8000-000000000003', '{"utm_source":"google","utm_medium":"cpc","utm_campaign":"search_marca"}'::jsonb, 'Google Ads', 'seed-lead-1', 'seed-visitor-lead-1', now() - interval '72000 seconds', now() - interval '72000 seconds'),
  ('10000000-0000-4000-8000-000000000200', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000069', 'Marina Díaz', 'marina.diaz@example.com', '+54 9 341 555-2003', 'Hola, quiero saber más de la 2B.', 'form', 'visita', '10000000-0000-4000-8000-000000000003', '{"utm_source":"meta","utm_medium":"paid","utm_campaign":"preventa_oct"}'::jsonb, 'Meta Ads', 'seed-lead-2', 'seed-visitor-lead-2', now() - interval '144000 seconds', now() - interval '144000 seconds'),
  ('10000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000064', 'Carlos Benítez', 'carlos.benitez@example.com', '+54 9 341 555-2004', 'Hola, quiero saber más de la 1A.', 'form', 'nuevo', null, '{"utm_source":"","utm_medium":""}'::jsonb, 'Directo', 'seed-lead-3', 'seed-visitor-lead-3', now() - interval '252000 seconds', now() - interval '252000 seconds'),
  ('10000000-0000-4000-8000-000000000202', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000006d', 'Lucía Romero', 'lucia.romero@example.com', '+54 9 341 555-2005', 'Hola, quiero saber más de la 3B.', 'form', 'contactado', '10000000-0000-4000-8000-000000000003', '{"utm_source":"google","utm_medium":"organic"}'::jsonb, 'Orgánico', 'seed-lead-4', 'seed-visitor-lead-4', now() - interval '324000 seconds', now() - interval '324000 seconds'),
  ('10000000-0000-4000-8000-000000000203', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000071', 'Diego Funes', 'diego.funes@example.com', '+54 9 341 555-2006', 'Hola, quiero saber más de la 4B.', 'whatsapp', 'nuevo', '10000000-0000-4000-8000-000000000003', '{"utm_source":"whatsapp","utm_medium":""}'::jsonb, 'WhatsApp', 'seed-lead-5', 'seed-visitor-lead-5', now() - interval '432000 seconds', now() - interval '432000 seconds');

insert into public.unit_prices (unit_id, price_list_id, precio)
values
  ('10000000-0000-4000-8000-000000000074', '10000000-0000-4000-8000-000000000032', 159000),
  ('10000000-0000-4000-8000-000000000075', '10000000-0000-4000-8000-000000000032', 156000),
  ('10000000-0000-4000-8000-000000000076', '10000000-0000-4000-8000-000000000032', 190000),
  ('10000000-0000-4000-8000-000000000077', '10000000-0000-4000-8000-000000000032', 190000),
  ('10000000-0000-4000-8000-000000000070', '10000000-0000-4000-8000-000000000032', 154500),
  ('10000000-0000-4000-8000-000000000071', '10000000-0000-4000-8000-000000000032', 151500),
  ('10000000-0000-4000-8000-000000000072', '10000000-0000-4000-8000-000000000032', 185500),
  ('10000000-0000-4000-8000-000000000073', '10000000-0000-4000-8000-000000000032', 185500),
  ('10000000-0000-4000-8000-00000000006c', '10000000-0000-4000-8000-000000000032', 150000),
  ('10000000-0000-4000-8000-00000000006d', '10000000-0000-4000-8000-000000000032', 147000),
  ('10000000-0000-4000-8000-00000000006e', '10000000-0000-4000-8000-000000000032', 181000),
  ('10000000-0000-4000-8000-00000000006f', '10000000-0000-4000-8000-000000000032', 181000),
  ('10000000-0000-4000-8000-000000000068', '10000000-0000-4000-8000-000000000032', 145500),
  ('10000000-0000-4000-8000-000000000069', '10000000-0000-4000-8000-000000000032', 142500),
  ('10000000-0000-4000-8000-00000000006a', '10000000-0000-4000-8000-000000000032', 176500),
  ('10000000-0000-4000-8000-00000000006b', '10000000-0000-4000-8000-000000000032', 176500),
  ('10000000-0000-4000-8000-000000000064', '10000000-0000-4000-8000-000000000032', 141000),
  ('10000000-0000-4000-8000-000000000065', '10000000-0000-4000-8000-000000000032', 138000),
  ('10000000-0000-4000-8000-000000000066', '10000000-0000-4000-8000-000000000032', 172000),
  ('10000000-0000-4000-8000-000000000067', '10000000-0000-4000-8000-000000000032', 172000);

insert into public.status_change_requests (id, project_id, unit_id, tipo, estado_desde, estado_hacia, requested_by, lead_id, price_list_id, payment_plan_id, monto_sena, moneda_sena, comentario_vendedor, estado, expires_at, extended_count, decided_by, decided_at, comentario_admin, unit_version_at_request, reverted, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000258', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000067', 'reserve', 'disponible', 'reservada', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-0000000001f6', '10000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-00000000003c', 5000, 'USD', 'La clienta confirma la seña el lunes por transferencia.', 'pending', now() + interval '165600 seconds', 0, null, null, null, 1, false, now() - interval '7200 seconds', now() - interval '7200 seconds'),
  ('10000000-0000-4000-8000-000000000259', '10000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-00000000006a', 'sell', 'disponible', 'vendida', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-0000000001f7', '10000000-0000-4000-8000-000000000032', null, null, null, 'Oferta de contado. Pide boleto esta semana.', 'pending', now() + interval '10800 seconds', 0, null, null, null, 1, false, now() - interval '162000 seconds', now() - interval '162000 seconds');

insert into public.status_change_request_events (id, request_id, tipo, user_id, detalle, created_at)
values
  ('10000000-0000-4000-8000-000000000262', '10000000-0000-4000-8000-000000000258', 'created', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, now() - interval '7200 seconds'),
  ('10000000-0000-4000-8000-000000000263', '10000000-0000-4000-8000-000000000259', 'created', '10000000-0000-4000-8000-000000000003', '{}'::jsonb, now() - interval '162000 seconds');

insert into public.notifications (id, user_id, organization_id, project_id, tipo, titulo, cuerpo, entidad, entidad_id, canal, leida, created_at)
values
  ('10000000-0000-4000-8000-000000000321', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000014', 'status_request', 'Nueva solicitud de reserva', 'Laura Gómez pidió reservar la unidad 1D.', 'status_change_request', '10000000-0000-4000-8000-000000000258', 'panel', false, now() - interval '7200 seconds'),
  ('10000000-0000-4000-8000-000000000322', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000014', 'status_request', 'Nueva solicitud de venta', 'Laura Gómez pidió vender la unidad 2C. Vence en pocas horas.', 'status_change_request', '10000000-0000-4000-8000-000000000259', 'panel', false, now() - interval '162000 seconds');

insert into public.change_log (id, project_id, change_set_id, user_id, requested_by, request_id, entidad, entidad_id, campo, valor_anterior, valor_nuevo, origen, created_at)
values
  ('10000000-0000-4000-8000-0000000002bc', '10000000-0000-4000-8000-000000000014', null, '10000000-0000-4000-8000-000000000002', null, null, 'unit', '10000000-0000-4000-8000-00000000006c', 'orientacion', '"NE"'::jsonb, '"Norte"'::jsonb, 'edit', now() - interval '108000 seconds');

insert into public.events (id, project_id, visitor_id, session_id, nombre, props, unit_id, device, utm_source, utm_medium, utm_campaign, referrer_tipo, fuente, ts)
values
  ('10000000-0000-4000-8000-0000000007d0', '10000000-0000-4000-8000-000000000014', 'seed-v-15', 'seed-s-0', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '757198 seconds'),
  ('10000000-0000-4000-8000-0000000007d1', '10000000-0000-4000-8000-000000000014', 'seed-v-15', 'seed-s-0', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '757198 seconds'),
  ('10000000-0000-4000-8000-0000000007d2', '10000000-0000-4000-8000-000000000014', 'seed-v-15', 'seed-s-0', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000066', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '757158 seconds'),
  ('10000000-0000-4000-8000-0000000007d3', '10000000-0000-4000-8000-000000000014', 'seed-v-15', 'seed-s-0', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000066', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '757118 seconds'),
  ('10000000-0000-4000-8000-0000000007d4', '10000000-0000-4000-8000-000000000014', 'seed-v-30', 'seed-s-1', 'session_start', '{}'::jsonb, null, 'mobile', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '841258 seconds'),
  ('10000000-0000-4000-8000-0000000007d5', '10000000-0000-4000-8000-000000000014', 'seed-v-30', 'seed-s-1', 'page_view', '{}'::jsonb, null, 'mobile', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '841258 seconds'),
  ('10000000-0000-4000-8000-0000000007d6', '10000000-0000-4000-8000-000000000014', 'seed-v-2', 'seed-s-2', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '313390 seconds'),
  ('10000000-0000-4000-8000-0000000007d7', '10000000-0000-4000-8000-000000000014', 'seed-v-2', 'seed-s-2', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '313390 seconds'),
  ('10000000-0000-4000-8000-0000000007d8', '10000000-0000-4000-8000-000000000014', 'seed-v-2', 'seed-s-2', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000064', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '313350 seconds'),
  ('10000000-0000-4000-8000-0000000007d9', '10000000-0000-4000-8000-000000000014', 'seed-v-42', 'seed-s-3', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1610003 seconds'),
  ('10000000-0000-4000-8000-0000000007da', '10000000-0000-4000-8000-000000000014', 'seed-v-42', 'seed-s-3', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1610003 seconds'),
  ('10000000-0000-4000-8000-0000000007db', '10000000-0000-4000-8000-000000000014', 'seed-v-42', 'seed-s-3', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000068', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1609963 seconds'),
  ('10000000-0000-4000-8000-0000000007dc', '10000000-0000-4000-8000-000000000014', 'seed-v-42', 'seed-s-3', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000068', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1609923 seconds'),
  ('10000000-0000-4000-8000-0000000007dd', '10000000-0000-4000-8000-000000000014', 'seed-v-56', 'seed-s-4', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '712065 seconds'),
  ('10000000-0000-4000-8000-0000000007de', '10000000-0000-4000-8000-000000000014', 'seed-v-56', 'seed-s-4', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '712065 seconds'),
  ('10000000-0000-4000-8000-0000000007df', '10000000-0000-4000-8000-000000000014', 'seed-v-56', 'seed-s-4', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000077', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '712025 seconds'),
  ('10000000-0000-4000-8000-0000000007e0', '10000000-0000-4000-8000-000000000014', 'seed-v-59', 'seed-s-5', 'session_start', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '165126 seconds'),
  ('10000000-0000-4000-8000-0000000007e1', '10000000-0000-4000-8000-000000000014', 'seed-v-59', 'seed-s-5', 'page_view', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '165126 seconds'),
  ('10000000-0000-4000-8000-0000000007e2', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-6', 'session_start', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '722210 seconds'),
  ('10000000-0000-4000-8000-0000000007e3', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-6', 'page_view', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '722210 seconds'),
  ('10000000-0000-4000-8000-0000000007e4', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-7', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '879038 seconds'),
  ('10000000-0000-4000-8000-0000000007e5', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-7', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '879038 seconds'),
  ('10000000-0000-4000-8000-0000000007e6', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-8', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '694406 seconds'),
  ('10000000-0000-4000-8000-0000000007e7', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-8', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '694406 seconds'),
  ('10000000-0000-4000-8000-0000000007e8', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-8', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000071', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '694366 seconds'),
  ('10000000-0000-4000-8000-0000000007e9', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-9', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '104100 seconds'),
  ('10000000-0000-4000-8000-0000000007ea', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-9', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '104100 seconds'),
  ('10000000-0000-4000-8000-0000000007eb', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-9', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000074', 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '104060 seconds'),
  ('10000000-0000-4000-8000-0000000007ec', '10000000-0000-4000-8000-000000000014', 'seed-v-9', 'seed-s-10', 'session_start', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '1221183 seconds'),
  ('10000000-0000-4000-8000-0000000007ed', '10000000-0000-4000-8000-000000000014', 'seed-v-9', 'seed-s-10', 'page_view', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '1221183 seconds'),
  ('10000000-0000-4000-8000-0000000007ee', '10000000-0000-4000-8000-000000000014', 'seed-v-17', 'seed-s-11', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '508978 seconds'),
  ('10000000-0000-4000-8000-0000000007ef', '10000000-0000-4000-8000-000000000014', 'seed-v-17', 'seed-s-11', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '508978 seconds'),
  ('10000000-0000-4000-8000-0000000007f0', '10000000-0000-4000-8000-000000000014', 'seed-v-17', 'seed-s-11', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000069', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '508938 seconds'),
  ('10000000-0000-4000-8000-0000000007f1', '10000000-0000-4000-8000-000000000014', 'seed-v-1', 'seed-s-12', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '762416 seconds'),
  ('10000000-0000-4000-8000-0000000007f2', '10000000-0000-4000-8000-000000000014', 'seed-v-1', 'seed-s-12', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '762416 seconds'),
  ('10000000-0000-4000-8000-0000000007f3', '10000000-0000-4000-8000-000000000014', 'seed-v-1', 'seed-s-12', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000070', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '762376 seconds'),
  ('10000000-0000-4000-8000-0000000007f4', '10000000-0000-4000-8000-000000000014', 'seed-v-53', 'seed-s-13', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '990706 seconds'),
  ('10000000-0000-4000-8000-0000000007f5', '10000000-0000-4000-8000-000000000014', 'seed-v-53', 'seed-s-13', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '990706 seconds'),
  ('10000000-0000-4000-8000-0000000007f6', '10000000-0000-4000-8000-000000000014', 'seed-v-37', 'seed-s-14', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '936521 seconds'),
  ('10000000-0000-4000-8000-0000000007f7', '10000000-0000-4000-8000-000000000014', 'seed-v-37', 'seed-s-14', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '936521 seconds'),
  ('10000000-0000-4000-8000-0000000007f8', '10000000-0000-4000-8000-000000000014', 'seed-v-5', 'seed-s-15', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '935795 seconds'),
  ('10000000-0000-4000-8000-0000000007f9', '10000000-0000-4000-8000-000000000014', 'seed-v-5', 'seed-s-15', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '935795 seconds'),
  ('10000000-0000-4000-8000-0000000007fa', '10000000-0000-4000-8000-000000000014', 'seed-v-53', 'seed-s-16', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '998147 seconds'),
  ('10000000-0000-4000-8000-0000000007fb', '10000000-0000-4000-8000-000000000014', 'seed-v-53', 'seed-s-16', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '998147 seconds'),
  ('10000000-0000-4000-8000-0000000007fc', '10000000-0000-4000-8000-000000000014', 'seed-v-53', 'seed-s-16', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '998107 seconds'),
  ('10000000-0000-4000-8000-0000000007fd', '10000000-0000-4000-8000-000000000014', 'seed-v-53', 'seed-s-16', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '998067 seconds'),
  ('10000000-0000-4000-8000-0000000007fe', '10000000-0000-4000-8000-000000000014', 'seed-v-13', 'seed-s-17', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '540976 seconds'),
  ('10000000-0000-4000-8000-0000000007ff', '10000000-0000-4000-8000-000000000014', 'seed-v-13', 'seed-s-17', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '540976 seconds'),
  ('10000000-0000-4000-8000-000000000800', '10000000-0000-4000-8000-000000000014', 'seed-v-13', 'seed-s-17', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000070', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '540936 seconds'),
  ('10000000-0000-4000-8000-000000000801', '10000000-0000-4000-8000-000000000014', 'seed-v-13', 'seed-s-17', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000070', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '540896 seconds'),
  ('10000000-0000-4000-8000-000000000802', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-18', 'session_start', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '1790406 seconds'),
  ('10000000-0000-4000-8000-000000000803', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-18', 'page_view', '{}'::jsonb, null, 'desktop', null, null, null, 'Directo', 'Directo', now() - interval '1790406 seconds'),
  ('10000000-0000-4000-8000-000000000804', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-19', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '966154 seconds'),
  ('10000000-0000-4000-8000-000000000805', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-19', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '966154 seconds'),
  ('10000000-0000-4000-8000-000000000806', '10000000-0000-4000-8000-000000000014', 'seed-v-14', 'seed-s-20', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1049266 seconds'),
  ('10000000-0000-4000-8000-000000000807', '10000000-0000-4000-8000-000000000014', 'seed-v-14', 'seed-s-20', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1049266 seconds'),
  ('10000000-0000-4000-8000-000000000808', '10000000-0000-4000-8000-000000000014', 'seed-v-14', 'seed-s-20', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000068', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1049226 seconds'),
  ('10000000-0000-4000-8000-000000000809', '10000000-0000-4000-8000-000000000014', 'seed-v-59', 'seed-s-21', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '181142 seconds'),
  ('10000000-0000-4000-8000-00000000080a', '10000000-0000-4000-8000-000000000014', 'seed-v-59', 'seed-s-21', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '181142 seconds'),
  ('10000000-0000-4000-8000-00000000080b', '10000000-0000-4000-8000-000000000014', 'seed-v-38', 'seed-s-22', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '889419 seconds'),
  ('10000000-0000-4000-8000-00000000080c', '10000000-0000-4000-8000-000000000014', 'seed-v-38', 'seed-s-22', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '889419 seconds'),
  ('10000000-0000-4000-8000-00000000080d', '10000000-0000-4000-8000-000000000014', 'seed-v-6', 'seed-s-23', 'session_start', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '1202156 seconds'),
  ('10000000-0000-4000-8000-00000000080e', '10000000-0000-4000-8000-000000000014', 'seed-v-6', 'seed-s-23', 'page_view', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '1202156 seconds'),
  ('10000000-0000-4000-8000-00000000080f', '10000000-0000-4000-8000-000000000014', 'seed-v-51', 'seed-s-24', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1451924 seconds'),
  ('10000000-0000-4000-8000-000000000810', '10000000-0000-4000-8000-000000000014', 'seed-v-51', 'seed-s-24', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1451924 seconds'),
  ('10000000-0000-4000-8000-000000000811', '10000000-0000-4000-8000-000000000014', 'seed-v-51', 'seed-s-24', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006e', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1451884 seconds'),
  ('10000000-0000-4000-8000-000000000812', '10000000-0000-4000-8000-000000000014', 'seed-v-50', 'seed-s-25', 'session_start', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '984351 seconds'),
  ('10000000-0000-4000-8000-000000000813', '10000000-0000-4000-8000-000000000014', 'seed-v-50', 'seed-s-25', 'page_view', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '984351 seconds'),
  ('10000000-0000-4000-8000-000000000814', '10000000-0000-4000-8000-000000000014', 'seed-v-50', 'seed-s-25', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006a', 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '984311 seconds'),
  ('10000000-0000-4000-8000-000000000815', '10000000-0000-4000-8000-000000000014', 'seed-v-25', 'seed-s-26', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '644174 seconds'),
  ('10000000-0000-4000-8000-000000000816', '10000000-0000-4000-8000-000000000014', 'seed-v-25', 'seed-s-26', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '644174 seconds'),
  ('10000000-0000-4000-8000-000000000817', '10000000-0000-4000-8000-000000000014', 'seed-v-25', 'seed-s-26', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000071', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '644134 seconds'),
  ('10000000-0000-4000-8000-000000000818', '10000000-0000-4000-8000-000000000014', 'seed-v-25', 'seed-s-26', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000071', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '644094 seconds'),
  ('10000000-0000-4000-8000-000000000819', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-27', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1014318 seconds'),
  ('10000000-0000-4000-8000-00000000081a', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-27', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1014318 seconds'),
  ('10000000-0000-4000-8000-00000000081b', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-27', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000070', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1014278 seconds'),
  ('10000000-0000-4000-8000-00000000081c', '10000000-0000-4000-8000-000000000014', 'seed-v-40', 'seed-s-28', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '582383 seconds'),
  ('10000000-0000-4000-8000-00000000081d', '10000000-0000-4000-8000-000000000014', 'seed-v-40', 'seed-s-28', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '582383 seconds'),
  ('10000000-0000-4000-8000-00000000081e', '10000000-0000-4000-8000-000000000014', 'seed-v-32', 'seed-s-29', 'session_start', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '805406 seconds'),
  ('10000000-0000-4000-8000-00000000081f', '10000000-0000-4000-8000-000000000014', 'seed-v-32', 'seed-s-29', 'page_view', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '805406 seconds'),
  ('10000000-0000-4000-8000-000000000820', '10000000-0000-4000-8000-000000000014', 'seed-v-32', 'seed-s-29', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000077', 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '805366 seconds'),
  ('10000000-0000-4000-8000-000000000821', '10000000-0000-4000-8000-000000000014', 'seed-v-6', 'seed-s-30', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1593053 seconds'),
  ('10000000-0000-4000-8000-000000000822', '10000000-0000-4000-8000-000000000014', 'seed-v-6', 'seed-s-30', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1593053 seconds'),
  ('10000000-0000-4000-8000-000000000823', '10000000-0000-4000-8000-000000000014', 'seed-v-6', 'seed-s-30', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006a', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1593013 seconds'),
  ('10000000-0000-4000-8000-000000000824', '10000000-0000-4000-8000-000000000014', 'seed-v-25', 'seed-s-31', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1319967 seconds'),
  ('10000000-0000-4000-8000-000000000825', '10000000-0000-4000-8000-000000000014', 'seed-v-25', 'seed-s-31', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1319967 seconds'),
  ('10000000-0000-4000-8000-000000000826', '10000000-0000-4000-8000-000000000014', 'seed-v-8', 'seed-s-32', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '917536 seconds'),
  ('10000000-0000-4000-8000-000000000827', '10000000-0000-4000-8000-000000000014', 'seed-v-8', 'seed-s-32', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '917536 seconds'),
  ('10000000-0000-4000-8000-000000000828', '10000000-0000-4000-8000-000000000014', 'seed-v-8', 'seed-s-32', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000077', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '917496 seconds'),
  ('10000000-0000-4000-8000-000000000829', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-33', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '333891 seconds'),
  ('10000000-0000-4000-8000-00000000082a', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-33', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '333891 seconds'),
  ('10000000-0000-4000-8000-00000000082b', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-33', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000064', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '333851 seconds'),
  ('10000000-0000-4000-8000-00000000082c', '10000000-0000-4000-8000-000000000014', 'seed-v-67', 'seed-s-34', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '708614 seconds'),
  ('10000000-0000-4000-8000-00000000082d', '10000000-0000-4000-8000-000000000014', 'seed-v-67', 'seed-s-34', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '708614 seconds'),
  ('10000000-0000-4000-8000-00000000082e', '10000000-0000-4000-8000-000000000014', 'seed-v-60', 'seed-s-35', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '362795 seconds'),
  ('10000000-0000-4000-8000-00000000082f', '10000000-0000-4000-8000-000000000014', 'seed-v-60', 'seed-s-35', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '362795 seconds'),
  ('10000000-0000-4000-8000-000000000830', '10000000-0000-4000-8000-000000000014', 'seed-v-60', 'seed-s-35', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000065', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '362755 seconds'),
  ('10000000-0000-4000-8000-000000000831', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-36', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '105959 seconds'),
  ('10000000-0000-4000-8000-000000000832', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-36', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '105959 seconds'),
  ('10000000-0000-4000-8000-000000000833', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-37', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '789387 seconds'),
  ('10000000-0000-4000-8000-000000000834', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-37', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '789387 seconds'),
  ('10000000-0000-4000-8000-000000000835', '10000000-0000-4000-8000-000000000014', 'seed-v-33', 'seed-s-37', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000073', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '789347 seconds'),
  ('10000000-0000-4000-8000-000000000836', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-38', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '908547 seconds'),
  ('10000000-0000-4000-8000-000000000837', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-38', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '908547 seconds'),
  ('10000000-0000-4000-8000-000000000838', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-38', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006b', 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '908507 seconds'),
  ('10000000-0000-4000-8000-000000000839', '10000000-0000-4000-8000-000000000014', 'seed-v-45', 'seed-s-39', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '136537 seconds'),
  ('10000000-0000-4000-8000-00000000083a', '10000000-0000-4000-8000-000000000014', 'seed-v-45', 'seed-s-39', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '136537 seconds'),
  ('10000000-0000-4000-8000-00000000083b', '10000000-0000-4000-8000-000000000014', 'seed-v-45', 'seed-s-39', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000065', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '136497 seconds'),
  ('10000000-0000-4000-8000-00000000083c', '10000000-0000-4000-8000-000000000014', 'seed-v-45', 'seed-s-39', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000065', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '136457 seconds'),
  ('10000000-0000-4000-8000-00000000083d', '10000000-0000-4000-8000-000000000014', 'seed-v-57', 'seed-s-40', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '720295 seconds'),
  ('10000000-0000-4000-8000-00000000083e', '10000000-0000-4000-8000-000000000014', 'seed-v-57', 'seed-s-40', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '720295 seconds'),
  ('10000000-0000-4000-8000-00000000083f', '10000000-0000-4000-8000-000000000014', 'seed-v-57', 'seed-s-40', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000074', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '720255 seconds'),
  ('10000000-0000-4000-8000-000000000840', '10000000-0000-4000-8000-000000000014', 'seed-v-46', 'seed-s-41', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1070152 seconds'),
  ('10000000-0000-4000-8000-000000000841', '10000000-0000-4000-8000-000000000014', 'seed-v-46', 'seed-s-41', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1070152 seconds'),
  ('10000000-0000-4000-8000-000000000842', '10000000-0000-4000-8000-000000000014', 'seed-v-28', 'seed-s-42', 'session_start', '{}'::jsonb, null, 'desktop', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '1186612 seconds'),
  ('10000000-0000-4000-8000-000000000843', '10000000-0000-4000-8000-000000000014', 'seed-v-28', 'seed-s-42', 'page_view', '{}'::jsonb, null, 'desktop', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '1186612 seconds'),
  ('10000000-0000-4000-8000-000000000844', '10000000-0000-4000-8000-000000000014', 'seed-v-28', 'seed-s-42', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000071', 'desktop', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '1186572 seconds'),
  ('10000000-0000-4000-8000-000000000845', '10000000-0000-4000-8000-000000000014', 'seed-v-40', 'seed-s-43', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '189471 seconds'),
  ('10000000-0000-4000-8000-000000000846', '10000000-0000-4000-8000-000000000014', 'seed-v-40', 'seed-s-43', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '189471 seconds'),
  ('10000000-0000-4000-8000-000000000847', '10000000-0000-4000-8000-000000000014', 'seed-v-47', 'seed-s-44', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '921104 seconds'),
  ('10000000-0000-4000-8000-000000000848', '10000000-0000-4000-8000-000000000014', 'seed-v-47', 'seed-s-44', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '921104 seconds'),
  ('10000000-0000-4000-8000-000000000849', '10000000-0000-4000-8000-000000000014', 'seed-v-11', 'seed-s-45', 'session_start', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '1386545 seconds'),
  ('10000000-0000-4000-8000-00000000084a', '10000000-0000-4000-8000-000000000014', 'seed-v-11', 'seed-s-45', 'page_view', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '1386545 seconds'),
  ('10000000-0000-4000-8000-00000000084b', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-46', 'session_start', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '864507 seconds'),
  ('10000000-0000-4000-8000-00000000084c', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-46', 'page_view', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '864507 seconds'),
  ('10000000-0000-4000-8000-00000000084d', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-46', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '864467 seconds'),
  ('10000000-0000-4000-8000-00000000084e', '10000000-0000-4000-8000-000000000014', 'seed-v-16', 'seed-s-47', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1087224 seconds'),
  ('10000000-0000-4000-8000-00000000084f', '10000000-0000-4000-8000-000000000014', 'seed-v-16', 'seed-s-47', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1087224 seconds'),
  ('10000000-0000-4000-8000-000000000850', '10000000-0000-4000-8000-000000000014', 'seed-v-16', 'seed-s-47', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1087184 seconds'),
  ('10000000-0000-4000-8000-000000000851', '10000000-0000-4000-8000-000000000014', 'seed-v-16', 'seed-s-47', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1087144 seconds'),
  ('10000000-0000-4000-8000-000000000852', '10000000-0000-4000-8000-000000000014', 'seed-v-35', 'seed-s-48', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1589633 seconds'),
  ('10000000-0000-4000-8000-000000000853', '10000000-0000-4000-8000-000000000014', 'seed-v-35', 'seed-s-48', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1589633 seconds'),
  ('10000000-0000-4000-8000-000000000854', '10000000-0000-4000-8000-000000000014', 'seed-v-35', 'seed-s-48', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000069', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1589593 seconds'),
  ('10000000-0000-4000-8000-000000000855', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-49', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '203432 seconds'),
  ('10000000-0000-4000-8000-000000000856', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-49', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '203432 seconds'),
  ('10000000-0000-4000-8000-000000000857', '10000000-0000-4000-8000-000000000014', 'seed-v-65', 'seed-s-49', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006d', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '203392 seconds'),
  ('10000000-0000-4000-8000-000000000858', '10000000-0000-4000-8000-000000000014', 'seed-v-31', 'seed-s-50', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1706214 seconds'),
  ('10000000-0000-4000-8000-000000000859', '10000000-0000-4000-8000-000000000014', 'seed-v-31', 'seed-s-50', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1706214 seconds'),
  ('10000000-0000-4000-8000-00000000085a', '10000000-0000-4000-8000-000000000014', 'seed-v-31', 'seed-s-50', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1706174 seconds'),
  ('10000000-0000-4000-8000-00000000085b', '10000000-0000-4000-8000-000000000014', 'seed-v-31', 'seed-s-50', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1706134 seconds'),
  ('10000000-0000-4000-8000-00000000085c', '10000000-0000-4000-8000-000000000014', 'seed-v-49', 'seed-s-51', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '37534 seconds'),
  ('10000000-0000-4000-8000-00000000085d', '10000000-0000-4000-8000-000000000014', 'seed-v-49', 'seed-s-51', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '37534 seconds'),
  ('10000000-0000-4000-8000-00000000085e', '10000000-0000-4000-8000-000000000014', 'seed-v-49', 'seed-s-51', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000072', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '37494 seconds'),
  ('10000000-0000-4000-8000-00000000085f', '10000000-0000-4000-8000-000000000014', 'seed-v-56', 'seed-s-52', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1152313 seconds'),
  ('10000000-0000-4000-8000-000000000860', '10000000-0000-4000-8000-000000000014', 'seed-v-56', 'seed-s-52', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1152313 seconds'),
  ('10000000-0000-4000-8000-000000000861', '10000000-0000-4000-8000-000000000014', 'seed-v-56', 'seed-s-52', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '1152273 seconds'),
  ('10000000-0000-4000-8000-000000000862', '10000000-0000-4000-8000-000000000014', 'seed-v-46', 'seed-s-53', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '252864 seconds'),
  ('10000000-0000-4000-8000-000000000863', '10000000-0000-4000-8000-000000000014', 'seed-v-46', 'seed-s-53', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '252864 seconds'),
  ('10000000-0000-4000-8000-000000000864', '10000000-0000-4000-8000-000000000014', 'seed-v-46', 'seed-s-53', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000070', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '252824 seconds'),
  ('10000000-0000-4000-8000-000000000865', '10000000-0000-4000-8000-000000000014', 'seed-v-40', 'seed-s-54', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '130972 seconds'),
  ('10000000-0000-4000-8000-000000000866', '10000000-0000-4000-8000-000000000014', 'seed-v-40', 'seed-s-54', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '130972 seconds'),
  ('10000000-0000-4000-8000-000000000867', '10000000-0000-4000-8000-000000000014', 'seed-v-40', 'seed-s-54', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000070', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '130932 seconds'),
  ('10000000-0000-4000-8000-000000000868', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-55', 'session_start', '{}'::jsonb, null, 'mobile', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '1023760 seconds'),
  ('10000000-0000-4000-8000-000000000869', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-55', 'page_view', '{}'::jsonb, null, 'mobile', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '1023760 seconds'),
  ('10000000-0000-4000-8000-00000000086a', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-55', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000071', 'mobile', 'whatsapp', 'referral', null, 'WhatsApp', 'WhatsApp', now() - interval '1023720 seconds'),
  ('10000000-0000-4000-8000-00000000086b', '10000000-0000-4000-8000-000000000014', 'seed-v-61', 'seed-s-56', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1012062 seconds'),
  ('10000000-0000-4000-8000-00000000086c', '10000000-0000-4000-8000-000000000014', 'seed-v-61', 'seed-s-56', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1012062 seconds'),
  ('10000000-0000-4000-8000-00000000086d', '10000000-0000-4000-8000-000000000014', 'seed-v-61', 'seed-s-56', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1012022 seconds'),
  ('10000000-0000-4000-8000-00000000086e', '10000000-0000-4000-8000-000000000014', 'seed-v-58', 'seed-s-57', 'session_start', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '330903 seconds'),
  ('10000000-0000-4000-8000-00000000086f', '10000000-0000-4000-8000-000000000014', 'seed-v-58', 'seed-s-57', 'page_view', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '330903 seconds'),
  ('10000000-0000-4000-8000-000000000870', '10000000-0000-4000-8000-000000000014', 'seed-v-26', 'seed-s-58', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '952206 seconds'),
  ('10000000-0000-4000-8000-000000000871', '10000000-0000-4000-8000-000000000014', 'seed-v-26', 'seed-s-58', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '952206 seconds'),
  ('10000000-0000-4000-8000-000000000872', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-59', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1248640 seconds'),
  ('10000000-0000-4000-8000-000000000873', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-59', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1248640 seconds'),
  ('10000000-0000-4000-8000-000000000874', '10000000-0000-4000-8000-000000000014', 'seed-v-48', 'seed-s-59', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000070', 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1248600 seconds'),
  ('10000000-0000-4000-8000-000000000875', '10000000-0000-4000-8000-000000000014', 'seed-v-69', 'seed-s-60', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1080457 seconds'),
  ('10000000-0000-4000-8000-000000000876', '10000000-0000-4000-8000-000000000014', 'seed-v-69', 'seed-s-60', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1080457 seconds'),
  ('10000000-0000-4000-8000-000000000877', '10000000-0000-4000-8000-000000000014', 'seed-v-69', 'seed-s-60', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000069', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1080417 seconds'),
  ('10000000-0000-4000-8000-000000000878', '10000000-0000-4000-8000-000000000014', 'seed-v-10', 'seed-s-61', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '827795 seconds'),
  ('10000000-0000-4000-8000-000000000879', '10000000-0000-4000-8000-000000000014', 'seed-v-10', 'seed-s-61', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '827795 seconds'),
  ('10000000-0000-4000-8000-00000000087a', '10000000-0000-4000-8000-000000000014', 'seed-v-10', 'seed-s-61', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '827755 seconds'),
  ('10000000-0000-4000-8000-00000000087b', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-62', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1353557 seconds'),
  ('10000000-0000-4000-8000-00000000087c', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-62', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1353557 seconds'),
  ('10000000-0000-4000-8000-00000000087d', '10000000-0000-4000-8000-000000000014', 'seed-v-43', 'seed-s-62', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1353517 seconds'),
  ('10000000-0000-4000-8000-00000000087e', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-63', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '922900 seconds'),
  ('10000000-0000-4000-8000-00000000087f', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-63', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '922900 seconds'),
  ('10000000-0000-4000-8000-000000000880', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-63', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000068', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '922860 seconds'),
  ('10000000-0000-4000-8000-000000000881', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-63', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000068', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '922820 seconds'),
  ('10000000-0000-4000-8000-000000000882', '10000000-0000-4000-8000-000000000014', 'seed-v-47', 'seed-s-64', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1680604 seconds'),
  ('10000000-0000-4000-8000-000000000883', '10000000-0000-4000-8000-000000000014', 'seed-v-47', 'seed-s-64', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1680604 seconds'),
  ('10000000-0000-4000-8000-000000000884', '10000000-0000-4000-8000-000000000014', 'seed-v-47', 'seed-s-64', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000074', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1680564 seconds'),
  ('10000000-0000-4000-8000-000000000885', '10000000-0000-4000-8000-000000000014', 'seed-v-9', 'seed-s-65', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1479299 seconds'),
  ('10000000-0000-4000-8000-000000000886', '10000000-0000-4000-8000-000000000014', 'seed-v-9', 'seed-s-65', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1479299 seconds'),
  ('10000000-0000-4000-8000-000000000887', '10000000-0000-4000-8000-000000000014', 'seed-v-9', 'seed-s-65', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000067', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1479259 seconds'),
  ('10000000-0000-4000-8000-000000000888', '10000000-0000-4000-8000-000000000014', 'seed-v-7', 'seed-s-66', 'session_start', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '1097948 seconds'),
  ('10000000-0000-4000-8000-000000000889', '10000000-0000-4000-8000-000000000014', 'seed-v-7', 'seed-s-66', 'page_view', '{}'::jsonb, null, 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '1097948 seconds'),
  ('10000000-0000-4000-8000-00000000088a', '10000000-0000-4000-8000-000000000014', 'seed-v-7', 'seed-s-66', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000069', 'mobile', 'google', 'organic', null, 'Orgánico', 'Orgánico', now() - interval '1097908 seconds'),
  ('10000000-0000-4000-8000-00000000088b', '10000000-0000-4000-8000-000000000014', 'seed-v-26', 'seed-s-67', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '268135 seconds'),
  ('10000000-0000-4000-8000-00000000088c', '10000000-0000-4000-8000-000000000014', 'seed-v-26', 'seed-s-67', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '268135 seconds'),
  ('10000000-0000-4000-8000-00000000088d', '10000000-0000-4000-8000-000000000014', 'seed-v-26', 'seed-s-67', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006f', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '268095 seconds'),
  ('10000000-0000-4000-8000-00000000088e', '10000000-0000-4000-8000-000000000014', 'seed-v-13', 'seed-s-68', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1103658 seconds'),
  ('10000000-0000-4000-8000-00000000088f', '10000000-0000-4000-8000-000000000014', 'seed-v-13', 'seed-s-68', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1103658 seconds'),
  ('10000000-0000-4000-8000-000000000890', '10000000-0000-4000-8000-000000000014', 'seed-v-69', 'seed-s-69', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '844140 seconds'),
  ('10000000-0000-4000-8000-000000000891', '10000000-0000-4000-8000-000000000014', 'seed-v-69', 'seed-s-69', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '844140 seconds'),
  ('10000000-0000-4000-8000-000000000892', '10000000-0000-4000-8000-000000000014', 'seed-v-68', 'seed-s-70', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '126891 seconds'),
  ('10000000-0000-4000-8000-000000000893', '10000000-0000-4000-8000-000000000014', 'seed-v-68', 'seed-s-70', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '126891 seconds'),
  ('10000000-0000-4000-8000-000000000894', '10000000-0000-4000-8000-000000000014', 'seed-v-68', 'seed-s-70', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006b', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '126851 seconds'),
  ('10000000-0000-4000-8000-000000000895', '10000000-0000-4000-8000-000000000014', 'seed-v-52', 'seed-s-71', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '72830 seconds'),
  ('10000000-0000-4000-8000-000000000896', '10000000-0000-4000-8000-000000000014', 'seed-v-52', 'seed-s-71', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '72830 seconds'),
  ('10000000-0000-4000-8000-000000000897', '10000000-0000-4000-8000-000000000014', 'seed-v-52', 'seed-s-71', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '72790 seconds'),
  ('10000000-0000-4000-8000-000000000898', '10000000-0000-4000-8000-000000000014', 'seed-v-26', 'seed-s-72', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '566386 seconds'),
  ('10000000-0000-4000-8000-000000000899', '10000000-0000-4000-8000-000000000014', 'seed-v-26', 'seed-s-72', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '566386 seconds'),
  ('10000000-0000-4000-8000-00000000089a', '10000000-0000-4000-8000-000000000014', 'seed-v-68', 'seed-s-73', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1136565 seconds'),
  ('10000000-0000-4000-8000-00000000089b', '10000000-0000-4000-8000-000000000014', 'seed-v-68', 'seed-s-73', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1136565 seconds'),
  ('10000000-0000-4000-8000-00000000089c', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-74', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '212681 seconds'),
  ('10000000-0000-4000-8000-00000000089d', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-74', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '212681 seconds'),
  ('10000000-0000-4000-8000-00000000089e', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-74', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006f', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '212641 seconds'),
  ('10000000-0000-4000-8000-00000000089f', '10000000-0000-4000-8000-000000000014', 'seed-v-8', 'seed-s-75', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '708617 seconds'),
  ('10000000-0000-4000-8000-0000000008a0', '10000000-0000-4000-8000-000000000014', 'seed-v-8', 'seed-s-75', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '708617 seconds'),
  ('10000000-0000-4000-8000-0000000008a1', '10000000-0000-4000-8000-000000000014', 'seed-v-8', 'seed-s-75', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000074', 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '708577 seconds'),
  ('10000000-0000-4000-8000-0000000008a2', '10000000-0000-4000-8000-000000000014', 'seed-v-50', 'seed-s-76', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '471438 seconds'),
  ('10000000-0000-4000-8000-0000000008a3', '10000000-0000-4000-8000-000000000014', 'seed-v-50', 'seed-s-76', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '471438 seconds'),
  ('10000000-0000-4000-8000-0000000008a4', '10000000-0000-4000-8000-000000000014', 'seed-v-50', 'seed-s-76', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '471398 seconds'),
  ('10000000-0000-4000-8000-0000000008a5', '10000000-0000-4000-8000-000000000014', 'seed-v-50', 'seed-s-76', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000075', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '471358 seconds'),
  ('10000000-0000-4000-8000-0000000008a6', '10000000-0000-4000-8000-000000000014', 'seed-v-60', 'seed-s-77', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '340503 seconds'),
  ('10000000-0000-4000-8000-0000000008a7', '10000000-0000-4000-8000-000000000014', 'seed-v-60', 'seed-s-77', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '340503 seconds'),
  ('10000000-0000-4000-8000-0000000008a8', '10000000-0000-4000-8000-000000000014', 'seed-v-60', 'seed-s-77', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '340463 seconds'),
  ('10000000-0000-4000-8000-0000000008a9', '10000000-0000-4000-8000-000000000014', 'seed-v-49', 'seed-s-78', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1672106 seconds'),
  ('10000000-0000-4000-8000-0000000008aa', '10000000-0000-4000-8000-000000000014', 'seed-v-49', 'seed-s-78', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1672106 seconds'),
  ('10000000-0000-4000-8000-0000000008ab', '10000000-0000-4000-8000-000000000014', 'seed-v-0', 'seed-s-79', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '105476 seconds'),
  ('10000000-0000-4000-8000-0000000008ac', '10000000-0000-4000-8000-000000000014', 'seed-v-0', 'seed-s-79', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '105476 seconds'),
  ('10000000-0000-4000-8000-0000000008ad', '10000000-0000-4000-8000-000000000014', 'seed-v-0', 'seed-s-79', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000071', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '105436 seconds'),
  ('10000000-0000-4000-8000-0000000008ae', '10000000-0000-4000-8000-000000000014', 'seed-v-51', 'seed-s-80', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '90832 seconds'),
  ('10000000-0000-4000-8000-0000000008af', '10000000-0000-4000-8000-000000000014', 'seed-v-51', 'seed-s-80', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '90832 seconds'),
  ('10000000-0000-4000-8000-0000000008b0', '10000000-0000-4000-8000-000000000014', 'seed-v-51', 'seed-s-80', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000066', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '90792 seconds'),
  ('10000000-0000-4000-8000-0000000008b1', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-81', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1742507 seconds'),
  ('10000000-0000-4000-8000-0000000008b2', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-81', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1742507 seconds'),
  ('10000000-0000-4000-8000-0000000008b3', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-81', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000069', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1742467 seconds'),
  ('10000000-0000-4000-8000-0000000008b4', '10000000-0000-4000-8000-000000000014', 'seed-v-24', 'seed-s-81', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-000000000069', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1742427 seconds'),
  ('10000000-0000-4000-8000-0000000008b5', '10000000-0000-4000-8000-000000000014', 'seed-v-38', 'seed-s-82', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1154365 seconds'),
  ('10000000-0000-4000-8000-0000000008b6', '10000000-0000-4000-8000-000000000014', 'seed-v-38', 'seed-s-82', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1154365 seconds'),
  ('10000000-0000-4000-8000-0000000008b7', '10000000-0000-4000-8000-000000000014', 'seed-v-38', 'seed-s-82', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006d', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1154325 seconds'),
  ('10000000-0000-4000-8000-0000000008b8', '10000000-0000-4000-8000-000000000014', 'seed-v-18', 'seed-s-83', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1731635 seconds'),
  ('10000000-0000-4000-8000-0000000008b9', '10000000-0000-4000-8000-000000000014', 'seed-v-18', 'seed-s-83', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1731635 seconds'),
  ('10000000-0000-4000-8000-0000000008ba', '10000000-0000-4000-8000-000000000014', 'seed-v-2', 'seed-s-84', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '369881 seconds'),
  ('10000000-0000-4000-8000-0000000008bb', '10000000-0000-4000-8000-000000000014', 'seed-v-2', 'seed-s-84', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '369881 seconds'),
  ('10000000-0000-4000-8000-0000000008bc', '10000000-0000-4000-8000-000000000014', 'seed-v-2', 'seed-s-84', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '369841 seconds'),
  ('10000000-0000-4000-8000-0000000008bd', '10000000-0000-4000-8000-000000000014', 'seed-v-28', 'seed-s-85', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1291848 seconds'),
  ('10000000-0000-4000-8000-0000000008be', '10000000-0000-4000-8000-000000000014', 'seed-v-28', 'seed-s-85', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1291848 seconds'),
  ('10000000-0000-4000-8000-0000000008bf', '10000000-0000-4000-8000-000000000014', 'seed-v-61', 'seed-s-86', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '968484 seconds'),
  ('10000000-0000-4000-8000-0000000008c0', '10000000-0000-4000-8000-000000000014', 'seed-v-61', 'seed-s-86', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '968484 seconds'),
  ('10000000-0000-4000-8000-0000000008c1', '10000000-0000-4000-8000-000000000014', 'seed-v-61', 'seed-s-86', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000073', 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '968444 seconds'),
  ('10000000-0000-4000-8000-0000000008c2', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-87', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '529719 seconds'),
  ('10000000-0000-4000-8000-0000000008c3', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-87', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '529719 seconds'),
  ('10000000-0000-4000-8000-0000000008c4', '10000000-0000-4000-8000-000000000014', 'seed-v-64', 'seed-s-87', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006f', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '529679 seconds'),
  ('10000000-0000-4000-8000-0000000008c5', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-88', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '357316 seconds'),
  ('10000000-0000-4000-8000-0000000008c6', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-88', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '357316 seconds'),
  ('10000000-0000-4000-8000-0000000008c7', '10000000-0000-4000-8000-000000000014', 'seed-v-62', 'seed-s-88', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000067', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '357276 seconds'),
  ('10000000-0000-4000-8000-0000000008c8', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-89', 'session_start', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '536932 seconds'),
  ('10000000-0000-4000-8000-0000000008c9', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-89', 'page_view', '{}'::jsonb, null, 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '536932 seconds'),
  ('10000000-0000-4000-8000-0000000008ca', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-89', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000064', 'desktop', 'google', 'cpc', 'search_marca', 'Google Ads', 'Google Ads', now() - interval '536892 seconds'),
  ('10000000-0000-4000-8000-0000000008cb', '10000000-0000-4000-8000-000000000014', 'seed-v-18', 'seed-s-90', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1348710 seconds'),
  ('10000000-0000-4000-8000-0000000008cc', '10000000-0000-4000-8000-000000000014', 'seed-v-18', 'seed-s-90', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1348710 seconds'),
  ('10000000-0000-4000-8000-0000000008cd', '10000000-0000-4000-8000-000000000014', 'seed-v-36', 'seed-s-91', 'session_start', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '898277 seconds'),
  ('10000000-0000-4000-8000-0000000008ce', '10000000-0000-4000-8000-000000000014', 'seed-v-36', 'seed-s-91', 'page_view', '{}'::jsonb, null, 'desktop', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '898277 seconds'),
  ('10000000-0000-4000-8000-0000000008cf', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-92', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '195837 seconds'),
  ('10000000-0000-4000-8000-0000000008d0', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-92', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '195837 seconds'),
  ('10000000-0000-4000-8000-0000000008d1', '10000000-0000-4000-8000-000000000014', 'seed-v-20', 'seed-s-92', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000071', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '195797 seconds'),
  ('10000000-0000-4000-8000-0000000008d2', '10000000-0000-4000-8000-000000000014', 'seed-v-35', 'seed-s-93', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1025248 seconds'),
  ('10000000-0000-4000-8000-0000000008d3', '10000000-0000-4000-8000-000000000014', 'seed-v-35', 'seed-s-93', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1025248 seconds'),
  ('10000000-0000-4000-8000-0000000008d4', '10000000-0000-4000-8000-000000000014', 'seed-v-35', 'seed-s-93', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000074', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1025208 seconds'),
  ('10000000-0000-4000-8000-0000000008d5', '10000000-0000-4000-8000-000000000014', 'seed-v-22', 'seed-s-94', 'session_start', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1199276 seconds'),
  ('10000000-0000-4000-8000-0000000008d6', '10000000-0000-4000-8000-000000000014', 'seed-v-22', 'seed-s-94', 'page_view', '{}'::jsonb, null, 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1199276 seconds'),
  ('10000000-0000-4000-8000-0000000008d7', '10000000-0000-4000-8000-000000000014', 'seed-v-22', 'seed-s-94', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1199236 seconds'),
  ('10000000-0000-4000-8000-0000000008d8', '10000000-0000-4000-8000-000000000014', 'seed-v-22', 'seed-s-94', 'whatsapp_click', '{}'::jsonb, '10000000-0000-4000-8000-00000000006c', 'mobile', 'meta', 'paid', 'preventa_oct', 'Meta Ads', 'Meta Ads', now() - interval '1199196 seconds'),
  ('10000000-0000-4000-8000-0000000008d9', '10000000-0000-4000-8000-000000000014', 'seed-v-14', 'seed-s-95', 'session_start', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1052371 seconds'),
  ('10000000-0000-4000-8000-0000000008da', '10000000-0000-4000-8000-000000000014', 'seed-v-14', 'seed-s-95', 'page_view', '{}'::jsonb, null, 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1052371 seconds'),
  ('10000000-0000-4000-8000-0000000008db', '10000000-0000-4000-8000-000000000014', 'seed-v-14', 'seed-s-95', 'unit_view', '{}'::jsonb, '10000000-0000-4000-8000-000000000064', 'mobile', null, null, null, 'Directo', 'Directo', now() - interval '1052331 seconds');

insert into public.integrations (id, project_id, tipo, config, estado, ultimo_envio, errores_consecutivos)
values
  ('10000000-0000-4000-8000-00000000005a', '10000000-0000-4000-8000-000000000014', 'tokko', '{"api_key":"","development_id":"","enabled":false}'::jsonb, 'idle', null, 0),
  ('10000000-0000-4000-8000-00000000005b', '10000000-0000-4000-8000-000000000014', 'webhook', '{"url":"","secret":"","enabled":false}'::jsonb, 'idle', null, 0);

update public.units set pending_request_id = null, reserved_lead_id = '10000000-0000-4000-8000-0000000001f5' where id = '10000000-0000-4000-8000-00000000006e';
update public.units set pending_request_id = null, reserved_lead_id = '10000000-0000-4000-8000-0000000001f4' where id = '10000000-0000-4000-8000-000000000068';
update public.units set pending_request_id = '10000000-0000-4000-8000-000000000259', reserved_lead_id = null where id = '10000000-0000-4000-8000-00000000006a';
update public.units set pending_request_id = '10000000-0000-4000-8000-000000000258', reserved_lead_id = null where id = '10000000-0000-4000-8000-000000000067';
