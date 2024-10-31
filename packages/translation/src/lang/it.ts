import "dayjs/locale/it";

import dayjs from "dayjs";
import { MRT_Localization_IT } from "mantine-react-table/locales/it/index.esm.mjs";

dayjs.locale("it");

export default {
  user: {
    title: "Utenti",
    name: "Utente",
    field: {
      email: {
        label: "E-mail",
      },
      username: {
        label: "Nome utente",
      },
      password: {
        label: "Password",
        requirement: {
          lowercase: "Include lettera minuscola",
          uppercase: "Include lettera maiuscola",
          number: "Include numero",
        },
      },
      passwordConfirm: {
        label: "Conferma password",
      },
    },
    action: {
      login: {
        label: "Accedi",
      },
      register: {
        label: "Crea account",
        notification: {
          success: {
            title: "Account creato",
          },
        },
      },
      create: "Crea utente",
    },
  },
  group: {
    field: {
      name: "Nome",
    },
    permission: {
      admin: {
        title: "Admin",
      },
      board: {
        title: "Boards",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Applicazioni",
      },
    },
    field: {
      name: {
        label: "Nome",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Nome",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "URL invalido",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Nome utente",
        },
        password: {
          label: "Password",
          newLabel: "Nuova password",
        },
      },
    },
  },
  media: {
    field: {
      name: "Nome",
      size: "Dimensione",
      creator: "Creatore",
    },
  },
  common: {
    direction: "ltr",
    error: "Errore",
    action: {
      add: "Aggiungi",
      apply: "Applica",
      create: "Crea",
      edit: "Modifica",
      insert: "Inserisci",
      remove: "Rimuovi",
      save: "Salva",
      saveChanges: "Salva modifiche",
      cancel: "Annulla",
      delete: "Elimina",
      confirm: "Conferma",
      previous: "Precedente",
      next: "Successivo",
      tryAgain: "Riprova",
    },
    information: {
      hours: "Ore",
      minutes: "Minuti",
    },
    userAvatar: {
      menu: {
        preferences: "Le tue impostazioni",
        login: "Accedi",
      },
    },
    dangerZone: "Danger zone",
    noResults: "Nessun risultato trovato",
    zod: {
      errors: {
        default: "Questo campo non è valido",
        required: "Questo campo è obbligatorio",
      },
    },
    mantineReactTable: MRT_Localization_IT as Readonly<Record<keyof typeof MRT_Localization_IT, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Nome",
        },
      },
      action: {
        moveUp: "Sposta in alto",
        moveDown: "Sposta in basso",
      },
      menu: {
        label: {
          changePosition: "Cambia posizione",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Impostazioni",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Larghezza",
        },
        height: {
          label: "Altezza",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Apri in una nuova scheda",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Layout",
          option: {
            row: {
              label: "Orizzontale",
            },
            column: {
              label: "Verticale",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Bloccati oggi",
        adsBlockedTodayPercentage: "Bloccati oggi",
        dnsQueriesToday: "Query di oggi",
      },
    },
    dnsHoleControls: {
      description: "Controlla PiHole o AdGuard dalla tua dashboard",
      option: {
        layout: {
          label: "Layout",
          option: {
            row: {
              label: "Orizzontale",
            },
            column: {
              label: "Verticale",
            },
          },
        },
      },
      controls: {
        set: "Imposta",
        enabled: "Abilitato",
        disabled: "Disattivato",
        hours: "Ore",
        minutes: "Minuti",
      },
    },
    clock: {
      description: "Visualizza la data e l'ora correnti.",
      option: {
        timezone: {
          label: "Fuso orario",
        },
      },
    },
    notebook: {
      name: "Blocco note",
      option: {
        showToolbar: {
          label: "Mostra la barra degli strumenti per aiutarti a scrivere in Markdown",
        },
        allowReadOnlyCheck: {
          label: "Consenti il check in modalità di sola lettura",
        },
        content: {
          label: "Contenuto del blocco note",
        },
      },
      controls: {
        bold: "Grassetto",
        italic: "Corsivo",
        strikethrough: "Testo barrato",
        underline: "Sottolineato",
        colorText: "Testo a colori",
        colorHighlight: "Testo evidenziato colorato",
        code: "Codice",
        clear: "Rimuovi formattazione",
        blockquote: "Citazione",
        horizontalLine: "Linea orizzontale",
        bulletList: "Elenco puntato",
        orderedList: "Elenco ordinato",
        checkList: "Elenco di controllo",
        increaseIndent: "Aumenta indentatura",
        decreaseIndent: "Diminuisci indentatura",
        link: "Link",
        unlink: "Elimina link",
        image: "Incorpora immagine",
        addTable: "Aggiungi tabella",
        deleteTable: "Elimina tabella",
        colorCell: "Colore cella",
        mergeCell: "Attiva/disattiva unione celle",
        addColumnLeft: "Aggiungi colonna prima",
        addColumnRight: "Aggiungi colonna dopo",
        deleteColumn: "Elimina colonna",
        addRowTop: "Aggiungi riga prima",
        addRowBelow: "Aggiungi riga dopo",
        deleteRow: "Elimina riga",
      },
      align: {
        left: "Sinistra",
        center: "Centra",
        right: "Destra",
      },
      popover: {
        clearColor: "Rimuovi colore",
        source: "Fonte",
        widthPlaceholder: "Valore in % o pixel",
        columns: "Colonne",
        rows: "Righe",
        width: "Larghezza",
        height: "Altezza",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Incorpora qualsiasi contenuto da Internet. Alcuni siti web possono limitare l'accesso.",
      option: {
        embedUrl: {
          label: "Incorpora URL",
        },
        allowFullScreen: {
          label: "Consenti schermo intero",
        },
        allowTransparency: {
          label: "Consenti trasparenza",
        },
        allowScrolling: {
          label: "Consenti scorrimento",
        },
        allowPayment: {
          label: "Consenti pagamento",
        },
        allowAutoPlay: {
          label: "Consenti riproduzione automatica",
        },
        allowMicrophone: {
          label: "Consenti microfono",
        },
        allowCamera: {
          label: "Consenti fotocamera",
        },
        allowGeolocation: {
          label: "Consenti geo-localizzazione",
        },
      },
      error: {
        noBrowerSupport: "Il tuo browser non supporta iframes. Aggiorna il tuo browser.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "ID entità",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Visualizza nome",
        },
        automationId: {
          label: "ID automazione",
        },
      },
    },
    calendar: {
      name: "Calendario",
      option: {
        releaseType: {
          label: "Tipo di release Radarr",
        },
      },
    },
    weather: {
      name: "Meteo",
      description: "Mostra le informazioni meteo attuali di una località.",
      option: {
        location: {
          label: "Località meteo",
        },
      },
      kind: {
        clear: "Sereno",
        mainlyClear: "Per lo più sereno",
        fog: "Nebbia",
        drizzle: "Pioggia leggera",
        freezingDrizzle: "Pioggia leggera gelata",
        rain: "Pioggia",
        freezingRain: "Pioggia gelata",
        snowFall: "Neve",
        snowGrains: "Neve tonda",
        rainShowers: "Rovesci",
        snowShowers: "Forti nevicate",
        thunderstorm: "Temporale",
        thunderstormWithHail: "Temporale con grandine",
        unknown: "Sconosciuto",
      },
    },
    indexerManager: {
      name: "Stato del gestore dell'indicizzatore",
      title: "Gestore dell'indicizzatore",
      testAll: "Prova Tutto",
    },
    healthMonitoring: {
      name: "Monitoraggio dello stato del sistema",
      description: "Visualizza informazioni sulla salute e stato dei tuoi sistemi.",
      option: {
        fahrenheit: {
          label: "Temperatura CPU in Fahrenheit",
        },
        cpu: {
          label: "Mostra info CPU",
        },
        memory: {
          label: "Mostra Informazioni Memoria",
        },
        fileSystem: {
          label: "Mostra Informazioni Filesystem",
        },
      },
      popover: {
        available: "Disponibile",
      },
    },
    common: {
      location: {
        search: "Cerca",
        table: {
          header: {},
          population: {
            fallback: "Sconosciuto",
          },
        },
      },
    },
    video: {
      name: "Flusso Video",
      description: "Incorpora un flusso video o un video da una videocamera o da un sito web",
      option: {
        feedUrl: {
          label: "URL del feed",
        },
        hasAutoPlay: {
          label: "Riproduzione automatica",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Aggiunto in data",
        },
        downSpeed: {
          columnTitle: "Down",
          detailsTitle: "Velocità Di Download",
        },
        integration: {
          columnTitle: "Integrazione",
        },
        progress: {
          columnTitle: "Avanzamento",
        },
        ratio: {
          columnTitle: "Ratio",
        },
        state: {
          columnTitle: "Stato",
        },
        upSpeed: {
          columnTitle: "Up",
        },
      },
      states: {
        downloading: "Download in corso",
        queued: "In coda",
        paused: "In pausa",
        completed: "Completato",
        unknown: "Sconosciuto",
      },
    },
    "mediaRequests-requestList": {
      description: "Vedi un elenco di tutte le richieste multimediali dalla tua istanza Overseerr o Jellyseerr",
      option: {
        linksTargetNewTab: {
          label: "Apri i link in nuova scheda",
        },
      },
      availability: {
        unknown: "Sconosciuto",
        partiallyAvailable: "Parziale",
        available: "Disponibile",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistiche sulle richieste multimediali",
      titles: {
        stats: {
          main: "Statistiche Multimediali",
          approved: "Già approvato",
          pending: "Approvazioni In Attesa",
          tv: "Richieste TV",
          movie: "Richieste film",
          total: "Totale",
        },
        users: {
          main: "Utenti Top",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Applicazioni",
          },
          screenSize: {
            option: {
              sm: "Piccolo",
              md: "Medio",
              lg: "Grande",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Allegato immagine di sfondo",
      },
      backgroundImageSize: {
        label: "Dimensioni dell'immagine di sfondo",
      },
      primaryColor: {
        label: "Colore primario",
      },
      secondaryColor: {
        label: "Colore secondario",
      },
      customCss: {
        description: "Inoltre, personalizza la dashboard utilizzando i CSS, consigliato solo agli utenti esperti",
      },
      name: {
        label: "Nome",
      },
      isPublic: {
        label: "Pubblico",
      },
    },
    setting: {
      section: {
        general: {
          title: "Generale",
        },
        layout: {
          title: "Layout",
        },
        background: {
          title: "Sfondo",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Mostra board",
              },
            },
          },
        },
        dangerZone: {
          title: "Danger zone",
          action: {
            delete: {
              confirm: {
                title: "Elimina board",
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
        boards: "Boards",
        apps: "Applicazioni",
        users: {
          label: "Utenti",
          items: {
            manage: "Gestisci",
            invites: "Inviti",
          },
        },
        tools: {
          label: "Strumenti",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Impostazioni",
        help: {
          label: "Aiuto",
          items: {
            documentation: "Documentazione",
            discord: "Discord della community",
          },
        },
        about: "Info",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Boards",
          user: "Utenti",
          invite: "Inviti",
          app: "Applicazioni",
        },
        statisticLabel: {
          boards: "Boards",
        },
      },
      board: {
        title: "Le tue board",
        action: {
          settings: {
            label: "Impostazioni",
          },
          setHomeBoard: {
            badge: {
              label: "Home",
            },
          },
          delete: {
            label: "Elimina definitivamente",
            confirm: {
              title: "Elimina board",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Nome",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Generale",
            item: {
              firstDayOfWeek: "Primo giorno della settimana",
              accessibility: "Accessibilità",
            },
          },
          security: {
            title: "Sicurezza",
          },
          board: {
            title: "Boards",
          },
        },
        list: {
          metaTitle: "Gestisci utenti",
          title: "Utenti",
        },
        create: {
          metaTitle: "Crea utente",
          step: {
            security: {
              label: "Sicurezza",
            },
          },
        },
        invite: {
          title: "Gestisci inviti utente",
          action: {
            new: {
              description:
                "Dopo la scadenza, un invito non sarà più valido e il destinatario dell'invito non potrà creare un account.",
            },
            copy: {
              link: "Link d'invito",
            },
            delete: {
              title: "Elimina invito",
              description:
                "Siete sicuri di voler eliminare questo invito? Gli utenti con questo link non potranno più creare un account utilizzando tale link.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Creatore",
            },
            expirationDate: {
              label: "Data di scadenza",
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
            title: "Generale",
          },
        },
      },
      settings: {
        title: "Impostazioni",
      },
      tool: {
        tasks: {
          status: {
            running: "In esecuzione",
            error: "Errore",
          },
          job: {
            mediaServer: {
              label: "Server multimediale",
            },
            mediaRequests: {
              label: "Richieste Media",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Documentazione",
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
        label: "Nome",
      },
      state: {
        label: "Stato",
        option: {
          created: "Creato",
          running: "In esecuzione",
          paused: "In pausa",
          restarting: "Riavvio",
          removing: "Rimozione in corso",
        },
      },
      containerImage: {
        label: "Immagine",
      },
      ports: {
        label: "Porte",
      },
    },
    action: {
      start: {
        label: "Avvia",
      },
      stop: {
        label: "Arresta",
      },
      restart: {
        label: "Riavvia",
      },
      remove: {
        label: "Rimuovi",
      },
    },
  },
  permission: {
    tab: {
      user: "Utenti",
    },
    field: {
      user: {
        label: "Utente",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Gestisci",
      boards: {
        label: "Boards",
      },
      integrations: {
        edit: {
          label: "Modifica",
        },
      },
      "search-engines": {
        edit: {
          label: "Modifica",
        },
      },
      apps: {
        label: "Applicazioni",
        edit: {
          label: "Modifica",
        },
      },
      users: {
        label: "Utenti",
        create: {
          label: "Crea",
        },
        general: "Generale",
        security: "Sicurezza",
        board: "Boards",
        invites: {
          label: "Inviti",
        },
      },
      tools: {
        label: "Strumenti",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Impostazioni",
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
            title: "Applicazioni",
          },
          board: {
            title: "Boards",
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
            title: "Aiuto",
            option: {
              documentation: {
                label: "Documentazione",
              },
              discord: {
                label: "Discord della community",
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
                label: "Gestisci utenti",
              },
              about: {
                label: "Info",
              },
              preferences: {
                label: "Le tue impostazioni",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Utenti",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Nome",
        },
      },
    },
  },
} as const;
