#!/usr/bin/env python3
"""Add extra settings keys (done, pro, legal, account) to all locale files."""
import json, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXTRA = {
    "en": {
        "common": {
            "done": "Done",
            "cancel": "Cancel",
            "error": "Error",
            "email": "Email"
        },
        "settings": {
            "youArePro": "You are Pro",
            "upgradeToPro": "Upgrade to Pro",
            "thankYou": "Thank you for your support!",
            "free": "Free",
            "challenge": "Challenge",
            "monthly": "Monthly",
            "yearly": "Yearly",
            "legal": "LEGAL",
            "privacyPolicy": "Privacy Policy",
            "termsOfService": "Terms of Service",
            "account": "ACCOUNT",
            "signOut": "Sign Out",
            "signOutConfirm": "Are you sure you want to sign out?",
            "deleteAccount": "Delete Account",
            "deleteAccountWarning": "This will permanently delete your account and all your data. This action cannot be undone.",
            "areYouSure": "Are you absolutely sure?",
            "deleteForever": "Delete Forever",
            "allDataErased": "All your meals, progress, and settings will be permanently erased.",
            "deleteError": "Could not delete account. Please try again.",
            "restoring": "Restoring…",
            "liveActivityDesc": "Showing the current progress on your lockscreen.",
            "iosOnly": "iOS Only",
            "iosOnlyDesc": "Live Activities are only available on iOS.",
            "liveActivityUnavailable": "Live Activities Unavailable",
            "liveActivityUnavailableDesc": "Make sure Live Activities are enabled in iOS Settings > Caloric > Live Activities, and that you're running iOS 16.2 or later."
        }
    },
    "de": {
        "common": {"done": "Fertig", "cancel": "Abbrechen", "error": "Fehler", "email": "E-Mail"},
        "settings": {
            "youArePro": "Du bist Pro", "upgradeToPro": "Auf Pro upgraden", "thankYou": "Danke für deine Unterstützung!",
            "free": "Kostenlos", "challenge": "Challenge", "monthly": "Monatlich", "yearly": "Jährlich",
            "legal": "RECHTLICHES", "privacyPolicy": "Datenschutzrichtlinie", "termsOfService": "Nutzungsbedingungen",
            "account": "KONTO", "signOut": "Abmelden", "signOutConfirm": "Möchtest du dich wirklich abmelden?",
            "deleteAccount": "Konto löschen", "deleteAccountWarning": "Dies löscht dein Konto und alle Daten dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.",
            "areYouSure": "Bist du dir absolut sicher?", "deleteForever": "Endgültig löschen",
            "allDataErased": "Alle Mahlzeiten, Fortschritte und Einstellungen werden dauerhaft gelöscht.",
            "deleteError": "Konto konnte nicht gelöscht werden. Bitte versuche es erneut.",
            "restoring": "Wird wiederhergestellt…",
            "liveActivityDesc": "Zeigt den aktuellen Fortschritt auf deinem Sperrbildschirm.",
            "iosOnly": "Nur iOS", "iosOnlyDesc": "Live-Aktivitäten sind nur auf iOS verfügbar.",
            "liveActivityUnavailable": "Live-Aktivitäten nicht verfügbar",
            "liveActivityUnavailableDesc": "Stelle sicher, dass Live-Aktivitäten in iOS-Einstellungen > Caloric > Live-Aktivitäten aktiviert sind und du iOS 16.2 oder neuer verwendest."
        }
    },
    "es": {
        "common": {"done": "Listo", "cancel": "Cancelar", "error": "Error", "email": "Correo"},
        "settings": {
            "youArePro": "Eres Pro", "upgradeToPro": "Mejorar a Pro", "thankYou": "¡Gracias por tu apoyo!",
            "free": "Gratis", "challenge": "Desafío", "monthly": "Mensual", "yearly": "Anual",
            "legal": "LEGAL", "privacyPolicy": "Política de privacidad", "termsOfService": "Términos de servicio",
            "account": "CUENTA", "signOut": "Cerrar sesión", "signOutConfirm": "¿Estás seguro de que quieres cerrar sesión?",
            "deleteAccount": "Eliminar cuenta", "deleteAccountWarning": "Esto eliminará permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.",
            "areYouSure": "¿Estás absolutamente seguro?", "deleteForever": "Eliminar para siempre",
            "allDataErased": "Todas tus comidas, progreso y ajustes serán eliminados permanentemente.",
            "deleteError": "No se pudo eliminar la cuenta. Inténtalo de nuevo.",
            "restoring": "Restaurando…",
            "liveActivityDesc": "Muestra el progreso actual en tu pantalla de bloqueo.",
            "iosOnly": "Solo iOS", "iosOnlyDesc": "Las actividades en vivo solo están disponibles en iOS.",
            "liveActivityUnavailable": "Actividades en vivo no disponibles",
            "liveActivityUnavailableDesc": "Asegúrate de que las actividades en vivo estén habilitadas en Ajustes de iOS > Caloric > Actividades en vivo, y que tengas iOS 16.2 o posterior."
        }
    },
    "fr": {
        "common": {"done": "Terminé", "cancel": "Annuler", "error": "Erreur", "email": "E-mail"},
        "settings": {
            "youArePro": "Vous êtes Pro", "upgradeToPro": "Passer à Pro", "thankYou": "Merci pour votre soutien !",
            "free": "Gratuit", "challenge": "Défi", "monthly": "Mensuel", "yearly": "Annuel",
            "legal": "MENTIONS LÉGALES", "privacyPolicy": "Politique de confidentialité", "termsOfService": "Conditions d'utilisation",
            "account": "COMPTE", "signOut": "Déconnexion", "signOutConfirm": "Êtes-vous sûr de vouloir vous déconnecter ?",
            "deleteAccount": "Supprimer le compte", "deleteAccountWarning": "Cela supprimera définitivement votre compte et toutes vos données. Cette action est irréversible.",
            "areYouSure": "Êtes-vous absolument sûr ?", "deleteForever": "Supprimer définitivement",
            "allDataErased": "Tous vos repas, progrès et paramètres seront définitivement supprimés.",
            "deleteError": "Impossible de supprimer le compte. Veuillez réessayer.",
            "restoring": "Restauration en cours…",
            "liveActivityDesc": "Affichage de la progression actuelle sur votre écran de verrouillage.",
            "iosOnly": "iOS uniquement", "iosOnlyDesc": "Les activités en direct ne sont disponibles que sur iOS.",
            "liveActivityUnavailable": "Activités en direct indisponibles",
            "liveActivityUnavailableDesc": "Assurez-vous que les activités en direct sont activées dans Réglages iOS > Caloric > Activités en direct, et que vous utilisez iOS 16.2 ou ultérieur."
        }
    },
    "nl": {
        "common": {"done": "Klaar", "cancel": "Annuleren", "error": "Fout", "email": "E-mail"},
        "settings": {
            "youArePro": "Je bent Pro", "upgradeToPro": "Upgrade naar Pro", "thankYou": "Bedankt voor je steun!",
            "free": "Gratis", "challenge": "Uitdaging", "monthly": "Maandelijks", "yearly": "Jaarlijks",
            "legal": "JURIDISCH", "privacyPolicy": "Privacybeleid", "termsOfService": "Servicevoorwaarden",
            "account": "ACCOUNT", "signOut": "Uitloggen", "signOutConfirm": "Weet je zeker dat je wilt uitloggen?",
            "deleteAccount": "Account verwijderen", "deleteAccountWarning": "Dit verwijdert je account en alle gegevens permanent. Deze actie kan niet ongedaan worden gemaakt.",
            "areYouSure": "Weet je het absoluut zeker?", "deleteForever": "Voorgoed verwijderen",
            "allDataErased": "Al je maaltijden, voortgang en instellingen worden permanent gewist.",
            "deleteError": "Account kon niet worden verwijderd. Probeer het opnieuw.",
            "restoring": "Herstellen…",
            "liveActivityDesc": "Toont de huidige voortgang op je vergrendelingsscherm.",
            "iosOnly": "Alleen iOS", "iosOnlyDesc": "Live activiteiten zijn alleen beschikbaar op iOS.",
            "liveActivityUnavailable": "Live activiteiten niet beschikbaar",
            "liveActivityUnavailableDesc": "Zorg ervoor dat Live activiteiten zijn ingeschakeld in iOS-instellingen > Caloric > Live activiteiten, en dat je iOS 16.2 of nieuwer gebruikt."
        }
    },
    "pl": {
        "common": {"done": "Gotowe", "cancel": "Anuluj", "error": "Błąd", "email": "E-mail"},
        "settings": {
            "youArePro": "Jesteś Pro", "upgradeToPro": "Przejdź na Pro", "thankYou": "Dziękujemy za wsparcie!",
            "free": "Darmowy", "challenge": "Wyzwanie", "monthly": "Miesięczny", "yearly": "Roczny",
            "legal": "PRAWNE", "privacyPolicy": "Polityka prywatności", "termsOfService": "Regulamin",
            "account": "KONTO", "signOut": "Wyloguj się", "signOutConfirm": "Czy na pewno chcesz się wylogować?",
            "deleteAccount": "Usuń konto", "deleteAccountWarning": "To trwale usunie twoje konto i wszystkie dane. Tej akcji nie można cofnąć.",
            "areYouSure": "Czy jesteś absolutnie pewien?", "deleteForever": "Usuń na zawsze",
            "allDataErased": "Wszystkie posiłki, postępy i ustawienia zostaną trwale usunięte.",
            "deleteError": "Nie udało się usunąć konta. Spróbuj ponownie.",
            "restoring": "Przywracanie…",
            "liveActivityDesc": "Wyświetlanie bieżącego postępu na ekranie blokady.",
            "iosOnly": "Tylko iOS", "iosOnlyDesc": "Aktywności na żywo są dostępne tylko na iOS.",
            "liveActivityUnavailable": "Aktywności na żywo niedostępne",
            "liveActivityUnavailableDesc": "Upewnij się, że aktywności na żywo są włączone w Ustawieniach iOS > Caloric > Aktywności na żywo i że używasz iOS 16.2 lub nowszego."
        }
    },
    "pt": {
        "common": {"done": "Concluído", "cancel": "Cancelar", "error": "Erro", "email": "E-mail"},
        "settings": {
            "youArePro": "É Pro", "upgradeToPro": "Atualizar para Pro", "thankYou": "Obrigado pelo seu apoio!",
            "free": "Grátis", "challenge": "Desafio", "monthly": "Mensal", "yearly": "Anual",
            "legal": "LEGAL", "privacyPolicy": "Política de privacidade", "termsOfService": "Termos de serviço",
            "account": "CONTA", "signOut": "Terminar sessão", "signOutConfirm": "Tem a certeza de que quer terminar sessão?",
            "deleteAccount": "Eliminar conta", "deleteAccountWarning": "Isto irá eliminar permanentemente a sua conta e todos os seus dados. Esta ação não pode ser desfeita.",
            "areYouSure": "Tem a certeza absoluta?", "deleteForever": "Eliminar para sempre",
            "allDataErased": "Todas as suas refeições, progresso e definições serão eliminados permanentemente.",
            "deleteError": "Não foi possível eliminar a conta. Tente novamente.",
            "restoring": "A restaurar…",
            "liveActivityDesc": "Mostra o progresso atual no seu ecrã de bloqueio.",
            "iosOnly": "Apenas iOS", "iosOnlyDesc": "As atividades em direto só estão disponíveis no iOS.",
            "liveActivityUnavailable": "Atividades em direto indisponíveis",
            "liveActivityUnavailableDesc": "Certifique-se de que as atividades em direto estão ativadas em Definições iOS > Caloric > Atividades em direto, e que está a usar iOS 16.2 ou posterior."
        }
    },
    "pt-BR": {
        "common": {"done": "Concluído", "cancel": "Cancelar", "error": "Erro", "email": "E-mail"},
        "settings": {
            "youArePro": "Você é Pro", "upgradeToPro": "Atualizar para Pro", "thankYou": "Obrigado pelo seu apoio!",
            "free": "Grátis", "challenge": "Desafio", "monthly": "Mensal", "yearly": "Anual",
            "legal": "LEGAL", "privacyPolicy": "Política de privacidade", "termsOfService": "Termos de serviço",
            "account": "CONTA", "signOut": "Sair", "signOutConfirm": "Tem certeza de que quer sair?",
            "deleteAccount": "Excluir conta", "deleteAccountWarning": "Isso excluirá permanentemente sua conta e todos os seus dados. Esta ação não pode ser desfeita.",
            "areYouSure": "Você tem certeza absoluta?", "deleteForever": "Excluir para sempre",
            "allDataErased": "Todas as suas refeições, progresso e configurações serão excluídos permanentemente.",
            "deleteError": "Não foi possível excluir a conta. Tente novamente.",
            "restoring": "Restaurando…",
            "liveActivityDesc": "Mostra o progresso atual na sua tela de bloqueio.",
            "iosOnly": "Apenas iOS", "iosOnlyDesc": "As atividades ao vivo só estão disponíveis no iOS.",
            "liveActivityUnavailable": "Atividades ao vivo indisponíveis",
            "liveActivityUnavailableDesc": "Certifique-se de que as atividades ao vivo estão ativadas em Configurações iOS > Caloric > Atividades ao vivo, e que você está usando iOS 16.2 ou posterior."
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
