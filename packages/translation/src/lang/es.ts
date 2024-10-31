import "dayjs/locale/es";
import dayjs from "dayjs";
dayjs.locale("es");

export default {
  "user": {
    "title": "Usuarios",
    "name": "Usuario",
    "field": {
      "email": {
        "label": "Correo electrónico"
      },
      "username": {
        "label": "Nombre de usuario"
      },
      "password": {
        "label": "Contraseña",
        "requirement": {
          "lowercase": "Incluye letra minúscula",
          "uppercase": "Incluye letra mayúscula",
          "number": "Incluye número"
        }
      },
      "passwordConfirm": {
        "label": "Confirmar contraseña"
      }
    },
    "action": {
      "login": {
        "label": "Iniciar sesión"
      },
      "register": {
        "label": "Crear cuenta",
        "notification": {
          "success": {
            "title": "Cuenta creada"
          }
        }
      },
      "create": "Crear usuario"
    }
  },
  "group": {
    "field": {
      "name": "Nombre"
    },
    "permission": {
      "admin": {
        "title": "Administrador"
      },
      "board": {
        "title": "Tableros"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Aplicaciones"
      }
    },
    "field": {
      "name": {
        "label": "Nombre"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Nombre"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "URL invalida"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Nombre de usuario"
        },
        "password": {
          "label": "Contraseña",
          "newLabel": "Nueva contraseña"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Nombre",
      "size": "Tamaño",
      "creator": "Creador"
    }
  },
  "common": {
    "error": "Error",
    "action": {
      "add": "Añadir",
      "apply": "Aplicar",
      "create": "Crear",
      "edit": "Editar",
      "insert": "Insertar",
      "remove": "Eliminar",
      "save": "Guardar",
      "saveChanges": "Guardar cambios",
      "cancel": "Cancelar",
      "delete": "Eliminar",
      "confirm": "Confirmar",
      "previous": "Anterior",
      "next": "Siguiente",
      "tryAgain": "Inténtalo de nuevo"
    },
    "information": {
      "hours": "",
      "minutes": ""
    },
    "userAvatar": {
      "menu": {
        "preferences": "Tus preferencias",
        "login": "Iniciar sesión"
      }
    },
    "dangerZone": "Zona de riesgo",
    "noResults": "No se han encontrado resultados",
    "zod": {
      "errors": {
        "default": "Este campo no es válido",
        "required": "Este campo es obligatorio"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Nombre"
        }
      },
      "action": {
        "moveUp": "Mover hacia arriba",
        "moveDown": "Mover hacia abajo"
      },
      "menu": {
        "label": {
          "changePosition": "Cambiar posición"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Ajustes"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Ancho"
        },
        "height": {
          "label": "Alto"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Abrir en una pestaña nueva"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Diseño",
          "option": {
            "row": {
              "label": "Horizontal"
            },
            "column": {
              "label": "Vertical"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Bloqueados hoy",
        "adsBlockedTodayPercentage": "Bloqueados hoy",
        "dnsQueriesToday": "Consultas de hoy"
      }
    },
    "dnsHoleControls": {
      "description": "Controla Pihole o AdGuard desde tu panel",
      "option": {
        "layout": {
          "label": "Diseño",
          "option": {
            "row": {
              "label": "Horizontal"
            },
            "column": {
              "label": "Vertical"
            }
          }
        }
      },
      "controls": {
        "set": "",
        "enabled": "Activado",
        "disabled": "Desactivado",
        "hours": "",
        "minutes": ""
      }
    },
    "clock": {
      "description": "Muestra la fecha y hora actual.",
      "option": {
        "timezone": {
          "label": "Zona horaria"
        }
      }
    },
    "notebook": {
      "name": "Bloc de notas",
      "option": {
        "showToolbar": {
          "label": "Muestra la barra de herramientas para ayudarte a escribir Markdown"
        },
        "allowReadOnlyCheck": {
          "label": "Permitir verificación en modo solo lectura"
        },
        "content": {
          "label": "El contenido del Bloc de notas"
        }
      },
      "controls": {
        "bold": "Negrita",
        "italic": "Cursiva",
        "strikethrough": "Tachado",
        "underline": "Subrayado",
        "colorText": "Color de texto",
        "colorHighlight": "Texto resaltado en color",
        "code": "Código",
        "clear": "Borrar formato",
        "blockquote": "Cita",
        "horizontalLine": "Línea horizontal",
        "bulletList": "Lista sin ordenar",
        "orderedList": "Lista ordenada",
        "checkList": "Lista de control",
        "increaseIndent": "Aumentar sangría",
        "decreaseIndent": "Disminuir sangría",
        "link": "Enlace",
        "unlink": "Eliminar enlace",
        "image": "Insertar imagen",
        "addTable": "Añadir tabla",
        "deleteTable": "Eliminar tabla",
        "colorCell": "Color de celda",
        "mergeCell": "Alternar combinación de celdas",
        "addColumnLeft": "Añadir columna a la izquierda",
        "addColumnRight": "Añadir columna a la derecha",
        "deleteColumn": "Eliminar columna",
        "addRowTop": "Añadir fila encima",
        "addRowBelow": "Añadir fila debajo",
        "deleteRow": "Eliminar fila"
      },
      "align": {
        "left": "Izquierda",
        "center": "Centrar",
        "right": "Derecha"
      },
      "popover": {
        "clearColor": "Eliminar color",
        "source": "Fuente",
        "widthPlaceholder": "Valor en % o píxeles",
        "columns": "Columnas",
        "rows": "Filas",
        "width": "Ancho",
        "height": "Alto"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "Incrusta cualquier contenido de Internet. Algunos sitios web pueden restringir el acceso.",
      "option": {
        "embedUrl": {
          "label": "URL incrustada"
        },
        "allowFullScreen": {
          "label": "Permitir pantalla completa"
        },
        "allowTransparency": {
          "label": "Permitir transparencia"
        },
        "allowScrolling": {
          "label": "Permitir desplazamiento"
        },
        "allowPayment": {
          "label": "Permitir pago"
        },
        "allowAutoPlay": {
          "label": "Permitir reproducción automática"
        },
        "allowMicrophone": {
          "label": "Permitir micrófono"
        },
        "allowCamera": {
          "label": "Permitir cámara"
        },
        "allowGeolocation": {
          "label": "Permitir geolocalización"
        }
      },
      "error": {
        "noBrowerSupport": "Tu navegador no soporta iframes. Por favor, actualice tu navegador."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "ID de la entidad"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Nombre a mostrar"
        },
        "automationId": {
          "label": "ID de automatización"
        }
      }
    },
    "calendar": {
      "name": "Calendario",
      "option": {
        "releaseType": {
          "label": "Tipo de lanzamiento de Radarr"
        }
      }
    },
    "weather": {
      "name": "El Tiempo",
      "description": "Muestra la información meteorológica actual de la ubicación establecida.",
      "option": {
        "location": {
          "label": "Ubicación"
        }
      },
      "kind": {
        "clear": "Despejado",
        "mainlyClear": "Mayormente despejado",
        "fog": "Niebla",
        "drizzle": "Llovizna",
        "freezingDrizzle": "Llovizna helada",
        "rain": "Lluvia",
        "freezingRain": "Lluvia helada",
        "snowFall": "Nevada",
        "snowGrains": "Granos de nieve",
        "rainShowers": "Chubascos",
        "snowShowers": "Chubascos de nieve",
        "thunderstorm": "Tormenta eléctrica",
        "thunderstormWithHail": "Tormenta con granizo",
        "unknown": "Desconocido"
      }
    },
    "indexerManager": {
      "name": "",
      "title": "",
      "testAll": ""
    },
    "healthMonitoring": {
      "name": "Monitorización de Salud del Sistema",
      "description": "Muestra información sobre la salud y el estado de tu(s) sistema(s).",
      "option": {
        "fahrenheit": {
          "label": "Temperatura de la CPU en grados Fahrenheit"
        },
        "cpu": {
          "label": "Mostrar información de la CPU"
        },
        "memory": {
          "label": "Mostrar información de la memoria"
        },
        "fileSystem": {
          "label": "Mostrar información del sistema de archivos"
        }
      },
      "popover": {
        "available": "Disponible"
      }
    },
    "common": {
      "location": {
        "search": "Buscar",
        "table": {
          "header": {},
          "population": {
            "fallback": "Desconocido"
          }
        }
      }
    },
    "video": {
      "name": "Video en directo",
      "description": "Incrusta una transmisión de video o un video de una cámara o un sitio web",
      "option": {
        "feedUrl": {
          "label": "Fuente URL"
        },
        "hasAutoPlay": {
          "label": "Auto-reproducción"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": ""
        },
        "downSpeed": {
          "columnTitle": "Descarga",
          "detailsTitle": "Velocidad de Descarga"
        },
        "integration": {
          "columnTitle": "Integración"
        },
        "progress": {
          "columnTitle": "Completado %"
        },
        "ratio": {
          "columnTitle": "Ratio"
        },
        "state": {
          "columnTitle": "Estado"
        },
        "upSpeed": {
          "columnTitle": "Subida"
        }
      },
      "states": {
        "downloading": "Descargando",
        "queued": "",
        "paused": "Pausado",
        "completed": "Completado",
        "unknown": "Desconocido"
      }
    },
    "mediaRequests-requestList": {
      "description": "Mostrar una lista de todas las solicitudes multimedia de tu instancia de Overseerr o Jellyseerr",
      "option": {
        "linksTargetNewTab": {
          "label": "Abrir enlaces en una pestaña nueva"
        }
      },
      "availability": {
        "unknown": "Desconocido",
        "partiallyAvailable": "Parcial",
        "available": "Disponible"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Estadísticas sobre tus solicitudes multimedia",
      "titles": {
        "stats": {
          "main": "Estadísticas Multimedia",
          "approved": "Ya aprobado",
          "pending": "Aprobaciones pendientes",
          "tv": "Solicitudes de TV",
          "movie": "Solicitudes de películas",
          "total": "Total"
        },
        "users": {
          "main": "Mejores usuarios"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Aplicaciones"
          },
          "screenSize": {
            "option": {
              "sm": "Pequeño",
              "md": "Mediano",
              "lg": "Grande"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Adjuntar imagen de fondo"
      },
      "backgroundImageSize": {
        "label": "Tamaño de la imagen de fondo"
      },
      "primaryColor": {
        "label": "Color primario"
      },
      "secondaryColor": {
        "label": "Color secundario"
      },
      "customCss": {
        "description": "Además, personaliza tu panel usando CSS, solo recomendado para usuarios avanzados"
      },
      "name": {
        "label": "Nombre"
      },
      "isPublic": {
        "label": "Pública"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "General"
        },
        "layout": {
          "title": "Diseño"
        },
        "background": {
          "title": "Fondo"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Ver tablero"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Zona de riesgo",
          "action": {
            "delete": {
              "confirm": {
                "title": "Eliminar tablero"
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
        "home": "Inicio",
        "boards": "Tableros",
        "apps": "Aplicaciones",
        "users": {
          "label": "Usuarios",
          "items": {
            "manage": "Administrar",
            "invites": "Invitaciones"
          }
        },
        "tools": {
          "label": "Herramientas",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Ajustes",
        "help": {
          "label": "Ayuda",
          "items": {
            "documentation": "Documentación",
            "discord": "Comunidad Discord"
          }
        },
        "about": "Acerca de"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Tableros",
          "user": "Usuarios",
          "invite": "Invitaciones",
          "app": "Aplicaciones"
        },
        "statisticLabel": {
          "boards": "Tableros"
        }
      },
      "board": {
        "title": "Tus tableros",
        "action": {
          "settings": {
            "label": "Ajustes"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Inicio"
            }
          },
          "delete": {
            "label": "Eliminar permanentemente",
            "confirm": {
              "title": "Eliminar tablero"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Nombre"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "General",
            "item": {
              "firstDayOfWeek": "Primer día de la semana",
              "accessibility": "Accesibilidad"
            }
          },
          "security": {
            "title": "Seguridad"
          },
          "board": {
            "title": "Tableros"
          }
        },
        "list": {
          "metaTitle": "Administrar usuarios",
          "title": "Usuarios"
        },
        "create": {
          "metaTitle": "Crear usuario",
          "step": {
            "security": {
              "label": "Seguridad"
            }
          }
        },
        "invite": {
          "title": "Administrar invitaciones de usuario",
          "action": {
            "new": {
              "description": "Después de la caducidad, una invitación ya no será válida y el destinatario de la invitación no podrá crear una cuenta."
            },
            "copy": {
              "link": "Link de invitación"
            },
            "delete": {
              "title": "Eliminar invitación",
              "description": "¿Estás seguro de que deseas eliminar esta invitación? Los usuarios con este enlace ya no podrán crear una cuenta usando ese enlace."
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "Creador"
            },
            "expirationDate": {
              "label": "Fecha de caducidad"
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
            "title": "General"
          }
        }
      },
      "settings": {
        "title": "Ajustes"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "En ejecución",
            "error": "Error"
          },
          "job": {
            "mediaServer": {
              "label": "Servidor Multimedia"
            },
            "mediaRequests": {
              "label": "Solicitudes multimedia"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Documentación"
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
        "label": "Nombre"
      },
      "state": {
        "label": "Estado",
        "option": {
          "created": "Creado",
          "running": "En ejecución",
          "paused": "Pausado",
          "restarting": "Reiniciando",
          "removing": "Eliminando"
        }
      },
      "containerImage": {
        "label": "Imagen"
      },
      "ports": {
        "label": "Puertos"
      }
    },
    "action": {
      "start": {
        "label": "Iniciar"
      },
      "stop": {
        "label": "Detener"
      },
      "restart": {
        "label": "Reiniciar"
      },
      "remove": {
        "label": "Eliminar"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Usuarios"
    },
    "field": {
      "user": {
        "label": "Usuario"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Administrar",
      "boards": {
        "label": "Tableros"
      },
      "integrations": {
        "edit": {
          "label": "Editar"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Editar"
        }
      },
      "apps": {
        "label": "Aplicaciones",
        "edit": {
          "label": "Editar"
        }
      },
      "users": {
        "label": "Usuarios",
        "create": {
          "label": "Crear"
        },
        "general": "General",
        "security": "Seguridad",
        "board": "Tableros",
        "invites": {
          "label": "Invitaciones"
        }
      },
      "tools": {
        "label": "Herramientas",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Ajustes"
      },
      "about": {
        "label": "Acerca de"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Aplicaciones"
          },
          "board": {
            "title": "Tableros"
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
            "title": "Ayuda",
            "option": {
              "documentation": {
                "label": "Documentación"
              },
              "discord": {
                "label": "Comunidad Discord"
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
                "label": "Administrar usuarios"
              },
              "about": {
                "label": "Acerca de"
              },
              "preferences": {
                "label": "Tus preferencias"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Usuarios"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Nombre"
        }
      }
    }
  }
} as const;