#!/usr/bin/env python3
"""Cleanup-on-failure marker. Runs on COMBINE failure.

Writes a tiny marker file confirming the OnFailure branch was reached. No
input fetching needed.
"""

import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, help="Marker file path.")
    args, _ = parser.parse_known_args()

    with open(args.output, "w", encoding="utf-8") as f:
        f.write("cleanup-done\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
