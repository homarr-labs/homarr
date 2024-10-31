import "dayjs/locale/ko";

import dayjs from "dayjs";
import { MRT_Localization_KO } from "mantine-react-table/locales/ko/index.esm.mjs";

dayjs.locale("ko");

export default {
  user: {
    title: "사용자",
    name: "사용자",
    field: {
      email: {
        label: "이메일",
      },
      username: {
        label: "사용자 이름",
      },
      password: {
        label: "비밀번호",
        requirement: {
          lowercase: "소문자 포함",
          uppercase: "대문자 포함",
          number: "번호 포함",
        },
      },
      passwordConfirm: {
        label: "비밀번호 확인",
      },
    },
    action: {
      login: {
        label: "로그인",
      },
      register: {
        label: "계정 만들기",
        notification: {
          success: {
            title: "계정 생성",
          },
        },
      },
      create: "사용자 만들기",
    },
  },
  group: {
    field: {
      name: "이름",
    },
    permission: {
      admin: {
        title: "",
      },
      board: {
        title: "보드",
      },
    },
  },
  app: {
    page: {
      list: {
        title: "앱",
      },
    },
    field: {
      name: {
        label: "이름",
      },
    },
  },
  integration: {
    field: {
      name: {
        label: "이름",
      },
    },
    testConnection: {
      notification: {
        invalidUrl: {
          title: "잘못된 URL",
        },
      },
    },
    secrets: {
      kind: {
        username: {
          label: "사용자 이름",
        },
        password: {
          label: "비밀번호",
          newLabel: "",
        },
      },
    },
  },
  media: {
    field: {
      name: "이름",
      size: "크기",
      creator: "크리에이터",
    },
  },
  common: {
    direction: "ltr",
    error: "오류",
    action: {
      add: "추가",
      apply: "",
      create: "만들기",
      edit: "수정",
      insert: "",
      remove: "제거",
      save: "저장",
      saveChanges: "변경 사항 저장",
      cancel: "취소",
      delete: "삭제",
      confirm: "확인",
      previous: "이전",
      next: "다음",
      tryAgain: "다시 시도",
    },
    information: {
      hours: "",
      minutes: "",
    },
    userAvatar: {
      menu: {
        preferences: "기본 설정",
        login: "로그인",
      },
    },
    dangerZone: "위험한 설정",
    noResults: "결과를 찾을 수 없습니다.",
    zod: {
      errors: {
        default: "이 필드는 유효하지 않습니다.",
        required: "이 필드는 필수 입력 사항입니다.",
      },
    },
    mantineReactTable: MRT_Localization_KO as Readonly<Record<keyof typeof MRT_Localization_KO, string>>,
  },
  section: {
    category: {
      field: {
        name: {
          label: "이름",
        },
      },
      action: {
        moveUp: "위로 이동",
        moveDown: "아래로 이동",
      },
      menu: {
        label: {
          changePosition: "위치 변경",
        },
      },
    },
  },
  item: {
    menu: {
      label: {
        settings: "설정",
      },
    },
    moveResize: {
      field: {
        width: {
          label: "너비",
        },
        height: {
          label: "높이",
        },
      },
    },
  },
  widget: {
    app: {
      option: {
        openInNewTab: {
          label: "새 탭에서 열기",
        },
      },
    },
    dnsHoleSummary: {
      option: {
        layout: {
          label: "레이아웃",
          option: {
            row: {
              label: "수평",
            },
            column: {
              label: "세로",
            },
          },
        },
      },
      data: {
        adsBlockedToday: "",
        adsBlockedTodayPercentage: "",
        dnsQueriesToday: "오늘 쿼리",
      },
    },
    dnsHoleControls: {
      description: "대시보드에서 PiHole 또는 AdGuard를 제어하세요.",
      option: {
        layout: {
          label: "레이아웃",
          option: {
            row: {
              label: "수평",
            },
            column: {
              label: "세로",
            },
          },
        },
      },
      controls: {
        set: "",
        enabled: "활성화됨",
        disabled: "장애인",
        hours: "",
        minutes: "",
      },
    },
    clock: {
      description: "현재 날짜와 시간을 표시합니다.",
      option: {
        timezone: {
          label: "",
        },
      },
    },
    notebook: {
      name: "노트북",
      option: {
        showToolbar: {
          label: "마크다운 작성에 도움이 되는 도구 모음 표시",
        },
        allowReadOnlyCheck: {
          label: "",
        },
        content: {
          label: "노트북의 콘텐츠",
        },
      },
      controls: {
        bold: "",
        italic: "",
        strikethrough: "",
        underline: "",
        colorText: "",
        colorHighlight: "",
        code: "",
        clear: "",
        blockquote: "",
        horizontalLine: "",
        bulletList: "",
        orderedList: "",
        checkList: "",
        increaseIndent: "",
        decreaseIndent: "",
        link: "",
        unlink: "",
        image: "",
        addTable: "",
        deleteTable: "",
        colorCell: "",
        mergeCell: "",
        addColumnLeft: "",
        addColumnRight: "",
        deleteColumn: "",
        addRowTop: "",
        addRowBelow: "",
        deleteRow: "",
      },
      align: {
        left: "왼쪽",
        center: "",
        right: "오른쪽",
      },
      popover: {
        clearColor: "",
        source: "",
        widthPlaceholder: "",
        columns: "",
        rows: "",
        width: "너비",
        height: "높이",
      },
    },
    iframe: {
      name: "iFrame",
      description: "인터넷에서 콘텐츠를 퍼옵니다. 일부 웹사이트는 액세스를 제한할 수 있습니다.",
      option: {
        embedUrl: {
          label: "임베드 URL",
        },
        allowFullScreen: {
          label: "전체 화면 허용",
        },
        allowTransparency: {
          label: "투명성 허용",
        },
        allowScrolling: {
          label: "스크롤 허용",
        },
        allowPayment: {
          label: "결제 허용",
        },
        allowAutoPlay: {
          label: "자동 재생 허용",
        },
        allowMicrophone: {
          label: "마이크 허용",
        },
        allowCamera: {
          label: "카메라 허용",
        },
        allowGeolocation: {
          label: "지리적 위치 허용",
        },
      },
      error: {
        noBrowerSupport: "브라우저가 iframe을 지원하지 않습니다. 브라우저를 업데이트하세요.",
      },
    },
    "smartHome-entityState": {
      option: {
        entityId: {
          label: "",
        },
      },
    },
    "smartHome-executeAutomation": {
      option: {
        displayName: {
          label: "",
        },
        automationId: {
          label: "",
        },
      },
    },
    calendar: {
      name: "캘린더",
      option: {
        releaseType: {
          label: "레이더 릴리스 유형",
        },
      },
    },
    weather: {
      name: "날씨",
      description: "설정한 위치의 현재 날씨 정보를 표시합니다.",
      option: {
        location: {
          label: "날씨 위치",
        },
      },
      kind: {
        clear: "맑음",
        mainlyClear: "대체로 맑음",
        fog: "안개",
        drizzle: "이슬비",
        freezingDrizzle: "어는 이슬비",
        rain: "비",
        freezingRain: "어는 비",
        snowFall: "눈",
        snowGrains: "쌀알눈",
        rainShowers: "소나기",
        snowShowers: "소낙눈",
        thunderstorm: "뇌우",
        thunderstormWithHail: "우박을 동반한 뇌우",
        unknown: "알 수 없음",
      },
    },
    indexerManager: {
      name: "",
      title: "",
      testAll: "",
    },
    healthMonitoring: {
      name: "",
      description: "",
      option: {
        fahrenheit: {
          label: "",
        },
        cpu: {
          label: "",
        },
        memory: {
          label: "",
        },
        fileSystem: {
          label: "",
        },
      },
      popover: {
        available: "",
      },
    },
    common: {
      location: {
        search: "검색",
        table: {
          header: {},
          population: {
            fallback: "알 수 없음",
          },
        },
      },
    },
    video: {
      name: "비디오 스트림",
      description: "카메라 또는 웹사이트의 비디오 스트림 또는 비디오 임베드하기",
      option: {
        feedUrl: {
          label: "피드 URL",
        },
        hasAutoPlay: {
          label: "자동 재생",
        },
      },
    },
    downloads: {
      items: {
        added: {
          detailsTitle: "",
        },
        downSpeed: {
          columnTitle: "다운로드",
          detailsTitle: "다운로드 속도",
        },
        integration: {
          columnTitle: "통합",
        },
        progress: {
          columnTitle: "진행률",
        },
        ratio: {
          columnTitle: "",
        },
        state: {
          columnTitle: "상태",
        },
        upSpeed: {
          columnTitle: "업로드",
        },
      },
      states: {
        downloading: "",
        queued: "",
        paused: "일시 중지됨",
        completed: "완료됨",
        unknown: "알 수 없음",
      },
    },
    "mediaRequests-requestList": {
      description: "오버서 또는 젤리서 인스턴스의 모든 미디어 요청 목록 보기",
      option: {
        linksTargetNewTab: {
          label: "새 탭에서 링크 열기",
        },
      },
      availability: {
        unknown: "알 수 없음",
        partiallyAvailable: "",
        available: "",
      },
    },
    "mediaRequests-requestStats": {
      description: "미디어 요청에 대한 통계",
      titles: {
        stats: {
          main: "미디어 통계",
          approved: "이미 승인됨",
          pending: "승인 대기 중",
          tv: "TV 요청",
          movie: "영화 요청",
          total: "합계",
        },
        users: {
          main: "상위 사용자",
        },
      },
    },
  },
  board: {
    action: {
      oldImport: {
        form: {
          apps: {
            label: "앱",
          },
          screenSize: {
            option: {
              sm: "Small",
              md: "Medium",
              lg: "Large",
            },
          },
        },
      },
    },
    field: {
      backgroundImageAttachment: {
        label: "",
      },
      backgroundImageSize: {
        label: "",
      },
      primaryColor: {
        label: "기본 색상",
      },
      secondaryColor: {
        label: "보조 색상",
      },
      customCss: {
        description: "또한 숙련된 사용자에게만 권장되는 CSS를 사용하여 대시보드를 사용자 지정할 수 있습니다.",
      },
      name: {
        label: "이름",
      },
      isPublic: {
        label: "공개",
      },
    },
    setting: {
      section: {
        general: {
          title: "일반",
        },
        layout: {
          title: "레이아웃",
        },
        background: {
          title: "배경",
        },
        access: {
          permission: {
            item: {
              view: {
                label: "게시판 보기",
              },
            },
          },
        },
        dangerZone: {
          title: "위험한 설정",
          action: {
            delete: {
              confirm: {
                title: "게시판 삭제",
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
        home: "홈",
        boards: "보드",
        apps: "앱",
        users: {
          label: "사용자",
          items: {
            manage: "관리",
            invites: "초대",
          },
        },
        tools: {
          label: "도구",
          items: {
            docker: "Docker",
            api: "",
          },
        },
        settings: "설정",
        help: {
          label: "도움말",
          items: {
            documentation: "문서",
            discord: "커뮤니티 불화",
          },
        },
        about: "정보",
      },
    },
    page: {
      home: {
        statistic: {
          board: "보드",
          user: "사용자",
          invite: "초대",
          app: "앱",
        },
        statisticLabel: {
          boards: "보드",
        },
      },
      board: {
        title: "보드",
        action: {
          settings: {
            label: "설정",
          },
          setHomeBoard: {
            badge: {
              label: "홈",
            },
          },
          delete: {
            label: "영구 삭제",
            confirm: {
              title: "게시판 삭제",
            },
          },
        },
        modal: {
          createBoard: {
            field: {
              name: {
                label: "이름",
              },
            },
          },
        },
      },
      user: {
        setting: {
          general: {
            title: "일반",
            item: {
              firstDayOfWeek: "요일별 요일",
              accessibility: "접근성",
            },
          },
          security: {
            title: "",
          },
          board: {
            title: "보드",
          },
        },
        list: {
          metaTitle: "사용자 관리",
          title: "사용자",
        },
        create: {
          metaTitle: "사용자 만들기",
          step: {
            security: {
              label: "",
            },
          },
        },
        invite: {
          title: "사용자 초대 관리",
          action: {
            new: {
              description: "만료 후에는 초대가 더 이상 유효하지 않으며 초대를 받은 사람은 계정을 만들 수 없습니다.",
            },
            copy: {
              link: "초대 링크",
            },
            delete: {
              title: "초대 삭제",
              description:
                "이 초대를 삭제하시겠습니까? 이 링크를 받은 사용자는 더 이상 해당 링크를 사용하여 계정을 만들 수 없습니다.",
            },
          },
          field: {
            id: {
              label: "ID",
            },
            creator: {
              label: "크리에이터",
            },
            expirationDate: {
              label: "만료 날짜",
            },
            token: {
              label: "토큰",
            },
          },
        },
      },
      group: {
        setting: {
          general: {
            title: "일반",
          },
        },
      },
      settings: {
        title: "설정",
      },
      tool: {
        tasks: {
          status: {
            running: "실행 중",
            error: "오류",
          },
          job: {
            mediaServer: {
              label: "미디어 서버",
            },
            mediaRequests: {
              label: "미디어 요청",
            },
          },
        },
        api: {
          title: "",
          tab: {
            documentation: {
              label: "문서",
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
    title: "",
    field: {
      name: {
        label: "이름",
      },
      state: {
        label: "상태",
        option: {
          created: "생성됨",
          running: "실행 중",
          paused: "일시 중지됨",
          restarting: "다시 시작",
          removing: "제거",
        },
      },
      containerImage: {
        label: "이미지",
      },
      ports: {
        label: "포트",
      },
    },
    action: {
      start: {
        label: "시작",
      },
      stop: {
        label: "중지",
      },
      restart: {
        label: "재시작",
      },
      remove: {
        label: "제거",
      },
    },
  },
  permission: {
    tab: {
      user: "사용자",
    },
    field: {
      user: {
        label: "사용자",
      },
    },
  },
  navigationStructure: {
    manage: {
      label: "관리",
      boards: {
        label: "보드",
      },
      integrations: {
        edit: {
          label: "수정",
        },
      },
      "search-engines": {
        edit: {
          label: "수정",
        },
      },
      apps: {
        label: "앱",
        edit: {
          label: "수정",
        },
      },
      users: {
        label: "사용자",
        create: {
          label: "만들기",
        },
        general: "일반",
        security: "",
        board: "보드",
        invites: {
          label: "초대",
        },
      },
      tools: {
        label: "도구",
        docker: {
          label: "Docker",
        },
      },
      settings: {
        label: "설정",
      },
      about: {
        label: "정보",
      },
    },
  },
  search: {
    mode: {
      appIntegrationBoard: {
        group: {
          app: {
            title: "앱",
          },
          board: {
            title: "보드",
          },
        },
      },
      external: {
        group: {
          searchEngine: {
            option: {
              torrent: {
                name: "토렌트",
              },
            },
          },
        },
      },
      help: {
        group: {
          help: {
            title: "도움말",
            option: {
              documentation: {
                label: "문서",
              },
              discord: {
                label: "커뮤니티 불화",
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
                label: "사용자 관리",
              },
              about: {
                label: "정보",
              },
              preferences: {
                label: "기본 설정",
              },
            },
          },
        },
      },
      userGroup: {
        group: {
          user: {
            title: "사용자",
          },
        },
      },
    },
    engine: {
      field: {
        name: {
          label: "이름",
        },
      },
    },
  },
} as const;
