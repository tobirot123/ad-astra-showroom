import type { FacadeMask } from "@/lib/domain/facade-mask";

export type { FacadeMask } from "@/lib/domain/facade-mask";

export type Role = "superadmin" | "org_admin" | "seller" | "viewer";

export type UnitStatus =
  | "disponible"
  | "reservada"
  | "vendida"
  | "bloqueada"
  | "pausa"
  | "oculta";

export type RequestTipo = "reserve" | "sell" | "release";

export type RequestEstado =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "resolved_by_direct_change";

export type LeadEstado =
  | "nuevo"
  | "contactado"
  | "visita"
  | "reserva"
  | "venta"
  | "perdido";

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "date"
  | "url";

export interface Permisos {
  can_edit_prices: boolean;
  sees_all_leads: boolean;
  sees_metrics: boolean;
}

export interface Actor {
  id: string;
  nombre: string;
  email: string;
  role: Role;
  organization_id: string;
  /** null = todos los proyectos de la organización */
  project_ids: string[] | null;
  permisos: Permisos;
}

export interface Organization {
  id: string;
  nombre: string;
  slug: string;
  estado: "active" | "suspended";
  plan: string;
  descripcion?: string;
  logo_url?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  ultimo_acceso: string | null;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: Role;
  permisos: Permisos;
  estado: "active" | "invited" | "suspended";
}

export interface ProjectMember {
  membership_id: string;
  project_id: string;
}

export interface ProjectSettings {
  request_expiry_hours: number;
  public_pending_display: "available" | "ask";
  lead_required_for_request: boolean;
  escalate_to_superadmin: boolean;
  approver_user_ids: string[];
  /** Sin videos: solo las imágenes de cada escena. */
  showroom_lite?: boolean;
  usd_ars?: number;
  /** Factor orientativo del índice CAC sobre la última cuota. */
  cac_factor?: number;
  texto_legal?: string;
  aviso_cookies?: string;
  pasos?: string[];
  brochure_url?: string;
  logo_url?: string;
  color_acento?: string;
  titulo_publico?: string;
  ga4_id?: string;
  gtm_id?: string;
  pixel_id?: string;
  remarketing?: boolean;
  ficha?: {
    precio?: boolean;
    whatsapp?: boolean;
    compartir?: boolean;
    pdf?: boolean;
    ambientes?: boolean;
  };
  /** Clips de cada parada del spin. El video de la portada es el intro. */
  recorrido?: {
    paradas: { orden: number; transicion_url: string; reversa_url: string; vuelo_url: string }[];
  };
  /** Foto de vista por orientación. Una cadena vacía oculta el default. */
  vistas_orientacion?: Record<string, string>;
  /**
   * Máscara del estudio por parada. Si hay una imagen, el showroom la usa
   * en lugar de los polígonos de esa escena.
   */
  mascaras?: FacadeMask[];
}

export interface ProjectContact {
  whatsapp: string;
  email: string;
  telefono: string;
}

export interface Project {
  id: string;
  organization_id: string;
  nombre: string;
  slug: string;
  dominio: string | null;
  estado: "draft" | "published" | "coming_soon";
  /** Moneda base. Otras monedas viven en `monedas` (M4). */
  moneda: string;
  descripcion: string;
  direccion: string;
  fecha_entrega: string | null;
  contacto: ProjectContact;
  settings: ProjectSettings;
  locale?: string;
  idiomas?: string[];
  monedas?: string[];
  lat?: number | null;
  lng?: number | null;
  redes?: Record<string, string>;
  updated_at: string;
}

export interface Building {
  id: string;
  project_id: string;
  nombre: string;
  tipo: "torre" | "etapa" | "manzana" | "loteo" | "casa" | "condominio" | "barrio";
  /** Torre o manzana dentro de un conjunto. */
  parent_id?: string | null;
  orden: number;
}

export interface Floor {
  id: string;
  building_id: string;
  project_id: string;
  nombre: string;
  numero: number;
  orden: number;
}

export interface Typology {
  id: string;
  project_id: string;
  nombre: string;
  ambientes: number;
  dormitorios: number;
  banos: number;
  m2_cubiertos: number;
  m2_semicubiertos: number;
  m2_descubiertos: number;
  m2_totales: number;
  descripcion: string;
  custom_values: Record<string, unknown>;
  tour_url: string | null;
}

export interface CustomField {
  id: string;
  project_id: string;
  clave: string;
  nombre: string;
  tipo: FieldType;
  unidad_medida: string | null;
  opciones: string[];
  aplica_a: "unit" | "typology";
  obligatorio: boolean;
  publico: boolean;
  en_ficha: boolean;
  en_filtro: boolean;
  orden: number;
  ayuda: string | null;
  archivado: boolean;
}

export interface Characteristic {
  id: string;
  project_id: string;
  nombre: string;
  icono: string;
  orden: number;
  archivado: boolean;
}

export interface EntityCharacteristic {
  entidad: "typology" | "unit";
  entidad_id: string;
  characteristic_id: string;
}

export interface Unit {
  id: string;
  project_id: string;
  floor_id: string | null;
  /** Lote o unidad sin piso: cuelga directo del edificio o la manzana. */
  building_id?: string | null;
  typology_id: string | null;
  codigo: string;
  tipo: "departamento" | "casa" | "lote" | "local" | "oficina" | "cochera" | "baulera" | "amenity";
  ambientes: number | null;
  dormitorios: number | null;
  banos: number | null;
  m2_cubiertos: number | null;
  m2_semicubiertos: number | null;
  m2_descubiertos: number | null;
  m2_totales: number | null;
  orientacion: string | null;
  vista: string | null;
  tour_url?: string | null;
  operacion?: "venta" | "alquiler";
  estado: UnitStatus;
  pending_request_id: string | null;
  reserved_by_user_id: string | null;
  reserved_lead_id: string | null;
  mostrar_precio: boolean;
  destacada: boolean;
  notas_internas: string | null;
  custom_values: Record<string, unknown>;
  /** Campos que la unidad pisó respecto de la tipología. */
  overrides: string[];
  version: number;
  updated_at: string;
  updated_by: string | null;
}

export interface PriceList {
  id: string;
  project_id: string;
  nombre: string;
  moneda: string;
  visibilidad: "public" | "sellers" | "internal";
  vigente_desde: string | null;
  vigente_hasta: string | null;
  regla: { base_list_id: string; percent: number } | null;
}

export interface UnitPrice {
  unit_id: string;
  price_list_id: string;
  precio: number;
}

export interface PaymentPlan {
  id: string;
  price_list_id: string;
  nombre: string;
  anticipo_pct: number;
  anticipo_min: number;
  cuotas: number;
  periodicidad: "mensual" | "trimestral";
  moneda_cuotas: "USD" | "ARS";
  refuerzos: { pct: number; meses: number[] }[];
  saldo_posesion_pct: number;
  indice: "ninguno" | "CAC";
  indice_leyenda: string | null;
  descuento_pct: number;
  texto_legal: string;
}

export interface MediaAsset {
  id: string;
  project_id: string;
  tipo: "imagen" | "video" | "plano" | "tour_url";
  carpeta: string;
  nombre: string;
  url: string;
  variantes: { nombre: string; url: string; ancho: number }[];
  peso: number;
  ancho: number | null;
  alto: number | null;
  estado_proceso: "listo" | "original" | "error";
  aviso: string | null;
  tags: string[];
  titulo?: string | null;
  descripcion?: string;
  created_at: string;
}

export interface MediaLink {
  id: string;
  media_id: string;
  entidad: "typology" | "unit" | "project" | "floor" | "building" | "amenity";
  entidad_id: string;
  rol: "render" | "plano" | "portada" | "fachada" | "video" | "galeria" | "acabado" | "tour" | "brochure" | "vista";
  orden: number;
  titulo?: string | null;
  descripcion?: string;
  gallery_id?: string | null;
}

export interface Gallery {
  id: string;
  project_id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  entidad: "project" | "building" | "floor" | "unit" | "typology" | "amenity";
  entidad_id: string | null;
  orden: number;
}

export interface Tour {
  id: string;
  project_id: string;
  entidad: "project" | "unit" | "typology" | "amenity" | "floor";
  entidad_id: string;
  proveedor: "url" | "matterport" | "layama" | "3dvista" | "pano2vr" | "luma" | "kuula";
  url: string;
  titulo: string;
  orden: number;
}

export interface PointOfInterest {
  id: string;
  project_id: string;
  nombre: string;
  categoria: string;
  lat: number | null;
  lng: number | null;
  distancia_m: number | null;
  descripcion: string;
  orden: number;
}

export interface Translation {
  id: string;
  project_id: string;
  entidad: string;
  entidad_id: string;
  campo: string;
  locale: string;
  valor: string;
}

export interface Broker {
  id: string;
  organization_id: string;
  nombre: string;
  slug: string;
  marca: Record<string, unknown>;
  contacto: Record<string, unknown>;
  estado: "active" | "suspended";
}

export interface BrokerProject {
  broker_id: string;
  project_id: string;
  codigo: string;
  activo: boolean;
}

export interface Quotation {
  id: string;
  project_id: string;
  unit_id: string | null;
  lead_id: string | null;
  seller_id: string | null;
  broker_id: string | null;
  price_list_id: string | null;
  payment_plan_id: string | null;
  moneda: string;
  precio: number | null;
  detalle: Record<string, unknown>;
  estado: "draft" | "enviada" | "aceptada" | "vencida";
  created_at: string;
}

export interface Overlay {
  id: string;
  project_id: string;
  contenedor: "facade" | "floor" | "masterplan" | "media" | "scene";
  contenedor_id: string | null;
  forma: "rect" | "polygon" | "hotspot";
  puntos: [number, number][];
  vinculo_tipo: "unit" | "floor" | "building" | "amenity" | "url";
  vinculo_id: string | null;
  etiqueta: string;
  estado: "draft" | "published";
  orden: number;
}

export interface ConstructionUpdate {
  id: string;
  project_id: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  imagen_url: string | null;
  orden: number;
}

export interface CustomSection {
  id: string;
  project_id: string;
  titulo: string;
  cuerpo: string;
  orden: number;
  visible: boolean;
}

export interface ImprovementRequest {
  id: string;
  project_id: string;
  user_id: string;
  titulo: string;
  detalle: string;
  created_at: string;
}

export interface Viewpoint {
  id: string;
  project_id: string;
  building_id: string | null;
  nombre: string;
  tipo: "portada" | "exterior" | "aereo" | "barrio" | "masterplan";
  orden: number;
  imagen_url: string;
  video_url: string | null;
}

export interface Lead {
  id: string;
  project_id: string;
  unit_id: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  mensaje: string | null;
  canal: "form" | "whatsapp";
  estado: LeadEstado;
  assigned_to: string | null;
  utm: UtmBag;
  fuente: string;
  session_id: string | null;
  visitor_id: string | null;
  broker_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UtmBag {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  referrer?: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  tipo: "nota" | "cambio_estado" | "asignacion" | "consulta";
  detalle: string;
  user_id: string | null;
  created_at: string;
}

export interface StatusChangeRequest {
  id: string;
  project_id: string;
  unit_id: string;
  tipo: RequestTipo;
  estado_desde: UnitStatus;
  estado_hacia: UnitStatus;
  requested_by: string;
  lead_id: string | null;
  price_list_id: string | null;
  payment_plan_id: string | null;
  monto_sena: number | null;
  moneda_sena: string | null;
  comentario_vendedor: string | null;
  estado: RequestEstado;
  expires_at: string;
  extended_count: number;
  decided_by: string | null;
  decided_at: string | null;
  comentario_admin: string | null;
  unit_version_at_request: number;
  reverted: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusChangeRequestEvent {
  id: string;
  request_id: string;
  tipo:
    | "created"
    | "reminder_sent"
    | "reminder_4h"
    | "extended"
    | "approved"
    | "rejected"
    | "expired"
    | "cancelled"
    | "resolved"
    | "reverted";
  user_id: string | null;
  detalle: Record<string, unknown>;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  organization_id: string;
  project_id: string | null;
  tipo: string;
  titulo: string;
  cuerpo: string;
  entidad: string | null;
  entidad_id: string | null;
  canal: "email" | "panel";
  leida: boolean;
  created_at: string;
}

export interface ChangeLog {
  id: string;
  project_id: string;
  change_set_id: string | null;
  user_id: string;
  requested_by: string | null;
  request_id: string | null;
  entidad: string;
  entidad_id: string;
  campo: string;
  valor_anterior: unknown;
  valor_nuevo: unknown;
  origen:
    | "edit"
    | "bulk"
    | "import"
    | "publish"
    | "api"
    | "undo"
    | "request_approved"
    | "request_resolved";
  created_at: string;
}

export interface ChangeSet {
  id: string;
  project_id: string;
  user_id: string;
  tipo: string;
  descripcion: string;
  cantidad: number;
  deshecho_por: string | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  project_id: string;
  visitor_id: string;
  session_id: string;
  nombre: string;
  props: Record<string, unknown>;
  unit_id: string | null;
  device: "mobile" | "desktop" | "tablet";
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_tipo: string | null;
  fuente: string;
  broker_id?: string | null;
  pais?: string | null;
  ts: string;
}

export interface Integration {
  id: string;
  project_id: string;
  tipo: "tokko" | "webhook" | "kommo" | "meta_leadads" | "whatsapp" | "ga4" | "pixel";
  config: {
    api_key?: string;
    development_id?: string;
    url?: string;
    secret?: string;
    enabled?: boolean;
  };
  estado: "ok" | "error" | "idle";
  ultimo_envio: string | null;
  errores_consecutivos: number;
}

export interface IntegrationDelivery {
  id: string;
  integration_id: string;
  lead_id: string;
  intento: number;
  estado: "ok" | "error" | "pendiente";
  respuesta: string | null;
  next_retry_at: string | null;
  created_at: string;
}

export interface Database {
  organizations: Organization[];
  profiles: Profile[];
  memberships: Membership[];
  project_members: ProjectMember[];
  projects: Project[];
  buildings: Building[];
  floors: Floor[];
  typologies: Typology[];
  custom_field_definitions: CustomField[];
  characteristics: Characteristic[];
  entity_characteristics: EntityCharacteristic[];
  units: Unit[];
  price_lists: PriceList[];
  unit_prices: UnitPrice[];
  payment_plans: PaymentPlan[];
  media: MediaAsset[];
  media_links: MediaLink[];
  galleries: Gallery[];
  tours: Tour[];
  points_of_interest: PointOfInterest[];
  translations: Translation[];
  brokers: Broker[];
  broker_projects: BrokerProject[];
  quotations: Quotation[];
  viewpoints: Viewpoint[];
  construction_updates: ConstructionUpdate[];
  custom_sections: CustomSection[];
  improvement_requests: ImprovementRequest[];
  overlays: Overlay[];
  leads: Lead[];
  lead_activities: LeadActivity[];
  status_change_requests: StatusChangeRequest[];
  status_change_request_events: StatusChangeRequestEvent[];
  notifications: NotificationRow[];
  change_log: ChangeLog[];
  change_sets: ChangeSet[];
  events: AnalyticsEvent[];
  integrations: Integration[];
  integration_deliveries: IntegrationDelivery[];
}

export class ServiceError extends Error {
  status: number;
  extra?: Record<string, unknown>;
  constructor(message: string, status = 400, extra?: Record<string, unknown>) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.extra = extra;
  }
}
