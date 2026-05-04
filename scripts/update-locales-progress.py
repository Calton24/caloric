#!/usr/bin/env python3
"""Add progress-specific translation keys."""
import json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXTRA = {
    "en": {
        "progress": {
            "last7Days": "Last 7 Days", "last30Days": "Last 30 Days", "lastYear": "Last Year",
            "goalLabel": "Goal: {{weight}} {{unit}}", "current": "Current ({{unit}})",
            "lost": "Lost ({{unit}})", "toGoal": "To goal ({{unit}})",
            "calorieTrends": "Calorie Trends", "budgetLabel": "Budget: {{budget}} kcal",
            "noMealsLogged": "No meals logged in this period",
            "avgKcalDay": "Avg kcal/day", "avgProtein": "Avg protein", "onTarget": "On target",
            "logWeight": "Log Weight", "recalculatePlan": "Recalculate Plan",
            "cannotRecalculate": "Cannot Recalculate",
            "cannotRecalculateDesc": "Log a weight entry and complete onboarding first.",
            "planUpdated": "Plan Updated",
            "planUpdatedDesc": "Your plan has been recalculated using your latest weight of {{weight}}."
        }
    },
    "de": {
        "progress": {
            "last7Days": "Letzte 7 Tage", "last30Days": "Letzte 30 Tage", "lastYear": "Letztes Jahr",
            "goalLabel": "Ziel: {{weight}} {{unit}}", "current": "Aktuell ({{unit}})",
            "lost": "Verloren ({{unit}})", "toGoal": "Zum Ziel ({{unit}})",
            "calorieTrends": "Kalorientrends", "budgetLabel": "Budget: {{budget}} kcal",
            "noMealsLogged": "Keine Mahlzeiten in diesem Zeitraum erfasst",
            "avgKcalDay": "Ø kcal/Tag", "avgProtein": "Ø Protein", "onTarget": "Im Ziel",
            "logWeight": "Gewicht erfassen", "recalculatePlan": "Plan neu berechnen",
            "cannotRecalculate": "Kann nicht neu berechnen",
            "cannotRecalculateDesc": "Erfasse einen Gewichtseintrag und schließe das Onboarding ab.",
            "planUpdated": "Plan aktualisiert",
            "planUpdatedDesc": "Dein Plan wurde mit deinem aktuellen Gewicht von {{weight}} neu berechnet."
        }
    },
    "es": {
        "progress": {
            "last7Days": "Últimos 7 días", "last30Days": "Últimos 30 días", "lastYear": "Último año",
            "goalLabel": "Meta: {{weight}} {{unit}}", "current": "Actual ({{unit}})",
            "lost": "Perdido ({{unit}})", "toGoal": "Para meta ({{unit}})",
            "calorieTrends": "Tendencias de calorías", "budgetLabel": "Objetivo: {{budget}} kcal",
            "noMealsLogged": "No hay comidas registradas en este periodo",
            "avgKcalDay": "Prom kcal/día", "avgProtein": "Prom proteína", "onTarget": "En objetivo",
            "logWeight": "Registrar peso", "recalculatePlan": "Recalcular plan",
            "cannotRecalculate": "No se puede recalcular",
            "cannotRecalculateDesc": "Registra un peso y completa el onboarding primero.",
            "planUpdated": "Plan actualizado",
            "planUpdatedDesc": "Tu plan ha sido recalculado con tu peso actual de {{weight}}."
        }
    },
    "fr": {
        "progress": {
            "last7Days": "7 derniers jours", "last30Days": "30 derniers jours", "lastYear": "Dernière année",
            "goalLabel": "Objectif : {{weight}} {{unit}}", "current": "Actuel ({{unit}})",
            "lost": "Perdu ({{unit}})", "toGoal": "Objectif ({{unit}})",
            "calorieTrends": "Tendances caloriques", "budgetLabel": "Objectif : {{budget}} kcal",
            "noMealsLogged": "Aucun repas enregistré sur cette période",
            "avgKcalDay": "Moy kcal/jour", "avgProtein": "Moy protéines", "onTarget": "Dans l'objectif",
            "logWeight": "Enregistrer le poids", "recalculatePlan": "Recalculer le plan",
            "cannotRecalculate": "Impossible de recalculer",
            "cannotRecalculateDesc": "Enregistrez un poids et terminez l'onboarding d'abord.",
            "planUpdated": "Plan mis à jour",
            "planUpdatedDesc": "Votre plan a été recalculé avec votre poids actuel de {{weight}}."
        }
    },
    "nl": {
        "progress": {
            "last7Days": "Laatste 7 dagen", "last30Days": "Laatste 30 dagen", "lastYear": "Laatste jaar",
            "goalLabel": "Doel: {{weight}} {{unit}}", "current": "Huidig ({{unit}})",
            "lost": "Verloren ({{unit}})", "toGoal": "Naar doel ({{unit}})",
            "calorieTrends": "Calorietrends", "budgetLabel": "Budget: {{budget}} kcal",
            "noMealsLogged": "Geen maaltijden geregistreerd in deze periode",
            "avgKcalDay": "Gem kcal/dag", "avgProtein": "Gem eiwit", "onTarget": "Op schema",
            "logWeight": "Gewicht registreren", "recalculatePlan": "Plan herberekenen",
            "cannotRecalculate": "Kan niet herberekenen",
            "cannotRecalculateDesc": "Registreer een gewicht en voltooi het onboarding eerst.",
            "planUpdated": "Plan bijgewerkt",
            "planUpdatedDesc": "Je plan is herberekend met je huidige gewicht van {{weight}}."
        }
    },
    "pl": {
        "progress": {
            "last7Days": "Ostatnie 7 dni", "last30Days": "Ostatnie 30 dni", "lastYear": "Ostatni rok",
            "goalLabel": "Cel: {{weight}} {{unit}}", "current": "Obecna ({{unit}})",
            "lost": "Stracono ({{unit}})", "toGoal": "Do celu ({{unit}})",
            "calorieTrends": "Trendy kaloryczne", "budgetLabel": "Cel: {{budget}} kcal",
            "noMealsLogged": "Brak zarejestrowanych posiłków w tym okresie",
            "avgKcalDay": "Śr kcal/dzień", "avgProtein": "Śr białko", "onTarget": "W celu",
            "logWeight": "Zarejestruj wagę", "recalculatePlan": "Przelicz plan",
            "cannotRecalculate": "Nie można przeliczyć",
            "cannotRecalculateDesc": "Zarejestruj wagę i ukończ onboarding.",
            "planUpdated": "Plan zaktualizowany",
            "planUpdatedDesc": "Twój plan został przeliczony z aktualną wagą {{weight}}."
        }
    },
    "pt": {
        "progress": {
            "last7Days": "Últimos 7 dias", "last30Days": "Últimos 30 dias", "lastYear": "Último ano",
            "goalLabel": "Objetivo: {{weight}} {{unit}}", "current": "Atual ({{unit}})",
            "lost": "Perdido ({{unit}})", "toGoal": "Para objetivo ({{unit}})",
            "calorieTrends": "Tendências calóricas", "budgetLabel": "Objetivo: {{budget}} kcal",
            "noMealsLogged": "Sem refeições registadas neste período",
            "avgKcalDay": "Méd kcal/dia", "avgProtein": "Méd proteína", "onTarget": "No objetivo",
            "logWeight": "Registar peso", "recalculatePlan": "Recalcular plano",
            "cannotRecalculate": "Não é possível recalcular",
            "cannotRecalculateDesc": "Registe um peso e complete o onboarding primeiro.",
            "planUpdated": "Plano atualizado",
            "planUpdatedDesc": "O seu plano foi recalculado com o seu peso atual de {{weight}}."
        }
    },
    "pt-BR": {
        "progress": {
            "last7Days": "Últimos 7 dias", "last30Days": "Últimos 30 dias", "lastYear": "Último ano",
            "goalLabel": "Meta: {{weight}} {{unit}}", "current": "Atual ({{unit}})",
            "lost": "Perdido ({{unit}})", "toGoal": "Para meta ({{unit}})",
            "calorieTrends": "Tendências de calorias", "budgetLabel": "Meta: {{budget}} kcal",
            "noMealsLogged": "Nenhuma refeição registrada neste período",
            "avgKcalDay": "Méd kcal/dia", "avgProtein": "Méd proteína", "onTarget": "Na meta",
            "logWeight": "Registrar peso", "recalculatePlan": "Recalcular plano",
            "cannotRecalculate": "Não é possível recalcular",
            "cannotRecalculateDesc": "Registre um peso e complete o onboarding primeiro.",
            "planUpdated": "Plano atualizado",
            "planUpdatedDesc": "Seu plano foi recalculado com seu peso atual de {{weight}}."
        }
    }
}

LOCALE_MAP = {
    "en": os.path.join(BASE, "src/locales/en/common.json"),
    "de": os.path.join(BASE, "src/locales/de/common.json"),
    "es": os.path.join(BASE, "src/locales/es/common.json"),
    "fr": os.path.join(BASE, "src/locales/fr/common.json"),
    "nl": os.path.join(BASE, "src/locales/nl/common.json"),
    "pl": os.path.join(BASE, "src/locales/pl/common.json"),
    "pt": os.path.join(BASE, "src/locales/pt/common.json"),
    "pt-BR": os.path.join(BASE, "src/locales/pt-BR/common.json"),
}

for lang, path in LOCALE_MAP.items():
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    for section, keys in EXTRA.get(lang, {}).items():
        if section not in data:
            data[section] = {}
        for k, v in keys.items():
            data[section][k] = v
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Updated {lang}")
print("Done!")
