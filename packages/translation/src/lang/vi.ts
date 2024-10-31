import "dayjs/locale/vi";
import dayjs from "dayjs";
dayjs.locale("vi");

export default {
  "user": {
    "title": "Người dùng",
    "name": "Người dùng",
    "field": {
      "email": {
        "label": "E-mail"
      },
      "username": {
        "label": "Tên người dùng"
      },
      "password": {
        "label": "Mật khẩu",
        "requirement": {
          "lowercase": "Bao gồm chữ thường",
          "uppercase": "Bao gồm chữ in hoa",
          "number": "Bao gồm số"
        }
      },
      "passwordConfirm": {
        "label": "Xác nhận mật khẩu"
      }
    },
    "action": {
      "login": {
        "label": "Đăng nhập"
      },
      "register": {
        "label": "Tạo tài khoản",
        "notification": {
          "success": {
            "title": "Tài khoản đã được tạo"
          }
        }
      },
      "create": "Tạo người dùng"
    }
  },
  "group": {
    "field": {
      "name": "Tên"
    },
    "permission": {
      "admin": {
        "title": "Quản trị viên"
      },
      "board": {
        "title": "Bảng"
      }
    }
  },
  "app": {
    "page": {
      "list": {
        "title": "Ứng dụng"
      }
    },
    "field": {
      "name": {
        "label": "Tên"
      }
    }
  },
  "integration": {
    "field": {
      "name": {
        "label": "Tên"
      }
    },
    "testConnection": {
      "notification": {
        "invalidUrl": {
          "title": "URL không hợp lệ"
        }
      }
    },
    "secrets": {
      "kind": {
        "username": {
          "label": "Tên người dùng"
        },
        "password": {
          "label": "Mật khẩu",
          "newLabel": "Mật khẩu mới"
        }
      }
    }
  },
  "media": {
    "field": {
      "name": "Tên",
      "size": "Kích cỡ",
      "creator": "Người sáng tạo"
    }
  },
  "common": {
    "error": "Lỗi",
    "action": {
      "add": "Thêm",
      "apply": "Áp dụng",
      "create": "Tạo nên",
      "edit": "Sửa",
      "insert": "Thêm",
      "remove": "Xóa",
      "save": "Lưu",
      "saveChanges": "Lưu thay đổi",
      "cancel": "Hủy",
      "delete": "Xóa",
      "confirm": "Xác nhận",
      "previous": "Trước",
      "next": "Kế tiếp",
      "tryAgain": "Thử lại"
    },
    "information": {
      "hours": "Giờ",
      "minutes": "Phút"
    },
    "userAvatar": {
      "menu": {
        "preferences": "Cá nhân hoá",
        "login": "Đăng nhập"
      }
    },
    "dangerZone": "Khu vực nguy hiểm",
    "noResults": "Không có kết quả",
    "zod": {
      "errors": {
        "default": "Trường này không hợp lệ",
        "required": "Trường này là bắt buộc"
      }
    }
  },
  "section": {
    "category": {
      "field": {
        "name": {
          "label": "Tên"
        }
      },
      "action": {
        "moveUp": "Đi lên",
        "moveDown": "Đi xuống"
      },
      "menu": {
        "label": {
          "changePosition": "Đổi vị trí"
        }
      }
    }
  },
  "item": {
    "menu": {
      "label": {
        "settings": "Cài đặt"
      }
    },
    "moveResize": {
      "field": {
        "width": {
          "label": "Chiều rộng"
        },
        "height": {
          "label": "Chiều cao"
        }
      }
    }
  },
  "widget": {
    "app": {
      "option": {
        "openInNewTab": {
          "label": "Mở trong tab mới"
        }
      }
    },
    "dnsHoleSummary": {
      "option": {
        "layout": {
          "label": "Bố cục",
          "option": {
            "row": {
              "label": "Nằm ngang"
            },
            "column": {
              "label": "Thẳng đứng"
            }
          }
        }
      },
      "data": {
        "adsBlockedToday": "Đã chặn hôm nay",
        "adsBlockedTodayPercentage": "Đã chặn hôm nay",
        "dnsQueriesToday": "Truy vấn hôm nay"
      }
    },
    "dnsHoleControls": {
      "description": "Kiểm soát PiHole hoặc AdGuard từ bảng điều khiển của bạn",
      "option": {
        "layout": {
          "label": "Bố cục",
          "option": {
            "row": {
              "label": "Nằm ngang"
            },
            "column": {
              "label": "Thẳng đứng"
            }
          }
        }
      },
      "controls": {
        "set": "Đặt",
        "enabled": "Bật",
        "disabled": "Tắt",
        "hours": "Giờ",
        "minutes": "Phút"
      }
    },
    "clock": {
      "description": "Hiện thị ngày giờ hiện tại.",
      "option": {
        "timezone": {
          "label": "Múi giờ"
        }
      }
    },
    "notebook": {
      "name": "Ghi chú",
      "option": {
        "showToolbar": {
          "label": "Hiển thị thanh công cụ giúp bạn viết markdown"
        },
        "allowReadOnlyCheck": {
          "label": "Cho phép tích dấu kiểm tra ở chế độ chỉ đọc"
        },
        "content": {
          "label": "Nội dung của ghi chú"
        }
      },
      "controls": {
        "bold": "Đậm",
        "italic": "Nghiêng",
        "strikethrough": "Gạch ngang",
        "underline": "Gạch dưới",
        "colorText": "Màu chữ",
        "colorHighlight": "Màu đánh dấu",
        "code": "Mã",
        "clear": "Xóa định dạng",
        "blockquote": "Trích dẫn",
        "horizontalLine": "Kẻ ngang",
        "bulletList": "Danh sách kiểu ký hiệu",
        "orderedList": "Danh sách đánh số",
        "checkList": "Danh sách kiểm tra",
        "increaseIndent": "Tăng thụt lề",
        "decreaseIndent": "Giảm thụt lề",
        "link": "Liên kết",
        "unlink": "Gỡ bỏ liên kết",
        "image": "Nhúng hình ảnh",
        "addTable": "Thêm bảng",
        "deleteTable": "Xóa bảng",
        "colorCell": "Màu ô",
        "mergeCell": "Bật/tắt hợp nhất ô",
        "addColumnLeft": "Thêm cột trước",
        "addColumnRight": "Thêm cột sau",
        "deleteColumn": "Xóa cột",
        "addRowTop": "Thêm dòng bên trên",
        "addRowBelow": "Thêm dòng bên dưới",
        "deleteRow": "Xóa dòng"
      },
      "align": {
        "left": "Bên trái",
        "center": "Giữa",
        "right": "Phải"
      },
      "popover": {
        "clearColor": "Xóa màu",
        "source": "Nguồn",
        "widthPlaceholder": "Giá trị tính bằng % hoặc pixel",
        "columns": "Cột",
        "rows": "Dòng",
        "width": "Chiều rộng",
        "height": "Chiều cao"
      }
    },
    "iframe": {
      "name": "iFrame",
      "description": "Nhúng bất kỳ nội dung nào từ internet. Một số trang web có thể hạn chế quyền truy cập.",
      "option": {
        "embedUrl": {
          "label": "URL nhúng"
        },
        "allowFullScreen": {
          "label": "Cho phép toàn màn hình"
        },
        "allowTransparency": {
          "label": "Cho phép trong suốt"
        },
        "allowScrolling": {
          "label": "Cho phép cuộn"
        },
        "allowPayment": {
          "label": "Cho phép thanh toán"
        },
        "allowAutoPlay": {
          "label": "Cho phép tự động phát"
        },
        "allowMicrophone": {
          "label": "Cho phép micro"
        },
        "allowCamera": {
          "label": "Cho phép camera"
        },
        "allowGeolocation": {
          "label": "Cho phép định vị"
        }
      },
      "error": {
        "noBrowerSupport": "Trình duyệt của bạn không hỗ trợ iframe. Vui lòng cập nhật trình duyệt của bạn."
      }
    },
    "smartHome-entityState": {
      "option": {
        "entityId": {
          "label": "ID thực thể"
        }
      }
    },
    "smartHome-executeAutomation": {
      "option": {
        "displayName": {
          "label": "Tên hiển thị"
        },
        "automationId": {
          "label": "ID tự động hóa"
        }
      }
    },
    "calendar": {
      "name": "Lịch",
      "option": {
        "releaseType": {
          "label": "Loại phát hành Radarr"
        }
      }
    },
    "weather": {
      "name": "Thời tiết",
      "description": "Hiển thị thông tin thời tiết của vị trí được đặt.",
      "option": {
        "location": {
          "label": "Vị trí thời tiết"
        }
      },
      "kind": {
        "clear": "Quang đãng",
        "mainlyClear": "Thông thoáng",
        "fog": "Sương mù",
        "drizzle": "Mưa phùn",
        "freezingDrizzle": "Mưa phùn đông đá",
        "rain": "Mưa",
        "freezingRain": "Mưa băng",
        "snowFall": "Tuyết rơi",
        "snowGrains": "Có hạt tuyết",
        "rainShowers": "Mưa rào",
        "snowShowers": "Mưa tuyết",
        "thunderstorm": "Bão",
        "thunderstormWithHail": "Sấm sét kèm mưa đá",
        "unknown": "Không rõ"
      }
    },
    "indexerManager": {
      "name": "",
      "title": "",
      "testAll": ""
    },
    "healthMonitoring": {
      "name": "Giám sát tình trạng hệ thống",
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
        "available": "Khả dụng"
      }
    },
    "common": {
      "location": {
        "search": "Tìm kiếm",
        "table": {
          "header": {},
          "population": {
            "fallback": "Không rõ"
          }
        }
      }
    },
    "video": {
      "name": "Luồng video",
      "description": "Nhúng luồng hoặc video từ camera hoặc trang web",
      "option": {
        "feedUrl": {
          "label": "URL nguồn"
        },
        "hasAutoPlay": {
          "label": "Tự động phát"
        }
      }
    },
    "downloads": {
      "items": {
        "added": {
          "detailsTitle": "Ngày thêm"
        },
        "downSpeed": {
          "columnTitle": "Tải xuống",
          "detailsTitle": "Tốc độ tải"
        },
        "integration": {
          "columnTitle": "Tích hợp"
        },
        "progress": {
          "columnTitle": "Tiến độ"
        },
        "ratio": {
          "columnTitle": "Tỉ lệ"
        },
        "state": {
          "columnTitle": "Trạng thái"
        },
        "upSpeed": {
          "columnTitle": "Tải lên"
        }
      },
      "states": {
        "downloading": "Đang tải",
        "queued": "",
        "paused": "Tạm dừng",
        "completed": "Đã hoàn thành",
        "unknown": "Không rõ"
      }
    },
    "mediaRequests-requestList": {
      "description": "Xem danh sách các yêu cầu đa phương tiện từ Overseerr hoặc Jellyseerr của bạn",
      "option": {
        "linksTargetNewTab": {
          "label": "Mở liên kết trong tab mới"
        }
      },
      "availability": {
        "unknown": "Không rõ",
        "partiallyAvailable": "Một phần",
        "available": "Khả dụng"
      }
    },
    "mediaRequests-requestStats": {
      "description": "Thống kê về các yêu cầu đa phương tiện của bạn",
      "titles": {
        "stats": {
          "main": "Thống kê truyền thông",
          "approved": "Đã được phê duyệt",
          "pending": "Chờ duyệt",
          "tv": "Yêu cầu TV",
          "movie": "Yêu cầu phim",
          "total": "Tổng cộng"
        },
        "users": {
          "main": "Người dùng hàng đầu"
        }
      }
    }
  },
  "board": {
    "action": {
      "oldImport": {
        "form": {
          "apps": {
            "label": "Ứng dụng"
          },
          "screenSize": {
            "option": {
              "sm": "Bé nhỏ",
              "md": "Trung bình",
              "lg": "Lớn"
            }
          }
        }
      }
    },
    "field": {
      "backgroundImageAttachment": {
        "label": "Vị trí ảnh nền"
      },
      "backgroundImageSize": {
        "label": "Kích cỡ ảnh nền"
      },
      "primaryColor": {
        "label": "Màu chính"
      },
      "secondaryColor": {
        "label": "Màu thứ cấp"
      },
      "customCss": {
        "description": "Ngoài ra có thể tùy chỉnh bảng điều khiển của bạn bằng CSS, chỉ được đề xuất cho người dùng có kinh nghiệm"
      },
      "name": {
        "label": "Tên"
      },
      "isPublic": {
        "label": "Công khai"
      }
    },
    "setting": {
      "section": {
        "general": {
          "title": "Chung"
        },
        "layout": {
          "title": "Bố cục"
        },
        "background": {
          "title": "Hình nền"
        },
        "access": {
          "permission": {
            "item": {
              "view": {
                "label": "Xem bảng"
              }
            }
          }
        },
        "dangerZone": {
          "title": "Khu vực nguy hiểm",
          "action": {
            "delete": {
              "confirm": {
                "title": "Xóa bảng"
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
        "home": "Trang chủ",
        "boards": "Bảng",
        "apps": "Ứng dụng",
        "users": {
          "label": "Người dùng",
          "items": {
            "manage": "Quản lý",
            "invites": "Mời"
          }
        },
        "tools": {
          "label": "Công cụ",
          "items": {
            "docker": "Docker",
            "api": "API"
          }
        },
        "settings": "Cài đặt",
        "help": {
          "label": "Giúp đỡ",
          "items": {
            "documentation": "Tài liệu",
            "discord": "Discord"
          }
        },
        "about": "Về chúng tôi"
      }
    },
    "page": {
      "home": {
        "statistic": {
          "board": "Bảng",
          "user": "Người dùng",
          "invite": "Mời",
          "app": "Ứng dụng"
        },
        "statisticLabel": {
          "boards": "Bảng"
        }
      },
      "board": {
        "title": "Bảng của bạn",
        "action": {
          "settings": {
            "label": "Cài đặt"
          },
          "setHomeBoard": {
            "badge": {
              "label": "Trang chủ"
            }
          },
          "delete": {
            "label": "Xóa vĩnh viễn",
            "confirm": {
              "title": "Xóa bảng"
            }
          }
        },
        "modal": {
          "createBoard": {
            "field": {
              "name": {
                "label": "Tên"
              }
            }
          }
        }
      },
      "user": {
        "setting": {
          "general": {
            "title": "Chung",
            "item": {
              "firstDayOfWeek": "Ngày đầu tiên trong tuần",
              "accessibility": "Trợ năng"
            }
          },
          "security": {
            "title": "Bảo mật"
          },
          "board": {
            "title": "Bảng"
          }
        },
        "list": {
          "metaTitle": "Quản lý người dùng",
          "title": "Người dùng"
        },
        "create": {
          "metaTitle": "Tạo người dùng",
          "step": {
            "security": {
              "label": "Bảo mật"
            }
          }
        },
        "invite": {
          "title": "Quản lý lời mời của người dùng",
          "action": {
            "new": {
              "description": "Sau khi hết hạn, lời mời sẽ không còn hiệu lực và người nhận lời mời sẽ không thể tạo tài khoản."
            },
            "copy": {
              "link": "Liên kết lời mời"
            },
            "delete": {
              "title": "Xóa lời mời",
              "description": "Bạn có chắc chắn muốn xóa lời mời này không? Người dùng có liên kết này sẽ không thể tạo tài khoản bằng liên kết đó nữa."
            }
          },
          "field": {
            "id": {
              "label": "NHẬN DẠNG"
            },
            "creator": {
              "label": "Người sáng tạo"
            },
            "expirationDate": {
              "label": "Ngày hết hạn"
            },
            "token": {
              "label": "Mã thông báo"
            }
          }
        }
      },
      "group": {
        "setting": {
          "general": {
            "title": "Chung"
          }
        }
      },
      "settings": {
        "title": "Cài đặt"
      },
      "tool": {
        "tasks": {
          "status": {
            "running": "Đang chạy",
            "error": "Lỗi"
          },
          "job": {
            "mediaServer": {
              "label": "Máy chủ đa phương tiện"
            },
            "mediaRequests": {
              "label": "Yêu cầu đa phương tiện"
            }
          }
        },
        "api": {
          "title": "API",
          "tab": {
            "documentation": {
              "label": "Tài liệu"
            },
            "apiKey": {
              "table": {
                "header": {
                  "id": "NHẬN DẠNG"
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
        "label": "Tên"
      },
      "state": {
        "label": "Trạng thái",
        "option": {
          "created": "Đã tạo",
          "running": "Đang chạy",
          "paused": "Tạm dừng",
          "restarting": "Đang khởi động lại",
          "removing": "Đang xoá"
        }
      },
      "containerImage": {
        "label": "Hình ảnh"
      },
      "ports": {
        "label": "Cổng"
      }
    },
    "action": {
      "start": {
        "label": "Bắt đầu"
      },
      "stop": {
        "label": "Dừng"
      },
      "restart": {
        "label": "Khởi động lại"
      },
      "remove": {
        "label": "Xóa"
      }
    }
  },
  "permission": {
    "tab": {
      "user": "Người dùng"
    },
    "field": {
      "user": {
        "label": "Người dùng"
      }
    }
  },
  "navigationStructure": {
    "manage": {
      "label": "Quản lý",
      "boards": {
        "label": "Bảng"
      },
      "integrations": {
        "edit": {
          "label": "Sửa"
        }
      },
      "search-engines": {
        "edit": {
          "label": "Sửa"
        }
      },
      "apps": {
        "label": "Ứng dụng",
        "edit": {
          "label": "Sửa"
        }
      },
      "users": {
        "label": "Người dùng",
        "create": {
          "label": "Tạo nên"
        },
        "general": "Chung",
        "security": "Bảo mật",
        "board": "Bảng",
        "invites": {
          "label": "Mời"
        }
      },
      "tools": {
        "label": "Công cụ",
        "docker": {
          "label": "Docker"
        }
      },
      "settings": {
        "label": "Cài đặt"
      },
      "about": {
        "label": "Về chúng tôi"
      }
    }
  },
  "search": {
    "mode": {
      "appIntegrationBoard": {
        "group": {
          "app": {
            "title": "Ứng dụng"
          },
          "board": {
            "title": "Bảng"
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
            "title": "Giúp đỡ",
            "option": {
              "documentation": {
                "label": "Tài liệu"
              },
              "discord": {
                "label": "Discord"
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
                "label": "Quản lý người dùng"
              },
              "about": {
                "label": "Về chúng tôi"
              },
              "preferences": {
                "label": "Cá nhân hoá"
              }
            }
          }
        }
      },
      "userGroup": {
        "group": {
          "user": {
            "title": "Người dùng"
          }
        }
      }
    },
    "engine": {
      "field": {
        "name": {
          "label": "Tên"
        }
      }
    }
  }
} as const;