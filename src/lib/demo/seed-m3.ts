import { seedId } from "@/lib/domain/ids";
import type { Database } from "@/lib/domain/types";

export function appendCommercial(db: Database) {
  const project = db.projects[0];
  if (!project) return;
  db.construction_updates.push(
    {
      id: seedId(1501),
      project_id: project.id,
      fecha: "2026-03-01",
      titulo: "Excavación y fundaciones",
      descripcion: "Platea terminada y columnas del subsuelo encofradas.",
      imagen_url: "/demo/vista-altura.webp",
      orden: 1,
    },
    {
      id: seedId(1502),
      project_id: project.id,
      fecha: "2026-07-15",
      titulo: "Estructura hasta el piso 3",
      descripcion: "Losas de los primeros tres niveles hormigonadas.",
      imagen_url: "/demo/fachada.webp",
      orden: 2,
    },
  );
  db.custom_sections.push({
    id: seedId(1510),
    project_id: project.id,
    titulo: "Cómo comprar",
    cuerpo: "La reserva se confirma con una seña. El boleto se firma dentro de los 30 días. Las cuotas y el saldo se detallan en la cotización.",
    orden: 1,
    visible: true,
  });
}
