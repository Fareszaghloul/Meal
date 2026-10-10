#!/usr/bin/env bash
# Build and/or install the MealPrep iOS wrapper with xtool. Run inside Linux (or WSL).
#
#   ios/scripts/xtool.sh build     compile + package only (no device needed)
#   ios/scripts/xtool.sh run       build, sign, install and launch on the connected iPhone (default)
#
# The project is synced to a native Linux directory first: SwiftPM builds are slow and unreliable on /mnt/c (9p).
set -euo pipefail

command -v xtool >/dev/null || { echo "xtool not found on PATH" >&2; exit 1; }

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$here/../MealPrep"
work="${MEALPREP_IOS_WORKDIR:-$HOME/mealprep-ios}"
mode="${1:-run}"

mkdir -p "$work"
if command -v rsync >/dev/null; then
  rsync -a --delete --exclude '/.build' --exclude '/.swiftpm' --exclude '/xtool' "$src/" "$work/"
else
  # No rsync: replace sources/config but keep .build for incremental compiles.
  find "$work" -mindepth 1 -maxdepth 1 ! -name .build ! -name .swiftpm ! -name xtool -exec rm -rf {} +
  cp -a "$src/." "$work/"
fi

cd "$work"
case "$mode" in
  build) xtool dev build ;;
  run)   xtool dev ;;
  *)     echo "usage: $0 [build|run]" >&2; exit 2 ;;
esac
