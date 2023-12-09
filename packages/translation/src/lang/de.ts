export default {
  user: {
    page: {
      login: {
        title: "Melde dich bei deinem Konto an",
        subtitle: "Willkommen zurück! Bitte gib deine Zugangsdaten ein",
      },
      init: {
        title: "Neue Alparr Installation",
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
} as const;
