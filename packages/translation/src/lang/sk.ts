import "dayjs/locale/sk";
import dayjs from "dayjs";
dayjs.locale("sk");

export default {
  "user": {
    "title": "Používatelia",
    "name": "Používateľ",
    "field": {
      "email": {
        "label": "E-mail"
      },
      "username": {
        "label": "Používateľské meno"
      },
      "password": {
        "label": "Heslo",
        "requirement": {
          "lowercase": "Zahŕňa malé písmeno",
          "uppercase": "Zahŕňa veľké písmená",
          "number": "Vrátane čísiel"
        }
      },
      "passwordConfirm": {
        "label": "Potvrdenie hesla"
      }
    },
    "action": {
      "login": {
        "label": "Prihlásiť sa"
      },
      "register": {
        "label": "Vytvoriť účet",
        "notification": {
          "success": {
            "title": "Účet bol Vytvorený"
          }
        }
      },
      "create": "Vytvoriť užívateľa"
    }
  },
  "group": {
    "field": {
      "name": "Názov"
    },
    "permission": {
      "admin": {
        "title": "Správca"
      },
      "board": {
        "title": "Dosky"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Aplikácie"
      }
    },
    "field": {
      "name": {
        "label": "Názov"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Názov"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Neplatná URL"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Používateľské meno"
        },
        "password": {
          "label": "Heslo",
          "newLabel": "Nové heslo"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Názov",
      "size": "Veľkosť",
      "creator": "Autor"
    }
  },
  "common": {
    "error": "Chyba",
    "action": {
      "add": "Pridať",
      "apply": "Použiť",
      "create": "Vytvoriť",
      "edit": "Upraviť",
      "insert": "Vložiť",
      "remove": "Odstrániť",
      "save": "Uložiť",
      "saveChanges": "Uložiť zmeny",
      "cancel": "Zrušiť",
      "delete": "Vymazať",
      "confirm": "Potvrďte",
      "previous": "Predchádzajúci",
      "next": "Ďalej",
      "tryAgain": "Skúste znova"
    },
    "information": {
      "hours": "Hodiny",
      "minutes": "Minúty"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Vaše preferencie",
        "login": "Prihlásiť sa"
      }
    },
    "dangerZone": "Nebezpečná zóna",
    "noResults": "Nenašli sa žiadne výsledky",
    "zod": {
      "errors": {
        "default": "Toto pole je neplatné",
        "required": "Toto pole je povinné"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Názov"
        }
      },
      "action": {
        "moveUp": "Posunúť nahor",
        "moveDown": "Posunúť nadol"
      },
      "menu": {
        "label": {
          "changePosition": "Zmeniť pozíciu"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Nastavenia"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Šírka"
        },
        "height": {
          "label": "Výška"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Otvoriť na novej karte"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Rozloženie",
          "option": {
            "row": {
              "label": "Horizontálne"
            },
            "column": {
              "label": "Vertikálne"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Zablokované dnes",
        "adsBlockedTodayPercentage": "Zablokované dnes",
        "dnsQueriesToday": "Poziadavky dnes"
      }
    },
    "dnsHoleControls": {
      "description": "Ovládajte PiHole alebo AdGuard z ovládacieho panela",
      "option": {
        "layout": {
          "label": "Rozloženie",
          "option": {
            "row": {
              "label": "Horizontálne"
            },
            "column": {
              "label": "Vertikálne"
            }
          }
        }
      },
      "controls": {
        "set": "Nastaviť",
        "enabled": "Povolené",
        "disabled": "Zakázané",
        "hours": "Hodiny",
        "minutes": "Minúty"
      }
    },
    "clock": {
      "description": "Zobrazuje aktuálny dátum a čas.",
      "option": {
        "timezone": {
          "label": "Časové pásmo"
        }
      }
    },
    "notebook": {
      "name": "Poznámkový blok",
      "option": {
        "showToolbar": {
          "label": "Zobrazenie panela nástrojov na pomoc pri písaní poznámok"
        },
        "allowReadOnlyCheck": {
          "label": "Povolenie kontroly v režime len na čítanie"
        },
        "content": {
          "label": "Obsah zápisníka"
        }
      },
      "controls": {
        "bold": "Tučné",
        "italic": "Kurzíva",
        "strikethrough": "Prečiarknuté",
        "underline": "Podčiarknuté",
        "colorText": "Farebný text",
        "colorHighlight": "Farebné zvýraznenie textu",
        "code": "Kód",
        "clear": "Vyčistiť formátovanie",
        "blockquote": "Citát",
        "horizontalLine": "Horizontálna čiara",
        "bulletList": "Zoznam odrážok",
        "orderedList": "Objednaný zoznam",
        "checkList": "Kontrolný zoznam",
        "increaseIndent": "Zväčšenie odstupu",
        "decreaseIndent": "Zníženie odstupu",
        "link": "Odkaz",
        "unlink": "Odstrániť odkaz",
        "image": "Vložiť obrázok",
        "addTable": "Pridať tabuľku",
        "deleteTable": "Odstrániť tabuľku",
        "colorCell": "Farebná bunka",
        "mergeCell": "Prepnúť zlúčenie buniek",
        "addColumnLeft": "Pridať stĺpec pred",
        "addColumnRight": "Pridať stĺpec po",
        "deleteColumn": "Vymazať stĺpec",
        "addRowTop": "Pridať riadok pred",
        "addRowBelow": "Pridať riadok po",
        "deleteRow": "Vymazať riadok"
      },
      "align": {
        "left": "Vľavo",
        "center": "Na stred",
        "right": "Vpravo"
      },
      "popover": {
        "clearColor": "Vymazať farbu",
        "source": "Zdroj",
        "widthPlaceholder": "Hodnota v % alebo pixeloch",
        "columns": "Stĺpce",
        "rows": "Riadky",
        "width": "Šírka",
        "height": "Výška"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "Vložte akýkoľvek obsah z internetu. Niektoré webové stránky môžu obmedziť prístup.",
      "option": {
        "embedUrl": {
          "label": "Vložiť adresu URL"
        },
        "allowFullScreen": {
          "label": "Povoliť celú obrazovku"
        },
        "allowTransparency": {
          "label": "Povoliť priehľadnosť"
        },
        "allowScrolling": {
          "label": "Povolenie posúvania"
        },
        "allowPayment": {
          "label": "Umožniť platbu"
        },
        "allowAutoPlay": {
          "label": "Povolenie automatického prehrávania"
        },
        "allowMicrophone": {
          "label": "Povoliť mikrofón"
        },
        "allowCamera": {
          "label": "Povoliť kameru"
        },
        "allowGeolocation": {
          "label": "Povolenie geografickej lokalizácie"
        }
      },
      "error": {
        "noBrowerSupport": "Váš prehliadač nepodporuje iframe. Aktualizujte svoj prehliadač."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "ID subjektu"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Zobrazenie názvu"
        },
        "automationId": {
          "label": "ID automatizácie"
        }
      }
    },
    "calendar": {
      "name": "Kalendár",
      "option": {
        "releaseType": {
          "label": "Typ Radarr releasu"
        }
      }
    },
    "weather": {
      "name": "Počasie",
      "description": "Zobrazí aktuálne informácie o počasí na nastavenom mieste.",
      "option": {
        "location": {
          "label": "Poloha počasia"
        }
      },
      "kind": {
        "clear": "Jasno",
        "mainlyClear": "Prevažne jasno",
        "fog": "Hmla",
        "drizzle": "Mrholenie",
        "freezingDrizzle": "Mrznúce mrholenie",
        "rain": "Dážď",
        "freezingRain": "Mrznúci dážď",
        "snowFall": "Sneženie",
        "snowGrains": "Snehové zrná",
        "rainShowers": "Prehánky",
        "snowShowers": "Snehové prehánky",
        "thunderstorm": "Búrka",
        "thunderstormWithHail": "Búrka s krúpami",
        "unknown": "Neznámy"
      }
    },
    "indexerManager": {
      "name": "Stav správcu indexovača",
      "title": "Správca indexovača",
      "testAll": "Otestujte všetky"
    },
    "healthMonitoring": {
      "name": "Monitorovanie stavu systému",
      "description": "Zobrazuje informácie o stave a kondícii vášho systému.",
      "option": {
        "fahrenheit": {
          "label": "Teplota CPU v stupňoch Fahrenheita"
        },
        "cpu": {
          "label": "Zobrazenie informácií o CPU"
        },
        "memory": {
          "label": "Zobraziť informácie o pamäti"
        },
        "fileSystem": {
          "label": "Zobraziť informácie o súborovom systéme"
        }
      },
      "popover": {
        "available": "K dispozícii"
      }
    },
    "common": {
      "location": {
        "search": "Hladať",
        "table": {
          "header": {},
          "population": {
            "fallback": "Neznámy"
          }
        }
      }
    },
    "video": {
      "name": "Video stream",
      "description": "Vloženie videoprenosu alebo videa z kamery alebo webovej lokality",
      "option": {
        "feedUrl": {
          "label": "Adresa URL"
        },
        "hasAutoPlay": {
          "label": "Automatické prehrávanie"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Dátum pridania"
        },
        "downSpeed": {
          "columnTitle": "Dole",
          "detailsTitle": "Rýchlosť sťahovania"
        },
        "integration": {
          "columnTitle": "Integrácia"
        },
        "progress": {
          "columnTitle": "Stav"
        },
        "ratio": {
          "columnTitle": "Pomer"
        },
        "state": {
          "columnTitle": "Stav"
        },
        "upSpeed": {
          "columnTitle": "Hore"
        }
      },
      "states": {
        "downloading": "Sťahovanie",
        "queued": "V poradí",
        "paused": "Pozastavené",
        "completed": "Dokončené",
        "unknown": "Neznámy"
      }
    },
    "mediaRequests-requestList": {
      "description": "Zobrazenie zoznamu všetkých mediálnych požiadaviek z Overseerr alebo Jellyseerr",
      "option": {
        "linksTargetNewTab": {
          "label": "Otvorenie odkazov v novej karte"
        }
      },
      "availability": {
        "unknown": "Neznámy",
        "partiallyAvailable": "Čiastočný",
        "available": "K dispozícii"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Štatistiky o vašich požiadavkách na médiá",
      "titles": {
        "stats": {
          "main": "Štatistiky médií",
          "approved": "Už schválené",
          "pending": "Čakajúce na schválenie",
          "tv": "TV požiadavky",
          "movie": "Filmové požiadavky",
          "total": "Celkom"
        },
        "users": {
          "main": "Najlepší používatelia"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Aplikácie"
          },
          "screenSize": {
            "option": {
              "sm": "Malé",
              "md": "Stredné",
              "lg": "Veľké"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Pripojenie obrázku na pozadí"
      },
      "backgroundImageSize": {
        "label": "Veľkosť obrázka na pozadí"
      },
      "primaryColor": {
        "label": "Hlavná farba"
      },
      "secondaryColor": {
        "label": "Sekundárna farba"
      },
      "customCss": {
        "description": "Ďalej si prispôsobte ovládací panel pomocou CSS, odporúča sa len pre skúsených používateľov"
      },
      "name": {
        "label": "Názov"
      },
      "isPublic": {
        "label": "Verejné"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Všeobecné"
        },
        "layout": {
          "title": "Rozloženie"
        },
        "background": {
          "title": "Pozadie"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Zobraziť tabuľu"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Nebezpečná zóna",
          "action": {
            "delete": {
              "confirm": {
                "title": "Odstrániť dosku"
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
        "home": "Domovská stránka",
        "boards": "Dosky",
        "apps": "Aplikácie",
        "users": {
          "label": "Používatelia",
          "items": {
            "manage": "Spravovať",
            "invites": "Pozvánky"
          }
        },
        "tools": {
          "label": "Nástroje",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Nastavenia",
        "help": {
          "label": "Pomocník",
          "items": {
            "documentation": "Dokumentácia",
            "discord": "Diskord Spoločenstva"
          }
        },
        "about": "O aplikácii"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Dosky",
          "user": "Používatelia",
          "invite": "Pozvánky",
          "app": "Aplikácie"
        },
        "statisticLabel": {
          "boards": "Dosky"
        }
      },
      "board": {
        "title": "Vaše dosky",
        "action": {
          "settings": {
            "label": "Nastavenia"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Domovská stránka"
            }
          },
          "delete": {
            "label": "Odstrániť natrvalo",
            "confirm": {
              "title": "Odstrániť dosku"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Názov"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Všeobecné",
            "item": {
              "firstDayOfWeek": "Prvý deň v týždni",
              "accessibility": "Prístupnosť"
            }
          },
          "security": {
            "title": "Bezpečnosť"
          },
          "board": {
            "title": "Dosky"
          }
        },
        "list": {
          "metaTitle": "Spravovať používateľov",
          "title": "Používatelia"
        },
        "create": {
          "metaTitle": "Vytvoriť užívateľa",
          "step": {
            "security": {
              "label": "Bezpečnosť"
            }
          }
        },
        "invite": {
          "title": "Správa pozvánok používateľov",
          "action": {
            "new": {
              "description": "Po vypršaní platnosti pozvánky už nebude platná a príjemca pozvánky si nebude môcť vytvoriť účet."
            },
            "copy": {
              "link": "Odkaz na pozvánku"
            },
            "delete": {
              "title": "Odstránenie pozvánky",
              "description": "Ste si istí, že chcete túto pozvánku vymazať? Používatelia s týmto odkazom si už nebudú môcť vytvoriť účet pomocou tohto odkazu."
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "Autor"
            },
            "expirationDate": {
              "label": "Dátum vypršania"
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
            "title": "Všeobecné"
          }
        }
      },
      "settings": {
        "title": "Nastavenia"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Spustené",
            "error": "Chyba"
          },
          "job": {
            "mediaServer": {
              "label": "Multimediálny Server"
            },
            "mediaRequests": {
              "label": "Žiadosti médií"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Dokumentácia"
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
    "title": "Kontajnery",
    "field": {
      "name": {
        "label": "Názov"
      },
      "state": {
        "label": "Stav",
        "option": {
          "created": "Vytvorené",
          "running": "Spustené",
          "paused": "Pozastavené",
          "restarting": "Reštartovanie",
          "removing": "Odstraňujem"
        }
      },
      "containerImage": {
        "label": "Obraz"
      },
      "ports": {
        "label": "Porty"
      }
    },
    "action": {
      "start": {
        "label": "Spustiť"
      },
      "stop": {
        "label": "Zastaviť"
      },
      "restart": {
        "label": "Reštartovať"
      },
      "remove": {
        "label": "Odstrániť"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Používatelia"
    },
    "field": {
      "user": {
        "label": "Používateľ"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Spravovať",
      "boards": {
        "label": "Dosky"
      },
      "integrations": {
        "edit": {
          "label": "Upraviť"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Upraviť"
        }
      },
      "apps": {
        "label": "Aplikácie",
        "edit": {
          "label": "Upraviť"
        }
      },
      "users": {
        "label": "Používatelia",
        "create": {
          "label": "Vytvoriť"
        },
        "general": "Všeobecné",
        "security": "Bezpečnosť",
        "board": "Dosky",
        "invites": {
          "label": "Pozvánky"
        }
      },
      "tools": {
        "label": "Nástroje",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Nastavenia"
      },
      "about": {
        "label": "O aplikácii"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Aplikácie"
          },
          "board": {
            "title": "Dosky"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Torrenty"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Pomocník",
            "option": {
              "documentation": {
                "label": "Dokumentácia"
              },
              "discord": {
                "label": "Diskord Spoločenstva"
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
                "label": "Spravovať používateľov"
              },
              "about": {
                "label": "O aplikácii"
              },
              "preferences": {
                "label": "Vaše preferencie"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Používatelia"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Názov"
        }
      }
    }
  }
} as const;