import "dayjs/locale/pt";
import dayjs from "dayjs";
dayjs.locale("pt");

export default {
  "user": {
    "title": "Usuários",
    "name": "Usuário",
    "field": {
      "email": {
        "label": "E-mail"
      },
      "username": {
        "label": "Usuário"
      },
      "password": {
        "label": "Senha",
        "requirement": {
          "lowercase": "Inclui letras minúsculas",
          "uppercase": "Inclui letras maiúsculas",
          "number": "Inclui número"
        }
      },
      "passwordConfirm": {
        "label": "Confirmar senha"
      }
    },
    "action": {
      "login": {
        "label": "“Login”"
      },
      "register": {
        "label": "Criar conta",
        "notification": {
          "success": {
            "title": "Conta criada"
          }
        }
      },
      "create": "Criar usuário"
    }
  },
  "group": {
    "field": {
      "name": "Nome"
    },
    "permission": {
      "admin": {
        "title": "Administrador"
      },
      "board": {
        "title": "Placas"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Aplicativos"
      }
    },
    "field": {
      "name": {
        "label": "Nome"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Nome"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "URL inválido"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Usuário"
        },
        "password": {
          "label": "Senha",
          "newLabel": "Nova senha"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Nome",
      "size": "Tamanho",
      "creator": "Criador"
    }
  },
  "common": {
    "error": "Erro",
    "action": {
      "add": "Adicionar",
      "apply": "Aplicar",
      "create": "Criar",
      "edit": "Editar",
      "insert": "Inserir",
      "remove": "Excluir",
      "save": "Salvar",
      "saveChanges": "Salvar alterações",
      "cancel": "Cancelar",
      "delete": "Apagar",
      "confirm": "Confirme",
      "previous": "Anterior",
      "next": "Próximo",
      "tryAgain": "Tente novamente"
    },
    "information": {
      "hours": "",
      "minutes": ""
    },
    "userAvatar": {
      "menu": {
        "preferences": "Suas preferências",
        "login": "“Login”"
      }
    },
    "dangerZone": "Zona de risco",
    "noResults": "Nenhum resultado encontrado",
    "zod": {
      "errors": {
        "default": "Esse campo é inválido",
        "required": "Este campo é obrigatório"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Nome"
        }
      },
      "action": {
        "moveUp": "Subir",
        "moveDown": "Mover para baixo"
      },
      "menu": {
        "label": {
          "changePosition": "Mudar de posição"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Configurações"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Largura"
        },
        "height": {
          "label": "Altura"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Abrir em novo separador"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Layout",
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
        "adsBlockedToday": "Bloqueado hoje",
        "adsBlockedTodayPercentage": "Bloqueado hoje",
        "dnsQueriesToday": "Consultas hoje"
      }
    },
    "dnsHoleControls": {
      "description": "Controle o PiHole ou o AdGuard em seu painel de controle",
      "option": {
        "layout": {
          "label": "Layout",
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
        "enabled": "Ativado",
        "disabled": "Desativado",
        "hours": "",
        "minutes": ""
      }
    },
    "clock": {
      "description": "Apresenta a data e hora actuais.",
      "option": {
        "timezone": {
          "label": "Fuso-horário"
        }
      }
    },
    "notebook": {
      "name": "Caderno de anotações",
      "option": {
        "showToolbar": {
          "label": "Mostrar a barra de ferramentas para ajudá-lo a escrever markdown"
        },
        "allowReadOnlyCheck": {
          "label": "Permitir a verificação no modo de leitura"
        },
        "content": {
          "label": "O conteúdo do notebook"
        }
      },
      "controls": {
        "bold": "Negrito",
        "italic": "Itálico",
        "strikethrough": "Riscar",
        "underline": "Sublinhar",
        "colorText": "Cor do texto",
        "colorHighlight": "Texto colorido em destaque",
        "code": "Código",
        "clear": "Limpar formatação",
        "blockquote": "Bloco de Citação",
        "horizontalLine": "Linha horizontal",
        "bulletList": "Lista de marcadores",
        "orderedList": "Lista ordenada",
        "checkList": "Lista de verificação",
        "increaseIndent": "Aumentar recuo",
        "decreaseIndent": "Diminuir recuo",
        "link": "Link",
        "unlink": "Remover link",
        "image": "Incorporar imagem",
        "addTable": "Adicionar tabela",
        "deleteTable": "Excluir tabela",
        "colorCell": "Cor da Célula",
        "mergeCell": "Ativar/desativar mesclagem de células",
        "addColumnLeft": "Adicionar coluna antes",
        "addColumnRight": "Adicionar coluna depois",
        "deleteColumn": "Excluir coluna",
        "addRowTop": "Adicionar linha antes",
        "addRowBelow": "Adicionar linha depois",
        "deleteRow": "Excluir linha"
      },
      "align": {
        "left": "Esquerda",
        "center": "Centralizado",
        "right": "Certo"
      },
      "popover": {
        "clearColor": "Limpar cor",
        "source": "Fonte",
        "widthPlaceholder": "Valor em % ou pixels",
        "columns": "Colunas",
        "rows": "Linhas",
        "width": "Largura",
        "height": "Altura"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "Incorporar qualquer conteúdo da internet. Alguns sites podem restringir o acesso.",
      "option": {
        "embedUrl": {
          "label": "Incorporar URL"
        },
        "allowFullScreen": {
          "label": "Permitir tela cheia"
        },
        "allowTransparency": {
          "label": "Permitir transparência"
        },
        "allowScrolling": {
          "label": "Permitir rolagem"
        },
        "allowPayment": {
          "label": "Permitir pagamento"
        },
        "allowAutoPlay": {
          "label": "Permitir reprodução automática"
        },
        "allowMicrophone": {
          "label": "Permitir microfone"
        },
        "allowCamera": {
          "label": "Permitir câmera"
        },
        "allowGeolocation": {
          "label": "Permitir geolocalização"
        }
      },
      "error": {
        "noBrowerSupport": "Seu navegador não suporta iframes. Atualize seu navegador."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "ID da entidade"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Nome de exibição"
        },
        "automationId": {
          "label": "ID da automação"
        }
      }
    },
    "calendar": {
      "name": "Calendário",
      "option": {
        "releaseType": {
          "label": "Tipo de libertação de Radarr"
        }
      }
    },
    "weather": {
      "name": "Tempo",
      "description": "Apresenta a informação meteorológica actual de um local definido.",
      "option": {
        "location": {
          "label": "Localização do tempo"
        }
      },
      "kind": {
        "clear": "Limpar",
        "mainlyClear": "Principalmente claro",
        "fog": "Névoa",
        "drizzle": "Chuvisco",
        "freezingDrizzle": "Chuvisco de congelação",
        "rain": "Chuva",
        "freezingRain": "Chuva gelada",
        "snowFall": "Queda de neve",
        "snowGrains": "Grãos de neve",
        "rainShowers": "Duches de chuva",
        "snowShowers": "Aguaceiros de neve",
        "thunderstorm": "Tempestade",
        "thunderstormWithHail": "Tempestade com granizo",
        "unknown": "Desconhecido"
      }
    },
    "indexerManager": {
      "name": "Status do Gerenciador de Indexadores",
      "title": "Gerenciador de indexadores",
      "testAll": "Testar todos"
    },
    "healthMonitoring": {
      "name": "Monitoramento da integridade do sistema",
      "description": "Exibe informações que mostram a saúde e status de seu(s) sistema(s).",
      "option": {
        "fahrenheit": {
          "label": "Temperatura da CPU em Fahrenheit"
        },
        "cpu": {
          "label": "Mostrar informações da CPU"
        },
        "memory": {
          "label": "Mostrar informações da memória"
        },
        "fileSystem": {
          "label": "Mostrar informações do sistema de arquivos"
        }
      },
      "popover": {
        "available": "Disponível"
      }
    },
    "common": {
      "location": {
        "search": "Pesquisa",
        "table": {
          "header": {},
          "population": {
            "fallback": "Desconhecido"
          }
        }
      }
    },
    "video": {
      "name": "Transmissão de vídeo",
      "description": "Incorporar um stream de vídeo ou vídeo de uma câmera ou de um site",
      "option": {
        "feedUrl": {
          "label": "URL do feed"
        },
        "hasAutoPlay": {
          "label": "Reprodução automática"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": ""
        },
        "downSpeed": {
          "columnTitle": "Para baixo",
          "detailsTitle": "Velocidade de Transferência"
        },
        "integration": {
          "columnTitle": "Integração"
        },
        "progress": {
          "columnTitle": "Progresso"
        },
        "ratio": {
          "columnTitle": "Razão"
        },
        "state": {
          "columnTitle": "Estado"
        },
        "upSpeed": {
          "columnTitle": "Para cima"
        }
      },
      "states": {
        "downloading": "Baixando",
        "queued": "",
        "paused": "Pausado",
        "completed": "Concluído",
        "unknown": "Desconhecido"
      }
    },
    "mediaRequests-requestList": {
      "description": "Veja uma lista de todas as solicitações de mídia da sua instância do Overseerr ou Jellyseerr",
      "option": {
        "linksTargetNewTab": {
          "label": "Abrir links em uma nova guia"
        }
      },
      "availability": {
        "unknown": "Desconhecido",
        "partiallyAvailable": "Parcial",
        "available": "Disponível"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Estatísticas sobre suas solicitações de mídia",
      "titles": {
        "stats": {
          "main": "Estatísticas de mídia",
          "approved": "Já aprovado",
          "pending": "Aprovações pendentes",
          "tv": "Solicitações de TV",
          "movie": "Solicitações de filmes",
          "total": "Total"
        },
        "users": {
          "main": "Principais usuários"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Aplicativos"
          },
          "screenSize": {
            "option": {
              "sm": "Pequeno",
              "md": "Médio",
              "lg": "Grande"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Anexo de imagem de fundo"
      },
      "backgroundImageSize": {
        "label": "Tamanho da imagem de fundo"
      },
      "primaryColor": {
        "label": "Cor primária"
      },
      "secondaryColor": {
        "label": "Cor secundária"
      },
      "customCss": {
        "description": "Além disso, personalize seu painel usando CSS, recomendado apenas para usuários experientes"
      },
      "name": {
        "label": "Nome"
      },
      "isPublic": {
        "label": "Público"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Geral"
        },
        "layout": {
          "title": "Layout"
        },
        "background": {
          "title": "Antecedentes"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Exibir quadro"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Zona de risco",
          "action": {
            "delete": {
              "confirm": {
                "title": "Excluir quadro"
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
        "home": "Início",
        "boards": "Placas",
        "apps": "Aplicativos",
        "users": {
          "label": "Usuários",
          "items": {
            "manage": "Gerenciar",
            "invites": "Convites"
          }
        },
        "tools": {
          "label": "Ferramentas",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Configurações",
        "help": {
          "label": "Ajuda",
          "items": {
            "documentation": "Documentação",
            "discord": "Discórdia da comunidade"
          }
        },
        "about": "Sobre"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Placas",
          "user": "Usuários",
          "invite": "Convites",
          "app": "Aplicativos"
        },
        "statisticLabel": {
          "boards": "Placas"
        }
      },
      "board": {
        "title": "Suas placas",
        "action": {
          "settings": {
            "label": "Configurações"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Início"
            }
          },
          "delete": {
            "label": "Excluir permanentemente",
            "confirm": {
              "title": "Excluir quadro"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Nome"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Geral",
            "item": {
              "firstDayOfWeek": "Primeiro dia da semana",
              "accessibility": "Acessibilidade"
            }
          },
          "security": {
            "title": "Segurança"
          },
          "board": {
            "title": "Placas"
          }
        },
        "list": {
          "metaTitle": "Gerenciar usuários",
          "title": "Usuários"
        },
        "create": {
          "metaTitle": "Criar usuário",
          "step": {
            "security": {
              "label": "Segurança"
            }
          }
        },
        "invite": {
          "title": "Gerenciar convites de usuários",
          "action": {
            "new": {
              "description": "Após a expiração, um convite não será mais válido e o destinatário do convite não poderá criar uma conta."
            },
            "copy": {
              "link": "Link do convite"
            },
            "delete": {
              "title": "Excluir convite",
              "description": "Tem certeza de que deseja excluir este convite? Os usuários com esse link não poderão mais criar uma conta usando esse link."
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "Criador"
            },
            "expirationDate": {
              "label": "Data de expiração"
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
            "title": "Geral"
          }
        }
      },
      "settings": {
        "title": "Configurações"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Em execução",
            "error": "Erro"
          },
          "job": {
            "mediaServer": {
              "label": "Servidor de Mídia"
            },
            "mediaRequests": {
              "label": "Solicitações de mídia"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Documentação"
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
        "label": "Nome"
      },
      "state": {
        "label": "Estado",
        "option": {
          "created": "Criado",
          "running": "Em execução",
          "paused": "Pausado",
          "restarting": "Recomeço",
          "removing": "Remoção"
        }
      },
      "containerImage": {
        "label": "Imagem"
      },
      "ports": {
        "label": "Portas"
      }
    },
    "action": {
      "start": {
        "label": "Iniciar"
      },
      "stop": {
        "label": "Parar"
      },
      "restart": {
        "label": "Reiniciar"
      },
      "remove": {
        "label": "Excluir"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Usuários"
    },
    "field": {
      "user": {
        "label": "Usuário"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Gerenciar",
      "boards": {
        "label": "Placas"
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
        "label": "Aplicativos",
        "edit": {
          "label": "Editar"
        }
      },
      "users": {
        "label": "Usuários",
        "create": {
          "label": "Criar"
        },
        "general": "Geral",
        "security": "Segurança",
        "board": "Placas",
        "invites": {
          "label": "Convites"
        }
      },
      "tools": {
        "label": "Ferramentas",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Configurações"
      },
      "about": {
        "label": "Sobre"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Aplicativos"
          },
          "board": {
            "title": "Placas"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Torrentes"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Ajuda",
            "option": {
              "documentation": {
                "label": "Documentação"
              },
              "discord": {
                "label": "Discórdia da comunidade"
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
                "label": "Gerenciar usuários"
              },
              "about": {
                "label": "Sobre"
              },
              "preferences": {
                "label": "Suas preferências"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Usuários"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Nome"
        }
      }
    }
  }
} as const;