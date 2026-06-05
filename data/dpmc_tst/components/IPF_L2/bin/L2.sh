#!/usr/bin/env bash
# IPF L2: sliding average L1 → L2
# Usage: L2.sh <input_dir> <output_dir>
set -euo pipefail

INPUT_DIR="${1:?Usage: L2.sh <input_dir> <output_dir>}"
OUTPUT_DIR="${2:?Usage: L2.sh <input_dir> <output_dir>}"
mkdir -p "$OUTPUT_DIR"

HOST=$(hostname)
echo "[L2] START host=$HOST input=$INPUT_DIR output=$OUTPUT_DIR"

# Find L1 file
l1_files=("$INPUT_DIR"/DPMC_TST_L1__*.txt)
[[ -f "${l1_files[0]}" ]] || { echo "[L2] ERROR: no L1 file found in $INPUT_DIR"; exit 1; }
L1_FILE="${l1_files[0]}"
echo "[L2] L1 selected: $(basename "$L1_FILE")"

# Extract sensing window from L1 filename
# Format: DPMC_TST_L1___<start>_<stop>_<prod>.txt
# DPMC_TST_L1___... has 3 underscores after L1 (the type code L1__ ends in __,
# plus the field separator _), creating two empty fields at positions 4 and 5.
# Start time is therefore at field 6, stop at field 7.
BASENAME=$(basename "$L1_FILE" .txt)
L1_START=$(echo "$BASENAME" | cut -d_ -f6)
L1_STOP=$(echo  "$BASENAME" | cut -d_ -f7)
echo "[L2] Sensing window: $L1_START → $L1_STOP"

# Read window size from ADF4
adf4_files=("$INPUT_DIR"/DPMC_TST_ADF4*.txt)
[[ -f "${adf4_files[0]}" ]] || { echo "[L2] ERROR: no ADF4 file found in $INPUT_DIR"; exit 1; }
ADF4_FILE="${adf4_files[0]}"
WINDOW=$(tr -d '[:space:]' < "$ADF4_FILE")
[[ "$WINDOW" =~ ^[1-9][0-9]*$ ]] || { echo "[L2] ERROR: invalid WINDOW='$WINDOW' in $(basename "$ADF4_FILE")"; exit 1; }
echo "[L2] ADF4=$(basename "$ADF4_FILE") window=$WINDOW"

# ValIntersect log for ADF4
# ADF4 filenames: DPMC_TST_ADF4_start(f4)_stop(f5)_prod(f6).txt
for f in "$INPUT_DIR"/DPMC_TST_ADF4*.txt; do
  [ -f "$f" ] || continue
  BN=$(basename "$f" .txt)
  ADF_START=$(echo "$BN" | cut -d_ -f4)
  ADF_STOP=$(echo  "$BN" | cut -d_ -f5)
  if [[ "$ADF_START" < "$L1_STOP" && "$ADF_STOP" > "$L1_START" ]]; then
    echo "[L2] ADF4 intersect: $(basename "$f")"
  fi
done

# Compute sliding average
PROD_TIME=$(TZ=UTC date -d "+3 hours" "+%Y%m%dT%H%M%S" 2>/dev/null || TZ=UTC date -v+3H "+%Y%m%dT%H%M%S")
OUT_FILE="$OUTPUT_DIR/DPMC_TST_L2___${L1_START}_${L1_STOP}_${PROD_TIME}.txt"
echo "[L2] Computing sliding average (window=$WINDOW)..."

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
' "$L1_FILE" > "$OUT_FILE"

echo "[L2] Output: $(basename "$OUT_FILE")"
echo "[L2] DONE at $(TZ=UTC date '+%Y%m%dT%H%M%S')"
