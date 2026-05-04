#!/usr/bin/env python3
import json, os

BASE = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

TRANSLATIONS = {
    "en": {
        "camera": {
            "analyzing": "Analyzing",
            "couldntIdentify": "Couldn't Identify",
            "couldntIdentifyTitle": "We couldn't identify this food",
            "describeHint": "Describe what you see and we'll look it up",
            "placeholder": "e.g., Walkers Sensations Thai Sweet Chilli crisps",
            "lookItUp": "Look it up",
            "retry": "Retry",
            "retake": "Retake",
            "scanHint": "Point at food or scan a barcode",
            "freeScansRemaining": "{{count}} free scan remaining",
            "freeScansRemaining_plural": "{{count}} free scans remaining"
        }
    },
    "de": {
        "camera": {
            "analyzing": "Analyse laeuft",
            "couldntIdentify": "Nicht erkannt",
            "couldntIdentifyTitle": "Wir konnten dieses Essen nicht erkennen",
            "describeHint": "Beschreibe was du siehst und wir suchen es",
            "placeholder": "z.B. Haehnchen mit Reis und Gemuese",
            "lookItUp": "Nachschlagen",
            "retry": "Wiederholen",
            "retake": "Neu aufnehmen",
            "scanHint": "Auf Essen zeigen oder Barcode scannen",
            "freeScansRemaining": "{{count}} kostenloser Scan uebrig",
            "freeScansRemaining_plural": "{{count}} kostenlose Scans uebrig"
        }
    },
    "es": {
        "camera": {
            "analyzing": "Analizando",
            "couldntIdentify": "No se pudo identificar",
            "couldntIdentifyTitle": "No pudimos identificar esta comida",
            "describeHint": "Describe lo que ves y lo buscaremos",
            "placeholder": "ej., Pollo con arroz y verduras",
            "lookItUp": "Buscar",
            "retry": "Reintentar",
            "retake": "Volver a capturar",
            "scanHint": "Apunta a la comida o escanea un codigo de barras",
            "freeScansRemaining": "{{count}} escaneo gratuito restante",
            "freeScansRemaining_plural": "{{count}} escaneos gratuitos restantes"
        }
    },
    "fr": {
        "camera": {
            "analyzing": "Analyse en cours",
            "couldntIdentify": "Non identifie",
            "couldntIdentifyTitle": "Nous n'avons pas pu identifier cet aliment",
            "describeHint": "Decrivez ce que vous voyez et nous le chercherons",
            "placeholder": "ex., Poulet avec riz et legumes",
            "lookItUp": "Rechercher",
            "retry": "Reessayer",
            "retake": "Reprendre la photo",
            "scanHint": "Pointez vers la nourriture ou scannez un code-barres",
            "freeScansRemaining": "{{count}} scan gratuit restant",
            "freeScansRemaining_plural": "{{count}} scans gratuits restants"
        }
    },
    "nl": {
        "camera": {
            "analyzing": "Analyseren",
            "couldntIdentify": "Niet herkend",
            "couldntIdentifyTitle": "We konden dit eten niet herkennen",
            "describeHint": "Beschrijf wat je ziet en we zoeken het op",
            "placeholder": "bijv., Kip met rijst en groenten",
            "lookItUp": "Opzoeken",
            "retry": "Opnieuw proberen",
            "retake": "Opnieuw fotograferen",
            "scanHint": "Richt op eten of scan een barcode",
            "freeScansRemaining": "{{count}} gratis scan over",
            "freeScansRemaining_plural": "{{count}} gratis scans over"
        }
    },
    "pl": {
        "camera": {
            "analyzing": "Analizowanie",
            "couldntIdentify": "Nie rozpoznano",
            "couldntIdentifyTitle": "Nie udalo sie rozpoznac tego jedzenia",
            "describeHint": "Opisz co widzisz, a my to wyszukamy",
            "placeholder": "np. Kurczak z ryzem i warzywami",
            "lookItUp": "Wyszukaj",
            "retry": "Ponow probe",
            "retake": "Zrob ponownie zdjecie",
            "scanHint": "Skieruj na jedzenie lub zeskanuj kod kreskowy",
            "freeScansRemaining": "{{count}} darmowy skan pozostaly",
            "freeScansRemaining_plural": "{{count}} darmowych skanow pozostalych"
        }
    },
    "pt": {
        "camera": {
            "analyzing": "A analisar",
            "couldntIdentify": "Nao identificado",
            "couldntIdentifyTitle": "Nao conseguimos identificar esta comida",
            "describeHint": "Descreva o que ve e nos procuramos",
            "placeholder": "ex., Frango com arroz e legumes",
            "lookItUp": "Procurar",
            "retry": "Tentar novamente",
            "retake": "Tirar outra foto",
            "scanHint": "Aponte para a comida ou digitalize um codigo de barras",
            "freeScansRemaining": "{{count}} digitalizacao gratuita restante",
            "freeScansRemaining_plural": "{{count}} digitalizacoes gratuitas restantes"
        }
    },
    "pt-BR": {
        "camera": {
            "analyzing": "Analisando",
            "couldntIdentify": "Nao identificado",
            "couldntIdentifyTitle": "Nao conseguimos identificar esta comida",
            "describeHint": "Descreva o que voce ve e vamos procurar",
            "placeholder": "ex., Frango com arroz e legumes",
            "lookItUp": "Buscar",
            "retry": "Tentar novamente",
            "retake": "Tirar outra foto",
            "scanHint": "Aponte para a comida ou escaneie um codigo de barras",
            "freeScansRemaining": "{{count}} escaneamento gratuito restante",
            "freeScansRemaining_plural": "{{count}} escaneamentos gratuitos restantes"
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
