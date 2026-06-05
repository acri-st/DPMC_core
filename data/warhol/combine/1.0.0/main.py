#!/usr/bin/env python3
"""Combine N tinted tiles into a W x H grid.

DatasetIn is the union of every TINT's datasetOut (fan-in). gridWidth /
gridHeight come from parametersIn.

Set WARHOL_FORCE_FAIL=1 to exercise the OnFailure (CLEANUP) branch.
"""

import argparse
import os
import subprocess
import sys

from dpmc_io import fetch_inputs


def main() -> int:
    if os.environ.get("WARHOL_FORCE_FAIL") == "1":
        print("WARHOL_FORCE_FAIL=1 — failing intentionally", file=sys.stderr)
        return 1

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True)
    args, _ = parser.parse_known_args()

    batch = fetch_inputs()
    w = int(batch.parameters.get("gridWidth", 2))
    h = int(batch.parameters.get("gridHeight", 2))

    tiles = [i for i in batch.inputs if i.entries]
    if len(tiles) != w * h:
        print(f"COMBINE: expected {w * h} tiles, got {len(tiles)}", file=sys.stderr)
        return 1

    # Order tiles by the TINT batch sequence — that's how BatchDatasetIn rows
    # were inserted, which matches the natural left-to-right, top-to-bottom
    # iteration in expandFanOut.
    paths: list[str] = []
    for tile in tiles:
        paths.append(tile.fetch(f"/work/{tile.product_name}"))

    rows = [paths[r * w:(r + 1) * w] for r in range(h)]
    cmd = ["magick"]
    for row in rows:
        cmd += ["("] + row + ["+append", ")"]
    cmd += ["-append", args.output]
    subprocess.run(cmd, check=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
