"""Proyecta las huellas del masterplan (viewBox 1920×1080) sobre TOP 2.

La homografía está fijada: es la que se revisó contra el render
(grilla, anillo central, lagunas y acceso). RANSAC de OpenCV no es
estable entre corridas, así que no la recalculamos acá.

Uso:
  python3 scripts/hav/project_lots.py
Reescribe src/lib/demo/hav-geometry.json y public/hav/w3d/lots-top2.svg.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SVG = ROOT / "scripts/hav/avail-mp.svg"

# Masterplan px -> TOP 2 px (2752×1536).
H = np.array(
    [
        [7.94825663e-01, -7.89756198e-02, 6.06033719e02],
        [-3.10182492e-03, 7.50685687e-01, 3.65309202e02],
        [-3.24513803e-06, -4.80539037e-05, 1.0],
    ],
    dtype=np.float64,
)


def main() -> None:
    svg = SVG.read_text()
    rects = re.findall(
        r'<rect id="torre1__mp__l(\d+)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"',
        svg,
    )
    lots: dict[str, list[list[float]]] = {}
    polys: list[tuple[int, list[list[float]]]] = []
    for raw_id, x, y, w, h in rects:
        lote = int(raw_id)
        x0, y0, ww, hh = map(float, (x, y, w, h))
        corners = np.float32(
            [[x0, y0], [x0 + ww, y0], [x0 + ww, y0 + hh], [x0, y0 + hh]]
        ).reshape(-1, 1, 2)
        projected = cv2.perspectiveTransform(corners, H).reshape(-1, 2)
        points = [[round(float(px), 1), round(float(py), 1)] for px, py in projected]
        lots[str(lote)] = points
        polys.append((lote, points))

    geometry = {
        "width": 2752,
        "height": 1536,
        "image": "/hav/w3d/top-2.webp",
        "homography": H.round(12).tolist(),
        "lots": {key: lots[key] for key in sorted(lots, key=int)},
    }
    out_json = ROOT / "src/lib/demo/hav-geometry.json"
    out_json.write_text(json.dumps(geometry, separators=(",", ":")))

    lines = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2752 1536">']
    for lote, points in sorted(polys):
        rendered = " ".join(f"{x},{y}" for x, y in points)
        lines.append(f'<polygon id="lote-{lote}" data-lot="{lote}" points="{rendered}"/>')
    lines.append("</svg>")
    (ROOT / "public/hav/w3d/lots-top2.svg").write_text("\n".join(lines) + "\n")
    print(f"{len(lots)} lotes")


if __name__ == "__main__":
    main()
