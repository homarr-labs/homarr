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
      placeholder: "Suche nach etwas",
      nothingFound: "Nichts gefunden",
    },
  },
} as const;
