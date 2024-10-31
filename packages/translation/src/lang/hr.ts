import "dayjs/locale/hr";

import dayjs from "dayjs";
import { MRT_Localization_HR } from "mantine-react-table/locales/hr/index.esm.mjs";

dayjs.locale("hr");

export default {
  user: {
    title: "Korisnici",
    name: "Korisnik",
    field: {
      email: {
        label: "E-pošta",
      },
      username: {
        label: "Korisničko ime",
      },
      password: {
        label: "Lozinka",
        requirement: {
          lowercase: "Uključuje mala slova",
          uppercase: "Uključuje veliko slovo",
          number: "Uključuje broj",
        },
      },
      passwordConfirm: {
        label: "Potvrdi lozinku",
      },
    },
    action: {
      login: {
        label: "Prijaviti se",
      },
      register: {
        label: "Napravi račun",
        notification: {
          success: {
            title: "Račun kreiran",
          },
        },
      },
      create: "Stvori korisnika",
    },
  },
  group: {
    field: {
      name: "Naziv",
    },
    permission: {
      admin: {
        title: "",
      },
      board: {
        title: "Daske",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "aplikacije",
      },
    },
    field: {
      name: {
        label: "Naziv",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Naziv",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Neispravan URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Korisničko ime",
        },
        password: {
          label: "Lozinka",
          newLabel: "",
        },
      },
    },
  },
  media: {
    field: {
      name: "Naziv",
      size: "Veličina",
      creator: "Stvoritelj",
    },
  },
  common: {
    direction: "ltr",
    error: "Pogreška",
    action: {
      add: "Dodaj",
      apply: "",
      create: "Stvoriti",
      edit: "Uredi",
      insert: "",
      remove: "Ukloni",
      save: "Spremi",
      saveChanges: "Spremi promjene",
      cancel: "Otkaži",
      delete: "Obriši",
      confirm: "Potvrdi",
      previous: "Prethodno",
      next: "Sljedeći",
      tryAgain: "Pokušaj ponovno",
    },
    information: {
      hours: "",
      minutes: "",
    },
    userAvatar: {
      menu: {
        preferences: "Vaše preferencije",
        login: "Prijaviti se",
      },
    },
    dangerZone: "Opasna zona",
    noResults: "Nije pronađen nijedan rezultat",
    zod: {
      errors: {
        default: "Ovo polje nije važeće",
        required: "ovo polje je obavezno",
      },
    },
    mantineReactTable: MRT_Localization_HR as Readonly<Record<keyof typeof MRT_Localization_HR, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Naziv",
        },
      },
      action: {
        moveUp: "Pomakni se gore",
        moveDown: "Pomicati prema dolje",
      },
      menu: {
        label: {
          changePosition: "Promijenjen položaj",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Postavke",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Širina",
        },
        height: {
          label: "Visina",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Otvori u novoj kartici",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Raspored",
          option: {
            row: {
              label: "Horizontalno",
            },
            column: {
              label: "Okomito",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "",
        adsBlockedTodayPercentage: "",
        dnsQueriesToday: "Upiti danas",
      },
    },
    dnsHoleControls: {
      description: "Upravljajte PiHole ili AdGuard iz svoje nadzorne ploče",
      option: {
        layout: {
          label: "Raspored",
          option: {
            row: {
              label: "Horizontalno",
            },
            column: {
              label: "Okomito",
            },
          },
        },
      },
      controls: {
        set: "",
        enabled: "Omogućeno",
        disabled: "Onemogućeno",
        hours: "",
        minutes: "",
      },
    },
    clock: {
      description: "Prikaži trenutni datum i vrijeme.",
      option: {
        timezone: {
          label: "",
        },
      },
    },
    notebook: {
      name: "Bilježnica",
      option: {
        showToolbar: {
          label: "Prikažite alatnu traku koja će vam pomoći u pisanju oznake",
        },
        allowReadOnlyCheck: {
          label: "",
        },
        content: {
          label: "Sadržaj bilježnice",
        },
      },
      controls: {
        bold: "",
        italic: "",
        strikethrough: "",
        underline: "",
        colorText: "",
        colorHighlight: "",
        code: "",
        clear: "",
        blockquote: "",
        horizontalLine: "",
        bulletList: "",
        orderedList: "",
        checkList: "",
        increaseIndent: "",
        decreaseIndent: "",
        link: "",
        unlink: "",
        image: "",
        addTable: "",
        deleteTable: "",
        colorCell: "",
        mergeCell: "",
        addColumnLeft: "",
        addColumnRight: "",
        deleteColumn: "",
        addRowTop: "",
        addRowBelow: "",
        deleteRow: "",
      },
      align: {
        left: "Lijevo",
        center: "",
        right: "Pravo",
      },
      popover: {
        clearColor: "",
        source: "",
        widthPlaceholder: "",
        columns: "",
        rows: "",
        width: "Širina",
        height: "Visina",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Ugradite bilo koji sadržaj s interneta. Neke web stranice mogu ograničiti pristup.",
      option: {
        embedUrl: {
          label: "Ugradbeni URL",
        },
        allowFullScreen: {
          label: "Dopusti puni zaslon",
        },
        allowTransparency: {
          label: "Dopusti prozirnost",
        },
        allowScrolling: {
          label: "Dopusti klizanje (scrollanje)",
        },
        allowPayment: {
          label: "Dopusti plaćanje",
        },
        allowAutoPlay: {
          label: "Dopusti automatsku reprodukciju",
        },
        allowMicrophone: {
          label: "Dopusti pristup mikrofonu",
        },
        allowCamera: {
          label: "Dopusti pristup kameri",
        },
        allowGeolocation: {
          label: "Dopusti geolociranje",
        },
      },
      error: {
        noBrowerSupport: "Vaš preglednik ne podržava iframeove. Ažurirajte svoj preglednik.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "",
        },
        automationId: {
          label: "",
        },
      },
    },
    calendar: {
      name: "Kalendar",
      option: {
        releaseType: {
          label: "Vrsta izdanja u Radarr-u",
        },
      },
    },
    weather: {
      name: "Vremenska prognoza",
      description: "Prikazuje trenutne vremenske informacije za odabranu lokaciju.",
      option: {
        location: {
          label: "Lokacija vremenske prognoze",
        },
      },
      kind: {
        clear: "Vedro",
        mainlyClear: "Uglavnom vedro",
        fog: "Maglovito",
        drizzle: "Rominjajuća kiša",
        freezingDrizzle: "Ledena kišica",
        rain: "Kiša",
        freezingRain: "Ledena kiša",
        snowFall: "Snježne padavine",
        snowGrains: "Snježne pahulje",
        rainShowers: "Pljusak",
        snowShowers: "Snježna mečava",
        thunderstorm: "Grmljavinska oluja",
        thunderstormWithHail: "Grmljavinska oluja s tučom",
        unknown: "Nepoznato",
      },
    },
    indexerManager: {
      name: "",
      title: "",
      testAll: "",
    },
    healthMonitoring: {
      name: "",
      description: "",
      option: {
        fahrenheit: {
          label: "",
        },
        cpu: {
          label: "",
        },
        memory: {
          label: "",
        },
        fileSystem: {
          label: "",
        },
      },
      popover: {
        available: "",
      },
    },
    common: {
      location: {
        search: "traži",
        table: {
          header: {},
          population: {
            fallback: "Nepoznato",
          },
        },
      },
    },
    video: {
      name: "Video Stream",
      description: "Ugradi video stream ili video sa kamere i/ili web stranice",
      option: {
        feedUrl: {
          label: "URL feed-a",
        },
        hasAutoPlay: {
          label: "Automatska reprodukcija",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "",
        },
        downSpeed: {
          columnTitle: "Isključeno",
          detailsTitle: "Brzina preuzimanja",
        },
        integration: {
          columnTitle: "Integracija",
        },
        progress: {
          columnTitle: "Napredak",
        },
        ratio: {
          columnTitle: "",
        },
        state: {
          columnTitle: "Stanje",
        },
        upSpeed: {
          columnTitle: "Uključeno",
        },
      },
      states: {
        downloading: "",
        queued: "",
        paused: "Pauzirano",
        completed: "Završeno",
        unknown: "Nepoznato",
      },
    },
    "mediaRequests-requestList": {
      description: "Pregledajte popis svih zahtjeva za medijima s vaše instance Overseerr ili Jellyseerr",
      option: {
        linksTargetNewTab: {
          label: "Otvori veze u novoj kartici",
        },
      },
      availability: {
        unknown: "Nepoznato",
        partiallyAvailable: "",
        available: "",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistika o vašim zahtjevima za medijima",
      titles: {
        stats: {
          main: "Medijska statistika",
          approved: "Već odobreno",
          pending: "Odobrenjea na čekanju",
          tv: "TV zahtjevi",
          movie: "Zahtjevi za Filmovima",
          total: "Ukupno",
        },
        users: {
          main: "Najbolji korisnici",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "aplikacije",
          },
          screenSize: {
            option: {
              sm: "Mali",
              md: "Srednji",
              lg: "velika",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "",
      },
      backgroundImageSize: {
        label: "",
      },
      primaryColor: {
        label: "Primarna boja",
      },
      secondaryColor: {
        label: "Sekundarna boja",
      },
      customCss: {
        description:
          "Dodatno, prilagodite svoju nadzornu ploču koristeći CSS, što se preporučuje samo iskusnim korisnicima",
      },
      name: {
        label: "Naziv",
      },
      isPublic: {
        label: "Javno",
      },
    },
    setting: {
      section: {
        general: {
          title: "Općenito",
        },
        layout: {
          title: "Raspored",
        },
        background: {
          title: "Pozadina",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Prikaz ploče",
              },
            },
          },
        },
        dangerZone: {
          title: "Opasna zona",
          action: {
            delete: {
              confirm: {
                title: "Izbriši ploču",
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
        home: "Dom",
        boards: "Daske",
        apps: "aplikacije",
        users: {
          label: "Korisnici",
          items: {
            manage: "Upravljati",
            invites: "poziva",
          },
        },
        tools: {
          label: "Alati",
          items: {
            docker: "Docker",
            api: "",
          },
        },
        settings: "Postavke",
        help: {
          label: "Pomozite",
          items: {
            documentation: "Dokumentacija",
            discord: "Nesloga u zajednici",
          },
        },
        about: "O aplikaciji",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Daske",
          user: "Korisnici",
          invite: "poziva",
          app: "aplikacije",
        },
        statisticLabel: {
          boards: "Daske",
        },
      },
      board: {
        title: "Vaše ploče",
        action: {
          settings: {
            label: "Postavke",
          },
          setHomeBoard: {
            badge: {
              label: "Dom",
            },
          },
          delete: {
            label: "Izbriši trajno",
            confirm: {
              title: "Izbriši ploču",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Naziv",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Općenito",
            item: {
              firstDayOfWeek: "Prvi dan u tjednu",
              accessibility: "Pristupačnost",
            },
          },
          security: {
            title: "",
          },
          board: {
            title: "Daske",
          },
        },
        list: {
          metaTitle: "Upravljanje korisnicima",
          title: "Korisnici",
        },
        create: {
          metaTitle: "Stvori korisnika",
          step: {
            security: {
              label: "",
            },
          },
        },
        invite: {
          title: "Upravljanje pozivnicama korisnika",
          action: {
            new: {
              description:
                "Nakon isteka, pozivnica više neće biti valjana i primatelj pozivnice neće moći kreirati račun.",
            },
            copy: {
              link: "Link pozivnice",
            },
            delete: {
              title: "Izbriši pozivnicu",
              description:
                "Jeste li sigurni da želite izbrisati ovu pozivnicu? Korisnici s ovom vezom više neće moći stvoriti račun pomoću te veze.",
            },
          },
          field: {
            id: {
              label: "iskaznica",
            },
            creator: {
              label: "Stvoritelj",
            },
            expirationDate: {
              label: "Datum isteka roka trajanja",
            },
            token: {
              label: "Znak",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "Općenito",
          },
        },
      },
      settings: {
        title: "Postavke",
      },
      tool: {
        tasks: {
          status: {
            running: "U radu",
            error: "Pogreška",
          },
          job: {
            mediaServer: {
              label: "Medijski poslužitelj",
            },
            mediaRequests: {
              label: "Zahtjevi za medijima",
            },
          },
        },
        api: {
          title: "",
          tab: {
            documentation: {
              label: "Dokumentacija",
            },
            apiKey: {
              table: {
                header: {
                  id: "iskaznica",
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
        label: "Naziv",
      },
      state: {
        label: "Stanje",
        option: {
          created: "Kreirano",
          running: "U radu",
          paused: "Pauzirano",
          restarting: "Ponovno pokretanje",
          removing: "Uklanjam",
        },
      },
      containerImage: {
        label: "Slika",
      },
      ports: {
        label: "Portovi",
      },
    },
    action: {
      start: {
        label: "Pokreni",
      },
      stop: {
        label: "Zaustavi",
      },
      restart: {
        label: "Ponovo pokreni",
      },
      remove: {
        label: "Ukloni",
      },
    },
  },
  permission: {
    tab: {
      user: "Korisnici",
    },
    field: {
      user: {
        label: "Korisnik",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Upravljati",
      boards: {
        label: "Daske",
      },
      integrations: {
        edit: {
          label: "Uredi",
        },
      },
      "search-engines": {
        edit: {
          label: "Uredi",
        },
      },
      apps: {
        label: "aplikacije",
        edit: {
          label: "Uredi",
        },
      },
      users: {
        label: "Korisnici",
        create: {
          label: "Stvoriti",
        },
        general: "Općenito",
        security: "",
        board: "Daske",
        invites: {
          label: "poziva",
        },
      },
      tools: {
        label: "Alati",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Postavke",
      },
      about: {
        label: "O aplikaciji",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "aplikacije",
          },
          board: {
            title: "Daske",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Torrenti",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Pomozite",
            option: {
              documentation: {
                label: "Dokumentacija",
              },
              discord: {
                label: "Nesloga u zajednici",
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
                label: "Upravljanje korisnicima",
              },
              about: {
                label: "O aplikaciji",
              },
              preferences: {
                label: "Vaše preferencije",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Korisnici",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Naziv",
        },
      },
    },
  },
} as const;
