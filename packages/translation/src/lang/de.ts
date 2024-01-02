import "dayjs/locale/de";

export default {
  user: {
    page: {
      login: {
        title: "Melde dich bei deinem Konto an",
        subtitle: "Willkommen zurück! Bitte gib deine Zugangsdaten ein",
      },
      init: {
        title: "Neue Homarr Installation",
        subtitle: "Bitte erstelle den initialen Administrator Benutzer",
      },
    },
    field: {
      username: {
        label: "Benutzername",
      },
      password: {
        label: "Passwort",
      },
      passwordConfirm: {
        label: "Passwort bestätigen",
      },
    },
    action: {
      login: "Anmelden",
      create: "Benutzer erstellen",
    },
  },
  integration: {
    page: {
      list: {
        title: "Integrationen",
        search: "Integration suchen",
        empty: "Keine Integrationen gefunden",
      },
      create: {
        title: "Neue {name} Integration erstellen",
        notification: {
          success: {
            title: "Erstellung erfolgreich",
            message: "Die Integration wurde erfolgreich erstellt",
          },
          error: {
            title: "Erstellung fehlgeschlagen",
            message: "Die Integration konnte nicht erstellt werden",
          },
        },
      },
      edit: {
        title: "{name} Integration bearbeiten",
        notification: {
          success: {
            title: "Änderungen erfolgreich angewendet",
            message: "Die Integration wurde erfolgreich gespeichert",
          },
          error: {
            title: "Änderungen konnten nicht angewendet werden",
            message: "Die Integration konnte nicht gespeichert werden",
          },
        },
      },
      delete: {
        title: "Integration entfernen",
        message: "Möchtest du die Integration {name} wirklich entfernen?",
        notification: {
          success: {
            title: "Entfernen erfolgreich",
            message: "Die Integration wurde erfolgreich entfernt",
          },
          error: {
            title: "Entfernen fehlgeschlagen",
            message: "Die Integration konnte nicht entfernt werden",
          },
        },
      },
    },
    field: {
      name: {
        label: "Name",
      },
      url: {
        label: "Url",
      },
    },
    action: {
      create: "Neue Integration",
    },
    testConnection: {
      action: "Verbindung überprüfen",
      alertNotice:
        "Der Button zum Speichern wird aktiviert, sobald die Verbindung erfolgreich überprüft wurde",
      notification: {
        success: {
          title: "Verbindung erfolgreich",
          message: "Die Verbindung wurde erfolgreich hergestellt",
        },
        invalidUrl: {
          title: "Ungültige URL",
          message: "Die URL ist ungültig",
        },
        notAllSecretsProvided: {
          title: "Fehlende Zugangsdaten",
          message: "Es wurden nicht alle Zugangsdaten angegeben",
        },
        invalidCredentials: {
          title: "Ungültige Zugangsdaten",
          message: "Die Zugangsdaten sind ungültig",
        },
        commonError: {
          title: "Verbindung fehlgeschlagen",
          message: "Die Verbindung konnte nicht hergestellt werden",
        },
      },
    },
    secrets: {
      title: "Zugangsdaten",
      lastUpdated: "Zuletzt geändert {date}",
      secureNotice:
        "Diese Zugangsdaten können nach der Erstellung nicht mehr ausgelesen werden",
      reset: {
        title: "Zugangsdaten zurücksetzen",
        message: "Möchtest du diese Zugangsdaten wirklich zurücksetzen?",
      },
      kind: {
        username: {
          label: "Benutzername",
          newLabel: "Neuer Benutzername",
        },
        apiKey: {
          label: "API Key",
          newLabel: "Neuer API Key",
        },
        password: {
          label: "Passwort",
          newLabel: "Neues Passwort",
        },
      },
    },
  },
  common: {
    action: {
      backToOverview: "Zurück zur Übersicht",
      create: "Erstellen",
      edit: "Bearbeiten",
      save: "Speichern",
      cancel: "Abbrechen",
      confirm: "Bestätigen",
    },
    noResults: "Keine Ergebnisse gefunden",
    search: {
      placeholder: "Suche nach etwas...",
      nothingFound: "Nichts gefunden",
    },
  },
  widget: {
    clock: {
      option: {
        is24HourFormat: {
          label: "24-Stunden Format",
          description: "Use 24-hour format instead of 12-hour format",
        },
        isLocaleTime: {
          label: "Use locale time",
        },
        timezone: {
          label: "Timezone",
        },
      },
    },
    weather: {
      option: {
        location: {
          label: "Standort",
        },
        showCity: {
          label: "Stadt anzeigen",
        },
      },
    },
  },
} as const;
