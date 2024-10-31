import "dayjs/locale/nb";

import dayjs from "dayjs";
import { MRT_Localization_NO } from "mantine-react-table/locales/no/index.esm.mjs";

dayjs.locale("nb");

export default {
  user: {
    title: "Brukere",
    name: "Bruker",
    field: {
      email: {
        label: "E-post",
      },
      username: {
        label: "Brukernavn",
      },
      password: {
        label: "Passord",
        requirement: {
          lowercase: "Inkluderer liten bokstav",
          uppercase: "Inkluderer stor bokstav",
          number: "Inkluderer nummer",
        },
      },
      passwordConfirm: {
        label: "Bekreft passord",
      },
    },
    action: {
      login: {
        label: "Logg Inn",
      },
      register: {
        label: "Opprett konto",
        notification: {
          success: {
            title: "Konto opprettet",
          },
        },
      },
      create: "Opprett bruker",
    },
  },
  group: {
    field: {
      name: "Navn",
    },
    permission: {
      admin: {
        title: "Administrator",
      },
      board: {
        title: "Tavler",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Apper",
      },
    },
    field: {
      name: {
        label: "Navn",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Navn",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Ugyldig URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Brukernavn",
        },
        password: {
          label: "Passord",
          newLabel: "Nytt passord",
        },
      },
    },
  },
  media: {
    field: {
      name: "Navn",
      size: "Størrelse",
      creator: "Skaper",
    },
  },
  common: {
    direction: "ltr",
    error: "Feil",
    action: {
      add: "Legg til",
      apply: "Bruk",
      create: "Opprett",
      edit: "Rediger",
      insert: "Sett inn",
      remove: "Fjern",
      save: "Lagre",
      saveChanges: "Lagre endringer",
      cancel: "Avbryt",
      delete: "Slett",
      confirm: "Bekreft",
      previous: "Tidligere",
      next: "Neste",
      tryAgain: "Prøv igjen",
    },
    information: {
      hours: "",
      minutes: "",
    },
    userAvatar: {
      menu: {
        preferences: "Dine innstillinger",
        login: "Logg Inn",
      },
    },
    dangerZone: "Faresonen",
    noResults: "Ingen resultater funnet",
    zod: {
      errors: {
        default: "Dette feltet er ugyldig",
        required: "Dette feltet er obligatorisk",
      },
    },
    mantineReactTable: MRT_Localization_NO as Readonly<Record<keyof typeof MRT_Localization_NO, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Navn",
        },
      },
      action: {
        moveUp: "Flytte opp",
        moveDown: "Flytt ned",
      },
      menu: {
        label: {
          changePosition: "Endre posisjon",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Innstillinger",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Bredde",
        },
        height: {
          label: "Høyde",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Åpne i ny fane",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Oppsett",
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
        adsBlockedToday: "Blokkert i dag",
        adsBlockedTodayPercentage: "Blokkert i dag",
        dnsQueriesToday: "Spørringer i dag",
      },
    },
    dnsHoleControls: {
      description: "Kontroller PiHole eller AdGuard fra dashbordet",
      option: {
        layout: {
          label: "Oppsett",
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
        set: "",
        enabled: "Aktivert",
        disabled: "Deaktivert",
        hours: "",
        minutes: "",
      },
    },
    clock: {
      description: "Viser gjeldende dato og klokkeslett.",
      option: {
        timezone: {
          label: "Tidssone",
        },
      },
    },
    notebook: {
      name: "Notisbok",
      option: {
        showToolbar: {
          label: "Vis verktøylinjen for å hjelpe deg med å skrive markdown",
        },
        allowReadOnlyCheck: {
          label: "Tillat sjekk i skrivebeskyttet modus",
        },
        content: {
          label: "Innholdet i notatboken",
        },
      },
      controls: {
        bold: "Fet",
        italic: "Kursiv",
        strikethrough: "Gjennomstrek",
        underline: "Understrek",
        colorText: "Fargetekst",
        colorHighlight: "Farget uthevet tekst",
        code: "Kode",
        clear: "Fjern formatering",
        blockquote: "Blokksitat",
        horizontalLine: "Horisontal linje",
        bulletList: "Punktliste",
        orderedList: "Sortert liste",
        checkList: "Sjekkliste",
        increaseIndent: "Øk innrykk",
        decreaseIndent: "Reduser innrykk",
        link: "Link",
        unlink: "Fjern lenke",
        image: "Bygg inn bilde",
        addTable: "Legg til tabell",
        deleteTable: "Slett tabell",
        colorCell: "Fargecelle",
        mergeCell: "Slå cellesammenslåing av/på",
        addColumnLeft: "Legg til kolonne før",
        addColumnRight: "Legg til kolonne etter",
        deleteColumn: "Slett kolonne",
        addRowTop: "Legg til rad før",
        addRowBelow: "Legg til rad etter",
        deleteRow: "Slett rad",
      },
      align: {
        left: "Venstre",
        center: "Midtstilt",
        right: "Høyre",
      },
      popover: {
        clearColor: "Fjern farge",
        source: "Kilde",
        widthPlaceholder: "Verdi i % eller piksler",
        columns: "Kolonner",
        rows: "Rader",
        width: "Bredde",
        height: "Høyde",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Bygg inn innhold fra Internett. Noen nettsteder kan begrense adgang.",
      option: {
        embedUrl: {
          label: "Bygg inn URL",
        },
        allowFullScreen: {
          label: "Tillat fullskjerm",
        },
        allowTransparency: {
          label: "Tillat gjennomsiktighet",
        },
        allowScrolling: {
          label: "Tillat skrolling",
        },
        allowPayment: {
          label: "Tillat betaling",
        },
        allowAutoPlay: {
          label: "Tillat automatisk avspilling",
        },
        allowMicrophone: {
          label: "Tillat mikrofon",
        },
        allowCamera: {
          label: "Tillat kamera",
        },
        allowGeolocation: {
          label: "Tillat geolokalisering",
        },
      },
      error: {
        noBrowerSupport: "Nettleseren din støtter ikke iframes. Vennligst oppdater nettleseren din.",
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
          label: "Visningsnavn",
        },
        automationId: {
          label: "Automatisering ID",
        },
      },
    },
    calendar: {
      name: "Kalender",
      option: {
        releaseType: {
          label: "Radarr utgivelsestype",
        },
      },
    },
    weather: {
      name: "Vær",
      description: "Viser gjeldende værinformasjon for en angitt plassering.",
      option: {
        location: {
          label: "Vær plassering",
        },
      },
      kind: {
        clear: "Tøm",
        mainlyClear: "Klar himmel",
        fog: "Tåke",
        drizzle: "Yr",
        freezingDrizzle: "Underkjølt yr",
        rain: "Regn",
        freezingRain: "Underkjølt regn",
        snowFall: "Snø",
        snowGrains: "Snø korn",
        rainShowers: "Regnbyger",
        snowShowers: "Snøbyger",
        thunderstorm: "Tordenvær",
        thunderstormWithHail: "Tordenvær med hagl",
        unknown: "Ukjent",
      },
    },
    indexerManager: {
      name: "Indekserings-behandler status",
      title: "Indekserings-behandler",
      testAll: "Test alle",
    },
    healthMonitoring: {
      name: "Systemhelseovervåking",
      description: "Viser informasjon som viser helsen og statusen til systemet(e).",
      option: {
        fahrenheit: {
          label: "CPU-temp i Fahrenheit",
        },
        cpu: {
          label: "Vis CPU-info",
        },
        memory: {
          label: "Vis minneinfo",
        },
        fileSystem: {
          label: "Vis filsysteminfo",
        },
      },
      popover: {
        available: "Tilgjengelig",
      },
    },
    common: {
      location: {
        search: "Søk",
        table: {
          header: {},
          population: {
            fallback: "Ukjent",
          },
        },
      },
    },
    video: {
      name: "Videostrømming",
      description: "Bygg inn en videostrøm eller video fra et kamera eller et nettsted",
      option: {
        feedUrl: {
          label: "Feed URL",
        },
        hasAutoPlay: {
          label: "Autospill",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Dato lagt til",
        },
        downSpeed: {
          columnTitle: "Ned",
          detailsTitle: "Nedlastings- hastighet",
        },
        integration: {
          columnTitle: "Integrasjon",
        },
        progress: {
          columnTitle: "Fremgang",
        },
        ratio: {
          columnTitle: "Forhold",
        },
        state: {
          columnTitle: "Status",
        },
        upSpeed: {
          columnTitle: "Opp",
        },
      },
      states: {
        downloading: "Laster ned",
        queued: "",
        paused: "Pauset",
        completed: "Fullført",
        unknown: "Ukjent",
      },
    },
    "mediaRequests-requestList": {
      description: "Se en liste over alle medieforespørsler fra din Overseerr eller Jellyseerr instans",
      option: {
        linksTargetNewTab: {
          label: "Åpne lenker i ny fane",
        },
      },
      availability: {
        unknown: "Ukjent",
        partiallyAvailable: "Delvis",
        available: "Tilgjengelig",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistikk om dine medieforespørsler",
      titles: {
        stats: {
          main: "Media statistikk",
          approved: "Allerede godkjent",
          pending: "Venter på godkjenning",
          tv: "TV forespørsler",
          movie: "Film forespørsler",
          total: "Totalt",
        },
        users: {
          main: "Topp brukere",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Apper",
          },
          screenSize: {
            option: {
              sm: "Liten",
              md: "Medium",
              lg: "Stor",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Bakgrunnsbildevedlegg",
      },
      backgroundImageSize: {
        label: "Størrelse på bakgrunnsbilde",
      },
      primaryColor: {
        label: "Primærfarge",
      },
      secondaryColor: {
        label: "Sekundærfarge",
      },
      customCss: {
        description: "Videre kan du tilpasse dashbordet ved hjelp av CSS, dette er bare anbefalt for erfarne brukere",
      },
      name: {
        label: "Navn",
      },
      isPublic: {
        label: "Offentlig",
      },
    },
    setting: {
      section: {
        general: {
          title: "Generelt",
        },
        layout: {
          title: "Oppsett",
        },
        background: {
          title: "Bakgrunn",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Vis tavle",
              },
            },
          },
        },
        dangerZone: {
          title: "Faresonen",
          action: {
            delete: {
              confirm: {
                title: "Slett tavle",
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
        home: "Hjem",
        boards: "Tavler",
        apps: "Apper",
        users: {
          label: "Brukere",
          items: {
            manage: "Administrer",
            invites: "Invitasjoner",
          },
        },
        tools: {
          label: "Verktøy",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Innstillinger",
        help: {
          label: "Hjelp",
          items: {
            documentation: "Dokumentasjon",
            discord: "Discord",
          },
        },
        about: "Info",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Tavler",
          user: "Brukere",
          invite: "Invitasjoner",
          app: "Apper",
        },
        statisticLabel: {
          boards: "Tavler",
        },
      },
      board: {
        title: "Dine tavler",
        action: {
          settings: {
            label: "Innstillinger",
          },
          setHomeBoard: {
            badge: {
              label: "Hjem",
            },
          },
          delete: {
            label: "Slett permanent",
            confirm: {
              title: "Slett tavle",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Navn",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Generelt",
            item: {
              firstDayOfWeek: "Første dag i uken",
              accessibility: "Hjelpemidler",
            },
          },
          security: {
            title: "Sikkerhet",
          },
          board: {
            title: "Tavler",
          },
        },
        list: {
          metaTitle: "Administrer brukere",
          title: "Brukere",
        },
        create: {
          metaTitle: "Opprett bruker",
          step: {
            security: {
              label: "Sikkerhet",
            },
          },
        },
        invite: {
          title: "Administrer brukerinvitasjoner",
          action: {
            new: {
              description:
                "Etter utløpet vil en invitasjon ikke lenger være gyldig, og mottakeren av invitasjonen vil ikke kunne opprette en konto.",
            },
            copy: {
              link: "Invitasjonslenke",
            },
            delete: {
              title: "Slett invitasjon",
              description:
                "Er du sikker på at du vil slette denne invitasjonen? Brukere med denne koblingen vil ikke lenger kunne opprette en konto ved å bruke den linken.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Skaper",
            },
            expirationDate: {
              label: "Utløpsdato",
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
            title: "Generelt",
          },
        },
      },
      settings: {
        title: "Innstillinger",
      },
      tool: {
        tasks: {
          status: {
            running: "Kjører",
            error: "Feil",
          },
          job: {
            mediaServer: {
              label: "Medieserver",
            },
            mediaRequests: {
              label: "Media forespørsler",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Dokumentasjon",
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
    title: "",
    field: {
      name: {
        label: "Navn",
      },
      state: {
        label: "Status",
        option: {
          created: "Opprettet",
          running: "Kjører",
          paused: "Pauset",
          restarting: "Starter på nytt",
          removing: "Fjerner",
        },
      },
      containerImage: {
        label: "Image",
      },
      ports: {
        label: "Porter",
      },
    },
    action: {
      start: {
        label: "Start",
      },
      stop: {
        label: "Stopp",
      },
      restart: {
        label: "Omstart",
      },
      remove: {
        label: "Fjern",
      },
    },
  },
  permission: {
    tab: {
      user: "Brukere",
    },
    field: {
      user: {
        label: "Bruker",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Administrer",
      boards: {
        label: "Tavler",
      },
      integrations: {
        edit: {
          label: "Rediger",
        },
      },
      "search-engines": {
        edit: {
          label: "Rediger",
        },
      },
      apps: {
        label: "Apper",
        edit: {
          label: "Rediger",
        },
      },
      users: {
        label: "Brukere",
        create: {
          label: "Opprett",
        },
        general: "Generelt",
        security: "Sikkerhet",
        board: "Tavler",
        invites: {
          label: "Invitasjoner",
        },
      },
      tools: {
        label: "Verktøy",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Innstillinger",
      },
      about: {
        label: "Info",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Apper",
          },
          board: {
            title: "Tavler",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Torrenter",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Hjelp",
            option: {
              documentation: {
                label: "Dokumentasjon",
              },
              discord: {
                label: "Discord",
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
                label: "Administrer brukere",
              },
              about: {
                label: "Info",
              },
              preferences: {
                label: "Dine innstillinger",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Brukere",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Navn",
        },
      },
    },
  },
} as const;
