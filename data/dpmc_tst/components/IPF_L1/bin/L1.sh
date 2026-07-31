#!/usr/bin/env bash
# IPF L1: sliding average L0 → L1
# Usage: L1.sh <input_dir> <output_dir>
# Reads all DPMC_TST_L0__*.txt from input_dir, selects by ValIntersect on ADF1/2,
# reads window from ADF3, computes sliding average, writes L1 to output_dir.
set -euo pipefail

INPUT_DIR="${1:?Usage: L1.sh <input_dir> <output_dir>}"
OUTPUT_DIR="${2:?Usage: L1.sh <input_dir> <output_dir>}"
mkdir -p "$OUTPUT_DIR"

HOST=$(hostname)
echo "[L1] START host=$HOST input=$INPUT_DIR output=$OUTPUT_DIR"

# Find unique L0 file (exactly one expected per job). The leading * tolerates the
# `<batchId>-out-` prefix the DPMC platform prepends to batch-produced products
# (harmless here since L0 is a task input, but kept uniform with L2).
l0_files=("$INPUT_DIR"/*DPMC_TST_L0__*.txt)
[[ -f "${l0_files[0]}" ]] || { echo "[L1] ERROR: no L0 file found in $INPUT_DIR"; exit 1; }
L0_FILE="${l0_files[0]}"
echo "[L1] L0 selected: $(basename "$L0_FILE")"

# Extract sensing window from L0 filename
# Format: DPMC_TST_L0___<start>_<stop>_<prod>.txt
# DPMC_TST_L0___... has 3 underscores after L0 (the type code L0__ ends in __,
# plus the field separator _), creating two empty fields at positions 4 and 5.
# Start time is therefore at field 6, stop at field 7.
BASENAME=$(basename "$L0_FILE" .txt)
L0_START=$(echo "$BASENAME" | cut -d_ -f6)
L0_STOP=$(echo  "$BASENAME" | cut -d_ -f7)
echo "[L1] Sensing window: $L0_START → $L0_STOP"

# Read window size from ADF3
adf3_files=("$INPUT_DIR"/DPMC_TST_ADF3*.txt)
[[ -f "${adf3_files[0]}" ]] || { echo "[L1] ERROR: no ADF3 file found in $INPUT_DIR"; exit 1; }
ADF3_FILE="${adf3_files[0]}"
WINDOW=$(tr -d '[:space:]' < "$ADF3_FILE")
[[ "$WINDOW" =~ ^[1-9][0-9]*$ ]] || { echo "[L1] ERROR: invalid WINDOW='$WINDOW' in $(basename "$ADF3_FILE")"; exit 1; }
echo "[L1] ADF3=$(basename "$ADF3_FILE") window=$WINDOW"

# ValIntersect: log ADF1 files that intersect [L0_START, L0_STOP]
# ADF filenames: DPMC_TST_ADF1_start(f4)_stop(f5)_prod(f6).txt
for f in "$INPUT_DIR"/DPMC_TST_ADF1*.txt; do
  [ -f "$f" ] || continue
  BN=$(basename "$f" .txt)
  ADF_START=$(echo "$BN" | cut -d_ -f4)
  ADF_STOP=$(echo  "$BN" | cut -d_ -f5)
  if [[ "$ADF_START" < "$L0_STOP" && "$ADF_STOP" > "$L0_START" ]]; then
    echo "[L1] ADF1 intersect: $(basename "$f")"
  fi
done
for f in "$INPUT_DIR"/DPMC_TST_ADF2*.txt; do
  [ -f "$f" ] || continue
  BN=$(basename "$f" .txt)
  ADF_START=$(echo "$BN" | cut -d_ -f4)
  ADF_STOP=$(echo  "$BN" | cut -d_ -f5)
  if [[ "$ADF_START" < "$L0_STOP" && "$ADF_STOP" > "$L0_START" ]]; then
    echo "[L1] ADF2 intersect: $(basename "$f")"
  fi
done

# Compute sliding average with gawk
PROD_TIME=$(TZ=UTC date -d "+3 hours" "+%Y%m%dT%H%M%S" 2>/dev/null || TZ=UTC date -v+3H "+%Y%m%dT%H%M%S")
OUT_FILE="$OUTPUT_DIR/DPMC_TST_L1___${L0_START}_${L0_STOP}_${PROD_TIME}.txt"
echo "[L1] Computing sliding average (window=$WINDOW)..."

gawk -v W="$WINDOW" '
NR == 1 { print; next }
{ data[NR-2] = $1 }
END {
  n = NR - 1
  half = int(W / 2)
  for (i = 0; i < n; i++) {
    lo = (i - half > 0) ? i - half : 0
    hi = (i + half < n - 1) ? i + half : n - 1
    sum = 0
    for (j = lo; j <= hi; j++) sum += data[j]
    printf "%d\n", sum / (hi - lo + 1)
  }
}
' "$L0_FILE" > "$OUT_FILE"

echo "[L1] Output: $(basename "$OUT_FILE")"
echo "[L1] DONE at $(TZ=UTC date '+%Y%m%dT%H%M%S')"
