#!/usr/bin/env python3
"""Write all locale files with complete translations including onboarding keys."""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'locales')

locales = {
    "fr": {
        "app": {"title": "Caloric"},
        "auth": {
            "signIn": "Se connecter",
            "signUp": "S'inscrire",
            "signOut": "Se d\u00e9connecter",
            "email": "E-mail",
            "password": "Mot de passe",
            "confirmPassword": "Confirmer le mot de passe",
            "forgotPassword": "Mot de passe oubli\u00e9 ?",
            "createAccount": "Cr\u00e9er un compte",
            "welcome": "Bienvenue",
            "signInToContinue": "Connectez-vous pour continuer",
            "signUpToGetStarted": "Inscrivez-vous pour commencer",
            "signInWithApple": "Se connecter avec Apple",
            "signInWithGoogle": "Se connecter avec Google",
            "continueWithEmail": "Continuer avec e-mail",
            "comingSoon": "Bient\u00f4t disponible",
            "appleComingSoon": "La connexion avec Apple sera disponible dans une future mise \u00e0 jour.",
            "googleUnavailable": "La connexion Google est d\u00e9sactiv\u00e9e pour cette app.",
            "signInFailed": "\u00c9chec de connexion",
            "signUpFailed": "\u00c9chec d'inscription",
            "enterEmailPassword": "Veuillez entrer e-mail et mot de passe",
            "passwordsMismatch": "Les mots de passe ne correspondent pas",
            "passwordTooShort": "Le mot de passe doit contenir au moins 6 caract\u00e8res",
            "alreadyHaveAccount": "D\u00e9j\u00e0 un compte ? Se connecter",
            "needAccount": "Pas de compte ? S'inscrire",
            "unavailable": "Non disponible"
        },
        "common": {
            "cancel": "Annuler",
            "save": "Enregistrer",
            "loading": "Chargement\u2026",
            "done": "Termin\u00e9",
            "delete": "Supprimer",
            "edit": "Modifier",
            "back": "Retour",
            "next": "Suivant",
            "ok": "OK",
            "error": "Erreur",
            "success": "Succ\u00e8s",
            "retry": "R\u00e9essayer",
            "continue": "Continuer",
            "letsGo": "C'est parti !",
            "weeks": "Semaines",
            "years": "ans",
            "recommended": "Recommand\u00e9"
        },
        "calories": {
            "label": "Calories",
            "value_one": "{{count}} calorie",
            "value_other": "{{count}} calories"
        },
        "landing": {
            "headline": "21 jours pour de\nmeilleures habitudes",
            "subline": "Prenez une photo. L'IA fait le reste.\nPas de comptage. Pas d'approximation.",
            "cta": "D\u00e9marrer 21 jours",
            "ctaConfirm": "Jour 1 commence",
            "signInPrompt": "D\u00e9j\u00e0 un compte ? ",
            "signIn": "Se connecter"
        },
        "onboarding": {
            "goal": {
                "heading": "Quel est votre\nobjectif ?",
                "description": "Nous adapterons vos objectifs caloriques quotidiens.",
                "loseWeight": "Perdre du poids",
                "loseWeightDesc": "D\u00e9ficit calorique avec des objectifs guid\u00e9s",
                "maintainWeight": "Maintenir le poids",
                "maintainWeightDesc": "Garder votre \u00e9quilibre actuel",
                "gainMuscle": "Prendre du muscle",
                "gainMuscleDesc": "Surplus calorique pour la croissance",
                "eatHealthier": "Manger plus sain",
                "eatHealthierDesc": "Focus sur la qualit\u00e9 nutritionnelle"
            },
            "body": {
                "heading": "Parlez-nous\nde vous",
                "description": "Nous en avons besoin pour calculer vos besoins caloriques.",
                "imperial": "Imp\u00e9rial",
                "metric": "M\u00e9trique",
                "gender": "Genre",
                "male": "Homme",
                "female": "Femme",
                "age": "\u00c2ge",
                "height": "Taille",
                "weight": "Poids",
                "ft": "ft",
                "in": "in",
                "cm": "cm",
                "lbs": "lbs",
                "kg": "kg"
            },
            "activity": {
                "heading": "Quel est votre\nniveau d'activit\u00e9 ?",
                "description": "Cela nous aide \u00e0 estimer vos besoins \u00e9nerg\u00e9tiques quotidiens.",
                "sedentary": "S\u00e9dentaire",
                "sedentaryDesc": "Peu ou pas d'exercice",
                "light": "L\u00e9g\u00e8rement actif",
                "lightDesc": "Exercice l\u00e9ger 1\u20133 jours/semaine",
                "moderate": "Mod\u00e9r\u00e9ment actif",
                "moderateDesc": "Exercice mod\u00e9r\u00e9 3\u20135 jours/semaine",
                "very": "Tr\u00e8s actif",
                "veryDesc": "Exercice intense 6\u20137 jours/semaine"
            },
            "weightGoal": {
                "heading": "Quel est votre\npoids cible ?",
                "description": "Fixez un objectif qui vous convient.",
                "comparison": "Comparaison de poids",
                "current": "Actuel",
                "goal": "Objectif",
                "underweight": "Insuffisance pond\u00e9rale",
                "normal": "Normal",
                "overweight": "Surpoids",
                "obese": "Ob\u00e9sit\u00e9"
            },
            "timeframe": {
                "heading": "Choisissez\nvotre rythme",
                "description": "\u00c0 quelle vitesse voulez-vous atteindre {{weight}} {{unit}} ?",
                "weeksCount": "{{count}} Semaines",
                "perWeek": "{{rate}} {{unit}}/semaine",
                "relaxed": "D\u00e9tendu",
                "realistic": "R\u00e9aliste",
                "ambitious": "Ambitieux",
                "challenging": "Exigeant"
            },
            "calculating": {
                "heading": "Cr\u00e9ation de votre\nplan en cours\u2026",
                "subtitle": "Nous calculons tout sp\u00e9cialement pour vous",
                "step1": "Analyse de la composition corporelle\u2026",
                "step2": "Calcul des besoins \u00e9nerg\u00e9tiques\u2026",
                "step3": "Construction de la r\u00e9partition des macros\u2026",
                "step4": "Optimisation des horaires de repas\u2026",
                "step5": "Finalisation de votre plan\u2026"
            },
            "plan": {
                "heading": "Votre plan est\npr\u00eat 🎉",
                "subtitle": "Voici ce que nous avons cr\u00e9\u00e9 pour vous",
                "dailyCalorieTarget": "OBJECTIF CALORIQUE QUOTIDIEN",
                "kcalPerDay": "kcal / jour",
                "dailyMacros": "MACROS QUOTIDIENS",
                "protein": "Prot\u00e9ines",
                "carbs": "Glucides",
                "fat": "Lipides",
                "reachGoal": "Atteindre {{weight}} {{unit}} d'ici le {{date}}",
                "weeksToLose": "{{weeks}} semaines \u00b7 {{amount}} {{unit}} \u00e0 perdre",
                "socialProof": "12 847 personnes ont commenc\u00e9 un plan similaire cette semaine"
            },
            "saveProgress": {
                "heading": "Ne perdez pas\nvotre plan",
                "subtitle": "Cr\u00e9ez un compte pour synchroniser vos objectifs caloriques, macros et progr\u00e8s sur tous vos appareils.",
                "socialProof": "2 400+ utilisateurs se sont inscrits cette semaine",
                "privacy": "Vos donn\u00e9es restent priv\u00e9es",
                "speed": "Prend 5 secondes"
            },
            "complete": {
                "heading": "Tout est pr\u00eat !",
                "subtitle": "Votre plan personnalis\u00e9 est pr\u00eat.\nC'est le moment de commencer.",
                "kcalDay": "{{count}} kcal/jour",
                "goalWeight": "{{weight}} objectif",
                "weeksLeft": "{{count}} semaines"
            }
        }
    },
    "nl": {
        "app": {"title": "Caloric"},
        "auth": {
            "signIn": "Inloggen",
            "signUp": "Registreren",
            "signOut": "Uitloggen",
            "email": "E-mail",
            "password": "Wachtwoord",
            "confirmPassword": "Wachtwoord bevestigen",
            "forgotPassword": "Wachtwoord vergeten?",
            "createAccount": "Account aanmaken",
            "welcome": "Welkom",
            "signInToContinue": "Log in om door te gaan",
            "signUpToGetStarted": "Registreer om te beginnen",
            "signInWithApple": "Inloggen met Apple",
            "signInWithGoogle": "Inloggen met Google",
            "continueWithEmail": "Doorgaan met e-mail",
            "comingSoon": "Binnenkort beschikbaar",
            "appleComingSoon": "Inloggen met Apple wordt beschikbaar in een toekomstige update.",
            "googleUnavailable": "Google-inloggen is uitgeschakeld voor deze app.",
            "signInFailed": "Inloggen mislukt",
            "signUpFailed": "Registratie mislukt",
            "enterEmailPassword": "Voer e-mail en wachtwoord in",
            "passwordsMismatch": "Wachtwoorden komen niet overeen",
            "passwordTooShort": "Wachtwoord moet minimaal 6 tekens bevatten",
            "alreadyHaveAccount": "Al een account? Inloggen",
            "needAccount": "Geen account? Registreren",
            "unavailable": "Niet beschikbaar"
        },
        "common": {
            "cancel": "Annuleren",
            "save": "Opslaan",
            "loading": "Laden\u2026",
            "done": "Klaar",
            "delete": "Verwijderen",
            "edit": "Bewerken",
            "back": "Terug",
            "next": "Volgende",
            "ok": "OK",
            "error": "Fout",
            "success": "Gelukt",
            "retry": "Opnieuw proberen",
            "continue": "Doorgaan",
            "letsGo": "Laten we gaan!",
            "weeks": "Weken",
            "years": "jaar",
            "recommended": "Aanbevolen"
        },
        "calories": {
            "label": "Calorie\u00ebn",
            "value_one": "{{count}} calorie",
            "value_other": "{{count}} calorie\u00ebn"
        },
        "landing": {
            "headline": "21 dagen naar betere\neetgewoonten",
            "subline": "Maak een foto. De AI doet de rest.\nNiet tellen. Niet raden.",
            "cta": "Start 21 dagen",
            "ctaConfirm": "Dag 1 begint nu",
            "signInPrompt": "Al een account? ",
            "signIn": "Inloggen"
        },
        "onboarding": {
            "goal": {
                "heading": "Wat is jouw\ndoel?",
                "description": "We passen je dagelijkse calorie-doelen aan.",
                "loseWeight": "Afvallen",
                "loseWeightDesc": "Calorietekort met begeleide doelen",
                "maintainWeight": "Gewicht behouden",
                "maintainWeightDesc": "Je huidige balans behouden",
                "gainMuscle": "Spieren opbouwen",
                "gainMuscleDesc": "Calorieoverschot voor groei",
                "eatHealthier": "Gezonder eten",
                "eatHealthierDesc": "Focus op voedingskwaliteit"
            },
            "body": {
                "heading": "Vertel ons\nover jezelf",
                "description": "We hebben dit nodig om je dagelijkse caloriebehoefte te berekenen.",
                "imperial": "Imperiaal",
                "metric": "Metrisch",
                "gender": "Geslacht",
                "male": "Man",
                "female": "Vrouw",
                "age": "Leeftijd",
                "height": "Lengte",
                "weight": "Gewicht",
                "ft": "ft",
                "in": "in",
                "cm": "cm",
                "lbs": "lbs",
                "kg": "kg"
            },
            "activity": {
                "heading": "Hoe actief\nben je?",
                "description": "Dit helpt ons je dagelijkse energiebehoefte te schatten.",
                "sedentary": "Zittend",
                "sedentaryDesc": "Weinig of geen beweging",
                "light": "Licht actief",
                "lightDesc": "Lichte beweging 1\u20133 dagen/week",
                "moderate": "Matig actief",
                "moderateDesc": "Matige beweging 3\u20135 dagen/week",
                "very": "Zeer actief",
                "veryDesc": "Intensieve beweging 6\u20137 dagen/week"
            },
            "weightGoal": {
                "heading": "Wat is je\nstreefgewicht?",
                "description": "Stel een doel dat goed voelt.",
                "comparison": "Gewichtsvergelijking",
                "current": "Huidig",
                "goal": "Doel",
                "underweight": "Ondergewicht",
                "normal": "Normaal",
                "overweight": "Overgewicht",
                "obese": "Obesitas"
            },
            "timeframe": {
                "heading": "Kies je\ntempo",
                "description": "Hoe snel wil je {{weight}} {{unit}} bereiken?",
                "weeksCount": "{{count}} Weken",
                "perWeek": "{{rate}} {{unit}}/week",
                "relaxed": "Ontspannen",
                "realistic": "Realistisch",
                "ambitious": "Ambitieus",
                "challenging": "Uitdagend"
            },
            "calculating": {
                "heading": "Je gewichtsplan\nwordt gemaakt\u2026",
                "subtitle": "We berekenen alles speciaal voor jou",
                "step1": "Lichaamssamenstelling analyseren\u2026",
                "step2": "Dagelijkse energiebehoefte berekenen\u2026",
                "step3": "Macroverdeling opbouwen\u2026",
                "step4": "Maaltijdtiming optimaliseren\u2026",
                "step5": "Je plan afronden\u2026"
            },
            "plan": {
                "heading": "Je plan is\nklaar 🎉",
                "subtitle": "Dit is wat we speciaal voor jou hebben gemaakt",
                "dailyCalorieTarget": "DAGELIJKS CALORIEDOEL",
                "kcalPerDay": "kcal / dag",
                "dailyMacros": "DAGELIJKSE MACRO'S",
                "protein": "Eiwit",
                "carbs": "Koolhydraten",
                "fat": "Vet",
                "reachGoal": "{{weight}} {{unit}} bereiken voor {{date}}",
                "weeksToLose": "{{weeks}} weken \u00b7 {{amount}} {{unit}} af te vallen",
                "socialProof": "12.847 mensen zijn deze week met een vergelijkbaar plan begonnen"
            },
            "saveProgress": {
                "heading": "Verlies je\nplan niet",
                "subtitle": "Maak een account aan om je caloriedoelen, macro's en voortgang op al je apparaten te synchroniseren.",
                "socialProof": "2.400+ gebruikers registreerden zich deze week",
                "privacy": "Je gegevens blijven priv\u00e9",
                "speed": "Duurt 5 seconden"
            },
            "complete": {
                "heading": "Alles ingesteld!",
                "subtitle": "Je persoonlijke plan is klaar.\nTijd om aan je reis te beginnen.",
                "kcalDay": "{{count}} kcal/dag",
                "goalWeight": "{{weight}} doel",
                "weeksLeft": "{{count}} weken"
            }
        }
    },
    "pl": {
        "app": {"title": "Caloric"},
        "auth": {
            "signIn": "Zaloguj si\u0119",
            "signUp": "Zarejestruj si\u0119",
            "signOut": "Wyloguj si\u0119",
            "email": "E-mail",
            "password": "Has\u0142o",
            "confirmPassword": "Potwierd\u017a has\u0142o",
            "forgotPassword": "Nie pami\u0119tasz has\u0142a?",
            "createAccount": "Utw\u00f3rz konto",
            "welcome": "Witaj",
            "signInToContinue": "Zaloguj si\u0119, aby kontynuowa\u0107",
            "signUpToGetStarted": "Zarejestruj si\u0119, aby zacz\u0105\u0107",
            "signInWithApple": "Zaloguj przez Apple",
            "signInWithGoogle": "Zaloguj przez Google",
            "continueWithEmail": "Kontynuuj z e-mailem",
            "comingSoon": "Wkr\u00f3tce dost\u0119pne",
            "appleComingSoon": "Logowanie przez Apple b\u0119dzie dost\u0119pne w przysz\u0142ej aktualizacji.",
            "googleUnavailable": "Logowanie przez Google jest wy\u0142\u0105czone dla tej aplikacji.",
            "signInFailed": "Logowanie nie powiod\u0142o si\u0119",
            "signUpFailed": "Rejestracja nie powiod\u0142a si\u0119",
            "enterEmailPassword": "Wprowad\u017a e-mail i has\u0142o",
            "passwordsMismatch": "Has\u0142a nie s\u0105 zgodne",
            "passwordTooShort": "Has\u0142o musi mie\u0107 co najmniej 6 znak\u00f3w",
            "alreadyHaveAccount": "Masz ju\u017c konto? Zaloguj si\u0119",
            "needAccount": "Nie masz konta? Zarejestruj si\u0119",
            "unavailable": "Niedost\u0119pne"
        },
        "common": {
            "cancel": "Anuluj",
            "save": "Zapisz",
            "loading": "\u0141adowanie\u2026",
            "done": "Gotowe",
            "delete": "Usu\u0144",
            "edit": "Edytuj",
            "back": "Wstecz",
            "next": "Dalej",
            "ok": "OK",
            "error": "B\u0142\u0105d",
            "success": "Sukces",
            "retry": "Spr\u00f3buj ponownie",
            "continue": "Kontynuuj",
            "letsGo": "Zaczynajmy!",
            "weeks": "Tygodnie",
            "years": "lat",
            "recommended": "Rekomendowane"
        },
        "calories": {
            "label": "Kalorie",
            "value_one": "{{count}} kaloria",
            "value_other": "{{count}} kalorii"
        },
        "landing": {
            "headline": "21 dni do lepszych\nnawyk\u00f3w \u017cywieniowych",
            "subline": "Zr\u00f3b zdj\u0119cie. AI zrobi reszt\u0119.\nBez liczenia. Bez zgadywania.",
            "cta": "Rozpocznij 21 dni",
            "ctaConfirm": "Dzie\u0144 1 zaczyna si\u0119 teraz",
            "signInPrompt": "Masz ju\u017c konto? ",
            "signIn": "Zaloguj si\u0119"
        },
        "onboarding": {
            "goal": {
                "heading": "Jaki jest Tw\u00f3j\ncel?",
                "description": "Dostosujemy Twoje dzienne cele kaloryczne.",
                "loseWeight": "Schudn\u0105\u0107",
                "loseWeightDesc": "Deficyt kaloryczny z prowadzonymi celami",
                "maintainWeight": "Utrzyma\u0107 wag\u0119",
                "maintainWeightDesc": "Zachowaj obecn\u0105 r\u00f3wnowag\u0119",
                "gainMuscle": "Zbudowa\u0107 mi\u0119\u015bnie",
                "gainMuscleDesc": "Nadwy\u017cka kaloryczna na wzrost",
                "eatHealthier": "Je\u015b\u0107 zdrowiej",
                "eatHealthierDesc": "Skupienie na jako\u015bci od\u017cywiania"
            },
            "body": {
                "heading": "Opowiedz nam\no sobie",
                "description": "Potrzebujemy tego, aby obliczy\u0107 Twoje dzienne zapotrzebowanie kaloryczne.",
                "imperial": "Imperialny",
                "metric": "Metryczny",
                "gender": "P\u0142e\u0107",
                "male": "M\u0119\u017cczyzna",
                "female": "Kobieta",
                "age": "Wiek",
                "height": "Wzrost",
                "weight": "Waga",
                "ft": "ft",
                "in": "in",
                "cm": "cm",
                "lbs": "lbs",
                "kg": "kg"
            },
            "activity": {
                "heading": "Jak aktywny\njeste\u015b?",
                "description": "To pomaga nam oszacowa\u0107 Twoje dzienne zapotrzebowanie energetyczne.",
                "sedentary": "Siedz\u0105cy",
                "sedentaryDesc": "Ma\u0142o lub brak \u0107wicze\u0144",
                "light": "Lekko aktywny",
                "lightDesc": "Lekkie \u0107wiczenia 1\u20133 dni/tydzie\u0144",
                "moderate": "Umiarkowanie aktywny",
                "moderateDesc": "Umiarkowane \u0107wiczenia 3\u20135 dni/tydzie\u0144",
                "very": "Bardzo aktywny",
                "veryDesc": "Intensywne \u0107wiczenia 6\u20137 dni/tydzie\u0144"
            },
            "weightGoal": {
                "heading": "Jaka jest Twoja\ndocelowa waga?",
                "description": "Ustaw cel, kt\u00f3ry Ci odpowiada.",
                "comparison": "Por\u00f3wnanie wagi",
                "current": "Obecna",
                "goal": "Cel",
                "underweight": "Niedowaga",
                "normal": "Norma",
                "overweight": "Nadwaga",
                "obese": "Oty\u0142o\u015b\u0107"
            },
            "timeframe": {
                "heading": "Wybierz swoje\ntempo",
                "description": "Jak szybko chcesz osi\u0105gn\u0105\u0107 {{weight}} {{unit}}?",
                "weeksCount": "{{count}} Tygodni",
                "perWeek": "{{rate}} {{unit}}/tydzie\u0144",
                "relaxed": "Spokojne",
                "realistic": "Realistyczne",
                "ambitious": "Ambitne",
                "challenging": "Wymagaj\u0105ce"
            },
            "calculating": {
                "heading": "Tworzenie Twojego\nplanu wagi\u2026",
                "subtitle": "Obliczamy wszystko specjalnie dla Ciebie",
                "step1": "Analiza sk\u0142adu cia\u0142a\u2026",
                "step2": "Obliczanie dziennego zapotrzebowania\u2026",
                "step3": "Tworzenie podzia\u0142u makrosk\u0142adnik\u00f3w\u2026",
                "step4": "Optymalizacja czas\u00f3w posi\u0142k\u00f3w\u2026",
                "step5": "Finalizowanie Twojego planu\u2026"
            },
            "plan": {
                "heading": "Tw\u00f3j plan jest\ngotowy 🎉",
                "subtitle": "Oto co stworzylimy specjalnie dla Ciebie",
                "dailyCalorieTarget": "DZIENNY CEL KALORYCZNY",
                "kcalPerDay": "kcal / dzie\u0144",
                "dailyMacros": "DZIENNE MAKROSK\u0141ADNIKI",
                "protein": "Bia\u0142ko",
                "carbs": "W\u0119glowodany",
                "fat": "T\u0142uszcz",
                "reachGoal": "Osi\u0105gnij {{weight}} {{unit}} do {{date}}",
                "weeksToLose": "{{weeks}} tygodni \u00b7 {{amount}} {{unit}} do schudni\u0119cia",
                "socialProof": "12 847 os\u00f3b rozpocz\u0119\u0142o podobny plan w tym tygodniu"
            },
            "saveProgress": {
                "heading": "Nie tra\u0107\nswojego planu",
                "subtitle": "Za\u0142\u00f3\u017c konto, aby synchronizowa\u0107 cele kaloryczne, makro i post\u0119py na wszystkich urz\u0105dzeniach.",
                "socialProof": "2 400+ u\u017cytkownik\u00f3w zarejestrowa\u0142o si\u0119 w tym tygodniu",
                "privacy": "Twoje dane pozostaj\u0105 prywatne",
                "speed": "Zajmuje 5 sekund"
            },
            "complete": {
                "heading": "Wszystko gotowe!",
                "subtitle": "Tw\u00f3j spersonalizowany plan jest gotowy.\nCzas rozpocz\u0105\u0107 swoj\u0105 podr\u00f3\u017c.",
                "kcalDay": "{{count}} kcal/dzie\u0144",
                "goalWeight": "{{weight}} cel",
                "weeksLeft": "{{count}} tygodni"
            }
        }
    },
    "pt": {
        "app": {"title": "Caloric"},
        "auth": {
            "signIn": "Entrar",
            "signUp": "Registar",
            "signOut": "Sair",
            "email": "E-mail",
            "password": "Palavra-passe",
            "confirmPassword": "Confirmar palavra-passe",
            "forgotPassword": "Esqueceu a palavra-passe?",
            "createAccount": "Criar conta",
            "welcome": "Bem-vindo",
            "signInToContinue": "Inicie sess\u00e3o para continuar",
            "signUpToGetStarted": "Registe-se para come\u00e7ar",
            "signInWithApple": "Entrar com Apple",
            "signInWithGoogle": "Entrar com Google",
            "continueWithEmail": "Continuar com e-mail",
            "comingSoon": "Em breve",
            "appleComingSoon": "In\u00edcio de sess\u00e3o com Apple estar\u00e1 dispon\u00edvel numa futura atualiza\u00e7\u00e3o.",
            "googleUnavailable": "In\u00edcio de sess\u00e3o com Google est\u00e1 desativado para esta app.",
            "signInFailed": "Falha ao entrar",
            "signUpFailed": "Falha ao registar",
            "enterEmailPassword": "Introduza e-mail e palavra-passe",
            "passwordsMismatch": "As palavras-passe n\u00e3o coincidem",
            "passwordTooShort": "A palavra-passe deve ter pelo menos 6 caracteres",
            "alreadyHaveAccount": "J\u00e1 tem conta? Entrar",
            "needAccount": "N\u00e3o tem conta? Registar",
            "unavailable": "Indispon\u00edvel"
        },
        "common": {
            "cancel": "Cancelar",
            "save": "Guardar",
            "loading": "A carregar\u2026",
            "done": "Conclu\u00eddo",
            "delete": "Eliminar",
            "edit": "Editar",
            "back": "Voltar",
            "next": "Seguinte",
            "ok": "OK",
            "error": "Erro",
            "success": "Sucesso",
            "retry": "Tentar novamente",
            "continue": "Continuar",
            "letsGo": "Vamos!",
            "weeks": "Semanas",
            "years": "anos",
            "recommended": "Recomendado"
        },
        "calories": {
            "label": "Calorias",
            "value_one": "{{count}} caloria",
            "value_other": "{{count}} calorias"
        },
        "landing": {
            "headline": "21 dias para melhores\nh\u00e1bitos alimentares",
            "subline": "Tire uma foto. A IA faz o resto.\nSem contar. Sem adivinhar.",
            "cta": "Iniciar 21 dias",
            "ctaConfirm": "Dia 1 come\u00e7a agora",
            "signInPrompt": "J\u00e1 tem conta? ",
            "signIn": "Entrar"
        },
        "onboarding": {
            "goal": {
                "heading": "Qual \u00e9 o seu\nobjetivo?",
                "description": "Vamos adaptar as suas metas cal\u00f3ricas di\u00e1rias.",
                "loseWeight": "Perder peso",
                "loseWeightDesc": "D\u00e9fice cal\u00f3rico com metas guiadas",
                "maintainWeight": "Manter peso",
                "maintainWeightDesc": "Manter o seu equil\u00edbrio atual",
                "gainMuscle": "Ganhar m\u00fasculo",
                "gainMuscleDesc": "Superavit cal\u00f3rico para crescimento",
                "eatHealthier": "Comer mais saud\u00e1vel",
                "eatHealthierDesc": "Foco na qualidade nutricional"
            },
            "body": {
                "heading": "Conte-nos\nsobre si",
                "description": "Precisamos disto para calcular as suas necessidades cal\u00f3ricas.",
                "imperial": "Imperial",
                "metric": "M\u00e9trico",
                "gender": "G\u00e9nero",
                "male": "Masculino",
                "female": "Feminino",
                "age": "Idade",
                "height": "Altura",
                "weight": "Peso",
                "ft": "ft",
                "in": "in",
                "cm": "cm",
                "lbs": "lbs",
                "kg": "kg"
            },
            "activity": {
                "heading": "Qu\u00e3o ativo\n\u00e9?",
                "description": "Isto ajuda-nos a estimar as suas necessidades energ\u00e9ticas di\u00e1rias.",
                "sedentary": "Sedent\u00e1rio",
                "sedentaryDesc": "Pouco ou nenhum exerc\u00edcio",
                "light": "Ligeiramente ativo",
                "lightDesc": "Exerc\u00edcio leve 1\u20133 dias/semana",
                "moderate": "Moderadamente ativo",
                "moderateDesc": "Exerc\u00edcio moderado 3\u20135 dias/semana",
                "very": "Muito ativo",
                "veryDesc": "Exerc\u00edcio intenso 6\u20137 dias/semana"
            },
            "weightGoal": {
                "heading": "Qual \u00e9 o seu\npeso alvo?",
                "description": "Defina uma meta que lhe pare\u00e7a adequada.",
                "comparison": "Compara\u00e7\u00e3o de peso",
                "current": "Atual",
                "goal": "Objetivo",
                "underweight": "Abaixo do peso",
                "normal": "Normal",
                "overweight": "Excesso de peso",
                "obese": "Obesidade"
            },
            "timeframe": {
                "heading": "Escolha o\nseu ritmo",
                "description": "Qu\u00e3o r\u00e1pido quer chegar a {{weight}} {{unit}}?",
                "weeksCount": "{{count}} Semanas",
                "perWeek": "{{rate}} {{unit}}/semana",
                "relaxed": "Relaxado",
                "realistic": "Realista",
                "ambitious": "Ambicioso",
                "challenging": "Desafiante"
            },
            "calculating": {
                "heading": "A criar o seu\nplano de peso\u2026",
                "subtitle": "Estamos a calcular tudo s\u00f3 para si",
                "step1": "A analisar composi\u00e7\u00e3o corporal\u2026",
                "step2": "A calcular necessidades energ\u00e9ticas\u2026",
                "step3": "A construir distribui\u00e7\u00e3o de macros\u2026",
                "step4": "A otimizar hor\u00e1rios de refei\u00e7\u00f5es\u2026",
                "step5": "A finalizar o seu plano\u2026"
            },
            "plan": {
                "heading": "O seu plano est\u00e1\npronto 🎉",
                "subtitle": "Isto \u00e9 o que cri\u00e1mos para si",
                "dailyCalorieTarget": "META CAL\u00d3RICA DI\u00c1RIA",
                "kcalPerDay": "kcal / dia",
                "dailyMacros": "MACROS DI\u00c1RIOS",
                "protein": "Prote\u00edna",
                "carbs": "Hidratos de carbono",
                "fat": "Gordura",
                "reachGoal": "Atingir {{weight}} {{unit}} at\u00e9 {{date}}",
                "weeksToLose": "{{weeks}} semanas \u00b7 {{amount}} {{unit}} a perder",
                "socialProof": "12 847 pessoas come\u00e7aram um plano semelhante esta semana"
            },
            "saveProgress": {
                "heading": "N\u00e3o perca o\nseu plano",
                "subtitle": "Crie uma conta para sincronizar metas cal\u00f3ricas, macros e progresso em todos os dispositivos.",
                "socialProof": "2 400+ utilizadores registaram-se esta semana",
                "privacy": "Os seus dados permanecem privados",
                "speed": "Demora 5 segundos"
            },
            "complete": {
                "heading": "Tudo pronto!",
                "subtitle": "O seu plano personalizado est\u00e1 pronto.\nAltura de come\u00e7ar a sua jornada.",
                "kcalDay": "{{count}} kcal/dia",
                "goalWeight": "{{weight}} objetivo",
                "weeksLeft": "{{count}} semanas"
            }
        }
    },
    "pt-BR": {
        "app": {"title": "Caloric"},
        "auth": {
            "signIn": "Entrar",
            "signUp": "Cadastrar",
            "signOut": "Sair",
            "email": "E-mail",
            "password": "Senha",
            "confirmPassword": "Confirmar senha",
            "forgotPassword": "Esqueceu a senha?",
            "createAccount": "Criar conta",
            "welcome": "Bem-vindo",
            "signInToContinue": "Fa\u00e7a login para continuar",
            "signUpToGetStarted": "Cadastre-se para come\u00e7ar",
            "signInWithApple": "Entrar com Apple",
            "signInWithGoogle": "Entrar com Google",
            "continueWithEmail": "Continuar com e-mail",
            "comingSoon": "Em breve",
            "appleComingSoon": "Login com Apple estar\u00e1 dispon\u00edvel em uma atualiza\u00e7\u00e3o futura.",
            "googleUnavailable": "Login com Google est\u00e1 desativado para este app.",
            "signInFailed": "Falha ao entrar",
            "signUpFailed": "Falha ao cadastrar",
            "enterEmailPassword": "Digite e-mail e senha",
            "passwordsMismatch": "As senhas n\u00e3o coincidem",
            "passwordTooShort": "A senha deve ter pelo menos 6 caracteres",
            "alreadyHaveAccount": "J\u00e1 tem conta? Entrar",
            "needAccount": "N\u00e3o tem conta? Cadastrar",
            "unavailable": "Indispon\u00edvel"
        },
        "common": {
            "cancel": "Cancelar",
            "save": "Salvar",
            "loading": "Carregando\u2026",
            "done": "Feito",
            "delete": "Excluir",
            "edit": "Editar",
            "back": "Voltar",
            "next": "Pr\u00f3ximo",
            "ok": "OK",
            "error": "Erro",
            "success": "Sucesso",
            "retry": "Tentar novamente",
            "continue": "Continuar",
            "letsGo": "Vamos l\u00e1!",
            "weeks": "Semanas",
            "years": "anos",
            "recommended": "Recomendado"
        },
        "calories": {
            "label": "Calorias",
            "value_one": "{{count}} caloria",
            "value_other": "{{count}} calorias"
        },
        "landing": {
            "headline": "21 dias para melhores\nh\u00e1bitos alimentares",
            "subline": "Tire uma foto. A IA faz o resto.\nSem contar. Sem adivinhar.",
            "cta": "Come\u00e7ar 21 dias",
            "ctaConfirm": "Dia 1 come\u00e7a agora",
            "signInPrompt": "J\u00e1 tem conta? ",
            "signIn": "Entrar"
        },
        "onboarding": {
            "goal": {
                "heading": "Qual \u00e9 o seu\nobjetivo?",
                "description": "Vamos adaptar suas metas cal\u00f3ricas di\u00e1rias.",
                "loseWeight": "Emagrecer",
                "loseWeightDesc": "D\u00e9ficit cal\u00f3rico com metas guiadas",
                "maintainWeight": "Manter peso",
                "maintainWeightDesc": "Manter seu equil\u00edbrio atual",
                "gainMuscle": "Ganhar m\u00fasculo",
                "gainMuscleDesc": "Super\u00e1vit cal\u00f3rico para crescimento",
                "eatHealthier": "Comer mais saud\u00e1vel",
                "eatHealthierDesc": "Foco na qualidade nutricional"
            },
            "body": {
                "heading": "Nos conte\nsobre voc\u00ea",
                "description": "Precisamos disso para calcular suas necessidades cal\u00f3ricas di\u00e1rias.",
                "imperial": "Imperial",
                "metric": "M\u00e9trico",
                "gender": "G\u00eanero",
                "male": "Masculino",
                "female": "Feminino",
                "age": "Idade",
                "height": "Altura",
                "weight": "Peso",
                "ft": "ft",
                "in": "in",
                "cm": "cm",
                "lbs": "lbs",
                "kg": "kg"
            },
            "activity": {
                "heading": "Qu\u00e3o ativo\nvoc\u00ea \u00e9?",
                "description": "Isso nos ajuda a estimar suas necessidades energ\u00e9ticas di\u00e1rias.",
                "sedentary": "Sedent\u00e1rio",
                "sedentaryDesc": "Pouco ou nenhum exerc\u00edcio",
                "light": "Levemente ativo",
                "lightDesc": "Exerc\u00edcio leve 1\u20133 dias/semana",
                "moderate": "Moderadamente ativo",
                "moderateDesc": "Exerc\u00edcio moderado 3\u20135 dias/semana",
                "very": "Muito ativo",
                "veryDesc": "Exerc\u00edcio intenso 6\u20137 dias/semana"
            },
            "weightGoal": {
                "heading": "Qual \u00e9 seu\npeso ideal?",
                "description": "Defina uma meta que fa\u00e7a sentido pra voc\u00ea.",
                "comparison": "Compara\u00e7\u00e3o de peso",
                "current": "Atual",
                "goal": "Meta",
                "underweight": "Abaixo do peso",
                "normal": "Normal",
                "overweight": "Sobrepeso",
                "obese": "Obesidade"
            },
            "timeframe": {
                "heading": "Escolha seu\nritmo",
                "description": "Qu\u00e3o r\u00e1pido quer chegar a {{weight}} {{unit}}?",
                "weeksCount": "{{count}} Semanas",
                "perWeek": "{{rate}} {{unit}}/semana",
                "relaxed": "Relaxado",
                "realistic": "Realista",
                "ambitious": "Ambicioso",
                "challenging": "Desafiador"
            },
            "calculating": {
                "heading": "Criando seu\nplano de peso\u2026",
                "subtitle": "Calculando tudo especialmente pra voc\u00ea",
                "step1": "Analisando composi\u00e7\u00e3o corporal\u2026",
                "step2": "Calculando necessidades energ\u00e9ticas\u2026",
                "step3": "Montando distribui\u00e7\u00e3o de macros\u2026",
                "step4": "Otimizando hor\u00e1rios de refei\u00e7\u00f5es\u2026",
                "step5": "Finalizando seu plano\u2026"
            },
            "plan": {
                "heading": "Seu plano est\u00e1\npronto 🎉",
                "subtitle": "Isso \u00e9 o que criamos pra voc\u00ea",
                "dailyCalorieTarget": "META CAL\u00d3RICA DI\u00c1RIA",
                "kcalPerDay": "kcal / dia",
                "dailyMacros": "MACROS DI\u00c1RIOS",
                "protein": "Prote\u00edna",
                "carbs": "Carboidratos",
                "fat": "Gordura",
                "reachGoal": "Atingir {{weight}} {{unit}} at\u00e9 {{date}}",
                "weeksToLose": "{{weeks}} semanas \u00b7 {{amount}} {{unit}} pra perder",
                "socialProof": "12.847 pessoas come\u00e7aram um plano parecido esta semana"
            },
            "saveProgress": {
                "heading": "N\u00e3o perca seu\nplano",
                "subtitle": "Crie uma conta pra sincronizar metas cal\u00f3ricas, macros e progresso em todos os dispositivos.",
                "socialProof": "2.400+ usu\u00e1rios se cadastraram esta semana",
                "privacy": "Seus dados permanecem privados",
                "speed": "Leva 5 segundos"
            },
            "complete": {
                "heading": "Tudo pronto!",
                "subtitle": "Seu plano personalizado est\u00e1 pronto.\nHora de come\u00e7ar sua jornada.",
                "kcalDay": "{{count}} kcal/dia",
                "goalWeight": "{{weight}} meta",
                "weeksLeft": "{{count}} semanas"
            }
        }
    }
}

for lang, data in locales.items():
    path = os.path.join(BASE, lang, 'common.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f"Wrote {lang}/common.json")
