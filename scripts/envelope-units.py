"""Cierra la huella de las unidades cóncavas (404 y las del mismo tipo) hasta el
rectángulo de sus ambientes, sin invadir el pasillo, el núcleo ni otra unidad.
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

spec = importlib.util.spec_from_file_location("tf", ROOT / "scripts/trace-footprints.py")
tf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tf)

# Departamentos cuyo contorno serpenteaba: el estar/baño queda dentro del
# rectángulo de la unidad en vez de un puente diagonal hacia el núcleo.
TARGETS = {("04", "404"), ("06", "603"), ("07", "703"), ("08", "803")}


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


def blocked_rooms(rooms: list[dict]) -> set[int]:
    spine = max(rooms, key=lambda room: (room["deg"], room["elong"], room["area"]))
    if not (spine["deg"] >= 7 or (spine["deg"] >= 6 and spine["elong"] >= 2.0 and spine["area"] >= 8000)):
        return set()
    chosen = {spine["id"]}
    west_candidates = [room for room in rooms if room["cx"] < spine["cx"] and room["area"] >= 8000 and room["id"] != spine["id"]]
    if not west_candidates:
        return chosen
    west = max(west_candidates, key=lambda room: room["area"])
    stairs = [
        room
        for room in rooms
        if room["id"] not in (spine["id"], west["id"])
        and 2000 <= room["area"] <= 5200
        and room["elong"] < 1.25
        and room["deg"] >= 4
        and west["id"] in room["neigh"]
    ]
    if stairs:
        chosen.add(min(stairs, key=lambda room: room["area"])["id"])
    return chosen


def envelope(code: str, rooms: list[dict], blocked: set[int], polygons: dict, height: int, width: int) -> list[list[float]]:
    members = [
        room
        for room in rooms
        if room["id"] not in blocked and pip(room["cx"] / width, room["cy"] / height, polygons[code])
    ]
    if len(members) < 2:
        raise SystemExit(f"{code} sin ambientes para cerrar")
    mask = np.zeros((height, width), np.uint8)
    for room in members:
        ys, xs = np.where(room["mask"])
        mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1] = 1
    member_ids = {room["id"] for room in members}
    forbid = np.zeros((height, width), np.uint8)
    for room in rooms:
        if room["id"] not in member_ids:
            forbid[room["mask"]] = 1
    forbid = cv2.dilate(forbid, np.ones((5, 5), np.uint8))
    mask[forbid > 0] = 0
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    if count <= 1:
        raise SystemExit(f"{code} sin envolvente")
    keep = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    mask = (labels == keep).astype(np.uint8)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    outline = max(contours, key=cv2.contourArea)
    eps = 1.6
    approx = cv2.approxPolyDP(outline, eps, True)
    while len(approx) > 60 and eps < 5:
        eps *= 1.15
        approx = cv2.approxPolyDP(outline, eps, True)
    points = [[round(float(p[0]) / width, 4), round(float(p[1]) / height, 4)] for p in approx[:, 0, :]]
    if any(pip(room["cx"] / width, room["cy"] / height, points) for room in rooms if room["id"] in blocked):
        raise SystemExit(f"{code} se comió el pasillo o el núcleo")
    for room in members:
        if not pip(room["cx"] / width, room["cy"] / height, points):
            raise SystemExit(f"{code} perdió el ambiente {room['id']}")
    print(f"  {code} ambientes {[room['id'] for room in members]} pts {len(points)}")
    return points


def main() -> None:
    data = json.loads(DATA.read_text())
    units = [unit for unit in data["units"] if unit.get("tipo") in ("departamento", "local") and unit.get("m2")]
    by_floor: dict[str, list] = {}
    for unit in units:
        by_floor.setdefault(unit["planta"], []).append(unit)

    for floor, code in sorted(TARGETS):
        path = PLANTAS / f"planta-{floor}.webp"
        rgb = cv2.cvtColor(cv2.imread(str(path)), cv2.COLOR_BGR2RGB)
        height, width = rgb.shape[:2]
        rooms = tf.segment(rgb)
        blocked = blocked_rooms(rooms)
        print(floor, "núcleo", sorted(blocked))
        data["polygons"][floor][code] = envelope(code, rooms, blocked, data["polygons"][floor], height, width)
        areas = {unit["codigo"]: shoelace(data["polygons"][floor][unit["codigo"]]) for unit in by_floor[floor]}
        total_area = sum(areas.values()) or 1
        total_m2 = sum(unit["m2"] for unit in by_floor[floor]) or 1
        for unit in by_floor[floor]:
            ratio = (areas[unit["codigo"]] / total_area) / (unit["m2"] / total_m2)
            poly = data["polygons"][floor][unit["codigo"]]
            box_w = max(p[0] for p in poly) - min(p[0] for p in poly)
            box_h = max(p[1] for p in poly) - min(p[1] for p in poly)
            if abs(ratio - 1) > 0.45 or box_w >= 0.45 or box_h >= 0.55:
                raise SystemExit(f"{unit['codigo']} fuera de rango {ratio:.3f} {box_w:.3f}x{box_h:.3f}")
            if unit["codigo"] == code:
                print(f"    ratio {ratio:.3f} {box_w:.3f}x{box_h:.3f}")

    if "--write" in sys.argv:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        print("escrito", DATA)
    else:
        print("dry-run")


if __name__ == "__main__":
    main()
