import "dayjs/locale/hu";
import dayjs from "dayjs";
dayjs.locale("hu");

export default {
  "user": {
    "title": "Felhasználók",
    "name": "Felhasználó",
    "field": {
      "email": {
        "label": "Email cím"
      },
      "username": {
        "label": "Felhasználónév"
      },
      "password": {
        "label": "Jelszó",
        "requirement": {
          "lowercase": "Tartalmazzon kisbetűt",
          "uppercase": "Tartalmazzon nagybetűt",
          "number": "Tartalmazzon számot"
        }
      },
      "passwordConfirm": {
        "label": "Jelszó megerősítése"
      }
    },
    "action": {
      "login": {
        "label": "Bejelentkezés"
      },
      "register": {
        "label": "Fiók létrehozása",
        "notification": {
          "success": {
            "title": "Fiók létrehozva"
          }
        }
      },
      "create": "Felhasználó létrehozása"
    }
  },
  "group": {
    "field": {
      "name": "Név"
    },
    "permission": {
      "admin": {
        "title": "Adminisztrátor"
      },
      "board": {
        "title": "Táblák"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Alkalmazások"
      }
    },
    "field": {
      "name": {
        "label": "Név"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Név"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Érvénytelen URL"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Felhasználónév"
        },
        "password": {
          "label": "Jelszó",
          "newLabel": "Új jelszó"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Név",
      "size": "Méret",
      "creator": "Létrehozó"
    }
  },
  "common": {
    "error": "Hiba",
    "action": {
      "add": "Hozzáadás",
      "apply": "Alkalmaz",
      "create": "Létrehozás",
      "edit": "Szerkesztés",
      "insert": "Beillesztés",
      "remove": "Eltávolítás",
      "save": "Mentés",
      "saveChanges": "Változások mentése",
      "cancel": "Mégse",
      "delete": "Törlés",
      "confirm": "Megerősít",
      "previous": "Előző",
      "next": "Következő",
      "tryAgain": "Próbálja újra"
    },
    "information": {
      "hours": "Óra",
      "minutes": "Perc"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Saját preferenciák",
        "login": "Bejelentkezés"
      }
    },
    "dangerZone": "Veszélyzóna",
    "noResults": "Nincs eredmény",
    "zod": {
      "errors": {
        "default": "Ez a mező érvénytelen",
        "required": "Ez a mező kötelező"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Név"
        }
      },
      "action": {
        "moveUp": "Felfelé mozgatás",
        "moveDown": "Mozgatás le"
      },
      "menu": {
        "label": {
          "changePosition": "Pozíció módosítása"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Beállítások"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Szélesség"
        },
        "height": {
          "label": "Magasság"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Megnyitás új lapon"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Elrendezés",
          "option": {
            "row": {
              "label": "Vízszintes"
            },
            "column": {
              "label": "Függőleges"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Mai blokkolások",
        "adsBlockedTodayPercentage": "Mai blokkolások",
        "dnsQueriesToday": "Mai lekérdezések"
      }
    },
    "dnsHoleControls": {
      "description": "A PiHole vagy az AdGuard vezérlése a műszerfalról",
      "option": {
        "layout": {
          "label": "Elrendezés",
          "option": {
            "row": {
              "label": "Vízszintes"
            },
            "column": {
              "label": "Függőleges"
            }
          }
        }
      },
      "controls": {
        "set": "Beállít",
        "enabled": "Engedélyezve",
        "disabled": "Letiltva",
        "hours": "Óra",
        "minutes": "Perc"
      }
    },
    "clock": {
      "description": "Megjeleníti az aktuális dátumot és időt.",
      "option": {
        "timezone": {
          "label": "Időzóna"
        }
      }
    },
    "notebook": {
      "name": "Jegyzettömb",
      "option": {
        "showToolbar": {
          "label": "A markdown írást segítő eszköztár megjelenítése"
        },
        "allowReadOnlyCheck": {
          "label": "Csak olvasási módban történő ellenőrzés engedélyezése"
        },
        "content": {
          "label": "A jegyzetfüzet tartalma"
        }
      },
      "controls": {
        "bold": "Félkövér",
        "italic": "Dőlt",
        "strikethrough": "Áthúzott",
        "underline": "Aláhúzott",
        "colorText": "Szövegszín",
        "colorHighlight": "Színesen kiemelt szöveg",
        "code": "Kód",
        "clear": "Formázás törlése",
        "blockquote": "Idézet",
        "horizontalLine": "Vízszintes vonal",
        "bulletList": "Lista",
        "orderedList": "Sorkizárt",
        "checkList": "Jelölőnégyzetes lista",
        "increaseIndent": "Behúzás növelése",
        "decreaseIndent": "Behúzás csökkentése",
        "link": "Hivatkozás",
        "unlink": "Hivatkozás eltávolítása",
        "image": "Kép beágyazása",
        "addTable": "Táblázat hozzáadása",
        "deleteTable": "Táblázat törlése",
        "colorCell": "Színes cella",
        "mergeCell": "Cellák összevonása",
        "addColumnLeft": "Oszlop hozzáadása előtte",
        "addColumnRight": "Oszlop hozzáadása utána",
        "deleteColumn": "Oszlop törlése",
        "addRowTop": "Sor hozzáadása előtte",
        "addRowBelow": "Sor hozzáadása utána",
        "deleteRow": "Sor törlése"
      },
      "align": {
        "left": "Bal",
        "center": "Középre",
        "right": "Jobb"
      },
      "popover": {
        "clearColor": "Szín törlése",
        "source": "Forrás",
        "widthPlaceholder": "Érték %-ban vagy képpontban",
        "columns": "Oszlopok",
        "rows": "Sorok",
        "width": "Szélesség",
        "height": "Magasság"
      }
    },
    "iframe": {
      "name": "Beágyazott keret (iFrame)",
      "description": "Bármilyen tartalom beágyazása az internetről. Egyes webhelyek korlátozhatják a hozzáférést.",
      "option": {
        "embedUrl": {
          "label": "Beágyazási URL"
        },
        "allowFullScreen": {
          "label": "Teljes képernyő engedélyezése"
        },
        "allowTransparency": {
          "label": "Engedélyezze az átláthatóságot"
        },
        "allowScrolling": {
          "label": "Görgetés engedélyezése"
        },
        "allowPayment": {
          "label": "Fizetés engedélyezése"
        },
        "allowAutoPlay": {
          "label": "Automatikus lejátszás engedélyezése"
        },
        "allowMicrophone": {
          "label": "Mikrofon engedélyezése"
        },
        "allowCamera": {
          "label": "Kamera engedélyezése"
        },
        "allowGeolocation": {
          "label": "Geolokáció engedélyezése"
        }
      },
      "error": {
        "noBrowerSupport": "Az Ön böngészője nem támogatja a beágyazott kereteket. Kérjük, frissítse böngészőjét."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "Egység azonosító"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Megjelenített név"
        },
        "automationId": {
          "label": "Automatizálási azonosító"
        }
      }
    },
    "calendar": {
      "name": "Naptár",
      "option": {
        "releaseType": {
          "label": "Radarr kiadás típusa"
        }
      }
    },
    "weather": {
      "name": "Időjárás",
      "description": "Megjeleníti egy meghatározott hely aktuális időjárási adatait.",
      "option": {
        "location": {
          "label": "Időjárás helye"
        }
      },
      "kind": {
        "clear": "Tiszta",
        "mainlyClear": "Főként tiszta",
        "fog": "Köd",
        "drizzle": "Ködszitálás",
        "freezingDrizzle": "Ónos szitálás",
        "rain": "Eső",
        "freezingRain": "Ónos eső",
        "snowFall": "Hóesés",
        "snowGrains": "Hószemcsék",
        "rainShowers": "Záporok",
        "snowShowers": "Hózáporok",
        "thunderstorm": "Vihar",
        "thunderstormWithHail": "Zivatar jégesővel",
        "unknown": "Ismeretlen"
      }
    },
    "indexerManager": {
      "name": "Indexelő menedzser állapota",
      "title": "Indexelő menedzser",
      "testAll": "Teszteld az összeset"
    },
    "healthMonitoring": {
      "name": "Rendszerállapot-felügyelet",
      "description": "Megjeleníti a rendszer(ek) állapotát és állapotát mutató információkat.",
      "option": {
        "fahrenheit": {
          "label": "CPU hőmérséklet Fahrenheitben"
        },
        "cpu": {
          "label": "CPU-információk megjelenítése"
        },
        "memory": {
          "label": "Memóriainformációk megjelenítése"
        },
        "fileSystem": {
          "label": "Fájlrendszer-információk megjelenítése"
        }
      },
      "popover": {
        "available": "Elérhető"
      }
    },
    "common": {
      "location": {
        "search": "Keresés",
        "table": {
          "header": {},
          "population": {
            "fallback": "Ismeretlen"
          }
        }
      }
    },
    "video": {
      "name": "Videófolyam",
      "description": "Videófolyam vagy videó beágyazása egy kameráról vagy weboldalról",
      "option": {
        "feedUrl": {
          "label": "Hírcsatorna URL"
        },
        "hasAutoPlay": {
          "label": "Automatikus lejátszás"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Hozzáadás dátuma"
        },
        "downSpeed": {
          "columnTitle": "Le",
          "detailsTitle": "Letöltési sebesség"
        },
        "integration": {
          "columnTitle": "Integráció"
        },
        "progress": {
          "columnTitle": "Folyamat"
        },
        "ratio": {
          "columnTitle": "Arány"
        },
        "state": {
          "columnTitle": "Állapot"
        },
        "upSpeed": {
          "columnTitle": "Fel"
        }
      },
      "states": {
        "downloading": "Letöltés",
        "queued": "Sorban áll",
        "paused": "Szünet",
        "completed": "Kész",
        "unknown": "Ismeretlen"
      }
    },
    "mediaRequests-requestList": {
      "description": "Az Overseerr vagy Jellyseerr példány összes médiakérelmének listájának megtekintése",
      "option": {
        "linksTargetNewTab": {
          "label": "Linkek megnyitása új fülön"
        }
      },
      "availability": {
        "unknown": "Ismeretlen",
        "partiallyAvailable": "Részleges",
        "available": "Elérhető"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Statisztikák az Ön médiakéréseiről",
      "titles": {
        "stats": {
          "main": "Média statisztikák",
          "approved": "Már jóváhagyva",
          "pending": "Várakozás jóváhagyásra",
          "tv": "TV kérések",
          "movie": "Filmkérések",
          "total": "Összesen"
        },
        "users": {
          "main": "Legnépszerűbb felhasználók"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Alkalmazások"
          },
          "screenSize": {
            "option": {
              "sm": "Kicsi",
              "md": "Közepes",
              "lg": "Nagy"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Háttérkép csatolása"
      },
      "backgroundImageSize": {
        "label": "Háttér kép mérete"
      },
      "primaryColor": {
        "label": "Elsődleges szín"
      },
      "secondaryColor": {
        "label": "Másodlagos szín"
      },
      "customCss": {
        "description": "Továbbá, testreszabhatja műszerfalát CSS segítségével, csak tapasztalt felhasználóknak ajánlott"
      },
      "name": {
        "label": "Név"
      },
      "isPublic": {
        "label": "Nyilvános"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Általános"
        },
        "layout": {
          "title": "Elrendezés"
        },
        "background": {
          "title": "Háttér"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Tábla megtekintése"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Veszélyzóna",
          "action": {
            "delete": {
              "confirm": {
                "title": "Tábla törlése"
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
        "home": "Nyitólap",
        "boards": "Táblák",
        "apps": "Alkalmazások",
        "users": {
          "label": "Felhasználók",
          "items": {
            "manage": "Kezelés",
            "invites": "Meghívók"
          }
        },
        "tools": {
          "label": "Eszközök",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Beállítások",
        "help": {
          "label": "Segítség",
          "items": {
            "documentation": "Dokumentáció",
            "discord": "Discord-szerverünk"
          }
        },
        "about": "Névjegy"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Táblák",
          "user": "Felhasználók",
          "invite": "Meghívók",
          "app": "Alkalmazások"
        },
        "statisticLabel": {
          "boards": "Táblák"
        }
      },
      "board": {
        "title": "Az Ön táblái",
        "action": {
          "settings": {
            "label": "Beállítások"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Nyitólap"
            }
          },
          "delete": {
            "label": "Végleges törlés",
            "confirm": {
              "title": "Tábla törlése"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Név"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Általános",
            "item": {
              "firstDayOfWeek": "A hét első napja",
              "accessibility": "Kisegítő lehetőségek"
            }
          },
          "security": {
            "title": "Biztonság"
          },
          "board": {
            "title": "Táblák"
          }
        },
        "list": {
          "metaTitle": "Felhasználók kezelése",
          "title": "Felhasználók"
        },
        "create": {
          "metaTitle": "Felhasználó létrehozása",
          "step": {
            "security": {
              "label": "Biztonság"
            }
          }
        },
        "invite": {
          "title": "Felhasználói meghívók kezelése",
          "action": {
            "new": {
              "description": "A lejárat után a meghívó már nem lesz érvényes, és a meghívó címzettje nem tud fiókot létrehozni."
            },
            "copy": {
              "link": "Meghívó link"
            },
            "delete": {
              "title": "Meghívó törlése",
              "description": "Biztos, hogy törölni szeretné ezt a meghívót? Az ezzel a linkkel rendelkező felhasználók többé nem tudnak fiókot létrehozni a link használatával."
            }
          },
          "field": {
            "id": {
              "label": "Azonosító"
            },
            "creator": {
              "label": "Létrehozó"
            },
            "expirationDate": {
              "label": "Lejárati idő"
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
            "title": "Általános"
          }
        }
      },
      "settings": {
        "title": "Beállítások"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Fut",
            "error": "Hiba"
          },
          "job": {
            "mediaServer": {
              "label": "Médiakiszolgáló"
            },
            "mediaRequests": {
              "label": "Média kérések"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Dokumentáció"
            },
            "apiKey": {
              "table": {
                "header": {
                  "id": "Azonosító"
                }
              }
            }
          }
        }
      }
    }
  },
  "docker": {
    "title": "Tartály",
    "field": {
      "name": {
        "label": "Név"
      },
      "state": {
        "label": "Állapot",
        "option": {
          "created": "Létrehozva",
          "running": "Fut",
          "paused": "Szünet",
          "restarting": "Újraindítás",
          "removing": "Eltávolítás"
        }
      },
      "containerImage": {
        "label": "Kép"
      },
      "ports": {
        "label": "Portok"
      }
    },
    "action": {
      "start": {
        "label": "Indítás"
      },
      "stop": {
        "label": "Megállítás"
      },
      "restart": {
        "label": "Újraindítás"
      },
      "remove": {
        "label": "Eltávolítás"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Felhasználók"
    },
    "field": {
      "user": {
        "label": "Felhasználó"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Kezelés",
      "boards": {
        "label": "Táblák"
      },
      "integrations": {
        "edit": {
          "label": "Szerkesztés"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Szerkesztés"
        }
      },
      "apps": {
        "label": "Alkalmazások",
        "edit": {
          "label": "Szerkesztés"
        }
      },
      "users": {
        "label": "Felhasználók",
        "create": {
          "label": "Létrehozás"
        },
        "general": "Általános",
        "security": "Biztonság",
        "board": "Táblák",
        "invites": {
          "label": "Meghívók"
        }
      },
      "tools": {
        "label": "Eszközök",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Beállítások"
      },
      "about": {
        "label": "Névjegy"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Alkalmazások"
          },
          "board": {
            "title": "Táblák"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Torrentek"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Segítség",
            "option": {
              "documentation": {
                "label": "Dokumentáció"
              },
              "discord": {
                "label": "Discord-szerverünk"
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
                "label": "Felhasználók kezelése"
              },
              "about": {
                "label": "Névjegy"
              },
              "preferences": {
                "label": "Saját preferenciák"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Felhasználók"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Név"
        }
      }
    }
  }
} as const;