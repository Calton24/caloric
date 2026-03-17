#!/usr/bin/env python3
"""
Open Food Facts Import Monitor — Auto-looping edition

Streams the import from the Supabase Edge Function in batches of 10 pages,
automatically chaining requests until the target product count is reached
or there are no more products.

Usage:
    python3 scripts/import-off-monitor.py <country> [--target N] [--dry-run]
    python3 scripts/import-off-monitor.py <country> <startPage> <endPage> [--dry-run]

Examples:
    python3 scripts/import-off-monitor.py gb                   # UK, auto-loop to 5000
    python3 scripts/import-off-monitor.py gb --target 10000     # UK, 10k products
    python3 scripts/import-off-monitor.py pl --dry-run          # Poland dry run
    python3 scripts/import-off-monitor.py gb 51 100             # UK, manual pages 51-100
"""

import http.client
import json
import os
import ssl
import sys
import time
import urllib.request
import urllib.error

# ── Colors ──────────────────────────────────────────────────────────────────

RED = "\033[0;31m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
BLUE = "\033[0;34m"
CYAN = "\033[0;36m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

# ── Constants ───────────────────────────────────────────────────────────────

BATCH_PAGES = 10          # Pages per Edge Function call (10 x 100 = ~1000 products)
DEFAULT_TARGET = 5000     # Default target product count
PAUSE_BETWEEN_BATCHES = 3 # seconds between batches (let OFF API breathe)


def progress_bar(current: int, total: int, width: int = 30) -> str:
    if total == 0:
        return "░" * width + "  0%"
    pct = min(current * 100 // total, 100)
    filled = min(current * width // total, width)
    empty = width - filled
    return "█" * filled + "░" * empty + f" {pct:>3}%"


def format_duration(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    if m >= 60:
        h, m = divmod(m, 60)
        return f"{h}h{m:02d}m{s:02d}s"
    return f"{m}m{s:02d}s"


def load_env(project_dir: str) -> dict:
    env = {}
    env_file = os.path.join(project_dir, ".env")
    if not os.path.exists(env_file):
        print(f"{RED}Error: .env not found at {env_file}{RESET}")
        sys.exit(1)
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, _, value = line.partition("=")
                env[key.strip()] = value.strip()
    return env


def get_ssl_context():
    ctx = ssl.create_default_context()
    try:
        import certifi
        ctx.load_verify_locations(certifi.where())
    except (ImportError, Exception):
        ctx = ssl._create_unverified_context()
    return ctx


def stream_batch(function_url, service_key, country, start_page, end_page,
                 dry_run, ssl_ctx, grand_stats, grand_start):
    """Run one batch and stream events. Returns (inserted, exhausted)."""
    body = json.dumps({
        "country": country,
        "startPage": start_page,
        "endPage": end_page,
        "dryRun": dry_run,
    }).encode()

    req = urllib.request.Request(
        function_url,
        data=body,
        headers={
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    batch_inserted = 0
    batch_exhausted = False
    batch_pages_done = 0
    batch_pages_total = end_page - start_page + 1

    try:
        with urllib.request.urlopen(req, timeout=600, context=ssl_ctx) as resp:
            buffer = b""
            while True:
                chunk = resp.read(4096)
                if not chunk:
                    break
                buffer += chunk
                while b"\n" in buffer:
                    line_bytes, buffer = buffer.split(b"\n", 1)
                    line = line_bytes.decode("utf-8").strip()
                    if not line:
                        continue
                    try:
                        event = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    etype = event.get("type", "")

                    if etype == "page":
                        page = event.get("page", 0)
                        valid = event.get("valid", 0)
                        skipped = event.get("skipped", 0)
                        brands = event.get("sampleBrands", [])
                        cum = event.get("cumulative", {})
                        batch_inserted = cum.get("inserted", 0)
                        batch_pages_done += 1

                        total_valid = grand_stats["valid"] + cum.get("validProducts", 0)
                        bar = progress_bar(total_valid, grand_stats["target"])
                        brand_str = ", ".join(brands[:3]) if brands else "-"

                        elapsed = time.time() - grand_start
                        rate = int(total_valid * 60 / elapsed) if elapsed > 0 and total_valid > 0 else 0

                        print(
                            f"  {BLUE}│{RESET} {bar}  "
                            f"{DIM}pg{RESET} {page:<4} "
                            f"{GREEN}+{valid:<3}{RESET} valid  "
                            f"{DIM}(-{skipped} skip){RESET}  "
                            f"{CYAN}Σ {total_valid:<5}{RESET}  "
                            f"{DIM}{rate}/min{RESET}  "
                            f"{DIM}{brand_str}{RESET}",
                            flush=True,
                        )

                    elif etype == "exhausted":
                        batch_exhausted = True

                    elif etype == "error":
                        msg = event.get("message", "?")
                        grand_stats["errors"] += 1
                        print(f"  {RED}✗{RESET}  {msg}")

                    elif etype == "done":
                        stats = event.get("stats", {})
                        batch_inserted = stats.get("inserted", 0)
                        batch_pages_done = stats.get("pagesProcessed", 0)
                        if batch_pages_done < batch_pages_total:
                            batch_exhausted = True

    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")[:200]
        print(f"  {RED}✗ HTTP {e.code}:{RESET} {error_body}")
        grand_stats["errors"] += 1
    except urllib.error.URLError as e:
        print(f"  {RED}✗ Connection error:{RESET} {e.reason}")
        grand_stats["errors"] += 1
    except TimeoutError:
        print(f"  {RED}✗ Request timed out{RESET}")
        grand_stats["errors"] += 1
    except (http.client.IncompleteRead, ConnectionError, OSError) as e:
        # Handles IncompleteRead, ConnectionResetError, BrokenPipeError
        # The Edge Function stream broke mid-transfer — keep what we got
        print(f"  {YELLOW}⚠ Stream interrupted:{RESET} {type(e).__name__} — keeping {batch_inserted} products from this batch")
        grand_stats["errors"] += 1

    grand_stats["valid"] += batch_inserted
    grand_stats["pages"] += batch_pages_done
    return batch_inserted, batch_exhausted


def main():
    # ── Parse args ──
    raw_args = sys.argv[1:]
    dry_run = "--dry-run" in raw_args
    raw_args = [a for a in raw_args if a != "--dry-run"]

    # Parse --target N
    target = DEFAULT_TARGET
    clean_args = []
    i = 0
    while i < len(raw_args):
        if raw_args[i] == "--target" and i + 1 < len(raw_args):
            target = int(raw_args[i + 1])
            i += 2
        else:
            clean_args.append(raw_args[i])
            i += 1

    if len(clean_args) < 1:
        print(f"Usage: {sys.argv[0]} <country> [--target N] [--dry-run]")
        print(f"       {sys.argv[0]} <country> <startPage> <endPage> [--dry-run]")
        sys.exit(1)

    country = clean_args[0]
    manual_mode = len(clean_args) >= 3
    start_page = int(clean_args[1]) if manual_mode else 1
    end_page = int(clean_args[2]) if manual_mode else start_page + BATCH_PAGES - 1

    # ── Load env ──
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    env = load_env(project_dir)

    service_key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    supabase_url = env.get("EXPO_PUBLIC_SUPABASE_URL", "")

    if not service_key:
        print(f"{RED}Error: SUPABASE_SERVICE_ROLE_KEY not found in .env{RESET}")
        sys.exit(1)

    if not supabase_url:
        try:
            import base64
            payload = service_key.split(".")[1]
            payload += "=" * (-len(payload) % 4)
            data = json.loads(base64.b64decode(payload))
            ref = data.get("ref", "")
            if ref:
                supabase_url = f"https://{ref}.supabase.co"
        except Exception:
            pass

    if not supabase_url:
        print(f"{RED}Error: Cannot determine Supabase URL{RESET}")
        sys.exit(1)

    function_url = f"{supabase_url}/functions/v1/import-openfoodfacts"
    ssl_ctx = get_ssl_context()

    # ── Header ──
    print()
    print(f"{BOLD}╔══════════════════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}║         🍎  Open Food Facts Import Monitor  🍎         ║{RESET}")
    print(f"{BOLD}╚══════════════════════════════════════════════════════════╝{RESET}")
    print()
    print(f"  {CYAN}Country:{RESET}    {BOLD}{country}{RESET}")
    if manual_mode:
        total_pages = end_page - start_page + 1
        print(f"  {CYAN}Pages:{RESET}      {start_page} -> {end_page}  ({total_pages} pages)")
    else:
        print(f"  {CYAN}Target:{RESET}     {BOLD}{target:,}{RESET} products  (auto-batching {BATCH_PAGES} pages at a time)")
    mode_str = f"{YELLOW}DRY RUN{RESET}" if dry_run else f"{GREEN}LIVE IMPORT{RESET}"
    print(f"  {CYAN}Mode:{RESET}       {mode_str}")
    print(f"  {CYAN}Started:{RESET}    {time.strftime('%H:%M:%S')}")
    print()
    print(f"{DIM}──────────────────────────────────────────────────────────{RESET}")
    print()

    # ── Grand stats ──
    grand_stats = {
        "target": target if not manual_mode else (end_page - start_page + 1) * 100,
        "valid": 0,
        "errors": 0,
        "pages": 0,
        "batches": 0,
    }
    grand_start = time.time()

    try:
        if manual_mode:
            grand_stats["batches"] = 1
            print(f"  {GREEN}▶{RESET} Pages {start_page}–{end_page}")
            print()
            stream_batch(
                function_url, service_key, country, start_page, end_page,
                dry_run, ssl_ctx, grand_stats, grand_start,
            )
        else:
            # ── Auto-loop ──
            current_page = start_page
            batch_num = 0

            while grand_stats["valid"] < target:
                batch_num += 1
                batch_end = current_page + BATCH_PAGES - 1
                grand_stats["batches"] = batch_num

                print(
                    f"  {GREEN}▶{RESET} Batch {batch_num} — "
                    f"pages {current_page}–{batch_end}  "
                    f"{DIM}({grand_stats['valid']:,}/{target:,} so far){RESET}"
                )
                print()

                inserted, exhausted = stream_batch(
                    function_url, service_key, country, current_page, batch_end,
                    dry_run, ssl_ctx, grand_stats, grand_start,
                )

                if exhausted:
                    print(f"\n  {YELLOW}⏹{RESET}  OFF database exhausted for this country")
                    break

                if inserted == 0:
                    # Batch got nothing — retry once after a longer pause
                    print(f"  {YELLOW}↻{RESET}  Batch returned 0 products, retrying in 10s...")
                    time.sleep(10)
                    inserted, exhausted = stream_batch(
                        function_url, service_key, country, current_page, batch_end,
                        dry_run, ssl_ctx, grand_stats, grand_start,
                    )
                    if inserted == 0:
                        print(f"  {RED}✗{RESET}  Retry failed — stopping")
                        break

                current_page = batch_end + 1

                if grand_stats["valid"] >= target:
                    print(f"\n  {GREEN}✓{RESET}  Target of {target:,} products reached!")
                    break

                # Pause between batches
                print(
                    f"\n  {DIM}── pausing {PAUSE_BETWEEN_BATCHES}s ──{RESET}\n",
                    flush=True,
                )
                time.sleep(PAUSE_BETWEEN_BATCHES)

    except KeyboardInterrupt:
        elapsed = time.time() - grand_start
        print(f"\n\n  {YELLOW}Interrupted after {format_duration(elapsed)}{RESET}")
        print(f"  {CYAN}Products imported so far:{RESET} {grand_stats['valid']:,}")
        sys.exit(130)

    # ── Final summary ──
    elapsed = time.time() - grand_start
    print()
    print(f"{DIM}══════════════════════════════════════════════════════════{RESET}")
    print()
    if dry_run:
        print(f"  {BOLD}{YELLOW}DRY RUN COMPLETE{RESET}")
    else:
        print(f"  {BOLD}{GREEN}IMPORT COMPLETE{RESET}")
    print()
    print(f"  {CYAN}Batches:{RESET}           {grand_stats['batches']}")
    print(f"  {CYAN}Pages processed:{RESET}   {grand_stats['pages']}")
    print(f"  {CYAN}Products imported:{RESET} {GREEN}{grand_stats['valid']:,}{RESET}")
    err = grand_stats["errors"]
    print(f"  {CYAN}Errors:{RESET}            {RED + str(err) + RESET if err > 0 else '0'}")
    print(f"  {CYAN}Duration:{RESET}          {format_duration(elapsed)}")
    rate = int(grand_stats["valid"] * 60 / elapsed) if elapsed > 0 and grand_stats["valid"] > 0 else 0
    print(f"  {CYAN}Avg rate:{RESET}          {rate}/min")
    print()
    print(f"{DIM}──────────────────────────────────────────────────────────{RESET}")
    print(f"  Finished at {time.strftime('%H:%M:%S')}")
    print()


if __name__ == "__main__":
    main()
