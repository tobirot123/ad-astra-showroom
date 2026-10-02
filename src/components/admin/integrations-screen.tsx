"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import { useAdmin } from "@/components/admin/provider";

export function IntegrationsScreen() {
  const { data, mutate } = useAdmin();
  const [tokkoKey, setTokkoKey] = useState("");
  const [devId, setDevId] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [hookSecret, setHookSecret] = useState("");
  const [result, setResult] = useState("");
  if (!data?.project) return null;
  const admin = can(data.actor, "manage_integrations");
  const tokko = data.integrations.find((item) => item.tipo === "tokko");
  const webhook = data.integrations.find((item) => item.tipo === "webhook");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
        <h1 className="font-serif text-3xl">Tokko Broker</h1>
        <p className="mt-1 text-sm text-[#6b6258]">
          Cada lead se manda con POST a /api/v1/webcontact. La API key queda en el servidor: acá ves solo los últimos 4.
        </p>
        <p className="mt-2 text-xs text-[#6b6258]">Guardada: {tokko?.config.api_key || "ninguna"} · estado {tokko?.estado ?? "idle"} · fallos seguidos {tokko?.errores_consecutivos ?? 0}</p>
        {admin && (
          <form
            className="mt-4 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              await mutate({
                op: "save_integration",
                projectId: data.project!.id,
                tipo: "tokko",
                config: {
                  api_key: tokkoKey || undefined,
                  development_id: devId || tokko?.config.development_id,
                  enabled: true,
                },
              });
              setTokkoKey("");
            }}
          >
            <input value={tokkoKey} onChange={(e) => setTokkoKey(e.target.value)} placeholder="API key nueva" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <input value={devId || tokko?.config.development_id || ""} onChange={(e) => setDevId(e.target.value)} placeholder="ID del emprendimiento" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">Guardar Tokko</button>
          </form>
        )}
        {admin && (
          <button
            className="mt-3 rounded-full border border-[#e4d9c8] px-4 py-2 text-sm"
            onClick={async () => {
              const response = await mutate({ op: "test_tokko", projectId: data.project!.id });
              setResult(response ? "Enviamos un contacto de prueba con el primer lead del proyecto." : "La prueba no salió. Revisá la key y el ID.");
            }}
          >
            Probar envío
          </button>
        )}
        {result && <p className="mt-2 text-sm">{result}</p>}
      </section>
      <section className="rounded-3xl border border-[#e4d9c8] bg-white p-5">
        <h2 className="font-serif text-3xl">Webhook</h2>
        <p className="mt-1 text-sm text-[#6b6258]">JSON con el lead, la unidad y las UTM. Firmamos el pedido con el header x-webhook-secret.</p>
        {admin && (
          <form
            className="mt-4 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              void mutate({
                op: "save_integration",
                projectId: data.project!.id,
                tipo: "webhook",
                config: {
                  url: hookUrl || webhook?.config.url,
                  secret: hookSecret || undefined,
                  enabled: true,
                },
              });
            }}
          >
            <input value={hookUrl || webhook?.config.url || ""} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://tu-crm.example/leads" className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <input value={hookSecret} onChange={(e) => setHookSecret(e.target.value)} placeholder={webhook?.config.secret ? "Secreto guardado" : "Secreto"} className="w-full rounded-xl border border-[#e4d9c8] px-3 py-2" />
            <button className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-white">Guardar webhook</button>
          </form>
        )}
        <h3 className="mt-6 text-sm font-medium">Últimos envíos</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {data.deliveries.map((delivery) => (
            <li key={delivery.id} className="rounded-2xl bg-[#f6f1e8] px-3 py-2">
              <p>{delivery.estado} · intento {delivery.intento}</p>
              <p className="text-xs text-[#6b6258]">{formatDateTime(delivery.created_at)}{delivery.respuesta ? ` · ${delivery.respuesta.slice(0, 120)}` : ""}</p>
            </li>
          ))}
          {!data.deliveries.length && <li className="text-[#6b6258]">Todavía no hubo envíos.</li>}
        </ul>
      </section>
    </div>
  );
}
