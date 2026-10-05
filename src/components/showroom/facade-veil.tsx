"use client";

import { useEffect, useRef } from "react";
import { quantizeHex, type FacadeMask } from "@/lib/domain/facade-mask";
import { STATUS_COLOR } from "@/lib/domain/format";

type Unit = { id: string; estado: string };

const MARKER = 0.7;
const HOVER = 0.42;
const LAVENDER = [0x73, 0x7c, 0xb5];

/**
 * Disponibilidad sobre la máscara: un bloque de estado por unidad y,
 * con un filtro activo, el vano entero de las que coinciden.
 */
export function FacadeVeil({
  mask,
  units,
  matched,
  filtering,
  hoverId,
  onHover,
  onPick,
}: {
  mask: FacadeMask;
  units: Unit[];
  matched: (unitId: string) => boolean;
  filtering: boolean;
  hoverId: string | null;
  onHover: (unitId: string | null, point: { x: number; y: number } | null) => void;
  onPick: (unitId: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const index = useRef<{ width: number; height: number; pixels: Uint32Array } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    let cancel = false;
    const sources = mask.modo === "idcolor"
      ? (mask.imagen_url ? [{ url: mask.imagen_url, unitId: "" }] : [])
      : mask.alphas.filter((entry) => entry.imagen_url && entry.unidad_id).map((entry) => ({ url: entry.imagen_url, unitId: entry.unidad_id }));
    const byColor = new Map(mask.mapa.filter((entry) => entry.unidad_id).map((entry) => [entry.color.toLowerCase(), entry.unidad_id]));

    void (async () => {
      const bitmaps = await Promise.all(sources.map(async (source) => {
        const response = await fetch(source.url);
        const blob = await response.blob();
        return { bitmap: await createImageBitmap(blob), unitId: source.unitId };
      }));
      if (cancel || !bitmaps.length) return;
      const width = Math.min(960, bitmaps[0].bitmap.width);
      const height = Math.max(1, Math.round(bitmaps[0].bitmap.height * (width / bitmaps[0].bitmap.width)));
      const scratch = document.createElement("canvas");
      scratch.width = width;
      scratch.height = height;
      const ctx = scratch.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const pixels = new Uint32Array(width * height);
      const ids = units.map((unit) => unit.id);
      const idOf = new Map(ids.map((id, position) => [id, position + 1]));
      if (mask.modo === "idcolor") {
        ctx.drawImage(bitmaps[0].bitmap, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        for (let i = 0; i < pixels.length; i += 1) {
          const offset = i * 4;
          const alpha = data[offset + 3] ?? 0;
          if (alpha < 20) continue;
          const unitId = byColor.get(quantizeHex(data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0));
          if (unitId) pixels[i] = idOf.get(unitId) ?? 0;
        }
      } else {
        bitmaps.forEach((item) => {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(item.bitmap, 0, 0, width, height);
          const data = ctx.getImageData(0, 0, width, height).data;
          const slot = idOf.get(item.unitId) ?? 0;
          if (!slot) return;
          for (let i = 0; i < pixels.length; i += 1) {
            if ((data[i * 4 + 3] ?? 0) > 40) pixels[i] = slot;
          }
        });
      }
      bitmaps.forEach((item) => item.bitmap.close());
      if (cancel) return;
      index.current = { width, height, pixels };
      paint();
    })().catch(() => undefined);

    return () => {
      cancel = true;
    };
    // paint reads the latest hover/filter via the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mask]);

  useEffect(() => {
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverId, units, matched, filtering]);

  function paint() {
    const map = index.current;
    const node = canvas.current;
    if (!map || !node) return;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    if (node.width !== map.width || node.height !== map.height) {
      node.width = map.width;
      node.height = map.height;
    }
    const image = ctx.createImageData(map.width, map.height);
    const colorOf = new Map(units.map((unit) => {
      const hex = (STATUS_COLOR[unit.estado] ?? "#1ac366").replace("#", "");
      return [unit.id, [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)] as const];
    }));
    const ids = units.map((unit) => unit.id);
    const box = new Map<string, { x0: number; y0: number; x1: number; y1: number }>();
    for (let i = 0; i < map.pixels.length; i += 1) {
      const slot = map.pixels[i];
      if (!slot) continue;
      const unitId = ids[slot - 1];
      if (!unitId) continue;
      const x = i % map.width;
      const y = Math.floor(i / map.width);
      const current = box.get(unitId);
      if (!current) box.set(unitId, { x0: x, y0: y, x1: x, y1: y });
      else {
        current.x0 = Math.min(current.x0, x);
        current.y0 = Math.min(current.y0, y);
        current.x1 = Math.max(current.x1, x);
        current.y1 = Math.max(current.y1, y);
      }
    }
    const marker = new Map<string, { x0: number; y0: number; x1: number; y1: number }>();
    for (const [unitId, bounds] of box) {
      const span = bounds.x1 - bounds.x0;
      const blockW = Math.max(4, Math.round(map.width * (span < map.width * 0.04 ? 0.012 : 0.007)));
      const blockH = Math.max(8, Math.round(map.height * 0.016));
      const x0 = bounds.x0 + Math.round(span * 0.1);
      const y0 = Math.round((bounds.y0 + bounds.y1) / 2 - blockH / 2);
      marker.set(unitId, { x0, y0, x1: x0 + blockW, y1: y0 + blockH });
    }
    for (let i = 0; i < map.pixels.length; i += 1) {
      const slot = map.pixels[i];
      if (!slot) continue;
      const unitId = ids[slot - 1];
      if (!unitId) continue;
      const x = i % map.width;
      const y = Math.floor(i / map.width);
      const hit = marker.get(unitId);
      const onMarker = Boolean(hit && x >= hit.x0 && x <= hit.x1 && y >= hit.y0 && y <= hit.y1);
      const lit = filtering && matched(unitId);
      const hovered = hoverId === unitId;
      if (!hovered && !lit && !onMarker) continue;
      const rgb = hovered ? LAVENDER : colorOf.get(unitId);
      if (!rgb) continue;
      const alpha = hovered ? HOVER : MARKER;
      const offset = i * 4;
      image.data[offset] = rgb[0];
      image.data[offset + 1] = rgb[1];
      image.data[offset + 2] = rgb[2];
      image.data[offset + 3] = Math.round(alpha * 255);
    }
    ctx.putImageData(image, 0, 0);
  }

  function unitAt(clientX: number, clientY: number) {
    const map = index.current;
    const node = canvas.current;
    if (!map || !node) return null;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.min(map.width - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * map.width)));
    const y = Math.min(map.height - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * map.height)));
    const slot = map.pixels[y * map.width + x];
    if (!slot) return null;
    return units[slot - 1]?.id ?? null;
  }

  return (
    <canvas
      ref={canvas}
      className="hotspots absolute inset-0 h-full w-full"
      onPointerDown={() => { moved.current = false; }}
      onPointerMove={(event) => {
        if (event.pointerType === "touch") return;
        const dx = Math.abs(event.movementX) + Math.abs(event.movementY);
        if (dx > 2 && event.buttons) moved.current = true;
        if (window.matchMedia("(pointer: coarse)").matches) return;
        onHover(unitAt(event.clientX, event.clientY), { x: event.clientX, y: event.clientY });
      }}
      onPointerLeave={() => onHover(null, null)}
      onClick={(event) => {
        event.stopPropagation();
        if (moved.current) return;
        const unitId = unitAt(event.clientX, event.clientY);
        if (unitId) onPick(unitId);
      }}
    />
  );
}
