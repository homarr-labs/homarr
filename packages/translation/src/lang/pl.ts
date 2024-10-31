import "dayjs/locale/pl";

import dayjs from "dayjs";
import { MRT_Localization_PL } from "mantine-react-table/locales/pl/index.esm.mjs";

dayjs.locale("pl");

export default {
  user: {
    title: "Użytkownicy",
    name: "Użytkownik",
    field: {
      email: {
        label: "E-mail",
      },
      username: {
        label: "Nazwa użytkownika",
      },
      password: {
        label: "Hasło",
        requirement: {
          lowercase: "Zawiera małą literę",
          uppercase: "Zawiera wielką literę",
          number: "Zawiera cyfrę",
        },
      },
      passwordConfirm: {
        label: "Potwierdź hasło",
      },
    },
    action: {
      login: {
        label: "Zaloguj się",
      },
      register: {
        label: "Utwórz konto",
        notification: {
          success: {
            title: "Utworzono konto",
          },
        },
      },
      create: "Dodaj użytkownika",
    },
  },
  group: {
    field: {
      name: "Nazwa",
    },
    permission: {
      admin: {
        title: "Admin",
      },
      board: {
        title: "Tablice",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Aplikacje",
      },
    },
    field: {
      name: {
        label: "Nazwa",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Nazwa",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Nieprawidłowy URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Nazwa użytkownika",
        },
        password: {
          label: "Hasło",
          newLabel: "Nowe hasło",
        },
      },
    },
  },
  media: {
    field: {
      name: "Nazwa",
      size: "Rozmiar",
      creator: "Twórca",
    },
  },
  common: {
    direction: "ltr",
    error: "Błąd",
    action: {
      add: "Dodaj",
      apply: "Zastosuj",
      create: "Utwórz",
      edit: "Edytuj",
      insert: "Wstaw",
      remove: "Usuń",
      save: "Zapisz",
      saveChanges: "Zapisz zmiany",
      cancel: "Anuluj",
      delete: "Usuń",
      confirm: "Potwierdź",
      previous: "Poprzedni",
      next: "Dalej",
      tryAgain: "Spróbuj ponownie",
    },
    information: {
      hours: "",
      minutes: "",
    },
    userAvatar: {
      menu: {
        preferences: "Twoje preferencje",
        login: "Zaloguj się",
      },
    },
    dangerZone: "Strefa zagrożenia",
    noResults: "Nie znaleziono żadnych wyników",
    zod: {
      errors: {
        default: "To pole jest nieprawidłowe",
        required: "To pole jest wymagane",
      },
    },
    mantineReactTable: MRT_Localization_PL as Readonly<Record<keyof typeof MRT_Localization_PL, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Nazwa",
        },
      },
      action: {
        moveUp: "Przenieś w górę",
        moveDown: "Przenieś w dół",
      },
      menu: {
        label: {
          changePosition: "Zmiana pozycji",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Ustawienia",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Szerokość",
        },
        height: {
          label: "Wysokość",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Otwórz w nowej karcie",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Układ",
          option: {
            row: {
              label: "Poziomy",
            },
            column: {
              label: "Pionowy",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Zablokowane dzisiaj",
        adsBlockedTodayPercentage: "Zablokowane dzisiaj",
        dnsQueriesToday: "Zapytania dzisiaj",
      },
    },
    dnsHoleControls: {
      description: "Kontroluj PiHole lub AdGuard ze swojego pulpitu",
      option: {
        layout: {
          label: "Układ",
          option: {
            row: {
              label: "Poziomy",
            },
            column: {
              label: "Pionowy",
            },
          },
        },
      },
      controls: {
        set: "",
        enabled: "Włączony",
        disabled: "Wyłączony",
        hours: "",
        minutes: "",
      },
    },
    clock: {
      description: "Wyświetla bieżącą datę i godzinę.",
      option: {
        timezone: {
          label: "Strefa czasowa",
        },
      },
    },
    notebook: {
      name: "Notatnik",
      option: {
        showToolbar: {
          label: "Pokaż pasek narzędzi ułatwiający pisanie w markdown",
        },
        allowReadOnlyCheck: {
          label: "Zezwalaj na sprawdzanie w trybie tylko do odczytu",
        },
        content: {
          label: "Zawartość notatnika",
        },
      },
      controls: {
        bold: "Pogrubienie",
        italic: "Kursywa",
        strikethrough: "Przekreślenie",
        underline: "Podkreślenie",
        colorText: "Kolorowy tekst",
        colorHighlight: "Kolorowy wyróżniony tekst",
        code: "Kod",
        clear: "Wyczyść formatowanie",
        blockquote: "Cytat",
        horizontalLine: "Linia pozioma",
        bulletList: "Lista punktowana",
        orderedList: "Lista numerowana",
        checkList: "Lista kontrolna",
        increaseIndent: "Zwiększ wcięcie",
        decreaseIndent: "Zmniejsz wcięcie",
        link: "Odnośnik",
        unlink: "Usuń odnośnik",
        image: "Osadź obraz",
        addTable: "Dodaj tabelę",
        deleteTable: "Usuń tabelę",
        colorCell: "Kolor Komórki",
        mergeCell: "Przełączanie scalania komórek",
        addColumnLeft: "Dodaj kolumnę przed",
        addColumnRight: "Dodaj kolumnę po",
        deleteColumn: "Usuń kolumnę",
        addRowTop: "Dodaj wiersz przed",
        addRowBelow: "Dodaj wiersz po",
        deleteRow: "Usuń wiersz",
      },
      align: {
        left: "Lewo",
        center: "Wyśrodkowany",
        right: "Prawo",
      },
      popover: {
        clearColor: "Usuń kolor",
        source: "Źródło",
        widthPlaceholder: "Wartość w % lub pikselach",
        columns: "Kolumny",
        rows: "Wiersze",
        width: "Szerokość",
        height: "Wysokość",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Osadzaj dowolne treści z internetu. Niektóre strony internetowe mogą ograniczać dostęp.",
      option: {
        embedUrl: {
          label: "Osadź URL",
        },
        allowFullScreen: {
          label: "Pozwól na pełny ekran",
        },
        allowTransparency: {
          label: "Zezwól na użycie przeźroczystości",
        },
        allowScrolling: {
          label: "Zezwól na przewijanie",
        },
        allowPayment: {
          label: "Zezwalaj na płatności",
        },
        allowAutoPlay: {
          label: "Zezwalaj na automatyczne odtwarzanie",
        },
        allowMicrophone: {
          label: "Zezwól na używanie mikrofonu",
        },
        allowCamera: {
          label: "Zezwól na używanie kamery",
        },
        allowGeolocation: {
          label: "Zezwalaj na geolokalizację",
        },
      },
      error: {
        noBrowerSupport: "Twoja przeglądarka nie obsługuje ramek iframe. Zaktualizuj przeglądarkę.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "ID encji",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Nazwa wyświetlana",
        },
        automationId: {
          label: "ID automatyzacji",
        },
      },
    },
    calendar: {
      name: "Kalendarz",
      option: {
        releaseType: {
          label: "Rodzaj premiery w Radarr",
        },
      },
    },
    weather: {
      name: "Pogoda",
      description: "Wyświetla aktualne informacje o pogodzie w ustawionej lokalizacji.",
      option: {
        location: {
          label: "Lokalizacja pogody",
        },
      },
      kind: {
        clear: "Bezchmurnie",
        mainlyClear: "Częściowe zachmurzenie",
        fog: "Mgła",
        drizzle: "Mżawka",
        freezingDrizzle: "Mrożąca mżawka",
        rain: "Deszcz",
        freezingRain: "Marznący deszcz",
        snowFall: "Opady śniegu",
        snowGrains: "Ziarna śniegu",
        rainShowers: "Deszczownice",
        snowShowers: "Przelotne opady śniegu",
        thunderstorm: "Burza",
        thunderstormWithHail: "Burza z gradem",
        unknown: "Nieznany",
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
        search: "Szukaj",
        table: {
          header: {},
          population: {
            fallback: "Nieznany",
          },
        },
      },
    },
    video: {
      name: "Strumień wideo",
      description: "Osadź strumień wideo lub wideo z kamery lub strony internetowej",
      option: {
        feedUrl: {
          label: "Adres URL kanału",
        },
        hasAutoPlay: {
          label: "Autoodtwarzanie",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Data dodania",
        },
        downSpeed: {
          columnTitle: "Pobieranie",
          detailsTitle: "Prędkość pobierania",
        },
        integration: {
          columnTitle: "Integracja",
        },
        progress: {
          columnTitle: "Postęp",
        },
        ratio: {
          columnTitle: "Proporcja",
        },
        state: {
          columnTitle: "Status",
        },
        upSpeed: {
          columnTitle: "Udostępnianie",
        },
      },
      states: {
        downloading: "Pobieranie",
        queued: "",
        paused: "Zatrzymane",
        completed: "Zakończono",
        unknown: "Nieznany",
      },
    },
    "mediaRequests-requestList": {
      description: "Zobacz listę wszystkich zapytań o media z Twoich instancji Overseerr lub Jellyseerr",
      option: {
        linksTargetNewTab: {
          label: "Otwieraj linki w nowej karcie",
        },
      },
      availability: {
        unknown: "Nieznany",
        partiallyAvailable: "",
        available: "",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statystyki Twoich zapytań o media",
      titles: {
        stats: {
          main: "Statystyki mediów",
          approved: "Zatwierdzone",
          pending: "Oczekujące na zatwierdzenie",
          tv: "Zapytania o seriale",
          movie: "Zapytania o filmy",
          total: "Razem",
        },
        users: {
          main: "Najaktywniejsi użytkownicy",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Aplikacje",
          },
          screenSize: {
            option: {
              sm: "Mały",
              md: "Średni",
              lg: "Duży",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Ustawienie obrazu tła",
      },
      backgroundImageSize: {
        label: "Rozmiar obrazu tła",
      },
      primaryColor: {
        label: "Kolor podstawowy",
      },
      secondaryColor: {
        label: "Kolor akcentowy",
      },
      customCss: {
        description:
          "Jeszcze bardziej dostosuj swój pulpit za pomocą CSS, zalecane tylko dla doświadczonych użytkowników",
      },
      name: {
        label: "Nazwa",
      },
      isPublic: {
        label: "Publiczna",
      },
    },
    setting: {
      section: {
        general: {
          title: "Ogólne",
        },
        layout: {
          title: "Układ",
        },
        background: {
          title: "Tło",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Zobacz tablicę",
              },
            },
          },
        },
        dangerZone: {
          title: "Strefa zagrożenia",
          action: {
            delete: {
              confirm: {
                title: "Usuń tablicę",
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
        home: "Strona główna",
        boards: "Tablice",
        apps: "Aplikacje",
        users: {
          label: "Użytkownicy",
          items: {
            manage: "Zarządzaj",
            invites: "Zaproszenia",
          },
        },
        tools: {
          label: "Narzędzia",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Ustawienia",
        help: {
          label: "Pomoc",
          items: {
            documentation: "Dokumentacja",
            discord: "Discord społeczności",
          },
        },
        about: "O programie",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Tablice",
          user: "Użytkownicy",
          invite: "Zaproszenia",
          app: "Aplikacje",
        },
        statisticLabel: {
          boards: "Tablice",
        },
      },
      board: {
        title: "Twoje tablice",
        action: {
          settings: {
            label: "Ustawienia",
          },
          setHomeBoard: {
            badge: {
              label: "Strona główna",
            },
          },
          delete: {
            label: "Usuń trwale",
            confirm: {
              title: "Usuń tablicę",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Nazwa",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Ogólne",
            item: {
              firstDayOfWeek: "Pierwszy dzień tygodnia",
              accessibility: "Ułatwienia dostępu",
            },
          },
          security: {
            title: "Bezpieczeństwo",
          },
          board: {
            title: "Tablice",
          },
        },
        list: {
          metaTitle: "Zarządzaj użytkownikami",
          title: "Użytkownicy",
        },
        create: {
          metaTitle: "Dodaj użytkownika",
          step: {
            security: {
              label: "Bezpieczeństwo",
            },
          },
        },
        invite: {
          title: "Zarządzaj zaproszeniami",
          action: {
            new: {
              description:
                "Po wygaśnięciu zaproszenie straci ważność, a odbiorca zaproszenia nie będzie mógł utworzyć konta.",
            },
            copy: {
              link: "Link do zaproszenia",
            },
            delete: {
              title: "Usuń zaproszenie",
              description:
                "Czy na pewno chcesz usunąć to zaproszenie? Użytkownicy z tym linkiem nie będą już mogli utworzyć konta przy jego użyciu.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Twórca",
            },
            expirationDate: {
              label: "Wygasa",
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
            title: "Ogólne",
          },
        },
      },
      settings: {
        title: "Ustawienia",
      },
      tool: {
        tasks: {
          status: {
            running: "Uruchomione",
            error: "Błąd",
          },
          job: {
            mediaServer: {
              label: "Serwery mediów",
            },
            mediaRequests: {
              label: "Zapytania o media",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Dokumentacja",
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
        label: "Nazwa",
      },
      state: {
        label: "Status",
        option: {
          created: "Utworzony",
          running: "Uruchomione",
          paused: "Zatrzymane",
          restarting: "Restartowanie",
          removing: "Usuwanie",
        },
      },
      containerImage: {
        label: "Obraz",
      },
      ports: {
        label: "Porty",
      },
    },
    action: {
      start: {
        label: "Uruchom",
      },
      stop: {
        label: "Zatrzymaj",
      },
      restart: {
        label: "Uruchom ponownie",
      },
      remove: {
        label: "Usuń",
      },
    },
  },
  permission: {
    tab: {
      user: "Użytkownicy",
    },
    field: {
      user: {
        label: "Użytkownik",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Zarządzaj",
      boards: {
        label: "Tablice",
      },
      integrations: {
        edit: {
          label: "Edytuj",
        },
      },
      "search-engines": {
        edit: {
          label: "Edytuj",
        },
      },
      apps: {
        label: "Aplikacje",
        edit: {
          label: "Edytuj",
        },
      },
      users: {
        label: "Użytkownicy",
        create: {
          label: "Utwórz",
        },
        general: "Ogólne",
        security: "Bezpieczeństwo",
        board: "Tablice",
        invites: {
          label: "Zaproszenia",
        },
      },
      tools: {
        label: "Narzędzia",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Ustawienia",
      },
      about: {
        label: "O programie",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Aplikacje",
          },
          board: {
            title: "Tablice",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Torrenty",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Pomoc",
            option: {
              documentation: {
                label: "Dokumentacja",
              },
              discord: {
                label: "Discord społeczności",
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
                label: "Zarządzaj użytkownikami",
              },
              about: {
                label: "O programie",
              },
              preferences: {
                label: "Twoje preferencje",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Użytkownicy",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Nazwa",
        },
      },
    },
  },
} as const;
