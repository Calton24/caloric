#!/usr/bin/env python3
"""Add tabs translation keys to all locale common.json files."""
import json
import os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "locales")
LANGS = ["en", "de", "es", "fr", "nl", "pl", "pt", "pt-BR"]

tabs = {
    "en": {"home": "Home", "notes": "Notes", "auth": "Auth", "playground": "Playground", "caloric": "Caloric"},
    "de": {"home": "Startseite", "notes": "Notizen", "auth": "Konto", "playground": "Spielplatz", "caloric": "Caloric"},
    "es": {"home": "Inicio", "notes": "Notas", "auth": "Cuenta", "playground": "Pruebas", "caloric": "Caloric"},
    "fr": {"home": "Accueil", "notes": "Notes", "auth": "Compte", "playground": "Bac \u00e0 sable", "caloric": "Caloric"},
    "nl": {"home": "Start", "notes": "Notities", "auth": "Account", "playground": "Speeltuin", "caloric": "Caloric"},
    "pl": {"home": "Strona g\u0142\u00f3wna", "notes": "Notatki", "auth": "Konto", "playground": "Plac zabaw", "caloric": "Caloric"},
    "pt": {"home": "In\u00edcio", "notes": "Notas", "auth": "Conta", "playground": "\u00c1rea de testes", "caloric": "Caloric"},
    "pt-BR": {"home": "In\u00edcio", "notes": "Notas", "auth": "Conta", "playground": "\u00c1rea de testes", "caloric": "Caloric"},
}

for lang in LANGS:
    p = os.path.join(LOCALES_DIR, lang, "common.json")
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["tabs"] = tabs[lang]
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{lang}: added tabs section")
