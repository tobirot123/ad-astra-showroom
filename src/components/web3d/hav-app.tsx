"use client"

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  formatM2,
  formatUsd,
  havContact,
  havGeometry,
  havLotsByNumber,
  showAvailabilityColors,
  showsPrice,
  statusLabel,
  whatsappLink,
  type HavLot,
  type LotPoint,
} from "@/lib/demo/seed-hav"

type View = { x: number; y: number; z: number }

const MAP_W = havGeometry.width
const MAP_H = havGeometry.height

function centroid(points: LotPoint[]) {
  const x = points.reduce((sum, point) => sum + point[0], 0) / points.length
  const y = points.reduce((sum, point) => sum + point[1], 0) / points.length
  return [x, y] as const
}

function bounds(points: LotPoint[]) {
  const xs = points.map((point) => point[0])
  const ys = points.map((point) => point[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}

function availabilityFill(lot: HavLot, hot: boolean) {
  const alpha = hot ? 0.72 : 0.48
  if (lot.estado === "vendido") return `rgba(90, 96, 92, ${alpha})`
  if (lot.estado === "reservado") return `rgba(184, 138, 58, ${alpha})`
  return `rgba(47, 125, 78, ${alpha})`
}

export function HavApp({ initialLote }: { initialLote?: number | null }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const fitZ = useRef(0.4)
  const viewRef = useRef<View>({ x: 0, y: 0, z: 0.4 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef({ moved: false, x: 0, y: 0, vx: 0, vy: 0 })
  const pinch = useRef<null | { dist: number; z: number; wx: number; wy: number }>(null)

  const [phase, setPhase] = useState<"cover" | "map">(initialLote ? "map" : "cover")
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.4 })
  const [selected, setSelected] = useState<number | null>(initialLote ?? null)
  const [hover, setHover] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  function commit(next: View) {
    viewRef.current = next
    setView(next)
  }

  function clampZ(z: number) {
    const min = fitZ.current * 0.85
    const max = Math.max(3.2, fitZ.current * 8)
    return Math.min(max, Math.max(min, z))
  }

  function clamp(next: View): View {
    const el = viewportRef.current
    if (!el) return next
    const rect = el.getBoundingClientRect()
    const width = MAP_W * next.z
    const height = MAP_H * next.z
    return {
      z: next.z,
      x: Math.min(rect.width - 64, Math.max(64 - width, next.x)),
      y: Math.min(rect.height - 64, Math.max(64 - height, next.y)),
    }
  }

  function fit() {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const z = Math.min(rect.width / MAP_W, rect.height / MAP_H) * 0.98
    fitZ.current = z
    commit(clamp({ z, x: (rect.width - MAP_W * z) / 2, y: (rect.height - MAP_H * z) / 2 }))
  }

  function focusLot(lote: number) {
    const points = havGeometry.lots[String(lote)]
    const el = viewportRef.current
    if (!points || !el) return
    const [cx, cy] = centroid(points)
    const rect = el.getBoundingClientRect()
    const wide = rect.width >= 900
    const targetZ = clampZ(Math.max(viewRef.current.z, 0.9))
    const anchorX = wide ? (rect.width - 400) / 2 : rect.width / 2
    const anchorY = wide ? rect.height / 2 : rect.height * 0.36
    commit(clamp({ z: targetZ, x: anchorX - cx * targetZ, y: anchorY - cy * targetZ }))
    setSelected(lote)
    setError(null)
  }

  useLayoutEffect(() => {
    if (phase !== "map") return
    fit()
    if (initialLote && havLotsByNumber[initialLote]) focusLot(initialLote)
    setReady(true)
    // El encuadre se calcula una vez al abrir el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    const el = viewportRef.current
    if (!el || phase !== "map") return
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const current = viewRef.current
      const rect = el!.getBoundingClientRect()
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const z = clampZ(current.z * Math.exp(-event.deltaY * 0.0014))
      const wx = (px - current.x) / current.z
      const wy = (py - current.y) / current.z
      commit(clamp({ z, x: px - wx * z, y: py - wy * z }))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [phase])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return
      if (event.key === "Escape") setSelected(null)
      if (event.key === "+" || event.key === "=") zoomBy(1.2)
      if (event.key === "-" || event.key === "_") zoomBy(1 / 1.2)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase])

  function zoomBy(factor: number) {
    const el = viewportRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = rect.width / 2
    const py = rect.height / 2
    const current = viewRef.current
    const z = clampZ(current.z * factor)
    const wx = (px - current.x) / current.z
    const wy = (py - current.y) / current.z
    commit(clamp({ z, x: px - wx * z, y: py - wy * z }))
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 1) {
      pinch.current = null
      drag.current = {
        moved: false,
        x: event.clientX,
        y: event.clientY,
        vx: viewRef.current.x,
        vy: viewRef.current.y,
      }
    } else {
      beginPinch()
    }
  }

  function beginPinch() {
    const pts = [...pointers.current.values()]
    if (pts.length < 2) return
    const [p, q] = pts
    const dist = Math.hypot(p.x - q.x, p.y - q.y) || 1
    const midX = (p.x + q.x) / 2
    const midY = (p.y + q.y) / 2
    const current = viewRef.current
    const rect = viewportRef.current?.getBoundingClientRect()
    const originX = rect?.left ?? 0
    const originY = rect?.top ?? 0
    pinch.current = {
      dist,
      z: current.z,
      wx: (midX - originX - current.x) / current.z,
      wy: (midY - originY - current.y) / current.z,
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size >= 2 && pinch.current) {
      const pts = [...pointers.current.values()]
      const [p, q] = pts
      const dist = Math.hypot(p.x - q.x, p.y - q.y) || 1
      const rect = viewportRef.current?.getBoundingClientRect()
      const originX = rect?.left ?? 0
      const originY = rect?.top ?? 0
      const midX = (p.x + q.x) / 2 - originX
      const midY = (p.y + q.y) / 2 - originY
      const z = clampZ(pinch.current.z * (dist / pinch.current.dist))
      drag.current.moved = true
      commit(clamp({ z, x: midX - pinch.current.wx * z, y: midY - pinch.current.wy * z }))
      return
    }
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (Math.hypot(dx, dy) > 5) drag.current.moved = true
    commit(clamp({ ...viewRef.current, x: drag.current.vx + dx, y: drag.current.vy + dy }))
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const moved = drag.current.moved
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 1) {
      const [only] = pointers.current.values()
      drag.current = { moved: true, x: only.x, y: only.y, vx: viewRef.current.x, vy: viewRef.current.y }
    }
    if (moved || pointers.current.size > 0) return
    const node = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-lot]")
    const lote = node ? Number(node.getAttribute("data-lot")) : NaN
    if (Number.isInteger(lote) && havLotsByNumber[lote]) setSelected(lote)
  }

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const match = query.match(/\d+/)
    if (!match) {
      setError("Escribí el número de lote")
      return
    }
    const lote = Number(match[0])
    if (!havLotsByNumber[lote]) {
      setError("Ese lote no está en el barrio")
      return
    }
    focusLot(lote)
  }

  const lot = selected != null ? havLotsByNumber[selected] : undefined

  if (phase === "cover") {
    return (
      <main className="stage">
        <section className="cover">
          <img className="cover-photo" src="/hav/w3d/top-2.webp" alt="" />
          <div className="cover-shade" />
          <div className="cover-card">
            <h1 className="sr-only">Haras Andrea Virginia</h1>
            <img className="cover-logo" src="/hav/w3d/logo-home.png" alt="Haras Andrea Virginia" />
            <p className="place">{havContact.place}</p>
            <button className="entrar" type="button" onClick={() => setPhase("map")}>
              Entrar
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={lot ? "stage with-sheet" : "stage"}>
      <h1 className="sr-only">Haras Andrea Virginia</h1>
      <div
        className="map"
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="world"
          style={{
            width: MAP_W,
            height: MAP_H,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
            transformOrigin: "0 0",
            opacity: ready ? 1 : 0,
          }}
        >
          <img src={havGeometry.image} alt="Vista aérea de Haras Andrea Virginia" draggable={false} />
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label="Lotes">
            {Object.entries(havGeometry.lots).map(([id, points]) => {
              const lote = Number(id)
              const data = havLotsByNumber[lote]
              if (!data) return null
              const hot = hover === lote || selected === lote
              const box = bounds(points)
              const [cx, cy] = centroid(points)
              const z = Math.max(view.z, 0.05)
              // Mismo cuerpo para 1, 2 o 3 cifras, medido para que entre en el lote.
              const byWidth = (box.width * 0.92) / 1.5
              const byHeight = box.height * 0.62
              const fitScreen = Math.min(byWidth, byHeight) * z
              const screenPx = Math.min(hot ? 26 : 18, Math.max(8, fitScreen))
              const drawFont = screenPx / z
              const strokePx = screenPx <= 9 ? 0.65 : 1.05
              const fill = showAvailabilityColors
                ? availabilityFill(data, hot)
                : hot
                  ? "rgba(246, 241, 231, 0.38)"
                  : "rgba(255, 255, 255, 0.02)"
              return (
                <g key={lote} onMouseEnter={() => setHover(lote)} onMouseLeave={() => setHover(null)}>
                  <polygon
                    className="lot"
                    data-lot={lote}
                    data-testid={`lot-${lote}`}
                    points={points.map((point) => point.join(",")).join(" ")}
                    fill={fill}
                    stroke={hot ? "#f6f1e7" : "rgba(255, 250, 242, 0.28)"}
                    strokeWidth={hot ? 2.4 / view.z : 1.1 / view.z}
                    aria-label={`Lote ${lote}`}
                  />
                  <text
                    className="lot-num"
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={drawFont}
                    strokeWidth={(hot ? strokePx + 0.45 : strokePx) / z}
                  >
                    {lote}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <header className="hud">
        <div className="brand">
          <img src="/hav/w3d/logo-home.png" alt="" />
          <span>{havContact.place}</span>
        </div>
        <div className="search">
          <form onSubmit={onSearch}>
            <input
              aria-label="Buscar lote"
              inputMode="numeric"
              placeholder="Buscar lote"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setError(null)
              }}
            />
            <button type="submit">Ir</button>
          </form>
          {error ? <p className="search-error">{error}</p> : null}
        </div>
      </header>

      <div className="tools">
        <button className="icon-btn" type="button" aria-label="Acercar" onClick={() => zoomBy(1.25)}>
          +
        </button>
        <button className="icon-btn" type="button" aria-label="Alejar" onClick={() => zoomBy(0.8)}>
          −
        </button>
        <button className="icon-btn wide" type="button" onClick={fit}>
          Ver todo
        </button>
      </div>

      {!lot ? <p className="hint">Tocá un lote para ver la ficha</p> : null}

      {showAvailabilityColors ? (
        <ul className="legend" aria-label="Referencias">
          <li><i className="swatch disponible" /> Disponible</li>
          <li><i className="swatch reservado" /> Reservado</li>
          <li><i className="swatch vendido" /> Vendido</li>
        </ul>
      ) : null}

      {lot ? <LotSheet lot={lot} onClose={() => setSelected(null)} /> : null}
    </main>
  )
}

function LotSheet({ lot, onClose }: { lot: HavLot; onClose: () => void }) {
  const priced = showsPrice(lot)
  const hasFinance = priced && lot.anticipo_usd != null && lot.cuotas != null && lot.cuota_usd != null
  return (
    <aside className="sheet" role="dialog" aria-labelledby="lot-title" data-testid="lot-sheet">
      <div className="sheet-top">
        <div>
          <p className="kicker">Lote</p>
          <h2 id="lot-title">{lot.lote}</h2>
        </div>
        <button className="close" type="button" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="meta">
        <p className="m2" data-testid="lot-m2">
          {formatM2(lot.m2)} m²
        </p>
        <p className={`status status-${lot.estado}`} data-testid="lot-status">
          {statusLabel(lot.estado)}
        </p>
      </div>
      {lot.etiqueta ? <p className="tag">{lot.etiqueta}</p> : null}
      {lot.laguna && !lot.etiqueta ? <p className="tag">Laguna</p> : null}

      <div className="price-block">
        <p className="kicker">{priced ? "Contado" : "Precio"}</p>
        <p className="price" data-testid="lot-price">
          {priced ? formatUsd(lot.precio_contado_usd as number) : "Consultar"}
        </p>
      </div>
      {hasFinance ? (
        <div className="price-block finance">
          <p className="kicker">Financiación</p>
          <p>{formatUsd(lot.anticipo_usd as number)} de anticipo</p>
          <p data-testid="lot-finance">
            {lot.cuotas} cuotas de {formatUsd(lot.cuota_usd as number)}
          </p>
        </div>
      ) : null}
      <a className="wa" href={whatsappLink(lot.lote)} target="_blank" rel="noreferrer">
        Consultar por WhatsApp
      </a>
      <p className="contact-line">{havContact.phone}</p>
    </aside>
  )
}
