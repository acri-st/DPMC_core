#!/usr/bin/env python3
"""Compute grid layout + per-tile color palette, emit blocks JSON.

Grid params (gridWidth/gridHeight/colorize) come from the batch
parametersIn — fetched via the DPMC API. No file inputs needed.
"""

import colorsys
import json
import sys
import argparse

from dpmc_io import fetch_inputs


def generate_palette(n: int) -> list[str]:
    colors = []
    for i in range(n):
        hue = i / n
        r, g, b = colorsys.hsv_to_rgb(hue, 0.9, 0.85)
        colors.append("#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255)))
    return colors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, help="Path to write blocks JSON.")
    args, _ = parser.parse_known_args()

    batch = fetch_inputs()
    params = batch.parameters
    gw = int(params.get("gridWidth", 2))
    gh = int(params.get("gridHeight", 2))
    colorize = int(params.get("colorize", 35))

    n = gw * gh
    if n < 1:
        print("gridWidth * gridHeight must be >= 1", file=sys.stderr)
        return 1

    palette = generate_palette(n)
    blocks = [
        {
            "color": color,
            "x": idx % gw,
            "y": idx // gw,
            "gridWidth": gw,
            "gridHeight": gh,
            "colorize": colorize,
        }
        for idx, color in enumerate(palette)
    ]

    with open(args.output, "w") as f:
        json.dump({"blocks": blocks}, f)

    print(f"Emitted {n} blocks to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
