import "dayjs/locale/el";
import dayjs from "dayjs";
dayjs.locale("el");

export default {
  "user": {
    "title": "Χρήστες",
    "name": "Χρήστης",
    "field": {
      "email": {
        "label": "E-Mail"
      },
      "username": {
        "label": "Όνομα Χρήστη"
      },
      "password": {
        "label": "Κωδικός",
        "requirement": {
          "lowercase": "Περιλαμβάνει πεζό γράμμα",
          "uppercase": "Περιλαμβάνει κεφαλαίο γράμμα",
          "number": "Περιλαμβάνει αριθμό"
        }
      },
      "passwordConfirm": {
        "label": "Επιβεβαίωση κωδικού"
      }
    },
    "action": {
      "login": {
        "label": "Σύνδεση"
      },
      "register": {
        "label": "Δημιουργία λογαριασμού",
        "notification": {
          "success": {
            "title": "Ο λογαριασμός δημιουργήθηκε"
          }
        }
      },
      "create": "Δημιουργία χρήστη"
    }
  },
  "group": {
    "field": {
      "name": "Όνομα"
    },
    "permission": {
      "admin": {
        "title": "Διαχειριστής"
      },
      "board": {
        "title": "Πίνακες"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Εφαρμογές"
      }
    },
    "field": {
      "name": {
        "label": "Όνομα"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Όνομα"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Μη Έγκυρος Σύνδεσμος"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Όνομα Χρήστη"
        },
        "password": {
          "label": "Κωδικός",
          "newLabel": "Νέος κωδικός"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Όνομα",
      "size": "Μέγεθος",
      "creator": "Δημιουργός"
    }
  },
  "common": {
    "error": "Σφάλμα",
    "action": {
      "add": "Προσθήκη",
      "apply": "Εφαρμογή",
      "create": "Δημιουργία",
      "edit": "Επεξεργασία",
      "insert": "Εισαγωγή",
      "remove": "Αφαίρεση",
      "save": "Αποθήκευση",
      "saveChanges": "Αποθήκευση αλλαγών",
      "cancel": "Ακύρωση",
      "delete": "Διαγραφή",
      "confirm": "Επιβεβαίωση",
      "previous": "Προηγούμενο",
      "next": "Επόμενο",
      "tryAgain": "Προσπαθήστε ξανά"
    },
    "information": {
      "hours": "Ώρες",
      "minutes": "Λεπτά"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Οι ρυθμίσεις σας",
        "login": "Σύνδεση"
      }
    },
    "dangerZone": "Επικίνδυνη Περιοχή",
    "noResults": "Δεν βρέθηκαν αποτελέσματα",
    "zod": {
      "errors": {
        "default": "Το πεδίο δεν είναι έγκυρο",
        "required": "Αυτό το πεδίο είναι υποχρεωτικό"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Όνομα"
        }
      },
      "action": {
        "moveUp": "Μετακίνηση επάνω",
        "moveDown": "Μετακίνηση κάτω"
      },
      "menu": {
        "label": {
          "changePosition": "Αλλαγή θέσης"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Ρυθμίσεις"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Πλάτος"
        },
        "height": {
          "label": "Ύψος"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Άνοιγμα σε νέα καρτέλα"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Διάταξη",
          "option": {
            "row": {
              "label": "Οριζόντια"
            },
            "column": {
              "label": "Κατακόρυφα"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Σημερινοί αποκλεισμοί",
        "adsBlockedTodayPercentage": "Σημερινοί αποκλεισμοί",
        "dnsQueriesToday": "Σημερινά queries"
      }
    },
    "dnsHoleControls": {
      "description": "Ελέγξτε το PiHole ή το AdGuard από το dashboard σας",
      "option": {
        "layout": {
          "label": "Διάταξη",
          "option": {
            "row": {
              "label": "Οριζόντια"
            },
            "column": {
              "label": "Κατακόρυφα"
            }
          }
        }
      },
      "controls": {
        "set": "Ορισμός",
        "enabled": "Ενεργοποιημένο",
        "disabled": "Απενεργοποιημένο",
        "hours": "Ώρες",
        "minutes": "Λεπτά"
      }
    },
    "clock": {
      "description": "Εμφανίζει την τρέχουσα ημερομηνία και ώρα.",
      "option": {
        "timezone": {
          "label": "Ζώνη ώρας"
        }
      }
    },
    "notebook": {
      "name": "Σημειωματάριο",
      "option": {
        "showToolbar": {
          "label": "Εμφάνιση γραμμής εργαλείων για να σας βοηθήσει να γράψετε σημάνσεις"
        },
        "allowReadOnlyCheck": {
          "label": "Να επιτρέπεται η επιλογή σε λειτουργία μόνο ανάγνωσης"
        },
        "content": {
          "label": "Το περιεχόμενο του σημειωματάριου"
        }
      },
      "controls": {
        "bold": "Έντονη γραφή",
        "italic": "Πλάγια γραφή",
        "strikethrough": "Διαγραμμισμένο Κείμενο",
        "underline": "Υπογραμμισμένο Κείμενο",
        "colorText": "Έγχρωμο κείμενο",
        "colorHighlight": "Έγχρωμο κείμενο επισήμανσης",
        "code": "Κωδικός",
        "clear": "Εκκαθάριση μορφοποίησης",
        "blockquote": "Μπλοκ κειμένου παράθεσης",
        "horizontalLine": "Οριζόντια γραμμή",
        "bulletList": "Λίστα με κουκκίδες",
        "orderedList": "Ταξινομημένη λίστα",
        "checkList": "Λίστα ελέγχου",
        "increaseIndent": "Αύξηση εσοχής",
        "decreaseIndent": "Μείωση εσοχής",
        "link": "Σύνδεσμος",
        "unlink": "Αφαίρεση συνδέσμου",
        "image": "Ενσωμάτωση εικόνας",
        "addTable": "Προσθήκη πίνακα",
        "deleteTable": "Διαγραφή πίνακα",
        "colorCell": "Χρώμα κελιού",
        "mergeCell": "Εναλλαγή συγχώνευσης κελιού",
        "addColumnLeft": "Προσθήκη στήλης πριν",
        "addColumnRight": "Προσθήκη στήλης μετά",
        "deleteColumn": "Διαγραφή στήλης",
        "addRowTop": "Προσθήκη γραμμής πριν",
        "addRowBelow": "Προσθήκη γραμμής μετά",
        "deleteRow": "Διαγραφή γραμμής"
      },
      "align": {
        "left": "Αριστερά",
        "center": "Κέντρο",
        "right": "Δεξιά"
      },
      "popover": {
        "clearColor": "Καθαρισμός χρώματος",
        "source": "Πηγή",
        "widthPlaceholder": "Τιμή σε % ή εικονοστοιχεία",
        "columns": "Στήλες",
        "rows": "Γραμμές",
        "width": "Πλάτος",
        "height": "Ύψος"
      }
    },
    "iframe": {
      "name": "iframe",
      "description": "Ενσωματώστε οποιοδήποτε περιεχόμενο από το διαδίκτυο. Ορισμένοι ιστότοποι ενδέχεται να περιορίζουν την πρόσβαση.",
      "option": {
        "embedUrl": {
          "label": "URL ενσωμάτωσης"
        },
        "allowFullScreen": {
          "label": "Επιτρέψτε την πλήρη οθόνη"
        },
        "allowTransparency": {
          "label": "Να επιτρέπεται η διαφάνεια"
        },
        "allowScrolling": {
          "label": "Επιτρέπεται η κύλιση"
        },
        "allowPayment": {
          "label": "Επιτρέπονται πληρωμές"
        },
        "allowAutoPlay": {
          "label": "Επιτρέπεται η αυτόματη αναπαραγωγή"
        },
        "allowMicrophone": {
          "label": "Πρόσβαση στο μικρόφωνο"
        },
        "allowCamera": {
          "label": "Πρόσβαση στην κάμερα"
        },
        "allowGeolocation": {
          "label": "Επιτρέπεται ο γεωεντοπισμός"
        }
      },
      "error": {
        "noBrowerSupport": "Ο περιηγητής σας δεν υποστηρίζει iframes. Παρακαλούμε ενημερώστε το πρόγραμμα περιήγησης."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "Αναγνωριστικό οντότητας"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Εμφανιζόμενο όνομα"
        },
        "automationId": {
          "label": "Αναγνωριστικό αυτοματισμού"
        }
      }
    },
    "calendar": {
      "name": "Ημερολόγιο",
      "option": {
        "releaseType": {
          "label": "Τύπος κυκλοφορίας Radarr"
        }
      }
    },
    "weather": {
      "name": "Καιρός",
      "description": "Εμφανίζει τις τρέχουσες πληροφορίες καιρού μιας καθορισμένης τοποθεσίας.",
      "option": {
        "location": {
          "label": "Τοποθεσία καιρού"
        }
      },
      "kind": {
        "clear": "Καθαρός",
        "mainlyClear": "Κυρίως καθαρός",
        "fog": "Ομίχλη",
        "drizzle": "Ψιχάλες",
        "freezingDrizzle": "Παγωμένο ψιλόβροχο",
        "rain": "Βροχή",
        "freezingRain": "Παγωμένη βροχή",
        "snowFall": "Χιονόπτωση",
        "snowGrains": "Κόκκοι χιονιού",
        "rainShowers": "Βροχοπτώσεις",
        "snowShowers": "Χιονοπτώσεις",
        "thunderstorm": "Καταιγίδα",
        "thunderstormWithHail": "Καταιγίδα με χαλάζι",
        "unknown": "Άγνωστο"
      }
    },
    "indexerManager": {
      "name": "Κατάσταση διαχειριστή indexer",
      "title": "Διαχειριστής indexer",
      "testAll": "Δοκιμή όλων"
    },
    "healthMonitoring": {
      "name": "Παρακολούθηση της υγείας του συστήματος",
      "description": "Εμφανίζει πληροφορίες που δείχνουν την κατάσταση και την υγεία του/ων συστήματος/ων σας.",
      "option": {
        "fahrenheit": {
          "label": "Θερμοκρασία CPU σε Φαρενάιτ"
        },
        "cpu": {
          "label": "Εμφάνιση πληροφοριών επεξεργαστή"
        },
        "memory": {
          "label": "Εμφάνιση Πληροφοριών Μνήμης"
        },
        "fileSystem": {
          "label": "Εμφάνιση Πληροφοριών Συστήματος Αρχείων"
        }
      },
      "popover": {
        "available": "Διαθέσιμο"
      }
    },
    "common": {
      "location": {
        "search": "Αναζήτηση",
        "table": {
          "header": {},
          "population": {
            "fallback": "Άγνωστο"
          }
        }
      }
    },
    "video": {
      "name": "Ροή Βίντεο",
      "description": "Ενσωματώστε μια ροή βίντεο ή βίντεο από μια κάμερα ή έναν ιστότοπο",
      "option": {
        "feedUrl": {
          "label": "URL τροφοδοσίας"
        },
        "hasAutoPlay": {
          "label": "Αυτόματη αναπαραγωγή"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Ημερομηνία Προσθήκης"
        },
        "downSpeed": {
          "columnTitle": "Κάτω",
          "detailsTitle": "Ταχύτητα Λήψης"
        },
        "integration": {
          "columnTitle": "Ενσωμάτωση"
        },
        "progress": {
          "columnTitle": "Πρόοδος"
        },
        "ratio": {
          "columnTitle": "Αναλογία"
        },
        "state": {
          "columnTitle": "Κατάσταση"
        },
        "upSpeed": {
          "columnTitle": "Πάνω"
        }
      },
      "states": {
        "downloading": "Λήψη",
        "queued": "Στην ουρά",
        "paused": "Σε παύση",
        "completed": "Ολοκληρώθηκε",
        "unknown": "Άγνωστο"
      }
    },
    "mediaRequests-requestList": {
      "description": "Δείτε μια λίστα με όλα τα αιτήματα μέσων ενημέρωσης από την περίπτωση Overseerr ή Jellyseerr",
      "option": {
        "linksTargetNewTab": {
          "label": "Άνοιγμα συνδέσμων σε νέα καρτέλα"
        }
      },
      "availability": {
        "unknown": "Άγνωστο",
        "partiallyAvailable": "Μερικώς",
        "available": "Διαθέσιμο"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Στατιστικά στοιχεία σχετικά με τα αιτήματά σας για τα μέσα ενημέρωσης",
      "titles": {
        "stats": {
          "main": "Στατιστικά Πολυμέσων",
          "approved": "Ήδη εγκεκριμένα",
          "pending": "Εκκρεμείς εγκρίσεις",
          "tv": "Αιτήσεις TV",
          "movie": "Αιτήσεις ταινιών",
          "total": "Σύνολο"
        },
        "users": {
          "main": "Κορυφαίοι Χρήστες"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Εφαρμογές"
          },
          "screenSize": {
            "option": {
              "sm": "Μικρό",
              "md": "Μεσαίο",
              "lg": "Μεγάλο"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Συνημμένη εικόνα φόντου"
      },
      "backgroundImageSize": {
        "label": "Μέγεθος εικόνας φόντου"
      },
      "primaryColor": {
        "label": "Βασικό χρώμα"
      },
      "secondaryColor": {
        "label": "Δευτερεύον χρώμα"
      },
      "customCss": {
        "description": "Περαιτέρω, προσαρμόστε τον πίνακα ελέγχου σας χρησιμοποιώντας CSS, συνιστάται μόνο για έμπειρους χρήστες"
      },
      "name": {
        "label": "Όνομα"
      },
      "isPublic": {
        "label": "Δημόσιο"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Γενικά"
        },
        "layout": {
          "title": "Διάταξη"
        },
        "background": {
          "title": "Φόντο"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Προβολή πίνακα"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Επικίνδυνη Περιοχή",
          "action": {
            "delete": {
              "confirm": {
                "title": "Διαγραφή πίνακα"
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
        "home": "Αρχική",
        "boards": "Πίνακες",
        "apps": "Εφαρμογές",
        "users": {
          "label": "Χρήστες",
          "items": {
            "manage": "Διαχείριση",
            "invites": "Προσκλήσεις"
          }
        },
        "tools": {
          "label": "Εργαλεία",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Ρυθμίσεις",
        "help": {
          "label": "Βοήθεια",
          "items": {
            "documentation": "Τεκμηρίωση",
            "discord": "Κοινότητα Discord"
          }
        },
        "about": "Σχετικά"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Πίνακες",
          "user": "Χρήστες",
          "invite": "Προσκλήσεις",
          "app": "Εφαρμογές"
        },
        "statisticLabel": {
          "boards": "Πίνακες"
        }
      },
      "board": {
        "title": "Οι πίνακές σας",
        "action": {
          "settings": {
            "label": "Ρυθμίσεις"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Αρχική"
            }
          },
          "delete": {
            "label": "Οριστική διαγραφή",
            "confirm": {
              "title": "Διαγραφή πίνακα"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Όνομα"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Γενικά",
            "item": {
              "firstDayOfWeek": "Πρώτη ημέρα της εβδομάδας",
              "accessibility": "Προσβασιμότητα"
            }
          },
          "security": {
            "title": "Ασφάλεια"
          },
          "board": {
            "title": "Πίνακες"
          }
        },
        "list": {
          "metaTitle": "Διαχείριση χρηστών",
          "title": "Χρήστες"
        },
        "create": {
          "metaTitle": "Δημιουργία χρήστη",
          "step": {
            "security": {
              "label": "Ασφάλεια"
            }
          }
        },
        "invite": {
          "title": "Διαχείριση προσκλήσεων χρηστών",
          "action": {
            "new": {
              "description": "Μετά τη λήξη, μια πρόσκληση δε θα είναι πλέον έγκυρη και ο παραλήπτης της πρόσκλησης δε θα είναι σε θέση να δημιουργήσει λογαριασμό."
            },
            "copy": {
              "link": "Σύνδεσμος πρόσκλησης"
            },
            "delete": {
              "title": "Διαγραφή πρόσκλησης",
              "description": "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την πρόσκληση; Οι χρήστες με αυτόν τον σύνδεσμο δεν θα μπορούν πλέον να δημιουργήσουν λογαριασμό χρησιμοποιώντας αυτόν τον σύνδεσμο."
            }
          },
          "field": {
            "id": {
              "label": "Αναγνωριστικό (ID)"
            },
            "creator": {
              "label": "Δημιουργός"
            },
            "expirationDate": {
              "label": "Ημερομηνία λήξης"
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
            "title": "Γενικά"
          }
        }
      },
      "settings": {
        "title": "Ρυθμίσεις"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Εκτελείται",
            "error": "Σφάλμα"
          },
          "job": {
            "mediaServer": {
              "label": "Διακομιστής πολυμέσων"
            },
            "mediaRequests": {
              "label": "Αιτήματα μέσων ενημέρωσης"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Τεκμηρίωση"
            },
            "apiKey": {
              "table": {
                "header": {
                  "id": "Αναγνωριστικό (ID)"
                }
              }
            }
          }
        }
      }
    }
  },
  "docker": {
    "title": "Containers",
    "field": {
      "name": {
        "label": "Όνομα"
      },
      "state": {
        "label": "Κατάσταση",
        "option": {
          "created": "Δημιουργήθηκε",
          "running": "Εκτελείται",
          "paused": "Σε παύση",
          "restarting": "Γίνεται επανεκκίνηση",
          "removing": "Αφαιρείται"
        }
      },
      "containerImage": {
        "label": "Εικόνα"
      },
      "ports": {
        "label": "Θύρες"
      }
    },
    "action": {
      "start": {
        "label": "Έναρξη"
      },
      "stop": {
        "label": "Διακοπή"
      },
      "restart": {
        "label": "Επανεκκίνηση"
      },
      "remove": {
        "label": "Αφαίρεση"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Χρήστες"
    },
    "field": {
      "user": {
        "label": "Χρήστης"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Διαχείριση",
      "boards": {
        "label": "Πίνακες"
      },
      "integrations": {
        "edit": {
          "label": "Επεξεργασία"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Επεξεργασία"
        }
      },
      "apps": {
        "label": "Εφαρμογές",
        "edit": {
          "label": "Επεξεργασία"
        }
      },
      "users": {
        "label": "Χρήστες",
        "create": {
          "label": "Δημιουργία"
        },
        "general": "Γενικά",
        "security": "Ασφάλεια",
        "board": "Πίνακες",
        "invites": {
          "label": "Προσκλήσεις"
        }
      },
      "tools": {
        "label": "Εργαλεία",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Ρυθμίσεις"
      },
      "about": {
        "label": "Σχετικά"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Εφαρμογές"
          },
          "board": {
            "title": "Πίνακες"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Τόρρεντ"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Βοήθεια",
            "option": {
              "documentation": {
                "label": "Τεκμηρίωση"
              },
              "discord": {
                "label": "Κοινότητα Discord"
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
                "label": "Διαχείριση χρηστών"
              },
              "about": {
                "label": "Σχετικά"
              },
              "preferences": {
                "label": "Οι ρυθμίσεις σας"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Χρήστες"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Όνομα"
        }
      }
    }
  }
} as const;