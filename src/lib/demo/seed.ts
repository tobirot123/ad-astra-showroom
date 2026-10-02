import { COLUMNS, FLOOR_BANDS, unitPolygon } from "@/lib/demo/geometry";
import { seedId } from "@/lib/domain/ids";
import type {
  AnalyticsEvent,
  Database,
  Lead,
  Unit,
  UnitStatus,
} from "@/lib/domain/types";

export const DEMO_PASSWORD = "AdAstra2026!";

export const DEMO_USERS = [
  { id: seedId(1), email: "superadmin@demo.adastra", nombre: "Sofía Ad Astra", role: "superadmin" as const, telefono: "+54 9 341 555-0101" },
  { id: seedId(2), email: "martin.admin@demo.adastra", nombre: "Martín Ruiz", role: "org_admin" as const, telefono: "+54 9 341 555-0102" },
  { id: seedId(3), email: "laura.ventas@demo.adastra", nombre: "Laura Gómez", role: "seller" as const, telefono: "+54 9 341 555-0103" },
  { id: seedId(4), email: "pedro.lectura@demo.adastra", nombre: "Pedro Soler", role: "viewer" as const, telefono: "+54 9 341 555-0104" },
];

const ORG = seedId(10);
const PROJECT = seedId(20);
const BUILDING = seedId(30);
const TYP_2 = seedId(40);
const TYP_3 = seedId(41);
const LIST_CASH = seedId(50);
const LIST_FIN = seedId(51);
const PLAN = seedId(60);
const FIELD_COCHERA = seedId(70);
const FIELD_APTO = seedId(71);
const FIELD_EXP = seedId(72);

function floorId(n: number): string {
  return seedId(30 + n);
}
function unitId(floor: number, col: number): string {
  return seedId(100 + (floor - 1) * 4 + col);
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed(now = new Date()): Database {
  const iso = now.toISOString();
  const emptyPerm = { can_edit_prices: false, sees_all_leads: false, sees_metrics: false };

  const units: Unit[] = [];
  const unitPrices: Database["unit_prices"] = [];
  const overlays: Database["overlays"] = [];

  for (const band of FLOOR_BANDS) {
    COLUMNS.forEach((col, colIndex) => {
      const id = unitId(band.n, colIndex);
      const codigo = `${band.n}${col.letter}`;
      const typology_id = col.amb === 2 ? TYP_2 : TYP_3;
      let estado: UnitStatus = "disponible";
      let reserved_by: string | null = null;
      let pending: string | null = null;
      if (codigo === "2A") {
        estado = "reservada";
        reserved_by = seedId(3);
      } else if (codigo === "3C") estado = "vendida";
      else if (codigo === "4D") estado = "bloqueada";
      else if (codigo === "5C") estado = "oculta";
      else if (codigo === "1D") pending = seedId(600);
      else if (codigo === "2C") pending = seedId(601);

      const base = col.amb === 2 ? 138_000 : 172_000;
      const precio = base + (band.n - 1) * 4_500 + (col.letter === "A" ? 3_000 : 0);
      const cochera = col.letter === "B" ? "ninguna" : col.letter === "C" ? "doble" : "simple";
      units.push({
        id,
        project_id: PROJECT,
        floor_id: floorId(band.n),
        typology_id,
        codigo,
        tipo: "departamento",
        ambientes: null,
        dormitorios: null,
        banos: null,
        m2_cubiertos: null,
        m2_semicubiertos: null,
        m2_descubiertos: null,
        m2_totales: null,
        orientacion: col.orientacion,
        vista: col.letter === "A" || col.letter === "B" ? "al parque" : "contrafrente",
        estado,
        pending_request_id: pending,
        reserved_by_user_id: reserved_by,
        reserved_lead_id: codigo === "2A" ? seedId(500) : codigo === "3C" ? seedId(501) : null,
        mostrar_precio: true,
        destacada: codigo === "4A" || codigo === "5B",
        notas_internas: codigo === "4D" ? "Retenida por la desarrolladora para showroom." : null,
        custom_values: {
          tipo_cochera: cochera,
          apto_profesional: col.amb === 3 && band.n >= 3,
          expensas: 70_000 + band.n * 6_000,
        },
        overrides: ["orientacion"],
        version: 1,
        updated_at: iso,
        updated_by: seedId(2),
      });
      unitPrices.push({ unit_id: id, price_list_id: LIST_CASH, precio });
      overlays.push({
        id: seedId(200 + (band.n - 1) * 4 + colIndex),
        project_id: PROJECT,
        contenedor: "facade",
        contenedor_id: null,
        forma: "polygon",
        puntos: unitPolygon(band.n, col.letter),
        vinculo_tipo: "unit",
        vinculo_id: id,
        etiqueta: codigo,
        estado: "published",
        orden: (band.n - 1) * 4 + colIndex,
      });
    });
  }

  const leads = buildLeads(now);
  const { requests, requestEvents } = buildRequests(now);
  const events = buildEvents(now, units);

  const db: Database = {
    organizations: [
      {
        id: ORG,
        nombre: "Norte Desarrollos",
        slug: "norte",
        estado: "active",
        plan: "showroom",
        created_at: iso,
      },
    ],
    profiles: DEMO_USERS.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      telefono: u.telefono,
      ultimo_acceso: null,
    })),
    memberships: DEMO_USERS.map((u, i) => ({
      id: seedId(11 + i),
      user_id: u.id,
      organization_id: ORG,
      role: u.role,
      permisos: u.role === "seller" ? { ...emptyPerm, sees_metrics: true } : { ...emptyPerm },
      estado: "active" as const,
    })),
    project_members: [],
    projects: [
      {
        id: PROJECT,
        organization_id: ORG,
        nombre: "ALBA",
        slug: "alba",
        dominio: null,
        estado: "published",
        moneda: "USD",
        descripcion:
          "Torre de 5 pisos frente al parque, con unidades de 2 y 3 ambientes. Datos de demostración para el showroom de Ad Astra.",
        direccion: "Av. del Parque 1450, Rosario",
        fecha_entrega: "2027-12-01",
        contacto: {
          whatsapp: "5493415550100",
          email: "comercial@nortedesarrollos.demo",
          telefono: "+54 341 555-0100",
        },
        settings: {
          request_expiry_hours: 48,
          public_pending_display: "available",
          lead_required_for_request: true,
          escalate_to_superadmin: false,
          approver_user_ids: [],
        },
        updated_at: iso,
      },
    ],
    buildings: [{ id: BUILDING, project_id: PROJECT, nombre: "Torre A", tipo: "torre", orden: 1 }],
    floors: FLOOR_BANDS.map((band) => ({
      id: floorId(band.n),
      building_id: BUILDING,
      project_id: PROJECT,
      nombre: band.n === 1 ? "Piso 1" : `Piso ${band.n}`,
      numero: band.n,
      orden: band.n,
    })),
    typologies: [
      {
        id: TYP_2,
        project_id: PROJECT,
        nombre: "2 ambientes",
        ambientes: 2,
        dormitorios: 1,
        banos: 1,
        m2_cubiertos: 48.2,
        m2_semicubiertos: 4.5,
        m2_descubiertos: 2.4,
        m2_totales: 55.1,
        descripcion: "Living-comedor integrado, cocina separada y balcón corrido.",
        custom_values: {},
        tour_url: null,
      },
      {
        id: TYP_3,
        project_id: PROJECT,
        nombre: "3 ambientes",
        ambientes: 3,
        dormitorios: 2,
        banos: 2,
        m2_cubiertos: 71,
        m2_semicubiertos: 6.2,
        m2_descubiertos: 3.2,
        m2_totales: 80.4,
        descripcion: "Dos dormitorios, suite principal y toilette de recepción.",
        custom_values: {},
        tour_url: null,
      },
    ],
    custom_field_definitions: [
      {
        id: FIELD_COCHERA,
        project_id: PROJECT,
        clave: "tipo_cochera",
        nombre: "Tipo de cochera",
        tipo: "select",
        unidad_medida: null,
        opciones: ["ninguna", "simple", "doble"],
        aplica_a: "unit",
        obligatorio: false,
        publico: true,
        en_ficha: true,
        en_filtro: true,
        orden: 1,
        ayuda: "Simple, doble o sin cochera.",
        archivado: false,
      },
      {
        id: FIELD_APTO,
        project_id: PROJECT,
        clave: "apto_profesional",
        nombre: "Apto profesional",
        tipo: "boolean",
        unidad_medida: null,
        opciones: [],
        aplica_a: "unit",
        obligatorio: false,
        publico: true,
        en_ficha: true,
        en_filtro: true,
        orden: 2,
        ayuda: null,
        archivado: false,
      },
      {
        id: FIELD_EXP,
        project_id: PROJECT,
        clave: "expensas",
        nombre: "Expensas estimadas",
        tipo: "number",
        unidad_medida: "ARS",
        opciones: [],
        aplica_a: "unit",
        obligatorio: false,
        publico: true,
        en_ficha: true,
        en_filtro: false,
        orden: 3,
        ayuda: "Valor orientativo, no incluye servicios extraordinarios.",
        archivado: false,
      },
    ],
    characteristics: [
      { id: seedId(80), project_id: PROJECT, nombre: "Balcón", icono: "balcon", orden: 1, archivado: false },
      { id: seedId(81), project_id: PROJECT, nombre: "Lavadero", icono: "lavadero", orden: 2, archivado: false },
      { id: seedId(82), project_id: PROJECT, nombre: "Parrilla", icono: "parrilla", orden: 3, archivado: false },
      { id: seedId(83), project_id: PROJECT, nombre: "Toilette", icono: "toilette", orden: 4, archivado: false },
      { id: seedId(84), project_id: PROJECT, nombre: "Vestidor", icono: "vestidor", orden: 5, archivado: false },
    ],
    entity_characteristics: [
      { entidad: "typology", entidad_id: TYP_2, characteristic_id: seedId(80) },
      { entidad: "typology", entidad_id: TYP_2, characteristic_id: seedId(81) },
      { entidad: "typology", entidad_id: TYP_3, characteristic_id: seedId(80) },
      { entidad: "typology", entidad_id: TYP_3, characteristic_id: seedId(82) },
      { entidad: "typology", entidad_id: TYP_3, characteristic_id: seedId(83) },
      { entidad: "typology", entidad_id: TYP_3, characteristic_id: seedId(84) },
    ],
    units,
    price_lists: [
      {
        id: LIST_CASH,
        project_id: PROJECT,
        nombre: "Contado",
        moneda: "USD",
        visibilidad: "public",
        vigente_desde: null,
        vigente_hasta: null,
        regla: null,
      },
      {
        id: LIST_FIN,
        project_id: PROJECT,
        nombre: "Financiado",
        moneda: "USD",
        visibilidad: "public",
        vigente_desde: null,
        vigente_hasta: null,
        regla: { base_list_id: LIST_CASH, percent: 12 },
      },
    ],
    unit_prices: unitPrices,
    payment_plans: [
      {
        id: PLAN,
        price_list_id: LIST_FIN,
        nombre: "Financiado 36",
        anticipo_pct: 30,
        anticipo_min: 20_000,
        cuotas: 36,
        periodicidad: "mensual",
        moneda_cuotas: "USD",
        refuerzos: [{ pct: 10, meses: [12] }, { pct: 10, meses: [24] }],
        saldo_posesion_pct: 10,
        indice: "CAC",
        indice_leyenda: "El índice CAC se carga a mano y es orientativo.",
        descuento_pct: 0,
        texto_legal: "Cotización orientativa. No incluye impuestos ni gastos de escrituración.",
      },
    ],
    media: [
      media(400, "fachada.svg", "fachada", "/demo/fachada.svg", "Fachada Torre A"),
      media(401, "plano-2amb.svg", "planos", "/demo/plano-2amb.svg", "Plano 2 ambientes"),
      media(402, "plano-3amb.svg", "planos", "/demo/plano-3amb.svg", "Plano 3 ambientes"),
      media(403, "render-living.svg", "renders", "/demo/render-living.svg", "Living"),
      media(404, "render-cocina.svg", "renders", "/demo/render-cocina.svg", "Cocina"),
    ],
    media_links: [
      { id: seedId(410), media_id: seedId(400), entidad: "project", entidad_id: PROJECT, rol: "fachada", orden: 0 },
      { id: seedId(411), media_id: seedId(401), entidad: "typology", entidad_id: TYP_2, rol: "plano", orden: 0 },
      { id: seedId(412), media_id: seedId(402), entidad: "typology", entidad_id: TYP_3, rol: "plano", orden: 0 },
      { id: seedId(413), media_id: seedId(403), entidad: "typology", entidad_id: TYP_2, rol: "render", orden: 1 },
      { id: seedId(414), media_id: seedId(403), entidad: "typology", entidad_id: TYP_3, rol: "render", orden: 1 },
      { id: seedId(415), media_id: seedId(404), entidad: "typology", entidad_id: TYP_3, rol: "render", orden: 2 },
    ],
    overlays,
    leads,
    lead_activities: [],
    status_change_requests: requests,
    status_change_request_events: requestEvents,
    notifications: [
      notice(801, seedId(2), "Nueva solicitud de reserva", "Laura Gómez pidió reservar la unidad 1D.", seedId(600), hoursAgo(now, 2)),
      notice(802, seedId(2), "Nueva solicitud de venta", "Laura Gómez pidió vender la unidad 2C. Vence en pocas horas.", seedId(601), hoursAgo(now, 45)),
    ],
    change_log: [
      {
        id: seedId(700),
        project_id: PROJECT,
        change_set_id: null,
        user_id: seedId(2),
        requested_by: null,
        request_id: null,
        entidad: "unit",
        entidad_id: unitId(3, 0),
        campo: "orientacion",
        valor_anterior: "NE",
        valor_nuevo: "Norte",
        origen: "edit",
        created_at: hoursAgo(now, 30),
      },
    ],
    change_sets: [],
    events,
    integrations: [
      {
        id: seedId(90),
        project_id: PROJECT,
        tipo: "tokko",
        config: { api_key: "", development_id: "", enabled: false },
        estado: "idle",
        ultimo_envio: null,
        errores_consecutivos: 0,
      },
      {
        id: seedId(91),
        project_id: PROJECT,
        tipo: "webhook",
        config: { url: "", secret: "", enabled: false },
        estado: "idle",
        ultimo_envio: null,
        errores_consecutivos: 0,
      },
    ],
    integration_deliveries: [],
  };

  return db;
}

function media(n: number, file: string, carpeta: string, url: string, nombre: string): Database["media"][number] {
  return {
    id: seedId(n),
    project_id: seedId(20),
    tipo: carpeta === "planos" ? "plano" : "imagen",
    carpeta,
    nombre,
    url,
    variantes: [{ nombre: "original", url, ancho: 800 }],
    peso: 12_000,
    ancho: 800,
    alto: carpeta === "fachada" ? 1100 : 640,
    estado_proceso: "listo",
    aviso: null,
    tags: [carpeta],
    created_at: new Date().toISOString(),
  };
}

function notice(n: number, userId: string, titulo: string, cuerpo: string, requestId: string, created: string): Database["notifications"][number] {
  return {
    id: seedId(n),
    user_id: userId,
    organization_id: seedId(10),
    project_id: seedId(20),
    tipo: "status_request",
    titulo,
    cuerpo,
    entidad: "status_change_request",
    entidad_id: requestId,
    canal: "panel",
    leida: false,
    created_at: created,
  };
}

function hoursAgo(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

function buildLeads(now: Date): Lead[] {
  const rows: Array<{
    hours: number;
    unit: string;
    nombre: string;
    email: string;
    telefono: string;
    fuente: string;
    campaign: string;
    canal: Lead["canal"];
    estado: Lead["estado"];
    assigned_to: string | null;
  }> = [
    { hours: 5, unit: "4A", nombre: "Camila Torres", email: "camila.torres@example.com", telefono: "+54 9 341 555-2001", fuente: "Meta Ads", campaign: "preventa_oct", canal: "form", estado: "nuevo", assigned_to: null },
    { hours: 20, unit: "5B", nombre: "Juan Pérez", email: "juan.perez@example.com", telefono: "+54 9 341 555-2002", fuente: "Google Ads", campaign: "search_marca", canal: "form", estado: "contactado", assigned_to: seedId(3) },
    { hours: 40, unit: "2B", nombre: "Marina Díaz", email: "marina.diaz@example.com", telefono: "+54 9 341 555-2003", fuente: "Meta Ads", campaign: "preventa_oct", canal: "form", estado: "visita", assigned_to: seedId(3) },
    { hours: 70, unit: "1A", nombre: "Carlos Benítez", email: "carlos.benitez@example.com", telefono: "+54 9 341 555-2004", fuente: "Directo", campaign: "", canal: "form", estado: "nuevo", assigned_to: null },
    { hours: 90, unit: "3B", nombre: "Lucía Romero", email: "lucia.romero@example.com", telefono: "+54 9 341 555-2005", fuente: "Orgánico", campaign: "", canal: "form", estado: "contactado", assigned_to: seedId(3) },
    { hours: 120, unit: "4B", nombre: "Diego Funes", email: "diego.funes@example.com", telefono: "+54 9 341 555-2006", fuente: "WhatsApp", campaign: "", canal: "whatsapp", estado: "nuevo", assigned_to: seedId(3) },
  ];
  const extra: Lead[] = [
    {
      id: seedId(500),
      project_id: seedId(20),
      unit_id: unitId(2, 0),
      nombre: "Valentina Ortiz",
      email: "valentina.ortiz@example.com",
      telefono: "+54 9 341 555-2010",
      mensaje: "Señó la 2A la semana pasada.",
      canal: "form",
      estado: "reserva",
      assigned_to: seedId(3),
      utm: { utm_source: "meta", utm_medium: "paid", utm_campaign: "preventa_oct" },
      fuente: "Meta Ads",
      session_id: "seed-session-reserva",
      visitor_id: "seed-visitor-reserva",
      created_at: hoursAgo(now, 200),
      updated_at: hoursAgo(now, 180),
    },
    {
      id: seedId(501),
      project_id: seedId(20),
      unit_id: unitId(3, 2),
      nombre: "Hernán Paz",
      email: "hernan.paz@example.com",
      telefono: "+54 9 341 555-2011",
      mensaje: "Compró la 3C de contado.",
      canal: "form",
      estado: "venta",
      assigned_to: seedId(3),
      utm: { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_marca" },
      fuente: "Google Ads",
      session_id: "seed-session-venta",
      visitor_id: "seed-visitor-venta",
      created_at: hoursAgo(now, 400),
      updated_at: hoursAgo(now, 300),
    },
    {
      id: seedId(502),
      project_id: seedId(20),
      unit_id: unitId(1, 3),
      nombre: "Ana López",
      email: "ana.lopez@example.com",
      telefono: "+54 9 341 555-2001",
      mensaje: "Quiere reservar la 1D. Seña el lunes por transferencia.",
      canal: "form",
      estado: "nuevo",
      assigned_to: seedId(3),
      utm: { utm_source: "meta", utm_medium: "paid", utm_campaign: "preventa_oct" },
      fuente: "Meta Ads",
      session_id: "seed-session-1d",
      visitor_id: "seed-visitor-1d",
      created_at: hoursAgo(now, 3),
      updated_at: hoursAgo(now, 2),
    },
    {
      id: seedId(503),
      project_id: seedId(20),
      unit_id: unitId(2, 2),
      nombre: "Juan Pérez",
      email: "juan.perez@example.com",
      telefono: "+54 9 341 555-2002",
      mensaje: "Oferta de contado por la 2C.",
      canal: "form",
      estado: "contactado",
      assigned_to: seedId(3),
      utm: { utm_source: "google", utm_medium: "cpc", utm_campaign: "search_marca" },
      fuente: "Google Ads",
      session_id: "seed-session-2c",
      visitor_id: "seed-visitor-2c",
      created_at: hoursAgo(now, 46),
      updated_at: hoursAgo(now, 45),
    },
  ];

  const generated: Lead[] = rows.map((row, index) => ({
    id: seedId(510 + index),
    project_id: seedId(20),
    unit_id: findUnit(row.unit),
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    mensaje: `Hola, quiero saber más de la ${row.unit}.`,
    canal: row.canal,
    estado: row.estado,
    assigned_to: row.assigned_to,
    utm: {
      utm_source: row.fuente === "Meta Ads" ? "meta" : row.fuente === "Google Ads" ? "google" : row.fuente === "Orgánico" ? "google" : row.fuente === "WhatsApp" ? "whatsapp" : "",
      utm_medium: row.fuente === "Meta Ads" ? "paid" : row.fuente === "Google Ads" ? "cpc" : row.fuente === "Orgánico" ? "organic" : "",
      utm_campaign: row.campaign || undefined,
    },
    fuente: row.fuente,
    session_id: `seed-lead-${index}`,
    visitor_id: `seed-visitor-lead-${index}`,
    created_at: hoursAgo(now, row.hours),
    updated_at: hoursAgo(now, row.hours),
  }));
  return [...extra, ...generated];
}

function findUnit(codigo: string): string {
  const floor = Number(codigo[0]);
  const letter = codigo[1];
  const col = COLUMNS.findIndex((c) => c.letter === letter);
  return unitId(floor, col);
}

function buildRequests(now: Date): { requests: Database["status_change_requests"]; requestEvents: Database["status_change_request_events"] } {
  const created1 = hoursAgo(now, 2);
  const created2 = hoursAgo(now, 45);
  const requests: Database["status_change_requests"] = [
    {
      id: seedId(600),
      project_id: seedId(20),
      unit_id: unitId(1, 3),
      tipo: "reserve",
      estado_desde: "disponible",
      estado_hacia: "reservada",
      requested_by: seedId(3),
      lead_id: seedId(502),
      price_list_id: seedId(51),
      payment_plan_id: seedId(60),
      monto_sena: 5000,
      moneda_sena: "USD",
      comentario_vendedor: "La clienta confirma la seña el lunes por transferencia.",
      estado: "pending",
      expires_at: new Date(now.getTime() + 46 * 3_600_000).toISOString(),
      extended_count: 0,
      decided_by: null,
      decided_at: null,
      comentario_admin: null,
      unit_version_at_request: 1,
      reverted: false,
      created_at: created1,
      updated_at: created1,
    },
    {
      id: seedId(601),
      project_id: seedId(20),
      unit_id: unitId(2, 2),
      tipo: "sell",
      estado_desde: "disponible",
      estado_hacia: "vendida",
      requested_by: seedId(3),
      lead_id: seedId(503),
      price_list_id: seedId(50),
      payment_plan_id: null,
      monto_sena: null,
      moneda_sena: null,
      comentario_vendedor: "Oferta de contado. Pide boleto esta semana.",
      estado: "pending",
      expires_at: new Date(now.getTime() + 3 * 3_600_000).toISOString(),
      extended_count: 0,
      decided_by: null,
      decided_at: null,
      comentario_admin: null,
      unit_version_at_request: 1,
      reverted: false,
      created_at: created2,
      updated_at: created2,
    },
  ];
  const requestEvents: Database["status_change_request_events"] = requests.map((r) => ({
    id: seedId(r.id === seedId(600) ? 610 : 611),
    request_id: r.id,
    tipo: "created" as const,
    user_id: seedId(3),
    detalle: {},
    created_at: r.created_at,
  }));
  return { requests, requestEvents };
}

function buildEvents(now: Date, units: Unit[]): AnalyticsEvent[] {
  const rand = mulberry32(20261002);
  const visible = units.filter((u) => u.estado !== "oculta");
  const popular = ["4A", "5B", "2B", "3B", "1A", "5A", "4B", "3A"].map(findUnit);
  const buckets = [
    { p: 0.62, fuente: "Meta Ads", utm_source: "meta", utm_medium: "paid", utm_campaign: "preventa_oct", device: "mobile" as const },
    { p: 0.14, fuente: "Google Ads", utm_source: "google", utm_medium: "cpc", utm_campaign: "search_marca", device: "desktop" as const },
    { p: 0.11, fuente: "Directo", utm_source: null, utm_medium: null, utm_campaign: null, device: "mobile" as const },
    { p: 0.08, fuente: "Orgánico", utm_source: "google", utm_medium: "organic", utm_campaign: null, device: "mobile" as const },
    { p: 0.05, fuente: "WhatsApp", utm_source: "whatsapp", utm_medium: "referral", utm_campaign: null, device: "mobile" as const },
  ];
  const events: AnalyticsEvent[] = [];
  let n = 0;
  for (let s = 0; s < 96; s++) {
    const roll = rand();
    let acc = 0;
    let bucket = buckets[0];
    for (const b of buckets) {
      acc += b.p;
      if (roll <= acc) {
        bucket = b;
        break;
      }
    }
    const hours = rand() * 24 * 21;
    const ts = new Date(now.getTime() - hours * 3_600_000).toISOString();
    const session = `seed-s-${s}`;
    const visitor = `seed-v-${Math.floor(rand() * 70)}`;
    const device = rand() > 0.8 ? "desktop" : bucket.device;
    const push = (nombre: string, unit_id: string | null, extraTs = ts) => {
      events.push({
        id: seedId(2000 + n),
        project_id: seedId(20),
        visitor_id: visitor,
        session_id: session,
        nombre,
        props: {},
        unit_id,
        device,
        utm_source: bucket.utm_source,
        utm_medium: bucket.utm_medium,
        utm_campaign: bucket.utm_campaign,
        referrer_tipo: bucket.fuente,
        fuente: bucket.fuente,
        ts: extraTs,
      });
      n += 1;
    };
    push("session_start", null);
    push("page_view", null);
    if (rand() > 0.28) {
      const unit = rand() > 0.45 ? popular[Math.floor(rand() * popular.length)] : visible[Math.floor(rand() * visible.length)].id;
      push("unit_view", unit, new Date(new Date(ts).getTime() + 40_000).toISOString());
      if (rand() > 0.82) {
        push("whatsapp_click", unit, new Date(new Date(ts).getTime() + 80_000).toISOString());
      }
    }
  }
  return events;
}
