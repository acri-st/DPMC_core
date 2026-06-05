"""Smoke test: download the seeded warhol-source via stage_in, then re-upload via stage_out.

Run from apps/worker/:
    S3_ENDPOINT=http://localhost:9000 S3_ACCESS_KEY=admin S3_SECRET_KEY=adminadmin \
    S3_BUCKET=dpmc uv run python tests/staging_smoke.py

Verifies the staging contract end-to-end against the local MinIO without
touching the runner or the API.
"""

from __future__ import annotations

import logging
import os
import tempfile

from worker.config import S3Config
from worker.staging import (
    StageInEntry,
    StageOutEntry,
    build_s3_client,
    stage_in,
    stage_out,
)

SOURCE_URL = "s3://dpmc/products/3ba755c7-6808-48ec-aa93-9202d249928d/warhol-source.png"


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")
    cfg = S3Config()  # type: ignore[call-arg]
    s3 = build_s3_client(cfg)

    with tempfile.TemporaryDirectory() as workdir:
        stage_in(
            s3,
            [StageInEntry(url=SOURCE_URL, local_name="input.png", role="input")],
            workdir,
        )
        size_in = os.path.getsize(os.path.join(workdir, "input.png"))
        print(f"stage-in OK: {size_in} bytes")

        # Pretend the IPF wrote an output. Reuse input.png as a fake output.
        out_dir = os.path.join(workdir, "out")
        os.makedirs(out_dir, exist_ok=True)
        os.rename(
            os.path.join(workdir, "input.png"),
            os.path.join(out_dir, "fake.png"),
        )

        results = stage_out(
            s3,
            cfg.bucket,
            [
                StageOutEntry(
                    key="smoke/stage-out/fake.png",
                    local_name="out/fake.png",
                    role="output",
                    content_type="image/png",
                )
            ],
            workdir,
        )
        for r in results:
            print(f"stage-out OK: role={r.role} key={r.key} size={r.size}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
