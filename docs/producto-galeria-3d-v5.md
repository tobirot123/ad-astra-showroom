---
title: "Galería de Ventas 3D propia — Documento de producto v5"
subtitle: "Ad Astra · Borrador para discusión"
date: "2 de octubre de 2026"
---

> **Cambios vs. v4 (decisiones de Tobias, 2/10/2026):** (1) **CRM:** CRM liviano propio en el panel + **Tokko Broker como primera integración, dentro del MVP** (envío automático de leads) + webhook genérico. (2) **Principio de autoadministración total:** el cliente nunca depende de Ad Astra para cambiar datos, medios, zonas clickeables, textos o branding. Se suman al MVP los campos personalizados, el editor visual de zonas para clientes, el reemplazo de videos/giros y el onboarding guiado. Detalle en `panel-admin-spec-v4`. El panel pasa a ≈ 9–10 semanas y el **MVP a ≈ 15–17 semanas** (estimado).
>
> **Cambios vs. v3 (decisiones de Tobias, 2/10/2026):** los vendedores/brokers solicitan cambios de estado y el admin de la desarrolladora los aprueba; las notificaciones del MVP son **solo por email y en el panel** (WhatsApp, etapa 2); el dashboard del MVP muestra **solo tráfico y leads** (inversión y costo por lead, etapa 2, opcional por proyecto). La estimación del panel se alinea con `panel-admin-spec-v3` (≈ 7–8 semanas) y el **MVP queda en ≈ 13–15 semanas**.
>
> **Cambios vs. v2:** Tobias confirmó que su mayor dolor es depender de Web3D hasta para cambiar los m² de una unidad. El **panel de administración** pasa a ser el **módulo #1 del MVP**, con especificación propia en `panel-admin-spec-v1` (hoy `panel-admin-spec-v3`) (roles, pantallas, publicación, métricas, modelo de datos y criterios de aceptación). El **dashboard de métricas** para la desarrolladora entra al MVP (antes estaba en etapa 2).
>
> **Cambios vs. v1:** se confirma que Ad Astra contrata hoy **Web3D**; el benchmark ahora se centra en los tres competidores que marcó Tobias (Web3D, Winbuild, Urbania), con análisis del visor, la tecnología, la carga medida y los precios públicos. Se suman las secciones **"Qué tomar de cada competidor"** y **"Cómo resolvemos los dolores de Web3D"**, y se reajusta el MVP (más peso al panel autoadministrable, a la performance medible y a las integraciones locales como Tokko y Meta Lead Ads).

# Resumen / visión del producto

**Qué es:** una galería de ventas 3D web, propiedad de Ad Astra, para que una desarrolladora muestre y *venda* su proyecto online. El comprador recorre el edificio o masterplan con navegación "estilo videojuego", elige una unidad, ve planos, tours 360, precio y disponibilidad real, simula su plan de pago y deja sus datos. Todo desde un link, sin descargas.

**Por qué ahora:** Ad Astra hoy **contrata Web3D** (Graff3D) y lo revende como su galería. Los dos dolores son: **(1) es lento** y **(2) el proveedor no entrega los cambios y mejoras que Ad Astra necesita**. Mientras tanto, dos startups argentinas (Winbuild y Urbania) crecen rápido con producto propio, panel autoadministrable, CRM e IA. Tener producto propio le da a Ad Astra control del roadmap, de la performance y del margen, y lo puede integrar con las campañas de Meta/Google que ya maneja (+US$100K/mes en pauta según su sitio).

**Posicionamiento propuesto:** *"la galería más rápida del mercado, conectada a tu pauta"*: igualar lo básico de Winbuild y Urbania y diferenciarse en **velocidad medible**, **cotizador argentino serio** (USD/ARS, CAC, refuerzos) y **atribución de punta a punta** (de la campaña a la unidad cotizada y a la reserva).

# Contexto: Ad Astra hoy

- adastrait.com presenta la galería con seis pilares: navegación estilo videojuego, tours 360° (Layama y Matterport), información completa (planos, características, precios, disponibilidad), carga en 3–5 s sin descargas, formularios de leads y cotizador con múltiples listas de precios, entrega y financiación. Ese texto es prácticamente el mismo que el de web3d.app.
- Galerías linkeadas desde el sitio: DUO (Proaco), Evora (LB Company), Solara (Deltamorphosis) y Remeros Beach. Las cuatro comparten el mismo código y llevan la marca "Sitio creado con Web3D".
- **Dato de mercado:** Proaco, la desarrolladora de DUO (cliente de Ad Astra en Web3D), aparece como cliente de **Urbania** para su proyecto Pocito, que además es la demo pública de Urbania. Los competidores ya están entrando en la cartera de Ad Astra.

# Benchmark principal: Web3D, Winbuild y Urbania

## Resumen comparativo

| | **Web3D (Graff3D)** | **Winbuild** | **Urbania (Urbania3D)** |
|---|---|---|---|
| **País** | Panamá (contactos +507) | Argentina (Buenos Aires); opera en Perú, Uruguay y Paraguay | Argentina (Rosario); sitio en 6 idiomas y páginas por país (LatAm, España, Italia, Francia) |
| **Escala declarada** | +150 proyectos, +15 países | ~110 clientes, ~500 proyectos cargados, capacidad ~70 showrooms/mes (prensa, ago-2026) | +100 clientes (sitio); 10 personas + ~30 freelancers (prensa) |
| **Modelo** | Licencia por proyecto; programa de *resellers* para agencias | Setup **US$3.000–5.000** + abono desde **US$200–300/mes**, según vendedores y módulos (iProfesional, 17/08/2026) | Presupuesto a medida (sin precios públicos); incluye producción de renders |
| **Tiempo de implementación** | No publicado | "5 días hábiles" desde que reciben planos (prensa; usan IA en la producción) | ~8 semanas con contenido completo (prensa); un cliente cita 20 días |
| **Cómo funciona el visor** | Pre-renderizado: vuelos en video entre puntos de vista + giro orbital (versión Full) o solo imágenes (Lite). Plantas con unidades clickeables | Video cinematográfico del edificio + imágenes de planta con unidades interactivas; tours 360 en **Kuula**; mapa con Mapbox | Pre-renderizado: video intro, vuelo aéreo (el nombre de archivo indica que es un video generado con IA, Adobe Firefly), hotspots por torre, navegación piso por piso con máscaras SVG sobre imágenes, zoom propio; tours 360 en **Kuula**; modo día/atardecer/noche |
| **Tecnología detectada** (código público) | SPA en Vue, multi-tenant por dominio, config por proyecto en JSON; videos bajados completos por XHR | SPA en React (Vite) sobre **Supabase** (Postgres, REST y storage); Mapbox GL + Google Places; jsPDF | SPA en React (Vite, TanStack Query, i18n), API propia, assets en CDN propio, dominios custom con *worker* en Cloudflare, Sentry, MapLibre, react-pdf |
| **¿Motor 3D en tiempo real / Pixel Streaming?** | No se detectó | No se detectó (ni Three.js, Babylon, Unreal ni Pixel Streaming) | No se detectó |
| **CRM e integraciones** | API propia; CRM/ERP a pedido; GA, Tag Manager, Píxel | CRM propio; **Tokko** y **Kommo**; WhatsApp Cloud API (alta embebida); **Meta Lead Ads** y gestión de anuncios; webhooks | CRM simple en el panel con la unidad consultada; fuentes Meta Lead Ads, Google Ads, WhatsApp, reserva; webhooks; campañas de email |
| **Diferenciales** | Reserva online con pago con tarjeta (3DS); cotizador por formas de pago; multi-idioma/moneda | "Ecosistema comercial": CRM + chatbot IA + landing pages autoadministrables + módulo brokers con reservas + avance de obra; se vende aunque no haya showroom | 27 funcionalidades: chatbot IA, editor de brochure estilo Canva, generador de piezas para redes, links por broker, mapas de calor, terminaciones alternativas, vistas reales por altura con drone, Urbania CAM (time-lapse de obra), sello "Inversor Prevenido", pedidos de mejoras desde el panel |
| **Links** | [web3d.app](https://www.web3d.app/) · [características](https://www.web3d.app/caracteristicas-tecnicas) | [winbuild.app](https://winbuild.app/) · [demo Torre Tale](https://metaverse.winbuild.app/Tale/torre-tale) · [iProfesional](https://www.iprofesional.com/negocios/462045-como-funciona-la-plataforma-pensada-para-vender-mas-departamentos-en-pozo) · [Mercado](https://wp.mercado.com.ar/ruta-digital/winbuild-sumo-100-desarrolladoras-en-un-ano-con-tecnologia-para-proyectos-de-pozo/) | [urbania3d.app](https://urbania3d.app/) · [demo Pocito](https://pocito.urbania3d.app/) · [El Ciudadano](https://elciudadanoweb.com/urbania-la-startup-rosarina-que-revoluciona-la-venta-de-desarrollos-inmobiliarios/) |

**Conclusión técnica:** ninguno de los tres usa 3D en tiempo real. Los tres resuelven la "navegación videojuego" con **video e imágenes pre-renderizadas + capas interactivas (SVG/polígonos)**. La batalla no es de motor 3D: se gana con **producción rápida de contenido, panel autoadministrable, CRM/integraciones y performance**.

## Medición de carga (2/10/2026)

*Metodología: Chrome headless (Playwright), sin caché, una corrida por sitio desde el servidor de trabajo. Celular emulado (390×844) con red **4G simulada de 9 Mbps de bajada y 60 ms de latencia**; también escritorio sin limitación. Son mediciones **indicativas** de una sola corrida, no un benchmark formal.*

| Métrica (celular, 4G simulado) | **Web3D – DUO** (galería de Ad Astra) | **Winbuild – Torre Tale** | **Urbania – Pocito** |
|---|---|---|---|
| LCP (mayor elemento visible) | ~3,2 s | ~3,7 s | ~4,6 s |
| Portada nítida visible | borrosa a los ~4 s, nítida a los ~6–8 s | video del edificio a los ~5 s | ~5–6 s |
| Peso hasta que la portada se estabiliza | 6,6 MB / 58 requests | ~28 MB en 25 s (video intro de ~17 MB por *streaming* + una imagen de planta de 6,7 MB en JPG) | ~21 MB en 21 s (video intro de 14,5 MB) |
| Al entrar al recorrido | descarga **cada video de transición completo** (5,2 / 5,1 / 4,1 MB) antes de poder usarlo: **~9–12 s por video** en esta red, en serie; +14 MB en 20 s | sigue el video cinematográfico; ~9 MB extra en 20 s | vista aérea con torres clickeables nítida a los ~5 s; precarga agresiva (+33 MB en 20 s) |
| Otros hallazgos | En celular vertical pide "Girá tu dispositivo"; carga 4 scripts de Google (2 GA4 + Universal Analytics, ya discontinuado) | JS principal de ~2 MB comprimido; imágenes servidas sin optimizar desde Supabase storage | Imágenes en AVIF; *service worker*; arquitectura pensada para dominios propios |
| Escritorio sin limitación (LCP) | ~1,5 s (red en reposo a los 2,8 s) | ~1,7 s | ~4,4 s |

**Lectura:** en la **primera impresión** los tres están en el mismo rango (3–6 s en 4G). Web3D se vuelve lento **en la navegación**: sus transiciones son videos de ~5 MB que se descargan enteros antes de reproducirse, así que en un celular con 4G real cada "vuelo" puede tardar 10 s o más en estar listo, y en vertical obliga a girar el teléfono. Winbuild y Urbania pesan **más** en total, pero usan *streaming* o arrancan rápido la primera vista. **Hay espacio claro para ser el más rápido**: ninguno optimiza bien el peso de los medios. *(A confirmar con Tobias dónde percibe más la lentitud: carga inicial, transiciones, celular o el panel.)*

# Qué tomar de cada competidor

**De Web3D (lo que ya vendemos y no podemos perder):**

- Cotizador con **múltiples listas de precios por forma de pago** y PDF de cotización con detalle de cuotas.
- Estructura del recorrido: portada → vuelo al edificio → giro orbital → piso → unidad. Los compradores ya la entienden.
- Filtros por disponibilidad, etapa, precio, ambientes y m²; plano 2D/3D; ubicación en planta; QR; envío por email.
- Mapa con **puntos de interés** y distancias; sección de **avance de obra**.
- **Reserva online con pago** (para más adelante) y **permisos de vendedor** para cambiar estados y precios.
- Versión **Lite (solo imágenes)** como opción barata y rápida de implementar.

**De Winbuild (el "ecosistema comercial"):**

- **CRM especializado** con integración nativa a **WhatsApp Cloud API** y **Meta** (incluida la bajada automática de **Meta Lead Ads**).
- Conectores con **Tokko Broker** y **Kommo**, que son estándar en Argentina.
- **Módulo brokers/inmobiliarias:** la desarrolladora comparte el showroom con inmobiliarias, que ven disponibilidad actualizada y pueden pedir reservas ("la base de la verdad la maneja el desarrollador").
- **Landing pages autoadministrables** por proyecto y la posibilidad de cargar unidades **sin showroom** (edificios terminados, proyectos viejos).
- **Modelo comercial:** setup + abono mensual que escala por vendedores y módulos. Es una buena referencia de precio (US$3–5K + US$200–300/mes).
- **Velocidad de producción** (5 días hábiles con IA): la meta operativa debería ser parecida.

**De Urbania (producto y panel):**

- **Navegación piso por piso** mostrando cuántas unidades libres quedan en cada piso antes de entrar; **zoom propio** con máscaras SVG que no se desalinean.
- **Calculadora de financiación** configurable desde el panel (anticipo, cuotas, refuerzos) y **grilla de precios** editable con impacto instantáneo.
- **Links ilimitados por broker** con métricas separadas; **mapas de calor** y unidades más vistas.
- **Generador de brochure** con plantillas y **fichas PDF por unidad con QR automático**.
- **Modo día/atardecer/noche**, **terminaciones alternativas** y **vistas reales por altura** con drone (Ad Astra ya produce renders: es un *upsell* natural).
- **Chatbot IA** entrenado con los datos del proyecto que deriva al vendedor cuando hay intención de compra.
- **Dominios propios por cliente** y showroom en varios idiomas.
- **"Pedí una mejora" desde el panel:** convierte el roadmap en un canal con el cliente. Es justo lo que Ad Astra no consigue de Web3D.

# Cómo resolvemos los dolores de Web3D

## 1. Velocidad de carga

**Metas medibles (presupuesto de performance por proyecto):**

| Métrica | Meta | Web3D hoy (DUO, 4G simulado) |
|---|---|---|
| LCP en celular de gama media, 4G | **< 2,5 s** | ~3,2 s (portada nítida ~6–8 s) |
| Peso antes de la primera interacción | **< 3 MB** | 6,6 MB |
| Primera transición lista tras "Entrar" | **< 1,5 s** | ~9–12 s (video de 5 MB descargado entero) |
| Uso en celular vertical | **sin forzar rotación** | pide girar el dispositivo |

**Cómo:**

- **Transiciones por streaming, no por descarga completa:** videos cortos en MP4 con *faststart* o HLS, versión 720p para celular y 1080p para escritorio (objetivo 1–2 MB por transición), con **primer frame como póster** para que la respuesta sea inmediata.
- **Precarga inteligente:** solo las transiciones adyacentes al punto de vista actual y en segundo plano, nunca todo el proyecto.
- **Giro orbital como secuencia de imágenes** AVIF/WebP: primero una pasada en baja resolución y después la nítida.
- **Encuadres verticales** (renders o recortes para 9:16) para que el celular funcione sin girar. La mayoría del tráfico de pauta llega desde el celular.
- **Imágenes responsivas** (AVIF/WebP en varios tamaños, nunca un JPG de 6 MB) y **CDN con caché en el borde** (Cloudflare).
- **Un solo tag manager** y scripts de terceros diferidos.
- **Control continuo:** Lighthouse CI y métricas reales de usuarios (Web Vitals) por proyecto; si un proyecto se pasa del presupuesto, se ve en el panel antes de publicarlo.

## 2. Autonomía para hacer cambios

**Principio de autoadministración (decisión de Tobias):** todo lo que se ve en el showroom lo cambia el cliente solo, desde el panel. Si una desarrolladora tiene que pedirle a Ad Astra un cambio de datos o contenido, es un defecto del producto. Ad Astra solo interviene para **producir contenido 3D nuevo** (renders, vuelos, giros, panorámicas), para el **alta comercial** de clientes y proyectos y para la **evolución del producto** (ver `panel-admin-spec-v4`, sección 0).

- **Panel admin propio:** proyectos, torres y pisos, unidades (importación desde Excel), estados, listas de precios, calculadoras de financiación, secciones de contenido, carga de medios con transcodificación automática, branding, dominios, usuarios y roles, links de brokers. Además: **campos personalizados** y catálogo de características definidos por el cliente, **editor visual de zonas clickeables**, galerías, carga masiva de medios con optimización automática y **onboarding guiado**. La desarrolladora cambia todo sin depender de nadie y los cambios se ven al instante.
- **Roadmap bajo control de Ad Astra:** código propio, repositorio propio y despliegues semanales; *feature flags* por proyecto para probar mejoras con un cliente antes de liberarlas a todos.
- **Plantillas reutilizables:** un proyecto nuevo arranca duplicando uno anterior (estructura, estilos, reglas de precios), con la meta de bajar el tiempo de implementación a días.
- **Vista previa antes de publicar** e historial de cambios (quién cambió qué precio y cuándo).
- **Canal de pedidos** desde el panel (como Urbania), priorizado por Ad Astra.
- **Sin *lock-in*:** datos de leads y unidades exportables y API propia.

# 1. Módulos y funciones

| # | Módulo | Funciones principales | Prioridad |
|---|---|---|---|
| 1 | **Visor del proyecto (exterior)** | Portada, vuelo al edificio, giro orbital, selección de torre/piso, hotspots de amenities; soporta edificio, multi-torre y loteo/masterplan; modo vertical para celular. Día/noche como extra. | MVP (día/noche: etapa 2) |
| 2 | **Navegación por piso y selector de unidades** | Piso por piso con "quedan X libres", plantas con unidades coloreadas por estado (disponible/reservada/vendida/bloqueada), zoom, buscador con filtros (ambientes, m², precio, orientación, piso, etapa) y vista lista. Comparador y favoritos. | MVP (comparador/favoritos: etapa 2) |
| 3 | **Ficha de unidad** | Plano 2D con medidas, planta 3D amoblada, renders, vistas por altura, superficies, orientación, tour 360, precio o "consultar", WhatsApp con mensaje prellenado, **ficha PDF con QR**. | MVP |
| 4 | **Tours 360** | Embed de Kuula/Matterport/Layama/3DVista; visor propio para panorámicas de Ad Astra (con analítica). | MVP (embed) / etapa 2 (propio) |
| 5 | **Cotizador / calculadora de financiación** | Múltiples listas de precios por forma de pago, anticipo, cuotas, refuerzos, saldo a posesión, descuentos, USD/ARS y **ajuste CAC**; cronograma y PDF; configurable desde el panel. | MVP (núcleo) / etapa 2 (CAC automático) |
| 6 | **Leads y CRM** | Formularios por unidad con UTM y fuente; **CRM liviano propio** en el panel (leads, estado, vendedor asignado, notas, vínculo con la reserva/venta); **Tokko Broker** como primera integración (envío automático de leads al emprendimiento); **webhook genérico** para otros CRM; más adelante Kommo/HubSpot, **Meta Lead Ads** entrante, **Conversions API** saliente y WhatsApp Cloud API. | **MVP** (form + CRM liviano + **Tokko** + webhook) / etapa 2 (resto) |
| 7 | **Panel de administración (módulo #1, 100% autoservicio)** | Campos personalizados y características definidos por el cliente; editor visual de zonas clickeables; carga de medios por arrastrar y soltar con optimización; onboarding guiado; roles (superadmin Ad Astra, admin desarrolladora, vendedor/broker, solo lectura); **solicitudes de cambio de estado de vendedores con aprobación del admin** (vencen a las 48 h, configurable); unidades con tabla editable, edición masiva e importación/exportación Excel, precios y planes, medios, contenidos, leads, usuarios, historial con deshacer, publicación en vivo/borrador. **Detalle en `panel-admin-spec-v4`.** | **MVP – prioridad 1** |
| 8 | **Brokers / inmobiliarias** | Link por broker con métricas propias; acceso a disponibilidad; pedido de reserva. | Etapa 2 |
| 9 | **Métricas para la desarrolladora** | Medición propia + GA4/Píxel; dashboard en el panel: visitas, usuarios únicos, origen/UTM/campaña, dispositivo, unidades más vistas, embudo visita→ficha→cotización→lead, leads por fuente, exportación y reporte semanal por mail. Mapas de calor más adelante. | **MVP** (mapas de calor: etapa 2) |
| 10 | **Contenido comercial** | Brochure con plantillas, generador de piezas verticales para redes, avance de obra (fotos/video/360). | Etapa 2 (avance de obra: MVP simple) |
| 11 | **Asistente IA** | Chatbot con los datos del proyecto (disponibilidad, medidas, financiación) que deriva al vendedor/WhatsApp. | Etapa 2 |
| 12 | **Reserva online** | Reserva con seña (Mercado Pago), bloqueo temporal, términos. | Etapa 3 |
| 13 | **Multi-cliente / white-label** | Un código, muchos proyectos, dominios propios, datos aislados; más adelante, autoservicio para otras agencias. | MVP (arquitectura) / etapa 3 (autoservicio) |
| 14 | **Performance y hosting** | Presupuesto de performance, CDN, medios adaptativos, monitoreo de Web Vitals. | MVP |

# 2. Tecnología recomendada

**Criterio:** stack chico y conocido para 1–3 devs. La "navegación videojuego" se resuelve con **contenido pre-renderizado optimizado**, como hacen los tres competidores. El 3D en tiempo real queda como diferencial opcional más adelante.

| Parte | Recomendación | Por qué | Alternativas |
|---|---|---|---|
| **Visor exterior** | Video e imágenes pre-renderizadas + capas **SVG** clickeables en React; transiciones con MP4 *faststart*/HLS y secuencias AVIF/WebP. | Fotorrealismo con los renders de Ad Astra, carga controlable y funciona en cualquier celular. Es el estándar del mercado local. | — |
| **3D en tiempo real (etapa 3, opcional)** | **Three.js + React Three Fiber**; evaluar **Gaussian Splatting** (Spark, gsplat.js o PlayCanvas) para entornos con drone. | Sería un diferencial frente a los tres competidores, siempre con el modo pre-renderizado como respaldo. | Babylon.js; PlayCanvas. |
| **Unreal Pixel Streaming** | Descartado para web. | GPU en la nube por usuario simultáneo, costo por hora, colas con picos de pauta; no cumple < 3 s. | Unreal/Unity solo para un kiosco de showroom. |
| **Pipeline de medios** | Renders de Blender/3ds Max/Corona → **transcodificación automática** al subir (ffmpeg en un worker o **Cloudflare Stream**) con versiones 720p/1080p, póster e imágenes AVIF/WebP multi-tamaño; glTF + Draco/KTX2 si se usa 3D. | El cuello de botella real es el peso de los medios; automatizarlo evita errores humanos (el JPG de 6,7 MB de Winbuild es el ejemplo). | Mux para video; imgproxy/Cloudflare Images. |
| **Tours 360** | Embed de **Kuula** (lo usan Winbuild y Urbania), Matterport o Layama; visor propio con **Photo Sphere Viewer** o **Marzipano**. | Embed sin costo de integración; visor propio para marca y analítica. | Pannellum. |
| **Frontend** | **Next.js (React + TypeScript)**, Tailwind, next-intl. | SSR/SSG para la portada y previews de redes; mismo ecosistema que Winbuild/Urbania (React), gran pool de devs. | Vite + React SPA (más simple, sin SSR). |
| **Backend y datos** | **Supabase** (Postgres, Auth, Storage, RLS por cliente) + lógica en rutas de Next.js; NestJS si crece. | Winbuild corre sobre Supabase con ~500 proyectos: el enfoque escala para este caso. Ojo: servir medios desde CDN propio, no desde el storage directo. | Neon/RDS + Prisma. |
| **Cotizador** | Motor de reglas en el backend (TypeScript con tests); índice CAC mensual cargado o importado. | Reglas sensibles, no expuestas en el cliente; tests con casos reales. | JSON Rules Engine. |
| **CRM / integraciones** | CRM liviano propio en Postgres + webhooks + conectores (**Tokko**, Kommo, HubSpot); **WhatsApp Cloud API** y **Meta Graph API** (Lead Ads + Conversions API); email con Resend. | Mismo set que ofrece Winbuild, más la atribución que domina Ad Astra. | n8n/Make como puente en el MVP. |
| **Hosting / CDN** | **Vercel** para la app + **Cloudflare** (R2 + CDN, *Cloudflare for SaaS* para dominios de clientes). | Simple, global, sin costo de egreso en medios; Urbania usa un enfoque similar con Cloudflare. | Todo en Cloudflare (Pages/Workers). |
| **Analytics y monitoreo** | GA4/GTM + Píxel por cliente; eventos propios en Postgres o **PostHog** (embudos y mapas de calor); **Sentry**; Lighthouse CI. | Métricas de negocio para la desarrolladora y control de performance. | Plausible/Umami. |
| **IA (etapa 2)** | Chatbot con API de LLM (OpenAI/Anthropic/Gemini) usando los datos del proyecto como contexto; derivación a WhatsApp. | Paridad con Winbuild y Urbania con poco desarrollo. | — |

# 3. Plan por etapas

*Duraciones **estimadas** para 2 devs full-stack + 1 diseñador UX/UI part-time, con renders a cargo del equipo de Ad Astra. Se validan tras el descubrimiento.*

## Etapa 0 — Descubrimiento y diseño (≈ 2–3 semanas, estimado)

- Relevar con Tobias qué falla de Web3D (lista de cambios pedidos y no entregados) y dónde se nota la lentitud.
- Modelo de datos (proyecto → torre/etapa → piso → unidad → listas de precios → reglas) y 3–5 casos reales de cotización.
- UX/UI mobile first (incluido el modo vertical) y presupuesto de performance.
- Elegir un **proyecto piloto** nuevo (sin migración).

## Etapa 1 — MVP (≈ 15–17 semanas, estimado)

**Objetivo:** un proyecto real publicado, **100% autoadministrable por la desarrolladora** (prioridad 1, según Tobias), con **métricas visibles** y **más rápido que Web3D**. El panel se especifica en detalle en `panel-admin-spec-v4.md/.docx` y representa ≈ 9–10 semanas (estimado) del MVP, en paralelo con el showroom. *Alternativa: con un tercer dev durante el panel, el MVP se acercaría a 13–15 semanas.*

**Incluye:**

- Visor exterior pre-renderizado optimizado (portada, vuelo, giro, torres) con modo vertical.
- Navegación piso por piso con unidades libres por piso, plantas con estados, buscador y vista lista.
- Ficha de unidad completa con tour 360 por embed y ficha PDF con QR.
- Cotizador con listas de precios, anticipo, cuotas, refuerzos, saldo y moneda (CAC como valor manual con leyenda); PDF.
- Leads con UTM → **CRM liviano propio** en el panel + notificación por email y en el panel al vendedor + **envío automático a Tokko Broker** + webhook genérico.
- GA4/GTM/Píxel con eventos propios.
- **Panel admin (módulo #1, ver `panel-admin-spec-v4`), 100% autoservicio:** campos personalizados y catálogo de características; editor visual de zonas clickeables (fachadas, plantas, masterplan) con copia a pisos tipo; reemplazo de videos de transición y giros existentes; galerías y carga masiva con optimización automática; onboarding guiado y ayuda en el panel; 4 roles con permisos finos y multi-proyecto; solicitudes de reservar/vender/liberar de vendedores con cola de aprobación del admin y notificaciones por **email y panel**; unidades con tabla editable, edición masiva, pegado desde Excel e importación/exportación CSV/Excel; listas de precios y planes de pago con simulador; medios con optimización automática; contenidos y branding; leads; usuarios; historial con deshacer; cambios comerciales en vivo (≤ 10 s) y contenido con borrador + vista previa.
- **Dashboard de métricas** en el panel, **solo tráfico y leads** (visitas, únicos, UTM/campaña, dispositivo, unidades más vistas, embudo, leads por fuente), exportable, con **reporte semanal por mail**.
- Avance de obra simple (galería por fecha).
- Arquitectura multi-cliente y dominios propios.

**Queda afuera:** editor de recorrido autoservicio (crear puntos de vista y transiciones nuevas: lo configura Ad Astra al entregar videos nuevos), crear proyectos desde plantilla y conectar dominio con asistente, conectores Kommo/HubSpot, 3D en tiempo real, reserva con pago, chatbot IA, módulo brokers, mapas de calor, notificaciones por WhatsApp, inversión publicitaria y costo por lead en el dashboard, brochure editable, día/noche, multi-idioma (salvo que el piloto lo pida).

*Cambio vs. v1: suman al MVP el CRM liviano, el modo vertical, la transcodificación automática y el avance de obra, porque Winbuild y Urbania los dan por descontados. Cambio vs. v2: el panel completo y el dashboard de métricas pasan a ser prioridad 1, así que el MVP pasa a 12–14 semanas estimadas. Cambio vs. v3: el flujo de aprobación de estados suma ≈ 1 semana al panel (7–8), así que el MVP queda en 13–15 semanas estimadas; WhatsApp y costo por lead quedan fuera. Cambio vs. v4: la autoadministración total suma ≈ 2–2,5 semanas al panel (9–10) y Tokko reemplaza al conector ya previsto sin sumar tiempo, así que el MVP queda en **15–17 semanas** estimadas.*

**Criterios de éxito:** **0 pedidos de cambios de datos o contenido a Ad Astra** después del primer mes del piloto; los criterios de aceptación de `panel-admin-spec-v4` (ej. un cambio de m² visible en ≤ 10 s sin intervención de Ad Astra); cumplir las metas de performance; la desarrolladora ve sus visitas y recibe el reporte semanal; leads con fuente de campaña; 0 errores en los casos de prueba del cotizador.

## Etapa 2 — Paridad competitiva y migración desde Web3D (≈ 8–10 semanas, estimado)

- Migrar los proyectos activos de Web3D según los vencimientos del contrato (a confirmar).
- Módulo **brokers** (links por inmobiliaria con métricas y pedido de reserva).
- **Chatbot IA** del proyecto con derivación a WhatsApp.
- **Autoservicio avanzado:** editor de recorrido exterior (crear puntos de vista y transiciones), crear proyectos duplicando uno existente y conectar dominio propio con asistente de DNS.
- Integraciones: Meta Lead Ads, Conversions API, WhatsApp Cloud API (incluidas las **notificaciones por WhatsApp** del panel: solicitudes, aprobaciones, leads), Kommo/HubSpot.
- **Mapas de calor** e **inversión publicitaria y costo por lead** en el dashboard, con conexión a Meta Ads y Google Ads, **opcional por proyecto**.
- CAC automático, comparador y favoritos, brochure con plantillas, visor 360 propio, día/noche, multi-idioma y multi-moneda.

## Etapa 3 — Diferenciación y SaaS (≈ 8–12 semanas, estimado, por partes)

- **Modo 3D/splats** opcional como diferencial frente a los tres competidores.
- **Reserva online** con seña vía Mercado Pago.
- Generador de piezas para redes, terminaciones alternativas y kiosco de showroom.
- **Autoservicio white-label** para otras agencias o estudios (planes y facturación) y sincronización bidireccional con CRM/ERP.

# Otros referentes internacionales (secundarios)

| Producto | Por qué mirarlo | Link |
|---|---|---|
| **3D Twin (3D Estate, Polonia)** | Generación automatizada de tours y plantas 3D a partir de planos; sincronización bidireccional con CRM; dicen tener 400+ desarrolladoras. | [3dtwin.com](https://3dtwin.com/3d-real-estate/) |
| **Vinode** | Dice que su página carga en ~2 s; CRM integrado; brochure por unidad; kiosco offline. | [vinode.io](https://vinode.io/real-estate-visualization) |

# Preguntas abiertas / decisiones pendientes

1. **Contrato con Web3D:** costo por proyecto, vencimientos, propiedad del contenido (videos, renders, datos de leads) y si hay cláusulas que limiten un producto propio. Define el ritmo de la migración.
2. **Lentitud:** ¿dónde la perciben Tobias y sus clientes (portada, transiciones, celular, panel)? ¿Hay quejas concretas de desarrolladoras?
3. **Cambios no entregados:** lista priorizada de lo que se le pidió a Web3D y no se hizo. Es el *backlog* inicial ideal.
4. **Producción de contenido:** ¿Ad Astra puede producir renders de transiciones y giros en días (como Winbuild con IA) o hace falta revisar el pipeline? ¿Se usan videos generados con IA como Urbania?
5. **Equipo:** interno, freelancers o software factory; ¿quién es el responsable de producto?
6. **Cotizador:** 3–5 esquemas reales (anticipo, cuotas, refuerzos, CAC, USD/ARS). ¿La cotización es orientativa o vinculante?
7. **Precio y modelo:** ¿incluido en el fee de marketing o licencia aparte? Referencia de mercado: Winbuild cobra setup US$3–5K + desde US$200–300/mes.
8. **Clientes en riesgo:** Proaco ya trabaja con Urbania en Pocito; ¿hay otros clientes evaluando a la competencia?
9. **Datos personales:** cumplimiento de la Ley 25.326 para leads y para el chatbot IA.
10. **Panel (detalle en `panel-admin-spec-v4`, sección 11):** vencimiento por defecto de las solicitudes (48 h), si los brokers externos entran en el MVP como vendedores, si Ad Astra recibe un reporte semanal consolidado, si se acepta el MVP en 15–17 semanas o se suma un tercer dev, y quién graba los videos tutoriales.

*Resueltas el 2/10/2026: aprobación de estados por el admin; notificaciones del MVP por email y panel (WhatsApp en etapa 2); dashboard del MVP solo con tráfico y leads (inversión y costo por lead en etapa 2, opcional por proyecto); CRM liviano propio + Tokko Broker en el MVP + webhook genérico; principio de autoadministración total.*
