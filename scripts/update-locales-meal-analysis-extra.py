#!/usr/bin/env python3
"""Add missing mealAnalysis keys to all locale files."""
import json, os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

NEW_KEYS = {
    "en": {
        "removeItem": "Remove Item",
        "removeItemConfirm": "Remove this food from the meal?",
        "remove": "Remove",
        "analysisTook": "Analysis took {{seconds}}s"
    },
    "de": {
        "removeItem": "Zutat entfernen",
        "removeItemConfirm": "Diese Zutat aus der Mahlzeit entfernen?",
        "remove": "Entfernen",
        "analysisTook": "Analyse dauerte {{seconds}}s"
    },
    "es": {
        "removeItem": "Eliminar alimento",
        "removeItemConfirm": "Eliminar este alimento de la comida?",
        "remove": "Eliminar",
        "analysisTook": "El analisis tomo {{seconds}}s"
    },
    "fr": {
        "removeItem": "Supprimer l'aliment",
        "removeItemConfirm": "Supprimer cet aliment du repas ?",
        "remove": "Supprimer",
        "analysisTook": "Analyse en {{seconds}}s"
    },
    "nl": {
        "removeItem": "Item verwijderen",
        "removeItemConfirm": "Dit voedingsmiddel uit de maaltijd verwijderen?",
        "remove": "Verwijderen",
        "analysisTook": "Analyse duurde {{seconds}}s"
    },
    "pl": {
        "removeItem": "Usun produkt",
        "removeItemConfirm": "Usunac ten produkt z posilku?",
        "remove": "Usun",
        "analysisTook": "Analiza trwala {{seconds}}s"
    },
    "pt": {
        "removeItem": "Remover item",
        "removeItemConfirm": "Remover este alimento da refeicao?",
        "remove": "Remover",
        "analysisTook": "Analise levou {{seconds}}s"
    },
    "pt-BR": {
        "removeItem": "Remover item",
        "removeItemConfirm": "Remover este alimento da refeicao?",
        "remove": "Remover",
        "analysisTook": "Analise levou {{seconds}}s"
    }
}

for lang, keys in NEW_KEYS.items():
    path = os.path.join(LOCALES_DIR, lang, "common.json")
    with open(path, "r") as f:
        data = json.load(f)
    if "mealAnalysis" not in data:
        data["mealAnalysis"] = {}
    for k, v in keys.items():
        data["mealAnalysis"][k] = v
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Updated {lang}: +{len(keys)} mealAnalysis keys")

print("Done!")
