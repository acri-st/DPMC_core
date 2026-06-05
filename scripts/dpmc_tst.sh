#!/usr/bin/env bash
# Generates DPMC_TST seed files for January 2026 into data/seed/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTDIR="$SCRIPT_DIR/../data/seed"
mkdir -p "$OUTDIR"

# Portable datetime helpers (supports macOS BSD date + GNU date)
to_epoch() {
  TZ=UTC date -j -f "%Y%m%d %H%M%S" "${1:0:8} ${1:9:6}" "+%s" 2>/dev/null \
    || TZ=UTC date -d "${1:0:4}-${1:4:2}-${1:6:2}T${1:9:2}:${1:11:2}:${1:13:2}Z" "+%s"
}
from_epoch() {
  TZ=UTC date -r "$1" "+%Y%m%dT%H%M%S" 2>/dev/null \
    || TZ=UTC date -d "@$1" "+%Y%m%dT%H%M%S"
}

# Period runs to Feb 1 (not Jan 31T235959) so the last L0 file always gets a
# full 12-24 h window. Clamping to 20260131T235959 would create a short sliver
# that violates the minimum 12 h duration requirement.
PERIOD_END=$(to_epoch "20260201T000000")

echo "=== Generating L0 products ==="
rm -f "$OUTDIR"/DPMC_TST_L0__*.txt
cur=$(to_epoch "20260101T000000")
while [ "$cur" -lt "$PERIOD_END" ]; do
  dur_secs=$(( (RANDOM % 13 + 12) * 3600 ))   # 12-24 h
  nxt=$(( cur + dur_secs ))
  prod=$(( nxt + 10800 ))   # prod_time = stop + 3h
  start_s=$(from_epoch "$cur")
  stop_s=$(from_epoch "$nxt")
  prod_s=$(from_epoch "$prod")
  fname="DPMC_TST_L0___${start_s}_${stop_s}_${prod_s}.txt"
  { echo 1024; for _ in $(seq 1 1024); do echo $(( RANDOM % 1025 )); done; } > "$OUTDIR/$fname"
  echo "  $fname"
  cur=$nxt
done

echo "=== Generating ADF1 (one per day, validity=+3 days) ==="
for day in $(seq 1 31); do
  start=$(to_epoch "$(printf '202601%02dT000000' "$day")")
  stop=$(( start + 259200 ))    # +3 days
  prod=$(( stop + 21600 ))      # +6h after stop
  fname="DPMC_TST_ADF1_$(from_epoch "$start")_$(from_epoch "$stop")_$(from_epoch "$prod").txt"
  > "$OUTDIR/$fname"
  echo "  $fname"
done

echo "=== Generating ADF2 (Jan 01/10/20/30, validity=end 2026) ==="
stop_adf2=$(to_epoch "20261231T000000")
for day in 1 10 20 30; do
  start=$(to_epoch "$(printf '202601%02dT000000' "$day")")
  prod=$(( start + 21600 ))     # +6h after start
  fname="DPMC_TST_ADF2_$(from_epoch "$start")_$(from_epoch "$stop_adf2")_$(from_epoch "$prod").txt"
  > "$OUTDIR/$fname"
  echo "  $fname"
done

echo "=== Generating ADF3 (window=32) ==="
fname="DPMC_TST_ADF3_20260101T000000_20261231T000000_20251201T000000.txt"
echo 32 > "$OUTDIR/$fname"
echo "  $fname"

echo "=== Generating ADF4 (window=8) ==="
fname="DPMC_TST_ADF4_20260101T000000_20261231T000000_20251201T000000.txt"
echo 8 > "$OUTDIR/$fname"
echo "  $fname"

echo "Done. Output: $OUTDIR"
