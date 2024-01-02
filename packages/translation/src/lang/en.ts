import "dayjs/locale/en";

export default {
  user: {
    page: {
      login: {
        title: "Log in to your account",
        subtitle: "Welcome back! Please enter your credentials",
      },
      init: {
        title: "New Homarr installation",
        subtitle: "Please create the initial administator user",
      },
    },
    field: {
      username: {
        label: "Username",
      },
      password: {
        label: "Password",
      },
      passwordConfirm: {
        label: "Confirm password",
      },
    },
    action: {
      login: "Login",
      create: "Create user",
    },
  },
  integration: {
    page: {
      list: {
        title: "Integrations",
        search: "Search integrations",
      },
      create: {
        title: "New {name} integration",
        notification: {
          success: {
            title: "Creation successful",
            message: "The integration was successfully created",
          },
          error: {
            title: "Creation failed",
            message: "The integration could not be created",
          },
        },
      },
      edit: {
        title: "Edit {name} integration",
        notification: {
          success: {
            title: "Changes applied successfully",
            message: "The integration was successfully saved",
          },
          error: {
            title: "Unable to apply changes",
            message: "The integration could not be saved",
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
      create: "New integration",
    },
    testConnection: {
      action: "Test connection",
      notification: {
        success: {
          title: "Connection successful",
          message: "The connection was successfully established",
        },
        invalidUrl: {
          title: "Invalid URL",
          message: "The URL is invalid",
        },
        notAllSecretsProvided: {
          title: "Missing credentials",
          message: "Not all credentials were provided",
        },
        invalidCredentials: {
          title: "Invalid credentials",
          message: "The credentials are invalid",
        },
        commonError: {
          title: "Connection failed",
          message: "The connection could not be established",
        },
      },
    },
    secrets: {
      title: "Secrets",
      lastUpdated: "Last updated {date}",
      secureNotice: "This secret cannot be retrieved after creation",
      kind: {
        username: {
          label: "Username",
          newLabel: "New username",
        },
        apiKey: {
          label: "API Key",
          newLabel: "New API Key",
        },
        password: {
          label: "Password",
          newLabel: "New password",
        },
      },
    },
  },
  common: {
    action: {
      backToOverview: "Back to overview",
      create: "Create",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
    },
    noResults: "No results found",
  },
  widget: {
    clock: {
      option: {
        is24HourFormat: {
          label: "24-hour format",
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
          label: "Location",
        },
        showCity: {
          label: "Show city",
        },
      },
    },
  },
  common: {
    search: {
      placeholder: "Search for anything...",
      nothingFound: "Nothing found",
    },
  },
} as const;
