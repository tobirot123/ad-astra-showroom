"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_LABEL } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

const LINKS = [
  { href: "/admin", label: "Métricas", action: "view_metrics" as const },
  { href: "/admin/proyectos", label: "Proyecto", action: "edit_project" as const },
  { href: "/admin/unidades", label: "Unidades", action: "export_units" as const },
  { href: "/admin/campos", label: "Campos", action: "edit_custom_fields" as const },
  { href: "/admin/medios", label: "Medios", action: "manage_media" as const },
  { href: "/admin/zonas", label: "Zonas", action: "edit_overlays" as const },
  { href: "/admin/recorrido", label: "Recorrido", action: "manage_media" as const },
  { href: "/admin/lugares", label: "Lugares", action: "edit_project" as const },
  { href: "/admin/solicitudes", label: "Solicitudes", action: "request_status" as const },
  { href: "/admin/leads", label: "Leads", action: "view_leads" as const },
  { href: "/admin/historial", label: "Historial", action: "view_audit" as const },
  { href: "/admin/integraciones", label: "Integraciones", action: "manage_integrations" as const },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { data, error, notice } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  if (!data?.project) {
    return <div className="grid min-h-screen place-items-center text-sm text-[#6b6258]">{error || "Cargando el panel…"}</div>;
  }
  const actor = data.actor;
  const visible = LINKS.filter((link) => {
    if (link.href === "/admin/solicitudes") return can(actor, "approve_request") || can(actor, "request_status");
    if (link.href === "/admin/proyectos" && actor.role === "seller") return true;
    return can(actor, link.action) || (link.href === "/admin" && can(actor, "view_metrics"));
  });

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#1c1915] md:grid md:grid-cols-[240px_1fr]">
      <aside className="flex flex-col bg-[#1c1915] text-[#f6f1e8] md:min-h-screen">
        <div className="px-5 py-5">
          <p className="font-serif text-xl">Ad Astra</p>
          <p className="text-xs text-[#c4a574]">{data.project.nombre}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:overflow-visible">
          {visible.map((link) => {
            const active = pathname === link.href;
            const badge = link.href === "/admin/solicitudes" ? data.pending_count : link.href === "/admin/leads" ? data.leads.filter((l) => l.estado === "nuevo").length : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between whitespace-nowrap rounded-xl px-3 py-2 text-sm ${active ? "bg-white/10" : "hover:bg-white/5"}`}
              >
                {link.label}
                {badge > 0 && <span className="rounded-full bg-[#c4a574] px-2 text-xs text-[#1c1915]">{badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden px-5 py-5 text-xs text-[#d9cbb8] md:block">
          <p>{actor.nombre}</p>
          <p>{ROLE_LABEL[actor.role]}</p>
        </div>
      </aside>
      <div>
        <header className="flex items-center justify-between gap-3 border-b border-[#e4d9c8] px-4 py-3 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#9a6240]">Norte Desarrollos</p>
            <p className="font-medium">{data.project.nombre}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {notice && <span className="text-[#1f6b4a]">{notice}</span>}
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-full border border-[#e4d9c8] px-3 py-1">
                Avisos{data.unread ? ` (${data.unread})` : ""}
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-[#e4d9c8] bg-white p-3 shadow-xl">
                {!data.notifications.length && <p className="text-sm text-[#6b6258]">No hay avisos.</p>}
                <ul className="max-h-80 space-y-2 overflow-auto">
                  {data.notifications.map((note) => (
                    <li key={note.id} className={note.leida ? "opacity-60" : ""}>
                      <p className="text-sm font-medium">{note.titulo}</p>
                      <p className="text-xs text-[#6b6258]">{note.cuerpo}</p>
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-2 text-xs underline"
                  onClick={() => void fetch("/api/admin/mutate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "mark_read", notificationId: "all" }) }).then(() => location.reload())}
                >
                  Marcar leídas
                </button>
              </div>
            </details>
            <button
              className="text-sm underline"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.replace("/admin/login");
              }}
            >
              Salir
            </button>
          </div>
        </header>
        {data.pending_count > 0 && can(actor, "approve_request") && (
          <p className="bg-[#fff6e8] px-4 py-2 text-sm md:px-6">
            {data.pending_count} solicitudes de estado pendientes.{" "}
            <Link href="/admin/solicitudes" className="underline">Revisar</Link>
          </p>
        )}
        {error && <p className="bg-[#fde8e6] px-4 py-2 text-sm text-[#b42318] md:px-6">{error}</p>}
        <div className="px-4 py-5 md:px-6">{children}</div>
      </div>
    </div>
  );
}
