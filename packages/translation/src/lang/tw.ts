import "dayjs/locale/zh-cn";
import dayjs from "dayjs";
dayjs.locale("zh-cn");

export default {
  "user": {
    "title": "使用者",
    "name": "使用者",
    "field": {
      "email": {
        "label": "E-mail"
      },
      "username": {
        "label": "帳號"
      },
      "password": {
        "label": "密碼",
        "requirement": {
          "lowercase": "包含小寫字母",
          "uppercase": "包含大寫字母",
          "number": "包含數字"
        }
      },
      "passwordConfirm": {
        "label": "確認密碼"
      }
    },
    "action": {
      "login": {
        "label": "登入"
      },
      "register": {
        "label": "創建帳號",
        "notification": {
          "success": {
            "title": "帳號已創建"
          }
        }
      },
      "create": "創建使用者"
    }
  },
  "group": {
    "field": {
      "name": "名稱"
    },
    "permission": {
      "admin": {
        "title": "管理員"
      },
      "board": {
        "title": "面板"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "應用"
      }
    },
    "field": {
      "name": {
        "label": "名稱"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "名稱"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "無效連結"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "帳號"
        },
        "password": {
          "label": "密碼",
          "newLabel": "新密碼"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "名稱",
      "size": "大小",
      "creator": "創建者"
    }
  },
  "common": {
    "error": "錯誤",
    "action": {
      "add": "新增",
      "apply": "應用",
      "create": "創建",
      "edit": "編輯",
      "insert": "插入",
      "remove": "刪除",
      "save": "儲存",
      "saveChanges": "儲存設定",
      "cancel": "取消",
      "delete": "刪除",
      "confirm": "確認",
      "previous": "上一步",
      "next": "下一步",
      "tryAgain": "請再試一次"
    },
    "information": {
      "hours": "時",
      "minutes": "分"
    },
    "userAvatar": {
      "menu": {
        "preferences": "您的偏好設定",
        "login": "登入"
      }
    },
    "dangerZone": "危險",
    "noResults": "未找到結果",
    "zod": {
      "errors": {
        "default": "該字段無效",
        "required": "此字段為必填"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "名稱"
        }
      },
      "action": {
        "moveUp": "上移",
        "moveDown": "下移"
      },
      "menu": {
        "label": {
          "changePosition": "換位"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "設定"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "寬度"
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
          "label": "在新分頁中開啟"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "顯示布局",
          "option": {
            "row": {
              "label": "橫向"
            },
            "column": {
              "label": "垂直"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "今日封鎖",
        "adsBlockedTodayPercentage": "今日封鎖",
        "dnsQueriesToday": "今日查詢"
      }
    },
    "dnsHoleControls": {
      "description": "從您的面板控制 PiHole 或 AdGuard",
      "option": {
        "layout": {
          "label": "顯示布局",
          "option": {
            "row": {
              "label": "橫向"
            },
            "column": {
              "label": "垂直"
            }
          }
        }
      },
      "controls": {
        "set": "設定",
        "enabled": "已啟用",
        "disabled": "已禁用",
        "hours": "時",
        "minutes": "分"
      }
    },
    "clock": {
      "description": "顯示目前的日期與時間",
      "option": {
        "timezone": {
          "label": "時區"
        }
      }
    },
    "notebook": {
      "name": "筆記本",
      "option": {
        "showToolbar": {
          "label": "顯示幫助您紀錄 Markdown 的工具欄"
        },
        "allowReadOnlyCheck": {
          "label": "准許在唯讀模式中檢查"
        },
        "content": {
          "label": "筆記本的內容"
        }
      },
      "controls": {
        "bold": "粗體",
        "italic": "斜體",
        "strikethrough": "刪除線",
        "underline": "下滑線",
        "colorText": "文字顏色",
        "colorHighlight": "高亮文字",
        "code": "代碼",
        "clear": "清除格式",
        "blockquote": "引用",
        "horizontalLine": "橫線",
        "bulletList": "符號列表",
        "orderedList": "順序列表",
        "checkList": "檢查列表",
        "increaseIndent": "增加縮進",
        "decreaseIndent": "減小縮進",
        "link": "連結",
        "unlink": "刪除連結",
        "image": "崁入圖片",
        "addTable": "增加表格",
        "deleteTable": "刪除表格",
        "colorCell": "單元格顏色",
        "mergeCell": "切換單元格合併",
        "addColumnLeft": "在前方增加列",
        "addColumnRight": "在後方增加列",
        "deleteColumn": "刪除整列",
        "addRowTop": "在前方增加行",
        "addRowBelow": "在後方增加行",
        "deleteRow": "刪除整行"
      },
      "align": {
        "left": "左方",
        "center": "置中",
        "right": "右方"
      },
      "popover": {
        "clearColor": "清除顏色",
        "source": "來源",
        "widthPlaceholder": "百分比或像素值",
        "columns": "列數",
        "rows": "行數",
        "width": "寬度",
        "height": "高度"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "崁入網路上的內容，某些網站可能會限制訪問",
      "option": {
        "embedUrl": {
          "label": "崁入網址"
        },
        "allowFullScreen": {
          "label": "允許全螢幕"
        },
        "allowTransparency": {
          "label": "允許透明化"
        },
        "allowScrolling": {
          "label": "允許滾動"
        },
        "allowPayment": {
          "label": "允許付款"
        },
        "allowAutoPlay": {
          "label": "允許自動播放"
        },
        "allowMicrophone": {
          "label": "允許麥克風"
        },
        "allowCamera": {
          "label": "允許攝影機"
        },
        "allowGeolocation": {
          "label": "允許地理位置"
        }
      },
      "error": {
        "noBrowerSupport": "您的瀏覽器不支援iFrame，請更新您的瀏覽器"
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "實體 ID"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "顯示名稱"
        },
        "automationId": {
          "label": "自動化ID"
        }
      }
    },
    "calendar": {
      "name": "日曆",
      "option": {
        "releaseType": {
          "label": "Radarr 發布類型"
        }
      }
    },
    "weather": {
      "name": "天氣",
      "description": "顯示指定位置的目前天氣狀況",
      "option": {
        "location": {
          "label": "天氣位置"
        }
      },
      "kind": {
        "clear": "晴朗",
        "mainlyClear": "晴時多雲",
        "fog": "起霧",
        "drizzle": "小雨",
        "freezingDrizzle": "毛毛雨",
        "rain": "下雨",
        "freezingRain": "凍雨",
        "snowFall": "下雪",
        "snowGrains": "下霜",
        "rainShowers": "陣雨",
        "snowShowers": "陣雪",
        "thunderstorm": "雷雨",
        "thunderstormWithHail": "雷雨夾冰雹",
        "unknown": "未知"
      }
    },
    "indexerManager": {
      "name": "索引管理器狀態",
      "title": "索引管理器",
      "testAll": "測試全部"
    },
    "healthMonitoring": {
      "name": "系統健康監控",
      "description": "顯示系統運行健康、狀態訊息",
      "option": {
        "fahrenheit": {
          "label": "CPU溫度 (華氏度)"
        },
        "cpu": {
          "label": "顯示 CPU 訊息"
        },
        "memory": {
          "label": "顯示記憶體訊息"
        },
        "fileSystem": {
          "label": "顯示檔案系統訊息"
        }
      },
      "popover": {
        "available": "可用"
      }
    },
    "common": {
      "location": {
        "search": "搜尋",
        "table": {
          "header": {},
          "population": {
            "fallback": "未知"
          }
        }
      }
    },
    "video": {
      "name": "影片串流",
      "description": "崁入來自攝影機或網站的影片串流",
      "option": {
        "feedUrl": {
          "label": "訂閱網址"
        },
        "hasAutoPlay": {
          "label": "自動播放"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "日期已添加"
        },
        "downSpeed": {
          "columnTitle": "下載",
          "detailsTitle": "下載速度"
        },
        "integration": {
          "columnTitle": "集成"
        },
        "progress": {
          "columnTitle": "進度"
        },
        "ratio": {
          "columnTitle": "分享率"
        },
        "state": {
          "columnTitle": "狀態"
        },
        "upSpeed": {
          "columnTitle": "上傳"
        }
      },
      "states": {
        "downloading": "正在下載",
        "queued": "隊列",
        "paused": "已暫停",
        "completed": "已完成",
        "unknown": "未知"
      }
    },
    "mediaRequests-requestList": {
      "description": "查看 Overseerr 或 Jellyseer 實例中的所有媒體請求列表",
      "option": {
        "linksTargetNewTab": {
          "label": "在新分頁中開啟連結"
        }
      },
      "availability": {
        "unknown": "未知",
        "partiallyAvailable": "部分",
        "available": "可用"
      }
    },
    "mediaRequests-requestStats": {
      "description": "您的媒體請求統計",
      "titles": {
        "stats": {
          "main": "媒體狀態",
          "approved": "已准許",
          "pending": "待准許",
          "tv": "電視劇請求",
          "movie": "電影請求",
          "total": "總計"
        },
        "users": {
          "main": "使用者排行"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "應用"
          },
          "screenSize": {
            "option": {
              "sm": "小",
              "md": "中等",
              "lg": "大號"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "背景圖片附件"
      },
      "backgroundImageSize": {
        "label": "背景圖像大小"
      },
      "primaryColor": {
        "label": "主體顏色"
      },
      "secondaryColor": {
        "label": "輔助顏色"
      },
      "customCss": {
        "description": "此外，只推薦有經驗的使用者使用 CSS 自定義面板"
      },
      "name": {
        "label": "名稱"
      },
      "isPublic": {
        "label": "公開"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "一般"
        },
        "layout": {
          "title": "顯示布局"
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
          "title": "危險",
          "action": {
            "delete": {
              "confirm": {
                "title": "刪除面板"
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
        "home": "首頁",
        "boards": "面板",
        "apps": "應用",
        "users": {
          "label": "使用者",
          "items": {
            "manage": "管理",
            "invites": "邀請"
          }
        },
        "tools": {
          "label": "工具",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "設定",
        "help": {
          "label": "幫助",
          "items": {
            "documentation": "文件",
            "discord": "Discord 社群"
          }
        },
        "about": "關於"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "面板",
          "user": "使用者",
          "invite": "邀請",
          "app": "應用"
        },
        "statisticLabel": {
          "boards": "面板"
        }
      },
      "board": {
        "title": "您的面板",
        "action": {
          "settings": {
            "label": "設定"
          },
          "setHomeBoard": {
            "badge": {
              "label": "首頁"
            }
          },
          "delete": {
            "label": "永久刪除",
            "confirm": {
              "title": "刪除面板"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "名稱"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "一般",
            "item": {
              "firstDayOfWeek": "一週的第一天",
              "accessibility": "無障礙服務"
            }
          },
          "security": {
            "title": "安全"
          },
          "board": {
            "title": "面板"
          }
        },
        "list": {
          "metaTitle": "管理使用者",
          "title": "使用者"
        },
        "create": {
          "metaTitle": "創建使用者",
          "step": {
            "security": {
              "label": "安全"
            }
          }
        },
        "invite": {
          "title": "管理使用者邀請",
          "action": {
            "new": {
              "description": "過期後，邀請會失效，被邀請者將無法創建帳號"
            },
            "copy": {
              "link": "邀請連結"
            },
            "delete": {
              "title": "刪除邀請",
              "description": "您確定要刪除此邀請？使用此連結的使用者將無法再次使用此連結創建帳號"
            }
          },
          "field": {
            "id": {
              "label": "ID"
            },
            "creator": {
              "label": "創建者"
            },
            "expirationDate": {
              "label": "過期期間"
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
            "title": "一般"
          }
        }
      },
      "settings": {
        "title": "設定"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "運行中",
            "error": "錯誤"
          },
          "job": {
            "mediaServer": {
              "label": "媒體服務"
            },
            "mediaRequests": {
              "label": "媒體請求"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "文件"
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
    "title": "容器",
    "field": {
      "name": {
        "label": "名稱"
      },
      "state": {
        "label": "狀態",
        "option": {
          "created": "已創建",
          "running": "運行中",
          "paused": "已暫停",
          "restarting": "正在重啟...",
          "removing": "正在刪除..."
        }
      },
      "containerImage": {
        "label": "鏡像"
      },
      "ports": {
        "label": "Ports"
      }
    },
    "action": {
      "start": {
        "label": "開始"
      },
      "stop": {
        "label": "停止"
      },
      "restart": {
        "label": "重啟"
      },
      "remove": {
        "label": "刪除"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "使用者"
    },
    "field": {
      "user": {
        "label": "使用者"
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
          "label": "編輯"
        }
      },
      "search-engines": {
        "edit": {
          "label": "編輯"
        }
      },
      "apps": {
        "label": "應用",
        "edit": {
          "label": "編輯"
        }
      },
      "users": {
        "label": "使用者",
        "create": {
          "label": "創建"
        },
        "general": "一般",
        "security": "安全",
        "board": "面板",
        "invites": {
          "label": "邀請"
        }
      },
      "tools": {
        "label": "工具",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "設定"
      },
      "about": {
        "label": "關於"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "應用"
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
            "title": "幫助",
            "option": {
              "documentation": {
                "label": "文件"
              },
              "discord": {
                "label": "Discord 社群"
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
                "label": "管理使用者"
              },
              "about": {
                "label": "關於"
              },
              "preferences": {
                "label": "您的偏好設定"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "使用者"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "名稱"
        }
      }
    }
  }
} as const;