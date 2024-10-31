import "dayjs/locale/de";

import dayjs from "dayjs";
import { MRT_Localization_DE } from "mantine-react-table/locales/de/index.esm.mjs";

dayjs.locale("de");

export default {
  user: {
    title: "Benutzer",
    name: "Benutzer",
    field: {
      email: {
        label: "E-Mail",
      },
      username: {
        label: "Benutzername",
      },
      password: {
        label: "Passwort",
        requirement: {
          lowercase: "Enthält Kleinbuchstaben",
          uppercase: "Enthält Großbuchstaben",
          number: "Enthält Ziffern",
        },
      },
      passwordConfirm: {
        label: "Passwort bestätigen",
      },
    },
    action: {
      login: {
        label: "Anmelden",
      },
      register: {
        label: "Account erstellen",
        notification: {
          success: {
            title: "Account erstellt",
          },
        },
      },
      create: "Benutzer erstellen",
    },
  },
  group: {
    field: {
      name: "Name",
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
        title: "Apps",
      },
    },
    field: {
      name: {
        label: "Name",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Name",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Ungültige URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Benutzername",
        },
        password: {
          label: "Passwort",
          newLabel: "Neues Passwort",
        },
      },
    },
  },
  media: {
    field: {
      name: "Name",
      size: "Größe",
      creator: "Ersteller",
    },
  },
  common: {
    direction: "ltr",
    error: "Fehler",
    action: {
      add: "Hinzufügen",
      apply: "Übernehmen",
      create: "Erstellen",
      edit: "Bearbeiten",
      insert: "Einfügen",
      remove: "Entfernen",
      save: "Speichern",
      saveChanges: "Änderungen speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      confirm: "Bestätigen",
      previous: "Zurück",
      next: "Weiter",
      tryAgain: "Erneut versuchen",
    },
    information: {
      hours: "Stunden",
      minutes: "Minuten",
    },
    userAvatar: {
      menu: {
        preferences: "Ihre Einstellungen",
        login: "Anmelden",
      },
    },
    dangerZone: "Gefahrenzone",
    noResults: "Die Suche ergab keine Treffer",
    zod: {
      errors: {
        default: "Dieses Feld ist ungültig",
        required: "Dieses Feld ist erforderlich",
      },
    },
    mantineReactTable: MRT_Localization_DE as Readonly<Record<keyof typeof MRT_Localization_DE, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Name",
        },
      },
      action: {
        moveUp: "Nach oben bewegen",
        moveDown: "Nach unten bewegen",
      },
      menu: {
        label: {
          changePosition: "Position wechseln",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Einstellungen",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Breite",
        },
        height: {
          label: "Höhe",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "In neuem Tab öffnen",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Ansicht",
          option: {
            row: {
              label: "Horizontal",
            },
            column: {
              label: "Vertikal",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Heute blockiert",
        adsBlockedTodayPercentage: "Heute blockiert",
        dnsQueriesToday: "Heutige Anfragen",
      },
    },
    dnsHoleControls: {
      description: "Steuern Sie PiHole oder AdGuard von Ihrem Dashboard aus",
      option: {
        layout: {
          label: "Ansicht",
          option: {
            row: {
              label: "Horizontal",
            },
            column: {
              label: "Vertikal",
            },
          },
        },
      },
      controls: {
        set: "Speichern",
        enabled: "Aktiviert",
        disabled: "Deaktiviert",
        hours: "Stunden",
        minutes: "Minuten",
      },
    },
    clock: {
      description: "Zeigt das aktuelle Datum und die Uhrzeit an.",
      option: {
        timezone: {
          label: "Zeitzone",
        },
      },
    },
    notebook: {
      name: "Notizbuch",
      option: {
        showToolbar: {
          label: "Zeigt die Symbolleiste an, um Ihnen beim Schreiben der Markdown zu assistieren",
        },
        allowReadOnlyCheck: {
          label: "Prüfung im Nur-Lese-Modus zulassen",
        },
        content: {
          label: "Der Inhalt des Notizbuchs",
        },
      },
      controls: {
        bold: "Fett",
        italic: "Kursiv",
        strikethrough: "Durchgestrichen",
        underline: "Unterstrichen",
        colorText: "Farbiger Text",
        colorHighlight: "Farbig hervorgehobener Text",
        code: "Code",
        clear: "Formatierung entfernen",
        blockquote: "Blockzitat",
        horizontalLine: "Horizontale Linie",
        bulletList: "Aufzählung",
        orderedList: "Geordnete Liste",
        checkList: "Checkliste",
        increaseIndent: "Einzug vergrößern",
        decreaseIndent: "Einzug verkleinern",
        link: "Link",
        unlink: "Link entfernen",
        image: "Bild einbetten",
        addTable: "Tabelle hinzufügen",
        deleteTable: "Tabelle entfernen",
        colorCell: "Farbe der Tabellen Zelle",
        mergeCell: "Zellen-Zusammenführung umschalten",
        addColumnLeft: "Spalte davor hinzufügen",
        addColumnRight: "Spalte danach hinzufügen",
        deleteColumn: "Spalte löschen",
        addRowTop: "Zeile davor hinzufügen",
        addRowBelow: "Zeile danach hinzufügen",
        deleteRow: "Zeile löschen",
      },
      align: {
        left: "Links",
        center: "Mittig",
        right: "Rechts",
      },
      popover: {
        clearColor: "Farbe entfernen",
        source: "Quelle",
        widthPlaceholder: "Wert in % oder Pixel",
        columns: "Spalten",
        rows: "Zeilen",
        width: "Breite",
        height: "Höhe",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Einbetten von Inhalten aus dem Internet. Einige Websites können den Zugriff einschränken.",
      option: {
        embedUrl: {
          label: "URL einbetten",
        },
        allowFullScreen: {
          label: "Vollbildmodus zulassen",
        },
        allowTransparency: {
          label: "Erlaube Transparenz",
        },
        allowScrolling: {
          label: "Scrollen zulassen",
        },
        allowPayment: {
          label: "Zahlung zulassen",
        },
        allowAutoPlay: {
          label: "Automatische Wiedergabe zulassen",
        },
        allowMicrophone: {
          label: "Mikrofonzugriff erlauben",
        },
        allowCamera: {
          label: "Kamera freigeben",
        },
        allowGeolocation: {
          label: "Geolokalisierung zulassen",
        },
      },
      error: {
        noBrowerSupport: "Ihr Browser unterstützt keine iframes. Bitte aktualisieren Sie Ihren Browser.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "Eintrag-ID",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Anzeigename",
        },
        automationId: {
          label: "Automatisierungs-ID",
        },
      },
    },
    calendar: {
      name: "Kalender",
      option: {
        releaseType: {
          label: "Radarr Veröffentlichungs Typ",
        },
      },
    },
    weather: {
      name: "Wetter",
      description: "Zeigt die aktuellen Wetterinformationen für einen bestimmten Ort an.",
      option: {
        location: {
          label: "Wetterstandort",
        },
      },
      kind: {
        clear: "Klar",
        mainlyClear: "Überwiegend klar",
        fog: "Nebel",
        drizzle: "Niesel",
        freezingDrizzle: "Eisiger Nieselregen",
        rain: "Regen",
        freezingRain: "Eisiger Regen",
        snowFall: "Schneefall",
        snowGrains: "Schneekörner",
        rainShowers: "Regenschauer",
        snowShowers: "Schneeschauer",
        thunderstorm: "Gewitter",
        thunderstormWithHail: "Gewitter mit Hagel",
        unknown: "Unbekannt",
      },
    },
    indexerManager: {
      name: "Status des Indexer-Managers",
      title: "Indexer-Manager",
      testAll: "Alle testen",
    },
    healthMonitoring: {
      name: "Überwachung des Systemzustands",
      description: "Zeigt Informationen zum Zustand und Status Ihres/Ihrer Systeme(s) an.",
      option: {
        fahrenheit: {
          label: "CPU-Temperatur in Fahrenheit",
        },
        cpu: {
          label: "CPU-Info anzeigen",
        },
        memory: {
          label: "Speicher-Info anzeigen",
        },
        fileSystem: {
          label: "Dateisystem Info anzeigen",
        },
      },
      popover: {
        available: "Verfügbar",
      },
    },
    common: {
      location: {
        search: "Suchen",
        table: {
          header: {},
          population: {
            fallback: "Unbekannt",
          },
        },
      },
    },
    video: {
      name: "Videostream",
      description: "Einbetten eines Videostreams oder eines Videos von einer Kamera oder einer Website",
      option: {
        feedUrl: {
          label: "Feed-URL",
        },
        hasAutoPlay: {
          label: "Automatische Wiedergabe",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Hinzugefügt am",
        },
        downSpeed: {
          columnTitle: "Down",
          detailsTitle: "Download Geschwindigkeit",
        },
        integration: {
          columnTitle: "Integration",
        },
        progress: {
          columnTitle: "Fortschritt",
        },
        ratio: {
          columnTitle: "Verhältnis",
        },
        state: {
          columnTitle: "Staat",
        },
        upSpeed: {
          columnTitle: "Up",
        },
      },
      states: {
        downloading: "Herunterladen",
        queued: "In der Warteschlange",
        paused: "Pausiert",
        completed: "Abgeschlossen",
        unknown: "Unbekannt",
      },
    },
    "mediaRequests-requestList": {
      description: "Sehen Sie eine Liste aller Medienanfragen von Ihrer Overseerr- oder Jellyseerr-Instanz",
      option: {
        linksTargetNewTab: {
          label: "Links in neuem Tab öffnen",
        },
      },
      availability: {
        unknown: "Unbekannt",
        partiallyAvailable: "Teilweise",
        available: "Verfügbar",
      },
    },
    "mediaRequests-requestStats": {
      description: "Statistiken über Ihre Medienanfragen",
      titles: {
        stats: {
          main: "Medien-Statistiken",
          approved: "Bereits genehmigt",
          pending: "Ausstehende Freigaben",
          tv: "TV-Anfragen",
          movie: "Film-Anfragen",
          total: "Gesamt",
        },
        users: {
          main: "Top-Nutzer",
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
              md: "Mittel",
              lg: "Groß",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Anhang des Hintergrundbildes",
      },
      backgroundImageSize: {
        label: "Hintergrundbild-Größe",
      },
      primaryColor: {
        label: "Primärfarbe",
      },
      secondaryColor: {
        label: "Sekundärfarbe",
      },
      customCss: {
        description:
          "Außerdem können Sie Ihr Dashboard mittels CSS anpassen, dies wird nur für erfahrene Benutzer empfohlen",
      },
      name: {
        label: "Name",
      },
      isPublic: {
        label: "Öffentlich sichtbar",
      },
    },
    setting: {
      section: {
        general: {
          title: "Allgemein",
        },
        layout: {
          title: "Ansicht",
        },
        background: {
          title: "Hintergrund",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Board anzeigen",
              },
            },
          },
        },
        dangerZone: {
          title: "Gefahrenzone",
          action: {
            delete: {
              confirm: {
                title: "Board löschen",
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
        home: "Startseite",
        boards: "Boards",
        apps: "Apps",
        users: {
          label: "Benutzer",
          items: {
            manage: "Verwalten",
            invites: "Einladungen",
          },
        },
        tools: {
          label: "Werkzeuge",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Einstellungen",
        help: {
          label: "Hilfe",
          items: {
            documentation: "Dokumentation",
            discord: "Community Discord",
          },
        },
        about: "Über",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Boards",
          user: "Benutzer",
          invite: "Einladungen",
          app: "Apps",
        },
        statisticLabel: {
          boards: "Boards",
        },
      },
      board: {
        title: "Deine Boards",
        action: {
          settings: {
            label: "Einstellungen",
          },
          setHomeBoard: {
            badge: {
              label: "Startseite",
            },
          },
          delete: {
            label: "Dauerhaft löschen",
            confirm: {
              title: "Board löschen",
            },
          },
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
        setting: {
          general: {
            title: "Allgemein",
            item: {
              firstDayOfWeek: "Erster Tag der Woche",
              accessibility: "Barrierefreiheit",
            },
          },
          security: {
            title: "Sicherheit",
          },
          board: {
            title: "Boards",
          },
        },
        list: {
          metaTitle: "Verwaltung von Benutzern",
          title: "Benutzer",
        },
        create: {
          metaTitle: "Benutzer erstellen",
          step: {
            security: {
              label: "Sicherheit",
            },
          },
        },
        invite: {
          title: "Verwalten von Benutzereinladungen",
          action: {
            new: {
              description:
                "Nach Ablauf der Frist ist eine Einladung nicht mehr gültig und der Empfänger der Einladung kann kein Konto erstellen.",
            },
            copy: {
              link: "Link zur Einladung",
            },
            delete: {
              title: "Einladung löschen",
              description:
                "Sind Sie sicher, dass Sie diese Einladung löschen möchten? Benutzer mit diesem Link können dann kein Konto mehr über diesen Link erstellen.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Ersteller",
            },
            expirationDate: {
              label: "Ablaufdatum",
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
            title: "Allgemein",
          },
        },
      },
      settings: {
        title: "Einstellungen",
      },
      tool: {
        tasks: {
          status: {
            running: "Aktiv",
            error: "Fehler",
          },
          job: {
            mediaServer: {
              label: "Medien Server",
            },
            mediaRequests: {
              label: "Medienanfragen",
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
    title: "Container",
    field: {
      name: {
        label: "Name",
      },
      state: {
        label: "Staat",
        option: {
          created: "Erstellt",
          running: "Aktiv",
          paused: "Pausiert",
          restarting: "Startet neu",
          removing: "Wird entfernt",
        },
      },
      containerImage: {
        label: "Image",
      },
      ports: {
        label: "Ports",
      },
    },
    action: {
      start: {
        label: "Starten",
      },
      stop: {
        label: "Stopp",
      },
      restart: {
        label: "Neustarten",
      },
      remove: {
        label: "Entfernen",
      },
    },
  },
  permission: {
    tab: {
      user: "Benutzer",
    },
    field: {
      user: {
        label: "Benutzer",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Verwalten",
      boards: {
        label: "Boards",
      },
      integrations: {
        edit: {
          label: "Bearbeiten",
        },
      },
      "search-engines": {
        edit: {
          label: "Bearbeiten",
        },
      },
      apps: {
        label: "Apps",
        edit: {
          label: "Bearbeiten",
        },
      },
      users: {
        label: "Benutzer",
        create: {
          label: "Erstellen",
        },
        general: "Allgemein",
        security: "Sicherheit",
        board: "Boards",
        invites: {
          label: "Einladungen",
        },
      },
      tools: {
        label: "Werkzeuge",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Einstellungen",
      },
      about: {
        label: "Über",
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
            title: "Hilfe",
            option: {
              documentation: {
                label: "Dokumentation",
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
                label: "Verwaltung von Benutzern",
              },
              about: {
                label: "Über",
              },
              preferences: {
                label: "Ihre Einstellungen",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Benutzer",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Name",
        },
      },
    },
  },
} as const;
