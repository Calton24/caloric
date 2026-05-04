#!/usr/bin/env python3
"""Add rich text translation keys for confirm-meal no-match string."""
import json
import os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "locales")
LANGS = ["en", "de", "es", "fr", "nl", "pl", "pt", "pt-BR"]

rich_keys = {
    "en": {
        "noMatchRich": "We couldn\u2019t find <bold>\u201c{{food}}\u201d</bold> in our database. Try again or type it in."
    },
    "de": {
        "noMatchRich": "Wir konnten <bold>\u201e{{food}}\u201c</bold> nicht in unserer Datenbank finden. Versuche es erneut oder tippe es ein."
    },
    "es": {
        "noMatchRich": "No pudimos encontrar <bold>\u00ab{{food}}\u00bb</bold> en nuestra base de datos. Int\u00e9ntalo de nuevo o escr\u00edbelo."
    },
    "fr": {
        "noMatchRich": "Nous n\u2019avons pas trouv\u00e9 <bold>\u00ab\u202f{{food}}\u202f\u00bb</bold> dans notre base de donn\u00e9es. R\u00e9essayez ou saisissez-le."
    },
    "nl": {
        "noMatchRich": "We konden <bold>\u201c{{food}}\u201d</bold> niet vinden in onze database. Probeer het opnieuw of typ het in."
    },
    "pl": {
        "noMatchRich": "Nie znale\u017ali\u015bmy <bold>\u201e{{food}}\u201d</bold> w naszej bazie danych. Spr\u00f3buj ponownie lub wpisz r\u0119cznie."
    },
    "pt": {
        "noMatchRich": "N\u00e3o encontr\u00e1mos <bold>\u201c{{food}}\u201d</bold> na nossa base de dados. Tente novamente ou escreva manualmente."
    },
    "pt-BR": {
        "noMatchRich": "N\u00e3o encontramos <bold>\u201c{{food}}\u201d</bold> no nosso banco de dados. Tente novamente ou digite manualmente."
    },
}

for lang in LANGS:
    p = os.path.join(LOCALES_DIR, lang, "tracking.json")
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    data["mealConfirm"].update(rich_keys[lang])
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{lang}: added mealConfirm.noMatchRich")
