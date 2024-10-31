import "dayjs/locale/da";
import dayjs from "dayjs";
dayjs.locale("da");

export default {
  "user": {
    "title": "Brugere",
    "name": "Bruger",
    "field": {
      "email": {
        "label": "E-mail"
      },
      "username": {
        "label": "Brugernavn"
      },
      "password": {
        "label": "Adgangskode",
        "requirement": {
          "lowercase": "Inkluderer små bogstaver",
          "uppercase": "Inkluderer store bogstaver",
          "number": "Inkluderer nummer"
        }
      },
      "passwordConfirm": {
        "label": "Bekræft kodeord"
      }
    },
    "action": {
      "login": {
        "label": "Log ind"
      },
      "register": {
        "label": "Opret konto",
        "notification": {
          "success": {
            "title": "Konto oprettet"
          }
        }
      },
      "create": "Opret bruger"
    }
  },
  "group": {
    "field": {
      "name": "Navn"
    },
    "permission": {
      "admin": {
        "title": "Admin"
      },
      "board": {
        "title": "Boards"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Apps"
      }
    },
    "field": {
      "name": {
        "label": "Navn"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Navn"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Ugyldig URL"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Brugernavn"
        },
        "password": {
          "label": "Adgangskode",
          "newLabel": "Nyt kodeord"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Navn",
      "size": "Størrelse",
      "creator": "Skaber"
    }
  },
  "common": {
    "error": "Fejl",
    "action": {
      "add": "Tilføj",
      "apply": "Anvend",
      "create": "Opret",
      "edit": "Rediger",
      "insert": "Indsæt",
      "remove": "Fjern",
      "save": "Gem",
      "saveChanges": "Gem ændringer",
      "cancel": "Annuller",
      "delete": "Slet",
      "confirm": "Bekræft",
      "previous": "Forrige",
      "next": "Næste",
      "tryAgain": "Prøv igen"
    },
    "information": {
      "hours": "Timer",
      "minutes": "Minutter"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Dine indstillinger",
        "login": "Log ind"
      }
    },
    "dangerZone": "Farezone",
    "noResults": "Ingen resultater fundet",
    "zod": {
      "errors": {
        "default": "Dette felt er ugyldigt",
        "required": "Dette felt er påkrævet"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Navn"
        }
      },
      "action": {
        "moveUp": "Flyt op",
        "moveDown": "Flyt ned"
      },
      "menu": {
        "label": {
          "changePosition": "Ændre placering"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Indstillinger"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Bredde"
        },
        "height": {
          "label": "Højde"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Åbn i nyt faneblad"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Layout",
          "option": {
            "row": {
              "label": "Horisontal"
            },
            "column": {
              "label": "Vertikal"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Blokeret i dag",
        "adsBlockedTodayPercentage": "Blokeret i dag",
        "dnsQueriesToday": "Forespørgsler i dag"
      }
    },
    "dnsHoleControls": {
      "description": "Kontroller PiHole eller AdGuard fra dit dashboard",
      "option": {
        "layout": {
          "label": "Layout",
          "option": {
            "row": {
              "label": "Horisontal"
            },
            "column": {
              "label": "Vertikal"
            }
          }
        }
      },
      "controls": {
        "set": "Indstil",
        "enabled": "Aktiveret",
        "disabled": "Deaktiveret",
        "hours": "Timer",
        "minutes": "Minutter"
      }
    },
    "clock": {
      "description": "Viser aktuel dag og klokkeslæt.",
      "option": {
        "timezone": {
          "label": "Tidszone"
        }
      }
    },
    "notebook": {
      "name": "Notesbog",
      "option": {
        "showToolbar": {
          "label": "Vis værktøjslinjen, der hjælper dig med at skrive markdown"
        },
        "allowReadOnlyCheck": {
          "label": "Tillad tjek i skrivebeskyttet tilstand"
        },
        "content": {
          "label": "Indholdet af notesbogen"
        }
      },
      "controls": {
        "bold": "Fed",
        "italic": "Kursiv",
        "strikethrough": "Gennemstreget",
        "underline": "Understreget",
        "colorText": "Tekst i farver",
        "colorHighlight": "Farvet fremhævning af tekst",
        "code": "Kode",
        "clear": "Ryd formatering",
        "blockquote": "Citatblok",
        "horizontalLine": "Horisontal linje",
        "bulletList": "Punktopstillet liste",
        "orderedList": "Sorteret liste",
        "checkList": "Tjekliste",
        "increaseIndent": "Forøg indrykning",
        "decreaseIndent": "Formindsk indrykning",
        "link": "Link",
        "unlink": "Fjern link",
        "image": "Integrer billede",
        "addTable": "Tilføj tabel",
        "deleteTable": "Slet tabel",
        "colorCell": "Farvecelle",
        "mergeCell": "Slå cellefletning til/fra",
        "addColumnLeft": "Tilføj kolonne før",
        "addColumnRight": "Tilføj kolonne efter",
        "deleteColumn": "Slet kolonne",
        "addRowTop": "Tilføj række før",
        "addRowBelow": "Tilføj række efter",
        "deleteRow": "Slet række"
      },
      "align": {
        "left": "Venstre",
        "center": "Centrer",
        "right": "Højre"
      },
      "popover": {
        "clearColor": "Ryd farve",
        "source": "Kilde",
        "widthPlaceholder": "Værdi i % eller pixels",
        "columns": "Kolonner",
        "rows": "Rækker",
        "width": "Bredde",
        "height": "Højde"
      }
    },
    "iframe": {
      "name": "indlejret dokument (iframe)",
      "description": "Indlejr ethvert indhold fra internettet. Nogle websteder kan begrænse adgang.",
      "option": {
        "embedUrl": {
          "label": "Indlejr URL"
        },
        "allowFullScreen": {
          "label": "Tillad fuld skærm"
        },
        "allowTransparency": {
          "label": "Tillad gennemsigtighed"
        },
        "allowScrolling": {
          "label": "Tillad rulning"
        },
        "allowPayment": {
          "label": "Tillad betaling"
        },
        "allowAutoPlay": {
          "label": "Tillad automatisk afspilning"
        },
        "allowMicrophone": {
          "label": "Tillad mikrofon"
        },
        "allowCamera": {
          "label": "Tillad kamera"
        },
        "allowGeolocation": {
          "label": "Tillad geolokalisering"
        }
      },
      "error": {
        "noBrowerSupport": "Din browser understøtter ikke iframes. Opdater venligst din browser."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "Entitet ID"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Visningsnavn"
        },
        "automationId": {
          "label": "Automatiserings ID"
        }
      }
    },
    "calendar": {
      "name": "Kalender",
      "option": {
        "releaseType": {
          "label": "Radarr udgivelsestype"
        }
      }
    },
    "weather": {
      "name": "Vejr",
      "description": "Viser de aktuelle vejroplysninger for en bestemt placering.",
      "option": {
        "location": {
          "label": "Vejr lokation"
        }
      },
      "kind": {
        "clear": "Skyfrit",
        "mainlyClear": "Hovedsageligt skyfrit",
        "fog": "Tåge",
        "drizzle": "Støvregn",
        "freezingDrizzle": "Støvregn med isslag",
        "rain": "Regn",
        "freezingRain": "Isslag",
        "snowFall": "Snefald",
        "snowGrains": "Mildt snefald",
        "rainShowers": "Regnbyger",
        "snowShowers": "Snebyger",
        "thunderstorm": "Tordenvejr",
        "thunderstormWithHail": "Tordenvejr med hagl",
        "unknown": "Ukendt"
      }
    },
    "indexerManager": {
      "name": "Indekserings manager status",
      "title": "Indexer-manager",
      "testAll": "Test alle"
    },
    "healthMonitoring": {
      "name": "Systemsundhedsovervågning",
      "description": "Viser oplysninger om dit/dine systems tilstand og status.",
      "option": {
        "fahrenheit": {
          "label": "CPU-temperatur i Fahrenheit"
        },
        "cpu": {
          "label": "Vis CPU-info"
        },
        "memory": {
          "label": "Vis hukommelsesoplysninger"
        },
        "fileSystem": {
          "label": "Vis information om filsystemet"
        }
      },
      "popover": {
        "available": "Tilgængelig"
      }
    },
    "common": {
      "location": {
        "search": "Søg",
        "table": {
          "header": {},
          "population": {
            "fallback": "Ukendt"
          }
        }
      }
    },
    "video": {
      "name": "Video Stream",
      "description": "Indlejr en video stream eller video fra et kamera eller et website",
      "option": {
        "feedUrl": {
          "label": "Feed URL"
        },
        "hasAutoPlay": {
          "label": "Auto-afspilning"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Dato tilføjet"
        },
        "downSpeed": {
          "columnTitle": "Down",
          "detailsTitle": "Download hastighed"
        },
        "integration": {
          "columnTitle": "Integration"
        },
        "progress": {
          "columnTitle": "Fremskridt"
        },
        "ratio": {
          "columnTitle": "Delingsforhold"
        },
        "state": {
          "columnTitle": "Tilstand"
        },
        "upSpeed": {
          "columnTitle": "Up"
        }
      },
      "states": {
        "downloading": "Downloader",
        "queued": "I kø",
        "paused": "På pause",
        "completed": "Fuldført",
        "unknown": "Ukendt"
      }
    },
    "mediaRequests-requestList": {
      "description": "Se en liste over alle medieforespørgsler fra din Overseerr eller Jellyseerr instans",
      "option": {
        "linksTargetNewTab": {
          "label": "Åbn links i ny fane"
        }
      },
      "availability": {
        "unknown": "Ukendt",
        "partiallyAvailable": "Delvis",
        "available": "Tilgængelig"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Statistik over dine medieanmodninger",
      "titles": {
        "stats": {
          "main": "Mediestatistik",
          "approved": "Allerede godkendt",
          "pending": "Afventer godkendelse",
          "tv": "TV-anmodninger",
          "movie": "Film anmodninger",
          "total": "Total"
        },
        "users": {
          "main": "Topbrugere"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Apps"
          },
          "screenSize": {
            "option": {
              "sm": "Lille",
              "md": "Mellem",
              "lg": "Stor"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Vedhæftning af baggrundsbillede"
      },
      "backgroundImageSize": {
        "label": "Baggrundsbilledets størrelse"
      },
      "primaryColor": {
        "label": "Primær farve"
      },
      "secondaryColor": {
        "label": "Sekundær farve"
      },
      "customCss": {
        "description": "Yderligere, tilpasse dit dashboard ved hjælp af CSS, anbefales kun til erfarne brugere"
      },
      "name": {
        "label": "Navn"
      },
      "isPublic": {
        "label": "Offentlig"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Generelt"
        },
        "layout": {
          "title": "Layout"
        },
        "background": {
          "title": "Baggrund"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Se board"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Farezone",
          "action": {
            "delete": {
              "confirm": {
                "title": "Slet board"
              }
            }
          }
        }
      }
    }
  },
  "management": {
    "navbar": {
      "items": {
        "home": "Hjem",
        "boards": "Boards",
        "apps": "Apps",
        "users": {
          "label": "Brugere",
          "items": {
            "manage": "Administrer",
            "invites": "Invitationer"
          }
        },
        "tools": {
          "label": "Værktøjer",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Indstillinger",
        "help": {
          "label": "Hjælp",
          "items": {
            "documentation": "Dokumentation",
            "discord": "Discordfællesskab"
          }
        },
        "about": "Om"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Boards",
          "user": "Brugere",
          "invite": "Invitationer",
          "app": "Apps"
        },
        "statisticLabel": {
          "boards": "Boards"
        }
      },
      "board": {
        "title": "Dine boards",
        "action": {
          "settings": {
            "label": "Indstillinger"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Hjem"
            }
          },
          "delete": {
            "label": "Slet permanent",
            "confirm": {
              "title": "Slet board"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Navn"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Generelt",
            "item": {
              "firstDayOfWeek": "Første ugedag",
              "accessibility": "Hjælpefunktioner"
            }
          },
          "security": {
            "title": "Sikkerhed"
          },
          "board": {
            "title": "Boards"
          }
        },
        "list": {
          "metaTitle": "Administrér brugere",
          "title": "Brugere"
        },
        "create": {
          "metaTitle": "Opret bruger",
          "step": {
            "security": {
              "label": "Sikkerhed"
            }
          }
        },
        "invite": {
          "title": "Administrer brugerinvitationer",
          "action": {
            "new": {
              "description": "Efter udløb vil en invitation ikke længere være gyldig, og modtageren af invitationen vil ikke være i stand til at oprette en konto."
            },
            "copy": {
              "link": "Invitationslink"
            },
            "delete": {
              "title": "Slet invitation",
              "description": "Er du sikker på, at du vil slette denne invitation? Brugere med dette link vil ikke længere kunne oprette en konto ved hjælp af dette link."
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "Skaber"
            },
            "expirationDate": {
              "label": "Udløbsdato"
            },
            "token": {
              "label": "Token"
            }
          }
        }
      },
      "group": {
        "setting": {
          "general": {
            "title": "Generelt"
          }
        }
      },
      "settings": {
        "title": "Indstillinger"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Kører",
            "error": "Fejl"
          },
          "job": {
            "mediaServer": {
              "label": "Medieserver"
            },
            "mediaRequests": {
              "label": "Medieforespørgsler"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Dokumentation"
            },
            "apiKey": {
              "table": {
                "header": {
                  "id": "ID"
                }
              }
            }
          }
        }
      }
    }
  },
  "docker": {
    "title": "Containere",
    "field": {
      "name": {
        "label": "Navn"
      },
      "state": {
        "label": "Tilstand",
        "option": {
          "created": "Oprettet",
          "running": "Kører",
          "paused": "På pause",
          "restarting": "Genstarter",
          "removing": "Fjerner"
        }
      },
      "containerImage": {
        "label": "Image"
      },
      "ports": {
        "label": "Porte"
      }
    },
    "action": {
      "start": {
        "label": "Start"
      },
      "stop": {
        "label": "Stop"
      },
      "restart": {
        "label": "Genstart"
      },
      "remove": {
        "label": "Fjern"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Brugere"
    },
    "field": {
      "user": {
        "label": "Bruger"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Administrer",
      "boards": {
        "label": "Boards"
      },
      "integrations": {
        "edit": {
          "label": "Rediger"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Rediger"
        }
      },
      "apps": {
        "label": "Apps",
        "edit": {
          "label": "Rediger"
        }
      },
      "users": {
        "label": "Brugere",
        "create": {
          "label": "Opret"
        },
        "general": "Generelt",
        "security": "Sikkerhed",
        "board": "Boards",
        "invites": {
          "label": "Invitationer"
        }
      },
      "tools": {
        "label": "Værktøjer",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Indstillinger"
      },
      "about": {
        "label": "Om"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Apps"
          },
          "board": {
            "title": "Boards"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Torrents"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Hjælp",
            "option": {
              "documentation": {
                "label": "Dokumentation"
              },
              "discord": {
                "label": "Discordfællesskab"
              }
            }
          }
        }
      },
      "page": {
        "group": {
          "page": {
            "option": {
              "manageUser": {
                "label": "Administrér brugere"
              },
              "about": {
                "label": "Om"
              },
              "preferences": {
                "label": "Dine indstillinger"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Brugere"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Navn"
        }
      }
    }
  }
} as const;