#!/usr/bin/env python3
"""Publish the final assembled image. Runs on COMBINE success.

DatasetIn carries COMBINE's output. We just copy it under the published path.
"""

import argparse
import shutil
import sys

from dpmc_io import fetch_inputs


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, help="Published artifact path.")
    args, _ = parser.parse_known_args()

    batch = fetch_inputs()
    src_input = next((i for i in batch.inputs if i.entries), None)
    if src_input is None or not src_input.entries:
        print("PUBLISH: no input to publish", file=sys.stderr)
        return 1

    src = src_input.fetch(f"/work/{src_input.product_name}")
    shutil.copyfile(src, args.output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
