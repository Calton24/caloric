#!/usr/bin/env python3
import json, os

keys_per_lang = {
    "en": {"tracking": {"guide": "Guide", "guideDesc": "Describe what you ate naturally. Caloric will identify the food items and estimate nutrition.", "type": "Type", "scan": "Scan"}},
    "de": {"tracking": {"guide": "Anleitung", "guideDesc": "Beschreibe natürlich, was du gegessen hast. Caloric erkennt die Lebensmittel und schätzt die Nährwerte.", "type": "Tippen", "scan": "Scannen"}},
    "es": {"tracking": {"guide": "Guía", "guideDesc": "Describe lo que comiste de forma natural. Caloric identificará los alimentos y estimará la nutrición.", "type": "Escribir", "scan": "Escanear"}},
    "fr": {"tracking": {"guide": "Guide", "guideDesc": "Décris naturellement ce que tu as mangé. Caloric identifiera les aliments et estimera la nutrition.", "type": "Taper", "scan": "Scanner"}},
    "nl": {"tracking": {"guide": "Gids", "guideDesc": "Beschrijf op een natuurlijke manier wat je hebt gegeten. Caloric herkent de voedingsmiddelen en schat de voedingswaarde.", "type": "Typen", "scan": "Scannen"}},
    "pl": {"tracking": {"guide": "Poradnik", "guideDesc": "Opisz naturalnie, co zjadłeś. Caloric rozpozna produkty i oszacuje wartości odżywcze.", "type": "Pisz", "scan": "Skanuj"}},
    "pt": {"tracking": {"guide": "Guia", "guideDesc": "Descreve naturalmente o que comeste. O Caloric identifica os alimentos e estima a nutrição.", "type": "Escrever", "scan": "Digitalizar"}},
    "pt-BR": {"tracking": {"guide": "Guia", "guideDesc": "Descreva naturalmente o que você comeu. O Caloric identificará os alimentos e estimará a nutrição.", "type": "Digitar", "scan": "Escanear"}},
}

dirs = {"en": "src/locales/en", "de": "src/locales/de", "es": "src/locales/es", "fr": "src/locales/fr", "nl": "src/locales/nl", "pl": "src/locales/pl", "pt": "src/locales/pt", "pt-BR": "src/locales/pt-BR"}

for lang, d in dirs.items():
    p = os.path.join(d, "common.json")
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    src = keys_per_lang[lang]
    for sec, kv in src.items():
        if sec not in data:
            data[sec] = {}
        for k, v in kv.items():
            if k not in data[sec]:
                data[sec][k] = v
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"{lang}: done")
