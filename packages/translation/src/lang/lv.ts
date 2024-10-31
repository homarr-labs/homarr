import "dayjs/locale/lv";

import dayjs from "dayjs";
import type { MRT_Localization } from "mantine-react-table";

dayjs.locale("lv");

export default {
  user: {
    title: "Lietotāji",
    name: "Lietotājs",
    field: {
      email: {
        label: "E-pasts",
      },
      username: {
        label: "Lietotājvārds",
      },
      password: {
        label: "Parole",
        requirement: {
          lowercase: "Ietver mazo burtu",
          uppercase: "Ietver lielo burtu",
          number: "Ietver numuru",
        },
      },
      passwordConfirm: {
        label: "Apstipriniet paroli",
      },
    },
    action: {
      login: {
        label: "Pieslēgties",
      },
      register: {
        label: "Izveidot kontu",
        notification: {
          success: {
            title: "Konts izveidots",
          },
        },
      },
      create: "Izveidot lietotāju",
    },
  },
  group: {
    field: {
      name: "Nosaukums",
    },
    permission: {
      admin: {
        title: "Administrators",
      },
      board: {
        title: "Dēļi",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Lietotnes",
      },
    },
    field: {
      name: {
        label: "Nosaukums",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Nosaukums",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Nederīgs URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Lietotājvārds",
        },
        password: {
          label: "Parole",
          newLabel: "Jauna parole",
        },
      },
    },
  },
  media: {
    field: {
      name: "Nosaukums",
      size: "Lielums",
      creator: "Izveidotājs",
    },
  },
  common: {
    direction: "ltr",
    error: "Kļūda",
    action: {
      add: "Pievienot",
      apply: "Lietot",
      create: "Izveidot",
      edit: "Rediģēt",
      insert: "Ievietot",
      remove: "Noņemt",
      save: "Saglabāt",
      saveChanges: "Saglabāt izmaiņas",
      cancel: "Atcelt",
      delete: "Dzēst",
      confirm: "Apstipriniet",
      previous: "Iepriekšējais",
      next: "Nākamais",
      tryAgain: "Mēģiniet vēlreiz",
    },
    information: {
      hours: "",
      minutes: "",
    },
    userAvatar: {
      menu: {
        preferences: "Jūsu iestatījumi",
        login: "Pieslēgties",
      },
    },
    dangerZone: "Bīstamā zona",
    noResults: "Nav atrasts neviens rezultāts",
    zod: {
      errors: {
        default: "Šis lauks nav derīgs",
        required: "Šis lauks ir obligāts",
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
          label: "Nosaukums",
        },
      },
      action: {
        moveUp: "Virzīt augšup",
        moveDown: "Virzīt lejup",
      },
      menu: {
        label: {
          changePosition: "Mainīt pozīciju",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Iestatījumi",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Platums",
        },
        height: {
          label: "Augstums",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Atvērt jaunā cilnē",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Izkārtojums",
          option: {
            row: {
              label: "Horizontāli",
            },
            column: {
              label: "Vertikāli",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Šodien bloķēti",
        adsBlockedTodayPercentage: "Šodien bloķēti",
        dnsQueriesToday: "Pieprasījumi šodien",
      },
    },
    dnsHoleControls: {
      description: "Vadiet PiHole vai AdGuard no sava informācijas paneļa",
      option: {
        layout: {
          label: "Izkārtojums",
          option: {
            row: {
              label: "Horizontāli",
            },
            column: {
              label: "Vertikāli",
            },
          },
        },
      },
      controls: {
        set: "",
        enabled: "Iespējots",
        disabled: "Atspējots",
        hours: "",
        minutes: "",
      },
    },
    clock: {
      description: "Rāda pašreizējo datumu un laiku.",
      option: {
        timezone: {
          label: "Laika zona",
        },
      },
    },
    notebook: {
      name: "Piezīmes",
      option: {
        showToolbar: {
          label: "Rādīt rīkjoslu, lai palīdzētu rakstīt markdown tekstu",
        },
        allowReadOnlyCheck: {
          label: "Atļaut atzīmi lasīšanas režīmā",
        },
        content: {
          label: "Piezīmju saturs",
        },
      },
      controls: {
        bold: "Treknraksts",
        italic: "Slīpraksts",
        strikethrough: "Pārsvītrojums",
        underline: "Pasvītrojums",
        colorText: "Krāsains teksts",
        colorHighlight: "Krāsains izcelts teksts",
        code: "Kods",
        clear: "Notīrīt formatējumu",
        blockquote: "Citāts",
        horizontalLine: "Horizontāla līnija",
        bulletList: "Aizzīmju saraksts",
        orderedList: "Numurēts saraksts",
        checkList: "Pārbaudes saraksts",
        increaseIndent: "Palielināt atkāpi",
        decreaseIndent: "Samazināt atkāpi",
        link: "Saite",
        unlink: "Noņemt saiti",
        image: "Iegult attēlu",
        addTable: "Pievienot tabulu",
        deleteTable: "Dzēst tabulu",
        colorCell: "Krāsaina šūna",
        mergeCell: "Pārslēgt šūnu apvienošanu",
        addColumnLeft: "Pievienot kolonnu pirms",
        addColumnRight: "Pievienot kolonnu pēc",
        deleteColumn: "Dzēst kolonnu",
        addRowTop: "Pievienot rindu pirms",
        addRowBelow: "Pievienot rindu pēc",
        deleteRow: "Dzēst rindu",
      },
      align: {
        left: "Pa kreisi",
        center: "Centrā",
        right: "Pa labi",
      },
      popover: {
        clearColor: "Notīrīt krāsu",
        source: "Avots",
        widthPlaceholder: "Vērtība % vai pikseļos",
        columns: "Kolonnas",
        rows: "Rindas",
        width: "Platums",
        height: "Augstums",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Iegult jebkuru saturu no interneta. Dažas vietnes var ierobežot piekļuvi.",
      option: {
        embedUrl: {
          label: "Iegult URL",
        },
        allowFullScreen: {
          label: "Atļaut pilnekrāna režīmu",
        },
        allowTransparency: {
          label: "Atļaut caurspīdīgumu",
        },
        allowScrolling: {
          label: "Atļaut ritināšanu",
        },
        allowPayment: {
          label: "Atļaut maksājumus",
        },
        allowAutoPlay: {
          label: "Atļaut automātisko atskaņošanu",
        },
        allowMicrophone: {
          label: "Atļaut piekļuvi mikrofonam",
        },
        allowCamera: {
          label: "Atļaut piekļuvi kamerai",
        },
        allowGeolocation: {
          label: "Atļaut ģeogrāfiskās atrašanās vietas noteikšanu",
        },
      },
      error: {
        noBrowerSupport: "Jūsu pārlūkprogramma neatbalsta iframe. Lūdzu, atjauniniet pārlūkprogrammu.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "Vienības ID",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Parādāmais nosaukums",
        },
        automationId: {
          label: "Automatizācijas ID",
        },
      },
    },
    calendar: {
      name: "Kalendārs",
      option: {
        releaseType: {
          label: "Radarr laiduma tips",
        },
      },
    },
    weather: {
      name: "Laikapstākļi",
      description: "Rāda pašreizējo laikapstākļu informāciju par iestatīto atrašanās vietu.",
      option: {
        location: {
          label: "Laikapstākļu atrašānās vieta",
        },
      },
      kind: {
        clear: "Skaidrs",
        mainlyClear: "Galvenokārt skaidrs",
        fog: "Migla",
        drizzle: "Smidzinošs lietus",
        freezingDrizzle: "Smidzinošs ledus",
        rain: "Lietus",
        freezingRain: "Ledus lietus",
        snowFall: "Gāziensnidze",
        snowGrains: "Sniega graudi",
        rainShowers: "Lietusgāzes",
        snowShowers: "Sniegputenis",
        thunderstorm: "Pērkona negaiss",
        thunderstormWithHail: "Pērkona negaiss ar krusu",
        unknown: "Nezināms",
      },
    },
    indexerManager: {
      name: "Indeksētāja pārvaldnieka statuss",
      title: "Indexer pārvaldnieks",
      testAll: "Pārbaudīt visu",
    },
    healthMonitoring: {
      name: "Sistēmas Stāvokļa Uzraudzība",
      description: "Tiek parādīta informācija par sistēmas(-u) stāvokli un stāvokli.",
      option: {
        fahrenheit: {
          label: "CPU temperatūra pēc Fārenheita",
        },
        cpu: {
          label: "Rādīt CPU informāciju",
        },
        memory: {
          label: "Rādīt atmiņas informāciju",
        },
        fileSystem: {
          label: "Rādīt failu sistēmas informāciju",
        },
      },
      popover: {
        available: "Pieejams",
      },
    },
    common: {
      location: {
        search: "Meklēt",
        table: {
          header: {},
          population: {
            fallback: "Nezināms",
          },
        },
      },
    },
    video: {
      name: "Videostraume",
      description: "Ieguldīt videostraumi vai video no kameras vai tīmekļvietnes",
      option: {
        feedUrl: {
          label: "Plūsmas URL",
        },
        hasAutoPlay: {
          label: "Automātiskā atskaņošana",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Pievienošanas datums",
        },
        downSpeed: {
          columnTitle: "Lejupielāde",
          detailsTitle: "Lejupielādes Ātrums",
        },
        integration: {
          columnTitle: "Integrācija",
        },
        progress: {
          columnTitle: "Progress",
        },
        ratio: {
          columnTitle: "Attiecība",
        },
        state: {
          columnTitle: "Stāvoklis",
        },
        upSpeed: {
          columnTitle: "Augšupielāde",
        },
      },
      states: {
        downloading: "Lejupielādē",
        queued: "",
        paused: "Apstādināts",
        completed: "Pabeigts",
        unknown: "Nezināms",
      },
    },
    "mediaRequests-requestList": {
      description: "Skatiet sarakstu ar visiem multimediju pieprasījumiem no jūsu Overseerr vai Jellyseerr instances",
      option: {
        linksTargetNewTab: {
          label: "Atvērt saites jaunā cilnē",
        },
      },
      availability: {
        unknown: "Nezināms",
        partiallyAvailable: "Daļējs",
        available: "Pieejams",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistika par jūsu mediju pieprasījumiem",
      titles: {
        stats: {
          main: "Mediju statistika",
          approved: "Jau apstiprināts",
          pending: "Nepabeigtie apstiprinājumi",
          tv: "TV pieprasījumi",
          movie: "Filmu pieprasījumi",
          total: "Kopā",
        },
        users: {
          main: "Top Lietotāji",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Lietotnes",
          },
          screenSize: {
            option: {
              sm: "Mazs",
              md: "Vidējs",
              lg: "Liels",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Fona attēla pielikums",
      },
      backgroundImageSize: {
        label: "Fona attēla izmērs",
      },
      primaryColor: {
        label: "Pamatkrāsa",
      },
      secondaryColor: {
        label: "Sekundārā krāsa",
      },
      customCss: {
        description: "Turklāt pielāgojiet paneli, izmantojot CSS, ieteicams tikai pieredzējušiem lietotājiem",
      },
      name: {
        label: "Nosaukums",
      },
      isPublic: {
        label: "Publisks",
      },
    },
    setting: {
      section: {
        general: {
          title: "Vispārīgi",
        },
        layout: {
          title: "Izkārtojums",
        },
        background: {
          title: "Fons",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Apskatīt dēli",
              },
            },
          },
        },
        dangerZone: {
          title: "Bīstamā zona",
          action: {
            delete: {
              confirm: {
                title: "Dzēst dēli",
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
        home: "Sākums",
        boards: "Dēļi",
        apps: "Lietotnes",
        users: {
          label: "Lietotāji",
          items: {
            manage: "Pārvaldīt",
            invites: "Uzaicinājumi",
          },
        },
        tools: {
          label: "Rīki",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Iestatījumi",
        help: {
          label: "Palīdzība",
          items: {
            documentation: "Dokumentācija",
            discord: "Kopienas Discord",
          },
        },
        about: "Par Programmu",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Dēļi",
          user: "Lietotāji",
          invite: "Uzaicinājumi",
          app: "Lietotnes",
        },
        statisticLabel: {
          boards: "Dēļi",
        },
      },
      board: {
        title: "Jūsu dēļi",
        action: {
          settings: {
            label: "Iestatījumi",
          },
          setHomeBoard: {
            badge: {
              label: "Sākums",
            },
          },
          delete: {
            label: "Neatgriezeniski dzēst",
            confirm: {
              title: "Dzēst dēli",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Nosaukums",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Vispārīgi",
            item: {
              firstDayOfWeek: "Nedēļas pirmā diena",
              accessibility: "Piekļūstamība",
            },
          },
          security: {
            title: "Drošība",
          },
          board: {
            title: "Dēļi",
          },
        },
        list: {
          metaTitle: "Pārvaldīt lietotājus",
          title: "Lietotāji",
        },
        create: {
          metaTitle: "Izveidot lietotāju",
          step: {
            security: {
              label: "Drošība",
            },
          },
        },
        invite: {
          title: "Lietotāju uzaicinājumu pārvaldīšana",
          action: {
            new: {
              description:
                "Pēc derīguma termiņa beigām uzaicinājums vairs nebūs derīgs, un uzaicinājuma saņēmējs nevarēs izveidot kontu.",
            },
            copy: {
              link: "Uzaicinājuma saite",
            },
            delete: {
              title: "Dzēst uzaicinājumu",
              description:
                "Vai esat pārliecināts, ka vēlaties dzēst šo uzaicinājumu? Lietotāji ar vairs nevarēs izveidot kontu, izmantojot šo saiti.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Izveidotājs",
            },
            expirationDate: {
              label: "Derīguma termiņš",
            },
            token: {
              label: "Atslēga",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "Vispārīgi",
          },
        },
      },
      settings: {
        title: "Iestatījumi",
      },
      tool: {
        tasks: {
          status: {
            running: "Darbojas",
            error: "Kļūda",
          },
          job: {
            mediaServer: {
              label: "Multivides Serveris",
            },
            mediaRequests: {
              label: "Multimediju pieprasījumi",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Dokumentācija",
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
        label: "Nosaukums",
      },
      state: {
        label: "Stāvoklis",
        option: {
          created: "Izveidots",
          running: "Darbojas",
          paused: "Apstādināts",
          restarting: "Restartējas",
          removing: "Noņemšana",
        },
      },
      containerImage: {
        label: "Attēls",
      },
      ports: {
        label: "Ports",
      },
    },
    action: {
      start: {
        label: "Palaist",
      },
      stop: {
        label: "Apstādināt",
      },
      restart: {
        label: "Restartēt",
      },
      remove: {
        label: "Noņemt",
      },
    },
  },
  permission: {
    tab: {
      user: "Lietotāji",
    },
    field: {
      user: {
        label: "Lietotājs",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Pārvaldīt",
      boards: {
        label: "Dēļi",
      },
      integrations: {
        edit: {
          label: "Rediģēt",
        },
      },
      "search-engines": {
        edit: {
          label: "Rediģēt",
        },
      },
      apps: {
        label: "Lietotnes",
        edit: {
          label: "Rediģēt",
        },
      },
      users: {
        label: "Lietotāji",
        create: {
          label: "Izveidot",
        },
        general: "Vispārīgi",
        security: "Drošība",
        board: "Dēļi",
        invites: {
          label: "Uzaicinājumi",
        },
      },
      tools: {
        label: "Rīki",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Iestatījumi",
      },
      about: {
        label: "Par Programmu",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Lietotnes",
          },
          board: {
            title: "Dēļi",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Torenti",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Palīdzība",
            option: {
              documentation: {
                label: "Dokumentācija",
              },
              discord: {
                label: "Kopienas Discord",
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
                label: "Pārvaldīt lietotājus",
              },
              about: {
                label: "Par Programmu",
              },
              preferences: {
                label: "Jūsu iestatījumi",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Lietotāji",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Nosaukums",
        },
      },
    },
  },
} as const;
