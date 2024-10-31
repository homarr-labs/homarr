import "dayjs/locale/lt";

import dayjs from "dayjs";
import type { MRT_Localization } from "mantine-react-table";

dayjs.locale("lt");

export default {
  user: {
    title: "Vartotojai",
    name: "Vartotojas",
    field: {
      email: {
        label: "El. paštas",
      },
      username: {
        label: "",
      },
      password: {
        label: "Slaptažodis",
        requirement: {},
      },
      passwordConfirm: {
        label: "Patvirtinti slaptažodį",
      },
    },
    action: {
      login: {
        label: "Prisijungti",
      },
      register: {
        label: "Sukurti paskyrą",
        notification: {
          success: {
            title: "Paskyra sukurta",
          },
        },
      },
      create: "Sukurti vartotoją",
    },
  },
  group: {
    field: {
      name: "Pavadinimas",
    },
    permission: {
      admin: {
        title: "Administratorius",
      },
      board: {
        title: "Lentos",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Programėlės",
      },
    },
    field: {
      name: {
        label: "Pavadinimas",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Pavadinimas",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Klaidingas URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "",
        },
        password: {
          label: "Slaptažodis",
          newLabel: "Naujas slaptažodis",
        },
      },
    },
  },
  media: {
    field: {
      name: "Pavadinimas",
      size: "",
      creator: "Kūrėjas",
    },
  },
  common: {
    direction: "ltr",
    error: "",
    action: {
      add: "",
      apply: "",
      create: "Sukurti",
      edit: "",
      insert: "",
      remove: "Pašalinti",
      save: "",
      saveChanges: "Išsaugoti pakeitimus",
      cancel: "Atšaukti",
      delete: "",
      confirm: "",
      previous: "",
      next: "",
      tryAgain: "",
    },
    information: {
      hours: "",
      minutes: "",
    },
    userAvatar: {
      menu: {
        preferences: "",
        login: "Prisijungti",
      },
    },
    dangerZone: "",
    noResults: "Rezultatų nerasta",
    zod: {
      errors: {
        default: "",
        required: "Šis laukelis yra privalomas",
      },
    },
    mantineReactTable: {
      actions: "",
      and: "",
      cancel: "",
      changeFilterMode: "",
      changeSearchMode: "",
      clearFilter: "",
      clearSearch: "",
      clearSelection: "",
      clearSort: "",
      clickToCopy: "",
      copy: "",
      collapse: "",
      collapseAll: "",
      columnActions: "",
      copiedToClipboard: "",
      dropToGroupBy: "",
      edit: "",
      expand: "",
      expandAll: "",
      filterArrIncludes: "",
      filterArrIncludesAll: "",
      filterArrIncludesSome: "",
      filterBetween: "",
      filterBetweenInclusive: "",
      filterByColumn: "",
      filterContains: "",
      filterEmpty: "",
      filterEndsWith: "",
      filterEquals: "",
      filterEqualsString: "",
      filterFuzzy: "",
      filterGreaterThan: "",
      filterGreaterThanOrEqualTo: "",
      filterInNumberRange: "",
      filterIncludesString: "",
      filterIncludesStringSensitive: "",
      filterLessThan: "",
      filterLessThanOrEqualTo: "",
      filterMode: "",
      filterNotEmpty: "",
      filterNotEquals: "",
      filterStartsWith: "",
      filterWeakEquals: "",
      filteringByColumn: "",
      goToFirstPage: "",
      goToLastPage: "",
      goToNextPage: "",
      goToPreviousPage: "",
      grab: "",
      groupByColumn: "",
      groupedBy: "",
      hideAll: "",
      hideColumn: "",
      max: "",
      min: "",
      move: "",
      noRecordsToDisplay: "",
      noResultsFound: "",
      of: "",
      or: "",
      pin: "",
      pinToLeft: "",
      pinToRight: "",
      resetColumnSize: "",
      resetOrder: "",
      rowActions: "",
      rowNumber: "",
      rowNumbers: "",
      rowsPerPage: "",
      save: "",
      search: "",
      selectedCountOfRowCountRowsSelected: "",
      select: "",
      showAll: "",
      showAllColumns: "",
      showHideColumns: "",
      showHideFilters: "",
      showHideSearch: "",
      sortByColumnAsc: "",
      sortByColumnDesc: "",
      sortedByColumnAsc: "",
      sortedByColumnDesc: "",
      thenBy: "",
      toggleDensity: "",
      toggleFullScreen: "",
      toggleSelectAll: "",
      toggleSelectRow: "",
      toggleVisibility: "",
      ungroupByColumn: "",
      unpin: "",
      unpinAll: "",
    } satisfies MRT_Localization,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Pavadinimas",
        },
      },
      action: {
        moveUp: "Pakelti aukštyn",
        moveDown: "Perkelti žemyn",
      },
      menu: {
        label: {
          changePosition: "",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Nustatymai",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Plotis",
        },
        height: {
          label: "Aukštis",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Atidaryti naujame skirtuke",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "",
          option: {
            row: {
              label: "Horizontalus",
            },
            column: {
              label: "Vertikalus",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Šiandien užblokuota",
        adsBlockedTodayPercentage: "Šiandien užblokuota",
        dnsQueriesToday: "Užklausos šiandien",
      },
    },
    dnsHoleControls: {
      description: "Valdykite PiHole arba AdGuard iš savo prietaisų skydelio",
      option: {
        layout: {
          label: "",
          option: {
            row: {
              label: "Horizontalus",
            },
            column: {
              label: "Vertikalus",
            },
          },
        },
      },
      controls: {
        set: "",
        enabled: "",
        disabled: "",
        hours: "",
        minutes: "",
      },
    },
    clock: {
      description: "Rodo dabartinę datą ir laiką.",
      option: {
        timezone: {
          label: "Laiko juosta",
        },
      },
    },
    notebook: {
      name: "Užrašai",
      option: {
        showToolbar: {
          label: "Rodyti įrankių juostą, padedančią rašyti žymėjimą",
        },
        allowReadOnlyCheck: {
          label: "Leidimas tikrinti tik skaitymo režimu",
        },
        content: {
          label: "Užrašų knygelės turinys",
        },
      },
      controls: {
        bold: "Paryškintas",
        italic: "Pasviręs",
        strikethrough: "Perbrauktas",
        underline: "Pabrauktas",
        colorText: "Spalvotas tekstas",
        colorHighlight: "Spalvotas paryškintas tekstas",
        code: "Kodas",
        clear: "Išvalyti formatavimą",
        blockquote: "Kabutės",
        horizontalLine: "Horizontali linija",
        bulletList: "Suženklintasis sąrašas",
        orderedList: "Surikiuotas sąrašas",
        checkList: "Sąrašas",
        increaseIndent: "Padidinti įtrauką",
        decreaseIndent: "Sumažinti įtrauką",
        link: "Nuoroda",
        unlink: "Pašalinti nuorodą",
        image: "Įterpti paveikslėlį",
        addTable: "Pridėti lentelę",
        deleteTable: "Ištrinti lentelę",
        colorCell: "Spalva",
        mergeCell: "Perjungti cell sujungimą",
        addColumnLeft: "Pridėti stulpelį prieš",
        addColumnRight: "Pridėti stulpelį po",
        deleteColumn: "Naikinti stulpelį",
        addRowTop: "Pridėti eilutę prieš",
        addRowBelow: "Pridėti eilutę po",
        deleteRow: "Naikinti eilutę",
      },
      align: {
        left: "Kairėje",
        center: "",
        right: "Dešinėje",
      },
      popover: {
        clearColor: "Pašalinti spalvą",
        source: "Šaltinis",
        widthPlaceholder: "Vertė % arba pikseliais",
        columns: "Stulpeliai",
        rows: "Eilutės",
        width: "Plotis",
        height: "Aukštis",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Įterpkite bet kokį turinį iš interneto. Kai kuriose svetainėse prieiga gali būti ribojama.",
      option: {
        embedUrl: {
          label: "Įterpimo URL",
        },
        allowFullScreen: {
          label: "Leisti per visą ekraną",
        },
        allowTransparency: {
          label: "Suteikti skaidrumo",
        },
        allowScrolling: {
          label: "Leisti slinkti",
        },
        allowPayment: {
          label: "Leisti mokėti",
        },
        allowAutoPlay: {
          label: "Leisti automatinį paleidimą",
        },
        allowMicrophone: {
          label: "Įgalinti mikrofoną",
        },
        allowCamera: {
          label: "Leisti kamerą",
        },
        allowGeolocation: {
          label: "Leisti nustatyti geografinę buvimo vietą",
        },
      },
      error: {
        noBrowerSupport: "Jūsų naršyklė nepalaiko iframe. Atnaujinkite savo naršyklę.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "Subjekto ID",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Rodomas vardas",
        },
        automationId: {
          label: "Automatizavimo ID",
        },
      },
    },
    calendar: {
      name: "Kalendorius",
      option: {
        releaseType: {
          label: '"Radarr" išleidimo tipas',
        },
      },
    },
    weather: {
      name: "",
      description: "",
      option: {
        location: {
          label: "",
        },
      },
      kind: {
        clear: "",
        mainlyClear: "",
        fog: "",
        drizzle: "",
        freezingDrizzle: "",
        rain: "",
        freezingRain: "",
        snowFall: "",
        snowGrains: "",
        rainShowers: "",
        snowShowers: "",
        thunderstorm: "",
        thunderstormWithHail: "",
        unknown: "Nežinoma",
      },
    },
    indexerManager: {
      name: "Indeksavimo tvarkytuvo būsena",
      title: "Indeksavimo tvarkyklė",
      testAll: "Išbandyk viską",
    },
    healthMonitoring: {
      name: "Sistemos būklės stebėjimas",
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
        available: "Galima",
      },
    },
    common: {
      location: {
        search: "Ieškoti",
        table: {
          header: {},
          population: {
            fallback: "Nežinoma",
          },
        },
      },
    },
    video: {
      name: "",
      description: "",
      option: {
        feedUrl: {
          label: "",
        },
        hasAutoPlay: {
          label: "",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "",
        },
        downSpeed: {
          columnTitle: "Žemyn",
          detailsTitle: "Atsisiuntimo greitis",
        },
        integration: {
          columnTitle: "Integracija",
        },
        progress: {
          columnTitle: "",
        },
        ratio: {
          columnTitle: "",
        },
        state: {
          columnTitle: "Būsena",
        },
        upSpeed: {
          columnTitle: "Aukštyn",
        },
      },
      states: {
        downloading: "",
        queued: "",
        paused: "",
        completed: "",
        unknown: "Nežinoma",
      },
    },
    "mediaRequests-requestList": {
      description: 'Peržiūrėkite visų medijų užklausų iš "Overseerr" arba "Jellyseerr" sąrašą',
      option: {
        linksTargetNewTab: {
          label: "Atidaryti naujame skirtuke",
        },
      },
      availability: {
        unknown: "Nežinoma",
        partiallyAvailable: "Dalis",
        available: "Galima",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistikos apie jūsų medijų užklausas",
      titles: {
        stats: {
          main: "Medijų statistikos",
          approved: "Jau patvirtinta",
          pending: "Laukia patvirtinimo",
          tv: "TV užklausos",
          movie: "Filmų užklausos",
          total: "Iš viso",
        },
        users: {
          main: "Top vartotojai",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Programėlės",
          },
          screenSize: {
            option: {
              sm: "Mažas",
              md: "Vidutinis",
              lg: "Didelis",
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
        label: "Pagrindinė spalva",
      },
      secondaryColor: {
        label: "Antrinė spalva",
      },
      customCss: {
        description: "",
      },
      name: {
        label: "Pavadinimas",
      },
      isPublic: {
        label: "Vieša",
      },
    },
    setting: {
      section: {
        general: {
          title: "Bendras",
        },
        layout: {
          title: "",
        },
        background: {
          title: "",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Žiūrėti lentą",
              },
            },
          },
        },
        dangerZone: {
          title: "",
          action: {
            delete: {
              confirm: {
                title: "Ištrinti lentą",
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
        home: "Pagrindinis",
        boards: "Lentos",
        apps: "Programėlės",
        users: {
          label: "Vartotojai",
          items: {
            manage: "Valdyti",
            invites: "Pakvietimai",
          },
        },
        tools: {
          label: "Įrankiai",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Nustatymai",
        help: {
          label: "Pagalba",
          items: {
            documentation: "Dokumentacija",
            discord: "Bendruomenės Discord",
          },
        },
        about: "",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Lentos",
          user: "Vartotojai",
          invite: "Pakvietimai",
          app: "Programėlės",
        },
        statisticLabel: {
          boards: "Lentos",
        },
      },
      board: {
        title: "Jūsų lentos",
        action: {
          settings: {
            label: "Nustatymai",
          },
          setHomeBoard: {
            badge: {
              label: "Pagrindinis",
            },
          },
          delete: {
            label: "Ištrinti visam laikui",
            confirm: {
              title: "Ištrinti lentą",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Pavadinimas",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Bendras",
            item: {
              firstDayOfWeek: "",
              accessibility: "",
            },
          },
          security: {
            title: "Apsauga",
          },
          board: {
            title: "Lentos",
          },
        },
        list: {
          metaTitle: "Tvarkyti vartotojus",
          title: "Vartotojai",
        },
        create: {
          metaTitle: "Sukurti vartotoją",
          step: {
            security: {
              label: "Apsauga",
            },
          },
        },
        invite: {
          title: "Tvarkyti naudotojų kvietimus",
          action: {
            new: {
              description:
                "Pasibaigus galiojimo laikui, kvietimas nebegalios ir kvietimo gavėjas negalės sukurti paskyros.",
            },
            copy: {
              link: "Kvietimo nuoroda",
            },
            delete: {
              title: "Ištrinti kvietimą",
              description:
                "Ar tikrai norite ištrinti šį kvietimą? Naudotojai, turintys šią nuorodą, nebegalės sukurti paskyros naudodamiesi šia nuoroda.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Kūrėjas",
            },
            expirationDate: {
              label: "Galiojimo pasibaigimo data",
            },
            token: {
              label: "Žetonas",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "Bendras",
          },
        },
      },
      settings: {
        title: "Nustatymai",
      },
      tool: {
        tasks: {
          status: {
            running: "Veikia",
            error: "",
          },
          job: {
            mediaServer: {
              label: "Medijų serveris",
            },
            mediaRequests: {
              label: "Medijų užklausos",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Dokumentacija",
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
        label: "Pavadinimas",
      },
      state: {
        label: "Būsena",
        option: {
          created: "Sukurta",
          running: "Veikia",
          paused: "",
          restarting: "Paleidžiama iš naujo",
          removing: "Trinamas",
        },
      },
      containerImage: {
        label: "Nuotrauka",
      },
      ports: {
        label: "Prievadai",
      },
    },
    action: {
      start: {
        label: "Paleisti",
      },
      stop: {
        label: "Sustabdyti",
      },
      restart: {
        label: "Paleisti iš naujo",
      },
      remove: {
        label: "Pašalinti",
      },
    },
  },
  permission: {
    tab: {
      user: "Vartotojai",
    },
    field: {
      user: {
        label: "Vartotojas",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Valdyti",
      boards: {
        label: "Lentos",
      },
      integrations: {
        edit: {
          label: "",
        },
      },
      "search-engines": {
        edit: {
          label: "",
        },
      },
      apps: {
        label: "Programėlės",
        edit: {
          label: "",
        },
      },
      users: {
        label: "Vartotojai",
        create: {
          label: "Sukurti",
        },
        general: "Bendras",
        security: "Apsauga",
        board: "Lentos",
        invites: {
          label: "Pakvietimai",
        },
      },
      tools: {
        label: "Įrankiai",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Nustatymai",
      },
      about: {
        label: "",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Programėlės",
          },
          board: {
            title: "Lentos",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Torrentai",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Pagalba",
            option: {
              documentation: {
                label: "Dokumentacija",
              },
              discord: {
                label: "Bendruomenės Discord",
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
                label: "Tvarkyti vartotojus",
              },
              about: {
                label: "",
              },
              preferences: {
                label: "",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Vartotojai",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Pavadinimas",
        },
      },
    },
  },
} as const;
