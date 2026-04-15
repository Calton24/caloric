#!/usr/bin/env bash
# OFF Import Monitor — thin wrapper around the Python monitor
#
# Usage:
#   ./scripts/import-off.sh <country> [startPage] [endPage] [--dry-run]
#
# Examples:
#   ./scripts/import-off.sh gb                    # UK, pages 1-50
#   ./scripts/import-off.sh gb 1 100              # UK, pages 1-100
#   ./scripts/import-off.sh pl 1 50 --dry-run     # Poland dry run
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec python3 "$SCRIPT_DIR/import-off-monitor.py" "$@"
