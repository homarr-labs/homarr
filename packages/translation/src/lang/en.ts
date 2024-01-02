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
