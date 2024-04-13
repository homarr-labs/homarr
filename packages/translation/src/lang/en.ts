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
  app: {
    page: {
      list: {
        title: "Apps",
        noResults: {
          title: "There aren't any apps.",
          description: "Create your first app",
        },
      },
      create: {
        title: "New app",
        notification: {
          success: {
            title: "Creation successful",
            message: "The app was successfully created",
          },
          error: {
            title: "Creation failed",
            message: "The app could not be created",
          },
        },
      },
      edit: {
        title: "Edit app",
        notification: {
          success: {
            title: "Changes applied successfully",
            message: "The app was successfully saved",
          },
          error: {
            title: "Unable to apply changes",
            message: "The app could not be saved",
          },
        },
      },
      delete: {
        title: "Delete app",
        message: "Are you sure you want to delete the app {name}?",
        notification: {
          success: {
            title: "Deletion successful",
            message: "The app was successfully deleted",
          },
          error: {
            title: "Deletion failed",
            message: "Unable to delete the app",
          },
        },
      },
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
      add: "Add",
      apply: "Apply",
      backToOverview: "Back to overview",
      create: "Create",
      edit: "Edit",
      insert: "Insert",
      remove: "Remove",
      save: "Save",
      saveChanges: "Save changes",
      cancel: "Cancel",
      confirm: "Confirm",
      previous: "Previous",
      next: "Next",
      checkoutDocs: "Check out the documentation",
    },
    multiSelect: {
      placeholder: "Pick one or more values",
    },
    select: {
      placeholder: "Pick value",
      badge: {
        recommended: "Recommended",
      },
    },
    search: {
      placeholder: "Search for anything...",
      nothingFound: "Nothing found",
      group: {
        all: "All",
        web: "Web",
        action: "Actions",
        app: "Apps",
      },
    },
    userAvatar: {
      menu: {
        switchToDarkMode: "Switch to dark mode",
        switchToLightMode: "Switch to light mode",
        management: "Management",
        logout: "Logout",
        navigateDefaultBoard: "Navigate to default board",
      },
    },
    noResults: "No results found",
    preview: {
      show: "Show preview",
      hide: "Hide preview",
    },
  },
  section: {
    category: {
      field: {
        name: {
          label: "Name",
        },
      },
      action: {
        create: "New category",
        edit: "Rename category",
        remove: "Remove category",
        moveUp: "Move up",
        moveDown: "Move down",
        createAbove: "New category above",
        createBelow: "New category below",
      },
      create: {
        title: "New category",
        submit: "Add category",
      },
      remove: {
        title: "Remove category",
        message: "Are you sure you want to remove the category {name}?",
      },
      edit: {
        title: "Rename category",
        submit: "Rename category",
      },
      menu: {
        label: {
          create: "New category",
          changePosition: "Change position",
        },
      },
    },
  },
  item: {
    action: {
      create: "New item",
      import: "Import item",
      edit: "Edit item",
      move: "Move item",
      remove: "Remove item",
    },
    menu: {
      label: {
        settings: "Settings",
        dangerZone: "Danger Zone",
      },
    },
    create: {
      title: "Choose item to add",
      addToBoard: "Add to board",
    },
    move: {
      field: {
        width: {
          label: "Width",
        },
        height: {
          label: "Height",
        },
      },
    },
    edit: {
      title: "Edit item",
      field: {
        integrations: {
          label: "Integrations",
        },
      },
    },
    remove: {
      title: "Remove item",
      message: "Are you sure you want to remove this item?",
    },
  },
  widget: {
    app: {
      name: "App",
      description: "Embeds an app into the board.",
      option: {
        appId: {
          label: "Choose app",
        },
        openInNewTab: {
          label: "Open in new tab",
        },
        showDescriptionTooltip: {
          label: "Show description tooltip",
        },
      },
      error: {
        notFound: {
          label: "No app",
          tooltip: "You have no valid app selected",
        },
      },
    },
    clock: {
      name: "Date and time",
      description: "Displays the current date and time.",
      option: {
        customTitleToggle: {
          label: "Custom Title/City display",
          description:
            "Show off a custom title or the name of the city/country on top of the clock.",
        },
        customTitle: {
          label: "Title",
        },
        is24HourFormat: {
          label: "24-hour format",
          description: "Use 24-hour format instead of 12-hour format",
        },
        showSeconds: {
          label: "Display seconds",
        },
        useCustomTimezone: {
          label: "Use a fixed timezone",
        },
        timezone: {
          label: "Timezone",
          description: "Choose the timezone following the IANA standard",
        },
        showDate: {
          label: "Show the date",
        },
        dateFormat: {
          label: "Date Format",
          description: "How the date should look like",
        },
      },
    },
    notebook: {
      name: "Notebook",
      description: "A simple notebook widget that supports markdown",
      option: {
        showToolbar: {
          label: "Show the toolbar to help you write markdown",
        },
        allowReadOnlyCheck: {
          label: "Allow check in read only mode",
        },
        content: {
          label: "The content of the notebook",
        },
      },
      controls: {
        bold: "Bold",
        italic: "Italic",
        strikethrough: "Strikethrough",
        underline: "Underline",
        colorText: "Color text",
        colorHighlight: "Colored highlight text",
        code: "Code",
        clear: "Clear formatting",
        heading: "Heading {level}",
        align: "Align text: {position}",
        blockquote: "Blockquote",
        horizontalLine: "Horizontal line",
        bulletList: "Bullet list",
        orderedList: "Ordered list",
        checkList: "Check list",
        increaseIndent: "Increase Indent",
        decreaseIndent: "Decrease Indent",
        link: "Link",
        unlink: "Remove link",
        image: "Embed Image",
        addTable: "Add table",
        deleteTable: "Delete Table",
        colorCell: "Color Cell",
        mergeCell: "Toggle cell merging",
        addColumnLeft: "Add column before",
        addColumnRight: "Add column after",
        deleteColumn: "Delete column",
        addRowTop: "Add row before",
        addRowBelow: "Add row after",
        deleteRow: "Delete row",
      },
      align: {
        left: "Left",
        center: "Center",
        right: "Right",
      },
      popover: {
        clearColor: "Clear color",
        source: "Source",
        widthPlaceholder: "Value in % or pixels",
        columns: "Columns",
        rows: "Rows",
        width: "Width",
        height: "Height",
      },
    },
    iframe: {
      name: "iFrame",
      description:
        "Embed any content from the internet. Some websites may restrict access.",
      option: {
        embedUrl: {
          label: "Embed URL",
        },
        allowFullScreen: {
          label: "Allow full screen",
        },
        allowTransparency: {
          label: "Allow transparency",
        },
        allowScrolling: {
          label: "Allow scrolling",
        },
        allowPayment: {
          label: "Allow payment",
        },
        allowAutoPlay: {
          label: "Allow auto play",
        },
        allowMicrophone: {
          label: "Allow microphone",
        },
        allowCamera: {
          label: "Allow camera",
        },
        allowGeolocation: {
          label: "Allow geolocation",
        },
      },
      error: {
        noUrl: "No iFrame URL provided",
        noBrowerSupport:
          "Your Browser does not support iframes. Please update your browser.",
      },
    },
    weather: {
      name: "Weather",
      description:
        "Displays the current weather information of a set location.",
      option: {
        isFormatFahrenheit: {
          label: "Temperature in Fahrenheit",
        },
        location: {
          label: "Weather location",
        },
        showCity: {
          label: "Show city",
        },
        hasForecast: {
          label: "Show forecast",
        },
        forecastDayCount: {
          label: "Amount of forecast days",
          description:
            "When the widget is not wide enough, less days are shown",
        },
      },
      kind: {
        clear: "Clear",
        mainlyClear: "Mainly clear",
        fog: "Fog",
        drizzle: "Drizzle",
        freezingDrizzle: "Freezing drizzle",
        rain: "Rain",
        freezingRain: "Freezing rain",
        snowFall: "Snow fall",
        snowGrains: "Snow grains",
        rainShowers: "Rain showers",
        snowShowers: "Snow showers",
        thunderstorm: "Thunderstorm",
        thunderstormWithHail: "Thunderstorm with hail",
        unknown: "Unknown",
      },
    },
    common: {
      location: {
        query: "City / Postal code",
        latitude: "Latitude",
        longitude: "Longitude",
        disabledTooltip: "Please enter a city or postal code",
        unknownLocation: "Unknown location",
        search: "Search",
        table: {
          header: {
            city: "City",
            country: "Country",
            coordinates: "Coordinates",
            population: "Population",
          },
          action: {
            select: "Select {city}, {countryCode}",
          },
          population: {
            fallback: "Unknown",
          },
        },
      },
    },
    video: {
      name: "Video Stream",
      description: "Embed a video stream or video from a camera or a website",
      option: {
        feedUrl: {
          label: "Feed URL",
        },
        hasAutoPlay: {
          label: "Autoplay",
          description:
            "Autoplay only works when muted because of browser restrictions",
        },
        isMuted: {
          label: "Muted",
        },
        hasControls: {
          label: "Show controls",
        },
      },
      error: {
        noUrl: "No Video URL provided",
        forYoutubeUseIframe: "For YouTube videos use the iframe option",
      },
    },
  },
  widgetPreview: {
    toggle: {
      enabled: "Edit mode enabled",
      disabled: "Edit mode disabled",
    },
    dimensions: {
      title: "Change dimensions",
    },
  },
  board: {
    action: {
      edit: {
        notification: {
          success: {
            title: "Changes applied successfully",
            message: "The board was successfully saved",
          },
          error: {
            title: "Unable to apply changes",
            message: "The board could not be saved",
          },
        },
      },
    },
    field: {
      pageTitle: {
        label: "Page title",
      },
      metaTitle: {
        label: "Meta title",
      },
      logoImageUrl: {
        label: "Logo image URL",
      },
      faviconImageUrl: {
        label: "Favicon image URL",
      },
      backgroundImageUrl: {
        label: "Background image URL",
      },
      backgroundImageAttachment: {
        label: "Background image attachment",
        option: {
          fixed: {
            label: "Fixed",
            description: "Background stays in the same position.",
          },
          scroll: {
            label: "Scroll",
            description: "Background scrolls with your mouse.",
          },
        },
      },
      backgroundImageRepeat: {
        label: "Background image repeat",
        option: {
          repeat: {
            label: "Repeat",
            description:
              "The image is repeated as much as needed to cover the whole background image painting area.",
          },
          "no-repeat": {
            label: "No repeat",
            description:
              "The image is not repeated and may not fill the entire space.",
          },
          "repeat-x": {
            label: "Repeat X",
            description: "Same as 'Repeat' but only on horizontal axis.",
          },
          "repeat-y": {
            label: "Repeat Y",
            description: "Same as 'Repeat' but only on vertical axis.",
          },
        },
      },
      backgroundImageSize: {
        label: "Background image size",
        option: {
          cover: {
            label: "Cover",
            description:
              "Scales the image as small as possible to cover the entire window by cropping excessive space.",
          },
          contain: {
            label: "Contain",
            description:
              "Scales the image as large as possible within its container without cropping or stretching the image.",
          },
        },
      },
      primaryColor: {
        label: "Primary color",
      },
      secondaryColor: {
        label: "Secondary color",
      },
      opacity: {
        label: "Opacity",
      },
      customCss: {
        label: "Custom CSS",
      },
      columnCount: {
        label: "Column count",
      },
      name: {
        label: "Name",
      },
    },
    setting: {
      title: "Settings for {boardName} board",
      section: {
        general: {
          title: "General",
          unrecognizedLink:
            "The provided link is not recognized and won't preview, it might still work.",
        },
        layout: {
          title: "Layout",
        },
        background: {
          title: "Background",
        },
        color: {
          title: "Colors",
        },
        customCss: {
          title: "Custom css",
        },
        access: {
          title: "Access control",
          permission: {
            userSelect: {
              title: "Add user permission",
              label: "Select user",
              notFound: "No user found",
            },
            field: {
              user: {
                label: "User",
              },
              permission: {
                label: "Permission",
              },
            },
            item: {
              "board-view": {
                label: "View board",
              },
              "board-change": {
                label: "Change board",
              },
              "board-full": {
                label: "Full access",
              },
            },
          },
        },
        dangerZone: {
          title: "Danger Zone",
          action: {
            rename: {
              label: "Rename board",
              description:
                "Changing the name will break any links to this board.",
              button: "Change name",
              modal: {
                title: "Rename board",
              },
            },
            visibility: {
              label: "Change board visibility",
              description: {
                public: "This board is currently public.",
                private: "This board is currently private.",
              },
              button: {
                public: "Make private",
                private: "Make public",
              },
              confirm: {
                public: {
                  title: "Make board private",
                  description:
                    "Are you sure you want to make this board private? This will hide the board from the public. Links for guest users will break.",
                },
                private: {
                  title: "Make board public",
                  description:
                    "Are you sure you want to make this board public? This will make the board accessible to everyone.",
                },
              },
            },
            delete: {
              label: "Delete this board",
              description:
                "Once you delete a board, there is no going back. Please be certain.",
              button: "Delete this board",
              confirm: {
                title: "Delete board",
                description:
                  "Are you sure you want to delete this board? This will permanently delete the board and all its content.",
              },
            },
          },
        },
      },
    },
  },
  management: {
    metaTitle: "Management",
    title: {
      morning: "Good morning, {username}",
      afternoon: "Good afternoon, {username}",
      evening: "Good evening, {username}",
    },
    notFound: {
      title: "Not Found",
      text: "Could not find requested resource",
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
            logs: "Logs",
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
    page: {
      board: {
        title: "Manage boards",
        button: {
          create: "Create board",
          delete: "Delete board",
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Name",
              },
            },
          },
        },
      },
      user: {
        list: {
          metaTitle: "Manage users",
          title: "Users",
        },
        edit: {
          metaTitle: "Edit user {username}",
          section: {
            profile: {
              title: "Profile",
              form: {
                username: {
                  label: "Username",
                },
                email: {
                  label: "E-Mail",
                },
              },
            },
            preferences: {
              title: "Preferences",
            },
            security: {
              title: "Security",
              changePassword: {
                title: "Change password",
                form: {
                  password: {
                    label: "Password",
                  },
                },
                message: {
                  passwordUpdated: "Updated password",
                },
              },
            },
            dangerZone: {
              title: "Danger zone",
              action: {
                delete: {
                  label: "Delete user permanently",
                  description:
                    "Deletes this user including their preferences. Will not delete any boards. User will not be notified.",
                  button: "Delete",
                },
              },
            },
          },
        },
        create: {
          metaTitle: "Create user",
          title: "Create new user",
          step: {
            personalInformation: {
              label: "Personal information",
              field: {
                username: {
                  label: "Username",
                },
                email: {
                  label: "E-Mail",
                },
              },
            },
            security: {
              label: "Security",
              field: {
                password: {
                  label: "Password",
                },
                confirmPassword: {
                  label: "Confirm password",
                },
              },
            },
            permissions: {
              label: "Permissions",
              description: "Coming soon",
            },
            review: {
              label: "Review",
            },
            completed: {
              title: "User created",
            },
          },
          buttons: {
            createAnother: "Create another user",
            return: "Return to the user list",
          },
        },
      },
    },
  },
} as const;
