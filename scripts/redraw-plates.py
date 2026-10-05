"""Pega el estar oeste de las plantas 4 a 8 al departamento con el que comparte muro
y redibuja esa huella (y la 404) siguiendo los ambientes, sin el pasillo ni el núcleo.
"""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/lib/demo/pol-data.json"
PLANTAS = ROOT / "public/demo/pol/plantas"
PREVIEW = Path("/tmp/fp-fix")

spec = importlib.util.spec_from_file_location("tf", ROOT / "scripts/trace-footprints.py")
tf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tf)

COMPASS = [
    ("Norte", 0.0, -1.0),
    ("Norte-Este", 0.7071, -0.7071),
    ("Este", 1.0, 0.0),
    ("Sur-Este", 0.7071, 0.7071),
    ("Sur", 0.0, 1.0),
    ("Sur-Oeste", -0.7071, 0.7071),
    ("Oeste", -1.0, 0.0),
    ("Norte-Oeste", -0.7071, -0.7071),
]


def pip(x: float, y: float, poly: list) -> bool:
    inside = False
    j = len(poly) - 1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi):
            inside = not inside
        j = i
    return inside


def raster(poly: list, height: int, width: int) -> np.ndarray:
    mask = np.zeros((height, width), np.uint8)
    if len(poly) < 3:
        return mask
    pts = np.array([[[int(round(x * width)), int(round(y * height))]] for x, y in poly], np.int32)
    cv2.fillPoly(mask, [pts], 1)
    return mask


def borders(a: np.ndarray, b: np.ndarray) -> int:
    dil = cv2.dilate(a.astype(np.uint8), np.ones((5, 5), np.uint8))
    return int((dil & b.astype(np.uint8)).sum())


def contour_of(mask: np.ndarray, width: int, height: int) -> list[list[float]]:
    contours, _ = cv2.findContours((mask > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return []
    outline = max(contours, key=cv2.contourArea)
    length = cv2.arcLength(outline, True)
    eps = max(1.3, 0.0016 * length)
    approx = cv2.approxPolyDP(outline, eps, True)
    while len(approx) > 64 and eps < 6:
        eps *= 1.25
        approx = cv2.approxPolyDP(outline, eps, True)
    if len(approx) < 4:
        return []
    return [[round(float(p[0]) / width, 4), round(float(p[1]) / height, 4)] for p in approx[:, 0, :]]


def snap(dx: float, dy: float) -> str:
    norm = math.hypot(dx, dy) or 1.0
    dx, dy = dx / norm, dy / norm
    return max(COMPASS, key=lambda item: item[1] * dx + item[2] * dy)[0]


def wood_plate(rgb: np.ndarray) -> np.ndarray:
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    plate = (
        (r > 95) & (r < 235) & (g > 40) & (g < 210) & (b < 170) & ((r - b) > 28) & ((r - g) > 8) & (r > g) & (g > b - 10)
    ).astype(np.uint8)
    return cv2.morphologyEx(plate, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))


def facing_of(rgb: np.ndarray, polygons: dict[str, list]) -> dict[str, str]:
    height, width = rgb.shape[:2]
    plate = wood_plate(rgb)
    ys, xs = np.where(plate > 0)
    if not len(xs):
        return {}
    pcx, pcy = float(xs.mean()), float(ys.mean())
    ring = cv2.dilate(plate, np.ones((5, 5), np.uint8)) - plate
    ring = cv2.dilate(ring, np.ones((9, 9), np.uint8))
    found = {}
    for code, poly in polygons.items():
        if not isinstance(poly, list) or len(poly) < 3 or not isinstance(poly[0], list):
            continue
        mask = raster(poly, height, width)
        edge = (mask > 0) & (ring > 0)
        ey, ex = np.where(edge)
        if len(ex) < 40:
            my, mx = np.where(mask > 0)
            if not len(mx):
                continue
            dx, dy = float(mx.mean()) - pcx, float(my.mean()) - pcy
        else:
            dx, dy = float(ex.mean()) - pcx, float(ey.mean()) - pcy
        found[code] = snap(dx, dy)
    return found


def trim_ends(mask: np.ndarray) -> np.ndarray:
    """Saca la punta fina que se cuela hacia el núcleo, no el cuerpo del departamento."""
    trimmed = mask.copy()
    for axis in (0, 1):
        counts = trimmed.sum(axis=1 if axis == 0 else 0)
        occupied = np.where(counts > 0)[0]
        if len(occupied) < 12:
            continue
        typical = float(np.median(counts[occupied]))
        if typical < 40:
            continue
        for index in occupied:
            if counts[index] >= 0.42 * typical:
                break
            if axis == 0:
                trimmed[index, :] = 0
            else:
                trimmed[:, index] = 0
        for index in occupied[::-1]:
            if counts[index] >= 0.42 * typical:
                break
            if axis == 0:
                trimmed[index, :] = 0
            else:
                trimmed[:, index] = 0
    return trimmed


def paint(mask: np.ndarray, blocked: list[np.ndarray]) -> np.ndarray:
    grown = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    for block in blocked:
        grown[cv2.dilate(block.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) > 0] = 0
    count, labels, stats, _ = cv2.connectedComponentsWithStats((grown > 0).astype(np.uint8))
    if count <= 1:
        return grown
    biggest = float(stats[1:, cv2.CC_STAT_AREA].max())
    keep = np.zeros_like(grown)
    for index in range(1, count):
        if stats[index, cv2.CC_STAT_AREA] >= max(800, 0.15 * biggest):
            keep[labels == index] = 1
    return keep


def fix_floor(floor_key: str, units: list[dict], polygons: dict[str, list]) -> dict[str, list]:
    bgr = cv2.imread(str(PLANTAS / f"planta-{floor_key}.webp"))
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    height, width = rgb.shape[:2]
    rooms = tf.segment(rgb)
    by_id = {room["id"]: room for room in rooms}
    groups: dict[str, set[int]] = {unit["codigo"]: set() for unit in units}
    for room in rooms:
        hits = [code for code, poly in polygons.items() if code in groups and pip(room["cx"] / width, room["cy"] / height, poly)]
        if len(hits) == 1:
            groups[hits[0]].add(room["id"])

    spine = max(rooms, key=lambda room: (room["deg"], room["elong"], room["area"]))
    if not (spine["deg"] >= 7 or (spine["deg"] >= 6 and spine["elong"] >= 2.0)):
        raise SystemExit(f"{floor_key}: no encuentro el pasillo")
    free = [
        room
        for room in rooms
        if room["id"] != spine["id"] and room["area"] >= 8000 and all(room["id"] not in members for members in groups.values())
    ]
    if len(free) != 1:
        raise SystemExit(f"{floor_key}: esperaba un estar libre, hay {[(room['id'], room['area']) for room in free]}")
    west = free[0]
    stairs = [
        room
        for room in rooms
        if room["id"] not in (spine["id"], west["id"])
        and 2000 <= room["area"] <= 5200
        and room["elong"] < 1.25
        and room["deg"] >= 4
        and west["id"] in room["neigh"]
    ]
    scored = []
    for code, members in groups.items():
        touch = sum(borders(west["mask"], by_id[member]["mask"]) for member in members)
        if touch >= 30:
            scored.append((touch, code))
    scored.sort(reverse=True)
    host = scored[0][1]
    print(f"  {floor_key} estar {west['id']} -> {host} borde {scored[0][0]} pasillo {spine['id']} núcleo {[room['id'] for room in stairs]}")

    blocked = [spine["mask"].astype(np.uint8)] + [room["mask"].astype(np.uint8) for room in stairs]
    # La unidad anfitriona suma el estar y pierde el núcleo. 404 se redibuja
    # desde sus ambientes para que el contorno no corte en diagonal.
    targets = {host}
    for code, members in groups.items():
        # Huellas cóncavas (la 404 serpentea) se vuelven a trazar sobre los muros.
        poly = polygons[code]
        mask = raster(poly, height, width)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        outline = max(contours, key=cv2.contourArea)
        hull = cv2.contourArea(cv2.convexHull(outline)) or 1
        if cv2.contourArea(outline) / hull < 0.72:
            targets.add(code)

    updated = {code: [list(point) for point in poly] for code, poly in polygons.items()}
    for code in targets:
        members = set(groups[code])
        if code == host:
            members.add(west["id"])
        for stair in stairs:
            members.discard(stair["id"])
        members.discard(spine["id"])
        mask = np.zeros((height, width), np.uint8)
        for member in members:
            mask[by_id[member]["mask"]] = 1
        mask = paint(mask, blocked)
        contours, _ = cv2.findContours((mask > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            outline = max(contours, key=cv2.contourArea)
            hull = cv2.contourArea(cv2.convexHull(outline)) or 1
            if cv2.contourArea(outline) / hull < 0.75:
                mask = trim_ends(mask)
        points = contour_of(mask, width, height)
        if len(points) < 4:
            raise SystemExit(f"{floor_key} {code} sin contorno")
        updated[code] = points
        print(f"    redibuja {code} ambientes {sorted(members)} pts {len(points)}")

    areas = {unit["codigo"]: tf.shoelace(updated[unit["codigo"]]) for unit in units}
    total_area = sum(areas.values()) or 1
    total_m2 = sum(unit["m2"] for unit in units) or 1
    for unit in units:
        ratio = (areas[unit["codigo"]] / total_area) / (unit["m2"] / total_m2)
        poly = updated[unit["codigo"]]
        box_w = max(p[0] for p in poly) - min(p[0] for p in poly)
        box_h = max(p[1] for p in poly) - min(p[1] for p in poly)
        print(f"    {unit['codigo']} {ratio:.3f} {box_w:.3f}x{box_h:.3f}")
        if box_w >= 0.45 or box_h >= 0.55:
            raise SystemExit(f"{floor_key} {unit['codigo']} demasiado grande {box_w:.2f}x{box_h:.2f}")

    # El estar queda dentro del anfitrión. El pasillo, afuera.
    west_hits = [code for code, poly in updated.items() if pip(west["cx"] / width, west["cy"] / height, poly)]
    if west_hits != [host]:
        raise SystemExit(f"{floor_key} el estar quedó en {west_hits}")
    if any(pip(spine["cx"] / width, spine["cy"] / height, poly) for poly in updated.values()):
        raise SystemExit(f"{floor_key} el pasillo quedó dentro de una unidad")

    PREVIEW.mkdir(parents=True, exist_ok=True)
    vis = rgb.copy()
    rng = np.random.default_rng(3)
    for unit in units:
        color = rng.integers(40, 210, 3).astype(np.float32)
        mask = raster(updated[unit["codigo"]], height, width)
        vis[mask > 0] = (0.5 * vis[mask > 0] + 0.5 * color).astype(np.uint8)
        pts = np.array([[[int(x * width), int(y * height)]] for x, y in updated[unit["codigo"]]], np.int32)
        cv2.polylines(vis, [pts], True, (255, 255, 255), 2)
        ys, xs = np.where(mask)
        if len(xs):
            cv2.putText(vis, unit["codigo"], (int(xs.mean()) - 16, int(ys.mean())), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
    cv2.imwrite(str(PREVIEW / f"{floor_key}.jpg"), cv2.cvtColor(vis, cv2.COLOR_RGB2BGR), [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    return updated


def main() -> None:
    data = json.loads(DATA.read_text())
    by_floor: dict[str, list[dict]] = {}
    for unit in data["units"]:
        if unit.get("tipo") not in ("departamento", "local") or not unit.get("m2"):
            continue
        by_floor.setdefault(unit["planta"], []).append(unit)

    for floor_key in ["04", "05", "06", "07", "08"]:
        data["polygons"][floor_key] = fix_floor(floor_key, by_floor[floor_key], data["polygons"][floor_key])

    print("\n== orientación")
    for floor_key, units in sorted(by_floor.items()):
        path = PLANTAS / f"planta-{floor_key}.webp"
        if not path.exists() or floor_key not in data["polygons"]:
            continue
        rgb = cv2.cvtColor(cv2.imread(str(path)), cv2.COLOR_BGR2RGB)
        labels = facing_of(rgb, data["polygons"][floor_key])
        for unit in data["units"]:
            if unit.get("planta") != floor_key:
                continue
            nxt = labels.get(unit["codigo"])
            if not nxt or nxt == unit.get("orientacion"):
                continue
            print(f"  {unit['codigo']}: {unit.get('orientacion')} -> {nxt}")
            unit["orientacion"] = nxt

    if "--write" in sys.argv:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        print("escrito", DATA)
    else:
        print("dry-run")


if __name__ == "__main__":
    main()
