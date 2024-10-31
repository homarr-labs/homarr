import "dayjs/locale/cs";
import dayjs from "dayjs";
dayjs.locale("cs");

export default {
  "user": {
    "title": "Uživatelé",
    "name": "Uživatel",
    "field": {
      "email": {
        "label": "E-mail"
      },
      "username": {
        "label": "Uživatelské jméno"
      },
      "password": {
        "label": "Heslo",
        "requirement": {
          "lowercase": "Obsahuje malé písmeno",
          "uppercase": "Obsahuje velké písmeno",
          "number": "Obsahuje číslo"
        }
      },
      "passwordConfirm": {
        "label": "Potvrďte heslo"
      }
    },
    "action": {
      "login": {
        "label": "Přihlásit se"
      },
      "register": {
        "label": "Vytvořit účet",
        "notification": {
          "success": {
            "title": "Účet byl vytvořen"
          }
        }
      },
      "create": "Vytvořit uživatele"
    }
  },
  "group": {
    "field": {
      "name": "Název"
    },
    "permission": {
      "admin": {
        "title": "Administrátor"
      },
      "board": {
        "title": "Plochy"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Aplikace"
      }
    },
    "field": {
      "name": {
        "label": "Název"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Název"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Neplatná URL adresa"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Uživatelské jméno"
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
      "name": "Název",
      "size": "Velikost",
      "creator": "Vytvořil/a"
    }
  },
  "common": {
    "error": "Chyba",
    "action": {
      "add": "Přidat",
      "apply": "Použít",
      "create": "Vytvořit",
      "edit": "Upravit",
      "insert": "Vložit",
      "remove": "Odstranit",
      "save": "Uložit",
      "saveChanges": "Uložit změny",
      "cancel": "Zrušit",
      "delete": "Odstranit",
      "confirm": "Potvrdit",
      "previous": "Zpět",
      "next": "Další",
      "tryAgain": "Zkusit znovu"
    },
    "information": {
      "hours": "Hodin",
      "minutes": "Minut"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Vaše předvolby",
        "login": "Přihlásit se"
      }
    },
    "dangerZone": "Nebezpečná zóna",
    "noResults": "Nebyly nalezeny žádné výsledky",
    "zod": {
      "errors": {
        "default": "Toto pole je neplatné",
        "required": "Toto pole je nutné vyplnit"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Název"
        }
      },
      "action": {
        "moveUp": "Posunout nahoru",
        "moveDown": "Posunout dolů"
      },
      "menu": {
        "label": {
          "changePosition": "Změnit pozici"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Nastavení"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Šířka"
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
          "label": "Otevřít na nové kartě"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Rozložení",
          "option": {
            "row": {
              "label": "Horizontální"
            },
            "column": {
              "label": "Vertikální"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Zablokováno dnes",
        "adsBlockedTodayPercentage": "Zablokováno dnes",
        "dnsQueriesToday": "Dotazů dnes"
      }
    },
    "dnsHoleControls": {
      "description": "Ovládejte PiHole nebo AdGuard z plochy",
      "option": {
        "layout": {
          "label": "Rozložení",
          "option": {
            "row": {
              "label": "Horizontální"
            },
            "column": {
              "label": "Vertikální"
            }
          }
        }
      },
      "controls": {
        "set": "Nastavit",
        "enabled": "Zapnuto",
        "disabled": "Vypnuto",
        "hours": "Hodin",
        "minutes": "Minut"
      }
    },
    "clock": {
      "description": "Zobrazuje aktuální datum a čas.",
      "option": {
        "timezone": {
          "label": "Časové pásmo"
        }
      }
    },
    "notebook": {
      "name": "Zápisník",
      "option": {
        "showToolbar": {
          "label": "Zobrazovat panel nástroju, který Vám pomůže s formátováním textu"
        },
        "allowReadOnlyCheck": {
          "label": "Povolit kontrolu v režimu pouze pro čtení"
        },
        "content": {
          "label": "Obsah zápisníku"
        }
      },
      "controls": {
        "bold": "Tučné",
        "italic": "Kurzíva",
        "strikethrough": "Přeškrtnuté",
        "underline": "Podtržení",
        "colorText": "Barva písma",
        "colorHighlight": "Barevné zvýraznění textu",
        "code": "Kód",
        "clear": "Vymazat formátování",
        "blockquote": "Citace",
        "horizontalLine": "Vodorovná čára",
        "bulletList": "Odrážkový seznam",
        "orderedList": "Číslovaný seznam",
        "checkList": "Zaškrtávací seznam",
        "increaseIndent": "Zvětšit odsazení",
        "decreaseIndent": "Zmenšit odsazení",
        "link": "Vložit odkaz",
        "unlink": "Odstranit odkaz",
        "image": "Vložit obrázek",
        "addTable": "Přidat tabulku",
        "deleteTable": "Odstranit tabulku",
        "colorCell": "Barva výplně",
        "mergeCell": "Sloučit buňky",
        "addColumnLeft": "Přidat sloupec před",
        "addColumnRight": "Přidat sloupec za",
        "deleteColumn": "Odstranit sloupec",
        "addRowTop": "Přidat řádek nad",
        "addRowBelow": "Přidat řádek pod",
        "deleteRow": "Odstranit řádek"
      },
      "align": {
        "left": "Vlevo",
        "center": "Střed",
        "right": "Vpravo"
      },
      "popover": {
        "clearColor": "Odstranit barvu",
        "source": "Zdroj",
        "widthPlaceholder": "Hodnota v % nebo pixelech",
        "columns": "Sloupce",
        "rows": "Řádky",
        "width": "Šířka",
        "height": "Výška"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "Vložte jakýkoli obsah z internetu. Některé webové stránky mohou omezit přístup.",
      "option": {
        "embedUrl": {
          "label": "Embed URL"
        },
        "allowFullScreen": {
          "label": "Povolit celou obrazovku"
        },
        "allowTransparency": {
          "label": "Povolit průhlednost"
        },
        "allowScrolling": {
          "label": "Povolit posouvání"
        },
        "allowPayment": {
          "label": "Povolit platbu"
        },
        "allowAutoPlay": {
          "label": "Povolit automatické přehrávání"
        },
        "allowMicrophone": {
          "label": "Povolit mikrofon"
        },
        "allowCamera": {
          "label": "Povolit kameru"
        },
        "allowGeolocation": {
          "label": "Povolit polohu"
        }
      },
      "error": {
        "noBrowerSupport": "Váš prohlížeč nepodporuje iFrame. Aktualizujte, prosím, svůj prohlížeč."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "ID entity"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Zobrazovaný název"
        },
        "automationId": {
          "label": "ID automatizace"
        }
      }
    },
    "calendar": {
      "name": "Kalendář",
      "option": {
        "releaseType": {
          "label": "Typ vydání filmu pro Radarr"
        }
      }
    },
    "weather": {
      "name": "Počasí",
      "description": "Zobrazuje aktuální informace o počasí na nastaveném místě.",
      "option": {
        "location": {
          "label": "Lokalita pro počasí"
        }
      },
      "kind": {
        "clear": "Jasno",
        "mainlyClear": "Převážně jasno",
        "fog": "Mlha",
        "drizzle": "Mrholení",
        "freezingDrizzle": "Mrznoucí mrholení",
        "rain": "Déšť",
        "freezingRain": "Mrznoucí déšť",
        "snowFall": "Sněžení",
        "snowGrains": "Sněhová zrna",
        "rainShowers": "Dešťové přeháňky",
        "snowShowers": "Sněhové přeháňky",
        "thunderstorm": "Bouřka",
        "thunderstormWithHail": "Bouřka s krupobitím",
        "unknown": "Neznámý"
      }
    },
    "indexerManager": {
      "name": "Stav správce indexeru",
      "title": "Správce indexeru",
      "testAll": "Otestovat vše"
    },
    "healthMonitoring": {
      "name": "Monitorování stavu systému",
      "description": "Zobrazuje informace o stavu a kondici Vašeho systému (systémů).",
      "option": {
        "fahrenheit": {
          "label": "Teplota CPU ve stupních Fahrenheit"
        },
        "cpu": {
          "label": "Zobrazit info o CPU"
        },
        "memory": {
          "label": "Zobrazit informace o paměti"
        },
        "fileSystem": {
          "label": "Zobrazit informace o souborovém systému"
        }
      },
      "popover": {
        "available": "K dispozici"
      }
    },
    "common": {
      "location": {
        "search": "Vyhledat",
        "table": {
          "header": {},
          "population": {
            "fallback": "Neznámý"
          }
        }
      }
    },
    "video": {
      "name": "Streamování videa",
      "description": "Vložte video stream nebo video z kamery nebo webové stránky",
      "option": {
        "feedUrl": {
          "label": "URL zdroje"
        },
        "hasAutoPlay": {
          "label": "Automatické přehrávání"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Datum přidání"
        },
        "downSpeed": {
          "columnTitle": "Stahování",
          "detailsTitle": "Rychlost stahování"
        },
        "integration": {
          "columnTitle": "Integrace"
        },
        "progress": {
          "columnTitle": "Postup"
        },
        "ratio": {
          "columnTitle": "Poměr"
        },
        "state": {
          "columnTitle": "Status"
        },
        "upSpeed": {
          "columnTitle": "Nahrávání"
        }
      },
      "states": {
        "downloading": "Stahování",
        "queued": "Ve frontě",
        "paused": "Pozastaveno",
        "completed": "Hotovo",
        "unknown": "Neznámý"
      }
    },
    "mediaRequests-requestList": {
      "description": "Podívejte se na seznam všech požadavků na média z vaší instance Overseerr nebo Jellyseerr",
      "option": {
        "linksTargetNewTab": {
          "label": "Otevírat odkazy v nové kartě"
        }
      },
      "availability": {
        "unknown": "Neznámý",
        "partiallyAvailable": "Částečně dostupné",
        "available": "K dispozici"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Statistiky vašich požadavků na média",
      "titles": {
        "stats": {
          "main": "Statistiky médií",
          "approved": "Již schváleno",
          "pending": "Čeká na schválení",
          "tv": "Požadavky seriálů",
          "movie": "Požadavky filmů",
          "total": "Celkem"
        },
        "users": {
          "main": "Top uživatelé"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Aplikace"
          },
          "screenSize": {
            "option": {
              "sm": "Malé",
              "md": "Střední",
              "lg": "Velké"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Příloha obrázku na pozadí"
      },
      "backgroundImageSize": {
        "label": "Velikost obrázku na pozadí"
      },
      "primaryColor": {
        "label": "Primární barva"
      },
      "secondaryColor": {
        "label": "Doplňková barva"
      },
      "customCss": {
        "description": "Dále si můžete přizpůsobit ovládací panel pomocí CSS, doporučujeme pouze zkušeným uživatelům"
      },
      "name": {
        "label": "Název"
      },
      "isPublic": {
        "label": "Veřejné"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Obecné"
        },
        "layout": {
          "title": "Rozložení"
        },
        "background": {
          "title": "Pozadí"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Zobrazit plochu"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Nebezpečná zóna",
          "action": {
            "delete": {
              "confirm": {
                "title": "Odstranit plochu"
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
        "boards": "Plochy",
        "apps": "Aplikace",
        "users": {
          "label": "Uživatelé",
          "items": {
            "manage": "Spravovat",
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
        "settings": "Nastavení",
        "help": {
          "label": "Nápověda",
          "items": {
            "documentation": "Dokumentace",
            "discord": "Komunitní Discord"
          }
        },
        "about": "O aplikaci"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Plochy",
          "user": "Uživatelé",
          "invite": "Pozvánky",
          "app": "Aplikace"
        },
        "statisticLabel": {
          "boards": "Plochy"
        }
      },
      "board": {
        "title": "Vaše plochy",
        "action": {
          "settings": {
            "label": "Nastavení"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Domovská stránka"
            }
          },
          "delete": {
            "label": "Trvale smazat",
            "confirm": {
              "title": "Odstranit plochu"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Název"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Obecné",
            "item": {
              "firstDayOfWeek": "První den v týdnu",
              "accessibility": "Přístupnost"
            }
          },
          "security": {
            "title": "Bezpečnost"
          },
          "board": {
            "title": "Plochy"
          }
        },
        "list": {
          "metaTitle": "Správa uživatelů",
          "title": "Uživatelé"
        },
        "create": {
          "metaTitle": "Vytvořit uživatele",
          "step": {
            "security": {
              "label": "Bezpečnost"
            }
          }
        },
        "invite": {
          "title": "Správa pozvánek uživatelů",
          "action": {
            "new": {
              "description": "Po vypršení platnosti pozvánka přestane být platná a příjemce pozvánky si nebude moci vytvořit účet."
            },
            "copy": {
              "link": "Odkaz na pozvánku"
            },
            "delete": {
              "title": "Odstranit pozvánku",
              "description": "Jste si jisti, že chcete tuto pozvánku smazat? Uživatelé s tímto odkazem již nebudou moci pomocí tohoto odkazu vytvořit účet."
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "Vytvořil/a"
            },
            "expirationDate": {
              "label": "Datum konce platnosti"
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
            "title": "Obecné"
          }
        }
      },
      "settings": {
        "title": "Nastavení"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Běží",
            "error": "Chyba"
          },
          "job": {
            "mediaServer": {
              "label": "Mediální server"
            },
            "mediaRequests": {
              "label": "Žádosti o média"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Dokumentace"
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
    "title": "Kontejnery",
    "field": {
      "name": {
        "label": "Název"
      },
      "state": {
        "label": "Status",
        "option": {
          "created": "Vytvořený",
          "running": "Běží",
          "paused": "Pozastaveno",
          "restarting": "Restartování",
          "removing": "Odstraňování"
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
        "label": "Spustit"
      },
      "stop": {
        "label": "Zastavit"
      },
      "restart": {
        "label": "Restartovat"
      },
      "remove": {
        "label": "Odstranit"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Uživatelé"
    },
    "field": {
      "user": {
        "label": "Uživatel"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Spravovat",
      "boards": {
        "label": "Plochy"
      },
      "integrations": {
        "edit": {
          "label": "Upravit"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Upravit"
        }
      },
      "apps": {
        "label": "Aplikace",
        "edit": {
          "label": "Upravit"
        }
      },
      "users": {
        "label": "Uživatelé",
        "create": {
          "label": "Vytvořit"
        },
        "general": "Obecné",
        "security": "Bezpečnost",
        "board": "Plochy",
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
        "label": "Nastavení"
      },
      "about": {
        "label": "O aplikaci"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Aplikace"
          },
          "board": {
            "title": "Plochy"
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
            "title": "Nápověda",
            "option": {
              "documentation": {
                "label": "Dokumentace"
              },
              "discord": {
                "label": "Komunitní Discord"
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
                "label": "Správa uživatelů"
              },
              "about": {
                "label": "O aplikaci"
              },
              "preferences": {
                "label": "Vaše předvolby"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Uživatelé"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Název"
        }
      }
    }
  }
} as const;