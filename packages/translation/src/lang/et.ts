import "dayjs/locale/et";
import dayjs from "dayjs";
dayjs.locale("et");

export default {
  "user": {
    "title": "",
    "name": "",
    "field": {
      "email": {
        "label": ""
      },
      "username": {
        "label": ""
      },
      "password": {
        "label": "",
        "requirement": {}
      },
      "passwordConfirm": {
        "label": ""
      }
    },
    "action": {
      "login": {
        "label": ""
      },
      "register": {
        "label": "",
        "notification": {
          "success": {
            "title": ""
          }
        }
      },
      "create": ""
    }
  },
  "group": {
    "field": {
      "name": ""
    },
    "permission": {
      "admin": {
        "title": ""
      },
      "board": {
        "title": ""
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": ""
      }
    },
    "field": {
      "name": {
        "label": ""
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": ""
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": ""
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": ""
        },
        "password": {
          "label": "",
          "newLabel": ""
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "",
      "size": "",
      "creator": ""
    }
  },
  "common": {
    "error": "",
    "action": {
      "add": "",
      "apply": "",
      "create": "",
      "edit": "",
      "insert": "",
      "remove": "",
      "save": "",
      "saveChanges": "",
      "cancel": "",
      "delete": "",
      "confirm": "",
      "previous": "",
      "next": "",
      "tryAgain": ""
    },
    "information": {
      "hours": "",
      "minutes": ""
    },
    "userAvatar": {
      "menu": {
        "preferences": "Teie eelistused",
        "login": ""
      }
    },
    "dangerZone": "",
    "noResults": "",
    "zod": {
      "errors": {
        "default": "",
        "required": ""
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": ""
        }
      },
      "action": {
        "moveUp": "",
        "moveDown": ""
      },
      "menu": {
        "label": {
          "changePosition": ""
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": ""
      }
    },
    "moveResize": {
      "field": {
        "width": {},
        "height": {}
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": ""
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "",
          "option": {
            "row": {
              "label": ""
            },
            "column": {
              "label": ""
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "",
        "adsBlockedTodayPercentage": "",
        "dnsQueriesToday": ""
      }
    },
    "dnsHoleControls": {
      "description": "",
      "option": {
        "layout": {
          "label": "",
          "option": {
            "row": {
              "label": ""
            },
            "column": {
              "label": ""
            }
          }
        }
      },
      "controls": {
        "set": "",
        "enabled": "",
        "disabled": "",
        "hours": "",
        "minutes": ""
      }
    },
    "clock": {
      "description": "",
      "option": {
        "timezone": {
          "label": ""
        }
      }
    },
    "notebook": {
      "name": "",
      "option": {
        "showToolbar": {
          "label": ""
        },
        "allowReadOnlyCheck": {
          "label": ""
        },
        "content": {
          "label": ""
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
        "left": "",
        "center": "",
        "right": ""
      },
      "popover": {
        "clearColor": "",
        "source": "",
        "widthPlaceholder": "",
        "columns": "",
        "rows": ""
      }
    },
    "iframe": {
      "name": "",
      "description": "",
      "option": {
        "embedUrl": {
          "label": ""
        },
        "allowFullScreen": {
          "label": ""
        },
        "allowTransparency": {
          "label": ""
        },
        "allowScrolling": {
          "label": ""
        },
        "allowPayment": {
          "label": ""
        },
        "allowAutoPlay": {
          "label": ""
        },
        "allowMicrophone": {
          "label": ""
        },
        "allowCamera": {
          "label": ""
        },
        "allowGeolocation": {
          "label": ""
        }
      },
      "error": {
        "noBrowerSupport": ""
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
      "name": "",
      "option": {
        "releaseType": {
          "label": ""
        }
      }
    },
    "weather": {
      "name": "",
      "description": "",
      "option": {
        "location": {
          "label": ""
        }
      },
      "kind": {
        "clear": "",
        "mainlyClear": "",
        "fog": "",
        "drizzle": "",
        "freezingDrizzle": "",
        "rain": "",
        "freezingRain": "",
        "snowFall": "",
        "snowGrains": "",
        "rainShowers": "",
        "snowShowers": "",
        "thunderstorm": "",
        "thunderstormWithHail": "",
        "unknown": ""
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
        "search": "",
        "table": {
          "header": {},
          "population": {
            "fallback": ""
          }
        }
      }
    },
    "video": {
      "name": "",
      "description": "",
      "option": {
        "feedUrl": {
          "label": ""
        },
        "hasAutoPlay": {
          "label": ""
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": ""
        },
        "downSpeed": {
          "columnTitle": "",
          "detailsTitle": ""
        },
        "integration": {
          "columnTitle": ""
        },
        "progress": {
          "columnTitle": ""
        },
        "ratio": {
          "columnTitle": ""
        },
        "state": {
          "columnTitle": ""
        },
        "upSpeed": {
          "columnTitle": ""
        }
      },
      "states": {
        "downloading": "",
        "queued": "",
        "paused": "",
        "completed": "",
        "unknown": ""
      }
    },
    "mediaRequests-requestList": {
      "description": "",
      "option": {
        "linksTargetNewTab": {
          "label": ""
        }
      },
      "availability": {
        "unknown": "",
        "partiallyAvailable": "",
        "available": ""
      }
    },
    "mediaRequests-requestStats": {
      "description": "",
      "titles": {
        "stats": {
          "main": "",
          "approved": "",
          "pending": "",
          "tv": "",
          "movie": "",
          "total": ""
        },
        "users": {
          "main": ""
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": ""
          },
          "screenSize": {
            "option": {
              "sm": "",
              "md": "",
              "lg": ""
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
        "label": ""
      },
      "secondaryColor": {
        "label": ""
      },
      "customCss": {
        "description": ""
      },
      "name": {
        "label": ""
      },
      "isPublic": {
        "label": ""
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": ""
        },
        "layout": {
          "title": ""
        },
        "background": {
          "title": ""
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": ""
              }
            }
          }
        },
        "dangerZone": {
          "title": "",
          "action": {
            "delete": {
              "confirm": {
                "title": ""
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
        "home": "",
        "boards": "",
        "apps": "",
        "users": {
          "label": "",
          "items": {
            "manage": "",
            "invites": ""
          }
        },
        "tools": {
          "label": "",
          "items": {
            "docker": "",
            "api": ""
          }
        },
        "settings": "",
        "help": {
          "label": "",
          "items": {
            "documentation": "",
            "discord": ""
          }
        },
        "about": ""
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "",
          "user": "",
          "invite": "",
          "app": ""
        },
        "statisticLabel": {
          "boards": ""
        }
      },
      "board": {
        "title": "",
        "action": {
          "settings": {
            "label": ""
          },
          "setHomeBoard": {
            "badge": {
              "label": ""
            }
          },
          "delete": {
            "label": "",
            "confirm": {
              "title": ""
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": ""
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "",
            "item": {
              "firstDayOfWeek": "",
              "accessibility": ""
            }
          },
          "security": {
            "title": ""
          },
          "board": {
            "title": ""
          }
        },
        "list": {
          "metaTitle": "",
          "title": ""
        },
        "create": {
          "metaTitle": "",
          "step": {
            "security": {
              "label": ""
            }
          }
        },
        "invite": {
          "title": "",
          "action": {
            "new": {
              "description": ""
            },
            "copy": {
              "link": ""
            },
            "delete": {
              "title": "",
              "description": ""
            }
          },
          "field": {
            "id": {
              "label": ""
            },
            "creator": {
              "label": ""
            },
            "expirationDate": {
              "label": ""
            },
            "token": {
              "label": ""
            }
          }
        }
      },
      "group": {
        "setting": {
          "general": {
            "title": ""
          }
        }
      },
      "settings": {
        "title": ""
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "",
            "error": ""
          },
          "job": {
            "mediaServer": {
              "label": ""
            },
            "mediaRequests": {
              "label": ""
            }
          }
        },
        "api": {
          "title": "",
          "tab": {
            "documentation": {
              "label": ""
            },
            "apiKey": {
              "table": {
                "header": {
                  "id": ""
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
        "label": ""
      },
      "state": {
        "label": "",
        "option": {
          "created": "",
          "running": "",
          "paused": "",
          "restarting": "",
          "removing": ""
        }
      },
      "containerImage": {
        "label": ""
      },
      "ports": {
        "label": ""
      }
    },
    "action": {
      "start": {
        "label": ""
      },
      "stop": {
        "label": ""
      },
      "restart": {
        "label": ""
      },
      "remove": {
        "label": ""
      }
    }
  },
  "permission": {
    "tab": {
      "user": ""
    },
    "field": {
      "user": {
        "label": ""
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "",
      "boards": {
        "label": ""
      },
      "integrations": {
        "edit": {
          "label": ""
        }
      },
      "search-engines": {
        "edit": {
          "label": ""
        }
      },
      "apps": {
        "label": "",
        "edit": {
          "label": ""
        }
      },
      "users": {
        "label": "",
        "create": {
          "label": ""
        },
        "general": "",
        "security": "",
        "board": "",
        "invites": {
          "label": ""
        }
      },
      "tools": {
        "label": "",
        "docker": {
          "label": ""
        }
      },
      "settings": {
        "label": ""
      },
      "about": {
        "label": ""
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": ""
          },
          "board": {
            "title": ""
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": ""
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "",
            "option": {
              "documentation": {
                "label": ""
              },
              "discord": {
                "label": ""
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
                "label": ""
              },
              "about": {
                "label": ""
              },
              "preferences": {
                "label": "Teie eelistused"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": ""
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": ""
        }
      }
    }
  }
} as const;