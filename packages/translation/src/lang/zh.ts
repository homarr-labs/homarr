import "dayjs/locale/en";
import dayjs from "dayjs";
dayjs.locale("en");

export default {
  "user": {
    "title": "用户",
    "name": "用户",
    "field": {
      "email": {
        "label": "邮箱"
      },
      "username": {
        "label": "用户名"
      },
      "password": {
        "label": "密码",
        "requirement": {
          "lowercase": "包括小写字母",
          "uppercase": "包含大写字母",
          "number": "包含数字"
        }
      },
      "passwordConfirm": {
        "label": "确认密码"
      }
    },
    "action": {
      "login": {
        "label": "登录"
      },
      "register": {
        "label": "创建账号",
        "notification": {
          "success": {
            "title": "账号已创建"
          }
        }
      },
      "create": "创建用户"
    }
  },
  "group": {
    "field": {
      "name": "名称"
    },
    "permission": {
      "admin": {},
      "board": {
        "title": "面板"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "应用"
      }
    },
    "field": {
      "name": {
        "label": "名称"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "名称"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "无效链接"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "用户名"
        },
        "password": {
          "label": "密码"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "名称",
      "size": "大小",
      "creator": "创建者"
    }
  },
  "common": {
    "error": "错误",
    "action": {
      "add": "添加",
      "create": "创建",
      "edit": "编辑",
      "remove": "删除",
      "save": "保存",
      "saveChanges": "保存更改",
      "cancel": "取消",
      "delete": "删除",
      "previous": "上一步",
      "next": "下一步",
      "tryAgain": "请再试一次"
    },
    "information": {},
    "userAvatar": {
      "menu": {
        "preferences": "您的首选项",
        "login": "登录"
      }
    },
    "dangerZone": "危险",
    "noResults": "未找到结果",
    "zod": {
      "errors": {
        "default": "该字段无效",
        "required": "此字段为必填"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "名称"
        }
      },
      "action": {
        "moveUp": "上移",
        "moveDown": "下移"
      },
      "menu": {
        "label": {
          "changePosition": "换位"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "设置"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "宽度"
        },
        "height": {
          "label": "高度"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "在新标签页中打开"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "显示布局",
          "option": {
            "row": {
              "label": "横向"
            },
            "column": {
              "label": "垂直"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "今日屏蔽",
        "adsBlockedTodayPercentage": "今日屏蔽",
        "dnsQueriesToday": "今日查询"
      }
    },
    "dnsHoleControls": {
      "description": "从您的面板控制 PiHole 或 AdGuard",
      "option": {
        "layout": {
          "label": "显示布局",
          "option": {
            "row": {
              "label": "横向"
            },
            "column": {
              "label": "垂直"
            }
          }
        }
      },
      "controls": {
        "enabled": "已启用",
        "disabled": "已禁用"
      }
    },
    "clock": {
      "description": "显示当前的日期和时间。",
      "option": {
        "timezone": {}
      }
    },
    "notebook": {
      "name": "笔记本",
      "option": {
        "showToolbar": {
          "label": "显示帮助您写下 Markdown 的工具栏"
        },
        "allowReadOnlyCheck": {},
        "content": {
          "label": "笔记本的内容"
        }
      },
      "controls": {},
      "align": {
        "left": "左边",
        "right": "右边"
      },
      "popover": {
        "width": "宽度",
        "height": "高度"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "嵌入互联网上的任何内容。某些网站可能限制访问。",
      "option": {
        "embedUrl": {
          "label": "嵌入地址"
        },
        "allowFullScreen": {
          "label": "允许全屏"
        },
        "allowTransparency": {
          "label": "允许透明"
        },
        "allowScrolling": {
          "label": "允许滚动"
        },
        "allowPayment": {
          "label": "允许支付"
        },
        "allowAutoPlay": {
          "label": "允许自动播放"
        },
        "allowMicrophone": {
          "label": "允许麦克风"
        },
        "allowCamera": {
          "label": "允许摄像头"
        },
        "allowGeolocation": {
          "label": "允许地理位置"
        }
      },
      "error": {
        "noBrowerSupport": "您的浏览器不支持 iframe。请更新您的浏览器。"
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {}
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {},
        "automationId": {}
      }
    },
    "calendar": {
      "name": "日历",
      "option": {
        "releaseType": {
          "label": "Radarr发布类型"
        }
      }
    },
    "weather": {
      "name": "天气",
      "description": "显示指定位置的当前天气信息。",
      "option": {
        "location": {
          "label": "天气位置"
        }
      },
      "kind": {
        "clear": "晴朗",
        "mainlyClear": "晴朗为主",
        "fog": "雾",
        "drizzle": "细雨",
        "freezingDrizzle": "冻毛毛雨",
        "rain": "雨",
        "freezingRain": "冻雨",
        "snowFall": "降雪",
        "snowGrains": "霰",
        "rainShowers": "阵雨",
        "snowShowers": "阵雪",
        "thunderstorm": "雷暴",
        "thunderstormWithHail": "雷暴夹冰雹",
        "unknown": "未知"
      }
    },
    "indexerManager": {},
    "healthMonitoring": {
      "option": {
        "fahrenheit": {},
        "cpu": {},
        "memory": {},
        "fileSystem": {}
      },
      "popover": {}
    },
    "common": {
      "location": {
        "search": "搜索",
        "table": {
          "header": {},
          "population": {
            "fallback": "未知"
          }
        }
      }
    },
    "video": {
      "name": "视频流",
      "description": "嵌入来自相机或网站的视频流或视频",
      "option": {
        "feedUrl": {
          "label": "订阅网址"
        },
        "hasAutoPlay": {
          "label": "自动播放"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {},
        "downSpeed": {
          "columnTitle": "下载",
          "detailsTitle": "下载速度"
        },
        "integration": {
          "columnTitle": "集成"
        },
        "progress": {
          "columnTitle": "进度"
        },
        "ratio": {},
        "state": {
          "columnTitle": "状态"
        },
        "upSpeed": {
          "columnTitle": "上传"
        }
      },
      "states": {
        "paused": "已暂停",
        "completed": "已完成",
        "unknown": "未知"
      }
    },
    "mediaRequests-requestList": {
      "description": "查看 Overr 或 Jellyseerr 实例中的所有媒体请求列表",
      "option": {
        "linksTargetNewTab": {
          "label": "在新标签页中打开链接"
        }
      },
      "availability": {
        "unknown": "未知"
      }
    },
    "mediaRequests-requestStats": {
      "description": "您的媒体请求统计",
      "titles": {
        "stats": {
          "main": "媒体统计",
          "approved": "已批准",
          "pending": "待批准",
          "tv": "电视请求",
          "movie": "电影请求",
          "total": "总计"
        },
        "users": {
          "main": "用户排行"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "应用"
          },
          "screenSize": {
            "option": {
              "sm": "小号",
              "md": "中号",
              "lg": "大号"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {},
      "backgroundImageSize": {},
      "primaryColor": {
        "label": "主体色"
      },
      "secondaryColor": {
        "label": "辅助色"
      },
      "customCss": {
        "description": "此外，只推荐有经验的用户使用 CSS 自定义面板"
      },
      "name": {
        "label": "名称"
      },
      "isPublic": {
        "label": "公开"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "通用"
        },
        "layout": {
          "title": "显示布局"
        },
        "background": {
          "title": "背景"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "查看面板"
              }
            }
          }
        },
        "dangerZone": {
          "title": "危险",
          "action": {
            "delete": {
              "confirm": {
                "title": "删除面板"
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
        "home": "首页",
        "boards": "面板",
        "apps": "应用",
        "users": {
          "label": "用户",
          "items": {
            "manage": "管理",
            "invites": "邀请"
          }
        },
        "tools": {
          "label": "工具",
          "items": {
            "docker": "Docker"
          }
        },
        "settings": "设置",
        "help": {
          "label": "帮助",
          "items": {
            "documentation": "文档",
            "discord": "Discord 社区"
          }
        }
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "面板",
          "user": "用户",
          "invite": "邀请",
          "app": "应用"
        },
        "statisticLabel": {
          "boards": "面板"
        }
      },
      "board": {
        "title": "您的面板",
        "action": {
          "settings": {
            "label": "设置"
          },
          "setHomeBoard": {
            "badge": {
              "label": "首页"
            }
          },
          "delete": {
            "confirm": {
              "title": "删除面板"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "名称"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "通用",
            "item": {
              "firstDayOfWeek": "一周的第一天",
              "accessibility": "无障碍服务"
            }
          },
          "security": {},
          "board": {
            "title": "面板"
          }
        },
        "list": {
          "metaTitle": "管理用户",
          "title": "用户"
        },
        "create": {
          "metaTitle": "创建用户",
          "step": {
            "security": {}
          }
        },
        "invite": {
          "title": "管理用户邀请",
          "action": {
            "new": {
              "description": "过期后，邀请会失效，被邀请的收件人将无法创建账号。"
            },
            "copy": {
              "link": "邀请链接"
            },
            "delete": {
              "title": "删除邀请",
              "description": "你确定要删除这个邀请吗? 使用此链接的用户将不能再使用该链接创建账号。"
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "创建者"
            },
            "expirationDate": {
              "label": "过期时间"
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
            "title": "通用"
          }
        }
      },
      "settings": {
        "title": "设置"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "运行中",
            "error": "错误"
          },
          "job": {
            "mediaServer": {
              "label": "媒体服务"
            },
            "mediaRequests": {
              "label": "媒体请求"
            }
          }
        },
        "api": {
          "tab": {
            "documentation": {
              "label": "文档"
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
    "field": {
      "name": {
        "label": "名称"
      },
      "state": {
        "label": "状态",
        "option": {
          "created": "已创建",
          "running": "运行中",
          "paused": "已暂停",
          "restarting": "正在重启",
          "removing": "删除中"
        }
      },
      "containerImage": {
        "label": "镜像"
      },
      "ports": {
        "label": "端口"
      }
    },
    "action": {
      "start": {
        "label": "开始"
      },
      "stop": {
        "label": "停止"
      },
      "restart": {
        "label": "重启"
      },
      "remove": {
        "label": "删除"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "用户"
    },
    "field": {
      "user": {
        "label": "用户"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "管理",
      "boards": {
        "label": "面板"
      },
      "integrations": {
        "edit": {
          "label": "编辑"
        }
      },
      "search-engines": {
        "edit": {
          "label": "编辑"
        }
      },
      "apps": {
        "label": "应用",
        "edit": {
          "label": "编辑"
        }
      },
      "users": {
        "label": "用户",
        "create": {
          "label": "创建"
        },
        "general": "通用",
        "board": "面板",
        "invites": {
          "label": "邀请"
        }
      },
      "tools": {
        "label": "工具",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "设置"
      },
      "about": {}
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "应用"
          },
          "board": {
            "title": "面板"
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
            "title": "帮助",
            "option": {
              "documentation": {
                "label": "文档"
              },
              "discord": {
                "label": "Discord 社区"
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
                "label": "管理用户"
              },
              "about": {},
              "preferences": {
                "label": "您的首选项"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "用户"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "名称"
        }
      }
    }
  }
} as const;