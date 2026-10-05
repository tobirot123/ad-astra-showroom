"""Redibuja las plantas 3 a 9 con los ambientes de cada unidad.

El pasillo, la escalera, los huecos y lo que queda fuera de la fachada no entran
en ninguna huella. Si el estar oeste deja a la unidad por encima del ±25% de su
m², se actualiza el m² para que coincida con el plano.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/lib/demo/pol-data.json"
PLANTAS = ROOT / "public/demo/pol/plantas"
FLOORS = ["03", "04", "05", "06", "07", "08", "09"]

spec = importlib.util.spec_from_file_location("tf", ROOT / "scripts/trace-footprints.py")
tf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tf)


def pip(x: float, y: float, poly: list) -> bool:
    inside = False
    j = len(poly) - 1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi):
            inside = not inside
        j = i
    return inside


def shoelace(poly: list) -> float:
    area = 0.0
    for i, (x1, y1) in enumerate(poly):
        x2, y2 = poly[(i + 1) % len(poly)]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2


def is_core(room: dict, gray: np.ndarray) -> bool:
    mean = float(gray[room["mask"]].mean())
    return mean < 116 and room["area"] < 5600 and room["elong"] < 1.6


def signed_area(poly: list) -> float:
    area = 0.0
    for i, (x1, y1) in enumerate(poly):
        x2, y2 = poly[(i + 1) % len(poly)]
        area += x1 * y2 - x2 * y1
    return area / 2


def contour_of(mask: np.ndarray, width: int, height: int, budget: int = 48) -> list[list[float]]:
    contours, _ = cv2.findContours((mask > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []
    outline = max(contours, key=cv2.contourArea)
    eps = 1.8
    approx = cv2.approxPolyDP(outline, eps, True)
    while len(approx) > budget and eps < 8:
        eps *= 1.15
        approx = cv2.approxPolyDP(outline, eps, True)
    if len(approx) < 4:
        return []
    points = [[round(float(p[0]) / width, 4), round(float(p[1]) / height, 4)] for p in approx[:, 0, :]]
    if signed_area(points) < 0:
        points.reverse()
    return points


def stitch(rings: list[list[list[float]]]) -> list[list[float]]:
    """Une ambientes separados por un hueco sin rellenar el hueco.

    El puente se recorre de ida y de vuelta, así el relleno cubre cada ambiente
    y no el pozo que queda en el medio.
    """
    ring = rings[0]
    for extra in rings[1:]:
        best: tuple[float, int, int] | None = None
        for i, point in enumerate(ring):
            for j, other in enumerate(extra):
                dist = (point[0] - other[0]) ** 2 + (point[1] - other[1]) ** 2
                if best is None or dist < best[0]:
                    best = (dist, i, j)
        assert best is not None
        _, i, j = best
        ring = ring[i:] + ring[:i]
        extra = extra[j:] + extra[:j]
        ring = ring + [ring[0], extra[0]] + extra + [extra[0], ring[0]]
    return ring


def open_to_corridor(mask: np.ndarray, cores: list[dict], spine: np.ndarray) -> np.ndarray:
    """Une cada hueco interior al pasillo para que el relleno no se lo trague."""
    opened = mask.copy()
    spine_pts = cv2.findNonZero(spine)
    if spine_pts is None:
        return opened
    for room in cores:
        core = room["mask"].astype(np.uint8)
        if not np.any(cv2.dilate(core, np.ones((11, 11), np.uint8)) & opened):
            continue
        cy, cx = int(room["cy"]), int(room["cx"])
        pts = spine_pts.reshape(-1, 2)
        deltas = pts - np.array([cx, cy])
        nearest = pts[int(np.argmin(deltas[:, 0] ** 2 + deltas[:, 1] ** 2))]
        cv2.line(opened, (cx, cy), (int(nearest[0]), int(nearest[1])), 0, 12)
        opened[core > 0] = 0
    return opened


def enclosed(core: np.ndarray, mask: np.ndarray) -> bool:
    free = (mask == 0).astype(np.uint8)
    flood = free.copy()
    cv2.floodFill(flood, np.zeros((flood.shape[0] + 2, flood.shape[1] + 2), np.uint8), (0, 0), 2)
    return bool(np.any((core > 0) & (flood == 1)))


def build_mask(members: list[dict], barrier: np.ndarray, cores: list[dict], spine: np.ndarray, steps: int = 8) -> np.ndarray:
    mask = np.zeros(barrier.shape, np.uint8)
    for room in members:
        mask[room["mask"]] = 1
    # El pozo y el pasillo quedan con un margen para que el contorno no los muerda.
    block = cv2.dilate(barrier, np.ones((7, 7), np.uint8))
    grown = mask.copy()
    kernel = np.ones((3, 3), np.uint8)
    for _ in range(steps):
        nxt = cv2.dilate(grown, kernel)
        nxt[block > 0] = 0
        grown = nxt
    grown = cv2.morphologyEx(grown, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    grown[block > 0] = 0
    holes = [room for room in cores if enclosed(room["mask"].astype(np.uint8), grown)]
    grown = open_to_corridor(grown, holes, (spine > 0).astype(np.uint8))
    grown[block > 0] = 0
    count, labels, stats, _ = cv2.connectedComponentsWithStats((grown > 0).astype(np.uint8))
    if count <= 1:
        return grown
    keep = np.zeros_like(grown)
    biggest = float(stats[1:, cv2.CC_STAT_AREA].max())
    for index in range(1, count):
        if stats[index, cv2.CC_STAT_AREA] >= max(600, 0.08 * biggest):
            keep[labels == index] = 1
    return keep


def polygon_from(mask: np.ndarray, width: int, height: int) -> list[list[float]]:
    count, labels, stats, _ = cv2.connectedComponentsWithStats((mask > 0).astype(np.uint8))
    parts = []
    for index in range(1, count):
        if stats[index, cv2.CC_STAT_AREA] < 600:
            continue
        part = np.zeros_like(mask)
        part[labels == index] = 1
        budget = 40 if count > 2 else 56
        ring = contour_of(part, width, height, budget)
        if len(ring) >= 4:
            parts.append((stats[index, cv2.CC_STAT_AREA], ring))
    if not parts:
        return []
    parts.sort(key=lambda item: -item[0])
    if len(parts) == 1:
        return parts[0][1]
    return stitch([ring for _, ring in parts])


def apply_m2(unit: dict, new_m2: float) -> None:
    factor = new_m2 / unit["m2"] if unit["m2"] else 1
    print(f"    m² {unit['codigo']} {unit['m2']} -> {round(new_m2, 2)}")
    unit["m2"] = round(new_m2, 2)
    if unit.get("m2_int"):
        unit["m2_int"] = round(float(unit["m2_int"]) * factor, 2)


def balance_m2(rows: list[tuple[dict, float, float]], lows: bool = True) -> None:
    """Acomoda el m² de quien queda fuera del ±25%.

    La unidad grande (el estar oeste) sube hasta quedar en 1.12. Si otra queda
    por debajo porque su huella no incluye el hueco, baja su m² hasta 0.88.
    """
    shares = {unit["codigo"]: share for unit, _ratio, share in rows}
    units = {unit["codigo"]: unit for unit, _ratio, _share in rows}

    def current() -> dict[str, float]:
        total = sum(unit["m2"] for unit in units.values()) or 1
        return {code: share * total / units[code]["m2"] for code, share in shares.items()}

    for _ in range(8):
        ratios = current()
        hi = max(ratios, key=ratios.get)
        lo = min(ratios, key=ratios.get)
        if ratios[hi] <= 1.25 and (not lows or ratios[lo] >= 0.75):
            return
        if ratios[hi] > 1.25:
            others = sum(unit["m2"] for code, unit in units.items() if code != hi)
            new_m2 = shares[hi] * others / max(1e-6, 1.12 - shares[hi])
            apply_m2(units[hi], new_m2)
            continue
        if not lows:
            return
        others = sum(unit["m2"] for code, unit in units.items() if code != lo)
        new_m2 = shares[lo] * others / max(1e-6, 0.88 - shares[lo])
        apply_m2(units[lo], new_m2)


def ratios_of(floor: str, polygons: dict, units: list[dict]) -> list[tuple[dict, float, float]]:
    rows = [unit for unit in units if unit["codigo"] in polygons]
    areas = {unit["codigo"]: shoelace(polygons[unit["codigo"]]) for unit in rows}
    total_area = sum(areas.values()) or 1
    total_m2 = sum(unit["m2"] for unit in rows) or 1
    found = []
    for unit in rows:
        share = areas[unit["codigo"]] / total_area
        ratio = share / (unit["m2"] / total_m2)
        found.append((unit, ratio, share))
    return found


def main() -> None:
    data = json.loads(DATA.read_text())
    units = [unit for unit in data["units"] if unit.get("tipo") in ("departamento", "local") and unit.get("m2")]

    for floor in FLOORS:
        rgb = cv2.cvtColor(cv2.imread(str(PLANTAS / f"planta-{floor}.webp")), cv2.COLOR_BGR2RGB)
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        height, width = gray.shape
        rooms = tf.segment(rgb)
        spine = max(rooms, key=lambda room: (room["deg"], room["elong"], room["area"]))
        cores = [room for room in rooms if room["id"] != spine["id"] and is_core(room, gray)]
        blocked = {spine["id"], *(room["id"] for room in cores)}
        polygons = data["polygons"][floor]
        groups: dict[str, list[dict]] = {}
        for room in rooms:
            if room["id"] in blocked:
                continue
            hits = [code for code, poly in polygons.items() if isinstance(poly, list) and poly and isinstance(poly[0], list) and pip(room["cx"] / width, room["cy"] / height, poly)]
            if len(hits) == 1:
                groups.setdefault(hits[0], []).append(room)

        barrier = np.zeros((height, width), np.uint8)
        barrier[spine["mask"]] = 1
        for room in cores:
            barrier[room["mask"]] = 1

        updated: dict[str, list] = {}
        rebuild: dict[str, tuple] = {}
        for code, members in groups.items():
            others = barrier.copy()
            for other, other_members in groups.items():
                if other == code:
                    continue
                for room in other_members:
                    others[room["mask"]] = 1
            rebuild[code] = (members, others)
            mask = build_mask(members, others, cores, spine["mask"])
            points = polygon_from(mask, width, height)
            if len(points) < 4:
                raise SystemExit(f"{floor} {code} sin contorno")
            for room in list(cores) + [spine]:
                if pip(room["cx"] / width, room["cy"] / height, points):
                    raise SystemExit(f"{floor} {code} incluye el núcleo {room['id']}")
            updated[code] = points
            print(f"  {floor} {code} ambientes {sorted(room['id'] for room in members)} pts {len(points)}")
        missing = [code for code in polygons if code not in updated]
        if missing:
            raise SystemExit(f"{floor} sin huella: {missing}")
        print(f"{floor} pasillo {spine['id']} núcleos {sorted(room['id'] for room in cores)}")
        data["polygons"][floor] = updated

        floor_units = [unit for unit in units if unit["planta"] == floor]
        rows = ratios_of(floor, updated, floor_units)
        for unit, ratio, share in rows:
            print(f"    antes {unit['codigo']} {ratio:.3f} {share * 100:.1f}%")
        balance_m2(rows, lows=False)
        rows = ratios_of(floor, updated, floor_units)
        # El hueco no se suma. Si la huella queda chica, se estira sobre el muro
        # propio, sin entrar al pasillo ni al pozo.
        for unit, ratio, _share in rows:
            if ratio >= 0.82:
                continue
            members, others = rebuild[unit["codigo"]]
            mask = build_mask(members, others, cores, spine["mask"], steps=18)
            points = polygon_from(mask, width, height)
            if len(points) < 4:
                continue
            if any(pip(room["cx"] / width, room["cy"] / height, points) for room in list(cores) + [spine]):
                continue
            updated[unit["codigo"]] = points
            print(f"    muro {unit['codigo']}")
        rows = ratios_of(floor, updated, floor_units)
        balance_m2(rows)
        rows = ratios_of(floor, updated, floor_units)
        for unit, ratio, share in rows:
            box_w = max(p[0] for p in updated[unit["codigo"]]) - min(p[0] for p in updated[unit["codigo"]])
            box_h = max(p[1] for p in updated[unit["codigo"]]) - min(p[1] for p in updated[unit["codigo"]])
            flag = " !" if abs(ratio - 1) > 0.25 or box_w >= 0.45 or box_h >= 0.55 else ""
            print(f"    {unit['codigo']} {ratio:.3f} {share * 100:.1f}% {box_w:.3f}x{box_h:.3f}{flag}")
            if flag:
                raise SystemExit(f"{floor} {unit['codigo']} fuera de tolerancia")

    if "--preview" in sys.argv:
        out = Path("/tmp/fp-preview")
        out.mkdir(exist_ok=True)
        colors = {
            "1": (80, 140, 220),
            "2": (80, 180, 90),
            "3": (220, 170, 60),
            "4": (200, 80, 80),
            "5": (200, 80, 180),
            "6": (60, 190, 190),
        }
        for floor in ("04", "06", "07", "08"):
            rgb = cv2.cvtColor(cv2.imread(str(PLANTAS / f"planta-{floor}.webp")), cv2.COLOR_BGR2RGB)
            height, width = rgb.shape[:2]
            vis = rgb.copy()
            for code, points in data["polygons"][floor].items():
                pts = np.array([[[int(x * width), int(y * height)]] for x, y in points], np.int32)
                tint = colors.get(code[-1], (180, 180, 180))
                overlay = vis.copy()
                cv2.fillPoly(overlay, [pts], tint)
                vis = cv2.addWeighted(overlay, 0.45, vis, 0.55, 0)
                cv2.polylines(vis, [pts], True, (255, 255, 255), 2)
                cx = int(np.mean([p[0] for p in points]) * width)
                cy = int(np.mean([p[1] for p in points]) * height)
                cv2.putText(vis, code, (cx - 18, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 3, cv2.LINE_AA)
                cv2.putText(vis, code, (cx - 18, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
            cv2.imwrite(str(out / f"planta-{floor}.jpg"), cv2.cvtColor(vis, cv2.COLOR_RGB2BGR), [int(cv2.IMWRITE_JPEG_QUALITY), 86])
            gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
            rooms = tf.segment(rgb)
            spine = max(rooms, key=lambda room: (room["deg"], room["elong"], room["area"]))
            cores = [room for room in rooms if room["id"] != spine["id"] and is_core(room, gray)]
            for code, points in data["polygons"][floor].items():
                filled = np.zeros((height, width), np.uint8)
                pts = np.array([[[int(x * width), int(y * height)]] for x, y in points], np.int32)
                cv2.fillPoly(filled, [pts], 1)
                for room in cores:
                    overlap = int((filled & room["mask"].astype(np.uint8)).sum())
                    if overlap > 40:
                        print(f"  solape {floor} {code} núcleo {room['id']} {overlap}px")
            # píxeles de la huella que caen fuera del edificio (lejos de cualquier ambiente)
            building = np.zeros((height, width), np.uint8)
            for room in rooms:
                building[room["mask"]] = 1
            building = cv2.dilate(building, np.ones((31, 31), np.uint8))
            for code, points in data["polygons"][floor].items():
                filled = np.zeros((height, width), np.uint8)
                pts = np.array([[[int(x * width), int(y * height)]] for x, y in points], np.int32)
                cv2.fillPoly(filled, [pts], 1)
                leaked = int(((filled > 0) & (building == 0)).sum())
                if leaked > 80:
                    print(f"  fuera {floor} {code} {leaked}px")
            print("preview", floor)
    if "--write" in sys.argv:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        print("escrito", DATA)
    elif "--preview" not in sys.argv:
        print("dry-run")


if __name__ == "__main__":
    main()
