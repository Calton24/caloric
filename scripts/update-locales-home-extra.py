#!/usr/bin/env python3
"""Add missing home keys to all locale files."""
import json, os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

NEW_KEYS = {
    "en": {
        "swipeToDelete": "Swipe to Delete",
        "swipeHint": "Swipe any meal left to remove it",
        "sampleMeal": "Sample Meal",
        "sampleCal": "250 cal",
        "gotIt": "Got it!",
        "frequentlyAdded": "Frequently Added",
        "logFirstMeal": "Log your first meal to see frequently added foods here",
        "noMealsYet": "No meals logged yet",
        "tapToLog": "Tap + to snap, speak, or type your first meal",
        "steps": "Steps",
        "activeCal": "Active cal"
    },
    "de": {
        "swipeToDelete": "Wischen zum Loschen",
        "swipeHint": "Wische eine Mahlzeit nach links zum Entfernen",
        "sampleMeal": "Beispielmahlzeit",
        "sampleCal": "250 kcal",
        "gotIt": "Verstanden!",
        "frequentlyAdded": "Haufig hinzugefugt",
        "logFirstMeal": "Logge deine erste Mahlzeit, um haufig hinzugefugte Speisen hier zu sehen",
        "noMealsYet": "Noch keine Mahlzeiten geloggt",
        "tapToLog": "Tippe auf + zum Fotografieren, Sprechen oder Eingeben",
        "steps": "Schritte",
        "activeCal": "Aktive kcal"
    },
    "es": {
        "swipeToDelete": "Desliza para eliminar",
        "swipeHint": "Desliza cualquier comida a la izquierda para eliminarla",
        "sampleMeal": "Comida de ejemplo",
        "sampleCal": "250 cal",
        "gotIt": "Entendido!",
        "frequentlyAdded": "Agregados frecuentemente",
        "logFirstMeal": "Registra tu primera comida para ver alimentos frecuentes aqui",
        "noMealsYet": "Aun no hay comidas registradas",
        "tapToLog": "Toca + para fotografiar, hablar o escribir tu primera comida",
        "steps": "Pasos",
        "activeCal": "Cal activas"
    },
    "fr": {
        "swipeToDelete": "Glisser pour supprimer",
        "swipeHint": "Glissez un repas vers la gauche pour le supprimer",
        "sampleMeal": "Repas exemple",
        "sampleCal": "250 cal",
        "gotIt": "Compris !",
        "frequentlyAdded": "Ajoutes frequemment",
        "logFirstMeal": "Enregistrez votre premier repas pour voir les aliments frequents ici",
        "noMealsYet": "Aucun repas enregistre",
        "tapToLog": "Appuyez sur + pour photographier, parler ou saisir votre premier repas",
        "steps": "Pas",
        "activeCal": "Cal actives"
    },
    "nl": {
        "swipeToDelete": "Veeg om te verwijderen",
        "swipeHint": "Veeg een maaltijd naar links om te verwijderen",
        "sampleMeal": "Voorbeeldmaaltijd",
        "sampleCal": "250 cal",
        "gotIt": "Begrepen!",
        "frequentlyAdded": "Vaak toegevoegd",
        "logFirstMeal": "Log je eerste maaltijd om vaak toegevoegd voedsel hier te zien",
        "noMealsYet": "Nog geen maaltijden gelogd",
        "tapToLog": "Tik op + om te fotograferen, spreken of typen",
        "steps": "Stappen",
        "activeCal": "Actieve cal"
    },
    "pl": {
        "swipeToDelete": "Przesun, aby usunac",
        "swipeHint": "Przesun posilek w lewo, aby go usunac",
        "sampleMeal": "Przykladowy posilek",
        "sampleCal": "250 kcal",
        "gotIt": "Rozumiem!",
        "frequentlyAdded": "Czesto dodawane",
        "logFirstMeal": "Zaloguj pierwszy posilek, aby zobaczyc czesto dodawane jedzenie",
        "noMealsYet": "Brak zalogowanych posilkow",
        "tapToLog": "Dotknij + aby zrobic zdjecie, powiedziec lub wpisac posilek",
        "steps": "Kroki",
        "activeCal": "Aktywne kcal"
    },
    "pt": {
        "swipeToDelete": "Deslize para eliminar",
        "swipeHint": "Deslize qualquer refeicao para a esquerda para a remover",
        "sampleMeal": "Refeicao de exemplo",
        "sampleCal": "250 cal",
        "gotIt": "Entendido!",
        "frequentlyAdded": "Adicionados frequentemente",
        "logFirstMeal": "Registe a sua primeira refeicao para ver alimentos frequentes aqui",
        "noMealsYet": "Nenhuma refeicao registada",
        "tapToLog": "Toque em + para fotografar, falar ou escrever a sua primeira refeicao",
        "steps": "Passos",
        "activeCal": "Cal ativas"
    },
    "pt-BR": {
        "swipeToDelete": "Deslize para excluir",
        "swipeHint": "Deslize qualquer refeicao para a esquerda para remove-la",
        "sampleMeal": "Refeicao de exemplo",
        "sampleCal": "250 cal",
        "gotIt": "Entendi!",
        "frequentlyAdded": "Adicionados com frequencia",
        "logFirstMeal": "Registre sua primeira refeicao para ver alimentos frequentes aqui",
        "noMealsYet": "Nenhuma refeicao registrada",
        "tapToLog": "Toque em + para fotografar, falar ou digitar sua primeira refeicao",
        "steps": "Passos",
        "activeCal": "Cal ativas"
    }
}

for lang, keys in NEW_KEYS.items():
    path = os.path.join(LOCALES_DIR, lang, "common.json")
    with open(path, "r") as f:
        data = json.load(f)
    if "home" not in data:
        data["home"] = {}
    for k, v in keys.items():
        data["home"][k] = v
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Updated {lang}: +{len(keys)} home keys")

print("Done!")
