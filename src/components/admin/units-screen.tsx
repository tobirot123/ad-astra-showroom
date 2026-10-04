"use client";

import { useMemo, useState } from "react";
import { STATUS_LABEL, formatM2, formatUsd } from "@/lib/domain/format";
import { can } from "@/lib/domain/permissions";
import { adjustPrice } from "@/lib/domain/pricing";
import { useAdmin } from "@/components/admin/provider";

export function UnitsScreen() {
  const { data, mutate } = useAdmin();
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState("todos");
  const [selected, setSelected] = useState<string[]>([]);
  const [percent, setPercent] = useState("5");
  const [roundTo, setRoundTo] = useState("500");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [requestUnit, setRequestUnit] = useState<string | null>(null);
  const rows = useMemo(() => {
    if (!data?.project) return [];
    return data.units.filter((unit) => {
      if (estado !== "todos" && unit.estado !== estado) return false;
      if (query && !`${unit.codigo} ${unit.orientacion ?? ""}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [data, estado, query]);
  if (!data?.project) return null;
  const actor = data.actor;
  const editable = can(actor, "edit_units");
  const prices = can(actor, "edit_prices");
  const direct = can(actor, "change_status_direct");
  const seller = can(actor, "request_status");

  const floorName = new Map(data.floors.map((floor) => [floor.id, floor.nombre]));
  const typName = new Map(data.typologies.map((typ) => [typ.id, typ.nombre]));
  function vistaChoice(unitId: string, vista: string | null) {
    if (vista === "sin") return "sin";
    return (data?.media_links ?? []).find((link) => link.entidad === "unit" && link.entidad_id === unitId && link.rol === "vista")?.media_id ?? "";
  }

  async function patch(unitId: string, body: Record<string, unknown>, version: number) {
    await mutate({ op: "update_unit", unitId, patch: { ...body, version } });
  }

  const selectedUnits = data.units.filter((unit) => selected.includes(unit.id));
  const before = selectedUnits.reduce((sum, unit) => sum + (unit.precio ?? 0), 0);
  const after = selectedUnits.reduce((sum, unit) => sum + (unit.precio == null ? 0 : adjustPrice(unit.precio, "percent", Number(percent || 0), Number(roundTo || 0))), 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl">Unidades</h1>
          <p className="text-sm text-[#6b6258]">{data.units.length} unidades · {data.units.filter((u) => u.estado === "disponible").length} disponibles · {data.units.filter((u) => u.pending_label).length} con solicitud</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-full bg-white px-3 py-2 text-sm" href={`/api/admin/export?projectId=${data.project.id}`}>Exportar CSV</a>
          {editable && (
            <label className="cursor-pointer rounded-full bg-[#1c1915] px-3 py-2 text-sm text-white">
              Importar CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setCsv(text);
                  const result = await mutate({ op: "import_units", projectId: data.project!.id, csv: text, apply: false });
                  const summary = result?.extra as { preview?: { unchanged: number; modified: number; created: number; errors: number; rows: { line: number; codigo: string; kind: string; errors: string[] }[] } } | undefined;
                  const p = summary?.preview;
                  if (!p) return;
                  const errs = p.rows.filter((row) => row.kind === "error").slice(0, 5).map((row) => `Fila ${row.line} (${row.codigo}): ${row.errors.join(", ")}`).join("\n");
                  setPreview(`${p.unchanged} sin cambios · ${p.modified} modificadas · ${p.created} nuevas · ${p.errors} con error\n${errs}`);
                }}
              />
            </label>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar 4A…" className="rounded-xl border border-[#e4d9c8] bg-white px-3 py-2" />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-[#e4d9c8] bg-white px-3 py-2">
          <option value="todos">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      {preview && (
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm">
          <pre className="whitespace-pre-wrap">{preview}</pre>
          <button
            className="mt-3 rounded-full bg-[#1c1915] px-4 py-2 text-white"
            onClick={async () => {
              await mutate({ op: "import_units", projectId: data.project!.id, csv, apply: true });
              setPreview("");
              setCsv("");
            }}
          >
            Aplicar lo válido
          </button>
        </div>
      )}
      <div className="mt-4 overflow-x-auto rounded-3xl bg-white">
        <table className="min-w-[920px] w-full text-sm">
          <thead className="text-left text-[#6b6258]">
            <tr>
              <th className="p-3"></th>
              <th>Unidad</th><th>Piso</th><th>Tipología</th><th>m² cub.</th><th>m² tot.</th><th>Orient.</th><th>Vista</th><th>Precio</th><th>Estado</th><th>Cochera</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((unit) => (
              <tr key={unit.id} className="border-t border-[#f4efe6]">
                <td className="p-3">
                  <input type="checkbox" checked={selected.includes(unit.id)} onChange={(e) => setSelected((curr) => e.target.checked ? [...curr, unit.id] : curr.filter((id) => id !== unit.id))} />
                </td>
                <td className="py-2 font-medium">
                  {unit.codigo}
                  {unit.pending_label && <span className="mt-1 block text-xs text-[#9a6240]">{unit.pending_label}</span>}
                  {seller && (
                    <button className="mt-1 block text-xs underline" onClick={() => setRequestUnit(unit.id)}>Solicitar</button>
                  )}
                </td>
                <td>{unit.floor_id ? floorName.get(unit.floor_id) : "—"}</td>
                <td className={unit.inherited.includes("ambientes") ? "text-[#98a2b3]" : ""}>{unit.typology_id ? typName.get(unit.typology_id) : "—"}</td>
                <td>
                  <Cell
                    value={unit.m2_cubiertos}
                    gray={unit.inherited.includes("m2_cubiertos")}
                    disabled={!editable}
                    onSave={(value) => patch(unit.id, { m2_cubiertos: value }, unit.version)}
                  />
                </td>
                <td>
                  <Cell
                    value={unit.m2_totales}
                    gray={unit.inherited.includes("m2_totales")}
                    disabled={!editable}
                    onSave={(value) => patch(unit.id, { m2_totales: value }, unit.version)}
                  />
                </td>
                <td>{unit.orientacion}</td>
                <td>
                  {editable ? (
                    <select
                      value={vistaChoice(unit.id, unit.vista)}
                      onChange={(event) => void mutate({ op: "set_unit_vista", unitId: unit.id, choice: event.target.value })}
                      className="max-w-36 rounded border border-transparent bg-transparent text-xs"
                    >
                      <option value="">Según orientación</option>
                      <option value="sin">Sin vista</option>
                      {data.media.filter((item) => item.tipo !== "video").map((item) => (
                        <option key={item.id} value={item.id}>{item.nombre}</option>
                      ))}
                    </select>
                  ) : unit.vista === "sin" ? "Sin vista" : "Según orientación"}
                </td>
                <td>
                  {prices ? (
                    <input
                      defaultValue={unit.precio ?? ""}
                      key={`${unit.id}-${unit.precio}`}
                      className="w-28 rounded border border-transparent bg-transparent px-1 py-1 hover:border-[#e4d9c8]"
                      onBlur={(e) => {
                        const next = e.target.value.trim() === "" ? null : Number(e.target.value.replace(/\./g, "").replace(",", "."));
                        if (next !== unit.precio) void patch(unit.id, { precio_usd: next }, unit.version);
                      }}
                    />
                  ) : (
                    unit.precio != null ? formatUsd(unit.precio) : "Consultar"
                  )}
                </td>
                <td>
                  {direct ? (
                    <select
                      value={unit.estado}
                      className="rounded border border-transparent bg-transparent"
                      onChange={(e) => void mutate({ op: "direct_status", unitId: unit.id, estado: e.target.value })}
                    >
                      {["disponible", "reservada", "vendida", "bloqueada", "pausa", "oculta"].map((key) => <option key={key} value={key}>{STATUS_LABEL[key]}</option>)}
                    </select>
                  ) : STATUS_LABEL[unit.estado]}
                </td>
                <td>{String(unit.custom_values.tipo_cochera ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!!selected.length && (editable || prices || direct) && (
        <div className="mt-4 rounded-3xl bg-[#1c1915] p-4 text-sm text-[#f6f1e8]">
          <p>{selected.length} seleccionadas. Precio +{percent || 0} % redondeo {roundTo || 0}: {formatUsd(before)} → {formatUsd(after)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={percent} onChange={(e) => setPercent(e.target.value)} className="w-20 rounded-lg bg-white/10 px-2 py-1" aria-label="Porcentaje" />
            <input value={roundTo} onChange={(e) => setRoundTo(e.target.value)} className="w-24 rounded-lg bg-white/10 px-2 py-1" aria-label="Redondeo" />
            <button className="rounded-full bg-[#c4a574] px-3 py-1 text-[#1c1915]" onClick={() => void mutate({ op: "bulk_units", unitIds: selected, patch: { price: { mode: "percent", value: Number(percent), roundTo: Number(roundTo) } } })}>
              Ajustar precio
            </button>
            {direct && (
              <button className="rounded-full border border-white/20 px-3 py-1" onClick={() => void mutate({ op: "bulk_units", unitIds: selected, patch: { estado: "disponible", confirm: true } })}>
                Marcar disponibles
              </button>
            )}
          </div>
        </div>
      )}
      {requestUnit && seller && (
        <RequestDialog
          unitId={requestUnit}
          codigo={data.units.find((u) => u.id === requestUnit)?.codigo ?? ""}
          leads={data.leads}
          onClose={() => setRequestUnit(null)}
          onSubmit={async (payload) => {
            const result = await mutate({ op: "create_request", ...payload, unitId: requestUnit });
            if (result) setRequestUnit(null);
          }}
        />
      )}
      <p className="mt-3 text-xs text-[#6b6258]">Los m² en gris se heredan de la tipología. Si los editás, pasan a ser propios de la unidad. Un ejemplo: {rows[0] ? formatM2(rows[0].m2_cubiertos ?? 0) : ""}.</p>
    </div>
  );
}

function Cell({ value, gray, disabled, onSave }: { value: number | null; gray?: boolean; disabled?: boolean; onSave: (value: number) => void }) {
  if (disabled) return <span className={gray ? "text-[#98a2b3]" : ""}>{value == null ? "—" : formatM2(value)}</span>;
  return (
    <input
      key={String(value)}
      defaultValue={value ?? ""}
      className={`w-20 rounded border border-transparent bg-transparent px-1 py-1 hover:border-[#e4d9c8] ${gray ? "text-[#98a2b3]" : ""}`}
      onBlur={(e) => {
        const next = Number(e.target.value.replace(/\./g, "").replace(",", "."));
        if (Number.isFinite(next) && next !== value) onSave(next);
      }}
    />
  );
}

function RequestDialog({
  unitId,
  codigo,
  leads,
  onClose,
  onSubmit,
}: {
  unitId: string;
  codigo: string;
  leads: { id: string; nombre: string }[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [tipo, setTipo] = useState("reserve");
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [comentario, setComentario] = useState("");
  const [monto, setMonto] = useState("");
  void unitId;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <form
        className="w-full max-w-md rounded-3xl bg-[#f6f1e8] p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({
            tipo,
            leadId: leadId || null,
            newLead: nombre ? { nombre, telefono } : undefined,
            comentario,
            montoSena: monto ? Number(monto) : null,
          });
        }}
      >
        <h2 className="font-serif text-3xl">Solicitar {codigo}</h2>
        <p className="mt-1 text-sm text-[#6b6258]">La unidad sigue con su estado oficial en la web hasta que el admin apruebe. Vence en 48 h.</p>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-3 w-full rounded-xl bg-white px-3 py-2">
          <option value="reserve">Reservar</option>
          <option value="sell">Vender</option>
          <option value="release">Liberar</option>
        </select>
        <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="mt-2 w-full rounded-xl bg-white px-3 py-2">
          <option value="">Cliente nuevo</option>
          {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.nombre}</option>)}
        </select>
        {!leadId && (
          <>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del cliente" className="mt-2 w-full rounded-xl bg-white px-3 py-2" />
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Celular o email" className="mt-2 w-full rounded-xl bg-white px-3 py-2" />
          </>
        )}
        <input value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="Seña USD (opcional)" className="mt-2 w-full rounded-xl bg-white px-3 py-2" />
        <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentario" className="mt-2 w-full rounded-xl bg-white px-3 py-2" rows={3} />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2">Cancelar</button>
          <button className="rounded-full bg-[#1c1915] px-4 py-2 text-white">Enviar solicitud</button>
        </div>
      </form>
    </div>
  );
}
