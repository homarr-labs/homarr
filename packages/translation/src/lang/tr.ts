import "dayjs/locale/tr";
import dayjs from "dayjs";
dayjs.locale("tr");

export default {
  "user": {
    "title": "Kullanıcılar",
    "name": "Kullanıcı",
    "field": {
      "email": {
        "label": "E-Posta"
      },
      "username": {
        "label": "Kullanıcı adı"
      },
      "password": {
        "label": "Şifre",
        "requirement": {
          "lowercase": "Küçük harf içermeli",
          "uppercase": "Büyük harf içermeli",
          "number": "Rakam içermeli"
        }
      },
      "passwordConfirm": {
        "label": "Şifreyi onayla"
      }
    },
    "action": {
      "login": {
        "label": "Giriş"
      },
      "register": {
        "label": "Hesap oluştur",
        "notification": {
          "success": {
            "title": "Hesap oluşturuldu"
          }
        }
      },
      "create": "Kullanıcı ekle"
    }
  },
  "group": {
    "field": {
      "name": "İsim"
    },
    "permission": {
      "admin": {
        "title": "Yönetici"
      },
      "board": {
        "title": "Paneller"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Uygulamalar"
      }
    },
    "field": {
      "name": {
        "label": "İsim"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "İsim"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "Geçersiz URL"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Kullanıcı adı"
        },
        "password": {
          "label": "Şifre",
          "newLabel": "Yeni parola"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "İsim",
      "size": "Boyut",
      "creator": "Oluşturan"
    }
  },
  "common": {
    "error": "Hata",
    "action": {
      "add": "Ekle",
      "apply": "Uygula",
      "create": "Oluştur",
      "edit": "Düzenle",
      "insert": "Ekle",
      "remove": "Kaldır",
      "save": "Kaydet",
      "saveChanges": "Değişiklikleri kaydet",
      "cancel": "Vazgeç",
      "delete": "Sil",
      "confirm": "Onayla",
      "previous": "Önceki",
      "next": "İleri",
      "tryAgain": "Tekrar Deneyin"
    },
    "information": {
      "hours": "Saat",
      "minutes": "Dakika"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Tercihleriniz",
        "login": "Giriş"
      }
    },
    "dangerZone": "Tehlikeli bölge",
    "noResults": "Sonuç bulunamadı",
    "zod": {
      "errors": {
        "default": "Bu alan geçersiz",
        "required": "Bu alan gereklidir"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "İsim"
        }
      },
      "action": {
        "moveUp": "Yukarı taşı",
        "moveDown": "Aşağı taşı"
      },
      "menu": {
        "label": {
          "changePosition": "Pozisyonu değiştir"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Ayarlar"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Genişlik"
        },
        "height": {
          "label": "Yükseklik"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Yeni sekmede aç"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Düzen",
          "option": {
            "row": {
              "label": "Yatay"
            },
            "column": {
              "label": "Dikey"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Bugün engellenenler",
        "adsBlockedTodayPercentage": "Bugün engellenenler",
        "dnsQueriesToday": "Bugünkü Sorgular"
      }
    },
    "dnsHoleControls": {
      "description": "Kontrol panelinizden PiHole veya AdGuard'ı kontrol edin",
      "option": {
        "layout": {
          "label": "Düzen",
          "option": {
            "row": {
              "label": "Yatay"
            },
            "column": {
              "label": "Dikey"
            }
          }
        }
      },
      "controls": {
        "set": "Ayarla",
        "enabled": "Etkin",
        "disabled": "Pasif",
        "hours": "Saat",
        "minutes": "Dakika"
      }
    },
    "clock": {
      "description": "Geçerli tarih ve saati görüntüler.",
      "option": {
        "timezone": {
          "label": "Saat dilimi"
        }
      }
    },
    "notebook": {
      "name": "Not defteri",
      "option": {
        "showToolbar": {
          "label": "Markdown'da yazarken size yardımcı olacak araç çubuğunu aktif edin"
        },
        "allowReadOnlyCheck": {
          "label": "Salt okunur modda onay kutusu işaretlemeye izin ver"
        },
        "content": {
          "label": "Not defterinin içeriği"
        }
      },
      "controls": {
        "bold": "Kalın",
        "italic": "İtalik",
        "strikethrough": "Üstü Çizgili",
        "underline": "Alt Çizgili",
        "colorText": "Renkli metin",
        "colorHighlight": "Renkli vurgulu metin",
        "code": "Kod",
        "clear": "Biçimlendirmeyi temizle",
        "blockquote": "Blok alıntı",
        "horizontalLine": "Yatay çizgi",
        "bulletList": "Maddeli liste",
        "orderedList": "Sıralı liste",
        "checkList": "Kontrol listesi",
        "increaseIndent": "Girintiyi Artır",
        "decreaseIndent": "Girintiyi Azalt",
        "link": "Bağlantı",
        "unlink": "Bağlantıyı kaldır",
        "image": "Resim Göm",
        "addTable": "Tablo ekle",
        "deleteTable": "Tablo Sil",
        "colorCell": "Renk Hücresi",
        "mergeCell": "Hücre birleştirmeyi aç / kapat",
        "addColumnLeft": "Öncesine sütun ekle",
        "addColumnRight": "Sonrasına sütun ekle",
        "deleteColumn": "Sütunu sil",
        "addRowTop": "Öncesine satır ekle",
        "addRowBelow": "Sonrasına satır ekle",
        "deleteRow": "Satırı sil"
      },
      "align": {
        "left": "Sol",
        "center": "Merkez",
        "right": "Sağ"
      },
      "popover": {
        "clearColor": "Rengi temizle",
        "source": "Kaynak",
        "widthPlaceholder": "% veya piksel cinsinden değer",
        "columns": "Sütunlar",
        "rows": "Satırlar",
        "width": "Genişlik",
        "height": "Yükseklik"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "İnternetten herhangi bir içeriği yerleştirin. Bazı web siteleri erişimi kısıtlayabilir.",
      "option": {
        "embedUrl": {
          "label": "Yerleştirme URL'si"
        },
        "allowFullScreen": {
          "label": "Tam ekrana izin ver"
        },
        "allowTransparency": {
          "label": "Şeffaflığa İzin Ver"
        },
        "allowScrolling": {
          "label": "Kaydırmaya izin ver"
        },
        "allowPayment": {
          "label": "Ödemeye izin ver"
        },
        "allowAutoPlay": {
          "label": "Otomatik oynatmaya izin ver"
        },
        "allowMicrophone": {
          "label": "Mikrofona izin ver"
        },
        "allowCamera": {
          "label": "Kameraya İzin Ver"
        },
        "allowGeolocation": {
          "label": "Coğrafi konuma izin ver (geolocation)"
        }
      },
      "error": {
        "noBrowerSupport": "Tarayıcınız iframe'leri desteklemiyor. Lütfen tarayıcınızı güncelleyin."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "Varlık Kimliği"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Ekran adı"
        },
        "automationId": {
          "label": "Otomasyon Kimliği"
        }
      }
    },
    "calendar": {
      "name": "Takvim",
      "option": {
        "releaseType": {
          "label": "Radarr yayın türü"
        }
      }
    },
    "weather": {
      "name": "Hava Durumu",
      "description": "Belirlenen bir konumun güncel hava durumu bilgilerini görüntüler.",
      "option": {
        "location": {
          "label": "Hava durumu konumu"
        }
      },
      "kind": {
        "clear": "Temiz",
        "mainlyClear": "Genel olarak açık",
        "fog": "Sis",
        "drizzle": "Çiseleme",
        "freezingDrizzle": "Soğuk çiseleme",
        "rain": "Yağmur",
        "freezingRain": "Dondurucu yağmur",
        "snowFall": "Kar yağışı",
        "snowGrains": "Kar taneleri",
        "rainShowers": "Sağanak yağmur",
        "snowShowers": "Kar yağışı",
        "thunderstorm": "Fırtına",
        "thunderstormWithHail": "Fırtına ve dolu",
        "unknown": "Bilinmeyen"
      }
    },
    "indexerManager": {
      "name": "Dizin oluşturucu yöneticisi statüsü",
      "title": "Dizin oluşturucu yöneticisi",
      "testAll": "Tümünü test et"
    },
    "healthMonitoring": {
      "name": "Sistem Sağlığı İzleme",
      "description": "Sistem(ler)inizin sağlığını ve durumunu gösteren bilgileri görüntüler.",
      "option": {
        "fahrenheit": {
          "label": "Fahrenheit cinsinden CPU Sıcaklığı"
        },
        "cpu": {
          "label": "CPU Bilgilerini Göster"
        },
        "memory": {
          "label": "Bellek Bilgilerini Göster"
        },
        "fileSystem": {
          "label": "Dosya Sistemi Bilgilerini Göster"
        }
      },
      "popover": {
        "available": "Mevcut"
      }
    },
    "common": {
      "location": {
        "search": "Ara",
        "table": {
          "header": {},
          "population": {
            "fallback": "Bilinmeyen"
          }
        }
      }
    },
    "video": {
      "name": "Video Akışı",
      "description": "Bir video akışını veya bir kameradan veya bir web sitesinden video gömün",
      "option": {
        "feedUrl": {
          "label": "Akış URL'si"
        },
        "hasAutoPlay": {
          "label": "Otomatik oynatma"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Ekleme Tarihi"
        },
        "downSpeed": {
          "columnTitle": "İndirme",
          "detailsTitle": "İndirme Hızı"
        },
        "integration": {
          "columnTitle": "Entegrasyon"
        },
        "progress": {
          "columnTitle": "İlerleme"
        },
        "ratio": {
          "columnTitle": "Ratio"
        },
        "state": {
          "columnTitle": "Durum"
        },
        "upSpeed": {
          "columnTitle": "Yükleme"
        }
      },
      "states": {
        "downloading": "İndiriliyor",
        "queued": "Sıraya alındı",
        "paused": "Duraklatıldı",
        "completed": "Tamamlanan",
        "unknown": "Bilinmeyen"
      }
    },
    "mediaRequests-requestList": {
      "description": "Overseerr veya Jellyseerr uygulamanızdan gelen tüm medya taleplerinin bir listesini görün",
      "option": {
        "linksTargetNewTab": {
          "label": "Bağlantıları yeni sekmede aç"
        }
      },
      "availability": {
        "unknown": "Bilinmeyen",
        "partiallyAvailable": "Kısmi",
        "available": "Mevcut"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Medya taleplerinizle ilgili istatistikler",
      "titles": {
        "stats": {
          "main": "Medya İstatistikleri",
          "approved": "Onaylanan",
          "pending": "Onay bekleyen",
          "tv": "Dizi talepleri",
          "movie": "Film talepleri",
          "total": "Toplam"
        },
        "users": {
          "main": "En İyi Kullanıcılar"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Uygulamalar"
          },
          "screenSize": {
            "option": {
              "sm": "Küçük",
              "md": "Orta",
              "lg": "Büyük"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Arkaplan resim ekle"
      },
      "backgroundImageSize": {
        "label": "Arkaplan resim boyutu"
      },
      "primaryColor": {
        "label": "Birincil renk"
      },
      "secondaryColor": {
        "label": "İkincil renk"
      },
      "customCss": {
        "description": "Ayrıca, yalnızca deneyimli kullanıcılar için önerilen CSS kullanarak kontrol panelinizi özelleştirin"
      },
      "name": {
        "label": "İsim"
      },
      "isPublic": {
        "label": "Herkese açık"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Genel"
        },
        "layout": {
          "title": "Düzen"
        },
        "background": {
          "title": "Arkaplan"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Panelleri görüntüle"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Tehlikeli bölge",
          "action": {
            "delete": {
              "confirm": {
                "title": "Paneli sil"
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
        "home": "Ana sayfa",
        "boards": "Paneller",
        "apps": "Uygulamalar",
        "users": {
          "label": "Kullanıcılar",
          "items": {
            "manage": "Yönet",
            "invites": "Davetler"
          }
        },
        "tools": {
          "label": "Araçlar",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Ayarlar",
        "help": {
          "label": "Yardım",
          "items": {
            "documentation": "Dokümantasyon",
            "discord": "Discord Topluluğu"
          }
        },
        "about": "Hakkında"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Paneller",
          "user": "Kullanıcılar",
          "invite": "Davetler",
          "app": "Uygulamalar"
        },
        "statisticLabel": {
          "boards": "Paneller"
        }
      },
      "board": {
        "title": "Panelleriniz",
        "action": {
          "settings": {
            "label": "Ayarlar"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Ana sayfa"
            }
          },
          "delete": {
            "label": "Kalıcı olarak sil",
            "confirm": {
              "title": "Paneli sil"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "İsim"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Genel",
            "item": {
              "firstDayOfWeek": "Haftanın ilk günü",
              "accessibility": "Erişilebilirlik"
            }
          },
          "security": {
            "title": "Güvenlik"
          },
          "board": {
            "title": "Paneller"
          }
        },
        "list": {
          "metaTitle": "Kullanıcıları yönet",
          "title": "Kullanıcılar"
        },
        "create": {
          "metaTitle": "Kullanıcı ekle",
          "step": {
            "security": {
              "label": "Güvenlik"
            }
          }
        },
        "invite": {
          "title": "Kullanıcı davetlerini yönet",
          "action": {
            "new": {
              "description": "Süre sona erdikten sonra davet artık geçerli olmayacak ve daveti alan kişi bir hesap oluşturamayacaktır."
            },
            "copy": {
              "link": "Davet bağlantısı"
            },
            "delete": {
              "title": "Daveti sil",
              "description": "Bu daveti silmek istediğinizden emin misiniz? Bu bağlantıya sahip kullanıcılar artık bu bağlantıyı kullanarak hesap oluşturamayacaktır."
            }
          },
          "field": {
            "id": {
              "label": "Kimlik"
            },
            "creator": {
              "label": "Oluşturan"
            },
            "expirationDate": {
              "label": "Son geçerlilik tarihi"
            },
            "token": {
              "label": "Erişim Anahtarı"
            }
          }
        }
      },
      "group": {
        "setting": {
          "general": {
            "title": "Genel"
          }
        }
      },
      "settings": {
        "title": "Ayarlar"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Çalışıyor",
            "error": "Hata"
          },
          "job": {
            "mediaServer": {
              "label": "Medya Sunucusu"
            },
            "mediaRequests": {
              "label": "Medya talepleri"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Dokümantasyon"
            },
            "apiKey": {
              "table": {
                "header": {
                  "id": "Kimlik"
                }
              }
            }
          }
        }
      }
    }
  },
  "docker": {
    "title": "Konteyner",
    "field": {
      "name": {
        "label": "İsim"
      },
      "state": {
        "label": "Durum",
        "option": {
          "created": "Oluşturuldu",
          "running": "Çalışıyor",
          "paused": "Duraklatıldı",
          "restarting": "Yeniden başlatılıyor",
          "removing": "Kaldırılıyor"
        }
      },
      "containerImage": {
        "label": "İmaj"
      },
      "ports": {
        "label": "Bağlantı noktaları"
      }
    },
    "action": {
      "start": {
        "label": "Başlat"
      },
      "stop": {
        "label": "Durdur"
      },
      "restart": {
        "label": "Yeniden Başlat"
      },
      "remove": {
        "label": "Kaldır"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Kullanıcılar"
    },
    "field": {
      "user": {
        "label": "Kullanıcı"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Yönet",
      "boards": {
        "label": "Paneller"
      },
      "integrations": {
        "edit": {
          "label": "Düzenle"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Düzenle"
        }
      },
      "apps": {
        "label": "Uygulamalar",
        "edit": {
          "label": "Düzenle"
        }
      },
      "users": {
        "label": "Kullanıcılar",
        "create": {
          "label": "Oluştur"
        },
        "general": "Genel",
        "security": "Güvenlik",
        "board": "Paneller",
        "invites": {
          "label": "Davetler"
        }
      },
      "tools": {
        "label": "Araçlar",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Ayarlar"
      },
      "about": {
        "label": "Hakkında"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Uygulamalar"
          },
          "board": {
            "title": "Paneller"
          }
        }
      },
      "external": {
        "group": {
          "searchEngine": {
            "option": {
              "torrent": {
                "name": "Torrentler"
              }
            }
          }
        }
      },
      "help": {
        "group": {
          "help": {
            "title": "Yardım",
            "option": {
              "documentation": {
                "label": "Dokümantasyon"
              },
              "discord": {
                "label": "Discord Topluluğu"
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
                "label": "Kullanıcıları yönet"
              },
              "about": {
                "label": "Hakkında"
              },
              "preferences": {
                "label": "Tercihleriniz"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Kullanıcılar"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "İsim"
        }
      }
    }
  }
} as const;