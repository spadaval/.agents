#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${DIAGRAM_SOURCE_DIR:-$ROOT_DIR/src/assets/diagrams}"
OUTPUT_DIR="$SOURCE_DIR/generated"
EXPECTED_VERSION="v0.7.1"
D2_BIN="${D2_BIN:-$(command -v d2 || true)}"

if [[ -z "$D2_BIN" || ! -x "$D2_BIN" ]]; then
  echo "D2 $EXPECTED_VERSION is required. Set D2_BIN or install d2 on PATH." >&2
  exit 1
fi

actual_version="$("$D2_BIN" version)"
if [[ "$actual_version" != "$EXPECTED_VERSION" ]]; then
  echo "Expected D2 $EXPECTED_VERSION, found $actual_version." >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "No diagram source directory: $SOURCE_DIR"
  exit 0
fi

mapfile -d "" sources < <(
  find "$SOURCE_DIR" -maxdepth 1 -type f -name "*.d2" ! -name "_*" -print0 | sort -z
)
if [[ ${#sources[@]} -eq 0 ]]; then
  echo "No D2 diagrams found under $SOURCE_DIR."
  exit 0
fi

mkdir -p "$OUTPUT_DIR"
for source in "${sources[@]}"; do
  output="$OUTPUT_DIR/$(basename "${source%.d2}").svg"
  "$D2_BIN" fmt "$source"
  "$D2_BIN" validate "$source"
  "$D2_BIN" --layout elk "$source" "$output"
done
