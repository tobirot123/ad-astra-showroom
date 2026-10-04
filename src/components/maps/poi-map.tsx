"use client";

import { useEffect, useRef } from "react";
import { poiColor } from "@/lib/domain/poi";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPoi {
  id: string;
  nombre: string;
  categoria: string;
  lat: number | null;
  lng: number | null;
}

interface PoiMapProps {
  lat: number;
  lng: number;
  nombre: string;
  pois: MapPoi[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function PoiMap({ lat, lng, nombre, pois, selectedId, onSelect, onPick, className }: PoiMapProps) {
  const node = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  onSelectRef.current = onSelect;
  onPickRef.current = onPick;

  useEffect(() => {
    const root = node.current;
    if (!root) return;
    let cancelled = false;
    let cleanup = () => {};
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const placed = pois.filter((poi): poi is MapPoi & { lat: number; lng: number } => poi.lat != null && poi.lng != null);
    const selected = placed.find((poi) => poi.id === selectedId) ?? null;

    async function mountGoogle() {
      await loadGoogle(key!);
      const maps = window.google?.maps;
      if (cancelled || !root || !maps) return false;
      const map = new maps.Map(root, {
        center: { lat, lng },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      const home = new maps.Marker({ position: { lat, lng }, map, title: nombre, zIndex: 2 });
      const markers = placed.map((poi) => {
        const marker = new maps.Marker({
          position: { lat: poi.lat, lng: poi.lng },
          map,
          title: poi.nombre,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: poi.id === selectedId ? 11 : 8,
            fillColor: poiColor(poi.categoria),
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        marker.addListener("click", () => onSelectRef.current(poi.id));
        return marker;
      });
      let line: google.maps.Polyline | null = null;
      if (selected) {
        line = new maps.Polyline({
          map,
          path: [{ lat, lng }, { lat: selected.lat, lng: selected.lng }],
          strokeColor: "#4A6844",
          strokeOpacity: 0.9,
          strokeWeight: 3,
        });
        map.panTo({ lat: selected.lat, lng: selected.lng });
      }
      const click = onPickRef.current
        ? map.addListener("click", (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return;
            onPickRef.current?.(event.latLng.lat(), event.latLng.lng());
          })
        : null;
      cleanup = () => {
        home.setMap(null);
        markers.forEach((marker) => marker.setMap(null));
        line?.setMap(null);
        click?.remove();
      };
      return true;
    }

    async function mountLibre() {
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !root) return;
      const map = new maplibregl.Map({
        container: root,
        style: {
          version: 8,
          sources: { osm: { type: "raster", tiles: [OSM], tileSize: 256, attribution: "© OpenStreetMap" } },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [lng, lat],
        zoom: 14,
        attributionControl: { compact: true },
      });
      const home = document.createElement("button");
      home.type = "button";
      home.className = "poi-pin poi-pin-home";
      home.title = nombre;
      home.textContent = "POL";
      new maplibregl.Marker({ element: home }).setLngLat([lng, lat]).addTo(map);
      const markers = placed.map((poi) => {
        const pin = document.createElement("button");
        pin.type = "button";
        pin.className = `poi-pin${poi.id === selectedId ? " is-on" : ""}`;
        pin.style.background = poiColor(poi.categoria);
        pin.title = poi.nombre;
        pin.textContent = poi.nombre.slice(0, 1);
        pin.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current(poi.id);
        });
        return new maplibregl.Marker({ element: pin }).setLngLat([poi.lng, poi.lat]).addTo(map);
      });
      const line: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: selected ? [[lng, lat], [selected.lng, selected.lat]] : [],
        },
      };
      map.on("load", () => {
        map.addSource("ruta", { type: "geojson", data: line });
        map.addLayer({
          id: "ruta",
          type: "line",
          source: "ruta",
          paint: { "line-color": "#4A6844", "line-width": 3, "line-opacity": 0.85 },
        });
      });
      if (selected) map.easeTo({ center: [selected.lng, selected.lat], duration: 400 });
      if (onPickRef.current) {
        map.on("click", (event) => onPickRef.current?.(event.lngLat.lat, event.lngLat.lng));
      }
      cleanup = () => {
        markers.forEach((marker) => marker.remove());
        map.remove();
      };
    }

    void (async () => {
      if (key) {
        try {
          const ok = await mountGoogle();
          if (ok) return;
        } catch {
          /* sin red o clave inválida: OpenStreetMap */
        }
      }
      await mountLibre();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [lat, lng, nombre, pois, selectedId]);

  return <div ref={node} className={className ?? "h-72 w-full overflow-hidden rounded-2xl"} />;
}

function loadGoogle(key: string) {
  if (window.google?.maps) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
  if (existing) {
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("google")), { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.dataset.googleMaps = "1";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("google"));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (node: HTMLElement, options: Record<string, unknown>) => GoogleMap;
        Marker: new (options: Record<string, unknown>) => { setMap: (map: null) => void; addListener: (name: string, fn: () => void) => void };
        Polyline: new (options: Record<string, unknown>) => { setMap: (map: null) => void };
        SymbolPath: { CIRCLE: number };
      };
    };
  }
}

interface GoogleMap {
  panTo: (pos: { lat: number; lng: number }) => void;
  addListener: (name: string, fn: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => { remove: () => void };
}

declare namespace google.maps {
  interface MapMouseEvent {
    latLng?: { lat: () => number; lng: () => number };
  }
  interface Polyline {
    setMap: (map: null) => void;
  }
}
