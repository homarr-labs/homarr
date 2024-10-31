import "dayjs/locale/he";

import dayjs from "dayjs";
import { MRT_Localization_HE } from "mantine-react-table/locales/he/index.esm.mjs";

dayjs.locale("he");

export default {
  user: {
    title: "משתמשים",
    name: "משתמש",
    field: {
      email: {
        label: "אימייל",
      },
      username: {
        label: "שם משתמש",
      },
      password: {
        label: "סיסמה",
        requirement: {
          lowercase: "אפשר אותיות קטנות",
          uppercase: "אפשר אותיות גדולות",
          number: "אפשר מספרים",
        },
      },
      passwordConfirm: {
        label: "אימות סיסמא",
      },
    },
    action: {
      login: {
        label: "התחבר/י",
      },
      register: {
        label: "צור חשבון",
        notification: {
          success: {
            title: "החשבון נוצר",
          },
        },
      },
      create: "צור משתמש",
    },
  },
  group: {
    field: {
      name: "שם",
    },
    permission: {
      admin: {
        title: "מנהל מערכת",
      },
      board: {
        title: "לוחות",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "אפליקציות",
      },
    },
    field: {
      name: {
        label: "שם",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "שם",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "קישור לא תקין",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "שם משתמש",
        },
        password: {
          label: "סיסמה",
          newLabel: "סיסמה חדשה",
        },
      },
    },
  },
  media: {
    field: {
      name: "שם",
      size: "גודל",
      creator: "יוצר",
    },
  },
  common: {
    direction: "rtl",
    error: "שגיאה",
    action: {
      add: "הוסף",
      apply: "החל",
      create: "צור",
      edit: "עריכה",
      insert: "הוספה",
      remove: "הסר",
      save: "שמור",
      saveChanges: "שמור שינויים",
      cancel: "בטל",
      delete: "מחיקה",
      confirm: "לאשר",
      previous: "הקודם",
      next: "הבא",
      tryAgain: "נא לנסות שוב",
    },
    information: {
      hours: "שעות",
      minutes: "דקות",
    },
    userAvatar: {
      menu: {
        preferences: "העדפות שלך",
        login: "התחבר/י",
      },
    },
    dangerZone: "אזור מסוכן",
    noResults: "לא נמצאו תוצאות",
    zod: {
      errors: {
        default: "שדה זה אינו חוקי",
        required: "זהו שדה חובה",
      },
    },
    mantineReactTable: MRT_Localization_HE as Readonly<Record<keyof typeof MRT_Localization_HE, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "שם",
        },
      },
      action: {
        moveUp: "הזזה למעלה",
        moveDown: "הזזה למטה",
      },
      menu: {
        label: {
          changePosition: "שנה מיקום",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "הגדרות",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "רוחב",
        },
        height: {
          label: "גובה",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "פתיחה בכרטיסיה חדשה",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "פריסה",
          option: {
            row: {
              label: "אופקי",
            },
            column: {
              label: "אנכי",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "נחסמו היום",
        adsBlockedTodayPercentage: "נחסמו היום",
        dnsQueriesToday: "שאילתות היום",
      },
    },
    dnsHoleControls: {
      description: "שלוט ב-PiHole או ב-AdGuard מלוח המחוונים שלך",
      option: {
        layout: {
          label: "פריסה",
          option: {
            row: {
              label: "אופקי",
            },
            column: {
              label: "אנכי",
            },
          },
        },
      },
      controls: {
        set: "הגדר",
        enabled: "מאופשר",
        disabled: "מושבת",
        hours: "שעות",
        minutes: "דקות",
      },
    },
    clock: {
      description: "מציג את התאריך והשעה הנוכחיים.",
      option: {
        timezone: {
          label: "אזור זמן",
        },
      },
    },
    notebook: {
      name: "פנקס רשימות",
      option: {
        showToolbar: {
          label: "הצג את סרגל הכלים לסיוע כתיבת סימון",
        },
        allowReadOnlyCheck: {
          label: "אפשר בדיקה במצב קריאה בלבד",
        },
        content: {
          label: "תוכן פנקס הרשימות",
        },
      },
      controls: {
        bold: "מודגש",
        italic: "נטוי",
        strikethrough: "קו חוצה",
        underline: "קו תחתון",
        colorText: "טקסט צבעוני",
        colorHighlight: "טקסט סימון צבעוני",
        code: "קוד",
        clear: "נקה עיצוב",
        blockquote: "ציטוט",
        horizontalLine: "קו אופקי",
        bulletList: "רשימת תבליט",
        orderedList: "רשימה מסודרת",
        checkList: "צ'ק ליסט",
        increaseIndent: "הגדלת הזחה",
        decreaseIndent: "הקטנת הזחה",
        link: "קישור",
        unlink: "הסרת קישור",
        image: "הטמעת תמונה",
        addTable: "הוספת טבלה",
        deleteTable: "מחיקת טבלה",
        colorCell: "טקסט צבעוני",
        mergeCell: "החלפת מיזוג התא",
        addColumnLeft: "הוספת עמודה לפני",
        addColumnRight: "הוספת עמודה אחרי",
        deleteColumn: "מחיקת עמודה",
        addRowTop: "הוספת שורה לפני",
        addRowBelow: "הוספת שורה אחרי",
        deleteRow: "מחיקת שורה",
      },
      align: {
        left: "שמאל",
        center: "מרכז",
        right: "ימין",
      },
      popover: {
        clearColor: "ניקוי צבע",
        source: "מקור",
        widthPlaceholder: "ערך באחוזים או בפיקסלים",
        columns: "עמודות",
        rows: "שורות",
        width: "רוחב",
        height: "גובה",
      },
    },
    iframe: {
      name: "iFrame",
      description: "הטמע כל תוכן מהאינטרנט. חלק מהאתרים עשויים להגביל את הגישה.",
      option: {
        embedUrl: {
          label: "הטמע כתובת אתר",
        },
        allowFullScreen: {
          label: "הרשאה למסך מלא",
        },
        allowTransparency: {
          label: "אפשר שקיפות",
        },
        allowScrolling: {
          label: "אפשר גלילה",
        },
        allowPayment: {
          label: "אפשר תשלום",
        },
        allowAutoPlay: {
          label: "אפשר הפעלה אוטומטית",
        },
        allowMicrophone: {
          label: "אפשר מיקרופון",
        },
        allowCamera: {
          label: "אפשר מצלמה",
        },
        allowGeolocation: {
          label: "אפשר מיקום גיאוגרפי",
        },
      },
      error: {
        noBrowerSupport: "הדפדפן שלך אינו תומך ב-iframes. נא עדכן את הדפדפן שלך.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "מזהה ישות",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "הצג שם",
        },
        automationId: {
          label: "מזהה אוטומציה",
        },
      },
    },
    calendar: {
      name: "לוח שנה",
      option: {
        releaseType: {
          label: "סוג שחרור של Radarr",
        },
      },
    },
    weather: {
      name: "מזג אוויר",
      description: "מציג את מידע מזג האוויר הנוכחי של מיקום מוגדר.",
      option: {
        location: {
          label: "מיקום מזג האוויר",
        },
      },
      kind: {
        clear: "בהיר",
        mainlyClear: "בהיר בעיקר",
        fog: "ערפל",
        drizzle: "טפטוף",
        freezingDrizzle: "טפטוף מקפיא",
        rain: "גשום",
        freezingRain: "גשם מקפיא",
        snowFall: "שלג יורד",
        snowGrains: "פתיתי שלג",
        rainShowers: "ממטרי גשם",
        snowShowers: "ממטרי שלג",
        thunderstorm: "סופת רעמים",
        thunderstormWithHail: "סופת רעמים עם ברד",
        unknown: "לא ידוע",
      },
    },
    indexerManager: {
      name: "סטטוס מנהל אינדקס",
      title: "מנהל אינדקס",
      testAll: "בדוק הכל",
    },
    healthMonitoring: {
      name: "ניטור בריאות המערכת",
      description: "מציג מידע המציג את התקינות והסטטוס של המערכות שלך.",
      option: {
        fahrenheit: {
          label: "טמפרטורת המעבד בפרנהייט",
        },
        cpu: {
          label: "הצג מידע על המעבד",
        },
        memory: {
          label: "הצג מידע זיכרון",
        },
        fileSystem: {
          label: "הצג מידע על מערכת הקבצים",
        },
      },
      popover: {
        available: "זמין",
      },
    },
    common: {
      location: {
        search: "חיפוש",
        table: {
          header: {},
          population: {
            fallback: "לא ידוע",
          },
        },
      },
    },
    video: {
      name: "זרם וידאו",
      description: "הטמע זרם וידאו או וידאו ממצלמה או אתר אינטרנט",
      option: {
        feedUrl: {
          label: "כתובת הזנה",
        },
        hasAutoPlay: {
          label: "הפעלה אוטומטית",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "נוסף בתאריך",
        },
        downSpeed: {
          columnTitle: "הורדה",
          detailsTitle: "מהירות הורדה",
        },
        integration: {
          columnTitle: "אינטגרציה",
        },
        progress: {
          columnTitle: "התקדמות",
        },
        ratio: {
          columnTitle: "יחס",
        },
        state: {
          columnTitle: "מצב",
        },
        upSpeed: {
          columnTitle: "העלאה",
        },
      },
      states: {
        downloading: "מוריד",
        queued: "בתור",
        paused: "מושהה",
        completed: "הושלם",
        unknown: "לא ידוע",
      },
    },
    "mediaRequests-requestList": {
      description: "ראה רשימה של כל בקשות המדיה ממופע Overseerr או Jellyseerr שלך",
      option: {
        linksTargetNewTab: {
          label: "פתח לינק בלשונית חדשה",
        },
      },
      availability: {
        unknown: "לא ידוע",
        partiallyAvailable: "חלקי",
        available: "זמין",
      },
    },
    "mediaRequests-requestStats": {
      description: "סטטיסטיקה לגבי בקשות המדיה",
      titles: {
        stats: {
          main: "סטטיסטיקות מדיה",
          approved: "כבר אושר",
          pending: "ממתין לאישור",
          tv: "בקשות סדרות",
          movie: "בקשות סרטים",
          total: "סך הכל",
        },
        users: {
          main: "משתמשים מובילים",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "אפליקציות",
          },
          screenSize: {
            option: {
              sm: "קטן",
              md: "בינוני",
              lg: "גדול",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "צירוף תמונת רקע",
      },
      backgroundImageSize: {
        label: "גודל תמונת רקע",
      },
      primaryColor: {
        label: "צבע ראשי",
      },
      secondaryColor: {
        label: "צבע משני",
      },
      customCss: {
        description: "יתר על כן, התאם את לוח המחוונים שלך באמצעות CSS, מומלץ רק למשתמשים מנוסים",
      },
      name: {
        label: "שם",
      },
      isPublic: {
        label: "ציבורי",
      },
    },
    setting: {
      section: {
        general: {
          title: "כללי",
        },
        layout: {
          title: "פריסה",
        },
        background: {
          title: "רקע",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "צפייה בלוח",
              },
            },
          },
        },
        dangerZone: {
          title: "אזור מסוכן",
          action: {
            delete: {
              confirm: {
                title: "מחיקת לוח",
              },
            },
          },
        },
      },
    },
  },
  management: {
    navbar: {
      items: {
        home: "מסך הבית",
        boards: "לוחות",
        apps: "אפליקציות",
        users: {
          label: "משתמשים",
          items: {
            manage: "ניהול",
            invites: "הזמנות",
          },
        },
        tools: {
          label: "כלים",
          items: {
            docker: "דוקר",
            api: "ממשק API",
          },
        },
        settings: "הגדרות",
        help: {
          label: "עזרה",
          items: {
            documentation: "תיעוד",
            discord: "קהילת דיסקורד",
          },
        },
        about: "אודות",
      },
    },
    page: {
      home: {
        statistic: {
          board: "לוחות",
          user: "משתמשים",
          invite: "הזמנות",
          app: "אפליקציות",
        },
        statisticLabel: {
          boards: "לוחות",
        },
      },
      board: {
        title: "הלוחות שלך",
        action: {
          settings: {
            label: "הגדרות",
          },
          setHomeBoard: {
            badge: {
              label: "מסך הבית",
            },
          },
          delete: {
            label: "מחיקה לצמיתות",
            confirm: {
              title: "מחיקת לוח",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "שם",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "כללי",
            item: {
              firstDayOfWeek: "היום הראשון בשבוע",
              accessibility: "נגישות",
            },
          },
          security: {
            title: "אבטחה",
          },
          board: {
            title: "לוחות",
          },
        },
        list: {
          metaTitle: "ניהול משתמשים",
          title: "משתמשים",
        },
        create: {
          metaTitle: "צור משתמש",
          step: {
            security: {
              label: "אבטחה",
            },
          },
        },
        invite: {
          title: "נהל הזמנות משתמש",
          action: {
            new: {
              description: "לאחר התפוגה, הזמנה לא תהיה תקפה יותר ומקבל ההזמנה לא יוכל ליצור חשבון.",
            },
            copy: {
              link: "קישור הזמנה",
            },
            delete: {
              title: "מחיקת הזמנה",
              description:
                "האם אתה בטוח שברצונך למחוק את ההזמנה הזו? משתמשים עם קישור זה לא יוכלו עוד ליצור חשבון באמצעות קישור זה.",
            },
          },
          field: {
            id: {
              label: "מספר מזהה",
            },
            creator: {
              label: "יוצר",
            },
            expirationDate: {
              label: "תאריך תפוגה",
            },
            token: {
              label: "טוקן",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "כללי",
          },
        },
      },
      settings: {
        title: "הגדרות",
      },
      tool: {
        tasks: {
          status: {
            running: "פועל",
            error: "שגיאה",
          },
          job: {
            mediaServer: {
              label: "שרת מדיה",
            },
            mediaRequests: {
              label: "בקשות מדיה",
            },
          },
        },
        api: {
          title: "ממשק API",
          tab: {
            documentation: {
              label: "תיעוד",
            },
            apiKey: {
              table: {
                header: {
                  id: "מספר מזהה",
                },
              },
            },
          },
        },
      },
    },
  },
  docker: {
    title: "מיכלים",
    field: {
      name: {
        label: "שם",
      },
      state: {
        label: "מצב",
        option: {
          created: "נוצר",
          running: "פועל",
          paused: "מושהה",
          restarting: "מפעיל מחדש",
          removing: "מסיר",
        },
      },
      containerImage: {
        label: "קובץ תמונה",
      },
      ports: {
        label: "יציאות",
      },
    },
    action: {
      start: {
        label: "התחל",
      },
      stop: {
        label: "עצור",
      },
      restart: {
        label: "אתחל",
      },
      remove: {
        label: "הסר",
      },
    },
  },
  permission: {
    tab: {
      user: "משתמשים",
    },
    field: {
      user: {
        label: "משתמש",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "ניהול",
      boards: {
        label: "לוחות",
      },
      integrations: {
        edit: {
          label: "עריכה",
        },
      },
      "search-engines": {
        edit: {
          label: "עריכה",
        },
      },
      apps: {
        label: "אפליקציות",
        edit: {
          label: "עריכה",
        },
      },
      users: {
        label: "משתמשים",
        create: {
          label: "צור",
        },
        general: "כללי",
        security: "אבטחה",
        board: "לוחות",
        invites: {
          label: "הזמנות",
        },
      },
      tools: {
        label: "כלים",
        docker: {
          label: "דוקר",
        },
      },
      settings: {
        label: "הגדרות",
      },
      about: {
        label: "אודות",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "אפליקציות",
          },
          board: {
            title: "לוחות",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "טורנטים",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "עזרה",
            option: {
              documentation: {
                label: "תיעוד",
              },
              discord: {
                label: "קהילת דיסקורד",
              },
            },
          },
        },
      },
      page: {
        group: {
          page: {
            option: {
              manageUser: {
                label: "ניהול משתמשים",
              },
              about: {
                label: "אודות",
              },
              preferences: {
                label: "העדפות שלך",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "משתמשים",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "שם",
        },
      },
    },
  },
} as const;
