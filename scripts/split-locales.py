#!/usr/bin/env python3
"""
Split monolithic common.json into feature-scoped namespace files.

Grouping:
  common.json    → app, common, calories
  auth.json      → auth
  onboarding.json→ onboarding, landing
  home.json      → home
  settings.json  → settings, notificationSettings
  tracking.json  → tracking, camera, mealConfirm, editMeal, mealAnalysis, voiceLog, manualLog
  progress.json  → progress, logWeight
  permissions.json→ permissions, permissionsSetup
  goals.json     → goals
  guide.json     → guide, liveActivity

For each language:
  1. Reads src/locales/{lang}/common.json
  2. Writes feature files into the same directory
  3. Renames old common.json to common.backup.json
"""

import json
import os
import shutil

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

LANGS = ["en", "de", "es", "fr", "nl", "pl", "pt", "pt-BR"]

# Map: output filename → list of top-level keys from common.json
NAMESPACE_MAP = {
    "common": ["app", "common", "calories"],
    "auth": ["auth"],
    "onboarding": ["onboarding", "landing"],
    "home": ["home"],
    "settings": ["settings", "notificationSettings"],
    "tracking": ["tracking", "camera", "mealConfirm", "editMeal", "mealAnalysis", "voiceLog", "manualLog"],
    "progress": ["progress", "logWeight"],
    "permissions": ["permissions", "permissionsSetup"],
    "goals": ["goals"],
    "guide": ["guide", "liveActivity"],
}


def split_language(lang: str) -> None:
    lang_dir = os.path.join(LOCALES_DIR, lang)
    src = os.path.join(lang_dir, "common.json")

    if not os.path.exists(src):
        print(f"  SKIP {lang} — no common.json")
        return

    with open(src, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Write each namespace file
    for ns_name, keys in NAMESPACE_MAP.items():
        ns_data = {}
        for key in keys:
            if key in data:
                ns_data[key] = data[key]
            else:
                print(f"  WARN {lang}: key '{key}' not found in common.json")

        out_path = os.path.join(lang_dir, f"{ns_name}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(ns_data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    # Check for unmapped keys
    all_mapped = set()
    for keys in NAMESPACE_MAP.values():
        all_mapped.update(keys)
    unmapped = set(data.keys()) - all_mapped
    if unmapped:
        print(f"  WARN {lang}: unmapped keys: {unmapped}")

    # Backup old file
    backup = os.path.join(lang_dir, "common.backup.json")
    shutil.copy2(src, backup)
    os.remove(src)
    print(f"  OK {lang}: split into {len(NAMESPACE_MAP)} files, backup saved")


def main():
    print("Splitting locale files...\n")
    for lang in LANGS:
        split_language(lang)

    print("\nDone. Update init.ts to import the new files.")


if __name__ == "__main__":
    main()
