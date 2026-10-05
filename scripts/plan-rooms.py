"""Huellas de los pisos 3 a 9 como unión de ambientes del plano.

La losa sale del muro exterior (el casco de la madera interior), no de las
huellas. Cada ambiente se asigna con el mapa de 1cd178d y entra entero.
El m² publicado no mueve la geometría.
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/lib/demo/pol-data.json"
PLANTAS = ROOT / "public/demo/pol/plantas"
FIX = ROOT / "tests/fixtures/plates"
FLOORS = ["03", "04", "05", "06", "07", "08", "09"]
PX = 495.6584659913169

spec = importlib.util.spec_from_file_location("tf", ROOT / "scripts/trace-footprints.py")
tf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tf)


def load_mapping() -> dict:
    raw = subprocess.check_output(["git", "show", "1cd178d:src/lib/demo/pol-data.json"])
    return json.loads(raw)["polygons"]


def point_in(x: float, y: float, poly: list) -> bool:
    inside = False
    j = len(poly) - 1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        den = (yj - yi) or 1e-12
        if ((yi > y) != (yj > y)) and x < (xj - xi) * (y - yi) / den + xi:
            inside = not inside
        j = i
    return inside


def raster(points: list, width: int, height: int) -> np.ndarray:
    """Even-odd, igual que el test de la losa. fillPoly rellena el puente entre alas."""
    mask = np.zeros((height, width), np.uint8)
    if len(points) < 3:
        return mask
    poly = [(int(round(x * width)), int(round(y * height))) for x, y in points]
    n = len(poly)
    for y in range(height):
        crossings = []
        for index in range(n):
            x1, y1 = poly[index]
            x2, y2 = poly[(index + 1) % n]
            if y1 == y2:
                continue
            if (y1 <= y < y2) or (y2 <= y < y1):
                crossings.append(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
        crossings.sort()
        for index in range(0, len(crossings) - 1, 2):
            start = int(np.ceil(crossings[index]))
            end = int(np.floor(crossings[index + 1]))
            if start < 0:
                start = 0
            if end >= width:
                end = width - 1
            # Un cruce de ida y vuelta (puente entre alas) no pinta una columna.
            if start < end:
                mask[y, start : end + 1] = 1
    return mask


def grow_into(masks: dict[str, np.ndarray], free: np.ndarray, steps: int) -> None:
    """Los muros interiores entran en la unidad que ya tocan. No pisan el núcleo."""
    for mask in masks.values():
        free[mask > 0] = 0
    for _ in range(steps):
        progress = False
        for mask in masks.values():
            grow = cv2.dilate(mask, np.ones((3, 3), np.uint8))
            grow[free == 0] = 0
            gained = (grow > 0) & (mask == 0)
            if not np.any(gained):
                continue
            mask[gained] = 1
            free[gained] = 0
            progress = True
        if not progress:
            return


def channels(image: np.ndarray):
    blue, green, red = [band.astype(np.int16) for band in cv2.split(image)]
    lum = (red + green + blue) / 3.0
    chroma = np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue)
    return red, green, blue, lum, chroma


def wood_mask(red, green, blue) -> np.ndarray:
    return ((red > 100) & ((red - blue) > 24) & (blue < 215) & (red > green - 6)).astype(np.uint8)


def envelope_of(image: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Interior del muro exterior. No mira las huellas.

    Cierra la madera del departamento (puertas angostas) y se queda con el
    casco grande. Los huecos de ese casco son baños y pozos, no la calle.
    Terrazas y jardineras quedan en componentes chicos, afuera.
    """
    red, green, blue, lum, chroma = channels(image)
    wood = wood_mask(red, green, blue)
    closed = cv2.morphologyEx(wood, cv2.MORPH_CLOSE, np.ones((13, 13), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(closed, 8)
    if count <= 1:
        raise SystemExit("sin casco")
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    hull = (labels == biggest).astype(np.uint8) * 255
    inverse = cv2.bitwise_not(hull)
    flood = inverse.copy()
    pad = np.zeros((inverse.shape[0] + 2, inverse.shape[1] + 2), np.uint8)
    cv2.floodFill(flood, pad, (0, 0), 0)
    # Los huecos chicos son baños y el pozo. La terraza sur es un hueco grande y queda afuera.
    holes = np.zeros_like(hull)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(flood, 8)
    for index in range(1, count):
        if int(stats[index, cv2.CC_STAT_AREA]) <= 6000:
            holes[labels == index] = 255
    hull = cv2.bitwise_or(hull, holes)
    green = ((green > red + 18) & (green > blue + 8) & (green > 70)).astype(np.uint8)
    white = ((chroma < 48) & (lum > 125) & (lum < 250) & (green == 0)).astype(np.uint8)
    floor = (((wood > 0) | (white > 0)) & (hull > 0) & (green == 0)).astype(np.uint8)
    return hull, floor, (lum < 24).astype(np.uint8)


def shaft_mask(dark: np.ndarray, hull: np.ndarray) -> np.ndarray:
    raw = cv2.morphologyEx(((dark > 0) & (hull > 0)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(raw, 8)
    shaft = np.zeros_like(raw)
    for index in range(1, count):
        area = int(stats[index, cv2.CC_STAT_AREA])
        height = int(stats[index, cv2.CC_STAT_HEIGHT])
        width = int(stats[index, cv2.CC_STAT_WIDTH])
        if 700 < area < 22000 and height < 240 and width < 220:
            shaft[labels == index] = 1
    return shaft


def signed_area(points: list) -> float:
    area = 0.0
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        area += x1 * y2 - x2 * y1
    return area / 2


def simplify(outline: np.ndarray, width: int, height: int) -> list[list[float]]:
    epsilon = 0.7
    approx = cv2.approxPolyDP(outline, epsilon, True)
    while len(approx) > 240 and epsilon < 1.8:
        epsilon *= 1.12
        approx = cv2.approxPolyDP(outline, epsilon, True)
    if len(approx) < 4:
        return []
    points = [[round(float(point[0]) / width, 5), round(float(point[1]) / height, 5)] for point in approx[:, 0, :]]
    if signed_area(points) < 0:
        points.reverse()
    return points


def ring_of(mask: np.ndarray, safe: np.ndarray, width: int, height: int) -> list[list[float]]:
    """Contorno del ambiente. Los huecos que se salen del casco se recortan."""
    contours, hier = cv2.findContours((mask > 0).astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hier is None or not contours:
        return []
    hier = hier[0]
    outers = [index for index, row in enumerate(hier) if row[3] == -1]
    if not outers:
        return []
    outer_index = max(outers, key=lambda index: cv2.contourArea(contours[index]))
    ring = simplify(contours[outer_index], width, height)
    if len(ring) < 4:
        return []
    child = int(hier[outer_index][2])
    holes = []
    while child != -1:
        hole_mask = np.zeros_like(mask)
        cv2.drawContours(hole_mask, [contours[child]], -1, 1, thickness=cv2.FILLED)
        escapes = int(((hole_mask > 0) & (safe == 0)).sum())
        if escapes > 0:
            hole = simplify(contours[child], width, height)
            if len(hole) >= 4:
                holes.append(hole)
        child = int(hier[child][0])
    for hole in holes:
        ring = stitch([ring, hole])
    return ring


def stitch(rings: list[list[list[float]]]) -> list[list[float]]:
    ring = rings[0]
    for extra in rings[1:]:
        best = None
        for index, point in enumerate(ring):
            for other_index, other in enumerate(extra):
                dist = (point[0] - other[0]) ** 2 + (point[1] - other[1]) ** 2
                if best is None or dist < best[0]:
                    best = (dist, index, other_index)
        _, index, other_index = best
        ring = ring[index:] + ring[:index]
        extra = extra[other_index:] + extra[:other_index]
        ring = ring + [ring[0], extra[0]] + extra + [extra[0], ring[0]]
    return ring


def contour(mask: np.ndarray, safe: np.ndarray, width: int, height: int) -> list[list[float]]:
    count, labels, stats, _ = cv2.connectedComponentsWithStats((mask > 0).astype(np.uint8), 8)
    rings = []
    for index in range(1, count):
        if int(stats[index, cv2.CC_STAT_AREA]) < 450:
            continue
        part = np.zeros_like(mask)
        part[labels == index] = 1
        ring = ring_of(part, safe, width, height)
        if len(ring) >= 4:
            rings.append((int(stats[index, cv2.CC_STAT_AREA]), ring))
    if not rings:
        return []
    rings.sort(key=lambda item: -item[0])
    if len(rings) == 1:
        return rings[0][1]
    return stitch([ring for _, ring in rings])


def nearest_safe(dist: np.ndarray, ix: int, iy: int, width: int, height: int) -> tuple[int, int]:
    y0, y1 = max(0, iy - 8), min(height, iy + 9)
    x0, x1 = max(0, ix - 8), min(width, ix + 9)
    window = dist[y0:y1, x0:x1]
    local_y, local_x = np.unravel_index(int(np.argmin(window)), window.shape)
    return int(local_x + x0), int(local_y + y0)


def tuck(points: list[list[float]], safe: np.ndarray, width: int, height: int) -> list[list[float]]:
    """Corre adentro los vértices que pisan fuera del casco."""
    if len(points) < 4:
        return points
    pts = [list(point) for point in points]
    dist = cv2.distanceTransform((safe == 0).astype(np.uint8), cv2.DIST_L2, 3)
    for _ in range(6):
        filled = raster(pts, width, height)
        spill = ((filled > 0) & (safe == 0)).astype(np.uint8)
        if int(spill.sum()) == 0:
            return pts
        halo = cv2.dilate(spill, np.ones((11, 11), np.uint8))
        moved = False
        for index, (x, y) in enumerate(pts):
            ix = min(width - 1, max(0, int(round(x * width))))
            iy = min(height - 1, max(0, int(round(y * height))))
            if halo[iy, ix] == 0 and dist[iy, ix] == 0:
                continue
            tx, ty = nearest_safe(dist, ix, iy, width, height)
            if dist[ty, tx] >= dist[iy, ix] and dist[iy, ix] == 0:
                continue
            nx = ix + int(np.clip(tx - ix, -2, 2))
            ny = iy + int(np.clip(ty - iy, -2, 2))
            if (nx, ny) == (ix, iy):
                continue
            pts[index] = [round(nx / width, 5), round(ny / height, 5)]
            moved = True
        if not moved:
            break
    return pts


def shave(points: list[list[float]], safe: np.ndarray, width: int, height: int) -> list[list[float]]:
    """Saca los últimos pixeles de afuera moviendo un vértice 1 px."""
    pts = [list(point) for point in points]
    for _ in range(16):
        filled = raster(pts, width, height)
        spill = (filled > 0) & (safe == 0)
        count = int(spill.sum())
        if count == 0 or not pts:
            return pts
        ys, xs = np.where(spill)
        best = None
        for index, (x, y) in enumerate(pts):
            ix = int(round(x * width))
            iy = int(round(y * height))
            dist = int(np.min((xs - ix) ** 2 + (ys - iy) ** 2))
            if best is None or dist < best[0]:
                best = (dist, index, ix, iy)
        _, index, ix, iy = best
        base = int(filled.sum())
        improved = None
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            trial = [list(point) for point in pts]
            trial[index] = [round((ix + dx) / width, 5), round((iy + dy) / height, 5)]
            trial_fill = raster(trial, width, height)
            trial_spill = int(((trial_fill > 0) & (safe == 0)).sum())
            if trial_spill < count and int(trial_fill.sum()) >= base - 80:
                if improved is None or trial_spill < improved[0]:
                    improved = (trial_spill, trial)
        if improved is None:
            break
        pts = improved[1]
    return pts


def border(mask: np.ndarray) -> int:
    kernel = np.ones((5, 5), np.uint8)
    return int((cv2.dilate(mask.astype(np.uint8), kernel) > 0).sum())


def assign_floor(floor: str, mapping: dict) -> dict:
    image = cv2.imread(str(PLANTAS / f"planta-{floor}.webp"))
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    height, width = rgb.shape[:2]
    hull, floor_px, dark = envelope_of(image)
    rooms = tf.segment(rgb)
    blocked = tf.corridor_ids(rooms)
    shaft = shaft_mask(dark, hull)
    # La escalera de 404 son huellas de ~2000 px al oeste del pozo, no un estar.
    stair = np.zeros_like(shaft)
    if np.any(shaft):
        rect_x, rect_y, rect_w, rect_h = cv2.boundingRect((shaft > 0).astype(np.uint8))
        band = np.zeros_like(shaft)
        band[max(0, rect_y - 6) : min(height, rect_y + rect_h + 10), max(0, rect_x - 46) : rect_x + 4] = 1
        local = ((floor_px > 0) & (band > 0) & (shaft == 0)).astype(np.uint8)
        count, labels, stats, _ = cv2.connectedComponentsWithStats(local, 8)
        best = None
        for index in range(1, count):
            area = int(stats[index, cv2.CC_STAT_AREA])
            if 1200 <= area <= 4200:
                score = abs(area - 2100)
                if best is None or score < best[0]:
                    best = (score, index)
        if best is not None:
            stair[labels == best[1]] = 1
    core = np.zeros_like(shaft)
    for room in rooms:
        if room["id"] in blocked:
            core[room["mask"]] = 1
    core[shaft > 0] = 1
    core[stair > 0] = 1
    core = cv2.dilate(core, np.ones((3, 3), np.uint8))
    core[hull == 0] = 0

    fills = {code: raster(points, width, height) for code, points in mapping[floor].items() if isinstance(points, list)}
    owned: dict[str, list] = {code: [] for code in fills}
    pending = []
    for room in rooms:
        if room["id"] in blocked:
            continue
        inside = int((room["mask"] & (hull > 0)).sum())
        if inside < 0.55 * room["area"]:
            continue
        scores = []
        for code, mask in fills.items():
            overlap = int((room["mask"] & (mask > 0)).sum())
            if overlap:
                scores.append((overlap, code))
        scores.sort(reverse=True)
        if scores and scores[0][0] >= 200:
            owned[scores[0][1]].append(room)
        else:
            pending.append(room)

    def claim(room, code: str) -> None:
        owned.setdefault(code, []).append(room)

    changed = True
    while changed and pending:
        changed = False
        still = []
        for room in pending:
            votes: dict[str, int] = {}
            for code, members in owned.items():
                for other in members:
                    if room["id"] in other["neigh"] or other["id"] in room["neigh"]:
                        votes[code] = votes.get(code, 0) + min(room["area"], other["area"])
            if not votes:
                still.append(room)
                continue
            claim(room, max(votes, key=votes.get))
            changed = True
        pending = still

    centroids = {}
    for code, mask in fills.items():
        ys, xs = np.where(mask > 0)
        if len(xs):
            centroids[code] = (float(xs.mean()), float(ys.mean()))
    for room in pending:
        if not centroids:
            continue
        code = min(centroids, key=lambda item: (centroids[item][0] - room["cx"]) ** 2 + (centroids[item][1] - room["cy"]) ** 2)
        claim(room, code)

    masks = {code: np.zeros((height, width), np.uint8) for code in owned}
    for code, members in owned.items():
        for room in members:
            masks[code][room["mask"]] = 1
    # Baños blancos enteros, pegados a una sola unidad.
    red, green, blue, lum, chroma = channels(image)
    white = ((chroma < 48) & (lum > 125) & (lum < 250) & (hull > 0)).astype(np.uint8)
    white[core > 0] = 0
    for mask in masks.values():
        white[mask > 0] = 0
    count, labels, stats, _ = cv2.connectedComponentsWithStats(white, 8)
    for index in range(1, count):
        if int(stats[index, cv2.CC_STAT_AREA]) < 180:
            continue
        blob = (labels == index).astype(np.uint8)
        touches = []
        halo = cv2.dilate(blob, np.ones((7, 7), np.uint8))
        for code, mask in masks.items():
            shared = int((halo & mask).sum())
            if shared:
                touches.append((shared, code))
        if len(touches) == 1:
            masks[touches[0][1]][blob > 0] = 1

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # El piso suelto y, después, los muros (también los oscuros) hasta el casco.
    # El pozo y la escalera no se reparten.
    grow_into(masks, ((floor_px > 0) & (core == 0)).astype(np.uint8), 6)
    grow_into(masks, ((hull > 0) & (core == 0) & (stair == 0) & (shaft == 0)).astype(np.uint8), 22)
    near_shaft = cv2.dilate(shaft, np.ones((7, 7), np.uint8))
    for code, mask in masks.items():
        mask[core > 0] = 0
        mask[shaft > 0] = 0
        mask[stair > 0] = 0
        mask[hull == 0] = 0
        if code in {"303", "305", "404", "902"}:
            mask[near_shaft > 0] = 0
            mask[cv2.dilate(stair, np.ones((3, 3), np.uint8)) > 0] = 0
    polygons = {}
    for code, mask in list(masks.items()):
        if code not in mapping[floor]:
            continue
        others = np.zeros_like(mask)
        for other, other_mask in masks.items():
            if other != code:
                others[other_mask > 0] = 1
        mask[others > 0] = 0
        safe = ((hull > 0) & (core == 0) & (others == 0)).astype(np.uint8)
        mask[safe == 0] = 0
        points = contour(mask, safe, width, height)
        if len(points) < 4:
            raise SystemExit(f"{floor} {code} sin contorno")
        points = tuck(points, safe, width, height)
        for _ in range(5):
            filled = raster(points, width, height)
            spill = ((filled > 0) & (safe == 0)).astype(np.uint8)
            if int(spill.sum()) == 0:
                break
            clipped = ((filled > 0) & (safe > 0)).astype(np.uint8)
            clipped[cv2.dilate(spill, np.ones((3, 3), np.uint8)) > 0] = 0
            redrawn = contour(clipped, safe, width, height)
            if len(redrawn) < 4:
                break
            candidate = tuck(redrawn, safe, width, height)
            after = raster(candidate, width, height)
            after_spill = int(((after > 0) & (safe == 0)).sum())
            if after_spill >= int(spill.sum()) or int(after.sum()) < int(filled.sum()) * 0.97:
                break
            points = candidate
        points = shave(points, safe, width, height)
        masks[code] = mask
        polygons[code] = points

    slab = (hull > 0).astype(np.uint8) * 255
    return {
        "polygons": polygons,
        "slab": slab,
        "core": (core > 0).astype(np.uint8) * 255,
        "image": image,
        "masks": masks,
        "shaft": int(shaft.sum()),
        "stair": int(stair.sum()),
        "hull": hull,
        "floor_px": floor_px,
    }


def partial_rooms(result: dict, rgb: np.ndarray) -> list[str]:
    rooms = tf.segment(rgb)
    height, width = rgb.shape[:2]
    notes = []
    for room in rooms:
        if room["area"] < 400:
            continue
        interior = cv2.erode(room["mask"].astype(np.uint8), np.ones((3, 3), np.uint8))
        interior[(result["core"] > 0)] = 0
        total = int(interior.sum())
        if total < 80:
            continue
        covered = 0
        for mask in result["masks"].values():
            covered += int(((interior > 0) & (mask > 0)).sum())
        ratio = covered / total
        if 0.08 < ratio < 0.92:
            notes.append(f"{room['id']}:{ratio:.2f}")
    return notes


def coverage(result: dict) -> float:
    space = (result["slab"] > 0) & (result["core"] == 0)
    covered = np.zeros(space.shape, np.uint8)
    for mask in result["masks"].values():
        covered[mask > 0] = 1
    area = int(space.sum()) or 1
    return int((space & (covered > 0)).sum()) / area


def draw(floor: str, result: dict, path: Path) -> None:
    image = result["image"].copy()
    height, width = image.shape[:2]
    colors = {
        "1": (60, 90, 220),
        "2": (50, 170, 70),
        "3": (40, 170, 210),
        "4": (210, 150, 40),
        "5": (180, 60, 180),
        "6": (40, 180, 170),
    }
    for code, points in result["polygons"].items():
        array = np.array([[[int(x * width), int(y * height)]] for x, y in points], np.int32)
        tint = colors.get(code[-1], (160, 160, 160))
        overlay = image.copy()
        cv2.fillPoly(overlay, [array], tint)
        image = cv2.addWeighted(overlay, 0.45, image, 0.55, 0)
        cv2.polylines(image, [array], True, (255, 255, 255), 2)
        cx = int(np.mean([point[0] for point in points]) * width)
        cy = int(np.mean([point[1] for point in points]) * height)
        cv2.putText(image, code, (cx - 24, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(image, code, (cx - 24, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1, cv2.LINE_AA)
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), image)


def main() -> None:
    mapping = load_mapping()
    data = json.loads(DATA.read_text())
    preview = Path("/tmp/plan-rooms")
    for floor in FLOORS:
        result = assign_floor(floor, mapping)
        share = coverage(result)
        rgb = cv2.cvtColor(result["image"], cv2.COLOR_BGR2RGB)
        height, width = result["image"].shape[:2]
        filled_by_code = {code: raster(points, width, height) for code, points in result["polygons"].items()}
        cut = partial_rooms({**result, "masks": filled_by_code}, rgb)
        space = (result["slab"] > 0) & (result["core"] == 0)
        covered = np.zeros(space.shape, np.uint8)
        outside = core_hit = overlap = 0
        for filled in filled_by_code.values():
            outside += int(((filled > 0) & (result["slab"] == 0)).sum())
            core_hit += int(((filled > 0) & (result["core"] > 0)).sum())
            overlap += int(((filled > 0) & (covered > 0)).sum())
            covered[filled > 0] = 1
        poly_share = int((space & (covered > 0)).sum()) / (int(space.sum()) or 1)
        print(
            f"{floor} máscara {share * 100:.1f}% polígono {poly_share * 100:.1f}% "
            f"fuera {outside} núcleo {core_hit} solape {overlap} "
            f"escalera {result['stair']}px cortes {cut[:4]}"
        )
        # Comprueba que el ala oeste sigue en la unidad que ya la tenía.
        if floor in {"04", "05", "06", "07", "08"}:
            code = "406" if floor == "04" else f"{int(floor)}05"
            mask = result["masks"].get(code)
            if mask is not None and mask.any():
                ys, xs = np.where(mask > 0)
                print(f"  {code} centro x {xs.mean() / mask.shape[1]:.3f}")
        for code in ("303", "305", "404", "902"):
            mask = result["masks"].get(code)
            if mask is None:
                continue
            gray = cv2.cvtColor(result["image"], cv2.COLOR_BGR2GRAY)
            shaft_px = (gray < 18) & (cv2.dilate((result["core"] > 0).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0)
            dark = shaft_px & (mask > 0)
            if int(dark.sum()):
                print(f"  {code} sobre el pozo {int(dark.sum())}px")
        draw(floor, result, preview / f"planta-{floor}.jpg")
        if "--write" in sys.argv:
            data["polygons"][floor] = result["polygons"]
            cv2.imwrite(str(FIX / f"slab-{floor}.png"), result["slab"])
            cv2.imwrite(str(FIX / f"core-{floor}.png"), result["core"])
            labels = np.zeros(result["image"].shape[:2], np.uint16)
            blocked = set()
            for room in tf.segment(cv2.cvtColor(result["image"], cv2.COLOR_BGR2RGB)):
                if room["area"] < 400:
                    continue
                # El núcleo ya está en core-0X.png. Acá quedan los ambientes.
                interior = cv2.erode(room["mask"].astype(np.uint8), np.ones((3, 3), np.uint8))
                if int(interior.sum()) < 80:
                    continue
                labels[interior > 0] = int(room["id"]) + 1
            cv2.imwrite(str(FIX / f"rooms-{floor}.png"), labels)
    if "--write" in sys.argv:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        print("escrito", DATA)


if __name__ == "__main__":
    main()
