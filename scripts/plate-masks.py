"""Máscaras de losa, núcleo y ambientes para las plantas 3 a 9.

La losa es el interior de los muros exteriores. El núcleo es el pozo, la
escalera, el hall y el pasillo. Cada huella crece desde la pastilla de la
unidad hasta su m² interior y no sigue hacia la terraza. La planta 2 no se
toca: solo calibra los m² por píxel.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/lib/demo/pol-data.json"
PLANTAS = ROOT / "public/demo/pol/plantas"
FIX = ROOT / "tests/fixtures/plates"
PX_PER_M2 = 495.6584659913169

GAPS = {"03": 37, "04": 17, "05": 21, "06": 21, "07": 21, "08": 21, "09": 37}
FLOORS = ["03", "04", "05", "06", "07", "08", "09"]

# m² interiores de folleto, antes de inflarlos para que entrara el derrame.
BROCHURE_INT = {
    "505": (69.29, 61.4, 26.3),
    "605": (66.65, 61.4, 10.5),
    "705": (66.65, 61.4, 10.5),
    "805": (66.65, 61.4, 10.5),
}


def channels(image: np.ndarray):
    blue, green, red = [band.astype(np.int16) for band in cv2.split(image)]
    lum = (red + green + blue) / 3.0
    chroma = np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue)
    return red, green, blue, lum, chroma


def wood_mask(red: np.ndarray, green: np.ndarray, blue: np.ndarray) -> np.ndarray:
    return ((red > 105) & ((red - blue) > 26) & (red > green - 4) & (blue < 210)).astype(np.uint8)


def build_slab(image: np.ndarray, gap: int) -> np.ndarray:
    """Interior de la fachada: huecos del muro sellado, sin terraza ni jardineras."""
    red, green, blue, lum, chroma = channels(image)
    height, width = lum.shape
    white = (chroma < 54) & (lum > 112) & (lum < 250)
    wood = wood_mask(red, green, blue)
    walls = (white & cv2.dilate(wood, np.ones((11, 11), np.uint8))).astype(np.uint8) * 255
    horizontal = cv2.morphologyEx(walls, cv2.MORPH_CLOSE, np.ones((1, gap), np.uint8))
    vertical = cv2.morphologyEx(walls, cv2.MORPH_CLOSE, np.ones((gap, 1), np.uint8))
    sealed = cv2.dilate(cv2.bitwise_or(horizontal, vertical), np.ones((3, 3), np.uint8))
    dark = ((chroma < 40) & (lum < 46)).astype(np.uint8) * 255
    flood = dark.copy()
    pad = np.zeros((height + 2, width + 2), np.uint8)
    for point in (
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (0, height // 2),
        (width - 1, height // 2),
        (width // 2, height - 1),
    ):
        if flood[point[1], point[0]] == 255:
            cv2.floodFill(flood, pad, point, 128)
    distance = cv2.distanceTransform((flood != 128).astype(np.uint8), cv2.DIST_L2, 5)
    contours, hierarchy = cv2.findContours(sealed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    hierarchy = hierarchy[0]
    outer = max(
        (index for index, row in enumerate(hierarchy) if row[3] == -1),
        key=lambda index: cv2.contourArea(contours[index]),
    )
    slab = np.zeros((height, width), np.uint8)
    child = hierarchy[outer][2]
    while child != -1:
        if cv2.contourArea(contours[child]) >= 500:
            hole = np.zeros((height, width), np.uint8)
            cv2.drawContours(hole, contours, child, 255, -1)
            ys, xs = np.where(hole > 0)
            median = float(np.median(distance[ys, xs])) if len(xs) else 0
            wood_count = int((wood[hole > 0]).sum()) if len(xs) else 0
            if median >= 18 and wood_count >= 180:
                slab[hole > 0] = 255
        child = hierarchy[child][0]
    return slab


def extend_deep_wood(image: np.ndarray, slab: np.ndarray, reach: int, min_dist: float) -> np.ndarray:
    """Suma el piso de madera profundo pegado a la losa (ambiente que el muro no cerró)."""
    red, green, blue, lum, chroma = channels(image)
    height, width = lum.shape
    wood = wood_mask(red, green, blue)
    dark = ((chroma < 40) & (lum < 46)).astype(np.uint8) * 255
    flood = dark.copy()
    pad = np.zeros((height + 2, width + 2), np.uint8)
    for point in (
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (0, height // 2),
        (width - 1, height // 2),
        (width // 2, height - 1),
    ):
        if flood[point[1], point[0]] == 255:
            cv2.floodFill(flood, pad, point, 128)
    distance = cv2.distanceTransform((flood != 128).astype(np.uint8), cv2.DIST_L2, 5)
    near = cv2.dilate(slab, np.ones((reach, reach), np.uint8))
    extra = ((wood > 0) & (slab == 0) & (near > 0) & (distance >= min_dist)).astype(np.uint8) * 255
    extra = cv2.morphologyEx(extra, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    extra = cv2.bitwise_and(extra, cv2.dilate(slab, np.ones((reach, reach), np.uint8)))
    return cv2.bitwise_or(slab, extra)


def build_core(lum: np.ndarray, chroma: np.ndarray, wood: np.ndarray, slab: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Pozo (mancha negra compacta), escalera al oeste, hall y pasillo angosto."""
    height, width = lum.shape
    ys, xs = np.where(wood > 0)
    center_x = float(np.median(xs))
    center_y = float(np.median(ys))
    x0, x1 = int(max(0, center_x - 100)), int(min(width, center_x + 240))
    y0, y1 = int(max(0, center_y - 300)), int(min(height, center_y - 20))
    raw = np.zeros((height, width), np.uint8)
    raw[y0:y1, x0:x1] = ((lum[y0:y1, x0:x1] < 12) & (chroma[y0:y1, x0:x1] < 70)).astype(np.uint8) * 255
    raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    raw = cv2.morphologyEx(raw, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(raw, 8)
    best = None
    for index in range(1, count):
        area = int(stats[index, cv2.CC_STAT_AREA])
        box_w = int(stats[index, cv2.CC_STAT_WIDTH])
        box_h = int(stats[index, cv2.CC_STAT_HEIGHT])
        if area < 1500 or box_h > 180 or box_h < 40:
            continue
        if centroids[index][0] < center_x - 10:
            continue
        score = -abs(area - 5000) - max(0, box_w - 160) * 30
        if best is None or score > best[0]:
            best = (score, index)
    shaft = np.zeros((height, width), np.uint8)
    if best is None:
        print("  sin pozo")
        return shaft, shaft
    shaft[labels == best[1]] = 255
    rect_x, rect_y, rect_w, rect_h = cv2.boundingRect(shaft)
    if rect_w > 160:
        shaft[:, : rect_x + rect_w - 150] = 0
        shaft = cv2.morphologyEx(shaft, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    rect_x, rect_y, rect_w, rect_h = cv2.boundingRect(shaft)
    print(f"  pozo {int((shaft > 0).sum())}px bbox {rect_x},{rect_y} {rect_w}x{rect_h}")
    # La escalera es la franja de losa inmediatamente al oeste del pozo.
    dist_shaft = cv2.distanceTransform((shaft == 0).astype(np.uint8), cv2.DIST_L2, 5)
    stair = np.zeros_like(shaft)
    vertical = np.zeros_like(shaft)
    vertical[max(0, rect_y - 8) : min(height, rect_y + rect_h + 18), :] = 255
    stair[(slab > 0) & (vertical > 0) & (dist_shaft > 2) & (dist_shaft < 48) & (np.indices(shaft.shape)[1] < rect_x + 6)] = 255
    stair = cv2.morphologyEx(stair, cv2.MORPH_CLOSE, np.ones((7, 5), np.uint8))
    stair = cv2.morphologyEx(stair, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    stair = cv2.dilate(stair, np.ones((3, 3), np.uint8))
    hall = np.zeros_like(shaft)
    hall_y1 = min(height, rect_y + rect_h + 36)
    hall[rect_y + rect_h : hall_y1, rect_x + 4 : rect_x + rect_w - 4] = slab[
        rect_y + rect_h : hall_y1, rect_x + 4 : rect_x + rect_w - 4
    ]
    free = ((slab > 0) & (shaft == 0)).astype(np.uint8)
    distance = cv2.distanceTransform(free, cv2.DIST_L2, 5)
    corridor = np.zeros_like(shaft)
    column = rect_x + rect_w // 2
    for step in range(140):
        yy = rect_y + rect_h + 6 + step
        if yy >= height or column >= width or slab[yy, column] == 0:
            break
        half = float(distance[yy, column])
        if step > 16 and half > 16:
            break
        span = int(min(12, max(6, half)))
        corridor[yy, max(0, column - span) : min(width, column + span + 1)] = slab[
            yy, max(0, column - span) : min(width, column + span + 1)
        ]
    core = np.zeros_like(shaft)
    dilated = cv2.dilate(shaft, np.ones((7, 7), np.uint8))
    core[(dilated > 0) | (stair > 0) | (hall > 0) | (corridor > 0)] = 255
    print(
        f"  núcleo {int((core > 0).sum()) / PX_PER_M2:.1f} m² escalera {int((stair > 0).sum()) / PX_PER_M2:.1f} pasillo {int((corridor > 0).sum()) / PX_PER_M2:.1f}"
    )
    return core, shaft


def raster_polygon(points: list, width: int, height: int) -> np.ndarray:
    mask = np.zeros((height, width), np.uint8)
    array = np.array([[[int(round(x * width)), int(round(y * height))]] for x, y in points], np.int32)
    if len(array) >= 3:
        cv2.fillPoly(mask, [array], 255)
    return mask


def point_in_polygon(points: list, x: float, y: float) -> bool:
    inside = False
    last = len(points) - 1
    for index, (xi, yi) in enumerate(points):
        xj, yj = points[last]
        den = (yj - yi) or 1e-12
        if ((yi > y) != (yj > y)) and x < ((xj - xi) * (y - yi)) / den + xi:
            inside = not inside
        last = index
    return inside


def interior_seed(points: list, allowed: np.ndarray) -> tuple[float, float] | None:
    height, width = allowed.shape
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
    samples = []
    for gy in range(1, 25):
        for gx in range(1, 25):
            sx = min_x + (max_x - min_x) * gx / 25
            sy = min_y + (max_y - min_y) * gy / 25
            if point_in_polygon(points, sx, sy):
                samples.append((sx, sy))
    if not samples:
        return None
    sx = sum(point[0] for point in samples) / len(samples)
    sy = sum(point[1] for point in samples) / len(samples)
    if not point_in_polygon(points, sx, sy):
        sx, sy = samples[len(samples) // 2]
    px, py = int(sx * width), int(sy * height)
    px = min(width - 1, max(0, px))
    py = min(height - 1, max(0, py))
    if allowed[py, px]:
        return float(px), float(py)
    ys, xs = np.where(allowed > 0)
    if len(xs) == 0:
        return None
    dist = (xs - px) ** 2 + (ys - py) ** 2
    nearest = int(np.argmin(dist))
    if dist[nearest] > 80 ** 2:
        return None
    return float(xs[nearest]), float(ys[nearest])


def snap_seed(points: list, allowed: np.ndarray, limit: float) -> tuple[float, float] | None:
    seed = interior_seed(points, allowed)
    if seed is not None:
        return seed
    if len(points) < 3:
        return None
    height, width = allowed.shape
    sx = float(np.mean([point[0] for point in points])) * width
    sy = float(np.mean([point[1] for point in points])) * height
    ys, xs = np.where(allowed > 0)
    if len(xs) == 0:
        return None
    dist = (xs - sx) ** 2 + (ys - sy) ** 2
    nearest = int(np.argmin(dist))
    if dist[nearest] > limit ** 2:
        return None
    return float(xs[nearest]), float(ys[nearest])


def floor9_seeds(allowed: np.ndarray, shaft: np.ndarray, codes: list[str]) -> dict[str, tuple[float, float]]:
    """La planta 9 no hereda los polígonos: 902 queda al norte del pozo, no en el hall."""
    height, width = allowed.shape
    if np.any(shaft):
        rect_x, rect_y, rect_w, rect_h = cv2.boundingRect(shaft)
    else:
        rect_x, rect_y, rect_w, rect_h = 1000, 360, 150, 90
    distance = cv2.distanceTransform((allowed > 0).astype(np.uint8), cv2.DIST_L2, 5)
    ys, xs = np.indices((height, width))
    regions = {
        "903": (xs < rect_x - 20) & (ys < rect_y + rect_h + 30),
        "902": (ys < rect_y + 4) & (xs > rect_x - 180) & (xs < rect_x + rect_w // 3),
        "901": (ys > rect_y + rect_h + 30) & (xs < rect_x + 80),
        "904": xs > rect_x + rect_w - 20,
    }
    seeds = {}
    for code in codes:
        mask = (allowed > 0) & regions[code]
        if int(mask.sum()) < 400:
            continue
        score = distance.copy()
        score[~mask] = 0
        if float(score.max()) < 4:
            yy, xx = np.where(mask)
            seeds[code] = (float(xx.mean()), float(yy.mean()))
        else:
            iy, ix = np.unravel_index(int(score.argmax()), score.shape)
            seeds[code] = (float(ix), float(iy))
    return seeds


def quota_assign(allowed: np.ndarray, seeds: dict[str, tuple[float, float]], targets: dict[str, float], gap: int = 13) -> dict[str, np.ndarray]:
    """Crece cada unidad por el piso, cruzando puertas, hasta su m² interior."""
    from collections import deque

    height, width = allowed.shape
    space = cv2.dilate((allowed > 0).astype(np.uint8), np.ones((gap, gap), np.uint8))
    codes = [code for code in seeds if code in targets]
    parts = {code: np.zeros((height, width), np.uint8) for code in codes}
    owner = np.full((height, width), -1, np.int16)
    queues = {code: deque() for code in codes}
    filled = {code: 0 for code in codes}
    code_index = {code: index for index, code in enumerate(codes)}
    ys, xs = np.where(space > 0)
    for code, (sx, sy) in seeds.items():
        if code not in queues or len(xs) == 0:
            continue
        ix = min(width - 1, max(0, int(round(sx))))
        iy = min(height - 1, max(0, int(round(sy))))
        if space[iy, ix] == 0:
            nearest = int(np.argmin((xs - ix) ** 2 + (ys - iy) ** 2))
            ix, iy = int(xs[nearest]), int(ys[nearest])
        queues[code].append((iy, ix))
    neighbors = ((1, 0), (-1, 0), (0, 1), (0, -1))
    while True:
        progressed = False
        for code in codes:
            if filled[code] >= targets[code]:
                queues[code].clear()
                continue
            queue = queues[code]
            while queue:
                y, x = queue.popleft()
                if owner[y, x] >= 0 or space[y, x] == 0:
                    continue
                owner[y, x] = code_index[code]
                if allowed[y, x]:
                    parts[code][y, x] = 1
                    filled[code] += 1
                for dy, dx in neighbors:
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < height and 0 <= nx < width and owner[ny, nx] < 0 and space[ny, nx]:
                        queue.append((ny, nx))
                progressed = True
                break
        if not progressed:
            break
    # Lo que quedó suelto se lo lleva la unidad que todavía no llega a su m².
    free = (allowed > 0) & (owner < 0)
    if np.any(free):
        needy = [code for code in codes if filled[code] < targets[code] * 0.98]
        if needy:
            ys, xs = np.where(free)
            for pixel in range(len(xs)):
                best_code = min(needy, key=lambda code: (xs[pixel] - seeds[code][0]) ** 2 + (ys[pixel] - seeds[code][1]) ** 2)
                if filled[best_code] >= targets[best_code]:
                    needy = [code for code in needy if filled[code] < targets[code]]
                    if not needy:
                        break
                    best_code = min(needy, key=lambda code: (xs[pixel] - seeds[code][0]) ** 2 + (ys[pixel] - seeds[code][1]) ** 2)
                parts[best_code][ys[pixel], xs[pixel]] = 1
                filled[best_code] += 1
    return parts


def ring_of(mask: np.ndarray, width: int, height: int, budget: int) -> list[list[float]]:
    contours, _ = cv2.findContours((mask > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return []
    outline = max(contours, key=cv2.contourArea)
    epsilon = 0.9
    approx = cv2.approxPolyDP(outline, epsilon, True)
    while len(approx) > budget and epsilon < 1.8:
        epsilon *= 1.08
        approx = cv2.approxPolyDP(outline, epsilon, True)
    if len(approx) < 4:
        return []
    points = [[round(float(point[0]) / width, 4), round(float(point[1]) / height, 4)] for point in approx[:, 0, :]]
    area = 0.0
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        area += x1 * y2 - x2 * y1
    if area < 0:
        points.reverse()
    return points


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


def contour_of(mask: np.ndarray, width: int, height: int) -> list[list[float]]:
    count, labels, stats, _ = cv2.connectedComponentsWithStats((mask > 0).astype(np.uint8), 8)
    rings = []
    for index in range(1, count):
        if stats[index, cv2.CC_STAT_AREA] < 280:
            continue
        part = np.zeros_like(mask)
        part[labels == index] = 1
        ring = ring_of(part, width, height, 420)
        if len(ring) >= 4:
            rings.append((int(stats[index, cv2.CC_STAT_AREA]), ring))
    if not rings:
        return []
    rings.sort(key=lambda item: -item[0])
    return rings[0][1]


def link_components(mask: np.ndarray, core: np.ndarray, blockers: np.ndarray) -> np.ndarray:
    """Une los ambientes con un puente que camina por la losa, sin cruzar el núcleo."""
    from collections import deque

    work = (mask > 0).astype(np.uint8)
    corridor = cv2.dilate(work, np.ones((17, 17), np.uint8))
    corridor[(core > 0) | (blockers > 0)] = 0
    corridor[work > 0] = 1
    height, width = work.shape
    neighbors = ((1, 0), (-1, 0), (0, 1), (0, -1))
    for _ in range(8):
        count, labels, stats, _ = cv2.connectedComponentsWithStats(work, 8)
        if count <= 2:
            break
        order = sorted((index for index in range(1, count) if stats[index, cv2.CC_STAT_AREA] >= 200), key=lambda index: -stats[index, cv2.CC_STAT_AREA])
        if len(order) < 2:
            break
        base = order[0]
        target = np.zeros_like(work)
        for index in order[1:]:
            target[labels == index] = 1
        parent = np.full(work.shape, -1, np.int32)
        queue = deque()
        ys, xs = np.where(labels == base)
        for y, x in zip(ys[::3], xs[::3]):
            parent[y, x] = -2
            queue.append((int(y), int(x)))
        found = None
        while queue:
            y, x = queue.popleft()
            if target[y, x]:
                found = (y, x)
                break
            for dy, dx in neighbors:
                ny, nx = y + dy, x + dx
                if ny < 0 or nx < 0 or ny >= height or nx >= width or parent[ny, nx] != -1 or corridor[ny, nx] == 0:
                    continue
                parent[ny, nx] = y * width + x
                queue.append((ny, nx))
        if found is None:
            break
        y, x = found
        while parent[y, x] >= 0:
            work[y, x] = 1
            packed = int(parent[y, x])
            y, x = packed // width, packed % width
        work = cv2.dilate(work, np.ones((3, 3), np.uint8))
        work[(core > 0) | (blockers > 0)] = 0
    return work


def fit_polygon(mask: np.ndarray, slab: np.ndarray, core: np.ndarray, budget: float, blockers: np.ndarray | None = None, erode_px: int = 3) -> tuple[list[list[float]], np.ndarray]:
    """Contorno de la unión de ambientes. El relleno no sale de la losa ni pisa el núcleo."""
    height, width = slab.shape
    blocked = np.zeros_like(mask) if blockers is None else blockers
    linked = link_components(((mask > 0) & (core == 0)).astype(np.uint8), core, blocked)
    # El puente es muro interior: entra en la losa.
    halo = cv2.dilate(linked, np.ones((5, 5), np.uint8))
    grown = cv2.bitwise_or(slab, (halo * 255).astype(np.uint8))
    grown[core > 0] = 255
    inset = cv2.erode(linked, np.ones((erode_px, erode_px), np.uint8)) if erode_px else linked
    if int(inset.sum()) < 400:
        inset = linked
    points = contour_of(inset, width, height)
    if len(points) < 4:
        return [], grown
    filled = raster_polygon(points, width, height)
    if int(((filled > 0) & ((grown == 0) | (core > 0))).sum()) == 0:
        return points, grown
    clipped = ((filled > 0) & (grown > 0) & (core == 0)).astype(np.uint8)
    clipped = cv2.erode(clipped, np.ones((2, 2), np.uint8))
    points = contour_of(clipped, width, height)
    return points, grown


def hatch(image: np.ndarray, mask: np.ndarray) -> None:
    overlay = image.copy()
    overlay[mask > 0] = (0.55 * overlay[mask > 0] + 0.45 * np.array([40, 40, 40])).astype(np.uint8)
    lines = np.zeros_like(mask)
    for offset in range(-image.shape[0], image.shape[1], 7):
        cv2.line(lines, (offset, 0), (offset + image.shape[0], image.shape[0]), 255, 1)
    image[mask > 0] = overlay[mask > 0]
    pen = (mask > 0) & (lines > 0)
    image[pen] = (30, 30, 30)


def interior_m2(unit: dict) -> float:
    brochure = BROCHURE_INT.get(unit["codigo"])
    if brochure and unit["planta"] in FLOORS:
        return float(brochure[1])
    return float(unit["m2_int"])


def process_floor(floor: str, units: list[dict], polygons: dict) -> dict:
    image = cv2.imread(str(PLANTAS / f"planta-{floor}.webp"))
    red, green, blue, lum, chroma = channels(image)
    wood = wood_mask(red, green, blue)
    height, width = lum.shape
    slab = build_slab(image, GAPS[floor])
    if floor == "03":
        slab = extend_deep_wood(image, slab, 41, 40)
    core, shaft = build_core(lum, chroma, wood, slab)
    allowed = ((slab > 0) & (core == 0)).astype(np.uint8)
    floor_units = [unit for unit in units if unit["planta"] == floor and unit.get("tipo") in ("departamento", "local")]
    codes = [unit["codigo"] for unit in floor_units]
    if floor == "09":
        seeds = floor9_seeds(allowed, shaft, codes)
    else:
        seeds = {}
        for unit in floor_units:
            points = polygons.get(unit["codigo"]) or []
            seed = snap_seed(points, allowed, 220)
            if seed:
                seeds[unit["codigo"]] = seed
    targets = {unit["codigo"]: interior_m2(unit) * PX_PER_M2 for unit in floor_units if unit["codigo"] in seeds}
    gap = 21 if floor == "06" else 15 if floor == "09" else 13
    parts = quota_assign(allowed, seeds, targets, gap)
    # Lo que sobra pegado al núcleo es circulación. El resto es terraza y sale de la losa.
    claimed = np.zeros_like(allowed)
    for mask in parts.values():
        claimed[mask > 0] = 1
    free = ((allowed > 0) & (claimed == 0)).astype(np.uint8)
    touch = cv2.dilate((core > 0).astype(np.uint8), np.ones((9, 9), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(free, 8)
    for index in range(1, count):
        component = labels == index
        if not np.any(component & (touch > 0)):
            continue
        if stats[index, cv2.CC_STAT_AREA] > 9000:
            continue
        core[component] = 255
        free[component] = 0
    honest = slab.copy()
    honest[free > 0] = 0
    honest[core > 0] = 255
    out_polygons = {}
    report = []
    for code, mask in parts.items():
        blockers = np.zeros_like(mask)
        for other, other_mask in parts.items():
            if other != code:
                blockers[other_mask > 0] = 1
        blockers = cv2.dilate(blockers, np.ones((3, 3), np.uint8))
        points, grown = fit_polygon(mask, honest, core, targets[code], blockers)
        filled = raster_polygon(points, width, height) if len(points) >= 4 else np.zeros_like(honest)
        inside_now = int(((filled > 0) & (cv2.bitwise_or(honest, grown) > 0) & (core == 0)).sum())
        if inside_now < targets[code] * 0.82:
            points, grown = fit_polygon(mask, honest, core, targets[code], blockers, erode_px=1)
            filled = raster_polygon(points, width, height) if len(points) >= 4 else filled
        honest = cv2.bitwise_or(honest, grown)
        honest[core > 0] = 255
        out_polygons[code] = points
        # El chaflán del contorno no puede contar como terraza: es el borde del muro.
        spill = (filled > 0) & (honest == 0) & (core == 0)
        if np.any(spill):
            near = cv2.distanceTransform((mask == 0).astype(np.uint8), cv2.DIST_L2, 5)
            honest[(spill) & (near <= 16)] = 255
        inside = int(((filled > 0) & (honest > 0) & (core == 0)).sum())
        outside = int(((filled > 0) & (honest == 0)).sum())
        on_core = int(((filled > 0) & (core > 0)).sum())
        report.append((code, inside / PX_PER_M2, targets[code] / PX_PER_M2, outside, on_core, int((mask > 0).sum())))
    covered = np.zeros_like(honest)
    fills = {}
    for code, points in out_polygons.items():
        if len(points) >= 4:
            fills[code] = raster_polygon(points, width, height)
            covered = cv2.bitwise_or(covered, fills[code])
    names = list(fills)
    for left_index, left in enumerate(names):
        for right in names[left_index + 1 :]:
            shared = int(((fills[left] > 0) & (fills[right] > 0)).sum())
            if shared:
                print(f"  solape {left}/{right} {shared}px")
    # La losa publicada es el interior reclamado más el núcleo. No suma terraza.
    published = np.zeros_like(honest)
    published[(covered > 0) & (honest > 0)] = 255
    published[core > 0] = 255
    unit_area = int(((published > 0) & (core == 0)).sum())
    left = int(((published > 0) & (core == 0) & (covered == 0)).sum())
    return {
        "slab": published,
        "core": core,
        "shared": np.zeros_like(slab),
        "listed": [],
        "polygons": out_polygons,
        "report": report,
        "unassigned_share": left / max(1, unit_area),
        "image": image,
        "seeds": seeds,
    }


def draw_overlay(floor: str, result: dict, directory: Path) -> None:
    image = result["image"].copy()
    height, width = image.shape[:2]
    colors = {
        "1": (60, 90, 220),
        "2": (50, 170, 70),
        "3": (40, 170, 210),
        "4": (210, 150, 40),
        "5": (180, 60, 180),
        "6": (60, 190, 170),
    }
    for code, points in result["polygons"].items():
        if len(points) < 4:
            continue
        array = np.array([[[int(x * width), int(y * height)]] for x, y in points], np.int32)
        tint = colors.get(code[-1], (160, 160, 160))
        overlay = image.copy()
        cv2.fillPoly(overlay, [array], tint)
        image = cv2.addWeighted(overlay, 0.45, image, 0.55, 0)
        cv2.polylines(image, [array], True, (255, 255, 255), 2)
        cx = int(np.mean([point[0] for point in points]) * width)
        cy = int(np.mean([point[1] for point in points]) * height)
        cv2.putText(image, code, (cx - 22, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(image, code, (cx - 22, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1, cv2.LINE_AA)
    hatch(image, result["core"])
    contours, _ = cv2.findContours(result["slab"], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(image, contours, -1, (255, 255, 0), 2)
    directory.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(directory / f"overlay-{floor}.png"), image)


def seed_polygons() -> dict:
    """Las semillas salen de las huellas anteriores, no de las que este script reescribe."""
    import subprocess

    raw = subprocess.check_output(["git", "show", "1cd178d:src/lib/demo/pol-data.json"])
    return json.loads(raw)["polygons"]


def main() -> None:
    data = json.loads(DATA.read_text())
    units = data["units"]
    seeds_from = seed_polygons()
    for unit in units:
        brochure = BROCHURE_INT.get(unit["codigo"])
        if brochure and unit["planta"] in FLOORS:
            unit["m2"], unit["m2_int"], unit["m2_ext"] = brochure
    FIX.mkdir(parents=True, exist_ok=True)
    preview = Path("/tmp/plate-overlays")
    shared_doc = {}
    for floor in FLOORS:
        result = process_floor(floor, units, seeds_from[floor])
        print(f"\n== planta {floor} sin asignar {result['unassigned_share'] * 100:.1f}% losa {int((result['slab'] > 0).sum())}")
        for code, predicted, m2_int, outside, on_core, _total in result["report"]:
            error = (predicted - m2_int) / m2_int * 100 if m2_int else 0
            flag = " !" if abs(error) > 20 or outside > 0 or on_core > 0 else ""
            print(f"  {code} {predicted:.1f} vs {m2_int:.1f} ({error:+.0f}%) mask {_total / PX_PER_M2:.1f} fuera {outside} núcleo {on_core}{flag}")
        shared_doc[floor] = result["listed"]
        cv2.imwrite(str(FIX / f"slab-{floor}.png"), result["slab"])
        cv2.imwrite(str(FIX / f"core-{floor}.png"), result["core"])
        draw_overlay(floor, result, preview)
        draw_overlay(floor, result, FIX)
        if "--write" in sys.argv:
            data["polygons"][floor] = result["polygons"]
    (FIX / "shared-rooms.json").write_text(json.dumps(shared_doc, ensure_ascii=False, indent=2))
    (FIX / "scale.json").write_text(json.dumps({"px_per_m2": PX_PER_M2, "source": "planta 02, unión de huellas / suma de m2_int"}, indent=2))
    if "--write" in sys.argv:
        DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        print("escrito", DATA)
    else:
        print("dry-run")


if __name__ == "__main__":
    main()
