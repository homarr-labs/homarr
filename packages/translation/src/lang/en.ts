import "dayjs/locale/en";

export default {
  user: {
    title: "Users",
    name: "User",
    page: {
      login: {
        title: "Log in to your account",
        subtitle: "Welcome back! Please enter your credentials",
      },
      invite: {
        title: "Join Homarr",
        subtitle: "Welcome to Homarr! Please create your account",
        description: "You were invited by {username}",
      },
      init: {
        title: "New Homarr installation",
        subtitle: "Please create the initial administator user",
      },
    },
    field: {
      email: {
        label: "E-Mail",
      },
      username: {
        label: "Username",
      },
      password: {
        label: "Password",
      },
      passwordConfirm: {
        label: "Confirm password",
      },
      previousPassword: {
        label: "Previous password",
      },
    },
    action: {
      login: {
        label: "Login",
        notification: {
          success: {
            title: "Login successful",
            message: "You are now logged in",
          },
          error: {
            title: "Login failed",
            message: "Your login failed",
          },
        },
      },
      register: {
        label: "Create account",
        notification: {
          success: {
            title: "Account created",
            message: "Please log in to continue",
          },
          error: {
            title: "Account creation failed",
            message: "Your account could not be created",
          },
        },
      },
      create: "Create user",
      changePassword: {
        label: "Change password",
        notification: {
          success: {
            message: "Password changed successfully",
          },
          error: {
            message: "Unable to change password",
          },
        },
      },
      manageAvatar: {
        changeImage: {
          label: "Change image",
          notification: {
            success: {
              message: "The image changed successfully",
            },
            error: {
              message: "Unable to change image",
            },
            toLarge: {
              title: "Image is too large",
              message: "Max image size is {size}",
            },
          },
        },
        removeImage: {
          label: "Remove image",
          confirm: "Are you sure you want to remove the image?",
          notification: {
            success: {
              message: "Image removed successfully",
            },
            error: {
              message: "Unable to remove image",
            },
          },
        },
      },
      editProfile: {
        notification: {
          success: {
            message: "Profile updated successfully",
          },
          error: {
            message: "Unable to update profile",
          },
        },
      },
      delete: {
        label: "Delete user permanently",
        description:
          "Deletes this user including their preferences. Will not delete any boards. User will not be notified.",
        confirm:
          "Are you sure, that you want to delete the user {username} with his preferences?",
      },
      select: {
        label: "Select user",
        notFound: "No user found",
      },
      transfer: {
        label: "Select new owner",
      },
    },
  },
  group: {
    title: "Groups",
    name: "Group",
    search: "Find a group",
    field: {
      name: "Name",
      members: "Members",
    },
    permission: {
      admin: {
        title: "Admin",
        item: {
          admin: {
            label: "Administrator",
            description:
              "Members with this permission have full access to all features and settings",
          },
        },
      },
      board: {
        title: "Boards",
        item: {
          create: {
            label: "Create boards",
            description: "Allow members to create boards",
          },
          "view-all": {
            label: "View all boards",
            description: "Allow members to view all boards",
          },
          "modify-all": {
            label: "Modify all boards",
            description:
              "Allow members to modify all boards (Does not include access control and danger zone)",
          },
          "full-access": {
            label: "Full board access",
            description:
              "Allow members to view, modify, and delete all boards (Including access control and danger zone)",
          },
        },
      },
      integration: {
        title: "Integrations",
        item: {
          create: {
            label: "Create integrations",
            description: "Allow members to create integrations",
          },
          "use-all": {
            label: "Use all integrations",
            description:
              "Allows members to add any integrations to their boards",
          },
          "interact-all": {
            label: "Interact with any integration",
            description: "Allow members to interact with any integration",
          },
          "full-access": {
            label: "Full integration access",
            description:
              "Allow members to manage, use and interact with any integration",
          },
        },
      },
    },
    action: {
      create: {
        label: "New group",
        notification: {
          success: {
            message: "The group was successfully created",
          },
          error: {
            message: "The group could not be created",
          },
        },
      },
      transfer: {
        label: "Transfer ownership",
        description: "Transfer ownership of this group to another user.",
        confirm:
          "Are you sure you want to transfer ownership for the group {name} to {username}?",
        notification: {
          success: {
            message: "Transfered group {group} successfully to {user}",
          },
          error: {
            message: "Unable to transfer ownership",
          },
        },
      },
      addMember: {
        label: "Add member",
      },
      removeMember: {
        label: "Remove member",
        confirm: "Are you sure you want to remove {user} from this group?",
      },
      delete: {
        label: "Delete group",
        description:
          "Once you delete a group, there is no going back. Please be certain.",
        confirm: "Are you sure you want to delete the group {name}?",
        notification: {
          success: {
            message: "Deleted group {name} successfully",
          },
          error: {
            message: "Unable to delete group {name}",
          },
        },
      },
      changePermissions: {
        notification: {
          success: {
            title: "Permissions saved",
            message: "Permissions have been saved successfully",
          },
          error: {
            title: "Permissions not saved",
            message: "Permissions have not been saved",
          },
        },
      },
      update: {
        notification: {
          success: {
            message: "The group {name} was saved successfully",
          },
          error: {
            message: "Unable to save group {name}",
          },
        },
      },
      select: {
        label: "Select group",
        notFound: "No group found",
      },
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
    rtl: "{value}{symbol}",
    symbols: {
      colon: ": ",
    },
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
      delete: "Delete",
      discard: "Discard",
      confirm: "Confirm",
      continue: "Continue",
      previous: "Previous",
      next: "Next",
      checkoutDocs: "Check out the documentation",
    },
    iconPicker: {
      header:
        "Type name or objects to filter for icons... Homarr will search through {countIcons} icons for you.",
    },
    information: {
      min: "Min",
      max: "Max",
    },
    notification: {
      create: {
        success: "Creation successful",
        error: "Creation failed",
      },
      delete: {
        success: "Deletion successful",
        error: "Deletion failed",
      },
      update: {
        success: "Changes applied successfully",
        error: "Unable to apply changes",
      },
      transfer: {
        success: "Transfer successful",
        error: "Transfer failed",
      },
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
      placeholder: "Search for anything",
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
        preferences: "Your preferences",
        logout: "Logout",
        login: "Login",
        navigateDefaultBoard: "Navigate to default board",
        loggedOut: "Logged out",
      },
    },
    dangerZone: "Danger zone",
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
            },
            groupSelect: {
              title: "Add group permission",
            },
            tab: {
              user: "Users",
              group: "Groups",
              inherited: "Inherited groups",
            },
            field: {
              user: {
                label: "User",
              },
              group: {
                label: "Group",
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
          title: "Danger zone",
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
        apps: "Apps",
        integrations: "Integrations",
        users: {
          label: "Users",
          items: {
            manage: "Manage",
            invites: "Invites",
            groups: "Groups",
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
      home: {
        statistic: {
          countBoards: "Boards",
          createUser: "Create new user",
          createInvite: "Create new invite",
          addIntegration: "Create integration",
          addApp: "Add app",
          manageRoles: "Manage roles",
        },
        statisticLabel: {
          boards: "Boards",
          resources: "Resources",
          authentication: "Authentication",
          authorization: "Authorization",
        },
      },
      board: {
        title: "Your boards",
        action: {
          new: {
            label: "New board",
          },
          open: {
            label: "Open board",
          },
          settings: {
            label: "Settings",
          },
          delete: {
            label: "Delete permanently",
            confirm: {
              title: "Delete board",
              description: "Are you sure you want to delete the {name} board?",
            },
          },
        },
        visibility: {
          public: "This board is public",
          private: "This board is private",
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
        back: "Back to users",
        setting: {
          general: {
            title: "General",
          },
          security: {
            title: "Security",
          },
        },
        list: {
          metaTitle: "Manage users",
          title: "Users",
        },
        edit: {
          metaTitle: "Edit user {username}",
        },
        create: {
          metaTitle: "Create user",
          title: "Create new user",
          step: {
            personalInformation: {
              label: "Personal information",
            },
            security: {
              label: "Security",
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
          action: {
            createAnother: "Create another user",
            back: "Return to the user list",
          },
        },
        invite: {
          title: "Manager user invites",
          action: {
            new: {
              title: "New invite",
              description:
                "After the expiration, an invite will no longer be valid and the recipient of the invite won't be able to create an account.",
            },
            copy: {
              title: "Copy invite",
              description:
                "Your invitation has been generated. After this modal closes, <b>you'll not be able to copy this link anymore</b>. If you do no longer wish to invite said person, you can delete this invitation any time.",
              link: "Invitation link",
              button: "Copy & close",
            },
            delete: {
              title: "Delete invite",
              description:
                "Are you sure, that you want to delete this invitation? Users with this link will no longer be able to create an account using that link.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Creator",
            },
            expirationDate: {
              label: "Expiration date",
            },
            token: {
              label: "Token",
            },
          },
        },
      },
      group: {
        back: "Back to groups",
        setting: {
          general: {
            title: "General",
          },
          members: {
            title: "Members",
            search: "Find a member",
            notFound: "No members found",
          },
          permissions: {
            title: "Permissions",
            form: {
              unsavedChanges: "You have unsaved changes!",
            },
          },
        },
      },
      about: {
        version: "Version {version}",
        text: "Homarr is a community driven open source project that is being maintained by volunteers. Thanks to these people, Homarr has been a growing project since 2021. Our team is working completely remote from many different countries on Homarr in their leisure time for no compensation.",
        accordion: {
          contributors: {
            title: "Contributors",
            subtitle: "{count} maintaining code & Homarr",
          },
          translators: {
            title: "Translators",
            subtitle: "{count} contributing translations in many languages",
          },
          libraries: {
            title: "Libraries",
            subtitle: "{count} used in the Code of Homarr",
          },
        },
      },
    },
  },
} as const;
