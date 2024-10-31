import "dayjs/locale/sl";
import dayjs from "dayjs";
dayjs.locale("sl");

export default {
  "user": {
    "title": "Uporabniki",
    "name": "Uporabnik",
    "field": {
      "email": {
        "label": "E-naslov"
      },
      "username": {
        "label": "Uporabniško ime"
      },
      "password": {
        "label": "Geslo",
        "requirement": {
          "lowercase": "Vključuje male črke",
          "uppercase": "Vključuje velike tiskane črke",
          "number": "Vključuje število"
        }
      },
      "passwordConfirm": {
        "label": "Potrditev gesla"
      }
    },
    "action": {
      "login": {
        "label": "Prijava"
      },
      "register": {
        "label": "Ustvarite račun",
        "notification": {
          "success": {
            "title": "Ustvarjen račun"
          }
        }
      },
      "create": "Ustvari uporabnika"
    }
  },
  "group": {
    "field": {
      "name": "Ime"
    },
    "permission": {
      "admin": {
        "title": "Admin"
      },
      "board": {
        "title": "Deske"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Aplikacije"
      }
    },
    "field": {
      "name": {
        "label": "Ime"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Ime"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Nepravilen URL"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Uporabniško ime"
        },
        "password": {
          "label": "Geslo",
          "newLabel": "Novo geslo"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Ime",
      "size": "Velikost",
      "creator": "Ustvarjalec"
    }
  },
  "common": {
    "error": "Napaka",
    "action": {
      "add": "Dodaj",
      "apply": "Uporabi",
      "create": "Ustvarite spletno stran",
      "edit": "Uredi",
      "insert": "Vstavite",
      "remove": "Odstrani",
      "save": "Shrani",
      "saveChanges": "Shranjevanje sprememb",
      "cancel": "Prekliči",
      "delete": "Izbriši",
      "confirm": "Potrdi",
      "previous": "Prejšnji",
      "next": "Naslednji",
      "tryAgain": "Poskusite znova"
    },
    "information": {
      "hours": "",
      "minutes": ""
    },
    "userAvatar": {
      "menu": {
        "preferences": "Vaše želje",
        "login": "Prijava"
      }
    },
    "dangerZone": "Nevarno območje",
    "noResults": "Ni rezultatov",
    "zod": {
      "errors": {
        "default": "To polje je neveljavno",
        "required": "To polje je obvezno"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Ime"
        }
      },
      "action": {
        "moveUp": "Premaknite se navzgor",
        "moveDown": "Premaknite se navzdol"
      },
      "menu": {
        "label": {
          "changePosition": "Spremeni položaj"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Nastavitve"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Širina"
        },
        "height": {
          "label": "Višina"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Odprite v novem zavihku"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Postavitev",
          "option": {
            "row": {
              "label": "Vodoravno"
            },
            "column": {
              "label": "Navpično"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Blokirano danes",
        "adsBlockedTodayPercentage": "Blokirano danes",
        "dnsQueriesToday": "Poizvedbe danes"
      }
    },
    "dnsHoleControls": {
      "description": "Nadzorujte PiHole ali AdGuard iz nadzorne plošče",
      "option": {
        "layout": {
          "label": "Postavitev",
          "option": {
            "row": {
              "label": "Vodoravno"
            },
            "column": {
              "label": "Navpično"
            }
          }
        }
      },
      "controls": {
        "set": "",
        "enabled": "Omogočeno",
        "disabled": "Invalidi",
        "hours": "",
        "minutes": ""
      }
    },
    "clock": {
      "description": "Prikaže trenutni datum in čas.",
      "option": {
        "timezone": {
          "label": "Časovni pas"
        }
      }
    },
    "notebook": {
      "name": "Beležnica",
      "option": {
        "showToolbar": {
          "label": "Prikaži orodno vrstico za pomoč pri pisanju markdowna"
        },
        "allowReadOnlyCheck": {
          "label": "Dovolite preverjanje v načinu samo za branje"
        },
        "content": {
          "label": "Vsebina zvezka"
        }
      },
      "controls": {
        "bold": "Krepko",
        "italic": "Kurzivna pisava",
        "strikethrough": "Prečrtano",
        "underline": "Podčrtajte",
        "colorText": "Barvno besedilo",
        "colorHighlight": "Barvni poudarek besedila",
        "code": "Koda",
        "clear": "Jasno oblikovanje",
        "blockquote": "Blokovni citat",
        "horizontalLine": "Vodoravna črta",
        "bulletList": "Seznam kroglic",
        "orderedList": "Naročeni seznam",
        "checkList": "Kontrolni seznam",
        "increaseIndent": "Povečanje odmika",
        "decreaseIndent": "Zmanjšanje odmika",
        "link": "Povezava",
        "unlink": "Odstrani povezavo",
        "image": "Vstavljanje slik",
        "addTable": "Dodajte mizo",
        "deleteTable": "Brisanje tabele",
        "colorCell": "Barvna celica",
        "mergeCell": "Preklapljanje združevanja celic",
        "addColumnLeft": "Dodajte stolpec pred",
        "addColumnRight": "Dodajte stolpec za",
        "deleteColumn": "Brisanje stolpca",
        "addRowTop": "Dodajte vrstico pred",
        "addRowBelow": "Dodajte vrstico za",
        "deleteRow": "Brisanje vrstice"
      },
      "align": {
        "left": "Leva stran",
        "center": "Center",
        "right": "Desno"
      },
      "popover": {
        "clearColor": "Čista barva",
        "source": "Vir:",
        "widthPlaceholder": "Vrednost v % ali pikslih",
        "columns": "Stolpci",
        "rows": "Vrstice",
        "width": "Širina",
        "height": "Višina"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "Vstavite katero koli vsebino iz interneta. Nekatera spletna mesta lahko omejijo dostop.",
      "option": {
        "embedUrl": {
          "label": "URL za vstavljanje"
        },
        "allowFullScreen": {
          "label": "Omogočite celozaslonsko prikazovanje"
        },
        "allowTransparency": {
          "label": "Omogočanje preglednosti"
        },
        "allowScrolling": {
          "label": "Omogočite pomikanje"
        },
        "allowPayment": {
          "label": "Dovolite plačilo"
        },
        "allowAutoPlay": {
          "label": "Dovolite samodejno predvajanje"
        },
        "allowMicrophone": {
          "label": "Dovolite mikrofon"
        },
        "allowCamera": {
          "label": "Dovolite kamero"
        },
        "allowGeolocation": {
          "label": "Omogočanje zemljepisne lokacije"
        }
      },
      "error": {
        "noBrowerSupport": "Vaš brskalnik ne podpira iframov. Posodobite svoj brskalnik."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "ID subjekta"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Prikaži ime"
        },
        "automationId": {
          "label": ""
        }
      }
    },
    "calendar": {
      "name": "Koledar",
      "option": {
        "releaseType": {
          "label": "Tip sprostitve Radarr"
        }
      }
    },
    "weather": {
      "name": "Vreme",
      "description": "Prikaže trenutne vremenske informacije za določeno lokacijo.",
      "option": {
        "location": {
          "label": "Lokacija vremena"
        }
      },
      "kind": {
        "clear": "Počisti",
        "mainlyClear": "Večinoma jasno",
        "fog": "Megla",
        "drizzle": "Pršec",
        "freezingDrizzle": "Leden pršec",
        "rain": "Dež",
        "freezingRain": "Ledeni dež",
        "snowFall": "Padec snega",
        "snowGrains": "Snežna zrna",
        "rainShowers": "Deževni nalivi",
        "snowShowers": "Snežne plohe",
        "thunderstorm": "Nevihta",
        "thunderstormWithHail": "Nevihta s točo",
        "unknown": "Neznano"
      }
    },
    "indexerManager": {
      "name": "",
      "title": "",
      "testAll": ""
    },
    "healthMonitoring": {
      "name": "",
      "description": "",
      "option": {
        "fahrenheit": {
          "label": ""
        },
        "cpu": {
          "label": ""
        },
        "memory": {
          "label": ""
        },
        "fileSystem": {
          "label": ""
        }
      },
      "popover": {
        "available": ""
      }
    },
    "common": {
      "location": {
        "search": "Iskanje",
        "table": {
          "header": {},
          "population": {
            "fallback": "Neznano"
          }
        }
      }
    },
    "video": {
      "name": "Video tok",
      "description": "Vstavljanje videoprenosa ali videoposnetka iz kamere ali spletnega mesta",
      "option": {
        "feedUrl": {
          "label": "URL vira"
        },
        "hasAutoPlay": {
          "label": "Samodejno predvajanje"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": ""
        },
        "downSpeed": {
          "columnTitle": "Dol",
          "detailsTitle": "Hitrost prenosa"
        },
        "integration": {
          "columnTitle": "Integracija"
        },
        "progress": {
          "columnTitle": "Napredek"
        },
        "ratio": {
          "columnTitle": "Razmerje"
        },
        "state": {
          "columnTitle": "Stanje"
        },
        "upSpeed": {
          "columnTitle": "Gor"
        }
      },
      "states": {
        "downloading": "Prenašanje spletne strani",
        "queued": "",
        "paused": "Začasno ustavljeno",
        "completed": "Zaključeno",
        "unknown": "Neznano"
      }
    },
    "mediaRequests-requestList": {
      "description": "Oglejte si seznam vseh zahtevkov za medije iz vašega primera Overseerr ali Jellyseerr.",
      "option": {
        "linksTargetNewTab": {
          "label": "Odprite povezave v novem zavihku"
        }
      },
      "availability": {
        "unknown": "Neznano",
        "partiallyAvailable": "",
        "available": ""
      }
    },
    "mediaRequests-requestStats": {
      "description": "Statistični podatki o vaših zahtevah za medije",
      "titles": {
        "stats": {
          "main": "Statistika medijev",
          "approved": "Že odobreno",
          "pending": "Odobritve, ki čakajo na odobritev",
          "tv": "Prošnje za televizijo",
          "movie": "Prošnje za filme",
          "total": "Skupaj"
        },
        "users": {
          "main": "Najboljši uporabniki"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Aplikacije"
          },
          "screenSize": {
            "option": {
              "sm": "Majhna",
              "md": "Srednja",
              "lg": "Velika"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Pritrditev slike v ozadju"
      },
      "backgroundImageSize": {
        "label": "Velikost slike v ozadju"
      },
      "primaryColor": {
        "label": "Osnovna barva"
      },
      "secondaryColor": {
        "label": "Sekundarna barva"
      },
      "customCss": {
        "description": "Dadatno prilagodite pogled s CSS. Priporočljivo le za izkušene uporabnike"
      },
      "name": {
        "label": "Ime"
      },
      "isPublic": {
        "label": "Javna stran"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Splošno"
        },
        "layout": {
          "title": "Postavitev"
        },
        "background": {
          "title": "Ozadje"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Ogled tablice"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Nevarno območje",
          "action": {
            "delete": {
              "confirm": {
                "title": "Izbriši tablo"
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
        "home": "Domov",
        "boards": "Deske",
        "apps": "Aplikacije",
        "users": {
          "label": "Uporabniki",
          "items": {
            "manage": "Upravljanje",
            "invites": "Vabi"
          }
        },
        "tools": {
          "label": "Orodja",
          "items": {
            "docker": "Docker",
            "api": ""
          }
        },
        "settings": "Nastavitve",
        "help": {
          "label": "Pomoč",
          "items": {
            "documentation": "Dokumentacija",
            "discord": "Skupnost Discord"
          }
        },
        "about": "O programu"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Deske",
          "user": "Uporabniki",
          "invite": "Vabi",
          "app": "Aplikacije"
        },
        "statisticLabel": {
          "boards": "Deske"
        }
      },
      "board": {
        "title": "Vaše table",
        "action": {
          "settings": {
            "label": "Nastavitve"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Domov"
            }
          },
          "delete": {
            "label": "Trajno izbriši",
            "confirm": {
              "title": "Izbriši tablo"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Ime"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Splošno",
            "item": {
              "firstDayOfWeek": "Prvi dan v tednu",
              "accessibility": "Dostopnost"
            }
          },
          "security": {
            "title": "Varnost"
          },
          "board": {
            "title": "Deske"
          }
        },
        "list": {
          "metaTitle": "Upravljanje uporabnikov",
          "title": "Uporabniki"
        },
        "create": {
          "metaTitle": "Ustvari uporabnika",
          "step": {
            "security": {
              "label": "Varnost"
            }
          }
        },
        "invite": {
          "title": "Upravljanje povabil uporabnikov",
          "action": {
            "new": {
              "description": "Po izteku veljavnosti vabilo ne bo več veljavno in prejemnik vabila ne bo mogel ustvariti računa."
            },
            "copy": {
              "link": "Povezava na vabilo"
            },
            "delete": {
              "title": "Brisanje povabila",
              "description": "Ali ste prepričani, da želite izbrisati to vabilo? Uporabniki s to povezavo ne bodo mogli več ustvariti računa z uporabo te povezave."
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "Ustvarjalec"
            },
            "expirationDate": {
              "label": "Datum izteka veljavnosti"
            },
            "token": {
              "label": "Žeton"
            }
          }
        }
      },
      "group": {
        "setting": {
          "general": {
            "title": "Splošno"
          }
        }
      },
      "settings": {
        "title": "Nastavitve"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Se izvaja",
            "error": "Napaka"
          },
          "job": {
            "mediaServer": {
              "label": "Predstavnostni strežnik"
            },
            "mediaRequests": {
              "label": "Zahteve za medije"
            }
          }
        },
        "api": {
          "title": "",
          "tab": {
            "documentation": {
              "label": "Dokumentacija"
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
    "title": "",
    "field": {
      "name": {
        "label": "Ime"
      },
      "state": {
        "label": "Stanje",
        "option": {
          "created": "Ustvarjeno",
          "running": "Se izvaja",
          "paused": "Začasno ustavljeno",
          "restarting": "Ponovno zaganjam",
          "removing": "Odstranjujem"
        }
      },
      "containerImage": {
        "label": "Slika"
      },
      "ports": {
        "label": "Vrata"
      }
    },
    "action": {
      "start": {
        "label": "Zaženi"
      },
      "stop": {
        "label": "Ustavi"
      },
      "restart": {
        "label": "Ponovno zaženi"
      },
      "remove": {
        "label": "Odstrani"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Uporabniki"
    },
    "field": {
      "user": {
        "label": "Uporabnik"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Upravljanje",
      "boards": {
        "label": "Deske"
      },
      "integrations": {
        "edit": {
          "label": "Uredi"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Uredi"
        }
      },
      "apps": {
        "label": "Aplikacije",
        "edit": {
          "label": "Uredi"
        }
      },
      "users": {
        "label": "Uporabniki",
        "create": {
          "label": "Ustvarite spletno stran"
        },
        "general": "Splošno",
        "security": "Varnost",
        "board": "Deske",
        "invites": {
          "label": "Vabi"
        }
      },
      "tools": {
        "label": "Orodja",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Nastavitve"
      },
      "about": {
        "label": "O programu"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Aplikacije"
          },
          "board": {
            "title": "Deske"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Torrenti"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Pomoč",
            "option": {
              "documentation": {
                "label": "Dokumentacija"
              },
              "discord": {
                "label": "Skupnost Discord"
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
                "label": "Upravljanje uporabnikov"
              },
              "about": {
                "label": "O programu"
              },
              "preferences": {
                "label": "Vaše želje"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Uporabniki"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Ime"
        }
      }
    }
  }
} as const;