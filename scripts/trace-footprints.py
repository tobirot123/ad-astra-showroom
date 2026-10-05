"""Huellas de unidad sobre la planta: habitaciones y balcón, sin pasillo ni núcleo."""

from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/lib/demo/pol-data.json"
PLANTAS = ROOT / "public/demo/pol/plantas"
PREVIEW = Path("/tmp/fp-preview")

ORIENT = {
    "Norte": (0.0, -1.0),
    "Sur": (0.0, 1.0),
    "Este": (1.0, 0.0),
    "Oeste": (-1.0, 0.0),
    "Norte-Este": (0.7071, -0.7071),
    "Norte-Oeste": (-0.7071, -0.7071),
    "Sur-Este": (0.7071, 0.7071),
    "Sur-Oeste": (-0.7071, 0.7071),
}

FLOOR_FILE = {key: f"planta-{key}.webp" for key in ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"]}


def segment(rgb: np.ndarray):
    r = rgb[:, :, 0].astype(np.int16)
    g = rgb[:, :, 1].astype(np.int16)
    b = rgb[:, :, 2].astype(np.int16)
    wood = (
        (r > 95) & (r < 235) & (g > 40) & (g < 210) & (b < 170) & ((r - b) > 28) & ((r - g) > 8) & (r > g) & (g > b - 10)
    ).astype(np.uint8)
    wood = cv2.morphologyEx(wood, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    dist = cv2.distanceTransform(wood, cv2.DIST_L2, 5)
    core = (dist >= 12).astype(np.uint8)
    count, labels, stats, cents = cv2.connectedComponentsWithStats(core, 8)
    keep = [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] >= 350]
    lab = np.zeros_like(labels)
    for new, old in enumerate(keep, start=1):
        lab[labels == old] = new
    assign = np.zeros(wood.shape, np.int32)
    mind = np.full(wood.shape, 1e9, np.float32)
    for i in range(1, len(keep) + 1):
        inv = np.where(lab == i, 0, 255).astype(np.uint8)
        near = cv2.distanceTransform(inv, cv2.DIST_L2, 3)
        better = (wood > 0) & (near < mind)
        assign[better] = i
        mind[better] = near[better]
    rooms = []
    for i in range(1, len(keep) + 1):
        mask = assign == i
        area = int(mask.sum())
        if area < 280:
            continue
        ys, xs = np.where(mask)
        h = int(ys.max() - ys.min() + 1)
        w = int(xs.max() - xs.min() + 1)
        dil = cv2.dilate(mask.astype(np.uint8), np.ones((9, 9), np.uint8))
        neigh = {int(v) for v in np.unique(assign[dil > 0]) if int(v) not in (0, i)}
        rooms.append(
            {
                "id": i,
                "area": area,
                "cx": float(xs.mean()),
                "cy": float(ys.mean()),
                "elong": max(w, h) / max(1, min(w, h)),
                "neigh": neigh,
                "mask": mask,
            }
        )
    ids = {room["id"] for room in rooms}
    for room in rooms:
        room["neigh"] = {n for n in room["neigh"] if n in ids}
        room["deg"] = len(room["neigh"])
    return rooms


def corridor_ids(rooms: list[dict]) -> set[int]:
    """Pasillo alargado y, si existe, el núcleo chico pegado a él.

    Un estar con varias puertas (grado alto, poco alargado) es departamento.
    """
    if len(rooms) < 4:
        return set()
    spine = max(rooms, key=lambda room: (room["deg"], room["elong"], room["area"]))
    if not (spine["deg"] >= 7 or (spine["deg"] >= 6 and spine["elong"] >= 2.0 and spine["area"] >= 8000)):
        return set()
    chosen = {spine["id"]}
    stairs = [
        room
        for room in rooms
        if room["id"] != spine["id"]
        and 2000 <= room["area"] <= 5200
        and room["elong"] < 1.25
        and room["deg"] >= 4
        and spine["id"] in room["neigh"]
    ]
    if stairs:
        chosen.add(min(stairs, key=lambda room: room["area"])["id"])
    return chosen


def connected(members: set[int], adj: dict[int, set[int]]) -> bool:
    if not members:
        return False
    start = next(iter(members))
    seen = {start}
    stack = [start]
    while stack:
        node = stack.pop()
        for nxt in adj.get(node, ()):
            if nxt in members and nxt not in seen:
                seen.add(nxt)
                stack.append(nxt)
    return seen == members


def split_components(rooms: list[dict], units: list[dict]) -> dict[str, set[int]] | None:
    """Parte la planta en bloques separados por el pasillo y reparte las unidades."""
    blocked = corridor_ids(rooms)
    private = [room for room in rooms if room["id"] not in blocked]
    if len(private) < len(units):
        return None
    adj = {room["id"]: {n for n in room["neigh"] if n not in blocked} for room in private}
    by_id = {room["id"]: room for room in private}
    seen: set[int] = set()
    comps: list[dict] = []
    for room in private:
        if room["id"] in seen:
            continue
        stack = [room["id"]]
        seen.add(room["id"])
        members: list[int] = []
        while stack:
            node = stack.pop()
            members.append(node)
            for nxt in adj[node]:
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
        mass = sum(by_id[i]["area"] for i in members)
        comps.append(
            {
                "ids": set(members),
                "area": mass,
                "cx": sum(by_id[i]["cx"] * by_id[i]["area"] for i in members) / mass,
                "cy": sum(by_id[i]["cy"] * by_id[i]["area"] for i in members) / mass,
            }
        )
    # Los restos chicos (un baño o un balcón que no toca el grafo) no arman una
    # unidad: se pegan al final a la unidad más cercana.
    comps.sort(key=lambda comp: -comp["area"])
    floor_area = sum(comp["area"] for comp in comps) or 1
    kept = [comp for comp in comps if comp["area"] >= 0.06 * floor_area]
    scraps = [comp for comp in comps if comp["area"] < 0.06 * floor_area]
    total = sum(comp["area"] for comp in kept)
    m2_sum = sum(unit["m2"] for unit in units)
    target = {unit["codigo"]: unit["m2"] / m2_sum * total for unit in units}
    cx = sum(comp["cx"] * comp["area"] for comp in kept) / total
    cy = sum(comp["cy"] * comp["area"] for comp in kept) / total

    def unit_align(unit: dict, comp: dict) -> float:
        vector = ORIENT.get(unit.get("orientacion") or "")
        if not vector:
            return 0.0
        dx, dy = comp["cx"] - cx, comp["cy"] - cy
        norm = math.hypot(dx, dy) or 1
        return (dx / norm) * vector[0] + (dy / norm) * vector[1]

    from itertools import combinations

    def rooms_of(comp: dict) -> list[dict]:
        return [by_id[i] for i in comp["ids"]]

    def fits(comp: dict, group: list[dict]) -> dict[str, set[int]] | None:
        if len(group) == 1:
            return {group[0]["codigo"]: set(comp["ids"])}
        return exact(rooms_of(comp), group, locked=True)

    found: dict[str, set[int]] | None = None
    best_dev = 1e9
    global_target = {unit["codigo"]: unit["m2"] / m2_sum * floor_area for unit in units}

    def piece_dev(inner: dict[str, set[int]]) -> float:
        devs = []
        for code, members in inner.items():
            got = sum(by_id[i]["area"] for i in members)
            devs.append(abs(got / global_target[code] - 1))
        return max(devs) if devs else 1.0

    def choose(index: int, remaining: list[dict], acc: dict[str, set[int]]) -> bool:
        nonlocal found, best_dev
        if best_dev <= 0.18:
            return True
        if index == len(kept):
            if remaining:
                return False
            trial = {code: set(members) for code, members in acc.items()}
            for scrap in scraps:
                sx, sy = scrap["cx"], scrap["cy"]
                host = min(trial, key=lambda code: min(math.hypot(by_id[i]["cx"] - sx, by_id[i]["cy"] - sy) for i in trial[code]))
                trial[host] |= scrap["ids"]
            dev = piece_dev(trial)
            if dev < best_dev:
                best_dev = dev
                found = trial
            return dev <= 0.18
        comp = kept[index]
        goal = comp["area"]
        last = index == len(kept) - 1
        subsets: list[tuple[float, tuple[dict, ...]]] = []
        if last:
            got = sum(target[unit["codigo"]] for unit in remaining) or 1
            if remaining and abs(got / goal - 1) <= 0.28:
                subsets = [(abs(got / goal - 1), tuple(remaining))]
        else:
            for size in range(1, len(remaining)):
                for combo in combinations(remaining, size):
                    got = sum(target[unit["codigo"]] for unit in combo)
                    if abs(got / goal - 1) > 0.28:
                        continue
                    align = sum(unit_align(unit, comp) for unit in combo) / len(combo)
                    subsets.append((abs(got / goal - 1) - 0.15 * align, combo))
            subsets.sort(key=lambda item: item[0])
            subsets = subsets[:12]
        ranked: list[tuple[float, tuple[dict, ...], dict[str, set[int]]]] = []
        for _score, combo in subsets:
            inner = fits(comp, list(combo))
            if inner is None:
                continue
            ranked.append((piece_dev(inner), combo, inner))
        ranked.sort(key=lambda item: item[0])
        for _dev, combo, inner in ranked[:6]:
            chosen_ids = {id(unit) for unit in combo}
            rest = [unit for unit in remaining if id(unit) not in chosen_ids]
            acc.update(inner)
            if choose(index + 1, rest, acc):
                return True
            for code in inner:
                acc.pop(code, None)
        return False

    choose(0, list(units), {})
    if found is None:
        print("   ", "bloques", [(round(comp["area"]), len(comp["ids"])) for comp in kept], "sin reparto")
        return None
    return found


def exact(rooms: list[dict], units: list[dict], locked: bool = False) -> dict[str, set[int]] | None:
    """Asigna ambientes conexos para que cada unidad quede a ±25% de sus m²."""
    blocked = set() if locked else corridor_ids(rooms)
    private = [room for room in rooms if room["id"] not in blocked]
    if len(private) < len(units):
        return None
    adj = {room["id"]: {n for n in room["neigh"] if n not in blocked} for room in private}
    area = {room["id"]: room["area"] for room in private}
    pos = {room["id"]: (room["cx"], room["cy"]) for room in private}
    ids = set(area)
    total = sum(area.values())
    m2_sum = sum(unit["m2"] for unit in units)
    target = {unit["codigo"]: unit["m2"] / m2_sum * total for unit in units}
    aim = {unit["codigo"]: ORIENT.get(unit.get("orientacion") or "") for unit in units}
    cx = sum(pos[i][0] * area[i] for i in ids) / total
    cy = sum(pos[i][1] * area[i] for i in ids) / total
    order = sorted(units, key=lambda unit: -unit["m2"])

    def centroid(members: set[int]) -> tuple[float, float]:
        mass = sum(area[i] for i in members)
        return sum(pos[i][0] * area[i] for i in members) / mass, sum(pos[i][1] * area[i] for i in members) / mass

    def align(code: str, members: set[int]) -> float:
        vector = aim[code]
        if not vector:
            return 0.0
        px, py = centroid(members)
        dx, dy = px - cx, py - cy
        norm = math.hypot(dx, dy) or 1
        return (dx / norm) * vector[0] + (dy / norm) * vector[1]

    def options(code: str, remaining: set[int]) -> list[frozenset[int]]:
        goal = target[code]
        found: list[tuple[float, frozenset[int]]] = []
        seen: set[frozenset[int]] = set()
        for seed in remaining:
            def grow(current: set[int], frontier: set[int], got: float) -> None:
                if len(found) > 240:
                    return
                if got > goal * 1.25:
                    return
                if abs(got / goal - 1) <= 0.25:
                    packed = frozenset(current)
                    if packed not in seen:
                        seen.add(packed)
                        found.append((abs(got / goal - 1) - 0.35 * align(code, current), packed))
                for nxt in list(frontier):
                    if nxt in current or nxt < seed:
                        continue
                    current.add(nxt)
                    nxt_front = (frontier - {nxt}) | (adj[nxt] & remaining)
                    grow(current, nxt_front - current, got + area[nxt])
                    current.remove(nxt)
            grow({seed}, adj[seed] & remaining, area[seed])
        found.sort(key=lambda item: item[0])
        return [item[1] for item in found[:36]]

    best: dict[str, set[int]] | None = None
    best_score = -1e9
    stop = False

    def rec(index: int, remaining: set[int], acc: dict[str, set[int]], score: float) -> None:
        nonlocal best, best_score, stop
        if stop or score + (len(order) - index) < best_score:
            return
        if index == len(order):
            if not remaining and score > best_score:
                best_score = score
                best = {code: set(members) for code, members in acc.items()}
                if best_score > len(order) * 0.35:
                    stop = True
            return
        code = order[index]["codigo"]
        for subset in options(code, remaining):
            acc[code] = set(subset)
            rec(index + 1, remaining - subset, acc, score + align(code, set(subset)))
            if stop:
                return

    rec(0, set(ids), {}, 0.0)
    if best is None:
        return None
    return best


def anneal(rooms: list[dict], units: list[dict], seed: int) -> dict[str, set[int]] | None:
    blocked = corridor_ids(rooms)
    private = [room for room in rooms if room["id"] not in blocked]
    if len(private) < len(units):
        return None
    adj = {room["id"]: {n for n in room["neigh"] if n not in blocked} for room in private}
    area = {room["id"]: room["area"] for room in private}
    pos = {room["id"]: (room["cx"], room["cy"]) for room in private}
    ids = list(area)
    total = sum(area.values())
    m2_sum = sum(unit["m2"] for unit in units)
    target = {unit["codigo"]: unit["m2"] / m2_sum * total for unit in units}
    codes = [unit["codigo"] for unit in units]
    aim = {unit["codigo"]: ORIENT.get(unit.get("orientacion") or "") for unit in units}
    cx = sum(pos[i][0] * area[i] for i in ids) / total
    cy = sum(pos[i][1] * area[i] for i in ids) / total
    rng = np.random.default_rng(seed)

    def direction(room_id: int) -> tuple[float, float]:
        dx, dy = pos[room_id][0] - cx, pos[room_id][1] - cy
        norm = math.hypot(dx, dy) or 1.0
        return dx / norm, dy / norm

    def groups_of(state: dict[int, str]) -> dict[str, set[int]]:
        groups = {code: set() for code in codes}
        for room_id, code in state.items():
            groups[code].add(room_id)
        return groups

    def energy(state: dict[int, str]) -> float:
        groups = groups_of(state)
        err = 0.0
        for code in codes:
            got = sum(area[i] for i in groups[code])
            err += abs(got / target[code] - 1)
            if not connected(groups[code], adj):
                err += 3
        return err

    def orient(state: dict[int, str]) -> float:
        groups = groups_of(state)
        score = 0.0
        for code in codes:
            vector = aim[code]
            members = groups[code]
            if not vector or not members:
                continue
            mass = sum(area[i] for i in members)
            px = sum(pos[i][0] * area[i] for i in members) / mass
            py = sum(pos[i][1] * area[i] for i in members) / mass
            dx, dy = px - cx, py - cy
            norm = math.hypot(dx, dy) or 1
            score += (dx / norm) * vector[0] + (dy / norm) * vector[1]
        return score

    def within(state: dict[int, str], limit: float = 0.25) -> bool:
        groups = groups_of(state)
        return all(connected(groups[code], adj) for code in codes) and all(
            abs(sum(area[i] for i in groups[code]) / target[code] - 1) <= limit for code in codes
        )

    def fresh() -> dict[int, str]:
        state: dict[int, str] = {}
        free = set(ids)
        picks = rng.choice(ids, size=len(codes), replace=False)
        groups = {code: set() for code in codes}
        for code, room_id in zip(codes, picks):
            room_id = int(room_id)
            # Prefer a seed that faces the unit's orientation.
            vector = aim[code]
            if vector:
                faced = max(free, key=lambda rid: direction(rid)[0] * vector[0] + direction(rid)[1] * vector[1])
                room_id = faced
            groups[code].add(room_id)
            state[room_id] = code
            free.discard(room_id)
        guard = 0
        while free and guard < len(ids) * 4:
            guard += 1
            progressed = False
            order = list(codes)
            rng.shuffle(order)
            for code in order:
                got = sum(area[i] for i in groups[code])
                if got >= target[code]:
                    continue
                border = set()
                for member in groups[code]:
                    border |= adj[member] & free
                if not border:
                    continue
                room_id = min(border, key=lambda rid: abs(got + area[rid] - target[code]))
                groups[code].add(room_id)
                state[room_id] = code
                free.remove(room_id)
                progressed = True
            if not progressed:
                break
        for room_id in list(free):
            options = [code for code in codes if adj[room_id] & groups[code]] or codes
            code = min(options, key=lambda item: sum(area[i] for i in groups[item]) / target[item])
            groups[code].add(room_id)
            state[room_id] = code
        return state

    best_state = None
    best_rank = (-1e9, 1e9)
    for _restart in range(28):
        state = fresh()
        current = energy(state)
        temp = 0.35
        for _step in range(900):
            room_id = int(rng.choice(ids))
            code = state[room_id]
            options = [other for other in codes if other != code and (adj[room_id] & {rid for rid, owned in state.items() if owned == other})]
            if not options:
                continue
            nxt = str(rng.choice(options))
            remaining = {rid for rid, owned in state.items() if owned == code and rid != room_id}
            if remaining and not connected(remaining, adj):
                continue
            state[room_id] = nxt
            trial = energy(state)
            if trial <= current or rng.random() < math.exp((current - trial) / max(temp, 1e-4)):
                current = trial
            else:
                state[room_id] = code
            temp *= 0.996
        rank = (orient(state) if within(state, 0.25) else -10, -energy(state))
        if within(state, 0.25):
            rank = (orient(state), -energy(state))
        else:
            rank = (-10 + orient(state) * 0.01, -energy(state))
        if rank > best_rank:
            best_rank = rank
            best_state = dict(state)
            if within(state, 0.22):
                break
    if best_state is None or not within(best_state, 0.25):
        if best_state:
            groups = groups_of(best_state)
            bits = [f"{code} {sum(area[i] for i in groups[code]) / target[code]:.2f}" for code in codes]
            print("   ", " ".join(bits))
        return None
    return groups_of(best_state)


def build_masks(rooms: list[dict], groups: dict[str, set[int]], shape: tuple[int, int]) -> dict[str, np.ndarray]:
    blocked = corridor_ids(rooms)
    by_id = {room["id"]: room["mask"] for room in rooms}
    corridor = np.zeros(shape, np.uint8)
    for room_id in blocked:
        corridor[by_id[room_id]] = 1
    block = cv2.dilate(corridor, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    owned = {}
    for code, members in groups.items():
        mask = np.zeros(shape, np.uint8)
        for member in members:
            mask[by_id[member]] = 1
        owned[code] = mask
    # Cierra huecos internos (muros entre ambientes) sin agrandar el perímetro:
    # un cierre morfológico devuelve el borde exterior y rellena puertas.
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    claim = np.zeros(shape, np.int32)
    nearest = np.full(shape, 1e9, np.float32)
    codes = list(owned)
    for index, code in enumerate(codes, start=1):
        grown = cv2.morphologyEx(owned[code], cv2.MORPH_CLOSE, kernel)
        grown[block > 0] = 0
        inv = np.where(owned[code] > 0, 0, 255).astype(np.uint8)
        near = cv2.distanceTransform(inv, cv2.DIST_L2, 3)
        better = (grown > 0) & (near < nearest)
        claim[better] = index
        nearest[better] = near[better]
    final = {}
    for index, code in enumerate(codes, start=1):
        final[code] = (claim == index).astype(np.uint8)
    # El cierre puede volver a superponer: gana la unidad original más cercana.
    overlap = np.zeros(shape, np.int32)
    for mask in final.values():
        overlap += mask
    if int(overlap.max()) > 1:
        claim = np.zeros(shape, np.int32)
        nearest = np.full(shape, 1e9, np.float32)
        for index, code in enumerate(codes, start=1):
            inv = np.where(owned[code] > 0, 0, 255).astype(np.uint8)
            near = cv2.distanceTransform(inv, cv2.DIST_L2, 3)
            better = (final[code] > 0) & (near <= nearest)
            claim[better] = index
            nearest[better] = near[better]
        for index, code in enumerate(codes, start=1):
            final[code] = (claim == index).astype(np.uint8)
    return final


def balance(masks: dict[str, np.ndarray], units: list[dict]) -> None:
    """Pasa una capa del borde compartido hasta acercar cada área a sus m²."""
    codes = [unit["codigo"] for unit in units]
    m2_total = sum(unit["m2"] for unit in units) or 1
    target = {unit["codigo"]: unit["m2"] / m2_total for unit in units}
    kernel = np.ones((3, 3), np.uint8)
    for _ in range(80):
        total = sum(int(masks[code].sum()) for code in codes) or 1
        ratios = {code: (int(masks[code].sum()) / total) / target[code] for code in codes}
        if all(abs(ratio - 1) <= 0.2 for ratio in ratios.values()):
            return
        focus = max(codes, key=lambda code: abs(ratios[code] - 1))
        if abs(ratios[focus] - 1) <= 0.2:
            return
        moved = False
        if ratios[focus] < 1:
            neighbors = sorted(codes, key=lambda code: -ratios[code])
            for other in neighbors:
                if other == focus:
                    continue
                if ratios[other] < 1.0 and ratios[focus] > 0.72:
                    continue
                if ratios[other] <= ratios[focus]:
                    continue
                give = (masks[other] > 0) & (cv2.dilate(masks[focus], kernel) > 0)
                if int(give.sum()) < 8:
                    continue
                ys, xs = np.where(give)
                masks[other][ys, xs] = 0
                masks[focus][ys, xs] = 1
                moved = True
                break
        else:
            neighbors = sorted(codes, key=lambda code: ratios[code])
            for other in neighbors:
                if other == focus or ratios[other] >= 0.98:
                    continue
                give = (masks[focus] > 0) & (cv2.dilate(masks[other], kernel) > 0)
                if int(give.sum()) < 8:
                    continue
                ys, xs = np.where(give)
                masks[focus][ys, xs] = 0
                masks[other][ys, xs] = 1
                moved = True
                break
        if not moved:
            return


def contour(mask: np.ndarray, width: int, height: int) -> list[list[float]]:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return []
    outline = max(contours, key=cv2.contourArea)
    eps = max(1.2, 0.0035 * cv2.arcLength(outline, True))
    approx = cv2.approxPolyDP(outline, eps, True)
    if len(approx) < 4:
        approx = outline
    # Bajar la densidad sin perder el contorno.
    if len(approx) > 80:
        eps *= 1.8
        approx = cv2.approxPolyDP(outline, eps, True)
    return [[round(float(point[0]) / width, 4), round(float(point[1]) / height, 4)] for point in approx[:, 0, :]]


def shoelace(points: list[list[float]]) -> float:
    area = 0.0
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2


def trace_floor(floor_key: str, units: list[dict]) -> dict[str, list] | None:
    path = PLANTAS / FLOOR_FILE[floor_key]
    bgr = cv2.imread(str(path))
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    height, width = rgb.shape[:2]
    rooms = segment(rgb)
    groups = split_components(rooms, units)
    if groups is None:
        groups = exact(rooms, units)
    if not groups:
        print(f"{floor_key}: no cerró en ±25%")
        return None
    masks = build_masks(rooms, groups, rgb.shape[:2])
    balance(masks, units)
    for code, mask in list(masks.items()):
        count, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
        if count <= 2:
            continue
        biggest = float(stats[1:, cv2.CC_STAT_AREA].max())
        keep = np.zeros_like(mask)
        for index in range(1, count):
            if stats[index, cv2.CC_STAT_AREA] >= max(500, 0.2 * biggest):
                keep[labels == index] = 1
        masks[code] = keep
    polygons = {}
    areas = {}
    for unit in units:
        points = contour(masks[unit["codigo"]], width, height)
        if len(points) < 3:
            print(f"{floor_key}: {unit['codigo']} sin contorno")
            return None
        polygons[unit["codigo"]] = points
        areas[unit["codigo"]] = shoelace(points)
    total_m2 = sum(unit["m2"] for unit in units) or 1
    owned = np.zeros(rgb.shape[:2], np.uint8)
    for mask in masks.values():
        owned[mask > 0] = 1
    for _ in range(5):
        total_area = sum(areas.values()) or 1
        ratios = {unit["codigo"]: (areas[unit["codigo"]] / total_area) / (unit["m2"] / total_m2) for unit in units}
        if all(abs(ratio - 1) <= 0.24 for ratio in ratios.values()):
            break
        changed = False
        for unit in units:
            code = unit["codigo"]
            if ratios[code] >= 0.78:
                continue
            ring = cv2.dilate(masks[code], np.ones((3, 3), np.uint8))
            ring = (ring > 0) & (owned == 0)
            if int(ring.sum()) < 10:
                # Tomar una capa del vecino que más se pasa.
                donor = max(ratios, key=lambda item: ratios[item])
                if donor == code or ratios[donor] < 1:
                    continue
                ring = (masks[donor] > 0) & (cv2.dilate(masks[code], np.ones((3, 3), np.uint8)) > 0)
                if int(ring.sum()) < 8:
                    continue
                masks[donor][ring] = 0
            masks[code][ring] = 1
            owned[ring] = 1
            changed = True
        if not changed:
            break
        for unit in units:
            points = contour(masks[unit["codigo"]], width, height)
            if len(points) < 3:
                continue
            polygons[unit["codigo"]] = points
            areas[unit["codigo"]] = shoelace(points)
    total_area = sum(areas.values()) or 1
    worst = 0.0
    for unit in units:
        ratio = (areas[unit["codigo"]] / total_area) / (unit["m2"] / total_m2)
        worst = max(worst, abs(ratio - 1))
        if abs(ratio - 1) > 0.25:
            print(f"{floor_key}: {unit['codigo']} polígono {ratio:.2f}")
            return None
    print(f"{floor_key}: ok {worst:.0%}")
    PREVIEW.mkdir(parents=True, exist_ok=True)
    vis = rgb.copy()
    rng = np.random.default_rng(4)
    for unit in units:
        color = rng.integers(30, 220, 3).astype(np.float32)
        region = masks[unit["codigo"]] > 0
        vis[region] = (0.35 * vis[region] + 0.65 * color).astype(np.uint8)
        ys, xs = np.where(region)
        if len(xs):
            cv2.putText(vis, unit["codigo"], (int(xs.mean()) - 16, int(ys.mean())), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    painted = np.zeros(rgb.shape[:2], np.uint8)
    for mask in masks.values():
        painted[mask > 0] = 1
    ys, xs = np.where(painted)
    crop = vis[max(0, ys.min() - 16) : ys.max() + 16, max(0, xs.min() - 16) : xs.max() + 16]
    cv2.imwrite(str(PREVIEW / f"{floor_key}.png"), cv2.cvtColor(crop, cv2.COLOR_RGB2BGR))
    return polygons


def main() -> None:
    data = json.loads(DATA.read_text())
    by_floor: dict[str, list[dict]] = {}
    for unit in data["units"]:
        if unit.get("tipo") not in ("departamento", "local"):
            continue
        if not unit.get("m2") or unit["planta"] not in FLOOR_FILE:
            continue
        by_floor.setdefault(unit["planta"], []).append(unit)
    updated = {}
    for floor_key in FLOOR_FILE:
        units = by_floor.get(floor_key)
        if not units:
            continue
        polygons = trace_floor(floor_key, units)
        if polygons:
            updated[floor_key] = polygons
    if len(updated) != len(by_floor):
        print(f"faltan {sorted(set(by_floor) - set(updated))}; no escribo")
        return
    for floor_key, polygons in updated.items():
        data["polygons"][floor_key] = polygons
    DATA.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print("escrito", DATA)


if __name__ == "__main__":
    main()
