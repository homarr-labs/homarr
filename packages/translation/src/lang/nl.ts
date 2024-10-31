import "dayjs/locale/nl";

import dayjs from "dayjs";
import { MRT_Localization_NL } from "mantine-react-table/locales/nl/index.esm.mjs";

dayjs.locale("nl");

export default {
  user: {
    title: "Gebruikers",
    name: "Gebruiker",
    field: {
      email: {
        label: "E-mail",
      },
      username: {
        label: "Gebruikersnaam",
      },
      password: {
        label: "Wachtwoord",
        requirement: {
          lowercase: "Inclusief kleine letter",
          uppercase: "Inclusief hoofdletter",
          number: "Inclusief aantal",
        },
      },
      passwordConfirm: {
        label: "Wachtwoord bevestigen",
      },
    },
    action: {
      login: {
        label: "Inloggen",
      },
      register: {
        label: "Account aanmaken",
        notification: {
          success: {
            title: "Account aangemaakt",
          },
        },
      },
      create: "Gebruiker aanmaken",
    },
  },
  group: {
    field: {
      name: "Naam",
    },
    permission: {
      admin: {
        title: "Beheerder",
      },
      board: {
        title: "Borden",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Apps",
      },
    },
    field: {
      name: {
        label: "Naam",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Naam",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Ongeldige URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Gebruikersnaam",
        },
        password: {
          label: "Wachtwoord",
          newLabel: "Nieuw wachtwoord",
        },
      },
    },
  },
  media: {
    field: {
      name: "Naam",
      size: "Grootte",
      creator: "Maker",
    },
  },
  common: {
    direction: "ltr",
    error: "Fout",
    action: {
      add: "Toevoegen",
      apply: "Toepassen",
      create: "Aanmaken",
      edit: "Wijzigen",
      insert: "Invoegen",
      remove: "Verwijderen",
      save: "Opslaan",
      saveChanges: "Wijzigingen opslaan",
      cancel: "Annuleren",
      delete: "Verwijderen",
      confirm: "Bevestigen",
      previous: "Vorige",
      next: "Volgende",
      tryAgain: "Probeer het opnieuw",
    },
    information: {
      hours: "Uren",
      minutes: "Minuten",
    },
    userAvatar: {
      menu: {
        preferences: "Jouw voorkeuren",
        login: "Inloggen",
      },
    },
    dangerZone: "Gevarenzone",
    noResults: "Geen resultaten gevonden",
    zod: {
      errors: {
        default: "Dit veld is ongeldig",
        required: "Dit veld is verplicht",
      },
    },
    mantineReactTable: MRT_Localization_NL as Readonly<Record<keyof typeof MRT_Localization_NL, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Naam",
        },
      },
      action: {
        moveUp: "Omhoog",
        moveDown: "Omlaag",
      },
      menu: {
        label: {
          changePosition: "Positie wijzigen",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Instellingen",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Breedte",
        },
        height: {
          label: "Hoogte",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Open in nieuw tabblad",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Indeling",
          option: {
            row: {
              label: "Horizontaal",
            },
            column: {
              label: "Verticaal",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Vandaag geblokkeerd",
        adsBlockedTodayPercentage: "Vandaag geblokkeerd",
        dnsQueriesToday: "Queries vandaag",
      },
    },
    dnsHoleControls: {
      description: "Bedien PiHole of AdGuard vanaf je dashboard",
      option: {
        layout: {
          label: "Indeling",
          option: {
            row: {
              label: "Horizontaal",
            },
            column: {
              label: "Verticaal",
            },
          },
        },
      },
      controls: {
        set: "Instellen",
        enabled: "Ingeschakeld",
        disabled: "Uitgeschakeld",
        hours: "Uren",
        minutes: "Minuten",
      },
    },
    clock: {
      description: "Toont de huidige datum en tijd.",
      option: {
        timezone: {
          label: "Tijdzone",
        },
      },
    },
    notebook: {
      name: "Notitieboek",
      option: {
        showToolbar: {
          label: "Toon de werkbalk om je te helpen markdown te schrijven",
        },
        allowReadOnlyCheck: {
          label: "Controle in alleen-lezen modus toestaan",
        },
        content: {
          label: "De inhoud van het notitieboek",
        },
      },
      controls: {
        bold: "Vetgedrukt",
        italic: "Schuingedrukt",
        strikethrough: "Doorgestreept",
        underline: "Onderstreept",
        colorText: "Kleur tekst",
        colorHighlight: "Gekleurde tekst markeren",
        code: "Code",
        clear: "Opmaak wissen",
        blockquote: "Blokquote",
        horizontalLine: "Horizontale lijn",
        bulletList: "Opsommingslijst",
        orderedList: "Geordende lijst",
        checkList: "Controlelijst",
        increaseIndent: "Inspringen vergroten",
        decreaseIndent: "Inspringen verminderen",
        link: "Link",
        unlink: "Link verwijderen",
        image: "Afbeelding insluiten",
        addTable: "Tabel toevoegen",
        deleteTable: "Tabel verwijderen",
        colorCell: "Kleur cel",
        mergeCell: "Cellen samenvoegen togglen",
        addColumnLeft: "Kolom toevoegen vóór",
        addColumnRight: "Kolom toevoegen ná",
        deleteColumn: "Kolom verwijderen",
        addRowTop: "Rij toevoegen vóór",
        addRowBelow: "Rij toevoegen ná",
        deleteRow: "Rij verwijderen",
      },
      align: {
        left: "Links",
        center: "Centreren",
        right: "Rechts",
      },
      popover: {
        clearColor: "Kleur wissen",
        source: "Bron",
        widthPlaceholder: "Waarde in % or pixels",
        columns: "Kolommen",
        rows: "Rijen",
        width: "Breedte",
        height: "Hoogte",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Insluiten van alle inhoud van het internet. Sommige websites kunnen de toegang beperken.",
      option: {
        embedUrl: {
          label: "URL insluiten",
        },
        allowFullScreen: {
          label: "Volledig scherm toestaan",
        },
        allowTransparency: {
          label: "Transparantie toestaan",
        },
        allowScrolling: {
          label: "Scrollen toestaan",
        },
        allowPayment: {
          label: "Betaling toestaan",
        },
        allowAutoPlay: {
          label: "Automatisch afspelen toestaan",
        },
        allowMicrophone: {
          label: "Microfoon toestaan",
        },
        allowCamera: {
          label: "Camera toestaan",
        },
        allowGeolocation: {
          label: "Geolocatie toestaan",
        },
      },
      error: {
        noBrowerSupport: "Je browser ondersteunt geen iframes. Update je browser.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "Entiteit-ID",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Weergavenaam",
        },
        automationId: {
          label: "Automatiserings-ID",
        },
      },
    },
    calendar: {
      name: "Kalender",
      option: {
        releaseType: {
          label: "Radarr release type",
        },
      },
    },
    weather: {
      name: "Weer",
      description: "Toont de huidige weersinformatie van een ingestelde locatie.",
      option: {
        location: {
          label: "Weerslocatie",
        },
      },
      kind: {
        clear: "Helder",
        mainlyClear: "Overwegend helder",
        fog: "Mist",
        drizzle: "Motregen",
        freezingDrizzle: "IJzel",
        rain: "Regen",
        freezingRain: "Natte sneeuw",
        snowFall: "Sneeuwval",
        snowGrains: "Sneeuw",
        rainShowers: "Regenbuien",
        snowShowers: "Sneeuwbuien",
        thunderstorm: "Onweersbui",
        thunderstormWithHail: "Onweer met hagel",
        unknown: "Onbekend",
      },
    },
    indexerManager: {
      name: "Indexeer beheerder status",
      title: "Indexeer beheerder",
      testAll: "Alles testen",
    },
    healthMonitoring: {
      name: "Systeem gezondheidsmonitoring",
      description: "Toont informatie over de gezondheid en status van je systeem(en).",
      option: {
        fahrenheit: {
          label: "CPU-temperatuur in fahrenheit",
        },
        cpu: {
          label: "CPU-info weergeven",
        },
        memory: {
          label: "Werkgeheugen info weergeven",
        },
        fileSystem: {
          label: "Bestandssysteem info weergeven",
        },
      },
      popover: {
        available: "Beschikbaar",
      },
    },
    common: {
      location: {
        search: "Zoeken",
        table: {
          header: {},
          population: {
            fallback: "Onbekend",
          },
        },
      },
    },
    video: {
      name: "Video stream",
      description: "Een videostream of video van een camera of een website insluiten",
      option: {
        feedUrl: {
          label: "Feed URL",
        },
        hasAutoPlay: {
          label: "Automatisch afspelen",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Datum toegevoegd",
        },
        downSpeed: {
          columnTitle: "Down",
          detailsTitle: "Downloadsnelheid",
        },
        integration: {
          columnTitle: "Integratie",
        },
        progress: {
          columnTitle: "Voortgang",
        },
        ratio: {
          columnTitle: "Verhouding",
        },
        state: {
          columnTitle: "Status",
        },
        upSpeed: {
          columnTitle: "Up",
        },
      },
      states: {
        downloading: "Bezig met downloaden",
        queued: "In wachtrij",
        paused: "Gepauzeerd",
        completed: "Voltooid",
        unknown: "Onbekend",
      },
    },
    "mediaRequests-requestList": {
      description: "Bekijk een lijst met alle mediaverzoeken van je Overseerr of Jellyseerr instantie",
      option: {
        linksTargetNewTab: {
          label: "Links in nieuw tabblad openen",
        },
      },
      availability: {
        unknown: "Onbekend",
        partiallyAvailable: "Gedeeltelijk",
        available: "Beschikbaar",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistieken over je mediaverzoeken",
      titles: {
        stats: {
          main: "Media statistieken",
          approved: "Reeds goedgekeurd",
          pending: "In afwachting van goedkeuring",
          tv: "TV verzoeken",
          movie: "Film verzoeken",
          total: "Totaal",
        },
        users: {
          main: "Grootste gebruikers",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Apps",
          },
          screenSize: {
            option: {
              sm: "Klein",
              md: "Middel",
              lg: "Groot",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Achtergrondafbeelding bijlage",
      },
      backgroundImageSize: {
        label: "Achtergrondafbeelding grootte",
      },
      primaryColor: {
        label: "Primaire kleur",
      },
      secondaryColor: {
        label: "Secundaire kleur",
      },
      customCss: {
        description: "Pas je dashboard verder aan met behulp van CSS, alleen aanbevolen voor ervaren gebruikers",
      },
      name: {
        label: "Naam",
      },
      isPublic: {
        label: "Openbaar",
      },
    },
    setting: {
      section: {
        general: {
          title: "Algemeen",
        },
        layout: {
          title: "Indeling",
        },
        background: {
          title: "Achtergrond",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Bord bekijken",
              },
            },
          },
        },
        dangerZone: {
          title: "Gevarenzone",
          action: {
            delete: {
              confirm: {
                title: "Bord verwijderen",
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
        home: "Home",
        boards: "Borden",
        apps: "Apps",
        users: {
          label: "Gebruikers",
          items: {
            manage: "Beheren",
            invites: "Uitnodigingen",
          },
        },
        tools: {
          label: "Gereedschappen",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Instellingen",
        help: {
          label: "Help",
          items: {
            documentation: "Documentatie",
            discord: "Community Discord",
          },
        },
        about: "Over",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Borden",
          user: "Gebruikers",
          invite: "Uitnodigingen",
          app: "Apps",
        },
        statisticLabel: {
          boards: "Borden",
        },
      },
      board: {
        title: "Jouw borden",
        action: {
          settings: {
            label: "Instellingen",
          },
          setHomeBoard: {
            badge: {
              label: "Home",
            },
          },
          delete: {
            label: "Permanent verwijderen",
            confirm: {
              title: "Bord verwijderen",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Naam",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Algemeen",
            item: {
              firstDayOfWeek: "Eerste dag van de week",
              accessibility: "Toegankelijkheid",
            },
          },
          security: {
            title: "Beveiliging",
          },
          board: {
            title: "Borden",
          },
        },
        list: {
          metaTitle: "Gebruikers beheren",
          title: "Gebruikers",
        },
        create: {
          metaTitle: "Gebruiker aanmaken",
          step: {
            security: {
              label: "Beveiliging",
            },
          },
        },
        invite: {
          title: "Gebruikersuitnodigingen beheren",
          action: {
            new: {
              description:
                "Na de vervaldatum is een uitnodiging niet langer geldig en kan de ontvanger van de uitnodiging geen account meer aanmaken.",
            },
            copy: {
              link: "Uitnodigingslink",
            },
            delete: {
              title: "Uitnodiging verwijderen",
              description:
                "Weet je zeker dat je deze uitnodiging wilt verwijderen? Gebruikers met deze link kunnen niet langer een account aanmaken met deze link.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Maker",
            },
            expirationDate: {
              label: "Vervaldatum",
            },
            token: {
              label: "Penning",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "Algemeen",
          },
        },
      },
      settings: {
        title: "Instellingen",
      },
      tool: {
        tasks: {
          status: {
            running: "Actief",
            error: "Fout",
          },
          job: {
            mediaServer: {
              label: "Media server",
            },
            mediaRequests: {
              label: "Mediaverzoeken",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Documentatie",
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
        label: "Naam",
      },
      state: {
        label: "Status",
        option: {
          created: "Aangemaakt",
          running: "Actief",
          paused: "Gepauzeerd",
          restarting: "Bezig met herstarten",
          removing: "Bezig met verwijderen",
        },
      },
      containerImage: {
        label: "Afbeelding",
      },
      ports: {
        label: "Poorten",
      },
    },
    action: {
      start: {
        label: "Start",
      },
      stop: {
        label: "Stop",
      },
      restart: {
        label: "Herstart",
      },
      remove: {
        label: "Verwijderen",
      },
    },
  },
  permission: {
    tab: {
      user: "Gebruikers",
    },
    field: {
      user: {
        label: "Gebruiker",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Beheren",
      boards: {
        label: "Borden",
      },
      integrations: {
        edit: {
          label: "Wijzigen",
        },
      },
      "search-engines": {
        edit: {
          label: "Wijzigen",
        },
      },
      apps: {
        label: "Apps",
        edit: {
          label: "Wijzigen",
        },
      },
      users: {
        label: "Gebruikers",
        create: {
          label: "Aanmaken",
        },
        general: "Algemeen",
        security: "Beveiliging",
        board: "Borden",
        invites: {
          label: "Uitnodigingen",
        },
      },
      tools: {
        label: "Gereedschappen",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Instellingen",
      },
      about: {
        label: "Over",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Apps",
          },
          board: {
            title: "Borden",
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
            title: "Help",
            option: {
              documentation: {
                label: "Documentatie",
              },
              discord: {
                label: "Community Discord",
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
                label: "Gebruikers beheren",
              },
              about: {
                label: "Over",
              },
              preferences: {
                label: "Jouw voorkeuren",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Gebruikers",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Naam",
        },
      },
    },
  },
} as const;
