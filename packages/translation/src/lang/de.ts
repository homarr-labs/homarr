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
      },
      create: {
        title: "Neue {name} Integration erstellen",
      },
      edit: {
        title: "{name} Integration bearbeiten",
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
      testConnection: "Verbindung überprüfen",
    },
    secrets: {
      title: "Secrets",
      lastUpdated: "Zuletzt geändert {date}",
      secureNotice:
        "Dieses Secret kann nach der Erstellung nicht mehr ausgelesen werden",
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
    },
    noResults: "Keine Ergebnisse gefunden",
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
  common: {
    search: {
      placeholder: "Suche nach etwas...",
      nothingFound: "Nichts gefunden",
    },
  },
} as const;
