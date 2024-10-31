import "dayjs/locale/ru";

import dayjs from "dayjs";
import { MRT_Localization_RU } from "mantine-react-table/locales/ru/index.esm.mjs";

dayjs.locale("ru");

export default {
  user: {
    title: "Пользователи",
    name: "Пользователь",
    field: {
      email: {
        label: "E-Mail",
      },
      username: {
        label: "Имя пользователя",
      },
      password: {
        label: "Пароль",
        requirement: {
          lowercase: "Включает строчную букву",
          uppercase: "Включает заглавную букву",
          number: "Включает цифру",
        },
      },
      passwordConfirm: {
        label: "Подтвердите пароль",
      },
    },
    action: {
      login: {
        label: "Вход в систему",
      },
      register: {
        label: "Создать аккаунт",
        notification: {
          success: {
            title: "Аккаунт создан",
          },
        },
      },
      create: "Создать пользователя",
    },
  },
  group: {
    field: {
      name: "Имя",
    },
    permission: {
      admin: {
        title: "Администратор",
      },
      board: {
        title: "Панели",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "Приложения",
      },
    },
    field: {
      name: {
        label: "Имя",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "Имя",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "Неверный URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "Имя пользователя",
        },
        password: {
          label: "Пароль",
          newLabel: "Новый пароль",
        },
      },
    },
  },
  media: {
    field: {
      name: "Имя",
      size: "Размер",
      creator: "Создатель",
    },
  },
  common: {
    direction: "ltr",
    error: "Ошибка",
    action: {
      add: "Добавить",
      apply: "Применить",
      create: "Создать",
      edit: "Изменить",
      insert: "Вставить",
      remove: "Удалить",
      save: "Сохранить",
      saveChanges: "Сохранить изменения",
      cancel: "Отмена",
      delete: "Удалить",
      confirm: "Подтвердить",
      previous: "Предыдущий",
      next: "Далее",
      tryAgain: "Попробовать снова",
    },
    information: {
      hours: "Часы",
      minutes: "Минуты",
    },
    userAvatar: {
      menu: {
        preferences: "Ваши настройки",
        login: "Вход в систему",
      },
    },
    dangerZone: "Зона опасности",
    noResults: "Результаты не найдены",
    zod: {
      errors: {
        default: "Данное поле недействительно",
        required: "Это поле обязательно",
      },
    },
    mantineReactTable: MRT_Localization_RU as Readonly<Record<keyof typeof MRT_Localization_RU, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "Имя",
        },
      },
      action: {
        moveUp: "Переместить вверх",
        moveDown: "Переместить вниз",
      },
      menu: {
        label: {
          changePosition: "Изменить положение",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "Настройки",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "Ширина",
        },
        height: {
          label: "Высота",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "Открыть в новой вкладке",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "Макет",
          option: {
            row: {
              label: "Горизонтальный",
            },
            column: {
              label: "Вертикальный",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "Заблокировано сегодня",
        adsBlockedTodayPercentage: "Заблокировано сегодня",
        dnsQueriesToday: "запросов сегодня",
      },
    },
    dnsHoleControls: {
      description: "Управляйте PiHole или AdGuard прямо с вашей панели",
      option: {
        layout: {
          label: "Макет",
          option: {
            row: {
              label: "Горизонтальный",
            },
            column: {
              label: "Вертикальный",
            },
          },
        },
      },
      controls: {
        set: "Установить",
        enabled: "Включено",
        disabled: "Отключено",
        hours: "Часы",
        minutes: "Минуты",
      },
    },
    clock: {
      description: "Отображает текущую дату и время.",
      option: {
        timezone: {
          label: "Часовой пояс",
        },
      },
    },
    notebook: {
      name: "Блокнот",
      option: {
        showToolbar: {
          label: "Показать панель инструментов для написания текста с использованием разметки Markdown",
        },
        allowReadOnlyCheck: {
          label: 'Разрешить проверку в режиме "только для чтения"',
        },
        content: {
          label: "Содержимое блокнота",
        },
      },
      controls: {
        bold: "Жирный",
        italic: "Курсив",
        strikethrough: "Зачеркнутый",
        underline: "Подчеркнутый",
        colorText: "Цвет текста",
        colorHighlight: "Выделение текста цветом",
        code: "Код",
        clear: "Очистить форматирование",
        blockquote: "Цитата",
        horizontalLine: "Горизонтальная линия",
        bulletList: "Маркированный список",
        orderedList: "Нумерованный список",
        checkList: "Чек-лист",
        increaseIndent: "Увеличить отступ",
        decreaseIndent: "Уменьшить отступ",
        link: "Ссылка",
        unlink: "Удалить ссылку",
        image: "Вставить изображение",
        addTable: "Добавить таблицу",
        deleteTable: "Удалить таблицу",
        colorCell: "Цвет ячейки",
        mergeCell: "Переключить объединение ячеек",
        addColumnLeft: "Добавить столбец перед",
        addColumnRight: "Добавить столбец после",
        deleteColumn: "Удалить столбец",
        addRowTop: "Добавить строку перед",
        addRowBelow: "Добавить строку после",
        deleteRow: "Удалить строку",
      },
      align: {
        left: "Слева",
        center: "По центру",
        right: "Справа",
      },
      popover: {
        clearColor: "Очистить цвет",
        source: "Источник",
        widthPlaceholder: "Значение в % или пикселях",
        columns: "Столбцы",
        rows: "Строки",
        width: "Ширина",
        height: "Высота",
      },
    },
    iframe: {
      name: "iFrame",
      description: "Встраиваемое содержимое из интернета. Некоторые веб-сайты могут ограничивать доступ.",
      option: {
        embedUrl: {
          label: "URL-адрес на встраивание",
        },
        allowFullScreen: {
          label: "Разрешить полноэкранный режим",
        },
        allowTransparency: {
          label: "Разрешить прозрачность",
        },
        allowScrolling: {
          label: "Разрешить прокрутку",
        },
        allowPayment: {
          label: "Разрешить оплату",
        },
        allowAutoPlay: {
          label: "Разрешить авто воспроизведение",
        },
        allowMicrophone: {
          label: "Разрешить микрофон",
        },
        allowCamera: {
          label: "Разрешить камеру",
        },
        allowGeolocation: {
          label: "Разрешить геолокацию",
        },
      },
      error: {
        noBrowerSupport: "Ваш браузер не поддерживает iframes. Пожалуйста, обновите свой браузер.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "ID объекта",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "Отображаемое имя",
        },
        automationId: {
          label: "ID автоматизации",
        },
      },
    },
    calendar: {
      name: "Календарь",
      option: {
        releaseType: {
          label: "Тип релиза в Radarr",
        },
      },
    },
    weather: {
      name: "Погода",
      description: "Отображает текущую информацию о погоде для заданного местоположения.",
      option: {
        location: {
          label: "Местоположение",
        },
      },
      kind: {
        clear: "Ясно",
        mainlyClear: "Малооблачно",
        fog: "Туман",
        drizzle: "Морось",
        freezingDrizzle: "Изморозь, возможен гололёд",
        rain: "Дождь",
        freezingRain: "Моросящий дождь",
        snowFall: "Снегопад",
        snowGrains: "Снежные зерна",
        rainShowers: "Ливень",
        snowShowers: "Снегопад",
        thunderstorm: "Гроза",
        thunderstormWithHail: "Гроза с градом",
        unknown: "Неизвестно",
      },
    },
    indexerManager: {
      name: "Статус менеджера индексаторов",
      title: "Статус менеджера индексаторов",
      testAll: "Тестировать все",
    },
    healthMonitoring: {
      name: "Мониторинг состояния системы",
      description: "Отображает информацию о состоянии и статусе вашей системы(систем).",
      option: {
        fahrenheit: {
          label: "Температура процессора в градусах Фаренгейта",
        },
        cpu: {
          label: "Показывать информацию о процессоре",
        },
        memory: {
          label: "Показать информацию о памяти",
        },
        fileSystem: {
          label: "Показать информацию о файловой системе",
        },
      },
      popover: {
        available: "Доступен",
      },
    },
    common: {
      location: {
        search: "Поиск",
        table: {
          header: {},
          population: {
            fallback: "Неизвестно",
          },
        },
      },
    },
    video: {
      name: "Трансляция видео",
      description: "Встраивание видео или прямой трансляции видео с камеры или веб-сайта",
      option: {
        feedUrl: {
          label: "URL-адрес потока",
        },
        hasAutoPlay: {
          label: "Автовоспроизведение",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "Дата добавления",
        },
        downSpeed: {
          columnTitle: "Загрузка",
          detailsTitle: "Скорость скачивания",
        },
        integration: {
          columnTitle: "Интеграция",
        },
        progress: {
          columnTitle: "Прогресс",
        },
        ratio: {
          columnTitle: "Рейтинг",
        },
        state: {
          columnTitle: "Состояние",
        },
        upSpeed: {
          columnTitle: "Отдача",
        },
      },
      states: {
        downloading: "Скачивается",
        queued: "Очередь",
        paused: "Приостановлено",
        completed: "Завершено",
        unknown: "Неизвестно",
      },
    },
    "mediaRequests-requestList": {
      description: "Просмотреть список всех медиа-запросов из вашего экземпляра Overseerr или Jellyseerr",
      option: {
        linksTargetNewTab: {
          label: "Открывать ссылки в новой вкладке",
        },
      },
      availability: {
        unknown: "Неизвестно",
        partiallyAvailable: "Частично",
        available: "Доступен",
      },
    },
    "mediaRequests-requestStats": {
      description: "Статистика ваших медиазапросов",
      titles: {
        stats: {
          main: "Статистика медиа",
          approved: "Уже одобрено",
          pending: "Ожидающие утверждения",
          tv: "Запросы сериалов",
          movie: "Запросы фильмов",
          total: "Всего",
        },
        users: {
          main: "Топ пользователей",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "Приложения",
          },
          screenSize: {
            option: {
              sm: "Маленький",
              md: "Средний",
              lg: "Большой",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "Закрепление фонового изображения",
      },
      backgroundImageSize: {
        label: "Размер фонового изображения",
      },
      primaryColor: {
        label: "Основной цвет",
      },
      secondaryColor: {
        label: "Дополнительный цвет",
      },
      customCss: {
        description:
          "Дополнительная настройка вашей панели с использованием CSS, рекомендуется только опытным пользователям",
      },
      name: {
        label: "Имя",
      },
      isPublic: {
        label: "Публичный",
      },
    },
    setting: {
      section: {
        general: {
          title: "Общие",
        },
        layout: {
          title: "Макет",
        },
        background: {
          title: "Фон",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "Просмотр панели",
              },
            },
          },
        },
        dangerZone: {
          title: "Зона опасности",
          action: {
            delete: {
              confirm: {
                title: "Удалить панель",
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
        home: "Главная",
        boards: "Панели",
        apps: "Приложения",
        users: {
          label: "Пользователи",
          items: {
            manage: "Управление",
            invites: "Приглашения",
          },
        },
        tools: {
          label: "Инструменты",
          items: {
            docker: "Docker",
            api: "API",
          },
        },
        settings: "Настройки",
        help: {
          label: "Помощь",
          items: {
            documentation: "Документация",
            discord: "Сообщество Discord",
          },
        },
        about: "О программе",
      },
    },
    page: {
      home: {
        statistic: {
          board: "Панели",
          user: "Пользователи",
          invite: "Приглашения",
          app: "Приложения",
        },
        statisticLabel: {
          boards: "Панели",
        },
      },
      board: {
        title: "Ваши панели",
        action: {
          settings: {
            label: "Настройки",
          },
          setHomeBoard: {
            badge: {
              label: "Главная",
            },
          },
          delete: {
            label: "Удалить навсегда",
            confirm: {
              title: "Удалить панель",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "Имя",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "Общие",
            item: {
              firstDayOfWeek: "Первый день недели",
              accessibility: "Доступность",
            },
          },
          security: {
            title: "Безопасность",
          },
          board: {
            title: "Панели",
          },
        },
        list: {
          metaTitle: "Управлять пользователями",
          title: "Пользователи",
        },
        create: {
          metaTitle: "Создать пользователя",
          step: {
            security: {
              label: "Безопасность",
            },
          },
        },
        invite: {
          title: "Управление приглашениями пользователей",
          action: {
            new: {
              description:
                "По истечении этого срока приглашение перестает быть действительным, и получатель приглашения не сможет создать аккаунт.",
            },
            copy: {
              link: "Ссылка на приглашение",
            },
            delete: {
              title: "Удалить приглашение",
              description:
                "Вы уверены, что хотите удалить это приглашение? Пользователи, получившие эту ссылку, больше не смогут создать аккаунт по этой ссылке.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "Создатель",
            },
            expirationDate: {
              label: "Срок действия",
            },
            token: {
              label: "Токен",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "Общие",
          },
        },
      },
      settings: {
        title: "Настройки",
      },
      tool: {
        tasks: {
          status: {
            running: "Работает",
            error: "Ошибка",
          },
          job: {
            mediaServer: {
              label: "Медиасервер",
            },
            mediaRequests: {
              label: "Запросы на медиа",
            },
          },
        },
        api: {
          title: "API",
          tab: {
            documentation: {
              label: "Документация",
            },
            apiKey: {
              table: {
                header: {
                  id: "ID",
                },
              },
            },
          },
        },
      },
    },
  },
  docker: {
    title: "Контейнеры",
    field: {
      name: {
        label: "Имя",
      },
      state: {
        label: "Состояние",
        option: {
          created: "Создан",
          running: "Работает",
          paused: "Приостановлено",
          restarting: "Перезапуск",
          removing: "Удаление",
        },
      },
      containerImage: {
        label: "Образ",
      },
      ports: {
        label: "Порты",
      },
    },
    action: {
      start: {
        label: "Запустить",
      },
      stop: {
        label: "Остановить",
      },
      restart: {
        label: "Перезапустить",
      },
      remove: {
        label: "Удалить",
      },
    },
  },
  permission: {
    tab: {
      user: "Пользователи",
    },
    field: {
      user: {
        label: "Пользователь",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "Управление",
      boards: {
        label: "Панели",
      },
      integrations: {
        edit: {
          label: "Изменить",
        },
      },
      "search-engines": {
        edit: {
          label: "Изменить",
        },
      },
      apps: {
        label: "Приложения",
        edit: {
          label: "Изменить",
        },
      },
      users: {
        label: "Пользователи",
        create: {
          label: "Создать",
        },
        general: "Общие",
        security: "Безопасность",
        board: "Панели",
        invites: {
          label: "Приглашения",
        },
      },
      tools: {
        label: "Инструменты",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "Настройки",
      },
      about: {
        label: "О программе",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "Приложения",
          },
          board: {
            title: "Панели",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "Торренты",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "Помощь",
            option: {
              documentation: {
                label: "Документация",
              },
              discord: {
                label: "Сообщество Discord",
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
                label: "Управлять пользователями",
              },
              about: {
                label: "О программе",
              },
              preferences: {
                label: "Ваши настройки",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "Пользователи",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "Имя",
        },
      },
    },
  },
} as const;
