---
title: "Inventario de funciones de la competencia"
subtitle: "Web3D · Winbuild · Urbania — comparado con nuestras specs (panel v4, producto v5) y propuesta de hitos"
date: "2 de octubre de 2026"
---

# Cómo leer este inventario

**Objetivo (pedido de Tobias):** que nuestro producto incluya **toda** la funcionalidad de web3d.app, winbuild.app y urbania3d.app. Este documento lista cada función **verificada**, sin duplicados, con su cobertura en nuestras specs y el hito propuesto para construirla.

**Fuentes revisadas (2/10/2026):**

- **Web3D (W3D):** [web3d.app](https://www.web3d.app/), [características técnicas](https://www.web3d.app/caracteristicas-tecnicas), [Visual Web de Graff3D](https://graff3d.com/es/visual-web-es/) y la galería **DUO** de Ad Astra ([duo.grupoproaco.com](https://duo.grupoproaco.com/)), incluidos los textos de su interfaz.
- **Winbuild (WB):** [winbuild.app](https://winbuild.app/), demo [Torre Tale](https://metaverse.winbuild.app/Tale/torre-tale) (incluidos los textos y menús de su código público) y prensa ([iProfesional](https://www.iprofesional.com/negocios/462045-como-funciona-la-plataforma-pensada-para-vender-mas-departamentos-en-pozo), [Mercado](https://wp.mercado.com.ar/ruta-digital/winbuild-sumo-100-desarrolladoras-en-un-ano-con-tecnologia-para-proyectos-de-pozo/)).
- **Urbania (URB):** [urbania3d.app](https://urbania3d.app/) (27 funcionalidades y preguntas frecuentes), demo [Pocito](https://pocito.urbania3d.app/) (incluidas las pantallas y textos de su código público) y prensa ([El Ciudadano](https://elciudadanoweb.com/urbania-la-startup-rosarina-que-revoluciona-la-venta-de-desarrollos-inmobiliarios/)).

**Leyenda:**

- **✔** = declarado en el sitio, la documentación o la prensa del competidor.
- **◐** = observado en su demo o en el código público de su demo (existe en el producto, aunque no lo publiciten).
- **Specs:** `M1` = ya incluido en el hito 1 en desarrollo · `MVP` = en el MVP de nuestras specs, fuera de M1 · `E2`/`E3` = etapas 2/3 de nuestras specs · `Parcial` = cubierto en parte · **`No`** = no está en nuestras specs (**función nueva**).
- **Hito:** M1 (en curso) a M7, ver la sección final. *Las duraciones de los hitos son estimaciones orientativas.*

**Qué no se incluyó:** afirmaciones operativas que no son funciones (ej. "implementación en 5 días", "+100 clientes") y elementos de menús internos del código de Winbuild cuyo significado no se pudo verificar ("Funding", "Terrenos", "Pozofy", "Inversores", "Novedades", "Uso y salud"). Los servicios humanos (renders, informe de riesgo) se listan aparte, marcados como servicio.

# 1. Recorrido y visualización del proyecto

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 1 | Portada con imagen o video | Pantalla inicial con logo, imagen o video y botón "Entrar" | ✔ | ◐ | ◐ | MVP | M2 |
| 2 | Vuelo de introducción al edificio | Video de acercamiento desde el entorno hasta el proyecto | ✔ | ◐ | ✔ | MVP | M2 |
| 3 | Giro 360 orbital con entorno | Rotar alrededor del edificio entre vistas pre-renderizadas | ✔ | ✔ | ◐ | MVP | M2 |
| 4 | Transiciones en video entre puntos de vista | Vuelos entre vistas exteriores y hacia el top de plantas | ✔ | ◐ | ✔ | MVP | M2 |
| 5 | Versión "Lite" solo con imágenes | Exterior armado solo con imágenes, sin videos, para implementar rápido | ✔ | | | Parcial | M2 |
| 6 | Vista aérea del proyecto en su entorno | Vista elevada del proyecto y las cuadras vecinas | ◐ | | ✔ | MVP | M2 |
| 7 | Selección de torre en multi-torre y complejos | Elegir edificio dentro de un conjunto de torres | ✔ | ◐ | ✔ | MVP | M2 |
| 8 | Masterplan y loteos | Navegación por áreas/manzanas hasta el lote o la casa | ✔ | | ✔ | MVP | M2 |
| 9 | Soporte de múltiples tipologías de proyecto | Torres, barrios de casas, loteos, condominios, usos mixtos, hoteles, oficinas, comercios | ✔ | | ✔ | MVP | M2 |
| 10 | Navegación piso por piso | Subir por el edificio y ver la planta de cada piso con sus unidades | ✔ | ✔ | ✔ | MVP | M2 |
| 11 | Unidades libres por piso | Cada piso muestra cuántas unidades quedan disponibles antes de entrar | | | ✔ | MVP | M2 |
| 12 | Zoom propio y minimapa de planta | Zoom sobre plantas con zonas alineadas y minimapa de ubicación | | | ◐ | Parcial | M2 |
| 13 | Pantalla completa | Botón para ver el showroom en pantalla completa | ◐ | | ◐ | No | M2 |
| 14 | Imagen de vista barrial | Imagen del barrio o entorno cercano configurable | | ◐ | | Parcial | M2 |
| 15 | Diseño adaptable a todos los dispositivos | Escritorio, celular vertical y horizontal, tablets | ✔ | ✔ | ✔ | MVP | M2 |
| 16 | Soporte de alto tráfico de campañas | Capacidad para picos de visitas desde pauta | ✔ | | | MVP | M2 |
| 17 | Página "próximamente" | Aviso de sitio en construcción ("Vuelve pronto") antes del lanzamiento | ◐ | | | No | M2 |
| 18 | Modo día / atardecer / noche | Alternar la iluminación exterior del proyecto | | | ✔ | E2 | M6 |
| 19 | Ambiente sonoro / música | Música de fondo con reproducir/pausar | ◐ | | | No | M6 |
| 20 | Realidad virtual y aumentada | Modo VR/AR integrado al showroom | ✔ | | | No | M6 |
| 21 | Pantallas táctiles y Smart TV | Uso en pantallas táctiles de showroom y televisores | ✔ | | | Parcial (kiosco E3) | M6 |
| 22 | Aviso y modo sin conexión | Mensaje de "sin internet" y acceso limitado offline | ◐ | | | Parcial (kiosco E3) | M6 |
| 23 | Calidad 4K | Imágenes y videos en 3840×2160 además de Full HD | ✔ | | | No | M6 |

# 2. Unidades y ficha de unidad

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 24 | Estados de venta | Disponible, reservada, vendida (con color en plantas) | ✔ | ✔ | ✔ | M1 | M1 |
| 25 | Estado "en pausa" | Unidad retirada temporalmente de la venta | ◐ | | | Parcial (bloqueada/oculta) | M2 |
| 26 | Características de la unidad | m², dormitorios, baños, toilettes y otros ítems | ✔ | ◐ | ✔ | M1 | M1 |
| 27 | Superficie común / campos extra | Datos adicionales como superficie común | | ◐ | | M1 (campos personalizados) | M1 |
| 28 | Plano 2D con medidas | Plano acotado de la unidad | ✔ | ✔ | ✔ | M1 | M1 |
| 29 | Planta 3D amoblada | Planta amoblada en 3D integrada al contexto | ✔ | ✔ | ✔ | M1 | M1 |
| 30 | Precio publicado u "consultar precio" | Mostrar u ocultar el precio por unidad o proyecto | ✔ | ◐ | ◐ | M1 | M1 |
| 31 | Galería de imágenes de la unidad | Renders de la unidad | ✔ | ✔ | ✔ | MVP | M2 |
| 32 | Vistas reales por altura | Vista desde cada balcón o altura (relevamiento con drone o renders) | ✔ | ✔ | ✔ | MVP | M2 |
| 33 | Galería de acabados | Galería de materiales y terminaciones de la unidad | ✔ | | | Parcial (galerías) | M2 |
| 34 | Video de la unidad | Video propio por unidad | ✔ | | | Parcial (medios) | M2 |
| 35 | Tour 360 de la unidad y amenities | Recorrido virtual inmersivo | ✔ | ✔ | ✔ | MVP | M2 |
| 36 | Tours de múltiples proveedores | Matterport, Layama, 3DVista, Pano2VR, Luma Labs, Kuula | ✔ | ◐ | ◐ | MVP | M2 |
| 37 | Ubicación de la unidad en planta / en el área | Mini plano que marca dónde está la unidad | ◐ | | | MVP | M2 |
| 38 | Buscador de unidades con filtros | Por disponibilidad, etapa, precio, ambientes/recámaras, área, orientación, piso | ✔ | ✔ | ✔ | MVP | M2 |
| 39 | Ordenar resultados | Orden por piso, precio, superficie | | | ◐ | Parcial | M2 |
| 40 | Comparador de unidades | Comparar varias unidades lado a lado | | ✔ | ◐ | E2 | M2 |
| 41 | Ficha / PDF por unidad con QR | Descargar o compartir la ficha de la unidad con QR automático | ✔ | ◐ | ✔ | MVP | M3 |
| 42 | Imprimir y enviar ficha por email | Imprimir la ficha o enviarla por correo | ◐ | | | Parcial | M3 |
| 43 | Configurar qué muestra la ficha | Activar precio/pago, WhatsApp, compartir, PDF, ambientes; orden de las vistas | | ◐ | | Parcial | M3 |
| 44 | Tipo de operación venta o alquiler | Unidades en alquiler con precio de alquiler | ✔ | | | No | M6 |

# 3. Proyecto, contenidos e información

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 45 | Amenities con planta, galería, video y tour | Sección dedicada a cada área social | ✔ | ✔ | ✔ | MVP | M2 |
| 46 | Galería general del proyecto | Galerías de imágenes ordenables | ✔ | ◐ | ✔ | MVP | M2 |
| 47 | Video del proyecto | Video principal (Vimeo/YouTube) | ✔ | ◐ | ✔ | Parcial | M2 |
| 48 | Mapa de ubicación | Mapa interactivo y vista satelital | ✔ | ◐ | ✔ | MVP | M2 |
| 49 | Puntos de interés con distancias | Colegios, clubes, accesos, con distancia calculada | ✔ | | ✔ | MVP | M2 |
| 50 | Cómo llegar (rutas y modo de viaje) | Ruta al proyecto con modo de viaje | ◐ | | | No | M2 |
| 51 | Información del proyecto | Estudio, fecha de entrega, descripción, amenities | ◐ | ✔ | ✔ | MVP | M2 |
| 52 | Información de la desarrolladora | Sección "quiénes somos" de la promotora | ✔ | | ✔ | MVP | M2 |
| 53 | Brochure general del proyecto | Ver o descargar el brochure PDF | ✔ | ✔ | ✔ | Parcial | M3 |
| 54 | Avance de obra | Fotos, videos y 360 por fecha, en línea de tiempo | ✔ | ✔ | ✔ | MVP (simple) | M3 |
| 55 | Secciones personalizadas | Secciones nuevas armadas por el cliente | | | ◐ | MVP | M3 |
| 56 | Pasos de la financiación | Explicar el proceso (reservar, firmar, escriturar) | | | ◐ | No | M3 |
| 57 | Disclaimer y textos legales | Aviso legal de precios e imágenes | ◐ | | ◐ | MVP | M3 |
| 58 | Aviso de cookies y privacidad | Banner de cookies y política de privacidad | ◐ | | ◐ | MVP | M3 |
| 59 | Multi-idioma | Showroom en varios idiomas (ES, EN, FR, VI, PT, IT, DE…) | ✔ | | ✔ | E2 | M4 |
| 60 | Multi-moneda | Precios y superficies en la moneda/unidad de cada país | ✔ | | ✔ | E2 | M4 |
| 61 | Cámara de obra en vivo / time-lapse | Cámara sobre la obra con imagen en vivo o time-lapse | ✔ | | ✔ | No | M5 |
| 62 | Reseñas y calificaciones de compradores | Opiniones con puntaje de quienes compraron | ✔ | ◐ | | No | M5 |
| 63 | Trayectoria de la desarrolladora | Proyectos anteriores e indicadores destacados | | | ✔ | No | M5 |

# 4. Comercialización y cotizador

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 64 | Grilla de precios editable al instante | Cambiar precios y verlos en vivo en el showroom | ✔ | ✔ | ✔ | M1 | M1 |
| 65 | Consulta de precio | Formulario específico para pedir el precio | ✔ | ◐ | ◐ | M1 | M1 |
| 66 | Listas de precios por forma de pago | Varias listas (contado, financiado…) | ✔ | | | MVP | M3 |
| 67 | Cotizador / calculadora de financiación | Anticipo/enganche, cuotas, refuerzos, saldo a entrega | ✔ | | ✔ | MVP | M3 |
| 68 | Selección del esquema de pago | El comprador elige el plan (incluye pagos diferidos) | ◐ | | ◐ | MVP | M3 |
| 69 | Detalle de cuotas | Cantidad, valor, primera y última cuota | ◐ | | | MVP | M3 |
| 70 | Cotización en PDF, impresión y envío por email | Documento de la cotización descargable o enviado al comprador | ◐ | | | Parcial (PDF) | M3 |
| 71 | Vendedor asociado a la cotización | Email del vendedor que acompaña la cotización | ◐ | | | No | M3 |
| 72 | Reservas de vendedores e inmobiliarias | Pedidos de reserva desde el equipo comercial | | ✔ | | M1 (solicitudes con aprobación) | M1 |
| 73 | Reserva online con pago | Pago de la reserva con tarjeta (3DS) y datos de facturación; pasarela externa; registro de medios (efectivo, transferencia, Mercado Pago, USDT) | ✔ | | ◐ | E3 | M6 |

# 5. Contacto, leads y CRM

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 74 | Formularios de consulta | General, por unidad y desde la página de ubicación | ✔ | ✔ | ✔ | M1 | M1 |
| 75 | Lead con la unidad consultada | Cada consulta llega con la unidad que el usuario miraba | | ✔ | ✔ | M1 | M1 |
| 76 | CRM especializado | Prospectos, estados, seguimiento y mensajes | | ✔ | ✔ | M1 | M1 |
| 77 | Botón de WhatsApp | Contacto por WhatsApp con mensaje prellenado | ✔ | ✔ | ✔ | MVP | M2 |
| 78 | Teléfono, email y redes sociales | Llamada, email y links a Facebook, Instagram, LinkedIn y TikTok | ✔ | | ✔ | Parcial | M2 |
| 79 | Compartir | Copiar link, Facebook, Instagram, WhatsApp, QR | ✔ | ◐ | ✔ | Parcial (Open Graph) | M2 |
| 80 | Agendar cita | Calendario para videollamada o visita al showroom | ✔ | | | No | M4 |

# 6. Panel de administración y operación

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 81 | Administración de estados de unidades | Cambiar disponible/reservado/vendido desde el panel | ✔ | ✔ | ✔ | M1 | M1 |
| 82 | Usuarios vendedores con permisos | Permisos para modificar estados y precios | ✔ | ✔ | ◐ | M1 | M1 |
| 83 | Gestión de proyectos, pisos, tipologías y tipos de unidad | Estructura del proyecto desde el panel | | ◐ | ◐ | M1 | M1 |
| 84 | Importación de unidades desde Excel | Carga masiva de unidades | | ◐ | ◐ | M1 | M1 |
| 85 | Gestión de medios y galerías con orden | Imágenes y videos con título, descripción y orden | | ◐ | ✔ | M1 | M1 |
| 86 | Gestión de videos del recorrido y puntos de vista | Video de intro, vitrinas/posiciones con imagen de fondo, video de terraza | | ◐ | ◐ | MVP | M2 |
| 87 | Historial y auditoría por unidad | Registro de cambios de estado y auditoría de cada unidad | | | ◐ | MVP | M3 |
| 88 | Branding y diseño | Logo, colores, tipografías, favicon, título, CSS/plantilla a medida | ✔ | | ✔ | MVP | M3 |
| 89 | Dominio propio con SSL | Showroom en el dominio del proyecto | ✔ | | ◐ | MVP (Ad Astra) / E2 (autoservicio) | M3 |
| 90 | Pedir mejoras desde el panel | El cliente solicita funciones nuevas | | | ✔ | MVP | M3 |
| 91 | Tutoriales en el panel | Guías y videos dentro del panel | | ◐ | ◐ | MVP | M3 |
| 92 | Modo presentación | Modo para presentar el proyecto a un cliente | | ◐ | | No | M4 |
| 93 | Login de vendedores en el showroom | Vendedor identificado para cotizar o reservar en nombre del cliente | ◐ | | | Parcial | M4 |
| 94 | Unidades sin showroom | Cargar unidades de edificios terminados o proyectos viejos sin showroom 3D | | ✔ | | No | M4 |
| 95 | Importar / duplicar un proyecto | Crear un proyecto a partir de otro | | | ◐ | E2 | M6 |
| 96 | Login con passkeys | Acceso al panel sin contraseña (passkeys) | | | ◐ | No | M4 |

# 7. Brokers e inmobiliarias

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 97 | Módulo de inmobiliarias/brokers | Acceso de inmobiliarias a disponibilidad y precios actualizados | | ✔ | ✔ | E2 | M4 |
| 98 | Links por broker con métricas separadas | Un enlace por inmobiliaria; prospectos y métricas no se mezclan | | | ✔ | E2 | M4 |
| 99 | Branding por inmobiliaria | Showroom con la marca de cada inmobiliaria | | | ◐ | No | M4 |

# 8. Integraciones

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 100 | Google Analytics, Tag Manager y Píxel de Meta | Medición y píxeles por proyecto | ✔ | ◐ | ◐ | MVP | M3 |
| 101 | Remarketing | Audiencias de quienes navegaron el showroom | ✔ | | | Parcial (píxel) | M3 |
| 102 | Webhooks | Envío de leads a sistemas externos | | ◐ | ◐ | MVP | M3 |
| 103 | Tokko Broker | Envío de leads (y vínculo con propiedades) a Tokko | | ◐ | | MVP | M3 |
| 104 | Kommo | Integración con el CRM Kommo | | ◐ | | E2 | M4 |
| 105 | Formularios de Meta Lead Ads | Leads de formularios de Facebook/Instagram al CRM | | ✔ | ◐ | E2 | M4 |
| 106 | WhatsApp Business (Cloud API) | Vinculación de la cuenta y plantillas de mensajes | | ✔ | | E2 | M4 |
| 107 | API de integración (lectura/escritura) | API propia para software de terceros | ✔ | ✔ | | Parcial | M4 |
| 108 | Integración con CRM/ERP de la desarrolladora | Disponibilidad y precios desde el sistema del cliente; consultas hacia él | ✔ | | ✔ | E2–E3 | M7 |

# 9. Marketing, contenido e IA

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 109 | Chatbot de IA del proyecto | Responde disponibilidad, medidas y financiación y deriva al vendedor | | ✔ | ✔ | E2 | M5 |
| 110 | Bot de WhatsApp | Asistente automático por WhatsApp | | ◐ | | Parcial (chatbot E2) | M5 |
| 111 | Landing pages autoadministrables | Landings por proyecto editables por el cliente | | ✔ | | No | M5 |
| 112 | Campañas de email | Listas, contactos y campañas de email desde el panel | | | ◐ | No | M5 |
| 113 | Generador de brochure | Editor estilo Canva con plantillas y link propio | | | ✔ | E2 | M5 |
| 114 | Generador de piezas para redes / video marketing | Piezas verticales y videos del proyecto desde el panel | | ◐ | ✔ | E3 | M5 |
| 115 | Cambio de terminaciones | Ver la misma unidad en estilos de materiales alternativos | | | ✔ | E3 | M6 |

# 10. Métricas

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 116 | Métricas básicas del showroom | Visitas y consultas en el panel | ✔ | ✔ | ✔ | M1 | M1 |
| 117 | Unidades más visitadas y tiempo en pantalla | Ranking de unidades y tiempo de permanencia | | | ✔ | Parcial (más vistas MVP; tiempo No) | M3 |
| 118 | Mapas de calor | Zonas de la pantalla con más interacción | | | ✔ | E2 | M5 |
| 119 | Audiencia por país y actividad por hora | Globo/mapa de países y mapa de calor por hora | | | ◐ | No | M5 |

# 11. Servicios (no son software)

| # | Función | Descripción | W3D | WB | URB | Specs | Hito |
|---|---|---|:-:|:-:|:-:|---|---|
| 120 | Producción de renders, planos 3D, animaciones y contenido con IA | Equipo de contenido que produce las imágenes y videos | | ✔ | ✔ | Servicio de Ad Astra (fuera del software) | — |
| 121 | Informe de riesgo "Inversor Prevenido" | Informe sobre el proyecto y la desarrolladora con puntaje y sello en el showroom | | | ✔ | No | M7 (opcional) |

# Resumen de conteos

- **Total de funciones verificadas:** 121 (119 de software + 2 servicios).
- **Ya en M1:** 18 · **En el MVP de las specs (fuera de M1):** 43 · **En etapas 2–3 de las specs:** 17 · **Cubiertas en parte:** 21 · **Servicio de Ad Astra:** 1.
- **Funciones nuevas (no están en nuestras specs):** **21**.

**Las 21 funciones nuevas:** pantalla completa (13), página "próximamente" (17), música ambiente (19), VR/AR (20), calidad 4K (23), venta o alquiler (44), cómo llegar/rutas (50), pasos de la financiación (56), cámara de obra en vivo (61), reseñas de compradores (62), trayectoria de la desarrolladora (63), vendedor asociado a la cotización (71), agendar cita (80), modo presentación (92), unidades sin showroom (94), login con passkeys (96), branding por inmobiliaria (99), landing pages (111), campañas de email (112), audiencia por país y por hora (119) e informe de riesgo (121, servicio opcional).

*Nota: el conteo de "nuevas" no incluye las 21 parciales. Varias de esas (ej. minimapa, ordenar, galería de acabados, remarketing, API) requieren trabajo nuevo aunque la base ya esté prevista.*

# Hitos propuestos

**M1 — Base del producto (en desarrollo):** estructura, unidades con campos personalizados e importación CSV, carga de medios, editor de polígonos, CRM de leads, cola de aprobación, fachada del showroom + ficha de unidad + formulario de lead, métricas básicas. *(Cubre las funciones marcadas M1: 24, 26–30, 64, 65, 72, 74–76, 81–85, 116.)*

| Hito | Nombre | Contenido (funciones #) | Tamaño orientativo |
|---|---|---|---|
| **M2** | **Showroom completo** | Portada, vuelo de intro, giro orbital, transiciones, versión Lite, vista aérea, multi-torre, masterplan/loteos, tipologías de proyecto, piso por piso con unidades libres, zoom y minimapa, pantalla completa, vista barrial, adaptable a todo dispositivo, alto tráfico, página próximamente (1–17); estado "en pausa", galerías de unidad, vistas por altura, acabados, video y tour 360 de la unidad, tours multi-proveedor, ubicación en planta, buscador, ordenar, comparador (25, 31–40); amenities, galería general, video del proyecto, mapa, puntos de interés, cómo llegar, info del proyecto y de la desarrolladora (45–52); WhatsApp, contacto y redes, compartir (77–79); gestión de videos/puntos de vista (86) | ≈ 6 semanas |
| **M3** | **Cotizador, documentos y cierre del MVP** | Listas de precios, calculadora de financiación, esquemas de pago, detalle de cuotas, cotización PDF/email/impresión, vendedor asociado (66–71); ficha PDF con QR, imprimir/enviar, configuración de la ficha (41–43); brochure, avance de obra, secciones personalizadas, pasos de financiación, legales, cookies (53–58); historial por unidad, branding, dominio, pedir mejoras, tutoriales (87–91); GA4/GTM/Píxel, remarketing, webhooks, Tokko (100–103); unidades más vistas y tiempo en pantalla (117) | ≈ 4–5 semanas |
| **M4** | **Canales comerciales e integraciones** | Multi-idioma y multi-moneda (59–60); agendar cita (80); modo presentación, login de vendedores, unidades sin showroom, passkeys (92–94, 96); módulo de inmobiliarias, links por broker, branding por inmobiliaria (97–99); Kommo, Meta Lead Ads, WhatsApp Cloud API, API pública (104–107) | ≈ 5–6 semanas |
| **M5** | **Marketing, IA y analítica avanzada** | Cámara de obra en vivo/time-lapse, reseñas, trayectoria (61–63); chatbot IA, bot de WhatsApp, landing pages, campañas de email, generador de brochure, piezas para redes/video (109–114); mapas de calor, audiencia por país y por hora (118–119) | ≈ 6–7 semanas |
| **M6** | **Experiencia inmersiva y cierre online** | Día/atardecer/noche, música, VR/AR, pantallas táctiles/TV, modo offline, 4K (18–23); venta o alquiler (44); reserva online con pago (73); importar/duplicar proyecto (95); cambio de terminaciones (115) | ≈ 5–6 semanas |
| **M7** | **Opcionales y enterprise** | Sincronización bidireccional con CRM/ERP de la desarrolladora (108); informe de riesgo tipo "Inversor Prevenido" como servicio opcional (121) | A definir según el cliente |

**Relación con las specs:** M1 + M2 + M3 = el MVP de `producto-galeria-3d-v5` / `panel-admin-spec-v4` (más algunas funciones nuevas chicas: pantalla completa, próximamente, rutas, pasos de financiación, vendedor en la cotización). M4–M5 ≈ etapa 2 y M6–M7 ≈ etapa 3. **Adelantos propuestos respecto de las specs:** el comparador pasa de la etapa 2 a M2 (lo tienen Winbuild y Urbania y es barato); el dominio propio se configura en M3 (Ad Astra) y el autoservicio de dominios queda con la duplicación de proyectos en M6.

# Notas y riesgos

- **Funciones vistas solo en el código (◐):** existen en el producto del competidor, pero no siempre están activas en todos los proyectos. Antes de copiarlas conviene validar con Tobias cuáles usan realmente sus clientes.
- **Dependencias de terceros:** VR/AR, cámara en vivo (hardware de obra), Meta Lead Ads y WhatsApp Cloud API (verificación de negocio en Meta) y pasarelas de pago (Mercado Pago/Stripe) tienen requisitos externos que pueden alargar los plazos.
- **Contenido:** funciones como vistas por altura, terminaciones alternativas, día/noche y 4K dependen de que Ad Astra produzca el contenido. El software solo las muestra.
