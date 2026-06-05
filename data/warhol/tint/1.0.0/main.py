#!/usr/bin/env python3
"""Apply a colored tint to one tile. Color + colorize come from parametersIn.

The DatasetIn carries the resized image (role='input' on RESIZE's output).
"""

import argparse
import subprocess
import sys

from dpmc_io import fetch_inputs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, help="Destination image path.")
    args, _ = parser.parse_known_args()

    batch = fetch_inputs()
    main_input = next(
        (i for i in batch.inputs if i.role in ("input", "output") and i.entries),
        None,
    )
    if main_input is None or not main_input.entries:
        print("TINT: no input Product to consume", file=sys.stderr)
        return 1

    color = batch.parameters.get("color")
    colorize = str(batch.parameters.get("colorize", 60))
    if not color:
        print("TINT: missing 'color' in parametersIn", file=sys.stderr)
        return 1

    src = main_input.fetch(f"/work/{main_input.product_name}")

    subprocess.run(
        ["magick", src, "-fill", color, "-colorize", colorize, args.output],
        check=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
