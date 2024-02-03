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
        empty: "No integrations found",
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
      delete: {
        title: "Delete integration",
        message: "Are you sure you want to delete the integration {name}?",
        notification: {
          success: {
            title: "Deletion successful",
            message: "The integration was successfully deleted",
          },
          error: {
            title: "Deletion failed",
            message: "Unable to delete the integration",
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
      alertNotice:
        "The Save button is enabled once a successful connection is established",
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
      reset: {
        title: "Reset secret",
        message: "Are you sure you want to reset this secret?",
      },
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
      confirm: "Confirm",
    },
    search: {
      placeholder: "Search for anything...",
      nothingFound: "Nothing found",
    },
    noResults: "No results found",
  },
  section: {
    category: {
      action: {
        create: "New category",
        edit: "Rename category",
        remove: "Remove category",
        moveUp: "Move up",
        moveDown: "Move down",
        createAbove: "New category above",
        createBelow: "New category below",
      },
      menu: {
        label: {
          create: "New category",
          changePosition: "Change position",
        },
      },
    },
  },
  widget: {
    app: {
      name: "App",
      description: "Displays a link to an external application",
      option: {
        name: {
          label: "Name",
        },
        description: {
          label: "Description",
        },
        internalUrl: {
          label: "Internal URL",
        },
        externalUrl: {
          label: "External URL",
        },
        iconUrl: {
          label: "Icon URL",
        },
        openInNewTab: {
          label: "Open in new tab",
        },
        fontSize: {
          label: "Font size",
        },
        namePosition: {
          label: "Name position",
        },
        nameStyle: {
          label: "Name style",
        },
        nameLineClamp: {
          label: "Name line clamp",
        },
        statusCodes: {
          label: "Status codes",
        },
      },
    },
    clock: {
      name: "Date and time",
      description: "Displays the current date and time.",
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
      name: "Weather",
      description:
        "Displays the current weather information of a set location.",
      option: {
        location: {
          label: "Location",
        },
        showCity: {
          label: "Show city",
        },
      },
    },
    addToBoard: "Add to board",
  },
  management: {
    metaTitle: "Management",
    title: {
      morning: "Good morning, {username}",
      afternoon: "Good afternoon, {username}",
      evening: "Good evening, {username}",
    },
    navbar: {
      items: {
        home: "Home",
        boards: "Boards",
        users: {
          label: "Users",
          items: {
            manage: "Manage",
            invites: "Invites",
          },
        },
        tools: {
          label: "Tools",
          items: {
            docker: "Docker",
          },
        },
        help: {
          label: "Help",
          items: {
            documentation: "Documentation",
            submitIssue: "Submit an issue",
            discord: "Community Discord",
            sourceCode: "Source Code",
          },
        },
        about: "About",
      },
    },
  },
} as const;
