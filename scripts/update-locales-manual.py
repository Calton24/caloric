#!/usr/bin/env python3
import json, os

BASE = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

TRANSLATIONS = {
    "en": {
        "manualLog": {
            "title": "Manual Log",
            "placeholder": "Describe what you ate...",
            "quickAdd": "Quick Add",
            "eggs": "Eggs",
            "banana": "Banana",
            "salad": "Salad",
            "chicken": "Chicken",
            "rice": "Rice",
            "yogurt": "Yogurt",
            "logFood": "Log Food"
        }
    },
    "de": {
        "manualLog": {
            "title": "Manuelle Eingabe",
            "placeholder": "Beschreibe was du gegessen hast...",
            "quickAdd": "Schnell hinzufuegen",
            "eggs": "Eier",
            "banana": "Banane",
            "salad": "Salat",
            "chicken": "Haehnchen",
            "rice": "Reis",
            "yogurt": "Joghurt",
            "logFood": "Essen erfassen"
        }
    },
    "es": {
        "manualLog": {
            "title": "Registro manual",
            "placeholder": "Describe lo que comiste...",
            "quickAdd": "Agregar rapido",
            "eggs": "Huevos",
            "banana": "Platano",
            "salad": "Ensalada",
            "chicken": "Pollo",
            "rice": "Arroz",
            "yogurt": "Yogur",
            "logFood": "Registrar comida"
        }
    },
    "fr": {
        "manualLog": {
            "title": "Saisie manuelle",
            "placeholder": "Decrivez ce que vous avez mange...",
            "quickAdd": "Ajout rapide",
            "eggs": "Oeufs",
            "banana": "Banane",
            "salad": "Salade",
            "chicken": "Poulet",
            "rice": "Riz",
            "yogurt": "Yaourt",
            "logFood": "Enregistrer"
        }
    },
    "nl": {
        "manualLog": {
            "title": "Handmatige invoer",
            "placeholder": "Beschrijf wat je hebt gegeten...",
            "quickAdd": "Snel toevoegen",
            "eggs": "Eieren",
            "banana": "Banaan",
            "salad": "Salade",
            "chicken": "Kip",
            "rice": "Rijst",
            "yogurt": "Yoghurt",
            "logFood": "Eten loggen"
        }
    },
    "pl": {
        "manualLog": {
            "title": "Reczne dodawanie",
            "placeholder": "Opisz co zjadles...",
            "quickAdd": "Szybkie dodawanie",
            "eggs": "Jajka",
            "banana": "Banan",
            "salad": "Salatka",
            "chicken": "Kurczak",
            "rice": "Ryz",
            "yogurt": "Jogurt",
            "logFood": "Zapisz posilek"
        }
    },
    "pt": {
        "manualLog": {
            "title": "Registo manual",
            "placeholder": "Descreva o que comeu...",
            "quickAdd": "Adicionar rapido",
            "eggs": "Ovos",
            "banana": "Banana",
            "salad": "Salada",
            "chicken": "Frango",
            "rice": "Arroz",
            "yogurt": "Iogurte",
            "logFood": "Registar refeicao"
        }
    },
    "pt-BR": {
        "manualLog": {
            "title": "Registro manual",
            "placeholder": "Descreva o que voce comeu...",
            "quickAdd": "Adicionar rapido",
            "eggs": "Ovos",
            "banana": "Banana",
            "salad": "Salada",
            "chicken": "Frango",
            "rice": "Arroz",
            "yogurt": "Iogurte",
            "logFood": "Registrar refeicao"
        }
    }
}

LANG_DIRS = {"en": "en", "de": "de", "es": "es", "fr": "fr", "nl": "nl", "pl": "pl", "pt": "pt", "pt-BR": "pt-BR"}

for lang, dir_name in LANG_DIRS.items():
    path = os.path.join(BASE, dir_name, "common.json")
    with open(path, "r") as f:
        data = json.load(f)
    t = TRANSLATIONS[lang]
    counts = {}
    for section, keys in t.items():
        if section not in data:
            data[section] = {}
        for k, v in keys.items():
            if k not in data[section]:
                data[section][k] = v
        counts[section] = len(keys)
    with open(path, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{lang}: {counts}")
