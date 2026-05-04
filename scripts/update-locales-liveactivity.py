#!/usr/bin/env python3
import json, os

BASE = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

TRANSLATIONS = {
    "en": {
        "liveActivity": {
            "iosOnly": "iOS Only",
            "iosOnlyDesc": "Live Activities are only available on iOS devices.",
            "unavailable": "Live Activities Unavailable",
            "unavailableDesc": "Please enable Live Activities in iOS Settings > Caloric > Live Activities, and make sure you're running iOS 16.2 or later.",
            "continueWithout": "Continue Without",
            "subtitle": "Track your calories in real-time right from your Lock Screen and Dynamic Island.",
            "notNow": "Not now"
        }
    },
    "de": {
        "liveActivity": {
            "iosOnly": "Nur iOS",
            "iosOnlyDesc": "Live-Aktivitaeten sind nur auf iOS-Geraeten verfuegbar.",
            "unavailable": "Live-Aktivitaeten nicht verfuegbar",
            "unavailableDesc": "Bitte aktiviere Live-Aktivitaeten in iOS Einstellungen > Caloric > Live-Aktivitaeten und stelle sicher, dass du iOS 16.2 oder neuer verwendest.",
            "continueWithout": "Ohne fortfahren",
            "subtitle": "Verfolge deine Kalorien in Echtzeit direkt auf deinem Sperrbildschirm und der Dynamic Island.",
            "notNow": "Nicht jetzt"
        }
    },
    "es": {
        "liveActivity": {
            "iosOnly": "Solo iOS",
            "iosOnlyDesc": "Las actividades en vivo solo estan disponibles en dispositivos iOS.",
            "unavailable": "Actividades en vivo no disponibles",
            "unavailableDesc": "Por favor activa las actividades en vivo en Ajustes iOS > Caloric > Actividades en vivo, y asegurate de tener iOS 16.2 o posterior.",
            "continueWithout": "Continuar sin",
            "subtitle": "Rastrea tus calorias en tiempo real directamente desde tu pantalla de bloqueo y Dynamic Island.",
            "notNow": "Ahora no"
        }
    },
    "fr": {
        "liveActivity": {
            "iosOnly": "iOS uniquement",
            "iosOnlyDesc": "Les activites en direct ne sont disponibles que sur les appareils iOS.",
            "unavailable": "Activites en direct indisponibles",
            "unavailableDesc": "Veuillez activer les activites en direct dans Reglages iOS > Caloric > Activites en direct, et assurez-vous d'utiliser iOS 16.2 ou ulterieur.",
            "continueWithout": "Continuer sans",
            "subtitle": "Suivez vos calories en temps reel directement depuis votre ecran de verrouillage et Dynamic Island.",
            "notNow": "Pas maintenant"
        }
    },
    "nl": {
        "liveActivity": {
            "iosOnly": "Alleen iOS",
            "iosOnlyDesc": "Live activiteiten zijn alleen beschikbaar op iOS-apparaten.",
            "unavailable": "Live activiteiten niet beschikbaar",
            "unavailableDesc": "Schakel live activiteiten in via iOS Instellingen > Caloric > Live activiteiten en zorg dat je iOS 16.2 of nieuwer gebruikt.",
            "continueWithout": "Ga verder zonder",
            "subtitle": "Volg je calorieen in realtime direct vanaf je vergrendelscherm en Dynamic Island.",
            "notNow": "Niet nu"
        }
    },
    "pl": {
        "liveActivity": {
            "iosOnly": "Tylko iOS",
            "iosOnlyDesc": "Aktywnosci na zywo sa dostepne tylko na urzadzeniach iOS.",
            "unavailable": "Aktywnosci na zywo niedostepne",
            "unavailableDesc": "Wlacz aktywnosci na zywo w Ustawieniach iOS > Caloric > Aktywnosci na zywo i upewnij sie, ze masz iOS 16.2 lub nowszy.",
            "continueWithout": "Kontynuuj bez",
            "subtitle": "Sledz swoje kalorie w czasie rzeczywistym bezposrednio z ekranu blokady i Dynamic Island.",
            "notNow": "Nie teraz"
        }
    },
    "pt": {
        "liveActivity": {
            "iosOnly": "Apenas iOS",
            "iosOnlyDesc": "As atividades em tempo real so estao disponiveis em dispositivos iOS.",
            "unavailable": "Atividades em tempo real indisponiveis",
            "unavailableDesc": "Ative as atividades em tempo real em Definicoes iOS > Caloric > Atividades em tempo real e certifique-se que tem iOS 16.2 ou posterior.",
            "continueWithout": "Continuar sem",
            "subtitle": "Acompanhe as suas calorias em tempo real diretamente no ecra de bloqueio e Dynamic Island.",
            "notNow": "Agora nao"
        }
    },
    "pt-BR": {
        "liveActivity": {
            "iosOnly": "Apenas iOS",
            "iosOnlyDesc": "As atividades ao vivo so estao disponiveis em dispositivos iOS.",
            "unavailable": "Atividades ao vivo indisponiveis",
            "unavailableDesc": "Ative as atividades ao vivo em Ajustes iOS > Caloric > Atividades ao vivo e certifique-se de que voce tem iOS 16.2 ou posterior.",
            "continueWithout": "Continuar sem",
            "subtitle": "Acompanhe suas calorias em tempo real diretamente na tela de bloqueio e Dynamic Island.",
            "notNow": "Agora nao"
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
