import "dayjs/locale/ro";

import dayjs from "dayjs";
import { MRT_Localization_RO } from "mantine-react-table/locales/ro/index.esm.mjs";

dayjs.locale("ro");

export default {
  user: {
    title: "Utilizatori",
    name: "Utilizator",
    field: {
      email: {
        label: "E-mail",
      },
      username: {
        label: "Utilizator",
      },
      password: {
        label: "Parola",
        requirement: {
          lowercase: "Să includă litere mici",
          uppercase: "Să includă litere mari",
          number: "Să includă cifre",
        },
      },
      passwordConfirm: {
        label: "Confirmare parola",
      },
    },
    action: {
      login: {
        label: "Utilizator",
      },
      register: {
        label: "Creare cont",
        notification: {
          success: {
            title: "Contul a fost creat",
          },
        },
      },
      create: "Creează utilizator",
    },
  },
  group: {
    field: {
      name: "Nume",
    },
    permission: {
      admin: {
        title: "Administrator",
      },
      board: {
        title: "Planșe",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Aplicații",
      },
    },
    field: {
      name: {
        label: "Nume",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Nume",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Adresă URL invalidă",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Utilizator",
        },
        password: {
          label: "Parola",
          newLabel: "Parolă nouă",
        },
      },
    },
  },
  media: {
    field: {
      name: "Nume",
      size: "Mărime",
      creator: "Creator",
    },
  },
  common: {
    direction: "ltr",
    error: "Eroare",
    action: {
      add: "Adaugă",
      apply: "Aplică",
      create: "Creează",
      edit: "Editare",
      insert: "Introdu",
      remove: "Elimină",
      save: "Salvează",
      saveChanges: "Salvați schimbările",
      cancel: "Anulează",
      delete: "Șterge",
      confirm: "Confirma",
      previous: "Anteriorul",
      next: "Următorul",
      tryAgain: "Încearcă din nou",
    },
    information: {
      hours: "",
      minutes: "",
    },
    userAvatar: {
      menu: {
        preferences: "Preferințele dvs.",
        login: "Utilizator",
      },
    },
    dangerZone: "Zonă periculoasă",
    noResults: "Nici un rezultat găsit",
    zod: {
      errors: {
        default: "Acest câmp nu este valid",
        required: "Acest câmp este obligatoriu",
      },
    },
    mantineReactTable: MRT_Localization_RO as Readonly<Record<keyof typeof MRT_Localization_RO, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Nume",
        },
      },
      action: {
        moveUp: "Mută în sus",
        moveDown: "Mută în jos",
      },
      menu: {
        label: {
          changePosition: "Schimbă locația",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Setări",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Lățime",
        },
        height: {
          label: "Înălțime",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Deschideți într-o pagină nouă",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Aspect",
          option: {
            row: {
              label: "Orizontal",
            },
            column: {
              label: "Vertical",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Blocate astăzi",
        adsBlockedTodayPercentage: "Blocate astăzi",
        dnsQueriesToday: "Interogări astăzi",
      },
    },
    dnsHoleControls: {
      description: "Controlați PiHole sau AdGuard din planșa dvs.",
      option: {
        layout: {
          label: "Aspect",
          option: {
            row: {
              label: "Orizontal",
            },
            column: {
              label: "Vertical",
            },
          },
        },
      },
      controls: {
        set: "",
        enabled: "Activat",
        disabled: "Dezactivat",
        hours: "",
        minutes: "",
      },
    },
    clock: {
      description: "Afișează data și ora curentă.",
      option: {
        timezone: {
          label: "Fus orar",
        },
      },
    },
    notebook: {
      name: "Agendă",
      option: {
        showToolbar: {
          label: "Arată bara de instrumente pentru a te ajuta să notezi în tip markdown",
        },
        allowReadOnlyCheck: {
          label: "Permite verificarea în modul numai-citire",
        },
        content: {
          label: "Conținutul agendei",
        },
      },
      controls: {
        bold: "Îngroșat",
        italic: "Cursiv",
        strikethrough: "Tăiat cu o linie",
        underline: "Subliniat",
        colorText: "Culoare text",
        colorHighlight: "Text colorat pentru evidențiere",
        code: "Cod",
        clear: "Curăță formatul",
        blockquote: "Citat",
        horizontalLine: "Linie orizontală",
        bulletList: "Listă cu puncte",
        orderedList: "Listă ordonată",
        checkList: "Lista de verificare cu bifă",
        increaseIndent: "Mărește spațierea",
        decreaseIndent: "Scade spațierea",
        link: "Link",
        unlink: "Șterge link-ul",
        image: "Încorporează imagine",
        addTable: "Adaugă tabelă",
        deleteTable: "Șterge tabelă",
        colorCell: "Culoare celulă",
        mergeCell: "Comută îmbinarea celulelor",
        addColumnLeft: "Adaugă o coloană în fată",
        addColumnRight: "Adaugă o coloană după",
        deleteColumn: "Șterge coloană",
        addRowTop: "Adaugă un rând înainte",
        addRowBelow: "Adaugă un rând după",
        deleteRow: "Șterge rând",
      },
      align: {
        left: "Stânga",
        center: "Centru",
        right: "Dreapta",
      },
      popover: {
        clearColor: "Șterge culoarea",
        source: "Sursă",
        widthPlaceholder: "Valoare exprimată în % sau pixeli",
        columns: "Coloane",
        rows: "Rânduri",
        width: "Lățime",
        height: "Înălțime",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Încorporați orice conținut de pe internet. Unele site-uri web pot restricționa accesul.",
      option: {
        embedUrl: {
          label: "Încorporați adresa URL",
        },
        allowFullScreen: {
          label: "Permiteți ecranul complet",
        },
        allowTransparency: {
          label: "Permiteți transparența",
        },
        allowScrolling: {
          label: "Permiteți derularea",
        },
        allowPayment: {
          label: "Permiteți plata",
        },
        allowAutoPlay: {
          label: "Permiteți redarea automată",
        },
        allowMicrophone: {
          label: "Permiteți microfonul",
        },
        allowCamera: {
          label: "Permiteți camera",
        },
        allowGeolocation: {
          label: "Permiteți geolocalizarea",
        },
      },
      error: {
        noBrowerSupport: "Browser-ul tău nu acceptă iFrames. Te rugăm să actualizezi browser-ul.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "Identificator entitate",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Nume afișat",
        },
        automationId: {
          label: "Identificator automatizare",
        },
      },
    },
    calendar: {
      name: "Calendar",
      option: {
        releaseType: {
          label: "Tip de evenimente ale Radarr",
        },
      },
    },
    weather: {
      name: "Meteo",
      description: "Afișează informațiile meteo curente ale unei locații stabilite.",
      option: {
        location: {
          label: "Locație meteo",
        },
      },
      kind: {
        clear: "Senin",
        mainlyClear: "Parțial noros",
        fog: "Ceață",
        drizzle: "Burniță",
        freezingDrizzle: "Chiciură",
        rain: "Ploaie",
        freezingRain: "Polei",
        snowFall: "Ninsoare",
        snowGrains: "Fulgi de Zăpadă",
        rainShowers: "Averse de ploaie",
        snowShowers: "Averse de ninsoare",
        thunderstorm: "Furtună",
        thunderstormWithHail: "Furtună cu grindină",
        unknown: "Necunoscut",
      },
    },
    indexerManager: {
      name: "Starea managerului de clasificare",
      title: "Manager de clasificare",
      testAll: "Verifică toate",
    },
    healthMonitoring: {
      name: "Monitorizarea sănătății sistemului",
      description:
        "Afișează informații care arată starea de sănătate și statistica sistemului (sistemelor) dumneavoastră.",
      option: {
        fahrenheit: {
          label: "Temperatura procesorului în Fahrenheit",
        },
        cpu: {
          label: "Afișare informații procesor",
        },
        memory: {
          label: "Afișare informații memorie",
        },
        fileSystem: {
          label: "Afișare informații despre sistemul de fișiere",
        },
      },
      popover: {
        available: "Disponibil",
      },
    },
    common: {
      location: {
        search: "Caută",
        table: {
          header: {},
          population: {
            fallback: "Necunoscut",
          },
        },
      },
    },
    video: {
      name: "Stream video",
      description: "Încorporează un steam video sau video-ul dintr-o cameră sau un site web",
      option: {
        feedUrl: {
          label: "Adresa URL a feed-ului",
        },
        hasAutoPlay: {
          label: "Redare automată",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Data adăugării",
        },
        downSpeed: {
          columnTitle: "În jos",
          detailsTitle: "Viteza de descărcare",
        },
        integration: {
          columnTitle: "Integrare",
        },
        progress: {
          columnTitle: "Progres",
        },
        ratio: {
          columnTitle: "Raport",
        },
        state: {
          columnTitle: "Stare",
        },
        upSpeed: {
          columnTitle: "În sus",
        },
      },
      states: {
        downloading: "Descărcare",
        queued: "Pus în așteptare",
        paused: "În pauză",
        completed: "Finalizat",
        unknown: "Necunoscut",
      },
    },
    "mediaRequests-requestList": {
      description: "Vezi o listă cu toate cererile media de la instanțele Overseerr sau Jellyseerr",
      option: {
        linksTargetNewTab: {
          label: "Deschide link-ul într-o pagină nouă",
        },
      },
      availability: {
        unknown: "Necunoscut",
        partiallyAvailable: "Parțial",
        available: "Disponibil",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistici despre solicitările dvs. media",
      titles: {
        stats: {
          main: "Situația media",
          approved: "Deja aprobat",
          pending: "În curs de aprobare",
          tv: "Cereri seriale TV",
          movie: "Cereri filme",
          total: "Total",
        },
        users: {
          main: "Top utilizatori",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Aplicații",
          },
          screenSize: {
            option: {
              sm: "Mic",
              md: "Mediu",
              lg: "Mare",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Atașare imagine de fundal",
      },
      backgroundImageSize: {
        label: "Dimensiunea imaginii de fundal",
      },
      primaryColor: {
        label: "Culoare de bază",
      },
      secondaryColor: {
        label: "Culoare secundară",
      },
      customCss: {
        description: "În plus, personalizați-vă planșa folosind CSS, recomandat doar pentru utilizatorii experimentați",
      },
      name: {
        label: "Nume",
      },
      isPublic: {
        label: "Public",
      },
    },
    setting: {
      section: {
        general: {
          title: "General",
        },
        layout: {
          title: "Aspect",
        },
        background: {
          title: "Fundal",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Vezi planșa",
              },
            },
          },
        },
        dangerZone: {
          title: "Zonă periculoasă",
          action: {
            delete: {
              confirm: {
                title: "Șterge planșa",
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
        home: "Acasă",
        boards: "Planșe",
        apps: "Aplicații",
        users: {
          label: "Utilizatori",
          items: {
            manage: "Gestionați",
            invites: "Invitații",
          },
        },
        tools: {
          label: "Unelte",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Setări",
        help: {
          label: "Ajutor",
          items: {
            documentation: "Documentație",
            discord: "Comunitatea Discord",
          },
        },
        about: "Despre",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Planșe",
          user: "Utilizatori",
          invite: "Invitații",
          app: "Aplicații",
        },
        statisticLabel: {
          boards: "Planșe",
        },
      },
      board: {
        title: "Planșele dumneavoastră",
        action: {
          settings: {
            label: "Setări",
          },
          setHomeBoard: {
            badge: {
              label: "Acasă",
            },
          },
          delete: {
            label: "Șterge definitiv",
            confirm: {
              title: "Șterge planșa",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Nume",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "General",
            item: {
              firstDayOfWeek: "Prima zi a săptămâni",
              accessibility: "Accesibilitate",
            },
          },
          security: {
            title: "Securitate",
          },
          board: {
            title: "Planșe",
          },
        },
        list: {
          metaTitle: "Gestionați utilizatorii",
          title: "Utilizatori",
        },
        create: {
          metaTitle: "Creează utilizator",
          step: {
            security: {
              label: "Securitate",
            },
          },
        },
        invite: {
          title: "Gestionează invitațiile utilizatorului",
          action: {
            new: {
              description:
                "După expirare, invitația nu va mai fi valabilă iar destinatarul invitației nu va mai putea crea un cont.",
            },
            copy: {
              link: "Link de invitație",
            },
            delete: {
              title: "Șterge invitație",
              description:
                "Sunteți sigur că doriți să ștergeți această invitație? Utilizatorii care au acest link nu vor mai putea crea un cont folosind acest link.",
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
              label: "Data expirării",
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
            title: "General",
          },
        },
      },
      settings: {
        title: "Setări",
      },
      tool: {
        tasks: {
          status: {
            running: "Rulează",
            error: "Eroare",
          },
          job: {
            mediaServer: {
              label: "Server-ul media",
            },
            mediaRequests: {
              label: "Cereri media",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Documentație",
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
    title: "Containere",
    field: {
      name: {
        label: "Nume",
      },
      state: {
        label: "Stare",
        option: {
          created: "Creat",
          running: "Rulează",
          paused: "În pauză",
          restarting: "Repornire",
          removing: "Eliminare",
        },
      },
      containerImage: {
        label: "Imagine",
      },
      ports: {
        label: "Porturi",
      },
    },
    action: {
      start: {
        label: "Pornește",
      },
      stop: {
        label: "Opreşte",
      },
      restart: {
        label: "Repornește",
      },
      remove: {
        label: "Elimină",
      },
    },
  },
  permission: {
    tab: {
      user: "Utilizatori",
    },
    field: {
      user: {
        label: "Utilizator",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Gestionați",
      boards: {
        label: "Planșe",
      },
      integrations: {
        edit: {
          label: "Editare",
        },
      },
      "search-engines": {
        edit: {
          label: "Editare",
        },
      },
      apps: {
        label: "Aplicații",
        edit: {
          label: "Editare",
        },
      },
      users: {
        label: "Utilizatori",
        create: {
          label: "Creează",
        },
        general: "General",
        security: "Securitate",
        board: "Planșe",
        invites: {
          label: "Invitații",
        },
      },
      tools: {
        label: "Unelte",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Setări",
      },
      about: {
        label: "Despre",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Aplicații",
          },
          board: {
            title: "Planșe",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Torrent",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Ajutor",
            option: {
              documentation: {
                label: "Documentație",
              },
              discord: {
                label: "Comunitatea Discord",
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
                label: "Gestionați utilizatorii",
              },
              about: {
                label: "Despre",
              },
              preferences: {
                label: "Preferințele dvs.",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Utilizatori",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Nume",
        },
      },
    },
  },
} as const;
