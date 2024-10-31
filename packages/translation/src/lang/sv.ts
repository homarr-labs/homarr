import "dayjs/locale/sv";

import dayjs from "dayjs";
import { MRT_Localization_SV } from "mantine-react-table/locales/sv/index.esm.mjs";

dayjs.locale("sv");

export default {
  user: {
    title: "Användare",
    name: "Användare",
    field: {
      email: {
        label: "E-post",
      },
      username: {
        label: "Användarnamn",
      },
      password: {
        label: "Lösenord",
        requirement: {
          lowercase: "Inkluderar liten bokstav",
          uppercase: "Inkluderar stor bokstav",
          number: "Inkluderar nummer",
        },
      },
      passwordConfirm: {
        label: "Bekräfta lösenord",
      },
    },
    action: {
      login: {
        label: "Logga in",
      },
      register: {
        label: "Skapa konto",
        notification: {
          success: {
            title: "Konto skapat",
          },
        },
      },
      create: "Skapa användare",
    },
  },
  group: {
    field: {
      name: "Namn",
    },
    permission: {
      admin: {
        title: "Admin",
      },
      board: {
        title: "Tavlor",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Appar",
      },
    },
    field: {
      name: {
        label: "Namn",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Namn",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Ogiltig URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Användarnamn",
        },
        password: {
          label: "Lösenord",
          newLabel: "Nytt lösenord",
        },
      },
    },
  },
  media: {
    field: {
      name: "Namn",
      size: "Storlek",
      creator: "Skapare",
    },
  },
  common: {
    direction: "ltr",
    error: "Fel",
    action: {
      add: "Lägg till",
      apply: "Verkställ",
      create: "Skapa",
      edit: "Redigera",
      insert: "Infoga",
      remove: "Ta bort",
      save: "Spara",
      saveChanges: "Spara ändringar",
      cancel: "Avbryt",
      delete: "Radera",
      confirm: "Bekräfta",
      previous: "Föregående",
      next: "Nästa",
      tryAgain: "Försök igen",
    },
    information: {
      hours: "Timmar",
      minutes: "Minuter",
    },
    userAvatar: {
      menu: {
        preferences: "Dina Inställningar",
        login: "Logga in",
      },
    },
    dangerZone: "Farozon",
    noResults: "Hittade inga resultat",
    zod: {
      errors: {
        default: "Fältet är ogiltigt",
        required: "Detta fält är obligatoriskt",
      },
    },
    mantineReactTable: MRT_Localization_SV as Readonly<Record<keyof typeof MRT_Localization_SV, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Namn",
        },
      },
      action: {
        moveUp: "Flytta uppåt",
        moveDown: "Flytta nedåt",
      },
      menu: {
        label: {
          changePosition: "Ändra position",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Inställningar",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Bredd",
        },
        height: {
          label: "Höjd",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Öppna i ny flik",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Layout",
          option: {
            row: {
              label: "Horisontal",
            },
            column: {
              label: "Vertikal",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Blockerade idag",
        adsBlockedTodayPercentage: "Blockerade idag",
        dnsQueriesToday: "Förfrågningar idag",
      },
    },
    dnsHoleControls: {
      description: "Styr PiHole eller AdGuard från din instrumentpanel",
      option: {
        layout: {
          label: "Layout",
          option: {
            row: {
              label: "Horisontal",
            },
            column: {
              label: "Vertikal",
            },
          },
        },
      },
      controls: {
        set: "Ställ in",
        enabled: "Aktiverad",
        disabled: "Inaktiverad",
        hours: "Timmar",
        minutes: "Minuter",
      },
    },
    clock: {
      description: "Visar aktuellt datum och tid.",
      option: {
        timezone: {
          label: "Tidszon",
        },
      },
    },
    notebook: {
      name: "Anteckningsbok",
      option: {
        showToolbar: {
          label: "Visa verktygsfältet för att hjälpa dig skriva markdown",
        },
        allowReadOnlyCheck: {
          label: "Tillåt check i skrivskyddat läge",
        },
        content: {
          label: "Innehållet i anteckningsboken",
        },
      },
      controls: {
        bold: "Fet",
        italic: "Kursiv",
        strikethrough: "Genomstruken",
        underline: "Understruken",
        colorText: "Textfärg",
        colorHighlight: "Färgad markerad text",
        code: "Kod",
        clear: "Rensa formatering",
        blockquote: "Blockcitat",
        horizontalLine: "Horisontell linje",
        bulletList: "Punktlista",
        orderedList: "Sorterad lista",
        checkList: "Checklista",
        increaseIndent: "Öka indrag",
        decreaseIndent: "Minska indrag",
        link: "Länk",
        unlink: "Ta bort länk",
        image: "Bädda in bild",
        addTable: "Lägg till tabell",
        deleteTable: "Ta bort tabell",
        colorCell: "Färga cell",
        mergeCell: "Växla sammanslagning av celler",
        addColumnLeft: "Lägg till kolumn före",
        addColumnRight: "Lägg till kolumn efter",
        deleteColumn: "Radera kolumn",
        addRowTop: "Lägg till rad före",
        addRowBelow: "Lägg till rad efter",
        deleteRow: "Radera rad",
      },
      align: {
        left: "Vänster",
        center: "Centrera",
        right: "Höger",
      },
      popover: {
        clearColor: "Rensa färg",
        source: "Källa",
        widthPlaceholder: "Värde i % eller pixlar",
        columns: "Kolumner",
        rows: "Rader",
        width: "Bredd",
        height: "Höjd",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Bädda in valfritt innehåll från internet. Vissa webbplatser kan begränsa åtkomsten.",
      option: {
        embedUrl: {
          label: "Inbäddad URL",
        },
        allowFullScreen: {
          label: "Tillåt helskärm",
        },
        allowTransparency: {
          label: "Tillåt opacitet",
        },
        allowScrolling: {
          label: "Tillåt scrollning",
        },
        allowPayment: {
          label: "Tillåt betalning",
        },
        allowAutoPlay: {
          label: "Tillåt automatisk uppspelning",
        },
        allowMicrophone: {
          label: "Tillåt mikrofon",
        },
        allowCamera: {
          label: "Tillåt kamera",
        },
        allowGeolocation: {
          label: "Tillåt geolokalisering",
        },
      },
      error: {
        noBrowerSupport: "Din webbläsare stöder inte iframes. Vänligen uppdatera din webbläsare.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "Enhets-ID",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Visningsnamn",
        },
        automationId: {
          label: "Automations-ID",
        },
      },
    },
    calendar: {
      name: "Kalender",
      option: {
        releaseType: {
          label: "Radarr releasetyp",
        },
      },
    },
    weather: {
      name: "Väder",
      description: "Visar aktuell väderinformation för en bestämd plats.",
      option: {
        location: {
          label: "Plats för väder",
        },
      },
      kind: {
        clear: "Klart",
        mainlyClear: "Främst klart",
        fog: "Dimma",
        drizzle: "Duggregn",
        freezingDrizzle: "Underkylt duggregn",
        rain: "Regn",
        freezingRain: "Underkylt regn",
        snowFall: "Snöfall",
        snowGrains: "Snökorn",
        rainShowers: "Regnskurar",
        snowShowers: "Snöblandat regn",
        thunderstorm: "Åska",
        thunderstormWithHail: "Åskväder med hagel",
        unknown: "Okänd",
      },
    },
    indexerManager: {
      name: "Status för indexeringshanteraren",
      title: "Indexeringshanterare",
      testAll: "Testa alla",
    },
    healthMonitoring: {
      name: "Övervakning av systemhälsan",
      description: "Visar information som visar hälsa och status för ditt/dina system.",
      option: {
        fahrenheit: {
          label: "CPU-temperatur i Fahrenheit",
        },
        cpu: {
          label: "Visa CPU-information",
        },
        memory: {
          label: "Visa minnesinformation",
        },
        fileSystem: {
          label: "Visa information om filsystemet",
        },
      },
      popover: {
        available: "Tillgänglig",
      },
    },
    common: {
      location: {
        search: "Sök",
        table: {
          header: {},
          population: {
            fallback: "Okänd",
          },
        },
      },
    },
    video: {
      name: "Videoström",
      description: "Bädda in en videoström eller video från en kamera eller en webbplats",
      option: {
        feedUrl: {
          label: "Flödes-URL",
        },
        hasAutoPlay: {
          label: "Automatisk uppspelning",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Datum tillagt",
        },
        downSpeed: {
          columnTitle: "Ned",
          detailsTitle: "Nedladdningshastighet ",
        },
        integration: {
          columnTitle: "Integration",
        },
        progress: {
          columnTitle: "Förlopp",
        },
        ratio: {
          columnTitle: "Förhållande",
        },
        state: {
          columnTitle: "Läge",
        },
        upSpeed: {
          columnTitle: "Upp",
        },
      },
      states: {
        downloading: "Laddar ner",
        queued: "Köad",
        paused: "Pausad",
        completed: "Slutförd",
        unknown: "Okänd",
      },
    },
    "mediaRequests-requestList": {
      description: "Se en lista över alla medieförfrågningar från din Overseerr- eller Jellyseerr-instans",
      option: {
        linksTargetNewTab: {
          label: "Öppna länkar i ny flik",
        },
      },
      availability: {
        unknown: "Okänd",
        partiallyAvailable: "Delvis",
        available: "Tillgänglig",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistik över dina medieförfrågningar",
      titles: {
        stats: {
          main: "Mediestatistik",
          approved: "Redan godkänd",
          pending: "Väntar på godkännande",
          tv: "TV-förfrågningar",
          movie: "Filmförfrågningar",
          total: "Totalt",
        },
        users: {
          main: "Toppanvändare",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Appar",
          },
          screenSize: {
            option: {
              sm: "Liten",
              md: "Mellan",
              lg: "Stor",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Bilaga till bakgrundsbild",
      },
      backgroundImageSize: {
        label: "Storlek på bakgrundsbild",
      },
      primaryColor: {
        label: "Primärfärg",
      },
      secondaryColor: {
        label: "Sekundärfärg",
      },
      customCss: {
        description:
          "Vidare kan du anpassa din instrumentpanel med CSS, vilket endast rekommenderas för erfarna användare",
      },
      name: {
        label: "Namn",
      },
      isPublic: {
        label: "Publik",
      },
    },
    setting: {
      section: {
        general: {
          title: "Allmänt",
        },
        layout: {
          title: "Layout",
        },
        background: {
          title: "Bakgrund",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Visa tavlan",
              },
            },
          },
        },
        dangerZone: {
          title: "Farozon",
          action: {
            delete: {
              confirm: {
                title: "Ta bort tavla",
              },
            },
          },
        },
      },
    },
  },
  management: {
    navbar: {
      items: {
        home: "Hem",
        boards: "Tavlor",
        apps: "Appar",
        users: {
          label: "Användare",
          items: {
            manage: "Hantera",
            invites: "Inbjudningar",
          },
        },
        tools: {
          label: "Verktyg",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Inställningar",
        help: {
          label: "Hjälp",
          items: {
            documentation: "Dokumentation",
            discord: "Gemenskapens Discord",
          },
        },
        about: "Om",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Tavlor",
          user: "Användare",
          invite: "Inbjudningar",
          app: "Appar",
        },
        statisticLabel: {
          boards: "Tavlor",
        },
      },
      board: {
        title: "Dina tavlor",
        action: {
          settings: {
            label: "Inställningar",
          },
          setHomeBoard: {
            badge: {
              label: "Hem",
            },
          },
          delete: {
            label: "Radera permanent",
            confirm: {
              title: "Ta bort tavla",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Namn",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Allmänt",
            item: {
              firstDayOfWeek: "Första veckodagen",
              accessibility: "Tillgänglighet",
            },
          },
          security: {
            title: "Säkerhet",
          },
          board: {
            title: "Tavlor",
          },
        },
        list: {
          metaTitle: "Hantera användare",
          title: "Användare",
        },
        create: {
          metaTitle: "Skapa användare",
          step: {
            security: {
              label: "Säkerhet",
            },
          },
        },
        invite: {
          title: "Hantera användarinbjudningar",
          action: {
            new: {
              description:
                "Efter utgångsdatumet är en inbjudan inte längre giltig och mottagaren av inbjudan kan inte skapa ett konto.",
            },
            copy: {
              link: "Inbjudningslänk",
            },
            delete: {
              title: "Ta bort inbjudan",
              description:
                "Är du säker på att du vill ta bort den här inbjudan? Användare med den här länken kommer inte längre att kunna skapa ett konto med hjälp av den länken.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Skapare",
            },
            expirationDate: {
              label: "Utgångsdatum",
            },
            token: {
              label: "Token",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "Allmänt",
          },
        },
      },
      settings: {
        title: "Inställningar",
      },
      tool: {
        tasks: {
          status: {
            running: "Körs",
            error: "Fel",
          },
          job: {
            mediaServer: {
              label: "Mediaserver",
            },
            mediaRequests: {
              label: "Media-förfrågningar",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Dokumentation",
            },
            apiKey: {
              table: {
                header: {
                  id: "ID",
                },
              },
            },
          },
        },
      },
    },
  },
  docker: {
    title: "Containers",
    field: {
      name: {
        label: "Namn",
      },
      state: {
        label: "Läge",
        option: {
          created: "Skapad",
          running: "Körs",
          paused: "Pausad",
          restarting: "Startar om",
          removing: "Tar bort",
        },
      },
      containerImage: {
        label: "Image",
      },
      ports: {
        label: "Portar",
      },
    },
    action: {
      start: {
        label: "Starta",
      },
      stop: {
        label: "Stoppa",
      },
      restart: {
        label: "Starta om",
      },
      remove: {
        label: "Ta bort",
      },
    },
  },
  permission: {
    tab: {
      user: "Användare",
    },
    field: {
      user: {
        label: "Användare",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Hantera",
      boards: {
        label: "Tavlor",
      },
      integrations: {
        edit: {
          label: "Redigera",
        },
      },
      "search-engines": {
        edit: {
          label: "Redigera",
        },
      },
      apps: {
        label: "Appar",
        edit: {
          label: "Redigera",
        },
      },
      users: {
        label: "Användare",
        create: {
          label: "Skapa",
        },
        general: "Allmänt",
        security: "Säkerhet",
        board: "Tavlor",
        invites: {
          label: "Inbjudningar",
        },
      },
      tools: {
        label: "Verktyg",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Inställningar",
      },
      about: {
        label: "Om",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Appar",
          },
          board: {
            title: "Tavlor",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Torrents",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Hjälp",
            option: {
              documentation: {
                label: "Dokumentation",
              },
              discord: {
                label: "Gemenskapens Discord",
              },
            },
          },
        },
      },
      page: {
        group: {
          page: {
            option: {
              manageUser: {
                label: "Hantera användare",
              },
              about: {
                label: "Om",
              },
              preferences: {
                label: "Dina Inställningar",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Användare",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Namn",
        },
      },
    },
  },
} as const;
