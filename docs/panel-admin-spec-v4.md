---
title: "Panel de administración — Especificación funcional v4"
subtitle: "Galería de Ventas 3D Ad Astra · Módulo #1 del MVP"
date: "2 de octubre de 2026"
---

> **Cambios vs. v3 (decisiones de Tobias, 2/10/2026):** (1) **CRM:** el MVP mantiene el CRM liviano propio y **Tokko Broker es la primera integración, dentro del MVP** (envío automático de leads), más un webhook genérico para otros CRM. (2) **Autoadministración total:** se auditó la especificación y todo lo que requería a Ad Astra pasa a ser autoservicio: campos personalizados, catálogo de características, carga de medios con optimización, galerías, editor visual de zonas clickeables, reemplazo de videos del recorrido y onboarding guiado. Nueva sección 0 con la lista de lo que sigue necesitando a Ad Astra y por qué. La estimación del panel sube a ≈ 9–10 semanas.
>
> **Cambios vs. v2 (decisiones de Tobias, 2/10/2026):** (1) en el MVP las notificaciones son **solo por email y dentro del panel**; WhatsApp pasa a la etapa 2. (2) El dashboard del MVP muestra **solo tráfico y leads**; la inversión publicitaria y el costo por lead (conexión con Meta/Google Ads) pasan a la etapa 2, **opcional por proyecto**. Ambas salen de las preguntas abiertas.
>
> **Cambios vs. v1 (decisión de Tobias #1):** los **vendedores/brokers ya no cambian estados directamente**. Reservar, vender o liberar una unidad pasa a ser una **solicitud** que el **admin de la desarrolladora aprueba o rechaza**. Mientras está pendiente, la unidad se marca internamente como "reserva pendiente", **sigue viéndose disponible en el showroom público** y queda **bloqueada para que otros vendedores no la soliciten**. La solicitud **vence** a las 48 h (configurable). Se agregan la cola de aprobación, las notificaciones, la auditoría, los permisos, la tabla `status_change_requests` y criterios de aceptación nuevos (sección 5.6 y siguientes).

# 0. Principio de autoadministración

**Regla de producto:** *todo lo que se ve en el showroom lo puede cambiar el cliente solo, desde el panel, sin pedirle nada a Ad Astra.* Si una desarrolladora tiene que escribirle a Ad Astra para cambiar un dato, un texto, una imagen o una zona clickeable, se considera un **defecto del producto** y entra al backlog con prioridad alta.

**Cómo se logra sin que el cliente rompa nada:**

- **Todo es editable por el admin de la desarrolladora:** datos, campos, medios, zonas clickeables, textos, branding, estructura, usuarios e integraciones.
- **Red de seguridad:** vista previa antes de publicar el contenido, validaciones con mensajes claros, historial completo y **deshacer** (también para medios y zonas clickeables).
- **El sistema hace lo técnico:** optimiza imágenes y videos, genera versiones para celular, ordena las secuencias de giro y avisa si algo es demasiado pesado o tiene una proporción incorrecta.
- **Ayuda dentro del panel:** checklist de primeros pasos, ayudas contextuales ⓘ, videos cortos por pantalla, plantillas de Excel y estados vacíos que explican qué hacer (sección 5.16).
- **Indicador interno de éxito:** pedidos de cambio que llegan a Ad Astra por proyecto y por mes. **Meta: 0** pedidos de datos o contenido después del primer mes.

## 0.1 Auditoría: qué requería a Ad Astra y cómo queda

| Tarea | Spec v3 | Spec v4 (autoservicio) | Dónde |
|---|---|---|---|
| Cambiar precio, m², orientación, piso o cualquier dato de una unidad | Admin desarrolladora | Admin desarrolladora (sin cambios) | 5.5 |
| **Agregar un campo o característica nueva** (ej. "cochera doble", "apto profesional", "expensas estimadas") | Lista fija de campos: requería desarrollo | **Campos personalizados** y **catálogo de características** definidos por el admin, visibles en ficha, filtros y Excel | 5.14 |
| Crear tipologías, torres, pisos y unidades | Admin (borrador) | Admin (sin cambios), con duplicar piso/tipología para cargar rápido | 5.3–5.5 |
| **Subir renders, planos, fotos y videos** | Admin, salvo videos del recorrido exterior | Admin: **arrastrar y soltar** cualquier medio con optimización automática, carga masiva con asignación por nombre de archivo | 5.8 |
| **Reemplazar videos de transición y secuencias de giro** de los puntos de vista existentes | Solo Ad Astra | **Admin** (con validación de duración, resolución y cantidad de frames) | 5.8 |
| **Zonas clickeables** (polígonos sobre fachada, planta, masterplan; hotspots de amenities) | Solo Ad Astra | **Editor visual** para el admin: dibujar, copiar a otros pisos, vincular a unidad/piso/torre/amenity | 5.15 |
| Galerías (amenities, avance de obra, unidad, proyecto) | Implícito en medios | **Galerías** con nombre, orden arrastrable y asignación a secciones | 5.8 |
| Textos, secciones, traducciones, textos legales | Admin | Admin, más **secciones personalizadas** (texto + galería + video + botón) y edición de traducciones | 5.9 |
| Branding (logo, colores, tipografías, imagen para redes) | Admin | Admin (sin cambios) | 5.9 |
| Links de tours 360 | Admin | Admin (sin cambios), con vista previa | 5.8 |
| Usuarios, permisos, aprobadores | Admin | Admin (sin cambios) | 5.11, 5.6 |
| Integraciones (Tokko, webhook, píxeles, GA4) | Admin | Admin con **asistente paso a paso** y botón "Enviar prueba" | 5.13 |
| Configuración del reporte semanal y de las métricas | Admin | Admin (sin cambios) | 5.2, 6 |

## 0.2 Qué sigue necesitando a Ad Astra (y por qué)

| Tarea | Por qué no es autoservicio | Cómo se resuelve |
|---|---|---|
| **Producir contenido 3D nuevo:** renders, videos de vuelo/transición, secuencias de giro, panorámicas 360, plantas 3D | Requiere el modelo 3D, software de render y artistas: es **producción**, no administración | Servicio de Ad Astra (o de otro estudio). Una vez producido, **el cliente lo sube y lo reemplaza solo** |
| **Crear puntos de vista y transiciones nuevas del recorrido exterior** (agregar una "parada" nueva al vuelo) | Depende de videos nuevos y de su encadenamiento; en el MVP se configura con la herramienta interna | Ad Astra lo configura al entregar los videos nuevos. **Editor de recorrido autoservicio en la etapa 2** |
| **Alta de una organización nueva (cuenta cliente)**, plan y módulos contratados, facturación | Es una decisión comercial y contractual | Superadmin de Ad Astra |
| **Crear un proyecto nuevo y conectar su dominio propio** | En la práctica, cada proyecto nuevo llega con producción 3D de Ad Astra; el dominio se configura una sola vez | En el MVP lo hace Ad Astra en el alta. **Etapa 2:** el admin duplica un proyecto como plantilla y conecta su dominio con un asistente de DNS |
| **Funciones o tipos de sección nuevos**, cambios de diseño más allá del branding, integraciones con otros CRM | Es evolución del producto (roadmap) | El cliente lo pide desde el panel ("Pedí una mejora"); Ad Astra prioriza. Mientras tanto, webhook genérico para cualquier CRM |
| Conexión de Meta/Google Ads para inversión y costo por lead (etapa 2) | Expone el gasto publicitario que maneja Ad Astra | Lo activa el superadmin por proyecto |
| Recuperar datos borrados fuera del historial/deshacer, incidentes técnicos | Requiere acceso a backups e infraestructura | Soporte de Ad Astra |

# 1. Contexto y objetivo

**El problema (en palabras de Tobias):** con Web3D, Ad Astra depende del proveedor hasta para cambiar los m² de una unidad, los cambios tardan mucho y el servicio es malo. Además, Ad Astra termina haciendo a mano cambios que deberían hacer sus clientes.

**Objetivo del panel:** que **cada desarrolladora administre su proyecto sola**, en minutos y sin riesgo de romper nada: unidades, precios, estados, planos, medios, contenidos y leads. Además, que **vea las métricas de su web** (cuántas personas la visitaron, de dónde vienen, qué unidades miran y cuántos leads se generan). Ad Astra pasa de "operador de cambios" a "supervisor": configura el proyecto, define permisos y da soporte.

**Principios de diseño:**

1. **Autonomía:** todo dato comercial se edita desde el panel, sin tickets.
2. **Velocidad:** un cambio de m², precio o estado se ve en el showroom público en **≤ 10 segundos**.
3. **Seguridad para equivocarse:** validaciones, vista previa, historial completo y **deshacer**.
4. **Simple como una planilla:** la pantalla de unidades se comporta como un Excel (edición en celda, pegar desde Excel, edición masiva, importar/exportar).
5. **Métricas entendibles:** pocas cifras claras, con definiciones explícitas y un reporte semanal por mail.

## 1.1 Alcance del panel en el MVP

| Incluido en MVP | Fuera del MVP (etapas siguientes) |
|---|---|
| Roles y permisos (4 roles) con multi-proyecto y multi-organización | Módulo de brokers con links propios y métricas por broker (etapa 2) |
| **Solicitudes de cambio de estado** de vendedores/brokers con **aprobación del admin**, vencimiento y notificaciones | Notificaciones por WhatsApp (etapa 2; ver 5.6.5) |
| Dashboard de métricas con exportación y reporte semanal por mail | Mapas de calor y grabación de sesiones (etapa 2) |
| Proyectos, estructura (torres/etapas, pisos), tipologías y unidades | Inversión publicitaria y costo por lead (conexión Meta/Google Ads) en el dashboard (etapa 2, opcional por proyecto; ver 6.4) |
| Tabla editable, edición masiva e importación/exportación CSV/Excel | Sincronización bidireccional con CRM/ERP (etapa 2–3) |
| Listas de precios y planes de pago (cotizador) | Reserva con pago online (etapa 3) |
| Medios (renders, videos, tours, planos) con optimización automática, galerías y carga masiva | Editor de recorrido exterior autoservicio: crear puntos de vista y transiciones nuevas (etapa 2) |
| **Editor visual de zonas clickeables** (polígonos y hotspots) para la desarrolladora | Crear proyectos duplicando uno existente y conectar dominio propio con asistente (etapa 2) |
| **Campos personalizados** y catálogo de características por proyecto | Conectores con otros CRM: Kommo, HubSpot (etapa 2; mientras tanto, webhook genérico) |
| **Onboarding guiado** y ayuda dentro del panel | |
| Contenidos y branding | Chatbot IA, generador de brochure (etapa 2) |
| Leads (CRM liviano propio) + **integración con Tokko Broker** + webhook genérico | Apps móviles nativas |
| Usuarios e invitaciones | |
| Historial de cambios con deshacer | |
| Flujo de publicación: en vivo para datos comerciales, borrador + vista previa para contenido | |

# 2. Conceptos y jerarquía

```
Organización (desarrolladora, cliente de Ad Astra)
 └── Proyecto (ej. "DUO")                    ← tiene dominio, branding, showroom
      ├── Edificio / Torre / Etapa           ← ej. "Torre A", "Etapa 2"
      │    └── Nivel / Piso                  ← ej. "PB", "Piso 7", con plano de planta
      │         └── Unidad                   ← ej. "7B": m², precio, estado...
      ├── Tipología                          ← ej. "2 amb. tipo B": planos y renders comunes
      ├── Listas de precios / Planes de pago
      ├── Medios / Contenidos / Branding
      ├── Leads
      └── Métricas (eventos del showroom)
```

- Una **unidad** pertenece a un piso y opcionalmente a una **tipología**. Hereda de la tipología planos, renders y características; cualquier campo puede **sobrescribirse** en la unidad (ej. la 7B tiene los m² de la tipología B, pero un balcón distinto).
- Tipos de unidad: departamento, casa, lote, local, oficina, cochera, baulera, amenity (no vendible).
- **Estados de unidad:** `disponible`, `reservada`, `vendida`, `bloqueada` (no se muestra como disponible; ej. reservada por la desarrolladora), `oculta` (no aparece en el showroom).
- **Marca interna "solicitud pendiente"** (no es un estado nuevo): cuando un vendedor solicita reservar, vender o liberar, la unidad conserva su estado oficial y lleva la marca de solicitud pendiente. En el panel se ve como "🟠 Reserva pendiente" (o "Venta pendiente" / "Liberación pendiente"). **En el showroom público no cambia nada** hasta que el admin aprueba (ver 5.6).

# 3. Roles y permisos

**Modelo:** cada usuario tiene una **membresía** por organización con un rol, y opcionalmente se limita a ciertos proyectos. Un mismo usuario puede pertenecer a varias organizaciones (ej. un broker que vende para dos desarrolladoras).

| Rol | Quién es | Alcance |
|---|---|---|
| **Superadmin Ad Astra** | Equipo de Ad Astra | Todas las organizaciones y proyectos. Puede "entrar como" una organización para dar soporte (queda registrado). |
| **Admin desarrolladora** | Gerente comercial o marketing del cliente | Todos los proyectos de su organización (o los asignados). |
| **Vendedor / Broker** | Equipo comercial propio o inmobiliaria externa | Proyectos asignados. **Solicita** cambios de estado (reservar/vender/liberar), que aprueba el admin; gestiona sus leads; no edita estructura, contenido ni precios. |
| **Solo lectura** | Dirección, socios, inversores | Ve unidades, métricas y (opcional) leads, sin editar. |

**Matriz de permisos (MVP):**

| Acción | Superadmin | Admin desarrolladora | Vendedor / Broker | Solo lectura |
|---|:---:|:---:|:---:|:---:|
| Crear organización (cuenta cliente), activar módulos y plan | ✅ | ❌ | ❌ | ❌ |
| Crear proyecto nuevo y conectar dominio | ✅ | ❌ en el MVP / ✅ en la etapa 2 (desde plantilla y con asistente) | ❌ | ❌ |
| Definir **campos personalizados** y características del proyecto | ✅ | ✅ | ❌ | ❌ |
| Editar datos generales del proyecto, contenidos y branding | ✅ | ✅ | ❌ | ❌ |
| Crear/editar torres, pisos y tipologías | ✅ | ✅ | ❌ | ❌ |
| Editar zonas clickeables (polígonos/hotspots) con el editor visual | ✅ | ✅ | ❌ | ❌ |
| Reemplazar videos de transición y secuencias de giro existentes | ✅ | ✅ | ❌ | ❌ |
| Crear puntos de vista y transiciones nuevas del recorrido | ✅ (herramienta interna, MVP) | ✅ en la etapa 2 | ❌ | ❌ |
| Editar m², orientación, piso, planos y características de unidades | ✅ | ✅ | ❌ | ❌ |
| Cambiar **estado** de unidades directamente | ✅ | ✅ | ❌ | ❌ |
| **Solicitar** reservar / vender / liberar una unidad | — (cambia directo) | — (cambia directo) | ✅ (liberar: solo unidades reservadas a su nombre) | ❌ |
| Cancelar su propia solicitud pendiente | ✅ | ✅ | ✅ | ❌ |
| **Aprobar / rechazar** solicitudes; extender vencimiento | ✅ | ✅ (o solo los "aprobadores" designados, ver 5.6.6) | ❌ | ❌ |
| Ver la cola de solicitudes | Todas | Todas las de su organización | Solo las propias | ❌ |
| Configurar vencimiento y visualización pública de pendientes | ✅ | ✅ | ❌ | ❌ |
| Editar **precios** y listas de precios | ✅ | ✅ | ⚙️ solo si el admin lo habilita | ❌ |
| Importar/exportar unidades (CSV/Excel) | ✅ | ✅ | Exportar | Exportar (configurable) |
| Subir y gestionar medios | ✅ | ✅ | ❌ | ❌ |
| Publicar borrador de contenido | ✅ | ✅ | ❌ | ❌ |
| Ver leads | Todos | Todos de su organización | **Solo los asignados a él** (o todos si el admin lo habilita) | ⚙️ configurable |
| Editar/asignar leads, exportar leads | ✅ | ✅ | Editar los propios | ❌ |
| Ver dashboard de métricas | ✅ | ✅ | ⚙️ configurable | ✅ |
| Invitar usuarios y asignar roles | ✅ | ✅ (salvo superadmin) | ❌ | ❌ |
| Ver historial de cambios | ✅ | ✅ (su organización) | Solo sus cambios | ❌ |
| Deshacer cambios | ✅ (incluye estados aprobados) | ✅ (incluye estados aprobados) | Solo sus cambios en leads, ≤ 24 h | ❌ |
| Configurar integraciones (webhook, CRM, píxeles) | ✅ | ✅ | ❌ | ❌ |

⚙️ = permiso fino que el admin activa por usuario (ej. "puede editar precios", "ve todos los leads", "ve métricas").

**Reglas:**

- Todo permiso se valida **en el backend** (políticas RLS en Postgres), no solo ocultando botones.
- El acceso de soporte de Ad Astra ("entrar como") queda registrado en el historial con el usuario real.
- Un vendedor/broker no ve precios de otras listas que no estén publicadas (ej. lista "inversores" interna).
- Un vendedor/broker **nunca** cambia el estado oficial de una unidad, ni desde el panel ni por la API: solo crea solicitudes. El backend lo garantiza (RLS + función `request_status_change`).

# 4. Flujo de publicación

**Modelo híbrido:** los datos comerciales cambian todos los días y tienen que estar al instante. El contenido visual y la estructura cambian poco y conviene revisarlos antes.

| Tipo de cambio | Cómo se publica | Por qué |
|---|---|---|
| Estado (hecho por un admin), precio, m², orientación, características y plano de una unidad; activar/desactivar una lista de precios | **En vivo al instante** (≤ 10 s en el showroom), con confirmación en cambios masivos y **deshacer** | Es lo que hoy tarda días con Web3D; la disponibilidad desactualizada hace perder ventas. |
| Estado solicitado por un **vendedor/broker** | **Solicitud → aprobación del admin → en vivo** (≤ 10 s después de aprobar). Mientras tanto, el showroom no cambia | Decisión de Tobias: la desarrolladora controla la disponibilidad oficial. |
| Alta/baja de unidades, torres, pisos y tipologías; textos, secciones, branding, medios, hotspots | **Borrador → vista previa → publicar** | Un error visual se ve en toda la web; conviene revisarlo antes. |
| Lista de precios nueva | Se puede **programar** con fecha y hora de entrada en vigencia (ej. "aumento 1/11 00:00") | Los aumentos de precio suelen tener fecha. |

**Vista previa:** el botón "Vista previa" abre el showroom con el borrador aplicado en una URL privada (`/preview?token=...`, vence en 24 h) que se puede compartir con el cliente para aprobar. Un banner indica "Estás viendo un borrador". "Publicar" aplica todos los cambios pendientes en una sola operación (*change set*), que queda en el historial y se puede deshacer en bloque.

```
[Editar contenido] → (borrador) → [Vista previa] → [Publicar] → showroom actualizado
                                         ↑                    │
                                         └──── [Descartar] ───┘   (deshacer en historial)

[Admin: editar estado/precio/m²] → [Guardar] → showroom actualizado (≤10 s) → toast "Deshacer"

[Vendedor: Solicitar reserva] → (pendiente, unidad bloqueada para otros vendedores)
        → [Admin aprueba] → estado oficial cambia → showroom actualizado (≤10 s)
        → [Admin rechaza] / [vence a las 48 h] / [vendedor cancela] → se libera el bloqueo
```

# 5. Pantallas

**Estructura general del panel (desktop first, usable en tablet y celular para estados y leads):**

```
┌───────────────────────────────────────────────────────────────────────┐
│ [Logo]  Organización ▾  Proyecto: DUO ▾        🔍 Buscar   ? Ayuda  👤 │
├──────────────┬────────────────────────────────────────────────────────┤
│ 📊 Métricas   │                                                        │
│ 🏢 Proyecto   │                (contenido de la pantalla)              │
│ 🧩 Tipologías │                                                        │
│ 🔲 Unidades   │                                                        │
│ 💲 Precios    │                                                        │
│ 🖼 Medios     │                                                        │
│ ✏️ Contenido  │                                                        │
│ ✅ Solicit.(3)│                                                        │
│ 📥 Leads (12) │                                                        │
│ 👥 Usuarios   │                                                        │
│ 🕘 Historial  │                                                        │
│ ⚙️ Integrac.  │        Barra inferior si hay borrador:                 │
│              │  "3 cambios sin publicar  [Vista previa] [Publicar]"  │
└──────────────┴────────────────────────────────────────────────────────┘
```

## 5.1 Ingreso y selección de proyecto

- Login con email + contraseña o **link mágico**; recuperación de contraseña; 2FA opcional (obligatorio para superadmin).
- Invitaciones por email con rol preasignado; el link vence a los 7 días.
- Si el usuario tiene un solo proyecto, entra directo al dashboard; si tiene varios, ve un listado con tarjetas (nombre, foto, % vendido, leads de la semana).

## 5.2 Dashboard de métricas

**Objetivo:** que la desarrolladora vea en 10 segundos cuánta gente visitó su showroom, de dónde vino, qué miró y cuántos leads dejó. (Detalle de métricas y definiciones en la sección 6.)

```
┌───────────────────────────────────────────────────────────────────────┐
│ Métricas · DUO      [Últimos 30 días ▾] [vs. período anterior ☑]      │
│                     [Fuente: todas ▾] [Dispositivo: todos ▾] [⤓ CSV]   │
├───────────┬───────────┬───────────┬───────────┬───────────┬───────────┤
│ Visitas   │ Usuarios  │ Fichas de │ Cotiza-   │ Leads     │ Conversión│
│ 4.812     │ únicos    │ unidad    │ ciones    │ 96        │ 2,6 %     │
│ ▲ 18 %    │ 3.390 ▲12%│ 2.140 ▲9% │ 410 ▲22%  │ ▲ 31 %    │ ▲ 0,4 pp  │
├───────────┴───────────┴───────────┴───────────┴───────────┴───────────┤
│ Visitas y leads por día  ▁▂▃▅▆▅▃▄▆▇█▆▅  (línea + barras)                  │
├──────────────────────────────────┬────────────────────────────────────┤
│ Embudo                           │ Origen del tráfico                 │
│ Visitas        4.812 ██████████  │ Meta Ads      62 %  ████████       │
│ Vio ficha      2.140 █████       │ Google Ads    14 %  ██             │
│ Cotizó           410 █           │ Directo       11 %  █              │
│ Dejó lead         96 ▏           │ Orgánico       8 %  █              │
│                                  │ WhatsApp/Ref.  5 %  ▏              │
├──────────────────────────────────┼────────────────────────────────────┤
│ Unidades más vistas              │ Campañas (UTM)          Vis. Leads │
│ 1. 7B  2 amb  312 vistas 18 leads│ preventa_oct_meta       2.100   51 │
│ 2. 12A 3 amb  280 vistas 11 leads│ retargeting_30d           640   22 │
│ 3. PH1        255 vistas  9 leads│ search_marca              410    9 │
├──────────────────────────────────┼────────────────────────────────────┤
│ Dispositivo: 📱 78 % 💻 20 % ▭ 2 %  │ Leads por fuente: Form 61 · WA 35  │
└──────────────────────────────────┴────────────────────────────────────┘
```

**Aviso superior** (solo admins): "3 solicitudes de estado pendientes · 1 vence en < 4 h → [Revisar]".

**Funciones:** selector de período (hoy, 7, 30, 90 días, personalizado), comparación con el período anterior, filtros por fuente/campaña/dispositivo/torre, clic en una unidad para ver su detalle (vistas, cotizaciones, leads), exportar a CSV/Excel, botón "Enviarme este reporte" y configuración del reporte semanal. Si hay varios proyectos, vista consolidada de la organización.

## 5.3 Proyectos y estructura

- **Listado de proyectos** (superadmin y admins con varios proyectos): tarjeta con estado del showroom (publicado/borrador), dominio, % vendido y última actualización.
- **Configuración general del proyecto:** nombre, dirección y coordenadas, descripción, fecha estimada de entrega, estudio/arquitectos, amenities (lista con íconos), moneda principal (USD/ARS), unidades de medida, idioma(s), datos de contacto (WhatsApp, email, teléfono), textos legales/disclaimer de precios.
- **Estructura:** árbol de torres/etapas → pisos, con orden arrastrable. Cada piso tiene nombre visible ("Piso 7"), número para ordenar y **plano de planta**. Las zonas clickeables de cada piso, fachada o masterplan se dibujan con el **editor visual** (sección 5.15). Se puede **duplicar un piso** (con sus unidades y zonas) para cargar pisos tipo en segundos.
- **Solo superadmin (comercial):** módulos activos (cotizador, tours, leads, métricas), límite de usuarios y estado del contrato. Dominio y subdominio: lo configura Ad Astra en el alta en el MVP; en la etapa 2, el admin lo conecta con un asistente.

```
┌ Estructura ─────────────────────────┬ Piso 7 · Torre A ─────────────────┐
│ ▾ Torre A                           │ Nombre visible: [Piso 7        ]   │
│    ▸ PB   ▸ Piso 1 … ▸ Piso 7 ●     │ Orden: [7]                          │
│ ▾ Torre B                           │ Plano: [planta_7.webp] [Cambiar]   │
│ [+ Agregar torre/etapa]             │ Unidades en este piso: 7A 7B 7C 7D │
└─────────────────────────────────────┴────────────────────────────────────┘
```

## 5.4 Tipologías

**Objetivo:** cargar una vez lo que comparten muchas unidades.

- Campos: nombre ("2 amb. tipo B"), ambientes, dormitorios, baños, m² cubiertos/semicubiertos/descubiertos/totales de referencia, descripción, características (del **catálogo del proyecto**, editable por el admin con íconos; ver 5.14), campos personalizados, **plano 2D**, **planta 3D amoblada**, galería de renders, tour 360 (URL de Kuula/Matterport/Layama o panorámica propia).
- **Duplicar tipología** para crear variantes rápido ("2 amb. tipo B" → "2 amb. tipo B espejada").
- Muestra cuántas unidades usan la tipología. Al cambiar un campo heredado, el panel avisa: "Este cambio afecta a 24 unidades (3 tienen valor propio y no cambian)".

## 5.5 Unidades (pantalla central)

**Objetivo:** que cambiar los m² de una unidad, o los precios de 200, sea tan simple como en Excel.

```
┌ Unidades · DUO ────────────────────────────────────────────────────────────────┐
│ 🔍 [Buscar 7B…]  Torre [A ▾] Piso [Todos ▾] Estado [Todos ▾] Tipología [Todas ▾] │
│ [⤒ Importar] [⤓ Exportar] [+ Nueva unidad]      Columnas ▾   Vista: Tabla | Planta │
├──┬──────┬──────┬──────┬──────────┬───────┬───────┬───────┬──────────┬───────────┤
│☐ │Unidad│Torre │Piso  │Tipología │m² cub.│m² tot.│Orient.│Precio USD│Estado     │
├──┼──────┼──────┼──────┼──────────┼───────┼───────┼───────┼──────────┼───────────┤
│☑ │7A    │A     │7     │2 amb B   │ 48,20 │ 55,10 │Norte  │ 142.000  │🟢 Disponib.│
│☑ │7B    │A     │7     │2 amb B   │[48,20]│ 55,10 │NE     │ 145.900  │🟡 Reservada│
│☐ │7D    │A     │7     │2 amb B   │ 48,20 │ 55,10 │Oeste  │ 141.500  │🟢 Disp. 🟠 │
│☐ │7C    │A     │7     │3 amb A   │ 71,00 │ 80,40 │Este   │ 178.500  │🔴 Vendida  │
├──┴──────┴──────┴──────┴──────────┴───────┴───────┴───────┴──────────┴───────────┤
│ 2 seleccionadas: [Cambiar estado ▾] [Ajustar precio %/monto] [Asignar tipología] │
│                  [Editar campo…] [Ocultar]                                       │
│ Resumen: 120 unidades · 🟢 64 (🟠 3 con solicitud pendiente) · 🟡 9 · 🔴 47        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Funciones:**

- **Edición en celda:** clic, escribir y Enter. Se guarda al instante con un indicador "Guardado ✓" y un toast con **Deshacer**. Las celdas con valor heredado de la tipología se ven en gris; editar las convierte en valor propio (con opción "volver a heredar").
- **Pegar desde Excel:** se puede copiar un rango de Excel/Google Sheets y pegarlo en la tabla. Antes de aplicar, el panel muestra la vista previa de cambios.
- **Edición masiva:** con varias filas seleccionadas se puede cambiar el estado, ajustar el precio (+/- % o monto, redondeo a múltiplos de 100/1.000), asignar tipología, cambiar cualquier campo u ocultar. Siempre muestra un resumen ("Vas a cambiar el precio de 48 unidades: +5 %, redondeo a 500. Total antes USD 7,1 M → después USD 7,45 M") y pide confirmación.
- **Vista planta:** el plano del piso con las unidades coloreadas por estado y un borde naranja en las que tienen una solicitud pendiente. Clic en una unidad abre su ficha. El **admin** cambia el estado con un menú rápido; el **vendedor** ve los botones "Solicitar reserva / venta / liberación" (ver 5.6), ideal desde la tablet.
- **Lo que ve el vendedor en esta pantalla:** la tabla en solo lectura (sin precios de listas no publicadas), sin edición en celda ni edición masiva, más los botones de solicitud y la columna "Solicitud" (propia o "bloqueada por otra solicitud, vence en 31 h").
- **Ficha de unidad (panel lateral):** todos los campos, planos y medios propios, historial de esa unidad, leads que la consultaron y vistas en el showroom.
- **Columnas configurables** (se guardan por usuario) y filtros guardados ("Disponibles Torre A").
- **Validaciones:** m² > 0 y m² totales ≥ cubiertos; precio > 0 o "consultar"; código de unidad único por proyecto; estado dentro de los valores permitidos. Una unidad `vendida` no puede pasar a `disponible` sin confirmación explícita. Si un admin cambia directamente el estado de una unidad con solicitud pendiente, el panel avisa y, al confirmar, la solicitud se cierra como "resuelta por cambio directo" y se notifica al vendedor.

**Campos de unidad:** código ("7B"), torre/etapa, piso, tipología, tipo, ambientes, dormitorios, baños, toilette, m² cubiertos, semicubiertos, descubiertos, totales, m² de terreno (lotes/casas), frente y fondo (lotes), orientación (N, NE, E, SE, S, SO, O, NO), vista ("frente", "contrafrente", "al río"…), cochera/baulera incluida, precio por lista, mostrar precio (sí / "consultar"), estado, fecha de reserva/venta, plano 2D, planta 3D, renders y tour propios, notas internas (no públicas), destacada (sí/no) y orden, **más todos los campos personalizados del proyecto** (sección 5.14), que aparecen como columnas, se editan en celda, se filtran y se importan/exportan en Excel igual que los campos fijos.

### Importación y exportación CSV/Excel

```
[⤒ Importar] → 1. Subir archivo (.xlsx/.csv) o descargar plantilla
             → 2. Mapear columnas (auto-detección: "m2 cubiertos" → m2_cubiertos)
             → 3. Vista previa: 118 sin cambios · 37 modificadas · 2 nuevas · 3 con error
                  (tabla de diferencias celda por celda: antes → después, errores en rojo)
             → 4. Confirmar → se aplica como un único cambio (deshacible en bloque)
```

- **Plantilla descargable** con las columnas del proyecto y ejemplos; la exportación usa el mismo formato, así que el ciclo "exportar → editar en Excel → importar" funciona sin ajustes.
- **Clave de cruce:** código de unidad (+ torre). Las filas nuevas crean unidades (solo admin); por defecto, las faltantes **no se borran** (opción explícita "ocultar unidades que no están en el archivo").
- Acepta formato numérico argentino (`48,20`, `142.000`) y también `48.20`; estados en español o inglés; ignora mayúsculas y espacios.
- Los errores se informan por fila y columna ("Fila 14: m² totales menor que cubiertos"). Se puede aplicar solo lo válido o corregir y volver a subir.
- Exportación con filtros aplicados, en .xlsx y .csv, con o sin precios según el permiso.

## 5.6 Solicitudes de cambio de estado (vendedores/brokers) y cola de aprobación

### 5.6.1 Reglas de negocio

| Regla | Definición |
|---|---|
| **Tipos de solicitud** | `reservar` (disponible → reservada), `vender` (disponible o reservada → vendida), `liberar` (reservada → disponible; el vendedor solo puede pedirla sobre unidades reservadas a su nombre). |
| **Quién solicita / quién aprueba** | Solicita: vendedor/broker con el proyecto asignado. Aprueba o rechaza: admin de la desarrolladora (o los **aprobadores** designados) y superadmin. |
| **Una solicitud activa por unidad** | Mientras haya una solicitud pendiente, **ningún otro vendedor puede solicitar esa unidad**. Ve "Solicitud pendiente — vence en 31 h" (a los brokers externos no se les muestra el nombre del otro vendedor, solo "otro vendedor"). |
| **Showroom público** | **Recomendación adoptada: sigue mostrando el estado oficial** (ej. "disponible") hasta que el admin apruebe. Configurable por proyecto: `disponible` (por defecto) o `consultar` (la unidad muestra "Consultar disponibilidad" y no permite cotizar). Nunca se muestra "reservada" sin aprobación. |
| **Vencimiento** | Por defecto **48 h** desde la creación, configurable por proyecto (de 1 h a 7 días). El admin puede **extender** una solicitud puntual. Al vencer, la solicitud pasa a `vencida`, la unidad se desbloquea y se notifica a ambos. |
| **Datos de la solicitud** | Tipo, unidad, **cliente / lead asociado** (obligatorio para reservar y vender: se elige un lead existente o se carga nombre + teléfono/email), lista y plan de pago (opcional), monto de seña (opcional), **comprobante adjunto** (opcional: PDF/imagen) y comentario. |
| **Aprobación** | Aplica el cambio de estado oficial **en vivo** (≤ 10 s en el showroom), registra `reservado_por` (vendedor) y el lead asociado en la unidad, pasa el lead a "Reserva"/"Venta" y escribe el historial con quién solicitó y quién aprobó. |
| **Rechazo** | Requiere **comentario obligatorio** (ej. "La 7B ya está señada por oficina"). La unidad se desbloquea. |
| **Conflictos** | Si el estado oficial de la unidad cambió desde que se creó la solicitud, al aprobar el panel avisa ("La 7B pasó a Reservada por Martín hace 2 h") y no deja aprobar sin revisar. Si el admin cambia el estado directamente, la solicitud se cierra como `resuelta_por_cambio_directo`. |
| **Cancelación** | El vendedor puede cancelar su solicitud pendiente en cualquier momento (con motivo opcional). |
| **Sin aprobadores disponibles** | Si una solicitud lleva más de 24 h sin respuesta, se envía un recordatorio a los aprobadores y, opcionalmente, al superadmin de Ad Astra. |

### 5.6.2 Ciclo de vida

```
                       ┌──────────── cancelar (vendedor) ───────────► CANCELADA
                       │
 [Vendedor solicita] → PENDIENTE ── aprobar (admin) ──► APROBADA → estado oficial cambia (en vivo)
   (unidad bloqueada   │
    para otros)        ├──────────── rechazar + comentario ─────────► RECHAZADA
                       ├──────────── vence (48 h, configurable) ────► VENCIDA
                       └──────────── admin cambia estado directo ───► RESUELTA_POR_CAMBIO_DIRECTO

 En todos los cierres: se libera el bloqueo, se notifica y queda en el historial.
```

### 5.6.3 Pantalla del vendedor: solicitar

```
┌ Unidad 7D · Torre A · Piso 7 ─────────────────────────────────────────┐
│ Estado oficial: 🟢 Disponible       2 amb · 48,20 m² · Oeste           │
│ Precio (Contado): USD 141.500                                          │
│                                                                        │
│ [Solicitar reserva]  [Solicitar venta]                                 │
├────────────────────────────────────────────────────────────────────────┤
│ Solicitar reserva de 7D                                                │
│ Cliente: [Buscar lead…  Ana López (02/10, Meta Ads) ▾] o [+ Nuevo]     │
│ Plan de pago: [Financiado 36 ▾]   Seña: [USD 5.000]  (opcional)         │
│ Comprobante: [📎 Adjuntar]  (opcional)                                  │
│ Comentario: [Cliente confirma seña el lunes por transferencia      ]   │
│ ⓘ La solicitud vence en 48 h si no se aprueba. Mientras tanto, la      │
│   unidad sigue disponible en la web y ningún otro vendedor puede       │
│   solicitarla.                                                         │
│                                    [Cancelar]  [Enviar solicitud]      │
└────────────────────────────────────────────────────────────────────────┘
```

El vendedor ve sus solicitudes en "Solicitudes → Mis solicitudes", con estado, tiempo restante, comentario del admin y el botón "Cancelar".

### 5.6.4 Pantalla del admin: cola de aprobación

```
┌ Solicitudes · DUO ─── [Pendientes (3)] [Aprobadas] [Rechazadas] [Vencidas] [Todas] ┐
│ Filtros: Tipo [Todos ▾]  Vendedor [Todos ▾]  Torre [Todas ▾]       🔍 [7D…]          │
├──────┬────────┬──────────┬────────────────┬──────────────┬───────────┬─────────────┤
│Unidad│Tipo    │Vendedor  │Cliente         │Seña / Plan   │Vence en   │Acciones     │
├──────┼────────┼──────────┼────────────────┼──────────────┼───────────┼─────────────┤
│7D    │Reservar│Laura (int)│Ana López      │USD 5.000 / F36│ 46 h     │[✓][✗][⋯]   │
│12A   │Vender  │Inmob. Sur│Juan Pérez      │— / Contado   │ ⚠ 3 h     │[✓][✗][⋯]   │
│3C    │Liberar │Pedro (int)│(cliente desistió)│ —          │ 30 h      │[✓][✗][⋯]   │
├──────┴────────┴──────────┴────────────────┴──────────────┴───────────┴─────────────┤
│ Seleccionadas: [Aprobar seleccionadas]  (el rechazo es de a una, con comentario)    │
└─────────────────────────────────────────────────────────────────────────────────────┘
 Detalle (panel lateral al hacer clic):
 ┌ Solicitud #184 · Reservar 7D ─────────────────────────────────────────┐
 │ Solicitó: Laura Gómez (vendedora interna) · 02/10 17:20 · vence 04/10 17:20 │
 │ Estado oficial actual: 🟢 Disponible (sin cambios desde la solicitud ✓) │
 │ Cliente: Ana López · +54 9 11 5555-1234 · lead de Meta Ads (preventa_oct) │
 │ Plan: Financiado 36 · Seña USD 5.000 · 📎 comprobante.pdf             │
 │ Comentario del vendedor: "Cliente confirma seña el lunes…"            │
 │ Comentario del admin: [                                          ]    │
 │ [✓ Aprobar]   [✗ Rechazar (comentario obligatorio)]   [⏱ Extender 24 h]│
 │ Historial: creada 17:20 · recordatorio enviado 02/10 17:20+24h        │
 └───────────────────────────────────────────────────────────────────────┘
```

- **Contador** de pendientes en el menú lateral y en el dashboard ("3 solicitudes pendientes, 1 vence en < 4 h").
- **Aprobación desde el celular:** el email trae un link directo a la solicitud (requiere estar logueado; la sesión del panel dura 30 días en dispositivos de confianza). No se aprueba "con un clic desde el mail" sin login, por seguridad.
- **Aprobación masiva** permitida; **rechazo** siempre de a una, con comentario.

### 5.6.5 Notificaciones

| Evento | Destinatarios | Canal |
|---|---|---|
| Nueva solicitud | Aprobadores del proyecto (admins de la desarrolladora o designados) | Email + aviso en el panel |
| Recordatorio a las 24 h sin respuesta y a 4 h del vencimiento | Aprobadores (y superadmin si está activado) | Email + aviso en el panel |
| Aprobada | Vendedor que solicitó | Email + aviso en el panel |
| Rechazada (con comentario) | Vendedor | Email + aviso en el panel |
| Vencida | Vendedor y aprobadores | Email + panel |
| Cerrada por cambio directo del admin | Vendedor | Email + panel |

- **Avisos en el panel:** campana con contador de no leídas, listado de notificaciones con link directo y marca de leída; el contador de solicitudes pendientes se actualiza en tiempo real.
- **Preferencias por usuario:** el email está siempre activo para las solicitudes; los aprobadores pueden pedir un **resumen diario** en lugar de avisos inmediatos (solo para aprobadores).
- **WhatsApp (etapa 2, decidido):** fuera del MVP. Cuando se sume, será vía **WhatsApp Cloud API** con plantillas aprobadas por Meta (ej. "Nueva solicitud de reserva: unidad {{1}} de {{2}}, vendedor {{3}}. Revisala acá: {{4}}"). Requiere el número y la cuenta de WhatsApp Business de Ad Astra o de la desarrolladora. El modelo de datos ya contempla el canal (`notification_preferences.canal`) para sumarlo sin rediseño.

### 5.6.6 Configuración por proyecto (Admin → Proyecto → Solicitudes)

- Vencimiento por defecto (horas): **48**.
- Qué ve el público mientras hay una solicitud pendiente: **Disponible** (por defecto) / Consultar disponibilidad.
- Aprobadores: todos los admins de la desarrolladora (por defecto) o una lista de usuarios específicos.
- Lead obligatorio para reservar/vender: **sí** (por defecto).
- Recordatorio al superadmin de Ad Astra si una solicitud no se responde en 24 h: no (por defecto).
- Canales de notificación: email y panel (MVP); WhatsApp en la etapa 2.

### 5.6.7 Auditoría

- Cada solicitud guarda su **ciclo completo** en `status_change_request_events`: creada, recordatorio enviado, extendida, aprobada/rechazada/vencida/cancelada, con usuario, fecha y comentario.
- La aprobación genera un registro en el **historial de cambios** (`change_log`) con `origen = request_approved`, `requested_by` (vendedor), `user_id` (aprobador) y `request_id`. Así se puede responder "¿quién reservó la 7D y quién lo autorizó?".
- Deshacer una aprobación (solo admin) restaura el estado anterior, deja la solicitud como `aprobada` + `revertida` y notifica al vendedor.
- Reporte exportable de solicitudes (por período, vendedor, tipo y resultado), con el **tiempo medio de aprobación**. Sirve para medir la agilidad de la desarrolladora y el desempeño de cada vendedor/broker.

## 5.7 Listas de precios y planes de pago

**Objetivo:** que la desarrolladora configure el cotizador sin ayuda.

- **Listas de precios:** nombre ("Contado", "Financiado 36 cuotas", "Inversores"), moneda, visibilidad (pública en el showroom / solo panel / solo vendedores), vigencia (desde/hasta, programable) y precio por unidad. El precio se puede definir de tres formas: cargado por unidad (en la tabla de unidades, una columna por lista), como **regla** respecto de otra lista ("Financiado = Contado + 12 %") o como **precio por m²** por piso/tipología.
- **Planes de pago** asociados a una lista: anticipo (% o monto mínimo), cantidad y periodicidad de cuotas (mensual/trimestral), **refuerzos** (monto o %, meses), saldo a posesión (%), moneda de las cuotas (USD/ARS), **ajuste por índice** (CAC u otro; en el MVP el valor del índice se carga a mano y se muestra como leyenda), descuentos y texto legal.
- **Simulador en el panel:** elegís una unidad y un plan y ves exactamente lo que va a ver el comprador (cronograma y PDF), antes de publicar.
- Validación: los porcentajes deben sumar 100 % (anticipo + cuotas + refuerzos + saldo).

```
┌ Plan "Financiado 36" ─────────────────────┬ Simulación: Unidad 7B ───────────┐
│ Lista: Financiado (Contado + 12 %)        │ Precio lista: USD 163.400         │
│ Anticipo: [30] %   mínimo USD [20.000]    │ Anticipo (30 %): USD 49.020        │
│ Cuotas: [36] × [mensual ▾] en [USD ▾]     │ 36 cuotas: USD 2.270               │
│ Refuerzos: [2] × [10] % en meses [12,24]  │ Refuerzos: 2 × USD 16.340          │
│ Saldo a posesión: [10] %                  │ Saldo posesión: USD 16.340         │
│ Ajuste: [CAC ▾] (último valor cargado)    │ Total: 100 % ✓      [Ver PDF]      │
└───────────────────────────────────────────┴────────────────────────────────────┘
```

## 5.8 Medios (renders, videos, tours, planos)

- **Biblioteca** por proyecto con carpetas automáticas (exterior, amenities, tipologías, unidades, avance de obra, planos) y etiquetas.
- **Galerías:** el admin crea galerías con nombre (ej. "Amenities", "Hall", "Avance octubre"), ordena las fotos arrastrando, elige portada y las asigna a secciones, tipologías o unidades.
- **Carga masiva con asignación automática:** si los archivos siguen una convención de nombre (ej. `7B_plano.png`, `tipoB_render_01.jpg`), el panel propone a qué unidad/tipología asignarlos y el admin confirma.
- **Carga por arrastrar y soltar** (múltiples archivos, hasta 2 GB por video). Al subir, el sistema **optimiza automáticamente**: imágenes a AVIF/WebP en varios tamaños; videos a MP4 *faststart* 720p/1080p + póster; muestra el progreso y avisa si un archivo excede el presupuesto de peso (y lo comprime automáticamente si se acepta). **Controles con mensajes claros:** resolución mínima, proporción esperada (ej. "Esta imagen es horizontal; para el modo vertical del celular conviene una versión 9:16 — ¿recortar automáticamente?"), formatos admitidos.
- **Secuencias de giro:** se suben como ZIP o carpeta de frames; el sistema los ordena por nombre, valida la cantidad y genera las versiones livianas.
- **Tours 360:** se agregan pegando la URL (Kuula, Matterport, Layama, 3DVista) con vista previa embebida, o subiendo panorámicas equirectangulares.
- **Uso:** cada medio muestra dónde se usa (tipología, unidad, sección). Si se intenta borrar un medio en uso, el panel avisa. Reemplazar un archivo mantiene todas sus vinculaciones.
- **Permisos:** el admin de la desarrolladora puede subir y reemplazar **cualquier** medio, incluidos los **videos de transición y las secuencias de giro** de los puntos de vista existentes (el panel valida que el reemplazo tenga una duración y resolución compatibles). Lo único que en el MVP configura Ad Astra es la **creación de puntos de vista y transiciones nuevas** del recorrido, porque llegan junto con videos nuevos que produce Ad Astra (ver 0.2). El editor de recorrido autoservicio llega en la etapa 2.
- **Deshacer** también aplica a los medios: reemplazar o borrar un archivo se puede revertir desde el historial.

## 5.9 Contenidos y branding

- **Branding:** logo (claro/oscuro), favicon, colores primario/secundario, tipografía (lista de Google Fonts), imagen para compartir en redes (Open Graph), estilo de botones.
- **Contenidos:** secciones del showroom activables y ordenables (portada, proyecto, amenities, ubicación y puntos de interés, avance de obra, desarrolladora, contacto), con textos editables (editor simple con negrita, listas y links) y medios asignados. Textos legales y disclaimer de precios.
- **Secciones personalizadas:** el admin puede crear secciones nuevas a partir de bloques predefinidos (texto, galería, video, botón/CTA, lista de ítems con íconos) y ubicarlas en el menú del showroom.
- **Traducciones:** si el proyecto tiene varios idiomas, cada texto se edita por idioma, con indicador de textos sin traducir.
- **Avance de obra:** entradas por fecha con fotos/videos y texto corto.
- **Contacto:** número de WhatsApp (y mensaje prellenado con la unidad), email que recibe leads, formulario (campos activables: presupuesto, plazo, uso, cómo nos conociste).
- **Píxeles y analítica del cliente:** ID de GA4, GTM y Píxel de Meta propios de la desarrolladora (además de la medición propia del panel).
- Todo esto pasa por **borrador → vista previa → publicar**.

## 5.10 Leads (CRM liviano)

```
┌ Leads · DUO ── [Todos ▾] [Nuevo|Contactado|Visita|Reserva|Perdido] 🔍 [⤓ Excel] ┐
│ Fecha      Nombre        Unidad  Fuente         Campaña          Estado  Vendedor │
│ 02/10 17:12 Ana López    7B      Meta Ads       preventa_oct     🆕 Nuevo  —       │
│ 02/10 15:40 Juan Pérez   12A     WhatsApp       —                📞 Contac. Laura  │
│ 01/10 21:05 M. Gómez     —       Google Ads     search_marca     📅 Visita  Pedro  │
└─────────────────────────────────────────────────────────────────────────────────┘
 Detalle (panel lateral): datos, unidad y plan cotizado (con PDF), recorrido previo en el
 showroom (unidades vistas), UTM completas, notas, historial de estados, botón WhatsApp.
```

- **Decisión CRM (2/10/2026):** el MVP usa el **CRM liviano propio** del panel (leads, estado, vendedor asignado, notas, vínculo con la solicitud de reserva/venta). **Tokko Broker es la primera integración y entra en el MVP** (justificación en 5.13). Para otros CRM, un **webhook genérico**.
- Los leads entran desde el formulario del showroom, el clic en WhatsApp (registrado como "intención", con la unidad) y, en etapa 2, desde Meta Lead Ads.
- Estados configurables (por defecto: nuevo, contactado, visita agendada, reserva, venta, perdido), **asignación de vendedor** (manual o rotativa) y notas.
- **Notificaciones:** email inmediato al vendedor asignado o al admin; resumen diario opcional.
- **Integración:** cada lead nuevo se envía automáticamente a **Tokko Broker** (si está configurado) y/o al **webhook genérico** (JSON con lead + unidad + UTM). Cada envío queda registrado con su estado y reintentos. Exportación a Excel con filtros.
- Deduplicación por email/teléfono dentro del proyecto (se agrupan las consultas del mismo contacto).
- El detalle del lead muestra sus **solicitudes de reserva/venta** y su resultado. Al aprobarse una, el lead pasa automáticamente a "Reserva" o "Venta".

## 5.11 Usuarios

- Listado de usuarios con rol, proyectos asignados, permisos finos (⚙️), último acceso y estado (activo/invitado/suspendido).
- Invitar por email; reenviar invitación; suspender (conserva el historial); cambiar el rol.
- El admin de la desarrolladora gestiona los usuarios de su organización; solo el superadmin crea admins de una organización nueva.

## 5.12 Historial de cambios con deshacer

```
┌ Historial · DUO ── [Usuario ▾] [Tipo ▾] [Fecha ▾] 🔍 "7B" ─────────────────────┐
│ 02/10 17:30 Martín (Admin) aprobó solicitud #183 de Laura (Vendedor):            │
│             Estado 7B: Disponible → Reservada                  [Ver][Deshacer]│
│ 02/10 16:02 Martín (Admin)    Edición masiva: precio +5 % en 48 unid.  [Ver][Deshacer]│
│ 02/10 11:15 Martín (Admin)    Importó "precios_oct.xlsx": 37 cambios   [Ver][Deshacer]│
│ 01/10 19:40 Ad Astra (soporte) Publicó contenido: 3 cambios             [Ver][Deshacer]│
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Registra **todo** cambio: quién, cuándo, qué entidad, valor anterior y nuevo, origen (edición, masiva, importación, publicación, API, **solicitud aprobada**). En los cambios por solicitud se muestran el solicitante y el aprobador.
- Los cambios masivos e importaciones son **un solo registro deshacible en bloque**, con detalle expandible.
- **Deshacer** aplica el valor anterior como un nuevo cambio (no borra la historia). Si el campo fue modificado de nuevo después, el panel avisa del conflicto y deja elegir.
- Retención: completa durante la vida del proyecto (mínimo 24 meses).

## 5.13 Integraciones (simple, MVP)

Todo lo configura el admin de la desarrolladora con un asistente: Tokko Broker, webhook genérico, IDs de GA4/GTM/Píxel y destinatarios del reporte semanal. El dominio se ve en solo lectura (en el MVP lo configura Ad Astra).

**Tokko Broker (MVP): envío automático de leads**

- **Qué hace:** cada lead del showroom (formulario y, opcionalmente, clic en WhatsApp con datos) se crea como consulta en Tokko, asociado al **emprendimiento** correspondiente, con nombre, email, teléfono, mensaje (incluye unidad consultada y plan cotizado) y etiquetas (ej. `showroom`, fuente/campaña).
- **Cómo:** Tokko ofrece en su documentación para desarrolladores un endpoint para publicar consultas web (`POST /api/v1/webcontact`) que se autentica con la **API key de la inmobiliaria/desarrolladora** (con permiso de escritura). Según los foros de la documentación, la consulta debe ir asociada a un emprendimiento o propiedad para que se registre.
- **Asistente de configuración (autoservicio):** 1) pegar la API key (el panel explica dónde encontrarla en Tokko: *Mi empresa → Permisos*); 2) elegir o pegar el ID del emprendimiento en Tokko para este proyecto; 3) opcional: mapear unidades a propiedades de Tokko; 4) "Enviar lead de prueba" con el resultado visible.
- **Robustez:** cola con reintentos (backoff), registro de cada envío (ok/error con el mensaje de Tokko) y alerta por email al admin si fallan envíos consecutivos (ej. API key revocada).
- **Alcance:** unidireccional (panel → Tokko). La sincronización de estados/unidades desde Tokko queda para la etapa 2–3.
- **Por qué en el MVP:** es un único endpoint documentado y la infraestructura de cola, reintentos y registro ya existe para el webhook genérico. El costo marginal estimado es de **≈ 3–4 días** (incluido el asistente), y reemplaza al "1 conector" que ya estaba presupuestado en el MVP, así que **no suma tiempo**. Además, la mayoría de los clientes de Ad Astra usa Tokko: sin esto, el equipo comercial tendría que cargar leads dos veces. *Riesgo a validar en el descubrimiento: probar con la API key de un cliente real (en los foros hay casos de error 401 por permisos de la key).*

## 5.14 Campos personalizados y catálogo de características

**Objetivo:** que el cliente agregue cualquier dato nuevo sin pedirle nada a Ad Astra.

```
┌ Campos del proyecto · DUO ───────────────────────────────────────────────────┐
│ Campos fijos: código, piso, tipología, m², orientación, precio, estado…     │
│ Campos personalizados:                                       [+ Nuevo campo] │
│ ≡ Expensas estimadas   Número (ARS)   Ficha ✓  Filtro ☐  Público ✓  [Editar] │
│ ≡ Apto profesional     Sí/No          Ficha ✓  Filtro ✓  Público ✓  [Editar] │
│ ≡ Tipo de cochera      Lista (simple/doble/ninguna)  Ficha ✓ Filtro ✓ Púb. ✓ │
│ ≡ Comisión broker      Número (%)     Ficha ✗  Filtro ✗  Público ✗ (interno) │
├──────────────────────────────────────────────────────────────────────────────┤
│ Catálogo de características (con ícono): Balcón · Parrilla · Toilette ·     │
│ Lavadero · Vestidor · Jardín · Pileta propia ·            [+ Característica] │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Tipos de campo:** texto corto, texto largo, número (con unidad: m², ARS, USD, %), sí/no, lista de opciones (simple o múltiple), fecha, link.
- **Configuración por campo:** nombre visible (por idioma), aplica a unidades y/o tipologías, obligatorio u opcional, **público o interno**, se muestra en la ficha, se usa como **filtro** en el buscador del showroom, orden (arrastrable) y texto de ayuda.
- **Catálogo de características:** lista de ítems con ícono (biblioteca de íconos incluida) que se tildan por tipología o unidad y se muestran como chips en la ficha.
- **Integración con todo el panel:** los campos nuevos aparecen como columnas en la tabla de unidades, en la edición masiva, en la plantilla de Excel (importación/exportación), en el historial y en el webhook.
- **Seguridad:** borrar un campo con datos pide confirmación, lo archiva (no lo destruye) y se puede restaurar desde el historial. Cambiar el tipo de un campo con datos valida la conversión (ej. texto → número) antes de aplicarla.

## 5.15 Editor visual de zonas clickeables (polígonos y hotspots)

**Objetivo:** que el cliente dibuje o corrija las zonas clickeables sobre fachadas, plantas, masterplans y renders sin depender de nadie.

```
┌ Editor de zonas · Piso 7 · Torre A ──────────────── [Vista previa] [Guardar] ┐
│ Herramientas: [▢ Rectángulo] [⬠ Polígono] [● Hotspot] [✋ Mover] [⧉ Copiar]   │
│ ┌──────────────────────────────────────────┐  Zona seleccionada:            │
│ │           (plano de planta del piso)     │  Vinculada a: [Unidad 7B ▾]    │
│ │   ┌──────┐  ┌───────────┐                │  Etiqueta: [7B]                │
│ │   │ 7A   │  │   7B ◉    │  ← editando    │  Color: según estado ✓         │
│ │   └──────┘  └───────────┘                │  [Copiar a pisos 2–14]         │
│ │   ┌──────┐  ┌───────────┐                │  [Eliminar zona]               │
│ │   │ 7C   │  │   7D      │                │                                │
│ │   └──────┘  └───────────┘                │  Unidades del piso sin zona:   │
│ └──────────────────────────────────────────┘  ⚠ 7E (arrastrala al plano)     │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Dónde se usa:** fachada/vista exterior (zonas = torres o pisos), planta de piso (zonas = unidades), masterplan (zonas = lotes, manzanas o casas) y renders (hotspots de amenities o puntos de interés).
- **Herramientas:** rectángulo, polígono libre (clic por vértice, doble clic para cerrar), hotspot (punto con ícono), mover/editar vértices, zoom, deshacer/rehacer dentro del editor, imán a bordes y a otras zonas.
- **Vínculos:** cada zona se vincula a una unidad, piso, torre, amenity, tour 360, galería o link. El panel avisa de **unidades sin zona** y de **zonas sin vínculo**.
- **Productividad:** **copiar zonas a otros pisos** (pisos tipo: se dibuja uno y se replica a todos, renombrando unidades por patrón, ej. "{piso}B"); duplicar zona; importar zonas desde otro proyecto/piso.
- **Coordenadas relativas** (0–1) respecto de la imagen, así las zonas siguen alineadas si se reemplaza la imagen por otra de la misma proporción. Si la proporción cambia, el panel avisa y deja reajustar.
- **Publicación:** los cambios de zonas pasan por **borrador → vista previa → publicar** y se pueden deshacer desde el historial.
- **Videos/giros:** en las vistas exteriores con giro orbital, las zonas se dibujan por cada punto de vista principal (en el MVP, no sobre cada frame del giro).

## 5.16 Onboarding guiado y ayuda

- **Checklist "Primeros pasos"** por proyecto, con progreso visible: completar datos del proyecto → branding → cargar o importar unidades → revisar precios y plan de pago → subir medios → revisar zonas clickeables → invitar al equipo → configurar Tokko/webhook → vista previa → publicar.
- **Plantillas:** Excel de unidades con ejemplos, plan de pago de ejemplo y secciones de contenido prearmadas.
- **Ayuda contextual:** íconos ⓘ en cada campo y pantalla, **videos de 1–2 minutos** por tarea frecuente (cambiar precios, subir renders, dibujar zonas, aprobar reservas) y un centro de ayuda con buscador dentro del panel.
- **Estados vacíos útiles:** cada pantalla vacía explica qué hacer y ofrece el botón para hacerlo (ej. "Todavía no hay unidades. [Importar desde Excel] [Cargar a mano]").
- **Mensajes de error en lenguaje simple** que dicen cómo resolver el problema ("Los m² totales no pueden ser menores que los cubiertos (fila 14)").
- **Tour guiado** la primera vez que un usuario entra, según su rol (admin, vendedor, solo lectura).
- **Último recurso:** botón "Necesito ayuda" (formulario con captura de pantalla automática) y "Pedí una mejora". Los pedidos se registran para medir el indicador de autoadministración (sección 0).

# 6. Métricas: definiciones e implementación

## 6.1 Definiciones (se muestran como ayuda "ⓘ" en el dashboard)

| Métrica | Definición |
|---|---|
| **Visitas** | Sesiones en el showroom. Una sesión termina tras 30 min sin actividad o a medianoche (hora Argentina). |
| **Usuarios únicos** | Visitantes distintos en el período, identificados por un ID anónimo propio del navegador (no por datos personales). Un mismo usuario en celular y computadora cuenta dos veces. |
| **Origen / fuente** | Según UTM (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`), el `fbclid`/`gclid` y el referrer: Meta Ads, Google Ads, orgánico, redes, directo, WhatsApp, email, otros. Atribución a la **primera fuente de la sesión**. |
| **Dispositivo** | Celular, computadora o tablet (por *user agent* y tamaño de pantalla). |
| **Vistas de unidad** | Aperturas de la ficha de una unidad. "Unidades más vistas" ordena por usuarios únicos que abrieron la ficha. |
| **Embudo** | % de sesiones que llegan a cada paso: visita → vio al menos una ficha → cotizó (generó una simulación) → dejó lead (formulario enviado o clic en WhatsApp). |
| **Leads por fuente** | Leads del período agrupados por fuente/campaña de la sesión en que se generaron, y por canal (formulario vs. WhatsApp). |
| **Conversión** | Leads ÷ visitas. |

Se excluyen bots conocidos, el tráfico de vista previa y (opcional) las IP de la oficina de la desarrolladora y de Ad Astra.

## 6.2 Eventos que registra el showroom

| Evento | Propiedades principales |
|---|---|
| `session_start` | utm_*, referrer, landing, device, idioma, país/ciudad aprox. |
| `page_view` | sección (portada, exterior, piso, ficha, amenities, ubicación…) |
| `building_view` / `floor_view` | torre, piso |
| `unit_view` | unit_id, origen (planta, buscador, destacado) |
| `tour_open` / `media_open` | tipo, unit_id/tipología |
| `filter_used` | filtros aplicados |
| `quote_created` | unit_id, lista, plan |
| `quote_pdf_download` | unit_id |
| `whatsapp_click` | unit_id (si la hay) |
| `lead_submitted` | lead_id, unit_id, canal |

## 6.3 Implementación recomendada

**Medición propia en Supabase como fuente del dashboard + GA4 en paralelo.**

- **Por qué medición propia:** el dashboard tiene que ser multi-cliente, mostrarse dentro del panel con la marca de Ad Astra, cruzar eventos con unidades y leads (que viven en nuestra base) y no depender de bloqueadores ni de los límites o cambios de GA4. Además, los datos quedan en manos de Ad Astra.
- **Por qué GA4 igual:** el equipo de pauta de Ad Astra ya trabaja con GA4/Meta. Los eventos se envían también a GA4 y al Píxel (vía GTM) para optimizar campañas. Los números pueden diferir levemente de GA4 (distinta metodología), y el panel lo aclara.
- **PostHog:** queda como opción para la etapa 2 (mapas de calor, grabación de sesiones) o como alternativa si se prefiere no mantener la ingesta propia. En el MVP no hace falta.

**Arquitectura:**

```
Showroom (navegador)
  └─ tracker JS liviano (<3 KB): visitor_id (localStorage, cookie 1ª parte), session_id,
     cola en memoria + navigator.sendBeacon cada 5 s / al salir
        └─► POST /api/track  (Edge function: valida project_id, filtra bots, agrega geo aprox.
                              por IP sin guardarla, rate limit)
               └─► Postgres: tabla events (particionada por mes)
                      ├─ rollup cada 15 min → metrics_daily (proyecto × día × fuente × dispositivo)
                      ├─ rollup → unit_metrics_daily (proyecto × unidad × día)
                      └─ dashboard del panel consulta los rollups (rápido)
  └─ GTM → GA4 + Píxel de Meta (en paralelo)

Cron semanal (lunes 9:00 ART) → arma el reporte por proyecto → email (Resend) a los destinatarios
```

- **Volumen estimado (supuesto, a validar):** 30 proyectos × 10.000 visitas/mes × ~20 eventos = ~6 M eventos/mes. Es manejable en Postgres con particiones mensuales y rollups. Se guardan los eventos crudos 13 meses y los agregados de forma indefinida.
- **Latencia del dashboard:** datos con un máximo de **15 min** de demora; los leads, en tiempo real.
- **Privacidad (Ley 25.326):** sin datos personales en los eventos (el lead se vincula por lead_id), IP no almacenada, aviso de cookies y política de privacidad en el showroom.
- **Exportación:** CSV/Excel de cualquier tabla del dashboard y del detalle diario.
- **Reporte semanal por mail:** se envía cada lunes a las 9:00 (hora Argentina) a los destinatarios configurados. Incluye los KPIs de la semana vs. la anterior, el embudo, las 5 unidades más vistas, los leads por fuente, las 3 mejores campañas y un link al dashboard. Se puede activar o desactivar por usuario. Opcional: el mismo reporte mensual.

## 6.4 Etapa 2: inversión publicitaria y costo por lead (fuera del MVP)

- **Decidido:** no entra en el MVP. En la etapa 2 se suma una conexión opcional por proyecto con **Meta Ads** y **Google Ads** (lectura de inversión por campaña y por día).
- Con eso, el dashboard suma: inversión del período, **costo por lead (CPL)** por fuente y campaña, y costo por visita. Se cruza por `utm_campaign` / ID de campaña.
- **Activable por proyecto** por el superadmin de Ad Astra (y visible solo para los roles que se definan), porque expone el gasto publicitario.

# 7. Modelo de datos (tablas principales)

| Tabla | Campos clave |
|---|---|
| `organizations` | id, nombre, slug, logo, estado, plan, created_at |
| `users` | id (Supabase Auth), nombre, email, teléfono, 2fa, último acceso |
| `memberships` | id, user_id, organization_id, rol (`superadmin`/`org_admin`/`seller`/`viewer`), permisos (jsonb: `can_edit_prices`, `sees_all_leads`, `sees_metrics`, `can_change_status`), estado |
| `project_members` | membership_id, project_id (si está vacío: todos los proyectos de la organización) |
| `projects` | id, organization_id, nombre, slug, dominio, estado (`draft`/`published`), moneda, idiomas, dirección, lat/lng, fecha_entrega, contacto (jsonb), settings (jsonb: incluye `request_expiry_hours` = 48, `public_pending_display` = `available`/`ask`, `approver_user_ids`, `lead_required_for_request`, `escalate_to_superadmin`), published_version |
| `buildings` | id, project_id, nombre, tipo (torre/etapa/manzana), orden |
| `floors` | id, building_id, nombre, número, orden, plano_media_id, overlay (jsonb: polígonos) |
| `typologies` | id, project_id, **custom_values (jsonb)**, nombre, ambientes, dormitorios, baños, m2_* de referencia, características (jsonb), plano_2d_id, planta_3d_id, tour_url |
| `units` | id, project_id, floor_id, typology_id, **custom_values (jsonb, según `custom_field_definitions`)**, código, tipo, ambientes, dormitorios, baños, m2_cubiertos, m2_semicubiertos, m2_descubiertos, m2_totales, m2_terreno, frente, fondo, orientación, vista, estado, **pending_request_id** (FK, nulo si no hay solicitud activa), **reserved_by_user_id**, **reserved_lead_id**, estado_desde, mostrar_precio, destacada, overrides (jsonb), notas_internas, overlay (jsonb: polígono), version, updated_at, updated_by |
| `status_change_requests` | id, project_id, unit_id, tipo (`reserve`/`sell`/`release`), estado_desde (estado oficial al crear), estado_hacia, requested_by (user_id), lead_id, price_list_id, payment_plan_id, monto_seña, moneda_seña, comprobante_media_id, comentario_vendedor, estado (`pending`/`approved`/`rejected`/`expired`/`cancelled`/`resolved_by_direct_change`), expires_at, extended_count, decided_by, decided_at, comentario_admin, unit_version_at_request, reverted (bool), created_at, updated_at. **Índice único parcial** `(unit_id) WHERE estado = 'pending'` → garantiza una sola solicitud activa por unidad. |
| `status_change_request_events` | id, request_id, tipo (created/reminder_sent/extended/approved/rejected/expired/cancelled/resolved/reverted), user_id, detalle (jsonb), created_at |
| `notification_preferences` | user_id, project_id, evento, canal (email/panel en el MVP; whatsapp en etapa 2), modo (inmediato/resumen diario), activo |
| `notifications` | id, user_id, tipo, entidad, entidad_id, canal, estado_envío, leída, created_at |
| `price_lists` | id, project_id, nombre, moneda, visibilidad, vigente_desde, vigente_hasta, regla (jsonb: base_list_id, % / por m²) |
| `unit_prices` | unit_id, price_list_id, precio |
| `payment_plans` | id, price_list_id, nombre, anticipo_pct, anticipo_min, cuotas, periodicidad, moneda_cuotas, refuerzos (jsonb), saldo_posesion_pct, índice (CAC/ninguno), descuento_pct, texto_legal |
| `index_values` | índice, período, valor (carga manual en el MVP) |
| `media` | id, project_id, tipo (imagen/video/plano/panorámica/tour_url), carpeta, url_original, variantes (jsonb), peso, dimensiones, estado_proceso, tags |
| `media_links` | media_id, entidad (tipología/unidad/sección/piso), entidad_id, rol (render, plano, portada…), orden |
| `content_sections` | id, project_id, tipo, orden, activo, contenido (jsonb, por idioma) |
| `branding` | project_id, colores, tipografía, logos, og_image |
| `drafts` | id, project_id, entidad, entidad_id, cambios (jsonb), autor, created_at (cambios de contenido pendientes de publicar) |
| `leads` | id, project_id, unit_id, nombre, email, teléfono, mensaje, canal (form/whatsapp/meta), estado, assigned_to, quote (jsonb), utm (jsonb), session_id, visitor_id, created_at |
| `lead_activities` | id, lead_id, tipo (nota/cambio_estado/asignación), detalle, user_id, created_at |
| `change_log` | id, project_id, change_set_id, user_id, impersonated_by, **requested_by**, **request_id**, entidad, entidad_id, campo, valor_anterior, valor_nuevo, origen (edit/bulk/import/publish/api/undo/**request_approved**), created_at |
| `change_sets` | id, project_id, user_id, tipo, descripción, cantidad, archivo (si fue importación), deshecho_por |
| `events` | id, project_id, visitor_id, session_id, nombre, props (jsonb), unit_id, device, utm_source/medium/campaign, referrer_tipo, país, ciudad, ts (particionada por mes) |
| `metrics_daily` | project_id, fecha, fuente, campaña, dispositivo, visitas, usuarios, fichas, cotizaciones, leads |
| `unit_metrics_daily` | project_id, unit_id, fecha, vistas, usuarios, cotizaciones, leads |
| `integrations` | id, project_id, tipo (`webhook`/`tokko`/…), config (cifrada: url+secreto, o api_key + tokko_development_id + mapeo unidad→propiedad), estado, último_envío, errores_consecutivos |
| `integration_deliveries` | id, integration_id, lead_id, intento, estado (ok/error/pendiente), respuesta (código + mensaje), next_retry_at, created_at |
| `custom_field_definitions` | id, project_id, clave, nombre (jsonb por idioma), tipo (text/longtext/number/boolean/select/multiselect/date/url), unidad_medida, opciones (jsonb), aplica_a (unit/typology), obligatorio, público, en_ficha, en_filtro, orden, ayuda, archivado |
| `characteristics` | id, project_id, nombre (jsonb por idioma), ícono, orden, archivado |
| `entity_characteristics` | entidad (typology/unit), entidad_id, characteristic_id |
| `overlays` (zonas clickeables) | id, project_id, contenedor (floor/viewpoint/masterplan/media), contenedor_id, forma (rect/polygon/hotspot), puntos (jsonb, coordenadas 0–1), vínculo_tipo (unit/floor/building/amenity/tour/gallery/url), vínculo_id, etiqueta, estilo (jsonb), orden, estado (draft/published) |
| `viewpoints` / `transitions` | Puntos de vista del recorrido exterior (imagen o secuencia de giro, orden) y videos de transición entre ellos (from, to, media_id, sentido). En el MVP los crea Ad Astra; el admin reemplaza sus medios |
| `galleries` / `gallery_items` | Galerías con nombre (por idioma), portada y asignación (sección/tipología/unidad); ítems con media_id y orden |
| `onboarding_progress` | project_id, paso, completado_por, completado_at |
| `support_requests` | id, project_id, user_id, tipo (ayuda/mejora/cambio_de_datos), descripción, captura_media_id, estado, created_at (alimenta el indicador de autoadministración) |
| `report_subscriptions` | user_id, project_id, frecuencia (semanal/mensual), activo |

# 8. Notas técnicas

- **Stack:** el panel vive en la misma app **Next.js + TypeScript** que el showroom, en `admin.` o `/admin`, con **Supabase** (Postgres, Auth, Storage/R2 para medios) y componentes **shadcn/ui**.
- **Seguridad multi-cliente:** **RLS** en todas las tablas por `organization_id`/`project_id` según las membresías; permisos finos en funciones SQL (`can_edit_prices(user, project)`); service role solo en el servidor. Los tests automáticos de permisos son parte del criterio de aceptación.
- **Tabla editable:** **TanStack Table** con virtualización (fluida con 2.000+ filas) o **AG Grid Community** si se prioriza la experiencia "Excel" (pegar rangos, rellenar hacia abajo). Se decide en un *spike* de 2–3 días.
- **Excel/CSV:** **SheetJS** para leer y escribir .xlsx. La validación y el diff se hacen en el servidor; la aplicación ocurre en una transacción por *change set*.
- **Concurrencia:** cada unidad tiene `version`. Si dos personas editan la misma celda, la segunda recibe "Esta unidad cambió hace un momento (Laura: Reservada). ¿Sobrescribir?".
- **Solicitudes de estado:** se crean con una función SQL `request_status_change()` (valida rol, asignación al proyecto, que no haya otra pendiente gracias al índice único parcial, y que liberar solo aplique a unidades reservadas por ese vendedor) y se resuelven con `approve_request()` / `reject_request()`. Cada una corre en una transacción que verifica la `version` de la unidad. El **vencimiento** lo procesa un job programado (pg_cron cada 5 min), que también envía los recordatorios. Las notificaciones salen de una cola (tabla `notifications` + worker) para no bloquear la transacción. El showroom público **no lee** `pending_request_id` salvo que el proyecto tenga `public_pending_display = ask`.
- **Campos personalizados:** valores en `custom_values` (jsonb) validados contra `custom_field_definitions` en una función del backend; índice GIN para filtrar en el showroom. La tabla de unidades genera sus columnas dinámicamente desde las definiciones.
- **Editor de zonas:** componente propio en React con SVG sobre la imagen (coordenadas normalizadas 0–1), con la misma lógica de render que usa el showroom (lo que se ve en el editor es lo que se ve en la web). Copiar a pisos = clonar los `overlays` cambiando el contenedor y resolviendo el vínculo por patrón de código de unidad.
- **Tokko:** worker que consume la cola de leads y llama a `POST /api/v1/webcontact?key=…` con el ID de emprendimiento; reintentos con backoff exponencial (hasta 24 h) y registro en `integration_deliveries`. La API key se guarda cifrada y nunca se muestra completa.
- **Historial:** triggers de Postgres que escriben `change_log` con el valor anterior y el nuevo (jsonb), más `change_set_id` para operaciones masivas. Deshacer = nuevo cambio inverso.
- **Publicación en vivo:** al guardar datos comerciales, el backend invalida el caché del showroom (*on-demand revalidation* por tag de proyecto en Next.js/Vercel) y emite un evento por **Supabase Realtime**, así los visitantes con la página abierta ven el estado nuevo sin recargar. Meta: ≤ 10 s.
- **Borradores:** los cambios de contenido se guardan en `drafts`. La vista previa renderiza el showroom fusionando el borrador y "publicar" aplica todo en una transacción.
- **Medios:** subida directa a R2 con URL firmada; un job (ffmpeg en un worker o Cloudflare Stream/Images) genera las variantes y actualiza `media.estado_proceso`.
- **Programación de listas de precios:** un cron cada minuto activa las listas cuya vigencia empieza (con invalidación de caché).
- **Emails:** Resend para invitaciones, notificaciones de leads y reportes. Plantillas con la marca de la desarrolladora y la firma de Ad Astra.
- **Formato regional:** números y fechas en formato argentino (`142.000`, `48,20`, `02/10/2026`), moneda configurable y zona horaria America/Argentina/Buenos_Aires.
- **Auditoría y backups:** Supabase con backups diarios / PITR. Los accesos de soporte quedan registrados.
- **Observabilidad:** Sentry en el panel y en el showroom, más logs de webhooks con reintentos y estado visible en Integraciones.

# 9. Criterios de aceptación (MVP)

**Autonomía y velocidad**

1. Un admin de desarrolladora cambia los **m²** de una unidad desde la tabla y el cambio se ve en el showroom público en **≤ 10 s**, sin intervención de Ad Astra.
2. Un admin cambia el estado de una unidad desde la tablet (vista planta) en **≤ 3 clics**, y el cambio se ve en el showroom en ≤ 10 s.
3. Una edición masiva de precio (+5 %, redondeo a 500) sobre 200 unidades se aplica en **< 5 s**, muestra el resumen antes de confirmar y se puede **deshacer en bloque**.
4. Importar un Excel de **500 filas** muestra la vista previa con diferencias y errores en **< 15 s**; aplicar los cambios válidos los registra como un único cambio deshacible.
5. Exportar → editar en Excel → importar el mismo archivo sin cambios da **"0 cambios"** (ida y vuelta consistente).
6. Pegar un rango de 20×3 celdas desde Google Sheets actualiza esas celdas tras la confirmación.
7. Una lista de precios programada se activa en el horario configurado (±1 min).

**Solicitudes de cambio de estado (vendedores/brokers)**

- **2a.** Un vendedor **no puede** cambiar el estado oficial de una unidad (ni por el panel ni por la API). Solo puede crear una solicitud de reservar, vender o liberar, y liberar solo sobre unidades reservadas a su nombre.
- **2b.** Un vendedor crea una solicitud de reserva desde la ficha o la vista planta en **≤ 4 clics** (con el lead elegido). La unidad pasa a "🟠 Reserva pendiente" en el panel para todos los usuarios en ≤ 10 s.
- **2c.** Mientras la solicitud está pendiente, **el showroom público sigue mostrando "Disponible"** (con la configuración por defecto). Con `public_pending_display = ask`, muestra "Consultar disponibilidad" y no permite cotizar.
- **2d.** Un segundo vendedor que intenta solicitar la misma unidad recibe "Esta unidad tiene una solicitud pendiente — vence en X h" y **no puede** crear otra. Dos solicitudes simultáneas sobre la misma unidad dan como resultado exactamente una pendiente (test de concurrencia).
- **2e.** Los aprobadores reciben un email en **≤ 1 min** con link directo a la solicitud y un aviso en el panel (campana + contador de pendientes, actualizado en tiempo real). No se envían WhatsApp en el MVP.
- **2f.** Al **aprobar**, el estado oficial cambia y se ve en el showroom en ≤ 10 s; el lead asociado pasa a "Reserva"/"Venta"; el vendedor recibe la notificación; el historial muestra solicitante y aprobador.
- **2g.** **Rechazar** sin comentario no es posible. Al rechazar, la unidad se desbloquea y el vendedor recibe el comentario.
- **2h.** Una solicitud sin respuesta **vence** a las 48 h (o al valor configurado) con una tolerancia de ±5 min: pasa a "vencida", se desbloquea la unidad y se notifica a vendedor y aprobadores. Antes se envían recordatorios a las 24 h y a 4 h del vencimiento.
- **2i.** Si el estado oficial cambió desde la solicitud, al aprobar el panel muestra el conflicto y exige confirmación explícita. Si un admin cambia el estado directamente, la solicitud se cierra como "resuelta por cambio directo" con aviso al vendedor.
- **2j.** El reporte de solicitudes se exporta a Excel con tiempos de aprobación por período y vendedor.

**Autoadministración (sin intervención de Ad Astra)**

- **AA1.** Un admin de desarrolladora crea un campo personalizado nuevo (ej. "Tipo de cochera", lista de opciones), lo completa para 20 unidades con la edición masiva y lo activa como filtro: el campo aparece en la ficha y en el buscador del showroom después de publicar, **sin ninguna acción de Ad Astra**.
- **AA2.** Sube por arrastrar y soltar 30 renders (JPG de hasta 20 MB): quedan optimizados (AVIF/WebP, varias medidas) en < 2 min, se asignan a una galería o tipología y se ven en la vista previa.
- **AA3.** Reemplaza el video de una transición existente por uno nuevo compatible: después de publicar, el showroom usa el nuevo y el anterior se puede restaurar desde el historial.
- **AA4.** Dibuja con el editor visual las zonas de un piso de 6 unidades en **< 5 min**, las copia a 10 pisos más con renombrado automático y el panel informa "0 unidades sin zona".
- **AA5.** Crea una tipología nueva duplicando otra, agrega una sección personalizada con galería y cambia los colores del branding, todo con vista previa y deshacer.
- **AA6.** Un admin nuevo completa el checklist "Primeros pasos" de un proyecto de prueba **sin ayuda de Ad Astra** (prueba con 3 usuarios reales); los pasos quedan marcados como completos.
- **AA7.** En el primer mes del piloto, se registra cada pedido a Ad Astra; después del primer mes, **0 pedidos de cambios de datos o contenido** (solo producción 3D nueva o mejoras de producto).

**Tokko Broker**

- **TK1.** El admin configura Tokko con el asistente (API key + emprendimiento) y el botón "Enviar lead de prueba" muestra el resultado (ok o el error devuelto por Tokko).
- **TK2.** Un lead del showroom aparece en Tokko en **≤ 2 min**, asociado al emprendimiento, con la unidad consultada y la fuente/campaña en el mensaje o las etiquetas.
- **TK3.** Si Tokko no responde o devuelve un error, el envío se reintenta automáticamente, queda visible en el registro y, tras 5 fallas seguidas, el admin recibe un email de alerta. Ningún lead se pierde (sigue en el CRM del panel).

**Seguridad y permisos**

8. Un vendedor **no puede** editar precios (ni por la API) salvo que tenga el permiso activado; un usuario de la organización A **no puede** leer ni escribir datos de la organización B (tests automáticos de RLS).
9. Un vendedor ve solo sus leads asignados por defecto, y solo sus propias solicitudes (a los brokers externos no se les muestra el nombre del vendedor que bloqueó una unidad).
10. Toda acción de soporte de Ad Astra aparece en el historial con "Ad Astra (soporte)".

**Historial y publicación**

11. Todo cambio de unidad, precio, contenido o usuario aparece en el historial con usuario, fecha, valor anterior y nuevo.
12. Deshacer restaura el valor anterior. Si hubo un cambio posterior en el mismo campo, avisa del conflicto.
13. Los cambios de contenido no se ven en el showroom hasta "Publicar"; el link de vista previa funciona sin login y vence a las 24 h.

**Métricas**

14. El dashboard muestra visitas, usuarios únicos, origen/UTM/campaña, dispositivo, unidades más vistas, embudo y leads por fuente para cualquier período, con datos de **≤ 15 min** de antigüedad.
15. En una prueba controlada (100 visitas simuladas con UTM conocidas), el dashboard atribuye correctamente ≥ 98 % de las visitas a su fuente y campaña.
16. Cualquier tabla del dashboard se exporta a CSV/Excel.
17. El reporte semanal llega los lunes a las 9:00 (hora Argentina) a los destinatarios suscriptos, con las cifras iguales a las del dashboard para ese período.
18. El tracker pesa < 3 KB y no empeora el LCP del showroom en más de 50 ms.

**Usabilidad**

19. Un admin de desarrolladora sin capacitación previa completa en < 10 min: cambiar un precio, aprobar una solicitud de reserva, subir un render a una tipología, agregar una característica nueva y ver las visitas de la semana (prueba con 3 usuarios reales). Un vendedor completa una solicitud de reserva en < 2 min.
20. El panel es usable en tablet (estados, solicitudes, leads y métricas) y en celular (leads, solicitudes y aprobaciones).

# 10. Estimación orientativa

*Estimación aproximada para 2 devs full-stack + diseño part-time, a validar tras el descubrimiento:* el panel completo representa **≈ 9–10 semanas** dentro del MVP: roles y RLS ~1; unidades, tabla e importación ~2; solicitudes, aprobación y notificaciones por email/panel ~1; precios y planes ~1; medios, galerías, contenidos y publicación ~1; leads, usuarios, historial y **Tokko** ~1 (Tokko reemplaza al conector ya previsto: no suma); métricas y reporte ~1–1,5; **autoadministración nueva ~2–2,5** (campos personalizados ~0,5–1; editor visual de zonas para clientes ~1; reemplazo de videos/giros, carga masiva y validaciones ~0,5; onboarding y ayuda ~0,5, sin contar la grabación de videos tutoriales). Hay trabajo en paralelo con el showroom. **MVP total del producto: ≈ 15–17 semanas** (estimado, sin contar la etapa 0 de descubrimiento de 2–3 semanas), igual que en el documento de producto v5. *Alternativa: sumar un tercer dev durante la construcción del panel mantendría el MVP cerca de las 13–15 semanas.*

# 11. Decisiones tomadas y preguntas abiertas

**Decisiones de Tobias (2/10/2026):**

1. Los vendedores/brokers **no** cambian estados directamente: reservar, vender o liberar requieren la aprobación del admin de la desarrolladora (sección 5.6).
2. Notificaciones del MVP: **solo email y aviso en el panel**. WhatsApp, en la etapa 2.
3. Dashboard del MVP: **solo tráfico y leads**. Inversión publicitaria y costo por lead (Meta/Google Ads), en la etapa 2 y opcional por proyecto (sección 6.4).
4. **CRM:** CRM liviano propio en el panel + **Tokko Broker como primera integración, en el MVP** (envío automático de leads) + webhook genérico para otros CRM (secciones 5.10 y 5.13).
5. **Autoadministración total:** el cliente nunca depende de Ad Astra para cambiar datos, medios, zonas, textos o branding (sección 0).

**Preguntas abiertas:**

1. ¿Las **48 h** de vencimiento de las solicitudes sirven como valor por defecto para todos los clientes?
2. ¿Los **brokers externos** entran en el MVP como usuarios "vendedor" o esperan al módulo de brokers de la etapa 2?
3. ¿El **reporte semanal** le llega también a Ad Astra, con un consolidado de todos los clientes?
4. ¿Se acepta el MVP en **15–17 semanas** o se suma un **tercer dev** durante el panel para acercarlo a 13–15?
5. ¿Quién graba los **videos tutoriales** del panel (Ad Astra, que ya produce contenido, o el equipo de desarrollo)?
