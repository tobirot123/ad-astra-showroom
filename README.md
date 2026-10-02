# Ad Astra Showroom

Showroom de ventas para desarrolladoras inmobiliarias, con panel para que el cliente cambie unidades, precios, campos, fotos y zonas clickeables sin depender de la agencia. El showroom usa imágenes y video prerender con polígonos SVG: no hay un motor 3D en tiempo real.

La interfaz está en español rioplatense. Las especificaciones de producto están en `docs/`.

## Requisitos

- Node.js 22
- Para el modo demo no hace falta Docker ni una cuenta de Supabase
- Para Postgres local: Docker y la CLI de Supabase (`npx supabase`, ya está en las dependencias)

## Correr en modo demo

```bash
npm install
cp .env.example .env.local
npm run dev
```

La primera lectura arma `.data/db.json` con el emprendimiento ficticio **ALBA** (Norte Desarrollos, Rosario): 20 unidades, fachada, planos, leads y solicitudes de ejemplo.

| Qué | Dónde |
| --- | --- |
| Showroom | http://localhost:3000/s/alba |
| Panel | http://localhost:3000/admin/login |

Contraseña de todos los usuarios demo: `AdAstra2026!`

| Email | Rol |
| --- | --- |
| martin.admin@demo.adastra | Admin de la desarrolladora |
| laura.ventas@demo.adastra | Vendedora (pide reservar / vender / liberar) |
| pedro.lectura@demo.adastra | Solo lectura, ve métricas |
| superadmin@demo.adastra | Superadmin de Ad Astra |

La vendedora no puede cambiar el estado oficial. Esas acciones quedan como solicitud, vencen a las 48 h y el showroom sigue mostrando el estado oficial hasta que el admin aprueba.

## Tests

```bash
npm test
```

Cubren permisos, el flujo de aprobación, la importación CSV con números argentinos, métricas, el cuerpo de Tokko y que la migración declare RLS.

## Supabase local

Con Docker en marcha:

```bash
npx supabase start
npx supabase db reset
```

`db reset` aplica `supabase/migrations` y `supabase/seed.sql` (usuarios de Auth con la misma contraseña demo). Copiá al `.env.local` la API URL, la `anon` key y la `service_role` key que imprime `supabase start`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Con esas tres variables la app deja el archivo `.data/db.json` y usa Postgres. La `service_role` solo vive en el servidor. Las políticas de RLS aíslan cada organización para un cliente con la anon key.

El seed inserta filas en `auth.users` con las columnas de la CLI 2.119. Si una versión nueva de GoTrue cambia el esquema, el modo demo sigue funcionando y el `INSERT` de `supabase/seed.sql` se ajusta a las columnas que liste `\d auth.users`.

Para regenerar el SQL del seed después de tocar los datos demo:

```bash
npm run seed:sql
npm run facade:svg
```

Un cron de Postgres puede llamar `select public.expire_due_requests();` cada 5 minutos. En la app, el barrido también corre al abrir el panel.

## Deploy en Vercel

1. Creá un proyecto de Supabase y corré la migración (`supabase db push` o el SQL de `supabase/migrations` más el seed si querés la demo).
2. En Storage, el bucket público `media` lo crea la migración.
3. En Vercel, importá el repo (Next.js) y definí:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (la URL de Vercel)
- `DEMO_AUTH_SECRET` (si llegás a correr sin Supabase)
- `RESEND_API_KEY` y `EMAIL_FROM` si querés mandar los avisos por email

Sin `RESEND_API_KEY` los avisos quedan en la campana del panel.

La API key de Tokko y el secreto del webhook se cargan por proyecto en Integraciones. No van al cliente: el panel muestra solo los últimos caracteres.

## Qué incluye este hito

- Organizaciones, roles, proyectos, tipologías, unidades, campos a medida, listas de precio, medios, polígonos, leads, solicitudes de estado, auditoría y eventos, con RLS.
- Panel: login, proyecto, tabla de unidades con edición masiva y CSV, campos, subida de medios con WebP, editor de zonas, cola de aprobación, CRM liviano, historial e integraciones.
- Showroom: fachada clickeable por estado, filtros, ficha (m², precio, características, plano, renders), formulario de lead con UTM y métricas de visitas y leads.
