#!/usr/bin/env python3
"""
Batch EU import — imports multiple countries sequentially with retries.

Usage:
    python3 scripts/import-eu-batch.py
    python3 scripts/import-eu-batch.py --target 3000
    python3 scripts/import-eu-batch.py --dry-run
    python3 scripts/import-eu-batch.py es fr de          # specific countries only
"""

import subprocess
import sys
import time

# Countries available (code, label)
ALL_COUNTRIES = [
    ("pl", "Poland"),
    ("es", "Spain"),
    ("fr", "France"),
    ("de", "Germany"),
    ("ie", "Ireland"),
    ("nl", "Netherlands"),
    ("it", "Italy"),
    ("pt", "Portugal"),
]

PAUSE_BETWEEN_COUNTRIES = 30  # seconds — let OFF API cool down
MAX_RETRIES = 2  # retry failed countries up to N times


def main():
    target = "5000"
    extra_args = []
    requested_codes = []

    # Parse args
    i = 0
    while i < len(sys.argv[1:]):
        arg = sys.argv[i + 1]
        if arg == "--dry-run":
            extra_args.append("--dry-run")
        elif arg == "--target":
            if i + 2 < len(sys.argv):
                target = sys.argv[i + 2]
                i += 1
        elif len(arg) == 2 and arg.isalpha():
            requested_codes.append(arg.lower())
        i += 1

    # Filter countries if specific ones requested
    if requested_codes:
        countries = [(c, n) for c, n in ALL_COUNTRIES if c in requested_codes]
        if not countries:
            print(f"  No matching countries for: {requested_codes}")
            print(f"  Available: {', '.join(c for c, _ in ALL_COUNTRIES)}")
            sys.exit(1)
    else:
        countries = ALL_COUNTRIES

    print("\n" + "=" * 60)
    print("  EU Batch Import")
    print(f"  Countries: {', '.join(c[1] for c in countries)}")
    print(f"  Target per country: {target}")
    print(f"  Pause between countries: {PAUSE_BETWEEN_COUNTRIES}s")
    print("=" * 60 + "\n")

    results = []
    failed = []

    for idx, (code, name) in enumerate(countries):
        print(f"\n{'─' * 60}")
        print(f"  Starting {name} ({code})...")
        print(f"{'─' * 60}\n")

        cmd = [
            sys.executable,
            "scripts/import-off-monitor.py",
            code,
            "--target", target,
        ] + extra_args

        start = time.time()
        result = subprocess.run(cmd)
        elapsed = time.time() - start

        status = "OK" if result.returncode == 0 else "FAILED"
        results.append((name, code, status, elapsed))

        if result.returncode != 0:
            print(f"\n  ⚠ {name} import failed (exit {result.returncode})")
            failed.append((code, name))

        # Pause between countries to let the OFF API breathe
        if idx < len(countries) - 1:
            print(f"\n  Pausing {PAUSE_BETWEEN_COUNTRIES}s before next country...")
            time.sleep(PAUSE_BETWEEN_COUNTRIES)

    # Retry failed countries
    for retry in range(MAX_RETRIES):
        if not failed:
            break
        print(f"\n{'=' * 60}")
        print(f"  RETRY {retry + 1}/{MAX_RETRIES} — {len(failed)} failed countries")
        print(f"  Waiting 60s before retrying...")
        print(f"{'=' * 60}")
        time.sleep(60)

        still_failed = []
        for code, name in failed:
            print(f"\n  Retrying {name} ({code})...")
            cmd = [
                sys.executable,
                "scripts/import-off-monitor.py",
                code,
                "--target", target,
            ] + extra_args

            start = time.time()
            result = subprocess.run(cmd)
            elapsed = time.time() - start

            status = "OK" if result.returncode == 0 else "FAILED"
            results.append((name, code, f"RETRY-{status}", elapsed))

            if result.returncode != 0:
                still_failed.append((code, name))

            if still_failed != failed[-1:]:
                time.sleep(PAUSE_BETWEEN_COUNTRIES)

        failed = still_failed

    # Summary
    print("\n" + "=" * 60)
    print("  EU BATCH IMPORT COMPLETE")
    print("=" * 60)
    for name, code, status, elapsed in results:
        mins = int(elapsed // 60)
        secs = int(elapsed % 60)
        icon = "✅" if "OK" in status else "❌"
        print(f"  {icon} {name:12s} ({code})  {status:12s}  {mins}m{secs:02d}s")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
