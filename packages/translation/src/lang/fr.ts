import "dayjs/locale/fr";
import dayjs from "dayjs";
dayjs.locale("fr");

export default {
  "user": {
    "title": "Utilisateurs",
    "name": "Utilisateur",
    "field": {
      "email": {
        "label": "Courriel"
      },
      "username": {
        "label": "Nom d'utilisateur"
      },
      "password": {
        "label": "Mot de passe",
        "requirement": {
          "lowercase": "Inclut une lettre minuscule",
          "uppercase": "Inclut une lettre majuscule",
          "number": "Inclut un nombre"
        }
      },
      "passwordConfirm": {
        "label": "Confirmation du mot de passe"
      }
    },
    "action": {
      "login": {
        "label": "Connexion"
      },
      "register": {
        "label": "Créer un compte",
        "notification": {
          "success": {
            "title": "Compte créé"
          }
        }
      },
      "create": "Créer un utilisateur"
    }
  },
  "group": {
    "field": {
      "name": "Nom"
    },
    "permission": {
      "admin": {
        "title": "Admin"
      },
      "board": {
        "title": "Tableaux de bord"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Applications"
      }
    },
    "field": {
      "name": {
        "label": "Nom"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Nom"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "URL invalide"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Nom d'utilisateur"
        },
        "password": {
          "label": "Mot de passe",
          "newLabel": "Nouveau mot de passe"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Nom",
      "size": "Taille",
      "creator": "Créé par"
    }
  },
  "common": {
    "error": "Erreur",
    "action": {
      "add": "Ajouter",
      "apply": "Appliquer",
      "create": "Créer",
      "edit": "Modifier",
      "insert": "Insérer",
      "remove": "Supprimer",
      "save": "Sauvegarder",
      "saveChanges": "Sauvegarder les modifications",
      "cancel": "Annuler",
      "delete": "Supprimer",
      "confirm": "Confirmer",
      "previous": "Précédent",
      "next": "Suivant",
      "tryAgain": "Réessayer"
    },
    "information": {
      "hours": "Heures",
      "minutes": "Minutes"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Vos préférences",
        "login": "Connexion"
      }
    },
    "dangerZone": "Zone de danger",
    "noResults": "Aucun résultat trouvé",
    "zod": {
      "errors": {
        "default": "Ce champ est invalide",
        "required": "Ce champ est requis"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Nom"
        }
      },
      "action": {
        "moveUp": "Monter",
        "moveDown": "Descendre"
      },
      "menu": {
        "label": {
          "changePosition": "Modifier la position"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Paramètres"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Largeur"
        },
        "height": {
          "label": "Hauteur"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Ouvrir dans un nouvel onglet"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Mise en page",
          "option": {
            "row": {
              "label": "Horizontale"
            },
            "column": {
              "label": "Verticale"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Bloqué aujourd'hui",
        "adsBlockedTodayPercentage": "Bloqué aujourd'hui",
        "dnsQueriesToday": "Requêtes aujourd'hui"
      }
    },
    "dnsHoleControls": {
      "description": "Contrôlez PiHole ou AdGuard depuis votre tableau de bord",
      "option": {
        "layout": {
          "label": "Mise en page",
          "option": {
            "row": {
              "label": "Horizontale"
            },
            "column": {
              "label": "Verticale"
            }
          }
        }
      },
      "controls": {
        "set": "Définir",
        "enabled": "Activé",
        "disabled": "Désactivé",
        "hours": "Heures",
        "minutes": "Minutes"
      }
    },
    "clock": {
      "description": "Affiche la date et l'heure courante.",
      "option": {
        "timezone": {
          "label": "Fuseau Horaire"
        }
      }
    },
    "notebook": {
      "name": "Bloc-notes",
      "option": {
        "showToolbar": {
          "label": "Afficher la barre d'outils pour vous aider à écrire du markdown"
        },
        "allowReadOnlyCheck": {
          "label": "Autoriser la coche des cases en mode lecture"
        },
        "content": {
          "label": "Le contenu du bloc-notes"
        }
      },
      "controls": {
        "bold": "Gras",
        "italic": "Italique",
        "strikethrough": "Barrer",
        "underline": "Souligner",
        "colorText": "Colorer le texte",
        "colorHighlight": "Surligner en couleur",
        "code": "Code",
        "clear": "Effacer la mise en forme",
        "blockquote": "Citation",
        "horizontalLine": "Ligne horizontale",
        "bulletList": "Liste à puces",
        "orderedList": "Liste numérotée",
        "checkList": "Liste à coche",
        "increaseIndent": "Augmenter l'Indentation",
        "decreaseIndent": "Diminuer l'indentation",
        "link": "Lien",
        "unlink": "Supprimer le lien",
        "image": "Intégrer une image",
        "addTable": "Ajouter un tableau",
        "deleteTable": "Supprimer le tableau",
        "colorCell": "Colorer la case",
        "mergeCell": "Activer/désactiver la fusion des cases",
        "addColumnLeft": "Ajouter une colonne avant",
        "addColumnRight": "Ajouter une colonne après",
        "deleteColumn": "Supprimer la colonne",
        "addRowTop": "Ajouter une ligne avant",
        "addRowBelow": "Ajouter une ligne après",
        "deleteRow": "Supprimer la ligne"
      },
      "align": {
        "left": "Gauche",
        "center": "Centrer",
        "right": "Droite"
      },
      "popover": {
        "clearColor": "Enlever la couleur",
        "source": "Source",
        "widthPlaceholder": "Valeur en % ou en pixels",
        "columns": "Colonnes",
        "rows": "Lignes",
        "width": "Largeur",
        "height": "Hauteur"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "Intégrer n'importe quel contenu à partir d'Internet. Certains sites Web peuvent restreindre l'accès.",
      "option": {
        "embedUrl": {
          "label": "URL intégrée"
        },
        "allowFullScreen": {
          "label": "Permettre le plein écran"
        },
        "allowTransparency": {
          "label": "Autoriser la transparence"
        },
        "allowScrolling": {
          "label": "Autoriser le défilement"
        },
        "allowPayment": {
          "label": "Autoriser le paiement"
        },
        "allowAutoPlay": {
          "label": "Autoriser la lecture automatique"
        },
        "allowMicrophone": {
          "label": "Autoriser l'utilisation du microphone"
        },
        "allowCamera": {
          "label": "Autoriser l'utilisation de la caméra"
        },
        "allowGeolocation": {
          "label": "Autoriser la géolocalisation"
        }
      },
      "error": {
        "noBrowerSupport": "Votre navigateur internet ne prend pas en charge les iframes. Merci de le mettre à jour."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "ID de l’entité"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Nom d'affichage"
        },
        "automationId": {
          "label": "ID de l'automatisation"
        }
      }
    },
    "calendar": {
      "name": "Calendrier",
      "option": {
        "releaseType": {
          "label": "Type de sortie Radarr"
        }
      }
    },
    "weather": {
      "name": "Météo",
      "description": "Affiche la météo actuelle d'un emplacement préconfiguré.",
      "option": {
        "location": {
          "label": "Lieu de la météo"
        }
      },
      "kind": {
        "clear": "Clair",
        "mainlyClear": "Principalement clair",
        "fog": "Brouillard",
        "drizzle": "Bruine",
        "freezingDrizzle": "Bruine glacée",
        "rain": "Pluie",
        "freezingRain": "Pluie verglaçante",
        "snowFall": "Chute de neige",
        "snowGrains": "Neige en grains",
        "rainShowers": "Averses de pluie",
        "snowShowers": "Averses de neige",
        "thunderstorm": "Orage",
        "thunderstormWithHail": "Orage avec grêle",
        "unknown": "Inconnu"
      }
    },
    "indexerManager": {
      "name": "Statut du gestionnaire d’indexeur",
      "title": "Gestionnaire d’indexeur",
      "testAll": "Tout tester"
    },
    "healthMonitoring": {
      "name": "Surveillance de l'état du système",
      "description": "Affiche des informations sur l'état et la santé de votre (vos) système(s).",
      "option": {
        "fahrenheit": {
          "label": "Température du processeur en Fahrenheit"
        },
        "cpu": {
          "label": "Afficher les infos du processeur"
        },
        "memory": {
          "label": "Afficher les infos de la mémoire"
        },
        "fileSystem": {
          "label": "Afficher les infos sur le système de fichiers"
        }
      },
      "popover": {
        "available": "Disponible"
      }
    },
    "common": {
      "location": {
        "search": "Rechercher",
        "table": {
          "header": {},
          "population": {
            "fallback": "Inconnu"
          }
        }
      }
    },
    "video": {
      "name": "Flux vidéo",
      "description": "Intégre un flux vidéo ou une vidéo provenant d'une caméra ou d'un site web",
      "option": {
        "feedUrl": {
          "label": "URL du flux"
        },
        "hasAutoPlay": {
          "label": "Lecture automatique"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Date d’ajout"
        },
        "downSpeed": {
          "columnTitle": "Descendant",
          "detailsTitle": "Vitesse de téléchargement"
        },
        "integration": {
          "columnTitle": "Intégration"
        },
        "progress": {
          "columnTitle": "Progrès"
        },
        "ratio": {
          "columnTitle": "Ratio"
        },
        "state": {
          "columnTitle": "État"
        },
        "upSpeed": {
          "columnTitle": "Montant"
        }
      },
      "states": {
        "downloading": "Téléchargement en cours",
        "queued": "En file d’attente",
        "paused": "En pause",
        "completed": "Complété",
        "unknown": "Inconnu"
      }
    },
    "mediaRequests-requestList": {
      "description": "Voir la liste de toutes les demandes de médias de votre instance Overseerr ou Jellyseerr",
      "option": {
        "linksTargetNewTab": {
          "label": "Ouvrir les liens dans un nouvel onglet"
        }
      },
      "availability": {
        "unknown": "Inconnu",
        "partiallyAvailable": "Partiel",
        "available": "Disponible"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Statistiques sur vos demandes de médias",
      "titles": {
        "stats": {
          "main": "Statistiques des médias",
          "approved": "Déjà approuvé",
          "pending": "En attente de validation",
          "tv": "Demandes de séries TV",
          "movie": "Demandes de films",
          "total": "Total"
        },
        "users": {
          "main": "Principaux utilisateurs"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Applications"
          },
          "screenSize": {
            "option": {
              "sm": "Petite",
              "md": "Moyenne",
              "lg": "Grande"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Pièce jointe de l'image d'arrière-plan"
      },
      "backgroundImageSize": {
        "label": "Taille de l'image d'arrière-plan"
      },
      "primaryColor": {
        "label": "Couleur principale"
      },
      "secondaryColor": {
        "label": "Couleur secondaire"
      },
      "customCss": {
        "description": "En outre, vous pouvez personnaliser votre tableau de bord à l'aide de CSS. Réservé aux utilisateurs expérimentés."
      },
      "name": {
        "label": "Nom"
      },
      "isPublic": {
        "label": "Public"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Général"
        },
        "layout": {
          "title": "Mise en page"
        },
        "background": {
          "title": "Fond"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Voir le tableau de bord"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Zone de danger",
          "action": {
            "delete": {
              "confirm": {
                "title": "Supprimer le tableau de bord"
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
        "home": "Accueil",
        "boards": "Tableaux de bord",
        "apps": "Applications",
        "users": {
          "label": "Utilisateurs",
          "items": {
            "manage": "Gérer",
            "invites": "Invitations"
          }
        },
        "tools": {
          "label": "Outils",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Paramètres",
        "help": {
          "label": "Aide",
          "items": {
            "documentation": "Documentation",
            "discord": "Communauté Discord"
          }
        },
        "about": "À propos"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Tableaux de bord",
          "user": "Utilisateurs",
          "invite": "Invitations",
          "app": "Applications"
        },
        "statisticLabel": {
          "boards": "Tableaux de bord"
        }
      },
      "board": {
        "title": "Vos tableaux de bord",
        "action": {
          "settings": {
            "label": "Paramètres"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Accueil"
            }
          },
          "delete": {
            "label": "Supprimer définitivement",
            "confirm": {
              "title": "Supprimer le tableau de bord"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Nom"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Général",
            "item": {
              "firstDayOfWeek": "Premier jour de la semaine",
              "accessibility": "Accessibilité"
            }
          },
          "security": {
            "title": "Sécurité"
          },
          "board": {
            "title": "Tableaux de bord"
          }
        },
        "list": {
          "metaTitle": "Gérer les utilisateurs",
          "title": "Utilisateurs"
        },
        "create": {
          "metaTitle": "Créer un utilisateur",
          "step": {
            "security": {
              "label": "Sécurité"
            }
          }
        },
        "invite": {
          "title": "Gérer les invitations des utilisateurs",
          "action": {
            "new": {
              "description": "Après expiration, une invitation ne sera plus valide et le destinataire de cette invitation ne pourra pas créer un compte."
            },
            "copy": {
              "link": "Lien d'invitation"
            },
            "delete": {
              "title": "Supprimer une invitation",
              "description": "Êtes-vous sûr de vouloir supprimer cette invitation ? Les utilisateurs avec ce lien ne pourront plus créer un compte avec ce dernier."
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "Créé par"
            },
            "expirationDate": {
              "label": "Date d'expiration"
            },
            "token": {
              "label": "Jeton"
            }
          }
        }
      },
      "group": {
        "setting": {
          "general": {
            "title": "Général"
          }
        }
      },
      "settings": {
        "title": "Paramètres"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Running",
            "error": "Erreur"
          },
          "job": {
            "mediaServer": {
              "label": "Serveur multimédia"
            },
            "mediaRequests": {
              "label": "Demandes de média"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Documentation"
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
    "title": "Conteneurs",
    "field": {
      "name": {
        "label": "Nom"
      },
      "state": {
        "label": "État",
        "option": {
          "created": "Créé",
          "running": "Running",
          "paused": "En pause",
          "restarting": "Redémarrage en cours",
          "removing": "Suppression en cours"
        }
      },
      "containerImage": {
        "label": "Image"
      },
      "ports": {
        "label": "Ports"
      }
    },
    "action": {
      "start": {
        "label": "Début"
      },
      "stop": {
        "label": "Stop"
      },
      "restart": {
        "label": "Redémarrer"
      },
      "remove": {
        "label": "Supprimer"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Utilisateurs"
    },
    "field": {
      "user": {
        "label": "Utilisateur"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Gérer",
      "boards": {
        "label": "Tableaux de bord"
      },
      "integrations": {
        "edit": {
          "label": "Modifier"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Modifier"
        }
      },
      "apps": {
        "label": "Applications",
        "edit": {
          "label": "Modifier"
        }
      },
      "users": {
        "label": "Utilisateurs",
        "create": {
          "label": "Créer"
        },
        "general": "Général",
        "security": "Sécurité",
        "board": "Tableaux de bord",
        "invites": {
          "label": "Invitations"
        }
      },
      "tools": {
        "label": "Outils",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Paramètres"
      },
      "about": {
        "label": "À propos"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Applications"
          },
          "board": {
            "title": "Tableaux de bord"
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
            "title": "Aide",
            "option": {
              "documentation": {
                "label": "Documentation"
              },
              "discord": {
                "label": "Communauté Discord"
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
                "label": "Gérer les utilisateurs"
              },
              "about": {
                "label": "À propos"
              },
              "preferences": {
                "label": "Vos préférences"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Utilisateurs"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Nom"
        }
      }
    }
  }
} as const;