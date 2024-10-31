import "dayjs/locale/uk";
import dayjs from "dayjs";
dayjs.locale("uk");

export default {
  "user": {
    "title": "Користувачі",
    "name": "Користувач",
    "field": {
      "email": {
        "label": "Електронна пошта"
      },
      "username": {
        "label": "Логін"
      },
      "password": {
        "label": "Пароль",
        "requirement": {
          "lowercase": "Включає малу літеру",
          "uppercase": "Включає велику літеру",
          "number": "Включає кількість"
        }
      },
      "passwordConfirm": {
        "label": "Підтвердити пароль"
      }
    },
    "action": {
      "login": {
        "label": "Логін"
      },
      "register": {
        "label": "Створити обліковий запис",
        "notification": {
          "success": {
            "title": "Обліковий запис створено"
          }
        }
      },
      "create": "Створити користувача"
    }
  },
  "group": {
    "field": {
      "name": "Ім’я"
    },
    "permission": {
      "admin": {
        "title": ""
      },
      "board": {
        "title": "Дошки"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Додатки"
      }
    },
    "field": {
      "name": {
        "label": "Ім’я"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Ім’я"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Неправильна URL-адреса"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Логін"
        },
        "password": {
          "label": "Пароль",
          "newLabel": ""
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Ім’я",
      "size": "Розмір",
      "creator": "Творець"
    }
  },
  "common": {
    "error": "Помилка",
    "action": {
      "add": "Додати",
      "apply": "",
      "create": "Створити",
      "edit": "Редагувати",
      "insert": "",
      "remove": "Видалити",
      "save": "Зберегти",
      "saveChanges": "Зберегти зміни",
      "cancel": "Скасувати",
      "delete": "Видалити",
      "confirm": "Підтвердити",
      "previous": "Попередній",
      "next": "Далі",
      "tryAgain": "Повторіть спробу"
    },
    "information": {
      "hours": "",
      "minutes": ""
    },
    "userAvatar": {
      "menu": {
        "preferences": "Ваші уподобання",
        "login": "Логін"
      }
    },
    "dangerZone": "Небезпечна зона",
    "noResults": "Результатів не знайдено",
    "zod": {
      "errors": {
        "default": "Це поле є недійсним",
        "required": "Це поле обов'язкове для заповнення"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Ім’я"
        }
      },
      "action": {
        "moveUp": "Рухайся.",
        "moveDown": "Вниз."
      },
      "menu": {
        "label": {
          "changePosition": "Змінити положення"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Налаштування"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Ширина"
        },
        "height": {
          "label": "Висота"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Відкрити в новій вкладці"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Макет",
          "option": {
            "row": {
              "label": "Горизонтальний"
            },
            "column": {
              "label": "Вертикальний"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "",
        "adsBlockedTodayPercentage": "",
        "dnsQueriesToday": "Запити за сьогодні"
      }
    },
    "dnsHoleControls": {
      "description": "Керуйте PiHole або AdGuard за допомогою головної панелі",
      "option": {
        "layout": {
          "label": "Макет",
          "option": {
            "row": {
              "label": "Горизонтальний"
            },
            "column": {
              "label": "Вертикальний"
            }
          }
        }
      },
      "controls": {
        "set": "",
        "enabled": "Увімкнено",
        "disabled": "Вимкнено",
        "hours": "",
        "minutes": ""
      }
    },
    "clock": {
      "description": "Відображає поточну дату і час.",
      "option": {
        "timezone": {
          "label": ""
        }
      }
    },
    "notebook": {
      "name": "Блокнот",
      "option": {
        "showToolbar": {
          "label": "Показати панель інструментів для написання націнки"
        },
        "allowReadOnlyCheck": {
          "label": ""
        },
        "content": {
          "label": "Зміст зошита"
        }
      },
      "controls": {
        "bold": "",
        "italic": "",
        "strikethrough": "",
        "underline": "",
        "colorText": "",
        "colorHighlight": "",
        "code": "",
        "clear": "",
        "blockquote": "",
        "horizontalLine": "",
        "bulletList": "",
        "orderedList": "",
        "checkList": "",
        "increaseIndent": "",
        "decreaseIndent": "",
        "link": "",
        "unlink": "",
        "image": "",
        "addTable": "",
        "deleteTable": "",
        "colorCell": "",
        "mergeCell": "",
        "addColumnLeft": "",
        "addColumnRight": "",
        "deleteColumn": "",
        "addRowTop": "",
        "addRowBelow": "",
        "deleteRow": ""
      },
      "align": {
        "left": "Ліворуч.",
        "center": "",
        "right": "Так."
      },
      "popover": {
        "clearColor": "",
        "source": "",
        "widthPlaceholder": "",
        "columns": "",
        "rows": "",
        "width": "Ширина",
        "height": "Висота"
      }
    },
    "iframe": {
      "name": "IFrame",
      "description": "Вставити будь-який контент з інтернету. Деякі вебсайти можуть обмежувати доступ.",
      "option": {
        "embedUrl": {
          "label": "Вставити URL"
        },
        "allowFullScreen": {
          "label": "Дозволити повноекранний режим"
        },
        "allowTransparency": {
          "label": "Забезпечити прозорість"
        },
        "allowScrolling": {
          "label": "Дозволити прокрутку"
        },
        "allowPayment": {
          "label": "Дозволити платіж"
        },
        "allowAutoPlay": {
          "label": "Увімкнути автоматичне відтворення"
        },
        "allowMicrophone": {
          "label": "Увімкнути мікрофон"
        },
        "allowCamera": {
          "label": "Увімкнути камеру"
        },
        "allowGeolocation": {
          "label": "Дозволити геолокацію"
        }
      },
      "error": {
        "noBrowerSupport": "Ваш браузер не підтримує iframe. Будь ласка, оновіть свій браузер."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": ""
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": ""
        },
        "automationId": {
          "label": ""
        }
      }
    },
    "calendar": {
      "name": "Календар",
      "option": {
        "releaseType": {
          "label": "Radarr - тип релізів"
        }
      }
    },
    "weather": {
      "name": "Погода",
      "description": "Показує поточну інформацію про погоду в заданому місці.",
      "option": {
        "location": {
          "label": "Погодна локація"
        }
      },
      "kind": {
        "clear": "Ясно",
        "mainlyClear": "Здебільшого ясно",
        "fog": "Туман",
        "drizzle": "Дрібний дощ",
        "freezingDrizzle": "Дрібний дощ, можливе утворення ожеледиці",
        "rain": "Дощ",
        "freezingRain": "Крижаний дощ",
        "snowFall": "Снігопад",
        "snowGrains": "Сніжинки",
        "rainShowers": "Злива",
        "snowShowers": "Заметіль",
        "thunderstorm": "Гроза",
        "thunderstormWithHail": "Гроза з градом",
        "unknown": "Невідомо"
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
        "search": "Пошук",
        "table": {
          "header": {},
          "population": {
            "fallback": "Невідомо"
          }
        }
      }
    },
    "video": {
      "name": "Потокова трансляція відео",
      "description": "Вставте відеопотік чи відео з камери або вебсайту",
      "option": {
        "feedUrl": {
          "label": "URL-адреса стрічки"
        },
        "hasAutoPlay": {
          "label": "Автовідтворення"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": ""
        },
        "downSpeed": {
          "columnTitle": "Завантаження",
          "detailsTitle": "Швидкість завантаження"
        },
        "integration": {
          "columnTitle": "Інтеграція"
        },
        "progress": {
          "columnTitle": "Прогрес"
        },
        "ratio": {
          "columnTitle": ""
        },
        "state": {
          "columnTitle": "Стан"
        },
        "upSpeed": {
          "columnTitle": "Віддача"
        }
      },
      "states": {
        "downloading": "",
        "queued": "",
        "paused": "Призупинено",
        "completed": "Завершено",
        "unknown": "Невідомо"
      }
    },
    "mediaRequests-requestList": {
      "description": "Перегляньте список усіх медіазапитів від ваших Overseerr або Jellyseerr",
      "option": {
        "linksTargetNewTab": {
          "label": "Відкрийте посилання в новій вкладці"
        }
      },
      "availability": {
        "unknown": "Невідомо",
        "partiallyAvailable": "",
        "available": ""
      }
    },
    "mediaRequests-requestStats": {
      "description": "Статистика ваших запитів у медіа",
      "titles": {
        "stats": {
          "main": "Медіа-статистика",
          "approved": "Вже затверджено",
          "pending": "Очікує схвалення",
          "tv": "Запити на ТБ",
          "movie": "Запити на фільми",
          "total": "Всього"
        },
        "users": {
          "main": "Найкращі користувачі"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Додатки"
          },
          "screenSize": {
            "option": {
              "sm": "Малий",
              "md": "Середній",
              "lg": "Великий"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": ""
      },
      "backgroundImageSize": {
        "label": ""
      },
      "primaryColor": {
        "label": "Основний колір"
      },
      "secondaryColor": {
        "label": "Вторинний колір"
      },
      "customCss": {
        "description": "Крім того, налаштуйте дашборд за допомогою CSS, що рекомендується лише досвідченим користувачам"
      },
      "name": {
        "label": "Ім’я"
      },
      "isPublic": {
        "label": "Публічний"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Загальне"
        },
        "layout": {
          "title": "Макет"
        },
        "background": {
          "title": "Фон"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Дошка оголошень"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Небезпечна зона",
          "action": {
            "delete": {
              "confirm": {
                "title": "Видалити дошку"
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
        "home": "Головна",
        "boards": "Дошки",
        "apps": "Додатки",
        "users": {
          "label": "Користувачі",
          "items": {
            "manage": "Керувати",
            "invites": "Запрошує"
          }
        },
        "tools": {
          "label": "Інструменти",
          "items": {
            "docker": "Docker",
            "api": ""
          }
        },
        "settings": "Налаштування",
        "help": {
          "label": "Допоможіть!",
          "items": {
            "documentation": "Документація",
            "discord": "Розбрат у громаді"
          }
        },
        "about": "Про програму"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Дошки",
          "user": "Користувачі",
          "invite": "Запрошує",
          "app": "Додатки"
        },
        "statisticLabel": {
          "boards": "Дошки"
        }
      },
      "board": {
        "title": "Твої дошки",
        "action": {
          "settings": {
            "label": "Налаштування"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Головна"
            }
          },
          "delete": {
            "label": "Видалити назавжди",
            "confirm": {
              "title": "Видалити дошку"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Ім’я"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Загальне",
            "item": {
              "firstDayOfWeek": "Перший день тижня",
              "accessibility": "Доступність"
            }
          },
          "security": {
            "title": ""
          },
          "board": {
            "title": "Дошки"
          }
        },
        "list": {
          "metaTitle": "Керування користувачами",
          "title": "Користувачі"
        },
        "create": {
          "metaTitle": "Створити користувача",
          "step": {
            "security": {
              "label": ""
            }
          }
        },
        "invite": {
          "title": "Керування запрошеннями користувачів",
          "action": {
            "new": {
              "description": "Після закінчення терміну дії запрошення буде недійсним, і одержувач запрошення не зможе створити обліковий запис."
            },
            "copy": {
              "link": "Посилання на запрошення"
            },
            "delete": {
              "title": "Видалити запрошення",
              "description": "Ви впевнені, що хочете видалити це запрошення? Користувачі з цим посиланням більше не зможуть створити обліковий запис за цим посиланням."
            }
          },
          "field": {
            "id": {
              "label": "ІДЕНТИФІКАТОР"
            },
            "creator": {
              "label": "Творець"
            },
            "expirationDate": {
              "label": "Термін придатності"
            },
            "token": {
              "label": "Токен."
            }
          }
        }
      },
      "group": {
        "setting": {
          "general": {
            "title": "Загальне"
          }
        }
      },
      "settings": {
        "title": "Налаштування"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Запущено",
            "error": "Помилка"
          },
          "job": {
            "mediaServer": {
              "label": "Медіа сервер"
            },
            "mediaRequests": {
              "label": "Медіа запити"
            }
          }
        },
        "api": {
          "title": "",
          "tab": {
            "documentation": {
              "label": "Документація"
            },
            "apiKey": {
              "table": {
                "header": {
                  "id": "ІДЕНТИФІКАТОР"
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
        "label": "Ім’я"
      },
      "state": {
        "label": "Стан",
        "option": {
          "created": "Створено",
          "running": "Запущено",
          "paused": "Призупинено",
          "restarting": "Перезапуск",
          "removing": "Видалення"
        }
      },
      "containerImage": {
        "label": "Образ"
      },
      "ports": {
        "label": "Порти"
      }
    },
    "action": {
      "start": {
        "label": "Пуск"
      },
      "stop": {
        "label": "Зупинити"
      },
      "restart": {
        "label": "Перезапустити"
      },
      "remove": {
        "label": "Видалити"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Користувачі"
    },
    "field": {
      "user": {
        "label": "Користувач"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Керувати",
      "boards": {
        "label": "Дошки"
      },
      "integrations": {
        "edit": {
          "label": "Редагувати"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Редагувати"
        }
      },
      "apps": {
        "label": "Додатки",
        "edit": {
          "label": "Редагувати"
        }
      },
      "users": {
        "label": "Користувачі",
        "create": {
          "label": "Створити"
        },
        "general": "Загальне",
        "security": "",
        "board": "Дошки",
        "invites": {
          "label": "Запрошує"
        }
      },
      "tools": {
        "label": "Інструменти",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Налаштування"
      },
      "about": {
        "label": "Про програму"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Додатки"
          },
          "board": {
            "title": "Дошки"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Torrent"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Допоможіть!",
            "option": {
              "documentation": {
                "label": "Документація"
              },
              "discord": {
                "label": "Розбрат у громаді"
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
                "label": "Керування користувачами"
              },
              "about": {
                "label": "Про програму"
              },
              "preferences": {
                "label": "Ваші уподобання"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Користувачі"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Ім’я"
        }
      }
    }
  }
} as const;