#!/usr/bin/env python3
"""Add missing settings keys to all locale files."""
import json, os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "locales")

NEW_KEYS = {
    "en": {
        "settings": "Settings",
        "goalPlan": "GOAL PLAN",
        "editGoals": "Edit Goals",
        "activityLevel": "Activity Level",
        "microphone": "Microphone",
        "camera": "Camera",
        "integrations": "INTEGRATIONS",
        "permissions": "PERMISSIONS",
        "appleHealthRead": "Apple Health (Read)",
        "appleHealthWrite": "Apple Health (Write)",
        "exportMeals": "Export Meals",
        "exportWeight": "Export Weight",
        "exportAllData": "Export All Data",
        "yourePro": "You're Pro",
        "email": "Email",
        "delete": "Delete",
        "deletionFailed": "Deletion Failed",
        "deletionFailedDesc": "Unable to delete account. Please contact support at support@caloric.app",
        "deleteAccountConfirm": "This will permanently delete your account and all associated data. This action cannot be undone.\n\nAre you sure you want to continue?"
    },
    "de": {
        "settings": "Einstellungen",
        "goalPlan": "ZIELPLAN",
        "editGoals": "Ziele bearbeiten",
        "activityLevel": "Aktivitatsniveau",
        "microphone": "Mikrofon",
        "camera": "Kamera",
        "integrations": "INTEGRATIONEN",
        "permissions": "BERECHTIGUNGEN",
        "appleHealthRead": "Apple Health (Lesen)",
        "appleHealthWrite": "Apple Health (Schreiben)",
        "exportMeals": "Mahlzeiten exportieren",
        "exportWeight": "Gewicht exportieren",
        "exportAllData": "Alle Daten exportieren",
        "yourePro": "Du bist Pro",
        "email": "E-Mail",
        "delete": "Loschen",
        "deletionFailed": "Loschung fehlgeschlagen",
        "deletionFailedDesc": "Konto konnte nicht geloscht werden. Bitte kontaktiere den Support unter support@caloric.app",
        "deleteAccountConfirm": "Dadurch werden dein Konto und alle zugehorigen Daten dauerhaft geloscht. Dies kann nicht ruckgangig gemacht werden.\n\nBist du sicher?"
    },
    "es": {
        "settings": "Ajustes",
        "goalPlan": "PLAN DE OBJETIVOS",
        "editGoals": "Editar objetivos",
        "activityLevel": "Nivel de actividad",
        "microphone": "Microfono",
        "camera": "Camara",
        "integrations": "INTEGRACIONES",
        "permissions": "PERMISOS",
        "appleHealthRead": "Apple Health (Lectura)",
        "appleHealthWrite": "Apple Health (Escritura)",
        "exportMeals": "Exportar comidas",
        "exportWeight": "Exportar peso",
        "exportAllData": "Exportar todos los datos",
        "yourePro": "Eres Pro",
        "email": "Correo",
        "delete": "Eliminar",
        "deletionFailed": "Error al eliminar",
        "deletionFailedDesc": "No se pudo eliminar la cuenta. Contacta soporte en support@caloric.app",
        "deleteAccountConfirm": "Esto eliminara permanentemente tu cuenta y todos los datos asociados. Esta accion no se puede deshacer.\n\nEstas seguro?"
    },
    "fr": {
        "settings": "Parametres",
        "goalPlan": "PLAN D'OBJECTIFS",
        "editGoals": "Modifier les objectifs",
        "activityLevel": "Niveau d'activite",
        "microphone": "Microphone",
        "camera": "Camera",
        "integrations": "INTEGRATIONS",
        "permissions": "AUTORISATIONS",
        "appleHealthRead": "Apple Health (Lecture)",
        "appleHealthWrite": "Apple Health (Ecriture)",
        "exportMeals": "Exporter les repas",
        "exportWeight": "Exporter le poids",
        "exportAllData": "Exporter toutes les donnees",
        "yourePro": "Vous etes Pro",
        "email": "E-mail",
        "delete": "Supprimer",
        "deletionFailed": "Suppression echouee",
        "deletionFailedDesc": "Impossible de supprimer le compte. Contactez le support a support@caloric.app",
        "deleteAccountConfirm": "Cela supprimera definitivement votre compte et toutes les donnees associees. Cette action est irreversible.\n\nEtes-vous sur ?"
    },
    "nl": {
        "settings": "Instellingen",
        "goalPlan": "DOELPLAN",
        "editGoals": "Doelen bewerken",
        "activityLevel": "Activiteitsniveau",
        "microphone": "Microfoon",
        "camera": "Camera",
        "integrations": "INTEGRATIES",
        "permissions": "MACHTIGINGEN",
        "appleHealthRead": "Apple Health (Lezen)",
        "appleHealthWrite": "Apple Health (Schrijven)",
        "exportMeals": "Maaltijden exporteren",
        "exportWeight": "Gewicht exporteren",
        "exportAllData": "Alle gegevens exporteren",
        "yourePro": "Je bent Pro",
        "email": "E-mail",
        "delete": "Verwijderen",
        "deletionFailed": "Verwijdering mislukt",
        "deletionFailedDesc": "Account kon niet worden verwijderd. Neem contact op met support@caloric.app",
        "deleteAccountConfirm": "Dit zal je account en alle bijbehorende gegevens permanent verwijderen. Dit kan niet ongedaan worden gemaakt.\n\nWeet je het zeker?"
    },
    "pl": {
        "settings": "Ustawienia",
        "goalPlan": "PLAN CELU",
        "editGoals": "Edytuj cele",
        "activityLevel": "Poziom aktywnosci",
        "microphone": "Mikrofon",
        "camera": "Kamera",
        "integrations": "INTEGRACJE",
        "permissions": "UPRAWNIENIA",
        "appleHealthRead": "Apple Health (Odczyt)",
        "appleHealthWrite": "Apple Health (Zapis)",
        "exportMeals": "Eksportuj posilki",
        "exportWeight": "Eksportuj wage",
        "exportAllData": "Eksportuj wszystkie dane",
        "yourePro": "Jestes Pro",
        "email": "E-mail",
        "delete": "Usun",
        "deletionFailed": "Usuwanie nie powiodlo sie",
        "deletionFailedDesc": "Nie mozna usunac konta. Skontaktuj sie z pomoca pod support@caloric.app",
        "deleteAccountConfirm": "To trwale usunie Twoje konto i wszystkie powiazane dane. Tej operacji nie mozna cofnac.\n\nCzy jestes pewien?"
    },
    "pt": {
        "settings": "Definicoes",
        "goalPlan": "PLANO DE OBJETIVOS",
        "editGoals": "Editar objetivos",
        "activityLevel": "Nivel de atividade",
        "microphone": "Microfone",
        "camera": "Camara",
        "integrations": "INTEGRACOES",
        "permissions": "PERMISSOES",
        "appleHealthRead": "Apple Health (Leitura)",
        "appleHealthWrite": "Apple Health (Escrita)",
        "exportMeals": "Exportar refeicoes",
        "exportWeight": "Exportar peso",
        "exportAllData": "Exportar todos os dados",
        "yourePro": "Es Pro",
        "email": "E-mail",
        "delete": "Eliminar",
        "deletionFailed": "Falha na eliminacao",
        "deletionFailedDesc": "Nao foi possivel eliminar a conta. Contacte o suporte em support@caloric.app",
        "deleteAccountConfirm": "Isto ira eliminar permanentemente a sua conta e todos os dados associados. Esta acao nao pode ser desfeita.\n\nTem a certeza?"
    },
    "pt-BR": {
        "settings": "Configuracoes",
        "goalPlan": "PLANO DE OBJETIVOS",
        "editGoals": "Editar objetivos",
        "activityLevel": "Nivel de atividade",
        "microphone": "Microfone",
        "camera": "Camera",
        "integrations": "INTEGRACOES",
        "permissions": "PERMISSOES",
        "appleHealthRead": "Apple Health (Leitura)",
        "appleHealthWrite": "Apple Health (Escrita)",
        "exportMeals": "Exportar refeicoes",
        "exportWeight": "Exportar peso",
        "exportAllData": "Exportar todos os dados",
        "yourePro": "Voce e Pro",
        "email": "E-mail",
        "delete": "Excluir",
        "deletionFailed": "Falha na exclusao",
        "deletionFailedDesc": "Nao foi possivel excluir a conta. Entre em contato com o suporte em support@caloric.app",
        "deleteAccountConfirm": "Isso excluira permanentemente sua conta e todos os dados associados. Esta acao nao pode ser desfeita.\n\nVoce tem certeza?"
    }
}

for lang, keys in NEW_KEYS.items():
    path = os.path.join(LOCALES_DIR, lang, "common.json")
    with open(path, "r") as f:
        data = json.load(f)
    if "settings" not in data:
        data["settings"] = {}
    for k, v in keys.items():
        data["settings"][k] = v
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Updated {lang}: +{len(keys)} settings keys")

print("Done!")
